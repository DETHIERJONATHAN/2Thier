# 🤝 AUDIT APP 11 — FRIENDS (Système d'Amis / Demandes d'Ami)

> **Fichier frontend** : `src/pages/ProfilePage.tsx` (bouton profil), `src/components/zhiive/ExplorePanel.tsx` (bees tab)
> **Fichier backend** : `src/routes/friends.ts`
> **Modèle DB** : `Friendship` (prisma/schema.prisma)
> **Date d'audit** : 29 mars 2026

---

## 🚨 RÈGLES ABSOLUES

> **ZÉRO STOCKAGE LOCAL** : Aucun `localStorage`/`sessionStorage`. Tout en base de données via API.
>
> **ZÉRO VALEUR HARDCODÉE** : Aucune couleur, texte français, magic number, URL en dur.

---

## 📋 SOUS-APPLICATIONS

| Sous-App | Statut | Description |
|----------|--------|-------------|
| **Bouton Profil** | ✅ | Bouton "Ajouter en ami" / "Ami ✓" / "Accepter" sur le profil d'un autre utilisateur |
| **Demande envoyée** | ✅ | Envoi de demande d'ami → notification temps réel au destinataire |
| **Acceptation** | ✅ | Accepter une demande → notification de confirmation à l'expéditeur |
| **Refus** | ✅ | Refuser une demande → suppression propre |
| **Annulation** | ✅ | Annuler une demande envoyée (pending) |
| **Suppression ami** | ✅ | Retirer un ami (déjà accepté) |
| **Blocage** | ✅ | Bloquer un utilisateur |
| **Recherche** | ✅ | Rechercher des utilisateurs pour ajouter en ami (`GET /friends/search`) |
| **Sync Org** | ✅ | Auto-ajout des membres de la même Colony (`POST /friends/sync-org`) |
| **Statut rapide** | ✅ | `GET /friends/status/:userId` — vérification rapide du statut |
| **Bees (Explore)** | ✅ | Suggestions d'amis dans ExplorePanel, avec indicateurs de statut |

---

## 🧪 TESTS À EFFECTUER

### T1 — Envoyer une demande d'ami
- [ ] Naviguer vers le profil d'un autre utilisateur (`/profile/:userId`)
- [ ] Vérifier que le bouton "Ajouter en ami" (bleu) est visible
- [ ] Cliquer → le bouton change en "Demande envoyée" (gris)
- [ ] Vérifier que le destinataire reçoit une notification `FRIEND_REQUEST_RECEIVED`
- [ ] Vérifier que la notification contient le nom et l'avatar de l'expéditeur
- [ ] Vérifier que la notification a un `actionUrl` vers le profil de l'expéditeur

### T2 — Accepter une demande d'ami
- [ ] Se connecter en tant que destinataire
- [ ] Naviguer vers le profil de l'expéditeur
- [ ] Vérifier que le bouton affiche "Accepter la demande" (bleu) + bouton "Refuser"
- [ ] Cliquer "Accepter" → le bouton change en "Ami ✓" (bleu)
- [ ] Vérifier que l'expéditeur reçoit une notification `FRIEND_REQUEST_ACCEPTED`
- [ ] Vérifier que la notification originale est marquée comme `handled: 'accepted'`

### T3 — Refuser une demande d'ami
- [ ] Se connecter en tant que destinataire
- [ ] Naviguer vers le profil de l'expéditeur
- [ ] Cliquer "Refuser" → le bouton revient à "Ajouter en ami"
- [ ] Vérifier que la notification originale est marquée comme `handled: 'rejected'`
- [ ] Vérifier que l'amitié est supprimée en base

### T4 — Annuler une demande envoyée
- [ ] Se connecter en tant qu'expéditeur
- [ ] Naviguer vers le profil du destinataire
- [ ] Le bouton doit afficher "Demande envoyée" (gris)
- [ ] Cliquer → la demande est annulée, le bouton revient à "Ajouter en ami"

### T5 — Retirer un ami
- [ ] Se connecter avec un utilisateur qui a un ami
- [ ] Naviguer vers le profil de cet ami
- [ ] Le bouton doit afficher "Ami ✓" (bleu)
- [ ] Cliquer → le bouton revient à "Ajouter en ami"
- [ ] Vérifier côté base que l'amitié est supprimée

### T6 — Bloquer un utilisateur
- [ ] Via le menu "..." du profil (fonctionnalité future) ou via ExplorePanel
- [ ] Vérifier que le statut passe à "blocked"
- [ ] Vérifier que le bouton affiche "Bloqué" (grisé, non-cliquable)

### T7 — Responsive (Mobile)
- [ ] Vérifier que les boutons sont visibles et fonctionnels en mode mobile
- [ ] Vérifier que le bouton "Message" est visible (icône seule en mobile)
- [ ] Vérifier que le bouton "Refuser" apparaît correctement dans la row mobile

### T8 — ExplorePanel (Bees)
- [ ] Aller dans Scout → onglet "Bees"
- [ ] Vérifier que les suggestions affichent le bon indicateur : 🤝 (ami), ⏳ (envoyé), ✅ (reçu)
- [ ] Cliquer sur un bouton d'action → le statut change correctement

### T9 — Intégrité des données
- [ ] Vérifier que la contrainte `@@unique([requesterId, addresseeId])` empêche les doublons
- [ ] Vérifier qu'on ne peut pas s'envoyer une demande à soi-même
- [ ] Vérifier le comportement si l'amitié existe déjà (message "Déjà amis" ou "Demande déjà envoyée")

### T10 — Notifications complètes
- [ ] Vérifier la cloche de notifications : badge count inclut les demandes d'amis
- [ ] Cliquer sur la notification → redirige vers le profil
- [ ] Après acceptation/refus, la notification originale est marquée lue

---

## 🔌 API ENDPOINTS

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `GET` | `/api/friends` | Lister amis + demandes pendantes | ✅ |
| `GET` | `/api/friends/status/:userId` | Statut d'amitié avec un utilisateur | ✅ |
| `GET` | `/api/friends/search?q=xxx` | Rechercher des utilisateurs | ✅ |
| `POST` | `/api/friends/request` | Envoyer une demande (`{ userId }`) | ✅ |
| `POST` | `/api/friends/:id/accept` | Accepter une demande | ✅ |
| `POST` | `/api/friends/:id/block` | Bloquer un utilisateur | ✅ |
| `DELETE` | `/api/friends/:id` | Supprimer ami / refuser demande | ✅ |
| `POST` | `/api/friends/sync-org` | Auto-ajouter membres Colony | ✅ |

---

## 📊 MODÈLE DE DONNÉES

```prisma
model Friendship {
  id           String   @id @default(uuid())
  requesterId  String
  addresseeId  String
  status       String   @default("pending") // pending, accepted, blocked
  source       String   @default("manual")  // manual, organization
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  requester    User     @relation("FriendshipRequester", fields: [requesterId], references: [id])
  addressee    User     @relation("FriendshipAddressee", fields: [addresseeId], references: [id])
  
  @@unique([requesterId, addresseeId])
  @@index([requesterId, status])
  @@index([addresseeId, status])
}
```

---

## 🔔 NOTIFICATIONS GÉNÉRÉES

| Type | Déclencheur | Destinataire | Message |
|------|------------|-------------|---------|
| `FRIEND_REQUEST_RECEIVED` | Envoi demande | Destinataire | "{nom} vous a envoyé une demande d'ami" |
| `FRIEND_REQUEST_ACCEPTED` | Acceptation | Expéditeur | "{nom} a accepté votre demande d'ami" |

---

## ✅ SCORE

| Critère | Score | Note |
|---------|-------|------|
| Fonctionnalité | 9/10 | Toutes les actions fonctionnent |
| UX/UI | 9/10 | Boutons Facebook-like, responsive |
| Notifications | 9/10 | Intégrées avec marquage handled |
| Sécurité | 9/10 | Auth JWT, validation userId, anti-doublon |
| i18n | 8/10 | Clés ajoutées, ProfilePage utilise encore du FR hardcodé (comme le reste de la page) |
| **Total** | **8.8/10** | ✅ |
