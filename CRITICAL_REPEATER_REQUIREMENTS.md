# 🔴 EXIGENCES CRITIQUES POUR LE SYSTÈME DE RÉPÉTITEUR

## ⚡ LA RÈGLE D'OR

> **LE CHAMP D'AFFICHAGE DOIT AVOIR LE MÊME PARENT QUE LE NŒUD PROPRIÉTAIRE**

Cela garantit que visuellement, le champ s'affiche dans la MÊME SECTION que l'original.

---

## 📋 Checklist de Validation (6 points)

### ✅ 1. Variables DIRECTES vs LIÉES

```typescript
// DIRECTE: Propriété d'un seul nœud
variable.nodeId = "440d696a-34cf-418f-8f56-d61015f66d91" (le propriétaire)

// LIÉE: Référencée par PLUSIEURS nœuds
variable.linkedVariableIds = ["node_template1", "node_template2"]
// → La variable est partagée, mais CRÉÉE au nœud propriétaire
```

**À Respecter**: Les variables liées ne doivent PAS changer de parent lors de la duplication.

---

### ✅ 2. Recherche de Display Nodes (Ligne 560-630)

```typescript
// ❌ MAUVAIS: Inclure les templates dans la recherche
const displayNodes = originalVar.linkedVariableIds.map(id => 
  nodes.find(n => n.linkedVariableIds.includes(originalVar.id))
);
// → TROUVE les templates (qui ont la variable dans linkedVariableIds)

// ✅ BON: Exclure les templates, chercher AUTRES display nodes
const templateIds = new Set(originalVar.linkedVariableIds);
const displayNodes = templateIds.size > 0
  ? nodes.filter(n => 
      n.linkedVariableIds?.includes(originalVar.id)
      && !templateIds.has(n.id)  // ⭐ EXCLUSION CRITIQUE
    )
  : [];
```

**À Respecter**: JAMAIS faire correspondre un template avec un display node original.

---

### ✅ 3. Parent Priority Order (Ligne 639-660)

```typescript
let resolvedParentId = 
  inheritedDisplayParentId              // Priorité 1
  ?? originalOwnerNode.parentId         // ⭐ Priorité 2 (CRITIQUE)
  ?? displayParentId                    // Priorité 3
  ?? duplicatedOwnerNode.parentId       // Priorité 4
  ?? null;
```

**Pourquoi Priorité 2 (originalOwnerNode.parentId)?**
- Les variables LIÉES n'ont généralement PAS de display node original
- `inheritedDisplayParentId` est souvent `null`
- Fallback automatique: utiliser le parent du propriétaire
- C'est toujours le bon choix car c'est l'endroit où apparaît la variable

**À Respecter**: Ne jamais utiliser `duplicatedOwnerNode.parentId` sans vérifier les priorités précédentes.

---

### ✅ 4. Blueprint Expansion (repeat-blueprint-builder.ts)

```typescript
// Pour UNE variable liée à 2 templates:
// ✅ BON: Créer 2 entrées dans le blueprint (une par template)
blueprint.variables = [
  { 
    nodeId: "440d696a-34cf",  // Variable originale
    primaryTargetNodeId: "node_template1",  // Cibler ce template
  },
  { 
    nodeId: "440d696a-34cf",  // MÊME variable
    primaryTargetNodeId: "node_template2",  // Cibler cet autre template
  }
];

// ❌ MAUVAIS: Créer UNE seule entrée
blueprint.variables = [
  { 
    nodeId: "440d696a-34cf",
    // → Ambiguité: quel template cibler?
  }
];
```

**À Respecter**: Une variable liée = plusieurs entrées blueprint (une par template).

---

### ✅ 5. Instantiator ID Determinism (repeat-instantiator.ts)

```typescript
// ✅ BON: Utiliser primaryTargetNodeId du template
const targetTemplateNodeId = (variable as any).primaryTargetNodeId 
  || variable.nodeId;
const targetNodeId = `${targetTemplateNodeId}-${variableSuffix}`;

// ❌ MAUVAIS: Ignorer primaryTargetNodeId
const targetNodeId = `${variable.nodeId}-${variableSuffix}`;
// → Crée l'instance avec ID du propriétaire (wrong template!)
```

**À Respecter**: `primaryTargetNodeId` détermine QUEL template reçoit la copie.

---

### ✅ 6. Variable Copy Sequence (variable-copy-engine.ts)

```
Phase 1: Rechercher DISPLAY node original
├─ EXCLURE templates (template exclusion logic)
├─ Chercher AUTRES nœuds avec linkedVariableIds
└─ Si trouvé: usar inheritedDisplayParentId

Phase 2: Si pas de display node trouvé
├─ Vérifier si la variable a un nœud propriétaire (originalOwnerNode)
├─ ⭐ UTILISER: originalOwnerNode.parentId (Priorité 2)
└─ Cette section est CRITIQUE pour variables liées

Phase 3: Créer le nœud dupliqué
├─ Copy: originalOwnerNode → newNode
├─ Set: newNode.parentId = resolvedParentId
└─ VÉRIFIER: newNode est bien dans le MÊME parent que original

Phase 4: Créer le display node
├─ Copy: originalDisplayNode → newDisplayNode
├─ Set: newDisplayNode.linkedVariableIds = [newNode.id]
└─ VÉRIFIER: apparaît visuellement dans la BONNE section
```

**À Respecter**: Suivre strictement l'ordre des phases.

---

## 🎯 Exemple Concret: "Orientation - inclinaison"

### Situation Initiale
```
Variable: Orientation - inclinaison
├─ nodeId: 440d696a-34cf-418f-8f56-d61015f66d91
├─ linkedVariableIds: ["node_inclinaison_template", "node_orientation_template"]
└─ parentId: c40d8353-923f-49ac-a3db-91284de99654 (Nouveau Section)

Templates:
├─ Inclinaison (node_inclinaison_template)
│  └─ parentId: node_1757366229474_w8xt9wtqz (Mesure Section)
└─ Orientation (node_orientation_template)
   └─ parentId: node_1757366229474_w8xt9wtqz (Mesure Section)
```

### Duplication du Repeater "toit"

**Blueprint Creator (répeat-blueprint-builder.ts)**:
```
Detecte linkedVariableIds: 2 templates
→ Crée 2 entrées blueprint
```

**Instantiator**:
```
Entrée 1: primaryTargetNodeId = node_inclinaison_template
→ Copie nommée: "Orientation - inclinaison-1"
→ Ciblée pour Inclinaison template instance

Entrée 2: primaryTargetNodeId = node_orientation_template
→ Copie nommée: "Orientation - inclinaison-1"
→ Ciblée pour Orientation template instance
```

**Variable Copy Engine (variable-copy-engine.ts)** ⭐ MOMENT CRITIQUE:

```
Phase 1: Chercher display node original
├─ EXCLURE: node_inclinaison_template, node_orientation_template
└─ Résultat: Pas de display node pour variable liée (null)

Phase 2: Fallback à originalOwnerNode
├─ originalOwnerNode.parentId = c40d8353-923f... (Nouveau Section)
└─ resolvedParentId = c40d8353-923f... ✅ CORRECT

Phase 3: Créer copie
├─ newNode.id = "440d696a-34cf-...-instance1"
├─ newNode.parentId = c40d8353-923f... ✅
└─ RÉSULTAT: Copie créée dans Nouveau Section

Phase 4: Créer display node
├─ newDisplayNode.linkedVariableIds = ["440d696a-34cf-...-instance1"]
├─ newDisplayNode.parentId = c40d8353-923f...
└─ UI AFFICHAGE: "Orientation - inclinaison-1" apparaît dans Toitures ✅
```

---

## 🚨 Pièges Courants

### Piège 1: Templates trouvés comme Display Nodes
```typescript
// ❌ CAUSE: Pas d'exclusion dans la recherche
const displayNodes = linkedVariableIds.map(id => 
  nodes.find(n => n.linkedVariableIds?.includes(variableId))
);
// → Trouve les TEMPLATES (qui ont la variable!)

// ✅ FIX: Exclure les templates
const displayNodes = linkedVariableIds.size > 0
  ? nodes.filter(n => 
      !linkedVariableIds.has(n.id)  // ⭐
      && n.linkedVariableIds?.includes(variableId)
    )
  : [];
```

### Piège 2: Mauvais Parent Utilisé
```typescript
// ❌ MAUVAIS: Utiliser parent du template
resolvedParentId = templateNode.parentId; // → Mesure Section

// ✅ BON: Utiliser parent du propriétaire
resolvedParentId = originalOwnerNode.parentId; // → Nouveau Section
```

### Piège 3: Variables Liées Non Expansées
```typescript
// ❌ MAUVAIS: UNE entrée pour 2 templates
blueprint.variables = [{ nodeId: "variable-id" }];

// ✅ BON: DEUX entrées (une par template)
blueprint.variables = [
  { nodeId: "variable-id", primaryTargetNodeId: "template1" },
  { nodeId: "variable-id", primaryTargetNodeId: "template2" }
];
```

### Piège 4: Ignorer primaryTargetNodeId
```typescript
// ❌ MAUVAIS: Créer instance avec ID du propriétaire
targetNodeId = `${variable.nodeId}-suffix`;

// ✅ BON: Créer instance avec ID du template (primaryTargetNodeId)
targetNodeId = `${primaryTargetNodeId}-suffix`;
```

### Piège 5: Priorité Parentale Incorrecte
```typescript
// ❌ MAUVAIS: Priorité inversée
resolvedParentId = duplicatedOwnerNode.parentId 
  ?? originalOwnerNode.parentId 
  ?? null;

// ✅ BON: Bonne priorité
resolvedParentId = inheritedDisplayParentId 
  ?? originalOwnerNode.parentId  // ⭐ Priorité 2
  ?? displayParentId 
  ?? duplicatedOwnerNode.parentId
  ?? null;
```

---

## 📁 Fichiers Clés à Connaître

1. **repeat-blueprint-builder.ts** 
   - Détecte les variables liées
   - Crée les entrées blueprint (expansion)

2. **repeat-instantiator.ts**
   - Utilise primaryTargetNodeId
   - Crée les IDs déterministes

3. **variable-copy-engine.ts** ⭐ PLUS CRITIQUE
   - Ligne 560-630: Template exclusion logic
   - Ligne 639-660: Parent priority order
   - Lines 670+: Display node creation

4. **REPEATER_ARCHITECTURE.md**
   - Explication complète du système
   - À lire AVANT toute modification

---

## 🧪 Test de Validation

### Commande API:
```bash
POST /api/repeat/{repeaterId}/instances/execute
Header: x-test-bypass-auth: test
```

### Validation:
```typescript
// Vérifier que display node:
✅ A le même parent que le nœud original
✅ Apparaît visuellement dans la MÊME section
✅ Contient le linkedVariableIds correct
✅ A un ID déterministe (template + suffix)
```

---

## 📊 Diagramme de Flux

```
Variable Liée (2 templates)
        ↓
[Blueprint Builder] Expand → 2 entrées
        ↓
[Instantiator] → 2 plans avec primaryTargetNodeId
        ↓
[Executor] → Duplicate templates
        ↓
[Variable Copy Engine]
├─ Phase 1: Chercher display node (EXCLURE templates)
├─ Phase 2: Fallback → originalOwnerNode.parentId ⭐
├─ Phase 3: Créer copie avec ce parentId
└─ Phase 4: Créer display node
        ↓
✅ Copie DANS LA BONNE SECTION
```

---

## 💡 Résumé en Une Ligne

> **Display node parent = Owner node parent (pas template parent)**

---

*Dernière mise à jour: Après résolution du bug de parentId*
