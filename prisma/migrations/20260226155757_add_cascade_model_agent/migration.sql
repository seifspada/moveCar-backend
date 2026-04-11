/*
  Warnings:

  - Made the column `userId` on table `agents` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "agents" DROP CONSTRAINT "agents_userId_fkey";

-- AlterTable
ALTER TABLE "agents" ALTER COLUMN "userId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
