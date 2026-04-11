-- DropForeignKey
ALTER TABLE "agents" DROP CONSTRAINT "agents_agenceId_fkey";

-- AlterTable
ALTER TABLE "agents" ALTER COLUMN "agenceId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_agenceId_fkey" FOREIGN KEY ("agenceId") REFERENCES "agences"("id") ON DELETE SET NULL ON UPDATE CASCADE;
