const fs = require('fs');

const filePath = 'src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts';

let content = fs.readFileSync(filePath, 'utf8');

// Trouver le début de la route
const startStr = "router.delete('/nodes/:nodeId/tables/:tableId', async (req, res) => {";
const startIdx = content.indexOf(startStr);

if (startIdx === -1) {
  console.error('❌ Début de route non trouvé');
  process.exit(1);
}

console.log('✅ Début trouvé à:', startIdx);

// Trouver la fin de cette fonction (la prochaine route ou fonction)
// On cherche la ligne qui commence la prochaine route après cette fonction
const searchFrom = startIdx + startStr.length;
const nextRouteIdx = content.indexOf('\nrouter.', searchFrom);

if (nextRouteIdx === -1) {
  console.error('❌ Fin de route non trouvée');
  process.exit(1);
}

console.log('✅ Fin trouvée à:', nextRouteIdx);

// Le nouveau code de la route
const newRoute = `router.delete('/nodes/:nodeId/tables/:tableId', async (req, res) => {
  const { tableId } = req.params;
  console.log(\`[DELETE /nodes/:nodeId/tables/:tableId] 🗑️ Suppression table \${tableId} avec nettoyage complet\`);
  
  try {
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    // 1️⃣ Vérifier l'existence et les permissions
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: tableId },
      include: {
        TreeBranchLeafNode: {
          include: { TreeBranchLeafTree: true }
        }
      }
    });

    if (!table) {
      return res.status(404).json({ error: 'Table non trouvée' });
    }

    const tableOrgId = table.TreeBranchLeafNode?.TreeBranchLeafTree?.organizationId;
    if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // 2️⃣ Supprimer la table (colonnes et lignes supprimées en cascade par Prisma)
    await prisma.treeBranchLeafNodeTable.delete({ where: { id: tableId } });
    console.log(\`[DELETE Table] ✅ Table \${tableId} supprimée (+ colonnes/lignes en cascade)\`);

    // 3️⃣ Nettoyer TOUS les champs liés aux tables dans le nœud
    if (table.nodeId) {
      const node = await prisma.treeBranchLeafNode.findUnique({ 
        where: { id: table.nodeId }, 
        select: { 
          linkedTableIds: true,
          table_activeId: true,
          table_instances: true
        } 
      });

      const currentLinkedIds = node?.linkedTableIds ?? [];
      const nextLinkedIds = currentLinkedIds.filter(x => x !== tableId);
      const wasActiveTable = node?.table_activeId === tableId;
      
      let cleanedInstances = node?.table_instances ?? {};
      if (typeof cleanedInstances === 'object' && cleanedInstances !== null) {
        const instances = cleanedInstances as Record<string, unknown>;
        if (instances[tableId]) {
          delete instances[tableId];
          cleanedInstances = instances;
        }
      }

      const remainingTables = await prisma.treeBranchLeafNodeTable.count({
        where: { nodeId: table.nodeId }
      });

      await prisma.treeBranchLeafNode.update({
        where: { id: table.nodeId },
        data: {
          hasTable: remainingTables > 0,
          linkedTableIds: { set: nextLinkedIds },
          table_activeId: wasActiveTable ? null : undefined,
          table_instances: cleanedInstances,
          ...(remainingTables === 0 && {
            table_name: null,
            table_type: null,
            table_meta: null,
            table_columns: null,
            table_rows: null,
            table_data: null,
            table_importSource: null,
            table_isImported: false
          })
        }
      });

      console.log(\`[DELETE Table] ✅ Nœud \${table.nodeId} entièrement nettoyé\`, {
        hasTable: remainingTables > 0,
        linkedTableIds: nextLinkedIds.length,
        table_activeId_reset: wasActiveTable,
        table_instances_cleaned: true,
        all_fields_reset: remainingTables === 0
      });
    }

    return res.json({ success: true, message: 'Tableau supprimé avec succès' });
  } catch (error) {
    console.error('[DELETE Table] ❌ Erreur lors de la suppression:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du tableau' });
  }
});

`;

// Construire le nouveau contenu
const newContent = content.substring(0, startIdx) + newRoute + content.substring(nextRouteIdx + 1);

// Sauvegarder
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('✅ Route DELETE /nodes/:nodeId/tables/:tableId remplacée avec succès !');
console.log('📊 Ancien fichier:', content.length, 'caractères');
console.log('📊 Nouveau fichier:', newContent.length, 'caractères');
