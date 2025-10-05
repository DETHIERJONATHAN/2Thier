# 📊 Documentation - Règle A1 Excel pour Table Lookup

## Vue d'ensemble

Ce système gère des tableaux de type "matrix" avec lookup dynamique pour les formulaires TreeBranchLeaf (TBL).
Il respecte la **RÈGLE A1 EXCEL** : la cellule en haut à gauche (A1) représente le croisement entre les en-têtes de colonnes et les labels de lignes.

---

## 🎯 Exemple concret : Tableau d'orientations solaires

### Fichier Excel source

```
     A              B    C    D    E    F    G    H    I
1    Orientation    0    5    15   25   35   45   70   90
2    Nord          86   82   73   64   54   45   29   21
3    Nord Est      86   85   81   76   70   67   53   38
4    Est           86   88   90   90   89   86   72   54
```

**A1 = "Orientation"** : C'est le label qui décrit à la fois les colonnes (angles d'inclinaison) et les lignes (directions).

---

## 📦 Stockage interne (Base de données)

### Structure des données

```typescript
{
  columns: ["Orientation", "0", "5", "15", "25", "35", "45", "70", "90"],
  //        ↑ A1 présent    ↑ Valeurs pour lookup colonnes
  
  rows: ["Orientation", "Nord", "Nord Est", "Est", ...],
  //     ↑ A1 présent    ↑ Valeurs pour lookup lignes
  
  data: [
    [86, 82, 73, 64, 54, 45, 29, 21],  // rows[1] = "Nord"
    [86, 85, 81, 76, 70, 67, 53, 38],  // rows[2] = "Nord Est"
    [86, 88, 90, 90, 89, 86, 72, 54],  // rows[3] = "Est"
  ]
  // ⚠️ data[][] ne contient NI la première ligne NI la première colonne
}
```

### Principes de stockage

1. **columns[0]** = A1 ("Orientation")
2. **rows[0]** = A1 ("Orientation")
3. **data** = Corps du tableau sans headers (commence à B2 en termes Excel)
4. Cette structure est **IMMUABLE** après import (sauf renommage manuel)

---

## 🖥️ Affichage du tableau

### Rendu visuel dans l'interface

```
    Orientation │  0  │  5  │ 15  │ 25  │ 35  │ 45  │ 70  │ 90
    ────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────
    Nord        │ 86  │ 82  │ 73  │ 64  │ 54  │ 45  │ 29  │ 21
    Nord Est    │ 86  │ 85  │ 81  │ 76  │ 70  │ 67  │ 53  │ 38
    Est         │ 86  │ 88  │ 90  │ 90  │ 89  │ 86  │ 72  │ 54
```

### Logique d'affichage

- **Première colonne (fixe)** :
  - Titre : `columns[0]` = "Orientation"
  - Valeurs : `rows[1]`, `rows[2]`, `rows[3]`, ... (skip rows[0])
  
- **Autres colonnes** :
  - Titres : `columns[1]`, `columns[2]`, ... = "0", "5", "15", ...
  - Valeurs : `data[rowIdx][colIdx]`

**Résultat** : "Orientation" apparaît **UNE SEULE FOIS** en haut à gauche (A1).

---

## 🔍 Lookup dynamique (Champs SELECT)

### CAS 1 : SELECT sur colonne "Orientation"

**Configuration** :
- `keyColumn = "Orientation"` (columns[0])

**Extraction backend** :
```typescript
const colIndex = columns.indexOf("Orientation"); // = 0
if (colIndex === 0) {
  // Colonne A = Labels de lignes
  options = rows.slice(1); // ["Nord", "Nord Est", "Est", ...]
}
```

**Résultat dans le SELECT** :
```
Nord
Nord Nord-Est
Nord Est
Est Nord-Est
Est
...
```

---

### CAS 2 : SELECT sur ligne "Orientation" (A1)

**Configuration** :
- `keyRow = "Orientation"` (rows[0])

**Extraction backend** :
```typescript
const rowIndex = rows.indexOf("Orientation"); // = 0
if (rowIndex === 0) {
  // Ligne A1 = En-têtes de colonnes
  options = columns.slice(1); // ["0", "5", "15", "25", ...]
}
```

**Résultat dans le SELECT** :
```
0
5
15
25
35
45
70
90
```

---

### CAS 3 : SELECT sur ligne "Nord"

**Configuration** :
- `keyRow = "Nord"` (rows[1])

**Extraction backend** :
```typescript
const rowIndex = rows.indexOf("Nord"); // = 1
const dataRowIndex = rowIndex - 1; // = 0 (décalage car data n'a pas headers)
options = data[0]; // [86, 82, 73, 64, 54, 45, 29, 21]
```

**Résultat dans le SELECT** :
```
86
82
73
64
54
45
29
21
```

---

## 📥 Import Excel

### Workflow d'import

1. **Lecture du fichier** : `XLSX.utils.sheet_to_json(worksheet, { header: 1 })`
2. **Extraction des données** :
   ```typescript
   // Colonnes = Première ligne complète (avec A1)
   columns = jsonData[0]; // ["Orientation", "0", "5", ...]
   
   // Lignes = Première colonne complète (avec A1)
   rows = jsonData.map(row => row[0]); // ["Orientation", "Nord", ...]
   
   // Data = Corps sans première ligne NI première colonne
   data = jsonData.slice(1).map(row => row.slice(1));
   ```

3. **Sauvegarde en base** : Structure avec A1 présent dans columns ET rows

### Conversions automatiques

- Valeurs `null`/`undefined` → Strings par défaut
- Nombres → Convertis en strings pour cohérence
- Cellules vides → Noms génériques ("Colonne 1", "Ligne 1")

---

## 📤 Export Excel

### Reconstruction du fichier

```typescript
// Ligne 1 = En-têtes de colonnes (avec A1)
const excelData = [
  [...columns] // ["Orientation", "0", "5", "15", ...]
];

// Lignes suivantes = [Label ligne, ...valeurs données]
rows.slice(1).forEach((rowLabel, idx) => {
  const rowData = data[idx] || [];
  excelData.push([rowLabel, ...rowData]);
});

// Création du fichier
const worksheet = XLSX.utils.aoa_to_sheet(excelData);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Tableau');
XLSX.writeFile(workbook, 'fichier.xlsx');
```

**Garantie** : Le fichier téléchargé est **IDENTIQUE** au fichier importé !

---

## ⚙️ Backend API

### Endpoint

```
GET /api/treebranchleaf/nodes/:nodeId/table/lookup
```

### Paramètres

- `tableId` : ID du tableau
- `fieldId` : ID du champ SELECT

### Logique d'extraction

```typescript
// CAS COLONNE
if (selectConfig.keyColumn) {
  const colIndex = columns.indexOf(selectConfig.keyColumn);
  
  if (colIndex === 0) {
    // Colonne A = Labels de lignes (skip A1)
    return rows.slice(1);
  } else {
    // Autre colonne = Données (avec décalage)
    const dataColIndex = colIndex - 1;
    return data.map(row => row[dataColIndex]);
  }
}

// CAS LIGNE
if (selectConfig.keyRow) {
  const rowIndex = rows.indexOf(selectConfig.keyRow);
  
  if (rowIndex === 0) {
    // Ligne A1 = En-têtes de colonnes (skip A1)
    return columns.slice(1);
  } else {
    // Autre ligne = Données (avec décalage)
    const dataRowIndex = rowIndex - 1;
    return data[dataRowIndex];
  }
}
```

---

## 🚨 Règles critiques

### ✅ À FAIRE

1. **Toujours** garder A1 dans `columns[0]` ET `rows[0]`
2. **Toujours** détecter `colIndex === 0` ou `rowIndex === 0` comme cas spéciaux
3. **Toujours** appliquer décalage `-1` pour accéder à `data[][]`
4. **Toujours** utiliser `.slice(1)` pour skipper A1 dans l'extraction d'options
5. **Toujours** reconstruire la structure originale lors de l'export Excel

### ❌ À NE PAS FAIRE

1. ❌ Modifier `columns` ou `rows` après import (sauf renommage utilisateur)
2. ❌ Hardcoder des valeurs ("Orientation", "Nord", etc.)
3. ❌ Afficher A1 deux fois dans le tableau visuel
4. ❌ Extraire depuis `data[0]` quand `rowIndex === 0` (extraire depuis `columns` !)
5. ❌ Oublier le décalage `-1` pour `data[][]`

---

## 💡 Avantages de cette architecture

### 1. 100% Dynamique
- Aucune valeur hardcodée
- Fonctionne avec **N'IMPORTE QUEL** tableau Excel
- Détection automatique de A1 basée sur la position

### 2. Préservation des données
- Import/Export réversible
- Structure Excel native respectée
- Pas de perte d'information

### 3. Flexibilité du lookup
- Extraction par colonne OU par ligne
- Gestion automatique de A1
- Support de tableaux complexes

### 4. Cohérence interface/backend
- Même logique de décalage partout
- Documentation synchronisée
- Debugging facilité

---

## 📝 Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `TablePanel.tsx` | Interface d'édition + Import/Export Excel |
| `treebranchleaf-routes.ts` | API Backend pour extraction lookup |
| `useTBLTableLookup.ts` | Hook React pour charger les options |
| `TBLField.tsx` | Composant SELECT qui affiche les options |

---

## 🔧 Debugging

### Logs utiles

**Frontend (TablePanel.tsx)** :
```typescript
console.log('📊 Colonnes:', cfg.columns);
console.log('📊 Lignes:', cfg.rows);
console.log('📊 Data:', cfg.data);
```

**Backend (treebranchleaf-routes.ts)** :
```typescript
console.log('[TreeBranchLeaf API] keyColumn:', selectConfig.keyColumn);
console.log('[TreeBranchLeaf API] colIndex:', colIndex);
console.log('[TreeBranchLeaf API] isColumnA:', colIndex === 0);
console.log('[TreeBranchLeaf API] Options:', options);
```

### Vérifications rapides

1. **A1 est-il présent ?** → `columns[0] === rows[0]` doit être vrai
2. **Le tableau s'affiche bien ?** → A1 doit apparaître UNE SEULE FOIS
3. **Le SELECT est vide ?** → Vérifier `keyColumn`/`keyRow` en base
4. **Mauvaises valeurs dans SELECT ?** → Vérifier décalage `-1` pour `data[][]`

---

## 📚 Ressources

- **Norme Excel** : https://support.microsoft.com/excel
- **XLSX.js** : https://docs.sheetjs.com/
- **Prisma Schema** : `prisma/schema.prisma`

---

**Dernière mise à jour** : 6 octobre 2025  
**Auteur** : Système TBL - CRM 2Thier
