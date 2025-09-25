# 🔐 SYSTÈME D'AUTHENTIFICATION GOOGLE CENTRALISÉ

## 📋 RÈGLE D'OR : LES NOUVELLES PAGES S'ADAPTENT AU SYSTÈME, PAS L'INVERSE !

> ⚠️ **ATTENTION** : Ce système d'authentification est **SANCTUARISÉ**. Toute nouvelle page Google DOIT s'adapter à cette architecture. **NE JAMAIS MODIFIER LE CORE** pour accommoder une nouvelle fonctionnalité !

---

## 🏗️ ARCHITECTURE DU SYSTÈME

```
src/google-auth/
├── core/                    # ⚡ CŒUR DU SYSTÈME (NE PAS TOUCHER)
│   ├── GoogleAuthManager.ts # Singleton d'authentification
│   └── GoogleOAuthCore.ts   # Logique OAuth centralisée
├── services/                # 📦 SERVICES GOOGLE (EXEMPLES À SUIVRE)
│   ├── GoogleCalendarService.ts
│   ├── GoogleGmailService.ts
│   └── [VotreNouveauService.ts]
├── controllers/             # 🎮 CONTRÔLEURS EXPRESS
│   ├── CalendarController.ts
│   ├── GmailController.ts
│   └── [VotreNouveauController.ts]
├── routes/                  # 🛣️ ROUTES EXPRESS
│   ├── googleAuthRoutes.ts
│   └── [vosNouvellesRoutes.ts]
├── types/                   # 📝 TYPES TYPESCRIPT
│   └── GoogleAuthTypes.ts
└── index.ts                 # 📤 EXPORTS CENTRALISÉS
```

---

## 🚀 COMMENT CRÉER UNE NOUVELLE PAGE GOOGLE

### 1️⃣ **CRÉER UN NOUVEAU SERVICE**

Copiez le modèle de `GoogleGmailService.ts` :

```typescript
// src/google-auth/services/GoogleVotreService.ts

import { google, [votre_api]_v1 } from 'googleapis';
import { googleAuthManager } from '../core/GoogleAuthManager';

export class GoogleVotreService {
  private votreApi: [votre_api]_v1.[VotreApi];

  constructor(votreApi: [votre_api]_v1.[VotreApi]) {
    this.votreApi = votreApi;
  }

  /**
   * OBLIGATOIRE : Méthode statique de création
   */
  static async create(organizationId: string): Promise<GoogleVotreService | null> {
    console.log(`[GoogleVotreService] Création du service pour l'organisation: ${organizationId}`);
    
    // ⚡ UTILISER LE MANAGER CENTRALISÉ (JAMAIS D'AUTHENTIFICATION DIRECTE)
    const authClient = await googleAuthManager.getAuthenticatedClient(organizationId);
    if (!authClient) {
      console.error(`[GoogleVotreService] Impossible d'obtenir le client authentifié pour l'organisation: ${organizationId}`);
      return null;
    }

    const votreApi = google.[votre_api]({ version: 'v1', auth: authClient });
    return new GoogleVotreService(votreApi);
  }

  // ✅ VOS MÉTHODES ICI
  async votreMethode(): Promise<any> {
    try {
      const response = await this.votreApi.users.[quelque_chose].list({
        // vos paramètres
      });
      return response.data;
    } catch (error) {
      console.error('[GoogleVotreService] Erreur:', error);
      throw error;
    }
  }
}
```

### 2️⃣ **CRÉER UN CONTRÔLEUR EXPRESS**

Copiez le modèle de `GmailController.ts` :

```typescript
// src/google-auth/controllers/VotreController.ts

import { Request, Response } from 'express';
import { GoogleVotreService } from '../services/GoogleVotreService';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    organizationId?: string;
  };
}

export const votreMethodeController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // ⚡ RÉCUPÉRATION DE L'ORGANIZATION ID DEPUIS LES HEADERS
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID manquant' });
    }

    // ⚡ CRÉATION DU SERVICE AVEC L'ORGANIZATION ID
    const votreService = await GoogleVotreService.create(organizationId);
    if (!votreService) {
      return res.status(500).json({ error: 'Impossible de créer le service' });
    }

    // ✅ UTILISATION DU SERVICE
    const result = await votreService.votreMethode();
    
    // ⚡ RETOUR DIRECT DES DONNÉES (COMPATIBILITÉ FRONTEND)
    res.json(result);
  } catch (error) {
    console.error('[VotreController] Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
```

### 3️⃣ **CRÉER DES ROUTES EXPRESS**

```typescript
// src/google-auth/routes/votreRoutes.ts

import express from 'express';
import { authenticateToken } from '../../middleware/auth';
import * as votreController from '../controllers/VotreController';

const router = express.Router();

// ⚡ MIDDLEWARE D'AUTHENTIFICATION OBLIGATOIRE
router.use(authenticateToken);

// ✅ VOS ROUTES
router.get('/votre-endpoint', votreController.votreMethodeController);
router.post('/votre-autre-endpoint', votreController.autreMethodeController);

export default router;
```

### 4️⃣ **AJOUTER LES EXPORTS CENTRALISÉS**

```typescript
// src/google-auth/index.ts

// ✅ AJOUTER VOS EXPORTS
export { GoogleVotreService } from './services/GoogleVotreService';
export * from './controllers/VotreController';
```

### 5️⃣ **MONTER LES ROUTES DANS LE SERVEUR PRINCIPAL**

```typescript
// src/api-server.ts

import votreRoutes from './google-auth/routes/votreRoutes';

// ✅ MONTER VOS ROUTES
app.use('/votre-api', votreRoutes);
```

---

## 🔧 FONCTIONNALITÉS AUTOMATIQUES DU SYSTÈME

### ♻️ **REFRESH AUTOMATIQUE DES TOKENS**
Le système gère automatiquement le refresh des tokens. **Vous n'avez rien à faire !**

```typescript
// Dans GoogleAuthManager.ts - DÉJÀ FAIT POUR VOUS
private async refreshTokenIfNeeded(organizationId: string): Promise<boolean> {
  // Logique de refresh automatique
  // ✅ Vérifie l'expiration
  // ✅ Refresh automatique
  // ✅ Mise à jour en base de données
}
```

### 🔒 **GESTION DES ORGANISATIONS**
Chaque appel API utilise automatiquement les bonnes credentials de l'organisation :

```typescript
// ⚡ LE SYSTÈME FAIT AUTOMATIQUEMENT :
// 1. Récupération de l'organizationId depuis les headers
// 2. Récupération des tokens Google de l'organisation
// 3. Refresh automatique si nécessaire
// 4. Client authentifié prêt à utiliser
```

### 🛡️ **PROTECTION ANTI-BOUCLE**
Le système évite les boucles d'authentification infinies avec un système de protection intégré.

---

## 📱 CÔTÉ FRONTEND : COMMENT UTILISER VOS NOUVEAUX SERVICES

### Utilisation avec `useAuthenticatedApi`

```typescript
// Dans votre composant React
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

const MonComposant = () => {
  const { api } = useAuthenticatedApi();

  const appelVotreService = async () => {
    try {
      // ⚡ L'organization ID est automatiquement ajouté dans les headers
      const response = await api.get('/votre-api/votre-endpoint');
      console.log('Données reçues:', response);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  return (
    <button onClick={appelVotreService}>
      Appeler votre service
    </button>
  );
};
```

---

## ⚠️ RÈGLES CRITIQUES À RESPECTER

### ❌ **CE QU'IL NE FAUT JAMAIS FAIRE**

1. **Ne jamais créer votre propre système d'authentification Google**
2. **Ne jamais utiliser `fetch` ou `axios` directement pour les API Google**
3. **Ne jamais modifier les fichiers dans `core/`**
4. **Ne jamais stocker les tokens dans le localStorage/sessionStorage**
5. **Ne jamais faire d'authentification OAuth directe dans vos composants**

### ✅ **CE QU'IL FAUT TOUJOURS FAIRE**

1. **Utiliser `GoogleAuthManager.getAuthenticatedClient(organizationId)`**
2. **Créer un service dans `services/` suivant le modèle**
3. **Récupérer `organizationId` depuis `req.headers['x-organization-id']`**
4. **Utiliser `useAuthenticatedApi` côté frontend**
5. **Suivre le pattern de création de service avec `static async create()`**

---

## 🧪 TESTS ET VALIDATION

### Comment tester votre nouveau service :

```typescript
// Test rapide dans le contrôleur
console.log(`[VotreService] Test avec l'organisation: ${organizationId}`);
console.log(`[VotreService] Client authentifié obtenu:`, !!authClient);
console.log(`[VotreService] Réponse API:`, response);
```

### Vérifications côté frontend :

```typescript
// Dans la console développeur
console.log('[Frontend] Headers envoyés:', {
  'x-organization-id': organizationId
});
console.log('[Frontend] Réponse API:', response);
```

---

## 🚨 EN CAS DE PROBLÈME

### 1. **Service ne se connecte pas**
- Vérifiez que vous utilisez `googleAuthManager.getAuthenticatedClient(organizationId)`
- Vérifiez que `organizationId` n'est pas undefined
- Regardez les logs serveur pour les erreurs d'authentification

### 2. **Frontend ne reçoit pas de données**
- Vérifiez que vous utilisez `useAuthenticatedApi`
- Vérifiez que l'organization ID est bien défini dans le contexte
- Vérifiez le format de retour de votre contrôleur

### 3. **Tokens expirés**
- Le refresh est automatique, mais vérifiez les logs
- Si problème persistant, contactez l'équipe core

---

## 📞 SUPPORT

En cas de problème avec l'intégration :

1. **Consultez d'abord les services existants** (`GoogleGmailService`, `GoogleCalendarService`)
2. **Suivez exactement les patterns établis**
3. **Ne modifiez jamais le core**
4. **Testez étape par étape**

---

## 🎯 RÉSUMÉ POUR LES PRESSÉS

```typescript
// 1. Créer le service
const service = await GoogleVotreService.create(organizationId);

// 2. Utiliser le service
const result = await service.votreMethode();

// 3. Retourner les données
res.json(result);

// 4. Frontend utilise useAuthenticatedApi
const { api } = useAuthenticatedApi();
const response = await api.get('/votre-endpoint');
```

**POINT FINAL : ADAPTEZ-VOUS AU SYSTÈME, NE MODIFIEZ PAS LE SYSTÈME !** 🔒
