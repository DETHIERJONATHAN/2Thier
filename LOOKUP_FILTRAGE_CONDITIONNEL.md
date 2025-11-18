# 🔥 Système de Filtrage Conditionnel pour Lookups de Tableaux

## 📋 Vue d'ensemble

Ce document explique le système complet de **filtrage conditionnel des options de lookup** basé sur les tableaux TreeBranchLeaf (TBL). Le système permet de filtrer dynamiquement les options d'un champ SELECT selon des conditions comparant les valeurs de formulaire avec les données du tableau.

---

## 🎯 Fonctionnalités Principales

### 1. **Filtrage Flexible**
- ✅ Filtrer par **COLONNE** du tableau
- ✅ Filtrer par **LIGNE** du tableau  
- ✅ Filtrer par **COLONNE ET LIGNE** simultanément
- ✅ Indépendant du type de lookup (keyColumn ou keyRow)

### 2. **Opérateurs de Comparaison**
- `equals` : Égal (=)
- `notEquals` : Différent (≠)
- `greaterThan` : Supérieur (>)
- `lessThan` : Inférieur (<)
- `greaterOrEqual` : Supérieur ou égal (≥)
- `lessOrEqual` : Inférieur ou égal (≤)
- `contains` : Contient
- `notContains` : Ne contient pas

### 3. **Logique Combinatoire**
- **AND** : Toutes les conditions doivent être vraies
- **OR** : Au moins une condition doit être vraie

---

## 🏗️ Architecture

### Structure des Fichiers

```
src/
├── components/TreeBranchLeaf/treebranchleaf-new/
│   ├── components/Parameters/capabilities/
│   │   └── TablePanel.tsx                    # Interface de configuration
│   ├── TBL/
│   │   ├── components/
│   │   │   └── TBLFieldRendererAdvanced.tsx  # Runtime de filtrage
│   │   └── hooks/
│   │       └── useTBLTableLookup.ts          # Hook de chargement des données
```

---

## 📦 Types et Interfaces

### TableLookupCondition

```typescript
type TableLookupCondition = {
  id: string;
  filterByColumn?: string;      // Colonne du tableau à filtrer (optionnel)
  filterByRow?: string;          // Ligne du tableau à filtrer (optionnel)
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 
            'greaterOrEqual' | 'lessOrEqual' | 'contains' | 'notContains';
  compareWithRef?: string;       // Référence NodeTreeSelector vers un champ
  description?: string;          // Description lisible
};
```

### TableLookupConfig

```typescript
type TableLookupConfig = {
  keyColumn?: string;
  keyRow?: string;
  filterConditions?: {
    enabled?: boolean;
    conditions?: TableLookupCondition[];
    filterLogic?: 'AND' | 'OR';
  };
};
```

### TableLookupResult (Hook)

```typescript
interface TableLookupResult {
  options: TableLookupOption[];
  loading: boolean;
  error: string | null;
  tableData?: {
    columns: string[];
    rows: string[];
    data: unknown[][];
    type: 'columns' | 'matrix';
  };
  config?: TreeBranchLeafSelectConfig;
}
```

---

## 🔧 Composants Principaux

### 1. TablePanel.tsx - Interface de Configuration

**Localisation** : `src/components/TreeBranchLeaf/treebranchleaf-new/components/Parameters/capabilities/TablePanel.tsx`

#### Fonctionnalités :
- Switch pour activer/désactiver le filtrage
- Dropdown "Filtrer par colonne" (avec allowClear)
- Dropdown "Filtrer par ligne" (avec allowClear)
- Sélection d'opérateur de comparaison
- NodeTreeSelector pour choisir le champ de référence
- Gestion de plusieurs conditions
- Logique AND/OR pour combiner les conditions

#### Code clé :

```typescript
// Ajout d'une nouvelle condition
const addFilterCondition = useCallback(() => {
  const newCondition: TableLookupCondition = {
    id: `condition_${Date.now()}`,
    filterByColumn: undefined,
    filterByRow: undefined,
    operator: 'equals',
    compareWithRef: '',
    description: ''
  };
  
  updateLookupConfig((prev) => ({
    ...prev,
    filterConditions: {
      ...prev.filterConditions,
      enabled: true,
      conditions: [...(prev.filterConditions?.conditions || []), newCondition],
      filterLogic: prev.filterConditions?.filterLogic || 'AND'
    }
  }));
}, [updateLookupConfig]);
```

---

### 2. useTBLTableLookup.ts - Hook de Chargement

**Localisation** : `src/components/TreeBranchLeaf/treebranchleaf-new/TBL/hooks/useTBLTableLookup.ts`

#### Modifications apportées :
- Ajout de `tableData` dans le retour du hook
- Ajout de `config` dans le retour du hook
- Exposition des données complètes du tableau (columns, rows, data, type)

#### Code clé :

```typescript
export function useTBLTableLookup(
  fieldId: string | undefined,
  nodeId: string | undefined,
  enabled: boolean = true
): TableLookupResult {
  const [tableData, setTableData] = useState<{
    columns: string[], 
    rows: string[], 
    data: unknown[][], 
    type: 'columns' | 'matrix'
  } | undefined>(undefined);
  const [config, setConfig] = useState<TreeBranchLeafSelectConfig | undefined>(undefined);
  
  // ... logique de chargement ...
  
  setOptions(extractedOptions);
  setConfig(selectConfig);
  setTableData({
    columns: table.columns,
    rows: table.rows,
    data: table.data,
    type: table.type
  });
  
  return { options, loading, error, tableData, config };
}
```

---

### 3. TBLFieldRendererAdvanced.tsx - Runtime de Filtrage

**Localisation** : `src/components/TreeBranchLeaf/treebranchleaf-new/TBL/components/TBLFieldRendererAdvanced.tsx`

#### Fonctionnalités :
- Évaluation des conditions pour chaque option individuellement
- Support du filtrage par colonne et/ou ligne
- Extraction des valeurs depuis le tableau selon le type (columns/matrix)
- Comparaison avec les valeurs du formulaire

#### Fonctions principales :

##### evaluateFilterConditions

```typescript
const evaluateFilterConditions = (
  option: any,
  conditions: TableLookupCondition[], 
  formData: Record<string, any>,
  tableData: {columns: string[], rows: string[], data: unknown[][], type: 'columns' | 'matrix'},
  config: any,
  filterLogic: 'AND' | 'OR' = 'AND'
): boolean => {
  if (!conditions || conditions.length === 0) return true;
  if (!tableData || !config) return true;

  const results = conditions.map(condition => {
    // 1. Extraire la valeur de référence depuis formData
    let referenceValue: any = null;
    if (condition.compareWithRef?.startsWith('@value.')) {
      const fieldId = condition.compareWithRef.replace('@value.', '');
      referenceValue = formData[fieldId];
    }
    
    // 2. Trouver la/les valeur(s) correspondante(s) dans le tableau
    const tableValues: any[] = [];
    if (condition.filterByColumn) {
      const columnValue = extractValueFromColumn(option, condition.filterByColumn, tableData, config);
      if (columnValue !== null) tableValues.push(columnValue);
    }
    if (condition.filterByRow) {
      const rowValue = extractValueFromRow(option, condition.filterByRow, tableData, config);
      if (rowValue !== null) tableValues.push(rowValue);
    }
    
    // 3. Comparer selon l'opérateur
    const conditionResults = tableValues.map(tableValue => {
      switch (condition.operator) {
        case 'equals': return String(referenceValue) === String(tableValue);
        case 'greaterThan': return Number(referenceValue) > Number(tableValue);
        // ... autres opérateurs
      }
    });
    
    return conditionResults.every(result => result);
  });

  return filterLogic === 'AND' 
    ? results.every(result => result) 
    : results.some(result => result);
};
```

##### extractValueFromColumn

```typescript
const extractValueFromColumn = (
  option: any,
  targetColumn: string,
  tableData: {columns: string[], rows: string[], data: unknown[][], type: 'columns' | 'matrix'},
  config: any
): any => {
  if (tableData.type === 'columns') {
    const keyColIndex = config.keyColumn ? tableData.columns.indexOf(config.keyColumn) : 0;
    const targetColIndex = tableData.columns.indexOf(targetColumn);
    
    if (keyColIndex >= 0 && targetColIndex >= 0) {
      const matchingRowIndex = tableData.data.findIndex(
        row => String(row[keyColIndex]) === String(option.value)
      );
      if (matchingRowIndex >= 0) {
        return tableData.data[matchingRowIndex][targetColIndex];
      }
    }
  } else if (tableData.type === 'matrix') {
    // Logique pour mode matrix...
  }
  
  return null;
};
```

##### extractValueFromRow

```typescript
const extractValueFromRow = (
  option: any,
  targetRow: string,
  tableData: {columns: string[], rows: string[], data: unknown[][], type: 'columns' | 'matrix'},
  config: any
): any => {
  if (tableData.type === 'matrix') {
    const targetRowIndex = tableData.rows.indexOf(targetRow);
    
    if (config.keyColumn) {
      // Lookup par colonne: trouver la ligne cible
      const optionColIndex = tableData.columns.indexOf(String(option.value));
      if (targetRowIndex >= 0 && optionColIndex >= 0) {
        const dataRowIndex = targetRowIndex - 1;
        const dataColIndex = optionColIndex - 1;
        if (dataRowIndex >= 0 && dataColIndex >= 0) {
          return tableData.data[dataRowIndex][dataColIndex];
        }
      }
    }
  }
  
  return null;
};
```

#### Utilisation dans le case SELECT :

```typescript
case 'SELECT': {
  let baseOptions = (fieldConfig.hasTable && tableLookup.options.length > 0) 
    ? tableLookup.options 
    : staticOptions;

  // 🔥 Filtrage conditionnel
  if (fieldConfig.hasTable && field.capabilities?.table?.currentTable?.meta?.lookup) {
    const lookupConfig = field.capabilities.table.currentTable.meta.lookup;
    const filterConfig = lookupConfig.filterConditions;
    
    if (filterConfig?.enabled && filterConfig.conditions && filterConfig.conditions.length > 0 && 
        tableLookup.tableData && tableLookup.config) {
      
      baseOptions = baseOptions.filter(option => 
        evaluateFilterConditions(
          option,
          filterConfig.conditions,
          formData,
          tableLookup.tableData!,
          tableLookup.config!,
          filterConfig.filterLogic || 'AND'
        )
      );
    }
  }
  
  // ... reste du rendu SELECT
}
```

---

## 🎯 Cas d'Usage Concrets

### Exemple 1 : Onduleurs filtrés par puissance

**Contexte** :
- Tableau "Onduleurs" avec colonnes : `[Modèle, Puissance, Prix, Garantie]`
- Champ formulaire "Puissance Panneaux" (INPUT_NUMBER)
- SELECT lookup sur colonne "Modèle"

**Configuration** :
```
Filtrage activé: ✅
Filtrer par colonne: "Puissance"
Opérateur: greaterOrEqual (≥)
Comparer avec: @value.{id_champ_puissance_panneaux}
```

**Résultat** :
Seuls les onduleurs dont la puissance est supérieure ou égale à la valeur saisie par l'utilisateur sont affichés dans le SELECT.

---

### Exemple 2 : Produits filtrés par prix ET stock

**Contexte** :
- Tableau "Produits" (mode matrix)
- Lookup par keyColumn = "Nom"
- Lignes : `[Prix, Stock, Catégorie]`

**Configuration** :
```
Filtrage activé: ✅
Logique: AND

Condition 1:
  Filtrer par ligne: "Prix"
  Opérateur: lessOrEqual (≤)
  Comparer avec: @value.{id_budget_max}

Condition 2:
  Filtrer par ligne: "Stock"
  Opérateur: greaterThan (>)
  Comparer avec: Valeur fixe "0"
```

**Résultat** :
Seuls les produits dont le prix est inférieur au budget ET dont le stock est supérieur à 0 sont affichés.

---

### Exemple 3 : Filtrage hybride colonne + ligne

**Contexte** :
- Tableau "Véhicules" avec colonnes : `[Marque, Modèle, Type]`
- Lignes : `[Prix, Année, Disponibilité]`

**Configuration** :
```
Filtrage activé: ✅
Logique: AND

Filtrer par colonne: "Type"
Opérateur: equals (=)
Comparer avec: @select.{id_type_vehicule}

Filtrer par ligne: "Prix"
Opérateur: lessThan (<)
Comparer avec: @value.{id_budget}
```

**Résultat** :
Seuls les véhicules du type sélectionné ET dont le prix est inférieur au budget sont affichés.

---

## 🔄 Flux de Données

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. CONFIGURATION (TablePanel.tsx)                                │
│    - User active filtrage                                        │
│    - Sélectionne colonne/ligne                                   │
│    - Choisit opérateur                                           │
│    - Sélectionne champ de référence via NodeTreeSelector         │
│    - Sauvegardé dans node.capabilities.table.meta.lookup         │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. CHARGEMENT (useTBLTableLookup)                                │
│    - GET /api/treebranchleaf/nodes/:nodeId/table/lookup          │
│    - Récupération des options brutes                             │
│    - Exposition de tableData (columns, rows, data)               │
│    - Exposition de config (keyColumn, keyRow)                    │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. RUNTIME (TBLFieldRendererAdvanced)                            │
│    - Pour chaque option du lookup:                               │
│      a) Extraire valeur de référence depuis formData             │
│      b) Extraire valeur(s) du tableau selon filterBy{Column/Row} │
│      c) Comparer selon opérateur                                 │
│      d) Garder l'option si condition(s) passent                  │
│    - Combiner résultats selon logique AND/OR                     │
│    - Afficher options filtrées dans le SELECT                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Interface Utilisateur

### Vue de Configuration dans TablePanel

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔥 Filtrage pour ce lookup                             [Switch] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Logique de combinaison: [ET ▼]     [+ Ajouter condition]      │
│                                                                  │
│  ┌─ Condition 1 ───────────────────────────────────────── [🗑] ┐│
│  │                                                              ││
│  │  Filtrer par colonne:                                       ││
│  │  [Sélectionner... ▼]                    (optionnel)         ││
│  │                                                              ││
│  │  Filtrer par ligne:                                         ││
│  │  [📋 Ligne 1 (SMA Sunny Boy...) ▼]     (optionnel)         ││
│  │                                                              ││
│  │  Opérateur:              Comparer avec:                     ││
│  │  [≥ (sup. ou égal) ▼]   [@value.xxx... 🌳 Sélectionner]    ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Affichage des Lignes dans la Dropdown

**Format** : `📋 Ligne {index} ({aperçu tronqué})`

Exemple :
```
📋 Ligne 1 (SMA Sunny Boy 1.5...)
📋 Ligne 2 (SMA Sunny Boy 2.0...)
📋 Ligne 3 (SMA Sunny Boy 2.5...)
```

---

## ⚠️ Points d'Attention

### 1. Gestion des Données Manquantes
- Vérifier que `tableData` et `config` sont définis avant le filtrage
- Retourner `true` (afficher l'option) si les données sont manquantes

### 2. Décalage des Index (Mode Matrix)
- `data[][]` n'inclut PAS la colonne A (labels de lignes)
- `data[][]` n'inclut PAS la ligne 1 (en-têtes de colonnes)
- Appliquer `-1` aux index lors de l'accès à `data`

### 3. Conversion de Types
- Toujours convertir avec `String()` pour comparaisons de texte
- Toujours convertir avec `Number()` pour comparaisons numériques
- Gérer les valeurs `null`, `undefined`, `''`

### 4. Performance
- Le filtrage s'exécute à chaque rendu du formulaire
- Optimiser avec `useMemo` si nécessaire pour grandes listes
- Éviter les calculs lourds dans `evaluateFilterConditions`

---

## 🚀 Améliorations Futures

### Court Terme
- [ ] Support des formules dans `compareWithRef` (formula:{id})
- [ ] Support des conditions dans `compareWithRef` (condition:{id})
- [ ] Prévisualisation temps réel des options filtrées dans TablePanel
- [ ] Validation des références (champ existe, type compatible)

### Moyen Terme
- [ ] Cache des résultats de filtrage
- [ ] Filtrage côté serveur pour très grands tableaux
- [ ] Export de configuration de filtrage (JSON)
- [ ] Templates de filtrage réutilisables

### Long Terme
- [ ] Éditeur visuel de conditions (if/then/else)
- [ ] Analytics sur l'utilisation des filtres
- [ ] A/B testing de configurations de filtrage
- [ ] IA pour suggérer des filtres pertinents

---

## 📚 Références

### Fichiers Modifiés
- `TablePanel.tsx` : Interface de configuration
- `useTBLTableLookup.ts` : Hook de chargement avec données étendues
- `TBLFieldRendererAdvanced.tsx` : Runtime de filtrage

### Types TypeScript
- `TableLookupCondition`
- `TableLookupConfig`
- `TableLookupResult`
- `TableLookupOption`

### API Endpoints
- `GET /api/treebranchleaf/nodes/:nodeId/table/lookup`

---

## 🎓 Guide de Migration

Si vous avez des lookups existants sans filtrage, ils continueront de fonctionner normalement. Le filtrage est optionnel et s'active uniquement si :

```typescript
filterConditions?.enabled === true 
&& filterConditions.conditions?.length > 0
```

Aucune migration de données nécessaire ! ✅

---

## 📞 Support

Pour toute question ou problème concernant le système de filtrage conditionnel :
1. Vérifier les types TypeScript
2. Consulter les logs de la console pour les erreurs d'extraction
3. Tester avec une condition simple avant d'en ajouter plusieurs
4. Vérifier que le champ de référence existe et contient une valeur

---

**Dernière mise à jour** : 18 novembre 2025  
**Version** : 1.0.0  
**Auteur** : Système TreeBranchLeaf + TBL
