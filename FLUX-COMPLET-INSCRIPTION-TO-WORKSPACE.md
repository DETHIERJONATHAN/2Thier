# 🎯 FLUX COMPLET - De l'Inscription à Google Workspace

**Date**: 29 décembre 2025  
**Vision complète**: Inscription → Organisation → Workspace → Authentification → Services

---

## 📊 VUE D'ENSEMBLE DES 2 FLUX PRINCIPAUX

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUX 1: INSCRIPTION DIRECTE              │
│                    (app.2thier.be/register)                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
   [Créer Org]        [Freelance]        [Rejoindre Org]
        ↓                   ↓                   ↓
   User+Org créés     User seul créé    User+JoinRequest
   User=Admin         Disponible        Admin doit accepter
        ↓                   ↓                   ↓
        └───────────────────┴───────────────────┘
                            ↓
                    User existe dans CRM
                            ↓
              ┌─────────────┴─────────────┐
              ↓                           ↓
    Org a Workspace activé?         Org n'a pas Workspace
              ↓                           ↓
        Passe à Phase 2              Reste en mode basique


┌─────────────────────────────────────────────────────────────┐
│                    FLUX 2: INVITATION                       │
│                    (Admin invite)                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
              Admin clique "Inviter utilisateur"
                            ↓
              Email envoyé avec token unique
                            ↓
              User accepte invitation
                            ↓
              User créé + lié directement à Org
                            ↓
              Passe à Phase 2
```

---

## 🔷 FLUX 1 DÉTAILLÉ: INSCRIPTION DIRECTE

### **ÉTAPE 1.1: Page d'inscription améliorée**

**URL**: `app.2thier.be/register`

**Formulaire:**
```
┌─────────────────────────────────────────┐
│  Créer votre compte 2Thier              │
├─────────────────────────────────────────┤
│  Prénom: [________]                     │
│  Nom:    [________]                     │
│  Email:  [________]                     │
│  Mot de passe: [________]               │
│                                         │
│  Je souhaite:                           │
│  ○ Créer une organisation               │
│    └→ Nom: [________]                   │
│                                         │
│  ○ Rester indépendant (freelance)       │
│    └→ Je pourrai être recruté plus tard │
│                                         │
│  ○ Rejoindre une organisation           │
│    └→ Nom: [________]                   │
│    └→ Message (opt): [________]         │
│                                         │
│  [S'inscrire]                           │
└─────────────────────────────────────────┘
```

---

### **ÉTAPE 1.2: Backend POST /api/register**

**Input:**
```typescript
{
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  registrationType: 'create_org' | 'freelance' | 'join_org';
  organizationName?: string;  // Si create_org ou join_org
  joinMessage?: string;       // Si join_org
}
```

**Logique:**

#### **CAS A: Create Organization**
```typescript
Transaction:
  1. Créer User:
     - email, passwordHash, firstName, lastName
     - status: 'active'
     - role: 'user'
  
  2. Créer Organization:
     - name: organizationName
     - status: 'active'
     - createdById: user.id
  
  3. Trouver Role "admin" (global ou créer)
  
  4. Créer UserOrganization:
     - userId: user.id
     - organizationId: org.id
     - roleId: adminRole.id
     - status: 'ACTIVE'
  
  5. Créer modules par défaut pour l'organisation
  
Response:
  - User créé
  - Organization créée
  - User = Admin de l'organisation
  - Redirect: /dashboard (avec sélection org auto)
```

#### **CAS B: Freelance**
```typescript
Transaction:
  1. Créer User:
     - email, passwordHash, firstName, lastName
     - status: 'active'
     - role: 'user'
  
Response:
  - User créé (sans organisation)
  - Redirect: /dashboard (mode freelance)
  - Message: "Vous pouvez créer une organisation ou attendre une invitation"
```

#### **CAS C: Join Organization**

⚠️ **CORRECTION: Dropdown avec liste des organisations**

```typescript
Frontend:
  - Récupérer liste des organisations disponibles:
    GET /api/organizations/public
    → Retourne organisations qui acceptent les demandes
  
  - Afficher dropdown:
    <Select>
      <Option value="org-uuid-1">UniteD Focus</Option>
      <Option value="org-uuid-2">2Thier</Option>
      ...
    </Select>

Backend Transaction:
  1. Créer User:
     - email, passwordHash, firstName, lastName
     - status: 'active'
     - role: 'user'
  
  2. Créer JoinRequest:
     - userId: user.id
     - organizationId: selectedOrgId (depuis dropdown)
     - message: joinMessage
     - status: 'PENDING'
  
Response:
  - User créé
  - JoinRequest créée
  - Redirect: /dashboard (mode attente)
  - Message: "Demande envoyée à [Nom Organisation]"
```

**Route API à créer:**
```typescript
GET /api/organizations/public

Response:
  [
    { id: 'uuid', name: 'UniteD Focus', acceptsJoinRequests: true },
    { id: 'uuid', name: '2Thier', acceptsJoinRequests: true }
  ]
```

---

### **ÉTAPE 1.3: Model JoinRequest (à créer)**

```prisma
model JoinRequest {
  id                String            @id @default(uuid())
  userId            String
  organizationId    String?           // Null si orga pas trouvée
  organizationName  String?           // Stocké si orga pas trouvée
  message           String?           // Message optionnel de l'user
  status            JoinRequestStatus @default(PENDING)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  processedById     String?           // Admin qui a traité
  processedAt       DateTime?
  
  User              User              @relation(fields: [userId], references: [id])
  Organization      Organization?     @relation(fields: [organizationId], references: [id])
  ProcessedBy       User?             @relation("ProcessedByUser", fields: [processedById], references: [id])
  
  @@index([organizationId, status])
  @@index([userId])
}

enum JoinRequestStatus {
  PENDING
  ACCEPTED
  REJECTED
}
```

---

### **ÉTAPE 1.4: Dashboard pour utilisateurs "flottants"**

**Scénarios après inscription:**

#### **User Freelance (pas d'organisation)**
```
Dashboard affiche:
┌─────────────────────────────────────────┐
│  Bienvenue John Doe!                    │
├─────────────────────────────────────────┤
│  Vous n'appartenez à aucune organisation│
│                                         │
│  [Créer une organisation]               │
│  [Demander à rejoindre une org]         │
│                                         │
│  En attente d'invitation? Vérifiez vos  │
│  emails.                                │
└─────────────────────────────────────────┘
```

#### **User avec JoinRequest PENDING**
```
Dashboard affiche:
┌─────────────────────────────────────────┐
│  Demande en cours                       │
├─────────────────────────────────────────┤
│  Vous avez demandé à rejoindre:         │
│  "UniteD Focus"                         │
│                                         │
│  Status: En attente d'approbation       │
│  Envoyé le: 29/12/2025                  │
│                                         │
│  [Annuler la demande]                   │
└─────────────────────────────────────────┘
```

---

### **ÉTAPE 1.5: Admin Panel - Gestion des JoinRequests**

**Admin voit dans Users Management:**

```
┌─────────────────────────────────────────────────────────┐
│  Demandes d'adhésion (3)                   [Onglet]     │
├─────────────────────────────────────────────────────────┤
│  Nom           Email              Message    Actions    │
├─────────────────────────────────────────────────────────┤
│  John Doe      john@gmail.com     "Je..."   [✓] [✗]    │
│  Jane Smith    jane@yahoo.com     null      [✓] [✗]    │
│  Bob Martin    bob@hotmail.com    "Expert"  [✓] [✗]    │
└─────────────────────────────────────────────────────────┘
```

**Routes API:**
```typescript
// GET /api/join-requests
// Lister les demandes pour mon organisation
Response: JoinRequest[] (avec User embedded)

// POST /api/join-requests/{id}/accept
// Accepter la demande
Body: { roleId: string }  // Quel rôle donner?
Action:
  1. Créer UserOrganization
  2. Update JoinRequest.status = ACCEPTED
  3. Envoyer email notification à l'user

// POST /api/join-requests/{id}/reject
// Rejeter la demande
Body: { reason?: string }
Action:
  1. Update JoinRequest.status = REJECTED
  2. Envoyer email notification (optionnel)
```

---

## 🔷 FLUX 2 DÉTAILLÉ: INVITATION (avec option Workspace)

⚠️ **CORRECTION: Ajout checkbox Workspace dans l'invitation**

```
Admin → Invite john@domain.be
  ↓
InvitationModal:
  - Email: john@domain.be
  - Rôle: Commercial
  - ☑ Créer compte Google Workspace  ← NOUVEAU
  ↓
Backend crée Invitation (token UUID)
  + Stocke: createWorkspaceAccount: true/false
  ↓
Email envoyé
  ↓
John clique lien /accept-invitation?token=XXX
  ↓
Backend vérifie token
  ↓
2 cas:
  A) John existe déjà → Juste créer UserOrganization
  B) John nouveau → Formulaire inscription + créer User + UserOrganization
  ↓
John lié à l'organisation directement
  ↓
SI createWorkspaceAccount === true:
  → Appelle AUTOMATIQUEMENT googleAdminService.createWorkspaceAccountAuto(userId)
  → Email généré: john.doe@domain.be
  → Compte Google créé
  → Email envoyé à John avec instructions
  → JOHN NE VOIT RIEN, tout est transparent
  ↓
John se connecte CRM → Workspace déjà configuré ✅
```

**Status:** ⚠️ À modifier pour ajouter checkbox + automatisation

---

## 🔷 PHASE 2: ACTIVATION GOOGLE WORKSPACE

### **PRÉREQUIS:**
- User existe dans CRM
- User lié à une Organisation
- Organisation a activé Google Workspace

---

### **ÉTAPE 2.1: Admin configure Google Workspace pour l'Organisation**

**Page:** Admin Panel → Settings → Google Workspace

**Formulaire:**
```
┌─────────────────────────────────────────────────────┐
│  Configuration Google Workspace                     │
├─────────────────────────────────────────────────────┤
│  Domaine: [unitedfocus.be]                          │
│                                                     │
│  Email Admin: [admin@unitedfocus.be]                │
│                                                     │
│  Service Account (JSON):                            │
│  [Uploader fichier .json]                           │
│                                                     │
│  OU                                                 │
│                                                     │
│  Client ID:     [________]                          │
│  Client Secret: [________]                          │
│                                                     │
│  Services à activer:                                │
│  ☑ Gmail                                            │
│  ☑ Drive                                            │
│  ☑ Calendar                                         │
│  ☐ Meet                                             │
│  ☐ Docs                                             │
│  ☐ Sheets                                           │
│                                                     │
│  [Tester la connexion] [Enregistrer]                │
└─────────────────────────────────────────────────────┘
```

**Backend:**
```typescript
POST /api/organizations/{id}/google-workspace/configure

Input:
  - domain: string
  - adminEmail: string
  - serviceAccountKey?: string (JSON parsé)
  - clientId?: string
  - clientSecret?: string
  - enabledServices: string[]

Action:
  1. Valider credentials avec Google API
  2. Créer/Update GoogleWorkspaceConfig:
     - organizationId
     - domain
     - adminEmail
     - serviceAccountEmail (extrait du JSON)
     - privateKey (extrait du JSON)
     - isActive: true
     - gmailEnabled, driveEnabled, etc.
  
  3. Retourner success

Response:
  - GoogleWorkspaceConfig créée
  - Organisation.hasGoogleWorkspace = true
```

---

### **ÉTAPE 2.2: Création AUTOMATIQUE des comptes Workspace**

⚠️ **IMPORTANT: TOUT EST AUTOMATIQUE - L'utilisateur ne voit RIEN!**

**Scénario 1: Lors de l'INVITATION**

**InvitationModal (Admin):**
```
┌─────────────────────────────────────────────────────┐
│  Inviter un nouvel utilisateur                      │
├─────────────────────────────────────────────────────┤
│  Email: [john@gmail.com]                            │
│  Rôle:  [Commercial ▼]                              │
│                                                     │
│  ☑ Créer compte Google Workspace automatiquement   │
│    (si activé pour cette organisation)              │
│                                                     │
│  [Envoyer l'invitation]                             │
└─────────────────────────────────────────────────────┘
```

**Backend POST /api/users/invitations:**
```typescript
Input:
  - email: string
  - roleName: string
  - organizationId: string
  + createWorkspaceAccount: boolean  // ← NOUVEAU

Action:
  1. Créer Invitation (comme avant)
  
  2. SI createWorkspaceAccount === true:
     a) Vérifier si GoogleWorkspaceConfig existe
     b) Si OUI:
        - Générer email: john.doe@domain.be
        - Appeler createWorkspaceAccountAuto(userId, email)
        - Créer GoogleWorkspaceUser
     c) Si NON:
        - Ignorer (pas de Workspace configuré)
  
  3. Envoyer email invitation
```

**Scénario 2: User ACCEPTE l'invitation**

**Backend POST /api/invitations/accept:**
```typescript
Action (après création User):
  1. Créer User + UserOrganization (comme avant)
  
  2. SI Invitation avait createWorkspaceAccount = true:
     → Appeler AUTOMATIQUEMENT createWorkspaceAccountAuto()
     → User NE VOIT RIEN, tout se passe en arrière-plan
  
  3. Email envoyé à l'utilisateur:
     "Votre compte a été créé.
      Email professionnel: john.doe@domain.be
      Consultez votre boîte Gmail pour définir votre mot de passe."
```

**Scénario 3: Admin active MANUELLEMENT (optionnel)**

**Page:** Admin Panel → Users Management

```
┌───────────────────────────────────────────────────┐
│  John Doe                                         │
│  john@gmail.com (CRM)                             │
│                                                   │
│  Google Workspace: ❌ Pas de compte               │
│                                                   │
│  [Activer Google Workspace]  ← UN SEUL bouton    │
└───────────────────────────────────────────────────┘
```

**Clique → Backend fait TOUT automatiquement:**
- Génère john.doe@domain.be
- Crée compte Google
- Envoie email à John
- John ne configure RIEN

**Backend:**
```typescript
POST /google-workspace/users/activate/{userId}

Input: AUCUN (juste userId en param)

Action:
  1. Récupérer User + Organization
  
  2. Récupérer GoogleWorkspaceConfig
     → Si n'existe pas: Erreur "Workspace non configuré"
  
  3. Générer email automatiquement:
     → john.doe@domain.be
  
  4. Créer compte Google (fonction auto):
     → createWorkspaceAccountAuto(userId, email)
  
  5. Envoyer email à John avec instructions
  
Response:
  - GoogleWorkspaceUser créé
  - Email envoyé
  - TOUT FAIT AUTOMATIQUEMENT
```

---

### **ÉTAPE 2.3: Service GoogleAdminService (à créer)**

⚠️ **CORRECTION: Fonction AUTOMATIQUE - Pas de paramètres manuels**

**Fichier:** `src/services/GoogleAdminService.ts`

```typescript
import { google } from 'googleapis';
import { db } from '../lib/database';
import crypto from 'crypto';

class GoogleAdminService {
  
  /**
   * Créer un compte Workspace AUTOMATIQUEMENT
   * ✅ Récupère TOUT automatiquement depuis la BDD
   * ✅ L'admin ne fournit RIEN
   */
  async createWorkspaceAccountAuto(
    userId: string
  ): Promise<{ email: string; tempPassword: string }> {
    
    // 1. Récupérer l'utilisateur
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        UserOrganization: {
          include: { Organization: true }
        }
      }
    });
    
    if (!user || !user.UserOrganization[0]) {
      throw new Error('Utilisateur sans organisation');
    }
    
    const organization = user.UserOrganization[0].Organization;
    
    // 2. Récupérer GoogleWorkspaceConfig AUTOMATIQUEMENT
    const workspaceConfig = await db.googleWorkspaceConfig.findUnique({
      where: { organizationId: organization.id }
    });
    
    if (!workspaceConfig || !workspaceConfig.isActive) {
      throw new Error('Google Workspace non configuré pour cette organisation');
    }
    
    // 3. Générer email AUTOMATIQUEMENT
    const email = this.generateEmail(
      user.firstName,
      user.lastName,
      workspaceConfig.domain
    );
    
    // 4. Créer le compte Google AUTOMATIQUEMENT
    const tempPassword = this.generateSecurePassword();
    
    await this.createGoogleUser(
      workspaceConfig,
      email,
      user.firstName,
      user.lastName,
      tempPassword
    );
    
    // 5. Créer GoogleWorkspaceUser en BDD
    await db.googleWorkspaceUser.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        email: email,
        isActive: true,
        gmailEnabled: workspaceConfig.gmailEnabled,
        driveEnabled: workspaceConfig.driveEnabled,
        calendarEnabled: workspaceConfig.calendarEnabled,
        updatedAt: new Date()
      }
    });
    
    return { email, tempPassword };
  }
  
  /**
   * Génère l'email automatiquement
   * john.doe@domain.be
   */
  private generateEmail(
    firstName: string,
    lastName: string,
    domain: string
  ): string {
    const normalizedFirstName = this.normalize(firstName);
    const normalizedLastName = this.normalize(lastName);
    return `${normalizedFirstName}.${normalizedLastName}@${domain}`;
  }
  
  /**
   * Normalise (enlève accents, espaces, etc.)
   */
  private normalize(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }
  
  /**
   * Crée le compte dans Google Admin SDK
   */
  private async createGoogleUser(
    config: any,
    email: string,
    firstName: string,
    lastName: string,
    password: string
  ): Promise<void> {
    
    // Authentification Service Account
    const auth = new google.auth.JWT({
      email: config.serviceAccountEmail,
      key: config.privateKey,
      scopes: ['https://www.googleapis.com/auth/admin.directory.user'],
      subject: config.adminEmail
    });
    
    const admin = google.admin({ version: 'directory_v1', auth });
    
    await admin.users.insert({
      requestBody: {
        primaryEmail: email,
        name: {
          givenName: firstName,
          familyName: lastName
        },
        password: password,
        changePasswordAtNextLogin: true
      }
    });
  }
  
  /**
   * Supprime un compte Workspace
   */
  async deleteWorkspaceAccount(userId: string): Promise<void> {
    const workspaceUser = await db.googleWorkspaceUser.findUnique({
      where: { userId }
    });
    
    if (!workspaceUser) return;
    
    // Récupère config + supprime dans Google
    // ... (similar logic)
    
    // Supprime de la BDD
    await db.googleWorkspaceUser.delete({
      where: { userId }
    });
  }
  
  private generateSecurePassword(): string {
    return crypto.randomBytes(16).toString('base64');
  }
}

export const googleAdminService = new GoogleAdminService();
```

**✅ AVANTAGES:**
- Admin ne fournit AUCUNE info
- TOUT est automatique
- Email généré automatiquement
- Mot de passe temporaire auto
- Config récupérée auto depuis l'org

---

## 🔷 PHASE 3: AUTHENTIFICATION ET ACCÈS AUX SERVICES

### **ÉTAPE 3.1: Quand l'utilisateur ouvre Gmail dans 2Thier**

**Scénario:** John clique sur "Gmail" dans le menu

**Frontend:**
```typescript
// GoogleGmailPageV2.tsx
useEffect(() => {
  loadMessages();
}, []);

async function loadMessages() {
  const messages = await api.get('/api/gmail/messages');
  // ...
}
```

**Backend:**
```typescript
GET /api/gmail/messages

Logique:
  1. Récupérer userId depuis req.user
  
  2. Chercher GoogleToken personnel (Phase 2 future):
     const personalToken = await db.googleToken.findFirst({
       where: { userId, organizationId }
     });
  
  3. Si personalToken existe:
     → Utiliser OAuth token personnel
     → Accès au Gmail perso de John
  
  4. Si personalToken N'EXISTE PAS:
     → Fallback sur Service Account
     
     a) Récupérer GoogleWorkspaceConfig
     b) Récupérer GoogleWorkspaceUser (john.doe@domain.be)
     c) Utiliser Service Account pour impersonate john.doe@domain.be
     d) Accéder à sa boîte Gmail professionnelle
  
  5. Retourner messages
```

---

### **ÉTAPE 3.2: Architecture d'authentification "Hybrid Smart"**

```
┌─────────────────────────────────────────────────────┐
│  NIVEAU ORGANISATION (Service Account)              │
│  GoogleWorkspaceConfig                              │
│   - domain: unitedfocus.be                          │
│   - adminEmail: admin@unitedfocus.be                │
│   - serviceAccountKey: {...}                        │
│                                                     │
│  Utilisé pour:                                      │
│   - Créer/supprimer comptes Workspace               │
│   - Accès "impersonation" aux ressources users      │
│   - Fallback quand user n'a pas de token perso     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  NIVEAU UTILISATEUR (Tokens personnels - optionnel) │
│  GoogleToken                                        │
│   - userId: john-id                                 │
│   - accessToken: ya29.xxx                           │
│   - refreshToken: 1//xxx                            │
│                                                     │
│  Utilisé pour:                                      │
│   - Accès au Gmail/Drive PERSONNEL (non-pro)        │
│   - john.perso@gmail.com                            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  LOGIQUE AU RUNTIME                                 │
├─────────────────────────────────────────────────────┤
│  Quand John demande Gmail:                          │
│    1. Cherche GoogleToken perso                     │
│    2. Si existe → Utilise OAuth perso               │
│    3. Si N'existe PAS:                              │
│       → Cherche GoogleWorkspaceUser                 │
│       → Utilise Service Account + impersonation     │
│       → Accès à john.doe@unitedfocus.be             │
└─────────────────────────────────────────────────────┘
```

---

### **ÉTAPE 3.3: Implémentation GmailService avec fallback**

```typescript
// src/services/GmailService.ts

class GmailService {
  
  async getMessages(userId: string, organizationId: string) {
    
    // 1. Essayer token personnel d'abord
    const personalToken = await db.googleToken.findFirst({
      where: { userId, organizationId }
    });
    
    if (personalToken) {
      return this.getMessagesWithOAuth(personalToken);
    }
    
    // 2. Fallback: Service Account
    const workspaceUser = await db.googleWorkspaceUser.findUnique({
      where: { userId }
    });
    
    if (!workspaceUser) {
      throw new Error('Aucun compte Google configuré');
    }
    
    const workspaceConfig = await db.googleWorkspaceConfig.findUnique({
      where: { organizationId }
    });
    
    if (!workspaceConfig) {
      throw new Error('Google Workspace non configuré pour cette organisation');
    }
    
    return this.getMessagesWithServiceAccount(
      workspaceConfig,
      workspaceUser.email
    );
  }
  
  private async getMessagesWithOAuth(token: GoogleToken) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken
    });
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50
    });
    
    return response.data.messages;
  }
  
  private async getMessagesWithServiceAccount(
    config: GoogleWorkspaceConfig,
    userEmail: string
  ) {
    // Authentification Service Account avec impersonation
    const auth = new google.auth.JWT({
      email: config.serviceAccountEmail,
      key: config.privateKey,
      scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      subject: userEmail  // IMPERSONATE john.doe@unitedfocus.be
    });
    
    const gmail = google.gmail({ version: 'v1', auth });
    const response = await gmail.users.messages.list({
      userId: 'me',  // 'me' = john.doe@unitedfocus.be
      maxResults: 50
    });
    
    return response.data.messages;
  }
}
```

---

## 📋 RÉCAPITULATIF COMPLET DU FLUX

### **POUR UN NOUVEL UTILISATEUR AUTONOME:**

```
1. John arrive sur app.2thier.be
   ↓
2. Clique "S'inscrire"
   ↓
3. Choisit "Créer une organisation" → "UniteD Focus"
   ↓
4. Compte créé + Organisation créée + John = Admin
   ↓
5. John se connecte → Dashboard
   ↓
6. John va dans Settings → Configure Google Workspace
   ↓
7. John upload Service Account key + configure domain
   ↓
8. GoogleWorkspaceConfig créée pour UniteD Focus
   ↓
9. John va dans Users → Clique "Créer compte Workspace" pour lui
   ↓
10. GoogleAdminService crée john.doe@unitedfocus.be dans Google
    ↓
11. GoogleWorkspaceUser créé en BDD
    ↓
12. John clique "Gmail" dans le menu
    ↓
13. Backend utilise Service Account + impersonation
    ↓
14. John voit sa boîte john.doe@unitedfocus.be
    ✅ SUCCÈS!
```

### **POUR UN UTILISATEUR INVITÉ:**

```
1. Admin invite marie@gmail.com
   ↓
2. Marie reçoit email
   ↓
3. Marie accepte → Compte créé + liée à UniteD Focus
   ↓
4. Admin crée compte Workspace pour Marie
   ↓
5. marie.dupont@unitedfocus.be créé dans Google
   ↓
6. Marie se connecte CRM → clique Gmail
   ↓
7. Voit marie.dupont@unitedfocus.be
   ✅ SUCCÈS!
```

---

## 🎯 CHECKLIST D'IMPLÉMENTATION COMPLÈTE

### **Phase 1: Inscription améliorée**
- [ ] Modifier RegisterPage.tsx (3 choix)
- [ ] Créer migration: model JoinRequest
- [ ] Modifier POST /api/register (3 cas)
- [ ] Créer GET /api/join-requests
- [ ] Créer POST /api/join-requests/{id}/accept
- [ ] Créer POST /api/join-requests/{id}/reject
- [ ] UI Admin: Onglet "Demandes d'adhésion"
- [ ] UI Dashboard: Mode freelance/attente

### **Phase 2: Google Workspace Configuration**
- [ ] Page Settings → Google Workspace
- [ ] POST /api/organizations/{id}/google-workspace/configure
- [ ] Validation credentials Google
- [ ] Stockage sécurisé Service Account keys

### **Phase 3: Création comptes Workspace**
- [ ] Créer GoogleAdminService.ts
- [ ] Implémenter createUser()
- [ ] Implémenter deleteUser()
- [ ] POST /google-workspace/users/create
- [ ] GET /google-workspace/users/{id}/status
- [ ] Email notification création compte

### **Phase 4: Authentification hybride**
- [ ] GmailService avec fallback
- [ ] DriveService avec fallback
- [ ] CalendarService avec fallback
- [ ] Logique d'impersonation Service Account
- [ ] Gestion refresh tokens

### **Phase 5: Tokens personnels (optionnel futur)**
- [ ] UI "Connecter mon Google perso"
- [ ] OAuth flow pour tokens perso
- [ ] Priorité tokens perso > Service Account

---

**VOILÀ LE FLUX COMPLET DE A à Z !**

**Prêt à commencer l'implémentation? Par quelle phase on commence?** 🚀
