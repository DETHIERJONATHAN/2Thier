import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🔍 Vérification finale: Configuration du repeater "Nouveau Section"
 */

async function checkRepeaterConfig() {
  console.log('🔍 VÉRIFICATION DE LA CONFIGURATION\n');
  console.log('='.repeat(80) + '\n');

  // Parent repeater
  const parent = await prisma.treeBranchLeafNode.findUnique({
    where: { id: 'c40d8353-923f-49ac-a3db-91284de99654' },
    select: {
      id: true,
      label: true,
      repeater_templateNodeIds: true,
      metadata: true
    }
  });

  if (!parent) {
    console.log('❌ Parent "Nouveau Section" introuvable\n');
    return;
  }

  console.log(`✅ REPEATER: "${parent.label}"\n`);
  console.log(`   ID: ${parent.id}\n`);

  // Parser les templateIds
  let templateIds = [];
  if (parent.repeater_templateNodeIds) {
    try {
      templateIds = JSON.parse(parent.repeater_templateNodeIds);
    } catch (e) {
      console.log('❌ Erreur de parsing des templateIds');
    }
  }

  console.log(`📋 repeater_templateNodeIds (${templateIds.length}):\n`);

  if (templateIds.length === 0) {
    console.log('   ⚠️  Aucun template configuré !\n');
    console.log('💡 SOLUTION:\n');
    console.log('   Tu dois ajouter "Rampant toiture" comme template');
    console.log('   ID à ajouter: 6817ee20-5782-4b03-a7b1-0687cc5b4d58\n');
    return;
  }

  // Vérifier chaque template
  for (const templateId of templateIds) {
    const template = await prisma.treeBranchLeafNode.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        label: true,
        parentId: true,
        repeater_templateNodeIds: true,
        metadata: true
      }
    });

    if (!template) {
      console.log(`   ❌ Template introuvable: ${templateId}\n`);
      continue;
    }

    // Vérifier la regex
    const hasCopySuffix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-\d+)+$/i;
    const isSuffixed = hasCopySuffix.test(templateId);

    console.log(`   ${isSuffixed ? '❌' : '✅'} "${template.label}"`);
    console.log(`      ID: ${templateId}`);
    console.log(`      Suffixé: ${isSuffixed ? 'OUI (PROBLÈME!)' : 'NON (OK)'}`);
    console.log(`      Parent: ${template.parentId === parent.id ? 'Correct ✅' : 'Incorrect ❌'}`);

    // Vérifier si le template est lui-même un repeater
    const isRepeater = template.repeater_templateNodeIds !== null;
    console.log(`      Est repeater: ${isRepeater ? 'OUI (PROBLÈME!)' : 'NON (OK)'}`);

    console.log('');
  }

  // Vérifier les enfants du repeater
  console.log('='.repeat(80) + '\n');
  console.log('👶 ENFANTS DU REPEATER:\n');

  const children = await prisma.treeBranchLeafNode.findMany({
    where: { parentId: parent.id },
    select: {
      id: true,
      label: true,
      metadata: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Trouvé ${children.length} enfants:\n`);

  const hasCopySuffix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-\d+)+$/i;

  for (const child of children) {
    const isSuffixed = hasCopySuffix.test(child.id);
    const isCopy = child.metadata?.duplicatedFromRepeater === true;
    
    const icon = !isSuffixed && !isCopy ? '📋 TEMPLATE' :
                 isSuffixed && isCopy ? '📑 COPIE' :
                 isSuffixed && !isCopy ? '❌ SUFFIXÉ MAIS PAS COPIE' :
                 '❓ INCOHÉRENT';

    console.log(`${icon}: ${child.label || 'N/A'}`);
    console.log(`   ID: ${child.id}`);
    console.log(`   Suffixé: ${isSuffixed ? 'OUI' : 'NON'}`);
    console.log(`   Marqué comme copie: ${isCopy ? 'OUI' : 'NON'}`);
    console.log('');
  }

  // Diagnostic final
  console.log('='.repeat(80) + '\n');
  console.log('💡 DIAGNOSTIC:\n');

  const problematicTemplates = templateIds.filter(id => hasCopySuffix.test(id));
  
  if (problematicTemplates.length > 0) {
    console.log('❌ PROBLÈME: Des templateIds sont suffixés\n');
    console.log('   Templates problématiques:');
    problematicTemplates.forEach(id => console.log(`   - ${id}`));
    console.log('\n   💡 Tu dois nettoyer ces IDs pour qu\'ils soient des UUIDs purs\n');
  } else if (templateIds.length === 0) {
    console.log('❌ PROBLÈME: Aucun template configuré\n');
    console.log('   💡 Tu dois ajouter "Rampant toiture" comme template\n');
  } else {
    console.log('✅ Configuration correcte !\n');
    console.log('   Tous les templateIds sont des UUIDs purs');
    console.log('   Le repeater est prêt à créer des copies\n');
  }
}

checkRepeaterConfig()
  .catch(e => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
