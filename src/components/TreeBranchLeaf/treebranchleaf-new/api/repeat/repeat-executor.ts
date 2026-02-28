import { Prisma, type PrismaClient } from '@prisma/client';
import { copySelectorTablesAfterNodeCopy } from '../copy-selector-tables.js';
import { applySharedReferencesFromOriginalInternal } from '../../shared/shared-reference-helpers.js';
import { deepCopyNodeInternal, type DeepCopyOptions, type DeepCopyResult } from './services/deep-copy-service.js';
import { buildResponseFromColumns, getAuthCtx, type MinimalReq } from './services/shared-helpers.js';
import { RepeatOperationError, type RepeatExecutionResult } from './repeat-service.js';
import { computeTemplateCopySuffixMax } from './utils/suffix-utils.js';
// SKIP: fixAllCompleteDuplications est REDONDANT + CASSÉ (include manquant → crash systématique)
// import { fixAllCompleteDuplications } from './services/complete-duplication-fix.js';
// SKIP: forceAllNodesRecalculationWithOwnData est CASSÉ (include manquant) + seule action utile déjà faite par batchPostDuplicationProcessing
// import { forceAllNodesRecalculationWithOwnData } from './services/force-recalculation-service.js';
import { batchPostDuplicationProcessing } from './services/batch-post-duplication.js';
import { tableLookupDuplicationService } from './services/table-lookup-duplication-service.js';
import { recalculateAllCopiedNodesWithOperationInterpreter } from './services/recalculate-with-interpreter.js';
import { syncRepeaterTemplateIds } from './services/repeater-template-sync.js';
import { copyVariableWithCapacities } from './services/variable-copy-engine.js';

export interface RepeatExecutionSummary {
  duplicated: Array<{ id: string; label: string | null; type: string; parentId: string | null; sourceTemplateId: string }>;
  nodes: Record<string, unknown>[];
  count: number;
  warnings?: string[];
  debug?: {
    templateNodeIds: string[];
    nodesToDuplicateIds: string[];
    sectionIds: string[];
    templateCount: number;
    nodesToDuplicateCount: number;
    sectionCount: number;
    // 🎯 NOUVEAU: Infos sur les triggers et subType pour debug frontend
    triggersFix?: Array<{
      nodeId: string;
      label: string;
      originalSubType: string | null;
      appliedSubType: string | null;
      originalTriggers: unknown;
      suffixedTriggers: unknown;
    }>;
  };
}

export async function runRepeatExecution(
  prisma: PrismaClient,
  req: MinimalReq,
  execution: RepeatExecutionResult
): Promise<RepeatExecutionSummary> {
  const { repeaterNodeId, scopeId, plan, blueprint } = execution;

  const authCtx = getAuthCtx(req);

  const repeaterNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: repeaterNodeId },
    include: { TreeBranchLeafTree: true }
  });

  if (!repeaterNode) {
    throw new RepeatOperationError(`Repeater node ${repeaterNodeId} not found.`, 404);
  }

  if (!authCtx.isSuperAdmin && authCtx.organizationId && repeaterNode.TreeBranchLeafTree?.organizationId !== authCtx.organizationId) {
    throw new RepeatOperationError('Access denied for this repeater tree.', 403);
  }

  // Ã°Å¸â€Â´ FILTRE CRITIQUE: Ne JAMAIS utiliser des IDs suffixÃƒÂ©s comme templates
  // Les templates doivent ÃƒÂªtre des UUIDs purs, sans suffixes de copie (-1, -2, etc.)
  // Si on utilise uuid-1 comme template et qu'on lui applique un nouveau suffixe,
  // on crÃƒÂ©e uuid-1-1 (double suffixe) au lieu de uuid-2
  const hasCopySuffix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-\d+)+$/i;
  // Ã¢Å¡Â Ã¯Â¸Â IMPORTANT: Toujours utiliser les IDs dÃƒÂ©clarÃƒÂ©s dans le blueprint (metadata du rÃƒÂ©pÃƒÂ©teur)
  // Le plan peut ÃƒÂªtre partiel et omettre certains templates; l'utilisateur demande
  // la duplication EXACTE des 6 IDs listÃƒÂ©s dans le metadata.repeater.templateNodeIds
  const _t0 = Date.now();
  const rawIds = blueprint.templateNodeIds;
  
  // Nettoyer les IDs: retirer TOUS les suffixes et vÃƒÂ©rifier qu'on a des UUIDs purs
  const templateNodeIds = rawIds
    .filter(id => typeof id === 'string' && !!id)
    .map(id => id.replace(/(-\d+)+$/, '')) // Retirer suffixes: uuid-1 Ã¢â€ â€™ uuid, uuid-1-2 Ã¢â€ â€™ uuid
    .filter(id => !hasCopySuffix.test(id)); // Double vÃƒÂ©rification

  
  // Afficher les IDs nettoyÃƒÂ©s
  if (rawIds.length !== templateNodeIds.length) {
    rawIds.forEach((id, idx) => {
      const cleaned = id.replace(/(-\d+)+$/, '');
      if (id !== cleaned) {
      }
    });
  }
  
  templateNodeIds.forEach((id, idx) => {
  });

  if (!templateNodeIds.length) {
    throw new RepeatOperationError(`Repeater ${repeaterNodeId} does not declare template nodes to duplicate.`, 422);
  }

  const templateNodes = await loadTemplateNodesWithFallback(
    prisma,
    templateNodeIds,
    repeaterNode.treeId,
    authCtx.organizationId,
    authCtx.isSuperAdmin
  );

  // Ã¢Å¡Â Ã¯Â¸Â FILTRE CRITIQUE: Les sections ne doivent PAS ÃƒÂªtre dupliquÃƒÂ©es
  // Seuls les nÃ…â€œuds enfants (leaf_field, etc.) doivent ÃƒÂªtre copiÃƒÂ©s
  const nodesToDuplicate = templateNodes.filter(node => node.type !== 'section');
  const sectionNodes = templateNodes.filter(node => node.type === 'section');

  // Sections are not duplicated (only their children are copied)
  void sectionNodes;

  const templateById = new Map(nodesToDuplicate.map(node => [node.id, node] as const));
  // Ã°Å¸â€â€™ SÃƒÂ©curitÃƒÂ© ultime : recalculer les suffixes max juste avant de copier
  // pour ÃƒÂ©viter de retomber ÃƒÂ  1 si le plan a ÃƒÂ©tÃƒÂ© calculÃƒÂ© avant la crÃƒÂ©ation de -1.
  const templateIdsForSuffix = Array.from(templateById.keys());
  const existingMax = await computeTemplateCopySuffixMax(
    prisma,
    repeaterNode.treeId,
    templateIdsForSuffix
  );
  templateIdsForSuffix.forEach(id => {
  });
  const plannedSuffixByTemplate = new Map<string, number>();
  // PrÃƒÂ©-remplir tous les templates avec suffix par dÃƒÂ©faut: (max vu + 1)
  for (const templateId of templateIdsForSuffix) {
    const maxSeen = existingMax.get(templateId) ?? 0;
    plannedSuffixByTemplate.set(templateId, maxSeen + 1);
  }
  // Si le plan propose des suffixes spÃƒÂ©cifiques pour certains templates, les appliquer
  for (const nodePlan of plan.nodes) {
    const planned = coerceSuffix(nodePlan.plannedSuffix);
    const maxSeen = existingMax.get(nodePlan.templateNodeId) ?? 0;
    const enforcedNext = Math.max(planned ?? 0, maxSeen + 1);
    plannedSuffixByTemplate.set(nodePlan.templateNodeId, enforcedNext);
  }

  const duplicatedSummaries: RepeatExecutionSummary['duplicated'] = [];
  const duplicatedNodeIds = new Set<string>();
  const originalNodeIdByCopyId = new Map<string, string>();
  
  // 🎯 DEBUG FRONTEND: Collecter les infos sur les triggers pour affichage dans la console frontend
  const triggersFixDebug: Array<{
    nodeId: string;
    label: string;
    originalSubType: string | null;
    appliedSubType: string | null;
    originalTriggers: unknown;
    suffixedTriggers: unknown;
  }> = [];
  
  // Mapping: Associer les IDs supposés du plan aux vrais IDs créés
  // Cela est nÃƒÂ©cessaire car repeat-instantiator.ts crÃƒÂ©e des targetNodeId supposÃƒÂ©s
  // mais deepCopyNodeInternal peut crÃƒÂ©er des IDs rÃƒÂ©els diffÃƒÂ©rents
  const plannedNodeIdToRealNodeId = new Map<string, string>();
  
  // Ã°Å¸â€Â¥ MAPS GLOBALES pour les capacitÃƒÂ©s et les nÃ…â€œuds
  // Ces maps sont partagÃƒÂ©es entre TOUTES les copies de variables pour que
  // les capacitÃƒÂ©s (formules/conditions/tables) utilisent les bons IDs de champs avec suffixes
  const globalNodeIdMap = new Map<string, string>();
  const globalFormulaIdMap = new Map<string, string>();
  const globalConditionIdMap = new Map<string, string>();
  const globalTableIdMap = new Map<string, string>();
  const globalVariableCopyCache = new Map<string, string>();

  // Ã°Å¸Å¡â‚¬Ã°Å¸Å¡â‚¬Ã°Å¸Å¡â‚¬ DUPLICATION DES TEMPLATES: parcourir TOUS les templates ÃƒÂ  dupliquer (metadata)
  // PERF: Pre-load ALL tree nodes ONCE (instead of once per template in deepCopyNodeInternal)
  const _preloadedTreeNodes = await prisma.treeBranchLeafNode.findMany({ where: { treeId: repeaterNode.treeId } });
  const _preloadedTreeNodesById = new Map(_preloadedTreeNodes.map(n => [n.id, n] as const));
  
  const _t1 = Date.now();
  console.log(`[PERF] Setup: ${_t1 - _t0}ms`);
  // PERF: Process ALL templates in PARALLEL instead of sequentially
  // JS is single-threaded so in-memory mutations (Map.set, Array.push) are safe between awaits.
  // Each template creates nodes with unique suffixed IDs → no DB conflicts.
  const templateErrors: Error[] = [];
  await Promise.all(nodesToDuplicate.map(async (template) => {
    try {
      if (!template) return;

      const plannedSuffix = plannedSuffixByTemplate.get(template.id);
      const baseContext = {
        repeaterNodeId,
        templateNodeId: template.id,
        duplicatedFromNodeId: template.id,
        scopeId,
        mode: 'repeater' as const
      };

      const attemptCopy = async (
        forcedSuffix?: number
      ): Promise<{ result: DeepCopyResult; appliedSuffix?: number }> => {
        const context = forcedSuffix !== undefined
          ? { ...baseContext, suffix: forcedSuffix }
          : { ...baseContext };
        const options: DeepCopyOptions = {
          preserveSharedReferences: true,
          repeatContext: context,
          preloadedTreeNodes: _preloadedTreeNodes
        };
        if (forcedSuffix !== undefined) {
          options.forcedSuffix = forcedSuffix;
          options.suffixNum = forcedSuffix;
        }
        try {
          const result = await deepCopyNodeInternal(prisma, req, template!.id, options);
          return { result, appliedSuffix: forcedSuffix };
        } catch (error) {
          if (forcedSuffix !== undefined && isUniqueConstraintError(error)) {
            console.warn('[repeat-executor] Forced suffix already exists, retrying with auto suffix', {
              templateId: template!.id,
              forcedSuffix
            });
            return attemptCopy(undefined);
          }
          throw error;
        }
      };

      const { result: copyResult, appliedSuffix } = await attemptCopy(plannedSuffix);

      const newRootId = copyResult.root.newId;

      // PERF R9: Use root metadata from DeepCopyResult instead of redundant findUnique
      // deepCopyNodeInternal already created this node — no need to re-read it from DB
      
      // 🎯 FIX: Récupérer les triggerNodeIds de l'ORIGINAL, pas de la copie
      const originalMetadata = (template.metadata && typeof template.metadata === 'object')
        ? (template.metadata as Record<string, unknown>)
        : {};
      const originalTriggerNodeIds = originalMetadata.triggerNodeIds;

      // PERF R9: Use metadata from copyResult.root instead of DB findUnique
      const createdMetadata = copyResult.root.metadata
        ? { ...copyResult.root.metadata }
        : {};

      const resolvedSuffix =
        coerceSuffix(createdMetadata.copySuffix) ??
        extractSuffixFromId(newRootId) ??
        appliedSuffix ??
        null;
      const effectiveSuffix = resolvedSuffix ?? plannedSuffix ?? 1;


      // 🎯 CRITIQUE: Fonction helper pour suffixer les triggerNodeIds
      const suffixTriggers = (triggerNodeIds: unknown, label: string) => {
        if (!Array.isArray(triggerNodeIds) || triggerNodeIds.length === 0) {
          return null;
        }
        
        const oldTriggers = [...triggerNodeIds];
        const suffixedTriggerNodeIds = triggerNodeIds.map((triggerId: unknown) => {
          if (typeof triggerId !== 'string') return triggerId;
          
          // Nettoyer l'ID (retirer @value. et {})
          const cleanId = triggerId.replace(/^@value\./, '').replace(/^{/, '').replace(/}$/, '');
          
          // Vérifier si une copie existe déjà dans l'idMap
          if (copyResult.idMap && copyResult.idMap[cleanId]) {
            const newTriggerId = copyResult.idMap[cleanId];
            // Restaurer le format original
            if (triggerId.startsWith('@value.')) return `@value.${newTriggerId}`;
            else if (triggerId.startsWith('{')) return `{${newTriggerId}}`;
            return newTriggerId;
          }
          
          // Sinon, ajouter le suffixe
          const suffixedId = `${cleanId}-${effectiveSuffix}`;
          if (triggerId.startsWith('@value.')) return `@value.${suffixedId}`;
          else if (triggerId.startsWith('{')) return `{${suffixedId}}`;
          return suffixedId;
        });
        
        return suffixedTriggerNodeIds;
      };

      // 🎯 TRAITER LE NŒUD RACINE - Utiliser les triggers ORIGINAUX
      const rootSuffixedTriggers = suffixTriggers(originalTriggerNodeIds, copyResult.root.label || 'root');

      // FIX 25/01/2026: PRESERVER le lookup suffixé qui a été créé par buildCloneData
      // Ne pas écraser les champs lookup.sourceField, lookup.comparisonColumn, etc.
      const updatedMetadata = {
        ...createdMetadata,
        sourceTemplateId: template.id,
        duplicatedAt: new Date().toISOString(),
        duplicatedFromRepeater: repeaterNodeId,
        copiedFromNodeId: template.id,
        copySuffix: effectiveSuffix,
        repeatScopeId: scopeId,
        // IMPORTANT: Préserver le lookup s'il existe déjà (avec suffixes appliqués)
        ...(createdMetadata.lookup ? { lookup: createdMetadata.lookup } : {}),
        // 🎯 IMPORTANT: Ajouter les triggerNodeIds suffixés depuis l'ORIGINAL
        ...(rootSuffixedTriggers ? { triggerNodeIds: rootSuffixedTriggers } : {})
      };

      // 🎯🎯🎯 FIX CRITIQUE: Mettre à jour AUSSI le subType depuis l'original
      
      const updateResult = await prisma.treeBranchLeafNode.update({
        where: { id: newRootId },
        data: {
          subType: template.subType || null,
          metadata: updatedMetadata
        }
      });
      
      
      // PERF R9: Removed DEBUG_IDMAP noise — was creating large arrays per template
      triggersFixDebug.push({
        nodeId: newRootId,
        label: copyResult.root.label || 'root',
        originalSubType: template.subType || null,
        appliedSubType: template.subType || null,
        originalTriggers: originalTriggerNodeIds,
        suffixedTriggers: rootSuffixedTriggers
      });

      // 🎯🎯🎯 NOUVEAU: TRAITER TOUS LES NŒUDS ENFANTS (sections, champs, etc.)
      // Les champs dans des sections peuvent aussi avoir des triggers qui doivent être suffixés
      if (copyResult.idMap && Object.keys(copyResult.idMap).length > 0) {
        const childNodeIds = Object.values(copyResult.idMap).filter(id => id !== newRootId);
        
        // PERF R10: Use _preloadedTreeNodesById for original children (already loaded) — saves 1 findMany per template
        const reverseIdMap = new Map<string, string>();
        for (const [oldId, newId] of Object.entries(copyResult.idMap)) {
          if (newId !== newRootId) {
            reverseIdMap.set(newId, oldId);
          }
        }

        // PERF R10: Pre-filter — only process children whose ORIGINAL has triggerNodeIds or missing subType
        // This avoids loading copiedChildren from DB when no updates are needed
        const childrenNeedingUpdate: Array<{ childId: string; originalChildId: string; originalNode: any }> = [];
        for (const childId of childNodeIds) {
          const originalChildId = reverseIdMap.get(childId);
          if (!originalChildId) continue;
          const originalNode = _preloadedTreeNodesById.get(originalChildId);
          if (!originalNode) continue;
          const origMeta = (originalNode.metadata && typeof originalNode.metadata === 'object')
            ? (originalNode.metadata as Record<string, unknown>)
            : {};
          const hasTriggers = Array.isArray(origMeta.triggerNodeIds) && (origMeta.triggerNodeIds as unknown[]).length > 0;
          // buildCloneData already copies subType, so needsSubTypeUpdate should be rare
          if (hasTriggers) {
            childrenNeedingUpdate.push({ childId, originalChildId, originalNode });
          }
        }

        if (childrenNeedingUpdate.length > 0) {
          // PERF R10: Only query copiedChildren that actually need trigger updates (instead of ALL children)
          const copiedChildren = await prisma.treeBranchLeafNode.findMany({
            where: { id: { in: childrenNeedingUpdate.map(c => c.childId) } },
            select: { id: true, label: true, metadata: true, subType: true }
          });
          const copiedChildMap = new Map(copiedChildren.map(n => [n.id, n]));
        
          const childUpdateOps = [];
          for (const { childId, originalNode } of childrenNeedingUpdate) {
            try {
              const childNode = copiedChildMap.get(childId);
              if (!childNode) continue;
              
              const childMetadata = (childNode.metadata && typeof childNode.metadata === 'object')
                ? (childNode.metadata as Record<string, unknown>)
                : {};
              
              const originalChildMetadata = (originalNode.metadata && typeof originalNode.metadata === 'object')
                ? (originalNode.metadata as Record<string, unknown>)
                : {};
              const originalChildTriggers = originalChildMetadata.triggerNodeIds;
              
              const childSuffixedTriggers = suffixTriggers(
                originalChildTriggers, 
                childNode.label || childId
              );
              
              const needsSubTypeUpdate = originalNode.subType && !childNode.subType;
              const needsTriggersUpdate = childSuffixedTriggers && childSuffixedTriggers.length > 0;
              
              if (needsTriggersUpdate || needsSubTypeUpdate) {
                const updatedChildMetadata = {
                  ...childMetadata,
                  ...(needsTriggersUpdate ? { triggerNodeIds: childSuffixedTriggers } : {})
                };
                
                childUpdateOps.push(
                  prisma.treeBranchLeafNode.update({
                    where: { id: childId },
                    data: {
                      ...(needsSubTypeUpdate ? { subType: originalNode.subType } : {}),
                      metadata: updatedChildMetadata
                    }
                  })
                );
              }
            } catch (childErr) {
              console.error(`[REPEAT-EXECUTOR] Erreur traitement triggers pour enfant ${childId}:`, childErr);
            }
          }
          if (childUpdateOps.length > 0) {
            await prisma.$transaction(childUpdateOps);
          }
        }
      }

      duplicatedSummaries.push({
        id: newRootId,
        label: copyResult.root.label,
        type: copyResult.root.type,
        parentId: copyResult.root.parentId,
        sourceTemplateId: template.id
      });

      duplicatedNodeIds.add(newRootId);
      originalNodeIdByCopyId.set(newRootId, template.id);
      
      // Ã°Å¸â€Â§ MAPPING: Enregistrer les IDs rÃƒÂ©els crÃƒÂ©ÃƒÂ©s
      // Le plan suppose `templateId-suffix` mais deepCopyNodeInternal a crÃƒÂ©ÃƒÂ© `newRootId`
      // Nous devons mapper `templateId-suffix` Ã¢â€ â€™ `newRootId` pour les variables
      const plannedRootId = `${template.id}-${effectiveSuffix}`;
      plannedNodeIdToRealNodeId.set(plannedRootId, newRootId);
      
      Object.entries(copyResult.idMap || {}).forEach(([oldId, newId]) => {
        if (!newId) return;
        duplicatedNodeIds.add(newId);
        if (oldId) {
          originalNodeIdByCopyId.set(newId, oldId);
        }
        
        // Ã°Å¸â€Â§ MAPPING: Aussi enregistrer les nÃ…â€œuds enfants
        // Si le plan suppose `childTemplate-suffix`, mais deepCopyNodeInternal a crÃƒÂ©ÃƒÂ© `childNewId`,
        // on doit mapper aussi ces enfants
        const plannedChildId = `${oldId}-${effectiveSuffix}`;
        plannedNodeIdToRealNodeId.set(plannedChildId, newId);
        
        // Ã°Å¸â€Â¥ AJOUT Ãƒâ‚¬ LA MAP GLOBALE pour les capacitÃƒÂ©s
        // Cela permet aux formules/conditions de rÃƒÂ©soudre les IDs de champs
        globalNodeIdMap.set(oldId, newId);
      });
      
      // Ã°Å¸â€Â¥ ENREGISTRER aussi les maps de capacitÃƒÂ©s du deepCopyNodeInternal
      if (copyResult.formulaIdMap) {
        Object.entries(copyResult.formulaIdMap).forEach(([oldId, newId]) => {
          if (oldId && newId) globalFormulaIdMap.set(oldId, newId);
        });
      }
      if (copyResult.conditionIdMap) {
        Object.entries(copyResult.conditionIdMap).forEach(([oldId, newId]) => {
          if (oldId && newId) globalConditionIdMap.set(oldId, newId);
        });
      }
      if (copyResult.tableIdMap) {
        Object.entries(copyResult.tableIdMap).forEach(([oldId, newId]) => {
          if (oldId && newId) globalTableIdMap.set(oldId, newId);
        });
      }

      // Ajouter les nÃ…â€œuds d'affichage crÃƒÂ©ÃƒÂ©s par copyVariableWithCapacities
      if (copyResult.displayNodeIds && copyResult.displayNodeIds.length > 0) {
        copyResult.displayNodeIds.forEach(displayNodeId => {
          duplicatedNodeIds.add(displayNodeId);
          // Le displayNodeId est dÃƒÂ©rivÃƒÂ© de l'ancien nodeId (ex: oldNodeId-suffix)
          // On peut extraire l'ancien ID en retirant le suffixe
          const originalDisplayNodeId = displayNodeId.replace(/-\d+$/, '');
          originalNodeIdByCopyId.set(displayNodeId, originalDisplayNodeId);
        });
      }

      try {
        await applySharedReferencesFromOriginalInternal({
          prisma,
          nodeId: newRootId,
          authCtx
        });
      } catch (sharedErr) {
        console.warn('[repeat-executor] Failed to apply shared references', sharedErr);
      }

      try {
        const selectorOptions = {
          nodeIdMap: new Map(Object.entries(copyResult.idMap || {})),
          tableCopyCache: new Map<string, string>(),
          tableIdMap: new Map(Object.entries(copyResult.tableIdMap || {}))
        };
        await copySelectorTablesAfterNodeCopy(
          prisma,
          newRootId,
          template.id,
          selectorOptions,
          effectiveSuffix
        );
      } catch (selectorErr) {
        console.warn('[repeat-executor] Failed to copy selector tables', selectorErr);
      }
    } catch (nodeExecErr) {
      // Provide contextual information and rethrow so the route returns 500
      console.error(`[repeat-executor] Error during execution for template ${template?.id || 'unknown'}:`, nodeExecErr instanceof Error ? nodeExecErr.stack || nodeExecErr.message : String(nodeExecErr));
      templateErrors.push(nodeExecErr instanceof Error ? nodeExecErr : new Error(String(nodeExecErr)));
    }
  }));
  // If any template failed, throw the first error
  if (templateErrors.length > 0) {
    throw templateErrors[0];
  }

  // 🚀 COPIER LES VARIABLES APRÈS LES NŒUDS
  const _t2 = Date.now();
  console.log(`[PERF] Template duplication loop: ${_t2 - _t1}ms`);
  // PERF: Pre-charger TOUTES les variables COMPLETES + owner nodes + display nodes + formules
  // en batch avant la boucle pour eliminer ~12 findUnique par variable
  const allTemplateVarIds = [...new Set(plan.variables.map(v => v.templateVariableId))];
  const templateVarsMap = new Map<string, { displayName: string | null }>();
  const fullVarsMap = new Map<string, any>();
  const ownerNodesMap = new Map<string, any>();
  const displayNodesMap = new Map<string, any>();
  const formulasByNodeId = new Map<string, any[]>();
  let allExistingNodeIds = new Set<string>();
  let allExistingVarIds = new Set<string>();
  let allExistingVarKeys = new Set<string>();
  let allVarsByNodeId = new Map<string, any>();

  if (allTemplateVarIds.length > 0) {
    // 1. Load ALL full variable records in 1 query
    const templateVars = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { id: { in: allTemplateVarIds } }
    });
    for (const tv of templateVars) {
      templateVarsMap.set(tv.id, { displayName: tv.displayName });
      fullVarsMap.set(tv.id, tv);
    }

    // 2. Load ALL owner nodes in 1 query
    const ownerNodeIds = [...new Set(templateVars.map(v => v.nodeId).filter(Boolean))] as string[];
    if (ownerNodeIds.length > 0) {
      const ownerNodes = await prisma.treeBranchLeafNode.findMany({
        where: { id: { in: ownerNodeIds } }
      });
      for (const n of ownerNodes) {
        ownerNodesMap.set(n.id, n);
      }
    }

    // 3. Load ALL display nodes + formulas + collision data in parallel
    // PERF R9: Split variable query — lightweight global for collision checks, targeted for node reuse
    const [displayNodes, allFormulas, collisionVars] = await Promise.all([
      prisma.treeBranchLeafNode.findMany({
        where: {
          treeId: repeaterNode.treeId,
          metadata: { path: ['autoCreatedDisplayNode'], equals: true }
        }
      }),
      ownerNodeIds.length > 0 ? prisma.treeBranchLeafNodeFormula.findMany({
        where: { nodeId: { in: ownerNodeIds } }
      }) : Promise.resolve([]),
      // PERF R9: Only load id + exposedKey for collision checks (was loading 9 cols for ALL vars)
      prisma.treeBranchLeafNodeVariable.findMany({
        select: { id: true, exposedKey: true }
      })
    ]);

    // Index display nodes by fromVariableId
    for (const dn of displayNodes) {
      const meta = dn.metadata as Record<string, unknown> | null;
      if (meta?.fromVariableId && typeof meta.fromVariableId === 'string') {
        if (!displayNodesMap.has(meta.fromVariableId)) {
          displayNodesMap.set(meta.fromVariableId, dn);
        }
      }
    }

    // Index formulas by nodeId
    for (const f of allFormulas) {
      if (!formulasByNodeId.has(f.nodeId)) {
        formulasByNodeId.set(f.nodeId, []);
      }
      formulasByNodeId.get(f.nodeId)!.push(f);
    }

    // Build existing node IDs set from _preloadedTreeNodes + duplicated nodes
    allExistingNodeIds = new Set(_preloadedTreeNodes.map(n => n.id));
    for (const id of duplicatedNodeIds) allExistingNodeIds.add(id);
    for (const id of globalNodeIdMap.values()) allExistingNodeIds.add(id);

    // PERF R9: Build collision sets from lightweight query (only id + exposedKey)
    allExistingVarIds = new Set(collisionVars.map(v => v.id));
    allExistingVarKeys = new Set(collisionVars.map(v => v.exposedKey));

    // PERF R9: preloadedVarsByNodeId will be loaded after varTasks are built (targeted query)
  }

  // PERF Round 6: Process variables in PARALLEL CHUNKS of 5 instead of sequentially
  // Each variable's copyVariableWithCapacities is independent (different target nodes).
  // Shared Maps (formulaIdMap, etc.) are safe in single-threaded JS (no true concurrency).
  // formulaCopyCache already uses upsert internally, so double-copies are idempotent.
  const varTasks: Array<{ templateVariableId: string; targetNodeId: string; plannedSuffix: any }> = [];
  for (const variablePlan of plan.variables) {
    let { templateVariableId, targetNodeId, plannedSuffix } = variablePlan;
    const templateVar = templateVarsMap.get(templateVariableId);
    const isLookup = templateVar?.displayName?.includes('Lookup Table');
    if (isLookup) continue;
    const realTargetNodeId = plannedNodeIdToRealNodeId.get(targetNodeId);
    if (realTargetNodeId) {
      targetNodeId = realTargetNodeId;
    } else {
      console.warn(`[REPEAT-EXECUTOR] No mapping for targetNodeId "${targetNodeId}", using directly`);
    }
    varTasks.push({ templateVariableId, targetNodeId, plannedSuffix });
  }

  // PERF R9: Targeted query for preloadedVarsByNodeId — only target nodes instead of ALL vars
  if (varTasks.length > 0) {
    const targetNodeIds = [...new Set(varTasks.map(t => t.targetNodeId))];
    const targetVars = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: { in: targetNodeIds } },
      select: { id: true, nodeId: true, exposedKey: true, displayName: true, displayFormat: true, unit: true, precision: true, visibleToUser: true, isReadonly: true }
    });
    allVarsByNodeId = new Map(targetVars.filter(v => v.nodeId).map(v => [v.nodeId, v]));
  }

  // 🔧 Helper: build options for copyVariableWithCapacities
  const buildVarCopyOptions = (task: typeof varTasks[number]) => ({
    autoCreateDisplayNode: true,
    isFromRepeaterDuplication: true,
    nodeIdMap: globalNodeIdMap,
    formulaIdMap: globalFormulaIdMap,
    conditionIdMap: globalConditionIdMap,
    tableIdMap: globalTableIdMap,
    variableCopyCache: globalVariableCopyCache,
    preloadedOriginalVar: fullVarsMap.get(task.templateVariableId),
    preloadedOwnerNode: fullVarsMap.get(task.templateVariableId)?.nodeId ? ownerNodesMap.get(fullVarsMap.get(task.templateVariableId)!.nodeId) : undefined,
    preloadedDuplicatedOwnerNode: { id: task.targetNodeId, parentId: _preloadedTreeNodesById?.get(task.targetNodeId)?.parentId ?? null },
    preloadedDisplayNode: displayNodesMap.get(task.templateVariableId),
    preloadedFormulas: fullVarsMap.get(task.templateVariableId)?.nodeId ? formulasByNodeId.get(fullVarsMap.get(task.templateVariableId)!.nodeId) : undefined,
    existingNodeIds: allExistingNodeIds,
    existingVariableIds: allExistingVarIds,
    existingVariableKeys: allExistingVarKeys,
    preloadedVarsByNodeId: allVarsByNodeId,
    repeatContext: {
      repeaterNodeId,
      templateNodeId: task.targetNodeId.replace(`-${task.plannedSuffix}`, ''),
      duplicatedFromNodeId: task.targetNodeId.replace(`-${task.plannedSuffix}`, ''),
      scopeId,
      mode: 'repeater' as const
    }
  });

  // 🔧 Helper: aggregate result maps into global maps
  const aggregateResult = (result: any) => {
    if (!result || !result.success) return;
    if (result.formulaIdMap) {
      for (const [oldId, newId] of result.formulaIdMap.entries()) {
        globalFormulaIdMap.set(oldId, newId);
      }
    }
    if (result.conditionIdMap) {
      for (const [oldId, newId] of result.conditionIdMap.entries()) {
        globalConditionIdMap.set(oldId, newId);
      }
    }
    if (result.tableIdMap) {
      for (const [oldId, newId] of result.tableIdMap.entries()) {
        globalTableIdMap.set(oldId, newId);
      }
    }
    if (result.displayNodeId) {
      const originalDisplayNodeId = result.displayNodeId.replace(/-\d+$/, '');
      globalNodeIdMap.set(originalDisplayNodeId, result.displayNodeId);
      // 🔄 Ajouter le display node et ses enfants à duplicatedNodeIds pour le post-processing
      duplicatedNodeIds.add(result.displayNodeId);
      originalNodeIdByCopyId.set(result.displayNodeId, originalDisplayNodeId);
    }
    if (result.childDisplayNodeIds) {
      for (const childId of result.childDisplayNodeIds) {
        duplicatedNodeIds.add(childId);
        const originalChildId = childId.replace(/-\d+$/, '');
        originalNodeIdByCopyId.set(childId, originalChildId);
        globalNodeIdMap.set(originalChildId, childId);
      }
    }
  };

  const failedVarTasks: typeof varTasks = [];
  let varCopyWarnings: string[] = [];

  const VAR_CHUNK_SIZE = 5;
  for (let ci = 0; ci < varTasks.length; ci += VAR_CHUNK_SIZE) {
    const chunk = varTasks.slice(ci, ci + VAR_CHUNK_SIZE);
    const results = await Promise.all(chunk.map(async (task) => {
      try {
        const variableResult = await copyVariableWithCapacities(
          task.templateVariableId,
          task.plannedSuffix,
          task.targetNodeId,
          prisma,
          buildVarCopyOptions(task)
        );
        return { task, result: variableResult };
      } catch (varErr) {
        console.error(`[repeat-executor] Erreur copie variable ${task.templateVariableId}:`, varErr instanceof Error ? varErr.stack || varErr.message : String(varErr));
        failedVarTasks.push(task);
        return { task, result: null as any };
      }
    }));
    // Aggregate chunk results into global maps
    for (const { result } of results) {
      aggregateResult(result);
    }
  }

  // 🔁 RETRY: Retenter les variables échouées une par une (séquentiellement pour éviter les conflits)
  if (failedVarTasks.length > 0) {
    console.warn(`[repeat-executor] ${failedVarTasks.length} variable(s) échouée(s), retry séquentiel...`);
    for (const task of failedVarTasks) {
      try {
        const retryResult = await copyVariableWithCapacities(
          task.templateVariableId,
          task.plannedSuffix,
          task.targetNodeId,
          prisma,
          buildVarCopyOptions(task)
        );
        aggregateResult(retryResult);
        if (retryResult.success) {
          console.log(`[repeat-executor] ✅ Retry réussi pour variable ${task.templateVariableId}`);
        } else {
          const msg = `Variable ${task.templateVariableId} → échec retry: ${retryResult.error || 'unknown'}`;
          console.warn(`[repeat-executor] ⚠️ ${msg}`);
          varCopyWarnings.push(msg);
        }
      } catch (retryErr) {
        const msg = `Variable ${task.templateVariableId} → échec retry: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`;
        console.error(`[repeat-executor] ❌ ${msg}`);
        varCopyWarnings.push(msg);
      }
    }
  }

  const _t3 = Date.now();
  console.log(`[PERF] Variable copy loop: ${_t3 - _t2}ms`);
  try {
    await syncRepeaterTemplateIds(prisma, repeaterNodeId, templateNodeIds);
  } catch (syncErr) {
    console.warn('[repeat-executor] Unable to sync repeater template IDs', syncErr);
  }

  // Ã°Å¸Å¡Â« NOUVEAU: Isolation stricte des nÃ…â€œuds copiÃƒÂ©s et correction des capacitÃƒÂ©s
  if (duplicatedNodeIds.size > 0) {
    try {
      // 0. SKIP fixAllCompleteDuplications — REDONDANT + CASSÉ
      // deepCopyNodeInternal() copie déjà formules/conditions/tables/selectConfigs/numberConfigs.
      // fixCompleteDuplication() crash systématiquement (include manquant pour Formula/Condition).
      // Économie: ~60-80 queries DB gaspillées.
      
      const _t4 = Date.now();
      // 0.1. DUPLICATION DES TABLES ET LOOKUPS (parallélisée + pré-filtrée)
      {
        // Pré-calculer les paires (originalNodeId, copiedNodeId, suffixToken)
        const dupPairs: Array<{ originalNodeId: string; copiedNodeId: string; suffixToken: string }> = [];
        for (const nodeId of duplicatedNodeIds) {
          const originalNodeId = originalNodeIdByCopyId.get(nodeId);
          if (!originalNodeId) continue;
          const suffixToken = deriveCopySuffixToken(originalNodeId, nodeId);
          if (!suffixToken) continue;
          dupPairs.push({ originalNodeId, copiedNodeId: nodeId, suffixToken });
        }

        if (dupPairs.length > 0) {
          // Pré-filtrer: ne garder que les nœuds qui ont réellement des SelectConfigs ou table_activeId
          const originalIds = [...new Set(dupPairs.map(p => p.originalNodeId))];
          const [selectConfigCounts, nodesWithTables] = await Promise.all([
            prisma.treeBranchLeafSelectConfig.groupBy({
              by: ['nodeId'],
              where: { nodeId: { in: originalIds } },
              _count: true
            }),
            prisma.treeBranchLeafNode.findMany({
              where: { id: { in: originalIds }, table_activeId: { not: null } },
              select: { id: true }
            })
          ]);
          const hasLookupSet = new Set([
            ...selectConfigCounts.map(sc => sc.nodeId),
            ...nodesWithTables.map(n => n.id)
          ]);

          const lookupPairs = dupPairs.filter(p => hasLookupSet.has(p.originalNodeId));

          // Paralléliser par chunks de 5 pour éviter de surcharger la DB
          const CHUNK_SIZE = 5;
          for (let i = 0; i < lookupPairs.length; i += CHUNK_SIZE) {
            const chunk = lookupPairs.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(p =>
              tableLookupDuplicationService.duplicateTableLookupSystem(prisma, p.originalNodeId, {
                copiedNodeId: p.copiedNodeId,
                suffixToken: p.suffixToken
              })
            ));
          }
        }
      }

      // Ã°Å¸Â§Â­ NOUVEAU: rÃƒÂ©aligner les parents des copies quand la section dupliquÃƒÂ©e existe dÃƒÂ©jÃƒÂ 
      const _t5 = Date.now();
      console.log(`[PERF] TBL-DUP: ${_t5 - _t4}ms`);
      await reassignCopiedNodesToDuplicatedParents(prisma, duplicatedNodeIds, originalNodeIdByCopyId);
      
      // 🔒 SAFETY NET: Sync enfants manquants des display nodes copiés
      // Si le BFS dans variable-copy-engine a raté des enfants (race condition,
      // erreur partielle), on rattrape ici en comparant les enfants de chaque
      // display node copié avec ceux de l'original.
      const _t5b = Date.now();
      try {
        const syncResult = await syncMissingDisplayNodeChildren(
          prisma,
          duplicatedNodeIds,
          originalNodeIdByCopyId,
          repeaterNode.treeId
        );
        if (syncResult.created > 0) {
          console.log(`[repeat-executor] 🔒 Safety net: ${syncResult.created} enfant(s) manquant(s) créé(s)`);
          for (const id of syncResult.createdIds) {
            duplicatedNodeIds.add(id);
          }
        }
      } catch (syncErr) {
        console.warn('[repeat-executor] Safety net sync failed (non-blocking):', (syncErr as Error).message);
      }
      console.log(`[PERF] DisplayNodeChildSync: ${Date.now() - _t5b}ms`);

      // 1-5+7. BATCH: isolation + reset + calcul indep + triggers + block fallback
      // (remplace 5 services individuels: ~560 queries → ~71 queries)
      const _t6 = Date.now();
      const batchResult = await batchPostDuplicationProcessing(
        prisma,
        Array.from(duplicatedNodeIds)
      );
      
      // 6. SKIP forceAllNodesRecalculationWithOwnData — CASSÉ + REDONDANT
      // Bug: include manquant (TreeBranchLeafNodeFormula, TreeBranchLeafNodeCondition)
      // → les boucles de re-patch formules/conditions ne s'exécutent jamais
      // → la seule action réelle (reset calculatedValue) est déjà faite par batchPostDuplicationProcessing
      // Économie: ~58 queries DB gaspillées (2 × 29 nœuds)
      
      
      // Ã°Å¸Å¡â‚¬ 8. RECALCULER LES VRAIES VALEURS AVEC OPERATION INTERPRETER
      const _t7 = Date.now();
      console.log(`[PERF] batchPostDup: ${_t7 - _t6}ms`);
      const interpreterRecalcReport = await recalculateAllCopiedNodesWithOperationInterpreter(
        prisma,
        repeaterNodeId,
        '-1',
        Array.from(duplicatedNodeIds)
      );
      const _t8 = Date.now();
      console.log(`[PERF] Recalculate interpreter: ${_t8 - _t7}ms`);
      console.log(`[PERF] === TOTAL: ${_t8 - _t0}ms === | Templates: ${_t2-_t1}ms | Variables: ${_t3-_t2}ms | TBL-DUP: ${_t5-_t4}ms | BatchPost: ${_t7-_t6}ms | Recalc: ${_t8-_t7}ms`);
      interpreterRecalcReport.recalculated.forEach(r => {
        if (r.hasCapacity && r.newValue) {
        }
      });
      
    } catch (isolationError) {
      const errMsg = `Erreur post-duplication: ${isolationError instanceof Error ? isolationError.message : String(isolationError)}`;
      console.warn('[REPEAT-EXECUTOR]', errMsg, isolationError instanceof Error ? isolationError.stack : '');
      varCopyWarnings.push(errMsg);
    }
  }

  let nodesPayload: Record<string, unknown>[] = [];
  if (duplicatedNodeIds.size > 0) {
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        treeId: repeaterNode.treeId,
        id: { in: Array.from(duplicatedNodeIds) }
      }
    });
    nodesPayload = nodes.map(buildResponseFromColumns);
  }

  if (varCopyWarnings.length > 0) {
    console.warn(`[repeat-executor] ⚠️ ${varCopyWarnings.length} avertissement(s) durant la copie:`, varCopyWarnings);
  }

  return {
    duplicated: duplicatedSummaries,
    nodes: nodesPayload,
    count: duplicatedSummaries.length,
    ...(varCopyWarnings.length > 0 ? { warnings: varCopyWarnings } : {}),
    debug: {
      templateNodeIds,
      nodesToDuplicateIds: nodesToDuplicate.map(n => n.id),
      sectionIds: sectionNodes.map(n => n.id),
      templateCount: templateNodeIds.length,
      nodesToDuplicateCount: nodesToDuplicate.length,
      sectionCount: sectionNodes.length,
      // 🎯 INFOS TRIGGERS POUR DEBUG FRONTEND
      triggersFix: triggersFixDebug
    }
  };
}

async function loadTemplateNodesWithFallback(
  prisma: PrismaClient,
  templateNodeIds: string[],
  repeaterTreeId: string,
  organizationId?: string | null,
  isSuperAdmin?: boolean
) {
  if (!templateNodeIds.length) {
    throw new RepeatOperationError('Repeater does not declare template nodes to duplicate.', 422);
  }

  // 1) Charger les templates prÃƒÂ©sents dans l'arbre du rÃƒÂ©pÃƒÂ©teur
  const scoped = await prisma.treeBranchLeafNode.findMany({
    where: {
      id: { in: templateNodeIds },
      treeId: repeaterTreeId
    }
  });

  // 2) DÃƒÂ©terminer les IDs manquants et tenter un fallback dans la librairie
  const foundIds = new Set(scoped.map(n => n.id));
  const missingIds = templateNodeIds.filter(id => !foundIds.has(id));

  let crossTree: Array<{ id: string; TreeBranchLeafTree?: { organizationId: string | null } } & Record<string, unknown>> = [];
  if (missingIds.length) {
    crossTree = await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: missingIds } },
      include: {
        TreeBranchLeafTree: { select: { organizationId: true } }
      }
    });

    if (!crossTree.length) {
      // Aucun des IDs manquants n'a pu ÃƒÂªtre chargÃƒÂ©
      if (!scoped.length) {
        throw new RepeatOperationError('No template nodes could be loaded for this repeater.', 404);
      }
    }

    // VÃƒÂ©rifier l'accÃƒÂ¨s organisationnel pour les templates hors-arbre
    if (!isSuperAdmin && organizationId) {
      const unauthorized = crossTree.find(
        node => node.TreeBranchLeafTree?.organizationId && node.TreeBranchLeafTree.organizationId !== organizationId
      );
      if (unauthorized) {
        throw new RepeatOperationError('Access denied to template library for this repeater.', 403);
      }
    }
  }

  // 3) Fusionner les rÃƒÂ©sultats (scoped + crossTree) et normaliser la forme
  const merged = [
    ...scoped,
    ...crossTree.map(({ TreeBranchLeafTree, ...rest }) => rest)
  ];

  if (!merged.length) {
    throw new RepeatOperationError('No template nodes could be loaded for this repeater.', 404);
  }

  return merged;
}

function coerceSuffix(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function extractSuffixFromId(id: string | null | undefined): number | null {
  if (!id) return null;
  const match = /-(\d+)$/.exec(id);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function deriveCopySuffixToken(originalNodeId: string, copiedNodeId: string): string | null {
  const baseId = normalizeNodeBase(originalNodeId);
  if (!copiedNodeId.startsWith(baseId)) {
    return null;
  }
  const remainder = copiedNodeId.slice(baseId.length);
  if (!remainder.startsWith('-') || remainder.length <= 1) {
    return null;
  }
  return remainder;
}

function normalizeNodeBase(value: string): string {
  return value.replace(/-\d+(?:-\d+)*$/, '');
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function reassignCopiedNodesToDuplicatedParents(
  prisma: PrismaClient,
  copiedNodeIds: Set<string>,
  originalNodeIdByCopyId: Map<string, string>
): Promise<void> {
  if (!copiedNodeIds.size) {
    return;
  }

  const copyIds = Array.from(copiedNodeIds);
  const copies = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: copyIds } },
    select: {
      id: true,
      parentId: true,
      metadata: true
    }
  });

  if (!copies.length) {
    return;
  }

  const originalIds = Array.from(
    new Set(
      copies
        .map(copy => originalNodeIdByCopyId.get(copy.id) ?? getOriginalNodeIdFromMetadata(copy.metadata))
        .filter((value): value is string => Boolean(value))
    )
  );

  if (!originalIds.length) {
    return;
  }

  const originalNodes = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: originalIds } },
    select: { id: true, parentId: true }
  });
  const originalParentMap = new Map(originalNodes.map(node => [node.id, node.parentId] as const));

  const parentIdsToCheck = new Set<string>();
  const reassignmentTargets: Array<{ nodeId: string; targetParentId: string }> = [];

  for (const copy of copies) {
    const originalId = originalNodeIdByCopyId.get(copy.id) ?? getOriginalNodeIdFromMetadata(copy.metadata);
    if (!originalId) {
      continue;
    }
    const originalParentId = originalParentMap.get(originalId);
    if (!originalParentId) {
      continue;
    }
    const suffixToken = getCopySuffixToken(copy.id, copy.metadata);
    if (!suffixToken) {
      continue;
    }
    const sanitizedSuffix = sanitizeSuffixToken(suffixToken);
    if (!sanitizedSuffix) {
      continue;
    }
    const parentBaseId = normalizeNodeBase(originalParentId);
    if (!parentBaseId) {
      continue;
    }
    const desiredParentId = `${parentBaseId}-${sanitizedSuffix}`;
    if (!desiredParentId || desiredParentId === copy.parentId) {
      continue;
    }
    parentIdsToCheck.add(desiredParentId);
    reassignmentTargets.push({ nodeId: copy.id, targetParentId: desiredParentId });
  }

  if (!reassignmentTargets.length) {
    return;
  }

  const existingParents = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: Array.from(parentIdsToCheck) } },
    select: { id: true }
  });
  const existingParentIds = new Set(existingParents.map(parent => parent.id));

  const updates: Prisma.PrismaPromise<unknown>[] = [];
  for (const target of reassignmentTargets) {
    if (!existingParentIds.has(target.targetParentId)) {
      continue;
    }
    updates.push(
      prisma.treeBranchLeafNode.update({
        where: { id: target.nodeId },
        data: { parentId: target.targetParentId }
      })
    );
  }

  if (!updates.length) {
    return;
  }

  await prisma.$transaction(updates);
}

function getCopySuffixToken(nodeId: string, metadata: Prisma.JsonValue | null | undefined): string | null {
  const normalizedMetadata = normalizeMetadata(metadata);
  const rawSuffix = normalizedMetadata?.copySuffix;
  if (typeof rawSuffix === 'number' && Number.isFinite(rawSuffix)) {
    return String(rawSuffix);
  }
  if (typeof rawSuffix === 'string' && rawSuffix.trim()) {
    return rawSuffix.trim();
  }
  const parsed = extractSuffixFromId(nodeId);
  return parsed !== null ? String(parsed) : null;
}

function getOriginalNodeIdFromMetadata(metadata: Prisma.JsonValue | null | undefined): string | null {
  const normalizedMetadata = normalizeMetadata(metadata);
  if (!normalizedMetadata) {
    return null;
  }
  const candidates = ['copiedFromNodeId', 'duplicatedFromNodeId', 'sourceTemplateId'];
  for (const key of candidates) {
    const value = normalizedMetadata[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function sanitizeSuffixToken(token: string): string {
  return token.replace(/^[-_]+/, '').trim();
}

function normalizeMetadata(metadata: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
}

/**
 * 🔒 SAFETY NET: Synchronise les enfants manquants des display nodes copiés.
 * 
 * Après la copie de variables (variable-copy-engine), certains display nodes
 * copiés (ex: "PV achat-2") peuvent avoir des enfants manquants à cause de :
 * - Race conditions entre copies parallèles
 * - Erreurs transitoires lors du BFS original
 * - Interruptions partielles
 * 
 * Cette fonction compare les enfants de chaque display node copié avec ceux
 * de l'original et crée les manquants.
 */
async function syncMissingDisplayNodeChildren(
  prisma: PrismaClient,
  duplicatedNodeIds: Set<string>,
  originalNodeIdByCopyId: Map<string, string>,
  treeId: string
): Promise<{ created: number; createdIds: string[] }> {
  const createdIds: string[] = [];
  
  if (!duplicatedNodeIds.size) return { created: 0, createdIds };

  // 1. Trouver les display nodes parmi les nœuds dupliqués
  const dupIds = Array.from(duplicatedNodeIds);
  const dupNodes = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: dupIds } },
    select: { id: true, parentId: true, metadata: true, treeId: true }
  });

  const displayNodes = dupNodes.filter(n => {
    const meta = normalizeMetadata(n.metadata);
    return meta?.autoCreatedDisplayNode === true;
  });

  if (!displayNodes.length) return { created: 0, createdIds };

  // 2. Pour chaque display node, trouver l'original et comparer les enfants
  for (const displayNode of displayNodes) {
    const originalId = originalNodeIdByCopyId.get(displayNode.id);
    if (!originalId) continue;

    // Dériver le suffixe: ex: "uuid-2" → "-2"
    const suffixToken = deriveCopySuffixToken(originalId, displayNode.id);
    if (!suffixToken) continue;

    // Charger les enfants de l'original
    const originalChildren = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: originalId },
      orderBy: { order: 'asc' }
    });

    if (!originalChildren.length) continue;

    // Charger les enfants existants du display node copié
    const existingChildren = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: displayNode.id },
      select: { id: true }
    });
    const existingChildIds = new Set(existingChildren.map(c => c.id));

    // 3. Pour chaque enfant de l'original, vérifier si la copie suffixée existe
    for (const origChild of originalChildren) {
      // Construire l'ID attendu de l'enfant copié
      const childBaseId = origChild.id.replace(/(-\d+)+\s*$/, '');
      const expectedChildId = `${childBaseId}${suffixToken}`;

      if (existingChildIds.has(expectedChildId)) continue;

      // Vérifier aussi par existence directe en DB (au cas où parentId serait incorrect)
      const alreadyExists = await prisma.treeBranchLeafNode.findUnique({
        where: { id: expectedChildId },
        select: { id: true }
      });
      if (alreadyExists) {
        // Le nœud existe mais sous un autre parent — corriger le parent
        if (alreadyExists.id) {
          await prisma.treeBranchLeafNode.update({
            where: { id: expectedChildId },
            data: { parentId: displayNode.id }
          }).catch(() => {});
        }
        continue;
      }

      // 4. Créer l'enfant manquant
      try {
        const now = new Date();
        const childMeta: Record<string, unknown> = {};
        if (origChild.metadata && typeof origChild.metadata === 'object' && !Array.isArray(origChild.metadata)) {
          Object.assign(childMeta, origChild.metadata);
        }
        childMeta.autoCreatedDisplayNode = true;
        childMeta.duplicatedFromRepeater = true;
        childMeta.createdBySafetyNet = true;

        // Suffixer le label
        const origLabel = origChild.label || '';
        const labelBase = origLabel.replace(/(-\d+)+\s*$/, '');
        const childLabel = `${labelBase}${suffixToken}`;

        await prisma.treeBranchLeafNode.create({
          data: {
            id: expectedChildId,
            treeId,
            parentId: displayNode.id,
            type: origChild.type,
            subType: origChild.subType,
            label: childLabel,
            description: origChild.description,
            value: null,
            order: origChild.order,
            isRequired: origChild.isRequired,
            isVisible: origChild.isVisible,
            isActive: origChild.isActive,
            hasFormula: origChild.hasFormula,
            hasCondition: origChild.hasCondition,
            hasData: origChild.hasData,
            hasTable: origChild.hasTable,
            hasAPI: origChild.hasAPI ?? false,
            hasLink: origChild.hasLink ?? false,
            hasMarkers: origChild.hasMarkers ?? false,
            metadata: childMeta as any,
            calculatedValue: null,
            fieldType: origChild.fieldType,
            fieldSubType: origChild.fieldSubType as any,
            field_label: childLabel as any,
            subtab: origChild.subtab as any,
            subtabs: origChild.subtabs as any,
            formula_tokens: origChild.formula_tokens as any,
            data_displayFormat: origChild.data_displayFormat,
            data_exposedKey: origChild.data_exposedKey,
            data_precision: origChild.data_precision,
            data_unit: origChild.data_unit,
            data_visibleToUser: origChild.data_visibleToUser ?? false,
            appearance_size: origChild.appearance_size ?? 'md',
            appearance_variant: origChild.appearance_variant,
            appearance_width: origChild.appearance_width,
            appearance_displayIcon: origChild.appearance_displayIcon,
            linkedFormulaIds: [],
            linkedConditionIds: [],
            linkedVariableIds: [],
            linkedTableIds: [],
            updatedAt: now,
          } as any
        });

        createdIds.push(expectedChildId);
        console.log(`[repeat-executor] 🔒 Enfant manquant créé: ${origChild.label} → ${expectedChildId} (parent: ${displayNode.id})`);

        // 5. Copier aussi la variable de l'enfant original si elle existe
        const origChildVar = await prisma.treeBranchLeafNodeVariable.findUnique({
          where: { nodeId: origChild.id }
        });
        if (origChildVar) {
          const childVarBaseId = origChildVar.id.replace(/(-\d+)+\s*$/, '');
          const newChildVarId = `${childVarBaseId}${suffixToken}`;
          const childKeyBase = origChildVar.exposedKey.replace(/(-\d+)+\s*$/, '');
          const newChildKey = `${childKeyBase}${suffixToken}`;

          await prisma.treeBranchLeafNodeVariable.upsert({
            where: { id: newChildVarId },
            update: { nodeId: expectedChildId, updatedAt: now },
            create: {
              id: newChildVarId,
              nodeId: expectedChildId,
              displayName: `${(origChildVar.displayName || '').replace(/(-\d+)+\s*$/, '')}${suffixToken}`,
              exposedKey: newChildKey,
              sourceRef: origChildVar.sourceRef,
              sourceType: origChildVar.sourceType,
              displayFormat: origChildVar.displayFormat,
              unit: origChildVar.unit,
              precision: origChildVar.precision,
              visibleToUser: origChildVar.visibleToUser,
              isReadonly: origChildVar.isReadonly,
              defaultValue: origChildVar.defaultValue,
              fixedValue: origChildVar.fixedValue,
              metadata: origChildVar.metadata as any,
              updatedAt: now,
            }
          });

          await prisma.treeBranchLeafNode.update({
            where: { id: expectedChildId },
            data: {
              hasData: true,
              data_activeId: newChildVarId,
              data_exposedKey: newChildKey,
              data_displayFormat: origChildVar.displayFormat,
              data_precision: origChildVar.precision,
              data_unit: origChildVar.unit,
              data_visibleToUser: origChildVar.visibleToUser,
              linkedVariableIds: [newChildVarId],
            }
          });
        }

        // 6. Copier les formules de l'enfant original
        const origChildFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
          where: { nodeId: origChild.id }
        });
        const copiedFormulaIds: string[] = [];
        for (const f of origChildFormulas) {
          const formulaBaseId = f.id.replace(/(-\d+)+\s*$/, '');
          const newFormulaId = `${formulaBaseId}${suffixToken}`;
          const formulaIdShort = f.id.substring(0, 8);
          const uniqueName = f.name
            ? `${f.name}-${formulaIdShort}${suffixToken}`
            : `formula-${formulaIdShort}${suffixToken}`;
          try {
            await prisma.treeBranchLeafNodeFormula.upsert({
              where: { id: newFormulaId },
              update: { nodeId: expectedChildId, updatedAt: new Date() },
              create: {
                id: newFormulaId,
                nodeId: expectedChildId,
                organizationId: f.organizationId,
                name: uniqueName,
                description: f.description,
                tokens: f.tokens,
                targetProperty: f.targetProperty,
                constraintMessage: f.constraintMessage,
                isDefault: f.isDefault,
                order: f.order,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
            });
            copiedFormulaIds.push(newFormulaId);
          } catch (fErr) {
            console.warn(`[repeat-executor] Safety net: erreur copie formule ${f.id}:`, (fErr as Error).message);
          }
        }
        if (copiedFormulaIds.length > 0) {
          await prisma.treeBranchLeafNode.update({
            where: { id: expectedChildId },
            data: {
              hasFormula: true,
              linkedFormulaIds: copiedFormulaIds,
              formula_activeId: copiedFormulaIds[0],
            }
          });
        }
      } catch (createErr) {
        if (isUniqueConstraintError(createErr)) {
          // Déjà créé par un processus concurrent — OK
        } else {
          console.warn(`[repeat-executor] Safety net: erreur création enfant ${expectedChildId}:`, (createErr as Error).message);
        }
      }
    }
  }

  return { created: createdIds.length, createdIds };
}
