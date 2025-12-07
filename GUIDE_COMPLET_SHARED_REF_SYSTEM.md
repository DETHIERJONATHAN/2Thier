# 📚 GUIDE COMPLET - SYSTÈME DE COPIE REPEATER & SHARED REFERENCES

## 🎯 Vue d'ensemble

Le système CRM utilise des **repeater** pour dupliquer des sections de formulaires. Quand on duplique un repeater (ex: "Toit" → "Toit-1"), le système doit copier:

1. ✅ Les nœuds (champs)
2. ✅ Les variables
3. ✅ Les formules
4. ✅ Les conditions
5. ✅ Les tables

**POINT CRITIQUE**: Toutes les références internes doivent être suffixées avec `-1`, `-2`, etc.

---

## 🏗️ Architecture de Copie

### Flux Principal
```
User clique "Ajouter" sur repeater "Toit"
    ↓
repeat-service.ts appelle repeat-blueprint-builder.ts
    ↓
Crée un plan de duplication (blueprint)
    ↓
repeat-instantiator.ts exécute la copie
    ↓
variable-copy-engine.ts copie les variables
    ↓
copyConditionCapacity() copie les conditions
    ↓
copyFormulaCapacity() copie les formules
    ↓
Résultat: "Toit-1" avec tous les champs et leurs références mises à jour
```

### Fichiers Clés
- `repeat-blueprint-builder.ts` - Planifie la copie
- `variable-copy-engine.ts` - Orchestre la copie des variables
- `copy-capacity-condition.ts` - Copie les CONDITIONS
- `copy-capacity-formula.ts` - Copie les FORMULES
- `copy-capacity-table.ts` - Copie les TABLES

---

## 🔑 Concept: SHARED REFERENCES

### Qu'est-ce qu'une shared-ref?

Une **shared reference** est une référence à une variable identifiée par:
- Format: `shared-ref-[timestamp]-[random-id]`
- Exemple: `shared-ref-1761920215171-5bvime`

C'est un identifiant STABLE qui pointe vers une variable spécifique.

### Où les trouve-t-on?

Les shared-ref apparaissent dans:

1. **Formules** - champ `tokens`:
   ```json
   tokens: ["@value.shared-ref-1761920215171-5bvime"]
   ```

2. **Conditions** - deux endroits:
   ```json
   {
     "when": {
       "left": {
         "ref": "@value.shared-ref-1761920215171-5bvime"   // Dans ref
       }
     },
     "actions": [{
       "nodeIds": ["shared-ref-1761920215171-5bvime"]      // Dans nodeIds
     }]
   }
   ```

### 💡 Point Critique

**Quand on copie un repeater qui contient une variable avec une shared-ref:**

- La shared-ref DOIT être suffixée avec `-1`
- Sinon la formule/condition cherche l'ANCIENNE variable
- Résultat: affichage de `---` au lieu de la valeur

---

## 🐛 LES DEUX BUGS (Maintenant Fixes!)

### BUG 1: Formules ne suffixaient pas les shared-ref

**Fichier**: `copy-capacity-formula.ts`
**Fonction**: `rewriteFormulaTokens()` (lignes 50-100)

#### Avant (❌ BUG)
```typescript
const rewriteString = (str: string): string => {
  return str.replace(/@value\.([A-Za-z0-9_:-]+)/g, (_match, nodeId) => {
    
    // ❌ MAUVAISE RÈGLE
    if (nodeId.startsWith('shared-ref-')) {
      return `@value.${nodeId}`;  // Pas de suffixe!
    }
    
    // ... reste du code
  });
};
```

**Résultat**: `@value.shared-ref-1761920215171-5bvime` → reste inchangé ❌

#### Après (✅ FIX)
```typescript
const rewriteString = (str: string): string => {
  return str.replace(/@value\.([A-Za-z0-9_:-]+)/g, (_match, nodeId) => {
    
    // ✅ BONNE RÈGLE - Traiter uniformément
    const mappedId = idMap.get(nodeId);
    if (mappedId) return `@value.${mappedId}`;
    
    if (suffix !== undefined && !/-\d+$/.test(nodeId)) {
      return `@value.${nodeId}-${suffix}`;  // Avec suffixe!
    }
    
    return `@value.${nodeId}`;
  });
};
```

**Résultat**: `@value.shared-ref-1761920215171-5bvime` → `@value.shared-ref-1761920215171-5bvime-1` ✅

---

### BUG 2: Conditions ne suffixaient pas les shared-ref dans nodeIds

**Fichier**: `copy-capacity-condition.ts`
**Fonction**: `mapNodeIdString()` (lignes 153-185)

#### Avant (❌ BUG)
```typescript
const mapNodeIdString = (raw: string): string => {
  if (typeof raw !== 'string') return raw as unknown as string;
  
  // Cas 1: node-formula
  if (raw.startsWith('node-formula:')) { ... }
  
  // Cas 2: UUID ou node_
  if (uuidRegex.test(raw) || isNodeGen) { ... }
  
  // Cas 3: condition:
  if (raw.startsWith('node-condition:') || raw.startsWith('condition:')) { ... }
  
  // ❌ PAS DE CAS POUR SHARED-REF!
  return raw;
};
```

**Résultat**: `nodeIds: ["shared-ref-1761920196832-4f6a2"]` → reste inchangé ❌

#### Après (✅ FIX)
```typescript
const mapNodeIdString = (raw: string): string => {
  if (typeof raw !== 'string') return raw as unknown as string;
  
  // ✅ CAS 0: shared-ref (nouveau - doit être AVANT node-formula)
  if (raw.startsWith('shared-ref-')) {
    const mapped = nodeIdMap.get(raw);
    if (mapped) return mapped;
    return suffix !== undefined && !/-\d+$/.test(raw) 
      ? `${raw}-${suffix}` 
      : raw;
  }
  
  // Cas 1: node-formula
  if (raw.startsWith('node-formula:')) { ... }
  
  // Cas 2: UUID ou node_
  if (uuidRegex.test(raw) || isNodeGen) { ... }
  
  // Cas 3: condition:
  if (raw.startsWith('node-condition:') || raw.startsWith('condition:')) { ... }
  
  return raw;
};
```

**Résultat**: `nodeIds: ["shared-ref-1761920196832-4f6a2"]` → `nodeIds: ["shared-ref-1761920196832-4f6a2-1"]` ✅

---

## 🚨 RÈGLES À RETENIR POUR NE PAS REFAIRE LES ERREURS

### Règle 1: Toutes les références doivent être suffixées
```
@value.XXX      → @value.XXX-1    ✅
shared-ref-YYY  → shared-ref-YYY-1 ✅ (ceci était oublié!)
node_ZZZ        → node_ZZZ-1      ✅
UUID-ABC        → UUID-ABC-1      ✅
condition:DEF   → condition:DEF-1 ✅
node-formula:GHI → node-formula:GHI-1 ✅
```

### Règle 2: Les shared-ref ne sont PAS ignorées
**FAUX** ❌:
```typescript
if (nodeId.startsWith('shared-ref-')) {
  return nodeId;  // ❌ Ignorer les shared-ref
}
```

**CORRECT** ✅:
```typescript
if (nodeId.startsWith('shared-ref-')) {
  // Appliquer le suffixe comme pour les autres
  return `${nodeId}-${suffix}`;
}
```

### Règle 3: Vérifier TOUS les endroits où les références apparaissent

**Dans une formule**:
```json
tokens: ["@value.shared-ref-...", "+", "@value.autre-..."]
```
→ Les DEUX références doivent être suffixées ✅

**Dans une condition**:
```json
{
  "ref": "@value.shared-ref-...",          // ✅ Suffixé via regex
  "nodeIds": ["shared-ref-..."]            // ❌ Était oublié!
}
```
→ Les DEUX doivent être suffixées ✅

### Règle 4: L'ordre du traitement est important

Dans `mapNodeIdString()`, l'ordre est critique:

```typescript
// ✅ BON ORDRE
1. shared-ref-  (PREMIER - cas nouveau)
2. node-formula:
3. UUID/node_
4. condition:/node-condition:
```

Pourquoi? Parce que `shared-ref-` pourrait matcher avec d'autres patterns. Mettre le cas spécifique AVANT les cas généraux.

### Règle 5: Vérifier que le suffixe n'existe pas déjà

```typescript
const hasSuffix = /-\d+$/.test(nodeId);
if (!hasSuffix) {
  return `${nodeId}-${suffix}`;
}
```

Cela évite de créer des doublons comme `shared-ref-...-1-1`.

---

## 🔍 CHECKLIST AVANT D'AJOUTER UNE NOUVELLE RÉFÉRENCE

Si tu dois ajouter un nouveau type de référence au système:

- [ ] Identifier tous les endroits où elle apparaît (formules, conditions, tables, etc.)
- [ ] Ajouter un cas de suffixage dans `rewriteFormulaTokens()`
- [ ] Ajouter un cas de suffixage dans `mapNodeIdString()`
- [ ] Ajouter un cas de suffixage dans `rewriteTableReferences()` (si applicable)
- [ ] Créer un test de validation
- [ ] Vérifier qu'il y a cohérence (ref ET nodeIds suffixés)
- [ ] Compiler et vérifier les erreurs
- [ ] Tester en réel avec un repeater

---

## 📝 STRUCTURE DES FICHIERS DE COPIE

### `copy-capacity-formula.ts`
**Responsabilité**: Copier une formule et réécrire ses tokens

**Étapes**:
1. Récupérer la formule originale
2. Générer un nouvel ID avec suffixe (`formula-abc-1`)
3. **Réécrire les tokens** avec `rewriteFormulaTokens()`
   - `@value.XXX` → `@value.XXX-1`
4. Créer la nouvelle formule en BDD
5. Mettre à jour les `linkedFormulaIds` du nœud

**Point critique**: Ligne 270 - appel à `rewriteFormulaTokens(nodeIdMap, suffix)`

### `copy-capacity-condition.ts`
**Responsabilité**: Copier une condition et réécrire son JSON

**Étapes**:
1. Récupérer la condition originale
2. Générer un nouvel ID avec suffixe (`cond-abc-1`)
3. **Réécrire le JSON** avec `rewriteConditionSet()`
   - Deux passes: regex globale + parcours objet
   - Regex fixe `@value.XXX` → `@value.XXX-1`
   - Parcours objet fixe `nodeIds` → suffixe les valeurs
4. Créer la nouvelle condition en BDD
5. Mettre à jour les `linkedConditionIds` du nœud

**Points critiques**:
- Ligne 129: Regex pour `@value.XXX`
- Ligne 170: Fonction `mapNodeIdString()` qui traite les nodeIds

---

## 🧪 COMMENT TESTER UN FIX

### Test 1: Unitaire (sans BDD)
```javascript
const rewritten = rewriteFormulaTokens(
  ["@value.shared-ref-1761920215171-5bvime"],
  new Map(),  // nodeIdMap vide
  1           // suffix
);
// Doit retourner: ["@value.shared-ref-1761920215171-5bvime-1"]
```

### Test 2: D'intégration (avec BDD)
```typescript
const result = await copyFormulaCapacity(
  "formula-abc",
  "node-xyz-1",
  1,
  prisma,
  { nodeIdMap: new Map() }
);
// Vérifier que result.tokens contient les -1
```

### Test 3: Réel (dans le formulaire)
1. Créer un repeater avec une formule
2. Dupliquer le repeater
3. Vérifier que le champ affiche la bonne valeur
4. Vérifier que les conditions évaluent correctement

---

## 🎓 EXEMPLE COMPLET: Rampant toiture-1

### État initial (Rampant toiture original)
```json
{
  "id": "node-rampant-original",
  "label": "Rampant toiture",
  "linkedFormulaIds": ["formula-rampant"],
  "linkedConditionIds": ["cond-rampant"]
}
```

### Formule originale
```json
{
  "id": "formula-rampant",
  "nodeId": "node-rampant-original",
  "tokens": ["@value.shared-ref-1761920215171-5bvime"]
}
```

### Condition originale
```json
{
  "id": "cond-rampant",
  "nodeId": "node-rampant-original",
  "conditionSet": {
    "branches": [{
      "when": {
        "left": {
          "ref": "@value.shared-ref-1761920196832-4f6a2"
        }
      },
      "actions": [{
        "nodeIds": ["shared-ref-1761920196832-4f6a2"]
      }]
    }]
  }
}
```

### Après copie (AVANT LES FIXES - ❌ BUG)
```json
// Nœud copié
{
  "id": "node-rampant-1",
  "label": "Rampant toiture-1",
  "linkedFormulaIds": ["formula-rampant-1"],
  "linkedConditionIds": ["cond-rampant-1"]
}

// Formule copiée - BUG: shared-ref pas suffixée
{
  "id": "formula-rampant-1",
  "nodeId": "node-rampant-1",
  "tokens": ["@value.shared-ref-1761920215171-5bvime"]  // ❌ PAS DE -1!
}

// Condition copiée - BUG: shared-ref dans nodeIds pas suffixée
{
  "id": "cond-rampant-1",
  "nodeId": "node-rampant-1",
  "conditionSet": {
    "branches": [{
      "when": {
        "left": {
          "ref": "@value.shared-ref-1761920196832-4f6a2-1"  // ✅ Suffixée via regex
        }
      },
      "actions": [{
        "nodeIds": ["shared-ref-1761920196832-4f6a2"]  // ❌ PAS SUFFIXÉE!
      }]
    }]
  }
}
```

### Après FIXES (✅ CORRECT)
```json
// Formule copiée - FIX: shared-ref suffixée
{
  "id": "formula-rampant-1",
  "nodeId": "node-rampant-1",
  "tokens": ["@value.shared-ref-1761920215171-5bvime-1"]  // ✅ AVEC -1!
}

// Condition copiée - FIX: shared-ref dans nodeIds suffixée
{
  "id": "cond-rampant-1",
  "nodeId": "node-rampant-1",
  "conditionSet": {
    "branches": [{
      "when": {
        "left": {
          "ref": "@value.shared-ref-1761920196832-4f6a2-1"  // ✅ Suffixée
        }
      },
      "actions": [{
        "nodeIds": ["shared-ref-1761920196832-4f6a2-1"]  // ✅ SUFFIXÉE!
      }]
    }]
  }
}
```

### Résultat pour l'utilisateur
- ✅ Affiche `9.0000` (valeur correcte)
- ✅ Les conditions évaluent correctement
- ✅ Les formules recalculent correctement

---

## 🛠️ DEBUGGING: Si ça ne marche pas

### Symptôme: Champ affiche `---`

**Causes possibles**:
1. Reference pas suffixée (FIX: appliquer le suffixe)
2. Reference sufixée deux fois (FIX: vérifier la regex `-\d+$`)
3. Reference pointe vers un nœud qui n'existe pas (FIX: vérifier le nœud)

**Comment déboguer**:
```javascript
// 1. Vérifier la BDD
SELECT id, tokens FROM TreeBranchLeafNodeFormula 
WHERE id LIKE '%rampant-1%';

// 2. Vérifier les tokens
// Chercher: @value.shared-ref-...-1 (avec -1)
// Pas: @value.shared-ref-... (sans -1)

// 3. Vérifier la condition
SELECT id, condition_set FROM TreeBranchLeafNodeCondition 
WHERE id LIKE '%rampant-1%';

// 4. Vérifier nodeIds
// Chercher: "nodeIds": ["shared-ref-...-1"]
// Pas: "nodeIds": ["shared-ref-..."]
```

### Symptôme: Formule/condition ne recalcule pas

**Causes possibles**:
1. Les references ne sont pas suffixées
2. Le nœud n'est pas marqué `hasFormula` ou `hasCondition`
3. L'évaluateur ne peut pas résoudre la référence

**Comment déboguer**:
- Vérifier les tokens/nodeIds dans la BDD
- Vérifier que `hasFormula=true` et `hasCondition=true`
- Tester l'évaluateur manuellement

---

## 📊 TABLEAU RÉCAPITULATIF DES RÉFÉRENCES

| Type | Format | Apparaît | Suffixe? | Fichier |
|------|--------|----------|----------|---------|
| shared-ref | `shared-ref-XXX` | Formules, Conditions | ✅ Maintenant oui | `copy-capacity-*.ts` |
| @value | `@value.XXX` | Formules, Conditions | ✅ Oui | Via regex |
| UUID | `[a-f0-9]{8}-...` | Tous | ✅ Oui | `mapNodeIdString()` |
| node_gen | `node_XXX` | Générés | ✅ Oui | `mapNodeIdString()` |
| condition | `condition:XXX` | Conditions | ✅ Oui | `mapNodeIdString()` |
| node-formula | `node-formula:XXX` | Conditions | ✅ Oui | `mapNodeIdString()` |
| node-condition | `node-condition:XXX` | Conditions | ✅ Oui | `mapNodeIdString()` |

---

## ✅ VALIDATION FINALE

Avant de considérer un fix comme complet:

- [ ] Code compilé sans erreur
- [ ] Tests unitaires passent
- [ ] Tests d'intégration passent
- [ ] Vérifié en réel dans le formulaire
- [ ] Pas de doublons `-1-1-1`
- [ ] Pas d'oublis (ref suffixée ET nodeIds suffixées)
- [ ] Commit enregistré avec message clair
- [ ] Documentation mise à jour

---

**Last updated**: 7 décembre 2025
**Status**: ✅ Tous les fixes appliqués et validés
