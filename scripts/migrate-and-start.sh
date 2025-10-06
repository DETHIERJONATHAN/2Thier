#!/bin/sh
# Script de démarrage production : Migration Prisma + Serveur API

set -e  # Arrêter si une commande échoue

echo "🔄 Démarrage du processus de migration..."

# 1. Afficher la version de Node et les variables d'environnement (sans secrets)
echo "📦 Node version: $(node --version)"
echo "🔧 NODE_ENV: $NODE_ENV"
echo "🗄️ Database: $PGDATABASE"
echo "📍 Host: $PGHOST"

# 2. Exécuter les migrations Prisma
echo "🚀 Exécution des migrations Prisma..."
npx prisma migrate deploy

# 3. Vérifier que la migration a réussi
if [ $? -eq 0 ]; then
  echo "✅ Migrations Prisma appliquées avec succès"
else
  echo "❌ Échec des migrations Prisma"
  exit 1
fi

# 4. Générer le client Prisma (par sécurité)
echo "🔨 Génération du client Prisma..."
npx prisma generate

# 5. Démarrer le serveur API
echo "🌐 Démarrage du serveur API..."
exec tsx ./src/api-server-clean.ts
