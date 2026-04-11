/*
  Warnings:

  - A unique constraint covering the columns `[profileToken]` on the table `agents` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "isProfileCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profileToken" VARCHAR(255),
ADD COLUMN     "profileTokenExpiresAt" TIMESTAMP(3),
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "agents_profileToken_key" ON "agents"("profileToken");
