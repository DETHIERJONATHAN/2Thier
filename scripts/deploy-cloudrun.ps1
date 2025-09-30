Param(
  [string]$Project,
  [string]$Region = "europe-west1",
  [string]$Repo = "crm", # Nom réel du repository Artifact Registry détecté
  [string]$Service = "crm-backend",
  [switch]$SkipBuild,
  [switch]$VerboseLogs,
  [switch]$AutoCreateRepo
)

<#
.SYNOPSIS
  Script d'automatisation du déploiement Cloud Run (build image Docker + push + deploy).

.EXEMPLE
  ./scripts/deploy-cloudrun.ps1 -Project my-gcp-project

.EXEMPLE (skip build docker, redeploy dernière image seulement)
  ./scripts/deploy-cloudrun.ps1 -Project my-gcp-project -SkipBuild

.NOTES
  - Nécessite gcloud authentifié (gcloud auth login) et rôle Artifact Registry + Cloud Run Admin.
  - Suppose qu'un repository Artifact Registry ($Repo) existe dans la région.
#>

if (-not $Project) {
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot ".." )).Path
  $projectFile = Join-Path $repoRoot "current_project.txt"
  if (Test-Path $projectFile) {
    $Project = (Get-Content $projectFile | Select-Object -First 1).Trim()
  }
  if (-not $Project -and $env:GCP_PROJECT) {
    $Project = $env:GCP_PROJECT
  }
}

if (-not $Project) { Write-Error "Paramètre -Project requis (aucun défaut trouvé dans current_project.txt ni GCP_PROJECT)"; exit 1 }

function Fail($msg, $code=1) {
  Write-Error $msg
  exit $code
}

Write-Host "[INFO] Projet: $Project" -ForegroundColor Cyan
Write-Host "[INFO] Région: $Region" -ForegroundColor Cyan
Write-Host "[INFO] Repo   : $Repo" -ForegroundColor Cyan
Write-Host "[INFO] Service: $Service" -ForegroundColor Cyan

# Vérifier config gcloud
$currentProject = (gcloud config get-value core/project 2>$null)
if ($currentProject -ne $Project) {
  Write-Host "[INFO] Switch projet gcloud vers $Project" -ForegroundColor Yellow
  gcloud config set project $Project | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$gitSha = (git rev-parse --short HEAD)
$imageTag = "$timestamp-$gitSha"
$fullImage = "$Region-docker.pkg.dev/$Project/$Repo/app:$imageTag"

Write-Host "[BUILD] Tag image: $fullImage" -ForegroundColor Green

# Vérifier que le repository existe (méthode robust: describe)
$repoExists = $false
try {
  $repoName = gcloud artifacts repositories describe $Repo --location=$Region --format="value(name)" 2>$null
  if ($repoName) { $repoExists = $true }
} catch { $repoExists = $false }

if (-not $repoExists) {
  if ($AutoCreateRepo) {
    Write-Host "[CREATE] Repository '$Repo' absent -> création..." -ForegroundColor Yellow
    gcloud artifacts repositories create $Repo --repository-format=DOCKER --location=$Region --description="Images Cloud Run CRM" | Out-Null
    if ($LASTEXITCODE -ne 0) { Fail "Création repository '$Repo' échouée" 11 }
    else { Write-Host "[OK] Repository créé." -ForegroundColor Green }
  } else {
    Fail "Repository Artifact Registry '$Repo' introuvable dans $Region. Ajoute -AutoCreateRepo pour le créer automatiquement ou exécute: gcloud artifacts repositories create $Repo --repository-format=DOCKER --location=$Region"
  }
}

if (-not $SkipBuild) {
  $dockerAvailable = (Get-Command docker -ErrorAction SilentlyContinue) -ne $null
  if ($dockerAvailable) {
    Write-Host "[STEP] Installation dépendances (npm ci)" -ForegroundColor Magenta
    npm ci
    if ($LASTEXITCODE -ne 0) { Fail "npm ci a échoué" 2 }

    Write-Host "[STEP] Build frontend (npm run build)" -ForegroundColor Magenta
    npm run build
    if ($LASTEXITCODE -ne 0) { Fail "Build front échoué" 3 }

    Write-Host "[STEP] Construction image Docker locale" -ForegroundColor Magenta
    docker build --pull -t $fullImage `
      --build-arg BUILD_TIMESTAMP=$timestamp `
      --build-arg GIT_SHA=$gitSha `
      .
    if ($LASTEXITCODE -ne 0) { Fail "docker build a échoué" 4 }

    Write-Host "[STEP] Push image vers Artifact Registry" -ForegroundColor Magenta
    docker push $fullImage
    if ($LASTEXITCODE -ne 0) { Fail "docker push a échoué" 5 }
  }
  else {
    Write-Host "[FALLBACK] Docker absent -> utilisation Cloud Build" -ForegroundColor Yellow
    Write-Host "[INFO] La construction se fera côté Google Cloud (Dockerfile utilisé)." -ForegroundColor Yellow
    gcloud builds submit --tag $fullImage .
    if ($LASTEXITCODE -ne 0) { Fail "Cloud Build a échoué" 7 }
  }
} else {
  Write-Host "[SKIP] Build/Push sauté. Assurez-vous que l'image existe déjà." -ForegroundColor Yellow
}

Write-Host "[DEPLOY] Déploiement Cloud Run..." -ForegroundColor Green

$deployCmd = @(
  'run','deploy',$Service,
  '--image', $fullImage,
  '--region', $Region,
  '--platform','managed',
  '--allow-unauthenticated'
)

# Ajout des variables d'environnement de manière robuste
$envVars = "BUILD_VERSION=$imageTag,GIT_SHA=$gitSha"
$deployCmd += '--set-env-vars', $envVars

if ($VerboseLogs) { $deployCmd += '--verbosity=debug' }

gcloud @deployCmd
if ($LASTEXITCODE -ne 0) { Fail "Échec déploiement Cloud Run" 6 }

Write-Host "[SUCCESS] Nouvelle révision déployée." -ForegroundColor Green
Write-Host "[INFO] Image: $fullImage" -ForegroundColor Cyan

Write-Host "[CHECK] Récupération URL..." -ForegroundColor Magenta
$serviceUrl = (gcloud run services describe $Service --region $Region --format='value(status.url)')
Write-Host "[URL] Service: $serviceUrl" -ForegroundColor Green

Write-Host "[TEST] Endpoint /api/root-info" -ForegroundColor Magenta
try {
  $resp = Invoke-WebRequest "$serviceUrl/api/root-info" -UseBasicParsing -TimeoutSec 20
  Write-Host "[HTTP] $($resp.StatusCode)" -ForegroundColor Green
} catch {
  Write-Warning "Impossible de joindre /api/root-info immédiatement (propagation?)" }

Write-Host "Terminé." -ForegroundColor Green