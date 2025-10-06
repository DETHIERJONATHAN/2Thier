# 🔥 PLAN D'INTÉGRATION DU SYSTÈME UNIVERSEL

## 🚨 PROBLÈME ACTUEL

**Ligne 7220-7245** dans `treebranchleaf-routes.ts` :

```typescript
if (isVar && (row.sourceRef || meta?.sourceRef)) {
  const parsed = parseSourceRef(row.sourceRef || meta?.sourceRef || null);
  if (parsed?.type === 'condition') {
    // ❌ Calcul INCOMPLET - ne fait que buildResolvedRefs
    const rec = await tx.treeBranchLeafNodeCondition.findUnique({...});
    const ids = extractNodeIdsFromConditionSet(rec?.conditionSet);
    const refs = buildResolvedRefs(ids, labelMap, valuesMapTxAll);
    const human = `${display}`;
    opRes = { type: 'condition', label: display, value: valueStr, ... };
  } else if (parsed?.type === 'formula') {
    // ❌ Ne calcule PAS la formule !
  } else if (parsed?.type === 'table') {
    // ❌ Ne fait PAS le lookup !
  }
}
```

### ❌ Ce qui manque :

1. **Condition** : Ne calcule pas récursivement (ALORS→Formule)
2. **Formule** : Ne calcule PAS les tokens (`@value.xxx / @value.yyy`)
3. **Table** : Ne fait PAS le lookup (row × column)

---

## ✅ SOLUTION : Utiliser evaluateVariableOperation()

### 📍 LOCALISATION DU CODE À REMPLACER

**Fichier** : `src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts`

**Ligne** : ~7220-7245

**Section** : `PUT /api/treebranchleaf/submissions/:id` → boucle `for (const row of rowsNeeding)`

---

## 🔧 CODE À AJOUTER

### 1️⃣ REMPLACER le bloc if (isVar && sourceRef)

**AVANT (lignes 7220-7245)** :
```typescript
if (isVar && (row.sourceRef || meta?.sourceRef)) {
  const parsed = parseSourceRef(row.sourceRef || meta?.sourceRef || null);
  if (parsed?.type === 'condition') {
    const rec = await tx.treeBranchLeafNodeCondition.findUnique(...);
    // etc - CODE INCOMPLET
  } else if (parsed?.type === 'formula') {
    // CODE INCOMPLET
  } else if (parsed?.type === 'table') {
    // CODE INCOMPLET
  }
}
```

**APRÈS** :
```typescript
if (isVar && (row.sourceRef || meta?.sourceRef)) {
  // ═══════════════════════════════════════════════════════════════════
  // 🎯 NOUVEAU : Utiliser le système universel d'interprétation
  // ═══════════════════════════════════════════════════════════════════
  try {
    console.log(`[UNIVERSAL] 🔄 Évaluation de la variable: ${row.nodeId}`);
    
    // Appeler le système universel
    const evaluation = await evaluateVariableOperation(
      row.nodeId,
      id, // submissionId
      tx as any // Utiliser la transaction Prisma
    );
    
    console.log(`[UNIVERSAL] ✅ Résultat: ${evaluation.value}`);
    
    // Utiliser le résultat du système universel
    opRes = {
      type: evaluation.operationSource,
      label: display,
      value: evaluation.value,
      unit: meta?.unit || null,
      details: evaluation.operationDetail,
      text: evaluation.operationResult
    };
    
    // Mettre à jour la valeur calculée
    valueStr = evaluation.value;
    
  } catch (error) {
    console.error(`[UNIVERSAL] ❌ Erreur évaluation variable ${row.nodeId}:`, error);
    
    // Fallback vers l'ancien système en cas d'erreur
    const parsed = parseSourceRef(row.sourceRef || meta?.sourceRef || null);
    if (parsed?.type === 'condition') {
      const rec = await tx.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { conditionSet: true } });
      const ids = extractNodeIdsFromConditionSet(rec?.conditionSet);
      const refs = buildResolvedRefs(ids, labelMap, valuesMapTxAll);
      const human = `${display}`;
      opRes = { type: 'condition', label: display, value: valueStr, unit: meta?.unit || null, refs, text: buildResultText(human, valueStr, meta?.unit || null) } as const;
    } else if (parsed?.type === 'formula') {
      const rec = await tx.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { tokens: true } });
      const ids = extractNodeIdsFromTokens(rec?.tokens);
      const refs = buildResolvedRefs(ids, labelMap, valuesMapTxAll);
      const human = `${display}`;
      opRes = { type: 'formula', label: display, value: valueStr, unit: meta?.unit || null, refs, text: buildResultText(human, valueStr, meta?.unit || null) } as const;
    } else if (parsed?.type === 'table') {
      const rec = await tx.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } });
      const str = JSON.stringify(rec);
      const ids = new Set<string>();
      if (str) { let m: RegExpExecArray | null; const re = /@value\.([a-f0-9-]{36})/gi; while ((m = re.exec(str)) !== null) ids.add(m[1]); }
      const refs = buildResolvedRefs(ids, labelMap, valuesMapTxAll);
      const human = `${display}`;
      opRes = { type: 'table', label: display, value: valueStr, unit: meta?.unit || null, refs, text: buildResultText(human, valueStr, meta?.unit || null) } as const;
    }
  }
}
```

---

## 🔍 CE QUI VA CHANGER

### Avant (ancien système) :
```
Si Prix Kw/h = est vide; Alors Calcul du prix Kw/h (1744); Sinon Prix Kw/h (aucune donnée)
```
❌ **Problèmes** :
- "Calcul du prix Kw/h (1744)" → Nom de champ, PAS une formule calculée !
- "Sinon Prix Kw/h (aucune donnée)" → Valeur pas lue correctement !

### Après (système universel) :
```
Si Prix Kw/h(1750) est vide; SINON: Prix Kw/h(1750) (=) Result (1750)
```
✅ **Améliorations** :
- Détecte que ALORS contient une **FORMULE** (pas juste un label)
- Calcule la formule : `(Calcul du prix Kw/h) / (Consommation annuelle)`
- Lit correctement la valeur du champ dans SINON
- Retourne la VRAIE valeur calculée/lue

---

## 📋 CHECKLIST D'INTÉGRATION

- [ ] 1. Remplacer le bloc lignes 7220-7245
- [ ] 2. Tester avec une condition (ALORS → Formule)
- [ ] 3. Tester avec une formule simple
- [ ] 4. Tester avec une table (lookup)
- [ ] 5. Vérifier les logs `[UNIVERSAL]` dans la console
- [ ] 6. Vérifier que `operationResult` contient le bon texte
- [ ] 7. Vérifier que `value` contient la bonne valeur calculée

---

## 🧪 TEST APRÈS INTÉGRATION

### Commande :
```bash
# Recharger la page du formulaire
# Remplir "Consommation annuelle" : 5101
# Remplir "Calcul du prix Kw/h - Champ" : 1744
# Ne PAS remplir "Prix Kw/h"
# Cliquer sur "Sauvegarder"
```

### Résultat attendu :
```
Prix Kw/h test: 0.34
```

**Calcul** : `1744 / 5101 = 0.3417...`

### Dans Prisma (operationResult) :
```
Si Prix Kw/h(∅) est vide; ALORS: Calcul du prix Kw/h(1744)/Consommation annuelle(5101) = 0.34
```

---

## 🎯 IMPACT

✅ **Toutes les variables** seront maintenant calculées avec le système universel !
✅ **Récursion complète** : Condition → Formule → Table → etc.
✅ **Traçabilité** : Texte explicatif en français
✅ **Performance** : Cache intelligent

---

## 📝 NOTES

- Le fallback vers l'ancien système est conservé en cas d'erreur
- Les logs `[UNIVERSAL]` permettent de tracer l'exécution
- Le système universel utilise la même transaction Prisma (`tx`)
- Compatible avec l'ancienne API (pas de breaking change)
