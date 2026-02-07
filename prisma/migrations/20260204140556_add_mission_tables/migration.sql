-- CreateEnum
CREATE TYPE "TypeVehicule" AS ENUM ('CITADINE', 'BERLINE', 'COMPACTE', 'CABRIOLET', 'MONOSPACE', 'LUXE', 'VU_3M3', 'VU_6M3', 'VU_9M3', 'VU_12M3', 'VU_15M3', 'VU_20M3', 'VU_25M3', 'VU_30M3');

-- CreateEnum
CREATE TYPE "TypeCarburant" AS ENUM ('ESSENCE', 'DIESEL', 'HYBRIDE', 'ELECTRIQUE');

-- CreateEnum
CREATE TYPE "BoiteVitesse" AS ENUM ('AUTOMATIQUE', 'MANUELLE');

-- CreateEnum
CREATE TYPE "TypeLieu" AS ENUM ('DOMICILE', 'ENTREPRISE', 'HOTEL', 'GARE', 'AEROPORT', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutMission" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'ANNULEE');

-- AlterEnum
ALTER TYPE "TypeDocument" ADD VALUE 'DOCUMENT_ADMINISTRATIF';

-- CreateTable
CREATE TABLE "vehicules" (
    "id" TEXT NOT NULL,
    "typeVehicule" "TypeVehicule" NOT NULL,
    "typeCarburant" "TypeCarburant" NOT NULL,
    "marqueModele" TEXT NOT NULL,
    "immatriculation" TEXT NOT NULL,
    "nombrePlaces" INTEGER NOT NULL,
    "boiteVitesse" "BoiteVitesse" NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,
    "partenaireId" TEXT NOT NULL,

    CONSTRAINT "vehicules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adresses" (
    "id" TEXT NOT NULL,
    "villeId" TEXT NOT NULL,
    "villeNom" TEXT NOT NULL,
    "adresseComplete" TEXT NOT NULL,
    "typeLieu" "TypeLieu" NOT NULL,
    "nomLieu" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missions" (
    "id" TEXT NOT NULL,
    "statut" "StatutMission" NOT NULL DEFAULT 'EN_ATTENTE',
    "commentaire" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,
    "partenaireId" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "adresseDepartId" TEXT NOT NULL,
    "adresseArriveeId" TEXT NOT NULL,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilites_mission" (
    "id" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "missionId" TEXT NOT NULL,

    CONSTRAINT "disponibilites_mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications_mission" (
    "id" TEXT NOT NULL,
    "typeNotification" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT false,
    "missionId" TEXT NOT NULL,

    CONSTRAINT "notifications_mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculs_mission" (
    "id" TEXT NOT NULL,
    "distanceKm" DECIMAL(10,2) NOT NULL,
    "fraisPeage" DECIMAL(10,2) NOT NULL,
    "montantTotal" DECIMAL(10,2) NOT NULL,
    "detailCalcul" JSONB,
    "dateCalcul" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,
    "missionId" TEXT NOT NULL,

    CONSTRAINT "calculs_mission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicules_immatriculation_key" ON "vehicules"("immatriculation");

-- CreateIndex
CREATE INDEX "vehicules_partenaireId_idx" ON "vehicules"("partenaireId");

-- CreateIndex
CREATE INDEX "vehicules_immatriculation_idx" ON "vehicules"("immatriculation");

-- CreateIndex
CREATE INDEX "adresses_villeId_idx" ON "adresses"("villeId");

-- CreateIndex
CREATE INDEX "missions_partenaireId_idx" ON "missions"("partenaireId");

-- CreateIndex
CREATE INDEX "missions_vehiculeId_idx" ON "missions"("vehiculeId");

-- CreateIndex
CREATE INDEX "missions_statut_idx" ON "missions"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "disponibilites_mission_missionId_key" ON "disponibilites_mission"("missionId");

-- CreateIndex
CREATE INDEX "disponibilites_mission_dateDebut_idx" ON "disponibilites_mission"("dateDebut");

-- CreateIndex
CREATE INDEX "notifications_mission_missionId_idx" ON "notifications_mission"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "calculs_mission_missionId_key" ON "calculs_mission"("missionId");

-- CreateIndex
CREATE INDEX "calculs_mission_missionId_idx" ON "calculs_mission"("missionId");

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "vehicules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_adresseDepartId_fkey" FOREIGN KEY ("adresseDepartId") REFERENCES "adresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_adresseArriveeId_fkey" FOREIGN KEY ("adresseArriveeId") REFERENCES "adresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilites_mission" ADD CONSTRAINT "disponibilites_mission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications_mission" ADD CONSTRAINT "notifications_mission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculs_mission" ADD CONSTRAINT "calculs_mission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
