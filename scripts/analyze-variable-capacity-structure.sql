-- ANALYSE COMPLÈTE : Structure variable → capacité → field

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1️⃣ VARIABLES ORIGINALES (sans suffix) avec leurs capacités
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  '🔵 ORIGINAL' as status,
  tbl.id as variable_id,
  tbl.label as variable_label,
  tbl.sourceRef,
  tbl.parentId,
  
  -- Identifier le type de capacité
  CASE 
    WHEN tbl.sourceRef LIKE 'node-formula:%' THEN 'FORMULA'
    WHEN tbl.sourceRef LIKE '@table.%' THEN 'TABLE'
    WHEN tbl.sourceRef LIKE 'condition:%' THEN 'CONDITION'
    ELSE 'AUTRE'
  END as capacity_type,
  
  -- Extraire l'ID de capacité
  CASE 
    WHEN tbl.sourceRef LIKE 'node-formula:%' THEN REPLACE(tbl.sourceRef, 'node-formula:', '')
    WHEN tbl.sourceRef LIKE '@table.%' THEN REPLACE(tbl.sourceRef, '@table.', '')
    WHEN tbl.sourceRef LIKE 'condition:%' THEN REPLACE(tbl.sourceRef, 'condition:', '')
  END as capacity_id

FROM "TreeBranchLeaf" tbl
WHERE tbl.type = 'leaf'
  AND tbl.id NOT LIKE '%-1'
  AND tbl.id NOT LIKE '%-2'
  AND tbl.sourceRef IS NOT NULL
  AND tbl.parentId = '10724c29-a717-4650-adf3-0ea6633f64f1' -- Repeater Versant
ORDER BY tbl.label;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2️⃣ VARIABLES COPIÉES (avec -1) et leurs capacités manquantes
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  '🔴 COPIE' as status,
  tbl.id as variable_id,
  tbl.label as variable_label,
  tbl.sourceRef,
  tbl.parentId,
  
  CASE 
    WHEN tbl.sourceRef LIKE 'node-formula:%' THEN 'FORMULA'
    WHEN tbl.sourceRef LIKE '@table.%' THEN 'TABLE'
    WHEN tbl.sourceRef LIKE 'condition:%' THEN 'CONDITION'
    ELSE 'AUTRE'
  END as capacity_type,
  
  CASE 
    WHEN tbl.sourceRef LIKE 'node-formula:%' THEN REPLACE(tbl.sourceRef, 'node-formula:', '')
    WHEN tbl.sourceRef LIKE '@table.%' THEN REPLACE(tbl.sourceRef, '@table.', '')
    WHEN tbl.sourceRef LIKE 'condition:%' THEN REPLACE(tbl.sourceRef, 'condition:', '')
  END as capacity_id_referenced,
  
  -- Vérifier si la capacité existe
  CASE 
    WHEN tbl.sourceRef LIKE 'node-formula:%' THEN 
      CASE WHEN EXISTS (
        SELECT 1 FROM "NodeFormula" nf 
        WHERE nf.id = REPLACE(tbl.sourceRef, 'node-formula:', '')
      ) THEN '✅ EXISTE' ELSE '❌ MANQUANT' END
    WHEN tbl.sourceRef LIKE '@table.%' THEN 
      CASE WHEN EXISTS (
        SELECT 1 FROM "TableDedicatedStorage" tds 
        WHERE tds.id = REPLACE(tbl.sourceRef, '@table.', '')
      ) THEN '✅ EXISTE' ELSE '❌ MANQUANT' END
    WHEN tbl.sourceRef LIKE 'condition:%' THEN 
      CASE WHEN EXISTS (
        SELECT 1 FROM "NodeCondition" nc 
        WHERE nc.id = REPLACE(tbl.sourceRef, 'condition:', '')
      ) THEN '✅ EXISTE' ELSE '❌ MANQUANT' END
  END as capacity_status

FROM "TreeBranchLeaf" tbl
WHERE tbl.type = 'leaf'
  AND tbl.id LIKE '%-1'
  AND tbl.sourceRef IS NOT NULL
ORDER BY tbl.label;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3️⃣ DÉTAILS FORMULES : Structure complète
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  '📐 FORMULE ORIGINALE' as type,
  nf.id as formula_id,
  nf.name as formula_name,
  nf.tokens,
  nf.createdAt,
  
  -- Compter les variables qui utilisent cette formule
  (SELECT COUNT(*) FROM "TreeBranchLeaf" tbl2 
   WHERE tbl2.sourceRef = 'node-formula:' || nf.id) as nb_variables_using_this

FROM "NodeFormula" nf
WHERE EXISTS (
  SELECT 1 FROM "TreeBranchLeaf" tbl
  WHERE tbl.sourceRef = 'node-formula:' || nf.id
    AND tbl.parentId = '10724c29-a717-4650-adf3-0ea6633f64f1'
    AND tbl.id NOT LIKE '%-1'
)
ORDER BY nf.name;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4️⃣ DÉTAILS TABLES : Structure complète
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  '📊 TABLE ORIGINALE' as type,
  tds.id as table_id,
  tds.name as table_name,
  tds.type as table_type,
  tds.createdAt,
  
  -- Compter les variables qui utilisent cette table
  (SELECT COUNT(*) FROM "TreeBranchLeaf" tbl2 
   WHERE tbl2.sourceRef = '@table.' || tds.id) as nb_variables_using_this

FROM "TableDedicatedStorage" tds
WHERE EXISTS (
  SELECT 1 FROM "TreeBranchLeaf" tbl
  WHERE tbl.sourceRef = '@table.' || tds.id
    AND tbl.parentId = '10724c29-a717-4650-adf3-0ea6633f64f1'
    AND tbl.id NOT LIKE '%-1'
)
ORDER BY tds.name;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5️⃣ RÉSUMÉ : Ce qui doit être copié
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  'RÉSUMÉ' as section,
  COUNT(DISTINCT tbl.id) as total_variables_dans_repeater,
  COUNT(DISTINCT CASE WHEN tbl.id NOT LIKE '%-1' THEN tbl.id END) as variables_originales,
  COUNT(DISTINCT CASE WHEN tbl.id LIKE '%-1' THEN tbl.id END) as variables_copiees,
  
  -- Capacités utilisées
  COUNT(DISTINCT CASE 
    WHEN tbl.sourceRef LIKE 'node-formula:%' AND tbl.id NOT LIKE '%-1'
    THEN REPLACE(tbl.sourceRef, 'node-formula:', '') 
  END) as formules_a_copier,
  
  COUNT(DISTINCT CASE 
    WHEN tbl.sourceRef LIKE '@table.%' AND tbl.id NOT LIKE '%-1'
    THEN REPLACE(tbl.sourceRef, '@table.', '') 
  END) as tables_a_copier,
  
  COUNT(DISTINCT CASE 
    WHEN tbl.sourceRef LIKE 'condition:%' AND tbl.id NOT LIKE '%-1'
    THEN REPLACE(tbl.sourceRef, 'condition:', '') 
  END) as conditions_a_copier

FROM "TreeBranchLeaf" tbl
WHERE tbl.type = 'leaf'
  AND tbl.parentId LIKE '10724c29-a717-4650-adf3-0ea6633f64f1%'; -- Versant et ses copies
