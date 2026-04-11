// src/Module/reservations-mission/resolvers/reservations-mission.resolver.ts
import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards, BadRequestException } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ReservationMissionEntity } from './entities/reservations-mission.entity';
import { ReservationsMissionService } from './reservations-mission.service';
import { CreateReservationInput } from './dto/create-reservations-mission.input';
import { ReservationResponse } from './types/reservation-response.type';

@Resolver(() => ReservationMissionEntity)
export class ReservationsMissionResolver {
  constructor(
    private readonly reservationsMissionService: ReservationsMissionService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * ✅ Créer une réservation
   */
  @Mutation(() => ReservationResponse, { // ✅ Changer le type de retour
    description: 'Créer une nouvelle réservation de mission',
  })
  @UseGuards(GqlAuthGuard)
  async createReservation(
    @Args('input') createReservationInput: CreateReservationInput,
    @CurrentUser() user: any,
  ): Promise<ReservationResponse> { // ✅ Typage explicite
    console.log('🔍 User reçu dans resolver:', user);

    // Vérifier que l'utilisateur existe
    if (!user || (!user.id && !user.sub)) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    const userId = user.id || user.sub;
    console.log('🔍 userId final:', userId);

    // Rechercher l'adhérent
    const adherent = await this.prisma.adherent.findUnique({
      where: { userId },
    });

    console.log('📋 Adherent trouvé:', adherent);

    if (!adherent) {
      throw new BadRequestException(
        'Vous devez être adhérent pour réserver une mission',
      );
    }

    // ✅ Appeler le service et retourner directement
    return this.reservationsMissionService.createReservation(
      adherent.id,
      createReservationInput,
    );
  }

  /**
   * ✅ Mes réservations
   */
  @Query(() => [ReservationMissionEntity], {
    name: 'myReservations',
    description: "Récupérer toutes les réservations de l'adhérent connecté",
  })
  @UseGuards(GqlAuthGuard)
  async getMyReservations(@CurrentUser() user: any) {
    if (!user || (!user.id && !user.sub)) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    const userId = user.id || user.sub;

    const adherent = await this.prisma.adherent.findUnique({
      where: { userId },
    });

    if (!adherent) {
      throw new BadRequestException('Adhérent non trouvé');
    }

    return this.reservationsMissionService.getReservationsByAdherent(
      adherent.id,
    );
  }

  /**
   * ✅ Réservation par ID
   */
  @Query(() => ReservationMissionEntity, {
    name: 'reservationById',
    description: 'Récupérer une réservation par son ID',
  })
  @UseGuards(GqlAuthGuard)
  async getReservationById(@Args('id') id: string) {
    return this.reservationsMissionService.getReservationById(id);
  }

  /**
   * ✅ Toutes les réservations (admin/partenaire)
   */
  @Query(() => [ReservationMissionEntity], {
    name: 'allReservations',
    description: 'Récupérer toutes les réservations (admin/partenaire)',
  })
  @UseGuards(GqlAuthGuard)
  async getAllReservations(@CurrentUser() user: any) {
    // TODO: Ajouter vérification du rôle (admin ou partenaire uniquement)
    return this.reservationsMissionService.getAllReservations();
  }

  /**
   * ✅ Annuler une réservation (adhérent)
   */
  @Mutation(() => ReservationMissionEntity, {
    description: 'Annuler une réservation (adhérent)',
  })
  @UseGuards(GqlAuthGuard)
  async cancelReservation(@Args('id') id: string, @CurrentUser() user: any) {
    if (!user || (!user.id && !user.sub)) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    const userId = user.id || user.sub;

    const adherent = await this.prisma.adherent.findUnique({
      where: { userId },
    });

    if (!adherent) {
      throw new BadRequestException('Adhérent non trouvé');
    }

    return this.reservationsMissionService.cancelReservation(id, adherent.id);
  }

  /**
   * ✅ Confirmer une réservation (partenaire)
   */
  @Mutation(() => ReservationMissionEntity, {
    description: 'Confirmer une réservation (partenaire)',
  })
  @UseGuards(GqlAuthGuard)
  async confirmReservation(@Args('id') id: string, @CurrentUser() user: any) {
    if (!user || (!user.id && !user.sub)) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    const userId = user.id || user.sub;

    const partenaire = await this.prisma.partenaire.findUnique({
      where: { userId },
    });

    if (!partenaire) {
      throw new BadRequestException(
        'Vous devez être partenaire pour confirmer une réservation',
      );
    }

    return this.reservationsMissionService.confirmReservation(
      id,
      partenaire.id,
    );
  }

  /**
   * ✅ Refuser une réservation (partenaire)
   */
  @Mutation(() => ReservationMissionEntity, {
    description: 'Refuser une réservation avec motif (partenaire)',
  })
  @UseGuards(GqlAuthGuard)
  async refuseReservation(
    @Args('id') id: string,
    @Args('motifRefus') motifRefus: string,
    @CurrentUser() user: any,
  ) {
    if (!user || (!user.id && !user.sub)) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    const userId = user.id || user.sub;

    const partenaire = await this.prisma.partenaire.findUnique({
      where: { userId },
    });

    if (!partenaire) {
      throw new BadRequestException(
        'Vous devez être partenaire pour refuser une réservation',
      );
    }

    return this.reservationsMissionService.refuseReservation(
      id,
      partenaire.id,
      motifRefus,
    );
  }
}
