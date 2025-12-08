import { Prisma, PrismaClient, type TreeBranchLeafNode } from '@prisma/client';
import type { DuplicationContext } from '../../registry/repeat-id-registry.js';
import { logCapacityEvent } from '../repeat-blueprint-writer.js';
import {
  addToNodeLinkedField,
  extractNodeIdsFromConditionSet,
  extractNodeIdsFromTokens,
  getAuthCtx,
  normalizeRefId,
  type MinimalReq
} from './shared-helpers.js';
import { copyVariableWithCapacities } from './variable-copy-engine.js';
import { deriveRepeatContextFromMetadata } from './repeat-context-utils.js';

export interface DeepCopyOptions {
  targetParentId?: string | null;
  labelSuffix?: string;
  suffixNum?: number;
  preserveSharedReferences?: boolean;
  forcedSuffix?: string | number;
  repeatContext?: DuplicationContext;
  cloneExternalParents?: boolean;
}

export interface DeepCopyResult {
  root: { oldId: string; newId: string };
  idMap: Record<string, string>;
  formulaIdMap: Record<string, string>;
  conditionIdMap: Record<string, string>;
  tableIdMap: Record<string, string>;
  displayNodeIds: string[]; // IDs des nœuds d'affichage créés par copyVariableWithCapacities
}

export async function deepCopyNodeInternal(
  prisma: PrismaClient,
  req: MinimalReq,
  nodeId: string,
  opts?: DeepCopyOptions
): Promise<DeepCopyResult> {
  const {
    targetParentId,
    suffixNum,
    preserveSharedReferences = false,
    forcedSuffix,
    repeatContext,
    cloneExternalParents = false
  } = opts || {};

  const replaceIdsInTokens = (tokens: unknown, idMap: Map<string, string>): unknown => {
    if (!tokens) return tokens;
    const mapOne = (s: string) => s.replace(/@value\.([A-Za-z0-9_:-]+)/g, (_m, p1: string) => {
      const newId = idMap.get(p1);
      return newId ? `@value.${newId}` : `@value.${p1}`;
    });
    if (Array.isArray(tokens)) return tokens.map(t => (typeof t === 'string' ? mapOne(t) : t));
    if (typeof tokens === 'string') return mapOne(tokens);
    try {
      const asStr = JSON.stringify(tokens);
      const replaced = mapOne(asStr);
      return JSON.parse(replaced);
    } catch {
      return tokens;
    }
  };

  const replaceIdsInConditionSet = (
    conditionSet: unknown,
    idMap: Map<string, string>,
    formulaIdMap: Map<string, string>
  ): unknown => {
    if (!conditionSet) return conditionSet;
    try {
      let str = JSON.stringify(conditionSet);
      str = str.replace(/@value\.([A-Za-z0-9_:-]+)/g, (_m, p1: string) => `@value.${idMap.get(p1) || p1}`);
      str = str.replace(/node-formula:([a-f0-9-]{36})/gi, (_m, p1: string) => `node-formula:${formulaIdMap.get(p1) || p1}`);
      return JSON.parse(str);
    } catch {
      return conditionSet;
    }
  };

  const source = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    include: { TreeBranchLeafTree: { select: { organizationId: true } } }
  });
  if (!source) {
    throw new Error('Nœud source introuvable');
  }

  const { organizationId, isSuperAdmin } = getAuthCtx(req);
  if (!isSuperAdmin && organizationId && source.TreeBranchLeafTree?.organizationId !== organizationId) {
    throw new Error('Accès non autorisé à cet arbre');
  }

  const sanitizedForcedSuffix = (() => {
    if (forcedSuffix === undefined || forcedSuffix === null) return '';
    const token = `${forcedSuffix}`.trim();
    return token;
  })();

  console.log(`🔍 [DEBUG-DEEP-COPY] nodeId: ${nodeId}, forcedSuffix: ${forcedSuffix}, suffixNum: ${suffixNum}`);
  
  let copySuffixNum = typeof forcedSuffix === 'number' && Number.isFinite(forcedSuffix)
    ? forcedSuffix
    : (suffixNum ?? null);
  
  console.log(`🔍 [DEBUG-DEEP-COPY] copySuffixNum initial: ${copySuffixNum}`);
  
  if (!sanitizedForcedSuffix) {
    // 🎯 FIX CRITIQUE: Si suffixNum est fourni explicitement (par duplicate-templates),
    // l'utiliser DIRECTEMENT sans aucune logique de recalcul automatique
    if (suffixNum != null && Number.isFinite(suffixNum)) {
      console.log(`✅ [DEBUG-DEEP-COPY] SuffixNum fourni explicitement: ${suffixNum} - UTILISATION DIRECTE`);
      copySuffixNum = suffixNum;
    } else if (copySuffixNum != null && Number.isFinite(copySuffixNum)) {
      console.log(`✅ [DEBUG-DEEP-COPY] CopySuffixNum valide: ${copySuffixNum} - UTILISATION DIRECTE`);
      // Déjà assigné, ne pas changer
    } else {
      console.log(`🔄 [DEBUG-DEEP-COPY] Aucun suffix fourni - calcul automatique nécessaire`);
      
      // Normaliser l'ID source en retirant tous les suffixes existants
      // Ex: "54adf56b-...-1" ou "54adf56b-...-1-1" devient "54adf56b-..."
      const baseSourceId = source.id.replace(/-\d+(?:-\d+)*$/, '');
      
      const existingIdsWithSuffix = await prisma.treeBranchLeafNode.findMany({
        where: { 
          treeId: source.treeId, 
          id: { 
            startsWith: `${baseSourceId}-`,
            // Exclure les suffixes composés (on cherche juste -1, -2, -3, pas -1-1)
          } 
        },
        select: { id: true }
      });
      let maxSuffix = 0;
      for (const rec of existingIdsWithSuffix) {
        const rest = rec.id.slice(baseSourceId.length + 1);
        // Ne considérer que les suffixes simples: uniquement des chiffres
        if (/^\d+$/.test(rest)) {
          const num = Number(rest);
          if (Number.isFinite(num) && num > maxSuffix) maxSuffix = num;
        }
      }
      copySuffixNum = maxSuffix + 1;
    }
    console.log(`🎯 [DEBUG-DEEP-COPY] copySuffixNum final: ${copySuffixNum}`);
  }

  const suffixToken = sanitizedForcedSuffix || `${copySuffixNum}`;
  const computedLabelSuffix = `-${suffixToken}`;
  const suffixPattern = new RegExp(`-${suffixToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
  const numericSuffixPattern = /-\d+$/;
  const hasCurrentSuffix = (value: string) => suffixPattern.test(value);
  const hasAnySuffix = (value: string) => hasCurrentSuffix(value) || numericSuffixPattern.test(value);
  const ensureSuffix = (value: string | null | undefined): string | null | undefined => {
    if (!value) return value;
    if (hasCurrentSuffix(value)) return value;
    if (hasAnySuffix(value)) return value;
    return `${value}-${suffixToken}`;
  };
  const buildParentSuffix = (value: string | null | undefined): string | null => {
    if (!value) return value ?? null;
    const base = value.replace(/-\d+$/, '');
    return `${base}-${suffixToken}`;
  };
  const appendSuffix = (value: string): string => `${value}-${suffixToken}`;
  const metadataCopySuffix = Number.isFinite(Number(suffixToken)) ? Number(suffixToken) : suffixToken;
  const derivedRepeatContext =
    repeatContext ?? deriveRepeatContextFromMetadata(source, { suffix: suffixToken });
  const normalizedRepeatContext = derivedRepeatContext
    ? {
        ...derivedRepeatContext,
        suffix: derivedRepeatContext.suffix ?? suffixToken
      }
    : undefined;

  const allNodes = await prisma.treeBranchLeafNode.findMany({ where: { treeId: source.treeId } });
  const byId = new Map(allNodes.map(n => [n.id, n] as const));
  const existingNodeIds = new Set(byId.keys());
  const childrenByParent = new Map<string, string[]>();
  for (const n of allNodes) {
    if (!n.parentId) continue;
    const arr = childrenByParent.get(n.parentId) || [];
    arr.push(n.id);
    childrenByParent.set(n.parentId, arr);
  }

  const toCopy = new Set<string>();
  const queue: string[] = [source.id];
  
  while (queue.length) {
    const cur = queue.shift()!;
    if (toCopy.has(cur)) continue;
    toCopy.add(cur);
    const children = childrenByParent.get(cur) || [];
    for (const c of children) queue.push(c);
  }

  const idMap = new Map<string, string>();
  // Normaliser les IDs avant d'ajouter le suffixe
  // Ex: "uuid-1" devient "uuid-2" et non "uuid-1-2"
  for (const oldId of toCopy) {
    const baseId = oldId.replace(/-\d+(?:-\d+)*$/, '');
    idMap.set(oldId, appendSuffix(baseId));
  }

  const formulaIdMap = new Map<string, string>();
  const conditionIdMap = new Map<string, string>();
  const tableIdMap = new Map<string, string>();
  const displayNodeIds: string[] = []; // IDs des nœuds d'affichage créés par copyVariableWithCapacities

  const directVariableIdByNodeId = new Map<string, string>();
  if (toCopy.size > 0) {
    const nodeVariables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: { in: Array.from(toCopy) } },
      select: { nodeId: true, id: true }
    });
    for (const variable of nodeVariables) {
      if (variable.nodeId && variable.id) {
        directVariableIdByNodeId.set(variable.nodeId, variable.id);
      }
    }
  }

  const buildCreationOrder = (): string[] => {
    const edges = new Map<string, Set<string>>();
    const indegree = new Map<string, number>();
    const ensureNode = (id: string) => {
      if (!edges.has(id)) edges.set(id, new Set());
      if (!indegree.has(id)) indegree.set(id, 0);
    };
    for (const id of toCopy) ensureNode(id);
    for (const id of toCopy) {
      const n = byId.get(id);
      if (n?.parentId && toCopy.has(n.parentId)) {
        const from = n.parentId;
        const to = id;
        const set = edges.get(from)!;
        if (!set.has(to)) {
          set.add(to);
          indegree.set(to, (indegree.get(to) || 0) + 1);
        }
      }
    }
    const localQueue: string[] = [];
    const zeroIndegreeNodes: string[] = [];
    for (const [id, deg] of indegree.entries()) if (deg === 0) zeroIndegreeNodes.push(id);
    // Trier les nœuds sans dépendance par leur ordre pour garantir une création cohérente
    zeroIndegreeNodes.sort((a, b) => {
      const nodeA = byId.get(a);
      const nodeB = byId.get(b);
      const orderA = nodeA?.order ?? 0;
      const orderB = nodeB?.order ?? 0;
      return orderA - orderB;
    });
    localQueue.push(...zeroIndegreeNodes);
    const ordered: string[] = [];
    while (localQueue.length) {
      const id = localQueue.shift()!;
      ordered.push(id);
      const nextNodes: string[] = [];
      for (const next of edges.get(id) || []) {
        const d = (indegree.get(next) || 0) - 1;
        indegree.set(next, d);
        if (d === 0) nextNodes.push(next);
      }
      // Trier les enfants avant de les ajouter à la queue
      nextNodes.sort((a, b) => {
        const nodeA = byId.get(a);
        const nodeB = byId.get(b);
        const orderA = nodeA?.order ?? 0;
        const orderB = nodeB?.order ?? 0;
        return orderA - orderB;
      });
      localQueue.push(...nextNodes);
    }
    if (ordered.length !== toCopy.size) {
      const remaining = new Set(Array.from(toCopy).filter(id => !ordered.includes(id)));
      const depth = new Map<string, number>();
      const getDepth = (id: string): number => {
        if (depth.has(id)) return depth.get(id)!;
        const n = byId.get(id);
        if (!n || !n.parentId || !toCopy.has(n.parentId)) {
          depth.set(id, 0);
          return 0;
        }
        const d = getDepth(n.parentId) + 1;
        depth.set(id, d);
        return d;
      };
      const rest = Array.from(remaining).sort((a, b) => getDepth(a) - getDepth(b));
      return [...ordered, ...rest];
    }
    return ordered;
  };

  const nodesToCreate = buildCreationOrder();
  const createdNodes: Array<{ oldId: string; newId: string; newParentId: string | null }> = [];
  const shouldCloneExternalParents = cloneExternalParents === true;
  const resolvedExternalParents = new Map<string, string | null>();

  const buildCloneData = (
    oldNode: TreeBranchLeafNode,
    newId: string,
    newParentId: string | null
  ): Prisma.TreeBranchLeafNodeCreateInput => ({
    id: newId,
    treeId: oldNode.treeId,
    type: oldNode.type,
    subType: oldNode.subType,
    fieldType: oldNode.fieldType,
    label: oldNode.label ? `${oldNode.label}${computedLabelSuffix}` : oldNode.label,
    description: oldNode.description,
    parentId: newParentId,
    order: oldNode.order,
    isVisible: oldNode.isVisible,
    isActive: oldNode.isActive,
    isRequired: oldNode.isRequired,
    isMultiple: oldNode.isMultiple,
    hasData: oldNode.hasData,
    hasFormula: oldNode.hasFormula,
    hasCondition: oldNode.hasCondition,
    hasTable: oldNode.hasTable,
    hasAPI: oldNode.hasAPI,
    hasLink: oldNode.hasLink,
    hasMarkers: oldNode.hasMarkers,
    defaultValue: oldNode.defaultValue,
    calculatedValue: (oldNode.hasFormula || oldNode.hasCondition || oldNode.hasTable)
      ? null
      : oldNode.calculatedValue,
    appearance_size: oldNode.appearance_size,
    appearance_variant: oldNode.appearance_variant,
    appearance_width: oldNode.appearance_width,
    text_placeholder: oldNode.text_placeholder,
    text_maxLength: oldNode.text_maxLength,
    text_minLength: oldNode.text_minLength,
    text_mask: oldNode.text_mask,
    text_regex: oldNode.text_regex,
    text_rows: oldNode.text_rows,
    text_helpTooltipType: oldNode.text_helpTooltipType,
    text_helpTooltipText: oldNode.text_helpTooltipText,
    text_helpTooltipImage: oldNode.text_helpTooltipImage,
    number_min: oldNode.number_min as unknown as number | undefined,
    number_max: oldNode.number_max as unknown as number | undefined,
    number_step: oldNode.number_step as unknown as number | undefined,
    number_decimals: oldNode.number_decimals,
    number_prefix: oldNode.number_prefix,
    number_suffix: oldNode.number_suffix,
    number_unit: oldNode.number_unit,
    number_defaultValue: oldNode.number_defaultValue as unknown as number | undefined,
    select_multiple: oldNode.select_multiple,
    select_searchable: oldNode.select_searchable,
    select_allowClear: oldNode.select_allowClear,
    select_source: oldNode.select_source
      ? (() => {
          const sourceValue = oldNode.select_source as string;
          if (sourceValue.startsWith('@table.')) {
            const tableId = sourceValue.substring(7);
            const newTableId = idMap.get(tableId);
            if (newTableId) {
              return `@table.${newTableId}`;
            }
          }
          return sourceValue;
        })()
      : oldNode.select_source,
    select_defaultValue: oldNode.select_defaultValue,
    select_options: oldNode.select_options
      ? (() => {
          try {
            const str = JSON.stringify(oldNode.select_options);
            let replaced = str.replace(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, (uuid: string) => idMap.get(uuid) || uuid);
            replaced = replaced.replace(/(node_[a-z0-9_-]+)/gi, (id: string) => idMap.get(id) || id);
            return JSON.parse(replaced) as Prisma.InputJsonValue;
          } catch {
            return oldNode.select_options as Prisma.InputJsonValue;
          }
        })()
      : oldNode.select_options,
    bool_trueLabel: oldNode.bool_trueLabel,
    bool_falseLabel: oldNode.bool_falseLabel,
    bool_defaultValue: oldNode.bool_defaultValue,
    date_format: oldNode.date_format,
    date_minDate: oldNode.date_minDate,
    date_maxDate: oldNode.date_maxDate,
    date_showTime: oldNode.date_showTime,
    image_maxSize: oldNode.image_maxSize,
    image_ratio: oldNode.image_ratio,
    image_crop: oldNode.image_crop,
    image_thumbnails: oldNode.image_thumbnails
      ? (() => {
          try {
            const str = JSON.stringify(oldNode.image_thumbnails);
            let replaced = str.replace(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, (uuid: string) => idMap.get(uuid) || uuid);
            replaced = replaced.replace(/(node_[a-z0-9_-]+)/gi, (id: string) => idMap.get(id) || id);
            return JSON.parse(replaced) as Prisma.InputJsonValue;
          } catch {
            return oldNode.image_thumbnails as Prisma.InputJsonValue;
          }
        })()
      : oldNode.image_thumbnails,
    link_activeId: oldNode.link_activeId,
    link_carryContext: oldNode.link_carryContext,
    link_mode: oldNode.link_mode,
    link_name: oldNode.link_name,
    link_params: oldNode.link_params
      ? (() => {
          try {
            const str = JSON.stringify(oldNode.link_params);
            let replaced = str.replace(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, (uuid: string) => idMap.get(uuid) || uuid);
            replaced = replaced.replace(/(node_[a-z0-9_-]+)/gi, (id: string) => idMap.get(id) || id);
            return JSON.parse(replaced) as Prisma.InputJsonValue;
          } catch {
            return oldNode.link_params as Prisma.InputJsonValue;
          }
        })()
      : oldNode.link_params,
    link_targetNodeId:
      oldNode.link_targetNodeId && idMap.has(oldNode.link_targetNodeId)
        ? idMap.get(oldNode.link_targetNodeId)!
        : oldNode.link_targetNodeId,
    link_targetTreeId: oldNode.link_targetTreeId,
    table_activeId: oldNode.table_activeId ? ensureSuffix(oldNode.table_activeId) : null,
    table_instances: (() => {
      if (!oldNode.table_instances) {
        return oldNode.table_instances as Prisma.InputJsonValue;
      }
      let rawInstances: Record<string, unknown>;
      try {
        if (typeof oldNode.table_instances === 'string') {
          rawInstances = JSON.parse(oldNode.table_instances);
        } else if (typeof oldNode.table_instances === 'object') {
          rawInstances = JSON.parse(JSON.stringify(oldNode.table_instances));
        } else {
          return oldNode.table_instances as Prisma.InputJsonValue;
        }
      } catch {
        return oldNode.table_instances as Prisma.InputJsonValue;
      }
      const updatedInstances: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rawInstances)) {
        const hasSuffixRegex = /-\d+$/;
        const newKey = hasSuffixRegex.test(key) ? key : appendSuffix(key);
        if (value && typeof value === 'object') {
          const tableInstanceObj = value as Record<string, unknown>;
          const updatedObj = { ...tableInstanceObj };
          if (tableInstanceObj.tableId && typeof tableInstanceObj.tableId === 'string') {
            const oldTableId = tableInstanceObj.tableId;
            updatedObj.tableId = hasSuffixRegex.test(oldTableId)
              ? oldTableId
              : appendSuffix(oldTableId);
          }
          updatedInstances[newKey] = updatedObj;
        } else {
          updatedInstances[newKey] = value;
        }
      }
      return updatedInstances as Prisma.InputJsonValue;
    })(),
    table_name: oldNode.table_name,
    // ✅ FIX: Mapper les IDs du template repeater vers leurs copies suffixées
    repeater_templateNodeIds: (() => {
      if (!oldNode.repeater_templateNodeIds) return oldNode.repeater_templateNodeIds;
      try {
        const parsed = typeof oldNode.repeater_templateNodeIds === 'string'
          ? JSON.parse(oldNode.repeater_templateNodeIds)
          : oldNode.repeater_templateNodeIds;
        if (Array.isArray(parsed)) {
          const mapped = parsed.map((tid: string) => idMap.get(tid) || tid);
          return JSON.stringify(mapped);
        }
      } catch {
        // Si le parse échoue, retourner tel quel
      }
      return oldNode.repeater_templateNodeIds;
    })(),
    repeater_templateNodeLabels: oldNode.repeater_templateNodeLabels,
    repeater_minItems: oldNode.repeater_minItems,
    repeater_maxItems: oldNode.repeater_maxItems,
    repeater_addButtonLabel: oldNode.repeater_addButtonLabel,
    repeater_buttonSize: oldNode.repeater_buttonSize,
    repeater_buttonWidth: oldNode.repeater_buttonWidth,
    repeater_iconOnly: oldNode.repeater_iconOnly,
    metadata: {
      ...(typeof oldNode.metadata === 'object' ? (oldNode.metadata as Record<string, unknown>) : {}),
      copiedFromNodeId: oldNode.id,
      copySuffix: metadataCopySuffix
    } as Prisma.InputJsonValue,
    isSharedReference: preserveSharedReferences ? oldNode.isSharedReference : false,
    sharedReferenceId: preserveSharedReferences ? oldNode.sharedReferenceId : null,
    sharedReferenceIds: preserveSharedReferences ? oldNode.sharedReferenceIds : [],
    sharedReferenceName: preserveSharedReferences ? oldNode.sharedReferenceName : null,
    sharedReferenceDescription: preserveSharedReferences ? oldNode.sharedReferenceDescription : null,
    linkedFormulaIds: Array.isArray(oldNode.linkedFormulaIds) ? oldNode.linkedFormulaIds : [],
    linkedConditionIds: Array.isArray(oldNode.linkedConditionIds) ? oldNode.linkedConditionIds : [],
    linkedTableIds: Array.isArray(oldNode.linkedTableIds)
      ? oldNode.linkedTableIds.map(id => ensureSuffix(id) || id)
      : [],
    linkedVariableIds: Array.isArray(oldNode.linkedVariableIds) ? oldNode.linkedVariableIds : [],
    updatedAt: new Date()
  });

  const ensureExternalParentChain = async (
    parentId: string | null | undefined
  ): Promise<string | null> => {
    if (!parentId) {
      return parentId ?? null;
    }

    const cloneParentNodeChain = async (
      originalParentId: string,
      clonedParentId: string
    ): Promise<string | null> => {
      const parentNode = byId.get(originalParentId);
      if (!parentNode) {
        resolvedExternalParents.set(originalParentId, originalParentId ?? null);
        return originalParentId ?? null;
      }
      
      // 🚫 NE PAS cloner les sections si shouldCloneExternalParents = false
      if (!shouldCloneExternalParents && parentNode.type === 'section') {
        console.log(`⏭️ [deep-copy] Skipping section clone: "${parentNode.label}" (shouldCloneExternalParents=false)`);
        resolvedExternalParents.set(originalParentId, originalParentId ?? null);
        return originalParentId ?? null;
      }
      
      const parentOfParentId = await ensureExternalParentChain(parentNode.parentId ?? null);
      const parentCloneData = buildCloneData(parentNode, clonedParentId, parentOfParentId);
      await prisma.treeBranchLeafNode.create({ data: parentCloneData });
      createdNodes.push({ oldId: originalParentId, newId: clonedParentId });
      existingNodeIds.add(clonedParentId);
      resolvedExternalParents.set(originalParentId, clonedParentId);
      idMap.set(originalParentId, clonedParentId);
      return clonedParentId;
    };

    if (!shouldCloneExternalParents) {
      const suffixedParentId = buildParentSuffix(parentId);
      if (suffixedParentId && existingNodeIds.has(suffixedParentId)) {
        resolvedExternalParents.set(parentId, suffixedParentId);
        idMap.set(parentId, suffixedParentId);
        return suffixedParentId;
      }
      const resolvedId = parentId ?? null;
      resolvedExternalParents.set(parentId, resolvedId);
      return resolvedId;
    }

    if (resolvedExternalParents.has(parentId)) {
      const resolvedId = resolvedExternalParents.get(parentId)!;
      if (resolvedId) {
        idMap.set(parentId, resolvedId);
      }
      return resolvedId;
    }

    if (toCopy.has(parentId)) {
      const mappedId = idMap.get(parentId)!;
      resolvedExternalParents.set(parentId, mappedId);
      idMap.set(parentId, mappedId);
      return mappedId;
    }

    const suffixedParentId = buildParentSuffix(parentId);
    if (!suffixedParentId) {
      resolvedExternalParents.set(parentId, parentId ?? null);
      return parentId ?? null;
    }

    if (existingNodeIds.has(suffixedParentId)) {
      resolvedExternalParents.set(parentId, suffixedParentId);
      idMap.set(parentId, suffixedParentId);
      return suffixedParentId;
    }

    return cloneParentNodeChain(parentId, suffixedParentId);
  };

  const resolveParentId = async (
    oldNode: TreeBranchLeafNode,
    isRoot: boolean
  ): Promise<string | null> => {
    if (oldNode.parentId && toCopy.has(oldNode.parentId)) {
      return idMap.get(oldNode.parentId)!;
    }

    if (isRoot && targetParentId !== undefined) {
      return targetParentId ?? null;
    }

    return ensureExternalParentChain(oldNode.parentId);
  };

  for (const oldId of nodesToCreate) {
    const oldNode = byId.get(oldId)!;
    const newId = idMap.get(oldId)!;
    const isRoot = oldId === source.id;

    const newParentId = await resolveParentId(oldNode, isRoot);
    const cloneData = buildCloneData(oldNode, newId, newParentId);

    await prisma.treeBranchLeafNode.create({ data: cloneData });
    createdNodes.push({ oldId, newId, newParentId });
    existingNodeIds.add(newId);
  }

  for (const { oldId, newId, newParentId } of createdNodes) {
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({ where: { nodeId: oldId } });
    for (const f of formulas) {
      const newFormulaId = appendSuffix(f.id);
      formulaIdMap.set(f.id, newFormulaId);
      const newTokens = replaceIdsInTokens(f.tokens, idMap) as Prisma.InputJsonValue;
      await prisma.treeBranchLeafNodeFormula.create({
        data: {
          id: newFormulaId,
          nodeId: newId,
          organizationId: f.organizationId,
          name: f.name ? `${f.name}${computedLabelSuffix}` : f.name,
          tokens: newTokens,
          description: f.description,
          isDefault: f.isDefault,
          order: f.order,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      if (normalizedRepeatContext) {
        const referencedNodeIds = Array.from(extractNodeIdsFromTokens(newTokens));
        logCapacityEvent({
          ownerNodeId: newId,
          capacityId: newFormulaId,
          capacityType: 'formula',
          referencedNodeIds,
          context: normalizedRepeatContext
        });
      }
      try {
        await addToNodeLinkedField(prisma, newId, 'linkedFormulaIds', [newFormulaId]);
        const refs = Array.from(extractNodeIdsFromTokens(newTokens));
        for (const refId of refs) {
          await addToNodeLinkedField(prisma, normalizeRefId(refId), 'linkedFormulaIds', [newFormulaId]);
        }
      } catch (e) {
        console.warn('[TreeBranchLeaf API] Warning updating linkedFormulaIds during deep copy:', (e as Error).message);
      }
    }

    const conditions = await prisma.treeBranchLeafNodeCondition.findMany({ where: { nodeId: oldId } });
    for (const c of conditions) {
      const newConditionId = appendSuffix(c.id);
      conditionIdMap.set(c.id, newConditionId);
      const newSet = replaceIdsInConditionSet(c.conditionSet, idMap, formulaIdMap) as Prisma.InputJsonValue;
      await prisma.treeBranchLeafNodeCondition.create({
        data: {
          id: newConditionId,
          nodeId: newId,
          organizationId: c.organizationId,
          name: c.name ? `${c.name}${computedLabelSuffix}` : c.name,
          conditionSet: newSet,
          description: c.description,
          isDefault: c.isDefault,
          order: c.order,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      if (normalizedRepeatContext) {
        const referencedNodeIds = Array.from(extractNodeIdsFromConditionSet(newSet));
        logCapacityEvent({
          ownerNodeId: newId,
          capacityId: newConditionId,
          capacityType: 'condition',
          referencedNodeIds,
          context: normalizedRepeatContext
        });
      }
      try {
        await addToNodeLinkedField(prisma, newId, 'linkedConditionIds', [newConditionId]);
        const refs = Array.from(extractNodeIdsFromConditionSet(newSet));
        for (const refId of refs) {
          await addToNodeLinkedField(prisma, normalizeRefId(refId), 'linkedConditionIds', [newConditionId]);
        }
      } catch (e) {
        console.warn('[TreeBranchLeaf API] Warning updating linkedConditionIds during deep copy:', (e as Error).message);
      }
    }

    const tables = await prisma.treeBranchLeafNodeTable.findMany({
      where: { nodeId: oldId },
      include: { tableColumns: true, tableRows: true }
    });

    // 🆕 IMPORTANT: Aussi copier les tables référencées via table_activeId qui ne sont PAS liées au nodeId
    // Cas typique: un champ "Orientation" template (22de...) référence une table (0701ed...) 
    // qui est liée à un display node (440d...), pas au template node lui-même
    const additionalTableIds: string[] = [];
    if (source.table_activeId && !tables.some(t => t.id === source.table_activeId)) {
      additionalTableIds.push(source.table_activeId);
    }
    
    // Charger ces tables additionnelles
    const additionalTables = additionalTableIds.length > 0 
      ? await prisma.treeBranchLeafNodeTable.findMany({
          where: { id: { in: additionalTableIds } },
          include: { tableColumns: true, tableRows: true }
        })
      : [];
    
    // Combiner toutes les tables à copier
    const allTablesToCopy = [...tables, ...additionalTables];
    
    if (additionalTables.length > 0) {
      console.log(`[DEEP-COPY] 📊 Tables additionnelles trouvées via table_activeId: ${additionalTables.map(t => t.id).join(', ')}`);
    }
    
    for (const t of allTablesToCopy) {
      const newTableId = appendSuffix(t.id);
      tableIdMap.set(t.id, newTableId);
      
      // Vérifier si la table copiée existe déjà
      const existingTable = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: newTableId }
      });
      
      if (existingTable) {
        console.log(`[DEEP-COPY] ⏩ Table ${newTableId} existe déjà, skip`);
        continue;
      }
      
      console.log(`[DEEP-COPY] 📊 Copie table: ${t.id} -> ${newTableId} (source nodeId: ${t.nodeId}, target nodeId: ${newId})`);
      
      await prisma.treeBranchLeafNodeTable.create({
        data: {
          id: newTableId,
          nodeId: newId,
          organizationId: t.organizationId,
          name: t.name ? `${t.name}${computedLabelSuffix}` : t.name,
          description: t.description,
          type: t.type,
          rowCount: t.rowCount,
          columnCount: t.columnCount,
          meta: t.meta as Prisma.InputJsonValue,
          isDefault: t.isDefault,
          order: t.order,
          createdAt: new Date(),
          updatedAt: new Date(),
          lookupDisplayColumns: t.lookupDisplayColumns,
          lookupSelectColumn: t.lookupSelectColumn,
          tableColumns: {
            create: t.tableColumns.map(col => ({
              id: appendSuffix(col.id),
              columnIndex: col.columnIndex,
              name: col.name ? `${col.name}${computedLabelSuffix}` : col.name,
              type: col.type,
              width: col.width,
              format: col.format,
              metadata: col.metadata as Prisma.InputJsonValue
            }))
          },
          tableRows: {
            create: t.tableRows.map(row => ({
              id: appendSuffix(row.id),
              rowIndex: row.rowIndex,
              cells: row.cells as Prisma.InputJsonValue
            }))
          }
        }
      });
      if (normalizedRepeatContext) {
        logCapacityEvent({
          ownerNodeId: newId,
          capacityId: newTableId,
          capacityType: 'table',
          referencedNodeIds: undefined,
          context: normalizedRepeatContext
        });
      }
      try {
        await addToNodeLinkedField(prisma, newId, 'linkedTableIds', [newTableId]);
      } catch (e) {
        console.warn('[TreeBranchLeaf API] Warning updating linkedTableIds during deep copy:', (e as Error).message);
      }
    }

    // 🆕 COPIE DES SELECT CONFIGS (TreeBranchLeafSelectConfig)
    // C'est crucial pour les champs "données d'affichage" qui utilisent des lookups
    const originalSelectConfig = await prisma.treeBranchLeafSelectConfig.findUnique({
      where: { nodeId: oldId }
    });

    if (originalSelectConfig) {
      // Vérifier si la copie existe déjà
      const existingCopyConfig = await prisma.treeBranchLeafSelectConfig.findUnique({
        where: { nodeId: newId }
      });

      if (!existingCopyConfig) {
        // Calculer le nouveau tableReference avec le suffixe
        const newTableReference = originalSelectConfig.tableReference 
          ? appendSuffix(originalSelectConfig.tableReference)
          : null;

        console.log(`[DEEP-COPY] 📊 Duplication SELECT config: ${oldId} -> ${newId} (tableRef: ${newTableReference})`);

        try {
          await prisma.treeBranchLeafSelectConfig.create({
            data: {
              id: appendSuffix(originalSelectConfig.id),
              nodeId: newId,
              options: originalSelectConfig.options as any,
              multiple: originalSelectConfig.multiple,
              searchable: originalSelectConfig.searchable,
              allowCustom: originalSelectConfig.allowCustom,
              maxSelections: originalSelectConfig.maxSelections,
              optionsSource: originalSelectConfig.optionsSource,
              apiEndpoint: originalSelectConfig.apiEndpoint,
              tableReference: newTableReference,
              dependsOnNodeId: originalSelectConfig.dependsOnNodeId 
                ? (idMap.get(originalSelectConfig.dependsOnNodeId) || appendSuffix(originalSelectConfig.dependsOnNodeId))
                : null,
              keyColumn: originalSelectConfig.keyColumn 
                ? `${originalSelectConfig.keyColumn}${computedLabelSuffix}`
                : null,
              valueColumn: originalSelectConfig.valueColumn
                ? `${originalSelectConfig.valueColumn}${computedLabelSuffix}`
                : null,
              displayColumn: originalSelectConfig.displayColumn
                ? `${originalSelectConfig.displayColumn}${computedLabelSuffix}`
                : null,
              displayRow: originalSelectConfig.displayRow,
              keyRow: originalSelectConfig.keyRow,
              valueRow: originalSelectConfig.valueRow,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          console.log(`[DEEP-COPY] ✅ SELECT config créée pour ${newId}`);
        } catch (selectConfigErr) {
          console.warn(`[DEEP-COPY] ⚠️ Erreur création SELECT config pour ${newId}:`, (selectConfigErr as Error).message);
        }
      } else {
        console.log(`[DEEP-COPY] ♻️ SELECT config existe déjà pour ${newId}`);
      }
    }

    // 🆕 COPIE DES NUMBER CONFIGS (TreeBranchLeafNumberConfig)
    const originalNumberConfig = await prisma.treeBranchLeafNumberConfig.findUnique({
      where: { nodeId: oldId }
    });

    if (originalNumberConfig) {
      const existingCopyNumberConfig = await prisma.treeBranchLeafNumberConfig.findUnique({
        where: { nodeId: newId }
      });

      if (!existingCopyNumberConfig) {
        console.log(`[DEEP-COPY] 🔢 Duplication NUMBER config: ${oldId} -> ${newId}`);

        try {
          await prisma.treeBranchLeafNumberConfig.create({
            data: {
              id: appendSuffix(originalNumberConfig.id),
              nodeId: newId,
              min: originalNumberConfig.min,
              max: originalNumberConfig.max,
              decimals: originalNumberConfig.decimals,
              step: originalNumberConfig.step,
              unit: originalNumberConfig.unit,
              prefix: originalNumberConfig.prefix
            }
          });
          console.log(`[DEEP-COPY] ✅ NUMBER config créée pour ${newId}`);
        } catch (numberConfigErr) {
          console.warn(`[DEEP-COPY] ⚠️ Erreur création NUMBER config pour ${newId}:`, (numberConfigErr as Error).message);
        }
      }
    }
  }

  const variableCopyCache = new Map<string, string>();
  for (const oldNodeId of toCopy) {
    const newNodeId = idMap.get(oldNodeId)!;
    const oldNode = byId.get(oldNodeId)!;

    const newLinkedFormulaIds = (Array.isArray(oldNode.linkedFormulaIds) ? oldNode.linkedFormulaIds : [])
      .map(id => {
        const mappedId = formulaIdMap.get(id);
        if (mappedId) return mappedId;
        const ensured = ensureSuffix(id);
        return ensured || appendSuffix(id);
      })
      .filter(Boolean);

    const newLinkedConditionIds = (Array.isArray(oldNode.linkedConditionIds) ? oldNode.linkedConditionIds : [])
      .map(id => {
        const mappedId = conditionIdMap.get(id);
        if (mappedId) return mappedId;
        const ensured = ensureSuffix(id);
        return ensured || appendSuffix(id);
      })
      .filter(Boolean);

    const newLinkedTableIds = (Array.isArray(oldNode.linkedTableIds) ? oldNode.linkedTableIds : [])
      .map(id => {
        const mappedId = tableIdMap.get(id);
        if (mappedId) return mappedId;
        const ensured = ensureSuffix(id);
        return ensured || appendSuffix(id);
      })
      .filter(Boolean);

    const sourceLinkedVariableIds = new Set<string>();
    if (Array.isArray(oldNode.linkedVariableIds)) {
      for (const rawId of oldNode.linkedVariableIds) {
        if (typeof rawId === 'string') {
          const normalized = rawId.trim();
          if (normalized) {
            sourceLinkedVariableIds.add(normalized);
          }
        }
      }
    }
    const directVarIdForNode = directVariableIdByNodeId.get(oldNodeId);
    if (directVarIdForNode) {
      sourceLinkedVariableIds.add(directVarIdForNode);
    }

    const newLinkedVariableIds: string[] = [];
    // 🔗 Tracker: Map de ownerNodeId -> liste des variables copiées pour ce owner
    const copiedVarsByOwner = new Map<string, string[]>();
    
    if (sourceLinkedVariableIds.size > 0) {
      for (const linkedVarId of sourceLinkedVariableIds) {
        const isSharedRef = linkedVarId.startsWith('shared-ref-');
        if (isSharedRef) {
          newLinkedVariableIds.push(linkedVarId);
        } else {
          try {
            const copyResult = await copyVariableWithCapacities(
              linkedVarId,
              suffixToken,
              newNodeId,
              prisma,
              {
                formulaIdMap,
                conditionIdMap,
                tableIdMap,
                nodeIdMap: idMap,
                variableCopyCache,
                autoCreateDisplayNode: true,
                displayNodeAlreadyCreated: false,
                displayParentId: newParentId,
                isFromRepeaterDuplication: true,
                repeatContext: normalizedRepeatContext
              }
            );
            if (copyResult.success) {
              newLinkedVariableIds.push(copyResult.variableId);
              if (copyResult.displayNodeId) {
                displayNodeIds.push(copyResult.displayNodeId);
              }
              
              // 🔗 Track: Retrouver le nœud propriétaire de la variable originale
              const originalVar = await prisma.treeBranchLeafNodeVariable.findUnique({
                where: { id: linkedVarId },
                select: { nodeId: true }
              });
              if (originalVar?.nodeId) {
                if (!copiedVarsByOwner.has(originalVar.nodeId)) {
                  copiedVarsByOwner.set(originalVar.nodeId, []);
                }
                copiedVarsByOwner.get(originalVar.nodeId)!.push(copyResult.variableId);
              }
            } else {
              newLinkedVariableIds.push(linkedVarId);
            }
          } catch (e) {
            newLinkedVariableIds.push(linkedVarId);
          }
        }
      }
    }

    if (
      newLinkedFormulaIds.length > 0 ||
      newLinkedConditionIds.length > 0 ||
      newLinkedTableIds.length > 0 ||
      newLinkedVariableIds.length > 0
    ) {
      try {
        await prisma.treeBranchLeafNode.update({
          where: { id: newNodeId },
          data: {
            linkedFormulaIds: newLinkedFormulaIds.length > 0 ? { set: newLinkedFormulaIds } : { set: [] },
            linkedConditionIds: newLinkedConditionIds.length > 0 ? { set: newLinkedConditionIds } : { set: [] },
            linkedTableIds: newLinkedTableIds.length > 0 ? { set: newLinkedTableIds } : { set: [] },
            linkedVariableIds: newLinkedVariableIds.length > 0 ? { set: newLinkedVariableIds } : { set: [] }
          }
        });
        
        // 🔗 ÉTAPE CRÍTICA: Mettre à jour aussi les nœuds PROPRIÉTAIRES des variables
        // Chaque nœud propriétaire doit avoir les variables copiées dans son linkedVariableIds
        if (copiedVarsByOwner.size > 0) {
          for (const [ownerNodeId, copiedVarIds] of copiedVarsByOwner) {
            try {
              // 1. Récupérer linkedVariableIds actuel du propriétaire
              const ownerNode = await prisma.treeBranchLeafNode.findUnique({
                where: { id: ownerNodeId },
                select: { linkedVariableIds: true }
              });
              
              if (ownerNode) {
                // 2. Fusionner avec les variables copiées
                const currentVarIds = ownerNode.linkedVariableIds || [];
                const updatedVarIds = Array.from(new Set([...currentVarIds, ...copiedVarIds]));
                
                // 3. Mettre à jour le propriétaire
                await prisma.treeBranchLeafNode.update({
                  where: { id: ownerNodeId },
                  data: {
                    linkedVariableIds: { set: updatedVarIds }
                  }
                });
                
                console.log(`[DEEP-COPY] 🔗 Nœud propriétaire ${ownerNodeId} mis à jour avec ${copiedVarIds.length} variable(s) copiée(s)`);
              }
            } catch (e) {
              console.warn(`[DEEP-COPY] ⚠️ Erreur lors de la mise à jour du nœud propriétaire ${ownerNodeId}:`, (e as Error).message);
            }
          }
        }
      } catch (e) {
        console.warn('[DEEP-COPY] Erreur lors du UPDATE des linked***', (e as Error).message);
      }
    }
  }

  const rootNewId = idMap.get(source.id)!;

  // ------------------------------------------------------------------
  // POST-PROCESS: ensure duplicated display nodes keep their data_activeId
  // ------------------------------------------------------------------
  try {
    const newNodeIds = Array.from(idMap.values());
    if (newNodeIds.length > 0) {
      const copiedVariables = await prisma.treeBranchLeafNodeVariable.findMany({
        where: { nodeId: { in: newNodeIds } },
        select: {
          nodeId: true,
          id: true,
          exposedKey: true,
          displayFormat: true,
          precision: true,
          unit: true,
          visibleToUser: true,
          displayName: true
        }
      });

      for (const variable of copiedVariables) {
        try {
          await prisma.treeBranchLeafNode.updateMany({
            where: {
              id: variable.nodeId,
              OR: [{ data_activeId: null }, { hasData: false }]
            },
            data: {
              hasData: true,
              data_activeId: variable.id,
              data_exposedKey: variable.exposedKey,
              data_displayFormat: variable.displayFormat,
              data_precision: variable.precision,
              data_unit: variable.unit,
              data_visibleToUser: variable.visibleToUser,
              label: variable.displayName || undefined,
              field_label: variable.displayName || undefined
            }
          });
        } catch (syncError) {
          console.warn('[DEEP-COPY] Post-copy data sync failed for node', variable.nodeId, (syncError as Error).message);
        }
      }
    }
  } catch (syncPassThroughError) {
    console.warn('[DEEP-COPY] Post-copy data sync skipped:', (syncPassThroughError as Error).message);
  }

  return {
    root: { oldId: source.id, newId: rootNewId },
    idMap: Object.fromEntries(idMap),
    formulaIdMap: Object.fromEntries(formulaIdMap),
    conditionIdMap: Object.fromEntries(conditionIdMap),
    tableIdMap: Object.fromEntries(tableIdMap),
    displayNodeIds
  };
}
