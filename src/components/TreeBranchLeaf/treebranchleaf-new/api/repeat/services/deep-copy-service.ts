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
import { copyFormulaCapacity } from '../../copy-capacity-formula.js';
import { TableLookupDuplicationService } from './table-lookup-duplication-service';
import { applySuffixToSourceRef } from '../utils/source-ref.js';

export interface DeepCopyOptions {
  targetParentId?: string | null;
  labelSuffix?: string;
  suffixNum?: number;
  preserveSharedReferences?: boolean;
  forcedSuffix?: string | number;
  repeatContext?: DuplicationContext;
  cloneExternalParents?: boolean;
  /** Flag indiquant que la copie provient d'une duplication par repeater */
  isFromRepeaterDuplication?: boolean;
  /** PERF: Pre-loaded tree nodes to avoid redundant findMany({treeId}) per template */
  preloadedTreeNodes?: TreeBranchLeafNode[];
}

export interface DeepCopyResult {
  root: { oldId: string; newId: string };
  idMap: Record<string, string>;
  formulaIdMap: Record<string, string>;
  conditionIdMap: Record<string, string>;
  tableIdMap: Record<string, string>;
  displayNodeIds: string[]; // IDs des nÃ…â€œuds d'affichage crÃƒÂ©ÃƒÂ©s par copyVariableWithCapacities
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
    cloneExternalParents = false,
    isFromRepeaterDuplication = false
  } = opts || {};

  const replaceIdsInTokens = (tokens: unknown, idMap: Map<string, string>): unknown => {
    if (!tokens) return tokens;
    
    const mapOne = (s: string) => s.replace(/@value\.([A-Za-z0-9_:-]+)/g, (_m, p1: string) => {
      // Ã°Å¸Å½Â¯ Ãƒâ€°TAPE 1: Chercher dans idMap (nÃ…â€œuds copiÃƒÂ©s dans cette copie)
      if (idMap.has(p1)) {
        const newId = idMap.get(p1)!;
        return `@value.${newId}`;
      }
      
      // Ã°Å¸Å½Â¯ Ãƒâ€°TAPE 2: Si le nÃ…â€œud n'est pas dans idMap, c'est une rÃƒÂ©fÃƒÂ©rence EXTERNE
      // On doit TOUJOURS suffixer pour crÃƒÂ©er la copie rÃƒÂ©fÃƒÂ©rencÃƒÂ©e
      const suffixedId = appendSuffix(p1);
      return `@value.${suffixedId}`;
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
      
      // Ã°Å¸Å½Â¯ Remplacer les rÃƒÂ©fÃƒÂ©rences @value.nodeId
      str = str.replace(/@value\.([A-Za-z0-9_:-]+)/g, (_m, p1: string) => {
        // Chercher dans idMap d'abord (nÃ…â€œuds copiÃƒÂ©s dans cette copie)
        if (idMap.has(p1)) {
          const newId = idMap.get(p1)!;
          return `@value.${newId}`;
        }
        
        // TOUJOURS suffixer les rÃƒÂ©fÃƒÂ©rences externes
        const suffixedId = appendSuffix(p1);
        return `@value.${suffixedId}`;
      });
      
      // Ã°Å¸Å½Â¯ Remplacer les rÃƒÂ©fÃƒÂ©rences node-formula:
      str = str.replace(/node-formula:([a-f0-9-]{36})/gi, (_m, p1: string) => {
        const newId = formulaIdMap.get(p1) || p1;
        return `node-formula:${newId}`;
      });
      
      // Ã°Å¸Å½Â¯ Remplacer les nodeIds directs dans les actions (shared-ref, node IDs)
      str = str.replace(/("nodeIds":\s*\["?)([a-zA-Z0-9_:-]+)/g, (_m, prefix: string, nodeId: string) => {
        // Si c'est une rÃƒÂ©fÃƒÂ©rence avec : (node-formula:, condition:, etc), on l'a dÃƒÂ©jÃƒÂ  traitÃƒÂ©e
        if (nodeId.includes(':')) {
          return _m;
        }
        
        // Si c'est un shared-ref- ou un node ID, on doit le suffixer
        if (nodeId.startsWith('shared-ref-') || !nodeId.includes('-')) {
          // C'est un shared-ref ou un simple ID, doit ÃƒÂªtre suffixÃƒÂ©
          if (idMap.has(nodeId)) {
            const newId = idMap.get(nodeId)!;
            return prefix + newId;
          }
          
          // Suffixer directement
          const suffixedId = appendSuffix(nodeId);
          return prefix + suffixedId;
        }
        
        return _m;
      });
      
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
    throw new Error('NÃ…â€œud source introuvable');
  }

  const { organizationId, isSuperAdmin } = getAuthCtx(req);
  if (!isSuperAdmin && organizationId && source.TreeBranchLeafTree?.organizationId !== organizationId) {
    throw new Error('AccÃƒÂ¨s non autorisÃƒÂ© ÃƒÂ  cet arbre');
  }

  const sanitizedForcedSuffix = (() => {
    if (forcedSuffix === undefined || forcedSuffix === null) return '';
    const token = `${forcedSuffix}`.trim();
    return token;
  })();

  
  let copySuffixNum = typeof forcedSuffix === 'number' && Number.isFinite(forcedSuffix)
    ? forcedSuffix
    : (suffixNum ?? null);
  
  
  if (!sanitizedForcedSuffix) {
    // Ã°Å¸Å½Â¯ FIX CRITIQUE: Si suffixNum est fourni explicitement (par duplicate-templates),
    // l'utiliser DIRECTEMENT sans aucune logique de recalcul automatique
    if (suffixNum != null && Number.isFinite(suffixNum)) {
      copySuffixNum = suffixNum;
    } else if (copySuffixNum != null && Number.isFinite(copySuffixNum)) {
      // DÃƒÂ©jÃƒÂ  assignÃƒÂ©, ne pas changer
    } else {
      
      // Normaliser l'ID source en retirant tous les suffixes existants
      // Ex: "54adf56b-...-1" ou "54adf56b-...-1-1" devient "54adf56b-..."
      const baseSourceId = source.id.replace(/-\d+(?:-\d+)*$/, '');
      
      const existingIdsWithSuffix = await prisma.treeBranchLeafNode.findMany({
        where: { 
          treeId: source.treeId, 
          id: { 
            startsWith: `${baseSourceId}-`,
            // Exclure les suffixes composÃƒÂ©s (on cherche juste -1, -2, -3, pas -1-1)
          } 
        },
        select: { id: true }
      });
      let maxSuffix = 0;
      for (const rec of existingIdsWithSuffix) {
        const rest = rec.id.slice(baseSourceId.length + 1);
        // Ne considÃƒÂ©rer que les suffixes simples: uniquement des chiffres
        if (/^\d+$/.test(rest)) {
          const num = Number(rest);
          if (Number.isFinite(num) && num > maxSuffix) maxSuffix = num;
        }
      }
      copySuffixNum = maxSuffix + 1;
    }
  }

  const suffixToken = sanitizedForcedSuffix || `${copySuffixNum}`;
  const computedLabelSuffix = `-${suffixToken}`;
  const suffixPattern = new RegExp(`-${suffixToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
  const numericSuffixPattern = /-\d+$/;
  const hasCurrentSuffix = (value: string) => suffixPattern.test(value);
  const stripNumericSuffix = (value: string): string => value.replace(/-\d+(?:-\d+)*$/, '');
  const hasAnySuffix = (value: string) => hasCurrentSuffix(value) || numericSuffixPattern.test(value);
  const ensureSuffix = (value: string | null | undefined): string | null | undefined => {
    if (!value) return value;
    if (hasCurrentSuffix(value)) return value;
    // Ã¢Å¡Â Ã¯Â¸Â Toujours recalculer le suffixe lorsqu'il est diffÃƒÂ©rent (ex: passer de -1 ÃƒÂ  -2)
    const base = stripNumericSuffix(value);
    return `${base}-${suffixToken}`;
  };
  const buildParentSuffix = (value: string | null | undefined): string | null => {
    if (!value) return value ?? null;
    const base = value.replace(/-\d+$/, '');
    return `${base}-${suffixToken}`;
  };
  const appendSuffix = (value: string): string => `${value}-${suffixToken}`;
  const normalizeLabelWithSuffix = (value: string | null | undefined): string | null | undefined => {
    if (!value) return value;
    const base = value.replace(/-\d+(?:-\d+)*$/, '');
    // Si dÃƒÂ©jÃƒÂ  suffixÃƒÂ© par ce token, ne pas doubler
    if (hasCurrentSuffix(value)) return `${base}-${suffixToken}`;
    return `${base}-${suffixToken}`;
  };
  const metadataCopySuffix = Number.isFinite(Number(suffixToken)) ? Number(suffixToken) : suffixToken;
  const derivedRepeatContext =
    repeatContext ?? deriveRepeatContextFromMetadata(source, { suffix: suffixToken });
  const normalizedRepeatContext = derivedRepeatContext
    ? {
        ...derivedRepeatContext,
        suffix: derivedRepeatContext.suffix ?? suffixToken
      }
    : undefined;

  // PERF: Use pre-loaded tree nodes if available (avoids 1 full-tree load per template)
  const allNodes = opts?.preloadedTreeNodes ?? await prisma.treeBranchLeafNode.findMany({ where: { treeId: source.treeId } });
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
  // Les templateNodeIds sont maintenant garantis sans suffixes grâce au filtrage en amont
  // On applique directement le suffixe sans normalisation
  for (const oldId of toCopy) {
    const candidateId = appendSuffix(oldId);
    idMap.set(oldId, candidateId);
  }

  const formulaIdMap = new Map<string, string>();
  const conditionIdMap = new Map<string, string>();
  const tableIdMap = new Map<string, string>();
  const displayNodeIds: string[] = []; // IDs des nÃ…â€œuds d'affichage crÃƒÂ©ÃƒÂ©s par copyVariableWithCapacities

  // Ã°Å¸â€Â´ FIX: Un nÃ…â€œud peut avoir PLUSIEURS variables (affichage multiples)
  // Utiliser une Map<nodeId, Set<variableIds>> au lieu de Map<nodeId, variableId>
  const directVariableIdByNodeId = new Map<string, Set<string>>();
  if (toCopy.size > 0) {
    const nodeVariables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: { in: Array.from(toCopy) } },
      select: { nodeId: true, id: true }
    });
    for (const variable of nodeVariables) {
      if (variable.nodeId && variable.id) {
        if (!directVariableIdByNodeId.has(variable.nodeId)) {
          directVariableIdByNodeId.set(variable.nodeId, new Set());
        }
        directVariableIdByNodeId.get(variable.nodeId)!.add(variable.id);
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
    // Trier les nÃ…â€œuds sans dÃƒÂ©pendance par leur ordre pour garantir une crÃƒÂ©ation cohÃƒÂ©rente
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
      // Trier les enfants avant de les ajouter ÃƒÂ  la queue
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
    label: normalizeLabelWithSuffix(oldNode.label) ?? oldNode.label,
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
    // Ã°Å¸â€Â§ FIX: Copier les propriÃƒÂ©tÃƒÂ©s data_* pour hÃƒÂ©riter de l'unitÃƒÂ© et de la prÃƒÂ©cision
    data_unit: oldNode.data_unit,
    data_precision: oldNode.data_precision,
    data_displayFormat: oldNode.data_displayFormat,
    data_exposedKey: oldNode.data_exposedKey,
    data_visibleToUser: oldNode.data_visibleToUser,
    defaultValue: oldNode.defaultValue,
    calculatedValue: oldNode.calculatedValue,
    appearance_size: oldNode.appearance_size,
    appearance_variant: oldNode.appearance_variant,
    appearance_width: oldNode.appearance_width,
    appearance_displayIcon: oldNode.appearance_displayIcon,
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
    // 📸 AI MEASURE: Copier la configuration IA Mesure Photo
    aiMeasure_enabled: oldNode.aiMeasure_enabled,
    aiMeasure_autoTrigger: oldNode.aiMeasure_autoTrigger,
    aiMeasure_prompt: oldNode.aiMeasure_prompt,
    aiMeasure_keys: oldNode.aiMeasure_keys,
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
    // IMPORTANT: table_activeId doit être mappé via tableIdMap (créé lors de la copie des tables),
    // pas via un simple suffixe. On le synchronise plus bas après la copie des tables.
    table_activeId: null,
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
    // Ã°Å¸â€Â´ CRITIQUE: Garder TOUJOURS les repeater_templateNodeIds ORIGINAUX (pas de suffixe!)
    // Les templateNodeIds doivent ÃƒÂªtre les UUIDs purs des templates originaux,
    // JAMAIS les IDs suffixÃƒÂ©s des copies (-1, -2, etc.)
    // Si on mappe vers les suffixÃƒÂ©s, la 2e duplication trouvera uuid-A-1 au lieu de uuid-A!
    repeater_templateNodeIds: (() => {
      // Ã°Å¸â€Â´ CRITIQUE: Ne PAS copier la configuration de repeater lors d'une duplication via repeater
      // Si on copie un template en tant que partie d'un repeater, la copie ne doit PAS
      // conserver `repeater_templateNodeIds` (la copie ne doit pas devenir un repeater).
      if (normalizedRepeatContext) return null;
      
      // Ã¢Å“â€¦ FIX: JAMAIS mapper les IDs! Garder les IDs originaux sans suffixes
      if (!oldNode.repeater_templateNodeIds) return oldNode.repeater_templateNodeIds;
      
      // Retourner tel quel - les templateNodeIds doivent rester inchangÃƒÂ©s
      // (ils contiennent dÃƒÂ©jÃƒÂ  les IDs originaux purs sans suffixes)
      return oldNode.repeater_templateNodeIds;
    })(),
    repeater_templateNodeLabels: oldNode.repeater_templateNodeLabels,
    repeater_minItems: oldNode.repeater_minItems,
    repeater_maxItems: oldNode.repeater_maxItems,
    repeater_addButtonLabel: oldNode.repeater_addButtonLabel,
    repeater_buttonSize: oldNode.repeater_buttonSize,
    repeater_buttonWidth: oldNode.repeater_buttonWidth,
    repeater_iconOnly: oldNode.repeater_iconOnly,
    metadata: (() => {
      const origMeta = (typeof oldNode.metadata === 'object' ? (oldNode.metadata as Record<string, unknown>) : {});
      const newMeta = { ...origMeta, copiedFromNodeId: oldNode.id, copySuffix: metadataCopySuffix } as Record<string, unknown>;

      // FIX 24/01/2026: Suffixer TOUS les champs lookup (sourceField, comparisonColumn, displayColumn, displayRow)
      if ((newMeta as any).lookup) {
        const suf = `-${suffixNum}`;
        
        // ETAPE 2: Suffixer sourceField (champ source arborescence)
        if ((newMeta as any).lookup.rowSourceOption?.sourceField) {
          const sf = (newMeta as any).lookup.rowSourceOption.sourceField;
          if (typeof sf === 'string' && !/^\d+$/.test(sf) && !sf.endsWith(suf)) {
            (newMeta as any).lookup.rowSourceOption.sourceField = `${sf}${suf}`;
          }
        }
        if ((newMeta as any).lookup.columnSourceOption?.sourceField) {
          const sf = (newMeta as any).lookup.columnSourceOption.sourceField;
          if (typeof sf === 'string' && !/^\d+$/.test(sf) && !sf.endsWith(suf)) {
            (newMeta as any).lookup.columnSourceOption.sourceField = `${sf}${suf}`;
          }
        }
        
        // ETAPE 2.5: Suffixer comparisonColumn (colonne comparaison)
        if ((newMeta as any).lookup.rowSourceOption?.comparisonColumn) {
          const cc = (newMeta as any).lookup.rowSourceOption.comparisonColumn;
          if (typeof cc === 'string' && !/^\d+$/.test(cc) && !cc.endsWith(suf)) {
            (newMeta as any).lookup.rowSourceOption.comparisonColumn = `${cc}${suf}`;
          }
        }
        if ((newMeta as any).lookup.columnSourceOption?.comparisonColumn) {
          const cc = (newMeta as any).lookup.columnSourceOption.comparisonColumn;
          if (typeof cc === 'string' && !/^\d+$/.test(cc) && !cc.endsWith(suf)) {
            (newMeta as any).lookup.columnSourceOption.comparisonColumn = `${cc}${suf}`;
          }
        }
        
        // ETAPE 2.5 suite: Suffixer displayRow
        if ((newMeta as any).lookup.displayRow) {
          if (Array.isArray((newMeta as any).lookup.displayRow)) {
            (newMeta as any).lookup.displayRow = ((newMeta as any).lookup.displayRow as string[]).map((r: string) =>
              r && !/^\d+$/.test(r) && !r.endsWith(suf) ? `${r}${suf}` : r
            );
          } else if (typeof (newMeta as any).lookup.displayRow === 'string') {
            const dr = (newMeta as any).lookup.displayRow;
            if (!/^\d+$/.test(dr) && !dr.endsWith(suf)) {
              (newMeta as any).lookup.displayRow = `${dr}${suf}`;
            }
          }
        }
        
        // ETAPE 4: Suffixer displayColumn (colonnes affichage)
        if ((newMeta as any).lookup.displayColumn) {
          const col = (newMeta as any).lookup.displayColumn;
          if (Array.isArray(col)) {
            (newMeta as any).lookup.displayColumn = col.map((c: string) => 
              c && !/^\d+$/.test(c) && !c.endsWith(suf) ? `${c}${suf}` : c
            );
          } else if (typeof col === 'string' && !/^\d+$/.test(col) && !col.endsWith(suf)) {
            (newMeta as any).lookup.displayColumn = `${col}${suf}`;
          }
        }
      }
      // Ã°Å¸â€Â´ Ne pas copier la configuration de repeater dans les clones crÃƒÂ©ÃƒÂ©s via un repeater
      if (normalizedRepeatContext && newMeta.repeater) {
        delete newMeta.repeater;
      }
      
      // 🎯 CRITIQUE: Suffixer les triggerNodeIds pour les display fields
      // Les triggers doivent pointer vers les champs suffixés dans la copie
      if (newMeta.triggerNodeIds && Array.isArray(newMeta.triggerNodeIds)) {
        const oldTriggers = [...newMeta.triggerNodeIds];
        newMeta.triggerNodeIds = (newMeta.triggerNodeIds as string[]).map((triggerId: string) => {
          // Extraire l'ID pur si le trigger est au format @value.xxx ou {xxx}
          const cleanId = triggerId.replace(/^@value\./, '').replace(/^{/, '').replace(/}$/, '');
          
          // Si l'ID est dans l'idMap (copié dans cette opération), utiliser le nouvel ID
          if (idMap.has(cleanId)) {
            const newTriggerId = idMap.get(cleanId)!;
            // Restaurer le format original
            if (triggerId.startsWith('@value.')) {
              return `@value.${newTriggerId}`;
            } else if (triggerId.startsWith('{')) {
              return `{${newTriggerId}}`;
            }
            return newTriggerId;
          }
          
          // Si l'ID n'est pas dans idMap, c'est une référence externe → suffixer
          const suffixedId = appendSuffix(cleanId);
          if (triggerId.startsWith('@value.')) {
            return `@value.${suffixedId}`;
          } else if (triggerId.startsWith('{')) {
            return `{${suffixedId}}`;
          }
          return suffixedId;
        });
      }
      
      return newMeta as Prisma.InputJsonValue;
    })(),
    // Ã°Å¸â€Â§ TRAITER LE fieldConfig: suffix les rÃƒÂ©fÃƒÂ©rences aux nodes
    fieldConfig: (() => {
      if (!oldNode.fieldConfig) {
        return oldNode.fieldConfig;
      }
      try {
        const str = JSON.stringify(oldNode.fieldConfig);
        // Remplacer les UUIDs par leurs versions suffixÃƒÂ©es
        let replaced = str.replace(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, (uuid: string) => {
          const mapped = idMap.get(uuid);
          if (mapped) {
            return mapped;
          }
          // Si pas dans la map et suffixe pas dÃƒÂ©jÃƒÂ  appliquÃƒÂ©, l'ajouter
          if (!uuid.match(/-\d+$/)) {
            return `${uuid}-${suffixNum}`;
          }
          return uuid;
        });
        return JSON.parse(replaced) as Prisma.InputJsonValue;
      } catch {
        console.warn('[fieldConfig] Erreur traitement fieldConfig, copie tel quel');
        return oldNode.fieldConfig as Prisma.InputJsonValue;
      }
    })(),
    isSharedReference: preserveSharedReferences ? oldNode.isSharedReference : false,
    sharedReferenceId: preserveSharedReferences ? oldNode.sharedReferenceId : null,
    sharedReferenceIds: preserveSharedReferences ? oldNode.sharedReferenceIds : [],
    sharedReferenceName: preserveSharedReferences ? oldNode.sharedReferenceName : null,
    sharedReferenceDescription: preserveSharedReferences ? oldNode.sharedReferenceDescription : null,
    linkedFormulaIds: Array.isArray(oldNode.linkedFormulaIds) ? oldNode.linkedFormulaIds : [],
    linkedConditionIds: Array.isArray(oldNode.linkedConditionIds) ? oldNode.linkedConditionIds : [],
    // CRITIQUE: Ne copier linkedTableIds QUE si le noeud n'est PAS un INPUT pur
    // Un INPUT (fieldType = NULL) ne doit JAMAIS avoir de linkedTableIds !
    linkedTableIds: (Array.isArray(oldNode.linkedTableIds) && oldNode.fieldType !== null && oldNode.fieldType !== '' && oldNode.fieldType !== undefined)
      ? oldNode.linkedTableIds.map(id => ensureSuffix(id) || id)
      : [],
    // Suffixer aussi les linkedVariableIds pour que les copies pointent vers les variables copiees
    linkedVariableIds: Array.isArray(oldNode.linkedVariableIds)
      ? oldNode.linkedVariableIds.map(id => ensureSuffix(id) || id)
      : [],
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
      
      // Ã°Å¸Å¡Â« NE PAS cloner les sections si shouldCloneExternalParents = false
      if (!shouldCloneExternalParents && parentNode.type === 'section') {
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

    // PERF: tableLookupDuplicationService REMOVED — already done by:
    // 1) repeat-executor TBL-DUP phase (pre-filtered + parallelized, more efficient)
    // 2) SelectConfig copy below in this same loop (lines ~1470+)

    // 📐 CRITICAL: Si ce nœud a des configurations AI Measure, dupliquer les champs cibles
    // Exemple: si "Photo du mur" est dupliqué en "Photo du mur-1" et a des mappings vers
    // "Longueur" et "Hauteur", on doit créer "Longueur-1" et "Hauteur-1" avec les mêmes propriétés
    if (oldNode.aiMeasure_keys && Array.isArray(oldNode.aiMeasure_keys) && (oldNode.aiMeasure_keys as any[]).length > 0) {
      try {
        const mappings = oldNode.aiMeasure_keys as Array<{ key: string; targetRef: string }>;
        
        for (const mapping of mappings) {
          if (!mapping.targetRef) continue;
          
          // Récupérer le champ cible original
          const originalTargetField = await prisma.treeBranchLeafNode.findUnique({
            where: { id: mapping.targetRef }
          });
          
          if (!originalTargetField) {
            console.warn(`[DEEP-COPY] ⚠️ Champ cible ${mapping.targetRef} introuvable pour ${mapping.key}`);
            continue;
          }
          
          // Construire l'ID du champ cible dupliqué
          const duplicatedTargetId = `${mapping.targetRef}${suffixToken}`;
          
          // Vérifier si le champ dupliqué existe déjà
          const existingDuplicatedField = await prisma.treeBranchLeafNode.findUnique({
            where: { id: duplicatedTargetId }
          });
          
          if (existingDuplicatedField) {
            continue;
          }
          
          // Créer le champ cible dupliqué avec les MÊMES propriétés
          const duplicatedFieldData: Prisma.TreeBranchLeafNodeCreateInput = {
            id: duplicatedTargetId,
            treeId: originalTargetField.treeId,
            type: originalTargetField.type,
            subType: originalTargetField.subType,
            fieldType: originalTargetField.fieldType,
            label: `${originalTargetField.label}${suffixToken}`,
            description: originalTargetField.description,
            parentId: originalTargetField.parentId,
            order: originalTargetField.order,
            isVisible: originalTargetField.isVisible,
            isActive: originalTargetField.isActive,
            isRequired: originalTargetField.isRequired,
            isMultiple: originalTargetField.isMultiple,
            hasData: originalTargetField.hasData,
            hasFormula: originalTargetField.hasFormula,
            hasCondition: originalTargetField.hasCondition,
            hasTable: originalTargetField.hasTable,
            hasAPI: originalTargetField.hasAPI,
            hasLink: originalTargetField.hasLink,
            hasMarkers: originalTargetField.hasMarkers,
            // 📏 CRITIQUE: Copier TOUTES les propriétés de données (unité, précision, format, etc.)
            data_unit: originalTargetField.data_unit,
            data_precision: originalTargetField.data_precision,
            data_displayFormat: originalTargetField.data_displayFormat,
            data_exposedKey: originalTargetField.data_exposedKey,
            data_visibleToUser: originalTargetField.data_visibleToUser,
            defaultValue: originalTargetField.defaultValue,
            calculatedValue: null,
            appearance_size: originalTargetField.appearance_size,
            appearance_variant: originalTargetField.appearance_variant,
            appearance_width: originalTargetField.appearance_width,
            appearance_displayIcon: originalTargetField.appearance_displayIcon,
            text_placeholder: originalTargetField.text_placeholder,
            text_maxLength: originalTargetField.text_maxLength,
            text_minLength: originalTargetField.text_minLength,
            text_mask: originalTargetField.text_mask,
            text_regex: originalTargetField.text_regex,
            text_rows: originalTargetField.text_rows,
            text_helpTooltipType: originalTargetField.text_helpTooltipType,
            text_helpTooltipText: originalTargetField.text_helpTooltipText,
            text_helpTooltipImage: originalTargetField.text_helpTooltipImage,
            number_min: originalTargetField.number_min as unknown as number | undefined,
            number_max: originalTargetField.number_max as unknown as number | undefined,
            number_step: originalTargetField.number_step as unknown as number | undefined,
            number_decimals: originalTargetField.number_decimals,
            number_prefix: originalTargetField.number_prefix,
            number_suffix: originalTargetField.number_suffix,
            number_unit: originalTargetField.number_unit,
            number_defaultValue: originalTargetField.number_defaultValue as unknown as number | undefined,
            metadata: {
              copiedFromNodeId: originalTargetField.id,
              copySuffix: metadataCopySuffix,
              duplicatedFromAIMeasure: true
            } as Prisma.InputJsonValue
          };
          
          await prisma.treeBranchLeafNode.create({ data: duplicatedFieldData });
        }
      } catch (aiMeasureError) {
        console.error(`[DEEP-COPY] ❌ Erreur duplication champs AI Measure:`, aiMeasureError);
      }
    }


    // Ã°Å¸â€ â€¢ Si ce node a des tables liÃƒÂ©es (linkedTableIds), l'ajouter ÃƒÂ  displayNodeIds
    // pour que le post-processing crÃƒÂ©e les variables pour afficher les donnÃƒÂ©es
    if (Array.isArray(cloneData.linkedTableIds) && cloneData.linkedTableIds.length > 0) {
      displayNodeIds.push(newId);
    }
  }

  // PERF: Pre-load ALL formulas, conditions, selectConfigs, numberConfigs in batch queries
  const allOldNodeIds = createdNodes.map(n => n.oldId);
  const allNewNodeIds = createdNodes.map(n => n.newId);
  const [allFormulasRaw, allConditionsRaw, allSelectConfigsRaw, allNumberConfigsRaw, existingCopySelectConfigs, existingCopyNumberConfigs, allTablesRaw] = await Promise.all([
    prisma.treeBranchLeafNodeFormula.findMany({ where: { nodeId: { in: allOldNodeIds } } }),
    prisma.treeBranchLeafNodeCondition.findMany({ where: { nodeId: { in: allOldNodeIds } } }),
    prisma.treeBranchLeafSelectConfig.findMany({ where: { nodeId: { in: allOldNodeIds } } }),
    prisma.treeBranchLeafNumberConfig.findMany({ where: { nodeId: { in: allOldNodeIds } } }),
    // PERF: Also pre-check which COPY configs already exist (avoid per-node findUnique)
    prisma.treeBranchLeafSelectConfig.findMany({ where: { nodeId: { in: allNewNodeIds } }, select: { nodeId: true } }),
    prisma.treeBranchLeafNumberConfig.findMany({ where: { nodeId: { in: allNewNodeIds } }, select: { nodeId: true } }),
    // PERF: Pre-load ALL tables with columns+rows in 1 query instead of N
    prisma.treeBranchLeafNodeTable.findMany({ where: { nodeId: { in: allOldNodeIds } }, include: { tableColumns: true, tableRows: true } })
  ]);
  const formulasByNodeId = new Map<string, typeof allFormulasRaw>();
  for (const f of allFormulasRaw) {
    const arr = formulasByNodeId.get(f.nodeId) || [];
    arr.push(f);
    formulasByNodeId.set(f.nodeId, arr);
  }
  const conditionsByNodeId = new Map<string, typeof allConditionsRaw>();
  for (const c of allConditionsRaw) {
    const arr = conditionsByNodeId.get(c.nodeId) || [];
    arr.push(c);
    conditionsByNodeId.set(c.nodeId, arr);
  }
  // PERF: Maps for SelectConfig and NumberConfig (avoid per-node findUnique)
  const selectConfigByNodeId = new Map(allSelectConfigsRaw.map(sc => [sc.nodeId, sc]));
  const numberConfigByNodeId = new Map(allNumberConfigsRaw.map(nc => [nc.nodeId, nc]));
  const existingCopySelectConfigNodeIds = new Set(existingCopySelectConfigs.map(sc => sc.nodeId));
  const existingCopyNumberConfigNodeIds = new Set(existingCopyNumberConfigs.map(nc => nc.nodeId));
  // PERF: Pre-loaded tables grouped by nodeId
  const preloadedTablesByNodeId = new Map<string, typeof allTablesRaw>();
  for (const t of allTablesRaw) {
    const arr = preloadedTablesByNodeId.get(t.nodeId) || [];
    arr.push(t);
    preloadedTablesByNodeId.set(t.nodeId, arr);
  }

  // PERF: Pre-check which new condition IDs already exist (1 query instead of N findUnique)
  const allPotentialNewConditionIds = allConditionsRaw.map(c => `${c.id}-${suffixToken}`);
  const existingConditionsSet = new Set<string>();
  // PERF: Pre-check which new TABLE IDs already exist (1 query instead of N findUnique per table)
  const allPotentialNewTableIds: string[] = [];
  for (const t of allTablesRaw) {
    allPotentialNewTableIds.push(`${t.id}-${suffixToken}`);
  }
  // Also collect table IDs from linkedTableIds of all old nodes
  for (const oldId of allOldNodeIds) {
    const node = byId.get(oldId);
    if (node && Array.isArray(node.linkedTableIds)) {
      for (const linkedTableId of node.linkedTableIds) {
        const potentialId = `${linkedTableId}-${suffixToken}`;
        if (!allPotentialNewTableIds.includes(potentialId)) {
          allPotentialNewTableIds.push(potentialId);
        }
      }
    }
  }
  const existingTablesSet = new Set<string>();
  const [existingCondsResult, existingTablesResult] = await Promise.all([
    allPotentialNewConditionIds.length > 0
      ? prisma.treeBranchLeafNodeCondition.findMany({ where: { id: { in: allPotentialNewConditionIds } }, select: { id: true } })
      : Promise.resolve([]),
    allPotentialNewTableIds.length > 0
      ? prisma.treeBranchLeafNodeTable.findMany({ where: { id: { in: allPotentialNewTableIds } }, select: { id: true } })
      : Promise.resolve([])
  ]);
  for (const ec of existingCondsResult) existingConditionsSet.add(ec.id);
  for (const et of existingTablesResult) existingTablesSet.add(et.id);

    // PERF: Accumulate condition ref updates for batch (instead of per-ref addToNodeLinkedField)
  const pendingLinkedConditionUpdates = new Map<string, Set<string>>();

  for (const { oldId, newId, newParentId } of createdNodes) {
    const oldNode = byId.get(oldId)!;
    
    // Ã°Å¸â€â€˜ CRITICAL: RÃƒÂ©cupÃƒÂ©rer l'ordre de linkedFormulaIds de l'original
    const linkedFormulaIdOrder = Array.isArray(oldNode.linkedFormulaIds) ? oldNode.linkedFormulaIds : [];
    
    // PERF: Use pre-loaded formulas instead of per-node findMany
    const formulas = formulasByNodeId.get(oldId) || [];
    
    // CRITICAL: Trier selon linkedFormulaIds order, MAIS SEULEMENT les IDs valides
    // D'abord, crÃƒÂ©er une map formula id -> formula
    const formulaMap = new Map(formulas.map(f => [f.id, f]));
    
    // CrÃƒÂ©er le tableau triÃƒÂ© en validant chaque ID
    const sortedFormulas: typeof formulas = [];
    const validLinkedIds: string[] = [];
    for (const formulaId of linkedFormulaIdOrder) {
      const formula = formulaMap.get(formulaId);
      if (formula) {
        sortedFormulas.push(formula);
        validLinkedIds.push(formulaId);
        formulaMap.delete(formulaId);
      } else {
        
      }
    }
    
    // Ajouter les formules restantes (non liÃƒÂ©es ou qui n'ÃƒÂ©taient pas dans linkedFormulaIds)
    const unlinkedFormulas = Array.from(formulaMap.values());
    const allFormulas = [...sortedFormulas, ...unlinkedFormulas];
    
    const newLinkedFormulaIds: string[] = [];
    let firstNewFormulaId: string | null = null;
    
    for (const f of allFormulas) {
      try {
        // Utiliser copyFormulaCapacity pour avoir la rÃƒÂ©ÃƒÂ©criture complÃƒÂ¨te
        const formulaResult = await copyFormulaCapacity(
          f.id,
          newId,
          suffixNum,
          prisma,
          { 
            formulaIdMap,
            nodeIdMap: idMap,
            // PERF: Pass pre-loaded formula data (saves 1 findUnique per formula)
            preloadedFormula: f,
            // PERF: Pass existingNodeIds set (saves 1 findUnique owner check per formula)
            existingNodeIds
          }
        );

        if (formulaResult.success) {
          const newFormulaId = formulaResult.newFormulaId;
          formulaIdMap.set(f.id, newFormulaId);

          if (!firstNewFormulaId) firstNewFormulaId = newFormulaId;
          
          // Ã°Å¸â€â€˜ Ajouter au linkedFormulaIds seulement si c'ÃƒÂ©tait liÃƒÂ© ÃƒÂ  l'original
          if (validLinkedIds.includes(f.id)) {
            newLinkedFormulaIds.push(newFormulaId);
          }

          if (normalizedRepeatContext) {
            const referencedNodeIds = Array.from(extractNodeIdsFromTokens(formulaResult.tokens || f.tokens));
            logCapacityEvent({
              ownerNodeId: newId,
              capacityId: newFormulaId,
              capacityType: 'formula',
              referencedNodeIds,
              context: normalizedRepeatContext
            });
          }
        } else {
          console.error(`Ã¢ÂÅ’ Erreur copie formule centralisÃƒÂ©e: ${f.id}`);
        }
      } catch (error) {
        console.error(`Ã¢ÂÅ’ Exception copie formule ${f.id}:`, error);
      }
    }
    
    // Ã°Å¸â€â€˜ CRITICAL: Ajouter tous les linkedFormulaIds en UNE SEULE OPÃƒâ€°RATION dans le BON ORDRE!
    if (newLinkedFormulaIds.length > 0) {
      try {
        await addToNodeLinkedField(prisma, newId, 'linkedFormulaIds', newLinkedFormulaIds);
      } catch (e) {
        console.warn('[TreeBranchLeaf API] Warning updating linkedFormulaIds for node:', (e as Error).message);
      }
    }

    // PERF: Use pre-loaded conditions instead of per-node findMany
    const conditions = conditionsByNodeId.get(oldId) || [];
    const linkedConditionIdOrder = Array.isArray(oldNode.linkedConditionIds) ? oldNode.linkedConditionIds : [];
    const copiedNodeIds = new Set(idMap.values());
    
    // Trier les conditions selon linkedConditionIdOrder, MAIS SEULEMENT les IDs valides
    // D'abord, crÃƒÂ©er une map condition id -> condition
    const conditionMap = new Map(conditions.map(c => [c.id, c]));
    
    // CrÃƒÂ©er le tableau triÃƒÂ© en validant chaque ID
    const sortedConditions: typeof conditions = [];
    const validLinkedConditionIds: string[] = [];
    for (const conditionId of linkedConditionIdOrder) {
      const condition = conditionMap.get(conditionId);
      if (condition) {
        sortedConditions.push(condition);
        validLinkedConditionIds.push(conditionId);
        conditionMap.delete(conditionId);
      } else {
        
      }
    }
    
    // Ajouter les conditions restantes (non liÃƒÂ©es ou qui n'ÃƒÂ©taient pas dans linkedConditionIds)
    const unlinkedConditions = Array.from(conditionMap.values());
    const allConditions = [...sortedConditions, ...unlinkedConditions];
    
    const newLinkedConditionIds: string[] = [];
    let firstNewConditionId: string | null = null;
    
    for (const c of allConditions) {
      const newConditionId = appendSuffix(c.id);
      if (!firstNewConditionId) firstNewConditionId = newConditionId;
      conditionIdMap.set(c.id, newConditionId);
      const newSet = replaceIdsInConditionSet(c.conditionSet, idMap, formulaIdMap, conditionIdMap) as Prisma.InputJsonValue;
      
      // Ã°Å¸â€Â§ FIX DYNAMIQUE: VÃƒÂ©rifier si la condition existe dÃƒÂ©jÃƒÂ  AVANT de la crÃƒÂ©er
      const conditionAlreadyExists = existingConditionsSet.has(newConditionId);
      
      if (conditionAlreadyExists) {
        // La condition existe dÃƒÂ©jÃƒÂ  - si elle appartient ÃƒÂ  un autre nÃ…â€œud, c'est OK
        // On l'ajoute juste aux linkedConditionIds de ce nÃ…â€œud
        
        // Si elle appartient ÃƒÂ  ce nÃ…â€œud, parfait. Sinon, on la rÃƒÂ©fÃƒÂ©rence quand mÃƒÂªme.
        if (validLinkedConditionIds.includes(c.id)) {
          newLinkedConditionIds.push(newConditionId);
        }
        continue;
      }
      
      // La condition n'existe pas, on la crÃƒÂ©e avec le bon nodeId
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
      
      // Ã°Å¸â€â€˜ Ajouter au linkedConditionIds seulement si c'ÃƒÂ©tait liÃƒÂ© ÃƒÂ  l'original (et que l'ID ÃƒÂ©tait valide)
      if (validLinkedConditionIds.includes(c.id)) {
        newLinkedConditionIds.push(newConditionId);
      }
      
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
        const refs = Array.from(extractNodeIdsFromConditionSet(newSet));
        for (const refId of refs) {
          const normalizedRefId = normalizeRefId(refId);
          // Ne pas polluer les templates originaux : lors d'une duplication, on ne met ÃƒÂ  jour
          // que les nÃ…â€œuds copiÃƒÂ©s (suffixÃƒÂ©s) prÃƒÂ©sents dans idMap.values().
          if (normalizedRepeatContext && !copiedNodeIds.has(normalizedRefId)) {
            continue;
          }
          if (!pendingLinkedConditionUpdates.has(normalizedRefId)) {
            pendingLinkedConditionUpdates.set(normalizedRefId, new Set());
          }
          pendingLinkedConditionUpdates.get(normalizedRefId)!.add(newConditionId);
        }
      } catch (e) {
        console.warn('[TreeBranchLeaf API] Warning updating linkedConditionIds during deep copy:', (e as Error).message);
      }
    }
    
    // Ã°Å¸â€â€˜ IMPORTANT: Ajouter tous les linkedConditionIds en UNE SEULE OPÃƒâ€°RATION dans le BON ORDRE!
    if (newLinkedConditionIds.length > 0) {
      try {
        await addToNodeLinkedField(prisma, newId, 'linkedConditionIds', newLinkedConditionIds);
      } catch (e) {
        console.warn('[TreeBranchLeaf API] Warning updating linkedConditionIds for node:', (e as Error).message);
      }
    }

    //  FIX: Synchroniser les flags de capacités et les activeIds
    // Problème rencontré: des formules/conditions peuvent exister en DB alors que hasFormula/hasCondition est faux
    // => l'UI n'affiche pas l'onglet bleu / l'icône. Ici on aligne le nœud copié avec le contenu réellement copié.
    const shouldHaveFormula = (oldNode.hasFormula === true) || formulas.length > 0;
    const shouldHaveCondition = (oldNode.hasCondition === true) || conditions.length > 0;

    const updateCaps: {
      hasFormula?: boolean;
      formula_activeId?: string | null;
      hasCondition?: boolean;
      condition_activeId?: string | null;
    } = {};

    if (shouldHaveFormula) {
      updateCaps.hasFormula = true;
      const mappedActive = oldNode.formula_activeId ? (formulaIdMap.get(oldNode.formula_activeId) || null) : null;
      updateCaps.formula_activeId = mappedActive || firstNewFormulaId || null;
    }

    if (shouldHaveCondition) {
      updateCaps.hasCondition = true;
      const mappedActive = oldNode.condition_activeId ? (conditionIdMap.get(oldNode.condition_activeId) || null) : null;
      updateCaps.condition_activeId = mappedActive || firstNewConditionId || null;
    }

    if (Object.keys(updateCaps).length > 0) {
      try {
        await prisma.treeBranchLeafNode.update({
          where: { id: newId },
          data: updateCaps
        });
      } catch (e) {
        console.warn('[DEEP-COPY]  Erreur mise  jour flags/activeIds:', (e as Error).message);
      }
    }

    // Ã°Å¸â€Â´ COPIE DES TABLES: Chercher les tables de 3 faÃƒÂ§ons:
    // 1. Tables oÃƒÂ¹ nodeId = oldId (propriÃƒÂ©tÃƒÂ© directe)
    // 2. Tables via table_activeId (rÃƒÂ©fÃƒÂ©rence active)
    // 3. Tables via linkedTableIds (rÃƒÂ©fÃƒÂ©rences multiples)
    // PERF: Use pre-loaded tables from batch query instead of per-node findMany
    const tables = preloadedTablesByNodeId.get(oldId) || [];

    // Ã°Å¸â€ â€¢ IMPORTANT: Aussi copier les tables rÃƒÂ©fÃƒÂ©rencÃƒÂ©es via table_activeId qui ne sont PAS liÃƒÂ©es au nodeId
    // Cas typique: un champ "Orientation" template (22de...) rÃƒÂ©fÃƒÂ©rence une table (0701ed...) 
    // qui est liÃƒÂ©e ÃƒÂ  un display node (440d...), pas au template node lui-mÃƒÂªme
    const additionalTableIds: string[] = [];
    if (source.table_activeId && !tables.some(t => t.id === source.table_activeId)) {
      additionalTableIds.push(source.table_activeId);
    }
    
    // Ã°Å¸â€ â€¢ CRITIQUE: Aussi copier les tables rÃƒÂ©fÃƒÂ©rencÃƒÂ©es via linkedTableIds
    // Cas typique: "Panneaux max" a linkedTableIds: ["Longueur panneau", "Largeur panneau"]
    // Ces tables ont nodeId = Panneaux max, donc dÃƒÂ©jÃƒÂ  incluses dans `tables`
    // MAIS si le nodeId de la table est diffÃƒÂ©rent (ex: table partagÃƒÂ©e), on doit l'ajouter
    if (Array.isArray(oldNode.linkedTableIds)) {
      for (const linkedTableId of oldNode.linkedTableIds) {
        if (!tables.some(t => t.id === linkedTableId) && !additionalTableIds.includes(linkedTableId)) {
          additionalTableIds.push(linkedTableId);
        }
      }
    }
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
    
    // Ã°Å¸â€â€˜ IMPORTANT: Trier les tables selon l'ordre de linkedTableIds (pas orderBy!)
    const linkedTableIdOrder = Array.isArray(oldNode.linkedTableIds) ? oldNode.linkedTableIds : [];
    
    const sortedTables = linkedTableIdOrder
      .map(id => [...tables, ...additionalTables].find(t => t.id === id))
      .filter((t) => t !== undefined) as typeof tables;
    
    const unlinkedTables = [...tables, ...additionalTables].filter(t => !linkedTableIdOrder.includes(t.id));
    const allTablesToCopy = [...sortedTables, ...unlinkedTables];
    
    if (additionalTables.length > 0) {
    }
    
    const newLinkedTableIds: string[] = [];
    
    
    for (const t of allTablesToCopy) {
      const newTableId = appendSuffix(t.id);
      tableIdMap.set(t.id, newTableId);
      
      
      // PERF: Use pre-loaded existingTablesSet instead of per-table findUnique
      if (existingTablesSet.has(newTableId)) {
        continue;
      }
      
      if (linkedTableIdOrder.includes(t.id)) {
        newLinkedTableIds.push(newTableId);
      }
      
      // 🔧 FIX: Le nodeId de la table doit être le nodeId ORIGINAL suffixé, pas newId !
      // Si la table appartient à un autre node (cas linkedTableIds), on garde la relation originale
      const tableOwnerNodeId = t.nodeId === oldId 
        ? newId  // La table appartient au node en cours de copie
        : appendSuffix(t.nodeId);  // La table appartient à un autre node, suffixer son nodeId original
      
      // PERF: Use in-memory existingNodeIds set instead of per-table findUnique
      let nodeExists: { id: string } | null = existingNodeIds.has(tableOwnerNodeId) ? { id: tableOwnerNodeId } : null;

      if (!nodeExists && tableOwnerNodeId !== newId) {
        // C'est un node en linkedTableIds qui n'a pas été copié. On crée un stub.
        // PERF: Use byId map for original node data instead of findUnique
        const originalOwnerNode = byId.get(t.nodeId) ?? null;

        if (originalOwnerNode) {
          try {
            const createdNode = await prisma.treeBranchLeafNode.create({
              data: {
                id: tableOwnerNodeId,
                type: originalOwnerNode.type,
                label: originalOwnerNode.label ? `${originalOwnerNode.label}-1` : 'Stub',
                treeId: originalOwnerNode.treeId,
                parentId: originalOwnerNode.parentId ? appendSuffix(originalOwnerNode.parentId) : null,
                order: 0,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            nodeExists = createdNode;
          } catch (err) {
            console.error(`[DEEP-COPY] ❌ Failed to create stub node: ${err.message}`);
            throw err; // Propager l'erreur pour arrêter le processus
          }
        }
      }

      if (!nodeExists) {
        console.warn(
          `[DEEP-COPY] ⚠️ Cannot create table "${t.name}": owner node "${tableOwnerNodeId}" doesn't exist. ` +
          `Original nodeId: "${t.nodeId}", oldId: "${oldId}", newId: "${newId}"`
        );
        return; // Skip this table creation
      }
      
      await prisma.treeBranchLeafNodeTable.create({
        data: {
          id: newTableId,
          nodeId: tableOwnerNodeId,
          organizationId: t.organizationId,
          name: t.name ? `${t.name}${computedLabelSuffix}` : t.name,
          description: t.description,
          type: t.type,
          rowCount: t.rowCount,
          columnCount: t.columnCount,
          // Ã°Å¸â€Â§ TRAITER LE meta: suffix les rÃƒÂ©fÃƒÂ©rences aux nodes ET comparisonColumn
          meta: (() => {
            if (!t.meta) {
              return t.meta as Prisma.InputJsonValue;
            }
            try {
              const metaObj = typeof t.meta === 'string' ? JSON.parse(t.meta) : JSON.parse(JSON.stringify(t.meta));
              
              
              // Ã°Å¸â€Â¢ COPIE TABLE META: suffixer TOUS les champs dans lookup
              // Suffixer les UUIDs dans selectors
              if (metaObj?.lookup?.selectors?.columnFieldId && !metaObj.lookup.selectors.columnFieldId.endsWith(`-${copySuffixNum}`)) {
                metaObj.lookup.selectors.columnFieldId = `${metaObj.lookup.selectors.columnFieldId}-${copySuffixNum}`;
              }
              if (metaObj?.lookup?.selectors?.rowFieldId && !metaObj.lookup.selectors.rowFieldId.endsWith(`-${copySuffixNum}`)) {
                metaObj.lookup.selectors.rowFieldId = `${metaObj.lookup.selectors.rowFieldId}-${copySuffixNum}`;
              }
              // Suffixer sourceField
              if (metaObj?.lookup?.rowSourceOption?.sourceField && !metaObj.lookup.rowSourceOption.sourceField.endsWith(`-${copySuffixNum}`)) {
                metaObj.lookup.rowSourceOption.sourceField = `${metaObj.lookup.rowSourceOption.sourceField}-${copySuffixNum}`;
              }
              if (metaObj?.lookup?.columnSourceOption?.sourceField && !metaObj.lookup.columnSourceOption.sourceField.endsWith(`-${copySuffixNum}`)) {
                metaObj.lookup.columnSourceOption.sourceField = `${metaObj.lookup.columnSourceOption.sourceField}-${copySuffixNum}`;
              }
              
              // 🎯 FIX 24/01/2026: SUFFIXER displayColumn, comparisonColumn, displayRow
              // Contrairement au commentaire précédent, les noms de colonnes SONT suffixés
              // quand on duplique une table contenant des références à des champs
              // Ex: "Puissance" devient "Puissance-1" dans la table dupliquée
              
              // Suffixer displayColumn (peut être string ou array)
              if (metaObj?.lookup?.displayColumn) {
                const originalDisplay = JSON.stringify(metaObj.lookup.displayColumn);
                if (Array.isArray(metaObj.lookup.displayColumn)) {
                  metaObj.lookup.displayColumn = metaObj.lookup.displayColumn.map(col => {
                    if (typeof col === 'string' && !col.endsWith(`-${copySuffixNum}`)) {
                      return `${col}-${copySuffixNum}`;
                    }
                    return col;
                  });
                } else if (typeof metaObj.lookup.displayColumn === 'string' && !metaObj.lookup.displayColumn.endsWith(`-${copySuffixNum}`)) {
                  metaObj.lookup.displayColumn = `${metaObj.lookup.displayColumn}-${copySuffixNum}`;
                }
              }
              
              // Suffixer comparisonColumn
              if (metaObj?.lookup?.columnSourceOption?.comparisonColumn && !metaObj.lookup.columnSourceOption.comparisonColumn.endsWith(`-${copySuffixNum}`)) {
                metaObj.lookup.columnSourceOption.comparisonColumn = `${metaObj.lookup.columnSourceOption.comparisonColumn}-${copySuffixNum}`;
              }
              
              // Suffixer displayRow
              if (metaObj?.lookup?.displayRow && typeof metaObj.lookup.displayRow === 'string' && !metaObj.lookup.displayRow.endsWith(`-${copySuffixNum}`)) {
                metaObj.lookup.displayRow = `${metaObj.lookup.displayRow}-${copySuffixNum}`;
              }
              
              // 🎯 FIX 24/01/2026: SUFFIXER les noms de colonnes dans meta.data.columns
              // Les colonnes de la table qui référencent des champs doivent aussi prendre le suffix
              if (metaObj?.data?.columns && Array.isArray(metaObj.data.columns)) {
                metaObj.data.columns = metaObj.data.columns.map((col: string) => {
                  if (typeof col === 'string' && !col.endsWith(`-${copySuffixNum}`)) {
                    return `${col}-${copySuffixNum}`;
                  }
                  return col;
                });
              }
              
              return metaObj as Prisma.InputJsonValue;
            } catch (err) {
              console.warn('[table.meta] Erreur traitement meta, copie tel quel:', err);
              return t.meta as Prisma.InputJsonValue;
            }
          })(),
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
              // 🎯 FIX 24/01/2026: SUFFIXER les noms de colonnes !
              // Quand on duplique une table avec des champs, les colonnes prennent aussi le suffix
              // Ex: "Puissance" devient "Puissance-1" dans la table dupliquée
              name: `${col.name}-${copySuffixNum}`,
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
    }
    
    // Ã°Å¸â€â€˜ IMPORTANT: Ajouter tous les linkedTableIds en UNE SEULE OPÃƒâ€°RATION dans le BON ORDRE!
    if (newLinkedTableIds.length > 0) {
      try {
        await addToNodeLinkedField(prisma, newId, 'linkedTableIds', newLinkedTableIds);
      } catch (e) {
        console.warn('[TreeBranchLeaf API] Warning updating linkedTableIds for node:', (e as Error).message);
      }
    }

    // FIX: Synchroniser hasTable + table_activeId (comme formule/condition)
    // Problème rencontré: tables copiées en DB mais table_activeId reste NULL => lookup retombe à 0.
    const shouldHaveTable = (oldNode.hasTable === true) || allTablesToCopy.length > 0;
    if (shouldHaveTable) {
      const mappedActiveTableId = oldNode.table_activeId
        ? (tableIdMap.get(oldNode.table_activeId) || null)
        : null;
      const firstNewTableId = allTablesToCopy.length > 0 ? (tableIdMap.get(allTablesToCopy[0].id) || null) : null;

      try {
        await prisma.treeBranchLeafNode.update({
          where: { id: newId },
          data: {
            hasTable: true,
            table_activeId: mappedActiveTableId || firstNewTableId || (newLinkedTableIds[0] ?? null)
          }
        });
      } catch (e) {
        console.warn('[DEEP-COPY] Erreur mise à jour hasTable/table_activeId:', (e as Error).message);
      }
    }

    // Ã°Å¸â€ â€¢ COPIE DES SELECT CONFIGS (TreeBranchLeafSelectConfig)
    // C'est crucial pour les champs "donnÃƒÂ©es d'affichage" qui utilisent des lookups
    // PERF: Use pre-loaded selectConfigByNodeId instead of per-node findUnique
    const originalSelectConfig = selectConfigByNodeId.get(oldId) ?? null;

    if (originalSelectConfig) {
      // VÃƒÂ©rifier si la copie existe dÃƒÂ©jÃƒÂ 
      // PERF: Use pre-loaded set instead of per-node findUnique
      const copyAlreadyExists = existingCopySelectConfigNodeIds.has(newId);

      if (!copyAlreadyExists) {
        // 🎯 FIX 06/01/2026: Distinguer table PARTAGÉE (lookup externe) vs table LOCALE/COPIÉE
        // - Table PARTAGÉE: la table N'a PAS été copiée → garder tableReference original
        // - Table LOCALE/COPIÉE: la table A été copiée → suffixer tableReference
        
        let newTableReference: string | null = null;
        // 🎯 FIX 06/01/2026 (v3): TOUJOURS suffixer les colonnes !
        // Les colonnes de table SONT suffixées (ex: "Orientation" → "Orientation-1")
        // Donc keyColumn doit aussi être suffixé pour matcher
        const shouldSuffixColumns = true; // TOUJOURS suffixer pour matcher les colonnes copiées
        let tableWasCopied = false;
        
        if (originalSelectConfig.tableReference) {
          // 🐛 FIX 06/01/2026: Utiliser tableIdMap pour vérifier si la table a été copiée
          // IMPORTANT: Ne PAS utiliser idMap car les nodes créés via linkedVariableIds
          // (comme Orientation-inclinaison) ne sont PAS dans idMap (qui ne contient que les nodes du template).
          // La table est copiée par copyRepeaterCapacityTable() AVANT ce code, donc tableIdMap est fiable.
          tableWasCopied = tableIdMap.has(originalSelectConfig.tableReference);
          
          
          if (tableWasCopied) {
            // Table copiée → utiliser la référence suffixée
            newTableReference = tableIdMap.get(originalSelectConfig.tableReference)!;
          } else {
            // Table partagée (lookup externe) → garder l'original
            newTableReference = originalSelectConfig.tableReference;
          }
        }


        try {
          // ID de la SelectConfig copiée (déterministe via suffixe)
          const copiedSelectConfigId = appendSuffix(originalSelectConfig.id);

          await prisma.treeBranchLeafSelectConfig.create({
            data: {
              id: copiedSelectConfigId,
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
              // Suffixer les colonnes seulement si table locale
              keyColumn: originalSelectConfig.keyColumn 
                ? (shouldSuffixColumns ? `${originalSelectConfig.keyColumn}${computedLabelSuffix}` : originalSelectConfig.keyColumn)
                : null,
              valueColumn: originalSelectConfig.valueColumn
                ? (shouldSuffixColumns ? `${originalSelectConfig.valueColumn}${computedLabelSuffix}` : originalSelectConfig.valueColumn)
                : null,
              displayColumn: (() => {
                if (originalSelectConfig.displayColumn) {
                  const computed = shouldSuffixColumns ? `${originalSelectConfig.displayColumn}${computedLabelSuffix}` : originalSelectConfig.displayColumn;
                  return computed;
                }
                return null;
              })(),
              displayRow: originalSelectConfig.displayRow,
              keyRow: originalSelectConfig.keyRow,
              valueRow: originalSelectConfig.valueRow,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });

          // PERF: Compute displayColumn from pre-loaded table data (skip 2 DB queries)
          // We know displayColumn value because we just set it above
          try {
            const createdDisplayColumn = originalSelectConfig.displayColumn
              ? (shouldSuffixColumns ? `${originalSelectConfig.displayColumn}${computedLabelSuffix}` : originalSelectConfig.displayColumn)
              : null;
            if (tableWasCopied && newTableReference && !createdDisplayColumn) {
              // displayColumn was null - auto-populate from first column of copied table
              // PERF: Use pre-loaded table data instead of DB query
              const originalTable = [...tables, ...additionalTables].find(t => tableIdMap.get(t.id) === newTableReference);
              if (originalTable && originalTable.tableColumns.length > 0) {
                const sortedCols = [...originalTable.tableColumns].sort((a, b) => a.columnIndex - b.columnIndex);
                const firstColumnName = `${sortedCols[0].name}-${copySuffixNum}`;
                await prisma.treeBranchLeafSelectConfig.update({
                  where: { id: copiedSelectConfigId },
                  data: { displayColumn: firstColumnName }
                });
              }
            }
          } catch (initDisplayErr) {
            console.warn('[DEEP-COPY SelectConfig] Erreur initialisation displayColumn:', (initDisplayErr as Error).message);
          }
        } catch (selectConfigErr) {
          
        }
      } else {
      }
    }

    // Ã°Å¸â€ â€¢ COPIE DES NUMBER CONFIGS (TreeBranchLeafNumberConfig)
    // PERF: Use pre-loaded numberConfigByNodeId instead of per-node findUnique
    const originalNumberConfig = numberConfigByNodeId.get(oldId) ?? null;

    if (originalNumberConfig) {
      // PERF: Use pre-loaded set instead of per-node findUnique
      const numberCopyAlreadyExists = existingCopyNumberConfigNodeIds.has(newId);

      if (!numberCopyAlreadyExists) {

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
        } catch (numberConfigErr) {
          
        }
      }
    }
  }

  // PERF: Batch flush all accumulated condition linkedField updates (saves ~30 queries)
  if (pendingLinkedConditionUpdates.size > 0) {
    const batchPromises: Promise<void>[] = [];
    for (const [refNodeId, conditionIds] of pendingLinkedConditionUpdates) {
      batchPromises.push(
        addToNodeLinkedField(prisma, refNodeId, 'linkedConditionIds', Array.from(conditionIds))
          .catch(e => console.warn('[DEEP-COPY] Warning batch linkedConditionIds:', (e as Error).message))
      );
    }
    await Promise.all(batchPromises);
  }

  const variableCopyCache = new Map<string, string>();
  for (const oldNodeId of toCopy) {
    const newNodeId = idMap.get(oldNodeId)!;
    const oldNode = byId.get(oldNodeId)!;

    // 🔧 FIX 24/12/2025: Ne copier linkedFormulaIds QUE si le nœud a réellement hasFormula
    // Sinon un champ simple (ex: "Longueur") qui n'a pas de formule mais qui a des linkedFormulaIds
    // (par héritage ou erreur) se transforme en cellule de calcul
    const newLinkedFormulaIds = oldNode.hasFormula 
      ? (Array.isArray(oldNode.linkedFormulaIds) ? oldNode.linkedFormulaIds : [])
          .map(id => {
            const mappedId = formulaIdMap.get(id);
            if (mappedId) return mappedId;
            const ensured = ensureSuffix(id);
            return ensured || appendSuffix(id);
          })
          .filter(Boolean)
      : [];

    // 🔧 FIX 24/12/2025: Ne copier linkedConditionIds QUE si le nœud a réellement hasCondition
    const newLinkedConditionIds = oldNode.hasCondition
      ? (Array.isArray(oldNode.linkedConditionIds) ? oldNode.linkedConditionIds : [])
          .map(id => {
            const mappedId = conditionIdMap.get(id);
            if (mappedId) return mappedId;
            const ensured = ensureSuffix(id);
            return ensured || appendSuffix(id);
          })
          .filter(Boolean)
      : [];

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
            // Ã¢Å¡Â Ã¯Â¸Â Normaliser en retirant d'ÃƒÂ©ventuels anciens suffixes (-1, -2, ...)
            // pour toujours repartir de l'ID base lors d'une nouvelle duplication
            const baseId = stripNumericSuffix(normalized);
            sourceLinkedVariableIds.add(baseId || normalized);
          }
        }
      }
    }
    
    // Ã°Å¸â€Â´ FIX: Ajouter TOUTES les variables directes du nÃ…â€œud (pas seulement 1)
    const directVarIds = directVariableIdByNodeId.get(oldNodeId);
    if (directVarIds && directVarIds.size > 0) {
      for (const directVarIdForNode of directVarIds) {
        const baseId = stripNumericSuffix(directVarIdForNode);
        sourceLinkedVariableIds.add(baseId || directVarIdForNode);
      }
    }

    // Ã¢Å¡Â Ã¯Â¸Â CRITIQUE: On copie les variables pour crÃƒÂ©er les display nodes
    // MAIS on ne met PAS ÃƒÂ  jour linkedVariableIds aprÃƒÂ¨s !
    // Le linkedVariableIds reste celui du template original (copiÃƒÂ© automatiquement)
    
    
    if (sourceLinkedVariableIds.size > 0) {
      for (const linkedVarId of sourceLinkedVariableIds) {
        const isSharedRef = linkedVarId.startsWith('shared-ref-');
        if (!isSharedRef) {
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
                displayParentId: newNodeId, // Ã°Å¸â€Â§ FIX: Le parent doit ÃƒÂªtre le nÃ…â€œud copiÃƒÂ© (pas son parent)
                isFromRepeaterDuplication: isFromRepeaterDuplication,
                repeatContext: normalizedRepeatContext
              }
            );
            if (copyResult.success && copyResult.displayNodeId) {
              displayNodeIds.push(copyResult.displayNodeId);
            } else {
            }
          } catch (e) {
            
          }
        } else {
        }
      }
    }

    if (
      newLinkedFormulaIds.length > 0 ||
      newLinkedConditionIds.length > 0 ||
      newLinkedTableIds.length > 0
    ) {
      try {
        // Ã¢Å¡Â Ã¯Â¸Â CRITIQUE: Ne PAS mettre ÃƒÂ  jour linkedVariableIds !
        // Il est copiÃƒÂ© automatiquement et doit rester intact
        await prisma.treeBranchLeafNode.update({
          where: { id: newNodeId },
          data: {
            linkedFormulaIds: newLinkedFormulaIds.length > 0 ? { set: newLinkedFormulaIds } : { set: [] },
            linkedConditionIds: newLinkedConditionIds.length > 0 ? { set: newLinkedConditionIds } : { set: [] },
            linkedTableIds: newLinkedTableIds.length > 0 ? { set: newLinkedTableIds } : { set: [] }
            // linkedVariableIds: SUPPRIMÃƒâ€° - ne doit PAS ÃƒÂªtre mis ÃƒÂ  jour !
          }
        });
        
        // Ã¢Å¡Â Ã¯Â¸Â SUPPRIMÃƒâ€°: Ne PAS mettre ÃƒÂ  jour linkedVariableIds aprÃƒÂ¨s la copie !
        // Le linkedVariableIds est copiÃƒÂ© automatiquement depuis le template original
        // et doit rester INTACT (contenir seulement l'ID original, pas les IDs copiÃƒÂ©s)
      } catch (e) {
        console.warn('[DEEP-COPY] Erreur lors du UPDATE des linked***', (e as Error).message);
      }
    }
  }

  const rootNewId = idMap.get(source.id)!;

  // ------------------------------------------------------------------
  // POST-PROCESS: CrÃƒÂ©er variables pour noeuds avec linkedTableIds
  // ------------------------------------------------------------------
  if (displayNodeIds.length > 0) {
    // PERF: Batch pre-load all original variables for display nodes (1 query instead of N findFirst)
    const displayOriginalNodeIds = displayNodeIds.map(nid => nid.replace(/-\d+$/, ''));
    const originalDisplayVars = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: { in: displayOriginalNodeIds } }
    });
    const originalVarByNodeId = new Map(originalDisplayVars.map(v => [v.nodeId, v]));

    // PERF: Batch pre-check which variables already exist (1 query instead of N findUnique)
    const potentialNewVarIds = originalDisplayVars.map(v => appendSuffix(v.id));
    const existingDisplayVarsResult = potentialNewVarIds.length > 0
      ? await prisma.treeBranchLeafNodeVariable.findMany({
          where: { id: { in: potentialNewVarIds } },
          select: { id: true }
        })
      : [];
    const existingDisplayVarIds = new Set(existingDisplayVarsResult.map(v => v.id));

    for (const nodeId of displayNodeIds) {
      try {
        // PERF: Use byId map instead of findUnique for copied node data
        const copiedNodeData = byId.get(nodeId.replace(/-\d+$/, ''));
        if (!copiedNodeData || !Array.isArray(copiedNodeData.linkedTableIds) || copiedNodeData.linkedTableIds.length === 0) {
          continue;
        }

        const originalNodeId = nodeId.replace(/-\d+$/, '');
        const originalVar = originalVarByNodeId.get(originalNodeId);
        if (!originalVar) continue;

        const newVarId = appendSuffix(originalVar.id);
        const newExposedKey = appendSuffix(originalVar.exposedKey);

        // PERF: Use pre-loaded existingDisplayVarIds instead of findUnique
        if (existingDisplayVarIds.has(newVarId)) continue;

        await prisma.treeBranchLeafNodeVariable.create({
          data: {
            id: newVarId,
            nodeId: nodeId,
            exposedKey: newExposedKey,
            displayName: copiedNodeData.label || copiedNodeData.field_label || originalVar.displayName,
            displayFormat: originalVar.displayFormat,
            precision: originalVar.precision,
            unit: originalVar.unit,
            visibleToUser: originalVar.visibleToUser,
            isReadonly: originalVar.isReadonly,
            defaultValue: originalVar.defaultValue,
            metadata: originalVar.metadata || {},
            fixedValue: originalVar.fixedValue,
            selectedNodeId: originalVar.selectedNodeId,
            sourceRef: applySuffixToSourceRef(originalVar.sourceRef, Number(suffixToken)),
            sourceType: originalVar.sourceType,
            updatedAt: new Date()
          }
        });

        await prisma.treeBranchLeafNode.update({
          where: { id: nodeId },
          data: {
            hasData: true,
            data_activeId: newVarId,
            data_exposedKey: newExposedKey,
            data_displayFormat: originalVar.displayFormat,
            data_precision: originalVar.precision,
            data_unit: originalVar.unit,
            data_visibleToUser: originalVar.visibleToUser,
            linkedVariableIds: { set: [newVarId] }
          }
        });
      } catch (varError) {
        console.error('[DEEP-COPY] Erreur creation variable pour ' + nodeId + ':', varError);
      }
    }
  }

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
