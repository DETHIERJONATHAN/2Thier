# 🔗 AUDIT INTÉGRATION — Bugs Transversaux

> Tests cross-application et patterns récurrents
> **Date d'audit** : 24 mars 2026

---

## 🔴 PATTERN #1 : `publishAsOrg` manquant (LE BUG PRINCIPAL)

Le système d'identité centralisée `useActiveIdentity()` fonctionne correctement côté frontend. **MAIS** plusieurs backends et frontends ne transmettent/traitent pas le `publishAsOrg`.

### Tableau de conformité complète :

| App | Frontend envoie `publishAsOrg` | Backend extrait `publishAsOrg` | Backend sauve en DB | Backend retourne dans GET | Score |
|-----|------|------|------|------|------|
| **Wall (Posts)** | ✅ | ✅ | ✅ | ✅ | 4/4 ✅ |
| **Wall (Comments)** | ✅ | ✅ | ✅ | ✅ | 4/4 ✅ |
| **Wall (Share)** | ⚠️ duplicated | ⚠️ | ⚠️ | ✅ | 2/4 ⚠️ |
| **Stories** | ✅ | ❌ | ❌ | ❌ | 1/4 🔴 |
| **Reels (Create)** | ✅ | ✅ | ✅ | ✅ | 4/4 ✅ |
| **Reels (Comment)** | ✅ | ✅ | ✅ | ✅ | 4/4 ✅ |
| **Reels (Rebuzz)** | ❌ hardcoded | N/A | N/A | N/A | 0/4 🔴 |
| **Scout (Comment)** | ✅ | ✅ | ✅ | ✅ | 4/4 ✅ |
| **Universe Events** | ✅ | ✅ | ✅ | ✅ | 4/4 ✅ |
| **Universe Capsules** | ❌ | ❌ | ❌ | ❌ | 0/4 🔴 |
| **Flow Sparks** | ✅ | ✅ | ✅ | ✅ | 4/4 ✅ |
| **Flow Battles** | ❌ | ✅ (prêt) | ✅ (prêt) | ✅ | 1/4 🔴 |

**4 endpoints cassés / 12 total = 33% de perte d'identité org**

---

## 🔴 PATTERN #2 : Visibilité ne sync pas avec feedMode

Le même bug exact se répète dans 3 composants :

```typescript
// Ce code identique est cassé dans 3 fichiers :
const [visibility, setVisibility] = useState(currentOrganization ? 'IN' : 'ALL');
// ❌ Évalué UNE SEULE FOIS au montage, pas de useEffect pour synchroniser
```

| Composant | Ligne | Status |
|-----------|-------|--------|
| StoriesBar.tsx | 72 | ❌ Pas de sync |
| ReelsPanel.tsx | 71 | ❌ Pas de sync |
| FlowPanel.tsx | 78 | ❌ Pas de sync |
| DashboardPageUnified.tsx | 1613-1615 | ✅ A le useEffect |

**Le Wall/Hive est le SEUL** composant à avoir corrigé ce bug (useEffect de sync).

### Correctif type pour les 3 composants :
```typescript
useEffect(() => {
  setVisibility(currentOrganization ? 'IN' : 'ALL');
}, [currentOrganization]);
```

---

## 🔴 PATTERN #3 : Erreurs API silencieuses

Tous les composants utilisent le même anti-pattern :

```typescript
const data = await api.get('/api/...').catch(() => ({ items: [] }));
// ❌ Erreur silencieuse — l'utilisateur voit "vide" sans explication
```

| Composant | Ligne(s) | Catch silencieux |
|-----------|----------|-----------------|
| ReelsPanel.tsx | 107-128 | ✅ Oui |
| ExplorePanel.tsx | 243-245 | ✅ Oui |
| UniversePanel.tsx | 84-87 | ✅ Oui |
| FlowPanel.tsx | 85-95 | ✅ Oui |
| DashboardPageUnified.tsx | 1649-1657 | ✅ Oui (console.error seulement) |

**5/5 composants ont des erreurs silencieuses**

---

## 🔴 PATTERN #4 : State `_loading` déclaré mais inutilisé

| Composant | Ligne | Utilisé dans le rendu? |
|-----------|-------|----------------------|
| UniversePanel.tsx | 81 | ❌ Non |
| FlowPanel.tsx | 66 | ❌ Non |

---

## 🟡 PATTERN #5 : Terminologie incohérente

| Composant | Terme utilisé | Terme correct (lexique) |
|-----------|---------------|----------------------|
| UniversePanel.tsx:307 | "Colony" | "Organisation" ou "Ruche" |
| ExplorePanel.tsx | Mélange FR/EN dans les erreurs | Choisir une langue |

---

## 📊 MATRICE DE TEST CROISÉ

### Test : Changer de mode Bee ↔ Colony 

| Action | Wall | Stories | Reels | Scout | Universe | Flow |
|--------|------|---------|-------|-------|----------|------|
| Créer contenu en mode Colony | ✅ Post org | ❌ Post perso | ✅ Reel org | N/A | ⚠️ Event OK, Capsule perso | ⚠️ Spark OK, Battle perso |
| Visibilité defaulte à IN | ✅ | ❌ | ❌ | N/A | ✅ | ❌ |
| Avatar affiche org | ✅ | ❌ | ✅ | N/A | ✅ | ⚠️ |
| Nom affiche org | ✅ | ❌ | ✅ | N/A | ✅ | ⚠️ |
| Commentaire attribué org | ⚠️ (avatar vide) | N/A | ✅ | ✅ | N/A | N/A |

### Test : Filtres

| Filtre | Wall | Stories | Reels | Scout | Universe | Flow |
|--------|------|---------|-------|-------|----------|------|
| Reset au changement de mode | ❌ | N/A | N/A | ✅ | N/A | N/A |
| Catégorie/type | ✅ | N/A | ❌ | ✅ (8 catégories) | ❌ | N/A |
| Recherche | ❌ | N/A | ❌ | ✅ | ❌ | ❌ |
| Tri (newest/trending) | ❌ | N/A | ❌ | ✅ | ❌ | ❌ |

---

## 🏗️ PLAN DE CORRECTION PAR PRIORITÉ

### 🔴 SEMAINE 1 — Fixes critiques identité
1. ✅ Stories backend : extraire et sauver `publishAsOrg`
2. ✅ Stories backend : retourner nom/avatar org dans GET
3. ✅ Battles frontend : ajouter `publishAsOrg`
4. ✅ Capsules frontend : ajouter `publishAsOrg`
5. ✅ Capsules backend : traiter `publishAsOrg`

### 🟠 SEMAINE 2 — Sync visibilité
6. ✅ StoriesBar : useEffect sync visibilité
7. ✅ ReelsPanel : useEffect sync visibilité
8. ✅ FlowPanel : useEffect sync visibilité

### 🟡 SEMAINE 3 — Error handling
9. Ajouter toasts d'erreur sur tous les catch silencieux
10. Implémenter skeleton loading avec `_loading` state

### 💜 SEMAINE 4 — Features manquantes prioritaires
11. Hashtags fonctionnels dans Scout
12. Métriques Pulse réelles
13. Statut en ligne Orbite
14. Progression quêtes
