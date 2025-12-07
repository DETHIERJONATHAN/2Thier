import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findRealOwner() {
  console.log('🔍 Recherche du vrai propriétaire de Rampant toiture-1\n');

  // Le nœud d'affichage
  const displayNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '9c9f42b2-e0df-4726-8a81-997c0dee71bc-1' },
    select: {
      id: true,
      label: true,
      parentId: true,
      type: true,
      metadata: true
    }
  });

  console.log('Nœud d\'affichage:');
  console.log(JSON.stringify(displayNode, null, 2));

  // Chercher tous les nœuds copiés avec label "Rampant"
  const rampantNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      label: {
        contains: 'Rampant',
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      label: true,
      parentId: true,
      type: true,
      fieldType: true,
      linkedVariableIds: true,
      metadata: true
    }
  });

  console.log(`\n\n${rampantNodes.length} nœuds "Rampant" trouvés:\n`);

  for (const node of rampantNodes) {
    const metadata = node.metadata && typeof node.metadata === 'object' ? node.metadata : {};
    const copySuffix = metadata.copySuffix;
    const sourceTemplate = metadata.sourceTemplateId || metadata.copiedFromNodeId;
    const isSource = !copySuffix;

    console.log(`\n${isSource ? '🔵 SOURCE' : '🟢 COPIE'}: ${node.id}`);
    console.log(`   Label: ${node.label}`);
    console.log(`   Type: ${node.type}`);
    console.log(`   FieldType: ${node.fieldType || 'N/A'}`);
    console.log(`   Parent: ${node.parentId}`);
    console.log(`   LinkedVariableIds: ${JSON.stringify(node.linkedVariableIds)}`);
    if (!isSource) {
      console.log(`   Source: ${sourceTemplate}`);
      console.log(`   Suffixe: ${copySuffix}`);
    }
  }

  // Chercher le nœud CHAMP copié (pas display)
  const rampantFieldCopied = await prisma.treeBranchLeafNode.findFirst({
    where: {
      label: {
        contains: 'Rampant toiture-1',
        mode: 'insensitive'
      },
      type: {
        not: 'leaf_field'
      }
    },
    select: {
      id: true,
      label: true,
      parentId: true,
      type: true,
      linkedVariableIds: true,
      metadata: true
    }
  });

  console.log('\n\n🎯 Nœud CHAMP copié (pas display):');
  console.log(JSON.stringify(rampantFieldCopied, null, 2));

  if (rampantFieldCopied) {
    const metadata = rampantFieldCopied.metadata && typeof rampantFieldCopied.metadata === 'object' ? rampantFieldCopied : {};
    const sourceId = metadata.sourceTemplateId || metadata.copiedFromNodeId;

    if (sourceId) {
      const source = await prisma.treeBranchLeafNode.findUnique({
        where: { id: sourceId },
        select: { id: true, label: true, parentId: true }
      });

      console.log('\n✅ Nœud source:');
      console.log(JSON.stringify(source, null, 2));

      if (source?.parentId) {
        const expectedParent = `${source.parentId}-1`;
        console.log(`\n🎯 Parent attendu pour l'affichage: ${expectedParent}`);
        console.log(`Parent actuel de l'affichage: ${displayNode?.parentId}`);
        console.log(`Match: ${displayNode?.parentId === expectedParent ? '✅' : '❌'}`);
      }
    }
  }
}

findRealOwner()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
