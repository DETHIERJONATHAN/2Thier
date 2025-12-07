# 📘 GUIDE RAPIDE DU SYSTÈME DE RÉPÉTITEUR

## ⏱️ Version 30 secondes

Le système duplique des nœuds ("templates") et leurs variables. 

**Règle d'or**: Le champ dupliqué doit avoir **le même parent** que l'original.

**C'est tout ce que vous devez retenir.**

---

## ⏱️ Version 5 minutes

### 1. Les Trois Concepts

**Templates** = Nœuds qui se dupliquent dans un repeater
```
├─ "Inclinaison" → devient "Inclinaison-1", "Inclinaison-2"
└─ "Orientation" → devient "Orientation-1", "Orientation-2"
```

**Variables Directes** = Propriété d'UN nœud
```
Variable "Orientation - inclinaison"
└─ Propriétaire: Le nœud "Orientation - inclinaison"
```

**Variables Liées** = Partagées par PLUSIEURS nœuds
```
Variable "Orientation - inclinaison"
├─ Propriétaire: Nœud "Orientation - inclinaison"
├─ Utilisée par: Template "Inclinaison"
└─ Utilisée par: Template "Orientation"
```

### 2. Le Flux de Duplication

```
1. BLUEPRINT
   ├─ Détecte les variables liées
   ├─ Crée 1 entrée par template qui partage la variable
   └─ Résultat: 2 variables à dupliquer pour 1 variable originale

2. INSTANTIATOR
   ├─ Détermine quel template reçoit quelle copie
   ├─ Crée les IDs avec suffixe: "template-id-suffix"
   └─ Résultat: Plan avec IDs déterministes

3. EXECUTOR
   ├─ Duplique physiquement les templates
   ├─ Appelle le Variable Copy Engine
   └─ Résultat: Copie complète avec tous les nœuds

4. VARIABLE COPY ENGINE ⭐
   ├─ Crée la copie du nœud
   ├─ Assigne le MÊME parent que l'original
   ├─ Crée le display node (le champ visible dans l'UI)
   └─ Résultat: Champ apparaît dans la BONNE section
```

### 3. Le Point Critique

**Parent Assignment** (variable-copy-engine.ts, ligne 639-660):

```typescript
resolvedParentId = 
  inheritedDisplayParentId          // Priorité 1: Display original
  ?? originalOwnerNode.parentId     // ⭐ Priorité 2: Parent original
  ?? displayParentId                // Priorité 3: Option personnalisée
  ?? duplicatedOwnerNode.parentId   // Priorité 4: Parent dupliqué
  ?? null;
```

**Pourquoi Priorité 2?**
- Variables liées n'ont pas de display node original
- Donc: utiliser parent du nœud propriétaire
- Cela garantit: apparaît dans la MÊME section

---

## ⏱️ Version 15 minutes

### Checkliste de Modification

Vous modifiez le code du repeater? Vérifiez ces 6 points:

#### ✅ 1. Pas de Confusion Template ↔ Display Node
```typescript
// ❌ Mauvais
const displayNodes = variable.linkedVariableIds.map(id => nodes[id]);

// ✅ Bon
const templateIds = new Set(variable.linkedVariableIds);
const displayNodes = nodes.filter(n => 
  !templateIds.has(n.id)  // Exclure les templates
  && n.linkedVariableIds?.includes(variable.id)
);
```

#### ✅ 2. Expansion Correcte des Variables Liées
```typescript
// Pour chaque template qui partage la variable:
for (const templateId of variable.linkedVariableIds) {
  blueprint.push({
    ...variable,
    primaryTargetNodeId: templateId  // ← Important!
  });
}
```

#### ✅ 3. Utilisation de primaryTargetNodeId
```typescript
// ❌ Mauvais
const nodeId = `${variable.nodeId}-${suffix}`;

// ✅ Bon
const nodeId = `${variable.primaryTargetNodeId}-${suffix}`;
```

#### ✅ 4. Parent Priority Correct
```typescript
// Toujours utiliser cet ordre:
parentId = inherited ?? original ?? optional ?? duplicated ?? null;
//          (1)       (2) ⭐ (3)      (4)       (5)
```

#### ✅ 5. Pas de Mutabilité Accidentelle
```typescript
// ❌ Mauvais
originalNode.parentId = newParentId;

// ✅ Bon
const newNode = { ...originalNode, parentId: newParentId };
```

#### ✅ 6. Logging pour Debug
```typescript
console.log(`[PARENT] inherited: ${inherited}`);
console.log(`[PARENT] original: ${original}`);
console.log(`[PARENT] resolved: ${resolved}`);
```

---

## 📊 Quand Chaque Phase S'exécute

```
USER CLICKS "CREATE INSTANCE"
        ↓
   BLUEPRINT BUILDER
   (detecter variables liées)
        ↓
   REPEAT INSTANTIATOR
   (créer IDs déterministes)
        ↓
   REPEAT EXECUTOR
   (dupliquer templates)
        ↓
VARIABLE COPY ENGINE ← ⭐ C'est là que parentId est décidé
(créer copie avec bon parent)
        ↓
USER VOIT LE CHAMP
(dans la bonne section)
```

---

## 🐛 Debug Rapide

**Le champ apparaît au mauvais endroit?**

1. Vérifier le `parentId` dans la DB:
   ```sql
   SELECT id, name, parentId FROM treeBranchLeafNode 
   WHERE name LIKE '%Orientation-inclinaison%';
   ```

2. Comparer avec l'original:
   ```sql
   SELECT id, name, parentId FROM treeBranchLeafNode 
   WHERE name = 'Orientation - inclinaison';
   ```

3. Si différent → problème dans variable-copy-engine.ts
   - Vérifier ligne 639-660 (parent logic)
   - Vérifier ligne 560-630 (template exclusion)

**Les variables ne se dupliquent pas du tout?**

1. Vérifier le blueprint:
   ```
   POST /api/repeat/{id}/instances/plan
   ```
   Devrait avoir N entrées pour N templates

2. Si N=1 → problème dans repeat-blueprint-builder.ts
   - Variables liées ne sont pas expansées

**ID déterministe incorrect?**

1. Vérifier repeat-instantiator.ts ligne 320:
   ```typescript
   const targetTemplateNodeId = (variable as any).primaryTargetNodeId 
     || variable.nodeId;
   ```
   - Doit utiliser primaryTargetNodeId, pas variable.nodeId

---

## 📚 Fichiers Importants

| Fichier | Rôle | Ligne Critique |
|---------|------|----------------|
| repeat-blueprint-builder.ts | Expansion variables | 120-180 |
| repeat-instantiator.ts | IDs déterministes | 300-330 |
| variable-copy-engine.ts | Parent assignment | 639-660 |
| REPEATER_ARCHITECTURE.md | Documentation complète | Tout |
| CRITICAL_REPEATER_REQUIREMENTS.md | Règles essentielles | Tout |

---

## 💡 Une Modification de Code Typique

**Scénario**: On veut que les variables affichent un suffixe personnalisé

1. ✅ Lire REPEATER_ARCHITECTURE.md (contexte)
2. ✅ Localiser le point de modification (ex: repeat-instantiator.ts)
3. ✅ Vérifier la checklist 6 points
4. ✅ Tester avec `/api/repeat/{id}/instances/execute`
5. ✅ Vérifier dans la DB que parent est correct
6. ✅ Vérifier dans l'UI que c'est au bon endroit

---

## 🚀 Commandes Utiles

### Test l'API directement
```bash
# Voir le plan de duplication
curl -X POST http://localhost:3000/api/repeat/REPEAT_ID/instances/plan \
  -H "x-test-bypass-auth: test"

# Exécuter la duplication
curl -X POST http://localhost:3000/api/repeat/REPEAT_ID/instances/execute \
  -H "x-test-bypass-auth: test"
```

### Vérifier la structure
```bash
# Voir tous les nœuds d'une organisation
sqlite3 prisma/dev.db \
  "SELECT id, name, parentId FROM treeBranchLeafNode LIMIT 20;"
```

---

## 📝 Avant de Commiter

- [ ] Lire les fichiers modifiés dans variable-copy-engine.ts
- [ ] Vérifier la checklist 6 points
- [ ] Tester l'API `/instances/execute`
- [ ] Vérifier le parentId en DB
- [ ] Vérifier l'affichage en UI
- [ ] Pas de console.error() sans explication
- [ ] Les commentaires expliquent le POURQUOI

---

## 🎯 Remember

> **Display Node Parent = Owner Node Parent**

Si c'est ailleurs, c'est un bug. Point.

---

*Questions? Consulter REPEATER_ARCHITECTURE.md pour plus de détails.*
