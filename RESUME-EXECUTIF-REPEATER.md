# 🎯 RÉSUMÉ EXÉCUTIF - SYSTÈME DE RÉPÉTITION

## 📖 CE QUE J'AI COMPRIS

Après analyse complète d'`operation-interpreter.ts` (LA BIBLE) et des fichiers de répétition, voici le système:

### Architecture du Repeater

```
REPEATER (0f7a180b...)
  │
  ├── TEMPLATE NODE 1 (13c56c1f...)  ← Original
  │     ├── linkedVariableIds: ['var-abc', 'var-def']
  │     ├── Variable directe: Orientation
  │     ├── Formula: MAX(...)
  │     └── Table: SELECT FROM ...
  │
  ├── TEMPLATE NODE 2 (249b682d...)
  │     └── ...
  │
  └── COPIES GÉNÉRÉES:
        ├── NODE 1-1 (13c56c1f...-1)  ← Copie avec suffixe -1
        │     ├── linkedVariableIds: ['var-abc', 'var-def'] ❌ PAS MIS À JOUR!
        │     ├── Variable: ❌ PAS COPIÉE!
        │     ├── Formula: ❌ PAS COPIÉE!
        │     └── Table: ❌ PAS COPIÉE!
        │
        └── NODE 2-1 (249b682d...-1)
              └── ... (même problème)
```

## 🚨 PROBLÈMES IDENTIFIÉS

### 1. Les Capacités Ne Sont PAS Copiées

**Blueprint** (`repeat-blueprint-builder.ts`) :
- ✅ Identifie les formulas, conditions, tables
- ✅ Les met dans `blueprint.capacities`

**Instantiator** (`repeat-instantiator.ts`) :
- ❌ **NE crée PAS** de plan pour les capacités
- ❌ Retourne uniquement `{ nodes, variables, totalField }`
- ❌ **MANQUE** : `capacities: CapacityCopyPlan[]`

**Résultat** :
```
GET /api/treebranchleaf/nodes/13c56c1f...-1/select-config
→ 404 NOT FOUND ❌
Raison: Le node -1 existe mais n'a pas de TreeBranchLeafNodeTable
```

### 2. Les linkedVariableIds Ne Sont PAS Mis à Jour

Quand un node est copié :
```typescript
// AVANT
templateNode.id = '13c56c1f-7a14-41db-b1b6-214eb7d88235'
templateNode.linkedVariableIds = ['var-abc-123', 'var-def-456']

// APRÈS COPIE (ACTUEL - ❌ INCORRECT)
copiedNode.id = '13c56c1f-7a14-41db-b1b6-214eb7d88235-1'
copiedNode.linkedVariableIds = ['var-abc-123', 'var-def-456'] // ❌ Pointe vers originaux!

// ATTENDU (✅ CORRECT)
copiedNode.id = '13c56c1f-7a14-41db-b1b6-214eb7d88235-1'
copiedNode.linkedVariableIds = ['var-abc-123-1', 'var-def-456-1'] // ✅ Pointe vers copies!
```

### 3. Les Formulas/Conditions Ne Sont PAS Adaptées

Quand une formula est copiée, ses références internes doivent être mises à jour :
```typescript
// AVANT
formula.expression = "MAX(@value.fieldA, @value.fieldB)"

// APRÈS COPIE (ATTENDU)
formula-1.expression = "MAX(@value.fieldA-1, @value.fieldB-1)"
```

## 🛠️ CORRECTIONS NÉCESSAIRES

### Fichier 1: `repeat-instantiator.ts`

**AJOUTER** une interface pour les capacités :

```typescript
export interface CapacityCopyPlan {
  templateCapacityId: string;
  plannedCapacityId: string;
  capacityType: 'formula' | 'condition' | 'table';
  ownerNodeId: string;
  plannedSuffix: string | number;
}

export interface RepeatInstantiationPlan {
  nodes: NodeCopyPlan[];
  variables: VariableCopyPlan[];
  capacities: CapacityCopyPlan[]; // ← AJOUTER ICI
  totalField?: {...};
}
```

**AJOUTER** la génération du plan pour les capacités :

```typescript
export function createInstantiationPlan(
  blueprint: RepeatBlueprint,
  options: InstantiationOptions
): RepeatInstantiationPlan {
  // ... code existant pour nodes et variables ...

  // ✅ NOUVEAU : Plan pour les capacités
  const capacities: CapacityCopyPlan[] = blueprint.capacities.map(capacity => {
    const ownerSuffix = resolveSuffix(capacity.ownerNodeId);
    return {
      templateCapacityId: capacity.capacityId,
      plannedCapacityId: `${capacity.capacityId}-${ownerSuffix}`,
      capacityType: capacity.capacityType,
      ownerNodeId: `${capacity.ownerNodeId}-${ownerSuffix}`,
      plannedSuffix: ownerSuffix
    };
  });

  return {
    nodes,
    variables,
    capacities, // ← AJOUTER ICI
    totalField: totalFieldPlan
  };
}
```

### Fichier 2: Route d'exécution (à créer ou modifier)

Il manque le code qui **EXÉCUTE** le plan. Actuellement :
- ✅ Le plan est créé
- ❌ Le plan n'est PAS exécuté !

Il faut créer une fonction qui :

```typescript
async function executeInstantiationPlan(
  prisma: PrismaClient,
  plan: RepeatInstantiationPlan
): Promise<void> {
  // 1. Copier les nodes
  for (const nodePlan of plan.nodes) {
    await copyNode(prisma, {
      templateNodeId: nodePlan.templateNodeId,
      newNodeId: nodePlan.newNodeId,
      suffix: nodePlan.plannedSuffix
    });
  }

  // 2. Copier les variables
  for (const varPlan of plan.variables) {
    await copyVariable(prisma, {
      templateVariableId: varPlan.templateVariableId,
      newVariableId: varPlan.plannedVariableId,
      targetNodeId: varPlan.targetNodeId,
      suffix: varPlan.plannedSuffix
    });
  }

  // 3. ✅ NOUVEAU : Copier les capacités
  for (const capPlan of plan.capacities) {
    await copyCapacity(prisma, {
      templateCapacityId: capPlan.templateCapacityId,
      newCapacityId: capPlan.plannedCapacityId,
      capacityType: capPlan.capacityType,
      ownerNodeId: capPlan.ownerNodeId,
      suffix: capPlan.plannedSuffix
    });
  }

  // 4. ✅ NOUVEAU : Mettre à jour les linkedVariableIds
  await updateLinkedVariableIds(prisma, plan);
}
```

### Fichier 3: Fonction de copie des capacités (à créer)

```typescript
async function copyCapacity(
  prisma: PrismaClient,
  options: {
    templateCapacityId: string;
    newCapacityId: string;
    capacityType: 'formula' | 'condition' | 'table';
    ownerNodeId: string;
    suffix: string | number;
  }
): Promise<void> {
  switch (options.capacityType) {
    case 'formula':
      const originalFormula = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: options.templateCapacityId }
      });
      
      if (originalFormula) {
        // Adapter l'expression pour référencer les champs copiés
        const adaptedExpression = adaptFormulaReferences(
          originalFormula.expression,
          options.suffix
        );
        
        await prisma.treeBranchLeafNodeFormula.create({
          data: {
            id: options.newCapacityId,
            nodeId: options.ownerNodeId,
            expression: adaptedExpression,
            // ... copier toutes les autres propriétés
          }
        });
      }
      break;

    case 'table':
      const originalTable = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: options.templateCapacityId }
      });
      
      if (originalTable) {
        await prisma.treeBranchLeafNodeTable.create({
          data: {
            id: options.newCapacityId,
            nodeId: options.ownerNodeId,
            // ... copier toutes les propriétés
          }
        });
      }
      break;

    case 'condition':
      // Similaire à formula
      break;
  }
}
```

### Fichier 4: Adaptation des références (à créer)

```typescript
function adaptFormulaReferences(
  expression: string,
  suffix: string | number
): string {
  // Remplacer @value.fieldId par @value.fieldId-suffix
  return expression.replace(
    /@value\.([a-f0-9-]+)/g,
    (match, fieldId) => `@value.${fieldId}-${suffix}`
  );
}

async function updateLinkedVariableIds(
  prisma: PrismaClient,
  plan: RepeatInstantiationPlan
): Promise<void> {
  for (const nodePlan of plan.nodes) {
    const originalNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodePlan.templateNodeId },
      select: { linkedVariableIds: true }
    });
    
    if (originalNode?.linkedVariableIds) {
      const updatedLinkedVarIds = originalNode.linkedVariableIds.map(varId => {
        // Nettoyer les suffixes existants
        const cleanId = varId.replace(/(-\d+)+$/, '');
        // Ajouter le nouveau suffixe
        return `${cleanId}-${nodePlan.plannedSuffix}`;
      });
      
      await prisma.treeBranchLeafNode.update({
        where: { id: nodePlan.newNodeId },
        data: { linkedVariableIds: updatedLinkedVarIds }
      });
    }
  }
}
```

## 📋 PLAN D'ACTION

### Phase 1 : Modifier l'Instantiator ✅
1. Ajouter `CapacityCopyPlan` interface
2. Générer le plan pour les capacités
3. Inclure dans `RepeatInstantiationPlan`

### Phase 2 : Créer l'Exécuteur
4. Fonction `executeInstantiationPlan()`
5. Fonction `copyCapacity()`
6. Fonction `adaptFormulaReferences()`
7. Fonction `updateLinkedVariableIds()`

### Phase 3 : Intégrer dans la Route
8. Modifier `POST /api/repeat/:repeaterNodeId/instances/execute`
9. Appeler `executeInstantiationPlan()` avec le plan

### Phase 4 : Tester
10. Créer une instance de repeater
11. Vérifier que les capacités sont copiées
12. Vérifier que les références sont mises à jour
13. Vérifier que les calculs fonctionnent

## 🔍 FICHIERS À CRÉER/MODIFIER

| Fichier | Action | Priorité |
|---------|--------|----------|
| `repeat-instantiator.ts` | Ajouter plan pour capacités | 🔴 HAUTE |
| `repeat-executor.ts` | **CRÉER** - Exécuter le plan | 🔴 HAUTE |
| `repeat-capacity-copier.ts` | **CRÉER** - Copier capacités | 🔴 HAUTE |
| `repeat-reference-adapter.ts` | **CRÉER** - Adapter références | 🔴 HAUTE |
| `repeat-routes.ts` | Appeler l'exécuteur | 🟡 MOYENNE |

## 🎯 VALIDATION

Pour valider que tout fonctionne :

```javascript
// 1. Créer une instance
POST /api/repeat/0f7a180b.../instances/execute
{ suffix: 1 }

// 2. Vérifier les copies
GET /api/treebranchleaf/trees/:treeId/nodes
→ Doit contenir les nodes -1

// 3. Vérifier les capacités
GET /api/treebranchleaf/nodes/13c56c1f...-1/select-config
→ Doit retourner 200 OK ✅ (pas 404 ❌)

// 4. Vérifier les calculs
GET /api/tree-nodes/13c56c1f...-1/calculated-value?submissionId=...
→ Doit calculer correctement
```

---

**Conclusion** : Le système est bien conçu (architecture 3-tiers : Blueprint → Plan → Execution), mais l'exécution est **INCOMPLÈTE**. Il manque la copie des capacités et la mise à jour des références.
