# 🐝 AUDIT MESSENGER & VIDEO CALL — Mars 2026

> Analyse complète du système de messagerie et d'appels vidéo/audio de Zhiive.
> Date : 24 mars 2026

---

## 🚨 RÈGLES ABSOLUES

> **ZÉRO STOCKAGE LOCAL** : Aucun `localStorage`/`sessionStorage`. Tout en base de données via API.
>
> **ZÉRO VALEUR HARDCODÉE** : Aucune couleur (`#6C5CE7`), texte français, magic number, URL en dur.
> Utiliser `SF.*`/`FB.*`/`COLORS.*` pour les couleurs, `t('clé')` pour les textes, constantes nommées pour les nombres.

---

## 📊 SCORE GLOBAL

| Composant | Score | Statut |
|-----------|-------|--------|
| **Messenger (Chat)** | 8.5/10 | ✅ Fonctionnel |
| **Video Call** | 8.5/10 | ✅ Bugs critiques corrigés (Pass 5+6) |
| **Audio Call** | 8.5/10 | ✅ Audio + hangup + trace + collision fix |
| **Signaling** | 7/10 | ⚠️ REST polling (pas WebSocket) + offres déterministes |

**Score moyen : 8.1/10**

---

## 🏗️ ARCHITECTURE

### Composants Principaux

| Fichier | Rôle |
|---------|------|
| `src/components/MessengerChat.tsx` | Interface de chat, initiation d'appels |
| `src/components/VideoCallModal.tsx` | Modal WebRTC pour appels vidéo/audio |
| `src/routes/calls.ts` | API de signaling (REST polling) |

### Stack Technique

```
┌─────────────────────────────────────────────┐
│           VideoCallModal.tsx                 │
│  ┌───────────────────────────────────────┐   │
│  │ RTCPeerConnection                     │   │
│  │  ├─ ICE: stun:stun.l.google.com      │   │
│  │  ├─ ontrack → remoteStreamsRef        │   │
│  │  ├─ onicecandidate → POST /signal    │   │
│  │  └─ createOffer/Answer               │   │
│  └───────────────────────────────────────┘   │
│                                              │
│  Signaling: REST Polling (1s interval)       │
│  GET /api/calls/:id/signal (every 1000ms)    │
│  POST /api/calls/:id/signal                  │
└─────────────────────────────────────────────┘
```

---

## 🐛 BUGS IDENTIFIÉS & CORRIGÉS

### Bug #1 — CRITIQUE : Callee ne voit/n'entend rien après avoir décroché

**Symptôme** : L'appelant appelle, l'appelé décroche, mais l'appelé ne voit PAS la vidéo et n'entend PAS l'audio de l'appelant.

**Cause racine** : Race condition entre `pc.ontrack` et le DOM React.
- `ontrack` fire quand le stream distant arrive → stocke dans `remoteStreamsRef`  
- Appelle `forceUpdate` pour re-render
- Mais l'élément `<video>` n'existe pas encore dans le DOM au moment où `ontrack` fire
- La ref callback essaie d'attacher le stream, mais l'élément peut ne pas être monté

**Correction** : Triple mécanisme d'attachement (`VideoCallModal.tsx`)
1. **`ontrack` handler** : Attache directement + `.play()` si l'élément vidéo existe déjà
2. **Ref callback** : Vérifie `srcObject !== stream` avant attachement + `.play()`
3. **`useEffect` post-render** : Après chaque render, re-parcourt tous les streams et les réattache aux éléments vidéo ET audio (filet de sécurité)

**Statut** : ✅ Corrigé (Pass 4 + Pass 5)

### Bug #2 — CRITIQUE : Audio jamais joué en appel audio-only ou vidéo

**Symptôme** : En appel (audio ou vidéo), aucun son n'est audible de l'autre côté.

**Causes racines multiples** :
1. Pas d'élément `<audio>` pour jouer le stream distant quand vidéo off → ajouté `<audio autoPlay hidden>`
2. Les refs audio n'étaient pas trackées dans un Map persistant → ajouté `remoteAudiosRef`
3. Le `useEffect` de réattachement ne ciblait que les vidéos, pas les audios → étendu aux deux
4. Les erreurs `.play()` étaient avalées silencieusement → ajouté logging `console.warn`

**Correction** : `remoteAudiosRef` Map + `<audio>` toujours monté + useEffect réattache vidéo ET audio

**Statut** : ✅ Corrigé (Pass 5)

### Bug #3 — CRITIQUE : Raccrocher ne ferme pas le modal

**Symptôme** : L'utilisateur clique sur le bouton raccrocher, l'écran "Appel terminé" s'affiche mais le modal reste affiché indéfiniment.

**Cause racine** : La fonction `leaveCall()` appelait `setStatus('ended')` mais ne fermait JAMAIS le modal via `onClose()`. Comparaison avec `rejectCall()` qui appelait correctement `onClose()`.

**Correction** : Ajout de `setTimeout(() => onClose(), 3000)` à la fin de `leaveCall()` — l'utilisateur voit l'écran "Appel terminé" pendant 3 secondes puis le modal se ferme automatiquement. Le bouton "Close" reste disponible pour fermer immédiatement.

**Statut** : ✅ Corrigé (Pass 5)

### Bug #4 — CRITIQUE : Aucune trace d'appel dans les Whispers

**Symptôme** : Après un appel, aucune trace n'apparaît dans la conversation (Whisper). L'appel disparaît comme s'il n'avait jamais eu lieu.

**Cause racine** : Le backend `/calls/:id/leave` mettait bien le status à `ended` dans la table `VideoCall`, mais n'envoyait AUCUN message dans la conversation associée. Le frontend n'avait aucun composant pour afficher l'historique d'appels.

**Correction** :
1. **Appel terminé** : Le backend insère automatiquement un message système dans la conversation : `📹 Appel vidéo terminé — Durée : 2min 30s`
2. **Appel rejeté/manqué** : Message système : `📞 Appel audio manqué`
3. **Timestamp conversation** : `updatedAt` mis à jour pour que la conversation remonte en haut de la listeles.

**Statut** : ✅ Corrigé (Pass 5)

### Bug #5 — MAJEUR : Signaling par REST polling (pas temps réel)

**Symptôme** : Latence de connexion. Les ICE candidates et SDP arrivent avec 1s de retard.

**Cause** : Le signaling utilise `setInterval` de 1000ms pour `GET /api/calls/:id/signal`. Ce n'est pas du temps réel.

**Impact** : La connexion peut prendre 2-5s de plus. Acceptable pour MVP mais à remplacer par WebSocket ou SSE.

**Statut** : ⚠️ Connu — Acceptable en v1, à migrer vers WebSocket en v2

### Bug #6 — MINEUR : Pas de serveur TURN

**Symptôme** : Les appels échouent quand les deux utilisateurs sont derrière des NAT symétriques.

**Cause** : Seul `stun:stun.l.google.com:19302` est configuré. Aucun TURN server.

**Impact** : ~15-20% des appels pourraient échouer selon l'environnement réseau.

**Statut** : ⚠️ Connu — Nécessite un compte TURN (ex: Twilio, Xirsys)

### Bug #7 — CRITIQUE : Collision d'offres WebRTC (Pass 6)

**Symptôme** : Les appels ne s'établissent jamais. Le signal polling tourne en boucle mais aucune connexion WebRTC ne se fait. Aucun son, aucune vidéo.

**Cause racine** : Deux mécanismes d'envoi d'offres simultanés :
1. `joinCall()` envoyait des offres aux participants déjà connectés
2. Le status poll envoyait aussi des offres aux nouveaux participants

Quand les deux côtés envoient des offres en même temps → collision : les deux `RTCPeerConnection` sont en état `have-local-offer` → `setRemoteDescription(offer)` échoue silencieusement → aucune connexion.

**Correction** :
1. **Suppression des offres dans `joinCall()`** — seul le status poll gère les offres
2. **Règle déterministe** : seul l'utilisateur avec le `userId` alphabétiquement inférieur envoie l'offre (`userId < p.userId`). L'autre attend l'offre et répond.
3. **Pas de collision possible** : un seul côté initie, l'autre répond.

**Statut** : ✅ Corrigé (Pass 6)

### Bug #8 — MAJEUR : Pas de timeout de sonnerie (Pass 6)

**Symptôme** : Si personne ne décroche, l'appel sonne indéfiniment. Le polling continue sans fin.

**Cause racine** : Aucun mécanisme de timeout. Le status poll tourne jusqu'à ce que l'utilisateur quitte manuellement.

**Correction** : 
- Timeout de 60 secondes pour les appels sortants
- Si le backend renvoie toujours `status: 'ringing'` après 60s → auto-annulation
- Message système `📞 Appel manqué` inséré dans la conversation
- Backend `/leave` distingue maintenant les appels annulés (startedAt null) des appels terminés

**Statut** : ✅ Corrigé (Pass 6)

### Bug #9 — MAJEUR : Zéro logging WebRTC (Pass 6)

**Symptôme** : Impossible de diagnostiquer les problèmes d'appel. Aucun log dans la console.

**Correction** : Ajout de logging complet :
- `[CALL] 🔊 Track from {userId}: audio/video, enabled: true/false` — réception de pistes
- `[CALL] 🧊 ICE ({userId}): checking/connected/failed` — état de connexion réseau
- `[CALL] 🔗 Connection ({userId}): new/connected/disconnected` — état de la connexion
- `[CALL] 📤 Sending offer to {userId}` — envoi d'offre
- `[CALL] 📥 Signal from {userId}: offer/answer/ice-candidate` — réception de signal
- `[CALL] 📬 N signal(s) received` — nombre de signaux reçus par poll
- `[CALL] ✅ Joined call` — confirmation de connexion
- `[CALL] 📴 Left call successfully` — confirmation de départ
- `[CALL] 🔉 Audio playing for {userId}` — audio en cours de lecture
- `[CALL] ⏰ Ringing timeout 60s` — timeout atteint

**Statut** : ✅ Corrigé (Pass 6)

---

## ✅ POINTS POSITIFS

1. **UI soignée** : Design cohérent avec le thème Zhiive (Dark mode, couleurs dorées)
2. **Indicateur de niveau micro** : Barre d'activité audio en temps réel via `AudioContext + AnalyserNode`
3. **Timer d'appel** : Compteur de durée visible pendant l'appel
4. **Gestion des participants** : Support multi-participant avec grille adaptative
5. **Architecture Signal** : Les endpoints REST de signaling fonctionnent correctement

---

## 📋 RECOMMANDATIONS FUTURES

| Priorité | Recommandation |
|----------|---------------|
| 🔴 Haute | Migrer signaling vers WebSocket (temps réel, moins de latence) |
| 🔴 Haute | Ajouter serveur TURN pour fiabilité réseau |
| 🟡 Moyenne | Ajouter gestion de reconnexion (ICE restart) |
| 🟡 Moyenne | Ajouter notifications push pour appels manqués |
| 🟢 Basse | Screen sharing (partage d'écran) |
| 🟢 Basse | Recording (enregistrement d'appel) |
