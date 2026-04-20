/*
  Warnings:

  - You are about to drop the `HistoriqueAnnulation` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "StatutReservation" ADD VALUE 'ANNULATION_DEMANDEE';

-- DropForeignKey
ALTER TABLE "HistoriqueAnnulation" DROP CONSTRAINT "HistoriqueAnnulation_userId_fkey";

-- AlterTable
ALTER TABLE "reservations_mission" ADD COLUMN     "statutPrecedent" "StatutReservation";

-- DropTable
DROP TABLE "HistoriqueAnnulation";

-- CreateTable
CREATE TABLE "historique_annulations" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "nbAnnulations" INTEGER NOT NULL DEFAULT 0,
    "limite" INTEGER NOT NULL DEFAULT 5,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_annulations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historique_annulations_userId_idx" ON "historique_annulations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "historique_annulations_userId_mois_annee_key" ON "historique_annulations"("userId", "mois", "annee");

-- AddForeignKey
ALTER TABLE "historique_annulations" ADD CONSTRAINT "historique_annulations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
