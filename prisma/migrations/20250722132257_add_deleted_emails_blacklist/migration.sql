-- CreateTable
CREATE TABLE "DeletedEmail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "uid" TEXT,
    "messageId" TEXT,
    "folder" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeletedEmail_userId_folder_idx" ON "DeletedEmail"("userId", "folder");

-- CreateIndex
CREATE INDEX "DeletedEmail_messageId_idx" ON "DeletedEmail"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "DeletedEmail_userId_uid_folder_key" ON "DeletedEmail"("userId", "uid", "folder");

-- AddForeignKey
ALTER TABLE "DeletedEmail" ADD CONSTRAINT "DeletedEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
