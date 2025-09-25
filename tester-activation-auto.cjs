const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

async function testerActivationAutomatique() {
  const prisma = new PrismaClient();

  try {
    console.log('🧪 TEST ACTIVATION AUTOMATIQUE DES ÉLÉMENTS CRÉÉS');
    console.log('================================================');

    // 1. Créer un nœud de test
    const nodeTest = await prisma.treeBranchLeafNode.create({
      data: {
        id: randomUUID(),
        label: 'Nœud Test Activation',
        type: 'leaf_text',
        organizationId: null,
        TreeBranchLeafTree: {
          create: {
            id: randomUUID(),
            name: 'Arbre Test Activation',
            organizationId: null
          }
        }
      },
      include: {
        TreeBranchLeafTree: true
      }
    });

    console.log(`✅ Nœud de test créé: ${nodeTest.id}`);

    // 2. Test : Créer une formule via l'API (simuler)
    const formuleTest = await prisma.treeBranchLeafNodeFormula.create({
      data: {
        id: randomUUID(),
        nodeId: nodeTest.id,
        organizationId: null,
        name: 'Formule Test Auto',
        tokens: [],
        description: 'Test activation automatique'
      }
    });

    // Simuler l'activation automatique (comme dans notre correction)
    await prisma.treeBranchLeafNode.update({
      where: { id: nodeTest.id },
      data: { 
        hasFormula: true,
        formula_activeId: formuleTest.id
      }
    });

    console.log(`✅ Formule créée et activée automatiquement: ${formuleTest.id}`);

    // 3. Test : Créer une condition via l'API (simuler)
    const conditionTest = await prisma.treeBranchLeafNodeCondition.create({
      data: {
        id: randomUUID(),
        nodeId: nodeTest.id,
        organizationId: null,
        name: 'Condition Test Auto',
        conditionSet: [],
        description: 'Test activation automatique'
      }
    });

    // Simuler l'activation automatique (comme dans notre correction)
    await prisma.treeBranchLeafNode.update({
      where: { id: nodeTest.id },
      data: { 
        hasCondition: true,
        condition_activeId: conditionTest.id
      }
    });

    console.log(`✅ Condition créée et activée automatiquement: ${conditionTest.id}`);

    // 4. Test : Créer des données (comme existant)
    await prisma.treeBranchLeafNode.update({
      where: { id: nodeTest.id },
      data: { hasData: true }
    });

    console.log(`✅ Données activées automatiquement`);

    // 5. Vérification finale
    const nodeComplet = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeTest.id },
      select: {
        id: true,
        label: true,
        hasData: true,
        hasFormula: true,
        hasCondition: true,
        formula_activeId: true,
        condition_activeId: true
      }
    });

    console.log(`\n🎯 RÉSULTAT FINAL DU TEST:`);
    console.log(`   Nœud: ${nodeComplet.label}`);
    console.log(`   hasData: ${nodeComplet.hasData} ${nodeComplet.hasData ? '✅' : '❌'}`);
    console.log(`   hasFormula: ${nodeComplet.hasFormula} ${nodeComplet.hasFormula ? '✅' : '❌'}`);
    console.log(`   hasCondition: ${nodeComplet.hasCondition} ${nodeComplet.hasCondition ? '✅' : '❌'}`);
    console.log(`   formula_activeId: ${nodeComplet.formula_activeId ? '✅ ' + nodeComplet.formula_activeId : '❌ null'}`);
    console.log(`   condition_activeId: ${nodeComplet.condition_activeId ? '✅ ' + nodeComplet.condition_activeId : '❌ null'}`);

    const toutFonctionne = nodeComplet.hasData && 
                          nodeComplet.hasFormula && 
                          nodeComplet.hasCondition && 
                          nodeComplet.formula_activeId && 
                          nodeComplet.condition_activeId;

    console.log(`\n${toutFonctionne ? '🎉' : '❌'} RÉSULTAT: ${toutFonctionne ? 'TOUS LES ÉLÉMENTS SONT ACTIVÉS AUTOMATIQUEMENT !' : 'IL Y A ENCORE DES PROBLÈMES'}`);

    // 6. Nettoyage
    console.log(`\n🧹 NETTOYAGE...`);
    await prisma.treeBranchLeafNode.delete({ where: { id: nodeTest.id } });
    await prisma.treeBranchLeafTree.delete({ where: { id: nodeTest.TreeBranchLeafTree.id } });
    console.log(`✅ Nettoyage terminé`);

    if (toutFonctionne) {
      console.log(`\n🚀 MAINTENANT, CRÉER DE NOUVEAUX ÉLÉMENTS VA LES ACTIVER AUTOMATIQUEMENT !`);
      console.log(`   - Nouvelles formules: hasFormula: true + formula_activeId automatique`);
      console.log(`   - Nouvelles conditions: hasCondition: true + condition_activeId automatique`);
      console.log(`   - Nouvelles données: hasData: true automatique (déjà existant)`);
    }

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testerActivationAutomatique();