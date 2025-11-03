#!/usr/bin/env node

/**
 * 🔍 DIAGNOSTIC COMPLET
 * Analyse le nœud dupliqué "9bc0622c-b2df-42a2-902c-6d0c6ecac10b-1"
 * Pour comprendre pourquoi il ne fonctionne pas
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnoseNode() {
  try {
    console.log('═'.repeat(100));
    console.log('🔍 DIAGNOSTIC: Nœud Dupliqué 9bc0622c-b2df-42a2-902c-6d0c6ecac10b-1');
    console.log('═'.repeat(100));

    // 1. Récupérer le nœud dupliqué
    console.log('\n📋 ÉTAPE 1: Récupérer le nœud dupliqué...');
    const duplicateNode = await prisma.treeBranchLeafNode.findFirst({
      where: {
        id: { contains: '9bc0622c-b2df-42a2-902c-6d0c6ecac10b-1' }
      }
    });

    if (!duplicateNode) {
      console.log('❌ Nœud NON TROUVÉ !');
      console.log('\nRecherche tous les nœuds avec cet ID ou similaire:');
      const similar = await prisma.treeBranchLeafNode.findMany({
        where: {
          id: { contains: '9bc0622c' }
        },
        select: {
          id: true,
          label: true,
          type: true,
          table_activeId: true,
          table_instances: true,
          table_name: true
        }
      });
      console.log(JSON.stringify(similar, null, 2));
      return;
    }

    console.log('✅ Nœud trouvé !');
    console.log(`   ID: ${duplicateNode.id}`);
    console.log(`   Label: ${duplicateNode.label}`);
    console.log(`   Type: ${duplicateNode.type}`);

    // 2. Vérifier les colonnes table
    console.log('\n📊 ÉTAPE 2: Vérifier les colonnes table...');
    console.log(`   table_activeId: ${duplicateNode.table_activeId}`);
    console.log(`   table_instances: ${JSON.stringify(duplicateNode.table_instances, null, 2)}`);
    console.log(`   table_name: ${duplicateNode.table_name}`);
    console.log(`   hasTable: ${duplicateNode.hasTable}`);

    if (!duplicateNode.table_activeId) {
      console.log('   ⚠️ PROBLÈME: table_activeId est NULL !');
    } else {
      console.log('   ✅ table_activeId existe');
    }

    if (!duplicateNode.table_instances) {
      console.log('   ⚠️ PROBLÈME: table_instances est NULL !');
    } else {
      console.log('   ✅ table_instances existe');
    }

    // 3. Récupérer le nœud original
    console.log('\n📋 ÉTAPE 3: Récupérer le nœud ORIGINAL pour comparer...');
    const originalId = duplicateNode.id.replace('-1', '');
    const originalNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: originalId },
      include: {
        children: {
          select: { id: true, label: true }
        }
      }
    });

    if (!originalNode) {
      console.log(`❌ Nœud original NOT FOUND: ${originalId}`);
      console.log('   Essai de chercher le pattern original...');
      const pattern = duplicateNode.id.split('-').slice(0, -1).join('-');
      const alternatives = await prisma.treeBranchLeafNode.findMany({
        where: {
          id: { startsWith: pattern }
        },
        select: {
          id: true,
          label: true,
          table_activeId: true,
          table_instances: true
        }
      });
      console.log('   Alternatives trouvées:');
      console.log(JSON.stringify(alternatives, null, 2));
    } else {
      console.log('✅ Nœud original trouvé !');
      console.log(`   ID: ${originalNode.id}`);
      console.log(`   Label: ${originalNode.label}`);
      console.log(`   table_activeId: ${originalNode.table_activeId}`);
      console.log(`   table_instances: ${JSON.stringify(originalNode.table_instances, null, 2)}`);

      // 4. COMPARAISON
      console.log('\n🔄 ÉTAPE 4: COMPARAISON Original vs Dupliqué...');
      console.log('\n   Colonne | Original | Dupliqué | Status');
      console.log('   ─'.repeat(50));

      const originalTableId = originalNode.table_activeId;
      const duplicateTableId = duplicateNode.table_activeId;
      console.log(`   table_activeId | ${originalTableId} | ${duplicateTableId} | ${
        originalTableId === duplicateTableId ? '✅ IDENTIQUE' : '❌ DIFFÉRENT !'
      }`);

      const originalInstances = JSON.stringify(originalNode.table_instances);
      const duplicateInstances = JSON.stringify(duplicateNode.table_instances);
      console.log(`   table_instances | [${originalInstances.length} chars] | [${duplicateInstances.length} chars] | ${
        originalInstances === duplicateInstances ? '✅ IDENTIQUE' : '❌ DIFFÉRENT !'
      }`);

      console.log(`   table_name | ${originalNode.table_name} | ${duplicateNode.table_name} | ${
        originalNode.table_name === duplicateNode.table_name ? '✅ IDENTIQUE' : '❌ DIFFÉRENT !'
      }`);
    }

    // 5. Vérifier la TABLE pointée
    if (duplicateNode.table_activeId) {
      console.log('\n📦 ÉTAPE 5: Vérifier la TABLE pointée...');
      const table = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: duplicateNode.table_activeId },
        include: {
          tableColumns: { select: { id: true, columnIndex: true, name: true }, take: 5 },
          tableRows: { select: { id: true, rowIndex: true }, take: 5 }
        }
      });

      if (!table) {
        console.log(`   ❌ TABLE NON TROUVÉE: ${duplicateNode.table_activeId}`);
      } else {
        console.log(`   ✅ TABLE trouvée`);
        console.log(`      ID: ${table.id}`);
        console.log(`      Name: ${table.name}`);
        console.log(`      Type: ${table.type}`);
        console.log(`      Colonnes: ${table.tableColumns.length} total, première 5:`);
        table.tableColumns.forEach(col => {
          console.log(`        - [${col.columnIndex}] ${col.name}`);
        });
        console.log(`      Lignes: ${table.tableRows.length} total, première 5:`);
        table.tableRows.forEach(row => {
          console.log(`        - [${row.rowIndex}]`);
        });

        // Vérifier meta.lookup
        console.log(`\n   Lookup Configuration:`);
        console.log(`      ${JSON.stringify(table.meta?.lookup, null, 6)}`);

        if (table.meta?.lookup) {
          const lookup = table.meta.lookup;

          // 6. Vérifier les SELECTORS
          console.log('\n📍 ÉTAPE 6: Vérifier les SELECTORS...');

          if (lookup.selectors?.rowFieldId) {
            const rowSelector = await prisma.treeBranchLeafNode.findUnique({
              where: { id: lookup.selectors.rowFieldId }
            });
            console.log(`\n   Selector LIGNES (rowFieldId):`);
            console.log(`      ID: ${lookup.selectors.rowFieldId}`);
            if (rowSelector) {
              console.log(`      ✅ Trouvé: ${rowSelector.label}`);
              console.log(`         table_activeId: ${rowSelector.table_activeId}`);
              console.log(`         table_instances: ${JSON.stringify(rowSelector.table_instances, null, 8)}`);
            } else {
              console.log(`      ❌ NON TROUVÉ !`);
            }
          }

          if (lookup.selectors?.columnFieldId) {
            const colSelector = await prisma.treeBranchLeafNode.findUnique({
              where: { id: lookup.selectors.columnFieldId }
            });
            console.log(`\n   Selector COLONNES (columnFieldId):`);
            console.log(`      ID: ${lookup.selectors.columnFieldId}`);
            if (colSelector) {
              console.log(`      ✅ Trouvé: ${colSelector.label}`);
              console.log(`         table_activeId: ${colSelector.table_activeId}`);
              console.log(`         table_instances: ${JSON.stringify(colSelector.table_instances, null, 8)}`);
            } else {
              console.log(`      ❌ NON TROUVÉ !`);
            }
          }
        }
      }
    } else {
      console.log('\n⚠️ ÉTAPE 5 SAUTÉE: table_activeId est NULL');
    }

    // 7. Vérifier les ENFANTS (nœuds avec ce nœud comme parent)
    console.log('\n👶 ÉTAPE 7: Vérifier les enfants du nœud dupliqué...');
    const children = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: duplicateNode.id },
      select: { id: true, label: true, table_activeId: true }
    });

    if (children && children.length > 0) {
      console.log(`   ${children.length} enfants trouvés:`);
      children.forEach((child, idx) => {
        console.log(`      [${idx}] ID: ${child.id}, Label: ${child.label}`);
        console.log(`          table_activeId: ${child.table_activeId}`);
      });

      // Vérifier les colonnes table des enfants
      if (children[0]) {
        const firstChild = await prisma.treeBranchLeafNode.findUnique({
          where: { id: children[0].id }
        });
        if (firstChild) {
          console.log(`\n   Premier enfant détails:`);
          console.log(`      table_activeId: ${firstChild.table_activeId}`);
          console.log(`      table_instances: ${JSON.stringify(firstChild.table_instances, null, 6)}`);
        }
      }
    } else {
      console.log('   ❌ Pas d\'enfants');
    }

    // RÉSUMÉ FINAL
    console.log('\n' + '═'.repeat(100));
    console.log('📊 RÉSUMÉ DES PROBLÈMES POTENTIELS:');
    console.log('═'.repeat(100));

    const issues = [];

    if (!duplicateNode.table_activeId) {
      issues.push('❌ table_activeId est NULL → Nœud orphelin');
    } else {
      issues.push('✅ table_activeId OK');
    }

    if (!duplicateNode.table_instances) {
      issues.push('❌ table_instances est NULL → Pas de configuration');
    } else {
      issues.push('✅ table_instances OK');
    }

    const table = duplicateNode.table_activeId
      ? await prisma.treeBranchLeafNodeTable.findUnique({
          where: { id: duplicateNode.table_activeId }
        })
      : null;

    if (!table) {
      issues.push('❌ Table pointée NON TROUVÉE');
    } else {
      issues.push('✅ Table pointée OK');
    }

    issues.forEach(issue => console.log(`   ${issue}`));

    console.log('\n');
  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseNode();
