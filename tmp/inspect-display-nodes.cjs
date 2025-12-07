const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const labels = [
      'Longueur toiture',
      'Longueur toiture-1',
      'Orientation-Inclinaison',
      'Orientation-Inclinaison-1',
      'Rampant toiture',
      'Rampant toiture-1'
    ];
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { label: { in: labels } },
      select: {
        id: true,
        label: true,
        parentId: true,
        linkedVariableIds: true,
        data_activeId: true,
        hasData: true,
        type: true,
        isSharedReference: true,
        sharedReferenceId: true,
        metadata: true
      }
    });
    const variableIds = Array.from(
      new Set(
        nodes.flatMap(node =>
          Array.isArray(node.linkedVariableIds)
            ? node.linkedVariableIds.filter(id => typeof id === 'string')
            : []
        )
      )
    );

    const variables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { id: { in: variableIds } },
      select: {
        id: true,
        nodeId: true,
        exposedKey: true,
        sourceRef: true,
        sourceType: true,
        metadata: true
      }
    });

    console.log(JSON.stringify({ nodes, variables }, null, 2));

    const siblings = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: 'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b' },
      select: { id: true, label: true }
    });
    console.log('\nSiblings under parent dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b');
    console.log(siblings.map(s => `${s.id} :: ${s.label}`).join('\n'));

    const sectionChildren = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: 'section-dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b-nouveau' },
      select: { id: true, label: true }
    });
    console.log('\nChildren under section-dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b-nouveau');
    console.log(sectionChildren.map(s => `${s.id} :: ${s.label}`).join('\n'));
  } finally {
    await prisma.$disconnect();
  }
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
