# 🚀 Déploiement depuis GitHub Codespaces

## Option 1 : Authentification Interactive (Recommandé)

```bash
# 1. Ajouter gcloud au PATH
export PATH=$HOME/google-cloud-sdk/bin:$PATH

# 2. S'authentifier (va afficher un lien à copier dans votre navigateur)
gcloud auth login --no-launch-browser

# 3. Copier le lien affiché et l'ouvrir dans votre navigateur
# 4. Vous connecter avec votre compte Google
# 5. Copier le code d'autorisation
# 6. Coller le code dans le terminal Codespaces

# 7. Configurer le projet
gcloud config set project thiernew

# 8. Authentification pour les applications
gcloud auth application-default login --no-launch-browser

# 9. Vérifier la configuration
./check-production-ready.sh

# 10. Déployer
./deploy-production.sh
```

## Option 2 : Service Account (Pour CI/CD automatique)

### Étape 1 : Créer un Service Account (sur votre machine locale ou Cloud Console)

```bash
# Sur votre machine locale avec gcloud configuré
gcloud iam service-accounts create github-codespaces-deploy \
  --display-name="GitHub Codespaces Deployment" \
  --project=thiernew

# Accorder les permissions nécessaires
gcloud projects add-iam-policy-binding thiernew \
  --member="serviceAccount:github-codespaces-deploy@thiernew.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding thiernew \
  --member="serviceAccount:github-codespaces-deploy@thiernew.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding thiernew \
  --member="serviceAccount:github-codespaces-deploy@thiernew.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Créer une clé JSON
gcloud iam service-accounts keys create ~/codespaces-key.json \
  --iam-account=github-codespaces-deploy@thiernew.iam.gserviceaccount.com
```

### Étape 2 : Configurer le Secret GitHub

1. Aller sur : https://github.com/DETHIERJONATHAN/2Thier/settings/secrets/codespaces
2. Créer un nouveau secret : `GCP_SERVICE_ACCOUNT_KEY`
3. Copier le contenu de `~/codespaces-key.json`
4. Coller dans le secret

### Étape 3 : Utiliser le Service Account dans Codespaces

```bash
# Créer le fichier de clé depuis le secret
echo "$GCP_SERVICE_ACCOUNT_KEY" > /tmp/gcp-key.json

# S'authentifier avec le service account
gcloud auth activate-service-account \
  --key-file=/tmp/gcp-key.json

# Configurer le projet
gcloud config set project thiernew

# Déployer
./deploy-production.sh

# Nettoyer
rm /tmp/gcp-key.json
```

## Option 3 : GitHub Actions (CI/CD automatique)

Créer `.github/workflows/deploy.yml` :

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - id: 'auth'
        uses: 'google-github-actions/auth@v2'
        with:
          credentials_json: '${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}'
      
      - name: 'Set up Cloud SDK'
        uses: 'google-github-actions/setup-gcloud@v2'
      
      - name: 'Build and Deploy'
        run: |
          gcloud config set project thiernew
          ./deploy-production.sh
```

## 🎯 Recommandation

**Pour un déploiement ponctuel** : Utilisez l'Option 1 (authentification interactive)

**Pour des déploiements fréquents** : Utilisez l'Option 3 (GitHub Actions)

---

## 📝 Commandes Rapides

```bash
# Ajouter gcloud au PATH (à exécuter à chaque nouvelle session)
export PATH=$HOME/google-cloud-sdk/bin:$PATH

# Ou ajouter de façon permanente
echo 'export PATH=$HOME/google-cloud-sdk/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Vérifier l'installation
gcloud version

# Vérifier l'authentification
gcloud auth list

# Vérifier le projet actif
gcloud config get-value project
```
