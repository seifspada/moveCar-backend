// src/email/email.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
    rejectUnauthorized: false,  // <-- AJOUTEZ CETTE LIGNE
  },
    });
  }

  // Méthode générique pour tous types d'emails
  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }) {
    return await this.transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
      ...options,
    });
  }

  // Méthode spécifique pour reset password


async sendPasswordResetCode(email: string, code: string): Promise<void> {
  await this.transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Code de réinitialisation de mot de passe',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Voici votre code de vérification :</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p>Ce code expire dans <strong>1 heure</strong>.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      </div>
    `,
  });
}
  // D'autres méthodes pour différents types d'emails
  async sendWelcomeEmail(email: string, name: string) {
    return this.sendMail({
      to: email,
      subject: 'Bienvenue sur Revolution',
      html: `<h2>Bienvenue ${name}!</h2>`,
    });
  }

  async sendMissionNotification(email: string, missionDetails: any) {
    return this.sendMail({
      to: email,
      subject: 'Nouvelle mission disponible',
      html: `<p>Une nouvelle mission est disponible...</p>`,
    });
  }

// ✅ Email adherent: demande reçue
async sendDemandeRecueAdherent(data: {
  email: string;
  nom: string;
  prenom?: string;
}) {
  const nomComplet = data.prenom ? `${data.prenom} ${data.nom}` : data.nom;
  
  const subject = "✅ Demande d'adhésion reçue - Revolution";
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🚗 Revolution</h1>
        <p style="color: #fed7aa; margin: 10px 0 0 0;">Demande d'adhésion</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #ea580c; margin-top: 0;">Demande bien reçue ✅</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Bonjour <strong>${nomComplet}</strong>,
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Nous avons bien reçu votre demande d'adhésion à Revolution. 
          Nous sommes ravis de votre intérêt pour nos services de transport !
        </p>
        
        <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border-left: 4px solid #ea580c; padding: 20px; margin: 25px 0; border-radius: 8px;">
          <h3 style="color: #ea580c; margin-top: 0; font-size: 18px;">
            📋 Prochaines étapes
          </h3>
          <ol style="color: #1f2937; line-height: 1.8; margin: 10px 0; padding-left: 20px; font-size: 15px;">
            <li>Notre équipe va <strong>examiner votre demande</strong></li>
            <li>Vous recevrez un <strong>email de confirmation</strong> sous 24-48h</li>
            <li>Activation de votre compte et <strong>accès à la plateforme</strong></li>
          </ol>
        </div>
        
        <div style="background-color: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 25px 0;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            💡 <strong>Bon à savoir :</strong> En attendant la validation, vous pouvez préparer 
            vos documents d'identité et vérifier que vos informations de contact sont correctes.
          </p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 14px;">
            Des questions ? Notre équipe est à votre disposition
          </p>
          <p style="margin: 5px 0; color: #1f2937; font-size: 15px;">
            📧 <strong>${process.env.EMAIL_USER || 'contact@revolution.tn'}</strong>
          </p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
          Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.
        </p>
        
        <p style="font-size: 16px; color: #374151; margin-top: 20px;">
          Cordialement,<br>
          <strong style="color: #ea580c;">L'équipe Revolution</strong>
        </p>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          Cet email a été envoyé automatiquement, merci de ne pas y répondre directement.
        </p>
      </div>
    </div>
  `;

  return this.sendMail({
    to: data.email,
    subject,
    html,
    text: `Bonjour ${nomComplet}, nous avons bien reçu votre demande d'adhésion. Notre équipe va l'examiner et vous recevrez une confirmation sous 24-48h.`
  });
}
async sendNouvelleDemandeAdmin(data: {
  email: string;
  nom: string;
  prenom?: string;
  telephone?: string;
  typeAdhesion?: string;
  dateInscription?: Date;
}) {
  const adminTo = process.env.EMAIL_USER;

  if (!adminTo) {
    throw new Error('EMAIL_USER non défini');
  }

  const nomComplet = data.prenom ? `${data.prenom} ${data.nom}` : data.nom;
  const dateFormatee = data.dateInscription 
    ? new Date(data.dateInscription).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

  const subject = "🔔 Nouvelle demande d'adhésion - Revolution";
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔔 Notification Admin</h1>
        <p style="color: #bfdbfe; margin: 10px 0 0 0;">Nouvelle demande d'adhésion</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1d4ed8; margin-top: 0;">Nouvelle demande reçue</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Une nouvelle demande d'adhésion vient d'être soumise sur la plateforme Revolution.
        </p>
        
        <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 8px;">
          <h3 style="color: #1e40af; margin-top: 0; font-size: 18px;">
            📋 Informations du demandeur
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;">
                <strong>👤 Nom complet :</strong>
              </td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 15px;">
                ${nomComplet}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                <strong>📧 Email :</strong>
              </td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 15px;">
                <a href="mailto:${data.email}" style="color: #3b82f6; text-decoration: none;">
                  ${data.email}
                </a>
              </td>
            </tr>
            ${data.telephone ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                <strong>📞 Téléphone :</strong>
              </td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 15px;">
                ${data.telephone}
              </td>
            </tr>
            ` : ''}
            
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                <strong>🕒 Date de demande :</strong>
              </td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 15px;">
                ${dateFormatee}
              </td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 25px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            ⚠️ <strong>Action requise :</strong> Veuillez examiner cette demande et procéder 
            à la validation ou au rejet dans le tableau de bord d'administration.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.ADMIN_DASHBOARD_URL || 'https://admin.revolution.tn'}/demandes" 
             style="background-color: #f75002; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
            📊 Voir dans le tableau de bord
          </a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px; text-align: center;">
          Notification automatique du système Revolution
        </p>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          Cet email a été envoyé automatiquement par le système Revolution.
        </p>
      </div>
    </div>
  `;

  return this.sendMail({
    to: adminTo,
    subject,
    html,
    text: `Nouvelle demande d'adhésion reçue de ${nomComplet} (${data.email}). Consultez le tableau de bord pour plus de détails.`
  });
}

// Ajouter cette méthode dans email.service.ts

async sendProfileCreationLink(email: string, nom: string, profileUrl: string) {
  const subject = '✅ Demande validée - Créez votre profil';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">🎉 Félicitations ${nom} !</h2>
      
      <p>Votre demande d'adhésion a été <strong>validée</strong> par notre équipe.</p>
      
      <p>Pour finaliser votre inscription, veuillez créer votre profil en cliquant sur le bouton ci-dessous :</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${profileUrl}" 
           style="background-color: #ea580c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
          Créer mon profil
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        <strong>Note importante :</strong> Ce lien est valide pendant <strong>7 jours</strong>.
      </p>
      
      <p style="color: #666; font-size: 14px;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
        <a href="${profileUrl}">${profileUrl}</a>
      </p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
      
      <p style="color: #999; font-size: 12px;">
        Cet email a été envoyé automatiquement, merci de ne pas y répondre.
      </p>
    </div>
  `;

  await this.transporter.sendMail({
    from: process.env.EMAIL_FROM_NAME + ' <' + process.env.EMAIL_USER + '>', // ✅ Ou directement
    to: email,
    subject,
    html,
  });
}
//email envoie pour la partenaire :
// src/email/email.service.ts
async sendWelcomeAdherent(data: {
  email: string;
  nom: string;
  prenom: string;
}) {
  const nomComplet = `${data.prenom} ${data.nom}`;
  
  const subject = '🎉 Bienvenue chez Revolution - Votre compte est activé !';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Bienvenue !</h1>
        <p style="color: #d1fae5; margin: 10px 0 0 0;">Votre compte Revolution est activé</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #16a34a; margin-top: 0;">Félicitations ${nomComplet} !</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Nous sommes ravis de vous accueillir dans la <strong>communauté Revolution</strong> ! 
          Votre compte a été créé avec succès et vous pouvez maintenant profiter de tous nos services.
        </p>
        
        <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-left: 4px solid #16a34a; padding: 20px; margin: 25px 0; border-radius: 8px;">
          <h3 style="color: #15803d; margin-top: 0; font-size: 18px;">
            ✅ Votre compte est maintenant actif
          </h3>
          <p style="margin: 8px 0; color: #166534; font-size: 15px;">
            <strong>📧 Email :</strong> ${data.email}
          </p>
          <p style="margin: 8px 0; color: #166534; font-size: 15px;">
            <strong>👤 Nom :</strong> ${nomComplet}
          </p>
        </div>
        
        <div style="background-color: #eff6ff; border: 1px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #1e40af; margin-top: 0; font-size: 18px;">
            🚀 Commencez dès maintenant
          </h3>
          <ol style="color: #1e3a8a; line-height: 1.8; margin: 10px 0; padding-left: 20px; font-size: 15px;">
            <li><strong>Connectez-vous</strong> à votre espace personnel</li>
            <li><strong>Complétez votre profil</strong> pour optimiser votre expérience</li>
            <li><strong>Découvrez les missions</strong> disponibles sur la plateforme</li>
            <li><strong>Configurez vos préférences</strong> de notification</li>
          </ol>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/auth/login" 
             style="background-color: #16a34a; color: white; padding: 14px 35px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px;">
            🔐 Se connecter maintenant
          </a>
        </div>
        
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 25px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            💡 <strong>Astuce :</strong> Téléchargez notre application mobile pour recevoir 
            les notifications de missions en temps réel et gérer vos courses où que vous soyez.
          </p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #1f2937; margin-top: 0; font-size: 16px;">
            📱 Téléchargez l'application mobile
          </h3>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <a href="https://apps.apple.com/..." style="display: inline-block;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" 
                   alt="App Store" 
                   style="height: 40px; border-radius: 5px;" />
            </a>
            <a href="https://play.google.com/..." style="display: inline-block;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                   alt="Google Play" 
                   style="height: 40px; border-radius: 5px;" />
            </a>
          </div>
        </div>
        
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #1f2937; margin-top: 0; font-size: 16px;">
            📞 Besoin d'aide ?
          </h3>
          <p style="margin: 8px 0; color: #4b5563; font-size: 14px;">
            Notre équipe est à votre disposition pour répondre à toutes vos questions :
          </p>
          <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
            <li>📧 Email : <a href="mailto:${process.env.EMAIL_USER}" style="color: #16a34a; text-decoration: none;">${process.env.EMAIL_USER}</a></li>
            
          </ul>
        </div>
        
        <div style="background-color: #fef2f2; border: 1px solid #fca5a5; padding: 15px; border-radius: 8px; margin: 25px 0;">
          <p style="margin: 0; color: #991b1b; font-size: 13px;">
            ⚠️ <strong>Sécurité :</strong> Ne partagez jamais votre mot de passe. 
            Revolution ne vous demandera jamais vos identifiants par email ou par téléphone.
          </p>
        </div>
        
        <p style="font-size: 16px; color: #374151; margin-top: 30px; text-align: center;">
          Bon travail avec Revolution !<br>
          <strong style="color: #ea580c;">L'équipe Revolution</strong>
        </p>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
        <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px;">
          Vous recevez cet email car vous avez créé un compte sur Revolution.
        </p>
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          © ${new Date().getFullYear()} Revolution. Tous droits réservés.
        </p>
      </div>
    </div>
  `;

  return this.sendMail({
    to: data.email,
    subject,
    html,
    text: `Bienvenue ${nomComplet} ! Votre compte Revolution est activé. Connectez-vous dès maintenant : ${process.env.FRONTEND_URL}/auth/login`
  });
}

// ==========================================
// 📧 EMAILS POUR PARTENAIRES
// ==========================================

/**
 * ✅ Email partenaire: confirmation de demande reçue avec RDV
 */
async sendDemandePartenaireConfirmation(data: {
  email: string;
  nom: string;
  entite: string;
  typeRdv: string;
  dateRdv: Date;
  creneau: string;
}) {
  const dateFormatee = new Date(data.dateRdv).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const typeRdvTexte = data.typeRdv === 'TELEPHONIQUE' 
    ? '📞 Rendez-vous téléphonique' 
    : '🏢 Rendez-vous physique';

  const subject = '✅ Demande de partenariat reçue - Revolution';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🤝 Revolution</h1>
        <p style="color: #fed7aa; margin: 10px 0 0 0;">Demande de partenariat</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #ea580c; margin-top: 0;">Demande bien reçue ✅</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Bonjour <strong>${data.nom}</strong>,
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Nous avons bien reçu votre demande de partenariat pour <strong>${data.entite}</strong>.
        </p>
        
        <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border-left: 4px solid #ea580c; padding: 20px; margin: 25px 0; border-radius: 8px;">
          <h3 style="color: #ea580c; margin-top: 0; font-size: 18px;">
            ${typeRdvTexte}
          </h3>
          <p style="margin: 8px 0; font-size: 16px; color: #1f2937;">
            <strong>📅 Date :</strong> ${dateFormatee}
          </p>
          <p style="margin: 8px 0; font-size: 16px; color: #1f2937;">
            <strong>🕒 Créneau :</strong> ${data.creneau}
          </p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #1f2937; margin-top: 0; font-size: 16px;">
            📋 Prochaines étapes :
          </h3>
          <ol style="color: #000000; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
            <li>Notre équipe commerciale vous contactera pour <strong>confirmer le rendez-vous</strong></li>
            <li>Étude personnalisée de vos <strong>besoins en transport</strong></li>
            <li>Proposition d'une <strong>solution adaptée</strong> à votre entreprise</li>
          </ol>
        </div>
        
        <div style="background-color: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 25px 0;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            💡 <strong>Conseil :</strong> Préparez vos informations sur le nombre de déplacements, 
            zones couvertes et besoins spécifiques pour optimiser notre échange.
          </p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
          Si vous avez des questions avant le rendez-vous, n'hésitez pas à nous contacter.
        </p>
        
        <p style="font-size: 16px; color: #374151; margin-top: 20px;">
          Cordialement,<br>
          <strong style="color: #ea580c;">L'équipe Revolution</strong>
        </p>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          Cet email a été envoyé automatiquement, merci de ne pas y répondre directement.
        </p>
      </div>
    </div>
  `;

  return this.sendMail({
    to: data.email,
    subject,
    html,
    text: `Bonjour ${data.nom}, nous avons bien reçu votre demande de partenariat. RDV prévu le ${dateFormatee} à ${data.creneau}.`
  });
}

/**
 * 🔔 Email admin: notification nouvelle demande partenaire
 */
async sendNotificationNouvelleDemandePartenaire(data: {
  nom: string;
  entite: string;
  email: string;
  telephone: string;
  statut: string;
  typeRdv: string;
  dateRdv: Date;
  creneau: string;
  nombreDeplacements?: number;
  nombreAgences?: number;
}) {
  const adminEmail = process.env.EMAIL_USER;

  if (!adminEmail) {
    throw new Error('EMAIL_USER non défini pour notification admin');
  }

  const dateFormatee = new Date(data.dateRdv).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const typeRdvIcon = data.typeRdv === 'TELEPHONIQUE' ? '📞' : '🏢';
  const typeRdvTexte = data.typeRdv === 'TELEPHONIQUE' ? 'Téléphonique' : 'Physique';

  const subject = `🔔 Nouvelle demande partenaire - ${data.entite}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Nouvelle demande de partenariat</h1>
      </div>
      
      <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
        
        <!-- Informations du contact -->
        <div style="background-color: #f8fafc; border-left: 4px solid #ea580c; padding: 20px; margin-bottom: 20px; border-radius: 5px;">
          <h2 style="color: #ea580c; margin-top: 0; font-size: 18px;">👤 Informations du contact</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 40%;"><strong>Nom :</strong></td>
              <td style="padding: 8px 0; color: #1e293b;">${data.nom}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Entité :</strong></td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">${data.entite}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Statut :</strong></td>
              <td style="padding: 8px 0; color: #1e293b;">${data.statut.replace(/_/g, ' ')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Email :</strong></td>
              <td style="padding: 8px 0;">
                <a href="mailto:${data.email}" style="color: #3b82f6; text-decoration: none;">${data.email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Téléphone :</strong></td>
              <td style="padding: 8px 0;">
                <a href="tel:${data.telephone}" style="color: #3b82f6; text-decoration: none;">${data.telephone}</a>
              </td>
            </tr>
          </table>
        </div>

        <!-- Informations business -->
        ${data.nombreDeplacements || data.nombreAgences ? `
        <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin-bottom: 20px; border-radius: 5px;">
          <h2 style="color: #16a34a; margin-top: 0; font-size: 18px;">📊 Informations business</h2>
          <table style="width: 100%; border-collapse: collapse;">
            ${data.nombreDeplacements ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 40%;"><strong>Déplacements/mois :</strong></td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">${data.nombreDeplacements}</td>
            </tr>
            ` : ''}
            ${data.nombreAgences ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Nombre d'agences :</strong></td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">${data.nombreAgences}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        ` : ''}

        <!-- Rendez-vous prévu -->
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 20px; border-radius: 5px;">
          <h2 style="color: #d97706; margin-top: 0; font-size: 18px;">${typeRdvIcon} Rendez-vous prévu</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 40%;"><strong>Type :</strong></td>
              <td style="padding: 8px 0; color: #1e293b;">${typeRdvTexte}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Date :</strong></td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">${dateFormatee}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Créneau :</strong></td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">${data.creneau}</td>
            </tr>
          </table>
        </div>

        <!-- Actions -->
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/admin/demandes-partenaire" 
             style="background-color: #ea580c; color: white; padding: 15px 35px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(234, 88, 12, 0.3);">
            📋 Voir la demande
          </a>
        </div>

        <p style="margin-top: 25px; padding: 15px; background-color: #fef2f2; border-radius: 8px; color: #991b1b; font-size: 14px; border: 1px solid #fecaca;">
          ⚠️ <strong>Action requise :</strong> Confirmer le rendez-vous dans les 24h
        </p>
      </div>
      
      <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-radius: 0 0 10px 10px;">
        <p style="margin: 0; color: #9ca3af; font-size: 11px;">
          Email envoyé automatiquement par le système Revolution
        </p>
      </div>
    </div>
  `;

  return this.sendMail({
    to: adminEmail,
    subject,
    html,
    text: `Nouvelle demande partenaire: ${data.nom} (${data.entite}) - RDV ${typeRdvTexte} le ${dateFormatee} à ${data.creneau}`
  });
}

/**
 * ✅ Email partenaire: confirmation de rendez-vous par l'équipe
 */
async sendConfirmationRendezvousPartenaire(data: {
  email: string;
  nom: string;
  entite: string;
  typeRdv: string;
  dateRdv: Date;
  creneau: string;
  lienVisio?: string;
  adresse?: string;
}) {
  const dateFormatee = new Date(data.dateRdv).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const typeRdvTexte = data.typeRdv === 'TELEPHONIQUE' ? 'téléphonique' : 'physique';
  const subject = `✅ Confirmation de votre rendez-vous ${typeRdvTexte} - ${dateFormatee}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">✅ Rendez-vous confirmé</h1>
      </div>
      
      <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Bonjour <strong>${data.nom}</strong>,
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Votre rendez-vous ${typeRdvTexte} avec notre équipe commerciale est confirmé.
        </p>
        
        <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border: 2px solid #16a34a; padding: 25px; margin: 25px 0; border-radius: 10px; text-align: center;">
          <h2 style="color: #15803d; margin: 0 0 15px 0; font-size: 20px;">
            ${data.typeRdv === 'TELEPHONIQUE' ? '📞' : '🏢'} Rendez-vous ${typeRdvTexte}
          </h2>
          <p style="margin: 8px 0; font-size: 18px; color: #166534;">
            <strong>📅 ${dateFormatee}</strong>
          </p>
          <p style="margin: 8px 0; font-size: 18px; color: #166534;">
            <strong>🕒 ${data.creneau}</strong>
          </p>
          ${data.typeRdv === 'TELEPHONIQUE' && data.lienVisio ? `
          <div style="margin-top: 20px;">
            <a href="${data.lienVisio}" 
               style="background-color: #16a34a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              🎥 Rejoindre la visio
            </a>
          </div>
          ` : ''}
          ${data.typeRdv === 'PHYSIQUE' && data.adresse ? `
          <div style="margin-top: 15px; padding: 15px; background-color: white; border-radius: 8px;">
            <p style="margin: 0; color: #166534; font-size: 14px;">
              <strong>📍 Adresse :</strong><br>
              ${data.adresse}
            </p>
          </div>
          ` : ''}
        </div>
        
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            💡 <strong>Rappel :</strong> Nous discuterons de vos besoins en transport, 
            zones d'activité et modalités de partenariat.
          </p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 25px;">
          En cas d'empêchement, merci de nous prévenir au moins 24h à l'avance.
        </p>
        
        <p style="font-size: 16px; color: #374151; margin-top: 20px;">
          À très bientôt,<br>
          <strong style="color: #ea580c;">L'équipe Revolution</strong>
        </p>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          Cet email a été envoyé automatiquement.
        </p>
      </div>
    </div>
  `;

  return this.sendMail({
    to: data.email,
    subject,
    html,
    text: `Votre rendez-vous ${typeRdvTexte} est confirmé pour le ${dateFormatee} à ${data.creneau}.`
  });
}

/**
 * 📧 Email partenaire: validation et lien création profil
 */
async sendPartenaireValidationLink(
  email: string, 
  nom: string, 
  entite: string,
  profileUrl: string
) {
  const subject = '✅ Partenariat validé - Créez votre compte';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Bienvenue chez Revolution !</h1>
      </div>
      
      <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #16a34a; margin-top: 0;">Félicitations ${nom} !</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Nous sommes ravis de vous annoncer que votre partenariat avec <strong>Revolution</strong> 
          est officiellement <strong style="color: #16a34a;">validé</strong> ! 🎊
        </p>

        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Votre entreprise <strong>${entite}</strong> rejoint notre réseau de partenaires de confiance.
        </p>
        
        <div style="background-color: #f0fdf4; border: 2px solid #16a34a; padding: 20px; margin: 25px 0; border-radius: 8px;">
          <p style="margin: 0 0 15px 0; color: #15803d; font-size: 16px;">
            <strong>🚀 Prochaine étape :</strong> Créez votre compte partenaire
          </p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${profileUrl}" 
               style="background-color: #ea580c; color: white; padding: 15px 35px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(234, 88, 12, 0.3); font-size: 16px;">
              🔐 Créer mon compte partenaire
            </a>
          </div>
        </div>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 25px 0; border-radius: 5px;">
          <p style="margin: 0; color: #991b1b; font-size: 14px;">
            ⏰ <strong>Important :</strong> Ce lien est valide pendant <strong>7 jours</strong>. 
            Après ce délai, vous devrez contacter notre support.
          </p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <p style="margin: 0 0 10px 0; color: #1f2937; font-weight: bold;">
            Une fois votre compte créé, vous pourrez :
          </p>
          <ul style="color: #4b5563; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
            <li>Recevoir et gérer les missions de transport</li>
            <li>Consulter votre historique d'activité</li>
            <li>Gérer vos documents et certifications</li>
            <li>Accéder à votre tableau de bord partenaire</li>
          </ul>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 25px; line-height: 1.6;">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
          <a href="${profileUrl}" style="color: #3b82f6; word-break: break-all;">${profileUrl}</a>
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        
        <p style="font-size: 16px; color: #374151;">
          Bienvenue dans l'équipe !<br>
          <strong style="color: #ea580c;">L'équipe Revolution</strong>
        </p>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          Cet email a été envoyé automatiquement, merci de ne pas y répondre.
        </p>
      </div>
    </div>
  `;

  return this.sendMail({
    to: email,
    subject,
    html,
    text: `Félicitations ${nom} ! Votre partenariat est validé. Créez votre compte : ${profileUrl}`
  });
}

/**
 * ❌ Email partenaire: demande refusée
 */
async sendPartenaireDemandeRefusee(
  email: string, 
  nom: string, 
  entite: string,
  motif?: string
) {
  const subject = 'Concernant votre demande de partenariat';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1f2937; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Revolution</h1>
      </div>
      
      <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Bonjour <strong>${nom}</strong>,
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Nous vous remercions pour l'intérêt que vous portez à <strong>Revolution</strong> 
          et pour votre demande de partenariat concernant <strong>${entite}</strong>.
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Après étude attentive de votre dossier, nous sommes au regret de vous informer 
          que nous ne pouvons pas donner suite favorable à votre demande pour le moment.
        </p>
        
        ${motif ? `
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 25px 0; border-radius: 5px;">
          <p style="margin: 0; color: #991b1b; font-size: 14px;">
            <strong>Raison :</strong> ${motif}
          </p>
        </div>
        ` : ''}
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Cette décision ne remet pas en cause la qualité de vos services. 
          N'hésitez pas à nous recontacter ultérieurement.
        </p>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 25px;">
          Pour toute question, notre équipe reste à votre disposition.
        </p>
        
        <p style="font-size: 16px; color: #374151; margin-top: 25px;">
          Cordialement,<br>
          <strong>L'équipe Revolution</strong>
        </p>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          Cet email a été envoyé automatiquement.
        </p>
      </div>
    </div>
  `;

  return this.sendMail({
    to: email,
    subject,
    html,
    text: `Bonjour ${nom}, concernant votre demande de partenariat pour ${entite}...`
  });
}


}
