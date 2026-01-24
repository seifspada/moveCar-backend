/*
  Warnings:

  - You are about to alter the column `nom` on the `demandes_adhesion` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `VarChar(20)`.
  - You are about to alter the column `prenom` on the `demandes_adhesion` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `VarChar(20)`.
  - You are about to alter the column `email` on the `demandes_adhesion` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(20)`.
  - You are about to alter the column `raisonSociale` on the `demandes_adhesion` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(20)`.
  - You are about to alter the column `numeroKbis` on the `demandes_adhesion` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `VarChar(20)`.

*/
-- AlterTable
ALTER TABLE "demandes_adhesion" ADD COLUMN     "ville" VARCHAR(20),
ALTER COLUMN "nom" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "prenom" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "raisonSociale" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "numeroKbis" SET DATA TYPE VARCHAR(20);
