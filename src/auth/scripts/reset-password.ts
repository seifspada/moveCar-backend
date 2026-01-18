// backend/scripts/reset-password.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'adherent@example.com';
  const plainPassword = 'adherent1';

  console.log('🔄 Réinitialisation du mot de passe pour:', email);
  console.log('🔑 Nouveau mot de passe:', plainPassword);

  // Générer le hash
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  
  console.log('🔐 Hash généré:', hashedPassword);
  console.log('🔐 Longueur du hash:', hashedPassword.length);

  // Mettre à jour l'utilisateur
  const user = await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
    include: { role: true },
  });

  console.log('✅ Mot de passe réinitialisé avec succès');
  console.log('👤 Utilisateur:', user.email);
  console.log('🎭 Rôle:', user.role.name);

  // Vérifier immédiatement
  const isValid = await bcrypt.compare(plainPassword, hashedPassword);
  console.log('🔓 Vérification immédiate:', isValid ? '✅ OK' : '❌ ERREUR');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
