// src/Module/alertes/alertes.resolver.ts (VERSION COMPLÈTE)

import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
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

  // ============================================
  // QUERIES
  // ============================================

  /**
   * ✅ Récupérer TOUTES les alertes (admin/public)
   */
  @Query(() => [AlerteGeographique], { 
    description: 'Récupérer toutes les alertes de tous les utilisateurs' 
  })
  async getAllAlertes(): Promise<AlerteGeographique[]> {
    return this.alertesService.getAllAlertes();
  }

  /**
   * ✅ Récupérer MES alertes (authentifié)
   */
  @Query(() => [AlerteGeographique], { 
    description: 'Récupérer toutes mes alertes' 
  })
  @UseGuards(GqlAuthGuard)
  async getMyAlertes(@CurrentUser() user: any): Promise<AlerteGeographique[]> {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');
    return this.alertesService.getAlertesByUser(userId);
  }

  /**
   * ✅ Récupérer MES alertes AVEC tokens FCM
   */
  @Query(() => [AlerteGeographique], { 
    description: 'Récupérer toutes mes alertes avec les tokens FCM' 
  })
  @UseGuards(GqlAuthGuard)
  async getMyAlertesByUserWithTokens(@CurrentUser() user: any) {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');
    return this.alertesService.getAlertesByUserWithTokens(userId);
  }

  /**
   * ✅ Récupérer une alerte par ID
   */
  @Query(() => AlerteGeographique, { nullable: true, description: 'Récupérer une alerte par son ID' })
  async getAlerteById(
    @Args('id', { type: () => String }) id: string,
  ): Promise<AlerteGeographique | null> {
    if (!id) throw new BadRequestException('ID requis');
    return this.alertesService.getAlerteById(id);
  }

  /**
   * ✅ Récupérer les statistiques des alertes
   */
  @Query(() => StatsAlertes, { description: 'Récupérer les statistiques des alertes' })
  async getStatsAlertes(): Promise<StatsAlertes> {
    return this.alertesService.getStatsAlertes();
  }

  /**
   * ✅ Récupérer l'historique de mes notifications
   */
  @Query(() => [NotificationAlerte], { description: 'Récupérer l\'historique de mes notifications' })
  @UseGuards(GqlAuthGuard)
  async getMyNotificationsHistory(
    @CurrentUser() user: any,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 50 }) limit: number,
  ): Promise<NotificationAlerte[]> {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');
    return this.alertesService.getNotificationsByUser(userId, limit);
  }

  /**
   * ✅ Vérifier les nouvelles missions
   */
  @Query(() => [AlerteGeographique], { description: 'Vérifier les nouvelles missions correspondant à mes alertes' })
  @UseGuards(GqlAuthGuard)
  async checkNouvellesMissions(
    @CurrentUser() user: any,
  ): Promise<AlerteGeographique[]> {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');
    return this.alertesService.checkNouvellesMissions(userId);
  }

  /**
   * ✅ [ADMIN] Valider tous les tokens Firebase
   */
  @Query(() => Object, { description: '[ADMIN] Valider tous les tokens Firebase Cloud Messaging' })
  @UseGuards(GqlAuthGuard)
  async validateAllFcmTokens(@CurrentUser() user: any) {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');
    
    // ✅ Vérifier que c'est un admin (adapter selon votre système)
    if (!user.isAdmin && user.role !== 'ADMIN') {
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }

    return this.alertesService.validateAllTokens();
  }

  // ============================================
  // MUTATIONS - CRÉATION D'ALERTES
  // ============================================

  /**
   * ✅ Créer une alerte géographique
   */
  @Mutation(() => AlerteGeographique, { description: 'Créer une alerte géographique' })
  @UseGuards(GqlAuthGuard)
  async createAlerteGeographique(
    @CurrentUser() user: any,
    @Args('input', { type: () => CreateAlerteGeographiqueInput })
    input: CreateAlerteGeographiqueInput,
  ): Promise<AlerteGeographique> {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');

    // ✅ Validation des champs obligatoires
    if (!input.villeNom || input.latitude === undefined || input.longitude === undefined || input.rayon === undefined) {
      throw new BadRequestException('Champs obligatoires manquants: villeNom, latitude, longitude, rayon');
    }

    if (input.rayon < 1 || input.rayon > 500) {
      throw new BadRequestException('Le rayon doit être entre 1 et 500 km');
    }

    console.log(`📍 Création alerte géographique pour user ${userId}:`);
    console.log(`   Ville: ${input.villeNom}, Rayon: ${input.rayon}km`);
    console.log(`   Email: ${input.emailActif}, Push: ${input.pushActif}`);

    return this.alertesService.creerAlerteGeographique(
      userId,
      input.villeNom,
      input.latitude,
      input.longitude,
      input.rayon,
      input.emailActif ?? false,
      input.pushActif ?? false,
      input.fcmToken,
      input.dateDepart,
      input.dateDepartMax,
    );
  }

  /**
   * ✅ Créer une alerte trajet
   */
  @Mutation(() => AlerteGeographique, { description: 'Créer une alerte trajet' })
  @UseGuards(GqlAuthGuard)
  async createAlerteTrajet(
    @CurrentUser() user: any,
    @Args('input', { type: () => CreateAlerteTrajetInput })
    input: CreateAlerteTrajetInput,
  ): Promise<AlerteGeographique> {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');

    // ✅ Validation des champs obligatoires
    const requiredFields = [
      'villeDepartNom', 'latitudeDepart', 'longitudeDepart',
      'villeArriveeNom', 'latitudeArrivee', 'longitudeArrivee', 'rayon',
    ];

    for (const field of requiredFields) {
      if ((input as any)[field] === undefined) {
        throw new BadRequestException(`Champ obligatoire manquant: ${field}`);
      }
    }

    if (input.rayon < 1 || input.rayon > 500) {
      throw new BadRequestException('Le rayon doit être entre 1 et 500 km');
    }

    console.log(`🚗 Création alerte trajet pour user ${userId}:`);
    console.log(`   ${input.villeDepartNom} → ${input.villeArriveeNom}, Rayon: ${input.rayon}km`);
    console.log(`   Email: ${input.emailActif}, Push: ${input.pushActif}`);

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

  // ============================================
  // MUTATIONS - FCM TOKEN (TRÈS IMPORTANT!)
  // ============================================

  /**
   * ✅ Mettre à jour le token FCM (CRUCIAL POUR LES NOTIFICATIONS)
   */
  @Mutation(() => Boolean, { 
    description: 'Mettre à jour le token Firebase Cloud Messaging pour les notifications push' 
  })
  @UseGuards(GqlAuthGuard)
  async updateFcmToken(
    @CurrentUser() user: any,
    @Args('fcmToken') fcmToken: string,
  ): Promise<boolean> {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');

    if (!fcmToken || fcmToken.trim().length === 0) {
      throw new BadRequestException('FCM Token invalide ou manquant');
    }

    console.log(`🔄 Mise à jour FCM Token pour user ${userId}`);
    console.log(`   Token: ${fcmToken.substring(0, 30)}...`);

    const result = await this.alertesService.updateFcmToken(userId, fcmToken);
    return result.success;
  }

  // ============================================
  // MUTATIONS - GESTION DES ALERTES
  // ============================================

  /**
   * ✅ Désactiver TOUTES mes alertes
   */
  @Mutation(() => Boolean, { description: 'Désactiver toutes mes alertes' })
  @UseGuards(GqlAuthGuard)
  async desactiverMesAlertes(@CurrentUser() user: any): Promise<boolean> {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');

    console.log(`🔴 Désactivation de toutes les alertes pour user ${userId}`);
    const result = await this.alertesService.desactiverAlerte(userId);
    return result.count > 0;
  }

  /**
   * ✅ Supprimer une alerte par ID
   */
  @Mutation(() => Boolean, { description: 'Supprimer une alerte par son ID' })
  @UseGuards(GqlAuthGuard)
  async supprimerAlerte(
    @CurrentUser() user: any,
    @Args('id', { type: () => String }) id: string,
  ): Promise<boolean> {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');
    if (!id) throw new BadRequestException('ID requis');

    try {
      // ✅ Vérifier que l'alerte appartient à l'utilisateur
      const alerte = await this.alertesService.getAlerteById(id);
      if (!alerte || alerte.userId !== userId) {
        throw new ForbiddenException('Vous n\'avez pas accès à cette alerte');
      }

      await this.alertesService.supprimerAlerte(id);
      console.log(`🗑️ Alerte ${id} supprimée`);
      return true;
    } catch (error: any) {
      if (error instanceof ForbiddenException) throw error;
      throw new NotFoundException(`Alerte #${id} introuvable`);
    }
  }

  /**
   * ✅ Activer une alerte par ID
   */
  @Mutation(() => AlerteGeographique, { description: 'Activer une alerte par son ID' })
  @UseGuards(GqlAuthGuard)
  async activerAlerte(
    @CurrentUser() user: any,
    @Args('id', { type: () => String }) id: string,
  ): Promise<AlerteGeographique> {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');
    if (!id) throw new BadRequestException('ID requis');

    try {
      // ✅ Vérifier que l'alerte appartient à l'utilisateur
      const alerte = await this.alertesService.getAlerteById(id);
      if (!alerte || alerte.userId !== userId) {
        throw new ForbiddenException('Vous n\'avez pas accès à cette alerte');
      }

      console.log(`✅ Activation alerte ${id}`);
      return await this.alertesService.activerAlerte(id);
    } catch (error: any) {
      if (error instanceof ForbiddenException) throw error;
      throw new NotFoundException(`Alerte #${id} introuvable`);
    }
  }

  /**
   * ✅ Désactiver une alerte par ID
   */
  @Mutation(() => Boolean, { description: 'Désactiver une alerte par son ID' })
  @UseGuards(GqlAuthGuard)
  async desactiverAlerte(
    @CurrentUser() user: any,
    @Args('id', { type: () => String }) id: string,
  ): Promise<boolean> {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');
    if (!id) throw new BadRequestException('ID requis');

    try {
      // ✅ Vérifier que l'alerte appartient à l'utilisateur
      const alerte = await this.alertesService.getAlerteById(id);
      if (!alerte || alerte.userId !== userId) {
        throw new ForbiddenException('Vous n\'avez pas accès à cette alerte');
      }

      await this.alertesService.desactiverAlerte(userId);
      console.log(`🔴 Désactivation alerte ${id}`);
      return true;
    } catch (error: any) {
      if (error instanceof ForbiddenException) throw error;
      throw new NotFoundException(`Alerte #${id} introuvable`);
    }
  }

  /**
   * ✅ Modifier le rayon d'une alerte
   */
  @Mutation(() => AlerteGeographique, { description: 'Modifier le rayon d\'une alerte' })
  @UseGuards(GqlAuthGuard)
  async modifierRayonAlerte(
    @CurrentUser() user: any,
    @Args('id', { type: () => String }) id: string,
    @Args('rayon', { type: () => Int }) rayon: number,
  ): Promise<AlerteGeographique> {
    const userId = user?.id || user?.sub;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');
    if (!id) throw new BadRequestException('ID requis');
    if (rayon < 1 || rayon > 500) {
      throw new BadRequestException('Le rayon doit être entre 1 et 500 km');
    }

    try {
      // ✅ Vérifier que l'alerte appartient à l'utilisateur
      const alerte = await this.alertesService.getAlerteById(id);
      if (!alerte || alerte.userId !== userId) {
        throw new ForbiddenException('Vous n\'avez pas accès à cette alerte');
      }

      console.log(`📏 Modification rayon alerte ${id} → ${rayon}km`);
      return await this.alertesService.modifierRayon(id, rayon);
    } catch (error: any) {
      if (error instanceof ForbiddenException) throw error;
      throw new NotFoundException(`Alerte #${id} introuvable`);
    }
  }
}