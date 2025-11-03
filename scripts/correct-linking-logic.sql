-- COMPRENDRE : Variable.nodeId → Capacité.nodeId

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1️⃣ VARIABLE avec son nodeId
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  '📌 VARIABLE' as type,
  id as variable_id,
  "exposedKey",
  "nodeId" as variable_nodeId,
  "sourceRef"
FROM "TreeBranchLeafNodeVariable"
WHERE "sourceRef" LIKE 'node-formula:%'
LIMIT 1;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2️⃣ CHERCHER LA FORMULE avec Variable.nodeId
-- ═══════════════════════════════════════════════════════════════════════════════

WITH var AS (
  SELECT 
    id as variable_id,
    "nodeId" as variable_nodeId,
    "sourceRef"
  FROM "TreeBranchLeafNodeVariable"
  WHERE "sourceRef" LIKE 'node-formula:%'
  LIMIT 1
)
SELECT 
  '✅ FORMULE TROUVÉE via Variable.nodeId' as result,
  var.variable_nodeId as searched_nodeId,
  nf.id as formula_id,
  nf.name as formula_name,
  nf."nodeId" as formula_nodeId,
  nf.tokens
FROM var
JOIN "TreeBranchLeafNodeFormula" nf ON nf."nodeId" = var.variable_nodeId;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3️⃣ VARIABLE COPIÉE (-1)
-- ═══════════════════════════════════════════════════════════════════════════════

WITH var AS (
  SELECT 
    id as variable_id,
    "nodeId" as variable_nodeId,
    "sourceRef",
    id || '-1' as copied_variable_id
  FROM "TreeBranchLeafNodeVariable"
  WHERE "sourceRef" LIKE 'node-formula:%'
  LIMIT 1
)
SELECT 
  '🔄 VARIABLE COPIÉE' as type,
  v.id as copied_variable_id,
  v."nodeId" as copied_variable_nodeId,
  v."sourceRef" as copied_sourceRef
FROM var
JOIN "TreeBranchLeafNodeVariable" v ON v.id = var.copied_variable_id;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4️⃣ CHERCHER LA FORMULE COPIÉE avec Variable-copiée.nodeId
-- ═══════════════════════════════════════════════════════════════════════════════

WITH var_copied AS (
  SELECT 
    v.id as copied_variable_id,
    v."nodeId" as copied_variable_nodeId
  FROM "TreeBranchLeafNodeVariable" v
  WHERE v.id LIKE '%-1'
    AND v."sourceRef" LIKE 'node-formula:%'
  LIMIT 1
)
SELECT 
  '❓ FORMULE COPIÉE' as result,
  vc.copied_variable_nodeId as searched_nodeId,
  nf.id as formula_id,
  nf.name as formula_name,
  nf."nodeId" as formula_nodeId,
  CASE WHEN nf.id IS NOT NULL THEN '✅ EXISTE' ELSE '❌ MANQUANTE !' END as status
FROM var_copied vc
LEFT JOIN "TreeBranchLeafNodeFormula" nf ON nf."nodeId" = vc.copied_variable_nodeId;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5️⃣ RÉSUMÉ : CE QUI DOIT ÊTRE FAIT
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  '📊 RÉSUMÉ' as section,
  COUNT(DISTINCT v.id) FILTER (WHERE v.id NOT LIKE '%-1') as variables_originales,
  COUNT(DISTINCT v.id) FILTER (WHERE v.id LIKE '%-1') as variables_copiees,
  
  COUNT(DISTINCT nf.id) FILTER (WHERE nf."nodeId" NOT LIKE '%-1') as formules_originales,
  COUNT(DISTINCT nf.id) FILTER (WHERE nf."nodeId" LIKE '%-1') as formules_copiees,
  
  COUNT(DISTINCT v.id) FILTER (WHERE v.id LIKE '%-1') - 
  COUNT(DISTINCT nf.id) FILTER (WHERE nf."nodeId" LIKE '%-1') as formules_manquantes
  
FROM "TreeBranchLeafNodeVariable" v
LEFT JOIN "TreeBranchLeafNodeFormula" nf ON nf."nodeId" = v."nodeId"
WHERE v."sourceRef" LIKE 'node-formula:%';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6️⃣ LISTE DES FORMULES À COPIER
-- ═══════════════════════════════════════════════════════════════════════════════

WITH vars_to_copy AS (
  SELECT DISTINCT
    v."nodeId" as original_nodeId,
    v."nodeId" || '-1' as target_nodeId
  FROM "TreeBranchLeafNodeVariable" v
  WHERE v."sourceRef" LIKE 'node-formula:%'
    AND v.id LIKE '%-1'
)
SELECT 
  '🎯 À COPIER' as action,
  vtc.original_nodeId,
  vtc.target_nodeId,
  nf.id as formula_id,
  nf.name as formula_name,
  nf.tokens,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM "TreeBranchLeafNodeFormula" nf2 
      WHERE nf2."nodeId" = vtc.target_nodeId
    ) THEN '✅ Déjà copié'
    ELSE '❌ À COPIER'
  END as copy_status
FROM vars_to_copy vtc
JOIN "TreeBranchLeafNodeFormula" nf ON nf."nodeId" = vtc.original_nodeId;
