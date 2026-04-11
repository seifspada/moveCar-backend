// missions.service.ts

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RouteCalculatorService } from '../route-calculator/route-calculator.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateMissionDto } from './dto/create-mission.dto';
import { MissionResponseDto } from './dto/mission-response.dto';
import { MissionDetailsType } from './dto/mission-card.model';
import { TypeCarburantEnum, TypeVehiculeEnum } from './dto/enums';
import { Adresse, CalculMission, DisponibiliteMission, Mission, Prisma, Vehicule } from '@prisma/client';
import { AlertesService } from '../alertes/alertes.service';
import { SearchByPositionInput, SearchByTrajetInput } from './types/mission-search-filters.input';
import { GeoService } from '../geo/geo.service';


export type MissionWithRelations = Mission & {
  vehicule: Vehicule;
  adresseDepart: Adresse;
  adresseArrivee: Adresse;
  calculs?: CalculMission;
  disponibilite?: DisponibiliteMission;
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
  ) {}


 async searchMissionsByPosition(
    filters: SearchByPositionInput,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ missions: MissionWithRelations[]; total: number }> {
    
    console.log('\n🔍 ========== RECHERCHE PAR POSITION ==========');
    console.log('📍 Filtres:', JSON.stringify(filters, null, 2));

    // Validation
    if (!filters || !filters.latitude || !filters.longitude || !filters.rayon) {
      console.error('❌ Paramètres manquants');
      return { missions: [], total: 0 };
    }

    // Test GeoService
    if (!this.geoService) {
      console.error('❌ GeoService non injecté');
      throw new Error('GeoService non disponible');
    }

    // Récupérer toutes les missions EN_ATTENTE
    const allMissions = await this.prisma.mission.findMany({
      where: { 
        statut: 'EN_ATTENTE',
      },
      include: {
        vehicule: true,
        adresseDepart: true,
        adresseArrivee: true,
        calculs: true,
        disponibilite: true,
      },
    });

    console.log(`📊 Total missions EN_ATTENTE: ${allMissions.length}`);

    if (allMissions.length === 0) {
      return { missions: [], total: 0 };
    }

    console.log(`🎯 Recherche autour de ${filters.villeNom}: (${filters.latitude}, ${filters.longitude}) rayon ${filters.rayon} km`);

    // Filtrer par distance
    const missionsInRadius = allMissions.filter((mission) => {
      try {
        // Vérifier coordonnées
        if (!mission.adresseDepart?.latitude || !mission.adresseDepart?.longitude) {
          return false;
        }
        if (!mission.adresseArrivee?.latitude || !mission.adresseArrivee?.longitude) {
          return false;
        }

        // Conversion en Number (au cas où Prisma retourne des Decimal)
        const latDepart = Number(mission.adresseDepart.latitude);
        const lonDepart = Number(mission.adresseDepart.longitude);
        const latArrivee = Number(mission.adresseArrivee.latitude);
        const lonArrivee = Number(mission.adresseArrivee.longitude);

        // Calcul distances
        const distanceDepart = this.geoService.calculateDistance(
          filters.latitude,
          filters.longitude,
          latDepart,
          lonDepart,
        );

        const distanceArrivee = this.geoService.calculateDistance(
          filters.latitude,
          filters.longitude,
          latArrivee,
          lonArrivee,
        );

        // Match si départ OU arrivée dans le rayon
        return distanceDepart <= filters.rayon || distanceArrivee <= filters.rayon;

      } catch (error) {
        console.error(`❌ Erreur mission ${mission.id}:`, error.message);
        return false;
      }
    });

    console.log(`✅ ${missionsInRadius.length} mission(s) trouvée(s)`);
    console.log('🔍 ==========================================\n');

    // Pagination
    const total = missionsInRadius.length;
    const skip = (page - 1) * pageSize;
    const missions = missionsInRadius.slice(skip, skip + pageSize);

    return { missions, total };
  }


  /**
   * Crée une nouvelle mission avec validation et calculs
   */
async creerMission(
  dto: CreateMissionDto,
  documents?: any[],
): Promise<MissionResponseDto> {
  try {
    const agentId = this.convertirEnNombre(dto.agentId, 'agentId');

    // 1. ✅ Récupérer l'agent avec sa chaîne agence → partenaire
    console.log('🔍 Vérification de l\'agent...');
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        agence: {
          include: {
            partenaire: true,
          },
        },
      },
    });

    if (!agent) {
      throw new HttpException(
        `Agent #${agentId} introuvable`,
        HttpStatus.NOT_FOUND,
      );
    }
    if (!agent.isActive) {
      throw new HttpException(
        `Agent #${agentId} n'est pas actif`,
        HttpStatus.FORBIDDEN,
      );
    }
    if (!agent.agence) {
      throw new HttpException(
        `Agent #${agentId} n'est associé à aucune agence`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const partenaireId = agent.agence.partenaireId;

    // 2. Récupérer les informations des villes
    console.log('🔍 Récupération des informations des villes...');
    const [villeDepart, villeArrivee] = await Promise.all([
      this.obtenirInfoVille(dto.villeDepart),
      this.obtenirInfoVille(dto.villeArrivee),
    ]);

    console.log('✅ Ville départ:', villeDepart);
    console.log('✅ Ville arrivée:', villeArrivee);

    // 3. Calculer la route
    console.log('🚗 Calcul de la route...');
    const calculRoute = await this.routeCalculator.calculerRouteParVilles(
      dto.villeDepart,
      dto.villeArrivee,
      dto.typeVehicule,
    );

    console.log('📊 Résultat calcul:', calculRoute);

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

    console.log('✅ Validation dates:');
    console.log(`   - Date début:       ${this.formaterDateAvecHeure(dateDebut)}`);
    console.log(`   - Date arrivée:     ${this.formaterDateAvecHeure(dateArrivee)}`);
    console.log(`   - Durée trajet:     ${calculRoute.dureeFormatee} (${dureeMinutes} min)`);
    console.log(`   - Date départ max:  ${this.formaterDateAvecHeure(dateDepartMax)}`);

    // 6. ✅ Récupérer prixParKm via partenaire → demandePartenaire → contrat
    console.log('💰 Récupération du prix/km depuis le contrat partenaire...');
    const contratPartenaire = await this.prisma.contratPartenaire.findFirst({
      where: {
        estActif: true,
        demandePartenaire: {
          partenaire: {
            id: partenaireId,
          },
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
    let vehicule = await this.prisma.vehicule.findUnique({
      where: { immatriculation: dto.immatriculation.toUpperCase() },
    });

    if (!vehicule) {
      console.log('➕ Création du véhicule...');
      vehicule = await this.prisma.vehicule.create({
        data: {
          typeVehicule:    dto.typeVehicule as any,
          typeCarburant:   dto.typeCarburant as any,
          marqueModele:    dto.marqueModele,
          immatriculation: dto.immatriculation.toUpperCase(),
          nombrePlaces:    dto.nombrePlaces,
          boiteVitesse:    dto.boiteVitesse as any,
          partenaireId:    partenaireId, // ✅ relation obligatoire en scalaire
        },
      });
    }

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

    // 9. ✅ Créer la mission — tout en scalaires
    console.log('📝 Création de la mission...');
    const mission = await this.prisma.mission.create({
      data: {
        partenaireId:     partenaireId,      // ✅ obligatoire
        agentId:          agentId,           // ✅ optionnel
        agenceId:         agent.agenceId,    // ✅ optionnel
        vehiculeId:       vehicule.id,       // ✅ scalaire
        adresseDepartId:  adresseDepart.id,  // ✅ scalaire
        adresseArriveeId: adresseArrivee.id, // ✅ scalaire
        statut:           'EN_ATTENTE',
        commentaire:      dto.commentaire || null,
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

    // 11. ✅ Calculer le montant avec prixParKm dynamique
    const montantTotal = calculRoute.distanceKm * prixParKm;
    const montantTotalArrondi = Math.round(montantTotal); // ✅ 47.89 → 48

    console.log(
      `💰 Montant: ${prixParKm}€ × ${calculRoute.distanceKm}km = ${montantTotal.toFixed(2)}€`,
    );

    // 12. Créer le calcul de mission
    console.log('🧮 Enregistrement du calcul...');
  await this.prisma.calculMission.create({
  data: {
    mission: { connect: { id: mission.id } }, // ← remplacer missionId: mission.id
    distanceKm:   new Decimal(calculRoute.distanceKm),
    fraisPeage:   new Decimal(calculRoute.fraisPeage),
    montantKm:    new Decimal(parseFloat((calculRoute.distanceKm * prixParKm).toFixed(2))), // ← ajouter
    montantFinal: new Decimal(montantTotalArrondi), // ← ajouter
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
      create: [{ cheminFichier: cheminFichier }],
    },
  },
});
      }
    } else {
      console.log('✅ Aucun document fourni (optionnel)');
    }

    // 15. Vérifier les alertes
    console.log('🔔 Vérification des alertes...');
    try {
      await this.alertesService.checkAlertes({
        id: mission.id,
        adresseDepart,
        adresseArrivee,
        vehicule,
        calculs: {
          distanceKm:   calculRoute.distanceKm,
          fraisPeage:   calculRoute.fraisPeage,
          montantTotal: montantTotal,
        },
      });
      console.log('✅ Alertes vérifiées');
    } catch (alertError) {
      console.error('⚠️ Erreur lors de la vérification des alertes:', alertError);
    }

    // 16. Retourner la mission complète
    console.log('✅ Mission créée avec succès!');
    return this.obtenirMission(mission.id);

  } catch (error) {
    if (error instanceof HttpException) throw error; // ✅ Ne pas re-wrapper
    console.error('❌ Erreur création mission:', error);
    throw new HttpException(
      `Erreur lors de la création de la mission: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

  /**
   * Convertit une durée formatée en minutes totales
   */
  private convertirDureeEnMinutes(dureeFormatee: string): number {
    let totalMinutes = 0;
    
    const formatCompactMatch = dureeFormatee.match(/(\d+)h(\d+)/i);
    if (formatCompactMatch) {
      totalMinutes = parseInt(formatCompactMatch[1]) * 60 + parseInt(formatCompactMatch[2]);
      return totalMinutes;
    }
    
    const heuresMatch = dureeFormatee.match(/(\d+)\s*h(?!\d)/i);
    if (heuresMatch) {
      totalMinutes += parseInt(heuresMatch[1]) * 60;
    }
    
    const minutesMatch = dureeFormatee.match(/(\d+)\s*min/i);
    if (minutesMatch) {
      totalMinutes += parseInt(minutesMatch[1]);
    }
    
    if (totalMinutes === 0) {
      throw new HttpException(
        `Format de durée invalide: "${dureeFormatee}". Formats acceptés: "4h35", "4h 35min", "4h", "35min"`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    
    console.log(`🕒 Durée convertie: "${dureeFormatee}" = ${totalMinutes} minutes`);
    
    return totalMinutes;
  }

  /**
   * Formate une date en français avec l'heure
   */
  private formaterDateAvecHeure(date: Date): string {
    return date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  /**
   * Récupère le code INSEE et les coordonnées GPS d'une ville française
   */
  private async obtenirInfoVille(nomVille: string): Promise<{
    codeInsee: string;
    nom: string;
    latitude: number;
    longitude: number;
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(nomVille)}&fields=code,nom,centre,population&limit=10`
        )
      );

      if (response.data.length === 0) {
        throw new Error(`Ville "${nomVille}" non trouvée`);
      }

      const villesTriees = response.data
        .filter((v: any) => v.centre)
        .sort((a: any, b: any) => (b.population || 0) - (a.population || 0));

      if (villesTriees.length === 0) {
        throw new Error(`Ville "${nomVille}" non trouvée`);
      }

      const ville = villesTriees[0];
      
      return {
        codeInsee: ville.code,
        nom: ville.nom,
        latitude: ville.centre.coordinates[1],
        longitude: ville.centre.coordinates[0],
      };
    } catch (error) {
      throw new HttpException(
        `Impossible de récupérer les informations pour "${nomVille}": ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Méthode utilitaire pour convertir string en number avec validation
   */
  private convertirEnNombre(valeur: any, nomChamp: string): number {
    if (typeof valeur === 'number') {
      return valeur;
    }

    const nombre = parseInt(valeur, 10);

    if (isNaN(nombre)) {
      throw new HttpException(
        `Le champ "${nomChamp}" doit être un nombre valide`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return nombre;
  }

  /**
   * Récupère une mission complète par son ID
   * ✅ Accepte string ou number, retourne avec includes
   */
  async obtenirMission(missionId: string | number): Promise<MissionResponseDto> {
    // ✅ Garder en string si c'est déjà un string, sinon convertir
    const id = typeof missionId === 'number' ? missionId.toString() : missionId;
    
    const mission = await this.prisma.mission.findUnique({
      where: { id },  // ✅ Maintenant c'est un string
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

    if (!mission) {
      throw new HttpException('Mission non trouvée', HttpStatus.NOT_FOUND);
    }

    return mission as any;
  }

  /**
   * Liste toutes les missions avec filtres optionnels
   */
  async listerMissions(partenaireId?: string, statut?: string) {
    const partenaireIdNumber = partenaireId 
      ? this.convertirEnNombre(partenaireId, 'partenaireId')
      : undefined;

    return this.prisma.mission.findMany({
      where: {
        ...(partenaireIdNumber && { partenaireId: partenaireIdNumber }),
        ...(statut && { statut: statut as any }),
      },
      include: {
        vehicule: true,
        adresseDepart: true,
        adresseArrivee: true,
        disponibilite: true,
        calculs: true,
      },
      orderBy: {
        dateCreation: 'desc',
      },
    });
  }

  /**
   * Met à jour le statut d'une mission
   */
  async mettreAJourStatut(missionId: string, statut: string) {
    // ✅ missionId est déjà un string, pas besoin de conversion
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },  // ✅ Utiliser directement le string
    });

    if (!mission) {
      throw new HttpException('Mission non trouvée', HttpStatus.NOT_FOUND);
    }

    return this.prisma.mission.update({
      where: { id: missionId },  // ✅ Utiliser directement le string
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

  /**
   * Supprime une mission
   */
  async supprimerMission(missionId: string) {
    // ✅ missionId est déjà un string
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },  // ✅ Utiliser directement le string
    });

    if (!mission) {
      throw new HttpException('Mission non trouvée', HttpStatus.NOT_FOUND);
    }

    await this.prisma.mission.delete({
      where: { id: missionId },  // ✅ Utiliser directement le string
    });

    return { message: 'Mission supprimée avec succès' };
  }

  /**
   * Récupère les détails formatés d'une mission spécifique
   */
// missions.service.ts

/**
 * Récupère les détails formatés d'une mission spécifique
 */
async obtenirDetailsMission(missionId: string): Promise<MissionDetailsType> {
  try {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        vehicule: true,
        adresseDepart: true,
        adresseArrivee: true,
        disponibilite: true,
        calculs: true,  // ✅ Récupère les calculs
      },
    });

    if (!mission) {
      throw new HttpException(
        `Mission avec l'ID ${missionId} introuvable`,
        HttpStatus.NOT_FOUND,
      );
    }

    // ✅ CORRECTION : calculs est un array, prendre le premier
    const calcul = mission.calculs?.[0];
    
    // ✅ CORRECTION : Convertir explicitement le JSON
    const detailCalcul = calcul?.detailCalcul 
      ? (typeof calcul.detailCalcul === 'string' 
          ? JSON.parse(calcul.detailCalcul) 
          : calcul.detailCalcul)
      : null;

    // ✅ CORRECTION : disponibilite peut être null
    const disponibilite = mission.disponibilite;

    // ✅ LOG pour debug
    console.log('🔍 Debug obtenirDetailsMission:', {
      missionId,
      hasCalcul: !!calcul,
      calculKeys: calcul ? Object.keys(calcul) : [],
      detailCalculType: typeof calcul?.detailCalcul,
      detailCalculValue: detailCalcul,
      distanceKmFromCalcul: calcul?.distanceKm,
      distanceKmFromDetail: detailCalcul?.distanceKm,
    });

    const missionDetails: MissionDetailsType = {
      typeVehicule: (mission.vehicule?.typeVehicule as TypeVehiculeEnum) || TypeVehiculeEnum.BERLINE,
      typeCarburant: (mission.vehicule?.typeCarburant as TypeCarburantEnum) || TypeCarburantEnum.ESSENCE,
      villeDepart: mission.adresseDepart?.villeNom || 'N/A',
      villeArrivee: mission.adresseArrivee?.villeNom || 'N/A',
      
      // ✅ CORRECTION : Prendre depuis calcul (Decimal) ou detailCalcul (JSON)
      distanceKm: calcul?.distanceKm 
        ? parseFloat(calcul.distanceKm.toString()) 
        : (detailCalcul?.distanceKm || 0),
      
      fraisPeage: calcul?.fraisPeage 
        ? parseFloat(calcul.fraisPeage.toString()) 
        : (detailCalcul?.fraisPeage || 0),
      
      montantTotal: calcul?.montantTotal 
        ? parseFloat(calcul.montantTotal.toString()) 
        : (detailCalcul?.montantTotal || 0),
      
      dateDebut: disponibilite?.dateDebut?.toISOString() || new Date().toISOString(),
      
      dateDepartMax: disponibilite?.dateDepartMax 
        ? disponibilite.dateDepartMax.toISOString()
        : '',
      
      // ✅ CORRECTION : Prendre depuis detailCalcul (JSON)
      dateDepartMaxFormatee: detailCalcul?.dateDepartMaxFormatee || '',
      
      dateFin: disponibilite?.dateFin?.toISOString() || new Date().toISOString(),
      
      dureeFormatee: detailCalcul?.dureeFormatee || '0h00',
      
      dureeMinutes: detailCalcul?.dureeMinutes || 0,
    };

    return missionDetails;

  } catch (error) {
    console.error('❌ Erreur dans obtenirDetailsMission:', error);
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException(
      'Erreur lors de la récupération de la mission',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}


  /**
   * Liste toutes les missions avec leurs détails formatés pour GraphQL
   */
  async listerMissionsAvecDetails(
    partenaireId?: string,
    statut?: string,
  ): Promise<MissionDetailsType[]> {
    try {
      const missions = await this.listerMissions(partenaireId, statut);

      console.log(`📊 Nombre de missions récupérées: ${missions.length}`);

      const result = missions.map((mission) => {
        if (!mission) {
          console.warn('⚠️ Mission invalide détectée');
          return null;
        }

        const calcul = mission.calculs?.[0];
        const detailCalcul = calcul?.detailCalcul as any;
        const disponibilite = mission.disponibilite as any;

        const missionDetails: MissionDetailsType = {
          typeVehicule: (mission.vehicule?.typeVehicule as TypeVehiculeEnum) || TypeVehiculeEnum.BERLINE,
          typeCarburant: (mission.vehicule?.typeCarburant as TypeCarburantEnum) || TypeCarburantEnum.ESSENCE,
          villeDepart: mission.adresseDepart?.villeNom || 'N/A',
          villeArrivee: mission.adresseArrivee?.villeNom || 'N/A',
          distanceKm: parseFloat(calcul?.distanceKm || '0'),
          fraisPeage: parseFloat(calcul?.fraisPeage || '0'),
          montantTotal: parseFloat(calcul?.montantTotal || '0'),
          dateDebut: mission.disponibilite?.dateDebut?.toISOString() || new Date().toISOString(),
          dateDepartMax: disponibilite?.dateDepartMax 
            ? disponibilite.dateDepartMax.toISOString()
            : '',
          dateDepartMaxFormatee: detailCalcul?.dateDepartMaxFormatee || '',
          dateFin: mission.disponibilite?.dateFin?.toISOString() || new Date().toISOString(),
          dureeFormatee: detailCalcul?.dureeFormatee || '0h00',
          dureeMinutes: detailCalcul?.dureeMinutes || 0,
        };

        return missionDetails;
      });

      const filteredResult = result.filter((mission): mission is MissionDetailsType => 
        mission !== null
      );

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

  async getMissionsForCards(): Promise<MissionWithRelations[]> {
    return this.prisma.mission.findMany({
      include: {
        vehicule: true,
        adresseDepart: true,
        adresseArrivee: true,
        calculs: true,
        disponibilite: true,
      },
      orderBy: { dateCreation: 'desc' },
    });
  }

async searchMissions(
  search?: string,
  page = 1,
  pageSize = 20,
): Promise<{ missions: MissionWithRelations[]; total: number }> {
  
  const skip = (page - 1) * pageSize;

  // ✅ Recherche uniquement par ville de départ et d'arrivée
  const where: Prisma.MissionWhereInput = search
    ? {
        OR: [
          {
            adresseDepart: {
              villeNom: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          {
            adresseArrivee: {
              villeNom: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        ],
      }
    : {};

  const [missions, total] = await Promise.all([
    this.prisma.mission.findMany({
      where,
      include: {
        vehicule: true,
        adresseDepart: true,
        adresseArrivee: true,
        calculs: true,
        disponibilite: true,
      },
      orderBy: { dateCreation: 'desc' },
      skip,
      take: pageSize,
    }),
    this.prisma.mission.count({ where }),
  ]);

  return { missions, total };
}



async searchMissionsByTrajet(
  filters: SearchByTrajetInput,
  page: number = 1,
  pageSize: number = 20,
) {
  console.log('\n🔍 ========== RECHERCHE PAR TRAJET ==========');
  console.log('📍 Filtres:', JSON.stringify(filters, null, 2));

  // Validation
  if (!filters.villeDepartNom || !filters.villeArriveeNom) {
    console.error('❌ Villes manquantes');
    return { missions: [], total: 0 };
  }

  // 1. Récupérer TOUTES les missions EN_ATTENTE
  const allMissions = await this.prisma.mission.findMany({
    where: { 
      statut: 'EN_ATTENTE',
    },
    include: {
      vehicule: true,
      adresseDepart: true,
      adresseArrivee: true,
      calculs: true,
      disponibilite: true,
    },
  });

  console.log(`📋 ${allMissions.length} mission(s) EN_ATTENTE trouvée(s)`);

  if (allMissions.length === 0) {
    return { missions: [], total: 0 };
  }

  // 2. Filtrer par trajet (départ ET arrivée dans le rayon)
  const missionsMatchingTrajet = allMissions.filter(mission => {
    try {
      // Vérifier que les adresses existent
      if (!mission.adresseDepart?.latitude || !mission.adresseDepart?.longitude) {
        return false;
      }
      if (!mission.adresseArrivee?.latitude || !mission.adresseArrivee?.longitude) {
        return false;
      }

      // ✅ Conversion Decimal vers Number
      const latDepart = Number(mission.adresseDepart.latitude);
      const lonDepart = Number(mission.adresseDepart.longitude);
      const latArrivee = Number(mission.adresseArrivee.latitude);
      const lonArrivee = Number(mission.adresseArrivee.longitude);

      // Le départ de la mission doit être proche du départ recherché
      const distanceDepart = this.geoService.calculateDistance(
        filters.latitudeDepart,
        filters.longitudeDepart,
        latDepart,
        lonDepart,
      );

      // L'arrivée de la mission doit être proche de l'arrivée recherchée
      const distanceArrivee = this.geoService.calculateDistance(
        filters.latitudeArrivee,
        filters.longitudeArrivee,
        latArrivee,
        lonArrivee,
      );

      console.log(`  Mission ${mission.id}: départ=${distanceDepart.toFixed(1)}km, arrivée=${distanceArrivee.toFixed(1)}km`);

      // Les DEUX doivent être dans le rayon
      const geoMatch = distanceDepart <= filters.rayon && distanceArrivee <= filters.rayon;

      if (!geoMatch) return false;

      // Vérifier les dates si fournies
      if (filters.dateDepart && filters.dateDepartMax && mission.disponibilite) {
        const missionDateDebut = new Date(mission.disponibilite.dateDebut);
        const missionDateDepartMax = new Date(mission.disponibilite.dateDepartMax);
        const filterDateDebut = new Date(filters.dateDepart);
        const filterDateFin = new Date(filters.dateDepartMax);

        // La mission doit chevaucher la période recherchée
        const dateMatch = 
          missionDateDebut <= filterDateFin && 
          missionDateDepartMax >= filterDateDebut;

        console.log(`  Mission ${mission.id}: dateMatch=${dateMatch}`);

        return dateMatch;
      }

      return true; // Pas de filtre de dates
    } catch (error) {
      console.error(`❌ Erreur mission ${mission.id}:`, error.message);
      return false;
    }
  });

  console.log(`✅ ${missionsMatchingTrajet.length} mission(s) correspondant au trajet`);
  console.log('🔍 ==========================================\n');

  // 3. Pagination
  const total = missionsMatchingTrajet.length;
  const skip = (page - 1) * pageSize;
  const missions = missionsMatchingTrajet.slice(skip, skip + pageSize);

  return { missions, total };
}



// missions.service.ts
async findMissionById(id: string) {
  const mission = await this.prisma.mission.findUnique({
    where: { id },
    include: {
      partenaire: true,
      vehicule: true,
      adresseDepart: true,
      adresseArrivee: true,
      disponibilite: true,
      calculs: true,
      notifications: true,
 documents: {
        include: { fichiers: true }, // ✅ AJOUT OBLIGATOIRE
      }    }
  });

  if (!mission) return null;

  // Convertir les Decimal en number
  return {
    ...mission,
    calculs: mission.calculs ? {
      ...mission.calculs,
      distanceKm: mission.calculs.distanceKm.toNumber(),
      fraisPeage: mission.calculs.fraisPeage.toNumber(),
      montantTotal: mission.calculs.montantTotal.toNumber(),
    } : null
  };
}

async getMissionsByAgence(agenceId: number): Promise<MissionWithRelationsFlat[]> {
  const missions = await this.prisma.mission.findMany({
    where: { agenceId },
    include: {
      vehicule: true,
      adresseDepart: true,
      adresseArrivee: true,
      disponibilite: true,
      calculs: true,
    },
    orderBy: { dateCreation: 'desc' }, // ✅ Ajout tri
  });

  return missions.map((mission) => ({
    ...mission,
    calculs: mission.calculs ? {
      ...mission.calculs,
      distanceKm: mission.calculs.distanceKm.toNumber(),
      fraisPeage: mission.calculs.fraisPeage.toNumber(),
      montantTotal: mission.calculs.montantTotal.toNumber(),
    } : null,
  }));
}
}
