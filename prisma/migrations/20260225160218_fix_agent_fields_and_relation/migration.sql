/*
  Warnings:

  - A unique constraint covering the columns `[profileToken]` on the table `partenaires` will be added. If there are existing duplicate values, this will fail.
  - Made the column `entiteAgence` on table `partenaires` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "agents_agenceId_key";

-- AlterTable
ALTER TABLE "agences" ALTER COLUMN "isActive" SET DEFAULT false;

-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "nom" VARCHAR(100),
ADD COLUMN     "prenom" VARCHAR(100),
ADD COLUMN     "telephone" VARCHAR(20),
ALTER COLUMN "isActive" SET DEFAULT false;

-- AlterTable
ALTER TABLE "partenaires" ADD COLUMN     "isProfileCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profileToken" TEXT,
ADD COLUMN     "profileTokenExpiresAt" TIMESTAMP(3),
ALTER COLUMN "estActif" SET DEFAULT false,
ALTER COLUMN "entiteAgence" SET NOT NULL;

-- CreateIndex
CREATE INDEX "agents_agenceId_idx" ON "agents"("agenceId");

-- CreateIndex
CREATE UNIQUE INDEX "partenaires_profileToken_key" ON "partenaires"("profileToken");
