/*
  Warnings:

  - You are about to drop the column `email` on the `adherents` table. All the data in the column will be lost.
  - You are about to drop the column `motDePasse` on the `adherents` table. All the data in the column will be lost.
  - You are about to drop the column `resetPasswordExpires` on the `adherents` table. All the data in the column will be lost.
  - You are about to drop the column `resetPasswordToken` on the `adherents` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `adherents` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `adherents` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "adherents_email_idx";

-- DropIndex
DROP INDEX "adherents_email_key";

-- DropIndex
DROP INDEX "adherents_resetPasswordToken_key";

-- AlterTable
ALTER TABLE "adherents" DROP COLUMN "email",
DROP COLUMN "motDePasse",
DROP COLUMN "resetPasswordExpires",
DROP COLUMN "resetPasswordToken",
ADD COLUMN     "dateBlocage" TIMESTAMP(3),
ADD COLUMN     "estBloque" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "raisonBlocage" TEXT,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "adherents_userId_key" ON "adherents"("userId");

-- CreateIndex
CREATE INDEX "adherents_userId_idx" ON "adherents"("userId");

-- CreateIndex
CREATE INDEX "adherents_estBloque_idx" ON "adherents"("estBloque");

-- CreateIndex
CREATE INDEX "adherents_demandeAdhesionId_idx" ON "adherents"("demandeAdhesionId");

-- AddForeignKey
ALTER TABLE "adherents" ADD CONSTRAINT "adherents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
