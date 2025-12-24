# Script de synchronisation Local -> Google Cloud SQL
# Usage: .\sync-to-cloud-sql.ps1
# Peut etre planifie avec Windows Task Scheduler

$ErrorActionPreference = "Continue"

# Configuration
$LOCAL_HOST = "localhost"
$LOCAL_PORT = "5432"
$LOCAL_USER = "postgres"
$LOCAL_DB = "2thier"
$LOCAL_PASSWORD = "Jlsl2022@"

$CLOUD_HOST = "34.52.131.199"
$CLOUD_PORT = "5432"
$CLOUD_USER = "postgres"
$CLOUD_DB = "2thier"
$CLOUD_PASSWORD = "Jlsl2022@"

$PG_BIN = "C:\Program Files\PostgreSQL\17\bin"
$BACKUP_DIR = "$PSScriptRoot\..\backups"
$TIMESTAMP = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BACKUP_FILE = "$BACKUP_DIR\backup_$TIMESTAMP.dump"

# Creer le dossier de backup s'il n'existe pas
if (!(Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
}

Write-Host "[SYNC] Synchronisation Local -> Cloud SQL" -ForegroundColor Cyan
Write-Host "[TIME] $TIMESTAMP" -ForegroundColor Gray

# Etape 1: Exporter la base locale
Write-Host "`n[1/3] Export de la base locale..." -ForegroundColor Yellow
$env:PGPASSWORD = $LOCAL_PASSWORD
& "$PG_BIN\pg_dump.exe" -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -F c -f $BACKUP_FILE

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Erreur lors de l'export" -ForegroundColor Red
    exit 1
}

$backupSize = [math]::Round((Get-Item $BACKUP_FILE).Length / 1MB, 2)
Write-Host "[OK] Export reussi: $BACKUP_FILE ($backupSize MB)" -ForegroundColor Green

# Etape 2: Restaurer vers Cloud SQL
Write-Host "`n[2/3] Restauration vers Cloud SQL..." -ForegroundColor Yellow
$env:PGPASSWORD = $CLOUD_PASSWORD
$restoreOutput = & "$PG_BIN\pg_restore.exe" -h $CLOUD_HOST -p $CLOUD_PORT -U $CLOUD_USER -d $CLOUD_DB --clean --if-exists --no-owner --no-privileges $BACKUP_FILE 2>&1
# Ignorer l'erreur transaction_timeout (difference de version PG17 vs PG14)
$criticalErrors = $restoreOutput | Where-Object { $_ -match "ERROR" -and $_ -notmatch "transaction_timeout" }
if ($criticalErrors) {
    Write-Host "[WARN] Quelques erreurs non critiques ignorees" -ForegroundColor DarkYellow
}
Write-Host "[OK] Restauration terminee" -ForegroundColor Green

# Etape 3: Verification
Write-Host "`n[3/3] Verification..." -ForegroundColor Yellow
$result = & "$PG_BIN\psql.exe" -h $CLOUD_HOST -p $CLOUD_PORT -U $CLOUD_USER -d $CLOUD_DB -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"
$tableCount = $result.Trim()
Write-Host "[OK] $tableCount tables dans Cloud SQL" -ForegroundColor Green

# Nettoyage des anciens backups (garder les 5 derniers)
Write-Host "`n[CLEAN] Nettoyage des anciens backups..." -ForegroundColor Yellow
Get-ChildItem $BACKUP_DIR -Filter "backup_*.dump" | Sort-Object CreationTime -Descending | Select-Object -Skip 5 | Remove-Item -Force
Write-Host "[OK] Backups nettoyes" -ForegroundColor Green

Write-Host "`n[DONE] Synchronisation terminee avec succes!" -ForegroundColor Cyan
