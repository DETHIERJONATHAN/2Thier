import { Prisma, type PrismaClient } from '@prisma/client';
import { copySelectorTablesAfterNodeCopy } from '../copy-selector-tables.js';
import { applySharedReferencesFromOriginalInternal } from '../../shared/shared-reference-helpers.js';
import { deepCopyNodeInternal, type DeepCopyOptions, type DeepCopyResult } from './services/deep-copy-service.js';
import { buildResponseFromColumns, getAuthCtx, type MinimalReq } from './services/shared-helpers.js';
import { RepeatOperationError, type RepeatExecutionResult } from './repeat-service.js';
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
}

export async function runRepeatExecution(
  prisma: PrismaClient,
  req: MinimalReq,
  execution: RepeatExecutionResult
): Promise<RepeatExecutionSummary> {
  console.log(`🚀🚀🚀 [REPEAT-EXECUTOR] *** NOUVEAU REPEAT-EXECUTOR EN MARCHE *** Début duplication`);
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

  const templateNodeIds = plan.nodes.length
    ? Array.from(new Set(plan.nodes.map(nodePlan => nodePlan.templateNodeId)))
    : blueprint.templateNodeIds;

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

  // ⚠️ FILTRE CRITIQUE: Les sections ne doivent PAS être dupliquées
  // Seuls les nœuds enfants (leaf_field, etc.) doivent être copiés
  const nodesToDuplicate = templateNodes.filter(node => node.type !== 'section');
  const sectionNodes = templateNodes.filter(node => node.type === 'section');

  console.log(`\n📦 [REPEAT-EXECUTOR] Template analysis:`);
  console.log(`   - Total template nodes: ${templateNodes.length}`);
  console.log(`   - Nodes to duplicate: ${nodesToDuplicate.length} (excluding ${sectionNodes.length} sections)`);
  sectionNodes.forEach(s => console.log(`   - ⏭️ Skipping section: "${s.label}" (${s.id})`));

  const templateById = new Map(nodesToDuplicate.map(node => [node.id, node] as const));
  const plannedSuffixByTemplate = new Map<string, number>();
  for (const nodePlan of plan.nodes) {
    const numericSuffix = coerceSuffix(nodePlan.plannedSuffix);
    if (numericSuffix !== null) {
      plannedSuffixByTemplate.set(nodePlan.templateNodeId, numericSuffix);
    }
  }

  const duplicatedSummaries: RepeatExecutionSummary['duplicated'] = [];
  const duplicatedNodeIds = new Set<string>();
  const originalNodeIdByCopyId = new Map<string, string>();
  
  // 🔧 MAP: Associer les IDs supposés du plan aux vrais IDs créés
  // Cela est nécessaire car repeat-instantiator.ts crée des targetNodeId supposés
  // mais deepCopyNodeInternal peut créer des IDs réels différents
  const plannedNodeIdToRealNodeId = new Map<string, string>();

  for (const nodePlan of plan.nodes) {
    let template: TreeBranchLeafNode | undefined;
    try {
      template = templateById.get(nodePlan.templateNodeId);
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

      const updatedMetadata = {
        ...createdMetadata,
        sourceTemplateId: template.id,
        duplicatedAt: new Date().toISOString(),
        duplicatedFromRepeater: repeaterNodeId,
        copiedFromNodeId: template.id,
        copySuffix: effectiveSuffix,
        repeatScopeId: scopeId
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
      
      // 🔧 MAPPING: Enregistrer les IDs réels créés
      // Le plan suppose `templateId-suffix` mais deepCopyNodeInternal a créé `newRootId`
      // Nous devons mapper `templateId-suffix` → `newRootId` pour les variables
      const plannedRootId = `${template.id}-${effectiveSuffix}`;
      plannedNodeIdToRealNodeId.set(plannedRootId, newRootId);
      console.log(`🔧 [REPEAT-EXECUTOR] NODE MAPPING: Planned "${plannedRootId}" → Real "${newRootId}"`);
      
      Object.entries(copyResult.idMap || {}).forEach(([oldId, newId]) => {
        if (!newId) return;
        duplicatedNodeIds.add(newId);
        if (oldId) {
          originalNodeIdByCopyId.set(newId, oldId);
        }
        
        // 🔧 MAPPING: Aussi enregistrer les nœuds enfants
        // Si le plan suppose `childTemplate-suffix`, mais deepCopyNodeInternal a créé `childNewId`,
        // on doit mapper aussi ces enfants
        const plannedChildId = `${oldId}-${effectiveSuffix}`;
        plannedNodeIdToRealNodeId.set(plannedChildId, newId);
      });

      // Ajouter les nœuds d'affichage créés par copyVariableWithCapacities
      if (copyResult.displayNodeIds && copyResult.displayNodeIds.length > 0) {
        copyResult.displayNodeIds.forEach(displayNodeId => {
          duplicatedNodeIds.add(displayNodeId);
          // Le displayNodeId est dérivé de l'ancien nodeId (ex: oldNodeId-suffix)
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

  // 🚀 COPIER LES VARIABLES APRÈS LES NŒUDS
  console.log(`\n🔥🔥🔥 [REPEAT-EXECUTOR] VARIABLES COPY BLOCK EXECUTING 🔥🔥🔥`);
  console.log(`\n📊 [REPEAT-EXECUTOR] COPIE DES VARIABLES - Début`);
  console.log(`   - plan.variables.length = ${plan.variables.length}`);
  console.log(`   - plan.variables = `, JSON.stringify(plan.variables.slice(0, 3), null, 2));
  console.log(`   - repeaterNodeId = ${repeaterNodeId}`);
  console.log(`   - scopeId = ${scopeId}`);
  console.log(`   - plannedNodeIdToRealNodeId.size = ${plannedNodeIdToRealNodeId.size}`);
  console.log(`   - Mapping entries:`, Array.from(plannedNodeIdToRealNodeId.entries()).slice(0, 5));
  
  console.log(`\n📋 [REPEAT-EXECUTOR] DÉBUT BOUCLE VARIABLES - Total: ${plan.variables.length}`);
  for (const variablePlan of plan.variables) {
    console.log(`\n🔄 [REPEAT-EXECUTOR] ITERATION BOUCLE VARIABLE - variablePlan:`, JSON.stringify(variablePlan));
    try {
      let { templateVariableId, targetNodeId, plannedVariableId, plannedSuffix } = variablePlan;
      
      // ⚠️ BLOQUAGE: Vérifier si c'est une variable lookup (pour éviter de créer des champs inutiles)
      const templateVar = await prisma.treeBranchLeafNodeVariable.findUnique({
        where: { id: templateVariableId },
        select: { displayName: true }
      });
      
      console.log(`   📝 Template var displayName: "${templateVar?.displayName}"`);
      
      // Vérifier si c'est une variable lookup
      const isLookup = templateVar?.displayName?.includes('Lookup Table');
      
      console.log(`   🔍 isLookup check: ${isLookup} (displayName.includes('Lookup Table'))`);
      
      if (isLookup) {
        console.log(`🛑 [REPEAT-EXECUTOR] *** SKIP LOOKUP VARIABLE ***: ${templateVariableId} (displayName: "${templateVar?.displayName}")`);
        continue;
      }
      
      console.log(`✅ [REPEAT-EXECUTOR] CONTINUE: Non-lookup variable ${templateVariableId} (displayName: "${templateVar?.displayName}"), va être copiée`);
      
      // 🔧 CORRECTION: Utiliser le vrai ID du nœud créé si disponible
      const realTargetNodeId = plannedNodeIdToRealNodeId.get(targetNodeId);
      if (realTargetNodeId) {
        console.log(`🔧 [REPEAT-EXECUTOR] MAPPING CORRECTION: targetNodeId "${targetNodeId}" → "${realTargetNodeId}"`);
        targetNodeId = realTargetNodeId;
      } else {
        console.warn(`⚠️  [REPEAT-EXECUTOR] Aucun mapping trouvé pour targetNodeId "${targetNodeId}", utilisation directe`);
      }
      
      console.log(`📊 [REPEAT-EXECUTOR] Copie variable ${templateVariableId} -> ${plannedVariableId} (targetNode: ${targetNodeId})`);
      console.log(`   - suffix: ${plannedSuffix}`);
      console.log(`   - repeaterNodeId: ${repeaterNodeId}`);
      
      console.log(`📊 [REPEAT-EXECUTOR] APPEL copyVariableWithCapacities...`);
      const variableResult = await copyVariableWithCapacities(
        templateVariableId,
        plannedSuffix,
        targetNodeId,
        prisma,
        {
          autoCreateDisplayNode: true,
          isFromRepeaterDuplication: true,
          repeatContext: {
            repeaterNodeId,
            templateNodeId: targetNodeId.replace(`-${plannedSuffix}`, ''),
            duplicatedFromNodeId: targetNodeId.replace(`-${plannedSuffix}`, ''),
            scopeId,
            mode: 'repeater'
          }
        }
      );
      
      console.log(`✅ [REPEAT-EXECUTOR] Variable copiée: ${plannedVariableId}`, variableResult);
    } catch (varErr) {
      console.error(`[repeat-executor] Erreur lors de la copie de la variable ${variablePlan.templateVariableId}:`, varErr instanceof Error ? varErr.message : String(varErr));
      // Ne pas bloquer - continuer avec les autres variables
    }
  }
  console.log(`\n🔥🔥🔥 [REPEAT-EXECUTOR] COPIE DES VARIABLES - FIN (sortie de boucle) 🔥🔥🔥`);

  try {
    await syncRepeaterTemplateIds(prisma, repeaterNodeId, templateNodeIds);
  } catch (syncErr) {
    console.warn('[repeat-executor] Unable to sync repeater template IDs', syncErr);
  }

  // 🚫 NOUVEAU: Isolation stricte des nœuds copiés et correction des capacités
  if (duplicatedNodeIds.size > 0) {
    console.log(`🚫 [REPEAT-EXECUTOR] ISOLATION STRICTE pour ${duplicatedNodeIds.size} nœuds dupliqués`);
    try {
      // 0. CORRECTION COMPLÈTE DE TOUTES LES DUPLICATIONS  
      console.log(`🔧 [REPEAT-EXECUTOR] CORRECTION COMPLÈTE de toutes les duplications...`);
      const completeDuplicationReport = await fixAllCompleteDuplications(prisma, repeaterNodeId);
      console.log(`🔧 [REPEAT-EXECUTOR] Duplications complètement corrigées:`);
      console.log(`  - Nœuds traités: ${completeDuplicationReport.totalNodesProcessed}`);
      console.log(`  - Nœuds corrigés: ${completeDuplicationReport.nodesFixed.length}`);
      console.log(`  - Erreurs: ${completeDuplicationReport.errors.length}`);
      
      // 0.1. DUPLICATION COMPLÈTE DES TABLES ET LOOKUPS
      console.log(`🗂️ [REPEAT-EXECUTOR] *** NOUVEAU SYSTEME EN MARCHE *** DUPLICATION des tables et lookups...`);
      console.log(`🗂️ [REPEAT-EXECUTOR] duplicatedNodeIds:`, Array.from(duplicatedNodeIds));
      for (const nodeId of duplicatedNodeIds) {
        const originalNodeId = originalNodeIdByCopyId.get(nodeId);
        if (!originalNodeId) continue;
        const suffixToken = deriveCopySuffixToken(originalNodeId, nodeId);
        if (!suffixToken) continue;
        console.log(`🗂️ [REPEAT-EXECUTOR] Duplication table/lookup pour ${originalNodeId} -> ${nodeId} (suffix ${suffixToken})`);
        await tableLookupDuplicationService.duplicateTableLookupSystem(prisma, originalNodeId, {
          copiedNodeId: nodeId,
          suffixToken
        });
      }

      // 🧭 NOUVEAU: réaligner les parents des copies quand la section dupliquée existe déjà
      await reassignCopiedNodesToDuplicatedParents(prisma, duplicatedNodeIds, originalNodeIdByCopyId);
      
      // 1. Forcer l'isolation complète
      const isolationResult = await enforceStrictIsolation(
        prisma,
        Array.from(duplicatedNodeIds)
      );
      
      console.log(`🚫 [REPEAT-EXECUTOR] Isolation terminée:`);
      console.log(`  - Nœuds isolés: ${isolationResult.isolatedNodes.length}`);
      console.log(`  - Erreurs: ${isolationResult.errors.length}`);
      
      // 2. Vérification de l'isolation
      await verifyIsolation(prisma, Array.from(duplicatedNodeIds));
      
      // 3. Reset final des valeurs calculées
      const resetCount = await resetCalculatedValuesAfterCopy(
        prisma,
        Array.from(duplicatedNodeIds)
      );
      console.log(`✅ [REPEAT-EXECUTOR] ${resetCount} valeurs calculées finalement remises à null`);
      
      // 4. Forçage des calculs indépendants
      await forceIndependentCalculation(prisma, Array.from(duplicatedNodeIds));
      
      // 5. Création des triggers de recalcul pour le frontend
      await createRecalculationTriggers(prisma, Array.from(duplicatedNodeIds));
      
      // 6. FORCER LE RECALCUL AVEC LES PROPRES DONNÉES
      console.log(`🚀 [REPEAT-EXECUTOR] FORÇAGE RECALCUL avec données propres...`);
      const forceRecalcReport = await forceAllNodesRecalculationWithOwnData(prisma, repeaterNodeId);
      console.log(`🚀 [REPEAT-EXECUTOR] Recalculs forcés:`);
      console.log(`  - Nœuds traités: ${forceRecalcReport.totalNodesProcessed}`);
      console.log(`  - Nœuds recalculés: ${forceRecalcReport.nodesRecalculated.length}`);
      console.log(`  - Erreurs: ${forceRecalcReport.errors.length}`);
      
      // 7. BLOQUER DÉFINITIVEMENT LE FALLBACK
      await blockFallbackToOriginalValues(prisma, Array.from(duplicatedNodeIds));
      
      console.log(`🎉 [REPEAT-EXECUTOR] ISOLATION STRICTE TERMINÉE - Les champs copiés sont maintenant 100% indépendants`);
      console.log(`📝 [REPEAT-EXECUTOR] Les champs de données d'affichage -1 doivent maintenant calculer avec leurs propres données`);
      console.log(`🚫 [REPEAT-EXECUTOR] FALLBACK DÉFINITIVEMENT BLOQUÉ - Impossible de retomber sur les valeurs originales`);
      
      // 🚀 8. RECALCULER LES VRAIES VALEURS AVEC OPERATION INTERPRETER
      console.log(`\n🧮 [REPEAT-EXECUTOR] RECALCUL AVEC OPERATION INTERPRETER - Calcul des vraies valeurs...`);
      const interpreterRecalcReport = await recalculateAllCopiedNodesWithOperationInterpreter(
        prisma,
        repeaterNodeId,
        '-1'
      );
      console.log(`🧮 [REPEAT-EXECUTOR] Recalculs Operation Interpreter:`);
      console.log(`  - Nœuds traités: ${interpreterRecalcReport.totalNodes}`);
      console.log(`  - Nœuds recalculés: ${interpreterRecalcReport.recalculated.filter(r => r.recalculationSuccess).length}`);
      console.log(`  - Erreurs: ${interpreterRecalcReport.errors.length}`);
      interpreterRecalcReport.recalculated.forEach(r => {
        if (r.hasCapacity && r.newValue) {
          console.log(`  ✅ ${r.label}: ${r.oldValue || 'null'} → ${r.newValue}`);
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
    count: duplicatedSummaries.length
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

  const scoped = await prisma.treeBranchLeafNode.findMany({
    where: {
      id: { in: templateNodeIds },
      treeId: repeaterTreeId
    }
  });
  if (scoped.length) {
    return scoped;
  }

  const crossTree = await prisma.treeBranchLeafNode.findMany({
    where: {
      id: { in: templateNodeIds }
    },
    include: {
      TreeBranchLeafTree: {
        select: { organizationId: true }
      }
    }
  });

  if (!crossTree.length) {
    throw new RepeatOperationError('No template nodes could be loaded for this repeater.', 404);
  }

  if (!isSuperAdmin && organizationId) {
    const unauthorized = crossTree.find(node => node.TreeBranchLeafTree?.organizationId && node.TreeBranchLeafTree.organizationId !== organizationId);
    if (unauthorized) {
      throw new RepeatOperationError('Access denied to template library for this repeater.', 403);
    }
  }

  return crossTree.map(({ TreeBranchLeafTree, ...rest }) => rest);
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
  console.log(`🧭 [REPEAT-EXECUTOR] Parents réalignés pour ${updates.length} copie(s).`);
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
