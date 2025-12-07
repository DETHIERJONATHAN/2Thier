const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnoseLiveIssue() {
  console.log('🚨 [DIAGNOSE-LIVE] Diagnostic en temps réel du problème...\n');

  try {
    // 1. Chercher tous les "Rampant toiture" dans la base
    const allRampantNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        label: {
          contains: 'Rampant toiture'
        }
      },
      select: {
        id: true,
        label: true,
        parentId: true,
        metadata: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`🔍 Tous les nœuds "Rampant toiture" trouvés (${allRampantNodes.length}):`);
    allRampantNodes.forEach((node, i) => {
      const meta = node.metadata || {};
      console.log(`\n  ${i+1}. "${node.label}" (${node.id})`);
      console.log(`     Parent: ${node.parentId}`);
      console.log(`     Créé: ${new Date(node.createdAt).toLocaleString()}`);
      console.log(`     sourceTemplateId: ${meta.sourceTemplateId || 'NULL'}`);
      console.log(`     copySuffix: ${meta.copySuffix || 'NULL'}`);
      console.log(`     isTemplate: ${meta.isTemplate || false}`);
    });

    // 2. Identifier les templates vs copies
    const templates = allRampantNodes.filter(node => {
      const meta = node.metadata || {};
      return !meta.sourceTemplateId && (meta.isTemplate || node.label === 'Rampant toiture');
    });

    const copies = allRampantNodes.filter(node => {
      const meta = node.metadata || {};
      return meta.sourceTemplateId;
    });

    console.log(`\n📋 CLASSIFICATION:`);
    console.log(`   Templates: ${templates.length}`);
    console.log(`   Copies: ${copies.length}`);

    if (templates.length === 0) {
      console.log('❌ AUCUN TEMPLATE TROUVÉ ! Le problème vient peut-être de là.');
      return;
    }

    // 3. Analyser chaque template et ses copies
    for (const template of templates) {
      console.log(`\n🎯 ANALYSE TEMPLATE: "${template.label}" (${template.id})`);
      
      const templateCopies = copies.filter(copy => {
        const meta = copy.metadata || {};
        return meta.sourceTemplateId === template.id;
      });

      console.log(`   Copies de ce template: ${templateCopies.length}`);
      
      templateCopies.forEach((copy, i) => {
        const meta = copy.metadata || {};
        console.log(`     ${i+1}. "${copy.label}" → suffixe ${meta.copySuffix}`);
      });

      // 4. Vérifier s'il y a des copies avec suffixe incorrect
      const incorrectCopies = templateCopies.filter(copy => {
        const meta = copy.metadata || {};
        return meta.copySuffix === 2 && templateCopies.length === 1; // Premier et seul mais suffixe 2
      });

      if (incorrectCopies.length > 0) {
        console.log(`\n🚨 PROBLÈME DÉTECTÉ pour template ${template.id}:`);
        incorrectCopies.forEach(copy => {
          const meta = copy.metadata || {};
          console.log(`   ❌ "${copy.label}" a le suffixe ${meta.copySuffix} mais c'est probablement la première copie !`);
        });

        // 5. Analyser le parent repeater
        if (template.parentId) {
          const repeater = await prisma.treeBranchLeafNode.findUnique({
            where: { id: template.parentId },
            select: { id: true, label: true, type: true }
          });

          console.log(`\n📦 REPEATER PARENT: ${repeater?.label} (${repeater?.id})`);

          // Lister tous les enfants du repeater pour comprendre le contexte
          const allChildren = await prisma.treeBranchLeafNode.findMany({
            where: { parentId: template.parentId },
            select: { id: true, label: true, metadata: true },
            orderBy: { label: 'asc' }
          });

          console.log(`📋 TOUS LES ENFANTS DU REPEATER (${allChildren.length}):`);
          allChildren.forEach((child, i) => {
            const meta = child.metadata || {};
            console.log(`   ${i+1}. "${child.label}" (${child.id})`);
            console.log(`      sourceTemplateId: ${meta.sourceTemplateId || 'NULL'}`);
            console.log(`      copySuffix: ${meta.copySuffix || 'NULL'}`);
          });

          // 6. Simuler le calcul de copyNumber selon la route duplicate-templates
          console.log(`\n🧮 SIMULATION CALCUL COPYNUMBER:`);
          
          const validExistingCopies = allChildren.filter(child => {
            const meta = child.metadata;
            return meta?.sourceTemplateId === template.id && meta?.copySuffix != null;
          });

          console.log(`   validExistingCopies trouvées: ${validExistingCopies.length}`);
          validExistingCopies.forEach((copy, i) => {
            const meta = copy.metadata || {};
            console.log(`     ${i+1}. "${copy.label}" (suffixe ${meta.copySuffix})`);
          });

          const expectedCopyNumber = validExistingCopies.length + 1;
          console.log(`   → copyNumber calculé par la route: ${expectedCopyNumber}`);

          if (expectedCopyNumber !== 1 && validExistingCopies.length === 1) {
            console.log(`\n🚨 PROBLÈME: La route calcule copyNumber=${expectedCopyNumber} mais il devrait être 1 pour la première copie !`);
          }
        }
      }
    }

    // 7. Recommandations
    console.log(`\n💡 RECOMMANDATIONS:`);
    
    const problematicCopies = copies.filter(copy => {
      const meta = copy.metadata || {};
      return meta.copySuffix === 2 && copy.label.endsWith('-2');
    });

    if (problematicCopies.length > 0) {
      console.log(`   🗑️ Supprimer ${problematicCopies.length} copies avec suffixe -2 incorrect`);
      console.log(`   🔄 Retenter la duplication après nettoyage`);
      console.log(`   📝 Vérifier que le serveur utilise la version corrigée (npm run build:server)`);
    } else {
      console.log(`   ✅ Aucune copie problématique détectée dans la base actuelle`);
      console.log(`   🔍 Le problème pourrait venir d'un cache ou d'une autre route`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseLiveIssue().catch(console.error);