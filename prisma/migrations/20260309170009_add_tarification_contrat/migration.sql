-- AlterTable
ALTER TABLE "contrats_partenaire" ADD COLUMN     "depassementKilometrage" DOUBLE PRECISION,
ADD COLUMN     "prixParKm" DOUBLE PRECISION,
ADD COLUMN     "restitutionAutreEndroit" DOUBLE PRECISION,
ADD COLUMN     "retardSansAvertissement" DOUBLE PRECISION;
