# 🎬 Guide d'Utilisation Pratique - Mission Session avec Photos

## 📱 Scénario: Livraison de véhicule complète

### Étape 1️⃣ : Adhérent confirme sa réservation

```javascript
// Frontend - Statut de réservation passe à CONFIRMED_BY_ADHERENT
const reservation = {
  id: "res_12345",
  statut: "CONFIRMED_BY_ADHERENT",
  missionId: "mission_67890"
};
```

---

### Étape 2️⃣ : Adhérent prend photos AVANT départ

L'adhérent prend les 10 photos/documents obligatoires avec son téléphone:

```javascript
// Exemple: Convertir une image en base64
async function capturePhotoAsBase64(imageFile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      // Format: "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."
      resolve(base64);
    };
    reader.readAsDataURL(imageFile);
  });
}

// Tableau des photos requises à capturer
const photosRequises = [
  "PHOTO_AVANT",
  "PHOTO_ARRIERE",
  "PHOTO_GAUCHE",
  "PHOTO_DROIT",
  "PHOTO_INTERIEUR",
  "PHOTO_TABLEAU_BORD",
  "PHOTO_CARBURANT",
  "PERMIS_RECTO_CONDUCTEUR",
  "PERMIS_VERSO_CONDUCTEUR"
];
```

---

### Étape 3️⃣ : Démarrer la mission avec photos

```graphql
# GraphQL Mutation
mutation {
  startMissionSession(input: {
    reservationId: "res_12345"
    consentAccepted: true
    latitudeDebut: 48.8566
    longitudeDebut: 2.3522
    kilometrageDebut: 150000
    
    photosPre: [
      {
        typeMedia: "PHOTO_AVANT"
        base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAZABkA..."
        description: "Vue avant du véhicule"
      },
      {
        typeMedia: "PHOTO_ARRIERE"
        base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAZABkA..."
        description: "Vue arrière du véhicule"
      },
      {
        typeMedia: "PHOTO_GAUCHE"
        base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAZABkA..."
      },
      {
        typeMedia: "PHOTO_DROIT"
        base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAZABkA..."
      },
      {
        typeMedia: "PHOTO_INTERIEUR"
        base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAZABkA..."
      },
      {
        typeMedia: "PHOTO_TABLEAU_BORD"
        base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAZABkA..."
      },
      {
        typeMedia: "PHOTO_CARBURANT"
        base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAZABkA..."
        description: "Carburant à 3/4"
      },
      {
        typeMedia: "PERMIS_RECTO_CONDUCTEUR"
        base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAZABkA..."
      },
      {
        typeMedia: "PERMIS_VERSO_CONDUCTEUR"
        base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAZABkA..."
      }
    ]
  }) {
    id
    reservationId
    missionId
    statut
    dateDebut
    medias {
      id
      typeMedia
      cheminFichier
      urlPublic
      dateCreation
    }
  }
}
```

**Réponse attendue:**
```json
{
  "data": {
    "startMissionSession": {
      "id": "session_abc123",
      "reservationId": "res_12345",
      "missionId": "mission_67890",
      "statut": "EN_COURS",
      "dateDebut": "2026-05-20T14:30:00Z",
      "medias": [
        {
          "id": "media_1",
          "typeMedia": "PHOTO_AVANT",
          "cheminFichier": "uploads/mission-sessions/session_abc123/session_abc123_PHOTO_AVANT_1716211800000.jpg",
          "urlPublic": "/media/uploads/mission-sessions/session_abc123/session_abc123_PHOTO_AVANT_1716211800000.jpg",
          "dateCreation": "2026-05-20T14:30:00Z"
        },
        // ... autres photos
      ]
    }
  }
}
```

---

### Étape 4️⃣ : En route - Options supplémentaires

#### Option A: Ajouter des photos de dégâts existants

```graphql
mutation {
  uploadMissionPhotos(input: {
    sessionId: "session_abc123"
    etape: "PRE_DEPART"
    medias: [
      {
        typeMedia: "DEGATS_PRE_MISSION"
        base64Data: "data:image/jpeg;base64,..."
        description: "Rayure sur le pare-choc avant"
      }
    ]
  }) {
    id
    typeMedia
    description
    dateCreation
  }
}
```

#### Option B: Consulter les photos actuelles

```graphql
query {
  getMissionSessionPhotos(
    sessionId: "session_abc123"
    etape: "PRE_DEPART"
  ) {
    id
    typeMedia
    description
    cheminFichier
    urlPublic
    tailleOctets
    dateCreation
  }
}
```

---

### Étape 5️⃣ : À destination - Photos FINALES

Adhérent prend les 7 photos obligatoires final + documents additionnels:

```graphql
mutation {
  endMissionSession(input: {
    sessionId: "session_abc123"
    latitudeFin: 48.9566
    longitudeFin: 2.4522
    kilometrageFin: 150050
    commentaireFin: "Mission complétée sans incident"
    
    photosPost: [
      {
        typeMedia: "PHOTO_AVANT_FINAL"
        base64Data: "data:image/jpeg;base64,..."
        description: "État final - sans dégâts"
      },
      {
        typeMedia: "PHOTO_ARRIERE_FINAL"
        base64Data: "data:image/jpeg;base64,..."
      },
      {
        typeMedia: "PHOTO_GAUCHE_FINAL"
        base64Data: "data:image/jpeg;base64,..."
      },
      {
        typeMedia: "PHOTO_DROIT_FINAL"
        base64Data: "data:image/jpeg;base64,..."
      },
      {
        typeMedia: "PHOTO_INTERIEUR_FINAL"
        base64Data: "data:image/jpeg;base64,..."
      },
      {
        typeMedia: "PHOTO_TABLEAU_BORD_FINAL"
        base64Data: "data:image/jpeg;base64,..."
      },
      {
        typeMedia: "PREUVE_LIVRAISON"
        base64Data: "data:image/jpeg;base64,..."
        description: "Signature du client"
      }
    ]
  }) {
    id
    statut
    dateFin
    commentaireFin
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

---

### Étape 6️⃣ : Validation des photos obligatoires

**Avant de démarrer:**
```graphql
query {
  validatePreMissionPhotos(sessionId: "session_abc123") {
    valide
    manquantes
  }
}
```

**Avant de terminer:**
```graphql
query {
  validatePostMissionPhotos(sessionId: "session_abc123") {
    valide
    manquantes
  }
}
```

**Réponse si complètes:**
```json
{
  "valide": true,
  "manquantes": []
}
```

**Réponse si incomplètes:**
```json
{
  "valide": false,
  "manquantes": ["PHOTO_CARBURANT", "PERMIS_VERSO_CONDUCTEUR"]
}
```

---

## 🔍 Récupération des informations de session

```graphql
query {
  getMissionSession(reservationId: "res_12345") {
    id
    statut
    dateDebut
    dateFin
    latitudeDebut
    longitudeDebut
    latitudeFin
    longitudeFin
    kilometrageDebut
    kilometrageFin
    commentaireFin
    
    # Toutes les photos
    medias {
      id
      etape
      typeMedia
      description
      cheminFichier
      urlPublic
      tailleOctets
      typeContenu
      dateCreation
    }
  }
}
```

---

## 🛠️ Gestion des erreurs

### Erreur: Photos obligatoires manquantes

```json
{
  "errors": [{
    "message": "La photo PHOTO_AVANT est obligatoire"
  }]
}
```

**Solution**: Ajouter via `uploadMissionPhotos` avant le démarrage

### Erreur: Format base64 invalide

```json
{
  "errors": [{
    "message": "Format base64 invalide. Doit être: data:image/jpeg;base64,<données>"
  }]
}
```

**Solution**: Vérifier le format: `data:<mime-type>;base64,<données>`

### Erreur: Permission refusée

```json
{
  "errors": [{
    "message": "Cette session ne vous appartient pas."
  }]
}
```

**Solution**: Vérifier que vous êtes le propriétaire de la réservation/session

---

## 📊 Exemple de flux complet côté Frontend (React)

```typescript
// Mission Session Manager Component
import { useMutation, useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const START_MISSION_MUTATION = gql`
  mutation StartMission($input: StartMissionSessionInput!) {
    startMissionSession(input: $input) {
      id
      statut
      medias { id typeMedia urlPublic }
    }
  }
`;

export function MissionSessionManager({ reservationId }) {
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [startMission] = useMutation(START_MISSION_MUTATION);

  // Capturer une photo
  const capturePhoto = async (type: string) => {
    const imageFile = await openCamera();
    const base64 = await fileToBase64(imageFile);
    setPhotos(prev => ({
      ...prev,
      [type]: base64
    }));
  };

  // Démarrer la mission avec toutes les photos
  const handleStartMission = async (latitude: number, longitude: number) => {
    const photosPre = Object.entries(photos).map(([type, data]) => ({
      typeMedia: type,
      base64Data: data
    }));

    await startMission({
      variables: {
        input: {
          reservationId,
          consentAccepted: true,
          latitudeDebut: latitude,
          longitudeDebut: longitude,
          photosPre
        }
      }
    });
  };

  return (
    <div>
      {PHOTOS_REQUISES.map(photo => (
        <button key={photo} onClick={() => capturePhoto(photo)}>
          📸 Prendre {photo}
          {photos[photo] && '✅'}
        </button>
      ))}
      <button onClick={() => handleStartMission(48.8566, 2.3522)}>
        🚀 Démarrer Mission
      </button>
    </div>
  );
}
```

---

## 📈 Métriques et Monitoring

Après chaque mission, vérifier:
- ✅ Nombre total de photos uploadées
- ✅ Taille totale des fichiers
- ✅ Durée de la mission
- ✅ Distance parcourue
- ✅ Dégâts signalés (pré/post)

```graphql
query {
  getMissionSession(reservationId: "res_12345") {
    id
    medias {
      typeMedia
      tailleOctets
    }
  }
}
```

---

**Guide créé**: 20 Mai 2026  
**Version**: 1.0  
**Statut**: 🟢 Production Ready
