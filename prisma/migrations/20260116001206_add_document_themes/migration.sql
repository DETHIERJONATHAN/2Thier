-- CreateTable DocumentTheme
CREATE TABLE "DocumentTheme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "accentColor" TEXT,
    "textColor" TEXT NOT NULL,
    "backgroundColor" TEXT NOT NULL,
    "headerBgColor" TEXT NOT NULL,
    "footerBgColor" TEXT NOT NULL,
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
    "fontSize" INTEGER NOT NULL DEFAULT 12,
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTheme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTheme_organizationId_name_key" ON "DocumentTheme"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "DocumentTheme" ADD CONSTRAINT "DocumentTheme_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
