const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 RECHERCHE DES CHAMPS AVEC OPTIONS/SOUS-CHAMPS\n');
    
    // 1. Chercher tous les nodes qui ont des enfants (parentId)
    console.log('1️⃣ NODES AVEC ENFANTS:');
    const nodesWithChildren = await prisma.treeBranchLeafNode.findMany({
      where: {
        parentId: { not: null }
      },
      select: {
        id: true,
        label: true,
        type: true,
        parentId: true,
        properties: true
      },
      take: 10
    });
    
    console.log(`   📊 ${nodesWithChildren.length} nodes enfants trouvés:`);
    nodesWithChildren.forEach((node, i) => {
      console.log(`   ${i + 1}. ${node.label} (${node.type})`);
      console.log(`      ID: ${node.id}`);
      console.log(`      ParentID: ${node.parentId}`);
      if (node.properties) {
        console.log(`      Properties: ${JSON.stringify(node.properties, null, 2)}`);
      }
      console.log('');
    });
    
    // 2. Chercher les nodes qui sont parents
    console.log('2️⃣ NODES PARENTS (avec enfants):');
    const parentIds = [...new Set(nodesWithChildren.map(n => n.parentId))];
    
    if (parentIds.length > 0) {
      const parentNodes = await prisma.treeBranchLeafNode.findMany({
        where: {
          id: { in: parentIds }
        },
        select: {
          id: true,
          label: true,
          type: true,
          properties: true,
          config: true
        }
      });
      
      console.log(`   👨‍👧‍👦 ${parentNodes.length} nodes parents trouvés:`);
      parentNodes.forEach((parent, i) => {
        console.log(`   ${i + 1}. PARENT: ${parent.label} (${parent.type})`);
        console.log(`      ID: ${parent.id}`);
        
        if (parent.properties) {
          console.log(`      Properties: ${JSON.stringify(parent.properties, null, 2)}`);
        }
        
        if (parent.config) {
          console.log(`      Config: ${JSON.stringify(parent.config, null, 2)}`);
        }
        
        // Trouver ses enfants
        const children = nodesWithChildren.filter(child => child.parentId === parent.id);
        console.log(`      👶 ${children.length} enfants:`);
        children.forEach((child, j) => {
          console.log(`         ${j + 1}. ${child.label} (${child.type}) - ID: ${child.id}`);
        });
        console.log('');
      });
    }
    
    // 3. Chercher les nodes avec des propriétés complexes
    console.log('3️⃣ NODES AVEC PROPRIÉTÉS COMPLEXES:');
    const nodesWithProperties = await prisma.treeBranchLeafNode.findMany({
      where: {
        properties: { not: null }
      },
      select: {
        id: true,
        label: true,
        type: true,
        properties: true
      },
      take: 10
    });
    
    console.log(`   ⚙️ ${nodesWithProperties.length} nodes avec propriétés:`);
    nodesWithProperties.forEach((node, i) => {
      console.log(`   ${i + 1}. ${node.label} (${node.type})`);
      console.log(`      ID: ${node.id}`);
      console.log(`      Properties: ${JSON.stringify(node.properties, null, 2)}`);
      console.log('');
    });
    
    // 4. Chercher le node spécifique dans les données de soumission
    console.log('4️⃣ RECHERCHE DANS LES DONNÉES DE SOUMISSION:');
    const nodeId = '02496ef8-873d-4f14-a8dc-ee2200bf591b';
    
    const submissionData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { 
        OR: [
          { nodeId: nodeId },
          { nodeId: { contains: '02496ef8' } }
        ]
      },
      select: {
        id: true,
        nodeId: true,
        submissionId: true,
        value: true,
        TreeBranchLeafNode: {
          select: {
            label: true,
            type: true,
            properties: true
          }
        }
      }
    });
    
    console.log(`   🔍 ${submissionData.length} données trouvées:`);
    submissionData.forEach((data, i) => {
      console.log(`   ${i + 1}. NodeId: ${data.nodeId}`);
      console.log(`      Value: ${data.value}`);
      if (data.TreeBranchLeafNode) {
        console.log(`      Label: ${data.TreeBranchLeafNode.label}`);
        console.log(`      Type: ${data.TreeBranchLeafNode.type}`);
        if (data.TreeBranchLeafNode.properties) {
          console.log(`      Properties: ${JSON.stringify(data.TreeBranchLeafNode.properties, null, 2)}`);
        }
      }
      console.log('');
    });
    
    // 5. Recherche dans les conditions qui mentionnent ce node
    console.log('5️⃣ RECHERCHE DANS LES CONDITIONS:');
    const conditionsWithNode = await prisma.treeBranchLeafNodeCondition.findMany({
      where: {
        conditionSet: {
          string_contains: '02496ef8'
        }
      },
      select: {
        id: true,
        name: true,
        conditionSet: true
      }
    });
    
    console.log(`   🔀 ${conditionsWithNode.length} conditions trouvées:`);
    conditionsWithNode.forEach((condition, i) => {
      console.log(`   ${i + 1}. Name: ${condition.name}`);
      console.log(`      ID: ${condition.id}`);
      console.log(`      ConditionSet: ${JSON.stringify(condition.conditionSet, null, 2)}`);
      console.log('');
    });
    
    console.log('🎯 RECHERCHE TERMINÉE - Analysons ce qui a été trouvé !');
    
  } catch(e) {
    console.log('Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();