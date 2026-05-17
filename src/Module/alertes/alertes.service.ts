// src/Module/alertes/alertes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { GeoService } from '../geo/geo.service';
import { TypeAlerte } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class AlertesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly geoService: GeoService,
    private readonly notificationService: NotificationService,
  ) {}

  async getAllAlertes() {
    console.log('📋 Récupération de TOUTES les alertes (tous utilisateurs)');
    const alertes = await this.prisma.alerteGeographique.findMany({
      select: {
        id: true,
        userId: true,
        type: true,
        villeNom: true,
        latitude: true,
        longitude: true,
        rayon: true,
        actif: true,
        emailActif: true,
        pushActif: true,
        dateDepart: true,
        dateDepartMax: true,
        villeDepartNom: true,
        latitudeDepart: true,
        longitudeDepart: true,
        villeArriveeNom: true,
        latitudeArrivee: true,
        longitudeArrivee: true,
        dateCreation: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            adherent: {
              select: { nom: true, prenom: true },
            },
          },
        },
      },
    });
    console.log(`✅ ${alertes.length} alerte(s) trouvée(s)`);
    return alertes as any;
  }

  /**
   * ✅ Créer alerte géographique
   */
  async creerAlerteGeographique(
    userId: number,
    villeNom: string,
    latitude: number,
    longitude: number,
    rayon: number,
    emailActif: boolean = false,
    pushActif: boolean = false,
    fcmToken?: string,
    dateDepart?: string,
    dateDepartMax?: string,
  ) {
    console.log('\n🔔 ========== CRÉATION ALERTE GÉOGRAPHIQUE ==========');
    console.log('🔔 userId reçu:', userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        adherent: { select: { nom: true, prenom: true } },
      },
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec ID ${userId} introuvable`);
    }

    console.log('👤 Utilisateur trouvé:', user.email);

    // ✅ Supprimer TOUTES les alertes de l'utilisateur (pas seulement GEOGRAPHIQUE)
    //    pour éviter qu'une ancienne alerte TRAJET avec un canal différent coexiste
    const deleteResult = await this.prisma.alerteGeographique.deleteMany({
      where: { userId },
    });
    console.log(`🗑️ ${deleteResult.count} alerte(s) précédente(s) supprimée(s)`);

    const alerte = await this.prisma.alerteGeographique.create({
      data: {
        userId,
        type: TypeAlerte.GEOGRAPHIQUE,
        villeNom,
        latitude,
        longitude,
        rayon,
        actif: true,
        emailActif,
        pushActif,
        fcmToken: fcmToken || null,
        dateDepart: dateDepart ? new Date(dateDepart) : null,
        dateDepartMax: dateDepartMax ? new Date(dateDepartMax) : null,
      },
    });

    console.log('✅ Nouvelle alerte créée en BDD:', alerte.id);

    const userName = user.adherent?.prenom || user.adherent?.nom || user.name || 'Adhérent';

    if (emailActif) {
      console.log('📧 Envoi email de confirmation en arrière-plan...');
      void Promise.resolve(this.emailService.sendConfirmationAlerteGeographique(
          user.email, userName, villeNom, rayon,
        ))
        .then(() => console.log('✅ Email de confirmation envoyé'))
        .catch((emailError) => console.warn('⚠️ Erreur envoi email:', emailError));
    }

    if (pushActif) {
      console.log('📱 Push activé — notifications envoyées à la création de mission');
    }

    console.log('🔔 =============================================\n');
    return alerte as any;
  }

  /**
   * ✅ Créer alerte trajet
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
    emailActif: boolean = false,
    pushActif: boolean = false,
    fcmToken?: string,
  ) {
    console.log('\n🔔 ========== CRÉATION ALERTE TRAJET ==========');
    console.log('🔔 userId reçu:', userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        adherent: { select: { nom: true, prenom: true } },
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    console.log('👤 Utilisateur trouvé:', user.email);

    // ✅ Supprimer TOUTES les alertes de l'utilisateur (pas seulement TRAJET)
    //    pour éviter qu'une ancienne alerte GEOGRAPHIQUE avec un canal différent coexiste
    const deleteResult = await this.prisma.alerteGeographique.deleteMany({
      where: { userId },
    });
    console.log(`🗑️ ${deleteResult.count} alerte(s) précédente(s) supprimée(s)`);

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
        emailActif,
        pushActif,
        fcmToken: fcmToken || null,
      },
    });

    console.log('✅ Nouvelle alerte créée en BDD:', alerte.id);

    const userName = user.adherent?.prenom || user.adherent?.nom || user.name || 'Adhérent';

    if (emailActif) {
      console.log('📧 Envoi email de confirmation en arrière-plan...');
      void Promise.resolve(this.emailService.sendConfirmationAlerteTrajet(
          user.email, userName, villeDepartNom, villeArriveeNom, rayon,
        ))
        .then(() => console.log('✅ Email de confirmation envoyé'))
        .catch((emailError) => console.warn('⚠️ Erreur envoi email:', emailError));
    }

    if (pushActif) {
      console.log('📱 Push activé — notifications envoyées à la création de mission');
    }

    console.log(`✅ Alerte trajet créée pour ${user.email} - ${villeDepartNom} → ${villeArriveeNom}`);
    console.log('🔔 ==========================================\n');
    return alerte as any;
  }

  /**
   * ✅ Vérifier alertes lors de création de mission
   */
  async checkAlertes(mission: any) {
    console.log('\n🔍 ========== VÉRIFICATION ALERTES MISSION ==========');
    console.log('Mission:', {
      id: mission.id,
      depart: `${mission.adresseDepart.villeNom} (${mission.adresseDepart.latitude}, ${mission.adresseDepart.longitude})`,
      arrivee: `${mission.adresseArrivee.villeNom} (${mission.adresseArrivee.latitude}, ${mission.adresseArrivee.longitude})`,
    });

    const summary = {
      totalAlertes: 0,
      matched: 0,
      dejaNotifiees: 0,
      emailsEnvoyes: 0,
      pushEnvoyes: 0,
      sansCanal: 0,
      pushSansToken: 0,
    };

    const disponibilite = await this.prisma.disponibiliteMission.findFirst({
      where: { missionId: mission.id },
    });

    const allAlertes = await this.prisma.alerteGeographique.findMany({
      where: { actif: true },
      include: { user: { include: { adherent: true } } },
      orderBy: { dateCreation: 'desc' },
    });

    // ✅ Dédupliquer par userId : garder uniquement l'alerte la plus récente par user
    //    pour éviter qu'un user avec 2 alertes (GEO + TRAJET) reçoive email + push
    const alertesByUser = new Map<number, typeof allAlertes[0]>();
    for (const alerte of allAlertes) {
      if (!alertesByUser.has(alerte.userId)) {
        alertesByUser.set(alerte.userId, alerte);
      }
    }
    const alertes = Array.from(alertesByUser.values());

    console.log(`\n📋 ${allAlertes.length} alerte(s) trouvée(s), ${alertes.length} après déduplication par user`);
    summary.totalAlertes = alertes.length;

    for (const alerte of alertes) {
      console.log(`\n--- Alerte #${alerte.id} ---`);
      console.log('Type:', alerte.type);
      console.log('User:', alerte.user.email);
      console.log(`Canal: email=${alerte.emailActif} push=${alerte.pushActif}`);

      if (!alerte.emailActif && !alerte.pushActif) {
        summary.sansCanal += 1;
        console.warn('⚠️ Aucun canal actif pour cette alerte: pas d’email ni push');
      }

      if (alerte.pushActif && !alerte.fcmToken) {
        summary.pushSansToken += 1;
        console.warn('⚠️ Push actif mais fcmToken absent: notification mobile impossible');
      }

      let match = false;

      if (alerte.type === TypeAlerte.GEOGRAPHIQUE) {
        console.log(`📍 GEO: ${alerte.villeNom} (rayon: ${alerte.rayon} km)`);

        const distanceDepart = this.geoService.calculateDistance(
          alerte.latitude, alerte.longitude,
          mission.adresseDepart.latitude, mission.adresseDepart.longitude,
        );
        const distanceArrivee = this.geoService.calculateDistance(
          alerte.latitude, alerte.longitude,
          mission.adresseArrivee.latitude, mission.adresseArrivee.longitude,
        );

        console.log(`   Distance départ: ${distanceDepart}`);
        console.log(`   Distance arrivée: ${distanceArrivee}`);
        console.log(`   Rayon alerte: ${alerte.rayon} km`);

        const geoMatch = distanceDepart <= alerte.rayon || distanceArrivee <= alerte.rayon;
        console.log(`   Geo match: ${geoMatch ? '✅' : '❌'}`);

        // ✅ Vérification dates pour GEOGRAPHIQUE aussi
        if (geoMatch && alerte.dateDepart && alerte.dateDepartMax && disponibilite) {
          console.log(`\n   📅 Vérification dates...`);
          const missionDateDebut = new Date(disponibilite.dateDebut);
          const missionDateDepartMax = new Date(disponibilite.dateDepartMax);
          const alerteDateDebut = new Date(alerte.dateDepart);
          const alerteDateFin = new Date(alerte.dateDepartMax);

          const dateMatch =
            missionDateDebut <= alerteDateFin &&
            missionDateDepartMax >= alerteDateDebut;

          console.log(`   Date match: ${dateMatch ? '✅' : '❌'}`);
          match = geoMatch && dateMatch;
        } else {
          match = geoMatch;
        }

        console.log(`   → Match final: ${match ? '✅' : '❌'}`);

      } else if (alerte.type === TypeAlerte.TRAJET) {
        console.log(`🚗 TRAJET: ${alerte.villeDepartNom} → ${alerte.villeArriveeNom} (rayon: ${alerte.rayon} km)`);

        const distanceDepart = this.geoService.calculateDistance(
          alerte.latitudeDepart, alerte.longitudeDepart,
          mission.adresseDepart.latitude, mission.adresseDepart.longitude,
        );
        const distanceArrivee = this.geoService.calculateDistance(
          alerte.latitudeArrivee, alerte.longitudeArrivee,
          mission.adresseArrivee.latitude, mission.adresseArrivee.longitude,
        );

        console.log(`   Distance départ: ${distanceDepart} (max: ${alerte.rayon})`);
        console.log(`   Distance arrivée: ${distanceArrivee} (max: ${alerte.rayon})`);

        const geoMatch = distanceDepart <= alerte.rayon && distanceArrivee <= alerte.rayon;
        console.log(`   Geo match: ${geoMatch ? '✅' : '❌'}`);

        if (geoMatch && alerte.dateDepart && alerte.dateDepartMax && disponibilite) {
          console.log(`\n   📅 Vérification dates...`);
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
        summary.matched += 1;
        console.log(`\n✅ MATCH! Notification à envoyer à ${alerte.user.email}`);

        const dejaNotifie = await this.prisma.notificationAlerte.findFirst({
          where: { alerteId: alerte.id, missionId: mission.id },
        });

        if (dejaNotifie) {
          summary.dejaNotifiees += 1;
          console.log(`⚠️ Déjà notifié le ${dejaNotifie.dateEnvoi}`);
          continue;
        }

        const userName =
          alerte.user.adherent?.prenom ||
          alerte.user.adherent?.nom ||
          alerte.user.name ||
          'Adhérent';

        let emailEnvoye = false;
        let pushEnvoye = false;

        try {
          if (alerte.emailActif) {
            try {
              if (alerte.type === TypeAlerte.GEOGRAPHIQUE) {
                await this.emailService.sendAlerteGeographique(
                  alerte.user.email, userName, alerte.villeNom, alerte.rayon, mission,
                );
              } else {
                await this.emailService.sendAlerteTrajet(
                  alerte.user.email, userName, alerte.villeDepartNom,
                  alerte.villeArriveeNom, alerte.rayon, mission,
                );
              }
              emailEnvoye = true;
              summary.emailsEnvoyes += 1;
              console.log('📧 ✅ Email envoyé!');
            } catch (emailErr) {
              console.warn(`📧 ⚠️ Erreur envoi email à ${alerte.user.email}:`, emailErr);
            }
          }

          if (alerte.pushActif && alerte.fcmToken) {
  try {
    console.log(`📱 Envoi push à: ${alerte.fcmToken.substring(0, 20)}...`);
    
    await this.notificationService.sendPushNotification(
      alerte.fcmToken,
      'Nouvelle mission disponible ! 🚗',
      alerte.type === TypeAlerte.GEOGRAPHIQUE
        ? `Mission près de ${alerte.villeNom} (${alerte.rayon}km)`
        : `Mission ${alerte.villeDepartNom} → ${alerte.villeArriveeNom}`,
      {
        missionId: mission.id.toString(),
        type: alerte.type,
        villeDepart: mission.adresseDepart.villeNom,
        villeArrivee: mission.adresseArrivee.villeNom,
        alerteId: alerte.id,
      }
    );
    
    pushEnvoye = true;
    summary.pushEnvoyes += 1;
    console.log('📱 ✅ Push envoyé avec succès!');
  } catch (pushErr: any) {
    console.warn(`📱 ⚠️ Erreur envoi push pour alerte ${alerte.id}:`, pushErr.message);
    
    // ✅ Si token invalide, désactiver le push pour cette alerte
    if (pushErr.code === 'messaging/invalid-registration-token' || 
        pushErr.message.includes('invalid-registration-token')) {
      console.warn(`🗑️ Token invalide, désactivation du push pour l'alerte ${alerte.id}`);
      try {
        await this.prisma.alerteGeographique.update({
          where: { id: alerte.id },
          data: { pushActif: false },
        });
      } catch (updateErr) {
        console.error('❌ Erreur désactivation push:', updateErr);
      }
    }
  }
}
 

          await this.prisma.notificationAlerte.create({
            data: {
              alerteId: alerte.id,
              missionId: mission.id,
              emailEnvoye,
              pushEnvoye,
              dateEnvoi: new Date(),
            },
          });
          console.log('✅ Notification enregistrée en BDD');
        } catch (error) {
          console.error('❌ Erreur notification:', error);
        }
      } else {
        console.log(`❌ Pas de match`);
      }
    }

    console.log('📊 Résumé alertes:', summary);
    console.log('\n🔍 ====================================\n');
    return summary;
  }

  async getAlertesByUser(userId: number) {
    return await this.prisma.alerteGeographique.findMany({
      where: { userId, actif: true },
      orderBy: { dateCreation: 'desc' },
    });
  }


  async updateFcmToken(userId: number, fcmToken: string) {
  console.log(`\n🔄 Mise à jour FCM Token pour utilisateur ${userId}`);
  console.log(`Token: ${fcmToken.substring(0, 20)}...`);
 
  // ✅ Valider le token
  if (!fcmToken || fcmToken.trim().length === 0) {
    throw new Error('FCM Token invalide');
  }
 
  try {
    // Vérifier si l'utilisateur a une alerte active
    const alerte = await this.prisma.alerteGeographique.findFirst({
      where: { userId, actif: true },
    });
 
    if (!alerte) {
      console.log(`⚠️ Aucune alerte active pour l'utilisateur ${userId}`);
      return { success: false, message: 'Aucune alerte active' };
    }
 
    // Mettre à jour le token
    const updated = await this.prisma.alerteGeographique.update({
      where: { id: alerte.id },
      data: { fcmToken },
    });
 
    console.log(`✅ Token mis à jour pour l'alerte ${alerte.id}`);
    return {
      success: true,
      alerteId: updated.id,
      message: 'Token FCM mis à jour',
    };
  } catch (error: any) {
    console.error(`❌ Erreur mise à jour token:`, error);
    throw error;
  }
}
 
/**
 * ✅ Récupérer toutes les alertes avec tokens pour un utilisateur
 */
async getAlertesByUserWithTokens(userId: number) {
  return await this.prisma.alerteGeographique.findMany({
    where: { userId, actif: true },
    select: {
      id: true,
      type: true,
      villeNom: true,
      villeDepartNom: true,
      villeArriveeNom: true,
      pushActif: true,
      emailActif: true,
      fcmToken: true,
      dateCreation: true,
    },
    orderBy: { dateCreation: 'desc' },
  });
}
 
/**
 * ✅ Valider tous les tokens Firebase
 */
async validateAllTokens() {
  console.log('\n🔍 Validation de tous les tokens FCM...');
 
  const alertes = await this.prisma.alerteGeographique.findMany({
    where: { pushActif: true, fcmToken: { not: null } },
  });
 
  const results = {
    total: alertes.length,
    valides: 0,
    invalides: 0,
    tokens: [] as any[],
  };
 
  for (const alerte of alertes) {
    if (!alerte.fcmToken) continue;
 
    try {
      const isValid = await this.notificationService.isTokenValid(alerte.fcmToken);
      
      if (isValid) {
        results.valides++;
      } else {
        results.invalides++;
        // Désactiver le push
        await this.prisma.alerteGeographique.update({
          where: { id: alerte.id },
          data: { pushActif: false },
        });
        console.log(`🗑️ Token invalide désactivé: ${alerte.id}`);
      }
 
      results.tokens.push({
        alerteId: alerte.id,
        valide: isValid,
      });
    } catch (error: any) {
      console.warn(`⚠️ Erreur validation token ${alerte.id}:`, error.message);
    }
  }
 
  console.log(`✅ Validation terminée: ${results.valides} valides, ${results.invalides} invalides`);
  return results;
}
 

  async getAlerteById(alerteId: string) {
    return await this.prisma.alerteGeographique.findUnique({
      where: { id: alerteId },
      include: {
        user: {
          select: {
            id: true, name: true, email: true,
            adherent: { select: { nom: true, prenom: true } },
          },
        },
      },
    });
  }

  async desactiverAlerte(userId: number) {
    return await this.prisma.alerteGeographique.updateMany({
      where: { userId, actif: true },
      data: { actif: false },
    });
  }

  async supprimerAlerte(alerteId: string) {
    return await this.prisma.alerteGeographique.delete({
      where: { id: alerteId },
    });
  }

  async activerAlerte(alerteId: string) {
    return await this.prisma.alerteGeographique.update({
      where: { id: alerteId },
      data: { actif: true },
    });
  }

  async modifierRayon(alerteId: string, rayon: number) {
    return await this.prisma.alerteGeographique.update({
      where: { id: alerteId },
      data: { rayon },
    });
  }

  async getStatsAlertes() {
    const [total, actives, geographiques, trajets] = await Promise.all([
      this.prisma.alerteGeographique.count(),
      this.prisma.alerteGeographique.count({ where: { actif: true } }),
      this.prisma.alerteGeographique.count({ where: { type: TypeAlerte.GEOGRAPHIQUE } }),
      this.prisma.alerteGeographique.count({ where: { type: TypeAlerte.TRAJET } }),
    ]);
    return { total, actives, inactives: total - actives, parType: { geographiques, trajets } };
  }

  async getNotificationsByUser(userId: number, limit: number = 50) {
    return await this.prisma.notificationAlerte.findMany({
      where: { alerte: { userId } },
      include: { alerte: true },
      orderBy: { dateCreation: 'desc' },
      take: limit,
    });
  }

  async checkNouvellesMissions(userId: number) {
    const alerte = await this.prisma.alerteGeographique.findFirst({
      where: { userId, actif: true },
    });

    if (!alerte) return [];

    const derniereVerification = await this.prisma.notificationAlerte.findFirst({
      where: { alerteId: alerte.id },
      orderBy: { dateCreation: 'desc' },
    });

    const missions = await this.prisma.mission.findMany({
      where: {
        dateCreation: { gt: derniereVerification?.dateCreation || new Date(0) },
      },
      include: { adresseDepart: true, adresseArrivee: true, vehicule: true, calculs: true },
    });

    const missionsInRadius = missions.filter((mission) => {
      if (alerte.type === TypeAlerte.GEOGRAPHIQUE) {
        const distanceDepart = this.geoService.calculateDistance(
          alerte.latitude, alerte.longitude,
          mission.adresseDepart.latitude, mission.adresseDepart.longitude,
        );
        const distanceArrivee = this.geoService.calculateDistance(
          alerte.latitude, alerte.longitude,
          mission.adresseArrivee.latitude, mission.adresseArrivee.longitude,
        );
        return distanceDepart <= alerte.rayon || distanceArrivee <= alerte.rayon;
      } else {
        const distanceDepart = this.geoService.calculateDistance(
          alerte.latitudeDepart, alerte.longitudeDepart,
          mission.adresseDepart.latitude, mission.adresseDepart.longitude,
        );
        const distanceArrivee = this.geoService.calculateDistance(
          alerte.latitudeArrivee, alerte.longitudeArrivee,
          mission.adresseArrivee.latitude, mission.adresseArrivee.longitude,
        );
        return distanceDepart <= alerte.rayon && distanceArrivee <= alerte.rayon;
      }
    });

    return missionsInRadius as any;
  }
}
