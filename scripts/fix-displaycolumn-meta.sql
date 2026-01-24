-- Script SQL pour corriger le displayColumn dans le meta de la table
-- Ce script corrige le bug où meta.lookup.displayColumn contient "Puissance" au lieu de "Puissance-1"

-- 1. Vérifier l'état actuel
SELECT 
  t.id as table_id,
  t.name as table_name,
  t.meta->>'lookup' as lookup_meta,
  (t.meta->'lookup'->>'displayColumn') as current_display_column
FROM "TreeBranchLeafNodeTable" t
WHERE t.id = 'a897ea6c-0c9a-411e-a573-87ebf7629716-1';

-- 2. Mettre à jour le meta.lookup.displayColumn
UPDATE "TreeBranchLeafNodeTable"
SET meta = jsonb_set(
  meta,
  '{lookup,displayColumn}',
  '["Puissance-1"]'::jsonb
)
WHERE id = 'a897ea6c-0c9a-411e-a573-87ebf7629716-1';

-- 3. Vérifier que la correction a été appliquée
SELECT 
  t.id as table_id,
  t.name as table_name,
  (t.meta->'lookup'->>'displayColumn') as updated_display_column
FROM "TreeBranchLeafNodeTable" t
WHERE t.id = 'a897ea6c-0c9a-411e-a573-87ebf7629716-1';
