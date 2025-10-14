-- Migration NON-DESTRUCTIVE : Système de sauvegarde TBL avancé
-- Date: 2025-10-06
-- Description: Ajoute les tables pour brouillons temporaires, versioning et gestion de conflits
-- ⚠️ ZÉRO SUPPRESSION - Uniquement des ajouts de tables et colonnes

-- =====================================================
-- 1. NOUVELLE TABLE: TreeBranchLeafStage (Brouillons temporaires)
-- =====================================================
-- Stocke les brouillons en cours d'édition avec TTL de 24h
CREATE TABLE IF NOT EXISTS "TreeBranchLeafStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "treeId" TEXT NOT NULL,
    "submissionId" TEXT,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "formData" JSONB NOT NULL DEFAULT '{}',
    "baseVersion" INTEGER NOT NULL DEFAULT 1,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "TreeBranchLeafStage_leadId_fkey" 
        FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TreeBranchLeafStage_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Index pour nettoyage automatique des brouillons expirés
CREATE INDEX IF NOT EXISTS "TreeBranchLeafStage_expiresAt_idx" ON "TreeBranchLeafStage"("expiresAt");
CREATE INDEX IF NOT EXISTS "TreeBranchLeafStage_userId_leadId_idx" ON "TreeBranchLeafStage"("userId", "leadId");
CREATE INDEX IF NOT EXISTS "TreeBranchLeafStage_submissionId_idx" ON "TreeBranchLeafStage"("submissionId");
CREATE INDEX IF NOT EXISTS "TreeBranchLeafStage_treeId_idx" ON "TreeBranchLeafStage"("treeId");

COMMENT ON TABLE "TreeBranchLeafStage" IS 'Brouillons temporaires de devis (TTL: 24h). Auto-nettoyés via cron job.';
COMMENT ON COLUMN "TreeBranchLeafStage"."expiresAt" IS 'Date d expiration automatique du brouillon (now + 24h)';
COMMENT ON COLUMN "TreeBranchLeafStage"."baseVersion" IS 'Version de la submission au moment de l ouverture (pour détection conflits)';

-- =====================================================
-- 2. NOUVELLE TABLE: TreeBranchLeafSubmissionVersion (Historique)
-- =====================================================
-- Stocke l'historique des versions de chaque devis (max 20 versions)
CREATE TABLE IF NOT EXISTS "TreeBranchLeafSubmissionVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "formData" JSONB NOT NULL,
    "summary" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "TreeBranchLeafSubmissionVersion_submissionId_fkey" 
        FOREIGN KEY ("submissionId") REFERENCES "TreeBranchLeafSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TreeBranchLeafSubmissionVersion_createdBy_fkey" 
        FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    
    CONSTRAINT "TreeBranchLeafSubmissionVersion_submissionId_version_key" 
        UNIQUE ("submissionId", "version")
);

CREATE INDEX IF NOT EXISTS "TreeBranchLeafSubmissionVersion_submissionId_idx" ON "TreeBranchLeafSubmissionVersion"("submissionId");
CREATE INDEX IF NOT EXISTS "TreeBranchLeafSubmissionVersion_createdAt_idx" ON "TreeBranchLeafSubmissionVersion"("createdAt");
CREATE INDEX IF NOT EXISTS "TreeBranchLeafSubmissionVersion_createdBy_idx" ON "TreeBranchLeafSubmissionVersion"("createdBy");

COMMENT ON TABLE "TreeBranchLeafSubmissionVersion" IS 'Historique des versions de devis. Max 20 versions conservées par submission.';
COMMENT ON COLUMN "TreeBranchLeafSubmissionVersion"."summary" IS 'Résumé optionnel des modifications (ex: "Modifié prix et quantité")';

-- =====================================================
-- 3. AJOUT COLONNES: TreeBranchLeafSubmission (Versioning + Lock)
-- =====================================================
-- Ajoute les colonnes pour le versioning et la gestion des conflits multi-utilisateurs
ALTER TABLE "TreeBranchLeafSubmission" 
    ADD COLUMN IF NOT EXISTS "currentVersion" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS "lastEditedBy" TEXT,
    ADD COLUMN IF NOT EXISTS "lockedBy" TEXT,
    ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3);

-- Foreign keys pour les nouvelles colonnes
DO $$ 
BEGIN
    -- lastEditedBy FK
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'TreeBranchLeafSubmission_lastEditedBy_fkey'
    ) THEN
        ALTER TABLE "TreeBranchLeafSubmission"
        ADD CONSTRAINT "TreeBranchLeafSubmission_lastEditedBy_fkey" 
        FOREIGN KEY ("lastEditedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    -- lockedBy FK
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'TreeBranchLeafSubmission_lockedBy_fkey'
    ) THEN
        ALTER TABLE "TreeBranchLeafSubmission"
        ADD CONSTRAINT "TreeBranchLeafSubmission_lockedBy_fkey" 
        FOREIGN KEY ("lockedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Index pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS "TreeBranchLeafSubmission_lockedBy_idx" ON "TreeBranchLeafSubmission"("lockedBy");
CREATE INDEX IF NOT EXISTS "TreeBranchLeafSubmission_lastEditedBy_idx" ON "TreeBranchLeafSubmission"("lastEditedBy");

COMMENT ON COLUMN "TreeBranchLeafSubmission"."currentVersion" IS 'Numéro de version actuelle (incrémenté à chaque sauvegarde)';
COMMENT ON COLUMN "TreeBranchLeafSubmission"."lastEditedBy" IS 'Dernier utilisateur ayant modifié la submission';
COMMENT ON COLUMN "TreeBranchLeafSubmission"."lockedBy" IS 'Utilisateur verrouillant actuellement la submission (pour édition exclusive)';
COMMENT ON COLUMN "TreeBranchLeafSubmission"."lockedAt" IS 'Date de verrouillage (expire automatiquement après 1h)';

-- =====================================================
-- 4. FONCTION: Nettoyage automatique des brouillons expirés
-- =====================================================
-- Fonction appelée par un cron job pour supprimer les stages périmés
CREATE OR REPLACE FUNCTION cleanup_expired_tbl_stages()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM "TreeBranchLeafStage"
    WHERE "expiresAt" < NOW();
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Nettoyage TBL: % brouillons expirés supprimés', v_deleted_count;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_tbl_stages() IS 'Supprime les brouillons TBL expirés (>24h). À exécuter via cron job toutes les heures.';

-- =====================================================
-- 5. FONCTION: Nettoyage des vieilles versions (garde 20 dernières)
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_old_tbl_versions()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER := 0;
    v_current_deleted INTEGER;
    submission_rec RECORD;
BEGIN
    -- Pour chaque submission ayant plus de 20 versions
    FOR submission_rec IN (
        SELECT "submissionId", COUNT(*) as version_count
        FROM "TreeBranchLeafSubmissionVersion"
        GROUP BY "submissionId"
        HAVING COUNT(*) > 20
    ) LOOP
        -- Supprimer les versions au-delà des 20 dernières
        DELETE FROM "TreeBranchLeafSubmissionVersion"
        WHERE "submissionId" = submission_rec."submissionId"
        AND "version" NOT IN (
            SELECT "version"
            FROM "TreeBranchLeafSubmissionVersion"
            WHERE "submissionId" = submission_rec."submissionId"
            ORDER BY "version" DESC
            LIMIT 20
        );
        
        GET DIAGNOSTICS v_current_deleted = ROW_COUNT;
        v_deleted_count := v_deleted_count + v_current_deleted;
    END LOOP;
    
    RAISE NOTICE 'Nettoyage versions: % anciennes versions supprimées', v_deleted_count;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_tbl_versions() IS 'Garde uniquement les 20 dernières versions par submission. À exécuter quotidiennement.';

-- =====================================================
-- 6. TRIGGER: Auto-update lastActivity sur Stage
-- =====================================================
-- Met à jour automatiquement lastActivity lors d'une modification de formData
CREATE OR REPLACE FUNCTION update_stage_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW."lastActivity" = NOW();
    -- Renouveler l'expiration (+24h) si modification récente
    IF (NEW."expiresAt" - NOW()) < INTERVAL '12 hours' THEN
        NEW."expiresAt" = NOW() + INTERVAL '24 hours';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stage_activity ON "TreeBranchLeafStage";
CREATE TRIGGER trigger_update_stage_activity
    BEFORE UPDATE OF "formData" ON "TreeBranchLeafStage"
    FOR EACH ROW
    EXECUTE FUNCTION update_stage_last_activity();

COMMENT ON FUNCTION update_stage_last_activity() IS 'Met à jour lastActivity et renouvelle expiresAt lors de modifications actives';

-- =====================================================
-- 7. STATISTIQUES ET VÉRIFICATIONS
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration TBL Draft System appliquée avec succès !';
    RAISE NOTICE '📊 Nouvelles tables créées:';
    RAISE NOTICE '   - TreeBranchLeafStage (brouillons temporaires)';
    RAISE NOTICE '   - TreeBranchLeafSubmissionVersion (historique)';
    RAISE NOTICE '🔧 Colonnes ajoutées à TreeBranchLeafSubmission:';
    RAISE NOTICE '   - currentVersion (versioning)';
    RAISE NOTICE '   - lastEditedBy (traçabilité)';
    RAISE NOTICE '   - lockedBy/lockedAt (gestion conflits)';
    RAISE NOTICE '⚙️  Fonctions créées:';
    RAISE NOTICE '   - cleanup_expired_tbl_stages() [cron: hourly]';
    RAISE NOTICE '   - cleanup_old_tbl_versions() [cron: daily]';
END $$;
