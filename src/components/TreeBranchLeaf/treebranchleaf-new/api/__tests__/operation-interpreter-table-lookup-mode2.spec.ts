import { interpretTable } from '../operation-interpreter';
import { PrismaClient } from '@prisma/client';

describe('interpretTable - lookup Mode 2 (row-only)', () => {
  it('should return the expected coefficient for selected revenu row via row selector', async () => {
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
            rowFieldId: 'rowField'
          },
          columnLookupEnabled: false,
          rowLookupEnabled: true,
          displayRow: 'Coefficient'
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
    } as any;

    const prisma = {
      treeBranchLeafNodeTable: {
        findUnique: jest.fn().mockResolvedValue(fakeTable),
        findFirst: jest.fn().mockResolvedValue(fakeTable)
      },
      treeBranchLeafNode: { findUnique: jest.fn() },
      treeBranchLeafSubmissionData: { findFirst: jest.fn() }
    } as unknown as PrismaClient;

    const submissionId = 'sub1';
    const valueMap = new Map<string, unknown>([['rowField', '38301-50600']]);
    const labelMap = new Map<string, string>();

    const result = await interpretTable('@table.t1', submissionId, prisma, new Map(), 0, valueMap, labelMap);

    expect(result).toBeDefined();
    expect(result.result).toEqual('R3 - X3');
  });
});
