-- CreateEnum
CREATE TYPE "TypeAlerte" AS ENUM ('GEOGRAPHIQUE', 'TRAJET');

-- CreateTable
CREATE TABLE "alertes_geographiques" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "TypeAlerte" NOT NULL,
    "rayon" INTEGER NOT NULL,
    "villeNom" VARCHAR(255),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "villeDepartNom" VARCHAR(255),
    "latitudeDepart" DOUBLE PRECISION,
    "longitudeDepart" DOUBLE PRECISION,
    "villeArriveeNom" VARCHAR(255),
    "latitudeArrivee" DOUBLE PRECISION,
    "longitudeArrivee" DOUBLE PRECISION,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alertes_geographiques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications_alertes" (
    "id" TEXT NOT NULL,
    "alerteId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "emailEnvoye" BOOLEAN NOT NULL DEFAULT false,
    "dateEnvoi" TIMESTAMP(3),
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_alertes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alertes_geographiques_userId_actif_idx" ON "alertes_geographiques"("userId", "actif");

-- CreateIndex
CREATE INDEX "alertes_geographiques_type_actif_idx" ON "alertes_geographiques"("type", "actif");

-- CreateIndex
CREATE INDEX "notifications_alertes_alerteId_missionId_idx" ON "notifications_alertes"("alerteId", "missionId");

-- AddForeignKey
ALTER TABLE "alertes_geographiques" ADD CONSTRAINT "alertes_geographiques_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications_alertes" ADD CONSTRAINT "notifications_alertes_alerteId_fkey" FOREIGN KEY ("alerteId") REFERENCES "alertes_geographiques"("id") ON DELETE CASCADE ON UPDATE CASCADE;
