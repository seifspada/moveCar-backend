/*
  Warnings:

  - The values [VALIDEE,ANNULEE] on the enum `StatutMission` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StatutMission_new" AS ENUM ('EN_ATTENTE', 'RESERVEE', 'RESERVATION_ANNULEE', 'CONFIRMEE', 'EN_COURS', 'ARRIVEE');
ALTER TABLE "public"."missions" ALTER COLUMN "statut" DROP DEFAULT;
ALTER TABLE "missions" ALTER COLUMN "statut" TYPE "StatutMission_new" USING ("statut"::text::"StatutMission_new");
ALTER TYPE "StatutMission" RENAME TO "StatutMission_old";
ALTER TYPE "StatutMission_new" RENAME TO "StatutMission";
DROP TYPE "public"."StatutMission_old";
ALTER TABLE "missions" ALTER COLUMN "statut" SET DEFAULT 'EN_ATTENTE';
COMMIT;
