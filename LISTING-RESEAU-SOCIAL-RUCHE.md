# 🐝 Listing — Partie Réseau Social de la Ruche (Zhiive)

> Généré le 2026-03-26  
> Ce document recense l'ensemble des composants, modèles de données, routes API et utilitaires qui composent la partie **réseau social** de Zhiive.

---

## 1. Composants UI

### 1.1 Point d'entrée principal

| Composant | Fichier | Rôle |
|-----------|---------|------|
| **DashboardPageUnified** | `src/pages/DashboardPageUnified.tsx` | Dashboard principal qui orchestre tous les panneaux sociaux (Wall, Stories, Reels, Flow, Universe, Explore, Messenger, Appels) |

---

### 1.2 Composants Zhiive (`src/components/zhiive/`)

| Composant | Fichier | Rôle |
|-----------|---------|------|
| **ReelsPanel** | `ReelsPanel.tsx` | Flux vidéo vertical style TikTok/YouTube Shorts — likes, commentaires, partages, sauvegarde |
| **ExplorePanel** | `ExplorePanel.tsx` | Découverte : recherche, hashtags tendance, grille galerie, suggestions d'utilisateurs |
| **FlowPanel** | `FlowPanel.tsx` | Hub de gamification : Sparks (posts anonymes), Battles (duels créatifs), Quests (missions) |
| **UniversePanel** | `UniversePanel.tsx` | Événements sociaux, Time Capsules (messages vers le futur), Pulse (métriques), Orbit (proximité amis) |
| **StoriesBar** | `StoriesBar.tsx` | Stories éphémères 24 h style Instagram — création, visualisation, mise en avant (highlights) |
| **FeedModeSelector** | `FeedModeSelector.tsx` | Bascule entre mode Personnel (« Abeille ») et mode Organisation (« Colonie ») |
| **ZhiiveTheme** | `ZhiiveTheme.ts` | Design system : palette de couleurs, constantes de style |

---

### 1.3 Contextes & Hooks

| Fichier | Rôle |
|---------|------|
| `src/contexts/ZhiiveNavContext.tsx` | Gestion de l'onglet actif (Wall / Reels / Stories / …) ; synchronisation sidebar + carousel mobile |
| `src/contexts/ActiveIdentityContext.tsx` | **Source unique d'identité** — calcule `isOrgMode`, `publishAsOrg`, avatar et nom à afficher |
| `src/contexts/WallNavigationContext.tsx` | Navigation interne au Wall (catégories, filtres) |
| `src/hooks/useAuthenticatedApi.ts` | Hook HTTP authentifié utilisé par tous les composants pour appeler l'API |
| `src/auth/useAuth.ts` | État utilisateur connecté, permissions, modules actifs |

---

## 2. Modèles de données (Prisma — `prisma/schema.prisma`)

### 2.1 Posts & Contenu

| Modèle | Description |
|--------|-------------|
| **WallPost** | Post principal : texte, médias (image/vidéo/doc/galerie), visibilité (OUT/IN/ALL/CLIENT), catégorie, hashtags, mode anonyme (Spark), republication (echo), épinglage, compteurs dénormalisés (likes, commentaires, partages) |
| **WallReaction** | Réaction à un post : LIKE, LOVE, BRAVO, UTILE, WOW — unique par (post, utilisateur) |
| **WallComment** | Commentaire avec réponses imbriquées, média optionnel, mode orga |
| **CommentLike** | Like d'un commentaire — unique par (commentaire, utilisateur) |
| **WallShare** | Partage d'un post vers : INTERNAL, FACEBOOK, LINKEDIN, WHATSAPP, EMAIL, LINK |

### 2.2 Stories

| Modèle | Description |
|--------|-------------|
| **Story** | Story éphémère : média, légende, musique, durée d'affichage, visibilité, highlight, expiration (now + 24 h) |
| **StoryView** | Enregistrement d'une vue — unique par (story, spectateur) |

### 2.3 Abonnements & Découverte

| Modèle | Description |
|--------|-------------|
| **Follow** | Relation follower → following — unique par paire |
| **Hashtag** | Hashtag avec compteur de posts (dénormalisé) |
| **PostHashtag** | Table pivot Post ↔ Hashtag |

### 2.4 Gamification (Flow)

| Modèle | Description |
|--------|-------------|
| **Spark** | Post anonyme : compteur de votes, seuil de révélation de l'auteur |
| **SparkVote** | Vote pour révéler un Spark |
| **SparkDismiss** | Masquage d'un Spark par un utilisateur |
| **Battle** | Duel créatif : challenger, adversaire, statut (open/active/voting/ended), date de fin, gagnant |
| **BattleEntry** | Participation à un Battle (contenu + votes) |
| **Quest** | Mission gamifiée : type (daily/weekly/monthly/special), action cible, récompense en points |
| **QuestProgress** | Avancement d'un utilisateur sur une Quest |

### 2.5 Universe

| Modèle | Description |
|--------|-------------|
| **TimeCapsule** | Message vers le futur : contenu/média, date de déverrouillage, destinataire optionnel |
| **SocialEvent** | Événement social (Meetup, Workshop, Job Fair, Open Day) avec RSVP et capacité max |

### 2.6 Messagerie & Communication

| Modèle | Description |
|--------|-------------|
| **Conversation** | Conversation 1-à-1 ou groupe (nom, avatar, lastMessageAt) |
| **ConversationParticipant** | Participant avec rôle (member/admin), lastReadAt |
| **Message** | Message texte ou média, réponse imbriquée, édition/suppression |
| **VideoCall** | Appel vidéo/audio : statut (ringing/active/ended/missed), enregistrement, transcription, résumé IA |
| **CallParticipant** | Participant à un appel : statut (invited/joined/left/rejected), mute/vidéo |

### 2.7 Social Graph

| Modèle | Description |
|--------|-------------|
| **Friendship** | Demande d'ami : statut (pending/accepted/blocked), source (manual/organization) |
| **UserPhoto** | Photos de profil, couverture et autres |
| **SavedReel** | Post sauvegardé/bookmarké par un utilisateur |
| **PushSubscription** | Abonnement aux notifications push Web (endpoint VAPID) |

---

## 3. Routes API

### 3.1 Wall — `/api/wall` (`src/routes/wall.ts`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/wall/feed` | Flux principal (filtres visibilité/catégorie, pagination curseur) |
| GET | `/wall/my-feed` | Posts de l'utilisateur connecté |
| GET | `/wall/client-feed/:leadId` | Posts visibles par un client donné |
| POST | `/wall/posts` | Créer un post (texte, médias, visibilité, catégorie, hashtags…) |
| DELETE | `/wall/posts/:id` | Supprimer un post (auteur ou admin orga) |
| POST | `/wall/posts/:id/reactions` | Ajouter/modifier une réaction (LIKE/LOVE/BRAVO/UTILE/WOW) |
| GET | `/wall/posts/:id/comments` | Lister les commentaires d'un post |
| POST | `/wall/posts/:id/comments` | Ajouter un commentaire |
| DELETE | `/wall/comments/:id` | Supprimer un commentaire |
| POST | `/wall/posts/:id/share` | Partager un post |
| GET | `/wall/stats` | Statistiques du Wall |
| POST | `/wall/upload` | Upload média (image/vidéo) vers le cloud |

---

### 3.2 Zhiive — `/api/zhiive` (`src/routes/zhiive.ts`)

#### Abonnements & Découverte

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/zhiive/follow/:userId` | Suivre un utilisateur |
| DELETE | `/zhiive/follow/:userId` | Ne plus suivre |
| GET | `/zhiive/followers/:userId` | Liste des abonnés |
| GET | `/zhiive/following/:userId` | Liste des abonnements |
| GET | `/zhiive/explore/suggested-users` | Suggestions d'utilisateurs à suivre |

#### Stories

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/zhiive/stories/feed` | Flux de stories actives (< 24 h) |
| POST | `/zhiive/stories` | Créer une story |
| POST | `/zhiive/stories/:storyId/view` | Enregistrer une vue |
| DELETE | `/zhiive/stories/:storyId` | Supprimer une story |

#### Explore

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/zhiive/explore/posts` | Parcourir les posts publics avec pagination |
| GET | `/zhiive/explore/gallery` | Vue galerie (grille) |
| GET | `/zhiive/explore/hashtags` | Hashtags tendance |

#### Reels

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/zhiive/reels` | Flux vidéo vertical (création via `/wall/posts`) |

#### Flow (Gamification)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/zhiive/sparks` | Liste des Sparks anonymes |
| POST | `/zhiive/sparks` | Créer un Spark |
| POST | `/zhiive/sparks/:sparkId/vote` | Voter pour révéler un Spark |
| POST | `/zhiive/sparks/:sparkId/dismiss` | Masquer un Spark |
| GET | `/zhiive/battles` | Liste des Battles |
| POST | `/zhiive/battles` | Créer un Battle |
| POST | `/zhiive/battles/:id/join` | Rejoindre un Battle |
| GET | `/zhiive/quests/available` | Missions disponibles |
| POST | `/zhiive/quests/:questId/progress` | Mettre à jour la progression |

#### Universe

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/zhiive/events` | Liste des événements sociaux |
| POST | `/zhiive/events` | Créer un événement |
| POST | `/zhiive/events/:eventId/rsvp` | S'inscrire à un événement |
| DELETE | `/zhiive/events/:eventId/rsvp` | Annuler son inscription |
| GET | `/zhiive/capsules` | Liste des Time Capsules |
| POST | `/zhiive/capsules` | Créer une Time Capsule |
| GET | `/zhiive/pulse` | Métriques d'engagement (données visualisation) |
| GET | `/zhiive/orbit` | Proximité / amis les plus proches |

#### Engagement & Favoris

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/zhiive/saved-reels` | Posts sauvegardés |
| POST | `/zhiive/saved-reels/:postId` | Sauvegarder un post |
| DELETE | `/zhiive/saved-reels/:postId` | Retirer des favoris |
| POST | `/zhiive/comments/:commentId/like` | Liker/unliker un commentaire |
| GET | `/zhiive/gamification/me` | Stats de gamification (points, niveau, succès) |

---

### 3.3 Amis — `/api/friends` (`src/routes/friends.ts`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/friends/` | Liste des amis |
| GET | `/friends/search` | Rechercher des amis |
| POST | `/friends/request` | Envoyer une demande d'ami |
| POST | `/friends/:id/accept` | Accepter une demande |
| POST | `/friends/:id/block` | Bloquer un utilisateur |
| DELETE | `/friends/:id` | Retirer un ami |
| POST | `/friends/sync-org` | Auto-synchroniser les membres de l'organisation |

---

### 3.4 Messagerie — `/api/messenger` (`src/routes/messenger.ts`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/messenger/conversations` | Liste des conversations |
| POST | `/messenger/conversations` | Créer une conversation (1-à-1 ou groupe) |
| GET | `/messenger/conversations/:id/messages` | Messages d'une conversation |
| POST | `/messenger/conversations/:id/messages` | Envoyer un message |
| POST | `/messenger/conversations/:id/read` | Marquer comme lu |
| DELETE | `/messenger/messages/:id` | Supprimer un message |
| GET | `/messenger/unread` | Compteur de non-lus |

---

### 3.5 Appels vidéo — `/api/calls` (`src/routes/calls.ts`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/calls/start` | Initier un appel vidéo/audio |
| POST | `/calls/:id/join` | Rejoindre un appel |
| POST | `/calls/:id/leave` | Quitter un appel |
| POST | `/calls/:id/reject` | Rejeter un appel entrant |
| GET | `/calls/:id` | Détails d'un appel + participants |
| GET | `/calls/check/incoming` | Vérifier les appels entrants (polling) |
| POST | `/calls/:id/signal` | Signalisation WebRTC (ICE/SDP) |
| GET | `/calls/:id/signal` | Récupérer les signaux des autres participants |
| POST | `/calls/:id/transcribe` | Transcrire un enregistrement audio |
| GET | `/calls/history/list` | Historique des appels |

---

### 3.6 Notifications push — `/api/push` (`src/routes/push.ts`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/push/vapid-key` | Clé publique VAPID pour configuration Web Push |
| POST | `/push/subscribe` | Abonner un appareil aux notifications push |
| DELETE | `/push/unsubscribe` | Désabonner un appareil |

---

## 4. Vue d'ensemble — Carte fonctionnelle

```
🐝 Zhiive — Partie Réseau Social
│
├── 📰 WALL (fil principal)
│   ├── Posts texte / médias (image, vidéo, document, galerie)
│   ├── Réactions : LIKE / LOVE / BRAVO / UTILE / WOW
│   ├── Commentaires (imbriqués) + likes de commentaires
│   ├── Partages (interne, LinkedIn, Facebook, WhatsApp, email, lien)
│   ├── Visibilité : OUT / IN / ALL / CLIENT
│   ├── Mode personnel ou organisationnel (publishAsOrg)
│   └── Upload médias cloud
│
├── 📸 STORIES (éphémères 24 h)
│   ├── Création (image / vidéo, légende, musique)
│   ├── Visualisation avec tracking de vues
│   └── Highlights (épinglées)
│
├── 🎬 REELS (vidéos verticales)
│   ├── Flux style TikTok avec navigation haut/bas
│   ├── Likes, commentaires, partages, sauvegarde
│   └── Création via le Wall
│
├── 🔍 EXPLORE (découverte)
│   ├── Parcourir les posts publics
│   ├── Galerie visuelle
│   ├── Hashtags tendance
│   └── Suggestions d'utilisateurs
│
├── ⚡ FLOW (gamification)
│   ├── Sparks — posts anonymes avec révélation par vote
│   ├── Battles — duels créatifs (challenger vs adversaire)
│   └── Quests — missions quotidiennes/hebdo/mensuelles
│
├── 🌌 UNIVERSE (communauté)
│   ├── Événements sociaux avec RSVP (Meetup, Workshop…)
│   ├── Time Capsules (messages vers le futur)
│   ├── Pulse — métriques d'engagement en temps réel
│   └── Orbit — proximité entre amis
│
├── 👥 AMIS & ABONNEMENTS
│   ├── Demandes d'amis (pending/accepted/blocked)
│   ├── Follow / Unfollow
│   └── Synchronisation automatique organisation
│
├── 💬 MESSAGERIE
│   ├── Conversations 1-à-1 et groupes
│   ├── Messages texte et médias (image, vidéo, fichier)
│   └── Réponses imbriquées, édition, suppression
│
├── 📹 APPELS VIDÉO
│   ├── Appels vidéo et audio via WebRTC
│   ├── Gestion des participants (mute, vidéo off)
│   ├── Enregistrement et transcription audio
│   └── Résumé IA de réunion
│
└── 🔔 NOTIFICATIONS PUSH
    └── Web Push (VAPID) — abonnement par appareil
```

---

## 5. Fichiers clés récapitulatifs

| Catégorie | Fichier(s) |
|-----------|-----------|
| Composants UI sociaux | `src/components/zhiive/` |
| Dashboard principal | `src/pages/DashboardPageUnified.tsx` |
| Identité active | `src/contexts/ActiveIdentityContext.tsx` |
| Navigation Zhiive | `src/contexts/ZhiiveNavContext.tsx` |
| Routes Wall | `src/routes/wall.ts` |
| Routes Zhiive | `src/routes/zhiive.ts` |
| Routes Amis | `src/routes/friends.ts` |
| Routes Messagerie | `src/routes/messenger.ts` |
| Routes Appels | `src/routes/calls.ts` |
| Routes Push | `src/routes/push.ts` |
| Schéma base de données | `prisma/schema.prisma` |
| Couche DB | `src/lib/database.ts` |
| Serveur API | `src/api-server-clean.ts` |
