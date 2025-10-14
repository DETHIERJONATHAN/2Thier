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

// Réutilisables: sauvegarde des entrées utilisateur (neutral) avec NO-OP
async function saveUserEntriesNeutral(
  submissionId: string,
  formData: Record<string, unknown> | undefined
) {
  if (!formData || typeof formData !== 'object') return 0;

  let saved = 0;
  const entries: SubmissionDataEntry[] = [];
  for (const [key, value] of Object.entries(formData)) {
    if (key.startsWith('__mirror_') || key.startsWith('__formula_') || key.startsWith('__condition_')) {
      continue;
    }
    const isValidNodeId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key) ||
                          /^node_[0-9]+_[a-z0-9]+$/i.test(key);
    if (!isValidNodeId) continue;
    // ✅ CORRECTIF : Sauvegarder TOUTES les valeurs (même null/undefined/vide)
    // pour que operation-interpreter.ts puisse les récupérer depuis TreeBranchLeafSubmissionData
    // if (value === null || value === undefined || value === '') continue;  // ❌ LIGNE SUPPRIMÉE

    entries.push({
      id: `${submissionId}-${key}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      submissionId,
      nodeId: key,
      value: value === null || value === undefined ? null : (typeof value === 'string' ? value : JSON.stringify(value)),
      operationSource: 'neutral',
      operationDetail: {
        inputValue: value,
        nodeId: key,
        action: 'user_input'
      } as Prisma.InputJsonValue,
      operationResult: {
        processedValue: value,
        status: 'stored'
      } as Prisma.InputJsonValue
    });
  }

  for (const entry of entries) {
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
            operationDetail: entry.operationDetail,
            operationResult: entry.operationResult
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
    include: { TreeBranchLeafNode: { select: { id: true, label: true } } }
  });

  const tblContext = {
    submissionId,
    labelMap: new Map<string, string | null>(),
    valueMap: new Map<string, unknown>(),
    organizationId,
    userId: userId || 'unknown-user',
    treeId
  };

  const results: { updated: number; created: number } = { updated: 0, created: 0 };

  for (const capacity of capacities) {
    const sourceRef = capacity.sourceRef!;
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
          normalize(existing.operationDetail) !== normalize(parsedDetail) ||
          normalize(existing.operationResult) !== normalize(capacityResult.operationResult)
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
              operationResult: capacityResult.operationResult as unknown as Prisma.InputJsonValue,
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
            operationResult: capacityResult.operationResult as unknown as Prisma.InputJsonValue,
            lastResolved: new Date()
          }
        });
        results.created++;
      }
    } catch (error) {
      console.error(`[TBL CAPACITY ERROR] ${sourceRef}:`, error);
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
    const context = {
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

        const nextResult: Prisma.InputJsonValue = calculationResult.operationResult as unknown as Prisma.InputJsonValue;

        const changed = (
          (data.operationSource || null) !== (normalizedSource || null) ||
          normalize(data.operationDetail) !== normalize(nextDetail) ||
          normalize(data.operationResult) !== normalize(nextResult)
        );

        if (changed) {
          await prisma.treeBranchLeafSubmissionData.update({
            where: { id: data.id },
            data: {
              operationDetail: nextDetail,
              operationResult: nextResult, // 🔥 TRADUCTION INTELLIGENTE !
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
    let effectiveLeadId = clientId;
    
    if (effectiveLeadId) {
      // Vérifier que le lead fourni existe bien
      const leadExists = await prisma.lead.findUnique({
        where: { id: effectiveLeadId },
        select: { id: true, firstName: true, lastName: true, email: true }
      });
      
      if (!leadExists) {
        console.log(`❌ [TBL CREATE-AND-EVALUATE] Lead ${effectiveLeadId} introuvable, création d'un lead par défaut...`);
        
        // Créer un lead par défaut
        const defaultLead = await prisma.lead.create({
          data: {
            id: `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            firstName: "Client",
            lastName: "Défaut",
            email: `client-${Date.now()}@example.com`,
            phone: "",
            organizationId: organizationId!,
            updatedAt: new Date()
          }
        });
        
        effectiveLeadId = defaultLead.id;
        console.log(`👤 [TBL CREATE-AND-EVALUATE] Lead par défaut créé: ${effectiveLeadId} (${defaultLead.firstName} ${defaultLead.lastName})`);
      } else {
        console.log(`✅ [TBL CREATE-AND-EVALUATE] Lead validé: ${effectiveLeadId} (${leadExists.firstName} ${leadExists.lastName})`);
      }
    } else {
      console.log('ℹ️ [TBL CREATE-AND-EVALUATE] Aucun leadId fourni, soumission sans lead associé');
    }
    
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
    if (!submissionId) {
      submissionId = `tbl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await prisma.treeBranchLeafSubmission.create({
        data: {
          id: submissionId,
          treeId: effectiveTreeId,
          userId: effectiveUserId,
          leadId: effectiveLeadId,
          status: status || 'completed',
          summary: { name: providedName || `Devis TBL ${new Date().toLocaleDateString()}` },
          exportData: cleanFormData || {},
          completedAt: status === 'completed' ? new Date() : null,
          updatedAt: new Date()
        }
      });
      console.log(`✅ [TBL CREATE-AND-EVALUATE] Soumission créée: ${submissionId}`);
    } else {
      console.log(`� [TBL CREATE-AND-EVALUATE] Réutilisation de la soumission: ${submissionId}`);
    }
    
    // 5. Sauvegarder d'abord les données UTILISATEUR en base, puis évaluer et sauvegarder les CAPACITÉS
    if (cleanFormData && typeof cleanFormData === 'object') {
      // A. Sauvegarder les données utilisateur directes (réutilise NO-OP)
      const savedCount = await saveUserEntriesNeutral(submissionId!, cleanFormData);
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
      console.log(`✅ [TBL CREATE-AND-EVALUATE] Capacités: ${evalStats.updated} mises à jour, ${evalStats.created} créées`);
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
    const saved = await saveUserEntriesNeutral(submissionId, cleanFormData);

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
      message: `Soumission mise à jour (${saved} entrées) et évaluée (${stats.updated} mises à jour, ${stats.created} créées)`,
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
    const { treeId, formData, baseSubmissionId } = req.body || {};

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
    if (baseSubmissionId) {
      const existingData = await prisma.treeBranchLeafSubmissionData.findMany({
        where: { submissionId: baseSubmissionId },
        select: { nodeId: true, value: true }
      });
      for (const row of existingData) {
        // ✅ Inclure TOUTES les valeurs (même null) pour evaluation correcte
        valueMap.set(row.nodeId, row.value);
      }
    }
    if (formData && typeof formData === 'object') {
      for (const [k, v] of Object.entries(formData as Record<string, unknown>)) {
        if (k.startsWith('__')) continue; // ignorer champs techniques
        // ✅ Inclure TOUTES les valeurs (même null/undefined/'') pour evaluation correcte
        valueMap.set(k, v);
      }
    }

    // 4) Récupérer les capacités de l'arbre
    const capacities = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { TreeBranchLeafNode: { treeId: effectiveTreeId }, sourceRef: { not: null } },
      include: { TreeBranchLeafNode: { select: { id: true, label: true } } }
    });

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
        
        results.push({
          nodeId: cap.nodeId,
          nodeLabel: cap.TreeBranchLeafNode?.label || null,
          sourceRef: cap.sourceRef!,
          operationSource: evaluation.operationSource as string,
          operationResult: {
            value: evaluation.value,           // ✅ AJOUT: La valeur calculée
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
        results.push({
          nodeId: cap.nodeId,
          nodeLabel: cap.TreeBranchLeafNode?.label || null,
          sourceRef: cap.sourceRef!,
          operationSource: 'error',
          operationResult: { error: e instanceof Error ? e.message : 'Erreur inconnue' },
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
      console.log(`  [${i}] nodeId="${r.nodeId}", label="${r.nodeLabel}", value=${JSON.stringify(r.operationResult?.value ?? 'N/A')}`);
    });

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
      const existingData = await prisma.treeBranchLeafSubmissionData.findMany({ where: { submissionId: stage.submissionId }, select: { nodeId: true, value: true } });
      for (const r of existingData) if (r.value !== null && r.value !== undefined) valueMap.set(r.nodeId, r.value);
    }
    for (const [k, v] of Object.entries(stage.formData)) valueMap.set(k, v);

    const capacities = await prisma.treeBranchLeafNodeVariable.findMany({ where: { TreeBranchLeafNode: { treeId: stage.treeId }, sourceRef: { not: null } }, include: { TreeBranchLeafNode: { select: { id: true, label: true } } } });
    const context = { submissionId: stage.submissionId || `preview-${Date.now()}`, organizationId: stage.organizationId, userId: stage.userId, treeId: stage.treeId, labelMap, valueMap } as const;
    const results = [] as Array<{ nodeId: string; nodeLabel: string | null; sourceRef: string; operationSource: string; operationResult: unknown; operationDetail: unknown }>;
    for (const c of capacities) {
      try {
        // ✨ Utilisation du système unifié operation-interpreter
        const r = await evaluateVariableOperation(
          c.nodeId,
          context.submissionId,
          prisma
        );
        results.push({ nodeId: c.nodeId, nodeLabel: c.TreeBranchLeafNode?.label || null, sourceRef: c.sourceRef!, operationSource: (r.operationSource || 'neutral') as string, operationResult: r.operationResult, operationDetail: r.operationDetail });
      } catch (e) {
        results.push({ nodeId: c.nodeId, nodeLabel: c.TreeBranchLeafNode?.label || null, sourceRef: c.sourceRef!, operationSource: 'error', operationResult: { error: e instanceof Error ? e.message : 'Erreur' }, operationDetail: null });
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
      const saved = await saveUserEntriesNeutral(stage.submissionId, stage.formData);
      const stats = await evaluateCapacitiesForSubmission(stage.submissionId, stage.organizationId, stage.userId, stage.treeId);
      return res.json({ success: true, submissionId: stage.submissionId, saved, stats });
    }

    // commit en nouveau devis
    const submissionId = `tbl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await prisma.treeBranchLeafSubmission.create({ data: { id: submissionId, treeId: stage.treeId, userId: stage.userId, status: 'draft', summary: { name: `Devis TBL ${new Date().toLocaleDateString()}` }, exportData: stage.formData as unknown as Prisma.InputJsonValue, updatedAt: new Date() } });
    const saved = await saveUserEntriesNeutral(submissionId, stage.formData);
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
