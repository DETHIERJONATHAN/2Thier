# 📊 ANALYSE COMPLÈTE DU SYSTÈME DE RÉPÉTITION (REPEATER)

## 🎯 COMPRÉHENSION DU PROBLÈME

D'après les logs de la console et l'analyse du code, voici ce que je comprends :

### Le Système Actuel

1. **Repeater** (`0f7a180b-36df-413c-9266-059f47ce1190`) = Un conteneur de champs modèles
2. **Template Nodes** = Champs originaux dans le repeater (ex: `13c56c1f-7a14-41db-b1b6-214eb7d88235`)
3. **Copies** = Champs dupliqués avec un suffixe `-1`, `-2`, etc. (ex: `13c56c1f-7a14-41db-b1b6-214eb7d88235-1`)

### Le Flux de Copie

```
BOUTON "REPEAT" CLIQUÉ
        ↓
1. POST /api/repeat/:repeaterNodeId/instances/execute
        ↓
2. repeat-service.ts → executeRepeatDuplication()
        ↓
3. Création du Blueprint (repeat-blueprint-builder.ts)
   - Identifie les template nodes
   - Identifie les variables liées (linkedVariableIds)
   - Identifie les capacités (formulas, conditions, tables)
        ↓
4. Création du Plan (repeat-instantiator.ts)
   - Génère nouveaux IDs avec suffixes
   - Plan pour copier nodes
   - Plan pour copier variables
   - Plan pour copier capacités
        ↓
5. PROBLÈME ICI ! ❌
   - Les copies sont créées MAIS :
     ✅ Les nodes sont copiés
     ❌ Les variables NE sont PAS toujours copiées
     ❌ Les capacités NE sont PAS toujours copiées
     ❌ Les linkedVariableIds des copies pointent vers l'original
```

## 🔍 DIAGNOSTIC DES ERREURS

### Erreur 404 : `/api/treebranchleaf/nodes/13c56c1f.../select-config`

```
useAuthenticatedApi.ts:174 GET https://.../api/treebranchleaf/nodes/13c56c1f-7a14-41db-b1b6-214eb7d88235/select-config 404 (Not Found)
```

**Cause** : Le node `13c56c1f-7a14-41db-b1b6-214eb7d88235` est un template (original). Quand on crée une copie avec suffixe `-1`, le frontend essaie de charger la config du node `-1` mais :
- Le node `-1` existe en DB
- MAIS il n'a pas de `TreeBranchLeafNodeTable` associé
- DONC la route `/select-config` retourne 404

**Solution** : Copier aussi les tables (capacités) lors de la duplication !

### Problème des Variables Liées

D'après `repeat-blueprint-builder.ts` ligne 155-195 :

```typescript
// 🔧 FIX: Nettoyer les suffixes des linkedVariableIds
const cleanVariableId = (id: string): string => {
  return id.replace(/(-\d+)+$/, '');
};
```

Le code essaie déjà de nettoyer les suffixes, MAIS il y a un problème :
- Les `linkedVariableIds` dans la DB peuvent contenir des IDs suffixés (ex: `var-abc-1`)
- Ces IDs suffixés n'existent PAS en tant que variables autonomes
- Ils devraient pointer vers l'ID original

## 🏗️ ARCHITECTURE ACTUELLE

### Fichiers Clés

| Fichier | Rôle |
|---------|------|
| `repeat-service.ts` | Point d'entrée - Orchestre la duplication |
| `repeat-blueprint-builder.ts` | Construit le plan de ce qui doit être copié |
| `repeat-instantiator.ts` | Génère les nouveaux IDs avec suffixes |
| `suffix-utils.ts` | Gestion des suffixes séquentiels |
| `operation-interpreter.ts` | **LA BIBLE** - Interprète les formules/conditions/tables |

### Principes du Système

D'après `operation-interpreter.ts` :

1. **Récursivité** : Tout peut référencer tout (Condition → Formule → Table → Condition...)
2. **Suffixes** : Les copies prennent des suffixes `-1`, `-2`, etc.
3. **Variables** : 
   - Directes : `nodeId` = le node qui possède la variable
   - Liées : `linkedVariableIds` = liste de nodes qui utilisent cette variable
4. **Capacités** : Formules, Conditions, Tables attachées aux nodes

## 🚨 PROBLÈMES IDENTIFIÉS

### 1. Variables Liées Non Copiées

**Symptôme** : Les champs copiés ne fonctionnent pas car leurs variables ne sont pas copiées

**Code Problématique** (`repeat-blueprint-builder.ts` ligne 207-219) :

```typescript
// Ã°Å¸â€Â§ CRITICAL FIX: For linked variables, we need to generate a variable entry for EACH template node that references it
const expandedVariables = [];
for (const directVar of directVariables) {
  expandedVariables.push({
    ...directVar,
    variableId: directVar.id,
    linkedToNodeIds: [] // Direct variables don't have this
  });
}
for (const linkedVar of linkedVariables) {
  const referencingNodeIds = Array.from(linkedVarsByNode.get(linkedVar.id) || []);
  for (const nodeId of referencingNodeIds) {
    expandedVariables.push({
      ...linkedVar,
      variableId: linkedVar.id,
      linkedToNodeIds: [nodeId],
      primaryTargetNodeId: nodeId // ✅ BON - Spécifie le node cible
    });
  }
}
```

Le code semble correct ICI, mais il manque peut-être l'exécution réelle dans `repeat-instantiator.ts` !

### 2. Capacités Non Copiées

**Symptôme** : Les formules/conditions/tables ne sont pas dupliquées

**Code Problématique** (`repeat-blueprint-builder.ts` ligne 233-250) :

```typescript
const [formulas, conditions, tables] = await Promise.all([
  prisma.treeBranchLeafNodeFormula.findMany({
    where: { nodeId: { in: templateNodeIds } },
    select: { id: true, nodeId: true }
  }),
  // ...
]);

return {
  // ...
  capacities: [
    ...formulas.map(f => ({
      ownerNodeId: f.nodeId,
      capacityId: f.id,
      capacityType: 'formula' as const
    })),
    // ...
  ],
  // ...
};
```

Les capacités sont IDENTIFIÉES dans le blueprint, mais il manque la COPIE effective !

### 3. linkedVariableIds Non Mis à Jour

**Symptôme** : Les nodes copiés pointent vers les variables originales au lieu des copies

**Solution Attendue** :
```typescript
// AVANT COPIE
node.linkedVariableIds = ['var-abc-123', 'var-def-456']

// APRÈS COPIE node-1
node-1.linkedVariableIds = ['var-abc-123-1', 'var-def-456-1'] // ❌ DOIT être mis à jour !
```

## 🛠️ SOLUTIONS PROPOSÉES

### Solution 1 : Copier les Capacités

Dans `repeat-instantiator.ts`, ajouter la copie des capacités :

```typescript
// AFTER copying nodes and variables, copy capacities
for (const capacity of blueprint.capacities) {
  const suffix = perTemplateSuffixes[capacity.ownerNodeId] || options.suffix;
  const newCapacityId = `${capacity.capacityId}-${suffix}`;
  const newOwnerNodeId = `${capacity.ownerNodeId}-${suffix}`;
  
  plan.capacities.push({
    templateCapacityId: capacity.capacityId,
    plannedCapacityId: newCapacityId,
    capacityType: capacity.capacityType,
    ownerNodeId: newOwnerNodeId
  });
}
```

### Solution 2 : Mettre à Jour linkedVariableIds

Dans le code qui crée les copies de nodes, ajouter :

```typescript
// When copying a node, update its linkedVariableIds
const originalLinkedVarIds = templateNode.linkedVariableIds || [];
const newLinkedVarIds = originalLinkedVarIds.map(varId => {
  const cleanedId = varId.replace(/(-\d+)+$/, '');
  return `${cleanedId}-${suffix}`;
});

newNode.linkedVariableIds = newLinkedVarIds;
```

### Solution 3 : Créer les Tables Manquantes

Pour éviter les 404 sur `/select-config`, copier aussi les `TreeBranchLeafNodeTable` :

```typescript
// Copy table configurations
if (capacity.capacityType === 'table') {
  const originalTable = await prisma.treeBranchLeafNodeTable.findUnique({
    where: { id: capacity.capacityId }
  });
  
  if (originalTable) {
    await prisma.treeBranchLeafNodeTable.create({
      data: {
        id: newCapacityId,
        nodeId: newOwnerNodeId,
        // ... copier toutes les propriétés de la table
      }
    });
  }
}
```

## 📝 FICHIERS À MODIFIER

### 1. `repeat-instantiator.ts`

**AJOUTER** :
- Génération des IDs pour les capacités (formulas, conditions, tables)
- Logique de mise à jour des `linkedVariableIds`
- Copie effective des capacités en DB

### 2. `repeat-blueprint-builder.ts`

**VÉRIFIER** :
- ✅ Identification des capacités : OK
- ✅ Identification des variables liées : OK
- ❓ Nettoyage des suffixes dans linkedVariableIds : À vérifier

### 3. Routes de copie (legacy)

**NETTOYER** :
- Supprimer les anciennes routes `/api/treebranchleaf/copy-linked-variable`
- Tout migrer vers `/api/repeat/`

## 🔬 TESTS À EFFECTUER

1. **Test 1** : Créer une instance de repeater
   - Vérifier que tous les nodes sont copiés
   - Vérifier que toutes les variables sont copiées
   - Vérifier que toutes les capacités sont copiées

2. **Test 2** : Vérifier les références
   - Les linkedVariableIds doivent pointer vers les copies
   - Les formulas doivent référencer les variables copiées
   - Les conditions doivent référencer les champs copiés

3. **Test 3** : Tester les calculs
   - Les formules copiées doivent calculer correctement
   - Les conditions copiées doivent évaluer correctement
   - Les tables copiées doivent lookup correctement

## 🎯 PROCHAINES ÉTAPES

1. ✅ Analyser `repeat-instantiator.ts` pour voir comment il crée les copies
2. ❌ Identifier pourquoi les capacités ne sont pas copiées
3. ❌ Ajouter la copie des capacités dans l'instantiator
4. ❌ Mettre à jour linkedVariableIds lors de la copie
5. ❌ Tester le système complet

---

**Date** : 2025-01-06  
**Auteur** : Analyse basée sur operation-interpreter.ts (LA BIBLE)
