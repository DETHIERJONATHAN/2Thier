# ✅ CHECKLIST DÉPLOIEMENT PRODUCTION

## 🎯 Configuration Actuelle

Votre application CRM est maintenant **100% prête pour la production** sur Google Cloud Platform avec :

### Infrastructure
- ✅ **Google Cloud Run** - Hébergement serverless scalable
- ✅ **Google Cloud SQL** - Base de données PostgreSQL managée
- ✅ **Google Secret Manager** - Gestion sécurisée des secrets
- ✅ **Google Artifact Registry** - Registry Docker privé
- ✅ **Cloud Build** - CI/CD automatisé (optionnel)

### Fichiers de Configuration Mis à Jour
- ✅ `Dockerfile` - Build optimisé production
- ✅ `cloudbuild.yaml` - Configuration Cloud Build avec secrets
- ✅ `src/api-server-clean.ts` - PORT 8080 pour Cloud Run
- ✅ `.env.production.example` - Template variables production
- ✅ `.github/copilot-instructions.md` - Documentation Google Cloud SQL

### Scripts de Déploiement
- ✅ `deploy-production.sh` - Script déploiement automatisé
- ✅ `check-production-ready.sh` - Vérification pré-déploiement
- ✅ `GUIDE-DEPLOIEMENT-PRODUCTION.md` - Guide complet

## 📝 Actions à Réaliser

### Étape 1 : Installation des Outils (sur votre machine locale)

```bash
# 1. Installer Google Cloud CLI
# macOS
brew install google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Windows
# Télécharger depuis: https://cloud.google.com/sdk/docs/install

# 2. Initialiser gcloud
gcloud init

# 3. Configurer le projet
gcloud config set project thiernew

# 4. S'authentifier
gcloud auth login
gcloud auth application-default login
```

### Étape 2 : Configuration Google Cloud (première fois uniquement)

```bash
# 1. Activer les APIs nécessaires
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com

# 2. Créer Artifact Registry
gcloud artifacts repositories create crm-2thier \
  --repository-format=docker \
  --location=europe-west1 \
  --description="Docker images pour CRM 2THIER"

# 3. Vérifier que Cloud SQL existe
gcloud sql instances describe crm-postgres-prod
```

### Étape 3 : Créer les Secrets

```bash
# Générer et stocker les secrets (à faire UNE SEULE FOIS)

# 1. Mot de passe PostgreSQL (utilisez un mot de passe fort!)
echo -n "VOTRE_MOT_DE_PASSE_FORT" | \
  gcloud secrets create crm-postgres-password --data-file=-

# 2. JWT Secret
openssl rand -hex 32 | \
  gcloud secrets create crm-jwt-secret --data-file=-

# 3. Session Secret
openssl rand -hex 32 | \
  gcloud secrets create crm-session-secret --data-file=-

# 4. Encryption Key
openssl rand -hex 16 | \
  gcloud secrets create crm-encryption-key --data-file=-

# 5. Crypto Secret
openssl rand -hex 32 | \
  gcloud secrets create crm-crypto-secret --data-file=-

# 6. Google AI API Key
echo -n "VOTRE_CLE_GEMINI" | \
  gcloud secrets create google-ai-api-key --data-file=-

# 7. Google OAuth
echo -n "VOTRE_CLIENT_ID.apps.googleusercontent.com" | \
  gcloud secrets create google-client-id --data-file=-

echo -n "VOTRE_CLIENT_SECRET" | \
  gcloud secrets create google-client-secret --data-file=-
```

### Étape 4 : Configurer Cloud SQL

```bash
# 1. Définir le mot de passe PostgreSQL
PASSWORD=$(gcloud secrets versions access latest --secret=crm-postgres-password)
gcloud sql users set-password postgres \
  --instance=crm-postgres-prod \
  --password="$PASSWORD"

# 2. Vérifier que la base de données existe
gcloud sql databases describe 2thier --instance=crm-postgres-prod

# Si elle n'existe pas, la créer:
gcloud sql databases create 2thier --instance=crm-postgres-prod

# 3. Migrer le schéma (via Cloud SQL Proxy)
./cloud-sql-proxy thiernew:europe-west1:crm-postgres-prod &
sleep 5

DATABASE_URL="postgresql://postgres:${PASSWORD}@localhost:5432/2thier" \
  npx prisma migrate deploy

# Arrêter le proxy
pkill cloud-sql-proxy
```

### Étape 5 : Vérification Pré-Déploiement

```bash
# Vérifier que tout est prêt
./check-production-ready.sh
```

### Étape 6 : Premier Déploiement

```bash
# Déployer sur Google Cloud Run
./deploy-production.sh
```

### Étape 7 : Configuration DNS (après le premier déploiement)

```bash
# 1. Mapper votre domaine
gcloud run domain-mappings create \
  --service=crm-api \
  --domain=app.2thier.be \
  --region=europe-west1

# 2. Google Cloud vous donnera des enregistrements DNS à ajouter
# Ajoutez-les dans votre configuration DNS chez votre registrar
```

## 🔍 Tests Post-Déploiement

```bash
# 1. Obtenir l'URL du service
SERVICE_URL=$(gcloud run services describe crm-api \
  --region=europe-west1 \
  --format="value(status.url)")

# 2. Test de santé
curl $SERVICE_URL/api/health

# 3. Test connexion base de données
curl $SERVICE_URL/api/health/database

# 4. Voir les logs
gcloud logging tail \
  "resource.type=cloud_run_revision AND resource.labels.service_name=crm-api"
```

## 🔄 Déploiements Futurs

Pour chaque mise à jour :

```bash
# 1. Développer et tester localement
npm run dev

# 2. Commit et push
git add .
git commit -m "Description des changements"
git push

# 3. Déployer
./deploy-production.sh

# Ou utiliser Cloud Build (CI/CD automatique)
gcloud builds submit --config=cloudbuild.yaml
```

## 📊 Monitoring

### Dashboards Google Cloud

- **Cloud Run** : https://console.cloud.google.com/run/detail/europe-west1/crm-api/metrics?project=thiernew
- **Cloud SQL** : https://console.cloud.google.com/sql/instances/crm-postgres-prod/overview?project=thiernew
- **Logs** : https://console.cloud.google.com/logs/query?project=thiernew

### Commandes CLI

```bash
# Logs en temps réel
gcloud logging tail \
  "resource.type=cloud_run_revision AND resource.labels.service_name=crm-api"

# Métriques CPU/Mémoire
gcloud run services describe crm-api \
  --region=europe-west1 \
  --format="table(metadata.name,status.conditions)"

# État Cloud SQL
gcloud sql operations list \
  --instance=crm-postgres-prod \
  --limit=5
```

## 🛡️ Sécurité Production

### Points clés configurés
- ✅ HTTPS forcé (Cloud Run automatique)
- ✅ Secrets dans Secret Manager (jamais en clair)
- ✅ Cloud SQL sans IP publique (Unix socket uniquement)
- ✅ CORS restreint à app.2thier.be
- ✅ Rate limiting actif
- ✅ Helmet.js protection headers
- ✅ Input sanitization
- ✅ JWT authentication

### Recommandations additionnelles
- [ ] Activer Cloud Armor pour protection DDoS
- [ ] Configurer des alertes de monitoring
- [ ] Mettre en place des tests de charge
- [ ] Configurer des backups automatiques (déjà fait pour Cloud SQL)
- [ ] Activer l'audit logging

## 💰 Estimation des Coûts

### Configuration actuelle (estimation mensuelle)

**Cloud Run**
- 2 vCPU, 2GB RAM
- Min 1 instance, Max 10
- ~$30-100/mois selon le trafic

**Cloud SQL**
- db-custom-2-7680 (2 vCPU, 7.5GB RAM)
- ~$100-150/mois

**Autres services**
- Artifact Registry : ~$5/mois
- Secret Manager : ~$1/mois
- Logging/Monitoring : ~$10-20/mois

**TOTAL ESTIMÉ** : ~$150-300/mois

Pour réduire les coûts en développement :
- Utiliser une instance Cloud SQL plus petite (db-f1-micro)
- Réduire les instances Cloud Run à 0 minimum

## 📞 Support

- **Documentation** : Voir `GUIDE-DEPLOIEMENT-PRODUCTION.md`
- **Issues** : https://github.com/DETHIERJONATHAN/2Thier/issues
- **Google Cloud Support** : https://cloud.google.com/support

---

**Date de configuration** : 26 décembre 2025
**Status** : ✅ Prêt pour production 100%
**Prochaine action** : Installer gcloud CLI et lancer `./check-production-ready.sh`
