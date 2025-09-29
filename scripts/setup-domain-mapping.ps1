<#
 .SYNOPSIS
  Automation de la vérification de domaine (DNS TXT) + création d'un domain mapping Cloud Run.

 .DESCRIPTION
  Ce script aide à :
    1. Générer le token de vérification Site Verification (DNS_TXT)
    2. T'afficher la valeur TXT à ajouter dans ta zone DNS (one.com)
    3. Attendre que le TXT soit visible (nslookup)
    4. Valider le domaine via l'API SiteVerification
    5. Créer le domain mapping Cloud Run pour un sous-domaine (par défaut app.domaine)
    6. Afficher les enregistrements DNS (CNAME ou A/AAAA) pour le sous-domaine
    7. Attendre que le mapping passe à READY
    8. Tester /api/health

  Limites :
    - Le script ne peut pas créer/modifier les DNS chez one.com (manuel).
    - Tu dois déjà avoir fait : gcloud auth login avec les scopes cloud-platform,siteverification.

 .USAGE
    Exécuter depuis PowerShell (dans le repo) :
      pwsh -File .\scripts\setup-domain-mapping.ps1 -Project thiernew -Region europe-west1 -Service crm-backend -DomainBase 2thier.be -Subdomain app

 .PARAMETERS
    -Project     : ID du projet GCP
    -Region      : Région Cloud Run
    -Service     : Nom du service Cloud Run existant
    -DomainBase  : Domaine racine (ex: 2thier.be)
    -Subdomain   : Préfixe du sous-domaine (ex: app)
    -SkipVerification : Si le domaine est déjà vérifié (Search Console), saute les étapes 1-4

 .NOTES
    Nécessite : gcloud, nslookup, accès réseau vers APIs Google.
#>

param(
  [Parameter(Mandatory=$true)] [string]$Project,
  [Parameter(Mandatory=$true)] [string]$Region,
  [Parameter(Mandatory=$true)] [string]$Service,
  [Parameter(Mandatory=$true)] [string]$DomainBase,
  [Parameter(Mandatory=$true)] [string]$Subdomain,
  [switch]$SkipVerification
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Section($title) {
  Write-Host "`n==== $title ====\n" -ForegroundColor Cyan
}

function Exec($cmd, [switch]$Quiet) {
  Write-Host ("[CMD] " + $cmd) -ForegroundColor DarkGray
  if($Quiet){ Invoke-Expression $cmd | Out-Null } else { Invoke-Expression $cmd }
}

function Get-AccessToken() {
  Write-Host "Obtention access token..." -ForegroundColor Yellow
  $t = (gcloud auth print-access-token).Trim()
  if(-not $t){ throw 'Impossible de récupérer un access token.' }
  return $t
}

function Get-VerificationToken($accessToken, $domain){
  Write-Section "1. Récupération du token de vérification DNS"
  $body = @{
    verificationMethod = 'DNS_TXT'
    identifier = @{ type = 'INET_DOMAIN'; identifier = $domain }
  } | ConvertTo-Json -Depth 5
  $resp = Invoke-RestMethod -Method POST -Uri 'https://www.googleapis.com/siteVerification/v1/token' -Headers @{ Authorization = "Bearer $accessToken" } -ContentType 'application/json' -Body $body
  if(-not $resp.token){ throw 'Token non reçu (vérifie les scopes: siteverification).' }
  return $resp.token
}

function Wait-DnsTxt($domain, $expectedFragment){
  Write-Section "2. Attente de la propagation du TXT ($domain)"
  Write-Host "Recherche du fragment: $expectedFragment" -ForegroundColor Yellow
  while($true){
    try {
      $r = nslookup -type=TXT $domain 2>$null | Out-String
      if($r -match [Regex]::Escape($expectedFragment)){ Write-Host 'TXT détecté.' -ForegroundColor Green; break }
      Write-Host '... pas encore visible, nouvelle tentative dans 20s.' -ForegroundColor DarkYellow
    } catch { Write-Host 'nslookup échec (retry)...' -ForegroundColor DarkYellow }
    Start-Sleep -Seconds 20
  }
}

function Verify-Domain($accessToken, $domain){
  Write-Section "3. Validation du domaine via API"
  $verifyBody = @{ site = @{ type='INET_DOMAIN'; identifier=$domain } } | ConvertTo-Json
  $resp = Invoke-RestMethod -Method POST -Uri 'https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=DNS_TXT' -Headers @{ Authorization = "Bearer $accessToken" } -ContentType 'application/json' -Body $verifyBody
  if(-not $resp.id){ throw 'Réponse inattendue lors de la vérification.' }
  Write-Host "Domaine vérifié: $($resp.id)" -ForegroundColor Green
}

function Create-DomainMapping($project,$region,$service,$fqdn){
  Write-Section "4. Création du domain mapping Cloud Run ($fqdn)"
  $cmd = "gcloud beta run domain-mappings create --service $service --domain $fqdn --project $project --region $region"
  $out = (& gcloud beta run domain-mappings create --service $service --domain $fqdn --project $project --region $region 2>&1) | Out-String
  if($LASTEXITCODE -ne 0 -and $out -match 'ALREADY_EXISTS'){ Write-Host 'Mapping déjà existant, on continue.' -ForegroundColor Yellow }
  elseif($LASTEXITCODE -ne 0){ Write-Host $out -ForegroundColor Red; throw 'Échec création mapping.' }
  else { Write-Host 'Mapping créé.' -ForegroundColor Green }
  return $out
}

function Extract-DnsRecords($describeOutput){
  # On réutilise la commande describe plutôt que la sortie initiale pour format stable.
  $yaml = (& gcloud beta run domain-mappings describe $script:Fqdn --project $script:Project --region $script:Region --format yaml 2>$null) | Out-String
  $records = @()
  $current = @{}
  foreach($line in $yaml -split "`n"){
    if($line -match '^\s*-\s+name:'){ if($current.Count){ $records += [pscustomobject]$current; $current=@{} }; $current.name = ($line -replace '^\s*-\s+name:\s*','').Trim() }
    elseif($line -match '^\s*type:'){ $current.type = ($line -replace '^\s*type:\s*','').Trim() }
    elseif($line -match '^\s*rrdata:'){ $current.rrdata = ($line -replace '^\s*rrdata:\s*','').Trim() }
  }
  if($current.Count){ $records += [pscustomobject]$current }
  return $records | Where-Object { $_.name }
}

function Wait-MappingReady($project,$region,$fqdn){
  Write-Section "5. Attente READY (certificat)"
  while($true){
    $status = gcloud beta run domain-mappings describe $fqdn --project $project --region $region --format="value(status.resourceRecords[0].status)" 2>$null
    if($status -eq 'ACTIVE'){ Write-Host 'Status: READY' -ForegroundColor Green; break }
    Write-Host "Status actuel: $status (attente 30s)" -ForegroundColor DarkYellow
    Start-Sleep -Seconds 30
  }
}

function Test-Health($fqdn){
  Write-Section "6. Test /api/health"
  try {
    $resp = curl.exe -s "https://$fqdn/api/health" | Out-String
    Write-Host $resp
  } catch { Write-Host 'Échec requête health.' -ForegroundColor Red }
}

Write-Host "Paramètres:" -ForegroundColor Cyan
Write-Host "  Projet     : $Project" -ForegroundColor Gray
Write-Host "  Région     : $Region" -ForegroundColor Gray
Write-Host "  Service    : $Service" -ForegroundColor Gray
Write-Host "  Domaine    : $DomainBase" -ForegroundColor Gray
Write-Host "  Sous-domaine: $Subdomain" -ForegroundColor Gray

$Fqdn = "$Subdomain.$DomainBase"
$script:Project = $Project
$script:Region  = $Region
$script:Fqdn    = $Fqdn

if(-not $SkipVerification){
  $accessToken = Get-AccessToken
  $token = Get-VerificationToken -accessToken $accessToken -domain $DomainBase
  Write-Host "\nAJOUTE le TXT suivant dans la zone DNS du domaine racine ($DomainBase):" -ForegroundColor Yellow
  Write-Host "  Nom/Host : @" -ForegroundColor Yellow
  Write-Host "  Type     : TXT" -ForegroundColor Yellow
  Write-Host "  Valeur   : $token" -ForegroundColor Yellow
  Write-Host "  TTL      : 300 ou défaut" -ForegroundColor Yellow
  Read-Host "Quand c'est ajouté (et propagé un peu), presse Entrée pour continuer"
  Wait-DnsTxt -domain $DomainBase -expectedFragment ($token.Substring(0,[Math]::Min(25,$token.Length)))
  Verify-Domain -accessToken $accessToken -domain $DomainBase
} else {
  Write-Host "Étape vérification domaine SKIPPÉE" -ForegroundColor Yellow
}

$creationOutput = Create-DomainMapping -project $Project -region $Region -service $Service -fqdn $Fqdn
Write-Host "\nEnregistrements DNS pour le sous-domaine ($Fqdn) :" -ForegroundColor Cyan
$records = Extract-DnsRecords -describeOutput $creationOutput
if(-not $records){
  Write-Host 'Impossible d'extraire les resourceRecords. Vérifie manuellement avec:' -ForegroundColor Red
  Write-Host "  gcloud beta run domain-mappings describe $Fqdn --project $Project --region $Region" -ForegroundColor Red
} else {
  $records | ForEach-Object {
    Write-Host ("  " + $_.type + "\t" + $_.name + "\t" + $_.rrdata) -ForegroundColor Green
  }
  Write-Host "\nAJOUTE ces enregistrements DNS pour $Fqdn (SUPPRIME tout enregistrement ancien en doublon)." -ForegroundColor Yellow
}

Read-Host "Quand les DNS du sous-domaine sont ajoutés et propagés, presse Entrée (vérification)"
Write-Section "Vérification résolution $Fqdn"
try { nslookup $Fqdn } catch {}

Wait-MappingReady -project $Project -region $Region -fqdn $Fqdn
Test-Health -fqdn $Fqdn

Write-Host "\nTerminé. Si /api/health est OK, le domaine personnalisé est opérationnel." -ForegroundColor Cyan
