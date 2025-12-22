-- Ajouter la colonne treeId au DocumentTemplate
ALTER TABLE "DocumentTemplate" ADD COLUMN IF NOT EXISTS "treeId" TEXT;

-- Créer l'index
CREATE INDEX IF NOT EXISTS "DocumentTemplate_treeId_idx" ON "DocumentTemplate"("treeId");

-- Ajouter la contrainte de clé étrangère (seulement si elle n'existe pas)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'DocumentTemplate_treeId_fkey'
    ) THEN
        ALTER TABLE "DocumentTemplate" 
        ADD CONSTRAINT "DocumentTemplate_treeId_fkey" 
        FOREIGN KEY ("treeId") 
        REFERENCES "TreeBranchLeafTree"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
