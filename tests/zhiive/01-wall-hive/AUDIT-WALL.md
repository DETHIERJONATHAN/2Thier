# 🐝 AUDIT APP 1 — HIVE (Wall / Fil)

> **Fichier principal** : `src/pages/DashboardPageUnified.tsx` (~2500 lignes)
> **Date d'audit** : 24 mars 2026

---

## 📋 SOUS-APPLICATIONS

| Sous-App | Composant | Statut | Description |
|----------|-----------|--------|-------------|
| **Feed (Fil)** | DashboardPageUnified | ⚠️ | Flux de publications (infinite scroll) |
| **Post Composer** | Intégré dans Dashboard | ⚠️ | Création de posts (texte, média, mood, catégorie) |
| **Réactions** | WallPostCard | ✅ | 5 types : 👍 Pollen, ❤️ Nectar, 👏 Bravo, 💡 Gold, 😮 Wow |
| **Commentaires** | WallPostCard | ⚠️ | Commentaires imbriqués avec réponses |
| **Partage** | ShareModal | 🔴 | Partage vers Hive, réseaux sociaux, copie lien |
| **Filtre Feed** | FeedFilter | ⚠️ | Par catégorie (projet, chantier, promo...) |
| **Média** | MediaUploader | ✅ | Upload image/vidéo (max 10 fichiers) |

---

## ✅ CE QUI FONCTIONNE BIEN

1. **Identité centralisée** — Utilise `useActiveIdentity()` correctement
2. **Sync visibilité** — `useEffect` synchronise la visibilité avec `identity.isOrgMode` (lignes 1613-1615)
3. **Création de post** — `publishAsOrg: identity.publishAsOrg` correctement envoyé
4. **Réactions** — 5 types fonctionnels avec picker emoji
5. **Commentaires imbriqués** — Système de réponses qui fonctionne
6. **Upload média** — Max 10 fichiers, validation type/taille
7. **Infinite scroll** — Pagination correcte

---

## 🔴 BUGS CRITIQUES

### BUG #1 : Share Modal — État dupliqué `shareAsOrg`
- **Lignes** : 703-836
- **Problème** : Le modal de partage crée un état local `shareAsOrg` au lieu d'utiliser l'identité centralisée
- **Impact** : Si l'utilisateur change de mode (Bee→Colony) pendant que le modal est ouvert, le partage reste en mode personnel
- **Correctif** : Supprimer `useState(shareAsOrg)`, utiliser `cardIdentity.publishAsOrg` directement

### BUG #2 : Avatar commentaire vide en mode org
- **Lignes** : 1239-1241
- **Problème** : La condition icon exclut les orgs sans logo → cercle blanc vide
- **Impact** : UI cassée pour les commentaires d'organisations sans logo
- **Correctif** : Ajouter fallback text `{cardIdentity.avatarFallback}`

---

## 🟠 BUGS MAJEURS

### BUG #3 : Filtre feed non reset au changement de mode
- **Ligne** : 1576
- **Problème** : `feedFilter` ne se réinitialise pas quand `feedMode` change
- **Impact** : Filtres personnels appliqués sur flux org et vice-versa

### BUG #4 : Couleur avatar réponse hardcodée
- **Ligne** : 1183
- **Problème** : `"#bbb"` hardcodé au lieu de design system `SF.primary`

### BUG #5 : Race condition partage
- **Lignes** : 1265-1288
- **Problème** : `setShareAsOrg` capture la valeur d'identité au moment du clic, pas au moment du rendu

---

## 🟡 BUGS MINEURS

### BUG #6 : Erreurs chargement feed silencieuses
- **Lignes** : 1649-1657
- **Problème** : `catch` log en console mais pas de notification utilisateur

### BUG #7 : Pas de barre de progression upload média
- **Lignes** : 1701-1729
- **Problème** : Pas d'indication de progression pour les gros fichiers

### BUG #8 : WallPostCard props morts
- **Lignes** : 1036-1046
- **Problème** : Props `feedMode` et `currentOrganization` déclarés mais bloqués (code mort)

### BUG #9 : Type `Story` incomplet (manque publishAsOrg)
- **Interface StoriesBar.tsx:11**
- **Problème** : L'interface `Story` n'a pas le champ `publishAsOrg`

---

## 🎯 UTILITÉ & VISION MARKETING

### Ce que le Hive apporte aujourd'hui :
- **Communication interne** : Les membres d'une organisation partagent des projets, chantiers réalisés, promos
- **Engagement communautaire** : Réactions typées (Pollen, Nectar, Bravo) = vocabulaire apicole unique  
- **Visibilité contrôlée** : Public / Colony (interne) / Privé

### Ce qui manque pour maximiser la valeur :
1. **Posts épinglés** — Permettre d'épingler un post important en haut du fil
2. **Mentions @user** — Mentionner des collègues dans les posts
3. **Sondages inline** — Créer des sondages directement dans le fil
4. **Bookmarks** — Sauvegarder des posts pour plus tard
5. **Analytics de post** — Voir la portée, l'engagement de chaque post
6. **Rich text editor** — Mise en forme (gras, italique, listes) dans les posts
7. **Scheduled posts** — Programmer la publication

### Avantage concurrentiel :
Le vocabulaire apicole (Pollen = Like, Nectar = Love, Buzz = Commentaire) crée une **identité forte** et différenciante. C'est un atout marketing majeur que les plateformes génériques n'ont pas.

---

## 📊 SCORE DÉTAILLÉ

| Critère | Score | Détail |
|---------|-------|--------|
| Identité (publishAsOrg) | 8/10 | Bien implémenté sauf modal partage |
| Stabilité hooks | 7/10 | Quelques re-renders inutiles |
| UX/Feedback utilisateur | 5/10 | Erreurs silencieuses, pas de progress upload |
| Fonctionnalité | 7/10 | Core solide, features avancées manquantes |
| Type safety | 6/10 | Quelques `any`, interface Story incomplète |
| **GLOBAL** | **5/10** | **Fonctionnel mais bugs identité partage** |
