-- Script SQL pour identifier les champs "panneau" et ajouter leurs IDs au repeater Versant

-- 1. Trouver tous les champs contenant "panneau"
SELECT 
  id,
  label,
  "parentId",
  subtab,
  "order",
  metadata->'repeater' as repeater_capability
FROM "TreeNode"
WHERE 
  type = 'leaf_field'
  AND (label ILIKE '%panneau%')
ORDER BY label;

-- 2. Trouver le repeater "Versant"
SELECT 
  id,
  label,
  metadata->'repeater'->'templateNodeIds' as current_template_ids
FROM "TreeNode"
WHERE 
  label ILIKE '%Versant%'
  AND metadata->'repeater'->'templateNodeIds' IS NOT NULL;

-- 3. IMPORTANT: Copie la sortie ci-dessus, puis crée manuellement la requête UPDATE
-- Une fois que tu as les IDs des champs "N° de panneau" et "Panneau", ajoute-les comme ceci:
--
-- UPDATE "TreeNode"
-- SET metadata = jsonb_set(
--   metadata,
--   '{repeater,templateNodeIds}',
--   '["id1", "id2", "id3", ..., "id_panneau1", "id_panneau2"]'::jsonb
-- )
-- WHERE id = 'ID_DU_REPEATER_VERSANT';
