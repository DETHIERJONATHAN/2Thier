#!/usr/bin/env node
/**
 * 🔍 ANALYSE DES MÉTADONNÉES ET DU RENDU
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const INCLINAISON_TEMPLATE_ID = '4aad6a8f-6bba-42aa-bd3a-4de1f182075a';
const VERSANT_REPEATER_ID = '10724c29-a717-4650-adf3-0ea6633f64f1';

async function main() {
  console.log('\n================== 🔍 ANALYSE MÉTADONNÉES ==================\n');

  try {
    // 1. Récupérer le template Inclinaison et vérifier son fieldType
    const inclinaison = await prisma.treeBranchLeafNode.findUnique({
      where: { id: INCLINAISON_TEMPLATE_ID }
    });

    console.log('📋 TEMPLATE INCLINAISON:');
    console.log(`  - Label: "${inclinaison.label}"`);
    console.log(`  - Type: ${inclinaison.type}`);
    console.log(`  - FieldType: ${inclinaison.fieldType}`);
    console.log(`  - SubType: ${inclinaison.subType}`);
    console.log(`  - Metadata complet:`, JSON.stringify(inclinaison.metadata, null, 2));

    // 2. Récupérer le parent du template (où se trouve "Type de pose", "Nom du versant", etc.)
    const templateParent = await prisma.treeBranchLeafNode.findUnique({
      where: { id: inclinaison.parentId }
    });

    console.log('\n📋 PARENT DU TEMPLATE:');
    console.log(`  - Label: "${templateParent?.label}"`);
    console.log(`  - Type: ${templateParent?.type}`);
    console.log(`  - ID: ${templateParent?.id}`);

    // 3. Récupérer TOUS les enfants du parent du template
    const templateSiblings = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: inclinaison.parentId }
    });

    console.log('\n📋 CHAMPS DU TEMPLATE (frères/sœurs d\'Inclinaison):');
    console.log(`  - Total: ${templateSiblings.length}`);
    for (const sibling of templateSiblings) {
      console.log(`    • "${sibling.label}" (${sibling.id})`);
    }

    // 4. Vérifier le répéteur et ses templateNodeIds
    const repeater = await prisma.treeBranchLeafNode.findUnique({
      where: { id: VERSANT_REPEATER_ID }
    });

    console.log('\n📋 RÉPÉTEUR VERSANT - Métadonnées:');
    console.log(`  - Label: "${repeater?.label}"`);
    console.log(`  - Type: ${repeater?.type}`);
    console.log(`  - Metadata.repeater.templateNodeIds:`, 
      repeater?.metadata?.repeater?.templateNodeIds || '❌ VIDE ou undefined');

    // 5. Chercher "Nouveau Section" et voir ses enfants
    console.log('\n📋 RECHERCHE "NOUVEAU SECTION":');
    const nouvelleSection = await prisma.treeBranchLeafNode.findFirst({
      where: {
        label: { contains: 'Nouveau', mode: 'insensitive' }
      }
    });

    if (nouvelleSection) {
      console.log(`  ✅ Trouvé: "${nouvelleSection.label}" (${nouvelleSection.id})`);
      
      // Enfants de Nouveau Section
      const datasectionChildren = await prisma.treeBranchLeafNode.findMany({
        where: { parentId: nouvelleSection.id }
      });

      console.log(`  - Enfants (${datasectionChildren.length}):`);
      for (const child of datasectionChildren) {
        console.log(`    • "${child.label}" (${child.id})`);
      }
    } else {
      console.log('  ❌ "Nouveau Section" non trouvé');
    }

    // 6. Chercher display-* nodes associés à Inclinaison
    console.log('\n📋 NŒUDS D\'AFFICHAGE (display-*):');
    const displayNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        id: { startsWith: 'display-' }
      }
    });

    const inclinaisonDisplays = displayNodes.filter(d => 
      d.metadata?.sourceTemplateId === INCLINAISON_TEMPLATE_ID
    );

    console.log(`  - Total display nodes: ${displayNodes.length}`);
    console.log(`  - Pour Inclinaison: ${inclinaisonDisplays.length}`);
    
    for (const display of inclinaisonDisplays) {
      console.log(`\n    Display Node:`);
      console.log(`    - ID: ${display.id}`);
      console.log(`    - Label: "${display.label}"`);
      console.log(`    - ParentId: ${display.parentId}`);
      console.log(`    - Metadata:`, JSON.stringify(display.metadata, null, 2));
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
