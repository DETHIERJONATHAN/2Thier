-- Migration: Ajout du champ repeater_countSourceNodeId
-- Ce champ permet de lier un répéteur à un champ numérique qui contrôle le nombre de copies
-- 
-- Exemple d'utilisation:
-- - Dans "Généralités", un champ "Nombre de versants" (type number, min 1, max 10)
-- - Le répéteur "Versant" a repeater_countSourceNodeId = UUID du champ "Nombre de versants"
-- - Quand l'utilisateur met "3" dans "Nombre de versants", le système crée automatiquement 3 copies

-- Ajouter le champ sur TreeBranchLeafNode
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN IF NOT EXISTS "repeater_countSourceNodeId" TEXT;

-- Index pour les recherches de répéteurs avec source de comptage
CREATE INDEX IF NOT EXISTS "idx_tbl_node_repeater_count_source" 
ON "TreeBranchLeafNode" ("repeater_countSourceNodeId") 
WHERE "repeater_countSourceNodeId" IS NOT NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN "TreeBranchLeafNode"."repeater_countSourceNodeId" IS 
'UUID du champ numérique qui contrôle le nombre de copies à créer automatiquement. Quand ce champ change de valeur, le système pré-crée les copies en arrière-plan.';
