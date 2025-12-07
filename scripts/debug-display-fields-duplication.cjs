/**
 * 🔍 Script de diagnostic : Duplication des champs "données d'affichage"
 * 
 * Ce script analyse pourquoi les champs comme "Rampant toiture-1", 
 * "Longueur toiture-1", "Orientation-Inclinaison-1" ne se copient pas correctement.
 * 
 * Usage: node scripts/debug-display-fields-duplication.cjs
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Champs de données d'affichage connus (IDs ou labels partiels)
const DISPLAY_FIELD_LABELS = [
  'Rampant toiture',
  'Longueur toiture', 
  'Orientation-Inclinaison',
  'Orientation',
  'Inclinaison'
];

async function main() {
  console.log('═'.repeat(80));
  console.log('🔍 DIAGNOSTIC: Duplication des champs "données d\'affichage"');
  console.log('═'.repeat(80));
  console.log();

  // 1. Trouver tous les champs originaux (données d'affichage)
  console.log('📋 1. RECHERCHE DES CHAMPS ORIGINAUX (données d\'affichage)');
  console.log('-'.repeat(60));

  const originalDisplayFields = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: DISPLAY_FIELD_LABELS.map(label => ({
        label: { contains: label }
      })),
      NOT: {
        id: { contains: '-' } // Exclure les copies
      }
    },
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
      parentId: true
    }
  });

  console.log(`Trouvé ${originalDisplayFields.length} champs originaux:\n`);

  for (const field of originalDisplayFields) {
    console.log(`  📍 ${field.label} (${field.id.substring(0, 12)}...)`);
    console.log(`     - type: ${field.type} / subType: ${field.subType}`);
    console.log(`     - hasTable: ${field.hasTable} | hasData: ${field.hasData}`);
    console.log(`     - table_activeId: ${field.table_activeId || 'null'}`);
    console.log(`     - data_activeId: ${field.data_activeId || 'null'}`);
    console.log(`     - linkedTableIds: ${JSON.stringify(field.linkedTableIds)}`);
    console.log();
  }

  // 2. Vérifier les TreeBranchLeafSelectConfig pour ces champs originaux
  console.log('\n📋 2. CONFIGURATIONS SELECT POUR LES CHAMPS ORIGINAUX');
  console.log('-'.repeat(60));

  for (const field of originalDisplayFields) {
    const selectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
      where: { nodeId: field.id }
    });

    console.log(`  📍 ${field.label} (${field.id.substring(0, 12)}...)`);
    if (selectConfigs.length === 0) {
      console.log(`     ❌ AUCUNE configuration SELECT trouvée!`);
    } else {
      for (const cfg of selectConfigs) {
        console.log(`     ✅ Config SELECT trouvée:`);
        console.log(`        - tableReference: ${cfg.tableReference}`);
        console.log(`        - keyColumn: ${cfg.keyColumn} | valueColumn: ${cfg.valueColumn}`);
      }
    }
    console.log();
  }

  // 3. Chercher les copies (-1, -2, etc.) de ces champs
  console.log('\n📋 3. RECHERCHE DES COPIES (-1, -2, etc.)');
  console.log('-'.repeat(60));

  for (const field of originalDisplayFields) {
    // Chercher les copies basées sur l'ID original
    const copies = await prisma.treeBranchLeafNode.findMany({
      where: {
        id: { startsWith: field.id + '-' }
      },
      select: {
        id: true,
        label: true,
        hasTable: true,
        hasData: true,
        table_activeId: true,
        data_activeId: true,
        linkedTableIds: true
      }
    });

    console.log(`  📍 ${field.label} (original: ${field.id.substring(0, 12)}...)`);
    
    if (copies.length === 0) {
      console.log(`     ⚠️ AUCUNE copie trouvée (ID commençant par ${field.id}-)`);
    } else {
      for (const copy of copies) {
        console.log(`     📋 Copie: ${copy.label} (${copy.id})`);
        console.log(`        - hasTable: ${copy.hasTable} | hasData: ${copy.hasData}`);
        console.log(`        - table_activeId: ${copy.table_activeId || 'null'}`);
        console.log(`        - data_activeId: ${copy.data_activeId || 'null'}`);
        
        // Vérifier si la copie a une config SELECT
        const copySelectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
          where: { nodeId: copy.id }
        });
        
        if (copySelectConfigs.length === 0) {
          console.log(`        ❌ AUCUNE config SELECT pour la copie!`);
        } else {
          console.log(`        ✅ ${copySelectConfigs.length} config(s) SELECT trouvée(s)`);
          for (const cfg of copySelectConfigs) {
            console.log(`           - tableReference: ${cfg.tableReference}`);
          }
        }
      }
    }
    console.log();
  }

  // 4. Vérifier les tables TBL correspondantes
  console.log('\n📋 4. VÉRIFICATION DES TABLES TBL');
  console.log('-'.repeat(60));

  // Collecter tous les tableReference
  const allSelectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
    where: {
      nodeId: { in: originalDisplayFields.map(f => f.id) }
    }
  });

  for (const cfg of allSelectConfigs) {
    const tableId = cfg.tableReference;
    console.log(`  🗂️ Table: ${tableId}`);
    
    // Vérifier si la table originale existe
    const originalTable = await prisma.tBLMatrix.findUnique({
      where: { id: tableId }
    });
    
    if (originalTable) {
      console.log(`     ✅ Table originale existe: ${originalTable.name}`);
    } else {
      console.log(`     ❌ Table originale INTROUVABLE!`);
    }
    
    // Vérifier si une copie -1 existe
    const copiedTableId = tableId + '-1';
    const copiedTable = await prisma.tBLMatrix.findUnique({
      where: { id: copiedTableId }
    });
    
    if (copiedTable) {
      console.log(`     ✅ Table copiée (-1) existe: ${copiedTable.name}`);
    } else {
      console.log(`     ❌ Table copiée (-1) INTROUVABLE: ${copiedTableId}`);
    }
    console.log();
  }

  // 5. Résumé et recommandations
  console.log('\n' + '═'.repeat(80));
  console.log('📊 RÉSUMÉ ET RECOMMANDATIONS');
  console.log('═'.repeat(80));

  let issuesFound = 0;

  for (const field of originalDisplayFields) {
    const originalConfigs = await prisma.treeBranchLeafSelectConfig.count({
      where: { nodeId: field.id }
    });

    const copies = await prisma.treeBranchLeafNode.findMany({
      where: { id: { startsWith: field.id + '-' } },
      select: { id: true }
    });

    for (const copy of copies) {
      const copyConfigs = await prisma.treeBranchLeafSelectConfig.count({
        where: { nodeId: copy.id }
      });

      if (originalConfigs > 0 && copyConfigs === 0) {
        issuesFound++;
        console.log(`\n❌ PROBLÈME DÉTECTÉ:`);
        console.log(`   Original: ${field.label} (${field.id}) a ${originalConfigs} config(s)`);
        console.log(`   Copie: ${copy.id} a ${copyConfigs} config(s)`);
        console.log(`   → La duplication des SELECT configs n'a pas fonctionné!`);
      }
    }
  }

  if (issuesFound === 0) {
    console.log('\n✅ Aucun problème de duplication détecté.');
  } else {
    console.log(`\n⚠️ ${issuesFound} problème(s) de duplication détecté(s).`);
    console.log('\nPour réparer, vérifiez:');
    console.log('  1. Que tableLookupDuplicationService.duplicateTableLookupSystem() est appelé');
    console.log('  2. Que le suffixToken est correctement dérivé');
    console.log('  3. Que l\'originalNodeId correspond bien au champ de données d\'affichage');
  }

  console.log('\n' + '═'.repeat(80));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
