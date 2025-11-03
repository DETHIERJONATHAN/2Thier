-- Vérifier les capacités manquantes après copie

-- 1. Variables copiées (avec -1) qui pointent vers des formules
SELECT 
  'FORMULE MANQUANTE' as type,
  tbl.id as variable_id,
  tbl.label as variable_label,
  tbl.sourceRef,
  REPLACE(REPLACE(tbl.sourceRef, 'node-formula:', ''), '@table.', '') as capacity_id_referenced
FROM "TreeBranchLeaf" tbl
WHERE tbl.id LIKE '%-1'
  AND tbl.type = 'leaf'
  AND tbl.sourceRef LIKE 'node-formula:%'
  AND NOT EXISTS (
    SELECT 1 FROM "NodeFormula" nf 
    WHERE nf.id = REPLACE(tbl.sourceRef, 'node-formula:', '')
  );

-- 2. Variables copiées qui pointent vers des tables
SELECT 
  'TABLE MANQUANTE' as type,
  tbl.id as variable_id,
  tbl.label as variable_label,
  tbl.sourceRef,
  REPLACE(REPLACE(tbl.sourceRef, 'node-formula:', ''), '@table.', '') as capacity_id_referenced
FROM "TreeBranchLeaf" tbl
WHERE tbl.id LIKE '%-1'
  AND tbl.type = 'leaf'
  AND tbl.sourceRef LIKE '@table.%'
  AND NOT EXISTS (
    SELECT 1 FROM "TableDedicatedStorage" tds 
    WHERE tds.id = REPLACE(tbl.sourceRef, '@table.', '')
  );

-- 3. Variables copiées qui pointent vers des conditions
SELECT 
  'CONDITION MANQUANTE' as type,
  tbl.id as variable_id,
  tbl.label as variable_label,
  tbl.sourceRef,
  REPLACE(tbl.sourceRef, 'condition:', '') as capacity_id_referenced
FROM "TreeBranchLeaf" tbl
WHERE tbl.id LIKE '%-1'
  AND tbl.type = 'leaf'
  AND tbl.sourceRef LIKE 'condition:%'
  AND NOT EXISTS (
    SELECT 1 FROM "NodeCondition" nc 
    WHERE nc.id = REPLACE(tbl.sourceRef, 'condition:', '')
  );

-- 4. Résumé : compter les variables copiées vs capacités manquantes
SELECT 
  COUNT(*) as total_variables_copiees,
  SUM(CASE WHEN tbl.sourceRef LIKE 'node-formula:%' THEN 1 ELSE 0 END) as avec_formule,
  SUM(CASE WHEN tbl.sourceRef LIKE '@table.%' THEN 1 ELSE 0 END) as avec_table,
  SUM(CASE WHEN tbl.sourceRef LIKE 'condition:%' THEN 1 ELSE 0 END) as avec_condition
FROM "TreeBranchLeaf" tbl
WHERE tbl.id LIKE '%-1'
  AND tbl.type = 'leaf';
