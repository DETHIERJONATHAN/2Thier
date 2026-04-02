-- Peppol e-Invoicing: Ajout des champs Peppol sur ChantierInvoice
-- et création des tables PeppolConfig + PeppolIncomingInvoice

-- 1. Champs Peppol sur les factures existantes
ALTER TABLE "ChantierInvoice" ADD COLUMN IF NOT EXISTS "peppolStatus" TEXT;
ALTER TABLE "ChantierInvoice" ADD COLUMN IF NOT EXISTS "peppolMessageId" TEXT;
ALTER TABLE "ChantierInvoice" ADD COLUMN IF NOT EXISTS "peppolError" TEXT;
ALTER TABLE "ChantierInvoice" ADD COLUMN IF NOT EXISTS "peppolSentAt" TIMESTAMP(3);
ALTER TABLE "ChantierInvoice" ADD COLUMN IF NOT EXISTS "peppolXmlUrl" TEXT;

-- 2. Table de configuration Peppol par organisation
CREATE TABLE IF NOT EXISTS "PeppolConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "peppolEas" TEXT NOT NULL DEFAULT '0208',
    "peppolEndpoint" TEXT,
    "registrationStatus" TEXT NOT NULL DEFAULT 'NOT_REGISTERED',
    "odooCompanyId" INTEGER,
    "odooProxyUserId" INTEGER,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "migrationKey" TEXT,
    "autoSendEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoReceiveEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeppolConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PeppolConfig_organizationId_key" ON "PeppolConfig"("organizationId");

ALTER TABLE "PeppolConfig" DROP CONSTRAINT IF EXISTS "PeppolConfig_organizationId_fkey";
ALTER TABLE "PeppolConfig" ADD CONSTRAINT "PeppolConfig_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Table des factures entrantes Peppol
CREATE TABLE IF NOT EXISTS "PeppolIncomingInvoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "peppolMessageId" TEXT NOT NULL,
    "senderEas" TEXT NOT NULL,
    "senderEndpoint" TEXT NOT NULL,
    "senderName" TEXT,
    "senderVat" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "totalAmount" DOUBLE PRECISION,
    "taxAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "xmlContent" TEXT,
    "xmlUrl" TEXT,
    "pdfUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeppolIncomingInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PeppolIncomingInvoice_peppolMessageId_key" ON "PeppolIncomingInvoice"("peppolMessageId");
CREATE INDEX IF NOT EXISTS "PeppolIncomingInvoice_organizationId_idx" ON "PeppolIncomingInvoice"("organizationId");
CREATE INDEX IF NOT EXISTS "PeppolIncomingInvoice_organizationId_status_idx" ON "PeppolIncomingInvoice"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "PeppolIncomingInvoice_senderEndpoint_idx" ON "PeppolIncomingInvoice"("senderEndpoint");
CREATE INDEX IF NOT EXISTS "PeppolIncomingInvoice_createdAt_idx" ON "PeppolIncomingInvoice"("createdAt");

ALTER TABLE "PeppolIncomingInvoice" DROP CONSTRAINT IF EXISTS "PeppolIncomingInvoice_organizationId_fkey";
ALTER TABLE "PeppolIncomingInvoice" ADD CONSTRAINT "PeppolIncomingInvoice_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
