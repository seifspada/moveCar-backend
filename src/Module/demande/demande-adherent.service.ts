import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StatutDemande, TypeDocument } from '@prisma/client';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

import { CreateDemandeAdherentDto } from './Dto/create-demande-adherent.dto';
import { DemandeAdherentFiles, FastifyFileKV } from './Types/types';
import { EmailService } from '../email/email.service';
import { GeoService } from '../geo/geo.service';
import { UpdateDemandeAdherentDto } from './Dto/update-demande-adherent.dto';

@Injectable()
export class DemandeAdherentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly geoService: GeoService,
  ) {}

  private static readonly ALLOWED_MIME = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  private assertAllowedFile(field: string, file: { mimetype?: string }) {
    if (!file?.mimetype) {
      throw new BadRequestException(`${field}: fichier invalide (mimetype manquant)`);
    }
    if (!DemandeAdherentService.ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `${field}: type non autorisé (${file.mimetype}). Autorisés: PDF/JPG/PNG/WEBP`,
      );
    }
  }

  private validateAllFiles(files: DemandeAdherentFiles) {
    if ((files.carteIdentite?.length ?? 0) !== 2) {
      throw new BadRequestException('carteIdentite doit contenir exactement 2 fichiers');
    }
    if ((files.permisRectoVerso?.length ?? 0) !== 2) {
      throw new BadRequestException('permisRectoVerso doit contenir exactement 2 fichiers');
    }

    const singles: (keyof DemandeAdherentFiles)[] = [
      'kbis',
      'rib',
      'assuranceRcPro',
      'assuranceRcCirculation',
      'casierJudiciaire',
      'carteGrisWgarage',
    ];

    for (const k of singles) {
      if ((files[k]?.length ?? 0) > 1) {
        throw new BadRequestException(`${String(k)} doit contenir 1 seul fichier`);
      }
    }

    const allEntries = Object.entries(files) as Array<[string, FastifyFileKV[] | undefined]>;
    for (const [key, arr] of allEntries) {
      for (const f of arr ?? []) {
        this.assertAllowedFile(key, f);
      }
    }
  }

  private async saveFile(uploadDir: string, key: string, f: FastifyFileKV) {
    this.assertAllowedFile(key, f);

    const fileName = `${key}_${uuidv4()}${path.extname(f.filename)}`;
    const filePath = path.join(uploadDir, fileName);

    await fs.writeFile(filePath, f.value);
    return { fileName };
  }

  async create(dto: CreateDemandeAdherentDto, files: DemandeAdherentFiles) {
  // 1) email existe ?
  const existingDemande = await this.prisma.demandeAdhesion.findFirst({
    where: { email: dto.email },
  });

  if (existingDemande) {
    throw new BadRequestException('Une demande avec cet email existe déjà');
  }

  // 2) ✅ valider fichiers AVANT insertion DB
  this.validateAllFiles(files);

  // 3) ✅ valider ville France AVANT insertion DB
  await this.geoService.assertVilleFrance(dto.ville);

  // 4) create DB (seulement si tout est OK)
  const demande = await this.prisma.demandeAdhesion.create({
    data: {
      nom: dto.nom,
      prenom: dto.prenom,
      dateNaissance: new Date(dto.dateNaissance),
      email: dto.email,
      telephone: dto.telephone,
      adresse: dto.adresse,
      ville: dto.ville,
      raisonSociale: dto.raisonSociale,
      numeroKbis: dto.numeroKbis,
      statut: StatutDemande.EN_ATTENTE,
    },
  });

  // 5) save files + documents
  const uploadDir = path.join(process.cwd(), 'uploads', 'demandes', String(demande.id));
  await fs.mkdir(uploadDir, { recursive: true });

  // ✅ Enregistrer CARTE_IDENTITE (2 fichiers)
  for (const f of files.carteIdentite ?? []) {
    const { fileName } = await this.saveFile(uploadDir, 'carteIdentite', f);

    await this.prisma.document.create({
      data: {
        typeDocument: TypeDocument.CARTE_IDENTITE,
        cheminFichier: `/uploads/demandes-adhesion/${demande.id}/${fileName}`,
        demandeAdhesionId: demande.id,
      },
    });
  }

  // ✅ Enregistrer PERMIS (2 fichiers)
  for (const f of files.permisRectoVerso ?? []) {
    const { fileName } = await this.saveFile(uploadDir, 'permisRectoVerso', f);

    await this.prisma.document.create({
      data: {
        typeDocument: TypeDocument.PERMIS,
        cheminFichier: `/uploads/demandes-adhesion/${demande.id}/${fileName}`,
        demandeAdhesionId: demande.id,
        numero: dto.numeroPermis,
        dateDelivrance: new Date(dto.dateDelivrance),
      },
    });
  }

  // ✅ Mapping des fichiers uniques avec leur TypeDocument
  const singles: Array<[keyof DemandeAdherentFiles, TypeDocument]> = [
    ['kbis', TypeDocument.KBIS],
    ['rib', TypeDocument.RIB],
    ['assuranceRcPro', TypeDocument.RC_PRO],
    ['assuranceRcCirculation', TypeDocument.RC_CIRCULATION],
    ['casierJudiciaire', TypeDocument.CASIER_JUDICIAIRE],
    ['carteGrisWgarage', TypeDocument.W_GARAGE],
  ];

  // ✅ Enregistrer tous les documents uniques
  for (const [key, docType] of singles) {
    const arr = files[key] ?? [];
    if (!arr.length) continue;

    const { fileName } = await this.saveFile(uploadDir, String(key), arr[0]);

    await this.prisma.document.create({
      data: {
        typeDocument: docType,
        cheminFichier: `/uploads/demandes-adhesion/${demande.id}/${fileName}`,
        demandeAdhesionId: demande.id,
      },
    });
  }

  // 6) ✅ send emails (après succès complet)
  try {
    // Email à l'adhérent
    await this.emailService.sendDemandeRecueAdherent({
      email: dto.email,
      nom: dto.nom,
      prenom: dto.prenom, // ✅ Ajouter le prénom
    });
  } catch (error) {
    console.error('❌ Erreur envoi email adhérent:', {
      email: dto.email,
      error: error.message
    });
    // Ne pas bloquer la création si l'email échoue
  }

  try {
    // Email à l'admin
    await this.emailService.sendNouvelleDemandeAdmin({
      email: dto.email,
      nom: dto.nom,
      prenom: dto.prenom,
      telephone: dto.telephone,
      typeAdhesion: dto.raisonSociale ? 'Professionnel' : 'Particulier', // ✅ Déterminer le type
      dateInscription: new Date(), // ✅ Date actuelle
    });
  } catch (error) {
    console.error('❌ Erreur envoi email admin:', {
      email: dto.email,
      error: error.message
    });
    // Ne pas bloquer la création si l'email échoue
  }

  return this.prisma.demandeAdhesion.findUnique({
    where: { id: demande.id },
    include: { 
      documents: {
        orderBy: { typeDocument: 'asc' },
      },
    },
  });
}


  // ✅ Récupérer toutes les demandes
  async findAll() {
    return this.prisma.demandeAdhesion.findMany({
      include: { 
        documents: {
          orderBy: { typeDocument: 'asc' },  // ✅ Trier par type
        },
        adherent: {  // ✅ Pluriel si relation 1:N
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
        },
      },
      orderBy: { dateCreation: 'desc' },
    });
  }

  // ✅ Récupérer une demande par ID
  async findOne(id: number) {
    const demande = await this.prisma.demandeAdhesion.findUnique({
      where: { id },
      include: { 
        documents: {
          orderBy: { typeDocument: 'asc' },
        },
        adherent: {  // ✅ Pluriel si relation 1:N
          include: {
            user: true,
          },
        },
      },
    });

    if (!demande) throw new NotFoundException(`Demande #${id} non trouvée`);
    return demande;
  }

  // ✅ Filtrer par statut
  async findByStatut(statut: StatutDemande) {
    return this.prisma.demandeAdhesion.findMany({
      where: { statut },
      include: { 
        documents: {
          orderBy: { typeDocument: 'asc' },
        },
        adherent: {  // ✅ Pluriel si relation 1:N
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { dateCreation: 'desc' },
    });
  }

  // ✅ Mettre à jour une demande (générique)
  async update(id: number, updateDto: UpdateDemandeAdherentDto) {
    const demande = await this.findOne(id);

    const dataToUpdate: any = { ...updateDto };

    // Si admin valide la demande → générer token
    if (updateDto.statut === StatutDemande.VALIDEE && demande.statut !== StatutDemande.VALIDEE) {
      const token = randomBytes(32).toString('hex'); // Token sécurisé
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7); // Expire dans 7 jours

      dataToUpdate.profileToken = token;
      dataToUpdate.profileTokenExpiry = expiry;

      // ✅ Envoyer email avec lien de création profil
      const profileUrl = `${process.env.FRONTEND_URL}/formulaire/adherent/profil-adherent-formulaire?token=${token}`;
      await this.emailService.sendProfileCreationLink(demande.email, demande.nom, profileUrl);
    }

    return this.prisma.demandeAdhesion.update({
      where: { id },
      data: dataToUpdate,
      include: { 
        documents: {
          orderBy: { typeDocument: 'asc' },
        },
      },
    });
  }

  // ✅ Valider une demande (raccourci)
  async valider(id: number) {
    return this.update(id, { statut: StatutDemande.VALIDEE });
  }

  // ✅ Refuser une demande (raccourci)
  async refuser(id: number) {
    return this.update(id, { statut: StatutDemande.REFUSEE });
  }

  // ✅ Vérifier le token de création profil
  async verifyProfileToken(token: string) {
    const demande = await this.prisma.demandeAdhesion.findUnique({
      where: { profileToken: token },
    });

    if (!demande) {
      throw new NotFoundException('Token invalide');
    }

    // Vérifier expiration
    if (demande.profileTokenExpiry && demande.profileTokenExpiry < new Date()) {
      throw new BadRequestException('Token expiré');
    }

    // Vérifier statut
    if (demande.statut !== StatutDemande.VALIDEE) {
      throw new BadRequestException('Demande non validée');
    }

    // Vérifier qu'un adhérent n'existe pas déjà
    const adherent = await this.prisma.adherent.findFirst({
      where: { demandeAdhesionId: demande.id },
    });

    if (adherent) {
      throw new BadRequestException('Profil déjà créé');
    }

    // Retourner les données (sans infos sensibles)
    return {
      id: demande.id,
      email: demande.email,
      nom: demande.nom,
      prenom: demande.prenom,
    };
  }
  async remove(id: number) {
    // 1. Vérifier que la demande existe
    const demande = await this.prisma.demandeAdhesion.findUnique({
      where: { id },
      include: { 
        documents: true,
        adherent: true
      }
    });

    if (!demande) {
      throw new NotFoundException(`Demande d'adhésion #${id} introuvable`);
    }

    // 2. Vérifier qu'on peut supprimer
    if (demande.statut === StatutDemande.ACCEPTEE || demande.statut === StatutDemande.VALIDEE) {
      throw new BadRequestException(
        'Impossible de supprimer une demande acceptée/validée. Veuillez la refuser d\'abord.'
      );
    }

    // 3. Vérifier qu'aucun adhérent n'est lié
    if (demande.adherent && demande.adherent.length > 0) {
      throw new BadRequestException(
        'Impossible de supprimer une demande avec un adhérent associé'
      );
    }

    // 4. Supprimer les fichiers physiques
    const uploadDir = path.join(process.cwd(), 'uploads', 'demandes', String(id));
    
    try {
      await fs.access(uploadDir); // Vérifier si le dossier existe
      await fs.rm(uploadDir, { recursive: true, force: true });
      console.log(`✅ Fichiers supprimés: ${uploadDir}`);
    } catch (error) {
      console.warn(`⚠️ Dossier inexistant ou déjà supprimé: ${uploadDir}`);
      // Ne pas bloquer si le dossier n'existe pas
    }

    // 5. Supprimer en transaction (documents + demande)
    await this.prisma.$transaction(async (tx) => {
      // Supprimer tous les documents liés
      if (demande.documents.length > 0) {
        await tx.document.deleteMany({
          where: { demandeAdhesionId: id }
        });
      }

      // Supprimer la demande
      await tx.demandeAdhesion.delete({
        where: { id }
      });
    });

    return {
      success: true,
      message: `Demande d'adhésion #${id} supprimée avec succès`,
      demande: {
        id: demande.id,
        nom: demande.nom,
        prenom: demande.prenom,
        email: demande.email,
        documentsSupprimes: demande.documents.length
      }
    };
  }
  
}
