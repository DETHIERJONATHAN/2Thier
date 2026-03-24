# 🎬 AUDIT APP 3 — REELS

> **Fichier frontend** : `src/components/zhiive/ReelsPanel.tsx`
> **Fichier backend** : `src/routes/zhiive.ts` (route GET /reels, ~lignes 450-515)
> **Date d'audit** : 24 mars 2026

---

## 🚨 RÈGLES ABSOLUES

> **ZÉRO STOCKAGE LOCAL** : Aucun `localStorage`/`sessionStorage`. Tout en base de données via API.
>
> **ZÉRO VALEUR HARDCODÉE** : Aucune couleur (`#6C5CE7`), texte français, magic number, URL en dur.
> Utiliser `SF.*`/`FB.*`/`COLORS.*` pour les couleurs, `t('clé')` pour les textes, constantes nommées pour les nombres.

---

## 📋 SOUS-APPLICATIONS

| Sous-App | Statut | Description |
|----------|--------|-------------|
| **Carousel Vidéo** | ✅ | Défilement vertical type TikTok/IG Reels |
| **Création Reel** | ⚠️ | Upload vidéo + légende + visibilité |
| **Commentaires Reel** | ✅ | Modal commentaires avec identité correcte |
| **Réactions (Like)** | ✅ | Système de likes toggle |
| **Partage** | ⚠️ | Rebuzz + natif + copie lien |
| **Follow/Unfollow** | ✅ | Depuis le carousel |
| **Sauvegarde** | ✅ | Bookmark persisté en base de données (table `SavedReel`) |

---

## ✅ CE QUI FONCTIONNE BIEN

1. **Identité centralisée** ✅ — `useActiveIdentity()` correctement utilisé
2. **Création reel** ✅ — `publishAsOrg: identity.publishAsOrg` envoyé (ligne 293)
3. **Commentaires** ✅ — `identity.publishAsOrg` envoyé (ligne 342)
4. **Video playback** ✅ — Auto-play, mute, scroll-snap, pause-on-click
5. **Follow/unfollow** ✅ — Fonctionne correctement
6. **Save/bookmark** ✅ — Persisté en DB via table `SavedReel` + endpoints API (`GET/POST/DELETE /saved-reels`)

---

## 🔴 BUGS CRITIQUES

### BUG #1 : Visibilité ne se réinitialise pas au changement de mode
- **Ligne** : 71
- **Code** : `useState<string>(currentOrganization ? 'IN' : 'ALL')`
- **Problème** : Évalué UNE SEULE FOIS au montage
- **Impact** : Switch Bee→Colony ne change pas la visibilité par défaut
- **Correctif** :
```typescript
useEffect(() => {
  setReelVisibility(currentOrganization ? 'IN' : 'ALL');
}, [currentOrganization]);
```

### BUG #2 : Rebuzz hardcode `visibility: 'ALL'`
- **Ligne** : 203-206
- **Code** : `visibility: 'ALL'` dans le POST du rebuzz
- **Problème** : Le repartage est toujours public, impossible de partager en interne
- **Correctif** : Utiliser `reelVisibility` ou demander visibilité à l'utilisateur

### BUG #3 : useEffect manque `currentOrganization` dans les dépendances
- **Lignes** : 98-102
- **Code** : `[feedMode]` — devrait être `[feedMode, currentOrganization, api]`
- **Problème** : Si seule l'org change (sans feedMode), les reels ne se rechargent pas

---

## 🟠 BUGS MAJEURS

### BUG #4 : Stale closure dans handlePostComment
- **Ligne** : 329-355
- **Problème** : `identity.publishAsOrg` capturé au rendu, pas au moment du post
- **Impact** : Si l'identité change entre le rendu et le clic, mauvaise attribution

### BUG #5 : Pas de notification d'erreur sur loadReels()
- **Ligne** : 107-128
- **Problème** : API failure donne un feed vide sans dire pourquoi

---

## 🟡 BUGS MINEURS

### BUG #6 : `toggleLike` non mémorisé
- **Ligne** : 159
- **Impact** : Recréé à chaque rendu, re-renders enfants inutiles

### BUG #7 : Likes fire-and-forget sans validation
- **Lignes** : 159-169
- **Impact** : Like pourrait échouer silencieusement

### BUG #8 : Valeurs identité non mémorisées
- **Lignes** : 49-56
- **Impact** : Re-renders enfants potentiellement inutiles

### BUG #9 : Pas d'UI de tri/filtre
- **Impact** : Feed toujours dans le même ordre (likes desc, date desc)

### BUG #10 : File validation utilise alert
- **Lignes** : 121-125
- **Impact** : Feedback non-persistant, UX pauvre

---

## 🎯 UTILITÉ & VISION MARKETING

### Ce que les Reels apportent :
- **Format vidéo court** = Le format le plus engageant du web (TikTok, IG Reels)
- **Découverte de contenu** = Carousel vertical addictif
- **Expression créative** = Partage moments vidéo

### Ce qui manque pour maximiser la valeur :
1. **Éditeur vidéo intégré** — Trimmer, musique, texte superposé, transitions
2. **Duet / Stitch** — Répondre à un reel avec un reel (format TikTok)
3. **Trending sounds** — Bibliothèque de sons/musiques
4. **Hashtag discovery** — Reels par hashtag
5. **Analytics reel** — Vues, rétention, partages, profil des viewers
6. **Recommandation algorithmique** — Feed "Pour Toi" basé sur intérêts
7. **Draft/Brouillon** — Commencer un reel et le finir plus tard
8. **Filtres/Effets caméra** — AR effets visuels

### Avantage concurrentiel :
Format vidéo court intégré dans un outil professionnel = **unique sur le marché B2B**. Aucun CRM/ERP ne propose ça. C'est un atout majeur pour l'engagement des équipes et la communication d'entreprise.

---

## 📊 SCORE DÉTAILLÉ

| Critère | Score | Détail |
|---------|-------|--------|
| Identité (publishAsOrg) | 9/10 | ✅ Bien implémenté frontend + backend |
| Video playback | 9/10 | ✅ Scroll-snap, auto-play, mute |
| Visibilité sync | 9/10 | ✅ Corrigé Pass 1 — useEffect sync |
| Saved Reels | 10/10 | ✅ Persisté en DB — zéro localStorage (Pass 3) |
| Comment Like | 10/10 | ✅ Persisté en DB — toggle API + chargement likes (Pass 3) |
| UX/Feedback | 5/10 | Erreurs silencieuses, pas de tri |
| Performance | 6/10 | Callbacks non mémorisés |
| **GLOBAL** | **8/10** | **Tout persisté en DB, identité OK, visibilité corrigée** |

---

## 🚨 RÈGLE CRITIQUE — ZÉRO STOCKAGE LOCAL

> **AUCUN `localStorage`, AUCUN `sessionStorage`, AUCUN `useState` seul pour des données utilisateur.**
> Tout doit passer par l'API backend → PostgreSQL.
>
> **Corrections appliquées (Pass 3)** :
> - Saved Reels : était `localStorage.setItem(...)` → maintenant `api.post(/saved-reels/:id)` + table `SavedReel`
> - Comment Like : était `useState<Set>` vide → maintenant `api.post(/comments/:id/like)` + table `CommentLike`
> - Chargement des likes existants via `POST /comments/liked` à l'ouverture des commentaires
> - **0 occurrence de `localStorage` restante** dans `ReelsPanel.tsx`
