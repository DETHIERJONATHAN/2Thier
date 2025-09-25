-- CreateTable
CREATE TABLE "UserService" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isConfigured" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "phoneNumber" TEXT,
    "apiKey" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserService_userId_idx" ON "UserService"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserService_userId_serviceType_key" ON "UserService"("userId", "serviceType");

-- AddForeignKey
ALTER TABLE "UserService" ADD CONSTRAINT "UserService_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
