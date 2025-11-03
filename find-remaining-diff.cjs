const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findRemainingDifferences() {
  console.log('🔍 RECHERCHE DES DIFFÉRENCES RESTANTES (SANS TOUCHER AU CODE)\n');

  try {
    // Champ qui fonctionne
    const working = await prisma.treeBranchLeafNode.findUnique({
      where: { id: 'cc8bf34e-3461-426e-a16d-2c1db4ff8a76' }, // Orientation - Inclinaison
      include: {
        TreeBranchLeafNodeVariable: true,
        TreeBranchLeafNodeFormula: true
      }
    });

    // Champ qui ne fonctionne pas
    const broken = await prisma.treeBranchLeafNode.findUnique({
      where: { id: '965b1e18-3f0e-483f-ba03-81b4dd2d6236' }, // M² de la toiture
      include: {
        TreeBranchLeafNodeVariable: true,
        TreeBranchLeafNodeFormula: true
      }
    });

    console.log('🔬 COMPARAISON EXHAUSTIVE DE TOUTES LES PROPRIÉTÉS:\n');
    console.log('='.repeat(100));

    const allFields = [
      // Propriétés principales
      'type', 'subType', 'tbl_capacity', 'tbl_type', 'hasFormula', 'hasData',
      'fieldType', 'fieldSubType',
      // Configs
      'fieldConfig', 'formulaConfig', 'conditionConfig', 'tableConfig',
      // IDs actifs
      'data_activeId', 'formula_activeId', 'condition_activeId', 'table_activeId',
      // Instances
      'data_instances', 'formula_instances', 'condition_instances', 'table_instances',
      // Metadata
      'metadata',
      // Autres
      'data_displayFormat', 'data_exposedKey', 'data_precision', 'data_unit', 'data_visibleToUser',
      'formula_name', 'formula_tokens',
      'table_type'
    ];

    const differences = [];

    for (const fieldName of allFields) {
      const workingVal = working[fieldName];
      const brokenVal = broken[fieldName];
      
      const workingStr = JSON.stringify(workingVal);
      const brokenStr = JSON.stringify(brokenVal);
      
      if (workingStr !== brokenStr) {
        differences.push({
          field: fieldName,
          working: workingVal,
          broken: brokenVal
        });
      }
    }

    if (differences.length === 0) {
      console.log('✅ AUCUNE DIFFÉRENCE TROUVÉE ! Les deux champs sont identiques.');
    } else {
      console.log(`❌ ${differences.length} DIFFÉRENCE(S) TROUVÉE(S):\n`);
      
      for (const diff of differences) {
        console.log(`\n🔴 ${diff.field}:`);
        console.log(`   ✅ FONCTIONNE:`);
        console.log(`      ${JSON.stringify(diff.working, null, 2).split('\n').join('\n      ')}`);
        console.log(`   ❌ CASSÉ:`);
        console.log(`      ${JSON.stringify(diff.broken, null, 2).split('\n').join('\n      ')}`);
        console.log('');
      }
    }

    // Vérification spéciale des variables
    console.log('\n\n🔢 VÉRIFICATION DES VARIABLES:\n');
    console.log('='.repeat(100));
    
    if (working.TreeBranchLeafNodeVariable && broken.TreeBranchLeafNodeVariable) {
      const wv = working.TreeBranchLeafNodeVariable;
      const bv = broken.TreeBranchLeafNodeVariable;
      
      const varFields = Object.keys(wv);
      const varDiffs = [];
      
      for (const vf of varFields) {
        if (JSON.stringify(wv[vf]) !== JSON.stringify(bv[vf])) {
          varDiffs.push({
            field: vf,
            working: wv[vf],
            broken: bv[vf]
          });
        }
      }
      
      if (varDiffs.length === 0) {
        console.log('✅ Les variables sont identiques');
      } else {
        console.log(`❌ ${varDiffs.length} DIFFÉRENCE(S) DANS LES VARIABLES:\n`);
        
        for (const diff of varDiffs) {
          console.log(`\n🔴 ${diff.field}:`);
          console.log(`   ✅ FONCTIONNE: ${JSON.stringify(diff.working)}`);
          console.log(`   ❌ CASSÉ:      ${JSON.stringify(diff.broken)}`);
        }
      }
    }

    // Vérification des formules
    console.log('\n\n📐 VÉRIFICATION DES FORMULES:\n');
    console.log('='.repeat(100));
    
    console.log(`✅ FONCTIONNE: ${working.TreeBranchLeafNodeFormula.length} formule(s)`);
    console.log(`❌ CASSÉ:      ${broken.TreeBranchLeafNodeFormula.length} formule(s)`);
    
    if (broken.TreeBranchLeafNodeFormula.length > 0) {
      console.log('\n📋 Détails de la formule du champ cassé:');
      console.log(JSON.stringify(broken.TreeBranchLeafNodeFormula[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findRemainingDifferences();
