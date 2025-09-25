/*
  Warnings:

  - A unique constraint covering the columns `[organizationId]` on the table `GoogleWorkspaceConfig` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organizationId` to the `GoogleWorkspaceConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invitedById` to the `Invitation` table without a default value. This is not possible if the table is not empty.
  - Made the column `organizationId` on table `Invitation` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "GoogleWorkspaceConfig" ADD COLUMN     "calendarEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "docsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "driveEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gmailEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "meetEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organizationId" TEXT NOT NULL,
ADD COLUMN     "sheetsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "voiceEnabled" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "clientId" DROP NOT NULL,
ALTER COLUMN "clientSecret" DROP NOT NULL,
ALTER COLUMN "domain" DROP NOT NULL,
ALTER COLUMN "adminEmail" DROP NOT NULL,
ALTER COLUMN "serviceAccountEmail" DROP NOT NULL,
ALTER COLUMN "privateKey" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "invitedById" TEXT NOT NULL,
ADD COLUMN     "targetUserId" TEXT,
ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "statusId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'nouveau';

-- CreateTable
CREATE TABLE "GoogleToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "expiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadStatus" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserRoles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserRoles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleToken_userId_key" ON "GoogleToken"("userId");

-- CreateIndex
CREATE INDEX "GoogleToken_userId_idx" ON "GoogleToken"("userId");

-- CreateIndex
CREATE INDEX "LeadStatus_organizationId_idx" ON "LeadStatus"("organizationId");

-- CreateIndex
CREATE INDEX "LeadStatus_organizationId_order_idx" ON "LeadStatus"("organizationId", "order");

-- CreateIndex
CREATE INDEX "_UserRoles_B_index" ON "_UserRoles"("B");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE INDEX "SystemConfig_key_idx" ON "SystemConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleWorkspaceConfig_organizationId_key" ON "GoogleWorkspaceConfig"("organizationId");

-- CreateIndex
CREATE INDEX "GoogleWorkspaceConfig_organizationId_idx" ON "GoogleWorkspaceConfig"("organizationId");

-- CreateIndex
CREATE INDEX "Invitation_targetUserId_idx" ON "Invitation"("targetUserId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "LeadStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleWorkspaceConfig" ADD CONSTRAINT "GoogleWorkspaceConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleToken" ADD CONSTRAINT "GoogleToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStatus" ADD CONSTRAINT "LeadStatus_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
