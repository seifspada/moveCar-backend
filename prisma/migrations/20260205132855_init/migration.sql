/*
  Warnings:

  - Made the column `latitude` on table `adresses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `longitude` on table `adresses` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `partenaireId` on the `missions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `partenaireId` on the `vehicules` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeLieu" ADD VALUE 'AGENCE';
ALTER TYPE "TypeLieu" ADD VALUE 'CONCESSION';
ALTER TYPE "TypeLieu" ADD VALUE 'PARTICULIER';
ALTER TYPE "TypeLieu" ADD VALUE 'PARC_AUTO';

-- AlterTable
ALTER TABLE "adresses" ALTER COLUMN "latitude" SET NOT NULL,
ALTER COLUMN "longitude" SET NOT NULL;

-- AlterTable
ALTER TABLE "missions" DROP COLUMN "partenaireId",
ADD COLUMN     "partenaireId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "notifications_mission" ADD COLUMN     "nomContact" TEXT,
ADD COLUMN     "telephoneContact" TEXT;

-- AlterTable
ALTER TABLE "vehicules" DROP COLUMN "partenaireId",
ADD COLUMN     "partenaireId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "missions_partenaireId_idx" ON "missions"("partenaireId");

-- CreateIndex
CREATE INDEX "vehicules_partenaireId_idx" ON "vehicules"("partenaireId");

-- AddForeignKey
ALTER TABLE "vehicules" ADD CONSTRAINT "vehicules_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "partenaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "partenaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
