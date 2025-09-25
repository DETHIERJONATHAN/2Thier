# 🎯 ROADMAP COMPLET - Finalisation Page Lead

## 📋 Vue d'ensemble
**Objectif** : Transformer la page `LeadDetail.tsx` en centre de contrôle complet pour la gestion des leads avec intégration Telnyx pour les appels.

---

## 🚀 PHASE 1 : Amélioration Interface Lead (PRIORITÉ ABSOLUE)

### 1.1 Boutons d'Action Principaux
- [ ] **📞 Bouton "Appeler"** - Ouvre module d'appel Telnyx (popup modal)
- [ ] **📋 Bouton "Nouveau Devis"** - Redirige vers formulaire avec pré-remplissage
- [ ] **📝 Bouton "Modifier Devis"** - Liste des devis existants
- [ ] **📅 Bouton "Rendez-vous"** - Intégration agenda Google
- [ ] **🗺️ Bouton "Maps"** - Navigation GPS directe chez le client
- [ ] **📧 Bouton "Email"** - Ouverture client email avec template

### 1.2 Réorganisation Layout
- [ ] **En-tête avec informations essentielles** : Nom, entreprise, statut, assignation
- [ ] **Section boutons d'action** en évidence
- [ ] **Timeline des interactions** (appels, emails, rendez-vous)
- [ ] **Résumé des devis** avec statuts visuels
- [ ] **Historique complet** des activités

---

## 🔥 PHASE 2 : Module d'Appel Telnyx (CRITIQUE)

### 2.1 Configuration Telnyx
- [ ] **Compte Telnyx** - Création et configuration
- [ ] **Numéro belge** - Acquisition numéro fixe/mobile
- [ ] **API Keys** - Configuration sécurisée
- [ ] **Webhooks** - Configuration pour tracking temps réel

### 2.2 Popup Module d'Appel (MODAL OBLIGATOIRE)
- [ ] **Interface popup** non-fermable tant que call non terminé
- [ ] **Numérotation automatique** depuis données lead
- [ ] **Timer d'appel** en temps réel
- [ ] **Statuts d'appel** : En cours, Répondu, Pas de réponse, Occupé, Échec
- [ ] **Prise de notes** pendant l'appel
- [ ] **Enregistrement automatique** si autorisé

### 2.3 Gestion Statuts Post-Appel
**Statuts d'appel disponibles :**
- [ ] ✅ **Répondu** - Conversation réussie
- [ ] ❌ **Pas de réponse** - Sonnerie sans décrochage  
- [ ] 📞 **Occupé** - Ligne occupée
- [ ] 🔇 **Messagerie** - Répondeur
- [ ] ⚠️ **Numéro invalide** - Erreur technique

**Actions conditionnelles :**
- [ ] **Si "Répondu"** → Choix nouveau statut lead (Contacté, RDV programmé, etc.)
- [ ] **Si "RDV programmé"** → **OUVERTURE AGENDA OBLIGATOIRE**
- [ ] **Si "Pas de réponse"** → Planification rappel automatique
- [ ] **Si "Non qualifié"** → Passage statut "Perdu" avec raison

### 2.4 Intégration Agenda dans Module d'Appel
- [ ] **Activation conditionnelle** : Agenda ne s'ouvre QUE si statut "RDV programmé"
- [ ] **Mini-calendrier intégré** dans le popup d'appel
- [ ] **Sélection date/heure** directe
- [ ] **Pré-remplissage automatique** : nom client, adresse, téléphone
- [ ] **Synchronisation Google Calendar** instantanée
- [ ] **Retour au module d'appel** après création RDV

---

## 📊 PHASE 3 : Tracking & Historique

### 3.1 Base de Données - Nouvelles Tables
```sql
-- Table des appels
CREATE TABLE lead_calls (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  user_id UUID REFERENCES users(id),
  phone_number VARCHAR(20),
  call_sid VARCHAR(100), -- Telnyx Call SID
  direction ENUM('outbound', 'inbound'),
  status ENUM('answered', 'no_answer', 'busy', 'failed', 'voicemail'),
  duration INTEGER, -- en secondes
  recording_url VARCHAR(500),
  notes TEXT,
  created_at TIMESTAMP,
  ended_at TIMESTAMP
);

-- Table des rendez-vous
CREATE TABLE lead_appointments (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  user_id UUID REFERENCES users(id),
  call_id UUID REFERENCES lead_calls(id), -- Lié à l'appel qui a créé le RDV
  title VARCHAR(200),
  description TEXT,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  location TEXT,
  google_event_id VARCHAR(100),
  status ENUM('scheduled', 'confirmed', 'cancelled', 'completed'),
  created_at TIMESTAMP
);
```

### 3.2 Statistiques d'Appels
- [ ] **Nombre total d'appels** par lead
- [ ] **Temps total de conversation**
- [ ] **Taux de réponse** (répondu/total)
- [ ] **Délai moyen entre appels**
- [ ] **Conversion appel → RDV**
- [ ] **Conversion RDV → Devis**

### 3.3 Timeline Visuelle
- [ ] **Chronologie complète** des interactions
- [ ] **Icônes par type** : 📞 Appel, 📅 RDV, 📋 Devis, 📧 Email
- [ ] **Durées affichées** pour chaque appel
- [ ] **Notes résumées** visibles au survol
- [ ] **Filtrage par type** d'activité

---

## ⚙️ PHASE 4 : Intégrations Avancées

### 4.1 Google Maps Integration
- [ ] **Bouton Maps** → Ouverture automatique navigation
- [ ] **Adresse auto-détectée** depuis données lead
- [ ] **Calcul temps de trajet** affiché
- [ ] **Envoi SMS** avec coordonnées au commercial

### 4.2 Gestion Statuts Leads Personnalisés
- [ ] **Page admin** pour gérer les statuts
- [ ] **CRUD complet** : Créer, modifier, supprimer statuts
- [ ] **Couleurs personnalisées** pour chaque statut
- [ ] **Workflow personnalisé** : statut A peut passer vers statuts B, C, D
- [ ] **Statuts d'appel vs statuts lead** séparés

### 4.3 API Fournisseurs de Leads
- [ ] **Endpoint API public** `/api/leads/external`
- [ ] **Authentication par API key** 
- [ ] **Validation des données** entrantes
- [ ] **Mapping automatique** des champs
- [ ] **Notification temps réel** nouveau lead
- [ ] **Webhook de confirmation** vers fournisseur

---

## 🎨 PHASE 5 : UX/UI Polish

### 5.1 Design System
- [ ] **Badges colorés** pour statuts
- [ ] **Animations fluides** pour transitions
- [ ] **Loading states** pour tous les appels API
- [ ] **Toast notifications** pour actions réussies/échouées
- [ ] **Responsive design** pour tablets

### 5.2 Raccourcis Clavier
- [ ] **Ctrl+D** : Nouveau devis
- [ ] **Ctrl+Shift+A** : Appeler lead
- [ ] **Ctrl+M** : Ouvrir Maps
- [ ] **Ctrl+R** : Nouveau rendez-vous
- [ ] **Échap** : Fermer modals (sauf module d'appel en cours)

---

## 🚦 ORDRE D'IMPLÉMENTATION RECOMMANDÉ

### Sprint 1 (3-4 jours) : Base
1. Restructuration UI LeadDetail.tsx avec boutons d'action
2. Création des nouvelles tables base de données
3. API endpoints pour calls et appointments

### Sprint 2 (3-4 jours) : Module d'Appel
1. Configuration Telnyx + compte
2. Popup module d'appel avec interface complète
3. Gestion statuts post-appel
4. Enregistrement en base des appels

### Sprint 3 (2-3 jours) : Agenda Intégré
1. Mini-calendrier dans popup appel
2. Intégration Google Calendar
3. Workflow RDV programmé → Agenda → Retour module

### Sprint 4 (2-3 jours) : Timeline & Stats
1. Timeline visuelle des interactions
2. Statistiques d'appels
3. Historique complet

### Sprint 5 (1-2 jours) : Intégrations
1. Google Maps
2. Gestion statuts personnalisés
3. Polish final UX/UI

---

## ✅ CRITÈRES DE VALIDATION

### Tests Fonctionnels
- [ ] **Appel sortant** fonctionne avec Telnyx
- [ ] **Popup ne se ferme pas** pendant appel
- [ ] **Agenda s'ouvre automatiquement** si RDV programmé
- [ ] **Timeline affiche** tous les événements chronologiquement
- [ ] **Statuts se mettent à jour** en temps réel
- [ ] **Maps s'ouvre** avec bonne adresse
- [ ] **Données sauvegardées** correctement en base

### Tests Performance
- [ ] **Popup s'ouvre** en moins de 500ms
- [ ] **Appel se lance** en moins de 2 secondes
- [ ] **Timeline se charge** en moins de 1 seconde
- [ ] **Pas de lag** pendant prise de notes

---

## 💡 AMÉLIORATIONS FUTURES (Post-MVP)

- [ ] **IA Transcription** automatique des appels
- [ ] **Sentiment analysis** des conversations
- [ ] **Prédiction best time to call** par lead
- [ ] **Auto-scheduling** de rappels intelligents
- [ ] **Templates d'emails** automatiques post-appel
- [ ] **Intégration WhatsApp** pour messaging
- [ ] **Reporting avancé** avec graphiques

---

**🎯 OBJECTIF FINAL** : Page Lead transformée en véritable centre de contrôle commercial avec workflow fluide Appel → Statut → RDV → Devis, le tout tracké et analysé pour optimiser les conversions.
