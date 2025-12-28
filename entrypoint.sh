#!/bin/bash
# 🚀 ENTRYPOINT OPTIMISÉ CLOUD RUN
# Le serveur DOIT démarrer rapidement pour passer les health checks

set -e

# Cloud Run injecte le PORT, sinon utiliser 8080
export PORT=${PORT:-8080}
echo "📍 [STARTUP] Using PORT=$PORT"
echo "📍 [STARTUP] NODE_ENV=$NODE_ENV"

# 🎯 ÉTAPE 1: Démarrer le serveur IMMÉDIATEMENT
# Cloud Run attend que le conteneur écoute sur le port
# Les migrations seront exécutées en arrière-plan après le démarrage

# Vérifier que le fichier serveur existe
if [ ! -f "dist-server/api-server-clean.cjs" ]; then
  echo "❌ [ERROR] dist-server/api-server-clean.cjs not found!"
  echo "📂 [DEBUG] Contents of dist-server/:"
  ls -la dist-server/ 2>/dev/null || echo "Directory not found"
  exit 1
fi

# 🔄 Migrations Prisma en arrière-plan (non-bloquant)
# Cela permet au serveur de démarrer immédiatement
(
  sleep 5  # Attendre que le serveur soit prêt
  echo "🔄 [BACKGROUND] Running Prisma migrations..."
  timeout 60s node node_modules/.bin/prisma migrate deploy --skip-generate 2>&1 || echo "⚠️  [BACKGROUND] Migrations failed or timed out"
  echo "✅ [BACKGROUND] Migration check complete"
) &

echo "🚀 [STARTUP] Starting Node.js server..."
echo "📍 [STARTUP] Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Utilisation de exec pour que Node.js devienne le processus principal (PID 1)
# Cela permet à Cloud Run de gérer correctement les signaux (SIGTERM)
exec node dist-server/api-server-clean.cjs
