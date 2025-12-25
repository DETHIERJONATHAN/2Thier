#!/bin/bash
# 🧪 Script de test TBL en local avec authentification
# Usage: ./scripts/test-tbl-local.sh

set -e

BASE_URL="http://localhost:4000"
EMAIL="jonathan.dethier@2thier.be"
PASSWORD="Jlsl2022@"

echo "======================================"
echo "🏠 TEST TBL LOCAL AVEC AUTHENTIFICATION"
echo "======================================"
echo ""

# 1. Login pour obtenir un token
echo "🔐 1. Authentification..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>/dev/null)

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Échec de l'authentification"
  echo "   Réponse: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Authentifié avec succès"
echo ""

# 2. Test des routes TBL
echo "🌳 2. Test des routes TBL..."
echo ""

test_auth_route() {
  local method=$1
  local endpoint=$2
  local data=$3
  
  echo -n "📌 $method $endpoint → "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -o /tmp/response.json -w "%{http_code}" "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" 2>/dev/null)
  else
    response=$(curl -s -o /tmp/response.json -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" 2>/dev/null)
  fi
  
  BODY=$(cat /tmp/response.json 2>/dev/null | head -c 300)
  
  if [ "$response" = "200" ]; then
    echo "✅ $response"
  elif [ "$response" = "500" ]; then
    echo "❌ $response ERREUR SERVEUR"
    echo "   📋 $BODY"
  else
    echo "⚠️ $response"
    echo "   📋 $BODY"
  fi
}

echo "📋 Routes Trees"
test_auth_route "GET" "/api/treebranchleaf/trees"

echo ""
echo "📋 Routes TBL Submissions"
test_auth_route "GET" "/api/tbl/submissions"

echo ""
echo "📋 Routes Capabilities"
# Récupérer un tree ID d'abord
TREE_ID=$(curl -s "$BASE_URL/api/treebranchleaf/trees" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$TREE_ID" ]; then
  echo "   📌 Tree ID trouvé: $TREE_ID"
  test_auth_route "GET" "/api/treebranchleaf/trees/$TREE_ID/nodes"
  test_auth_route "GET" "/api/tbl-capabilities/$TREE_ID"
else
  echo "   ⚠️ Aucun tree trouvé"
fi

echo ""
echo "======================================"
echo "🏁 TESTS LOCAUX TERMINÉS"
echo "======================================"
