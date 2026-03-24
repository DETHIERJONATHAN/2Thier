# 📸 AUDIT APP 2 — STORIES

> **Fichier frontend** : `src/components/zhiive/StoriesBar.tsx`
> **Fichier backend** : `src/routes/zhiive.ts` (lignes 72-132)
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
| **Barre de Stories** | ⚠️ | Carousel horizontal en haut du fil |
| **Création Story** | 🔴 | Upload image/vidéo + texte + visibilité |
| **Visualisation Story** | ⚠️ | Modal plein écran avec auto-next |
| **Story Organisation** | 🔴 | Publication en tant qu'org → CASSÉ |
| **Story Highlight** | ✅ | Stories épinglées (isHighlight) |

---

## 🔴🔴🔴 BUG PRINCIPAL SIGNALÉ PAR L'UTILISATEUR

### ❌ "Les stories postent toujours comme Bee même en mode Colony"

**CAUSE RACINE IDENTIFIÉE** : Double bug backend

#### Bug 1/2 : Backend n'extrait pas `publishAsOrg` (ÉCRITURE)
```
Fichier : src/routes/zhiive.ts
Ligne  : 114
Code   : const { mediaUrl, mediaType, text, visibility } = req.body;
         // ❌ publishAsOrg n'est PAS extrait !

Ligne  : 116-126
Code   : const story = await db.story.create({
           data: {
             authorId: userId,
             organizationId: orgId,
             mediaUrl, mediaType: mediaType || 'image',
             caption: text,
             visibility: [...], 
             expiresAt: ...,
             // ❌ publishAsOrg ABSENT → défaut false (schéma Prisma)
           },
         });
```

#### Bug 2/2 : Backend renvoie toujours le nom personnel (LECTURE)
```
Fichier : src/routes/zhiive.ts
Lignes : 96-105
Code   : stories.map(s => ({
           userName: `${s.author.firstName} ${s.author.lastName}`.trim(),
           avatarUrl: s.author.avatarUrl,
           // ❌ NE VÉRIFIE JAMAIS publishAsOrg
           // ❌ NE RENVOIE JAMAIS le nom/logo de l'organisation
         }))
```

#### Flux complet du bug :
```
1. Frontend (StoriesBar.tsx) → publishAsOrg: true      ✅ OK
2. API POST /stories        → req.body.publishAsOrg    ✅ Envoyé
3. Backend extrait req.body  → { mediaUrl, text, ... } ❌ publishAsOrg IGNORÉ
4. DB story.create()        → publishAsOrg: false      ❌ Défaut false
5. GET /stories/feed        → userName: auteur perso   ❌ Jamais l'org
6. UI affiche               → "Jonathan Dethier"       ❌ Au lieu de "Org Name"
```

#### CORRECTIF NÉCESSAIRE :

**1. POST /stories (écriture) — ligne 114 :**
```typescript
// AVANT :
const { mediaUrl, mediaType, text, visibility } = req.body;

// APRÈS :
const { mediaUrl, mediaType, text, visibility, publishAsOrg } = req.body;

// Et dans db.story.create() :
data: {
  ...
  publishAsOrg: publishAsOrg && !!orgId ? true : false,
}
```

**2. GET /stories/feed (lecture) — lignes 79 et 96-105 :**
```typescript
// Ajouter include organization dans le findMany :
include: {
  author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  organization: { select: { id: true, name: true, logoUrl: true } },  // AJOUTER
  views: { where: { viewerId: userId }, select: { id: true } },
},

// Et dans le map :
stories.map(s => {
  const isOrg = s.publishAsOrg && s.organization;
  return {
    id: s.id,
    userId: s.authorId,
    userName: isOrg ? s.organization!.name : `${s.author.firstName} ${s.author.lastName}`.trim(),
    avatarUrl: isOrg ? (s.organization!.logoUrl || null) : s.author.avatarUrl,
    publishAsOrg: s.publishAsOrg,  // AJOUTER au retour
    mediaUrl: s.mediaUrl,
    mediaType: s.mediaType,
    viewed: s.views.length > 0,
    createdAt: s.createdAt,
  };
})
```

---

## 🔴 AUTRES BUGS

### BUG #3 : Visibilité initiale ne se met pas à jour
- **Ligne** : StoriesBar.tsx:72
- **Problème** : `useState(currentOrganization ? 'IN' : 'ALL')` — évalué UNE SEULE FOIS au montage
- **Impact** : Changer de mode ne change pas la visibilité par défaut du modal
- **Correctif** : Ajouter un `useEffect` pour synchroniser

### BUG #4 : Interface `Story` manque publishAsOrg
- **Ligne** : StoriesBar.tsx:11
- **Problème** : Le type `Story` n'a pas `publishAsOrg?: boolean`
- **Impact** : La conditionnelle `viewingStory.publishAsOrg` (ligne 214) est toujours `undefined`

### BUG #5 : Avatar "My Story" mélange identité centralisée et directe
- **Lignes** : StoriesBar.tsx:47-53
- **Problème** : Vérifie `currentUser?.avatarUrl` directement au lieu d'utiliser `identity.avatarUrl`

---

## 🟠 BUGS MAJEURS

### BUG #6 : Pas de confirmation avant suppression de story
- **Impact** : L'utilisateur peut supprimer une story par accident

---

## 🟡 BUGS MINEURS

### BUG #7 : Pas de compteur de vues sur la story
- **Impact** : Pas de feedback sur la portée

### BUG #8 : Pas de réaction/commentaire sur les stories
- **Impact** : Engagement limité vs Instagram Stories

---

## 🎯 UTILITÉ & VISION MARKETING

### Ce que les Stories apportent :
- **Contenu éphémère** (24h) = urgence de consulter
- **Format visuel** = engagement élevé
- **Highlights** = persistance sélective
- **Vitrine organisation** = profil vivant de l'entreprise

### Ce qui manque :
1. **Stickers interactifs** — Sondages, questions, compteurs dans les stories
2. **Mentions dans stories** — Taguer des utilisateurs/organisations
3. **Musique/audio** — Ajouter une bande sonore
4. **Filtre AR** — Filtres visuels sur les photos
5. **Story Collaborative** — Plusieurs auteurs pour une story (événement)
6. **Réponse privée** — Répondre à une story via message direct (Whisper)
7. **Insights Story** — Qui a vu, taux de rétention, interactions

### Valeur pour la Ruche :
Les stories sont le **pouls quotidien** de la Ruche. Elles montrent l'activité en temps réel. Le bug actuel (toujours en mode bee) **neutralise** cette valeur pour les organisations.

---

## 📊 SCORE DÉTAILLÉ

| Critère | Score | Détail |
|---------|-------|--------|
| Identité frontend | 8/10 | Utilise useActiveIdentity correctement |
| Identité backend | 1/10 | 🔴 publishAsOrg ignoré, lecture toujours perso |
| Visibilité sync | 3/10 | Défaut statique, pas de sync dynamique |
| Fonctionnalité | 5/10 | Base OK mais pas de réactions/commentaires |
| Backend robustesse | 4/10 | Pas d'include org, pas de retour publishAsOrg |
| **GLOBAL** | **3/10** | **🔴 Bug bloquant : identité org cassée** |
