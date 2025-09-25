const { PrismaClient } = require('@prisma/client');

async function analyserChampQuiCalcule() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 ANALYSE DU CHAMP QUI CALCULE vs CEUX QUI NE CALCULENT PAS');
    console.log('================================================================');
    
    // 1. Analyser le champ qui FONCTIONNE
    const champQuiFonctionne = await prisma.treeBranchLeafNode.findFirst({
      where: {
        id: '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e'
      },
      include: {
        TreeBranchLeafNode: true, // parent
        TreeBranchLeafNodeFormula: true,
        TreeBranchLeafNodeCondition: true,
        TreeBranchLeafNodeTable: true
      }
    });

    console.log('\n1. CHAMP QUI FONCTIONNE (10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e):');
    if (champQuiFonctionne) {
      console.log(`   ID: ${champQuiFonctionne.id}`);
      console.log(`   Label: "${champQuiFonctionne.label}"`);
      console.log(`   Type: ${champQuiFonctionne.type}`);
      console.log(`   FieldType: ${champQuiFonctionne.fieldType}`);
      console.log(`   Parent: ${champQuiFonctionne.TreeBranchLeafNode?.label} (${champQuiFonctionne.TreeBranchLeafNode?.type})`);
      console.log(`\n   🎯 CAPACITÉS ACTIVÉES:`);
      console.log(`     hasData: ${champQuiFonctionne.hasData}`);
      console.log(`     hasFormula: ${champQuiFonctionne.hasFormula}`);
      console.log(`     hasCondition: ${champQuiFonctionne.hasCondition}`);
      console.log(`     hasTable: ${champQuiFonctionne.hasTable}`);
      console.log(`     hasAPI: ${champQuiFonctionne.hasAPI}`);
      console.log(`     hasLink: ${champQuiFonctionne.hasLink}`);
      console.log(`     hasMarkers: ${champQuiFonctionne.hasMarkers}`);

      console.log(`\n   🎯 CONFIGURATION DONNÉES:`);
      console.log(`     data_activeId: ${champQuiFonctionne.data_activeId}`);
      console.log(`     data_displayFormat: ${champQuiFonctionne.data_displayFormat}`);
      console.log(`     data_unit: ${champQuiFonctionne.data_unit}`);
      console.log(`     data_precision: ${champQuiFonctionne.data_precision}`);
      console.log(`     data_visibleToUser: ${champQuiFonctionne.data_visibleToUser}`);
      console.log(`     data_exposedKey: ${champQuiFonctionne.data_exposedKey}`);

      console.log(`\n   🎯 CONFIGURATION FORMULE:`);
      console.log(`     formula_activeId: ${champQuiFonctionne.formula_activeId}`);
      console.log(`     formula_name: ${champQuiFonctionne.formula_name}`);
      console.log(`     Formules liées: ${champQuiFonctionne.TreeBranchLeafNodeFormula.length}`);

      console.log(`\n   🎯 CONFIGURATION CONDITION:`);
      console.log(`     condition_activeId: ${champQuiFonctionne.condition_activeId}`);
      console.log(`     condition_mode: ${champQuiFonctionne.condition_mode}`);
      console.log(`     Conditions liées: ${champQuiFonctionne.TreeBranchLeafNodeCondition.length}`);

      if (champQuiFonctionne.data_instances) {
        console.log(`\n   🎯 DATA_INSTANCES:`);
        try {
          const instances = JSON.parse(champQuiFonctionne.data_instances);
          console.log(`     Instances: ${JSON.stringify(instances, null, 2).slice(0, 500)}...`);
        } catch (e) {
          console.log(`     ❌ Erreur parse data_instances`);
        }
      }

      if (champQuiFonctionne.metadata) {
        console.log(`\n   🎯 METADATA:`);
        try {
          const meta = JSON.parse(champQuiFonctionne.metadata);
          console.log(`     Metadata: ${JSON.stringify(meta, null, 2).slice(0, 300)}...`);
        } catch (e) {
          console.log(`     ❌ Erreur parse metadata`);
        }
      }
    } else {
      console.log('   ❌ Champ qui fonctionne NON TROUVÉ !');
      return;
    }

    // 2. Trouver les champs avec hasData: true qui ne calculent pas
    const autresChamps = await prisma.treeBranchLeafNode.findMany({
      where: {
        hasData: true,
        id: {
          not: '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e'
        }
      },
      include: {
        TreeBranchLeafNode: true
      },
      take: 3
    });

    console.log(`\n2. AUTRES CHAMPS hasData: true (${autresChamps.length} trouvés):`);
    
    autresChamps.forEach((champ, i) => {
      console.log(`\n   Champ ${i + 1}:`);
      console.log(`     ID: ${champ.id}`);
      console.log(`     Label: "${champ.label}"`);
      console.log(`     Type: ${champ.type}`);
      console.log(`     FieldType: ${champ.fieldType}`);
      console.log(`     Parent: ${champ.TreeBranchLeafNode?.label} (${champ.TreeBranchLeafNode?.type})`);
      
      console.log(`\n     🎯 CAPACITÉS vs CHAMP QUI FONCTIONNE:`);
      console.log(`       hasData: ${champ.hasData} (✓ identique)`);
      console.log(`       hasFormula: ${champ.hasFormula} ${champ.hasFormula === champQuiFonctionne.hasFormula ? '(✓ identique)' : '(❌ DIFFÉRENT)'}`);
      console.log(`       hasCondition: ${champ.hasCondition} ${champ.hasCondition === champQuiFonctionne.hasCondition ? '(✓ identique)' : '(❌ DIFFÉRENT)'}`);

      console.log(`\n     🎯 CONFIGURATION DONNÉES vs CHAMP QUI FONCTIONNE:`);
      console.log(`       data_activeId: ${champ.data_activeId} ${champ.data_activeId === champQuiFonctionne.data_activeId ? '(✓ identique)' : '(❌ DIFFÉRENT)'}`);
      console.log(`       data_displayFormat: ${champ.data_displayFormat} ${champ.data_displayFormat === champQuiFonctionne.data_displayFormat ? '(✓ identique)' : '(❌ DIFFÉRENT)'}`);
      console.log(`       formula_activeId: ${champ.formula_activeId} ${champ.formula_activeId === champQuiFonctionne.formula_activeId ? '(✓ identique)' : '(❌ DIFFÉRENT)'}`);
      console.log(`       condition_activeId: ${champ.condition_activeId} ${champ.condition_activeId === champQuiFonctionne.condition_activeId ? '(✓ identique)' : '(❌ DIFFÉRENT)'}`);
    });

    // 3. ANALYSE DES DIFFÉRENCES
    console.log(`\n3. 🎯 ANALYSE DES DIFFÉRENCES CRITIQUES:`);
    
    console.log(`\n   Le champ qui fonctionne a:`);
    console.log(`     - hasData: ${champQuiFonctionne.hasData}`);
    console.log(`     - hasFormula: ${champQuiFonctionne.hasFormula}`);
    console.log(`     - hasCondition: ${champQuiFonctionne.hasCondition}`);
    console.log(`     - data_activeId: ${champQuiFonctionne.data_activeId || 'null'}`);
    console.log(`     - formula_activeId: ${champQuiFonctionne.formula_activeId || 'null'}`);
    console.log(`     - condition_activeId: ${champQuiFonctionne.condition_activeId || 'null'}`);

    console.log(`\n   🤔 HYPOTHÈSES À TESTER:`);
    console.log(`   1. Le champ qui fonctionne a une FORMULE ou CONDITION active ?`);
    console.log(`   2. Le champ qui fonctionne a une configuration data_activeId spéciale ?`);
    console.log(`   3. Le champ qui fonctionne a des instances ou metadata particulières ?`);
    console.log(`   4. Le champ qui fonctionne est dans une section/parent spécial ?`);

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyserChampQuiCalcule();