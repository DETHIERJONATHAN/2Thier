-- AlterTable
ALTER TABLE "public"."TreeBranchLeafNode" ADD COLUMN     "file_allowedTypes" TEXT,
ADD COLUMN     "file_maxSize" INTEGER,
ADD COLUMN     "file_multiple" BOOLEAN DEFAULT false,
ADD COLUMN     "file_showPreview" BOOLEAN DEFAULT true,
ADD COLUMN     "section_collapsible" BOOLEAN DEFAULT false,
ADD COLUMN     "section_columnsDesktop" INTEGER DEFAULT 2,
ADD COLUMN     "section_columnsMobile" INTEGER DEFAULT 1,
ADD COLUMN     "section_defaultCollapsed" BOOLEAN DEFAULT false,
ADD COLUMN     "section_gutter" INTEGER DEFAULT 16,
ADD COLUMN     "section_showChildrenCount" BOOLEAN DEFAULT false,
ALTER COLUMN "subtab" SET DATA TYPE JSON;
