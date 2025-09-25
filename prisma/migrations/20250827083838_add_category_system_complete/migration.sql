-- AlterTable
ALTER TABLE "public"."Module" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "superAdminOnly" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "iconColor" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "superAdminOnly" BOOLEAN NOT NULL DEFAULT false,
    "allowedRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Category_organizationId_idx" ON "public"."Category"("organizationId");

-- CreateIndex
CREATE INDEX "Category_active_idx" ON "public"."Category"("active");

-- CreateIndex
CREATE INDEX "Module_categoryId_idx" ON "public"."Module"("categoryId");

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Module" ADD CONSTRAINT "Module_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
