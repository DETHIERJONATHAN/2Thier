#!/bin/sh
# Script pour ajouter les colonnes manquantes sur Cloud SQL
set -e

echo "🔧 Connexion à la base de données Cloud SQL..."

# Variables d'environnement (déjà configurées dans Cloud Run)
# PGHOST=/cloudsql/thiernew:europe-west1:crm-db
# PGDATABASE=2thier
# PGUSER=postgres
# PGPASSWORD=(depuis secret)

echo "📋 Ajout des colonnes text_helpTooltip*..."

psql << 'EOF'
-- Ajouter les colonnes manquantes
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN IF NOT EXISTS "text_helpTooltipType" TEXT DEFAULT 'none';

ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN IF NOT EXISTS "text_helpTooltipText" TEXT;

ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN IF NOT EXISTS "text_helpTooltipImage" TEXT;

-- Vérification
SELECT 'Colonnes ajoutées:' as status;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'TreeBranchLeafNode'
AND column_name LIKE 'text_help%'
ORDER BY column_name;
EOF

echo "✅ Colonnes ajoutées avec succès!"
