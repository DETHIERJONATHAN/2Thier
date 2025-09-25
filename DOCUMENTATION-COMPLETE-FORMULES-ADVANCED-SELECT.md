# 📋 Documentation Complète - Système de Formules CRM avec Advanced_Select

## 🎯 Vue d'ensemble

Ce document détaille le fonctionnement du système de formules CRM, avec un focus spécial sur l'intégration avec les **advanced_select** et leurs **nodes avec champs texte**.

---

## 🏗️ Architecture Générale

### 1. Structure de Base
```
FormulasSystem/
├── FormulaEvaluator (Moteur d'évaluation)
├── FormulaEditor (Interface de construction)
├── Advanced_Select (Champs avec nodes hiérarchiques)
└── Database (Stockage Prisma)
```

### 2. Modèles de Données Prisma
```prisma
model FieldFormula {
  id       String @id @default(uuid())
  fieldId  String
  name     String?
  sequence String  // JSON stringified
  order    Int     @default(0)
  Field    Field   @relation(fields: [fieldId], references: [id], onDelete: Cascade)
}

model FieldOptionNode {
  id                     String  @id @default(uuid())
  fieldId                String
  parentId               String?
  label                  String
  value                  String?
  hasExtraInput          Boolean @default(false)
  extraInputType         String?
  extraInputPlaceholder  String?
  // ... autres champs
}
```

---

## 🔍 Advanced_Select : Fonctionnement Détaillé

### 1. Structure Hiérarchique avec Nodes

Les **advanced_select** utilisent un système de **nodes hiérarchiques** :

```javascript
// Exemple de structure node
{
  id: "node-prix-kwh",
  label: "Prix Kw/h",
  value: "prix-kwh",
  hasExtraInput: true,          // ⭐ CRUCIAL !
  extraInputType: "number",
  extraInputPlaceholder: "Entrez le prix"
}
```

**🔥 POINT CRITIQUE :** Chaque node peut avoir un **champ texte intégré** via `hasExtraInput: true` !

### 2. Trois Parties Accessibles dans les Formules

Un champ **advanced_select** expose **3 parties** :

| Partie | Description | Exemple de valeur |
|--------|-------------|-------------------|
| `selection` | Option sélectionnée | `"prix-kwh"` ou `"calcul-du-prix-kwh"` |
| `extra` | Valeur du champ texte | `0.35` ou `700` (selon l'option) |
| `nodeId` | ID du node sélectionné | `"a1b2c3d4-..."` |

### 3. Utilisation dans les Formules

```javascript
// Récupérer la sélection
{
  "type": "adv_part",
  "fieldId": "c8a2467b-9cf1-4dba-aeaf-77240adeedd5",
  "part": "selection"  // Prix Kw/h ou Calcul du prix
}

// Récupérer la valeur du champ texte
{
  "type": "adv_part", 
  "fieldId": "c8a2467b-9cf1-4dba-aeaf-77240adeedd5",
  "part": "extra"     // 0.35 ou 700 selon l'option
}
```

---

## 🧮 Moteur d'Évaluation des Formules

### 1. Types d'Éléments de Formule

```typescript
export type FormulaItemType = 
  | 'field'       // Référence à un champ standard
  | 'operator'    // +, -, *, /, =, >, <, etc.
  | 'value'       // Constante numérique ou string
  | 'adv_part'    // ⭐ Partie d'un advanced_select
  | 'cond'        // Condition IF/THEN/ELSE
  | 'switch'      // Switch sur advanced_select
  | 'formula_ref' // Référence à une autre formule
  | 'function';   // Fonctions (MIN, MAX, etc.)
```

### 2. Évaluation des Advanced_Select

Le moteur évalue les `adv_part` en récupérant les valeurs depuis l'objet advanced_select :

```javascript
// Structure d'un advanced_select en mémoire
{
  selection: "calcul-du-prix-kwh",  // Option sélectionnée
  extra: 700,                       // Valeur du champ texte
  nodeId: "abc123..."               // ID du node
}
```

### 3. Traitement des Conditions

```javascript
// Exemple de condition complexe
{
  "type": "cond",
  "condExpr": [
    {
      "type": "adv_part",
      "fieldId": "xxx",
      "part": "selection"
    },
    {
      "type": "operator", 
      "value": "="
    },
    {
      "type": "value",
      "value": "calcul-du-prix-kwh"
    }
  ],
  "then": [/* séquence si vrai */],
  "else": [/* séquence si faux */]
}
```

---

## 💡 Cas d'Usage Réel : Prix Kw/h

### 1. Structure du Problème

**Champ advanced_select "Prix Kw/h"** avec 2 options :
- `"Prix Kw/h"` → Valeur directe (ex: 0.35)
- `"Calcul du prix"` → Calcul dynamique (ex: 700 ÷ 4000)

### 2. Formule Implémentée

```javascript
[
  {
    "id": "main-condition",
    "type": "cond",
    "condExpr": [
      // Vérifier quelle option est sélectionnée
      {
        "type": "adv_part",
        "fieldId": "c8a2467b-9cf1-4dba-aeaf-77240adeedd5",
        "part": "selection"
      },
      {
        "type": "operator",
        "value": "="
      },
      {
        "type": "value", 
        "value": "calcul-du-prix-kwh"
      }
    ],
    "then": [
      // SI "Calcul du prix" → Faire le calcul
      {
        "type": "adv_part",
        "fieldId": "c8a2467b-9cf1-4dba-aeaf-77240adeedd5", 
        "part": "extra"  // Récupère 700
      },
      {
        "type": "operator",
        "value": "/"
      },
      {
        "type": "field",
        "fieldId": "aa448cfa-3d97-4c23-8995-8e013577e27d" // Consommation: 4000
      }
    ],
    "else": [
      // SINON → Valeur directe
      {
        "type": "adv_part",
        "fieldId": "c8a2467b-9cf1-4dba-aeaf-77240adeedd5",
        "part": "extra"  // Récupère 0.35
      }
    ]
  }
]
```

### 3. Résultats

| Sélection | Valeur Saisie | Calcul | Résultat |
|-----------|---------------|--------|----------|
| "Prix Kw/h" | 0.35 | Direct | 0.35 |
| "Calcul du prix" | 700 | 700 ÷ 4000 | 0.175 |

---

## 🚨 Pièges à Éviter

### 1. ❌ Valeurs Codées en Dur
```javascript
// MAUVAIS
{
  "type": "value",
  "value": 0.35  // Codé en dur !
}

// BON
{
  "type": "adv_part",
  "fieldId": "xxx",
  "part": "extra"  // Valeur dynamique
}
```

### 2. ❌ Séquences JSON Corrompues
**Problème fréquent :** Sauvegarde de `[object Object]` au lieu du JSON réel.

**Solution :** Toujours utiliser `JSON.stringify()` avant la sauvegarde.

### 3. ❌ Mauvaise Partie d'Advanced_Select
```javascript
// Vérifier que la bonne partie est utilisée
part: "selection"  // Pour l'option choisie
part: "extra"      // Pour la valeur du champ texte  
part: "nodeId"     // Pour l'ID du node (rare)
```

---

## 🛠️ API et Endpoints

### 1. Gestion des Formules
```
GET    /api/fields/:fieldId/formulas     // Lister les formules
PUT    /api/fields/:fieldId/formulas/:id // Mettre à jour
DELETE /api/fields/:fieldId/formulas/:id // Supprimer
```

### 2. Gestion des Option Nodes
```
GET    /api/option-nodes/:fieldId        // Arbre des nodes
POST   /api/option-nodes                 // Créer un node
DELETE /api/option-nodes/:id             // Supprimer
```

---

## 🔧 Debugging et Maintenance

### 1. Logs Utiles
```javascript
// Dans formulaEvaluator.ts
console.log('🎯 Field values during evaluation:', fieldValues);
console.log('📊 Advanced_select object:', rawValues[fieldId]);
```

### 2. Vérification des Données
```sql
-- Vérifier les formules corrompues
SELECT id, name, sequence 
FROM "FieldFormula" 
WHERE sequence = '[object Object]';

-- Vérifier les option nodes
SELECT * FROM "FieldOptionNode" 
WHERE "fieldId" = 'xxx'
ORDER BY "parentId", "order";
```

### 3. Scripts de Réparation
Utiliser les scripts de correction :
- `fix-corrupted-formulas.js` : Répare les séquences JSON
- `check-advanced-select.js` : Vérifie la structure des nodes

---

## 📈 Fonctionnalités Avancées

### 1. Conditions sur Résultats de Formules
```javascript
{
  "type": "cond",
  "condExpr": [
    {
      "type": "formula_ref",
      "refFormulaId": "autre-formule-id"
    },
    {
      "type": "operator",
      "value": ">"
    },
    {
      "type": "value",
      "value": 100
    }
  ]
}
```

### 2. Switch Basé sur Advanced_Select
```javascript
{
  "type": "switch",
  "switchFieldId": "advanced-select-field",
  "switchPart": "selection",
  "cases": [
    {
      "value": "option1",
      "seq": [/* formule pour option1 */]
    }
  ],
  "defaultSeq": [/* formule par défaut */]
}
```

---

## 🎯 Bonnes Pratiques

### 1. ✅ Structure des Formules
- Utiliser des labels clairs pour chaque élément
- Organiser les conditions en arbre logique
- Préférer les `adv_part` aux valeurs fixes

### 2. ✅ Gestion des Advanced_Select
- Toujours vérifier `hasExtraInput` avant d'utiliser `part: "extra"`
- Structurer les nodes de façon hiérarchique claire
- Utiliser des `value` uniques pour éviter les conflits

### 3. ✅ Tests et Validation
- Tester chaque branche de condition
- Vérifier les calculs avec différentes valeurs
- Valider le comportement avec des champs vides

---

## 🔄 Workflows de Développement

### 1. Création d'une Nouvelle Formule
1. Définir la logique métier
2. Identifier les champs source
3. Construire la séquence d'éléments
4. Tester avec des données réelles
5. Valider les cas limites

### 2. Modification d'un Advanced_Select
1. Sauvegarder les formules existantes
2. Modifier la structure des nodes
3. Adapter les formules si nécessaire
4. Tester la compatibilité

### 3. Debug d'une Formule
1. Vérifier les logs d'évaluation
2. Contrôler les valeurs des champs
3. Analyser la séquence JSON
4. Tester pas à pas

---

## 📚 Références Techniques

### 1. Fichiers Clés
- `src/utils/formulaEvaluator.ts` : Moteur d'évaluation
- `src/components/formulas/` : Interface utilisateur
- `src/routes/api/fields/formulas.ts` : API REST
- `prisma/schema.prisma` : Modèles de données

### 2. Types TypeScript
- `src/types/formula.ts` : Interfaces des formules
- `FormulaItem`, `SimpleCondition`, `Formula`

### 3. Hooks React
- `useAdvancedSelectCache` : Cache des arbres de nodes
- `useAuthenticatedApi` : Appels API authentifiés

---

## 🎉 Conclusion

Le système de formules CRM avec advanced_select offre une puissance de calcul remarquable en respectant parfaitement les **valeurs encodées en temps réel** par les utilisateurs. 

La clé du succès réside dans :
- ✅ L'utilisation correcte des `adv_part` avec `part: "extra"`
- ✅ L'évitement des valeurs codées en dur
- ✅ La compréhension de la structure hiérarchique des nodes
- ✅ La validation rigoureuse des séquences JSON

**Ce système permet de créer des formules complexes, conditionnelles et entièrement dynamiques ! 🚀**

---

*Document mis à jour le 18 août 2025 après résolution du problème des valeurs codées en dur.*
