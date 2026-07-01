-- AlterTable
ALTER TABLE "missions" ADD COLUMN     "detailsSecurite" JSONB,
ADD COLUMN     "labelSecurite" VARCHAR(50),
ADD COLUMN     "scoreSecurite" DOUBLE PRECISION,
ADD COLUMN     "scoreSecuriteCalculatedAt" TIMESTAMP(3),
ADD COLUMN     "weatherUtilise" VARCHAR(20);
