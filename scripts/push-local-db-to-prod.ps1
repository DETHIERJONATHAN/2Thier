# Script pour pousser la base de données locale vers la production Cloud SQL
# ⚠️ ATTENTION: Ceci va ÉCRASER toutes les données en production !

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "PUSH BASE DE DONNÉES LOCALE → PRODUCTION" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  ATTENTION: Cette opération va ÉCRASER toutes les données de la base de production !" -ForegroundColor Red
Write-Host ""
$confirmation = Read-Host "Taper 'OUI' en majuscules pour confirmer"

if ($confirmation -ne "OUI") {
    Write-Host "❌ Opération annulée." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Étape 1: Export de la base locale..." -ForegroundColor Cyan

# Variables
$localDb = "2thier"
$localUser = "postgres"
$localPassword = "Jlsl2022@"
$dumpFile = "C:\Users\dethi\OneDrive\Desktop\CRM SAVE\crm\backup-local-to-prod.sql"
$cloudInstance = "thiernew:europe-west1:crm-postgres-prod"
$cloudDb = "2thier"

# Export de la base locale
$env:PGPASSWORD = $localPassword
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" `
    -h localhost `
    -U $localUser `
    -d $localDb `
    -F c `
    -f $dumpFile `
    --no-owner `
    --no-acl

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'export de la base locale" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Base locale exportée vers: $dumpFile" -ForegroundColor Green
$fileSize = (Get-Item $dumpFile).Length / 1MB
Write-Host "   Taille: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray

Write-Host ""
Write-Host "☁️  Étape 2: Upload vers Google Cloud Storage..." -ForegroundColor Cyan

# Upload vers Cloud Storage
$bucketName = "crm-database-backups-thiernew"
$gcsPath = "gs://$bucketName/local-to-prod-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"

# Créer le bucket s'il n'existe pas
gcloud storage buckets create "gs://$bucketName" --location=europe-west1 --project=thiernew 2>$null

# Upload
gcloud storage cp $dumpFile $gcsPath --project=thiernew

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'upload vers Cloud Storage" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Fichier uploadé vers Cloud Storage" -ForegroundColor Green

Write-Host ""
Write-Host "💾 Étape 3: Import dans Cloud SQL (ceci peut prendre quelques minutes)..." -ForegroundColor Cyan

# Import dans Cloud SQL
gcloud sql import sql $cloudInstance $gcsPath `
    --database=$cloudDb `
    --project=thiernew `
    --quiet

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'import dans Cloud SQL" -ForegroundColor Red
    Write-Host "   Le fichier reste disponible ici: $gcsPath" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Base de données importée avec succès en production !" -ForegroundColor Green

Write-Host ""
Write-Host "🧹 Étape 4: Nettoyage..." -ForegroundColor Cyan

# Supprimer le fichier local temporaire
Remove-Item $dumpFile -Force
Write-Host "✅ Fichier temporaire supprimé" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ DÉPLOIEMENT COMPLET TERMINÉ !" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Résumé:" -ForegroundColor Cyan
Write-Host "   - Code: Déployé via GitHub → Cloud Run" -ForegroundColor Gray
Write-Host "   - Base de données: Locale → Cloud SQL" -ForegroundColor Gray
Write-Host ""
Write-Host "Ton site en production contient maintenant:" -ForegroundColor Yellow
Write-Host "   - Toutes tes configurations" -ForegroundColor Gray
Write-Host "   - Tous tes favoris" -ForegroundColor Gray
Write-Host "   - Toutes tes donnees de test" -ForegroundColor Gray
Write-Host ""
Write-Host "Verifie sur: https://app.2thier.be" -ForegroundColor Cyan
