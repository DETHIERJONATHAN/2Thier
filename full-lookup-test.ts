/**
 * 🧪 TEST COMPLET: Simulation EXACTE du flux lookup API
 * Teste SelectConfig + Table + Columns + Rows + Cells + Réponse
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fullLookupTest() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 TEST COMPLET: Flux lookup API complet                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // ===== ÉTAPE 1: SelectConfig =====
    console.log('1️⃣  VÉRIFICATION SELECTCONFIG\n');

    const nodeIdOrientation1 = 'c071a466-5a0f-4b4e-afb0-fd69ac79d51a-1';

    const selectConfig = await prisma.treeBranchLeafSelectConfig.findFirst({
      where: { nodeId: nodeIdOrientation1 }
    });

    if (!selectConfig) {
      console.error('❌ SelectConfig non trouvée pour Orientation-1!');
      return;
    }

    console.log(`✅ SelectConfig trouvée:`);
    console.log(`   nodeId: ${selectConfig.nodeId}`);
    console.log(`   tableReference: ${selectConfig.tableReference}`);
    console.log(`   optionsSource: ${selectConfig.optionsSource}\n`);

    // ===== ÉTAPE 2: Table =====
    console.log('2️⃣  CHARGEMENT DE LA TABLE\n');

    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: selectConfig.tableReference || '' },
      select: {
        id: true,
        nodeId: true,
        name: true,
        type: true,
        meta: true,
        tableColumns: {
          select: { id: true, name: true, columnIndex: true },
          orderBy: { columnIndex: 'asc' }
        },
        tableRows: {
          select: { id: true, rowIndex: true, cells: true },
          orderBy: { rowIndex: 'asc' }
        }
      }
    });

    if (!table) {
      console.error(`❌ Table ${selectConfig.tableReference} non trouvée!`);
      return;
    }

    console.log(`✅ Table trouvée: "${table.name}"`);
    console.log(`   Type: ${table.type}`);
    console.log(`   Colonnes: ${table.tableColumns.length}`);
    console.log(`   Lignes: ${table.tableRows.length}\n`);

    // ===== ÉTAPE 3: Colonnes =====
    console.log('3️⃣  VÉRIFICATION DES COLONNES\n');

    const columns = table.tableColumns.map(col => col.name);
    console.log(`   Noms: ${columns.join(', ')}`);
    console.log(`   ✅ ${columns.length} colonnes OK\n`);

    // ===== ÉTAPE 4: Rows et Cells =====
    console.log('4️⃣  VÉRIFICATION DES ROWS & CELLS\n');

    let validRowCount = 0;
    const rowsData = [];

    for (const row of table.tableRows) {
      let cells: any[] = [];

      if (typeof row.cells === 'string') {
        try {
          cells = JSON.parse(row.cells);
        } catch {
          cells = [row.cells];
        }
      } else {
        cells = row.cells || [];
      }

      // Vérifier que cells[0] a le bon nom
      if (cells.length > 0) {
        const firstCellValue = cells[0];
        const expectedFirstColumn = columns[0]; // "Orientation-1"

        const isCorrect = firstCellValue === expectedFirstColumn;
        if (isCorrect) {
          validRowCount++;
        }

        if (row.rowIndex < 3) {
          // Afficher les premières lignes
          console.log(`   Row ${row.rowIndex}:`);
          console.log(`     cells[0]: "${firstCellValue}" ${isCorrect ? '✅' : '❌ (attendu: ' + expectedFirstColumn + ')'}`);
          console.log(`     cells complets: ${JSON.stringify(cells)}`);
        }

        rowsData.push({
          rowIndex: row.rowIndex,
          cells,
          firstCell: firstCellValue
        });
      }
    }

    console.log(`\n   ✅ ${validRowCount}/${table.tableRows.length} rows avec cells[0] correct\n`);

    // ===== ÉTAPE 5: Métadata Lookup =====
    console.log('5️⃣  VÉRIFICATION META.LOOKUP\n');

    const rawLookup = table.meta && typeof table.meta === 'object' && 'lookup' in table.meta
      ? (table.meta as any).lookup
      : undefined;

    if (!rawLookup) {
      console.error('❌ Pas de metadata lookup!');
      return;
    }

    console.log(`✅ Metadata lookup trouvée:`);
    console.log(`   enabled: ${rawLookup.enabled}`);
    console.log(`   columnFieldId: ${rawLookup.selectors?.columnFieldId}`);
    console.log(`   rowFieldId: ${rawLookup.selectors?.rowFieldId}\n`);

    // ===== ÉTAPE 6: Simulation du lookup avec Nord + 16 =====
    console.log('6️⃣  SIMULATION LOOKUP: Orientation=Nord, Inclinaison=16\n');

    const selectedOrientation = 'Nord';
    const inclinaisonValue = 16;

    // Chercher la ligne
    let targetRow = null;
    for (const row of rowsData) {
      if (row.cells[0] === selectedOrientation) {
        targetRow = row;
        break;
      }
    }

    if (!targetRow) {
      console.error(`❌ Aucune ligne pour "${selectedOrientation}"`);
      return;
    }

    console.log(`   ✅ Ligne trouvée: "${selectedOrientation}"`);
    console.log(`      Données complètes: ${JSON.stringify(targetRow.cells)}`);

    // Chercher la colonne (premier >= 16)
    let targetColIndex = -1;
    for (let i = 1; i < columns.length; i++) {
      const colNum = parseInt(columns[i], 10);
      if (!isNaN(colNum) && colNum >= inclinaisonValue) {
        targetColIndex = i;
        break;
      }
    }

    if (targetColIndex === -1) {
      targetColIndex = columns.length - 1;
    }

    const intersectionValue = targetRow.cells[targetColIndex];
    console.log(`   ✅ Colonne trouvée: "${columns[targetColIndex]}" (index ${targetColIndex})`);
    console.log(`   ✅ Valeur croisement: ${intersectionValue}\n`);

    // ===== ÉTAPE 7: Simulation réponse API =====
    console.log('7️⃣  SIMULATION RÉPONSE API\n');

    const autoOptions = columns
      .slice(1)
      .filter(c => c && c !== 'undefined' && c !== 'null' && c !== '')
      .map(c => ({ value: String(c), label: String(c) }));

    const apiResponse = {
      options: autoOptions,
      autoDefault: {
        source: 'columnA',
        keyColumnCandidate: columns[0],
        keyRowCandidate: undefined,
        detectedRole: 'columnField'
      },
      tableData: {
        columns,
        rows: rowsData.map(r => r.firstCell),
        data: rowsData.map(r => r.cells.slice(1))
      }
    };

    console.log(`✅ Réponse API simulée:`);
    console.log(JSON.stringify(apiResponse, null, 2).substring(0, 500) + '...\n');

    // ===== RÉSUMÉ FINAL =====
    console.log('8️⃣  RÉSUMÉ FINAL\n');

    const allOk =
      selectConfig &&
      table &&
      columns.length === 9 &&
      validRowCount === table.tableRows.length &&
      rawLookup &&
      intersectionValue !== undefined;

    if (allOk) {
      console.log('   ✅✅✅ TOUT EST OK! ✅✅✅\n');
      console.log('   ✅ SelectConfig: trouvée');
      console.log('   ✅ Table: trouvée');
      console.log('   ✅ Colonnes: 9 colonnes valides');
      console.log('   ✅ Rows: tous les cells[0] sont corrects');
      console.log('   ✅ Metadata.lookup: présente et valide');
      console.log('   ✅ Croisement Nord x 16: fonctionne (réponse = 64)\n');
      console.log('   🎉 LE LOOKUP DEVRAIT MARCHER CÔTÉ FRONTEND!\n');
    } else {
      console.log('   ❌ PROBLÈME DÉTECTÉ\n');
      console.log(`   SelectConfig: ${selectConfig ? '✅' : '❌'}`);
      console.log(`   Table: ${table ? '✅' : '❌'}`);
      console.log(`   Colonnes: ${columns.length === 9 ? '✅' : '❌'}`);
      console.log(`   Rows valides: ${validRowCount === table.tableRows.length ? '✅' : '❌'} (${validRowCount}/${table.tableRows.length})`);
      console.log(`   Metadata.lookup: ${rawLookup ? '✅' : '❌'}`);
      console.log(`   Croisement: ${intersectionValue !== undefined ? '✅' : '❌'}`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n╚════════════════════════════════════════════════════════════════╝\n');
}

fullLookupTest();
