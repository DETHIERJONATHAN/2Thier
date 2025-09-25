-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "isDetached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isGlobal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "templateRoleId" TEXT;

-- CreateTable
CREATE TABLE "RoleUpdateNotification" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleUpdateNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleUpdateNotification_roleId_organizationId_key" ON "RoleUpdateNotification"("roleId", "organizationId");

-- AddForeignKey
ALTER TABLE "RoleUpdateNotification" ADD CONSTRAINT "RoleUpdateNotification_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleUpdateNotification" ADD CONSTRAINT "RoleUpdateNotification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
