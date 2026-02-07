-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "missionId" TEXT,
ALTER COLUMN "demandeAdhesionId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "documents_missionId_idx" ON "documents"("missionId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
