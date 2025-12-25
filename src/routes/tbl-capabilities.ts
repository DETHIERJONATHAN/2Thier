import express from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';

// NOTE: requireRole peut être importé si restriction fine nécessaire
// import { requireRole } from '../middleware/auth';

const prisma = db;
const router = express.Router();

/**
 * Shape de la capability retournée au frontend.
 * On garde une forme volontairement plate et explicite pour un usage direct côté hook.
 */
interface TBLCapabilityBase {
  nodeId: string;
  variableId?: string; // id TreeBranchLeafNodeVariable
  sourceRef?: string | null;
  sourceType?: string | null;
  exposedKey?: string | null;
  displayName?: string | null;
  capacity: 'data' | 'formula' | 'condition' | 'table' | 'fixed' | 'unknown';
  hasFormula?: boolean;
  hasCondition?: boolean;
  hasTable?: boolean;
  fixedValue?: string | null;
  // dépendances (extraites des tokens / conditionSet si possible)
  dependencies?: string[];
  // payload brut utile pour debug localStorage.TBL_DIAG
  raw?: Record<string, unknown>;
}

interface CapabilityResolverOptions {
  includeRaw?: boolean;
  extractDependencies?: boolean;
}

/**
 * Extraction rapide des références depuis un tableau de tokens de formule.
 * Hypothèse: token = { type, value } et les refs de variables ont type 'ref' ou pattern '@value.<uuid>'
 */
interface FormulaTokenRef { type: string; value?: string }
type FormulaToken = FormulaTokenRef | string | null | undefined;
function extractFormulaDependencies(tokens: FormulaToken[]): string[] {
  const deps: string[] = [];
  for (const t of tokens || []) {
    if (!t) continue;
    if (typeof t === 'object' && 'type' in t && t.type === 'ref' && typeof t.value === 'string') {
      deps.push(t.value);
    } else if (typeof t === 'string') {
      const m = t.match(/@value\.[0-9a-fA-F-]{36}/g);
      if (m) m.forEach(ref => deps.push(ref.replace('@value.', '')));
    }
  }
  return Array.from(new Set(deps));
}

/**
 * Extraction dépendances depuis un conditionSet (branches[].when.left/right.ref etc.)
 */
type JSONValue = string | number | boolean | null | JSONValue[] | { [k: string]: JSONValue };
// ConditionSet structure libre
function extractConditionDependencies(conditionSet: JSONValue): string[] {
  if (!conditionSet || typeof conditionSet !== 'object') return [];
  const deps = new Set<string>();
  const scan = (obj: JSONValue): void => {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(scan);
      return;
    }
    // obj est un record
    const rec = obj as { [k: string]: JSONValue } & { ref?: JSONValue };
    if (typeof rec.ref === 'string') {
      const cleaned = rec.ref.startsWith('@value.') ? rec.ref.substring(7) : rec.ref;
      deps.add(cleaned);
    }
    for (const k of Object.keys(rec)) scan(rec[k]);
  };
  scan(conditionSet);
  return Array.from(deps);
}

/**
 * Résout les capabilities pour un tree donné.
 * Stratégie: charger variables + formules + conditions + tables en batch, puis fusionner par nodeId.
 */
async function resolveCapabilities(treeId: string, opts: CapabilityResolverOptions = {}): Promise<TBLCapabilityBase[]> {
  // 1. Récupération en parallèle
  const [variables, formulas, conditions, tables] = await Promise.all([
    prisma.treeBranchLeafNodeVariable.findMany({
      where: { TreeBranchLeafNode: { treeId } },
      select: {
        id: true,
        nodeId: true,
        sourceRef: true,
        sourceType: true,
        exposedKey: true,
        displayName: true,
        fixedValue: true,
        selectedNodeId: true
      }
    }),
    prisma.treeBranchLeafNodeFormula.findMany({
      where: { TreeBranchLeafNode: { treeId } },
      select: { id: true, nodeId: true, tokens: true, name: true }
    }),
    prisma.treeBranchLeafNodeCondition.findMany({
      where: { TreeBranchLeafNode: { treeId } },
      select: { id: true, nodeId: true, conditionSet: true, name: true }
    }),
    prisma.treeBranchLeafNodeTable.findMany({
      where: { TreeBranchLeafNode: { treeId } },
      select: { id: true, nodeId: true, type: true, name: true, meta: true }
    })
  ]);

  // Indexation par nodeId
  const formulaByNode = new Map<string, typeof formulas[0]>();
  formulas.forEach(f => formulaByNode.set(f.nodeId, f));
  const conditionByNode = new Map<string, typeof conditions[0]>();
  conditions.forEach(c => conditionByNode.set(c.nodeId, c));
  const tableByNode = new Map<string, typeof tables[0]>();
  tables.forEach(t => tableByNode.set(t.nodeId, t));

  const capabilities: TBLCapabilityBase[] = [];

  for (const v of variables) {
    let capacity: TBLCapabilityBase['capacity'] = 'unknown';
    let deps: string[] = [];

    // Détection par sourceRef si présent
    if (v.sourceRef) {
      if (v.sourceRef.startsWith('formula:') || v.sourceRef.startsWith('node-formula:')) capacity = 'formula';
      else if (v.sourceRef.startsWith('condition:')) capacity = 'condition';
      else if (v.sourceRef.startsWith('table:')) capacity = 'table';
      else if (v.sourceType === 'fixed' || v.fixedValue) capacity = 'fixed';
      else capacity = 'data';
    } else if (v.fixedValue) {
      capacity = 'fixed';
    } else {
      // fallback: regarder existence de ressources associées au node
      if (formulaByNode.has(v.nodeId)) capacity = 'formula';
      else if (conditionByNode.has(v.nodeId)) capacity = 'condition';
      else if (tableByNode.has(v.nodeId)) capacity = 'table';
      else capacity = 'data';
    }

    const formula = formulaByNode.get(v.nodeId);
    const condition = conditionByNode.get(v.nodeId);
    const table = tableByNode.get(v.nodeId);

    if (opts.extractDependencies) {
  if (formula?.tokens) deps = extractFormulaDependencies(formula.tokens as unknown as FormulaToken[]);
  else if (condition?.conditionSet) deps = extractConditionDependencies(condition.conditionSet as unknown as JSONValue);
      // Table dependencies: à définir plus tard (ex: références colonnes)
    }

    const cap: TBLCapabilityBase = {
      nodeId: v.nodeId,
      variableId: v.id,
      sourceRef: v.sourceRef,
      sourceType: v.sourceType,
      exposedKey: v.exposedKey,
      displayName: v.displayName,
      fixedValue: v.fixedValue,
      capacity,
      hasFormula: !!formula,
      hasCondition: !!condition,
      hasTable: !!table,
      dependencies: deps.length ? deps : undefined,
      raw: opts.includeRaw ? { variable: v, formula, condition, table } : undefined
    };

    capabilities.push(cap);
  }

  return capabilities;
}

/**
 * GET /api/tbl/capabilities?treeId=xxx&raw=1&deps=1
 * Retourne la liste des capabilities pour toutes les variables d'un tree.
 */
router.get('/capabilities', authenticateToken, async (req, res) => {
  try {
    const treeId = String(req.query.treeId || '');
    if (!treeId) {
      return res.status(400).json({ error: 'treeId requis' });
    }

    const includeRaw = req.query.raw === '1' || req.query.raw === 'true';
    const extractDeps = req.query.deps === '1' || req.query.deps === 'true';

    // TODO: Vérifier ownership/organization du treeId avant de retourner les données
    const data = await resolveCapabilities(treeId, { includeRaw, extractDependencies: extractDeps });

    res.json({
      treeId,
      count: data.length,
      capabilities: data,
      meta: {
        extractedAt: new Date().toISOString(),
        raw: includeRaw,
        deps: extractDeps,
        version: 'v1'
      }
    });
  } catch (error) {
    const err = error as Error;
    console.error('❌ [TBL Capabilities] Erreur:', err);
    res.status(500).json({ error: 'Erreur serveur capabilities', details: err.message });
  }
});

export default router;
