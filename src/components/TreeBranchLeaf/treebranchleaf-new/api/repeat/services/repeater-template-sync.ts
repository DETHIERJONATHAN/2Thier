import { Prisma, type PrismaClient } from '@prisma/client';

type Nullable<T> = T | null | undefined;

const parseJsonArray = (value: Nullable<string>): string[] => {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
};

const extractMetaTemplateIds = (metadata: Prisma.JsonValue | null | undefined): string[] => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return [];
  }
  const meta = metadata as Record<string, unknown>;
  const repeaterMeta = meta.repeater && typeof meta.repeater === 'object'
    ? (meta.repeater as Record<string, unknown>)
    : undefined;
  const ids = repeaterMeta?.templateNodeIds;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && !!id) : [];
};

const buildMetadataPayload = (
  metadata: Prisma.JsonValue | null | undefined,
  templateNodeIds: string[]
): Prisma.InputJsonValue => {
  const base = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? { ...(metadata as Record<string, unknown>) }
    : {};
  const repeaterMeta = base.repeater && typeof base.repeater === 'object'
    ? { ...(base.repeater as Record<string, unknown>) }
    : {};
  repeaterMeta.templateNodeIds = templateNodeIds;
  base.repeater = repeaterMeta;
  return base as Prisma.InputJsonValue;
};

export async function syncRepeaterTemplateIds(
  prisma: PrismaClient,
  repeaterNodeId: string,
  templateNodeIds: string[]
): Promise<void> {
  if (!repeaterNodeId || !templateNodeIds.length) {
    return;
  }

  const repeater = await prisma.treeBranchLeafNode.findUnique({
    where: { id: repeaterNodeId },
    select: { repeater_templateNodeIds: true, metadata: true }
  });

  if (!repeater) {
    return;
  }

  const columnIds = parseJsonArray(repeater.repeater_templateNodeIds);
  const metaIds = extractMetaTemplateIds(repeater.metadata);
  const nextIds = Array.from(
    new Set([...columnIds, ...metaIds, ...templateNodeIds].filter((id): id is string => typeof id === 'string' && !!id))
  );

  const columnChanged = columnIds.length !== nextIds.length || columnIds.some((id, idx) => id !== nextIds[idx]);
  const metadataChanged = metaIds.length !== nextIds.length || metaIds.some((id, idx) => id !== nextIds[idx]);

  if (!columnChanged && !metadataChanged) {
    return;
  }

  await prisma.treeBranchLeafNode.update({
    where: { id: repeaterNodeId },
    data: {
      repeater_templateNodeIds: JSON.stringify(nextIds),
      metadata: buildMetadataPayload(repeater.metadata, nextIds)
    }
  });
}
