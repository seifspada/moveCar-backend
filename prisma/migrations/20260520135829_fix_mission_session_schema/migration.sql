/*
  Warnings:

  - You are about to drop the `mission_trackings` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('DÉVIATION_GPS', 'VITESSE_EXCESSIVE', 'ARRÊT_PROLONGÉ', 'DÉTOUR_INJUSTIFIÉ', 'ANOMALIE_CARBURANT');

-- DropForeignKey
ALTER TABLE "mission_trackings" DROP CONSTRAINT "mission_trackings_missionId_fkey";

-- AlterTable
ALTER TABLE "mission_sessions" ADD COLUMN     "dateSignatureClient" TIMESTAMP(3),
ADD COLUMN     "nomClientSignature" VARCHAR(100),
ADD COLUMN     "signatureClient" TEXT;

-- DropTable
DROP TABLE "mission_trackings";

-- CreateTable
CREATE TABLE "mission_gps_tracks" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "bearing" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "distanceFromRoute" DOUBLE PRECISION,
    "isDeviated" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_gps_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_incidents" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "typeIncident" "IncidentType" NOT NULL,
    "description" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "photoIncident" VARCHAR(500),
    "resolvedBy" TEXT,
    "resolutionNotes" TEXT,
    "dateResolution" TIMESTAMP(3),
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mission_gps_tracks_sessionId_idx" ON "mission_gps_tracks"("sessionId");

-- CreateIndex
CREATE INDEX "mission_gps_tracks_timestamp_idx" ON "mission_gps_tracks"("timestamp");

-- CreateIndex
CREATE INDEX "mission_gps_tracks_isDeviated_idx" ON "mission_gps_tracks"("isDeviated");

-- CreateIndex
CREATE INDEX "mission_incidents_sessionId_idx" ON "mission_incidents"("sessionId");

-- CreateIndex
CREATE INDEX "mission_incidents_typeIncident_idx" ON "mission_incidents"("typeIncident");

-- CreateIndex
CREATE INDEX "mission_incidents_dateCreation_idx" ON "mission_incidents"("dateCreation");

-- AddForeignKey
ALTER TABLE "mission_gps_tracks" ADD CONSTRAINT "mission_gps_tracks_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "mission_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_incidents" ADD CONSTRAINT "mission_incidents_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "mission_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
