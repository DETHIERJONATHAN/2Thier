# 🔌 Guide de Connexion Générale - CRM 2Thier

> **Document de référence** pour la connexion locale et le déploiement Cloud Run.  
> Dernière mise à jour : 28 décembre 2025

---

## 📋 Table des matières

1. [Connexion Locale (Développement)](#-connexion-locale-développement)
2. [Déploiement Cloud Run (Production)](#-déploiement-cloud-run-production)
3. [Problèmes Rencontrés et Solutions](#-problèmes-rencontrés-et-solutions)
4. [Configuration Importante](#-configuration-importante)
5. [Commandes Utiles](#-commandes-utiles)

---

## 🏠 Connexion Locale (Développement)

### Script de démarrage rapide

```bash
# Démarrer tout l'environnement de développement (proxy + serveur)
bash scripts/start-local.sh
```

⚠️ **IMPORTANT** : Le script tue automatiquement tous les processus existants avant de relancer. Si vous avez des problèmes de port déjà utilisé, vous pouvez aussi les tuer manuellement :

```bash
# Tuer tous les processus manuellement avant de lancer
pkill -f 'cloud-sql-proxy' ; pkill -f 'npm run dev' ; pkill -f 'vite' ; pkill -f 'tsx'
```

Ce script fait automatiquement :
1. ✅ **Tue tous les processus existants** (proxy, vite, tsx, npm)
2. ✅ Vérifie/récupère un token Google Cloud valide
3. ✅ Démarre le Cloud SQL Proxy sur le port 5432
4. ✅ Lance `npm run dev` (frontend + backend)

### Résultat attendu

```
✅ Environnement de développement prêt!
   🌐 Frontend: http://localhost:5173
   🔧 Backend API: http://localhost:4000
   💾 DB: Proxy Cloud SQL sur localhost:5432
```

### Pour arrêter tout

```bash
pkill -f 'npm run dev' && pkill -f 'cloud-sql-proxy'
```

### Script complet (scripts/start-local.sh)

```bash
#!/bin/bash

# -----------------------------------------------------------------------------
# SCRIPT DE DÉMARRAGE LOCAL AVEC PROXY CLOUD SQL
# -----------------------------------------------------------------------------

echo "🚀 Initialisation de l'environnement de développement..."

# 1. Arrêt de TOUS les processus existants (proxy, serveur, vite)
echo "🛑 Arrêt des processus existants..."
pkill -f "cloud-sql-proxy" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "tsx" 2>/dev/null
pkill -f "node.*api-server" 2>/dev/null
sleep 2
echo "✅ Processus arrêtés"

# 2. Vérification de l'authentification gcloud
echo "🔑 Vérification du token Google Cloud..."
TOKEN=$(gcloud auth print-access-token 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "⚠️  Pas de token valide trouvé. Tentative de connexion..."
    gcloud auth login --no-launch-browser
    TOKEN=$(gcloud auth print-access-token)
fi

if [ -z "$TOKEN" ]; then
    echo "❌ Impossible de récupérer un token."
    exit 1
fi

# 3. Démarrage du proxy
echo "🔌 Démarrage du Cloud SQL Proxy..."
./cloud-sql-proxy thiernew:europe-west1:crm-postgres-prod --port 5432 --token "$TOKEN" > /dev/null 2>&1 &
PROXY_PID=$!

echo "⏳ Attente du démarrage du proxy (5s)..."
sleep 5

if ! ps -p $PROXY_PID > /dev/null; then
    echo "❌ Le proxy a échoué au démarrage."
    exit 1
fi

echo "✅ Proxy connecté sur localhost:5432"

# 4. Lancement de l'application
npm run dev &
```

---

## 🚀 Déploiement Cloud Run (Production)

### Déploiement via GitHub Actions (Recommandé)

Le déploiement se fait automatiquement via GitHub Actions lors d'un push sur `main`.

**Fichier**: `.github/workflows/deploy.yml`

### Déploiement manuel

```bash
gcloud run deploy crm-api \
  --source . \
  --region europe-west1 \
  --project thiernew \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 10 \
  --timeout 300 \
  --concurrency 80 \
  --cpu-boost \
  --port 8080 \
  --command="" \
  --args="" \
  --add-cloudsql-instances "thiernew:europe-west1:crm-postgres-prod" \
  --set-env-vars "NODE_ENV=production,PGHOST=/cloudsql/thiernew:europe-west1:crm-postgres-prod,PGDATABASE=2thier,PGUSER=postgres,FRONTEND_URL=https://app.2thier.be,BACKEND_URL=https://app.2thier.be" \
  --update-secrets "PGPASSWORD=crm-postgres-password:latest,JWT_SECRET=JWT_SECRET:latest,SESSION_SECRET=SESSION_SECRET:latest,ENCRYPTION_KEY=ENCRYPTION_KEY:latest,CRYPTO_SECRET_KEY=CRYPTO_SECRET_KEY:latest,GOOGLE_AI_API_KEY=GOOGLE_AI_API_KEY:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest"
```

### Fichiers critiques pour le déploiement

| Fichier | Rôle |
|---------|------|
| `Procfile` | Commande de démarrage pour Buildpacks |
| `package.json` | Scripts `build` et `start` |
| `cloudbuild.yaml` | Configuration Cloud Build |

### Procfile (CRITIQUE)

```
web: node dist-server/api-server-clean.cjs
```

⚠️ **NE PAS UTILISER** `sh entrypoint.sh` ou `npm run start` - Buildpacks ne les supporte pas correctement !

---

### Problème 5: Build échoue avec Buildpacks - Timeout pendant npm ci

**Erreur:**
```
Building using Buildpacks and deploying container to Cloud Run service [crm-api]
Building Container... failed
ERROR: Build failed; check build logs for details
```

**Cause:** Les Buildpacks automatiques génèrent un Dockerfile qui timeout pendant `npm ci` à cause de la taille des dépendances (749KB de package-lock.json, 104MB de contexte).

**Solution:** Créer un Dockerfile multi-stage optimisé et un `.dockerignore` pour réduire le contexte.

**Fichiers créés:**

1. **Dockerfile** - Build multi-stage avec cache Docker
```dockerfile
FROM node:20-alpine AS base
# ... (voir fichier complet)
FROM base AS deps
RUN npm ci --only=production --legacy-peer-deps
FROM base AS builder
RUN npm ci --legacy-peer-deps && npm run build
FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
CMD ["node", "dist-server/api-server-clean.cjs"]
```

2. **.dockerignore** - Réduire le contexte de build
```dockerignore
node_modules/
dist/
*.md
!README.md
logs/
*.sql
# IMPORTANT: Garder ces fichiers pour le build
!vite.config.ts
!tsconfig*.json
```

3. **cloudbuild.yaml** - Utiliser Docker au lieu de Buildpacks
```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '...', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '...']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    args: ['run', 'deploy', 'crm-api', '--image', '...']
```

**Déploiement:**
```bash
gcloud run deploy crm-api --source . --clear-base-image [...]
```

Le flag `--clear-base-image` est **nécessaire** pour passer de Buildpacks à Dockerfile.

---

### Problème 6: Vite ne peut pas résoudre les alias (@/...)

**Erreur:**
```
error during build:
[vite]: Rollup failed to resolve import "@/auth/useAuth" from "/app/src/components/..."
```

**Cause:** Le fichier `vite.config.ts` était exclu par `.dockerignore`, donc les alias (`@`, `@components`, etc.) ne sont pas résolus lors du build Docker.

**Solution:** Garder `vite.config.ts` dans le contexte de build.

```diff
# .dockerignore
- vite.config.ts
+ # GARDER vite.config.ts pour les alias de build
  vite.config.prod.ts
```

---

## 🔧 Problèmes Rencontrés et Solutions

### Problème 1: PORT=4000 au lieu de 8080

**Erreur:**
```
The user-provided container failed to start and listen on the port defined 
provided by the PORT=4000 environment variable
```

**Cause:** L'ancienne configuration Cloud Run avait `containerPort: 4000` avec `failureThreshold: 1` (très strict).

**Solution:**
```bash
# Forcer le port 8080 lors du déploiement
gcloud run deploy crm-api --port 8080 ...
```

⚠️ **Ne jamais mettre `PORT=xxxx` dans `--set-env-vars`** - Cloud Run injecte automatiquement cette variable.

---

### Problème 2: npm non trouvé dans le PATH

**Erreur:**
```
failed to resolve binary path: error finding executable "npm" in PATH 
[/cnb/process /cnb/lifecycle /usr/local/sbin /usr/local/bin /usr/sbin /usr/bin /sbin /bin]: 
no such file or directory
```

**Cause:** La configuration Cloud Run avait été modifiée avec `command: npm` et `args: [run, start]`, mais Buildpacks ne met pas npm dans le PATH au runtime.

**Solution:**
```bash
# Réinitialiser la commande pour utiliser le Procfile
gcloud run services update crm-api --command="" --args=""
```

---

### Problème 3: tsconfig.base.json non trouvé

**Erreur:**
```
failed to resolve "extends":"./tsconfig.base.json" in /app/tsconfig.json
error during build:
[vite:build-html] failed to resolve "extends":"./tsconfig.base.json" in /app/tsconfig.json
```

**Cause:** Le fichier `tsconfig.base.json` était exclu par le `.dockerignore`, empêchant Vite de résoudre la configuration TypeScript.

**Solution:** Retirer l'exclusion des fichiers tsconfig dans `.dockerignore` :

```diff
# .dockerignore
- tsconfig.*.json
- !tsconfig.json
+ # NE PAS EXCLURE les tsconfig - nécessaires pour le build
```

---

### Problème 4: Build timeout avec Buildpacks

**Erreur:**
```
Step 5/32 : RUN npm ci --legacy-peer-deps
 ---> Running in 74d5d5447b64
[Le build s'arrête et timeout]
```

**Cause:** Les Buildpacks automatiques de Cloud Run génèrent un Dockerfile qui échoue pendant `npm ci` avec un grand `package-lock.json` (749KB).

**Solution:** Créer un Dockerfile optimisé multi-stage :

1. **Créer `Dockerfile`** avec build multi-stage (voir fichier créé)
2. **Créer `.dockerignore`** pour réduire le contexte de build
3. **Modifier `cloudbuild.yaml`** pour utiliser le Dockerfile au lieu de Buildpacks
4. **Ajouter `--clear-base-image`** lors du déploiement

```bash
gcloud run deploy crm-api --source . --clear-base-image ...
```

---

### Problème 5: entrypoint.sh non trouvé

**Erreur:**
```
sh: 0: cannot open entrypoint.sh: No such file
Container called exit(2).
```

**Cause:** Le Procfile utilisait `sh entrypoint.sh` mais Buildpacks ne copie pas ce fichier ou le chemin est incorrect.

**Solution:** Modifier le `Procfile` pour utiliser directement Node.js :

```diff
- web: sh entrypoint.sh
+ web: node dist-server/api-server-clean.cjs
```

### Problème 5: entrypoint.sh non trouvé

**Erreur:**
```
sh: 0: cannot open entrypoint.sh: No such file
Container called exit(2).
```

**Cause:** Le Procfile utilisait `sh entrypoint.sh` mais Buildpacks ne copie pas ce fichier ou le chemin est incorrect.

**Solution:** Modifier le `Procfile` pour utiliser directement Node.js :

```diff
- web: sh entrypoint.sh
+ web: node dist-server/api-server-clean.cjs
```

---

### Problème 6: Variable PORT réservée

**Erreur:**
```
The following reserved env names were provided: PORT. 
These values are automatically set by the system.
```

**Cause:** Tentative de définir `PORT=8080` dans `--set-env-vars`.

**Solution:** Ne jamais inclure PORT dans les variables d'environnement. Utiliser `--port 8080` à la place.

---

## ⚙️ Configuration Importante

### Variables d'environnement Cloud Run

| Variable | Valeur | Description |
|----------|--------|-------------|
| `NODE_ENV` | `production` | Mode production |
| `PGHOST` | `/cloudsql/thiernew:europe-west1:crm-postgres-prod` | Socket Unix Cloud SQL |
| `PGDATABASE` | `2thier` | Nom de la base |
| `PGUSER` | `postgres` | Utilisateur DB |
| `FRONTEND_URL` | `https://app.2thier.be` | URL frontend |
| `BACKEND_URL` | `https://app.2thier.be` | URL backend |

### Secrets (gérés via Secret Manager)

- `PGPASSWORD`
- `JWT_SECRET`
- `SESSION_SECRET`
- `ENCRYPTION_KEY`
- `CRYPTO_SECRET_KEY`
- `GOOGLE_AI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Configuration locale (.env)

```env
# Base de données (via proxy local)
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=2thier
PGUSER=postgres
PGPASSWORD=votre_mot_de_passe

# Serveur
PORT=4000
NODE_ENV=development

# JWT
JWT_SECRET=dev-jwt-secret-xxx

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
```

---

## 📝 Commandes Utiles

### Voir l'état du service Cloud Run

```bash
gcloud run services describe crm-api --region europe-west1 --project thiernew
```

### Voir les logs en temps réel

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=crm-api" \
  --project thiernew --limit 50 --format="table(timestamp,textPayload)"
```

### Voir la configuration actuelle

```bash
gcloud run services describe crm-api --region europe-west1 --project thiernew \
  --format="yaml(spec.template.spec.containers[0])"
```

### Health check manuel

```bash
curl https://crm-api-xxxxx-ew.a.run.app/health
curl https://crm-api-xxxxx-ew.a.run.app/api/health
```

### Rebuild local du serveur

```bash
npm run build:server
```

---

## 🎯 Checklist de Déploiement

Avant de déployer, vérifier :

- [ ] `Procfile` contient `web: node dist-server/api-server-clean.cjs`
- [ ] `npm run build` fonctionne localement
- [ ] `npm run start` démarre le serveur sur le port défini par `$PORT`
- [ ] Le code est poussé sur GitHub (`git push origin main`)
- [ ] Les secrets sont configurés dans Google Secret Manager

---

## 📊 Architecture de Déploiement

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   GitHub        │────▶│   Cloud Build    │────▶│   Cloud Run     │
│   (push main)   │     │   (Buildpacks)   │     │   (crm-api)     │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          │ Unix Socket
                                                          ▼
                                                 ┌─────────────────┐
                                                 │   Cloud SQL     │
                                                 │   (PostgreSQL)  │
                                                 └─────────────────┘
```

---

## 🆘 En cas de problème

1. **Vérifier les logs Cloud Run** (voir commandes ci-dessus)
2. **Vérifier que le Procfile est correct** (`node dist-server/api-server-clean.cjs`)
3. **Vérifier que le build local fonctionne** (`npm run build && npm run start`)
4. **Réinitialiser la commande** (`--command="" --args=""`)
5. **Forcer le port 8080** (`--port 8080`)

---

*Document créé le 28 décembre 2025 après résolution des problèmes de déploiement Cloud Run.*
