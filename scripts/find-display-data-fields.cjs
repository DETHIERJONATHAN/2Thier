/**
 * 🔍 Script pour lister tous les types de champs et trouver les données d'affichage
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('═'.repeat(80));
  console.log('🔍 RECHERCHE DES CHAMPS "DONNÉES D\'AFFICHAGE"');
  console.log('═'.repeat(80));

  // 1. Lister tous les types et subTypes distincts
  console.log('\n📋 1. TYPES ET SUBTYPES DISTINCTS');
  console.log('-'.repeat(60));

  const types = await prisma.treeBranchLeafNode.groupBy({
    by: ['type', 'subType'],
    _count: true,
    orderBy: { _count: { id: 'desc' } }
  });

  console.log('type | subType | count');
  console.log('-'.repeat(40));
  for (const t of types) {
    console.log(`${t.type || 'null'} | ${t.subType || 'null'} | ${t._count}`);
  }

  // 2. Chercher les champs avec hasTable=true ou hasData=true
  console.log('\n\n📋 2. CHAMPS AVEC hasTable=true OU hasData=true');
  console.log('-'.repeat(60));

  const dataFields = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { hasTable: true },
        { hasData: true }
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
      linkedTableIds: true
    },
    take: 50
  });

  console.log(`Trouvé ${dataFields.length} champs:\n`);
  for (const f of dataFields) {
    console.log(`  📍 ${f.label} (${f.id.substring(0, 20)}...)`);
    console.log(`     type: ${f.type} | subType: ${f.subType}`);
    console.log(`     hasTable: ${f.hasTable} | hasData: ${f.hasData}`);
    console.log(`     table_activeId: ${f.table_activeId || 'null'}`);
    console.log();
  }

  // 3. Chercher les SELECT configs existantes
  console.log('\n📋 3. SELECT CONFIGS EXISTANTES');
  console.log('-'.repeat(60));

  const selectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
    take: 30,
    include: {
      node: {
        select: { id: true, label: true }
      }
    }
  });

  console.log(`Trouvé ${selectConfigs.length} configs:\n`);
  for (const cfg of selectConfigs) {
    console.log(`  📍 Config: ${cfg.id.substring(0, 20)}...`);
    console.log(`     nodeId: ${cfg.nodeId}`);
    console.log(`     node label: ${cfg.node?.label || 'N/A'}`);
    console.log(`     tableReference: ${cfg.tableReference}`);
    console.log();
  }

  // 4. Chercher des champs qui pourraient être "toiture"
  console.log('\n📋 4. CHAMPS CONTENANT "TOITURE"');
  console.log('-'.repeat(60));

  const toitureFields = await prisma.treeBranchLeafNode.findMany({
    where: {
      label: { contains: 'toiture', mode: 'insensitive' }
    },
    select: {
      id: true,
      label: true,
      type: true,
      subType: true,
      hasTable: true,
      hasData: true
    },
    take: 30
  });

  console.log(`Trouvé ${toitureFields.length} champs:\n`);
  for (const f of toitureFields) {
    console.log(`  📍 ${f.label}`);
    console.log(`     id: ${f.id}`);
    console.log(`     type: ${f.type} | subType: ${f.subType}`);
    console.log(`     hasTable: ${f.hasTable} | hasData: ${f.hasData}`);
    console.log();
  }

  // 5. Chercher des champs qui ont des copies (-1, -2, etc)
  console.log('\n📋 5. CHAMPS QUI SONT DES COPIES (ID contient "-")');
  console.log('-'.repeat(60));

  const copies = await prisma.treeBranchLeafNode.findMany({
    where: {
      id: { contains: '-1' }
    },
    select: {
      id: true,
      label: true,
      type: true,
      subType: true,
      hasTable: true,
      hasData: true
    },
    take: 50
  });

  console.log(`Trouvé ${copies.length} copies:\n`);
  
  // Grouper par label pour voir les patterns
  const copyLabels = {};
  for (const c of copies) {
    if (!copyLabels[c.label]) {
      copyLabels[c.label] = [];
    }
    copyLabels[c.label].push(c);
  }

  for (const [label, items] of Object.entries(copyLabels)) {
    console.log(`  📍 "${label}" - ${items.length} copie(s)`);
    for (const item of items.slice(0, 3)) {
      console.log(`     - ${item.id}`);
      console.log(`       hasTable: ${item.hasTable} | hasData: ${item.hasData}`);
    }
    if (items.length > 3) {
      console.log(`     ... et ${items.length - 3} de plus`);
    }
    console.log();
  }

  // 6. Tables TBL existantes
  console.log('\n📋 6. TABLES TBL EXISTANTES');
  console.log('-'.repeat(60));

  const tables = await prisma.tBLMatrix.findMany({
    select: {
      id: true,
      name: true,
      nodeId: true
    },
    take: 30
  });

  console.log(`Trouvé ${tables.length} tables:\n`);
  for (const t of tables) {
    console.log(`  🗂️ ${t.name || 'Sans nom'}`);
    console.log(`     id: ${t.id}`);
    console.log(`     nodeId: ${t.nodeId || 'null'}`);
    console.log();
  }

  console.log('═'.repeat(80));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
