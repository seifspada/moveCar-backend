import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StatutDemande, StatutDocument, TypeDocument } from '@prisma/client';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

import { CreateDemandeAdherentDto } from './Dto/create-demande-adherent.dto';
import { DemandeAdherentFiles, FastifyFileKV } from './Types/types';
import { EmailService } from '../email/email.service';
import { GeoService } from '../geo/geo.service';
import { UpdateDemandeAdherentDto } from './Dto/update-demande-adherent.dto';
import { DemandeAdherentGateway } from './gateways/demande-adherent.gateway';
import { DocumentProcessingService } from '../document-processing/document-processing.service';
import { UpdateDocumentDatesDto } from './Dto/update-document-dates.dto';

@Injectable()
export class DemandeAdherentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly geoService: GeoService,
    private readonly gateway: DemandeAdherentGateway,
    private readonly documentProcessing: DocumentProcessingService,
  ) {}

  // ================== CONSTANTES ==================

  private static readonly UPLOAD_FOLDER = 'demandes-adhesion';

  private static readonly ALLOWED_MIME = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  // ================== HELPERS FICHIERS ==================

  private assertAllowedFile(field: string, file: { mimetype?: string }) {
    if (!file?.mimetype) {
      throw new BadRequestException(
        `${field}: fichier invalide (mimetype manquant)`,
      );
    }
    if (!DemandeAdherentService.ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `${field}: type non autorisé (${file.mimetype}). Autorisés: PDF/JPG/PNG/WEBP`,
      );
    }
  }

  private validateAllFiles(files: DemandeAdherentFiles) {
    if ((files.carteIdentite?.length ?? 0) !== 2) {
      throw new BadRequestException(
        'carteIdentite doit contenir exactement 2 fichiers',
      );
    }
    if ((files.permisRectoVerso?.length ?? 0) !== 2) {
      throw new BadRequestException(
        'permisRectoVerso doit contenir exactement 2 fichiers',
      );
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
        throw new BadRequestException(
          `${String(k)} doit contenir 1 seul fichier`,
        );
      }
    }

    const allEntries = Object.entries(files) as Array<
      [string, FastifyFileKV[] | undefined]
    >;
    for (const [key, arr] of allEntries) {
      for (const f of arr ?? []) {
        this.assertAllowedFile(key, f);
      }
    }
  }

  private async saveFile(uploadDir: string, key: string, f: FastifyFileKV) {
    this.assertAllowedFile(key, f);
    await fs.mkdir(uploadDir, { recursive: true });
    const fileName = `${key}_${uuidv4()}${path.extname(f.filename)}`;
    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, f.value);
    return { fileName };
  }

  private getUploadDir(demandeId: number): string {
    return path.join(
      process.cwd(),
      'uploads',
      DemandeAdherentService.UPLOAD_FOLDER,
      String(demandeId),
    );
  }

  private getCheminFichier(demandeId: number, fileName: string): string {
    return `/uploads/${DemandeAdherentService.UPLOAD_FOLDER}/${demandeId}/${fileName}`;
  }

  // ================== SELECT RÉUTILISABLE ==================

  private get documentSelect() {
    return {
      id: true,
      typeDocument: true,
      statut: true,
      numero: true,
      dateDebutValidite: true,
      dateFinValidite: true,
      demandeAdhesionId: true,
      dateCreation: true,
      dateModification: true,
      fichiers: {
        select: {
          id: true,
          cheminFichier: true,
          documentId: true,
          dateCreation: true,
          dateModification: true,
        },
      },
    };
  }

  // ================== HELPER NETTOYAGE RÉPONSE ==================

  private cleanDocument(doc: any) {
    const base: Record<string, any> = {
      id: doc.id,
      typeDocument: doc.typeDocument,
      statut: doc.statut,
      demandeAdhesionId: doc.demandeAdhesionId,
      dateCreation: doc.dateCreation,
      dateModification: doc.dateModification,
      fichiers: doc.fichiers,
    };

    // ✅ numero → uniquement pour PERMIS
    if (doc.typeDocument === TypeDocument.PERMIS && doc.numero !== null) {
      base.numero = doc.numero;
    }

    // ✅ dateDebutValidite → uniquement si non null
    if (doc.dateDebutValidite !== null && doc.dateDebutValidite !== undefined) {
      base.dateDebutValidite = doc.dateDebutValidite;
    }

    // ✅ dateFinValidite → uniquement si non null
    if (doc.dateFinValidite !== null && doc.dateFinValidite !== undefined) {
      base.dateFinValidite = doc.dateFinValidite;
    }

    return base;
  }

  private cleanDemande(demande: any) {
    if (!demande) return null;

    // ✅ Supprimer profileToken et profileTokenExpiry de la réponse
    const {
      profileToken,
      profileTokenExpiry,
      documents,
      ...rest
    } = demande;

    return {
      ...rest,
      documents: (documents ?? []).map((doc: any) => this.cleanDocument(doc)),
    };
  }

  // ================== OCR (assurances uniquement) ==================

  private async tryExtractDates(
    file: FastifyFileKV,
    typeDocument: string,
  ): Promise<{
    dateDebutValidite: Date | null;
    dateFinValidite: Date | null;
  }> {
    try {
      const result = await this.documentProcessing.extractDates(
        file.value,
        file.filename,
        file.mimetype,
        typeDocument,
      );
      return {
        dateDebutValidite: result.dateDebut ? new Date(result.dateDebut) : null,
        dateFinValidite: result.dateFin ? new Date(result.dateFin) : null,
      };
    } catch {
      return { dateDebutValidite: null, dateFinValidite: null };
    }
  }

  // ================== CRÉATION ==================

  async create(dto: CreateDemandeAdherentDto, files: DemandeAdherentFiles) {
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

    this.validateAllFiles(files);
    await this.geoService.assertVilleFrance(dto.ville);

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

    const uploadDir = this.getUploadDir(demande.id);
    await fs.mkdir(uploadDir, { recursive: true });

    // ── Carte identité
    const carteFiles = files.carteIdentite ?? [];
    if (carteFiles.length === 2) {
      const fileNames: string[] = [];
      for (const f of carteFiles) {
        const { fileName } = await this.saveFile(uploadDir, 'carteIdentite', f);
        fileNames.push(fileName);
      }
      await this.prisma.document.create({
        data: {
          typeDocument: TypeDocument.CARTE_IDENTITE,
          statut: StatutDocument.EN_ATTENTE,
          demandeAdhesionId: demande.id,
          fichiers: {
            create: fileNames.map((fileName) => ({
              cheminFichier: this.getCheminFichier(demande.id, fileName),
            })),
          },
        },
      });
    }

    // ── Permis
    const permisFiles = files.permisRectoVerso ?? [];
    if (permisFiles.length === 2) {
      const fileNames: string[] = [];
      for (const f of permisFiles) {
        const { fileName } = await this.saveFile(uploadDir, 'permisRectoVerso', f);
        fileNames.push(fileName);
      }
      await this.prisma.document.create({
        data: {
          typeDocument: TypeDocument.PERMIS,
          statut: StatutDocument.EN_ATTENTE,
          numero: dto.numeroPermis,
          dateDebutValidite: new Date(dto.dateDebutValiditePermis),
          demandeAdhesionId: demande.id,
          fichiers: {
            create: fileNames.map((fileName) => ({
              cheminFichier: this.getCheminFichier(demande.id, fileName),
            })),
          },
        },
      });
    }

    // ── Singles sans OCR
    const singlesSansOcr: Array<[keyof DemandeAdherentFiles, TypeDocument]> = [
      ['rib',              TypeDocument.RIB],
      ['casierJudiciaire', TypeDocument.CASIER_JUDICIAIRE],
      ['carteGrisWgarage', TypeDocument.W_GARAGE],
    ];

    for (const [key, docType] of singlesSansOcr) {
      const arr = files[key] ?? [];
      if (!arr.length) continue;
      const { fileName } = await this.saveFile(uploadDir, String(key), arr[0]);
      await this.prisma.document.create({
        data: {
          typeDocument: docType,
          statut: StatutDocument.EN_ATTENTE,
          demandeAdhesionId: demande.id,
          fichiers: {
            create: [
              { cheminFichier: this.getCheminFichier(demande.id, fileName) },
            ],
          },
        },
      });
    }

    // ── Assurances avec OCR
    const singlesAvecOcr: Array<
      [keyof DemandeAdherentFiles, TypeDocument, string]
    > = [
      ['assuranceRcPro',         TypeDocument.RC_PRO,         'assuranceRcPro'],
      ['assuranceRcCirculation', TypeDocument.RC_CIRCULATION, 'assuranceRcCirculation'],
      ['kbis',                   TypeDocument.KBIS,           'kbis'],  // ✅ AJOUTÉ

    ];

    for (const [key, docType, typeDocumentOcr] of singlesAvecOcr) {
      const arr = files[key] ?? [];
      if (!arr.length) continue;
      const f = arr[0];
      const { fileName } = await this.saveFile(uploadDir, String(key), f);
      const extracted = await this.tryExtractDates(f, typeDocumentOcr);
      await this.prisma.document.create({
        data: {
          typeDocument: docType,
          statut: StatutDocument.EN_ATTENTE,
          demandeAdhesionId: demande.id,
          dateDebutValidite: extracted.dateDebutValidite,
          dateFinValidite: extracted.dateFinValidite,
          fichiers: {
            create: [
              { cheminFichier: this.getCheminFichier(demande.id, fileName) },
            ],
          },
        },
      });
    }

    // Emails
    try {
      await this.emailService.sendDemandeRecueAdherent({
        email: dto.email,
        nom: dto.nom,
        prenom: dto.prenom,
      });
    } catch (error: any) {
      console.error('Erreur envoi email adhérent:', { email: dto.email, error: error.message });
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
      console.error('Erreur envoi email admin:', { email: dto.email, error: error.message });
    }

    const result = await this.prisma.demandeAdhesion.findUnique({
      where: { id: demande.id },
      include: {
        documents: {
          orderBy: { typeDocument: 'asc' },
          select: this.documentSelect,
        },
      },
    });

  
this.gateway.notifyNewDemande({
  email: dto.email,
  id: demande.id,
  nom: dto.nom,       // ✅ ajouter
  prenom: dto.prenom, // ✅ ajouter
  message: 'Nouvelle demande reçue',
});

    return this.cleanDemande(result); // ✅
  }

  // ================== LECTURE / FILTRES ==================

  async findAll() {
    const results = await this.prisma.demandeAdhesion.findMany({
      include: {
        documents: {
          orderBy: { typeDocument: 'asc' },
          select: this.documentSelect,
        },
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
    return results.map((d) => this.cleanDemande(d)); // ✅
  }

  async findOne(id: number) {
    const demande = await this.prisma.demandeAdhesion.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { typeDocument: 'asc' },
          select: this.documentSelect,
        },
        adherent: { include: { user: true } },
      },
    });

    if (!demande) throw new NotFoundException(`Demande #${id} non trouvée`);
    return this.cleanDemande(demande); // ✅
  }

  async findByStatut(statut: StatutDemande) {
    const results = await this.prisma.demandeAdhesion.findMany({
      where: { statut },
      include: {
        documents: {
          orderBy: { typeDocument: 'asc' },
          select: this.documentSelect,
        },
        adherent: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
      orderBy: { dateCreation: 'desc' },
    });
    return results.map((d) => this.cleanDemande(d)); // ✅
  }

  // ================== MISE À JOUR / ACCEPTATION ==================

  async update(id: number, updateDto: UpdateDemandeAdherentDto) {
    await this.findOne(id);
    const result = await this.prisma.demandeAdhesion.update({
      where: { id },
      data: updateDto,
      include: {
        documents: {
          orderBy: { typeDocument: 'asc' },
          select: this.documentSelect,
        },
      },
    });
    return this.cleanDemande(result); // ✅
  }

 // ✅ Dans accepter()
async accepter(id: number) {
  const demande = await this.prisma.demandeAdhesion.update({
    where: { id },
    data: { statut: StatutDemande.ACCEPTEE },
  });

  // ✅ Notifier le frontend de retirer cette demande de la liste
  this.gateway.notifyStatutChange({ id, statut: 'ACCEPTEE' });

  return demande;
}

// ✅ Dans refuser()
async refuser(id: number, motif?: string) {
  const demande = await this.prisma.demandeAdhesion.update({
    where: { id },
    data: {
      statut: StatutDemande.REFUSEE,
      ...(motif ? { motifRefus: motif } : {}),
    },
  });

  // ✅ Notifier le frontend de retirer cette demande de la liste
  this.gateway.notifyStatutChange({ id, statut: 'REFUSEE' });

  return demande;
}


async updateDocumentDates(
  demandeId: number,
  documentId: number,
  dto: UpdateDocumentDatesDto,
) {
  // 1. Vérifier que la demande existe
  const demande = await this.prisma.demandeAdhesion.findUnique({
    where: { id: demandeId },
  });
  if (!demande) {
    throw new NotFoundException(`Demande #${demandeId} introuvable`);
  }

  // 2. Vérifier que le document appartient à cette demande
  const document = await this.prisma.document.findFirst({
    where: {
      id: documentId,
      demandeAdhesionId: demandeId,
    },
  });
  if (!document) {
    throw new NotFoundException(
      `Document #${documentId} introuvable dans la demande #${demandeId}`,
    );
  }

  // 3. Seuls RC_PRO, RC_CIRCULATION et KBIS sont modifiables
  const TYPES_AUTORISÉS: TypeDocument[] = [
    TypeDocument.RC_PRO,
    TypeDocument.RC_CIRCULATION,
    TypeDocument.KBIS,          // ✅ AJOUTÉ
  ];
  if (!TYPES_AUTORISÉS.includes(document.typeDocument)) {
    throw new BadRequestException(
      `Seuls les documents RC_PRO, RC_CIRCULATION et KBIS peuvent être modifiés. ` +
      `Type reçu : ${document.typeDocument}`,
    );
  }

  // 4. Construire le payload (uniquement les champs fournis)
  const data: { dateDebutValidite?: Date | null; dateFinValidite?: Date | null } = {};

  if (dto.dateDebutValidite !== undefined) {
    data.dateDebutValidite = dto.dateDebutValidite
      ? new Date(dto.dateDebutValidite)
      : null;
  }
  if (dto.dateFinValidite !== undefined) {
    data.dateFinValidite = dto.dateFinValidite
      ? new Date(dto.dateFinValidite)
      : null;
  }

  // 5. Vérification cohérence — en tenant compte des valeurs déjà en base
  const debut = data.dateDebutValidite ?? document.dateDebutValidite;
  const fin   = data.dateFinValidite   ?? document.dateFinValidite;
  if (debut && fin && fin <= debut) {
    throw new BadRequestException(
      'La date de fin doit être strictement postérieure à la date de début',
    );
  }

  // 6. Mise à jour en base
  const updated = await this.prisma.document.update({
    where: { id: documentId },
    data,
    select: this.documentSelect,
  });

  return this.cleanDocument(updated);
}

  // ================== VÉRIFICATION TOKEN ==================

  async verifyProfileToken(token: string) {
    const demande = await this.prisma.demandeAdhesion.findUnique({
      where: { profileToken: token },
    });

    if (!demande) throw new NotFoundException('Token invalide');

    if (demande.profileTokenExpiry && demande.profileTokenExpiry < new Date()) {
      throw new BadRequestException('Token expiré');
    }

    if (demande.statut !== StatutDemande.ACCEPTEE) {
      throw new BadRequestException('Demande non acceptée');
    }

    const adherent = await this.prisma.adherent.findFirst({
      where: { demandeAdhesionId: demande.id },
    });

    if (adherent) throw new BadRequestException('Profil déjà créé');

    return {
      id: demande.id,
      email: demande.email,
      nom: demande.nom,
      prenom: demande.prenom,
    };
  }

  // ================== SUPPRESSION ==================

async remove(id: number) {
  // 1. Vérifier que la demande existe
  const demande = await this.prisma.demandeAdhesion.findUnique({
    where: { id },
    include: {
      documents: {
        select: {
          id: true,
          fichiers: { select: { id: true, cheminFichier: true } },
        },
      },
    },
  });

  if (!demande) {
    throw new NotFoundException(`Demande d'adhésion #${id} introuvable`);
  }

  return this.prisma.$transaction(async (tx) => {
    // 2. Supprimer les fichiers physiques + fichiers_documents
    for (const doc of demande.documents) {
      for (const fichier of doc.fichiers) {
        // Supprimer le fichier physique du disque
        try {
          const fullPath = path.join(process.cwd(), fichier.cheminFichier);
          await fs.unlink(fullPath);
        } catch {
          // Fichier déjà supprimé ou introuvable → on continue
        }
      }

      // Supprimer les enregistrements fichiers_documents
      await tx.fichierDocument.deleteMany({
        where: { documentId: doc.id },
      });
    }

    // 3. Supprimer les documents
    await tx.document.deleteMany({
      where: { demandeAdhesionId: id },
    });

    // 4. Supprimer l'adherent lié (s'il existe)
    const adherent = await tx.adherent.findFirst({
      where: { demandeAdhesionId: id },
      select: { id: true },
    });

    if (adherent) {
      // Supprimer les reservations_mission liées à l'adherent
      await tx.$executeRaw`
        DELETE FROM reservations_mission WHERE "adherentId" = ${adherent.id}
      `;

      await tx.adherent.delete({ where: { id: adherent.id } });
    }

    // 5. Supprimer le dossier physique upload
    try {
      const uploadDir = this.getUploadDir(id);
      await fs.rm(uploadDir, { recursive: true, force: true });
    } catch {
      // Dossier inexistant → on continue
    }

    // 6. Supprimer la demande elle-même
    return tx.demandeAdhesion.delete({
      where: { id },
    });
  });
}


}