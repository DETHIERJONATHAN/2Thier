param(
  [string]$ProjectId = "thiernew",
  [string]$Region = "europe-west1",
  [string]$ServiceName = "crm-api",
  [string]$Revision,
  [switch]$ListRevisions,
  [switch]$SkipHealthCheck
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Require-Command {
  param([Parameter(Mandatory = $true)][string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Required command '$Name' was not found in PATH." -ForegroundColor Red
    exit 1
  }
}

function Get-LatestManualDeployLog {
  param([Parameter(Mandatory = $true)][string]$LogDirectory)

  if (-not (Test-Path $LogDirectory)) {
    return $null
  }

  $files = Get-ChildItem -Path $LogDirectory -Filter "manual-*.json" -File | Sort-Object LastWriteTimeUtc -Descending
  if ($files.Count -eq 0) {
    return $null
  }

  return Get-Content -Encoding utf8 $files[0].FullName | ConvertFrom-Json
}

Require-Command -Name "gcloud"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

if ($ListRevisions) {
  & gcloud run revisions list `
    --project $ProjectId `
    --region $Region `
    --service $ServiceName `
    --format "table(metadata.name,status.conditions[0].status,metadata.creationTimestamp)"

  exit $LASTEXITCODE
}

if (-not $Revision) {
  $logDir = Join-Path $repoRoot ".git\manual-deploy"
  $latestLog = Get-LatestManualDeployLog -LogDirectory $logDir

  if ($latestLog -and $latestLog.previousServingRevision) {
    $Revision = [string]$latestLog.previousServingRevision
    Write-Host "==> Using previous serving revision from latest deploy log: $Revision" -ForegroundColor Cyan
  }
}

if (-not $Revision) {
  Write-Host "ERROR: No revision specified and no previous revision was found in .git/manual-deploy." -ForegroundColor Red
  Write-Host "Hint: rerun with -ListRevisions or provide -Revision <name>." -ForegroundColor Yellow
  exit 1
}

Write-Host "==> Routing 100% of traffic to revision $Revision" -ForegroundColor Cyan
& gcloud run services update-traffic $ServiceName `
  --project $ProjectId `
  --region $Region `
  --to-revisions "$Revision=100"

if ($LASTEXITCODE -ne 0) {
  throw "Cloud Run traffic update failed."
}

$serviceAfter = & gcloud run services describe $ServiceName `
  --project $ProjectId `
  --region $Region `
  --format json | ConvertFrom-Json

$serviceUrl = $serviceAfter.status.url
$healthUrl = "$serviceUrl/api/health"

if (-not $SkipHealthCheck) {
  Write-Host "==> Waiting 10 seconds before health check..." -ForegroundColor Cyan
  Start-Sleep -Seconds 10

  Write-Host "==> Running health check on $healthUrl" -ForegroundColor Cyan
  try {
    $healthResponse = Invoke-WebRequest -Uri $healthUrl -Method Get -TimeoutSec 30 -UseBasicParsing
    if ($healthResponse.StatusCode -lt 200 -or $healthResponse.StatusCode -ge 300) {
      throw "Unexpected status code: $($healthResponse.StatusCode)"
    }
  }
  catch {
    Write-Host "ERROR: Health check failed after rollback." -ForegroundColor Red
    throw
  }
}

$logDir = Join-Path $repoRoot ".git\manual-deploy"
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

$rollbackId = "rollback-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$rollbackFile = Join-Path $logDir "$rollbackId.json"

$metadata = [ordered]@{
  rollbackId = $rollbackId
  timestampUtc = (Get-Date).ToUniversalTime().ToString("o")
  serviceName = $ServiceName
  projectId = $ProjectId
  region = $Region
  targetRevision = $Revision
  serviceUrl = $serviceUrl
  healthUrl = $healthUrl
}

($metadata | ConvertTo-Json -Depth 20) | Set-Content -Encoding utf8 $rollbackFile

Write-Host ""
Write-Host "SUCCESS: Rollback completed." -ForegroundColor Green
Write-Host "Revision: $Revision"
Write-Host "URL:      $serviceUrl"
Write-Host "Log file: $rollbackFile"
