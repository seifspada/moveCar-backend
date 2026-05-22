-- CreateEnum
CREATE TYPE "etape_session" AS ENUM ('PRE_DEPART', 'POST_LIVRAISON');

-- CreateEnum
CREATE TYPE "type_media_session" AS ENUM ('PHOTO_AVANT', 'PHOTO_ARRIERE', 'PHOTO_GAUCHE', 'PHOTO_DROIT', 'PHOTO_INTERIEUR', 'PHOTO_TABLEAU_BORD', 'PHOTO_CARBURANT', 'DEGATS_PRE_MISSION', 'PERMIS_RECTO_CONDUCTEUR', 'PERMIS_VERSO_CONDUCTEUR', 'PHOTO_AVANT_FINAL', 'PHOTO_ARRIERE_FINAL', 'PHOTO_GAUCHE_FINAL', 'PHOTO_DROIT_FINAL', 'PHOTO_INTERIEUR_FINAL', 'PHOTO_TABLEAU_BORD_FINAL', 'CARBURANT_FINAL', 'DEGATS_POST_MISSION', 'PREUVE_LIVRAISON', 'SIGNATURE_CLIENT');

-- CreateTable
CREATE TABLE "mission_session_medias" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "etape" "etape_session" NOT NULL,
    "typeMedia" "type_media_session" NOT NULL,
    "description" TEXT,
    "cheminFichier" VARCHAR(500) NOT NULL,
    "urlPublic" VARCHAR(500),
    "tailleOctets" INTEGER,
    "typeContenu" VARCHAR(50),
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_session_medias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_completion_medias" (
    "id" TEXT NOT NULL,
    "completionId" TEXT NOT NULL,
    "typeMedia" "type_media_session" NOT NULL,
    "description" TEXT,
    "cheminFichier" VARCHAR(500) NOT NULL,
    "urlPublic" VARCHAR(500),
    "tailleOctets" INTEGER,
    "typeContenu" VARCHAR(50),
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_completion_medias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mission_session_medias_sessionId_idx" ON "mission_session_medias"("sessionId");

-- CreateIndex
CREATE INDEX "mission_session_medias_etape_idx" ON "mission_session_medias"("etape");

-- CreateIndex
CREATE INDEX "mission_session_medias_typeMedia_idx" ON "mission_session_medias"("typeMedia");

-- CreateIndex
CREATE INDEX "mission_completion_medias_completionId_idx" ON "mission_completion_medias"("completionId");

-- CreateIndex
CREATE INDEX "mission_completion_medias_typeMedia_idx" ON "mission_completion_medias"("typeMedia");

-- AddForeignKey
ALTER TABLE "mission_session_medias" ADD CONSTRAINT "mission_session_medias_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "mission_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_completion_medias" ADD CONSTRAINT "mission_completion_medias_completionId_fkey" FOREIGN KEY ("completionId") REFERENCES "mission_completions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
