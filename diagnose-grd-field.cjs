const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseGRDField() {
  console.log('🔍 ========== DIAGNOSTIC COMPLET CHAMP GRD ==========\n');
  
  const tableId = '27010b5e-4da1-45a0-b9c8-37d8d2643417';
  
  // 1. Trouver le node GRD
  console.log('📊 1. RECHERCHE DU NODE GRD');
  
  const grdNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      label: {
        contains: 'GRD',
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      label: true,
      fieldType: true,
      hasData: true,
      data_instances: true,
      data_activeId: true,
      TreeBranchLeafNodeVariable: {
        select: {
          id: true,
          exposedKey: true,
          sourceType: true,
          sourceRef: true
        }
      }
    },
    take: 5
  });

  if (grdNodes.length === 0) {
    console.log('   ❌ Aucun node GRD trouvé!\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`   ✅ ${grdNodes.length} node(s) GRD trouvé(s):\n`);
  
  grdNodes.forEach((node, idx) => {
    console.log(`   [${idx + 1}] ${node.label}`);
    console.log(`       ID: ${node.id}`);
    console.log(`       Type: ${node.fieldType || 'N/A'}`);
    console.log(`       hasData: ${node.hasData}`);
    console.log(`       data_activeId: ${node.data_activeId || 'N/A'}`);
    
    if (node.data_instances && typeof node.data_instances === 'object') {
      const instances = node.data_instances;
      const activeId = node.data_activeId;
      
      if (activeId && instances[activeId]) {
        const activeInstance = instances[activeId];
        console.log(`       Instance active:`);
        console.log(`         sourceRef: ${activeInstance.sourceRef || 'N/A'}`);
        console.log(`         sourceType: ${activeInstance.sourceType || 'N/A'}`);
        
        if (activeInstance.sourceRef) {
          const refTableId = activeInstance.sourceRef.replace('@table.', '');
          if (refTableId === tableId) {
            console.log(`         ✅ Pointe vers la bonne table!`);
          } else {
            console.log(`         ❌ Pointe vers une autre table: ${refTableId}`);
            console.log(`         ⚠️ Devrait pointer vers: ${tableId}`);
          }
        } else {
          console.log(`         ❌ Pas de sourceRef configuré!`);
        }
      } else {
        console.log(`       ⚠️ Pas d'instance active`);
      }
    }
    
    if (node.TreeBranchLeafNodeVariable) {
      const variable = node.TreeBranchLeafNodeVariable;
      console.log(`       Variable:`);
      console.log(`         exposedKey: ${variable.exposedKey || 'N/A'}`);
      console.log(`         sourceType: ${variable.sourceType || 'N/A'}`);
      console.log(`         sourceRef: ${variable.sourceRef || 'N/A'}`);
    }
    
    console.log('');
  });

  // 2. Vérifier quelle table le lookup utilise
  console.log('\n📊 2. VÉRIFICATION TABLE LOOKUP');
  
  const table = await prisma.treeBranchLeafNodeTable.findUnique({
    where: { id: tableId },
    select: {
      id: true,
      name: true,
      meta: true
    }
  });

  if (!table) {
    console.log('   ❌ Table non trouvée!\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`   Nom: ${table.name}`);
  console.log(`   ID: ${table.id}`);
  
  const lookup = table.meta?.lookup;
  if (lookup && lookup.selectors?.columnFieldId) {
    console.log(`   Lookup configuré avec champ: ${lookup.selectors.columnFieldId}`);
    
    // 3. Vérifier si le champ existe
    console.log('\n📊 3. VÉRIFICATION CHAMP CODE POSTAL');
    
    const fieldId = lookup.selectors.columnFieldId;
    
    // Le fieldId peut être un chemin comme "lead.postalCode"
    // On doit vérifier si c'est un ID de node ou un path
    if (fieldId.includes('.')) {
      console.log(`   Type: Path (${fieldId})`);
      console.log(`   ✅ C'est un chemin vers une propriété, pas un node`);
    } else {
      // C'est un ID de node
      const fieldNode = await prisma.treeBranchLeafNode.findUnique({
        where: { id: fieldId },
        select: {
          id: true,
          label: true,
          fieldType: true
        }
      });

      if (fieldNode) {
        console.log(`   ✅ Champ trouvé: ${fieldNode.label} (${fieldNode.fieldType})`);
      } else {
        console.log(`   ❌ Champ introuvable avec ID: ${fieldId}`);
      }
    }
  }

  // 4. Simuler un appel API
  console.log('\n📊 4. SIMULATION APPEL OPERATION INTERPRETER');
  console.log('   Pour tester le lookup, vous devez:');
  console.log(`   1. Avoir une submission avec un code postal (ex: 1000)`);
  console.log(`   2. Appeler l'API: POST /api/tbl/submissions/preview-evaluate`);
  console.log(`   3. Avec body: { nodeId: "${grdNodes[0]?.id}", formData: { "lead.postalCode": "1000" } }`);
  console.log(`   4. L'Operation Interpreter devrait retourner "SIBELGA"`);

  console.log('\n📋 5. RÉSUMÉ DIAGNOSTIC');
  
  const mainNode = grdNodes[0];
  if (!mainNode) {
    console.log('   ❌ Aucun node GRD trouvé');
  } else {
    const hasDataInstances = !!mainNode.data_instances;
    const hasActiveId = !!mainNode.data_activeId;
    const hasSourceRef = hasDataInstances && hasActiveId && 
      mainNode.data_instances[mainNode.data_activeId]?.sourceRef;
    const pointsToCorrectTable = hasSourceRef && 
      mainNode.data_instances[mainNode.data_activeId].sourceRef.includes(tableId);

    console.log(`   Node GRD: ${mainNode.label} (${mainNode.id})`);
    console.log(`   hasData: ${mainNode.hasData ? '✅' : '❌'}`);
    console.log(`   data_instances existe: ${hasDataInstances ? '✅' : '❌'}`);
    console.log(`   data_activeId existe: ${hasActiveId ? '✅' : '❌'}`);
    console.log(`   sourceRef existe: ${hasSourceRef ? '✅' : '❌'}`);
    console.log(`   Pointe vers la bonne table: ${pointsToCorrectTable ? '✅' : '❌'}`);
    console.log(`   Table lookup configurée: ✅`);

    if (!hasDataInstances || !hasActiveId || !hasSourceRef || !pointsToCorrectTable) {
      console.log('\n🚨 PROBLÈME DÉTECTÉ:');
      console.log('   Le node GRD n\'a pas de configuration data_instances correcte!');
      console.log('\n💡 SOLUTION:');
      console.log('   1. Ouvrir l\'interface "Paramètres Capacités"');
      console.log('   2. Aller dans la configuration du champ GRD');
      console.log('   3. S\'assurer que la capacité "Data" est activée');
      console.log('   4. Configurer la sourceRef vers la table GRD');
      console.log(`   5. SourceRef devrait être: @table.${tableId}`);
    } else {
      console.log('\n✅ Configuration complète! Le champ devrait fonctionner.');
      console.log('   Si ça ne fonctionne toujours pas, vérifier les logs du serveur backend');
      console.log('   lors de la saisie d\'un code postal dans le formulaire.');
    }
  }

  await prisma.$disconnect();
}

diagnoseGRDField().catch(console.error);
