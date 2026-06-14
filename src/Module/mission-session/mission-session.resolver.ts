// src/Module/mission-session/mission-session.resolver.ts

import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { MissionSessionService } from './mission-session.service';
import { MissionSessionEntity } from './entities/mission-session.entity';
import { EtapeSession, MissionSessionMediaEntity } from './entities/mission-session-media.entity';
import { PhotoValidationResult } from './dto/mission-session.outputs';

import {
  EndMissionSessionInput,
  StartMissionSessionInput,
  UploadMissionPhotosInput,
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
    description: 'Démarre une mission : consent + GPS + photos obligatoires',
  })
  @Roles(Role.ADHERENT)
  async startMissionSession(
    @Args('input') input: StartMissionSessionInput,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<MissionSessionEntity> {
    return this.service.startSession(input, user.id);
  }

  @Mutation(() => MissionSessionEntity, {
    description: 'Termine une mission en cours avec photos finales',
  })
  @Roles(Role.ADHERENT)
  async endMissionSession(
    @Args('input') input: EndMissionSessionInput,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<MissionSessionEntity> {
    return this.service.endSession(input, user.id);
  }

  @Mutation(() => [MissionSessionMediaEntity], {
    description: 'Upload les photos pour une session (avant ou après mission)',
  })
  @Roles(Role.ADHERENT)
  async uploadMissionPhotos(
    @Args('input') input: UploadMissionPhotosInput,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<MissionSessionMediaEntity[]> {
    return this.service.uploadPhotos(
      input.sessionId,
      input.medias,
      input.etape,
      user.id,
    );
  }

  // ── Queries ────────────────────────────────────────────────

  @Query(() => MissionSessionEntity, {
    nullable: true,
    description: "Récupère la session d'une réservation",
  })
 

  @Query(() => [MissionSessionMediaEntity], {
    description: 'Récupère les photos d\'une session (pré ou post mission)',
  })
  @Roles(Role.ADHERENT)
  async getMissionSessionPhotos(
    @Args('sessionId') sessionId: string,
    @Args('etape', { nullable: true, type: () => EtapeSession }) etape: EtapeSession | undefined,
    @CurrentUser() user: { id: number; role: Role },
  ): Promise<MissionSessionMediaEntity[]> {
    return this.service.getSessionPhotos(sessionId, user.id, etape);
  }

 @Query(() => PhotoValidationResult, {
  description: 'Valide les photos obligatoires pré-départ',
})
@Roles(Role.ADHERENT)
async validatePreMissionPhotos(
  @Args('sessionId') sessionId: string,
  @CurrentUser() user: { id: number; role: Role },
): Promise<PhotoValidationResult> {
  return this.service.validatePrePhotos(sessionId, user.id);
}

@Query(() => PhotoValidationResult, {
  description: 'Valide les photos obligatoires post-livraison',
})
@Roles(Role.ADHERENT)
async validatePostMissionPhotos(
  @Args('sessionId') sessionId: string,
  @CurrentUser() user: { id: number; role: Role },
): Promise<PhotoValidationResult> {
  return this.service.validatePostPhotos(sessionId, user.id);
}
@Query(() => [MissionSessionEntity], {
  description: "Récupère les sessions de l'adhérent, filtrables par statut",
})
@Roles(Role.ADHERENT)
async getMyMissionSessions(
  @CurrentUser() user: { id: number; role: Role },
  @Args('statut', { nullable: true }) statut?: string,
): Promise<MissionSessionEntity[]> {
  return this.service.getMissionsByAdherent(user.id, statut);
}
}
