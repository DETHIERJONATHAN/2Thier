-- Vérifier si les Variables existent pour Puissance WC et Puissance WC-1

SELECT 
  'VARIABLE' AS type,
  v.id, 
  v.nodeId, 
  v.sourceRef,
  v.sourceType,
  n.label AS node_label,
  n.hasFormula,
  n.fieldType
FROM "TreeBranchLeafNodeVariable" v
JOIN "TreeBranchLeafNode" n ON n.id = v.nodeId
WHERE v.nodeId IN (
  'c8139b2c-b0a8-44e7-8448-137fd2fb8e23',
  'c8139b2c-b0a8-44e7-8448-137fd2fb8e23-1'
)

UNION ALL

SELECT 
  'FORMULA' AS type,
  f.id,
  f.nodeId,
  NULL AS sourceRef,
  NULL AS sourceType,
  n.label AS node_label,
  n.hasFormula,
  n.fieldType
FROM "TreeBranchLeafNodeFormula" f
JOIN "TreeBranchLeafNode" n ON n.id = f.nodeId
WHERE f.nodeId IN (
  'c8139b2c-b0a8-44e7-8448-137fd2fb8e23',
  'c8139b2c-b0a8-44e7-8448-137fd2fb8e23-1'
)

ORDER BY type, nodeId;
