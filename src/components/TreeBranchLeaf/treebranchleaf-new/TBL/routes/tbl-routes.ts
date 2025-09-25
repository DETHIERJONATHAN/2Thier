import express from 'express';
import { authMiddleware, requireRole, type AuthenticatedRequest } from '../../../../../middlewares/auth';
import { PrismaClient } from '@prisma/client';

const router = express.Router();

/**
 * 🔧 ENDPOINTS DE CONFIGURATION TBL (DYNAMIQUES)
 * Objectif: fournir 0 code en dur. Toutes les données proviennent de Prisma.
 *
 * Sources de vérité utilisées:
 * - treeBranchLeafNodeVariable      → variables exposées (exposedKey, displayName...)
 * - treeBranchLeafNode (fields)     → extraction des champs (leaf_*) pour construire une config minimale
 * - (calculation-modes)             → Pas encore de table dédiée: construit dynamiquement via heuristique de regroupement
 *
 * Contrats de réponse:
 * GET /api/tbl/variables -> { variables: Array<{ id, nodeId, exposedKey, displayName, sourceRef, displayFormat, unit, precision }> }
 * GET /api/tbl/fields -> { fields: Array<{ id, nodeId, type, label, required, defaultValue }> }
 * GET /api/tbl/calculation-modes -> { modes: Array<{ id, code, label, fields: Array<{ id, code, label, type, unit? }> }> }
 * GET /api/tbl/modes (alias)
 *
 * Filtres d'organisation:
 * - Si super_admin → visibilité globale
 * - Sinon → restreint aux nodes dont l'arbre appartient à l'organisation de l'utilisateur
 */

const prisma = new PrismaClient();

interface AuthCtx { isSuperAdmin: boolean; organizationId: string | null }
function getAuthCtx(req: AuthenticatedRequest): AuthCtx {
  const role = (req.user?.role || '').toLowerCase();
  // @ts-expect-error propriété potentielle côté backend
  const possibleFlag: unknown = req.user?.isSuperAdmin;
  const isSuperAdmin = role === 'super_admin' || possibleFlag === true;
  const organizationId = req.user?.organizationId || null;
  return { isSuperAdmin, organizationId };
}

// ✅ Variables exposées dynamiques
router.get('/variables', authMiddleware, requireRole(['user', 'admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { isSuperAdmin, organizationId } = getAuthCtx(req);

    // Relation correcte = "TreeBranchLeafNode" (et non "node").
    const raw = await prisma.treeBranchLeafNodeVariable.findMany({
      include: {
        TreeBranchLeafNode: {
          select: {
            id: true,
            treeId: true,
            TreeBranchLeafTree: { select: { organizationId: true } }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    interface RawVarWithRelations {
      id: string;
      nodeId: string;
      exposedKey: string;
      displayName: string;
      displayFormat: string;
      unit: string | null;
      precision: number | null;
      sourceRef: string | null;
      sourceType: string | null;
      updatedAt: Date;
      TreeBranchLeafNode?: {
        id: string;
        treeId: string;
        TreeBranchLeafTree?: { organizationId: string } | null;
      } | null;
    }

    const variables = (raw as unknown as RawVarWithRelations[])
      .filter(v => {
        if (isSuperAdmin) return true;
        const nodeOrg = v.TreeBranchLeafNode?.TreeBranchLeafTree?.organizationId;
        return !organizationId || !nodeOrg || nodeOrg === organizationId;
      })
      .map(v => ({
        id: v.id,
        nodeId: v.nodeId,
        exposedKey: v.exposedKey,
        displayName: v.displayName,
        sourceRef: v.sourceRef ?? null,
        sourceType: v.sourceType ?? null,
        displayFormat: v.displayFormat,
        unit: v.unit ?? null,
        precision: v.precision ?? null,
        updatedAt: v.updatedAt
      }));

    return res.json({ variables, count: variables.length, source: 'database' });
  } catch (e) {
    const err = e as Error;
    console.error('❌ [TBL API] Erreur GET /variables:', err.message, err.stack);
    return res.status(500).json({ error: 'Erreur serveur variables', details: err.message });
  }
});

// ✅ Modes / Capacités dynamiques (VRAIE détection, pas d'heuristique par unité)
// Règle: on dérive une "capacité" à partir de sourceRef / tables associées.
// Capacités: 1=neutre (variable simple), 2=formule, 3=condition, 4=tableau
// Réponse: { modes: [{ id, code, label, capacity, fields: [{ id, code, label, type, capacity }] }] }
router.get(['/calculation-modes', '/modes'], authMiddleware, requireRole(['user', 'admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { isSuperAdmin, organizationId } = getAuthCtx(req);

    const rawVariables = await prisma.treeBranchLeafNodeVariable.findMany({
      include: {
        TreeBranchLeafNode: {
          select: {
            id: true,
            treeId: true,
            parentId: true,
            type: true,
            TreeBranchLeafTree: { select: { organizationId: true } }
          }
        }
      }
    });

    type RawVar = typeof rawVariables[number] & { TreeBranchLeafNode?: { TreeBranchLeafTree?: { organizationId: string } | null } | null };
    const accessible = (rawVariables as RawVar[]).filter(v => {
      if (isSuperAdmin) return true;
      const nodeOrg = v.TreeBranchLeafNode?.TreeBranchLeafTree?.organizationId;
      return !organizationId || !nodeOrg || nodeOrg === organizationId;
    });

    interface CapacityField { id: string; code: string; label: string; type: string; capacity: string; sourceRef: string | null }
    interface Mode { id: string; code: string; label: string; capacity: string; fields: CapacityField[] }

    const capacityBuckets: Record<string, CapacityField[]> = { '1': [], '2': [], '3': [], '4': [] };

    function detectCapacity(sourceRef: string | null | undefined): string {
      if (!sourceRef) return '1';
      if (sourceRef.startsWith('formula:')) return '2';
      if (sourceRef.startsWith('condition:')) return '3';
      if (sourceRef.startsWith('table:')) return '4';
      // UUID direct => neutre
      return '1';
    }

    for (const v of accessible) {
      const capacity = detectCapacity(v.sourceRef as string | null | undefined);
      const fieldType = (v.displayFormat || '').startsWith('number') ? 'number' : 'text';
      const f: CapacityField = {
        id: v.id,
        code: v.exposedKey || v.id,
        label: v.displayName || v.exposedKey || v.id,
        type: fieldType,
        capacity,
        sourceRef: v.sourceRef || null
      };
      capacityBuckets[capacity].push(f);
    }

    // Construire un mode par capacité existante (non vide)
    const capacityMeta: Record<string, { code: string; label: string }> = {
      '1': { code: 'neutral', label: 'Variables neutres' },
      '2': { code: 'formulas', label: 'Formules' },
      '3': { code: 'conditions', label: 'Conditions' },
      '4': { code: 'tables', label: 'Tableaux' }
    };

    const modes: Mode[] = Object.entries(capacityBuckets)
      .filter(([, list]) => list.length > 0)
      .map(([cap, list]) => ({
        id: `capacity_${cap}`,
        code: capacityMeta[cap].code,
        label: capacityMeta[cap].label,
        capacity: cap,
        fields: list.slice(0, 100) // limite de sécurité
      }));

    // Si aucune variable → mode vide neutre
    if (modes.length === 0) {
      modes.push({ id: 'capacity_1', code: 'neutral', label: 'Variables neutres', capacity: '1', fields: [] });
    }

    return res.json({ modes, count: modes.length, source: 'derived_capacity', generatedAt: new Date().toISOString() });
  } catch (e) {
    const err = e as Error;
    console.error('❌ [TBL API] Erreur GET /calculation-modes (capacity detection):', err.message, err.stack);
    return res.status(500).json({ error: 'Erreur serveur calculation-modes', details: err.message });
  }
});

// ✅ Fields dynamiques: extraction des nodes de type leaf_* (ou avec hasData=true)
router.get('/fields', authMiddleware, requireRole(['user', 'admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { isSuperAdmin, organizationId } = getAuthCtx(req);
    // Récupère nœuds potentiels de champs
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { type: { startsWith: 'leaf_' } },
          { hasData: true }
        ]
      },
      select: {
        id: true,
        label: true,
        type: true,
        fieldType: true,
        fieldSubType: true,
        hasData: true,
        treeId: true,
        parentId: true,
        order: true,
        TreeBranchLeafTree: { select: { organizationId: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    type RawNode = typeof nodes[number];
    const filtered = (nodes as RawNode[]).filter(n => {
      if (isSuperAdmin) return true;
      const nodeOrg = n.TreeBranchLeafTree?.organizationId;
      return !organizationId || !nodeOrg || nodeOrg === organizationId;
    });

    const fields = filtered.map(n => ({
      id: n.id,
      nodeId: n.id,
      type: (n.fieldType || n.fieldSubType || n.type || '').replace(/^leaf_/, '') || 'text',
      label: n.label || n.id,
      required: false,
      defaultValue: null,
      category: n.fieldSubType || null,
      order: n.order
    }));

    return res.json({ fields, count: fields.length, source: 'database' });
  } catch (e) {
    console.error('❌ [TBL API] Erreur GET /fields:', e);
    return res.status(500).json({ error: 'Erreur serveur fields' });
  }
});

// POST /api/tbl/devis - Sauvegarder un devis TBL
router.post('/devis', authMiddleware, requireRole(['user', 'admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { clientId, treeId, organizationId, userId, projectName, notes, isDraft, formData, metadata } = req.body || {};

    if (req.user?.organizationId && organizationId && req.user.organizationId !== organizationId) {
      return res.status(403).json({ success: false, error: 'Accès refusé à cette organisation' });
    }

    // Génère un ID interne (pas encore de persistance table devis dédiée)
    const devisId = `tbl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const payload = {
      devisId,
      clientId: clientId || null,
      treeId: treeId || null,
      organizationId: organizationId || req.user?.organizationId || null,
      userId: userId || req.user?.id || null,
      projectName: projectName || `Projet TBL ${new Date().toLocaleDateString()}`,
      notes: notes || '',
      isDraft: Boolean(isDraft),
      formData: typeof formData === 'object' && formData ? formData : {},
      metadata: { ...(metadata || {}), savedAt: new Date().toISOString(), version: '1.0' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return res.json({ success: true, ...payload, message: 'Devis TBL sauvegardé (simulation)' });
  } catch (error) {
    console.error('❌ [TBL API] Erreur sauvegarde devis:', error);
    return res.status(500).json({ success: false, error: 'Erreur serveur lors de la sauvegarde du devis' });
  }
});

// ✅ Endpoint de santé / meta configuration TBL
router.get('/config/health', authMiddleware, requireRole(['user','admin','super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const [varCount, formulaCount, conditionCount, tableCount] = await Promise.all([
      prisma.treeBranchLeafNodeVariable.count(),
      prisma.treeBranchLeafNodeFormula.count().catch(() => 0),
  // @ts-expect-error table potentielle condition pas toujours générée
      prisma.treeBranchLeafNodeCondition?.count?.().catch?.(() => 0) || 0,
  // @ts-expect-error table potentielle table pas toujours générée
      prisma.treeBranchLeafNodeTable?.count?.().catch?.(() => 0) || 0
    ]);

    // Distribution capacités (re-scan rapide limité 500 pour performance)
    const sample = await prisma.treeBranchLeafNodeVariable.findMany({
      select: { id: true, sourceRef: true },
      take: 500,
      orderBy: { updatedAt: 'desc' }
    });
    const capacityCounts = { '1': 0, '2': 0, '3': 0, '4': 0 };
    for (const v of sample) {
      const sr = v.sourceRef || '';
      if (sr.startsWith('formula:')) capacityCounts['2']++; else if (sr.startsWith('condition:')) capacityCounts['3']++; else if (sr.startsWith('table:')) capacityCounts['4']++; else capacityCounts['1']++;
    }
    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      counts: {
        variables: varCount,
        formulas: formulaCount,
        conditions: conditionCount,
        tables: tableCount
      },
      capacitySample: capacityCounts,
      sampleSize: sample.length
    });
  } catch (e) {
    const err = e as Error;
    return res.status(500).json({ success: false, error: 'Erreur health config', details: err.message });
  }
});
// GET /api/tbl/devis/client/:clientId - Récupérer les devis d'un client
router.get('/devis/client/:clientId', authMiddleware, requireRole(['user', 'admin', 'super_admin']), async (_req: AuthenticatedRequest, res) => {
  try {
    // const { clientId } = req.params; // (non utilisé pour l'instant)

    // Pour l'instant, retourner un tableau vide
    
    res.json([]);

  } catch (error) {
    console.error('❌ [TBL API] Erreur récupération devis client:', error);
    res.status(500).json({
      error: 'Erreur serveur lors de la récupération des devis'
    });
  }
});
// GET /api/tbl/devis/:devisId - Charger un devis spécifique
router.get('/devis/:devisId', authMiddleware, requireRole(['user', 'admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { devisId } = req.params;

    // console.log('📖 [TBL API] Chargement devis:', devisId); // ✨ Log réduit

    // Pour l'instant, retourner un devis vide
    res.json({
      devisId,
      clientId: null,
      treeId: null,
      organizationId: null,
      userId: null,
      projectName: '',
      notes: '',
      isDraft: true,
      formData: {},
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [TBL API] Erreur chargement devis:', error);
    res.status(500).json({
      error: 'Erreur serveur lors du chargement du devis'
    });
  }
});
// GET /api/clients/:clientId/access-check - Vérifier l'accès à un client
router.get('/clients/:clientId/access-check', authMiddleware, requireRole(['user', 'admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { clientId } = req.params;
    const { role } = req.user || {};

    // console.log('🔍 [TBL API] Vérification accès client:', { clientId, userRole: role }); // ✨ Log réduit

    // Pour l'instant, toujours autoriser l'accès
    res.json({
      hasAccess: true,
      clientId,
      userRole: role
    });
  } catch (error) {
    console.error('❌ [TBL API] Erreur vérification accès client:', error);
    res.status(500).json({
      error: 'Erreur serveur lors de la vérification d\'accès'
    });
  }
});
export default router;
