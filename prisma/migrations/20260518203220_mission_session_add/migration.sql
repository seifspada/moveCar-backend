-- CreateEnum
CREATE TYPE "statut_session" AS ENUM ('EN_COURS', 'TERMINEE');

-- CreateTable
CREATE TABLE "mission_sessions" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "consentAccepted" BOOLEAN NOT NULL DEFAULT false,
    "dateConsentement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitudeDebut" DOUBLE PRECISION NOT NULL,
    "longitudeDebut" DOUBLE PRECISION NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitudeFin" DOUBLE PRECISION,
    "longitudeFin" DOUBLE PRECISION,
    "dateFin" TIMESTAMP(3),
    "kilometrageDebut" INTEGER,
    "kilometrageFin" INTEGER,
    "commentaireFin" TEXT,
    "statut" "statut_session" NOT NULL DEFAULT 'EN_COURS',
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mission_sessions_reservationId_key" ON "mission_sessions"("reservationId");

-- CreateIndex
CREATE INDEX "mission_sessions_reservationId_idx" ON "mission_sessions"("reservationId");

-- CreateIndex
CREATE INDEX "mission_sessions_missionId_idx" ON "mission_sessions"("missionId");

-- CreateIndex
CREATE INDEX "mission_sessions_statut_idx" ON "mission_sessions"("statut");

-- AddForeignKey
ALTER TABLE "mission_sessions" ADD CONSTRAINT "mission_sessions_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations_mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_sessions" ADD CONSTRAINT "mission_sessions_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
