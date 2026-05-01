import { registerEnumType } from '@nestjs/graphql';

// ============================================
// 📊 STATUT DU CYCLE DE VIE DE LA FICHE
// ============================================
export enum StatutPreTripInspection {
  DRAFT = 'DRAFT',                 // Créée, aucune photo encore uploadée
  IN_PROGRESS = 'IN_PROGRESS',     // Au moins une photo uploadée, incomplète
  COMPLETED = 'COMPLETED',         // 12 photos + consentement présents
  VALIDATED = 'VALIDATED',         // Anti-fraude OK, mission peut démarrer
  REJECTED = 'REJECTED',           // Anti-fraude a détecté un problème
}

registerEnumType(StatutPreTripInspection, {
  name: 'StatutPreTripInspection',
  description: 'Cycle de vie de la fiche technique de début de mission',
});

// ============================================
// 🪜 ÉTAPE COURANTE DU STEPPER (UI)
// ============================================
export enum EtapeInspection {
  EXTERIEUR = 'EXTERIEUR',           // Étape 1 : 4 photos extérieures
  INTERIEUR = 'INTERIEUR',           // Étape 2 : 4 photos intérieures
  TABLEAU_BORD = 'TABLEAU_BORD',     // Étape 3 : photo tableau de bord
  DOCUMENTS = 'DOCUMENTS',           // Étape 4 : permis recto/verso
  IDENTITE = 'IDENTITE',             // Étape 5 : selfie avec véhicule
  CONDITIONS = 'CONDITIONS',         // Étape 6 : acceptation conditions
  TERMINEE = 'TERMINEE',             // Étape 7 : validation finale OK
}

registerEnumType(EtapeInspection, {
  name: 'EtapeInspection',
  description: "Étape courante du stepper d'inspection (pour reprise après crash)",
});

// ============================================
// 📸 TYPE DE MÉDIA EXIGÉ (12 types)
// ============================================
export enum TypeMediaInspection {
  // Étape 1 : Extérieur (4)
  EXT_FACE_AVANT = 'EXT_FACE_AVANT',
  EXT_FACE_ARRIERE = 'EXT_FACE_ARRIERE',
  EXT_COTE_GAUCHE = 'EXT_COTE_GAUCHE',
  EXT_COTE_DROIT = 'EXT_COTE_DROIT',

  // Étape 2 : Intérieur (4)
  INT_SIEGE_CONDUCTEUR = 'INT_SIEGE_CONDUCTEUR',
  INT_SIEGE_PASSAGER = 'INT_SIEGE_PASSAGER',
  INT_BANQUETTE_ARRIERE = 'INT_BANQUETTE_ARRIERE',
  INT_VUE_GLOBALE = 'INT_VUE_GLOBALE',

  // Étape 3 : Tableau de bord (1)
  TABLEAU_BORD = 'TABLEAU_BORD',

  // Étape 4 : Documents (2)
  PERMIS_RECTO = 'PERMIS_RECTO',
  PERMIS_VERSO = 'PERMIS_VERSO',

  // Étape 5 : Identité (1)
  SELFIE_VEHICULE = 'SELFIE_VEHICULE',
}

registerEnumType(TypeMediaInspection, {
  name: 'TypeMediaInspection',
  description: 'Les 12 types de photos obligatoires pour valider une fiche technique',
});

// ============================================
// 🛠️ CONSTANTES UTILES (export)
// ============================================
export const ALL_REQUIRED_MEDIA_TYPES: TypeMediaInspection[] = [
  TypeMediaInspection.EXT_FACE_AVANT,
  TypeMediaInspection.EXT_FACE_ARRIERE,
  TypeMediaInspection.EXT_COTE_GAUCHE,
  TypeMediaInspection.EXT_COTE_DROIT,
  TypeMediaInspection.INT_SIEGE_CONDUCTEUR,
  TypeMediaInspection.INT_SIEGE_PASSAGER,
  TypeMediaInspection.INT_BANQUETTE_ARRIERE,
  TypeMediaInspection.INT_VUE_GLOBALE,
  TypeMediaInspection.TABLEAU_BORD,
  TypeMediaInspection.PERMIS_RECTO,
  TypeMediaInspection.PERMIS_VERSO,
  TypeMediaInspection.SELFIE_VEHICULE,
];

export const MEDIA_TYPES_BY_STEP: Record<EtapeInspection, TypeMediaInspection[]> = {
  [EtapeInspection.EXTERIEUR]: [
    TypeMediaInspection.EXT_FACE_AVANT,
    TypeMediaInspection.EXT_FACE_ARRIERE,
    TypeMediaInspection.EXT_COTE_GAUCHE,
    TypeMediaInspection.EXT_COTE_DROIT,
  ],
  [EtapeInspection.INTERIEUR]: [
    TypeMediaInspection.INT_SIEGE_CONDUCTEUR,
    TypeMediaInspection.INT_SIEGE_PASSAGER,
    TypeMediaInspection.INT_BANQUETTE_ARRIERE,
    TypeMediaInspection.INT_VUE_GLOBALE,
  ],
  [EtapeInspection.TABLEAU_BORD]: [TypeMediaInspection.TABLEAU_BORD],
  [EtapeInspection.DOCUMENTS]: [
    TypeMediaInspection.PERMIS_RECTO,
    TypeMediaInspection.PERMIS_VERSO,
  ],
  [EtapeInspection.IDENTITE]: [TypeMediaInspection.SELFIE_VEHICULE],
  [EtapeInspection.CONDITIONS]: [],
  [EtapeInspection.TERMINEE]: [],
};