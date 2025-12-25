import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const prisma = db;

// Fallback SQL supprimés: on s’appuie désormais sur Prisma Client uniquement.

router.use(authMiddleware as unknown as (req: Request, res: Response, next: () => void) => void);

type FlatNode = { id: string; label: string; value: string | null; parentId: string | null; order: number; data: unknown };
type TreeNode = FlatNode & { children: TreeNode[] };
// Enrichi pour réponse API front
export type EnrichedNode = {
  id: string;
  label: string;
  value: string | null;
  parentId: string | null;
  order: number;
  data: unknown;
  children: EnrichedNode[];
  hasChildren: boolean;
  hasExtra: boolean; // data.nextField
  pathIds: string[]; // chemin des ids racine -> ce nœud
  pathLabels: string[]; // labels sur le chemin
};

function buildTree(nodes: FlatNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>(nodes.map(n => [n.id, { ...n, children: [] }]));
  const roots: TreeNode[] = [];
  nodes.forEach(n => {
    if (n.parentId && byId.has(n.parentId)) {
      const parent = byId.get(n.parentId)!;
      parent.children.push(byId.get(n.id)!);
    } else {
      roots.push(byId.get(n.id)!);
    }
  });
  // trier par order
  const sortRec = (arr: TreeNode[]) => {
    arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    arr.forEach((c) => sortRec(c.children || []));
  };
  sortRec(roots);
  return roots;
}

// GET /api/option-nodes/:id -> détails d'un nœud (incl. data)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const node = await prisma.fieldOptionNode.findUnique({ where: { id }, select: { id: true, label: true, value: true, parentId: true, order: true, data: true, fieldId: true } });
    if (!node) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: node });
  } catch (e) {
    console.error('[API] GET option-node detail error:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/option-nodes/field/:fieldId/tree -> arborescence complète
router.get('/field/:fieldId/tree', async (req: Request, res: Response) => {
  try {
    const { fieldId } = req.params;
    const nodes = await prisma.fieldOptionNode.findMany({
      where: { fieldId },
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
      select: { id: true, label: true, value: true, parentId: true, order: true, data: true },
    });
    const tree = buildTree(nodes as FlatNode[]);
    // Construire index enfants pour hasChildren rapide
    const childrenCount = new Map<string, number>();
    tree.forEach(function collect(n){
      n.children.forEach(c=>collect(c));
      if(n.parentId){ childrenCount.set(n.parentId, (childrenCount.get(n.parentId)||0)+1); }
    });
    const enrich = (n: TreeNode, pathIds: string[], pathLabels: string[]): EnrichedNode => {
      const nextIds = [...pathIds, n.id];
      const nextLabels = [...pathLabels, n.label];
      const children = n.children.map(c=>enrich(c,nextIds,nextLabels));
  const dataObj = (n.data && typeof n.data==='object') ? n.data as Record<string, unknown> : {};
  const hasExtra = Object.prototype.hasOwnProperty.call(dataObj,'nextField') && !!(dataObj as { nextField?: unknown }).nextField;
      return {
        id: n.id,
        label: n.label,
        value: n.value,
        parentId: n.parentId,
        order: n.order,
        data: n.data,
        children,
        hasChildren: children.length>0,
        hasExtra,
        pathIds: nextIds,
        pathLabels: nextLabels,
      };
    };
    const enriched = tree.map(r=>enrich(r,[],[]));
    return res.json({ success: true, data: enriched, _v: 1 });
  } catch (e) {
    console.error('[API] GET option-nodes tree error:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/option-nodes/field/:fieldId/children?parentId=xxx
router.get('/field/:fieldId/children', async (req: Request, res: Response) => {
  try {
    const { fieldId } = req.params;
    const parentId = (req.query.parentId as string | undefined) || null;
    const base = await prisma.fieldOptionNode.findMany({ where: { fieldId, parentId }, orderBy: { order: 'asc' } });
    const children = base.map((b) => ({ id: b.id, label: b.label, value: b.value ?? undefined }));
    return res.json({ success: true, data: children });
  } catch (e) {
    console.error('[API] GET option-nodes children error:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/option-nodes -> create
router.post('/', async (req: Request, res: Response) => {
  try {
    const { fieldId, parentId, label, value, order, data } = req.body as { fieldId: string; parentId?: string | null; label: string; value?: string | null; order?: number; data?: unknown };
    if (!fieldId || !label) return res.status(400).json({ success: false, message: 'fieldId et label requis' });
    
    // Using FieldOptionNode with hierarchy support
    const created = await prisma.fieldOptionNode.create({ 
      data: { 
        fieldId, 
        parentId: parentId ?? null,
        label, 
        value: value ?? label, // Use label as value if not provided
        order: order ?? 0,
        data: data ?? undefined
      } 
    });
    
    return res.json({ success: true, data: created });
  } catch (e) {
    console.error('[API] POST option-nodes create error:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/option-nodes/:id -> update
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, value, order, data, parentId } = req.body as { label?: string; value?: string | null; order?: number; data?: unknown; parentId?: string | null };
    const updated = await prisma.fieldOptionNode.update({ where: { id }, data: { label: label ?? undefined, value: value === undefined ? undefined : value, order: order ?? undefined, data: data === undefined ? undefined : data, parentId: parentId === undefined ? undefined : parentId } });
    return res.json({ success: true, data: updated });
  } catch (e) {
    console.error('[API] PUT option-nodes update error:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/option-nodes/:id -> delete subtree or node only (query mode=with-children|only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mode = (req.query.mode as string) || 'with-children';
    if (mode === 'only') {
      const node = await prisma.fieldOptionNode.findUnique({ where: { id }, select: { parentId: true } });
      if (!node) return res.status(404).json({ success: false, message: 'Not found' });
      await prisma.$transaction([
        prisma.fieldOptionNode.updateMany({ where: { parentId: id }, data: { parentId: node.parentId } }),
        prisma.fieldOptionNode.delete({ where: { id } }),
      ]);
      return res.json({ success: true });
    }
    const collectIds = async (ids: string[]): Promise<string[]> => {
      const children = await prisma.fieldOptionNode.findMany({ where: { parentId: { in: ids } }, select: { id: true } });
      if (children.length === 0) return ids;
      const childIds = children.map((c) => c.id);
      const all = await collectIds(childIds);
      return [...ids, ...all];
    };
    const allIds = await collectIds([id]);
    await prisma.fieldOptionNode.deleteMany({ where: { id: { in: allIds } } });
    return res.json({ success: true });
  } catch (e) {
    console.error('[API] DELETE option-nodes error:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/option-nodes/reorder -> réordonner sous un parent
router.post('/reorder', async (req: Request, res: Response) => {
  try {
    const { fieldId, orderedIds } = req.body as { fieldId: string; orderedIds: string[] };
    if (!fieldId || !Array.isArray(orderedIds)) return res.status(400).json({ success: false, message: 'Payload invalide' });
    await prisma.$transaction(orderedIds.map((id, idx) => prisma.fieldOptionNode.update({ where: { id }, data: { order: idx } })));
    return res.json({ success: true });
  } catch (e) {
    console.error('[API] POST option-nodes reorder error:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/option-nodes/import -> remplacer tout l'arbre d'un champ à partir d'un JSON
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { fieldId, tree } = req.body as { fieldId: string; tree: Array<TreeNode> };
    if (!fieldId || !Array.isArray(tree)) return res.status(400).json({ success: false, message: 'Payload invalide' });
    await prisma.fieldOptionNode.deleteMany({ where: { fieldId } });
    const inserts: Array<Promise<unknown>> = [];
    const walk = (nodes: TreeNode[], parentId: string | null) => {
      nodes.forEach((n, idx) => {
        const id = n.id || undefined; // laisser Prisma générer si absent
        inserts.push(prisma.fieldOptionNode.create({ data: { id, fieldId, parentId, label: n.label, value: n.value ?? null, order: idx, data: n.data ?? undefined } }));
        if (Array.isArray(n.children) && n.children.length > 0) {
          if (!n.id) {
            throw new Error('Chaque nœud avec enfants doit fournir un id pour import');
          }
          walk(n.children, n.id);
        }
      });
    };
    walk(tree, null);
    await Promise.all(inserts);
    return res.json({ success: true });
  } catch (e) {
    console.error('[API] POST option-nodes import error:', e);
    return res.status(500).json({ success: false, message: (e as Error)?.message || 'Erreur serveur' });
  }
});

// GET /api/option-nodes/export/:fieldId -> exporter l'arbre
router.get('/export/:fieldId', async (req: Request, res: Response) => {
  try {
    const { fieldId } = req.params;
    const nodes = await prisma.fieldOptionNode.findMany({ where: { fieldId }, orderBy: [{ parentId: 'asc' }, { order: 'asc' }], select: { id: true, label: true, value: true, parentId: true, order: true, data: true } });
    return res.json({ success: true, data: buildTree(nodes as FlatNode[]) });
  } catch (e) {
    console.error('[API] GET option-nodes export error:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;
