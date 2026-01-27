# 🎯 Fix Complet : Duplication des Display Fields avec Triggers

## Problème Identifié

Quand tu dupliques un champ de type `display` (comme "Orientation-inclinaison"), le champ copié ("Orientation-inclinaison-1") :
- ✅ A le bon type (DISPLAY) 
- ❌ **N'a PAS les champs déclencheurs (triggerNodeIds)**

## Solution Déjà Implémentée

Le code pour copier les `triggerNodeIds` **a déjà été ajouté** dans [deep-copy-service.ts](src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/services/deep-copy-service.ts) lignes ~628-657.

### Code Ajouté

```typescript
// 🎯 CRITIQUE: Suffixer les triggerNodeIds pour les display fields
// Les triggers doivent pointer vers les champs suffixés dans la copie
if (newMeta.triggerNodeIds && Array.isArray(newMeta.triggerNodeIds)) {
  const oldTriggers = [...newMeta.triggerNodeIds];
  newMeta.triggerNodeIds = (newMeta.triggerNodeIds as string[]).map((triggerId: string) => {
    // Extraire l'ID pur si le trigger est au format @value.xxx ou {xxx}
    const cleanId = triggerId.replace(/^@value\./, '').replace(/^{/, '').replace(/}$/, '');
    
    // Si l'ID est dans l'idMap (copié dans cette opération), utiliser le nouvel ID
    if (idMap.has(cleanId)) {
      const newTriggerId = idMap.get(cleanId)!;
      // Restaurer le format original
      if (triggerId.startsWith('@value.')) {
        return `@value.${newTriggerId}`;
      } else if (triggerId.startsWith('{')) {
        return `{${newTriggerId}}`;
      }
      return newTriggerId;
    }
    
    // Si l'ID n'est pas dans idMap, c'est une référence externe → suffixer
    const suffixedId = appendSuffix(cleanId);
    if (triggerId.startsWith('@value.')) {
      return `@value.${suffixedId}`;
    } else if (triggerId.startsWith('{')) {
      return `{${suffixedId}}`;
    }
    return suffixedId;
  });
  console.log(`🎯 [DEEP-COPY] Suffixe triggers pour ${oldNode.label} (${newId}):`, {
    oldTriggers,
    newTriggers: newMeta.triggerNodeIds
  });
}
```

## Pourquoi Ça Ne Marche Pas Encore

**La duplication que tu as faite a probablement été effectuée AVANT que j'ajoute ce code !**

## 🔧 Solution : Refaire la Duplication

### Option 1 : Supprimer et Re-dupliquer (Recommandé)

1. **Supprimer** le champ "Orientation-inclinaison-1" actuel
2. **Re-dupliquer** "Orientation-inclinaison" 
3. Le nouveau "Orientation-inclinaison-1" aura automatiquement :
   - ✅ Type DISPLAY
   - ✅ Champs déclencheurs (Orientation-1, Inclinaison-1)

### Option 2 : Ajouter Manuellement les Triggers

Si tu ne veux pas supprimer, tu peux ajouter manuellement les déclencheurs :

1. Ouvre "Orientation-inclinaison-1"
2. Va dans "⚡ Champs déclencheurs (recalcul)"
3. Clique sur "Sélectionner des champs déclencheurs"
4. Sélectionne "Orientation-1" et "Inclinaison-1"

## 📊 Comment Vérifier que Ça Marche

Après la re-duplication, tu devrais voir dans la console :

```
🎯 [DEEP-COPY] Suffixe triggers pour Orientation-inclinaison (xxx-1): {
  oldTriggers: ['id-orientation', 'id-inclinaison'],
  newTriggers: ['id-orientation-1', 'id-inclinaison-1']
}
```

Et dans l'interface, "Orientation-inclinaison-1" devrait afficher :
- ⚡ Champs déclencheurs (recalcul)
- 🏷️ Orientation-1
- 🏷️ Inclinaison-1

## 🎯 Prochaine Fois

Maintenant que le code est en place, **toutes les futures duplications** de display fields copieront automatiquement les triggers avec les bons suffixes !

---

**Date du fix :** 27 janvier 2026  
**Fichier modifié :** `src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/services/deep-copy-service.ts`  
**Lignes :** 628-657
