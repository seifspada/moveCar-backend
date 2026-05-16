import { Injectable, OnModuleInit } from '@nestjs/common';
const SibApiV3Sdk = require('@getbrevo/brevo');

@Injectable()
export class EmailService implements OnModuleInit {
  private apiInstance: any;

  onModuleInit() {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    console.log('📧 Brevo API initialisée');
    console.log('   from_name:', process.env.EMAIL_FROM_NAME);
    console.log('   sender:', process.env.ADMIN_EMAIL);
    console.log('   api_key défini:', !!process.env.BREVO_API_KEY);
  }

  async sendMail(options: { to: string; subject: string; html: string; text?: string }) {
    console.log('\n📧 ========== SENDMAIL APPELÉE ==========');
    console.log('📧 to:', options.to);
    console.log('📧 subject:', options.subject);

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: options.to }];
    sendSmtpEmail.sender = { name: process.env.EMAIL_FROM_NAME || 'MoveCar', email: process.env.ADMIN_EMAIL };
    sendSmtpEmail.subject = options.subject;
    sendSmtpEmail.htmlContent = options.html;
    sendSmtpEmail.textContent = options.text || '';

    try {
      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('✅ Email envoyé via Brevo API:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ Erreur Brevo API:', error);
      throw error;
    }
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
          <ol style="color: #000000; line-height: 1.8; margin: 10px 0; padding-left: 20px; font-size: 15px;">
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



async sendAcceptationPartenaireAvecProfil(data: {
  email: string;
  nom: string;
  entite: string;
  profileUrl: string;
  dateExpiration: Date;
  dateSignatureContrat: Date;
  dateFinContrat: Date;
  contratPath: string;
  contratName: string;
  codePartenaire: string;
}) {
  const subject = '🎉 Votre partenariat est accepté';

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .code { font-size: 20px; font-weight: bold; letter-spacing: 3px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Félicitations ${data.nom}</h1>
        </div>

        <div class="content">
          <p>Votre demande de partenariat pour <strong>${data.entite}</strong> a été acceptée.</p>

          <div class="info-box">
            <h3>🔐 Votre code partenaire</h3>
            <p>Veuillez conserver ce code, il pourra être utilisé pour votre identification ou pour des opérations spécifiques :</p>
            <p class="code">${data.codePartenaire}</p>
          </div>

          <div class="info-box">
            <h3>📄 Contrat de partenariat</h3>
            <p>
              Date de signature : ${new Date(data.dateSignatureContrat).toLocaleDateString('fr-FR')}<br/>
              Date de fin : ${new Date(data.dateFinContrat).toLocaleDateString('fr-FR')}
            </p>
            <p>Le contrat est joint à cet email au format PDF.</p>
          </div>

          <h3>👤 Créez votre profil partenaire</h3>
          <p>Pour accéder à votre espace partenaire, cliquez sur le bouton ci-dessous :</p>

          <div style="text-align: center;">
            <a href="${data.profileUrl}" class="button">Créer mon profil partenaire</a>
          </div>

          <p style="color: #e74c3c; font-weight: bold;">
            Ce lien est valable jusqu'au ${data.dateExpiration.toLocaleDateString('fr-FR')} à
            ${data.dateExpiration.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.
          </p>

          <p>Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
          <p style="word-break: break-all; font-size: 12px; color: #666;">${data.profileUrl}</p>
        </div>

        <div class="footer">
          <p>Cet email est automatique, merci de ne pas y répondre.</p>
          <p>&copy; ${new Date().getFullYear()} Votre Entreprise.</p>
        </div>
      </div>
    </body>
    </html>
  `;

await this.transporter.sendMail({
  from: {
    name: process.env.EMAIL_FROM_NAME,   // "Revolution"
    address: process.env.SMTP_FROM,      // ton email technique
  },
  to: data.email,
  subject,
  html,
  attachments: [
    {
      filename: data.contratName,
      path: data.contratPath,
      contentType: 'application/pdf',
    },
  ],
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


// src/Module/email/email.service.ts

/**
 * 🚨 Email alerte géographique (Type 1) : Mission autour d'une ville
 */
// src/Module/email/email.service.ts

async sendConfirmationAlerteGeographique(
  userEmail: string,
  userName: string,
  villeNom: string,
  rayon: number,
) {
  console.log('\n📨 ========== FONCTION EMAIL APPELÉE ==========');
  console.log('📨 Paramètre userEmail reçu:', userEmail);  // ✅ REGARDE CE LOG
  console.log('📨 Paramètre userName reçu:', userName);
  console.log('📨 Paramètre villeNom reçu:', villeNom);
  console.log('📨 Paramètre rayon reçu:', rayon);

  const subject = '✅ Votre alerte géographique a été créée';

  const html = `...`;  // Ton template HTML

  console.log('📬 Appel sendMail avec:');
  console.log('   to:', userEmail);  // ✅ REGARDE CE LOG
  console.log('   subject:', subject);

  const result = await this.sendMail({
    to: userEmail,
    subject,
    html,
    text: `Votre alerte géographique autour de ${villeNom} (${rayon} km) a été créée.`,
  });

  console.log('📨 ==============================================\n');

  return result;
}

  /**
   * ✅ Email de confirmation - Alerte trajet créée
   */
  async sendConfirmationAlerteTrajet(
    userEmail: string,
    userName: string,
    villeDepartNom: string,
    villeArriveeNom: string,
    rayon: number,
  ) {
    const subject = '✅ Votre alerte trajet a été créée';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✅ Alerte Activée</h1>
          <p style="color: #ddd6fe; margin: 10px 0 0 0;">Alerte trajet</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #7c3aed; margin-top: 0;">Votre alerte trajet est active ! 🎉</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            Bonjour <strong>${userName}</strong>,
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            Parfait ! Vous recevrez désormais un email automatique dès qu'une mission correspondra 
            à votre trajet entre <strong>${villeDepartNom}</strong> et <strong>${villeArriveeNom}</strong>.
          </p>
          
          <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border: 2px solid #8b5cf6; padding: 25px; margin: 25px 0; border-radius: 10px; text-align: center;">
            <h3 style="color: #6d28d9; margin: 0 0 15px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
              🔔 Trajet surveillé
            </h3>
            <div style="font-size: 24px; font-weight: bold; color: #1f2937; margin: 15px 0;">
              ${villeDepartNom} <span style="color: #8b5cf6; font-size: 28px;">→</span> ${villeArriveeNom}
            </div>
            <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 14px;">
              Rayon de flexibilité : <strong>±${rayon} km</strong> autour de chaque ville
            </p>
          </div>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #8b5cf6; padding: 25px; margin: 25px 0; border-radius: 8px;">
            <h3 style="color: #6d28d9; margin-top: 0; font-size: 18px;">
              ⚙️ Paramètres de votre alerte
            </h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px; width: 40%;">
                  <strong>🚀 Départ :</strong>
                </td>
                <td style="padding: 12px 0; color: #1f2937; font-size: 15px; font-weight: 600;">
                  ${villeDepartNom} (±${rayon} km)
                </td>
              </tr>
              <tr style="background-color: rgba(255, 255, 255, 0.5);">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">
                  <strong>🎯 Arrivée :</strong>
                </td>
                <td style="padding: 12px 0; color: #1f2937; font-size: 15px; font-weight: 600;">
                  ${villeArriveeNom} (±${rayon} km)
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">
                  <strong>🔔 Statut :</strong>
                </td>
                <td style="padding: 12px 0; color: #16a34a; font-size: 15px; font-weight: 600;">
                  ✅ Active
                </td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; border-radius: 5px; margin: 25px 0;">
            <h4 style="margin: 0 0 10px 0; color: #166534; font-size: 15px;">
              ℹ️ Comment ça marche ?
            </h4>
            <ul style="margin: 0; padding-left: 20px; color: #166534; font-size: 14px; line-height: 1.8;">
              <li>Nous analysons toutes les nouvelles missions publiées</li>
              <li>Si une mission passe près de votre départ ET de votre arrivée, vous êtes notifié</li>
              <li>Le rayon de ±${rayon} km vous offre de la flexibilité sur le trajet exact</li>
              <li>Vous recevez l'email instantanément pour pouvoir réserver en priorité</li>
            </ul>
          </div>
          
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
              💡 <strong>Avantage :</strong> Cette alerte est parfaite si vous faites régulièrement 
              ce trajet. Vous serez notifié en priorité des missions correspondantes et pourrez 
              optimiser vos déplacements !
            </p>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${process.env.FRONTEND_URL}/adherent/parametres/alertes" 
               style="background-color: #8b5cf6; color: white; padding: 16px 45px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);">
              ⚙️ Gérer mes alertes
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px; text-align: center;">
            Vous pouvez modifier, désactiver ou supprimer cette alerte à tout moment.
          </p>
          
          <p style="font-size: 16px; color: #374151; margin-top: 20px; text-align: center;">
            Bonne route !<br>
            <strong style="color: #ea580c;">L'équipe Revolution</strong>
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            Email de confirmation d'alerte trajet
          </p>
          <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 11px;">
            © ${new Date().getFullYear()} Revolution. Tous droits réservés.
          </p>
        </div>
      </div>
    `;

    return this.sendMail({
      to: userEmail,
      subject,
      html,
      text: `Votre alerte trajet ${villeDepartNom} → ${villeArriveeNom} (±${rayon} km) a été créée.`,
    });
  }

  /**
   * 🚨 Email notification - Nouvelle mission correspondant à l'alerte géographique
   */
  async sendAlerteGeographique(
    userEmail: string,
    userName: string,
    villeNom: string,
    rayon: number,
    mission: any,
  ) {
    const subject = `🚨 Nouvelle mission près de ${villeNom}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🚨 Nouvelle Mission</h1>
          <p style="color: #fed7aa; margin: 10px 0 0 0;">Alerte géographique</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #ea580c; margin-top: 0;">Mission disponible près de ${villeNom} 🎯</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            Bonjour <strong>${userName}</strong>,
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            Une nouvelle mission correspond à votre alerte autour de <strong>${villeNom}</strong> 
            dans un rayon de <strong>${rayon} km</strong>.
          </p>
          
          <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border-left: 4px solid #ea580c; padding: 25px; margin: 25px 0; border-radius: 10px;">
            <h3 style="color: #ea580c; margin-top: 0; font-size: 18px;">
              📋 Détails de la mission
            </h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px; width: 40%;">
                  <strong>🚀 Départ :</strong>
                </td>
                <td style="padding: 12px 0; color: #1f2937; font-size: 15px; font-weight: 600;">
                  ${mission.adresseDepart.villeNom}
                </td>
              </tr>
              <tr style="background-color: rgba(249, 250, 251, 0.5);">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">
                  <strong>🎯 Arrivée :</strong>
                </td>
                <td style="padding: 12px 0; color: #1f2937; font-size: 15px; font-weight: 600;">
                  ${mission.adresseArrivee.villeNom}
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">
                  <strong>🚛 Véhicule :</strong>
                </td>
                <td style="padding: 12px 0; color: #1f2937; font-size: 15px;">
                  ${mission.vehicule.typeVehicule}
                </td>
              </tr>
              <tr style="background-color: rgba(249, 250, 251, 0.5);">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">
                  <strong>📏 Distance :</strong>
                </td>
                <td style="padding: 12px 0; color: #1f2937; font-size: 15px;">
                  ${mission.calculs?.distanceKm || 'N/A'} km
                </td>
              </tr>
              ${
                mission.calculs?.fraisPeage
                  ? `
              <tr>
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">
                  <strong>💳 Péages :</strong>
                </td>
                <td style="padding: 12px 0; color: #1f2937; font-size: 15px;">
                  ${mission.calculs.fraisPeage}€
                </td>
              </tr>
              `
                  : ''
              }
            </table>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                Rémunération
              </p>
              <div style="font-size: 36px; font-weight: bold; color: #ea580c; margin: 10px 0;">
                ${mission.calculs?.montantTotal || 'N/A'}€
              </div>
              <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 13px;">
                TTC - Paiement sécurisé
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${process.env.FRONTEND_URL}/adherent/mission-reservation/${mission.id}" 
               style="background-color: #ea580c; color: white; padding: 16px 45px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);">
              🚗 Voir la mission
            </a>
          </div>
          
          <div style="background-color: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0; color: #1e40af; font-size: 13px;">
              💡 <strong>Astuce :</strong> Les missions populaires partent vite ! 
              Consultez les détails rapidement pour augmenter vos chances.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px; text-align: center;">
            Notification envoyée automatiquement par votre alerte autour de <strong>${villeNom}</strong> (${rayon} km)
          </p>
          
          <p style="font-size: 16px; color: #374151; margin-top: 20px; text-align: center;">
            Bonne route !<br>
            <strong style="color: #ea580c;">L'équipe Revolution</strong>
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            Cet email a été envoyé automatiquement suite à votre alerte géographique.
          </p>
          <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 11px;">
            © ${new Date().getFullYear()} Revolution. Tous droits réservés.
          </p>
        </div>
      </div>
    `;

    return this.sendMail({
      to: userEmail,
      subject,
      html,
      text: `Nouvelle mission près de ${villeNom} : ${mission.adresseDepart.villeNom} → ${mission.adresseArrivee.villeNom} - ${mission.calculs?.montantTotal || 'N/A'}€`,
    });
  }

  /**
   * 🚨 Email notification - Nouvelle mission correspondant à l'alerte trajet
   */
  async sendAlerteTrajet(
    userEmail: string,
    userName: string,
    villeDepartNom: string,
    villeArriveeNom: string,
    rayon: number,
    mission: any,
  ) {
    const subject = `🚨 Mission ${villeDepartNom} → ${villeArriveeNom} disponible`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🚨 Mission sur votre trajet</h1>
          <p style="color: #ddd6fe; margin: 10px 0 0 0;">Alerte trajet</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #7c3aed; margin-top: 0;">Mission ${villeDepartNom} → ${villeArriveeNom} 🎯</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            Bonjour <strong>${userName}</strong>,
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            Excellente nouvelle ! Une mission correspond parfaitement à votre alerte de trajet.
          </p>
          
          <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border: 2px solid #8b5cf6; padding: 20px; margin: 25px 0; border-radius: 10px; text-align: center;">
            <h3 style="color: #6d28d9; margin: 0 0 15px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
              🔔 Votre alerte
            </h3>
            <div style="font-size: 20px; font-weight: bold; color: #1f2937; margin: 10px 0;">
              ${villeDepartNom} <span style="color: #8b5cf6;">→</span> ${villeArriveeNom}
            </div>
            <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
              Rayon de recherche : <strong>±${rayon} km</strong> autour de chaque ville
            </p>
          </div>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #8b5cf6; padding: 25px; margin: 25px 0; border-radius: 8px;">
            <h3 style="color: #6d28d9; margin-top: 0; font-size: 18px;">
              📋 Détails de la mission
            </h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px; width: 40%;">
                  <strong>🚀 Départ :</strong>
                </td>
                <td style="padding: 12px 0; color: #1f2937; font-size: 15px; font-weight: 600;">
                  ${mission.adresseDepart.villeNom}
                </td>
              </tr>
              <tr style="background-color: rgba(255, 255, 255, 0.5);">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">
                  <strong>🎯 Arrivée :</strong>
                </td>
                <td style="padding: 12px 0; color: #1f2937; font-size: 15px; font-weight: 600;">
                  ${mission.adresseArrivee.villeNom}
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">
                  <strong>🚛 Véhicule :</strong>
                </td>
                <td style="padding: 12px 0; color: #1f2937; font-size: 15px;">
                  ${mission.vehicule.typeVehicule}
                </td>
              </tr>
              <tr style="background-color: rgba(255, 255, 255, 0.5);">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">
                  <strong>📏 Distance :</strong>
                </td>
                <td style="padding: 12px 0; color: #1f2937; font-size: 15px;">
                  ${mission.calculs?.distanceKm || 'N/A'} km
                </td>
              </tr>
              ${
                mission.calculs?.fraisPeage
                  ? `
              <tr>
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">
                  <strong>💳 Péages :</strong>
                </td>
                <td style="padding: 12px 0; color: #1f2937; font-size: 15px;">
                  ${mission.calculs.fraisPeage}€
                </td>
              </tr>
              `
                  : ''
              }
            </table>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center; box-shadow: 0 2px 8px rgba(139, 92, 246, 0.1);">
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                Rémunération
              </p>
              <div style="font-size: 36px; font-weight: bold; color: #8b5cf6; margin: 10px 0;">
                ${mission.calculs?.montantTotal || 'N/A'}€
              </div>
              <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 13px;">
                TTC - Paiement sécurisé
              </p>
            </div>
          </div>
          
          <div style="background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #166534; font-size: 14px;">
              ✅ <strong>Correspondance parfaite :</strong> Cette mission passe près de vos villes de départ et d'arrivée.
            </p>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${process.env.FRONTEND_URL}/adherent/mission-reservation/${mission.id}" 
               style="background-color: #8b5cf6; color: white; padding: 16px 45px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);">
              🚗 Voir la mission
            </a>
          </div>
          
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0; color: #92400e; font-size: 13px;">
              💡 <strong>Conseil :</strong> Cette mission correspond exactement à votre itinéraire habituel. 
              Consultez-la rapidement avant qu'un autre convoyeur la réserve !
            </p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px; text-align: center;">
            Notification envoyée par votre alerte trajet <strong>${villeDepartNom} → ${villeArriveeNom}</strong> (±${rayon} km)
          </p>
          
          <p style="font-size: 16px; color: #374151; margin-top: 20px; text-align: center;">
            Bonne route !<br>
            <strong style="color: #ea580c;">L'équipe Revolution</strong>
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            Cet email a été envoyé automatiquement suite à votre alerte de trajet.
          </p>
          <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 11px;">
            © ${new Date().getFullYear()} Revolution. Tous droits réservés.
          </p>
        </div>
      </div>
    `;

    return this.sendMail({
      to: userEmail,
      subject,
      html,
      text: `Mission sur votre trajet ${villeDepartNom} → ${villeArriveeNom} : ${mission.adresseDepart.villeNom} → ${mission.adresseArrivee.villeNom} - ${mission.calculs?.montantTotal || 'N/A'}€`,
    });
  }


async sendAgenceCreatedCompleteProfile(data: {
  email: string;
  nomAgence: string;
  ville?: string;
  profileToken: string;
  codePartenaire: string;
}) {
  const { email, nomAgence, ville, profileToken, codePartenaire } = data;

  // ✅ URL agent correcte
  const lienProfil = `${process.env.FRONTEND_URL}/formulaire/agent/profil-agent-formulaire/${profileToken}?code=${codePartenaire}`;

  const subject = `🏢 Agence "${nomAgence}" créée — Complétez votre profil`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🏢 Agence créée avec succès</h1>
        <p style="color: #fed7aa; margin: 10px 0 0 0;">Bienvenue sur Revolution</p>
      </div>

      <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #ea580c; margin-top: 0;">Votre agence ${nomAgence} est enregistrée 🎯</h2>

        <p style="font-size: 16px; line-height: 1.6; color: #374151;">Bonjour,</p>

        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Votre agence a bien été créée sur la plateforme Revolution. Pour l'activer pleinement, merci de compléter votre profil agent.
        </p>

        <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 2px solid #ea580c; padding: 20px; margin: 25px 0; border-radius: 10px; text-align: center;">
          <h3 style="color: #c2410c; margin: 0 0 15px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
            🏢 Votre agence
          </h3>
          <div style="font-size: 22px; font-weight: bold; color: #1f2937; margin: 10px 0;">
            ${nomAgence}
          </div>
          ${ville ? `<p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">📍 Ville : <strong>${ville}</strong></p>` : ''}
        </div>

        <div style="background-color: #f8fafc; border-left: 4px solid #ea580c; padding: 25px; margin: 25px 0; border-radius: 8px;">
          <h3 style="color: #c2410c; margin-top: 0; font-size: 18px;">📋 Prochaines étapes</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; color: #6b7280; font-size: 14px; width: 10%;"><strong>1️⃣</strong></td>
              <td style="padding: 12px 0; color: #1f2937; font-size: 15px;">Cliquez sur le bouton ci-dessous pour accéder au formulaire</td>
            </tr>
            <tr style="background-color: rgba(255,255,255,0.5);">
              <td style="padding: 12px 0; color: #6b7280; font-size: 14px;"><strong>2️⃣</strong></td>
              <td style="padding: 12px 0; color: #1f2937; font-size: 15px;">Ajoutez votre photo de profil</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #6b7280; font-size: 14px;"><strong>3️⃣</strong></td>
              <td style="padding: 12px 0; color: #1f2937; font-size: 15px;">Créez votre mot de passe sécurisé</td>
            </tr>
            <tr style="background-color: rgba(255,255,255,0.5);">
              <td style="padding: 12px 0; color: #6b7280; font-size: 14px;"><strong>4️⃣</strong></td>
              <td style="padding: 12px 0; color: #1f2937; font-size: 15px;">Validez pour activer pleinement votre compte agent</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #166534; font-size: 14px;">
            ✅ <strong>Agence enregistrée :</strong> Votre agence est bien présente dans notre système.
            Il ne reste qu'à compléter le profil pour la rendre opérationnelle.
          </p>
        </div>

        <div style="text-align: center; margin: 35px 0;">
          <a href="${lienProfil}"
             style="background-color: #ea580c; color: white; padding: 16px 45px; text-decoration: none;
                    border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px;
                    box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);">
            ✏️ Compléter mon profil
          </a>
        </div>

        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 25px 0;">
          <p style="margin: 0; color: #92400e; font-size: 13px;">
            💡 <strong>Conseil :</strong> Ce lien est valide pendant <strong>7 jours</strong>.
            Passé ce délai, contactez votre partenaire pour en obtenir un nouveau.
          </p>
        </div>

        <p style="font-size: 14px; color: #6b7280; margin-top: 30px; text-align: center;">
          Notification envoyée suite à la création de l'agence <strong>${nomAgence}</strong>
          ${ville ? `à <strong>${ville}</strong>` : ''}.
        </p>

        <p style="font-size: 16px; color: #374151; margin-top: 20px; text-align: center;">
          Bienvenue à bord !<br>
          <strong style="color: #ea580c;">L'équipe Revolution</strong>
        </p>
      </div>

      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          Cet email a été envoyé automatiquement suite à la création de votre agence.
        </p>
        <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 11px;">
          © ${new Date().getFullYear()} Revolution. Tous droits réservés.
        </p>
      </div>
    </div>
  `;

  return this.sendMail({
    to: email,
    subject,
    html,
    text: `Votre agence "${nomAgence}"${ville ? ` (${ville})` : ''} a été créée. Complétez votre profil via ce lien (valide 7 jours) : ${lienProfil}`,
  });
}



// src/Module/email/email.service.ts
// Ajouter cette méthode après sendConfirmationRendezvousPartenaire

async sendReportRendezvousPartenaire(data: {
  email: string;
  nom: string;
  entite: string;
  typeRdv: string;
  dateRdv: Date;
  creneau: string;
}): Promise<void> {
  const dateFormatee = new Date(data.dateRdv).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });

  const typeRdvTexte = data.typeRdv === 'TELEPHONIQUE'
    ? 'téléphonique'
    : 'physique';

  const subject = `Votre rendez-vous a été reporté — ${dateFormatee}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Revolution</h1>
        <p style="color: #fef3c7; margin: 10px 0 0 0;">Rendez-vous reporté</p>
      </div>

      <!-- Body -->
      <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #d97706; margin-top: 0;">
          Votre rendez-vous a été reporté
        </h2>

        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Bonjour <strong>${data.nom}</strong>,
        </p>

        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Nous vous informons que votre rendez-vous ${typeRdvTexte}
          concernant le partenariat pour <strong>${data.entite}</strong>
          a été reporté à une nouvelle date.
        </p>

        <!-- Nouveau RDV -->
        <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 2px solid #f59e0b; padding: 25px; margin: 25px 0; border-radius: 10px; text-align: center;">
          <h2 style="color: #d97706; margin: 0 0 15px 0; font-size: 18px;">
            📅 Nouveau rendez-vous
          </h2>
          <p style="margin: 8px 0; font-size: 18px; color: #92400e;">
            <strong>${dateFormatee}</strong>
          </p>
          <p style="margin: 8px 0; font-size: 18px; color: #92400e;">
            <strong>${data.creneau}</strong>
          </p>
          <p style="margin: 12px 0 0 0; font-size: 14px; color: #6b7280;">
            Type : ${typeRdvTexte}
          </p>
        </div>

        <!-- Info -->
        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            <strong>Information :</strong> Notre équipe commerciale vous
            recontactera pour confirmer ce nouveau rendez-vous.
            En cas d'indisponibilité, n'hésitez pas à nous contacter.
          </p>
        </div>

        <p style="font-size: 14px; color: #6b7280; margin-top: 25px;">
          Nous nous excusons pour tout inconvénient causé par ce changement.
        </p>

        <p style="font-size: 16px; color: #374151; margin-top: 20px;">
          Cordialement,<br/>
          <strong style="color: #ea580c;">L'équipe Revolution</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          Cet email a été envoyé automatiquement, merci de ne pas y répondre directement.
        </p>
      </div>

    </div>
  `;

  return this.sendMail({
    to:      data.email,
    subject,
    html,
    text: `Bonjour ${data.nom}, votre rendez-vous ${typeRdvTexte} pour ${data.entite} a été reporté au ${dateFormatee} à ${data.creneau}.`,
  });
}


async sendRefusReservation(data: {
  email: string;
  nomAdherent: string;
  numeroReservation: string;
  missionTitre: string;
  dateReservation: Date;
  motifRefus: string;
}): Promise<void> {
  const dateFormatee = new Date(data.dateReservation).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });

  const subject = `Votre réservation #${data.numeroReservation} a été refusée`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Revolution</h1>
        <p style="color: #fee2e2; margin: 10px 0 0 0;">Réservation refusée</p>
      </div>

      <!-- Body -->
      <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #b91c1c; margin-top: 0;">
          ❌ Votre réservation a été refusée
        </h2>

        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Bonjour <strong>${data.nomAdherent}</strong>,
        </p>

        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Nous vous informons que votre réservation pour la mission
          <strong>${data.missionTitre}</strong> du
          <strong>${dateFormatee}</strong> a malheureusement été refusée.
        </p>

        <!-- Détails réservation -->
        <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid #ef4444; padding: 25px; margin: 25px 0; border-radius: 10px;">
          <h3 style="color: #b91c1c; margin: 0 0 15px 0; font-size: 16px;">
            📋 Détails de la réservation
          </h3>
          <p style="margin: 6px 0; font-size: 15px; color: #7f1d1d;">
            <strong>Numéro :</strong> #${data.numeroReservation}
          </p>
          <p style="margin: 6px 0; font-size: 15px; color: #7f1d1d;">
            <strong>Mission :</strong> ${data.missionTitre}
          </p>
          <p style="margin: 6px 0; font-size: 15px; color: #7f1d1d;">
            <strong>Date :</strong> ${dateFormatee}
          </p>
        </div>

        <!-- Motif de refus -->
        <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0 0 8px 0; color: #c2410c; font-size: 15px;">
            <strong>💬 Motif du refus :</strong>
          </p>
          <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6; font-style: italic;">
            "${data.motifRefus}"
          </p>
        </div>

        <!-- Info contact -->
        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            <strong>Information :</strong> Si vous pensez que cette décision
            est incorrecte ou souhaitez plus d'informations,
            n'hésitez pas à contacter notre équipe.
          </p>
        </div>

        <p style="font-size: 14px; color: #6b7280; margin-top: 25px;">
          Nous vous remercions de votre compréhension et espérons pouvoir
          vous accompagner lors de vos prochaines réservations.
        </p>

        <p style="font-size: 16px; color: #374151; margin-top: 20px;">
          Cordialement,<br/>
          <strong style="color: #ea580c;">L'équipe Revolution</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          Cet email a été envoyé automatiquement, merci de ne pas y répondre directement.
        </p>
      </div>

    </div>
  `;

  return this.sendMail({
    to:      data.email,
    subject,
    html,
    text: `Bonjour ${data.nomAdherent}, votre réservation #${data.numeroReservation} pour la mission "${data.missionTitre}" du ${dateFormatee} a été refusée. Motif : ${data.motifRefus}.`,
  });
}




}
