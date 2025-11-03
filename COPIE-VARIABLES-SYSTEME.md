# 🔗 Système de Copie de Variables Liées avec Capacités

## Vue d'ensemble

Le système de copie des variables liées fonctionne en trois étapes principales :

1. **Détection** : Lecture des IDs depuis `linkedVariableIds`
2. **Copie** : Copie des variables et de leurs capacités associées avec un suffixe
3. **Synchronisation** : Mise à jour des références bidirectionnelles

---

## Architecture

### 📍 Points d'entrée

#### 1. **Deep Copy Principale** (`deepCopyNodeInternal`)
- **Fichier** : `src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts`
- **Ligne** : ~2130-2200
- **Déclenchement** : Route `POST /nodes/:nodeId/deep-copy`
- **Suffixe** : Calculé automatiquement (`__copySuffixNum = _maxSuffixNum + 1`)

#### 2. **Copie Alternative Directe** (`copyLinkedVariablesFromNode`)
- **Fichier** : `src/components/TreeBranchLeaf/treebranchleaf-new/api/copy-variable-with-capacities.ts`
- **Fonction** : Optionnelle, pour usage direct si besoin
- **Utilité** : Encapsule la logique de copie de toutes les variables liées d'un nœud

---

## 🔄 Processus Détaillé

### Phase 1 : Copie des Nœuds et Capacités

```typescript
// Dans deepCopyNodeInternal (ligne ~1850-2020)

// 1. Copier tous les nœuds du sous-arbre
for (const oldId of nodesToCreate) {
  const cloneData: TreeBranchLeafNodeCreateInput = {
    id: newId,
    linkedVariableIds: [], // VIDE au départ!
    // ... autres champs
  };
  await prisma.treeBranchLeafNode.create({ data: cloneData });
}

// 2. Copier les Formules/Conditions/Tables
for (const { oldId, newId } of createdNodes) {
  // Formules
  const formulas = await prisma.treeBranchLeafNodeFormula.findMany({ where: { nodeId: oldId } });
  for (const f of formulas) {
    const newFormulaId = `${f.id}-${__copySuffixNum}`;
    formulaIdMap.set(f.id, newFormulaId); // 🔗 Tracer la copie
    await prisma.treeBranchLeafNodeFormula.create({
      data: {
        id: newFormulaId,
        nodeId: newId,
        tokens: replaceIdsInTokens(f.tokens, idMap),
        // ...
      }
    });
  }
  
  // Conditions (même logique)
  // Tables (même logique)
}
```

**État après Phase 1** :
- ✅ Tous les nœuds existent avec `linkedVariableIds: []`
- ✅ Toutes les formules/conditions/tables existent avec nouveaux IDs suffixés
- ❌ Les variables liées n'existent pas encore

---

### Phase 2 : Copie des Variables Liées

```typescript
// Dans deepCopyNodeInternal (ligne ~2120-2200)

const variableCopyCache = new Map<string, string>();

for (const oldNodeId of toCopy) {
  const newNodeId = idMap.get(oldNodeId)!;
  const oldNode = byId.get(oldNodeId)!;
  const newLinkedVariableIds: string[] = [];

  // 🔗 COPIE DES VARIABLES AVEC CAPACITÉS
  if (Array.isArray(oldNode.linkedVariableIds) && oldNode.linkedVariableIds.length > 0) {
    console.log(`🔗 [DEEP-COPY] Copie ${oldNode.linkedVariableIds.length} variable(s)`);
    
    for (const linkedVarId of oldNode.linkedVariableIds) {
      try {
        const copyResult = await copyVariableWithCapacities(
          linkedVarId,
          __copySuffixNum,
          newNodeId,
          prisma,
          {
            formulaIdMap,    // ← Les formules copiées sont ici!
            conditionIdMap,  // ← Les conditions copiées sont ici!
            tableIdMap,      // ← Les tables copiées sont ici!
            nodeIdMap: idMap, // ← Les nœuds copiés sont ici!
            variableCopyCache
          }
        );
        
        if (copyResult.success) {
          newLinkedVariableIds.push(copyResult.variableId);
        }
      } catch (e) {
        console.warn(`  ⚠️ Erreur copie variable`, e);
      }
    }
  }

  // UPDATE du nœud avec linkedVariableIds correctes
  await prisma.treeBranchLeafNode.update({
    where: { id: newNodeId },
    data: {
      linkedVariableIds: { set: newLinkedVariableIds }
    }
  });
}
```

**État après Phase 2** :
- ✅ Toutes les variables existent avec nouveaux IDs suffixés
- ✅ Les `linkedVariableIds` sont mis à jour sur les nœuds
- ✅ Les références bidirectionnelles sont synchronisées

---

## 🔍 Fonction `copyVariableWithCapacities`

### Signature

```typescript
export async function copyVariableWithCapacities(
  originalVarId: string,           // ID de la variable source
  suffix: number,                  // Suffixe numérique (ex: 1, 2, 3)
  newNodeId: string,               // ID du nœud destination
  prisma: PrismaClient,
  options: CopyVariableOptions = {}
): Promise<CopyVariableResult>
```

### Options

```typescript
export interface CopyVariableOptions {
  formulaIdMap?: Map<string, string>;      // ancien ID → nouveau ID
  conditionIdMap?: Map<string, string>;
  tableIdMap?: Map<string, string>;
  nodeIdMap?: Map<string, string>;
  variableCopyCache?: Map<string, string>; // éviter doublons
}
```

### Processus Interne

```
1. Vérifier le cache (éviter doublons)
   ✅ Trouvé → retourner résultat en cache
   ❌ Non trouvé → continuer

2. Récupérer la variable originale
   ❌ Non trouvée → retourner erreur

3. Générer les nouveaux IDs
   oldVarId = "var-xyz"
   newVarId = "var-xyz-1"
   newExposedKey = "exposedKey-1"

4. Analyser sourceRef
   - Identifier le type : formula|condition|table|field
   - Extraire l'ID : "node-formula:abc123" → "abc123"

5. Mapper sourceRef
   Si formulaIdMap.get(id) existe → utiliser le nouveau
   Sinon → appliquer suffixe optimiste

6. Créer la nouvelle variable
   TreeBranchLeafNodeVariable.create({
     id: newVarId,
     nodeId: newNodeId,
     exposedKey: newExposedKey,
     sourceRef: <mappé>,
     // ...
   })

7. Créer le nœud d'affichage (leaf_field/TEXT)
   Si variable a displayName → créer nœud "Donnée" pour afficher
   nodeId = "${newNodeId}-data-${suffix}"

8. Mettre en cache
   variableCopyCache.set(oldVarId, newVarId)

9. Mettre à jour bidirectionnel
   Si sourceRef pointe vers formule/condition/table
   → ajouter la variable dans linkedXxxIds de la capacité
```

### Valeur Retournée

```typescript
export interface CopyVariableResult {
  variableId: string;              // Nouvel ID
  exposedKey: string;              // Nouvelle clé exposée
  capacityType: 'formula' | 'condition' | 'table' | 'field' | null;
  sourceRef: string | null;        // Nouvelle référence mappée
  success: boolean;
  error?: string;
}
```

---

## 📊 Exemple Complet

### Scénario

```
Nœud source:      node-abc
linkedVariableIds: ["var-1", "var-2"]

var-1:
  sourceRef: "node-formula:formula-x"
  displayName: "Prix"
  
var-2:
  sourceRef: "condition:cond-y"
  displayName: "Taux"
```

### Après deep copy avec suffixe=1

```
Nœud copié:       node-abc-1
linkedVariableIds: ["var-1-1", "var-2-1"]

var-1-1:
  nodeId: node-abc-1
  sourceRef: "node-formula:formula-x-1"  ← Mappé!
  displayName: "Prix-1"
  
var-2-1:
  nodeId: node-abc-1
  sourceRef: "condition:cond-y-1"  ← Mappé!
  displayName: "Taux-1"

node-abc-1-data-1:  ← Nœud d'affichage
  type: leaf_field
  fieldType: TEXT
  linkedVariableIds: ["var-1-1"]
  label: "Prix-1"

node-abc-1-data-1:  ← Nœud d'affichage (pour var-2)
  type: leaf_field
  fieldType: TEXT
  linkedVariableIds: ["var-2-1"]
  label: "Taux-1"
```

---

## 🔗 Colonnage Bidirectionnel

### Nœud → Capacité

```
TreeBranchLeafNode.linkedFormulaIds ← Contient formula-x-1
LinkedTableIds ← Contient table-t-1
linkedConditionIds ← Contient cond-y-1
linkedVariableIds ← Contient var-1-1, var-2-1
```

### Capacité → Nœud (inverse)

```
TreeBranchLeafNodeFormula (formula-x-1)
  nodeId = node-abc-1
  → node-abc-1.linkedFormulaIds inclut formula-x-1

TreeBranchLeafNodeVariable (var-1-1)
  nodeId = node-abc-1
  sourceRef = "node-formula:formula-x-1"
  → formula-x-1.nodeId = node-abc-1
```

---

## ⚠️ Pièges Courants

### 1. Double Suffixe
❌ **MAUVAIS**
```typescript
const mappedId = formulaIdMap.get(id) || id;
return `${mappedId}-${suffix}`; // Double suffixe!
```

✅ **BON**
```typescript
const mappedId = formulaIdMap.get(id) || id;
return mappedId; // Déjà suffixé dans formulaIdMap!
```

### 2. Oubli du Cache
❌ **MAUVAIS**
```typescript
for (const varId of linkedVarIds) {
  await copyVariableWithCapacities(varId, suffix, ...);
  // Peut copier deux fois la même variable!
}
```

✅ **BON**
```typescript
const variableCopyCache = new Map();
for (const varId of linkedVarIds) {
  await copyVariableWithCapacities(varId, suffix, ..., {
    variableCopyCache // ← Passer le cache!
  });
}
```

### 3. linkedVariableIds Non Initialisé
❌ **MAUVAIS**
```typescript
await prisma.treeBranchLeafNode.create({
  data: {
    // linkedVariableIds: omis!
  }
});
```

✅ **BON**
```typescript
await prisma.treeBranchLeafNode.create({
  data: {
    linkedVariableIds: [], // Initialiser vide
  }
});
// Remplir après création des variables
```

---

## 📋 Checklist de Copie

- [ ] Nœud source a `linkedVariableIds` correctement rempli
- [ ] Suffixe calculé correctement (max + 1)
- [ ] Maps passées (formulaIdMap, conditionIdMap, etc.)
- [ ] Cache de variables utilisé
- [ ] Chaque variable copiée avec ses capacités
- [ ] sourceRef correctement mappé
- [ ] linkedVariableIds mis à jour sur nœud destination
- [ ] Nœuds d'affichage (leaf_field) créés
- [ ] Références bidirectionnelles synchronisées

---

## 🎯 Utilisation Directe (Alternative)

```typescript
import { copyLinkedVariablesFromNode } from './copy-variable-with-capacities.js';

const result = await copyLinkedVariablesFromNode(
  'node-source-id',
  'node-destination-id',
  1, // suffix
  prisma,
  {
    formulaIdMap,
    conditionIdMap,
    tableIdMap,
    nodeIdMap
  }
);

console.log(`${result.count} variables copiées`);
result.variableIdMap.forEach((newId, oldId) => {
  console.log(`  ${oldId} → ${newId}`);
});
```

---

## 🚀 Résumé

Le système fonctionne ainsi :

1. **Phase préparatoire** : Créer nœuds + formules/conditions/tables
2. **Phase copie** : Pour chaque variable liée
   - Lire ID depuis `linkedVariableIds`
   - Appeler `copyVariableWithCapacities()`
   - Fonction récupère variable + identifie capacité
   - Copie variable + applique suffixe
   - Mappe sourceRef si capacité copiée
   - Crée nœud d'affichage
   - Retourne nouvel ID
3. **Phase finalisation** : Mettre à jour `linkedVariableIds` du nœud

**Les champs existent déjà** car créés par le système avec le même ID et suffixe.
**Pas d'action manuelle requise** - tout est automatisé!

