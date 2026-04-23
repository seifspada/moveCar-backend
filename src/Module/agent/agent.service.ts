import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { AgentType } from './types/agent.type';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // ================== SUPABASE ==================

  private supabase: SupabaseClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  private static readonly BUCKET = 'documents';

  /**
   * Upload la photo d'un agent vers Supabase Storage.
   * Retourne l'URL publique à stocker dans `photo`.
   */
  private async uploadAgentPhoto(
    agentId: number,
    buffer: Buffer,
    filename: string,
  ): Promise<string> {
    const ext = path.extname(filename);
    const storagePath = `agents/${agentId}/${uuidv4()}${ext}`;

    const { error } = await this.supabase.storage
      .from(AgentService.BUCKET)
      .upload(storagePath, buffer, {
        contentType: this.getMimeType(ext),
        upsert: true,
      });

    if (error) {
      throw new Error(`Upload photo agent échoué: ${error.message}`);
    }

    const { data } = this.supabase.storage
      .from(AgentService.BUCKET)
      .getPublicUrl(storagePath);

    return data.publicUrl;
  }

  /**
   * Supprime la photo d'un agent depuis Supabase Storage via son URL publique.
   */
  private async deleteAgentPhoto(publicUrl: string): Promise<void> {
    const marker = `/object/public/${AgentService.BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return;
    const storagePath = publicUrl.slice(idx + marker.length);

    const { error } = await this.supabase.storage
      .from(AgentService.BUCKET)
      .remove([storagePath]);

    if (error) {
      console.error('Supabase delete photo agent error:', error.message);
    }
  }

  private getMimeType(ext: string): string {
    const map: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    return map[ext.toLowerCase()] ?? 'application/octet-stream';
  }

  // ================== VÉRIFICATION TOKEN ==================

  async verifyProfileToken(token: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { profileToken: token },
      include: { agence: { include: { partenaire: true } } },
    });

    if (!agent) throw new NotFoundException('Lien invalide ou expiré');

    if (agent.profileTokenExpiresAt && agent.profileTokenExpiresAt < new Date()) {
      throw new BadRequestException('Ce lien a expiré');
    }

    if (agent.isProfileCompleted) {
      throw new ConflictException('Ce profil a déjà été complété');
    }

    return {
      email: agent.email,
      nomAgence: agent.agence.nom,
      ville: agent.agence.ville,
      codePartenaire: agent.agence.partenaire?.codePartenaire ?? '',
    };
  }

  // ================== COMPLÉTION PROFIL ==================

  async completeProfile(
    token: string,
    password: string,
    confirmPassword: string,
    nom?: string,
    prenom?: string,
    telephone?: string,
    adresseAgence?: string,
    ville?: string,
    photoBuffer?: Buffer,
    photoFilename?: string,
  ): Promise<AgentType> {
    if (!token)    throw new BadRequestException('Token manquant');
    if (!password) throw new BadRequestException('Mot de passe manquant');
    if (password !== confirmPassword) {
      throw new BadRequestException('Les mots de passe ne correspondent pas');
    }

    const agent = await this.prisma.agent.findUnique({
      where: { profileToken: token },
      include: { agence: true },
    });

    if (!agent) throw new NotFoundException('Lien invalide');

    if (agent.profileTokenExpiresAt && agent.profileTokenExpiresAt < new Date()) {
      throw new BadRequestException('Ce lien a expiré');
    }

    if (agent.isProfileCompleted) {
      throw new ConflictException('Profil déjà complété');
    }

    // ── Upload photo vers Supabase Storage
    let photoUrl: string | null = null;
    if (photoBuffer && photoFilename) {
      photoUrl = await this.uploadAgentPhoto(agent.id, photoBuffer, photoFilename);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userName = `${nom ?? ''} ${prenom ?? ''}`.trim() || agent.agence.nom;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (agent.userId) {
        await tx.user.update({
          where: { id: agent.userId },
          data: { name: userName, password: hashedPassword },
        });
      } else {
        const existingUser = await tx.user.findUnique({
          where: { email: agent.email },
        });

        if (!existingUser) {
          throw new NotFoundException(
            `Aucun User trouvé pour "${agent.email}" — supprimez et recréez l'agence`,
          );
        }

        await tx.user.update({
          where: { id: existingUser.id },
          data: { name: userName, password: hashedPassword },
        });

        await tx.agent.update({
          where: { id: agent.id },
          data: { userId: existingUser.id },
        });
      }

      await tx.agence.update({
        where: { id: agent.agenceId },
        data: {
          ...(adresseAgence != null && { adresse: adresseAgence }),
          ...(ville != null         && { ville }),
          isActive: true,
        },
      });

      return tx.agent.update({
        where: { profileToken: token },
        data: {
          ...(nom != null       && { nom }),
          ...(prenom != null    && { prenom }),
          ...(telephone != null && { telephone }),
          ...(photoUrl          && { photo: photoUrl }), // ✅ URL Supabase publique
          isProfileCompleted: true,
          isActive: true,
          profileToken: null,
          profileTokenExpiresAt: null,
        },
        include: { agence: true },
      });
    });

    const { password: _pwd, ...result } = updated;
    return result as AgentType;
  }

  // ================== CRUD ==================

  async findById(id: number): Promise<AgentType> {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      include: { agence: true },
    });
    if (!agent) throw new NotFoundException('Agent introuvable');
    const { password: _pwd, ...result } = agent;
    return result as AgentType;
  }

  async findAll(partenaireId: number): Promise<AgentType[]> {
    const agents = await this.prisma.agent.findMany({
      where: { agence: { partenaireId } },
      include: { agence: true },
      orderBy: { createdAt: 'desc' },
    });
    return agents.map(({ password: _pwd, ...rest }) => rest) as AgentType[];
  }

  async findOne(id: number, partenaireId: number): Promise<AgentType> {
    const agent = await this.prisma.agent.findFirst({
      where: { id, agence: { partenaireId } },
      include: { agence: true },
    });
    if (!agent) throw new NotFoundException(`Agent #${id} introuvable`);
    const { password: _pwd, ...result } = agent;
    return result as AgentType;
  }

  async update(
    id: number,
    dto: UpdateAgentDto,
    partenaireId: number,
  ): Promise<AgentType> {
    await this.findOne(id, partenaireId);

    const data: any = { ...dto };
    delete data.confirmPassword;

    if (dto.password) {
      if (dto.password !== dto.confirmPassword) {
        throw new BadRequestException('Les mots de passe ne correspondent pas');
      }
      data.password = await bcrypt.hash(dto.password, 10);
    }

    const agent = await this.prisma.agent.update({
      where: { id },
      data,
      include: { agence: true },
    });

    const { password: _pwd, ...result } = agent;
    return result as AgentType;
  }

  async remove(id: number, partenaireId: number): Promise<AgentType> {
    const agent = await this.findOne(id, partenaireId);

    // ── Supprimer la photo Supabase si elle existe
    if (agent.photo) {
      await this.deleteAgentPhoto(agent.photo);
    }

    const deleted = await this.prisma.agent.delete({
      where: { id },
      include: { agence: true },
    });

    const { password: _pwd, ...result } = deleted;
    return result as AgentType;
  }

  async findByAgenceId(agenceId: number): Promise<AgentType | null> {
    const agent = await this.prisma.agent.findFirst({
      where: { agenceId },
      include: { agence: true },
    });
    if (!agent) return null;
    const { password: _pwd, ...result } = agent;
    return result as AgentType;
  }

  // ================== RENVOI INVITATION ==================

  async resendInvitation(agenceId: number, partenaireId: number): Promise<{ message: string }> {
    const agence = await this.prisma.agence.findFirst({
      where: { id: agenceId, partenaireId },
      include: { partenaire: true },
    });
    if (!agence) throw new NotFoundException('Agence introuvable');

    const agent = await this.prisma.agent.findFirst({
      where: { agenceId },
    });
    if (!agent) throw new NotFoundException('Aucun agent lié à cette agence');

    if (agent.isProfileCompleted) {
      throw new ConflictException('Le profil est déjà complété');
    }

    const profileToken = randomBytes(32).toString('hex');
    const profileTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.agent.update({
      where: { id: agent.id },
      data: { profileToken, profileTokenExpiresAt },
    });

    await this.emailService.sendAgenceCreatedCompleteProfile({
      email: agent.email,
      nomAgence: agence.nom,
      ville: agence.ville ?? undefined,
      profileToken,
      codePartenaire: agence.partenaire?.codePartenaire ?? '',
    });

    return { message: 'Email renvoyé avec succès' };
  }

  // ================== PROFIL PUBLIC ==================

  async findPublicByUserId(userId: number) {
    const agent = await this.prisma.agent.findFirst({
      where: { userId },
      select: {
        id: true,
        nom: true,
        prenom: true,
        photo: true,
        agenceId: true,
        user: {
          select: { email: true },
        },
      },
    });

    if (!agent) throw new NotFoundException('Agent introuvable');

    return {
      id: agent.id,
      nom: agent.nom,
      prenom: agent.prenom,
      email: agent.user.email,
      photo: agent.photo ?? null,
      agenceId: agent.agenceId,
    };
  }
}