# 📊 API Export Données Score Logistique - Résumé Rapide

## ✅ Qu'est-ce qui a été créé ?

Une **API REST** pour exporter les **paramètres et données** utilisés pour calculer le score logistique, SANS calculer le score.

### 📍 Objectif
Voir tous les **paramètres** de score d'une mission :
- Age du conducteur
- Retard de départ
- Retard d'arrivée
- Distance (km)
- Conditions météo
- Jour de la semaine
- Adresses, positions GPS
- Etc...

---

## 🔗 Endpoints API

### 1️⃣ Une mission
```
GET http://localhost:3000/score-ml/export/mission/{missionId}
```

**Exemple:**
```bash
curl http://localhost:3000/score-ml/export/mission/550e8400-e29b-41d4-a716-446655440000
```

**Retourne:** Objet JSON avec TOUS les paramètres

---

### 2️⃣ Plusieurs missions
```
GET http://localhost:3000/score-ml/export/missions?ids=id1,id2,id3
```

**Exemple:**
```bash
curl "http://localhost:3000/score-ml/export/missions?ids=mission1,mission2,mission3"
```

**Retourne:** Array d'objets résumé

---

### 3️⃣ Test de service
```
GET http://localhost:3000/score-ml/health
```

---

## 📋 Paramètres retournés

| Paramètre | Description | Exemple |
|-----------|-------------|---------|
| `conducteurAge` | Age du chauffeur | 35 |
| `noteAgentConducteur` | Note (1-5) | 4.5 |
| `distanceKm` | Distance mission | 250 |
| `retardDepart` | Retard au départ (min) | 15 |
| `retardArrivee` | Retard à l'arrivée (min) | 45 |
| `conditionsMeteo` | Météo | Sunny |
| `joursemaine` | Jour (0=Lundi) | 4 |
| `heureDépart` | Heure de départ | 8 |
| `typeVehicule` | Type de véhicule | VU_6M3 |
| `latitudeDepartReelle` | GPS départ | 48.8566 |
| `latitudeArriveeReelle` | GPS arrivée | 48.8014 |
| `distanceArriveeReelleM` | Écart position (m) | 125 |
| `scoreLogistiqueActuel` | Score existant | 3.8 |

---

## 🔧 Fichiers créés/modifiés

### ✨ Créés
- `src/Module/scores-ml/scores-ml.controller.ts` - Contrôleur REST (3 endpoints)
- `src/Module/scores-ml/dto/export-score-parameters.dto.ts` - DTOs TypeScript (2 classes)
- `SCORE_EXPORT_API.md` - Documentation complète

### 🔄 Modifiés
- `src/Module/scores-ml/scores-ml.service.ts` - Ajout 2 méthodes
  - `exportScoreParameters(missionId)` - Exporte 1 mission
  - `exportScoreParametersForMissions(missionIds)` - Exporte plusieurs missions
- `src/Module/scores-ml/scores-ml.module.ts` - Ajout du contrôleur au module

---

## 💡 Cas d'utilisation

### 📊 Analyse des données
```bash
# Récupérer les données
curl http://localhost:3000/score-ml/export/mission/my-id | jq .

# Voir les retards
jq '.retardDepart, .retardArrivee' response.json
```

### 🔍 Debug - Pourquoi un score est bas ?
```bash
curl http://localhost:3000/score-ml/export/mission/problem-id | jq .
# → Vérifier les retards, conditions météo, distance GPS vs prévue
```

### 📥 Export dataset
```bash
curl "http://localhost:3000/score-ml/export/missions?ids=m1,m2,m3,m4,m5" > data.json
# → Analyser les données en masse
```

---

## 🚀 Utilisation

Le service est **prêt à l'emploi**. Les endpoints sont disponibles immédiatement après le redémarrage du serveur NestJS :

```bash
# Tester que ça marche
curl http://localhost:3000/score-ml/health

# Résultat:
# {"status":"OK","message":"Service Score ML actif - Export de parametres disponible"}
```

---

## 📚 Documentation complète

Voir [SCORE_EXPORT_API.md](./SCORE_EXPORT_API.md) pour :
- Exemples détaillés de réponse JSON
- Codes d'erreur
- Exemples de code (Python, JavaScript)
- Mapping avec les inputs du ML service
- Intégration pratique

---

## ❓ Questions ?

Les paramètres exportés correspondent aux paramètres d'entrée du ML service :
- `delivery_person_age` ← `conducteurAge`
- `distance_km` ← `distanceKm`
- `pickup_delay_min` ← `retardDepart`
- etc...

**Vous voyez les données, pas le calcul du score.**
