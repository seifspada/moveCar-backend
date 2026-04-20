import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RouteResult } from './dto/route-result.dto';

// ─── Types internes ────────────────────────────────────────────────────────────

interface OrsError {
  message?: string;
  response?: {
    data?: {
      error?: { message?: string; code?: number };
      message?: string;
    };
    status?: number;
    statusText?: string;
  };
}

interface GeoApiCommune {
  nom?: string;
  population?: number;
  centre?: {
    coordinates?: [number, number];
  };
}

// ─── Constantes ────────────────────────────────────────────────────────────────

const TARIFS_KM: Record<string, number> = {
  VU_3M3:  0.14,
  VU_6M3:  0.14,
  VU_9M3:  0.19,
  VU_12M3: 0.19,
  VU_15M3: 0.26,
  VU_20M3: 0.26,
  VU_25M3: 0.26,
  VU_30M3: 0.26,
};

const CLASSE_VEHICULE: Record<string, number> = {
  CITADINE:  1, COMPACTE: 1, BERLINE: 1,
  CABRIOLET: 1, MONOSPACE: 1, LUXE:   1,
  VU_3M3:    2, VU_6M3:   2,
  VU_9M3:    3, VU_12M3:  3,
  VU_15M3:   4, VU_20M3:  4, VU_25M3: 4, VU_30M3: 4,
};

const TARIF_PAR_CLASSE: Record<number, number> = {
  1: 0.09,
  2: 0.14,
  3: 0.19,
  4: 0.26,
};

const ORS_RADIUS    = 2000;
const FRAIS_BASE    = 1.5;
const TARIF_DEFAULT = 0.09;

// ─── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class RouteCalculatorService {
  private readonly logger  = new Logger(RouteCalculatorService.name);
  private readonly apiKey  : string;
  private readonly baseUrl : string;
  private readonly prixParKm : number;
  private readonly fraisBase : number;

  constructor(
    private readonly httpService   : HttpService,
    private readonly configService : ConfigService,
  ) {
    this.baseUrl   = this.configService.get<string>('ORS_BASE_URL') ?? 'https://api.openrouteservice.org/v2';
    this.apiKey    = this.configService.get<string>('OPENROUTESERVICE_API_KEY') ?? '';
    this.prixParKm = this.configService.get<number>('TOLL_PRICE_PER_KM') ?? TARIF_DEFAULT;
    this.fraisBase = this.configService.get<number>('TOLL_BASE_FEE')     ?? FRAIS_BASE;

    if (!this.apiKey) {
      throw new Error("OPENROUTESERVICE_API_KEY n'est pas définie dans .env");
    }
  }

  // ─── Calcul par noms de villes ──────────────────────────────────────────────

  async calculerRouteParVilles(
    villeDepart  : string,
    villeArrivee : string,
    typeVehicule?: string,
  ): Promise<RouteResult> {
    try {
      const [coordonneesDepart, coordonneesArrivee] = await Promise.all([
        this.geocoderVille(villeDepart),
        this.geocoderVille(villeArrivee),
      ]);

      return this.calculerRoute(coordonneesDepart, coordonneesArrivee, typeVehicule);

    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const err = error as OrsError;
      throw new HttpException(
        `Impossible de localiser les villes: ${err.message ?? 'Erreur inconnue'}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ─── Calcul par coordonnées GPS ─────────────────────────────────────────────

  async calculerRoute(
    coordonneesDepart  : [number, number],
    coordonneesArrivee : [number, number],
    typeVehicule?      : string,
  ): Promise<RouteResult> {
    const departNorm  = this.normalizeCoords(coordonneesDepart);
    const arriveeNorm = this.normalizeCoords(coordonneesArrivee);

    this.logger.debug(`🚗 ORS | depart=${JSON.stringify(departNorm)} arrivee=${JSON.stringify(arriveeNorm)} véhicule=${typeVehicule ?? 'défaut'}`);

    try {
      const url = `${this.baseUrl}/directions/driving-car?api_key=${this.apiKey}`;

      const response = await firstValueFrom(
        this.httpService.post(
          url,
          {
            coordinates: [departNorm, arriveeNorm],
            radiuses:    [ORS_RADIUS, ORS_RADIUS],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept':       'application/json, application/geo+json',
            },
            timeout: 10000,
          },
        ),
      );

      if (!response.data?.routes?.length) {
        throw new HttpException(
          'Aucune route trouvée entre ces deux points. Vérifiez les adresses saisies.',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const summary       = response.data.routes[0].summary as { distance: number; duration: number };
      const distanceKm    = summary.distance / 1000;
      const dureeSecondes = summary.duration;

      const tarifKm       = TARIFS_KM[typeVehicule ?? ''] ?? this.prixParKm;
      const fraisPeage    = this.fraisBase + distanceKm * tarifKm;
      const dureeFormatee = this.formaterDuree(dureeSecondes);

      this.logger.log(`✅ Route | ${Math.round(distanceKm)} km | ${dureeFormatee} | ${Math.round(fraisPeage)} € | ${tarifKm}€/km`);

      return {
        distanceKm:   Math.round(distanceKm),
        fraisPeage:   Math.round(fraisPeage),
        dureeFormatee,
        prixParKm:    tarifKm,
      };

    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;

      const err        = error as OrsError;
      const orsMessage =
        err.response?.data?.error?.message ??
        err.response?.data?.message ??
        err.message ??
        'Erreur inconnue';

      this.logger.error(`❌ ORS | status=${err.response?.status} | ${orsMessage}`);

      throw new HttpException(
        `Erreur lors du calcul de la route: ${orsMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Géocodage via ORS ──────────────────────────────────────────────────────

  private async geocoderVille(nomVille: string): Promise<[number, number]> {
    try {
      const url = `${this.baseUrl}/geocode/search?api_key=${this.apiKey}`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            text:               `${nomVille}, France`,
            size:               1,
            'boundary.country': 'FR',
          },
        }),
      );

      if (!response.data?.features?.length) {
        this.logger.warn(`⚠️  Ville "${nomVille}" non trouvée sur ORS → fallback API France`);
        return this.geocoderVilleApiFr(nomVille);
      }

      const coords = response.data.features[0].geometry.coordinates as [number, number];
      this.logger.debug(`✅ Géocodage ORS "${nomVille}": ${JSON.stringify(coords)}`);
      return [coords[0], coords[1]];

    } catch (error: unknown) {
      this.logger.warn(`⚠️  Erreur ORS geocode "${nomVille}" → fallback API France`);
      return this.geocoderVilleApiFr(nomVille);
    }
  }

  // ─── Géocodage fallback API Gouvernement français ───────────────────────────

  private async geocoderVilleApiFr(nomVille: string): Promise<[number, number]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<GeoApiCommune[]>(
          `https://geo.api.gouv.fr/communes`,
          {
            params: {
              nom:    nomVille,
              fields: 'nom,centre,population,codesPostaux',
              boost:  'population',
              limit:  10,
            },
          },
        ),
      );

      if (!response.data?.length) {
        throw new HttpException(
          `Ville "${nomVille}" non trouvée en France`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const villesTriees = response.data
        .filter((v) => v.centre?.coordinates)
        .sort((a, b) => (b.population ?? 0) - (a.population ?? 0));

      if (!villesTriees.length) {
        throw new HttpException(
          `Ville "${nomVille}" non trouvée en France`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const ville  = villesTriees[0];
      const coords = ville.centre!.coordinates!;
      const [lon, lat] = coords;

      if (lon < -5 || lon > 10 || lat < 41 || lat > 52) {
        this.logger.warn(`⚠️  Coordonnées suspectes pour "${nomVille}": [${lon}, ${lat}]`);
      }

      this.logger.debug(`✅ Géocodage API France "${ville.nom}" (pop: ${ville.population ?? '?'}): [${lon}, ${lat}]`);
      return [lon, lat];

    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const err = error as OrsError;
      throw new HttpException(
        `Erreur de géocodage pour "${nomVille}": ${err.message ?? 'Erreur inconnue'}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ─── Calcul frais de péage ──────────────────────────────────────────────────

  private calculerFraisPeage(distanceKm: number, typeVehicule?: string): number {
    const classe  = CLASSE_VEHICULE[typeVehicule ?? ''] ?? 1;
    const prixKm  = TARIF_PAR_CLASSE[classe] ?? this.prixParKm;
    const resultat = this.fraisBase + distanceKm * prixKm;

    this.logger.debug(`🔍 Péage | base=${this.fraisBase} | dist=${distanceKm} | tarif=${prixKm} | classe=${classe} | total=${resultat}`);
    return resultat;
  }

  // ─── Normalisation coordonnées ──────────────────────────────────────────────

  /**
   * ORS attend [longitude, latitude].
   * Détecte automatiquement si les coords sont inversées (cas Tunisie : lng≈7-12, lat≈30-38).
   */
  private normalizeCoords(coords: [number, number]): [number, number] {
    const [a, b] = coords;
    const looksLikeLat = Math.abs(a) > 12 && Math.abs(b) <= 12;
    if (looksLikeLat) {
      this.logger.warn(`⚠️  Coords inversées [${a}, ${b}] → correction [${b}, ${a}]`);
      return [b, a];
    }
    return [a, b];
  }

  // ─── Formatage durée ────────────────────────────────────────────────────────

  private formaterDuree(secondes: number): string {
    const heures  = Math.floor(secondes / 3600);
    const minutes = Math.floor((secondes % 3600) / 60);
    if (heures === 0) return `${minutes}min`;
    return `${heures}h${minutes.toString().padStart(2, '0')}`;
  }
}