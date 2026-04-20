import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { AgentType } from './types/agent.type';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService, // 🟡 injecté pour resendInvitation
    // 🟡 emailService retiré si non utilisé
  ) {}

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

  // ✅ Validations d'entrée
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

  // ✅ Upload photo
  let photoPath: string | null = null;
  if (photoBuffer && photoFilename) {
    const filename  = `${uuidv4()}${path.extname(photoFilename)}`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'agents');
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, filename), photoBuffer);
    photoPath = `/uploads/agents/${filename}`;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userName = `${nom ?? ''} ${prenom ?? ''}`.trim() || agent.agence.nom;

  const updated = await this.prisma.$transaction(async (tx) => {

    // ✅ Cas 1 — userId défini
    if (agent.userId) {
      await tx.user.update({
        where: { id: agent.userId },
        data: {
          name: userName,
          password: hashedPassword,
        },
      });
    } else {
      // ✅ Cas 2 — fallback par email
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
        data: {
          name: userName,
          password: hashedPassword,
        },
      });

      await tx.agent.update({
        where: { id: agent.id },
        data: { userId: existingUser.id },
      });
    }

    // ✅ Mettre à jour l'agence
    await tx.agence.update({
      where: { id: agent.agenceId },
      data: {
        ...(adresseAgence != null && { adresse: adresseAgence }), // ✅ != null
        ...(ville != null         && { ville }),                  // ✅ != null
        isActive: true,
      },
    });

    // ✅ Mettre à jour l'agent
    return tx.agent.update({
      where: { profileToken: token },
      data: {
        ...(nom != null       && { nom }),         // ✅ != null
        ...(prenom != null    && { prenom }),       // ✅ != null
        ...(telephone != null && { telephone }),   // ✅ != null
        ...(photoPath         && { photo: photoPath }), // ✅ seulement si photo uploadée
        // ❌ password retiré — stocké sur User uniquement
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
    await this.findOne(id, partenaireId);
    const agent = await this.prisma.agent.delete({
      where: { id },
      include: { agence: true }, // 🔴 FIX ajouté
    });
    const { password: _pwd, ...result } = agent;
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

async resendInvitation(agenceId: number, partenaireId: number): Promise<{ message: string }> {
  // ✅ Vérifier que l'agence appartient au partenaire
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

  // ✅ Générer un nouveau token
const profileToken = randomBytes(32).toString('hex');
  const profileTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await this.prisma.agent.update({
    where: { id: agent.id },
    data: { profileToken, profileTokenExpiresAt },
  });

  // ✅ Renvoyer l'email
  await this.emailService.sendAgenceCreatedCompleteProfile({
    email: agent.email,
    nomAgence: agence.nom,
    ville: agence.ville ?? undefined,
    profileToken,
    codePartenaire: agence.partenaire?.codePartenaire ?? '',
  });

  return { message: 'Email renvoyé avec succès' };
}




async findPublicByUserId(userId: number) {
  const agent = await this.prisma.agent.findFirst({
    where: { userId },
    select: {
      id: true,        // ✅ AJOUTER
      nom: true,
      prenom: true,
      photo: true,
      agenceId: true,  // ✅ AJOUTER
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!agent) {
    throw new NotFoundException('Agent introuvable');
  }

  return {
    id: agent.id,              // ✅ AJOUTER
    nom: agent.nom,
    prenom: agent.prenom,
    email: agent.user.email,
    photo: agent.photo ?? null,
    agenceId: agent.agenceId,  // ✅ AJOUTER
  };
}




}
