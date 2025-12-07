/**
 * 🔍 Script de diagnostic COMPLET: Analyse du flux de duplication des champs d'affichage
 * 
 * Ce script trace exactement ce qui se passe quand un repeat est lancé:
 * 1. Les nœuds qui sont copiés
 * 2. Les variables liées aux nœuds 
 * 3. Les TreeBranchLeafSelectConfig et leurs tables
 * 4. Pourquoi les champs d'affichage -1 ne fonctionnent pas
 * 
 * Usage: node scripts/full-display-field-diagnostic.cjs
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('═'.repeat(100));
  console.log('🔍 DIAGNOSTIC COMPLET: Flux de duplication des champs d\'affichage');
  console.log('═'.repeat(100));

  // 1. Trouver tous les nœuds avec hasData=true (champs d'affichage potentiels)
  console.log('\n📋 1. NŒUDS AVEC hasData=true OU hasTable=true');
  console.log('-'.repeat(80));

  const dataNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { hasData: true },
        { hasTable: true }
      ]
    },
    select: {
      id: true,
      label: true,
      type: true,
      subType: true,
      hasTable: true,
      hasData: true,
      table_activeId: true,
      linkedTableIds: true,
      linkedVariableIds: true,
      parentId: true,
      treeId: true
    },
    orderBy: { label: 'asc' }
  });

  console.log(`Total: ${dataNodes.length} nœuds\n`);

  // Séparer originaux et copies
  const originals = dataNodes.filter(n => !n.id.includes('-'));
  const copies = dataNodes.filter(n => n.id.includes('-'));

  console.log(`  📍 Originaux: ${originals.length}`);
  console.log(`  📋 Copies: ${copies.length}\n`);

  // 2. Pour chaque original, analyser en détail
  console.log('\n📋 2. ANALYSE DÉTAILLÉE PAR NŒUD ORIGINAL');
  console.log('-'.repeat(80));

  for (const orig of originals) {
    console.log(`\n┌─────────────────────────────────────────────────────────────────────────────────`);
    console.log(`│ 📍 ORIGINAL: "${orig.label}"`);
    console.log(`│    ID: ${orig.id}`);
    console.log(`│    type: ${orig.type} | subType: ${orig.subType}`);
    console.log(`│    hasTable: ${orig.hasTable} | hasData: ${orig.hasData}`);
    console.log(`│    table_activeId: ${orig.table_activeId || 'null'}`);
    console.log(`│    linkedTableIds: ${JSON.stringify(orig.linkedTableIds)}`);
    console.log(`│    linkedVariableIds: ${JSON.stringify(orig.linkedVariableIds)}`);

    // 2.1 Chercher les variables liées
    if (orig.linkedVariableIds && orig.linkedVariableIds.length > 0) {
      console.log(`│`);
      console.log(`│    🔗 VARIABLES LIÉES:`);
      for (const varId of orig.linkedVariableIds) {
        const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
          where: { id: varId },
          select: {
            id: true,
            nodeId: true,
            exposedKey: true,
            displayName: true,
            sourceType: true,
            sourceRef: true
          }
        });
        if (variable) {
          console.log(`│       - Variable: ${variable.displayName} (${variable.id})`);
          console.log(`│         nodeId: ${variable.nodeId}`);
          console.log(`│         sourceType: ${variable.sourceType} | sourceRef: ${variable.sourceRef}`);
        } else {
          console.log(`│       - Variable ${varId} INTROUVABLE!`);
        }
      }
    }

    // 2.2 Chercher les SELECT configs
    const selectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
      where: { nodeId: orig.id }
    });

    console.log(`│`);
    if (selectConfigs.length > 0) {
      console.log(`│    📊 SELECT CONFIGS (${selectConfigs.length}):`);
      for (const cfg of selectConfigs) {
        console.log(`│       - Config ID: ${cfg.id}`);
        console.log(`│         tableReference: ${cfg.tableReference}`);
        console.log(`│         keyColumn: ${cfg.keyColumn} | valueColumn: ${cfg.valueColumn}`);
        
        // Vérifier si la table existe
        if (cfg.tableReference) {
          const table = await prisma.tBLMatrix.findUnique({
            where: { id: cfg.tableReference }
          });
          if (table) {
            console.log(`│         → Table "${table.name}" existe ✅`);
          } else {
            console.log(`│         → Table INTROUVABLE ❌`);
          }
        }
      }
    } else {
      console.log(`│    ⚠️ AUCUNE SELECT CONFIG`);
    }

    // 2.3 Chercher les tables TreeBranchLeafNodeTable
    const nodeTables = await prisma.treeBranchLeafNodeTable.findMany({
      where: { nodeId: orig.id }
    });

    if (nodeTables.length > 0) {
      console.log(`│`);
      console.log(`│    🗂️ NODE TABLES (${nodeTables.length}):`);
      for (const tbl of nodeTables) {
        console.log(`│       - ${tbl.name} (${tbl.id})`);
        console.log(`│         lookupSelectColumn: ${tbl.lookupSelectColumn || 'null'}`);
        console.log(`│         lookupDisplayColumns: ${JSON.stringify(tbl.lookupDisplayColumns)}`);
      }
    }

    // 2.4 Chercher les copies de ce nœud
    const nodeCopies = copies.filter(c => {
      const baseId = c.id.replace(/-\d+(?:-\d+)*$/, '');
      return baseId === orig.id;
    });

    console.log(`│`);
    if (nodeCopies.length > 0) {
      console.log(`│    📋 COPIES TROUVÉES (${nodeCopies.length}):`);
      
      for (const copy of nodeCopies) {
        const suffix = copy.id.replace(orig.id, '');
        console.log(`│`);
        console.log(`│       ┌─ COPIE ${suffix}`);
        console.log(`│       │  ID: ${copy.id}`);
        console.log(`│       │  hasTable: ${copy.hasTable} | hasData: ${copy.hasData}`);
        console.log(`│       │  table_activeId: ${copy.table_activeId || 'null'}`);
        console.log(`│       │  linkedTableIds: ${JSON.stringify(copy.linkedTableIds)}`);
        console.log(`│       │  linkedVariableIds: ${JSON.stringify(copy.linkedVariableIds)}`);

        // Variables liées à la copie
        if (copy.linkedVariableIds && copy.linkedVariableIds.length > 0) {
          console.log(`│       │`);
          console.log(`│       │  🔗 VARIABLES:`);
          for (const varId of copy.linkedVariableIds) {
            const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
              where: { id: varId }
            });
            if (variable) {
              console.log(`│       │     ✅ ${variable.displayName} (${varId})`);
            } else {
              console.log(`│       │     ❌ ${varId} INTROUVABLE!`);
            }
          }
        }

        // SELECT configs de la copie
        const copyConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
          where: { nodeId: copy.id }
        });

        console.log(`│       │`);
        if (copyConfigs.length > 0) {
          console.log(`│       │  📊 SELECT CONFIGS: ${copyConfigs.length}`);
          for (const cfg of copyConfigs) {
            console.log(`│       │     - tableReference: ${cfg.tableReference}`);
          }
        } else {
          console.log(`│       │  ❌ AUCUNE SELECT CONFIG - PROBLÈME!`);
          
          // Suggérer ce qui devrait exister
          if (selectConfigs.length > 0) {
            console.log(`│       │`);
            console.log(`│       │  ⚡ CE QUI DEVRAIT EXISTER:`);
            for (const origCfg of selectConfigs) {
              const expectedTableRef = origCfg.tableReference ? `${origCfg.tableReference}${suffix}` : null;
              console.log(`│       │     - nodeId: ${copy.id}`);
              console.log(`│       │       tableReference: ${expectedTableRef}`);
              
              // Vérifier si la table attendue existe
              if (expectedTableRef) {
                const expectedTable = await prisma.tBLMatrix.findUnique({
                  where: { id: expectedTableRef }
                });
                if (expectedTable) {
                  console.log(`│       │       → Table copiée existe ✅ mais config manquante!`);
                } else {
                  console.log(`│       │       → Table copiée n'existe pas non plus ❌`);
                }
              }
            }
          }
        }

        // Node tables de la copie
        const copyNodeTables = await prisma.treeBranchLeafNodeTable.findMany({
          where: { nodeId: copy.id }
        });

        if (copyNodeTables.length > 0) {
          console.log(`│       │`);
          console.log(`│       │  🗂️ NODE TABLES: ${copyNodeTables.length}`);
          for (const tbl of copyNodeTables) {
            console.log(`│       │     - ${tbl.name} (${tbl.id})`);
          }
        }

        console.log(`│       └─`);
      }
    } else {
      console.log(`│    ⚠️ AUCUNE COPIE trouvée`);
    }

    console.log(`└─────────────────────────────────────────────────────────────────────────────────`);
  }

  // 3. Analyser les TBLMatrix
  console.log('\n\n📋 3. TABLES TBLMatrix');
  console.log('-'.repeat(80));

  const tblMatrixTables = await prisma.tBLMatrix.findMany({
    select: {
      id: true,
      name: true,
      nodeId: true,
      organizationId: true
    },
    orderBy: { name: 'asc' }
  });

  console.log(`Total: ${tblMatrixTables.length} tables\n`);

  const origTables = tblMatrixTables.filter(t => !t.id.includes('-'));
  const copyTables = tblMatrixTables.filter(t => t.id.includes('-'));

  console.log(`  📍 Originales: ${origTables.length}`);
  console.log(`  📋 Copies: ${copyTables.length}\n`);

  for (const table of origTables.slice(0, 10)) {
    console.log(`  🗂️ "${table.name}" (${table.id})`);
    console.log(`     nodeId: ${table.nodeId || 'null'}`);
    
    const tableCopies = copyTables.filter(t => {
      const baseId = t.id.replace(/-\d+(?:-\d+)*$/, '');
      return baseId === table.id;
    });
    
    if (tableCopies.length > 0) {
      console.log(`     ✅ Copies: ${tableCopies.map(t => t.id).join(', ')}`);
    } else {
      console.log(`     ⚠️ Aucune copie`);
    }
    console.log();
  }

  // 4. Analyser les TreeBranchLeafSelectConfig
  console.log('\n📋 4. TOUTES LES SELECT CONFIGS');
  console.log('-'.repeat(80));

  const allSelectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
    select: {
      id: true,
      nodeId: true,
      tableReference: true,
      keyColumn: true,
      valueColumn: true
    }
  });

  console.log(`Total: ${allSelectConfigs.length} configs\n`);

  // Grouper par nodeId
  const configsByNode = {};
  for (const cfg of allSelectConfigs) {
    if (!configsByNode[cfg.nodeId]) {
      configsByNode[cfg.nodeId] = [];
    }
    configsByNode[cfg.nodeId].push(cfg);
  }

  // Montrer les configs pour les nœuds originaux vs copies
  const origNodeConfigs = Object.entries(configsByNode).filter(([nodeId]) => !nodeId.includes('-'));
  const copyNodeConfigs = Object.entries(configsByNode).filter(([nodeId]) => nodeId.includes('-'));

  console.log(`  📍 Configs pour nœuds originaux: ${origNodeConfigs.length}`);
  console.log(`  📋 Configs pour nœuds copies: ${copyNodeConfigs.length}\n`);

  for (const [nodeId, configs] of origNodeConfigs) {
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { label: true }
    });
    console.log(`  📍 ${node?.label || 'Unknown'} (${nodeId})`);
    for (const cfg of configs) {
      console.log(`     - tableReference: ${cfg.tableReference}`);
    }

    // Vérifier si les copies ont aussi des configs
    const copySuffix = '-1';
    const copyNodeId = nodeId + copySuffix;
    const copyConfigs = configsByNode[copyNodeId] || [];
    if (copyConfigs.length === 0) {
      console.log(`     ❌ Copie ${copyNodeId} n'a PAS de config!`);
    } else {
      console.log(`     ✅ Copie ${copyNodeId} a ${copyConfigs.length} config(s)`);
    }
    console.log();
  }

  // 5. Résumé des problèmes
  console.log('\n' + '═'.repeat(100));
  console.log('📊 RÉSUMÉ DES PROBLÈMES');
  console.log('═'.repeat(100));

  let problems = 0;

  for (const orig of originals) {
    const origConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
      where: { nodeId: orig.id }
    });

    if (origConfigs.length === 0) continue;

    // Chercher les copies
    const nodeCopies = copies.filter(c => {
      const baseId = c.id.replace(/-\d+(?:-\d+)*$/, '');
      return baseId === orig.id;
    });

    for (const copy of nodeCopies) {
      const copyConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
        where: { nodeId: copy.id }
      });

      if (copyConfigs.length === 0) {
        problems++;
        console.log(`\n❌ PROBLÈME #${problems}:`);
        console.log(`   Original: "${orig.label}" (${orig.id}) a ${origConfigs.length} SELECT config(s)`);
        console.log(`   Copie: "${copy.label}" (${copy.id}) a 0 SELECT config(s)`);
        console.log(`   → La duplication des SELECT configs a ÉCHOUÉ!`);
      }
    }
  }

  if (problems === 0) {
    console.log('\n✅ Aucun problème de SELECT config manquante détecté.');
  } else {
    console.log(`\n\n⚠️ TOTAL: ${problems} problème(s) détecté(s)`);
    console.log(`\nCAUSES POSSIBLES:`);
    console.log(`  1. tableLookupDuplicationService.duplicateTableLookupSystem() n'est pas appelé`);
    console.log(`  2. L'originalNodeId passé au service n'a pas de SELECT configs`);
    console.log(`  3. Le suffixToken n'est pas correct`);
    console.log(`  4. Une erreur silencieuse se produit`);
  }

  console.log('\n' + '═'.repeat(100));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
