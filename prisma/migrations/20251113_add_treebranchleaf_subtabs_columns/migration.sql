-- Add subtabs & subtab columns to TreeBranchLeafNode
ALTER TABLE "TreeBranchLeafNode" ADD COLUMN IF NOT EXISTS "subtabs" JSONB;
ALTER TABLE "TreeBranchLeafNode" ADD COLUMN IF NOT EXISTS "subtab" VARCHAR(255);

-- Optionally add index for queries searching subtab
CREATE INDEX IF NOT EXISTS "TreeBranchLeafNode_subtab_idx" ON "TreeBranchLeafNode" ("subtab");

/* NOTE: This migration is additive and non-destructive. Apply using:
   npx prisma migrate dev --name add_treebranchleaf_subtabs_columns
   or directly via psql (if you prefer):
   psql $DATABASE_URL -f prisma/migrations/20251113_add_treebranchleaf_subtabs_columns/migration.sql
*/