const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Chercher le nœud "Capacité"
    const node = await prisma.treebranchleafnode.findFirst({
      where: { label: { contains: 'Capacit' } },
      include: { 
        formulas: true,
        tables: true
      }
    });

    if (!node) {
      console.log('❌ Nœud Capacité non trouvé');
      console.log('\nCherchons les nœuds avec formule 1a0285ab-0379-4ad5-8d03-4fd3f2f2b832:');
      
      const formula = await prisma.treebranchleafnodeformula.findUnique({
        where: { id: '1a0285ab-0379-4ad5-8d03-4fd3f2f2b832' }
      });
      
      console.log('Formule trouvée:', JSON.stringify(formula, null, 2));
      
      if (formula) {
        const linkedNode = await prisma.treebranchleafnode.findUnique({
          where: { id: formula.nodeId },
          include: { tables: true }
        });
        console.log('\n📊 Nœud associé:', linkedNode?.label);
        console.log('Métadata:', linkedNode?.metadata);
      }
      
      process.exit(0);
    }

    console.log('📋 NŒUD TROUVÉ: ' + node.label);
    console.log('\n🔗 Formules:');
    node.formulas.forEach(f => {
      console.log(`   - ID: ${f.id}`);
      console.log(`     Name: ${f.name}`);
    });

    console.log('\n📊 Tableaux:');
    node.tables.forEach(t => {
      console.log(`   - ID: ${t.id}`);
      console.log(`     Name: ${t.label}`);
    });

    console.log('\n🎯 Metadata:');
    console.log(JSON.stringify(node.metadata, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
