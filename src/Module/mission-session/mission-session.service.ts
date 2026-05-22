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
  MediaUploadInput,
} from './dto/mission-session.inputs';
import { MissionSessionEntity } from './entities/mission-session.entity';
import { MissionSessionMediaEntity, EtapeSession, TypeMediaSession } from './entities/mission-session-media.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MissionSessionService {
  private readonly logger = new Logger(MissionSessionService.name);
  private readonly uploadsDir = path.join(process.cwd(), 'uploads', 'mission-sessions');

  constructor(private readonly prisma: PrismaService) {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  // ============================================================
  // HELPERS — Validation et stockage des medias
  // ============================================================

  private readonly PHOTOS_REQUISES_PRE_DEPART: TypeMediaSession[] = [
    TypeMediaSession.PHOTO_AVANT,
    TypeMediaSession.PHOTO_ARRIERE,
    TypeMediaSession.PHOTO_GAUCHE,
    TypeMediaSession.PHOTO_DROIT,
    TypeMediaSession.PHOTO_INTERIEUR,
    TypeMediaSession.PHOTO_TABLEAU_BORD,
    TypeMediaSession.PERMIS_RECTO_CONDUCTEUR,
    TypeMediaSession.PERMIS_VERSO_CONDUCTEUR,
  ];

  private readonly PHOTOS_REQUISES_POST_LIVRAISON: TypeMediaSession[] = [
    TypeMediaSession.PHOTO_AVANT_FINAL,
    TypeMediaSession.PHOTO_ARRIERE_FINAL,
    TypeMediaSession.PHOTO_GAUCHE_FINAL,
    TypeMediaSession.PHOTO_DROIT_FINAL,
    TypeMediaSession.PHOTO_INTERIEUR_FINAL,
    TypeMediaSession.PHOTO_TABLEAU_BORD_FINAL,
    TypeMediaSession.PREUVE_LIVRAISON,
  ];

  private validatePhotosRequises(
    photosPresentes: TypeMediaSession[],
    photosRequises: TypeMediaSession[],
  ): { valide: boolean; manquantes: TypeMediaSession[] } {
    const manquantes = photosRequises.filter((p) => !photosPresentes.includes(p));
    return {
      valide: manquantes.length === 0,
      manquantes,
    };
  }

  private async saveMediaFile(
    base64Data: string,
    sessionId: string,
    typeMedia: string,
  ): Promise<{ cheminFichier: string; tailleOctets: number; typeContenu: string }> {
    try {
      const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new BadRequestException(
          'Format base64 invalide. Doit etre: data:image/jpeg;base64,<donnees>',
        );
      }

      const typeContenu = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');

      const timestamp = Date.now();
      const filename = `${sessionId}_${typeMedia}_${timestamp}.${this.getMimeExtension(typeContenu)}`;
      const sessionDir = path.join(this.uploadsDir, sessionId);

      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      const filePath = path.join(sessionDir, filename);
      fs.writeFileSync(filePath, buffer);

      return {
        cheminFichier: path.relative(process.cwd(), filePath),
        tailleOctets: buffer.length,
        typeContenu,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la sauvegarde du fichier: ${error}`);
      throw new BadRequestException('Erreur lors de la sauvegarde du fichier media');
    }
  }

  private getMimeExtension(mimeType: string): string {
    const extensions: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    return extensions[mimeType] || 'jpg';
  }

  // ============================================================
  // MAPPER
  // ============================================================

  private mapToEntity(data: any): MissionSessionEntity {
    return {
      ...data,
      statut: data.statut as any,
      medias: data.medias?.map((m: any) => this.mapMediaToEntity(m)) || [],
    };
  }

  private mapMediaToEntity(data: any): MissionSessionMediaEntity {
    return {
      ...data,
      etape: data.etape as any,
      typeMedia: data.typeMedia as any,
    };
  }

  // ============================================================
  // START
  // ============================================================

  async startSession(
    input: StartMissionSessionInput,
    userId: number,
  ): Promise<MissionSessionEntity> {
    if (!input.consentAccepted) {
      throw new BadRequestException(
        'Vous devez accepter les conditions avant de demarrer la mission.',
      );
    }

    if (input.latitudeDebut == null || input.longitudeDebut == null) {
      throw new BadRequestException(
        'La position GPS est obligatoire pour demarrer la mission.',
      );
    }

    const photosPreValidation = this.validatePhotosRequises(
      (input.photosPre ?? []).map((photo) => photo.typeMedia),
      this.PHOTOS_REQUISES_PRE_DEPART,
    );

    if (!photosPreValidation.valide) {
      throw new BadRequestException(
        `Photos pre-depart manquantes : ${photosPreValidation.manquantes.join(', ')}`,
      );
    }

    const reservation = await this.prisma.reservationMission.findUnique({
      where: { id: input.reservationId },
      include: {
        adherent: { select: { id: true, userId: true } },
        mission: { select: { id: true, statut: true } },
        missionSession: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation introuvable.');
    }

    if (reservation.adherent.userId !== userId) {
      throw new ForbiddenException('Cette reservation ne vous appartient pas.');
    }

    if (reservation.statut !== 'CONFIRMED_BY_ADHERENT') {
      throw new BadRequestException(
        `La reservation doit etre CONFIRMED_BY_ADHERENT. Statut actuel : ${reservation.statut}`,
      );
    }

    if (reservation.missionSession) {
      throw new ConflictException(
        'Une session existe deja pour cette reservation.',
      );
    }

    const [session] = await this.prisma.$transaction([
      this.prisma.missionSession.create({
        data: {
          reservationId: input.reservationId,
          missionId: reservation.mission.id,
          consentAccepted: true,
          dateConsentement: new Date(),
          latitudeDebut: input.latitudeDebut,
          longitudeDebut: input.longitudeDebut,
          kilometrageDebut: input.kilometrageDebut ?? null,
          statut: 'EN_COURS',
          medias: {
            create: [],
          },
        },
        include: { medias: true },
      }),
      this.prisma.mission.update({
        where: { id: reservation.mission.id },
        data: { statut: 'EN_COURS' },
      }),
    ]);

    if (input.photosPre && input.photosPre.length > 0) {
      await this.uploadPhotos(session.id, input.photosPre, EtapeSession.PRE_DEPART, userId);
    }

    this.logger.log(
      `Session ${session.id} demarree pour reservation ${input.reservationId}`,
    );

    return this.mapToEntity(session);
  }

  // ============================================================
  // END
  // ============================================================

  async endSession(
    input: EndMissionSessionInput,
    userId: number,
  ): Promise<MissionSessionEntity> {
    const session = await this.prisma.missionSession.findUnique({
      where: { id: input.sessionId },
      include: {
        reservation: {
          include: {
            adherent: { select: { id: true, userId: true } },
          },
        },
        medias: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session introuvable.');
    }

    if (session.reservation.adherent.userId !== userId) {
      throw new ForbiddenException('Cette session ne vous appartient pas.');
    }

    if (session.statut === 'TERMINEE') {
      throw new ConflictException('Cette session est deja terminie.');
    }

    if (input.latitudeFin == null || input.longitudeFin == null) {
      throw new BadRequestException(
        'La position GPS est obligatoire pour terminer la mission.',
      );
    }

    const photosPostValidation = this.validatePhotosRequises(
      [
        ...session.medias
          .filter((media) => media.etape === EtapeSession.POST_LIVRAISON)
          .map((media) => media.typeMedia as TypeMediaSession),
        ...(input.photosPost ?? []).map((photo) => photo.typeMedia),
      ],
      this.PHOTOS_REQUISES_POST_LIVRAISON,
    );

    if (!photosPostValidation.valide) {
      throw new BadRequestException(
        `Photos post-livraison manquantes : ${photosPostValidation.manquantes.join(', ')}`,
      );
    }

    if (input.photosPost && input.photosPost.length > 0) {
      await this.uploadPhotos(session.id, input.photosPost, EtapeSession.POST_LIVRAISON, userId);
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.missionSession.update({
        where: { id: input.sessionId },
        data: {
          latitudeFin: input.latitudeFin,
          longitudeFin: input.longitudeFin,
          dateFin: new Date(),
          kilometrageFin: input.kilometrageFin ?? null,
          commentaireFin: input.commentaireFin ?? null,
          statut: 'TERMINEE',
        },
        include: { medias: true },
      }),
      this.prisma.mission.update({
        where: { id: session.missionId },
        data: { statut: 'TERMINEE' },
      }),
    ]);

    this.logger.log(
      `Session ${input.sessionId} terminie pour mission ${session.missionId}`,
    );

    return this.mapToEntity(updated);
  }

  // ============================================================
  // PHOTOS
  // ============================================================

  async uploadPhotos(
    sessionId: string,
    medias: MediaUploadInput[],
    etape: EtapeSession,
    userId: number,
  ): Promise<MissionSessionMediaEntity[]> {
    const session = await this.prisma.missionSession.findUnique({
      where: { id: sessionId },
      include: {
        reservation: {
          include: {
            adherent: { select: { userId: true } },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session introuvable.');
    }

    if (session.reservation.adherent.userId !== userId) {
      throw new ForbiddenException('Cette session ne vous appartient pas.');
    }

    const existingMedias = await this.prisma.missionSessionMedia.findMany({
      where: {
        sessionId,
        etape,
        typeMedia: { in: medias.map((media) => media.typeMedia) },
      },
      select: { typeMedia: true },
    });
    const existingTypes = new Set(existingMedias.map((media) => media.typeMedia));

    const createdMedias: MissionSessionMediaEntity[] = [];

    for (const media of medias) {
      if (existingTypes.has(media.typeMedia)) {
        throw new ConflictException(
          `Le media ${media.typeMedia} existe deja pour cette etape.`,
        );
      }

      try {
        const { cheminFichier, tailleOctets, typeContenu } = await this.saveMediaFile(
          media.base64Data,
          sessionId,
          media.typeMedia,
        );

        const saved = await this.prisma.missionSessionMedia.create({
          data: {
            sessionId,
            etape,
            typeMedia: media.typeMedia,
            description: media.description,
            cheminFichier,
            tailleOctets,
            typeContenu,
          },
        });

        createdMedias.push(this.mapMediaToEntity(saved));
        existingTypes.add(media.typeMedia);
      } catch (error) {
        this.logger.error(`Erreur lors de l'upload du media ${media.typeMedia}:`, error);
        throw error;
      }
    }

    return createdMedias;
  }

  async getSessionPhotos(
    sessionId: string,
    userId: number,
    etape?: EtapeSession,
  ): Promise<MissionSessionMediaEntity[]> {
    const session = await this.prisma.missionSession.findUnique({
      where: { id: sessionId },
      include: {
        reservation: {
          include: {
            adherent: { select: { userId: true } },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session introuvable.');
    }

    if (session.reservation.adherent.userId !== userId) {
      throw new ForbiddenException('Cette session ne vous appartient pas.');
    }

    const medias = await this.prisma.missionSessionMedia.findMany({
      where: {
        sessionId,
        ...(etape && { etape }),
      },
      orderBy: { dateCreation: 'asc' },
    });

    return medias.map((m) => this.mapMediaToEntity(m));
  }

  async validatePrePhotos(sessionId: string, userId: number): Promise<{ valide: boolean; manquantes: string[] }> {
    const session = await this.prisma.missionSession.findUnique({
      where: { id: sessionId },
      include: { reservation: { include: { adherent: { select: { userId: true } } } } },
    });

    if (!session) {
      throw new NotFoundException('Session introuvable.');
    }

    if (session.reservation.adherent.userId !== userId) {
      throw new ForbiddenException('Cette session ne vous appartient pas.');
    }

    const medias = await this.prisma.missionSessionMedia.findMany({
      where: { sessionId, etape: 'PRE_DEPART' },
    });

    const typesPresents = medias.map((m) => m.typeMedia as TypeMediaSession);
    const validation = this.validatePhotosRequises(
      typesPresents,
      this.PHOTOS_REQUISES_PRE_DEPART,
    );

    return {
      valide: validation.valide,
      manquantes: validation.manquantes,
    };
  }

  async validatePostPhotos(sessionId: string, userId: number): Promise<{ valide: boolean; manquantes: string[] }> {
    const session = await this.prisma.missionSession.findUnique({
      where: { id: sessionId },
      include: { reservation: { include: { adherent: { select: { userId: true } } } } },
    });

    if (!session) {
      throw new NotFoundException('Session introuvable.');
    }

    if (session.reservation.adherent.userId !== userId) {
      throw new ForbiddenException('Cette session ne vous appartient pas.');
    }

    const medias = await this.prisma.missionSessionMedia.findMany({
      where: { sessionId, etape: 'POST_LIVRAISON' },
    });

    const typesPresents = medias.map((m) => m.typeMedia as TypeMediaSession);
    const validation = this.validatePhotosRequises(
      typesPresents,
      this.PHOTOS_REQUISES_POST_LIVRAISON,
    );

    return {
      valide: validation.valide,
      manquantes: validation.manquantes,
    };
  }

  // ============================================================
  // GET
  // ============================================================

  async getSessionByReservation(
    reservationId: string,
    userId: number,
  ): Promise<MissionSessionEntity | null> {
    const session = await this.prisma.missionSession.findUnique({
      where: { reservationId },
      include: { medias: true },
    });

    if (!session) return null;

    const reservation = await this.prisma.reservationMission.findUnique({
      where: { id: reservationId },
      include: { adherent: { select: { userId: true } } },
    });

    if (reservation?.adherent.userId !== userId) {
      throw new ForbiddenException('Cette session ne vous appartient pas.');
    }

    return this.mapToEntity(session);
  }
}
