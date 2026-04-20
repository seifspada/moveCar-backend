/*
  Warnings:

  - You are about to drop the column `commentairePartenaire` on the `reservations_mission` table. All the data in the column will be lost.
  - You are about to drop the column `partenaireId` on the `vehicules` table. All the data in the column will be lost.
  - Made the column `agentId` on table `missions` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `agentId` to the `vehicules` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "missions" DROP CONSTRAINT "missions_agentId_fkey";

-- DropForeignKey
ALTER TABLE "missions" DROP CONSTRAINT "missions_partenaireId_fkey";

-- DropForeignKey
ALTER TABLE "vehicules" DROP CONSTRAINT "vehicules_partenaireId_fkey";

-- DropIndex
DROP INDEX "vehicules_partenaireId_idx";

-- AlterTable
ALTER TABLE "missions" ALTER COLUMN "partenaireId" DROP NOT NULL,
ALTER COLUMN "agentId" SET NOT NULL;

-- AlterTable
ALTER TABLE "reservations_mission" DROP COLUMN "commentairePartenaire",
ADD COLUMN     "commentaireAgent" TEXT;

-- AlterTable
ALTER TABLE "vehicules" DROP COLUMN "partenaireId",
ADD COLUMN     "agentId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "vehicules_agentId_idx" ON "vehicules"("agentId");

-- AddForeignKey
ALTER TABLE "vehicules" ADD CONSTRAINT "vehicules_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "partenaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;
