import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  // ================== FICHIERS & CRÉATION ==================

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
    // 1) Vérifier email non utilisé ailleurs (partenaire + demande adhésion)
    const existingPartnerDemand = await this.prisma.demandePartenaire.findFirst({
      where: { email: dto.email },
    });

    if (existingPartnerDemand) {
      throw new BadRequestException(
        "Cet email est déjà utilisé pour une demande de partenariat. Un email ne peut être associé qu'à un seul type de demande.",
      );
    }

    const existingPartner = await this.prisma.partenaire.findFirst({
      where: { email: dto.email },
    });

    if (existingPartner) {
      throw new BadRequestException(
        "Cet email est déjà associé à un compte partenaire. Un email ne peut être associé qu'à un seul type de rôle.",
      );
    }

    const existingDemande = await this.prisma.demandeAdhesion.findFirst({
      where: { email: dto.email },
    });

    if (existingDemande) {
      throw new BadRequestException('Une demande avec cet email existe déjà');
    }

    // 2) Valider fichiers
    this.validateAllFiles(files);

    // 3) Valider ville
    await this.geoService.assertVilleFrance(dto.ville);

    // 4) Créer la demande
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

    // 5) Sauvegarde fichiers + documents
    const uploadDir = path.join(process.cwd(), 'uploads', 'demandes', String(demande.id));
    await fs.mkdir(uploadDir, { recursive: true });

    // Carte identité
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

    // Permis
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

    const singles: Array<[keyof DemandeAdherentFiles, TypeDocument]> = [
      ['kbis', TypeDocument.KBIS],
      ['rib', TypeDocument.RIB],
      ['assuranceRcPro', TypeDocument.RC_PRO],
      ['assuranceRcCirculation', TypeDocument.RC_CIRCULATION],
      ['casierJudiciaire', TypeDocument.CASIER_JUDICIAIRE],
      ['carteGrisWgarage', TypeDocument.W_GARAGE],
    ];

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

    // 6) Emails
    try {
      await this.emailService.sendDemandeRecueAdherent({
        email: dto.email,
        nom: dto.nom,
        prenom: dto.prenom,
      });
    } catch (error: any) {
      console.error('Erreur envoi email adhérent:', {
        email: dto.email,
        error: error.message,
      });
    }

    try {
      await this.emailService.sendNouvelleDemandeAdmin({
        email: dto.email,
        nom: dto.nom,
        prenom: dto.prenom,
        telephone: dto.telephone,
        typeAdhesion: dto.raisonSociale ? 'Professionnel' : 'Particulier',
        dateInscription: new Date(),
      });
    } catch (error: any) {
      console.error('Erreur envoi email admin:', {
        email: dto.email,
        error: error.message,
      });
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

  // ================== LECTURE / FILTRES ==================

  async findAll() {
    return this.prisma.demandeAdhesion.findMany({
      include: {
        documents: { orderBy: { typeDocument: 'asc' } },
        adherent: {
          include: {
            user: {
              select: { id: true, email: true, name: true, photo: true },
            },
          },
        },
      },
      orderBy: { dateCreation: 'desc' },
    });
  }

  async findOne(id: number) {
    const demande = await this.prisma.demandeAdhesion.findUnique({
      where: { id },
      include: {
        documents: { orderBy: { typeDocument: 'asc' } },
        adherent: { include: { user: true } },
      },
    });

    if (!demande) throw new NotFoundException(`Demande #${id} non trouvée`);
    return demande;
  }

  async findByStatut(statut: StatutDemande) {
    return this.prisma.demandeAdhesion.findMany({
      where: { statut },
      include: {
        documents: { orderBy: { typeDocument: 'asc' } },
        adherent: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
      orderBy: { dateCreation: 'desc' },
    });
  }

  // ================== MISE À JOUR / ACCEPTATION ==================

 async update(id: number, updateDto: UpdateDemandeAdherentDto) {
  // Optionnel : vérifier que la demande existe
  await this.findOne(id);

  return this.prisma.demandeAdhesion.update({
    where: { id },
    data: updateDto,
    include: {
      documents: { orderBy: { typeDocument: 'asc' } },
    },
  });
}

  // Raccourci explicite pour le bouton "Accepter"
  // Raccourci explicite pour le bouton "Accepter"
async accepterDemande(id: number) {
  const demande = await this.prisma.demandeAdhesion.findUnique({
    where: { id },
  });

  if (!demande) {
    throw new NotFoundException(`Demande adhérent #${id} introuvable`);
  }

  if (demande.statut === StatutDemande.ACCEPTEE) {
    throw new ConflictException('Cette demande a déjà été acceptée');
  }

  const profileToken = randomBytes(32).toString('hex');
  const profileTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const demandeAcceptee = await this.prisma.demandeAdhesion.update({
    where: { id },
    data: {
      statut: StatutDemande.ACCEPTEE,
      profileToken,
      profileTokenExpiry,
    },
  });

const profileUrl = `${process.env.FRONTEND_URL}/formulaire/adherent/profil-adherent-formulaire/${profileToken}`;

  try {
    await this.emailService.sendProfileCreationLink(
      demandeAcceptee.email,
      demandeAcceptee.nom,
      profileUrl,
    );
  } catch (error: any) {
    console.error('Erreur envoi email adhérent:', {
      email: demandeAcceptee.email,
      error: error.message,
    });
  }

  return {
    success: true,
    message: 'Demande acceptée, token généré et email envoyé.',
    demande: demandeAcceptee,
    profileUrl,
  };
}


  async refuser(id: number) {
    return this.update(id, { statut: StatutDemande.REFUSEE });
  }

  // ================== VÉRIFICATION TOKEN ==================

  async verifyProfileToken(token: string) {
    const demande = await this.prisma.demandeAdhesion.findUnique({
      where: { profileToken: token },
    });

    if (!demande) {
      throw new NotFoundException('Token invalide');
    }

    if (demande.profileTokenExpiry && demande.profileTokenExpiry < new Date()) {
      throw new BadRequestException('Token expiré');
    }

    // cohérent avec accepterDemande : on attend ACCEPTÉE
    if (demande.statut !== StatutDemande.ACCEPTEE) {
      throw new BadRequestException('Demande non acceptée');
    }

    const adherent = await this.prisma.adherent.findFirst({
      where: { demandeAdhesionId: demande.id },
    });

    if (adherent) {
      throw new BadRequestException('Profil déjà créé');
    }

    return {
      id: demande.id,
      email: demande.email,
      nom: demande.nom,
      prenom: demande.prenom,
    };
  }

  // ================== SUPPRESSION ==================

  async remove(id: number) {
    const demande = await this.prisma.demandeAdhesion.findUnique({
      where: { id },
      include: {
        documents: true,
        adherent: true,
      },
    });

    if (!demande) {
      throw new NotFoundException(`Demande d'adhésion #${id} introuvable`);
    }

    if (
      demande.statut === StatutDemande.ACCEPTEE ||
      demande.statut === StatutDemande.VALIDEE
    ) {
      throw new BadRequestException(
        "Impossible de supprimer une demande acceptée/validée. Veuillez la refuser d'abord.",
      );
    }

    if (demande.adherent && demande.adherent.length > 0) {
      throw new BadRequestException(
        'Impossible de supprimer une demande avec un adhérent associé',
      );
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'demandes', String(id));

    try {
      await fs.access(uploadDir);
      await fs.rm(uploadDir, { recursive: true, force: true });
    } catch {
      // ignore
    }

    await this.prisma.$transaction(async (tx) => {
      if (demande.documents.length > 0) {
        await tx.document.deleteMany({
          where: { demandeAdhesionId: id },
        });
      }

      await tx.demandeAdhesion.delete({
        where: { id },
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
        documentsSupprimes: demande.documents.length,
      },
    };
  }
}
