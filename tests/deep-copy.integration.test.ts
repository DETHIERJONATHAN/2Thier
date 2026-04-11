import { PrismaClient } from '@prisma/client';
import { deepCopyNodeInternal } from '../src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/services/deep-copy-service';
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
            updatedAt: new Date(),
        }
    });

    const table = await prisma.treeBranchLeafNodeTable.create({
        data: {
            id: randomUUID(),
            nodeId: sourceNode.id,
            organizationId,
            name: 'Test Table',
            updatedAt: new Date(),
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
    const result = await deepCopyNodeInternal(prisma, mockReq as any, sourceNode.id, {});

    // 3. Assertions - verify the deep copy created new entities
    const newId = result.root.newId;
    const copiedNode = await prisma.treeBranchLeafNode.findUnique({ where: { id: newId } });
    expect(copiedNode).not.toBeNull();
    expect(copiedNode?.label).toBeTruthy();

    // The idMap maps old IDs to new IDs - the source node should be in there
    const copiedSourceId = result.idMap[sourceNode.id];
    expect(copiedSourceId).toBeDefined();

    // Check that capabilities were copied using their respective idMaps
    const allCopiedNodeIds = Object.values(result.idMap);
    const copiedFormulaIds = Object.values(result.formulaIdMap);
    const copiedConditionIds = Object.values(result.conditionIdMap);
    const copiedTableIds = Object.values(result.tableIdMap);
    
    const copiedVariable = await prisma.treeBranchLeafNodeVariable.findFirst({ 
      where: { nodeId: { in: allCopiedNodeIds } } 
    });
    const copiedFormula = copiedFormulaIds.length > 0 
      ? await prisma.treeBranchLeafNodeFormula.findFirst({ where: { id: { in: copiedFormulaIds } } })
      : null;
    const copiedCondition = copiedConditionIds.length > 0
      ? await prisma.treeBranchLeafNodeCondition.findFirst({ where: { id: { in: copiedConditionIds } } })
      : null;
    const copiedTable = copiedTableIds.length > 0
      ? await prisma.treeBranchLeafNodeTable.findFirst({ where: { id: { in: copiedTableIds } } })
      : null;

    // Variable is always copied (creates a display node)
    expect(copiedVariable).not.toBeNull();
    // Formulas, conditions, tables should have entries in their respective idMaps
    expect(copiedFormulaIds.length).toBeGreaterThan(0);
    expect(copiedConditionIds.length).toBeGreaterThan(0);
    expect(copiedTableIds.length).toBeGreaterThan(0);

  });

  test('should duplicate linked variables under the same parent when repeating nodes', async () => {
    const parentSection = await prisma.treeBranchLeafNode.create({
      data: {
        id: randomUUID(),
        treeId,
        label: 'Section Rampant',
        type: 'section',
        isVisible: true,
        isActive: true,
        order: 1,
        updatedAt: new Date()
      }
    });

    const sourceDisplayNode = await prisma.treeBranchLeafNode.create({
      data: {
        id: randomUUID(),
        treeId,
        parentId: parentSection.id,
        label: 'Rampant toiture',
        type: 'leaf_field',
        isVisible: true,
        isActive: true,
        order: 1,
        linkedVariableIds: [],
        updatedAt: new Date()
      }
    });

    const variable = await prisma.treeBranchLeafNodeVariable.create({
      data: {
        id: randomUUID(),
        nodeId: sourceDisplayNode.id,
        exposedKey: 'rampant_toiture',
        displayName: 'Rampant toiture',
        sourceType: 'fixed',
        fixedValue: '15',
        updatedAt: new Date()
      }
    });

    await prisma.treeBranchLeafNode.update({
      where: { id: sourceDisplayNode.id },
      data: { linkedVariableIds: { set: [variable.id] } }
    });

    const mockReq = { user: { organizationId, isSuperAdmin: true } };
    const result = await deepCopyNodeInternal(prisma, mockReq as any, sourceDisplayNode.id, { suffixNum: 1 });

    const copiedNodeId = result.idMap[sourceDisplayNode.id];
    expect(copiedNodeId).toBe(`${sourceDisplayNode.id}-1`);

    const copiedNode = await prisma.treeBranchLeafNode.findUnique({ where: { id: copiedNodeId } });
    expect(copiedNode).not.toBeNull();
    expect(copiedNode?.parentId).toBe(parentSection.id);
    expect(copiedNode?.linkedVariableIds).toContain(`${variable.id}-1`);

    const copiedVariable = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: `${variable.id}-1` } });
    expect(copiedVariable).not.toBeNull();
    expect(copiedVariable?.nodeId).toBe(copiedNodeId);

    const copiedDisplayNode = await prisma.treeBranchLeafNode.findUnique({ where: { id: copiedVariable?.nodeId || '' } });
    expect(copiedDisplayNode).not.toBeNull();
    expect(copiedDisplayNode?.parentId).toBe(parentSection.id);
  });
});
