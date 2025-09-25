const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findHowWorkingFieldGetsData() {
  console.log('🔍 COMMENT LE CHAMP QUI FONCTIONNE RÉCUPÈRE LES DONNÉES');
  console.log('=====================================================');
  
  // Le champ qui fonctionne
  const workingFieldId = '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e';
  // Le champ de données qu'ils cherchent tous les deux
  const dataFieldId = 'node_1757366229534_x6jxzmvmu'; // Consommation annuelle électricité
  
  try {
    // 1. Analyser le champ qui fonctionne
    console.log('🟢 CHAMP QUI FONCTIONNE:');
    const workingNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: workingFieldId },
      include: {
        TreeBranchLeafNodeVariable: true,
        TreeBranchLeafNodeCondition: true
      }
    });
    
    console.log(`- Label: "${workingNode.label}"`);
    console.log(`- Variable sourceRef: "${workingNode.TreeBranchLeafNodeVariable.sourceRef}"`);
    
    // 2. Trouver la condition du champ qui fonctionne
    const conditionId = workingNode.TreeBranchLeafNodeVariable.sourceRef.replace('condition:', '');
    const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: conditionId }
    });
    
    // 3. Trouver la formule dans le fallback de cette condition
    const fallback = condition.conditionSet.fallback;
    let formulaIdInFallback = null;
    
    fallback.actions.forEach(action => {
      action.nodeIds.forEach(nodeId => {
        if (nodeId.startsWith('node-formula:')) {
          formulaIdInFallback = nodeId.replace('node-formula:', '');
        }
      });
    });
    
    console.log(`- Utilise la formule: ${formulaIdInFallback}`);
    
    // 4. Analyser cette formule
    const workingFormula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: formulaIdInFallback }
    });
    
    console.log('\n🧮 FORMULE QUI FONCTIONNE:');
    console.log(`- ID: ${workingFormula.id}`);
    console.log(`- Tokens: ${JSON.stringify(workingFormula.tokens)}`);
    
    // 5. Analyser le champ de données
    console.log('\n📊 CHAMP DE DONNÉES COMMUN:');
    const dataField = await prisma.treeBranchLeafNode.findUnique({
      where: { id: dataFieldId },
      include: {
        TreeBranchLeafNodeVariable: true
      }
    });
    
    console.log(`- ID: ${dataField.id}`);
    console.log(`- Label: "${dataField.label}"`);
    console.log(`- tbl_capacity: ${dataField.tbl_capacity}`);
    console.log(`- tbl_type: ${dataField.tbl_type}`);
    console.log(`- tbl_code: ${dataField.tbl_code}`);
    
    if (dataField.TreeBranchLeafNodeVariable) {
      const dataVar = dataField.TreeBranchLeafNodeVariable;
      console.log(`- Variable exposedKey: "${dataVar.exposedKey}"`);
      console.log(`- Variable sourceRef: "${dataVar.sourceRef}"`);
      console.log(`- Variable sourceType: "${dataVar.sourceType}"`);
    } else {
      console.log('❌ PAS DE VARIABLE !');
    }
    
    // 6. Comparer avec la formule qui ne fonctionne pas
    console.log('\n❌ FORMULE QUI NE FONCTIONNE PAS:');
    const problematicFormulaId = '5843ef67-458d-4659-91dd-6232de435aa4';
    const problematicFormula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: problematicFormulaId }
    });
    
    console.log(`- ID: ${problematicFormula.id}`);
    console.log(`- Tokens: ${JSON.stringify(problematicFormula.tokens)}`);
    
    // 7. DIAGNOSTIC
    console.log('\n🎯 DIAGNOSTIC:');
    console.log('Toutes les formules cherchent le même champ:');
    console.log(`  @value.${dataFieldId}`);
    
    console.log('\nSi le champ qui fonctionne arrive à le trouver,');
    console.log('mais pas l\'autre, le problème est dans:');
    console.log('1. Le processus de résolution des formules');
    console.log('2. Le timing de l\'évaluation');
    console.log('3. Le contexte d\'évaluation');
    console.log('4. La façon dont les mirrors sont créés');
    
    console.log('\n💡 HYPOTHÈSE:');
    console.log('Le système peut résoudre les formules dans les conditions');
    console.log('mais a un problème avec les formules directes dans sourceRef');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findHowWorkingFieldGetsData().catch(console.error);