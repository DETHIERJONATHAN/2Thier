-- CreateTable
CREATE TABLE "public"."FieldOptionNode" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "parentId" TEXT,
    "fieldId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB,
    "type" TEXT NOT NULL DEFAULT 'option',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldOptionNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldOptionNode_fieldId_idx" ON "public"."FieldOptionNode"("fieldId");

-- CreateIndex
CREATE INDEX "FieldOptionNode_parentId_idx" ON "public"."FieldOptionNode"("parentId");

-- CreateIndex
CREATE INDEX "FieldOptionNode_fieldId_parentId_idx" ON "public"."FieldOptionNode"("fieldId", "parentId");

-- CreateIndex
CREATE INDEX "FieldOptionNode_order_idx" ON "public"."FieldOptionNode"("order");

-- AddForeignKey
ALTER TABLE "public"."FieldOptionNode" ADD CONSTRAINT "FieldOptionNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."FieldOptionNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FieldOptionNode" ADD CONSTRAINT "FieldOptionNode_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "public"."Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;
