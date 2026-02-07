import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
interface Commune {
  nom: string;
  code: string;
  codeDepartement: string;
  codeRegion: string;
  codesPostaux: string[];
  population?: number;
  centre?: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
}
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

   async searchVilles(search?: string, limit: number = 20) {
    const url = 'https://geo.api.gouv.fr/communes';
    
    const params: any = {
      fields: 'nom,code,codeDepartement,codesPostaux,centre,population',
      boost: 'population',
      limit,
    };

    // Si un terme de recherche est fourni
    if (search && search.trim().length > 0) {
      params.nom = this.normalizeCityName(search);
    }

    try {
      const res = await firstValueFrom(
        this.httpService.get(url, { params }),
      );

      const communes = res.data as Commune[];

      // Formater la réponse pour le frontend
      return communes.map(commune => ({
        id: commune.code,
        nom: commune.nom,
        code: commune.code,
        codeDepartement: commune.codeDepartement,
        codePostal: commune.codesPostaux?.[0] || '',
        population: commune.population || 0,
        latitude: commune.centre?.coordinates?.[1] || null,
        longitude: commune.centre?.coordinates?.[0] || null,
      }));
    } catch (error) {
      throw new BadRequestException(
        'Erreur lors de la récupération des villes',
      );
    }
  }

}
