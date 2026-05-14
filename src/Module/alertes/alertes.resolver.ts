// src/Module/alertes/alertes.resolver.ts
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { AlertesService } from './alertes.service';

import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AlerteGeographique } from './types/alerte-geographique.type';
import { StatsAlertes } from './types/stats-alertes.type';
import { NotificationAlerte } from './types/notification-alerte.type';
import { CreateAlerteGeographiqueInput } from './dto/create-alerte-geographique.input';
import { CreateAlerteTrajetInput } from './dto/create-alerte-trajet.input';


@Resolver(() => AlerteGeographique)
export class AlertesResolver {
  constructor(private readonly alertesService: AlertesService) {}

  @Query(() => [AlerteGeographique])
  async getAllAlertes(): Promise<AlerteGeographique[]> {
    return this.alertesService.getAllAlertes();
  }

  @Query(() => [AlerteGeographique])
  @UseGuards(GqlAuthGuard)
  async getMyAlertes(@CurrentUser() user: any): Promise<AlerteGeographique[]> {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');
    return this.alertesService.getAlertesByUser(userId);
  }

  @Query(() => AlerteGeographique, { nullable: true })
  async getAlerteById(
    @Args('id', { type: () => String }) id: string,
  ): Promise<AlerteGeographique | null> {
    if (!id) throw new BadRequestException('ID requis');
    return this.alertesService.getAlerteById(id);
  }

  @Query(() => StatsAlertes)
  async getStatsAlertes(): Promise<StatsAlertes> {
    return this.alertesService.getStatsAlertes();
  }

  @Query(() => [NotificationAlerte])
  @UseGuards(GqlAuthGuard)
  async getMyNotificationsHistory(
    @CurrentUser() user: any,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 50 }) limit: number,
  ): Promise<NotificationAlerte[]> {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');
    return this.alertesService.getNotificationsByUser(userId, limit);
  }

  @Query(() => [AlerteGeographique])
  @UseGuards(GqlAuthGuard)
  async checkNouvellesMissions(
    @CurrentUser() user: any,
  ): Promise<AlerteGeographique[]> {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');
    return this.alertesService.checkNouvellesMissions(userId);
  }

  @Mutation(() => AlerteGeographique)
  @UseGuards(GqlAuthGuard)
  async createAlerteGeographique(
    @CurrentUser() user: any,
    @Args('input', { type: () => CreateAlerteGeographiqueInput })
    input: CreateAlerteGeographiqueInput,
  ): Promise<AlerteGeographique> {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');

    if (!input.villeNom || input.latitude === undefined || input.longitude === undefined || input.rayon === undefined) {
      throw new BadRequestException('Champs obligatoires manquants: villeNom, latitude, longitude, rayon');
    }

    return this.alertesService.creerAlerteGeographique(
      userId,
      input.villeNom,
      input.latitude,
      input.longitude,
      input.rayon,
      input.emailActif ?? false,
      input.pushActif ?? false,
      input.fcmToken,
      input.dateDepart,      // ✅ ajout
      input.dateDepartMax,   // ✅ ajout
    );
  }

  @Mutation(() => AlerteGeographique)
  @UseGuards(GqlAuthGuard)
  async createAlerteTrajet(
    @CurrentUser() user: any,
    @Args('input', { type: () => CreateAlerteTrajetInput })
    input: CreateAlerteTrajetInput,
  ): Promise<AlerteGeographique> {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');

    const requiredFields = [
      'villeDepartNom', 'latitudeDepart', 'longitudeDepart',
      'villeArriveeNom', 'latitudeArrivee', 'longitudeArrivee', 'rayon',
    ];

    for (const field of requiredFields) {
      if ((input as any)[field] === undefined) {
        throw new BadRequestException(`Champ obligatoire manquant: ${field}`);
      }
    }

    return this.alertesService.creerAlerteTrajet(
      userId,
      input.villeDepartNom,
      input.latitudeDepart,
      input.longitudeDepart,
      input.villeArriveeNom,
      input.latitudeArrivee,
      input.longitudeArrivee,
      input.rayon,
      input.dateDepart,
      input.dateDepartMax,
      input.emailActif ?? false,
      input.pushActif ?? false,
      input.fcmToken,
    );
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async desactiverMesAlertes(@CurrentUser() user: any): Promise<boolean> {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');
    const result = await this.alertesService.desactiverAlerte(userId);
    return result.count > 0;
  }

  @Mutation(() => Boolean)
  async supprimerAlerte(
    @Args('id', { type: () => String }) id: string,
  ): Promise<boolean> {
    if (!id) throw new BadRequestException('ID requis');
    try {
      await this.alertesService.supprimerAlerte(id);
      return true;
    } catch {
      throw new NotFoundException(`Alerte #${id} introuvable`);
    }
  }

  @Mutation(() => AlerteGeographique)
  async activerAlerte(
    @Args('id', { type: () => String }) id: string,
  ): Promise<AlerteGeographique> {
    if (!id) throw new BadRequestException('ID requis');
    try {
      return await this.alertesService.activerAlerte(id);
    } catch {
      throw new NotFoundException(`Alerte #${id} introuvable`);
    }
  }

  @Mutation(() => AlerteGeographique)
  async modifierRayonAlerte(
    @Args('id', { type: () => String }) id: string,
    @Args('rayon', { type: () => Int }) rayon: number,
  ): Promise<AlerteGeographique> {
    if (!id || rayon < 0) throw new BadRequestException('ID et rayon valides requis');
    try {
      return await this.alertesService.modifierRayon(id, rayon);
    } catch {
      throw new NotFoundException(`Alerte #${id} introuvable`);
    }
  }
}