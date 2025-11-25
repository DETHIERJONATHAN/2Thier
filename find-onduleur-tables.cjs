const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findOnduleurTables() {
  try {
    console.log('\n🔍 RECHERCHE: Toutes les tables liées aux onduleurs\n');
    
    // Chercher tous les nœuds avec "onduleur" dans le nom
    const allNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { label: { contains: 'onduleur', mode: 'insensitive' } },
          { table_name: { contains: 'onduleur', mode: 'insensitive' } },
          { label: { contains: 'Onduleur' } },
          { table_name: { contains: 'Onduleur' } }
        ]
      },
      select: {
        id: true,
        label: true,
        type: true,
        table_name: true,
        table_type: true,
        hasTable: true,
        table_columns: true
      }
    });

    console.log(`✅ ${allNodes.length} nœuds trouvés avec "onduleur":\n`);
    
    allNodes.forEach((node, index) => {
      console.log(`[${index + 1}] ${node.label || '(sans label)'}`);
      console.log(`    ID: ${node.id}`);
      console.log(`    Type: ${node.type}`);
      console.log(`    hasTable: ${node.hasTable}`);
      console.log(`    table_name: ${node.table_name || 'null'}`);
      console.log(`    table_type: ${node.table_type || 'null'}`);
      
      if (node.table_columns) {
        const columns = typeof node.table_columns === 'string'
          ? JSON.parse(node.table_columns)
          : node.table_columns;
        if (Array.isArray(columns)) {
          console.log(`    Colonnes: ${columns.map(c => c.label || c).join(', ')}`);
        }
      }
      console.log('');
    });

    // Chercher aussi la table "Coefficient Primes" qui devrait contenir les onduleurs
    console.log('🔍 RECHERCHE: Tables avec "Coefficient" ou "Primes":\n');
    const coeffTables = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { label: { contains: 'Coefficient', mode: 'insensitive' } },
          { table_name: { contains: 'Coefficient', mode: 'insensitive' } },
          { label: { contains: 'Primes', mode: 'insensitive' } },
          { table_name: { contains: 'Primes', mode: 'insensitive' } }
        ],
        hasTable: true
      },
      select: {
        id: true,
        label: true,
        table_name: true,
        table_type: true,
        table_columns: true
      }
    });

    console.log(`✅ ${coeffTables.length} tables trouvées:\n`);
    
    coeffTables.forEach((table, index) => {
      console.log(`[${index + 1}] ${table.label || '(sans label)'}`);
      console.log(`    ID: ${table.id}`);
      console.log(`    table_name: ${table.table_name || 'null'}`);
      console.log(`    table_type: ${table.table_type || 'null'}`);
      
      if (table.table_columns) {
        const columns = typeof table.table_columns === 'string'
          ? JSON.parse(table.table_columns)
          : table.table_columns;
        if (Array.isArray(columns)) {
          console.log(`    Colonnes: ${columns.map(c => c.label || c).join(', ')}`);
        }
      }
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('🎯 ANALYSE:');
    console.log('');
    console.log('Le champ "Onduleur" (a3b9db61-3b95-48ef-b10f-36a43446fbf1) pointe vers:');
    console.log('  table_activeId: bd05f3df-2666-4ca7-8563-8e6e9c2006ce');
    console.log('');
    console.log('Cette table N\'EXISTE PAS dans la base de données!');
    console.log('');
    console.log('💡 SOLUTION:');
    console.log('  1. Identifier la BONNE table ci-dessus');
    console.log('  2. Mettre à jour le champ Onduleur pour pointer vers la bonne table');
    console.log('  3. Configurer ÉTAPE 2.5 avec cette table');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findOnduleurTables();
