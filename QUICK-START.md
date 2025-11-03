# ⚡ QUICK START - Système de Copie de Variables Liées

## TL;DR

✅ **C'est fait!** La copie de variables liées fonctionne automatiquement quand tu copies un nœud.

```bash
POST /api/nodes/mon-nœud/deep-copy
```

→ Tout se passe automatiquement!

---

## 🎯 Qu'est-ce qui se passe

Quand tu copies un nœud avec `linkedVariableIds`:

1. **Nœud copié** avec nouveau ID suffixé
2. **Variables copiées** avec nouveau ID suffixé
3. **Capacités copiées** (formules/conditions/tables)
4. **sourceRef mis à jour** pour pointer vers les nouvelles capacités
5. **Nœuds d'affichage créés** pour visualiser les variables
6. **Références synchronisées** dans les deux sens

**Aucune action manuelle!**

---

## 📁 Fichiers Importants

```
src/components/TreeBranchLeaf/treebranchleaf-new/api/
├─ copy-variable-with-capacities.ts  ← Fonction principale
├─ treebranchleaf-routes.ts           ← Intégration
└─ operation-interpreter.ts           ← Utilise les variables
```

---

## 🔍 Vérifier que ça Marche

### En Base de Données

```sql
-- Avant copie
SELECT linkedVariableIds FROM TreeBranchLeafNode WHERE id = 'mon-nœud';

-- Après copie (cherche mon-nœud-1)
SELECT linkedVariableIds FROM TreeBranchLeafNode WHERE id = 'mon-nœud-1';

-- Vérifier les variables copiées
SELECT id, displayName, sourceRef FROM TreeBranchLeafNodeVariable WHERE id LIKE 'var-id-%';
```

### Dans les Logs

Cherche `[DEEP-COPY]`:
```
🔗 [DEEP-COPY] Copie 2 variable(s) pour nœud ...
  ✅ [DEEP-COPY] Variable copiée: var-1-1 (type: formula)
  ✅ [DEEP-COPY] Variable copiée: var-2-1 (type: condition)
✅ [DEEP-COPY] Nœud ... mis à jour - linkedVariableIds: 2
```

---

## 📊 Exemple Concret

### AVANT
```
Nœud: form-abc
├─ linkedVariableIds: ["var-price"]
│  ├─ displayName: "Prix"
│  └─ sourceRef: "node-formula:formula-total"
└─ Formula: formula-total
   └─ tokens: ["@value.qty", "*", "@value.unit_price"]
```

### APRÈS Copie
```
Nœud: form-abc-1
├─ linkedVariableIds: ["var-price-1"]  ← Mis à jour!
│  ├─ displayName: "Prix-1"
│  └─ sourceRef: "node-formula:formula-total-1"  ← Mappé!
├─ Formula: formula-total-1
│  └─ tokens: ["@value.qty-1", "*", "@value.unit_price-1"]  ← Mis à jour!
└─ Display Node: form-abc-1-data-1
   ├─ type: leaf_field
   └─ label: "Prix-1"
```

**Clé d'or**: Tous les IDs suffixés avec `-1`, sourceRef mappés! ✨

---

## 🚀 Cas d'Usage Courants

### Copie Simple
```bash
curl -X POST http://localhost:3000/api/nodes/mon-nœud/deep-copy
```

### Avec Parent Custom
```bash
curl -X POST http://localhost:3000/api/nodes/mon-nœud/deep-copy \
  -H "Content-Type: application/json" \
  -d '{"targetParentId": "autre-parent"}'
```

### Avec Suffixe Custom (en label)
```bash
curl -X POST http://localhost:3000/api/nodes/mon-nœud/deep-copy \
  -H "Content-Type: application/json" \
  -d '{"labelSuffix": " (copie)"}'
```

---

## ⚠️ Pièges à Éviter

### ❌ Mauvais
```typescript
// Ne pas oublier de passer les maps!
await copyVariableWithCapacities(varId, suffix, nodeId, prisma);
// → sourceRef non mappé!
```

### ✅ Bon
```typescript
// Passer les maps pour mapping automatique
await copyVariableWithCapacities(varId, suffix, nodeId, prisma, {
  formulaIdMap,
  conditionIdMap,
  tableIdMap,
  nodeIdMap
});
// → sourceRef correctement mappé!
```

---

## 🧪 Tests Rapides

### Test 1: Variable Seule
```
setup: Nœud avec 1 variable (sourceRef=null)
copy: Deep copy
check: Variable-1 existe, sourceRef toujours null ✓
```

### Test 2: Variable + Formule
```
setup: Nœud avec 1 variable + 1 formule, sourceRef pointe formule
copy: Deep copy
check: Variable-1 + Formula-1 existent, sourceRef mappé ✓
```

### Test 3: Multiple Variables
```
setup: Nœud avec 3 variables (types différents)
copy: Deep copy
check: 3 variables copiées, linkedVariableIds a 3 entrées ✓
```

---

## 📖 Pour Plus d'Infos

| Document | Utilité |
|----------|---------|
| `README-IMPLEMENTATION.md` | Vue d'ensemble complète |
| `COPIE-VARIABLES-SYSTEME.md` | Architecture détaillée |
| `SOLUTION-TECHNIQUE-RESUME.md` | Implémentation technique |
| `GUIDE-UTILISATION-COPIE.md` | Guide pratique + troubleshooting |

---

## 🎯 Résumé

```
linkedVariableIds lus ✓
Variables copiées ✓
Capacités copiées ✓
sourceRef mappés ✓
Nœuds d'affichage créés ✓
Références synchronisées ✓

= Système Opérationnel! 🚀
```

---

## 🔧 Debug Rapide

Si ça ne marche pas:

1. **Vérifier logs** (chercher `[DEEP-COPY]`)
2. **Vérifier DB** (linkedVariableIds rempli?)
3. **Vérifier sourceRef** (mappé correctement?)
4. **Vérifier maps** (formulaIdMap rempli?)

99% des problèmes: sourceRef non mappé car maps non passées!

---

## ✨ Bonus

La fonction peut aussi être utilisée directement:

```typescript
import { copyLinkedVariablesFromNode } from './copy-variable-with-capacities';

const result = await copyLinkedVariablesFromNode(
  'source-node',
  'dest-node',
  1, // suffix
  prisma,
  { formulaIdMap, conditionIdMap, tableIdMap, nodeIdMap }
);

console.log(`Copiées: ${result.count}`);
```

---

**C'est prêt! Tu peux copier tes nœuds! 🎉**

