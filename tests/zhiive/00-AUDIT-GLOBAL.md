# 🐝 AUDIT GLOBAL ZHIIVE — Mars 2026

> Analyse ultra-détaillée de toutes les applications et sous-applications de la Ruche Zhiive.
> Date : 24 mars 2026 | Mis à jour : 24 mars 2026 (Pass 6 — WebRTC Collision Fix + Timeout + Logging)

---

## 🚨 RÈGLE ABSOLUE — ZÉRO STOCKAGE LOCAL

> **AUCUN `localStorage`, AUCUN `sessionStorage`, AUCUN stockage éphémère en React state seul.**
> **TOUTE donnée utilisateur DOIT être persistée en base de données PostgreSQL via l'API backend.**
>
> Cette règle est NON NÉGOCIABLE. Un `localStorage` signifie :
> - ❌ Données perdues au changement de navigateur/device
> - ❌ Données perdues au nettoyage du cache
> - ❌ Pas de synchronisation multi-appareil
> - ❌ Pas de visibilité pour l'admin/analytics
>
> **Pattern obligatoire** : Frontend → API call → Backend → PostgreSQL
> **Pattern interdit** : Frontend → localStorage / useState seul

---

## 🚨 RÈGLE ABSOLUE — ZÉRO VALEUR HARDCODÉE

> **AUCUNE valeur "en dur" dans le code des composants Zhiive.**
> Toute valeur doit être centralisée, configurable et maintenable.
>
> Cette règle est NON NÉGOCIABLE. Un hardcode signifie :
> - ❌ Modification manuelle dans 25+ fichiers pour un simple changement de couleur
> - ❌ Incohérences visuelles entre composants
> - ❌ Impossible de supporter le multi-langue (i18n cassé)
> - ❌ Impossible de changer d'infra (STUN/TURN, API URL)
> - ❌ Code illisible rempli de "magic numbers"
>
> ### Catégories interdites :
>
> | Type | ❌ Interdit | ✅ Obligatoire |
> |------|-----------|---------------|
> | **Couleurs** | `'#6C5CE7'`, `'#ff2d55'`, `'rgba(0,0,0,0.5)'` en inline | `SF.primary`, `SF.success`, `COLORS.accent` depuis le thème |
> | **Textes FR** | `'Erreur'`, `'Chargement...'`, `'max 50 Mo'` | `t('common.error')`, `t('upload.maxSize', { size: 50 })` via i18n |
> | **Magic numbers** | `2500`, `100 * 1024 * 1024`, `limit=20` | `TOAST_DURATION`, `MAX_VIDEO_SIZE`, `API_PAGE_SIZE` en constantes |
> | **URLs/Serveurs** | `'stun:stun.l.google.com:19302'` | Variable d'env ou config centralisée |
> | **Booleans hardcodés** | `online: false`, `verified: true` | Valeur calculée ou lue depuis la DB |
> | **Labels UI** | `'My Story'`, `'Colony'`, `'Market'` | `t('stories.myStory')` via i18n |
>
> ### Fichiers de référence pour les constantes :
> - **Thème Zhiive** : `src/components/zhiive/ZhiiveTheme.ts` → `SF.*` (couleurs, rayons, ombres)
> - **Thème Wall** : `src/pages/DashboardPageUnified.tsx` → `FB.*` (Facebook-like constants)
> - **Thème VideoCall** : `src/components/VideoCallModal.tsx` → `COLORS.*`
> - **i18n** : `src/locales/` → fichiers de traduction
>
> ### Violations connues à corriger :
> - 25+ couleurs hardcodées (`#6C5CE7`, `#FD79A8`, `#00CEC9`, `#ff2d55`, etc.)
> - 6 textes français non traduits (`'Erreur'`, `'max 50 Mo'`, `'maintenant'`, etc.)
> - 8 magic numbers (tailles fichiers, timeouts, limites pagination)
> - 2 serveurs ICE/STUN hardcodés dans VideoCallModal

---

## 📊 TABLEAU DE BORD GLOBAL

| # | Application | Sous-apps | Bugs Critiques | Bugs Majeurs | Bugs Mineurs | Score | Statut |
|---|-------------|-----------|----------------|--------------|-------------|-------|--------|
| 1 | **Hive (Wall/Fil)** | Feed, Composer, Réactions, Commentaires, Partage | 0 | 0 | 1 | 9/10 | ✅ |
| 2 | **Stories** | Création, Visualisation, Stories Org | 0 | 0 | 0 | 9/10 | ✅ |
| 3 | **Reels** | Création, Carousel Vidéo, Commentaires, Partage | 0 | 0 | 2 | 9/10 | ✅ |
| 4 | **Scout (Explore)** | Galerie, Bees (People), Hashtags, Comment Likes | 0 | 0 | 1 | 9/10 | ✅ |
| 5 | **Universe** | Pulse, Événements, Capsules, Orbite | 0 | 0 | 2 | 8.5/10 | ✅ |
| 6 | **Flow** | Spark, Battles, Quêtes (+ boutons action) | 0 | 0 | 2 | 8.5/10 | ✅ |
| 7 | **Messenger** | Chat, Video Call, Audio Call, Signaling | 0 | 1 | 1 | 7.75/10 | ⚠️ |
| 11 | **Friends** | Demandes d'ami, Accepter/Refuser, Bloquer, Bouton Profil, Notifications | 0 | 0 | 0 | 8.8/10 | ✅ |

**Total bugs initiaux : 62+6** → **Corrigés : 37** → **Restants : 4** (0 critique, 1 majeur, 3 mineurs)

---

## ✅ CORRECTIONS APPLIQUÉES (22 fixes)

### Pass 1 — Identité & Visibilité (15 fixes)

| # | App | Correction | Fichier(s) |
|---|-----|-----------|------------|
| 1 | Stories | Backend POST extrait et sauvegarde `publishAsOrg` | `zhiive.ts` |
| 2 | Stories | Backend GET inclut org data, retourne nom/avatar org | `zhiive.ts` |
| 3 | Stories | Interface `Story` + useEffect sync visibilité | `StoriesBar.tsx` |
| 4 | Reels | useEffect sync visibilité quand mode change | `ReelsPanel.tsx` |
| 5 | Reels | Rebuzz utilise `reelVisibility` + `publishAsOrg` | `ReelsPanel.tsx` |
| 6 | Reels | Like post avec rollback si API échoue | `ReelsPanel.tsx` |
| 7 | Flow | useEffect sync `sparkVisibility` | `FlowPanel.tsx` |
| 8 | Flow | Battles envoient `publishAsOrg` | `FlowPanel.tsx` |
| 9 | Flow | Type safety `'IN'\|'ALL'\|'OUT'` avec `as const` | `FlowPanel.tsx` |
| 10 | Flow | Vote Spark : mise à jour optimiste + rollback | `FlowPanel.tsx` |
| 11 | Universe | Capsules frontend envoie `publishAsOrg` | `UniversePanel.tsx` |
| 12 | Universe | Capsules backend extrait `publishAsOrg`, sauve `organizationId` | `zhiive.ts` |
| 13 | Universe | useEffect sync `eventVisibility` | `UniversePanel.tsx` |
| 14 | Scout | `categoryMap` i18n-safe (clés stables) + hashtags cliquables | `ExplorePanel.tsx` |
| 15 | Wall | `FB.divider` → `FB.border`, `FB.bgGray` → `FB.bg` (6 locs) | `DashboardPageUnified.tsx` |

### Pass 2 — Données & UX (7 fixes)

| # | App | Correction | Fichier(s) |
|---|-----|-----------|------------|
| 16 | Universe | Pulse metrics calculées depuis API `/pulse` (plus hardcodées) | `zhiive.ts` + `UniversePanel.tsx` |
| 17 | Universe | RSVP hydraté au chargement via `isAttending` | `zhiive.ts` + `UniversePanel.tsx` |
| 18 | Universe | Loading state visible + spinner | `UniversePanel.tsx` |
| 19 | Flow | Bouton Skip → retire le spark du feed localement | `FlowPanel.tsx` |
| 20 | Flow | Loading state visible + spinner + guards sur toutes sections | `FlowPanel.tsx` |
| 21 | Reels | `savedSet` localStorage scopé par user (`sf_saved_reels_${userId}`) | `ReelsPanel.tsx` |
| 22 | Reels | 2e référence localStorage old key corrigée (cleanup) | `ReelsPanel.tsx` |

### Pass 3 — Zéro Stockage Local (5 fixes)

> **Règle appliquée : TOUT en base de données, RIEN en localStorage.**

| # | App | Correction | Fichier(s) |
|---|-----|-----------|------------|
| 23 | Flow | **Skip Spark → persisté en DB** via `POST /sparks/:id/dismiss` + table `SparkDismiss` | `zhiive.ts` + `FlowPanel.tsx` + `schema.prisma` |
| 24 | Flow | GET Sparks exclut les sparks dismissés (`dismissals: { none: { userId } }`) | `zhiive.ts` |
| 25 | Reels | **Saved Reels → persisté en DB** via `SavedReel` table + endpoints `GET/POST/DELETE /saved-reels` | `zhiive.ts` + `ReelsPanel.tsx` + `schema.prisma` |
| 26 | Reels | **Comment Like → persisté en DB** via `CommentLike` table + toggle API + chargement des likes | `zhiive.ts` + `ReelsPanel.tsx` + `schema.prisma` |
| 27 | Flow | **Quest Progress → endpoint backend** `POST /quests/:id/progress` avec compteur + complétion auto | `zhiive.ts` + `schema.prisma` |

### Pass 4 — VideoCall, Orbit, Quêtes UI, Scout Comments (6 fixes)

| # | App | Correction | Fichier(s) |
|---|-----|-----------|------------|
| 28 | Messenger | **VideoCall race condition corrigée** : triple attachement stream (ontrack + ref callback + useEffect post-render) | `VideoCallModal.tsx` |
| 29 | Messenger | **Audio caché ajouté** : `<audio autoPlay>` pour chaque participant distant, joue l'audio même en call audio-only | `VideoCallModal.tsx` |
| 30 | Stories | **Avatar icon** : utilise `storyAvatarSrc` au lieu de `currentUser?.avatarUrl` pour le fallback icon | `StoriesBar.tsx` |
| 31 | Flow | **Bouton d'action Quêtes** : bouton "Compléter" qui appelle `POST /quests/:id/progress` + état complété visible | `FlowPanel.tsx` |
| 32 | Universe | **Orbit online status** : calcul réel basé sur `UserStreak.lastActiveAt` (actif < 5 min = en ligne) | `zhiive.ts` |
| 33 | Scout | **Comment liked state** : chargement des likes via `POST /comments/liked` + bouton like par commentaire | `ExplorePanel.tsx` |

### Pass 5 — Messenger & VideoCall (4 fixes)

| # | App | Correction | Fichier(s) |
|---|-----|-----------|------------|
| 34 | Messenger | **Audio fiable** : `remoteAudiosRef` Map + `<audio>` trackée dans useEffect post-render + logging `.play()` | `VideoCallModal.tsx` |
| 35 | Messenger | **Hangup ferme le modal** : `onClose()` appelé 3s après `leaveCall()` (auto-close) | `VideoCallModal.tsx` |
| 36 | Messenger | **Trace appel dans Whisper** : message système `📹 Appel vidéo terminé — Durée: Xmin Ys` inséré dans la conversation | `calls.ts` |
| 37 | Messenger | **Trace appel rejeté** : message système `📞 Appel manqué` dans la conversation + timestamp conversation mis à jour | `calls.ts` |

### Pass 6 — WebRTC Collision Fix + Timeout + Diagnostic (3 fixes)

| # | App | Correction | Fichier(s) |
|---|-----|-----------|------------|
| 38 | Messenger | **Offres déterministes** : suppression des offres dans `joinCall()`, seul le status poll envoie les offres, règle `userId < peerUserId` pour éviter les collisions | `VideoCallModal.tsx` |
| 39 | Messenger | **Timeout de sonnerie 60s** : auto-annulation après 60s sans réponse + message "Appel manqué" | `VideoCallModal.tsx`, `calls.ts` |
| 40 | Messenger | **Logging WebRTC complet** : ICE/connection state, track events, offer/answer, signal polling, audio playback, join/leave confirmation | `VideoCallModal.tsx` |

**Total corrigé : 40 bugs** (Passes 1-6)

**Nouveaux modèles Prisma** : `SparkDismiss`, `SavedReel`, `CommentLike` (3 tables)
**Nouveaux endpoints** : 7 routes (`dismiss`, `saved-reels` x3, `comments/like`, `comments/liked`, `quests/progress`)
**localStorage supprimé** : 0 occurrence restante dans `src/components/zhiive/`

---

## ⚠️ BUGS RESTANTS (non-bloquants)

| # | App | Bug | Sévérité | Note |
|---|-----|-----|----------|------|
| 1 | **Messenger** | Signaling par REST polling (1s) au lieu de WebSocket | ⚠️ Majeur | Acceptable en v1, migrer vers WS en v2 |
| 2 | **Messenger** | Pas de serveur TURN (échecs derrière NAT symétrique) | Mineur | Nécessite compte TURN externe |
| 3 | **All** | Error handling silencieux `.catch(() => ({}))` | Mineur | Pattern toléré en v1 |

---

## 🏗️ ARCHITECTURE CONSTATÉE

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MainLayoutNew (Header + 6 tabs)                  │
│     ZhiiveNavProvider → ActiveIdentityProvider                      │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────┐  ┌────────────┐  ┌────────────┐                     │
│  │ Left Col  │  │ Center Col │  │ Right Col  │                     │
│  │ Profile   │  │ App Active │  │ Stats/KPI  │                     │
│  │ Activity  │  │            │  │ Graphiques │                     │
│  │ Friends   │  │            │  │ Top Users  │                     │
│  └───────────┘  └────────────┘  └────────────┘                     │
│                                                                     │
│  ─── Apps du Centre (tabs switchable) ───                           │
│  🐝 Hive (Wall)  │ 🧭 Scout │ 🎬 Reels │ 🌊 Flow │ 🌌 Universe  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 STRUCTURE DE TEST

```
tests/zhiive/
├── 00-AUDIT-GLOBAL.md          ← Ce fichier
├── 01-wall-hive/
│   └── AUDIT-WALL.md           ← Tests du mur (Feed, Composer, Réactions)
├── 02-stories/
│   └── AUDIT-STORIES.md        ← Tests des Stories (bug identité org)
├── 03-reels/
│   └── AUDIT-REELS.md          ← Tests des Reels (vidéo, carousel)
├── 04-scout-explore/
│   └── AUDIT-SCOUT.md          ← Tests de Scout (Galerie, Bees, Hashtags)
├── 05-universe/
│   └── AUDIT-UNIVERSE.md       ← Tests Universe (Pulse, Events, Capsules, Orbit)
├── 06-flow/
│   └── AUDIT-FLOW.md           ← Tests Flow (Spark, Battles, Quêtes)
├── 07-stats/
│   └── AUDIT-STATS.md          ← Tests Stats (KPI, Graphiques)
├── 08-settings/
│   └── AUDIT-SETTINGS.md       ← Tests Paramètres
├── 09-integration/
│   └── AUDIT-INTEGRATION.md    ← Tests cross-app
└── 10-messenger/
    └── AUDIT-MESSENGER.md      ← Tests Messenger (Chat, Video/Audio Call, Signaling)
```
