-- Migration pour ajouter le mapping des domaines Cloud Run
-- Permet de lier un site CRM à un domaine mappé dans Google Cloud Run

ALTER TABLE "websites"
ADD COLUMN IF NOT EXISTS "cloudRunDomain" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "cloudRunServiceName" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "cloudRunRegion" VARCHAR(100) DEFAULT 'europe-west1',
ADD COLUMN IF NOT EXISTS "cloudRunMappingVerified" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "cloudRunMappingVerifiedAt" TIMESTAMP;

-- Index pour rechercher rapidement par domaine Cloud Run
CREATE INDEX IF NOT EXISTS "idx_websites_cloud_run_domain" ON "websites"("cloudRunDomain");

-- Commentaire pour documentation
COMMENT ON COLUMN "websites"."cloudRunDomain" IS 'Domaine mappé dans Google Cloud Run (ex: 2thier.be)';
COMMENT ON COLUMN "websites"."cloudRunServiceName" IS 'Nom du service Cloud Run (ex: crm2thier-vite-prod)';
COMMENT ON COLUMN "websites"."cloudRunRegion" IS 'Région du service Cloud Run (ex: europe-west1)';
COMMENT ON COLUMN "websites"."cloudRunMappingVerified" IS 'Indique si le mapping a été vérifié et est fonctionnel';
COMMENT ON COLUMN "websites"."cloudRunMappingVerifiedAt" IS 'Date de la dernière vérification du mapping';
