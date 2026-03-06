# 🔬 ANALYSE COMPLÈTE DU FLUX DE DONNÉES TBL (TreeBranchLeaf)

> **Date** : Janvier 2026  
> **Objectif** : Documenter CHAQUE point de détermination de valeur d'un nœud TBL pour évaluer la faisabilité d'un « Gestionnaire » permettant la modification des valeurs de données.

---

## TABLE DES MATIÈRES

1. [Vue d'ensemble architecturale](#1-vue-densemble-architecturale)
2. [Stockage des valeurs de nœuds (DB)](#2-stockage-des-valeurs-de-nœuds)
3. [Moteur de calcul : Operation Interpreter](#3-moteur-de-calcul--operation-interpreter)
4. [Résolution côté Frontend (Hooks)](#4-résolution-côté-frontend-hooks)
5. [Flux de Soumission (Create-and-Evaluate)](#5-flux-de-soumission-create-and-evaluate)
6. [Résolution Table Lookup](#6-résolution-table-lookup)
7. [Rendu Document/PDF](#7-rendu-documentpdf)
8. [Capacité Data (Variables Exposées)](#8-capacité-data-variables-exposées)
9. [Structure des Tokens de Formule](#9-structure-des-tokens-de-formule)
10. [Diagrammes de flux](#10-diagrammes-de-flux)
11. [Impact pour le Gestionnaire](#11-impact-pour-le-gestionnaire)

---

## 1. Vue d'ensemble architecturale

### Flux global de données

```
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                           │
│                                                                  │
│  Utilisateur saisit → formData = { nodeId: value }              │
│         │                                                        │
│         ▼                                                        │
│  useTBLSave.ts → POST /api/tbl/submissions/create-and-evaluate  │
│         │                                                        │
│  Hooks écoutent événements CustomEvent :                         │
│    - tbl-node-updated                                            │
│    - tbl-force-retransform (avec calculatedValues inline)        │
│         │                                                        │
│  useBackendValue / useCalculatedFieldValue / useTBLTableLookup  │
│  affichent la valeur calculée reçue du backend                  │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│              BACKEND (Node.js / Express)                         │
│                                                                  │
│  tbl-submission-evaluator.ts (routes)                            │
│    │                                                             │
│    ├─ saveUserEntriesNeutral() → SubmissionData (neutral)        │
│    │                                                             │
│    └─ evaluateCapacitiesForSubmission()                          │
│         │                                                        │
│         ▼                                                        │
│  operation-interpreter.ts (moteur de calcul)                     │
│    evaluateVariableOperation()                                   │
│         │                                                        │
│         ├─ interpretReference() ← dispatcher récursif            │
│         │    ├─ interpretCondition()                              │
│         │    ├─ interpretFormula()                                │
│         │    ├─ interpretTable()                                  │
│         │    └─ interpretField()                                  │
│         │                                                        │
│         └─ → SubmissionData (formula/condition/table)            │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│              BASE DE DONNÉES (PostgreSQL / Prisma)               │
│                                                                  │
│  TreeBranchLeafSubmissionData (VALEUR DE RÉFÉRENCE)              │
│    .value / .operationResult / .operationSource                  │
│                                                                  │
│  TreeBranchLeafNode (STRUCTURE & config seulement)               │
│    .calculatedValue = ⚠️ DÉPRÉCIÉ (global, pas scoped)          │
│                                                                  │
│  TreeBranchLeafNodeVariable (config DATA capability)             │
│  TreeBranchLeafNodeFormula (tokens de formule)                   │
│  TreeBranchLeafNodeTable (tables de lookup)                      │
└──────────────────────────────────────────────────────────────────┘
```

### Fichiers clés

| Fichier | Lignes | Rôle |
|---------|--------|------|
| [tbl-submission-evaluator.ts](src/components/TreeBranchLeaf/tbl-bridge/routes/tbl-submission-evaluator.ts) | 4219 | Routes API + orchestration évaluation |
| [operation-interpreter.ts](src/components/TreeBranchLeaf/treebranchleaf-new/api/operation-interpreter.ts) | 3697 | Moteur de calcul : formules, conditions, tables |
| [useBackendValue.ts](src/components/TreeBranchLeaf/treebranchleaf-new/TBL/hooks/useBackendValue.ts) | 383 | Hook frontend : valeur calculée |
| [useCalculatedFieldValue.ts](src/components/TreeBranchLeaf/treebranchleaf-new/TBL/hooks/useCalculatedFieldValue.ts) | ~250 | Hook frontend : champs DISPLAY |
| [useTBLTableLookup.ts](src/components/TreeBranchLeaf/treebranchleaf-new/TBL/hooks/useTBLTableLookup.ts) | 1018 | Hook frontend : options SELECT depuis tables |
| [useTBLSave.ts](src/components/TreeBranchLeaf/treebranchleaf-new/TBL/hooks/useTBLSave.ts) | ~100 | Hook frontend : sauvegarde et évaluation |
| [TBLBatchContext.tsx](src/components/TreeBranchLeaf/treebranchleaf-new/TBL/contexts/TBLBatchContext.tsx) | 203 | Cache batch partagé entre composants |
| [documentPdfRenderer.ts](src/services/documentPdfRenderer.ts) | 5319 | Rendu PDF avec substitution de variables |
| [documents.ts](src/routes/documents.ts) | 2144 | Routes API de génération de documents |
| [FormulaPanel.tsx](src/components/TreeBranchLeaf/treebranchleaf-new/components/Parameters/capabilities/FormulaPanel.tsx) | 1223 | UI création de formules (tokens) |
| [DataPanel.tsx](src/components/TreeBranchLeaf/treebranchleaf-new/components/Parameters/capabilities/DataPanel.tsx) | 1400 | UI data capability (variables exposées) |

---

## 2. Stockage des valeurs de nœuds

### 2.1 TreeBranchLeafSubmissionData — LA source de vérité

**Fichier** : [prisma/schema.prisma](prisma/schema.prisma#L2035)

```
TreeBranchLeafSubmissionData
├── id            : String @id
├── submissionId  : String          ← scope par soumission
├── nodeId        : String          ← quel nœud
├── value         : String?         ← valeur brute (input user OU résultat calculé)
├── operationResult : Json?         ← résultat structuré de l'opération
├── operationSource : String?       ← 'neutral' | 'formula' | 'condition' | 'table' | 'field'
├── operationDetail : Json?         ← trace complète du calcul (humanText, details)
├── sourceRef       : String?       ← référence source (@value.xxx, formula:xxx...)
├── fieldLabel      : String?       ← label du nœud source
├── isVariable      : Boolean       ← si c'est une variable DATA exposée
├── variableDisplayName : String?   ← nom d'affichage de la variable
├── variableKey     : String?       ← clé exposée (exposedKey)
├── variableUnit    : String?       ← unité
└── UNIQUE [submissionId, nodeId]   ← une seule valeur par nœud par soumission
```

**Rôle** : Chaque soumission (devis) a ses propres valeurs. C'est le storage **submission-scoped** qui fait autorité.

### 2.2 TreeBranchLeafNode.calculatedValue — ⚠️ DÉPRÉCIÉ

**Fichier** : [prisma/schema.prisma](prisma/schema.prisma#L1617)

```
TreeBranchLeafNode
├── calculatedValue : String?   ← ⚠️ GLOBAL (pas scoped par soumission)
├── calculatedAt    : DateTime? ← dernière date de calcul
├── calculatedBy    : String?   ← qui a calculé
└── ... (~150 autres champs)
```

**⚠️ CRITIQUE** : `calculatedValue` est un champ **GLOBAL** qui était autrefois utilisé pour stocker les résultats. Il a été identifié comme source de « ghost data » (FIX 30/01/2026) car les anciennes valeurs polluaient les nouvelles soumissions. L'`operation-interpreter` ne lit plus jamais `calculatedValue` dans `getNodeValue()`.

### 2.3 TreeBranchLeafNodeVariable — Config DATA capability

**Fichier** : [prisma/schema.prisma](prisma/schema.prisma#L1914)

```
TreeBranchLeafNodeVariable
├── id             : String @id
├── nodeId         : String  @unique  ← 1 variable par nœud
├── exposedKey     : String  @unique  ← clé publique (ex: "puissance_totale_wc")
├── displayName    : String?          ← nom lisible
├── sourceType     : String  @default("fixed")  ← 'fixed' | 'tree' | 'formula'
├── sourceRef      : String?          ← réf: @value.xxx, formula:xxx, condition:xxx, @table.xxx
├── fixedValue     : String?          ← valeur si sourceType='fixed'
├── defaultValue   : String?          ← fallback
├── displayFormat  : String?          ← format d'affichage
├── unit           : String?          ← unité (kWc, €, m²...)
├── precision      : Int?             ← décimales
├── visibleToUser  : Boolean @default(true)
└── isReadonly      : Boolean @default(false)
```

### 2.4 TreeBranchLeafNodeFormula — Tokens de formule

**Fichier** : [prisma/schema.prisma](prisma/schema.prisma#L1825)

```
TreeBranchLeafNodeFormula
├── id               : String @id
├── nodeId           : String         ← nœud propriétaire
├── name             : String         ← nom de la formule
├── tokens           : Json  @default("[]")  ← tableau de tokens (voir §9)
├── targetProperty   : String?        ← null=calcul direct, 'number_max', 'number_min', 'step', etc.
├── constraintMessage: String?        ← message d'erreur pour contraintes
└── UNIQUE [nodeId, name]
```

### 2.5 TreeBranchLeafNodeTable — Tables de lookup

**Fichier** : [prisma/schema.prisma](prisma/schema.prisma#L1857)

```
TreeBranchLeafNodeTable
├── id             : String @id
├── nodeId         : String          ← nœud propriétaire
├── name           : String          ← nom de la table
├── type           : String          ← type de table
├── meta           : Json  @default("{}")  ← CONFIG LOOKUP (voir §6)
├── sourceTableId  : String?         ← pour les vues (pointe vers table source)
├── columns[]      → TreeBranchLeafNodeTableColumn
└── rows[]         → TreeBranchLeafNodeTableRow (cells: Json)
```

---

## 3. Moteur de calcul : Operation Interpreter

**Fichier** : [operation-interpreter.ts](src/components/TreeBranchLeaf/treebranchleaf-new/api/operation-interpreter.ts)  
**Taille** : 3697 lignes, 8 modules

### 3.1 Architecture modulaire

```
Module 1 : identifyReferenceType()        ← L115-200
Module 2 : enrichDataFromSubmission()      ← L290-500
Module 3 : interpretReference()            ← L660-800 (dispatcher récursif)
Module 4 : interpretCondition()            ← L960-1500
Module 5 : interpretFormula()              ← L1900-2120
Module 6 : interpretTable()                ← L2130-3570
Module 7 : interpretField()                ← L3570-3640
Module 8 : evaluateVariableOperation()     ← L3640-3697 (point d'entrée API)
```

### 3.2 Module 1 : identifyReferenceType() — L115

Identifie le type d'une référence string pour déterminer le module de calcul :

| Pattern | Type identifié | Exemple |
|---------|---------------|---------|
| `@value.{uuid}` | `'field'` | `@value.10bfb6d2-67ae-...` |
| `@select.{uuid}` | `'field'` | `@select.abc123...` |
| `@table.{uuid}` | `'table'` | `@table.def456...` |
| `@calculated.{uuid}` | `'value'` | `@calculated.abc123` |
| `node-formula:{uuid}` | `'formula'` | `node-formula:abc123...` |
| `formula:{uuid}` | `'formula'` | `formula:abc123...` (FIX R27) |
| `condition:{uuid}` | `'condition'` | `condition:abc123...` |
| `node-table:{uuid}` | `'table'` | `node-table:abc123...` |
| `shared-ref-{id}` | `'field'` | `shared-ref-176409...` |
| UUID nu | `'field'` | `10bfb6d2-67ae-49a8...` |

### 3.3 Module 2 : enrichDataFromSubmission() — L290

**Rôle** : Charge TOUTES les valeurs d'une soumission dans le `valueMap` et tous les labels dans le `labelMap`.

**Flux** :
1. Charge `TreeBranchLeafSubmissionData` (tous les records de la soumission)
2. Pour chaque record : `valueMap.set(nodeId, value)` — **SAUF si la clé existe déjà** (formData prioritaire)
3. Charge tous les `TreeBranchLeafNode` du tree → `labelMap.set(nodeId, label)`
4. Charge les données du Lead (lead.firstName, lead.postalCode, etc.)

**⚠️ FIX 30/01/2026** : Ne charge plus JAMAIS `calculatedValue` depuis `TreeBranchLeafNode`. Avant ce fix, les valeurs globales polluaient les nouvelles soumissions.

### 3.4 getNodeValue() — L506

**La fonction la plus critique** : détermine la valeur d'un nœud.

**Priorité de résolution** :
```
1. valueMap.get(nodeId)           ← formData frais (priorité maximale)
2. SubmissionData.value           ← DB scoped par soumission
3. return "0"                     ← valeur par défaut (ou "" si preserveEmpty=true)
```

**⚠️ Fallbacks SUPPRIMÉS** (anciens dangers) :
- ~~Recherche par suffixe (-1, -2)~~ → supprimé
- ~~`TreeBranchLeafNode.calculatedValue`~~ → supprimé (ghost data)

### 3.5 Module 3 : interpretReference() — L660

**Le dispatcher récursif universel.** Toute résolution de valeur passe par ici.

```
interpretReference(ref, submissionId, prisma, cache, depth, valueMap, labelMap)
  │
  ├─ identifyReferenceType(ref) → type
  │
  ├─ SI cache.has(ref) → return cache
  │
  ├─ SI depth > 10 → return "0" (protection anti-boucle)
  │
  ├─ SWITCH type:
  │   ├─ 'condition' → interpretCondition()
  │   ├─ 'formula'   → interpretFormula()
  │   ├─ 'table'     → interpretTable()
  │   ├─ 'field'     → interpretField()
  │   └─ 'value'     → getNodeValue() + auto-sum copies
  │
  └─ cache.set(ref, result) → return result
```

**Auto-sum copies** : Pour les patterns `@calculated.{baseNodeId}`, le système additionne automatiquement la valeur du nœud de base + toutes ses copies repeater (baseNodeId-1, baseNodeId-2, etc.).

### 3.6 Module 4 : interpretCondition() — L960

**Structure d'une condition** :
```json
{
  "conditionSet": {
    "mode": "first-match",          // ou classique (single-branch)
    "branches": [
      {
        "when": {
          "op": "eq|ne|gt|gte|lt|lte|isEmpty|isNotEmpty|contains|startsWith",
          "left": { "ref": "@value.xxx" },
          "right": { "ref": "@value.yyy" } // ou { "value": "42" }
        },
        "actions": [
          { "type": "show|hide|set-value", "nodeIds": ["..."], "value": "..." }
        ]
      }
    ],
    "fallback": {
      "actions": [...]
    }
  }
}
```

**Flux** :
1. Récupère la config condition depuis `TreeBranchLeafNode.condition_conditionSet`
2. Pour chaque branche :  
   a. Résout `left.ref` et `right.ref` récursivement via `interpretReference()`  
   b. Compare avec l'opérateur  
   c. Si match → résout les actions THEN  
3. Si aucun match → résout le fallback (ELSE)
4. Retourne `{ result, humanText, details }`

### 3.7 Module 5 : interpretFormula() — L1900

**Flux** :
1. Charge les tokens depuis `TreeBranchLeafNodeFormula` (par nodeId et formulaId)
2. Construit l'expression mathématique via `buildFormulaExpression()`
3. Pour chaque token de type variable :
   - Parse via `tryParseTokenReference()` (supporte @value., @calculated., node-formula:, etc.)
   - Résout récursivement via `interpretReference()`
   - Remplace dans l'expression
4. Évalue via `evaluateExpression()` de `formulaEngine.js`
5. Retourne `{ result, humanText, details }`

### 3.8 Module 6 : interpretTable() — L2130

**3 modes de lookup** :

| Mode | Condition | Description |
|------|-----------|-------------|
| **MODE 1** | `displayColumn` activé, `displayRow` désactivé | Lookup par colonne seule |
| **MODE 2** | `displayRow` activé, `displayColumn` désactivé | Lookup par ligne seule |
| **MODE 3** | Les deux activés | Croisement dynamique ligne × colonne |

**Sources de sélection** (d'où vient la valeur de lookup) :
- **SELECT** : Valeur d'un champ select de l'utilisateur
- **FIELD** : Valeur d'un autre nœud
- **CAPACITY** : Exécution d'une formule/condition via `interpretReference()`

**Fonctions clés** :
- `getSourceValue()` : résout la valeur de la source selon le type
- `getSourceLabel()` : résout le label pour l'affichage humain
- `findClosestIndexInLabels()` : matching numérique closest-match pour les valeurs numériques
- UUID → label resolution : convertit les UUID d'options SELECT en labels lisibles

### 3.9 Module 7 : interpretField() — L3570

**Le cas le plus simple** : récupère la valeur d'un champ saisi par l'utilisateur via `getNodeValue()`.

Vérifie aussi si le nœud est en fait une table (type `leaf_table_*`) et redirige vers `interpretTable()` si nécessaire.

### 3.10 Module 8 : evaluateVariableOperation() — L3640

**LE point d'entrée API principal.** Appelé par les routes pour évaluer une variable DATA.

```typescript
export async function evaluateVariableOperation(
  variableNodeId: string,
  submissionId: string,
  prisma: PrismaClient,
  valueMap?: Map<string, unknown>,
  options?: VariableEvalOptions
): Promise<{
  value: string;
  operationDetail: any;
  operationResult: string;
  operationSource: 'condition' | 'formula' | 'table' | 'field' | 'fixed';
  sourceRef: string;
}>
```

**Flux** :
1. **ÉTAPE 0** : Récupère `treeId` depuis le nœud
2. **ÉTAPE 0b** : Initialise `valueMap` et `labelMap`
   - Si `valueMap` fourni (mode évaluateur) : NE PAS appeler `enrichDataFromSubmission` (FIX R8)
   - Sinon (mode standalone) : enrichir depuis la DB
3. **ÉTAPE 1** : Récupère `TreeBranchLeafNodeVariable` (config)
4. **ÉTAPE 2** : Switch sur `sourceType` :
   - `'fixed'` → retourne `fixedValue` directement
   - `'tree'` → `interpretReference(sourceRef, ...)` récursivement
   - `'formula'` → `interpretReference(sourceRef, ...)` récursivement
   - default → retourne `defaultValue`

**Retour** : `{ value, operationDetail, operationResult, operationSource, sourceRef }`

---

## 4. Résolution côté Frontend (Hooks)

### 4.1 useBackendValue — L1-383

**Fichier** : [useBackendValue.ts](src/components/TreeBranchLeaf/treebranchleaf-new/TBL/hooks/useBackendValue.ts)

**Rôle** : Affiche la valeur calculée d'un nœud dans l'UI.

**Cascade de résolution** :
```
1. TBLBatchContext.getCalculatedValueForNode(nodeId)  ← cache batch
   │
2. Écoute CustomEvent 'tbl-force-retransform'         ← valeurs inline
   │  (event.detail.calculatedValues[nodeId])
   │
3. GET /api/tree-nodes/${nodeId}/calculated-value      ← API fallback
   │  ?submissionId=...
   │
4. POST /api/tbl/submissions/preview-evaluate          ← évaluation à la volée
   │  { treeId, formData, baseSubmissionId, nodeId }
   │
5. lastValidValue.current                              ← protection anti-vide
```

**Protections** :
- `isChangeInProgress()` : bloque les lectures DB stale pendant les mises à jour
- `lastValidValue` ref : ne remplace jamais une valeur valide par une valeur vide

### 4.2 useCalculatedFieldValue

**Fichier** : [useCalculatedFieldValue.ts](src/components/TreeBranchLeaf/treebranchleaf-new/TBL/hooks/useCalculatedFieldValue.ts)

Similaire à `useBackendValue` mais spécialisé pour les champs DISPLAY.

**Cascade** :
```
1. TBLBatchContext cache
2. CustomEvent 'tbl-node-updated' (event.detail.value)
3. CustomEvent 'tbl-force-retransform' (inline calculatedValues)
4. POST /api/tbl/submissions/preview-evaluate
```

### 4.3 useTBLTableLookup — L1-1018

**Fichier** : [useTBLTableLookup.ts](src/components/TreeBranchLeaf/treebranchleaf-new/TBL/hooks/useTBLTableLookup.ts)

**Rôle** : Charge les options d'un SELECT field depuis les tables configurées via TablePanel.

**Caches globaux** :
- `selectConfigCache` : config SELECT par nœud
- `lookupResultCache` : résultats de lookup
- `lookupCacheGeneration` : invalidation versionnée

**Écoute** : `tbl-force-retransform` pour obtenir les valeurs fraîches (calculées) utilisées dans le filtrage des options SELECT.

### 4.4 TBLBatchContext — Cache partagé

**Fichier** : [TBLBatchContext.tsx](src/components/TreeBranchLeaf/treebranchleaf-new/TBL/contexts/TBLBatchContext.tsx)

Charge les données batch **UNE SEULE FOIS** et les partage entre tous les composants TBL enfants :

```typescript
interface TBLBatchContextValue {
  getFormulasForNode: (nodeId: string) => BatchFormula[];
  getCalculatedValueForNode: (nodeId: string) => BatchCalculatedValue | null;
  getSelectConfigForNode: (nodeId: string) => BatchSelectConfig | null;
  getNodeDataForNode: (nodeId: string) => BatchNodeData | null;
  getConditionsForNode: (nodeId: string) => BatchCondition[];
  getConditionById: (conditionId: string) => BatchCondition | null;
  getActiveConditionForNode: (nodeId: string) => BatchCondition | null;
  getConditionsTargetingNode: (nodeId: string) => InverseConditionInfo[];
  refresh: () => void;
}
```

### 4.5 Système d'événements (CustomEvents)

| Événement | Émetteur | Données | Consommateurs |
|-----------|----------|---------|---------------|
| `tbl-node-updated` | useTBLSave | `{ nodeId, value }` | useCalculatedFieldValue |
| `tbl-force-retransform` | useTBLSave (après create-and-evaluate) | `{ submissionId, calculatedValues: { [nodeId]: value } }` | useBackendValue, useCalculatedFieldValue, useTBLTableLookup |

**Le broadcast `tbl-force-retransform` est CRITIQUE** : il transporte les valeurs calculées **inline** (directement dans l'événement) pour que le frontend n'ait PAS à relire la DB (évite les lectures stale).

---

## 5. Flux de Soumission (Create-and-Evaluate)

### 5.1 Route principale : POST /api/tbl/submissions/create-and-evaluate

**Fichier** : [tbl-submission-evaluator.ts](src/components/TreeBranchLeaf/tbl-bridge/routes/tbl-submission-evaluator.ts#L3033)

**Payload entrant** :
```json
{
  "treeId": "...",
  "clientId": "lead-uuid",
  "formData": { "nodeId1": "value1", "nodeId2": "value2" },
  "status": "draft",
  "changedFieldId": "nodeId1",
  "evaluationMode": "change|open|autosave",
  "reuseSubmissionId": "...",
  "submissionId": "...",
  "forceNewSubmission": false
}
```

**Flux complet** :

```
1. VALIDATION
   ├─ Vérifier organizationId, userId
   ├─ Vérifier leadId (obligatoire sauf default-draft)
   └─ Résoudre treeId

2. SOUMISSION
   ├─ Si submissionId fourni → vérifier propriété org
   │   ├─ Si completed et non-admin → cloneCompletedSubmissionToDraft()
   │   └─ Si completed et admin → édition in-place
   ├─ Si pas de submissionId → chercher draft existant (même lead+tree)
   └─ Si toujours pas → créer nouvelle soumission

3. SAUVEGARDE INPUTS  →  saveUserEntriesNeutral()
   ├─ Exclure les DISPLAY nodes (hasFormula, hasCondition, fieldType='DISPLAY')
   │   └─ FIX E2: Re-inclure les nœuds avec UNIQUEMENT des formules de contrainte
   ├─ Résoudre sharedReferences (aliases)
   ├─ Pour chaque formData entry :
   │   ├─ Si vide → DELETE SubmissionData
   │   └─ Si rempli → UPSERT SubmissionData avec operationSource='neutral'
   └─ Batch save (1 findMany + 1 transaction)

4. ÉVALUATION  →  evaluateCapacitiesForSubmission()
   ├─ Construire valueMap (formData frais + DB existante + Lead data)
   ├─ Pour chaque variable DATA du tree :
   │   └─ evaluateVariableOperation(nodeId, submissionId, prisma, valueMap)
   ├─ Pour chaque DISPLAY field (si mode != 'autosave') :
   │   └─ Même évaluation
   └─ UPSERT résultats dans SubmissionData

5. RÉPONSE
   └─ { submission: { id, treeId, TreeBranchLeafSubmissionData: [...] }, freshlyComputedNodeIds: [...] }
```

### 5.2 saveUserEntriesNeutral() — L655

**Fichier** : [tbl-submission-evaluator.ts](src/components/TreeBranchLeaf/tbl-bridge/routes/tbl-submission-evaluator.ts#L655)

**Rôle** : Sauvegarde les inputs utilisateur dans `SubmissionData` avec `operationSource='neutral'`.

**Exclusions** :
- `fieldType = 'DISPLAY'`
- `subType = 'display'`
- `hasFormula = true` (sauf si toutes les formules ont `targetProperty != null` = contraintes seulement)
- `hasCondition = true`

**Cache** : Les nœuds exclus sont cachés par `treeId` avec TTL (`excludedNodesCache`).

### 5.3 evaluateCapacitiesForSubmission() — L873

**Fichier** : [tbl-submission-evaluator.ts](src/components/TreeBranchLeaf/tbl-bridge/routes/tbl-submission-evaluator.ts#L873)

**Modes d'évaluation** :

| Mode | Quand | Comportement |
|------|-------|-------------|
| `'open'` | Ouverture d'un brouillon, transfert lead | Recalcul COMPLET de tous les DISPLAY |
| `'autosave'` | Sauvegarde périodique | Skip les DISPLAY (optimisation) |
| `'change'` | Modification utilisateur | Recalcul CIBLÉ via triggers |

**Construction du valueMap** :
1. Charge Lead data → `valueMap.set('lead.firstName', ...)`
2. Charge SubmissionData existantes → `valueMap` (via `applySharedReferenceValues`)
3. Applique formData frais (override) → `valueMap`
4. Restaure les valeurs DB des DISPLAY fields absents du formData (FIX C)
5. En mode `'open'` : supprime toutes les valeurs DISPLAY du valueMap (force recalcul)
6. Résout les LINK fields (nœuds qui pointent vers d'autres nœuds)

### 5.4 Route preview-evaluate

**Fichier** : [tbl-submission-evaluator.ts](src/components/TreeBranchLeaf/treebranchleaf-new/../../tbl-bridge/routes/tbl-submission-evaluator.ts#L3514)

**Différence avec create-and-evaluate** : Preview-evaluate est **en mémoire uniquement** (aucune écriture en base). Utilisé pour :
- Prévisualisation avant sauvegarde
- Évaluation à la volée d'un seul nœud
- Migration / test de changements

---

## 6. Résolution Table Lookup

### 6.1 Configuration du lookup (meta.lookup)

Stocké dans `TreeBranchLeafNodeTable.meta.lookup` :

```json
{
  "lookup": {
    "fieldId": "uuid-du-select",           // nœud source SELECT
    "displayColumn": true,                  // activer lookup par colonne
    "displayRow": true,                     // activer lookup par ligne  
    "displayColumnIndex": 3,                // index de la colonne de résultat
    "displayRowIndex": 2,                   // index de la ligne de résultat
    "operator": "eq|closest|contains",      // opérateur de matching
    "colFieldId": "uuid-du-select-col",     // source pour la colonne (MODE 3)
    "rowFieldId": "uuid-du-select-row",     // source pour la ligne (MODE 3)
    "colSourceOption": "SELECT|FIELD|CAPACITY", // type de source colonne
    "rowSourceOption": "SELECT|FIELD|CAPACITY", // type de source ligne
    "filterRows": [...],                    // filtrage de lignes
    "extractMode": "value|label"            // quoi extraire
  }
}
```

### 6.2 Flux de résolution (3 modes)

**MODE 1 — Column-enabled** (displayColumn=true, displayRow=false) :
```
1. getSourceValue(colSourceOption, ...) → sélection utilisateur
2. UUID → label resolution si nécessaire
3. Trouver l'index de la colonne via findClosestIndexInLabels()
4. Chercher dans data[row][colIndex]
```

**MODE 2 — Row-enabled** (displayRow=true, displayColumn=false) :
```
Même logique mais sur les lignes au lieu des colonnes
```

**MODE 3 — Croisement dynamique** (les deux activés) :
```
1. getSourceValue() pour ROW et COLUMN séparément
2. UUID → label resolution
3. Auto-détection : cherche chaque valeur dans ROWS ET COLUMNS
4. Auto-inversion si rowValue trouvée dans columns et colValue trouvée dans rows
5. Lookup dans data[rowIndex][colIndex]
```

### 6.3 findClosestIndexInLabels()

Matching numérique intelligent :
- Match exact d'abord
- Si pas de match exact ET valeur numérique → trouve l'intervalle le plus proche (closest match)
- Utilisé pour les tables de valorisation (ex: puissance → prix)

---

## 7. Rendu Document/PDF

### 7.1 Construction du tblData

**Fichier** : [documents.ts](src/routes/documents.ts#L981)

Quand un document est généré :
1. Le frontend envoie `tblData` (snapshot des données TBL) dans `POST /api/documents/generated/generate`
2. Le backend le stocke dans `GeneratedDocument.dataSnapshot`
3. Le renderer reçoit `tblData` dans le `RenderContext`

### 7.2 substituteVariables() — L4112

**Fichier** : [documentPdfRenderer.ts](src/services/documentPdfRenderer.ts#L4112)

Remplace les variables dans les textes des sections de document :

```typescript
private substituteVariables(text: string): string {
  // 1. @value.xxx, @select.xxx, @calculated.xxx
  result.replace(/@(value|select|calculated)\.([a-zA-Z0-9_.-]+)/g, ...)
  
  // 2. {{xxx.yyy}} (double accolades)
  result.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, ...)
  
  // 3. {lead.xxx}, {quote.xxx}, {org.xxx}
  result.replace(/\{(lead|quote|org)\.([a-zA-Z0-9_.]+)\}/g, ...)
}
```

### 7.3 resolveVariable() — L4172

**Fichier** : [documentPdfRenderer.ts](src/services/documentPdfRenderer.ts#L4172)

**Cascade de résolution** :
```
1. formulaResultsMap[ref]           ← pré-résolu par interpretReference()
2. lead.xxx                         ← données du Lead
3. org.xxx                          ← données de l'Organisation
4. quote.xxx                        ← données du Devis
5. @value.xxx / @select.xxx         ← tblData[nodeRef]
   ├─ tblData[exact]
   ├─ tblData.values[exact]
   ├─ tblData[partial match]
   └─ tblData.values[partial match]
6. node-formula:xxx / formula:xxx   ← formulaResultsMap ou tblData.formulas
7. @calculated.xxx                  ← formulaResultsMap
8. dataBinding (via data-binding)   ← exposedKey → tblData[variableKey]
```

### 7.4 Data Binding dans les documents

Les composants de document (titres, textes, tableaux de prix...) peuvent avoir un `dataBinding` qui pointe vers une variable TBL exposée. Le renderer résout cette liaison via `resolveVariable()`.

---

## 8. Capacité Data (Variables Exposées)

### 8.1 Concept

La « Data capability » transforme un nœud TBL en **variable exposée** accessible par :
- D'autres formules/conditions/tables (via `@value.{nodeId}` ou `@calculated.{nodeId}`)
- Les documents PDF (via `dataBinding`)
- L'export de données

### 8.2 DataPanel UI

**Fichier** : [DataPanel.tsx](src/components/TreeBranchLeaf/treebranchleaf-new/components/Parameters/capabilities/DataPanel.tsx)

**DataInstance structure** :
```typescript
type DataInstance = {
  id: string;
  name: string;
  config: {
    exposedKey: string;           // clé publique unique
    sourceType: 'fixed' | 'tree'; // source de la valeur
    fixedValue?: string;           // si fixed
    sourceRef?: string;            // si tree: @value.xxx, formula:xxx, condition:xxx...
    sourceRefName?: string;        // label de la source
    displayFormat?: string;
    unit?: string;
    precision?: number;
    visibleToUser?: boolean;
  }
};
```

### 8.3 Cycle de vie d'une variable

```
1. CONFIGURATION (DataPanel.tsx)
   └─ User crée une DataInstance avec exposedKey + sourceRef
   └─ Sauvegardé dans TreeBranchLeafNodeVariable

2. ÉVALUATION (operation-interpreter.ts)
   └─ evaluateVariableOperation() lit la config
   └─ interpretReference(sourceRef) résout récursivement
   └─ Résultat stocké dans SubmissionData

3. CONSOMMATION
   ├─ Frontend : useCalculatedFieldValue / useBackendValue
   ├─ Autres formules : @value.nodeId, @calculated.nodeId
   ├─ Documents PDF : dataBinding → resolveVariable()
   └─ Export : SubmissionData.value avec variableKey
```

---

## 9. Structure des Tokens de Formule

### 9.1 Format des tokens

**Fichier** : [FormulaPanel.tsx](src/components/TreeBranchLeaf/treebranchleaf-new/components/Parameters/capabilities/FormulaPanel.tsx)

Les tokens sont stockés comme `Json` (tableau de strings) dans `TreeBranchLeafNodeFormula.tokens`.

**Types de tokens** :

| Type | Format | Exemple |
|------|--------|---------|
| Nombre | `"42"`, `"3.14"` | `"100"` |
| Opérateur | `"+"`, `"-"`, `"*"`, `"/"` | `"+"` |
| Parenthèse | `"("`, `")"` | `"("` |
| Référence field | `@value.{uuid}` | `"@value.10bfb6d2-67ae-..."` |
| Référence select | `@select.{uuid}` | `"@select.abc123..."` |
| Référence calculée | `@calculated.{uuid}` | `"@calculated.abc123..."` |
| Référence formule | `node-formula:{uuid}` | `"node-formula:abc123..."` |
| Référence condition | `condition:{uuid}` | `"condition:abc123..."` |
| Référence table | `@table.{uuid}` | `"@table.abc123..."` |
| Référence partagée | `shared-ref-{id}` | `"shared-ref-176409..."` |
| Texte | `"text:xxx"` | `"text:TVA"` |

### 9.2 tryParseTokenReference()

**Dans operation-interpreter.ts** : Parse un token pour extraire la référence et son type. Supporte tous les formats ci-dessus + le format legacy `formula:` (sans `node-` prefix).

### 9.3 Évaluation des expressions

**Fichier** : `formulaEngine.js`

```typescript
evaluateExpression(expression, roleMap, options)
evaluateTokens(tokens, options)
```

Le `formulaEngine` gère :
- Opérations mathématiques (+, -, *, /, ^, %)
- Comparaisons (==, !=, >, >=, <, <=)
- Fonctions (MIN, MAX, ROUND, ABS, CEIL, FLOOR, IF)
- Division par zéro (retourne 0)
- Précision flottante (precisionScale)

### 9.4 targetProperty (formules de contrainte)

Une formule peut cibler une **propriété** du nœud au lieu du calcul direct :

| targetProperty | Effet |
|---------------|-------|
| `null` | Calcul direct (valeur du champ) |
| `'number_max'` | Maximum dynamique du champ numérique |
| `'number_min'` | Minimum dynamique |
| `'step'` | Pas/incrément dynamique |
| `'visible'` | Visibilité conditionnelle |
| `'required'` | Champ obligatoire conditionnel |
| `'disabled'` | Champ désactivé conditionnel |

---

## 10. Diagrammes de flux

### 10.1 Modification d'un champ par l'utilisateur

```
User modifie champ "Puissance" (nodeId=abc123)
         │
         ▼
useTBLSave.ts:
  POST /api/tbl/submissions/create-and-evaluate
  body: { formData: { "abc123": "5000" }, changedFieldId: "abc123", evaluationMode: "change" }
         │
         ▼
tbl-submission-evaluator.ts:
  ┌─ saveUserEntriesNeutral()
  │    └─ UPSERT SubmissionData(nodeId=abc123, value="5000", operationSource="neutral")
  │
  └─ evaluateCapacitiesForSubmission(mode='change')
       │
       ├─ Build valueMap = { "abc123": "5000", ... (DB existante) }
       │
       ├─ Trigger analysis: quels DISPLAY fields dépendent de abc123 ?
       │   └─ Parcours de linkedFormulaIds, linkedConditionIds, linkedTableIds
       │
       └─ Pour chaque variable/DISPLAY affectée :
            │
            └─ evaluateVariableOperation(nodeId, submissionId, prisma, valueMap)
                 │
                 └─ interpretReference(sourceRef)
                      │
                      ├─ interpretFormula() → "5000 * 1.21 = 6050"
                      │   └─ evaluateExpression()
                      │
                      └─ UPSERT SubmissionData(nodeId=..., value="6050", operationSource="formula")
         │
         ▼
Réponse JSON:
  { submission: { TreeBranchLeafSubmissionData: [...] }, freshlyComputedNodeIds: [...] }
         │
         ▼
Frontend (useTBLSave.ts):
  Dispatch CustomEvent('tbl-force-retransform', {
    submissionId,
    calculatedValues: { "display-field-1": "6050", ... }
  })
         │
         ▼
useCalculatedFieldValue.ts / useBackendValue.ts:
  Écoute l'événement → met à jour l'affichage instantanément
```

### 10.2 Ouverture d'un devis existant

```
User ouvre un devis (submissionId=sub123)
         │
         ▼
POST /api/tbl/submissions/create-and-evaluate
  body: { submissionId: "sub123", evaluationMode: "open", formData: {...tout le form} }
         │
         ▼
evaluateCapacitiesForSubmission(mode='open')
  │
  ├─ Build valueMap depuis DB + formData
  │
  ├─ SUPPRIME toutes les valeurs DISPLAY du valueMap (force recalcul complet)
  │
  └─ Évalue TOUTES les capacités (pas de filtrage par trigger)
         │
         ▼
Tous les DISPLAY fields sont recalculés avec les dernières données
```

### 10.3 Génération de document PDF

```
Frontend prépare tblData snapshot
  { "nodeId1": "value1", "nodeId2": "value2", ... }
         │
         ▼
POST /api/documents/generated/generate
  body: { templateId, leadId, submissionId, tblData, lead }
         │
         ▼
documents.ts:
  ├─ Récupère template avec sections
  ├─ Construit RenderContext { tblData, lead, organization, quote, formulaResultsMap }
  └─ renderDocumentPdf(renderContext)
         │
         ▼
DocumentPdfRenderer:
  Pour chaque section du template :
    ├─ substituteVariables(section.config.text)
    │    ├─ @value.xxx → resolveVariable() → tblData[xxx]
    │    ├─ {lead.firstName} → lead.firstName
    │    └─ node-formula:xxx → formulaResultsMap[xxx]
    └─ Rendu PDF (titres, textes, tableaux de prix, images...)
```

---

## 11. Impact pour le Gestionnaire

### 11.1 Points de stockage de valeurs à modifier

Pour qu'un « Gestionnaire » puisse modifier les valeurs de données, il doit impacter :

| Couche | Table/Champ | Action requise |
|--------|-------------|----------------|
| **SubmissionData** | `value` | ✅ MODIFIER directement |
| **SubmissionData** | `operationResult` | ⚠️ Mettre à null ou recalculer |
| **SubmissionData** | `operationSource` | ⚠️ Changer en `'manual'` ou `'neutral'` |
| **Node.calculatedValue** | DÉPRÉCIÉ | ❌ Ne plus toucher |

### 11.2 Risques de cascade

**⚠️ ATTENTION** : Modifier une valeur peut déclencher des cascades de recalcul :

```
Valeur modifiée (nodeA)
  └─ Formule qui référence @value.nodeA → recalcul
       └─ Condition qui référence la formule → recalcul
            └─ Table lookup qui dépend de la condition → recalcul
                 └─ Document PDF avec dataBinding → valeur obsolète
```

### 11.3 Recommandations pour le Gestionnaire

1. **Modifier `SubmissionData.value` directement** : c'est la source de vérité
2. **Marquer `operationSource = 'manual'`** : pour distinguer les modifications manuelles
3. **Déclencher un recalcul** : Appeler `evaluateCapacitiesForSubmission(submissionId, ..., mode='open')` après modification pour propager les cascades
4. **Ne PAS toucher à `TreeBranchLeafNode.calculatedValue`** : il est déprécié
5. **Gérer les DISPLAY fields** : Les champs calculés avec `hasFormula=true` seront recalculés automatiquement et écraseront toute modification manuelle. Pour modifier un DISPLAY field de façon permanente, il faut modifier ses **entrées** (inputs), pas sa valeur
6. **Attention aux sharedReferences** : Un même nodeId peut avoir des aliases (`shared-ref-xxx`). Modifier l'un doit propager à l'autre via `applySharedReferenceValues()`
7. **Invalider les caches frontend** : Après modification, émettre un `tbl-force-retransform` pour forcer le rafraîchissement de l'UI
8. **Documents déjà générés** : Les documents PDF utilisent un **snapshot** (`dataSnapshot`). Modifier les données ne mettra PAS à jour les documents existants — il faudra les regénérer

### 11.4 Champs sûrs à modifier vs dangereux

| Type de champ | Modifiable ? | Risque |
|--------------|-------------|--------|
| Input utilisateur (`operationSource='neutral'`) | ✅ Sûr | Peut déclencher des recalculs dépendants |
| Variable DATA (`sourceType='fixed'`) | ✅ Sûr | Modifier `fixedValue` |
| Variable DATA (`sourceType='tree'`) | ⚠️ Indirect | Modifier les inputs, pas le résultat |
| DISPLAY field (calculé) | ❌ Dangereux | Sera écrasé au prochain recalcul |
| Résultat de formule | ❌ Dangereux | Sera écrasé par `interpretFormula()` |
| Résultat de condition | ❌ Dangereux | Sera écrasé par `interpretCondition()` |
| Résultat de table lookup | ❌ Dangereux | Sera écrasé par `interpretTable()` |

### 11.5 Architecture suggérée pour le Gestionnaire

```
Gestionnaire UI
  │
  ├─ Afficher les SubmissionData groupées par type :
  │   ├─ 📝 Inputs utilisateur (operationSource='neutral') → ÉDITABLE
  │   ├─ 📊 Variables DATA fixed (sourceType='fixed') → ÉDITABLE (modifier fixedValue)
  │   ├─ 🔢 Variables DATA calculées (sourceType='tree') → LECTURE SEULE (montrer sourceRef)
  │   ├─ 📐 DISPLAY fields → LECTURE SEULE (montrer la formule)
  │   └─ 📋 Résultats (formula/condition/table) → LECTURE SEULE
  │
  ├─ Sur modification d'un input :
  │   1. UPSERT SubmissionData(nodeId, value, operationSource='manual')
  │   2. POST /api/tbl/submissions/update-and-evaluate { submissionId, formData: { nodeId: newValue } }
  │   3. Recevoir les cascades recalculées
  │   4. Mettre à jour l'affichage
  │
  └─ Historique :
      └─ Stocker l'ancienne valeur + qui a modifié + quand (audit trail)
```

---

## Annexe A : Glossaire des types de référence

| Référence | Type | Résolution |
|-----------|------|-----------|
| `@value.{nodeId}` | Valeur brute saisie | `getNodeValue(nodeId)` |
| `@select.{nodeId}` | Valeur d'un SELECT | `getNodeValue(nodeId)` (UUID de l'option) |
| `@calculated.{nodeId}` | Valeur calculée | `getNodeValue()` + auto-sum copies repeater |
| `@table.{nodeId}` | Résultat table lookup | `interpretTable(nodeId)` |
| `node-formula:{formulaId}` | Résultat formule | `interpretFormula(nodeId)` |
| `formula:{formulaId}` | Legacy formule | `interpretFormula(nodeId)` (FIX R27) |
| `condition:{conditionId}` | Résultat condition | `interpretCondition(nodeId)` |
| `node-table:{nodeId}` | Résultat table | `interpretTable(nodeId)` |
| `shared-ref-{id}` | Référence partagée | Résolu en nodeId via DB |
| `lead.{key}` | Donnée du Lead | valueMap.get('lead.key') |

## Annexe B : Enum OperationSource

Valeurs possibles de `SubmissionData.operationSource` :

| Valeur | Signification |
|--------|--------------|
| `'neutral'` | Input utilisateur (saisi manuellement) |
| `'formula'` | Calculé par une formule |
| `'condition'` | Déterminé par une condition |
| `'table'` | Résultat d'un lookup table |
| `'field'` | Valeur d'un champ simple |
| `'fixed'` | Valeur fixe configurée |
| `null` | Non spécifié (legacy) |

## Annexe C : Structure InterpretResult

Retourné par toutes les fonctions `interpret*()` :

```typescript
interface InterpretResult {
  result: string;      // Valeur numérique/texte
  humanText: string;   // Trace lisible (ex: "Puissance(5000) * TVA(1.21) = 6050")
  details: {
    type: 'field' | 'formula' | 'condition' | 'table';
    // ... détails spécifiques au type
  };
}
```
