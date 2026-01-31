import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAdherentDto } from './dto/create-adherent.dto';
import { CreateAdherentWithTokenDto } from './dto/create-adherent-with-token.dto';
import { UpdateAdherentDto } from './dto/update-adherent.dto';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { StatutDemande } from '@prisma/client';
import { EmailService } from '../email/email.service';

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
 async create(dto: CreateAdherentDto, photoFile: FastifyFileKV) {
  const { email, motDePasse, typePack } = dto;

  // 1. Chercher la demande validée par email
  const demande = await this.prisma.demandeAdhesion.findUnique({
    where: { email },
  });

  if (!demande) {
    throw new NotFoundException('Aucune demande trouvée pour cet email');
  }

  if (demande.statut !== StatutDemande.VALIDEE) {
    throw new BadRequestException('Votre demande n\'a pas encore été validée');
  }

  // 2. ✅ Vérifier si un User existe déjà avec cet email
  const existingUser = await this.prisma.user.findUnique({
    where: { email: demande.email },
  });

  if (existingUser) {
    throw new ConflictException(
      'Un compte utilisateur existe déjà avec cet email. Veuillez vous connecter.'
    );
  }

  // 3. Vérifier qu'un adhérent n'existe pas déjà pour cette demande
  const adherentExistant = await this.prisma.adherent.findFirst({
    where: { demandeAdhesionId: demande.id },
  });

  if (adherentExistant) {
    throw new ConflictException('Un compte adhérent existe déjà pour cette demande');
  }

  // 4. Récupérer le rôle ADHERENT
  const adherentRole = await this.prisma.role.findFirst({
    where: { name: 'ADHERENT' },
  });

  if (!adherentRole) {
    throw new BadRequestException('Rôle ADHERENT non trouvé. Contactez l\'administrateur.');
  }

  // 5. Valider et sauvegarder la photo
  if (!photoFile) {
    throw new BadRequestException('La photo est obligatoire');
  }

  const photoUrl = await this.savePhoto(demande.id, photoFile);

  // 6. Hasher le mot de passe
  if (!motDePasse || motDePasse.length < 8) {
    throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères');
  }

  const hashedPassword = await bcrypt.hash(motDePasse, 10);

  // 7. Calculer date d'expiration (1 an)
  const dateExpiration = new Date();
  dateExpiration.setFullYear(dateExpiration.getFullYear() + 1);

  // 8. Calculer montant cotisation
  const montantCotisation = typePack === 'premium' ? 57.50 : 47.50;

  // 9. Créer User + Adherent en transaction
  try {
    const result = await this.prisma.$transaction(async (tx) => {
      // Créer le User
      const user = await tx.user.create({
        data: {
          name: `${demande.prenom} ${demande.nom}`,
          email: demande.email,
          password: hashedPassword,
          roleId: adherentRole.id,
          photo: photoUrl,
        },
      });

      // Créer l'Adherent
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

    // 10. ✅ Envoyer email de bienvenue
    try {
      await this.emailService.sendWelcomeAdherent({
        email: result.user.email,
        nom: result.nom,
        prenom: result.prenom,
      });
    } catch (error) {
      console.error('❌ Erreur envoi email bienvenue:', error);
      // Ne pas bloquer la création si l'email échoue
    }

    console.log(`✅ Adhérent créé avec succès - ID: ${result.id}, Email: ${result.user.email}`);

    return {
      success: true,
      message: 'Compte créé avec succès',
      adherent: result,
    };
  } catch (error) {
    // ✅ Supprimer la photo si la transaction échoue
    if (photoUrl) {
      try {
        await fs.unlink(path.join(process.cwd(), photoUrl));
      } catch (err) {
        console.error('Erreur suppression photo après échec:', err);
      }
    }
    throw error;
  }
}

// ✅ Créer un adhérent avec token sécurisé
async createWithToken(dto: CreateAdherentWithTokenDto, photoFile: FastifyFileKV) {
  const { token, motDePasse, typePack } = dto;

  // 1. Vérifier le token
  const demande = await this.prisma.demandeAdhesion.findUnique({
    where: { profileToken: token },
  });

  if (!demande) {
    throw new NotFoundException('Token invalide ou expiré');
  }

  if (demande.profileTokenExpiry && demande.profileTokenExpiry < new Date()) {
    throw new BadRequestException('Token expiré. Veuillez contacter l\'équipe.');
  }

  if (demande.statut !== StatutDemande.VALIDEE) {
    throw new BadRequestException('Demande non validée');
  }

  // 2. ✅ Vérifier si un User existe déjà avec cet email
  const existingUser = await this.prisma.user.findUnique({
    where: { email: demande.email },
  });

  if (existingUser) {
    throw new ConflictException(
      'Un compte utilisateur existe déjà avec cet email. Veuillez vous connecter.'
    );
  }

  // 3. Vérifier qu'un adhérent n'existe pas déjà
  const adherentExistant = await this.prisma.adherent.findFirst({
    where: { demandeAdhesionId: demande.id },
  });

  if (adherentExistant) {
    throw new ConflictException('Un profil a déjà été créé pour cette demande');
  }

  // 4. Récupérer le rôle ADHERENT
  const adherentRole = await this.prisma.role.findFirst({
    where: { name: 'ADHERENT' },
  });

  if (!adherentRole) {
    throw new BadRequestException('Rôle ADHERENT non trouvé. Contactez l\'administrateur.');
  }

  // 5. Valider et sauvegarder la photo
  if (!photoFile) {
    throw new BadRequestException('La photo est obligatoire');
  }

  const photoUrl = await this.savePhoto(demande.id, photoFile);

  // 6. Hasher le mot de passe
  if (!motDePasse || motDePasse.length < 8) {
    throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères');
  }

  const hashedPassword = await bcrypt.hash(motDePasse, 10);

  // 7. Calculer date d'expiration (1 an)
  const dateExpiration = new Date();
  dateExpiration.setFullYear(dateExpiration.getFullYear() + 1);

  // 8. Calculer montant cotisation
  const montantCotisation = typePack === 'premium' ? 57.50 : 47.50;

  // 9. Créer User + Adherent en transaction
  let result;
  try {
    result = await this.prisma.$transaction(async (tx) => {
      // Créer le User
      const user = await tx.user.create({
        data: {
          name: `${demande.prenom} ${demande.nom}`,
          email: demande.email,
          password: hashedPassword,
          roleId: adherentRole.id,
          photo: photoUrl,
        },
      });

      // Créer l'Adherent
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

      // ✅ Invalider le token dans la même transaction
      await tx.demandeAdhesion.update({
        where: { id: demande.id },
        data: { 
          profileToken: null,
          profileTokenExpiry: null,
        },
      });

      return adherent;
    });
  } catch (error) {
    // ✅ Supprimer la photo si la transaction échoue
    if (photoUrl) {
      try {
        await fs.unlink(path.join(process.cwd(), photoUrl));
      } catch (err) {
        console.error('Erreur suppression photo après échec:', err);
      }
    }
    throw error;
  }

  // 10. ✅ Envoyer email de bienvenue
  try {
    await this.emailService.sendWelcomeAdherent({
      email: result.user.email,
      nom: result.nom,
      prenom: result.prenom,
    });
  } catch (error) {
    console.error('❌ Erreur envoi email bienvenue:', error);
    // Ne pas bloquer la création si l'email échoue
  }

  console.log(`✅ Adhérent créé avec succès - ID: ${result.id}, Email: ${result.user.email}`);

  return {
    success: true,
    message: 'Compte créé avec succès',
    adherent: result,
  };
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
}
