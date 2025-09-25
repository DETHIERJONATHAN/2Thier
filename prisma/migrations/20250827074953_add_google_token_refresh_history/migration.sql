-- AlterTable
ALTER TABLE "public"."GoogleToken" ADD COLUMN     "lastRefreshAt" TIMESTAMP(3),
ADD COLUMN     "refreshCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."GoogleTokenRefreshHistory" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "oldExpiresAt" TIMESTAMP(3),
    "newExpiresAt" TIMESTAMP(3),

    CONSTRAINT "GoogleTokenRefreshHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoogleTokenRefreshHistory_tokenId_idx" ON "public"."GoogleTokenRefreshHistory"("tokenId");

-- CreateIndex
CREATE INDEX "GoogleTokenRefreshHistory_refreshedAt_idx" ON "public"."GoogleTokenRefreshHistory"("refreshedAt");

-- AddForeignKey
ALTER TABLE "public"."GoogleTokenRefreshHistory" ADD CONSTRAINT "GoogleTokenRefreshHistory_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "public"."GoogleToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;
