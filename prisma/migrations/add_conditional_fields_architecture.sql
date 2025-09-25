-- Migration pour l'architecture des formulaires conditionnels infinis
-- Création de la table pour gérer les champs conditionnels à N niveaux

-- 1. Table principale pour les relations conditionnelles
CREATE TABLE "FieldConditionalRelation" (
  "id" TEXT NOT NULL,
  "parentFieldId" TEXT NOT NULL,
  "parentOptionNodeId" TEXT,
  "childFieldId" TEXT,
  "childOptionNodeId" TEXT,
  "triggerType" TEXT NOT NULL DEFAULT 'option_select',
  "triggerValue" TEXT,
  "triggerCondition" JSONB,
  "displayCondition" JSONB,
  "validationRules" JSONB,
  "defaultValue" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "level" INTEGER NOT NULL DEFAULT 1,
  "path" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FieldConditionalRelation_pkey" PRIMARY KEY ("id")
);

-- 2. Table pour stocker les valeurs des champs dynamiques 
CREATE TABLE "FieldDynamicValue" (
  "id" TEXT NOT NULL,
  "relationId" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL DEFAULT 'devis',
  "value" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FieldDynamicValue_pkey" PRIMARY KEY ("id")
);

-- 3. Index pour optimiser les performances
CREATE INDEX "FieldConditionalRelation_parentFieldId_idx" ON "FieldConditionalRelation"("parentFieldId");
CREATE INDEX "FieldConditionalRelation_parentOptionNodeId_idx" ON "FieldConditionalRelation"("parentOptionNodeId");
CREATE INDEX "FieldConditionalRelation_childFieldId_idx" ON "FieldConditionalRelation"("childFieldId");
CREATE INDEX "FieldConditionalRelation_level_idx" ON "FieldConditionalRelation"("level");
CREATE INDEX "FieldConditionalRelation_path_idx" ON "FieldConditionalRelation"("path");
CREATE INDEX "FieldConditionalRelation_triggerType_idx" ON "FieldConditionalRelation"("triggerType");

CREATE INDEX "FieldDynamicValue_relationId_idx" ON "FieldDynamicValue"("relationId");
CREATE INDEX "FieldDynamicValue_entityId_entityType_idx" ON "FieldDynamicValue"("entityId", "entityType");

-- 4. Contraintes d'intégrité référentielle
ALTER TABLE "FieldConditionalRelation" ADD CONSTRAINT "FieldConditionalRelation_parentFieldId_fkey" FOREIGN KEY ("parentFieldId") REFERENCES "Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FieldConditionalRelation" ADD CONSTRAINT "FieldConditionalRelation_parentOptionNodeId_fkey" FOREIGN KEY ("parentOptionNodeId") REFERENCES "FieldOptionNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FieldConditionalRelation" ADD CONSTRAINT "FieldConditionalRelation_childFieldId_fkey" FOREIGN KEY ("childFieldId") REFERENCES "Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FieldConditionalRelation" ADD CONSTRAINT "FieldConditionalRelation_childOptionNodeId_fkey" FOREIGN KEY ("childOptionNodeId") REFERENCES "FieldOptionNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FieldDynamicValue" ADD CONSTRAINT "FieldDynamicValue_relationId_fkey" FOREIGN KEY ("relationId") REFERENCES "FieldConditionalRelation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Contraintes uniques pour éviter les doublons
CREATE UNIQUE INDEX "FieldConditionalRelation_unique_relation" ON "FieldConditionalRelation"("parentFieldId", "parentOptionNodeId", "childFieldId") WHERE "parentOptionNodeId" IS NOT NULL AND "childFieldId" IS NOT NULL;
CREATE UNIQUE INDEX "FieldDynamicValue_unique_value" ON "FieldDynamicValue"("relationId", "entityId", "entityType");
