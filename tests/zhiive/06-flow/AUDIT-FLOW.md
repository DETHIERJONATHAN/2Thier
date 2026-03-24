# 🌊 AUDIT APP 6 — FLOW

> **Fichier frontend** : `src/components/zhiive/FlowPanel.tsx`
> **Fichier backend** : `src/routes/zhiive.ts` (routes sparks/battles/quests)
> **Date d'audit** : 24 mars 2026

---

## 📋 SOUS-APPLICATIONS

| Sous-App | Statut | Description |
|----------|--------|-------------|
| **Spark** | ✅ | Micro-posts anonymes avec seuil de révélation (100 votes) |
| **Battles** | ✅ | Défis communautaires avec challenger vs opponent |
| **Quêtes** | ✅ | Missions gamifiées (daily/weekly/monthly/special) |

---

## ✅ CE QUI FONCTIONNE BIEN

1. **Identité centralisée** ✅ — `useActiveIdentity()` (ligne 13)
2. **Spark creation** ✅ — `publishAsOrg: identity.publishAsOrg` (ligne 111)
3. **Spark voting** ✅ — Anti-double vote, auto-reveal à 100 votes
4. **Battle join** ✅ — Anti-self-join, anti-double-join
5. **Quest display** ✅ — Progress bar, types color-coded
6. **Mode-aware queries** ✅ — Filtre personal/org sur tous les endpoints
7. **Error handling création** ✅ — Messages d'erreur utilisateur sur create/vote/join

---

## 🔴 BUGS CRITIQUES

### BUG #1 : Battles n'envoient PAS `publishAsOrg`
- **Lignes** : 304-307
- **Problème** : Le POST `/api/zhiive/battles` n'inclut pas `publishAsOrg`
- **Contraste** : Les sparks l'envoient (ligne 111) ← incohérence dans le même composant !
- **Impact** : Impossible de créer un battle au nom de l'organisation
- **Correctif** :
```typescript
await api.post('/api/zhiive/battles', {
  title: battleTitle.trim(),
  description: battleDesc.trim(),
  endsAt: battleEndsAt?.toISOString(),
  publishAsOrg: identity.publishAsOrg,  // AJOUTER
});
```

### BUG #2 : fetchFlow() — Erreurs silencieuses
- **Lignes** : 85-95
- **Problème** : `.catch(() => ({ sparks: [] }))` — aucun message utilisateur
- **Impact** : Feed vide sans explication quand l'API est down

---

## 🟠 BUGS MAJEURS

### BUG #3 : Race condition dans le vote
- **Lignes** : 244-250
- **Problème** : `res.sparkCount ?? s.sparkCount + 1` — fallback local qui peut diverger du serveur
- **Impact** : Si 2 utilisateurs votent simultanément, le compteur local peut être faux
- **Correctif** : Faire confiance au backend, ne pas utiliser de fallback

### BUG #4 : `_loading` state inutilisé
- **Ligne** : 66
- **Problème** : `const [_loading, setLoading] = useState(true)` — set mais jamais lu
- **Impact** : Aucun skeleton/loading indicator pendant le chargement initial

### BUG #5 : Pas de endpoint complétion de quêtes
- **Backend** : Pas de POST `/quests/:id/complete` ni `/quests/:id/update`
- **Impact** : Les quêtes sont en lecture seule — l'utilisateur ne peut pas progresser
- **Question** : Les quêtes sont-elles censées être auto-calculées par le serveur?

---

## 🟡 BUGS MINEURS

### BUG #6 : Type `sparkVisibility` trop large
- **Ligne** : 78
- **Code** : `useState<string>` au lieu de `useState<'IN' | 'ALL' | 'OUT'>`
- **Impact** : Pas de protection TypeScript contre valeurs invalides

### BUG #7 : Seuil de révélation Spark hardcodé
- **Backend** : zhiive.ts:1057 → `isRevealed: totalVotes >= 100`
- **Impact** : Impossible de personnaliser le seuil par spark
- **Note** : Pourrait être un choix de design intentionnel

### BUG #8 : Pas de validation opponentId dans les battles
- **Backend** : zhiive.ts:843-862
- **Impact** : On peut créer un battle avec un opponent inexistant

---

## 🎯 UTILITÉ & VISION MARKETING

### Ce que Flow apporte :

#### Spark ⚡
- **Concept** : Posts anonymes qui ne sont révélés que quand 100 personnes votent
- **Valeur** : Encourage la prise de parole anonyme, les idées audacieuses
- **Innovation** : Concept unique, mélange secret + vote communautaire
- **Usage B2B** : Feedback anonyme, suggestions, whistleblowing soft

#### Battles 🏆
- **Concept** : Défis communautaires entre membres
- **Valeur** : Gamification, compétition saine, engagement
- **Usage B2B** : Challenges commerciaux, concours internes, team building

#### Quêtes ⭐
- **Concept** : Missions gamifiées (daily/weekly/monthly/special)
- **Valeur** : Retention, engagement quotidien, onboarding
- **Usage B2B** : Formation gamifiée, objectifs d'équipe, onboarding

### Ce qui manque :

#### Spark :
1. **Seuil personnalisable** — Choisir entre 10, 50, 100 votes
2. **Catégories de spark** — Idée, Feedback, Question, Blague
3. **Récompense au révélation** — Points bonus pour l'auteur d'un spark populaire
4. **Statistiques** — Combien de sparks j'ai créé/révélé

#### Battles :
1. **Identity org** — 🔴 PRIORITÉ : `publishAsOrg` manquant
2. **Entries/Soumissions** — Poster des réponses au défi
3. **Voting sur entries** — La communauté vote pour la meilleure soumission
4. **Leaderboard** — Classement des battles gagnés
5. **Récompenses** — Points/badges pour le gagnant
6. **Catégories** — Créatif, Business, Sport, Technique...
7. **Battle en équipe** — Équipe vs Équipe (pas juste individuel)

#### Quêtes :
1. **Progression auto-calculée** — Le serveur devrait tracker les actions automatiquement
2. **Notifications** — "Nouvelle quête disponible !" / "Tu as complété ta quête daily !"
3. **Récompenses** — Points, badges, titres honorifiques
4. **Quêtes custom** — Les admins créent leurs propres quêtes
5. **Chaîne de quêtes** — Quêtes séquentielles formant une "storyline"

### Avantage concurrentiel :
**Flow** est la **couche de gamification** de Zhiive. C'est ce qui transforme un outil de communication en **expérience engageante**. Les concepts de Spark (anonymat + vote communautaire) et Quêtes (gamification) sont des **innovations fortes**. Mais sans le système de récompenses et de progression, Flow reste un prototype.

---

## 📊 SCORE DÉTAILLÉ

| Critère | Score | Détail |
|---------|-------|--------|
| Identité Spark | 10/10 | ✅ publishAsOrg correct |
| Identité Battles | 10/10 | ✅ publishAsOrg corrigé (Pass 1) |
| Quêtes | 8/10 | ✅ Endpoint `POST /quests/:id/progress` créé (Pass 3) |
| Skip Spark | 10/10 | ✅ Persisté en DB via `SparkDismiss` (Pass 3) — zéro localStorage |
| Error handling | 5/10 | ✅ Create OK, ❌ Fetch silencieux |
| Gamification | 6/10 | Prometteur — progression backend OK, rewards à brancher |
| **GLOBAL** | **8/10** | **Tout persisté en DB, identité OK, quests interactives** |

---

## 🚨 RÈGLE CRITIQUE — ZÉRO STOCKAGE LOCAL

> **AUCUN `localStorage`, AUCUN `sessionStorage`, AUCUN `useState` seul pour des données utilisateur.**
> Tout doit passer par l'API backend → PostgreSQL.
>
> **Corrections appliquées (Pass 3)** :
> - Skip Spark : était `setSparks(filter)` → maintenant `api.post(/sparks/:id/dismiss)` + table `SparkDismiss`
> - GET Sparks exclut automatiquement les sparks dismissés (`dismissals: { none: { userId } }`)
> - Quest Progress : nouvel endpoint `POST /quests/:id/progress` avec compteur + complétion auto
