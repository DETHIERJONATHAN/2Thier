-- Migration pour ajouter la configuration de lookup aux tables TreeBranchLeaf
-- Date: 2025-10-05
-- Description: Permet de configurer les colonnes de sélection et d'affichage pour les tables simples

-- Ajouter la colonne de sélection (colonne dans laquelle l'utilisateur fait son choix)
ALTER TABLE "TreeBranchLeafNodeTable"
ADD COLUMN IF NOT EXISTS "lookupSelectColumn" TEXT;

-- Ajouter les colonnes d'affichage (colonnes dont on veut récupérer les données après sélection)
ALTER TABLE "TreeBranchLeafNodeTable"
ADD COLUMN IF NOT EXISTS "lookupDisplayColumns" TEXT[] DEFAULT '{}';

-- Ajouter un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS "TreeBranchLeafNodeTable_lookupSelectColumn_idx"
ON "TreeBranchLeafNodeTable"("lookupSelectColumn");

-- Commentaires pour documentation
COMMENT ON COLUMN "TreeBranchLeafNodeTable"."lookupSelectColumn" IS 'Colonne utilisée pour le choix dans le lookup (ex: "Marque")';
COMMENT ON COLUMN "TreeBranchLeafNodeTable"."lookupDisplayColumns" IS 'Colonnes dont les données seront récupérées après sélection (ex: ["WC", "Volt", "Prix"])';

-- Vérification
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'TreeBranchLeafNodeTable' 
  AND column_name IN ('lookupSelectColumn', 'lookupDisplayColumns')
ORDER BY column_name;
