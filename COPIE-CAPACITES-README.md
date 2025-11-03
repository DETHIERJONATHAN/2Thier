# 🎯 Système de Copie des Capacités (Formules, Conditions, Tables)

## 📁 Architecture

```
treebranchleaf-new/api/
├── copy-variable-with-capacities.ts  ← Orchestrateur principal
├── copy-capacity-formula.ts          ← Module formules (SIMPLE)
├── copy-capacity-condition.ts        ← Module conditions (MOYEN)
└── copy-capacity-table.ts            ← Module tables (COMPLEXE)
```

## 🔄 Flux de Copie Automatique

### 1️⃣ Déclenchement (Repeater)
Lorsqu'un utilisateur clique sur le bouton "+" d'un repeater :

```typescript
// Dans treebranchleaf-routes.ts
POST /nodes/:nodeId/duplicate-templates
```

### 2️⃣ Copie des Nœuds (Deep Copy)
La fonction `deepCopyNodeInternal` copie tout l'arbre :
- Nœuds parents + enfants
- Variables liées (`linkedVariableIds`)

### 3️⃣ Copie des Variables
Pour chaque variable copiée, `copyVariableWithCapacities` :
1. Parse le `sourceRef` (ex: `"node-formula:abc-123"`)
2. Détecte le type de capacité (`formula`, `condition`, `table`, `field`)
3. **Copie automatiquement la capacité** avec les modules dédiés

### 4️⃣ Copie des Capacités (NOUVEAU ⭐)

#### 🧮 Formule (`copy-capacity-formula.ts`)
```typescript
copyFormulaCapacity(originalFormulaId, newNodeId, suffix, prisma, options)
```
- Copie `TreeBranchLeafNodeFormula`
- Réécrire `tokens` : `@value.ID` → `@value.ID-suffix`
- Met à jour `linkedFormulaIds`
- Synchronise les paramètres (`hasFormula`, `formula_activeId`, etc.)

#### 🔀 Condition (`copy-capacity-condition.ts`)
```typescript
copyConditionCapacity(originalConditionId, newNodeId, suffix, prisma, options)
```
- Copie `TreeBranchLeafNodeCondition`
- Réécrire `conditionSet` :
  - `@value.ID` → `@value.ID-suffix`
  - `node-formula:ID` → `node-formula:ID-suffix`
- Met à jour `linkedConditionIds`
- Synchronise les paramètres (`hasCondition`, `condition_activeId`, etc.)

#### 📊 Table (`copy-capacity-table.ts`)
```typescript
copyTableCapacity(originalTableId, newNodeId, suffix, prisma, options)
```
- Copie `TreeBranchLeafNodeTable`
- Copie **toutes** les colonnes (`TreeBranchLeafNodeTableColumn`)
- Copie **toutes** les lignes (`TreeBranchLeafNodeTableRow`)
- Copie **toutes** les cellules (`TreeBranchLeafNodeTableCell`)
- Réécrire les configs JSON avec les nouveaux IDs
- Met à jour `linkedTableIds`
- Synchronise les paramètres (`hasTable`, `table_activeId`, etc.)

## 🎯 Exemple Concret

### Situation Initiale
```
📦 Repeater "Panneaux Solaires"
  └── 📄 Template "Panneau 1"
       ├── 🧮 Formule: calcul_puissance (ID: formula-abc)
       │   └── tokens: ["@value.longueur", "*", "@value.largeur"]
       ├── 🔀 Condition: si_orienté_sud (ID: condition-def)
       │   └── conditionSet: { si @value.orientation = "Sud" alors @value.bonus }
       └── 📊 Table: rendements (ID: table-ghi)
           └── 3 colonnes × 5 lignes = 15 cellules
```

### Utilisateur Clique sur "+" (1ère Copie)
```
POST /nodes/repeater-123/duplicate-templates
Body: { templateNodeIds: ["template-panneau1"] }
```

### Résultat Automatique
```
📦 Repeater "Panneaux Solaires"
  ├── 📄 Template "Panneau 1" (original)
  └── 📄 "Panneau 1 (Copie 1)" (NOUVEAU)
       ├── 🧮 Formule: calcul_puissance-1 (ID: formula-abc-1) ← COPIÉE
       │   └── tokens: ["@value.longueur-1", "*", "@value.largeur-1"] ← RÉÉCRITS
       ├── 🔀 Condition: si_orienté_sud-1 (ID: condition-def-1) ← COPIÉE
       │   └── conditionSet: { si @value.orientation-1 = "Sud" alors @value.bonus-1 } ← RÉÉCRIT
       └── 📊 Table: rendements-1 (ID: table-ghi-1) ← COPIÉE
           └── 3 colonnes × 5 lignes = 15 cellules (TOUTES COPIÉES)
```

## 🔗 Synchronisation Bidirectionnelle

Pour chaque capacité copiée, les champs `linked...` sont mis à jour :

### Nœud Propriétaire
```typescript
TreeBranchLeafNode {
  linkedFormulaIds: ["formula-abc-1"],     ← Ajouté
  linkedConditionIds: ["condition-def-1"], ← Ajouté
  linkedTableIds: ["table-ghi-1"],         ← Ajouté
  linkedVariableIds: ["var-xyz-1"]         ← Déjà géré
}
```

### Paramètres de Capacité
```typescript
TreeBranchLeafNode {
  hasFormula: true,
  formula_activeId: "formula-abc-1",
  formula_name: "calcul_puissance-1",
  
  hasCondition: true,
  condition_activeId: "condition-def-1",
  condition_name: "si_orienté_sud-1",
  
  hasTable: true,
  table_activeId: "table-ghi-1",
  table_name: "rendements-1",
  table_type: "basic"
}
```

## ✅ Tests de Validation

### ✅ Test 1 : Formule Simple
```typescript
Variable: prix_kwh
sourceRef: "node-formula:702d1b09-abc9-..."
tokens: ["@value.consommation", "*", "0.35"]

Après copie (suffixe = 1) :
sourceRef: "node-formula:702d1b09-abc9-...-1"
tokens: ["@value.consommation-1", "*", "0.35"]
```

### ✅ Test 2 : Condition avec Formule
```typescript
Variable: cout_chauffage
sourceRef: "condition:def456-..."
conditionSet: {
  branches: [{
    when: { left: { ref: "@value.type_chauffage" }, op: "eq", right: { value: "électrique" } },
    then: { actions: [{ nodeIds: ["node-formula:abc123"] }] }
  }]
}

Après copie (suffixe = 1) :
sourceRef: "condition:def456-...-1"
conditionSet: {
  branches: [{
    when: { left: { ref: "@value.type_chauffage-1" }, ... },
    then: { actions: [{ nodeIds: ["node-formula:abc123-1"] }] } ← Formule mappée
  }]
}
```

### ✅ Test 3 : Table Complexe
```typescript
Variable: tableau_rendements
sourceRef: "@table.ghi789-..."
Table avec:
- 3 colonnes (Année, Mois, Rendement)
- 5 lignes
- 15 cellules

Après copie (suffixe = 1) :
sourceRef: "@table.ghi789-...-1"
Table-1 avec:
- 3 colonnes-1 (IDs réécrits)
- 5 lignes-1 (IDs réécrits)
- 15 cellules-1 (IDs réécrits + columnId/rowId mappés)
```

## 📝 Points d'Attention

### ⚠️ Ordre de Copie
L'ordre est IMPORTANT pour les dépendances :
1. **Formules** en premier (pas de dépendances externes)
2. **Conditions** ensuite (peuvent référencer des formules)
3. **Tables** enfin (peuvent référencer formules/conditions dans les configs)

### ⚠️ Cache de Copie
Chaque module utilise un cache (`formulaCopyCache`, `conditionCopyCache`, `tableCopyCache`) pour éviter de copier deux fois la même capacité si plusieurs variables y font référence.

### ⚠️ Gestion des Erreurs
Si une copie échoue, le système applique un **suffixe optimiste** (`-N`) pour maintenir la cohérence des IDs, même si la capacité n'a pas pu être copiée physiquement.

## 🎉 Résultat Final

Lorsque l'utilisateur clique sur "+", **TOUT est copié automatiquement** :
- ✅ Les nœuds (deep copy)
- ✅ Les variables
- ✅ **Les formules** (NEW ⭐)
- ✅ **Les conditions** (NEW ⭐)
- ✅ **Les tables** (NEW ⭐)

**Plus besoin de recopier manuellement les capacités !** 🚀
