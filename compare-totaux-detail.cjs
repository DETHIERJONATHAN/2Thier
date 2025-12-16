const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deepCompare() {
  const panneauxTotalId = '3da47bc3-739e-4c83-98c3-813ecf77a740-sum-total';
  const toitureTotalId = '0cac5b10-ea6e-45a4-a24a-a5a4ab6a04e0-sum-total';
  const murTotalId = 'f40b31f0-9cba-4110-a2a6-37df8c986661-sum-total';
  
  console.log('\n========== COMPARAISON DÉTAILLÉE DES TOTAUX ==========\n');
  
  // Récupérer les 3 nœuds avec TOUS les champs
  const [panneaux, toiture, mur] = await Promise.all([
    prisma.treeBranchLeafNode.findUnique({ where: { id: panneauxTotalId } }),
    prisma.treeBranchLeafNode.findUnique({ where: { id: toitureTotalId } }),
    prisma.treeBranchLeafNode.findUnique({ where: { id: murTotalId } })
  ]);
  
  console.log('🔍 CHAMPS CLÉS COMPARÉS:\n');
  
  const nodes = [
    { name: 'Panneaux max - Total ❌', node: panneaux },
    { name: 'M² toiture - Total ✅', node: toiture },
    { name: 'Mur - Total ✅', node: mur }
  ];
  
  const fieldsToCompare = [
    'type', 'hasData', 'hasFormula', 
    'data_visibleToUser', 'data_activeId',
    'formula_activeId', 'calculatedValue',
    'linkedFieldIds', 'linkedFormulaIds'
  ];
  
  for (const field of fieldsToCompare) {
    console.log(`\n📌 ${field}:`);
    for (const { name, node } of nodes) {
      const value = node?.[field];
      console.log(`  ${name}: ${JSON.stringify(value)}`);
    }
  }
  
  // Vérifier les variables
  console.log('\n\n========== VARIABLES COMPARÉES ==========\n');
  const [varPanneaux, varToiture, varMur] = await Promise.all([
    prisma.treeBranchLeafNodeVariable.findUnique({ where: { nodeId: panneauxTotalId } }),
    prisma.treeBranchLeafNodeVariable.findUnique({ where: { nodeId: toitureTotalId } }),
    prisma.treeBranchLeafNodeVariable.findUnique({ where: { nodeId: murTotalId } })
  ]);
  
  const vars = [
    { name: 'Panneaux max - Total ❌', v: varPanneaux },
    { name: 'M² toiture - Total ✅', v: varToiture },
    { name: 'Mur - Total ✅', v: varMur }
  ];
  
  const varFieldsToCompare = [
    'id', 'displayFormat', 'sourceType', 'sourceRef', 'visibleToUser', 'value'
  ];
  
  for (const field of varFieldsToCompare) {
    console.log(`\n📌 Variable.${field}:`);
    for (const { name, v } of vars) {
      const value = v?.[field];
      console.log(`  ${name}: ${JSON.stringify(value)}`);
    }
  }
  
  // Vérifier les formules
  console.log('\n\n========== FORMULES COMPARÉES ==========\n');
  const [formPanneaux, formToiture, formMur] = await Promise.all([
    prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: panneaux?.formula_activeId } }),
    prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: toiture?.formula_activeId } }),
    prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: mur?.formula_activeId } })
  ]);
  
  const forms = [
    { name: 'Panneaux max - Total ❌', f: formPanneaux },
    { name: 'M² toiture - Total ✅', f: formToiture },
    { name: 'Mur - Total ✅', f: formMur }
  ];
  
  const formFieldsToCompare = ['id', 'tokens', 'result', 'calculatedValue'];
  
  for (const field of formFieldsToCompare) {
    console.log(`\n📌 Formula.${field}:`);
    for (const { name, f } of forms) {
      const value = f?.[field];
      console.log(`  ${name}: ${JSON.stringify(value)}`);
    }
  }
  
  // Vérifier le parent et la section
  console.log('\n\n========== PARENT/SECTION ==========\n');
  for (const { name, node } of nodes) {
    console.log(`${name}:`);
    console.log(`  parentId: ${node?.parentId}`);
    console.log(`  sectionId: ${node?.sectionId}`);
    console.log(`  tblId: ${node?.tblId}`);
    console.log(`  ordering: ${node?.ordering}`);
  }
  
  await prisma.$disconnect();
}

deepCompare().catch(e => { console.error(e); process.exit(1); });
