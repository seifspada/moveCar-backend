-- DropForeignKey
ALTER TABLE "partenaires" DROP CONSTRAINT "partenaires_userId_fkey";

-- AddForeignKey
ALTER TABLE "partenaires" ADD CONSTRAINT "partenaires_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
