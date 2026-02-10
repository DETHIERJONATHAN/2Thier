/**
 * 🎯 Contrôleur pour gérer les valeurs calculées
 * 
 * GET  /api/tree-nodes/:nodeId/calculated-value
 * POST /api/tree-nodes/:nodeId/store-calculated-value
 * POST /api/tree-nodes/store-batch-calculated-values
 */

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../lib/database';

const router = Router();
const prisma = db;

const parseStoredStringValue = (raw?: string | null): string | number | boolean | null => {
  if (raw === null || raw === undefined) {
    return null;
  }
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed === '∅') {
    return null;
  }
  const looksJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
  if (looksJson) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        const candidate = parsed as Record<string, unknown>;
        if (candidate.value !== undefined) return candidate.value as string | number | boolean | null;
        if (candidate.result !== undefined) return candidate.result as string | number | boolean | null;
      }
      if (typeof parsed === 'string' || typeof parsed === 'number' || typeof parsed === 'boolean') {
        return parsed;
      }
    } catch {
      // ignore JSON parse errors and keep raw string
    }
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && trimmed === numeric.toString()) {
    return numeric;
  }
  return trimmed;
};

const extractValueFromOperationResult = (raw: unknown): string | number | boolean | null => {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return raw;
  }
  if (typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    const candidate = record.value ?? record.result ?? record.humanText ?? record.text;
    if (candidate === undefined || candidate === null) {
      return null;
    }
    if (typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean') {
      return candidate;
    }
  }
  return null;
};

const hasMeaningfulValue = (val: unknown): boolean => {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') {
    return val.trim() !== '' && val.trim() !== '∅';
  }
  return true;
};

const toIsoString = (date?: Date | string | null): string | undefined => {
  if (!date) {
    return undefined;
  }
  try {
    return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
  } catch {
    return undefined;
  }
};

type SubmissionDataSnapshot = {
  value: string | null;
  lastResolved: Date | null;
  operationResult: unknown;
  operationDetail: unknown;
  operationSource: string | null;
  sourceRef: string | null;
  fieldLabel: string | null;
};

/**
 * GET /api/tree-nodes/:nodeId/calculated-value
 * 
 * Récupère la valeur calculée stockée dans Prisma
 * 🔥 NOUVEAU: Invoke operation-interpreter for TBL fields if needed
 */
router.get('/:nodeId/calculated-value', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;

    const pickQueryString = (key: string): string | undefined => {
      const rawValue = (req.query as Record<string, unknown>)[key];
      if (typeof rawValue === 'string') return rawValue;
      if (Array.isArray(rawValue) && rawValue.length > 0 && typeof rawValue[0] === 'string') {
        return rawValue[0];
      }
      return undefined;
    };

    const submissionId =
      pickQueryString('submissionId') ||
      pickQueryString('_submissionId') ||
      pickQueryString('subId') ||
      pickQueryString('tblSubmissionId');

    if (!nodeId) {
      return res.status(400).json({ error: 'nodeId requis' });
    }

    // 🎯 Chercher le nœud et récupérer sa valeur calculée
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: {
        id: nodeId
      },
      select: {
        id: true,
        label: true,
        calculatedValue: true,
        metadata: true,
        calculatedAt: true,
        calculatedBy: true,
        type: true,
        fieldType: true,
        table_activeId: true,
        linkedTableIds: true,
        treeId: true, // ✨ Ajouté pour operation-interpreter
        // 🔗 Champs Link pour afficher la valeur d'un autre champ
        hasLink: true,
        link_targetNodeId: true,
        link_targetTreeId: true,
        link_mode: true
      }
    });

    if (!node) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

    // 🔗 PRIORITÉ 0: Si le champ a un Link configuré, récupérer la valeur du champ cible
    // Ce bloc DOIT être exécuté AVANT toute autre logique de calcul
    if (node.hasLink && node.link_targetNodeId) {
      console.log(`🔗 [LINK] Champ "${node.label}" (${nodeId}) a un link vers ${node.link_targetNodeId}`);
      
      // Récupérer la valeur du champ cible depuis SubmissionData (valeur scopée)
      if (submissionId) {
        const targetSubmissionData = await prisma.treeBranchLeafSubmissionData.findUnique({
          where: { submissionId_nodeId: { submissionId, nodeId: node.link_targetNodeId } },
          select: { value: true, fieldLabel: true, lastResolved: true }
        });
        
        if (targetSubmissionData?.value) {
          console.log(`🔗 [LINK] Valeur trouvée dans SubmissionData: "${targetSubmissionData.value}"`);
          return res.json({
            success: true,
            nodeId: node.id,
            label: node.label,
            value: parseStoredStringValue(targetSubmissionData.value),
            calculatedAt: toIsoString(targetSubmissionData.lastResolved),
            calculatedBy: 'link',
            type: node.type,
            fieldType: node.fieldType,
            fromLink: true,
            linkTargetNodeId: node.link_targetNodeId,
            linkTargetLabel: targetSubmissionData.fieldLabel
          });
        }
      }
      
      // Fallback: récupérer la valeur directement depuis le nœud cible
      const targetNode = await prisma.treeBranchLeafNode.findUnique({
        where: { id: node.link_targetNodeId },
        select: { calculatedValue: true, label: true, calculatedAt: true }
      });
      
      if (targetNode?.calculatedValue) {
        console.log(`🔗 [LINK] Valeur trouvée dans TreeBranchLeafNode: "${targetNode.calculatedValue}"`);
        return res.json({
          success: true,
          nodeId: node.id,
          label: node.label,
          value: parseStoredStringValue(targetNode.calculatedValue),
          calculatedAt: toIsoString(targetNode.calculatedAt),
          calculatedBy: 'link',
          type: node.type,
          fieldType: node.fieldType,
          fromLink: true,
          linkTargetNodeId: node.link_targetNodeId,
          linkTargetLabel: targetNode.label
        });
      }
      
      // Aucune valeur trouvée pour le lien
      console.log(`⚠️ [LINK] Champ "${node.label}" - pas de valeur disponible pour le lien vers ${node.link_targetNodeId}`);
    }

    // 🎯 PRIORITÉ 1: Champs Sum-Total (-sum-total)
    // Ces champs ont des formula_tokens ["@value.nodeId1", "+", "@value.nodeId2", ...]
    // On les évalue directement ici en lisant les valeurs depuis SubmissionData (scoped)
    // puis fallback vers calculatedValue du nœud source.
    // Cela évite le blocage "isDisplayField" et l'évaluation par operation-interpreter
    // qui ne sait pas résoudre @value.{nodeId} depuis SubmissionData.
    const isSumTotalNode = typeof nodeId === 'string' && nodeId.endsWith('-sum-total');
    if (isSumTotalNode) {
      try {
        // Récupérer les formula_tokens du nœud (pas dans le select initial)
        const sumTokensNode = await prisma.treeBranchLeafNode.findUnique({
          where: { id: nodeId },
          select: { formula_tokens: true }
        });
        const tokens = Array.isArray(sumTokensNode?.formula_tokens)
          ? (sumTokensNode!.formula_tokens as string[])
          : [];

        let sum = 0;
        const debugParts: Array<{ refId: string; value: number; source: string }> = [];

        for (const token of tokens) {
          if (typeof token === 'string' && token.startsWith('@value.')) {
            const refNodeId = token.slice(7); // retirer '@value.'
            let val: number | null = null;
            let valSource = 'none';

            // 1. Essayer SubmissionData (valeur scoped, fraîche)
            if (submissionId) {
              const sd = await prisma.treeBranchLeafSubmissionData.findUnique({
                where: { submissionId_nodeId: { submissionId, nodeId: refNodeId } },
                select: { value: true }
              });
              if (sd?.value !== null && sd?.value !== undefined) {
                val = parseFloat(sd.value) || 0;
                valSource = 'submissionData';
              }
            }

            // 2. Fallback: calculatedValue du nœud source
            if (val === null) {
              const srcNode = await prisma.treeBranchLeafNode.findUnique({
                where: { id: refNodeId },
                select: { calculatedValue: true }
              });
              if (srcNode?.calculatedValue !== null && srcNode?.calculatedValue !== undefined) {
                val = parseFloat(srcNode.calculatedValue) || 0;
                valSource = 'calculatedValue';
              }
            }

            const resolvedVal = val ?? 0;
            sum += resolvedVal;
            debugParts.push({ refId: refNodeId, value: resolvedVal, source: valSource });
          }
          // Les opérateurs "+", "-", etc. sont ignorés car on fait une somme simple
        }

        console.log(`🎯 [SUM-TOTAL DIRECT] ${nodeId} (${node.label}) = ${sum}`, debugParts);

        // Persister la valeur calculée sur le nœud pour les autres consommateurs
        await prisma.treeBranchLeafNode.update({
          where: { id: nodeId },
          data: {
            calculatedValue: String(sum),
            calculatedAt: new Date(),
            calculatedBy: 'sum-total-direct'
          }
        });

        // Aussi persister dans SubmissionData si on a un submissionId
        if (submissionId) {
          await prisma.treeBranchLeafSubmissionData.upsert({
            where: { submissionId_nodeId: { submissionId, nodeId } },
            update: {
              value: String(sum),
              lastResolved: new Date(),
              operationSource: 'formula',
              fieldLabel: node.label
            },
            create: {
              id: randomUUID(),
              submissionId,
              nodeId,
              value: String(sum),
              lastResolved: new Date(),
              operationSource: 'formula',
              fieldLabel: node.label
            }
          });
        }

        return res.json({
          success: true,
          nodeId: node.id,
          label: node.label,
          value: sum,
          calculatedAt: new Date().toISOString(),
          calculatedBy: 'sum-total-direct',
          type: node.type,
          fieldType: node.fieldType,
          isSumTotal: true,
          debugParts
        });
      } catch (sumTotalError) {
        console.error(`❌ [SUM-TOTAL DIRECT] Erreur pour ${nodeId}:`, sumTotalError);
        // Continue vers le flow normal en cas d'erreur
      }
    }

    // 🎯 Champs DISPLAY: on préfère une valeur scoped par submissionId (zéro valeur fantôme).
    // Fallback: TreeBranchLeafNode.calculatedValue pour compat legacy / écrans hors-contexte.
    const isDisplayField = node.fieldType === 'DISPLAY' || node.type === 'DISPLAY' || node.type === 'leaf_field';

    const nodeMetadata = (node.metadata && typeof node.metadata === 'object'
      ? (node.metadata as Record<string, unknown>)
      : null);

    const forceFlag =
      pickQueryString('force') ||
      pickQueryString('forceRefresh') ||
      pickQueryString('refresh') ||
      pickQueryString('forceRecompute');
    const forceRecompute = Boolean(
      forceFlag && ['1', 'true', 'yes', 'force'].includes(forceFlag.toLowerCase())
    );

    const requiresFreshCalculation = (() => {
      if (!nodeMetadata) return false;
      const metaAny = nodeMetadata as any;
      return Boolean(
        metaAny?.mustRecalculate ||
          metaAny?.requiresFreshCalculation ||
          metaAny?.calculationInvalidated ||
          metaAny?.calculatedValueReset ||
          metaAny?.forceIndependentCalc ||
          metaAny?.independentCalculation
      );
    })();
    
    if (isDisplayField) {
      // 🔥 FIX RACE CONDITION 2026-01-30:
      // TOUJOURS vérifier SubmissionData d'abord pour les DISPLAY fields, même si
      // requiresFreshCalculation est true. La raison:
      // 1. Le POST create-and-evaluate calcule la valeur avec les formData fraîches et la stocke dans SubmissionData
      // 2. Le GET triggered ensuite doit retourner cette valeur stockée, pas recalculer avec des données DB obsolètes
      // 3. Les flags requiresFreshCalculation sont persistants dans metadata et ne devraient pas
      //    forcer un recalcul si une valeur fraîchement calculée existe déjà dans SubmissionData
      // 4. Seul forceRecompute (explicite dans la query string) devrait bypasser SubmissionData
      if (submissionId && !forceRecompute) {
        const scoped = await prisma.treeBranchLeafSubmissionData.findUnique({
          where: { submissionId_nodeId: { submissionId, nodeId } },
          select: {
            value: true,
            lastResolved: true,
            operationSource: true,
            sourceRef: true,
            operationResult: true
          }
        });

        const scopedValue = scoped?.value ?? null;
        const parsedScoped = parseStoredStringValue(scopedValue);
        const hasValidScoped = hasMeaningfulValue(parsedScoped);
        const fromOpResult = hasValidScoped ? null : extractValueFromOperationResult(scoped?.operationResult);
        const resolved = hasValidScoped ? parsedScoped : fromOpResult;

        if (hasMeaningfulValue(resolved)) {
          console.log(`✅ [DISPLAY FIELD] ${nodeId} (${node.label}) retourne valeur SubmissionData: ${resolved}`);
          return res.json({
            success: true,
            nodeId: node.id,
            label: node.label,
            value: resolved,
            calculatedAt: toIsoString(scoped?.lastResolved || undefined),
            calculatedBy: scoped?.operationSource || node.calculatedBy,
            type: node.type,
            fieldType: node.fieldType,
            fromSubmissionData: true,
            isDisplayField: true
          });
        }
        // Si pas de valeur dans SubmissionData, on continue vers le recalcul ci-dessous
        console.log(`⚠️ [DISPLAY FIELD] ${nodeId} (${node.label}) pas de valeur SubmissionData, recalcul nécessaire`);
      }

      // 🔥 FIX DONNÉES FANTÔMES: Pour les DISPLAY fields, NE JAMAIS retourner
      // TreeBranchLeafNode.calculatedValue (valeur GLOBALE non scopée).
      // On doit recalculer à la volée en continuant vers le code de recalcul ci-dessous.
      // L'ancien code faisait un fallback vers node.calculatedValue qui contenait
      // des valeurs d'autres submissions = DONNÉES FANTÔMES.
      // 
      // SUPPRIMÉ: le bloc qui retournait node.calculatedValue pour les DISPLAY fields
      // Le flow continue maintenant vers le recalcul via operation-interpreter.
    }

    const preferSubmissionData = Boolean(submissionId) && !isDisplayField;

    let submissionDataEntry: SubmissionDataSnapshot | null = null;
    let submissionResolvedValue: string | number | boolean | null = null;

    if (preferSubmissionData && submissionId) {
      submissionDataEntry = await prisma.treeBranchLeafSubmissionData.findUnique({
        where: { submissionId_nodeId: { submissionId, nodeId } },
        select: {
          value: true,
          lastResolved: true,
          operationResult: true,
          operationDetail: true,
          operationSource: true,
          sourceRef: true,
          fieldLabel: true
        }
      });

      if (submissionDataEntry) {
        submissionResolvedValue = parseStoredStringValue(submissionDataEntry.value);
        if (!hasMeaningfulValue(submissionResolvedValue)) {
          submissionResolvedValue = extractValueFromOperationResult(submissionDataEntry.operationResult);
        }
      }

      const needsSubmissionRecompute =
        forceRecompute ||
        !submissionDataEntry ||
        !hasMeaningfulValue(submissionResolvedValue);

      if (needsSubmissionRecompute) {
        const variableMeta = await prisma.treeBranchLeafNodeVariable.findUnique({
          where: { nodeId },
          select: { nodeId: true, displayName: true, exposedKey: true, unit: true }
        });

        if (variableMeta) {
          try {
            const { evaluateVariableOperation } = await import('../components/TreeBranchLeaf/treebranchleaf-new/api/operation-interpreter.js');
            const evaluation = await evaluateVariableOperation(nodeId, submissionId, prisma);
            const recomputedValue = evaluation.value ?? evaluation.operationResult ?? null;
            const persistedValue =
              recomputedValue === null || recomputedValue === undefined
                ? null
                : String(recomputedValue);
            const resolvedAt = new Date();

            // ⚠️ NE PAS persister les display fields dans la submission
            // Les display fields calculent en temps réel, ils ne doivent jamais être stockés
            const isDisplayField = node.fieldType === 'DISPLAY' || node.type === 'DISPLAY';
            
            if (!isDisplayField) {
              await prisma.treeBranchLeafSubmissionData.upsert({
              where: { submissionId_nodeId: { submissionId, nodeId } },
              update: {
                value: persistedValue,
                operationDetail: evaluation.operationDetail,
                operationSource: evaluation.operationSource,
                sourceRef: evaluation.sourceRef,
                fieldLabel: node.label,
                isVariable: true,
                variableDisplayName: variableMeta.displayName,
                variableKey: variableMeta.exposedKey,
                variableUnit: variableMeta.unit,
                lastResolved: resolvedAt
              },
              create: {
                id: randomUUID(),
                submissionId,
                nodeId,
                value: persistedValue,
                operationDetail: evaluation.operationDetail,
                operationSource: evaluation.operationSource,
                sourceRef: evaluation.sourceRef,
                fieldLabel: node.label,
                isVariable: true,
                variableDisplayName: variableMeta.displayName,
                variableKey: variableMeta.exposedKey,
                variableUnit: variableMeta.unit,
                lastResolved: resolvedAt
              }
              });
            }

            return res.json({
              success: true,
              nodeId: node.id,
              label: node.label,
              value: recomputedValue,
              calculatedAt: resolvedAt.toISOString(),
              calculatedBy: evaluation.operationSource || 'operation-interpreter-auto',
              type: node.type,
              fieldType: node.fieldType,
              submissionId,
              sourceRef: evaluation.sourceRef,
              operationDetail: evaluation.operationDetail,
              freshCalculation: true
            });
          } catch (recomputeErr) {
            console.error('❌ [CalculatedValueController] Recompute error:', recomputeErr);
          }
        }
      }

      if (submissionDataEntry && hasMeaningfulValue(submissionResolvedValue)) {
        return res.json({
          success: true,
          nodeId: node.id,
          label: node.label || submissionDataEntry.fieldLabel,
          value: submissionResolvedValue,
          calculatedAt: toIsoString(submissionDataEntry.lastResolved) || toIsoString(node.calculatedAt),
          calculatedBy: submissionDataEntry.operationSource || node.calculatedBy,
          type: node.type,
          fieldType: node.fieldType,
          submissionId,
          sourceRef: submissionDataEntry.sourceRef,
          operationDetail: submissionDataEntry.operationDetail,
          fromSubmission: true
        });
      }
    }

    // 🔥 NOUVEAU: Si c'est un champ TBL avec une table lookup, invoquer operation-interpreter
    const isTBLField = (node.type === 'field' || node.type === 'leaf_field') && node.metadata && typeof node.metadata === 'object';
    // nodeMetadata est déjà normalisé plus haut
    
    // 🆕 D'abord récupérer les métadonnées de la variable (déplacé ici AVANT utilisation)
    const variableMeta2 = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { nodeId },
      select: { sourceType: true, sourceRef: true }
    });
    
    // Détecter table lookup de plusieurs façons:
    // 1. Via lookup.enabled (ancien format)
    const hasLookupEnabled = isTBLField && 
      (nodeMetadata as any)?.lookup?.enabled === true && 
      (nodeMetadata as any)?.lookup?.tableReference;
    
    // 2. Via capabilities.datas[].config.sourceRef commençant par @table. (nouveau format)
    const datasArray = (nodeMetadata as any)?.capabilities?.datas as Array<{ config?: { sourceRef?: string } }> | undefined;
    const hasTableInDatas = Array.isArray(datasArray) && datasArray.some(
      d => d?.config?.sourceRef?.startsWith('@table.')
    );
    
    // 3. Via variable.sourceRef commençant par @table.
    const hasTableInVariable = variableMeta2?.sourceRef?.startsWith('@table.');
    
    const hasTableLookup = hasLookupEnabled || hasTableInDatas || hasTableInVariable;

    // 🔥 FIX: Inclure aussi sourceType="tree" avec condition: ou node-formula:
    const hasFormulaVariable = variableMeta2?.sourceRef?.startsWith('node-formula:');
    const hasConditionVariable = variableMeta2?.sourceRef?.startsWith('condition:');
    const hasTreeSourceVariable = variableMeta2?.sourceType === 'tree' && (hasFormulaVariable || hasConditionVariable);

    // 🔥 IMPORTANT: Ne PAS recalculer si une valeur calculée VALIDE existe déjà
    // Une valeur est "valide" si elle n'est pas vide ou "[]" ("0" est une valeur légitime)
    const existingValue = node.calculatedValue;
    const hasValidExistingValue = existingValue && 
      existingValue !== '' && 
      existingValue !== '[]' &&
      existingValue !== 'null' &&
      existingValue !== 'undefined' &&
      !requiresFreshCalculation;

    // 🔥 CRITIQUE: Si le node exige une recalculation (ex: duplication repeater), recalculer via operation-interpreter
    // même si une valeur existe déjà (souvent "0" suite à une copie incomplète).
    // Objectif: éviter les copies bloquées à 0 quand table_activeId n'est pas encore correctement fixé.
    const isRealSubmissionForRecompute = submissionId && !submissionId.startsWith('preview-');
    if (requiresFreshCalculation && node.treeId) {
      try {
        // Résoudre un submissionId si absent (fallback sur la dernière submission active)
        const resolvedSubmissionId = isRealSubmissionForRecompute
          ? submissionId!
          : (
              await prisma.treeBranchLeafSubmission.findFirst({
                where: {
                  treeId: node.treeId,
                  status: { not: 'archived' }
                },
                orderBy: { updatedAt: 'desc' },
                select: { id: true }
              })
            )?.id;

        if (resolvedSubmissionId) {
          const metaAny = (nodeMetadata as any) || {};
          const looksLikeDuplicatedCopy = Boolean(
            metaAny?.duplicatedFromRepeater || metaAny?.autoCreatedDisplayNode || metaAny?.copiedFromNodeId
          );

          // Auto-réparer table_activeId manquant sur les copies dupliquées (état incohérent)
          // Choix: prendre la dernière table liée (souvent la "principale"), mais uniquement si elle existe.
          if (!node.table_activeId && looksLikeDuplicatedCopy && Array.isArray(node.linkedTableIds) && node.linkedTableIds.length > 0) {
            const candidateTableId = node.linkedTableIds[node.linkedTableIds.length - 1];
            if (candidateTableId) {
              const candidateExists = await prisma.treeBranchLeafNodeTable.findUnique({
                where: { id: candidateTableId },
                select: { id: true }
              });
              if (candidateExists) {
                await prisma.treeBranchLeafNode.update({
                  where: { id: nodeId },
                  data: { table_activeId: candidateTableId }
                });
              }
            }
          }

          const { evaluateVariableOperation } = await import('../components/TreeBranchLeaf/treebranchleaf-new/api/operation-interpreter.js');
          const evaluation = await evaluateVariableOperation(nodeId, resolvedSubmissionId, prisma);
          const recomputedValue = evaluation.value ?? evaluation.operationResult ?? null;
          const resolvedAt = new Date();

          // Mettre à jour la valeur calculée du node (évite de recalculer en boucle)
          await prisma.treeBranchLeafNode.update({
            where: { id: nodeId },
            data: {
              calculatedValue:
                recomputedValue === null || recomputedValue === undefined ? null : String(recomputedValue),
              calculatedAt: resolvedAt,
              calculatedBy: evaluation.operationSource || 'operation-interpreter-auto'
            }
          });

          return res.json({
            success: true,
            nodeId: node.id,
            label: node.label,
            value: recomputedValue,
            calculatedAt: resolvedAt.toISOString(),
            calculatedBy: evaluation.operationSource || 'operation-interpreter-auto',
            type: node.type,
            fieldType: node.fieldType,
            submissionId: resolvedSubmissionId,
            sourceRef: evaluation.sourceRef,
            operationDetail: evaluation.operationDetail,
            freshCalculation: true
          });
        }
      } catch (recomputeErr) {
        console.error('❌ [CalculatedValueController] Recompute (requiresFreshCalculation) error:', recomputeErr);
      }
    }
    
    // 🔥 FIX DONNÉES FANTÔMES: Pour les DISPLAY fields, NE JAMAIS retourner node.calculatedValue
    // car c'est une valeur GLOBALE non scopée par submission.
    // Les DISPLAY fields doivent toujours être recalculés à la volée ou retourner null.
    // Si on a déjà une valeur valide (et ce n'est PAS un DISPLAY field), la retourner directement sans recalculer
    if (hasValidExistingValue && !isDisplayField) {
      return res.json({
        success: true,
        nodeId: node.id,
        label: node.label,
        value: parseStoredStringValue(existingValue),
        calculatedAt: toIsoString(node.calculatedAt),
        calculatedBy: node.calculatedBy,
        type: node.type,
        fieldType: node.fieldType,
        fromStoredValue: true
      });
    }

    // Invoquer operation-interpreter SEULEMENT si:
    // 1. C'est un champ TBL avec table lookup (PAS les conditions/formules qui dépendent de valeurs preview)
    // 2. PAS de valeur calculée valide existante
    // 3. On a une VRAIE soumission (pas preview)
    // 
    // ⚠️ IMPORTANT: Ne PAS recalculer les conditions/formules ici car on n'a pas accès aux
    // formValues du frontend. Le frontend doit utiliser /preview-evaluate pour ça.
    // Seuls les champs TBL avec table lookup peuvent être recalculés ici car ils
    // n'ont pas de dépendances sur des valeurs de formulaire.
    const isRealSubmission = submissionId && !submissionId.startsWith('preview-');
    const canRecalculateHere = hasTableLookup && !hasConditionVariable && !hasTreeSourceVariable;
    
    // 🔥 FIX: Pour les DISPLAY fields sans valeur scopée, TOUJOURS essayer de recalculer
    // via operation-interpreter. Les données sont disponibles dans la submission.
    const canRecalculateDisplayField = isDisplayField && isRealSubmission && 
      (hasTableLookup || hasFormulaVariable || hasConditionVariable || hasTreeSourceVariable);
    
    if ((canRecalculateHere || canRecalculateDisplayField) && node.treeId && isRealSubmission) {
      console.log(`🔥 [CalculatedValueController] Node "${node.label}" - recalcul ${isDisplayField ? 'DISPLAY field' : 'table lookup'}:`, {
        nodeId, 
        hasTableLookup,
        hasFormulaVariable,
        hasConditionVariable,
        isDisplayField,
        submissionId
      });
      
      try {
        // 🚀 INVOQUER OPERATION-INTERPRETER pour les lookups ET les DISPLAY fields
        const { evaluateVariableOperation } = await import('../components/TreeBranchLeaf/treebranchleaf-new/api/operation-interpreter.js');
        
        const result = await evaluateVariableOperation(
          nodeId,
          submissionId,
          prisma
        );
        
        console.log('🎯 [CalculatedValueController] Résultat operation-interpreter:', result);
        
        // Si on a un résultat VALIDE, le stocker ET le retourner
        if (result && (result.value !== undefined || result.operationResult !== undefined)) {
          const stringValue = String(result.value ?? result.operationResult);
          
          // 🔥 FIX: Pour les DISPLAY fields, NE PAS stocker dans TreeBranchLeafNode.calculatedValue (GLOBAL)
          // Stocker uniquement dans SubmissionData (scoped par submission)
          if (isDisplayField) {
            // Stocker dans SubmissionData (scoped)
            await prisma.treeBranchLeafSubmissionData.upsert({
              where: { submissionId_nodeId: { submissionId: submissionId!, nodeId } },
              update: {
                value: stringValue,
                lastResolved: new Date(),
                operationSource: result.operationSource || 'operation-interpreter-display',
                sourceRef: result.sourceRef,
                operationDetail: result.operationDetail,
                fieldLabel: node.label
              },
              create: {
                id: randomUUID(),
                submissionId: submissionId!,
                nodeId,
                value: stringValue,
                lastResolved: new Date(),
                operationSource: result.operationSource || 'operation-interpreter-display',
                sourceRef: result.sourceRef,
                operationDetail: result.operationDetail,
                fieldLabel: node.label
              }
            });
          } else {
            // Pour les NON-display fields, stocker dans TreeBranchLeafNode (comportement legacy)
            if (stringValue && stringValue !== '0' && stringValue !== '') {
              await prisma.treeBranchLeafNode.update({
                where: { id: nodeId },
                data: {
                  calculatedValue: stringValue,
                  calculatedAt: new Date(),
                  calculatedBy: 'operation-interpreter-auto'
                }
              });
            }
          }

          return res.json({
            success: true,
            nodeId: node.id,
            label: node.label,
            value: stringValue,
            calculatedAt: new Date().toISOString(),
            calculatedBy: result.operationSource || 'operation-interpreter-auto',
            type: node.type,
            fieldType: node.fieldType,
            freshCalculation: true,
            isDisplayField,
            submissionScoped: isDisplayField
          });
        }
      } catch (operationErr) {
        console.error('❌ [CalculatedValueController] Erreur operation-interpreter:', operationErr);
        // Continue avec la valeur existante si échec du calcul
      }
    }

    // ✅ Retourner la valeur calculée du Nœud (par défaut)
    // 🔥 FIX DONNÉES FANTÔMES: Pour les DISPLAY fields, ne JAMAIS retourner la valeur GLOBALE
    // car elle n'est pas scopée par submission. Retourner null pour forcer le recalcul frontend.
    if (isDisplayField) {
      console.log(`⚠️ [CalculatedValueController] DISPLAY field "${node.label}" - pas de valeur scopée, retourne null`);
      return res.json({
        success: true,
        nodeId: node.id,
        label: node.label,
        value: null, // Pas de valeur GLOBALE pour les DISPLAY fields
        calculatedAt: node.calculatedAt,
        calculatedBy: node.calculatedBy,
        type: node.type,
        fieldType: node.fieldType,
        noScopedValue: true
      });
    }
    
    return res.json({
      success: true,
      nodeId: node.id,
      label: node.label,
      value: node.calculatedValue,
      calculatedAt: node.calculatedAt,
      calculatedBy: node.calculatedBy,
      type: node.type,
      fieldType: node.fieldType
    });
  } catch (error) {
    console.error('[CalculatedValueController] GET erreur:', error);
    return res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/tree-nodes/:nodeId/store-calculated-value
 * 
 * Stocke une valeur calculée dans le nœud
 */
router.post('/:nodeId/store-calculated-value', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const { calculatedValue, calculatedBy, submissionId } = req.body;

    if (!nodeId) {
      return res.status(400).json({ error: 'nodeId requis' });
    }

    if (calculatedValue === undefined) {
      return res.status(400).json({ error: 'calculatedValue requis' });
    }

    // 🎯 Log: debug trace de la requête
    console.log('[CalculatedValueController] POST store-calculated-value', {
      nodeId,
      calculatedValue,
      calculatedBy,
      submissionId,
      headers: {
        organization: req.headers['x-organization-id'],
        referer: req.headers['referer']
      }
    });

    // 🎯 Mettre à jour le nœud avec la valeur calculée
    const updated = await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: {
        calculatedValue: String(calculatedValue),
        calculatedAt: new Date(),
        calculatedBy: calculatedBy || 'unknown'
      },
      select: {
        id: true,
        label: true,
        calculatedValue: true,
        calculatedAt: true,
        calculatedBy: true
      }
    });

    console.log('✅ [CalculatedValueController] Valeur stockée:', {
      nodeId,
      calculatedValue,
      calculatedBy,
      submissionId
    });

    return res.json({
      success: true,
      nodeId: updated.id,
      calculatedValue: updated.calculatedValue,
      calculatedAt: updated.calculatedAt,
      calculatedBy: updated.calculatedBy
    });
  } catch (error) {
    console.error('[CalculatedValueController] POST erreur:', error);
    return res.status(500).json({ error: String(error) });
  }
});

/**
 * BATCH POST /api/tree-nodes/store-batch-calculated-values
 * 
 * Stocke plusieurs valeurs calculées à la fois
 * Utile après une soumission de formulaire complet
 */
router.post('/store-batch-calculated-values', async (req: Request, res: Response) => {
  try {
    const { values, submissionId } = req.body;

    if (!Array.isArray(values) || values.length === 0) {
      return res.status(400).json({ error: 'values doit être un tableau non-vide' });
    }

    // 🎯 Mettre à jour tous les nœuds
    const results = [];
    for (const { nodeId, calculatedValue, calculatedBy } of values) {
      if (!nodeId) continue;

      try {
        const updated = await prisma.treeBranchLeafNode.update({
          where: { id: nodeId },
          data: {
            calculatedValue: String(calculatedValue),
            calculatedAt: new Date(),
            calculatedBy: calculatedBy || 'unknown'
          }
        });

        results.push({
          nodeId,
          success: true,
          calculatedValue: updated.calculatedValue
        });
      } catch (err) {
        results.push({
          nodeId,
          success: false,
          error: String(err)
        });
      }
    }

    console.log('✅ [CalculatedValueController] BATCH stockage:', {
      submissionId,
      total: values.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return res.json({
      success: true,
      results,
      submissionId
    });
  } catch (error) {
    console.error('[CalculatedValueController] BATCH POST erreur:', error);
    return res.status(500).json({ error: String(error) });
  }
});

export default router;
