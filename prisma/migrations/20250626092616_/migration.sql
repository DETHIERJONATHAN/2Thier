/*
  Warnings:

  - You are about to drop the `OrganizationModule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrganizationRole` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrganizationModule" DROP CONSTRAINT "OrganizationModule_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationModule" DROP CONSTRAINT "OrganizationModule_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationRole" DROP CONSTRAINT "OrganizationRole_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationRole" DROP CONSTRAINT "OrganizationRole_roleId_fkey";

-- DropTable
DROP TABLE "OrganizationModule";

-- DropTable
DROP TABLE "OrganizationRole";

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

-- CreateTable
CREATE TABLE "OrganizationRoleStatus" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationRoleStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationModuleStatus_organizationId_moduleId_key" ON "OrganizationModuleStatus"("organizationId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationRoleStatus_organizationId_roleId_key" ON "OrganizationRoleStatus"("organizationId", "roleId");

-- AddForeignKey
ALTER TABLE "OrganizationModuleStatus" ADD CONSTRAINT "OrganizationModuleStatus_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationModuleStatus" ADD CONSTRAINT "OrganizationModuleStatus_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationRoleStatus" ADD CONSTRAINT "OrganizationRoleStatus_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationRoleStatus" ADD CONSTRAINT "OrganizationRoleStatus_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
