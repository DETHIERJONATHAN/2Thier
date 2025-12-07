# ⚡ QUICK REFERENCE - Shared-Ref System

## 🎯 TL;DR - Points Essentiels

### Les Deux Bugs (Maintenant Fixes)

**BUG 1 - Formules**:
- ❌ `tokens: ["@value.shared-ref-1761920215171-5bvime"]` 
- ✅ `tokens: ["@value.shared-ref-1761920215171-5bvime-1"]`
- **Fichier**: `copy-capacity-formula.ts` ligne 50-100
- **Fonction**: `rewriteFormulaTokens()`

**BUG 2 - Conditions**:
- ❌ `nodeIds: ["shared-ref-1761920196832-4f6a2"]`
- ✅ `nodeIds: ["shared-ref-1761920196832-4f6a2-1"]`
- **Fichier**: `copy-capacity-condition.ts` ligne 153-185
- **Fonction**: `mapNodeIdString()`

---

## 🚨 LA RÈGLE PRINCIPALE

**Toutes les références doivent être suffixées avec `-1`, `-2`, etc.**

```
AVANT copie:  @value.shared-ref-XXX
APRÈS copie:  @value.shared-ref-XXX-1  ✅
```

**Les shared-ref ne sont PAS une exception!**

---

## 🔍 Où Chercher les Bugs

### 1. Formules
```typescript
// Chercher dans rewriteFormulaTokens()
if (nodeId.startsWith('shared-ref-')) {
  // ❌ NE PAS FAIRE: return `@value.${nodeId}`;
  // ✅ FAIRE: return `@value.${nodeId}-${suffix}`;
}
```

### 2. Conditions
```typescript
// Chercher dans mapNodeIdString()
const mapNodeIdString = (raw: string): string => {
  // ✅ Cas 0: shared-ref (DOIT ÊTRE PREMIER)
  if (raw.startsWith('shared-ref-')) {
    return suffix !== undefined && !/-\d+$/.test(raw) 
      ? `${raw}-${suffix}` 
      : raw;
  }
  // ... reste du code
};
```

---

## 💾 Fichiers Critiques

| Fichier | Fonction | Suffixe shared-ref? |
|---------|----------|-------------------|
| `copy-capacity-formula.ts` | `rewriteFormulaTokens()` | ✅ Oui (FIXÉ) |
| `copy-capacity-condition.ts` | `mapNodeIdString()` | ✅ Oui (FIXÉ) |
| `copy-capacity-table.ts` | ? | À vérifier |

---

## 🧪 Tests Rapides

### Test 1: Formule
```javascript
// ORIGINAL
tokens: ["@value.shared-ref-1761920215171-5bvime"]

// ATTENDU APRÈS COPIE AVEC SUFFIX=1
tokens: ["@value.shared-ref-1761920215171-5bvime-1"]
```

### Test 2: Condition
```javascript
// ORIGINAL
nodeIds: ["shared-ref-1761920196832-4f6a2"]

// ATTENDU APRÈS COPIE AVEC SUFFIX=1
nodeIds: ["shared-ref-1761920196832-4f6a2-1"]
```

---

## 🛠️ Checklist Avant Deploy

- [ ] `npm run build` réussit
- [ ] `git log` montre les commits
- [ ] Tests passent (`node test-condition-shared-ref.js`, `node validate-shared-ref-fix.js`)
- [ ] Pas de `---` dans les champs copiés
- [ ] Les formules recalculent
- [ ] Les conditions évaluent

---

## 📞 Questions?

Consulte le document complet: `GUIDE_COMPLET_SHARED_REF_SYSTEM.md`

---

**Résumé des Commits**:
1. ✅ Fix repeater shared-ref suffixing in formulas
2. ✅ Fix repeater shared-ref in condition nodeIds
3. ✅ Complete guide documentation
4. ✅ This quick reference

**Status**: 🎉 TOUT FONCTIONNE!
