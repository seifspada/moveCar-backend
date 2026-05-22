/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,etape,typeMedia]` on the table `mission_session_medias` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "mission_session_medias_sessionId_etape_typeMedia_key" ON "mission_session_medias"("sessionId", "etape", "typeMedia");
