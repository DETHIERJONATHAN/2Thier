-- CreateTable
CREATE TABLE "GoogleWorkspaceUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "gmailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "calendarEnabled" BOOLEAN NOT NULL DEFAULT false,
    "driveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "meetEnabled" BOOLEAN NOT NULL DEFAULT false,
    "docsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sheetsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "voiceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastSync" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleWorkspaceUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleWorkspaceUser_userId_key" ON "GoogleWorkspaceUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleWorkspaceUser_email_key" ON "GoogleWorkspaceUser"("email");

-- CreateIndex
CREATE INDEX "GoogleWorkspaceUser_userId_idx" ON "GoogleWorkspaceUser"("userId");

-- CreateIndex
CREATE INDEX "GoogleWorkspaceUser_email_idx" ON "GoogleWorkspaceUser"("email");

-- CreateIndex
CREATE INDEX "GoogleWorkspaceUser_isActive_idx" ON "GoogleWorkspaceUser"("isActive");

-- AddForeignKey
ALTER TABLE "GoogleWorkspaceUser" ADD CONSTRAINT "GoogleWorkspaceUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
