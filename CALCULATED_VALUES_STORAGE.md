# 🎯 Système de Valeurs Calculées Stockées

## Architecture Complète

```
┌─────────────────────────────────────────────────────────────┐
│ 1️⃣ FORMULAIRE FRONTEND - User remplit et soumet             │
└─────────────────────┬───────────────────────────────────────┘
                      │ POST /api/form-submit
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 2️⃣ BACKEND CALCULE                                          │
│   ├─ Formules (formula_instances)                           │
│   ├─ Tables (table_instances)                               │
│   ├─ Conditions (condition_instances)                       │
│   └─ Génère Map: { nodeId -> calculatedValue }              │
└─────────────────────┬───────────────────────────────────────┘
                      │ Appel storeCalculatedValues()
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 3️⃣ SERVICE BACKEND - Stocke dans Prisma                    │
│   ├─ TreeBranchLeafNode.calculatedValue = valeur            │
│   ├─ TreeBranchLeafNode.calculatedAt = timestamp            │
│   └─ TreeBranchLeafNode.calculatedBy = source (formula-abc) │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓ PRISMA UPDATE
                      │
                    ┌─┴──────────────────────┐
                    │  Base de Données       │
                    │ PostgreSQL             │
                    └───────────────────────┘
                      ↑
                      │ GET /api/tree-nodes/:treeId/:nodeId/calculated-value
                      │
┌─────────────────────┴───────────────────────────────────────┐
│ 4️⃣ FRONTEND AFFICHE                                        │
│   ├─ Hook: useNodeCalculatedValue(nodeId, treeId)          │
│   ├─ Composant: <CalculatedValueDisplay />                 │
│   └─ Récupère + affiche la valeur                          │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Fichiers Créés / Modifiés

### 1. **Schema Prisma** (✅ Modifié)
```
prisma/schema.prisma
```
**Colonnes ajoutées à `TreeBranchLeafNode`:**
- `calculatedValue: String?` - Valeur calculée
- `calculatedAt: DateTime?` - Timestamp du calcul
- `calculatedBy: String?` - Source: "formula-abc", "table-def", etc.

### 2. **Backend Service** (✅ Créé)
```
src/services/calculatedValuesService.ts
```
**Fonctions:**
- `storeCalculatedValues()` - Stocke plusieurs valeurs (batch)
- `storeCalculatedValue()` - Stocke une seule valeur
- `getCalculatedValue()` - Récupère une valeur
- `getCalculatedValues()` - Récupère plusieurs valeurs
- `clearCalculatedValues()` - Réinitialise les valeurs

**Utilisation:**
```typescript
import { storeCalculatedValues } from '@/services/calculatedValuesService';

const results = await storeCalculatedValues([
  { nodeId: 'node-1', calculatedValue: 42, calculatedBy: 'formula-abc' },
  { nodeId: 'node-2', calculatedValue: 'Oui', calculatedBy: 'condition-def' }
]);
```

### 3. **Backend Controller** (✅ Créé)
```
src/controllers/calculatedValueController.ts
```
**Endpoints:**
- `GET /api/tree-nodes/:treeId/:nodeId/calculated-value` - Récupère la valeur
- `POST /api/tree-nodes/:nodeId/store-calculated-value` - Stocke une valeur
- `POST /api/tree-nodes/store-batch-calculated-values` - Stocke en batch

### 4. **Frontend Hook** (✅ Créé)
```
src/hooks/useNodeCalculatedValue.ts
```
**Utilisation:**
```typescript
const { value, loading, error, calculatedAt, calculatedBy } = 
  useNodeCalculatedValue(nodeId, treeId, submissionId);
```

### 5. **Frontend Composant** (✅ Créé)
```
src/components/TreeBranchLeaf/treebranchleaf-new/TBL/components/CalculatedValueDisplay.tsx
```
**Props:**
- `nodeId` - ID du nœud
- `treeId` - ID de l'arbre
- `submissionId` - (Optionnel) ID de soumission
- `precision` - Décimales pour nombres
- `unit` - Unité à afficher (ex: "m²", "€")
- `displayMode` - "simple" | "card" | "badge"
- `showMetadata` - Afficher quand/comment calculé

**Utilisation:**
```tsx
<CalculatedValueDisplay
  nodeId="node-abc"
  treeId="tree-123"
  unit="€"
  precision={2}
  displayMode="simple"
/>
```

### 6. **API Server Config** (✅ Modifié)
```
src/api-server-clean.ts
```
- Ajout import: `calculatedValueController`
- Montage route: `app.use('/api/tree-nodes', calculatedValueController)`

## 🚀 Workflow Complet

### A) Backend: Après Calcul (exemple dans un endpoint de soumission)

```typescript
import { storeCalculatedValues } from '@/services/calculatedValuesService';

// Dans votre endpoint POST /api/form-submit
async function handleFormSubmit(req, res) {
  const { formData, treeId } = req.body;

  // 1️⃣ Calculer les valeurs (vos formules, tables, conditions)
  const calculatedValues = [
    { nodeId: 'node-formula-1', calculatedValue: 42.5, calculatedBy: 'formula-abc' },
    { nodeId: 'node-table-1', calculatedValue: 'Résultat Table', calculatedBy: 'table-def' },
    // ...
  ];

  // 2️⃣ Stocker dans Prisma
  const result = await storeCalculatedValues(calculatedValues, submissionId);

  if (result.success) {
    res.json({ success: true, stored: result.stored });
  } else {
    res.status(500).json({ error: 'Erreur stockage valeurs' });
  }
}
```

### B) Frontend: Affichage Simple

```tsx
import { CalculatedValueDisplay } from '@/components/TreeBranchLeaf/treebranchleaf-new/TBL/components/CalculatedValueDisplay';

function MyComponent() {
  return (
    <div>
      <h3>Résultat Calcul</h3>
      <CalculatedValueDisplay
        nodeId="node-formula-1"
        treeId="tree-123"
        precision={2}
        unit="€"
      />
    </div>
  );
}
```

### C) Frontend: Avec Hook Personnalisé

```tsx
import { useNodeCalculatedValue } from '@/hooks/useNodeCalculatedValue';

function MyComponent() {
  const { value, loading, error, calculatedBy } = 
    useNodeCalculatedValue('node-abc', 'tree-123');

  if (loading) return <Spin />;
  if (error) return <Alert type="error" message={error} />;

  return (
    <div>
      <p>Valeur: {value}</p>
      <small>Calculé par: {calculatedBy}</small>
    </div>
  );
}
```

## 🔍 Flow Données

### Soumission:
```
User Data → Backend Calcul → storeCalculatedValues()
                                    ↓
                            Prisma UPDATE TreeBranchLeafNode
                                    ↓
                            calculatedValue = "42"
                            calculatedAt = 2025-11-10T20:30:00Z
                            calculatedBy = "formula-abc"
```

### Affichage:
```
useNodeCalculatedValue() → GET /api/tree-nodes/:treeId/:nodeId/calculated-value
                                    ↓
                        Prisma SELECT calculatedValue
                                    ↓
                        Retour au frontend
                                    ↓
                        <CalculatedValueDisplay /> affiche "42 €"
```

## 📊 Avantages

✅ **Pas de recalcul** - Les valeurs sont pré-calculées au backend
✅ **Traçabilité** - On sait quelle formule/table a calculé quoi
✅ **Persistance** - Les données restent dans Prisma
✅ **Performance** - Pas de requête API compliquée, juste un SELECT
✅ **Scalabilité** - Peut supporter des milliers de calculs stockés
✅ **Cache naturel** - Les valeurs restent tant qu'on les met à jour pas

## ⚙️ Configuration

### Variables d'environnement (optionnel)
```env
# Optionnel - defaults déjà configurés
CALCULATED_VALUES_BATCH_SIZE=100
CALCULATED_VALUES_CACHE_TTL=3600
```

## 🧪 Test avec cURL

```bash
# 1. Stocker une valeur
curl -X POST http://localhost:4000/api/tree-nodes/node-123/store-calculated-value \
  -H "Content-Type: application/json" \
  -d '{
    "calculatedValue": 42,
    "calculatedBy": "formula-test"
  }'

# 2. Récupérer la valeur
curl http://localhost:4000/api/tree-nodes/tree-abc/node-123/calculated-value
```

## 🐛 Troubleshooting

### Le composant affiche "---"
→ Vérifier que `calculatedValue` est stocké dans Prisma pour ce nodeId

### Erreur 404 sur GET /calculated-value
→ Vérifier que `treeId` et `nodeId` sont corrects

### Hook reste en `loading: true`
→ Vérifier les logs console et la réponse API

### Valeur pas mise à jour
→ Vérifier que `storeCalculatedValues()` est appelée après le calcul

## 📝 Prochaines Étapes

1. **Intégrer dans votre endpoint de soumission** (appeler `storeCalculatedValues()`)
2. **Tester l'affichage** avec `<CalculatedValueDisplay />`
3. **Ajouter un cache local** si besoin
4. **Créer des traces/logs** pour auditer les calculs
