# � TBL Bridge - Système de Codification 2-Chiffres PRÉCIS

## � **FLUX COMPLET D'ÉVALUATION TBL**

### 🎯 **1. Analyse de l'ID reçu**
```typescript
// TBL reçoit: "cb42c9a9-c6b4-49bb-bd55-74d763123bfb"

// ÉTAPE 1: Chercher dans TreeBranchLeafNodeVariable
const variable = await db.treeBranchLeafNodeVariable.findFirst({
  where: { 
    OR: [
      { sourceRef: `formula:cb42c9a9-c6b4-49bb-bd55-74d763123bfb` },
      { sourceRef: `condition:cb42c9a9-c6b4-49bb-bd55-74d763123bfb` },
      { sourceRef: `table:cb42c9a9-c6b4-49bb-bd55-74d763123bfb` },
      { sourceRef: "cb42c9a9-c6b4-49bb-bd55-74d763123bfb" }
    ]
  }
});

// RÉSULTAT: variable.sourceRef = "formula:cb42c9a9-c6b4-49bb-bd55-74d763123bfb"
// → TBL sait: "C'est une FORMULE"
```

### 🧮 **2. Traitement selon la capacité détectée**

#### **Si sourceRef commence par "formula:"**
```typescript
const formulaId = sourceRef.replace('formula:', '');  // "cb42c9a9-c6b4-49bb-bd55-74d763123bfb"

// Chercher définition dans TreeBranchLeafNodeFormula
const formula = await db.treeBranchLeafNodeFormula.findFirst({
  where: { id: formulaId }
});

// Exécuter calcul avec tokens
const result = await calculateFormula(formula.tokens, contextData);
```

#### **Si sourceRef commence par "condition:"**  
```typescript
const conditionId = sourceRef.replace('condition:', '');  // "ff05cc48-27ec-4d94-8975-30a0f9c1c275"

// Chercher définition dans TreeBranchLeafNodeCondition
const condition = await db.treeBranchLeafNodeCondition.findFirst({
  where: { id: conditionId }
});

// Évaluer conditionSet
const result = await evaluateCondition(condition.conditionSet, contextData);

// EXEMPLE avec votre condition:
const conditionSet = {
  "branches": [{
    "when": {
      "op": "isNotEmpty",
      "left": {"ref": "@value.702d1b09-abc9-4096-9aaa-77155ac5294f"}
    },
    "actions": [{"type": "SHOW", "nodeIds": ["702d1b09-abc9-4096-9aaa-77155ac5294f"]}]
  }],
  "fallback": {
    "actions": [{"type": "SHOW", "nodeIds": ["node-formula:7097ff9b-974a-4fb3-80d8-49634a634efc"]}]
  }
};

// TBL analyse:
// - SI @value.702d1b09-abc9-4096-9aaa-77155ac5294f n'est PAS vide 
//   → AFFICHER le champ 702d1b09-abc9-4096-9aaa-77155ac5294f
// - SINON 
//   → AFFICHER la formule 7097ff9b-974a-4fb3-80d8-49634a634efc
```

### 🎯 **3. Détection automatique des capacités TBL**

```typescript
const detectTBLCapacity = (sourceRef) => {
  if (sourceRef.startsWith('formula:')) {
    return {
      tbl_type: '6',        // Champ données  
      tbl_capacity: '2',    // Formule
      processing: 'calculate_tokens'
    };
  }
  
  if (sourceRef.startsWith('condition:')) {
    return {
      tbl_type: '6',        // Champ données
      tbl_capacity: '3',    // Condition
      processing: 'evaluate_conditionSet'
    };
  }
  
  if (sourceRef.startsWith('table:')) {
    return {
      tbl_type: '6',        // Champ données
      tbl_capacity: '4',    // Tableau
      processing: 'process_table_data'
    };
  }
  
  // UUID direct = variable simple
  return {
    tbl_type: '3',          // Champ saisie
    tbl_capacity: '1',      // Neutre
    processing: 'direct_value'
  };
};
```

## 🧠 **SYSTÈME D'INTELLIGENCE TBL**

### ⚡ **Codification automatique 2-chiffres**
```typescript
// Génération automatique du code TBL basé sur Variable
const generateTBLCode = (variable, nodeStructure) => {
  const capacity = detectTBLCapacity(variable.sourceRef);
  const contextType = analyzeNodeContext(variable.nodeId, nodeStructure);
  
  return {
    tbl_code: `${contextType}${capacity.tbl_capacity}-${normalizeKey(variable.exposedKey)}`,
    tbl_type: contextType,
    tbl_capacity: capacity.tbl_capacity,
    processing_method: capacity.processing
  };
};

// EXEMPLES:
// sourceRef: "formula:cb42..." → "62-prix-kwh" (Type 6 Données + Capacité 2 Formule)
// sourceRef: "condition:ff05..." → "63-affichage-conditionnel" (Type 6 + Capacité 3)
// sourceRef: "702d1b09-abc9..." → "31-saisie-utilisateur" (Type 3 + Capacité 1)
```

## � SYSTÈME 2-CHIFFRES : `[TYPE][CAPACITÉ]-nom`

### 🏗️ PREMIER CHIFFRE = TYPE DE CHAMP

```
1 = Branche (branche)                    → Onglet TBL
2 = Sous-Branche (branche niveau 2+)     → Liste déroulante TBL  
3 = Champ (feuille)                      → Input utilisateur
4 = Option (feuille)                     → Choix dans liste déroulante
5 = Option + champ (feuille)             → Option qui ouvre un champ
6 = Champ données (feuille EN SECTION)   → Affichage données calculées 🎯
7 = Section                              → Container pour champs données
```

#### 🎯 **RÈGLE CRUCIALE - Type 6 vs Type 3**
**Tout `leaf_field` dans une `section` = Type 6 (Données), pas Type 3 (Champ) !**

```typescript
// ✅ DÉTECTION CORRECTE
if (element.type === 'leaf_field' && parent.type === 'section') {
  return '6'; // Champ Données
} else if (element.type === 'leaf_field') {
  return '3'; // Champ standard
}
```

**Exemple concret :**
- `"Prix Kw/h"` dans section `"Données"` → `63prix-kw-` ✅ (Type 6)
- `"Nom client"` hors section → `31nom-client` ✅ (Type 3)

### ⚡ DEUXIÈME CHIFFRE = CAPACITÉ

```
1 = Neutre                               → Pas de traitement spécial
2 = Formule                              → Calcul mathématique
3 = Condition                            → Logique if/then/else  
4 = Tableau                              → Données tabulaires
```

## 🎯 EXEMPLES CONCRETS D'IDS

```typescript
// EXEMPLES RÉELS
"11-devis-electrique"     → Branche neutre = Onglet TBL "Devis Électrique"
"21-type-client"          → Sous-branche neutre = Liste déroulante "Type Client"
"31-puissance-kwh"        → Champ neutre = Input "Puissance kWh"
"41-particulier"          → Option neutre = Choix "Particulier" dans liste
"51-autre-type"           → Option+champ neutre = "Autre" qui ouvre input
"62-prix-kwh"             → Champ données formule = Calcul prix automatique
"73-resultats"            → Section condition = Container conditionnel
```

## 🔍 COMMENT TBL COMPREND INSTANTANÉMENT

### 🧠 Décodage Automatique
```typescript
// TBL reçoit l'ID et décode :
const id = "62-prix-kwh";
const type = id[0];      // "6" = Champ données
const capacite = id[1];  // "2" = Formule
const nom = id.split('-').slice(1).join('-'); // "prix-kwh"

// TBL sait : "C'est un champ données avec formule → Je calcule et j'affiche"
```

### � Correspondance TreeBranchLeaf → TBL

| **TreeBranchLeaf** | **Code** | **TBL Comprend** |
|-------------------|----------|------------------|
| Branche niveau 1 | `1X-nom` | **Onglet** à créer |
| Branche niveau 2+ | `2X-nom` | **Liste déroulante** avec options |
| Champ saisie | `3X-nom` | **Input** utilisateur |
| Option simple | `4X-nom` | **Choix** dans liste déroulante |
| Option + champ | `5X-nom` | **Option** qui révèle un champ |
| Champ données | `6X-nom` | **Affichage** de données calculées |
| Section | `7X-nom` | **Container** pour champs données |

## 💡 LOGIQUE DES CHAMPS DONNÉES (Type 6)

### 🔄 Transformation Automatique
```typescript
// Un champ normal devient "champ données" quand il entre dans une section
"31-nom-client"     → Dans section → "61-nom-client" (champ données neutre)
"32-prix-base"      → Dans section → "62-prix-base" (champ données formule)
"33-condition-age"  → Dans section → "63-condition-age" (champ données condition)
```

### 📍 Règle Importante
**Dès qu'un champ est placé dans une section (type 7), il devient automatiquement un "champ données" (type 6)**

## 🧮 SYSTÈME DE FORMULES INTELLIGENT - HYBRIDE COMPLET

### 📐 Formules Mathématiques (Capacité 2)
```typescript
// EXEMPLE COMPLET : "62-total-prix" (champ données formule)
{
  // IDENTIFICATION HYBRIDE
  id: "uuid-total-123",                    // ✅ UUID sécurité
  nodeId: "node-total-456",                // ✅ Position arbre  
  tbl_code: "62-total-prix",               // ✅ Code TBL
  
  // FORMULE MODERNE AVEC CODES TBL
  formula: "31-quantite * 62-prix-unitaire + 64-frais-transport",
  
  // TBL RÉSOUT AUTOMATIQUEMENT :
  // 1. Lit "31-quantite" → trouve nodeId → récupère value = 5
  // 2. Lit "62-prix-unitaire" → trouve nodeId → récupère value = 10
  // 3. Lit "64-frais-transport" → trouve nodeId → récupère value = 5
  // 4. Calcule : 5 * 10 + 5 = 55
  // 5. Stocke dans value : 55
  
  value: 55,                               // ✅ Résultat final
  
  // MÉTADONNÉES INTELLIGENTES
  dependencies: ["31-quantite", "62-prix-unitaire", "64-frais-transport"],
  last_calculated: "2025-09-14T10:30:00Z",
  calculation_time_ms: 15,
  is_realtime: true                        // Recalcul temps réel
}
```

### 🔀 Conditions (Capacité 3) - SYSTÈME AVANCÉ
```typescript
// EXEMPLE COMPLET : "63-remise" (champ données condition)
{
  // IDENTIFICATION HYBRIDE
  id: "uuid-remise-789",                   // ✅ UUID sécurité
  nodeId: "node-remise-999",               // ✅ Position arbre
  tbl_code: "63-remise-client",            // ✅ Code TBL
  
  // CONDITION COMPLEXE AVEC CODES TBL
  condition: {
    expression: "21-type-client == 'Professionnel' AND 31-montant > 1000 AND 41-region == 'Europe'",
    then: "62-total-ht * 0.15",           // 15% remise
    else: {
      nested_condition: "21-type-client == 'Particulier' AND 31-montant > 500", 
      then: "62-total-ht * 0.05",         // 5% remise
      else: "0"                            // Pas de remise
    }
  },
  
  // TBL ÉVALUE AUTOMATIQUEMENT :
  // 1. Lit "21-type-client" → value = "Professionnel" 
  // 2. Lit "31-montant" → value = 1500
  // 3. Lit "41-region" → value = "Europe"
  // 4. Expression : true AND true AND true = true
  // 5. Exécute then : "62-total-ht * 0.15"
  // 6. Lit "62-total-ht" → value = 1500
  // 7. Calcule : 1500 * 0.15 = 225
  
  value: 225,                              // ✅ Résultat conditionnel
  
  // MÉTADONNÉES AVANCÉES
  condition_refs: ["21-type-client", "31-montant", "41-region", "62-total-ht"],
  evaluation_tree: { /* arbre de décision */ },
  last_evaluated: "2025-09-14T10:35:00Z"
}
```

### 📊 Tableaux (Capacité 4) - DOUBLE TYPE

#### 🗂️ **Type A - Tableau Colonnes (Ajout lignes)**
```typescript
{
  // IDENTIFICATION HYBRIDE  
  id: "uuid-tableau-col-456",             // ✅ UUID sécurité
  nodeId: "node-tableau-789",             // ✅ Position arbre
  tbl_code: "74-liste-produits",          // ✅ Code TBL
  
  // STRUCTURE TABLEAU COLONNES
  tableData: {
    type: "columns",
    columns: [
      { 
        tbl_ref: "31-nom-produit",         // Référence code TBL
        label: "Nom produit", 
        type: "text" 
      },
      { 
        tbl_ref: "32-prix-unitaire",       // Référence code TBL
        label: "Prix", 
        type: "number",
        formula: true                       // Colonne calculée
      },
      { 
        tbl_ref: "33-quantite",            // Référence code TBL
        label: "Quantité", 
        type: "number" 
      },
      { 
        tbl_ref: "62-total-ligne",         // Référence code TBL
        label: "Total ligne",
        type: "calculated",
        formula: "32-prix-unitaire * 33-quantite"  // Formule par ligne
      }
    ],
    rows: [
      { "31-nom-produit": "Produit A", "32-prix-unitaire": 10, "33-quantite": 5, "62-total-ligne": 50 },
      { "31-nom-produit": "Produit B", "32-prix-unitaire": 15, "33-quantite": 3, "62-total-ligne": 45 }
    ],
    auto_sum: ["62-total-ligne"],          // Sommes automatiques
    total_row: { "62-total-ligne": 95 }    // Ligne de totaux
  },
  
  value: 95,                               // ✅ Total tableau
}
```

#### 🎯 **Type B - Tableau Croisé (Intersection ligne/colonne)**
```typescript
{
  // IDENTIFICATION HYBRIDE
  ## 🏗️ **VRAIE ARCHITECTURE TBL BRIDGE** - System basé sur Variables

### 📊 Tables Centrales du Système

```
🌳 TreeBranchLeafNode              → Structure arbre (nodeId, hiérarchie)
📊 TreeBranchLeafNodeVariable      → DONNÉES centrales (sourceRef, values) ⭐
🧮 TreeBranchLeafNodeFormula       → Définitions formules (tokens, calculs)
🔀 TreeBranchLeafNodeCondition     → Définitions conditions (conditionSet, logic)
📋 TreeBranchLeafNodeTable         → Définitions tableaux (structure, données)
```

### 🎯 **POINT CENTRAL : TreeBranchLeafNodeVariable**

**TOUTES les données sont stockées dans `TreeBranchLeafNodeVariable`** avec la colonne `sourceRef` comme clé d'identification :

```typescript
interface TreeBranchLeafNodeVariable {
  nodeId: string;           // ✅ Lien vers TreeBranchLeafNode
  sourceRef: string;        // ✅ RÉFÉRENCE SOURCE (clé principale)
  exposedKey: string;       // ✅ Code TBL exposé ("var_10bf")
  displayName: string;      // ✅ Nom affiché ("Prix Kw/h")
  value: any;              // ✅ Valeur stockée/calculée
  // ... autres métadonnées
}
```

### 🔍 **Types de sourceRef et Capacités**

#### 🧮 **Formules** - `sourceRef: "formula:uuid"`
```typescript
// EXEMPLE: Champ avec formule
{
  nodeId: "node_10bfb6d2",
  sourceRef: "formula:cb42c9a9-c6b4-49bb-bd55-74d763123bfb",  // ⭐ UUID formule
  exposedKey: "var_10bf",
  displayName: "Prix Kw/h",
  value: 0.158  // Résultat calculé
}

// DANS TreeBranchLeafNodeFormula:
{
  id: "cb42c9a9-c6b4-49bb-bd55-74d763123bfb",  // ⭐ Même UUID
  nodeId: "node_10bfb6d2",
  tokens: [...],  // Définition calcul
  name: "calcul-prix-kwh"
}
```

#### 🔀 **Conditions** - `sourceRef: "condition:uuid"`  
```typescript
// EXEMPLE: Champ avec condition
{
  nodeId: "node_ff05cc48",
  sourceRef: "condition:ff05cc48-27ec-4d94-8975-30a0f9c1c275",  // ⭐ UUID condition
  exposedKey: "var_ff05",
  displayName: "Affichage conditionnel",
  value: "calculé"  // Résultat conditionnel
}

// DANS TreeBranchLeafNodeCondition:
{
  id: "ff05cc48-27ec-4d94-8975-30a0f9c1c275",  // ⭐ Même UUID
  nodeId: "node_ff05cc48", 
  conditionSet: {
    "id": "cond_10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e",
    "mode": "first-match",
    "branches": [
      {
        "id": "b_dx8n5sezfj",
        "when": {
          "op": "isNotEmpty",
          "left": {"ref": "@value.702d1b09-abc9-4096-9aaa-77155ac5294f"}
        },
        "label": "Alors",
        "actions": [{"type": "SHOW", "nodeIds": ["702d1b09-abc9-4096-9aaa-77155ac5294f"]}]
      }
    ],
    "fallback": {
      "label": "Sinon", 
      "actions": [{"type": "SHOW", "nodeIds": ["node-formula:7097ff9b-974a-4fb3-80d8-49634a634efc"]}]
    }
  }
}
```

#### 📊 **Tableaux** - `sourceRef: "table:uuid"`
```typescript
// EXEMPLE: Champ avec tableau
{
  nodeId: "node_tableau123",
  sourceRef: "table:uuid-tableau-456",  // ⭐ UUID tableau
  exposedKey: "var_tab1",
  displayName: "Liste produits",
  value: [...] // Données tabulaires
}
```

#### 📝 **Variables simples** - `sourceRef: uuid direct`
```typescript
// EXEMPLE: Champ simple
{
  nodeId: "node_simple789", 
  sourceRef: "702d1b09-abc9-4096-9aaa-77155ac5294f",  // ⭐ UUID direct
  exposedKey: "var_702d",
  displayName: "Saisie utilisateur",
  value: "valeur saisie"  // Valeur directe
}
```
  tbl_code: "74-tarifs-regions",          // ✅ Code TBL
  
  // STRUCTURE TABLEAU CROISÉ
  tableData: {
    type: "crossed",
    row_axis: {
      tbl_ref: "21-type-client",           // Axe lignes
      values: ["Particulier", "Professionnel", "Entreprise"]
    },
    col_axis: {
      tbl_ref: "41-region",               // Axe colonnes
      values: ["France", "Europe", "International"]
    },
    intersections: {
      "Particulier_France": {
        tbl_ref: "62-tarif-base",
        value: 100,
        formula: "base_rate * 1.0"
      },
      "Professionnel_Europe": {
        tbl_ref: "62-tarif-pro-eu", 
        value: 85,
        formula: "base_rate * 0.85"
      }
      // ... autres intersections
    },
    lookup_function: "getTarif(type_client, region)"  // Fonction de recherche
  },
  
  // FONCTION DE RECHERCHE AUTOMATIQUE
  // TBL peut faire : tableau.lookup("Professionnel", "Europe") → 85
  
  value: "lookup_table",                   // ✅ Type spécial
}
```

### 🔄 Références Intelligentes Entre Éléments

#### 🔗 **Système de Dépendances Automatique**
```typescript
// GESTION AUTOMATIQUE DES DÉPENDANCES
interface DependencySystem {
  // Mapping code TBL → éléments dépendants
  dependencies_map: {
    "31-quantite": [                       // Quand "31-quantite" change
      "62-total-prix",                     // → Recalculer "62-total-prix"
      "63-remise-quantite",               // → Recalculer "63-remise-quantite"  
      "74-tableau-commande"               // → Recalculer "74-tableau-commande"
    ],
    "21-type-client": [                    // Quand "21-type-client" change
      "63-remise-client",                 // → Recalculer "63-remise-client"
      "74-tarifs-regions"                 // → Recalculer "74-tarifs-regions"
    ]
  },
  
  // Ordre de calcul pour éviter les conflits
  calculation_order: [
    "31-quantite",                         // 1. Champs de base
    "32-prix-unitaire",                   // 2. Prix unitaires  
    "62-total-prix",                      // 3. Totaux simples
    "63-remise-client",                   // 4. Conditions/remises
    "74-tableaux"                         // 5. Tableaux finaux
  ],
  
  // Détection boucles infinies
  circular_detection: {
    "62-total-prix": ["31-quantite", "32-prix"],     // OK
    "63-remise": ["62-total-prix"],                  // OK  
    "31-quantite": ["62-total-prix"]                 // 🚨 BOUCLE DÉTECTÉE !
  }
}
```

## 🏗️ ARCHITECTURE MODULAIRE PAR TYPE

```
tbl-bridge/
├── types/
│   ├── Type1-Branch/              # Gestion onglets TBL
│   │   ├── BranchHandler.ts       # Backend logique
│   │   ├── BranchComponent.tsx    # Frontend composant
│   │   └── BranchAPI.ts          # API communication
│   │
│   ├── Type2-SubBranch/           # Gestion listes déroulantes
│   │   ├── SubBranchHandler.ts
│   │   ├── SubBranchComponent.tsx
│   │   └── SubBranchAPI.ts
│   │
│   ├── Type3-Field/               # Gestion champs saisie
│   ├── Type4-Option/              # Gestion options simples
│   ├── Type5-OptionField/         # Gestion options + champs
│   ├── Type6-DataField/           # Gestion champs données ⭐
│   └── Type7-Section/             # Gestion sections
│
├── capacities/
│   ├── Capacity1-Neutral/         # Gestion neutre
│   ├── Capacity2-Formula/         # Gestion formules ⭐
│   ├── Capacity3-Condition/       # Gestion conditions ⭐
│   └── Capacity4-Table/           # Gestion tableaux ⭐
│
├── TBLBridge.ts                   # Coordinateur principal
├── TBLDecoder.ts                  # Décodeur 2-chiffres
└── README.md                      # Cette documentation
```

## 🔄 FLUX COMPLET TreeBranchLeaf → TBL

### 1️⃣ **Super Admin crée dans TreeBranchLeaf**
```
Devis Électrique (branche niveau 1)           → "11-devis-electrique"
├── Type Client (branche niveau 2)            → "21-type-client"
│   ├── Particulier (option)                  → "41-particulier"  
│   ├── Professionnel (option)                → "41-professionnel"
│   └── Autre (option + champ)                → "51-autre-type"
├── Puissance (champ)                          → "31-puissance-kwh"
└── Résultats (section)                       → "71-resultats"
    ├── Prix kWh (champ données formule)      → "62-prix-kwh"
    ├── Remise (champ données condition)      → "63-remise-client"  
    └── Total (champ données formule)         → "62-total-final"
```

### 2️⃣ **TBL reçoit et décode automatiquement**
```typescript
// TBL traite chaque ID reçu
tblBridge.process("11-devis-electrique");  // → Crée onglet "Devis Électrique"
tblBridge.process("21-type-client");       // → Crée liste déroulante "Type Client"
tblBridge.process("41-particulier");       // → Ajoute option "Particulier" à la liste
tblBridge.process("31-puissance-kwh");     // → Crée input "Puissance kWh"
tblBridge.process("71-resultats");         // → Crée section "Résultats"
tblBridge.process("62-prix-kwh");          // → Calcule et affiche prix automatiquement
```

### 3️⃣ **Résultat TBL Automatique**
- ✅ **Onglet** "Devis Électrique"
- ✅ **Liste déroulante** "Type Client" avec 3 options
- ✅ **Champ input** "Puissance kWh"  
- ✅ **Section** "Résultats" avec calculs automatiques
- ✅ **Recalcul temps réel** à chaque modification

## 📊 CORRESPONDANCE AVEC BDD EXISTANTE

### 🔍 Mapping Types Réels → Codes 2-Chiffres
```typescript
// Correspondance avec les 70 éléments analysés
const TYPE_MAPPING = {
  'branch': '1',              // 14 éléments → Type 1
  'section': '7',             // 1 élément → Type 7  
  'leaf_field': '3',          // 29 éléments → Type 3 (puis 6 si dans section)
  'leaf_option': '4',         // 23 éléments → Type 4
  'leaf_option_field': '5'    // 3 éléments → Type 5
};

// Note : Type 2 (sous-branche) = branch niveau 2+
//        Type 6 (champ données) = leaf_field dans section
```

## 🚀 EXEMPLES PRATIQUES DE FORMULES

### 📐 Formule Simple
```typescript
// "62-total-ht" (champ données formule)
// Formule : "31-quantite * 62-prix-unitaire"
// TBL lit automatiquement :
//   - Valeur du champ(31) "quantite" = 5
//   - Valeur du champ données(62) "prix-unitaire" = 10  
//   - Calcul : 5 * 10 = 50
//   - Affiche : 50 dans le champ "total-ht"
```

### 🔀 Condition Complexe
```typescript
// "63-remise" (champ données condition)
// Expression : "21-type-client == 'Professionnel' AND 31-montant > 1000"
// Alors : "62-total-ht * 0.15" (15% de remise)
// Sinon : "0"
//
// TBL évalue automatiquement toutes les références !
```

## 🎯 STOCKAGE DES DONNÉES - SYSTÈME HYBRIDE COMPLET

### 💾 Structure Complète Hybride (UUID + TBL)
```typescript
// STRUCTURE FINALE COMPLÈTE - SYSTÈME HYBRIDE
interface TBLElement {
  // ✅ ANCIEN SYSTÈME (Gardé pour compatibilité)
  id: string;                   // UUID TreeBranchLeaf original "d6212e5e-3fe9-4cce..."
  nodeId: string;               // Position dans l'arbre "node-456" 
  label: string;                // Nom humain "Prix total"
  type: string;                 // Type original TreeBranchLeaf "leaf_field"
  parentId?: string;            // Parent UUID pour hiérarchie
  
  // ✅ NOUVEAU SYSTÈME TBL (Ajouté en parallèle)
  tbl_code: string;             // Code 2-chiffres "62-prix-total"
  tbl_type: string;             // "6" (champ données)
  tbl_capacity: string;         // "2" (formule) 
  tbl_original_id: string;      // Backup UUID de sécurité
  
  // ✅ DONNÉES FONCTIONNELLES
  value: any;                   // VALEUR ACTUELLE ⭐
  formula?: string;             // Si capacité formule
  condition?: object;           // Si capacité condition
  tableData?: object;           // Si capacité tableau
}

// 🔑 PRINCIPE CLÉS :
// - UUID/nodeId = IDENTITÉ RÉELLE (jamais supprimé)
// - tbl_code = COMPRÉHENSION TBL (ajouté en parallèle)  
// - Les 2 systèmes COEXISTENT pour sécurité maximale
```

### 🔄 Exemples Concrets Système Hybride

#### 📋 **Exemple 1 - Champ Simple**
```typescript
{
  // ANCIEN SYSTÈME ✅
  id: "uuid-123",
  nodeId: "node-456", 
  label: "Puissance kWh",
  type: "leaf_field",
  parentId: "uuid-parent",
  
  // NOUVEAU SYSTÈME ✅  
  tbl_code: "31-puissance-kwh",
  tbl_type: "3",              // Champ saisie
  tbl_capacity: "1",          // Neutre
  tbl_original_id: "uuid-123",
  
  // DONNÉES ✅
  value: 15,                  // Valeur saisie utilisateur
}
```

#### 🧮 **Exemple 2 - Formule Complexe**
```typescript
{
  // ANCIEN SYSTÈME ✅
  id: "uuid-789",
  nodeId: "node-999",
  label: "Total HT", 
  type: "leaf_field",
  parentId: "uuid-section",
  
  // NOUVEAU SYSTÈME ✅
  tbl_code: "62-total-ht",
  tbl_type: "6",              // Champ données
  tbl_capacity: "2",          // Formule
  tbl_original_id: "uuid-789",
  
  // DONNÉES ✅
  value: 150,                 // Résultat calculé
  formula: "31-quantite * 62-prix-unitaire", // Formule en codes TBL !
}
```

#### 🔀 **Exemple 3 - Condition Avancée**
```typescript
{
  // ANCIEN SYSTÈME ✅
  id: "uuid-456",
  nodeId: "node-777",
  label: "Remise client",
  type: "leaf_field", 
  parentId: "uuid-section-resultats",
  
  // NOUVEAU SYSTÈME ✅
  tbl_code: "63-remise-client",
  tbl_type: "6",              // Champ données
  tbl_capacity: "3",          // Condition
  tbl_original_id: "uuid-456",
  
  // DONNÉES ✅
  value: 22.5,                // Résultat conditionnel
  condition: {
    expression: "21-type-client == 'Professionnel' AND 31-montant > 1000",
    then: "62-total-ht * 0.15",
    else: "0"
  }
}
```

### 🏗️ Correspondance Tables BDD

#### 📊 **Table TreeBranchLeafNode (Modifiée)**
```sql
-- COLONNES EXISTANTES (Gardées)
id VARCHAR(255) PRIMARY KEY,           -- UUID original
nodeId VARCHAR(255),                   -- Position arbre
label VARCHAR(255),                    -- Nom humain  
type VARCHAR(50),                      -- Type TreeBranchLeaf
parentId VARCHAR(255),                 -- Parent UUID

-- NOUVELLES COLONNES (Ajoutées)
tbl_code VARCHAR(10),                  -- Code 2-chiffres
tbl_type VARCHAR(1),                   -- Type TBL
tbl_capacity VARCHAR(1),               -- Capacité TBL
tbl_original_id VARCHAR(255),          -- Backup UUID
value TEXT,                            -- Valeur stockée
created_at TIMESTAMP,                  -- Migration tracking
updated_at TIMESTAMP                   -- Dernière modif
```

#### 🧮 **Table TreeBranchLeafNodeFormula**
```sql
-- Structure formules avec codes TBL
nodeId VARCHAR(255) REFERENCES TreeBranchLeafNode(nodeId),
formula TEXT,                          -- "31-quantite * 62-prix-unitaire"
tbl_formula_refs JSON,                 -- ["31-quantite", "62-prix-unitaire"]
dependencies_count INT,                -- Nombre de dépendances
is_circular_safe BOOLEAN,              -- Vérification boucles infinies
last_calculated TIMESTAMP              -- Dernière exécution
```

#### 🔀 **Table TreeBranchLeafNodeCondition**
```sql
-- Structure conditions avec codes TBL
nodeId VARCHAR(255) REFERENCES TreeBranchLeafNode(nodeId),
condition_expression TEXT,             -- "21-type-client == 'Professionnel'"
condition_then TEXT,                   -- "62-total-ht * 0.15"
condition_else TEXT,                   -- "0"
tbl_condition_refs JSON,               -- ["21-type-client", "62-total-ht"]
evaluation_order INT,                  -- Ordre d'évaluation
is_async BOOLEAN                       -- Calcul asynchrone
```

#### 📊 **Table TreeBranchLeafNodeTable**  
```sql
-- Structure tableaux avec codes TBL
nodeId VARCHAR(255) REFERENCES TreeBranchLeafNode(nodeId),
table_type VARCHAR(20),                -- "columns" ou "crossed"
table_data JSON,                       -- Données tabulaires
tbl_column_refs JSON,                  -- Références colonnes codes TBL
auto_calculation BOOLEAN,              -- Calcul automatique
table_formulas JSON                    -- Formules par cellule
```

---

## ⚡ RÉSUMÉ ULTRA-PRÉCIS

1. **Format ID** : `[TYPE][CAPACITÉ]-nom` (ex: "62-prix-kwh")
2. **Types** : 1=Branche, 2=Sous-branche, 3=Champ, 4=Option, 5=Option+champ, 6=Champ données, 7=Section
3. **Capacités** : 1=Neutre, 2=Formule, 3=Condition, 4=Tableau
4. **TBL décode** automatiquement chaque ID reçu
5. **Architecture modulaire** : 1 dossier par type + 1 par capacité
6. **Formules intelligentes** : Références autres champs via leurs codes 2-chiffres
7. **Frontend + Backend** réunis par type pour simplicité

**🎯 Objectif** : TBL comprend INSTANTANÉMENT chaque élément TreeBranchLeaf sans configuration supplémentaire !

---

## 🧠 Nouveau: Capability Resolver & Preload (v1)

### 🎯 Objectif
Centraliser la détection des capacités (formula / condition / table / fixed / data) côté backend pour supprimer l'inférence ad-hoc répétée dans le frontend et permettre:
1. Chargement initial unique (batch)
2. Extraction des dépendances (pour recalcul ciblé)
3. Debug structuré (flag `TBL_DIAG`)
4. Préparation d'un cache et d'invalidations futures

### 🔗 Endpoint
`GET /api/tbl/capabilities?treeId=<id>&deps=1&raw=1`

| Query | Effet | Défaut |
|-------|-------|--------|
| `treeId` | Identifiant de l'arbre ciblé | (requis) |
| `deps` | Extrait dépendances (tokens / conditionSet) | `false` |
| `raw` | Inclut blocs bruts (variable, formula, condition, table) | `false` |

### 🧾 Réponse (shape)
```jsonc
{
  "treeId": "uuid-tree",
  "count": 42,
  "capabilities": [
    {
      "nodeId": "node_x",
      "variableId": "var_x",
      "sourceRef": "formula:cb42...",
      "sourceType": "formula",
      "exposedKey": "var_prix",
      "displayName": "Prix Kw/h",
      "capacity": "formula",            // formula | condition | table | fixed | data | unknown
      "hasFormula": true,
      "hasCondition": false,
      "hasTable": false,
      "fixedValue": null,
      "dependencies": ["@value.702d1b09-abc9-..."],
      "raw": { /* fourni si raw=1 */ }
    }
  ],
  "meta": {
    "extractedAt": "2025-09-15T10:12:00.123Z",
    "raw": true,
    "deps": true,
    "version": "v1"
  }
}
```

### 🧩 Détection (Résumé Algorithme)
1. Charger `TreeBranchLeafNodeVariable` (pivot)
2. Indexer par `nodeId`
3. Charger formules / conditions / tables en parallèle
4. Pour chaque variable:
   - Déterminer `capacity` via `sourceRef` prefix ou existence de ressource associée
   - Extraire dépendances si demandé (`tokens` ou `conditionSet`)
   - Marquer flags `hasFormula|hasCondition|hasTable`
5. Retourner tableau ordonné (actuellement ordre variables). 

### 🧪 Extraction Dépendances (v1 simple)
- Formule: tokens avec `{ type: 'ref', value: '...' }` ou pattern `@value.<uuid>`
- Condition: parcours récursif de `conditionSet` pour toutes les clés `ref`
- Table: (TODO) Extraction future des colonnes référencées

### 🔍 Debug
Activer `localStorage.TBL_DIAG = "1"` pour voir:
- `[TBL][CAPA-PRELOAD] Fetched capabilities <count>`
- Logs existants SmartCalculatedField / batch evaluation enrichis.

### 🛠️ Dev Panel Capabilities (v1)
Un panneau de diagnostic a été ajouté (affiché uniquement si `localStorage.TBL_DIAG="1"` et hiérarchie fixe activée `USE_FIXED_HIERARCHY="1"`).

Affiche pour chaque capability:
- `nodeId`, `capacity`, `sourceRef`
- Nombre de dépendances (deps) et de dépendants (usedBy)
- Tags colorés par type (formula, variable, condition, table)

Injection runtime:
- Le hook `useTBLCapabilitiesPreload` construit deux graphes:
  - `dependencyGraph: ref -> Set<nodeId>` (qui consomme la référence)
  - `reverseGraph: nodeId -> Set<ref>` (références utilisées par ce nœud)
- Le graphe `dependencyGraph` est exposé globalement sous `window.TBL_DEP_GRAPH` (lecture seule) lorsque le panneau est monté, pour permettre à `SmartCalculatedField` de logger un ordre d'évaluation minimal.

Limitations v1:
- Pas de détection de cycles ni d'ordre topologique complet
- Références non normalisées (refs multiples possibles pour même entité)
- Pas d'invalidation dynamique (refetch manuel seulement)

Prochaines itérations suggérées:
1. Normaliser les refs (`variable:<id>` vs simple `<id>`)
2. Ajouter détection de cycles et surlignage
3. Exposer un ordre topologique pré-calculé (optimise recalcul sélectif)
4. Brancher invalidations partielles après mutation de formules/conditions

### 🎣 Hook Frontend `useTBLCapabilitiesPreload`
Usage minimal:
```tsx
const { capabilities, byNodeId, loading, error } = useTBLCapabilitiesPreload({
  treeId,
  extractDependencies: true,
  includeRaw: false
});

// Intégration future dans createField:
// const preloaded = byNodeId.get(node.id);
// if (preloaded) { capacity = preloaded.capacity; ... }
```

### ♻️ Intégration Progressive
| Étape | Action | Statut |
|-------|--------|--------|
| 1 | Endpoint backend v1 | ✅ |
| 2 | Hook preload | ✅ |
| 3 | Documentation | ✅ (section courante) |
| 4 | Refactor createField pour utiliser preloaded | ⏳ |
| 5 | Cache mémoire + TTL | ⏳ |
| 6 | Invalidation ciblée (mutation formules) | ⏳ |
| 7 | Devtool panel (visualisation graphe) | ⏳ |

---

## 🗺️ Roadmap Incrémentale Capabilities

### Phase 1 (Livrée)
- Endpoint batch `/tbl/capabilities`
- Hook preload & shape stable
- Extraction dépendances formules & conditions (patterns simples)

### Phase 2 (Stabilité & Graphe)
- Mapping interne `dependencyGraph: varId -> dependants`
- Pré-calcul ordre topologique (recalcul minimal)
- Normalisation refs (unifier `@value.uuid` et simple uuid)

### Phase 3 (Invalidations Dynamiques)
- Webhook / mutation events (formule modifiée -> invalider graphe + refetch partiel)
- ETag / versioning rapid diff
- Cache multi-organisation (clé: orgId+treeId)

### Phase 4 (Optimisations Avancées)
- Compression tokens côté transport
- SharedArrayBuffer / Worker pour recalcul massif (long terme)
- Précompilation formules (AST persisté + checksum)

### Phase 5 (Observabilité)
- Metrics calcul: `calc_time_ms`, `cacheHitRate`
- Devtool panel : arbre dépendances, highlight cycles
- Alertes boucle circulaire proactive

### Phase 6 (Extension Tableaux)
- Extraction dépendances colonnes table
- Formules par cellule + invalidation partielle
- Lazy evaluation (colonnes non visibles non calculées)

### Phase 7 (Sécurité & Qualité)
- Validation stricte sources inconnues (capacity=unknown -> flagged)
- Politique d'accès (vérification organisation sur treeId) renforcée
- Tests unitaires resolver (mocks Prisma) & snapshot de payload

### KPI Ciblés
- 1 seul round-trip capabilities par chargement (objectif < 120ms serveur)
- Hit cache > 90% après warm-up
- Taux erreurs parsing tokens < 1%

---

## ✅ Points de Cohérence Avec SmartCalculatedField
| Aspect | Situation |
|--------|-----------|
| Invalidation | Non encore branchée, recalcul toujours permissif | 
| Capacité | SmartCalculatedField continue d'inférer si preload absent | 
| Dependencies | Preload fournira bientôt un graphe pour recalcul sélectif | 
| Debug | Flags unifiés: `TBL_DIAG`, `TBL_SMART_DEBUG` | 

Prochaine micro-étape recommandée: injecter `byNodeId` dans `createField` pour éviter double logique d'inférence et marquer les champs `formula`/`condition` plus tôt (optimise ordre de rendu et limitation des fallback).

---

## 🔄 PLAN DE MIGRATION SÉCURISÉ

### 📋 Phase 1 - Préparation (CRITIQUE)
```bash
# 1. Backup complet obligatoire
pg_dump database > backup_avant_migration.sql

# 2. Analyse détaillée des 70 éléments
node analyze-all-70-elements.js

# 3. Création mapping UUID → codes
node create-migration-mapping.js

# 4. Validation mapping sur copie BDD
node validate-mapping.js --test-database
```

### 🏗️ Phase 2 - Ajout Colonnes Système Hybride
```sql
-- AJOUT SÉCURISÉ DES COLONNES TBL (UUID gardés !)
ALTER TABLE TreeBranchLeafNode 
ADD COLUMN tbl_type VARCHAR(1),                    -- Type TBL (1-7)
ADD COLUMN tbl_capacity VARCHAR(1),                -- Capacité TBL (1-4)  
ADD COLUMN tbl_code VARCHAR(20),                   -- Code complet "52-calcul-prix-kwh"
ADD COLUMN tbl_original_id VARCHAR(255),           -- Backup UUID sécurité
ADD COLUMN value TEXT,                             -- Valeur stockée/calculée
ADD COLUMN tbl_dependencies JSON,                  -- Liste dépendances
ADD COLUMN last_calculated TIMESTAMP,              -- Dernière mise à jour
ADD COLUMN calculation_time_ms INTEGER,            -- Performance tracking
ADD COLUMN confidence_score DECIMAL(3,2),          -- Confiance détection
ADD COLUMN requires_manual_review BOOLEAN DEFAULT FALSE, -- Flag révision
ADD COLUMN migration_batch VARCHAR(50),            -- Traçabilité migration
ADD COLUMN migration_version VARCHAR(10),          -- Version migration
ADD COLUMN created_at TIMESTAMP DEFAULT NOW(),     -- Tracking création
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();     -- Tracking modification

-- INDEX POUR PERFORMANCE
CREATE INDEX idx_tbl_code ON TreeBranchLeafNode(tbl_code);
CREATE INDEX idx_tbl_type_capacity ON TreeBranchLeafNode(tbl_type, tbl_capacity);
CREATE INDEX idx_migration_batch ON TreeBranchLeafNode(migration_batch);
CREATE INDEX idx_requires_review ON TreeBranchLeafNode(requires_manual_review);

-- CONTRAINTES DE QUALITÉ
ALTER TABLE TreeBranchLeafNode 
ADD CONSTRAINT chk_tbl_type CHECK (tbl_type IN ('1','2','3','4','5','6','7')),
ADD CONSTRAINT chk_tbl_capacity CHECK (tbl_capacity IN ('1','2','3','4')),
ADD CONSTRAINT chk_confidence_score CHECK (confidence_score >= 0 AND confidence_score <= 1);

-- TRIGGERS AUTOMATIQUES
CREATE OR REPLACE FUNCTION update_tbl_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_tbl_timestamp 
    BEFORE UPDATE ON TreeBranchLeafNode 
    FOR EACH ROW EXECUTE FUNCTION update_tbl_timestamp();
```

### 🔄 Phase 3 - Migration par Lots ULTRA-SÉCURISÉE
```typescript
// MIGRATION HYBRIDE ULTRA-SÉCURISÉE PAR GROUPES
const MIGRATION_BATCHES_SECURE = {
  // Batch 1 - Éléments simples d'abord
  batch1_branches: {
    description: 'Branches niveau 1 et 2 (14 éléments)',
    filter: { type: 'branch' },
    estimated_time: '5 minutes',
    risk_level: 'low',
    rollback_simple: true,
    validation_rules: ['check_hierarchy', 'verify_parent_child']
  },
  
  // Batch 2 - Section unique
  batch2_section: {
    description: 'Section unique (1 élément)', 
    filter: { type: 'section' },
    estimated_time: '1 minute',
    risk_level: 'minimal',
    rollback_simple: true,
    validation_rules: ['check_container_logic']
  },
  
  // Batch 3 - Champs leaf les plus simples
  batch3_simple_fields: {
    description: 'Champs leaf sans formule/condition (15 éléments)',
    filter: { 
      type: 'leaf_field',
      no_formula: true,
      no_condition: true,
      no_table: true
    },
    estimated_time: '8 minutes',
    risk_level: 'low',
    rollback_simple: true,
    validation_rules: ['check_data_integrity', 'verify_values']
  },
  
  // Batch 4 - Champs leaf avec logique
  batch4_complex_fields: {
    description: 'Champs leaf avec formules/conditions (14 éléments)',
    filter: { 
      type: 'leaf_field',
      has_logic: true  // formule OU condition OU tableau
    },
    estimated_time: '15 minutes',
    risk_level: 'medium',
    rollback_simple: false,  // Nécessite validation formules
    validation_rules: ['check_formula_syntax', 'verify_dependencies', 'test_calculations']
  },
  
  // Batch 5 - Options simples
  batch5_options: {
    description: 'Options leaf simples (23 éléments)',
    filter: { type: 'leaf_option' },
    estimated_time: '10 minutes', 
    risk_level: 'low',
    rollback_simple: true,
    validation_rules: ['check_option_values', 'verify_parent_lists']
  },
  
  // Batch 6 - Options + champs (plus complexes)
  batch6_option_fields: {
    description: 'Options + champs (3 éléments)',
    filter: { type: 'leaf_option_field' },
    estimated_time: '5 minutes',
    risk_level: 'medium',
    rollback_simple: false,  // Logique double option+champ
    validation_rules: ['check_option_field_logic', 'verify_conditional_fields']
  }
};

// FONCTION MIGRATION SÉCURISÉE PAR LOT
const migrateBatchSecure = async (batchConfig, options = {}) => {
  const batchId = generateBatchId();
  const startTime = Date.now();
  
  try {
    // 1. BACKUP AUTOMATIQUE PRE-BATCH
    console.log(`🔄 Starting ${batchConfig.description}...`);
    const backupFile = await createBatchBackup(batchId, batchConfig);
    
    // 2. SÉLECTION ÉLÉMENTS À MIGRER
    const elementsToMigrate = await selectElementsForBatch(batchConfig.filter);
    console.log(`📊 Found ${elementsToMigrate.length} elements to migrate`);
    
    // 3. SIMULATION MIGRATION (MODE DRY-RUN)
    if (options.dryRun !== false) {
      const simulationResults = await simulateMigration(elementsToMigrate);
      if (!simulationResults.success) {
        throw new Error(`Simulation failed: ${simulationResults.errors.join(', ')}`);
      }
      console.log(`✅ Simulation passed: ${simulationResults.success_rate}% success rate`);
    }
    
    // 4. MIGRATION RÉELLE AVEC TRANSACTION
    const migrationResults = await db.transaction(async (trx) => {
      const results = [];
      
      for (const element of elementsToMigrate) {
        try {
          // Génération code TBL hybride
          const tblData = await generateFullTBLCode(element);
          
          // Mise à jour avec TOUTES les données hybrides
          const updated = await trx.treeBranchLeafNode.update({
            where: { id: element.id },
            data: {
              // NOUVEAU SYSTÈME ajouté
              tbl_type: tblData.tbl_data.tbl_type,
              tbl_capacity: tblData.tbl_data.tbl_capacity, 
              tbl_code: tblData.tbl_data.tbl_code,
              tbl_original_id: element.id,  // Backup UUID
              
              // MÉTADONNÉES
              tbl_dependencies: JSON.stringify(tblData.capacity_details.references || []),
              confidence_score: tblData.migration_info.confidence_level,
              requires_manual_review: tblData.migration_info.requires_manual_review,
              migration_batch: batchId,
              migration_version: "v2.0.0",
              
              // ANCIEN SYSTÈME gardé intact automatiquement !
            }
          });
          
          results.push({ success: true, element_id: element.id, tbl_code: tblData.tbl_data.tbl_code });
          
        } catch (elementError) {
          console.error(`❌ Failed to migrate element ${element.id}:`, elementError);
          results.push({ success: false, element_id: element.id, error: elementError.message });
          
          // Si rollback automatique activé
          if (options.rollbackOnError !== false) {
            throw elementError;  // Déclenche rollback transaction
          }
        }
      }
      
      return results;
    });
    
    // 5. VALIDATION POST-MIGRATION
    const validationResults = await validateBatchMigration(batchConfig, migrationResults);
    if (!validationResults.success) {
      throw new Error(`Validation failed: ${validationResults.errors.join(', ')}`);
    }
    
    // 6. SUCCÈS !
    const duration = Date.now() - startTime;
    console.log(`✅ Batch ${batchConfig.description} completed successfully in ${duration}ms`);
    
    return {
      success: true,
      batch_id: batchId,
      duration_ms: duration,
      elements_migrated: migrationResults.filter(r => r.success).length,
      elements_failed: migrationResults.filter(r => !r.success).length,
      backup_file: backupFile,
      validation_passed: true
    };
    
  } catch (batchError) {
    // 7. ROLLBACK AUTOMATIQUE EN CAS D'ERREUR
    console.error(`🚨 Batch migration failed:`, batchError);
    
    if (options.autoRollback !== false) {
      console.log(`🔄 Starting automatic rollback...`);
      await rollbackBatch(batchId, backupFile);
      console.log(`✅ Rollback completed successfully`);
    }
    
    return {
      success: false,
      batch_id: batchId,
      error: batchError.message,
      rollback_performed: options.autoRollback !== false
    };
  }
};
```

## 🎯 EXEMPLES CONCRETS DE MIGRATION

### 🔧 Avant Migration (UUID)
```typescript
// PROBLÉMATIQUE ACTUELLE
{
  id: "d6212e5e-3fe9-4cce-b380-e6745524d011",
  label: "Calcul du prix Kw/h",
  type: "leaf_option_field",
  // Aucun système capacité !
}
```

### ✅ Après Migration (2-Chiffres) - SYSTÈME HYBRIDE COMPLET
```typescript
// NOUVEAU SYSTÈME HYBRIDE INTELLIGENT
{
  // ✅ ANCIEN SYSTÈME PRÉSERVÉ (Sécurité totale)
  id: "d6212e5e-3fe9-4cce-b380-e6745524d011",     // UUID original gardé
  nodeId: "node-calcul-456",                       // Position arbre gardée
  label: "Calcul du prix Kw/h",                   // Nom humain gardé
  type: "leaf_option_field",                       // Type TreeBranchLeaf gardé
  parentId: "uuid-section-parent",                 // Hiérarchie gardée
  
  // ✅ NOUVEAU SYSTÈME TBL (Ajouté en parallèle)
  tbl_code: "52-calcul-prix-kwh",                 // Code 2-chiffres intelligent  
  tbl_type: "5",                                   // leaf_option_field → Type 5
  tbl_capacity: "2",                               // Formule détectée → Capacité 2
  tbl_original_id: "d6212e5e-3fe9-4cce-b380-e6745524d011", // Backup UUID
  
  // ✅ DONNÉES FONCTIONNELLES ENRICHIES
  value: 0.15,                                     // Valeur calculée (15c/kWh)
  formula: "62-cout-production + 63-marge-benefice + 61-taxes-region", // Formule TBL
  
  // ✅ MÉTADONNÉES AVANCÉES
  dependencies: ["62-cout-production", "63-marge-benefice", "61-taxes-region"],
  last_calculated: "2025-09-14T14:30:00Z",
  calculation_time_ms: 25,
  confidence_score: 0.95,                          // Confiance détection auto
  requires_manual_review: false,
  
  // ✅ TRAÇABILITÉ MIGRATION
  migration_info: {
    migrated_at: "2025-09-14T12:00:00Z",
    migration_batch: "batch3_leaf_option_fields",
    original_uuid_backup: "d6212e5e-3fe9-4cce-b380-e6745524d011",
    migration_version: "v2.0.0",
    validation_passed: true
  },
  
  // ✅ INTELLIGENCE TBL
  tbl_intelligence: {
    auto_detected_type: "option_with_formula",      // Détection automatique
    suggested_improvements: [],                     // Suggestions d'optimisation
    performance_score: "excellent",                 // Score performance
    integration_status: "fully_compatible"          // Statut intégration TBL
  }
}

// 🔄 COMPATIBILITÉ TOTALE
// ✅ Ancien système → Fonctionne toujours avec UUID
// ✅ Nouveau système → TBL comprend avec code 2-chiffres  
// ✅ Migration → Zéro risque de perte de données
// ✅ Rollback → Possible à tout moment en supprimant colonnes tbl_*
```

## 🚨 GESTION DES DOUBLONS

### 📋 Problème des Noms Identiques
```typescript
// DOUBLONS DÉTECTÉS (exemples)
const DUPLICATES = {
  "Non": 5,     // 5 éléments nommés "Non"
  "Oui": 5,     // 5 éléments nommés "Oui" 
  "Gaz": 2,     // 2 éléments nommés "Gaz"
  "Prix Kw/h": 2 // 2 éléments nommés "Prix Kw/h"
};
```

### ✅ Résolution Automatique
```typescript
// SYSTÈME DE NOMMAGE UNIQUE
const resolveNameConflict = (name, type, parentContext) => {
  const baseName = normalizeString(name);
  const typePrefix = TYPE_MAPPING[type].code;
  const contextSuffix = getContextSuffix(parentContext);
  
  return `${typePrefix}${capacity}-${baseName}${contextSuffix}`;
};

// Exemples de résolution
"Non" → "61-non-chauffage", "62-non-terre", "61-non-facade"
"Prix Kw/h" → "73-prix-kwh-calcul", "51-prix-kwh-valeur"
```

## 🔍 DÉTECTION INTELLIGENTE DES CAPACITÉS - ALGORITHME COMPLET

### 🧠 Algorithme de Classification Hybride
```typescript
const detectCapacity = async (node) => {
  // 🔍 DÉTECTION PAR TABLES SÉPARÉES (Comme expliqué par utilisateur)
  
  // 1. Vérifier table TreeBranchLeafNodeFormula
  const formulaExists = await db.treebranchleafnodeformula.findFirst({
    where: { nodeId: node.nodeId }
  });
  if (formulaExists) {
    return {
      capacity: '2',                        // Formule
      details: {
        formula: formulaExists.formula,
        tbl_refs: extractTBLRefs(formulaExists.formula),
        complexity: analyzeFormulaComplexity(formulaExists.formula)
      }
    };
  }
  
  // 2. Vérifier table TreeBranchLeafNodeCondition  
  const conditionExists = await db.treebranchleafnodecondition.findFirst({
    where: { nodeId: node.nodeId }
  });
  if (conditionExists) {
    return {
      capacity: '3',                        // Condition
      details: {
        expression: conditionExists.condition_expression,
        then_action: conditionExists.condition_then,
        else_action: conditionExists.condition_else,
        tbl_refs: extractTBLRefs(conditionExists.condition_expression)
      }
    };
  }
  
  // 3. Vérifier table TreeBranchLeafNodeTable
  const tableExists = await db.treebranchleafnodetable.findFirst({
    where: { nodeId: node.nodeId }
  });
  if (tableExists) {
    return {
      capacity: '4',                        // Tableau
      details: {
        table_type: tableExists.table_type,  // "columns" ou "crossed"
        columns_count: countTableColumns(tableExists.table_data),
        auto_calculation: tableExists.auto_calculation
      }
    };
  }
  
  // 4. Section → toujours tableau automatique par défaut
  if (node.type === 'section') {
    return {
      capacity: '4',                        // Tableau (conteneur)
      details: {
        table_type: "container",
        auto_generated: true,
        contains_data_fields: true
      }
    };
  }
  
  // 5. Par défaut → neutre
  return {
    capacity: '1',                          // Neutre
    details: {
      reason: "no_special_behavior",
      is_simple_field: true,
      user_input_only: true
    }
  };
};

// 🔧 FONCTIONS UTILITAIRES
const extractTBLRefs = (formula) => {
  // Extrait tous les codes TBL d'une formule
  // "31-quantite * 62-prix + 74-tableau" → ["31-quantite", "62-prix", "74-tableau"]
  const regex = /\d{2}-[\w-]+/g;
  return formula.match(regex) || [];
};

const analyzeFormulaComplexity = (formula) => {
  const refs = extractTBLRefs(formula);
  const operators = (formula.match(/[+\-*/()]/g) || []).length;
  
  return {
    references_count: refs.length,
    operators_count: operators,
    complexity_level: refs.length + operators > 10 ? "high" : 
                     refs.length + operators > 5 ? "medium" : "simple",
    estimated_calc_time_ms: (refs.length * 2) + (operators * 1)
  };
};
```

### 🎯 Détection Type + Capacité Combinée
```typescript
const generateFullTBLCode = async (node) => {
  // 1. DÉTECTION TYPE (basé sur node.type existant)
  const typeMapping = {
    'branch': detectBranchLevel(node),      // '1' ou '2' selon niveau
    'section': '7',                         // Section toujours
    'leaf_field': detectFieldContext(node), // '3' ou '6' selon contexte
    'leaf_option': '4',                     // Option simple
    'leaf_option_field': '5'                // Option + champ
  };
  
  const tblType = typeMapping[node.type];
  
  // 2. DÉTECTION CAPACITÉ (tables séparées)
  const capacityResult = await detectCapacity(node);
  const tblCapacity = capacityResult.capacity;
  
  // 3. GÉNÉRATION NOM UNIQUE
  const uniqueName = await generateUniqueName(node.label, tblType, tblCapacity, node.parentId);
  
  // 4. CODE FINAL
  const tblCode = `${tblType}${tblCapacity}-${uniqueName}`;
  
  return {
    // SYSTÈME HYBRIDE COMPLET
    original_data: {
      id: node.id,
      nodeId: node.nodeId,
      label: node.label,
      type: node.type,
      parentId: node.parentId
    },
    
    tbl_data: {
      tbl_code: tblCode,
      tbl_type: tblType,
      tbl_capacity: tblCapacity,
      tbl_original_id: node.id
    },
    
    capacity_details: capacityResult.details,
    
    migration_info: {
      detected_at: new Date().toISOString(),
      confidence_level: calculateConfidence(capacityResult),
      requires_manual_review: tblCapacity === '1' && hasComplexLogic(node)
    }
  };
};

// 🔍 DÉTECTIONS SPÉCIALISÉES
const detectBranchLevel = (node) => {
  // Vérifie si branche niveau 1 ou sous-branche
  return node.parentId === null ? '1' : '2';
};

const detectFieldContext = (node) => {
  // Vérifie si le champ est dans une section
  return isInSection(node.parentId) ? '6' : '3';
};

const generateUniqueName = async (label, type, capacity, parentId) => {
  const baseName = normalizeString(label);
  const parentContext = await getParentContext(parentId);
  
  // Éviter les doublons
  const existingCodes = await getExistingTBLCodes(type, capacity);
  let uniqueName = baseName;
  let counter = 1;
  
  while (existingCodes.includes(`${type}${capacity}-${uniqueName}`)) {
    if (parentContext) {
      uniqueName = `${baseName}-${parentContext}`;
    } else {
      uniqueName = `${baseName}-${counter}`;
      counter++;
    }
  }
  
  return uniqueName;
};
```

### ⚡ Optimisations Performance

#### 🚀 **Cache Intelligent** 
```typescript
interface TBLCacheSystem {
  // Cache des codes générés pour éviter recalculs
  generated_codes: Map<string, TBLCodeResult>,
  
  // Cache des dépendances pour calculs rapides
  dependencies_cache: Map<string, string[]>,
  
  // Cache des valeurs calculées  
  calculated_values: Map<string, {
    value: any,
    last_calculated: Date,
    expires_at: Date
  }>,
  
  // Invalidation intelligente
  invalidate_on_change: (nodeId: string) => void,
  
  // Pré-calcul des formules complexes
  precalculate_heavy: (formula: string) => Promise<any>
}
```

#### 📊 **Métriques de Performance**
```typescript
interface PerformanceMetrics {
  generation_time_ms: number,              // Temps génération code
  detection_accuracy: number,              // Précision détection (0-1)
  cache_hit_rate: number,                 // Taux de succès cache
  average_calculation_time: number,        // Temps moyen calcul
  memory_usage_mb: number,                // Mémoire utilisée
  concurrent_operations: number,           // Opérations simultanées
  
  // Alertes de performance
  alerts: {
    slow_formulas: string[],              // Formules lentes
    circular_dependencies: string[],       // Dépendances circulaires
    memory_warnings: string[]             // Alertes mémoire
  }
}
```

## 🛡️ SÉCURITÉ & ROLLBACK

### 🔒 Mesures Sécuritaires
```bash
# Backup automatique avant chaque opération
before_migration() {
  timestamp=$(date +%Y%m%d_%H%M%S)
  pg_dump > "backup_${timestamp}.sql"
}

# Validation intégrité après migration
validate_integrity() {
  # Vérifier aucune perte de données
  # Valider tous les codes 2-chiffres
  # Tester relations parent-enfant
  # Confirmer unicité des noms
}

# Rollback automatique si erreur
rollback_on_error() {
  if [[ $? -ne 0 ]]; then
    echo "ERREUR DÉTECTÉE - ROLLBACK AUTOMATIQUE"
    psql < "backup_latest.sql"
  fi
}
```

## 🎯 ÉTAPES D'IMPLÉMENTATION

### ✅ TODO - Phase par Phase

1. **🚨 ARRÊT IMMÉDIAT** ancien système TBL Bridge
2. **📋 ANALYSE** détaillée des 70 éléments 
3. **🏗️ REFONTE** architecture types réels
4. **🧠 CRÉATION** système capacités intelligent
5. **🔄 MIGRATION** sécurisée par lots
6. **🧪 TESTS** intensifs environnement isolé
7. **🚀 DÉPLOIEMENT** production avec monitoring

### ⏱️ Estimation Réaliste
- **Analyse & Planning :** 3-4 jours
- **Développement :** 2 semaines  
- **Tests & Validation :** 1 semaine
- **Total :** 2-3 semaines

## 🚀 RÉSULTAT FINAL

### 💎 Système TBL Bridge V2.0
- ✅ **Architecture réelle** basée sur vraies données
- ✅ **Migration sécurisée** des 70 éléments
- ✅ **Capacités intelligentes** détection automatique
- ✅ **Codes 2-chiffres** uniques et cohérents
- ✅ **Backup/Rollback** complets
- ✅ **Performance** optimisée pour 100+ éléments

### 🎯 Code Final Exemple - SYSTÈME HYBRIDE COMPLET
```typescript
// SYSTÈME FINAL FONCTIONNEL HYBRIDE
const tblElement = {
  // ✅ IDENTIFICATION HYBRIDE TOTALE
  original_uuid: "d6212e5e-3fe9-4cce-b380-e6745524d011",  // UUID sécurité
  nodeId: "node-calcul-prix-456",                          // Position arbre
  tblCode: "52-calcul-prix-kwh",                           // Code TBL intelligent
  
  // ✅ DONNÉES ENRICHIES
  original_data: {
    id: "d6212e5e-3fe9-4cce-b380-e6745524d011",
    label: "Calcul du prix Kw/h", 
    type: "leaf_option_field",                             // Type TreeBranchLeaf
    parentId: "uuid-section-energie"
  },
  
  tbl_data: {
    tbl_type: "5",                                         // Option + champ
    tbl_capacity: "2",                                     // Formule
    tbl_code: "52-calcul-prix-kwh",
    tbl_original_id: "d6212e5e-3fe9-4cce-b380-e6745524d011"
  },
  
  functional_data: {
    value: 0.158,                                          // 15.8c/kWh calculé
    formula: "62-cout-base + 63-taxes-locales * 61-coefficient-region",
    dependencies: ["62-cout-base", "63-taxes-locales", "61-coefficient-region"],
    last_calculated: "2025-09-14T15:45:30Z",
    calculation_time_ms: 12
  },
  
  intelligence_metadata: {
    auto_detected_capacity: "formula",
    confidence_score: 0.97,
    performance_score: "excellent", 
    integration_status: "fully_compatible",
    suggested_optimizations: [],
    requires_manual_review: false
  }
};

// 🚀 TBL BRIDGE COMPREND AUTOMATIQUEMENT TOUT !
const result = await TBLBridge.process(tblElement);

// RÉSULTAT : TBL sait instantanément que c'est :
// ✅ Type 5 = Option + champ → Crée sélecteur avec champ conditionnel
// ✅ Capacité 2 = Formule → Active le moteur de calcul automatique  
// ✅ Dépendances = 3 champs → Configure les listeners de changement
// ✅ Performance excellente → Calcul prioritaire temps réel
// ✅ Code "52-calcul-prix-kwh" → Interface TBL optimisée

console.log(`✅ TBL Element processed successfully:
  📋 Type: Option with conditional field
  🧮 Capacity: Auto-calculating formula  
  ⚡ Performance: ${result.performance_score}
  🔗 Dependencies: ${result.dependencies.length} fields monitored
  💡 Intelligence: Fully autonomous operation
  
  🎯 Result: ${result.calculated_value} €/kWh
  ⏱️ Calculation time: ${result.calculation_time_ms}ms
  🔄 Real-time updates: ${result.realtime_enabled ? 'Active' : 'Disabled'}
`);

// 💎 AVANTAGES SYSTÈME HYBRIDE :
// ✅ SÉCURITÉ : UUID jamais supprimé, rollback possible
// ✅ PERFORMANCE : TBL comprend immédiatement le type/capacité
// ✅ COMPATIBILITÉ : Ancien système fonctionne en parallèle
// ✅ INTELLIGENCE : Détection automatique des capacités
// ✅ ÉVOLUTIVITÉ : Nouveau système extensible sans limite
// ✅ MAINTENABILITÉ : Code organisé par type et capacité
```

---

## ⚠️ AVERTISSEMENT CRITIQUE

**🛑 NE PAS utiliser l'ancien système TBL Bridge !**

L'ancienne architecture était basée sur des **suppositions incorrectes**. Ce nouveau système est basé sur l'**analyse réelle des 70 éléments** de la base de données.

**✅ Ce README constitue la VRAIE feuille de route pour un système TBL Bridge robuste et fonctionnel.**