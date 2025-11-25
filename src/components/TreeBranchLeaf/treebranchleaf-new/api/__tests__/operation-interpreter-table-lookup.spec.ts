import { interpretTable } from '../operation-interpreter';
// No explicit Prisma types; keep test file JS-friendly for Jest transform

// Minimal test: Mode 1 (column only). We mock Prisma table response and pass a valueMap.

describe('interpretTable - lookup Mode 1 (column-only)', () => {
  it('should return the expected coefficient for selected revenu row', async () => {
    // Minimal fake table response
    const fakeTable = {
      id: 't1',
      name: 'TestTable',
      type: 'basic',
      rowCount: 4,
      columnCount: 2,
      meta: {
        lookup: {
          enabled: true,
          selectors: {
            columnFieldId: 'colField'
          },
          columnLookupEnabled: true,
          displayColumn: 'Coefficient'
        }
      },
      nodeId: 'node-table-1',
      tableColumns: [
        { id: 'c1', columnIndex: 0, name: 'Revenu', type: 'string', width: 100, format: 'text', metadata: {} },
        { id: 'c2', columnIndex: 1, name: 'Coefficient', type: 'string', width: 100, format: 'text', metadata: {} }
      ],
      tableRows: [
        { id: 'r0', rowIndex: 0, cells: JSON.stringify(['Revenu', 'Coefficient']) },
        { id: 'r1', rowIndex: 1, cells: JSON.stringify(['1-26900', 'R1 - X6']) },
        { id: 'r2', rowIndex: 2, cells: JSON.stringify(['26901-38300', 'R2 - X4']) },
        { id: 'r3', rowIndex: 3, cells: JSON.stringify(['38301-50600', 'R3 - X3']) },
      ]
    };

    // Mock Prisma client
    const prisma = {
      treeBranchLeafNodeTable: {
        findUnique: jest.fn().mockResolvedValue(fakeTable),
        findFirst: jest.fn().mockResolvedValue(fakeTable)
      },
      treeBranchLeafNode: {
        findUnique: jest.fn()
      },
      treeBranchLeafSubmissionData: {
        findFirst: jest.fn()
      }
    };

    const submissionId = 'sub1';

    // valueMap: simulate that the select field 'colField' is set to the "row value" (a revenu range)
    const valueMap = new Map<string, unknown>([['colField', '38301-50600']]);
    const labelMap = new Map<string, string>([['colField', 'Revenu']]);

    const result = await interpretTable('@table.t1', submissionId, prisma, new Map(), 0, valueMap, labelMap);

    expect(result).toBeDefined();
    expect(result.details).toBeDefined();
    expect(result.details.type).toEqual('table');
    // Expect the result to return 'R3 - X3' since we selected the '38301-50600' row.
    expect(result.result).toEqual('R3 - X3');
  });
});
