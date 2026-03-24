# Guide pour l'agent IA - Développement de Zhiive (The Hive)

Ce guide contient les conventions et l'architecture essentielles pour développer efficacement sur Zhiive.

**IDENTITÉ** : Zhiive n'est PAS un CRM, PAS un ERP, PAS un réseau social. C'est un **Hive** (une Ruche). NE JAMAIS utiliser "CRM", "ERP", "réseau social" dans l'UI visible par l'utilisateur. Voir le lexique complet dans `/memories/repo/zhiive-hive-lexicon.md`.

## 1. Architecture Générale

L'application est un monorepo qui contient :
- Un **frontend React** (Vite, TypeScript, Ant Design, Tailwind CSS) dans `src/`.
- Un **serveur API Node.js** (Express) défini dans `src/api-server-clean.ts`.
- Une **base de données PostgreSQL sur Google Cloud SQL**, accédée via une couche d'abstraction dans `src/lib/database.ts`.

Le flux de données typique est : Composant React -> Hook `useAuthenticatedApi` -> Serveur API -> Database Layer (`db`) -> Base de données.

## 2. Conventions Critiques

### 🎯 Accès à la Base de Données (CRITIQUE)
**NE JAMAIS** créer `new PrismaClient()` directement. **TOUJOURS** utiliser le singleton `db` depuis la couche d'abstraction.

```typescript
// ✅ BONNE PRATIQUE
import { db } from '@/lib/database';
// ou
import { db } from '../lib/database';

const users = await db.user.findMany();
const user = await db.user.findUnique({ where: { id } });

// ❌ INTERDIT - Provoque des fuites mémoire et des crashs SIGSEGV !
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient(); // NE JAMAIS FAIRE ÇA !
```

**Fichier clé :** `src/lib/database.ts` - Point d'entrée unique pour tous les accès DB.

**Pourquoi ?** Chaque `new PrismaClient()` ouvre de nouvelles connexions. En production avec beaucoup de requêtes concurrentes, cela épuise le pool de connexions et provoque des crashs SIGSEGV.

### Appels API Authentifiés
**NE PAS** utiliser `fetch` ou `axios` directement. **TOUJOURS** utiliser le hook `useAuthenticatedApi` pour toutes les communications avec le backend. Il gère l'authentification et la configuration de l'organisation automatiquement.

*Exemple d'utilisation :*
```typescript
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

const MonComposant = () => {
  const { api } = useAuthenticatedApi();

  const fetchData = async () => {
    // GET
    const data = await api.get('/mon-endpoint');
    // POST
    await api.post('/mon-endpoint', { key: 'value' });
  };
  // ...
}
```
- **Fichier clé :** `src/hooks/useAuthenticatedApi.ts`

### Gestion de l'état et de l'authentification
L'état de l'utilisateur et les informations d'authentification sont gérés via le hook `useAuth`. Utilisez ce hook pour accéder aux informations de l'utilisateur connecté (`user`), à ses permissions et aux modules actifs.

*Exemple d'utilisation :*
```typescript
import { useAuth } from '../auth/useAuth';

const { user, modules } = useAuth();
```
- **Fichier clé :** `src/auth/useAuth.ts`

### Stabilité des hooks et des rendus
Les composants React sont sensibles aux boucles de rendu infinies si les dépendances des hooks (`useEffect`, `useCallback`) ne sont pas stables.
- **TOUJOURS** stabiliser les instances d'API et les fonctions complexes avec `useMemo` et `useCallback` pour éviter les re-rendus inutiles.

*Exemple de stabilisation de l'API :*
```typescript
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useMemo } from 'react';

const apiHook = useAuthenticatedApi();
const api = useMemo(() => apiHook, []); // L'instance 'api' est maintenant stable
```

### Logique métier spécifique
- **Génération d'email :** L'adresse email professionnelle d'un utilisateur suit un format strict : `prénom.nom@organisation.be`. Pour le Super Admin, l'organisation est `2thier.be`. La logique de normalisation (suppression des accents, etc.) est cruciale.
  - **Fichier de référence :** `src/pages/MailPage.tsx` contient une implémentation de référence.

### 🐝 Identité Active Centralisée (CRITIQUE)
**NE JAMAIS** recalculer `feedMode === 'org' && !!currentOrganization` localement dans un composant. **TOUJOURS** utiliser le hook centralisé `useActiveIdentity()`.

Ce système résout un problème majeur : chaque composant Zhiive (Wall, Reels, Stories, Universe, Explore) 
calculait son propre `isOrgMode` localement, causant des incohérences (posts attribués au personnel au lieu de l'organisation).

```typescript
// ✅ BONNE PRATIQUE — Source unique d'identité
import { useActiveIdentity } from '@/contexts/ActiveIdentityContext';

const { isOrgMode, publishAsOrg, displayName, avatarUrl, avatarFallback, avatarBgColor } = useActiveIdentity();

// Dans un appel API :
await api.post('/api/wall/posts', { 
  content, 
  publishAsOrg,  // ← déjà calculé correctement par le système centralisé
});

// Pour afficher l'avatar :
<Avatar src={avatarUrl} style={{ background: avatarBgColor }}>{avatarFallback}</Avatar>

// ❌ INTERDIT — Ne JAMAIS calculer localement
const isOrgMode = feedMode === 'org' && !!currentOrganization; // NE PAS FAIRE ÇA !
```

- **Fichier clé :** `src/contexts/ActiveIdentityContext.tsx` — Système centralisé d'identité
- **Provider :** Monté dans `src/pages/page2thier/MainLayoutNew.tsx` (à l'intérieur de `ZhiiveNavProvider`)
- **Composants migrés :** DashboardPageUnified, StoriesBar, ReelsPanel, UniversePanel, ExplorePanel, MainLayoutNew

## 3. Workflows de Développement

### Lancement de l'application
Pour démarrer l'environnement de développement complet (frontend et backend), utilisez la tâche VS Code préconfigurée :
- **Nom de la tâche :** `Démarrer API CRM`
- Cette tâche exécute `npm run dev`, qui lance le serveur Vite et l'API.

### Base de données
Le projet utilise Prisma. Les commandes essentielles sont :
- `npx prisma migrate dev`: Appliquer les migrations de la base de données.
- `npx prisma generate`: Mettre à jour le client Prisma après une modification du `schema.prisma`.
- `npx prisma db seed`: Peupler la base de données avec les données de `prisma/seed.ts`.
- **Fichier de schéma :** `prisma/schema.prisma`

## 4. Style et Composants UI
Le projet utilise **Ant Design (`antd`)** comme bibliothèque de composants principale, complétée par **Tailwind CSS** pour le stylisme utilitaire.
- Privilégiez l'utilisation d'un composant `antd` existant avant de créer un composant personnalisé.
- Utilisez les classes Tailwind pour les ajustements de style (marges, couleurs, flexbox, etc.).
- **Fichiers de configuration :** `tailwind.config.js`, `postcss.config.cjs`
