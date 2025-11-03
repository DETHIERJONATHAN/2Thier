// Backfill app Fields for existing TBL variables
// - Creates/updates Field with id=nodeId, label=displayName
// - Ensures a Block per tree and a Section per TBL section ancestor (or a synthetic one)

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function mapFieldType(displayFormat) {
  const fmt = (displayFormat || '').toLowerCase();
  if (fmt.includes('number')) return 'number';
  if (fmt.includes('date')) return 'date';
  if (fmt.includes('email')) return 'email';
  if (fmt.includes('phone')) return 'phone';
  if (fmt.includes('select')) return 'select';
  if (fmt.includes('radio')) return 'radio';
  if (fmt.includes('checkbox')) return 'checkbox';
  return 'text';
}

async function findSectionAncestor(nodeId) {
  let current = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: { id: true, parentId: true, type: true, order: true, treeId: true, label: true }
  });
  if (!current) return null;
  const ownerOrder = current.order || 0;
  const treeId = current.treeId;

  while (current) {
    if (current.type === 'section') {
      return { sectionNodeId: current.id, ownerOrder, treeId };
    }
    if (!current.parentId) break;
    current = await prisma.treeBranchLeafNode.findUnique({
      where: { id: current.parentId },
      select: { id: true, parentId: true, type: true, order: true, treeId: true, label: true }
    });
  }
  return { sectionNodeId: null, ownerOrder, treeId };
}

async function ensureBlockAndSection(treeId, sectionNodeId) {
  const tree = await prisma.treeBranchLeafTree.findUnique({
    where: { id: treeId },
    select: { id: true, name: true, organizationId: true }
  });
  if (!tree) return { block: null, section: null };

  const blockId = `${tree.id}-autofields-block`;
  let block = await prisma.block.findUnique({ where: { id: blockId } });
  if (!block) {
    block = await prisma.block.create({
      data: {
        id: blockId,
        name: `TBL AutoFields - ${tree.name || tree.id}`,
        organizationId: tree.organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });
    console.log(`🧱 Block créé: ${blockId}`);
  }

  let targetSectionId = sectionNodeId || `${tree.id}-autofields-section`;
  let section = await prisma.section.findUnique({ where: { id: targetSectionId } });
  if (!section) {
    let sectionLabel = 'AutoFields';
    let sectionOrder = 0;
    if (sectionNodeId) {
      const secNode = await prisma.treeBranchLeafNode.findUnique({ where: { id: sectionNodeId }, select: { label: true, order: true } });
      if (secNode) {
        sectionLabel = secNode.label || sectionLabel;
        sectionOrder = secNode.order || sectionOrder;
      }
    }
    section = await prisma.section.create({
      data: {
        id: targetSectionId,
        name: sectionLabel,
        order: sectionOrder,
        blockId: block.id,
        active: true,
      }
    });
    console.log(`📄 Section créée: ${section.id}`);
  }

  return { block, section };
}

async function main() {
  const vars = await prisma.treeBranchLeafNodeVariable.findMany({
    select: {
      id: true,
      nodeId: true,
      displayName: true,
      displayFormat: true,
      TreeBranchLeafNode: { select: { order: true, treeId: true } }
    }
  });

  console.log(`🔎 Variables à traiter: ${vars.length}`);
  let created = 0, updated = 0, skipped = 0;

  for (const v of vars) {
    try {
      const { sectionNodeId, ownerOrder, treeId } = await findSectionAncestor(v.nodeId) || {};
      if (!treeId) { skipped++; continue; }

      const { section } = await ensureBlockAndSection(treeId, sectionNodeId);
      if (!section) { skipped++; continue; }

      const fieldType = mapFieldType(v.displayFormat);
      const existing = await prisma.field.findUnique({ where: { id: v.nodeId } });
      if (existing) {
        await prisma.field.update({
          where: { id: v.nodeId },
          data: {
            label: v.displayName,
            sectionId: section.id,
            order: v.TreeBranchLeafNode?.order ?? ownerOrder ?? 0,
            type: fieldType,
            width: '100%'
          }
        });
        updated++;
      } else {
        await prisma.field.create({
          data: {
            id: v.nodeId,
            label: v.displayName,
            sectionId: section.id,
            order: v.TreeBranchLeafNode?.order ?? ownerOrder ?? 0,
            type: fieldType,
            width: '100%'
          }
        });
        created++;
      }
      console.log(`✅ Field OK pour variable ${v.id} → fieldId=${v.nodeId}, sectionId=${section.id}`);
    } catch (e) {
      console.warn(`⚠️ Skip variable ${v.id}:`, e.message);
      skipped++;
    }
  }

  console.log(`\n📊 Résumé backfill: created=${created}, updated=${updated}, skipped=${skipped}`);
}

main()
  .catch((e) => { console.error('💥 Backfill error:', e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
