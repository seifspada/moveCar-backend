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
import { PreTripInspection } from './entities/pretrip-inspection.entities';
import { Role } from '../../auth/enum/role.enum';

// Services externes intégrés
import { MissionsService } from '../missions/missions.service';
import { EmailService } from '../email/email.service';
import { AlertesService } from '../alertes/alertes.service';

// ============================================
// CONSTANTES & TYPES INTERNES
// ============================================
const MAX_PHOTO_AGE_MINUTES = 10;
const MAX_GPS_DRIFT_METERS = 100;
const MAX_INSPECTION_DURATION_MINUTES = 60;
const CURRENT_CONSENT_VERSION = 'v1.0';
const UPLOAD_BASE_PATH = 'uploads/pretrip';

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

// ============================================
// SERVICE PRINCIPAL
// ============================================
@Injectable()
export class PreTripInspectionService {
  private readonly logger = new Logger(PreTripInspectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly missionsService: MissionsService,
    private readonly emailService: EmailService,
    private readonly alerteService: AlertesService,
  ) {}

  // ============================================================
  // MÉTHODES PUBLIQUES - MUTATIONS (Adhérent uniquement)
  // ============================================================

  /**
   * 1. Démarre une fiche pour une réservation confirmée.
   */
  async startInspection(
    input: StartInspectionInput,
    userId: number,
  ): Promise<any> {
    const adherent = await this.prisma.adherent.findUnique({
      where: { userId },
    });
    if (!adherent) {
      throw new ForbiddenException("Seul un adhérent peut démarrer une inspection.");
    }

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
        `La réservation doit être au statut CONFIRMED_BY_ADHERENT. Statut actuel : ${reservation.statut}`,
      );
    }
    if (reservation.preTripInspection) {
      throw new ConflictException("Une fiche d'inspection existe déjà pour cette réservation.");
    }

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

    // Notification : alerter l'agent que l'inspection démarre
    await this.notifyAgentInspectionStarted(input.reservationId, inspection.id);

    return inspection;
  }

  /**
   * 2. Upload + validation anti-fraude d'une photo.
   */
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
        `Anti-fraude rejet pour ${inspectionId}/${typeMedia} : ${antiFraud.reasons.join(', ')}`,
      );
      throw new BadRequestException(`Photo refusée : ${antiFraud.reasons.join(', ')}`);
    }

    const cheminFichier = await this.saveMediaFile(inspectionId, typeMedia, file, mimeType);

    const media = await this.prisma.preTripInspectionMedia.upsert({
      where: {
        inspectionId_typeMedia: {
          inspectionId,
          typeMedia,
        },
      },
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

  /**
   * 3. Enregistrement du consentement (clauses signées).
   */
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
        `Version de conditions invalide. Attendu : ${CURRENT_CONSENT_VERSION}, reçu : ${input.versionConditions}`,
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

    const consent = await this.prisma.preTripConsent.upsert({
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

    this.logger.log(`Consentement ${input.versionConditions} signé pour inspection ${input.inspectionId}`);
    return consent;
  }

  /**
   * 4. Validation finale + démarrage de la mission.
   */
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
      this.logger.warn(`Inspection ${input.inspectionId} rejetée : ${validation.reasons.join(', ')}`);

      // Notification : alerter l'agent qu'une inspection a été rejetée
      await this.notifyAgentInspectionRejected(input.inspectionId, validation.reasons);

      return {
        success: false,
        message: 'La validation a échoué.',
        reasons: validation.reasons,
        inspection: null,
        missionId: null,
      };
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
        include: { medias: true, consent: true },
      }),
      this.prisma.mission.update({
        where: { id: reservation.missionId },
        data: { statut: 'EN_COURS' },
      }),
    ]);

    this.logger.log(`Mission ${reservation.missionId} démarrée via inspection ${input.inspectionId}`);

    // Notifications post-validation
    await this.notifyMissionStarted(
      input.inspectionId,
      reservation.missionId,
      updatedInspection.adherentId,
    );

    return {
      success: true,
      message: 'Mission démarrée avec succès.',
      reasons: null,
      inspection: this.enrichWithComputedFields(updatedInspection),
      missionId: reservation.missionId,
    };
  }

  // ============================================================
  // MÉTHODES PUBLIQUES - QUERIES (Adhérent + Agent + Admin)
  // ============================================================

  async getInspectionByReservation(
    reservationId: string,
    userId: number,
    role: Role,
  ): Promise<any | null> {
    const inspection = await this.prisma.preTripInspection.findFirst({
      where: { reservationId },
      include: {
        adherent: true,
        medias: true,
        consent: true,
        reservation: true,
      },
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
      include: {
        adherent: true,
        medias: true,
        consent: true,
        reservation: true,
      },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection introuvable.');
    }

    this.assertOwnershipByRole(inspection, userId, role);
    return this.enrichWithComputedFields(inspection);
  }

  async listInspections(
    filter: InspectionFilterInput | null | undefined,
    userId: number,
    role: Role,
  ): Promise<any[]> {
    const where: any = {};

    if (filter?.statut) {
      where.statut = filter.statut;
    }

    if (filter?.reservationId) {
      where.reservationId = filter.reservationId;
    }

    if (role === Role.ADHERENT) {
      where.adherent = { userId };
    }

    const inspections = await this.prisma.preTripInspection.findMany({
      where,
      include: {
        adherent: true,
        medias: true,
        consent: true,
        reservation: true,
      },
      orderBy: { dateDebut: 'desc' },
    });

    return inspections.map((i) => this.enrichWithComputedFields(i));
  }

  // ============================================================
  // NOTIFICATIONS (Email + Alertes Agent)
  // ============================================================

  /**
   * Alerte l'agent de mission qu'une inspection vient de démarrer.
   * Tous les appels sont try/catch pour ne jamais bloquer le flux principal.
   */
  private async notifyAgentInspectionStarted(
    reservationId: string,
    inspectionId: string,
  ): Promise<void> {
    try {
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

      const agentEmail = reservation.mission.agent.user.email;
      const adherentEmail = reservation.adherent.user.email;

      // Email de notification à l'agent
      await this.emailService.sendMail({
        to: agentEmail,
        subject: 'Inspection démarrée',
        html: `<p>Le convoyeur ${adherentEmail} a démarré l'inspection pour la mission ${reservation.missionId}.</p>`,
      });

      this.logger.log(`Notification agent envoyée pour inspection ${inspectionId}`);
    } catch (err: any) {
      this.logger.warn(`Échec notification agent (start) : ${err.message}`);
    }
  }

  /**
   * Alerte l'agent qu'une inspection a été rejetée par anti-fraude.
   */
  private async notifyAgentInspectionRejected(
    inspectionId: string,
    reasons: string[],
  ): Promise<void> {
    try {
      const inspection = await this.prisma.preTripInspection.findUnique({
        where: { id: inspectionId },
        include: {
          reservation: {
            include: {
              mission: { include: { agent: { include: { user: true } } } },
            },
          },
          adherent: { include: { user: true } },
        },
      });

      if (!inspection?.reservation?.mission?.agent?.user) {
        return;
      }

      await this.emailService.sendMail({
        to: inspection.reservation.mission.agent.user.email,
        subject: 'Inspection rejetée',
        html: `<p>Inspection rejetée pour ${inspection.adherent.user.email}.</p><p>Raisons : ${reasons.join(', ')}</p>`,
      });

      this.logger.log(`Notification rejet envoyée à l'agent pour inspection ${inspectionId}`);
    } catch (err: any) {
      this.logger.warn(`Échec notification agent (reject) : ${err.message}`);
    }
  }

  /**
   * Notifications post-démarrage mission :
   * - Email de confirmation au convoyeur
   * - Alerte agent que la mission est en cours
   */
  private async notifyMissionStarted(
    inspectionId: string,
    missionId: string,
    adherentId: number,
  ): Promise<void> {
    // Email au convoyeur
    try {
      const adherent = await this.prisma.adherent.findUnique({
        where: { id: adherentId },
        include: { user: true },
      });

      if (adherent?.user?.email) {
        await this.emailService.sendMail({
          to: adherent.user.email,
          subject: 'Mission démarrée avec succès',
          html: `<p>Votre inspection a été validée.</p><p>La mission ${missionId} est maintenant en cours.</p><p>Bon courage et bonne route.</p>`,
        });
        this.logger.log(`Email confirmation envoyé à ${adherent.user.email}`);
      }
    } catch (err: any) {
      this.logger.warn(`Échec envoi email convoyeur : ${err.message}`);
    }

    // Alerte agent
    try {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        include: { agent: { include: { user: true } } },
      });

      if (mission?.agent?.user) {
        await this.emailService.sendMail({
          to: mission.agent.user.email,
          subject: 'Mission démarrée',
          html: `<p>La mission ${missionId} vient de démarrer.</p><p>Suivi GPS actif.</p>`,
        });
        this.logger.log(`Notification mission démarrée envoyée à l'agent ${mission.agent.user.email}`);
      }
    } catch (err: any) {
      this.logger.warn(`Échec alerte agent (mission start) : ${err.message}`);
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
      reasons.push(`Photo trop ancienne (> ${MAX_PHOTO_AGE_MINUTES} min). Reprenez-la maintenant.`);
    }
    if (await this.isHashAlreadyUsed(hashSha256)) {
      reasons.push('Cette photo a déjà été utilisée. Reprenez une nouvelle photo.');
    }
    if (!(await this.checkGpsCoherence(inspectionId, exif.latitude, exif.longitude))) {
      reasons.push(`Position GPS incohérente avec les autres photos (> ${MAX_GPS_DRIFT_METERS}m).`);
    }

    return { valid: reasons.length === 0, reasons };
  }

  private checkPhotoTimestamp(timestampPhoto: Date): boolean {
    const ageMs = Math.abs(Date.now() - timestampPhoto.getTime());
    const ageMinutes = ageMs / 1000 / 60;
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

    const distance = this.calculateDistance(newLat, newLng, avgLat, avgLng);
    return distance <= MAX_GPS_DRIFT_METERS;
  }

  private checkGpsPresence(exif: ExifMetadata): boolean {
    const { latitude, longitude } = exif;
    if (latitude === undefined || latitude === null) return false;
    if (longitude === undefined || longitude === null) return false;
    if (latitude < -90 || latitude > 90) return false;
    if (longitude < -180 || longitude > 180) return false;
    return true;
  }

  // ============================================================
  // UTILITAIRES
  // ============================================================

  private computeHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private async extractExifMetadata(buffer: Buffer): Promise<ExifMetadata> {
    try {
      const exif: any = await exifr.parse(buffer, {
        gps: true,
        pick: ['latitude', 'longitude', 'GPSHPositioningError', 'DateTimeOriginal', 'CreateDate'],
      });

      if (!exif) {
        throw new BadRequestException('Aucune métadonnée EXIF trouvée dans la photo.');
      }

      const timestampPhoto = exif.DateTimeOriginal ?? exif.CreateDate ?? null;

      if (!timestampPhoto) {
        throw new BadRequestException('Timestamp EXIF manquant. La photo doit être prise en temps réel.');
      }

      return {
        latitude: exif.latitude,
        longitude: exif.longitude,
        precisionGps: exif.GPSHPositioningError ?? null,
        timestampPhoto: new Date(timestampPhoto),
      };
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`Échec de lecture EXIF : ${err.message}`);
    }
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
    const filePath = join(folderPath, fileName);

    await fs.writeFile(filePath, buffer);

    return `/uploads/pretrip/${inspectionId}/${fileName}`;
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // ============================================================
  // VALIDATION & HELPERS
  // ============================================================

  private async performFinalValidation(inspectionId: string): Promise<AntiFraudResult> {
    const reasons: string[] = [];

    const inspection = await this.prisma.preTripInspection.findUnique({
      where: { id: inspectionId },
      include: { medias: true, consent: true },
    });

    if (!inspection) {
      return { valid: false, reasons: ['Inspection introuvable.'] };
    }

    const presentTypes = new Set(inspection.medias.map((m) => m.typeMedia));
    const missingTypes = ALL_REQUIRED_MEDIA_TYPES.filter((t) => !presentTypes.has(t));
    if (missingTypes.length > 0) {
      reasons.push(`Photos manquantes : ${missingTypes.join(', ')}`);
    }

    const notValidated = inspection.medias.filter((m) => !m.validatedByServer);
    if (notValidated.length > 0) {
      reasons.push(`${notValidated.length} photo(s) non validée(s) par le serveur.`);
    }

    if (!inspection.consent) {
      reasons.push('Consentement non signé.');
    } else {
      const clauses = inspection.consent.clausesAcceptees as Record<string, boolean>;
      const requiredKeys = [
        'vehicule_verifie',
        'photos_reelles',
        'code_route',
        'conduite_responsable',
        'suivi_gps',
        'scoring_conduite',
        'responsabilite_negligence',
        'apte_a_conduire',
        'acceptation_globale',
      ];
      const missingClauses = requiredKeys.filter((k) => !clauses[k]);
      if (missingClauses.length > 0) {
        reasons.push(`Clauses non acceptées : ${missingClauses.join(', ')}`);
      }
    }

    if (inspection.medias.length >= 2) {
      const coords = inspection.medias.map((m) => ({ lat: m.latitude, lng: m.longitude }));
      const avgLat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
      const avgLng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;

      const maxDistance = Math.max(
        ...coords.map((c) => this.calculateDistance(c.lat, c.lng, avgLat, avgLng)),
      );

      if (maxDistance > MAX_GPS_DRIFT_METERS) {
        reasons.push(
          `Positions GPS incohérentes (écart max ${Math.round(maxDistance)}m > ${MAX_GPS_DRIFT_METERS}m).`,
        );
      }
    }

    const dureeMs = Date.now() - inspection.dateDebut.getTime();
    const dureeMin = dureeMs / 1000 / 60;
    if (dureeMin > MAX_INSPECTION_DURATION_MINUTES) {
      reasons.push(
        `Inspection trop longue (${Math.round(dureeMin)}min > ${MAX_INSPECTION_DURATION_MINUTES}min).`,
      );
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
      const requiredForStep = MEDIA_TYPES_BY_STEP[step];
      const allDone = requiredForStep.every((t) => presentTypes.has(t));
      if (!allDone) {
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

  private enrichWithComputedFields(inspection: any): any {
    const nombreMediasUploades = inspection.medias?.length ?? 0;
    const consent = inspection.consent;

    const peutEtreValidee =
      nombreMediasUploades === ALL_REQUIRED_MEDIA_TYPES.length &&
      consent !== null &&
      consent !== undefined &&
      (consent.clausesAcceptees as Record<string, boolean>)?.acceptation_globale === true;

    return {
      ...inspection,
      nombreMediasUploades,
      peutEtreValidee,
    };
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
      include: { adherent: { select: { userId: true, id: true } } },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection introuvable.');
    }
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
    if (role === Role.AGENT || role === Role.ADMIN) {
      return;
    }

    if (inspection.adherent.userId !== userId) {
      throw new ForbiddenException("Cette inspection ne vous appartient pas.");
    }
  }
}