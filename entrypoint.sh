#!/bin/bash
set -e

# Cloud Run doit définir le PORT, sinon utiliser 8080
export PORT=${PORT:-8080}

echo "🔄 Running Prisma migrations..."
node node_modules/.bin/prisma migrate deploy --skip-generate 2>&1 || echo "⚠️  Migrations failed, continuing anyway..."

echo "🚀 Starting server on port $PORT..."
NODE_ENV=production node dist-server/api-server-clean.cjs
