# 🌌 AUDIT APP 5 — UNIVERSE

> **Fichier frontend** : `src/components/zhiive/UniversePanel.tsx`
> **Fichier backend** : `src/routes/zhiive.ts` (routes events/capsules/orbit)
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
| **Pulse** | 🔴 | Animation canvas + métriques communautaires |
| **Événements** | ⚠️ | Création/RSVP événements communautaires |
| **Capsules** | 🔴 | Capsules temporelles (messages futurs) |
| **Orbite** | ⚠️ | Visualisation proximité amis |

---

## ✅ CE QUI FONCTIONNE BIEN

1. **Identité centralisée** ✅ — `useActiveIdentity()` (ligne 11/55)
2. **Événements** — Création avec `publishAsOrg` (ligne 113) ✅
3. **RSVP** — Système participer/annuler fonctionnel ✅
4. **Animation Pulse** ✅ — Canvas orbital avec particules
5. **Calcul de proximité Orbite** ✅ — Score d'interaction correct (backend)

---

## 🔴 BUGS CRITIQUES

### BUG #1 : Métriques Pulse HARDCODÉES
- **Lignes** : 256-285
- **Problème** : Les barres d'énergie (Positif 68%, Actif 42%, Créatif 35%, Social 55%) sont des **constantes en dur**
- **Impact** : L'utilisateur voit des données FAUSSES qui ne reflètent pas l'activité réelle
- **Correctif** : Créer une API `/api/zhiive/community-metrics` qui calcule les vraies métriques :
  - Positif = % posts avec mood positif (😊, 🎉, ❤️)
  - Actif = posts/commentaires/réactions des 7 derniers jours vs moyenne
  - Créatif = % posts avec média (photo/vidéo)
  - Social = % posts avec réponses/commentaires

### BUG #2 : Capsules n'envoient PAS `publishAsOrg`
- **Lignes** : 159-165
- **Problème** : Le POST `/api/zhiive/capsules` n'inclut pas `publishAsOrg`
- **Impact** : Impossible de créer une capsule au nom de l'organisation
- **Correctif** : Ajouter `publishAsOrg: identity.publishAsOrg` dans le body

### BUG #3 : Online status TOUJOURS `false`
- **Ligne** : 560
- **Code** : `online: false` → hardcodé
- **Problème** : Le badge "en ligne" ne s'affiche jamais
- **Impact** : Orbite donne l'impression que personne n'est connecté
- **Correctif** : Calculer via `lastInteraction` (récent = en ligne) ou WebSocket

---

## 🟠 BUGS MAJEURS

### BUG #4 : RSVP state perdu au remontage
- **Lignes** : 103-110
- **Problème** : `useState<Set<string>>(new Set())` — jamais peuplé depuis les données serveur
- **Impact** : L'utilisateur qui a RSVP voit "Participer" au lieu de "Annuler" après rechargement
- **Correctif** : Peupler `rsvpSet` depuis les attendees de chaque événement dans `fetchData()`

### BUG #5 : Utilise `feedMode` au lieu de `identity.isOrgMode`
- **Lignes** : 82-87
- **Problème** : `api.get(/api/zhiive/events?mode=${feedMode})` — source de vérité incohérente
- **Impact** : Possible désynchronisation entre l'identité active et le mode de requête

### BUG #6 : Label "Colony" au lieu de terminologie correcte
- **Ligne** : 307
- **Code** : `IN: { icon: '⬡', label: 'Colony', color: '#1890ff' }`
- **Impact** : Incohérence avec le lexique Zhiive

### BUG #7 : Erreurs silencieuses dans fetchData
- **Lignes** : 84-87
- **Problème** : `.catch(() => ({ events: [] }))` — aucune notification utilisateur
- **Impact** : Données vides sans explication

### BUG #8 : Backend Capsules sans `publishAsOrg` non plus
- **Lignes backend** : zhiive.ts:877-890
- **Problème** : Le backend n'enregistre pas `publishAsOrg` pour les capsules
- **Impact** : Même si le frontend l'envoyait, le backend l'ignorerait

---

## 🟡 BUGS MINEURS

### BUG #9 : Orbite limitée à 8 amis
- **Ligne** : 520
- **Impact** : Les utilisateurs avec beaucoup d'amis ne voient que les 8 plus proches

### BUG #10 : `_loading` state déclaré mais inutilisé
- **Ligne** : 81
- **Impact** : Pas de skeleton/loading pendant le fetch

### BUG #11 : Pas de sélecteur de destinataire pour Capsules
- **Impact** : Le champ `recipientId` existe en DB mais pas d'UI pour le choisir

### BUG #12 : Canvas Pulse pas optimisé performance
- **Ligne** : 227-230
- **Impact** : Potentielles saccades sur appareils bas de gamme

---

## 🎯 UTILITÉ & VISION MARKETING

### Ce que Universe apporte :
- **Pulse** — Tableau de bord émotionnel de la communauté (innovation unique)
- **Événements** — Agenda communautaire (meetups, workshops, salons)
- **Capsules** — Messages dans le temps (innovation unique, très engageant)
- **Orbite** — Visualisation sociale (qui sont mes connexions les plus fortes?)

### Ce qui manque :

#### Pulse :
1. **Données réelles** — 🔴 PRIORITÉ ABSOLUE, les métriques sont fausses
2. **Historique** — Voir l'évolution des métriques sur 7/30/90 jours
3. **Pulse par organisation** — Comparer l'énergie de différentes ruches
4. **Leaderboard** — Top contributeurs par catégorie

#### Événements :
1. **Calendrier visuel** — Vue calendrier en plus de la liste  
2. **Récurrence** — Événements hebdomadaires/mensuels
3. **Rappels** — Notifications avant l'événement
4. **Lien visioconférence** — Google Meet / Zoom intégré
5. **Check-in** — Confirmer sa présence le jour J

#### Capsules :
1. **Identity org** — Publier au nom de l'organisation
2. **Média** — Joindre photos/vidéos aux capsules
3. **Destinataire** — Envoyer une capsule à une personne spécifique
4. **Notification unlock** — Push notification quand la capsule s'ouvre
5. **Capsule collaborative** — Plusieurs auteurs pour une capsule

#### Orbite :
1. **Status en ligne réel** — WebSocket ou estimation via lastInteraction
2. **Pagination orbite** — Plus de 8 amis
3. **Click to profile** — Cliquer sur un ami pour voir son profil
4. **Catégories** — Amis proches, collègues, contacts professionnels

### Avantage concurrentiel :
**Pulse** et **Capsules** sont des **innovations uniques** qu'aucune plateforme concurrente ne propose. Le concept de "température émotionnelle" d'une communauté est un **facteur différenciant majeur**. Mais il est **annulé** par les métriques fausses actuelles.

---

## 📊 SCORE DÉTAILLÉ

| Critère | Score | Détail |
|---------|-------|--------|
| Identité (publishAsOrg) | 6/10 | ✅ Events OK, ❌ Capsules manquant |
| Pulse métriques | 1/10 | 🔴 Data hardcodée fausse |
| Événements | 6/10 | ⚠️ RSVP state non persisté, feedMode mismatch |
| Capsules | 3/10 | 🔴 Pas d'identité org, pas de média, pas de destinataire |
| Orbite | 5/10 | ⚠️ Online status hardcodé, limité à 8 |
| **GLOBAL** | **4/10** | **🔴 Métriques fausses + bugs identité capsules** |
