#!/usr/bin/env node

/**
 * 🔄 SCRIPT DE COPIE DE DONNÉES DE TABLE (avec IDs uniques)
 * 
 * Copie les données des tableRows et tableColumns de la table originale
 * vers la table copie en générant de nouveaux IDs.
 * 
 * Usage: node copy-table-final.cjs
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Générer un ID unique
function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

(async () => {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║ 🔄 COPIE FINALE: Original → Copie (avec nouveaux IDs)    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    const tableIdOriginal = '9bc0622c-b2df-42a2-902c-6d0c6ecac10b';
    const tableIdCopie = '9bc0622c-b2df-42a2-902c-6d0c6ecac10b-1';
    
    console.log('📋 ÉTAPE 1: VÉRIFIER LES SOURCES');
    console.log('─'.repeat(60));
    
    const tableOriginal = await p.treeBranchLeafNodeTable.findUnique({
      where: { id: tableIdOriginal },
      select: {
        id: true,
        name: true,
        _count: { select: { tableRows: true, tableColumns: true } }
      }
    });
    
    const tableCopie = await p.treeBranchLeafNodeTable.findUnique({
      where: { id: tableIdCopie },
      select: {
        id: true,
        name: true,
        _count: { select: { tableRows: true, tableColumns: true } }
      }
    });
    
    console.log(`Original: ${tableOriginal?._count.tableRows} rows, ${tableOriginal?._count.tableColumns} cols`);
    console.log(`Copie (avant): ${tableCopie?._count.tableRows} rows, ${tableCopie?._count.tableColumns} cols`);
    console.log('');
    
    if (!tableOriginal || !tableCopie) {
      console.error('❌ Tables introuvables');
      process.exit(1);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // ÉTAPE 2: COPIER LES COLONNES AVEC NOUVEAUX IDS
    // ═══════════════════════════════════════════════════════════════════
    console.log('📝 ÉTAPE 2: COPIE DES COLONNES');
    console.log('─'.repeat(60));
    
    const originalColumns = await p.$queryRaw`
      SELECT "id", "tableId", "columnIndex", "name", "type", "width", "format", "metadata"
      FROM "TreeBranchLeafNodeTableColumn" 
      WHERE "tableId" = ${tableIdOriginal}
      ORDER BY "columnIndex" ASC
    `;
    
    console.log(`Récupération: ${originalColumns.length} colonnes`);
    
    let copiedColumns = 0;
    for (const col of originalColumns) {
      try {
        const newId = generateId();
        await p.treeBranchLeafNodeTableColumn.create({
          data: {
            id: newId,
            tableId: tableIdCopie,
            columnIndex: col.columnIndex,
            name: col.name,
            type: col.type || 'text',
            width: col.width,
            format: col.format,
            metadata: col.metadata
          }
        });
        copiedColumns++;
        console.log(`  ✓ [${col.columnIndex}] "${col.name}" (id: ${newId})`);
      } catch (e) {
        console.warn(`  ⚠️ [${col.columnIndex}] Erreur: ${e.message.split('\n')[0].substring(0, 80)}`);
      }
    }
    
    console.log(`✅ ${copiedColumns}/${originalColumns.length} colonnes copiées`);
    console.log('');
    
    // ═══════════════════════════════════════════════════════════════════
    // ÉTAPE 3: COPIER LES LIGNES AVEC NOUVEAUX IDS
    // ═══════════════════════════════════════════════════════════════════
    console.log('📝 ÉTAPE 3: COPIE DES LIGNES');
    console.log('─'.repeat(60));
    
    const originalRows = await p.$queryRaw`
      SELECT "id", "tableId", "rowIndex", "cells"
      FROM "TreeBranchLeafNodeTableRow"
      WHERE "tableId" = ${tableIdOriginal}
      ORDER BY "rowIndex" ASC
    `;
    
    console.log(`Récupération: ${originalRows.length} lignes`);
    
    let copiedRows = 0;
    for (const row of originalRows) {
      try {
        const newId = generateId();
        await p.treeBranchLeafNodeTableRow.create({
          data: {
            id: newId,
            tableId: tableIdCopie,
            rowIndex: row.rowIndex,
            cells: row.cells
          }
        });
        copiedRows++;
        if (copiedRows % 5 === 0) {
          console.log(`  ✓ ${copiedRows}/${originalRows.length} lignes copiées...`);
        }
      } catch (e) {
        console.warn(`  ⚠️ [${row.rowIndex}] Erreur: ${e.message.split('\n')[0].substring(0, 80)}`);
      }
    }
    
    console.log(`✅ ${copiedRows}/${originalRows.length} lignes copiées`);
    console.log('');
    
    // ═══════════════════════════════════════════════════════════════════
    // ÉTAPE 4: METTRE À JOUR LES MÉTADONNÉES
    // ═══════════════════════════════════════════════════════════════════
    console.log('📊 ÉTAPE 4: MISE À JOUR DES MÉTADONNÉES');
    console.log('─'.repeat(60));
    
    await p.treeBranchLeafNodeTable.update({
      where: { id: tableIdCopie },
      data: {
        rowCount: copiedRows,
        columnCount: copiedColumns,
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ Métadonnées mises à jour:`);
    console.log(`   rowCount: ${copiedRows}`);
    console.log(`   columnCount: ${copiedColumns}`);
    console.log('');
    
    // ═══════════════════════════════════════════════════════════════════
    // ÉTAPE 5: VÉRIFICATION FINALE
    // ═══════════════════════════════════════════════════════════════════
    console.log('✅ ÉTAPE 5: VÉRIFICATION FINALE');
    console.log('─'.repeat(60));
    
    const tableCopieAfter = await p.treeBranchLeafNodeTable.findUnique({
      where: { id: tableIdCopie },
      select: {
        id: true,
        name: true,
        rowCount: true,
        columnCount: true,
        _count: { select: { tableRows: true, tableColumns: true } }
      }
    });
    
    console.log(`Copie (après):`);
    console.log(`   Rows en DB: ${tableCopieAfter?._count.tableRows}`);
    console.log(`   Columns en DB: ${tableCopieAfter?._count.tableColumns}`);
    console.log(`   rowCount (meta): ${tableCopieAfter?.rowCount}`);
    console.log(`   columnCount (meta): ${tableCopieAfter?.columnCount}`);
    console.log('');
    
    if (tableCopieAfter?._count.tableRows === copiedRows && 
        tableCopieAfter?._count.tableColumns === copiedColumns &&
        copiedRows > 0 && copiedColumns > 0) {
      console.log('🎉 SUCCESS! Les données ont été copiées avec succès !');
      console.log('');
      console.log('RÉSULTAT:');
      console.log(`  ✅ ${copiedColumns} colonnes`);
      console.log(`  ✅ ${copiedRows} lignes`);
      console.log('');
      console.log('✨ La variable "Orientation - inclinaison-1" devrait maintenant');
      console.log('   avoir des données à rechercher dans la table !');
      console.log('');
      console.log('🔧 PROCHAINE ÉTAPE:');
      console.log('   Intégrer cette logique dans le système de copie de nœud');
    } else {
      console.log('⚠️ Vérification échouée');
      console.log(`   Expected: ${copiedRows} rows, ${copiedColumns} cols`);
      console.log(`   Got: ${tableCopieAfter?._count.tableRows} rows, ${tableCopieAfter?._count.tableColumns} cols`);
    }
    
    await p.$disconnect();
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
