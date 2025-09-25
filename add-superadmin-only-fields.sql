-- Migration pour ajouter le champ superAdminOnly aux modules et sections

-- Ajouter le champ aux modules
ALTER TABLE "Module" 
ADD COLUMN "superAdminOnly" BOOLEAN DEFAULT false;

-- Ajouter le champ aux sections de navigation  
ALTER TABLE "NavigationSection" 
ADD COLUMN "superAdminOnly" BOOLEAN DEFAULT false;

-- Index pour optimiser les requêtes
CREATE INDEX "Module_superAdminOnly_idx" ON "Module"("superAdminOnly");
CREATE INDEX "NavigationSection_superAdminOnly_idx" ON "NavigationSection"("superAdminOnly");

-- Commentaires pour la documentation
COMMENT ON COLUMN "Module"."superAdminOnly" IS 'Indique si ce module est réservé aux super administrateurs uniquement';
COMMENT ON COLUMN "NavigationSection"."superAdminOnly" IS 'Indique si cette section est réservée aux super administrateurs uniquement';
