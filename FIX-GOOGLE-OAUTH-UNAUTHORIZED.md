# 🔧 Correction du Problème d'Authentification Google OAuth

## 🎯 Problème Identifié

**Symptôme :** Erreur intermittente `unauthorized_client` lors de la connexion Google sur **app.2thier.be**

**Cause racine :** Le code utilisait DEUX sources différentes pour le `redirectUri` :
1. **`googleOAuthConfig.redirectUri`** - Auto-détecté depuis les variables d'environnement
2. **`config.redirectUri`** - Stocké dans la base de données (`googleWorkspaceConfig`)

### Pourquoi c'était intermittent ?

Le `redirectUri` devait correspondre EXACTEMENT à celui configuré dans Google Cloud Console. Lorsque le code utilisait `googleOAuthConfig.redirectUri`, il générait parfois un URI différent de celui en BDD, causant l'erreur `unauthorized_client`.

## ✅ Solution Appliquée

### 1. Modifications du Code Backend

**Fichier :** `src/routes/google-auth.ts`

**Changements :**
- ❌ AVANT : Utilisation de `googleOAuthConfig.redirectUri` (auto-détecté)
- ✅ APRÈS : Utilisation de `config.redirectUri` (depuis la BDD)

**3 endroits corrigés :**
1. Route `/api/google-auth/url` - Génération de l'URL d'authentification
2. Route `/api/google-auth/connect` - Connexion Google Workspace  
3. Route `/api/google-auth/callback` - Échange du code contre les tokens

### 2. Configuration Cloud Run

**Variables d'environnement Cloud Run :**
- ✅ **RETIRÉ** : `GOOGLE_REDIRECT_URI` (n'est plus utilisé par le code)
- ✅ Le `redirectUri` est maintenant lu depuis la BDD (`googleWorkspaceConfig`)

**Commande de déploiement mise à jour :**
```bash
gcloud run deploy crm-api \
  --set-env-vars "NODE_ENV=production,PGHOST=/cloudsql/...,FRONTEND_URL=https://app.2thier.be,BACKEND_URL=https://app.2thier.be" \
  # GOOGLE_REDIRECT_URI a été retiré ✅
```

### 3. Configuration dans Google Cloud Console

**URIs de redirection autorisés :**
```
https://app.2thier.be/api/google-auth/callback
http://localhost:4000/api/google-auth/callback
https://obscure-fiesta-449695jwwrv3qxg4-4000.app.github.dev/api/google-auth/callback
```

Ces URIs doivent correspondre à ceux stockés dans la table `googleWorkspaceConfig` de la BDD.

## 🔄 Flux OAuth Corrigé

```
1. Utilisateur clique "Se connecter avec Google"
   ↓
2. Backend génère URL OAuth avec config.redirectUri (depuis BDD)
   ↓
3. Google redirige vers: https://app.2thier.be/api/google-auth/callback?code=xxx
   ↓
4. Backend échange le code contre des tokens avec config.redirectUri (depuis BDD)
   ↓
5. Backend sauvegarde les tokens en BDD
   ↓
6. Backend redirige vers: https://app.2thier.be/auth/google/callback?google_success=1
   ↓
7. Frontend affiche "Authentification réussie"
```

## 📊 Vérification de la Configuration

### Vérifier la config en BDD

```sql
SELECT "organizationId", "redirectUri", "adminEmail", "isActive" 
FROM "googleWorkspaceConfig";
```

**Résultat attendu :**
```
organizationId | redirectUri                                    | adminEmail              | isActive
---------------|------------------------------------------------|-------------------------|----------
org-xxx-123    | https://app.2thier.be/api/google-auth/callback | admin@2thier.be         | true
```

### Vérifier les logs du backend

```bash
gcloud logging read "resource.type=cloud_run_revision AND textPayload=~'Redirect URI'" \
  --project thiernew --limit 10
```

**Log attendu :**
```
[GOOGLE-AUTH] 🎯 Redirect URI depuis BDD: https://app.2thier.be/api/google-auth/callback
```

## 🚀 Déploiement de la Correction

### 1. Build et test local

```bash
npm run build
npm run start
```

### 2. Commit et push

```bash
git add src/routes/google-auth.ts CONNECTION-GENERALE.md
git commit -m "fix: utiliser config.redirectUri (BDD) au lieu de googleOAuthConfig.redirectUri"
git push origin main
```

### 3. Déploiement automatique

Le déploiement se fait automatiquement via GitHub Actions après le push sur `main`.

### 4. Mise à jour de la variable d'environnement Cloud Run

```bash
# Retirer GOOGLE_REDIRECT_URI de Cloud Run (optionnel, pas utilisé par le nouveau code)
gcloud run services update crm-api \
  --region europe-west1 \
  --project thiernew \
  --remove-env-vars GOOGLE_REDIRECT_URI
```

## ✅ Tests de Validation

### Test 1 : Connexion Google en Production

1. Aller sur https://app.2thier.be
2. Cliquer sur "Se connecter avec Google"
3. Autoriser l'accès
4. ✅ Devrait fonctionner à chaque fois (plus d'erreur intermittente)

### Test 2 : Vérifier les logs

```bash
gcloud logging read "resource.type=cloud_run_revision AND textPayload=~'GOOGLE-AUTH'" \
  --project thiernew --limit 20 --format="table(timestamp,textPayload)"
```

**Logs attendus :**
```
[GOOGLE-AUTH] 🎯 Redirect URI depuis BDD: https://app.2thier.be/api/google-auth/callback
[GOOGLE-AUTH] ✅ Tokens reçus
[GOOGLE-AUTH] ✅ Connexion Google validée
[GOOGLE-AUTH] 🎉 Authentification Google complète avec succès !
```

## 📝 Notes Importantes

1. **Le `redirectUri` est maintenant géré par la BDD**, pas par les variables d'environnement
2. **Chaque organisation** peut avoir son propre `redirectUri` dans `googleWorkspaceConfig`
3. **Pour Codespaces**, mettre à jour le `redirectUri` en BDD avec l'URL Codespaces actuelle
4. **Pour le local**, utiliser `http://localhost:4000/api/google-auth/callback`

## 🔗 Fichiers Modifiés

- ✅ `src/routes/google-auth.ts` - 3 corrections pour utiliser `config.redirectUri`
- ✅ `CONNECTION-GENERALE.md` - Commande de déploiement mise à jour

---

*Correction appliquée le 1er janvier 2026*
