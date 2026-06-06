/*
  Warnings:

  - The values [DÉVIATION_GPS,ARRÊT_PROLONGÉ,DÉTOUR_INJUSTIFIÉ] on the enum `IncidentType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "IncidentType_new" AS ENUM ('DEVIATION_GPS', 'VITESSE_EXCESSIVE', 'ARRET_PROLONGE', 'DETOUR_INJUSTIFIE', 'ANOMALIE_CARBURANT');
ALTER TABLE "mission_incidents" ALTER COLUMN "typeIncident" TYPE "IncidentType_new" USING ("typeIncident"::text::"IncidentType_new");
ALTER TYPE "IncidentType" RENAME TO "IncidentType_old";
ALTER TYPE "IncidentType_new" RENAME TO "IncidentType";
DROP TYPE "public"."IncidentType_old";
COMMIT;
