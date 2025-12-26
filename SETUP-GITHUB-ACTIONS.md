# 🚀 Configuration GitHub Actions pour Déploiement Automatique

## Pourquoi GitHub Actions ?

✅ **Déploiement automatique** à chaque push sur `main`  
✅ **Pas besoin d'authentification manuelle** depuis Codespaces  
✅ **CI/CD intégré** dans GitHub  
✅ **Logs et historique** des déploiements  

## 📝 Configuration (À faire UNE SEULE FOIS)

### Étape 1 : Créer un Service Account Google Cloud

**Sur votre machine locale** (avec gcloud configuré) ou dans Google Cloud Console :

```bash
# 1. Créer le service account
gcloud iam service-accounts create github-actions-deploy \
  --display-name="GitHub Actions Deployment" \
  --project=thiernew

# 2. Accorder les permissions nécessaires
SERVICE_ACCOUNT_EMAIL="github-actions-deploy@thiernew.iam.gserviceaccount.com"

# Permission Cloud Run
gcloud projects add-iam-policy-binding thiernew \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/run.admin"

# Permission Service Account User (pour Cloud Run)
gcloud projects add-iam-policy-binding thiernew \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Permission Artifact Registry
gcloud projects add-iam-policy-binding thiernew \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/artifactregistry.writer"

# Permission Secret Manager (pour lire les secrets)
gcloud projects add-iam-policy-binding thiernew \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# Permission Cloud SQL Client
gcloud projects add-iam-policy-binding thiernew \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/cloudsql.client"

# 3. Créer une clé JSON
gcloud iam service-accounts keys create ~/github-actions-key.json \
  --iam-account=${SERVICE_ACCOUNT_EMAIL}

# 4. Afficher le contenu de la clé (à copier)
cat ~/github-actions-key.json
```

**OU via Google Cloud Console** :

1. Aller sur : https://console.cloud.google.com/iam-admin/serviceaccounts?project=thiernew
2. Cliquer sur "CREATE SERVICE ACCOUNT"
3. Nom : `github-actions-deploy`
4. Rôles à ajouter :
   - Cloud Run Admin
   - Service Account User
   - Artifact Registry Writer
   - Secret Manager Secret Accessor
   - Cloud SQL Client
5. Créer une clé JSON et la télécharger

### Étape 2 : Ajouter le Secret dans GitHub

1. Aller sur : https://github.com/DETHIERJONATHAN/2Thier/settings/secrets/actions

2. Cliquer sur **"New repository secret"**

3. Nom du secret : `GCP_SERVICE_ACCOUNT_KEY`

4. Valeur : Coller **tout le contenu du fichier JSON** (pas juste une partie)
   ```json
   {
     "type": "service_account",
     "project_id": "thiernew",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "github-actions-deploy@thiernew.iam.gserviceaccount.com",
     ...
   }
   ```

5. Cliquer sur **"Add secret"**

### Étape 3 : Activer GitHub Actions

Le fichier workflow est déjà créé : `.github/workflows/deploy-production.yml`

✅ Rien à faire ! Il s'activera automatiquement au prochain push.

## 🚀 Utilisation

### Déploiement Automatique

Chaque fois que vous faites un `git push` sur la branche `main`, le déploiement se lancera automatiquement :

```bash
git add .
git commit -m "Mon changement"
git push origin main
```

### Déploiement Manuel

1. Aller sur : https://github.com/DETHIERJONATHAN/2Thier/actions
2. Cliquer sur "Deploy to Google Cloud Run"
3. Cliquer sur "Run workflow" > "Run workflow"

## 📊 Voir les Logs

1. Aller sur : https://github.com/DETHIERJONATHAN/2Thier/actions
2. Cliquer sur le workflow en cours
3. Voir les logs détaillés de chaque étape

## ✅ Vérification Post-Déploiement

Le workflow teste automatiquement :
- ✅ Build Docker
- ✅ Push vers Artifact Registry
- ✅ Déploiement sur Cloud Run
- ✅ Health check de l'API

En cas d'erreur, le workflow s'arrête et vous notifie.

## 🔧 Modification du Workflow

Le fichier est dans `.github/workflows/deploy-production.yml`

Vous pouvez le modifier pour :
- Changer les ressources (CPU, mémoire)
- Ajouter des étapes de test
- Modifier les variables d'environnement
- Changer la branche de déploiement

## 🆘 Dépannage

### Erreur "Permission denied"

➡️ Vérifier que toutes les permissions ont été accordées au service account

### Erreur "Secret not found"

➡️ Vérifier que `GCP_SERVICE_ACCOUNT_KEY` existe dans les secrets GitHub

### Erreur "Image not found"

➡️ Vérifier que l'Artifact Registry existe :
```bash
gcloud artifacts repositories create crm-2thier \
  --repository-format=docker \
  --location=europe-west1 \
  --project=thiernew
```

## 🎯 Prochaines Étapes

1. ✅ Créer le service account (Étape 1)
2. ✅ Ajouter le secret dans GitHub (Étape 2)
3. ✅ Faire un commit et push
4. ✅ Vérifier le déploiement dans l'onglet Actions

---

**Documentation complète** : 
- GitHub Actions : https://docs.github.com/en/actions
- Google Cloud Auth : https://github.com/google-github-actions/auth
