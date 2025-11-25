# 🎯 RÉSUMÉ COMPLET - Filtrage ÉTAPE 2.5

## ✅ CE QUI FONCTIONNE

### 1. Configuration sauvegardée correctement
```json
{
  "lookup": {
    "enabled": true,
    "columnSourceOption": {
      "filterColumn": "P min WC",
      "filterOperator": "greaterThan",
      "filterValueRef": "node-formula:ffaac345-c126-4fe1-b703-baecaed93b3a"
    }
  }
}
```
✅ Sauvegardée dans `TreeBranchLeafNodeTable.meta`  
✅ Retournée correctement par l'API GET /nodes/:nodeId/tables

### 2. Backend récupère et utilise la configuration
✅ Route `/nodes/:nodeId/table/lookup` charge `table.meta.lookup`  
✅ Fonction `applyStep25Filtering()` est appelée  
✅ Le filtrage fonctionne avec des valeurs statiques (test: 79/85 onduleurs filtrés)

---

## ❌ LE PROBLÈME

### Le `filterValueRef` n'est pas résolu correctement

**Configuration actuelle** :
```json
"filterValueRef": "node-formula:ffaac345-c126-4fe1-b703-baecaed93b3a"
```

**Ce que ça signifie** :
- `ffaac345-c126-4fe1-b703-baecaed93b3a` = ID du champ "Puissance total"
- Le backend doit LIRE la valeur de ce champ depuis le formulaire TBL
- Exemple : Si "Puissance total" = 4400, filtrer les onduleurs avec "P min WC" > 4400

**Ce que fait le backend ACTUELLEMENT** :
```typescript
// treebranchleaf-routes.ts ligne 9944
const normalizedValueColName = String(filterConfig.filterValueRef).trim().toLowerCase();
const valueColIndex = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedValueColName);
```
❌ Il cherche une **colonne** nommée "node-formula:ffaac345..." dans le tableau Onduleur  
❌ Cette colonne n'existe pas → le filtre ne s'applique jamais

---

## 🔧 SOLUTION NÉCESSAIRE

### Modifications à apporter

#### 1. **Modifier `applyStep25Filtering()` pour gérer les références de nœuds**

Fichier : `src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts`  
Ligne : 9916

```typescript
function applyStep25Filtering(
  options: Array<{ value: string; label: string }>,
  filterConfig: any,
  columns: string[],
  rows: string[],
  data: any[][],
  keyType: 'column' | 'row',
  formValues?: Record<string, any>  // 🆕 AJOUTER CE PARAMÈTRE
): Array<{ value: string; label: string }> {
  if (!filterConfig?.filterColumn || !filterConfig?.filterOperator || !filterConfig?.filterValueRef) {
    return options;
  }

  console.log(`[applyStep25Filtering] 🔥 ÉTAPE 2.5 - Filtrage: colonne="${filterConfig.filterColumn}", op="${filterConfig.filterOperator}", ref="${filterConfig.filterValueRef}"`);

  // Trouver l'index de la colonne à filtrer
  const normalizedFilterColName = String(filterConfig.filterColumn).trim().toLowerCase();
  const filterColIndex = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedFilterColName);

  if (filterColIndex === -1) {
    console.warn(`[applyStep25Filtering] ⚠️ Colonne de filtrage non trouvée: "${filterConfig.filterColumn}"`);
    return options;
  }

  // 🆕 RÉSOUDRE LA RÉFÉRENCE DE VALEUR
  let comparisonValue: any;
  const valueRef = String(filterConfig.filterValueRef);
  
  if (valueRef.startsWith('node-formula:')) {
    // 🎯 CAS 1: Référence à un champ du formulaire
    const nodeId = valueRef.replace('node-formula:', '');
    comparisonValue = formValues?.[nodeId];
    
    if (comparisonValue === undefined || comparisonValue === null) {
      console.warn(`[applyStep25Filtering] ⚠️ Valeur du nœud "${nodeId}" non trouvée dans formValues`);
      return options; // Pas de filtrage si la valeur n'est pas disponible
    }
    
    console.log(`[applyStep25Filtering] ✅ Valeur résolue depuis nœud ${nodeId}: ${comparisonValue}`);
  } else {
    // 🎯 CAS 2: Référence à une colonne du tableau (ancien comportement)
    const normalizedValueColName = valueRef.trim().toLowerCase();
    const valueColIndex = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedValueColName);

    if (valueColIndex === -1) {
      console.warn(`[applyStep25Filtering] ⚠️ Colonne de comparaison non trouvée: "${valueRef}"`);
      return options;
    }
    
    // La valeur sera extraite ligne par ligne (comportement existant)
    comparisonValue = valueColIndex;
  }

  // Filtrer les options
  const filteredOptions = options.filter((option) => {
    // Trouver la ligne correspondante
    let matchingRowIndex = -1;
    
    if (keyType === 'column') {
      const normalizedValue = String(option.value).trim().toLowerCase();
      
      if (filterColIndex === 0) {
        matchingRowIndex = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedValue);
      } else {
        const dataColIndex = filterColIndex - 1;
        matchingRowIndex = data.findIndex(row => String(row[dataColIndex]).trim().toLowerCase() === normalizedValue);
      }
    }

    if (matchingRowIndex !== -1) {
      // Extraire la valeur de la cellule de filtrage
      const filterCellValue = filterColIndex === 0 ? rows[matchingRowIndex] : data[matchingRowIndex]?.[filterColIndex - 1];
      
      // 🆕 Déterminer la valeur de comparaison
      let valueCellValue;
      if (typeof comparisonValue === 'number' || typeof comparisonValue === 'string') {
        // Référence de nœud → utiliser la valeur du formulaire
        valueCellValue = comparisonValue;
      } else {
        // Référence de colonne → extraire depuis la ligne
        const valueColIndex = comparisonValue;
        valueCellValue = valueColIndex === 0 ? rows[matchingRowIndex] : data[matchingRowIndex]?.[valueColIndex - 1];
      }
      
      // Appliquer l'opérateur
      const matches = compareValuesByOperator(filterConfig.filterOperator, filterCellValue, valueCellValue);

      if (matches) {
        console.log(`[applyStep25Filtering] ✅ Option ACCEPTÉE: "${option.value}" → ${filterCellValue} ${filterConfig.filterOperator} ${valueCellValue}`);
      } else {
        console.log(`[applyStep25Filtering] ❌ Option REJETÉE: "${option.value}" → ${filterCellValue} ${filterConfig.filterOperator} ${valueCellValue}`);
      }

      return matches;
    }

    return true;
  });

  console.log(`[applyStep25Filtering] 📊 Résultat: ${filteredOptions.length}/${options.length} options conservées`);
  return filteredOptions;
}
```

#### 2. **Modifier la route `/nodes/:nodeId/table/lookup` pour accepter formValues**

Ligne : 10027

```typescript
router.get('/nodes/:nodeId/table/lookup', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    
    // 🆕 Récupérer les valeurs du formulaire depuis la query string
    let formValues: Record<string, any> = {};
    if (req.query.formValues) {
      try {
        formValues = JSON.parse(String(req.query.formValues));
        console.log(`[TreeBranchLeaf API] 📊 Form values reçues:`, formValues);
      } catch (error) {
        console.warn(`[TreeBranchLeaf API] ⚠️ Erreur parsing formValues:`, error);
      }
    }

    // ... (le reste du code existant)
    
    // 🔥 ÉTAPE 2.5 : Appliquer le filtrage avec formValues
    const lookup = table.meta?.lookup as any;
    const filterConfig = lookup?.columnSourceOption;
    if (filterConfig?.filterColumn && filterConfig?.filterOperator && filterConfig?.filterValueRef) {
      const filteredOptions = applyStep25Filtering(
        options, 
        filterConfig, 
        columns, 
        rows, 
        data, 
        'row', 
        formValues  // 🆕 PASSER formValues
      );
      console.log(`[TreeBranchLeaf API] 🔥 ÉTAPE 2.5 appliqué: ${filteredOptions.length} options sur ${options.length}`);
      return res.json({ options: filteredOptions });
    }
```

**Mettre à jour TOUS les appels à `applyStep25Filtering()`** :
- Ligne 10241: `applyStep25Filtering(options, filterConfig, columns, rows, data, 'row', formValues)`
- Ligne 10295: `applyStep25Filtering(options, filterConfig, columns, rows, data, 'column', formValues)`
- Ligne 10364: `applyStep25Filtering(autoOptions, filterConfig, columns, rows, data, 'column', formValues)`

#### 3. **Modifier le frontend pour envoyer formValues**

Fichier : Composant qui charge les options du SELECT (probablement `TBLFieldRenderer.tsx` ou similaire)

```typescript
// Lors du chargement des options du SELECT
const loadSelectOptions = async (nodeId: string) => {
  // 🆕 Récupérer toutes les valeurs du formulaire actuel
  const formValues = getCurrentFormValues(); // À implémenter selon votre état
  
  // 🆕 Encoder les valeurs en query string
  const queryParams = new URLSearchParams({
    formValues: JSON.stringify(formValues)
  });
  
  const response = await api.get(`/api/treebranchleaf/nodes/${nodeId}/table/lookup?${queryParams}`);
  return response.options;
};
```

---

## 📝 ÉTAPES D'IMPLÉMENTATION

1. ✅ **Modifier `applyStep25Filtering()`** → Ajouter paramètre `formValues` et logique de résolution
2. ✅ **Modifier route `/nodes/:nodeId/table/lookup`** → Extraire `formValues` depuis query string
3. ✅ **Mettre à jour tous les appels** → Passer `formValues` partout
4. ⏸️ **Modifier le frontend** → Envoyer les valeurs du formulaire dans l'appel API
5. ⏸️ **Tester** → Vérifier que le filtrage dynamique fonctionne

---

## 🧪 TEST RAPIDE

Pour tester si les modifications fonctionnent :

1. Ouvrir un formulaire TBL
2. Remplir "Puissance total" = 4400
3. Ouvrir le SELECT "Onduleur"
4. Vérifier dans DevTools → Network :
   - URL appelée : `/api/treebranchleaf/nodes/.../table/lookup?formValues={...}`
   - Paramètre `formValues` contient `{"ffaac345-c126-4fe1-b703-baecaed93b3a": 4400}`
5. Vérifier que SEULS les onduleurs avec "P min WC" > 4400 sont affichés
6. Changer "Puissance total" = 3000
7. Rouvrir le SELECT → La liste doit être différente

---

## 🎯 RÉSULTAT ATTENDU

**Avant** : 85 onduleurs affichés (pas de filtrage)  
**Après** : Nombre d'onduleurs filtré en fonction de "Puissance total"

Exemples :
- Puissance total = 4400 → 79 onduleurs ✅
- Puissance total = 10000 → ~40 onduleurs ✅
- Puissance total = 20000 → ~15 onduleurs ✅
