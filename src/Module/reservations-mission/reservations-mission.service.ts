// src/Module/reservations-mission/reservations-mission.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StatutReservation } from '@prisma/client';
import { CreateReservationInput } from './dto/create-reservations-mission.input';
import { randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';

const LIMITE_ANNULATIONS_MENSUELLE = 5;
const DELAI_MAX_ANNULATION_HEURES = 24;
const DELAI_BLOCAGE_AVANT_MISSION_HEURES = 1;

@Injectable()
export class ReservationsMissionService {
  private readonly logger = new Logger(ReservationsMissionService.name);

  constructor(
    private prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // ─────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────

  private calculateArrivalDateTime(
    dateDepart: string,
    heureDepart: string,
    distanceKm: number,
  ): { dateArrivee: Date; heureArrivee: string; dureeEstimee: number } {
    const departDateTime = new Date(`${dateDepart}T${heureDepart}:00`);
    const dureeEstimee =
      distanceKm > 0 ? Math.round((distanceKm / 80) * 60) : 15;
    const arrivalDateTime = new Date(departDateTime);
    arrivalDateTime.setMinutes(arrivalDateTime.getMinutes() + dureeEstimee);
    const heureArrivee = arrivalDateTime.toTimeString().slice(0, 5);
    return { dateArrivee: arrivalDateTime, heureArrivee, dureeEstimee };
  }

  private generateNumeroReservation(): string {
    const year = new Date().getFullYear();
    const unique = randomBytes(3).toString('hex').toUpperCase();
    return `RES-${year}-${unique}`;
  }

  // ✅ PUBLIC pour que le resolver puisse l'utiliser dans getReservationsByMissionForAdherent
  get reservationInclude() {
    return {
      adherent: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          telephone: true,
          statut: true,
          userId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              photo: true,
            },
          },
        },
      },
      mission: {
        include: {
          vehicule: true,
          adresseDepart: true,
          adresseArrivee: true,
          agent: true,
          calculs: true,
        },
      },
    };
  }

  /**
   * ✅ Vérifier et incrémenter le compteur d'annulations mensuel
   */
  private async checkAndIncrementAnnulationCount(userId: number): Promise<void> {
    const now = new Date();
    const mois = now.getMonth() + 1;
    const annee = now.getFullYear();

    const historique = await this.prisma.historiqueAnnulation.upsert({
      where: { userId_mois_annee: { userId, mois, annee } },
      create: {
        userId,
        mois,
        annee,
        nbAnnulations: 0,
        limite: LIMITE_ANNULATIONS_MENSUELLE,
      },
      update: {},
    });

    if (historique.nbAnnulations >= historique.limite) {
      throw new BadRequestException(
        `Vous avez atteint la limite de ${historique.limite} annulations pour ce mois`,
      );
    }

    await this.prisma.historiqueAnnulation.update({
      where: { userId_mois_annee: { userId, mois, annee } },
      data: { nbAnnulations: { increment: 1 } },
    });
  }

  /**
   * ✅ Vérifier les règles de délai d'annulation directe
   */
  private checkAnnulationDelais(reservation: any): void {
    const now = new Date();

    if (reservation.statut === StatutReservation.CONFIRMED_BY_ADHERENT) {
      throw new BadRequestException(
        "Impossible d'annuler une réservation déjà confirmée — utilisez la demande d'annulation",
      );
    }

    const dateDepart = new Date(
      `${reservation.dateDepart.toISOString().split('T')[0]}T${reservation.heureDepart}:00`,
    );
    const diffAvantMission =
      (dateDepart.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffAvantMission < DELAI_BLOCAGE_AVANT_MISSION_HEURES) {
      throw new BadRequestException(
        `Annulation impossible : la mission démarre dans moins d'${DELAI_BLOCAGE_AVANT_MISSION_HEURES}h`,
      );
    }

    const diffDepuisCreation =
      (now.getTime() - reservation.dateCreation.getTime()) / (1000 * 60 * 60);
    if (diffDepuisCreation > DELAI_MAX_ANNULATION_HEURES) {
      throw new BadRequestException(
        `Délai d'annulation dépassé (${DELAI_MAX_ANNULATION_HEURES}h) — utilisez la demande d'annulation`,
      );
    }
  }

  // ─────────────────────────────────────────────
  // MUTATIONS
  // ─────────────────────────────────────────────

  /**
   * ✅ Créer une réservation (adhérent)
   */
  async createReservation(
    adherentId: number,
    createReservationInput: CreateReservationInput,
  ): Promise<{
    success: boolean;
    message: string;
    code?: string;
    reservation?: any;
  }> {
    const { missionId, dateDepart, heureDepart } = createReservationInput;

    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        calculs: true,
        disponibilite: true,
        agent: true,
        vehicule: true,
        adresseDepart: true,
        adresseArrivee: true,
      },
    });

    if (!mission)
      return { success: false, message: `Mission ${missionId} introuvable`, code: 'MISSION_NOT_FOUND' };

    if (mission.statut !== 'EN_ATTENTE')
      return { success: false, message: "Cette mission n'est plus disponible", code: 'MISSION_NOT_AVAILABLE' };

    const adherent = await this.prisma.adherent.findUnique({ where: { id: adherentId } });
    if (!adherent)
      return { success: false, message: `Adhérent ${adherentId} introuvable`, code: 'ADHERENT_NOT_FOUND' };

    if (adherent.statut !== 'ACTIF' || adherent.estBloque) {
      return {
        success: false,
        message: "Votre compte n'est pas autorisé à réserver des missions",
        code: 'ADHERENT_NOT_AUTHORIZED',
      };
    }

    // ✅ Comparaison par jour uniquement (fix timezone)
    if (mission.disponibilite) {
      const normalizeToDay = (d: Date | string): number => {
        const date = new Date(d);
        return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      };

      const dateDepartMs = normalizeToDay(dateDepart);
      const disponibiliteDebutMs = normalizeToDay(mission.disponibilite.dateDebut);
      const disponibiliteFinMs = normalizeToDay(
        mission.disponibilite.dateDepartMax || mission.disponibilite.dateFin,
      );

      if (dateDepartMs < disponibiliteDebutMs || dateDepartMs > disponibiliteFinMs) {
        return {
          success: false,
          message: `La date de départ doit être entre le ${new Date(disponibiliteDebutMs).toLocaleDateString('fr-FR', { timeZone: 'UTC' })} et le ${new Date(disponibiliteFinMs).toLocaleDateString('fr-FR', { timeZone: 'UTC' })}`,
          code: 'INVALID_DEPARTURE_DATE',
        };
      }
    }

    // ─── Vérifier réservation active existante ───────────────────────────────
    const statutsActifs: StatutReservation[] = [
      StatutReservation.EN_ATTENTE,
      StatutReservation.ACCEPTED_BY_AGENT,
      StatutReservation.CONFIRMED_BY_ADHERENT,
      StatutReservation.ANNULATION_DEMANDEE,
    ];

    const activeReservation = await this.prisma.reservationMission.findFirst({
      where: { missionId, adherentId, statut: { in: statutsActifs } },
    });

    if (activeReservation) {
      return {
        success: false,
        message: 'Vous avez déjà une réservation active pour cette mission',
        code: 'RESERVATION_ALREADY_EXISTS',
        reservation: activeReservation,
      };
    }

    // ✅ Réactiver une ancienne réservation ANNULEE ou REFUSEE
    const statutsReactivables: StatutReservation[] = [
      StatutReservation.ANNULEE,
      StatutReservation.REFUSEE,
    ];

    const existingCancelledReservation = await this.prisma.reservationMission.findFirst({
      where: { missionId, adherentId, statut: { in: statutsReactivables } },
      orderBy: { dateCreation: 'desc' },
    });

    const distanceKm = Number(mission.calculs?.distanceKm || 0);
    const { dateArrivee, heureArrivee, dureeEstimee } =
      this.calculateArrivalDateTime(dateDepart, heureDepart, distanceKm);

    if (existingCancelledReservation) {
      const reactivated = await this.prisma.reservationMission.update({
        where: { id: existingCancelledReservation.id },
        data: {
          statut: StatutReservation.EN_ATTENTE,
          dateDepart: new Date(dateDepart),
          heureDepart,
          dateArrivee,
          heureArrivee,
          dureeEstimee,
          montantTotal: Number(mission.calculs?.montantTotal || 0),
          fraisPeage: Number(mission.calculs?.fraisPeage || 0),
          distanceKm: Number(mission.calculs?.distanceKm || 0),
          motifAnnulation: null,
          motifRefus: null,
          annulePar: null,
          dateAnnulation: null,
          dateRefus: null,
          dateAcceptationAgent: null,
          dateConfirmationAdherent: null,
          statutPrecedent: null,
        },
        include: this.reservationInclude,
      });
      this.logger.log(`🔄 Réservation réactivée: ${reactivated.numeroReservation}`);
      return { success: true, message: 'Réservation réactivée avec succès', reservation: reactivated };
    }

    // ─── Création normale ─────────────────────────────────────────────────
    const numeroReservation = this.generateNumeroReservation();
    const reservation = await this.prisma.reservationMission.create({
      data: {
        missionId,
        adherentId,
        statut: StatutReservation.EN_ATTENTE,
        numeroReservation,
        dateDepart: new Date(dateDepart),
        heureDepart,
        dateArrivee,
        heureArrivee,
        dureeEstimee,
        montantTotal: Number(mission.calculs?.montantTotal || 0),
        fraisPeage: Number(mission.calculs?.fraisPeage || 0),
        distanceKm: Number(mission.calculs?.distanceKm || 0),
      },
      include: this.reservationInclude,
    });

    this.logger.log(`✅ Réservation créée: ${numeroReservation}`);
    return { success: true, message: 'Réservation créée avec succès', reservation };
  }

  /**
   * ✅ ÉTAPE 1 — Agent accepte (EN_ATTENTE → ACCEPTED_BY_AGENT)
   */
  async acceptReservation(id: string, agentId: number) {
    const reservation = await this.prisma.reservationMission.findUnique({
      where: { id },
      include: { mission: true },
    });
    if (!reservation) throw new NotFoundException(`Réservation ${id} introuvable`);
    if (reservation.mission.agentId !== agentId)
      throw new BadRequestException('Vous ne pouvez pas accepter cette réservation');
    if (reservation.statut !== StatutReservation.EN_ATTENTE)
      throw new BadRequestException('Cette réservation ne peut plus être acceptée');

    const updated = await this.prisma.reservationMission.update({
      where: { id },
      data: { statut: StatutReservation.ACCEPTED_BY_AGENT, dateAcceptationAgent: new Date() },
      include: this.reservationInclude,
    });
    this.logger.log(`✅ Réservation acceptée par agent: ${reservation.numeroReservation}`);
    return updated;
  }

  /**
   * ✅ ÉTAPE 2 — Adhérent confirme (ACCEPTED_BY_AGENT → CONFIRMED_BY_ADHERENT)
   */
  async confirmReservationByAdherent(id: string, adherentId: number) {
    const reservation = await this.prisma.reservationMission.findUnique({ where: { id } });
    if (!reservation) throw new NotFoundException(`Réservation ${id} introuvable`);
    if (reservation.adherentId !== adherentId)
      throw new BadRequestException('Vous ne pouvez pas confirmer cette réservation');
    if (reservation.statut !== StatutReservation.ACCEPTED_BY_AGENT)
      throw new BadRequestException("La réservation doit être acceptée par l'agent avant confirmation");

    const updated = await this.prisma.reservationMission.update({
      where: { id },
      data: { statut: StatutReservation.CONFIRMED_BY_ADHERENT, dateConfirmationAdherent: new Date() },
      include: this.reservationInclude,
    });
    this.logger.log(`✅ Réservation confirmée par adhérent: ${reservation.numeroReservation}`);
    return updated;
  }

  /**
   * ✅ Annulation directe — uniquement dans les 24h (adhérent)
   */
  async cancelReservation(id: string, adherentId: number, motifAnnulation?: string) {
    const reservation = await this.prisma.reservationMission.findUnique({
      where: { id },
      include: { mission: true, adherent: { include: { user: true } } },
    });
    if (!reservation) throw new NotFoundException(`Réservation ${id} introuvable`);
    if (reservation.adherentId !== adherentId)
      throw new BadRequestException('Vous ne pouvez pas annuler cette réservation');

    this.checkAnnulationDelais(reservation);

    if (reservation.adherent.user?.id) {
      await this.checkAndIncrementAnnulationCount(reservation.adherent.user.id);
    }

    const updated = await this.prisma.reservationMission.update({
      where: { id },
      data: {
        statut: StatutReservation.ANNULEE,
        dateAnnulation: new Date(),
        motifAnnulation: motifAnnulation ?? null,
        annulePar: 'ADHERENT',
      },
      include: this.reservationInclude,
    });
    this.logger.log(`❌ Réservation annulée: ${reservation.numeroReservation}`);
    return updated;
  }

  /**
   * ✅ Demande d'annulation après 24h (adhérent)
   */
  async requestCancellation(id: string, adherentId: number, motifAnnulation: string) {
    const reservation = await this.prisma.reservationMission.findUnique({ where: { id } });
    if (!reservation) throw new NotFoundException(`Réservation ${id} introuvable`);
    if (reservation.adherentId !== adherentId) throw new BadRequestException('Accès refusé');
    if (reservation.statut === StatutReservation.ANNULATION_DEMANDEE)
      throw new BadRequestException("Une demande d'annulation est déjà en cours");

    const statutsAutorisés: StatutReservation[] = [
      StatutReservation.EN_ATTENTE,
      StatutReservation.ACCEPTED_BY_AGENT,
      StatutReservation.CONFIRMED_BY_ADHERENT,
    ];
    if (!statutsAutorisés.includes(reservation.statut))
      throw new BadRequestException('Annulation impossible pour ce statut');

    const now = new Date();
    const dateDepart = new Date(
      `${reservation.dateDepart.toISOString().split('T')[0]}T${reservation.heureDepart}:00`,
    );
    const diffAvantMission = (dateDepart.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffAvantMission < DELAI_BLOCAGE_AVANT_MISSION_HEURES)
      throw new BadRequestException(
        `Demande impossible : la mission démarre dans moins d'${DELAI_BLOCAGE_AVANT_MISSION_HEURES}h`,
      );

    const updated = await this.prisma.reservationMission.update({
      where: { id },
      data: {
        statutPrecedent: reservation.statut,
        statut: StatutReservation.ANNULATION_DEMANDEE,
        motifAnnulation,
      },
      include: this.reservationInclude,
    });
    this.logger.log(`⚠️ Demande annulation: ${reservation.numeroReservation}`);
    return updated;
  }

  /**
   * ✅ Agent accepte la demande d'annulation → ANNULEE
   */
  async acceptCancellationRequest(id: string, agentId: number) {
    const reservation = await this.prisma.reservationMission.findUnique({
      where: { id },
      include: { mission: true, adherent: { include: { user: true } } },
    });
    if (!reservation) throw new NotFoundException(`Réservation ${id} introuvable`);
    if (reservation.mission.agentId !== agentId) throw new BadRequestException('Accès refusé');
    if (reservation.statut !== StatutReservation.ANNULATION_DEMANDEE)
      throw new BadRequestException("Aucune demande d'annulation en cours");

    if (reservation.adherent.user?.id) {
      await this.checkAndIncrementAnnulationCount(reservation.adherent.user.id);
    }

    const updated = await this.prisma.reservationMission.update({
      where: { id },
      data: {
        statut: StatutReservation.ANNULEE,
        dateAnnulation: new Date(),
        annulePar: 'ADHERENT',
        statutPrecedent: null,
      },
      include: this.reservationInclude,
    });
    this.logger.log(`✅ Demande annulation acceptée: ${reservation.numeroReservation}`);
    return updated;
  }

  /**
   * ✅ Agent refuse la demande d'annulation → retour statut précédent
   */
  async refuseCancellationRequest(id: string, agentId: number, motifRefus: string) {
    const reservation = await this.prisma.reservationMission.findUnique({
      where: { id },
      include: { mission: true },
    });
    if (!reservation) throw new NotFoundException(`Réservation ${id} introuvable`);
    if (reservation.mission.agentId !== agentId) throw new BadRequestException('Accès refusé');
    if (reservation.statut !== StatutReservation.ANNULATION_DEMANDEE)
      throw new BadRequestException("Aucune demande d'annulation en cours");
    if (!reservation.statutPrecedent)
      throw new BadRequestException('Statut précédent introuvable');

    const updated = await this.prisma.reservationMission.update({
      where: { id },
      data: {
        statut: reservation.statutPrecedent,
        motifAnnulation: null,
        statutPrecedent: null,
        motifRefus: `Demande annulation refusée: ${motifRefus}`,
      },
      include: this.reservationInclude,
    });
    this.logger.log(`❌ Demande annulation refusée: ${reservation.numeroReservation}`);
    return updated;
  }

  /**
   * ✅ Refuser une réservation EN_ATTENTE (agent)
   */
  async refuseReservation(id: string, agentId: number, motifRefus: string) {
    const reservation = await this.prisma.reservationMission.findUnique({
      where: { id },
      include: {
        mission: { include: { adresseDepart: true, adresseArrivee: true } },
        adherent: { include: { user: true } },
      },
    });
    if (!reservation) throw new NotFoundException(`Réservation ${id} introuvable`);
    if (reservation.mission.agentId !== agentId)
      throw new BadRequestException('Vous ne pouvez pas refuser cette réservation');
    if (reservation.statut !== StatutReservation.EN_ATTENTE)
      throw new BadRequestException('Cette réservation ne peut plus être refusée');

    const updated = await this.prisma.reservationMission.update({
      where: { id },
      data: { statut: StatutReservation.REFUSEE, dateRefus: new Date(), motifRefus },
      include: this.reservationInclude,
    });

    const adherent = reservation.adherent;
    const user = adherent?.user;
    if (user?.email) {
      await this.emailService.sendRefusReservation({
        email: user.email,
        nomAdherent: `${adherent.prenom} ${adherent.nom}`,
        numeroReservation: reservation.numeroReservation,
        missionTitre: `${reservation.mission.adresseDepart?.villeNom ?? '?'} → ${reservation.mission.adresseArrivee?.villeNom ?? '?'}`,
        dateReservation: reservation.dateDepart,
        motifRefus,
      });
    }

    this.logger.log(`❌ Réservation refusée: ${reservation.numeroReservation}`);
    return updated;
  }

  // ─────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────

  async getReservationsByAdherent(adherentId: number) {
    return this.prisma.reservationMission.findMany({
      where: { adherentId },
      include: this.reservationInclude,
      orderBy: { dateCreation: 'desc' },
    });
  }

  async getReservationById(id: string) {
    const reservation = await this.prisma.reservationMission.findUnique({
      where: { id },
      include: this.reservationInclude,
    });
    if (!reservation) throw new NotFoundException(`Réservation ${id} introuvable`);
    return reservation;
  }

  async getAllReservations() {
    return this.prisma.reservationMission.findMany({
      include: this.reservationInclude,
      orderBy: { dateCreation: 'desc' },
    });
  }

  /**
   * ✅ Toutes les réservations d'une mission (agent/admin)
   */
  async getReservationsByMission(missionId: string) {
    const mission = await this.prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) throw new NotFoundException(`Mission ${missionId} introuvable`);

    return this.prisma.reservationMission.findMany({
      where: { missionId },
      include: this.reservationInclude,
      orderBy: { dateCreation: 'desc' },
    });
  }

  /**
   * ✅ NOUVEAU — Réservations d'une mission filtrées par adhérent (adhérent)
   */
  async getReservationsByMissionForAdherent(missionId: string, adherentId: number) {
    const mission = await this.prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) throw new NotFoundException(`Mission ${missionId} introuvable`);

    return this.prisma.reservationMission.findMany({
      where: { missionId, adherentId },
      include: this.reservationInclude,
      orderBy: { dateCreation: 'desc' },
    });
  }

  /**
   * ✅ Annulation libre — EN_ATTENTE seulement (agent n'a pas répondu)
   */
  async cancelPendingReservation(id: string, adherentId: number) {
    const reservation = await this.prisma.reservationMission.findUnique({
      where: { id },
      include: { adherent: { include: { user: true } } },
    });
    if (!reservation) throw new NotFoundException(`Réservation ${id} introuvable`);
    if (reservation.adherentId !== adherentId) throw new BadRequestException('Accès refusé');
    if (reservation.statut !== StatutReservation.EN_ATTENTE)
      throw new BadRequestException(
        'Cette annulation rapide est uniquement disponible pour les réservations en attente de réponse',
      );

    const now = new Date();
    const dateDepart = new Date(
      `${reservation.dateDepart.toISOString().split('T')[0]}T${reservation.heureDepart}:00`,
    );
    const diffAvantMission = (dateDepart.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffAvantMission < DELAI_BLOCAGE_AVANT_MISSION_HEURES)
      throw new BadRequestException(
        `Annulation impossible : la mission démarre dans moins d'${DELAI_BLOCAGE_AVANT_MISSION_HEURES}h`,
      );

    const updated = await this.prisma.reservationMission.update({
      where: { id },
      data: {
        statut: StatutReservation.ANNULEE,
        dateAnnulation: new Date(),
        motifAnnulation: "Annulée par l'adhérent — agent non répondant",
        annulePar: 'ADHERENT',
      },
      include: this.reservationInclude,
    });
    this.logger.log(
      `🚫 Réservation EN_ATTENTE annulée (agent non répondant): ${reservation.numeroReservation}`,
    );
    return updated;
  }
}