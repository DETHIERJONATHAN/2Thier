-- Migration: Ajouter la configuration de l'objet de référence par organisation
-- pour le système de mesure IA avec calibration

-- Table pour stocker l'objet de référence par organisation
CREATE TABLE IF NOT EXISTS "OrganizationMeasurementReferenceConfig" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "referenceType" TEXT NOT NULL CHECK ("referenceType" IN ('meter', 'card', 'a4', 'custom')),
  "customName" TEXT,
  "customSize" DOUBLE PRECISION NOT NULL,
  "customUnit" TEXT NOT NULL DEFAULT 'cm',
  "referenceImageUrl" TEXT,
  "detectionPrompt" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" TEXT NOT NULL,

  CONSTRAINT "OrganizationMeasurementReferenceConfig_pkey" PRIMARY KEY ("id")
);

-- Index unique : une seule config active par organisation
CREATE UNIQUE INDEX "OrganizationMeasurementReferenceConfig_organizationId_key" 
  ON "OrganizationMeasurementReferenceConfig"("organizationId") 
  WHERE "isActive" = true;

-- FK vers Organization
ALTER TABLE "OrganizationMeasurementReferenceConfig"
  ADD CONSTRAINT "OrganizationMeasurementReferenceConfig_organizationId_fkey"
  FOREIGN KEY ("organizationId") 
  REFERENCES "Organization"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- FK vers User (créateur)
ALTER TABLE "OrganizationMeasurementReferenceConfig"
  ADD CONSTRAINT "OrganizationMeasurementReferenceConfig_createdBy_fkey"
  FOREIGN KEY ("createdBy") 
  REFERENCES "User"("id") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

-- Table pour stocker les annotations d'images (points, zones, mesures)
CREATE TABLE IF NOT EXISTS "TreeBranchLeafSubmissionImageAnnotations" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "calibration" JSONB NOT NULL,
  "measurementPoints" JSONB NOT NULL,
  "exclusionZones" JSONB,
  "measurements" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TreeBranchLeafSubmissionImageAnnotations_pkey" PRIMARY KEY ("id")
);

-- Index pour recherche rapide par submission + node
CREATE INDEX "ImageAnnotations_submissionId_nodeId_idx" 
  ON "TreeBranchLeafSubmissionImageAnnotations"("submissionId", "nodeId");

-- FK vers TreeBranchLeafSubmission
ALTER TABLE "TreeBranchLeafSubmissionImageAnnotations"
  ADD CONSTRAINT "TreeBranchLeafSubmissionImageAnnotations_submissionId_fkey"
  FOREIGN KEY ("submissionId") 
  REFERENCES "TreeBranchLeafSubmission"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- FK vers TreeBranchLeafNode
ALTER TABLE "TreeBranchLeafSubmissionImageAnnotations"
  ADD CONSTRAINT "TreeBranchLeafSubmissionImageAnnotations_nodeId_fkey"
  FOREIGN KEY ("nodeId") 
  REFERENCES "TreeBranchLeafNode"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- Commentaires pour documentation
COMMENT ON TABLE "OrganizationMeasurementReferenceConfig" IS 
  'Configuration de l''objet de référence utilisé pour calibrer les mesures IA (une config par organisation)';

COMMENT ON COLUMN "OrganizationMeasurementReferenceConfig"."referenceType" IS 
  'Type d''objet de référence: meter (mètre ruban), card (carte bancaire), a4 (feuille A4), custom (personnalisé)';

COMMENT ON COLUMN "OrganizationMeasurementReferenceConfig"."customSize" IS 
  'Taille de l''objet de référence dans l''unité spécifiée (ex: 8.56 pour une carte bancaire en cm)';

COMMENT ON COLUMN "OrganizationMeasurementReferenceConfig"."referenceImageUrl" IS 
  'Photo de référence de l''objet pour améliorer la détection par l''IA (optionnel)';

COMMENT ON TABLE "TreeBranchLeafSubmissionImageAnnotations" IS 
  'Stocke les annotations d''images (points de mesure, zones d''exclusion, calibration) pour chaque soumission';

COMMENT ON COLUMN "TreeBranchLeafSubmissionImageAnnotations"."calibration" IS 
  'Données de calibration: points de référence, ratio pixels/cm, taille de référence';

COMMENT ON COLUMN "TreeBranchLeafSubmissionImageAnnotations"."measurementPoints" IS 
  'Points de mesure placés sur l''image avec leurs coordonnées et propriétés';

COMMENT ON COLUMN "TreeBranchLeafSubmissionImageAnnotations"."exclusionZones" IS 
  'Zones à exclure des calculs (fenêtres dans un mur, etc.)';

COMMENT ON COLUMN "TreeBranchLeafSubmissionImageAnnotations"."measurements" IS 
  'Résultats des mesures calculées: largeur, hauteur, surface, etc.';
