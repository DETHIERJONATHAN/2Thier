#!/usr/bin/env node

/**
 * 🔍 DEBUG: Comparer les colonnes de la table originale vs copiée
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    console.log('═'.repeat(100));
    console.log('🔍 COMPARER TABLE ORIGINALE VS COPIÉE');
    console.log('═'.repeat(100));

    // TABLE ORIGINALE
    const tableOriginal = await p.treeBranchLeafNodeTable.findUnique({
      where: { id: '9bc0622c-b2df-42a2-902c-6d0c6ecac10b' }
    });

    // TABLE COPIÉE
    const tableCopied = await p.treeBranchLeafNodeTable.findUnique({
      where: { id: '9bc0622c-b2df-42a2-902c-6d0c6ecac10b-1' }
    });

    console.log('\n📊 TABLE ORIGINALE:');
    console.log(`  Colonnes (columns): ${tableOriginal.columns ? tableOriginal.columns.length : 0} colonnes`);
    if (tableOriginal.columns && tableOriginal.columns.length > 0) {
      tableOriginal.columns.slice(0, 5).forEach((col, i) => {
        console.log(`    [${i}] ${col.name || col.columnIndex}`);
      });
    }

    console.log(`  Lignes (rows): ${tableOriginal.rows ? tableOriginal.rows.length : 0} lignes`);
    if (tableOriginal.rows && tableOriginal.rows.length > 0) {
      tableOriginal.rows.slice(0, 3).forEach((row, i) => {
        console.log(`    [${i}] ${JSON.stringify(row).substring(0, 50)}...`);
      });
    }

    console.log(`  Matrice (matrix): ${tableOriginal.matrix ? tableOriginal.matrix.length : 0} lignes`);

    console.log('\n📊 TABLE COPIÉE:');
    console.log(`  Colonnes (columns): ${tableCopied.columns ? tableCopied.columns.length : 0} colonnes`);
    if (tableCopied.columns && tableCopied.columns.length > 0) {
      tableCopied.columns.slice(0, 5).forEach((col, i) => {
        console.log(`    [${i}] ${col.name || col.columnIndex}`);
      });
    } else {
      console.log(`    ⚠️  VIDE!`);
    }

    console.log(`  Lignes (rows): ${tableCopied.rows ? tableCopied.rows.length : 0} lignes`);
    if (tableCopied.rows && tableCopied.rows.length > 0) {
      tableCopied.rows.slice(0, 3).forEach((row, i) => {
        console.log(`    [${i}] ${JSON.stringify(row).substring(0, 50)}...`);
      });
    } else {
      console.log(`    ⚠️  VIDE!`);
    }

    console.log(`  Matrice (matrix): ${tableCopied.matrix ? tableCopied.matrix.length : 0} lignes`);
    if (tableCopied.matrix && tableCopied.matrix.length > 0) {
      tableCopied.matrix.slice(0, 3).forEach((row, i) => {
        console.log(`    [${i}] ${JSON.stringify(row).substring(0, 50)}...`);
      });
    } else {
      console.log(`    ⚠️  VIDE!`);
    }

    console.log('\n' + '═'.repeat(100));
    console.log('🔴 PROBLÈMES DÉTECTÉS:');
    console.log('═'.repeat(100));

    const issues = [];

    if (!tableCopied.columns || tableCopied.columns.length === 0) {
      issues.push('❌ Colonnes VIDES ou manquantes');
    } else if (tableOriginal.columns.length !== tableCopied.columns.length) {
      issues.push(`❌ Nombre de colonnes différent: ${tableOriginal.columns.length} vs ${tableCopied.columns.length}`);
    } else {
      issues.push('✅ Colonnes OK');
    }

    if (!tableCopied.rows || tableCopied.rows.length === 0) {
      issues.push('❌ Lignes VIDES ou manquantes');
    } else if (tableOriginal.rows.length !== tableCopied.rows.length) {
      issues.push(`❌ Nombre de lignes différent: ${tableOriginal.rows.length} vs ${tableCopied.rows.length}`);
    } else {
      issues.push('✅ Lignes OK');
    }

    if (!tableCopied.matrix || tableCopied.matrix.length === 0) {
      issues.push('❌ Matrice VIDE ou manquante');
    } else if (tableOriginal.matrix.length !== tableCopied.matrix.length) {
      issues.push(`❌ Matrice différente: ${tableOriginal.matrix.length} vs ${tableCopied.matrix.length}`);
    } else {
      issues.push('✅ Matrice OK');
    }

    console.log('');
    issues.forEach(i => console.log(`  ${i}`));

    console.log('\n');
    await p.$disconnect();
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
})();
