-- Migration pour créer la table CallStatus
-- Cette table stockera les statuts d'appels configurables par organisation

-- Création de la table CallStatus
CREATE TABLE "CallStatus" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Contrainte de clé étrangère
  CONSTRAINT "CallStatus_organizationId_fkey" 
    FOREIGN KEY ("organizationId") 
    REFERENCES "Organization"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Index pour améliorer les performances
CREATE INDEX "CallStatus_organizationId_idx" ON "CallStatus"("organizationId");
CREATE INDEX "CallStatus_organizationId_order_idx" ON "CallStatus"("organizationId", "order");

-- Insertion des statuts par défaut pour l'organisation existante si elle existe
-- (cette partie sera exécutée automatiquement lors de la première requête GET)
