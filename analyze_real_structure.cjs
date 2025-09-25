const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 ANALYSE DES CHAMPS AVEC VRAIE STRUCTURE\n');
    
    // 1. Chercher des champs select avec options
    console.log('1️⃣ CHAMPS SELECT AVEC OPTIONS:');
    const selectFields = await prisma.treeBranchLeafNode.findMany({
      where: {
        fieldType: 'select'
      },
      select: {
        id: true,
        label: true,
        fieldType: true,
        select_options: true,
        select_defaultValue: true
      },
      take: 10
    });
    
    console.log(`   📋 ${selectFields.length} champs select trouvés:`);
    selectFields.forEach((field, i) => {
      console.log(`   ${i + 1}. ${field.label}`);
      console.log(`      ID: ${field.id}`);
      console.log(`      Options: ${JSON.stringify(field.select_options, null, 2)}`);
      console.log(`      DefaultValue: ${field.select_defaultValue}`);
      console.log('');
    });
    
    // 2. Chercher les champs qui ont des conditions
    console.log('2️⃣ CHAMPS AVEC CONDITIONS:');
    const fieldsWithConditions = await prisma.treeBranchLeafNode.findMany({
      where: {
        hasCondition: true
      },
      select: {
        id: true,
        label: true,
        fieldType: true,
        condition_mode: true,
        condition_branches: true
      },
      take: 10
    });
    
    console.log(`   🔀 ${fieldsWithConditions.length} champs avec conditions:`);
    fieldsWithConditions.forEach((field, i) => {
      console.log(`   ${i + 1}. ${field.label}`);
      console.log(`      ID: ${field.id}`);
      console.log(`      FieldType: ${field.fieldType}`);
      console.log(`      Condition Mode: ${field.condition_mode}`);
      console.log(`      Branches: ${JSON.stringify(field.condition_branches, null, 2)}`);
      console.log('');
    });
    
    // 3. Chercher le node spécifique ou similaire
    console.log('3️⃣ RECHERCHE NODE SPÉCIFIQUE:');
    const nodeId = '02496ef8-873d-4f14-a8dc-ee2200bf591b';
    
    // Recherche par ID partiel
    const similarNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        id: { contains: '02496ef8' }
      },
      select: {
        id: true,
        label: true,
        fieldType: true,
        select_options: true,
        hasCondition: true,
        condition_branches: true
      }
    });
    
    if (similarNodes.length === 0) {
      // Recherche dans toute la base
      console.log('   🔍 Recherche élargie...');
      const allSelectFields = await prisma.treeBranchLeafNode.findMany({
        where: {
          OR: [
            { fieldType: 'select' },
            { hasCondition: true },
            { label: { contains: 'prix' } },
            { label: { contains: 'calcul' } }
          ]
        },
        select: {
          id: true,
          label: true,
          fieldType: true,
          select_options: true,
          hasCondition: true,
          condition_branches: true
        },
        take: 15
      });
      
      console.log(`   📊 ${allSelectFields.length} champs pertinents trouvés:`);
      allSelectFields.forEach((field, i) => {
        console.log(`   ${i + 1}. ${field.label} (${field.fieldType})`);
        console.log(`      ID: ${field.id}`);
        
        if (field.select_options) {
          console.log(`      📋 Options: ${JSON.stringify(field.select_options, null, 2)}`);
        }
        
        if (field.hasCondition && field.condition_branches) {
          console.log(`      🔀 Condition branches: ${JSON.stringify(field.condition_branches, null, 2)}`);
        }
        console.log('');
      });
    } else {
      console.log(`   ✅ ${similarNodes.length} nodes trouvés:`);
      similarNodes.forEach((node, i) => {
        console.log(`   ${i + 1}. ${node.label}`);
        console.log(`      ID: ${node.id}`);
        console.log(`      Type: ${node.fieldType}`);
        
        if (node.select_options) {
          console.log(`      📋 Options: ${JSON.stringify(node.select_options, null, 2)}`);
        }
        
        if (node.hasCondition && node.condition_branches) {
          console.log(`      🔀 Condition: ${JSON.stringify(node.condition_branches, null, 2)}`);
        }
        console.log('');
      });
    }
    
    // 4. Chercher les données de soumission avec options
    console.log('4️⃣ DONNÉES DE SOUMISSION AVEC OPTIONS:');
    const submissionWithOptions = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        TreeBranchLeafNode: {
          fieldType: 'select'
        }
      },
      select: {
        id: true,
        nodeId: true,
        value: true,
        TreeBranchLeafNode: {
          select: {
            label: true,
            select_options: true
          }
        }
      },
      take: 10
    });
    
    console.log(`   📊 ${submissionWithOptions.length} soumissions avec options:`);
    submissionWithOptions.forEach((data, i) => {
      console.log(`   ${i + 1}. ${data.TreeBranchLeafNode.label}`);
      console.log(`      NodeID: ${data.nodeId}`);
      console.log(`      Valeur sélectionnée: ${data.value}`);
      console.log(`      Options disponibles: ${JSON.stringify(data.TreeBranchLeafNode.select_options, null, 2)}`);
      console.log('');
    });
    
    console.log('🎯 VOICI CE QUE JE VOIS RÉELLEMENT !');
    
  } catch(e) {
    console.log('Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();