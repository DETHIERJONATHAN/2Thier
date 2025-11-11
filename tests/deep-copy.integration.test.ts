import { PrismaClient } from '@prisma/client';
import { deepCopyNodeInternal } from '../src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes'; // Adjust path as needed
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

describe('deepCopyNodeInternal Integration Tests', () => {
  let treeId: string;
  let organizationId: string;

  beforeAll(async () => {
    // Create a test organization and tree
    const org = await prisma.organization.create({
      data: { 
        id: randomUUID(),
        name: 'Test Org for Deep Copy',
        updatedAt: new Date(),
      },
    });
    organizationId = org.id;

    const tree = await prisma.treeBranchLeafTree.create({
      data: {
        id: randomUUID(),
        name: 'Test Tree for Deep Copy',
        organizationId,
        updatedAt: new Date(),
      },
    });
    treeId = tree.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (treeId) {
      await prisma.treeBranchLeafNode.deleteMany({ where: { treeId } });
      await prisma.treeBranchLeafTree.delete({ where: { id: treeId } });
    }
    if (organizationId) {
      await prisma.organization.delete({ where: { id: organizationId } });
    }
    await prisma.$disconnect();
  });

  test('should correctly copy a node with linked variables, formulas, conditions, and tables', async () => {
    // 1. Create a source node with all capabilities
    const sourceNode = await prisma.treeBranchLeafNode.create({
      data: {
        id: randomUUID(),
        treeId,
        label: 'Source Node',
        type: 'group',
        updatedAt: new Date(),
      },
    });

  const variable = await prisma.treeBranchLeafNodeVariable.create({
    data: {
      id: randomUUID(),
      nodeId: sourceNode.id,
      exposedKey: `var_${randomUUID()}`,
      displayName: 'Test Variable',
      sourceType: 'fixed',
      fixedValue: '123',
      updatedAt: new Date(),
    }
  });

    const formula = await prisma.treeBranchLeafNodeFormula.create({
        data: {
            id: randomUUID(),
            nodeId: sourceNode.id,
            organizationId,
            name: 'Test Formula',
            tokens: ['1', '+', '1'],
        }
    });

    const condition = await prisma.treeBranchLeafNodeCondition.create({
        data: {
            id: randomUUID(),
            nodeId: sourceNode.id,
            organizationId,
            name: 'Test Condition',
            conditionSet: { branches: [] },
        }
    });

    const table = await prisma.treeBranchLeafNodeTable.create({
        data: {
            id: randomUUID(),
            nodeId: sourceNode.id,
            organizationId,
            name: 'Test Table',
        }
    });
    
    await prisma.treeBranchLeafNode.update({
        where: { id: sourceNode.id },
        data: {
            linkedVariableIds: { set: [variable.id] },
            linkedFormulaIds: { set: [formula.id] },
            linkedConditionIds: { set: [condition.id] },
            linkedTableIds: { set: [table.id] },
        }
    });


    // 2. Perform the deep copy
    const mockReq = { user: { organizationId, isSuperAdmin: true } };
    const result = await deepCopyNodeInternal(mockReq as any, sourceNode.id, {});

    // 3. Assertions
    const newId = result.root.newId;
    const copiedNode = await prisma.treeBranchLeafNode.findUnique({ where: { id: newId } });

    expect(copiedNode).not.toBeNull();
    expect(copiedNode?.label).toContain(sourceNode.label);

    // Check copied capabilities
    const newVariableId = result.variableIdMap[variable.id];
    const newFormulaId = result.formulaIdMap[formula.id];
    const newConditionId = result.conditionIdMap[condition.id];
    const newTableId = result.tableIdMap[table.id];

    expect(newVariableId).toBeDefined();
    expect(newFormulaId).toBeDefined();
    expect(newConditionId).toBeDefined();
    expect(newTableId).toBeDefined();

    const copiedVariable = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: newVariableId } });
    const copiedFormula = await prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: newFormulaId } });
    const copiedCondition = await prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: newConditionId } });
    const copiedTable = await prisma.treeBranchLeafNodeTable.findUnique({ where: { id: newTableId } });

    expect(copiedVariable?.nodeId).toBe(newId);
    expect(copiedFormula?.nodeId).toBe(newId);
    expect(copiedCondition?.nodeId).toBe(newId);
    expect(copiedTable?.nodeId).toBe(newId);
    
    // Check linked IDs on the copied node
    const finalCopiedNode = await prisma.treeBranchLeafNode.findUnique({ where: { id: newId } });
    expect(finalCopiedNode?.linkedVariableIds).toContain(newVariableId);
    expect(finalCopiedNode?.linkedFormulaIds).toContain(newFormulaId);
    expect(finalCopiedNode?.linkedConditionIds).toContain(newConditionId);
    expect(finalCopiedNode?.linkedTableIds).toContain(newTableId);

  });
});
