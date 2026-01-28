import { Prisma, PrismaClient } from '@prisma/client';
import { copyVariableWithCapacities } from '../api/copy-variable-with-capacities';

export interface SharedReferenceAuthContext {
  organizationId: string | null;
  isSuperAdmin: boolean;
}

export interface ApplySharedReferencesParams {
  prisma: PrismaClient;
  nodeId: string;
  authCtx: SharedReferenceAuthContext;
}

export interface ApplySharedReferencesResult {
  success: true;
  applied: number;
  suffix: number;
}

/**
 * Applies shared reference relationships from the original template tree onto a new copy
 * identified by metadata.copiedFromNodeId.
 */
export async function applySharedReferencesFromOriginalInternal(
  params: ApplySharedReferencesParams
): Promise<ApplySharedReferencesResult> {
  const { prisma, nodeId, authCtx } = params;
  const { organizationId, isSuperAdmin } = authCtx;

  const copyRoot = await prisma.treeBranchLeafNode.findFirst({
    where: { id: nodeId },
    include: { TreeBranchLeafTree: { select: { id: true, organizationId: true } } }
  });
  if (!copyRoot) throw new Error('Nœud introuvable');
  if (!isSuperAdmin && organizationId && copyRoot.TreeBranchLeafTree?.organizationId && copyRoot.TreeBranchLeafTree.organizationId !== organizationId) {
    throw new Error('Accès non autorisé');
  }

  const all = await prisma.treeBranchLeafNode.findMany({ where: { treeId: copyRoot.treeId } });
  const nodeVariableIdByNodeId = new Map<string, string>();
  if (all.length > 0) {
    const nodeVariables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: { in: all.map(n => n.id) } },
      select: { nodeId: true, id: true }
    });
    for (const variable of nodeVariables) {
      if (variable.nodeId && variable.id) {
        nodeVariableIdByNodeId.set(variable.nodeId, variable.id);
      }
    }
  }
  const byId = new Map(all.map(n => [n.id, n] as const));
  const childrenByParent = new Map<string, string[]>();
  for (const n of all) {
    if (!n.parentId) continue;
    const arr = childrenByParent.get(n.parentId) || [];
    arr.push(n.id);
    childrenByParent.set(n.parentId, arr);
  }

  const collectedCopyIds = new Set<string>();
  const queue: string[] = [copyRoot.id];
  while (queue.length) {
    const cur = queue.shift()!;
    if (collectedCopyIds.has(cur)) continue;
    collectedCopyIds.add(cur);
    for (const c of (childrenByParent.get(cur) || [])) queue.push(c);
  }

  const originalToCopy = new Map<string, string>();
  for (const id of collectedCopyIds) {
    const n = byId.get(id);
    if (!n) continue;
    const meta = (n.metadata || {}) as Record<string, unknown>;
    const origId = String(meta.copiedFromNodeId || '');
    if (origId) originalToCopy.set(origId, n.id);
  }
  if (originalToCopy.size === 0) return { success: true, applied: 0, suffix: 0 };

  const originalIds = Array.from(originalToCopy.keys());
  const originals = await prisma.treeBranchLeafNode.findMany({ where: { id: { in: originalIds } } });

  const allRefIds = new Set<string>();
  for (const orig of originals) {
    if (orig.sharedReferenceId) allRefIds.add(orig.sharedReferenceId);
    if (Array.isArray(orig.sharedReferenceIds)) orig.sharedReferenceIds.forEach(id => id && allRefIds.add(id));
  }

  const metaRoot = (copyRoot.metadata as Record<string, unknown> | null) || {};
  let chosenSuffix: number | null = typeof metaRoot.copySuffix === 'number' ? metaRoot.copySuffix : null;
  if (!chosenSuffix) {
    let maxSuffix = 0;
    const SUFFIX_RE = /^(shared-ref-[A-Za-z0-9_\-]+)-(\d+)$/;
    for (const n of all) {
      const m = typeof n.id === 'string' ? n.id.match(SUFFIX_RE) : null;
      if (m) {
        const num = Number(m[2]);
        if (!Number.isNaN(num)) maxSuffix = Math.max(maxSuffix, num);
      }
    }
    chosenSuffix = maxSuffix + 1 || 1;
    await prisma.treeBranchLeafNode.update({ where: { id: copyRoot.id }, data: { metadata: { ...metaRoot, copySuffix: chosenSuffix } as Prisma.InputJsonValue } });
  }

  const refCopyIdByOriginal = new Map<string, string>();
  const desiredIds = Array.from(allRefIds).map(id => `${id}-${chosenSuffix}`);
  const existingRefCopies = desiredIds.length > 0
    ? await prisma.treeBranchLeafNode.findMany({ where: { id: { in: desiredIds } } })
    : [];
  const existingSet = new Set(existingRefCopies.map(n => n.id));

  const ensureRefCopy = async (origRefId: string): Promise<string> => {
    const desiredRootId = `${origRefId}-${chosenSuffix}`;
    if (existingSet.has(desiredRootId)) {
      refCopyIdByOriginal.set(origRefId, desiredRootId);
      return desiredRootId;
    }

    const subtreeIds: string[] = [];
    const q: string[] = [origRefId];
    const seen = new Set<string>();
    while (q.length) {
      const cur = q.shift()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      subtreeIds.push(cur);
      const kids = childrenByParent.get(cur) || [];
      for (const cid of kids) q.push(cid);
    }

    const origSubtree = subtreeIds.map(id => byId.get(id)).filter(Boolean) as typeof all;
    const desired = new Set(subtreeIds.map(id => `${id}-${chosenSuffix}`));
    if (desired.size > 0) {
      const already = await prisma.treeBranchLeafNode.findMany({ where: { id: { in: Array.from(desired) } } });
      for (const n of already) desired.delete(n.id);
    }

    const idMap = new Map<string, string>();
    for (const id of subtreeIds) idMap.set(id, `${id}-${chosenSuffix}`);

    for (const orig of origSubtree) {
      const newId = idMap.get(orig.id)!;
      if (!desired.has(newId)) continue;
      const newParentId = orig.parentId ? idMap.get(orig.parentId) ?? null : null;
      const toCreate: Prisma.TreeBranchLeafNodeCreateInput = {
        id: newId,
        treeId: copyRoot.treeId,
        type: orig.type,
        subType: orig.subType,
        fieldType: (orig as any).fieldType ?? 'TEXT',
        label: orig.label,
        description: orig.description,
        parentId: newParentId,
        order: orig.order ?? 9999,
        isVisible: orig.isVisible ?? true,
        isActive: orig.isActive ?? true,
        isRequired: orig.isRequired ?? false,
        isMultiple: orig.isMultiple ?? false,
        // 🔧 IMPORTANT: préserver la table active lors d'une copie (sinon les lookups tombent à 0/∅)
        table_activeId: (orig as any).table_activeId ? `${(orig as any).table_activeId}-${chosenSuffix}` : null,
        hasData: false,
        hasFormula: false,
        hasCondition: false,
        hasTable: false,
        hasAPI: false,
        hasLink: false,
        hasMarkers: false,
        isSharedReference: orig.id === origRefId ? true : (orig as any).isSharedReference ?? false,
        sharedReferenceId: null,
        sharedReferenceIds: [],
        sharedReferenceName: orig.sharedReferenceName ?? orig.label ?? null,
        sharedReferenceDescription: orig.sharedReferenceDescription ?? orig.description ?? null,
        linkedFormulaIds: Array.isArray((orig as any).linkedFormulaIds)
          ? (orig as any).linkedFormulaIds.map((id: string) => `${id}-${chosenSuffix}`).filter(Boolean)
          : [],
        linkedConditionIds: Array.isArray((orig as any).linkedConditionIds)
          ? (orig as any).linkedConditionIds.map((id: string) => `${id}-${chosenSuffix}`).filter(Boolean)
          : [],
        linkedTableIds: Array.isArray((orig as any).linkedTableIds)
          ? (orig as any).linkedTableIds.map((id: string) => `${id}-${chosenSuffix}`).filter(Boolean)
          : [],
        linkedVariableIds: Array.isArray((orig as any).linkedVariableIds)
          ? (orig as any).linkedVariableIds.map((id: string) => `${id}-${chosenSuffix}`).filter(Boolean)
          : [],
        metadata: { ...(orig.metadata as Record<string, unknown> | undefined || {}), copiedFromNodeId: orig.id } as Prisma.InputJsonValue,
        updatedAt: new Date(),
      };
      await prisma.treeBranchLeafNode.create({ data: toCreate });

      const sourceVariableIds = new Set<string>();
      if (Array.isArray((orig as any).linkedVariableIds)) {
        for (const rawId of (orig as any).linkedVariableIds) {
          if (typeof rawId === 'string') {
            const normalized = rawId.trim();
            if (normalized) {
              sourceVariableIds.add(normalized);
            }
          }
        }
      }
      const directVarId = nodeVariableIdByNodeId.get(orig.id);
      if (directVarId) {
        sourceVariableIds.add(directVarId);
      }

      if (sourceVariableIds.size > 0) {
        const variableCopyCache = new Map<string, string>();
        const formulaIdMap = new Map<string, string>();
        const conditionIdMap = new Map<string, string>();
        const tableIdMap = new Map<string, string>();
        const globalNodeIdMap = new Map<string, string>([...originalToCopy, ...idMap]);

        for (const originalVarId of sourceVariableIds) {
          try {
            const copyResult = await copyVariableWithCapacities(
              originalVarId,
              chosenSuffix!,
              newId,
              prisma,
              {
                formulaIdMap,
                conditionIdMap,
                tableIdMap,
                nodeIdMap: globalNodeIdMap,
                variableCopyCache,
                autoCreateDisplayNode: true
              }
            );

            if (!copyResult.success) {
              console.warn(`⚠️ [SHARED-REF] Échec copie variable ${originalVarId}: ${copyResult.error}`);
            }
          } catch (e) {
            console.warn(`⚠️ [SHARED-REF] Erreur copie variable ${originalVarId}:`, (e as Error).message);
          }
        }
      }
    }

    refCopyIdByOriginal.set(origRefId, desiredRootId);
    return desiredRootId;
  };

  for (const rid of allRefIds) await ensureRefCopy(rid);

  const updates: Array<Promise<unknown>> = [];
  let applied = 0;
  for (const orig of originals) {
    const copyId = originalToCopy.get(orig.id)!;
    
    // ✅ FIX 11/01/2026: Vérifier que le nœud copié existe avant de faire l'update
    const copyExists = await prisma.treeBranchLeafNode.findUnique({
      where: { id: copyId },
      select: { id: true }
    });
    if (!copyExists) {
      console.warn(`⚠️ Nœud ${copyId} introuvable pour MAJ linkedConditionIds`);
      continue;
    }
    
    const origMultiple = Array.isArray(orig.sharedReferenceIds) ? orig.sharedReferenceIds.filter(Boolean) : [];
    const origSingle = orig.sharedReferenceId ?? null;
    const mappedMultiple = origMultiple.map(id => refCopyIdByOriginal.get(id) || `${id}-${chosenSuffix}`);
    const mappedSingle = origSingle ? (refCopyIdByOriginal.get(origSingle) || `${origSingle}-${chosenSuffix}`) : null;
    const finalArray = mappedMultiple.length > 0 ? mappedMultiple : (mappedSingle ? [mappedSingle] : []);
    const finalSingle = finalArray.length > 0 ? finalArray[0] : null;
    updates.push(prisma.treeBranchLeafNode.update({
      where: { id: copyId },
      data: {
        sharedReferenceId: finalSingle,
        sharedReferenceIds: finalArray,
        sharedReferenceName: orig.sharedReferenceName ?? null,
        sharedReferenceDescription: orig.sharedReferenceDescription ?? null,
        isSharedReference: false,
        hasData: orig.hasData,
        updatedAt: new Date()
      }
    }));
    applied++;
  }

  await prisma.$transaction(updates);
  return { success: true, applied, suffix: chosenSuffix! };
}
