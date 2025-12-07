import { Prisma, type PrismaClient } from '@prisma/client';

function extractNumericSuffix(candidate: unknown): number | null {
  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return candidate;
  }
  if (typeof candidate === 'string' && /^\d+$/.test(candidate)) {
    return Number(candidate);
  }
  return null;
}

function extractSuffixFromId(id: string): number | null {
  if (!id) return null;
  const match = /-(\d+)$/.exec(id);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function computeTemplateCopySuffixMax(
  prisma: PrismaClient,
  treeId: string,
  templateNodeIds: string[]
): Promise<Map<string, number>> {
  if (!treeId || !templateNodeIds.length) {
    return new Map();
  }

  const templateSet = new Set(templateNodeIds);
  const copies = await prisma.treeBranchLeafNode.findMany({
    where: {
      treeId,
      metadata: {
        path: ['sourceTemplateId'],
        not: Prisma.DbNull
      }
    },
    select: { id: true, metadata: true }
  });

  const maxMap = new Map<string, number>();

  for (const copy of copies) {
    const metadata = (copy.metadata ?? {}) as Record<string, unknown>;
    const sourceTemplateId = metadata.sourceTemplateId;
    if (typeof sourceTemplateId !== 'string' || !templateSet.has(sourceTemplateId)) {
      continue;
    }

    const metaSuffix = extractNumericSuffix(metadata.copySuffix);
    const idSuffix = extractSuffixFromId(copy.id);
    const resolved = metaSuffix ?? idSuffix ?? 0;
    const prev = maxMap.get(sourceTemplateId) ?? 0;
    if (resolved > prev) {
      maxMap.set(sourceTemplateId, resolved);
    }
  }

  return maxMap;
}

export function createSuffixAllocator(initialMax?: Map<string, number>) {
  const tracker = new Map(initialMax);
  return (templateId: string): number => {
    const currentMax = tracker.get(templateId) ?? 0;
    const next = currentMax + 1;
    tracker.set(templateId, next);
    return next;
  };
}
