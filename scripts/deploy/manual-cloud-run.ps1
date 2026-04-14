param(
  [string]$ProjectId = "thiernew",
  [string]$Region = "europe-west1",
  [string]$ServiceName = "crm-api",
  [string]$ArtifactRepository = "crm-api",
  [string]$ImageName = "crm-api",
  [switch]$AllowDirtyWorktree,
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

function Invoke-GcloudJson {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)

  $output = & gcloud @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "gcloud command failed: gcloud $($Arguments -join ' ')"
  }

  return ($output | ConvertFrom-Json)
}

Require-Command -Name "git"
Require-Command -Name "gcloud"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

if (-not (Test-Path ".git")) {
  Write-Host "ERROR: This script must be run from inside the git repository." -ForegroundColor Red
  exit 1
}

$statusLines = @(git status --porcelain)
if ($LASTEXITCODE -ne 0) {
  throw "git status failed."
}

if ($statusLines.Count -gt 0 -and -not $AllowDirtyWorktree) {
  Write-Host "ERROR: Working tree is dirty. Commit or stash changes before deploying." -ForegroundColor Red
  Write-Host "Hint: if you really need to bypass this, rerun with -AllowDirtyWorktree." -ForegroundColor Yellow
  exit 1
}

$headCommit = (git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) {
  throw "git rev-parse HEAD failed."
}

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($LASTEXITCODE -ne 0) {
  throw "git rev-parse --abbrev-ref HEAD failed."
}

$shortSha = if ($headCommit.Length -ge 7) { $headCommit.Substring(0, 7) } else { $headCommit }
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$deployId = "manual-$timestamp-$shortSha"
$imageUrl = "$Region-docker.pkg.dev/$ProjectId/$ArtifactRepository/$ImageName`:$deployId"

$logDir = Join-Path $repoRoot ".git\manual-deploy"
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

$beforeStateFile = Join-Path $logDir "$deployId-before-service.json"
$afterStateFile = Join-Path $logDir "$deployId-after-service.json"
$metadataFile = Join-Path $logDir "$deployId.json"

$previousServingRevision = $null
$previousLatestReadyRevision = $null
$serviceBefore = $null

Write-Host "==> Capturing current Cloud Run service state..." -ForegroundColor Cyan
try {
  $serviceBefore = Invoke-GcloudJson -Arguments @(
    "run", "services", "describe", $ServiceName,
    "--project", $ProjectId,
    "--region", $Region,
    "--format", "json"
  )

  ($serviceBefore | ConvertTo-Json -Depth 100) | Set-Content -Encoding utf8 $beforeStateFile

  $traffic = @($serviceBefore.status.traffic)
  if ($traffic.Count -gt 0) {
    $previousServingRevision = ($traffic | Sort-Object percent -Descending | Select-Object -First 1).revisionName
  }

  $previousLatestReadyRevision = $serviceBefore.status.latestReadyRevisionName
}
catch {
  Write-Host "WARN: Could not capture existing service state. This may be the first deploy or access may be limited." -ForegroundColor Yellow
}

Write-Host "==> Building container image with Cloud Build..." -ForegroundColor Cyan
& gcloud builds submit `
  --project $ProjectId `
  --machine-type E2_HIGHCPU_8 `
  --tag $imageUrl `
  .

if ($LASTEXITCODE -ne 0) {
  throw "Cloud Build failed."
}

$setEnvVars = "NODE_ENV=production,PGHOST=/cloudsql/thiernew:europe-west1:crm-postgres-prod,PGDATABASE=2thier,PGUSER=postgres,FRONTEND_URL=https://www.zhiive.com,BACKEND_URL=https://www.zhiive.com,GCS_BUCKET=crm-2thier-uploads,SMTP_HOST=send.one.com,SMTP_PORT=465,SMTP_USER=contact@zhiive.com,SMTP_FROM=contact@zhiive.com,POSTAL_API_URL=https://postal.zhiive.com,POSTAL_SMTP_HOST=postal.zhiive.com,POSTAL_SMTP_PORT=25,POSTAL_SMTP_USER=zhiive-mail,DEFAULT_EMAIL_DOMAIN=zhiive.com,SEARXNG_URL=http://46.225.180.8:8888,VAPID_SUBJECT=mailto:contact@zhiive.com,ODOO_URL=http://46.225.180.8:8069,ODOO_DB_NAME=odoo_peppol,ODOO_USER=admin"
$updateSecrets = "PGPASSWORD=crm-postgres-password:latest,JWT_SECRET=JWT_SECRET:latest,SESSION_SECRET=SESSION_SECRET:latest,ENCRYPTION_KEY=ENCRYPTION_KEY:latest,CRYPTO_SECRET_KEY=CRYPTO_SECRET_KEY:latest,GOOGLE_AI_API_KEY=GOOGLE_AI_API_KEY:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,SMTP_PASS=SMTP_PASS:latest,POSTAL_API_KEY=POSTAL_API_KEY:latest,POSTAL_SMTP_PASS=POSTAL_SMTP_PASS:latest,POSTAL_WEBHOOK_SECRET=POSTAL_WEBHOOK_SECRET:latest,VAPID_PUBLIC_KEY=VAPID_PUBLIC_KEY:latest,VAPID_PRIVATE_KEY=VAPID_PRIVATE_KEY:latest,ODOO_PASSWORD=ODOO_PASSWORD:latest"

Write-Host "==> Deploying image to Cloud Run..." -ForegroundColor Cyan
& gcloud run deploy $ServiceName `
  --project $ProjectId `
  --image $imageUrl `
  --region $Region `
  --platform managed `
  --allow-unauthenticated `
  --memory 2Gi `
  --cpu 2 `
  --min-instances 1 `
  --max-instances 10 `
  --timeout 300 `
  --concurrency 80 `
  --cpu-boost `
  --port 8080 `
  --add-cloudsql-instances "thiernew:europe-west1:crm-postgres-prod" `
  --set-env-vars $setEnvVars `
  --update-secrets $updateSecrets

if ($LASTEXITCODE -ne 0) {
  throw "Cloud Run deploy failed."
}

Write-Host "==> Capturing deployed service state..." -ForegroundColor Cyan
$serviceAfter = Invoke-GcloudJson -Arguments @(
  "run", "services", "describe", $ServiceName,
  "--project", $ProjectId,
  "--region", $Region,
  "--format", "json"
)

($serviceAfter | ConvertTo-Json -Depth 100) | Set-Content -Encoding utf8 $afterStateFile

$serviceUrl = $serviceAfter.status.url
$deployedRevision = $serviceAfter.status.latestReadyRevisionName
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
    Write-Host "ERROR: Health check failed for $healthUrl" -ForegroundColor Red
    throw
  }
}

$gitTag = $deployId
$tagMessage = "Manual Cloud Run deploy $deployId"

if ($statusLines.Count -eq 0) {
  & git tag -a $gitTag -m $tagMessage HEAD
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create local git tag '$gitTag'."
  }
}
else {
  Write-Host "WARN: Working tree was dirty, so no git tag was created." -ForegroundColor Yellow
  $gitTag = $null
}

$metadata = [ordered]@{
  deployId = $deployId
  timestampUtc = (Get-Date).ToUniversalTime().ToString("o")
  branch = $branch
  headCommit = $headCommit
  dirtyWorktree = ($statusLines.Count -gt 0)
  gitTag = $gitTag
  imageUrl = $imageUrl
  serviceName = $ServiceName
  projectId = $ProjectId
  region = $Region
  previousServingRevision = $previousServingRevision
  previousLatestReadyRevision = $previousLatestReadyRevision
  deployedRevision = $deployedRevision
  serviceUrl = $serviceUrl
  healthUrl = $healthUrl
  beforeStateFile = $beforeStateFile
  afterStateFile = $afterStateFile
}

($metadata | ConvertTo-Json -Depth 20) | Set-Content -Encoding utf8 $metadataFile

Write-Host ""
Write-Host "SUCCESS: Manual deploy completed." -ForegroundColor Green
Write-Host "Deploy ID: $deployId"
Write-Host "Commit:    $headCommit"
Write-Host "Revision:  $deployedRevision"
Write-Host "URL:       $serviceUrl"
if ($previousServingRevision) {
  Write-Host "Rollback:  powershell -ExecutionPolicy Bypass -File .\scripts\deploy\rollback-cloud-run.ps1 -Revision $previousServingRevision"
}
Write-Host "Log file:  $metadataFile"
