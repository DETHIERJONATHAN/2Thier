# ✅ FIX: Suffixes manquants dans table_instances lors de la duplication

## 🐛 Problème Identifié

Lors de la duplication d'un nœud via le bouton "repeat" (endpoint `/duplicate-templates`), les clés de `table_instances` ne recevaient pas les suffixes `-1`, `-2`, etc.

**Exemple du problème:**

```javascript
// AVANT (MAUVAIS):
{
  "9bc0622c-b2df-42a2-902c-6d0c6ecac10b": {
    "type": "matrix",
    "tableId": "9bc0622c-b2df-42a2-902c-6d0c6ecac10b"  // ❌ NO SUFFIX
  }
}

// APRÈS (CORRECT):
{
  "9bc0622c-b2df-42a2-902c-6d0c6ecac10b-1": {  // ✅ KEY HAS SUFFIX
    "type": "matrix",
    "tableId": "9bc0622c-b2df-42a2-902c-6d0c6ecac10b-1"  // ✅ VALUE HAS SUFFIX
  }
}
```

## 🔍 Cause Racine

La fonction `deepCopyNodeInternal()` (ligne 1746) peuplait correctement `tableIdMap` lors de la copie profonde, mais:

1. **La fonction ne retournait pas `tableIdMap`** → seulement `idMap`, `formulaIdMap`, `conditionIdMap`
2. À la ligne 1700-1702, le code appelant créait un **nouvel `Map()` VIDE** pour `copySelectorTablesAfterNodeCopy()`
3. Ce `Map` vide était passé à `copyTableCapacity()` (copy-capacity-table.ts:437)
4. `copyTableCapacity()` tentait de mapper les IDs de table via `tableIdMap.has()` et `tableIdMap.get()`
5. Puisque le `Map` était vide, toutes les tentatives échouaient

## ✅ Solution Implémentée

### 1. Modification de la signature de retour (treebranchleaf-routes.ts:1748)

**Avant:**
```typescript
): Promise<{ 
  root: { oldId: string; newId: string };
  idMap: Record<string, string>;
  formulaIdMap: Record<string, string>;
  conditionIdMap: Record<string, string>
}>
```

**Après:**
```typescript
): Promise<{ 
  root: { oldId: string; newId: string };
  idMap: Record<string, string>;
  formulaIdMap: Record<string, string>;
  conditionIdMap: Record<string, string>;
  tableIdMap: Record<string, string>  // ✅ AJOUTÉ
}>
```

### 2. Modification du return statement (treebranchleaf-routes.ts:~2370)

**Avant:**
```typescript
return {
  root: { oldId: source.id, newId: rootNewId },
  idMap: Object.fromEntries(idMap),
  formulaIdMap: Object.fromEntries(formulaIdMap),
  conditionIdMap: Object.fromEntries(conditionIdMap)
};
```

**Après:**
```typescript
return {
  root: { oldId: source.id, newId: rootNewId },
  idMap: Object.fromEntries(idMap),
  formulaIdMap: Object.fromEntries(formulaIdMap),
  conditionIdMap: Object.fromEntries(conditionIdMap),
  tableIdMap: Object.fromEntries(tableIdMap)  // ✅ AJOUTÉ
};
```

### 3. Utilisation du tableIdMap retourné (treebranchleaf-routes.ts:1698-1701)

**Avant:**
```typescript
const selectorCopyOptions = {
  nodeIdMap: result.idMap,
  tableCopyCache: new Map(),
  tableIdMap: new Map()  // ❌ VIDE!
};
```

**Après:**
```typescript
const selectorCopyOptions = {
  nodeIdMap: result.idMap,
  tableCopyCache: new Map(),
  tableIdMap: new Map(Object.entries(result.tableIdMap))  // ✅ PEUPLÉ
};
```

## 🔗 Flux Corrigé

```
1. UI "repeat" button
   ↓
2. POST /nodes/:nodeId/duplicate-templates
   ↓
3. deepCopyNodeInternal()
   - Crée copies profonde des nœuds
   - Peuple tableIdMap ligne 2204 ✅
   ↓
4. Return { idMap, formulaIdMap, conditionIdMap, tableIdMap } ✅
   ↓
5. Caller récupère result.tableIdMap
   ↓
6. selectorCopyOptions contient tableIdMap PEUPLÉ ✅
   ↓
7. copySelectorTablesAfterNodeCopy()
   → copyTableCapacity()
   → tableIdMap.has() TROUVE les mappings ✅
   → Applique les suffixes correctement ✅
```

## 📝 Fichiers Modifiés

1. **treebranchleaf-routes.ts**
   - Ligne 1748: Ajout `tableIdMap` au type de retour
   - Ligne ~2375: Ajout `tableIdMap: Object.fromEntries(tableIdMap)` au return
   - Ligne 1703: Utilisation de `result.tableIdMap` au lieu de `new Map()`

2. **TreeBranchLeafAPIService.ts**
   - Ligne 30-32: Correction d'une syntaxe cassée (bonus fix)

## 🧪 Vérification

Pour vérifier que le fix fonctionne:

1. Accédez à une page avec un nœud qui a des sélecteurs (avec `table_instances`)
2. Cliquez sur le bouton "repeat" pour dupliquer le nœud
3. Ouvrez le DevTools et inspectez les données
4. Vérifiez que dans `table_instances`:
   - Les **clés** ont le suffixe: `"9bc0622c-....-1"` ✅
   - Les **valeurs** `.tableId` ont aussi le suffixe: `"9bc0622c-....-1"` ✅

## 🚀 Déploiement

Le fix est transparent et n'affecte pas les autres appels à `deepCopyNodeInternal()`:
- Les consommateurs existants peuvent ignorer le nouveau `tableIdMap` dans le retour
- Seul le code de duplication de template qui l'utilise en bénéficie

## 📚 Notes Techniques

- La clé `tableIdMap` était créée à **la ligne 1852** mais jamais retournée
- Elle était peuplée à **la ligne 2204** avec `tableIdMap.set(t.id, newTableId)`
- Le bug était une **dissociation** entre où la map était créée et où elle était utilisée
- Le fix reconnecte simplement ces deux points en retournant et réutilisant la map

---

**Status**: ✅ FIXED
**Date**: 2024
**Severity**: 🔴 HIGH (Affecte toutes les duplications de nœuds avec sélecteurs)
**Impact**: Medium duplication logic pathway only
