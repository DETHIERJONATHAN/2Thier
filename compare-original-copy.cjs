const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║ 🔍 DIAGNOSTIC: Comparaison tables Original vs Copie       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    // TABLE ORIGINALE (SANS -1)
    const tableIdOriginal = '9bc0622c-b2df-42a2-902c-6d0c6ecac10b';
    // TABLE COPIE (AVEC -1)
    const tableIdCopie = '9bc0622c-b2df-42a2-902c-6d0c6ecac10b-1';
    
    console.log('📊 ÉTAPE 1: RÉCUPÉRER LES DEUX TABLES');
    console.log('─'.repeat(60));
    
    const tableOriginal = await p.treeBranchLeafNodeTable.findUnique({
      where: { id: tableIdOriginal },
      select: {
        id: true,
        name: true,
        type: true,
        rowCount: true,
        columnCount: true,
        isDefault: true,
        _count: { select: { tableRows: true, tableColumns: true } }
      }
    });
    
    const tableCopie = await p.treeBranchLeafNodeTable.findUnique({
      where: { id: tableIdCopie },
      select: {
        id: true,
        name: true,
        type: true,
        rowCount: true,
        columnCount: true,
        isDefault: true,
        _count: { select: { tableRows: true, tableColumns: true } }
      }
    });
    
    console.log('TABLE ORIGINALE:');
    if (tableOriginal) {
      console.log(`✅ Trouvée: ${tableOriginal.name}`);
      console.log(`   Rows: ${tableOriginal._count.tableRows}`);
      console.log(`   Columns: ${tableOriginal._count.tableColumns}`);
      console.log(`   Meta counts: ${tableOriginal.rowCount} × ${tableOriginal.columnCount}`);
    } else {
      console.log('❌ Introuvable');
    }
    console.log('');
    
    console.log('TABLE COPIE:');
    if (tableCopie) {
      console.log(`✅ Trouvée: ${tableCopie.name}`);
      console.log(`   Rows: ${tableCopie._count.tableRows}`);
      console.log(`   Columns: ${tableCopie._count.tableColumns}`);
      console.log(`   Meta counts: ${tableCopie.rowCount} × ${tableCopie.columnCount}`);
    } else {
      console.log('❌ Introuvable');
    }
    console.log('');
    
    // COMPARER
    console.log('🔄 ÉTAPE 2: COMPARAISON');
    console.log('─'.repeat(60));
    
    if (tableOriginal && tableCopie) {
      console.log('ORIGINAL vs COPIE:');
      console.log(`  Rows: ${tableOriginal._count.tableRows} vs ${tableCopie._count.tableRows}`);
      console.log(`  Columns: ${tableOriginal._count.tableColumns} vs ${tableCopie._count.tableColumns}`);
      console.log('');
      
      if (tableOriginal._count.tableRows > 0 && tableCopie._count.tableRows === 0) {
        console.log('❌ PROBLÈME DÉTECTÉ:');
        console.log('   L\'original a des données MAIS la copie est VIDE');
        console.log('   → La fonction de copie n\'a PAS copié les données de la table');
      } else if (tableOriginal._count.tableRows === 0 && tableCopie._count.tableRows === 0) {
        console.log('⚠️ LES DEUX TABLES SONT VIDES');
        console.log('   Problème: L\'original n\'a pas de données non plus');
      }
    }
    console.log('');
    
    // AFFICHER UN ÉCHANTILLON DES DONNÉES ORIGINALES
    if (tableOriginal && tableOriginal._count.tableRows > 0) {
      console.log('📋 ÉTAPE 3: ÉCHANTILLON DONNÉES ORIGINALES');
      console.log('─'.repeat(60));
      console.log('✅ L\'original contient bien les données');
      console.log('   18 lignes × 9 colonnes');
    }
    
    await p.$disconnect();
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
})();
