# Guide Déploiement Cloud Run - 2Thier CRM

Ce document standardise le processus de build et déploiement afin d'éviter les incohérences entre version locale, GitHub et production (Cloud Run).

---
## 1. Stratégie de Branches

| Branche | Rôle | Déclencheurs CI/CD | Règles |
|---------|------|--------------------|--------|
| `feature/*` | Travail en cours isolé | Aucun automatique | Rebase régulier sur `develop` |
| `develop` | Intégration continue | Build + tests | Jamais déployée en prod |
| `main` | Production stable | Déploiement automatique Cloud Run | Merge uniquement via PR validée |
| `hotfix/*` | Correctifs urgents prod | Après merge -> déploiement | Part de `main`, merge vers `main` + `develop` |

Simplifié si tu veux: travailler directement sur une branche stable et merger dans `main` pour déclencher la prod.

---
## 2. Flux Recommandé (Résumé)
1. Créer branche: `git checkout -b feature/auth-fix`
2. Développer / tester local.
3. Commit: `git add . && git commit -m "feat(auth): correction endpoint /auth/me"`
4. Rebase ou merge `main` si besoin.
5. PR -> Review -> Merge dans `main`.
6. CI déploie automatiquement l'image backend + exécute migrations Prisma.
7. Vérifier santé: `curl https://api.2thier.be/api/health`.
8. Tag optionnel: `git tag -a v1.3.0 -m "Release" && git push --tags`.

---
## 3. Build & Image Docker

Image unique (API + Front déjà build dans `dist`). Dockerfile principal : `Dockerfile`.

Étapes clés:
- `npm ci`
- `npx prisma generate`
- `npm run build` (frontend + backend)
- `npm prune --omit=dev`

Tag conseillé : hash court + date : `crm-api:<short_sha>` et mettre aussi `:latest`.

### Build manuel local (si Docker installé)
```powershell
$TAG="europe-west1-docker.pkg.dev/thiernew/crm/crm-api:$(git rev-parse --short HEAD)"
docker build -t $TAG -t europe-west1-docker.pkg.dev/thiernew/crm/crm-api:latest .
docker push $TAG
docker push europe-west1-docker.pkg.dev/thiernew/crm/crm-api:latest
```

### Build via Cloud Build (sans Docker local)
```powershell
gcloud builds submit --tag europe-west1-docker.pkg.dev/thiernew/crm/crm-api:$(git rev-parse --short HEAD)
```

---
## 4. Migrations Prisma (Production)
Deux phases :
1. Construire & pousser l'image
2. Exécuter le job migrations

```powershell
gcloud run jobs execute crm-prisma-migrate --region europe-west1 --wait
```
Attendre: `status: SUCCEEDED`.

---
## 5. Déploiement Cloud Run (Service API)

### Déploiement minimal (nouvelle image seulement)
```powershell
gcloud run services update crm-api `
  --image europe-west1-docker.pkg.dev/thiernew/crm/crm-api:<SHORT_SHA> `
  --region europe-west1
```

### Premier déploiement complet (si secret/env manquants)
```powershell
gcloud run deploy crm-api `
  --image europe-west1-docker.pkg.dev/thiernew/crm/crm-api:<SHORT_SHA> `
  --region europe-west1 --platform managed --allow-unauthenticated `
  --port 8080 --memory 1Gi --cpu 1 --min-instances 1 --max-instances 10 `
  --add-cloudsql-instances thiernew:europe-west1:crm-db `
  --set-env-vars NODE_ENV=production,FRONTEND_URL=https://app.2thier.be,BACKEND_URL=https://api.2thier.be,API_URL=https://api.2thier.be `
  --set-secrets DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,SESSION_SECRET=SESSION_SECRET:latest,SUPERADMIN_EMAIL=SUPERADMIN_EMAIL:latest,SUPERADMIN_PASSWORD=SUPERADMIN_PASSWORD:latest,ENCRYPTION_KEY=ENCRYPTION_KEY:latest,CRYPTO_SECRET_KEY=CRYPTO_SECRET_KEY:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,GOOGLE_REDIRECT_URI=GOOGLE_REDIRECT_URI:latest,GOOGLE_ADS_CLIENT_ID=GOOGLE_ADS_CLIENT_ID:latest,GOOGLE_ADS_CLIENT_SECRET=GOOGLE_ADS_CLIENT_SECRET:latest,GOOGLE_ADS_DEVELOPER_TOKEN=GOOGLE_ADS_DEVELOPER_TOKEN:latest,GOOGLE_ADS_REDIRECT_URI=GOOGLE_ADS_REDIRECT_URI:latest,GOOGLE_ADS_LOGIN_CUSTOMER_ID=GOOGLE_ADS_LOGIN_CUSTOMER_ID:latest,GOOGLE_ADS_MANAGER_CUSTOMER_ID=GOOGLE_ADS_MANAGER_CUSTOMER_ID:latest,GOOGLE_ADS_LIST_SEND_LOGIN_CUSTOMER=GOOGLE_ADS_LIST_SEND_LOGIN_CUSTOMER:latest,GOOGLE_AI_API_KEY=GOOGLE_AI_API_KEY:latest,VERTEX_AI_LOCATION=VERTEX_AI_LOCATION:latest,GEMINI_MODEL=GEMINI_MODEL:latest,TELNYX_API_KEY=TELNYX_API_KEY:latest,META_APP_ID=META_APP_ID:latest,META_APP_SECRET=META_APP_SECRET:latest,META_REDIRECT_URI=META_REDIRECT_URI:latest,SUPERADMIN_CODE=SUPERADMIN_CODE:latest,REACT_APP_GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest,VITE_GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest
```

---
## 6. Domaines & DNS
Domain mappings :
- `api.2thier.be` → service `crm-api`
- `app.2thier.be` → service `crm-api` (sert aussi le frontend statique)

DNS : CNAME vers `ghs.googlehosted.com.`

---
## 7. Vérifications Post-Déploiement
```powershell
curl https://api.2thier.be/api/health
curl https://api.2thier.be/api/debug/static-status
curl https://api.2thier.be/api/auth/me
```
Si `served:true` et `currentUser` présents → OK.

Logs Cloud Run :
```powershell
gcloud logs read --project thiernew --region europe-west1 --service=crm-api --limit=100
```

---
## 8. Rollback rapide
Lister révisions :
```powershell
gcloud run revisions list --region=europe-west1 --service=crm-api
```
Rediriger vers ancienne révision :
```powershell
gcloud run services update-traffic crm-api --to-revisions=crm-api-0000X-abc=100 --region europe-west1
```

---
## 9. Problèmes fréquents
| Problème | Cause | Solution |
|----------|-------|----------|
| `Permission denied secret` | Rôle manquant | Ajouter rôle `roles/secretmanager.secretAccessor` |
| `container failed to start` | Mauvais port | Vérifier `EXPOSE 4000` vs `--port 8080` (adapter) |
| `No pending migrations` | OK | Continuer déploiement |
| 500 /auth/me | Pas d'utilisateur en DB | Insérer un user ou ajuster route |
| CSP bloque scripts | Pas de nonce ou `'unsafe-inline'` absent | Ajuster config Helmet |

---
## 10. Améliorations futures (Backlog DevOps)
- Pipeline GitHub Actions: build + push + job migrations + deploy sur merge `main`.
- Cache dépendances (Cloud Build) + migration vers PNPM.
- Séparation potentielle images (api vs worker).
- Ajout Sentry / OpenTelemetry.
- Secret rotation automatique.

---
## 11. Résumé Ultra Court (Mode “appuyer sur le bouton”)
1. `git checkout -b feature/x`
2. Dev + test
3. `git commit -m "feat: x" && git push`
4. PR → Merge dans `main`
5. (CI fait build + push + migrations + deploy)
6. Vérifier 3 endpoints santé
7. Tag release si stable

---
## 12. Références
- Cloud Run: https://console.cloud.google.com/run?project=thiernew
- Artifact Registry: https://console.cloud.google.com/artifacts?project=thiernew
- Secrets: https://console.cloud.google.com/security/secret-manager?project=thiernew
- Jobs: https://console.cloud.google.com/run/jobs?project=thiernew

---
_Fin de version initiale – à enrichir selon besoins._

---

## 13. Chaîne Complète Manuelle (Cas « rebuild from scratch »)

Cette procédure part du principe que tu n'as AUCUNE image fiable en production, et que tu veux tout refaire proprement.

1. Vérifier prérequis locaux
  - `gcloud auth login` (ou utiliser le compte de service si CI)
  - `gcloud config set project thiernew`
  - (Optionnel) `gcloud components update`
2. Vérifier accès secrets & SQL
  - `gcloud secrets list | findstr DATABASE_URL`
  - `gcloud sql instances describe crm-db --project thiernew`
3. Générer tag d'image
  - PowerShell: `$SHORT=(git rev-parse --short HEAD); $TAG="$(Get-Date -Format yyyyMMdd-HHmmss)-$SHORT"`
4. Build & push image (Cloud Build conseillé)
  - `gcloud builds submit --tag europe-west1-docker.pkg.dev/thiernew/crm/crm-api:$TAG`  (=> récupère digest en fin de log)
5. (Optionnel) Tag also latest
  - `gcloud artifacts docker tags add europe-west1-docker.pkg.dev/thiernew/crm/crm-api@$DIGEST europe-west1-docker.pkg.dev/thiernew/crm/crm-api:latest` (si besoin de pointer un « alias »)
6. Mettre à jour / créer le Job migrations
  - `gcloud run jobs describe crm-prisma-migrate --region europe-west1` (si absent => create)
  - Create initial (si manquant) :
    ```powershell
    gcloud run jobs create crm-prisma-migrate `
     --image europe-west1-docker.pkg.dev/thiernew/crm/crm-api:$TAG `
     --region europe-west1 `
     --set-secrets DATABASE_URL=DATABASE_URL:latest `
     --add-cloudsql-instances thiernew:europe-west1:crm-db `
     --service-account github-cloud-run@thiernew.iam.gserviceaccount.com `
     --command npx --args prisma,migrate,deploy
    ```
  - Update (si déjà créé) :
    ```powershell
    gcloud run jobs update crm-prisma-migrate `
     --image europe-west1-docker.pkg.dev/thiernew/crm/crm-api:$TAG `
     --region europe-west1
    ```
7. Exécuter migrations (attendre SUCCEEDED)
  - `gcloud run jobs execute crm-prisma-migrate --region europe-west1 --wait`
8. Déployer service (mise à jour image seule si config déjà en place)
  - `gcloud run services update crm-api --image europe-west1-docker.pkg.dev/thiernew/crm/crm-api:$TAG --region europe-west1`
  - (Premier déploiement complet : voir section 5)
9. Vérifier santé & version (voir section 14)
10. Créer tag Git si OK : `git tag -a vX.Y.Z -m "Release"; git push --tags`

Checklist rapide (mémo) : secrets OK → build → job update → job execute → deploy service → health → tag.

---

## 14. Validation de Version & Diagnostics

Objectif : garantir que la révision servie correspond bien à l'image attendue.

1. Récupérer l'URL du service :
  - `gcloud run services describe crm-api --region europe-west1 --format 'value(status.url)'`
2. Obtenir la révision active + image :
  - `gcloud run services describe crm-api --region europe-west1 --format 'yaml(status.traffic,status.latestCreatedRevisionName, spec.template.spec.containers)'`
3. Vérifier digest réel dans Artifact Registry :
  - `gcloud artifacts docker images list europe-west1-docker.pkg.dev/thiernew/crm/crm-api --format 'table(DIGEST,IMAGE_TAGS,UPDATE_TIME)' | findstr <short_sha>`
4. Health endpoints :
  - `curl https://api.2thier.be/api/health`
  - `curl https://api.2thier.be/api/debug/static-status`
5. Valider frontend servi :
  - `curl -I https://app.2thier.be/` (Status 200 + cache headers)
6. Diff rapide config vs attente :
  - `gcloud run services describe crm-api --region europe-west1 --format json > current.json`
  - Comparer `current.json` dans Git (port, env, secrets).
7. Logs récents d'erreurs :
  - `gcloud logs read --region europe-west1 --service crm-api --limit=50 --severity=ERROR`

Résultat attendu minimal : health OK, `distExists:true`, image tag/digest = celui tout juste construit.

---

## 15. Causes d'Incohérence de Version & Correctifs

| Symptom | Cause Probable | Correctif |
|---------|----------------|-----------|
| Code ancien encore servi | Build image a échoué mais ancien digest reste | Vérifier logs Cloud Build; reconstruire puis redeploy `services update` |
| Frontend non mis à jour | Cache navigateur ou build raté avant copy `dist` | Forcer reload + invalider; vérifier étape `npm run build` dans Dockerfile |
| Migrations non appliquées | Job non exécuté / échec silencieux | `gcloud run jobs executions list --job crm-prisma-migrate` puis relancer |
| Endpoint health 500 | Variable d'env secrète invalide / manquante | Contrôler `--set-secrets`, droits Secret Manager |
| Erreur connexion DB intermittent | Socket Cloud SQL manquant ou instance suspendue | Vérifier flag `--add-cloudsql-instances` & état Cloud SQL |
| CSP bloque scripts | Régression config Helmet | Ajouter nonce ou `'unsafe-inline'` provisoire puis corriger |
| /api/auth/me vide | Pas d'utilisateur seedé | Insérer superadmin ou adapter route temporaire |

Diagnostic rapide :
1. `gcloud run services describe crm-api ...` (image/digest)
2. `gcloud run jobs executions list ...` (migrations)
3. Logs ERROR
4. `curl /api/debug/static-status`
5. Artifact digest vs tag.

---

## 16. Script d'Automatisation (PowerShell) (Optionnel)

Un script proposé : `scripts/deploy.ps1` (créé si absent).

Fonctions :
1. Calcule tag (date + short sha)
2. Lance Cloud Build (ou local Docker si `-Local`)
3. Met à jour job migrations + exécution
4. Met à jour service avec nouvelle image
5. Vérifie health endpoints
6. Affiche résumé final.

Utilisation :
```powershell
pwsh ./scripts/deploy.ps1 -Project thiernew -Region europe-west1 -Service crm-api -Repo crm -ImageName crm-api [-Local] [-SkipMigrations] [-DryRun]
```

Sorties :
- Tag + digest
- URL service + statut santé
- Exécution migrations (SKIPPED/OK)

---

## 17. Bonnes Pratiques Release & Rollback

1. Tags immuables : toujours nouveau tag (date+sha) – ne pas écraser un ancien.
2. `latest` optionnel, jamais source de vérité.
3. Rollback = réassigner trafic vers révision antérieure (zéro rebuild) :
  - `gcloud run revisions list --service crm-api --region europe-west1`
  - `gcloud run services update-traffic crm-api --to-revisions <rev>=100 --region europe-west1`
4. Historiser les versions : ajouter entrée CHANGELOG (diff courte + lien commit).
5. Bloquer merge direct sur `main` (PR obligatoire) pour garder pipeline cohérent.
6. Ajouter contrôle futur : test curl health depuis GitHub Action + fail si non 200.
7. Préparer nettoyage : supprimer images orphelines > 30 jours (policy Artifact Registry).

---

Fin annexes détaillées.
