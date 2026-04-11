// src/Module/reservations-mission/services/reservations-mission.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StatutReservation } from '@prisma/client';
import { CreateReservationInput } from './dto/create-reservations-mission.input';

@Injectable()
export class ReservationsMissionService {
    private readonly logger = new Logger(ReservationsMissionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * ✅ Calculer date/heure d'arrivée automatiquement
   */
  private calculateArrivalDateTime(
    dateDepart: string,
    heureDepart: string,
    distanceKm: number,
  ): { dateArrivee: Date; heureArrivee: string; dureeEstimee: number } {
    // Créer le DateTime de départ
    const departDateTime = new Date(`${dateDepart}T${heureDepart}:00`);

    // Calculer la durée estimée (vitesse moyenne 80 km/h)
    const dureeEstimee = Math.round((distanceKm / 80) * 60); // en minutes

    // Ajouter la durée au départ
    const arrivalDateTime = new Date(departDateTime);
    arrivalDateTime.setMinutes(arrivalDateTime.getMinutes() + dureeEstimee);

    // Formater l'heure d'arrivée (HH:MM)
    const heureArrivee = arrivalDateTime.toTimeString().slice(0, 5);

    return {
      dateArrivee: arrivalDateTime,
      heureArrivee,
      dureeEstimee,
    };
  }

  /**
   * ✅ Créer une réservation
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

    // 1. Vérifier que la mission existe et est disponible
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        calculs: true,
        disponibilite: true,
        partenaire: true,
        vehicule: true,
        adresseDepart: true,
        adresseArrivee: true,
      },
    });

    if (!mission) {
      return {
        success: false,
        message: `Mission ${missionId} introuvable`,
        code: 'MISSION_NOT_FOUND',
      };
    }

    if (mission.statut !== 'EN_ATTENTE') {
      return {
        success: false,
        message: "Cette mission n'est plus disponible",
        code: 'MISSION_NOT_AVAILABLE',
      };
    }

    // 2. Vérifier que l'adhérent existe et est actif
    const adherent = await this.prisma.adherent.findUnique({
      where: { id: adherentId },
    });

    if (!adherent) {
      return {
        success: false,
        message: `Adhérent ${adherentId} introuvable`,
        code: 'ADHERENT_NOT_FOUND',
      };
    }

    if (adherent.statut !== 'ACTIF' || adherent.estBloque) {
      return {
        success: false,
        message: "Votre compte n'est pas autorisé à réserver des missions",
        code: 'ADHERENT_NOT_AUTHORIZED',
      };
    }

    // 3. Vérifier que la date de départ est dans la période de disponibilité
    if (mission.disponibilite) {
      const dateDepartInput = new Date(dateDepart);
      const disponibiliteDebut = new Date(mission.disponibilite.dateDebut);
      const disponibiliteFin = new Date(
        mission.disponibilite.dateDepartMax || mission.disponibilite.dateFin,
      );

      if (
        dateDepartInput < disponibiliteDebut ||
        dateDepartInput > disponibiliteFin
      ) {
        return {
          success: false,
          message: `La date de départ doit être entre le ${disponibiliteDebut.toLocaleDateString('fr-FR')} et le ${disponibiliteFin.toLocaleDateString('fr-FR')}`,
          code: 'INVALID_DEPARTURE_DATE',
        };
      }
    }

    // 4. ✅ Vérifier qu'il n'y a pas déjà une réservation (RETOUR AU LIEU D'EXCEPTION)
    const existingReservation = await this.prisma.reservationMission.findFirst(
      {
        where: {
          missionId,
          statut: StatutReservation.EN_ATTENTE,
        },
        include: {
          mission: {
            include: {
              vehicule: true,
              adresseDepart: true,
              adresseArrivee: true,
            },
          },
        },
      },
    );

    if (existingReservation) {
      // ✅ LOG INFO (pas ERROR)
      this.logger.log(
        `Tentative de double réservation: Mission ${missionId}, Adhérent ${adherentId}`,
      );

      return {
        success: false,
        message: 'Une réservation est déjà en attente pour cette mission',
        code: 'RESERVATION_ALREADY_EXISTS',
        reservation: existingReservation, // ✅ Retourner la réservation existante
      };
    }

    // 5. Calculer date/heure d'arrivée
    const distanceKm = Number(mission.calculs?.distanceKm || 0);
    const { dateArrivee, heureArrivee, dureeEstimee } =
      this.calculateArrivalDateTime(dateDepart, heureDepart, distanceKm);

    // 6. Générer le numéro de réservation
    const count = await this.prisma.reservationMission.count();
    const numeroReservation = `RES-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // 7. Créer la réservation
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
      include: {
        mission: {
          include: {
            vehicule: true,
            adresseDepart: true,
            adresseArrivee: true,
            partenaire: true,
            calculs: true,
          },
        },
      },
    });

    this.logger.log(`✅ Réservation créée: ${numeroReservation}`);

    return {
      success: true,
      message: 'Réservation créée avec succès',
      reservation,
    };
  }

  /**
   * ✅ Récupérer toutes les réservations d'un adhérent
   */
  async getReservationsByAdherent(adherentId: number) {
    return this.prisma.reservationMission.findMany({
      where: { adherentId },
      include: {
        mission: {
          include: {
            vehicule: true,
            adresseDepart: true,
            adresseArrivee: true,
            partenaire: true,
            calculs: true,
          },
        },
      },
      orderBy: { dateCreation: 'desc' },
    });
  }

  /**
   * ✅ Récupérer une réservation par ID
   */
  async getReservationById(id: string) {
    const reservation = await this.prisma.reservationMission.findUnique({
      where: { id },
      include: {
        mission: {
          include: {
            vehicule: true,
            adresseDepart: true,
            adresseArrivee: true,
            partenaire: true,
            calculs: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Réservation ${id} introuvable`);
    }

    return reservation;
  }

  /**
   * ✅ Récupérer toutes les réservations (pour le partenaire/admin)
   */
  async getAllReservations() {
    return this.prisma.reservationMission.findMany({
      include: {
        mission: {
          include: {
            vehicule: true,
            adresseDepart: true,
            adresseArrivee: true,
            partenaire: true,
            calculs: true,
          },
        },
      },
      orderBy: { dateCreation: 'desc' },
    });
  }

  /**
   * ✅ Annuler une réservation (par l'adhérent)
   */
  async cancelReservation(id: string, adherentId: number) {
    const reservation = await this.prisma.reservationMission.findUnique({
      where: { id },
      include: {
        mission: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Réservation ${id} introuvable`);
    }

    if (reservation.adherentId !== adherentId) {
      throw new BadRequestException(
        'Vous ne pouvez pas annuler cette réservation',
      );
    }

    if (
      reservation.statut !== StatutReservation.EN_ATTENTE &&
      reservation.statut !== StatutReservation.CONFIRMEE
    ) {
      throw new BadRequestException(
        'Cette réservation ne peut plus être annulée',
      );
    }

    const updatedReservation = await this.prisma.reservationMission.update({
      where: { id },
      data: {
        statut: StatutReservation.ANNULEE,
      },
      include: {
        mission: {
          include: {
            vehicule: true,
            adresseDepart: true,
            adresseArrivee: true,
          },
        },
      },
    });

    console.log(`❌ Réservation annulée: ${reservation.numeroReservation}`);

    return updatedReservation;
  }

  /**
   * ✅ Confirmer une réservation (par le partenaire)
   */
  async confirmReservation(id: string, partenaireId: number) {
    const reservation = await this.prisma.reservationMission.findUnique({
      where: { id },
      include: {
        mission: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Réservation ${id} introuvable`);
    }

    if (reservation.mission.partenaireId !== partenaireId) {
      throw new BadRequestException(
        'Vous ne pouvez pas confirmer cette réservation',
      );
    }

    if (reservation.statut !== StatutReservation.EN_ATTENTE) {
      throw new BadRequestException(
        'Cette réservation ne peut plus être confirmée',
      );
    }

    const updatedReservation = await this.prisma.reservationMission.update({
      where: { id },
      data: {
        statut: StatutReservation.CONFIRMEE,
        dateValidation: new Date(),
      },
      include: {
        mission: {
          include: {
            vehicule: true,
            adresseDepart: true,
            adresseArrivee: true,
          },
        },
      },
    });

    console.log(`✅ Réservation confirmée: ${reservation.numeroReservation}`);

    return updatedReservation;
  }

  /**
   * ✅ Refuser une réservation (par le partenaire)
   */
  async refuseReservation(
    id: string,
    partenaireId: number,
    motifRefus: string,
  ) {
    const reservation = await this.prisma.reservationMission.findUnique({
      where: { id },
      include: {
        mission: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Réservation ${id} introuvable`);
    }

    if (reservation.mission.partenaireId !== partenaireId) {
      throw new BadRequestException(
        'Vous ne pouvez pas refuser cette réservation',
      );
    }

    if (reservation.statut !== StatutReservation.EN_ATTENTE) {
      throw new BadRequestException(
        'Cette réservation ne peut plus être refusée',
      );
    }

    const updatedReservation = await this.prisma.reservationMission.update({
      where: { id },
      data: {
        statut: StatutReservation.REFUSEE,
        dateRefus: new Date(),
        motifRefus,
      },
      include: {
        mission: {
          include: {
            vehicule: true,
            adresseDepart: true,
            adresseArrivee: true,
          },
        },
      },
    });

    console.log(`❌ Réservation refusée: ${reservation.numeroReservation}`);
    console.log(`   Motif: ${motifRefus}`);

    return updatedReservation;
  }
}
