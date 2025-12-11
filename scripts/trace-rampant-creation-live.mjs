import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🔍 TRACE EN DIRECT: Trouve le nœud "Rampant toiture-1-1" et analyse comment il a été créé
 */

async function traceLiveCreation() {
  console.log('🔍 Recherche du nœud "Rampant toiture-1-1"...\n');

  // Trouver tous les nœuds Rampant toiture avec suffixes
  const rampantNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { label: { startsWith: 'Rampant toiture' } },
        { data_exposedKey: { startsWith: 'rampant' } }
      ]
    },
    select: {
      id: true,
      label: true,
      data_exposedKey: true,
      parentId: true,
      metadata: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log(`📦 Trouvé ${rampantNodes.length} nœuds "Rampant toiture":\n`);

  for (const node of rampantNodes) {
    const hasSuffix = /-\d+/.test(node.id);
    const hasDoubleSuffix = /-\d+-\d+$/.test(node.id);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📌 ${node.label || node.data_exposedKey}`);
    console.log(`   ID: ${node.id}`);
    console.log(`   Suffixe simple: ${hasSuffix ? '✅' : '❌'}`);
    console.log(`   Double suffixe: ${hasDoubleSuffix ? '❌ PROBLÈME' : '✅'}`);
    console.log(`   Créé: ${node.createdAt}`);
    console.log(`   Parent: ${node.parentId || 'N/A'}`);

    if (node.metadata && typeof node.metadata === 'object') {
      const meta = node.metadata;
      
      if (meta.copiedFromNodeId) {
        console.log(`\n   🔗 Copié depuis: ${meta.copiedFromNodeId}`);
        
        // Chercher le nœud source
        const sourceNode = await prisma.treeBranchLeafNode.findUnique({
          where: { id: meta.copiedFromNodeId },
          select: { id: true, label: true, data_exposedKey: true }
        });
        
        if (sourceNode) {
          console.log(`      Source trouvée: "${sourceNode.label || sourceNode.data_exposedKey}" (${sourceNode.id})`);
        } else {
          console.log(`      ⚠️ Source INTROUVABLE`);
        }
      }

      if (meta.sourceTemplateId) {
        console.log(`   📋 Template source: ${meta.sourceTemplateId}`);
      }

      if (meta.duplicatedFromRepeater) {
        console.log(`   🔄 Dupliqué depuis repeater: ${meta.duplicatedFromRepeater}`);
      }

      if (meta.repeatSuffix !== undefined) {
        console.log(`   #️⃣ Suffixe répéteur: ${meta.repeatSuffix}`);
      }
    }

    // Chercher la variable associée
    const variable = await prisma.treeBranchLeafNodeVariable.findFirst({
      where: { nodeId: node.id },
      select: {
        id: true,
        exposedKey: true,
        sourceRef: true,
        sourceType: true
      }
    });

    if (variable) {
      console.log(`\n   📊 Variable associée:`);
      console.log(`      ID: ${variable.id}`);
      console.log(`      Key: ${variable.exposedKey}`);
      console.log(`      sourceRef: ${variable.sourceRef || 'N/A'}`);
      console.log(`      sourceType: ${variable.sourceType || 'N/A'}`);
      
      const varHasDoubleSuffix = /-\d+-\d+$/.test(variable.id);
      if (varHasDoubleSuffix) {
        console.log(`      ⚠️ Variable a un DOUBLE SUFFIXE dans son ID !`);
      }
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('\n🔍 Analyse du repeater "Rampant toiture"...\n');

  // Trouver le repeater
  const repeater = await prisma.treeBranchLeafNode.findFirst({
    where: {
      label: 'Rampant toiture',
      repeater_templateNodeIds: { not: null }
    },
    select: {
      id: true,
      label: true,
      repeater_templateNodeIds: true,
      metadata: true
    }
  });

  if (repeater) {
    console.log(`✅ Repeater trouvé: ${repeater.id}`);
    
    if (repeater.repeater_templateNodeIds) {
      try {
        const templateIds = JSON.parse(repeater.repeater_templateNodeIds);
        console.log(`\n📋 Template IDs (${templateIds.length}):`);
        templateIds.forEach((id, idx) => {
          const hasSuffix = /-\d+$/.test(id);
          console.log(`   ${idx + 1}. ${id} ${hasSuffix ? '❌ SUFFIXÉ' : '✅'}`);
        });
      } catch (e) {
        console.log('❌ Erreur parsing templateIds:', e.message);
      }
    }

    if (repeater.metadata?.repeater?.templateNodeIds) {
      const metaIds = repeater.metadata.repeater.templateNodeIds;
      console.log(`\n📋 Metadata templateIds (${metaIds.length}):`);
      metaIds.forEach((id, idx) => {
        const hasSuffix = /-\d+$/.test(id);
        console.log(`   ${idx + 1}. ${id} ${hasSuffix ? '❌ SUFFIXÉ' : '✅'}`);
      });
    }
  } else {
    console.log('❌ Repeater "Rampant toiture" introuvable');
  }
}

traceLiveCreation()
  .catch(e => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
