-- AlterTable: Change subtab column from String to Json
ALTER TABLE "TreeBranchLeafNode" ALTER COLUMN "subtab" DROP NOT NULL;
ALTER TABLE "TreeBranchLeafNode" ALTER COLUMN "subtab" TYPE jsonb USING 
  CASE 
    WHEN "subtab" IS NULL THEN NULL
    WHEN "subtab" = '' THEN NULL
    ELSE to_jsonb("subtab")
  END;
