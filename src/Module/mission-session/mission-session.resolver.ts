// src/Module/mission-session/mission-session.resolver.ts

import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { MissionSessionService } from './mission-session.service';
import { MissionSessionEntity } from './entities/mission-session.entity';
import {
  EndMissionSessionInput,
  StartMissionSessionInput,
} from './dto/mission-session.inputs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '../../auth/enum/role.enum';

@Resolver(() => MissionSessionEntity)
@UseGuards(JwtAuthGuard, RolesGuard)
export class MissionSessionResolver {
  constructor(private readonly service: MissionSessionService) {}

  // ── Mutations ──────────────────────────────────────────────

  @Mutation(() => MissionSessionEntity, {
    description: 'Démarre une mission : consent + GPS obligatoires',
  })
  @Roles(Role.ADHERENT)
  async startMissionSession(
    @Args('input') input: StartMissionSessionInput,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<MissionSessionEntity> {
    return this.service.startSession(input, user.id);
  }

  @Mutation(() => MissionSessionEntity, {
    description: 'Termine une mission en cours',
  })
  @Roles(Role.ADHERENT)
  async endMissionSession(
    @Args('input') input: EndMissionSessionInput,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<MissionSessionEntity> {
    return this.service.endSession(input, user.id);
  }

  // ── Query ──────────────────────────────────────────────────

  @Query(() => MissionSessionEntity, {
    nullable: true,
    description: "Récupère la session d'une réservation",
  })
  @Roles(Role.ADHERENT)
  async getMissionSession(
    @Args('reservationId') reservationId: string,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<MissionSessionEntity | null> {
    return this.service.getSessionByReservation(reservationId, user.id);
  }
}