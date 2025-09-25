-- CreateTable
CREATE TABLE "public"."Icon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Icon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Icon_name_key" ON "public"."Icon"("name");

-- CreateIndex
CREATE INDEX "Icon_category_idx" ON "public"."Icon"("category");

-- CreateIndex
CREATE INDEX "Icon_active_idx" ON "public"."Icon"("active");

-- CreateIndex
CREATE INDEX "Icon_name_idx" ON "public"."Icon"("name");
