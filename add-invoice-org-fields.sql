-- Add invoice-related fields to Organization for PDF generation
-- legalName: legal company name (different from account/display name)
-- iban: bank account for invoice footer
-- bankAccountHolder: holder name for bank account

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "legalName" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "iban" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "bankAccountHolder" TEXT;
