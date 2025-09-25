/*
  Warnings:

  - You are about to drop the `OrganizationModule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrganizationModule" DROP CONSTRAINT "OrganizationModule_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationModule" DROP CONSTRAINT "OrganizationModule_organizationId_fkey";

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "organizationId" TEXT;

-- DropTable
DROP TABLE "OrganizationModule";

-- CreateTable
CREATE TABLE "OrganizationModuleStatus" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationModuleStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationModuleStatus_organizationId_moduleId_key" ON "OrganizationModuleStatus"("organizationId", "moduleId");

-- CreateIndex
CREATE INDEX "Module_organizationId_idx" ON "Module"("organizationId");

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationModuleStatus" ADD CONSTRAINT "OrganizationModuleStatus_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationModuleStatus" ADD CONSTRAINT "OrganizationModuleStatus_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
