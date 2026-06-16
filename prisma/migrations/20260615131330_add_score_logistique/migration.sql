-- AlterTable
ALTER TABLE "missions" ADD COLUMN     "scoreCalculatedAt" TIMESTAMP(3),
ADD COLUMN     "scoreLogistique" DOUBLE PRECISION,
ADD COLUMN     "scorePredictedLabel" VARCHAR(50);
