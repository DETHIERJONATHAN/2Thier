# 🧪 Test du Feature displayAlways

## Démarrage rapide

### Option 1: Test Automatique (Console Browser)

1. **Démarrer l'app** (si pas déjà lancée):
   ```bash
   npm run dev
   ```

2. **Naviguer à la page**:
   - Aller sur http://localhost:5173
   - Ouvrir un TreeBranchLeaf form
   - Sélectionner une **section** dans l'arbre
   - Ouvrir le panneau **Parameters** (à droite)

3. **Ouvrir la console** (F12 → Console)

4. **Copier ce script et l'exécuter**:
   ```javascript
   // Test rapide (recommandé)
   // Copier le contenu de test-display-always-quick.js
   // Le coller dans la console et exécuter
   ```

   Ou si vous avez plus de temps:
   ```javascript
   // Test complet avec sous-onglets
   // Copier le contenu de test-display-always.js
   ```

### Option 2: Test Manuel

1. **Ouvrir un TreeBranchLeaf form**
2. **Sélectionner une section** (type='section') 
3. **Ouvrir Parameters** (panneau de droite)
4. **Chercher le checkbox "Toujours visible dans les sous-onglets"**
5. **Toggler le checkbox**
6. **Vérifier dans la console** (F12) que vous voyez:
   ```
   ✅ [Parameters] displayAlways toggled: true
   🔄 [Parameters] Calling onNodeUpdateRef for displayAlways update
   🔔 [Parameters] Emission tbl-node-updated IMMEDIATELY (optimistic)
   ✅ [Parameters] displayAlways update emitted and queued
   ```
7. **Cliquer sur chaque sous-onglet** - la section devrait être **VISIBLE PARTOUT** ✅

## Résultats Attendus

### ✅ Si ça fonctionne:
- [ ] Console affiche: `Emission tbl-node-updated IMMEDIATELY`
- [ ] La section apparaît dans **tous les sous-onglets** (pas seulement celui actif)
- [ ] Le changement persiste après refresh F5
- [ ] Pas d'erreurs dans la console

### ❌ Si ça ne fonctionne pas:
- [ ] La section n'apparaît que dans l'onglet actif
- [ ] Console affiche: `Failed to update displayAlways`
- [ ] Le serveur retourne une erreur dans Network tab (F12)

## Debugging

### 1. Vérifier les logs console
```javascript
// Activer le verbose logging
localStorage.DEBUG_VERBOSE = "1"
// Puis recharger F5
```

### 2. Vérifier les appels réseau
- F12 → Network
- Toggler displayAlways
- Chercher: `PUT /api/treebranchleaf/.../nodes/...`
- Vérifier que le response contient `displayAlways: true`

### 3. Vérifier les événements
```javascript
// Dans la console, écouter les événements
window.addEventListener('tbl-node-updated', (e) => {
  console.log('🔔 Event captured:', e.detail);
});
```

## Fichiers de test

- `test-display-always-quick.js` - Test rapide et simple (5 sec)
- `test-display-always.js` - Test complet avec tous les sous-onglets (10 sec)

## Architecture du fix

Le fix fonctionne en 3 étapes:

1. **User toggle** → Checkbox déclenche l'événement `change`
2. **Optimistic emit** → `tbl-node-updated` envoyé IMMÉDIATEMENT avec les nouvelles métadonnées
3. **Hook retransform** → `useTBLDataPrismaComplete` reçoit l'événement et retransforme les sections
4. **Server sync** → `onNodeUpdateRef.current()` sauvegarde au serveur en arrière-plan

## Points clés

- ⚡ L'UI se met à jour **immédiatement** (pas d'attente serveur)
- 🔄 Les sections avec `displayAlways: true` s'affichent dans **tous les sous-onglets**
- 💾 Les changements se persistent au serveur asynchrone
- 🎯 Pas de race condition (événement émis avant même que le serveur réponde)

## Questions?

Si le test échoue:
1. Vérifier que vous êtes sur une **section** (pas un branch ou field)
2. Vérifier que `useTBLDataPrismaComplete` est le hook actif (pas `useTBLData-hierarchical-fixed`)
3. Vérifier les logs du serveur (terminal avec `npm run dev`)
