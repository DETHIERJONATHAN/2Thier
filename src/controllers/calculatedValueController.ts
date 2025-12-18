/**
 * 🎯 Contrôleur pour gérer les valeurs calculées
 * 
 * GET  /api/tree-nodes/:nodeId/calculated-value
 * POST /api/tree-nodes/:nodeId/store-calculated-value
 * POST /api/tree-nodes/store-batch-calculated-values
 */

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';

const router = Router();

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
        treeId: true // ✨ Ajouté pour operation-interpreter
      }
    });

    if (!node) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

    const preferSubmissionData = Boolean(submissionId);
    const forceFlag =
      pickQueryString('force') ||
      pickQueryString('forceRefresh') ||
      pickQueryString('refresh') ||
      pickQueryString('forceRecompute');
    const forceRecompute = Boolean(
      forceFlag && ['1', 'true', 'yes', 'force'].includes(forceFlag.toLowerCase())
    );

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
    const isTBLField = node.type === 'field' && node.metadata && typeof node.metadata === 'object';
    const hasTableLookup = isTBLField && 
      (node.metadata as any)?.lookup?.enabled === true && 
      (node.metadata as any)?.lookup?.tableReference;

    // 🆕 Vérifier si le node a une variable avec formule ou condition (pour les sum-total, etc.)
    const variableMeta2 = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { nodeId },
      select: { sourceType: true, sourceRef: true }
    });
    // 🔥 FIX: Inclure aussi sourceType="tree" avec condition: ou node-formula:
    const hasFormulaVariable = variableMeta2?.sourceRef?.startsWith('node-formula:');
    const hasConditionVariable = variableMeta2?.sourceRef?.startsWith('condition:');
    const hasTreeSourceVariable = variableMeta2?.sourceType === 'tree' && (hasFormulaVariable || hasConditionVariable);

    // 🔥 IMPORTANT: Ne PAS recalculer si une valeur calculée VALIDE existe déjà
    // Une valeur est "valide" si elle n'est pas vide, "0", ou "[]"
    const existingValue = node.calculatedValue;
    const hasValidExistingValue = existingValue && 
      existingValue !== '' && 
      existingValue !== '0' && 
      existingValue !== '[]' &&
      existingValue !== 'null' &&
      existingValue !== 'undefined';
    
    // Si on a déjà une valeur valide, la retourner directement sans recalculer
    if (hasValidExistingValue) {
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
    
    if (canRecalculateHere && node.treeId && isRealSubmission) {
      console.log(`🔥 [CalculatedValueController] Node "${node.label}" - recalcul table lookup:`, {
        nodeId, 
        hasTableLookup,
        submissionId
      });
      
      try {
        // 🚀 INVOQUER OPERATION-INTERPRETER pour les lookups uniquement
        const { evaluateVariableOperation } = await import('../components/TreeBranchLeaf/treebranchleaf-new/api/operation-interpreter.js');
        
        const result = await evaluateVariableOperation(
          nodeId,
          submissionId,
          prisma
        );
        
        console.log('🎯 [CalculatedValueController] Résultat operation-interpreter:', result);
        
        // Si on a un résultat VALIDE (pas 0, pas vide), le stocker ET le retourner
        if (result && (result.value !== undefined || result.operationResult !== undefined)) {
          const stringValue = String(result.value ?? result.operationResult);
          
          // Ne stocker que si la valeur est non-nulle et non-zéro
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

          return res.json({
            success: true,
            nodeId: node.id,
            label: node.label,
            value: stringValue,
            calculatedAt: new Date().toISOString(),
            calculatedBy: 'operation-interpreter-auto',
            type: node.type,
            fieldType: node.fieldType,
            freshCalculation: true
          });
        }
      } catch (operationErr) {
        console.error('❌ [CalculatedValueController] Erreur operation-interpreter:', operationErr);
        // Continue avec la valeur existante si échec du calcul
      }
    }

    // ✅ Retourner la valeur calculée du Nœud (par défaut)
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
