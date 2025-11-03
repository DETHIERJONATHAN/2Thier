-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 ANALYSE COMPLÈTE DU LINKING Variable ↔ Capacité
-- ═══════════════════════════════════════════════════════════════════════════

-- SECTION 1: Variables avec leurs nodeIds
-- ─────────────────────────────────────────────────────────────────────────
SELECT 
  v.id AS variable_id,
  v.nodeId AS variable_nodeId,
  v.exposedKey,
  v.sourceRef,
  CASE 
    WHEN v.sourceRef LIKE 'node-formula:%' THEN 'FORMULE'
    WHEN v.sourceRef LIKE 'node-condition:%' THEN 'CONDITION'
    WHEN v.sourceRef LIKE 'node-table:%' THEN 'TABLE'
    ELSE 'AUTRE'
  END AS type_capacite
FROM "TreeBranchLeafNodeVariable" v
WHERE v.sourceRef IS NOT NULL
ORDER BY v.exposedKey;

-- SECTION 2: Pour chaque variable avec formule, retrouver la formule par nodeId
-- ─────────────────────────────────────────────────────────────────────────
SELECT 
  v.exposedKey AS variable_key,
  v.nodeId AS variable_nodeId,
  v.sourceRef AS variable_sourceRef,
  f.id AS formula_id,
  f.nodeId AS formula_nodeId,
  f.name AS formula_name,
  CASE 
    WHEN v.nodeId = f.nodeId THEN '✅ MATCH'
    ELSE '❌ PAS DE MATCH'
  END AS match_status
FROM "TreeBranchLeafNodeVariable" v
LEFT JOIN "TreeBranchLeafNodeFormula" f ON f.nodeId = v.nodeId
WHERE v.sourceRef LIKE 'node-formula:%'
ORDER BY v.exposedKey;

-- SECTION 3: Pour chaque variable avec condition, retrouver la condition par nodeId
-- ─────────────────────────────────────────────────────────────────────────
SELECT 
  v.exposedKey AS variable_key,
  v.nodeId AS variable_nodeId,
  v.sourceRef AS variable_sourceRef,
  c.id AS condition_id,
  c.nodeId AS condition_nodeId,
  c.name AS condition_name,
  CASE 
    WHEN v.nodeId = c.nodeId THEN '✅ MATCH'
    ELSE '❌ PAS DE MATCH'
  END AS match_status
FROM "TreeBranchLeafNodeVariable" v
LEFT JOIN "TreeBranchLeafNodeCondition" c ON c.nodeId = v.nodeId
WHERE v.sourceRef LIKE 'node-condition:%'
ORDER BY v.exposedKey;

-- SECTION 4: Pour chaque variable avec table, retrouver la table par nodeId
-- ─────────────────────────────────────────────────────────────────────────
SELECT 
  v.exposedKey AS variable_key,
  v.nodeId AS variable_nodeId,
  v.sourceRef AS variable_sourceRef,
  t.id AS table_id,
  t.nodeId AS table_nodeId,
  t.name AS table_name,
  CASE 
    WHEN v.nodeId = t.nodeId THEN '✅ MATCH'
    ELSE '❌ PAS DE MATCH'
  END AS match_status
FROM "TreeBranchLeafNodeVariable" v
LEFT JOIN "TreeBranchLeafNodeTable" t ON t.nodeId = v.nodeId
WHERE v.sourceRef LIKE 'node-table:%'
ORDER BY v.exposedKey;

-- SECTION 5: Variables COPIÉES (avec -1) et leurs capacités
-- ─────────────────────────────────────────────────────────────────────────
SELECT 
  v.exposedKey AS variable_key,
  v.nodeId AS variable_nodeId,
  v.sourceRef AS variable_sourceRef,
  f.id AS formula_id,
  f.nodeId AS formula_nodeId,
  f.name AS formula_name,
  CASE 
    WHEN f.nodeId IS NOT NULL THEN '✅ CAPACITÉ EXISTE'
    ELSE '❌ CAPACITÉ MANQUANTE'
  END AS status
FROM "TreeBranchLeafNodeVariable" v
LEFT JOIN "TreeBranchLeafNodeFormula" f ON f.nodeId = v.nodeId
WHERE v.exposedKey LIKE '%-1'
  AND v.sourceRef LIKE 'node-formula:%'
ORDER BY v.exposedKey;

-- SECTION 6: RÉSUMÉ - Combien de variables ont leur capacité linkée correctement
-- ─────────────────────────────────────────────────────────────────────────
SELECT 
  'FORMULES' AS type,
  COUNT(*) AS total_variables,
  COUNT(f.id) AS capacites_trouvees,
  COUNT(*) - COUNT(f.id) AS capacites_manquantes
FROM "TreeBranchLeafNodeVariable" v
LEFT JOIN "TreeBranchLeafNodeFormula" f ON f.nodeId = v.nodeId
WHERE v.sourceRef LIKE 'node-formula:%'

UNION ALL

SELECT 
  'CONDITIONS' AS type,
  COUNT(*) AS total_variables,
  COUNT(c.id) AS capacites_trouvees,
  COUNT(*) - COUNT(c.id) AS capacites_manquantes
FROM "TreeBranchLeafNodeVariable" v
LEFT JOIN "TreeBranchLeafNodeCondition" c ON c.nodeId = v.nodeId
WHERE v.sourceRef LIKE 'node-condition:%'

UNION ALL

SELECT 
  'TABLES' AS type,
  COUNT(*) AS total_variables,
  COUNT(t.id) AS capacites_trouvees,
  COUNT(*) - COUNT(t.id) AS capacites_manquantes
FROM "TreeBranchLeafNodeVariable" v
LEFT JOIN "TreeBranchLeafNodeTable" t ON t.nodeId = v.nodeId
WHERE v.sourceRef LIKE 'node-table:%';
