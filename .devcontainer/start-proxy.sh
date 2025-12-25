#!/bin/bash
# Script de démarrage automatique du Cloud SQL Proxy

echo "🔌 Démarrage automatique du Cloud SQL Proxy..."

# Créer la clé si elle n'existe pas (à partir des secrets GitHub Codespaces)
if [ ! -f "/tmp/gcloud-key.json" ]; then
    if [ -n "$GCLOUD_SERVICE_KEY" ]; then
        echo "$GCLOUD_SERVICE_KEY" > /tmp/gcloud-key.json
        echo "✅ Clé créée depuis le secret Codespaces"
    else
        echo "⚠️  Clé Google Cloud manquante!"
        echo "   Crée /tmp/gcloud-key.json avec ta clé de service account"
        echo "   ou configure le secret GCLOUD_SERVICE_KEY dans Codespaces"
        exit 0
    fi
fi

# Télécharger le proxy si nécessaire
if [ ! -f "/workspaces/2Thier/cloud-sql-proxy" ]; then
    echo "📥 Téléchargement du Cloud SQL Proxy..."
    curl -so /workspaces/2Thier/cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.2/cloud-sql-proxy.linux.amd64
    chmod +x /workspaces/2Thier/cloud-sql-proxy
fi

# Arrêter un proxy existant
pkill -f cloud-sql-proxy 2>/dev/null

# Démarrer le proxy en arrière-plan
nohup /workspaces/2Thier/cloud-sql-proxy \
    thiernew:europe-west1:crm-postgres-prod \
    --port=5432 \
    --credentials-file=/tmp/gcloud-key.json \
    > /tmp/cloud-sql-proxy.log 2>&1 &

sleep 2

if pgrep -f cloud-sql-proxy > /dev/null; then
    echo "✅ Cloud SQL Proxy démarré sur localhost:5432"
    echo "📊 Connexion à Google Cloud SQL (PRODUCTION) active!"
    echo ""
    echo "⚠️  ATTENTION: Tu travailles sur les données de PRODUCTION!"
else
    echo "❌ Erreur - voir /tmp/cloud-sql-proxy.log"
fi
