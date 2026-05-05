// Test complet du module pretrip-inspection sur Render
const BASE = 'https://movecar-backend.onrender.com';

async function request(path, method, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json();
  return { status: res.status, data: json };
}

async function gql(query, variables, token) {
  return request('/graphql', 'POST', { query, variables }, token);
}

async function main() {
  console.log('='.repeat(60));
  console.log('AUDIT MODULE PRETRIP-INSPECTION — Render');
  console.log('='.repeat(60));

  // ── LOGIN ──
  console.log('\n📋 1. LOGIN ADHERENT...');
  const loginAdh = await request('/auth/login', 'POST', {
    email: 'seifmarzougui555@gmail.com', password: 'Seif edd1'
  });
  const adhToken = loginAdh.data.accessToken;
  console.log(`   ✅ userId=${loginAdh.data.user.id} adherentId=${loginAdh.data.user.adherent.id} role=${loginAdh.data.user.role.name}`);

  console.log('\n📋 2. LOGIN AGENT...');
  const loginAgt = await request('/auth/login', 'POST', {
    email: 'seifeddine.marzougui@episousse.com.tn', password: 'Seif edd1'
  });
  const agtToken = loginAgt.data.accessToken;
  console.log(`   ✅ userId=${loginAgt.data.user.id} agentId=${loginAgt.data.user.agent.id} role=${loginAgt.data.user.role.name}`);

  // ── TEST 1: listInspections (ADHERENT) ──
  console.log('\n📋 3. QUERY listInspections (ADHERENT)...');
  const listAdh = await gql(`query { listInspections { id statut etapeCourante nombreMediasUploades peutEtreValidee dateDebut reservationId } }`, null, adhToken);
  if (listAdh.data.errors) {
    console.log(`   ❌ ERREUR: ${listAdh.data.errors[0].message}`);
    console.log(`   Code: ${listAdh.data.errors[0].extensions?.code}`);
  } else {
    const inspections = listAdh.data.data?.listInspections || [];
    console.log(`   ✅ ${inspections.length} inspection(s) trouvée(s)`);
    inspections.forEach(i => console.log(`      - ${i.id} | ${i.statut} | étape: ${i.etapeCourante} | medias: ${i.nombreMediasUploades}`));
  }

  // ── TEST 2: listInspections (AGENT) ──
  console.log('\n📋 4. QUERY listInspections (AGENT)...');
  const listAgt = await gql(`query { listInspections { id statut etapeCourante nombreMediasUploades peutEtreValidee } }`, null, agtToken);
  if (listAgt.data.errors) {
    console.log(`   ❌ ERREUR: ${listAgt.data.errors[0].message}`);
    console.log(`   Code: ${listAgt.data.errors[0].extensions?.code}`);
  } else {
    const inspections = listAgt.data.data?.listInspections || [];
    console.log(`   ✅ ${inspections.length} inspection(s) trouvée(s)`);
  }

  // ── TEST 3: listPendingInspections (AGENT) ──
  console.log('\n📋 5. QUERY listPendingInspections (AGENT)...');
  const pending = await gql(`query { listPendingInspections { id statut } }`, null, agtToken);
  if (pending.data.errors) {
    console.log(`   ❌ ERREUR: ${pending.data.errors[0].message}`);
  } else {
    console.log(`   ✅ ${(pending.data.data?.listPendingInspections || []).length} inspection(s) en cours`);
  }

  // ── TEST 4: listRejectedInspections (AGENT) ──
  console.log('\n📋 6. QUERY listRejectedInspections (AGENT)...');
  const rejected = await gql(`query { listRejectedInspections { id statut motifRejet } }`, null, agtToken);
  if (rejected.data.errors) {
    console.log(`   ❌ ERREUR: ${rejected.data.errors[0].message}`);
  } else {
    console.log(`   ✅ ${(rejected.data.data?.listRejectedInspections || []).length} inspection(s) rejetée(s)`);
  }

  // ── TEST 5: getInspectionByReservation avec un faux ID ──
  console.log('\n📋 7. QUERY getInspectionByReservation (faux ID, ADHERENT)...');
  const fakeRes = await gql(`query { getInspectionByReservation(reservationId: "fake-id-123") { id statut } }`, null, adhToken);
  if (fakeRes.data.errors) {
    console.log(`   ❌ ERREUR: ${fakeRes.data.errors[0].message}`);
  } else {
    console.log(`   ✅ Résultat: ${fakeRes.data.data?.getInspectionByReservation}`);
  }

  // ── TEST 6: getInspectionDetails avec un faux ID ──
  console.log('\n📋 8. QUERY getInspectionDetails (faux ID, ADHERENT)...');
  const fakeInsp = await gql(`query { getInspectionDetails(inspectionId: "fake-id-123") { id statut } }`, null, adhToken);
  if (fakeInsp.data.errors) {
    console.log(`   ❌ ERREUR: ${fakeInsp.data.errors[0].message}`);
  } else {
    console.log(`   ✅ OK`);
  }

  // ── TEST 7: startInspection avec un faux reservationId ──
  console.log('\n📋 9. MUTATION startInspection (faux reservationId, ADHERENT)...');
  const startFake = await gql(`mutation { startInspection(input: { reservationId: "fake-id-123", latitudeDebut: 48.85, longitudeDebut: 2.35 }) { id statut } }`, null, adhToken);
  if (startFake.data.errors) {
    console.log(`   ❌ ERREUR: ${startFake.data.errors[0].message}`);
    console.log(`   (Attendu: "Réservation introuvable" = ✅ gestion d'erreur OK)`);
  } else {
    console.log(`   ✅ Inspection créée: ${startFake.data.data?.startInspection?.id}`);
  }

  // ── TEST 8: startInspection par un AGENT (doit être refusé) ──
  console.log('\n📋 10. MUTATION startInspection (AGENT, doit être refusé)...');
  const startAgent = await gql(`mutation { startInspection(input: { reservationId: "test" }) { id } }`, null, agtToken);
  if (startAgent.data.errors) {
    console.log(`   ❌ ERREUR: ${startAgent.data.errors[0].message}`);
    console.log(`   (Attendu: "permissions" ou "Forbidden" = ✅ sécurité OK)`);
  } else {
    console.log(`   ⚠️ PROBLEME: Agent ne devrait pas pouvoir démarrer une inspection`);
  }

  // ── TEST 9: submitConsent sans auth ──
  console.log('\n📋 11. MUTATION submitConsent (sans auth)...');
  const noAuth = await gql(`mutation { submitConsent(input: { inspectionId: "test", versionConditions: "v1.0", vehiculeVerifie: true, photosReelles: true, codeRoute: true, conduiteResponsable: true, suiviGps: true, scoringConduite: true, responsabiliteNegligence: true, apteAConduire: true, acceptationGlobale: true }) { id } }`, null, null);
  if (noAuth.data.errors) {
    console.log(`   ❌ ERREUR: ${noAuth.data.errors[0].message}`);
    console.log(`   (Attendu: "Unauthorized" = ✅ auth OK)`);
  }

  // ── TEST 10: Vérifier les réservations CONFIRMED_BY_ADHERENT disponibles ──
  console.log('\n📋 12. Chercher réservations CONFIRMED_BY_ADHERENT pour test réel...');
  const reservations = await gql(`query { searchMissions { missions { id statut } total } }`, null, adhToken);
  if (reservations.data.errors) {
    console.log(`   ❌ ERREUR: ${reservations.data.errors[0].message}`);
  } else {
    console.log(`   ✅ Missions disponibles: ${reservations.data.data?.searchMissions?.total || 0}`);
  }

  // ── RÉSUMÉ ──
  console.log('\n' + '='.repeat(60));
  console.log('RÉSUMÉ DES TESTS');
  console.log('='.repeat(60));
  console.log('');
  console.log('Si vous voyez "Cannot read properties of undefined (reading \'user\')"');
  console.log('→ C\'est le BUG #1 (RolesGuard) confirmé. Le fix est dans roles.guard.ts');
  console.log('');
  console.log('Si listInspections retourne une erreur de permissions pour agent');
  console.log('→ C\'est le BUG #2 (role case) confirmé. Le fix est dans jwt.strategy.ts');
}

main().catch(e => console.error('FATAL:', e));
