-- CreateEnum
CREATE TYPE "StatutDemande" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "TypeDocument" AS ENUM ('PERMIS', 'RC_CIRCULATION', 'RC_PRO', 'W_GARAGE');

-- CreateEnum
CREATE TYPE "TypePack" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateTable
CREATE TABLE "demandes_adhesion" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "dateNaissance" DATE NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "telephone" VARCHAR(20) NOT NULL,
    "adresse" TEXT NOT NULL,
    "raisonSociale" VARCHAR(255) NOT NULL,
    "numeroKbis" VARCHAR(50) NOT NULL,
    "immatriculation" VARCHAR(50) NOT NULL,
    "statut" "StatutDemande" NOT NULL DEFAULT 'EN_ATTENTE',
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demandes_adhesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "typeDocument" "TypeDocument" NOT NULL,
    "numero" VARCHAR(100),
    "dateDelivrance" DATE,
    "dateDebutValidite" DATE,
    "dateFinValidite" DATE,
    "montant" DECIMAL(10,2),
    "cheminFichier" VARCHAR(500) NOT NULL,
    "demandeAdhesionId" INTEGER NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adherents" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "motDePasse" VARCHAR(255) NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "typePack" "TypePack" NOT NULL DEFAULT 'BRONZE',
    "photoUrl" VARCHAR(500),
    "demandeAdhesionId" INTEGER NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adherents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "demandes_adhesion_statut_idx" ON "demandes_adhesion"("statut");

-- CreateIndex
CREATE INDEX "demandes_adhesion_email_idx" ON "demandes_adhesion"("email");

-- CreateIndex
CREATE INDEX "demandes_adhesion_dateCreation_idx" ON "demandes_adhesion"("dateCreation");

-- CreateIndex
CREATE INDEX "documents_demandeAdhesionId_idx" ON "documents"("demandeAdhesionId");

-- CreateIndex
CREATE INDEX "documents_typeDocument_idx" ON "documents"("typeDocument");

-- CreateIndex
CREATE UNIQUE INDEX "adherents_email_key" ON "adherents"("email");

-- CreateIndex
CREATE UNIQUE INDEX "adherents_demandeAdhesionId_key" ON "adherents"("demandeAdhesionId");

-- CreateIndex
CREATE INDEX "adherents_email_idx" ON "adherents"("email");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_demandeAdhesionId_fkey" FOREIGN KEY ("demandeAdhesionId") REFERENCES "demandes_adhesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adherents" ADD CONSTRAINT "adherents_demandeAdhesionId_fkey" FOREIGN KEY ("demandeAdhesionId") REFERENCES "demandes_adhesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
