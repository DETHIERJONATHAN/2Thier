const { PrismaClient } = require('@prisma/client');

async function searchOrientationFields() {
  const prisma = new PrismaClient();
  
  try {
    // Chercher tous les champs avec "orientation" dans le label
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { label: { contains: 'orientation', mode: 'insensitive' } },
          { label: { contains: 'inclinaison', mode: 'insensitive' } },
          { field_label: { contains: 'orientation', mode: 'insensitive' } },
          { field_label: { contains: 'inclinaison', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        label: true,
        field_label: true,
        type: true,
        fieldType: true,
        linkedVariableIds: true,
        parentId: true
      },
      take: 10
    });
    
    console.log(`\n=== Trouvé ${nodes.length} nœud(s) ===\n`);
    
    for (const node of nodes) {
      console.log('---');
      console.log('ID:', node.id);
      console.log('Label:', node.label);
      console.log('Field Label:', node.field_label);
      console.log('Type:', node.type);
      console.log('FieldType:', node.fieldType);
      console.log('LinkedVariableIds:', node.linkedVariableIds);
      console.log('ParentId:', node.parentId);
      
      if (node.linkedVariableIds && node.linkedVariableIds.length > 0) {
        console.log('\n  Variables liées:');
        for (const varId of node.linkedVariableIds) {
          const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
            where: { id: varId },
            select: {
              id: true,
              displayName: true,
              exposedKey: true,
              nodeId: true
            }
          });
          console.log('  -', JSON.stringify(variable));
        }
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

searchOrientationFields();
