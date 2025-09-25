-- Migration pour ajouter toutes les colonnes manquantes au modèle TreeBranchLeafNode
-- Basé sur l'analyse complète des propriétés TBL de la colonne de droite

-- ATTENTION : Cette migration ajoute uniquement les colonnes manquantes
-- sans toucher aux colonnes existantes

-- 1. PROPRIÉTÉS DE TYPE DE CHAMP (actuellement gérées par subType mais on ajoute des colonnes spécifiques)
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN "fieldType" VARCHAR(50),
ADD COLUMN "fieldSubType" VARCHAR(50);

-- 2. APPARENCE GÉNÉRALE
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN "appearance_size" VARCHAR(10) DEFAULT 'md',
ADD COLUMN "appearance_width" VARCHAR(20),
ADD COLUMN "appearance_variant" VARCHAR(50);

-- 3. CONFIGURATION CHAMPS TEXTE
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN "text_placeholder" TEXT,
ADD COLUMN "text_maxLength" INTEGER,
ADD COLUMN "text_minLength" INTEGER,
ADD COLUMN "text_mask" VARCHAR(100),
ADD COLUMN "text_regex" TEXT,
ADD COLUMN "text_rows" INTEGER DEFAULT 3;

-- 4. CONFIGURATION CHAMPS NOMBRE
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN "number_min" DECIMAL,
ADD COLUMN "number_max" DECIMAL,
ADD COLUMN "number_step" DECIMAL DEFAULT 1,
ADD COLUMN "number_decimals" INTEGER DEFAULT 0,
ADD COLUMN "number_prefix" VARCHAR(20),
ADD COLUMN "number_suffix" VARCHAR(20),
ADD COLUMN "number_unit" VARCHAR(20),
ADD COLUMN "number_defaultValue" DECIMAL;

-- 5. CONFIGURATION CHAMPS SÉLECTION
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN "select_multiple" BOOLEAN DEFAULT FALSE,
ADD COLUMN "select_searchable" BOOLEAN DEFAULT TRUE,
ADD COLUMN "select_allowClear" BOOLEAN DEFAULT TRUE,
ADD COLUMN "select_defaultValue" TEXT,
ADD COLUMN "select_options" JSONB;

-- 6. CONFIGURATION CHAMPS BOOLÉEN
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN "bool_trueLabel" VARCHAR(100),
ADD COLUMN "bool_falseLabel" VARCHAR(100),
ADD COLUMN "bool_defaultValue" BOOLEAN;

-- 7. CONFIGURATION CHAMPS DATE
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN "date_format" VARCHAR(50) DEFAULT 'DD/MM/YYYY',
ADD COLUMN "date_showTime" BOOLEAN DEFAULT FALSE,
ADD COLUMN "date_minDate" DATE,
ADD COLUMN "date_maxDate" DATE;

-- 8. CONFIGURATION CHAMPS IMAGE
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN "image_maxSize" INTEGER,
ADD COLUMN "image_ratio" VARCHAR(10),
ADD COLUMN "image_crop" BOOLEAN DEFAULT FALSE,
ADD COLUMN "image_thumbnails" JSONB;

-- 9. CONFIGURATION CAPACITÉ DATA (Multi-Instances)
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN "data_instances" JSONB,
ADD COLUMN "data_activeId" VARCHAR(100),
ADD COLUMN "data_exposedKey" VARCHAR(100),
ADD COLUMN "data_displayFormat" VARCHAR(50),
ADD COLUMN "data_unit" VARCHAR(20),
ADD COLUMN "data_precision" INTEGER DEFAULT 2,
ADD COLUMN "data_visibleToUser" BOOLEAN DEFAULT FALSE;

-- 10. CONFIGURATION CAPACITÉ FORMULA (Multi-Instances)
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN "formula_instances" JSONB,
ADD COLUMN "formula_activeId" VARCHAR(100),
ADD COLUMN "formula_tokens" JSONB,
ADD COLUMN "formula_name" VARCHAR(200);

-- 11. CONFIGURATION CAPACITÉ CONDITION (Multi-Instances)
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN "condition_instances" JSONB,
ADD COLUMN "condition_activeId" VARCHAR(100),
ADD COLUMN "condition_mode" VARCHAR(20),
ADD COLUMN "condition_branches" JSONB,
ADD COLUMN "condition_tokens" JSONB;

-- 12. CONFIGURATION CAPACITÉ TABLE (Multi-Instances)
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN "table_instances" JSONB,
ADD COLUMN "table_activeId" VARCHAR(100),
ADD COLUMN "table_type" VARCHAR(20) DEFAULT 'columns',
ADD COLUMN "table_name" VARCHAR(200),
ADD COLUMN "table_columns" JSONB,
ADD COLUMN "table_rows" JSONB,
ADD COLUMN "table_data" JSONB,
ADD COLUMN "table_meta" JSONB,
ADD COLUMN "table_isImported" BOOLEAN DEFAULT FALSE,
ADD COLUMN "table_importSource" VARCHAR(200);

-- 13. CONFIGURATION CAPACITÉ API (Multi-Instances)
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN "api_instances" JSONB,
ADD COLUMN "api_activeId" VARCHAR(100),
ADD COLUMN "api_bodyVars" JSONB,
ADD COLUMN "api_name" VARCHAR(200);

-- 14. CONFIGURATION CAPACITÉ LINK (Multi-Instances)
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN "link_instances" JSONB,
ADD COLUMN "link_activeId" VARCHAR(100),
ADD COLUMN "link_targetTreeId" VARCHAR(100),
ADD COLUMN "link_targetNodeId" VARCHAR(100),
ADD COLUMN "link_mode" VARCHAR(50) DEFAULT 'JUMP',
ADD COLUMN "link_carryContext" BOOLEAN DEFAULT FALSE,
ADD COLUMN "link_params" JSONB,
ADD COLUMN "link_name" VARCHAR(200);

-- 15. CONFIGURATION CAPACITÉ MARKERS (Multi-Instances)
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN "markers_instances" JSONB,
ADD COLUMN "markers_activeId" VARCHAR(100),
ADD COLUMN "markers_selectedIds" JSONB,
ADD COLUMN "markers_available" JSONB,
ADD COLUMN "markers_name" VARCHAR(200);

-- 16. CONFIGURATION O+C (Option + Champ)
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN "option_label" TEXT,
ADD COLUMN "field_label" TEXT;

-- Index optionnels pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS "TreeBranchLeafNode_fieldType_idx" ON "TreeBranchLeafNode"("fieldType");
CREATE INDEX IF NOT EXISTS "TreeBranchLeafNode_data_exposedKey_idx" ON "TreeBranchLeafNode"("data_exposedKey") WHERE "data_exposedKey" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "TreeBranchLeafNode_formula_activeId_idx" ON "TreeBranchLeafNode"("formula_activeId") WHERE "formula_activeId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "TreeBranchLeafNode_condition_activeId_idx" ON "TreeBranchLeafNode"("condition_activeId") WHERE "condition_activeId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "TreeBranchLeafNode_table_activeId_idx" ON "TreeBranchLeafNode"("table_activeId") WHERE "table_activeId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "TreeBranchLeafNode_api_activeId_idx" ON "TreeBranchLeafNode"("api_activeId") WHERE "api_activeId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "TreeBranchLeafNode_link_activeId_idx" ON "TreeBranchLeafNode"("link_activeId") WHERE "link_activeId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "TreeBranchLeafNode_markers_activeId_idx" ON "TreeBranchLeafNode"("markers_activeId") WHERE "markers_activeId" IS NOT NULL;

-- Commentaire pour la documentation
COMMENT ON TABLE "TreeBranchLeafNode" IS 'Nœuds TreeBranchLeaf avec colonnes dédiées pour toutes les propriétés de configuration. Migration basée sur analyse complète de la colonne de droite (Parameters.tsx et panneaux de capacités).';
