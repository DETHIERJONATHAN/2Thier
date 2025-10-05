-- Ajouter les colonnes tooltip à la table TreeBranchLeafNode
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN IF NOT EXISTS "text_helpTooltipType" TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS "text_helpTooltipText" TEXT,
ADD COLUMN IF NOT EXISTS "text_helpTooltipImage" TEXT;