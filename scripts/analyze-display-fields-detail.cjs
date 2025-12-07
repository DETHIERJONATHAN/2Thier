/**
 * 🔍 Script pour analyser en détail les champs données d'affichage et leurs copies
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// IDs trouvés dans l'analyse précédente
const DISPLAY_FIELD_IDS = {
  'Orientation': '1203df47-e87e-42fd-b178-31afd89b9c83',
  'Orientation-Inclinaison': '54adf56b-ee04-44bf-b5f2-3ab5b8a3e8f1',
  'Rampant toiture': '9c9f42b2-e0df-4726-8d5a-c5f4e9f8b1a2',
  'Longueur toiture': 'adbf2827-d5d7-4ef1-9f5a-4b8c7d6e5f4a',
};

async function main() {
  console.log('═'.repeat(80));
  console.log('🔍 ANALYSE DÉTAILLÉE: Champs données d\'affichage');
  console.log('═'.repeat(80));

  // 1. Récupérer les vrais IDs des champs
  console.log('\n📋 1. CHAMPS AVEC hasData=true (données d\'affichage)');
  console.log('-'.repeat(60));

  const displayFields = await prisma.treeBranchLeafNode.findMany({
    where: {
      hasData: true,
      NOT: { id: { contains: '-' } } // Exclure les copies
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
      parentId: true
    }
  });

  console.log(`Trouvé ${displayFields.length} champs originaux avec hasData=true:\n`);

  for (const field of displayFields) {
    console.log(`\n┌─ "${field.label}" (ORIGINAL)`);
    console.log(`│  ID complet: ${field.id}`);
    console.log(`│  type: ${field.type} | subType: ${field.subType}`);
    console.log(`│  hasTable: ${field.hasTable} | hasData: ${field.hasData}`);
    console.log(`│  table_activeId: ${field.table_activeId || 'null'}`);
    console.log(`│  linkedTableIds: ${JSON.stringify(field.linkedTableIds)}`);

    // Chercher les SELECT configs
    const configs = await prisma.treeBranchLeafSelectConfig.findMany({
      where: { nodeId: field.id }
    });
    
    console.log(`│`);
    if (configs.length > 0) {
      console.log(`│  ✅ SELECT CONFIGS (${configs.length}):`);
      for (const cfg of configs) {
        console.log(`│     - tableReference: ${cfg.tableReference}`);
        console.log(`│       keyColumn: ${cfg.keyColumn} | valueColumn: ${cfg.valueColumn}`);
      }
    } else {
      console.log(`│  ⚠️ AUCUNE SELECT CONFIG`);
    }

    // Chercher les copies
    const copies = await prisma.treeBranchLeafNode.findMany({
      where: {
        id: { startsWith: field.id + '-' }
      },
      select: {
        id: true,
        label: true,
        subType: true,
        hasTable: true,
        hasData: true,
        table_activeId: true,
        linkedTableIds: true
      }
    });

    console.log(`│`);
    if (copies.length > 0) {
      console.log(`│  📋 COPIES (${copies.length}):`);
      for (const copy of copies) {
        const suffix = copy.id.replace(field.id, '');
        console.log(`│     ├─ Copie "${suffix}": ${copy.label}`);
        console.log(`│     │  ID: ${copy.id}`);
        console.log(`│     │  subType: ${copy.subType || 'null'} (original: ${field.subType})`);
        console.log(`│     │  hasTable: ${copy.hasTable} | hasData: ${copy.hasData}`);
        console.log(`│     │  table_activeId: ${copy.table_activeId || 'null'}`);
        console.log(`│     │  linkedTableIds: ${JSON.stringify(copy.linkedTableIds)}`);

        // SELECT config de la copie
        const copyConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
          where: { nodeId: copy.id }
        });

        if (copyConfigs.length > 0) {
          console.log(`│     │  ✅ SELECT CONFIGS: ${copyConfigs.length}`);
          for (const cfg of copyConfigs) {
            console.log(`│     │     - tableReference: ${cfg.tableReference}`);
          }
        } else {
          console.log(`│     │  ❌ AUCUNE SELECT CONFIG`);
        }
        console.log(`│     │`);
      }
    } else {
      console.log(`│  ⚠️ AUCUNE COPIE trouvée`);
    }

    console.log(`└─`);
  }

  // 2. Vérifier toutes les SELECT configs
  console.log('\n\n' + '═'.repeat(80));
  console.log('📋 2. TOUTES LES SELECT CONFIGS');
  console.log('-'.repeat(60));

  const allConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
    select: {
      id: true,
      nodeId: true,
      tableReference: true,
      keyColumn: true,
      valueColumn: true
    }
  });

  console.log(`Total: ${allConfigs.length} configs\n`);

  // Grouper par nodeId
  const configsByNode = {};
  for (const cfg of allConfigs) {
    if (!configsByNode[cfg.nodeId]) {
      configsByNode[cfg.nodeId] = [];
    }
    configsByNode[cfg.nodeId].push(cfg);
  }

  for (const [nodeId, configs] of Object.entries(configsByNode)) {
    const isCopy = nodeId.includes('-');
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { label: true }
    });

    console.log(`${isCopy ? '📋' : '📍'} ${node?.label || 'Unknown'} (${nodeId})`);
    for (const cfg of configs) {
      console.log(`   - tableReference: ${cfg.tableReference}`);
    }
    console.log();
  }

  // 3. Tables TBL et leurs copies
  console.log('\n' + '═'.repeat(80));
  console.log('📋 3. TABLES TBL ET LEURS COPIES');
  console.log('-'.repeat(60));

  const tables = await prisma.tBLMatrix.findMany({
    select: {
      id: true,
      name: true,
      nodeId: true
    },
    orderBy: { name: 'asc' }
  });

  // Identifier originaux et copies
  const originalTables = tables.filter(t => !t.id.includes('-'));
  const copiedTables = tables.filter(t => t.id.includes('-'));

  console.log(`Originales: ${originalTables.length} | Copies: ${copiedTables.length}\n`);

  for (const table of originalTables) {
    console.log(`🗂️ "${table.name}" (${table.id})`);
    console.log(`   nodeId: ${table.nodeId}`);
    
    const tableCopies = copiedTables.filter(t => t.id.startsWith(table.id + '-'));
    if (tableCopies.length > 0) {
      console.log(`   ✅ Copies: ${tableCopies.length}`);
      for (const tc of tableCopies) {
        console.log(`      - ${tc.id}`);
      }
    } else {
      console.log(`   ⚠️ Aucune copie`);
    }
    console.log();
  }

  // 4. Diagnostic: Quelles configs manquent?
  console.log('\n' + '═'.repeat(80));
  console.log('📊 4. DIAGNOSTIC: CONFIGS MANQUANTES');
  console.log('-'.repeat(60));

  let missingConfigs = 0;

  for (const field of displayFields) {
    const origConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
      where: { nodeId: field.id }
    });

    if (origConfigs.length === 0) continue; // Pas de config à dupliquer

    const copies = await prisma.treeBranchLeafNode.findMany({
      where: { id: { startsWith: field.id + '-' } },
      select: { id: true, label: true }
    });

    for (const copy of copies) {
      const copyConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
        where: { nodeId: copy.id }
      });

      if (copyConfigs.length === 0) {
        missingConfigs++;
        console.log(`\n❌ CONFIG MANQUANTE:`);
        console.log(`   Original: "${field.label}" (${field.id}) a ${origConfigs.length} config(s)`);
        console.log(`   Copie: "${copy.label}" (${copy.id}) a 0 config(s)`);
        
        // Montrer ce qui devrait exister
        console.log(`   ⚡ CE QUI DEVRAIT EXISTER:`);
        for (const origCfg of origConfigs) {
          const suffix = copy.id.replace(field.id, '');
          const expectedTableRef = origCfg.tableReference ? origCfg.tableReference + suffix : null;
          console.log(`      - nodeId: ${copy.id}`);
          console.log(`        tableReference: ${expectedTableRef}`);
          console.log(`        keyColumn: ${origCfg.keyColumn}`);
          console.log(`        valueColumn: ${origCfg.valueColumn}`);
        }
      }
    }
  }

  if (missingConfigs === 0) {
    console.log('\n✅ Toutes les configs sont dupliquées correctement.');
  } else {
    console.log(`\n\n⚠️ TOTAL: ${missingConfigs} config(s) manquante(s)`);
  }

  console.log('\n' + '═'.repeat(80));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
