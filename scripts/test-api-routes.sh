#!/bin/bash
# 🧪 Script de test des routes API critiques
# Usage: ./scripts/test-api-routes.sh [local|prod]

set -e

ENV=${1:-local}

if [ "$ENV" = "prod" ]; then
  BASE_URL="https://app.2thier.be"
  echo "🌐 Mode PRODUCTION: $BASE_URL"
else
  BASE_URL="http://localhost:4000"
  echo "🏠 Mode LOCAL: $BASE_URL"
fi

echo ""
echo "======================================"
echo "🔍 TEST DES ROUTES API CRITIQUES"
echo "======================================"
echo ""

# Fonction de test
test_route() {
  local method=$1
  local endpoint=$2
  local expected_status=$3
  local data=$4
  
  echo -n "📌 $method $endpoint → "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint" 2>/dev/null || echo "000")
  else
    response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data" 2>/dev/null || echo "000")
  fi
  
  if [ "$response" = "$expected_status" ]; then
    echo "✅ $response (attendu: $expected_status)"
  elif [ "$response" = "000" ]; then
    echo "❌ CONNEXION REFUSÉE (serveur non accessible)"
  elif [ "$response" = "401" ] && [ "$expected_status" = "401" ]; then
    echo "✅ $response (authentification requise - normal)"
  elif [ "$response" = "401" ]; then
    echo "⚠️ $response (route existe mais nécessite auth)"
  else
    echo "❌ $response (attendu: $expected_status)"
  fi
}

echo "📋 1. Routes de santé"
echo "---------------------"
test_route "GET" "/health" "200"
test_route "GET" "/api/health" "200"

echo ""
echo "📋 2. Routes d'authentification"
echo "--------------------------------"
test_route "GET" "/api/auth/me" "401"
test_route "POST" "/api/auth/login" "400"

echo ""
echo "📋 3. Routes Google Auth (CRITIQUES)"
echo "--------------------------------------"
test_route "GET" "/api/auto-google-auth/status" "401"
test_route "POST" "/api/auto-google-auth/connect" "401"
test_route "GET" "/api/google-auth/connect" "401"
test_route "GET" "/api/google-auth/status" "401"

echo ""
echo "📋 4. Routes TreeBranchLeaf"
echo "----------------------------"
test_route "GET" "/api/treebranchleaf/trees" "401"

echo ""
echo "📋 5. Routes Dashboard"
echo "-----------------------"
test_route "GET" "/api/dashboard/stats" "401"

echo ""
echo "======================================"
echo "🏁 TESTS TERMINÉS"
echo "======================================"
echo ""
echo "Légende:"
echo "  ✅ = Route fonctionne comme attendu"
echo "  ⚠️ = Route existe mais nécessite authentification"
echo "  ❌ = Route introuvable (404) ou erreur"
echo ""
