# Script de déploiement multi-domaines pour 2Thier
# Ce script configure automatiquement les 3 domaines sur Google Cloud Run

$PROJECT_ID = "thiernew"
$REGION = "europe-west1"
$SERVICE_NAME = "crm-api"

Write-Host "🚀 Déploiement Multi-Domaines 2Thier" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# 1. Déploiement du service principal
Write-Host "📦 Étape 1: Build et déploiement de l'application..." -ForegroundColor Cyan
# Le déploiement se fait via GitHub Actions automatiquement

# 2. Configuration des domaines personnalisés
Write-Host "🌐 Étape 2: Configuration des domaines personnalisés..." -ForegroundColor Cyan

# Domaine 1: app.2thier.be (CRM)
Write-Host "   → Configuration de app.2thier.be (CRM)" -ForegroundColor Yellow
gcloud run domain-mappings create `
    --service=$SERVICE_NAME `
    --domain=app.2thier.be `
    --region=$REGION `
    --project=$PROJECT_ID

# Domaine 2: 2thier.be (Site Vitrine)
Write-Host "   → Configuration de 2thier.be (Site Vitrine)" -ForegroundColor Yellow
gcloud run domain-mappings create `
    --service=$SERVICE_NAME `
    --domain=2thier.be `
    --region=$REGION `
    --project=$PROJECT_ID

# Domaine 3: www.2thier.be (Redirection vers 2thier.be)
Write-Host "   → Configuration de www.2thier.be" -ForegroundColor Yellow
gcloud run domain-mappings create `
    --service=$SERVICE_NAME `
    --domain=www.2thier.be `
    --region=$REGION `
    --project=$PROJECT_ID

# Domaine 4: devis1min.be (Devis1Minute)
Write-Host "   → Configuration de devis1min.be (Marketplace)" -ForegroundColor Yellow
gcloud run domain-mappings create `
    --service=$SERVICE_NAME `
    --domain=devis1min.be `
    --region=$REGION `
    --project=$PROJECT_ID

# Domaine 5: www.devis1min.be
Write-Host "   → Configuration de www.devis1min.be" -ForegroundColor Yellow
gcloud run domain-mappings create `
    --service=$SERVICE_NAME `
    --domain=www.devis1min.be `
    --region=$REGION `
    --project=$PROJECT_ID

Write-Host ""
Write-Host "✅ Configuration des domaines terminée!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Prochaines étapes à faire MANUELLEMENT:" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Vérifier les enregistrements DNS requis:" -ForegroundColor White
Write-Host "   gcloud run domain-mappings describe --domain=2thier.be --region=$REGION"
Write-Host ""
Write-Host "2. Configurer les enregistrements DNS chez votre registrar:" -ForegroundColor White
Write-Host ""
Write-Host "   Pour 2thier.be:" -ForegroundColor Cyan
Write-Host "   Type: A" -ForegroundColor White
Write-Host "   Nom: @" -ForegroundColor White
Write-Host "   Valeur: [IP fournie par Google Cloud]" -ForegroundColor White
Write-Host ""
Write-Host "   Pour www.2thier.be:" -ForegroundColor Cyan
Write-Host "   Type: CNAME" -ForegroundColor White
Write-Host "   Nom: www" -ForegroundColor White
Write-Host "   Valeur: ghs.googlehosted.com" -ForegroundColor White
Write-Host ""
Write-Host "   Pour devis1min.be:" -ForegroundColor Cyan
Write-Host "   Type: A" -ForegroundColor White
Write-Host "   Nom: @" -ForegroundColor White
Write-Host "   Valeur: [IP fournie par Google Cloud]" -ForegroundColor White
Write-Host ""
Write-Host "   Pour www.devis1min.be:" -ForegroundColor Cyan
Write-Host "   Type: CNAME" -ForegroundColor White
Write-Host "   Nom: www" -ForegroundColor White
Write-Host "   Valeur: ghs.googlehosted.com" -ForegroundColor White
Write-Host ""
Write-Host "3. Attendre la propagation DNS (peut prendre jusqu'à 48h)" -ForegroundColor White
Write-Host ""
Write-Host "4. Vérifier le statut avec:" -ForegroundColor White
Write-Host "   gcloud run domain-mappings describe --domain=2thier.be --region=$REGION"
Write-Host "   gcloud run domain-mappings describe --domain=devis1min.be --region=$REGION"
Write-Host ""
Write-Host "🎯 Une fois les DNS configurés, les sites seront accessibles sur:" -ForegroundColor Green
Write-Host "   • https://2thier.be (Site Vitrine)" -ForegroundColor White
Write-Host "   • https://app.2thier.be (CRM)" -ForegroundColor White
Write-Host "   • https://devis1min.be (Marketplace)" -ForegroundColor White
Write-Host ""
