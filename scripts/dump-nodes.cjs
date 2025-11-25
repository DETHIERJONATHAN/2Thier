const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ids = process.argv.slice(2);

if (ids.length === 0) {
  console.error('Usage: node scripts/dump-nodes.cjs <nodeId> [nodeId...]');
  process.exit(1);
}

(async () => {
  try {
    for (const id of ids) {
      const node = await prisma.treeBranchLeafNode.findUnique({
        where: { id },
        select: {
          id: true,
          label: true,
          type: true,
          fieldType: true,
          metadata: true,
          calculatedValue: true,
          calculatedAt: true
        }
      });
      console.log('\n──────────── NODE', id, '────────────');
      if (!node) {
        console.log('❌ Introuvable');
        continue;
      }
      console.log('Label:', node.label);
      console.log('Type:', node.type);
      console.log('FieldType:', node.fieldType);
      console.log('CalculatedValue:', node.calculatedValue);
      console.log('CalculatedAt:', node.calculatedAt);
      console.log('Metadata keys:', node.metadata ? Object.keys(node.metadata) : []);
      console.log('Metadata:', JSON.stringify(node.metadata, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();
