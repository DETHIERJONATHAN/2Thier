# Script simplifie pour pousser la base de donnees locale vers production
# ATTENTION: Ceci va ECRASER toutes les donnees en production !

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "PUSH BASE DE DONNEES LOCALE -> PRODUCTION" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "ATTENTION: Cette operation va ECRASER toutes les donnees de la base de production !" -ForegroundColor Red
Write-Host ""
$confirmation = Read-Host "Taper 'OUI' en majuscules pour confirmer"

if ($confirmation -ne "OUI") {
    Write-Host "Operation annulee." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Etape 1: Export de la base locale..." -ForegroundColor Cyan

# Variables
$localDb = "2thier"
$localUser = "postgres"
$localPassword = "Jlsl2022@"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dumpFile = "backup-local-to-prod-$timestamp.sql"
$cloudInstance = "crm-db"
$cloudDb = "2thier"
$bucketName = "crm-database-backups-thiernew"

# Export de la base locale
$env:PGPASSWORD = $localPassword
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -h localhost -U $localUser -d $localDb -F c -f $dumpFile --no-owner --no-acl

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR lors de l'export de la base locale" -ForegroundColor Red
    exit 1
}

Write-Host "Base locale exportee: $dumpFile" -ForegroundColor Green
$fileSize = (Get-Item $dumpFile).Length / 1MB
Write-Host "Taille: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray

Write-Host ""
Write-Host "Etape 2: Upload vers Google Cloud Storage..." -ForegroundColor Cyan

$gcsPath = "gs://$bucketName/local-to-prod-$timestamp.sql"

# Creer le bucket s'il n'existe pas
gcloud storage buckets create "gs://$bucketName" --location=europe-west1 --project=thiernew 2>$null

# Upload
gcloud storage cp $dumpFile $gcsPath --project=thiernew

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR lors de l'upload vers Cloud Storage" -ForegroundColor Red
    exit 1
}

Write-Host "Fichier uploade vers Cloud Storage" -ForegroundColor Green

Write-Host ""
Write-Host "Etape 3: Import dans Cloud SQL (quelques minutes)..." -ForegroundColor Cyan

# Import dans Cloud SQL
gcloud sql import sql $cloudInstance $gcsPath --database=$cloudDb --project=thiernew --quiet

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR lors de l'import dans Cloud SQL" -ForegroundColor Red
    Write-Host "Le fichier reste disponible ici: $gcsPath" -ForegroundColor Yellow
    exit 1
}

Write-Host "Base de donnees importee avec succes en production !" -ForegroundColor Green

Write-Host ""
Write-Host "Etape 4: Nettoyage..." -ForegroundColor Cyan

# Supprimer le fichier local temporaire
Remove-Item $dumpFile -Force
Write-Host "Fichier temporaire supprime" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "DEPLOIEMENT COMPLET TERMINE !" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Resume:" -ForegroundColor Cyan
Write-Host "  - Code: Deploye via GitHub -> Cloud Run" -ForegroundColor Gray
Write-Host "  - Base de donnees: Locale -> Cloud SQL" -ForegroundColor Gray
Write-Host ""
Write-Host "Ton site en production contient maintenant:" -ForegroundColor Yellow
Write-Host "  - Toutes tes configurations" -ForegroundColor Gray
Write-Host "  - Tous tes favoris" -ForegroundColor Gray
Write-Host "  - Toutes tes donnees de test" -ForegroundColor Gray
Write-Host ""
Write-Host "Verifie sur: https://app.2thier.be" -ForegroundColor Cyan
