📊 RÉCAPITULATIF DES FIXES APPLIQUÉS (FINAL)
═════════════════════════════════════════════════════════════════════════════

🎯 PROBLÈME IDENTIFIÉ
─────────────────────

Nœud dupliqué "Orientation - inclinaison-1" avait:
  ❌ linkedTableIds: []  (vide)
  ❌ hasTable: false  (incorrect)

Alors que l'original avait:
  ✅ linkedTableIds: ["9bc0622c-b2df-42a2-902c-6d0c6ecac10b"]
  ✅ hasTable: true

Résultat: Le nœud dupliqué ne pouvait pas afficher les résultats du lookup table


═════════════════════════════════════════════════════════════════════════════
✅ FIXES APPLIQUÉS
═════════════════════════════════════════════════════════════════════════════

FIX #1: treebranchleaf-routes.ts - deepCopyNodeInternal()
──────────────────────────────────────────────────────────

Fichier: src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts

Lieu: ~Ligne 2051-2063

PROBLÈME: Le code copiait VIDE les colonnes linked***

SOLUTION APPLIQUÉE:
  a) Copier linkedTableIds depuis l'original:
     linkedTableIds: Array.isArray(oldNode.linkedTableIds) 
       ? oldNode.linkedTableIds 
       : [],

  b) Copier linkedFormulaIds depuis l'original:
     linkedFormulaIds: Array.isArray(oldNode.linkedFormulaIds) 
       ? oldNode.linkedFormulaIds 
       : [],

  c) Copier linkedConditionIds depuis l'original:
     linkedConditionIds: Array.isArray(oldNode.linkedConditionIds) 
       ? oldNode.linkedConditionIds 
       : [],

  d) Copier table_name depuis l'original:
     table_name: oldNode.table_name,

TESTS:
  ✅ test-new-duplicate-with-fix.cjs
     Result: linkedTableIds CORRECTEMENT COPIÉ


FIX #2: copy-variable-with-capacities.ts - Créer nœud d'affichage de variable
─────────────────────────────────────────────────────────────────────────────

Fichier: src/components/TreeBranchLeaf/treebranchleaf-new/api/copy-variable-with-capacities.ts

Lieu A: ~Ligne 500 - Dans la fonction copyVariable()
────────────────────────────────────────────────

AVANT:
  const originalOwnerNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: originalVar.nodeId! },
    select: { id: true, parentId: true, treeId: true, order: true }
  });

APRÈS:
  const originalOwnerNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: originalVar.nodeId! },
    select: { id: true, parentId: true, treeId: true, order: true, linkedTableIds: true, hasTable: true, table_name: true, table_activeId: true, table_instances: true }
  });

Puis dans displayNodeData (ligne ~577):
  Copier les colonnes table:
    hasTable: originalOwnerNode.hasTable ?? false,
    table_name: originalOwnerNode.table_name,
    table_activeId: originalOwnerNode.table_activeId,
    table_instances: originalOwnerNode.table_instances as any,
    linkedTableIds: Array.isArray(originalOwnerNode.linkedTableIds) ? originalOwnerNode.linkedTableIds : [] as any,


Lieu B: ~Ligne 977 - Dans la fonction createDisplayNodeForExistingVariable()
──────────────────────────────────────────────────────────────────────────

AVANT:
  const owner = await prisma.treeBranchLeafNode.findUnique({
    where: { id: v.nodeId },
    select: { id: true, parentId: true, treeId: true, order: true }
  });

APRÈS:
  const owner = await prisma.treeBranchLeafNode.findUnique({
    where: { id: v.nodeId },
    select: { id: true, parentId: true, treeId: true, order: true, linkedTableIds: true, hasTable: true, table_name: true, table_activeId: true, table_instances: true }
  });

Puis dans baseData (ligne ~1056):
  Copier les colonnes table:
    hasTable: owner.hasTable ?? false,
    table_name: owner.table_name,
    table_activeId: owner.table_activeId,
    table_instances: owner.table_instances as any,
    linkedTableIds: Array.isArray(owner.linkedTableIds) ? owner.linkedTableIds : [] as any,


═════════════════════════════════════════════════════════════════════════════
📋 RÉSUMÉ COMPLET DES COLONNES COPIÉES
═════════════════════════════════════════════════════════════════════════════

Après redémarrage de l'API, les nœuds dupliqués auront:
  ✅ linkedTableIds: [IDs de tables] (copié)
  ✅ linkedFormulaIds: [IDs de formules] (copié)
  ✅ linkedConditionIds: [IDs de conditions] (copié)
  ✅ table_name: (copié)
  ✅ table_activeId: (copié - déjà fait phase 10)
  ✅ table_instances: (copié - déjà fait phase 10)
  ✅ hasTable: true/false selon original (copié)


═════════════════════════════════════════════════════════════════════════════
🚀 PROCHAINES ÉTAPES
═════════════════════════════════════════════════════════════════════════════

1. Redémarrer l'API Node.js (npm run dev)
2. Créer une nouvelle copie du nœud "Orientation - inclinaison"
3. Vérifier que linkedTableIds n'est PAS vide
4. Vérifier que hasTable = true
5. Vérifier que le lookup fonctionne et affiche les résultats


═════════════════════════════════════════════════════════════════════════════
📊 FICHIERS MODIFIÉS
═════════════════════════════════════════════════════════════════════════════

1. src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts
   - Fonction deepCopyNodeInternal() [lignes 2051-2063]

2. src/components/TreeBranchLeaf/treebranchleaf-new/api/copy-variable-with-capacities.ts
   - Fonction copyVariable() [lignes 500, 577]
   - Fonction createDisplayNodeForExistingVariable() [lignes 977, 1056]


END OF FIXES
