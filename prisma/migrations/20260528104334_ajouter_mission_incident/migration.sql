/*
  Warnings:

  - The primary key for the `mission_favoris` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `adherentId` on the `mission_favoris` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `mission_favoris` table. All the data in the column will be lost.
  - You are about to drop the column `missionId` on the `mission_favoris` table. All the data in the column will be lost.
  - You are about to drop the column `photoIncident` on the `mission_incidents` table. All the data in the column will be lost.
  - Added the required column `adherent_id` to the `mission_favoris` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mission_id` to the `mission_favoris` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "mission_favoris" DROP CONSTRAINT "mission_favoris_adherentId_fkey";

-- DropForeignKey
ALTER TABLE "mission_favoris" DROP CONSTRAINT "mission_favoris_missionId_fkey";

-- AlterTable
ALTER TABLE "mission_favoris" DROP CONSTRAINT "mission_favoris_pkey",
DROP COLUMN "adherentId",
DROP COLUMN "createdAt",
DROP COLUMN "missionId",
ADD COLUMN     "adherent_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "mission_id" TEXT NOT NULL,
ADD CONSTRAINT "mission_favoris_pkey" PRIMARY KEY ("adherent_id", "mission_id");

-- AlterTable
ALTER TABLE "mission_incidents" DROP COLUMN "photoIncident";

-- CreateTable
CREATE TABLE "mission_incident_medias" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "cheminFichier" VARCHAR(500) NOT NULL,
    "tailleOctets" INTEGER,
    "typeContenu" VARCHAR(50),
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_incident_medias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mission_incident_medias_incidentId_idx" ON "mission_incident_medias"("incidentId");

-- AddForeignKey
ALTER TABLE "mission_favoris" ADD CONSTRAINT "mission_favoris_adherent_id_fkey" FOREIGN KEY ("adherent_id") REFERENCES "adherents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_favoris" ADD CONSTRAINT "mission_favoris_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_incident_medias" ADD CONSTRAINT "mission_incident_medias_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "mission_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
