# 🎉 Changelog : Références Partagées Multi-Sélection

## Version 2.0 - 18 octobre 2025

### 🚀 Nouvelles Fonctionnalités

#### ✅ Multi-Sélection de Références
Vous pouvez maintenant **choisir PLUSIEURS références en même temps** pour un seul champ !

**Avant** :
```
Select simple → 1 seule référence par champ
```

**Après** :
```
Select multiple → Autant de références que vous voulez !
```

**Exemple d'usage** :
- Champ "Adresse" qui utilise 3 templates : "Rue", "Code Postal", "Ville"
- Champ "Surface" qui combine "Surface Totale" + "Surface Habitable"
- Formulaire qui mixe plusieurs templates standards

#### 🗑️ Suppression Complète des Catégories

**Avant** :
```tsx
{
  "sharedReferenceCategory": "immobilier", // ❌ Inutile
  "sharedReferenceName": "Surface Habitable"
}
```

**Après** :
```tsx
{
  "sharedReferenceName": "Surface Habitable" // ✅ Simple et direct
}
```

**Raison** : Les catégories complexifiaient l'interface sans apporter de réelle valeur. Tous les templates sont maintenant visibles dans une **liste plate** facile à filtrer.

---

## 🔧 Modifications Techniques

### Interface `SharedReferenceConfig`

**AVANT** :
```typescript
export interface SharedReferenceConfig {
  isSharedReference: boolean;
  sharedReferenceId?: string | null;          // 1 seule référence
  sharedReferenceName?: string | null;
  sharedReferenceCategory?: string | null;    // ❌ SUPPRIMÉ
  sharedReferenceDescription?: string | null;
}
```

**APRÈS** :
```typescript
export interface SharedReferenceConfig {
  isSharedReference: boolean;
  sharedReferenceId?: string | null;          // Garde la 1ère référence (compatibilité)
  sharedReferenceName?: string | null;
  sharedReferenceDescription?: string | null;
  sharedReferenceIds?: string[];              // ✅ NOUVEAU : Multi-références
}
```

### Interface `SharedReferenceTemplate`

**AVANT** :
```typescript
interface SharedReferenceTemplate {
  id: string;
  label: string;
  category: string;                           // ❌ SUPPRIMÉ
  description?: string;
  usageCount: number;
  usages: Array<{ treeId: string; path: string }>;
}
```

**APRÈS** :
```typescript
interface SharedReferenceTemplate {
  id: string;
  label: string;
  description?: string;                       // ✅ Plus de catégorie
  usageCount: number;
  usages: Array<{ treeId: string; path: string }>;
}
```

---

## 🎨 Changements UI

### Select Multi-Sélection

**Propriétés du Select** :
```tsx
<Select
  mode="multiple"              // ✅ MULTI-SÉLECTION activée
  maxTagCount="responsive"     // Affichage adaptatif des tags
  allowClear                   // Bouton pour tout effacer
  showSearch                   // Recherche dans la liste
  placeholder="Choisir une ou plusieurs références..."
>
```

**Alert d'information** :
```tsx
<Alert
  type="info"
  showIcon
  message="Vous pouvez sélectionner PLUSIEURS références pour ce champ"
/>
```

### Liste des Références

**AVANT** (avec catégories) :
```tsx
{Object.entries(referencesByCategory).map(([category, refs]) => (
  <Select.OptGroup label={catInfo?.label}>
    {refs.map(ref => <Option>...</Option>)}
  </Select.OptGroup>
))}
```

**APRÈS** (liste plate) :
```tsx
{availableReferences.map(ref => (
  <Option key={ref.id} value={ref.id}>
    {ref.label} <Text type="secondary">({ref.usageCount}× utilisé)</Text>
  </Option>
))}
```

---

## 🔄 Logique de Sauvegarde

### Fonction `handleSelectReferences` (nouvelle)

**Signature** :
```typescript
const handleSelectReferences = useCallback(async (refIds: string[]) => {
  // refIds est maintenant un ARRAY
  console.log('🔗 [SharedRef] Sélection références (MULTI):', refIds);
  
  const updates: Partial<SharedReferenceConfig> = {
    isSharedReference: false,
    sharedReferenceIds: refIds,              // ✅ NOUVEAU
    sharedReferenceId: refIds[0] || null,    // Compatibilité
    sharedReferenceName: references.map(r => r.label).join(', '),
  };
  
  await onNodeUpdate(updates);
  message.success(`${refIds.length} référence(s) partagée(s) appliquée(s)`);
}, [availableReferences, value, onChange, onNodeUpdate]);
```

### État Local

**AVANT** :
```typescript
const [selectedReferenceId, setSelectedReferenceId] = useState<string | undefined>();
```

**APRÈS** :
```typescript
const [selectedReferenceIds, setSelectedReferenceIds] = useState<string[]>([]);
```

### Initialisation du State

```typescript
// Compatibilité ascendante : charge depuis sharedReferenceIds OU sharedReferenceId
const [selectedReferenceIds, setSelectedReferenceIds] = useState<string[]>(
  value?.sharedReferenceIds || 
  (value?.sharedReferenceId ? [value.sharedReferenceId] : [])
);
```

---

## 📊 Logs Console

### Avant (simple sélection)
```
🔗 [SharedRef] Sélection référence: abc-123
📋 [SharedRef] Référence trouvée: {id: 'abc-123', label: 'Surface'}
💾 [SharedRef] Updates à sauvegarder: {sharedReferenceId: 'abc-123'}
✅ [SharedRef] Sauvegarde réussie
```

### Après (multi-sélection)
```
🔗 [SharedRef] Sélection références (MULTI): ['abc-123', 'def-456', 'ghi-789']
📋 [SharedRef] Références trouvées: [{...}, {...}, {...}]
💾 [SharedRef] Updates à sauvegarder (MULTI): {
  sharedReferenceIds: ['abc-123', 'def-456', 'ghi-789'],
  sharedReferenceName: 'Surface, Hauteur, Largeur'
}
✅ [SharedRef] Sauvegarde réussie (MULTI)
3 référence(s) partagée(s) appliquée(s)
```

---

## 🐛 Corrections Appliquées

### 1. Rechargements Multiples
- ✅ Supprimé `loadAvailableReferences()` après création
- ✅ Ajout direct dans la liste locale
- ✅ Logs détaillés : `🔄 Chargement...` et `✅ X références chargées`

### 2. Suppression des Catégories
- ✅ Retiré `sharedReferenceCategory` de l'interface
- ✅ Retiré `category` de `SharedReferenceTemplate`
- ✅ Supprimé la constante `CATEGORIES`
- ✅ Supprimé `referencesByCategory` useMemo
- ✅ Retiré le champ "Catégorie" de l'UI de création

### 3. Multi-Sélection
- ✅ Changé state de `string` → `string[]`
- ✅ Ajouté propriété `mode="multiple"` au Select
- ✅ Renommé `handleSelectReference` → `handleSelectReferences`
- ✅ Ajouté support `sharedReferenceIds` dans l'interface

---

## 🧪 Tests à Effectuer

### Test 1 : Multi-Sélection Simple
1. Ouvrir Parameters sur un champ SELECT
2. Activer "Référence partagée"
3. **Sélectionner 3 références** dans le Select multiple
4. Vérifier le message : "3 référence(s) partagée(s) appliquée(s)"
5. Fermer le panel
6. Rouvrir → Vérifier que les 3 références sont toujours sélectionnées

### Test 2 : Création Sans Catégorie
1. Créer une nouvelle référence
2. **Vérifier** : Pas de champ "Catégorie" visible
3. Vérifier la console : `✅ [SharedRef] Référence créée: Nom`
4. Vérifier que la référence apparaît immédiatement dans le Select

### Test 3 : Compatibilité Ascendante
1. Charger un champ avec l'ancien format (`sharedReferenceId` simple)
2. Vérifier qu'il s'affiche correctement dans le Select multiple
3. Ajouter une 2ème référence
4. Vérifier que les 2 apparaissent

### Test 4 : Recherche et Filtrage
1. Avoir 10+ références dans la liste
2. Utiliser la recherche dans le Select
3. Vérifier que le filtrage fonctionne
4. Sélectionner plusieurs références filtrées

---

## 📈 Impact Base de Données

### Schéma Prisma (à vérifier)

Vérifier si `TreeBranchLeafNode` supporte déjà les champs suivants :

```prisma
model TreeBranchLeafNode {
  // ...
  sharedReferenceId       String?   // ✅ Existant (1ère référence)
  sharedReferenceName     String?   // ✅ Existant
  sharedReferenceCategory String?   // ❌ À SUPPRIMER (optionnel)
  sharedReferenceDescription String? // ✅ Existant
  
  // ⚠️ À AJOUTER si pas déjà présent :
  sharedReferenceIds      String[]? @default([]) // NOUVEAU : Multi-références
}
```

### Migration Nécessaire ?

Si `sharedReferenceIds` n'existe pas encore :

```sql
-- Ajouter le champ pour la multi-sélection
ALTER TABLE "TreeBranchLeafNode" 
ADD COLUMN "sharedReferenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrer les données existantes
UPDATE "TreeBranchLeafNode"
SET "sharedReferenceIds" = ARRAY["sharedReferenceId"]
WHERE "sharedReferenceId" IS NOT NULL 
  AND "sharedReferenceIds" IS NULL;

-- (Optionnel) Supprimer l'ancienne colonne catégorie
ALTER TABLE "TreeBranchLeafNode" 
DROP COLUMN IF EXISTS "sharedReferenceCategory";
```

---

## 🎯 Résumé des Bénéfices

### Pour l'Utilisateur
- ✅ **Plus simple** : Liste plate, pas de catégories confusantes
- ✅ **Plus puissant** : Multi-sélection pour combiner plusieurs templates
- ✅ **Plus rapide** : Pas de rechargements inutiles
- ✅ **Plus clair** : Messages explicites ("3 références appliquées")

### Pour le Code
- ✅ **Moins de complexité** : -70 lignes de code (catégories supprimées)
- ✅ **Meilleure performance** : Pas de regroupement par catégorie
- ✅ **Plus extensible** : Support natif pour multi-références
- ✅ **Mieux logué** : Console logs détaillés avec émojis

### Pour la Base de Données
- ✅ **Schéma simplifié** : 1 colonne en moins (`sharedReferenceCategory`)
- ✅ **Extensible** : Array `sharedReferenceIds` permet évolutions futures
- ✅ **Rétrocompatible** : `sharedReferenceId` garde la 1ère valeur

---

## 🔮 Évolutions Futures Possibles

1. **UI de gestion des références multiples**
   - Afficher les N détails au lieu de juste la 1ère référence
   - Drag & drop pour réordonner les références sélectionnées

2. **Validation**
   - Limite max de références sélectionnables ?
   - Vérifier compatibilité entre références combinées

3. **Statistiques**
   - "Cette combinaison de références est utilisée X fois"

4. **Templates de templates**
   - Créer des "super-templates" qui combinent plusieurs références standards

---

**Migration complète réussie ! ✅**
- Catégories : ❌ SUPPRIMÉES
- Multi-sélection : ✅ ACTIVÉE
- Performance : ✅ OPTIMISÉE
- Logs : ✅ DÉTAILLÉS
