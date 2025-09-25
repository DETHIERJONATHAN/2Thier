# 🎯 MAPPING STATUTS : Appels ↔ Leads

## 📋 Vue d'ensemble

Le système de mapping intelligent connecte automatiquement les **résultats d'appels** avec les **statuts de leads** pour une gestion cohérente du pipeline commercial.

## 🔄 Mapping Automatique

### Statuts d'Appels → Statuts de Leads

| Résultat d'Appel | Statut Lead Recommandé | Logique |
|-------------------|------------------------|---------|
| ✅ **Répondu** | **Contacté** | Contact établi avec succès |
| 📅 **RDV programmé** | **RDV Programmé** | Meeting planifié |
| ❌ **Pas intéressé** | **Perdu** | Lead définitivement non intéressé |
| 🔄 **Rappel demandé** | **Contacté** | Contact établi, suivi nécessaire |
| 📵 **Pas de réponse** | **Nouveau** | Reste en attente pour retry |
| 📞 **Occupé** | **Nouveau** | Reste en attente pour retry |
| 📧 **Répondeur** | **Contacté** | Message laissé = contact établi |
| ⚠️ **Numéro invalide** | **Perdu** | Impossible à contacter |

## 🎨 Statuts de Leads Dynamiques

Les statuts de leads sont chargés dynamiquement depuis la base de données :

```typescript
// Récupération automatique via API
const statuses = await api.get('/api/settings/lead-statuses');

// Chaque statut contient :
{
  id: string,      // UUID pour la relation
  name: string,    // "Nouveau", "Contacté", etc.
  color: string,   // Couleur hexadécimale
  order: number    // Ordre d'affichage
}
```

## 🔧 Fonctionnalités Intelligentes

### 1. **Auto-Sélection**
- Dès que vous choisissez un résultat d'appel, le statut de lead correspondant est automatiquement sélectionné
- Vous pouvez modifier la suggestion si nécessaire

### 2. **Validation Croisée**
- Impossible d'enregistrer sans choisir les deux statuts
- Feedback visuel en temps réel
- Résumé de l'action avant validation

### 3. **Actions Conditionnelles**
```typescript
// Si RDV programmé → Redirection agenda
if (callStatus === 'meeting_scheduled') {
  navigate(`/calendar?leadId=${leadId}&action=schedule`);
}

// Sinon → Retour fiche lead
else {
  navigate(`/leads/${leadId}`);
}
```

## 📊 Sauvegarde Complète

Lors de l'enregistrement d'un appel :

```typescript
await api.put(`/api/leads/${leadId}`, {
  statusId: leadStatus,                    // Nouveau statut (UUID)
  lastContactType: 'call',                 // Type de contact
  lastContact: new Date().toISOString(),   // Horodatage
  callHistory: {                           // Historique d'appel
    timestamp: new Date().toISOString(),
    status: callStatus,
    duration: 0,
    notes: "Détails de l'appel"
  }
});
```

## 🎯 Utilisation

### Dans CallModule :
```tsx
<CallStatus 
  leadId={leadId}
  onCallCompleted={(callStatus, leadStatusName) => {
    console.log(`Appel ${callStatus} → Lead ${leadStatusName}`);
    // Actions post-appel
  }}
/>
```

### Workflow utilisateur :
1. **Effectuer l'appel** (Telnyx/autre)
2. **Choisir le résultat** (Répondu, RDV, etc.)
3. **Valider le statut lead** (auto-sélectionné)
4. **Enregistrer** → Mise à jour automatique du lead
5. **Navigation conditionnelle** (agenda si RDV, fiche lead sinon)

## 🔄 Synchronisation

- ✅ **Kanban** : Le lead change de colonne automatiquement
- ✅ **Liste** : Le statut s'affiche avec la bonne couleur
- ✅ **Historique** : L'appel est tracé dans l'historique
- ✅ **Base de données** : Cohérence garantie entre tous les systèmes

## 📈 Évolutions Futures

- **Analytics** : Taux de conversion par type d'appel
- **AI** : Recommandations de statuts basées sur l'historique
- **Intégrations** : Synchronisation avec autres outils CRM
- **Workflows** : Actions automatiques selon les résultats
