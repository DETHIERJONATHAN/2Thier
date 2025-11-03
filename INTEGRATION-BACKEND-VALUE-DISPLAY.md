# 🎯 Exemple d'intégration : BackendValueDisplay pour "M² de la toiture"

## Contexte

Tu as un formulaire TBL avec des champs d'entrée et des champs calculés.

**Champs d'entrée** :
- Longueur façade (shared-ref-1760973936636-6fi9wj) : 7
- Rampant (shared-ref-1760973950184-ppr6ne) : 8

**Champ calculé** :
- M² de la toiture (bda4aa6c-033e-46f8-ad39-5ea4e2a1cb77) : Longueur × Rampant = 56

## Intégration dans TBLSectionRenderer.tsx

### Étape 1 : Import du nouveau composant

```typescript
import { BackendValueDisplay } from './BackendValueDisplay';
```

### Étape 2 : Identifier où afficher le champ

Dans `TBLSectionRenderer.tsx`, cherche où les champs calculés sont rendus.
Généralement, c'est dans une condition comme :

```typescript
if (field.type === 'calculated' || field.sourceRef) {
  // Ancien code avec CalculatedFieldDisplay
}
```

### Étape 3 : Remplacer par le nouveau composant

**AVANT** :
```typescript
{field.type === 'calculated' && (
  <CalculatedFieldDisplay
    nodeId={field.nodeId}
    treeId={treeId}
    formData={formData}
  />
)}
```

**APRÈS** :
```typescript
{field.type === 'calculated' && (
  <BackendValueDisplay
    nodeId={field.nodeId}
    treeId={treeId}
    formData={formData}
    precision={field.precision ?? 2}
    unit={field.unit}
    placeholder="---"
  />
)}
```

## Intégration dans TBLFieldRendererAdvanced.tsx

Si les champs calculés sont gérés dans `TBLFieldRendererAdvanced.tsx` :

```typescript
import { BackendValueDisplay } from './BackendValueDisplay';

// Dans le rendu du champ
{fieldType === 'VARIABLE' && config.sourceRef && (
  <BackendValueDisplay
    nodeId={config.nodeId}
    treeId={treeId}
    formData={formData}
    precision={config.displayConfig?.precision ?? 2}
    unit={config.displayConfig?.unit}
  />
)}
```

## Test manuel

### 1. Ouvre le formulaire avec "M² de la toiture"

### 2. Change les valeurs
- Longueur façade : 7 → 10
- Rampant : 8 → 5

### 3. Observe le résultat
- Backend calcule : 10 × 5 = 50
- Frontend affiche : **50.00 m²**

### 4. Vérifie la console
Tu devrais voir :
```
✅ [useBackendValue] NodeId: bda4aa6c-033e-46f8-ad39-5ea4e2a1cb77, Valeur du backend: 50
```

### 5. Vérifie les logs backend
```
[FORMULE] Expression construite: 10*5
[CALCUL] ✅ Résultat: 50
```

## Créer un composant de test standalone

Si tu veux tester isolément avant d'intégrer dans TBL :

```typescript
// test-m2-toiture.tsx
import React from 'react';
import { BackendValueDisplay } from './src/components/TreeBranchLeaf/treebranchleaf-new/TBL/components/BackendValueDisplay';

export const TestM2Toiture = () => {
  const formData = {
    'shared-ref-1760973936636-6fi9wj': 7,  // Longueur façade
    'shared-ref-1760973950184-ppr6ne': 8,  // Rampant
  };

  return (
    <div>
      <h1>Test M² de la toiture</h1>
      <p>Longueur façade: 7</p>
      <p>Rampant: 8</p>
      <p>
        <strong>Résultat : </strong>
        <BackendValueDisplay
          nodeId="bda4aa6c-033e-46f8-ad39-5ea4e2a1cb77"
          treeId="VOTRE_TREE_ID"
          formData={formData}
          precision={2}
          unit="m²"
        />
      </p>
      <p>✅ Devrait afficher : <strong>56.00 m²</strong></p>
    </div>
  );
};
```

## Généralisation

Une fois que ça marche pour "M² de la toiture", applique la même logique pour :

### Tous les champs avec formules
```typescript
<BackendValueDisplay
  nodeId={field.nodeId}
  treeId={treeId}
  formData={formData}
  precision={field.precision}
  unit={field.unit}
/>
```

### Tous les champs avec tables
```typescript
<BackendValueDisplay
  nodeId={field.nodeId}
  treeId={treeId}
  formData={formData}
/>
```

### Tous les champs avec conditions
```typescript
<BackendValueDisplay
  nodeId={field.nodeId}
  treeId={treeId}
  formData={formData}
  precision={field.precision}
/>
```

## Prochaines étapes

1. ✅ **Créé** : Hook `useBackendValue`
2. ✅ **Créé** : Composant `BackendValueDisplay`
3. ⏳ **À faire** : Trouver où "M² de la toiture" est affiché dans TBL
4. ⏳ **À faire** : Remplacer par `<BackendValueDisplay />`
5. ⏳ **À faire** : Tester avec différentes valeurs
6. ⏳ **À faire** : Généraliser à tous les autres champs calculés

## Résumé

Le nouveau système est prêt ! Il suffit de :
1. Importer `BackendValueDisplay`
2. Remplacer les anciens composants de champs calculés
3. Profiter d'un système simple qui va juste chercher la réponse dans le backend ! 🎉
