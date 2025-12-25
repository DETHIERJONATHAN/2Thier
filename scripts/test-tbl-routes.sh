#!/bin/bash
# 🧪 Script de test des routes TBL (TreeBranchLeaf)
# Usage: ./scripts/test-tbl-routes.sh [local|prod] [token]

set -e

ENV=${1:-local}
TOKEN=${2:-""}

if [ "$ENV" = "prod" ]; then
  BASE_URL="https://app.2thier.be"
  echo "🌐 Mode PRODUCTION: $BASE_URL"
else
  BASE_URL="http://localhost:4000"
  echo "🏠 Mode LOCAL: $BASE_URL"
fi

echo ""
echo "======================================"
echo "🌳 TEST DES ROUTES TBL (TreeBranchLeaf)"
echo "======================================"
echo ""

# Fonction de test
test_route() {
  local method=$1
  local endpoint=$2
  local expected=$3
  local data=$4
  
  echo -n "📌 $method $endpoint → "
  
  if [ -n "$TOKEN" ]; then
    AUTH_HEADER="-H \"Authorization: Bearer $TOKEN\""
  else
    AUTH_HEADER=""
  fi
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -o /tmp/response.json -w "%{http_code}" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      $AUTH_HEADER 2>/dev/null || echo "000")
  else
    response=$(curl -s -o /tmp/response.json -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      $AUTH_HEADER \
      -d "$data" 2>/dev/null || echo "000")
  fi
  
  # Vérifier le contenu de la réponse
  if [ -f /tmp/response.json ]; then
    BODY=$(cat /tmp/response.json 2>/dev/null | head -c 200)
  else
    BODY=""
  fi
  
  if [ "$response" = "$expected" ]; then
    echo "✅ $response"
  elif [ "$response" = "000" ]; then
    echo "❌ CONNEXION REFUSÉE"
  elif [ "$response" = "401" ]; then
    echo "⚠️ $response (auth requise)"
  elif [ "$response" = "500" ]; then
    echo "❌ $response ERREUR SERVEUR"
    echo "   📋 Réponse: $BODY"
  else
    echo "⚠️ $response (attendu: $expected)"
  fi
}

echo "📋 1. Routes Trees (Arbres)"
echo "----------------------------"
test_route "GET" "/api/treebranchleaf/trees" "401"
test_route "GET" "/api/treebranchleaf/trees/test-id" "401"

echo ""
echo "📋 2. Routes Nodes (Nœuds)"
echo "--------------------------"
test_route "GET" "/api/treebranchleaf/trees/test-id/nodes" "401"
test_route "GET" "/api/treebranchleaf/nodes/test-node-id" "401"

echo ""
echo "📋 3. Routes Submissions (Soumissions)"
echo "--------------------------------------"
test_route "GET" "/api/tbl/submissions" "401"
test_route "GET" "/api/tbl/submissions/test-id" "401"
test_route "POST" "/api/tbl/submissions/preview-evaluate" "401" '{"treeId":"test","formData":{}}'

echo ""
echo "📋 4. Routes Capabilities"
echo "-------------------------"
test_route "GET" "/api/tbl-capabilities/test-tree-id" "401"

echo ""
echo "📋 5. Routes Repeat (Répétition)"
echo "--------------------------------"
test_route "POST" "/api/repeat/duplicate" "401" '{"nodeId":"test"}'
test_route "DELETE" "/api/repeat/remove/test-id" "401"

echo ""
echo "📋 6. Routes Tables Lookup"
echo "--------------------------"
test_route "GET" "/api/treebranchleaf/tables" "401"
test_route "GET" "/api/treebranchleaf/tables/test-id/lookup" "401"

echo ""
echo "📋 7. Routes Formulas"
echo "---------------------"
test_route "GET" "/api/formulas/node/test-id" "401"
test_route "POST" "/api/formulas/evaluate" "401" '{"formula":"1+1","variables":{}}'

echo ""
echo "📋 8. Routes Calculated Values"
echo "------------------------------"
test_route "GET" "/api/tree-nodes/test-id/calculated-value" "401"

echo ""
echo "======================================"
echo "🏁 TESTS TBL TERMINÉS"
echo "======================================"
