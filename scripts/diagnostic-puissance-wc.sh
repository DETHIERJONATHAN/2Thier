#!/bin/bash

# Script de diagnostic pour Puissance WC-1/-2/-3
# Vérifie l'existence des SelectConfig et TreeBranchLeafNodeTable suffixés

echo "🔍 DIAGNOSTIC PUISSANCE WC COPIES"
echo "=================================="
echo ""

# Variables
BASE_NODE_ID="67da41c4-821b-4506-a9e6-3d8454fc9387"
CALC_NODE_ID="c8139b2c-b0a8-44e7-8448-137fd2fb8e23"
DB_CONN="postgresql://postgres@127.0.0.1:5432/2thier"

echo "📋 Base NodeID (Panneau): $BASE_NODE_ID"
echo "📋 Calc NodeID (Puissance WC): $CALC_NODE_ID"
echo ""

# 1. Vérifier l'existence des TreeBranchLeafNode suffixés
echo "1️⃣ Vérification des TreeBranchLeafNode (Panneau copies)"
echo "-----------------------------------------------------"
psql "$DB_CONN" -c "
SELECT id, label, \"fieldType\", \"sourceFieldId\"
FROM \"TreeBranchLeafNode\"
WHERE id LIKE '${BASE_NODE_ID}%'
ORDER BY id;
" 2>&1 | head -20

echo ""
echo "1️⃣-bis Vérification des TreeBranchLeafNode (Puissance WC copies)"
echo "----------------------------------------------------------------"
psql "$DB_CONN" -c "
SELECT id, label, \"fieldType\", \"sourceFieldId\"
FROM \"TreeBranchLeafNode\"
WHERE id LIKE '${CALC_NODE_ID}%'
ORDER BY id;
" 2>&1 | head -20

echo ""

# 2. Vérifier l'existence des SelectConfig suffixés
echo "2️⃣ Vérification des TreeBranchLeafSelectConfig (Panneau)"
echo "--------------------------------------------------------"
psql "$DB_CONN" -c "
SELECT \"nodeId\", \"tableReference\", \"displayColumn\", \"keyColumn\", \"valueColumn\"
FROM \"TreeBranchLeafSelectConfig\"
WHERE \"nodeId\" LIKE '${BASE_NODE_ID}%'
ORDER BY \"nodeId\";
" 2>&1 | head -20

echo ""

# 3. Vérifier l'existence des TreeBranchLeafNodeTable suffixés
echo "3️⃣ Vérification des TreeBranchLeafNodeTable (tableReference suffixées)"
echo "----------------------------------------------------------------------"
psql "$DB_CONN" -c "
SELECT t.id, t.\"nodeId\", t.name, t.type,
       ARRAY_LENGTH(t.columns::text[], 1) as col_count,
       ARRAY_LENGTH(t.rows::text[], 1) as row_count
FROM \"TreeBranchLeafNodeTable\" t
WHERE t.id LIKE 'f91ed60b-f0d2-4242-8b70-a73b79ccd93a%'
ORDER BY t.id;
" 2>&1 | head -20

echo ""

# 4. Vérifier les formulas des Puissance WC copies
echo "4️⃣ Vérification des TreeBranchLeafFormula (Puissance WC)"
echo "--------------------------------------------------------"
psql "$DB_CONN" -c "
SELECT \"nodeId\", LEFT(formula, 100) as formula_preview
FROM \"TreeBranchLeafFormula\"
WHERE \"nodeId\" LIKE '${CALC_NODE_ID}%'
ORDER BY \"nodeId\";
" 2>&1 | head -20

echo ""

# 5. Test de cohérence: les SelectConfig pointent-ils vers des tables existantes?
echo "5️⃣ Test de cohérence SelectConfig → TreeBranchLeafNodeTable"
echo "-----------------------------------------------------------"
psql "$DB_CONN" -c "
SELECT 
  sc.\"nodeId\" as select_node,
  sc.\"tableReference\",
  CASE 
    WHEN t.id IS NOT NULL THEN '✅ TABLE EXISTS'
    ELSE '❌ TABLE MISSING'
  END as status
FROM \"TreeBranchLeafSelectConfig\" sc
LEFT JOIN \"TreeBranchLeafNodeTable\" t ON sc.\"tableReference\" = t.id
WHERE sc.\"nodeId\" LIKE '${BASE_NODE_ID}%'
ORDER BY sc.\"nodeId\";
" 2>&1 | head -20

echo ""
echo "✅ Diagnostic terminé"
echo ""
echo "📊 Résumé attendu:"
echo "  - Panneau: 4 lignes (base + -1 + -2 + -3)"
echo "  - SelectConfig: 4 lignes avec tableReference suffixées"
echo "  - TreeBranchLeafNodeTable: 4 tables suffixées"
echo "  - Puissance WC: 4 lignes avec formules"
echo "  - Cohérence: toutes les SelectConfig doivent pointer vers des tables existantes"
