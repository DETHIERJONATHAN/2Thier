#!/bin/bash
# =============================================================================
# SCRIPT DE DIAGNOSTIC FRONTEND - CRM 2Thier
# =============================================================================
# Ce script teste le bon fonctionnement du frontend Vite et détecte les erreurs.

set -e

echo "🔍 DIAGNOSTIC FRONTEND - CRM 2Thier"
echo "===================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
BACKEND_URL="${BACKEND_URL:-http://localhost:4000}"
CODESPACES_URL="${CODESPACES_NAME:+https://${CODESPACES_NAME}-5173.app.github.dev}"

echo "📋 Configuration détectée:"
echo "   Frontend: $FRONTEND_URL"
echo "   Backend: $BACKEND_URL"
if [ -n "$CODESPACES_URL" ]; then
    echo "   Codespaces: $CODESPACES_URL"
fi
echo ""

# Test 1: Vérifier si Vite est en cours d'exécution
echo "1️⃣  Test: Processus Vite..."
if pgrep -f "vite" > /dev/null; then
    echo -e "   ${GREEN}✅ Vite est en cours d'exécution${NC}"
else
    echo -e "   ${RED}❌ Vite n'est PAS en cours d'exécution${NC}"
    echo "   💡 Lancez: npm run dev"
    exit 1
fi

# Test 2: Vérifier si le port 5173 répond
echo ""
echo "2️⃣  Test: Port 5173 (Frontend)..."
if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200"; then
    echo -e "   ${GREEN}✅ Frontend accessible sur $FRONTEND_URL${NC}"
else
    echo -e "   ${RED}❌ Frontend NON accessible sur $FRONTEND_URL${NC}"
fi

# Test 3: Vérifier si le port 4000 répond (Backend)
echo ""
echo "3️⃣  Test: Port 4000 (Backend API)..."
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/api/health" 2>/dev/null || echo "FAILED")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo -e "   ${GREEN}✅ Backend API accessible${NC}"
else
    echo -e "   ${RED}❌ Backend API NON accessible${NC}"
    echo "   Réponse: $HEALTH_RESPONSE"
fi

# Test 4: Vérifier les fichiers critiques
echo ""
echo "4️⃣  Test: Fichiers critiques..."
CRITICAL_FILES=(
    "src/main.tsx"
    "src/App.tsx"
    "src/AppLayout.tsx"
    "src/auth/AuthProvider.tsx"
    "src/auth/useAuth.ts"
    "src/components/Connexion.tsx"
    "index.html"
    "vite.config.ts"
)

MISSING_FILES=0
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "/workspaces/2Thier/$file" ]; then
        echo -e "   ${GREEN}✅ $file${NC}"
    else
        echo -e "   ${RED}❌ MANQUANT: $file${NC}"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

if [ $MISSING_FILES -gt 0 ]; then
    echo -e "   ${RED}⚠️  $MISSING_FILES fichier(s) manquant(s)!${NC}"
fi

# Test 5: Vérifier les imports lazy dans AppLayout
echo ""
echo "5️⃣  Test: Imports lazy dans AppLayout..."
LAZY_ERRORS=0
while IFS= read -r line; do
    # Extraire le chemin d'import
    import_path=$(echo "$line" | sed -E "s/.*import\('\.\/([^']+)'\).*/\1/")
    if [ -n "$import_path" ] && [ "$import_path" != "$line" ]; then
        # Construire le chemin complet
        full_path="/workspaces/2Thier/src/$import_path"
        
        # Vérifier si le fichier existe (avec ou sans extension)
        if [ -f "$full_path" ] || [ -f "${full_path}.tsx" ] || [ -f "${full_path}.ts" ] || [ -f "${full_path}/index.tsx" ] || [ -f "${full_path}/index.ts" ]; then
            : # Fichier existe, tout va bien
        else
            echo -e "   ${RED}❌ Import manquant: $import_path${NC}"
            LAZY_ERRORS=$((LAZY_ERRORS + 1))
        fi
    fi
done < <(grep "lazy(() => import(" /workspaces/2Thier/src/AppLayout.tsx 2>/dev/null || true)

if [ $LAZY_ERRORS -eq 0 ]; then
    echo -e "   ${GREEN}✅ Tous les imports lazy sont valides${NC}"
else
    echo -e "   ${RED}⚠️  $LAZY_ERRORS import(s) lazy problématique(s)!${NC}"
fi

# Test 6: Vérifier la syntaxe TypeScript
echo ""
echo "6️⃣  Test: Syntaxe TypeScript (fichiers critiques)..."
if command -v npx &> /dev/null; then
    TSC_OUTPUT=$(npx tsc --noEmit --skipLibCheck 2>&1 | head -20 || true)
    if [ -z "$TSC_OUTPUT" ]; then
        echo -e "   ${GREEN}✅ Pas d'erreurs TypeScript majeures${NC}"
    else
        TSC_ERRORS=$(echo "$TSC_OUTPUT" | grep -c "error TS" || true)
        if [ "$TSC_ERRORS" -gt 0 ]; then
            echo -e "   ${YELLOW}⚠️  $TSC_ERRORS erreur(s) TypeScript détectée(s)${NC}"
            echo "$TSC_OUTPUT" | head -10
        else
            echo -e "   ${GREEN}✅ Compilation TypeScript OK${NC}"
        fi
    fi
else
    echo -e "   ${YELLOW}⚠️  npx non disponible, test ignoré${NC}"
fi

# Test 7: Tester le chargement des modules via curl
echo ""
echo "7️⃣  Test: Chargement des modules Vite..."
MODULES_TO_TEST=(
    "/src/main.tsx"
    "/src/App.tsx"
    "/src/AppLayout.tsx"
    "/src/auth/AuthProvider.tsx"
    "/src/components/Connexion.tsx"
)

MODULE_ERRORS=0
for module in "${MODULES_TO_TEST[@]}"; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL$module" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "   ${GREEN}✅ $module (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "   ${RED}❌ $module (HTTP $HTTP_CODE)${NC}"
        MODULE_ERRORS=$((MODULE_ERRORS + 1))
    fi
done

if [ $MODULE_ERRORS -gt 0 ]; then
    echo -e "   ${RED}⚠️  $MODULE_ERRORS module(s) non accessible(s)!${NC}"
fi

# Test 8: Vérifier le contenu de index.html
echo ""
echo "8️⃣  Test: Structure index.html..."
INDEX_HTML="/workspaces/2Thier/index.html"
if [ -f "$INDEX_HTML" ]; then
    if grep -q 'id="root"' "$INDEX_HTML"; then
        echo -e "   ${GREEN}✅ div#root présent${NC}"
    else
        echo -e "   ${RED}❌ div#root MANQUANT${NC}"
    fi
    
    if grep -q 'src/main.tsx' "$INDEX_HTML"; then
        echo -e "   ${GREEN}✅ Import main.tsx présent${NC}"
    else
        echo -e "   ${RED}❌ Import main.tsx MANQUANT${NC}"
    fi
else
    echo -e "   ${RED}❌ index.html non trouvé!${NC}"
fi

# Test 9: Tester la page /connexion
echo ""
echo "9️⃣  Test: Page /connexion..."
CONNEXION_RESPONSE=$(curl -s "$FRONTEND_URL/connexion" 2>/dev/null | head -c 500)
if echo "$CONNEXION_RESPONSE" | grep -q "root"; then
    echo -e "   ${GREEN}✅ Page /connexion renvoie du HTML${NC}"
else
    echo -e "   ${RED}❌ Page /connexion problématique${NC}"
fi

# Test 10: Vérifier les erreurs dans les logs Vite (si disponibles)
echo ""
echo "🔟 Test: Recherche d'erreurs récentes..."
if [ -f "/workspaces/2Thier/vite.log" ]; then
    VITE_ERRORS=$(grep -i "error" /workspaces/2Thier/vite.log | tail -5)
    if [ -n "$VITE_ERRORS" ]; then
        echo -e "   ${YELLOW}⚠️  Erreurs trouvées dans vite.log:${NC}"
        echo "$VITE_ERRORS"
    else
        echo -e "   ${GREEN}✅ Pas d'erreurs dans vite.log${NC}"
    fi
else
    echo -e "   ${YELLOW}ℹ️  Pas de fichier vite.log${NC}"
fi

# Résumé
echo ""
echo "===================================="
echo "📊 RÉSUMÉ DU DIAGNOSTIC"
echo "===================================="
TOTAL_ERRORS=$((MISSING_FILES + LAZY_ERRORS + MODULE_ERRORS))
if [ $TOTAL_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les tests sont passés!${NC}"
    echo ""
    echo "Si la page est toujours blanche:"
    echo "1. Ouvrez la console du navigateur (F12)"
    echo "2. Vérifiez l'onglet 'Console' pour les erreurs JavaScript"
    echo "3. Vérifiez l'onglet 'Network' pour les requêtes échouées"
else
    echo -e "${RED}❌ $TOTAL_ERRORS problème(s) détecté(s)${NC}"
    echo ""
    echo "Actions recommandées:"
    echo "1. Corrigez les fichiers manquants"
    echo "2. Relancez: bash scripts/start-local.sh"
fi

echo ""
echo "🔗 URLs de test:"
echo "   Local: http://localhost:5173/connexion"
if [ -n "$CODESPACES_URL" ]; then
    echo "   Codespaces: $CODESPACES_URL/connexion"
fi
