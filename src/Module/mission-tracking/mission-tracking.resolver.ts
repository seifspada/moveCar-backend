// src/Module/mission-tracking/mission-tracking.resolver.ts

import { Resolver, Query, Mutation, Args, ID, Float, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { InputType, Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { MissionTrackingService } from './mission-tracking.service';
import {
  ActiveMissionMap,
  MissionTracking,
  MissionCompletion,
  MissionIncidentResult,
  IncidentType,
} from './entities/mission-tracking.entity';
import { UpdateLocationInput, CompleteMissionInput } from './dto';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../auth/enum/role.enum';

// ============================================================
// ENUM GRAPHQL
// ============================================================

registerEnumType(IncidentType, {
  name: 'IncidentType',
  description: 'Types d incidents possibles durant une mission',
});

// ============================================================
// DTOs
// ============================================================

@InputType()
export class ReportIncidentInput {
  @Field(() => ID)
  sessionId: string;

  @Field(() => IncidentType)
  typeIncident: IncidentType;

  @Field()
  description: string;

  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;

  @Field(() => [String], {
    nullable: true,
    description: 'Photos en base64, max 3',
  })
  photos?: string[];
}

@InputType()
export class ResolveIncidentInput {
  @Field(() => ID)
  incidentId: string;

  @Field()
  resolutionNotes: string;
}

// ============================================================
// OBJECT TYPE — Résultat checkArrival
// ============================================================

@ObjectType()
export class ArrivalCheckResult {
  @Field(() => Boolean)
  isArrived: boolean;

  @Field(() => Int)
  distanceMetres: number;

  @Field()
  villeArrivee: string;
}

// ============================================================
// RESOLVER
// ============================================================

@Resolver(() => MissionTracking)
@UseGuards(GqlAuthGuard, RolesGuard)
export class MissionTrackingResolver {
  constructor(
    private readonly missionTrackingService: MissionTrackingService,
  ) {}

  // ========================================
  // MUTATIONS — ADHÉRENT
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

  @Mutation(() => MissionIncidentResult, {
    description:
      'Signale un incident en route (panne, déviation…) avec photos optionnelles (max 3)',
  })
  @Roles(Role.ADHERENT)
  async reportMissionIncident(
    @Args('input') input: ReportIncidentInput,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<MissionIncidentResult> {
    return this.missionTrackingService.reportIncident(
      {
        sessionId: input.sessionId,
        typeIncident: input.typeIncident,
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
        photos: input.photos,
      },
      user.id,
    );
  }

  // ========================================
  // MUTATIONS — AGENT
  // ========================================

  @Mutation(() => MissionIncidentResult, {
    description:
      "Résout un incident signalé — réservé à l'agent responsable de la mission",
  })
  @Roles(Role.AGENT)
  async resolveMissionIncident(
    @Args('input') input: ResolveIncidentInput,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<MissionIncidentResult> {
    return this.missionTrackingService.resolveIncident(
      input.incidentId,
      input.resolutionNotes,
      user.id,
    );
  }

  // ========================================
  // QUERIES — ADHÉRENT, AGENT & ADMIN
  // ========================================

  @Query(() => [MissionTracking], {
    description: "Récupère l'historique GPS complet d'une mission",
  })
  @Roles(Role.ADHERENT, Role.AGENT, Role.ADMIN)
  async getMissionTrackingHistory(
    @Args('missionId', { type: () => ID }) missionId: string,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<MissionTracking[]> {
    return this.missionTrackingService.getTrackingHistory(missionId, user.id);
  }

  @Query(() => [ActiveMissionMap], {
    description:
      'Carte temps réel — dernière position GPS de chaque mission EN_COURS. Admin voit tout, Agent voit les siennes.',
  })
  @Roles(Role.AGENT, Role.ADMIN)
  async getActiveMissionsMap(
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<ActiveMissionMap[]> {
    return this.missionTrackingService.getActiveMissionsMap(user.id);
  }

  @Query(() => MissionCompletion, {
    description: "Récupère le résumé final d'une mission complétée",
    nullable: true,
  })
  @Roles(Role.ADHERENT, Role.AGENT, Role.ADMIN)
  async getMissionCompletion(
    @Args('missionId', { type: () => ID }) missionId: string,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<MissionCompletion | null> {
    return this.missionTrackingService.getMissionCompletion(missionId, user.id);
  }

  @Query(() => ArrivalCheckResult, {
    description:
      'Vérifie si le convoyeur est arrivé à destination (seuil 500m) — appelé par Flutter toutes les 30s',
  })
  @Roles(Role.ADHERENT)
  async checkMissionArrival(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @Args('latitude', { type: () => Float }) latitude: number,
    @Args('longitude', { type: () => Float }) longitude: number,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<ArrivalCheckResult> {
    return this.missionTrackingService.checkArrival(
      sessionId,
      latitude,
      longitude,
      user.id,
    );
  }

  @Query(() => [MissionIncidentResult], {
    description:
      "Liste tous les incidents d'une session avec leurs photos — accessible au convoyeur et à l'agent",
  })
  @Roles(Role.ADHERENT, Role.AGENT, Role.ADMIN)
  async getMissionIncidents(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<MissionIncidentResult[]> {
    return this.missionTrackingService.getIncidents(sessionId, user.id);
  }
}