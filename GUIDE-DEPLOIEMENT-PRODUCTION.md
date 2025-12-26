# 🚀 Guide de Déploiement Production - Google Cloud Platform

Ce guide vous accompagne pas à pas pour déployer le CRM 2THIER sur Google Cloud Run avec Cloud SQL.

## 📋 Prérequis

### 1. Outils installés
- [x] Google Cloud CLI (`gcloud`)
- [x] Docker
- [x] Node.js 20+
- [x] Git

### 2. Compte Google Cloud
- [x] Projet Google Cloud créé (`thiernew`)
- [x] Facturation activée
- [x] APIs activées :
  - Cloud Run API
  - Cloud SQL Admin API
  - Artifact Registry API
  - Secret Manager API
  - Cloud Build API

## 🔐 Étape 1 : Configuration des Secrets

### Créer les secrets dans Google Secret Manager

```bash
# 1. Mot de passe PostgreSQL
gcloud secrets create crm-postgres-password \
  --data-file=- <<< "VOTRE_MOT_DE_PASSE_POSTGRES_SECURISE"

# 2. JWT Secret
gcloud secrets create crm-jwt-secret \
  --data-file=- <<< "$(openssl rand -hex 32)"

# 3. Session Secret  
gcloud secrets create crm-session-secret \
  --data-file=- <<< "$(openssl rand -hex 32)"

# 4. Encryption Key (32 caractères)
gcloud secrets create crm-encryption-key \
  --data-file=- <<< "$(openssl rand -hex 16)"

# 5. Crypto Secret Key (64 caractères hex)
gcloud secrets create crm-crypto-secret \
  --data-file=- <<< "$(openssl rand -hex 32)"

# 6. Google AI API Key
gcloud secrets create google-ai-api-key \
  --data-file=- <<< "VOTRE_CLE_API_GEMINI"

# 7. Google OAuth Client ID
gcloud secrets create google-client-id \
  --data-file=- <<< "VOTRE_CLIENT_ID.apps.googleusercontent.com"

# 8. Google OAuth Client Secret
gcloud secrets create google-client-secret \
  --data-file=- <<< "VOTRE_CLIENT_SECRET"
```

### Accorder les permissions au service Cloud Run

```bash
# Récupérer l'email du service account de Cloud Run
PROJECT_NUMBER=$(gcloud projects describe thiernew --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Accorder l'accès aux secrets
for SECRET in crm-postgres-password crm-jwt-secret crm-session-secret crm-encryption-key crm-crypto-secret google-ai-api-key google-client-id google-client-secret
do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor"
done
```

## 💾 Étape 2 : Configuration de Cloud SQL

### Créer l'instance PostgreSQL (si ce n'est pas déjà fait)

```bash
gcloud sql instances create crm-postgres-prod \
  --database-version=POSTGRES_15 \
  --tier=db-custom-2-7680 \
  --region=europe-west1 \
  --network=default \
  --no-assign-ip \
  --database-flags=max_connections=100 \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --retained-backups-count=7
```

### Définir le mot de passe root

```bash
PASSWORD=$(gcloud secrets versions access latest --secret=crm-postgres-password)
gcloud sql users set-password postgres \
  --instance=crm-postgres-prod \
  --password="$PASSWORD"
```

### Créer la base de données

```bash
gcloud sql databases create 2thier \
  --instance=crm-postgres-prod
```

### Migrer la base de données

```bash
# 1. Démarrer le Cloud SQL Proxy
./cloud-sql-proxy thiernew:europe-west1:crm-postgres-prod &
PROXY_PID=$!

# 2. Attendre que le proxy soit prêt
sleep 5

# 3. Exécuter les migrations Prisma
PASSWORD=$(gcloud secrets versions access latest --secret=crm-postgres-password)
DATABASE_URL="postgresql://postgres:${PASSWORD}@localhost:5432/2thier" \
  npx prisma migrate deploy

# 4. Seed initial (optionnel)
DATABASE_URL="postgresql://postgres:${PASSWORD}@localhost:5432/2thier" \
  npx prisma db seed

# 5. Arrêter le proxy
kill $PROXY_PID
```

## 🏗️ Étape 3 : Configuration Artifact Registry

```bash
# Créer le repository (si pas déjà fait)
gcloud artifacts repositories create crm-2thier \
  --repository-format=docker \
  --location=europe-west1 \
  --description="Docker images pour CRM 2THIER"

# Configurer Docker pour utiliser Artifact Registry
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

## 🚀 Étape 4 : Déploiement

### Option A : Déploiement manuel avec le script

```bash
# Rendre le script exécutable
chmod +x deploy-production.sh

# Lancer le déploiement
./deploy-production.sh
```

### Option B : Déploiement via Cloud Build (CI/CD)

```bash
# Déclencher un build depuis GitHub
gcloud builds submit --config=cloudbuild.yaml

# Ou connecter votre repository GitHub pour le CI/CD automatique
gcloud builds triggers create github \
  --repo-name=2Thier \
  --repo-owner=DETHIERJONATHAN \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

## 🌐 Étape 5 : Configuration DNS

### Mapper votre domaine personnalisé

```bash
# 1. Mapper le domaine à Cloud Run
gcloud run domain-mappings create \
  --service=crm-api \
  --domain=app.2thier.be \
  --region=europe-west1

# 2. Ajouter les enregistrements DNS fournis par Google Cloud
# (Google Cloud vous donnera les enregistrements CNAME/A à ajouter)
```

## ✅ Étape 6 : Vérification

### Tests post-déploiement

```bash
# 1. Vérifier que le service est actif
gcloud run services describe crm-api \
  --region=europe-west1 \
  --format="value(status.url)"

# 2. Test de santé
SERVICE_URL=$(gcloud run services describe crm-api \
  --region=europe-west1 \
  --format="value(status.url)")
curl ${SERVICE_URL}/api/health

# 3. Vérifier la connexion à la base de données
curl ${SERVICE_URL}/api/health/database

# 4. Voir les logs en temps réel
gcloud logging tail \
  "resource.type=cloud_run_revision AND resource.labels.service_name=crm-api" \
  --format=json
```

## 📊 Monitoring et Logs

### Accéder aux logs

```bash
# Logs récents
gcloud logging read \
  'resource.type=cloud_run_revision AND resource.labels.service_name=crm-api' \
  --limit 50 \
  --format json

# Logs en temps réel
gcloud logging tail \
  'resource.type=cloud_run_revision AND resource.labels.service_name=crm-api'
```

### Dashboard de monitoring

Accédez au dashboard Cloud Run :
```
https://console.cloud.google.com/run/detail/europe-west1/crm-api/metrics?project=thiernew
```

## 🔄 Mises à jour

Pour déployer une nouvelle version :

```bash
# 1. Commit vos changements
git add .
git commit -m "Description des changements"
git push

# 2. Redéployer
./deploy-production.sh
```

## 🛡️ Sécurité

### Points de sécurité configurés

- ✅ Connexion Cloud SQL via Unix Socket (pas d'IP publique)
- ✅ Secrets stockés dans Google Secret Manager
- ✅ HTTPS forcé sur tous les endpoints
- ✅ Rate limiting activé
- ✅ Helmet.js pour les headers de sécurité
- ✅ CORS configuré pour `app.2thier.be` uniquement
- ✅ Authentification JWT
- ✅ Sanitization des inputs

### Recommandations supplémentaires

1. **Activer Cloud Armor** pour la protection DDoS
2. **Configurer Cloud CDN** pour le cache des assets statiques
3. **Activer Cloud Monitoring** pour les alertes
4. **Configurer des backups automatiques** de Cloud SQL (déjà fait)

## 🆘 Dépannage

### Le service ne démarre pas

```bash
# Vérifier les logs d'erreur
gcloud logging read \
  'resource.type=cloud_run_revision AND severity>=ERROR' \
  --limit 100
```

### Problème de connexion Cloud SQL

```bash
# Vérifier que l'instance Cloud SQL est active
gcloud sql instances describe crm-postgres-prod

# Tester la connexion avec le proxy
./cloud-sql-proxy thiernew:europe-west1:crm-postgres-prod
```

### Variables d'environnement manquantes

```bash
# Vérifier les variables d'environnement du service
gcloud run services describe crm-api \
  --region=europe-west1 \
  --format="value(spec.template.spec.containers[0].env)"
```

## 📞 Support

Pour toute question ou problème, consultez :
- [Documentation Cloud Run](https://cloud.google.com/run/docs)
- [Documentation Cloud SQL](https://cloud.google.com/sql/docs)
- [Issues GitHub](https://github.com/DETHIERJONATHAN/2Thier/issues)

---

**Dernière mise à jour** : 26 décembre 2025
**Version** : Production v1.0
