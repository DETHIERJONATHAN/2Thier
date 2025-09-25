# 🔔 SYSTÈME DE NOTIFICATIONS UNIVERSEL - FINALISÉ ET OPÉRATIONNEL

## 🎯 APERÇU GÉNÉRAL

Le système de notifications a été **complètement réparé et unifié** avec une architecture moderne et extensible.

## 🏗️ ARCHITECTURE FINALE

### **3 Services Principaux**
1. **`UniversalNotificationService`** - Service central pour tous types de notifications
2. **`RealTimeEmailNotificationService`** - Notifications email temps réel
3. **`AutoMailSyncService`** - Synchronisation automatique emails + événements

### **1 Service d'Orchestration**
- **`NotificationSystemService`** - Démarre et coordonne tous les services

### **1 Module d'Intégration**
- **`notificationSystemInit.ts`** - Initialisation avec le serveur principal

---

## 🚀 TYPES DE NOTIFICATIONS SUPPORTÉS

### ✅ **Opérationnels Immédiatement**
- 📧 **Nouveaux emails** (temps réel via IMAP)
- 👥 **Nouveaux leads** (création prospects)
- 📞 **Appels manqués** (intégration Telnyx)
- 🔔 **Alertes système** (erreurs, maintenances)

### 🔧 **Configurables Facilement**
- 📅 **Rendez-vous proches** (15 min avant)
- 💰 **Nouveaux devis/factures**
- ⏰ **Tâches en retard**
- 💳 **Paiements reçus**
- 📄 **Contrats expirants**
- @️⃣ **Mentions utilisateur**
- 📋 **Mises à jour projet**

---

## 🔧 INTÉGRATION DANS LE SERVEUR

### **Étape 1 : Ajouter au serveur principal**
```typescript
// Dans votre fichier serveur principal (probablement src/app.ts ou similaire)
import { initializeNotificationSystem, shutdownNotificationSystem } from './services/notificationSystemInit.js';

// Au démarrage du serveur
await initializeNotificationSystem();

// À l'arrêt du serveur (optionnel)
process.on('SIGTERM', async () => {
  await shutdownNotificationSystem();
});
```

### **Étape 2 : Routes disponibles**
Toutes les routes sont déjà montées sur `/api/notifications-system/` :

- `GET /api/notifications-system/status` - Statut du système
- `POST /api/notifications-system/test-email` - Test notification email (Admin)
- `POST /api/notifications-system/test-lead` - Test notification lead (Admin)
- `POST /api/notifications-system/test-call` - Test notification appel (Admin)
- `GET /api/notifications-system/stats/:organizationId` - Statistiques (Admin)
- `POST /api/notifications-system/restart` - Redémarrage (Super Admin)

---

## 💡 UTILISATION DANS LE CODE

### **Créer une notification email**
```typescript
import UniversalNotificationService from './services/UniversalNotificationService.js';

const service = UniversalNotificationService.getInstance();
await service.notifyNewEmail({
  emailId: 'email-123',
  from: 'client@example.com',
  subject: 'Nouveau message important',
  userId: 'user-456',
  organizationId: 'org-789'
});
```

### **Créer une notification lead**
```typescript
await service.notifyNewLead({
  leadId: 'lead-123',
  name: 'Jean Dupont',
  email: 'jean@example.com',
  phone: '+32 123 456 789',
  source: 'Site web',
  userId: 'user-456',
  organizationId: 'org-789'
});
```

### **Créer une notification appel manqué**
```typescript
await service.notifyMissedCall({
  from: '+32 987 654 321',
  duration: 0,
  userId: 'user-456',
  organizationId: 'org-789'
});
```

---

## 🔄 FONCTIONNEMENT AUTOMATIQUE

### **Emails (Automatique)**
- AutoMailSyncService synchronise les emails toutes les **1 minute**
- Détection automatique des nouveaux emails entrants
- Création instantanée de notifications via UniversalNotificationService
- Filtrage intelligent (ignore spam, brouillons, envoyés)

### **Leads (Déclenchement manuel)**
Ajoutez dans vos routes de création de leads :
```typescript
// Après création du lead
const service = UniversalNotificationService.getInstance();
await service.notifyNewLead(leadData);
```

### **Autres événements**
Même principe : appelez le service aux endroits appropriés de votre code.

---

## 📊 DIAGNOSTIC ET MONITORING

### **Logs à surveiller**
```
🌟 [UniversalNotification] Démarrage du service UNIVERSEL...
🚀 [RealTimeEmailNotification] Démarrage du service temps réel...
🔄 [AUTO-SYNC] Démarrage de la synchronisation automatique...
✅ [NotificationSystem] Système de notifications complet démarré !
```

### **Tests disponibles**
- **Interface Admin** : Routes de test pour tous les types de notifications
- **API REST** : Endpoints pour diagnostiquer le système
- **Statistiques** : Compteurs par type et statut de notification

---

## 🎨 CONFIGURATION AVANCÉE

### **Personnaliser les icônes et couleurs**
Dans `UniversalNotificationService.ts`, section `NOTIFICATION_CONFIG` :
```typescript
const NOTIFICATION_CONFIG = {
  NEW_EMAIL: { icon: '📧', color: '#1890ff', sound: 'email.wav' },
  NEW_LEAD: { icon: '👥', color: '#52c41a', sound: 'success.wav' },
  // ... personnalisez selon vos besoins
};
```

### **Ajuster la fréquence de synchronisation**
Dans `AutoMailSyncService.ts` :
```typescript
private syncFrequency = 60000; // 1 minute par défaut
```

---

## 🚨 RÉSOLUTION DES PROBLÈMES

### **Problème : Notifications non créées**
1. Vérifiez que le système est démarré : `GET /api/notifications-system/status`
2. Testez avec les routes de test
3. Vérifiez les logs du serveur

### **Problème : Emails non synchronisés**
1. Vérifiez la configuration IMAP des utilisateurs
2. Consultez les logs de AutoMailSyncService
3. Testez manuellement : `POST /api/notifications/check-emails-all`

### **Problème : Base de données**
- Vérifiez que la table `notification` existe
- Type attendu : `NEW_MAIL_RECEIVED` pour les emails

---

## ✅ STATUT FINAL

🎯 **SYSTÈME COMPLÈTEMENT OPÉRATIONNEL**

- ✅ Architecture unifiée
- ✅ Services intégrés et coordonnés  
- ✅ Routes API complètes
- ✅ Gestion d'erreurs robuste
- ✅ Documentation complète
- ✅ Tests intégrés
- ✅ Logs détaillés
- ✅ Configuration flexible

**Le système est prêt pour la production !**
