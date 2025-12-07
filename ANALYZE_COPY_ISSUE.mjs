// 🔍 ANALYSE COMPLÈTE: POURQUOI LES CHAMPS -1 NE S'AFFICHENT PAS?
// ═══════════════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeRepeaterCopyIssue() {
  try {
    console.log('\n🔍 ANALYSE: Pourquoi les champs dupliqués ne s\'affichent pas\n');
    console.log('═'.repeat(80));
    
    // ═══════════════════════════════════════════════════════════════════════
    // ÉTAPE 1: Trouver le repeater "toit"
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📍 ÉTAPE 1: Localiser le repeater "toit"\n');
    
    const repeater = await prisma.treeBranchLeafNode.findFirst({
      where: { label: { contains: 'toit' }, type: 'leaf_repeater' }
    });
    
    if (!repeater) {
      console.log('❌ Repeater "toit" non trouvé');
      return;
    }
    
    console.log(`✅ Repeater trouvé:`);
    console.log(`   ID: ${repeater.id}`);
    console.log(`   Label: ${repeater.label}`);
    console.log(`   Type: ${repeater.type}`);
    
    // ═══════════════════════════════════════════════════════════════════════
    // ÉTAPE 2: Trouver les templates du repeater
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📍 ÉTAPE 2: Trouver les templates du repeater\n');
    
    const templates = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: repeater.id },
      select: {
        id: true,
        label: true,
        type: true,
        parentId: true
      }
    });
    
    console.log(`✅ Templates trouvés: ${templates.length}`);
    templates.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.label} (${t.type})`);
    });
    
    // ═══════════════════════════════════════════════════════════════════════
    // ÉTAPE 3: Trouver les instances du repeater (toit-1, toit-2, etc)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📍 ÉTAPE 3: Trouver les instances du repeater\n');
    
    const instances = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: repeater.id, label: { contains: '-1' } },
      select: {
        id: true,
        label: true,
        type: true,
        parentId: true
      }
    });
    
    console.log(`✅ Instances trouvées: ${instances.length}`);
    instances.forEach((inst, i) => {
      console.log(`   ${i + 1}. ${inst.label}`);
    });
    
    // ═══════════════════════════════════════════════════════════════════════
    // ÉTAPE 4: Analyser "Rampant toiture" (original vs -1)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📍 ÉTAPE 4: Analyser "Rampant toiture" et "Rampant toiture-1"\n');
    
    const rampantOrig = await prisma.treeBranchLeafNode.findFirst({
      where: { label: 'Rampant toiture' },
      include: {
        TreeBranchLeafNodeVariable: true
      }
    });
    
    const rampantCopy = await prisma.treeBranchLeafNode.findFirst({
      where: { label: 'Rampant toiture-1' },
      include: {
        TreeBranchLeafNodeVariable: true
      }
    });
    
    console.log('🔸 RAMPANT TOITURE (ORIGINAL):');
    if (rampantOrig) {
      console.log(`   ID: ${rampantOrig.id}`);
      console.log(`   Type: ${rampantOrig.fieldType}`);
      console.log(`   Has Variable: ${rampantOrig.TreeBranchLeafNodeVariable ? 'YES' : 'NO'}`);
      if (rampantOrig.TreeBranchLeafNodeVariable) {
        console.log(`   Variable exposedKey: ${rampantOrig.TreeBranchLeafNodeVariable.exposedKey}`);
        console.log(`   Variable sourceRef: ${rampantOrig.TreeBranchLeafNodeVariable.sourceRef}`);
      }
      console.log(`   number_decimals: ${rampantOrig.number_decimals}`);
      console.log(`   number_suffix: ${rampantOrig.number_suffix}`);
    } else {
      console.log('   ❌ NOT FOUND');
    }
    
    console.log('\n🔹 RAMPANT TOITURE-1 (COPIE):');
    if (rampantCopy) {
      console.log(`   ID: ${rampantCopy.id}`);
      console.log(`   Type: ${rampantCopy.fieldType}`);
      console.log(`   Has Variable: ${rampantCopy.TreeBranchLeafNodeVariable ? 'YES' : 'NO'}`);
      if (rampantCopy.TreeBranchLeafNodeVariable) {
        console.log(`   Variable exposedKey: ${rampantCopy.TreeBranchLeafNodeVariable.exposedKey}`);
        console.log(`   Variable sourceRef: ${rampantCopy.TreeBranchLeafNodeVariable.sourceRef}`);
      }
      console.log(`   number_decimals: ${rampantCopy.number_decimals}`);
      console.log(`   number_suffix: ${rampantCopy.number_suffix}`);
    } else {
      console.log('   ❌ NOT FOUND');
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ÉTAPE 5: Analyser "Orientation - inclinaison" (original vs -1)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📍 ÉTAPE 5: Analyser "Orientation - inclinaison"\n');
    
    const oriOrig = await prisma.treeBranchLeafNode.findFirst({
      where: { label: 'Orientation - inclinaison' },
      include: {
        TreeBranchLeafNodeVariable: true
      }
    });
    
    const oriCopy = await prisma.treeBranchLeafNode.findFirst({
      where: { label: 'Orientation - inclinaison-1' },
      include: {
        TreeBranchLeafNodeVariable: true
      }
    });
    
    console.log('🔸 ORIENTATION - INCLINAISON (ORIGINAL):');
    if (oriOrig) {
      console.log(`   ID: ${oriOrig.id}`);
      console.log(`   Type: ${oriOrig.fieldType}`);
      console.log(`   linkedVariableIds: ${JSON.stringify(oriOrig.linkedVariableIds)}`);
      console.log(`   Has Variable: ${oriOrig.TreeBranchLeafNodeVariable ? 'YES' : 'NO'}`);
      if (oriOrig.TreeBranchLeafNodeVariable) {
        console.log(`   Variable exposedKey: ${oriOrig.TreeBranchLeafNodeVariable.exposedKey}`);
        console.log(`   Variable sourceRef: ${oriOrig.TreeBranchLeafNodeVariable.sourceRef}`);
      }
    } else {
      console.log('   ❌ NOT FOUND');
    }
    
    console.log('\n🔹 ORIENTATION - INCLINAISON-1 (COPIE):');
    if (oriCopy) {
      console.log(`   ID: ${oriCopy.id}`);
      console.log(`   Type: ${oriCopy.fieldType}`);
      console.log(`   linkedVariableIds: ${JSON.stringify(oriCopy.linkedVariableIds)}`);
      console.log(`   Has Variable: ${oriCopy.TreeBranchLeafNodeVariable ? 'YES' : 'NO'}`);
      if (oriCopy.TreeBranchLeafNodeVariable) {
        console.log(`   Variable exposedKey: ${oriCopy.TreeBranchLeafNodeVariable.exposedKey}`);
        console.log(`   Variable sourceRef: ${oriCopy.TreeBranchLeafNodeVariable.sourceRef}`);
      }
    } else {
      console.log('   ⚠️ NOT FOUND - C\'est le problème!');
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ÉTAPE 6: Vérifier les données de soumission (values)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📍 ÉTAPE 6: Vérifier les valeurs dans la soumission\n');
    
    // Trouver une soumission récente
    const submission = await prisma.treeBranchLeafSubmission.findFirst({
      where: { treeId: repeater.treeId },
      include: {
        TreeBranchLeafSubmissionData: {
          where: {
            OR: [
              { fieldLabel: { contains: 'Rampant' } },
              { fieldLabel: { contains: 'Orientation' } }
            ]
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (submission && submission.TreeBranchLeafSubmissionData.length > 0) {
      console.log(`✅ Soumission trouvée: ${submission.id}`);
      console.log(`   Données de champs:`);
      submission.TreeBranchLeafSubmissionData.forEach(data => {
        console.log(`     - ${data.fieldLabel}`);
        console.log(`       nodeId: ${data.nodeId}`);
        console.log(`       value: ${data.value}`);
        console.log(`       isVariable: ${data.isVariable}`);
      });
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // RÉSUMÉ FINAL
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 RÉSUMÉ DU PROBLÈME:\n');
    
    const issues = [];
    
    if (!rampantCopy) {
      issues.push('❌ "Rampant toiture-1" NOT FOUND in database');
    } else if (!rampantCopy.TreeBranchLeafNodeVariable) {
      issues.push('❌ "Rampant toiture-1" n\'a PAS de variable');
    }
    
    if (!oriCopy) {
      issues.push('❌ "Orientation - inclinaison-1" NOT FOUND in database');
    } else if (!oriCopy.TreeBranchLeafNodeVariable) {
      issues.push('❌ "Orientation - inclinaison-1" n\'a PAS de variable');
    }
    
    if (issues.length === 0) {
      console.log('✅ Tous les champs et variables sont présents en DB');
      console.log('\n→ Le problème est peut-être dans l\'affichage/formatage');
    } else {
      console.log('Problèmes détectés:');
      issues.forEach(issue => console.log('  ' + issue));
      console.log('\n→ Les champs ou variables manquent lors de la copie');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeRepeaterCopyIssue();
