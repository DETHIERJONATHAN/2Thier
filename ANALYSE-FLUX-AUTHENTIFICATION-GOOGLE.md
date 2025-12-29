# 📊 Analyse du Flux d'Authentification Google Workspace - 2Thier

**Date**: 29 décembre 2025  
**Status**: À analyser avec vous

---

## 🔍 CE QUI EXISTE ACTUELLEMENT

### 1. **Système d'Invitation (déjà implémenté)** ✅

**Fichiers clés:**
- `src/routes/invitations.ts` - Routes API d'invitation
- `src/components/admin/InvitationModal.tsx` - UI d'invitation
- `prisma/schema.prisma` - Model `Invitation`

**Flux:**
```
Admin clique "Inviter un utilisateur"
    ↓
InvitationModal s'ouvre
    ↓
Admin rentre: email + role + organisation
    ↓
POST /api/users/invitations (backend valide)
    ↓
Création d'une ligne Invitation:
  - email (destination)
  - token (UUID unique)
  - expiresAt (+7 jours)
  - status: PENDING
  - organizationId
  - roleId
  - invitedById (qui a invité)
  - targetUserId (nullable, si user existe)
    ↓
Email d'invitation envoyé
    ↓
Utilisateur reçoit lien: /auth/google/callback?token=XXX
    ↓
Utilisateur accepte → utilisateur créé + lié à l'organisation
```

**Statut:** ✅ FONCTIONNE

---

### 2. **Configuration Google Workspace par Organisation** ✅

**Fichiers clés:**
- `prisma/schema.prisma` - Model `GoogleWorkspaceConfig`
- `src/components/admin/UserGoogleWorkspaceModal.tsx` - UI pour configurer Workspace

**Structure BDD:**
```prisma
model GoogleWorkspaceConfig {
  id                  String   @id
  organizationId      String   @unique
  domain              String?              // domaine.be
  adminEmail          String?              // admin@domaine.be
  clientId            String?
  clientSecret        String?
  privateKey          String?              // Service Account
  serviceAccountEmail String?
  isActive            Boolean  @default(true)
  
  // Services activés par orga
  gmailEnabled        Boolean
  calendarEnabled     Boolean
  driveEnabled        Boolean
  // ...etc
}
```

**Statut:** ✅ STRUCTURE EXISTE (mais routes API vides/incomplétes?)

---

### 3. **Utilisateurs Google Workspace** ✅

**Fichiers clés:**
- `prisma/schema.prisma` - Model `GoogleWorkspaceUser`

**Structure BDD:**
```prisma
model GoogleWorkspaceUser {
  id              String   @id
  userId          String   @unique        // Lié à User
  email           String   @unique        // john.doe@domaine.be
  isActive        Boolean  @default(true)
  
  // Services activés par utilisateur
  gmailEnabled    Boolean
  driveEnabled    Boolean
  // ...etc
}
```

**Statut:** ✅ STRUCTURE EXISTE

---

## 🤔 CE QUI MANQUE / À CLARIFIER

### QUESTION 1: Configuration de l'Organisation
**État:** À mettre en place

```
Scénario:
1. Organization A n'a PAS de Google Workspace
   → Admin clique "Activer Google Workspace"
   → 2 options:
      a) Créer un nouveau Workspace (gestion externe)
      b) Lier un Workspace existant (entrer les credentials)

2. Admin choisit option B (lier workspace existant)
   → Rentre: domaine, admin email, service account key
   → Backend valide avec Google
   → Stocke dans GoogleWorkspaceConfig
```

**Routes API manquantes:**
- `POST /organizations/{id}/google-workspace/configure` - Configurer
- `GET /organizations/{id}/google-workspace/status` - Vérifier config
- `DELETE /organizations/{id}/google-workspace` - Supprimer config

**Statut:** ❌ À IMPLÉMENTER

---

### QUESTION 2: Création de Compte Utilisateur dans Workspace
**État:** Partiellement existant

```
Flux attendu:
1. Admin a configuré GoogleWorkspaceConfig pour son orga
2. Admin invite utilisateur (email: john.doe@domaine.be)
3. Utilisateur accepte invitation → crée compte 2Thier
4. AVANT OU APRÈS?
   → Créer automatiquement compte Google Workspace (john.doe@domaine.be)?
   → Admin crée manuellement via UserGoogleWorkspaceModal?
```

**État du code:**
- `UserGoogleWorkspaceModal.tsx` existe
- Routes pour `/google-workspace/users/{id}/sync` existent (dans le dist, pas la source)

**Routes potentiellement existantes:**
- `POST /google-workspace/users/create` - Créer compte
- `POST /google-workspace/users/{id}/sync` - Synchroniser
- `POST /google-workspace/users/{id}/deactivate` - Désactiver

**Statut:** ❓ À vérifier dans le code source

---

### QUESTION 3: Authentification de l'Utilisateur
**État:** À clarifier

```
Actuellement (problématique):
1. Utilisateur se connecte 2Thier (email/password ou SSO)
2. Essaie d'accéder à Gmail → 401 (pas de tokens Google)

Flux proposé par vous:
1. Organisation TOUJOURS connectée automatiquement
   → Service Account ou Admin Token stocké
   → Accessible à TOUS les utilisateurs de l'orga
   
2. Utilisateur = accès personnel + accès orga
   → Peut avoir ses propres tokens (Gmail perso)
   → Peut aussi accéder ressources orga (Gmail orga via Service Account)
```

**Modèle de données actuel:**
- `GoogleToken` (déjà existe?) - Tokens personnels de l'utilisateur
- Pas de distinction "tokens orga" vs "tokens user"

**Statut:** ⚠️ À CLARIFIER

---

## 🎯 QUESTIONS POUR VOUS

### **Q1: Création du compte Workspace**
Quand un admin invite un user john.doe@domaine.be:

**Option A (Auto):**
```
Invitation acceptée 
  → Compte 2Thier créé
  → Automatiquement → Compte Google Workspace créé (john.doe@domaine.be)
  → Utilisateur peut utiliser Gmail directement
```

**Option B (Manuel):**
```
Invitation acceptée 
  → Compte 2Thier créé
  → Admin doit manuellement cliquer "Créer compte Google Workspace"
  → PUIS créé (john.doe@domaine.be)
```

**Option C (À la demande):**
```
Invitation acceptée 
  → Compte 2Thier créé
  → Premier login → Page "Voulez-vous créer compte Google Workspace?"
  → Utilisateur confirme → Crée compte
```

**💭 Ma recommandation:** Option A (auto) = meilleure UX

---

### **Q2: Permissions de l'Organisation**
Qui peut accéder à la ressource "Gmail Workspace"?

**Option A (Tous):**
```
- Tous les utilisateurs de l'organisation
- Via le Service Account stocké
- Chaque user a les mêmes permissions
```

**Option B (Sélectif):**
```
- Admin configure qui peut accéder (par rôle)
- User avec rôle "commercial" → accès Gmail
- User avec rôle "comptable" → pas accès Gmail
```

**💭 Ma recommandation:** Option B (plus granulaire)

---

### **Q3: Tokens personnels vs Organisationnels**
Comment gérer les 2 niveaux?

**Architecture proposée:**

```
┌─ NIVEAU ORGANISATION ─────────────────────┐
│ GoogleWorkspaceConfig                     │
│  - Domain: domaine.be                     │
│  - Admin email: admin@domaine.be          │
│  - Service Account Key                    │
│  ↓                                        │
│  Accessible à TOUS les users de l'orga   │
│  (via Service Account)                    │
└───────────────────────────────────────────┘

┌─ NIVEAU UTILISATEUR ──────────────────────┐
│ GoogleToken (personnels)                  │
│  - userId: 123                            │
│  - accessToken: ...                       │
│  - refreshToken: ...                      │
│  ↓                                        │
│  Chaque user a SES tokens Google perso   │
│  (Gmail perso, Drive perso, etc.)        │
└───────────────────────────────────────────┘

┌─ FUSION AU RUNTIME ───────────────────────┐
│ Quand user John demande Gmail:            │
│  → Cherche GoogleToken perso              │
│  → Si existe → utilise token perso        │
│  → Si N'existe PAS → utilise Service Acc  │
│  → Résultat: accès à inbox "partagé"     │
└───────────────────────────────────────────┘
```

---

## 📋 CHECKLIST D'IMPLÉMENTATION

- [ ] Q1: Décider quand créer compte Workspace (auto/manuel/demande)
- [ ] Q2: Décider permissions par rôle (ou tous)
- [ ] Q3: Valider architecture tokens dual (orga + user)
- [ ] Implémenter routes API Google Workspace config
- [ ] Implémenter création auto de comptes si Q1=Auto
- [ ] Implémenter fallback Service Account dans GetGmail
- [ ] Tests d'authentification multi-niveaux
- [ ] Documentation pour les admins

---

## 📚 Fichiers à examiner côté vous

1. `src/routes/google-auth.ts` - Routes d'authentification actuelles
2. `src/services/EmailService.ts` - Service d'email d'invitation
3. `prisma/seed.ts` - Données de test
4. Code de gestion des tokens Google existant

---

**Prêt à discuter ces points? 🎯**
