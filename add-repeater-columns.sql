-- Migration manuelle : Ajout des colonnes repeater_* pour leaf_repeater
-- Date : 15 octobre 2025
-- Ne nécessite PAS de reset de la base de données

-- Ajouter les colonnes repeater si elles n'existent pas déjà
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN IF NOT EXISTS "repeater_templateNodeIds" TEXT,
ADD COLUMN IF NOT EXISTS "repeater_minItems" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "repeater_maxItems" INTEGER,
ADD COLUMN IF NOT EXISTS "repeater_addButtonLabel" TEXT DEFAULT 'Ajouter une entrée';

-- Log de confirmation
SELECT 'Migration repeater columns completed successfully' as status;
