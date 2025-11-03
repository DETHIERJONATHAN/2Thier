-- COMPRENDRE LA LIAISON : Variable → Node → Capacité

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1️⃣ UNE VARIABLE AVEC FORMULE
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  'VARIABLE' as type,
  id,
  "exposedKey",
  "sourceType",
  "sourceRef",
  "nodeId"
FROM "TreeBranchLeafNodeVariable"
WHERE "sourceRef" LIKE 'node-formula:%'
LIMIT 1;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2️⃣ EXTRAIRE L'ID DU SOURCEREF ET CHERCHER LA FORMULE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Méthode 1 : sourceRef pointe vers NodeFormula.id directement ?
WITH variable_info AS (
  SELECT 
    id as variable_id,
    "sourceRef",
    REPLACE("sourceRef", 'node-formula:', '') as extracted_id
  FROM "TreeBranchLeafNodeVariable"
  WHERE "sourceRef" LIKE 'node-formula:%'
  LIMIT 1
)
SELECT 
  '🔍 MÉTHODE 1: NodeFormula.id =' as method,
  vi.extracted_id,
  nf.id as formula_id,
  nf.name as formula_name,
  nf."nodeId" as formula_nodeId,
  CASE WHEN nf.id IS NOT NULL THEN '✅ TROUVÉ' ELSE '❌ NON TROUVÉ' END as status
FROM variable_info vi
LEFT JOIN "NodeFormula" nf ON nf.id = vi.extracted_id;

-- Méthode 2 : sourceRef pointe vers TreeBranchLeaf.id qui CONTIENT la formule ?
WITH variable_info AS (
  SELECT 
    id as variable_id,
    "sourceRef",
    REPLACE("sourceRef", 'node-formula:', '') as extracted_id
  FROM "TreeBranchLeafNodeVariable"
  WHERE "sourceRef" LIKE 'node-formula:%'
  LIMIT 1
)
SELECT 
  '🔍 MÉTHODE 2: NodeFormula.nodeId =' as method,
  vi.extracted_id,
  nf.id as formula_id,
  nf.name as formula_name,
  nf."nodeId" as formula_nodeId,
  nf.tokens,
  CASE WHEN nf.id IS NOT NULL THEN '✅✅✅ TROUVÉ' ELSE '❌ NON TROUVÉ' END as status
FROM variable_info vi
LEFT JOIN "NodeFormula" nf ON nf."nodeId" = vi.extracted_id;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3️⃣ VÉRIFIER SI LE NODE EXISTE
-- ═══════════════════════════════════════════════════════════════════════════════

WITH variable_info AS (
  SELECT 
    id as variable_id,
    "sourceRef",
    REPLACE("sourceRef", 'node-formula:', '') as extracted_id
  FROM "TreeBranchLeafNodeVariable"
  WHERE "sourceRef" LIKE 'node-formula:%'
  LIMIT 1
)
SELECT 
  '🌲 NODE' as type,
  vi.extracted_id as node_id,
  tbl.id,
  tbl.label,
  tbl.type,
  tbl."parentId",
  CASE WHEN tbl.id IS NOT NULL THEN '✅ TROUVÉ' ELSE '❌ NON TROUVÉ' END as status
FROM variable_info vi
LEFT JOIN "TreeBranchLeaf" tbl ON tbl.id = vi.extracted_id;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4️⃣ ANALYSER LA VARIABLE COPIÉE (-1)
-- ═══════════════════════════════════════════════════════════════════════════════

WITH original_variable AS (
  SELECT 
    id as variable_id,
    "sourceRef",
    REPLACE("sourceRef", 'node-formula:', '') as extracted_id,
    id || '-1' as copied_variable_id
  FROM "TreeBranchLeafNodeVariable"
  WHERE "sourceRef" LIKE 'node-formula:%'
  LIMIT 1
)
SELECT 
  '🔄 VARIABLE COPIÉE' as type,
  ov.copied_variable_id,
  v."sourceRef" as copied_sourceRef,
  REPLACE(v."sourceRef", 'node-formula:', '') as copied_extracted_id,
  v."nodeId" as copied_nodeId,
  CASE WHEN v.id IS NOT NULL THEN '✅ EXISTE' ELSE '❌ N\'EXISTE PAS' END as variable_status
FROM original_variable ov
LEFT JOIN "TreeBranchLeafNodeVariable" v ON v.id = ov.copied_variable_id;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5️⃣ VÉRIFIER SI LA CAPACITÉ COPIÉE EXISTE
-- ═══════════════════════════════════════════════════════════════════════════════

WITH original_variable AS (
  SELECT 
    id as variable_id,
    "sourceRef",
    REPLACE("sourceRef", 'node-formula:', '') as extracted_id,
    id || '-1' as copied_variable_id
  FROM "TreeBranchLeafNodeVariable"
  WHERE "sourceRef" LIKE 'node-formula:%'
  LIMIT 1
),
copied_variable AS (
  SELECT 
    v.id,
    v."sourceRef",
    REPLACE(v."sourceRef", 'node-formula:', '') as extracted_id
  FROM original_variable ov
  JOIN "TreeBranchLeafNodeVariable" v ON v.id = ov.copied_variable_id
)
SELECT 
  '❓ CAPACITÉ COPIÉE' as type,
  cv.extracted_id as searched_nodeId,
  nf.id as formula_id,
  nf.name as formula_name,
  nf."nodeId" as formula_nodeId,
  CASE WHEN nf.id IS NOT NULL THEN '✅ EXISTE' ELSE '❌ N\'EXISTE PAS' END as capacity_status
FROM copied_variable cv
LEFT JOIN "NodeFormula" nf ON nf."nodeId" = cv.extracted_id;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6️⃣ VÉRIFIER SI LE NODE COPIÉ EXISTE
-- ═══════════════════════════════════════════════════════════════════════════════

WITH original_variable AS (
  SELECT 
    id as variable_id,
    "sourceRef",
    REPLACE("sourceRef", 'node-formula:', '') as extracted_id,
    id || '-1' as copied_variable_id
  FROM "TreeBranchLeafNodeVariable"
  WHERE "sourceRef" LIKE 'node-formula:%'
  LIMIT 1
),
copied_variable AS (
  SELECT 
    v.id,
    v."sourceRef",
    REPLACE(v."sourceRef", 'node-formula:', '') as extracted_id
  FROM original_variable ov
  JOIN "TreeBranchLeafNodeVariable" v ON v.id = ov.copied_variable_id
)
SELECT 
  '❓ NODE COPIÉ' as type,
  cv.extracted_id as searched_node_id,
  tbl.id,
  tbl.label,
  tbl.type,
  CASE WHEN tbl.id IS NOT NULL THEN '✅ EXISTE' ELSE '❌ N\'EXISTE PAS' END as node_status
FROM copied_variable cv
LEFT JOIN "TreeBranchLeaf" tbl ON tbl.id = cv.extracted_id;
