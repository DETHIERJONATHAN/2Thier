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

# 1. Arrêt du proxy existant s'il tourne
if pgrep -f "cloud-sql-proxy" > /dev/null; then
    echo "🛑 Arrêt du proxy Cloud SQL existant..."
    pkill -f "cloud-sql-proxy"
    sleep 2
fi

# 2. Vérification de l'authentification gcloud
echo "🔑 Vérification du token Google Cloud..."
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
# Note: On utilise le binaire à la racine. Assurez-vous qu'il est exécutable (chmod +x cloud-sql-proxy)
./cloud-sql-proxy thiernew:europe-west1:crm-postgres-prod --port 5432 --token "$TOKEN" > /dev/null 2>&1 &
PROXY_PID=$!

echo "⏳ Attente du démarrage du proxy (5s)..."
sleep 5

# Vérifier si le proxy est toujours en vie
if ! ps -p $PROXY_PID > /dev/null; then
    echo "❌ Le proxy a échoué au démarrage. Vérifiez les logs."
    exit 1
fi

echo "✅ Proxy connecté à thiernew:europe-west1:crm-postgres-prod sur le port 5432"

# 4. Lancement de l'application
echo "💻 Lancement de 'npm run dev'..."
npm run dev

# Nettoyage à la sortie (quand on fait Ctrl+C sur npm run dev)
kill $PROXY_PID
