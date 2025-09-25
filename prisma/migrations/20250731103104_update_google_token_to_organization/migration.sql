/*
  Warnings:

  - You are about to drop the column `userId` on the `GoogleToken` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[organizationId]` on the table `GoogleToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organizationId` to the `GoogleToken` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GoogleToken" DROP CONSTRAINT "GoogleToken_userId_fkey";

-- DropIndex
DROP INDEX "GoogleToken_userId_idx";

-- DropIndex
DROP INDEX "GoogleToken_userId_key";

-- AlterTable
ALTER TABLE "GoogleToken" DROP COLUMN "userId",
ADD COLUMN     "organizationId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "GoogleToken_organizationId_key" ON "GoogleToken"("organizationId");

-- CreateIndex
CREATE INDEX "GoogleToken_organizationId_idx" ON "GoogleToken"("organizationId");

-- AddForeignKey
ALTER TABLE "GoogleToken" ADD CONSTRAINT "GoogleToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
