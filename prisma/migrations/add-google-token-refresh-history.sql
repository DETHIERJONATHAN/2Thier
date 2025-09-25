-- CreateTable
CREATE TABLE "GoogleTokenRefreshHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "success" BOOLEAN NOT NULL,
    "message" TEXT NOT NULL,
    "errorDetails" TEXT,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oldExpiresAt" TIMESTAMP(3),
    "newExpiresAt" TIMESTAMP(3),
    
    CONSTRAINT "GoogleTokenRefreshHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoogleTokenRefreshHistory_organizationId_idx" ON "GoogleTokenRefreshHistory"("organizationId");
CREATE INDEX "GoogleTokenRefreshHistory_refreshedAt_idx" ON "GoogleTokenRefreshHistory"("refreshedAt");

-- AddForeignKey
ALTER TABLE "GoogleTokenRefreshHistory" ADD CONSTRAINT "GoogleTokenRefreshHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
