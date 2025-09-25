-- Additive, safe migration: ensure Section.sectionType exists without dropping anything
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Section' AND column_name = 'sectionType'
  ) THEN
    ALTER TABLE "Section" ADD COLUMN "sectionType" TEXT NOT NULL DEFAULT 'normal';
  END IF;
END $$;
