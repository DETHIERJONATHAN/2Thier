import { PrismaClient } from '@prisma/client';
import { copyVariableWithCapacities } from '../src/components/TreeBranchLeaf/treebranchleaf-new/api/copy-variable-with-capacities';

async function main() {
  const prisma = new PrismaClient();
  try {
    const ts = Date.now();
    let org = await prisma.organization.findFirst();
    if (!org) org = await prisma.organization.create({ data: { id: `org-${ts}`, name: `org-${ts}`, createdAt: new Date(), updatedAt: new Date() } });

    const treeId = `tree-${ts}`;
    await prisma.treeBranchLeafTree.create({ data: { id: treeId, organizationId: org.id, name: `Tree ${ts}`, status: 'draft', createdAt: new Date(), updatedAt: new Date() } });

    const tabId = `tab-${ts}`;
    await prisma.treeBranchLeafNode.create({ data: { id: tabId, treeId, type: 'section', subType: 'tab', label: `Onglet ${ts}`, order: 1, isVisible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() } });

    const nouveauSectionId = `nv-sect-${ts}`;
    await prisma.treeBranchLeafNode.create({ data: { id: nouveauSectionId, treeId, parentId: tabId, type: 'section', subType: 'data', label: 'Nouveau Section', order: 2, isVisible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() } });

    const sourceLeafId = `leaf-src-${ts}`;
    await prisma.treeBranchLeafNode.create({ data: { id: sourceLeafId, treeId, parentId: tabId, type: 'leaf_number', subType: 'data', label: `Source Leaf ${ts}`, order: 3, isVisible: true, isActive: true, hasData: true, createdAt: new Date(), updatedAt: new Date() } });

    const varId = `var-${ts}`;
    await prisma.treeBranchLeafNodeVariable.create({ data: { id: varId, nodeId: sourceLeafId, exposedKey: `exp-${ts}`, displayName: `Var ${ts}`, displayFormat: 'number', visibleToUser: true, sourceType: 'fixed', fixedValue: '42', createdAt: new Date(), updatedAt: new Date() } });

    const targetLeafId = `leaf-dst-${ts}`;
    await prisma.treeBranchLeafNode.create({ data: { id: targetLeafId, treeId, parentId: tabId, type: 'leaf_number', subType: 'data', label: `Target Leaf ${ts}`, order: 4, isVisible: true, isActive: true, hasData: true, createdAt: new Date(), updatedAt: new Date() } });

    const result = await copyVariableWithCapacities(varId, 1, targetLeafId, prisma, { linkToDisplaySection: true });
    console.log('Copy result:', result);

    const displaySection = await prisma.treeBranchLeafNode.findUnique({ where: { id: nouveauSectionId } });
    console.log('Display section linkedVariableIds contains new var:', Array.isArray(displaySection?.linkedVariableIds) && displaySection!.linkedVariableIds.includes(result.variableId));
  } catch (e) {
    console.error('Test error:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
