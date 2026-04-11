-- AlterTable
ALTER TABLE "missions" ADD COLUMN     "agenceId" INTEGER,
ADD COLUMN     "agentId" INTEGER;

-- CreateIndex
CREATE INDEX "missions_agenceId_idx" ON "missions"("agenceId");

-- CreateIndex
CREATE INDEX "missions_agentId_idx" ON "missions"("agentId");

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_agenceId_fkey" FOREIGN KEY ("agenceId") REFERENCES "agences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
