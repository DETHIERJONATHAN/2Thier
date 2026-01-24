-- Fix: Réinitialiser le fieldType des champs Puissance WC suffixés
-- Problème: Les copies ont fieldType='TEXT' au lieu de '' (vide = calculé)
-- Solution: Mettre fieldType à NULL ou '' pour que le backend les reconnaisse comme calculés

BEGIN;

-- Afficher l'état actuel
SELECT 
  id,
  label,
  "fieldType",
  "hasFormula",
  "formula_activeId"
FROM "TreeBranchLeafNode"
WHERE id LIKE 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23%'
ORDER BY id;

-- Mettre à jour le fieldType des copies pour qu'il soit NULL (comme l'original)
UPDATE "TreeBranchLeafNode"
SET "fieldType" = NULL
WHERE id IN (
  'c8139b2c-b0a8-44e7-8448-137fd2fb8e23-1',
  'c8139b2c-b0a8-44e7-8448-137fd2fb8e23-2',
  'c8139b2c-b0a8-44e7-8448-137fd2fb8e23-3'
);

-- Vérifier le résultat
SELECT 
  id,
  label,
  "fieldType",
  "hasFormula",
  "formula_activeId"
FROM "TreeBranchLeafNode"
WHERE id LIKE 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23%'
ORDER BY id;

COMMIT;
