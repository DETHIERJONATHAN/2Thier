#!/bin/bash
set -e

# Cloud Run doit définir le PORT, sinon utiliser 8080
export PORT=${PORT:-8080}
echo "📍 Using PORT=$PORT"

echo "🔄 Running Prisma migrations..."
PORT=$PORT node node_modules/.bin/prisma migrate deploy --skip-generate 2>&1 || echo "⚠️  Migrations failed, continuing anyway..."

echo "🚀 Starting server on port $PORT..."
# Utilisation de exec pour que Node.js devienne le processus principal (PID 1)
exec node dist-server/api-server-clean.cjs
