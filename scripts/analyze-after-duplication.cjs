#!/usr/bin/env node
/**
 * 🔍 ANALYSE: Vérifier structure après duplication
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VERSANT_REPEATER_ID = '10724c29-a717-4650-adf3-0ea6633f64f1';

async function main() {
  console.log('\n================== 🔍 STRUCTURE APRÈS DUPLICATION ==================\n');

  try {
    // 1. Récupérer tous les enfants du répéteur Versant
    const versantChildren = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: VERSANT_REPEATER_ID }
    });

    console.log(`📋 ENFANTS DIRECTS DU RÉPÉTEUR VERSANT: ${versantChildren.length}\n`);
    
    for (const child of versantChildren) {
      console.log(`• "${child.label}"`);
      console.log(`  - ID: ${child.id}`);
      console.log(`  - Type: ${child.type}`);
      console.log(`  - FieldType: ${child.fieldType}`);
      console.log(`  - SubType: ${child.subType}`);
      console.log(`  - Est display node? ${child.id.startsWith('display-') ? '✅ OUI' : '❌ NON'}`);
      console.log(`  - Métadonnées sourceTemplateId: ${child.metadata?.sourceTemplateId || 'N/A'}`);
      console.log();
    }

    // 2. Compter les types
    const leafFields = versantChildren.filter(c => c.type === 'leaf_field');
    const branches = versantChildren.filter(c => c.type === 'branch');
    const repeaters = versantChildren.filter(c => c.type === 'leaf_repeater');
    const displayNodes = versantChildren.filter(c => c.id.startsWith('display-'));

    console.log(`\n📊 STATISTIQUES:`);
    console.log(`  - leaf_field: ${leafFields.length}`);
    console.log(`  - branch: ${branches.length}`);
    console.log(`  - leaf_repeater: ${repeaters.length}`);
    console.log(`  - display-* nodes: ${displayNodes.length}`);

    // 3. Chercher "Nouveau Section" et ses enfants
    console.log(`\n📋 ENFANTS DE "NOUVEAU SECTION":`);
    const nouvelleSection = await prisma.treeBranchLeafNode.findFirst({
      where: {
        label: { contains: 'Nouveau', mode: 'insensitive' }
      }
    });

    if (nouvelleSection) {
      const dataSectionChildren = await prisma.treeBranchLeafNode.findMany({
        where: { parentId: nouvelleSection.id }
      });

      console.log(`Trouvé "${nouvelleSection.label}" (${nouvelleSection.id}): ${dataSectionChildren.length} enfants\n`);
      
      for (const child of dataSectionChildren) {
        console.log(`• "${child.label}"`);
        console.log(`  - ID: ${child.id}`);
        console.log(`  - Type: ${child.type}`);
        console.log(`  - sourceTemplateId: ${child.metadata?.sourceTemplateId || 'N/A'}`);
        console.log();
      }
    }

    // 4. Chercher si y'a des Inclinaison-1 en double (une sous Versant, une ailleurs)
    console.log(`\n🔎 RECHERCHE DES "INCLINAISON-1":`);
    const inclinaison1 = await prisma.treeBranchLeafNode.findMany({
      where: {
        label: 'Inclinaison-1'
      }
    });

    console.log(`Trouvé ${inclinaison1.length} nœud(s):`);
    for (const node of inclinaison1) {
      const parent = await prisma.treeBranchLeafNode.findUnique({
        where: { id: node.parentId }
      });
      console.log(`\n  • ID: ${node.id}`);
      console.log(`    Type: ${node.type}`);
      console.log(`    Parent: "${parent?.label}" (${node.parentId})`);
      console.log(`    Est display node? ${node.id.startsWith('display-') ? '✅ OUI' : '❌ NON'}`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
