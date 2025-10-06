# ========================================
# Script de synchronisation Prod → Local
# ========================================
# 
# Ce script :
# 1. Exporte la BDD Cloud SQL vers un fichier
# 2. Télécharge le fichier
# 3. Importe dans ta BDD locale
#
# ⚠️ ATTENTION : Ça écrase TOUTES tes données locales !
# ========================================

Write-Host "🔄 Synchronisation Prod → Local" -ForegroundColor Cyan
Write-Host ""

# Configuration
$PROJECT_ID = "thiernew"
$INSTANCE_NAME = "crm-db"
$DATABASE_NAME = "2thier"
$BUCKET_NAME = "crm-backups-sync"  # À créer sur Google Cloud Storage
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "prod-sync-$TIMESTAMP.sql"

# Vérification
Write-Host "⚠️  ATTENTION : Cette opération va ÉCRASER toutes tes données locales !" -ForegroundColor Yellow
$confirm = Read-Host "Continuer ? (oui/non)"
if ($confirm -ne "oui") {
    Write-Host "❌ Opération annulée" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "📤 Étape 1/4 : Export de la base Cloud SQL..." -ForegroundColor Green

# Export Cloud SQL vers Cloud Storage
gcloud sql export sql $INSTANCE_NAME "gs://$BUCKET_NAME/$BACKUP_FILE" `
    --database=$DATABASE_NAME `
    --project=$PROJECT_ID

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'export Cloud SQL" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Export terminé" -ForegroundColor Green
Write-Host ""
Write-Host "📥 Étape 2/4 : Téléchargement du fichier..." -ForegroundColor Green

# Télécharger le fichier localement
gsutil cp "gs://$BUCKET_NAME/$BACKUP_FILE" "./backups/$BACKUP_FILE"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du téléchargement" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Téléchargement terminé" -ForegroundColor Green
Write-Host ""
Write-Host "🗑️  Étape 3/4 : Nettoyage de la base locale..." -ForegroundColor Green

# Recréer la base locale (PostgreSQL)
$env:PGPASSWORD = "postgres"  # Ton mot de passe local
psql -U postgres -c "DROP DATABASE IF EXISTS crm_local;"
psql -U postgres -c "CREATE DATABASE crm_local;"

Write-Host "✅ Base locale recréée" -ForegroundColor Green
Write-Host ""
Write-Host "📥 Étape 4/4 : Import dans la base locale..." -ForegroundColor Green

# Importer le dump
psql -U postgres -d crm_local -f "./backups/$BACKUP_FILE"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'import" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Synchronisation terminée avec succès !" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Résumé :" -ForegroundColor Cyan
Write-Host "  - Fichier de backup : ./backups/$BACKUP_FILE"
Write-Host "  - Base de données locale : crm_local"
Write-Host ""
Write-Host "⚠️  N'oublie pas de mettre à jour DATABASE_URL dans ton .env :" -ForegroundColor Yellow
Write-Host '  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crm_local"'
Write-Host ""
