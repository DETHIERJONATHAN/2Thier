#!/usr/bin/env node

/**
 * 🔄 SCRIPT DE COPIE DE DONNÉES DE TABLE
 * 
 * Copie les tableRows et tableColumns de la table originale
 * vers la table copie pour tester la solution.
 * 
 * Usage: node copy-table-data.cjs
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║ 🔄 COPIE DE DONNÉES: Table originale → Copie             ║');
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
    // ÉTAPE 2: RÉCUPÉRER TOUTES LES COLONNES DE L'ORIGINAL
    // ═══════════════════════════════════════════════════════════════════
    console.log('📝 ÉTAPE 2: COPIE DES COLONNES');
    console.log('─'.repeat(60));
    
    const originalColumns = await p.$queryRaw`
      SELECT * FROM "TreeBranchLeafNodeTableColumn" 
      WHERE "tableId" = ${tableIdOriginal}
      ORDER BY "columnIndex" ASC
    `;
    
    console.log(`Récupération: ${originalColumns.length} colonnes`);
    
    let copiedColumns = 0;
    for (const col of originalColumns) {
      try {
        await p.$executeRaw`
          INSERT INTO "TreeBranchLeafNodeTableColumn" (
            "id", "tableId", "columnIndex", "name", "type", "width", 
            "format", "metadata", "createdAt", "updatedAt"
          ) VALUES (
            ${col.id},
            ${tableIdCopie},
            ${col.columnIndex},
            ${col.name},
            ${col.type},
            ${col.width},
            ${col.format},
            ${col.metadata},
            ${col.createdAt},
            ${col.updatedAt}
          )
        `;
        copiedColumns++;
      } catch (e) {
        console.warn(`⚠️ Erreur colonne ${col.columnIndex}: ${e.message}`);
      }
    }
    
    console.log(`✅ ${copiedColumns} colonnes copiées`);
    console.log('');
    
    // ═══════════════════════════════════════════════════════════════════
    // ÉTAPE 3: RÉCUPÉRER TOUTES LES LIGNES DE L'ORIGINAL
    // ═══════════════════════════════════════════════════════════════════
    console.log('📝 ÉTAPE 3: COPIE DES LIGNES');
    console.log('─'.repeat(60));
    
    const originalRows = await p.$queryRaw`
      SELECT * FROM "TreeBranchLeafNodeTableRow"
      WHERE "tableId" = ${tableIdOriginal}
      ORDER BY "rowIndex" ASC
    `;
    
    console.log(`Récupération: ${originalRows.length} lignes`);
    
    let copiedRows = 0;
    for (const row of originalRows) {
      try {
        await p.$executeRaw`
          INSERT INTO "TreeBranchLeafNodeTableRow" (
            "id", "tableId", "rowIndex", "cells", "createdAt", "updatedAt"
          ) VALUES (
            ${row.id},
            ${tableIdCopie},
            ${row.rowIndex},
            ${row.cells},
            ${row.createdAt},
            ${row.updatedAt}
          )
        `;
        copiedRows++;
      } catch (e) {
        console.warn(`⚠️ Erreur ligne ${row.rowIndex}: ${e.message}`);
      }
    }
    
    console.log(`✅ ${copiedRows} lignes copiées`);
    console.log('');
    
    // ═══════════════════════════════════════════════════════════════════
    // ÉTAPE 4: METTRE À JOUR LES MÉTADONNÉES DE LA TABLE COPIE
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
        tableCopieAfter?._count.tableColumns === copiedColumns) {
      console.log('🎉 SUCCESS! Les données ont été copiées avec succès !');
      console.log('');
      console.log('RÉSULTAT:');
      console.log(`  ✅ ${copiedColumns} colonnes`);
      console.log(`  ✅ ${copiedRows} lignes`);
      console.log('');
      console.log('La variable "Orientation - inclinaison-1" devrait maintenant avoir');
      console.log('des données à rechercher dans la table !');
    } else {
      console.log('⚠️ Vérification échouée - mismatch entre counts');
    }
    
    await p.$disconnect();
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
