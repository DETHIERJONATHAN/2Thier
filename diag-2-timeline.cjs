const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 DIAGNOSTIC 2: Historique de création');
    console.log('='.repeat(80));

    // Chercher tous les nœuds Orientation/Inclinaison
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { label: { contains: 'Orientation' } },
          { label: { contains: 'Inclinaison' } }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`\n📋 Trouvé ${nodes.length} nœuds\n`);

    for (const node of nodes) {
      const age = new Date() - new Date(node.createdAt);
      const ageSeconds = Math.floor(age / 1000);
      const ageMinutes = Math.floor(ageSeconds / 60);
      
      console.log(`📍 ${node.label}`);
      console.log(`   ID: ${node.id}`);
      console.log(`   Créé: ${new Date(node.createdAt).toLocaleString('fr-FR')}`);
      console.log(`   Age: ${ageMinutes}min ${ageSeconds % 60}s ago`);
      console.log(`   Metadata: ${JSON.stringify(node.metadata, null, 2).split('\n').join('\n   ')}`);
      
      // Checker les propriétés table
      if (node.table_activeId || node.table_instances) {
        console.log(`   \n   📊 Table config:`);
        console.log(`      table_activeId: ${node.table_activeId ? `"${node.table_activeId}"` : 'null'}`);
        
        if (node.table_instances && Object.keys(node.table_instances).length > 0) {
          console.log(`      table_instances keys:`);
          for (const key of Object.keys(node.table_instances)) {
            const val = node.table_instances[key];
            console.log(`         - "${key}" → tableId: "${val?.tableId || 'N/A'}"`);
          }
        } else {
          console.log(`      table_instances: (vide)`);
        }
      }
      
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('\n🔎 ANALYSE TEMPORELLE:\n');

    const sorted = nodes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const timeline = sorted.map((n, i) => ({
      order: i + 1,
      label: n.label,
      age: Math.floor((new Date() - new Date(n.createdAt)) / 1000 / 60) + 'min'
    }));

    console.table(timeline);

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
