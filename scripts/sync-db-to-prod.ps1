# Script optimise pour pousser la base de donnees locale vers production
# Version finale et testee

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

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dumpFile = "backup-prod-$timestamp.sql"
$gcsFile = "prod-backup-$timestamp.sql"

Write-Host ""
Write-Host "Etape 1/4: Export de la base locale..." -ForegroundColor Cyan

$env:PGPASSWORD = "Jlsl2022@"
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -h localhost -U postgres -d 2thier -f $dumpFile --clean --if-exists --no-owner --no-acl

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR lors de l'export" -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item $dumpFile).Length / 1MB
Write-Host "Export reussi: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Green

Write-Host ""
Write-Host "Etape 2/4: Upload vers Cloud Storage..." -ForegroundColor Cyan

gcloud storage cp $dumpFile "gs://crm-database-backups-thiernew/$gcsFile" --project=thiernew | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR lors de l'upload" -ForegroundColor Red
    Remove-Item $dumpFile -Force
    exit 1
}

Write-Host "Upload reussi" -ForegroundColor Green

Write-Host ""
Write-Host "Etape 3/4: Import dans Cloud SQL..." -ForegroundColor Cyan
Write-Host "(Ceci peut prendre 2-5 minutes)" -ForegroundColor Gray

gcloud sql import sql crm-postgres-prod "gs://crm-database-backups-thiernew/$gcsFile" --database=2thier --user=postgres --project=thiernew --quiet

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR lors de l'import" -ForegroundColor Red
    Write-Host "Le fichier reste disponible: gs://crm-database-backups-thiernew/$gcsFile" -ForegroundColor Yellow
    Remove-Item $dumpFile -Force
    exit 1
}

Write-Host "Import reussi !" -ForegroundColor Green

Write-Host ""
Write-Host "Etape 4/4: Nettoyage..." -ForegroundColor Cyan

Remove-Item $dumpFile -Force
Write-Host "Fichiers temporaires supprimes" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "SYNCHRONISATION REUSSIE !" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "La production contient maintenant toutes tes donnees locales." -ForegroundColor Cyan
Write-Host ""
Write-Host "Verifie sur: https://app.2thier.be" -ForegroundColor Yellow
Write-Host ""
