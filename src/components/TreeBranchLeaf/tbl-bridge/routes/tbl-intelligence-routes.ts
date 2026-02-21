/**
 * 🌐 TBL API V2.0 - ROUTES INTELLIGENTES
 * 
 * ⚠️ AVERTISSEMENT : Ce fichier contient du code obsolète utilisant l'ancien CapacityCalculator.
 * Il a été partiellement migré vers operation-interpreter mais nécessite une refonte complète.
 * 
 * Nouvelles routes API qui remplacent TOUT l'ancien système !
 * - Évaluation par codes TBL
 * - Résolution intelligente des dépendances
 * - Support complet formules/conditions/tableaux
 * 
 * TODO: Refactoriser complètement pour utiliser operation-interpreter partout
 */

import express from 'express';
import TBLEvaluationEngine from '../intelligence/TBLEvaluationEngine';
import { evaluateVariableOperation, interpretFormula, interpretCondition } from '../../treebranchleaf-new/api/operation-interpreter';
// 🎯 Import centralisé de la base de données - NE JAMAIS créer new PrismaClient() !
import { db } from '../../../../lib/database';

const router = express.Router();
// console.log('🧠 [TBL INTELLIGENCE] Initialisation du routeur tbl-intelligence-routes (avec operation-interpreter)');
const evaluationEngine = new TBLEvaluationEngine();

// Petit helper interne pour log
function logRouteHit(route: string) {
  // console.log(`🛰️  [TBL INTELLIGENCE] Hit ${route} @ ${new Date().toISOString()}`);
}

/**
 * 🚀 POST /api/tbl/evaluate
 * Réactivée en mode MINIMAL pour ne pas bloquer le frontend.
 * Fournit uniquement un echo des éléments reçus + structure standard.
 */
router.post('/evaluate', async (req, res) => {
  logRouteHit('POST /api/tbl/evaluate');
  // 🎯 Utilisation du singleton db centralisé (plus de new PrismaClient !)
  const prisma = db;
  try {
    const { elementId, elementIds, contextData = {}, evalType } = req.body || {};

    // === MODE BATCH =========================================================
    if (Array.isArray(elementIds) && elementIds.length > 0) {
      const startedAt = Date.now();
      const results: Record<string, unknown> = {};
      const traces: Record<string, unknown> = {};
      for (const id of elementIds) {
        if (!id || typeof id !== 'string') {
          results[id || ''] = { success: false, error: 'elementId invalide' };
          continue;
        }
        try {
          // Réutiliser la logique résolution mono-id via fonction utilitaire interne
          const single = await resolveSingleEvaluation(prisma, id, contextData);
          results[id] = single.payload;
          traces[id] = single.trace;
        } catch (e) {
          results[id] = { success: false, error: 'Erreur interne (batch item)', details: e instanceof Error ? e.message : 'unknown' };
        }
      }
      return res.json({
        success: true,
        mode: 'batch',
        evalType: evalType || 'batch',
        count: elementIds.length,
        durationMs: Date.now() - startedAt,
        results,
        traces
      });
    }

    // === MODE SINGLE ========================================================
    if (!elementId || typeof elementId !== 'string') {
      return res.status(400).json({ success: false, error: 'Paramètre elementId manquant ou invalide (ni elementIds[] fourni).' });
    }

  const trace: Array<{ step: string; info: string; success: boolean }> = [];
    let resolvedNodeId: string | null = null;
    let variable: { exposedKey: string; displayName: string | null; sourceRef: string | null } | null = null;

    // 1. Chercher variable via exposedKey direct
    const byKey = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { exposedKey: elementId }, select: { nodeId: true, exposedKey: true, displayName: true, sourceRef: true } });
    if (byKey) {
      resolvedNodeId = byKey.nodeId;
      variable = { exposedKey: byKey.exposedKey, displayName: byKey.displayName, sourceRef: byKey.sourceRef };
      trace.push({ step: 'variable_exposedKey', info: 'Résolu via variable.exposedKey', success: true });
    } else {
      trace.push({ step: 'variable_exposedKey', info: 'Aucune variable avec cet exposedKey', success: false });
    }

    // 2. Node direct
    if (!resolvedNodeId) {
      const node = await prisma.treeBranchLeafNode.findUnique({ where: { id: elementId }, select: { id: true } });
      if (node) {
        resolvedNodeId = node.id;
        trace.push({ step: 'node_direct', info: 'Correspondance trouvée dans TreeBranchLeafNode', success: true });
      } else {
        trace.push({ step: 'node_direct', info: 'Pas de node avec cet id', success: false });
      }
    }

    // 3. Formule par id - 🔥 NOUVEAU: Évaluer directement si c'est une formule
    if (!resolvedNodeId) {
      const formula = await prisma.treeBranchLeafNodeFormula.findUnique({ 
        where: { id: elementId }, 
        select: { id: true, nodeId: true, name: true, tokens: true } 
      });
      if (formula) {
        resolvedNodeId = formula.nodeId;
        trace.push({ step: 'formula_id', info: `Formule trouvée: ${formula.name}`, success: true });
        
        // 🔥 ÉVALUATION DIRECTE DE LA FORMULE via operation-interpreter
        try {
          // 🎯 Utilisation du singleton db centralisé
          const prismaInstance = db;
          
          const submissionId = (contextData.submissionId as string) || 'temp-evaluation';
          
          // Convertir contextData en Map<string, unknown> pour valueMap
          const valueMap = new Map<string, unknown>();
          for (const [key, value] of Object.entries(contextData)) {
            valueMap.set(key, value);
            if (!key.startsWith('@')) {
              valueMap.set(`@value.${key}`, value);
            }
          }
          
          // console.log(`🧮 [TBL EVALUATE] Évaluation directe formule: ${formula.name} (${formula.id})`);
          
          const valuesCache = new Map();
          const labelMap = new Map<string, string>();
          
          const result = await interpretFormula(
            formula.id,
            submissionId,
            prismaInstance,
            valuesCache,
            0,
            valueMap,
            labelMap
          );
          
          // Note: Plus de $disconnect() car on utilise le singleton db
          
          trace.push({ step: 'formula_direct_eval', info: `Résultat: ${result.result}`, success: true });
          
          return res.json({ 
            success: true, 
            type: 'formula', 
            capacity: '2',
            value: result.result,
            humanText: result.humanText,
            details: result.details,
            trace 
          });
        } catch (evalError) {
          console.error(`❌ [TBL EVALUATE] Erreur évaluation directe formule:`, evalError);
          trace.push({ step: 'formula_direct_eval', info: `Erreur: ${evalError instanceof Error ? evalError.message : 'unknown'}`, success: false });
          // Continue vers le flux normal en cas d'échec
        }
      } else {
        trace.push({ step: 'formula_id', info: 'Aucune formule avec cet id', success: false });
      }
    }

    // 4. Variable via sourceRef formula:<id>
    if (!resolvedNodeId) {
      const viaSourceFormula = await prisma.treeBranchLeafNodeVariable.findFirst({ where: { sourceRef: `formula:${elementId}` }, select: { nodeId: true, exposedKey: true, displayName: true, sourceRef: true } });
      if (viaSourceFormula) {
        resolvedNodeId = viaSourceFormula.nodeId;
        variable = { exposedKey: viaSourceFormula.exposedKey, displayName: viaSourceFormula.displayName, sourceRef: viaSourceFormula.sourceRef };
        trace.push({ step: 'variable_sourceRef_formula', info: 'Résolu via variable.sourceRef=formula:<id>', success: true });
      } else {
        trace.push({ step: 'variable_sourceRef_formula', info: 'Aucune variable.sourceRef=formula:<id>', success: false });
      }
    }

    // 5. Variable via sourceRef direct id
    if (!resolvedNodeId) {
      const viaSourceRaw = await prisma.treeBranchLeafNodeVariable.findFirst({ where: { sourceRef: elementId }, select: { nodeId: true, exposedKey: true, displayName: true, sourceRef: true } });
      if (viaSourceRaw) {
        resolvedNodeId = viaSourceRaw.nodeId;
        variable = { exposedKey: viaSourceRaw.exposedKey, displayName: viaSourceRaw.displayName, sourceRef: viaSourceRaw.sourceRef };
        trace.push({ step: 'variable_sourceRef_raw', info: 'Résolu via variable.sourceRef = id', success: true });
      } else {
        trace.push({ step: 'variable_sourceRef_raw', info: 'Aucune variable.sourceRef = id', success: false });
      }
    }

    if (!resolvedNodeId) {
      return res.status(422).json({ 
        success: false, 
        error: 'Impossible de résoudre elementId', 
        code: 'ELEMENT_UNRESOLVED',
        hint: 'Vérifier que la variable ou formule est créée avant l\'évaluation',
        trace 
      });
    }

    // Si variable pas encore obtenue, la récupérer via nodeId
    if (!variable) {
      const v = await prisma.treeBranchLeafNodeVariable.findFirst({ where: { nodeId: resolvedNodeId }, select: { exposedKey: true, displayName: true, sourceRef: true } });
      if (v) {
        variable = { exposedKey: v.exposedKey, displayName: v.displayName, sourceRef: v.sourceRef };
        trace.push({ step: 'variable_from_node', info: 'Variable trouvée via nodeId', success: true });
      }
    }

    if (!variable || !variable.exposedKey) {
      return res.status(422).json({ success: false, error: 'Variable associée introuvable ou sans exposedKey', trace });
    }

    // Détection capacité par sourceRef
    const sr = variable.sourceRef || '';
    let capacity: '1' | '2' | '3' | '4' = '1';
    if (sr.startsWith('formula:')) capacity = '2';
    else if (sr.startsWith('condition:')) capacity = '3';
    else if (sr.startsWith('table:')) capacity = '4';
    trace.push({ step: 'capacity_detect', info: `Capacité détectée=${capacity}`, success: true });

    // Pour l'instant on n'implémente réellement que les formules via engine
    if (capacity === '2') {
      const result = await evaluationEngine.evaluate({
        element_code: variable.exposedKey,
        context_values: contextData,
        evaluation_mode: 'auto',
        deep_resolution: true
      });
      if (result.success) {
        return res.json({ success: true, type: 'formula', capacity, value: result.final_value, dependencies: result.dependencies_used, performance: result.performance, trace });
      }
      return res.status(422).json({ success: false, type: 'formula', capacity, error: 'Échec moteur', details: result.errors, trace });
    }

    if (capacity === '3') {
      // TODO: implémenter moteur conditions
      return res.json({ success: true, type: 'condition', capacity, status: 'not_implemented', value: null, trace });
    }
    if (capacity === '4') {
      // TODO: implémenter moteur tableaux
      return res.json({ success: true, type: 'table', capacity, status: 'not_implemented', value: null, trace });
    }

    // Neutre
    return res.json({ success: true, type: 'neutral', capacity, value: null, trace });
  } catch (e) {
    console.error('💥 [TBL INTELLIGENCE] Erreur /evaluate:', e);
    return res.status(500).json({ success: false, error: 'Erreur interne /evaluate', details: e instanceof Error ? e.message : 'unknown' });
  }
  // Note: Plus de finally/$disconnect car on utilise le singleton db
});

// ================== FONCTION INTERNE (factorisation batch) ==================
// Type minimal pour prisma (éviter any tout en restant léger). On pourrait importer PrismaClient mais cela recréerait une instance.
type MinimalPrisma = {
  treeBranchLeafNodeVariable: {
    findUnique: (args: unknown) => Promise<unknown>;
    findFirst: (args: unknown) => Promise<unknown>;
  };
  treeBranchLeafNode: { findUnique: (args: unknown) => Promise<unknown> };
  treeBranchLeafNodeFormula: { findUnique: (args: unknown) => Promise<unknown> };
};

async function resolveSingleEvaluation(prisma: MinimalPrisma, elementId: string, contextData: Record<string, unknown>) {
  const evaluationEngine = new TBLEvaluationEngine();
  const trace: Array<{ step: string; info: string; success: boolean }> = [];
  let resolvedNodeId: string | null = null;
  let variable: { exposedKey: string; displayName: string | null; sourceRef: string | null } | null = null;

  // 1. Chercher variable via exposedKey direct
  const byKey = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { exposedKey: elementId }, select: { nodeId: true, exposedKey: true, displayName: true, sourceRef: true } });
  if (byKey) {
    resolvedNodeId = byKey.nodeId;
    variable = { exposedKey: byKey.exposedKey, displayName: byKey.displayName, sourceRef: byKey.sourceRef };
    trace.push({ step: 'variable_exposedKey', info: 'Résolu via variable.exposedKey', success: true });
  } else {
    trace.push({ step: 'variable_exposedKey', info: 'Aucune variable avec cet exposedKey', success: false });
  }

  // 2. Node direct
  if (!resolvedNodeId) {
    const node = await prisma.treeBranchLeafNode.findUnique({ where: { id: elementId }, select: { id: true } });
    if (node) {
      resolvedNodeId = node.id;
      trace.push({ step: 'node_direct', info: 'Correspondance trouvée dans TreeBranchLeafNode', success: true });
    } else {
      trace.push({ step: 'node_direct', info: 'Pas de node avec cet id', success: false });
    }
  }

  // 3. Formule par id - 🔥 NOUVEAU: Évaluer directement si c'est une formule
  if (!resolvedNodeId) {
    const formula = await prisma.treeBranchLeafNodeFormula.findUnique({ 
      where: { id: elementId }, 
      select: { id: true, nodeId: true, name: true, tokens: true } 
    }) as { id: string; nodeId: string; name: string; tokens: unknown[] } | null;
    if (formula) {
      resolvedNodeId = formula.nodeId;
      trace.push({ step: 'formula_id', info: `Formule trouvée: ${formula.name}`, success: true });
      
      // 🔥 ÉVALUATION DIRECTE DE LA FORMULE via operation-interpreter
      try {
        // 🎯 Utilisation du singleton db centralisé
        const prismaInstance = db;
        
        const submissionId = (contextData.submissionId as string) || 'temp-evaluation';
        
        // Convertir contextData en Map<string, unknown> pour valueMap
        const valueMap = new Map<string, unknown>();
        for (const [key, value] of Object.entries(contextData)) {
          valueMap.set(key, value);
          if (!key.startsWith('@')) {
            valueMap.set(`@value.${key}`, value);
          }
        }
        
        // console.log(`🧮 [TBL EVALUATE BATCH] Évaluation directe formule: ${formula.name} (${formula.id})`);
        
        const valuesCache = new Map();
        const labelMap = new Map<string, string>();
        
        const result = await interpretFormula(
          formula.id,
          submissionId,
          prismaInstance,
          valuesCache,
          0,
          valueMap,
          labelMap
        );
        
        // Note: Plus de $disconnect car on utilise le singleton db
        
        trace.push({ step: 'formula_direct_eval', info: `Résultat: ${result.result}`, success: true });
        
        return { 
          payload: { 
            success: true, 
            type: 'formula', 
            capacity: '2',
            value: result.result,
            humanText: result.humanText,
            details: result.details
          }, 
          trace 
        };
      } catch (evalError) {
        console.error(`❌ [TBL EVALUATE BATCH] Erreur évaluation directe formule:`, evalError);
        trace.push({ step: 'formula_direct_eval', info: `Erreur: ${evalError instanceof Error ? evalError.message : 'unknown'}`, success: false });
        // Continue vers le flux normal en cas d'échec
      }
    } else {
      trace.push({ step: 'formula_id', info: 'Aucune formule avec cet id', success: false });
    }
  }

  // 4. Variable via sourceRef formula:<id>
  if (!resolvedNodeId) {
    const viaSourceFormula = await prisma.treeBranchLeafNodeVariable.findFirst({ where: { sourceRef: `formula:${elementId}` }, select: { nodeId: true, exposedKey: true, displayName: true, sourceRef: true } });
    if (viaSourceFormula) {
      resolvedNodeId = viaSourceFormula.nodeId;
      variable = { exposedKey: viaSourceFormula.exposedKey, displayName: viaSourceFormula.displayName, sourceRef: viaSourceFormula.sourceRef };
      trace.push({ step: 'variable_sourceRef_formula', info: 'Résolu via variable.sourceRef=formula:<id>', success: true });
    } else {
      trace.push({ step: 'variable_sourceRef_formula', info: 'Aucune variable.sourceRef=formula:<id>', success: false });
    }
  }

  // 5. Variable via sourceRef direct id
  if (!resolvedNodeId) {
    const viaSourceRaw = await prisma.treeBranchLeafNodeVariable.findFirst({ where: { sourceRef: elementId }, select: { nodeId: true, exposedKey: true, displayName: true, sourceRef: true } });
    if (viaSourceRaw) {
      resolvedNodeId = viaSourceRaw.nodeId;
      variable = { exposedKey: viaSourceRaw.exposedKey, displayName: viaSourceRaw.displayName, sourceRef: viaSourceRaw.sourceRef };
      trace.push({ step: 'variable_sourceRef_raw', info: 'Résolu via variable.sourceRef = id', success: true });
    } else {
      trace.push({ step: 'variable_sourceRef_raw', info: 'Aucune variable.sourceRef = id', success: false });
    }
  }

  if (!resolvedNodeId) {
    return { payload: { success: false, error: 'Impossible de résoudre elementId', trace }, trace };
  }

  if (!variable) {
    const v = await prisma.treeBranchLeafNodeVariable.findFirst({ where: { nodeId: resolvedNodeId }, select: { exposedKey: true, displayName: true, sourceRef: true } });
    if (v) {
      variable = { exposedKey: v.exposedKey, displayName: v.displayName, sourceRef: v.sourceRef };
      trace.push({ step: 'variable_from_node', info: 'Variable trouvée via nodeId', success: true });
    }
  }

  if (!variable || !variable.exposedKey) {
    return { payload: { success: false, error: 'Variable associée introuvable ou sans exposedKey', trace }, trace };
  }

  const sr = variable.sourceRef || '';
  let capacity: '1' | '2' | '3' | '4' = '1';
  if (sr.startsWith('formula:')) capacity = '2';
  else if (sr.startsWith('condition:')) capacity = '3';
  else if (sr.startsWith('table:')) capacity = '4';
  trace.push({ step: 'capacity_detect', info: `Capacité détectée=${capacity}`, success: true });

  if (capacity === '2') {
    // 🔥 NOUVEAU: Utiliser operation-interpreter.ts au lieu de TBLEvaluationEngine
    // pour supporter les tokens @table.xxx dans les formules
    try {
      // 🎯 Utilisation du singleton db centralisé
      const prismaInstance = db;
      
      // Extraire l'ID de la formule depuis sourceRef (format: "formula:xxx" ou "node-formula:xxx")
      const formulaId = sr.replace(/^(formula:|node-formula:)/, '');
      
      // Créer un submissionId temporaire ou utiliser celui du contexte
      const submissionId = (contextData.submissionId as string) || 'temp-evaluation';
      
      // 🔥 ENRICHISSEMENT: Créer une correspondance label → nodeId depuis la base
      const allNodes = await prismaInstance.treeBranchLeafNode.findMany({
        select: { id: true, label: true }
      });
      const labelToNodeId = new Map<string, string>();
      for (const node of allNodes) {
        labelToNodeId.set(node.label.toLowerCase(), node.id);
      }
      
      // Convertir contextData en Map<string, unknown> pour valueMap
      const valueMap = new Map<string, unknown>();
      for (const [key, value] of Object.entries(contextData)) {
        valueMap.set(key, value);
        // Aussi ajouter avec préfixe @value. pour compatibilité
        if (!key.startsWith('@')) {
          valueMap.set(`@value.${key}`, value);
        }
        
        // 🔥 NOUVEAU: Si la clé est un label, aussi ajouter par nodeId
        const nodeId = labelToNodeId.get(key.toLowerCase());
        if (nodeId) {
          valueMap.set(nodeId, value);
          valueMap.set(`@value.${nodeId}`, value);
        }
      }
      
      // console.log(`🧮 [TBL EVALUATE] Utilisation de operation-interpreter pour formule: ${formulaId}`);
      // console.log(`   📊 ValueMap: ${valueMap.size} entrées`);
      
      // Utiliser interpretFormula d'operation-interpreter.ts
      const valuesCache = new Map();
      const labelMap = new Map<string, string>();
      
      const result = await interpretFormula(
        formulaId,
        submissionId,
        prismaInstance,
        valuesCache,
        0, // depth
        valueMap,
        labelMap
      );
      
      // Note: Plus de $disconnect car on utilise le singleton db
      
      trace.push({ step: 'formula_interpret', info: `Résultat: ${result.result}`, success: true });
      
      return { 
        payload: { 
          success: true, 
          type: 'formula', 
          capacity, 
          value: result.result,
          humanText: result.humanText,
          details: result.details
        }, 
        trace 
      };
    } catch (error) {
      console.error(`❌ [TBL EVALUATE] Erreur interpretFormula:`, error);
      trace.push({ step: 'formula_interpret', info: `Erreur: ${error instanceof Error ? error.message : 'unknown'}`, success: false });
      
      // Fallback vers TBLEvaluationEngine si interpretFormula échoue
      const result = await evaluationEngine.evaluate({
        element_code: variable.exposedKey,
        context_values: contextData,
        evaluation_mode: 'auto',
        deep_resolution: true
      });
      if (result.success) {
        return { payload: { success: true, type: 'formula', capacity, value: result.final_value, dependencies: result.dependencies_used, performance: result.performance }, trace };
      }
      return { payload: { success: false, type: 'formula', capacity, error: 'Échec moteur', details: result.errors }, trace };
    }
  }

  if (capacity === '3') {
    // 🔥 NOUVEAU: Utiliser operation-interpreter.ts pour les conditions
    try {
      // 🎯 Utilisation du singleton db centralisé
      const prismaInstance = db;
      
      // Extraire l'ID de la condition depuis sourceRef (format: "condition:xxx")
      const conditionId = sr.replace(/^condition:/, '');
      
      // Créer un submissionId temporaire ou utiliser celui du contexte
      const submissionId = (contextData.submissionId as string) || 'temp-evaluation';
      
      // 🔥 ENRICHISSEMENT: Créer une correspondance label → nodeId depuis la base
      // pour que les valeurs passées par label soient accessibles par nodeId
      const allNodes = await prismaInstance.treeBranchLeafNode.findMany({
        select: { id: true, label: true }
      });
      const labelToNodeId = new Map<string, string>();
      const nodeIdToLabel = new Map<string, string>();
      for (const node of allNodes) {
        labelToNodeId.set(node.label.toLowerCase(), node.id);
        nodeIdToLabel.set(node.id, node.label);
      }
      
      // Convertir contextData en Map<string, unknown> pour valueMap
      const valueMap = new Map<string, unknown>();
      for (const [key, value] of Object.entries(contextData)) {
        valueMap.set(key, value);
        // Aussi ajouter avec préfixe @value. pour compatibilité
        if (!key.startsWith('@')) {
          valueMap.set(`@value.${key}`, value);
        }
        
        // 🔥 NOUVEAU: Si la clé est un label, aussi ajouter par nodeId
        const nodeId = labelToNodeId.get(key.toLowerCase());
        if (nodeId) {
          valueMap.set(nodeId, value);
          valueMap.set(`@value.${nodeId}`, value);
          // console.log(`   🔗 Mapping label "${key}" → nodeId "${nodeId}" = ${value}`);
        }
      }
      
      // console.log(`⚖️ [TBL EVALUATE] Utilisation de operation-interpreter pour condition: ${conditionId}`);
      // console.log(`   📊 ValueMap: ${valueMap.size} entrées`);
      
      // Utiliser interpretCondition d'operation-interpreter.ts
      const valuesCache = new Map();
      const labelMap = new Map<string, string>();
      
      const result = await interpretCondition(
        conditionId,
        submissionId,
        prismaInstance,
        valuesCache,
        0, // depth
        valueMap,
        labelMap
      );
      
      // Note: Plus de $disconnect car on utilise le singleton db
      
      trace.push({ step: 'condition_interpret', info: `Résultat: ${result.result}`, success: true });
      
      return { 
        payload: { 
          success: true, 
          type: 'condition', 
          capacity, 
          value: result.result,
          humanText: result.humanText,
          details: result.details
        }, 
        trace 
      };
    } catch (error) {
      console.error(`❌ [TBL EVALUATE] Erreur interpretCondition:`, error);
      trace.push({ step: 'condition_interpret', info: `Erreur: ${error instanceof Error ? error.message : 'unknown'}`, success: false });
      return { payload: { success: false, type: 'condition', capacity, error: 'Échec évaluation condition', details: error instanceof Error ? error.message : 'unknown' }, trace };
    }
  }
  if (capacity === '4') {
    return { payload: { success: true, type: 'table', capacity, status: 'not_implemented', value: null }, trace };
  }
  return { payload: { success: true, type: 'neutral', capacity, value: null }, trace };
}

// Route de debug pour confirmer le montage côté serveur
router.get('/_debug_list', (req, res) => {
  logRouteHit('GET /api/tbl/_debug_list');
  return res.json({
    routes: [
      'POST /api/tbl/evaluate (minimal)',
      'POST /api/tbl/evaluate/formula/:tblCode (disabled)',
      'POST /api/tbl/condition (✅ ACTIVE avec CapacityCalculator)',
      'POST /api/tbl/evaluate/condition/:tblCode (✅ ACTIVE avec CapacityCalculator)',
      'POST /api/tbl/evaluate/table/:tblCode (disabled)',
      'GET /api/tbl/analyze/:tblCode (disabled)',
      'GET /api/tbl/status (disabled)'
    ],
    timestamp: new Date().toISOString()
  });
});



/**
 * 🧮 POST /api/tbl/evaluate/formula/:tblCode
 * ⚠️ DÉSACTIVÉE TEMPORAIREMENT
 */
router.post('/evaluate/formula/:tblCode', async (req, res) => {
  return res.status(503).json({ success: false, error: 'Route désactivée pour débogage.' });
});

/**
 * ⚖️ POST /api/tbl/condition
 * RÉACTIVÉE avec CapacityCalculator
 */
router.post('/condition', async (req, res) => {
  logRouteHit('POST /api/tbl/condition');
  
  try {
    const { elementId, contextData = {}, submissionId = 'df833cac-0b44-4b2b-bb1c-de3878f00182' } = req.body || {};
    
    if (!elementId) {
      return res.status(400).json({ 
        success: false, 
        error: 'elementId requis' 
      });
    }

    // console.log('🔧 [TBL CONDITION] Évaluation avec CapacityCalculator:', elementId);
    
    // Utiliser le CapacityCalculator corrigé
    const calculator = new CapacityCalculator();
    
    const context = {
      submissionId,
      organizationId: 'test-org',
      userId: 'test-user'
    };

    const result = await calculator.evaluateCondition(elementId, context);
    
    // console.log('✅ [TBL CONDITION] Résultat CapacityCalculator:', result);
    
    return res.json({
      success: true,
      evaluation: result,
      elementId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TBL CONDITION] Erreur:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erreur interne', 
      details: error instanceof Error ? error.message : 'unknown' 
    });
  }
});

/**
 * ⚖️ POST /api/tbl/evaluate/condition/:tblCode
 * RÉACTIVÉE avec CapacityCalculator
 */
router.post('/evaluate/condition/:tblCode', async (req, res) => {
  logRouteHit('POST /api/tbl/evaluate/condition/:tblCode');
  
  const { tblCode } = req.params;
  const { submissionId = 'df833cac-0b44-4b2b-bb1c-de3878f00182' } = req.body || {};
  
  if (!tblCode) {
    return res.status(400).json({ 
      success: false, 
      error: 'tblCode requis' 
    });
  }

  // console.log('🔧 [TBL EVALUATE CONDITION] Évaluation avec operation-interpreter:', tblCode);
  
  // ✨ Utiliser le système unifié operation-interpreter
  // 🎯 Utilisation du singleton db centralisé
  const prisma = db;
  
  try {
    // Trouver le nodeId de la condition
    const conditionRecord = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: tblCode },
      select: { nodeId: true }
    });
    
    if (!conditionRecord?.nodeId) {
      return res.status(404).json({
        success: false,
        error: `Condition ${tblCode} introuvable`
      });
    }
    
    // Évaluer avec operation-interpreter
    const result = await evaluateVariableOperation(
      conditionRecord.nodeId,
      submissionId || tblCode,
      prisma
    );
    
    // console.log('✅ [TBL EVALUATE CONDITION] Résultat operation-interpreter:', result);
    
    return res.json({
      success: true,
      evaluation: result,
      operationResult: result.operationResult,
      operationDetail: result.operationDetail,
      operationSource: result.operationSource,
      tblCode,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [TBL EVALUATE CONDITION] Erreur:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erreur interne', 
      details: error instanceof Error ? error.message : 'unknown' 
    });
  }
  // Note: Plus de finally/$disconnect car on utilise le singleton db
});

/**
 * 📊 POST /api/tbl/evaluate/table/:tblCode
 * ⚠️ DÉSACTIVÉE TEMPORAIREMENT
 */
router.post('/evaluate/table/:tblCode', async (req, res) => {
  return res.status(503).json({ success: false, error: 'Route désactivée pour débogage.' });
});

/**
 * 🔍 GET /api/tbl/analyze/:tblCode
 * ⚠️ DÉSACTIVÉE TEMPORAIREMENT
 */
router.get('/analyze/:tblCode', async (req, res) => {
  return res.status(503).json({ success: false, error: 'Route désactivée pour débogage.' });
});

/**
 * 📈 GET /api/tbl/status
 * ⚠️ DÉSACTIVÉE TEMPORAIREMENT
 */
router.get('/status', async (req, res) => {
  return res.status(503).json({ success: false, error: 'Route désactivée pour débogage.' });
});

/**
 * 🔄 POST /api/tbl/update-database-results
 * NOUVEAU : Met à jour la base de données avec les résultats du CapacityCalculator
 */
router.post('/update-database-results', async (req, res) => {
  logRouteHit('POST /api/tbl/update-database-results');
  
  try {
    const { submissionId = 'df833cac-0b44-4b2b-bb1c-de3878f00182' } = req.body || {};
    
    // console.log('🔄 [TBL UPDATE] Début mise à jour base de données avec CapacityCalculator');
    
    // 🎯 Utilisation du singleton db centralisé
    const prisma = db;
    
    // Récupérer toutes les données de submission pour les conditions
    const submissionData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        submissionId: submissionId,
        operationSource: 'condition' // Seulement les conditions (en minuscules)
      }
    });
    
    // console.log(`🔄 [TBL UPDATE] Trouvé ${submissionData.length} données de conditions à mettre à jour`);
    
    const calculator = new CapacityCalculator();
    const context = {
      submissionId,
      organizationId: 'test-org',
      userId: 'test-user'
    };
    
    let updated = 0;
    const errors = [];
    
    for (const data of submissionData) {
      try {
        const conditionId = data.sourceRef;
        if (!conditionId) {
          // console.log(`⚠️ [TBL UPDATE] Pas de sourceRef pour ${data.id}, ignoré`);
          continue;
        }
        
        // Évaluer avec CapacityCalculator
        const result = await calculator.evaluateCondition(conditionId, context);
        
        // Créer le nouveau operationResult basé sur l'évaluation
        const newOperationResult = result.success 
          ? {
              success: true,
              conditionId,
              result: result.result,
              evaluated: true,
              timestamp: new Date().toISOString(),
              method: 'CapacityCalculator'
            }
          : {
              success: false,
              conditionId,
              error: result.error,
              timestamp: new Date().toISOString(),
              method: 'CapacityCalculator'
            };
        
        // Mettre à jour en base dans TreeBranchLeafSubmissionData
        await prisma.treeBranchLeafSubmissionData.update({
          where: { id: data.id },
          data: {
            operationResult: newOperationResult
          }
        });
        
        updated++;
        // console.log(`✅ [TBL UPDATE] Condition ${conditionId} mise à jour:`, newOperationResult);
        
      } catch (error) {
        errors.push({
          dataId: data.id,
          sourceRef: data.sourceRef,
          error: error instanceof Error ? error.message : 'unknown'
        });
        console.error(`❌ [TBL UPDATE] Erreur data ${data.id}:`, error);
      }
    }
    
    // Note: Plus de $disconnect car on utilise le singleton db
    
    return res.json({
      success: true,
      updated,
      total: submissionData.length,
      errors,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TBL UPDATE] Erreur globale:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erreur interne', 
      details: error instanceof Error ? error.message : 'unknown' 
    });
  }
});

/**
 * 🔍 POST /api/tbl/check-submission-data
 * NOUVEAU : Inspecter les données de soumission
 */
router.post('/check-submission-data', async (req, res) => {
  logRouteHit('POST /api/tbl/check-submission-data');
  
  try {
    const { submissionId = 'df833cac-0b44-4b2b-bb1c-de3878f00182' } = req.body || {};
    
    // 🎯 Utilisation du singleton db centralisé
    const prisma = db;
    
    // Récupérer toutes les données de cette submission
    const allData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId: submissionId }
    });
    
    // Grouper par operationSource
    const grouped = allData.reduce((acc, item) => {
      const source = item.operationSource || 'null';
      if (!acc[source]) acc[source] = [];
      acc[source].push({
        id: item.id,
        sourceRef: item.sourceRef,
        operationResult: item.operationResult
      });
      return acc;
    }, {} as Record<string, any[]>);
    
    // Note: Plus de $disconnect car on utilise le singleton db
    
    return res.json({
      success: true,
      submissionId,
      total: allData.length,
      bySource: grouped,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TBL CHECK] Erreur:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erreur interne', 
      details: error instanceof Error ? error.message : 'unknown' 
    });
  }
});

/**
 * 🔄 POST /api/tbl/update-database-with-intelligent-translations
 * NOUVEAU : Met à jour la base de données avec les traductions intelligentes
 */
router.post('/update-database-with-intelligent-translations', async (req, res) => {
  logRouteHit('POST /api/tbl/update-database-with-intelligent-translations');
  
  try {
    const { submissionId = 'df833cac-0b44-4b2b-bb1c-de3878f00182' } = req.body || {};
    
    // console.log('🧠 [TBL INTELLIGENT UPDATE] Début mise à jour avec traductions intelligentes');
    
    // 🎯 Utilisation du singleton db centralisé
    const prisma = db;
    
    // Import dynamique du traducteur
    let TBLIntelligentTranslator;
    try {
      const translatorModule = await import('../../../../../../tbl-intelligent-translator.cjs');
      TBLIntelligentTranslator = translatorModule.default;
    } catch (error) {
      console.error('❌ [TBL INTELLIGENT] Impossible de charger TBLIntelligentTranslator:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'TBLIntelligentTranslator non disponible' 
      });
    }
    
    const translator = new TBLIntelligentTranslator(prisma);
    
    // Récupérer toutes les données de submission à traduire
    const submissionData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        submissionId: submissionId,
        operationSource: {
          in: ['condition', 'formula', 'table']
        },
        operationDetail: {
          not: null
        }
      },
      include: {
        TreeBranchLeafNode: true
      }
    });
    
    // console.log(`🧠 [TBL INTELLIGENT UPDATE] Trouvé ${submissionData.length} données à traduire`);
    
    let updated = 0;
    const errors = [];
    
    for (const data of submissionData) {
      try {
        // console.log(`🔧 [TBL INTELLIGENT] Traduction: ${data.TreeBranchLeafNode?.label || 'Sans nom'} (${data.operationSource})`);
        
        // Générer la traduction intelligente
        const intelligentResult = await translator.translateCapacity(
          data.operationSource,
          data.operationDetail,
          data.sourceRef || data.nodeId,
          data.submissionId
        );
        
        // console.log(`✅ [TBL INTELLIGENT] Traduction générée: ${intelligentResult.substring(0, 100)}...`);
        
        // Mettre à jour en base
        await prisma.treeBranchLeafSubmissionData.update({
          where: { id: data.id },
          data: {
            operationResult: intelligentResult,
            lastResolved: new Date()
          }
        });
        
        updated++;
        // console.log(`✅ [TBL INTELLIGENT] Mis à jour: ${data.id}`);
        
      } catch (error) {
        errors.push({
          dataId: data.id,
          nodeLabel: data.TreeBranchLeafNode?.label,
          error: error instanceof Error ? error.message : 'unknown'
        });
        console.error(`❌ [TBL INTELLIGENT] Erreur data ${data.id}:`, error);
      }
    }
    
    // Note: Plus de $disconnect car on utilise le singleton db
    
    return res.json({
      success: true,
      message: 'Traductions intelligentes appliquées',
      updated,
      total: submissionData.length,
      errors,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TBL INTELLIGENT UPDATE] Erreur globale:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erreur interne', 
      details: error instanceof Error ? error.message : 'unknown' 
    });
  }
});

/**
 * 🔍 GET /api/tbl/check-intelligent-translations
 * NOUVEAU : Vérifier les traductions intelligentes en base
 */
router.get('/check-intelligent-translations', async (req, res) => {
  logRouteHit('GET /api/tbl/check-intelligent-translations');
  
  try {
    const { submissionId = 'df833cac-0b44-4b2b-bb1c-de3878f00182' } = req.query;
    
    // 🎯 Utilisation du singleton db centralisé
    const prisma = db;
    
    // Récupérer les données avec traductions récentes
    const recentData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { 
        submissionId: submissionId as string,
        operationSource: {
          in: ['condition', 'formula', 'table']
        },
        operationResult: {
          not: null
        }
      },
      include: {
        TreeBranchLeafNode: true
      },
      orderBy: {
        lastResolved: 'desc'
      },
      take: 10
    });
    
    // Note: Plus de $disconnect car on utilise le singleton db
    
    const translations = recentData.map(data => ({
      id: data.id,
      nodeLabel: data.TreeBranchLeafNode?.label,
      operationSource: data.operationSource,
      operationResult: data.operationResult,
      lastResolved: data.lastResolved,
      isIntelligent: typeof data.operationResult === 'string' && 
                     !data.operationResult.includes('Évalué dynamiquement par TBL Prisma') &&
                     (data.operationResult.includes('Si ') || 
                      data.operationResult.includes('(/)') || 
                      data.operationResult.includes('Tableau'))
    }));
    
    return res.json({
      success: true,
      submissionId,
      total: recentData.length,
      translations,
      stats: {
        intelligent: translations.filter(t => t.isIntelligent).length,
        old: translations.filter(t => !t.isIntelligent).length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TBL CHECK INTELLIGENT] Erreur:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erreur interne', 
      details: error instanceof Error ? error.message : 'unknown' 
    });
  }
});
router.get('/nodes/:nodeId', async (req, res) => {
  logRouteHit('GET /api/tbl/nodes/:nodeId');
  
  try {
    const { nodeId } = req.params;
    
    // console.log('🔄 [TBL NODES] Récupération node via TBL:', nodeId);
    
    // 🎯 Utilisation du singleton db centralisé
    const prisma = db;
    
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId }
    });
    
    // Note: Plus de $disconnect car on utilise le singleton
    
    if (!node) {
      return res.status(404).json({ success: false, error: 'Node non trouvé' });
    }
    
    return res.json(node);
    
  } catch (error) {
    console.error('❌ [TBL NODES] Erreur:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erreur interne', 
      details: error instanceof Error ? error.message : 'unknown' 
    });
  }
});

/**
 * 🔄 GET /api/tbl/reusables/conditions
 * NOUVEAU : Remplace /api/treebranchleaf/reusables/conditions
 */
router.get('/reusables/conditions', async (req, res) => {
  logRouteHit('GET /api/tbl/reusables/conditions');
  
  try {
    // console.log('🔄 [TBL CONDITIONS] Récupération conditions via TBL');
    
    // 🎯 Utilisation du singleton db centralisé
    const prisma = db;
    
    const conditions = await prisma.treeBranchLeafNodeCondition.findMany({
      include: {
        node: true
      }
    });
    
    // Note: Plus de $disconnect car on utilise le singleton
    
    return res.json({
      success: true,
      conditions,
      count: conditions.length
    });
    
  } catch (error) {
    console.error('❌ [TBL CONDITIONS] Erreur:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erreur interne', 
      details: error instanceof Error ? error.message : 'unknown' 
    });
  }
});

/**
 * 🔄 GET /api/tbl/reusables/formulas
 * NOUVEAU : Remplace /api/treebranchleaf/reusables/formulas
 */
router.get('/reusables/formulas', async (req, res) => {
  logRouteHit('GET /api/tbl/reusables/formulas');
  
  try {
    // console.log('🔄 [TBL FORMULAS] Récupération formules via TBL');
    
    // 🎯 Utilisation du singleton db centralisé
    const prisma = db;
    
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      include: {
        node: true
      }
    });
    
    // Note: Plus de $disconnect car on utilise le singleton
    
    return res.json({
      success: true,
      formulas,
      count: formulas.length
    });
    
  } catch (error) {
    console.error('❌ [TBL FORMULAS] Erreur:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erreur interne', 
      details: error instanceof Error ? error.message : 'unknown' 
    });
  }
});

export default router;
