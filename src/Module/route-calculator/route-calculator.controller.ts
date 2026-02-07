import { 
  Controller, 
  Get, 
  Query, 
  HttpException, 
  HttpStatus,
  ParseFloatPipe 
} from '@nestjs/common';
import { RouteCalculatorService } from './route-calculator.service';
import { RouteResult } from './dto/route-result.dto';

@Controller('route')
export class RouteCalculatorController {
  constructor(private readonly routeService: RouteCalculatorService) {}

  /**
   * Calcule la route entre deux villes
   * GET /route/villes?depart=Tunis&arrivee=Sfax&typeVehicule=BERLINE
   */
  @Get('villes')
  async calculerParVilles(
    @Query('depart') villeDepart: string,
    @Query('arrivee') villeArrivee: string,
    @Query('typeVehicule') typeVehicule?: string,
  ): Promise<RouteResult> {
    if (!villeDepart || !villeArrivee) {
      throw new HttpException(
        'Les paramètres "depart" et "arrivee" sont requis',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.routeService.calculerRouteParVilles(
      villeDepart,
      villeArrivee,
      typeVehicule,
    );
  }

  /**
   * Calcule la route avec des coordonnées GPS
   * GET /route/coordonnees?lonDepart=10.1&latDepart=36.8&lonArrivee=10.7&latArrivee=35.8
   */
  @Get('coordonnees')
  async calculerParCoordonnees(
    @Query('lonDepart', ParseFloatPipe) longitudeDepart: number,
    @Query('latDepart', ParseFloatPipe) latitudeDepart: number,
    @Query('lonArrivee', ParseFloatPipe) longitudeArrivee: number,
    @Query('latArrivee', ParseFloatPipe) latitudeArrivee: number,
    @Query('typeVehicule') typeVehicule?: string,
  ): Promise<RouteResult> {
    if (!longitudeDepart || !latitudeDepart || !longitudeArrivee || !latitudeArrivee) {
      throw new HttpException(
        'Toutes les coordonnées sont requises',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.routeService.calculerRoute(
      [longitudeDepart, latitudeDepart],
      [longitudeArrivee, latitudeArrivee],
      typeVehicule,
    );
  }
}
