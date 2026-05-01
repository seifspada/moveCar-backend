-- CreateEnum
CREATE TYPE "statut_pretrip_inspection" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'VALIDATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "etape_inspection" AS ENUM ('EXTERIEUR', 'INTERIEUR', 'TABLEAU_BORD', 'DOCUMENTS', 'IDENTITE', 'CONDITIONS', 'TERMINEE');

-- CreateEnum
CREATE TYPE "type_media_inspection" AS ENUM ('EXT_FACE_AVANT', 'EXT_FACE_ARRIERE', 'EXT_COTE_GAUCHE', 'EXT_COTE_DROIT', 'INT_SIEGE_CONDUCTEUR', 'INT_SIEGE_PASSAGER', 'INT_BANQUETTE_ARRIERE', 'INT_VUE_GLOBALE', 'TABLEAU_BORD', 'PERMIS_RECTO', 'PERMIS_VERSO', 'SELFIE_VEHICULE');

-- CreateTable
CREATE TABLE "pretrip_inspections" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "adherentId" INTEGER NOT NULL,
    "statut" "statut_pretrip_inspection" NOT NULL DEFAULT 'DRAFT',
    "etapeCourante" "etape_inspection" NOT NULL DEFAULT 'EXTERIEUR',
    "latitudeDebut" DOUBLE PRECISION,
    "longitudeDebut" DOUBLE PRECISION,
    "latitudeFin" DOUBLE PRECISION,
    "longitudeFin" DOUBLE PRECISION,
    "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateValidation" TIMESTAMP(3),
    "motifRejet" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pretrip_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pretrip_inspection_medias" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "typeMedia" "type_media_inspection" NOT NULL,
    "cheminFichier" VARCHAR(500) NOT NULL,
    "mimeType" VARCHAR(50) NOT NULL,
    "tailleFichier" INTEGER NOT NULL,
    "hashSha256" VARCHAR(64) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "precisionGps" DOUBLE PRECISION,
    "timestampPhoto" TIMESTAMP(3) NOT NULL,
    "validatedByServer" BOOLEAN NOT NULL DEFAULT false,
    "dateUpload" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pretrip_inspection_medias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pretrip_consents" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "versionConditions" VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    "clausesAcceptees" JSONB NOT NULL,
    "dateAcceptation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAdresse" VARCHAR(45),
    "userAgent" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "pretrip_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pretrip_inspections_reservationId_key" ON "pretrip_inspections"("reservationId");

-- CreateIndex
CREATE INDEX "pretrip_inspections_reservationId_idx" ON "pretrip_inspections"("reservationId");

-- CreateIndex
CREATE INDEX "pretrip_inspections_adherentId_idx" ON "pretrip_inspections"("adherentId");

-- CreateIndex
CREATE INDEX "pretrip_inspections_statut_idx" ON "pretrip_inspections"("statut");

-- CreateIndex
CREATE INDEX "pretrip_inspection_medias_inspectionId_idx" ON "pretrip_inspection_medias"("inspectionId");

-- CreateIndex
CREATE INDEX "pretrip_inspection_medias_typeMedia_idx" ON "pretrip_inspection_medias"("typeMedia");

-- CreateIndex
CREATE INDEX "pretrip_inspection_medias_hashSha256_idx" ON "pretrip_inspection_medias"("hashSha256");

-- CreateIndex
CREATE UNIQUE INDEX "pretrip_inspection_medias_inspectionId_typeMedia_key" ON "pretrip_inspection_medias"("inspectionId", "typeMedia");

-- CreateIndex
CREATE UNIQUE INDEX "pretrip_consents_inspectionId_key" ON "pretrip_consents"("inspectionId");

-- CreateIndex
CREATE INDEX "pretrip_consents_inspectionId_idx" ON "pretrip_consents"("inspectionId");

-- AddForeignKey
ALTER TABLE "pretrip_inspections" ADD CONSTRAINT "pretrip_inspections_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations_mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pretrip_inspections" ADD CONSTRAINT "pretrip_inspections_adherentId_fkey" FOREIGN KEY ("adherentId") REFERENCES "adherents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pretrip_inspection_medias" ADD CONSTRAINT "pretrip_inspection_medias_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "pretrip_inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pretrip_consents" ADD CONSTRAINT "pretrip_consents_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "pretrip_inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
