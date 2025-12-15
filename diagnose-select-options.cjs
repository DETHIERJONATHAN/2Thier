/**
 * 🔍 Diagnostic: Comment les options du select Position sont-elles configurées ?
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  const positionFieldId = '249b682d-d50d-42fd-bdcf-f6a1139792d1';

  console.log('='.repeat(70));
  console.log('🔍 Diagnostic du select Position');
  console.log('='.repeat(70));

  // 1. Le noeud Position
  const positionNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: positionFieldId },
    select: {
      id: true,
      label: true,
      type: true,
      fieldType: true,
      select_options: true
    }
  });

  console.log('\n📦 Noeud Position:');
  console.log(JSON.stringify(positionNode, null, 2));

  // 2. Le SelectConfig
  const selectConfig = await prisma.treeBranchLeafSelectConfig.findUnique({
    where: { nodeId: positionFieldId },
    select: {
      id: true,
      nodeId: true,
      options: true,
      optionsSource: true,
      searchable: true,
      multiple: true
    }
  });

  console.log('\n⚙️ SelectConfig:');
  console.log(JSON.stringify(selectConfig, null, 2));

  // 3. Les enfants (options)
  const childOptions = await prisma.treeBranchLeafNode.findMany({
    where: { parentId: positionFieldId },
    select: {
      id: true,
      label: true,
      type: true,
      value: true,
      option_label: true,
      order: true
    },
    orderBy: { order: 'asc' }
  });

  console.log('\n👶 Enfants (options):');
  childOptions.forEach(opt => {
    console.log(`   - ID: ${opt.id}`);
    console.log(`     label: "${opt.label}"`);
    console.log(`     type: ${opt.type}`);
    console.log(`     value: ${opt.value}`);
    console.log(`     option_label: ${opt.option_label}`);
    console.log('');
  });

  // 4. Comment le frontend devrait construire les options
  console.log('\n💡 Comment le frontend devrait construire les options:');
  console.log('   Selon useTblData.ts ligne 276:');
  console.log('   options = childOptions.map(child => ({ label: child.title, value: child.id }))');
  console.log('');
  console.log('   Pour Position, ça donnerait:');
  childOptions.forEach(opt => {
    console.log(`   { label: "${opt.label}", value: "${opt.id}" }`);
  });

  // 5. Vérifier ce qui se passe dans le backend
  console.log('\n🔍 Dans interpretCondition (operation-interpreter.ts):');
  console.log('   resolveOperandReference(@select.xxx) retourne:');
  console.log('   { value: optionNode.id, label: optionNode.label }');
  console.log('');
  console.log('   Pour @select.3211d48d-4745-445d-b8fc-3e19e5dc4b8a (Portrait):');
  console.log(`   { value: "3211d48d-4745-445d-b8fc-3e19e5dc4b8a", label: "Portrait" }`);
  console.log('');
  console.log('   Donc rightValue = "3211d48d-4745-445d-b8fc-3e19e5dc4b8a"');

  // 6. Le problème
  console.log('\n⚠️ LE PROBLÈME:');
  console.log('   Quand le frontend envoie la valeur sélectionnée dans formData,');
  console.log('   il envoie option.value');
  console.log('');
  console.log('   Si option.value est null ou le label au lieu de l\'ID,');
  console.log('   alors leftValue != rightValue et la condition échoue !');
  console.log('');
  console.log('   SOLUTION: S\'assurer que les options ont value = ID du nœud');

  console.log('\n' + '='.repeat(70));
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
