// src/Module/reservations-mission/reservations-mission.resolver.ts
import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ReservationMissionEntity } from './entities/reservations-mission.entity';
import { ReservationsMissionService } from './reservations-mission.service';
import { CreateReservationInput } from './dto/create-reservations-mission.input';
import { ReservationResponse } from './types/reservation-response.type';

@Resolver(() => ReservationMissionEntity)
export class ReservationsMissionResolver {
  private readonly logger = new Logger(ReservationsMissionResolver.name);

  constructor(
    private readonly reservationsMissionService: ReservationsMissionService,
    private readonly prisma: PrismaService,
  ) {}

  // ─────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────

  private getUserId(user: any): number {
    if (!user || (!user.id && !user.sub)) {
      throw new BadRequestException('Utilisateur non authentifié');
    }
    return user.id || user.sub;
  }

  private async resolveRoles(userId: number) {
    const [adherent, agent, admin] = await Promise.all([
      this.prisma.adherent.findUnique({ where: { userId } }),
      this.prisma.agent.findUnique({ where: { userId } }),
      this.prisma.admin.findUnique({ where: { userId } }),
    ]);
    return { adherent, agent, admin };
  }

  // ─────────────────────────────────────────────
  // MUTATIONS — ADHÉRENT
  // ─────────────────────────────────────────────

  @Mutation(() => ReservationResponse, {
    description: 'Créer une nouvelle réservation de mission (adhérent)',
  })
  @UseGuards(GqlAuthGuard)
  async createReservation(
    @Args('input') createReservationInput: CreateReservationInput,
    @CurrentUser() user: any,
  ): Promise<ReservationResponse> {
    const userId = this.getUserId(user);
    this.logger.debug(`createReservation → userId: ${userId}`);

    const adherent = await this.prisma.adherent.findUnique({
      where: { userId },
    });

    if (!adherent) {
      throw new BadRequestException(
        'Vous devez être adhérent pour réserver une mission',
      );
    }

    return this.reservationsMissionService.createReservation(
      adherent.id,
      createReservationInput,
    );
  }

  @Mutation(() => ReservationMissionEntity, {
    description: 'Annuler une réservation dans les 24h (adhérent)',
  })
  @UseGuards(GqlAuthGuard)
  async cancelReservation(
    @Args('id') id: string,
    @Args('motifAnnulation', { nullable: true }) motifAnnulation: string,
    @CurrentUser() user: any,
  ) {
    const userId = this.getUserId(user);

    const adherent = await this.prisma.adherent.findUnique({
      where: { userId },
    });

    if (!adherent) {
      throw new BadRequestException('Adhérent non trouvé');
    }

    return this.reservationsMissionService.cancelReservation(
      id,
      adherent.id,
      motifAnnulation,
    );
  }

  @Mutation(() => ReservationMissionEntity, {
    description:
      "Confirmer une réservation acceptée par l'agent (adhérent — étape 2)",
  })
  @UseGuards(GqlAuthGuard)
  async confirmReservationByAdherent(
    @Args('id') id: string,
    @CurrentUser() user: any,
  ) {
    const userId = this.getUserId(user);

    const adherent = await this.prisma.adherent.findUnique({
      where: { userId },
    });

    if (!adherent) {
      throw new BadRequestException(
        'Vous devez être adhérent pour confirmer une réservation',
      );
    }

    // ✅ FIX: confirmReservationByAdherent (plus confirmReservation)
    return this.reservationsMissionService.confirmReservationByAdherent(
      id,
      adherent.id,
    );
  }

  @Mutation(() => ReservationMissionEntity, {
    description: "Demander une annulation après 24h (adhérent)",
  })
  @UseGuards(GqlAuthGuard)
  async requestCancellation(
    @Args('id') id: string,
    @Args('motifAnnulation') motifAnnulation: string,
    @CurrentUser() user: any,
  ) {
    const userId = this.getUserId(user);

    const adherent = await this.prisma.adherent.findUnique({
      where: { userId },
    });

    if (!adherent) {
      throw new BadRequestException('Adhérent non trouvé');
    }

    return this.reservationsMissionService.requestCancellation(
      id,
      adherent.id,
      motifAnnulation,
    );
  }

  // ─────────────────────────────────────────────
  // MUTATIONS — AGENT
  // ─────────────────────────────────────────────

  @Mutation(() => ReservationMissionEntity, {
    description: "Accepter une réservation EN_ATTENTE (agent — étape 1)",
  })
  @UseGuards(GqlAuthGuard)
  async acceptReservation(
    @Args('id') id: string,
    @CurrentUser() user: any,
  ) {
    const userId = this.getUserId(user);

    const agent = await this.prisma.agent.findUnique({ where: { userId } });

    if (!agent) {
      throw new BadRequestException(
        'Vous devez être agent pour accepter une réservation',
      );
    }

    // ✅ FIX: acceptReservation (remplace confirmReservation)
    return this.reservationsMissionService.acceptReservation(id, agent.id);
  }

  @Mutation(() => ReservationMissionEntity, {
    description: 'Refuser une réservation avec motif (agent)',
  })
  @UseGuards(GqlAuthGuard)
  async refuseReservation(
    @Args('id') id: string,
    @Args('motifRefus') motifRefus: string,
    @CurrentUser() user: any,
  ) {
    const userId = this.getUserId(user);

    const agent = await this.prisma.agent.findUnique({ where: { userId } });

    if (!agent) {
      throw new BadRequestException(
        'Vous devez être agent pour refuser une réservation',
      );
    }

    return this.reservationsMissionService.refuseReservation(
      id,
      agent.id,
      motifRefus,
    );
  }

  @Mutation(() => ReservationMissionEntity, {
    description: "Accepter une demande d'annulation (agent)",
  })
  @UseGuards(GqlAuthGuard)
  async acceptCancellationRequest(
    @Args('id') id: string,
    @CurrentUser() user: any,
  ) {
    const userId = this.getUserId(user);

    const agent = await this.prisma.agent.findUnique({ where: { userId } });

    if (!agent) {
      throw new BadRequestException(
        "Vous devez être agent pour traiter une demande d'annulation",
      );
    }

    return this.reservationsMissionService.acceptCancellationRequest(
      id,
      agent.id,
    );
  }

  @Mutation(() => ReservationMissionEntity, {
    description: "Refuser une demande d'annulation (agent)",
  })
  @UseGuards(GqlAuthGuard)
  async refuseCancellationRequest(
    @Args('id') id: string,
    @Args('motifRefus') motifRefus: string,
    @CurrentUser() user: any,
  ) {
    const userId = this.getUserId(user);

    const agent = await this.prisma.agent.findUnique({ where: { userId } });

    if (!agent) {
      throw new BadRequestException(
        "Vous devez être agent pour traiter une demande d'annulation",
      );
    }

    return this.reservationsMissionService.refuseCancellationRequest(
      id,
      agent.id,
      motifRefus,
    );
  }

  // ─────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────

  @Query(() => [ReservationMissionEntity], {
    name: 'myReservations',
    description: "Récupérer toutes les réservations de l'adhérent connecté",
  })
  @UseGuards(GqlAuthGuard)
  async getMyReservations(@CurrentUser() user: any) {
    const userId = this.getUserId(user);

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

  @Query(() => ReservationMissionEntity, {
    name: 'reservationById',
    description: 'Récupérer une réservation par son ID',
  })
  @UseGuards(GqlAuthGuard)
  async getReservationById(
    @Args('id') id: string,
    @CurrentUser() user: any,
  ) {
    const userId = this.getUserId(user);

    const [reservation, { adherent, agent, admin }] = await Promise.all([
      this.reservationsMissionService.getReservationById(id),
      this.resolveRoles(userId),
    ]);

    if (admin) return reservation;

    if (agent) {
      if (reservation.mission?.agentId !== agent.id) {
        throw new BadRequestException('Accès refusé à cette réservation');
      }
      return reservation;
    }

    if (adherent) {
      if (reservation.adherentId !== adherent.id) {
        throw new BadRequestException('Accès refusé à cette réservation');
      }
      return reservation;
    }

    throw new BadRequestException('Accès refusé');
  }

  @Query(() => [ReservationMissionEntity], {
    name: 'allReservations',
    description: 'Récupérer toutes les réservations (admin/agent)',
  })
  @UseGuards(GqlAuthGuard)
  async getAllReservations(@CurrentUser() user: any) {
    const userId = this.getUserId(user);
    const { agent, admin } = await this.resolveRoles(userId);

    if (!agent && !admin) {
      throw new BadRequestException('Accès refusé : agent ou admin uniquement');
    }

    return this.reservationsMissionService.getAllReservations();
  }

  @Query(() => [ReservationMissionEntity], {
    name: 'reservationsByMission',
    description: "Récupérer toutes les réservations d'une mission (agent/admin)",
  })
  @UseGuards(GqlAuthGuard)
  async getReservationsByMission(
    @Args('missionId') missionId: string,
    @CurrentUser() user: any,
  ) {
    const userId = this.getUserId(user);
    const { agent, admin } = await this.resolveRoles(userId);

    if (!agent && !admin) {
      throw new BadRequestException(
        'Accès refusé : vous devez être agent ou admin',
      );
    }

    if (agent && !admin) {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
      });
      if (!mission || mission.agentId !== agent.id) {
        throw new BadRequestException(
          'Accès refusé : cette mission ne vous appartient pas',
        );
      }
    }

    return this.reservationsMissionService.getReservationsByMission(missionId);
  }

@Mutation(() => ReservationMissionEntity, {
  description: "Annuler une réservation EN_ATTENTE sans motif — agent non répondant (adhérent)",
})
@UseGuards(GqlAuthGuard)
async cancelPendingReservation(
  @Args('id') id: string,
  @CurrentUser() user: any,
) {
  const userId = this.getUserId(user);

  const adherent = await this.prisma.adherent.findUnique({
    where: { userId },
  });

  if (!adherent) {
    throw new BadRequestException('Adhérent non trouvé');
  }

  return this.reservationsMissionService.cancelPendingReservation(
    id,
    adherent.id,
  );
}
}