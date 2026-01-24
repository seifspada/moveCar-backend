// src/email/email.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

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
      subject: 'Bienvenue sur Convoyeur',
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
async sendDemandeRecueAdherent(to: string, nom: string) {
  return this.sendMail({
    to,
    subject: "Votre demande d'adhésion a été reçue",
    text: `Bonjour ${nom}, nous avons bien reçu votre demande.`,
    html: `<p>Bonjour <strong>${nom}</strong>, nous avons bien reçu votre demande.</p>`,
  });
}

// ✅ Email admin: nouvelle demande
async sendNouvelleDemandeAdmin(emailAdherent: string) {
  const adminTo = process.env.EMAIL_USER; // ✅ même email

  if (!adminTo) {
    throw new Error('EMAIL_USER non défini');
  }

  return this.sendMail({
    to: adminTo,
    subject: "Nouvelle demande d'adhésion",
    text: `Nouvelle demande reçue : ${emailAdherent}`,
    html: `<p>Nouvelle demande reçue : <strong>${emailAdherent}</strong></p>`,
  });
}

}
