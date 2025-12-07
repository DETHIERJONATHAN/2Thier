# 🗺️ GUIDE PRÉCIS DES MODIFICATIONS - LOCALISATIONS EXACTES

## 📍 Fichier 1: variable-copy-engine.ts

**Chemin Complet**: 
```
src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/services/variable-copy-engine.ts
```

---

### 📌 Modification 1A: Template Exclusion Logic

**Localisation**: Environ ligne 560-630  
**Chapitre**: Recherche du display node original  

**Code Avant** (INCORRECT):
```typescript
// ❌ Les templates peuvent être trouvés
const displayNodes = nodes.filter(n => 
  n.linkedVariableIds?.includes(originalVar.id)
);
```

**Code Après** (CORRECT):
```typescript
// ✅ Templates explicitement exclus
const templateIds = new Set(originalVar.linkedVariableIds || []);
const displayNodes = templateIds.size > 0
  ? nodes.filter(n => 
      !templateIds.has(n.id)  // ← EXCLUSION CRITIQUE
      && n.linkedVariableIds?.includes(originalVar.id)
    )
  : [];
```

**Commentaire Ajouté**: 25 lignes explicatives (TROUVEZ CETTE SECTION AVEC "AUTO-CREATE-DISPLAY" ou "template exclusion")

**Raison du Change**: 
Les templates eux-mêmes ont la variable dans linkedVariableIds, donc la recherche les trouvait ET les utilisait comme source de parent (MAUVAIS).

---

### 📌 Modification 1B: Parent Priority Order

**Localisation**: Environ ligne 639-660  
**Chapitre**: Résolution du parentId  

**Code Avant** (INCOMPLET):
```typescript
let resolvedParentId = inheritedDisplayParentId
  ?? displayParentId
  ?? duplicatedOwnerNode.parentId
  ?? null;
```

**Code Après** (CORRECT):
```typescript
let resolvedParentId = inheritedDisplayParentId
  ?? originalOwnerNode.parentId  // ← PRIORITÉ 2 AJOUTÉE (CRITICAL)
  ?? displayParentId
  ?? duplicatedOwnerNode.parentId
  ?? null;

console.log(`📌 [DISPLAY_NODE_PARENT] Résolution du parentId:`);
console.log(`   - inheritedDisplayParentId: ${inheritedDisplayParentId}`);
console.log(`   - originalOwnerNode.parentId: ${originalOwnerNode.parentId}`);
console.log(`   - resolvedParentId final: ${resolvedParentId}`);
```

**Commentaire Ajouté**: 30 lignes avec explications détaillées + exemple concret

**Raison du Change**: 
Variables liées n'ont généralement PAS de display node original. 
Sans cette priorité 2, le code sautait directement à priorités 3/4 (wrong parent).

---

### 🔍 Comment Localiser ces Sections:

1. **Pour Template Exclusion**:
   - Chercher: `AUTO-CREATE-DISPLAY` ou `template exclusion`
   - Ou: Chercher `templateIds` dans le fichier
   - Ou: Chercher la ligne ~600

2. **Pour Parent Priority**:
   - Chercher: `DISPLAY_NODE_PARENT` ou `resolvedParentId`
   - Ou: Chercher `inheritedDisplayParentId ??`
   - Ou: Chercher la ligne ~650

---

## 📍 Fichier 2: repeat-blueprint-builder.ts

**Chemin Complet**:
```
src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/services/repeat-blueprint-builder.ts
```

---

### 📌 Modification 2: Linked Variable Expansion Comment

**Localisation**: Environ ligne 120 (avant la section d'expansion)  
**Chapitre**: Détection et expansion des variables liées  

**Commentaire Ajouté** (20 lignes):
```typescript
// ═════════════════════════════════════════════════════════════════════════
// 🔑 LINKED VARIABLE EXPANSION LOGIC
// ═════════════════════════════════════════════════════════════════════════
//
// CONCEPT:
// Une variable LIÉE partagée par 2 templates = 2 entrées dans le blueprint
// Chaque template reçoit sa propre copie de la variable
//
// EXEMPLE:
// Variable: "Orientation - inclinaison"
// Templates qui la partagent: ["Inclinaison", "Orientation"]
// Blueprint résultat: [
//   { nodeId: var, primaryTargetNodeId: "Inclinaison" },    ← Pour template 1
//   { nodeId: var, primaryTargetNodeId: "Orientation" }     ← Pour template 2
// ]
//
// IMPORTANCE:
// - primaryTargetNodeId = clé pour determiner QUEL template reçoit la copie
// - Sans cela: ambiguité sur distribution des copies
// - Utilisé dans repeat-instantiator.ts pour créer IDs déterministes
// 
// ═════════════════════════════════════════════════════════════════════════
```

**Raison du Commentaire**:
Expliquer POURQUOI les variables liées deviennent N entrées (une par template).

---

### 🔍 Comment Localiser cette Section:

1. **Chercher**: `LINKED VARIABLE EXPANSION` ou `linkedVariableIds`
2. **Ou**: Chercher `primaryTargetNodeId` dans le fichier
3. **Ou**: Chercher la ligne ~120-150

---

## 📍 Fichier 3: repeat-instantiator.ts

**Chemin Complet**:
```
src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/services/repeat-instantiator.ts
```

---

### 📌 Modification 3: primaryTargetNodeId Comment

**Localisation**: Environ ligne 320 (avant la détermination du templateId)  
**Chapitre**: Création des IDs déterministes  

**Commentaire Ajouté** (10 lignes):
```typescript
// ═══════════════════════════════════════════════════════════════════════
// 🔑 CRITICAL: primaryTargetNodeId Determination
// ═══════════════════════════════════════════════════════════════════════
//
// CONTEXT:
// primaryTargetNodeId = template node qui reçoit CETTE copie
// Fourni par repeat-blueprint-builder (expansion des variables liées)
//
// UTILISATION:
// Détermine l'ID de la copie: "${primaryTargetNodeId}-${suffix}"
// Pas: "${variable.nodeId}-${suffix}" ← WRONG (ignorerait le template)
//
// ═══════════════════════════════════════════════════════════════════════

const targetTemplateNodeId = (variable as any).primaryTargetNodeId 
  || variable.nodeId;
```

**Raison du Commentaire**:
Expliquer pourquoi `primaryTargetNodeId` est utilisé et pas `variable.nodeId`.

---

### 🔍 Comment Localiser cette Section:

1. **Chercher**: `primaryTargetNodeId` ou `CRITICAL: primaryTargetNodeId`
2. **Ou**: Chercher `targetTemplateNodeId`
3. **Ou**: Chercher la ligne ~320

---

## 📊 Résumé de Localisation

| Fichier | Localisation | Modifications | Type |
|---------|-------------|---|---|
| variable-copy-engine.ts | Ligne ~560-630 | Template Exclusion | CODE CHANGE |
| variable-copy-engine.ts | Ligne ~639-660 | Parent Priority | CODE CHANGE |
| repeat-blueprint-builder.ts | Ligne ~120 | Linked Expansion | COMMENT |
| repeat-instantiator.ts | Ligne ~320 | primaryTargetNodeId | COMMENT |

---

## 🔑 Les 4 Changements Critiques à Chercher

### Change 1: Template Exclusion (Ligne 580)
```typescript
const templateIds = new Set(originalVar.linkedVariableIds || []);
const displayNodes = templateIds.size > 0
  ? nodes.filter(n => 
      !templateIds.has(n.id)  // ← CETTE LIGNE
```

### Change 2: Original Owner Parent (Ligne 640)
```typescript
let resolvedParentId = inheritedDisplayParentId
  ?? originalOwnerNode.parentId  // ← CETTE LIGNE (ADDED)
```

### Change 3: Linked Variable Expansion Comment (Ligne 120+)
```typescript
// ═════════════════════════════════════════════════════════════════════
// 🔑 LINKED VARIABLE EXPANSION LOGIC  ← CHERCHER CETTE LIGNE
```

### Change 4: primaryTargetNodeId Comment (Ligne 320+)
```typescript
// ═══════════════════════════════════════════════════════════════════
// 🔑 CRITICAL: primaryTargetNodeId Determination  ← CHERCHER CETTE LIGNE
```

---

## ✅ Validation Checklist

Quand vous lisez le code:

- [ ] Trouve-t-on `templateIds` à ligne ~580? → Template exclusion ✅
- [ ] Trouve-t-on `originalOwnerNode.parentId` à ligne ~640? → Parent priority ✅
- [ ] Trouve-t-on le commentaire LINKED VARIABLE EXPANSION? → Blueprint comment ✅
- [ ] Trouve-t-on le commentaire primaryTargetNodeId? → Instantiator comment ✅

---

## 🎯 Script de Vérification Rapide

Pour vérifier que tous les changements sont en place:

```bash
# 1. Vérifier Template Exclusion
grep -n "templateIds = new Set" \
  "src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/services/variable-copy-engine.ts"

# 2. Vérifier Parent Priority
grep -n "originalOwnerNode.parentId" \
  "src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/services/variable-copy-engine.ts"

# 3. Vérifier Blueprint Comment
grep -n "LINKED VARIABLE EXPANSION" \
  "src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/services/repeat-blueprint-builder.ts"

# 4. Vérifier Instantiator Comment
grep -n "CRITICAL: primaryTargetNodeId" \
  "src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/services/repeat-instantiator.ts"
```

---

## 📱 Quick Navigation

### Si vous êtes dans VS Code:

1. **Ouvrir** `variable-copy-engine.ts`
2. **Ctrl+F** → Chercher `templateIds` → Find Change 1
3. **Ctrl+F** → Chercher `originalOwnerNode.parentId` → Find Change 2

4. **Ouvrir** `repeat-blueprint-builder.ts`
5. **Ctrl+F** → Chercher `LINKED VARIABLE` → Find Change 3

6. **Ouvrir** `repeat-instantiator.ts`
7. **Ctrl+F** → Chercher `primaryTargetNodeId Determination` → Find Change 4

---

## 🔐 Code Integrity Check

Pour s'assurer que rien n'a été modifié accidentellement:

```typescript
// ✅ DOIT ÊTRE LÀ:
const templateIds = new Set(originalVar.linkedVariableIds || []);

// ✅ DOIT ÊTRE LÀ:
let resolvedParentId = inheritedDisplayParentId
  ?? originalOwnerNode.parentId
  ?? displayParentId
  ?? duplicatedOwnerNode.parentId
  ?? null;

// ✅ DOIT ÊTRE LÀ:
const targetTemplateNodeId = (variable as any).primaryTargetNodeId 
  || variable.nodeId;
```

Si un seul de ces éléments manque → BUG réintroduit!

---

## 📞 Besoin de Lire le Code?

**Fichier à lire**: variable-copy-engine.ts (le plus critique)  
**Lignes essentielles**: 560-630 (exclusion) + 639-660 (priority)  
**Temps de lecture**: 10-15 minutes  
**Aide-mémoire**: REPEATER_CHEAT_SHEET.md

---

## 🎯 Next Steps

1. Localiser les 4 changements critiques
2. Vérifier qu'ils sont tous présents
3. Comprendre le POURQUOI (lire commentaires)
4. Valider avec API test
5. Vérifier en DB
6. Vérifier en UI

---

*Guide créé pour faciliter la localisation et la compréhension des modifications exactes.*
