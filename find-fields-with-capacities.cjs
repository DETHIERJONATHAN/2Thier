const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findFieldsWithFormulasConditions() {
  console.log('🔍 RECHERCHE DES CHAMPS AVEC FORMULES/CONDITIONS');
  console.log('===============================================');
  
  // IDs des formules/conditions mentionnées dans les logs
  const targetIds = [
    'cb42c9a9-c6b4-49bb-bd55-74d763123bfb', // Probablement une formule
    'ff05cc48-27ec-4d94-8975-30a0f9c1c275', // Probablement une condition (on sait que c'est celle du modèle)
    '7097ff9b-974a-4fb3-80d8-49634a634efc'  // Probablement une formule
  ];
  
  console.log('IDs à rechercher:', targetIds);
  
  // 1. Chercher dans les formules
  console.log('\n🧮 RECHERCHE DANS TreeBranchLeafNodeFormula:');
  for (const id of targetIds) {
    const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id }
    });
    
    if (formula) {
      console.log(`✅ Formule trouvée: ${id}`);
      console.log(`  - nodeId: ${formula.nodeId}`);
      console.log(`  - name: ${formula.name}`);
      console.log(`  - tokens: ${JSON.stringify(formula.tokens)}`);
      
      // Trouver le node associé
      const node = await prisma.treeBranchLeafNode.findUnique({
        where: { id: formula.nodeId },
        include: {
          TreeBranchLeafNodeVariable: true
        }
      });
      
      if (node) {
        console.log(`  📊 Node associé: ${node.id} - "${node.label}"`);
        console.log(`    - tbl_capacity: ${node.tbl_capacity}`);
        console.log(`    - tbl_type: ${node.tbl_type}`);
        
        if (node.TreeBranchLeafNodeVariable) {
          console.log(`    - Variable.sourceRef: "${node.TreeBranchLeafNodeVariable.sourceRef}"`);
        } else {
          console.log(`    - ❌ PAS DE VARIABLE`);
        }
      }
    } else {
      console.log(`❌ Pas de formule avec l'ID: ${id}`);
    }
  }
  
  // 2. Chercher dans les conditions
  console.log('\n🔀 RECHERCHE DANS TreeBranchLeafNodeCondition:');
  for (const id of targetIds) {
    const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id }
    });
    
    if (condition) {
      console.log(`✅ Condition trouvée: ${id}`);
      console.log(`  - nodeId: ${condition.nodeId}`);
      console.log(`  - name: ${condition.name}`);
      
      // Trouver le node associé
      const node = await prisma.treeBranchLeafNode.findUnique({
        where: { id: condition.nodeId },
        include: {
          TreeBranchLeafNodeVariable: true
        }
      });
      
      if (node) {
        console.log(`  📊 Node associé: ${node.id} - "${node.label}"`);
        console.log(`    - tbl_capacity: ${node.tbl_capacity}`);
        console.log(`    - tbl_type: ${node.tbl_type}`);
        
        if (node.TreeBranchLeafNodeVariable) {
          console.log(`    - Variable.sourceRef: "${node.TreeBranchLeafNodeVariable.sourceRef}"`);
        } else {
          console.log(`    - ❌ PAS DE VARIABLE`);
        }
      }
    } else {
      console.log(`❌ Pas de condition avec l'ID: ${id}`);
    }
  }
  
  // 3. Chercher directement dans les variables par sourceRef
  console.log('\n📝 RECHERCHE PAR sourceRef DANS TreeBranchLeafNodeVariable:');
  for (const id of targetIds) {
    // Chercher formula:id
    const varByFormula = await prisma.treeBranchLeafNodeVariable.findFirst({
      where: { sourceRef: `formula:${id}` },
      include: {
        TreeBranchLeafNode: true
      }
    });
    
    if (varByFormula) {
      console.log(`✅ Variable trouvée avec sourceRef formula:${id}`);
      console.log(`  - Variable ID: ${varByFormula.id}`);
      console.log(`  - nodeId: ${varByFormula.nodeId}`);
      console.log(`  - Node: ${varByFormula.TreeBranchLeafNode?.label}`);
    }
    
    // Chercher condition:id
    const varByCondition = await prisma.treeBranchLeafNodeVariable.findFirst({
      where: { sourceRef: `condition:${id}` },
      include: {
        TreeBranchLeafNode: true
      }
    });
    
    if (varByCondition) {
      console.log(`✅ Variable trouvée avec sourceRef condition:${id}`);
      console.log(`  - Variable ID: ${varByCondition.id}`);
      console.log(`  - nodeId: ${varByCondition.nodeId}`);
      console.log(`  - Node: ${varByCondition.TreeBranchLeafNode?.label}`);
    }
  }
  
  // 4. Lister TOUS les champs avec formules ou conditions pour comparaison
  console.log('\n📊 TOUS LES CHAMPS AVEC CAPACITÉS:');
  const allNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { tbl_capacity: { not: null } },
        { TreeBranchLeafNodeVariable: { sourceRef: { startsWith: 'formula:' } } },
        { TreeBranchLeafNodeVariable: { sourceRef: { startsWith: 'condition:' } } }
      ]
    },
    include: {
      TreeBranchLeafNodeVariable: true,
      TreeBranchLeafNodeFormula: true,
      TreeBranchLeafNodeCondition: true
    }
  });
  
  console.log(`Trouvé ${allNodes.length} champs avec capacités:`);
  for (const node of allNodes) {
    console.log(`\n📊 ${node.id} - "${node.label}"`);
    console.log(`  - tbl_capacity: ${node.tbl_capacity}`);
    console.log(`  - tbl_type: ${node.tbl_type}`);
    
    if (node.TreeBranchLeafNodeVariable) {
      console.log(`  - Variable.sourceRef: "${node.TreeBranchLeafNodeVariable.sourceRef}"`);
    }
    
    if (node.TreeBranchLeafNodeFormula?.length > 0) {
      console.log(`  - Formules: ${node.TreeBranchLeafNodeFormula.map(f => f.id).join(', ')}`);
    }
    
    if (node.TreeBranchLeafNodeCondition?.length > 0) {
      console.log(`  - Conditions: ${node.TreeBranchLeafNodeCondition.map(c => c.id).join(', ')}`);
    }
  }
  
  await prisma.$disconnect();
}

findFieldsWithFormulasConditions().catch(console.error);