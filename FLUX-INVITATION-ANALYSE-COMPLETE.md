# 📋 FLUX D'INVITATION ACTUEL - 2Thier (Analysé)

**Status:** ✅ **TRÈS BON** - Vous aviez raison!

---

## 🎯 FLUX COMPLET ACTUEL

### **ÉTAPE 1: Admin invite quelqu'un**
```
Admin panel → "Inviter un utilisateur"
  ↓
InvitationModal.tsx
  ↓
POST /api/users/invitations
  - Email: john@unitedfocus.be
  - Role: "commercial"
  - Organization: UniteD Focus
  ↓
Backend crée Invitation:
  - email: john@unitedfocus.be
  - token: UUID
  - expiresAt: +7 jours
  - status: PENDING
  - targetUserId: null (si user n'existe pas encore)
  ↓
EmailService envoie email:
  - Lien: /accept-invitation?token=XXX
```

---

### **ÉTAPE 2: Utilisateur reçoit email**

**2 Scénarios:**

#### **Scénario A: Utilisateur EXISTE DÉJÀ dans le système**
```
Email reçu: "Rejoindre UniteD Focus"
  ↓
Clique lien /accept-invitation?token=XXX
  ↓
GET /api/invitations/verify → retourne:
  - isExistingUser: true
  - organization: { name: "UniteD Focus" }
  - role: { name: "commercial" }
  ↓
AcceptInvitationPage.tsx affiche:
  "Vous êtes invité à rejoindre UniteD Focus 
   en tant que commercial"
  ↓
Clique "Accepter l'invitation"
  ↓
POST /api/invitations/accept (avec token)
  ↓
Backend (2 cas):
  a) Si connecté avec BON email (john@...):
     → Crée UserOrganization
     → Lie à l'organisation
     → Invitation.status = ACCEPTED
     
  b) Si connecté avec MAUVAIS email:
     → Affiche erreur: "Déconnectez-vous d'abord"
     
  c) Si NOT connecté:
     → Erreur: "Connectez-vous"
```

#### **Scénario B: Utilisateur N'EXISTE PAS encore**
```
Email reçu: "Rejoindre UniteD Focus"
  ↓
Clique lien /accept-invitation?token=XXX
  ↓
GET /api/invitations/verify → retourne:
  - isExistingUser: false
  ↓
AcceptInvitationPage.tsx affiche FORMULAIRE:
  [Prénom]        ← À remplir
  [Nom]           ← À remplir
  [Email]         john@unitedfocus.be (lu-seul)
  [Mot de passe]  ← À créer
  
  [Créer le compte et rejoindre]
  ↓
POST /api/invitations/accept (avec token, firstName, lastName, password)
  ↓
Backend:
  1. Crée User:
     - firstName
     - lastName
     - email: john@unitedfocus.be
     - passwordHash
     - status: active
     
  2. Crée UserOrganization:
     - userId = new user
     - organizationId
     - roleId
     
  3. Invitation.status = ACCEPTED
  ↓
Utilisateur créé et déjà dans l'organisation! 🎉
```

---

## ✨ **CE QUE VOUS AVIEZ ANTICIPÉ (et qui existe déjà!)**

> "Je sais que j'avais anticipé un système où la personne crée son compte CRM puis après il y avait un système d'activation Workspace"

**C'est EXACTEMENT ce que vous avez!** 👇

```
┌─────────────────────────────────────────┐
│ ÉTAPE 1: CRÉER COMPTE CRM               │
│ (ou accepter invitation comme compte)   │
│                                         │
│ Formulaire d'inscription:               │
│  - Prénom                               │
│  - Nom                                  │
│  - Email (john@unitedfocus.be)          │
│  - Mot de passe                         │
│                                         │
│ ✅ User créé + lié à Organisation      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ ÉTAPE 2: ACTIVATION WORKSPACE (À FAIRE) │
│                                         │
│ Admin panel (Users Management)          │
│  ↓                                      │
│ Clique bouton "Créer compte Google"    │
│  ↓                                      │
│ UserGoogleWorkspaceModal.tsx            │
│  ↓                                      │
│ Admin confirme:                         │
│  - Email: john@unitedfocus.be (auto)   │
│  - Services à activer                   │
│  ↓                                      │
│ ✅ Compte Workspace créé                │
│ ✅ GoogleWorkspaceUser enregistré       │
└─────────────────────────────────────────┘
```

---

## ❌ CE QUI MANQUE (À IMPLÉMENTER)

### **1. Routes API pour créer/gérer Workspaces**

Fichier: `src/google-workspace/routes/google-workspace-new.ts` ← **VIDE!**

Routes manquantes:
```typescript
// POST /google-workspace/users/create
// Créer un compte Google Workspace pour un user
async (req: AuthenticatedRequest, res: Response) => {
  - Input: { userId, email, activateServices }
  - Output: GoogleWorkspaceUser créé
  - Action: Appeler Google Admin SDK pour créer le compte
}

// GET /google-workspace/users/{userId}/status
// Vérifier si user a un compte Workspace
async (req: AuthenticatedRequest, res: Response) => {
  - Chercher GoogleWorkspaceUser
  - Retourner statut
}

// POST /google-workspace/users/{userId}/activate
// Activer/désactiver services (Gmail, Drive, etc.)
async (req: AuthenticatedRequest, res: Response) => {
  - Mettre à jour GoogleWorkspaceUser
}

// DELETE /google-workspace/users/{userId}
// Supprimer compte Workspace
```

### **2. Integration Google Admin SDK**

Actuellement:
- `GoogleWorkspaceConfig` stocke les credentials ✅
- Pas d'utilisation de ces credentials pour créer des comptes ❌

À faire:
```typescript
// src/services/GoogleAdminService.ts
class GoogleAdminService {
  async createUser(
    serviceAccountKey: string,      // De GoogleWorkspaceConfig
    organizationDomain: string,      // domaine.be
    email: string,                   // john@domaine.be
    firstName: string,
    lastName: string
  ): Promise<void>
  
  async deleteUser(email: string): Promise<void>
  
  async updateUserServices(
    email: string,
    services: { gmail: boolean, drive: boolean, ... }
  ): Promise<void>
}
```

### **3. Logique dans UserGoogleWorkspaceModal.tsx**

Actuellement:
- Modal existe ✅
- Appelle routes API (qui sont vides) ❌

Routes appelées:
```
POST /google-workspace/users/create
POST /google-workspace/users/{userId}/sync
POST /google-workspace/users/{userId}/deactivate
```

---

## 🎯 **ARCHITECTURE PROPOSÉE POUR IMPLÉMENTER**

Basée sur ce qui existe + vos décisions:

```
1️⃣  ADMIN INVITE JOHN
    ↓ (Invitation)
    
2️⃣  JOHN CRÉE COMPTE CRM
    - POST /api/invitations/accept
    - User créé
    - UserOrganization créé
    ↓
    
3️⃣  JOHN CONNECTÉ AU CRM
    - Admin voit John dans Users Management
    - Bouton "Créer compte Google Workspace"
    ↓
    
4️⃣  ADMIN CLIQUE "CRÉER COMPTE"
    - UserGoogleWorkspaceModal s'ouvre
    - Auto-génère: john@unitedfocus.be
    - Admin confirme + choisit services
    ↓
    
5️⃣  BACKEND CRÉE COMPTE WORKSPACE
    - Récupère GoogleWorkspaceConfig (credentials)
    - Appelle Google Admin API
    - Crée john@unitedfocus.be
    - Crée GoogleWorkspaceUser en BDD
    ↓
    
6️⃣  JOHN ACCÈDE GMAIL DEPUIS 2THIER
    - Authentification OK?
    - Récupère tokens depuis GoogleWorkspaceConfig (Service Account)
    - OU tokens perso (future Phase 2)
    - Affiche Gmail inbox
```

---

## 🚀 **PLAN D'IMPLÉMENTATION**

### **Phase 1: MVP (à faire)**
- [ ] Implémenter GoogleAdminService
- [ ] Implémenter POST /google-workspace/users/create
- [ ] Implémenter GET /google-workspace/users/{id}/status
- [ ] Tester création de comptes Workspace manuellement
- [ ] Connecter UserGoogleWorkspaceModal aux vraies routes

### **Phase 2: Fallback Auth (futur)**
- [ ] Implémenter logique d'authentification dual (Orga + Perso)
- [ ] Tokens personnels optionnels

### **Phase 3: Auto-création (futur optionnel)**
- [ ] Créer automatiquement compte Workspace quand invitation acceptée
- [ ] (Vous aviez dit "manuel" donc on fait Phase 1 d'abord)

---

**Vous êtes d'accord avec cette analyse? On peut commencer à implémenter Phase 1?**
