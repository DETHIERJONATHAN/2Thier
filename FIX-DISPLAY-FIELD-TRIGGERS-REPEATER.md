# 🎯 FIX: Copie des triggerNodeIds pour Display Fields dans Repeater

**Date:** 27 janvier 2026  
**Problème:** Lors de la duplication d'instances de repeater, les display fields ne copient PAS leurs `triggerNodeIds`  
**Impact:** Les champs d'affichage dupliqués ne se recalculent pas quand leurs champs déclencheurs changent  

---

## 📋 Problème Identifié

### Symptômes

1. **Display field original** (`Orientation-inclinaison`)
   - Type: `DISPLAY` ✅
   - Triggers: `[c071a466-5a0f-4b4e-afb0-fd69ac79d51a, 76a40eb1-a3c5-499f-addb-0ce7fdb4b4c9]` ✅
   - Fonctionne correctement

2. **Display field dupliqué** (`Orientation-inclinaison-1`)
   - Type: `TEXT` ❌ (devrait être `DISPLAY`)
   - Triggers: `[]` ❌ (devrait avoir les triggers suffixés)
   - Ne se recalcule PAS quand on change les valeurs

### Root Cause

Le code de duplication dans `repeat-executor.ts` copie les métadonnées MAIS ne suffixe PAS le champ `triggerNodeIds`. Résultat: les triggers pointent vers les champs originaux au lieu des copies.

```javascript
// AVANT LE FIX (ligne 213):
const updatedMetadata = {
  ...createdMetadata,  // ❌ triggerNodeIds NON suffixé
  sourceTemplateId: template.id,
  // ...
};
```

---

## ✅ Solution Implémentée

### Fichier Modifié

**`src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/repeat-executor.ts`**  
Lines 207-233 (AVANT la mise à jour des métadonnées)

### Code Ajouté

```typescript
// 🎯 CRITIQUE: Suffixer les triggerNodeIds pour les display fields
let suffixedTriggerNodeIds = createdMetadata.triggerNodeIds;
if (Array.isArray(createdMetadata.triggerNodeIds) && createdMetadata.triggerNodeIds.length > 0) {
  const oldTriggers = [...createdMetadata.triggerNodeIds];
  suffixedTriggerNodeIds = createdMetadata.triggerNodeIds.map((triggerId: unknown) => {
    if (typeof triggerId !== 'string') return triggerId;
    
    // Nettoyer l'ID (retirer @value. et {})
    const cleanId = triggerId.replace(/^@value\./, '').replace(/^{/, '').replace(/}$/, '');
    
    // Vérifier si une copie existe déjà dans l'idMap
    if (copyResult.idMap && copyResult.idMap[cleanId]) {
      const newTriggerId = copyResult.idMap[cleanId];
      // Restaurer le format original
      if (triggerId.startsWith('@value.')) return `@value.${newTriggerId}`;
      else if (triggerId.startsWith('{')) return `{${newTriggerId}}`;
      return newTriggerId;
    }
    
    // Sinon, ajouter le suffixe
    const suffixedId = `${cleanId}-${effectiveSuffix}`;
    if (triggerId.startsWith('@value.')) return `@value.${suffixedId}`;
    else if (triggerId.startsWith('{')) return `{${suffixedId}}`;
    return suffixedId;
  });
  
  console.log(`🎯 [REPEAT-EXECUTOR] Suffixe triggers pour ${created.label} (${newRootId}):`, {
    oldTriggers,
    newTriggers: suffixedTriggerNodeIds,
    effectiveSuffix
  });
}

// Ajouter triggerNodeIds dans les métadonnées
const updatedMetadata = {
  ...createdMetadata,
  // ... autres champs
  ...(suffixedTriggerNodeIds ? { triggerNodeIds: suffixedTriggerNodeIds } : {})
};
```

### Formats de Trigger IDs Supportés

Le code gère **3 formats** de trigger IDs:

1. **Plain UUID:** `c071a466-5a0f-4b4e-afb0-fd69ac79d51a` → `c071a466-5a0f-4b4e-afb0-fd69ac79d51a-1`
2. **@value format:** `@value.76a40eb1-a3c5-499f-addb-0ce7fdb4b4c9` → `@value.76a40eb1-a3c5-499f-addb-0ce7fdb4b4c9-1`
3. **Variable format:** `{facture-annuelle}` → `{facture-annuelle-1}`

---

## 🧪 Vérification

### 1. Supprimer l'ancien champ dupliqué

```
1. Ouvrir le formulaire dans l'UI
2. Sélectionner "Orientation-inclinaison-1"
3. Cliquer sur "Supprimer le nœud" (bouton ⚙️ > Supprimer)
4. Confirmer la suppression
```

### 2. Re-dupliquer avec le fix

```
1. Sélectionner "Orientation-inclinaison" (original)
2. Ouvrir le repeater parent (Toiture)
3. Cliquer sur "+" pour dupliquer l'instance
4. Vérifier dans la console backend:
   🎯 [REPEAT-EXECUTOR] Suffixe triggers pour Orientation-inclinaison (...):
   {
     oldTriggers: ["c071a466-...", "76a40eb1-..."],
     newTriggers: ["c071a466-...-1", "76a40eb1-...-1"],
     effectiveSuffix: 1
   }
```

### 3. Vérifier le résultat

**Champ "Orientation-inclinaison-1" doit avoir:**

✅ **Type:** `Affichage (DISPLAY)` (depuis `node.subType`)  
✅ **Triggers:** `["c071a466-5a0f-4b4e-afb0-fd69ac79d51a-1", "76a40eb1-a3c5-499f-addb-0ce7fdb4b4c9-1"]`  
✅ **UI:** Section "⚡ Champs déclencheurs" affiche "Orientation-1" et "Inclinaison-1"  
✅ **Recalcul:** Changer "Orientation-1" → "Orientation-inclinaison-1" se recalcule  

---

## 🔍 Debug

### Console Backend (attendu)

```javascript
🎯 [REPEAT-EXECUTOR] Suffixe triggers pour Orientation-inclinaison (d371c32e-...-1):
{
  oldTriggers: [
    "c071a466-5a0f-4b4e-afb0-fd69ac79d51a",
    "76a40eb1-a3c5-499f-addb-0ce7fdb4b4c9"
  ],
  newTriggers: [
    "c071a466-5a0f-4b4e-afb0-fd69ac79d51a-1",
    "76a40eb1-a3c5-499f-addb-0ce7fdb4b4c9-1"
  ],
  effectiveSuffix: 1
}
```

### Requête DB (vérification manuelle)

```sql
SELECT 
  id, 
  label, 
  "subType",
  metadata->>'triggerNodeIds' as triggers
FROM "TreeBranchLeafNode"
WHERE label = 'Orientation-inclinaison-1';
```

**Résultat attendu:**

| id | label | subType | triggers |
|----|-------|---------|----------|
| `d371c32e-...-1` | `Orientation-inclinaison-1` | `display` | `["c071a466-...-1", "76a40eb1-...-1"]` |

---

## 📝 Notes Importantes

### Différence avec deep-copy-service.ts

⚠️ **Le fix dans `deep-copy-service.ts` (lignes 628-657) ne s'applique PAS aux instances de repeater.**

Ce service est utilisé pour:
- Dupliquer des **templates complets** (arbres entiers)
- Copier des **formulaires** d'un utilisateur à un autre
- Cloner des **structures** complexes

Les **instances de repeater** sont dupliquées par `repeat-executor.ts` → **C'est le bon endroit pour le fix.**

### Type DISPLAY

Le champ `subType: 'display'` est copié automatiquement par `deepCopyNodeInternal()` (ligne 375 de deep-copy-service.ts), donc ce n'est PAS un problème dans repeat-executor.

### Ordre de Priorité pour le Type (Frontend)

```typescript
// Parameters.tsx ligne 1244
const ft = (selectedNode.subType as string | undefined)         // 🥇 PRIORITÉ 1
  || (selectedNode.metadata?.fieldType as string | undefined)  // 🥈 PRIORITÉ 2
  || nodeType?.defaultFieldType                               // 🥉 PRIORITÉ 3
  || selectedNode.type;                                        // 4️⃣ FALLBACK
```

Si `subType` est `'display'`, le champ affiche correctement "💡 Affichage (DISPLAY)" dans l'UI.

---

## ✅ Checklist Validation

- [x] Code modifié dans `repeat-executor.ts`
- [x] Gestion des 3 formats de trigger IDs
- [x] Log de debug ajouté (`🎯 [REPEAT-EXECUTOR]`)
- [x] Copie du `subType` vérifiée (déjà fonctionnel)
- [x] Documentation créée
- [ ] **TEST UTILISATEUR:** Supprimer "-1" et re-dupliquer
- [ ] **VÉRIF:** Console backend montre le log `🎯 [REPEAT-EXECUTOR]`
- [ ] **VÉRIF:** Champ "-1" a type DISPLAY et triggers suffixés
- [ ] **VÉRIF:** Changer trigger → display se recalcule

---

**STATUS:** ✅ **FIX PRÊT**  
**PROCHAINE ÉTAPE:** Supprimer "Orientation-inclinaison-1" et re-dupliquer pour tester
