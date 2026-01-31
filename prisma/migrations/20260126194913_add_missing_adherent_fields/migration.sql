/*
  Warnings:

  - A unique constraint covering the columns `[numeroAdherent]` on the table `adherents` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "adherents" ADD COLUMN     "adresse" TEXT,
ADD COLUMN     "codePostal" VARCHAR(10),
ADD COLUMN     "dateNaissance" DATE,
ADD COLUMN     "numeroAdherent" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "adherents_numeroAdherent_key" ON "adherents"("numeroAdherent");

-- CreateIndex
CREATE INDEX "adherents_numeroAdherent_idx" ON "adherents"("numeroAdherent");
