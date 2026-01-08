/**
 * 🔍 ANALYSE COMPLÈTE - Trace la chaîne complète du lookup
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function completeAnalysis() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🔍 ANALYSE COMPLÈTE: CHAÎNE DU LOOKUP DE BOUT EN BOUT          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Les deux nœuds Orientation
    const orientationNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: 'c071a466-5a0f-4b4e-afb0-fd69ac79d51a' }
    });

    const orientationNode1 = await prisma.treeBranchLeafNode.findUnique({
      where: { id: 'c071a466-5a0f-4b4e-afb0-fd69ac79d51a-1' }
    });

    console.log('1️⃣  LES SÉLECTEURS (Nœuds Orientation)\n');
    console.log(`   Original: "${orientationNode?.label}" (${orientationNode?.id})`);
    console.log(`   Copié: "${orientationNode1?.label}" (${orientationNode1?.id})\n`);

    // 2. Les deux tables de lookup
    const originalTable = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: 'f5e24326-ef46-469e-9fdc-0b53d9e2067b' },
      include: {
        tableColumns: { orderBy: { columnIndex: 'asc' } },
        tableRows: { take: 3, orderBy: { rowIndex: 'asc' } }
      }
    });

    const copiedTable = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: 'f5e24326-ef46-469e-9fdc-0b53d9e2067b-1' },
      include: {
        tableColumns: { orderBy: { columnIndex: 'asc' } },
        tableRows: { take: 3, orderBy: { rowIndex: 'asc' } }
      }
    });

    console.log('2️⃣  LES TABLES DE LOOKUP\n');
    console.log(`   Original: "${originalTable?.name}" (${originalTable?.id})`);
    console.log(`   - Propriétaire (nodeId): ${originalTable?.nodeId}`);
    console.log(`   - Colonnes: ${originalTable?.tableColumns.length}`);
    console.log(`   - Lignes: ${await prisma.treeBranchLeafNodeTableRow.count({where: {tableId: originalTable?.id}})}`);
    console.log(`   - Métadata type: ${typeof originalTable?.meta}`);
    console.log();

    console.log(`   Copié: "${copiedTable?.name}" (${copiedTable?.id})`);
    console.log(`   - Propriétaire (nodeId): ${copiedTable?.nodeId}`);
    console.log(`   - Colonnes: ${copiedTable?.tableColumns.length}`);
    console.log(`   - Lignes: ${await prisma.treeBranchLeafNodeTableRow.count({where: {tableId: copiedTable?.id}})}`);
    console.log(`   - Métadata type: ${typeof copiedTable?.meta}`);
    console.log();

    // 3. Détail des colonnes
    console.log('3️⃣  DÉTAIL DES COLONNES\n');
    console.log('   Original:');
    originalTable?.tableColumns.forEach((col, idx) => {
      console.log(`     [${idx}] "${col.name}" (id: ${col.id})`);
    });
    console.log();

    console.log('   Copié:');
    copiedTable?.tableColumns.forEach((col, idx) => {
      console.log(`     [${idx}] "${col.name}" (id: ${col.id})`);
    });
    console.log();

    // 4. Métadata complètes
    console.log('4️⃣  MÉTADATA COMPLÈTES\n');
    console.log('   Original:');
    const origMeta = originalTable?.meta as any;
    console.log(`   - enabled: ${origMeta?.lookup?.enabled}`);
    console.log(`   - columnFieldId (sélecteur): ${origMeta?.lookup?.selectors?.columnFieldId}`);
    console.log(`   - comparisonColumn: "${origMeta?.lookup?.rowSourceOption?.comparisonColumn}"`);
    console.log(`   - sourceField: ${origMeta?.lookup?.rowSourceOption?.sourceField}`);
    console.log();

    console.log('   Copié:');
    const copiedMeta = copiedTable?.meta as any;
    console.log(`   - enabled: ${copiedMeta?.lookup?.enabled}`);
    console.log(`   - columnFieldId (sélecteur): ${copiedMeta?.lookup?.selectors?.columnFieldId}`);
    console.log(`   - comparisonColumn: "${copiedMeta?.lookup?.rowSourceOption?.comparisonColumn}"`);
    console.log(`   - sourceField: ${copiedMeta?.lookup?.rowSourceOption?.sourceField}`);
    console.log();

    // 5. Vérifier si les IDs référencés existent
    console.log('5️⃣  VÉRIFICATION DES RÉFÉRENCES\n');

    // columnFieldId doit pointer vers le nœud sélecteur
    const origColumnField = await prisma.treeBranchLeafNode.findUnique({
      where: { id: origMeta?.lookup?.selectors?.columnFieldId }
    });

    const copiedColumnField = await prisma.treeBranchLeafNode.findUnique({
      where: { id: copiedMeta?.lookup?.selectors?.columnFieldId }
    });

    console.log(`   columnFieldId (Original): ${origMeta?.lookup?.selectors?.columnFieldId}`);
    console.log(`   - Nœud trouvé: ${origColumnField ? `"${origColumnField.label}"` : '❌ NON TROUVÉ'}`);
    console.log();

    console.log(`   columnFieldId (Copié): ${copiedMeta?.lookup?.selectors?.columnFieldId}`);
    console.log(`   - Nœud trouvé: ${copiedColumnField ? `"${copiedColumnField.label}"` : '❌ NON TROUVÉ'}`);
    console.log();

    // sourceField doit pointer vers le champ qui contient la valeur pour le lookup
    const origSourceField = await prisma.treeBranchLeafNode.findUnique({
      where: { id: origMeta?.lookup?.rowSourceOption?.sourceField }
    });

    const copiedSourceField = await prisma.treeBranchLeafNode.findUnique({
      where: { id: copiedMeta?.lookup?.rowSourceOption?.sourceField }
    });

    console.log(`   sourceField (Original): ${origMeta?.lookup?.rowSourceOption?.sourceField}`);
    console.log(`   - Nœud trouvé: ${origSourceField ? `"${origSourceField.label}"` : '❌ NON TROUVÉ'}`);
    console.log();

    console.log(`   sourceField (Copié): ${copiedMeta?.lookup?.rowSourceOption?.sourceField}`);
    console.log(`   - Nœud trouvé: ${copiedSourceField ? `"${copiedSourceField.label}"` : '❌ NON TROUVÉ'}`);
    console.log();

    // 6. Vérifier la cohérence des noms de colonnes
    console.log('6️⃣  COHÉRENCE DES NOMS DE COLONNES\n');
    
    const origComparisonCol = originalTable?.tableColumns.find(
      c => c.name === origMeta?.lookup?.rowSourceOption?.comparisonColumn
    );
    
    const copiedComparisonCol = copiedTable?.tableColumns.find(
      c => c.name === copiedMeta?.lookup?.rowSourceOption?.comparisonColumn
    );

    console.log(`   Original - comparisonColumn: "${origMeta?.lookup?.rowSourceOption?.comparisonColumn}"`);
    console.log(`   - Colonne existe: ${origComparisonCol ? '✅ OUI' : '❌ NON'}`);
    if (origComparisonCol) {
      console.log(`   - Index: ${origComparisonCol.columnIndex}, ID: ${origComparisonCol.id}`);
    }
    console.log();

    console.log(`   Copié - comparisonColumn: "${copiedMeta?.lookup?.rowSourceOption?.comparisonColumn}"`);
    console.log(`   - Colonne existe: ${copiedComparisonCol ? '✅ OUI' : '❌ NON'}`);
    if (copiedComparisonCol) {
      console.log(`   - Index: ${copiedComparisonCol.columnIndex}, ID: ${copiedComparisonCol.id}`);
    }
    console.log();

    // 7. Exemple de données
    console.log('7️⃣  EXEMPLE DE DONNÉES (PREMIÈRE LIGNE)\n');
    
    if (originalTable?.tableRows && originalTable.tableRows.length > 0) {
      const row = originalTable.tableRows[0];
      console.log('   Original:');
      console.log(`     Row Index: ${row.rowIndex}`);
      console.log(`     Cells:`, row.cells);
      // Mapper les cells aux colonnes
      originalTable.tableColumns.forEach((col, idx) => {
        console.log(`       [${idx}] ${col.name} = ${row.cells?.[idx]}`);
      });
    }
    console.log();

    if (copiedTable?.tableRows && copiedTable.tableRows.length > 0) {
      const row = copiedTable.tableRows[0];
      console.log('   Copié:');
      console.log(`     Row Index: ${row.rowIndex}`);
      console.log(`     Cells:`, row.cells);
      // Mapper les cells aux colonnes
      copiedTable.tableColumns.forEach((col, idx) => {
        console.log(`       [${idx}] ${col.name} = ${row.cells?.[idx]}`);
      });
    }
    console.log();

    // 8. RÉSUMÉ ET DIAGNOSTIC FINAL
    console.log('8️⃣  ✅ RÉSUMÉ ET DIAGNOSTIC\n');

    let hasIssues = false;

    console.log('   CHECKS:');
    
    // Check 1: Métadata
    if (origMeta?.lookup?.enabled && copiedMeta?.lookup?.enabled) {
      console.log('   ✅ Lookup ACTIVÉ dans les deux métadata');
    } else {
      console.log('   ❌ Lookup DÉSACTIVÉ!');
      hasIssues = true;
    }

    // Check 2: columnFieldId
    if (origColumnField && copiedColumnField) {
      console.log(`   ✅ columnFieldId valide dans les deux tables`);
    } else {
      console.log(`   ❌ columnFieldId invalide!`);
      hasIssues = true;
    }

    // Check 3: Colonnes de comparaison
    if (origComparisonCol && copiedComparisonCol) {
      console.log(`   ✅ Colonnes de comparaison existent`);
    } else {
      console.log(`   ❌ Colonnes de comparaison manquent!`);
      hasIssues = true;
    }

    // Check 4: sourceField
    if (origSourceField && copiedSourceField) {
      console.log(`   ✅ sourceField valide`);
    } else {
      console.log(`   ❌ sourceField invalide!`);
      hasIssues = true;
    }

    // Check 5: Données
    const origRowCount = await prisma.treeBranchLeafNodeTableRow.count({
      where: { tableId: originalTable?.id }
    });
    const copiedRowCount = await prisma.treeBranchLeafNodeTableRow.count({
      where: { tableId: copiedTable?.id }
    });

    if (origRowCount > 0 && copiedRowCount > 0) {
      console.log(`   ✅ Données présentes dans les deux tables (${origRowCount} et ${copiedRowCount} lignes)`);
    } else {
      console.log(`   ❌ Données manquentes!`);
      hasIssues = true;
    }

    console.log();
    if (!hasIssues) {
      console.log('   🎉 TOUT SEMBLE CORRECT À PREMIÈRE VUE!');
      console.log('   Le problème doit être dans le code FRONTEND ou dans');
      console.log('   la façon dont le lookup est EXÉCUTÉ par le composant React.');
    } else {
      console.log('   ⚠️  PROBLÈMES DÉTECTÉS - Voir les ❌ ci-dessus');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n╚════════════════════════════════════════════════════════════════╝\n');
}

completeAnalysis();
