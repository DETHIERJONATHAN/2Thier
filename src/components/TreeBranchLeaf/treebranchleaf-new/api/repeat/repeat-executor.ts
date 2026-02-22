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

      // 🎯 CRITIQUE: template contient déjà subType et metadata (chargé par loadTemplateNodesWithFallback)
      // Pas besoin de findUnique supplémentaire

      const created = await prisma.treeBranchLeafNode.findUnique({
        where: { id: newRootId }
      });

      if (!created) {
        throw new RepeatOperationError(`Node copy failed to materialize for template ${template.id}.`, 500);
      }
      
      // 🎯 FIX: Récupérer les triggerNodeIds de l'ORIGINAL, pas de la copie
      const originalMetadata = (template.metadata && typeof template.metadata === 'object')
        ? (template.metadata as Record<string, unknown>)
        : {};
      const originalTriggerNodeIds = originalMetadata.triggerNodeIds;
      


      const createdMetadata = (created.metadata && typeof created.metadata === 'object')
        ? (created.metadata as Record<string, unknown>)
        : {};

      const resolvedSuffix =
        coerceSuffix(createdMetadata.copySuffix) ??
        extractSuffixFromId(created.id) ??
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
      const rootSuffixedTriggers = suffixTriggers(originalTriggerNodeIds, created.label || 'root');

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
      
      
      // 🎯 DEBUG FRONTEND: Collecter les infos pour affichage dans console navigateur
      triggersFixDebug.push({
        nodeId: newRootId,
        label: created.label || 'root',
        originalSubType: template.subType || null,
        appliedSubType: template.subType || null,
        originalTriggers: originalTriggerNodeIds,
        suffixedTriggers: rootSuffixedTriggers
      });
      
      // 🔴🔴🔴 DEBUG: Voir tous les IDs de l'idMap
      const allIdMapEntries = Object.entries(copyResult.idMap || {}).map(([oldId, newId]) => ({
        oldId,
        newId,
      }));
      triggersFixDebug.push({
        nodeId: 'DEBUG_IDMAP',
        label: `TOTAL ${allIdMapEntries.length} entrées dans idMap`,
        allIds: allIdMapEntries,
        lookingFor: 'd371c32e-f69e-46b0-9846-f3f60f7b4ec8'
      });

      // 🎯🎯🎯 NOUVEAU: TRAITER TOUS LES NŒUDS ENFANTS (sections, champs, etc.)
      // Les champs dans des sections peuvent aussi avoir des triggers qui doivent être suffixés
      if (copyResult.idMap && Object.keys(copyResult.idMap).length > 0) {
        const childNodeIds = Object.values(copyResult.idMap).filter(id => id !== newRootId);
        
        // 🚀 BATCH: Construire le mapping inversé et charger TOUS les originaux + copies en 2 findMany
        const reverseIdMap = new Map<string, string>();
        for (const [oldId, newId] of Object.entries(copyResult.idMap)) {
          if (newId !== newRootId) {
            reverseIdMap.set(newId, oldId);
          }
        }
        const originalChildIds = Array.from(reverseIdMap.values());
        
        const [originalChildren, copiedChildren] = await Promise.all([
          prisma.treeBranchLeafNode.findMany({
            where: { id: { in: originalChildIds } },
            select: { id: true, label: true, metadata: true, subType: true }
          }),
          prisma.treeBranchLeafNode.findMany({
            where: { id: { in: childNodeIds } },
            select: { id: true, label: true, metadata: true, subType: true }
          })
        ]);
        
        const originalChildMap = new Map(originalChildren.map(n => [n.id, n]));
        const copiedChildMap = new Map(copiedChildren.map(n => [n.id, n]));
        
        // PERF: Batch child trigger updates — collect in memory, execute in single $transaction
        const childUpdateOps = [];
        for (const childId of childNodeIds) {
          try {
            const originalChildId = reverseIdMap.get(childId);
            const originalChildNode = originalChildId ? originalChildMap.get(originalChildId) ?? null : null;
            const childNode = copiedChildMap.get(childId);
            
            if (!childNode) continue;
            
            const childMetadata = (childNode.metadata && typeof childNode.metadata === 'object')
              ? (childNode.metadata as Record<string, unknown>)
              : {};
            
            const originalChildMetadata = (originalChildNode?.metadata && typeof originalChildNode.metadata === 'object')
              ? (originalChildNode.metadata as Record<string, unknown>)
              : {};
            const originalChildTriggers = originalChildMetadata.triggerNodeIds;
            
            const childSuffixedTriggers = suffixTriggers(
              originalChildTriggers, 
              childNode.label || childId
            );
            
            const needsSubTypeUpdate = originalChildNode?.subType && !childNode.subType;
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
                    ...(needsSubTypeUpdate ? { subType: originalChildNode?.subType } : {}),
                    metadata: updatedChildMetadata
                  }
                })
              );
            }
          } catch (childErr) {
            console.error(`[REPEAT-EXECUTOR] Erreur traitement triggers pour enfant ${childId}:`, childErr);
          }
        }
        // Execute all child updates in a single $transaction (1 round-trip instead of N)
        if (childUpdateOps.length > 0) {
          await prisma.$transaction(childUpdateOps);
        }
      }

      duplicatedSummaries.push({
        id: created.id,
        label: created.label,
        type: created.type,
        parentId: created.parentId,
        sourceTemplateId: template.id
      });


      duplicatedNodeIds.add(created.id);
      originalNodeIdByCopyId.set(created.id, template.id);
      
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

    // 3. Load ALL display nodes + formulas + existing variables in parallel
    const [displayNodes, allFormulas, existingVars] = await Promise.all([
      prisma.treeBranchLeafNode.findMany({
        where: {
          treeId: repeaterNode.treeId,
          metadata: { path: ['autoCreatedDisplayNode'], equals: true }
        }
      }),
      ownerNodeIds.length > 0 ? prisma.treeBranchLeafNodeFormula.findMany({
        where: { nodeId: { in: ownerNodeIds } }
      }) : Promise.resolve([]),
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

    // Build existing variable sets for collision checks
    allExistingVarIds = new Set(existingVars.map(v => v.id));
    allExistingVarKeys = new Set(existingVars.map(v => v.exposedKey));
  }

  for (const variablePlan of plan.variables) {
    try {
      let { templateVariableId, targetNodeId, plannedVariableId, plannedSuffix } = variablePlan;
      
      // PERF: Lookup en mémoire au lieu de findUnique par variable
      const templateVar = templateVarsMap.get(templateVariableId);
      const isLookup = templateVar?.displayName?.includes('Lookup Table');
      
      if (isLookup) {
        continue;
      }
      
      
      // Ã°Å¸â€Â§ CORRECTION: Utiliser le vrai ID du nÃ…â€œud crÃƒÂ©ÃƒÂ© si disponible
      const realTargetNodeId = plannedNodeIdToRealNodeId.get(targetNodeId);
      if (realTargetNodeId) {
        targetNodeId = realTargetNodeId;
      } else {
        console.warn(`Ã¢Å¡Â Ã¯Â¸Â  [REPEAT-EXECUTOR] Aucun mapping trouvÃƒÂ© pour targetNodeId "${targetNodeId}", utilisation directe`);
      }
      
      
      
      const variableResult = await copyVariableWithCapacities(
        templateVariableId,
        plannedSuffix,
        targetNodeId,
        prisma,
        {
          autoCreateDisplayNode: true,
          isFromRepeaterDuplication: true,
          // Ã°Å¸â€Â¥ PASSER LES MAPS GLOBALES pour que les capacitÃƒÂ©s utilisent les bons IDs
          nodeIdMap: globalNodeIdMap,
          formulaIdMap: globalFormulaIdMap,
          conditionIdMap: globalConditionIdMap,
          tableIdMap: globalTableIdMap,
          variableCopyCache: globalVariableCopyCache,
          // PERF: Pre-loaded data to skip per-variable DB queries
          preloadedOriginalVar: fullVarsMap.get(templateVariableId),
          preloadedOwnerNode: fullVarsMap.get(templateVariableId)?.nodeId ? ownerNodesMap.get(fullVarsMap.get(templateVariableId)!.nodeId) : undefined,
          preloadedDuplicatedOwnerNode: { id: targetNodeId, parentId: _preloadedTreeNodesById?.get(targetNodeId)?.parentId ?? null },
          preloadedDisplayNode: displayNodesMap.get(templateVariableId) ?? null,
          preloadedFormulas: fullVarsMap.get(templateVariableId)?.nodeId ? formulasByNodeId.get(fullVarsMap.get(templateVariableId)!.nodeId) : undefined,
          existingNodeIds: allExistingNodeIds,
          existingVariableIds: allExistingVarIds,
          existingVariableKeys: allExistingVarKeys,
          repeatContext: {
            repeaterNodeId,
            templateNodeId: targetNodeId.replace(`-${plannedSuffix}`, ''),
            duplicatedFromNodeId: targetNodeId.replace(`-${plannedSuffix}`, ''),
            scopeId,
            mode: 'repeater'
          }
        }
      );
      
      
      // Ã¯Â¿Â½ AGRÃƒâ€°GER LES MAPS retournÃƒÂ©es par copyVariableWithCapacities dans les maps globales
      if (variableResult.success) {
        // Ajouter les formules copiÃƒÂ©es
        if (variableResult.formulaIdMap) {
          for (const [oldId, newId] of variableResult.formulaIdMap.entries()) {
            globalFormulaIdMap.set(oldId, newId);
          }
        }
        
        // Ajouter les conditions copiÃƒÂ©es
        if (variableResult.conditionIdMap) {
          for (const [oldId, newId] of variableResult.conditionIdMap.entries()) {
            globalConditionIdMap.set(oldId, newId);
          }
        }
        
        // Ajouter les tables copiÃƒÂ©es
        if (variableResult.tableIdMap) {
          for (const [oldId, newId] of variableResult.tableIdMap.entries()) {
            globalTableIdMap.set(oldId, newId);
          }
        }
      }
      
      // Ã°Å¸Å¸Â¢ ENREGISTRER le displayNode crÃƒÂ©ÃƒÂ© dans la map globale
      if (variableResult.success && variableResult.displayNodeId) {
        // DÃƒÂ©terminer l'ID original du displayNode (sans suffixe)
        const originalDisplayNodeId = variableResult.displayNodeId.replace(/-\d+$/, '');
        globalNodeIdMap.set(originalDisplayNodeId, variableResult.displayNodeId);
      }
    } catch (varErr) {
      console.error(`[repeat-executor] Erreur lors de la copie de la variable ${variablePlan.templateVariableId}:`, varErr instanceof Error ? varErr.message : String(varErr));
      // Ne pas bloquer - continuer avec les autres variables
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
      console.warn('[REPEAT-EXECUTOR] Erreur lors de l\'isolation stricte:', isolationError);
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

  return {
    duplicated: duplicatedSummaries,
    nodes: nodesPayload,
    count: duplicatedSummaries.length,
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
