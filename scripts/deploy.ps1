param(
    [string]$Project = 'thiernew',
    [string]$Region = 'europe-west1',
    [string]$Service = 'crm-api',
    [string]$Repo = 'crm',
    [string]$ImageName = 'crm-api',
    [switch]$Local,
    [switch]$SkipMigrations,
    [switch]$DryRun
)

function Write-Section($Title) { Write-Host "`n=== $Title ===" -ForegroundColor Cyan }
function Exec($Cmd) {
    Write-Host "-> $Cmd" -ForegroundColor DarkGray
    if (-not $DryRun) { & powershell -NoLogo -NoProfile -Command $Cmd; if ($LASTEXITCODE -ne 0) { throw "Commande échouée: $Cmd" } }
}

$ErrorActionPreference = 'Stop'
$shortSha = (git rev-parse --short HEAD)
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$tag = "$timestamp-$shortSha"
$fullImagePath = "${Region}-docker.pkg.dev/$Project/$Repo/$ImageName:$tag"

Write-Section "PARAMS"; Write-Host "Project=$Project Region=$Region Service=$Service Image=$fullImagePath Local=$Local SkipMigrations=$SkipMigrations DryRun=$DryRun"

Write-Section "BUILD IMAGE"
if ($Local) {
    Exec "docker build -t $fullImagePath -t ${Region}-docker.pkg.dev/$Project/$Repo/$ImageName:latest ."
    if (-not $DryRun) { Exec "docker push $fullImagePath"; Exec "docker push ${Region}-docker.pkg.dev/$Project/$Repo/$ImageName:latest" }
} else {
    Exec "gcloud builds submit --tag $fullImagePath"
}

if (-not $SkipMigrations) {
    Write-Section "UPDATE + RUN PRISMA JOB"
    $jobName = 'crm-prisma-migrate'
    $describe = & gcloud run jobs describe $jobName --region $Region 2>$null; $exists=$? 
    if (-not $exists) {
        Exec "gcloud run jobs create $jobName --image $fullImagePath --region $Region --set-secrets DATABASE_URL=DATABASE_URL:latest --add-cloudsql-instances thiernew:europe-west1:crm-db --service-account github-cloud-run@thiernew.iam.gserviceaccount.com --command npx --args prisma,migrate,deploy"
    } else {
        Exec "gcloud run jobs update $jobName --image $fullImagePath --region $Region --set-secrets DATABASE_URL=DATABASE_URL:latest --add-cloudsql-instances thiernew:europe-west1:crm-db"
    }
    Exec "gcloud run jobs execute $jobName --region $Region --wait"
} else {
    Write-Host "(Migrations SKIPPED)" -ForegroundColor Yellow
}

Write-Section "DEPLOY SERVICE"
Exec "gcloud run services update $Service --image $fullImagePath --region $Region"

Write-Section "HEALTH CHECK"
if (-not $DryRun) {
    Start-Sleep -Seconds 8
    $url = (gcloud run services describe $Service --region $Region --format 'value(status.url)')
    Write-Host "Service URL: $url" -ForegroundColor Green
    $endpoints = @('/api/health','/health','/')
    foreach($e in $endpoints){
        try { $res = (curl -s -o NUL -w '%{http_code}' "$url$e"); Write-Host "$e -> $res" } catch { Write-Host "$e -> ERROR" -ForegroundColor Red }
    }
}

Write-Section "SUMMARY"
Write-Host "Image Tag: $tag" -ForegroundColor Green
Write-Host "Image Path: $fullImagePath"
Write-Host "Migrations: $(if($SkipMigrations){'SKIPPED'} else {'EXECUTED'})"
Write-Host "Done." -ForegroundColor Cyan
