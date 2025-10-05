# 🚀 REFACTORISATION COMPLÈTE - LOOKUP UNIFIÉ

## 🎯 OBJECTIF
Unifier le système de lookup en supprimant la distinction "colonnes" vs "croisés" et permettre à l'utilisateur de choisir directement :
- **Extraire depuis COLONNE** → Affiche les valeurs d'une colonne (ex: Ventes, Coûts, Bénéfices...)
- **Extraire depuis LIGNE** → Affiche les valeurs d'une ligne (ex: 100, 200, 150, 300...)

---

## ✅ PHASE 1 : TYPES (DÉJÀ FAIT)

### TableLookupConfig
```typescript
type TableLookupConfig = {
  enabled?: boolean;
  extractFrom?: 'column' | 'row'; // ✅ NOUVEAU
  keyColumn?: string; // Si extractFrom='column'
  keyRow?: string; // Si extractFrom='row'
  displayColumn?: string;
  exposeColumns?: TableLookupExpose[];
  selectors?: TableLookupSelectors;
  fallbackValue?: string | number | null;
};
```

### TableMeta
```typescript
type TableMeta = {
  unit?: string;
  decimal?: 'comma' | 'dot';
  name?: string;
  importSource?: string;
  isImported?: boolean;
  lookup?: TableLookupConfig; // ✅ UNE SEULE CONFIG
} & Record<string, unknown>;
```

---

## 🎨 PHASE 2 : INTERFACE UTILISATEUR (EN COURS)

###  Nouvelle structure UI simplifiée

```tsx
{lookupConfig.enabled !== false && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    
    {/* 1️⃣ Champ à transformer */}
    <div>
      <Text strong>📝 Champ à transformer en liste</Text>
      <Select ... />
      <Text type="secondary">Ce champ affichera une liste déroulante</Text>
    </div>

    {/* 2️⃣ CHOIX UNIFIÉ : Colonne ou Ligne */}
    {lookupConfig.selectors?.columnFieldId && (
      <>
        <Divider />
        <div>
          <Text strong>🎯 Extraire les valeurs depuis :</Text>
          <Radio.Group value={lookupConfig.extractFrom || 'column'}>
            <Radio value="column">
              📊 Colonne
              <Text type="secondary">Affiche les valeurs d'une colonne</Text>
            </Radio>
            <Radio value="row">
              📈 Ligne
              <Text type="secondary">Affiche les valeurs d'une ligne</Text>
            </Radio>
          </Radio.Group>
        </div>

        {/* 3️⃣ Select dynamique selon extractFrom */}
        {lookupConfig.extractFrom === 'column' && (
          <div>
            <Text strong>📊 Quelle colonne extraire ?</Text>
            <Select
              value={lookupConfig.keyColumn}
              options={columnOptions}
              onChange={(value) => {
                updateLookupConfig({...prev, keyColumn: value});
                // PUT avec extractFrom: 'column', keyColumn: value
              }}
            />
            <Text type="secondary">
              ✅ Le SELECT affichera les valeurs de la colonne "{lookupConfig.keyColumn}"
            </Text>
          </div>
        )}

        {lookupConfig.extractFrom === 'row' && (
          <div>
            <Text strong>📈 Quelle ligne extraire ?</Text>
            <Select
              value={lookupConfig.keyRow}
              options={rowOptions}
              onChange={(value) => {
                updateLookupConfig({...prev, keyRow: value});
                // PUT avec extractFrom: 'row', keyRow: value
              }}
            />
            <Text type="secondary">
              ✅ Le SELECT affichera les valeurs de la ligne "{lookupConfig.keyRow}"
            </Text>
          </div>
        )}

        {/* 4️⃣ Aperçu configuration */}
        {(lookupConfig.keyColumn || lookupConfig.keyRow) && (
          <div style={{ background: '#f0f9ff', border: '1px solid #91d5ff', borderRadius: 4, padding: 12 }}>
            <Text strong style={{ color: '#0958d9' }}>✅ Configuration active</Text>
            <div style={{ marginTop: 8, fontSize: 12 }}>
              <div>🎯 <strong>Extraction :</strong> {lookupConfig.extractFrom === 'column' ? '📊 Colonne' : '📈 Ligne'}</div>
              <div>💾 <strong>Source :</strong> {lookupConfig.keyColumn || lookupConfig.keyRow}</div>
              <div style={{ color: '#0958d9', fontWeight: 500 }}>
                → Le champ affichera les valeurs {lookupConfig.extractFrom === 'column' ? 'des lignes de cette colonne' : 'des colonnes de cette ligne'}
              </div>
            </div>
          </div>
        )}
      </>
    )}
  </div>
)}
```

---

## 🔧 PHASE 3 : BACKEND API (À FAIRE)

### Fichier : `treebranchleaf-routes.ts`

#### Route `/nodes/:nodeId/table/lookup`

**Logique actuelle (3 chemins) :**
```typescript
if (isRowBased) {
  // Mode LIGNE : affiche les noms des lignes
} else if (isColumnBased && keyColumn) {
  // Mode COLONNE avec keyColumn : affiche les valeurs de la colonne
} else {
  // Legacy : affiche les noms des colonnes
}
```

**NOUVELLE logique unifiée :**
```typescript
const extractFrom = activeInstance.extractFrom || 'column';
const keyColumn = activeInstance.keyColumn;
const keyRow = activeInstance.keyRow;

if (extractFrom === 'column' && keyColumn) {
  // 📊 EXTRACTION COLONNE
  // Lire les valeurs de la colonne keyColumn
  const columnIndex = columns.indexOf(keyColumn);
  const values = tableData.data
    .map(row => row[columnIndex])
    .filter(v => v !== null && v !== undefined);
  
  return values.map(v => ({ value: v, label: v }));
  
} else if (extractFrom === 'row' && keyRow) {
  // 📈 EXTRACTION LIGNE
  // Lire les valeurs de la ligne keyRow
  const rowIndex = rows.indexOf(keyRow);
  const rowData = tableData.data[rowIndex] || [];
  const values = rowData.filter(v => v !== null && v !== undefined);
  
  return values.map(v => ({ value: v, label: v }));
  
} else {
  // Fallback legacy
  return columns.map(col => ({ value: col, label: col }));
}
```

---

## 🔄 PHASE 4 : MIGRATION DES DONNÉES EXISTANTES (SI NÉCESSAIRE)

Si des configurations existantes utilisent encore `mode: 'columns'` ou `mode: 'matrix'`, créer un script de migration :

```javascript
// migrate-lookup-to-unified.cjs
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateLookupConfigs() {
  const nodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { metadata: { path: ['capabilities', 'table', 'enabled'], equals: true } },
        { table_instances: { not: {} } }
      ]
    }
  });

  for (const node of nodes) {
    const instances = node.table_instances || {};
    let needsUpdate = false;

    for (const [id, instance] of Object.entries(instances)) {
      // Migrer mode -> extractFrom
      if (instance.mode === 'columns' && !instance.extractFrom) {
        instance.extractFrom = 'column';
        delete instance.mode;
        delete instance.columnBased;
        delete instance.rowBased;
        needsUpdate = true;
      } else if (instance.mode === 'matrix' && instance.rowBased) {
        instance.extractFrom = 'row';
        delete instance.mode;
        delete instance.columnBased;
        delete instance.rowBased;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await prisma.treeBranchLeafNode.update({
        where: { id: node.id },
        data: { table_instances: instances }
      });
      console.log(`✅ Migré: ${node.name}`);
    }
  }
}

migrateLookupConfigs();
```

---

## ✅ CHECKLIST DE VALIDATION

- [ ] Types TypeScript mis à jour (extractFrom, keyColumn, keyRow)
- [ ] Interface UI refactorisée avec Radio buttons
- [ ] Select dynamique selon extractFrom
- [ ] PUT API envoie extractFrom + keyColumn/keyRow
- [ ] Backend lit extractFrom et retourne les bonnes valeurs
- [ ] Test extraction COLONNE → affiche valeurs de la colonne
- [ ] Test extraction LIGNE → affiche valeurs de la ligne
- [ ] Migration des données existantes (si nécessaire)
- [ ] Suppression de l'ancien code (mode, columnBased, rowBased)
- [ ] Tests sur plusieurs tableaux (colonnes simples + croisés)

---

## 🎯 RÉSULTAT FINAL

**UN SEUL SYSTÈME UNIFIÉ** :
- Plus de distinction "colonnes" vs "croisés"
- L'utilisateur choisit ce qu'il veut extraire
- Interface claire et intuitive
- Logique backend simplifiée
- ZÉRO bug de mode qui change tout seul

**C'EST LA SOLUTION ULTIME !** 🚀
