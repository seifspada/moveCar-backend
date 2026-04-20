/*
  Warnings:

  - The values [CONFIRMEE,TERMINEE] on the enum `StatutReservation` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StatutReservation_new" AS ENUM ('EN_ATTENTE', 'ACCEPTED_BY_AGENT', 'CONFIRMED_BY_ADHERENT', 'ANNULEE', 'REFUSEE');
ALTER TABLE "public"."reservations_mission" ALTER COLUMN "statut" DROP DEFAULT;
ALTER TABLE "reservations_mission" ALTER COLUMN "statut" TYPE "StatutReservation_new" USING ("statut"::text::"StatutReservation_new");
ALTER TYPE "StatutReservation" RENAME TO "StatutReservation_old";
ALTER TYPE "StatutReservation_new" RENAME TO "StatutReservation";
DROP TYPE "public"."StatutReservation_old";
ALTER TABLE "reservations_mission" ALTER COLUMN "statut" SET DEFAULT 'EN_ATTENTE';
COMMIT;

-- AlterTable
ALTER TABLE "reservations_mission" ADD COLUMN     "annulePar" TEXT,
ADD COLUMN     "dateAcceptationAgent" TIMESTAMP(3),
ADD COLUMN     "dateAnnulation" TIMESTAMP(3),
ADD COLUMN     "dateConfirmationAdherent" TIMESTAMP(3),
ADD COLUMN     "motifAnnulation" TEXT;

-- CreateTable
CREATE TABLE "HistoriqueAnnulation" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "nbAnnulations" INTEGER NOT NULL DEFAULT 0,
    "limite" INTEGER NOT NULL DEFAULT 5,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriqueAnnulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HistoriqueAnnulation_userId_mois_annee_key" ON "HistoriqueAnnulation"("userId", "mois", "annee");

-- AddForeignKey
ALTER TABLE "HistoriqueAnnulation" ADD CONSTRAINT "HistoriqueAnnulation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
