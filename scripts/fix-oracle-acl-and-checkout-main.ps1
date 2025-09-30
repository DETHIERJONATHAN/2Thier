param(
    [string]$RepoRoot = (Get-Location).Path,
    [string]$RelativeTarget = "Oracle"
)

function Write-Step {
    param([string]$Message)
    Write-Host "`n== $Message ==" -ForegroundColor Cyan
}

function Run-Cmd {
    param(
        [string]$File,
        [string[]]$Parameters,
        [string]$ErrorMessage
    )
    Write-Host "-> $File $(($Parameters -join ' '))" -ForegroundColor DarkGray
    & $File @Parameters
    $code = $LASTEXITCODE
    if ($code -ne 0) {
        throw "$ErrorMessage (code $code)"
    }
}

$repo = (Resolve-Path $RepoRoot).Path
$target = Join-Path $repo $RelativeTarget
if (-not (Test-Path $target)) {
    throw "Le dossier cible '$target' est introuvable."
}

Write-Step "Prise de possession du dossier"
Run-Cmd -File "takeown.exe" -Parameters @("/F", $target, "/R") -ErrorMessage "Échec takeown"

Write-Step "Reset complet des ACL"
Run-Cmd -File "icacls.exe" -Parameters @($target, "/reset", "/T", "/C") -ErrorMessage "Échec icacls reset"

$principalUser = "${env:USERDOMAIN}\${env:USERNAME}"
$grants = @(
    "AUTORITE NT\Système:(OI)(CI)F",
    "BUILTIN\Administrateurs:(OI)(CI)F",
    "NT AUTHORITY\SYSTEM:(OI)(CI)F",
    "BUILTIN\Administrators:(OI)(CI)F",
    "${principalUser}:(OI)(CI)F"
)

Write-Step "Application permissions standard"
foreach ($principal in $grants) {
    try {
        Run-Cmd -File "icacls.exe" -Parameters @($target, "/grant", $principal, "/T", "/C") -ErrorMessage "Échec icacls grant pour $principal"
    } catch {
        Write-Warning "Impossible d'appliquer les droits pour '$principal' : $($_.Exception.Message)"
    }
}

Write-Step "Nettoyage du fichier lock"
$indexLock = Join-Path $repo '.git/index.lock'
if (Test-Path $indexLock) {
    Remove-Item $indexLock -Force
    Write-Host "Suppression .git/index.lock" -ForegroundColor Yellow
} else {
    Write-Host "Aucun index.lock trouvé" -ForegroundColor DarkGray
}

Write-Step "Checkout main"
Run-Cmd -File "git.exe" -Parameters @("-C", $repo, "checkout", "main") -ErrorMessage "git checkout main a échoué"

Write-Step "Succès"
Write-Host "Le dossier $RelativeTarget est réparé et la branche 'main' est active." -ForegroundColor Green
