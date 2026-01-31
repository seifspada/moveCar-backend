/*
  Warnings:

  - A unique constraint covering the columns `[profileToken]` on the table `demandes_adhesion` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "demandes_adhesion" ADD COLUMN     "profileToken" TEXT,
ADD COLUMN     "profileTokenExpiry" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "demandes_adhesion_profileToken_key" ON "demandes_adhesion"("profileToken");

-- CreateIndex
CREATE INDEX "demandes_adhesion_profileToken_idx" ON "demandes_adhesion"("profileToken");
