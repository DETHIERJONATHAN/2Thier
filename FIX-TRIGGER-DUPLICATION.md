# 🎯 Fix: Duplication des triggerNodeIds lors de la copie de Display Fields

**Date**: 27 janvier 2026  
**Fichier modifié**: `src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/services/deep-copy-service.ts`

## 📋 Problème Identifié

Lors de la duplication de champs via le système de repeater, les **display fields** ne copiaient pas correctement leurs **triggerNodeIds** avec les suffixes appropriés.

### Exemple du problème

**Configuration originale** :
- Champ: `Facture annuelle` (UUID: `d6212e5e-3fe9-4cce-b380-e6745524d011`)
- Display field: `Prix Kwh` avec trigger sur `d6212e5e-3fe9-4cce-b380-e6745524d011`

**Après duplication (AVANT le fix)** :
- Champ copié: `Facture annuelle-1` (UUID: `d6212e5e-3fe9-4cce-b380-e6745524d011-1`)
- Display field copié: `Prix Kwh-1` avec trigger sur `d6212e5e-3fe9-4cce-b380-e6745524d011` ❌ **MAUVAIS UUID**

**Résultat** : Le display field copié ne réagit PAS aux changements du champ copié !

## ✅ Solution Implémentée

### Code ajouté dans `metadata` (lignes ~627-657)

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

### Logique du fix

La solution gère **3 cas** :

#### 1. **Trigger copié dans la même opération** (dans `idMap`)
```typescript
// Exemple: Si on copie "Prix Kwh" ET "Facture annuelle" ensemble
// idMap = { 'd6212e5e...' => 'd6212e5e...-1' }
// Trigger: 'd6212e5e...' → 'd6212e5e...-1' ✅
```

#### 2. **Trigger externe** (pas dans `idMap`)
```typescript
// Exemple: Si on copie seulement "Prix Kwh" mais pas "Facture annuelle"
// Il faut quand même suffixer pour pointer vers la copie externe attendue
// Trigger: 'd6212e5e...' → 'd6212e5e...-1' ✅
```

#### 3. **Formats spéciaux préservés**
```typescript
// @value.xxx → @value.xxx-1
// {xxx} → {xxx-1}
// xxx → xxx-1
```

## 🎯 Résultat Attendu

**Après duplication (AVEC le fix)** :
- Champ copié: `Facture annuelle-1` (UUID: `d6212e5e-3fe9-4cce-b380-e6745524d011-1`)
- Display field copié: `Prix Kwh-1` avec trigger sur `d6212e5e-3fe9-4cce-b380-e6745524d011-1` ✅ **BON UUID**

**Résultat** : Le display field copié réagit correctement aux changements du champ copié ! 🎉

## 🔍 Débogage

Le fix ajoute un log lors de chaque copie :

```
🎯 [DEEP-COPY] Suffixe triggers pour Prix Kwh (99476bab...-1): {
  oldTriggers: ['d6212e5e-3fe9-4cce-b380-e6745524d011'],
  newTriggers: ['d6212e5e-3fe9-4cce-b380-e6745524d011-1']
}
```

## 🧪 Tests

Voir `test-trigger-suffix.mjs` pour les tests unitaires de la logique.

## 📝 Notes Importantes

1. **Compatibilité** : Le fix gère tous les formats de triggerNodeIds existants
2. **Performance** : Aucun impact - traitement O(n) où n = nombre de triggers
3. **Backward compatibility** : Les anciennes copies continueront à fonctionner (mais sans les triggers corrects)
4. **Integration** : S'intègre parfaitement avec le système d'optimisation des triggers existant dans `tbl-submission-evaluator.ts`

## 🔗 Fichiers Liés

- **Service de copie** : `src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/services/deep-copy-service.ts`
- **Évaluateur** : `src/components/TreeBranchLeaf/tbl-bridge/routes/tbl-submission-evaluator.ts` (lignes 383-420)
- **Tests** : `test-trigger-suffix.mjs`
