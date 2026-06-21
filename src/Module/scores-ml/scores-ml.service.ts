import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ScoresMlService {
  private readonly logger = new Logger(ScoresMlService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  async calculateScoreAndSave(missionId: string, noteAgent?: number): Promise<any> {
    try {
      this.logger.log(`Debut du calcul du score ML pour la mission ${missionId}`);

      const features = await this.collectFeatures(missionId, noteAgent);
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

  private async collectFeatures(missionId: string, noteAgent?: number): Promise<any> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        vehicule: true,
        adresseDepart: true,
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

    const rating = noteAgent ?? mission.noteAgent;
    if (rating == null) {
      throw new Error(`noteAgent manquante pour la mission ${missionId}`);
    }

    let age = 35;
    if (reservation.adherent?.dateNaissance) {
      const diff = Date.now() - new Date(reservation.adherent.dateNaissance).getTime();
      age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    }

    const distanceKm = Number(reservation.distanceKm ?? mission.calculs?.distanceKm ?? 100);

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
    const pickupDelayMin = this.getPositiveDelayMinutes(session.dateDebut, plannedDeparture);
    const deliveryDelayMin = plannedArrival
      ? this.getPositiveDelayMinutes(session.dateFin, plannedArrival)
      : 0;

    this.logger.log(
      `Features ML mission ${missionId}: departPrevu=${plannedDeparture.toISOString()}, ` +
        `departReel=${session.dateDebut.toISOString()}, retardDepart=${pickupDelayMin}, ` +
        `retardLivraison=${deliveryDelayMin}`,
    );

    return {
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
    };
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
}
