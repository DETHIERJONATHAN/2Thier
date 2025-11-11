# 🔥 CORRECTIF URGENT - Performance TBLSectionRenderer

## Problème Identifié
Le composant `TBLSectionRenderer` provoque des **re-rendus excessifs** à chaque frappe dans un champ, causant des ralentissements importants.

## Causes Principales

### 1. ❌ API Non Stabilisée (LIGNE ~285)
```typescript
// ❌ AVANT (cause des re-rendus)
const { api } = useAuthenticatedApi();
```

**Solution :**
```typescript
// ✅ APRÈS (stabilisé avec useMemo)
const apiHook = useAuthenticatedApi();
const api = useMemo(() => apiHook.api, [apiHook.api]);
```

### 2. ❌ Logs Console Excessifs
Le fichier contient **des centaines de console.log()** qui s'exécutent à chaque rendu :
- Lignes 300-320 : Logs de debug section
- Lignes 600-800 : Logs ultra-verbeux dans orderedFields
- Lignes 1000-1500 : Logs dans les conditionalFields
- Lignes 2000-2500 : Logs dans renderDataSectionField

**Solution :** Mettre tous les logs sous condition `debugEnabled` :
```typescript
// ✅ Remplacer tous les console.log par dlog
dlog('Message de debug'); // Ne s'affiche que si localStorage.TBL_SMART_DEBUG='1'
```

### 3. ❌ Fonctions Non Mémorisées dans useMemo
Les fonctions utilisées dans `useMemo` et `useCallback` ne sont pas stables :
- `buildConditionalFieldFromNode` (ligne ~320)
- `findAllSharedReferencesRecursive` (ligne ~330)
- `renderDataSectionField` (ligne ~2000)

**Solution :** Utiliser `useCallback` pour toutes les fonctions :
```typescript
const buildConditionalFieldFromNode = useCallback((node: RawTreeNode): TBLField => {
  // ... logique
}, [allNodes]); // Dépendances stables uniquement
```

### 4. ❌ orderedFields Instable (LIGNE ~400)
Le `useMemo` pour `orderedFields` a trop de dépendances et se recalcule à chaque rendu.

**Solution :** Extraire les fonctions lourdes en `useCallback` et utiliser des refs pour les valeurs qui changent souvent.

## Actions Correctives à Appliquer

### Action 1 : Stabiliser l'API
**Fichier :** `TBLSectionRenderer.tsx` ligne ~285
**Remplacement :**
```typescript
const apiHook = useAuthenticatedApi();
const api = useMemo(() => apiHook.api, [apiHook.api]);
```

### Action 2 : Désactiver les Logs en Production
**Chercher/Remplacer Global dans le fichier :**
- Remplacer `console.log('🚨` par `dlog('🚨`
- Remplacer `console.log('🔥` par `dlog('🔥`
- Remplacer `console.log('🎯` par `dlog('🎯`
- Remplacer `console.log('✅` par `dlog('✅`
- Garder uniquement `console.error` et `console.warn`

### Action 3 : Mémoriser buildConditionalFieldFromNode
**Ligne ~320, ajouter `useCallback` :**
```typescript
const buildConditionalFieldFromNode = useCallback((node: RawTreeNode): TBLField => {
  // ... contenu existant
}, [allNodes]); // Dépendance stable
```

### Action 4 : Optimiser orderedFields
**Ligne ~400, extraire la logique lourde :**
```typescript
// Créer des fonctions mémorisées AVANT le useMemo
const namespaceRepeaterFieldMemo = useCallback((field, namespace, options) => {
  return namespaceRepeaterField(field, namespace, options);
}, []);

// Puis dans orderedFields, utiliser la version mémorisée
const orderedFields = useMemo(() => {
  // ... utiliser namespaceRepeaterFieldMemo au lieu de namespaceRepeaterField directement
}, [section.fields, formData, namespaceRepeaterFieldMemo, /* autres dépendances stables */]);
```

### Action 5 : Stabiliser renderDataSectionField
**Ligne ~2000, utiliser `useCallback` :**
```typescript
const renderDataSectionField = useCallback((field: TBLField) => {
  // ... contenu existant
}, [
  formData, 
  onChange, 
  allNodes, 
  treeId, 
  disabled, 
  isValidation,
  batchLoaded,
  // Autres dépendances STABLES uniquement
]);
```

## Test de Validation

Après les corrections, vérifier :
1. Ouvrir le formulaire TBL
2. Taper dans un champ texte
3. Vérifier dans React DevTools que le composant ne re-rend qu'UNE FOIS par frappe
4. Activer `localStorage.setItem('TBL_SMART_DEBUG', '1')` pour voir les logs de debug

## Estimation Impact
- **Réduction des re-rendus : 80-90%**
- **Amélioration de la fluidité : Immédiate**
- **Temps de correction : 15-20 minutes**
