import { PrismaClient } from '@prisma/client';
import {
  captureRepeatTemplate,
  type RepeatTemplateBlueprint,
  type TotalFieldConfig
} from '../registry/repeat-id-registry.js';

/**
 * Turns the raw events stored in the repeat registry into a normalized
 * blueprint. When the registry does not have enough data (for example right
 * after boot) we fall back to inspecting Prisma directly so the repeater still
 * works.
 */

export interface RepeatBlueprint extends RepeatTemplateBlueprint {
  repeaterNodeId: string;
  templateNodeIds: string[];
}

type Nullable<T> = T | null | undefined;

const parseJsonArray = <T = string>(value: Nullable<string>): T[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

/**
 * Builds the full repeat blueprint for the requested repeater node.
 *
 * 1. Prefer the in-memory registry (populated by the legacy copier).
 * 2. Fall back to inspecting the template nodes stored on the repeater.
 * 3. Return a deterministic structure that can feed the instantiator.
 */
export async function buildBlueprintForRepeater(
  prisma: PrismaClient,
  repeaterNodeId: string
): Promise<RepeatBlueprint | null> {
  
  if (!repeaterNodeId) {
    console.warn(`[repeat-blueprint-builder] Missing repeaterNodeId`);
    return null;
  }

  const cached = captureRepeatTemplate(repeaterNodeId);
  if (cached) {
    
    // Ã¢Å¡Â Ã¯Â¸Â FIX: Ne PAS dÃƒÂ©river les IDs depuis le cache (peut contenir des display nodes)
    // Au lieu de ÃƒÂ§a, lire les IDs depuis metadata.repeater.templateNodeIds de la DB
    const repeaterNodeForCache = await prisma.treeBranchLeafNode.findUnique({
      where: { id: repeaterNodeId },
      select: { metadata: true, repeater_templateNodeIds: true }
    });
    
    const candidateTemplateIds = repeaterNodeForCache 
      ? extractTemplateIds(repeaterNodeForCache)
      : [];
    
    const { validIds: cachedTemplateIds } = await filterExistingTemplateNodeIds(
      prisma,
      repeaterNodeId,
      candidateTemplateIds
    );

    if (cachedTemplateIds.length) {
      const validTemplateSet = new Set(cachedTemplateIds);
      return {
        ...cached,
        repeaterNodeId,
        templateNodeIds: cachedTemplateIds,
        variables: cached.variables?.filter(v => !v.nodeId || validTemplateSet.has(v.nodeId)) ?? [],
        capacities: cached.capacities?.filter(c => !c.ownerNodeId || validTemplateSet.has(c.ownerNodeId)) ?? [],
        totalField: cached.totalField
      };
    }

    console.warn('[repeat-blueprint-builder] Cached blueprint invalid, falling back to Prisma lookup', {
      repeaterNodeId,
      candidateTemplateIds
    });
  }

  const repeaterNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: repeaterNodeId },
    select: {
      id: true,
      repeater_templateNodeIds: true,
      metadata: true,
      treeId: true
    }
  });
  
  if (!repeaterNode) {
    console.warn(`[repeat-blueprint-builder] Ã¢ÂÅ’ Repeater node not found: ${repeaterNodeId}`);
    return null;
  }
  
  
  const extractedIds = extractTemplateIds(repeaterNode);
  
  // Ã¢Å¡Â Ã¯Â¸Â FIX CRITIQUE: Ne PAS enrichir avec les copies existantes!
  // enrichTemplateIdsWithExistingCopies ajoutait des display nodes auto-gÃƒÂ©nÃƒÂ©rÃƒÂ©s
  // dans la liste des templates, ce qui causait des duplications partielles.
  // Les templates doivent TOUJOURS ÃƒÂªtre exactement ceux dÃƒÂ©clarÃƒÂ©s dans metadata.
  const candidateTemplateNodeIds = extractedIds;
  
  const { validIds: templateNodeIds } = await filterExistingTemplateNodeIds(
    prisma,
    repeaterNodeId,
    candidateTemplateNodeIds
  );

  if (!templateNodeIds.length) {
    console.warn(`[repeat-blueprint-builder] Ã¢Å¡Â Ã¯Â¸Â No valid templates found!`);
    return {
      repeaterNodeId,
      templateNodeIds: [],
      variables: [],
      capacities: [],
      capturedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString()
    };
  }

  // 1Ã¯Â¸ÂÃ¢Æ’Â£ Get variables directly owned by template nodes
  const directVariables = await prisma.treeBranchLeafNodeVariable.findMany({
    where: { nodeId: { in: templateNodeIds } },
    select: {
      id: true,
      nodeId: true,
      sourceRef: true,
      sourceType: true
    }
  });

  // 2Ã¯Â¸ÂÃ¢Æ’Â£ Get variables that are LINKED by template nodes (e.g., Orientation-Inclinaison variable linked to Orientation and Inclinaison nodes)
  // First, build a map of which template node links to which variable
  const linkedVarsByNode = new Map<string, Set<string>>();
  const templateNodesWithLinks = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: templateNodeIds } },
    select: { 
      id: true,
      linkedVariableIds: true 
    }
  });

  // 🔧 FIX: Nettoyer les suffixes des linkedVariableIds car certains templates
  // peuvent référencer des variables avec des IDs suffixés (ex: var-1) qui n'existent pas en DB
  // On doit mapper vers l'ID original de la variable
  const cleanVariableId = (id: string): string => {
    if (!id) return id;
    // Pattern: UUID complet suivi de -N (suffixe de copie)
    return id.replace(/(-\d+)+$/, '');
  };

  // Map: originalVarId -> Set<templateNodeId>
  // Et aussi: suffixedVarId -> originalVarId (pour retrouver l'original)
  const suffixedToOriginal = new Map<string, string>();

  for (const node of templateNodesWithLinks) {
    if (node.linkedVariableIds && node.linkedVariableIds.length > 0) {
      for (const varId of node.linkedVariableIds) {
        const cleanedId = cleanVariableId(varId);
        if (cleanedId !== varId) {
          suffixedToOriginal.set(varId, cleanedId);
        }
        // Utiliser l'ID nettoyé comme clé
        if (!linkedVarsByNode.has(cleanedId)) {
          linkedVarsByNode.set(cleanedId, new Set());
        }
        linkedVarsByNode.get(cleanedId)!.add(node.id);
      }
    }
  }

  const linkedVariableIds = Array.from(linkedVarsByNode.keys()).filter(
    id => !directVariables.some(v => v.id === id) // Avoid duplicates
  );

  const linkedVariables = linkedVariableIds.length > 0
    ? await prisma.treeBranchLeafNodeVariable.findMany({
        where: { id: { in: linkedVariableIds } },
        select: {
          id: true,
          nodeId: true,
          sourceRef: true,
          sourceType: true
        }
      })
    : [];

  // Ã°Å¸â€Â§ CRITICAL FIX: For linked variables, we need to generate a variable entry for EACH template node that references it
  // Example: Orientation-Inclinaison variable is linked to both Orientation and Inclinaison nodes
  // We need TWO variable entries in the plan (one per template node)
  // Each entry specifies primaryTargetNodeId = the template node that should receive the copied variable
  // This is ESSENTIAL for proper hierarchical structure during duplication
  const expandedVariables = [];
  for (const directVar of directVariables) {
    expandedVariables.push({
      ...directVar,
      variableId: directVar.id,
      linkedToNodeIds: [] // Direct variables don't have this
    });
  }
  for (const linkedVar of linkedVariables) {
    // Ã¢Å¡Â Ã¯Â¸Â IMPORTANT: Create ONE entry per template node that links this variable
    // This ensures the variable is copied for EACH template that needs it
    const referencingNodeIds = Array.from(linkedVarsByNode.get(linkedVar.id) || []);
    for (const nodeId of referencingNodeIds) {
      expandedVariables.push({
        ...linkedVar,
        variableId: linkedVar.id,
        linkedToNodeIds: [nodeId], // This variable is linked to this template node
        primaryTargetNodeId: nodeId // Ã¢â€ Â The node that should receive the copied variable's display node
      });
    }
  }

  const variables = expandedVariables;

  const [formulas, conditions, tables] = await Promise.all([
    prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: { in: templateNodeIds } },
      select: { id: true, nodeId: true }
    }),
    prisma.treeBranchLeafNodeCondition.findMany({
      where: { nodeId: { in: templateNodeIds } },
      select: { id: true, nodeId: true }
    }),
    prisma.treeBranchLeafNodeTable.findMany({
      where: { nodeId: { in: templateNodeIds } },
      select: { id: true, nodeId: true }
    })
  ]);

  const totalField = extractTotalFieldConfig(repeaterNode.metadata);

  return {
    repeaterNodeId,
    templateNodeIds,
    variables: variables.map(v => ({
      nodeId: v.nodeId,
      variableId: v.id,
      sourceRef: v.sourceRef,
      sourceType: v.sourceType,
      displayNodeId: null,
      metadata: undefined,
      // Ã°Å¸â€Â§ PRESERVE: primaryTargetNodeId for linked variables
      primaryTargetNodeId: (v as any).primaryTargetNodeId || undefined
    })),
    capacities: [
      ...formulas.map(f => ({
        ownerNodeId: f.nodeId,
        capacityId: f.id,
        capacityType: 'formula' as const
      })),
      ...conditions.map(c => ({
        ownerNodeId: c.nodeId,
        capacityId: c.id,
        capacityType: 'condition' as const
      })),
      ...tables.map(t => ({
        ownerNodeId: t.nodeId,
        capacityId: t.id,
        capacityType: 'table' as const
      }))
    ],
    totalField: totalField || undefined,
    capturedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString()
  };
}

function extractTemplateIds(node: { repeater_templateNodeIds: Nullable<string>; metadata: Nullable<Record<string, unknown>> }): string[] {
  // Ã°Å¸Å½Â¯ PRIORITÃƒâ€° 1: Lire depuis metadata.repeater.templateNodeIds (SOURCE DE VÃƒâ€°RITÃƒâ€°)
  const metaRepeater = typeof node.metadata === 'object' && node.metadata !== null
    ? (node.metadata as Record<string, unknown>).repeater
    : undefined;
  if (metaRepeater && typeof metaRepeater === 'object') {
    const fromMetadata = (metaRepeater as Record<string, unknown>).templateNodeIds;
    if (Array.isArray(fromMetadata) && fromMetadata.length > 0) {
      const filtered = fromMetadata.filter((id): id is string => typeof id === 'string');
      return filtered;
    }
  }

  // Ã°Å¸â€â€ž FALLBACK: Si metadata est vide, lire depuis repeater_templateNodeIds
  const fromColumn = parseJsonArray<string>(node.repeater_templateNodeIds);
  if (fromColumn.length) {
    return fromColumn;
  }

  console.warn(`Ã¢ÂÅ’ [extractTemplateIds] Aucun template trouvÃƒÂ© !`);
  return [];
}

function extractTotalFieldConfig(metadata: Nullable<Record<string, unknown>>): TotalFieldConfig | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const repeaterMeta = (metadata as Record<string, unknown>).repeater;
  if (!repeaterMeta || typeof repeaterMeta !== 'object') return null;
  const total = (repeaterMeta as Record<string, unknown>).totalField;
  if (!total || typeof total !== 'object') return null;
  const typed = total as Partial<TotalFieldConfig> & { aggregationType?: string };
  if (!typed.aggregationType || !typed.repeaterNodeId) return null;
  return {
    repeaterNodeId: typed.repeaterNodeId,
    aggregationType: typed.aggregationType as TotalFieldConfig['aggregationType'],
    targetDisplayNodeId: typed.targetDisplayNodeId ?? null,
    targetVariableId: typed.targetVariableId ?? null,
    metadata: typed.metadata ?? null
  };
}

function deriveTemplateIdsFromBlueprint(blueprint: RepeatTemplateBlueprint): string[] {
  const ids = new Set<string>();
  blueprint.variables?.forEach(v => v.nodeId && ids.add(v.nodeId));
  blueprint.capacities?.forEach(c => c.ownerNodeId && ids.add(c.ownerNodeId));
  return Array.from(ids);
}

async function enrichTemplateIdsWithExistingCopies(
  prisma: PrismaClient,
  repeaterNodeId: string,
  initialIds: string[]
): Promise<string[]> {
  // Ã°Å¸â€Â´ CRITIQUE: Filtrer TOUS les IDs avec suffixe dÃƒÂ¨s le dÃƒÂ©but
  // Si repeater_templateNodeIds contient "uuid-1", on doit le rejeter immÃƒÂ©diatement
  // Utilise une regex prÃƒÂ©cise pour dÃƒÂ©tecter UNIQUEMENT les suffixes de copie (aprÃƒÂ¨s un UUID complet)
  // Pattern: UUID complet (8-4-4-4-12) + un ou plusieurs suffixes -N
  const hasCopySuffix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-\d+)+$/i;
  const normalized = initialIds
    .filter((id): id is string => typeof id === 'string' && !!id)
    .filter(id => !hasCopySuffix.test(id)); // Ã¢ÂÅ’ Rejeter les IDs avec suffixes de copie
  
  const templateSet = new Set(normalized);
  
  if (!repeaterNodeId) {
    return Array.from(templateSet);
  }

  try {
    const copies = await prisma.treeBranchLeafNode.findMany({
      where: {
        metadata: {
          path: ['duplicatedFromRepeater'],
          equals: repeaterNodeId
        }
      },
      select: { metadata: true }
    });

    for (const copy of copies) {
      const metadata = (copy.metadata ?? {}) as Record<string, unknown>;
      const sourceTemplateId = typeof metadata.sourceTemplateId === 'string' ? metadata.sourceTemplateId : null;
      const copiedFromNodeId = typeof metadata.copiedFromNodeId === 'string' ? metadata.copiedFromNodeId : null;
      
      // Ã°Å¸â€Â´ FIX: N'ajouter que les IDs ORIGINAUX (sans suffixe -1, -2, etc.)
      // Ne PAS ajouter les copies elles-mÃƒÂªmes comme templates!
      if (sourceTemplateId && !sourceTemplateId.match(/-\d+$/)) {
        templateSet.add(sourceTemplateId);
      }
      if (copiedFromNodeId && !copiedFromNodeId.match(/-\d+$/)) {
        templateSet.add(copiedFromNodeId);
      }
    }
  } catch (error) {
    console.warn('[repeat-blueprint-builder] Unable to derive template IDs from existing copies:', error);
  }

  return Array.from(templateSet);
}

async function filterExistingTemplateNodeIds(
  prisma: PrismaClient,
  repeaterNodeId: string,
  candidateIds: string[]
) {
  const normalized = Array.from(new Set(candidateIds.filter((id): id is string => typeof id === 'string' && !!id)));
  if (!normalized.length) {
    return { validIds: [] as string[], missingIds: [] as string[] };
  }

  const existing = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: normalized } },
    select: { id: true }
  });

  const existingSet = new Set(existing.map(node => node.id));
  const validIds = normalized.filter(id => existingSet.has(id));
  const missingIds = normalized.filter(id => !existingSet.has(id));

  if (missingIds.length) {
    console.warn('[repeat-blueprint-builder] Missing template nodes detected', {
      repeaterNodeId,
      missingCount: missingIds.length,
      missingIds
    });
  }

  return { validIds, missingIds };
}
