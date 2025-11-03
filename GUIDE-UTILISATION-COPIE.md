# 📝 Guide d'Utilisation - Copie de Variables Liées

## 🎯 Objectif

Quand tu copies un nœud TBL, le système doit:
1. ✅ Lire les IDs depuis `linkedVariableIds`
2. ✅ Copier les variables et leurs capacités
3. ✅ Appliquer le suffixe à tout
4. ✅ Mettre à jour les bonnes tables et colonnes
5. ✅ Synchroniser les références

**Nouveau statut**: ✅ IMPLÉMENTÉ

---

## 🚀 Cas d'Usage

### Cas 1 : Copie Simple d'un Nœud

```bash
POST /api/nodes/mon-nœud-id/deep-copy
```

**Réponse**:
```json
{
  "root": {
    "oldId": "mon-nœud-id",
    "newId": "mon-nœud-id-1"
  },
  "idMap": {
    "mon-nœud-id": "mon-nœud-id-1",
    "enfant-1": "enfant-1-1"
  }
}
```

**Internalement**:
1. Système crée `mon-nœud-id-1`
2. Décide suffixe = 1
3. Copie formules → `formula-x` devient `formula-x-1`
4. Copie conditions → `condition-y` devient `condition-y-1`
5. Copie variables liées:
   - Cherche `linkedVariableIds` dans `mon-nœud-id`
   - Pour chaque var liée: appelle `copyVariableWithCapacities()`
   - Crée `var-id-1`, `var-id-1-data-1` (nœud d'affichage)
   - Met à jour `linkedVariableIds` du nouveau nœud

---

## 🔍 Inspection

### 1. Vérifier Après Copie

```sql
-- Avant copie
SELECT id, linkedVariableIds, linkedFormulaIds FROM TreeBranchLeafNode 
WHERE id = 'mon-nœud-id';

-- Après copie
SELECT id, linkedVariableIds, linkedFormulaIds FROM TreeBranchLeafNode 
WHERE id = 'mon-nœud-id-1';

-- Vérifier variables copiées
SELECT id, nodeId, displayName, sourceRef FROM TreeBranchLeafNodeVariable
WHERE id LIKE 'var-id-%';

-- Vérifier nœuds d'affichage
SELECT id, parentId, type, linkedVariableIds FROM TreeBranchLeafNode
WHERE id LIKE '%-data-%';
```

### 2. Avec Logs

Le système affiche (en développement):
```
🔗 [DEEP-COPY] Copie 2 variable(s) pour nœud mon-nœud-id-1
  ✅ [DEEP-COPY] Variable copiée: var-1-1 (type: formula)
  ✅ [DEEP-COPY] Variable copiée: var-2-1 (type: condition)
✅ [DEEP-COPY] Nœud mon-nœud-id-1 mis à jour
  linkedVariableIds: 2
```

---

## 🧪 Tests

### Test 1 : Variables avec Formules

**Setup**:
```
Nœud A
├── Variable 1: sourceRef="node-formula:formula-1"
├── Variable 2: sourceRef="node-formula:formula-2"
└── Formule 1, Formule 2

Deep Copy A → A-1
```

**Vérification**:
- [ ] A-1 existe
- [ ] Variable 1-1 existe avec sourceRef="node-formula:formula-1-1"
- [ ] Variable 2-1 existe avec sourceRef="node-formula:formula-2-1"
- [ ] Formula 1-1 existe
- [ ] Formula 2-1 existe
- [ ] A-1.linkedVariableIds = ["Variable 1-1", "Variable 2-1"]
- [ ] Formula 1-1.nodeId = A-1

### Test 2 : Variables avec Conditions

**Setup**:
```
Nœud B
├── Variable 1: sourceRef="condition:cond-1"
└── Condition 1

Deep Copy B → B-1
```

**Vérification**:
- [ ] Variable 1-1 existe avec sourceRef="condition:cond-1-1"
- [ ] Condition 1-1 existe
- [ ] B-1.linkedVariableIds = ["Variable 1-1"]
- [ ] B-1.linkedConditionIds inclut cond-1-1

### Test 3 : Variables avec Capacités Mixtes

**Setup**:
```
Nœud C
├── Variable 1: sourceRef="@table.table-1"
├── Variable 2: sourceRef=null (fixed)
├── Table 1
└── Variable 2 sans capacité

Deep Copy C → C-1
```

**Vérification**:
- [ ] Variable 1-1 existe avec sourceRef="@table.table-1-1"
- [ ] Variable 2-1 existe avec sourceRef=null
- [ ] Table 1-1 existe
- [ ] C-1.linkedVariableIds = ["Variable 1-1", "Variable 2-1"]
- [ ] C-1.linkedTableIds inclut table-1-1

### Test 4 : Variables Imbriquées

**Setup**:
```
Nœud D (repeater)
└── Template enfant D-child
    ├── Variable 1: sourceRef="node-formula:formula-X" (vers nœud parent D)
    └── Variable 2: sourceRef="@value.sibling-node-id"

Deep Copy D → D-1
```

**Vérification**:
- [ ] D-1-child-1 existe
- [ ] Variable 1-1 a sourceRef="node-formula:formula-X-1"
- [ ] Variable 2-1 a sourceRef="@value.sibling-node-id-1"
- [ ] Références croisées correctes

---

## ⚡ Performances

### Optimisations Existantes

1. **Cache de Variables** (`variableCopyCache`)
   - Évite de copier 2x la même variable
   - Shared references utilisent le cache

2. **Maps de Références**
   - `formulaIdMap` : recherche O(1)
   - `conditionIdMap` : recherche O(1)
   - `tableIdMap` : recherche O(1)
   - `nodeIdMap` : recherche O(1)

3. **Requêtes Groupées**
   - Une seule requête pour récupérer toutes les formules
   - Une seule requête pour créer la variable

### Complexité

- **Temps** : O(n + m + k) où
  - n = nombre de variables liées
  - m = nombre de capacités référencées
  - k = nombre de nœuds d'affichage
- **Espace** : O(n + m) pour les maps

Pour un nœud avec 10 variables liées → ~10-20ms

---

## 🐛 Troubleshooting

### Problème : Variable copiée mais sourceRef non mis à jour

**Cause** : La capacité (formule/condition/table) n'a pas été copiée
**Solution** : Vérifier que `formulaIdMap` est passé à `copyVariableWithCapacities()`

### Problème : linkedVariableIds vide après copie

**Cause** : Nœud créé avec `linkedVariableIds: []` puis jamais rempli
**Solution** : Le code fait un UPDATE après copie (ligne ~2180)

### Problème : Référence circulaire / boucle infinie

**Cause** : Deux variables se référencent mutuellement
**Fait** : Cache empêche la copie deux fois → pas de boucle

### Problème : Nœud d'affichage (data) non créé

**Cause** : `displayName` est null ou variable pas trouvée
**Solution** : Vérifier que la variable originale a un `displayName`

---

## 💡 Extensions Possibles

### 1. Copie Partielle (Optionnel)

```typescript
interface CopyOptions {
  skipVariables?: boolean;
  skipFormulas?: boolean;
  skipConditions?: boolean;
  skipTables?: boolean;
}
```

### 2. Stratégies de Mapping

```typescript
type SourceRefStrategy = 
  | 'map-if-exists'  // Utiliser mappé si existe
  | 'always-map'     // Mapper coûte que coûte
  | 'keep-original'; // Garder réf originale
```

### 3. Validation de Cohérence

```typescript
async function validateCopy(oldNodeId, newNodeId) {
  // Vérifier que tout a été copié correctement
  // Vérifier pas de doublons
  // Vérifier intégrité des références
}
```

---

## 📚 Références

- Code principal : `src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts`
- Fonction copie : `src/components/TreeBranchLeaf/treebranchleaf-new/api/copy-variable-with-capacities.ts`
- Schéma : `prisma/schema.prisma`
- Modèles :
  - `TreeBranchLeafNode`
  - `TreeBranchLeafNodeVariable`
  - `TreeBranchLeafNodeFormula`
  - `TreeBranchLeafNodeCondition`
  - `TreeBranchLeafNodeTable`

---

## ✅ Checklist Déploiement

Avant de mettre en production:

- [ ] Tests unitaires créés
- [ ] Tests d'intégration passent
- [ ] Logs en place pour debugging
- [ ] Performance mesurée (<100ms pour nœud complexe)
- [ ] Backwards compatibility vérifiée
- [ ] Documentation mise à jour
- [ ] Rollback plan préparé

