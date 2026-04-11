/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `agents` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "userId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "agents_userId_key" ON "agents"("userId");

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
