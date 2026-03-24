# 🧭 AUDIT APP 4 — SCOUT (Explore)

> **Fichier frontend** : `src/components/zhiive/ExplorePanel.tsx`
> **Fichier backend** : `src/routes/zhiive.ts` (routes explore/*)
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
| **Galerie** | ⚠️ | Grille 3 colonnes, filtres scope/média/catégorie/tri |
| **Bees (People)** | ⚠️ | Découverte d'utilisateurs, follow, demandes d'amis |
| **Hashtags** | 🔴 | Affichage des hashtags tendances — CASSÉ |

---

## ✅ CE QUI FONCTIONNE BIEN

1. **Identité centralisée** ✅ — `useActiveIdentity()` (ligne 17)
2. **Galerie** ✅ — Grille responsive, filtres multi-critères
3. **Recherche** ✅ — Barre de recherche fonctionnelle
4. **Filtres scope** ✅ — All / Friends / Colony / Private
5. **Filtres média** ✅ — Tous / Photos / Vidéos / Tendances
6. **Catégories** ✅ — 8 catégories explorables
7. **Like galerie** ✅ — Réactions sur les items
8. **Follow/unfollow** ✅ — Système fonctionnel

---

## 🔴 BUGS CRITIQUES

### BUG #1 : Hashtags — Feature morte
- **Lignes** : 740-771
- **Problème** : Les hashtags s'affichent mais ne sont PAS cliquables
- **Impact** : L'onglet Hashtags est inutile, pas de navigation vers les résultats
- **Correctif** : Ajouter onClick → navigation vers recherche filtrée

### BUG #2 : Commentaire optimistic update sans rollback
- **Ligne** : 192
- **Problème** : Le commentaire apparaît dans l'UI AVANT la confirmation API
- **Impact** : Si l'API échoue, le commentaire fantôme reste affiché

---

## 🟠 BUGS MAJEURS

### BUG #3 : API failures silencieuses (Galerie)
- **Lignes** : 243-245
- **Problème** : `.catch(() => ({ items: [] }))` — erreur réseau = galerie vide sans message
- **Impact** : Utilisateur voit "rien" sans comprendre pourquoi

### BUG #4 : Messenger via CustomEvent fragile
- **Lignes** : 346-352
- **Problème** : `window.dispatchEvent(new CustomEvent('open-messenger'))` sans garantie de listener
- **Impact** : Le bouton message peut ne rien faire si le listener n'est pas monté

### BUG #5 : N+1 Query (Backend — Suggested Users)
- **Lignes backend** : zhiive.ts:568-575
- **Problème** : 30 requêtes DB séparées pour les amis mutuels au lieu d'un JOIN
- **Impact** : Performance dégradée sur grands datasets

### BUG #6 : Refetch inutile au changement de peopleScope
- **Ligne** : 263
- **Problème** : `peopleScope` dans les dépendances de `fetchGallery` → la galerie se recharge quand le filtre People change

### BUG #7 : Pas de loading state sur les boutons d'action
- **Lignes** : 687, 705, 346
- **Problème** : Follow, Friend request, Messenger — pas de visual feedback pendant l'appel API

---

## 🟡 BUGS MINEURS

### BUG #8 : Stories affichent likes au lieu de vues
- **Ligne** : 163
- **Problème** : Icône ❤️ au lieu de 👁 pour les stories dans la galerie

### BUG #9 : Pas d'infinite scroll / Load More
- **Impact** : Galerie limitée à 40 items, pas de pagination

### BUG #10 : Pas de skeleton loading sur refetch
- **Impact** : Au changement de filtre, pas d'indication de chargement

### BUG #11 : Messages d'erreur inconsistants
- **Lignes** : 290/303/335
- **Problème** : Mélange français/anglais dans les toasts

---

## 🎯 UTILITÉ & VISION MARKETING

### Ce que Scout apporte :
- **Découverte de contenu** — Galerie visuelle type Instagram Explore
- **Découverte de personnes** — Trouver des Bees (utilisateurs) à suivre
- **Tendances** — Voir ce qui buzz dans la Ruche
- **Networking** — Connexion directe via follow/amis/message

### Ce qui manque :
1. **Hashtags fonctionnels** — Cliquer pour voir le contenu associé
2. **Recommandation IA** — "Bees à découvrir" basé sur activité/intérêts
3. **Recherche géolocalisée** — Trouver des bees proches
4. **Recherche par compétence/métier** — Filtre professionnels  
5. **Profil enrichi** — Page profil complète (bio, portfolio, stats)
6. **QR code Bee** — Scanner pour suivre un utilisateur
7. **Carte interactive** — Visualiser les bees sur une carte
8. **Stories dans l'exploration** — Mélanger stories + posts dans la galerie

### Valeur pour la Ruche :
Scout est le **moteur de découverte** de la Ruche. C'est par là que les nouvelles connexions se créent. Le bug des hashtags réduit significativement la navigabilité du contenu.

---

## 📊 SCORE DÉTAILLÉ

| Critère | Score | Détail |
|---------|-------|--------|
| Identité (publishAsOrg) | 10/10 | ✅ Parfait |
| Galerie filtres | 8/10 | ✅ Multi-filtres, bien fait |
| Hashtags | 1/10 | 🔴 Feature morte |
| People discovery | 6/10 | ⚠️ N+1 query, pas de loading states |
| Error handling | 4/10 | Erreurs silencieuses |
| Performance backend | 5/10 | N+1 query problem |
| **GLOBAL** | **5.7/10** | **Galerie bien, hashtags cassés, perf backend** |
