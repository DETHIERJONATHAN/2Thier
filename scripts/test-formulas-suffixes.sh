#!/bin/bash
# Test des formules et valeurs calculées pour les suffixes

echo "🧪 TEST FORMULAS & CALCULATED VALUES - SUFFIXES"
echo "==============================================="
echo ""

# NodeIDs
BASE_PUISSANCE="c8139b2c-b0a8-44e7-8448-137fd2fb8e23"
BASE_PANNEAU="67da41c4-821b-4506-a9e6-3d8454fc9387"

echo "📋 Base NodeID (Puissance WC): $BASE_PUISSANCE"
echo "📋 Base NodeID (Panneau): $BASE_PANNEAU"
echo ""

# 1. Vérifier les formules dans TreeBranchLeafNodeFormula
echo "1️⃣ Vérification des FORMULAS dans TreeBranchLeafNodeFormula"
echo "-----------------------------------------------------------"
psql -h localhost -U postgres -d 2thier << EOF
SELECT 
  id,
  "nodeId",
  name,
  tokens::text,
  "isDefault"
FROM "TreeBranchLeafNodeFormula"
WHERE "nodeId" LIKE '$BASE_PUISSANCE%'
ORDER BY "nodeId";
EOF

echo ""
echo "2️⃣ Vérification des nodes (label, fieldType)"
echo "---------------------------------------------"
psql -h localhost -U postgres -d 2thier << EOF
SELECT 
  id,
  label,
  "fieldType"
FROM "TreeBranchLeafNode"
WHERE id LIKE '$BASE_PUISSANCE%'
ORDER BY id;
EOF

echo ""
echo "3️⃣ Dernière submission avec ces champs"
echo "---------------------------------------"
psql -h localhost -U postgres -d 2thier << EOF
SELECT DISTINCT s.id, s."createdAt", s."treeId"
FROM "TreeBranchLeafSubmission" s
INNER JOIN "TreeBranchLeafSubmissionData" sd ON sd."submissionId" = s.id
WHERE sd."nodeId" LIKE '$BASE_PUISSANCE%'
   OR sd."nodeId" LIKE '$BASE_PANNEAU%'
ORDER BY s."createdAt" DESC
LIMIT 1;
EOF

echo ""
echo "4️⃣ Valeurs Puissance WC dans SubmissionData (dernière submission)"
echo "-------------------------------------------------------------------"
psql -h localhost -U postgres -d 2thier << EOF
WITH latest_sub AS (
  SELECT DISTINCT s.id
  FROM "TreeBranchLeafSubmission" s
  INNER JOIN "TreeBranchLeafSubmissionData" sd ON sd."submissionId" = s.id
  WHERE sd."nodeId" LIKE '$BASE_PUISSANCE%'
  ORDER BY s."createdAt" DESC
  LIMIT 1
)
SELECT 
  sd."nodeId",
  sd.value,
  sd."operationSource",
  sd."operationResult"::text
FROM "TreeBranchLeafSubmissionData" sd
WHERE sd."submissionId" = (SELECT id FROM latest_sub)
  AND sd."nodeId" LIKE '$BASE_PUISSANCE%'
ORDER BY sd."nodeId";
EOF

echo ""
echo "5️⃣ Valeurs Panneau dans SubmissionData (source du calcul)"
echo "----------------------------------------------------------"
psql -h localhost -U postgres -d 2thier << EOF
WITH latest_sub AS (
  SELECT DISTINCT s.id
  FROM "TreeBranchLeafSubmission" s
  INNER JOIN "TreeBranchLeafSubmissionData" sd ON sd."submissionId" = s.id
  WHERE sd."nodeId" LIKE '$BASE_PUISSANCE%'
  ORDER BY s."createdAt" DESC
  LIMIT 1
)
SELECT 
  sd."nodeId",
  sd.value,
  sd."operationSource"
FROM "TreeBranchLeafSubmissionData" sd
WHERE sd."submissionId" = (SELECT id FROM latest_sub)
  AND sd."nodeId" LIKE '$BASE_PANNEAU%'
ORDER BY sd."nodeId";
EOF

echo ""
echo "5️⃣ Recherche de l'endpoint backend qui calcule les formules"
echo "------------------------------------------------------------"
echo "Recherche dans le code backend..."
grep -r "formula" /workspaces/2Thier/src/components/TreeBranchLeaf/treebranchleaf-new/api/ \
  --include="*.ts" \
  -A 3 -B 3 \
  | head -50

echo ""
echo "✅ Tests terminés"
echo ""
echo "📊 Ce qu'on cherche:"
echo "  - Les champs suffixés ont-ils une propriété 'formula' copiée?"
echo "  - Les valeurs calculées sont-elles présentes dans formData pour les suffixes?"
echo "  - Quel endpoint backend est responsable du calcul des formules?"
