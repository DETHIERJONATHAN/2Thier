import { PrismaClient } from '@prisma/client';
import { copyVariableWithCapacities } from '../src/components/TreeBranchLeaf/treebranchleaf-new/api/copy-variable-with-capacities';

async function main() {
  const prisma = new PrismaClient();
  try {
    const ts = Date.now();
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: { id: `org-${ts}`, name: `org-${ts}`, createdAt: new Date(), updatedAt: new Date() }
      });
    }

    const treeId = `tree-${ts}`;
    await prisma.treeBranchLeafTree.create({
      data: { id: treeId, organizationId: org.id, name: `Tree ${ts}`, status: 'draft', createdAt: new Date(), updatedAt: new Date() }
    });

    const tabId = `tab-${ts}`;
    await prisma.treeBranchLeafNode.create({
      data: { id: tabId, treeId, type: 'section', subType: 'tab', label: `Onglet ${ts}`, order: 1, isVisible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() }
    });

    const nouveauSectionId = `nv-sect-${ts}`;
    await prisma.treeBranchLeafNode.create({
      data: { id: nouveauSectionId, treeId, parentId: tabId, type: 'section', subType: 'data', label: 'Nouveau Section', order: 2, isVisible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() }
    });

    const sourceLeafId = `leaf-src-${ts}`;
    await prisma.treeBranchLeafNode.create({
      data: { id: sourceLeafId, treeId, parentId: tabId, type: 'leaf_number', subType: 'data', label: `Source Leaf ${ts}`, order: 3, isVisible: true, isActive: true, hasData: true, createdAt: new Date(), updatedAt: new Date() }
    });

    const varId = `var-${ts}`;
    await prisma.treeBranchLeafNodeVariable.create({
      data: { id: varId, nodeId: sourceLeafId, exposedKey: `exp-${ts}`,
        displayName: `Var ${ts}`, displayFormat: 'number', visibleToUser: true,
        sourceType: 'fixed', fixedValue: '42', createdAt: new Date(), updatedAt: new Date() }
    });

    const targetLeafId = `leaf-dst-${ts}`;
    await prisma.treeBranchLeafNode.create({
      data: { id: targetLeafId, treeId, parentId: tabId, type: 'leaf_number', subType: 'data', label: `Target Leaf ${ts}`, order: 4, isVisible: true, isActive: true, hasData: true, createdAt: new Date(), updatedAt: new Date() }
    });

    const result = await copyVariableWithCapacities(varId, 1, targetLeafId, prisma, { autoCreateDisplayNode: true });
    console.log('Copy result:', result);

    const displayNodeId = `display-${result.variableId}`;
    const displayNode = await prisma.treeBranchLeafNode.findUnique({ where: { id: displayNodeId } });
      console.log('Display node exists:', !!displayNode);

      const displayVar = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: `display-var-${result.variableId}` } });
      console.log('Display variable exists (should be false):', !!displayVar);

    if (displayNode && displayNode.parentId !== nouveauSectionId) {
      console.warn('Display node not under Nouveau Section as expected; parentId=', displayNode.parentId);
    } else {
      console.log('Display node is under Nouveau Section OK');
    }
  } catch (e) {
    console.error('Test error:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
