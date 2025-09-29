param(
  [string]$DomainBase = '2thier.be'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "Domaine cible: $DomainBase" -ForegroundColor Cyan

Write-Host 'Obtention access token...' -ForegroundColor Yellow
$accessToken = (gcloud auth print-access-token).Trim()
if(-not $accessToken){ throw 'Impossible de récupérer un access token (gcloud auth login manquant ?).' }

Write-Host 'Création requête token (Site Verification)...' -ForegroundColor Yellow
$body = @{
  verificationMethod = 'DNS_TXT'
  identifier = @{ type = 'INET_DOMAIN'; identifier = $DomainBase }
} | ConvertTo-Json -Depth 5

try {
  $resp = Invoke-RestMethod -Method POST -Uri 'https://www.googleapis.com/siteVerification/v1/token' -Headers @{ Authorization = "Bearer $accessToken" } -ContentType 'application/json' -Body $body
} catch {
  Write-Host 'ERREUR appel API Site Verification:' -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  if($_.ErrorDetails){ Write-Host $_.ErrorDetails -ForegroundColor Red }
  throw
}

if(-not $resp.token){
  Write-Host 'Réponse brute :' -ForegroundColor DarkYellow
  $resp | ConvertTo-Json -Depth 5
  throw 'Token absent dans la réponse (scopes siteverification ?).'
}

$outPath = Join-Path (Get-Location) 'token.json'
$resp | ConvertTo-Json -Depth 5 | Out-File -Encoding utf8 $outPath

Write-Host "Token récupéré et sauvegardé dans $outPath" -ForegroundColor Green
Write-Host 'Valeur TXT à ajouter dans DNS (host @):' -ForegroundColor Cyan
Write-Host "  $($resp.token)" -ForegroundColor White
Write-Host 'TTL: 300 (ou valeur par défaut)' -ForegroundColor Gray
Write-Host 'Après ajout DNS: nslookup -type=TXT 2thier.be (attendre si nécessaire) puis lancer la validation dans le script principal ou via Search Console.' -ForegroundColor Gray
