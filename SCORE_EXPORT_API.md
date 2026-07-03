# API Export Paramètres Score Logistique

## Vue d'ensemble

Cette API permet d'**exporter les données/paramètres utilisés pour calculer le score logistique** sans faire le calcul du score lui-même. C'est utile pour :

✅ Voir tous les paramètres d'une mission
✅ Analyser les données avant scoring
✅ Vérifier les calculs de retard, distance, etc.
✅ Faire du debugging et du monitoring
✅ Exporter les données pour analyse/reporting

## Endpoints

### 1. Exporter les paramètres d'une mission

```
GET /score-ml/export/mission/{missionId}
```

**Paramètres:**
- `missionId` (path) : ID unique de la mission

**Réponse (200):**
```json
{
  "missionId": "uuid-mission-123",
  "sessionId": "uuid-session-456",
  "adherentId": 1,
  
  "conducteurAge": 35,
  "conducteurNom": "Dupont",
  "conducteurPrenom": "Jean",
  "conducteurTelephone": "+33612345678",
  "noteAgentConducteur": 4.5,
  
  "typeVehicule": "VU_6M3",
  "etatVehicule": 2,
  "immatriculation": "AB-123-CD",
  
  "dateDepart": "2026-07-03T08:00:00.000Z",
  "dateArrivee": "2026-07-03T17:00:00.000Z",
  "heureDepart": "08:00",
  "heureArrivee": "17:00",
  
  "departReel": "2026-07-03T08:15:30.000Z",
  "arriveeReelle": "2026-07-03T17:45:20.000Z",
  
  "retardDepart": 15,
  "retardArrivee": 45,
  
  "distanceKm": 250,
  "distanceGPS": 265,
  
  "adresseDepart": "123 Rue de Paris",
  "villeDepartCodePostal": "Paris 75001",
  "latitudeDepartReelle": 48.8566,
  "longitudeDepartReelle": 2.3522,
  
  "adresseArrivee": "456 Avenue Champs",
  "villeArriveeCodePostal": "Versailles 78000",
  "latitudeArriveeReelle": 48.8014,
  "longitudeArriveeReelle": 2.1399,
  "distanceArriveeReelleM": 125,
  
  "conditionsMeteo": "Sunny",
  "joursemaine": 4,
  
  "heureDépart": 8,
  "mois": 7,
  "saison": "Été",
  
  "statusMission": "TERMINEE",
  "statusSession": "TERMINEE",
  
  "scoreLogistiqueActuel": 3.8,
  "labelScorePrediction": "Bon",
  "scoreSecuriteActuel": 4.1,
  
  "dateExport": "2026-07-03T18:00:00.000Z",
  "tempsExecution": 245
}
```

**Erreurs:**
- `404` : Mission non trouvée
- `400` : Données incomplètes pour la mission

**Exemple curl:**
```bash
curl -X GET "http://localhost:3000/score-ml/export/mission/550e8400-e29b-41d4-a716-446655440000"
```

---

### 2. Exporter les paramètres pour plusieurs missions

```
GET /score-ml/export/missions?ids=id1,id2,id3
```

**Paramètres:**
- `ids` (query) : IDs des missions séparées par des virgules

**Réponse (200):**
```json
[
  {
    "missionId": "uuid-mission-1",
    "conducteur": "Jean Dupont",
    "adresseDepart": "123 Rue de Paris 75001",
    "adresseArrivee": "456 Avenue Champs 78000",
    "distanceKm": 250,
    "retardDepart": 15,
    "retardArrivee": 45,
    "dateDepart": "2026-07-03T08:00:00.000Z",
    "dateArrivee": "2026-07-03T17:00:00.000Z",
    "scoreLogistique": 3.8,
    "status": "TERMINEE"
  },
  {
    "missionId": "uuid-mission-2",
    "conducteur": "Marie Dupont",
    "adresseDepart": "789 Rue Lyon 69000",
    "adresseArrivee": "111 Avenue Bellecour 69000",
    "distanceKm": 45,
    "retardDepart": 0,
    "retardArrivee": 5,
    "dateDepart": "2026-07-03T09:00:00.000Z",
    "dateArrivee": "2026-07-03T10:00:00.000Z",
    "scoreLogistique": 4.5,
    "status": "TERMINEE"
  }
]
```

**Erreurs:**
- `400` : Paramètre "ids" manquant ou vide

**Exemple curl:**
```bash
curl -X GET "http://localhost:3000/score-ml/export/missions?ids=mission-1,mission-2,mission-3"
```

---

### 3. Health Check

```
GET /score-ml/health
```

**Réponse (200):**
```json
{
  "status": "OK",
  "message": "Service Score ML actif - Export de parametres disponible"
}
```

---

## Paramètres détaillés

### Profil du Conducteur
- **conducteurAge** : Âge en années (calculé à partir de dateNaissance)
- **noteAgentConducteur** : Note du conducteur (1-5 étoiles)
- **conducteurNom/Prenom** : Identité

### Mission - Timing
- **dateDepart** : Date/heure prévue de départ
- **dateArrivee** : Date/heure prévue d'arrivée
- **departReel** : Date/heure réelle de départ
- **arriveeReelle** : Date/heure réelle d'arrivée
- **retardDepart** : Délai en minutes (positif = retard)
- **retardArrivee** : Délai en minutes (positif = retard)

### Mission - Distance & Localisation
- **distanceKm** : Distance planifiée en km
- **distanceGPS** : Distance réelle parcourue (calculée à partir des kmtrage)
- **distanceArriveeReelleM** : Écart par rapport à l'adresse d'arrivée prévue (en mètres)
- **latitudeDepartReelle/longitudeDepartReelle** : Position GPS de départ
- **latitudeArriveeReelle/longitudeArriveeReelle** : Position GPS d'arrivée

### Conditions Externes
- **conditionsMeteo** : Sunny, Cloudy, Windy, Fog, Stormy, Sandstorms
- **joursemaine** : 0=Lundi, 1=Mardi, ..., 6=Dimanche
- **heureDépart** : Heure de départ (0-23)
- **mois** : 1-12
- **saison** : Hiver, Printemps, Été, Automne

### Véhicule
- **typeVehicule** : CITADINE, VU_6M3, VU_20M3, etc.
- **etatVehicule** : État du véhicule (0, 1, 2)
- **immatriculation** : Plaque d'immatriculation

---

## Utilisation Pratique

### 1. Vérifier les données de scoring d'une mission complétée

```bash
# Récupérer les paramètres d'une mission
curl -X GET "http://localhost:3000/score-ml/export/mission/my-mission-uuid" | jq .

# Vérifier les délais calculés
jq '.retardDepart, .retardArrivee' response.json

# Vérifier les conditions météo
jq '.conditionsMeteo' response.json
```

### 2. Exporter un dataset pour analyse

```bash
# Exporter 10 missions
curl -X GET "http://localhost:3000/score-ml/export/missions?ids=m1,m2,m3,m4,m5,m6,m7,m8,m9,m10" > dataset.json

# Analyser les retards moyens
jq '[.[].retardDepart] | add / length' dataset.json
```

### 3. Debug - Vérifier pourquoi un score est bas

```bash
# Récupérer les paramètres
curl -X GET "http://localhost:3000/score-ml/export/mission/problem-mission" | jq .

# Analyser les problèmes potentiels:
# - retardDepart > 30 min ?
# - retardArrivee > 60 min ?
# - distanceArriveeReelleM > 10000 m (10 km) ?
# - conditionsMeteo = "Stormy" ?
```

---

## Intégration avec le ML Service

Les paramètres exportés par cette API correspondent exactement aux **paramètres d'entrée** du service ML :

| Paramètre API | → | Input ML Service |
|---|---|---|
| conducteurAge | → | delivery_person_age |
| etatVehicule | → | vehicle_condition |
| noteAgentConducteur | → | delivery_person_ratings |
| distanceKm | → | distance_km |
| retardDepart | → | pickup_delay_min |
| retardArrivee | → | delivery_delay_min |
| heureDépart | → | order_hour |
| joursemaine | → | order_day |
| conditionsMeteo | → | weather_conditions |
| typeVehicule | → | mission_type |

**Note:** Le score final n'est pas retourné par cet endpoint. Pour calculer le score, faire un appel séparé au `/predict` du ML service.

---

## Exemples de code

### Python
```python
import requests
import json

url = "http://localhost:3000/score-ml/export/mission/550e8400-e29b-41d4-a716-446655440000"
response = requests.get(url)
data = response.json()

print(f"Mission: {data['missionId']}")
print(f"Conducteur: {data['conducteurPrenom']} {data['conducteurNom']}")
print(f"Distance: {data['distanceKm']} km")
print(f"Retards: départ={data['retardDepart']}min, arrivée={data['retardArrivee']}min")
```

### JavaScript/Node.js
```javascript
const axios = require('axios');

async function getScoreParameters(missionId) {
  try {
    const response = await axios.get(
      `http://localhost:3000/score-ml/export/mission/${missionId}`
    );
    console.log('Paramètres:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

// Utilisation
getScoreParameters('550e8400-e29b-41d4-a716-446655440000');
```

---

## Fichiers modifiés

- ✅ `src/Module/scores-ml/scores-ml.service.ts` - Ajout des méthodes `exportScoreParameters()` et `exportScoreParametersForMissions()`
- ✅ `src/Module/scores-ml/scores-ml.controller.ts` - CRÉÉ - Contrôleur REST
- ✅ `src/Module/scores-ml/dto/export-score-parameters.dto.ts` - CRÉÉ - DTOs de réponse
- ✅ `src/Module/scores-ml/scores-ml.module.ts` - Ajout du contrôleur au module
