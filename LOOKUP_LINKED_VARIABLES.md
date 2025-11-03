# 🔗 Backfill Automatique des `linkedVariableIds` pour Lookups

## 📋 Résumé

Quand vous **créez ou mettez à jour une Variable** (nœud Donnée) à partir d'une **Table**, le système met maintenant automatiquement à jour les `linkedVariableIds` de **tous les lookups** qui utilisent cette table.

## 🎯 Flux Opérationnel

### 1️⃣ Création d'une Table
```
Nœud (ex: "Marques solaires")
    ├── Table
    │   ├── Colonne 1: "Marque" (lookup select column)
    │   ├── Colonne 2: "WC" (lookup display column)
    │   └── Colonne 3: "Prix" (lookup display column)
    └── linkedTableIds: [table-id-xyz]
```

### 2️⃣ Création d'un Champ Select avec Lookup
```
Nœud Select (ex: "Choix marque")
    ├── Capability: Table (enabled)
    ├── tableReference: table-id-xyz
    └── linkedVariableIds: [] ❌ (PAS ENCORE REMPLI)
```

### 3️⃣ Exposition de la Table en tant que Variable
```
PUT /api/treebranchleaf/trees/:treeId/nodes/:nodeId/data
{
  "exposedKey": "var_marques",
  "displayName": "Variable Marques"
}
```

**LE SYSTÈME DÉTECTE AUTOMATIQUEMENT** :
- ✅ Que le nœud a une table (`linkedTableIds`)
- ✅ Que cette table est utilisée par un champ Select avec lookup
- ✅ Ajoute l'ID de la variable créée aux `linkedVariableIds` du champ Select

### 4️⃣ Résultat Final
```
Nœud Select (ex: "Choix marque")
    ├── Capability: Table (enabled)
    ├── tableReference: table-id-xyz
    └── linkedVariableIds: [variable-id-abc] ✅ AUTO-REMPLI
```

## 🔍 Comment Ça Fonctionne

### Implémentation (treebranchleaf-routes.ts)

La logique se trouve dans la route **PUT** qui crée/met à jour une variable (après l'upsert) :

```typescript
// Après l'upsert de la variable...

// 🔗 Backfill linkedVariableIds pour tous les lookups de la table
const nodeData = await tx.treeBranchLeafNode.findUnique({
  where: { id: nodeId },
  select: { linkedTableIds: true }
});

// Pour chaque table du nœud
for (const tableId of nodeData.linkedTableIds) {
  // Trouver tous les SelectConfigs qui utilisent cette table
  const selectConfigs = await tx.treeBranchLeafSelectConfig.findMany({
    where: { tableReference: tableId },
    select: { nodeId: true }
  });
  
  // Pour chaque Select trouvé, ajouter l'ID de la variable
  for (const config of selectConfigs) {
    const selectNode = await tx.treeBranchLeafNode.findUnique(...);
    
    if (!selectNode.linkedVariableIds.includes(variable.id)) {
      await tx.treeBranchLeafNode.update({
        where: { id: selectNode.id },
        data: { 
          linkedVariableIds: [...selectNode.linkedVariableIds, variable.id]
        }
      });
    }
  }
}
```

## 📊 Exemple Concret

### Scénario : Table Panneaux Solaires

**1. Créer table "Panneaux"** :
```
- Colonne "Modèle" (Marque, Lynx 150, etc.)
- Colonne "Puissance" (350W, 400W, etc.)
- Colonne "Prix" (prix en €)
```

**2. Créer champ Select "Choisir Panneau"** avec lookup sur la table "Panneaux"

**3. Placer la table en Donnée** :
- API: `PUT /api/treebranchleaf/trees/:treeId/nodes/:nodeId/data`
- Body: `{ exposedKey: "var_panneaux", displayName: "Variable Panneaux" }`

**RÉSULTAT** :
- ✅ Variable créée: `var_panneaux` (ID: `abc-123`)
- ✅ Champ Select mis à jour: `linkedVariableIds: ["abc-123"]`
- ✅ Traçabilité complète établie

## 🐛 Logs de Debug

Pour vérifier que le backfill fonctionne, cherchez ces logs dans les serveur :

```
[TBL] 🔍 Traitement des lookups pour 1 table(s)...
[TBL] 📊 Table trouvée: "Panneaux" (ID: 12345...)
[TBL] ✨ 1 champ(s) Select/Cascader utilise(nt) cette table
[TBL] ✅ linkedVariableIds mis à jour pour "Choisir Panneau" (xyz-456...)
```

## ✨ Avantages

| Avant | Après |
|-------|-------|
| ❌ Liaison manuelle requise | ✅ Automatique |
| ❌ Risque d'oubli | ✅ Garanti |
| ❌ Maintenance manuelle difficile | ✅ Transparent |
| ❌ Incohérences possibles | ✅ Cohérence systématique |

## 🚀 Cas d'Utilisation

### Cas 1 : Mettre à jour la variable
Si vous modifiez la variable (ex: changerle format d'affichage) :
- ✅ Le backfill se réexécute
- ✅ Les `linkedVariableIds` restent cohérents

### Cas 2 : Ajouter une nouvelle table
Si vous ajoutez une table au même nœud :
- ✅ Les champs Select existants détectent automatiquement la nouvelle table
- ✅ Les liaisons se font au moment de l'exposition en Donnée

### Cas 3 : Supprimer un champ Select
Si vous supprimez un champ Select :
- ✅ Les `linkedVariableIds` de la variable restent en l'état
- ✅ Aucun impact négatif (simplement une référence "morte")

## 🔧 Manuellement Corriger si Problème

Si pour une raison quelconque les `linkedVariableIds` ne sont pas corrects, vous pouvez :

1. **Via Prisma Studio** :
   ```bash
   npx prisma studio
   # Chercher le nœud Select et éditer linkedVariableIds
   ```

2. **Via script Node** :
   ```javascript
   const nodeId = "your-select-node-id";
   const variableId = "your-variable-id";
   
   await prisma.treeBranchLeafNode.update({
     where: { id: nodeId },
     data: {
       linkedVariableIds: { push: variableId }
     }
   });
   ```

3. **Réappliquer via UI** :
   - Éditer et resauvegarder la variable
   - Le backfill se réexécutera automatiquement

## 📝 Notes de Développement

- **Transaction** : Le backfill s'exécute **dans la même transaction** que l'upsert de la variable
- **Erreurs** : Si le backfill échoue, seul un warning est affiché. L'upsert de la variable continue
- **Performance** : O(n*m) où n = nombre de tables, m = nombre de SelectConfigs par table
- **Futur** : On pourrait ajouter un trigger de base de données pour une cohérence garantie

---

**Implémenté par** : Système TreeBranchLeaf  
**Date** : 28 octobre 2025  
**Version** : 1.0
