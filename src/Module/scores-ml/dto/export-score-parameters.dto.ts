/**
 * DTO pour exporter les paramètres de score logistique
 * Contient tous les paramètres utilisés pour calculer le score SANS faire le calcul
 */

export class ScoreParametersDto {
  // ── Identifiants ──────────────────────────────
  missionId: string;
  sessionId: string;
  adherentId: number;

  // ── Profil du conducteur ──────────────────────
  conducteurAge: number; // age en années
  conducteurNom: string;
  conducteurPrenom: string;
  conducteurTelephone: string;
  noteAgentConducteur: number; // rating 1-5

  // ── Véhicule ──────────────────────────────────
  typeVehicule: string;
  etatVehicule: number; // 0, 1, 2
  immatriculation: string;

  // ── Mission - Paramètres temporels ────────────
  dateDepart: Date;
  dateArrivee: Date | null;
  heureDepart: string | null; // HH:mm
  heureArrivee: string | null; // HH:mm

  // ── Mission - Dates réelles ──────────────────
  departReel: Date;
  arriveeReelle: Date | null;

  // ── Mission - Délais (minutes) ───────────────
  retardDepart: number; // pickup_delay_min
  retardArrivee: number; // delivery_delay_min

  // ── Mission - Distances ──────────────────────
  distanceKm: number;
  distanceGPS: number | null; // distance réelle parcourue si disponible

  // ── Mission - Positions ──────────────────────
  adresseDepart: string;
  villeDepartCodePostal: string;
  latitudeDepartReelle: number;
  longitudeDepartReelle: number;

  adresseArrivee: string;
  villeArriveeCodePostal: string;
  latitudeArriveeReelle: number;
  longitudeArriveeReelle: number;
  distanceArriveeReelleM: number; // distance réelle par rapport à l'adresse prévue

  // ── Conditions externes ──────────────────────
  conditionsMeteo: string; // Sunny, Cloudy, Windy, Fog, Stormy, Sandstorms
  joursemaine: number; // 0 = Lundi ... 6 = Dimanche

  // ── Timing ──────────────────────────────────
  heureDépart: number; // 0-23
  mois: number; // 1-12
  saison: string; // Hiver, Printemps, Été, Automne

  // ── Statut ──────────────────────────────────
  statusMission: string; // EN_ATTENTE, EN_COURS, TERMINEE, etc
  statusSession: string; // EN_COURS, TERMINEE

  // ── Scores existants ────────────────────────
  scoreLogistiqueActuel: number | null;
  labelScorePrediction: string | null;
  scoreSecuriteActuel: number | null;

  // ── Métadonnées ──────────────────────────────
  dateExport: Date;
  tempsExecution: number; // en milliseconds
}

/**
 * Format allégé pour la liste des missions
 */
export class ScoreParametersSummaryDto {
  missionId: string;
  conducteur: string;
  adresseDepart: string;
  adresseArrivee: string;
  distanceKm: number;
  retardDepart: number;
  retardArrivee: number;
  dateDepart: Date;
  dateArrivee: Date | null;
  scoreLogistique: number | null;
  status: string;
}
