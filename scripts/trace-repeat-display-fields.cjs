/**
 * 🔍 Script de diagnostic : Trace complète du repeat pour les champs données d'affichage
 * 
 * Ce script trace le chemin de duplication pour comprendre où ça échoue.
 * 
 * Usage: node scripts/trace-repeat-display-fields.cjs <treeId>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Noms des champs données d'affichage à tracer
const DISPLAY_FIELD_PATTERNS = [
  'Rampant',
  'Longueur toiture',
  'Orientation',
  'Inclinaison'
];

async function main() {
  const treeId = process.argv[2];
  
  console.log('═'.repeat(80));
  console.log('🔍 TRACE: Duplication repeat pour champs données d\'affichage');
  console.log('═'.repeat(80));
  
  if (treeId) {
    console.log(`\nTree ID spécifié: ${treeId}`);
  } else {
    console.log(`\nAucun Tree ID spécifié, analyse globale...`);
  }
  console.log();

  // 1. Trouver tous les nœuds qui ressemblent à des champs données d'affichage
  console.log('📋 1. TOUS LES NŒUDS "DONNÉES D\'AFFICHAGE" (originaux + copies)');
  console.log('-'.repeat(60));

  const whereClause = {
    OR: DISPLAY_FIELD_PATTERNS.map(pattern => ({
      label: { contains: pattern }
    }))
  };

  if (treeId) {
    whereClause.treeId = treeId;
  }

  const allDisplayNodes = await prisma.treeBranchLeafNode.findMany({
    where: whereClause,
    orderBy: { label: 'asc' },
    select: {
      id: true,
      label: true,
      type: true,
      subType: true,
      hasTable: true,
      hasData: true,
      table_activeId: true,
      data_activeId: true,
      linkedTableIds: true,
      treeId: true,
      parentId: true,
      order: true
    }
  });

  console.log(`Trouvé ${allDisplayNodes.length} nœuds:\n`);

  // Séparer originaux et copies
  const originals = allDisplayNodes.filter(n => !n.id.includes('-'));
  const copies = allDisplayNodes.filter(n => n.id.includes('-'));

  console.log(`  📍 Originaux: ${originals.length}`);
  console.log(`  📋 Copies: ${copies.length}`);
  console.log();

  // 2. Pour chaque original, montrer les détails et ses copies
  console.log('📋 2. DÉTAIL PAR CHAMP ORIGINAL');
  console.log('-'.repeat(60));

  for (const orig of originals) {
    console.log(`\n┌─ ORIGINAL: ${orig.label}`);
    console.log(`│  ID: ${orig.id}`);
    console.log(`│  type: ${orig.type} | subType: ${orig.subType}`);
    console.log(`│  hasTable: ${orig.hasTable} | hasData: ${orig.hasData}`);
    console.log(`│  table_activeId: ${orig.table_activeId || 'null'}`);
    console.log(`│  linkedTableIds: ${JSON.stringify(orig.linkedTableIds)}`);

    // Config SELECT pour l'original
    const origSelectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
      where: { nodeId: orig.id }
    });

    console.log(`│`);
    if (origSelectConfigs.length > 0) {
      console.log(`│  ✅ SELECT CONFIG(s):`);
      for (const cfg of origSelectConfigs) {
        console.log(`│     - id: ${cfg.id}`);
        console.log(`│       tableReference: ${cfg.tableReference}`);
        console.log(`│       keyColumn: ${cfg.keyColumn} | valueColumn: ${cfg.valueColumn}`);
        
        // Vérifier si la table référencée existe
        if (cfg.tableReference) {
          const table = await prisma.tBLMatrix.findUnique({
            where: { id: cfg.tableReference },
            select: { id: true, name: true }
          });
          if (table) {
            console.log(`│       → Table "${table.name}" existe ✅`);
          } else {
            console.log(`│       → Table INTROUVABLE ❌`);
          }
        }
      }
    } else {
      console.log(`│  ❌ AUCUNE SELECT CONFIG`);
    }

    // Trouver les copies de cet original
    const nodeCopies = copies.filter(c => c.id.startsWith(orig.id + '-'));
    
    console.log(`│`);
    if (nodeCopies.length === 0) {
      console.log(`│  ⚠️ AUCUNE COPIE trouvée (pas de nœud avec ID commençant par ${orig.id}-)`);
    } else {
      console.log(`│  📋 COPIES (${nodeCopies.length}):`);
      
      for (const copy of nodeCopies) {
        const suffix = copy.id.replace(orig.id, '');
        console.log(`│`);
        console.log(`│     ├─ COPIE ${suffix}: ${copy.label}`);
        console.log(`│     │  ID: ${copy.id}`);
        console.log(`│     │  hasTable: ${copy.hasTable} | hasData: ${copy.hasData}`);
        console.log(`│     │  table_activeId: ${copy.table_activeId || 'null'}`);
        console.log(`│     │  linkedTableIds: ${JSON.stringify(copy.linkedTableIds)}`);

        // Config SELECT pour la copie
        const copySelectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
          where: { nodeId: copy.id }
        });

        if (copySelectConfigs.length > 0) {
          console.log(`│     │  ✅ SELECT CONFIG(s): ${copySelectConfigs.length}`);
          for (const cfg of copySelectConfigs) {
            console.log(`│     │     - tableReference: ${cfg.tableReference}`);
            
            // Vérifier si la table copiée existe
            if (cfg.tableReference) {
              const table = await prisma.tBLMatrix.findUnique({
                where: { id: cfg.tableReference },
                select: { id: true, name: true }
              });
              if (table) {
                console.log(`│     │       → Table "${table.name}" existe ✅`);
              } else {
                console.log(`│     │       → Table INTROUVABLE ❌`);
              }
            }
          }
        } else {
          console.log(`│     │  ❌ AUCUNE SELECT CONFIG - C'EST LE PROBLÈME!`);
          
          // Suggérer quelle config devrait exister
          if (origSelectConfigs.length > 0) {
            console.log(`│     │`);
            console.log(`│     │  ⚡ CONFIG ATTENDUE:`);
            for (const origCfg of origSelectConfigs) {
              const expectedTableRef = origCfg.tableReference ? origCfg.tableReference + suffix : null;
              console.log(`│     │     - tableReference attendu: ${expectedTableRef}`);
              
              // Vérifier si cette table attendue existe
              if (expectedTableRef) {
                const expectedTable = await prisma.tBLMatrix.findUnique({
                  where: { id: expectedTableRef },
                  select: { id: true, name: true }
                });
                if (expectedTable) {
                  console.log(`│     │       → Table existe ✅ mais config manquante!`);
                } else {
                  console.log(`│     │       → Table n'existe pas non plus ❌`);
                }
              }
            }
          }
        }
      }
    }
    console.log(`└─`);
  }

  // 3. Vérifier toutes les tables TBL avec suffixes
  console.log('\n\n📋 3. TABLES TBL LIÉES AUX CHAMPS DONNÉES D\'AFFICHAGE');
  console.log('-'.repeat(60));

  // Collecter tous les tableReference des configs
  const allConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
    where: {
      nodeId: { in: originals.map(o => o.id) }
    }
  });

  const uniqueTableRefs = [...new Set(allConfigs.map(c => c.tableReference).filter(Boolean))];

  for (const tableRef of uniqueTableRefs) {
    console.log(`\n🗂️ Table: ${tableRef}`);
    
    const originalTable = await prisma.tBLMatrix.findUnique({
      where: { id: tableRef },
      select: { id: true, name: true, nodeId: true }
    });

    if (originalTable) {
      console.log(`   ✅ Originale existe: "${originalTable.name}" (nodeId: ${originalTable.nodeId})`);
    } else {
      console.log(`   ❌ Originale INTROUVABLE`);
    }

    // Chercher les copies de cette table
    const tableCopies = await prisma.tBLMatrix.findMany({
      where: {
        id: { startsWith: tableRef + '-' }
      },
      select: { id: true, name: true, nodeId: true }
    });

    if (tableCopies.length > 0) {
      console.log(`   📋 Copies trouvées: ${tableCopies.length}`);
      for (const tc of tableCopies) {
        console.log(`      - ${tc.id}: "${tc.name}" (nodeId: ${tc.nodeId})`);
      }
    } else {
      console.log(`   ⚠️ AUCUNE copie de table trouvée`);
    }
  }

  // 4. Résumé
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 RÉSUMÉ');
  console.log('═'.repeat(80));

  let missingSelectConfigs = 0;
  let missingTables = 0;

  for (const copy of copies) {
    const configs = await prisma.treeBranchLeafSelectConfig.count({
      where: { nodeId: copy.id }
    });
    
    // Trouver l'original correspondant
    const origId = copy.id.split('-')[0];
    const orig = originals.find(o => o.id === origId);
    
    if (orig) {
      const origConfigs = await prisma.treeBranchLeafSelectConfig.count({
        where: { nodeId: orig.id }
      });
      
      if (origConfigs > 0 && configs === 0) {
        missingSelectConfigs++;
      }
    }
  }

  console.log(`\n  📍 Champs originaux: ${originals.length}`);
  console.log(`  📋 Copies trouvées: ${copies.length}`);
  console.log(`  ❌ Copies sans SELECT config (alors que l'original en a): ${missingSelectConfigs}`);

  if (missingSelectConfigs > 0) {
    console.log(`\n⚠️ PROBLÈME CONFIRMÉ: Les SELECT configs ne sont pas dupliquées!`);
    console.log(`\nPoints à vérifier dans le code:`);
    console.log(`  1. table-lookup-duplication-service.ts → duplicateTableAndSelectConfig()`);
    console.log(`  2. repeat-executor.ts → appel à duplicateTableLookupSystem()`);
    console.log(`  3. Vérifier que le suffixToken est bien transmis`);
  } else {
    console.log(`\n✅ Pas de problème de SELECT config manquante détecté.`);
  }

  console.log('\n' + '═'.repeat(80));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
