# 🎯 AIDE-MÉMOIRE RÉPÉTITEUR (À GARDER À PORTÉE)

## La Règle d'Or en 1 Ligne
> **Display Node Parent = Owner Node Parent (pas Template Parent)**

---

## Les 3 Concepts en 30 Secondes

| Concept | Définition | Exemple |
|---------|-----------|---------|
| **Template** | Nœud qui se duplique | "Inclinaison" → "Inclinaison-1", "Inclinaison-2" |
| **Variable Directe** | Propriété d'UN nœud | "Rayon d'ombre" (propriété de son nœud) |
| **Variable Liée** | Partagée par PLUSIEURS nœuds | "Orientation-inclinaison" (2 templates l'utilisent) |

---

## Parent Priority Order (Ne l'Oublie Pas!)

```typescript
resolvedParentId = 
  inheritedDisplayParentId        // 1️⃣ Display original
  ?? originalOwnerNode.parentId   // 2️⃣ ⭐ CRITICAL
  ?? displayParentId              // 3️⃣ Option custom
  ?? duplicatedOwnerNode.parentId // 4️⃣ Copy parent
  ?? null;                        // 5️⃣ Fallback
```

**Mémoriser**: `1 → 2-CRITICAL → 3 → 4 → 5`

---

## Checklist de Modification (6 Points)

- [ ] Pas de confusion Template ↔ Display Node
- [ ] Expansion correcte des variables liées (1 var = N templates)
- [ ] Utilisation de primaryTargetNodeId (pas variable.nodeId)
- [ ] Parent priority correct (priorité 2 = owner parent)
- [ ] Pas de mutabilité accidentelle
- [ ] Logging pour debug

---

## 4 Symptômes + Solutions Rapides

### 1️⃣ Champ au mauvais endroit?
```typescript
// Vérifier line 639 en variable-copy-engine.ts:
resolvedParentId = inheritedDisplayParentId
  ?? originalOwnerNode.parentId  // ← Doit être là!
  ?? displayParentId
  ?? null;
```

### 2️⃣ Seule 1 variable au lieu de N?
```typescript
// repeat-blueprint-builder.ts doit faire:
for (const templateId of variable.linkedVariableIds) {
  blueprint.push({
    ...variable,
    primaryTargetNodeId: templateId  // ← Expansion
  });
}
```

### 3️⃣ IDs non-déterministes?
```typescript
// repeat-instantiator.ts ligne ~320:
const targetTemplateNodeId = (variable as any).primaryTargetNodeId 
  || variable.nodeId;  // ← Utiliser primaryTargetNodeId!
```

### 4️⃣ Template trouvé comme display node?
```typescript
// variable-copy-engine.ts ligne 560-630:
const templateIds = new Set(originalVar.linkedVariableIds);
const displayNodes = nodes.filter(n => 
  !templateIds.has(n.id)  // ← Exclure templates!
  && n.linkedVariableIds?.includes(originalVar.id)
);
```

---

## Files à Modifier (3 Fichiers Critiques)

1. **variable-copy-engine.ts** 🔴 PLUS CRITIQUE
   - Ligne 560-630: Template exclusion
   - Ligne 639-660: Parent priority

2. **repeat-blueprint-builder.ts**
   - Ligne ~120: Linked variable expansion

3. **repeat-instantiator.ts**
   - Ligne ~320: primaryTargetNodeId logic

---

## Test Rapide (2 Commandes)

```bash
# 1. Voir le plan
POST http://localhost:3000/api/repeat/REPEAT_ID/instances/plan
Header: x-test-bypass-auth: test
# Vérifier: plan.variables a N entrées (N=templates count)

# 2. Exécuter duplication
POST http://localhost:3000/api/repeat/REPEAT_ID/instances/execute
Header: x-test-bypass-auth: test
# Vérifier: status = "completed"
```

---

## Vérifier en DB (1 Commande SQL)

```sql
-- Voir tous les nœuds avec la variable
SELECT id, name, parentId 
FROM treeBranchLeafNode 
WHERE name LIKE '%Orientation%'
ORDER BY name;

-- L'original ET la copie doivent avoir le MÊME parentId
```

---

## Logs à Chercher (Bons vs Mauvais)

### ✅ Logs Normaux:
```
[PARENT] inherited: null
[PARENT] original: c40d8353-923f...  ← Owner parent
[PARENT] resolved: c40d8353-923f...  ← SAME!
```

### ❌ Logs d'Erreur:
```
[PARENT] inherited: null
[PARENT] original: c40d8353-923f...
[PARENT] resolved: node_1757366229474_w8xt9wtqz  ← DIFFERENT! BUG!
```

---

## Documentation Rapide Ref

| Quoi? | Où? | Temps |
|-------|-----|-------|
| Comprendre le système | REPEATER_ARCHITECTURE.md | 30min |
| Règles essentielles | CRITICAL_REPEATER_REQUIREMENTS.md | 15min |
| Debugger | REPEATER_DEBUG_GUIDE.md | 20min |
| Quick start | QUICK_REPEATER_GUIDE.md | 5min |
| Résumé des changes | MODIFICATIONS_SUMMARY.md | 10min |

---

## Pièges à Éviter (5 Critiques)

1. ❌ Templates trouvés comme display nodes
   ✅ Exclure templates avec: `!templateIds.has(n.id)`

2. ❌ Parent du template au lieu du propriétaire
   ✅ Utiliser: `originalOwnerNode.parentId` (priorité 2)

3. ❌ Variables liées non expansées
   ✅ Créer N entrées pour N templates

4. ❌ Ignorer primaryTargetNodeId
   ✅ Utiliser: `${primaryTargetNodeId}-${suffix}`

5. ❌ Priorité parentale inversée
   ✅ Respecter: `1 → 2 → 3 → 4 → 5`

---

## Commande Debug Complète

```bash
# 1. Exécuter duplication
curl -X POST http://localhost:3000/api/repeat/REPEAT_ID/instances/execute \
  -H "x-test-bypass-auth: test"

# 2. Voir console du serveur (logs [PARENT])

# 3. Vérifier DB
sqlite3 prisma/dev.db \
  "SELECT name, parentId FROM treeBranchLeafNode 
   WHERE name LIKE '%Orientation%' ORDER BY name;"

# 4. Vérifier UI
# Browser: Ouvrir le formulaire et vérifier placement du champ
```

---

## One-Liner Summary

Display nodes must inherit the parent of their variable's owner node, not the parent of the template that references them. Variables shared by multiple templates create multiple blueprint entries (one per template), each with primaryTargetNodeId to determine the target. Template exclusion is critical when searching for display nodes to avoid using template's parent instead of owner's parent.

---

## Quick Validation

```typescript
// ✅ CORRECT:
let resolvedParentId = inheritedDisplayParentId
  ?? originalOwnerNode.parentId
  ?? displayParentId
  ?? duplicatedOwnerNode.parentId ?? null;

// ❌ INCORRECT:
let resolvedParentId = displayParentId
  ?? duplicatedOwnerNode.parentId ?? null;
```

---

## Avant de Commiter

- [ ] Pas d'erreurs TypeScript
- [ ] Parent priority correct
- [ ] Pas de console.error() injustifié
- [ ] Commentaires expliquent le POURQUOI
- [ ] API test fonctionne
- [ ] Parent en DB = original parent
- [ ] Champ s'affiche au bon endroit en UI

---

*Gardez ce fichier à portée! 📌*
*Updated: Après résolution du bug de parentId*
