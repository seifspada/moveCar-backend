/*
  Warnings:

  - A unique constraint covering the columns `[codePartenaire]` on the table `demandes_partenaire` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[profileToken]` on the table `demandes_partenaire` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[codePartenaire]` on the table `partenaires` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `partenaires` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "demandes_partenaire" ADD COLUMN     "codePartenaire" TEXT,
ADD COLUMN     "profileToken" TEXT,
ADD COLUMN     "profileTokenExpiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "partenaires" ADD COLUMN     "codePartenaire" TEXT,
ADD COLUMN     "userId" INTEGER;

-- CreateTable
CREATE TABLE "contrats_partenaire" (
    "id" SERIAL NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateSignature" DATE NOT NULL,
    "dateFinContrat" DATE NOT NULL,
    "cheminDocument" VARCHAR(500) NOT NULL,
    "nomFichier" VARCHAR(255) NOT NULL,
    "tailleDocument" INTEGER,
    "demandePartenaireId" INTEGER NOT NULL,
    "estActif" BOOLEAN NOT NULL DEFAULT true,
    "notesInternes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrats_partenaire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contrats_partenaire_demandePartenaireId_key" ON "contrats_partenaire"("demandePartenaireId");

-- CreateIndex
CREATE INDEX "contrats_partenaire_demandePartenaireId_idx" ON "contrats_partenaire"("demandePartenaireId");

-- CreateIndex
CREATE INDEX "contrats_partenaire_dateFinContrat_idx" ON "contrats_partenaire"("dateFinContrat");

-- CreateIndex
CREATE INDEX "contrats_partenaire_estActif_idx" ON "contrats_partenaire"("estActif");

-- CreateIndex
CREATE UNIQUE INDEX "demandes_partenaire_codePartenaire_key" ON "demandes_partenaire"("codePartenaire");

-- CreateIndex
CREATE UNIQUE INDEX "demandes_partenaire_profileToken_key" ON "demandes_partenaire"("profileToken");

-- CreateIndex
CREATE INDEX "demandes_partenaire_profileToken_idx" ON "demandes_partenaire"("profileToken");

-- CreateIndex
CREATE UNIQUE INDEX "partenaires_codePartenaire_key" ON "partenaires"("codePartenaire");

-- CreateIndex
CREATE UNIQUE INDEX "partenaires_userId_key" ON "partenaires"("userId");

-- AddForeignKey
ALTER TABLE "contrats_partenaire" ADD CONSTRAINT "contrats_partenaire_demandePartenaireId_fkey" FOREIGN KEY ("demandePartenaireId") REFERENCES "demandes_partenaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partenaires" ADD CONSTRAINT "partenaires_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
