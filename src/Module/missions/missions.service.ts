// missions.service.ts

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { RouteCalculatorService } from '../route-calculator/route-calculator.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateMissionDto } from './dto/create-mission.dto';
import { MissionResponseDto } from './dto/mission-response.dto';
import { MissionDetailsType } from './dto/mission-card.model';
import { TypeCarburantEnum, TypeVehiculeEnum } from './dto/enums';
import { Adresse, CalculMission, DisponibiliteMission, Mission, Prisma, StatutMission, StatutReservation, Vehicule } from '@prisma/client';
import { AlertesService } from '../alertes/alertes.service';
import { SearchByPositionInput, SearchByTrajetInput } from './types/mission-search-filters.input';
import { GeoService } from '../geo/geo.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DemandePartenaireService } from '../demande-partenaire/demande-partenaire.service';
import { ScoresMlService } from '../scores-ml/scores-ml.service';


export type MissionWithRelations = Mission & {
  vehicule: Vehicule;
  adresseDepart: Adresse;
  adresseArrivee: Adresse;
  calculs?: CalculMission;
  disponibilite?: DisponibiliteMission;
    isFavori: boolean; // ✅ ajouter cette ligne

};

export type MissionWithRelationsFlat = Omit<MissionWithRelations, 'calculs'> & {
  calculs: {
    id: string;
    missionId: string;
    distanceKm: number;
    fraisPeage: number;
    montantTotal: number;
    detailCalcul: any;
    dateCalcul: Date;
    dateModification: Date;
  } | null;
};




@Injectable()
export class MissionsService {
  private readonly PRIX_PAR_KM = 0.95;

  constructor(
    private readonly prisma: PrismaService,
    private readonly routeCalculator: RouteCalculatorService,
    private readonly alertesService: AlertesService,
    private readonly geoService: GeoService,
    private readonly httpService: HttpService,
    private readonly demandePartenaireService: DemandePartenaireService,
    private readonly scoresMlService: ScoresMlService,
  ) {}


  // ─────────────────────────────────────────────────────────────
  //  RECHERCHE PAR POSITION (adhérent)
  // ─────────────────────────────────────────────────────────────


 private async getMissionIdsBloquees(adherentId?: number): Promise<string[]> {
  if (!adherentId) return [];

  const statutsBloquants: StatutReservation[] = [
    StatutReservation.EN_ATTENTE,
    StatutReservation.ACCEPTED_BY_AGENT,
    StatutReservation.CONFIRMED_BY_ADHERENT,
    StatutReservation.ANNULATION_DEMANDEE,
  ];

  const reservations = await this.prisma.reservationMission.findMany({
    where: {
      adherentId,
      statut: { in: statutsBloquants },
    },
    select: { missionId: true },
  });

  return reservations.map((r) => r.missionId);
}



async searchMissionsByPosition(
  filters: SearchByPositionInput,
  page: number = 1,
  pageSize: number = 20,
  adherentId?: number,
): Promise<{ missions: MissionWithRelations[]; total: number }> {
  console.log('\n🔍 ========== RECHERCHE PAR POSITION ==========');
  console.log('📍 Filtres:', JSON.stringify(filters, null, 2));

  if (!filters || !filters.latitude || !filters.longitude || !filters.rayon) {
    console.error('❌ Paramètres manquants');
    return { missions: [], total: 0 };
  }

  const missionIdsBloquees = await this.getMissionIdsBloquees(adherentId);

  const allMissions = await this.prisma.mission.findMany({
    where: {
      statut: StatutMission.EN_ATTENTE,
      ...(missionIdsBloquees.length > 0 && {
        id: { notIn: missionIdsBloquees },
      }),
    },
    include: {
      vehicule: true,
      adresseDepart: true,
      adresseArrivee: true,
      calculs: true,
      disponibilite: true,
      // ✅ Même logique que getMissionsForCards
      favoris: adherentId
        ? { where: { adherentId } }
        : false,
    },
  });

  console.log(`📊 Total missions EN_ATTENTE: ${allMissions.length}`);

  if (allMissions.length === 0) {
    return { missions: [], total: 0 };
  }

  console.log(
    `🎯 Recherche autour de ${filters.villeNom}: (${filters.latitude}, ${filters.longitude}) rayon ${filters.rayon} km`,
  );

  const missionsInRadius = allMissions
    .filter((mission) => {
      try {
        if (!mission.adresseDepart?.latitude || !mission.adresseDepart?.longitude) return false;
        if (!mission.adresseArrivee?.latitude || !mission.adresseArrivee?.longitude) return false;

        const distanceDepart = this.geoService.calculateDistance(
          filters.latitude,
          filters.longitude,
          Number(mission.adresseDepart.latitude),
          Number(mission.adresseDepart.longitude),
        );

        const distanceArrivee = this.geoService.calculateDistance(
          filters.latitude,
          filters.longitude,
          Number(mission.adresseArrivee.latitude),
          Number(mission.adresseArrivee.longitude),
        );

        return distanceDepart <= filters.rayon || distanceArrivee <= filters.rayon;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Erreur mission ${mission.id}:`, message);
        return false;
      }
    })
    // ✅ Aplatir isFavori après le filtre
    .map((m) => ({
      ...m,
      isFavori: adherentId ? m.favoris.length > 0 : false,
    }));

  console.log(`✅ ${missionsInRadius.length} mission(s) trouvée(s)`);
  console.log('🔍 ==========================================\n');

  const total = missionsInRadius.length;
  const skip = (page - 1) * pageSize;
  const missions = missionsInRadius.slice(skip, skip + pageSize);

  return { missions, total };
}

// src/Module/missions/missions.service.ts - EXCERPT (creerMission corrigée)
// ⚠️ Remplacez seulement la fonction creerMission

async creerMission(
  dto: CreateMissionDto,
  documents?: any[],
): Promise<MissionResponseDto> {
  try {
    const agentId = this.convertirEnNombre(dto.agentId, 'agentId');

    // 1. Récupérer l'agent avec sa chaîne agence → partenaire
    console.log('🔍 Vérification de l\'agent...');
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        agence: {
          include: { partenaire: true },
        },
      },
    });

    if (!agent) {
      throw new HttpException(`Agent #${agentId} introuvable`, HttpStatus.NOT_FOUND);
    }
    if (!agent.isActive) {
      throw new HttpException(`Agent #${agentId} n'est pas actif`, HttpStatus.FORBIDDEN);
    }
    if (!agent.agence) {
      throw new HttpException(`Agent #${agentId} n'est associé à aucune agence`, HttpStatus.BAD_REQUEST);
    }

    const partenaireId = agent.agence.partenaireId;

    // 2. Récupérer les informations des villes
    console.log('🔍 Récupération des informations des villes...');
    const [villeDepart, villeArrivee] = await Promise.all([
      this.obtenirInfoVille(dto.villeDepart),
      this.obtenirInfoVille(dto.villeArrivee),
    ]);

    // 3. Calculer la route avec les COORDONNÉES (pas les noms)
    console.log('🚗 Calcul de la route...');
    console.log(`📍 Départ: ${villeDepart.nom} (${villeDepart.latitude}, ${villeDepart.longitude}) - ${villeDepart.pays}`);
    console.log(`📍 Arrivée: ${villeArrivee.nom} (${villeArrivee.latitude}, ${villeArrivee.longitude}) - ${villeArrivee.pays}`);
    
    // Détecter si on est en Tunisie
    const isTunisia = villeDepart.pays === 'Tunisia' || villeArrivee.pays === 'Tunisia';
    if (isTunisia) {
      console.log('🌍 [TUNISIE DÉTECTÉE] Montant de péage = 0');
    }
    
    const calculRoute = await this.routeCalculator.calculerRouteParVilles(
      villeDepart.nom,
      villeArrivee.nom,
      dto.typeVehicule,
      { lat: villeDepart.latitude, lon: villeDepart.longitude },
      { lat: villeArrivee.latitude, lon: villeArrivee.longitude },
      isTunisia,
    );

    // 4. Convertir la durée et calculer la date de départ maximum
    const dureeMinutes  = this.convertirDureeEnMinutes(calculRoute.dureeFormatee);
    const dateArrivee   = new Date(dto.dateFin);
    const dateDepartMax = new Date(dateArrivee.getTime() - dureeMinutes * 60 * 1000);

    // 5. Valider la date de début
    const dateDebut = new Date(dto.dateDebut);
    if (dateDebut > dateDepartMax) {
      throw new HttpException(
        `La date de départ (${this.formaterDateAvecHeure(dateDebut)}) doit être au plus tard ` +
        `le ${this.formaterDateAvecHeure(dateDepartMax)}. ` +
        `Le trajet nécessite ${calculRoute.dureeFormatee} (${dureeMinutes} minutes) ` +
        `pour arriver à ${this.formaterDateAvecHeure(dateArrivee)}.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 6. Récupérer prixParKm via partenaire → demandePartenaire → contrat
    console.log('💰 Récupération du prix/km depuis le contrat partenaire...');
    const contratPartenaire = await this.prisma.contratPartenaire.findFirst({
      where: {
        estActif: true,
        demandePartenaire: {
          partenaire: { id: partenaireId },
        },
      },
      orderBy: { dateCreation: 'desc' },
    });

    const prixParKm = contratPartenaire?.prixParKm ?? 0.95;
    console.log(
      `💰 Prix/km: ${prixParKm}€ ` +
      `(${contratPartenaire ? `contrat #${contratPartenaire.id}` : 'valeur par défaut 0.95'})`,
    );

    // 7. Créer ou trouver le véhicule
    console.log('🔍 Recherche du véhicule...');
    const vehicule = await this.prisma.vehicule.create({
      data: {
        typeVehicule:    dto.typeVehicule as any,
        typeCarburant:   dto.typeCarburant as any,
        marqueModele:    dto.marqueModele,
        immatriculation: dto.immatriculation.toUpperCase(),
        nombrePlaces:    dto.nombrePlaces,
        boiteVitesse:    dto.boiteVitesse as any,
        agent: { connect: { id: agentId } },
      },
    });

    // 8. Créer les adresses en parallèle
    console.log('📍 Création des adresses...');
    const [adresseDepart, adresseArrivee] = await Promise.all([
      this.prisma.adresse.create({
        data: {
          villeId:         villeDepart.codeInsee,
          villeNom:        villeDepart.nom,
          adresseComplete: dto.adresseDepartComplete,
          typeLieu:        dto.typeLieuDepart as any,
          nomLieu:         dto.nomLieuDepart || null,
          latitude:        villeDepart.latitude,
          longitude:       villeDepart.longitude,
        },
      }),
      
      this.prisma.adresse.create({
        data: {
          villeId:         villeArrivee.codeInsee,
          villeNom:        villeArrivee.nom,
          adresseComplete: dto.adresseArriveeComplete,
          typeLieu:        dto.typeLieuArrivee as any,
          nomLieu:         dto.nomLieuArrivee || null,
          latitude:        villeArrivee.latitude,
          longitude:       villeArrivee.longitude,
        },
      }),
    ]);
console.log('📍 adresseDepart:', adresseDepart.latitude, adresseDepart.longitude);
console.log('📍 adresseArrivee:', adresseArrivee.latitude, adresseArrivee.longitude);
    // 9. Créer la mission
    console.log('📝 Création de la mission...');
    const mission = await this.prisma.mission.create({
      data: {
        agentId:          agentId,
        agenceId:         agent.agenceId,
        vehiculeId:       vehicule.id,
        adresseDepartId:  adresseDepart.id,
        adresseArriveeId: adresseArrivee.id,
        statut:           'EN_ATTENTE',
        commentaire:      dto.commentaire || null,
        partenaireId:     partenaireId,
      },
    });

    // 10. Créer la disponibilité
    console.log('📅 Création de la disponibilité...');
    await this.prisma.disponibiliteMission.create({
      data: {
        missionId:     mission.id,
        dateDebut:     dateDebut,
        dateFin:       dateArrivee,
        dateDepartMax: dateDepartMax,
      },
    });

    // 11. Calculer le montant
    const montantTotal       = calculRoute.distanceKm * prixParKm;
    const montantTotalArrondi = Math.round(montantTotal);

    console.log(`💰 Montant: ${prixParKm}€ × ${calculRoute.distanceKm}km = ${montantTotal.toFixed(2)}€`);

    // 12. Créer le calcul de mission
    console.log('🧮 Enregistrement du calcul...');
    await this.prisma.calculMission.create({
      data: {
        mission:      { connect: { id: mission.id } },
        distanceKm:   new Decimal(calculRoute.distanceKm),
        fraisPeage:   new Decimal(calculRoute.fraisPeage),
        montantKm:    new Decimal(parseFloat((calculRoute.distanceKm * prixParKm).toFixed(2))),
        montantFinal: new Decimal(montantTotalArrondi),
        montantTotal: new Decimal(montantTotalArrondi),
        detailCalcul: {
          distanceKm:            calculRoute.distanceKm,
          dureeFormatee:         calculRoute.dureeFormatee,
          dureeMinutes:          dureeMinutes,
          fraisPeage:            calculRoute.fraisPeage,
          prixParKm:             prixParKm,
          montantBrut:           parseFloat(montantTotal.toFixed(2)),
          montantTotal:          montantTotalArrondi,
          typeVehicule:          dto.typeVehicule,
          dateDepartMax:         dateDepartMax.toISOString(),
          dateDepartMaxFormatee: this.formaterDateAvecHeure(dateDepartMax),
          contratPartenaireId:   contratPartenaire?.id ?? null,
        },
      },
    });

    // 13. Créer les notifications
    console.log('🔔 Création des notifications...');
    if (dto.notifierDepart) {
      await this.prisma.notificationMission.create({
        data: {
          missionId:        mission.id,
          typeNotification: 'DEPART',
          actif:            true,
          nomContact:       dto.nomContactDepart       || null,
          telephoneContact: dto.telephoneContactDepart || null,
        },
      });
    }
    if (dto.notifierArrivee) {
      await this.prisma.notificationMission.create({
        data: {
          missionId:        mission.id,
          typeNotification: 'ARRIVEE',
          actif:            true,
          nomContact:       dto.nomContactArrivee       || null,
          telephoneContact: dto.telephoneContactArrivee || null,
        },
      });
    }

    // 14. Gérer les documents
    if (Array.isArray(documents) && documents.length > 0) {
      console.log(`📄 Upload de ${documents.length} document(s)...`);
      for (const file of documents) {
        const cheminFichier = file.filepath || file.path || file.filename;
        await this.prisma.document.create({
          data: {
            typeDocument: 'DOCUMENT_ADMINISTRATIF',
            missionId:    mission.id,
            fichiers: {
              create: [{ cheminFichier }],
            },
          },
        });
      }
    } else {
      console.log('✅ Aucun document fourni (optionnel)');
    }

    // 15. Vérifier les alertes en arrière-plan.
    // La création de mission ne doit pas attendre les emails/push.
    console.log('🔔 Vérification des alertes en arrière-plan...');
    void Promise.resolve(this.alertesService.checkAlertes({
        id: mission.id,
        adresseDepart,
        adresseArrivee,
        vehicule,
        calculs: {
          distanceKm:   calculRoute.distanceKm,
          fraisPeage:   calculRoute.fraisPeage,
          montantTotal: montantTotal,
        },
      }))
      .then((alertesSummary) => console.log('✅ Alertes vérifiées:', alertesSummary))
      .catch((alertError) => {
        console.error('⚠️ Erreur lors de la vérification des alertes:', alertError);
      });

    console.log('✅ Mission créée avec succès!');
    return this.obtenirMission(mission.id);

  } catch (error) {
    if (error instanceof HttpException) throw error;
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur création mission:', message);
    throw new HttpException(
      `Erreur lors de la création de la mission: ${message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}


  // ─────────────────────────────────────────────────────────────
  //  LISTER LES MISSIONS (agent)
  // ─────────────────────────────────────────────────────────────

  /**
   * ✅ Lister missions par agent (remplace listerMissions par partenaireId)
   */
  async listerMissions(agentId?: string, statut?: string) {
    const agentIdNumber = agentId
      ? this.convertirEnNombre(agentId, 'agentId')
      : undefined;

    return this.prisma.mission.findMany({
      where: {
        ...(agentIdNumber && { agentId: agentIdNumber }), // ✅ partenaireId → agentId
        ...(statut && { statut: statut as any }),
      },
      include: {
        vehicule: true,
        adresseDepart: true,
        adresseArrivee: true,
        disponibilite: true,
        calculs: true,
      },
      orderBy: { dateCreation: 'desc' },
    });
  }

  /**
   * ✅ Lister missions avec détails (agent)
   */
  async listerMissionsAvecDetails(
    agentId?: string,   // ✅ partenaireId → agentId
    statut?: string,
  ): Promise<MissionDetailsType[]> {
    try {
      const missions = await this.listerMissions(agentId, statut);

      console.log(`📊 Nombre de missions récupérées: ${missions.length}`);

      const result = missions.map((mission) => {
        if (!mission) {
          console.warn('⚠️ Mission invalide détectée');
          return null;
        }

        const calcul        = mission.calculs?.[0];
        const detailCalcul  = calcul?.detailCalcul as any;
        const disponibilite = mission.disponibilite as any;

        const missionDetails: MissionDetailsType = {
          typeVehicule:          (mission.vehicule?.typeVehicule as TypeVehiculeEnum) || TypeVehiculeEnum.BERLINE,
          typeCarburant:         (mission.vehicule?.typeCarburant as TypeCarburantEnum) || TypeCarburantEnum.ESSENCE,
          villeDepart:           mission.adresseDepart?.villeNom || 'N/A',
          villeArrivee:          mission.adresseArrivee?.villeNom || 'N/A',
          distanceKm:            parseFloat(calcul?.distanceKm || '0'),
          fraisPeage:            parseFloat(calcul?.fraisPeage || '0'),
          montantTotal:          parseFloat(calcul?.montantTotal || '0'),
          dateDebut:             mission.disponibilite?.dateDebut?.toISOString() || new Date().toISOString(),
          dateDepartMax:         disponibilite?.dateDepartMax ? disponibilite.dateDepartMax.toISOString() : '',
          dateDepartMaxFormatee: detailCalcul?.dateDepartMaxFormatee || '',
          dateFin:               mission.disponibilite?.dateFin?.toISOString() || new Date().toISOString(),
          dureeFormatee:         detailCalcul?.dureeFormatee || '0h00',
          dureeMinutes:          detailCalcul?.dureeMinutes || 0,
        };

        return missionDetails;
      });

      const filteredResult = result.filter((m): m is MissionDetailsType => m !== null);
      console.log(`✅ Missions valides après filtrage: ${filteredResult.length}`);

      return filteredResult;

    } catch (error) {
      console.error('❌ Erreur dans listerMissionsAvecDetails:', error);
      throw new HttpException(
        'Erreur lors de la récupération des missions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  // ─────────────────────────────────────────────────────────────
  //  RÉCUPÉRER UNE MISSION
  // ─────────────────────────────────────────────────────────────

 async obtenirMission(missionId: string | number): Promise<MissionResponseDto> {
  const id = typeof missionId === 'number' ? missionId.toString() : missionId;

  const mission = await this.prisma.mission.findUnique({
    where: { id },
    include: {
      vehicule: true,
      adresseDepart: true,
      adresseArrivee: true,
      disponibilite: true,
      notifications: true,
      calculs: true,
      documents: { include: { fichiers: true } },
      agent: {                          // ← ajout
        include: {
          user: {
            select: {
              id: true,
              email: true,
              adherent: {
                select: {
                  nom: true,
                  prenom: true,
                  telephone: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!mission) {
    throw new HttpException('Mission non trouvée', HttpStatus.NOT_FOUND);
  }

  return mission as any;
}

async findMissionById(id: string) {
  const mission = await this.prisma.mission.findUnique({
    where: { id },
    include: {
      agent: true,
      vehicule: true,
      adresseDepart: true,
      adresseArrivee: true,
      disponibilite: true,
      calculs: true,
      notifications: true,
      documents: {
        include: { fichiers: true },
      },
      partenaire: {
        select: {
          id: true,
          entiteGroupe: true,
        },
      },
    },
  });

  if (!mission) return null;

  // Récupérer le contrat via partenaireId déjà sur la mission
  const contrat = mission.partenaireId
    ? await this.demandePartenaireService.getContratTarificationByPartenaire(mission.partenaireId)
    : null;

  return {
    ...mission,
    contrat,
    calculs: mission.calculs ? {
      ...mission.calculs,
      distanceKm:   mission.calculs.distanceKm.toNumber(),
      fraisPeage:   mission.calculs.fraisPeage.toNumber(),
      montantTotal: mission.calculs.montantTotal.toNumber(),
    } : null,
  };
}

  async obtenirDetailsMission(missionId: string): Promise<MissionDetailsType> {
    try {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        include: {
          vehicule: true,
          adresseDepart: true,
          adresseArrivee: true,
          disponibilite: true,
          calculs: true,
        },
      });

      if (!mission) {
        throw new HttpException(
          `Mission avec l'ID ${missionId} introuvable`,
          HttpStatus.NOT_FOUND,
        );
      }

      const calcul       = mission.calculs?.[0];
      const detailCalcul = calcul?.detailCalcul
        ? (typeof calcul.detailCalcul === 'string'
            ? JSON.parse(calcul.detailCalcul)
            : calcul.detailCalcul)
        : null;

      const disponibilite = mission.disponibilite;

      const missionDetails: MissionDetailsType = {
        typeVehicule:  (mission.vehicule?.typeVehicule as TypeVehiculeEnum) || TypeVehiculeEnum.BERLINE,
        typeCarburant: (mission.vehicule?.typeCarburant as TypeCarburantEnum) || TypeCarburantEnum.ESSENCE,
        villeDepart:   mission.adresseDepart?.villeNom || 'N/A',
        villeArrivee:  mission.adresseArrivee?.villeNom || 'N/A',
        distanceKm:    calcul?.distanceKm ? parseFloat(calcul.distanceKm.toString()) : (detailCalcul?.distanceKm || 0),
        fraisPeage:    calcul?.fraisPeage ? parseFloat(calcul.fraisPeage.toString()) : (detailCalcul?.fraisPeage || 0),
        montantTotal:  calcul?.montantTotal ? parseFloat(calcul.montantTotal.toString()) : (detailCalcul?.montantTotal || 0),
        dateDebut:             disponibilite?.dateDebut?.toISOString() || new Date().toISOString(),
        dateDepartMax:         disponibilite?.dateDepartMax ? disponibilite.dateDepartMax.toISOString() : '',
        dateDepartMaxFormatee: detailCalcul?.dateDepartMaxFormatee || '',
        dateFin:               disponibilite?.dateFin?.toISOString() || new Date().toISOString(),
        dureeFormatee:         detailCalcul?.dureeFormatee || '0h00',
        dureeMinutes:          detailCalcul?.dureeMinutes || 0,
      };

      return missionDetails;

    } catch (error) {
      console.error('❌ Erreur dans obtenirDetailsMission:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Erreur lors de la récupération de la mission',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  // ─────────────────────────────────────────────────────────────
  //  GÉRER LES MISSIONS (agent)
  // ─────────────────────────────────────────────────────────────

  async mettreAJourStatut(missionId: string, statut: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new HttpException('Mission non trouvée', HttpStatus.NOT_FOUND);
    }

    return this.prisma.mission.update({
      where: { id: missionId },
      data: { statut: statut as any },
      include: {
        vehicule: true,
        adresseDepart: true,
        adresseArrivee: true,
        disponibilite: true,
        notifications: true,
        calculs: true,
        documents: true,
      },
    });
  }

  async supprimerMission(missionId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new HttpException('Mission non trouvée', HttpStatus.NOT_FOUND);
    }

    await this.prisma.mission.delete({ where: { id: missionId } });

    return { message: 'Mission supprimée avec succès' };
  }



  // ─────────────────────────────────────────────────────────────
  //  RECHERCHE (adhérent)
  // ─────────────────────────────────────────────────────────────

async getMissionsForCards(adherentId?: number): Promise<MissionWithRelations[]> {
  const missionIdsBloquees = await this.getMissionIdsBloquees(adherentId);

  const missions = await this.prisma.mission.findMany({
    where: {
      ...(missionIdsBloquees.length > 0 && {
        id: { notIn: missionIdsBloquees },
      }),
    },
    include: {
      vehicule: true,
      adresseDepart: true,
      adresseArrivee: true,
      calculs: true,
      disponibilite: true,
      // Récupérer uniquement le favori de cet adhérent
      favoris: adherentId
        ? { where: { adherentId } }
        : false,
    },
    orderBy: { dateCreation: 'desc' },
  });

  // Aplatir isFavori directement sur chaque mission
  return missions.map((m) => ({
    ...m,
    isFavori: adherentId ? m.favoris.length > 0 : false,
  }));
}

async searchMissions(
  search?: string,
  page = 1,
  pageSize = 20,
  adherentId?: number,
): Promise<{ missions: MissionWithRelations[]; total: number }> {
  const skip = (page - 1) * pageSize;
  const missionIdsBloquees = await this.getMissionIdsBloquees(adherentId);

  const where: Prisma.MissionWhereInput = {
    ...(missionIdsBloquees.length > 0 && {
      id: { notIn: missionIdsBloquees },
    }),
    ...(search && {
      OR: [
        { adresseDepart: { villeNom: { contains: search, mode: 'insensitive' } } },
        { adresseArrivee: { villeNom: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };

  const [rawMissions, total] = await Promise.all([
    this.prisma.mission.findMany({
      where,
      include: {
        vehicule: true,
        adresseDepart: true,
        adresseArrivee: true,
        calculs: true,
        disponibilite: true,
        // ✅ Ajout favoris
        favoris: adherentId
          ? { where: { adherentId } }
          : false,
      },
      orderBy: { dateCreation: 'desc' },
      skip,
      take: pageSize,
    }),
    this.prisma.mission.count({ where }),
  ]);

  // ✅ Aplatir isFavori
  const missions = rawMissions.map((m) => ({
    ...m,
    isFavori: adherentId ? m.favoris.length > 0 : false,
  }));

  return { missions, total };
}

async searchMissionsByTrajet(
  filters: SearchByTrajetInput,
  page = 1,
  pageSize = 20,
  adherentId?: number,
): Promise<{ missions: MissionWithRelations[]; total: number }> {
  if (!filters.villeDepartNom || !filters.villeArriveeNom) {
    return { missions: [], total: 0 };
  }

  const missionIdsBloquees = await this.getMissionIdsBloquees(adherentId);

  const allMissions = await this.prisma.mission.findMany({
    where: {
      statut: 'EN_ATTENTE',
      ...(missionIdsBloquees.length > 0 && {
        id: { notIn: missionIdsBloquees },
      }),
    },
    include: {
      vehicule: true,
      adresseDepart: true,
      adresseArrivee: true,
      calculs: true,
      disponibilite: true,
      // ✅ Ajout favoris
      favoris: adherentId
        ? { where: { adherentId } }
        : false,
    },
  });

  const missionsMatchingTrajet = allMissions
    .filter((mission) => {
      // ta logique distance/date
      return true;
    })
    // ✅ Aplatir isFavori après le filtre
    .map((m) => ({
      ...m,
      isFavori: adherentId ? m.favoris.length > 0 : false,
    }));

  const total = missionsMatchingTrajet.length;
  const skip = (page - 1) * pageSize;
  const missions = missionsMatchingTrajet.slice(skip, skip + pageSize);

  return { missions, total };
}



  // ─────────────────────────────────────────────────────────────
  //  UTILITAIRES PRIVÉS
  // ─────────────────────────────────────────────────────────────

  private convertirDureeEnMinutes(dureeFormatee: string): number {
    let totalMinutes = 0;

    const formatCompactMatch = dureeFormatee.match(/(\d+)h(\d+)/i);
    if (formatCompactMatch) {
      return parseInt(formatCompactMatch[1]) * 60 + parseInt(formatCompactMatch[2]);
    }

    const heuresMatch = dureeFormatee.match(/(\d+)\s*h(?!\d)/i);
    if (heuresMatch) totalMinutes += parseInt(heuresMatch[1]) * 60;

    const minutesMatch = dureeFormatee.match(/(\d+)\s*min/i);
    if (minutesMatch) totalMinutes += parseInt(minutesMatch[1]);

    if (totalMinutes === 0) {
      throw new HttpException(
        `Format de durée invalide: "${dureeFormatee}". Formats acceptés: "4h35", "4h 35min", "4h", "35min"`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    console.log(`🕒 Durée convertie: "${dureeFormatee}" = ${totalMinutes} minutes`);
    return totalMinutes;
  }

  private formaterDateAvecHeure(date: Date): string {
    return date.toLocaleString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  }

  private async obtenirInfoVille(nomVille: string): Promise<{
    codeInsee: string;
    nom: string;
    latitude: number;
    longitude: number;
    pays?: string;
  }> {
    try {
      // 1️⃣ Essayer d'abord l'API française (geo.api.gouv.fr)
      console.log(`🔍 [Étape 1] Recherche de "${nomVille}" en France...`);
      try {
        const responsesFr = await firstValueFrom(
          this.httpService.get(
            `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(nomVille)}&fields=code,nom,centre,population&limit=10`,
          ),
        );

        console.log(`✅ [FR] Réponse reçue:`, responsesFr.data?.length, `résultats`);

        if (responsesFr.data && Array.isArray(responsesFr.data) && responsesFr.data.length > 0) {
          const villesTriees = responsesFr.data
            .filter((v: any) => v.centre && this.nomVilleCorrespond(v.nom, nomVille))  // ✅ Validation du nom
            .sort((a: any, b: any) => (b.population || 0) - (a.population || 0));

          if (villesTriees.length > 0) {
            const ville = villesTriees[0];
            console.log(`✅ Ville trouvée en France: ${ville.nom}`);
            return {
              codeInsee: ville.code,
              nom:       ville.nom,
              latitude:  ville.centre.coordinates[1],
              longitude: ville.centre.coordinates[0],
              pays:      'France',
            };
          }
        }
      } catch (frError) {
        console.warn(`⚠️ [FR] Erreur API France:`, frError instanceof Error ? frError.message : String(frError));
      }

      // 2️⃣ Basculer sur Nominatim pour Tunisie et autres pays
      console.log(`🌍 [Étape 2] Recherche avec Nominatim pour "${nomVille}"...`);
      
      // Essayer d'abord avec le nom simple
      let villeTrouvee = await this.rechercherAvecNominatim(nomVille);
      
      // Si pas trouvée, essayer avec suffixes de pays
      if (!villeTrouvee) {
        console.log(`⚠️ [Nominatim] "${nomVille}" simple non trouvé, essai avec suffixes...`);
        const suffixes = [
          `${nomVille}, Tunisia`,
          `${nomVille}, Tunisie`,
          `${nomVille}, TN`,
        ];
        
        for (const suffixedName of suffixes) {
          console.log(`  📍 Tentative: "${suffixedName}"`);
          villeTrouvee = await this.rechercherAvecNominatim(suffixedName);
          if (villeTrouvee) {
            console.log(`  ✅ Trouvée avec: "${suffixedName}"`);
            break;
          }
        }
      }

      if (!villeTrouvee) {
        throw new Error(`Ville "${nomVille}" non trouvée en France ni en Tunisie`);
      }

      console.log(`✅ Ville finale: ${villeTrouvee.nom} (${villeTrouvee.codeInsee}) @ ${villeTrouvee.latitude}, ${villeTrouvee.longitude}`);
      return villeTrouvee;

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ [obtenirInfoVille] Erreur finale pour "${nomVille}":`, message);
      throw new HttpException(
        `Ville "${nomVille}" non trouvée. Pays supportés: France, Tunisie. Détail: ${message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private nomVilleCorrespond(nomRetourne: string, nomRecherche: string): boolean {
    const normalizeStr = (s: string) => s.toLowerCase().trim().replace(/\s+/g, '');
    const n1 = normalizeStr(nomRetourne);
    const n2 = normalizeStr(nomRecherche);
    
    // Correspondance exacte ou contient la recherche
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
  }

  private async rechercherAvecNominatim(nomVille: string): Promise<{
    codeInsee: string;
    nom: string;
    latitude: number;
    longitude: number;
    pays?: string;
  } | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(nomVille)}&format=json&limit=10&addressdetails=1`;
      console.log(`  📍 URL: ${url}`);
      
      const responsesNominatim = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (ConvoyeurApp/1.0)',
          },
          timeout: 5000,
        }),
      );

      console.log(`  ✅ Réponse Nominatim: ${responsesNominatim.data?.length} résultats`);
      
      if (!responsesNominatim?.data || !Array.isArray(responsesNominatim.data) || responsesNominatim.data.length === 0) {
        console.log(`  ⚠️ Aucun résultat Nominatim pour "${nomVille}"`);
        return null;
      }

      // Afficher les résultats
      responsesNominatim.data.forEach((v: any, idx: number) => {
        console.log(`    [${idx}] ${v.name} (${v.type}) - ${v.address?.country}`);
      });

      // Sélectionner la meilleure correspondance
      let villeSelectionnee = responsesNominatim.data[0];
      
      // Prioriser les villes (pas les pays, régions, etc.)
      const villes = responsesNominatim.data.filter((v: any) => {
        const type = v.type || '';
        return type === 'town' || type === 'city' || type === 'village' || type === 'hamlet';
      });

      if (villes.length > 0) {
        villeSelectionnee = villes[0];
        console.log(`  ✅ Ville sélectionnée: ${villeSelectionnee.name} (${villeSelectionnee.type})`);
      } else {
        console.log(`  ⚠️ Pas de ville trouvée par type, utilisation du premier résultat`);
      }

      // Valider les données essentielles
      if (!villeSelectionnee.lat || !villeSelectionnee.lon) {
        console.error(`  ❌ Coordonnées manquantes pour ${villeSelectionnee.name}`);
        return null;
      }

      return {
        codeInsee: villeSelectionnee.osm_id?.toString() || 'UNKNOWN',
        nom:       villeSelectionnee.name,
        latitude:  parseFloat(villeSelectionnee.lat),
        longitude: parseFloat(villeSelectionnee.lon),
        pays:      villeSelectionnee.address?.country || 'Unknown',
      };

    } catch (error) {
      console.error(`  ❌ Erreur Nominatim:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  private convertirEnNombre(valeur: any, nomChamp: string): number {
    if (typeof valeur === 'number') return valeur;
    const nombre = parseInt(valeur, 10);
    if (isNaN(nombre)) {
      throw new HttpException(
        `Le champ "${nomChamp}" doit être un nombre valide`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return nombre;
  }

  // ✅ Retourne toutes les missions (toutes agences confondues)
async getMissionsForCardsByAgence(): Promise<MissionWithRelations[]> {
  const missions = await this.prisma.mission.findMany({
    include: {
      vehicule: true,
      adresseDepart: true,
      adresseArrivee: true,
      calculs: true,
      disponibilite: true,
    },
    orderBy: { dateCreation: 'desc' },
  });

  // ✅ Pas d'adherentId ici, isFavori toujours false
  return missions.map((m) => ({
    ...m,
    isFavori: false,
  }));
}

async toggleFavori(adherentId: number, missionId: string): Promise<{ isFavori: boolean }> {
  const existing = await this.prisma.missionFavori.findUnique({
    where: { adherentId_missionId: { adherentId, missionId } },
  });

  if (existing) {
    await this.prisma.missionFavori.delete({
      where: { adherentId_missionId: { adherentId, missionId } },
    });
    return { isFavori: false };
  }

  await this.prisma.missionFavori.create({
    data: { adherentId, missionId },
  });
  return { isFavori: true };
}

  // ─────────────────────────────────────────────────────────────
  //  NOTATION AGENT (ML Trigger)
  // ─────────────────────────────────────────────────────────────

  async noterMissionConvoyeur(missionId: string, note: number, agentId?: number): Promise<any> {
    if (!Number.isFinite(note) || note < 1 || note > 5) {
      throw new HttpException('La note doit etre entre 1 et 5', HttpStatus.BAD_REQUEST);
    }

    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        sessions: {
          where: { statut: 'TERMINEE' },
          take: 1,
        },
      },
    });

    if (!mission) {
      throw new HttpException('Mission non trouvee', HttpStatus.NOT_FOUND);
    }

    if (agentId != null && mission.agentId !== agentId) {
      throw new HttpException('Cette mission ne appartient pas a cet agent', HttpStatus.FORBIDDEN);
    }

    if (mission.statut !== StatutMission.TERMINEE || mission.sessions.length === 0) {
      throw new HttpException(
        'La mission doit etre terminee avant de calculer le score',
        HttpStatus.BAD_REQUEST,
      );
    }

    console.log(`Declenchement du calcul ML pour la mission ${missionId}...`);
    return this.scoresMlService.calculateScoreAndSave(missionId, note);
  }

  private async noterMissionConvoyeurLegacy(missionId: string, note: number): Promise<void> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new HttpException('Mission non trouvee', HttpStatus.NOT_FOUND);
    }

    // Declencher le calcul ML (fire-and-forget mais avec meilleurs logs)
    console.log(`🚀 Déclenchement du calcul ML pour la mission ${missionId}...`);
    this.scoresMlService.calculateScoreAndSave(missionId, note)
      .then(() => console.log(`✅ Calcul ML terminé avec succès pour la mission ${missionId}`))
      .catch((err) => {
        console.error('❌ Echec calcul ML apres notation: ' + err.message);
      });
  }
}
