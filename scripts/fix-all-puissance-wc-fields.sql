-- Fix complet: Réinitialiser fieldType pour TOUS les champs avec formules
-- Pour que le moteur de calcul les reconnaisse comme calculés

BEGIN;

-- 1. Afficher tous les champs Puissance WC (original + copies)
SELECT 
  id,
  label,
  "fieldType",
  "hasFormula",
  "formula_activeId"
FROM "TreeBranchLeafNode"
WHERE id LIKE 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23%'
ORDER BY id;

-- 2. Mettre fieldType à NULL pour TOUS les champs qui ont hasFormula=true
-- Cela inclut l'original ET toutes les copies
UPDATE "TreeBranchLeafNode"
SET "fieldType" = NULL
WHERE id LIKE 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23%'
  AND "hasFormula" = true;

-- 3. Vérifier le résultat
SELECT 
  id,
  label,
  "fieldType",
  "hasFormula",
  "formula_activeId"
FROM "TreeBranchLeafNode"
WHERE id LIKE 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23%'
ORDER BY id;

-- 4. Supprimer les anciennes données calculées pour forcer un recalcul
DELETE FROM "TreeBranchLeafSubmissionData"
WHERE "nodeId" LIKE 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23%';

COMMIT;

-- Résultat attendu: TOUS les champs (original + copies) ont fieldType=NULL
-- Au prochain remplissage du formulaire, le backend devrait recalculer automatiquement
