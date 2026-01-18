import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateExistingUsers() {
  await prisma.user.updateMany({
    where: { 
      photo: "" // ← Changer null en chaîne vide
    },
    data: { 
      photo: "/default-avatar.png" 
    }
  });
  console.log('Users updated with default photo');
}

updateExistingUsers()
  .then(() => prisma.$disconnect())
  .catch(console.error);
