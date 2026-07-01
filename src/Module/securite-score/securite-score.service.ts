// src/securite-score/securite-score.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

interface SecuriteScoreResult {
  score: number;
  label: string;
  weather_text: string;
  speed_limit: number;
  average_speed: number;
  max_speed: number;
  overspeed_count: number;
  harsh_acceleration_count: number;
  harsh_braking_count: number;
}

@Injectable()
export class SecuriteScoreService {
  private readonly logger = new Logger(SecuriteScoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Convertit l'historique MissionGPSTrack en "seconde,vitesse"
   * pour securite-ml-service.
   */
  private buildGpsText(
    tracks: { speed: number | null; timestamp: Date }[],
  ): string | null {
    const validTracks = tracks.filter((t) => t.speed != null);
    if (validTracks.length < 2) return null;

    const t0 = validTracks[0].timestamp.getTime();

    const lines = validTracks.map((t) => {
      const secondeRelative = Math.round((t.timestamp.getTime() - t0) / 1000);
      return `${secondeRelative},${Math.round(t.speed! * 100) / 100}`;
    });

    return lines.join('\n');
  }

  /**
   * Calcule le score sécurité pour une mission et le sauvegarde
   * directement sur Mission (en miroir de scoreLogistique).
   */
  async computeAndSave(
    missionId: string,
    rainState: string = 'Pas de pluie',
  ): Promise<SecuriteScoreResult | null> {
    try {
      this.logger.log(`Debut du calcul du score securite pour la mission ${missionId}`);

      const tracks = await this.prisma.missionGPSTrack.findMany({
        where: { session: { missionId }, isDeviated: false },
        select: { speed: true, timestamp: true },
        orderBy: { timestamp: 'asc' },
      });

      const gpsText = this.buildGpsText(tracks);

      if (!gpsText) {
        this.logger.warn(
          `Pas assez de points GPS avec vitesse pour mission ${missionId} (${tracks.length} points trouves)`,
        );
        return null;
      }

      this.logger.log(`Appel du modele securite avec rain_state=${rainState}`);

      const data = await this.callSecuriteMlService(gpsText, rainState);

      const scoreToSave = Number(data.score);
      if (!Number.isFinite(scoreToSave)) {
        throw new Error(`Reponse ML securite invalide: score manquant (${JSON.stringify(data)})`);
      }

      await this.prisma.mission.update({
        where: { id: missionId },
        data: {
          scoreSecurite: scoreToSave,
          labelSecurite: data.label,
          scoreSecuriteCalculatedAt: new Date(),
          weatherUtilise: data.weather_text,
          detailsSecurite: {
            speed_limit: data.speed_limit,
            average_speed: data.average_speed,
            max_speed: data.max_speed,
            overspeed_count: data.overspeed_count,
            harsh_acceleration_count: data.harsh_acceleration_count,
            harsh_braking_count: data.harsh_braking_count,
          },
        },
      });

      this.logger.log(
        `Score securite sauvegarde pour mission ${missionId}: ${scoreToSave} (${data.label})`,
      );

      return data;
    } catch (error: any) {
      this.logger.error(
        `Erreur lors du calcul du score securite pour la mission ${missionId}:`,
        error,
      );
      throw error;
    }
  }

  private async callSecuriteMlService(
    gpsText: string,
    rainState: string,
  ): Promise<SecuriteScoreResult> {
    const mlUrl = (process.env.SECURITE_ML_SERVICE_URL || 'http://localhost:8001').replace(
      /\/$/,
      '',
    );
    const mlApiKey = process.env.INTERNAL_SECURITE_API_KEY || 'change_me_in_env';

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${mlUrl}/score`,
          { gps_text: gpsText, rain_state: rainState },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': mlApiKey,
            },
          },
        ),
      );

      this.logger.log(`Reponse ML securite recue avec succes: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Erreur d'appel API ML securite (${mlUrl}): ${
          error.response?.data ? JSON.stringify(error.response.data) : error.message
        }`,
      );
      throw error;
    }
  }
}