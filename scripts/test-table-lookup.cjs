const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tableId = process.argv[2];
const sourceValueArg = process.argv[3];
const sourceValue = sourceValueArg ? Number(sourceValueArg) : null;

if (!tableId || sourceValue === null || Number.isNaN(sourceValue)) {
  console.error('Usage: node scripts/test-table-lookup.cjs <tableId> <sourceValue>');
  process.exit(1);
}

function compareValuesByOperator(op, cellValue, targetValue) {
  if (!op) return false;
  switch (op) {
    case 'equals':
    case '==':
      return String(cellValue) === String(targetValue);
    case 'notEquals':
    case '!=':
      return String(cellValue) !== String(targetValue);
    case 'greaterThan':
    case '>':
      return Number(cellValue) > Number(targetValue);
    case 'greaterOrEqual':
    case '>=':
      return Number(cellValue) >= Number(targetValue);
    case 'lessThan':
    case '<':
      return Number(cellValue) < Number(targetValue);
    case 'lessOrEqual':
    case '<=':
      return Number(cellValue) <= Number(targetValue);
    default:
      return false;
  }
}

(async () => {
  try {
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: tableId },
      include: {
        tableColumns: { orderBy: { columnIndex: 'asc' } },
        tableRows: { orderBy: { rowIndex: 'asc' } }
      }
    });

    if (!table) {
      console.error('Table introuvable');
      return;
    }

    const columns = table.tableColumns.map(c => c.name);
    const rows = [];
    const data = [];
    table.tableRows.forEach(row => {
      if (row.rowIndex === 0) return;
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

    const lookup = table.meta?.lookup;
    if (!lookup) {
      console.error('Pas de lookup configuré');
      return;
    }

    const colSourceOption = lookup.columnSourceOption;
    if (!colSourceOption || !colSourceOption.comparisonColumn) {
      console.error('columnSourceOption manquante');
      return;
    }

    const comparisonCol = colSourceOption.comparisonColumn.trim().toLowerCase();
    const comparisonIndexInCols = columns.findIndex(c => c.trim().toLowerCase() === comparisonCol);
    const comparisonIndexInRows = rows.findIndex(r => r.trim().toLowerCase() === comparisonCol);
    let colSelectorIndex = -1;
    if (comparisonIndexInCols !== -1) colSelectorIndex = comparisonIndexInCols;
    else if (comparisonIndexInRows !== -1) colSelectorIndex = comparisonIndexInRows;
    if (colSelectorIndex === -1) {
      console.error('Colonne de comparaison introuvable');
      return;
    }

    const dataColIndex = colSelectorIndex - 1;
    let foundRowIndex = -1;
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const cellValue = colSelectorIndex === 0 ? rows[rIdx] : data[rIdx]?.[dataColIndex];
      if (compareValuesByOperator(colSourceOption.operator, cellValue, sourceValue)) {
        foundRowIndex = rIdx;
        console.log(`Match trouvé sur ligne ${rIdx} (label=${rows[rIdx]}) avec ${cellValue} ${colSourceOption.operator} ${sourceValue}`);
        break;
      }
    }

    if (foundRowIndex === -1) {
      console.log('Aucun match trouvé');
      return;
    }

    const displayColumns = Array.isArray(lookup.displayColumn) ? lookup.displayColumn : [lookup.displayColumn];
    displayColumns.forEach(colName => {
      const normalized = String(colName || '').trim().toLowerCase();
      const idxInCols = columns.findIndex(c => c.trim().toLowerCase() === normalized);
      const idxInRows = rows.findIndex(r => r.trim().toLowerCase() === normalized);
      let finalIndex = -1;
      if (idxInCols !== -1) finalIndex = idxInCols;
      else if (idxInRows !== -1) finalIndex = idxInRows;
      if (finalIndex === -1) {
        console.log(`DisplayColumn ${colName} introuvable dans colonnes/lignes`);
        return;
      }
      const dataColIndexForDisplay = finalIndex - 1;
      const value = data[foundRowIndex]?.[dataColIndexForDisplay];
      console.log(`→ ${colName}: ${value}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();
