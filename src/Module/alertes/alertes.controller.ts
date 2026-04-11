// src/Module/alertes/alertes.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Body, 
  Param, 
  HttpException,
  HttpStatus,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { AlertesService } from './alertes.service';
import { CreateAlerteGeographiqueDto, CreateAlerteTrajetDto } from './dto/create-alerte.dto';

@ApiTags('Alertes')
@Controller('api/alertes')
export class AlertesController {
  constructor(private readonly alertesService: AlertesService) {}

  // ✅ Créer une alerte géographique (Type 1)
// src/Module/alertes/alertes.controller.ts

@Get('all')
@ApiOperation({ summary: 'Récupérer toutes les alertes de tous les utilisateurs' })
@ApiResponse({ status: 200, description: 'Liste complète des alertes' })
async getAllAlertes() {
  return this.alertesService.getAllAlertes();
}
  @Post('geographique')
  @ApiOperation({ summary: 'Créer une alerte géographique' })
  @ApiBody({ type: CreateAlerteGeographiqueDto })
  async creerAlerteGeographique(@Body() dto: CreateAlerteGeographiqueDto) {
    try {
      const alerte = await this.alertesService.creerAlerteGeographique(
        dto.userId,
        dto.villeNom,
        dto.latitude,
        dto.longitude,
        dto.rayon,
      );

      return {
        success: true,
        message: `Alerte créée pour ${dto.villeNom} (${dto.rayon} km)`,
        data: alerte,
      };
    } catch (error) {
      throw new HttpException(
        `Erreur: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

@Post('trajet')
@ApiOperation({ summary: 'Créer une alerte trajet' })
@ApiBody({ type: CreateAlerteTrajetDto })
async creerAlerteTrajet(@Body() dto: CreateAlerteTrajetDto) {
  try {
    const alerte = await this.alertesService.creerAlerteTrajet(
      dto.userId,
      dto.villeDepartNom,
      dto.latitudeDepart,
      dto.longitudeDepart,
      dto.villeArriveeNom,
      dto.latitudeArrivee,
      dto.longitudeArrivee,
      dto.rayon,
      dto.dateDepart, // ✅ Ajout
      dto.dateDepartMax, // ✅ Ajout
    );

    return {
      success: true,
      message: `Alerte créée pour ${dto.villeDepartNom} → ${dto.villeArriveeNom}`,
      data: alerte,
    };
  } catch (error) {
    throw new HttpException(
      `Erreur: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}


  // ✅ Récupérer les alertes d'un utilisateur
  @Get('user/:userId')
  @ApiOperation({ summary: 'Récupérer toutes les alertes d\'un utilisateur' })
  @ApiParam({ name: 'userId', type: 'number', description: 'ID de l\'utilisateur', example: 1 })
  @ApiResponse({ status: 200, description: 'Liste des alertes récupérée' })
  @ApiResponse({ status: 500, description: 'Erreur serveur' })
  async getAlertesByUser(@Param('userId', ParseIntPipe) userId: number) {
    try {
      const alertes = await this.alertesService.getAlertesByUser(userId);

      return {
        success: true,
        count: alertes.length,
        data: alertes,
      };
    } catch (error) {
      throw new HttpException(
        `Erreur lors de la récupération des alertes: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ Récupérer une alerte spécifique
  @Get(':alerteId')
  @ApiOperation({ summary: 'Récupérer une alerte spécifique par son ID' })
  @ApiParam({ name: 'alerteId', type: 'string', description: 'ID de l\'alerte', example: 'clxxx123456' })
  @ApiResponse({ status: 200, description: 'Alerte trouvée' })
  @ApiResponse({ status: 404, description: 'Alerte non trouvée' })
  @ApiResponse({ status: 500, description: 'Erreur serveur' })
  async getAlerteById(@Param('alerteId') alerteId: string) {
    try {
      const alerte = await this.alertesService.getAlerteById(alerteId);

      if (!alerte) {
        throw new HttpException('Alerte non trouvée', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: alerte,
      };
    } catch (error) {
      throw new HttpException(
        `Erreur lors de la récupération de l'alerte: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ Désactiver l'alerte d'un utilisateur
  @Delete('user/:userId')
  @ApiOperation({ summary: 'Désactiver toutes les alertes d\'un utilisateur' })
  @ApiParam({ name: 'userId', type: 'number', description: 'ID de l\'utilisateur', example: 1 })
  @ApiResponse({ status: 200, description: 'Alertes désactivées' })
  @ApiResponse({ status: 500, description: 'Erreur serveur' })
  async desactiverAlerte(@Param('userId', ParseIntPipe) userId: number) {
    try {
      await this.alertesService.desactiverAlerte(userId);

      return {
        success: true,
        message: 'Alerte désactivée avec succès',
      };
    } catch (error) {
      throw new HttpException(
        `Erreur lors de la désactivation de l'alerte: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ Supprimer une alerte spécifique
  @Delete(':alerteId')
  @ApiOperation({ summary: 'Supprimer une alerte spécifique' })
  @ApiParam({ name: 'alerteId', type: 'string', description: 'ID de l\'alerte à supprimer', example: 'clxxx123456' })
  @ApiResponse({ status: 200, description: 'Alerte supprimée' })
  @ApiResponse({ status: 500, description: 'Erreur serveur' })
  async supprimerAlerte(@Param('alerteId') alerteId: string) {
    try {
      await this.alertesService.supprimerAlerte(alerteId);

      return {
        success: true,
        message: 'Alerte supprimée avec succès',
      };
    } catch (error) {
      throw new HttpException(
        `Erreur lors de la suppression de l'alerte: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ Vérifier les nouvelles missions pour un utilisateur (polling)
  @Get('check/:userId')
  @ApiOperation({ summary: 'Vérifier les nouvelles missions correspondant aux alertes (polling)' })
  @ApiParam({ name: 'userId', type: 'number', description: 'ID de l\'utilisateur', example: 1 })
  @ApiResponse({ status: 200, description: 'Missions vérifiées' })
  @ApiResponse({ status: 500, description: 'Erreur serveur' })
  async checkNouvellesMissions(@Param('userId', ParseIntPipe) userId: number) {
    try {
      const result = await this.alertesService.checkNouvellesMissions(userId);

      return {
        success: true,
        count: result.nouvellesMissions.length,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        `Erreur lors de la vérification des missions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ Statistiques des alertes
  @Get('stats/global')
  @ApiOperation({ summary: 'Obtenir les statistiques globales des alertes' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées' })
  @ApiResponse({ status: 500, description: 'Erreur serveur' })
  async getStatsAlertes() {
    try {
      const stats = await this.alertesService.getStatsAlertes();

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new HttpException(
        `Erreur lors de la récupération des stats: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ Historique des notifications d'un utilisateur
  @Get('notifications/user/:userId')
  @ApiOperation({ summary: 'Récupérer l\'historique des notifications d\'un utilisateur' })
  @ApiParam({ name: 'userId', type: 'number', description: 'ID de l\'utilisateur', example: 1 })
  @ApiResponse({ status: 200, description: 'Notifications récupérées' })
  @ApiResponse({ status: 500, description: 'Erreur serveur' })
  async getNotificationsByUser(@Param('userId', ParseIntPipe) userId: number) {
    try {
      const notifications = await this.alertesService.getNotificationsByUser(userId);

      return {
        success: true,
        count: notifications.length,
        data: notifications,
      };
    } catch (error) {
      throw new HttpException(
        `Erreur lors de la récupération des notifications: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ Activer/Réactiver une alerte existante
  @Post('activate/:alerteId')
  @ApiOperation({ summary: 'Activer ou réactiver une alerte existante' })
  @ApiParam({ name: 'alerteId', type: 'string', description: 'ID de l\'alerte', example: 'clxxx123456' })
  @ApiResponse({ status: 200, description: 'Alerte activée' })
  @ApiResponse({ status: 500, description: 'Erreur serveur' })
  async activerAlerte(@Param('alerteId') alerteId: string) {
    try {
      await this.alertesService.activerAlerte(alerteId);

      return {
        success: true,
        message: 'Alerte activée avec succès',
      };
    } catch (error) {
      throw new HttpException(
        `Erreur lors de l'activation de l'alerte: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ Modifier le rayon d'une alerte
  @Post('update-rayon/:alerteId')
  @ApiOperation({ summary: 'Modifier le rayon d\'une alerte existante' })
  @ApiParam({ name: 'alerteId', type: 'string', description: 'ID de l\'alerte', example: 'clxxx123456' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        rayon: {
          type: 'number',
          example: 100,
          description: 'Nouveau rayon en km (1-500)',
          minimum: 1,
          maximum: 500
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Rayon modifié' })
  @ApiResponse({ status: 500, description: 'Erreur serveur' })
  async modifierRayon(
    @Param('alerteId') alerteId: string,
    @Body('rayon', ParseIntPipe) rayon: number,
  ) {
    try {
      const alerte = await this.alertesService.modifierRayon(alerteId, rayon);

      return {
        success: true,
        message: `Rayon modifié à ${rayon} km`,
        data: alerte,
      };
    } catch (error) {
      throw new HttpException(
        `Erreur lors de la modification du rayon: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
