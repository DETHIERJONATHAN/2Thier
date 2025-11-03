require('ts-node/register/transpile-only');
const { PrismaClient } = require('@prisma/client');
const { copyVariableWithCapacities } = require('../src/components/TreeBranchLeaf/treebranchleaf-new/api/copy-variable-with-capacities');

async function main() {
  const prisma = new PrismaClient();
  try {
    const ts = Date.now();
    // 1) Ensure organization
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: {
          id: `org-${ts}`,
          name: `org-autofields-${ts}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    // 2) Create a tree
    const treeId = `tree-${ts}`;
    await prisma.treeBranchLeafTree.create({
      data: {
        id: treeId,
        organizationId: org.id,
        name: `Test Tree ${ts}`,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // 3) Create a section node
    const sectionId = `section-${ts}`;
    await prisma.treeBranchLeafNode.create({
      data: {
        id: sectionId,
        treeId,
        type: 'section',
        subType: 'data',
        label: `Test Section ${ts}`,
        order: 1,
        isVisible: true,
        isActive: true
      }
    });

    // 4) Create a source leaf node with a variable
    const sourceLeafId = `leaf-src-${ts}`;
    await prisma.treeBranchLeafNode.create({
      data: {
        id: sourceLeafId,
        treeId,
        parentId: sectionId,
        type: 'leaf_number',
        subType: 'data',
        label: `Source Leaf ${ts}`,
        order: 2,
        isVisible: true,
        isActive: true,
        hasData: true
      }
    });

    const varId = `var-${ts}`;
    await prisma.treeBranchLeafNodeVariable.create({
      data: {
        id: varId,
        nodeId: sourceLeafId,
        exposedKey: `exp-${ts}`,
        displayName: `Test Var ${ts}`,
        displayFormat: 'number',
        visibleToUser: true,
        sourceType: 'fixed',
        fixedValue: '123',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // 5) Create a target leaf node to attach the copied variable
    const targetLeafId = `leaf-dst-${ts}`;
    await prisma.treeBranchLeafNode.create({
      data: {
        id: targetLeafId,
        treeId,
        parentId: sectionId,
        type: 'leaf_number',
        subType: 'data',
        label: `Target Leaf ${ts}`,
        order: 3,
        isVisible: true,
        isActive: true,
        hasData: true
      }
    });

    // 6) Copy variable with suffix 1, targeting target leaf
    const result = await copyVariableWithCapacities(varId, 1, targetLeafId, prisma);
    console.log('Copy result:', result);

    // 7) Validate Field creation
    const field = await prisma.field.findUnique({ where: { id: targetLeafId } });
    const appSection = field ? await prisma.section.findUnique({ where: { id: field.sectionId } }) : null;
    const appBlock = appSection ? await prisma.block.findUnique({ where: { id: appSection.blockId } }) : null;

    console.log('\nValidation:');
    console.log(' Field exists:', !!field, field && { id: field.id, label: field.label, sectionId: field.sectionId, type: field.type, order: field.order });
    console.log(' Section exists:', !!appSection, appSection && { id: appSection.id, name: appSection.name, blockId: appSection.blockId });
    console.log(' Block exists:', !!appBlock, appBlock && { id: appBlock.id, name: appBlock.name });
  } catch (e) {
    console.error('Test error:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
