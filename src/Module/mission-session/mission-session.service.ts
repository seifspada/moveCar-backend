// src/Module/mission-session/mission-session.service.ts

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EndMissionSessionInput,
  StartMissionSessionInput,
} from './dto/mission-session.inputs';
import { MissionSessionEntity } from './entities/mission-session.entity';

@Injectable()
export class MissionSessionService {
  private readonly logger = new Logger(MissionSessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // MAPPER — Convertir Prisma → Entity GraphQL
  // ============================================================

  private mapToEntity(data: any): MissionSessionEntity {
    return {
      ...data,
      statut: data.statut as any, // ✅ Cast explicite
    };
  }

  // ============================================================
  // START — Lancer la mission
  // ============================================================

  async startSession(
    input: StartMissionSessionInput,
    userId: number,
  ): Promise<MissionSessionEntity> {
    // 1. Consentement obligatoire
    if (!input.consentAccepted) {
      throw new BadRequestException(
        'Vous devez accepter les conditions avant de démarrer la mission.',
      );
    }

    // 2. GPS obligatoire
    if (
      input.latitudeDebut == null ||
      input.longitudeDebut == null
    ) {
      throw new BadRequestException(
        'La position GPS est obligatoire pour démarrer la mission.',
      );
    }

    // 3. Charger la réservation + adherent
    const reservation = await this.prisma.reservationMission.findUnique({
      where: { id: input.reservationId },
      include: {
        adherent: { select: { id: true, userId: true } },
        mission:  { select: { id: true, statut: true } },
        missionSession: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Réservation introuvable.');
    }

    // 4. Vérifier que c'est bien l'adhérent connecté
    if (reservation.adherent.userId !== userId) {
      throw new ForbiddenException('Cette réservation ne vous appartient pas.');
    }

    // 5. Vérifier le statut de la réservation
    if (reservation.statut !== 'CONFIRMED_BY_ADHERENT') {
      throw new BadRequestException(
        `La réservation doit être CONFIRMED_BY_ADHERENT. Statut actuel : ${reservation.statut}`,
      );
    }

    // 6. Vérifier qu'aucune session n'existe déjà
    if (reservation.missionSession) {
      throw new ConflictException(
        'Une session existe déjà pour cette réservation.',
      );
    }

    // 7. Créer la session + mettre la mission EN_COURS en transaction
    const [session] = await this.prisma.$transaction([
      this.prisma.missionSession.create({
        data: {
          reservationId:    input.reservationId,
          missionId:        reservation.mission.id,
          consentAccepted:  true,
          dateConsentement: new Date(),
          latitudeDebut:    input.latitudeDebut,
          longitudeDebut:   input.longitudeDebut,
          kilometrageDebut: input.kilometrageDebut ?? null,
          statut:           'EN_COURS',
        },
      }),
      this.prisma.mission.update({
        where: { id: reservation.mission.id },
        data:  { statut: 'EN_COURS' },
      }),
    ]);

    this.logger.log(
      `Session ${session.id} démarrée pour réservation ${input.reservationId}`,
    );

    return this.mapToEntity(session); // ✅ MAPPER
  }

  // ============================================================
  // END — Terminer la mission
  // ============================================================

  async endSession(
    input: EndMissionSessionInput,
    userId: number,
  ): Promise<MissionSessionEntity> {
    // 1. Charger la session
    const session = await this.prisma.missionSession.findUnique({
      where: { id: input.sessionId },
      include: {
        reservation: {
          include: {
            adherent: { select: { id: true, userId: true } },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session introuvable.');
    }

    // 2. Vérifier ownership
    if (session.reservation.adherent.userId !== userId) {
      throw new ForbiddenException('Cette session ne vous appartient pas.');
    }

    // 3. Vérifier que la session est encore EN_COURS
    if (session.statut === 'TERMINEE') {
      throw new ConflictException('Cette session est déjà terminée.');
    }

    // 4. GPS obligatoire pour la fin
    if (input.latitudeFin == null || input.longitudeFin == null) {
      throw new BadRequestException(
        'La position GPS est obligatoire pour terminer la mission.',
      );
    }

    // 5. Mettre à jour session + mission en transaction
    const [updated] = await this.prisma.$transaction([
      this.prisma.missionSession.update({
        where: { id: input.sessionId },
        data: {
          latitudeFin:    input.latitudeFin,
          longitudeFin:   input.longitudeFin,
          dateFin:        new Date(),
          kilometrageFin: input.kilometrageFin ?? null,
          commentaireFin: input.commentaireFin ?? null,
          statut:         'TERMINEE',
        },
      }),
      this.prisma.mission.update({
        where: { id: session.missionId },
        data:  { statut: 'TERMINEE' },
      }),
    ]);

    this.logger.log(
      `Session ${input.sessionId} terminée pour mission ${session.missionId}`,
    );

    return this.mapToEntity(updated); // ✅ MAPPER
  }

  // ============================================================
  // GET — Récupérer la session d'une réservation
  // ============================================================

  async getSessionByReservation(
    reservationId: string,
    userId: number,
  ): Promise<MissionSessionEntity | null> {
    const session = await this.prisma.missionSession.findUnique({
      where: { reservationId },
    });

    if (!session) return null;

    // Vérifier ownership
    const reservation = await this.prisma.reservationMission.findUnique({
      where: { id: reservationId },
      include: { adherent: { select: { userId: true } } },
    });

    if (reservation?.adherent.userId !== userId) {
      throw new ForbiddenException('Cette session ne vous appartient pas.');
    }

    return this.mapToEntity(session); // ✅ MAPPER
  }
}