#!/bin/bash
set -e

echo "🔄 Running Prisma migrations..."
npx prisma migrate deploy --skip-generate

echo "🚀 Starting server..."
NODE_ENV=production node dist-server/api-server-clean.cjs
