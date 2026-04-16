# 🔌 Guide de Connexion Générale - CRM 2Thier

> **Document de référence** pour la connexion locale, le déploiement Cloud Run et la stratégie de backup du code.  
> Dernière mise à jour : 16 avril 2026

---

## 📋 Table des matières

1. [Connexion Locale (Développement)](#-connexion-locale-développement)
2. [Déploiement Cloud Run (Production)](#-déploiement-cloud-run-production)
3. [Stratégie Git Multi-Remote et Backup](#-stratégie-git-multi-remote-et-backup)
4. [Problèmes Rencontrés et Solutions](#-problèmes-rencontrés-et-solutions)
5. [Configuration Importante](#-configuration-importante)
6. [Commandes Utiles](#-commandes-utiles)

---

## 🏠 Connexion Locale (Développement)

### Script de démarrage rapide
bash scripts/start-local.sh
```bash
# Démarrer tout l'environnement de développement (proxy + serveur)

```

⚠️ **IMPORTANT** : Le script tue automatiquement tous les processus existants avant de relancer. Si vous avez des problèmes de port déjà utilisé, vous pouvez aussi les tuer manuellement :

```bash
# Tuer tous les processus manuellement avant de lancer
pkill -f 'cloud-sql-proxy' ; pkill -f 'npm run dev' ; pkill -f 'vite' ; pkill -f 'tsx'
```

Ce script fait automatiquement :
1. ✅ **Tue tous les processus existants** (proxy, vite, tsx, npm)
2. ✅ **Sélectionne une auth stable** pour Cloud SQL Proxy (service account, gcloud ou ADC)
3. ✅ **Démarre le Cloud SQL Proxy** sur le port 5432 (sans token expirant)
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

### Script (scripts/start-local.sh)

Le script est la source de vérité. Il gère maintenant :
- l'arrêt des process,
- le démarrage du Cloud SQL Proxy **sans `--token`** (pour éviter les sessions qui cassent au bout d'1h),
- un check de readiness Postgres,
- une sélection de mode d'auth (service account / gcloud / ADC).

Options utiles :
```bash
# recommandé si `gcloud auth list` montre un compte actif
CLOUD_SQL_AUTH_MODE=gcloud bash scripts/start-local.sh

# forcer l'auth via ADC (gcloud)
CLOUD_SQL_AUTH_MODE=adc bash scripts/start-local.sh

# forcer l'auth via service account (si tu as une clé valide)
CLOUD_SQL_AUTH_MODE=service-account bash scripts/start-local.sh

# désactiver l'ouverture auto / prisma studio (optionnel)
AUTO_OPEN_TOOLS=0 PRISMA_STUDIO_ENABLED=0 bash scripts/start-local.sh
```

### Dépannage: `invalid_grant` / "account not found"

Si tu vois dans les logs du proxy :
`invalid_grant` + `account not found`, c'est **presque toujours** une clé service account invalide (compte supprimé, clé révoquée, mauvais projet).

Solution rapide: `CLOUD_SQL_AUTH_MODE=gcloud bash scripts/start-local.sh` (si tu as déjà un compte gcloud connecté).

---

## 🚀 Déploiement Cloud Run (Production)

### Option A : Deploiement via GitHub Actions (quand GitHub est disponible)

Le deploiement se fait automatiquement via GitHub Actions lors d'un push sur `main`.

**Fichier**: `.github/workflows/deploy-cloud-run.yml`

### Option B : Deploiement DIRECT sur Cloud Run (sans GitHub)

> **Quand utiliser ?** GitHub bloque (billing, panne), ou besoin de deployer en urgence.
> Aucune dependance a GitHub - tout passe par `gcloud` directement.

#### Etape 1 : Deployer

```powershell
# Depuis PowerShell (Windows) - deploie le code local tel quel
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\manual-cloud-run.ps1 -AllowDirtyWorktree
```

Ce script fait :
1. Build l'image Docker via **Cloud Build** (sur GCP, pas sur votre PC)
2. Deploie l'image sur **Cloud Run** avec toutes les env vars et secrets
3. Fait un **health check** automatique
4. Cree un tag git local + log dans `.git/manual-deploy/`

#### Etape 2 : Verifier

```bash
# Health check manuel
curl https://www.zhiive.com/api/health

# Voir les logs Cloud Run
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=crm-api" \
  --project thiernew --limit 20 --format="table(timestamp,textPayload)"
```

#### Etape 3 : Rollback si probleme

```powershell
# Lister toutes les revisions disponibles
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\rollback-cloud-run.ps1 -ListRevisions

# Rollback automatique vers la revision precedente
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\rollback-cloud-run.ps1

# Rollback vers une revision specifique
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\rollback-cloud-run.ps1 -Revision crm-api-00042-xyz
```

> **Le rollback Cloud Run est INSTANTANE** - il redirige le trafic vers une ancienne revision
> sans rebuild. C'est equivalent (voire plus rapide) que le rollback GitHub.

#### GitHub vs Cloud Run : ai-je encore besoin de GitHub ?

| Fonctionnalite | Avec GitHub | Sans GitHub (local + GCP) |
|---|---|---|
| Historique du code | Copie remote | Git local suffit (tout est sur le PC) |
| Rollback du code source | `git revert` / branches | Git local suffit |
| Rollback en PRODUCTION | Via CI/CD redeploy | Cloud Run revisions (instantane) |
| CI/CD automatique | GitHub Actions | Manuel via script PowerShell |
| Backup du code | GitHub = backup remote | **RISQUE** : si le PC meurt, code perdu |
| Collaboration | PR, code review, issues | Impossible sans remote |

**Conclusion** : Pour un dev solo, GitHub n'est **pas bloquant** pour deployer.
Cloud Run garde toutes les revisions et permet un rollback instantane.
Le seul vrai risque sans GitHub = **pas de backup remote du code**.

> **Conseil** : Quand GitHub revient, faire un `git push origin main` pour synchroniser.
> En attendant, faire des backups reguliers du dossier projet sur un disque externe ou Google Drive.

---

## 🔒 Stratégie Git Multi-Remote et Backup

### Pourquoi un multi-remote ?

Le code source vit **uniquement dans git** (sur votre PC). Cloud Run ne stocke que l'app compilée
(JavaScript), pas le TypeScript source ni l'historique git. Si le PC meurt sans remote, tout est perdu.

La stratégie multi-remote garantit que le code est toujours sauvegardé sur au moins un serveur distant,
même si l'un des services (GitHub, GitLab, GCP) est temporairement indisponible.

### Remotes configurés

| Remote | URL | Rôle | Statut |
|--------|-----|------|--------|
| `origin` | `https://github.com/DETHIERJONATHAN/2Thier.git` | Remote principal, CI/CD GitHub Actions | Actif quand billing GitHub OK |
| `gitlab` | `https://gitlab.com/jonathan.dethier/zhiive.git` | Backup gratuit, illimité, repo privé | **ACTIF** - configuré le 16 avril 2026 |

> **Token GitLab** : stocké dans Google Secret Manager sous `GITLAB_TOKEN` (projet `thiernew`).
> Compte GitLab : jonathan.dethier@2thier.be (connexion via Google).

### Configuration initiale (DEJA FAIT)

```bash
# Vérifier que les deux remotes sont configurés
git remote -v
# origin   https://github.com/DETHIERJONATHAN/2Thier.git (fetch/push)
# gitlab   https://gitlab.com/jonathan.dethier/zhiive.git (fetch/push)
```

### Si besoin de reconfigurer sur un nouveau PC

```bash
# 1. Cloner depuis GitLab
git clone https://gitlab.com/jonathan.dethier/zhiive.git
cd zhiive

# 2. Ajouter le remote GitHub
git remote add origin https://github.com/DETHIERJONATHAN/2Thier.git

# 3. Renommer le remote gitlab si besoin
git remote rename origin gitlab
```

### Utilisation quotidienne

```bash
# Pousser sur GitLab (toujours disponible, gratuit)
git push gitlab main

# Pousser sur GitHub (quand disponible - déclenche aussi le CI/CD)
git push origin main

# Pousser sur TOUS les remotes d'un coup
git push origin main && git push gitlab main

# Astuce : créer un alias pour pousser partout
git config alias.pushall '!git push origin main && git push gitlab main'
# Puis simplement :
git pushall
```

### Récupérer le code depuis un autre PC

```bash
# Depuis GitLab (si GitHub est down)
git clone https://gitlab.com/jonathan.dethier/zhiive.git
cd zhiive
git remote add origin https://github.com/DETHIERJONATHAN/2Thier.git

# Depuis GitHub (quand disponible)
git clone https://github.com/DETHIERJONATHAN/2Thier.git
cd 2Thier
git remote add gitlab https://gitlab.com/jonathan.dethier/zhiive.git
```

### Optionnel : Google Cloud Source Repositories

Si vous souhaitez aussi un backup sur GCP (même infra que Cloud Run) :

```bash
# 1. Activer l'API (une seule fois, depuis la console GCP)
#    https://console.developers.google.com/apis/api/sourcerepo.googleapis.com/overview?project=thiernew

# 2. Créer le repo et ajouter le remote
gcloud source repos create zhiive --project=thiernew
git remote add google https://source.developers.google.com/p/thiernew/r/zhiive

# 3. Pousser
git push google main
```

### Comparatif des options de backup

| | GitHub | GitLab | Google Source Repos |
|---|---|---|---|
| Coût | Payant (votre plan) | Gratuit illimité | Gratuit (inclus GCP) |
| Repos privés | Oui | Oui | Oui |
| CI/CD intégré | GitHub Actions | GitLab CI | Cloud Build (config séparée) |
| Pull Requests | Oui | Oui (Merge Requests) | Non |
| Interface web | Excellente | Excellente | Basique |
| Fiabilité | 99.9% (hors billing) | 99.9% | Liée au projet GCP |
| Indépendant de GitHub | Non | Oui | Oui |

### Workflow recommandé

```
Développement local
       │
       ├── git commit (toujours, même sans remote)
       │
       ├── git push gitlab main ──────── Backup GitLab (toujours dispo)
       │
       ├── git push origin main ──────── GitHub + CI/CD (quand dispo)
       │
       └── Deploy direct Cloud Run ───── Si GitHub est down (Option B ci-dessus)
```

**Règle d'or** : Après chaque session de travail, toujours faire au minimum `git push gitlab main`.
GitHub est un bonus pour le CI/CD, pas une dépendance.

---

### Configuration Peppol/Odoo indispensable en production

- Cloud Run doit recevoir `ODOO_URL`, `ODOO_DB_NAME` et `ODOO_USER`.
- Le mot de passe Odoo doit venir de Secret Manager via `ODOO_PASSWORD=ODOO_PASSWORD:latest`.
- Ne jamais laisser la prod retomber sur les valeurs de fallback locales (`localhost`, `admin/admin`), sinon `POST /api/peppol/fetch-incoming` finit en erreur 500.

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
- [ ] Le code est poussé sur au moins un remote (`git push gitlab main` ou `git push origin main`)
- [ ] Les secrets sont configurés dans Google Secret Manager

---

## 📊 Architecture de Déploiement

```
                    BACKUP CODE SOURCE
                    ==================
┌─────────────────┐
│   GitLab        │◄──── git push gitlab main (backup gratuit, toujours dispo)
│   (backup)      │
└─────────────────┘

┌─────────────────┐     OPTION A : CI/CD AUTO
│   GitHub        │────▶┌──────────────────┐     ┌─────────────────┐
│   (origin)      │     │   Cloud Build    │────▶│   Cloud Run     │
└─────────────────┘     └──────────────────┘     │   (crm-api)     │
                                                 │                 │
                        OPTION B : DEPLOY DIRECT │                 │
┌─────────────────┐     ┌──────────────────┐     │   zhiive.com    │
│   PC Local      │────▶│   Cloud Build    │────▶│                 │
│   (gcloud)      │     │   (Dockerfile)   │     └────────┬────────┘
└─────────────────┘     └──────────────────┘              │
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

*Document créé le 28 décembre 2025. Mis à jour le 16 avril 2026 : ajout stratégie multi-remote GitLab + deploy direct Cloud Run sans GitHub.*
