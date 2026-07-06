import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import { ScoreParametersDto, ScoreParametersSummaryDto } from './dto/export-score-parameters.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ScoresMlService {
  private readonly logger = new Logger(ScoresMlService.name);
  private readonly arrivalCityRadiusMeters = Number(
    process.env.ARRIVAL_CITY_RADIUS_METERS || 10000,
  );
  // Limites imposées par le modèle ML
  private readonly MAX_PICKUP_DELAY_MIN = 240;
  private readonly MAX_DELIVERY_DELAY_MIN = 300;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  async calculateScoreAndSave(missionId: string, noteAgent?: number): Promise<any> {
    try {
      this.logger.log(`Debut du calcul du score ML pour la mission ${missionId}`);

      const { features, arrivalCheck } = await this.collectFeatures(missionId, noteAgent);

      if (!arrivalCheck.isInArrivalCity) {
        this.logger.warn(
          `Mission ${missionId} terminee hors ville arrivee: distance=${Math.round(
            arrivalCheck.distanceMeters,
          )}m, rayon=${this.arrivalCityRadiusMeters}m`,
        );

        return this.prisma.mission.update({
          where: { id: missionId },
          data: {
            ...(noteAgent !== undefined ? { noteAgent } : {}),
            scoreLogistique: 0,
            scorePredictedLabel: 'Hors zone arrivee',
            scoreCalculatedAt: new Date(),
          },
        });
      }

      this.logger.log(`Appel du modele ML avec le payload: ${JSON.stringify(features)}`);

      const mlResponse = await this.callMlService(features);
      const scoreToSave = Number(mlResponse.score_final ?? mlResponse.ml_score);

      if (!Number.isFinite(scoreToSave)) {
        throw new Error(`Reponse ML invalide: score manquant (${JSON.stringify(mlResponse)})`);
      }

      const updatedMission = await this.prisma.mission.update({
        where: { id: missionId },
        data: {
          ...(noteAgent !== undefined ? { noteAgent } : {}),
          scoreLogistique: scoreToSave,
          scorePredictedLabel: mlResponse.predicted_label,
          scoreCalculatedAt: new Date(),
        },
      });

      this.logger.log(
        `Score ML sauvegarde pour mission ${missionId}: ${scoreToSave} (${mlResponse.predicted_label})`,
      );

      return updatedMission;
    } catch (error) {
      this.logger.error(`Erreur lors du calcul du score ML pour la mission ${missionId}:`, error);
      throw error;
    }
  }

  /**
   * Recalcule le score logistique pour toutes les missions TERMINEE sans score
   */
  async recalculateAllPendingScores(): Promise<{ processed: number; errors: number; results: any[] }> {
    const missions = await this.prisma.mission.findMany({
      where: {
        statut: 'TERMINEE',
        scoreLogistique: null,
      },
      select: { id: true },
    });

    this.logger.log(`Recalcul en masse: ${missions.length} missions sans score trouvees`);

    let processed = 0;
    let errors = 0;
    const results: any[] = [];

    for (const mission of missions) {
      try {
        const result = await this.calculateScoreAndSave(mission.id);
        processed++;
        results.push({ missionId: mission.id, status: 'OK', score: result?.scoreLogistique });
      } catch (err: any) {
        errors++;
        results.push({ missionId: mission.id, status: 'ERROR', error: err?.message });
        this.logger.error(`Erreur recalcul mission ${mission.id}: ${err?.message}`);
      }
    }

    this.logger.log(`Recalcul termine: ${processed} succes, ${errors} erreurs`);
    return { processed, errors, results };
  }

  private async collectFeatures(missionId: string, noteAgent?: number): Promise<any> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        vehicule: true,
        adresseDepart: true,
        adresseArrivee: true,
        calculs: true,
        disponibilite: true,
        sessions: {
          where: { statut: 'TERMINEE' },
          orderBy: { dateFin: 'desc' },
          take: 1,
          include: {
            reservation: {
              include: {
                adherent: true,
              },
            },
          },
        },
      },
    });

    if (!mission) {
      throw new Error(`Mission ${missionId} introuvable`);
    }

    const session = mission.sessions?.[0];
    if (!session?.dateFin) {
      throw new Error(`Mission ${missionId} non terminee: impossible de calculer le score final`);
    }

    const reservation = session.reservation;
    if (!reservation) {
      throw new Error(`Reservation introuvable pour la session ${session.id}`);
    }

    const rating = noteAgent ?? mission.noteAgent ?? 4.0;

    let age = 35;
    if (reservation.adherent?.dateNaissance) {
      const diff = Date.now() - new Date(reservation.adherent.dateNaissance).getTime();
      age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    }

    const distanceKm = Number(reservation.distanceKm ?? mission.calculs?.distanceKm ?? 100);
    const arrivalCheck = this.checkArrivalCity(session, mission.adresseArrivee);

    if (!arrivalCheck.isInArrivalCity) {
      return {
        features: null,
        arrivalCheck,
      };
    }

    const weatherCond = await this.fetchWeatherConditions(
      Number(mission.adresseDepart.latitude),
      Number(mission.adresseDepart.longitude),
    );

    const plannedDeparture =
      this.buildDateTime(reservation.dateDepart, reservation.heureDepart) ??
      mission.disponibilite?.dateDebut ??
      session.dateDebut;

    const plannedArrival =
      this.buildDateTime(reservation.dateArrivee, reservation.heureArrivee) ??
      mission.disponibilite?.dateFin;

    const dayOfWeek = plannedDeparture.getDay();
    const mappedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const pickupDelayMin = Math.min(
      this.getPositiveDelayMinutes(session.dateDebut, plannedDeparture),
      this.MAX_PICKUP_DELAY_MIN,
    );
    const deliveryDelayMin = Math.min(
      plannedArrival ? this.getPositiveDelayMinutes(session.dateFin, plannedArrival) : 0,
      this.MAX_DELIVERY_DELAY_MIN,
    );

    this.logger.log(
      `Features ML mission ${missionId}: departPrevu=${plannedDeparture.toISOString()}, ` +
        `departReel=${session.dateDebut.toISOString()}, retardDepart=${pickupDelayMin}, ` +
        `retardLivraison=${deliveryDelayMin}`,
    );

    return {
      features: {
        delivery_person_age: age,
        vehicle_condition: 2,
        delivery_person_ratings: rating,
        distance_km: distanceKm,
        pickup_delay_min: pickupDelayMin,
        delivery_delay_min: deliveryDelayMin,
        order_hour: plannedDeparture.getHours(),
        order_day: mappedDay,
        weather_conditions: weatherCond,
        mission_type: this.mapMissionType(mission.vehicule.typeVehicule),
        route_type: this.mapRouteType(distanceKm),
      },
      arrivalCheck,
    };
  }

  private checkArrivalCity(session: any, adresseArrivee: any): {
    isInArrivalCity: boolean;
    distanceMeters: number;
  } {
    const latitudeFin = Number(session.latitudeFin);
    const longitudeFin = Number(session.longitudeFin);
    const latitudeArrivee = Number(adresseArrivee?.latitude);
    const longitudeArrivee = Number(adresseArrivee?.longitude);

    // Si pas de coordonnées GPS de fin (pas de tracking actif),
    // on considère la mission comme validée manuellement
    if (
      !Number.isFinite(latitudeFin) ||
      !Number.isFinite(longitudeFin)
    ) {
      this.logger.warn(
        `Mission sans coordonnées GPS de fin — bypass vérification arrivée (session.id=${session.id})`,
      );
      return { isInArrivalCity: true, distanceMeters: 0 };
    }

    if (
      !Number.isFinite(latitudeArrivee) ||
      !Number.isFinite(longitudeArrivee)
    ) {
      return { isInArrivalCity: false, distanceMeters: Number.POSITIVE_INFINITY };
    }

    const distanceMeters = this.calculateDistanceMeters(
      latitudeFin,
      longitudeFin,
      latitudeArrivee,
      longitudeArrivee,
    );

    return {
      isInArrivalCity: distanceMeters <= this.arrivalCityRadiusMeters,
      distanceMeters,
    };
  }

  private calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const earthRadiusMeters = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  private buildDateTime(date?: Date | null, time?: string | null): Date | null {
    if (!date) return null;

    const result = new Date(date);
    if (!time) return result;

    const [hours, minutes] = time.split(':').map((value) => Number(value));
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return result;
    }

    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  private getPositiveDelayMinutes(actual: Date, planned: Date): number {
    return Math.max(0, Math.floor((actual.getTime() - planned.getTime()) / 60000));
  }

  private async fetchWeatherConditions(lat: number, lng: number): Promise<string> {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
      const response = await firstValueFrom(this.httpService.get(url));

      const wmoCode = response.data?.current_weather?.weathercode;
      return this.mapWeatherCode(wmoCode);
    } catch {
      this.logger.warn('Erreur API Meteo, utilisation de Sunny par defaut');
      return 'Sunny';
    }
  }

  private mapWeatherCode(code: number): string {
    if (code === undefined || code === null) return 'Sunny';
    if (code === 0 || code === 1) return 'Sunny';
    if (code === 2 || code === 3) return 'Cloudy';
    if (code === 45 || code === 48) return 'Fog';
    if (code >= 51 && code <= 86) return 'Cloudy';
    if (code >= 95 && code <= 99) return 'Stormy';

    return 'Sunny';
  }

  private mapMissionType(typeVehicule: string): string {
    const light = ['CITADINE', 'COMPACTE', 'BERLINE', 'CABRIOLET'];
    const medium = ['MONOSPACE', 'LUXE', 'VU_3M3', 'VU_6M3'];
    const heavy = ['VU_9M3', 'VU_12M3', 'VU_15M3', 'VU_20M3', 'VU_25M3', 'VU_30M3'];

    if (light.includes(typeVehicule)) return "V\u00e9hicule d'Occasion";
    if (medium.includes(typeVehicule)) return 'V\u00e9hicule Neuf';
    if (heavy.includes(typeVehicule)) return 'Lot de v\u00e9hicules / Flotte';

    return 'V\u00e9hicule Neuf';
  }

  private mapRouteType(distanceKm: number): string {
    if (distanceKm < 30) return 'Zone Urbaine / Ville';
    if (distanceKm > 100) return 'Autoroute / Inter-urbain';
    return 'Zone Rurale / Difficile';
  }

  private async callMlService(payload: any): Promise<any> {
    const mlUrl = (process.env.ML_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
    const mlApiKey = process.env.INTERNAL_ML_API_KEY || 'change_me_in_env';

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${mlUrl}/predict`, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': mlApiKey,
          },
        }),
      );
      this.logger.log(`Reponse ML recue avec succes: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Erreur d'appel API ML (${mlUrl}): ${
          error.response?.data ? JSON.stringify(error.response.data) : error.message
        }`,
      );
      throw error;
    }
  }

  // ── EXPORT DES PARAMETRES DE SCORE ────────────────────────────────────
  /**
   * Exporte tous les paramètres utilisés pour calculer le score logistique
   * SANS calculer le score
   */
  async exportScoreParameters(missionId: string): Promise<ScoreParametersDto> {
    const startTime = Date.now();
    
    this.logger.log(`Export des parametres de score pour la mission ${missionId}`);

    try {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        include: {
          vehicule: true,
          adresseDepart: true,
          adresseArrivee: true,
          calculs: true,
          disponibilite: true,
          sessions: {
            orderBy: { dateFin: 'desc' },
            take: 1,
            include: {
              reservation: {
                include: {
                  adherent: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!mission) {
        throw new Error(`Mission ${missionId} introuvable`);
      }

      const session = mission.sessions?.[0];
      const reservation = session?.reservation;
      const adherent = reservation?.adherent;

      if (!session || !reservation || !adherent) {
        throw new Error(
          `Données incomplètes pour la mission ${missionId}: session/reservation/adherent manquantes`,
        );
      }

      // Calcul de l'âge
      let age = 35;
      if (adherent.dateNaissance) {
        const diff = Date.now() - new Date(adherent.dateNaissance).getTime();
        age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      }

      // Distances
      const distanceKm = Number(reservation.distanceKm ?? mission.calculs?.distanceKm ?? 100);

      // Vérification de la zone d'arrivée
      const arrivalCheck = this.checkArrivalCity(session, mission.adresseArrivee);
      const distanceArriveeReelleM = arrivalCheck.distanceMeters;

      // Conditions météo
      const weatherCond = await this.fetchWeatherConditions(
        Number(mission.adresseDepart.latitude),
        Number(mission.adresseDepart.longitude),
      );

      // Dates et heures planifiées
      const plannedDeparture =
        this.buildDateTime(reservation.dateDepart, reservation.heureDepart) ??
        mission.disponibilite?.dateDebut ??
        session.dateDebut;

      const plannedArrival =
        this.buildDateTime(reservation.dateArrivee, reservation.heureArrivee) ??
        mission.disponibilite?.dateFin;

      // Jour de la semaine
      const dayOfWeek = plannedDeparture.getDay();
      const mappedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      // Délais en minutes
      const pickupDelayMin = this.getPositiveDelayMinutes(session.dateDebut, plannedDeparture);
      const deliveryDelayMin = plannedArrival
        ? this.getPositiveDelayMinutes(session.dateFin || new Date(), plannedArrival)
        : 0;

      // Saison
      const month = plannedDeparture.getMonth();
      let saison = 'Printemps';
      if (month >= 11 || month <= 1) saison = 'Hiver';
      else if (month >= 2 && month <= 4) saison = 'Printemps';
      else if (month >= 5 && month <= 7) saison = 'Été';
      else saison = 'Automne';

      const parameters: ScoreParametersDto = {
        // Identifiants
        missionId,
        sessionId: session.id,
        adherentId: adherent.id,

        // Profil du conducteur
        conducteurAge: age,
        conducteurNom: adherent.nom,
        conducteurPrenom: adherent.prenom,
        conducteurTelephone: adherent.telephone,
        noteAgentConducteur: mission.noteAgent ?? 4.0,

        // Véhicule
        typeVehicule: mission.vehicule.typeVehicule,
        etatVehicule: 2,
        immatriculation: mission.vehicule.immatriculation || 'N/A',

        // Mission - Paramètres temporels
        dateDepart: reservation.dateDepart || plannedDeparture,
        dateArrivee: reservation.dateArrivee || plannedArrival,
        heureDepart: reservation.heureDepart,
        heureArrivee: reservation.heureArrivee,

        // Mission - Dates réelles
        departReel: session.dateDebut,
        arriveeReelle: session.dateFin,

        // Mission - Délais
        retardDepart: pickupDelayMin,
        retardArrivee: deliveryDelayMin,

        // Mission - Distances
        distanceKm,
        distanceGPS: session.kilometrageFin
          ? Math.abs(
              (session.kilometrageFin ?? 0) - (session.kilometrageDebut ?? 0),
            )
          : null,

        // Mission - Positions
        adresseDepart: mission.adresseDepart.adresseComplete,
        villeDepartCodePostal: mission.adresseDepart.villeNom,
        latitudeDepartReelle: Number(session.latitudeDebut) || 0,
        longitudeDepartReelle: Number(session.longitudeDebut) || 0,

        adresseArrivee: mission.adresseArrivee.adresseComplete,
        villeArriveeCodePostal: mission.adresseArrivee.villeNom,
        latitudeArriveeReelle: Number(session.latitudeFin) || 0,
        longitudeArriveeReelle: Number(session.longitudeFin) || 0,
        distanceArriveeReelleM,

        // Conditions externes
        conditionsMeteo: weatherCond,
        joursemaine: mappedDay,

        // Timing
        heureDépart: plannedDeparture.getHours(),
        mois: plannedDeparture.getMonth() + 1,
        saison,

        // Statut
        statusMission: mission.statut,
        statusSession: session.statut,

        // Scores existants
        scoreLogistiqueActuel: mission.scoreLogistique,
        labelScorePrediction: mission.scorePredictedLabel,
        scoreSecuriteActuel: mission.scoreSecurite,

        // Métadonnées
        dateExport: new Date(),
        tempsExecution: Date.now() - startTime,
      };

      this.logger.log(
        `Parametres de score exportes pour mission ${missionId} (${Date.now() - startTime}ms)`,
      );

      return parameters;
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'export des parametres pour la mission ${missionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Exporte les paramètres pour une liste de missions
   */
  async exportScoreParametersForMissions(
    missionIds: string[],
  ): Promise<ScoreParametersSummaryDto[]> {
    this.logger.log(`Export des parametres pour ${missionIds.length} missions`);

    const missions = await this.prisma.mission.findMany({
      where: { id: { in: missionIds } },
      include: {
        vehicule: true,
        adresseDepart: true,
        adresseArrivee: true,
        calculs: true,
        disponibilite: true,
        sessions: {
          orderBy: { dateFin: 'desc' },
          take: 1,
          include: {
            reservation: {
              include: {
                adherent: true,
              },
            },
          },
        },
      },
    });

    const summaries: ScoreParametersSummaryDto[] = [];

    for (const mission of missions) {
      const session = mission.sessions?.[0];
      const reservation = session?.reservation;
      const adherent = reservation?.adherent;

      if (!session || !reservation || !adherent) {
        this.logger.warn(`Mission ${mission.id} : donnees incompletes, ignoree`);
        continue;
      }

      const plannedDeparture =
        this.buildDateTime(reservation.dateDepart, reservation.heureDepart) ??
        mission.disponibilite?.dateDebut ??
        session.dateDebut;

      const plannedArrival =
        this.buildDateTime(reservation.dateArrivee, reservation.heureArrivee) ??
        mission.disponibilite?.dateFin;

      const distanceKm = Number(reservation.distanceKm ?? mission.calculs?.distanceKm ?? 100);
      const pickupDelayMin = this.getPositiveDelayMinutes(session.dateDebut, plannedDeparture);
      const deliveryDelayMin = plannedArrival
        ? this.getPositiveDelayMinutes(session.dateFin || new Date(), plannedArrival)
        : 0;

      summaries.push({
        missionId: mission.id,
        conducteur: `${adherent.prenom} ${adherent.nom}`,
        adresseDepart: mission.adresseDepart.adresseComplete,
        adresseArrivee: mission.adresseArrivee.adresseComplete,
        distanceKm,
        retardDepart: pickupDelayMin,
        retardArrivee: deliveryDelayMin,
        dateDepart: plannedDeparture,
        dateArrivee: plannedArrival,
        scoreLogistique: mission.scoreLogistique,
        status: mission.statut,
      });
    }

    this.logger.log(`${summaries.length} missions exportees avec succes`);
    return summaries;
  }
}
