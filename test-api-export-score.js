/**
 * Test API Export Score Logistique
 * Usage: node test-api-export-score.js
 * 
 * Exemples d'utilisation de l'API d'export des paramètres de score
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const MISSION_ID = process.env.MISSION_ID || '550e8400-e29b-41d4-a716-446655440000';

// ────────────────────────────────────────────────────────
// Utility functions
// ────────────────────────────────────────────────────────

async function request(endpoint, method = 'GET', params = null) {
  try {
    console.log(`\n📡 ${method} ${BASE_URL}${endpoint}`);
    const response = await axios.request({
      method,
      url: `${BASE_URL}${endpoint}`,
      params,
      timeout: 5000,
    });
    return response.data;
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
    return null;
  }
}

function printHeader(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`📌 ${title}`);
  console.log('='.repeat(60));
}

function printSection(title) {
  console.log(`\n--- ${title} ---`);
}

// ────────────────────────────────────────────────────────
// TEST 1: Health Check
// ────────────────────────────────────────────────────────
async function testHealthCheck() {
  printHeader('TEST 1: Health Check');
  const result = await request('/score-ml/health');
  
  if (result) {
    console.log('✅ Service actif');
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.message}`);
  }
}

// ────────────────────────────────────────────────────────
// TEST 2: Export Single Mission
// ────────────────────────────────────────────────────────
async function testExportSingleMission() {
  printHeader('TEST 2: Export Paramètres d\'une Mission');
  
  const data = await request(`/score-ml/export/mission/${MISSION_ID}`);
  
  if (data) {
    console.log('✅ Données reçues avec succès\n');
    
    printSection('Identifiants');
    console.log(`  Mission ID: ${data.missionId}`);
    console.log(`  Session ID: ${data.sessionId}`);
    console.log(`  Adherent ID: ${data.adherentId}`);
    
    printSection('Profil Conducteur');
    console.log(`  Nom: ${data.conducteurPrenom} ${data.conducteurNom}`);
    console.log(`  Age: ${data.conducteurAge} ans`);
    console.log(`  Téléphone: ${data.conducteurTelephone}`);
    console.log(`  Note: ${data.noteAgentConducteur} ⭐`);
    
    printSection('Véhicule');
    console.log(`  Type: ${data.typeVehicule}`);
    console.log(`  État: ${data.etatVehicule}`);
    console.log(`  Immatriculation: ${data.immatriculation}`);
    
    printSection('Timing Prévisionnel vs Réel');
    console.log(`  Départ prévU: ${new Date(data.dateDepart).toLocaleString('fr-FR')}`);
    console.log(`  Départ réel: ${new Date(data.departReel).toLocaleString('fr-FR')}`);
    console.log(`  Retard: ${data.retardDepart} minutes`);
    console.log('');
    console.log(`  Arrivée prévue: ${data.dateArrivee ? new Date(data.dateArrivee).toLocaleString('fr-FR') : 'N/A'}`);
    console.log(`  Arrivée réelle: ${data.arriveeReelle ? new Date(data.arriveeReelle).toLocaleString('fr-FR') : 'N/A'}`);
    console.log(`  Retard: ${data.retardArrivee} minutes`);
    
    printSection('Distance');
    console.log(`  Distance km: ${data.distanceKm} km`);
    console.log(`  Distance GPS: ${data.distanceGPS || 'N/A'} km`);
    
    printSection('Localisation Départ');
    console.log(`  Adresse: ${data.adresseDepart}`);
    console.log(`  Ville: ${data.villeDepartCodePostal}`);
    console.log(`  GPS: ${data.latitudeDepartReelle}, ${data.longitudeDepartReelle}`);
    
    printSection('Localisation Arrivée');
    console.log(`  Adresse: ${data.adresseArrivee}`);
    console.log(`  Ville: ${data.villeArriveeCodePostal}`);
    console.log(`  GPS: ${data.latitudeArriveeReelle}, ${data.longitudeArriveeReelle}`);
    console.log(`  Écart vs position prévue: ${data.distanceArriveeReelleM} mètres`);
    
    printSection('Conditions Externes');
    console.log(`  Météo: ${data.conditionsMeteo}`);
    console.log(`  Jour de semaine: ${['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][data.joursemaine]}`);
    console.log(`  Heure départ: ${data.heureDépart}:00`);
    console.log(`  Mois: ${data.mois}`);
    console.log(`  Saison: ${data.saison}`);
    
    printSection('Statut');
    console.log(`  Mission: ${data.statusMission}`);
    console.log(`  Session: ${data.statusSession}`);
    
    printSection('Scores');
    console.log(`  Score Logistique: ${data.scoreLogistiqueActuel || 'N/A'}`);
    console.log(`  Prédiction: ${data.labelScorePrediction || 'N/A'}`);
    console.log(`  Score Sécurité: ${data.scoreSecuriteActuel || 'N/A'}`);
    
    printSection('Métadonnées');
    console.log(`  Temps d'exécution: ${data.tempsExecution}ms`);
    console.log(`  Date export: ${new Date(data.dateExport).toLocaleString('fr-FR')}`);
    
    return data;
  }
}

// ────────────────────────────────────────────────────────
// TEST 3: Analysis - Check for Issues
// ────────────────────────────────────────────────────────
async function analyzeScoreParameters(data) {
  printHeader('TEST 3: Analyse des Paramètres');
  
  if (!data) return;
  
  console.log('🔍 Vérification des paramètres pour identifier les problèmes...\n');
  
  const issues = [];
  
  // Retard départ
  if (data.retardDepart > 30) {
    issues.push(`⚠️  Retard de départ IMPORTANT: ${data.retardDepart} minutes`);
  } else if (data.retardDepart > 0) {
    issues.push(`⚠️  Retard de départ léger: ${data.retardDepart} minutes`);
  }
  
  // Retard arrivée
  if (data.retardArrivee > 60) {
    issues.push(`❌ Retard d'arrivée CRITIQUE: ${data.retardArrivee} minutes`);
  } else if (data.retardArrivee > 30) {
    issues.push(`⚠️  Retard d'arrivée important: ${data.retardArrivee} minutes`);
  }
  
  // Distance arrivée
  if (data.distanceArriveeReelleM > 10000) {
    issues.push(`❌ Arrivée loin du point prévu: ${Math.round(data.distanceArriveeReelleM / 1000)} km`);
  } else if (data.distanceArriveeReelleM > 1000) {
    issues.push(`⚠️  Arrivée écartée du point: ${Math.round(data.distanceArriveeReelleM)} mètres`);
  }
  
  // Conditions météo
  if (['Stormy', 'Sandstorms'].includes(data.conditionsMeteo)) {
    issues.push(`⚠️  Conditions météo difficiles: ${data.conditionsMeteo}`);
  }
  
  // Note conducteur
  if (data.noteAgentConducteur < 3) {
    issues.push(`⚠️  Note conducteur basse: ${data.noteAgentConducteur}`);
  }
  
  // Affichage
  if (issues.length === 0) {
    console.log('✅ Aucun problème majeur détecté!');
  } else {
    issues.forEach(issue => console.log(issue));
  }
  
  console.log('\n💡 Recommandations:');
  console.log('  - Retard départ >30min impacte négativement le score');
  console.log('  - Retard arrivée >60min est critique');
  console.log('  - Arrivée loin du point prévue peut invalider la mission');
  console.log('  - Conditions météo difficiles réduisent le score attendu');
}

// ────────────────────────────────────────────────────────
// TEST 4: Export Multiple Missions
// ────────────────────────────────────────────────────────
async function testExportMultipleMissions() {
  printHeader('TEST 4: Export Plusieurs Missions');
  
  // Exemple avec 3 missions (à remplacer)
  const missionIds = [
    'mission-id-1',
    'mission-id-2',
    'mission-id-3',
  ];
  
  const ids = missionIds.join(',');
  const data = await request(`/score-ml/export/missions`, 'GET', { ids });
  
  if (data && Array.isArray(data)) {
    console.log(`✅ ${data.length} missions exportées\n`);
    
    data.forEach((mission, index) => {
      console.log(`${index + 1}. ${mission.conducteur}`);
      console.log(`   Mission: ${mission.missionId}`);
      console.log(`   Route: ${mission.adresseDepart} → ${mission.adresseArrivee}`);
      console.log(`   Distance: ${mission.distanceKm} km`);
      console.log(`   Retards: départ=${mission.retardDepart}min, arrivée=${mission.retardArrivee}min`);
      console.log(`   Score: ${mission.scoreLogistique || 'N/A'}`);
      console.log(`   Status: ${mission.status}`);
      console.log('');
    });
  }
}

// ────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 TEST API EXPORT SCORE LOGISTIQUE');
  console.log(`📍 API URL: ${BASE_URL}`);
  console.log(`📌 Mission ID: ${MISSION_ID}`);
  
  try {
    await testHealthCheck();
    const data = await testExportSingleMission();
    await analyzeScoreParameters(data);
    await testExportMultipleMissions();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Tous les tests sont terminés!');
    console.log('='.repeat(60));
    console.log('\n📚 Documentation:');
    console.log('  - SCORE_EXPORT_API.md');
    console.log('  - API_EXPORT_SCORE_README.md');
    console.log('');
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Exécution
if (require.main === module) {
  main();
}

module.exports = {
  request,
  testHealthCheck,
  testExportSingleMission,
  analyzeScoreParameters,
  testExportMultipleMissions,
};
