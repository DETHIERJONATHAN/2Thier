const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Simuler la logique exacte du deep-copy-service
function generateSuffixedId(originalId, suffix) {
  return `${originalId}-${suffix}`;
}

async function simulateRepeatButton() {
  console.log('🎮 [SIMULATE] Simulation complète du bouton repeat...\n');

  try {
    // 1. Trouver notre environnement de test
    const testTemplate = await prisma.treeBranchLeafNode.findFirst({
      where: {
        label: 'Rampant toiture',
        metadata: {
          path: ['isTemplate'],
          equals: true
        }
      },
      select: {
        id: true,
        label: true,
        parentId: true,
        metadata: true,
        treeId: true
      }
    });

    if (!testTemplate) {
      console.log('❌ Template de test non trouvé. Exécutez d\'abord setup-test-environment.cjs');
      return;
    }

    console.log(`📄 Template: ${testTemplate.label} (${testTemplate.id})`);
    console.log(`📦 Repeater Parent: ${testTemplate.parentId}`);

    // 2. Simuler la première duplication (bouton repeat cliqué 1ère fois)
    console.log('\n🚀 SIMULATION 1ère duplication...');
    
    const repeaterNodeId = testTemplate.parentId;
    const templateNodeId = testTemplate.id;

    // Récupérer état actuel
    let existingChildren = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: repeaterNodeId },
      select: { id: true, metadata: true, label: true }
    });

    console.log(`📋 Enfants existants AVANT 1ère duplication (${existingChildren.length}):`);
    existingChildren.forEach(child => {
      const meta = child.metadata || {};
      console.log(`  - ${child.label} (${child.id})`);
      console.log(`    sourceTemplateId: ${meta.sourceTemplateId || 'NULL'}`);
      console.log(`    copySuffix: ${meta.copySuffix || 'NULL'}`);
    });

    // Appliquer la logique de la route duplicate-templates
    const validExistingCopies1 = existingChildren.filter(child => {
      const meta = child.metadata;
      return meta?.sourceTemplateId === templateNodeId && meta?.copySuffix != null;
    });

    const copyNumber1 = validExistingCopies1.length + 1;
    console.log(`\n🧮 Calcul copyNumber pour 1ère duplication: ${copyNumber1}`);

    // Créer la première copie manuellement (comme le ferait deepCopyNodeInternal)
    const copy1Id = generateSuffixedId(templateNodeId, copyNumber1);
    const copy1Label = `${testTemplate.label}-${copyNumber1}`;

    const copy1 = await prisma.treeBranchLeafNode.create({
      data: {
        id: copy1Id,
        label: copy1Label,
        type: testTemplate.type || 'leaf_field',
        treeId: testTemplate.treeId,
        parentId: repeaterNodeId,
        updatedAt: new Date(),
        metadata: {
          sourceTemplateId: templateNodeId,
          duplicatedAt: new Date().toISOString(),
          duplicatedFromRepeater: repeaterNodeId,
          copiedFromNodeId: templateNodeId,
          copySuffix: copyNumber1
        }
      }
    });

    console.log(`✅ 1ère copie créée: ${copy1.label} (${copy1.id})`);

    // 3. Simuler la deuxième duplication (bouton repeat cliqué 2ème fois)
    console.log('\n🚀 SIMULATION 2ème duplication...');

    // Récupérer nouvel état
    existingChildren = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: repeaterNodeId },
      select: { id: true, metadata: true, label: true }
    });

    console.log(`📋 Enfants existants AVANT 2ème duplication (${existingChildren.length}):`);
    existingChildren.forEach(child => {
      const meta = child.metadata || {};
      console.log(`  - ${child.label} (${child.id})`);
      console.log(`    sourceTemplateId: ${meta.sourceTemplateId || 'NULL'}`);
      console.log(`    copySuffix: ${meta.copySuffix || 'NULL'}`);
    });

    const validExistingCopies2 = existingChildren.filter(child => {
      const meta = child.metadata;
      return meta?.sourceTemplateId === templateNodeId && meta?.copySuffix != null;
    });

    const copyNumber2 = validExistingCopies2.length + 1;
    console.log(`\n🧮 Calcul copyNumber pour 2ème duplication: ${copyNumber2}`);

    // Créer la deuxième copie
    const copy2Id = generateSuffixedId(templateNodeId, copyNumber2);
    const copy2Label = `${testTemplate.label}-${copyNumber2}`;

    const copy2 = await prisma.treeBranchLeafNode.create({
      data: {
        id: copy2Id,
        label: copy2Label,
        type: testTemplate.type || 'leaf_field',
        treeId: testTemplate.treeId,
        parentId: repeaterNodeId,
        updatedAt: new Date(),
        metadata: {
          sourceTemplateId: templateNodeId,
          duplicatedAt: new Date().toISOString(),
          duplicatedFromRepeater: repeaterNodeId,
          copiedFromNodeId: templateNodeId,
          copySuffix: copyNumber2
        }
      }
    });

    console.log(`✅ 2ème copie créée: ${copy2.label} (${copy2.id})`);

    // 4. Vérifier le résultat final
    console.log('\n📊 RÉSULTAT FINAL:');

    const finalChildren = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: repeaterNodeId },
      select: { id: true, metadata: true, label: true },
      orderBy: { label: 'asc' }
    });

    console.log(`📋 Tous les enfants du repeater (${finalChildren.length}):`);
    finalChildren.forEach((child, i) => {
      const meta = child.metadata || {};
      console.log(`  ${i+1}. ${child.label} (${child.id})`);
      console.log(`     sourceTemplateId: ${meta.sourceTemplateId || 'NULL'}`);
      console.log(`     copySuffix: ${meta.copySuffix || 'NULL'}`);
      console.log(`     isTemplate: ${meta.isTemplate || false}`);
    });

    const copies = finalChildren.filter(child => {
      const meta = child.metadata || {};
      return meta.sourceTemplateId === templateNodeId;
    });

    console.log(`\n🎯 ANALYSE DES SUFFIXES:`);
    copies.forEach((copy, i) => {
      const meta = copy.metadata || {};
      const expectedSuffix = i + 1;
      const actualSuffix = meta.copySuffix;
      const isCorrect = actualSuffix === expectedSuffix;
      
      console.log(`  Copie ${i+1}: "${copy.label}"`);
      console.log(`    Suffixe attendu: ${expectedSuffix}`);
      console.log(`    Suffixe réel: ${actualSuffix}`);
      console.log(`    ✅ CORRECT: ${isCorrect}`);
      if (!isCorrect) {
        console.log('    🚨 PROBLÈME: Le suffixe ne correspond pas !');
      }
    });

    const allCorrect = copies.every((copy, i) => {
      const meta = copy.metadata || {};
      return meta.copySuffix === (i + 1);
    });

    console.log(`\n🎖️ RÉSULTAT GLOBAL: ${allCorrect ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);

    if (allCorrect) {
      console.log('✅ La logique de suffixe fonctionne correctement !');
    } else {
      console.log('🚨 Il y a un problème avec la logique de suffixe !');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simulateRepeatButton().catch(console.error);