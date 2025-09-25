-- Migration SÉCURISÉE (additive uniquement) pour le module Devis
-- Cette migration ne supprime ni tables ni colonnes ni lignes.
-- Elle crée uniquement les types, tables et index nécessaires si absents.

-- 1) Enums requis
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuoteStatus') THEN
    CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT','SENT','ACCEPTED','REJECTED','CANCELLED','EXPIRED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuoteStorageType') THEN
    CREATE TYPE "QuoteStorageType" AS ENUM ('LOCAL','DRIVE');
  END IF;
END $$;

-- Essayez d'utiliser gen_random_uuid() si disponible (pgcrypto). Sinon, l'application devra fournir l'UUID côté app.
CREATE TABLE IF NOT EXISTS "Quote" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "leadId" UUID NOT NULL,
  "blockId" UUID NOT NULL,
  "createdById" UUID,
  "number" TEXT,
  "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "validUntil" TIMESTAMP,
  "notes" TEXT,
  "data" JSONB,
  "totals" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- Index Quote
CREATE INDEX IF NOT EXISTS "Quote_organizationId_idx" ON "Quote"("organizationId");
CREATE INDEX IF NOT EXISTS "Quote_leadId_idx" ON "Quote"("leadId");
CREATE INDEX IF NOT EXISTS "Quote_status_updatedAt_idx" ON "Quote"("status","updatedAt");

-- Harmonisation de types: si les IDs de base (Organization.id, Lead.id) sont TEXT, aligner Quote.* en TEXT
DO $$
DECLARE
  org_col_type text;
  lead_col_type text;
  q_org_col_type text;
  q_lead_col_type text;
  q_id_type text;
  org_fmt_type text;
  lead_fmt_type text;
BEGIN
  SELECT data_type INTO org_col_type FROM information_schema.columns WHERE table_name='Organization' AND column_name='id';
  SELECT data_type INTO lead_col_type FROM information_schema.columns WHERE table_name='Lead' AND column_name='id';
  SELECT data_type INTO q_org_col_type FROM information_schema.columns WHERE table_name='Quote' AND column_name='organizationId';
  SELECT data_type INTO q_lead_col_type FROM information_schema.columns WHERE table_name='Quote' AND column_name='leadId';
  SELECT data_type INTO q_id_type FROM information_schema.columns WHERE table_name='Quote' AND column_name='id';

  -- Récupérer le format exact des types (incluant longueur)
  SELECT format_type(a.atttypid, a.atttypmod) INTO org_fmt_type
  FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'Organization' AND a.attname = 'id';
  SELECT format_type(a.atttypid, a.atttypmod) INTO lead_fmt_type
  FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'Lead' AND a.attname = 'id';

  IF q_org_col_type <> org_col_type THEN
    EXECUTE format('ALTER TABLE "Quote" ALTER COLUMN "organizationId" TYPE %s USING "organizationId"::%s', org_fmt_type, org_fmt_type);
  END IF;
  IF q_lead_col_type <> lead_col_type THEN
    EXECUTE format('ALTER TABLE "Quote" ALTER COLUMN "leadId" TYPE %s USING "leadId"::%s', lead_fmt_type, lead_fmt_type);
  END IF;
  IF q_id_type <> org_col_type AND q_id_type <> 'text' THEN
    -- Aligner id sur le type des PK si nécessaire (par défaut uuid/text)
    EXECUTE 'ALTER TABLE "Quote" ALTER COLUMN "id" TYPE TEXT USING "id"::text';
    EXECUTE 'ALTER TABLE "Quote" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text';
  END IF;
END $$;

-- FK Quotes après harmonisation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'Quote_organizationId_fkey'
      AND tc.table_name = 'Quote'
  ) THEN
    BEGIN
      ALTER TABLE "Quote"
        ADD CONSTRAINT "Quote_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Skip FK Quote.organizationId -> Organization.id (types incompatibles ou table manquante): %', SQLERRM;
    END;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'Quote_leadId_fkey'
      AND tc.table_name = 'Quote'
  ) THEN
    BEGIN
      ALTER TABLE "Quote"
        ADD CONSTRAINT "Quote_leadId_fkey"
        FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Skip FK Quote.leadId -> Lead.id (types incompatibles ou table manquante): %', SQLERRM;
    END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "QuoteItem" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "quantity" NUMERIC(18,4) NOT NULL,
  "unitPrice" NUMERIC(18,4) NOT NULL,
  "discountPct" NUMERIC(5,2) NOT NULL DEFAULT 0,
  "taxPct" NUMERIC(5,2) NOT NULL DEFAULT 21,
  "totalExcl" NUMERIC(18,4) NOT NULL,
  "totalIncl" NUMERIC(18,4) NOT NULL
);

CREATE INDEX IF NOT EXISTS "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");

-- Harmonisation de types: si Quote.id est TEXT, aligner QuoteItem.quoteId et id
DO $$
DECLARE
  q_id_type2 text;
  qi_qid_type text;
  qi_id_type text;
BEGIN
  SELECT data_type INTO q_id_type2 FROM information_schema.columns WHERE table_name='Quote' AND column_name='id';
  SELECT data_type INTO qi_qid_type FROM information_schema.columns WHERE table_name='QuoteItem' AND column_name='quoteId';
  SELECT data_type INTO qi_id_type FROM information_schema.columns WHERE table_name='QuoteItem' AND column_name='id';

  IF q_id_type2 = 'text' AND qi_qid_type = 'uuid' THEN
    EXECUTE 'ALTER TABLE "QuoteItem" ALTER COLUMN "quoteId" TYPE TEXT USING "quoteId"::text';
  END IF;
  IF qi_id_type = 'uuid' THEN
    EXECUTE 'ALTER TABLE "QuoteItem" ALTER COLUMN "id" TYPE TEXT USING "id"::text';
    EXECUTE 'ALTER TABLE "QuoteItem" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text';
  END IF;
END $$;

-- FK QuoteItem après harmonisation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'QuoteItem_quoteId_fkey'
      AND tc.table_name = 'QuoteItem'
  ) THEN
    BEGIN
      ALTER TABLE "QuoteItem"
        ADD CONSTRAINT "QuoteItem_quoteId_fkey"
        FOREIGN KEY ("quoteId") REFERENCES "Quote"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Skip FK QuoteItem.quoteId -> Quote.id: %', SQLERRM;
    END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "QuoteDocument" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "storageType" "QuoteStorageType" NOT NULL DEFAULT 'LOCAL',
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL DEFAULT 'text/html',
  "url" TEXT,
  "driveFileId" TEXT,
  "path" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "QuoteDocument_quoteId_idx" ON "QuoteDocument"("quoteId");

-- Harmonisation de types: si Quote.id est TEXT, aligner QuoteDocument.quoteId et id
DO $$
DECLARE
  q_id_type3 text;
  qd_qid_type text;
  qd_id_type text;
BEGIN
  SELECT data_type INTO q_id_type3 FROM information_schema.columns WHERE table_name='Quote' AND column_name='id';
  SELECT data_type INTO qd_qid_type FROM information_schema.columns WHERE table_name='QuoteDocument' AND column_name='quoteId';
  SELECT data_type INTO qd_id_type FROM information_schema.columns WHERE table_name='QuoteDocument' AND column_name='id';

  IF q_id_type3 = 'text' AND qd_qid_type = 'uuid' THEN
    EXECUTE 'ALTER TABLE "QuoteDocument" ALTER COLUMN "quoteId" TYPE TEXT USING "quoteId"::text';
  END IF;
  IF qd_id_type = 'uuid' THEN
    EXECUTE 'ALTER TABLE "QuoteDocument" ALTER COLUMN "id" TYPE TEXT USING "id"::text';
    EXECUTE 'ALTER TABLE "QuoteDocument" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text';
  END IF;
END $$;

-- FK QuoteDocument après harmonisation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'QuoteDocument_quoteId_fkey'
      AND tc.table_name = 'QuoteDocument'
  ) THEN
    BEGIN
      ALTER TABLE "QuoteDocument"
        ADD CONSTRAINT "QuoteDocument_quoteId_fkey"
        FOREIGN KEY ("quoteId") REFERENCES "Quote"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Skip FK QuoteDocument.quoteId -> Quote.id: %', SQLERRM;
    END;
  END IF;
END $$;

-- FIN MIGRATION SAFE
