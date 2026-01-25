import { Prisma, type PrismaClient } from '@prisma/client';
import { copySelectorTablesAfterNodeCopy } from '../copy-selector-tables.js';
import { applySharedReferencesFromOriginalInternal } from '../../shared/shared-reference-helpers.js';
import { deepCopyNodeInternal, type DeepCopyOptions, type DeepCopyResult } from './services/deep-copy-service.js';
import { buildResponseFromColumns, getAuthCtx, type MinimalReq } from './services/shared-helpers.js';
import { RepeatOperationError, type RepeatExecutionResult } from './repeat-service.js';
import { computeTemplateCopySuffixMax } from './utils/suffix-utils.js';
import { resetCalculatedValuesAfterCopy } from './services/recalculate-values-service.js';
import { diagnoseCopyProblems, fixCopyProblems } from './services/copy-diagnostic-service.js';
import { enforceStrictIsolation, verifyIsolation } from './services/strict-isolation-service.js';
import { forceIndependentCalculation, createRecalculationTriggers } from './services/force-independent-calculation.js';
import { fixAllMissingCapacities } from './services/capacity-copy-service.js';
import { fixAllCompleteDuplications } from './services/complete-duplication-fix.js';
import { forceAllNodesRecalculationWithOwnData, blockFallbackToOriginalValues } from './services/force-recalculation-service.js';
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
  
  // Ã°Å¸â€Â§ MAP: Associer les IDs supposÃƒÂ©s du plan aux vrais IDs crÃƒÂ©ÃƒÂ©s
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
  for (const template of nodesToDuplicate) {
    try {
      if (!template) continue;

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
          repeatContext: context
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

      const created = await prisma.treeBranchLeafNode.findUnique({
        where: { id: newRootId }
      });

      if (!created) {
        throw new RepeatOperationError(`Node copy failed to materialize for template ${template.id}.`, 500);
      }

      const createdMetadata = (created.metadata && typeof created.metadata === 'object')
        ? (created.metadata as Record<string, unknown>)
        : {};

      const resolvedSuffix =
        coerceSuffix(createdMetadata.copySuffix) ??
        extractSuffixFromId(created.id) ??
        appliedSuffix ??
        null;
      const effectiveSuffix = resolvedSuffix ?? plannedSuffix ?? 1;


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
        ...(createdMetadata.lookup ? { lookup: createdMetadata.lookup } : {})
      };

      await prisma.treeBranchLeafNode.update({
        where: { id: newRootId },
        data: {
          metadata: updatedMetadata
        }
      });

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
      throw nodeExecErr;
    }
  }

  // Ã°Å¸Å¡â‚¬ COPIER LES VARIABLES APRÃƒË†S LES NÃ…â€™UDS
  
  for (const variablePlan of plan.variables) {
    try {
      let { templateVariableId, targetNodeId, plannedVariableId, plannedSuffix } = variablePlan;
      
      // Ã¢Å¡Â Ã¯Â¸Â BLOQUAGE: VÃƒÂ©rifier si c'est une variable lookup (pour ÃƒÂ©viter de crÃƒÂ©er des champs inutiles)
      const templateVar = await prisma.treeBranchLeafNodeVariable.findUnique({
        where: { id: templateVariableId },
        select: { displayName: true }
      });
      
      
      // VÃƒÂ©rifier si c'est une variable lookup
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

  try {
    await syncRepeaterTemplateIds(prisma, repeaterNodeId, templateNodeIds);
  } catch (syncErr) {
    console.warn('[repeat-executor] Unable to sync repeater template IDs', syncErr);
  }

  // Ã°Å¸Å¡Â« NOUVEAU: Isolation stricte des nÃ…â€œuds copiÃƒÂ©s et correction des capacitÃƒÂ©s
  if (duplicatedNodeIds.size > 0) {
    try {
      // 0. CORRECTION COMPLÃƒË†TE DE TOUTES LES DUPLICATIONS  
      const completeDuplicationReport = await fixAllCompleteDuplications(prisma, repeaterNodeId);
      
      // 0.1. DUPLICATION COMPLÃƒË†TE DES TABLES ET LOOKUPS
      for (const nodeId of duplicatedNodeIds) {
        const originalNodeId = originalNodeIdByCopyId.get(nodeId);
        if (!originalNodeId) continue;
        const suffixToken = deriveCopySuffixToken(originalNodeId, nodeId);
        if (!suffixToken) continue;
        await tableLookupDuplicationService.duplicateTableLookupSystem(prisma, originalNodeId, {
          copiedNodeId: nodeId,
          suffixToken
        });
      }

      // Ã°Å¸Â§Â­ NOUVEAU: rÃƒÂ©aligner les parents des copies quand la section dupliquÃƒÂ©e existe dÃƒÂ©jÃƒÂ 
      await reassignCopiedNodesToDuplicatedParents(prisma, duplicatedNodeIds, originalNodeIdByCopyId);
      
      // 1. Forcer l'isolation complÃƒÂ¨te
      const isolationResult = await enforceStrictIsolation(
        prisma,
        Array.from(duplicatedNodeIds)
      );
      
      
      // 2. VÃƒÂ©rification de l'isolation
      await verifyIsolation(prisma, Array.from(duplicatedNodeIds));
      
      // 3. Reset final des valeurs calculÃƒÂ©es
      const resetCount = await resetCalculatedValuesAfterCopy(
        prisma,
        Array.from(duplicatedNodeIds)
      );
      
      // 4. ForÃƒÂ§age des calculs indÃƒÂ©pendants
      await forceIndependentCalculation(prisma, Array.from(duplicatedNodeIds));
      
      // 5. CrÃƒÂ©ation des triggers de recalcul pour le frontend
      await createRecalculationTriggers(prisma, Array.from(duplicatedNodeIds));
      
      // 6. FORCER LE RECALCUL AVEC LES PROPRES DONNÃƒâ€°ES
      const forceRecalcReport = await forceAllNodesRecalculationWithOwnData(prisma, repeaterNodeId);
      
      // 7. BLOQUER DÃƒâ€°FINITIVEMENT LE FALLBACK
      await blockFallbackToOriginalValues(prisma, Array.from(duplicatedNodeIds));
      
      
      // Ã°Å¸Å¡â‚¬ 8. RECALCULER LES VRAIES VALEURS AVEC OPERATION INTERPRETER
      const interpreterRecalcReport = await recalculateAllCopiedNodesWithOperationInterpreter(
        prisma,
        repeaterNodeId,
        '-1'
      );
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
      sectionCount: sectionNodes.length
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
