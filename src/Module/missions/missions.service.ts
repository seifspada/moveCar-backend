import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RouteCalculatorService } from '../route-calculator/route-calculator.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateMissionDto } from './dto/create-mission.dto';
import { MissionResponseDto } from './dto/mission-response.dto';

@Injectable()
export class MissionsService {
  private readonly PRIX_PAR_KM = 0.95;

  constructor(
    private readonly prisma: PrismaService,
    private readonly routeCalculator: RouteCalculatorService,
    private readonly httpService: HttpService,
  ) {}

  async creerMission(
    dto: CreateMissionDto,
    documents?: any[], // ✅ any[] pour gérer Fastify et Express
  ): Promise<MissionResponseDto> {
    try {
      // ✅ Validation et conversion du partenaireId
      const partenaireId = this.convertirEnNombre(dto.partenaireId, 'partenaireId');

      // 1. Récupérer les informations complètes des villes
      console.log('🔍 Récupération des informations des villes...');
      const [villeDepart, villeArrivee] = await Promise.all([
        this.obtenirInfoVille(dto.villeDepart),
        this.obtenirInfoVille(dto.villeArrivee),
      ]);

      console.log('✅ Ville départ:', villeDepart);
      console.log('✅ Ville arrivée:', villeArrivee);

      // 2. Calculer la distance et les frais
      console.log('🚗 Calcul de la route...');
      const calculRoute = await this.routeCalculator.calculerRouteParVilles(
        dto.villeDepart,
        dto.villeArrivee,
        dto.typeVehicule,
      );

      console.log('📊 Résultat calcul:', calculRoute);

      // 3. Créer ou trouver le véhicule
      console.log('🔍 Recherche du véhicule...');
      let vehicule = await this.prisma.vehicule.findUnique({
        where: { immatriculation: dto.immatriculation.toUpperCase() },
      });

      if (!vehicule) {
        console.log('➕ Création du véhicule...');
        vehicule = await this.prisma.vehicule.create({
          data: {
            typeVehicule: dto.typeVehicule as any,
            typeCarburant: dto.typeCarburant as any,
            marqueModele: dto.marqueModele,
            immatriculation: dto.immatriculation.toUpperCase(),
            nombrePlaces: dto.nombrePlaces,
            boiteVitesse: dto.boiteVitesse as any,
            partenaireId: partenaireId, // ✅ Converti en number
          },
        });
      }

      // 4. Créer les adresses
      console.log('📍 Création des adresses...');
      const adresseDepart = await this.prisma.adresse.create({
        data: {
          villeId: villeDepart.codeInsee,
          villeNom: villeDepart.nom,
          adresseComplete: dto.adresseDepartComplete,
          typeLieu: dto.typeLieuDepart as any,
          nomLieu: dto.nomLieuDepart || null,
          latitude: villeDepart.latitude,
          longitude: villeDepart.longitude,
        },
      });

      const adresseArrivee = await this.prisma.adresse.create({
        data: {
          villeId: villeArrivee.codeInsee,
          villeNom: villeArrivee.nom,
          adresseComplete: dto.adresseArriveeComplete,
          typeLieu: dto.typeLieuArrivee as any,
          nomLieu: dto.nomLieuArrivee || null,
          latitude: villeArrivee.latitude,
          longitude: villeArrivee.longitude,
        },
      });

      // 5. Créer la mission
      console.log('📝 Création de la mission...');
      const mission = await this.prisma.mission.create({
        data: {
          partenaireId: partenaireId, // ✅ Converti en number
          vehiculeId: vehicule.id,
          adresseDepartId: adresseDepart.id,
          adresseArriveeId: adresseArrivee.id,
          statut: 'EN_ATTENTE',
          commentaire: dto.commentaire || null,
        },
      });

      // 6. Créer la disponibilité
      console.log('📅 Création de la disponibilité...');
      await this.prisma.disponibiliteMission.create({
        data: {
          missionId: mission.id,
          dateDebut: new Date(dto.dateDebut),
          dateFin: new Date(dto.dateFin),
        },
      });

      // 7. Calculer le montant total
      const montantTotal = calculRoute.distanceKm * this.PRIX_PAR_KM;
      console.log(`💰 Montant calculé: ${this.PRIX_PAR_KM}€ × ${calculRoute.distanceKm} km = ${montantTotal.toFixed(2)}€`);

      // 8. Créer le calcul de mission
      console.log('🧮 Enregistrement du calcul...');
      await this.prisma.calculMission.create({
        data: {
          missionId: mission.id,
          distanceKm: new Decimal(calculRoute.distanceKm),
          fraisPeage: new Decimal(calculRoute.fraisPeage),
          montantTotal: new Decimal(montantTotal),
          detailCalcul: {
            distanceKm: calculRoute.distanceKm,
            dureeFormatee: calculRoute.dureeFormatee,
            fraisPeage: calculRoute.fraisPeage,
            prixParKm: this.PRIX_PAR_KM,
            montantTotal: Math.round(montantTotal),
            typeVehicule: dto.typeVehicule,
          },
        },
      });

      // 9. Créer les notifications si demandées
      console.log('🔔 Création des notifications...');
      if (dto.notifierDepart) {
        await this.prisma.notificationMission.create({
          data: {
            missionId: mission.id,
            typeNotification: 'DEPART',
            actif: true,
            nomContact: dto.nomContactDepart || null,
            telephoneContact: dto.telephoneContactDepart || null,
          },
        });
      }

      if (dto.notifierArrivee) {
        await this.prisma.notificationMission.create({
          data: {
            missionId: mission.id,
            typeNotification: 'ARRIVEE',
            actif: true,
            nomContact: dto.nomContactArrivee || null,
            telephoneContact: dto.telephoneContactArrivee || null,
          },
        });
      }

      // 10. Gérer les documents uploadés (OPTIONNELS)
      if (Array.isArray(documents) && documents.length > 0) {
        console.log(`📄 Upload de ${documents.length} document(s)...`);
        for (const file of documents) {
          // ✅ Compatible Fastify et Express
          const cheminFichier = file.filepath || file.path || file.filename;
          
          await this.prisma.document.create({
            data: {
              typeDocument: 'DOCUMENT_ADMINISTRATIF',
              cheminFichier: cheminFichier,
              missionId: mission.id,
            },
          });
        }
      } else {
        console.log('✅ Aucun document fourni (optionnel)');
      }

      // 11. Retourner la mission complète
      console.log('✅ Mission créée avec succès!');
      return this.obtenirMission(mission.id);
    } catch (error) {
      console.error('❌ Erreur création mission:', error);
      throw new HttpException(
        `Erreur lors de la création de la mission: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
   * ✅ Méthode utilitaire pour convertir string en number avec validation
   */
  private convertirEnNombre(valeur: any, nomChamp: string): number {
    // Si c'est déjà un number, le retourner directement
    if (typeof valeur === 'number') {
      return valeur;
    }

    // Convertir string en number
    const nombre = parseInt(valeur, 10);

    // Vérifier que la conversion a réussi
    if (isNaN(nombre)) {
      throw new HttpException(
        `Le champ "${nomChamp}" doit être un nombre valide`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return nombre;
  }

  async obtenirMission(missionId: string): Promise<MissionResponseDto> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
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

  async listerMissions(partenaireId?: string, statut?: string) {
    // ✅ Conversion du partenaireId si fourni
    const partenaireIdNumber = partenaireId 
      ? this.convertirEnNombre(partenaireId, 'partenaireId')
      : undefined;

    return this.prisma.mission.findMany({
      where: {
        ...(partenaireIdNumber && { partenaireId: partenaireIdNumber }), // ✅ Converti en number
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

    await this.prisma.mission.delete({
      where: { id: missionId },
    });

    return { message: 'Mission supprimée avec succès' };
  }
}