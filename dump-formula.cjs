const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const formula = await prisma.treebranchleafnodeformula.findUnique({
      where: { id: '1a0285ab-0379-4ad5-8d03-4fd3f2f2b832' },
      include: { node: true }
    });

    if (!formula) {
      console.log('❌ Formule non trouvée');
      process.exit(0);
    }

    console.log('📋 FORMULE TROUVÉE:');
    console.log(`   ID: ${formula.id}`);
    console.log(`   Nœud: ${formula.node?.label || 'N/A'}`);
    console.log(`   Type de formule: ${formula.type}`);
    console.log('\n🔍 Configuration complète:');
    console.log(JSON.stringify(formula, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
