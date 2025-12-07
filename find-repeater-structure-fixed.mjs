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
        repeater_templateNodeLabels: true,
        other_TreeBranchLeafNode: {
          select: {
            id: true,
            field_label: true,
            fieldType: true
          }
        }
      }
    });
    
    if (!repeater) {
      console.log('❌ Repeater non trouvé');
      return;
    }
    
    console.log('✅ Repeater trouvé:', repeater.field_label);
    console.log('Type:', repeater.fieldType);
    console.log('Enfants directs:', repeater.other_TreeBranchLeafNode?.length || 0);
    
    if (repeater.repeater_templateNodeIds) {
      console.log('\n📋 TEMPLATE NODE IDS:', repeater.repeater_templateNodeIds);
      console.log('📋 TEMPLATE LABELS:', repeater.repeater_templateNodeLabels);
      
      // Parser les IDs (JSON string)
      let templateIds = [];
      try {
        templateIds = JSON.parse(repeater.repeater_templateNodeIds);
      } catch {
        console.log('Non-JSON format, parsing comme string');
        templateIds = repeater.repeater_templateNodeIds.split(',').map(id => id.trim());
      }
      
      if (templateIds.length > 0) {
        console.log(`\n📋 DÉTAILS DES ${templateIds.length} TEMPLATES:\n`);
        
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
            const formulas = template.TreeBranchLeafNodeFormula?.length || 0;
            const conditions = template.TreeBranchLeafNodeCondition?.length || 0;
            const tables = template.TreeBranchLeafNodeTable?.length || 0;
            const selects = template.TreeBranchLeafSelectConfig?.length || 0;
            const hasCalc = formulas + conditions + tables + selects > 0;
            
            const status = hasCalc ? '✅' : '❌';
            console.log(`${status} ${template.field_label} (${templateId})`);
            console.log(`   • Formulas: ${formulas}`);
            console.log(`   • Conditions: ${conditions}`);
            console.log(`   • Tables: ${tables}`);
            console.log(`   • SelectConfigs: ${selects}`);
            console.log('');
          }
        }
      } else {
        console.log('❌ Aucun templateNodeIds trouvé');
      }
    } else {
      console.log('❌ repeater_templateNodeIds est null');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

findRepeaterStructure().catch(console.error);
