const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnostiquerSuppressionFormule() {
  console.log('🔍 Diagnostic du système de suppression des formules...\n');

  try {
    // 1. Vérifier les formules existantes
    console.log('📋 État actuel des formules :');
    const formules = await prisma.treeBranchLeafNodeFormula.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Total formules : ${formules.length}`);
    
    if (formules.length > 0) {
      formules.forEach((formule, index) => {
        console.log(`  ${index + 1}. ${formule.name} (ID: ${formule.id.substring(0, 8)}...)`);
        console.log(`     Node: ${formule.nodeId}`);
        console.log(`     Tokens: ${formule.tokens.length} éléments`);
        console.log(`     Créée: ${formule.createdAt.toLocaleString()}`);
        console.log('');
      });
    }

    // 2. Vérifier les nœuds avec hasFormula
    console.log('🔍 Nœuds avec hasFormula = true :');
    const noeudsAvecFormules = await prisma.treeBranchLeafNode.findMany({
      where: { hasFormula: true },
      select: {
        id: true,
        label: true,
        hasFormula: true
      }
    });

    console.log(`Total nœuds avec hasFormula: ${noeudsAvecFormules.length}`);
    noeudsAvecFormules.forEach((noeud, index) => {
      console.log(`  ${index + 1}. ${noeud.label} (${noeud.id})`);
    });

    // 3. Synchronisation : vérifier la cohérence
    console.log('\n🔄 Vérification de la cohérence...');
    
    for (const noeud of noeudsAvecFormules) {
      const formulesDeceNoeud = formules.filter(f => f.nodeId === noeud.id);
      console.log(`Nœud "${noeud.label}": ${formulesDeceNoeud.length} formule(s)`);
      
      if (formulesDeceNoeud.length === 0) {
        console.log(`  ⚠️ INCOHÉRENCE: hasFormula=true mais aucune formule trouvée`);
        console.log(`  🔧 Correction: Mise à jour hasFormula à false`);
        
        await prisma.treeBranchLeafNode.update({
          where: { id: noeud.id },
          data: { hasFormula: false }
        });
        console.log(`  ✅ Corrigé`);
      }
    }

    // 4. Vérification inverse : formules sans hasFormula
    for (const formule of formules) {
      const noeud = await prisma.treeBranchLeafNode.findUnique({
        where: { id: formule.nodeId },
        select: { id: true, label: true, hasFormula: true }
      });
      
      if (noeud && !noeud.hasFormula) {
        console.log(`  ⚠️ INCOHÉRENCE: Formule "${formule.name}" existe mais hasFormula=false`);
        console.log(`  🔧 Correction: Mise à jour hasFormula à true`);
        
        await prisma.treeBranchLeafNode.update({
          where: { id: formule.nodeId },
          data: { hasFormula: true }
        });
        console.log(`  ✅ Corrigé`);
      }
    }

    console.log('\n📊 Résumé final :');
    const formulesFinales = await prisma.treeBranchLeafNodeFormula.count();
    const noeudsAvecFormulesFinaux = await prisma.treeBranchLeafNode.count({
      where: { hasFormula: true }
    });
    
    console.log(`- Formules totales : ${formulesFinales}`);
    console.log(`- Nœuds avec hasFormula=true : ${noeudsAvecFormulesFinaux}`);

    if (formulesFinales === 0) {
      console.log('\n🎯 SOLUTION pour la suppression :');
      console.log('Si aucune formule n\'existe mais que vous ne pouvez pas en supprimer,');
      console.log('le problème vient de l\'interface utilisateur (Modal.confirm).');
      console.log('\nActions recommandées :');
      console.log('1. Rafraîchir la page (F5)');
      console.log('2. Vider le cache du navigateur');
      console.log('3. Redémarrer le serveur de développement');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnostiquerSuppressionFormule();
