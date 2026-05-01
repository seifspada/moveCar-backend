import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { MissionTrackingService } from './mission-tracking.service';
import { MissionTracking, MissionCompletion } from './entities/mission-tracking.entity';
import { UpdateLocationInput, CompleteMissionInput } from './dto';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../auth/enum/role.enum';

@Resolver(() => MissionTracking)
@UseGuards(GqlAuthGuard, RolesGuard)
export class MissionTrackingResolver {
  constructor(private readonly missionTrackingService: MissionTrackingService) {}

  // ========================================
  // MUTATIONS - ADHÉRENT (Suivi en temps réel)
  // ========================================

  @Mutation(() => MissionTracking, {
    description: 'Enregistre une position GPS pendant la mission',
  })
  @Roles(Role.ADHERENT)
  async updateMissionLocation(
    @Args('input') input: UpdateLocationInput,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<MissionTracking> {
    return this.missionTrackingService.updateLocation(input, user.id);
  }

  @Mutation(() => MissionCompletion, {
    description: 'Termine la mission et valide le trajet parcouru',
  })
  @Roles(Role.ADHERENT)
  async completeMission(
    @Args('input') input: CompleteMissionInput,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<MissionCompletion> {
    return this.missionTrackingService.completeMission(input, user.id);
  }

  // ========================================
  // QUERIES - ADHÉRENT & AGENT
  // ========================================

  @Query(() => [MissionTracking], {
    description: 'Récupère l\'historique GPS d\'une mission',
  })
  @Roles(Role.ADHERENT, Role.AGENT, Role.ADMIN)
  async getMissionTrackingHistory(
    @Args('missionId', { type: () => ID }) missionId: string,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<MissionTracking[]> {
    return this.missionTrackingService.getTrackingHistory(missionId, user.id);
  }

  @Query(() => MissionCompletion, {
    description: 'Récupère le résumé final d\'une mission complétée',
    nullable: true,
  })
  @Roles(Role.ADHERENT, Role.AGENT, Role.ADMIN)
  async getMissionCompletion(
    @Args('missionId', { type: () => ID }) missionId: string,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<MissionCompletion | null> {
    return this.missionTrackingService.getMissionCompletion(missionId, user.id);
  }
}
