import type { PrismaClient } from '@prisma/client';

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
  const templateIds = Array.from(templateSet);

  // IMPORTANT: On veut un comportement 100% stable et conforme à la règle métier
  // « si <templateId>-1 existe alors le prochain est -2 ».
  // Pour cela, on se base d'abord sur la présence d'IDs du type `${templateId}-<nombre>`.
  // (Les filtres JSON `metadata.path` ne sont pas fiables selon le provider.)
  const orStartsWith = templateIds.map(templateId => ({ id: { startsWith: `${templateId}-` } }));

  const copies = await prisma.treeBranchLeafNode.findMany({
    where: {
      treeId,
      OR: orStartsWith
    },
    select: { id: true, metadata: true }
  });

  // 🔍 Sécurité supplémentaire : certaines copies historiques peuvent ne pas
  // conserver l'ID de base (ex: ID régénéré après collision) mais exposent
  // metadata.copiedFromNodeId ou metadata.sourceTemplateId. On les compte
  // aussi pour éviter de retomber systématiquement à -1.
  const metaCopies = await prisma.treeBranchLeafNode.findMany({
    where: {
      treeId,
      OR: templateIds.map(templateId => ({
        OR: [
          { metadata: { path: ['copiedFromNodeId'], equals: templateId } },
          { metadata: { path: ['sourceTemplateId'], equals: templateId } }
        ]
      }))
    },
    select: { id: true, metadata: true }
  });

  const maxMap = new Map<string, number>();

  for (const copy of copies) {
    let templateId: string | null = null;
    for (const candidate of templateIds) {
      if (copy.id.startsWith(`${candidate}-`)) {
        templateId = candidate;
        break;
      }
    }
    if (!templateId || !templateSet.has(templateId)) continue;

    // On ne compte que les suffixes "simples": `<templateId>-<digits>`.
    // On ignore volontairement les IDs composés (ex: `<templateId>-1-1`) issus d'anciens bugs,
    // car ils ne doivent pas influencer la séquence 1,2,3...
    const rest = copy.id.slice(templateId.length + 1);
    const idSuffix = /^\d+$/.test(rest) ? Number(rest) : null;

    const metadata = (copy.metadata ?? {}) as Record<string, unknown>;
    const metaSuffix = extractNumericSuffix(metadata.copySuffix);

    const resolved = (idSuffix ?? metaSuffix) ?? 0;
    const prev = maxMap.get(templateId) ?? 0;
    if (resolved > prev) maxMap.set(templateId, resolved);
  }

  // 📦 Appliquer aussi les copies identifiées via metadata
  for (const copy of metaCopies) {
    const meta = (copy.metadata ?? {}) as Record<string, unknown>;
    const metaTemplateId =
      (meta.copiedFromNodeId as string | undefined) ||
      (meta.sourceTemplateId as string | undefined) ||
      null;

    if (!metaTemplateId || !templateSet.has(metaTemplateId)) continue;

    const metaSuffix = extractNumericSuffix(meta.copySuffix) ?? extractSuffixFromId(copy.id) ?? 0;
    const prev = maxMap.get(metaTemplateId) ?? 0;
    if (metaSuffix > prev) {
      maxMap.set(metaTemplateId, metaSuffix);
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
