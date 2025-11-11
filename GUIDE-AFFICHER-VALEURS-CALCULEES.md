# 🎯 Guide: Afficher les Valeurs Calculées Stockées

## Situation Actuelle
✅ Les valeurs calculées sont **stockées dans Prisma** (TreeBranchLeafNode.calculatedValue)  
✅ L'API endpoint `/tree-nodes/:nodeId/calculated-value` les récupère

**Maintenant**: Les afficher dans les champs d'affichage!

---

## Solution Simple: Component Réutilisable

### Option 1: Utiliser le Hook Existant
```typescript
import { useNodeCalculatedValue } from '../hooks/useNodeCalculatedValue';

const MonChamp = ({ nodeId }) => {
  const { value, loading, calculatedAt } = useNodeCalculatedValue(nodeId);

  if (loading) return <Spin />;
  if (!value) return null;

  return (
    <div className="calculated-field">
      <strong>{value}</strong>
      {calculatedAt && <small>({calculatedAt.toLocaleDateString('fr-FR')})</small>}
    </div>
  );
};
```

### Option 2: Inline dans les Templates
```typescript
// Dans TBLSectionRenderer ou un composant d'affichage
import { CalculatedValueDisplay } from './CalculatedValueDisplay';

// Pour chaque node avec calculatedValue
{node.calculatedValue && (
  <CalculatedValueDisplay 
    nodeId={node.id}
    value={node.calculatedValue}
    unit={node.unit}
    precision={node.precision || 2}
  />
)}
```

---

## Intégration dans TBLSectionRenderer

**Fichier**: `src/components/TreeBranchLeaf/treebranchleaf-new/TBL/TBLSectionRenderer.tsx`

### Ajouter après les imports:
```typescript
import { CalculatedValueDisplay } from './components/CalculatedValueDisplay';
```

### Dans la section "rendu des nodes":
```typescript
// Si le node a une valeur calculée stockée
if (node.calculatedValue && node.calculatedValue !== '∅') {
  return (
    <CalculatedValueDisplay
      nodeId={node.id}
      value={node.calculatedValue}
      label={node.label}
      unit={node.data_unit || ''}
      precision={node.data_precision || 2}
      displayMode="card"  // ou 'simple', 'badge'
      showMetadata={true}
      className="mb-4"
    />
  );
}

// Sinon: affichage normal du formulaire
return <NormalFieldRender node={node} />;
```

---

## Cas d'Usage Concrets

### Afficher Prix Kwh
```typescript
<CalculatedValueDisplay
  nodeId="99476bab-4835-4108-ad02-7f37e096647d"
  label="Prix Kwh"
  value={data.prixKwh}
  unit="€"
  precision={2}
  displayMode="badge"
/>
// Résultat: [Blue Badge: 2 €]
```

### Afficher M façade
```typescript
<CalculatedValueDisplay
  nodeId="939bb51d-c0af-444f-a794-2aa3062ef34c"
  label="Surface de façade"
  value={data.mFacade}
  unit="m²"
  precision={2}
  displayMode="card"
/>
// Résultat:
// ┌─────────────────────┐
// │ Surface de façade   │
// │      35 m²          │
// └─────────────────────┘
```

### Afficher dans une liste
```typescript
{calculatedValues.map(item => (
  <div key={item.nodeId} className="flex items-center justify-between p-2 border-b">
    <span>{item.label}</span>
    <CalculatedValueDisplay
      nodeId={item.nodeId}
      value={item.calculatedValue}
      unit={item.unit}
      displayMode="simple"
    />
  </div>
))}
```

---

## API Backend

### Endpoint pour récupérer UNE valeur
```bash
GET /api/tree-nodes/:nodeId/calculated-value

Response:
{
  "success": true,
  "value": "35",
  "calculatedAt": "2025-11-10T20:50:33.000Z",
  "calculatedBy": "preview-user-123"
}
```

### Endpoint pour récupérer PLUSIEURS valeurs
```bash
POST /api/tree-nodes/calculated-values

Body:
{
  "nodeIds": [
    "99476bab-4835-4108-ad02-7f37e096647d",
    "939bb51d-c0af-444f-a794-2aa3062ef34c",
    "440d696a-34cf-418f-8f56-d61015f66d91"
  ]
}

Response:
{
  "success": true,
  "values": {
    "99476bab-4835-4108-ad02-7f37e096647d": "2",
    "939bb51d-c0af-444f-a794-2aa3062ef34c": "35",
    "440d696a-34cf-418f-8f56-d61015f66d91": "86"
  }
}
```

---

## Avantages

✅ **Pas de recalcul** - Valeurs déjà dans Prisma  
✅ **Affichage rapide** - Récupération directe  
✅ **Traçabilité** - Sait quand/comment calculé  
✅ **Flexible** - Plusieurs modes d'affichage  
✅ **Pas de charge** - Pas de calcul au frontend  

---

## Checklist d'Implémentation

- [ ] Importer `CalculatedValueDisplay` dans ton composant
- [ ] Vérifier que le node a `calculatedValue` !== null
- [ ] Ajouter le composant dans le template d'affichage
- [ ] Tester avec `Prix Kwh`, `M façade`, etc.
- [ ] Ajuster les propriétés (unit, precision, displayMode)
- [ ] Commit!

---

## Questions?

Besoin d'ajuster l'affichage? Les props disponibles:
- `nodeId` ✅ - ID du nœud
- `value` - Valeur à afficher
- `label` - Étiquette
- `unit` - Unité (€, m², %, etc.)
- `precision` - Décimales (2, 3, etc.)
- `displayMode` - 'simple', 'card', 'badge'
- `showMetadata` - Afficher timestamp
- `className`, `style` - CSS personnalisé
