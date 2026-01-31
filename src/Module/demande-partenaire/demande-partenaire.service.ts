// src/Module/demande-partenaire/demande-partenaire.service.ts

import { 
  Injectable, 
  ConflictException, 
  NotFoundException,
  BadRequestException 
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDemandePartenaireDto } from './dto/create-demande-partenaire.dto';

// ✅ REMPLACER CET IMPORT COMPLET
import { 
  StatutDemande, 
  StatutRendezvous, 
  TypeReservation,
  TypeRendezvous,      // ✅ Ajouter si manquant
  ResultatRendezvous    // ✅ Ajouter si manquant
} from '@prisma/client';
import { EmailService } from '../email/email.service';

@Injectable()
export class DemandePartenaireService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * ✅ Créer une nouvelle demande de partenariat avec rendez-vous
   */
async create(createDto: CreateDemandePartenaireDto) {
  const { 
    nom, entite, statut, telephone, email, confirmEmail,
    nombreDeplacements, nombreAgences, typeRdv, dateRdv, creneau
  } = createDto;

  // 0. Vérifier correspondance emails
  if (email !== confirmEmail) {
    throw new BadRequestException('Les emails ne correspondent pas');
  }

  // 1. Vérifier si email existe déjà avec une demande en cours
  const existingDemande = await this.prisma.demandePartenaire.findFirst({
    where: { 
      email,
      statutDemande: {
        in: [StatutDemande.EN_ATTENTE, StatutDemande.EN_COURS_TRAITEMENT, StatutDemande.ACCEPTEE]
      }
    }
  });

  if (existingDemande) {
    throw new ConflictException(
      'Une demande de partenariat est déjà en cours pour cet email'
    );
  }

  // 2. Vérifier si la date est réservée
  const dateReservee = await this.prisma.dateIndisponible.findFirst({
    where: {
      date: new Date(dateRdv),
      estActif: true
    }
  });

  if (dateReservee) {
    throw new BadRequestException(
      `La date ${dateRdv} n'est pas disponible (${dateReservee.motif})`
    );
  }

  // 3. Vérifier que la date n'est pas dans le passé
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rdvDate = new Date(dateRdv);
  rdvDate.setHours(0, 0, 0, 0);
  
  if (rdvDate < today) {
    throw new BadRequestException(
      'La date du rendez-vous ne peut pas être dans le passé'
    );
  }

  // 4. Créer la demande avec rendez-vous et réservation en transaction
  const demande = await this.prisma.$transaction(async (tx) => {
    // Vérifier le créneau dans la transaction (éviter race condition)
    const creneauExistant = await tx.creneauReserve.findUnique({
      where: {
        date_creneau: {
          date: new Date(dateRdv),
          creneau: creneau
        }
      }
    });

    if (creneauExistant && creneauExistant.estActif) {
      throw new ConflictException(
        `Le créneau ${creneau} est déjà réservé pour le ${dateRdv}`
      );
    }

    // Créer le créneau réservé
    const nouveauCreneauReserve = await tx.creneauReserve.create({
      data: {
        date: new Date(dateRdv),
        creneau: creneau,
        type: TypeReservation.RENDEZ_VOUS,
        motif: `RDV ${typeRdv} - ${entite}`,
        estActif: true
      }
    });

    // Créer la demande de partenariat avec le rendez-vous
    const nouvelleDemande = await tx.demandePartenaire.create({
      data: {
        nom, entite, statut, telephone, email,
        nombreDeplacements, nombreAgences,
        statutDemande: StatutDemande.EN_ATTENTE,
        rendezvous: {
          create: {
            typeRdv,
            dateRdv: new Date(dateRdv),
            creneau,
            statut: StatutRendezvous.PLANIFIE,
            creneauReserveId: nouveauCreneauReserve.id
          }
        }
      },
      include: {
        rendezvous: {
          include: {
            creneauReserve: true
          }
        }
      }
    });

    return nouvelleDemande;
  });

  // 5. Envoyer l'email de confirmation au partenaire
  try {
    await this.emailService.sendDemandePartenaireConfirmation({
      email: demande.email,
      nom: demande.nom,
      entite: demande.entite,
      typeRdv: demande.rendezvous.typeRdv,
      dateRdv: demande.rendezvous.dateRdv,
      creneau: demande.rendezvous.creneau
    });
  } catch (error) {
    console.error('❌ Erreur envoi email confirmation partenaire:', {
      email: demande.email,
      error: error.message
    });
  }

  // 6. Envoyer notification interne à l'équipe commerciale
  try {
    await this.emailService.sendNotificationNouvelleDemandePartenaire({
      nom: demande.nom,
      entite: demande.entite,
      email: demande.email,
      telephone: demande.telephone,
      statut: demande.statut,
      typeRdv: demande.rendezvous.typeRdv,
      dateRdv: demande.rendezvous.dateRdv,
      creneau: demande.rendezvous.creneau,
      nombreDeplacements: demande.nombreDeplacements,
      nombreAgences: demande.nombreAgences
    });
  } catch (error) {
    console.error('❌ Erreur envoi notification équipe:', {
      demande: demande.id,
      error: error.message
    });
  }

  return {
    success: true,
    message: 'Demande de partenariat créée avec succès',
    demande: {
      id: demande.id,
      nom: demande.nom,
      entite: demande.entite,
      email: demande.email,
      statutDemande: demande.statutDemande,
      rendezvous: {
        id: demande.rendezvous.id,
        typeRdv: demande.rendezvous.typeRdv,
        dateRdv: demande.rendezvous.dateRdv,
        creneau: demande.rendezvous.creneau,
        statut: demande.rendezvous.statut
      },
      createdAt: demande.createdAt
    }
  };
}


  /**
   * 📋 Récupérer toutes les demandes avec leurs rendez-vous
   */
  async findAll() {
    const demandes = await this.prisma.demandePartenaire.findMany({
      include: {
        rendezvous: {
          include: {
            creneauReserve: true
          }
        },
        partenaire: {
          select: {
            id: true,
            nom: true,
            email: true,
            estActif: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      success: true,
      count: demandes.length,
      demandes
    };
  }

  /**
   * 🔍 Récupérer une demande par ID
   */
  async findOne(id: number) {
    const demande = await this.prisma.demandePartenaire.findUnique({
      where: { id },
      include: {
        rendezvous: {
          include: {
            creneauReserve: true
          }
        },
        partenaire: true
      }
    });

    if (!demande) {
      throw new NotFoundException(`Demande de partenariat #${id} introuvable`);
    }

    return {
      success: true,
      demande
    };
  }

  /**
   * 📊 Récupérer les demandes par statut
   */
  async findByStatut(statut: StatutDemande) {
    const demandes = await this.prisma.demandePartenaire.findMany({
      where: { statutDemande: statut },
      include: {
        rendezvous: {
          include: {
            creneauReserve: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      success: true,
      statut,
      count: demandes.length,
      demandes
    };
  }

  /**
   * ✅ Accepter une demande de partenariat
   */
 async accepterDemande(id: number, profileUrl: string) {
  const demande = await this.prisma.demandePartenaire.findUnique({
    where: { id },
    include: { 
      rendezvous: {
        include: {
          creneauReserve: true
        }
      }
    }
  });

  if (!demande) {
    throw new NotFoundException(`Demande de partenariat #${id} introuvable`);
  }

  if (demande.statutDemande === StatutDemande.ACCEPTEE) {
    throw new ConflictException('Cette demande a déjà été acceptée');
  }

  if (!demande.rendezvous) {
    throw new BadRequestException('Aucun rendez-vous associé à cette demande');
  }

  // Mettre à jour le statut
  const demandeAcceptee = await this.prisma.demandePartenaire.update({
    where: { id },
    data: {
      statutDemande: StatutDemande.ACCEPTEE
    },
    include: {
      rendezvous: true
    }
  });

  // Envoyer email de confirmation du rendez-vous avec lien profil
  try {
    await this.emailService.sendConfirmationRendezvousPartenaire({
      email: demandeAcceptee.email,
      nom: demandeAcceptee.nom,
      entite: demandeAcceptee.entite,
      typeRdv: demandeAcceptee.rendezvous.typeRdv,
      dateRdv: demandeAcceptee.rendezvous.dateRdv,
      creneau: demandeAcceptee.rendezvous.creneau,
      lienVisio: demandeAcceptee.rendezvous.lienVisio,
      adresse: demandeAcceptee.rendezvous.adresse,
    });
  } catch (error) {
    console.error('❌ Erreur envoi email confirmation rendez-vous:', {
      demandeId: id,
      email: demandeAcceptee.email,
      error: error.message
    });
    // Ne pas bloquer l'acceptation si l'email échoue
  }

  return {
    success: true,
    message: 'Demande acceptée avec succès',
    demande: demandeAcceptee
  };
}


  /**
   * ❌ Refuser une demande de partenariat
   */
  async refuserDemande(id: number, motif?: string) {
    const demande = await this.prisma.demandePartenaire.findUnique({
      where: { id },
      include: { rendezvous: true }
    });

    if (!demande) {
      throw new NotFoundException(`Demande de partenariat #${id} introuvable`);
    }

    if (demande.statutDemande === StatutDemande.REFUSEE) {
      throw new ConflictException('Cette demande a déjà été refusée');
    }

    // Transaction pour refuser + libérer le créneau
    const demandeRefusee = await this.prisma.$transaction(async (tx) => {
      // Refuser la demande
      const updated = await tx.demandePartenaire.update({
        where: { id },
        data: {
          statutDemande: StatutDemande.REFUSEE,
          notesInternes: motif
        },
        include: {
          rendezvous: true
        }
      });

      // Libérer le créneau réservé
      if (updated.rendezvous?.creneauReserveId) {
        await tx.creneauReserve.update({
          where: { id: updated.rendezvous.creneauReserveId },
          data: { estActif: false }
        });
      }

      return updated;
    });

    // Envoyer email de refus
    try {
      await this.emailService.sendPartenaireDemandeRefusee(
        demandeRefusee.email,
        demandeRefusee.nom,
        demandeRefusee.entite,
        motif
      );
    } catch (error) {
      console.error('❌ Erreur envoi email refus:', error);
    }

    return {
      success: true,
      message: 'Demande refusée',
      demande: demandeRefusee
    };
  }

  /**
   * 🗓️ Récupérer les créneaux disponibles pour une date donnée
   */
  async getCreneauxDisponibles(date: string) {
    const CRENEAUX_HORAIRES = [
      '08:30 - 09:00',
      '09:00 - 09:30',
      '09:30 - 10:00',
      '10:00 - 10:30',
      '10:30 - 11:00',
      '11:00 - 11:30',
      '11:30 - 12:00',
      '13:00 - 13:30',
      '13:30 - 14:00',
      '14:00 - 14:30',
      '14:30 - 15:00',
      '15:00 - 15:30',
      '15:30 - 16:00',
      '16:00 - 16:30',
      '16:30 - 17:00',
      '17:00 - 17:30'
    ];

    // Vérifier si la date est indisponible
    const dateIndisponible = await this.prisma.dateIndisponible.findUnique({
      where: {
        date: new Date(date)
      }
    });

    if (dateIndisponible && dateIndisponible.estActif) {
      return {
        success: true,
        date,
        disponible: false,
        motif: dateIndisponible.motif,
        creneaux: [],
        creneauxReserves: []
      };
    }

    // Récupérer les créneaux réservés pour cette date
    const creneauxReserves = await this.prisma.creneauReserve.findMany({
      where: {
        date: new Date(date),
        estActif: true
      },
      select: {
        creneau: true,
        motif: true
      }
    });

    const creneauxReservesSet = new Set(
      creneauxReserves.map(cr => cr.creneau)
    );

    const creneauxDisponibles = CRENEAUX_HORAIRES.filter(
      creneau => !creneauxReservesSet.has(creneau)
    );

    return {
      success: true,
      date,
      disponible: true,
      creneaux: creneauxDisponibles,
      creneauxReserves: creneauxReserves.map(cr => ({
        creneau: cr.creneau,
        motif: cr.motif
      })),
      totalDisponibles: creneauxDisponibles.length,
      totalReserves: creneauxReserves.length
    };
  }

  /**
   * 📅 Récupérer les dates indisponibles du mois
   */
  async getDatesIndisponibles(annee: number, mois: number) {
    const debut = new Date(annee, mois - 1, 1);
    const fin = new Date(annee, mois, 0);

    const dates = await this.prisma.dateIndisponible.findMany({
      where: {
        date: {
          gte: debut,
          lte: fin
        },
        estActif: true
      },
      select: {
        date: true,
        motif: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    return {
      success: true,
      annee,
      mois,
      count: dates.length,
      dates: dates.map(d => ({
        date: d.date.toISOString().split('T')[0],
        motif: d.motif
      }))
    };
  }

  /**
   * 🚫 Bloquer une date (jour férié, congé, etc.)
   */
  async bloquerDate(date: string, motif: string) {
    const dateExistante = await this.prisma.dateIndisponible.findUnique({
      where: { date: new Date(date) }
    });

    if (dateExistante) {
      throw new ConflictException(`La date ${date} est déjà bloquée`);
    }

    const dateBloquee = await this.prisma.dateIndisponible.create({
      data: {
        date: new Date(date),
        motif,
        estActif: true
      }
    });

    return {
      success: true,
      message: 'Date bloquée avec succès',
      date: {
        date: dateBloquee.date.toISOString().split('T')[0],
        motif: dateBloquee.motif
      }
    };
  }

  /**
   * ✅ Débloquer une date
   */
  async debloquerDate(date: string) {
    const dateBloquee = await this.prisma.dateIndisponible.findUnique({
      where: { date: new Date(date) }
    });

    if (!dateBloquee) {
      throw new NotFoundException(`La date ${date} n'est pas bloquée`);
    }

    await this.prisma.dateIndisponible.update({
      where: { date: new Date(date) },
      data: { estActif: false }
    });

    return {
      success: true,
      message: 'Date débloquée avec succès',
      date
    };
  }

  /**
   * ✅ Confirmer un rendez-vous (par l'équipe commerciale)
   */
  async confirmerRendezvous(
    id: number, 
    lienVisio?: string, 
    adresse?: string
  ) {
    const demande = await this.prisma.demandePartenaire.findUnique({
      where: { id },
      include: { rendezvous: true }
    });

    if (!demande) {
      throw new NotFoundException(`Demande de partenariat #${id} introuvable`);
    }

    if (!demande.rendezvous) {
      throw new BadRequestException('Aucun rendez-vous associé à cette demande');
    }

    // Mettre à jour le statut du rendez-vous
    const rdvConfirme = await this.prisma.rendezvous.update({
      where: { id: demande.rendezvous.id },
      data: {
        statut: StatutRendezvous.CONFIRME
      }
    });

    // Mettre à jour le statut de la demande
    await this.prisma.demandePartenaire.update({
      where: { id },
      data: {
        statutDemande: StatutDemande.EN_COURS_TRAITEMENT
      }
    });

    // Envoyer email de confirmation
    try {
      await this.emailService.sendConfirmationRendezvousPartenaire({
        email: demande.email,
        nom: demande.nom,
        entite: demande.entite,
        typeRdv: rdvConfirme.typeRdv,
        dateRdv: rdvConfirme.dateRdv,
        creneau: rdvConfirme.creneau,
        lienVisio,
        adresse
      });
    } catch (error) {
      console.error('❌ Erreur envoi email confirmation RDV:', error);
    }

    return {
      success: true,
      message: 'Rendez-vous confirmé avec succès',
      rendezvous: rdvConfirme
    };
  }

  /**
   * 📊 Statistiques des demandes partenaires
   */
  async getStatistiques() {
    const [total, enAttente, enCours, acceptees, refusees] = await Promise.all([
      this.prisma.demandePartenaire.count(),
      this.prisma.demandePartenaire.count({ 
        where: { statutDemande: StatutDemande.EN_ATTENTE } 
      }),
      this.prisma.demandePartenaire.count({ 
        where: { statutDemande: StatutDemande.EN_COURS_TRAITEMENT } 
      }),
      this.prisma.demandePartenaire.count({ 
        where: { statutDemande: StatutDemande.ACCEPTEE } 
      }),
      this.prisma.demandePartenaire.count({ 
        where: { statutDemande: StatutDemande.REFUSEE } 
      })
    ]);

    return {
      success: true,
      statistiques: {
        total,
        parStatut: {
          enAttente,
          enCours,
          acceptees,
          refusees
        },
        tauxAcceptation: total > 0 
          ? Math.round((acceptees / total) * 100) 
          : 0
      }
    };
  }

    async remove(id: number) {
    // 1. Vérifier que la demande existe
    const demande = await this.prisma.demandePartenaire.findUnique({
      where: { id },
      include: {
        rendezvous: {
          include: {
            creneauReserve: true
          }
        }
      }
    });

    if (!demande) {
      throw new NotFoundException(`Demande #${id} introuvable`);
    }

    // 2. Vérifier qu'on peut supprimer (optionnel - selon votre logique métier)
    if (demande.statutDemande === StatutDemande.ACCEPTEE && demande.partenaireId) {
      throw new BadRequestException(
        'Impossible de supprimer une demande acceptée avec un partenaire associé'
      );
    }

    // 3. Supprimer en transaction (cascade: rendez-vous + créneau réservé)
    const result = await this.prisma.$transaction(async (tx) => {
      // Supprimer le créneau réservé si existe
      if (demande.rendezvous?.creneauReserveId) {
        await tx.creneauReserve.delete({
          where: { id: demande.rendezvous.creneauReserveId }
        });
      }

      // Supprimer le rendez-vous (si pas de cascade dans schema)
      if (demande.rendezvous) {
        await tx.rendezvous.delete({
          where: { id: demande.rendezvous.id }
        });
      }

      // Supprimer la demande
      const deletedDemande = await tx.demandePartenaire.delete({
        where: { id }
      });

      return deletedDemande;
    });

    return {
      success: true,
      message: `Demande #${id} supprimée avec succès`,
      demande: {
        id: result.id,
        nom: result.nom,
        email: result.email
      }
    };
  }

}
