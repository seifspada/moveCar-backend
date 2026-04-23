import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { DemandePartenaire, StatutDemande } from '@prisma/client';
import { CreatePartenaireProfileDto } from './dto/create-partenaire-profile.dto';
import { UpdatePartenaireDto } from './dto/update-partenaire.dto';
import { PrismaService } from '../../prisma/prisma.service';

interface FastifyFileKV {
  value: Buffer;
  filename: string;
  mimetype: string;
}

@Injectable()
export class PartenaireService {
  constructor(private readonly prisma: PrismaService) {}

  // ================== SUPABASE ==================

  private supabase: SupabaseClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  private static readonly BUCKET = 'documents';

  private static readonly ALLOWED_PHOTO_MIME = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ]);

  // ================== HELPERS FICHIERS ==================

  private assertValidPhoto(file: FastifyFileKV) {
    if (!file?.mimetype) {
      throw new BadRequestException('Photo invalide (mimetype manquant)');
    }
    if (!PartenaireService.ALLOWED_PHOTO_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `Type de photo non autorisé (${file.mimetype}). Autorisés: JPG/PNG/WEBP`,
      );
    }
    if (file.value.length > 5 * 1024 * 1024) {
      throw new BadRequestException('La photo ne doit pas dépasser 5MB');
    }
  }

  /**
   * Upload la photo d'un partenaire vers Supabase Storage.
   * Retourne l'URL publique à stocker dans photoUrl / user.photo.
   */
  private async savePhoto(demandeId: number, file: FastifyFileKV): Promise<string> {
    this.assertValidPhoto(file);

    const ext = path.extname(file.filename);
    const fileName = `photo_${uuidv4()}${ext}`;
    const storagePath = `partenaires/${demandeId}/profile/${fileName}`;

    const { error } = await this.supabase.storage
      .from(PartenaireService.BUCKET)
      .upload(storagePath, file.value, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new Error(`Upload photo partenaire échoué: ${error.message}`);
    }

    const { data } = this.supabase.storage
      .from(PartenaireService.BUCKET)
      .getPublicUrl(storagePath);

    return data.publicUrl;
  }

  /**
   * Supprime une photo depuis Supabase Storage via son URL publique.
   */
  private async deletePhoto(publicUrl: string): Promise<void> {
    const marker = `/object/public/${PartenaireService.BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return;
    const storagePath = publicUrl.slice(idx + marker.length);

    const { error } = await this.supabase.storage
      .from(PartenaireService.BUCKET)
      .remove([storagePath]);

    if (error) {
      console.error('Supabase delete photo partenaire error:', error.message);
    }
  }

  // ================== CRÉATION PROFIL ==================

  async createProfilPartenaireFromToken(
    profileToken: string,
    codePartenaire: string,
    dto: CreatePartenaireProfileDto,
    photoFile: FastifyFileKV | undefined,
  ) {
    console.log('🔍 Recherche demande partenaire avec:', { profileToken, codePartenaire });

    const demande = await this.prisma.demandePartenaire.findFirst({
      where: {
        profileToken,
        codePartenaire,
        statutDemande: StatutDemande.ACCEPTEE,
        profileTokenExpiry: { gt: new Date() },
      },
      include: { partenaire: true },
    });

    console.log(
      '📋 Demande trouvée:',
      demande
        ? {
            id: demande.id,
            email: demande.email,
            statutDemande: demande.statutDemande,
            profileTokenExpiry: demande.profileTokenExpiry,
            partenaireExiste: !!demande.partenaire,
          }
        : 'AUCUNE',
    );

    if (!demande) {
      console.error('❌ Demande introuvable, expirée ou déjà utilisée');
      throw new NotFoundException('Demande introuvable, expirée ou déjà utilisée');
    }

    if (demande.profileTokenExpiry && demande.profileTokenExpiry < new Date()) {
      console.error('❌ Token expiré:', { expiry: demande.profileTokenExpiry, now: new Date() });
      throw new BadRequestException('Token expiré');
    }

    if (demande.statutDemande !== StatutDemande.ACCEPTEE) {
      console.error('❌ Statut invalide:', demande.statutDemande);
      throw new BadRequestException(`Demande non acceptée (statut: ${demande.statutDemande})`);
    }

    if (demande.partenaire) {
      console.error('❌ Partenaire déjà créé');
      throw new ConflictException('Un profil a déjà été créé pour cette demande');
    }

    console.log('✅ Validations OK, création du profil partenaire...');

    return this.createProfilPartenaireCore(demande, dto, photoFile);
  }

  private async createProfilPartenaireCore(
    demande: DemandePartenaire,
    dto: CreatePartenaireProfileDto,
    photoFile: FastifyFileKV | undefined,
  ) {
    // 1) Vérifier email côté demande adhésion
    const existingAdhesionDemand = await this.prisma.demandeAdhesion.findFirst({
      where: { email: dto.email },
    });
    if (existingAdhesionDemand) {
      throw new BadRequestException(
        "Cet email est déjà utilisé pour une demande d'adhésion.",
      );
    }

    // 2) Vérifier email côté adhérent
    const existingAdherent = await this.prisma.adherent.findFirst({
      where: { user: { email: dto.email } },
      include: { user: true },
    });
    if (existingAdherent) {
      throw new BadRequestException(
        "Cet email est déjà associé à un compte adhérent.",
      );
    }

    // 3) Vérifier email côté partenaire
    const existingPartner = await this.prisma.partenaire.findFirst({
      where: { email: dto.email },
    });
    if (existingPartner) {
      throw new BadRequestException(
        'Cet email est déjà utilisé par un autre partenaire.',
      );
    }

    // 4) Vérifier email côté User
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    // 5) Rôle partenaire
    const partenaireRole = await this.prisma.role.findFirst({
      where: { name: 'partenaire' },
    });
    if (!partenaireRole) {
      throw new BadRequestException(
        'Rôle partenaire non trouvé. Contactez un administrateur.',
      );
    }

    // 6) Upload photo vers Supabase (optionnelle)
    let photoUrl: string | undefined;
    if (photoFile) {
      console.log('📸 Upload photo partenaire vers Supabase...');
      photoUrl = await this.savePhoto(demande.id, photoFile);
    }

    // 7) Hash mot de passe
    console.log('🔐 Hash du mot de passe...');
    const hashedPassword = await bcrypt.hash(dto.motDePasse, 10);

    // 8) Transaction User + Partenaire
    console.log('💾 Création User + Partenaire...');
    const partenaire = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: `${dto.nom} ${dto.prenom}`,
          email: dto.email,
          password: hashedPassword,
          roleId: partenaireRole.id,
          photo: photoUrl ?? null, // ✅ URL publique Supabase
        },
      });

      const partenaire = await tx.partenaire.create({
        data: {
          nom: dto.nom,
          prenom: dto.prenom,
          entiteGroupe: dto.entiteGroupe,
          entiteAgence: dto.entiteAgence,
          email: dto.email,
          telephone: dto.telephone,
          adresseAgence: dto.adresseAgence,
          ville: dto.ville,
          codePartenaire: demande.codePartenaire,
          userId: user.id,
          photoUrl: photoUrl ?? null, // ✅ URL publique Supabase
          demandeInitiale: {
            connect: { id: demande.id },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              photo: true,
            },
          },
        },
      });

      await tx.demandePartenaire.update({
        where: { id: demande.id },
        data: {
          partenaireId: partenaire.id,
          profileToken: null,
          profileTokenExpiry: null,
        },
      });

      return partenaire;
    });

    console.log('✅ Partenaire créé:', partenaire.id);

    return {
      success: true,
      message: 'Profil partenaire créé avec succès',
      partenaire: {
        id: partenaire.id,
        nom: partenaire.nom,
        prenom: partenaire.prenom,
        email: partenaire.email,
        entiteGroupe: partenaire.entiteGroupe,
        entiteAgence: partenaire.entiteAgence,
        adresseAgence: partenaire.adresseAgence,
        ville: partenaire.ville,
        photoUrl: partenaire.photoUrl, // ✅ URL publique Supabase
        user: partenaire.user,
      },
    };
  }

  // ================== CRUD ==================

  async findOne(id: number) {
    const partenaire = await this.prisma.partenaire.findUnique({
      where: { id },
      include: {
        demandeInitiale: true,
        user: true,
      },
    });

    if (!partenaire) {
      throw new NotFoundException('Partenaire introuvable');
    }

    return partenaire;
  }

  async update(id: number, dto: UpdatePartenaireDto) {
    const partenaire = await this.prisma.partenaire.findUnique({
      where: { id },
    });

    if (!partenaire) {
      throw new NotFoundException('Partenaire introuvable');
    }

    return this.prisma.partenaire.update({
      where: { id },
      data: {
        nom:           dto.nom           ?? partenaire.nom,
        prenom:        dto.prenom        ?? partenaire.prenom,
        entiteGroupe:  dto.entiteGroupe  ?? partenaire.entiteGroupe,
        entiteAgence:  dto.entiteAgence  ?? partenaire.entiteAgence,
        email:         dto.email         ?? partenaire.email,
        telephone:     dto.telephone     ?? partenaire.telephone,
        adresseAgence: dto.adresseAgence ?? partenaire.adresseAgence,
        ville:         dto.ville         ?? partenaire.ville,
      },
    });
  }

  async findAll() {
    return this.prisma.partenaire.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        demandeInitiale: true,
        user: true,
      },
    });
  }

  // ================== SUPPRESSION ==================

  async remove(id: number) {
    const partenaire = await this.prisma.partenaire.findUnique({
      where: { id },
    });

    if (!partenaire) throw new NotFoundException('Partenaire introuvable');

    // ── Supprimer la photo du partenaire depuis Supabase (non-bloquant)
    if (partenaire.photoUrl) {
      await this.deletePhoto(partenaire.photoUrl);
    }

    // 1. Détacher les demandes
    await this.prisma.demandePartenaire.updateMany({
      where: { partenaireId: id },
      data: { partenaireId: null },
    });

    // 2. Récupérer les IDs des missions
    const missions = await this.prisma.mission.findMany({
      where: { partenaireId: id },
      select: { id: true },
    });
    const missionIds = missions.map((m) => m.id);

    // 3. Supprimer les réservations des missions
    if (missionIds.length > 0) {
      await this.prisma.reservationMission.deleteMany({
        where: { missionId: { in: missionIds } },
      });
    }

    // 4. Supprimer les missions
    await this.prisma.mission.deleteMany({
      where: { partenaireId: id },
    });

    // 5. Récupérer les agences du partenaire
    const agences = await this.prisma.agence.findMany({
      where: { partenaireId: id },
      select: { id: true },
    });
    const agenceIds = agences.map((a) => a.id);

    // 6. Récupérer les agents des agences
    const agents = await this.prisma.agent.findMany({
      where: { agenceId: { in: agenceIds } },
      select: { id: true, userId: true, photo: true }, // ✅ photo ajoutée pour nettoyage Supabase
    });
    const agentIds     = agents.map((a) => a.id);
    const agentUserIds = agents
      .map((a) => a.userId)
      .filter((uid): uid is number => uid !== null);

    // ── Supprimer les photos des agents depuis Supabase (non-bloquant)
    for (const agent of agents) {
      if (agent.photo) {
        await this.deletePhoto(agent.photo).catch(() => undefined);
      }
    }

    // 7. Supprimer les véhicules via agentId
    if (agentIds.length > 0) {
      await this.prisma.vehicule.deleteMany({
        where: { agentId: { in: agentIds } },
      });
    }

    // 8. Supprimer les agents
    await this.prisma.agent.deleteMany({
      where: { agenceId: { in: agenceIds } },
    });

    // 9. Supprimer les users des agents
    if (agentUserIds.length > 0) {
      await this.prisma.user.deleteMany({
        where: { id: { in: agentUserIds } },
      });
    }

    // 10. Supprimer les agences
    if (agenceIds.length > 0) {
      await this.prisma.agence.deleteMany({
        where: { partenaireId: id },
      });
    }

    // 11. Supprimer le user partenaire
    if (partenaire.userId) {
      await this.prisma.user.delete({
        where: { id: partenaire.userId },
      });
    }

    // 12. Supprimer le partenaire
    return this.prisma.partenaire.delete({
      where: { id },
    });
  }

  // ================== NAVBAR ==================

  async findNavbarPartenaireByUserId(userId: number) {
    console.log('🔍 Recherche partenaire pour userId:', userId);

    const partenaire = await this.prisma.partenaire.findFirst({
      where: { userId },
      select: {
        entiteGroupe: true,
        entiteAgence: true,
        photoUrl: true,
        user: {
          select: {
            email: true,
            photo: true,
          },
        },
      },
    });

    if (!partenaire) {
      console.error(' Partenaire introuvable pour userId:', userId);
      throw new NotFoundException('Partenaire introuvable');
    }

    const entite = partenaire.entiteAgence || partenaire.entiteGroupe;
    const photo  = partenaire.photoUrl ?? partenaire.user.photo ?? null;

    console.log('✅ Partenaire trouvé:', entite, '-', partenaire.user.email);

    return {
      entite,
      email: partenaire.user.email,
      photo, // ✅ URL publique Supabase
    };
  }
}