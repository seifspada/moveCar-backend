import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';
import * as exifr from 'exifr';

import {
  StartInspectionInput,
  SubmitConsentInput,
  ValidateInspectionInput,
  InspectionFilterInput,
} from './dto/pretrip-inspection.inputs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ALL_REQUIRED_MEDIA_TYPES,
  MEDIA_TYPES_BY_STEP,
  EtapeInspection,
  StatutPreTripInspection,
  TypeMediaInspection,
} from './enum/pretrip-inspection.enums';
import { Role } from '../../auth/enum/role.enum';
import { MissionsService } from '../missions/missions.service';
import { EmailService } from '../email/email.service';
import { AlertesService } from '../alertes/alertes.service';

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────
const MAX_PHOTO_AGE_MINUTES = 10;
const MAX_GPS_DRIFT_METERS = 100;
const MAX_INSPECTION_DURATION_MINUTES = 60;
const CURRENT_CONSENT_VERSION = 'v1.0';
const UPLOAD_BASE_PATH = 'uploads/pretrip';

// ─────────────────────────────────────────────
// TYPES INTERNES
// ─────────────────────────────────────────────
interface ExifMetadata {
  latitude: number;
  longitude: number;
  precisionGps: number | null;
  timestampPhoto: Date;
}

interface AntiFraudResult {
  valid: boolean;
  reasons: string[];
}

// ─────────────────────────────────────────────
// INCLUDE PRISMA RÉUTILISABLE
// Charge adherent + user pour assertOwnershipByRole
// ─────────────────────────────────────────────
const FULL_INSPECTION_INCLUDE = {
  adherent: {
    include: { user: true }, // ← FIX #1 : user chargé partout
  },
  medias: true,
  consent: true,
  reservation: true,
} as const;

@Injectable()
export class PreTripInspectionService {
  private readonly logger = new Logger(PreTripInspectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly missionsService: MissionsService,
    private readonly emailService: EmailService,
    private readonly alerteService: AlertesService,
  ) { }

  // ============================================================
  // MUTATIONS
  // ============================================================

  async startInspection(
    input: StartInspectionInput,
    userId: number,
  ): Promise<any> {
    // Vérifier que l'utilisateur est bien un adhérent
    const adherent = await this.prisma.adherent.findUnique({
      where: { userId },
    });
    if (!adherent) {
      throw new ForbiddenException('Seul un adhérent peut démarrer une inspection.');
    }

    // Vérifier la réservation
    const reservation = await this.prisma.reservationMission.findUnique({
      where: { id: input.reservationId },
      include: { preTripInspection: true },
    });
    if (!reservation) {
      throw new NotFoundException('Réservation introuvable.');
    }
    if (reservation.adherentId !== adherent.id) {
      throw new ForbiddenException("Cette réservation ne vous appartient pas.");
    }
    if (reservation.statut !== 'CONFIRMED_BY_ADHERENT') {
      throw new BadRequestException(
        `La réservation doit être CONFIRMED_BY_ADHERENT. Statut actuel : ${reservation.statut}`,
      );
    }
    if (reservation.preTripInspection) {
      throw new ConflictException("Une fiche d'inspection existe déjà pour cette réservation.");
    }

    // Créer la fiche
    const inspection = await this.prisma.preTripInspection.create({
      data: {
        reservationId: input.reservationId,
        adherentId: adherent.id,
        statut: StatutPreTripInspection.DRAFT,
        etapeCourante: EtapeInspection.EXTERIEUR,
        latitudeDebut: input.latitudeDebut ?? null,
        longitudeDebut: input.longitudeDebut ?? null,
      },
    });

    this.logger.log(`Inspection ${inspection.id} créée pour réservation ${input.reservationId}`);

    // Notification async — ne jamais bloquer le retour
    this.notifyAgentInspectionStarted(input.reservationId, inspection.id).catch(
      (err) => this.logger.warn(`notifyAgentInspectionStarted: ${err.message}`),
    );

    // FIX #2 : retourner avec les champs calculés attendus par enrichWithComputedFields
    return this.enrichWithComputedFields({
      ...inspection,
      medias: [],
      consent: null,
    });
  }

  async uploadMedia(
    inspectionId: string,
    typeMedia: TypeMediaInspection,
    file: Buffer,
    mimeType: string,
    userId: number,
  ): Promise<any> {
    const inspection = await this.assertOwnershipById(inspectionId, userId);

    if (
      inspection.statut === StatutPreTripInspection.VALIDATED ||
      inspection.statut === StatutPreTripInspection.REJECTED
    ) {
      throw new BadRequestException(
        `Cette fiche est ${inspection.statut} et ne peut plus être modifiée.`,
      );
    }
    if (!mimeType.startsWith('image/')) {
      throw new BadRequestException('Seuls les fichiers image sont acceptés.');
    }

    const hashSha256 = this.computeHash(file);
    const exif = await this.extractExifMetadata(file);

    const antiFraud = await this.runAntiFraudChecks(inspectionId, hashSha256, exif);
    if (!antiFraud.valid) {
      this.logger.warn(
        `Anti-fraude rejet ${inspectionId}/${typeMedia} : ${antiFraud.reasons.join(', ')}`,
      );
      throw new BadRequestException(`Photo refusée : ${antiFraud.reasons.join(', ')}`);
    }

    const cheminFichier = await this.saveMediaFile(inspectionId, typeMedia, file, mimeType);

    const media = await this.prisma.preTripInspectionMedia.upsert({
      where: { inspectionId_typeMedia: { inspectionId, typeMedia } },
      create: {
        inspectionId,
        typeMedia,
        cheminFichier,
        mimeType,
        tailleFichier: file.length,
        hashSha256,
        latitude: exif.latitude,
        longitude: exif.longitude,
        precisionGps: exif.precisionGps,
        timestampPhoto: exif.timestampPhoto,
        validatedByServer: true,
      },
      update: {
        cheminFichier,
        mimeType,
        tailleFichier: file.length,
        hashSha256,
        latitude: exif.latitude,
        longitude: exif.longitude,
        precisionGps: exif.precisionGps,
        timestampPhoto: exif.timestampPhoto,
        validatedByServer: true,
      },
    });

    await this.prisma.preTripInspection.update({
      where: { id: inspectionId },
      data: { statut: StatutPreTripInspection.IN_PROGRESS },
    });
    await this.updateCurrentStep(inspectionId);

    this.logger.log(`Média ${typeMedia} uploadé pour inspection ${inspectionId}`);
    return media;
  }

  async submitConsent(
    input: SubmitConsentInput,
    userId: number,
    ipAdresse?: string,
    userAgent?: string,
  ): Promise<any> {
    await this.assertOwnershipById(input.inspectionId, userId);

    const allClauses = [
      input.vehiculeVerifie,
      input.photosReelles,
      input.codeRoute,
      input.conduiteResponsable,
      input.suiviGps,
      input.scoringConduite,
      input.responsabiliteNegligence,
      input.apteAConduire,
    ];
    if (!allClauses.every(Boolean)) {
      throw new BadRequestException('Toutes les clauses doivent être acceptées individuellement.');
    }
    if (!input.acceptationGlobale) {
      throw new BadRequestException("La case 'J'accepte toutes les conditions' est obligatoire.");
    }
    if (input.versionConditions !== CURRENT_CONSENT_VERSION) {
      throw new BadRequestException(
        `Version invalide. Attendu : ${CURRENT_CONSENT_VERSION}, reçu : ${input.versionConditions}`,
      );
    }

    const clausesData = {
      vehicule_verifie: input.vehiculeVerifie,
      photos_reelles: input.photosReelles,
      code_route: input.codeRoute,
      conduite_responsable: input.conduiteResponsable,
      suivi_gps: input.suiviGps,
      scoring_conduite: input.scoringConduite,
      responsabilite_negligence: input.responsabiliteNegligence,
      apte_a_conduire: input.apteAConduire,
      acceptation_globale: input.acceptationGlobale,
    };

    await this.prisma.preTripConsent.upsert({
      where: { inspectionId: input.inspectionId },
      create: {
        inspectionId: input.inspectionId,
        versionConditions: input.versionConditions,
        clausesAcceptees: clausesData,
        ipAdresse: ipAdresse ?? null,
        userAgent: userAgent ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      },
      update: {
        versionConditions: input.versionConditions,
        clausesAcceptees: clausesData,
        ipAdresse: ipAdresse ?? null,
        userAgent: userAgent ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        dateAcceptation: new Date(),
      },
    });

    await this.prisma.preTripInspection.update({
      where: { id: input.inspectionId },
      data: { etapeCourante: EtapeInspection.CONDITIONS },
    });

    // FIX #3 : retourner l'inspection complète (pas juste le consent)
    // car le resolver GraphQL attend PreTripInspection
    const updated = await this.prisma.preTripInspection.findUnique({
      where: { id: input.inspectionId },
      include: FULL_INSPECTION_INCLUDE,
    });

    this.logger.log(`Consentement signé pour inspection ${input.inspectionId}`);
    return this.enrichWithComputedFields(updated);
  }

  async validateAndStartMission(
    input: ValidateInspectionInput,
    userId: number,
  ): Promise<any> {
    const inspection = await this.assertOwnershipById(input.inspectionId, userId);

    if (inspection.statut === StatutPreTripInspection.VALIDATED) {
      throw new ConflictException('Cette inspection est déjà validée.');
    }
    if (inspection.statut === StatutPreTripInspection.REJECTED) {
      throw new BadRequestException('Cette inspection a été rejetée.');
    }

    const validation = await this.performFinalValidation(input.inspectionId);

    if (!validation.valid) {
      await this.prisma.preTripInspection.update({
        where: { id: input.inspectionId },
        data: {
          statut: StatutPreTripInspection.REJECTED,
          motifRejet: validation.reasons.join(' | '),
        },
      });
      this.logger.warn(
        `Inspection ${input.inspectionId} rejetée : ${validation.reasons.join(', ')}`,
      );
      this.notifyAgentInspectionRejected(input.inspectionId, validation.reasons).catch(
        (err) => this.logger.warn(`notifyAgentInspectionRejected: ${err.message}`),
      );

      // FIX #4 : retourner l'inspection rejetée pour que GraphQL puisse la sérialiser
      const rejected = await this.prisma.preTripInspection.findUnique({
        where: { id: input.inspectionId },
        include: FULL_INSPECTION_INCLUDE,
      });
      return this.enrichWithComputedFields(rejected);
    }

    const reservation = await this.prisma.reservationMission.findUnique({
      where: { id: inspection.reservationId },
      select: { missionId: true },
    });
    if (!reservation) {
      throw new NotFoundException('Réservation associée introuvable.');
    }

    const [updatedInspection] = await this.prisma.$transaction([
      this.prisma.preTripInspection.update({
        where: { id: input.inspectionId },
        data: {
          statut: StatutPreTripInspection.VALIDATED,
          etapeCourante: EtapeInspection.TERMINEE,
          dateValidation: new Date(),
          latitudeFin: input.latitudeFin ?? null,
          longitudeFin: input.longitudeFin ?? null,
        },
        include: FULL_INSPECTION_INCLUDE,
      }),
      this.prisma.mission.update({
        where: { id: reservation.missionId },
        data: { statut: 'EN_COURS' },
      }),
    ]);

    this.logger.log(
      `Mission ${reservation.missionId} démarrée via inspection ${input.inspectionId}`,
    );

    this.notifyMissionStarted(
      input.inspectionId,
      reservation.missionId,
      updatedInspection.adherentId,
    ).catch((err) => this.logger.warn(`notifyMissionStarted: ${err.message}`));

    return this.enrichWithComputedFields(updatedInspection);
  }

  // ============================================================
  // QUERIES
  // ============================================================

  async getInspectionByReservation(
    reservationId: string,
    userId: number,
    role: Role,
  ): Promise<any | null> {
    const inspection = await this.prisma.preTripInspection.findFirst({
      where: { reservationId },
      include: FULL_INSPECTION_INCLUDE, // ← FIX #1
    });

    if (!inspection) return null;

    this.assertOwnershipByRole(inspection, userId, role);
    return this.enrichWithComputedFields(inspection);
  }

  async getInspectionDetails(
    inspectionId: string,
    userId: number,
    role: Role,
  ): Promise<any> {
    const inspection = await this.prisma.preTripInspection.findUnique({
      where: { id: inspectionId },
      include: FULL_INSPECTION_INCLUDE, // ← FIX #1
    });

    if (!inspection) throw new NotFoundException('Inspection introuvable.');

    this.assertOwnershipByRole(inspection, userId, role);
    return this.enrichWithComputedFields(inspection);
  }

  async listInspections(
    filter: InspectionFilterInput | null | undefined,
    userId: number,
    role: Role,
  ): Promise<any[]> {
    const where: any = {};

    if (filter?.statut) where.statut = filter.statut;
    if (filter?.reservationId) where.reservationId = filter.reservationId;

    // FIX #5 : filtre correct pour Prisma (relation imbriquée)
    if (role === Role.ADHERENT) {
      where.adherent = { is: { userId } };
    }

    const inspections = await this.prisma.preTripInspection.findMany({
      where,
      include: FULL_INSPECTION_INCLUDE, // ← FIX #1
      orderBy: { dateDebut: 'desc' },
    });

    return inspections.map((i) => this.enrichWithComputedFields(i));
  }

  // ============================================================
  // NOTIFICATIONS — toutes async fire-and-forget
  // ============================================================

  private async notifyAgentInspectionStarted(
    reservationId: string,
    inspectionId: string,
  ): Promise<void> {
    const reservation = await this.prisma.reservationMission.findUnique({
      where: { id: reservationId },
      include: {
        mission: { include: { agent: { include: { user: true } } } },
        adherent: { include: { user: true } },
      },
    });

    if (!reservation?.mission?.agent?.user) {
      this.logger.debug(`Pas d'agent assigné à la mission ${reservation?.missionId}`);
      return;
    }

    await this.emailService.sendMail({
      to: reservation.mission.agent.user.email,
      subject: 'Inspection démarrée',
      html: `<p>Le convoyeur ${reservation.adherent.user.email} a démarré l'inspection pour la mission ${reservation.missionId}.</p>`,
    });

    this.logger.log(`Notification agent envoyée pour inspection ${inspectionId}`);
  }

  private async notifyAgentInspectionRejected(
    inspectionId: string,
    reasons: string[],
  ): Promise<void> {
    const inspection = await this.prisma.preTripInspection.findUnique({
      where: { id: inspectionId },
      include: {
        reservation: {
          include: { mission: { include: { agent: { include: { user: true } } } } },
        },
        adherent: { include: { user: true } },
      },
    });

    if (!inspection?.reservation?.mission?.agent?.user) return;

    await this.emailService.sendMail({
      to: inspection.reservation.mission.agent.user.email,
      subject: 'Inspection rejetée',
      html: `<p>Inspection rejetée pour ${inspection.adherent.user.email}.</p><p>Raisons : ${reasons.join(', ')}</p>`,
    });

    this.logger.log(`Notification rejet envoyée pour inspection ${inspectionId}`);
  }

  private async notifyMissionStarted(
    inspectionId: string,
    missionId: string,
    adherentId: number,
  ): Promise<void> {
    const adherent = await this.prisma.adherent.findUnique({
      where: { id: adherentId },
      include: { user: true },
    });
    if (adherent?.user?.email) {
      await this.emailService.sendMail({
        to: adherent.user.email,
        subject: 'Mission démarrée avec succès',
        html: `<p>Votre inspection a été validée. La mission ${missionId} est en cours.</p>`,
      });
    }

    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: { agent: { include: { user: true } } },
    });
    if (mission?.agent?.user) {
      await this.emailService.sendMail({
        to: mission.agent.user.email,
        subject: 'Mission démarrée',
        html: `<p>La mission ${missionId} vient de démarrer. Suivi GPS actif.</p>`,
      });
    }
  }

  // ============================================================
  // ANTI-FRAUDE
  // ============================================================

  private async runAntiFraudChecks(
    inspectionId: string,
    hashSha256: string,
    exif: ExifMetadata,
  ): Promise<AntiFraudResult> {
    const reasons: string[] = [];

    if (!this.checkGpsPresence(exif)) {
      reasons.push('GPS manquantes ou invalides dans la photo.');
    }
    if (!this.checkPhotoTimestamp(exif.timestampPhoto)) {
      reasons.push(`Photo trop ancienne (> ${MAX_PHOTO_AGE_MINUTES} min).`);
    }
    if (await this.isHashAlreadyUsed(hashSha256)) {
      reasons.push('Cette photo a déjà été utilisée.');
    }
    if (!(await this.checkGpsCoherence(inspectionId, exif.latitude, exif.longitude))) {
      reasons.push(`Position GPS incohérente (> ${MAX_GPS_DRIFT_METERS}m).`);
    }

    return { valid: reasons.length === 0, reasons };
  }

  private checkPhotoTimestamp(timestampPhoto: Date): boolean {
    const ageMinutes = Math.abs(Date.now() - timestampPhoto.getTime()) / 60_000;
    return ageMinutes <= MAX_PHOTO_AGE_MINUTES;
  }

  private async isHashAlreadyUsed(hash: string): Promise<boolean> {
    const existing = await this.prisma.preTripInspectionMedia.findFirst({
      where: { hashSha256: hash },
    });
    return !!existing;
  }

  private async checkGpsCoherence(
    inspectionId: string,
    newLat: number,
    newLng: number,
  ): Promise<boolean> {
    const existing = await this.prisma.preTripInspectionMedia.findMany({
      where: { inspectionId },
      select: { latitude: true, longitude: true },
    });
    if (existing.length === 0) return true;

    const avgLat = existing.reduce((s, m) => s + m.latitude, 0) / existing.length;
    const avgLng = existing.reduce((s, m) => s + m.longitude, 0) / existing.length;

    return this.calculateDistance(newLat, newLng, avgLat, avgLng) <= MAX_GPS_DRIFT_METERS;
  }

  private checkGpsPresence(exif: ExifMetadata): boolean {
    const { latitude, longitude } = exif;
    if (latitude == null || latitude < -90 || latitude > 90) return false;
    if (longitude == null || longitude < -180 || longitude > 180) return false;
    return true;
  }

  // ============================================================
  // UTILITAIRES
  // ============================================================

  private computeHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private async extractExifMetadata(buffer: Buffer): Promise<ExifMetadata> {
    let exif: any;
    try {
      exif = await exifr.parse(buffer, {
        gps: true,
        pick: ['latitude', 'longitude', 'GPSHPositioningError', 'DateTimeOriginal', 'CreateDate'],
      });
    } catch (err: any) {
      throw new BadRequestException(`Échec de lecture EXIF : ${err.message}`);
    }

    if (!exif) {
      throw new BadRequestException('Aucune métadonnée EXIF trouvée dans la photo.');
    }

    const timestampPhoto = exif.DateTimeOriginal ?? exif.CreateDate ?? null;
    if (!timestampPhoto) {
      throw new BadRequestException('Timestamp EXIF manquant. Prenez la photo en temps réel.');
    }

    return {
      latitude: exif.latitude,
      longitude: exif.longitude,
      precisionGps: exif.GPSHPositioningError ?? null,
      timestampPhoto: new Date(timestampPhoto),
    };
  }

  private async saveMediaFile(
    inspectionId: string,
    typeMedia: TypeMediaInspection,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const folderPath = join(process.cwd(), UPLOAD_BASE_PATH, inspectionId);
    if (!existsSync(folderPath)) {
      await fs.mkdir(folderPath, { recursive: true });
    }

    const ext = mimeType.split('/')[1] || 'jpg';
    const fileName = `${typeMedia}_${Date.now()}.${ext}`;
    await fs.writeFile(join(folderPath, fileName), buffer);

    return `/uploads/pretrip/${inspectionId}/${fileName}`;
  }

  private calculateDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number,
  ): number {
    const R = 6_371_000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ============================================================
  // VALIDATION FINALE
  // ============================================================

  private async performFinalValidation(
    inspectionId: string,
  ): Promise<AntiFraudResult> {
    const reasons: string[] = [];

    const inspection = await this.prisma.preTripInspection.findUnique({
      where: { id: inspectionId },
      include: { medias: true, consent: true },
    });
    if (!inspection) return { valid: false, reasons: ['Inspection introuvable.'] };

    // Photos
    const presentTypes = new Set(inspection.medias.map((m) => m.typeMedia));
    const missingTypes = ALL_REQUIRED_MEDIA_TYPES.filter((t) => !presentTypes.has(t));
    if (missingTypes.length > 0) {
      reasons.push(`Photos manquantes : ${missingTypes.join(', ')}`);
    }
    const notValidated = inspection.medias.filter((m) => !m.validatedByServer);
    if (notValidated.length > 0) {
      reasons.push(`${notValidated.length} photo(s) non validée(s).`);
    }

    // Consentement
    if (!inspection.consent) {
      reasons.push('Consentement non signé.');
    } else {
      const clauses = inspection.consent.clausesAcceptees as Record<string, boolean>;
      const required = [
        'vehicule_verifie', 'photos_reelles', 'code_route',
        'conduite_responsable', 'suivi_gps', 'scoring_conduite',
        'responsabilite_negligence', 'apte_a_conduire', 'acceptation_globale',
      ];
      const missing = required.filter((k) => !clauses[k]);
      if (missing.length > 0) {
        reasons.push(`Clauses manquantes : ${missing.join(', ')}`);
      }
    }

    // Cohérence GPS
    if (inspection.medias.length >= 2) {
      const coords = inspection.medias.map((m) => ({ lat: m.latitude, lng: m.longitude }));
      const avgLat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
      const avgLng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;
      const maxDist = Math.max(
        ...coords.map((c) => this.calculateDistance(c.lat, c.lng, avgLat, avgLng)),
      );
      if (maxDist > MAX_GPS_DRIFT_METERS) {
        reasons.push(`GPS incohérents (écart ${Math.round(maxDist)}m > ${MAX_GPS_DRIFT_METERS}m).`);
      }
    }

    // Durée
    const dureeMin = (Date.now() - inspection.dateDebut.getTime()) / 60_000;
    if (dureeMin > MAX_INSPECTION_DURATION_MINUTES) {
      reasons.push(`Inspection trop longue (${Math.round(dureeMin)}min > ${MAX_INSPECTION_DURATION_MINUTES}min).`);
    }

    return { valid: reasons.length === 0, reasons };
  }

  private async updateCurrentStep(inspectionId: string): Promise<void> {
    const inspection = await this.prisma.preTripInspection.findUnique({
      where: { id: inspectionId },
      include: { medias: true, consent: true },
    });
    if (!inspection) return;

    const presentTypes = new Set(inspection.medias.map((m) => m.typeMedia));
    let nextStep: EtapeInspection = EtapeInspection.EXTERIEUR;

    const ordered: EtapeInspection[] = [
      EtapeInspection.EXTERIEUR,
      EtapeInspection.INTERIEUR,
      EtapeInspection.TABLEAU_BORD,
      EtapeInspection.DOCUMENTS,
      EtapeInspection.IDENTITE,
    ];

    for (const step of ordered) {
      const required = MEDIA_TYPES_BY_STEP[step];
      if (!required.every((t) => presentTypes.has(t))) {
        nextStep = step;
        break;
      }
      nextStep = EtapeInspection.CONDITIONS;
    }

    if (nextStep === EtapeInspection.CONDITIONS && inspection.consent) {
      nextStep = EtapeInspection.TERMINEE;
    }

    await this.prisma.preTripInspection.update({
      where: { id: inspectionId },
      data: { etapeCourante: nextStep },
    });
  }

  // FIX #3 : medias et consent toujours présents grâce à FULL_INSPECTION_INCLUDE
  private enrichWithComputedFields(inspection: any): any {
    const medias = inspection.medias ?? [];
    const consent = inspection.consent ?? null;

    const nombreMediasUploades = medias.length;
    const peutEtreValidee =
      nombreMediasUploades === ALL_REQUIRED_MEDIA_TYPES.length &&
      consent !== null &&
      (consent.clausesAcceptees as Record<string, boolean>)?.acceptation_globale === true;

    return { ...inspection, nombreMediasUploades, peutEtreValidee };
  }

  // ============================================================
  // HELPERS DE SÉCURITÉ
  // ============================================================

  private async assertOwnershipById(
    inspectionId: string,
    userId: number,
  ): Promise<any> {
    const inspection = await this.prisma.preTripInspection.findUnique({
      where: { id: inspectionId },
      // FIX #6 : select minimal pour la vérification, pas de user nécessaire ici
      include: { adherent: { select: { userId: true, id: true } } },
    });

    if (!inspection) throw new NotFoundException('Inspection introuvable.');
    if (inspection.adherent.userId !== userId) {
      throw new ForbiddenException("Cette inspection ne vous appartient pas.");
    }
    return inspection;
  }

  private assertOwnershipByRole(
    inspection: { adherent: { userId: number } },
    userId: number,
    role: Role,
  ): void {
    if (role === Role.AGENT || role === Role.ADMIN) return;
    if (inspection.adherent.userId !== userId) {
      throw new ForbiddenException("Cette inspection ne vous appartient pas.");
    }
  }
}