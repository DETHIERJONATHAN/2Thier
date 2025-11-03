# 🔄 Système de Rafraîchissement Dynamique des Repeaters

## 📋 Résumé

Le système permet maintenant le **rafraîchissement automatique** des repeaters quand l'utilisateur modifie leurs paramètres dans l'interface (taille, affichage, libellé, etc.). Plus besoin de recharger la page manuellement !

---

## 🎯 Problème Résolu

### Avant (❌)
- L'utilisateur modifiait les paramètres d'un repeater (taille, icône, etc.)
- Les changements étaient enregistrés en base de données
- **MAIS** le bouton repeater ne changeait pas dans le formulaire
- Il fallait recharger manuellement la page pour voir les modifications

### Maintenant (✅)
- L'utilisateur modifie les paramètres d'un repeater
- Les changements sont enregistrés en base de données
- **Le bouton repeater se met à jour IMMÉDIATEMENT** dans le formulaire
- Aucune action manuelle requise !

---

## 🏗️ Architecture

### 1. Émission de l'Événement

**Fichier:** `src/components/TreeBranchLeaf/treebranchleaf-new/components/Parameters/Parameters.tsx`

Quand l'utilisateur modifie un paramètre repeater, la fonction `commitRepeaterMetadata` :

1. Enregistre les changements via `patchNode()`
2. Émet un événement `tbl-repeater-updated` :

```typescript
window.dispatchEvent(
  new CustomEvent('tbl-repeater-updated', {
    detail: {
      nodeId: selectedNode.id,
      treeId: selectedNode.tree_id
    }
  })
);
```

### 2. Réception par les Hooks

Les hooks `useTBLDataPrismaComplete` et `useTBLDataHierarchicalFixed` écoutent cet événement :

**Hook Ancien:** `useTBLDataPrismaComplete.ts`
```typescript
useEffect(() => {
  const handleRepeaterUpdate = (event: Event) => {
    const customEvent = event as CustomEvent<{ nodeId: string; treeId: string | number | undefined }>;
    const { treeId: eventTreeId } = customEvent.detail;
    
    // Recharger uniquement si c'est notre arbre
    if (!disabled && eventTreeId && String(eventTreeId) === String(tree_id)) {
      console.log('🔄 [TBL Hook] Paramètres repeater mis à jour, rechargement des données...');
      fetchData(); // ← Recharge automatiquement les données
    }
  };

  window.addEventListener('tbl-repeater-updated', handleRepeaterUpdate);
  return () => window.removeEventListener('tbl-repeater-updated', handleRepeaterUpdate);
}, [fetchData, disabled, tree_id]);
```

**Hook Nouveau:** `useTBLData-hierarchical-fixed.ts`
```typescript
useEffect(() => {
  const handleRepeaterUpdate = (event: Event) => {
    const customEvent = event as CustomEvent<{ nodeId: string; treeId: string | number | undefined }>;
    const { treeId: eventTreeId } = customEvent.detail;
    
    if (!disabled && eventTreeId && String(eventTreeId) === String(tree_id)) {
      console.log('🔄 [TBL Hook FIXED] Paramètres repeater mis à jour, rechargement...');
      fetchData();
    }
  };

  window.addEventListener('tbl-repeater-updated', handleRepeaterUpdate);
  return () => window.removeEventListener('tbl-repeater-updated', handleRepeaterUpdate);
}, [fetchData, disabled, tree_id]);
```

### 3. Rechargement Automatique

1. Le hook détecte l'événement
2. Il vérifie que c'est bien le même `tree_id`
3. Il appelle `fetchData()` pour recharger les données depuis l'API
4. Les nouvelles données sont transformées avec les nouveaux paramètres
5. Le composant TBL se re-rend avec les boutons mis à jour

---

## 🧪 Tests

### Script de Test

**Fichier:** `test-dynamic-repeater.cjs`

Ce script permet de :
- Trouver un repeater dans la base de données
- Modifier ses paramètres (taille, icône)
- Vérifier que les changements sont enregistrés
- Afficher des instructions pour tester dans l'interface

**Utilisation:**
```bash
node test-dynamic-repeater.cjs
```

### Test Manuel dans l'Interface

1. **Ouvrir un arbre** contenant un repeater
2. **Sélectionner le nœud repeater** dans l'arbre
3. **Aller dans Paramètres > Apparence > Repeater**
4. **Modifier un paramètre** (ex: changer "Taille du bouton" de "Très petit" à "Grand")
5. **Observer la console** :
   ```
   🔔 [commitRepeaterMetadata] Événement tbl-repeater-updated émis
   🔄 [TBL Hook] Paramètres repeater mis à jour, rechargement des données...
   ```
6. **Vérifier le formulaire** : Le bouton repeater doit changer immédiatement !

---

## 🔍 Logs de Débogage

Pour suivre le flux, surveillez ces logs dans la console :

| Étape | Log | Fichier |
|-------|-----|---------|
| 1. Sauvegarde | `📝 [commitRepeaterMetadata] METADATA FINALE:` | Parameters.tsx |
| 2. Émission | `🔔 [commitRepeaterMetadata] Événement tbl-repeater-updated émis` | Parameters.tsx |
| 3. Réception | `🔄 [TBL Hook] Paramètres repeater mis à jour, rechargement...` | useTBLDataPrismaComplete.ts |
| 4. Rechargement | `🎯 [TBL API] Fetching tree data for tree_id: ...` | useTBLDataPrismaComplete.ts |
| 5. Transformation | `🔄 [TRANSFORM] Processing node: ...` | useTBLDataPrismaComplete.ts |

---

## 📝 Paramètres Concernés

Tous les paramètres suivants déclenchent le rafraîchissement automatique :

| Paramètre | Base de données | Type | Effet |
|-----------|----------------|------|-------|
| **Libellé du bouton** | `repeater_addButtonLabel` | `String` | Change le texte du bouton |
| **Taille du bouton** | `repeater_buttonSize` | `tiny\|small\|middle\|large` | Change la hauteur (28-48px) |
| **Largeur du bouton** | `repeater_buttonWidth` | `fill\|half\|auto` | Change la largeur |
| **Affichage** | `repeater_iconOnly` | `Boolean` | Affiche uniquement "+" ou "Texte + +" |
| **Min/Max items** | `repeater_minItems`, `repeater_maxItems` | `Integer` | Limites de répétition |

---

## 🎨 Comportements Visuels

### Taille du bouton
```typescript
tiny   → height: 28px (icône 12px)
small  → height: 32px (icône 14px)
middle → height: 40px (icône 16px) [défaut]
large  → height: 48px (icône 20px)
```

### Affichage
```typescript
false → "Ajouter Versant" [+ icon]  // Texte + icône
true  → [+]                          // Icône seule
```

### Largeur
```typescript
fill → width: 100%     [--------]
half → width: 50%      [----]
auto → width: auto     [-]
```

---

## ⚡ Performance

- **Rechargement ciblé** : Seul l'arbre concerné est rechargé (vérification du `tree_id`)
- **Événements légers** : Pas de polling, système événementiel push
- **Cache préservé** : Les données non modifiées restent en cache
- **Listeners propres** : Nettoyage automatique au démontage du composant

---

## 🔧 Maintenance

### Ajouter un nouveau paramètre repeater

Si vous ajoutez un nouveau paramètre (ex: `repeater_buttonColor`) :

1. **Ajouter la colonne en base de données** (migration Prisma)
2. **Mettre à jour le type `RepeaterMetadata`** dans `Parameters.tsx`
3. **Ajouter un champ dans `RepeaterPanel.tsx`**
4. **Le hook de sauvegarde `commitRepeaterMetadata` émettent automatiquement l'événement !**

✅ Pas besoin de modifier le système d'événements, il fonctionne déjà !

### Déboguer un problème de rafraîchissement

Si le rafraîchissement ne fonctionne pas :

1. **Vérifier la console** : Les logs `🔔` et `🔄` doivent apparaître
2. **Vérifier le `tree_id`** : L'événement doit contenir le bon `tree_id`
3. **Vérifier que le hook est actif** : `disabled` doit être `false`
4. **Exécuter le script de test** : `node test-dynamic-repeater.cjs`

---

## 📚 Références

### Fichiers Modifiés

1. **Parameters.tsx** (ligne ~250)
   - Ajout de l'émission de l'événement `tbl-repeater-updated`

2. **useTBLDataPrismaComplete.ts** (ligne ~1930)
   - Ajout du listener `tbl-repeater-updated`

3. **useTBLData-hierarchical-fixed.ts** (ligne ~385)
   - Ajout du listener `tbl-repeater-updated`

### Événements Similaires

Le système utilise le même pattern que :
- `tbl-capability-updated` (capacités de field)
- `TBL_FORM_DATA_CHANGED` (changements de données de formulaire)

---

## ✅ Validation

Le système est fonctionnel si :

✅ Les paramètres se sauvegardent en base de données  
✅ L'événement `tbl-repeater-updated` est émis  
✅ Le hook détecte l'événement et appelle `fetchData()`  
✅ Les boutons repeater se mettent à jour dans le formulaire  
✅ Aucune erreur dans la console  
✅ Le script `test-dynamic-repeater.cjs` s'exécute sans erreur

---

## 🎯 Prochaines Étapes

Ce système de rafraîchissement peut être étendu à :
- Paramètres de section (affichage, couleurs)
- Paramètres de field (validation, formatage)
- Paramètres de tree (configuration globale)

Il suffit de :
1. Émettre un événement custom après `patchNode()`
2. Ajouter un listener dans les hooks TBL
3. Appeler `fetchData()` pour recharger

---

**Date de création:** 2025-01-XX  
**Auteur:** System  
**Version:** 1.0
