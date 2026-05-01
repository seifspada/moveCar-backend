-- CreateTable
CREATE TABLE "mission_trackings" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "timestampServer" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "deviationReason" TEXT,

    CONSTRAINT "mission_trackings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_completions" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "latitudeFin" DOUBLE PRECISION NOT NULL,
    "longitudeFin" DOUBLE PRECISION NOT NULL,
    "totalLocations" INTEGER NOT NULL DEFAULT 0,
    "validLocations" INTEGER NOT NULL DEFAULT 0,
    "invalidLocations" INTEGER NOT NULL DEFAULT 0,
    "maxDeviation" DOUBLE PRECISION,
    "dureeTrajet" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "dateCompletion" TIMESTAMP(3),
    "invalidationReason" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mission_trackings_missionId_timestamp_idx" ON "mission_trackings"("missionId", "timestamp");

-- CreateIndex
CREATE INDEX "mission_trackings_missionId_isValid_idx" ON "mission_trackings"("missionId", "isValid");

-- CreateIndex
CREATE UNIQUE INDEX "mission_completions_missionId_key" ON "mission_completions"("missionId");

-- CreateIndex
CREATE INDEX "mission_completions_missionId_idx" ON "mission_completions"("missionId");

-- AddForeignKey
ALTER TABLE "mission_trackings" ADD CONSTRAINT "mission_trackings_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_completions" ADD CONSTRAINT "mission_completions_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
