-- CreateEnum
CREATE TYPE "DocumentStorageType" AS ENUM ('LOCAL', 'GOOGLE_DRIVE', 'YANDEX_DISK');

-- CreateTable
CREATE TABLE "ProductDocument" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "nodeId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "fileSize" INTEGER,
    "storageType" "DocumentStorageType" NOT NULL DEFAULT 'LOCAL',
    "localPath" TEXT,
    "driveFileId" TEXT,
    "driveUrl" TEXT,
    "externalUrl" TEXT,
    "category" TEXT NOT NULL DEFAULT 'fiche_technique',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "ProductDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductDocument_nodeId_idx" ON "ProductDocument"("nodeId");
CREATE INDEX "ProductDocument_organizationId_idx" ON "ProductDocument"("organizationId");
CREATE INDEX "ProductDocument_category_idx" ON "ProductDocument"("category");
CREATE INDEX "ProductDocument_storageType_idx" ON "ProductDocument"("storageType");

-- AddForeignKey
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "FieldOptionNode"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
