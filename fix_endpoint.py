#!/usr/bin/env python3
import re

filepath = 'src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Trouver et remplacer le bloc problématique
old_code = '''    const dataRows = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId: id },
      include: {
        TreeBranchLeafNode: { 
          select: { 
            id: true, 
            type: true, 
            label: true,
            name: true,
            fieldType: true,
            fieldSubType: true
          } 
        }
      },
      orderBy: { createdAt: 'asc' }
    });'''

new_code = '''    // Récupérer toutes les données de la soumission
    const dataRows = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId: id },
      orderBy: { createdAt: 'asc' }
    });

    // Récupérer les nodeIds uniques
    const nodeIds = [...new Set(dataRows.map(r => r.nodeId))];

    // Récupérer les infos des nodes en une seule requête
    const nodes = nodeIds.length > 0 ? await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: nodeIds } },
      select: {
        id: true,
        type: true,
        label: true,
        name: true,
        fieldType: true,
        fieldSubType: true
      }
    }) : [];

    // Créer un map nodeId -> nodeInfo
    const nodesMap = new Map(nodes.map(n => [n.id, n]));'''

if old_code in content:
    content = content.replace(old_code, new_code)
    print("✅ Bloc findMany remplacé")
else:
    print("❌ Bloc findMany non trouvé dans le contenu exact")

# Aussi remplacer row.TreeBranchLeafNode par nodesMap.get(row.nodeId)
old_node = 'const node = row.TreeBranchLeafNode;'
new_node = 'const node = nodesMap.get(row.nodeId);'

if old_node in content:
    content = content.replace(old_node, new_node)
    print("✅ row.TreeBranchLeafNode remplacé")
else:
    print("⚠️ row.TreeBranchLeafNode non trouvé")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Fichier sauvegardé")
