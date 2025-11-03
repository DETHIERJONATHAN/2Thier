# 🎯 Système Complet de Copie des Capacités (Formules, Conditions, Tables)

## 📊 Résumé Global

Quand tu **copies une variable** avec `copyVariableWithCapacities()`, le système copie **AUTOMATIQUEMENT** :
1. ✅ **La variable elle-même** (TreeBranchLeafNodeVariable)
2. ✅ **Ses capacités associées** :
   - **Formule** (TreeBranchLeafNodeFormula) si `sourceType = 'formula'`
   - **Condition** (TreeBranchLeafNodeCondition) si `sourceType = 'condition'`
   - **Table** (TreeBranchLeafNodeTable) si `sourceType = 'table'`
3. ✅ **Toutes les sous-entités** (colonnes, lignes, cellules pour tables)
4. ✅ **Les liaisons bidirectionnelles** (`linkedXxxIds`)

---

## 🔧 Comment ça Marche pour CHAQUE Capacité

### 1️⃣ **FORMULES** (`copy-capacity-formula.ts`)

#### Processus :
```
Formule Original: { id: "f123", tokens: ["@value.node-a", "+", "@value.node-b"] }
                       ↓ (copie avec suffixe)
Formule Copiée:   { id: "f123-1", tokens: ["@value.node-a-1", "+", "@value.node-b-1"] }
```

#### Réécriture des Tokens :
```typescript
// Format: Array de strings + objets
["@value.abc", "+", "@value.def"]
         ↓
["@value.abc-1", "+", "@value.def-1"]
```

**Règles :**
- `@value.<nodeId>` → `@value.<newNodeId>` (via `nodeIdMap`)
- Si ID non trouvé dans la map + suffixe fourni → applique suffixe
- Gère aussi les node_xxx et UUIDs

**Liaisons bidirectionnelles :**
- ✅ `linkedFormulaIds` du nœud propriétaire
- ✅ `linkedFormulaIds` de chaque nœud **référencé** dans les tokens

---

### 2️⃣ **CONDITIONS** (`copy-capacity-condition.ts`)

#### Processus :
```
Condition Original: { 
  id: "c456",
  conditionSet: {
    branches: [
      {
        when: { left: { ref: "@value.node-a" }, right: { ref: "@value.node-b" } },
        actions: [{ type: "show", nodeIds: ["node-formula:f789"] }]
      }
    ]
  }
}
                ↓ (copie + réécriture)
Condition Copiée: {
  id: "c456-1",
  conditionSet: {
    branches: [
      {
        when: { left: { ref: "@value.node-a-1" }, right: { ref: "@value.node-b-1" } },
        actions: [{ type: "show", nodeIds: ["node-formula:f789-1"] }]
      }
    ]
  }
}
```

#### Réécriture du ConditionSet :
**3 passes de remplacement :**

1. **@value.<nodeId>** (via regex `@value\.([A-Za-z0-9_:-]+)`)
   - `@value.abc` → `@value.abc-1`
   - Gère UUIDs et node_xxx

2. **node-formula:<formulaId>** (via regex `node-formula:([A-Za-z0-9_-]+)`)
   - `node-formula:xyz` → `node-formula:xyz-1`

3. **node-condition:<conditionId>** et **condition:** (fallback suffixe)
   - Rares mais gérées

**Liaisons bidirectionnelles :**
- ✅ `linkedConditionIds` du nœud propriétaire
- ✅ `linkedConditionIds` de chaque nœud **référencé** dans le conditionSet
  - Exemple : si condition a `when.left.ref = "@value.node-a-1"`, on ajoute la condition à `node-a-1.linkedConditionIds`

---

### 3️⃣ **TABLES** (`copy-capacity-table.ts`)

#### Processus Hiérarchique :
```
TABLE
  ├── COLUMNS (copie id: col-1-1, col-2-1, ...)
  ├── ROWS    (copie id: row-1-1, row-2-1, ...)
  └── CELLS   (copie avec mappage colonne+ligne)

Toutes les metadata/config sont réécrits avec les nouveaux IDs
```

#### Étapes Détaillées :

1. **Copier la table principale**
   - `id: table-abc-1`
   - `name: table-abc-1` (avec suffixe dans label)
   - `metadata` réécrit (voir ci-dessous)

2. **Copier toutes les colonnes**
   ```
   Original: { id: "col-1", name: "Prix", config: {...} }
   Copié:    { id: "col-1-1", name: "Prix", config: {...remappé...} }
   ```
   - `config` réécrit (UUIDs, node_xxx, @value.*, node-formula:*)
   - `metadata` réécrit

3. **Copier toutes les lignes**
   ```
   Original: { id: "row-1", rowIndex: 0, metadata: {...} }
   Copié:    { id: "row-1-1", rowIndex: 0, metadata: {...remappé...} }
   ```
   - `metadata` réécrit

4. **Copier toutes les cellules + mapper colonne/ligne**
   ```
   Original: { columnId: "col-1", rowId: "row-1", value: "100" }
   Copié:    { columnId: "col-1-1", rowId: "row-1-1", value: "100" }
   ```
   - `metadata` réécrit

#### Réécriture dans Tables (4 passes) :

1. `@value.<nodeId>` → `@value.<newNodeId>`
2. `node-formula:<formulaId>` → `node-formula:<newFormulaId>`
3. UUIDs remappés
4. `node_xxx` remappés

---

## 🔗 Mises à Jour Bidirectionnelles (Clé du Succès!)

### Exemple Complet :

**Avant copie :**
```
Node-A: linkedFormulaIds = []
  ↑ Référencé par Formula-F1
  
Formula-F1: tokens = ["@value.node-a"]
```

**Après copie (suffix=1) :**
```
Node-A-1: linkedFormulaIds = ["f1-1"]  ← ✅ AJOUTÉ
  ↑ Référencé par Formula-F1-1
  
Formula-F1-1: tokens = ["@value.node-a-1"]
```

### Comment c'est fait :

```typescript
// ÉTAPE 1: Créer la formule
newFormula = create({ id: "f1-1", tokens: ["@value.node-a-1"], ... })

// ÉTAPE 2: Mettre à jour linkedFormulaIds du nœud propriétaire
addToNodeLinkedField(proprietaireNodeId, 'linkedFormulaIds', ["f1-1"])

// ÉTAPE 3: Extraire les nœuds référencés dans la formule
const refNodes = extractNodeIdsFromTokens(newTokens) // → ["node-a-1"]

// ÉTAPE 4: Mettre à jour CHAQUE nœud référencé (bidirectionnel)
for (const refNodeId of refNodes) {
  addToNodeLinkedField(refNodeId, 'linkedFormulaIds', ["f1-1"])
}
```

---

## ⚠️ Pièges Critiques Évités

### 1. **Variable `newSourceRef` doit être `let`, pas `const`**
```typescript
// ❌ NE PAS FAIRE
const newSourceRef = originalVar.sourceRef;
newSourceRef = `node-formula:${newId}`; // CRASH!

// ✅ BON
let newSourceRef = originalVar.sourceRef;
newSourceRef = `node-formula:${newId}`; // OK
```

### 2. **Collisions d'ID avec suffixes multiples**
```
Cas: Plusieurs templates copient le même nœud
  Template 1 → suffix=1 → node-a-1
  Template 2 → suffix=1 → node-a-1  ← COLLISION!
  
Solution: Ajouter discriminant basé sur le nœud d'affichage
  node-a-1-abc123  (abc123 = tail de displayNodeId)
```

### 3. **Réutilisation d'une variable existante pour le même nœud**
```typescript
// Si nodeId a déjà une variable
const existingVar = findUnique({ nodeId: finalNodeId })
// Réutiliser plutôt que créer doublons
```

---

## 🧪 Test Complet

**Cas d'usage :**
```typescript
// Copier une variable avec ses 3 capacités
const result = await copyVariableWithCapacities(
  'var-123',  // Variable avec sourceRef = "node-formula:f456"
  1,          // Suffix
  'node-display-1',
  prisma,
  {
    formulaIdMap: new Map([['f456', 'f456-1']]),
    conditionIdMap: new Map(),
    tableIdMap: new Map(),
    nodeIdMap: new Map([['node-a', 'node-a-1']]),
    autoCreateDisplayNode: true
  }
);

// Résultat attendu :
// ✅ Variable créée: var-123-1
// ✅ Formule copiée: f456-1 avec tokens remappés
// ✅ Display node créé: node-display-1-1
// ✅ Liaisons bidirectionnelles établies
```

---

## 📌 Résumé des Fichiers

| Fichier | Responsabilité |
|---------|-----------------|
| `copy-capacity-formula.ts` | Copie formules + réécriture tokens + liaisons |
| `copy-capacity-condition.ts` | Copie conditions + réécriture conditionSet + liaisons |
| `copy-capacity-table.ts` | Copie tables + colonnes/lignes/cellules + réécritures |
| `copy-variable-with-capacities.ts` | Orchestration : copie variable + choisit quelle capacité copier |
| `treebranchleaf-routes.ts` | Deep copy : copie nœuds + leurs capacités |

---

## ✅ Checklist Copie Correcte

- [ ] **Formule** : Tous les `@value.*` remappés ✅
- [ ] **Condition** : `@value.*` + `node-formula:*` remappés ✅
- [ ] **Table** : Toutes les métadatas/configs remap pées ✅
- [ ] **Liaisons** : `linkedFormulaIds` du nœud propriétaire ✅
- [ ] **Liaisons** : `linkedXxxIds` des nœuds référencés ✅
- [ ] **Cache** : Évite doublons sur re-exécutions ✅
- [ ] **Display nodes** : Créés si `autoCreateDisplayNode=true` ✅

