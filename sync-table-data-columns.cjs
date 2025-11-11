#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function syncColumns() {
  console.log('🔄 Synchronisation des colonnes table_* → data_* lorsque nécessaire...');

  const nodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { table_activeId: { not: null } },
        { table_instances: { not: null } },
        { data_activeId: { not: null } },
        { data_instances: { not: null } }
      ]
    },
    select: {
      id: true,
      label: true,
      table_activeId: true,
      table_instances: true,
      data_activeId: true,
      data_instances: true
    }
  });

  let updatedCount = 0;

  for (const node of nodes) {
    const { id, label } = node;
    const tableActiveId = node.table_activeId ?? null;
    const tableInstances = node.table_instances ?? null;
    const dataActiveId = node.data_activeId ?? null;
    const dataInstances = node.data_instances ?? null;

    const baseInstances = tableInstances || dataInstances || null;

    let normalizedInstances = null;
    if (baseInstances && typeof baseInstances === 'object') {
      normalizedInstances = Object.entries(baseInstances).reduce((acc, [key, rawValue]) => {
        if (rawValue && typeof rawValue === 'object') {
          const value = { ...rawValue };
          const metadata = value.metadata && typeof value.metadata === 'object' ? { ...value.metadata } : {};

          if (value.sourceRef && !metadata.sourceRef) {
            metadata.sourceRef = value.sourceRef;
          }
          if (value.sourceType && !metadata.sourceType) {
            metadata.sourceType = value.sourceType;
          }
          if (value.fixedValue !== undefined && metadata.fixedValue === undefined) {
            metadata.fixedValue = value.fixedValue;
          }
          if (value.selectedNodeId && !metadata.selectedNodeId) {
            metadata.selectedNodeId = value.selectedNodeId;
          }
          metadata.updatedAt = new Date().toISOString();

          acc[key] = { ...value, metadata };
        } else {
          acc[key] = rawValue;
        }
        return acc;
      }, {});
    }

    const shouldUpdateActiveId = tableActiveId && tableActiveId !== dataActiveId;
    const shouldUpdateInstances = normalizedInstances && (
      JSON.stringify(normalizedInstances) !== JSON.stringify(dataInstances) ||
      JSON.stringify(normalizedInstances) !== JSON.stringify(tableInstances)
    );

    if (shouldUpdateActiveId || shouldUpdateInstances) {
      console.log(`⚙️  Mise à jour du nœud ${label || id} (${id})`);
      const updateData = {};

      if (shouldUpdateActiveId) {
        updateData.data_activeId = tableActiveId ?? dataActiveId;
      }

      if (normalizedInstances) {
        updateData.data_instances = normalizedInstances;
        updateData.table_instances = normalizedInstances;
      }

      await prisma.treeBranchLeafNode.update({
        where: { id },
        data: updateData
      });
      updatedCount += 1;
    }
  }

  console.log(`✅ Synchronisation terminée (${updatedCount} nœud(s) mis à jour).`);
}

syncColumns()
  .catch((error) => {
    console.error('❌ Erreur durant la synchronisation:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
