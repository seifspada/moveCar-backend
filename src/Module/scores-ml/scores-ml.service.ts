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

      // 2. Appeler le microservice ML FastAPI
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
        `Score ML sauvegardé pour mission ${missionId} : ${mlResponse.ml_score} (${mlResponse.predicted_label})`,
      );
    } catch (error) {
      this.logger.error(`Erreur lors du calcul du score ML pour la mission ${missionId}:`, error);
    }
  }

  private async collectFeatures(missionId: string): Promise<any> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        vehicule: true,
        adresseDepart: true,
        sessions: {
          where: { statut: 'TERMINEE' },
          orderBy: { dateFin: 'desc' },
          take: 1,
        },
        reservations: {
          include: {
            adherent: true,
          },
        },
      },
    });

    if (!mission || !mission.reservations || mission.reservations.length === 0) {
      throw new Error("Mission ou réservation introuvable");
    }

    const reservation = mission.reservations[0];
    const adherent = reservation.adherent;
    const vehicule = mission.vehicule;
    const adresseDepart = mission.adresseDepart;

    // --- Calcul de l'âge du convoyeur ---
    let age = 30; // Valeur par défaut
    if (adherent.dateNaissance) {
      const ageDiffMs = Date.now() - new Date(adherent.dateNaissance).getTime();
      const ageDate = new Date(ageDiffMs);
      age = Math.abs(ageDate.getUTCFullYear() - 1970);
    }

    // --- Distance KM ---
    const distanceKm = reservation.distanceKm ? Number(reservation.distanceKm) : 10;

    // --- Météo (API Open-Meteo) ---
    const weatherCond = await this.fetchWeatherConditions(
      adresseDepart.latitude,
      adresseDepart.longitude,
    );

    // --- Variables temporelles ---
    const dateDepart = new Date(reservation.dateDepart);
    const dayOfWeek = dateDepart.getDay(); // 0 (Dimanche) - 6 (Samedi). Le modèle attend 0=Lun -> 6=Dim
    const mappedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 

    const orderHour = reservation.heureDepart ? parseInt(reservation.heureDepart.split(':')[0], 10) : 9;

    // --- Note Agent ---
    const noteAgent = mission.noteAgent || 5.0; // 5.0 par défaut si non noté

    // --- Délai de livraison (Minutes) ---
    let deliveryDelayMin = 0;
    const session = mission.sessions && mission.sessions.length > 0 ? mission.sessions[0] : null;
    
    if (session && session.dateFin && reservation.dateArrivee) {
      // Calcul de la différence en minutes entre l'arrivée réelle et prévue
      const arriveeReelle = new Date(session.dateFin).getTime();
      
      // On combine dateArrivee et heureArrivee si possible
      let datePrevue = new Date(reservation.dateArrivee).getTime();
      if (reservation.heureArrivee) {
        const [hh, mm] = reservation.heureArrivee.split(':').map(Number);
        const prevueDate = new Date(reservation.dateArrivee);
        prevueDate.setUTCHours(hh, mm, 0, 0);
        datePrevue = prevueDate.getTime();
      }

      const diffMs = arriveeReelle - datePrevue;
      if (diffMs > 0) {
        deliveryDelayMin = Math.floor(diffMs / 60000);
      }
    }

    return {
      delivery_person_age: age,
      vehicle_condition: 2, // 2 = Excellent (par défaut comme demandé)
      delivery_person_ratings: noteAgent,
      distance_km: distanceKm,
      pickup_delay_min: 0, // 0 = Lancement à l'heure au démarrage
      delivery_delay_min: deliveryDelayMin,
      order_hour: orderHour,
      order_day: mappedDay,
      weather_conditions: weatherCond,
      type_of_order: this.mapVehicleType(vehicule.typeVehicule),
      city: this.mapCityType(adresseDepart.villeNom),
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
   * Mappe le TypeVehicule vers Type_of_order du modèle
   * Options attendues: "Meal", "Snack", "Drinks", "Buffet" 
   * (Nous adaptons selon la taille du véhicule)
   */
  private mapVehicleType(typeVehicule: string): string {
    // Si la valeur n'existe pas ou correspond à un véhicule léger
    const light = ['CITADINE', 'COMPACTE', 'BERLINE', 'CABRIOLET'];
    const medium = ['MONOSPACE', 'LUXE', 'VU_3M3', 'VU_6M3'];
    const heavy = ['VU_9M3', 'VU_12M3', 'VU_15M3', 'VU_20M3', 'VU_25M3', 'VU_30M3'];

    if (light.includes(typeVehicule)) return "Snack";
    if (medium.includes(typeVehicule)) return "Meal";
    if (heavy.includes(typeVehicule)) return "Buffet";

    return "Meal"; // Par défaut "neuf"
  }

  /**
   * Mappe la ville vers City du modèle
   * Options: "Metropolitian", "Urban", "Semi-Urban"
   */
  private mapCityType(villeNom: string): string {
    const metropoles = ['paris', 'lyon', 'marseille', 'toulouse', 'bordeaux', 'lille'];
    if (!villeNom) return "Urban";
    
    const villeLower = villeNom.toLowerCase();
    
    if (metropoles.some(m => villeLower.includes(m))) {
      return "Metropolitian";
    }
    
    return "Urban";
  }

  private async callMlService(payload: any): Promise<{ml_score: number, predicted_label: string}> {
    const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    const mlApiKey = process.env.INTERNAL_ML_API_KEY || 'change_me_in_env';

    const response = await firstValueFrom(
      this.httpService.post(`${mlUrl}/predict`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': mlApiKey,
        },
      }),
    );

    return response.data;
  }
}
