// src/Module/demande-partenaire/demande-partenaire.service.ts

import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDemandePartenaireDto } from './dto/create-demande-partenaire.dto';
import {
  StatutDemande,
  StatutRendezvous,
  TypeReservation,
  TypeRendezvous,
  ResultatRendezvous,
} from '@prisma/client';
import { EmailService } from '../email/email.service';
import { AccepterDemandeDto } from './dto/accepter-demande.dto';
import * as crypto from 'crypto';
import * as path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { FastifyFileKV } from '../demande-adherent/Types/types';
import { DemandePartenaireGateway } from './gateways/demande-partenaire.gateway';

@Injectable()
export class DemandePartenaireService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly gateway: DemandePartenaireGateway,
  ) {}

  // ================== SUPABASE ==================

  private supabase: SupabaseClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  private static readonly BUCKET = 'documents';

  /**
   * Upload le contrat PDF vers Supabase Storage.
   * Retourne l'URL publique + métadonnées à stocker en base.
   */
  private async saveContratFile(
    demandeId: number,
    file: FastifyFileKV,
  ): Promise<{ cheminDocument: string; nomFichier: string; tailleDocument: number }> {
    if (!file?.mimetype) {
      throw new BadRequestException('Contrat: fichier invalide (mimetype manquant)');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException(
        `Contrat: type non autorisé (${file.mimetype}). Seul PDF est accepté.`,
      );
    }

    const uniqueName = `contrat_${uuidv4()}${path.extname(file.filename)}`;
    const storagePath = `contrats/${demandeId}/${uniqueName}`;

    const { error } = await this.supabase.storage
      .from(DemandePartenaireService.BUCKET)
      .upload(storagePath, file.value, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      throw new Error(`Upload contrat Supabase échoué: ${error.message}`);
    }

    const { data } = this.supabase.storage
      .from(DemandePartenaireService.BUCKET)
      .getPublicUrl(storagePath);

    return {
      cheminDocument: data.publicUrl,
      nomFichier: file.filename,
      tailleDocument: file.value.length,
    };
  }

  /**
   * Extrait le storagePath depuis une URL publique Supabase.
   * URL format : https://<project>.supabase.co/storage/v1/object/public/<bucket>/<storagePath>
   */
  private extractStoragePath(publicUrl: string): string | null {
    const marker = `/object/public/${DemandePartenaireService.BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.slice(idx + marker.length);
  }

  // ================== CRÉATION ==================

  async create(createDto: CreateDemandePartenaireDto) {
    const {
      nom, entite, statut, telephone, email, confirmEmail,
      nombreDeplacements, nombreAgences, typeRdv, dateRdv, creneau,
    } = createDto;

    if (email !== confirmEmail) {
      throw new BadRequestException('Les emails ne correspondent pas');
    }

    const existingAdherentDemand = await this.prisma.demandeAdhesion.findFirst({
      where: { email },
    });
    if (existingAdherentDemand) {
      throw new BadRequestException(
        "Cet email est déjà utilisé pour une demande d'adhésion. Un email ne peut être associé qu'à un seul type de demande.",
      );
    }

    const existingAdherent = await this.prisma.adherent.findFirst({
      where: { user: { email } },
      include: { user: true },
    });
    if (existingAdherent) {
      throw new BadRequestException(
        "Cet email est déjà associé à un compte adhérent. Un email ne peut être associé qu'à un seul type de rôle.",
      );
    }

    const existingDemande = await this.prisma.demandePartenaire.findFirst({
      where: {
        email,
        statutDemande: {
          in: [StatutDemande.EN_ATTENTE, StatutDemande.EN_COURS_TRAITEMENT, StatutDemande.ACCEPTEE],
        },
      },
    });
    if (existingDemande) {
      throw new ConflictException('Une demande de partenariat est déjà en cours pour cet email');
    }

    const dateReservee = await this.prisma.dateIndisponible.findFirst({
      where: { date: new Date(dateRdv), estActif: true },
    });
    if (dateReservee) {
      throw new BadRequestException(
        `La date ${dateRdv} n'est pas disponible (${dateReservee.motif})`,
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rdvDate = new Date(dateRdv);
    rdvDate.setHours(0, 0, 0, 0);
    if (rdvDate < today) {
      throw new BadRequestException('La date du rendez-vous ne peut pas être dans le passé');
    }

    const demande = await this.prisma.$transaction(async (tx) => {
      const creneauExistant = await tx.creneauReserve.findUnique({
        where: { date_creneau: { date: new Date(dateRdv), creneau } },
      });
      if (creneauExistant && creneauExistant.estActif) {
        throw new ConflictException(`Le créneau ${creneau} est déjà réservé pour le ${dateRdv}`);
      }

      const nouveauCreneauReserve = await tx.creneauReserve.create({
        data: {
          date: new Date(dateRdv),
          creneau,
          type: TypeReservation.RENDEZ_VOUS,
          motif: `RDV ${typeRdv} - ${entite}`,
          estActif: true,
        },
      });

      return tx.demandePartenaire.create({
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
              creneauReserveId: nouveauCreneauReserve.id,
            },
          },
        },
        include: {
          rendezvous: { include: { creneauReserve: true } },
        },
      });
    });

    try {
      await this.emailService.sendDemandePartenaireConfirmation({
        email: demande.email,
        nom: demande.nom,
        entite: demande.entite,
        typeRdv: demande.rendezvous.typeRdv,
        dateRdv: demande.rendezvous.dateRdv,
        creneau: demande.rendezvous.creneau,
      });
    } catch (error: any) {
      console.error('❌ Erreur envoi email confirmation partenaire:', error.message);
    }

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
        nombreAgences: demande.nombreAgences,
      });
    } catch (error: any) {
      console.error('❌ Erreur envoi notification équipe:', error.message);
    }

    this.gateway.notifyNewDemande({
      email: demande.email,
      id: demande.id,
      nom: demande.nom,
      entite: demande.entite,
      message: 'Nouvelle demande partenaire reçue',
    });

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
          statut: demande.rendezvous.statut,
        },
        createdAt: demande.createdAt,
      },
    };
  }

  // ================== LECTURE / FILTRES ==================

  async findAll() {
    const demandes = await this.prisma.demandePartenaire.findMany({
      include: {
        rendezvous: { include: { creneauReserve: true } },
        partenaire: {
          select: { id: true, nom: true, email: true, estActif: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, count: demandes.length, demandes };
  }

  async findOne(id: number) {
    const demande = await this.prisma.demandePartenaire.findUnique({
      where: { id },
      include: {
        rendezvous: { include: { creneauReserve: true } },
        partenaire: true,
      },
    });

    if (!demande) throw new NotFoundException(`Demande de partenariat #${id} introuvable`);

    return { success: true, demande };
  }

  async findByStatut(statut: StatutDemande) {
    const demandes = await this.prisma.demandePartenaire.findMany({
      where: { statutDemande: statut },
      include: {
        rendezvous: { include: { creneauReserve: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, statut, count: demandes.length, demandes };
  }

  // ================== CONFIRMER RDV ==================

  async confirmerRendezvous(id: number, profileUrl: string) {
    const demande = await this.prisma.demandePartenaire.findUnique({
      where: { id },
      include: { rendezvous: { include: { creneauReserve: true } } },
    });

    if (!demande) throw new NotFoundException(`Demande #${id} introuvable`);
    if (demande.statutDemande === StatutDemande.EN_COURS_TRAITEMENT) {
      throw new ConflictException('Cette demande est déjà en cours de traitement');
    }
    if (!demande.rendezvous) {
      throw new BadRequestException('Aucun rendez-vous associé à cette demande');
    }

    const [demandeMiseAJour] = await this.prisma.$transaction([
      this.prisma.demandePartenaire.update({
        where: { id },
        data: { statutDemande: StatutDemande.EN_COURS_TRAITEMENT },
        include: { rendezvous: true },
      }),
      this.prisma.rendezvous.update({
        where: { id: demande.rendezvous.id },
        data: { statut: StatutRendezvous.CONFIRME },
      }),
    ]);

    this.gateway.notifyStatutChange({ id, statut: 'EN_COURS_TRAITEMENT' });

    try {
      await this.emailService.sendConfirmationRendezvousPartenaire({
        email:     demandeMiseAJour.email,
        nom:       demandeMiseAJour.nom,
        entite:    demandeMiseAJour.entite,
        typeRdv:   demandeMiseAJour.rendezvous.typeRdv,
        dateRdv:   demandeMiseAJour.rendezvous.dateRdv,
        creneau:   demandeMiseAJour.rendezvous.creneau,
        lienVisio: demandeMiseAJour.rendezvous.lienVisio,
        adresse:   demandeMiseAJour.rendezvous.adresse,
      });
    } catch (error: any) {
      console.error('❌ Erreur envoi email confirmation RDV:', error.message);
    }

    return {
      success: true,
      message: 'Demande passée en cours de traitement avec succès',
      demande: demandeMiseAJour,
    };
  }

  // ================== ACCEPTER ==================

  private generatePartnerCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from(
      { length: 8 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');
  }

  async accepterDemande(id: number, dto: AccepterDemandeDto, contratFiles: FastifyFileKV[]) {
    const demande = await this.prisma.demandePartenaire.findUnique({
      where: { id },
      include: { rendezvous: true, contrat: true },
    });

    if (!demande) throw new NotFoundException(`Demande #${id} introuvable`);
    if (demande.statutDemande === StatutDemande.ACCEPTEE) {
      throw new ConflictException('Cette demande a déjà été acceptée');
    }
    if (!demande.rendezvous) {
      throw new BadRequestException('Aucun rendez-vous associé à cette demande');
    }
    if (!contratFiles || contratFiles.length === 0) {
      throw new BadRequestException('Le fichier contrat est obligatoire');
    }
    if (contratFiles.length > 1) {
      throw new BadRequestException('Un seul fichier contrat est autorisé');
    }

    // ── Upload contrat vers Supabase (avant la transaction Prisma)
    const { cheminDocument, nomFichier, tailleDocument } =
      await this.saveContratFile(id, contratFiles[0]);

    const profileToken       = crypto.randomBytes(32).toString('hex');
    const profileTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const codePartenaire     = this.generatePartnerCode();

    const { contrat, demandeAcceptee } = await this.prisma.$transaction(async (tx) => {
      const contrat = await tx.contratPartenaire.create({
        data: {
          dateSignature:           new Date(dto.dateSignature),
          dateFinContrat:          new Date(dto.dateFinContrat),
          cheminDocument,          // ✅ URL publique Supabase
          nomFichier,
          tailleDocument,
          notesInternes:           dto.notesInternes,
          prixParKm:               dto.prixParKm,
          depassementKilometrage:  dto.depassementKilometrage,
          retardSansAvertissement: dto.retardSansAvertissement,
          restitutionAutreEndroit: dto.restitutionAutreEndroit,
          demandePartenaireId:     id,
        },
      });

      const demandeAcceptee = await tx.demandePartenaire.update({
        where: { id },
        data: {
          statutDemande:     StatutDemande.ACCEPTEE,
          profileToken,
          profileTokenExpiry,
          codePartenaire,
        },
        include: { rendezvous: true, contrat: true },
      });

      return { contrat, demandeAcceptee };
    });

    this.gateway.notifyStatutChange({ id, statut: 'ACCEPTEE' });

    const profileUrl = `${process.env.FRONTEND_URL}/formulaire/partenaire/inscription-formulaire/${profileToken}?code=${codePartenaire}`;

    try {
      await this.emailService.sendAcceptationPartenaireAvecProfil({
        email:                demandeAcceptee.email,
        nom:                  demandeAcceptee.nom,
        entite:               demandeAcceptee.entite,
        profileUrl,
        dateExpiration:       profileTokenExpiry,
        dateSignatureContrat: contrat.dateSignature,
        dateFinContrat:       contrat.dateFinContrat,
        contratPath:          contrat.cheminDocument, // ✅ URL publique Supabase
        contratName:          contrat.nomFichier,
        codePartenaire,
      });
    } catch (error: any) {
      console.error('❌ Erreur envoi email partenaire:', error.message);
    }

    return {
      success: true,
      message: 'Demande acceptée, contrat enregistré, code généré et email envoyé.',
      demande: demandeAcceptee,
      contrat,
      profileUrl,
      codePartenaire,
    };
  }

  // ================== REFUSER ==================

  async refuserDemande(id: number, motif?: string) {
    const demande = await this.prisma.demandePartenaire.findUnique({
      where: { id },
      include: { rendezvous: true },
    });

    if (!demande) throw new NotFoundException(`Demande #${id} introuvable`);
    if (demande.statutDemande === StatutDemande.REFUSEE) {
      throw new ConflictException('Cette demande a déjà été refusée');
    }

    const demandeRefusee = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.demandePartenaire.update({
        where: { id },
        data: {
          statutDemande: StatutDemande.REFUSEE,
          notesInternes: motif,
        },
        include: { rendezvous: true },
      });

      if (updated.rendezvous?.creneauReserveId) {
        await tx.creneauReserve.update({
          where: { id: updated.rendezvous.creneauReserveId },
          data: { estActif: false },
        });
      }

      return updated;
    });

    this.gateway.notifyStatutChange({ id, statut: 'REFUSEE' });

    try {
      await this.emailService.sendPartenaireDemandeRefusee(
        demandeRefusee.email,
        demandeRefusee.nom,
        demandeRefusee.entite,
        motif,
      );
    } catch (error: any) {
      console.error('❌ Erreur envoi email refus:', error.message);
    }

    return {
      success: true,
      message: 'Demande refusée',
      demande: demandeRefusee,
    };
  }

  // ================== CRÉNEAUX ==================

  async getCreneauxDisponibles(date: string) {
    const CRENEAUX_HORAIRES = [
      '08:30 - 09:00', '09:00 - 09:30', '09:30 - 10:00',
      '10:00 - 10:30', '10:30 - 11:00', '11:00 - 11:30',
      '11:30 - 12:00', '13:00 - 13:30', '13:30 - 14:00',
      '14:00 - 14:30', '14:30 - 15:00', '15:00 - 15:30',
      '15:30 - 16:00', '16:00 - 16:30', '16:30 - 17:00',
      '17:00 - 17:30',
    ];

    const dateIndisponible = await this.prisma.dateIndisponible.findUnique({
      where: { date: new Date(date) },
    });

    if (dateIndisponible && dateIndisponible.estActif) {
      return {
        success: true,
        date,
        disponible: false,
        motif: dateIndisponible.motif,
        creneaux: [],
        creneauxReserves: [],
      };
    }

    const creneauxReserves = await this.prisma.creneauReserve.findMany({
      where: { date: new Date(date), estActif: true },
      select: { creneau: true, motif: true },
    });

    const creneauxReservesSet = new Set(creneauxReserves.map((cr) => cr.creneau));
    const creneauxDisponibles = CRENEAUX_HORAIRES.filter(
      (creneau) => !creneauxReservesSet.has(creneau),
    );

    return {
      success: true,
      date,
      disponible: true,
      creneaux: creneauxDisponibles,
      creneauxReserves: creneauxReserves.map((cr) => ({
        creneau: cr.creneau,
        motif: cr.motif,
      })),
      totalDisponibles: creneauxDisponibles.length,
      totalReserves: creneauxReserves.length,
    };
  }

  async getDatesIndisponibles(annee: number, mois: number) {
    const debut = new Date(annee, mois - 1, 1);
    const fin   = new Date(annee, mois, 0);

    const dates = await this.prisma.dateIndisponible.findMany({
      where: { date: { gte: debut, lte: fin }, estActif: true },
      select: { date: true, motif: true },
      orderBy: { date: 'asc' },
    });

    return {
      success: true,
      annee,
      mois,
      count: dates.length,
      dates: dates.map((d) => ({
        date: d.date.toISOString().split('T')[0],
        motif: d.motif,
      })),
    };
  }

  // ================== DATES BLOQUÉES ==================

  async bloquerDate(date: string, motif: string) {
    const dateExistante = await this.prisma.dateIndisponible.findUnique({
      where: { date: new Date(date) },
    });

    if (dateExistante) throw new ConflictException(`La date ${date} est déjà bloquée`);

    const dateBloquee = await this.prisma.dateIndisponible.create({
      data: { date: new Date(date), motif, estActif: true },
    });

    return {
      success: true,
      message: 'Date bloquée avec succès',
      date: {
        date: dateBloquee.date.toISOString().split('T')[0],
        motif: dateBloquee.motif,
      },
    };
  }

  async debloquerDate(date: string) {
    const dateBloquee = await this.prisma.dateIndisponible.findUnique({
      where: { date: new Date(date) },
    });

    if (!dateBloquee) throw new NotFoundException(`La date ${date} n'est pas bloquée`);

    await this.prisma.dateIndisponible.update({
      where: { date: new Date(date) },
      data: { estActif: false },
    });

    return { success: true, message: 'Date débloquée avec succès', date };
  }

  // ================== STATISTIQUES ==================

  async getStatistiques() {
    const [total, enAttente, enCours, acceptees, refusees] = await Promise.all([
      this.prisma.demandePartenaire.count(),
      this.prisma.demandePartenaire.count({ where: { statutDemande: StatutDemande.EN_ATTENTE } }),
      this.prisma.demandePartenaire.count({ where: { statutDemande: StatutDemande.EN_COURS_TRAITEMENT } }),
      this.prisma.demandePartenaire.count({ where: { statutDemande: StatutDemande.ACCEPTEE } }),
      this.prisma.demandePartenaire.count({ where: { statutDemande: StatutDemande.REFUSEE } }),
    ]);

    return {
      success: true,
      statistiques: {
        total,
        parStatut: { enAttente, enCours, acceptees, refusees },
        tauxAcceptation: total > 0 ? Math.round((acceptees / total) * 100) : 0,
      },
    };
  }

  // ================== SUPPRESSION ==================

  async remove(id: number) {
    const demande = await this.prisma.demandePartenaire.findUnique({
      where: { id },
      include: {
        rendezvous: { include: { creneauReserve: true } },
        contrat: { select: { cheminDocument: true } }, // ✅ récupérer l'URL du contrat
      },
    });

    if (!demande) throw new NotFoundException(`Demande #${id} introuvable`);

    if (demande.statutDemande === StatutDemande.ACCEPTEE && demande.partenaireId) {
      throw new BadRequestException(
        'Impossible de supprimer une demande acceptée avec un partenaire associé',
      );
    }

    // ── Supprimer le contrat depuis Supabase Storage (non-bloquant)
    if (demande.contrat?.cheminDocument) {
      const storagePath = this.extractStoragePath(demande.contrat.cheminDocument);
      if (storagePath) {
        const { error } = await this.supabase.storage
          .from(DemandePartenaireService.BUCKET)
          .remove([storagePath]);
        if (error) {
          console.error(`Supabase delete contrat error (demande #${id}):`, error.message);
        }
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (demande.rendezvous?.creneauReserveId) {
        await tx.creneauReserve.delete({
          where: { id: demande.rendezvous.creneauReserveId },
        });
      }

      if (demande.rendezvous) {
        await tx.rendezvous.delete({ where: { id: demande.rendezvous.id } });
      }

      return tx.demandePartenaire.delete({ where: { id } });
    });

    return {
      success: true,
      message: `Demande #${id} supprimée avec succès`,
      demande: { id: result.id, nom: result.nom, email: result.email },
    };
  }

  // ================== REPORTER ==================

  async reporter(id: number, nouvelleDateRdv: string, nouveauCreneau: string) {
    const demande = await this.prisma.demandePartenaire.findUnique({
      where: { id },
      include: { rendezvous: { include: { creneauReserve: true } } },
    });

    if (!demande) throw new NotFoundException(`Demande #${id} introuvable`);

    if (!demande.rendezvous) {
      throw new BadRequestException('Aucun rendez-vous associé à cette demande');
    }

    if (demande.statutDemande === StatutDemande.ACCEPTEE) {
      throw new ConflictException('Impossible de reporter une demande déjà acceptée');
    }

    if (demande.statutDemande === StatutDemande.REFUSEE) {
      throw new ConflictException('Impossible de reporter une demande refusée');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rdvDate = new Date(nouvelleDateRdv);
    rdvDate.setHours(0, 0, 0, 0);
    if (rdvDate < today) {
      throw new BadRequestException('La nouvelle date ne peut pas être dans le passé');
    }

    const dateBloquee = await this.prisma.dateIndisponible.findFirst({
      where: { date: new Date(nouvelleDateRdv), estActif: true },
    });
    if (dateBloquee) {
      throw new BadRequestException(
        `La date ${nouvelleDateRdv} n'est pas disponible (${dateBloquee.motif})`,
      );
    }

    const demandeReportee = await this.prisma.$transaction(async (tx) => {
      if (demande.rendezvous.creneauReserveId) {
        await tx.creneauReserve.update({
          where: { id: demande.rendezvous.creneauReserveId },
          data: { estActif: false },
        });
      }

      const creneauExistant = await tx.creneauReserve.findUnique({
        where: {
          date_creneau: {
            date: new Date(nouvelleDateRdv),
            creneau: nouveauCreneau,
          },
        },
      });
      if (creneauExistant && creneauExistant.estActif) {
        throw new ConflictException(
          `Le créneau ${nouveauCreneau} est déjà réservé pour le ${nouvelleDateRdv}`,
        );
      }

      const nouveauCreneauReserve = await tx.creneauReserve.create({
        data: {
          date:     new Date(nouvelleDateRdv),
          creneau:  nouveauCreneau,
          type:     TypeReservation.RENDEZ_VOUS,
          motif:    `RDV reporté - ${demande.entite}`,
          estActif: true,
        },
      });

      await tx.rendezvous.update({
        where: { id: demande.rendezvous.id },
        data: {
          dateRdv:          new Date(nouvelleDateRdv),
          creneau:          nouveauCreneau,
          statut:           StatutRendezvous.PLANIFIE,
          creneauReserveId: nouveauCreneauReserve.id,
        },
      });

      return tx.demandePartenaire.update({
        where: { id },
        data: { statutDemande: StatutDemande.EN_ATTENTE },
        include: { rendezvous: true },
      });
    });

    this.gateway.notifyStatutChange({ id, statut: 'EN_ATTENTE' });

    try {
      await this.emailService.sendReportRendezvousPartenaire({
        email:   demandeReportee.email,
        nom:     demandeReportee.nom,
        entite:  demandeReportee.entite,
        typeRdv: demandeReportee.rendezvous.typeRdv,
        dateRdv: demandeReportee.rendezvous.dateRdv,
        creneau: demandeReportee.rendezvous.creneau,
      });
    } catch (error: any) {
      console.error('❌ Erreur envoi email report RDV:', error.message);
    }

    return {
      success: true,
      message: 'Rendez-vous reporté avec succès',
      demande: demandeReportee,
    };
  }

  // ================== LISTE DES RENDEZ-VOUS ==================

  async findAllRendezvous() {
    const rendezvous = await this.prisma.rendezvous.findMany({
      include: {
        demandePartenaire: {
          select: {
            id: true,
            email: true,
            nom: true,
            entite: true,
            statutDemande: true,
          },
        },
        creneauReserve: true,
      },
      orderBy: { dateRdv: 'asc' },
    });

    return {
      success: true,
      count: rendezvous.length,
      rendezvous: rendezvous.map((rdv) => ({
        id: rdv.id,
        typeRdv: rdv.typeRdv,
        dateRdv: rdv.dateRdv,
        creneau: rdv.creneau,
        statut: rdv.statut,
        lienVisio: rdv.lienVisio,
        adresse: rdv.adresse,
        email: rdv.demandePartenaire?.email,
        nom: rdv.demandePartenaire?.nom,
        entite: rdv.demandePartenaire?.entite,
        statutDemande: rdv.demandePartenaire?.statutDemande,
      })),
    };
  }
}