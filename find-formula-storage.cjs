const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findFormulaStorage() {
  try {
    console.log('\n🔍 === OÙ SONT STOCKÉES LES FORMULES ? ===\n');

    const formulaNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        tbl_type: 6
      }
    });

    for (const node of formulaNodes) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📝 ${node.label}`);
      console.log(`${'='.repeat(60)}`);
      console.log(`ID: ${node.id}`);
      console.log(`\n📦 tbl_properties (contient formula_instances):`, node.tbl_properties ? 'OUI ✅' : 'NON ❌');
      
      if (node.tbl_properties) {
        const props = node.tbl_properties;
        console.log('\n  Clés disponibles:', Object.keys(props));
        
        if (props.formula_instances) {
          console.log('\n  📊 formula_instances:', JSON.stringify(props.formula_instances, null, 2));
        }
        
        if (props.formula) {
          console.log('\n  📊 formula:', JSON.stringify(props.formula, null, 2));
        }
      }
      
      console.log(`\n📦 data_instances:`, node.data_instances ? 'OUI ✅' : 'NON ❌');
      if (node.data_instances) {
        console.log('  Contenu:', JSON.stringify(node.data_instances, null, 2));
      }
      
      console.log(`\n📦 formula_instances:`, node.formula_instances ? 'OUI ✅' : 'NON ❌');
      if (node.formula_instances) {
        console.log('  Contenu:', JSON.stringify(node.formula_instances, null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findFormulaStorage();
