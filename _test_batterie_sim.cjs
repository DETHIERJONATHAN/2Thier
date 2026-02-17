const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const nodeId = 'd3b5da63-8a1d-4543-8ae7-cb49b186e8a4'; // Batterie field
  
  // 1. Load selectConfig
  const selectConfig = await p.treeBranchLeafSelectConfig.findFirst({
    where: { nodeId },
    select: { tableReference: true, keyColumn: true, keyRow: true, valueColumn: true, displayColumn: true, displayRow: true }
  });
  console.log('1. selectConfig:', JSON.stringify(selectConfig));
  
  // 2. Load the table
  const table = await p.treeBranchLeafNodeTable.findUnique({
    where: { id: selectConfig.tableReference },
    select: {
      id: true, nodeId: true, name: true, type: true, meta: true,
      tableColumns: { select: { id: true, name: true, columnIndex: true }, orderBy: { columnIndex: 'asc' } },
      tableRows: { select: { id: true, rowIndex: true, cells: true }, orderBy: { rowIndex: 'asc' } },
    }
  });
  console.log('2. Table:', table.name, 'type:', table.type, 'rows:', table.tableRows.length, 'cols:', table.tableColumns.length);
  
  // 3. Build columns and rows/data
  const columns = table.tableColumns.map(col => col.name);
  console.log('3. columns:', columns);
  
  const rows = [];
  const data = [];
  table.tableRows.forEach(row => {
    const cellsData = Array.isArray(row.cells) ? row.cells : [row.cells];
    if (cellsData.length > 0) {
      rows.push(String(cellsData[0] || ''));
      data.push(cellsData.slice(1));
    } else {
      rows.push('');
      data.push([]);
    }
  });
  console.log('4. rows count:', rows.length, 'first 5 rows:', rows.slice(0, 5));
  
  // 4. Extract filters from meta.lookup
  const rawLookup = table.meta ? table.meta.lookup : undefined;
  let filters = [];
  if (rawLookup && rawLookup.columnSourceOption && Array.isArray(rawLookup.columnSourceOption.filters)) {
    filters = rawLookup.columnSourceOption.filters;
  } else if (rawLookup && rawLookup.rowSourceOption && Array.isArray(rawLookup.rowSourceOption.filters)) {
    filters = rawLookup.rowSourceOption.filters;
  }
  console.log('5. Filters:', JSON.stringify(filters));
  
  const filter = filters[0];
  if (!filter || !filter.valueRef.startsWith('@table.')) {
    console.log('No @table. filter found, stopping.');
    return;
  }
  
  const tableId = filter.valueRef.replace('@table.', '');
  console.log('\n6. Resolving @table.' + tableId + '...');
  
  // Load the referenced table
  const refTable = await p.treeBranchLeafNodeTable.findUnique({
    where: { id: tableId },
    select: { id: true, nodeId: true, name: true, meta: true,
      tableColumns: { select: { name: true, columnIndex: true }, orderBy: { columnIndex: 'asc' } },
      tableRows: { select: { cells: true, rowIndex: true }, orderBy: { rowIndex: 'asc' } }
    }
  });
  console.log('   Referenced table:', refTable.name);
  
  const lookup = refTable.meta ? refTable.meta.lookup : undefined;
  const cso = lookup ? lookup.columnSourceOption : undefined;
  console.log('   sourceField:', cso ? cso.sourceField : 'NONE');
  console.log('   comparisonColumn:', cso ? cso.comparisonColumn : 'NONE');
  console.log('   displayColumn:', lookup ? lookup.displayColumn : 'NONE');
  
  // Find Huawei onduleurs
  const refColumns = refTable.tableColumns.map(c => c.name);
  const genreIdx = refColumns.indexOf('Genre');
  const modeleIdx = refColumns.indexOf('MODELE');
  
  const huaweiOnduleurs = refTable.tableRows.filter(r => {
    const cells = Array.isArray(r.cells) ? r.cells : [];
    return String(cells[genreIdx] || '').toUpperCase() === 'HUAWEI';
  });
  console.log('\n7. Huawei onduleurs in Marque onduleur table:', huaweiOnduleurs.length);
  
  if (huaweiOnduleurs.length === 0) {
    console.log('   NO HUAWEI ONDULEURS FOUND!');
    return;
  }
  
  const sampleCells = Array.isArray(huaweiOnduleurs[0].cells) ? huaweiOnduleurs[0].cells : [];
  const sampleModele = sampleCells[modeleIdx];
  const sampleGenre = sampleCells[genreIdx];
  console.log('   Sample MODELE:', sampleModele);
  console.log('   Sample Genre:', sampleGenre);
  
  // Simulate formValues with this onduleur
  const formValues = {};
  formValues[cso.sourceField] = sampleModele;
  console.log('\n8. Simulated formValues:', JSON.stringify(formValues));
  
  // Resolve: find matching row in the ref table
  const sourceValue = formValues[cso.sourceField];
  const compColIdx = refColumns.indexOf(cso.comparisonColumn);
  const displayColIdx = refColumns.indexOf(lookup.displayColumn[0]);
  console.log('   compColIdx:', compColIdx, 'displayColIdx:', displayColIdx);
  
  let resolved = null;
  for (const row of refTable.tableRows) {
    const cells = Array.isArray(row.cells) ? row.cells : [];
    const compValue = String(cells[compColIdx] || '').trim();
    if (compValue.toLowerCase() === String(sourceValue).trim().toLowerCase()) {
      resolved = cells[displayColIdx];
      console.log('   MATCH at row', row.rowIndex, '→ Genre =', JSON.stringify(resolved));
      break;
    }
  }
  
  if (!resolved) {
    console.log('   NO MATCH FOUND for MODELE =', sampleModele);
    return;
  }
  
  // 9. Apply filter with resolved value
  console.log('\n9. Applying filter: column="' + filter.column + '" operator="' + filter.operator + '" resolvedValue="' + resolved + '"');
  
  // Build fullMatrixForFilters
  const fullMatrixForFilters = table.tableRows.map(row => {
    return Array.isArray(row.cells) ? row.cells : [];
  });
  
  const filterColIdx = columns.indexOf(filter.column);
  console.log('   Filter column "' + filter.column + '" index:', filterColIdx);
  
  if (filterColIdx === -1) {
    console.log('   COLUMN NOT FOUND IN COLUMNS:', columns);
    return;
  }
  
  const matchingIndices = [];
  for (let i = 0; i < fullMatrixForFilters.length; i++) {
    const cellValue = fullMatrixForFilters[i][filterColIdx];
    const cellLower = String(cellValue || '').toLowerCase().trim();
    const compareLower = String(resolved).toLowerCase().trim();
    const matches = cellLower.startsWith(compareLower) || compareLower.startsWith(cellLower);
    if (i <= 3 || matches) {
      console.log('   Row', i, ': cellValue="' + cellValue + '" vs resolved="' + resolved + '" → ' + (matches ? 'MATCH' : 'NO MATCH'));
    }
    if (matches) matchingIndices.push(i);
  }
  
  console.log('   Total matching rows:', matchingIndices.length, '/', fullMatrixForFilters.length);
  
  // 10. Generate options from filtered rows
  const colIndex = columns.indexOf(selectConfig.keyColumn);
  console.log('\n10. keyColumn:', JSON.stringify(selectConfig.keyColumn), 'colIndex:', colIndex);
  
  let options;
  if (colIndex === 0) {
    options = matchingIndices
      .filter(idx => idx > 0)
      .map(rowIdx => ({ value: rows[rowIdx], label: rows[rowIdx] }))
      .filter(opt => opt.value !== 'undefined' && opt.value !== 'null' && opt.value !== '');
    console.log('   Generated options (from rows[]):', options.length);
    options.forEach(o => console.log('   -', o.value));
  } else {
    options = matchingIndices
      .filter(idx => idx > 0)
      .map(rowIdx => {
        const fullRow = fullMatrixForFilters[rowIdx] || [];
        return { value: String(fullRow[colIndex]), label: String(fullRow[colIndex]) };
      })
      .filter(opt => opt.value !== 'undefined' && opt.value !== 'null' && opt.value !== '');
    console.log('   Generated options (from fullMatrix):', options.length);
    options.forEach(o => console.log('   -', o.value));
  }
  
  console.log('\n=== RESULT: ' + options.length + ' options would be returned ===');
}

main().catch(console.error).finally(() => p.$disconnect());
