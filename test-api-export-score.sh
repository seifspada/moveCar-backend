#!/bin/bash

# 📊 EXEMPLE D'UTILISATION API EXPORT SCORE LOGISTIQUE
# ================================================

echo "🚀 Démarrage des tests de l'API Export Score Logistique"
echo ""

# Configuration
BASE_URL="http://localhost:3000"
MISSION_ID="550e8400-e29b-41d4-a716-446655440000"  # À remplacer par un vrai ID

# ────────────────────────────────────────────────────────
# 1. TEST HEALTH CHECK
# ────────────────────────────────────────────────────────
echo "📌 TEST 1: Health Check"
echo "───────────────────────"
echo "GET ${BASE_URL}/score-ml/health"
echo ""
curl -X GET "${BASE_URL}/score-ml/health" 2>/dev/null | jq . || echo "❌ Service indisponible"
echo ""
echo ""

# ────────────────────────────────────────────────────────
# 2. EXPORT PARAMETRES POUR UNE MISSION
# ────────────────────────────────────────────────────────
echo "📌 TEST 2: Export paramètres d'une mission"
echo "──────────────────────────────────────────"
echo "GET ${BASE_URL}/score-ml/export/mission/${MISSION_ID}"
echo ""
echo "Récupération des données..."

RESPONSE=$(curl -s -X GET "${BASE_URL}/score-ml/export/mission/${MISSION_ID}" 2>/dev/null)

if echo "$RESPONSE" | jq . > /dev/null 2>&1; then
    echo "✅ Succès! Affichage des paramètres clés:"
    echo ""
    echo "Mission ID: $(echo "$RESPONSE" | jq -r '.missionId')"
    echo "Conducteur: $(echo "$RESPONSE" | jq -r '.conducteurPrenom') $(echo "$RESPONSE" | jq -r '.conducteurNom')"
    echo "Age: $(echo "$RESPONSE" | jq -r '.conducteurAge') ans"
    echo "Note: $(echo "$RESPONSE" | jq -r '.noteAgentConducteur') ⭐"
    echo ""
    echo "--- Timing ---"
    echo "Date départ (prévue): $(echo "$RESPONSE" | jq -r '.dateDepart')"
    echo "Date départ (réelle): $(echo "$RESPONSE" | jq -r '.departReel')"
    echo "Retard départ: $(echo "$RESPONSE" | jq -r '.retardDepart') min"
    echo ""
    echo "--- Distance ---"
    echo "Distance km: $(echo "$RESPONSE" | jq -r '.distanceKm') km"
    echo "Distance GPS: $(echo "$RESPONSE" | jq -r '.distanceGPS') km"
    echo ""
    echo "--- Conditions ---"
    echo "Météo: $(echo "$RESPONSE" | jq -r '.conditionsMeteo')"
    echo "Jour semaine: $(echo "$RESPONSE" | jq -r '.joursemaine')"
    echo "Saison: $(echo "$RESPONSE" | jq -r '.saison')"
    echo ""
    echo "--- Score ---"
    echo "Score logistique actuel: $(echo "$RESPONSE" | jq -r '.scoreLogistiqueActuel')"
    echo "Prédiction: $(echo "$RESPONSE" | jq -r '.labelScorePrediction')"
    echo ""
    echo "📊 Données complètes (JSON):"
    echo "$RESPONSE" | jq .
else
    echo "❌ Erreur: Mission non trouvée ou erreur serveur"
    echo "Réponse: $RESPONSE"
fi
echo ""
echo ""

# ────────────────────────────────────────────────────────
# 3. EXPORT PARAMETRES POUR PLUSIEURS MISSIONS
# ────────────────────────────────────────────────────────
echo "📌 TEST 3: Export pour plusieurs missions"
echo "──────────────────────────────────────────"
MISSION_IDS="mission-id-1,mission-id-2,mission-id-3"
echo "GET ${BASE_URL}/score-ml/export/missions?ids=${MISSION_IDS}"
echo ""
echo "Récupération des données..."

curl -s -X GET "${BASE_URL}/score-ml/export/missions?ids=${MISSION_IDS}" 2>/dev/null | jq . || echo "❌ Erreur"
echo ""
echo ""

# ────────────────────────────────────────────────────────
# 4. EXPORT ET ANALYSE AVEC JQ
# ────────────────────────────────────────────────────────
echo "📌 TEST 4: Analyse des retards"
echo "───────────────────────────────"
echo "Récupération et analyse..."
echo ""

RESPONSE=$(curl -s -X GET "${BASE_URL}/score-ml/export/mission/${MISSION_ID}" 2>/dev/null)

if echo "$RESPONSE" | jq . > /dev/null 2>&1; then
    RETARD_DEPART=$(echo "$RESPONSE" | jq -r '.retardDepart')
    RETARD_ARRIVEE=$(echo "$RESPONSE" | jq -r '.retardArrivee')
    
    echo "Retard départ: ${RETARD_DEPART} minutes"
    echo "Retard arrivée: ${RETARD_ARRIVEE} minutes"
    echo ""
    
    if [ "$RETARD_DEPART" -eq 0 ]; then
        echo "✅ Départ à l'heure"
    elif [ "$RETARD_DEPART" -lt 15 ]; then
        echo "⚠️  Départ avec léger retard"
    else
        echo "❌ Départ avec retard important"
    fi
    
    if [ "$RETARD_ARRIVEE" -eq 0 ]; then
        echo "✅ Arrivée à l'heure"
    elif [ "$RETARD_ARRIVEE" -lt 30 ]; then
        echo "⚠️  Arrivée avec léger retard"
    else
        echo "❌ Arrivée avec retard important"
    fi
fi
echo ""
echo ""

# ────────────────────────────────────────────────────────
# 5. EXPORT ET SAUVEGARDE EN FICHIER
# ────────────────────────────────────────────────────────
echo "📌 TEST 5: Export et sauvegarde en JSON"
echo "───────────────────────────────────────"
OUTPUT_FILE="score_parameters_$(date +%Y%m%d_%H%M%S).json"
echo "Sauvegarde dans: $OUTPUT_FILE"
echo ""

curl -s -X GET "${BASE_URL}/score-ml/export/mission/${MISSION_ID}" 2>/dev/null | jq . > "$OUTPUT_FILE"

if [ -f "$OUTPUT_FILE" ]; then
    echo "✅ Fichier créé avec succès"
    echo "Taille: $(du -h "$OUTPUT_FILE" | cut -f1)"
    echo "Aperçu:"
    head -20 "$OUTPUT_FILE"
else
    echo "❌ Erreur lors de la création du fichier"
fi
echo ""

# ────────────────────────────────────────────────────────
# RÉSUMÉ
# ────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════"
echo "✅ Tests terminés!"
echo "════════════════════════════════════════════════════"
echo ""
echo "📚 Endpoints disponibles:"
echo "  1. GET /score-ml/health"
echo "  2. GET /score-ml/export/mission/{missionId}"
echo "  3. GET /score-ml/export/missions?ids=id1,id2,id3"
echo ""
echo "📖 Documentation complète:"
echo "  - SCORE_EXPORT_API.md"
echo "  - API_EXPORT_SCORE_README.md"
echo ""
