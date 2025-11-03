#!/usr/bin/env node
/**
 * 🔍 SCRIPT D'ANALYSE: Comprendre comment "Inclinaison" est dupliqué
 * 
 * Ce script examine:
 * 1. Le template "Inclinaison" original (4aad6a8f-6bba-42aa-bd3a-4de1f182075a)
 * 2. Ses copies créées (Inclinaison-1, Inclinaison-2, etc.)
 * 3. Les métadonnées associées (sourceTemplateId, duplicatedFromRepeater, etc.)
 * 4. Où elles sont parentes (parentId)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const INCLINAISON_TEMPLATE_ID = '4aad6a8f-6bba-42aa-bd3a-4de1f182075a';
const VERSANT_REPEATER_ID = '10724c29-a717-4650-adf3-0ea6633f64f1';
const ORIENTATION_TEMPLATE_ID = '131a7b51-97d5-4f40-8a5a-9359f38939e8';

async function main() {
  console.log('\n================== 🔍 ANALYSE INCLINAISON ==================\n');

  try {
    // 1. Récupérer le template original
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
    console.log(`     - ParentId: ${templateNode.parentId} (${templateNode.parent?.label || 'N/A'})`);
    console.log(`     - FieldType: ${templateNode.fieldType}`);
    console.log(`     - SubType: ${templateNode.subType}`);
    console.log(`     - Metadata: ${JSON.stringify(templateNode.metadata, null, 2)}`);

    // 2. Récupérer toutes les copies
    console.log('\n📋 2️⃣ COPIES CRÉÉES:');
    const copies = await prisma.treeBranchLeafNode.findMany({
      where: {
        metadata: {
          path: ['sourceTemplateId'],
          equals: INCLINAISON_TEMPLATE_ID
        }
      }
    });

    console.log(`  ✅ Trouvé ${copies.length} copies:`);
    for (const copy of copies) {
      console.log(`\n     Copie #${copies.indexOf(copy) + 1}:`);
      console.log(`     - ID: ${copy.id}`);
      console.log(`     - Label: "${copy.label}"`);
      console.log(`     - ParentId: ${copy.parentId}`);
      console.log(`     - Metadata.sourceTemplateId: ${copy.metadata?.sourceTemplateId}`);
      console.log(`     - Metadata.duplicatedFromRepeater: ${copy.metadata?.duplicatedFromRepeater}`);
      console.log(`     - Metadata.duplicatedAt: ${copy.metadata?.duplicatedAt}`);
      console.log(`     - Metadata.copySuffix: ${copy.metadata?.copySuffix}`);
      
      // Vérifier si c'est un nœud d'affichage (display-*)
      const isDisplayNode = copy.id.startsWith('display-');
      console.log(`     - Est un nœud d'affichage? ${isDisplayNode ? '✅ OUI' : '❌ NON'}`);
    }

    // 3. Vérifier le répéteur Versant
    console.log('\n📋 3️⃣ RÉPÉTEUR VERSANT:');
    const versantRepeater = await prisma.treeBranchLeafNode.findUnique({
      where: { id: VERSANT_REPEATER_ID }
    });

    if (!versantRepeater) {
      console.log('  ❌ Répéteur Versant introuvable!');
    } else {
      console.log('  ✅ Trouvé:');
      console.log(`     - Label: "${versantRepeater.label}"`);
      console.log(`     - Type: ${versantRepeater.type}`);
      console.log(`     - ParentId: ${versantRepeater.parentId}`);
      console.log(`     - Metadata.templateNodeIds: ${JSON.stringify(versantRepeater.metadata?.repeater?.templateNodeIds || [])}`);
      console.log(`\n     Enfants directs (${versantRepeater.children.length}):`);
      
      for (const child of versantRepeater.children) {
        console.log(`\n       - "${child.label}" (${child.id})`);
        console.log(`         Type: ${child.type}, FieldType: ${child.fieldType}`);
        console.log(`         sourceTemplateId: ${child.metadata?.sourceTemplateId || 'N/A'}`);
        console.log(`         duplicatedFromRepeater: ${child.metadata?.duplicatedFromRepeater || 'N/A'}`);
      }
    }

    // 4. Chercher "Nouveau Section"
    console.log('\n📋 4️⃣ RECHERCHE "NOUVEAU SECTION":');
    const nouvelleSection = await prisma.treeBranchLeafNode.findFirst({
      where: {
        label: { equals: 'Nouveau Section', mode: 'insensitive' }
      },
      include: {
        children: {
          select: {
            id: true,
            label: true,
            type: true,
            metadata: true,
            parentId: true
          },
          where: {
            OR: [
              { label: { contains: 'Inclinaison', mode: 'insensitive' } },
              { metadata: { path: ['sourceTemplateId'], equals: INCLINAISON_TEMPLATE_ID } }
            ]
          }
        }
      }
    });

    if (!nouvelleSection) {
      console.log('  ℹ️ "Nouveau Section" introuvable ou aucun enfant Inclinaison');
    } else {
      console.log('  ✅ Trouvé "Nouveau Section":');
      console.log(`     - ID: ${nouvelleSection.id}`);
      console.log(`\n     Enfants contenant "Inclinaison" (${nouvelleSection.children.length}):`);
      
      for (const child of nouvelleSection.children) {
        console.log(`\n       - "${child.label}" (${child.id})`);
        console.log(`         ParentId: ${child.parentId}`);
        console.log(`         Type: ${child.type}`);
        console.log(`         Metadata: ${JSON.stringify(child.metadata)}`);
      }
    }

    // 5. Résumé des problèmes
    console.log('\n📋 5️⃣ DIAGNOSTIQUE:');
    const inclinaisonCopiesUnderVersant = copies.filter(c => c.parentId === VERSANT_REPEATER_ID);
    const inclinaisonCopiesElsewhere = copies.filter(c => c.parentId !== VERSANT_REPEATER_ID);

    console.log(`\n  ✅ Copies sous le répéteur Versant: ${inclinaisonCopiesUnderVersant.length}`);
    for (const copy of inclinaisonCopiesUnderVersant) {
      console.log(`     - "${copy.label}" (${copy.id})`);
    }

    console.log(`\n  ⚠️  Copies ailleurs: ${inclinaisonCopiesElsewhere.length}`);
    for (const copy of inclinaisonCopiesElsewhere) {
      console.log(`     - "${copy.label}" (${copy.id}) → ParentId: ${copy.parentId} (${copy.parent?.label})`);
      if (copy.id.startsWith('display-')) {
        console.log(`       ⚠️  C'est un nœud d'AFFICHAGE (display-*), pas un champ éditable!`);
      }
    }

    console.log('\n  🔍 CONCLUSIONS:');
    if (inclinaisonCopiesElsewhere.length > 0) {
      console.log('     ❌ PROBLÈME DÉTECTÉ: Des copies d\'Inclinaison ne sont pas sous Versant!');
      console.log('        → Cela explique pourquoi tu vois "Inclinaison-1" comme une carte bleue au lieu d\'un champ');
      console.log('        → Ces copies ailleurs ont probablement un ID display-* (nœuds d\'affichage)');
    } else {
      console.log('     ✅ Toutes les copies sont correctement sous Versant');
    }

    if (!versantRepeater?.metadata?.repeater?.templateNodeIds?.includes(INCLINAISON_TEMPLATE_ID)) {
      console.log('     ❌ PROBLÈME: templateNodeIds du répéteur N\'INCLUT PAS Inclinaison!');
      console.log('        → Quand tu ajoutes un Versant, Inclinaison ne sera pas dupliqué automatiquement');
      console.log(`        → Vérifie que ${INCLINAISON_TEMPLATE_ID} est dans les templateNodeIds`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
