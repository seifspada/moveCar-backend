import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateLocationInput, CompleteMissionInput } from './dto';
import {
  ActiveMissionMap,
  MissionTracking,
  MissionCompletion,
} from './entities/mission-tracking.entity';

// ============================================
// CONSTANTES & CONFIGURATION
// ============================================
const MAX_GPS_DEVIATION_METERS = 500; // 500m max de déviation admissible
const MAX_LOCATION_AGE_SECONDS = 60; // pas plus de 60s de délai
const MIN_LOCATIONS_FOR_COMPLETION = 5; // au moins 5 points GPS

interface GpsPoint {
  latitude: number;
  longitude: number;
}

@Injectable()
export class MissionTrackingService {
  private readonly logger = new Logger(MissionTrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // MÉTHODES PUBLIQUES - SUIVI EN TEMPS RÉEL
  // ============================================================

  /**
   * Enregistre une mise à jour de position GPS pour une mission en cours
   */
  async updateLocation(
    input: UpdateLocationInput,
    userId: number,
  ): Promise<MissionTracking> {
    // Vérifier que la mission existe et est EN_COURS
    const mission = await this.prisma.mission.findUnique({
      where: { id: input.missionId },
      include: {
        reservations: {
          where: { statut: 'CONFIRMED_BY_ADHERENT' },
          include: { adherent: true },
        },
        sessions: {
          where: { statut: 'EN_COURS' },
          orderBy: { dateDebut: 'desc' },
          take: 1,
        },
      },
    });

    if (!mission) {
      throw new NotFoundException(`Mission ${input.missionId} introuvable.`);
    }

    if (mission.statut !== 'EN_COURS') {
      throw new BadRequestException(
        `La mission doit être EN_COURS. Statut actuel : ${mission.statut}`,
      );
    }

    // Vérifier que l'utilisateur est le convoyeur (adhérent) de cette mission
    const reservation = mission.reservations[0];
    if (!reservation || reservation.adherent.userId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à mettre à jour la position pour cette mission.",
      );
    }

    const session = mission.sessions[0];
    if (!session) {
      throw new BadRequestException(
        'Aucune session en cours trouvee pour cette mission.',
      );
    }

    // Validation basique du timestamp
    const ageSeconds = (Date.now() - input.timestamp.getTime()) / 1000;
    if (ageSeconds > MAX_LOCATION_AGE_SECONDS) {
      this.logger.warn(
        `Position trop ancienne pour mission ${input.missionId} (${ageSeconds}s)`,
      );
    }

    // Vérifier la cohérence GPS avec les positions précédentes
    const isDeviated = await this.checkGpsDeviation(session.id, {
      latitude: input.latitude,
      longitude: input.longitude,
    });

    // Enregistrer le point GPS
    const tracking = await this.prisma.missionGPSTrack.create({
      data: {
        sessionId: session.id,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
        timestamp: new Date(input.timestamp),
        isDeviated,
        distanceFromRoute: null,
      },
    });

    if (isDeviated) {
      this.logger.warn(
        `Déviation GPS pour mission ${input.missionId}`,
      );
      // Notifier l'agent en temps réel si besoin
      await this.notifyAgentDeviation(input.missionId);
    }

    this.logger.log(
      `Position enregistrée pour mission ${input.missionId}: (${input.latitude}, ${input.longitude})`,
    );

    return tracking as any as MissionTracking;
  }

  /**
   * Récupère toutes les positions GPS d'une mission
   */
  async getTrackingHistory(
    missionId: string,
    userId: number,
  ): Promise<MissionTracking[]> {
    // Vérifier l'accès à la mission
    await this.assertMissionAccess(missionId, userId);

    const trackings = await this.prisma.missionGPSTrack.findMany({
      where: { session: { missionId } },
      orderBy: { timestamp: 'asc' },
    });

    return trackings as any;
  }

  /**
   * Recupere la derniere position de chaque mission en cours pour la carte agent.
   */
  async getActiveMissionsMap(userId: number): Promise<ActiveMissionMap[]> {
    const agent = await this.prisma.agent.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!agent) {
      throw new ForbiddenException('Agent introuvable.');
    }

    const sessions = await this.prisma.missionSession.findMany({
      where: {
        statut: 'EN_COURS',
        mission: {
          statut: 'EN_COURS',
          agentId: agent.id,
        },
      },
      include: {
        gpsHistory: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        mission: {
          include: {
            vehicule: true,
          },
        },
        reservation: {
          include: {
            adherent: true,
          },
        },
      },
      orderBy: { dateDebut: 'desc' },
    });

    return sessions.map((session) => {
      const lastGps = session.gpsHistory[0];

      return {
        missionId: session.missionId,
        sessionId: session.id,
        vehicleName: `${session.mission.vehicule.marqueModele} - ${session.mission.vehicule.immatriculation}`,
        convoyeurName: `${session.reservation.adherent.prenom} ${session.reservation.adherent.nom}`,
        status: session.mission.statut,
        latitude: lastGps?.latitude ?? session.latitudeDebut,
        longitude: lastGps?.longitude ?? session.longitudeDebut,
        accuracy: lastGps?.accuracy ?? null,
        lastGpsAt: lastGps?.timestamp ?? session.dateDebut,
        isDeviated: lastGps?.isDeviated ?? false,
      };
    });
  }

  /**
   * Termine la mission et valide le trajet
   */
  async completeMission(
    input: CompleteMissionInput,
    userId: number,
  ): Promise<MissionCompletion> {
    // Vérifier l'accès à la mission
    await this.assertMissionAccess(input.missionId, userId);

    const mission = await this.prisma.mission.findUnique({
      where: { id: input.missionId },
      include: { reservations: true },
    });

    if (!mission) {
      throw new NotFoundException(`Mission ${input.missionId} introuvable.`);
    }

    if (mission.statut !== 'EN_COURS') {
      throw new BadRequestException(
        `La mission doit être EN_COURS pour être terminée.`,
      );
    }

    // Récupérer tous les points de suivi
    const trackings = await this.prisma.missionGPSTrack.findMany({
      where: { session: { missionId: input.missionId } },
      orderBy: { timestamp: 'asc' },
    });

    // Validation du trajet
    const validTrackings = trackings.filter((t) => t.isDeviated === false);
    const invalidTrackings = trackings.filter((t) => t.isDeviated === true);
    const totalLocations = trackings.length;

    let invalidationReason: string | null = null;
    let maxDeviation = 0;
    let dureeTrajet = 0;

    if (totalLocations < MIN_LOCATIONS_FOR_COMPLETION) {
      invalidationReason = `Nombre insuffisant de positions GPS (${totalLocations} < ${MIN_LOCATIONS_FOR_COMPLETION})`;
    }

    // Calculer écart GPS max et durée
    if (trackings.length > 0) {
      const center = this.calculateCenterPoint(trackings);
      maxDeviation = Math.max(
        ...trackings.map((t) =>
          this.calculateDistance(t.latitude, t.longitude, center.latitude, center.longitude),
        ),
      );

      dureeTrajet = Math.round(
        (trackings[trackings.length - 1].timestamp.getTime() -
          trackings[0].timestamp.getTime()) /
          1000,
      );

      if (invalidTrackings.length > 0 && invalidTrackings.length / totalLocations > 0.3) {
        invalidationReason =
          `Trop de positions GPS incohérentes (${invalidTrackings.length} / ${totalLocations})`;
      }
    }

    // Créer ou mettre à jour le résumé de mission
    const completion = await this.prisma.missionCompletion.upsert({
      where: { missionId: input.missionId },
      create: {
        missionId: input.missionId,
        latitudeFin: input.latitudeFin,
        longitudeFin: input.longitudeFin,
        totalLocations,
        validLocations: validTrackings.length,
        invalidLocations: invalidTrackings.length,
        maxDeviation,
        dureeTrajet,
        completed: !invalidationReason,
        dateCompletion: new Date(),
        invalidationReason,
      },
      update: {
        latitudeFin: input.latitudeFin,
        longitudeFin: input.longitudeFin,
        totalLocations,
        validLocations: validTrackings.length,
        invalidLocations: invalidTrackings.length,
        maxDeviation,
        dureeTrajet,
        completed: !invalidationReason,
        dateCompletion: new Date(),
        invalidationReason,
      },
    });

    // Mettre à jour le statut de la mission
    const newStatut = completion.completed ? 'TERMINEE' : 'PROBLEME_TRAJET';
    await this.prisma.mission.update({
      where: { id: input.missionId },
      data: { statut: newStatut as any },
    });

    this.logger.log(
      `✅ Mission ${input.missionId} terminée. Statut: ${newStatut}. Points GPS: ${totalLocations}`,
    );

    return completion;
  }

  /**
   * Récupère le résumé final d'une mission
   */
  async getMissionCompletion(missionId: string, userId: number): Promise<MissionCompletion | null> {
    // Vérifier l'accès à la mission
    await this.assertMissionAccess(missionId, userId);

    const completion = await this.prisma.missionCompletion.findUnique({
      where: { missionId },
    });

    return completion;
  }

  // ============================================================
  // MÉTHODES PRIVÉES - LOGIQUE GPS
  // ============================================================

  /**
   * Vérifie si une position s'écarte trop des positions précédentes
   */
  private async checkGpsDeviation(
    sessionId: string,
    newPosition: GpsPoint,
  ): Promise<boolean> {
    const existingTrackings = await this.prisma.missionGPSTrack.findMany({
      where: { sessionId, isDeviated: false },
      select: { latitude: true, longitude: true },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    if (existingTrackings.length === 0) {
      return false;
    }

    const avgLat =
      existingTrackings.reduce((sum, t) => sum + t.latitude, 0) /
      existingTrackings.length;
    const avgLng =
      existingTrackings.reduce((sum, t) => sum + t.longitude, 0) /
      existingTrackings.length;

    const distance = this.calculateDistance(
      newPosition.latitude,
      newPosition.longitude,
      avgLat,
      avgLng,
    );

    return distance > MAX_GPS_DEVIATION_METERS;
  }

  /**
   * Calcule le centre géographique d'un ensemble de points
   */
  private calculateCenterPoint(trackings: any[]): GpsPoint {
    const avgLat =
      trackings.reduce((sum, t) => sum + t.latitude, 0) / trackings.length;
    const avgLng =
      trackings.reduce((sum, t) => sum + t.longitude, 0) / trackings.length;

    return { latitude: avgLat, longitude: avgLng };
  }

  /**
   * Calcule la distance entre 2 points GPS (formule Haversine)
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371000; // rayon terrestre en mètres
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Notifie l'agent d'une déviation GPS détectée
   */
  private async notifyAgentDeviation(missionId: string): Promise<void> {
    try {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        include: { agent: { include: { user: true } } },
      });

      if (mission?.agent?.user) {
        this.logger.warn(
          `⚠️ ALERTE: Déviation GPS pour mission ${missionId} - Agent: ${mission.agent.user.email}`,
        );
        // À intégrer: appel à AlertesService ou EmailService pour notifier l'agent
      }
    } catch (err: any) {
      this.logger.error(`Erreur notification agent: ${err.message}`);
    }
  }

  /**
   * Vérifie l'accès utilisateur à une mission
   */
  private async assertMissionAccess(
    missionId: string,
    userId: number,
  ): Promise<void> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        agent: { include: { user: true } },
        reservations: {
          where: { statut: 'CONFIRMED_BY_ADHERENT' },
          include: { adherent: true },
        },
      },
    });

    if (!mission) {
      throw new NotFoundException(`Mission ${missionId} introuvable.`);
    }

    // Accès: agent responsable ou convoyeur (adhérent)
    const isAgent = mission.agent.user.id === userId;
    const isAdherent = mission.reservations.some((r) => r.adherent.userId === userId);

    if (!isAgent && !isAdherent) {
      throw new ForbiddenException('Accès refusé à cette mission.');
    }
  }
}
