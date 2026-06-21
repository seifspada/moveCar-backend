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

  /**
   * Méthode principale appelée lors du démarrage de la session (fire-and-forget)
   */
  async calculateScoreAndSave(missionId: string): Promise<void> {
    try {
      this.logger.log(`Début du calcul du score ML pour la mission ${missionId}`);

      // 1. Collecter toutes les features depuis la base de données
      const features = await this.collectFeatures(missionId);

      this.logger.log(`Appel du modèle ML avec le payload: ${JSON.stringify(features)}`);
      const mlResponse = await this.callMlService(features);

      // 3. Sauvegarder le score dans la base de données
      await this.prisma.mission.update({
        where: { id: missionId },
        data: {
          scoreLogistique: mlResponse.ml_score,
          scorePredictedLabel: mlResponse.predicted_label,
          scoreCalculatedAt: new Date(),
        },
      });

      this.logger.log(
        `✅ Score ML sauvegardé pour mission ${missionId} : ${mlResponse.ml_score} (${mlResponse.predicted_label}) | Final: ${mlResponse.score_final}`
      );
    } catch (error) {
      this.logger.error(`❌ Erreur lors du calcul du score ML pour la mission ${missionId}:`, error);
      throw error; // Propagate error so the caller knows it failed
    }
  }

 private async collectFeatures(missionId: string): Promise<any> {
  const mission = await this.prisma.mission.findUnique({
    where: { id: missionId },
    include: {
      vehicule: true,
      adresseDepart: true,
      agent: {
        include: {
          user: {
            include: { adherent: true },
          },
        },
      },
      calculs: true,
      disponibilite: true,
      sessions: {
        where: { statut: 'TERMINEE' },
        orderBy: { dateFin: 'desc' },
        take: 1,
      },
    },
  });

  if (!mission) {
    throw new Error(`Mission ${missionId} introuvable`);
  }

  // --- Âge du convoyeur (via agent → user → adherent) ---
  let age = 35;
  const adherent = mission.agent?.user?.adherent;
  if (adherent?.dateNaissance) {
    const diff = Date.now() - new Date(adherent.dateNaissance).getTime();
    age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  // --- Distance KM (depuis calculs) ---
  const distanceKm = mission.calculs
    ? Number(mission.calculs.distanceKm)
    : 100;

  // --- Météo ---
  const weatherCond = await this.fetchWeatherConditions(
    Number(mission.adresseDepart.latitude),
    Number(mission.adresseDepart.longitude),
  );

  // --- Variables temporelles (depuis disponibilite) ---
  const dateDepart = mission.disponibilite?.dateDebut ?? new Date();
  const dayOfWeek = dateDepart.getDay();
  const mappedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const orderHour = dateDepart.getHours();

  // --- Note agent (saisie manuellement) ---
  const noteAgent = mission.noteAgent ?? 4.0;

  // --- Délai de livraison ---
  let deliveryDelayMin = 0;
  const session = mission.sessions?.[0];
  if (session?.dateFin && mission.disponibilite?.dateFin) {
    const arriveeReelle = new Date(session.dateFin).getTime();
    const arriveePrevu  = new Date(mission.disponibilite.dateFin).getTime();
    const diffMs = arriveeReelle - arriveePrevu;
    if (diffMs > 0) {
      deliveryDelayMin = Math.floor(diffMs / 60000);
    }
  }

  return {
    delivery_person_age:     age,
    vehicle_condition:       2,
    delivery_person_ratings: noteAgent,
    distance_km:             distanceKm,
    pickup_delay_min:        0,
    delivery_delay_min:      deliveryDelayMin,
    order_hour:              orderHour,
    order_day:               mappedDay,
    weather_conditions:      weatherCond,
    mission_type:            this.mapMissionType(mission.vehicule.typeVehicule),
    route_type:              this.mapRouteType(distanceKm),
  };
}

  private async fetchWeatherConditions(lat: number, lng: number): Promise<string> {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
      const response = await firstValueFrom(this.httpService.get(url));
      
      const wmoCode = response.data?.current_weather?.weathercode;
      return this.mapWeatherCode(wmoCode);
    } catch (err) {
      this.logger.warn("Erreur API Météo, utilisation de Sunny par défaut");
      return "Sunny";
    }
  }

  /**
   * Mappe le code WMO Open-Meteo vers les catégories du modèle
   * Options: "Sunny", "Cloudy", "Windy", "Fog", "Stormy", "Sandstorms"
   */
  private mapWeatherCode(code: number): string {
    if (code === undefined || code === null) return "Sunny";
    
    // Clear / Mostly clear
    if (code === 0 || code === 1) return "Sunny";
    // Cloudy / Overcast
    if (code === 2 || code === 3) return "Cloudy";
    // Fog
    if (code === 45 || code === 48) return "Fog";
    // Drizzle / Rain
    if (code >= 51 && code <= 67) return "Cloudy"; 
    // Snow
    if (code >= 71 && code <= 86) return "Cloudy"; // Ou Stormy selon préférence
    // Thunderstorm
    if (code >= 95 && code <= 99) return "Stormy";

    return "Sunny";
  }

  /**
   * Mappe le TypeVehicule vers mission_type du modèle
   * Options attendues: "Véhicule Neuf", "Véhicule d'Occasion", "Véhicule en Panne (Assistance)", "Lot de véhicules / Flotte"
   */
  private mapMissionType(typeVehicule: string): string {
    // Si la valeur n'existe pas ou correspond à un véhicule léger
    const light = ['CITADINE', 'COMPACTE', 'BERLINE', 'CABRIOLET'];
    const medium = ['MONOSPACE', 'LUXE', 'VU_3M3', 'VU_6M3'];
    const heavy = ['VU_9M3', 'VU_12M3', 'VU_15M3', 'VU_20M3', 'VU_25M3', 'VU_30M3'];

    if (light.includes(typeVehicule)) return "Véhicule d'Occasion";
    if (medium.includes(typeVehicule)) return "Véhicule Neuf";
    if (heavy.includes(typeVehicule)) return "Lot de véhicules / Flotte";

    return "Véhicule Neuf"; // Par défaut
  }

  /**
   * Mappe la distance vers route_type du modèle
   * Options: "Autoroute / Inter-urbain", "Zone Urbaine / Ville", "Zone Rurale / Difficile"
   */
  private mapRouteType(distanceKm: number): string {
    if (distanceKm < 30) return "Zone Urbaine / Ville";
    if (distanceKm > 100) return "Autoroute / Inter-urbain";
    return "Zone Rurale / Difficile";
  }

  private async callMlService(payload: any): Promise<any> {
    const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
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
      this.logger.log(`Réponse ML reçue avec succès: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Erreur d'appel API ML (${mlUrl}): ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
      throw error;
    }
  }
}
