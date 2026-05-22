# 📋 Résumé des Adaptations - Backend Mission Session

## 🎯 Vue d'ensemble
Le backend `mission-session` a été complètement adapté pour gérer un cycle de vie complet des missions de livraison de véhicule, avec validation obligatoire des photos avant démarrage et après livraison.

---

## 📦 Changements au Schéma Prisma

### 1. Nouveaux Enums
```prisma
// Photos de session (avant/après mission)
enum EtapeSession {
  PRE_DEPART       // Photos avant la mission
  POST_LIVRAISON   // Photos après la livraison
}

enum TypeMediaSession {
  // ──── PRÉ-DÉPART (8 photos + 2 documents)
  PHOTO_AVANT
  PHOTO_ARRIERE
  PHOTO_GAUCHE
  PHOTO_DROIT
  PHOTO_INTERIEUR
  PHOTO_TABLEAU_BORD
  PHOTO_CARBURANT
  DEGATS_PRE_MISSION
  PERMIS_RECTO_CONDUCTEUR
  PERMIS_VERSO_CONDUCTEUR

  // ──── POST-LIVRAISON (7 photos obligatoires + optionnelles)
  PHOTO_AVANT_FINAL
  PHOTO_ARRIERE_FINAL
  PHOTO_GAUCHE_FINAL
  PHOTO_DROIT_FINAL
  PHOTO_INTERIEUR_FINAL
  PHOTO_TABLEAU_BORD_FINAL
  CARBURANT_FINAL
  DEGATS_POST_MISSION
  PREUVE_LIVRAISON
  SIGNATURE_CLIENT
}
```

### 2. Nouvelles Tables
```prisma
// Photos de session (avant/pendant/après mission)
model MissionSessionMedia {
  id String @id @default(cuid())
  sessionId String                        // Relation vers MissionSession
  etape EtapeSession                      // PRE_DEPART ou POST_LIVRAISON
  typeMedia TypeMediaSession              // Type spécifique de photo
  description String?                     // Description optionnelle
  cheminFichier String @db.VarChar(500)  // Chemin du fichier
  urlPublic String? @db.VarChar(500)     // URL publique
  tailleOctets Int?                       // Taille en octets
  typeContenu String? @db.VarChar(50)    // mime type
  dateCreation DateTime @default(now())
  dateModification DateTime @updatedAt
}

// Photos finales de complétion
model MissionCompletionMedia {
  id String @id @default(cuid())
  completionId String                     // Relation vers MissionCompletion
  typeMedia TypeMediaSession              // Type de photo finale
  description String?
  cheminFichier String
  urlPublic String?
  tailleOctets Int?
  typeContenu String?
  dateCreation DateTime @default(now())
  dateModification DateTime @updatedAt
}
```

### 3. Relations Ajoutées
```prisma
// Dans MissionSession
medias MissionSessionMedia[]

// Dans MissionCompletion  
medias MissionCompletionMedia[]
```

### 4. Migration Prisma
```bash
✅ Migration: 20260520125400_add_mission_session_media
Base de données synchronisée avec succès
```

---

## 🎨 Inputs GraphQL Améliorés

### `MediaUploadInput`
```graphql
input MediaUploadInput {
  typeMedia: String!              # TypeMediaSession (enum)
  base64Data: String!             # Données base64: "data:image/jpeg;base64,..."
  description: String             # Description optionnelle
  typeContenu: String             # mime type (image/jpeg, etc.)
}
```

### `StartMissionSessionInput` (Amélioré)
```graphql
input StartMissionSessionInput {
  reservationId: String!
  consentAccepted: Boolean!
  latitudeDebut: Float!
  longitudeDebut: Float!
  kilometrageDebut: Int
  
  # ✅ NOUVEAU: Photos optionnelles au démarrage
  photosPre: [MediaUploadInput!]
}
```

### `EndMissionSessionInput` (Amélioré)
```graphql
input EndMissionSessionInput {
  sessionId: String!
  latitudeFin: Float!
  longitudeFin: Float!
  kilometrageFin: Int
  commentaireFin: String
  
  # ✅ NOUVEAU: Photos finales optionnelles
  photosPost: [MediaUploadInput!]
}
```

### `UploadMissionPhotosInput` (Nouveau)
```graphql
input UploadMissionPhotosInput {
  sessionId: String!
  etape: String!                  # "PRE_DEPART" ou "POST_LIVRAISON"
  medias: [MediaUploadInput!]!   # Au moins 1 photo
}
```

---

## 🔵 Entities GraphQL Nouvelles

### `MissionSessionMediaEntity`
```graphql
type MissionSessionMedia {
  id: ID!
  sessionId: String!
  etape: EtapeSession!            # PRE_DEPART | POST_LIVRAISON
  typeMedia: TypeMediaSession!    # Type de photo
  description: String
  cheminFichier: String!          # Chemin du fichier
  urlPublic: String               # URL d'accès public
  tailleOctets: Int               # Taille en octets
  typeContenu: String             # mime type
  dateCreation: DateTime!
  dateModification: DateTime!
}

enum EtapeSession {
  PRE_DEPART
  POST_LIVRAISON
}

enum TypeMediaSession {
  PHOTO_AVANT, PHOTO_ARRIERE, PHOTO_GAUCHE, PHOTO_DROIT,
  PHOTO_INTERIEUR, PHOTO_TABLEAU_BORD, PHOTO_CARBURANT,
  DEGATS_PRE_MISSION, PERMIS_RECTO_CONDUCTEUR, PERMIS_VERSO_CONDUCTEUR,
  PHOTO_AVANT_FINAL, PHOTO_ARRIERE_FINAL, PHOTO_GAUCHE_FINAL,
  PHOTO_DROIT_FINAL, PHOTO_INTERIEUR_FINAL, PHOTO_TABLEAU_BORD_FINAL,
  CARBURANT_FINAL, DEGATS_POST_MISSION, PREUVE_LIVRAISON, SIGNATURE_CLIENT
}
```

### `MissionSessionEntity` (Relation Ajoutée)
```graphql
type MissionSession {
  # ... champs existants ...
  
  # ✅ NOUVEAU: Relation vers les médias
  medias: [MissionSessionMedia!]
}
```

---

## 🚀 Mutations GraphQL

### 1. Démarrer une mission avec photos pré-mission
```graphql
mutation {
  startMissionSession(input: {
    reservationId: "uuid"
    consentAccepted: true
    latitudeDebut: 48.8566
    longitudeDebut: 2.3522
    kilometrageDebut: 150000
    
    # ✅ PHOTOS AVANT LA MISSION (optionnelles lors du démarrage)
    photosPre: [
      {
        typeMedia: "PHOTO_AVANT"
        base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."
        description: "Vue avant du véhicule"
      },
      {
        typeMedia: "PERMIS_RECTO_CONDUCTEUR"
        base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."
      }
    ]
  }) {
    id
    statut
    dateDebut
    medias {
      id
      typeMedia
      cheminFichier
      dateCreation
    }
  }
}
```

### 2. Terminer une mission avec photos finales
```graphql
mutation {
  endMissionSession(input: {
    sessionId: "uuid"
    latitudeFin: 48.8566
    longitudeFin: 2.3522
    kilometrageFin: 150050
    commentaireFin: "Mission complétée sans incident"
    
    # ✅ PHOTOS APRÈS LA LIVRAISON (optionnelles)
    photosPost: [
      {
        typeMedia: "PHOTO_AVANT_FINAL"
        base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."
      },
      {
        typeMedia: "PREUVE_LIVRAISON"
        base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."
      }
    ]
  }) {
    id
    statut
    dateFin
    medias {
      typeMedia
      cheminFichier
    }
  }
}
```

### 3. Upload photos pour une session existante
```graphql
mutation {
  uploadMissionPhotos(input: {
    sessionId: "uuid"
    etape: "PRE_DEPART"
    medias: [
      {
        typeMedia: "PHOTO_GAUCHE"
        base64Data: "data:image/jpeg;base64,..."
      },
      {
        typeMedia: "PHOTO_DROIT"
        base64Data: "data:image/jpeg;base64,..."
      }
    ]
  }) {
    id
    typeMedia
    cheminFichier
    urlPublic
    dateCreation
  }
}
```

---

## 📖 Queries GraphQL

### 1. Récupérer la session d'une réservation
```graphql
query {
  getMissionSession(reservationId: "uuid") {
    id
    statut
    medias {
      id
      etape
      typeMedia
      urlPublic
      dateCreation
    }
  }
}
```

### 2. Récupérer les photos d'une session
```graphql
query {
  getMissionSessionPhotos(
    sessionId: "uuid"
    etape: "PRE_DEPART"    # Optionnel: filtrer par étape
  ) {
    id
    typeMedia
    cheminFichier
    urlPublic
    tailleOctets
    dateCreation
  }
}
```

### 3. Valider les photos obligatoires pré-départ
```graphql
query {
  validatePreMissionPhotos(sessionId: "uuid") {
    valide: Boolean
    manquantes: [String!]
    # Exemple manquantes: ["PHOTO_GAUCHE", "PHOTO_CARBURANT"]
  }
}
```

### 4. Valider les photos obligatoires post-livraison
```graphql
query {
  validatePostMissionPhotos(sessionId: "uuid") {
    valide: Boolean
    manquantes: [String!]
  }
}
```

---

## 💾 Stockage des Fichiers

### Structure des répertoires
```
uploads/
└── mission-sessions/
    └── <sessionId>/
        ├── <sessionId>_PHOTO_AVANT_<timestamp>.jpg
        ├── <sessionId>_PERMIS_RECTO_<timestamp>.jpg
        ├── <sessionId>_PHOTO_AVANT_FINAL_<timestamp>.jpg
        └── ...
```

### Gestion des fichiers
- **Format accepté**: base64 avec mime type (image/jpeg, image/png, etc.)
- **Stockage**: Système de fichiers local dans `uploads/mission-sessions/`
- **Métadonnées**: Taille, type mime, date créée, URL publique
- **Sécurité**: Vérification d'ownership (userid) pour chaque upload

---

## ✅ Photos Obligatoires

### Avant la mission (PRE_DEPART) - 10 photos/documents
1. **PHOTO_AVANT** - Vue avant du véhicule
2. **PHOTO_ARRIERE** - Vue arrière
3. **PHOTO_GAUCHE** - Côté gauche
4. **PHOTO_DROIT** - Côté droit
5. **PHOTO_INTERIEUR** - Intérieur du véhicule
6. **PHOTO_TABLEAU_BORD** - Tableau de bord
7. **PHOTO_CARBURANT** - Jauge de carburant
8. **PERMIS_RECTO_CONDUCTEUR** - Recto du permis
9. **PERMIS_VERSO_CONDUCTEUR** - Verso du permis
10. **DEGATS_PRE_MISSION** - Dégâts existants (optionnel)

### Après la livraison (POST_LIVRAISON) - 7 photos obligatoires
1. **PHOTO_AVANT_FINAL** - Vue avant finale
2. **PHOTO_ARRIERE_FINAL** - Vue arrière finale
3. **PHOTO_GAUCHE_FINAL** - Côté gauche final
4. **PHOTO_DROIT_FINAL** - Côté droit final
5. **PHOTO_INTERIEUR_FINAL** - Intérieur final
6. **PHOTO_TABLEAU_BORD_FINAL** - Tableau de bord final
7. **PREUVE_LIVRAISON** - Preuve de livraison (signature/confirmation)

### Optionnels
- **CARBURANT_FINAL** - Jauge final
- **DEGATS_POST_MISSION** - Nouveaux dégâts
- **SIGNATURE_CLIENT** - Signature client

---

## 🔒 Sécurité et Permissions

✅ Authentification JWT requise  
✅ Rôle `ADHERENT` requis  
✅ Vérification d'ownership de session  
✅ Validation des types de fichier  
✅ Limite de taille (configurable)  
✅ Nettoyage automatique des répertoires temporaires

---

## 📝 Statuts de Session

```
EN_COURS     → Session démarrée, mission en cours
TERMINEE     → Session fermée, mission complétée
```

---

## 🔄 Flux Complet d'une Mission

```
1. Adhérent crée une RESERVATION_MISSION
   ↓
2. Adhérent confirme: statut = CONFIRMED_BY_ADHERENT
   ↓
3. [OPTIONNEL] Adhérent upload photos PRE_DEPART via startMissionSession
   ↓
4. Adhérent appelle startMissionSession
   → Session créée avec statut EN_COURS
   → Mission passe à EN_COURS
   ↓
5. [EN ROUTE] Adhérent peut ajouter photos via uploadMissionPhotos
   ↓
6. [OPTIONNEL] Adhérent upload photos POST_LIVRAISON via endMissionSession
   ↓
7. Adhérent appelle endMissionSession avec photos finales
   → Session passe à TERMINEE
   → Mission passe à TERMINEE
   → Toutes les preuves visuelles sont conservées
```

---

## 🚧 Prochaines Améliorations Recommandées

1. Intégration avec service de stockage cloud (AWS S3, Google Cloud Storage)
2. Compression automatique des images
3. Validation anti-fraude avec IA (détection de dégâts, contrôle d'identité)
4. Signature numérique pour les preuves de livraison
5. Historique des modifications (audit trail)
6. Endpoint de suppression de photos avec soft delete
7. Rate limiting sur les uploads
8. Webhook pour notification de complétion

---

**Auteur**: Backend Adaptation System  
**Date**: 20 Mai 2026  
**Statut**: ✅ Implémentation Complétée
