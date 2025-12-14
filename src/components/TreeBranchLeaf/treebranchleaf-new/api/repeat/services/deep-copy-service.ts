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
    cloneExternalParents = false,
    isFromRepeaterDuplication = false
  } = opts || {};

  const replaceIdsInTokens = (tokens: unknown, idMap: Map<string, string>): unknown => {
    console.log(`\n[🔥 REPLACE-TOKENS] Called with ${Array.isArray(tokens) ? tokens.length : typeof tokens} tokens`);
    if (!tokens) return tokens;
    
    const mapOne = (s: string) => s.replace(/@value\.([A-Za-z0-9_:-]+)/g, (_m, p1: string) => {
      // 🎯 ÉTAPE 1: Chercher dans idMap (nœuds copiés dans cette copie)
      if (idMap.has(p1)) {
        const newId = idMap.get(p1)!;
        console.log(`[DEBUG-REPLACE] ✅ Trouvé dans idMap: @value.${p1} → @value.${newId}`);
        return `@value.${newId}`;
      }
      
      // 🎯 ÉTAPE 2: Si le nœud n'est pas dans idMap, c'est une référence EXTERNE
      // On doit TOUJOURS suffixer pour créer la copie référencée
      const suffixedId = appendSuffix(p1);
      console.log(`[DEBUG-REPLACE] ✅ Référence externe suffixée: @value.${p1} → @value.${suffixedId}`);
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
      
      // 🎯 Remplacer les références @value.nodeId
      str = str.replace(/@value\.([A-Za-z0-9_:-]+)/g, (_m, p1: string) => {
        // Chercher dans idMap d'abord (nœuds copiés dans cette copie)
        if (idMap.has(p1)) {
          const newId = idMap.get(p1)!;
          console.log(`[DEBUG-CONDITION] ✅ @value.${p1} → @value.${newId}`);
          return `@value.${newId}`;
        }
        
        // TOUJOURS suffixer les références externes
        const suffixedId = appendSuffix(p1);
        console.log(`[DEBUG-CONDITION] ✅ @value.${p1} → @value.${suffixedId} (auto-suffix externe)`);
        return `@value.${suffixedId}`;
      });
      
      // 🎯 Remplacer les références node-formula:
      str = str.replace(/node-formula:([a-f0-9-]{36})/gi, (_m, p1: string) => {
        const newId = formulaIdMap.get(p1) || p1;
        console.log(`[DEBUG-CONDITION] Formula: node-formula:${p1} → node-formula:${newId}`);
        return `node-formula:${newId}`;
      });
      
      // 🎯 Remplacer les nodeIds directs dans les actions (shared-ref, node IDs)
      str = str.replace(/("nodeIds":\s*\["?)([a-zA-Z0-9_:-]+)/g, (_m, prefix: string, nodeId: string) => {
        // Si c'est une référence avec : (node-formula:, condition:, etc), on l'a déjà traitée
        if (nodeId.includes(':')) {
          return _m;
        }
        
        // Si c'est un shared-ref- ou un node ID, on doit le suffixer
        if (nodeId.startsWith('shared-ref-') || !nodeId.includes('-')) {
          // C'est un shared-ref ou un simple ID, doit être suffixé
          if (idMap.has(nodeId)) {
            const newId = idMap.get(nodeId)!;
            console.log(`[DEBUG-CONDITION] NodeId in actions: ${nodeId} → ${newId}`);
            return prefix + newId;
          }
          
          // Suffixer directement
          const suffixedId = appendSuffix(nodeId);
          console.log(`[DEBUG-CONDITION] NodeId in actions (auto-suffix): ${nodeId} → ${suffixedId}`);
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
  const stripNumericSuffix = (value: string): string => value.replace(/-\d+(?:-\d+)*$/, '');
  const hasAnySuffix = (value: string) => hasCurrentSuffix(value) || numericSuffixPattern.test(value);
  const ensureSuffix = (value: string | null | undefined): string | null | undefined => {
    if (!value) return value;
    if (hasCurrentSuffix(value)) return value;
    // ⚠️ Toujours recalculer le suffixe lorsqu'il est différent (ex: passer de -1 à -2)
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
    // Si déjà suffixé par ce token, ne pas doubler
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
  // Les templateNodeIds sont maintenant garantis sans suffixes grâce au filtrage en amont
  // On applique directement le suffixe sans normalisation
  for (const oldId of toCopy) {
    const candidateId = appendSuffix(oldId);
    idMap.set(oldId, candidateId);
  }

  const formulaIdMap = new Map<string, string>();
  const conditionIdMap = new Map<string, string>();
  const tableIdMap = new Map<string, string>();
  const displayNodeIds: string[] = []; // IDs des nœuds d'affichage créés par copyVariableWithCapacities

  // 🔴 FIX: Un nœud peut avoir PLUSIEURS variables (affichage multiples)
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
    // 🔴 CRITIQUE: Garder TOUJOURS les repeater_templateNodeIds ORIGINAUX (pas de suffixe!)
    // Les templateNodeIds doivent être les UUIDs purs des templates originaux,
    // JAMAIS les IDs suffixés des copies (-1, -2, etc.)
    // Si on mappe vers les suffixés, la 2e duplication trouvera uuid-A-1 au lieu de uuid-A!
    repeater_templateNodeIds: (() => {
      // 🔴 CRITIQUE: Ne PAS copier la configuration de repeater lors d'une duplication via repeater
      // Si on copie un template en tant que partie d'un repeater, la copie ne doit PAS
      // conserver `repeater_templateNodeIds` (la copie ne doit pas devenir un repeater).
      if (normalizedRepeatContext) return null;
      
      // ✅ FIX: JAMAIS mapper les IDs! Garder les IDs originaux sans suffixes
      if (!oldNode.repeater_templateNodeIds) return oldNode.repeater_templateNodeIds;
      
      // Retourner tel quel - les templateNodeIds doivent rester inchangés
      // (ils contiennent déjà les IDs originaux purs sans suffixes)
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
      // 🔴 Ne pas copier la configuration de repeater dans les clones créés via un repeater
      if (normalizedRepeatContext && newMeta.repeater) {
        delete newMeta.repeater;
      }
      return newMeta as Prisma.InputJsonValue;
    })(),
    // 🔧 TRAITER LE fieldConfig: suffix les références aux nodes
    fieldConfig: (() => {
      if (!oldNode.fieldConfig) {
        return oldNode.fieldConfig;
      }
      try {
        const str = JSON.stringify(oldNode.fieldConfig);
        // Remplacer les UUIDs par leurs versions suffixées
        let replaced = str.replace(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, (uuid: string) => {
          const mapped = idMap.get(uuid);
          if (mapped) {
            console.log(`[fieldConfig] UUID remappé: ${uuid} → ${mapped}`);
            return mapped;
          }
          // Si pas dans la map et suffixe pas déjà appliqué, l'ajouter
          if (!uuid.match(/-\d+$/)) {
            console.log(`[fieldConfig] UUID suffixé: ${uuid} → ${uuid}-${suffixNum}`);
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
    linkedTableIds: Array.isArray(oldNode.linkedTableIds)
      ? oldNode.linkedTableIds.map(id => ensureSuffix(id) || id)
      : [],
    // Suffixer aussi les linkedVariableIds pour que les copies pointent vers les variables copiées
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

    // 🆕 Si ce node a des tables liées (linkedTableIds), l'ajouter à displayNodeIds
    // pour que le post-processing crée les variables pour afficher les données
    if (Array.isArray(cloneData.linkedTableIds) && cloneData.linkedTableIds.length > 0) {
      displayNodeIds.push(newId);
      console.log(`[DEEP-COPY] 📊 Node ${newId} ajouté à displayNodeIds (linkedTableIds: ${cloneData.linkedTableIds.length})`);
    }
  }

  for (const { oldId, newId, newParentId } of createdNodes) {
    const oldNode = byId.get(oldId)!;
    
    // 🔑 CRITICAL: Récupérer l'ordre de linkedFormulaIds de l'original
    const linkedFormulaIdOrder = Array.isArray(oldNode.linkedFormulaIds) ? oldNode.linkedFormulaIds : [];
    console.log(`[DEBUG] Processing node ${oldId}, linkedFormulaIds order: ${JSON.stringify(linkedFormulaIdOrder)}`);
    
    // Récupérer toutes les formules
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({ where: { nodeId: oldId } });
    console.log(`[DEBUG] Found ${formulas.length} formulas for node ${oldId}`);
    
    // CRITICAL: Trier selon linkedFormulaIds order, MAIS SEULEMENT les IDs valides
    // D'abord, créer une map formula id -> formula
    const formulaMap = new Map(formulas.map(f => [f.id, f]));
    
    // Créer le tableau trié en validant chaque ID
    const sortedFormulas: typeof formulas = [];
    const validLinkedIds: string[] = [];
    for (const formulaId of linkedFormulaIdOrder) {
      const formula = formulaMap.get(formulaId);
      if (formula) {
        sortedFormulas.push(formula);
        validLinkedIds.push(formulaId);
        formulaMap.delete(formulaId);
        console.log(`[DEBUG] Added formula ${formula.id} (${formula.name}) at position ${sortedFormulas.length - 1}`);
      } else {
        console.warn(`[DEBUG] ⚠️  Formula ID ${formulaId} in linkedFormulaIds not found - skipping`);
      }
    }
    
    // Ajouter les formules restantes (non liées ou qui n'étaient pas dans linkedFormulaIds)
    const unlinkedFormulas = Array.from(formulaMap.values());
    const allFormulas = [...sortedFormulas, ...unlinkedFormulas];
    console.log(`[DEBUG] Final formula order: ${allFormulas.map(f => f.id).join(', ')}`);
    
    const newLinkedFormulaIds: string[] = [];
    
    for (const f of allFormulas) {
      try {
        // Utiliser copyFormulaCapacity pour avoir la réécriture complète
        const formulaResult = await copyFormulaCapacity(
          f.id,
          newId,
          suffixNum,
          prisma,
          { 
            formulaIdMap,
            nodeIdMap: idMap
          }
        );

        if (formulaResult.success) {
          const newFormulaId = formulaResult.newFormulaId;
          formulaIdMap.set(f.id, newFormulaId);
          
          // 🔑 Ajouter au linkedFormulaIds seulement si c'était lié à l'original
          if (validLinkedIds.includes(f.id)) {
            newLinkedFormulaIds.push(newFormulaId);
            console.log(`[DEBUG] Linked formula (centralisé): ${newFormulaId} added at position ${newLinkedFormulaIds.length - 1}`);
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
          console.error(`❌ Erreur copie formule centralisée: ${f.id}`);
        }
      } catch (error) {
        console.error(`❌ Exception copie formule ${f.id}:`, error);
      }
    }
    
    // 🔑 CRITICAL: Ajouter tous les linkedFormulaIds en UNE SEULE OPÉRATION dans le BON ORDRE!
    console.log(`[DEBUG] Final newLinkedFormulaIds: ${JSON.stringify(newLinkedFormulaIds)}`);
    if (newLinkedFormulaIds.length > 0) {
      try {
        await addToNodeLinkedField(prisma, newId, 'linkedFormulaIds', newLinkedFormulaIds);
        console.log(`[DEBUG] Successfully added linkedFormulaIds to node ${newId}`);
      } catch (e) {
        console.warn('[TreeBranchLeaf API] Warning updating linkedFormulaIds for node:', (e as Error).message);
      }
    }

    const conditions = await prisma.treeBranchLeafNodeCondition.findMany({ where: { nodeId: oldId } });
    const linkedConditionIdOrder = Array.isArray(oldNode.linkedConditionIds) ? oldNode.linkedConditionIds : [];
    const copiedNodeIds = new Set(idMap.values());
    
    // Trier les conditions selon linkedConditionIdOrder, MAIS SEULEMENT les IDs valides
    // D'abord, créer une map condition id -> condition
    const conditionMap = new Map(conditions.map(c => [c.id, c]));
    
    // Créer le tableau trié en validant chaque ID
    const sortedConditions: typeof conditions = [];
    const validLinkedConditionIds: string[] = [];
    for (const conditionId of linkedConditionIdOrder) {
      const condition = conditionMap.get(conditionId);
      if (condition) {
        sortedConditions.push(condition);
        validLinkedConditionIds.push(conditionId);
        conditionMap.delete(conditionId);
        console.log(`[DEBUG] Added condition ${condition.id} (${condition.name}) at position ${sortedConditions.length - 1}`);
      } else {
        console.warn(`[DEBUG] ⚠️  Condition ID ${conditionId} in linkedConditionIds not found - skipping`);
      }
    }
    
    // Ajouter les conditions restantes (non liées ou qui n'étaient pas dans linkedConditionIds)
    const unlinkedConditions = Array.from(conditionMap.values());
    const allConditions = [...sortedConditions, ...unlinkedConditions];
    
    const newLinkedConditionIds: string[] = [];
    
    for (const c of allConditions) {
      const newConditionId = appendSuffix(c.id);
      conditionIdMap.set(c.id, newConditionId);
      const newSet = replaceIdsInConditionSet(c.conditionSet, idMap, formulaIdMap, conditionIdMap) as Prisma.InputJsonValue;
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
      
      // 🔑 Ajouter au linkedConditionIds seulement si c'était lié à l'original (et que l'ID était valide)
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
          // Ne pas polluer les templates originaux : lors d'une duplication, on ne met à jour
          // que les nœuds copiés (suffixés) présents dans idMap.values().
          if (normalizedRepeatContext && !copiedNodeIds.has(normalizedRefId)) {
            continue;
          }
          await addToNodeLinkedField(prisma, normalizedRefId, 'linkedConditionIds', [newConditionId]);
        }
      } catch (e) {
        console.warn('[TreeBranchLeaf API] Warning updating linkedConditionIds during deep copy:', (e as Error).message);
      }
    }
    
    // 🔑 IMPORTANT: Ajouter tous les linkedConditionIds en UNE SEULE OPÉRATION dans le BON ORDRE!
    if (newLinkedConditionIds.length > 0) {
      try {
        await addToNodeLinkedField(prisma, newId, 'linkedConditionIds', newLinkedConditionIds);
      } catch (e) {
        console.warn('[TreeBranchLeaf API] Warning updating linkedConditionIds for node:', (e as Error).message);
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
    
    // 🔑 IMPORTANT: Trier les tables selon l'ordre de linkedTableIds (pas orderBy!)
    const linkedTableIdOrder = Array.isArray(oldNode.linkedTableIds) ? oldNode.linkedTableIds : [];
    
    const sortedTables = linkedTableIdOrder
      .map(id => [...tables, ...additionalTables].find(t => t.id === id))
      .filter((t) => t !== undefined) as typeof tables;
    
    const unlinkedTables = [...tables, ...additionalTables].filter(t => !linkedTableIdOrder.includes(t.id));
    const allTablesToCopy = [...sortedTables, ...unlinkedTables];
    
    if (additionalTables.length > 0) {
      console.log(`[DEEP-COPY] 📊 Tables additionnelles trouvées via table_activeId: ${additionalTables.map(t => t.id).join(', ')}`);
    }
    
    const newLinkedTableIds: string[] = [];
    
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
      
      // 🔑 Ajouter au linkedTableIds seulement si c'était lié à l'original
      if (linkedTableIdOrder.includes(t.id)) {
        newLinkedTableIds.push(newTableId);
      }
      
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
          // 🔧 TRAITER LE meta: suffix les références aux nodes
          meta: (() => {
            if (!t.meta) {
              return t.meta as Prisma.InputJsonValue;
            }
            try {
              const str = JSON.stringify(t.meta);
              // Remplacer les UUIDs par leurs versions suffixées
              let replaced = str.replace(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, (uuid: string) => {
                const mapped = idMap.get(uuid);
                if (mapped) {
                  console.log(`[table.meta] UUID remappé: ${uuid} → ${mapped}`);
                  return mapped;
                }
                // Si pas dans la map et suffixe pas déjà appliqué, l'ajouter
                if (!uuid.match(/-\d+$/)) {
                  console.log(`[table.meta] UUID suffixé: ${uuid} → ${uuid}-${suffixNum}`);
                  return `${uuid}-${suffixNum}`;
                }
                return uuid;
              });
              return JSON.parse(replaced) as Prisma.InputJsonValue;
            } catch {
              console.warn('[table.meta] Erreur traitement meta, copie tel quel');
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
              // Suffixer le name SEULEMENT si c'est du texte, pas si c'est numérique
              name: col.name && /^\d+$/.test(col.name) ? col.name : (col.name ? `${col.name}${computedLabelSuffix}` : col.name),
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
    
    // 🔑 IMPORTANT: Ajouter tous les linkedTableIds en UNE SEULE OPÉRATION dans le BON ORDRE!
    if (newLinkedTableIds.length > 0) {
      try {
        await addToNodeLinkedField(prisma, newId, 'linkedTableIds', newLinkedTableIds);
      } catch (e) {
        console.warn('[TreeBranchLeaf API] Warning updating linkedTableIds for node:', (e as Error).message);
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
    console.log(`\n🔷🔷🔷 [LINKED_VARS] Traitement nœud ${oldNodeId} -> ${newNodeId}`);
    console.log(`🔷 [LINKED_VARS] oldNode.linkedVariableIds = ${JSON.stringify(oldNode.linkedVariableIds)}`);
    if (Array.isArray(oldNode.linkedVariableIds)) {
      for (const rawId of oldNode.linkedVariableIds) {
        if (typeof rawId === 'string') {
          const normalized = rawId.trim();
          if (normalized) {
            // ⚠️ Normaliser en retirant d'éventuels anciens suffixes (-1, -2, ...)
            // pour toujours repartir de l'ID base lors d'une nouvelle duplication
            const baseId = stripNumericSuffix(normalized);
            sourceLinkedVariableIds.add(baseId || normalized);
            console.log(`🔷 [LINKED_VARS] Ajouté: ${baseId || normalized} (depuis: ${rawId})`);
          }
        }
      }
    }
    
    // 🔴 FIX: Ajouter TOUTES les variables directes du nœud (pas seulement 1)
    const directVarIds = directVariableIdByNodeId.get(oldNodeId);
    if (directVarIds && directVarIds.size > 0) {
      for (const directVarIdForNode of directVarIds) {
        const baseId = stripNumericSuffix(directVarIdForNode);
        sourceLinkedVariableIds.add(baseId || directVarIdForNode);
      }
    }

    // ⚠️ CRITIQUE: On copie les variables pour créer les display nodes
    // MAIS on ne met PAS à jour linkedVariableIds après !
    // Le linkedVariableIds reste celui du template original (copié automatiquement)
    
    console.log(`🔷 [LINKED_VARS] sourceLinkedVariableIds.size = ${sourceLinkedVariableIds.size}`);
    console.log(`🔷 [LINKED_VARS] Contenu: ${JSON.stringify([...sourceLinkedVariableIds])}`);
    
    if (sourceLinkedVariableIds.size > 0) {
      console.log(`🔷 [LINKED_VARS] ✅ Entrée dans la boucle de copie de variables!`);
      for (const linkedVarId of sourceLinkedVariableIds) {
        console.log(`🔷 [LINKED_VARS] Traitement variable: ${linkedVarId}`);
        const isSharedRef = linkedVarId.startsWith('shared-ref-');
        if (!isSharedRef) {
          try {
            console.log(`🔷 [LINKED_VARS] 📞 Appel copyVariableWithCapacities(${linkedVarId}, ${suffixToken}, ${newNodeId})`);
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
                displayParentId: newNodeId, // 🔧 FIX: Le parent doit être le nœud copié (pas son parent)
                isFromRepeaterDuplication: isFromRepeaterDuplication,
                repeatContext: normalizedRepeatContext
              }
            );
            console.log(`🔷 [LINKED_VARS] 📤 Résultat copyVariableWithCapacities: success=${copyResult.success}, displayNodeId=${copyResult.displayNodeId}`);
            if (copyResult.success && copyResult.displayNodeId) {
              displayNodeIds.push(copyResult.displayNodeId);
              console.log(`🔷 [LINKED_VARS] ✅ Display node ajouté: ${copyResult.displayNodeId}`);
            } else {
              console.log(`🔷 [LINKED_VARS] ⚠️ Pas de display node créé! error=${copyResult.error}`);
            }
          } catch (e) {
            console.warn(`[DEEP-COPY] Erreur copie variable ${linkedVarId}:`, (e as Error).message);
          }
        } else {
          console.log(`🔷 [LINKED_VARS] ⏭️ Variable ignorée (shared-ref): ${linkedVarId}`);
        }
      }
    }

    if (
      newLinkedFormulaIds.length > 0 ||
      newLinkedConditionIds.length > 0 ||
      newLinkedTableIds.length > 0
    ) {
      try {
        // ⚠️ CRITIQUE: Ne PAS mettre à jour linkedVariableIds !
        // Il est copié automatiquement et doit rester intact
        await prisma.treeBranchLeafNode.update({
          where: { id: newNodeId },
          data: {
            linkedFormulaIds: newLinkedFormulaIds.length > 0 ? { set: newLinkedFormulaIds } : { set: [] },
            linkedConditionIds: newLinkedConditionIds.length > 0 ? { set: newLinkedConditionIds } : { set: [] },
            linkedTableIds: newLinkedTableIds.length > 0 ? { set: newLinkedTableIds } : { set: [] }
            // linkedVariableIds: SUPPRIMÉ - ne doit PAS être mis à jour !
          }
        });
        
        // ⚠️ SUPPRIMÉ: Ne PAS mettre à jour linkedVariableIds après la copie !
        // Le linkedVariableIds est copié automatiquement depuis le template original
        // et doit rester INTACT (contenir seulement l'ID original, pas les IDs copiés)
      } catch (e) {
        console.warn('[DEEP-COPY] Erreur lors du UPDATE des linked***', (e as Error).message);
      }
    }
  }

  const rootNewId = idMap.get(source.id)!;

  // ------------------------------------------------------------------
  // POST-PROCESS: Créer variables pour noeuds avec linkedTableIds
  // ------------------------------------------------------------------
  if (displayNodeIds.length > 0) {
    console.log(`[DEEP-COPY] 🔧 Création variables pour ${displayNodeIds.length} noeuds avec linkedTableIds`);
    for (const nodeId of displayNodeIds) {
      try {
        // Récupérer le noeud copié
        const copiedNode = await prisma.treeBranchLeafNode.findUnique({
          where: { id: nodeId },
          select: { id: true, label: true, field_label: true, linkedTableIds: true }
        });
        
        if (!copiedNode || !copiedNode.linkedTableIds || copiedNode.linkedTableIds.length === 0) {
          continue;
        }

        // Trouver le noeud ORIGINAL (enlever suffixe)
        const originalNodeId = nodeId.replace(/-\d+$/, '');
        
        console.log(`[DEEP-COPY] 🔍 Recherche variable pour noeud original ${originalNodeId}`);

        // Chercher variable originale avec le nodeId du NOEUD ORIGINAL
        const originalVar = await prisma.treeBranchLeafNodeVariable.findFirst({
          where: { nodeId: originalNodeId }
        });

        if (!originalVar) {
          console.warn(`[DEEP-COPY] ⚠️ Variable originale non trouvée pour noeud ${originalNodeId}`);
          continue;
        }
        
        console.log(`[DEEP-COPY] ✅ Variable originale trouvée: ${originalVar.id} (${originalVar.exposedKey})`);

        // Créer la variable copiée avec nodeId = noeud copié
        // 🛠️ Utiliser appendSuffix pour garantir le format "-suffix" et éviter les collisions
        const newVarId = appendSuffix(originalVar.id);
        const newExposedKey = appendSuffix(originalVar.exposedKey);

        console.log(`[DEEP-COPY] 🔧 Création variable ${newVarId} avec nodeId=${nodeId}`);

        await prisma.treeBranchLeafNodeVariable.create({
          data: {
            id: newVarId,
            nodeId: nodeId,
            exposedKey: newExposedKey,
            displayName: copiedNode.label || copiedNode.field_label || originalVar.displayName,
            displayFormat: originalVar.displayFormat,
            precision: originalVar.precision,
            unit: originalVar.unit,
            visibleToUser: originalVar.visibleToUser,
            isReadonly: originalVar.isReadonly,
            defaultValue: originalVar.defaultValue,
            metadata: originalVar.metadata || {},
            fixedValue: originalVar.fixedValue,
            selectedNodeId: originalVar.selectedNodeId,
            sourceRef: originalVar.sourceRef,
            sourceType: originalVar.sourceType,
            updatedAt: new Date()
          }
        });

        // Synchroniser data_activeId + linkedVariableIds sur le noeud copié
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
            // linkedVariableIds doit contenir la variable copiée (suffixée)
            linkedVariableIds: { set: [newVarId] }
          }
        });

        console.log(`[DEEP-COPY] ✅ Variable ${newVarId} créée et ${nodeId} synchronisé`);
      } catch (varError) {
        console.error(`[DEEP-COPY] ❌ Erreur création variable pour ${nodeId}:`, varError);
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
