import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const normalizeVariableId = (value: string | null | undefined): string | null => {
  if (!value) return null;
  return value.replace(/-\d+(?:-display)?$/, '');
};

const readSubTabFromMetadata = (metadata: Prisma.JsonValue | null | undefined): string | undefined => {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const meta = metadata as Record<string, unknown>;
  const raw = meta.subTab ?? meta.subTabKey;
  return typeof raw === 'string' ? raw : undefined;
};

const cloneJson = (value: Prisma.JsonValue | null | undefined): Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    return {};
  }
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
};

const extractSuffix = (fromVariableId: string | null): string | null => {
  if (!fromVariableId) return null;
  const match = fromVariableId.match(/-(\d+)$/);
  return match ? match[1] : null;
};

const appendSuffixFactory = (suffix: string | null) => {
  if (!suffix) {
    return (value: string | null | undefined) => value ?? null;
  }
  const pattern = new RegExp(`-${suffix}$`);
  return (value: string | null | undefined) => {
    if (!value) return null;
    return pattern.test(value) ? value : `${value}-${suffix}`;
  };
};

const cloneAndSuffixInstances = (raw: Prisma.JsonValue | null | undefined, appendSuffix: (value: string | null | undefined) => string | null): Prisma.JsonValue | null => {
  if (!raw) return raw ?? null;

  let rawInstances: Record<string, unknown>;
  if (typeof raw === 'object') {
    rawInstances = JSON.parse(JSON.stringify(raw));
  } else if (typeof raw === 'string') {
    try {
      rawInstances = JSON.parse(raw);
    } catch {
      return raw;
    }
  } else {
    return raw;
  }

  const updated: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawInstances)) {
    const newKey = appendSuffix(String(key));
    if (value && typeof value === 'object') {
      const nested = { ...(value as Record<string, unknown>) };
      if (typeof nested.tableId === 'string') {
        nested.tableId = appendSuffix(nested.tableId);
      }
      updated[newKey] = nested;
    } else {
      updated[newKey] = value;
    }
  }
  return updated;
};

(async () => {
  try {
    const displayNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        metadata: {
          not: Prisma.JsonNull
        }
      },
      select: {
        id: true,
        label: true,
        parentId: true,
        metadata: true,
        subtab: true,
        subtabs: true,
        table_activeId: true
      }
    });

    console.log(`[repair-display-parents] ${displayNodes.length} display nodes détectés`);

    for (const node of displayNodes) {
      const meta = node.metadata && typeof node.metadata === 'object'
        ? (node.metadata as Record<string, unknown>)
        : null;
      const isAutoDisplay = meta?.autoCreatedDisplayNode === true;

      if (!isAutoDisplay) {
        continue;
      }
      const fromVariableId = typeof meta?.fromVariableId === 'string'
        ? meta.fromVariableId
        : null;

      if (!fromVariableId) {
        console.log(` - ${node.id} sans fromVariableId, ignoré`);
        continue;
      }

      const baseVariableId = normalizeVariableId(fromVariableId);
      if (!baseVariableId) {
        console.log(` - ${node.id} impossible de normaliser ${fromVariableId}`);
        continue;
      }

      const originalDisplay = await prisma.treeBranchLeafNode.findFirst({
        where: {
          linkedVariableIds: {
            has: baseVariableId
          }
        },
        select: {
          id: true,
          parentId: true,
          metadata: true,
          subtab: true,
          subtabs: true,
          linkedTableIds: true,
          hasTable: true,
          table_name: true,
          table_activeId: true,
          table_instances: true,
          table_columns: true,
          table_data: true,
          table_importSource: true,
          table_isImported: true,
          table_meta: true,
          table_rows: true,
          table_type: true,
          hasAPI: true,
          hasCondition: true,
          hasData: true,
          hasFormula: true,
          hasLink: true,
          hasMarkers: true,
          data_activeId: true,
          data_displayFormat: true,
          data_exposedKey: true,
          data_instances: true,
          data_precision: true,
          data_unit: true,
          data_visibleToUser: true,
          appearance_size: true,
          appearance_variant: true,
          appearance_width: true,
          fieldType: true,
          fieldSubType: true,
          field_label: true
        }
      });

      if (!originalDisplay?.parentId) {
        console.log(` - ${node.id} pas de parent original trouvé`);
        continue;
      }

      const suffix = extractSuffix(fromVariableId);
      const appendSuffix = appendSuffixFactory(suffix);

      const updateData: Prisma.TreeBranchLeafNodeUpdateInput = {
        parentId: originalDisplay.parentId
      };

      const originalSubTab = originalDisplay.subtab ?? readSubTabFromMetadata(originalDisplay.metadata);
      if (originalSubTab && node.subtab !== originalSubTab) {
        updateData.subtab = originalSubTab;
      }

      if (originalDisplay.subtabs && node.subtabs !== originalDisplay.subtabs) {
        updateData.subtabs = originalDisplay.subtabs;
      }

      const originalMeta = cloneJson(originalDisplay.metadata);
      const currentMeta = node.metadata && typeof node.metadata === 'object'
        ? JSON.parse(JSON.stringify(node.metadata)) as Record<string, unknown>
        : {};

      const mergedMetadata: Record<string, unknown> = {
        ...currentMeta,
        ...originalMeta,
        fromVariableId,
        autoCreatedDisplayNode: true,
      };
      if (currentMeta.repeater) {
        mergedMetadata.repeater = currentMeta.repeater;
      }
      if (currentMeta.duplicatedFromRepeater) {
        mergedMetadata.duplicatedFromRepeater = currentMeta.duplicatedFromRepeater;
      }

      updateData.metadata = mergedMetadata as Prisma.JsonValue;
      updateData.hasTable = originalDisplay.hasTable ?? false;
      updateData.table_name = originalDisplay.table_name;
      updateData.table_activeId = appendSuffix(originalDisplay.table_activeId);
      updateData.table_instances = cloneAndSuffixInstances(originalDisplay.table_instances, appendSuffix);
      updateData.table_columns = originalDisplay.table_columns;
      updateData.table_data = originalDisplay.table_data;
      updateData.table_importSource = originalDisplay.table_importSource;
      updateData.table_isImported = originalDisplay.table_isImported ?? false;
      updateData.table_meta = originalDisplay.table_meta;
      updateData.table_rows = originalDisplay.table_rows;
      updateData.table_type = originalDisplay.table_type;
      updateData.hasAPI = originalDisplay.hasAPI ?? false;
      updateData.hasCondition = originalDisplay.hasCondition ?? false;
      updateData.hasData = originalDisplay.hasData ?? false;
      updateData.hasFormula = originalDisplay.hasFormula ?? false;
      updateData.hasLink = originalDisplay.hasLink ?? false;
      updateData.hasMarkers = originalDisplay.hasMarkers ?? false;
      updateData.linkedTableIds = Array.isArray(originalDisplay.linkedTableIds)
        ? originalDisplay.linkedTableIds.map(id => appendSuffix(id))
        : [];
      updateData.linkedVariableIds = fromVariableId ? [fromVariableId] : [];
      updateData.data_activeId = appendSuffix(originalDisplay.data_activeId);
      updateData.data_displayFormat = originalDisplay.data_displayFormat;
      updateData.data_exposedKey = originalDisplay.data_exposedKey;
      updateData.data_instances = cloneAndSuffixInstances(originalDisplay.data_instances, appendSuffix);
      updateData.data_precision = originalDisplay.data_precision;
      updateData.data_unit = originalDisplay.data_unit;
      updateData.data_visibleToUser = originalDisplay.data_visibleToUser ?? false;
      updateData.appearance_size = originalDisplay.appearance_size;
      updateData.appearance_variant = originalDisplay.appearance_variant;
      updateData.appearance_width = originalDisplay.appearance_width;
      updateData.fieldType = originalDisplay.fieldType ?? null;
      updateData.fieldSubType = originalDisplay.fieldSubType ?? null;
      updateData.field_label = originalDisplay.field_label;

      const needsUpdate = node.parentId !== originalDisplay.parentId
        || (originalSubTab !== undefined && node.subtab !== originalSubTab)
        || (originalDisplay.subtabs && node.subtabs !== originalDisplay.subtabs)
        || JSON.stringify(node.metadata) !== JSON.stringify(mergedMetadata)
        || node.table_activeId !== appendSuffix(originalDisplay.table_activeId);

      if (!needsUpdate) {
        continue;
      }

      await prisma.treeBranchLeafNode.update({
        where: { id: node.id },
        data: updateData
      });

      console.log(` ✅ ${node.label} (${node.id}) → parent ${originalDisplay.parentId}`);
    }
  } catch (error) {
    console.error('[repair-display-parents] Erreur:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
