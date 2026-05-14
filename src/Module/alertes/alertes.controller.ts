// src/Module/alertes/alertes.controller.ts
import {
  Controller, Get, Post, Delete, Body, Param,
  HttpException, HttpStatus, ParseIntPipe, InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { AlertesService } from './alertes.service';
import { CreateAlerteGeographiqueDto, CreateAlerteTrajetDto } from './dto/create-alerte.dto';
@ApiTags('Alertes')
@Controller('api/alertes')
export class AlertesController {
  constructor(private readonly alertesService: AlertesService) {}

  @Get('all')
  @ApiOperation({ summary: 'Récupérer toutes les alertes' })
  @ApiResponse({ status: 200 })
  async getAllAlertes() {
    return this.alertesService.getAllAlertes();
  }

  @Post('geographique')
  @ApiOperation({ summary: 'Créer une alerte géographique' })
  @ApiBody({ type: CreateAlerteGeographiqueDto })
  @ApiResponse({ status: 201 })
  async creerAlerteGeographique(@Body() dto: CreateAlerteGeographiqueDto) {
    try {
      const alerte = await this.alertesService.creerAlerteGeographique(
        dto.userId, dto.villeNom, dto.latitude, dto.longitude, dto.rayon,
        dto.emailActif ?? false, dto.pushActif ?? false, dto.fcmToken,
        dto.dateDepart, dto.dateDepartMax,   // ✅ ajout
      );
      return { success: true, message: `Alerte créée pour ${dto.villeNom} (${dto.rayon} km)`, data: alerte };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? `Erreur: ${error.message}` : 'Erreur interne',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('trajet')
  @ApiOperation({ summary: 'Créer une alerte trajet' })
  @ApiBody({ type: CreateAlerteTrajetDto })
  @ApiResponse({ status: 201 })
  async creerAlerteTrajet(@Body() dto: CreateAlerteTrajetDto) {
    try {
      const alerte = await this.alertesService.creerAlerteTrajet(
        dto.userId, dto.villeDepartNom, dto.latitudeDepart, dto.longitudeDepart,
        dto.villeArriveeNom, dto.latitudeArrivee, dto.longitudeArrivee, dto.rayon,
        dto.dateDepart, dto.dateDepartMax,
        dto.emailActif ?? false, dto.pushActif ?? false, dto.fcmToken,
      );
      return { success: true, message: `Alerte créée pour ${dto.villeDepartNom} → ${dto.villeArriveeNom}`, data: alerte };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? `Erreur: ${error.message}` : 'Erreur interne',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats/global')
  @ApiOperation({ summary: 'Statistiques globales des alertes' })
  async getStatsAlertes() {
    try {
      return { success: true, data: await this.alertesService.getStatsAlertes() };
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? `Erreur: ${error.message}` : 'Erreur interne',
      );
    }
  }

  @Get('notifications/user/:userId')
  @ApiOperation({ summary: 'Historique des notifications d\'un utilisateur' })
  @ApiParam({ name: 'userId', type: 'number' })
  async getNotificationsByUser(@Param('userId', ParseIntPipe) userId: number) {
    try {
      const notifications = await this.alertesService.getNotificationsByUser(userId);
      return { success: true, count: notifications.length, data: notifications };
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? `Erreur: ${error.message}` : 'Erreur interne',
      );
    }
  }

  @Get('check/:userId')
  @ApiOperation({ summary: 'Vérifier nouvelles missions (polling)' })
  @ApiParam({ name: 'userId', type: 'number' })
  async checkNouvellesMissions(@Param('userId', ParseIntPipe) userId: number) {
    try {
      const result = await this.alertesService.checkNouvellesMissions(userId);
      return { success: true, count: result.length, data: result };  // ✅ corrigé
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? `Erreur: ${error.message}` : 'Erreur interne',
      );
    }
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Alertes d\'un utilisateur' })
  @ApiParam({ name: 'userId', type: 'number' })
  async getAlertesByUser(@Param('userId', ParseIntPipe) userId: number) {
    try {
      const alertes = await this.alertesService.getAlertesByUser(userId);
      return { success: true, count: alertes.length, data: alertes };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? `Erreur: ${error.message}` : 'Erreur interne',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':alerteId')
  @ApiOperation({ summary: 'Récupérer une alerte par ID' })
  @ApiParam({ name: 'alerteId', type: 'string' })
  async getAlerteById(@Param('alerteId') alerteId: string) {
    try {
      const alerte = await this.alertesService.getAlerteById(alerteId);
      if (!alerte) throw new HttpException('Alerte non trouvée', HttpStatus.NOT_FOUND);
      return { success: true, data: alerte };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? `Erreur: ${error.message}` : 'Erreur interne',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('user/:userId')
  @ApiOperation({ summary: 'Désactiver toutes les alertes d\'un utilisateur' })
  @ApiParam({ name: 'userId', type: 'number' })
  async desactiverAlerte(@Param('userId', ParseIntPipe) userId: number) {
    try {
      await this.alertesService.desactiverAlerte(userId);
      return { success: true, message: 'Alerte désactivée avec succès' };
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? `Erreur: ${error.message}` : 'Erreur interne',
      );
    }
  }

  @Delete(':alerteId')
  @ApiOperation({ summary: 'Supprimer une alerte' })
  @ApiParam({ name: 'alerteId', type: 'string' })
  async supprimerAlerte(@Param('alerteId') alerteId: string) {
    try {
      await this.alertesService.supprimerAlerte(alerteId);
      return { success: true, message: 'Alerte supprimée avec succès' };
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? `Erreur: ${error.message}` : 'Erreur interne',
      );
    }
  }

  @Post('activate/:alerteId')
  @ApiOperation({ summary: 'Activer une alerte' })
  @ApiParam({ name: 'alerteId', type: 'string' })
  async activerAlerte(@Param('alerteId') alerteId: string) {
    try {
      await this.alertesService.activerAlerte(alerteId);
      return { success: true, message: 'Alerte activée avec succès' };
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? `Erreur: ${error.message}` : 'Erreur interne',
      );
    }
  }

  @Post('update-rayon/:alerteId')
  @ApiOperation({ summary: 'Modifier le rayon d\'une alerte' })
  @ApiParam({ name: 'alerteId', type: 'string' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { rayon: { type: 'number', example: 100, minimum: 1, maximum: 500 } },
    },
  })
  async modifierRayon(
    @Param('alerteId') alerteId: string,
    @Body('rayon', ParseIntPipe) rayon: number,
  ) {
    try {
      const alerte = await this.alertesService.modifierRayon(alerteId, rayon);
      return { success: true, message: `Rayon modifié à ${rayon} km`, data: alerte };
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? `Erreur: ${error.message}` : 'Erreur interne',
      );
    }
  }
}