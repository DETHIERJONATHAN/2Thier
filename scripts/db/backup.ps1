param(
  [string]$OutDir = "db-backups"
)
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) { Write-Host "❌ pg_dump non trouvé. Installez PostgreSQL client." -ForegroundColor Red; exit 1 }
if (-not $env:DATABASE_URL) { Write-Host "❌ DATABASE_URL non défini." -ForegroundColor Red; exit 1 }
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
$ts = Get-Date -Format 'yyyyMMdd_HHmmss'
$file = Join-Path $OutDir ("backup_$ts.sql")
pg_dump --no-owner --no-privileges "$env:DATABASE_URL" > $file
Write-Host "✅ Backup créé: $file" -ForegroundColor Green
