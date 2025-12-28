-- CreateTable UserFavoriteModule
CREATE TABLE "UserFavoriteModule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavoriteModule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique constraint)
CREATE UNIQUE INDEX "UserFavoriteModule_userId_organizationId_moduleKey_key" ON "UserFavoriteModule"("userId", "organizationId", "moduleKey");

-- CreateIndex (for querying by userId)
CREATE INDEX "UserFavoriteModule_userId_idx" ON "UserFavoriteModule"("userId");

-- CreateIndex (for querying by organizationId)
CREATE INDEX "UserFavoriteModule_organizationId_idx" ON "UserFavoriteModule"("organizationId");

-- AddForeignKey (User relation)
ALTER TABLE "UserFavoriteModule" ADD CONSTRAINT "UserFavoriteModule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (Organization relation)
ALTER TABLE "UserFavoriteModule" ADD CONSTRAINT "UserFavoriteModule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
