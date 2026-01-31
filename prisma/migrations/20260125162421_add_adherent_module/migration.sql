/*
  Warnings:

  - The values [BRONZE,SILVER,GOLD,PLATINUM] on the enum `TypePack` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[resetPasswordToken]` on the table `adherents` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `demandes_adhesion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `numeroKbis` to the `adherents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `raisonSociale` to the `adherents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `telephone` to the `adherents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ville` to the `adherents` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StatutAdherent" AS ENUM ('ACTIF', 'SUSPENDU', 'RESILIE');

-- AlterEnum
BEGIN;
CREATE TYPE "TypePack_new" AS ENUM ('premium', 'basic');
ALTER TABLE "public"."adherents" ALTER COLUMN "typePack" DROP DEFAULT;
ALTER TABLE "adherents" ALTER COLUMN "typePack" TYPE "TypePack_new" USING ("typePack"::text::"TypePack_new");
ALTER TYPE "TypePack" RENAME TO "TypePack_old";
ALTER TYPE "TypePack_new" RENAME TO "TypePack";
DROP TYPE "public"."TypePack_old";
ALTER TABLE "adherents" ALTER COLUMN "typePack" SET DEFAULT 'basic';
COMMIT;

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_roleId_fkey";

-- AlterTable
ALTER TABLE "adherents" ADD COLUMN     "dateAdhesion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dateExpiration" TIMESTAMP(3),
ADD COLUMN     "montantCotisation" DECIMAL(10,2),
ADD COLUMN     "numeroKbis" VARCHAR(50) NOT NULL,
ADD COLUMN     "raisonSociale" VARCHAR(255) NOT NULL,
ADD COLUMN     "resetPasswordExpires" TIMESTAMP(3),
ADD COLUMN     "resetPasswordToken" TEXT,
ADD COLUMN     "statut" "StatutAdherent" NOT NULL DEFAULT 'ACTIF',
ADD COLUMN     "telephone" VARCHAR(20) NOT NULL,
ADD COLUMN     "ville" VARCHAR(100) NOT NULL,
ALTER COLUMN "typePack" SET DEFAULT 'basic';

-- AlterTable
ALTER TABLE "demandes_adhesion" ALTER COLUMN "nom" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "prenom" SET DATA TYPE VARCHAR(100);

-- DropTable
DROP TABLE "Role";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" TEXT NOT NULL,
    "photo" TEXT DEFAULT '/default-avatar.png',
    "roleId" INTEGER NOT NULL,
    "resetPasswordToken" TEXT,
    "resetPasswordExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_resetPasswordToken_key" ON "users"("resetPasswordToken");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "users"("roleId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "adherents_resetPasswordToken_key" ON "adherents"("resetPasswordToken");

-- CreateIndex
CREATE INDEX "adherents_statut_idx" ON "adherents"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "demandes_adhesion_email_key" ON "demandes_adhesion"("email");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
