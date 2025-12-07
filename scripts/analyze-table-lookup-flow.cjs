/**
 * 🔍 Script de diagnostic : Analyse du service de duplication table-lookup
 * 
 * Ce script analyse le flux de données dans table-lookup-duplication-service
 * pour comprendre pourquoi la duplication ne fonctionne pas.
 * 
 * Usage: node scripts/analyze-table-lookup-flow.cjs <originalNodeId>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeTableLookupFlow(originalNodeId) {
  console.log('═'.repeat(80));
  console.log('🔍 ANALYSE DU FLUX: duplicateTableLookupSystem');
  console.log('═'.repeat(80));
  
  if (!originalNodeId) {
    // Trouver un exemple de nœud données d'affichage
    console.log('\n⚠️ Aucun nodeId fourni, recherche d\'un exemple...');
    
    const exampleNode = await prisma.treeBranchLeafNode.findFirst({
      where: {
        OR: [
          { label: { contains: 'Rampant' } },
          { label: { contains: 'Longueur toiture' } },
          { label: { contains: 'Orientation' } }
        ],
        NOT: { id: { contains: '-' } }
      },
      select: { id: true, label: true }
    });

    if (exampleNode) {
      originalNodeId = exampleNode.id;
      console.log(`\nExemple trouvé: "${exampleNode.label}" (${originalNodeId})`);
    } else {
      console.log('❌ Aucun nœud données d\'affichage trouvé.');
      return;
    }
  }

  console.log(`\nAnalyse pour originalNodeId: ${originalNodeId}`);
  console.log();

  // 1. Le nœud original existe-t-il?
  console.log('📋 1. NŒUD ORIGINAL');
  console.log('-'.repeat(60));

  const originalNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: originalNodeId },
    select: {
      id: true,
      label: true,
      type: true,
      subType: true,
      hasTable: true,
      hasData: true,
      table_activeId: true,
      linkedTableIds: true
    }
  });

  if (!originalNode) {
    console.log(`❌ Nœud ${originalNodeId} INTROUVABLE!`);
    return;
  }

  console.log(`✅ Nœud trouvé: "${originalNode.label}"`);
  console.log(`   type: ${originalNode.type} | subType: ${originalNode.subType}`);
  console.log(`   hasTable: ${originalNode.hasTable} | hasData: ${originalNode.hasData}`);
  console.log(`   table_activeId: ${originalNode.table_activeId || 'null'}`);
  console.log(`   linkedTableIds: ${JSON.stringify(originalNode.linkedTableIds)}`);

  // 2. Configs SELECT de l'original
  console.log('\n📋 2. SELECT CONFIGS DE L\'ORIGINAL');
  console.log('-'.repeat(60));

  const originalConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
    where: { nodeId: originalNodeId }
  });

  if (originalConfigs.length === 0) {
    console.log(`⚠️ Aucune SELECT config pour ce nœud.`);
    console.log(`   → Le service ne fera RIEN si pas de config SELECT!`);
    console.log(`   → Vérifiez que ce nœud a bien une configuration de type 'données d'affichage'`);
    return;
  }

  console.log(`✅ ${originalConfigs.length} config(s) SELECT:`);
  for (const cfg of originalConfigs) {
    console.log(`\n   Config ID: ${cfg.id}`);
    console.log(`   - nodeId: ${cfg.nodeId}`);
    console.log(`   - tableReference: ${cfg.tableReference}`);
    console.log(`   - keyColumn: ${cfg.keyColumn}`);
    console.log(`   - valueColumn: ${cfg.valueColumn}`);
    console.log(`   - filterColumn: ${cfg.filterColumn || 'null'}`);
    console.log(`   - filterValue: ${cfg.filterValue || 'null'}`);
  }

  // 3. Tables TBL référencées
  console.log('\n📋 3. TABLES TBL RÉFÉRENCÉES');
  console.log('-'.repeat(60));

  for (const cfg of originalConfigs) {
    if (cfg.tableReference) {
      const table = await prisma.tBLMatrix.findUnique({
        where: { id: cfg.tableReference },
        select: { id: true, name: true, nodeId: true, columns: true }
      });

      if (table) {
        console.log(`\n✅ Table "${table.name}" (${table.id})`);
        console.log(`   - nodeId de la table: ${table.nodeId}`);
        console.log(`   - Nombre de colonnes: ${table.columns?.length || 0}`);
        
        // Vérifier les lignes
        const rowCount = await prisma.tBLMatrixRow.count({
          where: { matrixId: table.id }
        });
        console.log(`   - Nombre de lignes: ${rowCount}`);
      } else {
        console.log(`\n❌ Table ${cfg.tableReference} INTROUVABLE!`);
      }
    }
  }

  // 4. Simuler ce que ferait duplicateTableLookupSystem
  console.log('\n📋 4. SIMULATION: duplicateTableLookupSystem');
  console.log('-'.repeat(60));

  const suffixToken = '-1'; // Exemple de suffixe
  
  console.log(`\nParamètres simulés:`);
  console.log(`  - originalNodeId: ${originalNodeId}`);
  console.log(`  - suffixToken: ${suffixToken}`);
  
  const copiedNodeId = originalNodeId + suffixToken;
  console.log(`  - copiedNodeId attendu: ${copiedNodeId}`);

  // Vérifier si le nœud copié existe
  const copiedNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: copiedNodeId },
    select: { id: true, label: true }
  });

  if (copiedNode) {
    console.log(`\n✅ Nœud copié existe: "${copiedNode.label}"`);
    
    // Vérifier les SELECT configs du nœud copié
    const copiedConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
      where: { nodeId: copiedNodeId }
    });

    if (copiedConfigs.length === 0) {
      console.log(`❌ MAIS pas de SELECT config pour la copie!`);
      console.log(`   → C'est ici le problème: la config n'a pas été dupliquée`);
    } else {
      console.log(`✅ ${copiedConfigs.length} config(s) SELECT pour la copie`);
      for (const cfg of copiedConfigs) {
        console.log(`   - tableReference: ${cfg.tableReference}`);
      }
    }
  } else {
    console.log(`\n⚠️ Nœud copié ${copiedNodeId} n'existe pas encore.`);
    console.log(`   → La duplication n'a pas encore été effectuée ou a échoué`);
  }

  // 5. Ce que duplicateTableAndSelectConfig DEVRAIT faire
  console.log('\n📋 5. CE QUI DEVRAIT SE PASSER (duplicateTableAndSelectConfig)');
  console.log('-'.repeat(60));

  for (const cfg of originalConfigs) {
    console.log(`\nPour la config ${cfg.id}:`);
    
    const expectedNewTableId = cfg.tableReference ? cfg.tableReference + suffixToken : null;
    const expectedNewConfigId = cfg.id + suffixToken;
    
    console.log(`  1. Dupliquer la table:`);
    console.log(`     - ID original: ${cfg.tableReference}`);
    console.log(`     - ID attendu:  ${expectedNewTableId}`);
    
    if (expectedNewTableId) {
      const newTable = await prisma.tBLMatrix.findUnique({
        where: { id: expectedNewTableId }
      });
      if (newTable) {
        console.log(`     ✅ Table dupliquée existe!`);
      } else {
        console.log(`     ❌ Table dupliquée N'EXISTE PAS`);
      }
    }
    
    console.log(`\n  2. Créer la nouvelle SELECT config:`);
    console.log(`     - nodeId: ${copiedNodeId}`);
    console.log(`     - tableReference: ${expectedNewTableId}`);
    console.log(`     - keyColumn: ${cfg.keyColumn}`);
    console.log(`     - valueColumn: ${cfg.valueColumn}`);
    
    const existingNewConfig = await prisma.treeBranchLeafSelectConfig.findFirst({
      where: {
        nodeId: copiedNodeId,
        tableReference: expectedNewTableId
      }
    });
    
    if (existingNewConfig) {
      console.log(`     ✅ Config dupliquée existe!`);
    } else {
      console.log(`     ❌ Config dupliquée N'EXISTE PAS`);
    }
  }

  // 6. Diagnostic final
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 DIAGNOSTIC FINAL');
  console.log('═'.repeat(80));

  const issues = [];

  // Check 1: Original a-t-il des configs?
  if (originalConfigs.length === 0) {
    issues.push('Le nœud original n\'a pas de SELECT config');
  }

  // Check 2: Le nœud copié existe-t-il?
  if (!copiedNode) {
    issues.push(`Le nœud copié ${copiedNodeId} n'existe pas`);
  } else {
    // Check 3: La copie a-t-elle les configs?
    const copiedConfigCount = await prisma.treeBranchLeafSelectConfig.count({
      where: { nodeId: copiedNodeId }
    });
    if (copiedConfigCount === 0 && originalConfigs.length > 0) {
      issues.push('Le nœud copié existe mais sans SELECT config');
    }

    // Check 4: Les tables copiées existent-elles?
    for (const cfg of originalConfigs) {
      if (cfg.tableReference) {
        const expectedTableId = cfg.tableReference + suffixToken;
        const tableExists = await prisma.tBLMatrix.findUnique({
          where: { id: expectedTableId }
        });
        if (!tableExists) {
          issues.push(`Table copiée ${expectedTableId} n'existe pas`);
        }
      }
    }
  }

  if (issues.length === 0) {
    console.log('\n✅ Tout semble correct pour ce nœud!');
  } else {
    console.log('\n❌ PROBLÈMES DÉTECTÉS:');
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });

    console.log('\n📝 CAUSES POSSIBLES:');
    console.log('   1. duplicateTableLookupSystem() n\'est pas appelé');
    console.log('   2. originalNodeIdByCopyId ne contient pas ce nœud');
    console.log('   3. Le service échoue silencieusement (erreur non loguée)');
    console.log('   4. La transaction Prisma échoue');
  }

  console.log('\n' + '═'.repeat(80));
}

const nodeId = process.argv[2];
analyzeTableLookupFlow(nodeId)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
