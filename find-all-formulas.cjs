const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findAllFieldsWithFormulas() {
  console.log('🔍 RECHERCHE: Tous les champs avec des formules\n');

  try {
    // Chercher tous les champs qui ont des formules
    const fieldsWithFormulas = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { hasFormula: true },
          { formula_activeId: { not: null } },
          { formula_instances: { not: null } }
        ]
      },
      include: {
        TreeBranchLeafNodeFormula: true,
        TreeBranchLeafNodeVariable: true
      }
    });

    console.log(`📊 TOTAL: ${fieldsWithFormulas.length} champs avec formules trouvés\n`);

    fieldsWithFormulas.forEach((field, index) => {
      console.log(`${index + 1}. 📋 ${field.label} (${field.id.slice(0, 8)}...)`);
      console.log(`   hasFormula: ${field.hasFormula}`);
      console.log(`   formula_activeId: ${field.formula_activeId || 'NULL'}`);
      console.log(`   formula_instances: ${field.formula_instances ? 'DÉFINI' : 'NULL'}`);
      
      if (field.formula_instances) {
        const instanceCount = Object.keys(field.formula_instances || {}).length;
        console.log(`   → Nombre d'instances: ${instanceCount}`);
      }
      
      if (field.TreeBranchLeafNodeFormula && field.TreeBranchLeafNodeFormula.length > 0) {
        console.log(`   → Formules liées: ${field.TreeBranchLeafNodeFormula.length}`);
        field.TreeBranchLeafNodeFormula.forEach(formula => {
          console.log(`     - ${formula.label}: ${formula.expression}`);
        });
      }
      
      console.log('');
    });

    // Rechercher spécifiquement les champs qu'on pensait corriger
    console.log('\n🎯 RECHERCHE SPÉCIFIQUE: Nos champs cibles');
    console.log('='.repeat(50));
    
    const targetLabels = ['Code postal + 1', 'Code postal + 2', 'Prix Kw/h test'];
    
    for (const label of targetLabels) {
      const field = await prisma.treeBranchLeafNode.findFirst({
        where: { 
          label: { contains: label, mode: 'insensitive' }
        }
      });
      
      if (field) {
        console.log(`✅ "${label}" trouvé: ${field.id}`);
      } else {
        console.log(`❌ "${label}" INTROUVABLE`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findAllFieldsWithFormulas();