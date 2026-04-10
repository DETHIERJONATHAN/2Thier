# 🐝 Zhiive Social — Suivi d'Évolution & Architecture Modulaire

> Ce fichier documente l'architecture des interactions sociales, les décisions prises,
> et sert de guide pour les futures évolutions.

---

## 1. Architecture Modulaire (`src/components/zhiive/shared/`)

### Fichiers créés

| Fichier | Rôle | Utilisé par |
|---------|------|-------------|
| `timeUtils.ts` | `timeAgo()` — temps relatif (now/5min/3h/2j/1sem) | ExplorePanel, ReelsPanel, StoriesBar |
| `usePostInteractions.ts` | Hook : like, save, share, follow, sendDM (optimistic + rollback) | Disponible pour tous les panels |
| `useDoubleTap.ts` | Hook : détection double-tap + state heartAnimId | ExplorePanel, ReelsPanel, StoriesBar |
| `HeartBurstOverlay.tsx` | Composant : animation cœur (scale 0→1.3→0, 900ms) | ExplorePanel, ReelsPanel, StoriesBar |
| `InteractionBar.tsx` | Composant : barre d'actions (like/comment/share/DM/save) | Prêt — intégration future dans tous les panels |
| `index.ts` | Barrel export de tout le module shared | Import simplifié |

### Pourquoi cette structure ?

**Avant** : Chaque panel avait ses propres handlers `handleLike`, `handleSave`, `handleFollow`, etc. dupliqués à 90%.

**Après** : Un seul hook `usePostInteractions` contient toute la logique — les panels l'importent et l'utilisent. Les composants UI partagés (`HeartBurstOverlay`, `InteractionBar`) garantissent un UX identique partout.

### Comment utiliser les hooks partagés dans un nouveau panel

```typescript
import { usePostInteractions, useDoubleTap, timeAgo } from './shared';
import HeartBurstOverlay, { heartBurstKeyframes } from './shared/HeartBurstOverlay';

// Dans le composant :
const interactions = usePostInteractions({ api, t, userId: user?.id });
const { handleTap, heartAnimId } = useDoubleTap({
  onDoubleTap: (id) => { if (!interactions.isLiked(id)) interactions.toggleLike(id); },
});

// Utiliser :
interactions.toggleLike(postId);
interactions.toggleSave(postId);
interactions.sharePost(postId);
interactions.toggleFollow(userId);
interactions.sendDM(userId);
interactions.isLiked(postId);  // boolean
interactions.isSaved(postId);  // boolean
interactions.isFollowing(userId); // boolean
```

---

## 2. Matrice de Parité des Interactions

### État actuel (post-refactor)

| Feature | Friends (Explore) | Reels | Stories | Universe |
|---------|:-:|:-:|:-:|:-:|
| **Like/Reaction** | ✅ | ✅ | ✅ (NEW) | ❌ (N/A) |
| **Double-tap Like** | ✅ | ✅ (NEW) | ✅ (NEW) | ❌ (N/A) |
| **Save/Bookmark** | ✅ | ✅ | ⏳ (future) | ❌ (N/A) |
| **Share** | ✅ | ✅ | ✅ (NEW) | ❌ (N/A) |
| **Follow** | ✅ | ✅ | ⏳ (future) | ❌ (N/A) |
| **DM / Whisper** | ✅ | ✅ (NEW) | ✅ (NEW) | ❌ (N/A) |
| **Comments** | ✅ | ✅ | ⏳ (future) | ❌ (N/A) |
| **Heart Animation** | ✅ | ✅ (NEW) | ✅ (NEW) | ❌ (N/A) |
| **Infinite Scroll** | ✅ | N/A (snap) | N/A | N/A |

> **Universe** est un module événements/orbite — les interactions sociales classiques ne s'y appliquent pas.

---

## 3. Backend — Endpoints Sociaux

| Endpoint | Méthode | Utilisateurs |
|----------|---------|--------------|
| `/api/wall/posts/:id/reactions` | POST | ExplorePanel, ReelsPanel |
| `/api/zhiive/saved-reels/:postId` | POST/DELETE | ExplorePanel, ReelsPanel |
| `/api/wall/posts/:id/share` | POST | ExplorePanel, ReelsPanel |
| `/api/zhiive/follow/:userId` | POST/DELETE | ExplorePanel, ReelsPanel |
| `/api/messenger/conversations` | POST | ExplorePanel, ReelsPanel, StoriesBar |
| `/api/wall/posts/:id/comments` | GET/POST | ExplorePanel, ReelsPanel |
| `/api/zhiive/comments/:id/like` | POST | ExplorePanel, ReelsPanel |
| `/api/zhiive/stories/:id/react` | POST | StoriesBar (NEW) |
| `/api/zhiive/stories/:id/view` | POST | StoriesBar |

---

## 4. Étapes Réalisées (Chronologie)

### Phase 1 — ExplorePanel (Friends) Instagram-style
- Grille mixte InstaGrid (3×3 + featured 2×2 alternant)
- Infinite scroll (IntersectionObserver + offset pagination)
- Double-tap like + heartBurst animation
- Save/Bookmark avec BookFilled doré
- Share interne (POST /share)
- Follow/Unfollow depuis fullscreen
- Send DM via CustomEvent open-messenger
- Temps relatif (timeAgo)
- Commentaires collapsibles ("Voir les X commentaires")
- Auto-play vidéo au hover dans la grille
- Badge carousel (CopyOutlined pour multi-média)
- Header : Bees → Gallery → Hashtags (réordonné)
- Fullscreen sans flèches (swipe + clavier uniquement)

### Phase 2 — Harmonisation Multi-Panel
- Extraction du code partagé dans `shared/`
  - `useDoubleTap`, `usePostInteractions`, `timeAgo`
  - `HeartBurstOverlay`, `InteractionBar`
- **ReelsPanel** : ajout double-tap like + heartBurst + DM button
- **StoriesBar** : ajout like (❤️) + share + DM dans le viewer
- **Backend** : nouvel endpoint `POST /stories/:storyId/react`
- i18n : clés ajoutées pour fr.json et en.json

### Phase 3 — Futures Évolutions Planifiées
- [ ] Ajouter Save/Bookmark aux Stories (nécessite migration schema)
- [ ] Ajouter Follow depuis le viewer Story
- [ ] Story replies / commentaires
- [ ] Notification push quand quelqu'un réagit à ta Story
- [ ] Analytics Stories (nombre de likes, pas juste vues)
- [ ] Ajouter `StoryReaction` model en DB (séparé de `StoryView`)
- [ ] Pagination cursor-based pour Reels (remplacer offset)
- [ ] WebSocket pour likes/comments temps réel
- [ ] Refactor DashboardPageUnified pour utiliser `usePostInteractions`

---

## 5. Conventions à Respecter

1. **Imports partagés** : Toujours importer depuis `./shared` ou `./shared/xxx`
2. **Optimistic UI** : Toute interaction modifie l'état LOCAL d'abord, puis appelle l'API. En cas d'erreur → rollback.
3. **Pas de duplication** : Si un handler existe dans `usePostInteractions`, l'utiliser. Ne PAS recréer localement.
4. **SF theme** : Couleurs via `SF.*`, jamais de hex en dur.
5. **i18n** : Textes via `t('clé')`, jamais de français en dur.
6. **`useCallback`/`useMemo`** : Tous les handlers et listes calculées doivent être mémorisés.
7. **`React.memo`** : Les composants de liste (cards, grid cells) doivent être mémorisés.
8. **No `new PrismaClient()`** : Toujours `db` singleton.

---

## 6. Arborescence des Fichiers Sociaux

```
src/components/zhiive/
├── shared/
│   ├── index.ts                    # Barrel export
│   ├── timeUtils.ts                # timeAgo()
│   ├── usePostInteractions.ts      # Hook: like, save, share, follow, DM
│   ├── useDoubleTap.ts             # Hook: double-tap detection
│   ├── HeartBurstOverlay.tsx       # Component: heart animation
│   └── InteractionBar.tsx          # Component: action bar
├── ExplorePanel.tsx                # Friends — galerie Instagram-style
├── ReelsPanel.tsx                  # Reels — TikTok-style vertical scroll
├── StoriesBar.tsx                  # Stories — barre horizontale + viewer
├── UniversePanel.tsx               # Events/Orbit (pas d'interactions sociales)
├── ZhiiveModuleHeader.tsx          # Header 48px blanc partagé
└── ZhiiveTheme.ts                  # Thème SF/FB/COLORS
```
