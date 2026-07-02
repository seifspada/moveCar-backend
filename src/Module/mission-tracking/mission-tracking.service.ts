// src/Module/mission-tracking/mission-tracking.service.ts

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
  MissionIncidentResult,
} from './entities/mission-tracking.entity';
import * as fs from 'fs';
import * as path from 'path';
import { SecuriteScoreService } from '../securite-score/securite-score.service';

// ============================================
// CONSTANTES & CONFIGURATION
// ============================================
const MAX_SPEED_KMH = 150;
const MAX_LOCATION_AGE_SECONDS = 60;
const MIN_LOCATIONS_FOR_COMPLETION = 5;
const ARRIVAL_THRESHOLD_METERS = 500;
const MAX_INCIDENT_PHOTOS = 3;

interface GpsPoint {
  latitude: number;
  longitude: number;
  timestamp?: Date;
}

@Injectable()
export class MissionTrackingService {
  private readonly logger = new Logger(MissionTrackingService.name);
  private readonly uploadsDir = path.join(process.cwd(), 'uploads', 'mission-incidents');

constructor(
  private readonly prisma: PrismaService,
  private readonly securiteScoreService: SecuriteScoreService,
) {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

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
    const mission = await this.prisma.mission.findUnique({
      where: { id: input.missionId },
      include: {
        reservations: {
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

    const reservation = mission.reservations.find(
      (r) => r.adherent.userId === userId,
    );
    if (!reservation) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à mettre à jour la position pour cette mission.",
      );
    }

    const session = mission.sessions[0];
    if (!session) {
      throw new BadRequestException(
        'Aucune session en cours trouvée pour cette mission.',
      );
    }

    const ageSeconds = (Date.now() - input.timestamp.getTime()) / 1000;
    if (ageSeconds > MAX_LOCATION_AGE_SECONDS) {
      this.logger.warn(
        `Position trop ancienne pour mission ${input.missionId} (${ageSeconds}s)`,
      );
    }

    const isDeviated = await this.checkGpsDeviation(session.id, {
      latitude: input.latitude,
      longitude: input.longitude,
      timestamp: new Date(input.timestamp),
    });

    const tracking = await this.prisma.missionGPSTrack.create({
      data: {
        sessionId: session.id,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy ?? null,
        speed: input.speed ?? null,
        timestamp: new Date(input.timestamp),
        isDeviated,
        distanceFromRoute: null,
      },
    });

    if (isDeviated) {
      this.logger.warn(`Déviation GPS pour mission ${input.missionId}`);
      await this.prisma.mission.update({
        where: { id: input.missionId },
        data: { statut: 'PROBLEME_TRAJET' },
      });
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
    await this.assertMissionAccess(missionId, userId);

    const trackings = await this.prisma.missionGPSTrack.findMany({
      where: { session: { missionId } },
      orderBy: { timestamp: 'asc' },
    });

    return trackings as any;
  }

  /**
   * Récupère toutes les missions EN_COURS + TERMINEE récentes (< 24h) pour la carte agent
   * Les missions TERMINEE sont incluses pour permettre l'évaluation par l'agent
   */
 async getActiveMissionsMap(userId: number): Promise<ActiveMissionMap[]> {
  const admin = await this.prisma.admin.findUnique({ where: { userId } });
  // Missions terminées depuis moins de 24h restent visibles sur la carte
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let missionFilter: any = {
    statut: { in: ['EN_COURS', 'PROBLEME_TRAJET', 'TERMINEE'] },
  };
  const sessionStatutFilter = {
    OR: [
      { statut: 'EN_COURS' as any },
      {
        statut: 'TERMINEE' as any,
        dateFin: { gte: since24h },
      },
    ],
  };
  if (!admin) {
    const agent = await this.prisma.agent.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!agent) {
      throw new ForbiddenException('Accès refusé.');
    }
    missionFilter = {
      statut: { in: ['EN_COURS', 'PROBLEME_TRAJET', 'TERMINEE'] },
      agentId: agent.id,
    };
  }
  const sessions = await this.prisma.missionSession.findMany({
    where: {
      ...sessionStatutFilter,
      mission: missionFilter,
    },
    include: {
      // gpsHistory est bien une relation sur MissionSession
      gpsHistory: {
        orderBy: { timestamp: 'desc' },
        take: 1,
      },
      // noteAgent / scoreLogistique / scorePredictedLabel / scoreSecurite sont sur Mission directement
      mission: {
        include: {
          vehicule: true,
          adresseArrivee: true,
          adresseDepart: true,
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
  // Dédupliquer : garder une seule session par missionId (la plus récente)
  const seenMissions = new Set<string>();
  return sessions
    .filter((session) => {
      if (seenMissions.has(session.missionId)) return false;
      seenMissions.add(session.missionId);
      return true;
    })
    .map((session) => {
      const lastGps = session.gpsHistory[0];
      return {
        missionId: session.missionId,
        sessionId: session.id,
        vehicleName: `${session.mission.vehicule.marqueModele} - ${session.mission.vehicule.immatriculation}`,
        convoyeurName: `${session.reservation.adherent.prenom} ${session.reservation.adherent.nom}`,
        // status pour compatibilité ancien code, statut pour logique frontend
        status: session.mission.statut,
        statut: session.mission.statut,
        latitude: lastGps?.latitude ?? session.latitudeDebut,
        longitude: lastGps?.longitude ?? session.longitudeDebut,
        latitudeDepart: session.mission.adresseDepart?.latitude ?? null,
        longitudeDepart: session.mission.adresseDepart?.longitude ?? null,
        latitudeArrivee: session.mission.adresseArrivee?.latitude ?? null,
        longitudeArrivee: session.mission.adresseArrivee?.longitude ?? null,
        accuracy: lastGps?.accuracy ?? null,
        lastGpsAt: lastGps?.timestamp ?? session.dateDebut,
        isDeviated: lastGps?.isDeviated ?? false,
        // Ces champs sont sur Mission directement (pas sur MissionCompletion)
        noteAgent: session.mission.noteAgent ?? null,
        scoreLogistique: session.mission.scoreLogistique ?? null,
        scorePredictedLabel: session.mission.scorePredictedLabel ?? null,
        // ── NOUVEAU : score sécurité (conduite) ──
        scoreSecurite: session.mission.scoreSecurite ?? null,
        labelSecurite: session.mission.labelSecurite ?? null,
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

  const trackings = await this.prisma.missionGPSTrack.findMany({
    where: { session: { missionId: input.missionId } },
    orderBy: { timestamp: 'asc' },
  });

  const validTrackings = trackings.filter((t) => !t.isDeviated);
  const invalidTrackings = trackings.filter((t) => t.isDeviated);
  const totalLocations = trackings.length;

  let invalidationReason: string | null = null;
  let maxDeviation = 0;
  let dureeTrajet = 0;

  if (totalLocations < MIN_LOCATIONS_FOR_COMPLETION) {
    invalidationReason = `Nombre insuffisant de positions GPS (${totalLocations} < ${MIN_LOCATIONS_FOR_COMPLETION})`;
  }

  if (trackings.length > 0) {
    for (let i = 1; i < trackings.length; i++) {
      const dist = this.calculateDistance(
        trackings[i - 1].latitude,
        trackings[i - 1].longitude,
        trackings[i].latitude,
        trackings[i].longitude,
      );
      if (dist > maxDeviation) maxDeviation = dist;
    }

    dureeTrajet = Math.round(
      (trackings[trackings.length - 1].timestamp.getTime() -
        trackings[0].timestamp.getTime()) /
        1000,
    );

    if (
      invalidTrackings.length > 0 &&
      invalidTrackings.length / totalLocations > 0.3
    ) {
      invalidationReason = `Trop de positions GPS incohérentes (${invalidTrackings.length} / ${totalLocations})`;
    }
  }

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

  const newStatut = completion.completed ? 'TERMINEE' : 'PROBLEME_TRAJET';

  await this.prisma.$transaction([
    this.prisma.mission.update({
      where: { id: input.missionId },
      data: { statut: newStatut as any },
    }),
    this.prisma.missionSession.updateMany({
      where: { missionId: input.missionId, statut: 'EN_COURS' },
      data: { statut: 'TERMINEE' },
    }),
  ]);

  this.logger.log(
    `✅ Mission ${input.missionId} terminée. Statut: ${newStatut}. Points GPS: ${totalLocations}`,
  );

  // ── NOUVEAU : calcul du score sécurité, uniquement si le trajet est validé ──
  // Lancé en fire-and-forget : ne doit jamais bloquer ni faire échouer
  // la réponse de completeMission côté mobile.
  if (completion.completed) {
    this.securiteScoreService
      .computeAndSave(input.missionId)
      .catch((err) =>
        this.logger.error(
          `Échec calcul score sécurité pour mission ${input.missionId}: ${err.message}`,
        ),
      );
  }

  return completion;
}

  /**
   * Récupère le résumé final d'une mission
   */
  async getMissionCompletion(
    missionId: string,
    userId: number,
  ): Promise<MissionCompletion | null> {
    await this.assertMissionAccess(missionId, userId);

    const completion = await this.prisma.missionCompletion.findUnique({
      where: { missionId },
    });

    return completion;
  }

  // ============================================================
  // VÉRIFICATION D'ARRIVÉE
  // ============================================================

  async checkArrival(
    sessionId: string,
    latitude: number,
    longitude: number,
    userId: number,
  ): Promise<{ isArrived: boolean; distanceMetres: number; villeArrivee: string }> {
    const session = await this.prisma.missionSession.findUnique({
      where: { id: sessionId },
      include: {
        reservation: {
          include: { adherent: true },
        },
        mission: {
          include: { adresseArrivee: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} introuvable.`);
    }

    if (session.reservation.adherent.userId !== userId) {
      throw new ForbiddenException('Cette session ne vous appartient pas.');
    }

    if (session.statut !== 'EN_COURS') {
      throw new BadRequestException('La session nest pas en cours.');
    }

    const adresseArrivee = session.mission.adresseArrivee;

    const distanceMetres = this.calculateDistance(
      latitude,
      longitude,
      adresseArrivee.latitude,
      adresseArrivee.longitude,
    );

    const isArrived = distanceMetres <= ARRIVAL_THRESHOLD_METERS;

    if (isArrived) {
      this.logger.log(
        `✅ Convoyeur arrivé à ${adresseArrivee.villeNom} (distance: ${Math.round(distanceMetres)}m)`,
      );
    }

    return {
      isArrived,
      distanceMetres: Math.round(distanceMetres),
      villeArrivee: adresseArrivee.villeNom,
    };
  }

  // ============================================================
  // GESTION DES INCIDENTS
  // ============================================================

  async reportIncident(
    input: {
      sessionId: string;
      typeIncident: string;
      description: string;
      latitude: number;
      longitude: number;
      photos?: string[];
    },
    userId: number,
  ): Promise<MissionIncidentResult> {
    const session = await this.prisma.missionSession.findUnique({
      where: { id: input.sessionId },
      include: {
        reservation: { include: { adherent: true } },
        mission: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${input.sessionId} introuvable.`);
    }

    if (session.reservation.adherent.userId !== userId) {
      throw new ForbiddenException('Cette session ne vous appartient pas.');
    }

    if (session.statut !== 'EN_COURS') {
      throw new BadRequestException(
        'Impossible de signaler un incident sur une session terminée.',
      );
    }

    if (input.photos && input.photos.length > MAX_INCIDENT_PHOTOS) {
      throw new BadRequestException(
        `Maximum ${MAX_INCIDENT_PHOTOS} photos par incident.`,
      );
    }

    const incident = await this.prisma.missionIncident.create({
      data: {
        sessionId: input.sessionId,
        typeIncident: input.typeIncident as any,
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
      },
    });

    if (input.photos && input.photos.length > 0) {
      for (let i = 0; i < input.photos.length; i++) {
        const { cheminFichier, tailleOctets, typeContenu } =
          await this.saveIncidentPhoto(input.photos[i], incident.id, i);

        await this.prisma.missionIncidentMedia.create({
          data: {
            incidentId: incident.id,
            cheminFichier,
            tailleOctets,
            typeContenu,
            ordre: i,
          },
        });
      }
    }

    if (input.typeIncident === 'DÉVIATION_GPS') {
      await this.prisma.mission.update({
        where: { id: session.missionId },
        data: { statut: 'PROBLEME_TRAJET' },
      });
    }

    await this.notifyAgentDeviation(session.missionId);

    this.logger.log(
      `🚨 Incident ${input.typeIncident} signalé pour session ${input.sessionId}`,
    );

    const incidentWithMedias = await this.prisma.missionIncident.findUnique({
      where: { id: incident.id },
      include: { medias: true },
    });

    return incidentWithMedias as any as MissionIncidentResult;
  }

  async resolveIncident(
    incidentId: string,
    resolutionNotes: string,
    userId: number,
  ): Promise<MissionIncidentResult> {
    const incident = await this.prisma.missionIncident.findUnique({
      where: { id: incidentId },
      include: {
        session: {
          include: {
            mission: {
              include: { agent: { include: { user: true } } },
            },
          },
        },
      },
    });

    if (!incident) {
      throw new NotFoundException(`Incident ${incidentId} introuvable.`);
    }

    if (incident.session.mission.agent.user.id !== userId) {
      throw new ForbiddenException(
        'Seul l agent responsable peut résoudre un incident.',
      );
    }

    if (incident.dateResolution) {
      throw new BadRequestException('Cet incident est déjà résolu.');
    }

    const updated = await this.prisma.missionIncident.update({
      where: { id: incidentId },
      data: {
        resolvedBy: userId.toString(),
        resolutionNotes,
        dateResolution: new Date(),
      },
      include: { medias: true },
    });

    const incidentsNonResolus = await this.prisma.missionIncident.count({
      where: {
        sessionId: incident.sessionId,
        dateResolution: null,
      },
    });

    if (incidentsNonResolus === 0) {
      await this.prisma.mission.update({
        where: { id: incident.session.missionId },
        data: { statut: 'EN_COURS' },
      });
      this.logger.log(
        `✅ Tous les incidents résolus — mission ${incident.session.missionId} repassée EN_COURS`,
      );
    }

    return updated as any as MissionIncidentResult;
  }

  async getIncidents(
    sessionId: string,
    userId: number,
  ): Promise<MissionIncidentResult[]> {
    const session = await this.prisma.missionSession.findUnique({
      where: { id: sessionId },
      include: {
        mission: {
          include: { agent: { include: { user: true } } },
        },
        reservation: { include: { adherent: true } },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} introuvable.`);
    }

    const isAgent = session.mission.agent.user.id === userId;
    const isAdherent = session.reservation.adherent.userId === userId;

    if (!isAgent && !isAdherent) {
      throw new ForbiddenException('Accès refusé à cette session.');
    }

    const incidents = await this.prisma.missionIncident.findMany({
      where: { sessionId },
      include: { medias: true },
      orderBy: { dateCreation: 'desc' },
    });

    return incidents as any as MissionIncidentResult[];
  }

  // ============================================================
  // MÉTHODES PRIVÉES
  // ============================================================

  private async checkGpsDeviation(
    sessionId: string,
    newPosition: GpsPoint,
  ): Promise<boolean> {
    const lastTracking = await this.prisma.missionGPSTrack.findFirst({
      where: { sessionId, isDeviated: false },
      select: { latitude: true, longitude: true, timestamp: true },
      orderBy: { timestamp: 'desc' },
    });

    if (!lastTracking) return false;

    const distance = this.calculateDistance(
      newPosition.latitude,
      newPosition.longitude,
      lastTracking.latitude,
      lastTracking.longitude,
    );

    const elapsedSeconds =
      ((newPosition.timestamp?.getTime() ?? Date.now()) -
        lastTracking.timestamp.getTime()) /
      1000;

    if (elapsedSeconds <= 0) return false;

    const impliedSpeedKmh = (distance / 1000) / (elapsedSeconds / 3600);

    if (impliedSpeedKmh > MAX_SPEED_KMH) {
      this.logger.warn(
        `Vitesse GPS incohérente : ${Math.round(impliedSpeedKmh)} km/h pour session ${sessionId}`,
      );
      return true;
    }

    return false;
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

  private async notifyAgentDeviation(missionId: string): Promise<void> {
    try {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        include: { agent: { include: { user: true } } },
      });

      if (mission?.agent?.user) {
        this.logger.warn(
          `⚠️ ALERTE: Problème détecté pour mission ${missionId} — Agent: ${mission.agent.user.email}`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Erreur notification agent: ${err.message}`);
    }
  }

  private async saveIncidentPhoto(
    base64Data: string,
    incidentId: string,
    ordre: number,
  ): Promise<{ cheminFichier: string; tailleOctets: number; typeContenu: string }> {
    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new BadRequestException(
        'Format base64 invalide. Doit être : data:image/jpeg;base64,<données>',
      );
    }

    const typeContenu = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const ext = this.getMimeExtension(typeContenu);
    const filename = `${incidentId}_photo_${ordre}_${Date.now()}.${ext}`;

    const incidentDir = path.join(this.uploadsDir, incidentId);
    if (!fs.existsSync(incidentDir)) {
      fs.mkdirSync(incidentDir, { recursive: true });
    }

    const filePath = path.join(incidentDir, filename);
    fs.writeFileSync(filePath, buffer);

    return {
      cheminFichier: path.relative(process.cwd(), filePath),
      tailleOctets: buffer.length,
      typeContenu,
    };
  }

  private getMimeExtension(mimeType: string): string {
    const extensions: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    return extensions[mimeType] || 'jpg';
  }

  private async assertMissionAccess(
    missionId: string,
    userId: number,
  ): Promise<void> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        agent: { include: { user: true } },
        reservations: { include: { adherent: true } },
      },
    });

    if (!mission) {
      throw new NotFoundException(`Mission ${missionId} introuvable.`);
    }

    const isAgent = mission.agent.user.id === userId;
    const isAdherent = mission.reservations.some(
      (r) => r.adherent.userId === userId,
    );
    const isAdmin = await this.prisma.admin.findUnique({ where: { userId } });

    if (!isAgent && !isAdherent && !isAdmin) {
      throw new ForbiddenException('Accès refusé à cette mission.');
    }
  }

  private calculateCenterPoint(trackings: any[]): GpsPoint {
    const avgLat =
      trackings.reduce((sum: number, t: any) => sum + t.latitude, 0) /
      trackings.length;
    const avgLng =
      trackings.reduce((sum: number, t: any) => sum + t.longitude, 0) /
      trackings.length;
    return { latitude: avgLat, longitude: avgLng };
  }
}