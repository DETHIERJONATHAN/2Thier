/**
 * 🎯 GUIDE D'INTÉGRATION RAPIDE TBL BRIDGE
 * 
 * Comment démarrer TBL Bridge avec le système TreeBranchLeaf existant
 * en 30 secondes chrono !
 */

# 🚀 Intégration TBL Bridge - Mode EXPRESS

## 1. Démarrage Ultra-Rapide (30 secondes)

### Option A: Auto-Injection Globale
```typescript
// Dans votre index.tsx ou App.tsx
import { autoInjectTBL } from './components/TreeBranchLeaf/tbl-bridge/integration';

// UNE SEULE LIGNE !
const cleanup = autoInjectTBL(); // C'est tout !

// TBL Bridge fonctionne maintenant en arrière-plan
// Tous vos nœuds TreeBranchLeaf auront automatiquement des codes TBL
```

### Option B: Démarrage Configurable
```typescript
import { startTBLIntegration } from './components/TreeBranchLeaf/tbl-bridge/integration';

const cleanup = startTBLIntegration({
  autoInject: true,      // ✅ Injection automatique
  debugMode: true,       // 🔍 Logs de debug
  enableAPI: true,       // 📡 Interception API
  enableEvents: true,    // 📢 Écoute événements
  syncOnMount: true      // 🔄 Sync au montage
});

// Appeler cleanup() pour arrêter si besoin
```

## 2. Utilisation dans les Composants

### Accès aux Codes TBL
```typescript
import { getTBLSyncService } from './components/TreeBranchLeaf/tbl-bridge/integration';

function MonComposant({ nodeId }: { nodeId: string }) {
  const syncService = getTBLSyncService();
  
  // Récupérer le code TBL du nœud
  const tblCode = syncService.getCode(nodeId);
  
  return (
    <div>
      <span>Nœud: {nodeId}</span>
      {tblCode && <span>Code TBL: {tblCode}</span>}
    </div>
  );
}
```

### Hook d'Intégration
```typescript
import { useTBLIntegration } from './components/TreeBranchLeaf/tbl-bridge/integration';

function MonComposantAvecHook() {
  const tbl = useTBLIntegration({
    enableAutoGeneration: true,
    debugMode: true
  });
  
  const handleCreateNode = async (nodeData) => {
    // Création TreeBranchLeaf normale
    const newNode = await createTreeBranchLeafNode(nodeData);
    
    // Interception TBL automatique
    await tbl.interceptNodeCreate(newNode);
    
    // Le code TBL est maintenant disponible
    const tblCode = tbl.getTBLCode(newNode.id);
    console.log(`Code TBL généré: ${tblCode}`);
  };
  
  return <TreeBranchLeafEditor onCreate={handleCreateNode} />;
}
```

## 3. Émettre des Événements Manuellement

```typescript
import { TBLEventEmitter } from './components/TreeBranchLeaf/tbl-bridge/integration';

// Après création d'un nœud TreeBranchLeaf
TBLEventEmitter.nodeCreated(newNode);

// Après mise à jour
TBLEventEmitter.nodeUpdated(updatedNode);

// Après suppression
TBLEventEmitter.nodeDeleted(nodeId);
```

## 4. Debug et Monitoring

### Console de Debug
```typescript
// Ouvrir la console et taper:
const syncService = getTBLSyncService();
const stats = syncService.getStats();

console.log(`Éléments TBL: ${stats.totalElements}`);
console.log(`Succès: ${stats.successfulSyncs}`);
console.log(`Temps moyen: ${stats.averageProcessingTime}ms`);

// Voir tous les éléments TBL
console.table(syncService.getAllElements());
```

### Sync Manuelle d'Urgence
```typescript
import { QuickTBLSetup } from './components/TreeBranchLeaf/tbl-bridge/integration';

// Si quelque chose ne va pas, sync d'urgence:
await QuickTBLSetup.emergencySync();
```

## 5. Mode Développement

### Activation du Debug Visuel
```typescript
// Ajouter dans votre App.tsx
import { TBLDebugPanel } from './components/TreeBranchLeaf/tbl-bridge/integration';

function App() {
  return (
    <div>
      {/* Vos composants existants */}
      
      {process.env.NODE_ENV === 'development' && <TBLDebugPanel />}
    </div>
  );
}
```

### Commandes Console Pratiques
```javascript
// Dans la console du navigateur:

// Démarrage express
window.QuickTBLSetup?.quickStart();

// Stats en temps réel
setInterval(() => {
  const stats = window.getTBLSyncService?.()?.getStats();
  console.log('TBL Stats:', stats);
}, 5000);

// Export des données TBL
const data = window.getTBLSyncService?.()?.export();
console.log('Export TBL:', data);
```

## 6. Troubleshooting Express

### Problème: Aucun code TBL généré
```typescript
// Vérifier l'injection
const injector = getTBLAutoInjector();
console.log('Injection active:', injector.isActive());

// Forcer la sync
await QuickTBLSetup.emergencySync();
```

### Problème: Codes TBL en doublon
```typescript
import { TBLValidator } from './components/TreeBranchLeaf/tbl-bridge/integration';

const elements = getTBLSyncService().getAllElements();
const duplicates = TBLValidator.findDuplicateCodes(elements);
console.log('Doublons:', duplicates);
```

### Problème: Performance lente
```typescript
// Désactiver le debug en production
startTBLIntegration({
  debugMode: false,
  autoInject: true
});
```

## 7. Configuration Avancée

### Personnalisation Complète
```typescript
startTBLIntegration({
  autoInject: true,
  debugMode: process.env.NODE_ENV === 'development',
  enableAPI: true,
  enableEvents: true,
  syncOnMount: true
});

// Configurer le service de sync
const syncService = getTBLSyncService();
syncService.subscribe((event) => {
  console.log('Événement TBL:', event);
});
```

---

## ✅ CHECKLIST DE DÉMARRAGE

- [ ] Ajouter `autoInjectTBL()` dans index.tsx
- [ ] Vérifier les logs dans la console
- [ ] Créer un nœud TreeBranchLeaf test
- [ ] Vérifier que le code TBL est généré
- [ ] Activer TBLDebugPanel en dev
- [ ] Tester la sync manuelle si nécessaire

**C'est tout ! TBL Bridge fonctionne maintenant avec votre système TreeBranchLeaf existant.**

---

*💡 Tip: Tapez `QuickTBLSetup.quickStart()` dans la console pour un démarrage express à tout moment !*