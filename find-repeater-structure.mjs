import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findRepeaterStructure() {
  console.log('🔍 STRUCTURE DU REPEATER');
  console.log('=======================\n');
  
  try {
    const repeaterNodeId = '1f4db31a-4474-462f-af6c-f798b7e3534a';
    
    // Chercher le nœud repeater
    const repeater = await prisma.treeBranchLeafNode.findUnique({
      where: { id: repeaterNodeId },
      select: {
        id: true,
        field_label: true,
        fieldType: true,
        repeater_templateNodeIds: true,
        TreeBranchLeafNode_children: {
          select: {
            id: true,
            field_label: true,
            fieldType: true
          }
        }
      }
    });
    
    console.log('Repeater:', repeater?.field_label);
    console.log('Type:', repeater?.fieldType);
    console.log('Enfants directs:', repeater?.TreeBranchLeafNode_children?.length || 0);
    
    if (repeater?.repeater_templateNodeIds && repeater.repeater_templateNodeIds.length > 0) {
      console.log('\n📋 DÉTAILS TEMPLATES:');
      const templateIds = repeater.repeater_templateNodeIds;
      
      for (const templateId of templateIds) {
        const template = await prisma.treeBranchLeafNode.findUnique({
          where: { id: templateId },
          select: {
            id: true,
            field_label: true,
            fieldType: true,
            TreeBranchLeafNodeFormula: { select: { id: true } },
            TreeBranchLeafNodeCondition: { select: { id: true } },
            TreeBranchLeafNodeTable: { select: { id: true } },
            TreeBranchLeafSelectConfig: { select: { id: true } }
          }
        });
        
        if (template) {
          const hasCalc = template.TreeBranchLeafNodeFormula?.length || template.TreeBranchLeafNodeCondition?.length || template.TreeBranchLeafNodeTable?.length;
          const status = hasCalc ? '✅' : '❌';
          console.log(`${status} ${template.field_label} (${templateId})`);
          if (hasCalc) {
            if (template.TreeBranchLeafNodeFormula?.length) console.log(`   • Formulas: ${template.TreeBranchLeafNodeFormula.length}`);
            if (template.TreeBranchLeafNodeCondition?.length) console.log(`   • Conditions: ${template.TreeBranchLeafNodeCondition.length}`);
            if (template.TreeBranchLeafNodeTable?.length) console.log(`   • Tables: ${template.TreeBranchLeafNodeTable.length}`);
            if (template.TreeBranchLeafSelectConfig?.length) console.log(`   • SelectConfigs: ${template.TreeBranchLeafSelectConfig.length}`);
          }
        }
      }
    } else {
      console.log('❌ Aucun templateNodeIds trouvé');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findRepeaterStructure().catch(console.error);