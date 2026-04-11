/*
  Warnings:

  - You are about to drop the column `cheminFichier` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `dateDelivrance` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `montant` on the `documents` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StatutDocument" AS ENUM ('VALIDE', 'NON_VALIDE', 'EN_ATTENTE');

-- AlterTable
ALTER TABLE "documents" DROP COLUMN "cheminFichier",
DROP COLUMN "dateDelivrance",
DROP COLUMN "montant",
ADD COLUMN     "statut" "StatutDocument";

-- CreateTable
CREATE TABLE "fichiers_documents" (
    "id" SERIAL NOT NULL,
    "cheminFichier" VARCHAR(500) NOT NULL,
    "documentId" INTEGER NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fichiers_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fichiers_documents_documentId_idx" ON "fichiers_documents"("documentId");

-- AddForeignKey
ALTER TABLE "fichiers_documents" ADD CONSTRAINT "fichiers_documents_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
