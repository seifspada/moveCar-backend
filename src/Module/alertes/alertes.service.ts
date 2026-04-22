// src/Module/alertes/alertes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { GeoService } from '../geo/geo.service';
import { TypeAlerte } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AlertesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly geoService: GeoService,
  ) {}

async getAllAlertes() {
  console.log('📋 Récupération de TOUTES les alertes (tous utilisateurs)');

  const alertes = await this.prisma.alerteGeographique.findMany({
    select: {
      id: true,
      userId: true,  // ✅ Inclure userId pour savoir à qui appartient l'alerte
      type: true,
      villeNom: true,
      latitude: true,
      longitude: true,
      rayon: true,
      actif: true,
      // Pour les alertes de type TRAJET
      villeDepartNom: true,
      latitudeDepart: true,
      longitudeDepart: true,
      villeArriveeNom: true,
      latitudeArrivee: true,
      longitudeArrivee: true,
      // ✅ Inclure les infos utilisateur (optionnel)
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          adherent: {
            select: {
              nom: true,
              prenom: true,
            },
          },
        },
      },
    },
  });

  console.log(`✅ ${alertes.length} alerte(s) trouvée(s) (tous utilisateurs)`);

  return alertes;
}


/**
 * ✅ Créer alerte géographique (max 1 active par utilisateur)
 */
async creerAlerteGeographique(
  userId: number,
  villeNom: string,
  latitude: number,
  longitude: number,
  rayon: number,
) {
  console.log('\n🔔 ========== CRÉATION ALERTE GÉOGRAPHIQUE ==========');
  console.log('🔔 userId reçu:', userId);

  // 1. Récupérer l'utilisateur
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      adherent: {
        select: {
          nom: true,
          prenom: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundException(`Utilisateur avec ID ${userId} introuvable`);
  }

  console.log('👤 Utilisateur trouvé:', user.email);

  // 2. ✅ SUPPRIMER (pas désactiver) toutes les alertes GÉOGRAPHIQUES existantes
  const deleteResult = await this.prisma.alerteGeographique.deleteMany({
    where: { 
      userId, 
      type: TypeAlerte.GEOGRAPHIQUE 
    },
  });

  console.log(`🗑️ ${deleteResult.count} alerte(s) géographique(s) supprimée(s)`);

  // 3. Créer la nouvelle alerte
  const alerte = await this.prisma.alerteGeographique.create({
    data: {
      userId,
      type: TypeAlerte.GEOGRAPHIQUE,
      villeNom,
      latitude,
      longitude,
      rayon,
      actif: true,
    },
  });

  console.log('✅ Nouvelle alerte créée en BDD:', alerte.id);

  // 4. Envoyer l'email de confirmation
  const userName = user.adherent?.prenom || user.adherent?.nom || user.name || 'Adhérent';

  console.log('📧 Envoi email de confirmation...');
  
  await this.emailService.sendConfirmationAlerteGeographique(
    user.email,
    userName,
    villeNom,
    rayon,
  );

  console.log('✅ Email envoyé avec succès');
  console.log('🔔 =============================================\n');

  return alerte;
}

/**
 * ✅ Créer alerte trajet (max 1 active par utilisateur)
 */
async creerAlerteTrajet(
  userId: number,
  villeDepartNom: string,
  latitudeDepart: number,
  longitudeDepart: number,
  villeArriveeNom: string,
  latitudeArrivee: number,
  longitudeArrivee: number,
  rayon: number,
  dateDepart?: string,
  dateDepartMax?: string,
) {
  console.log('\n🔔 ========== CRÉATION ALERTE TRAJET ==========');
  console.log('🔔 userId reçu:', userId);

  // 1. Récupérer l'utilisateur
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      adherent: {
        select: {
          nom: true,
          prenom: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundException('Utilisateur introuvable');
  }

  console.log('👤 Utilisateur trouvé:', user.email);

  // 2. ✅ SUPPRIMER (pas désactiver) toutes les alertes TRAJET existantes
  const deleteResult = await this.prisma.alerteGeographique.deleteMany({
    where: { 
      userId, 
      type: TypeAlerte.TRAJET 
    },
  });

  console.log(`🗑️ ${deleteResult.count} alerte(s) trajet supprimée(s)`);

  // 3. Créer la nouvelle alerte
  const alerte = await this.prisma.alerteGeographique.create({
    data: {
      userId,
      type: TypeAlerte.TRAJET,
      villeDepartNom,
      latitudeDepart,
      longitudeDepart,
      villeArriveeNom,
      latitudeArrivee,
      longitudeArrivee,
      rayon,
      actif: true,
      dateDepart: dateDepart ? new Date(dateDepart) : null,
      dateDepartMax: dateDepartMax ? new Date(dateDepartMax) : null,
    },
  });

  console.log('✅ Nouvelle alerte créée en BDD:', alerte.id);

  // 4. Envoyer l'email de confirmation
  const userName = user.adherent?.prenom || user.adherent?.nom || user.name || 'Adhérent';

  console.log('📧 Envoi email de confirmation...');

  await this.emailService.sendConfirmationAlerteTrajet(
    user.email,
    userName,
    villeDepartNom,
    villeArriveeNom, 
    rayon,
  );

  console.log('✅ Email envoyé avec succès');
  console.log(`✅ Alerte trajet créée pour ${user.email} - ${villeDepartNom} → ${villeArriveeNom}`);
  console.log('🔔 ==========================================\n');

  return alerte;
}


  /**
   * ✅ Vérifier alertes lors de création de mission
   */
async checkAlertes(mission: any) {
  console.log('\n🔍 ========== DEBUG ALERTES ==========');
  console.log('Mission:', {
    id: mission.id,
    depart: `${mission.adresseDepart.villeNom} (${mission.adresseDepart.latitude}, ${mission.adresseDepart.longitude})`,
    arrivee: `${mission.adresseArrivee.villeNom} (${mission.adresseArrivee.latitude}, ${mission.adresseArrivee.longitude})`,
  });

  // Récupérer la disponibilité
  const disponibilite = await this.prisma.disponibiliteMission.findFirst({
    where: { missionId: mission.id },
  });

  console.log('Disponibilité mission:', disponibilite);

  const alertes = await this.prisma.alerteGeographique.findMany({
    where: { actif: true },
    include: {
      user: {
        include: {
          adherent: true,
        },
      },
    },
  });

  console.log(`\n📋 ${alertes.length} alerte(s) trouvée(s)`);

  for (const alerte of alertes) {
    console.log(`\n--- Alerte #${alerte.id} ---`);
    console.log('Type:', alerte.type);
    console.log('User:', alerte.user.email);
    
    let match = false;

    if (alerte.type === TypeAlerte.GEOGRAPHIQUE) {
      console.log(`📍 GEO: ${alerte.villeNom} (rayon: ${alerte.rayon} km)`);
      
      const distanceDepart = this.geoService.calculateDistance(
        alerte.latitude,
        alerte.longitude,
        mission.adresseDepart.latitude,
        mission.adresseDepart.longitude,
      );

      const distanceArrivee = this.geoService.calculateDistance(
        alerte.latitude,
        alerte.longitude,
        mission.adresseArrivee.latitude,
        mission.adresseArrivee.longitude,
      );

      console.log(`   Distance départ: ${distanceDepart} (unité: ???)`); // ⚠️ VÉRIFIE L'UNITÉ
      console.log(`   Distance arrivée: ${distanceArrivee} (unité: ???)`);
      console.log(`   Rayon alerte: ${alerte.rayon} km`);

      match = distanceDepart <= alerte.rayon || distanceArrivee <= alerte.rayon;
      
      console.log(`   → Match: ${match ? '✅' : '❌'}`);
    } 
    else if (alerte.type === TypeAlerte.TRAJET) {
      console.log(`🚗 TRAJET: ${alerte.villeDepartNom} → ${alerte.villeArriveeNom} (rayon: ${alerte.rayon} km)`);
      console.log(`   Alerte départ: (${alerte.latitudeDepart}, ${alerte.longitudeDepart})`);
      console.log(`   Alerte arrivée: (${alerte.latitudeArrivee}, ${alerte.longitudeArrivee})`);
      console.log(`   Mission départ: (${mission.adresseDepart.latitude}, ${mission.adresseDepart.longitude})`);
      console.log(`   Mission arrivée: (${mission.adresseArrivee.latitude}, ${mission.adresseArrivee.longitude})`);
      
      const distanceDepart = this.geoService.calculateDistance(
        alerte.latitudeDepart,
        alerte.longitudeDepart,
        mission.adresseDepart.latitude,
        mission.adresseDepart.longitude,
      );

      const distanceArrivee = this.geoService.calculateDistance(
        alerte.latitudeArrivee,
        alerte.longitudeArrivee,
        mission.adresseArrivee.latitude,
        mission.adresseArrivee.longitude,
      );

      console.log(`   Distance départ: ${distanceDepart} (max: ${alerte.rayon})`);
      console.log(`   Distance arrivée: ${distanceArrivee} (max: ${alerte.rayon})`);

      const geoMatch = distanceDepart <= alerte.rayon && distanceArrivee <= alerte.rayon;
      console.log(`   Geo match: ${geoMatch ? '✅' : '❌'}`);

      // Vérification des dates
      if (geoMatch && alerte.dateDepart && alerte.dateDepartMax && disponibilite) {
        console.log(`\n   📅 Vérification dates...`);
        console.log(`   Alerte dateDepart: ${alerte.dateDepart}`);
        console.log(`   Alerte dateDepartMax: ${alerte.dateDepartMax}`);
        console.log(`   Mission dateDebut: ${disponibilite.dateDebut}`);
        console.log(`   Mission dateDepartMax: ${disponibilite.dateDepartMax}`);

        const missionDateDebut = new Date(disponibilite.dateDebut);
        const missionDateDepartMax = new Date(disponibilite.dateDepartMax);
        const alerteDateDebut = new Date(alerte.dateDepart);
        const alerteDateFin = new Date(alerte.dateDepartMax);

        const dateMatch = 
          missionDateDebut <= alerteDateFin && 
          missionDateDepartMax >= alerteDateDebut;

        console.log(`   Date match: ${dateMatch ? '✅' : '❌'}`);
        match = geoMatch && dateMatch;
      } else if (geoMatch) {
        console.log(`   Pas de filtre dates`);
        match = true;
      }

      console.log(`   → Match final: ${match ? '✅' : '❌'}`);
    }

    if (match) {
      console.log(`\n✅ MATCH! Email à envoyer à ${alerte.user.email}`);
      
      const dejaNotifie = await this.prisma.notificationAlerte.findFirst({
        where: {
          alerteId: alerte.id,
          missionId: mission.id,
        },
      });

      if (dejaNotifie) {
        console.log(`⚠️ Déjà notifié le ${dejaNotifie.dateEnvoi}`);
        continue;
      }

      const userName = alerte.user.adherent?.prenom || 
                      alerte.user.adherent?.nom || 
                      alerte.user.name || 
                      'Adhérent';

      try {
        if (alerte.type === TypeAlerte.GEOGRAPHIQUE) {
          await this.emailService.sendAlerteGeographique(
            alerte.user.email,
            userName,
            alerte.villeNom,
            alerte.rayon,
            mission,
          );
        } else {
          await this.emailService.sendAlerteTrajet(
            alerte.user.email,
            userName,
            alerte.villeDepartNom,
            alerte.villeArriveeNom,
            alerte.rayon,
            mission,
          );
        }

        await this.prisma.notificationAlerte.create({
          data: {
            alerteId: alerte.id,
            missionId: mission.id,
            emailEnvoye: true,
            dateEnvoi: new Date(),
          },
        });

        console.log(`📧 ✅ Email envoyé!`);
      } catch (error) {
        console.error(`❌ Erreur envoi email:`, error);
      }
    } else {
      console.log(`❌ Pas de match`);
    }
  }

  console.log('\n🔍 ====================================\n');
}


  /**
   * ✅ Récupérer alertes d'un utilisateur
   */
  async getAlertesByUser(userId: number) {
    return await this.prisma.alerteGeographique.findMany({
      where: { userId, actif: true },
      orderBy: { dateCreation: 'desc' },
    });
  }

  /**
   * ✅ Récupérer une alerte par ID
   */
  async getAlerteById(alerteId: string) {
    return await this.prisma.alerteGeographique.findUnique({
      where: { id: alerteId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            adherent: {
              select: {
                nom: true,
                prenom: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * ✅ Désactiver toutes les alertes d'un utilisateur
   */
  async desactiverAlerte(userId: number) {
    return await this.prisma.alerteGeographique.updateMany({
      where: { userId, actif: true },
      data: { actif: false },
    });
  }

  /**
   * ✅ Supprimer une alerte
   */
  async supprimerAlerte(alerteId: string) {
    return await this.prisma.alerteGeographique.delete({
      where: { id: alerteId },
    });
  }

  /**
   * ✅ Activer une alerte
   */
  async activerAlerte(alerteId: string) {
    return await this.prisma.alerteGeographique.update({
      where: { id: alerteId },
      data: { actif: true },
    });
  }

  /**
   * ✅ Modifier le rayon d'une alerte
   */
  async modifierRayon(alerteId: string, rayon: number) {
    return await this.prisma.alerteGeographique.update({
      where: { id: alerteId },
      data: { rayon },
    });
  }

  /**
   * ✅ Statistiques globales
   */
  async getStatsAlertes() {
    const [total, actives, geographiques, trajets] = await Promise.all([
      this.prisma.alerteGeographique.count(),
      this.prisma.alerteGeographique.count({ where: { actif: true } }),
      this.prisma.alerteGeographique.count({ where: { type: TypeAlerte.GEOGRAPHIQUE } }),
      this.prisma.alerteGeographique.count({ where: { type: TypeAlerte.TRAJET } }),
    ]);

    return {
      total,
      actives,
      inactives: total - actives,
      parType: {
        geographiques,
        trajets,
      },
    };
  }

  /**
   * ✅ Historique des notifications d'un utilisateur
   */
  async getNotificationsByUser(userId: number) {
    return await this.prisma.notificationAlerte.findMany({
      where: {
        alerte: {
          userId,
        },
      },
      include: {
        alerte: true,
      },
      orderBy: {
        dateCreation: 'desc',
      },
      take: 50,
    });
  }

  /**
   * ✅ Vérifier nouvelles missions (polling)
   */
  async checkNouvellesMissions(userId: number) {
    const alerte = await this.prisma.alerteGeographique.findFirst({
      where: { userId, actif: true },
    });

    if (!alerte) {
      return { nouvellesMissions: [] };
    }

    const derniereVerification = await this.prisma.notificationAlerte.findFirst({
      where: { alerteId: alerte.id },
      orderBy: { dateCreation: 'desc' },
    });

    const missions = await this.prisma.mission.findMany({
      where: {
        dateCreation: {
          gt: derniereVerification?.dateCreation || new Date(0),
        },
      },
      include: {
        adresseDepart: true,
        adresseArrivee: true,
        vehicule: true,
        calculs: true,
      },
    });

    const missionsInRadius = missions.filter((mission) => {
      if (alerte.type === TypeAlerte.GEOGRAPHIQUE) {
        const distanceDepart = this.geoService.calculateDistance(
          alerte.latitude,
          alerte.longitude,
          mission.adresseDepart.latitude,
          mission.adresseDepart.longitude,
        );

        const distanceArrivee = this.geoService.calculateDistance(
          alerte.latitude,
          alerte.longitude,
          mission.adresseArrivee.latitude,
          mission.adresseArrivee.longitude,
        );

        return distanceDepart <= alerte.rayon || distanceArrivee <= alerte.rayon;
      } else {
        const distanceDepart = this.geoService.calculateDistance(
          alerte.latitudeDepart,
          alerte.longitudeDepart,
          mission.adresseDepart.latitude,
          mission.adresseDepart.longitude,
        );

        const distanceArrivee = this.geoService.calculateDistance(
          alerte.latitudeArrivee,
          alerte.longitudeArrivee,
          mission.adresseArrivee.latitude,
          mission.adresseArrivee.longitude,
        );

        return distanceDepart <= alerte.rayon && distanceArrivee <= alerte.rayon;
      }
    });

    return {
      nouvellesMissions: missionsInRadius.map((m) => ({
        id: m.id,
        villeDepart: m.adresseDepart.villeNom,
        villeArrivee: m.adresseArrivee.villeNom,
        typeVehicule: m.vehicule.typeVehicule,
        montantTotal: m.calculs?.montantTotal,
      })),
    };
  }
}
