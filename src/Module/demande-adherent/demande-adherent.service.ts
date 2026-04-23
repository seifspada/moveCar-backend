import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatutDemande, StatutDocument, TypeDocument } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
import { PrismaService } from '../../prisma/prisma.service';

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

  private supabase: SupabaseClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  private static readonly BUCKET = 'documents';

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

  /**
   * Upload un fichier vers Supabase Storage.
   * Retourne l'URL publique à stocker dans cheminFichier.
   */
  private async saveFile(
    demandeId: number,
    key: string,
    f: FastifyFileKV,
  ): Promise<{ publicUrl: string }> {
    this.assertAllowedFile(key, f);

    const ext = f.filename.split('.').pop();
    const fileName = `${key}_${uuidv4()}.${ext}`;
    const storagePath = `demandes-adhesion/${demandeId}/${fileName}`;

    const { error } = await this.supabase.storage
      .from(DemandeAdherentService.BUCKET)
      .upload(storagePath, f.value, {
        contentType: f.mimetype,
        upsert: true,
      });

    if (error) {
      throw new Error(`Upload Supabase échoué (${key}): ${error.message}`);
    }

    const { data } = this.supabase.storage
      .from(DemandeAdherentService.BUCKET)
      .getPublicUrl(storagePath);

    return { publicUrl: data.publicUrl };
  }

  /**
   * Extrait le storagePath depuis une URL publique Supabase.
   * URL format : https://<project>.supabase.co/storage/v1/object/public/<bucket>/<storagePath>
   */
  private extractStoragePath(publicUrl: string): string | null {
    try {
      const marker = `/object/public/${DemandeAdherentService.BUCKET}/`;
      const idx = publicUrl.indexOf(marker);
      if (idx === -1) return null;
      return publicUrl.slice(idx + marker.length);
    } catch {
      return null;
    }
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

    if (doc.typeDocument === TypeDocument.PERMIS && doc.numero !== null) {
      base.numero = doc.numero;
    }

    if (doc.dateDebutValidite !== null && doc.dateDebutValidite !== undefined) {
      base.dateDebutValidite = doc.dateDebutValidite;
    }

    if (doc.dateFinValidite !== null && doc.dateFinValidite !== undefined) {
      base.dateFinValidite = doc.dateFinValidite;
    }

    return base;
  }

  private cleanDemande(demande: any) {
    if (!demande) return null;

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

    // ── Carte identité
    const carteFiles = files.carteIdentite ?? [];
    if (carteFiles.length === 2) {
      const publicUrls: string[] = [];
      for (const f of carteFiles) {
        const { publicUrl } = await this.saveFile(demande.id, 'carteIdentite', f);
        publicUrls.push(publicUrl);
      }
      await this.prisma.document.create({
        data: {
          typeDocument: TypeDocument.CARTE_IDENTITE,
          statut: StatutDocument.EN_ATTENTE,
          demandeAdhesionId: demande.id,
          fichiers: {
            create: publicUrls.map((publicUrl) => ({
              cheminFichier: publicUrl,
            })),
          },
        },
      });
    }

    // ── Permis
    const permisFiles = files.permisRectoVerso ?? [];
    if (permisFiles.length === 2) {
      const publicUrls: string[] = [];
      for (const f of permisFiles) {
        const { publicUrl } = await this.saveFile(demande.id, 'permisRectoVerso', f);
        publicUrls.push(publicUrl);
      }
      await this.prisma.document.create({
        data: {
          typeDocument: TypeDocument.PERMIS,
          statut: StatutDocument.EN_ATTENTE,
          numero: dto.numeroPermis,
          dateDebutValidite: new Date(dto.dateDebutValiditePermis),
          demandeAdhesionId: demande.id,
          fichiers: {
            create: publicUrls.map((publicUrl) => ({
              cheminFichier: publicUrl,
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
      const { publicUrl } = await this.saveFile(demande.id, String(key), arr[0]);
      await this.prisma.document.create({
        data: {
          typeDocument: docType,
          statut: StatutDocument.EN_ATTENTE,
          demandeAdhesionId: demande.id,
          fichiers: {
            create: [{ cheminFichier: publicUrl }],
          },
        },
      });
    }

    // ── Assurances + KBIS avec OCR
    const singlesAvecOcr: Array<
      [keyof DemandeAdherentFiles, TypeDocument, string]
    > = [
      ['assuranceRcPro',         TypeDocument.RC_PRO,         'assuranceRcPro'],
      ['assuranceRcCirculation', TypeDocument.RC_CIRCULATION, 'assuranceRcCirculation'],
      ['kbis',                   TypeDocument.KBIS,           'kbis'],
    ];

    for (const [key, docType, typeDocumentOcr] of singlesAvecOcr) {
      const arr = files[key] ?? [];
      if (!arr.length) continue;
      const f = arr[0];
      const { publicUrl } = await this.saveFile(demande.id, String(key), f);
      const extracted = await this.tryExtractDates(f, typeDocumentOcr);
      await this.prisma.document.create({
        data: {
          typeDocument: docType,
          statut: StatutDocument.EN_ATTENTE,
          demandeAdhesionId: demande.id,
          dateDebutValidite: extracted.dateDebutValidite,
          dateFinValidite: extracted.dateFinValidite,
          fichiers: {
            create: [{ cheminFichier: publicUrl }],
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

    try {
      this.gateway.notifyNewDemande({
        email: dto.email,
        id: demande.id,
        nom: dto.nom,
        prenom: dto.prenom,
        message: 'Nouvelle demande reçue',
      });
    } catch (error: any) {
      console.error('Erreur notification gateway:', { email: dto.email, error: error.message });
    }

    return this.cleanDemande(result);
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
    return results.map((d) => this.cleanDemande(d));
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
    return this.cleanDemande(demande);
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
    return results.map((d) => this.cleanDemande(d));
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
    return this.cleanDemande(result);
  }

async accepter(id: number) {
  const profileToken = randomBytes(32).toString('hex');
  const profileTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const demande = await this.prisma.demandeAdhesion.update({
    where: { id },
    data: {
      statut: StatutDemande.ACCEPTEE,
      profileToken,
      profileTokenExpiry,
    },
  });

  // ✅ Guard — échoue tôt si FRONTEND_URL manque
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    console.error('❌ FRONTEND_URL non définie — email non envoyé');
  } else {
    const profileUrl = `${frontendUrl}/formulaire/adherent/inscription-formulaire/${profileToken}`;

    try {
      await this.emailService.sendProfileCreationLink(
        demande.email,
        demande.nom,
        profileUrl,
      );
    } catch (error: any) {
      console.error('❌ Erreur envoi email création profil adhérent:', {
        email: demande.email,
        error: error.message,
      });
    }
  }

  this.gateway.notifyStatutChange({ id, statut: 'ACCEPTEE' });

  return demande;
}

  async refuser(id: number, motif?: string) {
    const demande = await this.prisma.demandeAdhesion.update({
      where: { id },
      data: {
        statut: StatutDemande.REFUSEE,
        ...(motif ? { motifRefus: motif } : {}),
      },
    });
    this.gateway.notifyStatutChange({ id, statut: 'REFUSEE' });
    return demande;
  }

  async updateDocumentDates(
    demandeId: number,
    documentId: number,
    dto: UpdateDocumentDatesDto,
  ) {
    const demande = await this.prisma.demandeAdhesion.findUnique({
      where: { id: demandeId },
    });
    if (!demande) {
      throw new NotFoundException(`Demande #${demandeId} introuvable`);
    }

    const document = await this.prisma.document.findFirst({
      where: { id: documentId, demandeAdhesionId: demandeId },
    });
    if (!document) {
      throw new NotFoundException(
        `Document #${documentId} introuvable dans la demande #${demandeId}`,
      );
    }

    const TYPES_AUTORISÉS: TypeDocument[] = [
      TypeDocument.RC_PRO,
      TypeDocument.RC_CIRCULATION,
      TypeDocument.KBIS,
    ];
    if (!TYPES_AUTORISÉS.includes(document.typeDocument)) {
      throw new BadRequestException(
        `Seuls les documents RC_PRO, RC_CIRCULATION et KBIS peuvent être modifiés. ` +
        `Type reçu : ${document.typeDocument}`,
      );
    }

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

    const debut = data.dateDebutValidite ?? document.dateDebutValidite;
    const fin   = data.dateFinValidite   ?? document.dateFinValidite;
    if (debut && fin && fin <= debut) {
      throw new BadRequestException(
        'La date de fin doit être strictement postérieure à la date de début',
      );
    }

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

    // Collecter tous les storagePaths à supprimer depuis Supabase
    const storagePaths: string[] = [];
    for (const doc of demande.documents) {
      for (const fichier of doc.fichiers) {
        const storagePath = this.extractStoragePath(fichier.cheminFichier);
        if (storagePath) storagePaths.push(storagePath);
      }
    }

    // Supprimer les fichiers Supabase en une seule requête batch
    if (storagePaths.length > 0) {
      const { error } = await this.supabase.storage
        .from(DemandeAdherentService.BUCKET)
        .remove(storagePaths);

      if (error) {
        // Log non-bloquant : on continue même si Supabase échoue
        console.error(`Supabase storage remove error (demande #${id}):`, error.message);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Supprimer les enregistrements fichiers_documents
      for (const doc of demande.documents) {
        await tx.fichierDocument.deleteMany({
          where: { documentId: doc.id },
        });
      }

      // Supprimer les documents
      await tx.document.deleteMany({
        where: { demandeAdhesionId: id },
      });

      // Supprimer l'adherent lié (s'il existe)
      const adherent = await tx.adherent.findFirst({
        where: { demandeAdhesionId: id },
        select: { id: true },
      });

      if (adherent) {
        await tx.$executeRaw`
          DELETE FROM reservations_mission WHERE "adherentId" = ${adherent.id}
        `;
        await tx.adherent.delete({ where: { id: adherent.id } });
      }

      // Supprimer la demande elle-même
      return tx.demandeAdhesion.delete({
        where: { id },
      });
    });
  }
}