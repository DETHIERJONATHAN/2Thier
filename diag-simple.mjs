/**
 * 🔍 DIAGNOSTIC SIMPLE: Vérifier si les variables et display nodes existent
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Repeater Toit
const REPEATER_ID = 'd1d8810d-232b-46e0-a5dd-9ee889ad9fc0';

// Variables connues
const VAR_1 = '1887dd08-9f5c-42ae-83e5-fbee66640619';
const VAR_2 = '3dac60e4-1915-479f-b6d6-31a2a9a2fd32';

async function main() {
  console.log('='.repeat(80));
  console.log('🔍 DIAGNOSTIC SIMPLE');
  console.log('='.repeat(80));

  // 1. Vérifier les variables originales
  console.log('\n📦 VARIABLES ORIGINALES:');
  
  const var1 = await prisma.$queryRaw`SELECT id FROM "TreeBranchLeafNodeVariable" WHERE id = ${VAR_1}`;
  const var2 = await prisma.$queryRaw`SELECT id FROM "TreeBranchLeafNodeVariable" WHERE id = ${VAR_2}`;
  
  console.log(`   Variable ${VAR_1}: ${var1.length > 0 ? '✅ EXISTE' : '❌ N\'EXISTE PAS'}`);
  console.log(`   Variable ${VAR_2}: ${var2.length > 0 ? '✅ EXISTE' : '❌ N\'EXISTE PAS'}`);

  // 2. Vérifier les copies de variables
  console.log('\n📦 COPIES DE VARIABLES (-1):');
  
  const var1Copy = await prisma.$queryRaw`SELECT id FROM "TreeBranchLeafNodeVariable" WHERE id = ${VAR_1 + '-1'}`;
  const var2Copy = await prisma.$queryRaw`SELECT id FROM "TreeBranchLeafNodeVariable" WHERE id = ${VAR_2 + '-1'}`;
  
  console.log(`   Variable ${VAR_1}-1: ${var1Copy.length > 0 ? '✅ EXISTE' : '❌ N\'EXISTE PAS'}`);
  console.log(`   Variable ${VAR_2}-1: ${var2Copy.length > 0 ? '✅ EXISTE' : '❌ N\'EXISTE PAS'}`);

  // 3. Vérifier les display nodes pour les copies de templates
  console.log('\n📦 DISPLAY NODES (enfants des copies de templates):');

  // Templates qui ont linkedVariableIds
  const TEMPLATE_ORIENTATION = 'f81b2ace-9f6c-45d4-82a7-a8e4bf842e45';
  const TEMPLATE_INCLINAISON = '62b93c14-ff31-4ce6-b94c-8ae00f6f0ff9';
  const TEMPLATE_LONGUEUR = '1eb2cb60-0085-4a76-a08b-9a0f27a95c98';

  for (const templateId of [TEMPLATE_ORIENTATION, TEMPLATE_INCLINAISON, TEMPLATE_LONGUEUR]) {
    const copyId = templateId + '-1';
    const displayNodes = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: copyId, type: 'display' }
    });
    console.log(`   Parent ${copyId.substring(0, 8)}...-1: ${displayNodes.length} display nodes`);
  }

  // 4. Chercher TOUS les display nodes avec ID contenant -1
  console.log('\n📦 TOUS LES DISPLAY NODES contenant "-1":');
  const allDisplayNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      type: 'display',
      id: { contains: '-1' }
    },
    select: { id: true, parentId: true }
  });
  
  console.log(`   Total: ${allDisplayNodes.length}`);
  allDisplayNodes.slice(0, 5).forEach(dn => {
    console.log(`      - ${dn.id.substring(0, 20)}... (parent: ${dn.parentId?.substring(0, 20)}...)`);
  });

  // 5. Chercher TOUTES les variables contenant -1
  console.log('\n📦 TOUTES LES VARIABLES contenant "-1":');
  const allVariables = await prisma.$queryRaw`
    SELECT id FROM "TreeBranchLeafNodeVariable" WHERE id LIKE '%-1%' LIMIT 10
  `;
  
  console.log(`   Total: ${allVariables.length}`);
  allVariables.forEach(v => {
    console.log(`      - ${v.id}`);
  });

  // 6. QUESTION CRITIQUE: Qu'est-ce qui crée les display nodes normalement?
  // Cherchons les display nodes originaux (pas avec -1) et leur relation
  console.log('\n📦 DISPLAY NODES ORIGINAUX (pour comprendre la structure):');
  
  const templateOri = await prisma.treeBranchLeafNode.findUnique({
    where: { id: TEMPLATE_ORIENTATION },
    select: { name: true, linkedVariableIds: true }
  });
  
  if (templateOri) {
    console.log(`   Template Orientation: linkedVariableIds = ${JSON.stringify(templateOri.linkedVariableIds)}`);
    
    // Chercher les display nodes enfants de ce template
    const oriDisplayNodes = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: TEMPLATE_ORIENTATION, type: 'display' }
    });
    console.log(`   Display nodes enfants du template original: ${oriDisplayNodes.length}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 CONCLUSION');
  console.log('='.repeat(80));
  
  const hasVar1Copy = var1Copy.length > 0;
  const hasVar2Copy = var2Copy.length > 0;
  
  if (!hasVar1Copy && !hasVar2Copy) {
    console.log('\n❌ AUCUNE copie de variable créée!');
    console.log('   => copyVariableWithCapacities n\'est PAS appelée OU échoue silencieusement');
  }

  if (allDisplayNodes.length === 0) {
    console.log('\n❌ AUCUN display node avec ID "-1" trouvé!');
    console.log('   => Les display nodes ne sont jamais créés lors de la copie');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
