#!/usr/bin/env node

/**
 * 🔍 DEBUG: Vérifier ce qui manque exactement dans la table copiée
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    console.log('═'.repeat(100));
    console.log('🔍 DIAGNOSTIC: Qu\'est-ce qui manque dans la table copiée?');
    console.log('═'.repeat(100));

    const tableOriginal = await p.treeBranchLeafNodeTable.findUnique({
      where: { id: '9bc0622c-b2df-42a2-902c-6d0c6ecac10b' }
    });

    const tableCopied = await p.treeBranchLeafNodeTable.findUnique({
      where: { id: '9bc0622c-b2df-42a2-902c-6d0c6ecac10b-1' }
    });

    console.log('\n📦 TABLE ORIGINALE:');
    console.log(`  columns count: ${tableOriginal.columns ? tableOriginal.columns.length : 0}`);
    console.log(`  rows count: ${tableOriginal.rows ? tableOriginal.rows.length : 0}`);
    console.log(`  matrix count: ${tableOriginal.matrix ? tableOriginal.matrix.length : 0}`);

    console.log('\n📦 TABLE COPIÉE:');
    console.log(`  columns count: ${tableCopied.columns ? tableCopied.columns.length : 0}`);
    console.log(`  rows count: ${tableCopied.rows ? tableCopied.rows.length : 0}`);
    console.log(`  matrix count: ${tableCopied.matrix ? tableCopied.matrix.length : 0}`);

    console.log('\n' + '═'.repeat(100));
    console.log('🎯 DÉTECTION AUTOMATIQUE DES MANQUES:');
    console.log('═'.repeat(100));

    const issues = [];

    // Comparer les colonnes
    if (!tableCopied.columns) {
      issues.push(`❌ Colonnes NULL`);
    } else if (tableCopied.columns.length === 0) {
      issues.push(`❌ Colonnes VIDES (${tableOriginal.columns.length} attendues)`);
    } else if (tableCopied.columns.length !== tableOriginal.columns.length) {
      issues.push(`❌ Colonnes incomplètes: ${tableCopied.columns.length}/${tableOriginal.columns.length}`);
    }

    // Comparer les lignes
    if (!tableCopied.rows) {
      issues.push(`❌ Lignes NULL`);
    } else if (tableCopied.rows.length === 0) {
      issues.push(`❌ Lignes VIDES (${tableOriginal.rows.length} attendues)`);
    } else if (tableCopied.rows.length !== tableOriginal.rows.length) {
      issues.push(`❌ Lignes incomplètes: ${tableCopied.rows.length}/${tableOriginal.rows.length}`);
    }

    // Comparer la matrice
    if (!tableCopied.matrix) {
      issues.push(`❌ Matrice NULL`);
    } else if (tableCopied.matrix.length === 0) {
      issues.push(`❌ Matrice VIDE (${tableOriginal.matrix.length} attendues)`);
    } else if (tableCopied.matrix.length !== tableOriginal.matrix.length) {
      issues.push(`❌ Matrice incomplète: ${tableCopied.matrix.length}/${tableOriginal.matrix.length}`);
    }

    if (issues.length === 0) {
      console.log('✅ TOUT EST OK - Aucun problème détecté');
    } else {
      console.log('');
      issues.forEach((issue, i) => {
        console.log(`\n${i + 1}. ${issue}`);
      });
    }

    console.log('\n');
    await p.$disconnect();
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
})();
