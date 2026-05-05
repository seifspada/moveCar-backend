const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({
    select: { id: true, email: true, password: true, role: { select: { name: true } } }
  });
  users.forEach(u => {
    console.log(`[${u.role.name}] id=${u.id} email=${u.email} hasPassword=${!!u.password}`);
  });

  // Check reservations with CONFIRMED_BY_ADHERENT status
  const reservations = await p.reservationMission.findMany({
    where: { statut: 'CONFIRMED_BY_ADHERENT' },
    select: { id: true, missionId: true, adherentId: true, statut: true },
    take: 5
  });
  console.log('\n--- Reservations CONFIRMED_BY_ADHERENT ---');
  console.log(JSON.stringify(reservations, null, 2));

  // Check existing inspections
  const inspections = await p.preTripInspection.findMany({
    select: { id: true, statut: true, reservationId: true, adherentId: true },
    take: 5
  });
  console.log('\n--- Existing inspections ---');
  console.log(JSON.stringify(inspections, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
