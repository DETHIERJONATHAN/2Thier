/*
  Warnings:

  - A unique constraint covering the columns `[roleId,organizationId,moduleId,action,resource]` on the table `Permission` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Permission_roleId_organizationId_action_resource_key";

-- CreateIndex
CREATE UNIQUE INDEX "Permission_roleId_organizationId_moduleId_action_resource_key" ON "Permission"("roleId", "organizationId", "moduleId", "action", "resource");
