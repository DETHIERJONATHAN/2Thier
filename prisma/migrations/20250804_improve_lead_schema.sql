-- Migration pour améliorer le schéma Lead
-- Ajouter des champs séparés au lieu du JSON data

ALTER TABLE "Lead" ADD COLUMN "firstName" TEXT;
ALTER TABLE "Lead" ADD COLUMN "lastName" TEXT;
ALTER TABLE "Lead" ADD COLUMN "email" TEXT;
ALTER TABLE "Lead" ADD COLUMN "phone" TEXT;
ALTER TABLE "Lead" ADD COLUMN "company" TEXT;
ALTER TABLE "Lead" ADD COLUMN "website" TEXT;
ALTER TABLE "Lead" ADD COLUMN "linkedin" TEXT;
ALTER TABLE "Lead" ADD COLUMN "notes" TEXT;
ALTER TABLE "Lead" ADD COLUMN "lastContactDate" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "nextFollowUpDate" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "leadNumber" TEXT;

-- Créer un index pour le leadNumber
CREATE UNIQUE INDEX "Lead_leadNumber_key" ON "Lead"("leadNumber");

-- Ajouter un index sur l'email pour les recherches
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- Ajouter un index sur le nom complet pour les recherches
CREATE INDEX "Lead_firstName_lastName_idx" ON "Lead"("firstName", "lastName");
