/*
  Warnings:

  - Made the column `ville` on table `demandes_adhesion` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "demandes_adhesion" ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "raisonSociale" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "numeroKbis" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "ville" SET NOT NULL,
ALTER COLUMN "ville" SET DATA TYPE VARCHAR(100);
