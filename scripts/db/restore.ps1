param(
  [Parameter(Mandatory=$true)][string]$File
)
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) { Write-Host "❌ psql non trouvé. Installez PostgreSQL client." -ForegroundColor Red; exit 1 }
if (-not $env:DATABASE_URL) { Write-Host "❌ DATABASE_URL non défini." -ForegroundColor Red; exit 1 }
if (-not (Test-Path $File)) { Write-Host "❌ Fichier introuvable: $File" -ForegroundColor Red; exit 1 }
Write-Host "⚠️ Cette opération écrira dans la base. Continuer ? (Y/N)" -ForegroundColor Yellow
$resp = Read-Host
if ($resp -ne 'Y') { Write-Host "Annulé"; exit 1 }
psql "$env:DATABASE_URL" -f $File
Write-Host "✅ Restauration terminée" -ForegroundColor Green
