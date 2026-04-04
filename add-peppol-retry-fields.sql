-- Add peppolRetryCount and peppolOdooInvoiceId to both invoice tables
-- For robust Peppol retry mechanism

ALTER TABLE "ChantierInvoice"
  ADD COLUMN IF NOT EXISTS "peppolRetryCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "peppolOdooInvoiceId" INTEGER;

ALTER TABLE "StandaloneInvoice"
  ADD COLUMN IF NOT EXISTS "peppolRetryCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "peppolOdooInvoiceId" INTEGER;
