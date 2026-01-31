/*
  Warnings:

  - The `statut` column on the `demandes_adhesion` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "statut_entreprise" AS ENUM ('DIRECTEUR_GENERAL', 'DIRECTEUR', 'MANAGER', 'RESPONSABLE_TRANSPORT', 'RESPONSABLE_LOGISTIQUE', 'CHEF_ENTREPRISE', 'AUTRE');

-- CreateEnum
CREATE TYPE "statut_demande" AS ENUM ('EN_ATTENTE', 'EN_COURS_TRAITEMENT', 'VALIDEE', 'ACCEPTEE', 'REFUSEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "type_rendezvous" AS ENUM ('TELEPHONIQUE', 'PHYSIQUE');

-- CreateEnum
CREATE TYPE "statut_rendezvous" AS ENUM ('PLANIFIE', 'CONFIRME', 'EN_COURS', 'TERMINE', 'ANNULE', 'REPORTE');

-- CreateEnum
CREATE TYPE "resultat_rendezvous" AS ENUM ('INTERESSE', 'A_RECONTACTER', 'NON_INTERESSE', 'CONTRAT_SIGNE');

-- CreateEnum
CREATE TYPE "type_reservation" AS ENUM ('RENDEZ_VOUS', 'CONGE', 'JOUR_FERIE', 'EVENEMENT_INTERNE', 'AUTRE');

-- AlterTable
ALTER TABLE "demandes_adhesion" DROP COLUMN "statut",
ADD COLUMN     "statut" "statut_demande" NOT NULL DEFAULT 'EN_ATTENTE';

-- DropEnum
DROP TYPE "StatutDemande";

-- CreateTable
CREATE TABLE "demandes_partenaire" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "entite" VARCHAR(150) NOT NULL,
    "statut" "statut_entreprise" NOT NULL,
    "telephone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "nombreDeplacements" INTEGER,
    "nombreAgences" INTEGER,
    "statutDemande" "statut_demande" NOT NULL DEFAULT 'EN_ATTENTE',
    "partenaireId" INTEGER,
    "notesInternes" TEXT,

    CONSTRAINT "demandes_partenaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rendezvous" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "typeRdv" "type_rendezvous" NOT NULL,
    "dateRdv" DATE NOT NULL,
    "creneau" VARCHAR(20) NOT NULL,
    "statut" "statut_rendezvous" NOT NULL DEFAULT 'PLANIFIE',
    "demandePartenaireId" INTEGER NOT NULL,
    "creneauReserveId" INTEGER,
    "lienVisio" VARCHAR(500),
    "adresse" VARCHAR(500),
    "rappelEnvoye" BOOLEAN NOT NULL DEFAULT false,
    "dateRappel" TIMESTAMP(3),
    "compteRendu" TEXT,
    "resultat" "resultat_rendezvous",

    CONSTRAINT "rendezvous_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creneaux_reserves" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" DATE NOT NULL,
    "creneau" VARCHAR(20) NOT NULL,
    "type" "type_reservation" NOT NULL DEFAULT 'RENDEZ_VOUS',
    "motif" VARCHAR(255),
    "estActif" BOOLEAN NOT NULL DEFAULT true,
    "dateExpiration" TIMESTAMP(3),

    CONSTRAINT "creneaux_reserves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dates_indisponibles" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" DATE NOT NULL,
    "motif" VARCHAR(255) NOT NULL,
    "estActif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "dates_indisponibles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partenaires" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "entite" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "telephone" VARCHAR(20) NOT NULL,
    "estActif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "partenaires_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "demandes_partenaire_partenaireId_key" ON "demandes_partenaire"("partenaireId");

-- CreateIndex
CREATE INDEX "demandes_partenaire_email_idx" ON "demandes_partenaire"("email");

-- CreateIndex
CREATE INDEX "demandes_partenaire_statutDemande_idx" ON "demandes_partenaire"("statutDemande");

-- CreateIndex
CREATE INDEX "demandes_partenaire_createdAt_idx" ON "demandes_partenaire"("createdAt");

-- CreateIndex
CREATE INDEX "demandes_partenaire_statutDemande_createdAt_idx" ON "demandes_partenaire"("statutDemande", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "rendezvous_demandePartenaireId_key" ON "rendezvous"("demandePartenaireId");

-- CreateIndex
CREATE UNIQUE INDEX "rendezvous_creneauReserveId_key" ON "rendezvous"("creneauReserveId");

-- CreateIndex
CREATE INDEX "rendezvous_dateRdv_idx" ON "rendezvous"("dateRdv");

-- CreateIndex
CREATE INDEX "rendezvous_statut_idx" ON "rendezvous"("statut");

-- CreateIndex
CREATE INDEX "rendezvous_typeRdv_idx" ON "rendezvous"("typeRdv");

-- CreateIndex
CREATE INDEX "rendezvous_dateRdv_statut_idx" ON "rendezvous"("dateRdv", "statut");

-- CreateIndex
CREATE INDEX "creneaux_reserves_date_idx" ON "creneaux_reserves"("date");

-- CreateIndex
CREATE INDEX "creneaux_reserves_estActif_idx" ON "creneaux_reserves"("estActif");

-- CreateIndex
CREATE INDEX "creneaux_reserves_date_estActif_idx" ON "creneaux_reserves"("date", "estActif");

-- CreateIndex
CREATE UNIQUE INDEX "creneaux_reserves_date_creneau_key" ON "creneaux_reserves"("date", "creneau");

-- CreateIndex
CREATE INDEX "dates_indisponibles_date_idx" ON "dates_indisponibles"("date");

-- CreateIndex
CREATE INDEX "dates_indisponibles_estActif_idx" ON "dates_indisponibles"("estActif");

-- CreateIndex
CREATE INDEX "dates_indisponibles_date_estActif_idx" ON "dates_indisponibles"("date", "estActif");

-- CreateIndex
CREATE UNIQUE INDEX "dates_indisponibles_date_key" ON "dates_indisponibles"("date");

-- CreateIndex
CREATE UNIQUE INDEX "partenaires_email_key" ON "partenaires"("email");

-- CreateIndex
CREATE INDEX "partenaires_email_idx" ON "partenaires"("email");

-- CreateIndex
CREATE INDEX "partenaires_estActif_idx" ON "partenaires"("estActif");

-- CreateIndex
CREATE INDEX "demandes_adhesion_statut_idx" ON "demandes_adhesion"("statut");

-- AddForeignKey
ALTER TABLE "demandes_partenaire" ADD CONSTRAINT "demandes_partenaire_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "partenaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rendezvous" ADD CONSTRAINT "rendezvous_demandePartenaireId_fkey" FOREIGN KEY ("demandePartenaireId") REFERENCES "demandes_partenaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rendezvous" ADD CONSTRAINT "rendezvous_creneauReserveId_fkey" FOREIGN KEY ("creneauReserveId") REFERENCES "creneaux_reserves"("id") ON DELETE SET NULL ON UPDATE CASCADE;
