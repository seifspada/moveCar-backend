-- DropForeignKey
ALTER TABLE "missions" DROP CONSTRAINT "missions_partenaireId_fkey";

-- DropForeignKey
ALTER TABLE "vehicules" DROP CONSTRAINT "vehicules_partenaireId_fkey";

-- AddForeignKey
ALTER TABLE "vehicules" ADD CONSTRAINT "vehicules_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "partenaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "partenaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;
