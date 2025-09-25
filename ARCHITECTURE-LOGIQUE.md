# 🏗️ ARCHITECTURE LOGIQUE CRM - ENTREPRISE REINE

## 🎯 LOGIQUE MÉTIER

### 👑 **ENTREPRISE REINE (2Thier)**
- **Propriétaire du CRM**
- **Super Admin unique**
- **Configure le système global**

### 🏢 **ORGANISATIONS CLIENTES**
- **Utilisent le CRM**
- **Admins locaux**
- **Configurations spécifiques**

---

## 📋 **PAGES ET RESPONSABILITÉS**

### 1️⃣ **PAGE SETUP INITIALE** (`/setup`) - MANQUANTE ❌
**Utilisateur** : Entreprise reine (première fois)
**Fonction** : 
- ✅ Créer compte Super Admin principal
- ✅ Configurer Google Workspace GLOBAL
- ✅ Paramètres système (domaine, emails)
- ✅ Activation modules globaux

### 2️⃣ **PAGE GOOGLE WORKSPACE** (`/admin/google-workspace`) - ✅ EXISTE
**Utilisateur** : Super Admin (entreprise reine)
**Fonction** :
- 🔧 Configuration OAuth globale
- 📧 Gestion emails système
- 🔑 Mots de passe unifiés
- 📊 Statut connexions globales

### 3️⃣ **PAGE ORGANISATIONS** (`/admin/organizations`) - ✅ EXISTE
**Utilisateur** : Super Admin (entreprise reine)
**Fonction** :
- 🏢 CRUD organisations clientes
- ⚙️ Configuration Google Workspace PAR organisation
- 👥 Gestion utilisateurs par organisation
- 📈 Statistiques par organisation

### 4️⃣ **PAGES ADMIN LOCALES** (chaque organisation)
**Utilisateur** : Admin local d'organisation
**Fonction** :
- 👤 Gérer SES utilisateurs
- 🔧 Ajuster SES modules (dans les limites)
- 📊 Voir SES statistiques

---

## 🔄 **FLUX LOGIQUE**

```
1. ENTREPRISE REINE
   │
   ├── /setup (PREMIÈRE FOIS) ← MANQUANT
   │   ├── Créer Super Admin
   │   ├── Config Google Workspace global
   │   └── Paramètres système
   │
   ├── /admin/google-workspace (GLOBAL)
   │   ├── OAuth système
   │   ├── Emails unifiés
   │   └── Connexions
   │
   └── /admin/organizations (GESTION CLIENTS)
       ├── Créer organisations
       ├── Config Google par org
       └── Gérer accès clients

2. ORGANISATIONS CLIENTES
   │
   └── /admin/* (LOCAL À L'ORG)
       ├── Leurs utilisateurs
       ├── Leurs modules (limités)
       └── Leurs données
```

---

## 🎯 **ACTION PRIORITAIRE**

**CRÉER** la page `/setup` pour l'entreprise reine !

**Objectif** : Premier setup du CRM avec création du Super Admin et configuration globale Google Workspace.
