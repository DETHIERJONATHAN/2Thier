# 🐝 AUDIT GLOBAL — Harmonisation des Interactions Sociales Zhiive

> **Version** : Post-harmonisation Phase 2  
> **Date** : Janvier 2026  
> **Scope** : ExplorePanel (Friends), ReelsPanel, StoriesBar + modules partagés  
> **Fichiers créés/modifiés** :  
> - `src/components/zhiive/shared/` (6 fichiers — NOUVEAU)  
> - `src/components/zhiive/ReelsPanel.tsx` (modifié)  
> - `src/components/zhiive/StoriesBar.tsx` (modifié)  
> - `src/routes/zhiive.ts` (modifié — nouvel endpoint)  
> - `src/i18n/locales/fr.json` + `en.json` (modifié)

---

## 🚨 RÈGLES ABSOLUES VÉRIFIÉES

> **ZÉRO `new PrismaClient()`** : Tout via `db` singleton.  
> **ZÉRO STOCKAGE LOCAL** : Pas de `localStorage`/`sessionStorage`.  
> **ZÉRO VALEUR HARDCODÉE** : Couleurs via thème, textes via i18n.  
> **`useActiveIdentity()`** : Source unique d'identité (jamais `feedMode === 'org'` local).  
> **`useAuthenticatedApi()`** : Jamais de `fetch`/`axios` direct.

---

## 📋 MATRICE DE TEST — Modules Partagés (`src/components/zhiive/shared/`)

### A. `timeUtils.ts`

| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| A1 | Retourne "now" pour < 60s | `timeAgo(new Date().toISOString())` → `"now"` | ☐ |
| A2 | Retourne "Xmin" entre 1-59min | `timeAgo(5 min ago)` → `"5min"` | ☐ |
| A3 | Retourne "Xh" entre 1-23h | `timeAgo(3h ago)` → `"3h"` | ☐ |
| A4 | Retourne "Xj" entre 1-6 jours | `timeAgo(2j ago)` → `"2j"` | ☐ |
| A5 | Retourne "Xsem" entre 1-3 semaines | `timeAgo(2 weeks ago)` → `"2sem"` | ☐ |
| A6 | Retourne "Xm" au-delà | `timeAgo(2 months ago)` → `"2m"` | ☐ |
| A7 | Gère date null/undefined | Pas de crash → retourne "now" ou chaîne vide | ☐ |

### B. `useDoubleTap.ts`

| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| B1 | Simple tap → rien | Taper 1x → `onDoubleTap` PAS appelé | ☐ |
| B2 | Double tap < 300ms → trigger | Taper 2x vite → `onDoubleTap(id)` appelé | ☐ |
| B3 | Double tap > 300ms → rien | Taper 2x lentement → pas de callback | ☐ |
| B4 | heartAnimId set pendant 900ms | Après double-tap → `heartAnimId` = id → après 900ms → null | ☐ |
| B5 | Pas de fuite mémoire | Démonter le composant pendant l'anim → pas d'erreur console | ☐ |

### C. `HeartBurstOverlay.tsx`

| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| C1 | Visible quand `show=true` | Passer `show={true}` → cœur blanc animé visible | ☐ |
| C2 | Invisible quand `show=false` | Passer `show={false}` → rien rendu | ☐ |
| C3 | Animation scale 0→1.3→0 | Inspecter CSS → keyframe heartBurstPop | ☐ |
| C4 | Durée 900ms | Mesurer visuellement → disparaît en ~1s | ☐ |
| C5 | Centré sur le parent | Position absolute + inset-0 + centré | ☐ |
| C6 | pointerEvents: none | L'overlay ne bloque pas les clics derrière | ☐ |

### D. `usePostInteractions.ts`

| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| D1 | `toggleLike` ajoute à likedSet | Appeler → `isLiked(id)` retourne `true` | ☐ |
| D2 | `toggleLike` retire de likedSet | Appeler 2x → `isLiked(id)` retourne `false` | ☐ |
| D3 | Optimistic UI like | Toggle instantané avant réponse API | ☐ |
| D4 | Rollback like si erreur | Simuler erreur réseau → état revient | ☐ |
| D5 | `toggleSave` POST/DELETE | Save → `POST /saved-reels/:id`, Unsave → `DELETE` | ☐ |
| D6 | Rollback save si erreur | Simuler erreur → état revient | ☐ |
| D7 | `sharePost` déclenche alerte | Appeler → `message.success` affiché | ☐ |
| D8 | `toggleFollow` POST/DELETE | Follow → `POST /follow/:id`, Unfollow → `DELETE` | ☐ |
| D9 | Rollback follow si erreur | Simuler erreur → état revient | ☐ |
| D10 | `sendDM` crée conversation | Appeler → `POST /messenger/conversations` | ☐ |
| D11 | `sendDM` émet CustomEvent | Écouter `open-messenger` → reçu | ☐ |
| D12 | `initLiked` / `initSaved` / `initFollowing` | Initialiser des sets → `isLiked` reflète | ☐ |

### E. `InteractionBar.tsx`

| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| E1 | Affiche like actif (HeartFilled rouge) | `isLiked=true` → cœur rouge | ☐ |
| E2 | Affiche like inactif (HeartOutlined) | `isLiked=false` → cœur vide | ☐ |
| E3 | Affiche save actif (BookFilled doré) | `isSaved=true` → bookmark doré | ☐ |
| E4 | Affiche compteur likes | `likesCount=42` → "42" visible | ☐ |
| E5 | Affiche compteur commentaires | `commentsCount=5` → "5" visible | ☐ |
| E6 | Masque bouton commentaire | `showComment=false` → pas visible | ☐ |
| E7 | Masque bouton DM | `showDM=false` → pas visible | ☐ |
| E8 | Variante dark | `variant='dark'` → texte blanc | ☐ |
| E9 | Variante light | `variant='light'` → texte gris foncé | ☐ |

---

## 📋 MATRICE DE TEST — ReelsPanel (Modifications)

### F. Double-tap Like dans Reels

| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| F1 | Double-tap sur vidéo → like | Taper 2x rapidement → heartBurst visible | ☐ |
| F2 | Compteur like +1 | Vérifier que le compteur augmente | ☐ |
| F3 | Re-double-tap ne re-like pas | Déjà liké → animation mais pas +2 | ☐ |
| F4 | Simple tap = toggle pause | Taper 1x → vidéo pause/play | ☐ |
| F5 | stopPropagation correct | Simple tap pause NE déclenche PAS heartBurst | ☐ |
| F6 | Animation centrée sur vidéo | HeartBurstOverlay positionné au centre | ☐ |

### G. Bouton DM dans Reels

| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| G1 | Bouton DM visible | En lecture reel → icône SendOutlined visible | ☐ |
| G2 | DM propre reel = masqué | Sur son propre reel → bouton DM absent | ☐ |
| G3 | Clic DM → API call | Network → `POST /api/messenger/conversations` | ☐ |
| G4 | CustomEvent émis | Listener sur `open-messenger` → reçu | ☐ |
| G5 | Feedback utilisateur | `message.success()` ou ouverture messenger | ☐ |
| G6 | Position : entre Share et Save | Vérifier l'ordre : Like > Comment > Share > DM > Save | ☐ |

### H. Keyframes injectés

| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| H1 | `heartBurstKeyframes` dans style | Inspecter `<style>` tag → `@keyframes heartBurstPop` présent | ☐ |
| H2 | Pas de doublon keyframes | Si `heartBurstKeyframes` déjà défini ailleurs → vérifier pas de conflit CSS | ☐ |

---

## 📋 MATRICE DE TEST — StoriesBar (Modifications)

### I. Like Story

| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| I1 | Bouton ❤️ visible dans viewer | Ouvrir une story → barre d'interaction → HeartOutlined | ☐ |
| I2 | Clic like → HeartFilled rouge | Cliquer → icône passe en HeartFilled + rouge | ☐ |
| I3 | API call story react | Network → `POST /api/zhiive/stories/:id/react` | ☐ |
| I4 | Optimistic UI | Toggle visuel instantané | ☐ |
| I5 | Rollback si erreur | Simuler erreur → cœur redevient vide | ☐ |
| I6 | Double-tap like story | Double-tap sur média → même effet | ☐ |
| I7 | Re-double-tap pas de re-like | Déjà liké → animation seule | ☐ |

### J. Share Story

| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| J1 | Bouton partage visible | Icône ShareAltOutlined dans viewer | ☐ |
| J2 | Mobile → Web Share API | navigator.share appelé si disponible | ☐ |
| J3 | Desktop → clipboard | navigator.clipboard.writeText + message.success | ☐ |
| J4 | Texte i18n correct | `t('stories.sharedStory')` utilisé | ☐ |

### K. DM Story

| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| K1 | Bouton DM visible (autre user) | Story d'un autre → SendOutlined visible | ☐ |
| K2 | Bouton DM masqué (propre story) | Ma story → pas de bouton DM | ☐ |
| K3 | Clic → API conversation | Network → `POST /api/messenger/conversations` | ☐ |
| K4 | CustomEvent open-messenger | Listener → reçu avec conversationId | ☐ |

### L. HeartBurst dans Stories

| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| L1 | Double-tap sur média story | Taper 2x → cœur animé visible | ☐ |
| L2 | Animation 900ms | Disparaît après ~1 seconde | ☐ |
| L3 | Ne bloque pas la progression | L'animation n'empêche pas de passer à la story suivante | ☐ |

---

## 📋 MATRICE DE TEST — Backend

### M. Endpoint `POST /stories/:storyId/react`

| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| M1 | Story existante → 200 | Envoyer POST → `{ success: true, liked: true }` | ☐ |
| M2 | Story inexistante → 404 | storyId invalide → `{ error: 'Story not found' }` | ☐ |
| M3 | Upsert StoryView | DB → StoryView créé/mis à jour avec `liked: true` | ☐ |
| M4 | Auth requise | Sans token → 401 | ☐ |
| M5 | orgId correct | Header X-Organization-Id respecté | ☐ |
| M6 | userId extrait du token | userId correct dans StoryView | ☐ |

---

## 📋 MATRICE DE TEST — i18n

### N. Clés de traduction

| # | Test | Clé | FR attendu | EN attendu | Statut |
|---|------|-----|------------|------------|--------|
| N1 | Stories shared | `stories.sharedStory` | "Regardez cette story !" | "Check out this story!" | ☐ |
| N2 | Explore shared | `explore.shared` | (existant) | (existant) | ☐ |
| N3 | Share error | `explore.shareError` | (existant) | (existant) | ☐ |

---

## 📋 TESTS DE RÉGRESSION

### O. ExplorePanel (Friends) — Pas de régression

| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| O1 | Grille InstaGrid affiche | Ouvrir Friends → Gallery → grille 3 colonnes | ☐ |
| O2 | Infinite scroll charge | Scroller → nouvelles images chargées | ☐ |
| O3 | Double-tap like fonctionne | Double-tap en fullscreen → heartBurst | ☐ |
| O4 | Save/Bookmark fonctionne | Clic bookmark → doré, re-clic → vide | ☐ |
| O5 | Share fonctionne | Clic share → partage natif ou clipboard | ☐ |
| O6 | Follow/Unfollow fonctionne | Bouton follow → toggle | ☐ |
| O7 | DM fonctionne | Clic DM → messenger s'ouvre | ☐ |
| O8 | Commentaires fonctionne | "Voir les X commentaires" → collapsible | ☐ |

### P. ReelsPanel — Régression existante

| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| P1 | Vidéo auto-play au snap | Scroller → nouvelle vidéo joue auto | ☐ |
| P2 | Like bouton existant OK | Bouton ❤️ à droite → toggle | ☐ |
| P3 | Comment modal OK | Bouton commentaire → modal s'ouvre | ☐ |
| P4 | Share existant OK | Bouton partage → fonctionne | ☐ |
| P5 | Follow existant OK | Bouton follow → toggle | ☐ |
| P6 | Save existant OK | Bookmark → doré | ☐ |
| P7 | Upload reel OK | Bouton + → upload → création | ☐ |

### Q. StoriesBar — Régression existante

| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| Q1 | Barre horizontale affiche | Stories en haut avec avatars | ☐ |
| Q2 | Clic story ouvre viewer | Clic → plein écran | ☐ |
| Q3 | Auto-progression | Story passe à la suivante toute seule | ☐ |
| Q4 | Barre de progression | Barre animée en haut du viewer | ☐ |
| Q5 | création story OK | Bouton + → upload → publication | ☐ |
| Q6 | Story highlight | Stories épinglées visibles | ☐ |
| Q7 | Story vue marquée | StoryView créé à l'ouverture | ☐ |

---

## 📊 RÉSUMÉ

| Catégorie | Tests | Critiques |
|-----------|-------|-----------|
| Modules partagés (A-E) | 32 | timeUtils, useDoubleTap, HeartBurst, usePostInteractions, InteractionBar |
| ReelsPanel modifs (F-H) | 14 | Double-tap, DM, keyframes |
| StoriesBar modifs (I-L) | 14 | Like, Share, DM, HeartBurst |
| Backend (M) | 6 | POST /stories/:storyId/react |
| i18n (N) | 3 | Clés de traduction |
| Régression Explore (O) | 8 | Pas de cassure |
| Régression Reels (P) | 7 | Pas de cassure |
| Régression Stories (Q) | 7 | Pas de cassure |
| **TOTAL** | **91** | |

---

## 🔒 SÉCURITÉ

| # | Check | Statut |
|---|-------|--------|
| S1 | Auth token vérifié sur POST /stories/:storyId/react | ☐ |
| S2 | orgId validé côté backend | ☐ |
| S3 | userId extrait côté serveur (pas envoyé par le client) | ☐ |
| S4 | Pas d'injection SQL (Prisma paramétré) | ☐ |
| S5 | Rate limiting sur /react endpoint | ☐ |
| S6 | Pas de XSS dans les données affichées (React échappe) | ☐ |

---

## 📝 RECOMMANDATIONS D'AMÉLIORATION

| Priorité | Amélioration | Complexité |
|----------|-------------|------------|
| 🔴 Haute | Ajouter model `StoryReaction` séparé (au lieu de réutiliser `StoryView.liked`) | Moyenne |
| 🔴 Haute | Toggle unlike pour stories (actuellement like-only) | Faible |
| 🟡 Moyenne | Commentaires sur Stories (nouveau model `StoryComment`) | Haute |
| 🟡 Moyenne | Save/Bookmark Stories | Moyenne |
| 🟡 Moyenne | Follow depuis le viewer Story | Faible |
| 🟢 Basse | Notification push sur réaction story | Haute |
| 🟢 Basse | Analytics stories (likes count, pas juste vues) | Moyenne |
| 🟢 Basse | WebSocket pour likes/comments temps réel | Haute |
| 🟢 Basse | Cursor-based pagination pour Reels | Moyenne |
