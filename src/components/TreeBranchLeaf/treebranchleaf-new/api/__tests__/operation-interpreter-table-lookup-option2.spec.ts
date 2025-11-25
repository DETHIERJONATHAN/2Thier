import { interpretTable } from '../operation-interpreter';

// Mode 1: column lookup where columnSourceOption.type === 'field' and operator > with comparisonColumn

describe('interpretTable - lookup Mode 1 (column-only) Option 2 CHAMP with operator', () => {
  it('should return R3 - X3 when source value 50000 and operator > comparisonColumn Revenu', async () => {
    const fakeTable = {
      id: 't1',
      name: 'TestTable',
      type: 'basic',
      rowCount: 5,
      columnCount: 2,
      meta: {
        lookup: {
          enabled: true,
          selectors: {
            columnFieldId: 'colField'
          },
          columnLookupEnabled: true,
          displayColumn: 'Coefficient',
          columnSourceOption: {
            type: 'field'
          }
        }
      },
      nodeId: 'node-table-1',
      tableColumns: [
        { id: 'c1', columnIndex: 0, name: 'Revenu', type: 'string', width: 100, format: 'text', metadata: {} },
        { id: 'c2', columnIndex: 1, name: 'Coefficient', type: 'string', width: 100, format: 'text', metadata: {} }
      ],
      tableRows: [
        { id: 'r0', rowIndex: 0, cells: JSON.stringify(['Revenu', 'Coefficient']) },
        { id: 'r1', rowIndex: 1, cells: JSON.stringify(["26900", 'R1 - X6']) },
        { id: 'r2', rowIndex: 2, cells: JSON.stringify(["38300", 'R2 - X4']) },
        { id: 'r3', rowIndex: 3, cells: JSON.stringify(["50600", 'R3 - X3']) },
        { id: 'r4', rowIndex: 4, cells: JSON.stringify(["114440", 'R4 - X2']) }
      ]
    } as any;

    const prisma = {
      treeBranchLeafNodeTable: {
        findUnique: jest.fn().mockResolvedValue(fakeTable),
        findFirst: jest.fn().mockResolvedValue(fakeTable)
      },
      treeBranchLeafNode: { findUnique: jest.fn() },
      treeBranchLeafSubmissionData: { findFirst: jest.fn() }
    } as any;

    const submissionId = 'sub1';

    // Simulate the source option: field value is 50000, operator is '>' and comparisonColumn is 'Revenu'
    const valueMap = new Map<string, unknown>([['colField', 50000]]);
    const labelMap = new Map<string, string>();

    // Now we must craft the lookup.meta to include columnSourceOption.operator and comparisonColumn
    fakeTable.meta.lookup.columnSourceOption.operator = '>';
    fakeTable.meta.lookup.columnSourceOption.comparisonColumn = 'Revenu';

    const result = await interpretTable('@table.t1', submissionId, prisma, new Map(), 0, valueMap, labelMap);

    expect(result).toBeDefined();
    expect(result.details).toBeDefined();
    expect(result.details.type).toEqual('table');
    expect(result.result).toEqual('R3 - X3');
  });
});
