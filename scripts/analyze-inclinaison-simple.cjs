#!/usr/bin/env node
/**
 * 🔍 SCRIPT SIMPLE: Comprendre comment "Inclinaison" est dupliqué
 * Version simplifiée sans include relations complexes
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const INCLINAISON_TEMPLATE_ID = '4aad6a8f-6bba-42aa-bd3a-4de1f182075a';
const VERSANT_REPEATER_ID = '10724c29-a717-4650-adf3-0ea6633f64f1';

async function main() {
  console.log('\n================== 🔍 ANALYSE INCLINAISON (SIMPLE) ==================\n');

  try {
    // 1. Template original
    console.log('📋 1️⃣ TEMPLATE ORIGINAL:');
    const templateNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: INCLINAISON_TEMPLATE_ID }
    });

    if (!templateNode) {
      console.error('❌ Template Inclinaison introuvable!');
      process.exit(1);
    }

    console.log('  ✅ Trouvé:');
    console.log(`     - Label: "${templateNode.label}"`);
    console.log(`     - Type: ${templateNode.type}`);
    console.log(`     - FieldType: ${templateNode.fieldType}`);
    console.log(`     - ParentId: ${templateNode.parentId}`);
    console.log(`     - ID: ${templateNode.id}`);

    // 2. TOUTES les copies (peu importe où)
    console.log('\n📋 2️⃣ TOUTES LES COPIES CRÉÉES:');
    const allCopies = await prisma.treeBranchLeafNode.findMany({
      where: {
        metadata: {
          path: ['sourceTemplateId'],
          equals: INCLINAISON_TEMPLATE_ID
        }
      }
    });

    console.log(`  ✅ Trouvé ${allCopies.length} copies au total:`);
    
    for (let i = 0; i < allCopies.length; i++) {
      const copy = allCopies[i];
      const isDisplayNode = copy.id.startsWith('display-');
      
      console.log(`\n     Copie ${i + 1}:`);
      console.log(`     - ID: ${copy.id}`);
      console.log(`     - Label: "${copy.label}"`);
      console.log(`     - ParentId: ${copy.parentId}`);
      console.log(`     - Type/FieldType: ${copy.type}/${copy.fieldType}`);
      console.log(`     - Est nœud affichage? ${isDisplayNode ? '✅ OUI (display-*)' : '❌ NON (copie éditable)'}`);
      console.log(`     - duplicatedFromRepeater: ${copy.metadata?.duplicatedFromRepeater || 'N/A'}`);
      console.log(`     - Sous Versant? ${copy.parentId === VERSANT_REPEATER_ID ? '✅ OUI' : '❌ NON'}`);
    }

    // 3. Enfants directs du répéteur Versant
    console.log('\n📋 3️⃣ ENFANTS DIRECTS DU RÉPÉTEUR VERSANT:');
    const versantChildren = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: VERSANT_REPEATER_ID }
    });

    console.log(`  ✅ Trouvé ${versantChildren.length} enfants:`);
    
    for (const child of versantChildren) {
      console.log(`\n     - "${child.label}" (${child.id})`);
      console.log(`       Type/FieldType: ${child.type}/${child.fieldType}`);
      console.log(`       sourceTemplateId: ${child.metadata?.sourceTemplateId || 'N/A'}`);
    }

    // 4. Compter les copies par parent
    console.log('\n📋 4️⃣ RÉPARTITION DES COPIES PAR PARENT:');
    const copyParents = {};
    for (const copy of allCopies) {
      if (!copyParents[copy.parentId]) {
        copyParents[copy.parentId] = [];
      }
      copyParents[copy.parentId].push(copy);
    }

    for (const [parentId, copies] of Object.entries(copyParents)) {
      const parent = await prisma.treeBranchLeafNode.findUnique({
        where: { id: parentId },
        select: { label: true }
      });
      console.log(`\n     Sous parent "${parent?.label}" (${parentId}): ${copies.length} copie(s)`);
      for (const c of copies) {
        console.log(`       - ${c.label} (${c.id.substring(0, 20)}...)`);
      }
    }

    // 5. Récupérer le répéteur et ses métadonnées
    console.log('\n📋 5️⃣ MÉTADONNÉES DU RÉPÉTEUR VERSANT:');
    const repeater = await prisma.treeBranchLeafNode.findUnique({
      where: { id: VERSANT_REPEATER_ID }
    });

    if (repeater) {
      console.log('  ✅ Trouvé:');
      console.log(`     - Label: "${repeater.label}"`);
      console.log(`     - Type: ${repeater.type}`);
      console.log(`     - Metadata: ${JSON.stringify(repeater.metadata, null, 2)}`);
    }

    // 6. Résumé
    console.log('\n📋 6️⃣ RÉSUMÉ:');
    const displayCopies = allCopies.filter(c => c.id.startsWith('display-'));
    const editableCopies = allCopies.filter(c => !c.id.startsWith('display-'));
    const underVersant = allCopies.filter(c => c.parentId === VERSANT_REPEATER_ID);
    
    console.log(`  - Total copies: ${allCopies.length}`);
    console.log(`  - Nœuds d'affichage (display-*): ${displayCopies.length}`);
    console.log(`  - Copies éditables: ${editableCopies.length}`);
    console.log(`  - Sous le répéteur Versant: ${underVersant.length}`);
    console.log(`\n  📊 DIAGNOSTIC:`);
    
    if (underVersant.length === 0) {
      console.log(`  ⚠️  ATTENTION: Aucune copie sous Versant! Le champ n'est peut-être pas dupliqué correctement.`);
    } else {
      console.log(`  ✅ OK: ${underVersant.length} copie(s) trouvée(s) sous Versant.`);
    }
    
    if (displayCopies.length > 0) {
      console.log(`  ℹ️  ${displayCopies.length} nœud(s) d'affichage trouvé(s).`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.message.includes('Unknown field')) {
      console.error('   → Problème de schéma Prisma');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
