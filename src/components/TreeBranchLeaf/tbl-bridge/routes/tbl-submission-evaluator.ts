/**
 * 🎯 TBL PRISMA SUBMISSION EVALUATOR - ENDPOINT POUR ÉVALUATION COMPLÈTE
 * 
 * Endpoint qui évalue TOUTES les capacités (conditions, formules, tableaux) 
 * d'une soumission avec operation-interpreter.ts (système unifié) et sauvegarde
 * les traductions intelligentes directement en base TreeBranchLeafSubmissionData.
 */

import { Router, Request } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

type OperationSourceType = 'condition' | 'formula' | 'table' | 'neutral';

interface SubmissionDataEntry {
  id: string;
  submissionId: string;
  nodeId: string;
  value: string | null;
  sourceRef?: string | null;
  operationSource?: OperationSourceType | null;
  fieldLabel?: string | null;
  operationDetail?: Prisma.InputJsonValue | null;
  operationResult?: Prisma.InputJsonValue | null;
  lastResolved?: Date | null;
}
import { evaluateVariableOperation } from '../../treebranchleaf-new/api/operation-interpreter';
import { storeCalculatedValues } from '../../../../services/calculatedValuesService';

interface AuthenticatedRequest extends Request {
  user?: {
    userId?: string;
    organizationId?: string;
  };
}

const router = Router();
const prisma = new PrismaClient();

// Mémoire: staging des modifications (par session) pour ne pas écrire en base tant que non validé
type StageRecord = {
  id: string;
  organizationId: string;
  userId: string;
  treeId: string;
  submissionId?: string;
  formData: Record<string, unknown>;
  updatedAt: number; // epoch ms
};

const stagingStore = new Map<string, StageRecord>();
const STAGE_TTL_MS = 1000 * 60 * 60; // 1h

function pruneStages() {
  const now = Date.now();
  for (const [k, v] of stagingStore) {
    if (now - v.updatedAt > STAGE_TTL_MS) stagingStore.delete(k);
  }
}

function newStageId() {
  return `stage-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Utilitaire: nettoyer les formData des clés techniques (__mirror_, __formula_, __condition_, __*)
function sanitizeFormData(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map(sanitizeFormData);
  }
  if (input && typeof input === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (k.startsWith('__') || k.startsWith('__mirror_') || k.startsWith('__formula_') || k.startsWith('__condition_')) {
        continue;
      }
      // Omettre valeurs vides (null/undefined/"")
      if (v === null || v === undefined || v === '') continue;
      result[k] = sanitizeFormData(v);
    }
    return result;
  }
  return input;
}

const UUID_NODE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GENERATED_NODE_REGEX = /^node_[0-9]+_[a-z0-9]+$/i;
const SHARED_REFERENCE_REGEX = /^shared-ref-[a-z0-9-]+$/i;

function isSharedReferenceId(nodeId: string): boolean {
  return SHARED_REFERENCE_REGEX.test(nodeId);
}

function isAcceptedNodeId(nodeId: string): boolean {
  return UUID_NODE_REGEX.test(nodeId) || GENERATED_NODE_REGEX.test(nodeId) || isSharedReferenceId(nodeId);
}

async function resolveSharedReferenceAliases(sharedRefs: string[], treeId?: string) {
  if (!sharedRefs.length) {
    return new Map<string, string[]>();
  }

  const where: Prisma.TreeBranchLeafNodeWhereInput = {
    sharedReferenceId: { in: sharedRefs }
  };

  if (treeId) {
    where.treeId = treeId;
  }

  const aliases = await prisma.treeBranchLeafNode.findMany({
    where,
    select: { id: true, sharedReferenceId: true }
  });

  const map = new Map<string, string[]>();
  for (const alias of aliases) {
    if (!alias.sharedReferenceId) continue;
    if (!map.has(alias.sharedReferenceId)) {
      map.set(alias.sharedReferenceId, []);
    }
    map.get(alias.sharedReferenceId)!.push(alias.id);
  }

  return map;
}

async function applySharedReferenceValues(
  target: Map<string, unknown>,
  entries: Array<[string, unknown]>,
  treeId?: string
) {
  if (!entries.length) return;

  const sharedRefKeys = entries
    .map(([key]) => key)
    .filter(isSharedReferenceId);

  const aliasMap = sharedRefKeys.length
    ? await resolveSharedReferenceAliases(sharedRefKeys, treeId)
    : new Map<string, string[]>();

  for (const [key, value] of entries) {
    target.set(key, value);
    if (!isSharedReferenceId(key)) continue;

    const aliases = aliasMap.get(key) || [];
    for (const alias of aliases) {
      target.set(alias, value);
    }
  }
}

// Réutilisables: sauvegarde des entrées utilisateur (neutral) avec NO-OP
async function saveUserEntriesNeutral(
  submissionId: string,
  formData: Record<string, unknown> | undefined,
  treeId?: string
) {
  if (!formData || typeof formData !== 'object') return 0;

  let saved = 0;
  const entries = new Map<string, SubmissionDataEntry>();

  // 🚫 ÉTAPE 1 : Récupérer UNIQUEMENT les nodes avec "preview-unknown-user" dans calculatedBy (= DISPLAY fields à exclure)
  const displayNodes = treeId 
    ? await prisma.treeBranchLeafNode.findMany({
        where: { 
          treeId,
          calculatedBy: { contains: "preview-unknown-user" } // ✅ Seulement les displays avec preview-unknown-user
        },
        select: { id: true, calculatedBy: true, label: true }
      })
    : [];

  const displayNodeIds = new Set(displayNodes.map(n => n.id));
  
  if (displayNodeIds.size > 0) {
    console.log(`🚫 [SAVE] ${displayNodeIds.size} DISPLAY fields (preview-unknown-user) identifiés - ne seront PAS sauvegardés`);
  }

  const sharedRefKeys = Object.keys(formData).filter(isSharedReferenceId);
  const sharedRefAliasMap = sharedRefKeys.length
    ? await resolveSharedReferenceAliases(sharedRefKeys, treeId)
    : new Map<string, string[]>();

  for (const [key, value] of Object.entries(formData)) {
    if (key.startsWith('__mirror_') || key.startsWith('__formula_') || key.startsWith('__condition_')) {
      continue;
    }
    if (!isAcceptedNodeId(key)) continue;
    
    // 🚫 ÉTAPE 2 : Skip UNIQUEMENT les DISPLAY fields avec "preview-unknown-user"
    if (displayNodeIds.has(key)) {
      console.log(`🚫 [SAVE] Display field ignoré: ${key} (preview-unknown-user dans calculatedBy)`);
      continue; // Ne PAS sauvegarder les displays
    }
    
    // ✅ ÉTAPE 3 : Sauvegarder les champs complétés (skip null/undefined/vide)
    if (value === null || value === undefined || value === '') {
      continue; // Ne sauvegarder que les champs remplis
    }

    const storageIds = isSharedReferenceId(key)
      ? [key, ...(sharedRefAliasMap.get(key) || [])]
      : [key];

    for (const nodeId of storageIds) {
      if (!isAcceptedNodeId(nodeId)) continue;

      const serializedValue =
        value === null || value === undefined
          ? null
          : typeof value === 'string'
            ? value
            : JSON.stringify(value);

      const entry: SubmissionDataEntry = {
        id: `${submissionId}-${nodeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        submissionId,
        nodeId,
        value: serializedValue,
        operationSource: 'neutral',
        operationDetail: {
          inputValue: value,
          nodeId,
          action: 'user_input',
          sourceNodeId: key,
          aliasResolved: nodeId !== key
        } as Prisma.InputJsonValue
      };

      entries.set(nodeId, entry);
    }
  }

  for (const entry of entries.values()) {
    const key = { submissionId_nodeId: { submissionId: entry.submissionId, nodeId: entry.nodeId } } as const;
    const existing = await prisma.treeBranchLeafSubmissionData.findUnique({ where: key });
    const normalize = (v: unknown) => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'string') return v;
      try { return JSON.stringify(v); } catch { return String(v); }
    };
    if (existing) {
      // Idempotent: on ne considère que la valeur et la source; les détails/résultats neutres sont stables
      const changed = (
        normalize(existing.value) !== normalize(entry.value) ||
        (existing.operationSource || null) !== (entry.operationSource || null)
      );
      if (changed) {
        await prisma.treeBranchLeafSubmissionData.update({
          where: key,
          data: {
            value: entry.value,
            operationSource: 'neutral',
            operationDetail: entry.operationDetail
          }
        });
        saved++;
      }
    } else {
      await prisma.treeBranchLeafSubmissionData.create({ data: entry });
      saved++;
    }
  }
  return saved;
}

// Réutilisables: évaluation et sauvegarde des capacités pour une soumission (NO-OP)
async function evaluateCapacitiesForSubmission(
  submissionId: string,
  organizationId: string,
  userId: string | null,
  treeId: string
) {
  // Capacités pour l'arbre
  const capacities = await prisma.treeBranchLeafNodeVariable.findMany({
    where: { TreeBranchLeafNode: { treeId }, sourceRef: { not: null } },
    include: { TreeBranchLeafNode: { select: { id: true, label: true, fieldType: true, type: true } } }
  });

  const _tblContext = {
    submissionId,
    labelMap: new Map<string, string | null>(),
    valueMap: new Map<string, unknown>(),
    organizationId,
    userId: userId || 'unknown-user',
    treeId
  };

  const results: { updated: number; created: number; stored: number } = { updated: 0, created: 0, stored: 0 };
  const calculatedValuesToStore: { nodeId: string; calculatedValue: string | number | boolean; calculatedBy?: string }[] = [];

  for (const capacity of capacities) {
    const sourceRef = capacity.sourceRef!;
    
    // 🚫 SKIP les display fields - ils ne doivent JAMAIS être persistés
    const isDisplayField = capacity.TreeBranchLeafNode?.fieldType === 'DISPLAY' 
      || capacity.TreeBranchLeafNode?.type === 'DISPLAY';
    
    if (isDisplayField) {
      console.log(`🚫 [TBL CAPACITY] Display field ignoré: ${capacity.nodeId} (${capacity.TreeBranchLeafNode?.label})`);
      continue; // Skip complètement ce capacity
    }
    
    try {
      // ✨ UTILISATION DU SYSTÈME UNIFIÉ operation-interpreter.ts
      const capacityResult = await evaluateVariableOperation(
        capacity.nodeId,
        submissionId,
        prisma
      );
      const normalizedOperationSource: OperationSourceType = (typeof capacityResult.operationSource === 'string'
        ? (capacityResult.operationSource as string).toLowerCase()
        : 'neutral') as OperationSourceType;

      let parsedDetail: Prisma.InputJsonValue | null = null;
      try {
        parsedDetail = typeof capacityResult.operationDetail === 'string'
          ? (JSON.parse(capacityResult.operationDetail as unknown as string) as Prisma.InputJsonValue)
          : (capacityResult.operationDetail as unknown as Prisma.InputJsonValue);
      } catch {
        parsedDetail = capacityResult.operationDetail as unknown as Prisma.InputJsonValue;
      }

      const key = { submissionId_nodeId: { submissionId, nodeId: capacity.nodeId } } as const;
      const existing = await prisma.treeBranchLeafSubmissionData.findUnique({ where: key });
      const normalize = (v: unknown) => {
        if (v === null || v === undefined) return null;
        if (typeof v === 'string') return v;
        try { return JSON.stringify(v); } catch { return String(v); }
      };
      if (existing) {
        const changed = (
          (existing.sourceRef || null) !== (sourceRef || null) ||
          (existing.operationSource || null) !== (normalizedOperationSource || null) ||
          (existing.fieldLabel || null) !== ((capacity.TreeBranchLeafNode?.label || null)) ||
          normalize(existing.operationDetail) !== normalize(parsedDetail)
        );
        if (changed) {
          await prisma.treeBranchLeafSubmissionData.update({
            where: key,
            data: {
              value: null,
              sourceRef,
              operationSource: normalizedOperationSource,
              fieldLabel: capacity.TreeBranchLeafNode?.label || null,
              operationDetail: parsedDetail,
              lastResolved: new Date()
            }
          });
          results.updated++;
        }
      } else {
        await prisma.treeBranchLeafSubmissionData.create({
          data: {
            id: `${submissionId}-${capacity.nodeId}-cap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            submissionId,
            nodeId: capacity.nodeId,
            value: null,
            sourceRef,
            operationSource: normalizedOperationSource,
            fieldLabel: capacity.TreeBranchLeafNode?.label || null,
            operationDetail: parsedDetail,
            lastResolved: new Date()
          }
        });
        results.created++;
      }

      const rawValue = (capacityResult as { value?: unknown; calculatedValue?: unknown; result?: unknown }).value
        ?? (capacityResult as { calculatedValue?: unknown }).calculatedValue
        ?? (capacityResult as { result?: unknown }).result;
      const stringified = rawValue === null || rawValue === undefined ? null : String(rawValue).trim();
      if (rawValue !== null && rawValue !== undefined && stringified !== '' && stringified !== '∅') {
        let normalizedValue: string | number | boolean;
        if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
          normalizedValue = rawValue;
        } else {
          normalizedValue = String(rawValue);
        }

        calculatedValuesToStore.push({
          nodeId: capacity.nodeId,
          calculatedValue: normalizedValue,
          calculatedBy: `submission-${submissionId}`
        });
      }
    } catch (error) {
      console.error(`[TBL CAPACITY ERROR] ${sourceRef}:`, error);
    }
  }

  if (calculatedValuesToStore.length > 0) {
    try {
      // 🚨 IMPORTANT : Récupérer les infos des nodes pour filtrer les DISPLAY fields
      const nodeIds = calculatedValuesToStore.map(v => v.nodeId);
      const nodesInfo = await prisma.treeBranchLeafNode.findMany({
        where: { id: { in: nodeIds } },
        select: { id: true, fieldType: true, type: true }
      });
      const displayFieldIds = new Set(
        nodesInfo
          .filter(n => n.fieldType === 'DISPLAY' || n.type === 'DISPLAY')
          .map(n => n.id)
      );
      
      // 🚫 Filtrer les display fields AVANT de stocker
      const valuesToStoreFiltered = calculatedValuesToStore.filter(v => {
        if (displayFieldIds.has(v.nodeId)) {
          console.log(`🚫 [TBL CAPACITY STORE] Display field exclu de la persistence: ${v.nodeId}`);
          return false;
        }
        return true;
      });
      
      if (valuesToStoreFiltered.length > 0) {
        const storeResult = await storeCalculatedValues(valuesToStoreFiltered, submissionId);
        results.stored = storeResult.stored;
        console.log(`[TBL CAPACITY STORE] ✅ ${results.stored} valeurs stockées (${displayFieldIds.size} display fields exclus)`);
        if (!storeResult.success && storeResult.errors.length > 0) {
          console.warn('[TBL CAPACITY STORE] Certaines valeurs n\'ont pas pu être enregistrées:', storeResult.errors);
        }
      }
    } catch (storeError) {
      console.error('[TBL CAPACITY STORE] Erreur lors du stockage des valeurs calculées:', storeError);
    }
  }

  return results;
}

/**
 * 🔥 POST /api/tbl/submissions/:submissionId/evaluate-all
 * 
 * Évalue TOUTES les capacités d'une soumission avec TBL Prisma
 * et sauvegarde les traductions intelligentes en base
 */
router.post('/submissions/:submissionId/evaluate-all', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { forceUpdate = false } = req.body || {};
    
    // Récupérer l'organisation de l'utilisateur authentifié (endpoint PUT)
    const organizationId = req.headers['x-organization-id'] as string || (req as AuthenticatedRequest).user?.organizationId;
    const userId = (req as AuthenticatedRequest).user?.userId || 'unknown-user';
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organisation ID manquant - authentification requise'
      });
    }
    
    console.log('🔥 [TBL EVALUATE ALL] Début évaluation complète:', submissionId);
    console.log(`🏢 [TBL EVALUATE ALL] Organisation: ${organizationId}, Utilisateur: ${userId}`);
    
    // 1. Récupérer toutes les données de soumission avec capacités
    const submissionData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        submissionId,
        sourceRef: { not: null }
      },
      include: {
        TreeBranchLeafNode: {
          select: { label: true, type: true }
        }
      }
    });
    
    console.log(`📊 [TBL EVALUATE ALL] ${submissionData.length} éléments avec capacités trouvés`);
    
    if (submissionData.length === 0) {
      return res.json({
        success: true,
        message: 'Aucune capacité à évaluer',
        evaluated: 0
      });
    }
    
    // 2. Contexte d'évaluation (Maps initialisées)
  const _context = {
      submissionId,
      organizationId, // ✅ VRAIE ORGANISATION!
      userId, // ✅ VRAI UTILISATEUR!
      labelMap: new Map<string, string>(), // 🔥 MAPS INITIALISÉES
      valueMap: new Map<string, unknown>()
    };
    
  let evaluatedCount = 0;
  let errorCount = 0;
    const results = [];
    
    // 4. Évaluer chaque capacité avec TBL Prisma
    for (const data of submissionData) {
      try {
        // Skip si déjà évalué (sauf si forceUpdate)
        if (!forceUpdate && data.operationResult && data.lastResolved) {
          console.log(`⏭️ [TBL EVALUATE ALL] Skip ${data.sourceRef} (déjà évalué)`);
          continue;
        }
        
        console.log(`🔄 [TBL EVALUATE ALL] Évaluation ${data.sourceRef}...`);
        
        // ✨ Calculer avec operation-interpreter (système unifié)
        const calculationResult = await evaluateVariableOperation(
          data.nodeId,
          submissionId,
          prisma
        );
        
        console.log(`✅ [TBL EVALUATE ALL] Résultat pour ${data.sourceRef}:`, calculationResult.operationResult);

        // 5. Sauvegarder en base SEULEMENT si changement (NO-OP sinon)
        const normalize = (v: unknown) => {
          if (v === null || v === undefined) return null;
          if (typeof v === 'string') return v;
          try { return JSON.stringify(v); } catch { return String(v); }
        };

        const normalizedSource: Prisma.OperationSource = (
          typeof calculationResult.operationSource === 'string'
            ? calculationResult.operationSource.toLowerCase()
            : 'neutral'
        ) as Prisma.OperationSource;

        const nextDetail: Prisma.InputJsonValue = (() => {
          try {
            return typeof calculationResult.operationDetail === 'string'
              ? JSON.parse(calculationResult.operationDetail)
              : (calculationResult.operationDetail as unknown as Prisma.InputJsonValue);
          } catch { return calculationResult.operationDetail as unknown as Prisma.InputJsonValue; }
        })();

        const changed = (
          (data.operationSource || null) !== (normalizedSource || null) ||
          normalize(data.operationDetail) !== normalize(nextDetail)
        );

        if (changed) {
          await prisma.treeBranchLeafSubmissionData.update({
            where: { id: data.id },
            data: {
              operationDetail: nextDetail,
              operationSource: normalizedSource,
              lastResolved: new Date()
            }
          });
        } else {
          console.log(`⏭️ [TBL EVALUATE ALL] NO-OP ${data.sourceRef} (inchangé)`);
        }
        
        results.push({
          id: data.id,
          sourceRef: data.sourceRef,
          nodeLabel: data.TreeBranchLeafNode?.label,
          operationResult: calculationResult.operationResult,
          success: true
        });
        
        evaluatedCount++;
        
      } catch (error) {
        console.error(`❌ [TBL EVALUATE ALL] Erreur pour ${data.sourceRef}:`, error);
        
        results.push({
          id: data.id,
          sourceRef: data.sourceRef,
          nodeLabel: data.TreeBranchLeafNode?.label,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          success: false
        });
        
        errorCount++;
      }
    }
    
    console.log(`🎉 [TBL EVALUATE ALL] Terminé: ${evaluatedCount} évalués, ${errorCount} erreurs`);
    
    return res.json({
      success: true,
      submissionId,
      evaluated: evaluatedCount,
      errors: errorCount,
      total: submissionData.length,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TBL EVALUATE ALL] Erreur globale:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'évaluation complète',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * 📊 GET /api/tbl/submissions/:submissionId/verification
 * 
 * Vérifie que toutes les traductions intelligentes sont bien sauvegardées
 */
router.get('/submissions/:submissionId/verification', async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    console.log('🔍 [TBL VERIFICATION] Vérification soumission:', submissionId);
    
    // Récupérer les lignes concernées et compter en mémoire (operationResult est un JSON)
    const rows = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId, sourceRef: { not: null } },
      select: { operationResult: true }
    });

    const total = rows.length;
    const toStringSafely = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'string') return val;
      try { return JSON.stringify(val); } catch { return String(val); }
    };

    let withIntelligentTranslations = 0; // heuristique: contient "Si " ou "(=) Result ("
    let withOldMessages = 0;            // heuristique: message legacy
    let withErrors = 0;                 // null/empty

    for (const r of rows) {
      const s = toStringSafely(r.operationResult).trim();
      if (!s) {
        withErrors++;
        continue;
      }
      if (s.includes('Évalué dynamiquement par TBL Prisma')) {
        withOldMessages++;
      }
      if (s.includes('Si ') || /(=) Result \(/.test(s) || s.includes('(/)')) {
        withIntelligentTranslations++;
      }
    }

    const successRate = total > 0 ? Math.round(((total - withOldMessages - withErrors) / total) * 100) : 100;

    return res.json({
      success: true,
      submissionId,
      verification: {
        total,
        withIntelligentTranslations,
        withOldMessages,
        withErrors,
        successRate: `${successRate}%`
      },
      status: withOldMessages === 0 && withErrors === 0 ? 'perfect' : 'needs_improvement',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TBL VERIFICATION] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification'
    });
  }
});

/**
 * 🔥 POST /api/tbl/submissions/create-and-evaluate
 * 
 * ENDPOINT TOUT-EN-UN : Crée une soumission ET l'évalue avec TBL Prisma
 * SANS JAMAIS passer par les routes TreeBranchLeaf legacy !
 */
router.post('/submissions/create-and-evaluate', async (req, res) => {
  try {
    const { treeId, clientId, formData, status = 'draft', providedName, reuseSubmissionId } = req.body;
    const cleanFormData = formData && typeof formData === 'object' ? (sanitizeFormData(formData) as Record<string, unknown>) : undefined;
    
    // Récupérer l'organisation de l'utilisateur authentifié (endpoint POST)
    const organizationId = req.headers['x-organization-id'] as string || (req as AuthenticatedRequest).user?.organizationId;
    const userId = (req as AuthenticatedRequest).user?.userId || 'unknown-user';
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organisation ID manquant - authentification requise'
      });
    }
    
    console.log('🔥 [TBL CREATE-AND-EVALUATE] Début création complète TBL Prisma');
    console.log(`🏢 [TBL CREATE-AND-EVALUATE] Organisation: ${organizationId}, Utilisateur: ${userId}`);
    console.log(`📋 [TBL CREATE-AND-EVALUATE] TreeId reçu: ${treeId}, ClientId: ${clientId}`);
    
    // 1. Vérifier et récupérer l'arbre réel depuis la base de données
    let effectiveTreeId = treeId;
    
    // Si pas de treeId fourni ou si l'arbre n'existe pas, récupérer le premier arbre disponible
    if (!effectiveTreeId) {
      console.log('⚠️ [TBL CREATE-AND-EVALUATE] Aucun treeId fourni, recherche du premier arbre disponible...');
      const firstTree = await prisma.treeBranchLeafTree.findFirst({
        select: { id: true, name: true }
      });
      
      if (!firstTree) {
        throw new Error('Aucun arbre TreeBranchLeaf trouvé dans la base de données');
      }
      
      effectiveTreeId = firstTree.id;
      console.log(`🌳 [TBL CREATE-AND-EVALUATE] Arbre par défaut sélectionné: ${effectiveTreeId} (${firstTree.name})`);
    } else {
      // Vérifier que l'arbre fourni existe bien
      const treeExists = await prisma.treeBranchLeafTree.findUnique({
        where: { id: effectiveTreeId },
        select: { id: true, name: true }
      });
      
      if (!treeExists) {
        console.log(`❌ [TBL CREATE-AND-EVALUATE] Arbre ${effectiveTreeId} introuvable, recherche d'un arbre alternatif...`);
        const firstTree = await prisma.treeBranchLeafTree.findFirst({
          select: { id: true, name: true }
        });
        
        if (!firstTree) {
          throw new Error('Aucun arbre TreeBranchLeaf trouvé dans la base de données');
        }
        
        effectiveTreeId = firstTree.id;
        console.log(`🌳 [TBL CREATE-AND-EVALUATE] Arbre alternatif sélectionné: ${effectiveTreeId} (${firstTree.name})`);
      } else {
        console.log(`✅ [TBL CREATE-AND-EVALUATE] Arbre validé: ${effectiveTreeId} (${treeExists.name})`);
      }
    }
    
    // 2. Vérifier et gérer le Lead (clientId)
    // 🔥 IMPORTANT: TOUT DEVIS DOIT AVOIR UN LEAD ASSOCIÉ (organizationId + treeId + leadId)
    // ⚠️ VALIDATION STRICTE: Le lead est OBLIGATOIRE, pas de création automatique de lead par défaut
    
    if (!clientId) {
      console.log('❌ [TBL CREATE-AND-EVALUATE] Aucun leadId fourni - REQUIS');
      return res.status(400).json({
        success: false,
        error: 'Lead obligatoire',
        message: 'Un lead doit être sélectionné pour créer un devis. Veuillez sélectionner ou créer un lead.'
      });
    }
    
    let effectiveLeadId = clientId;
    
    // Vérifier que le lead fourni existe bien
    const leadExists = await prisma.lead.findUnique({
      where: { id: effectiveLeadId },
      select: { id: true, firstName: true, lastName: true, email: true, organizationId: true }
    });
    
    if (!leadExists) {
      console.log(`❌ [TBL CREATE-AND-EVALUATE] Lead ${effectiveLeadId} introuvable`);
      return res.status(404).json({
        success: false,
        error: 'Lead introuvable',
        message: `Le lead ${effectiveLeadId} n'existe pas. Veuillez sélectionner un lead valide.`
      });
    }
    
    // Vérifier que le lead appartient bien à la même organisation
    if (leadExists.organizationId !== organizationId) {
      console.log(`❌ [TBL CREATE-AND-EVALUATE] Le lead ${effectiveLeadId} n'appartient pas à l'organisation ${organizationId}`);
      return res.status(403).json({
        success: false,
        error: 'Lead non autorisé',
        message: 'Le lead sélectionné n\'appartient pas à votre organisation.'
      });
    }
    
    console.log(`✅ [TBL CREATE-AND-EVALUATE] Lead validé: ${effectiveLeadId} (${leadExists.firstName} ${leadExists.lastName})`);
    effectiveLeadId = leadExists.id;
    
    // 3. Vérifier l'utilisateur si fourni
    let effectiveUserId = userId;
    
    if (effectiveUserId) {
      const userExists = await prisma.user.findUnique({
        where: { id: effectiveUserId },
        select: { id: true, firstName: true, lastName: true }
      });
      
      if (!userExists) {
        console.log(`❌ [TBL CREATE-AND-EVALUATE] User ${effectiveUserId} introuvable, soumission sans utilisateur`);
        effectiveUserId = null;
      } else {
        console.log(`✅ [TBL CREATE-AND-EVALUATE] User validé: ${effectiveUserId} (${userExists.firstName} ${userExists.lastName})`);
      }
    }
    
    // 4. Réutiliser éventuellement une soumission existante au lieu d'en créer une nouvelle
    let submissionId = reuseSubmissionId as string | undefined;
    if (submissionId) {
      const existing = await prisma.treeBranchLeafSubmission.findUnique({ where: { id: submissionId }, select: { id: true } });
      if (!existing) submissionId = undefined;
    }
    
    // 🔥 NOUVEAU: Chercher une submission draft existante AVANT de créer une nouvelle
    // ⚠️ IMPORTANT: On cherche TOUJOURS avec les 3 critères: organizationId + treeId + leadId
    // Car désormais, TOUT devis a un lead associé (créé par défaut si nécessaire)
    if (!submissionId) {
      const existingDraft = await prisma.treeBranchLeafSubmission.findFirst({
        where: {
          treeId: effectiveTreeId,
          leadId: effectiveLeadId,
          organizationId: organizationId,
          status: 'draft'
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true }
      });
      
      if (existingDraft) {
        submissionId = existingDraft.id;
        console.log(`♻️ [TBL CREATE-AND-EVALUATE] Réutilisation du draft existant: ${submissionId} (leadId: ${effectiveLeadId})`);
      }
    }
    
    if (!submissionId) {
      submissionId = `tbl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await prisma.treeBranchLeafSubmission.create({
        data: {
          id: submissionId,
          treeId: effectiveTreeId,
          userId: effectiveUserId,
          leadId: effectiveLeadId,
          organizationId: organizationId, // 🔥 IMPORTANT pour retrouver les drafts
          status: status || 'draft',
          summary: { name: providedName || `Devis TBL ${new Date().toLocaleDateString()}` },
          exportData: cleanFormData || {},
          completedAt: status === 'completed' ? new Date() : null,
          updatedAt: new Date()
        }
      });
      console.log(`✅ [TBL CREATE-AND-EVALUATE] Soumission créée: ${submissionId} pour organization ${organizationId}`);
    } else {
      // Mettre à jour la submission existante
      await prisma.treeBranchLeafSubmission.update({
        where: { id: submissionId },
        data: {
          status: status || 'draft',
          summary: { name: providedName || `Devis TBL ${new Date().toLocaleDateString()}` },
          exportData: cleanFormData || {},
          completedAt: status === 'completed' ? new Date() : null,
          updatedAt: new Date()
        }
      });
      console.log(`♻️ [TBL CREATE-AND-EVALUATE] Soumission mise à jour: ${submissionId}`);
    }
    
    // 5. Sauvegarder d'abord les données UTILISATEUR en base, puis évaluer et sauvegarder les CAPACITÉS
    if (cleanFormData && typeof cleanFormData === 'object') {
      // A. Sauvegarder les données utilisateur directes (réutilise NO-OP)
  const savedCount = await saveUserEntriesNeutral(submissionId!, cleanFormData, effectiveTreeId);
      if (savedCount > 0) console.log(`✅ [TBL CREATE-AND-EVALUATE] ${savedCount} entrées utilisateur enregistrées`);
      
      // B. Récupérer toutes les capacités (conditions, formules, tables) depuis TreeBranchLeafNodeVariable
      const capacities = await prisma.treeBranchLeafNodeVariable.findMany({
        where: {
          TreeBranchLeafNode: {
            treeId: effectiveTreeId
          },
          sourceRef: { not: null }
        },
        include: {
          TreeBranchLeafNode: {
            select: { id: true, label: true }
          }
        }
      });
      
      console.log(`🎯 [TBL CREATE-AND-EVALUATE] ${capacities.length} capacités trouvées`);
      
      // C. Évaluer et persister les capacités avec NO-OP
      const evalStats = await evaluateCapacitiesForSubmission(submissionId!, organizationId!, userId || null, effectiveTreeId);
      console.log(`✅ [TBL CREATE-AND-EVALUATE] Capacités: ${evalStats.updated} mises à jour, ${evalStats.created} créées, ${evalStats.stored} valeurs stockées`);
    }
    
    // 3. Évaluation immédiate déjà effectuée via operation-interpreter ci-dessus.
    //    On évite une seconde passe redondante qui réécrit inutilement en base.
    
    // 4. Retourner la soumission complète
    const finalSubmission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id: submissionId },
      include: {
        TreeBranchLeafSubmissionData: true
      }
    });
    
    return res.status(201).json({
      success: true,
      message: 'Soumission créée et évaluée avec TBL Prisma',
      submission: finalSubmission
    });
    
  } catch (error) {
    console.error('❌ [TBL CREATE-AND-EVALUATE] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur interne'
    });
  }
});

/**
 * 🔄 PUT /api/tbl/submissions/:submissionId/update-and-evaluate
 * 
 * Met à jour les données utilisateur d'une soumission existante (sans recréer)
 * puis évalue toutes les capacités et sauvegarde les résultats (NO-OP).
 */
router.put('/submissions/:submissionId/update-and-evaluate', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { formData, status } = req.body || {};
    const cleanFormData = formData && typeof formData === 'object' ? (sanitizeFormData(formData) as Record<string, unknown>) : undefined;

    const organizationId = req.headers['x-organization-id'] as string || (req as AuthenticatedRequest).user?.organizationId;
    const userId = (req as AuthenticatedRequest).user?.userId || null;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organisation ID manquant - authentification requise' });
    }

    const submission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id: submissionId },
      select: { id: true, treeId: true, status: true, exportData: true }
    });
    if (!submission) {
      return res.status(404).json({ success: false, error: 'Soumission introuvable' });
    }

    // 1) Sauvegarder les données utilisateur (NO-OP)
  const saved = await saveUserEntriesNeutral(submissionId, cleanFormData, submission.treeId);

    // 2) Option: mettre à jour le statut de la soumission si fourni (NO-OP)
    const updateData: Prisma.TreeBranchLeafSubmissionUpdateInput = {};
    if (status && status !== submission.status) {
      updateData.status = status;
    }
    // 2b) Mettre à jour exportData si fourni (NO-OP)
    if (cleanFormData) {
      const normalize = (v: unknown) => {
        if (v === null || v === undefined) return null;
        if (typeof v === 'string') return v;
        try { return JSON.stringify(v); } catch { return String(v); }
      };
      if (normalize(submission.exportData) !== normalize(cleanFormData)) {
        updateData.exportData = cleanFormData as unknown as Prisma.InputJsonValue;
      }
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.treeBranchLeafSubmission.update({ where: { id: submissionId }, data: updateData });
    }

    // 3) Évaluer et persister les capacités liées à l'arbre
    const stats = await evaluateCapacitiesForSubmission(submissionId, organizationId, userId, submission.treeId);

    // 4) Retourner la soumission complète
    const finalSubmission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id: submissionId },
      include: { TreeBranchLeafSubmissionData: true }
    });

    return res.json({
      success: true,
      message: `Soumission mise à jour (${saved} entrées) et évaluée (${stats.updated} mises à jour, ${stats.created} créées, ${stats.stored} valeurs stockées)`,
      submission: finalSubmission
    });

  } catch (error) {
    console.error('❌ [TBL UPDATE-AND-EVALUATE] Erreur:', error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

/**
 * 🧪 POST /api/tbl/submissions/preview-evaluate
 *
 * Évalue les capacités pour un arbre donné EN MÉMOIRE uniquement (aucune écriture en base).
 * Permet un flux "prévisualisation" pour un nouveau devis ou pour tester des changements
 * avant de sauvegarder. Peut fusionner les données d'une soumission existante (baseSubmissionId)
 * avec des overrides (formData) pour simuler l'état final sans persister.
 */
router.post('/submissions/preview-evaluate', async (req, res) => {
  try {
    const { treeId, formData, baseSubmissionId, leadId } = req.body || {};

    const organizationId = req.headers['x-organization-id'] as string || (req as AuthenticatedRequest).user?.organizationId;
    const userId = (req as AuthenticatedRequest).user?.userId || 'unknown-user';

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organisation ID manquant - authentification requise' });
    }

    // 1) Résoudre l'arbre
    let effectiveTreeId = treeId as string | undefined;
    if (!effectiveTreeId) {
      const firstTree = await prisma.treeBranchLeafTree.findFirst({ select: { id: true } });
      if (!firstTree) {
        return res.status(404).json({ success: false, error: 'Aucun arbre TreeBranchLeaf trouvé' });
      }
      effectiveTreeId = firstTree.id;
    } else {
      const exists = await prisma.treeBranchLeafTree.findUnique({ where: { id: effectiveTreeId }, select: { id: true } });
      if (!exists) {
        return res.status(404).json({ success: false, error: `Arbre introuvable: ${effectiveTreeId}` });
      }
    }

    // 2) Préparer labelMap pour tous les nodes de l'arbre
    const nodes = await prisma.treeBranchLeafNode.findMany({ where: { treeId: effectiveTreeId }, select: { id: true, label: true } });
    const labelMap = new Map<string, string | null>();
    for (const n of nodes) labelMap.set(n.id, n.label);

    // 3) Construire valueMap: données existantes (si baseSubmissionId) + overrides formData
    const valueMap = new Map<string, unknown>();
    
    // 3a) 🆕 Charger les données du Lead si présent
    if (leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId as string },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          company: true,
          leadNumber: true,
          linkedin: true,
          website: true,
          status: true,
          notes: true,
          data: true
        }
      });
      
      if (lead) {
        // Ajouter les champs du Lead dans le valueMap avec le préfixe "lead."
        valueMap.set('lead.id', lead.id);
        valueMap.set('lead.firstName', lead.firstName);
        valueMap.set('lead.lastName', lead.lastName);
        valueMap.set('lead.email', lead.email);
        valueMap.set('lead.phone', lead.phone);
        valueMap.set('lead.company', lead.company);
        valueMap.set('lead.leadNumber', lead.leadNumber);
        valueMap.set('lead.linkedin', lead.linkedin);
        valueMap.set('lead.website', lead.website);
        valueMap.set('lead.status', lead.status);
        valueMap.set('lead.notes', lead.notes);
        
        // ✅ Extraire les données de l'objet JSON `data` s'il existe
        if (lead.data && typeof lead.data === 'object') {
          const leadData = lead.data as Record<string, unknown>;
          
          // Ajouter le code postal s'il existe dans data
          if (leadData.postalCode) {
            valueMap.set('lead.postalCode', leadData.postalCode);
            console.log(`[PREVIEW-EVALUATE] ✅ Code postal Lead: ${leadData.postalCode}`);
          } else if (leadData.address && typeof leadData.address === 'string') {
            // 🆕 Extraire le code postal depuis l'adresse (format: "Rue..., 5150 Ville, Pays")
            const postalCodeMatch = leadData.address.match(/\b(\d{4})\b/);
            if (postalCodeMatch) {
              const extractedPostalCode = postalCodeMatch[1];
              valueMap.set('lead.postalCode', extractedPostalCode);
              console.log(`[PREVIEW-EVALUATE] ✅ Code postal extrait: ${extractedPostalCode} depuis "${leadData.address}"`);
            } else {
              console.log(`[PREVIEW-EVALUATE] ⚠️ Aucun code postal trouvé dans l'adresse: "${leadData.address}"`);
            }
          }
          
          if (leadData.address) {
            valueMap.set('lead.address', leadData.address);
          }
          if (leadData.city) {
            valueMap.set('lead.city', leadData.city);
          }
          if (leadData.country) {
            valueMap.set('lead.country', leadData.country);
          }
        }
      }
    }
    
    // 3b) Charger les données de la submission existante
    if (baseSubmissionId) {
      const existingData = await prisma.treeBranchLeafSubmissionData.findMany({
        where: { submissionId: baseSubmissionId },
        select: { nodeId: true, value: true }
      });

      const existingEntries = existingData.map(row => [row.nodeId, row.value] as [string, unknown]);
      await applySharedReferenceValues(valueMap, existingEntries, effectiveTreeId);
    }
    
    // 3c) Appliquer les overrides du formData
    if (formData && typeof formData === 'object') {
      const overrides = Object.entries(formData as Record<string, unknown>).filter(([k]) => !k.startsWith('__'));
      await applySharedReferenceValues(valueMap, overrides as Array<[string, unknown]>, effectiveTreeId);
    }

    // 🔍 [Auto-Clean DEBUG] Logique d'auto-nettoyage pour les sélections Plan/Inclinaison
    if (formData && typeof formData === 'object') {
      const formEntries = Object.entries(formData as Record<string, unknown>);
      console.log(`🔍 [Auto-Clean DEBUG] Vérification auto-nettoyage sur ${formEntries.length} champs formData`);
      
      // Mapping des références partagées pour chaque option
      const sharedReferenceMapping = {
        'plan': ['shared-ref-1764095668124-l53956', 'shared-ref-1764095679973-fad7d7', 'shared-ref-1764093957109-52vog', 'shared-ref-1764093355187-f83m8h'],
        'inclinaison': ['shared-ref-1764093957109-52vog', 'shared-ref-1764093355187-f83m8h']
      };

      for (const [nodeId, value] of formEntries) {
        if (!nodeId.startsWith('__') && value !== null && value !== undefined && value !== '') {
          console.log(`🔍 [Auto-Clean DEBUG] Analyse du champ ${nodeId} = "${value}"`);
          
          // Récupérer le node pour vérifier s'il a des références partagées
          const nodeInfo = await prisma.treeBranchLeafNode.findUnique({
            where: { id: nodeId },
            select: { 
              id: true, 
              label: true, 
              sharedReferenceIds: true,
              TreeBranchLeafSelectConfig: {
                select: {
                  id: true,
                  options: true
                }
              }
            }
          });

          if (nodeInfo?.TreeBranchLeafSelectConfig?.options) {
            // Les options sont maintenant stockées dans un JSON
            const options = Array.isArray(nodeInfo.TreeBranchLeafSelectConfig.options) 
              ? nodeInfo.TreeBranchLeafSelectConfig.options 
              : [];
            
            console.log(`🔍 [Auto-Clean DEBUG] Node ${nodeId} (${nodeInfo.label}) a ${options.length} options`);
            
            // Trouver l'option sélectionnée
            const selectedOption = options.find((opt: any) => opt.value === value);
            if (selectedOption?.sharedReferenceIds?.length) {
              console.log(`🔍 [Auto-Clean DEBUG] Option sélectionnée "${selectedOption.label}" (${selectedOption.value}) a des références partagées:`, selectedOption.sharedReferenceIds);
              
              // Identifier le type d'option (plan ou inclinaison)
              let optionType: string | null = null;
              if (JSON.stringify(selectedOption.sharedReferenceIds) === JSON.stringify(sharedReferenceMapping.plan)) {
                optionType = 'plan';
              } else if (JSON.stringify(selectedOption.sharedReferenceIds) === JSON.stringify(sharedReferenceMapping.inclinaison)) {
                optionType = 'inclinaison';
              }

              if (optionType) {
                console.log(`🔍 [Auto-Clean DEBUG] Option de type "${optionType}" détectée`);
                
                // Identifier les références à nettoyer (les autres types)
                const referencesToClean = optionType === 'plan' 
                  ? sharedReferenceMapping.inclinaison 
                  : sharedReferenceMapping.plan;
                
                console.log(`🔍 [Auto-Clean DEBUG] Nettoyage des références:`, referencesToClean);
                
                // Trouver tous les nodes qui utilisent ces références dans l'arbre
                const nodesToClean = await prisma.treeBranchLeafNode.findMany({
                  where: {
                    treeId: effectiveTreeId,
                    sharedReferenceIds: { hasSome: referencesToClean }
                  },
                  select: { id: true, label: true, sharedReferenceIds: true }
                });

                console.log(`🔍 [Auto-Clean DEBUG] ${nodesToClean.length} nodes à nettoyer trouvés`);
                
                // Nettoyer ces nodes dans le valueMap (données temporaires)
                for (const nodeToClean of nodesToClean) {
                  if (valueMap.has(nodeToClean.id)) {
                    const oldValue = valueMap.get(nodeToClean.id);
                    valueMap.delete(nodeToClean.id);
                    console.log(`🔍 [Auto-Clean DEBUG] ✅ Node ${nodeToClean.id} (${nodeToClean.label}) nettoyé (était: "${oldValue}")`);
                  }
                }
              }
            }
          }
        }
      }
    }

    // 4) Récupérer les capacités de l'arbre
    const capacitiesRaw = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { TreeBranchLeafNode: { treeId: effectiveTreeId }, sourceRef: { not: null } },
      include: { TreeBranchLeafNode: { select: { id: true, label: true } } }
    });
    
    // 🔑 TRIER les capacités: formules simples d'abord, formules composées (sum-total) ensuite
    // Cela garantit que les valeurs des formules simples sont dans le valueMap avant d'évaluer les sommes
    const capacities = capacitiesRaw.sort((a, b) => {
      const aIsSumFormula = a.sourceRef?.includes('sum-formula') || a.sourceRef?.includes('sum-total') ? 1 : 0;
      const bIsSumFormula = b.sourceRef?.includes('sum-formula') || b.sourceRef?.includes('sum-total') ? 1 : 0;
      return aIsSumFormula - bIsSumFormula; // Les sum-formulas sont évaluées en dernier
    });
    console.log(`[UNIVERSAL] 🔄 Ordre d'évaluation:`, capacities.map(c => `${c.TreeBranchLeafNode?.label || c.nodeId} (${c.sourceRef?.includes('sum-formula') ? 'SUM' : 'SIMPLE'})`));

    // 5) Contexte d'évaluation (submissionId fictif)
    const submissionId = baseSubmissionId || `preview-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    // 🔍 DEBUG: Afficher le contenu du valueMap
    console.log(`[UNIVERSAL] 📦 valueMap contient ${valueMap.size} entrées:`);
    for (const [key, val] of valueMap.entries()) {
      console.log(`  - ${key} = ${val}`);
    }
    
    const context = {
      submissionId,
      organizationId,
      userId,
      treeId: effectiveTreeId,
      labelMap,
      valueMap
    } as const;

    const results: Array<{ nodeId: string; nodeLabel: string | null; sourceRef: string; operationSource: string; operationResult: unknown; operationDetail: unknown }>= [];
    let evaluated = 0;
    for (const cap of capacities) {
      try {
        console.log(`[UNIVERSAL] 🚀 Évaluation preview pour nodeId: ${cap.nodeId}, sourceRef: ${cap.sourceRef}`);
        
        // NOUVEAU : Utiliser le système universel operation-interpreter
        // La fonction attend maintenant 4 paramètres : (variableNodeId, submissionId, prisma, valueMap)
        const evaluation = await evaluateVariableOperation(
          cap.nodeId,              // variableNodeId
          context.submissionId,     // submissionId
          prisma,                   // prismaClient
          context.valueMap          // valueMap (données temporaires du formulaire)
        );
        
        console.log(`[UNIVERSAL] ✅ Résultat: value="${evaluation.value}", operationResult="${evaluation.operationResult}"`);
        
        // 🔑 CRITIQUE: Ajouter la valeur calculée au valueMap pour que les formules suivantes puissent l'utiliser
        // Cela permet aux formules composées (ex: sum-total) de récupérer les valeurs des formules simples (ex: Mur)
        if (evaluation.value !== null && evaluation.value !== undefined && evaluation.value !== '∅') {
          context.valueMap.set(cap.nodeId, evaluation.value);
          console.log(`[UNIVERSAL] 📥 Valeur ajoutée au valueMap: ${cap.nodeId} = ${evaluation.value}`);
        }
        
        results.push({
          nodeId: cap.nodeId,
          nodeLabel: cap.TreeBranchLeafNode?.label || null,
          sourceRef: cap.sourceRef!,
          operationSource: evaluation.operationSource as string,
          // 🔥 STRUCTURE CORRECTE: value directement au niveau racine pour SmartCalculatedField
          value: evaluation.value,              // ✅ VALEUR CALCULÉE (utilisée par SmartCalculatedField)
          calculatedValue: evaluation.value,    // ✅ ALIAS pour compatibilité
          operationResult: {
            value: evaluation.value,            // ✅ Aussi dans operationResult pour traçabilité
            humanText: evaluation.operationResult,  // ✅ Le texte explicatif
            detail: evaluation.operationDetail
          },
          operationDetail: evaluation.operationDetail,
          // 🎨 NOUVEAU: Configuration d'affichage depuis TreeBranchLeafNodeVariable
          displayConfig: {
            displayFormat: cap.displayFormat || 'number',
            unit: cap.unit || null,
            precision: cap.precision ?? 2,
            visibleToUser: cap.visibleToUser ?? true
          }
        });
        evaluated++;
      } catch (e) {
        console.error(`[UNIVERSAL] ❌ Erreur évaluation pour nodeId ${cap.nodeId}:`, e);
        // Ne bloque pas l'ensemble de la prévisualisation
        const errorMessage = e instanceof Error ? e.message : 'Erreur inconnue';
        results.push({
          nodeId: cap.nodeId,
          nodeLabel: cap.TreeBranchLeafNode?.label || null,
          sourceRef: cap.sourceRef!,
          operationSource: 'error',
          value: null,                    // ✅ Valeur nulle pour les erreurs
          calculatedValue: null,          // ✅ ALIAS
          operationResult: { 
            value: null,                  // ✅ Valeur nulle
            humanText: errorMessage,      // ✅ Message d'erreur
            error: errorMessage 
          },
          operationDetail: null,
          // 🎨 Configuration d'affichage même en cas d'erreur
          displayConfig: {
            displayFormat: cap.displayFormat || 'number',
            unit: cap.unit || null,
            precision: cap.precision ?? 2,
            visibleToUser: cap.visibleToUser ?? true
          }
        });
      }
    }

    // 🔍 DEBUG: Log final des résultats avant envoi
    console.log(`[PREVIEW-EVALUATE] 📤 Envoi réponse avec ${results.length} résultats:`);
    results.forEach((r, i) => {
      console.log(`  [${i}] nodeId="${r.nodeId}", label="${r.nodeLabel}", value="${r.value}" (calculatedValue="${r.calculatedValue}")`);
    });

    // 💾 STOCKER LES VALEURS CALCULÉES DANS PRISMA
    try {
      // 🚨 IMPORTANT : Récupérer les infos des nodes pour filtrer les DISPLAY fields
      const nodeIds = results.map(r => r.nodeId);
      const nodesInfo = await prisma.treeBranchLeafNode.findMany({
        where: { id: { in: nodeIds } },
        select: { id: true, fieldType: true, type: true }
      });
      const displayFieldIds = new Set(
        nodesInfo
          .filter(n => n.fieldType === 'DISPLAY' || n.type === 'DISPLAY')
          .map(n => n.id)
      );
      
      const calculatedValues = results
        .map(r => {
          const candidate = r.value ?? (r as { calculatedValue?: unknown }).calculatedValue;
          return { ...r, candidate };
        })
        .filter(r => {
          // 🚫 EXCLURE les display fields - ils ne doivent JAMAIS être persistés
          if (displayFieldIds.has(r.nodeId)) {
            console.log(`🚫 [PREVIEW-EVALUATE] Display field exclu de la persistence: ${r.nodeId}`);
            return false;
          }
          // Exclure null, undefined, chaînes vides, et symboles de vide (∅)
          if (r.candidate === null || r.candidate === undefined) return false;
          const strValue = String(r.candidate).trim();
          if (strValue === '' || strValue === '∅') return false;
          return true;
        })
        .map(r => ({
          nodeId: r.nodeId,
          calculatedValue: String(r.candidate),
          calculatedBy: `preview-${userId}`
        }));

      if (calculatedValues.length > 0) {
        await storeCalculatedValues(calculatedValues, submissionId);
        console.log(`[PREVIEW-EVALUATE] ✅ ${calculatedValues.length} valeurs stockées dans Prisma (${displayFieldIds.size} display fields exclus)`);
      }
    } catch (storeError) {
      console.error(`[PREVIEW-EVALUATE] ⚠️ Erreur stockage valeurs calculées:`, storeError);
      // Ne pas bloquer la réponse si le stockage échoue
    }

    return res.json({
      success: true,
      mode: 'preview',
      submissionId,
      treeId: effectiveTreeId,
      evaluated,
      results
    });

  } catch (error) {
    console.error('❌ [TBL PREVIEW-EVALUATE] Erreur:', error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

/**
 * 🧱 STAGING API — aucune écriture DB tant que non "commit"
 */
router.post('/submissions/stage', async (req, res) => {
  try {
    pruneStages();
    const { stageId, treeId, submissionId, formData } = req.body || {};
    const organizationId = req.headers['x-organization-id'] as string || (req as AuthenticatedRequest).user?.organizationId;
    const userId = (req as AuthenticatedRequest).user?.userId || 'unknown-user';
    if (!organizationId) return res.status(400).json({ success: false, error: 'Organisation ID manquant' });

    // Résoudre treeId
    let effectiveTreeId = treeId as string | undefined;
    if (!effectiveTreeId) {
      const firstTree = await prisma.treeBranchLeafTree.findFirst({ select: { id: true } });
      if (!firstTree) return res.status(404).json({ success: false, error: 'Aucun arbre trouvé' });
      effectiveTreeId = firstTree.id;
    }

    const id = stageId || newStageId();
    const clean = formData && typeof formData === 'object' ? (sanitizeFormData(formData) as Record<string, unknown>) : {};
    const existing = stagingStore.get(id);
    const merged: StageRecord = {
      id,
      organizationId,
      userId,
      treeId: effectiveTreeId!,
      submissionId: submissionId || existing?.submissionId,
      formData: { ...(existing?.formData || {}), ...clean },
      updatedAt: Date.now()
    };
    stagingStore.set(id, merged);
    return res.json({ success: true, stage: merged });
  } catch (e) {
    return res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erreur interne' });
  }
});

router.post('/submissions/stage/preview', async (req, res) => {
  try {
    pruneStages();
    const { stageId } = req.body || {};
    const stage = stageId ? stagingStore.get(stageId) : undefined;
    if (!stage) return res.status(404).json({ success: false, error: 'Stage introuvable' });

    // Utilise le même moteur que preview-evaluate
    const nodes = await prisma.treeBranchLeafNode.findMany({ where: { treeId: stage.treeId }, select: { id: true, label: true } });
    const labelMap = new Map(nodes.map(n => [n.id, n.label] as const));
    const valueMap = new Map<string, unknown>();
    if (stage.submissionId) {
      const existingData = await prisma.treeBranchLeafSubmissionData.findMany({
        where: { submissionId: stage.submissionId },
        select: { nodeId: true, value: true }
      });

      const existingEntries = existingData.map(r => [r.nodeId, r.value] as [string, unknown]);
      await applySharedReferenceValues(valueMap, existingEntries, stage.treeId);
    }

    const stageEntries = Object.entries(stage.formData) as Array<[string, unknown]>;
    await applySharedReferenceValues(valueMap, stageEntries, stage.treeId);

    // 🔑 TRIER les capacités: formules simples d'abord, formules composées (sum-total) ensuite
    const capacitiesRaw = await prisma.treeBranchLeafNodeVariable.findMany({ where: { TreeBranchLeafNode: { treeId: stage.treeId }, sourceRef: { not: null } }, include: { TreeBranchLeafNode: { select: { id: true, label: true } } } });
    const capacities = capacitiesRaw.sort((a, b) => {
      const aIsSumFormula = a.sourceRef?.includes('sum-formula') || a.sourceRef?.includes('sum-total') ? 1 : 0;
      const bIsSumFormula = b.sourceRef?.includes('sum-formula') || b.sourceRef?.includes('sum-total') ? 1 : 0;
      return aIsSumFormula - bIsSumFormula;
    });
    
    const context = { submissionId: stage.submissionId || `preview-${Date.now()}`, organizationId: stage.organizationId, userId: stage.userId, treeId: stage.treeId, labelMap, valueMap } as const;
    const results = [] as Array<{ nodeId: string; nodeLabel: string | null; sourceRef: string; operationSource: string; operationResult: unknown; operationDetail: unknown }>;
    for (const c of capacities) {
      try {
        // ✨ Utilisation du système unifié operation-interpreter
        const r = await evaluateVariableOperation(
          c.nodeId,
          context.submissionId,
          prisma,
          context.valueMap
        );
        
        // 🔑 CRITIQUE: Ajouter la valeur calculée au valueMap pour les formules suivantes
        if (r.value !== null && r.value !== undefined && r.value !== '∅') {
          context.valueMap.set(c.nodeId, r.value);
        }
        
        results.push({ 
          nodeId: c.nodeId, 
          nodeLabel: c.TreeBranchLeafNode?.label || null, 
          sourceRef: c.sourceRef!, 
          operationSource: (r.operationSource || 'neutral') as string,
          value: r.value,                     // ✅ VALEUR CALCULÉE
          calculatedValue: r.value,           // ✅ ALIAS
          operationResult: {
            value: r.value,
            humanText: r.operationResult,
            detail: r.operationDetail
          },
          operationDetail: r.operationDetail 
        });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Erreur';
        results.push({ 
          nodeId: c.nodeId, 
          nodeLabel: c.TreeBranchLeafNode?.label || null, 
          sourceRef: c.sourceRef!, 
          operationSource: 'error',
          value: null,                        // ✅ Valeur nulle
          calculatedValue: null,              // ✅ ALIAS
          operationResult: { 
            value: null,
            humanText: errorMessage,
            error: errorMessage 
          }, 
          operationDetail: null 
        });
      }
    }
    return res.json({ success: true, stageId: stage.id, results });
  } catch (e) {
    return res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erreur interne' });
  }
});

router.post('/submissions/stage/commit', async (req, res) => {
  try {
    pruneStages();
    const { stageId, asNew } = req.body || {};
    const stage = stageId ? stagingStore.get(stageId) : undefined;
    if (!stage) return res.status(404).json({ success: false, error: 'Stage introuvable' });

    if (!asNew && stage.submissionId) {
      // commit sur devis existant
      const submission = await prisma.treeBranchLeafSubmission.findUnique({ where: { id: stage.submissionId } });
      if (!submission) return res.status(404).json({ success: false, error: 'Soumission introuvable' });
      // update exportData (NO-OP) + données neutral + évaluations
      await prisma.treeBranchLeafSubmission.update({ where: { id: stage.submissionId }, data: { exportData: stage.formData as unknown as Prisma.InputJsonValue } });
  const saved = await saveUserEntriesNeutral(stage.submissionId, stage.formData, stage.treeId);
      const stats = await evaluateCapacitiesForSubmission(stage.submissionId, stage.organizationId, stage.userId, stage.treeId);
      return res.json({ success: true, submissionId: stage.submissionId, saved, stats });
    }

    // commit en nouveau devis
    const submissionId = `tbl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await prisma.treeBranchLeafSubmission.create({ data: { id: submissionId, treeId: stage.treeId, userId: stage.userId, status: 'draft', summary: { name: `Devis TBL ${new Date().toLocaleDateString()}` }, exportData: stage.formData as unknown as Prisma.InputJsonValue, updatedAt: new Date() } });
  const saved = await saveUserEntriesNeutral(submissionId, stage.formData, stage.treeId);
    const stats = await evaluateCapacitiesForSubmission(submissionId, stage.organizationId, stage.userId, stage.treeId);
    // attacher l’id créé au stage pour permettre des commit suivants sur ce même devis
    stage.submissionId = submissionId; stage.updatedAt = Date.now(); stagingStore.set(stage.id, stage);
    return res.status(201).json({ success: true, submissionId, saved, stats });
  } catch (e) {
    return res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erreur interne' });
  }
});

router.post('/submissions/stage/discard', (req, res) => {
  pruneStages();
  const { stageId } = req.body || {};
  if (!stageId || !stagingStore.has(stageId)) return res.json({ success: true, discarded: false });
  stagingStore.delete(stageId);
  return res.json({ success: true, discarded: true });
});

/**
 * 🔥 GET /api/tbl/tables/:tableId
 * 
 * Récupère les informations complètes d'une table (structure + lookup config)
 * Utilisé par SmartCalculatedField pour les références @table.xxx
 */
router.get('/tables/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    
    console.log(`📊 [GET TABLE] Récupération table: ${tableId}`);
    
    // ✅ CORRIGÉ: Récupérer la table depuis TreeBranchLeafNodeTable
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: tableId },
      select: {
        id: true,
        name: true,
        nodeId: true,
        meta: true,
      }
    });
    
    if (!table) {
      console.log(`❌ [GET TABLE] Table introuvable: ${tableId}`);
      return res.status(404).json({
        success: false,
        error: 'Table introuvable'
      });
    }
    
    console.log(`✅ [GET TABLE] Table trouvée: ${table.name || tableId}`);
    
    // Extraire la configuration de lookup depuis meta
    const meta = table.meta as any;
    const lookupConfig = meta?.lookup || {};
    
    // Extraire les données de la table (colonnes, lignes, data matrix)
    const tableData = meta?.data || {};
    const columns = tableData.columns || [];
    const rows = tableData.rows || [];
    const data = tableData.matrix || [];
    
    console.log(`📊 [GET TABLE] Données extraites:`, {
      columnsCount: columns.length,
      rowsCount: rows.length,
      dataRowsCount: data.length,
      lookupEnabled: lookupConfig.rowLookupEnabled || lookupConfig.columnLookupEnabled
    });
    
    // Retourner les informations de la table AVEC les données
    return res.json({
      success: true,
      table: {
        id: table.id,
        nodeId: table.nodeId,
        name: table.name || null,
        type: 'matrix', // Type de table
        sourceRef: `@table.${table.id}`,
        // 🔥 DONNÉES DE LA TABLE (colonnes, lignes, data)
        columns: columns,
        rows: rows,
        data: data,
        // 🔥 CONFIGURATION DE LOOKUP
        meta: {
          lookup: {
            enabled: lookupConfig.rowLookupEnabled || lookupConfig.columnLookupEnabled || false,
            mode: lookupConfig.mode || 'columns',
            rowLookupEnabled: lookupConfig.rowLookupEnabled || false,
            columnLookupEnabled: lookupConfig.columnLookupEnabled || false,
            selectors: {
              rowFieldId: lookupConfig.selectors?.rowFieldId || null,
              columnFieldId: lookupConfig.selectors?.columnFieldId || null,
            },
            displayRow: lookupConfig.displayRow || null,
            displayColumn: lookupConfig.displayColumn || null
          }
        }
      }
    });
    
  } catch (error) {
    console.error('❌ [GET TABLE] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la table',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;
