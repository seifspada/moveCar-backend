-- CreateEnum
CREATE TYPE "StatutReservation" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'REFUSEE', 'ANNULEE', 'TERMINEE');

-- CreateTable
CREATE TABLE "reservations_mission" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "adherentId" INTEGER NOT NULL,
    "statut" "StatutReservation" NOT NULL DEFAULT 'EN_ATTENTE',
    "numeroReservation" VARCHAR(50) NOT NULL,
    "dateDepart" TIMESTAMP(3) NOT NULL,
    "heureDepart" VARCHAR(5) NOT NULL,
    "dateArrivee" TIMESTAMP(3) NOT NULL,
    "heureArrivee" VARCHAR(5) NOT NULL,
    "dureeEstimee" INTEGER,
    "commentaireAdherent" TEXT,
    "commentairePartenaire" TEXT,
    "dateValidation" TIMESTAMP(3),
    "dateRefus" TIMESTAMP(3),
    "motifRefus" TEXT,
    "montantTotal" DECIMAL(10,2) NOT NULL,
    "fraisPeage" DECIMAL(10,2) NOT NULL,
    "distanceKm" DECIMAL(10,2) NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_mission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reservations_mission_numeroReservation_key" ON "reservations_mission"("numeroReservation");

-- CreateIndex
CREATE INDEX "reservations_mission_missionId_idx" ON "reservations_mission"("missionId");

-- CreateIndex
CREATE INDEX "reservations_mission_adherentId_idx" ON "reservations_mission"("adherentId");

-- CreateIndex
CREATE INDEX "reservations_mission_statut_idx" ON "reservations_mission"("statut");

-- CreateIndex
CREATE INDEX "reservations_mission_dateDepart_idx" ON "reservations_mission"("dateDepart");

-- CreateIndex
CREATE INDEX "reservations_mission_numeroReservation_idx" ON "reservations_mission"("numeroReservation");

-- AddForeignKey
ALTER TABLE "reservations_mission" ADD CONSTRAINT "reservations_mission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations_mission" ADD CONSTRAINT "reservations_mission_adherentId_fkey" FOREIGN KEY ("adherentId") REFERENCES "adherents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
