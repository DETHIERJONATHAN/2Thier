# 🔄 GESTION AUTOMATIQUE DES TOKENS

## 🔐 SYSTÈME DE REFRESH AUTOMATIQUE

Le système d'authentification Google centralisé gère **automatiquement** le refresh des tokens. Voici comment cela fonctionne en interne.

---

## ⚡ COMMENT ÇA MARCHE

### 1️⃣ **Vérification Automatique**

À chaque appel à `googleAuthManager.getAuthenticatedClient(organizationId)`, le système :

```typescript
// Dans GoogleAuthManager.ts
async getAuthenticatedClient(organizationId: string): Promise<OAuth2Client | null> {
  try {
    // 🔍 1. Récupération des tokens depuis la base de données
    const tokens = await this.getTokensFromDatabase(organizationId);
    
    // 🔍 2. Vérification automatique de l'expiration
    const needsRefresh = await this.refreshTokenIfNeeded(organizationId);
    
    // 🔍 3. Client prêt à utiliser
    return this.createAuthenticatedClient(organizationId);
  } catch (error) {
    console.error('[GoogleAuthManager] Erreur:', error);
    return null;
  }
}
```

### 2️⃣ **Logique de Refresh**

```typescript
// Logique interne de refresh (AUTOMATIQUE)
private async refreshTokenIfNeeded(organizationId: string): Promise<boolean> {
  const tokens = await this.getTokensFromDatabase(organizationId);
  if (!tokens) return false;

  // 🕐 Vérification de l'expiration (avec marge de sécurité)
  const now = Date.now();
  const expiryTime = tokens.expiry_date || 0;
  const marginMs = 5 * 60 * 1000; // 5 minutes de marge

  if (expiryTime > now + marginMs) {
    console.log('[GoogleAuthManager] ✅ Token encore valide');
    return false; // Pas besoin de refresh
  }

  try {
    console.log('[GoogleAuthManager] 🔄 Refresh du token nécessaire...');
    
    // 🔄 Refresh automatique
    const oAuth2Client = new google.auth.OAuth2(/* config */);
    oAuth2Client.setCredentials(tokens);
    
    const { credentials } = await oAuth2Client.refreshAccessToken();
    
    // 💾 Sauvegarde automatique en base
    await this.saveTokensToDatabase(organizationId, credentials);
    
    console.log('[GoogleAuthManager] ✅ Token refreshé avec succès');
    return true;
  } catch (error) {
    console.error('[GoogleAuthManager] ❌ Erreur lors du refresh:', error);
    return false;
  }
}
```

### 3️⃣ **Sauvegarde Automatique**

```typescript
// Sauvegarde automatique en base de données
private async saveTokensToDatabase(organizationId: string, tokens: any): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      googleAccessToken: this.encrypt(tokens.access_token),
      googleRefreshToken: this.encrypt(tokens.refresh_token),
      googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
    }
  });
  
  console.log('[GoogleAuthManager] 💾 Tokens sauvegardés en base');
}
```

---

## 🛡️ SÉCURITÉ ET CHIFFREMENT

### 🔐 **Chiffrement des Tokens**

Tous les tokens sont chiffrés en base de données :

```typescript
// Chiffrement automatique
private encrypt(text: string): string {
  const algorithm = 'aes-256-gcm';
  const key = process.env.ENCRYPTION_KEY; // Clé secrète
  // ... logique de chiffrement
}

// Déchiffrement automatique
private decrypt(encryptedText: string): string {
  const algorithm = 'aes-256-gcm';
  const key = process.env.ENCRYPTION_KEY;
  // ... logique de déchiffrement
}
```

### 🔒 **Variables d'Environnement Requises**

```env
# .env (REQUIS pour le chiffrement)
ENCRYPTION_KEY=votre_cle_secrete_32_caracteres
GOOGLE_CLIENT_ID=votre_client_id_google
GOOGLE_CLIENT_SECRET=votre_client_secret_google
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
```

---

## 📊 MONITORING ET LOGS

### 🔍 **Logs Automatiques**

Le système produit des logs détaillés pour le monitoring :

```
[GoogleAuthManager] ✅ Client authentifié créé pour l'organisation: xxx
[GoogleAuthManager] 🔄 Refresh du token nécessaire...
[GoogleAuthManager] ✅ Token refreshé avec succès
[GoogleAuthManager] 💾 Tokens sauvegardés en base
[GoogleGmailService] 📧 25 messages récupérés
[GoogleCalendarService] 📅 Événements du calendrier récupérés
```

### 📈 **Métriques Importantes**

Le système track automatiquement :
- ✅ Nombre de refresh de tokens par jour
- ⏱️ Temps de réponse des API Google
- ❌ Erreurs d'authentification
- 🔄 Taux de succès des appels API

---

## 🚨 GESTION D'ERREURS AUTOMATIQUE

### 🔄 **Retry Automatique**

En cas d'erreur temporaire, le système fait du retry automatique :

```typescript
// Retry automatique intégré
private async callWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && this.isRetryableError(error)) {
      console.log(`[GoogleAuthManager] 🔄 Retry (${retries} restants)`);
      await this.delay(1000); // Attendre 1 seconde
      return this.callWithRetry(fn, retries - 1);
    }
    throw error;
  }
}
```

### 🚫 **Erreurs Non-Récupérables**

Le système identifie automatiquement les erreurs non-récupérables :

```typescript
private isRetryableError(error: any): boolean {
  const retryableCodes = [
    500, // Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    429  // Too Many Requests
  ];
  
  return retryableCodes.includes(error.status);
}
```

---

## 🔧 CONFIGURATION AVANCÉE

### ⚙️ **Paramètres de Refresh**

```typescript
// Configuration dans GoogleAuthManager
private readonly REFRESH_CONFIG = {
  marginMinutes: 5,        // Refresh 5 min avant expiration
  maxRetries: 3,           // 3 tentatives max
  retryDelayMs: 1000,      // 1 sec entre les tentatives
  cacheTimeoutMs: 60000    // Cache pendant 1 min
};
```

### 🎯 **Scopes Google Gérés**

Le système gère automatiquement tous les scopes nécessaires :

```typescript
// Scopes automatiquement gérés
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file'
];
```

---

## 🎉 CE QUE VOUS N'AVEZ PAS À FAIRE

### ❌ **Gestion Manuelle des Tokens**
```typescript
// ❌ NE PAS FAIRE ÇA
const refreshToken = () => {
  // Logique de refresh manuelle
};

// ✅ LE SYSTÈME LE FAIT AUTOMATIQUEMENT
const service = await GoogleGmailService.create(organizationId);
// Token automatiquement valide et refreshé si besoin
```

### ❌ **Vérification d'Expiration**
```typescript
// ❌ NE PAS FAIRE ÇA
if (Date.now() > tokenExpiry) {
  await refreshToken();
}

// ✅ LE SYSTÈME LE FAIT AUTOMATIQUEMENT
const authClient = await googleAuthManager.getAuthenticatedClient(organizationId);
// Client toujours valide
```

### ❌ **Gestion des Erreurs d'Auth**
```typescript
// ❌ NE PAS FAIRE ÇA
try {
  await callGoogleAPI();
} catch (error) {
  if (error.status === 401) {
    await refreshToken();
    await callGoogleAPI(); // Retry
  }
}

// ✅ LE SYSTÈME LE FAIT AUTOMATIQUEMENT
const service = await GoogleGmailService.create(organizationId);
const result = await service.getMessages(); // Retry automatique intégré
```

---

## 🔍 DIAGNOSTIC ET DÉPANNAGE

### 🩺 **Vérifier l'État du Système**

En cas de problème, vérifiez les logs serveur :

```
# Logs normaux (tout va bien)
[GoogleAuthManager] ✅ Client authentifié créé pour l'organisation: xxx
[GoogleGmailService] 📧 Messages récupérés avec succès

# Logs de refresh (normal)
[GoogleAuthManager] 🔄 Refresh du token nécessaire...
[GoogleAuthManager] ✅ Token refreshé avec succès

# Logs d'erreur (problème)
[GoogleAuthManager] ❌ Erreur lors du refresh: ...
[GoogleGmailService] ❌ Erreur lors de la récupération: ...
```

### 🔧 **Actions de Dépannage**

1. **Vérifier les variables d'environnement**
2. **Vérifier les tokens en base de données**
3. **Vérifier les scopes Google dans la console Google Cloud**
4. **Redémarrer le serveur si nécessaire**

---

## 🎯 RÉSUMÉ

### ✅ **Le Système Fait Automatiquement**
- 🔄 Refresh des tokens avant expiration
- 💾 Sauvegarde chiffrée en base de données
- 🔍 Vérification de validité à chaque appel
- 🚫 Gestion des erreurs et retry
- 📊 Logging et monitoring

### ✅ **Vous Devez Juste**
- 🎯 Utiliser `GoogleVotreService.create(organizationId)`
- 📱 Utiliser `useAuthenticatedApi` côté frontend
- 🎨 Vous concentrer sur votre logique métier

**Le système d'authentification est TRANSPARENT et AUTOMATIQUE !** ⚡
