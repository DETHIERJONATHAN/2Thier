-- Additive, safe migration: ensure Section.menuFieldId exists without dropping anything
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Section' AND column_name = 'menuFieldId'
  ) THEN
    ALTER TABLE "Section" ADD COLUMN "menuFieldId" TEXT NULL;
  END IF;
END $$;
