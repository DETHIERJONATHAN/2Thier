# 🔁 Système de Duplication Physique des Templates Repeater

## ✅ Implémentation Terminée

### 📌 Résumé
Le système permet maintenant de **dupliquer physiquement** les templates sélectionnés dans un repeater. Quand vous sélectionnez des champs comme templates, ils sont **clonés dans la base de données** comme enfants réels du nœud repeater.

---

## 🏗️ Architecture

### 1. Backend - Nouvel Endpoint API
**Fichier**: `src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts`

#### Endpoint créé:
```typescript
POST /api/treebranchleaf/nodes/:nodeId/duplicate-templates
```

**Body**:
```json
{
  "templateNodeIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Fonctionnement**:
1. ✅ Vérifie que le nœud parent existe
2. ✅ Récupère les enfants existants pour éviter les doublons
3. ✅ Filtre les templates déjà dupliqués (via `metadata.sourceTemplateId`)
4. ✅ Clone chaque nouveau template avec TOUTES ses propriétés:
   - Type, subType, fieldType
   - Toutes les colonnes de configuration (`text_*`, `number_*`, `date_*`, etc.)
   - Capacités (hasData, hasFormula, etc.)
   - Métadonnées + traçabilité
5. ✅ Génère un nouveau label: `{original} (Copie {n})`
6. ✅ Définit `parentId` = ID du repeater
7. ✅ Ajoute des métadonnées de traçabilité:
   ```typescript
   metadata: {
     ...templateMetadata,
     sourceTemplateId: "uuid-template-original",
     duplicatedAt: "2025-10-16T...",
     duplicatedFromRepeater: "uuid-repeater-parent"
   }
   ```

**Réponse**:
```json
{
  "duplicated": [
    { "id": "new-uuid-1", "label": "Photo du coffret (Copie 1)", "type": "leaf_field", "parentId": "repeater-id" }
  ],
  "count": 1
}
```

---

### 2. Frontend - Hook de Duplication Automatique
**Fichier**: `src/components/TreeBranchLeaf/treebranchleaf-new/components/Parameters/Parameters.tsx`

#### Fonction ajoutée:
```typescript
const duplicateTemplatesPhysically = useCallback(async (templateNodeIds: string[]) => {
  const response = await api.post(
    `/api/treebranchleaf/nodes/${selectedNode.id}/duplicate-templates`,
    { templateNodeIds }
  );
  
  // Rafraîchir l'arbre
  if (typeof refreshTree === 'function') {
    refreshTree();
  }
}, [selectedNode, api]);
```

#### Intégration dans `commitRepeaterMetadata`:
```typescript
patchNode({ metadata: nextMetadata });

// 🔁 DUPLICATION PHYSIQUE automatique
if (merged.templateNodeIds && merged.templateNodeIds.length > 0) {
  duplicateTemplatesPhysically(merged.templateNodeIds);
}
```

**Quand est-ce déclenché?**
- ✅ Chaque fois que l'utilisateur sélectionne/modifie les templates dans le panneau Repeater
- ✅ Automatiquement après la sauvegarde des métadonnées

---

## 🔄 Flux Complet

### Scénario: Ajouter "Photo du coffret" comme template

1. **Utilisateur sélectionne "Photo du coffret" dans le sélecteur de templates**
   - Interface: Panneau Parameters → Section Repeater

2. **Frontend appelle `commitRepeaterMetadata`**
   ```typescript
   commitRepeaterMetadata({ 
     templateNodeIds: ["node_1757366229488_11zb2np7n"] 
   })
   ```

3. **Sauvegarde des métadonnées**
   ```typescript
   patchNode({ 
     metadata: { 
       repeater: { 
         templateNodeIds: ["node_1757366229488_11zb2np7n"] 
       } 
     } 
   })
   ```

4. **Duplication physique automatique**
   ```typescript
   POST /api/treebranchleaf/nodes/{repeaterId}/duplicate-templates
   Body: { templateNodeIds: ["node_1757366229488_11zb2np7n"] }
   ```

5. **Backend vérifie et clone**
   - Vérifie si déjà dupliqué → NON
   - Récupère le nœud "Photo du coffret"
   - Crée une copie avec:
     - Nouveau UUID
     - Label: "Photo du coffret (Copie 1)"
     - `parentId` = ID du repeater
     - Toutes les propriétés du template

6. **Résultat en base de données**
   ```
   Bloc 1 (repeater)
   └── Photo du coffret (Copie 1)  ← ENFANT PHYSIQUE
   └── Compteur (Copie 1)           ← ENFANT PHYSIQUE
   └── Autre template (Copie 1)    ← ENFANT PHYSIQUE
   ```

7. **Frontend rafraîchit l'arbre**
   - Les nouveaux enfants apparaissent dans l'arborescence
   - Ils sont utilisables comme des champs normaux

---

## 🛡️ Sécurité Anti-Doublons

### Système de Traçabilité
Chaque copie stocke l'ID du template source:

```typescript
metadata: {
  sourceTemplateId: "uuid-template-original",
  duplicatedAt: "2025-10-16T10:30:00Z",
  duplicatedFromRepeater: "uuid-repeater-parent"
}
```

### Détection des Doublons
```typescript
const alreadyDuplicatedTemplateIds = new Set(
  existingChildren
    .map(child => child.metadata?.sourceTemplateId)
    .filter(Boolean)
);

const newTemplateIds = templateNodeIds.filter(
  id => !alreadyDuplicatedTemplateIds.has(id)
);
```

**Si déjà dupliqué**:
```json
{
  "duplicated": [],
  "message": "Tous les templates sont déjà dupliqués"
}
```

---

## 🎯 Avantages du Système

### ✅ Ce qui fonctionne maintenant

1. **Nœuds Physiques Réels**
   - UUID valide dans la base
   - Relations parent-child correctes
   - Pas d'IDs composites virtuels

2. **Réutilisabilité Totale**
   - Les copies peuvent être référencées dans les formules
   - Utilisables dans les conditions
   - Affichables dans le sélecteur de champs

3. **Pas de 404**
   - Fini les erreurs `GET /nodes/parentId_0_templateId`
   - TokenChip peut charger les nœuds normalement

4. **Compatibilité Arrière**
   - Le système de virtualisation existe toujours
   - Les métadonnées `repeater_templateNodeIds` sont préservées
   - Aucune rupture avec l'existant

5. **Incrémentation Intelligente**
   - Copie 1, Copie 2, Copie 3...
   - Basé sur le comptage des enfants existants

6. **Protection des Données**
   - Les anciennes copies ne sont JAMAIS supprimées
   - Ajout uniquement des nouveaux templates

---

## 🔮 Comportement Attendu

### Cas d'Usage 1: Première Sélection
```
Template sélectionné: ["Photo du coffret"]
Enfants existants: []
→ Crée: "Photo du coffret (Copie 1)"
```

### Cas d'Usage 2: Ajout de Templates
```
Templates sélectionnés: ["Photo du coffret", "Compteur", "Puissance"]
Enfants existants: ["Photo du coffret (Copie 1)"]
→ Crée: "Compteur (Copie 1)", "Puissance (Copie 1)"
→ Ignore: "Photo du coffret" (déjà dupliqué)
```

### Cas d'Usage 3: Re-sélection
```
Templates sélectionnés: ["Photo du coffret"]
Enfants existants: ["Photo du coffret (Copie 1)"]
→ Aucune action (déjà existant)
→ Message: "Tous les templates sont déjà dupliqués"
```

---

## 📊 Logs de Debugging

### Backend
```
🔁 [DUPLICATE-TEMPLATES] Duplication des templates: { nodeId: '...', templateNodeIds: [...] }
🔍 [DUPLICATE-TEMPLATES] Templates déjà dupliqués: [...]
🆕 [DUPLICATE-TEMPLATES] Nouveaux templates à dupliquer: [...]
✅ [DUPLICATE-TEMPLATES] Template "Photo du coffret" dupliqué → "Photo du coffret (Copie 1)" (uuid)
🎉 [DUPLICATE-TEMPLATES] 3 nœuds dupliqués avec succès
```

### Frontend
```
🔁 [duplicateTemplatesPhysically] Début duplication: [...]
✅ [duplicateTemplatesPhysically] Duplication réussie: { duplicated: [...], count: 3 }
```

---

## 🧪 Test Manuel

### Étapes pour tester:

1. **Ouvrir l'éditeur TreeBranchLeaf**
   - Sélectionner un arbre de formulaire

2. **Créer/Sélectionner un nœud repeater**
   - Type: `leaf_repeater`
   - Label: "Bloc 1"

3. **Ouvrir le panneau Parameters**
   - Onglet "Field Appearance"
   - Section "Repeater Configuration"

4. **Sélectionner des templates**
   - Cliquer sur le sélecteur de templates
   - Choisir 2-3 champs (ex: Photo du coffret, Compteur, Puissance)

5. **Vérifier dans l'arborescence**
   - Les nœuds "Photo du coffret (Copie 1)", etc. doivent apparaître
   - Ils doivent être des enfants directs du repeater

6. **Tester la réutilisation**
   - Ouvrir le sélecteur de champs dans une formule
   - Les copies doivent être disponibles
   - Elles doivent avoir des UUIDs valides

---

## 🔧 Maintenance Future

### Si besoin de supprimer des copies:
```typescript
// Les copies ont metadata.sourceTemplateId
// On peut filtrer et supprimer:
const copiesToDelete = children.filter(
  child => child.metadata?.duplicatedFromRepeater === repeaterId
);
```

### Si besoin de re-synchroniser:
```typescript
// Comparer metadata.repeater.templateNodeIds
// avec les enfants ayant metadata.sourceTemplateId
// Supprimer les orphelins, ajouter les manquants
```

---

## 📝 Notes Importantes

1. ⚠️ **Les copies ne sont JAMAIS automatiquement supprimées**
   - Même si vous retirez un template de la sélection
   - Raison: Protection des données utilisateur

2. ⚠️ **Un template peut être dupliqué plusieurs fois**
   - Si l'utilisateur le retire puis le re-sélectionne
   - Chaque duplication crée une nouvelle copie numérotée

3. ⚠️ **Les enfants physiques coexistent avec le système virtuel**
   - Les instances virtuelles (`parentId_0_templateId`) fonctionnent toujours
   - Elles servent pour le rendu des formulaires en runtime
   - Les copies physiques servent pour la réutilisabilité

---

## ✨ Conclusion

Le système est maintenant **dual** :
- **Métadonnées `repeater`** : Configuration et templates de référence
- **Enfants physiques** : Copies concrètes et réutilisables

Cette approche préserve la compatibilité totale avec l'existant tout en ajoutant la puissance de la duplication physique ! 🚀
