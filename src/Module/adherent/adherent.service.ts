import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { UpdateAdherentDto } from './dto/update-adherent.dto';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { DemandeAdhesion, StatutDemande, TypePack } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { CreateAdherentProfileDto } from './dto/create-profile-adherent.dto';
import { PrismaService } from '../../prisma/prisma.service';

interface FastifyFileKV {
  value: Buffer;
  filename: string;
  mimetype: string;
}

@Injectable()
export class AdherentService {
  constructor(private readonly prisma: PrismaService,
        private readonly emailService: EmailService, // ✅ Ajouter cette ligne

  ) {}

  // Types MIME autorisés pour la photo
  private static readonly ALLOWED_PHOTO_MIME = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ]);

  // ✅ Valider le type de fichier photo
  private assertValidPhoto(file: FastifyFileKV) {
    if (!file?.mimetype) {
      throw new BadRequestException('Photo invalide (mimetype manquant)');
    }
    if (!AdherentService.ALLOWED_PHOTO_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `Type de photo non autorisé (${file.mimetype}). Autorisés: JPG/PNG/WEBP`,
      );
    }
    // Limiter la taille (5MB max)
    if (file.value.length > 5 * 1024 * 1024) {
      throw new BadRequestException('La photo ne doit pas dépasser 5MB');
    }
  }

  // ✅ Sauvegarder la photo dans le dossier profile
  private async savePhoto(demandeId: number, file: FastifyFileKV): Promise<string> {
    this.assertValidPhoto(file);

    // Créer le dossier profile dans le dossier de la demande
    const profileDir = path.join(
      process.cwd(),
      'uploads',
      'demandes',
      String(demandeId),
      'profile',
    );

    await fs.mkdir(profileDir, { recursive: true });

    // Générer nom de fichier unique
    const ext = path.extname(file.filename);
    const fileName = `photo_${uuidv4()}${ext}`;
    const filePath = path.join(profileDir, fileName);

    // Sauvegarder le fichier
    await fs.writeFile(filePath, file.value);

    // Retourner le chemin relatif
    return `/uploads/demandes/${demandeId}/profile/${fileName}`;
  }

  // ✅ Créer un adhérent par email (ancienne méthode)
  private async createProfilFromDemandeCore(
    demande: DemandeAdhesion,
    motDePasse: string,
    typePack: TypePack,
    photoFile: FastifyFileKV,
  ) {
    // 1) Vérifier user existant
    const existingUser = await this.prisma.user.findUnique({
      where: { email: demande.email },
    });
    if (existingUser) {
      throw new ConflictException(
        'Un compte utilisateur existe déjà avec cet email. Veuillez vous connecter.',
      );
    }

    // 2) Vérifier adhérent existant
    const adherentExistant = await this.prisma.adherent.findFirst({
      where: { demandeAdhesionId: demande.id },
    });
    if (adherentExistant) {
      throw new ConflictException('Un profil a déjà été créé pour cette demande');
    }

    // 3) Rôle ADHERENT
    const adherentRole = await this.prisma.role.findFirst({
      where: { name: 'adherent' },
    });
    if (!adherentRole) {
      throw new BadRequestException(
        'Rôle ADHERENT non trouvé. Contactez l\'administrateur.',
      );
    }

    // 4) Photo
    if (!photoFile) {
      throw new BadRequestException('La photo est obligatoire');
    }
    const photoUrl = await this.savePhoto(demande.id, photoFile);

    // 5) Mot de passe
    if (!motDePasse || motDePasse.length < 8) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 8 caractères',
      );
    }
    const hashedPassword = await bcrypt.hash(motDePasse, 10);

    // 6) Expiration + cotisation
    const dateExpiration = new Date();
    dateExpiration.setFullYear(dateExpiration.getFullYear() + 1);
    const montantCotisation = typePack === 'premium' ? 57.5 : 47.5;

    // 7) Transaction User + Adherent
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: `${demande.prenom} ${demande.nom}`,
          email: demande.email,
          password: hashedPassword,
          roleId: adherentRole.id,
          photo: photoUrl,
        },
      });

      const adherent = await tx.adherent.create({
        data: {
          userId: user.id,
          demandeAdhesionId: demande.id,
          nom: demande.nom,
          prenom: demande.prenom,
          telephone: demande.telephone,
          ville: demande.ville,
          raisonSociale: demande.raisonSociale,
          numeroKbis: demande.numeroKbis,
          typePack,
          photoUrl,
          dateExpiration,
          montantCotisation,
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

      return adherent;
    });

    return { result, photoUrl };
  }

  // ✅ Méthode publique appelée par le contrôleur (style partenaire)
async createProfilAdherentFromToken(
  profileToken: string,
  code: string | undefined,
  dto: CreateAdherentProfileDto,
  photoFile: FastifyFileKV,
) {
  console.log('🔍 Recherche demande avec token:', profileToken);

  // 1) Chercher la demande
  const demande = await this.prisma.demandeAdhesion.findUnique({
    where: { profileToken },
    include: { adherent: true },
  });

  console.log('📋 Demande trouvée:', demande ? {
    id: demande.id,
    email: demande.email,
    statut: demande.statut,
    profileTokenExpiry: demande.profileTokenExpiry,
    adherentExiste: !!demande.adherent,
  } : 'AUCUNE');

  if (!demande) {
    console.error('❌ Token invalide - aucune demande trouvée');
    throw new NotFoundException('Demande introuvable, expirée ou déjà utilisée');
  }

  // 2) Vérifier expiration
  if (demande.profileTokenExpiry && demande.profileTokenExpiry < new Date()) {
    console.error('❌ Token expiré:', {
      expiry: demande.profileTokenExpiry,
      now: new Date(),
    });
    throw new BadRequestException('Token expiré');
  }

  // 3) Vérifier statut
  if (demande.statut !== StatutDemande.ACCEPTEE) {
    console.error('❌ Statut invalide:', demande.statut);
    throw new BadRequestException(`Demande non acceptée (statut: ${demande.statut})`);
  }

  // 4) Vérifier adhérent existant
  if (demande.adherent && demande.adherent.length > 0) {
    console.error('❌ Adhérent déjà créé');
    throw new ConflictException('Un profil a déjà été créé pour cette demande');
  }

  console.log('✅ Validations OK, création du profil...');

  // Suite de la logique...
  return this.createProfilFromDemandeCore(
    demande,
    dto.motDePasse,
    dto.typePack,
    photoFile,
  );
}


  // ✅ Mettre à jour un adhérent
  async update(id: number, dto: UpdateAdherentDto, photoFile?: FastifyFileKV) {
    // Vérifier que l'adhérent existe
    const adherent = await this.prisma.adherent.findUnique({
      where: { id },
      include: { 
        demandeAdhesion: true,
        user: true,
      },
    });

    if (!adherent) {
      throw new NotFoundException(`Adhérent avec l'ID ${id} introuvable`);
    }

    const dataToUpdate: any = {};

    // Mettre à jour les champs de l'adherent
    if (dto.nom) dataToUpdate.nom = dto.nom;
    if (dto.prenom) dataToUpdate.prenom = dto.prenom;
    if (dto.telephone) dataToUpdate.telephone = dto.telephone;
    if (dto.ville) dataToUpdate.ville = dto.ville;
    if (dto.typePack) dataToUpdate.typePack = dto.typePack;

    // Sauvegarder nouvelle photo si fournie
    if (photoFile) {
      const photoUrl = await this.savePhoto(adherent.demandeAdhesionId, photoFile);
      dataToUpdate.photoUrl = photoUrl;
    }

    // Transaction pour mettre à jour User + Adherent
    return this.prisma.$transaction(async (tx) => {
      // Mettre à jour le User si mot de passe fourni
      if (dto.motDePasse) {
        const hashedPassword = await bcrypt.hash(dto.motDePasse, 10);
        await tx.user.update({
          where: { id: adherent.userId },
          data: { password: hashedPassword },
        });
      }

      // Mettre à jour l'Adherent
      return tx.adherent.update({
        where: { id },
        data: dataToUpdate,
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
    });
  }

  // ✅ Lister tous les adhérents
  async findAll() {
    return this.prisma.adherent.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            photo: true,
          },
        },
        demandeAdhesion: {
          select: {
            id: true,
            statut: true,
          },
        },
      },
      orderBy: { dateCreation: 'desc' },
    });
  }

  // ✅ Trouver un adhérent par ID
  async findOne(id: number) {
    const adherent = await this.prisma.adherent.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            photo: true,
          },
        },
        demandeAdhesion: true,
      },
    });

    if (!adherent) {
      throw new NotFoundException(`Adhérent avec l'ID ${id} introuvable`);
    }

    return adherent;
  }

  // ✅ Supprimer un adhérent
  async remove(id: number) {
    const adherent = await this.findOne(id);

    // Supprimer en cascade (User sera supprimé automatiquement grâce à onDelete: Cascade)
    return this.prisma.adherent.delete({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

// backend/src/adherent/adherent.service.ts

async findPublicByUserId(userId: number) {
  console.log('🔍 Recherche adhérent pour userId:', userId);
  
  const adherent = await this.prisma.adherent.findFirst({
    where: { userId },
    select: {
      nom: true,
      prenom: true,
      typePack: true,
      user: { 
        select: { 
          email: true, 
          photo: true 
        } 
      },
    },
  });

  if (!adherent) {
    throw new NotFoundException('Adhérent introuvable');
  }

  console.log('✅ Adhérent trouvé:', adherent.nom, adherent.prenom);

  return {
    nom: adherent.nom,
    prenom: adherent.prenom,
    email: adherent.user.email,
    photo: adherent.user.photo,
    typePack: adherent.typePack,
  };
}

}
