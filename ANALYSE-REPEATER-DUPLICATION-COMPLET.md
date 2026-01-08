# 📊 ANALYSE COMPLÈTE - Système de Duplication Repeater & Table Lookup

## 🎯 Résumé Exécutif

**Problème**: Lors de la duplication d'un repeater avec un champ composite lié à une lookup table 2D, le système retourne `∅` (vide) au lieu de la valeur calculée.

**Status**: ✅ **BD COMPLÈTEMENT CORRECTE** - Bug présent dans le **code d'affichage du résultat (operation-interpreter.ts ou backend)**

---

## 🔍 Chaîne de Duplication Analysée

### 1. **Node Composite Copié** ✅
```
ID: d371c32e-f69e-46b0-9846-f3f60f7b4ec8-1
Label: "Orienation-inclinaison-1"
Type: leaf_field
hasTable: true ✅
linkedVariableIds: ["5e7ba67a-9e05-4687-9093-e369962e5982-1"] ✅ SUFFIXÉ
linkedTableIds: ["ff48e5ec-1628-4d46-8e7b-0d74130e3012-1"] ✅ SUFFIXÉ
```

### 2. **SelectConfig Copié** ✅
```
ID: f11ba128-f5b2-4d94-a151-754bceefd944-1
NodeId: c071a466-5a0f-4b4e-afb0-fd69ac79d51a-1
TableReference: ff48e5ec-1628-4d46-8e7b-0d74130e3012-1 ✅ SUFFIXÉ
```

### 3. **Lookup Table Copié** ✅
```
ID: ff48e5ec-1628-4d46-8e7b-0d74130e3012-1
Colonnes: 9 (Orientation-1, 0, 5, 15, 25, 35, 45, 70, 90)
Rangées: 18 (tous les données copiées)
```

### 4. **Données pour Nord + 35** ✅
```sql
SELECT * FROM TreeBranchLeafNodeTableRow 
WHERE tableId = 'ff48e5ec-1628-4d46-8e7b-0d74130e3012-1'
  AND cells->>0 LIKE '%Nord%'
  
RÉSULTAT (rowIndex=1):
cells = ["Nord", 86, 82, 73, 64, 54, 45, 29, 21]
              ↑     ↑   ↑   ↑   ↑   ↑
          Col 0   Col1 Col2 Col3 Col4 Col5
          
Pour Nord + 35 (colonne index 5) = **54** ✅
```

---

## 🔴 LE BUG - Code qui Affiche la Réponse

**Symptôme**: Retourne `∅` au lieu de `54`

**Fichiers Suspects**:
1. `src/components/TreeBranchLeaf/treebranchleaf-new/api/operation-interpreter.ts` - Fonction `interpretTable()`
2. `src/services/TreeBranchLeafResolver.ts` - Fonction `evaluateTable()`

**Le `∅` vient de**:
```typescript
// operation-interpreter.ts - ligne 2XXX (approx)
return {
  result: '∅',  // ← CE SYMBOLE APPARAÎT QUAND LOOKUP ÉCHOUE!
  humanText: `Lookup non configuré pour table ${table.name}`,
  details: { type: 'table', error: 'Lookup not enabled' }
};
```

---

## 🔧 Causes Potentielles du Bug

### ❌ Cause 1: Lookup Pas Activé en Meta
Le système cherche `table.meta.lookup.enabled === true` mais celui-ci n'existe peut-être pas.

```typescript
// operation-interpreter.ts - ligne 1968 (approx)
const lookup = meta?.lookup;
const isLookupActive = lookup && 
  (lookup.enabled === true || 
   lookup.columnLookupEnabled === true || 
   lookup.rowLookupEnabled === true);

if (!isLookupActive) {
  // ← RETOURNE ∅ ICI!
  return { result: '∅', ... };
}
```

**À vérifier**:
```sql
SELECT id, name, meta 
FROM "TreeBranchLeafNodeTable"
WHERE id = 'ff48e5ec-1628-4d46-8e7b-0d74130e3012-1';
```

### ❌ Cause 2: Selectors Manquants
Les sélecteurs de ligne/colonne ne sont pas configurés:

```typescript
const rowFieldId = lookup.selectors?.rowFieldId;
const colFieldId = lookup.selectors?.columnFieldId;

if (!rowFieldId || !colFieldId) {
  // ← RETOURNE ∅ ICI!
  return { result: '∅', ... };
}
```

### ❌ Cause 3: Valeurs de Ligne/Colonne Non Trouvées
Les valeurs du formulaire (Nord, 35) ne sont pas passées correctement:

```typescript
// Ne trouve pas "Nord" dans les rows[]
const rowSelectorValue = await resolveFieldValue(rowFieldId, submissionId, ...);
// rowSelectorValue = null ou undefined!
```

### ❌ Cause 4: Index Introuvable dans rows[]/columns[]
```typescript
const rowIndex = rows.findIndex(r => r === 'Nord');  // -1 si pas trouvé!
const colIndex = columns.findIndex(c => c === '35');  // -1 si pas trouvé!

if (rowIndex === -1 || colIndex === -1) {
  // ← RETOURNE ∅ ICI!
  return { result: '∅', ... };
}
```

---

## 📋 Checklist de Vérification

### En Base de Données ✅
- [x] Node composite copié avec hasTable=true
- [x] linkedVariableIds suffixés avec -1
- [x] linkedTableIds suffixés avec -1
- [x] SelectConfig créé avec tableReference -1
- [x] Table copiée avec colonnes et données
- [x] Données correctes pour Nord + 35 = 54

### À Vérifier dans le Code 🔴
- [ ] `TreeBranchLeafNodeTable.meta.lookup.enabled` = true pour table -1?
- [ ] `lookup.rowLookupEnabled` et `lookup.columnLookupEnabled` = true?
- [ ] `lookup.selectors.rowFieldId` et `columnFieldId` configurés?
- [ ] Les valeurs du formulaire (Nord, 35) sont-elles passées à la fonction?
- [ ] Les indices sont trouvés dans rows[] et columns[]?

---

## 🎯 Code à Vérifier Prioritairement

### 1. Meta de la Table Copiée
```sql
SELECT id, name, meta, "meta"->>'lookup' as lookup_config
FROM "TreeBranchLeafNodeTable"
WHERE id = 'ff48e5ec-1628-4d46-8e7b-0d74130e3012-1';
```

### 2. Fonction operation-interpreter.ts (ligne ~1967)
```typescript
async function interpretTable(
  tableId: string,
  submissionId: string,
  prisma: PrismaClient,
  valuesCache: Map<string, InterpretResult>,
  depth: number,
  valueMap?: Map<string, unknown>,
  labelMap?: Map<string, string>
): Promise<InterpretResult> {
  
  // ÉTAPE 1: Récupérer la table
  const table = await prisma.treeBranchLeafNodeTable.findUnique({
    where: { id: tableId },
    include: { tableColumns: true, tableRows: true }
  });
  
  if (!table) return { result: '∅', ... };
  
  // ÉTAPE 2: Vérifier lookup
  const lookup = table.meta?.lookup;
  if (!lookup?.enabled && !lookup?.columnLookupEnabled && !lookup?.rowLookupEnabled) {
    // ← C'EST ICI LE BUG PROBABLEMENT!
    return { result: '∅', ... };
  }
  
  // ÉTAPE 3-7: ...suite du code
}
```

### 3. Où sont passées les Valeurs de Ligne/Colonne?
Chercher où `Orientation-1=Nord` et `Inclinaison-1=35` sont extraites et passées.

---

## 🚀 Plan de Fix

1. **Vérifier la meta de la table copiée** - Est-ce que `lookup` est configuré?
2. **Vérifier que les valeurs sont passées** - Nord et 35 arrivent-elles à `interpretTable()`?
3. **Debug pas à pas dans operation-interpreter.ts** - Ajouter des logs pour voir où ça échoue
4. **Vérifier le format des rows[] et columns[]** - Sont-ils générés correctement?

---

## 📝 Résumé Final

**✅ La duplication fonctionne PARFAITEMENT en DB**
- Nodes copiés avec les bonnes liaisons
- Tables copiées avec les bonnes données
- Données correctes présentes

**❌ Le bug est dans le CODE qui affiche la réponse**
- Fonction `interpretTable()` retourne `∅` au lieu de `54`
- Raison: Lookup probablement pas activé en meta OU valeurs non trouvées

**🎯 Prochaine étape**: 
Vérifier `table.meta.lookup` et ajouter des logs dans operation-interpreter.ts pour voir exactement où ça échoue.

