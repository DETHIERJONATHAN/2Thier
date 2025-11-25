/**
 * 🔍 TEST DIRECT: Simulation exacte du lookup avec la vraie logique
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TABLE_ID = '2d17ed57-3ec9-4d06-bda2-23bee9635c75';
const SOURCE_VALUE = 50000;

// Copie de la fonction compareValuesByOperator
function compareValuesByOperator(op, cellValue, targetValue) {
  if (!op) return false;
  
  const cell = Number(cellValue);
  const target = Number(targetValue);
  
  console.log(`      🔍 Compare: ${cell} ${op} ${target}`);
  
  switch (op) {
    case 'equals':
    case '==':
      return String(cellValue) === String(targetValue);
    case 'notEquals':
    case '!=':
      return String(cellValue) !== String(targetValue);
    case 'greaterThan':
    case '>':
      const gt = cell > target;
      console.log(`         → ${cell} > ${target} = ${gt}`);
      return gt;
    case 'greaterOrEqual':
    case '>=':
      return cell >= target;
    case 'lessThan':
    case '<':
      return cell < target;
    case 'lessOrEqual':
    case '<=':
      return cell <= target;
    case 'contains':
      return String(cellValue).includes(String(targetValue));
    case 'notContains':
      return !String(cellValue).includes(String(targetValue));
    default:
      return false;
  }
}

async function testLookupDirect() {
  console.log('🔍 ========== TEST LOOKUP DIRECT ==========\n');
  console.log(`Table: ${TABLE_ID}`);
  console.log(`Valeur à tester: ${SOURCE_VALUE}\n`);
  
  try {
    // 1. Récupérer la table
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: TABLE_ID },
      include: {
        tableColumns: { orderBy: { columnIndex: 'asc' } },
        tableRows: { orderBy: { rowIndex: 'asc' } }
      }
    });
    
    if (!table) {
      console.log('❌ Table introuvable');
      return;
    }
    
    console.log(`✅ Table: ${table.name}\n`);
    
    // 2. Reconstruire les données
    const columns = table.tableColumns.map(c => c.name);
    const rows = [];
    const data = [];
    
    table.tableRows.forEach(row => {
      if (row.rowIndex === 0) return; // Skip header
      
      let cellsData;
      if (typeof row.cells === 'string') {
        try {
          cellsData = JSON.parse(row.cells);
        } catch {
          cellsData = [row.cells];
        }
      } else {
        cellsData = row.cells || [];
      }
      
      if (Array.isArray(cellsData) && cellsData.length > 0) {
        rows.push(String(cellsData[0] || ''));
        data.push(cellsData.slice(1));
      }
    });
    
    console.log('📊 Données reconstruites:');
    console.log(`   Colonnes: ${JSON.stringify(columns)}`);
    console.log(`   Lignes: ${JSON.stringify(rows)}`);
    console.log(`   Data: ${JSON.stringify(data)}\n`);
    
    // 3. Vérifier la config
    const meta = table.meta;
    const lookup = meta?.lookup;
    
    if (!lookup) {
      console.log('❌ Pas de config lookup');
      return;
    }
    
    console.log('⚙️ Configuration lookup:');
    console.log(`   enabled: ${lookup.enabled}`);
    console.log(`   columnLookupEnabled: ${lookup.columnLookupEnabled}`);
    console.log(`   rowLookupEnabled: ${lookup.rowLookupEnabled}`);
    
    // 🔥 TEST DU FIX
    const isLookupActive = lookup && (lookup.enabled === true || lookup.columnLookupEnabled === true || lookup.rowLookupEnabled === true);
    console.log(`\n🔥 FIX: isLookupActive = ${isLookupActive}`);
    
    if (!isLookupActive) {
      console.log('❌ Lookup désactivé selon la nouvelle logique');
      return;
    }
    
    console.log('✅ Lookup activé!\n');
    
    const colSourceOption = lookup.columnSourceOption;
    if (!colSourceOption) {
      console.log('❌ Pas de columnSourceOption');
      return;
    }
    
    console.log('📋 Column source option:');
    console.log(`   type: ${colSourceOption.type}`);
    console.log(`   operator: ${colSourceOption.operator}`);
    console.log(`   comparisonColumn: ${colSourceOption.comparisonColumn}\n`);
    
    // 4. Chercher la colonne de comparaison
    const comparisonColName = colSourceOption.comparisonColumn;
    const normalizedComparisonCol = String(comparisonColName).trim().toLowerCase();
    
    console.log(`🔎 Recherche colonne "${comparisonColName}":`);
    
    const colSelectorInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedComparisonCol);
    const colSelectorInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedComparisonCol);
    
    console.log(`   Index dans columns: ${colSelectorInCols}`);
    console.log(`   Index dans rows: ${colSelectorInRows}`);
    
    let colSelectorIndex = -1;
    if (colSelectorInCols !== -1) colSelectorIndex = colSelectorInCols;
    else if (colSelectorInRows !== -1) colSelectorIndex = colSelectorInRows;
    
    if (colSelectorIndex === -1) {
      console.log('\n❌ Colonne de comparaison introuvable');
      return;
    }
    
    console.log(`\n✅ Colonne trouvée à l'index: ${colSelectorIndex}`);
    
    // 5. Chercher le match avec l'opérateur
    const dataColIndex = colSelectorIndex - 1;
    console.log(`📍 DataColIndex: ${dataColIndex}\n`);
    
    console.log('🔎 Recherche du match:\n');
    
    let foundRowIndex = -1;
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      // 🔥 FIX: Si colSelectorIndex = 0 (première colonne), les valeurs sont dans rows[], pas data[]
      const cellValue = colSelectorIndex === 0 ? rows[rIdx] : data[rIdx]?.[dataColIndex];
      console.log(`   Ligne ${rIdx} - Label: "${rows[rIdx]}"`);
      console.log(`      Valeur cellule: ${cellValue}`);
      
      const matches = compareValuesByOperator(colSourceOption.operator, cellValue, SOURCE_VALUE);
      
      if (matches) {
        foundRowIndex = rIdx;
        console.log(`      ✅ MATCH TROUVÉ!\n`);
        break;
      } else {
        console.log(`      ❌ Pas de match\n`);
      }
    }
    
    if (foundRowIndex === -1) {
      console.log('\n❌ Aucune ligne ne match la condition');
      return;
    }
    
    // 6. Récupérer la valeur de displayColumn
    const displayColumn = Array.isArray(lookup.displayColumn) ? lookup.displayColumn[0] : lookup.displayColumn;
    
    console.log(`\n🎁 Récupération du résultat:`);
    console.log(`   Ligne trouvée: ${foundRowIndex} (${rows[foundRowIndex]})`);
    console.log(`   DisplayColumn: ${displayColumn}\n`);
    
    const normalizedDisplayCol = String(displayColumn).trim().toLowerCase();
    const displayColInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedDisplayCol);
    const displayColInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedDisplayCol);
    
    console.log(`   Index dans columns: ${displayColInCols}`);
    console.log(`   Index dans rows: ${displayColInRows}`);
    
    let colIndexForDisplay = -1;
    if (displayColInCols !== -1) colIndexForDisplay = displayColInCols;
    else if (displayColInRows !== -1) colIndexForDisplay = displayColInRows;
    
    if (colIndexForDisplay === -1) {
      console.log('\n❌ Colonne d\'affichage introuvable');
      return;
    }
    
    const dataColIndexForDisplay = colIndexForDisplay - 1;
    const result = data[foundRowIndex]?.[dataColIndexForDisplay];
    
    console.log(`\n✅ RÉSULTAT FINAL: "${result}"\n`);
    
    // 7. Analyse
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 ANALYSE COMPLÈTE\n');
    
    console.log('Logique actuelle:');
    console.log(`   Opérateur: ${colSourceOption.operator} (greaterThan = >)`);
    console.log(`   Cherche: cellValue > ${SOURCE_VALUE}\n`);
    
    console.log('Résultats par ligne:');
    rows.forEach((row, idx) => {
      const val = data[idx]?.[dataColIndex];
      const matches = Number(val) > SOURCE_VALUE;
      console.log(`   ${val} > ${SOURCE_VALUE} = ${matches} → ${data[idx]?.[dataColIndexForDisplay]}`);
    });
    
    console.log(`\n🎯 Première ligne qui match: ${rows[foundRowIndex]}`);
    console.log(`   Résultat retourné: ${result}\n`);
    
    if (result === 'R3 - X3') {
      console.log('✅ CORRECT! Le système retourne R3 - X3');
    } else {
      console.log(`⚠️ INCORRECT! Attendu: R3 - X3, Reçu: ${result}`);
      console.log('\n💡 EXPLICATION:');
      console.log('   50000 est cherché avec opérateur >');
      console.log('   50600 > 50000 = TRUE (première ligne à matcher)');
      console.log('   Donc le système retourne la valeur de cette ligne: R3 - X3');
      console.log('\n   Si tu veux que 50000 retourne R3-X3 car 38300 < 50000 < 50600:');
      console.log('   → Change l\'opérateur en "<" (lessThan)');
      console.log('   → Ou utilise une logique "entre" (between)');
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testLookupDirect().catch(console.error);
