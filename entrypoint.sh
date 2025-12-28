#!/bin/bash
set -e

# Cloud Run doit définir le PORT, sinon utiliser 8080
export PORT=${PORT:-8080}
echo "📍 Using PORT=$PORT"

echo "🔄 Running Prisma migrations (with 30s timeout)..."
timeout 30s node node_modules/.bin/prisma migrate deploy --skip-generate 2>&1 || echo "⚠️  Migrations failed or timed out, continuing anyway..."

echo "🚀 Starting server on port $PORT..."
# Debug: Afficher les variables d'environnement non sensibles
echo "DEBUG: NODE_ENV=$NODE_ENV"
echo "DEBUG: DATABASE_URL is $(if [ -z "$DATABASE_URL" ]; then echo "EMPTY"; else echo "SET"; fi)"

# Utilisation de exec pour que Node.js devienne le processus principal (PID 1)
exec node dist-server/api-server-clean.cjs
