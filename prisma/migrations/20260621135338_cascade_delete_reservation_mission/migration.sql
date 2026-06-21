-- DropForeignKey
ALTER TABLE "reservations_mission" DROP CONSTRAINT "reservations_mission_missionId_fkey";

-- AddForeignKey
ALTER TABLE "reservations_mission" ADD CONSTRAINT "reservations_mission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
