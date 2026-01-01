# 🔍 Diagnostic OAuth - Google Cloud Console

## ❌ Erreur Actuelle

```
Error: invalid_client
Status: 401 Unauthorized
Redirect URI utilisé: https://app.2thier.be/api/google-auth/callback ✅
Client ID: 864558991714-mopce4eqh12qai0bs4qqkn9ag2je01tj ✅
Client Secret: GOCSPX--BTGgQoQE_6Fk...mPDp ✅
```

**Tous les credentials backend sont CORRECTS**, le problème vient de la **configuration Google Cloud Console**.

---

## 🎯 VÉRIFICATIONS À FAIRE (PAR TOI)

### 1️⃣ Vérifier les URIs de Redirection Autorisés

Va sur: **https://console.cloud.google.com/apis/credentials?project=thiernew**

1. Clique sur le client OAuth: `864558991714-mopce4eqh12qai0bs4qqkn9ag2je01tj`
2. Dans la section **"URIs de redirection autorisés"**, vérifie qu'il y a:

```
✅ https://app.2thier.be/api/google-auth/callback
✅ http://localhost:4000/api/google-auth/callback (optionnel, pour dev local)
```

**⚠️ SI CES URIs NE SONT PAS LÀ → C'EST ÇA LE PROBLÈME !**

### 2️⃣ Vérifier l'Écran de Consentement OAuth

Va sur: **https://console.cloud.google.com/apis/credentials/consent?project=thiernew**

Vérifie:
- **État de publication**: Doit être `En production` (PAS `Test`)
- **Si en "Test"**: Vérifie que `jonathan.dethier@2thier.be` est dans les "Utilisateurs test"

**⚠️ Si l'app est en mode Test et que ton email n'est pas dans la liste → C'EST ÇA LE PROBLÈME !**

### 3️⃣ Vérifier le Type de Client

Dans la page du client OAuth `864558991714-mopce4eqh12qai0bs4qqkn9ag2je01tj`:
- **Type d'application**: Doit être `Application Web` ✅

---

## 🔧 SOLUTIONS POSSIBLES

### Solution A: URIs de Redirection Manquants

Si les URIs ne sont pas là:
1. Clique sur "Modifier" sur le client OAuth
2. Ajoute dans "URIs de redirection autorisés":
   ```
   https://app.2thier.be/api/google-auth/callback
   ```
3. Sauvegarde

### Solution B: App en Mode Test

Si l'app est en mode "Test":

**Option 1: Ajouter comme utilisateur test**
1. Va dans "OAuth consent screen"
2. Clique sur "Add users" dans la section "Test users"
3. Ajoute: `jonathan.dethier@2thier.be`
4. Sauvegarde

**Option 2: Publier l'app en Production (RECOMMANDÉ)**
1. Va dans "OAuth consent screen"
2. Clique sur "Publish app"
3. Confirme la publication

---

## 📊 Ce que j'ai vérifié (via API)

✅ **Backend Code**: Utilise bien `config.redirectUri` depuis la BDD  
✅ **Base de données**: `redirectUri = https://app.2thier.be/api/google-auth/callback`  
✅ **Secrets Cloud Run**: Client ID et Secret identiques au local  
✅ **Logs production**: Confirme que le bon `redirect_uri` est utilisé  
❌ **Google Console**: IMPOSSIBLE de vérifier via API (protégé par Google)

---

## 🚨 ACTION IMMÉDIATE

1. **Ouvre**: https://console.cloud.google.com/apis/credentials?project=thiernew
2. **Clique** sur: `864558991714-mopce4eqh12qai0bs4qqkn9ag2je01tj`
3. **Vérifie** les URIs de redirection
4. **Copie-colle** ici ce que tu vois dans "URIs de redirection autorisés"

Ensuite je pourrai te dire exactement quoi corriger ! 🎯
