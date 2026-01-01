#!/bin/bash

# Script pour corriger le redirectUri en PRODUCTION via Cloud Run job

echo "🚀 Correction du redirectUri en PRODUCTION"
echo "==========================================="
echo ""

# Trouver l'organization ID
echo "📋 Récupération de l'organization ID..."
ORG_ID=$(gcloud sql execute-sql crm-postgres-prod \
  --project=thiernew \
  --instance=thiernew:europe-west1:crm-postgres-prod \
  --database=2thier \
  --sql="SELECT id FROM \"Organization\" LIMIT 1;" \
  --format="value(id)" 2>/dev/null)

if [ -z "$ORG_ID" ]; then
  echo "❌ Impossible de récupérer l'organization ID"
  echo "Essayez manuellement avec:"
  echo "  gcloud sql connect crm-postgres-prod --user=postgres --database=2thier"
  echo "  SELECT id, name FROM \"Organization\";"
  exit 1
fi

echo "✅ Organization ID: $ORG_ID"
echo ""

# Afficher la config actuelle
echo "📋 Configuration actuelle:"
gcloud sql execute-sql crm-postgres-prod \
  --project=thiernew \
  --instance=thiernew:europe-west1:crm-postgres-prod \
  --database=2thier \
  --sql="SELECT \"organizationId\", \"redirectUri\", \"adminEmail\" FROM \"googleWorkspaceConfig\" WHERE \"organizationId\" = '$ORG_ID';"

echo ""
echo "🔧 Application du correctif..."

# Mettre à jour
gcloud sql execute-sql crm-postgres-prod \
  --project=thiernew \
  --instance=thiernew:europe-west1:crm-postgres-prod \
  --database=2thier \
  --sql="UPDATE \"googleWorkspaceConfig\" SET \"redirectUri\" = 'https://app.2thier.be/api/google-auth/callback' WHERE \"organizationId\" = '$ORG_ID';"

echo ""
echo "✅ Correctif appliqué !"
echo ""
echo "📋 Nouvelle configuration:"
gcloud sql execute-sql crm-postgres-prod \
  --project=thiernew \
  --instance=thiernew:europe-west1:crm-postgres-prod \
  --database=2thier \
  --sql="SELECT \"organizationId\", \"redirectUri\", \"adminEmail\" FROM \"googleWorkspaceConfig\" WHERE \"organizationId\" = '$ORG_ID';"

echo ""
echo "🎯 Essaye de te connecter maintenant !"
