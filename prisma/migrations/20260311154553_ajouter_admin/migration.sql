/*
  Warnings:

  - Added the required column `montantFinal` to the `calculs_mission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `montantKm` to the `calculs_mission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "partenaireId" INTEGER;

-- AlterTable
ALTER TABLE "calculs_mission" ADD COLUMN     "montantFinal" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "montantKm" DECIMAL(10,2) NOT NULL;

-- CreateTable
CREATE TABLE "admins" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "admins_email_idx" ON "admins"("email");

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "partenaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;
