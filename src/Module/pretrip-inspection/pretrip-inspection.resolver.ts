import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PreTripInspectionService } from './pretrip-inspection.service';
import { PreTripInspection } from './entities/pretrip-inspection.entities';
import {
  StartInspectionInput,
  SubmitConsentInput,
  ValidateInspectionInput,
  InspectionFilterInput,
} from './dto/pretrip-inspection.inputs';

import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../auth/enum/role.enum';

@Resolver(() => PreTripInspection)
@UseGuards(GqlAuthGuard, RolesGuard)
export class PreTripInspectionResolver {
  constructor(
    private readonly pretripService: PreTripInspectionService,
  ) {}

  // ========================================
  // MUTATIONS - ADHERENT (convoyeur)
  // ========================================

  @Mutation(() => PreTripInspection, {
    description: 'Démarre une inspection pré-mission (Adhérent uniquement)',
  })
  @Roles(Role.ADHERENT)
  async startInspection(
    @Args('input') input: StartInspectionInput,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<PreTripInspection> {
    return this.pretripService.startInspection(input, user.id);
  }

  @Mutation(() => PreTripInspection, {
    description: 'Soumet le consentement de l\'adhérent (étape 6)',
  })
  @Roles(Role.ADHERENT)
  async submitConsent(
    @Args('input') input: SubmitConsentInput,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<PreTripInspection> {
    return this.pretripService.submitConsent(input, user.id);
  }

  @Mutation(() => PreTripInspection, {
    description: 'Valide l\'inspection finale et démarre la mission',
  })
  @Roles(Role.ADHERENT)
  async validateAndStartMission(
    @Args('input') input: ValidateInspectionInput,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<PreTripInspection> {
    return this.pretripService.validateAndStartMission(input, user.id);
  }

  // ========================================
  // QUERIES - ADHERENT & AGENT
  // ========================================

  @Query(() => PreTripInspection, {
    nullable: true,
    description: 'Récupère l\'inspection d\'une réservation',
  })
  @Roles(Role.ADHERENT, Role.AGENT, Role.ADMIN)
  async getInspectionByReservation(
    @Args('reservationId', { type: () => ID }) reservationId: string,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<PreTripInspection | null> {
    return this.pretripService.getInspectionByReservation(
      reservationId,
      user.id,
      user.role,
    );
  }

  @Query(() => PreTripInspection, {
    description: 'Détail complet d\'une inspection avec médias et consentement',
  })
  @Roles(Role.ADHERENT, Role.AGENT, Role.ADMIN)
  async getInspectionDetails(
    @Args('inspectionId', { type: () => ID }) inspectionId: string,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<PreTripInspection> {
    return this.pretripService.getInspectionDetails(
      inspectionId,
      user.id,
      user.role,
    );
  }

  // ========================================
  // QUERIES - AGENT (suivi & supervision)
  // ========================================

  @Query(() => [PreTripInspection], {
    description: 'Liste les inspections (filtrage par rôle automatique)',
  })
  @Roles(Role.ADHERENT, Role.AGENT, Role.ADMIN)
  async listInspections(
    @Args('filter', { nullable: true }) filter: InspectionFilterInput,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<PreTripInspection[]> {
    return this.pretripService.listInspections(filter, user.id, user.role);
  }

  @Query(() => [PreTripInspection], {
    description: 'Inspections en cours - réservé Agent/Admin',
  })
  @Roles(Role.AGENT, Role.ADMIN)
  async listPendingInspections(
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<PreTripInspection[]> {
    return this.pretripService.listInspections(
      { statut: 'IN_PROGRESS' as any },
      user.id,
      user.role,
    );
  }

  @Query(() => [PreTripInspection], {
    description: 'Inspections rejetées par anti-fraud - réservé Agent/Admin',
  })
  @Roles(Role.AGENT, Role.ADMIN)
  async listRejectedInspections(
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<PreTripInspection[]> {
    return this.pretripService.listInspections(
      { statut: 'REJECTED' as any },
      user.id,
      user.role,
    );
  }
}