-- Script SQL pour ajouter la table TechnicalData sans perte de données

CREATE TABLE IF NOT EXISTS "TechnicalData" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID,
  "type" VARCHAR(255) NOT NULL,
  "label" VARCHAR(255) NOT NULL,
  "value" VARCHAR(255) NOT NULL,
  "data" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "TechnicalData_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL
);
