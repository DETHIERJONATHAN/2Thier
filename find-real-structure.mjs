import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findRealStructure() {
  console.log('🔍 TROUVER LA VRAIE STRUCTURE');
  console.log('=============================\n');
  
  try {
    // Chercher tous les nœuds avec "-1" dans l'ID
    const nodesWithSuffix = await prisma.treeBranchLeafNode.findMany({
      where: {
        id: {
          contains: '-1'
        }
      },
      select: {
        id: true,
        field_label: true,
        fieldType: true,
        parentId: true,
        treeId: true
      },
      take: 15
    });
    
    console.log(`✅ Trouvé ${nodesWithSuffix.length} nœuds avec "-1":\n`);
    nodesWithSuffix.forEach(node => {
      console.log(`• ${node.field_label || 'N/A'}`);
      console.log(`  ID: ${node.id}`);
      console.log(`  parentId: ${node.parentId || 'ROOT'}`);
      console.log('');
    });
    
    // Chercher le repeater parent de ces nœuds
    if (nodesWithSuffix.length > 0) {
      const firstParent = nodesWithSuffix[0].parentId;
      console.log(`\n🔍 Parent direct: ${firstParent}`);
      
      const parent = await prisma.treeBranchLeafNode.findUnique({
        where: { id: firstParent },
        select: {
          id: true,
          field_label: true,
          fieldType: true,
          repeater_templateNodeIds: true
        }
      });
      
      console.log(`Parent found: ${parent?.field_label}`);
      console.log(`Type: ${parent?.fieldType}`);
      console.log(`Template IDs: ${parent?.repeater_templateNodeIds?.substring(0, 100)}...`);
      
      // Chercher les templates
      console.log('\n\n📋 VÉRIFIER LES TEMPLATES:');
      const templateIds = ['1203df47-e87e-42fd-b178-31afd89b9c83', 'a2538f3a-0f05-434e-b5bd-9474944fc939'];
      
      for (const templateId of templateIds) {
        const template = await prisma.treeBranchLeafNode.findUnique({
          where: { id: templateId },
          select: {
            id: true,
            field_label: true,
            fieldType: true
          }
        });
        
        if (template) {
          console.log(`✅ Template trouvé: ${template.field_label}`);
        } else {
          console.log(`❌ Template NOT FOUND: ${templateId}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findRealStructure().catch(console.error);
