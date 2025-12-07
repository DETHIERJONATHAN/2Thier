# 🎯 FIX REPEATER - DOCUMENTATION

## ❌ LE PROBLÈME

Quand on créait une copie d'un repeater (ex: "Toit" → "Toit-1"), les champs copiés comme "Rampant toiture-1" avaient des problèmes d'affichage:
- Les valeurs affichaient `---` au lieu du vrai nombre
- Les formules et conditions ne recalculaient pas correctement

**RAISON**: Les formules/conditions avaient des références `@value.shared-ref-XYZ` qui n'étaient PAS suffixées avec `-1` lors de la copie.

### Exemple du bug:

**Formule originale (Rampant toiture)**:
```json
tokens: ["@value.shared-ref-1761920215171-5bvime"]
```

**Après copie (AVANT LE FIX - FAUX)**:
```json
tokens: ["@value.shared-ref-1761920215171-5bvime"]  // ❌ Pas de -1
```
→ La formule cherche toujours l'ancienne valeur!

**Après copie (APRÈS LE FIX - CORRECT)**:
```json
tokens: ["@value.shared-ref-1761920215171-5bvime-1"]  // ✅ Avec -1
```
→ La formule pointe vers la nouvelle variable copiée!

---

## ✅ LA SOLUTION

**Fichier modifié**: `src/components/TreeBranchLeaf/treebranchleaf-new/api/copy-capacity-formula.ts`

**Changement**: Dans la fonction `rewriteFormulaTokens()` (lignes 50-100):

### AVANT (BUG):
```typescript
if (nodeId.startsWith('shared-ref-')) {
  console.log(`🔗 [FORMULA-TOKENS] Shared reference préservée: ${nodeId}`);
  return `@value.${nodeId}`;  // ❌ NE PAS MODIFIER
}
```

### APRÈS (FIX):
```typescript
// SUPPRIMÉ - traiter les shared-ref comme les autres références
// 1. Chercher dans la map des nœuds mappés (y compris les shared-ref mappées)
const mappedId = idMap.get(nodeId);
if (mappedId) {
  console.log(`🔄 [FORMULA-TOKENS] Mapping trouvé: ${nodeId} → ${mappedId}`);
  return `@value.${mappedId}`;
}

// 2. Si pas dans la map et qu'on a un suffixe, l'ajouter automatiquement
if (suffix !== undefined) {
  const hasSuffix = /-\d+$/.test(nodeId);
  if (!hasSuffix) {
    console.log(`➕ [FORMULA-TOKENS] Suffixe ajouté: ${nodeId} → ${nodeId}-${suffix}`);
    return `@value.${nodeId}-${suffix}`;  // ✅ AJOUTER LE SUFFIXE
  }
}
```

---

## 🧪 TESTS VALIDÉS

Tous les tests passent:

1. **Test 1**: `@value.shared-ref-1761920215171-5bvime` → `@value.shared-ref-1761920215171-5bvime-1` ✅
2. **Test 2**: Plusieurs références suffixées correctement ✅
3. **Test 3**: Références avec map de mappings fonctionnent ✅
4. **Test 4**: IDs déjà suffixés ne sont pas ré-suffixés ✅

---

## 📊 IMPACT

### Avant le fix:
- ❌ Rampant toiture-1 affiche `---` (valeur non trouvée)
- ❌ Longueur toiture-1 affiche `---` (valeur non trouvée)
- ❌ Orientation - inclinaison-1 manquante du système

### Après le fix:
- ✅ Rampant toiture-1 affiche `9.0000` (valeur correcte)
- ✅ Longueur toiture-1 affiche `8.0000` (valeur correcte)
- ✅ Orientation - inclinaison-1 affiche la valeur correcte
- ✅ Les conditions et formules recalculent correctement

---

## 🔗 FICHIERS CONNEXES

**Qui utilise ce fix**:
- `variable-copy-engine.ts` - Appelle `copyFormulaCapacity()` lors de la copie de variables
- `copy-variable-with-capacities.ts` - Autre point d'appel

**Fichier similaire (déjà correct)**:
- `copy-capacity-condition.ts` - Fait correctement le suffixage des références, pas besoin de fix

**Résultat**:
- Les conditions réecrivent déjà les shared-ref correctement ✅
- Les formules maintenant aussi! ✅

---

## ⚙️ DEPLOYMENT

Le fix est:
1. ✅ Compilé sans erreur (npm run build réussi)
2. ✅ Validé par tests unitaires
3. ✅ Prêt à être déployé

Aucun changement de schéma Prisma nécessaire.

---

## 📝 REMARQUES

- Ce fix corrige le BUG EXACT que l'utilisateur a identifié dans la copie du repeater
- Les shared-ref du repeater DOIVENT être suffixées pour que les formules/conditions pointent vers les bonnes variables
- Le commentaire de ligne 80-82 décrivait "les laisser intactes car partagées" mais c'était FAUX pour le cas des repeater
- Maintenant toutes les références (@value.XXX) sont traitées uniformément, ce qui est la bonne approche

---

**Date du fix**: 2 décembre 2025
**Status**: ✅ COMPLET ET VALIDÉ
