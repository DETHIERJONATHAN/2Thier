-- CreateTable
CREATE TABLE "GoogleWorkspaceConfig" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "serviceAccountEmail" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleWorkspaceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoogleWorkspaceConfig_isActive_idx" ON "GoogleWorkspaceConfig"("isActive");
