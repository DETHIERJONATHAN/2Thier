import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function scan() {
  const nodes = await prisma.treeBranchLeafNode.findMany({ select: { id: true, label: true, metadata: true, parentId: true, createdAt: true } });
  const matched = [];
  for (const n of nodes) {
    if (n.metadata) {
      try {
        const meta = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata;
        if (!meta) continue;
        if (meta.fromVariableId) {
          const val = Array.isArray(meta.fromVariableId) ? meta.fromVariableId.join(',') : String(meta.fromVariableId);
          if (val.includes('-1-1')) {
            matched.push({ id: n.id, label: n.label, fromVariableId: val, parentId: n.parentId, createdAt: n.createdAt });
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }
  console.log('Found display nodes with fromVariableId contains -1-1:', matched.length);
  console.log(matched.slice(0, 50));
  await prisma.$disconnect();
}

scan().catch(e => { console.error(e); process.exit(1); });