#!/bin/bash
# 🔍 Script de vérification des erreurs TBL en production
# Usage: ./scripts/check-tbl-errors.sh [minutes]

MINUTES=${1:-5}

echo "======================================"
echo "🔍 ERREURS TBL DES $MINUTES DERNIÈRES MINUTES"
echo "======================================"
echo ""

# Calculer le timestamp
SINCE=$(date -u -d "$MINUTES minutes ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-${MINUTES}M +%Y-%m-%dT%H:%M:%SZ)

echo "📅 Depuis: $SINCE"
echo ""

echo "📋 1. Erreurs 500 (Internal Server Error)"
echo "------------------------------------------"
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=crm-api AND (textPayload:\"500\" OR textPayload:\"Error\" OR textPayload:\"error\") AND timestamp>=\"$SINCE\"" \
  --project=thiernew \
  --limit=20 \
  --format="table(timestamp,textPayload)" 2>&1 | head -40

echo ""
echo "📋 2. Erreurs Prisma/Database"
echo "-----------------------------"
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=crm-api AND (textPayload:\"Prisma\" OR textPayload:\"database\" OR textPayload:\"PrismaClient\") AND timestamp>=\"$SINCE\"" \
  --project=thiernew \
  --limit=10 \
  --format="table(timestamp,textPayload)" 2>&1 | head -30

echo ""
echo "📋 3. Erreurs TBL/TreeBranchLeaf"
echo "--------------------------------"
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=crm-api AND (textPayload:\"TBL\" OR textPayload:\"treebranchleaf\" OR textPayload:\"TreeBranch\") AND timestamp>=\"$SINCE\"" \
  --project=thiernew \
  --limit=10 \
  --format="table(timestamp,textPayload)" 2>&1 | head -30

echo ""
echo "📋 4. Requêtes TBL (toutes)"
echo "---------------------------"
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=crm-api AND httpRequest.requestUrl:\"/tbl\" AND timestamp>=\"$SINCE\"" \
  --project=thiernew \
  --limit=10 \
  --format="table(timestamp,httpRequest.status,httpRequest.requestUrl)" 2>&1 | head -20

echo ""
echo "======================================"
echo "🏁 VÉRIFICATION TERMINÉE"
echo "======================================"
