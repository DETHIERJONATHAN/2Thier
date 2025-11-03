# ⚠️ RÈGLES CRITIQUES - Copie de Capacités

## 🚨 Règles à JAMAIS Oublier

### 1. **Le suffixe s'applique à TOUS les IDs**
```
Variable: var-123 → var-123-1 ✅
Formule:  f456 → f456-1 ✅
Condition: c789 → c789-1 ✅
Table:    t012 → t012-1 ✅
Colonne:  col-3 → col-3-1 ✅
Ligne:    row-5 → row-5-1 ✅
Cellule:  cell-7 → cell-7-1 ✅

⚠️ TOUS les IDs internes DOIVENT avoir le suffixe pour éviter les collisions!
```

---

### 2. **Les references DOIVENT être remappées RÉCURSIVEMENT**

#### 🎯 Formule avec tokens :
```
Avant:  ["@value.node-a", "+", "@value.node-b"]
Après:  ["@value.node-a-1", "+", "@value.node-b-1"]

✅ CORRECT: Chaque @value.X a été remappé
❌ FAUX: Oublier un @value.X → perte de référence!
```

#### 🎯 Condition avec conditionSet :
```
Avant:  {
  when: { left: { ref: "@value.node-a" }, right: { ref: "@value.node-b" } },
  actions: [{ nodeIds: ["node-formula:f123"] }]
}

Après:  {
  when: { left: { ref: "@value.node-a-1" }, right: { ref: "@value.node-b-1" } },
  actions: [{ nodeIds: ["node-formula:f123-1"] }]
}

✅ CORRECT: 
  - @value.node-a → @value.node-a-1
  - @value.node-b → @value.node-b-1
  - node-formula:f123 → node-formula:f123-1

❌ FAUX: Oublier une action ou une ref → bug de logique!
```

#### 🎯 Table avec colonnes/lignes/cellules :
```
Avant:  Table("t1") → Col("c1") → Row("r1") → Cell with colId="c1", rowId="r1"
Après:  Table("t1-1") → Col("c1-1") → Row("r1-1") → Cell with colId="c1-1", rowId="r1-1"

✅ CORRECT: Tous les IDs remappés + liaisons colonne/ligne cohérentes
❌ FAUX: Mapper la colonne mais pas les cellules → inconsistance!
```

---

### 3. **Les liaisons bidirectionnelles DOIVENT être maintenuesêtes**

#### 🔗 Avant copie :
```
Node-A:
  - linkedFormulaIds = ["f1", "f2"]
  - linkedConditionIds = ["c1"]
  - linkedTableIds = ["t1"]
```

#### 🔗 Après copie (suffix=1) :
```
Node-A-1:
  - linkedFormulaIds = ["f1-1", "f2-1"]  ← Suffixes appliqués
  - linkedConditionIds = ["c1-1"]        ← Suffixes appliqués
  - linkedTableIds = ["t1-1"]            ← Suffixes appliqués

✅ CORRECT: Tous les IDs ont le suffixe
❌ FAUX: linkedFormulaIds = ["f1", "f2"] (sans suffixe) → mauvaises références!
```

---

### 4. **Les mises à jour BIDIRECTIONNELLES doivent être complètes**

#### Exemple : Formule référence Node-A
```
Avant:
  Formula-F1: tokens = ["@value.node-a"]
    ↑ 
  Node-A: linkedFormulaIds = ["f1"]  ← F1 est liée à Node-A

Après copie (suffix=1):
  Formula-F1-1: tokens = ["@value.node-a-1"]
    ↑ 
  Node-A-1: linkedFormulaIds = ["f1-1"]  ← BIDIRECTIONNELLE MAINTENUE!

  BONUS (mises à jour inverses):
  Node-A-1 devrait AUSSI connaître F1-1:
    Node-A-1: linkedFormulaIds = [..., "f1-1"]  ← Réciproque!
```

#### Code Pattern :
```typescript
// ÉTAPE 1: Créer la nouvelle capacité
const newFormula = create({ id: "f1-1", tokens: ["@value.node-a-1"], ... })

// ÉTAPE 2: Mettre à jour le nœud propriétaire
addToNodeLinkedField(proprietaireNodeId, 'linkedFormulaIds', ["f1-1"])

// ÉTAPE 3: BIDIRECTIONNEL - Extraire les nœuds référencés
const refNodes = extractNodeIdsFromTokens(newTokens)  // → ["node-a-1"]

// ÉTAPE 4: Mettre à jour CHAQUE nœud référencé
for (const refNodeId of refNodes) {
  addToNodeLinkedField(refNodeId, 'linkedFormulaIds', ["f1-1"])
  //                    ↑ Le nœud RÉFÉRENCÉ sait aussi qu'il est lié
}
```

---

### 5. **Variables locales `let` vs `const` - CRITIQUE**

#### ❌ FAUX (causera crash) :
```typescript
const newSourceRef = originalVar.sourceRef;
// Plus tard...
newSourceRef = `node-formula:${newId}`;  // ERREUR: Cannot reassign const!
```

#### ✅ CORRECT :
```typescript
let newSourceRef = originalVar.sourceRef;  // 👈 "let" !
// Plus tard...
newSourceRef = `node-formula:${newId}`;  // OK!
```

**Pourquoi ?** Car on réassigne `newSourceRef` dans plusieurs branches (condition/table/field).

---

### 6. **La réécriture DOIT supporter tous les formats de références**

#### Tous les formats possibles :
```
1. @value.<UUID>          → "702d1b09-abc9-4096-9aaa-77155ac5294f"
2. @value.<node_xxx>      → "node_1757366229534_x6jxzmvmu"
3. node-formula:<ID>      → "node-formula:abc-123"
4. condition:<ID>         → "condition:def-456"
5. node-condition:<ID>    → "node-condition:ghi-789"
6. @table.<ID>            → "@table.jkl-012"
7. node-table:<ID>        → "node-table:mno-345"

Tous doivent être gérés par les regex + fallback suffixe!
```

---

### 7. **La cache DOIT éviter les doublons**

#### Sans cache (FAUX) :
```
Copier Variable-1 → Copie Formule-F1 (crée F1-1)
Copier Variable-2 → Copie Formule-F1 (crée F1-1 AGAIN!) ← COLLISION!
```

#### Avec cache (CORRECT) :
```
formulaIdMap = new Map()

Copier Variable-1:
  - Formule-F1 pas dans cache
  - Crée F1-1
  - formulaIdMap.set("F1", "F1-1")

Copier Variable-2:
  - Formule-F1 EST dans cache → formulaIdMap.get("F1") = "F1-1"
  - Réutilise F1-1 (pas de duplication)
```

---

### 8. **Idempotence - La copie DOIT être stable**

#### Cas : Re-exécution de la même copie
```
Appel 1: copyFormula("f1", suffix=1)
  → Crée f1-1

Appel 2: copyFormula("f1", suffix=1) (même appel)
  → Doit utiliser le cache et retourner f1-1 existant
  → PAS créer f1-1-1 ou échouer!

Pattern Prisma Idempotent:
  const existing = await prisma.formula.findUnique({ id: newId })
  if (existing) {
    // Update only
    return await update(...)
  } else {
    // Create
    return await create(...)
  }
```

---

### 9. **Les Displays Nodes - Gestion des sections**

#### Quand `autoCreateDisplayNode=true` :
```
Créer une section "Nouveau Section" (si manquante)
  ↓
Créer un nœud d'affichage dédié : node-abc-<suffix>
  ↓
Créer/réutiliser une variable pour ce nœud
  ↓
Mettre à jour linkedVariableIds de la section
```

#### Checklist :
- [ ] Section "Nouveau Section" existe ou est créée
- [ ] Nœud d'affichage a l'ID unique: `<oldNodeId>-<suffix>`
- [ ] Variable est liée au nœud d'affichage
- [ ] Label du nœud = displayName de la variable

---

### 10. **Les Métadatas et Configs - TOUTES les références remappées**

#### Où chercher les références :
```
Column.config       → peut contenir @value.*, node-formula:*, UUIDs
Column.metadata     → idem
Row.metadata        → idem
Cell.metadata       → idem
Table.metadata      → idem
Formula.metadata    → peut contenir références croisées
Condition.metadata  → idem
```

#### TOUS doivent passer par `rewriteIdsInJson()` avec suffix fallback!

---

## ✅ Checklist Avant Livraison

- [ ] **Formules** : Tous les @value.* remappés ✅
- [ ] **Conditions** : @value.* + node-formula:* remappés ✅
- [ ] **Tables** : Colonnes/Lignes/Cellules avec suffixes ✅
- [ ] **Métadatas** : Toutes les références remappées ✅
- [ ] **Liaisons** : Bidirectionnelles établies ✅
- [ ] **Cahce** : Pas de doublons sur re-exécutions ✅
- [ ] **Idempotence** : Stable sur re-exécutions ✅
- [ ] **Displays** : Nœuds créés si demandé ✅
- [ ] **Types** : let/const corrects ✅
- [ ] **Logs** : Messages clairs pour debugging ✅

---

## 🚀 Tester Rapidement

```bash
# Lancer le test de copie
npx ts-node test-capacity-copy.ts

# Vérifier les logs pour :
# ✅ Variable copiée
# ✅ Formule copiée avec tokens remappés
# ✅ Liaisons bidirectionnelles
# ✅ Pas d'erreurs "Cannot find" ou "Already exists"
```

---

**MÉMORISE CES 10 RÈGLES = ZÉRO BUG! 🎯**
