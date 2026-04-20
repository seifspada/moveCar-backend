import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1. Créer le rôle admin
  const role = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });

  console.log('✅ Role créé:', role.name);

  // 2. Hasher le password
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  console.log('✅ Password hashé avec bcrypt (rounds: 10)');

  // 3. 🔧 OPTION: Créer uniquement l'Admin (sans User)
  // ====================================================
  // Raison: L'Admin table est self-contained en Prisma
  // Le userId peut rester NULL ou être lié à un User optionnel
  
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@movecar.com' },
    update: { password: hashedPassword },
    create: {
      nom: 'Admin System',
      email: 'admin@movecar.com',
      password: hashedPassword,
    },
  });

  console.log('✅ Admin créé:', admin.email, 'avec ID:', admin.id);

  // 4. (OPTIONNEL) Créer un User pour l'admin s'il faut des infos supplémentaires
  // ============================================================================
  // Si vous voulez un User linked à cet Admin plus tard:
  // 
  // const user = await prisma.user.upsert({
  //   where: { email: 'admin@movecar.com' },
  //   update: {},
  //   create: {
  //     name: 'Admin System',
  //     email: 'admin@movecar.com',
  //     password: hashedPassword, // 📌 IMPORTANT: même password hashé
  //     roleId: role.id,
  //   },
  // });
  // console.log('✅ User créé:', user.email);

  // 5. Test: Vérifier que le password peut être validé
  const testIsValid = await bcrypt.compare('Admin123!', hashedPassword);
  console.log('✅ TEST bcrypt.compare("Admin123!", hashedPassword):', testIsValid);

  console.log('\n📝 Votre admin est prêt!');
  console.log('  Email: admin@movecar.com');
  console.log('  Password: Admin123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());