# 🔍 GUIDE DE DEBUG - SYSTÈME DE RÉPÉTITEUR

## Symptômes et Solutions

### 📌 Symptôme 1: Champ s'affiche au mauvais endroit

**Observation:**
- Vous dupliquez un repeater
- Le champ "Orientation-inclinaison-1" apparaît dans la section "Mesure"
- Au lieu d'apparaître dans "Nouveau Section" (où se trouve "Orientation-inclinaison")

**Cause Probable:**
`originalOwnerNode.parentId` n'est pas utilisé en Priorité 2

**Debug Pas à Pas:**

1. **Vérifier dans la base de données**
   ```sql
   -- Trouver le nœud ORIGINAL
   SELECT id, name, parentId FROM treeBranchLeafNode 
   WHERE name = 'Orientation - inclinaison' AND organizationId = 'YOUR_ORG_ID';
   -- Résultat: id = 440d696a-34cf-418f-8f56-d61015f66d91
   --          parentId = c40d8353-923f-49ac-a3db-91284de99654 (REFERENCE)
   
   -- Trouver la COPIE
   SELECT id, name, parentId FROM treeBranchLeafNode 
   WHERE name LIKE '%Orientation%' AND id LIKE '%440d696a%';
   -- Résultat: parentId = ??? (vérifier si = c40d8353-923f... ou différent)
   ```

2. **Si parentId de la copie est MAUVAIS:**
   ```
   Copie parentId = node_1757366229474_w8xt9wtqz (Mesure) ❌
   Original parentId = c40d8353-923f-49ac-a3db-91284de99654 (Nouveau Section) ✅
   ```

3. **Cause Confirméd:**
   - Code in variable-copy-engine.ts ligne 639
   - Ne passe pas par `originalOwnerNode.parentId`
   - Saute directement à priorité 3 ou 4

4. **Vérifier le code:**
   ```typescript
   // CECI DOIT ÊTRE LÀ:
   let resolvedParentId = inheritedDisplayParentId
     ?? originalOwnerNode.parentId  // ← Ligne CRITIQUE
     ?? displayParentId
     ?? duplicatedOwnerNode.parentId
     ?? null;
   ```

5. **Ajouter Logging Temporaire:**
   ```typescript
   console.log('=== DEBUG PARENT ===');
   console.log('originalVar.linkedVariableIds:', originalVar.linkedVariableIds);
   console.log('originalDisplayNode:', originalDisplayNode?.id || 'NULL');
   console.log('inheritedDisplayParentId:', inheritedDisplayParentId);
   console.log('originalOwnerNode.parentId:', originalOwnerNode.parentId);
   console.log('resolvedParentId FINAL:', resolvedParentId);
   console.log('===================');
   ```

6. **Exécuter et vérifier les logs:**
   ```
   POST /api/repeat/REPEAT_ID/instances/execute
   ```
   Voir la console du serveur

---

### 📌 Symptôme 2: Seule UNE variable se duplique au lieu de N

**Observation:**
- Template "Inclinaison" se duplique
- Template "Orientation" se duplique
- Mais variable "Orientation - inclinaison" n'apparaît qu'UNE FOIS
- Devrait apparaître 2 fois (une dans chaque template)

**Cause Probable:**
`repeat-blueprint-builder.ts` n'expande pas les variables liées

**Debug:**

1. **Vérifier le Plan:**
   ```bash
   POST /api/repeat/REPEAT_ID/instances/plan
   Header: x-test-bypass-auth: test
   
   Réponse attendue:
   {
     "status": "planned",
     "plan": {
       "variables": [
         { nodeId: "440d...", primaryTargetNodeId: "node_inclinaison" },
         { nodeId: "440d...", primaryTargetNodeId: "node_orientation" }
       ]
     }
   }
   
   Réponse mauvaise:
   {
     "plan": {
       "variables": [
         { nodeId: "440d...", primaryTargetNodeId: undefined }  // ❌ Pas 2 entrées
       ]
     }
   }
   ```

2. **Si une seule entrée dans le plan:**
   - Problème: repeat-blueprint-builder.ts
   - Ligne 120-180 (détection linkedVariableIds)
   - Variables liées ne sont pas expansées

3. **Vérifier le code:**
   ```typescript
   // CECI DOIT ÊTRE LÀ:
   if (linkedVariableIds.size > 0) {
     for (const templateId of linkedVariableIds) {
       expandedVariables.push({
         ...variable,
         primaryTargetNodeId: templateId  // ← Clé pour expansion
       });
     }
   }
   ```

4. **Ajouter Logging:**
   ```typescript
   console.log('Variable linkedVariableIds.size:', linkedVariableIds.size);
   for (const templateId of linkedVariableIds) {
     console.log('  Expansion: template =', templateId);
   }
   ```

---

### 📌 Symptôme 3: IDs Non-Déterministes (IDs Différents à Chaque Exécution)

**Observation:**
- Première duplication: "440d696a-34cf-...-abc123"
- Deuxième duplication IDENTIQUE: "440d696a-34cf-...-xyz789" ❌
- Devrait être le MÊME ID

**Cause Probable:**
`repeat-instantiator.ts` n'utilise pas `primaryTargetNodeId`

**Debug:**

1. **Vérifier Logs:**
   ```
   POST /api/repeat/REPEAT_ID/instances/plan
   POST /api/repeat/REPEAT_ID/instances/plan (2ème fois)
   
   Les IDs dans "plan.variables[].id" doivent être IDENTIQUES
   ```

2. **Si IDs différents:**
   - Problème: repeat-instantiator.ts ligne 320
   - Génération ID non déterministe

3. **Vérifier le code:**
   ```typescript
   // ✅ BON:
   const targetTemplateNodeId = (variable as any).primaryTargetNodeId 
     || variable.nodeId;
   const nodeId = `${targetTemplateNodeId}-${variableSuffix}`;
   
   // ❌ MAUVAIS:
   const nodeId = `${variable.nodeId}-${variableSuffix}`;
   // N'utilise pas primaryTargetNodeId!
   ```

4. **Ajouter Logging:**
   ```typescript
   console.log('primaryTargetNodeId:', (variable as any).primaryTargetNodeId);
   console.log('nodeId AVANT:', variable.nodeId);
   console.log('nodeId FINAL:', targetTemplateNodeId);
   ```

---

### 📌 Symptôme 4: Template Trouvé au lieu de Display Node

**Observation:**
- Vous modifiez le code de recherche de display node
- Résultat: le template "Inclinaison" est traité comme display node
- Mauvais calcul de parent

**Cause Probable:**
Ligne 560-630 n'exclut pas les templates

**Debug:**

1. **Ajouter Logging:**
   ```typescript
   console.log('Recherche display nodes...');
   console.log('linkedVariableIds:', originalVar.linkedVariableIds);
   
   // AVANT la recherche:
   const templateIds = new Set(originalVar.linkedVariableIds);
   console.log('templateIds à EXCLURE:', Array.from(templateIds));
   
   // APRÈS la recherche:
   console.log('displayNodes trouvés:', displayNodes.map(n => n.id));
   ```

2. **Vérifier:**
   - `templateIds` et `displayNodes` ne doivent PAS se chevaucher
   - Si overlapping: BUG dans le filter

3. **Vérifier le code:**
   ```typescript
   // ✅ BON:
   const templateIds = new Set(originalVar.linkedVariableIds || []);
   const displayNodes = templateIds.size > 0
     ? nodes.filter(n => 
         !templateIds.has(n.id)  // ← CRUCIAL: Exclure
         && n.linkedVariableIds?.includes(originalVar.id)
       )
     : [];
   
   // ❌ MAUVAIS:
   const displayNodes = nodes.filter(n => 
     n.linkedVariableIds?.includes(originalVar.id)
     // Pas d'exclusion → les templates sont trouvés!
   );
   ```

---

## 🧪 Test d'Intégration Complet

Utilisez ce script pour valider tout le système:

```bash
#!/bin/bash

# 1. Test du Plan
echo "=== 1. TEST DU PLAN ==="
curl -X POST http://localhost:3000/api/repeat/REPEAT_ID/instances/plan \
  -H "x-test-bypass-auth: test" | jq '.plan.variables | length'
# Résultat attendu: 2 (ou N selon nombre de templates)

# 2. Test de l'Exécution
echo -e "\n=== 2. TEST DE L'EXÉCUTION ==="
curl -X POST http://localhost:3000/api/repeat/REPEAT_ID/instances/execute \
  -H "x-test-bypass-auth: test" | jq '.status'
# Résultat attendu: "completed"

# 3. Vérifier le Parent
echo -e "\n=== 3. VÉRIFIER LE PARENT ==="
sqlite3 prisma/dev.db \
  "SELECT name, parentId FROM treeBranchLeafNode WHERE name LIKE '%Orientation%' LIMIT 10;"
# Résultat attendu: parentIds IDENTIQUES pour original et copie
```

---

## 📊 Logs Importants à Rechercher

Quand vous exécutez `/instances/execute`, vérifiez ces logs:

### ✅ Logs Normaux:
```
[REPEAT_EXECUTOR] Starting execution...
[REPEAT_EXECUTOR] Completed 2 node copies
[VARIABLE_COPY_ENGINE] Creating display node...
[PARENT] inherited: null
[PARENT] original: c40d8353-923f-49ac-a3db-91284de99654
[PARENT] resolved: c40d8353-923f-49ac-a3db-91284de99654
```

### ❌ Logs d'Erreur (À Corriger):
```
[PARENT] original: c40d8353-923f...
[PARENT] resolved: node_1757366229474_w8xt9wtqz  ← MAUVAIS!
// → Le parentId du template a été utilisé au lieu du propriétaire

[BLUEPRINT] linkedVariableIds.size: 0  ← MAUVAIS!
// → Les variables liées ne sont pas détectées

[INSTANTIATOR] primaryTargetNodeId: undefined  ← MAUVAIS!
// → Les variables ne sont pas expansées
```

---

## 🔧 Corrections Rapides

### Si: Champ au mauvais endroit
```typescript
// Aller à variable-copy-engine.ts ligne 639
// Changer:
let resolvedParentId = inheritedDisplayParentId
  ?? displayParentId  // ❌ MAUVAIS: saute la priorité 2
  ?? duplicatedOwnerNode.parentId
  ?? null;

// À:
let resolvedParentId = inheritedDisplayParentId
  ?? originalOwnerNode.parentId  // ✅ BON: priorité 2
  ?? displayParentId
  ?? duplicatedOwnerNode.parentId
  ?? null;
```

### Si: Seule une variable au lieu de N
```typescript
// Aller à repeat-blueprint-builder.ts ligne ~120
// S'assurer que:
if (linkedVariableIds.size > 0) {
  // Expansion OK
}
// ET que le code expansion est dans le bloc

// Si le bloc n'existe pas: l'ajouter
```

### Si: IDs non déterministes
```typescript
// Aller à repeat-instantiator.ts ligne ~320
// Changer:
const nodeId = `${variable.nodeId}-${suffix}`;

// À:
const targetTemplateNodeId = (variable as any).primaryTargetNodeId 
  || variable.nodeId;
const nodeId = `${targetTemplateNodeId}-${suffix}`;
```

---

## 📞 QuandContactez l'Équipe

Si après ces steps le problème persiste:

1. **Préparez cette info:**
   ```
   - Nom du repeater
   - Nom de la variable problématique
   - Logs complets de la console
   - Résultat du test plan (curl)
   - IDs actuels vs attendus
   ```

2. **Vérifiez:**
   - Aucune modification récente à variable-copy-engine.ts
   - Aucune modification à repeat-blueprint-builder.ts
   - Aucune modification à repeat-instantiator.ts

3. **Demandez:**
   - Révision du commit
   - Validation des changes
   - Re-exécution du test d'intégration

---

## 🎯 Checklist du Développeur

Avant de commiter:
- [ ] Les 3 fichiers n'ont pas d'erreurs TypeScript
- [ ] Les logs de debug sont supprimés
- [ ] Les commentaires expliquent le POURQUOI
- [ ] L'API test `/instances/execute` fonctionne
- [ ] Le parentId en DB est correct
- [ ] L'UI affiche le champ au bon endroit
- [ ] Pas de console.error() non justifié
- [ ] J'ai lu CRITICAL_REPEATER_REQUIREMENTS.md

---

*Mise à jour: Après résolution du bug de parentId*
