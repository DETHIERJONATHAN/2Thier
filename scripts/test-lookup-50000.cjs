/**
 * 🔍 SCRIPT DE DEBUG: Test lookup avec valeur 50000
 * 
 * Ce script simule exactement ce qui se passe quand:
 * - L'utilisateur entre 50000 dans le champ "Revenu net impossible"
 * - Le système doit chercher dans la table "Coef primes.xlsx"
 * - Avec opérateur ">" sur la colonne "Revenu"
 * - Et retourner la valeur de "Coefficient"
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuration exacte de ta table
const TEST_CONFIG = {
  tableId: 'ef909547-ebd4-44b6-b9cb-7f4ef74e95d1', // ID de ta table Coef primes
  sourceValue: 50000, // Valeur entrée dans le formulaire
  operator: '>', // Opérateur configuré
  comparisonColumn: 'Revenu', // Colonne à comparer
  displayColumn: 'Coefficient' // Colonne à retourner
};

// Données de ta table (telles que configurées)
const TABLE_DATA = [
  { revenu: 26900, coefficient: 'R1 - X6' },
  { revenu: 38300, coefficient: 'R2 - X4' },
  { revenu: 50600, coefficient: 'R3 - X3' },
  { revenu: 114440, coefficient: 'R4 - X2' },
  { revenu: 1000000, coefficient: 'R6 - X1' }
];

function compareValuesByOperator(op, cellValue, targetValue) {
  const cell = Number(cellValue);
  const target = Number(targetValue);
  
  console.log(`  📊 Comparaison: ${cell} ${op} ${target}`);
  
  switch (op) {
    case 'greaterThan':
    case '>':
      const result = cell > target;
      console.log(`     Résultat: ${result}`);
      return result;
    case 'greaterOrEqual':
    case '>=':
      return cell >= target;
    case 'lessThan':
    case '<':
      return cell < target;
    case 'lessOrEqual':
    case '<=':
      return cell <= target;
    case 'equals':
    case '==':
      return cell === target;
    default:
      return false;
  }
}

async function testLookup() {
  console.log('🔍 ========== TEST LOOKUP TABLE ==========\n');
  
  console.log('📋 Configuration du test:');
  console.log(`   Table ID: ${TEST_CONFIG.tableId}`);
  console.log(`   Valeur source: ${TEST_CONFIG.sourceValue}`);
  console.log(`   Opérateur: ${TEST_CONFIG.operator}`);
  console.log(`   Colonne de comparaison: ${TEST_CONFIG.comparisonColumn}`);
  console.log(`   Colonne à afficher: ${TEST_CONFIG.displayColumn}\n`);
  
  // 1. Récupérer la vraie table depuis la base
  console.log('📊 1. RÉCUPÉRATION DE LA TABLE DEPUIS LA BASE\n');
  
  try {
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: TEST_CONFIG.tableId },
      include: {
        tableColumns: {
          orderBy: { columnIndex: 'asc' }
        },
        tableRows: {
          orderBy: { rowIndex: 'asc' }
        }
      }
    });
    
    if (!table) {
      console.log('❌ Table introuvable!');
      return;
    }
    
    console.log(`✅ Table trouvée: ${table.name}`);
    console.log(`   Type: ${table.type}`);
    console.log(`   Colonnes: ${table.tableColumns.map(c => c.name).join(', ')}`);
    console.log(`   Nombre de lignes: ${table.tableRows.length}\n`);
    
    // 2. Reconstruire les données comme le fait operation-interpreter
    console.log('🔄 2. RECONSTRUCTION DES DONNÉES\n');
    
    const columns = table.tableColumns.map(col => col.name);
    const rows = [];
    const data = [];
    
    table.tableRows.forEach(row => {
      if (row.rowIndex === 0) {
        console.log(`   🔍 Header row ignoré (rowIndex=0)`);
        return;
      }
      
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
        const rowLabel = String(cellsData[0] || '');
        const rowData = cellsData.slice(1);
        rows.push(rowLabel);
        data.push(rowData);
        console.log(`   Ligne ${row.rowIndex}: Label="${rowLabel}", Data=${JSON.stringify(rowData)}`);
      }
    });
    
    console.log(`\n   ✅ Reconstruction terminée:`);
    console.log(`      Colonnes: ${JSON.stringify(columns)}`);
    console.log(`      Lignes: ${JSON.stringify(rows)}`);
    console.log(`      Données: ${JSON.stringify(data)}\n`);
    
    // 3. Vérifier la configuration lookup
    console.log('⚙️ 3. CONFIGURATION LOOKUP\n');
    
    const meta = table.meta;
    const lookup = meta?.lookup;
    
    if (!lookup || !lookup.enabled) {
      console.log('❌ Lookup non configuré ou désactivé');
      return;
    }
    
    console.log(`   ✅ Lookup activé`);
    console.log(`   Column enabled: ${lookup.columnLookupEnabled}`);
    console.log(`   Row enabled: ${lookup.rowLookupEnabled}`);
    console.log(`   Display column: ${lookup.displayColumn}`);
    
    const colSourceOption = lookup.columnSourceOption;
    if (colSourceOption) {
      console.log(`\n   📋 Source option:`);
      console.log(`      Type: ${colSourceOption.type}`);
      console.log(`      Operator: ${colSourceOption.operator}`);
      console.log(`      Comparison column: ${colSourceOption.comparisonColumn}`);
    }
    
    // 4. Simuler le lookup avec l'opérateur
    console.log('\n🎯 4. SIMULATION DU LOOKUP\n');
    
    const comparisonColName = colSourceOption.comparisonColumn;
    const normalizedComparisonCol = String(comparisonColName).trim().toLowerCase();
    
    console.log(`   🔍 Recherche de la colonne "${comparisonColName}" (normalized: "${normalizedComparisonCol}")`);
    
    const colSelectorInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedComparisonCol);
    const colSelectorInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedComparisonCol);
    
    console.log(`      Index dans columns: ${colSelectorInCols}`);
    console.log(`      Index dans rows: ${colSelectorInRows}`);
    
    let colSelectorIndex = -1;
    if (colSelectorInCols !== -1) colSelectorIndex = colSelectorInCols;
    else if (colSelectorInRows !== -1) colSelectorIndex = colSelectorInRows;
    
    if (colSelectorIndex === -1) {
      console.log('\n❌ Colonne de comparaison introuvable!');
      return;
    }
    
    console.log(`\n   ✅ Colonne trouvée à l'index: ${colSelectorIndex}`);
    console.log(`   📊 DataColIndex sera: ${colSelectorIndex - 1}`);
    
    // 5. Parcourir les lignes pour trouver le match
    console.log(`\n🔎 5. RECHERCHE DU MATCH avec valeur ${TEST_CONFIG.sourceValue}\n`);
    
    const dataColIndex = colSelectorIndex - 1;
    let foundRowIndex = -1;
    
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const cellValue = data[rIdx]?.[dataColIndex];
      console.log(`   Ligne ${rIdx} (label: "${rows[rIdx]}"):`);
      console.log(`      Valeur dans colonne [${dataColIndex}]: ${cellValue}`);
      
      const matches = compareValuesByOperator(colSourceOption.operator, cellValue, TEST_CONFIG.sourceValue);
      
      if (matches) {
        foundRowIndex = rIdx;
        console.log(`      ✅ MATCH TROUVÉ!\n`);
        break;
      } else {
        console.log(`      ❌ Pas de match\n`);
      }
    }
    
    if (foundRowIndex === -1) {
      console.log('❌ Aucune ligne ne correspond à la condition!\n');
      return;
    }
    
    // 6. Récupérer la valeur de displayColumn
    console.log(`🎁 6. RÉCUPÉRATION DU RÉSULTAT\n`);
    
    console.log(`   Ligne trouvée: ${foundRowIndex} (label: "${rows[foundRowIndex]}")`);
    console.log(`   Cherche colonne "${lookup.displayColumn}" pour affichage`);
    
    const normalizedDisplayCol = String(lookup.displayColumn).trim().toLowerCase();
    const displayColInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedDisplayCol);
    const displayColInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedDisplayCol);
    
    console.log(`      Index dans columns: ${displayColInCols}`);
    console.log(`      Index dans rows: ${displayColInRows}`);
    
    let colIndexForDisplay = -1;
    if (displayColInCols !== -1) colIndexForDisplay = displayColInCols;
    else if (displayColInRows !== -1) colIndexForDisplay = displayColInRows;
    
    if (colIndexForDisplay === -1) {
      console.log('\n❌ Colonne d\'affichage introuvable!');
      return;
    }
    
    const dataColIndexForDisplay = colIndexForDisplay - 1;
    const result = data[foundRowIndex]?.[dataColIndexForDisplay];
    
    console.log(`\n   ✅ RÉSULTAT FINAL: "${result}"\n`);
    
    // 7. Résumé
    console.log('📝 ========== RÉSUMÉ ==========\n');
    console.log(`   Valeur testée: ${TEST_CONFIG.sourceValue}`);
    console.log(`   Opérateur: ${colSourceOption.operator}`);
    console.log(`   Ligne trouvée: ${rows[foundRowIndex]}`);
    console.log(`   Résultat: ${result}`);
    console.log(`   Attendu: R3 - X3 (si 50000 > 50600 = false)\n`);
    
    if (result !== 'R3 - X3') {
      console.log('⚠️ ATTENTION: Le résultat ne correspond PAS à l\'attendu!');
      console.log('\n🔍 ANALYSE DU PROBLÈME:\n');
      console.log('   Le système cherche la PREMIÈRE ligne où cellValue > 50000');
      console.log('   Données de la table:');
      TABLE_DATA.forEach((row, idx) => {
        const matches = row.revenu > 50000;
        console.log(`      ${row.revenu} > 50000 = ${matches} → ${row.coefficient}`);
      });
      console.log('\n   🎯 Solution: Le système trouve 50600 > 50000 = TRUE');
      console.log('      donc il retourne R3-X3 qui est SUR la ligne 50600');
      console.log('      MAIS tu veux probablement 50000 < 50600 (inférieur)');
    }
    
  } catch (error) {
    console.error('❌ ERREUR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLookup().catch(console.error);
