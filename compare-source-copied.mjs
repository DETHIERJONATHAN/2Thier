import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script pour vérifier l'état actuel après une duplication repeat
 * Compare les nœuds sources vs les nœuds copiés
 */
async function compareSourceAndCopied() {
  console.log('🔍 Comparaison source vs copié\n');
  console.log('='.repeat(80));

  // 1. Trouver les nœuds sources (Rampant toiture, Orientation, Longueur)
  const sourceLabels = ['Rampant toiture', 'Orientation-Inclinaison', 'Longueur toiture'];
  
  for (const label of sourceLabels) {
    console.log(`\n📋 Analyse: "${label}"`);
    console.log('-'.repeat(80));

    // Chercher tous les nœuds avec ce label
    const allNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        label: {
          contains: label,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        label: true,
        parentId: true,
        linkedVariableIds: true,
        metadata: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    if (allNodes.length === 0) {
      console.log('❌ Aucun nœud trouvé');
      continue;
    }

    console.log(`\n✅ ${allNodes.length} nœud(s) trouvé(s):\n`);

    for (const node of allNodes) {
      const metadata = node.metadata && typeof node.metadata === 'object'
        ? node.metadata
        : {};
      
      const copySuffix = metadata.copySuffix;
      const isSource = !copySuffix && !node.id.match(/-\d+$/);
      const sourceTemplateId = metadata.sourceTemplateId || metadata.copiedFromNodeId;

      console.log(`\n${isSource ? '🔵 SOURCE' : '🟢 COPIE'}: ${node.id}`);
      console.log(`   Label: ${node.label}`);
      console.log(`   Parent: ${node.parentId}`);
      if (!isSource) {
        console.log(`   Source: ${sourceTemplateId || 'N/A'}`);
        console.log(`   Suffixe: ${copySuffix || 'N/A'}`);
      }

      // Variables liées
      const linkedVarIds = Array.isArray(node.linkedVariableIds)
        ? node.linkedVariableIds
        : [];
      console.log(`   linkedVariableIds (${linkedVarIds.length}): ${linkedVarIds.join(', ') || 'aucune'}`);

      // Pour chaque variable, vérifier son nœud d'affichage
      if (linkedVarIds.length > 0) {
        for (const varId of linkedVarIds) {
          const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
            where: { id: varId },
            select: {
              id: true,
              nodeId: true,
              displayName: true
            }
          });

          if (variable) {
            const displayNode = variable.nodeId 
              ? await prisma.treeBranchLeafNode.findUnique({
                  where: { id: variable.nodeId },
                  select: { id: true, label: true, parentId: true }
                })
              : null;

            console.log(`\n   📌 Variable: ${variable.displayName}`);
            console.log(`      ID: ${varId}`);
            console.log(`      NodeId (affichage): ${variable.nodeId || 'N/A'}`);
            
            if (displayNode) {
              console.log(`      Label affichage: ${displayNode.label}`);
              console.log(`      Parent affichage: ${displayNode.parentId}`);
              
              // Vérifier si le parent est cohérent
              if (!isSource && displayNode.parentId !== node.parentId) {
                const parentMatch = displayNode.parentId === node.parentId;
                console.log(`      ⚠️  Parent différent du nœud copié: ${parentMatch ? '✅' : '❌'}`);
              }
            } else if (variable.nodeId) {
              console.log(`      ❌ Nœud d'affichage ${variable.nodeId} introuvable!`);
            }
          } else {
            console.log(`\n   ❌ Variable ${varId} introuvable!`);
          }
        }
      }
    }
  }

  // 2. Chercher les nœuds d'affichage orphelins (créés mais pas dans linkedVariableIds)
  console.log('\n\n' + '='.repeat(80));
  console.log('🔍 Recherche de nœuds d\'affichage orphelins\n');

  const orphanDisplayNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      metadata: {
        path: ['autoCreatedDisplayNode'],
        equals: true
      }
    },
    select: {
      id: true,
      label: true,
      parentId: true,
      metadata: true
    }
  });

  console.log(`📊 ${orphanDisplayNodes.length} nœud(s) d'affichage auto-créé(s) trouvé(s)\n`);

  for (const node of orphanDisplayNodes) {
    const metadata = node.metadata && typeof node.metadata === 'object'
      ? node.metadata
      : {};
    
    const fromVariableId = metadata.fromVariableId;
    const isDuplicated = metadata.duplicatedFromRepeater === true;

    console.log(`\n📄 ${node.id}`);
    console.log(`   Label: ${node.label}`);
    console.log(`   Parent: ${node.parentId}`);
    console.log(`   Variable source: ${fromVariableId || 'N/A'}`);
    console.log(`   Dupliqué: ${isDuplicated ? '✅' : '❌'}`);

    // Chercher si ce nœud est référencé dans linkedVariableIds
    const referencingNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        linkedVariableIds: {
          has: node.id
        }
      },
      select: {
        id: true,
        label: true
      }
    });

    if (referencingNodes.length > 0) {
      console.log(`   Référencé par: ${referencingNodes.map(n => n.label).join(', ')}`);
    } else {
      console.log(`   ⚠️  Non référencé (orphelin)`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

compareSourceAndCopied()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
