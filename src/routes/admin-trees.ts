import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authMiddleware } from '../middlewares/auth';
import { impersonationMiddleware } from '../middlewares/impersonation';

const router = Router();

// Appliquer l'authentification à toutes les routes
router.use(authMiddleware, impersonationMiddleware);

// ============================================================
// 🌳 ADMIN - GESTION DES ARBRES (TreeBranchLeafTree)
// Accès : Super Admin uniquement
// ============================================================

// Helper pour vérifier le super admin
const checkSuperAdmin = (req: Request): boolean => {
  const user = req.user as { role?: string; isSuperAdmin?: boolean; roles?: string[] } | undefined;
  return !!(user?.isSuperAdmin || user?.role === 'super_admin' || user?.roles?.includes('super_admin'));
};

// GET /api/admin-trees - Liste tous les arbres avec leurs accès organisationnels
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!checkSuperAdmin(req)) {
      res.status(403).json({ error: 'Accès réservé au Super Admin' });
      return;
    }

    const trees = await db.treeBranchLeafTree.findMany({
      include: {
        TreeBranchLeafNode: {
          where: { parentId: null, type: 'branch' }, // Seuls les branches racines (= onglets)
          orderBy: { order: 'asc' },
          select: {
            id: true,
            label: true,
            type: true,
            order: true,
            isActive: true,
            subtabs: true,
            metadata: true,
          },
        },
        TreeOrganizationAccess: {
          include: {
            organization: {
              select: { id: true, name: true, status: true },
            },
          },
        },
        _count: {
          select: {
            TreeBranchLeafNode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrichir avec l'organisation propriétaire
    const enrichedTrees = await Promise.all(
      trees.map(async (tree) => {
        // Chercher le nom de l'org propriétaire
        const ownerOrg = await db.organization.findUnique({
          where: { id: tree.organizationId },
          select: { id: true, name: true },
        });

        return {
          ...tree,
          ownerOrganization: ownerOrg,
          tabs: tree.TreeBranchLeafNode, // Les onglets = nœuds racines
          accessCount: tree.TreeOrganizationAccess.length,
        };
      })
    );

    res.json(enrichedTrees);
  } catch (error) {
    console.error('[ADMIN-TREES] Erreur GET /:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des arbres' });
  }
});

// GET /api/admin-trees/:treeId - Détails d'un arbre avec tous ses onglets et accès
router.get('/:treeId', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!checkSuperAdmin(req)) {
      res.status(403).json({ error: 'Accès réservé au Super Admin' });
      return;
    }

    const { treeId } = req.params;

    const tree = await db.treeBranchLeafTree.findUnique({
      where: { id: treeId },
      include: {
        TreeBranchLeafNode: {
          where: { parentId: null, type: 'branch' }, // Seuls les branches racines (= onglets)
          orderBy: { order: 'asc' },
          select: {
            id: true,
            label: true,
            type: true,
            subType: true,
            order: true,
            isActive: true,
            subtabs: true,
            metadata: true,
          },
        },
        TreeOrganizationAccess: {
          include: {
            organization: {
              select: { id: true, name: true, status: true },
            },
          },
        },
      },
    });

    if (!tree) {
      res.status(404).json({ error: 'Arbre non trouvé' });
      return;
    }

    // Pour chaque onglet racine, extraire les sous-onglets depuis le champ `subtabs` JSON
    const tabsWithSubTabs = tree.TreeBranchLeafNode.map((tab) => {
      // Les sous-onglets sont des strings stockés dans le champ `subtabs` (ex: ["Générale","Electricité","Chauffage"])
      let parsedSubTabs: string[] = [];
      if (tab.subtabs) {
        try {
          const raw = typeof tab.subtabs === 'string' ? JSON.parse(tab.subtabs as string) : tab.subtabs;
          if (Array.isArray(raw)) {
            parsedSubTabs = raw;
          }
        } catch (e) {
          console.warn(`[ADMIN-TREES] Erreur parsing subtabs pour ${tab.label}:`, e);
        }
      }

      return {
        ...tab,
        subTabsList: parsedSubTabs, // Liste de noms de sous-onglets
      };
    });

    // Récupérer l'org propriétaire
    const ownerOrg = await db.organization.findUnique({
      where: { id: tree.organizationId },
      select: { id: true, name: true },
    });

    // Auto-créer l'accès pour l'org propriétaire si il n'existe pas encore
    const ownerAccessExists = tree.TreeOrganizationAccess.some(a => a.organizationId === tree.organizationId);
    if (!ownerAccessExists) {
      const newAccess = await db.treeOrganizationAccess.create({
        data: {
          treeId,
          organizationId: tree.organizationId,
          isOwner: true,
          tabAccessConfig: {},
          active: true,
        },
        include: {
          organization: {
            select: { id: true, name: true, status: true },
          },
        },
      });
      tree.TreeOrganizationAccess.push(newAccess);
      console.log(`[ADMIN-TREES] ✅ Accès propriétaire auto-créé pour org ${tree.organizationId}`);
    }

    // Récupérer tous les rôles disponibles
    const roles = await db.role.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, label: true, organizationId: true, isGlobal: true },
    });

    // Récupérer toutes les organisations
    const organizations = await db.organization.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    // Récupérer le nœud source produit (hasProduct=true avec product_options)
    const productSourceNode = await db.treeBranchLeafNode.findFirst({
      where: {
        treeId,
        hasProduct: true,
        product_options: { not: null as any },
      },
      select: {
        id: true,
        label: true,
        product_options: true,
      },
    });

    // Parser les product_options
    let productOptions: Array<{ value: string; label: string }> = [];
    if (productSourceNode?.product_options) {
      try {
        const raw = typeof productSourceNode.product_options === 'string'
          ? JSON.parse(productSourceNode.product_options as string)
          : productSourceNode.product_options;
        if (Array.isArray(raw)) {
          productOptions = raw;
        }
      } catch (e) {
        console.warn('[ADMIN-TREES] Erreur parsing product_options:', e);
      }
    }

    res.json({
      ...tree,
      tabs: tabsWithSubTabs,
      ownerOrganization: ownerOrg,
      roles,
      organizations,
      productSource: productSourceNode ? {
        id: productSourceNode.id,
        label: productSourceNode.label,
        options: productOptions,
      } : null,
    });
  } catch (error) {
    console.error('[ADMIN-TREES] Erreur GET /:treeId:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'arbre' });
  }
});

// POST /api/admin-trees/:treeId/access - Donner accès à un arbre à une organisation
router.post('/:treeId/access', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!checkSuperAdmin(req)) {
      res.status(403).json({ error: 'Accès réservé au Super Admin' });
      return;
    }

    const { treeId } = req.params;
    const { organizationId, isOwner, tabAccessConfig } = req.body;

    if (!organizationId) {
      res.status(400).json({ error: 'organizationId requis' });
      return;
    }

    // Vérifier que l'arbre existe
    const tree = await db.treeBranchLeafTree.findUnique({ where: { id: treeId } });
    if (!tree) {
      res.status(404).json({ error: 'Arbre non trouvé' });
      return;
    }

    // Vérifier que l'organisation existe
    const org = await db.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      res.status(404).json({ error: 'Organisation non trouvée' });
      return;
    }

    // Créer ou mettre à jour l'accès (upsert)
    const access = await db.treeOrganizationAccess.upsert({
      where: {
        treeId_organizationId: { treeId, organizationId },
      },
      update: {
        isOwner: isOwner ?? false,
        tabAccessConfig: tabAccessConfig ?? {},
        active: true,
      },
      create: {
        treeId,
        organizationId,
        isOwner: isOwner ?? false,
        tabAccessConfig: tabAccessConfig ?? {},
        active: true,
      },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    console.log(`[ADMIN-TREES] ✅ Accès créé/mis à jour: arbre ${treeId} → org ${org.name}`);
    res.json(access);
  } catch (error) {
    console.error('[ADMIN-TREES] Erreur POST /:treeId/access:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'accès' });
  }
});

// PUT /api/admin-trees/:treeId/access/:organizationId - Mettre à jour la config d'accès
router.put('/:treeId/access/:organizationId', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!checkSuperAdmin(req)) {
      res.status(403).json({ error: 'Accès réservé au Super Admin' });
      return;
    }

    const { treeId, organizationId } = req.params;
    const { tabAccessConfig, isOwner, active } = req.body;

    const access = await db.treeOrganizationAccess.update({
      where: {
        treeId_organizationId: { treeId, organizationId },
      },
      data: {
        ...(tabAccessConfig !== undefined && { tabAccessConfig }),
        ...(isOwner !== undefined && { isOwner }),
        ...(active !== undefined && { active }),
      },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    console.log(`[ADMIN-TREES] ✅ Config mise à jour: arbre ${treeId} → org ${organizationId}`);
    res.json(access);
  } catch (error) {
    console.error('[ADMIN-TREES] Erreur PUT access:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'accès' });
  }
});

// DELETE /api/admin-trees/:treeId/access/:organizationId - Retirer l'accès
router.delete('/:treeId/access/:organizationId', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!checkSuperAdmin(req)) {
      res.status(403).json({ error: 'Accès réservé au Super Admin' });
      return;
    }

    const { treeId, organizationId } = req.params;

    await db.treeOrganizationAccess.delete({
      where: {
        treeId_organizationId: { treeId, organizationId },
      },
    });

    console.log(`[ADMIN-TREES] ✅ Accès supprimé: arbre ${treeId} → org ${organizationId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[ADMIN-TREES] Erreur DELETE access:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'accès' });
  }
});

// POST /api/admin-trees/:treeId/duplicate - Dupliquer un arbre pour une autre organisation
router.post('/:treeId/duplicate', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!checkSuperAdmin(req)) {
      res.status(403).json({ error: 'Accès réservé au Super Admin' });
      return;
    }

    const { treeId } = req.params;
    const { targetOrganizationId, newName } = req.body;

    if (!targetOrganizationId) {
      res.status(400).json({ error: 'targetOrganizationId requis' });
      return;
    }

    // Récupérer l'arbre source avec tous ses nœuds
    const sourceTree = await db.treeBranchLeafTree.findUnique({
      where: { id: treeId },
      include: {
        TreeBranchLeafNode: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!sourceTree) {
      res.status(404).json({ error: 'Arbre source non trouvé' });
      return;
    }

    // Créer le nouvel arbre
    const newTree = await db.treeBranchLeafTree.create({
      data: {
        organizationId: targetOrganizationId,
        name: newName || `${sourceTree.name} (copie)`,
        description: sourceTree.description,
        category: sourceTree.category,
        icon: sourceTree.icon,
        color: sourceTree.color,
        version: '1.0.0',
        status: 'draft',
        settings: sourceTree.settings as object,
        metadata: sourceTree.metadata as object,
        isPublic: false,
      },
    });

    // Dupliquer les nœuds en mappant les anciens IDs vers les nouveaux
    const idMap = new Map<string, string>();
    const crypto = await import('crypto');

    // Premier passage : créer tous les nœuds avec de nouveaux IDs
    for (const node of sourceTree.TreeBranchLeafNode) {
      const newId = crypto.randomUUID();
      idMap.set(node.id, newId);
    }

    // Second passage : créer les nœuds avec les parentId mis à jour
    for (const node of sourceTree.TreeBranchLeafNode) {
      const newId = idMap.get(node.id)!;
      const newParentId = node.parentId ? idMap.get(node.parentId) || null : null;

      // Extraire les champs nécessaires
      const { id: _id, treeId: _treeId, createdAt: _createdAt, updatedAt: _updatedAt, parentId: _parentId, ...nodeData } = node;

      await db.treeBranchLeafNode.create({
        data: {
          id: newId,
          treeId: newTree.id,
          parentId: newParentId,
          ...nodeData,
        },
      });
    }

    // Créer automatiquement un accès propriétaire pour la nouvelle org
    await db.treeOrganizationAccess.create({
      data: {
        treeId: newTree.id,
        organizationId: targetOrganizationId,
        isOwner: true,
        tabAccessConfig: {},
      },
    });

    console.log(`[ADMIN-TREES] ✅ Arbre dupliqué: ${sourceTree.name} → ${newTree.name} (org: ${targetOrganizationId}, ${sourceTree.TreeBranchLeafNode.length} nœuds)`);
    res.json({
      tree: newTree,
      nodesCount: sourceTree.TreeBranchLeafNode.length,
    });
  } catch (error) {
    console.error('[ADMIN-TREES] Erreur POST duplicate:', error);
    res.status(500).json({ error: 'Erreur lors de la duplication de l\'arbre' });
  }
});

// GET /api/admin-trees/organizations - Liste les organisations pour le sélecteur
router.get('/organizations/list', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!checkSuperAdmin(req)) {
      res.status(403).json({ error: 'Accès réservé au Super Admin' });
      return;
    }

    const organizations = await db.organization.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    res.json(organizations);
  } catch (error) {
    console.error('[ADMIN-TREES] Erreur GET organizations:', error);
    res.status(500).json({ error: 'Erreur' });
  }
});

// GET /api/admin-trees/roles/list - Liste les rôles pour le sélecteur
router.get('/roles/list', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!checkSuperAdmin(req)) {
      res.status(403).json({ error: 'Accès réservé au Super Admin' });
      return;
    }

    const roles = await db.role.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, label: true, organizationId: true, isGlobal: true },
    });

    res.json(roles);
  } catch (error) {
    console.error('[ADMIN-TREES] Erreur GET roles:', error);
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;
