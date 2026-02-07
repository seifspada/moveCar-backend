import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RouteResult } from './dto/route-result.dto';

@Injectable()
export class RouteCalculatorService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openrouteservice.org/v2';
  private readonly prixParKm: number;
  private readonly fraisBase: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('OPENROUTESERVICE_API_KEY');
    this.prixParKm = this.configService.get<number>('TOLL_PRICE_PER_KM', 0.09);
    this.fraisBase = this.configService.get<number>('TOLL_BASE_FEE', 1.5);

    if (!this.apiKey) {
      throw new Error('OPENROUTESERVICE_API_KEY n\'est pas définie dans .env');
    }
  }

  /**
   * Calcule la route entre deux villes
   */
  async calculerRouteParVilles(
    villeDepart: string,
    villeArrivee: string,
    typeVehicule?: string,
  ): Promise<RouteResult> {
    try {
      const [coordonneesDepart, coordonneesArrivee] = await Promise.all([
        this.geocoderVille(villeDepart),
        this.geocoderVille(villeArrivee),
      ]);

      return this.calculerRoute(
        coordonneesDepart,
        coordonneesArrivee,
        typeVehicule,
      );
    } catch (error) {
      throw new HttpException(
        `Impossible de localiser les villes: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Calcule la route entre deux coordonnées GPS
   */
async calculerRoute(
  coordonneesDepart: [number, number],
  coordonneesArrivee: [number, number],
  typeVehicule?: string,
): Promise<RouteResult> {
  try {
    // ✅ CORRECTION : Ajouter la clé API dans l'URL au lieu du header
    const url = `${this.baseUrl}/directions/driving-car?api_key=${this.apiKey}`;
    
    console.log('🚗 Calcul de route:', { 
      coordonneesDepart, 
      coordonneesArrivee, 
      typeVehicule
    });
    
    const response = await firstValueFrom(
      this.httpService.post(
        url,
        { coordinates: [coordonneesDepart, coordonneesArrivee] },
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json, application/geo+json'
          },
          timeout: 10000
        }
      )
    );

    const summary = response.data.routes[0].summary;
    
    const distanceKm = summary.distance / 1000;
    const dureeSecondes = summary.duration;
    
    let tarifKm = 0.09;
    
    if (typeVehicule) {
      if (['VU_3M3', 'VU_6M3'].includes(typeVehicule)) {
        tarifKm = 0.14;
      } else if (['VU_9M3', 'VU_12M3'].includes(typeVehicule)) {
        tarifKm = 0.19;
      } else if (['VU_15M3', 'VU_20M3', 'VU_25M3', 'VU_30M3'].includes(typeVehicule)) {
        tarifKm = 0.26;
      }
    }
    
    const fraisBase = 1.5;
    const fraisPeageCalcule = fraisBase + (distanceKm * tarifKm);
    
    const heures = Math.floor(dureeSecondes / 3600);
    const minutes = Math.floor((dureeSecondes % 3600) / 60);
    const dureeFormatee = heures === 0 
      ? `${minutes}min` 
      : `${heures}h${minutes.toString().padStart(2, '0')}`;

    console.log('✅ Route calculée:', { distanceKm: Math.round(distanceKm), fraisPeageCalcule: Math.round(fraisPeageCalcule), dureeFormatee });

    return {
      distanceKm: Math.round(distanceKm),
      fraisPeage: Math.round(fraisPeageCalcule),
      dureeFormatee: dureeFormatee,
    };
  } catch (error) {
    console.error('❌ Erreur calcul route:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });

    throw new HttpException(
      `Erreur lors du calcul de la route: ${error.response?.data?.error?.message || error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}




  /**
   * Géocode une ville française pour obtenir ses coordonnées GPS
   * Avec fallback sur l'API du gouvernement français
   */
 private async geocoderVille(nomVille: string): Promise<[number, number]> {
  try {
    // ✅ CORRECTION : api_key en paramètre d'URL
    const url = `${this.baseUrl}/geocode/search?api_key=${this.apiKey}`;
    
    const response = await firstValueFrom(
      this.httpService.get(url, {
        params: {
          text: `${nomVille}, France`,
          size: 1,
          'boundary.country': 'FR',
        },
      })
    );

    if (!response.data.features || response.data.features.length === 0) {
      console.log(`⚠️ Ville "${nomVille}" non trouvée sur OpenRouteService, essai avec l'API française...`);
      return this.geocoderVilleApiFr(nomVille);
    }

    const coords = response.data.features[0].geometry.coordinates;
    console.log(`✅ Ville "${nomVille}" géocodée:`, coords);
    return [coords[0], coords[1]];
  } catch (error) {
    console.log(`⚠️ Erreur OpenRouteService pour "${nomVille}", essai avec l'API française...`);
    return this.geocoderVilleApiFr(nomVille);
  }
}

  /**
   * Fallback : Géocodage avec l'API du gouvernement français
   */
private async geocoderVilleApiFr(nomVille: string): Promise<[number, number]> {
  try {
    // ✅ Ajouter un filtre sur la population pour obtenir la plus grande ville
    const response = await firstValueFrom(
      this.httpService.get(
        `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(nomVille)}&fields=nom,centre,population,codesPostaux&boost=population&limit=10`
      )
    );

    if (response.data.length === 0) {
      throw new Error(`Ville "${nomVille}" non trouvée en France`);
    }

    // ✅ Filtrer et trier par population
    const villesTriees = response.data
      .filter((v: any) => v.centre && v.centre.coordinates)
      .sort((a: any, b: any) => (b.population || 0) - (a.population || 0));

    if (villesTriees.length === 0) {
      throw new Error(`Ville "${nomVille}" non trouvée en France`);
    }

    const ville = villesTriees[0];
    const coords = ville.centre.coordinates;
    
    // ✅ Vérifier que les coordonnées sont valides (en France métropolitaine)
    const [lon, lat] = coords;
    
    if (lon < -5 || lon > 10 || lat < 41 || lat > 52) {
      console.warn(`⚠️ Coordonnées suspectes pour "${nomVille}":`, coords);
    }
    
    console.log(`✅ Ville "${ville.nom}" (pop: ${ville.population || 'inconnue'}) trouvée:`, coords);
    
    return [coords[0], coords[1]]; // [longitude, latitude]
  } catch (error) {
    throw new HttpException(
      `Erreur de géocodage pour "${nomVille}": ${error.message}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}



  /**
   * Calcule les frais de péage selon la distance et le type de véhicule
   * @returns number (pas Decimal)
   */
 private calculerFraisPeage(distanceKm: number, typeVehicule?: string): number {
  let classe = 1;

  switch (typeVehicule) {
    case 'CITADINE':
    case 'COMPACTE':
    case 'BERLINE':
    case 'CABRIOLET':
    case 'MONOSPACE':
    case 'LUXE':
      classe = 1;
      break;
    case 'VU_3M3':
    case 'VU_6M3':
      classe = 2;
      break;
    case 'VU_9M3':
    case 'VU_12M3':
      classe = 3;
      break;
    case 'VU_15M3':
    case 'VU_20M3':
    case 'VU_25M3':
    case 'VU_30M3':
      classe = 4;
      break;
    default:
      classe = 1;
  }

  const tarifParKm: Record<number, number> = {
    1: 0.09,
    2: 0.14,
    3: 0.19,
    4: 0.26,
  };

  const prixKm = tarifParKm[classe] || this.prixParKm;
  
  // ✅ Calcul simple qui retourne un number
  const resultat = this.fraisBase + (distanceKm * prixKm);
  
  console.log('🔍 Calcul péage:', {
    fraisBase: this.fraisBase,
    distanceKm: distanceKm,
    prixKm: prixKm,
    classe: classe,
    resultat: resultat,
    typeResultat: typeof resultat
  });
  
  return resultat;
}

  /**
   * Formate la durée en format lisible
   */
  private formaterDuree(secondes: number): string {
    const heures = Math.floor(secondes / 3600);
    const minutes = Math.floor((secondes % 3600) / 60);
    
    if (heures === 0) {
      return `${minutes}min`;
    }
    
    return `${heures}h${minutes.toString().padStart(2, '0')}`;
  }
}
