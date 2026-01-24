import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GeoService {
  constructor(private readonly httpService: HttpService) {}

  private normalizeCityName(v: string) {
    return v.trim();
  }

  async assertVilleFrance(ville: string): Promise<void> {
    const q = this.normalizeCityName(ville);
    if (q.length < 2) {
      throw new BadRequestException('Ville invalide');
    }

    const url = 'https://geo.api.gouv.fr/communes';
    const res = await firstValueFrom(
      this.httpService.get(url, {
        params: { nom: q, boost: 'population', limit: 1 },
      }),
    );

    const communes = res.data as Array<{ nom: string; code: string }>;
    if (!communes?.length) {
      throw new BadRequestException('Ville inconnue (France uniquement)');
    }
  }

  // Tu peux ajouter d'autres méthodes réutilisables:
  async getCommuneByCode(code: string) {
    const url = `https://geo.api.gouv.fr/communes/${code}`;
    const res = await firstValueFrom(this.httpService.get(url));
    return res.data;
  }
}
