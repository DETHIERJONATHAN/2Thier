-- Création sûre de la table FieldOptionNode pour l'arborescence advanced_select (types TEXT compatibles avec Field.id)
-- Extension requise pour gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'FieldOptionNode'
  ) THEN
    CREATE TABLE "FieldOptionNode" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "fieldId" TEXT NOT NULL,
      "parentId" TEXT NULL,
      label VARCHAR(255) NOT NULL,
      value VARCHAR(255) NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      data JSONB NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- Colonnes manquantes (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'FieldOptionNode' AND column_name = 'data'
  ) THEN
    ALTER TABLE "FieldOptionNode" ADD COLUMN data JSONB NULL;
  END IF;
END $$;

-- FK et index (idempotents)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FieldOptionNode_fieldId_fkey'
  ) THEN
    ALTER TABLE "FieldOptionNode" ADD CONSTRAINT "FieldOptionNode_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FieldOptionNode_parentId_fkey'
  ) THEN
    ALTER TABLE "FieldOptionNode" ADD CONSTRAINT "FieldOptionNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FieldOptionNode"(id) ON DELETE CASCADE;
  END IF;
  -- Index simples
  CREATE INDEX IF NOT EXISTS "FieldOptionNode_fieldId_idx" ON "FieldOptionNode"("fieldId");
  CREATE INDEX IF NOT EXISTS "FieldOptionNode_parentId_idx" ON "FieldOptionNode"("parentId");
  CREATE INDEX IF NOT EXISTS "FieldOptionNode_field_parent_order_idx" ON "FieldOptionNode"("fieldId", "parentId", "order");
END $$;
