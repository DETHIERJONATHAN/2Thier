-- AlterTable
ALTER TABLE "public"."TreeBranchLeafNode" ADD COLUMN     "api_activeId" TEXT,
ADD COLUMN     "api_bodyVars" JSONB,
ADD COLUMN     "api_instances" JSONB,
ADD COLUMN     "api_name" TEXT,
ADD COLUMN     "appearance_size" TEXT DEFAULT 'md',
ADD COLUMN     "appearance_variant" TEXT,
ADD COLUMN     "appearance_width" TEXT,
ADD COLUMN     "bool_defaultValue" BOOLEAN,
ADD COLUMN     "bool_falseLabel" TEXT,
ADD COLUMN     "bool_trueLabel" TEXT,
ADD COLUMN     "condition_activeId" TEXT,
ADD COLUMN     "condition_branches" JSONB,
ADD COLUMN     "condition_instances" JSONB,
ADD COLUMN     "condition_mode" TEXT,
ADD COLUMN     "condition_tokens" JSONB,
ADD COLUMN     "data_activeId" TEXT,
ADD COLUMN     "data_displayFormat" TEXT,
ADD COLUMN     "data_exposedKey" TEXT,
ADD COLUMN     "data_instances" JSONB,
ADD COLUMN     "data_precision" INTEGER DEFAULT 2,
ADD COLUMN     "data_unit" TEXT,
ADD COLUMN     "data_visibleToUser" BOOLEAN DEFAULT false,
ADD COLUMN     "date_format" TEXT DEFAULT 'DD/MM/YYYY',
ADD COLUMN     "date_maxDate" TIMESTAMP(3),
ADD COLUMN     "date_minDate" TIMESTAMP(3),
ADD COLUMN     "date_showTime" BOOLEAN DEFAULT false,
ADD COLUMN     "fieldSubType" TEXT,
ADD COLUMN     "fieldType" TEXT,
ADD COLUMN     "field_label" TEXT,
ADD COLUMN     "formula_activeId" TEXT,
ADD COLUMN     "formula_instances" JSONB,
ADD COLUMN     "formula_name" TEXT,
ADD COLUMN     "formula_tokens" JSONB,
ADD COLUMN     "image_crop" BOOLEAN DEFAULT false,
ADD COLUMN     "image_maxSize" INTEGER,
ADD COLUMN     "image_ratio" TEXT,
ADD COLUMN     "image_thumbnails" JSONB,
ADD COLUMN     "link_activeId" TEXT,
ADD COLUMN     "link_carryContext" BOOLEAN DEFAULT false,
ADD COLUMN     "link_instances" JSONB,
ADD COLUMN     "link_mode" TEXT DEFAULT 'JUMP',
ADD COLUMN     "link_name" TEXT,
ADD COLUMN     "link_params" JSONB,
ADD COLUMN     "link_targetNodeId" TEXT,
ADD COLUMN     "link_targetTreeId" TEXT,
ADD COLUMN     "markers_activeId" TEXT,
ADD COLUMN     "markers_available" JSONB,
ADD COLUMN     "markers_instances" JSONB,
ADD COLUMN     "markers_name" TEXT,
ADD COLUMN     "markers_selectedIds" JSONB,
ADD COLUMN     "number_decimals" INTEGER DEFAULT 0,
ADD COLUMN     "number_defaultValue" DECIMAL(65,30),
ADD COLUMN     "number_max" DECIMAL(65,30),
ADD COLUMN     "number_min" DECIMAL(65,30),
ADD COLUMN     "number_prefix" TEXT,
ADD COLUMN     "number_step" DECIMAL(65,30) DEFAULT 1,
ADD COLUMN     "number_suffix" TEXT,
ADD COLUMN     "number_unit" TEXT,
ADD COLUMN     "option_label" TEXT,
ADD COLUMN     "select_allowClear" BOOLEAN DEFAULT true,
ADD COLUMN     "select_defaultValue" TEXT,
ADD COLUMN     "select_multiple" BOOLEAN DEFAULT false,
ADD COLUMN     "select_options" JSONB,
ADD COLUMN     "select_searchable" BOOLEAN DEFAULT true,
ADD COLUMN     "table_activeId" TEXT,
ADD COLUMN     "table_columns" JSONB,
ADD COLUMN     "table_data" JSONB,
ADD COLUMN     "table_importSource" TEXT,
ADD COLUMN     "table_instances" JSONB,
ADD COLUMN     "table_isImported" BOOLEAN DEFAULT false,
ADD COLUMN     "table_meta" JSONB,
ADD COLUMN     "table_name" TEXT,
ADD COLUMN     "table_rows" JSONB,
ADD COLUMN     "table_type" TEXT DEFAULT 'columns',
ADD COLUMN     "text_mask" TEXT,
ADD COLUMN     "text_maxLength" INTEGER,
ADD COLUMN     "text_minLength" INTEGER,
ADD COLUMN     "text_placeholder" TEXT,
ADD COLUMN     "text_regex" TEXT,
ADD COLUMN     "text_rows" INTEGER DEFAULT 3;

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafNodeVariable" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "exposedKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "displayFormat" TEXT NOT NULL DEFAULT 'number',
    "unit" TEXT,
    "precision" INTEGER DEFAULT 2,
    "visibleToUser" BOOLEAN NOT NULL DEFAULT true,
    "isReadonly" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafNodeVariable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafNodeFormula" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "tokens" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafNodeFormula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreeBranchLeafNodeCondition" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "conditionSet" JSONB NOT NULL DEFAULT '{}',
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeBranchLeafNodeCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafNodeVariable_nodeId_key" ON "public"."TreeBranchLeafNodeVariable"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafNodeVariable_exposedKey_key" ON "public"."TreeBranchLeafNodeVariable"("exposedKey");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNodeVariable_nodeId_idx" ON "public"."TreeBranchLeafNodeVariable"("nodeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNodeVariable_exposedKey_idx" ON "public"."TreeBranchLeafNodeVariable"("exposedKey");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNodeVariable_visibleToUser_idx" ON "public"."TreeBranchLeafNodeVariable"("visibleToUser");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNodeFormula_nodeId_idx" ON "public"."TreeBranchLeafNodeFormula"("nodeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNodeFormula_organizationId_idx" ON "public"."TreeBranchLeafNodeFormula"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafNodeFormula_nodeId_name_key" ON "public"."TreeBranchLeafNodeFormula"("nodeId", "name");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNodeCondition_nodeId_idx" ON "public"."TreeBranchLeafNodeCondition"("nodeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNodeCondition_organizationId_idx" ON "public"."TreeBranchLeafNodeCondition"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeBranchLeafNodeCondition_nodeId_name_key" ON "public"."TreeBranchLeafNodeCondition"("nodeId", "name");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_fieldType_idx" ON "public"."TreeBranchLeafNode"("fieldType");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_data_exposedKey_idx" ON "public"."TreeBranchLeafNode"("data_exposedKey");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_formula_activeId_idx" ON "public"."TreeBranchLeafNode"("formula_activeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_condition_activeId_idx" ON "public"."TreeBranchLeafNode"("condition_activeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_table_activeId_idx" ON "public"."TreeBranchLeafNode"("table_activeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_api_activeId_idx" ON "public"."TreeBranchLeafNode"("api_activeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_link_activeId_idx" ON "public"."TreeBranchLeafNode"("link_activeId");

-- CreateIndex
CREATE INDEX "TreeBranchLeafNode_markers_activeId_idx" ON "public"."TreeBranchLeafNode"("markers_activeId");

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeVariable" ADD CONSTRAINT "TreeBranchLeafNodeVariable_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeFormula" ADD CONSTRAINT "TreeBranchLeafNodeFormula_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeFormula" ADD CONSTRAINT "TreeBranchLeafNodeFormula_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeCondition" ADD CONSTRAINT "TreeBranchLeafNodeCondition_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."TreeBranchLeafNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreeBranchLeafNodeCondition" ADD CONSTRAINT "TreeBranchLeafNodeCondition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
