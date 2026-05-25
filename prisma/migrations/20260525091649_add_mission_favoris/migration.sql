-- CreateTable
CREATE TABLE "mission_favoris" (
    "adherentId" INTEGER NOT NULL,
    "missionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_favoris_pkey" PRIMARY KEY ("adherentId","missionId")
);

-- AddForeignKey
ALTER TABLE "mission_favoris" ADD CONSTRAINT "mission_favoris_adherentId_fkey" FOREIGN KEY ("adherentId") REFERENCES "adherents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_favoris" ADD CONSTRAINT "mission_favoris_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
