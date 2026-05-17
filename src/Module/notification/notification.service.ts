// src/Module/notification/notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  /**
   * ✅ Envoyer notification push avec données
   */
  async sendPushNotification(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<string> {
    // ✅ Validation du token
    if (!fcmToken || fcmToken.trim().length === 0) {
      throw new Error('FCM Token invalide ou manquant');
    }

    try {
      this.logger.log(`📱 Envoi push à token: ${fcmToken.substring(0, 20)}...`);

      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            channelId: 'high_importance_channel',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              'mutable-content': 1,
              'content-available': 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: '/logo.png',
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`✅ Push envoyé avec succès: ${response}`);
      return response;
    } catch (error: any) {
      this.logger.error(`❌ Erreur envoi push: ${error.message}`);
      
      // ✅ Vérifier si c'est un token invalide
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        this.logger.warn(`⚠️ Token invalide/expiré: ${fcmToken.substring(0, 20)}...`);
      }
      
      throw error;
    }
  }

  /**
   * ✅ Envoyer notifications en batch (plusieurs tokens)
   */
  async sendMultiplePushNotifications(
    fcmTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<any> {
    if (!fcmTokens || fcmTokens.length === 0) {
      this.logger.warn('⚠️ Aucun token FCM fourni');
      return { success: 0, failure: 0 };
    }

    const validTokens = fcmTokens.filter(token => token && token.trim().length > 0);
    
    if (validTokens.length === 0) {
      this.logger.warn('⚠️ Aucun token valide après filtrage');
      return { success: 0, failure: 0 };
    }

    try {
      this.logger.log(`📱 Envoi batch à ${validTokens.length} tokens`);

      const message: admin.messaging.MulticastMessage = {
        tokens: validTokens,
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(`✅ Batch envoyé: ${response.successCount} succès, ${response.failureCount} échecs`);
      
      return {
        success: response.successCount,
        failure: response.failureCount,
        details: response.responses,
      };
    } catch (error: any) {
      this.logger.error(`❌ Erreur envoi batch: ${error.message}`);
      throw error;
    }
  }

  /**
   * ✅ Tester si un token est valide
   */
  async isTokenValid(fcmToken: string): Promise<boolean> {
    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: 'Test',
          body: 'Test de validité du token',
        },
      };

      await admin.messaging().send(message);
      return true;
    } catch (error: any) {
      if (error.code === 'messaging/invalid-registration-token') {
        return false;
      }
      throw error;
    }
  }
}