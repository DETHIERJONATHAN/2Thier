# Architecture d'Authentification et d'Autorisation

Ce document décrit l'architecture du système d'authentification et d'autorisation centralisé du CRM.

## 🔐 Configuration Google OAuth

### Fichier `googleConfig.ts`

Configuration centralisée pour Google OAuth depuis les variables d'environnement.

**⚠️ USAGE CRITIQUE :**

#### ✅ UTILISER `googleOAuthConfig` pour :
- Services système sans contexte d'organisation
- Scripts d'administration et maintenance
- Refresh automatique de tokens
- Notifications Gmail système

#### ❌ NE PAS UTILISER `googleOAuthConfig.redirectUri` pour :
- Routes OAuth (`/api/google-auth/*`) → Utiliser `config.redirectUri` (BDD)
- Génération d'URL d'autorisation Google
- Échange de code OAuth contre tokens

**Pourquoi ?** Chaque organisation a sa propre configuration OAuth en BDD. Le `redirectUri` DOIT correspondre EXACTEMENT à celui configuré dans Google Cloud Console. `googleOAuthConfig.redirectUri` est auto-détecté et peut varier.

**Documentation complète :** Voir `FIX-GOOGLE-OAUTH-UNAUTHORIZED.md` pour l'explication du problème résolu en janvier 2026.

---

## 1. Philosophie et Objectifs

L'approche adoptée est celle d'une **architecture modulaire et centralisée**. L'objectif est de fournir une "source unique de vérité" pour tout ce qui concerne l'identité de l'utilisateur, ses droits, ses rôles et son contexte organisationnel.

- **Centralisation :** Toute la logique liée à l'utilisateur connecté est gérée au sein du module `src/auth`. Cela inclut la récupération des données, la gestion de l'état, et l'exposition des informations et des actions.
- **Modularité :** Le dossier `src/auth` est conçu comme une "feature" autonome. Il contient tous les hooks, types, contextes et appels API nécessaires à son fonctionnement, le rendant découplé du reste de l'application.
- **Scalabilité et Maintenabilité :** En isolant cette logique critique, nous facilitons les futures évolutions (ex: ajout d'une authentification double facteur), le débogage et l'intégration de nouveaux développeurs.

## 2. Structure du Dossier `src/auth`

- **`AuthProvider.tsx` :** Le cœur du système. Ce composant est un Provider React qui englobe l'application. Il est responsable de :
    - Stocker l'état de l'utilisateur, de l'organisation sélectionnée, des permissions, etc.
    - Gérer le cycle de vie de la session (login, logout, refresh).
    - Gérer la logique d'usurpation d'identité (impersonation).
    - Exposer toutes les données et méthodes nécessaires via un Contexte React.

- **`useAuth.ts` :** Le point d'entrée pour les composants. C'est un hook custom qui permet à n'importe quel composant de l'application d'accéder facilement et de manière sécurisée aux informations du contexte d'authentification. C'est le **seul moyen** autorisé pour interagir avec l'état de l'utilisateur.

- **`authApi.ts` :** (Conceptuel, peut être intégré ailleurs) Centralise les appels API spécifiques à l'authentification (`/login`, `/me`, `/logout`, etc.).

- **`googleConfig.ts` :** Point d'entrée unique pour la configuration Google OAuth/Workspace (client ID, secret, redirect URI, project ID, scopes). À utiliser par tout service nécessitant l'écosystème Google.

- **Fichiers de Types (`user.ts`, `role.ts`, `permissions.ts`, etc.) :** Définissent les structures de données (interfaces TypeScript) pour garantir la cohérence et la robustesse du code.

## 3. Comment l'utiliser ?

Dans n'importe quel composant ou page qui a besoin de connaître l'utilisateur ou de vérifier une permission, il suffit d'utiliser le hook `useAuth`.

### Exemple :

```tsx
import { useAuth } from '@/auth/useAuth';

const MaPage = () => {
  const { user, can, currentOrganization } = useAuth();

  if (!user) {
    return <div>Chargement...</div>;
  }

  return (
    <div>
      <h1>Bonjour, {user.firstName} !</h1>
      <p>Vous travaillez pour {currentOrganization?.name}.</p>

      {can('lead:create') && (
        <button>Créer un nouveau prospect</button>
      )}
    </div>
  );
}
```

## 4. Avantages de cette approche

- **Sécurité :** La logique de permission est centralisée et non dupliquée, réduisant le risque d'erreurs.
- **Clarté :** Le code des composants est plus simple et plus lisible. Il se concentre sur l'affichage et délègue la logique d'autorisation au hook `useAuth`.
- **Performance :** En utilisant `useMemo` et des sélecteurs fins dans le provider, on évite des re-rendus inutiles de l'application.
- **Testabilité :** Il est plus facile de tester les composants en "mockant" le retour du hook `useAuth` pour simuler différents types d'utilisateurs et de permissions.

## 5. Ressources complémentaires

- [docs/google-oauth-config.md](../../docs/google-oauth-config.md) — checklist pour synchroniser la configuration Google OAuth entre le local, Cloud Run et l'Admin Console Workspace.
