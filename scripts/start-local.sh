#!/bin/bash

# -----------------------------------------------------------------------------
# SCRIPT DE DÉMARRAGE LOCAL AVEC PROXY CLOUD SQL
# -----------------------------------------------------------------------------
# Ce script automatise :
# 1. L'arrêt des anciennes instances du proxy
# 2. La récupération d'un token d'accès Google valide (pour éviter les erreurs invalid_grant)
# 3. Le démarrage du proxy Cloud SQL avec ce token
# 4. Le lancement du serveur de développement (npm run dev)
# -----------------------------------------------------------------------------

echo "🚀 Initialisation de l'environnement de développement..."

# 1. Arrêt de TOUS les processus existants (proxy, serveur, vite)
echo "🛑 Arrêt des processus existants..."
pkill -f "cloud-sql-proxy" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "tsx" 2>/dev/null
pkill -f "node.*api-server" 2>/dev/null
sleep 2
echo "✅ Processus arrêtés"

# 2. Vérification de l'authentification gcloud
echo "🔑 Vérification du token Google Cloud..."

# Ajouter gcloud au PATH si installé dans /tmp (Codespaces)
if [ -d "/tmp/google-cloud-sdk/bin" ]; then
    export PATH="/tmp/google-cloud-sdk/bin:$PATH"
fi

TOKEN=$(gcloud auth print-access-token 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "⚠️  Pas de token valide trouvé. Tentative de connexion..."
    echo "👉 Veuillez vous authentifier dans la fenêtre qui va s'ouvrir (ou suivez le lien)..."
    gcloud auth login --no-launch-browser
    TOKEN=$(gcloud auth print-access-token)
fi

if [ -z "$TOKEN" ]; then
    echo "❌ Impossible de récupérer un token. Vérifiez votre connexion gcloud."
    exit 1
fi

# 3. Démarrage du proxy
echo "🔌 Démarrage du Cloud SQL Proxy..."
# Utiliser cloud-sql-proxy depuis le PATH (installé via gcloud components ou à la racine)
PROXY_CMD="cloud-sql-proxy"
if [ -f "./cloud-sql-proxy" ]; then
    PROXY_CMD="./cloud-sql-proxy"
fi
$PROXY_CMD thiernew:europe-west1:crm-postgres-prod --port 5432 --token "$TOKEN" > /dev/null 2>&1 &
PROXY_PID=$!

echo "⏳ Attente du démarrage du proxy (5s)..."
sleep 5

# Vérifier si le proxy est toujours en vie
if ! ps -p $PROXY_PID > /dev/null; then
    echo "❌ Le proxy a échoué au démarrage. Vérifiez les logs."
    exit 1
fi

echo "✅ Proxy connecté à thiernew:europe-west1:crm-postgres-prod sur le port 5432"

# 4. Lancement de l'application en MODE PRODUCTION (port 4000 uniquement)
export TELNYX_DEBUG_WEBHOOKS=${TELNYX_DEBUG_WEBHOOKS:-1}
export NODE_ENV=production

echo "🔨 Build du frontend..."
npm run build

echo ""
echo "💻 Lancement du serveur en mode PRODUCTION..."
echo "💡 Le serveur s'exécute en ARRIÈRE-PLAN sur le port 4000."
echo ""
node dist-server/api-server-clean.cjs &

sleep 3
echo ""
echo "✅ Environnement prêt en MODE PRODUCTION!"
echo "   🌐 Application: http://localhost:4000"
echo "   💾 DB: Proxy Cloud SQL sur localhost:5432"

# Si Codespaces, afficher l'URL tunnelisée
if [ -n "$CODESPACES" ] || [ -n "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN" ]; then
    echo ""
    echo "🌐 URL Codespaces:"
    echo "   Application: https://${CODESPACE_NAME}-4000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    echo ""
    echo "⚠️  Rendez le port 4000 PUBLIC dans l'onglet Ports!"
fi
echo ""
echo "📝 Pour modifier le code: éditez puis relancez 'bash scripts/start-local.sh'"
echo "Pour fermer tout: pkill -f 'node.*api-server' && pkill -f 'cloud-sql-proxy'"
