/*
  Warnings:

  - You are about to drop the column `entite` on the `partenaires` table. All the data in the column will be lost.
  - Added the required column `entiteGroupe` to the `partenaires` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prenom` to the `partenaires` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "partenaires" DROP COLUMN "entite",
ADD COLUMN     "adresseAgence" VARCHAR(255),
ADD COLUMN     "entiteAgence" VARCHAR(150),
ADD COLUMN     "entiteGroupe" VARCHAR(150) NOT NULL,
ADD COLUMN     "logo" VARCHAR(255),
ADD COLUMN     "prenom" VARCHAR(100) NOT NULL,
ADD COLUMN     "ville" VARCHAR(100);
