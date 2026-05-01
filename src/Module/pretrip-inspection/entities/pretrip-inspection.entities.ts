import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { EtapeInspection, StatutPreTripInspection, TypeMediaInspection } from '../enum/pretrip-inspection.enums';

// ============================================
// � ENTITÉ MEDIA (PHOTO INDIVIDUELLE)
// ============================================
@ObjectType('PreTripInspectionMedia', {
  description: "Photo individuelle d'une fiche technique avec métadonnées anti-fraude",
})
export class PreTripInspectionMedia {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  inspectionId: string;

  @Field(() => TypeMediaInspection)
  typeMedia: TypeMediaInspection;

  // ----- Fichier -----
  @Field(() => String, { description: 'URL signée Supabase Storage' })
  cheminFichier: string;

  @Field(() => String)
  mimeType: string;

  @Field(() => Int, { description: 'Taille en octets' })
  tailleFichier: number;

  // ----- Anti-fraude : empreinte SHA-256 -----
  @Field(() => String, {
    description: "Hash SHA-256 du fichier (preuve d'intégrité)",
  })
  hashSha256: string;

  // ----- Métadonnées EXIF -----
  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;

  @Field(() => Float, { nullable: true, description: 'Précision GPS en mètres' })
  precisionGps?: number | null;

  @Field(() => Date, {
    description: "Timestamp EXIF original (pas la date d'upload)",
  })
  timestampPhoto: Date;

  // ----- Validation serveur -----
  @Field(() => Boolean, {
    description: 'Vrai si les vérifications anti-fraude ont passé',
  })
  validatedByServer: boolean;

  // ----- Traçabilité -----
  @Field(() => Date)
  dateUpload: Date;

  @Field(() => Date)
  dateModification: Date;
}

// ============================================
// 📋 ENTITÉ CONSENTEMENT (DOCUMENT JURIDIQUE)
// ============================================
@ObjectType('PreTripConsent', {
  description: 'Acceptation horodatée des conditions de mission',
})
export class PreTripConsent {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  inspectionId: string;

  @Field(() => String, {
    description: 'Version des conditions acceptées (audit légal)',
  })
  versionConditions: string;

  // ----- Les 9 clauses individuelles -----
  @Field(() => Boolean, {
    description: 'Le véhicule a été vérifié avant le départ',
  })
  vehiculeVerifie: boolean;

  @Field(() => Boolean, {
    description: 'Les photos sont réelles et prises au moment de la mission',
  })
  photosReelles: boolean;

  @Field(() => Boolean, {
    description: 'Engagement à respecter le code de la route',
  })
  codeRoute: boolean;

  @Field(() => Boolean, {
    description: 'Engagement à conduire de manière responsable et sécurisée',
  })
  conduiteResponsable: boolean;

  @Field(() => Boolean, {
    description: 'Acceptation du suivi GPS en temps réel durant la mission',
  })
  suiviGps: boolean;

  @Field(() => Boolean, {
    description: "Acceptation de l'évaluation de la conduite via scoring",
  })
  scoringConduite: boolean;

  @Field(() => Boolean, {
    description: 'Responsabilité en cas de comportement dangereux ou négligence',
  })
  responsabiliteNegligence: boolean;

  @Field(() => Boolean, {
    description: 'Apte à conduire (repos et concentration)',
  })
  apteAConduire: boolean;

  @Field(() => Boolean, {
    description: "✅ Case obligatoire : J'accepte toutes les conditions",
  })
  acceptationGlobale: boolean;

  // ----- Métadonnées juridiques -----
  @Field(() => Date)
  dateAcceptation: Date;

  @Field(() => String, { nullable: true })
  ipAdresse?: string | null;

  @Field(() => String, { nullable: true })
  userAgent?: string | null;

  @Field(() => Float, { nullable: true })
  latitude?: number | null;

  @Field(() => Float, { nullable: true })
  longitude?: number | null;
}

// ============================================
// 📋 ENTITÉ PRINCIPALE : LA FICHE
// ============================================
@ObjectType('PreTripInspection', {
  description: 'Fiche technique de début de mission (anti-fraude)',
})
export class PreTripInspection {
  @Field(() => ID)
  id: string;

  @Field(() => String, { description: 'ID de la réservation associée (1-1)' })
  reservationId: string;

  @Field(() => Int, { description: "ID de l'adhérent-convoyeur" })
  adherentId: number;

  @Field(() => StatutPreTripInspection)
  statut: StatutPreTripInspection;

  @Field(() => EtapeInspection)
  etapeCourante: EtapeInspection;

  // ----- Position GPS au démarrage -----
  @Field(() => Float, { nullable: true })
  latitudeDebut?: number | null;

  @Field(() => Float, { nullable: true })
  longitudeDebut?: number | null;

  // ----- Position GPS à la validation finale -----
  @Field(() => Float, { nullable: true })
  latitudeFin?: number | null;

  @Field(() => Float, { nullable: true })
  longitudeFin?: number | null;

  // ----- Timestamps métier -----
  @Field(() => Date)
  dateDebut: Date;

  @Field(() => Date, { nullable: true })
  dateValidation?: Date | null;

  // ----- Motif de rejet anti-fraude -----
  @Field(() => String, { nullable: true })
  motifRejet?: string | null;

  // ----- Relations enfants (chargées via resolvers) -----
  @Field(() => [PreTripInspectionMedia], { nullable: true })
  medias?: PreTripInspectionMedia[];

  @Field(() => PreTripConsent, { nullable: true })
  consent?: PreTripConsent | null;

  // ----- Traçabilité technique -----
  @Field(() => Date)
  dateCreation: Date;

  @Field(() => Date)
  dateModification: Date;

  // ----- Champs calculés utiles côté frontend -----
  @Field(() => Int, {
    description: 'Nombre de photos uploadées (sur 12 attendues)',
    nullable: true,
  })
  nombreMediasUploades?: number;

  @Field(() => Boolean, {
    description: 'Vrai si toutes les conditions sont réunies pour valider',
    nullable: true,
  })
  peutEtreValidee?: boolean;
}

// ============================================
// 📊 RÉPONSE STRUCTURÉE POUR VALIDATION FINALE
// ============================================
@ObjectType('ValidationResult', {
  description: "Résultat de la tentative de validation finale d'une inspection",
})
export class ValidationResult {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Liste des raisons de rejet si success=false',
  })
  reasons?: string[];

  @Field(() => PreTripInspection, { nullable: true })
  inspection?: PreTripInspection;

  @Field(() => String, {
    nullable: true,
    description: "ID de la mission si la validation a réussi (mission lancée)",
  })
  missionId?: string;
}