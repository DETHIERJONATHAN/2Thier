const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 🔍 DIAGNOSTIC: Vérifier pourquoi la variable copiée ne fonctionne pas
 * 
 * IDs à analyser:
 * - Variable copiée: bda51415-1530-4f97-8b5b-2c22a51a2e43-1
 * - Condition copiée: cond_6817ee20-5782-4b03-a7b1-0687cc5b4d58-1
 * - Shared-ref: shared-ref-1761920196832-4f6a2-1
 * - Condition fallback: b0e9def0-ab4d-4e28-9cba-1c0632bf646e-1
 */

async function main() {
  try {
    console.log('🔍 DIAGNOSTIC: VARIABLE COPIÉE NON FONCTIONNELLE\n');
    console.log('═'.repeat(80));
    
    // ═══════════════════════════════════════════════════════════════════════
    // 1️⃣ ANALYSER LA VARIABLE COPIÉE
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n1️⃣ ANALYSE DE LA VARIABLE COPIÉE:\n');
    
    const copiedVarId = 'bda51415-1530-4f97-8b5b-2c22a51a2e43-1';
    const copiedVar = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: copiedVarId }
    });
    
    if (copiedVar) {
      console.log('✅ Variable copiée trouvée:');
      console.log(`   ID: ${copiedVar.id}`);
      console.log(`   nodeId: ${copiedVar.nodeId}`);
      console.log(`   displayName: ${copiedVar.displayName}`);
      console.log(`   sourceRef: ${copiedVar.sourceRef}`);
      console.log(`   exposedKey: ${copiedVar.exposedKey}`);
    } else {
      console.log('❌ Variable copiée NON TROUVÉE:', copiedVarId);
    }
    
    // Vérifier la variable originale (sans suffixe)
    const originalVarId = 'bda51415-1530-4f97-8b5b-2c22a51a2e43';
    const originalVar = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: originalVarId }
    });
    
    if (originalVar) {
      console.log('\n📋 Variable ORIGINALE (pour comparaison):');
      console.log(`   ID: ${originalVar.id}`);
      console.log(`   nodeId: ${originalVar.nodeId}`);
      console.log(`   displayName: ${originalVar.displayName}`);
      console.log(`   sourceRef: ${originalVar.sourceRef}`);
      console.log(`   exposedKey: ${originalVar.exposedKey}`);
    } else {
      console.log('\n⚠️ Variable originale non trouvée (normal si première génération)');
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 2️⃣ ANALYSER LA CONDITION COPIÉE
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(80));
    console.log('\n2️⃣ ANALYSE DE LA CONDITION COPIÉE:\n');
    
    const copiedCondId = 'cond_6817ee20-5782-4b03-a7b1-0687cc5b4d58-1';
    const copiedCond = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: copiedCondId }
    });
    
    if (copiedCond) {
      console.log('✅ Condition copiée trouvée:');
      console.log(`   ID: ${copiedCond.id}`);
      console.log(`   nodeId: ${copiedCond.nodeId}`);
      console.log(`   name: ${copiedCond.name}`);
      console.log(`\n📦 conditionSet:`);
      console.log(JSON.stringify(copiedCond.conditionSet, null, 2));
    } else {
      console.log('❌ Condition copiée NON TROUVÉE:', copiedCondId);
    }
    
    // Chercher la condition originale (sans suffixe)
    const originalCondId = 'cond_6817ee20-5782-4b03-a7b1-0687cc5b4d58';
    const originalCond = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: originalCondId }
    });
    
    if (originalCond) {
      console.log('\n📋 Condition ORIGINALE (pour comparaison):');
      console.log(`   ID: ${originalCond.id}`);
      console.log(`   nodeId: ${originalCond.nodeId}`);
      console.log(`   name: ${originalCond.name}`);
      console.log(`\n📦 conditionSet:`);
      console.log(JSON.stringify(originalCond.conditionSet, null, 2));
    } else {
      console.log('\n⚠️ Condition originale non trouvée');
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 3️⃣ ANALYSER LE SHARED-REF
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(80));
    console.log('\n3️⃣ ANALYSE DU SHARED-REF:\n');
    
    const sharedRefId = 'shared-ref-1761920196832-4f6a2-1';
    
    // Chercher dans les nodes
    const sharedRefNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: sharedRefId }
    });
    
    if (sharedRefNode) {
      console.log('✅ Nœud shared-ref trouvé:');
      console.log(`   ID: ${sharedRefNode.id}`);
      console.log(`   label: ${sharedRefNode.label}`);
      console.log(`   type: ${sharedRefNode.type}`);
      console.log(`   parentId: ${sharedRefNode.parentId}`);
    } else {
      console.log('❌ Nœud shared-ref NON TROUVÉ:', sharedRefId);
    }
    
    // Chercher dans les variables
    const sharedRefVar = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: sharedRefId }
    });
    
    if (sharedRefVar) {
      console.log('\n✅ Variable shared-ref trouvée:');
      console.log(`   ID: ${sharedRefVar.id}`);
      console.log(`   nodeId: ${sharedRefVar.nodeId}`);
      console.log(`   displayName: ${sharedRefVar.displayName}`);
      console.log(`   sourceRef: ${sharedRefVar.sourceRef}`);
    } else {
      console.log('\n❌ Variable shared-ref NON TROUVÉE');
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 4️⃣ ANALYSER LA CONDITION DE FALLBACK
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(80));
    console.log('\n4️⃣ ANALYSE DE LA CONDITION FALLBACK:\n');
    
    const fallbackCondId = 'b0e9def0-ab4d-4e28-9cba-1c0632bf646e-1';
    const fallbackCond = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: fallbackCondId }
    });
    
    if (fallbackCond) {
      console.log('✅ Condition fallback trouvée:');
      console.log(`   ID: ${fallbackCond.id}`);
      console.log(`   nodeId: ${fallbackCond.nodeId}`);
      console.log(`   name: ${fallbackCond.name}`);
    } else {
      console.log('❌ Condition fallback NON TROUVÉE:', fallbackCondId);
      
      // Essayer sans suffixe
      const fallbackCondIdNoSuffix = 'b0e9def0-ab4d-4e28-9cba-1c0632bf646e';
      const fallbackCondNoSuffix = await prisma.treeBranchLeafNodeCondition.findUnique({
        where: { id: fallbackCondIdNoSuffix }
      });
      
      if (fallbackCondNoSuffix) {
        console.log(`\n⚠️ Trouvée SANS suffixe: ${fallbackCondIdNoSuffix}`);
        console.log('   → PROBLÈME: La condition référencée a un suffixe -1 mais n\'existe pas!');
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 5️⃣ DIAGNOSTIC COMPLET
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(80));
    console.log('\n🔍 DIAGNOSTIC COMPLET:\n');
    
    const issues = [];
    
    if (!copiedVar) {
      issues.push('❌ Variable copiée introuvable');
    }
    
    if (!copiedCond) {
      issues.push('❌ Condition copiée introuvable');
    } else {
      const conditionSet = copiedCond.conditionSet;
      if (conditionSet) {
        const conditionSetStr = JSON.stringify(conditionSet);
        
        // Vérifier les références
        if (conditionSetStr.includes('shared-ref-1761920196832-4f6a2-1')) {
          if (!sharedRefNode && !sharedRefVar) {
            issues.push('❌ Référence shared-ref-1761920196832-4f6a2-1 inexistante');
          }
        }
        
        if (conditionSetStr.includes('b0e9def0-ab4d-4e28-9cba-1c0632bf646e-1')) {
          if (!fallbackCond) {
            issues.push('❌ Condition fallback b0e9def0-ab4d-4e28-9cba-1c0632bf646e-1 inexistante');
            issues.push('   → Les références dans le conditionSet doivent pointer vers des IDs existants');
          }
        }
      }
    }
    
    if (issues.length === 0) {
      console.log('✅ Aucun problème détecté au niveau des IDs et références');
      console.log('\n💡 Le problème peut venir de:');
      console.log('   - La logique d\'évaluation de la condition');
      console.log('   - Le contexte d\'exécution (valeurs des champs)');
      console.log('   - La propagation des suffixes dans les IDs imbriqués');
    } else {
      console.log('🚨 PROBLÈMES DÉTECTÉS:\n');
      issues.forEach((issue, idx) => {
        console.log(`${idx + 1}. ${issue}`);
      });
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 6️⃣ RECOMMANDATIONS
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(80));
    console.log('\n💡 RECOMMANDATIONS:\n');
    
    const fallbackCondIdNoSuffix = 'b0e9def0-ab4d-4e28-9cba-1c0632bf646e';
    if (!fallbackCond) {
      console.log('1. Vérifier que TOUTES les conditions référencées sont copiées avec le bon suffixe');
      console.log('   → Chercher: ' + fallbackCondIdNoSuffix);
      console.log('   → Doit être copié en: ' + fallbackCondIdNoSuffix + '-1\n');
    }
    
    if (!sharedRefNode && !sharedRefVar) {
      console.log('2. Vérifier que le nœud/variable shared-ref est copié correctement');
      console.log('   → ID attendu: shared-ref-1761920196832-4f6a2-1');
      console.log('   → Type: Probablement un nœud d\'affichage ou une variable\n');
    }
    
    console.log('3. Vérifier le processus de copie dans copy-capacity-condition.ts');
    console.log('   → S\'assurer que TOUS les IDs imbriqués sont suffixés');
    console.log('   → Y compris les IDs dans les branches et les actions\n');
    
    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ Diagnostic terminé!');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
