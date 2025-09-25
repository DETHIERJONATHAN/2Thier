# 📋 Documentation Système Leads & Appels - Intégrations Complètes

> **Dernière mise à jour :** 5 août 2025  
> **Vers### 🎯 ### 🎯 **Dans LeadDetail.tsx**

| Bouton | Action | Fonctionnement | Statut |
|--------|--------|----------------|---------|
| "Appeler avec Telnyx" (Header) | `onCall?.(lead.id)` | Callback vers parent → Modal | ✅ Connecté |
| "📞 Appeler avec Telnyx" (Actions) | `onCall?.(lead.id)` | Callback vers parent → Modal | ✅ Connecté |
| "📧 Envoyer via Gmail" | `onEmail?.(lead.id)` | Callback vers parent → Modal | ✅ Connecté |
| "📅 Agenda Google" | `onSchedule?.(lead.id)` | Callback vers parent → Modal | ✅ Connecté |
| "📅 Reprogrammer" (Timeline) | `onSchedule?.(lead.id)` | Callback vers parent → Modal | ✅ Connecté |
| "Modifier" | `onEdit(lead)` | Modal d'édition | 🚧 En attente |dDetail.tsx**

| Bouton | Action | Destination | Statut |
|--------|--------|-------------|---------|
| "Appeler avec Telnyx" (Header) | `navigate('/leads/call/${lead.id}')` | CallModule.tsx | ✅ Connecté |
| "📞 Appeler avec Telnyx" (Actions) | `navigate('/leads/call/${lead.id}')` | CallModule.tsx | ✅ Connecté |
| "📧 Envoyer via Gmail" | `navigate('/google-gmail?leadId=${lead.id}')` | GoogleMailPage | ✅ Connecté |
| "📅 Agenda Google" | `navigate('/google-agenda?leadId=${lead.id}')` | GoogleAgendaPage | ✅ Connecté |
| "📅 Reprogrammer" (Timeline) | `navigate('/google-agenda?leadId=${lead.id}')` | GoogleAgendaPage | ✅ Connecté |
| "Modifier" | `onEdit(lead)` | Modal d'édition | 🚧 En attente |

**🔧 Correction appliquée :** Remplacement de `window.open()` par `navigate()` pour utiliser le router React de manière appropriée.0  
> **Statut :** En cours de développement

## 🎯 **Vue d'ensemble du Système**

Le système CRM Leads & Appels est un module complet qui intègre plusieurs services externes (Telnyx, Google Workspace) avec une architecture en 3 niveaux :

1. **Configuration** (Admin/Organisation)
2. **Personnalisation** (Utilisateur)
3. **Utilisation** (Modules opérationnels)

---

## 🏗️ **Architecture Générale**

### 📁 **Structure des fichiers**
```
src/pages/Leads/
├── LeadsHomePage.tsx           # 🏠 Page principale avec navigation par onglets
├── LeadsKanban.tsx            # 🎯 Pipeline drag & drop
├── LeadsDashboard.tsx         # 📊 Métriques commerciales
├── LeadsSettingsPage.tsx      # ⚙️ Configuration du module
├── CallModule.tsx             # 📞 Module d'appel Telnyx intégré
├── EmailModule.tsx            # ✉️ Module email Google intégré
└── LeadDetail.tsx             # 📋 Détails complet d'un lead

src/components/leads/
├── LeadDetail.tsx             # 📄 Composant détail réutilisable
├── CreateLeadModal.tsx        # ➕ Modal création de lead
├── GmailWidget.tsx            # 📧 Widget Gmail intégré
├── CalendarWidget.tsx         # 📅 Widget Google Agenda
└── LeadCallHistory.tsx        # 📞 Historique des appels
```

---

## 🔗 **Connexions et Intégrations Actives**

### 1️⃣ **Module d'Appel Telnyx**

#### ✅ **ÉTAT :** Fonctionnel et connecté

**📍 Fonctionnement correct :**
1. **LeadsPage.tsx** gère l'état des modals/drawers avec `handleCallLead()`
2. **LeadsHomePage.tsx** reçoit `onCallLead` callback du parent
3. **LeadDetail.tsx** utilise `onCall` callback (PAS de navigation directe)
4. **CallModule.tsx** s'ouvre dans un Drawer/Modal (PAS comme page standalone)

**🎯 Architecture callbacks :**
```
LeadsPage.tsx (handleCallLead) 
    ↓
LeadsHomePage.tsx (onCallLead) 
    ↓  
LeadDetail.tsx (onCall) 
    ↓
Modal/Drawer → CallModule.tsx
```

**🔧 Configuration requise :**
1. **Admin/Organisation :** Configuration API Telnyx, achat de numéros
2. **Utilisateur :** Assignation d'un numéro personnel
3. **Module :** Utilise la configuration existante (pas de setup dans le module)

**❌ ERREUR PRÉCÉDENTE :** Tentative de navigation vers `/leads/call/:leadId` qui charge une page blanche car le module nécessite le contexte parent avec les callbacks.

---

### 2️⃣ **Widgets Google Workspace**

#### 📧 **Gmail Widget**
**📁 Fichier :** `src/components/leads/GmailWidget.tsx`
**📍 Usage prévu :** Intégration dans les détails de leads pour voir/envoyer emails
**🚧 Statut :** Créé mais pas encore intégré dans LeadDetail.tsx

#### 📅 **Calendar Widget**
**📁 Fichier :** `src/components/leads/CalendarWidget.tsx`
**📍 Usage prévu :** Planification RDV directement depuis la fiche lead
**🚧 Statut :** Existant mais pas connecté

#### 📁 **Drive Widget**
**📁 Fichier :** `src/components/leads/DriveWidget.tsx`
**📍 Usage prévu :** Accès aux documents liés au lead
**🚧 Statut :** Existant mais pas connecté

---

### 3️⃣ **Navigation et Structure**

#### 🏠 **LeadsHomePage.tsx** - Page Principale
**🎯 Rôle :** Hub central avec navigation par onglets

**📋 Onglets configurés :**
1. **Liste** - Tableau des leads avec filtres
2. **Kanban** - Pipeline visuel drag & drop  
3. **Dashboard** - Métriques et graphiques
4. **Paramètres** - Configuration du module

**🔗 Connexions actives :**
- Boutons d'action dans chaque vue redirigent vers les modules spécialisés
- Navigation intégrée (pas de menu dupliqué)
- Context partagé entre tous les onglets

#### 📊 **Kanban Pipeline**
**📁 Fichier :** `src/pages/Leads/LeadsKanban.tsx`
**🎯 Étapes :** Nouveau → Contacté → RDV → Devis → Gagné/Perdu
**🔗 Intégrations :**
- Timeline automatique avec `src/utils/leadTimeline.ts`
- Calculs de délais par source (Bobex 24h, Google Ads 24h, etc.)
- Drag & drop fonctionnel avec react-dnd

---

## 📱 **Boutons d'Action et Redirections**

### 🎯 **Dans LeadDetail.tsx**

| Bouton | Action | Destination | Statut |
|--------|--------|-------------|---------|
| "Appeler avec Telnyx" (Header) | `window.open('/leads/call/${lead.id}')` | CallModule.tsx | ✅ Connecté |
| "📞 Appeler avec Telnyx" (Actions) | `window.open('/leads/call/${lead.id}')` | CallModule.tsx | ✅ Connecté |
| "📧 Envoyer via Gmail" | `window.open('/google-gmail?leadId=${lead.id}')` | GoogleMailPage | ✅ Connecté |
| "� Agenda Google" | `window.open('/google-agenda?leadId=${lead.id}')` | GoogleAgendaPage | ✅ Connecté |
| "📅 Reprogrammer" (Timeline) | `window.open('/google-agenda?leadId=${lead.id}')` | GoogleAgendaPage | ✅ Connecté |
| "Modifier" | `onEdit(lead)` | Modal d'édition | 🚧 En attente |

### 📞 **Dans CallModule.tsx**

| Élément | Fonction | Intégration |
|---------|----------|-------------|
| Bouton "Démarrer l'appel" | `startCall()` | API Telnyx |
| Script IA | `generateAIScript()` | Analyse profil lead |
| Statuts d'appel | 7 options prédéfinies | Base de données |
| Validation | Statut OU note obligatoire | Avant sauvegarde |

---

## 🔧 **Configuration Hiérarchique**

### 🏢 **Niveau Organisation**
**📁 Fichiers de config :**
- `src/components/admin/TelnyxConfig.tsx` - Configuration API et numéros
- `src/pages/admin/OrganizationsAdminPageNew.tsx` - Interface admin
- `src/pages/admin/IntegrationsAdminPage.tsx` - Gestion intégrations

**⚙️ Éléments configurés :**
- Clés API Telnyx
- Numéros de téléphone achetés
- Connexions et webhooks
- Permissions par module

### 👤 **Niveau Utilisateur**
**📁 Fichiers de config :**
- `src/components/admin/UserTelnyxModal.tsx` - Config utilisateur
- `src/services/TelnyxService.ts` - Service de gestion

**⚙️ Éléments configurés :**
- Numéro assigné à l'utilisateur
- Permissions d'appel
- Scripts personnalisés

---

## 🚀 **Prochaines Intégrations Prévues**

### 📧 **Gmail Integration**
- [ ] Connecter GmailWidget dans LeadDetail.tsx
- [ ] Bouton "Envoyer email" → Ouverture du widget Gmail
- [ ] Synchronisation historique emails ↔ timeline lead

### 📅 **Google Agenda Integration**
- [ ] Connecter CalendarWidget dans LeadDetail.tsx  
- [ ] Bouton "Planifier RDV" → Interface Google Agenda
- [ ] Synchronisation RDV ↔ statut lead

### 📊 **Dashboard Complet**
- [ ] Métriques par source de lead
- [ ] Performance par commercial
- [ ] Prévisions de conversion
- [ ] Graphiques temps réel

### ⚙️ **Settings Avancés**
- [ ] Configuration IA et scripts
- [ ] Templates d'emails
- [ ] Automatisations de processus
- [ ] Gestion des statuts personnalisés

---

## 🐛 **Debug et Maintenance**

### 📝 **Logs importants**
```javascript
// Dans CallModule.tsx
console.log('📞 [Telnyx] Initiation d\'appel:', values);

// Dans LeadDetail.tsx  
console.log('[LeadDetail] Récupération du lead:', leadId);

// Dans GmailWidget.tsx
console.error('Erreur lors du chargement des emails:', error);
```

### 🔍 **Points de contrôle**
1. Vérifier la configuration Telnyx dans Organisation
2. Vérifier l'assignation du numéro utilisateur
3. Tester la route `/leads/call/:leadId`
4. Vérifier les permissions du module leads

---

## 📚 **Références Techniques**

### 🔗 **APIs Utilisées**
- **Telnyx API :** `/api/telnyx/call`, `/api/telnyx/hangup`
- **Leads API :** `/api/leads`, `/api/leads/${id}/calls`
- **Gmail API :** `/api/gmail/search`, `/api/gmail/send`

### 📦 **Dépendances Clés**
- `react-dnd` - Drag & drop Kanban
- `dayjs` - Gestion dates et timeline  
- `antd` - Composants UI
- `recharts` - Graphiques dashboard

### 🎨 **Conventions de Code**
- Utiliser `useAuthenticatedApi` pour tous les appels API
- Stabiliser les hooks avec `useMemo` et `useCallback`
- Préfixer les logs avec le nom du composant
- Utiliser les conventions d'emails : `prénom.nom@organisation.be`

---

**📝 Note :** Cette documentation sera mise à jour à chaque nouvelle intégration ou modification du système.
