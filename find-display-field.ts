import { db } from './src/lib/database';

async function findDisplayField() {
  try {
    const repeaterNodeId = 'c799facd-8853-4c46-b3af-6358c1d8b837';
    
    console.log(`\n📊 RECHERCHE CHAMP D'AFFICHAGE\n`);
    
    // Trouver les enfants du repeater
    const allNodes = await db.treeBranchLeafNode.findMany({
      where: { 
        parentId: repeaterNodeId
      },
      select: {
        id: true,
        label: true,
        type: true,
        fieldType: true,
        data_instances: true
      }
    });
    
    console.log(`Enfants du repeater: ${allNodes.length}\n`);
    
    allNodes.forEach(n => {
      console.log(`${n.label} (${n.type})`);
      console.log(`  - id: ${n.id}`);
      console.log(`  - fieldType: ${n.fieldType}`);
      console.log(`  - data_instances: ${n.data_instances ? JSON.stringify(n.data_instances, null, 2) : 'null'}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

findDisplayField();
