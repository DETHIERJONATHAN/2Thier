import { Router } from 'express';
import { db } from '../lib/database';
import { authMiddleware, requireSuperAdmin } from '../middlewares/auth';

const router = Router();
const prisma = db;

// Types pour les données de soumission
interface SubmissionDataItem {
  nodeId: string;
  value?: string;
  calculatedValue?: string;
  metadata?: Record<string, unknown>;
}

// =======================================
// 🌳 ROUTES SYSTÈME TREEBRANCHLEAF V2
// =======================================

// Appliquer l'authentification à toutes les routes
router.use(authMiddleware);

// =======================================
// 📋 GESTION DES ARBRES
// =======================================

// Récupérer tous les arbres de l'organisation (admin/superadmin seulement)
router.get('/trees', requireSuperAdmin, async (req, res) => {
  try {
    console.log('[TreeAPI V2] Requête GET /trees reçue');
    const { organizationId } = req.user!;
    console.log('[TreeAPI V2] OrganizationId:', organizationId);

    const trees = await prisma.treeBranchLeafTree.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: {
            TreeBranchLeafNode: true,
            TreeBranchLeafSubmission: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('[TreeAPI V2] Arbres trouvés:', trees.length);
    console.log('[TreeAPI V2] Premier arbre (si existe):', trees[0] ? { id: trees[0].id, name: trees[0].name, organizationId: trees[0].organizationId } : 'Aucun arbre');
    res.json(trees);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API_V2] Error fetching trees:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des arbres' });
  }
});

// Créer un nouvel arbre (superadmin seulement)
router.post('/trees', requireSuperAdmin, async (req, res) => {
  try {
    console.log('[TreeAPI V2] Requête POST /trees reçue:', req.body);
    const { organizationId } = req.user!;
    const { name, description, icon, color } = req.body;

    // Conversion de la couleur en string hex si c'est un objet
    let colorString = '#10b981'; // Couleur par défaut
    if (color) {
      if (typeof color === 'string') {
        colorString = color;
      } else if (color.metaColor && color.metaColor.r !== undefined) {
        // Convertir RGB en hex
        const { r, g, b } = color.metaColor;
        const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
        colorString = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      }
    }

    const tree = await prisma.treeBranchLeafTree.create({
      data: {
        organizationId,
        name,
        description,
        icon,
        color: colorString,
        category: 'formulaire',
      },
    });

    console.log('[TreeAPI V2] Arbre créé:', tree.id);
    res.status(201).json(tree);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API_V2] Error creating tree:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'arbre' });
  }
});

// Récupérer un arbre spécifique avec tous ses nœuds
router.get('/trees/:treeId', async (req, res) => {
  try {
    console.log('[TreeAPI V2] Requête GET /trees/:treeId reçue:', req.params.treeId);
    const { organizationId, role } = req.user!;
    const { treeId } = req.params;

    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: {
        id: treeId,
        organizationId,
      },
      include: {
        TreeBranchLeafNode: {
          include: {
            other_TreeBranchLeafNode: {
              include: {
                other_TreeBranchLeafNode: {
                  include: {
                    other_TreeBranchLeafNode: true, // Jusqu'à 4 niveaux de profondeur
                  },
                },
              },
            },
            MarkerLinks: {
              include: {
                Marker: true,
              },
            },
          },
          where: {
            parentId: null, // Seulement les nœuds racines
          },
          orderBy: { order: 'asc' },
        },
        Markers: {
          orderBy: { name: 'asc' },
        },
        TableData: {
          orderBy: { name: 'asc' },
        },
        APIConnections: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!tree) {
      console.log('[TreeAPI V2] Arbre non trouvé:', treeId);
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

    // Si ce n'est pas le super admin, on ne renvoie que les arbres publiés
    if (role !== 'super_admin' && tree.status !== 'published') {
      return res.status(403).json({ error: 'Accès non autorisé à cet arbre' });
    }

    console.log('[TreeAPI V2] Arbre trouvé avec', tree.Nodes?.length || 0, 'nœuds racines');
    res.json(tree);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API_V2] Error fetching tree:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'arbre' });
  }
});

// Mettre à jour un arbre (superadmin seulement)
router.put('/trees/:treeId', requireSuperAdmin, async (req, res) => {
  try {
    console.log('[TreeAPI V2] Requête PUT /trees/:treeId reçue:', req.params.treeId, req.body);
    const { organizationId } = req.user!;
    const { treeId } = req.params;
    const { name, description, icon, color, status } = req.body;

    const tree = await prisma.treeBranchLeafTree.updateMany({
      where: {
        id: treeId,
        organizationId,
      },
      data: {
        name,
        description,
        icon,
        color,
        status,
        updatedAt: new Date(),
      },
    });

    if (tree.count === 0) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

    console.log('[TreeAPI V2] Arbre mis à jour');
    res.json({ message: 'Arbre mis à jour avec succès' });
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API_V2] Error updating tree:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'arbre' });
  }
});

// Supprimer un arbre (superadmin seulement)
router.delete('/trees/:treeId', requireSuperAdmin, async (req, res) => {
  try {
    console.log('[TreeAPI V2] Requête DELETE /trees/:treeId reçue:', req.params.treeId);
    const { organizationId } = req.user!;
    const { treeId } = req.params;

    await prisma.treeBranchLeafTree.deleteMany({
      where: {
        id: treeId,
        organizationId,
      },
    });

    console.log('[TreeAPI V2] Arbre supprimé');
    res.json({ message: 'Arbre supprimé avec succès' });
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API_V2] Error deleting tree:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'arbre' });
  }
});

// =======================================
// 🌿 GESTION DES NŒUDS (BRANCHES/FEUILLES)
// =======================================

// Créer un nouveau nœud
router.post('/trees/:treeId/nodes', requireSuperAdmin, async (req, res) => {
  try {
    console.log('[TreeAPI V2] Requête POST /trees/:treeId/nodes reçue:', req.params.treeId, req.body);
    const { organizationId } = req.user!;
    const { treeId } = req.params;
    const { 
      parentId, 
      type, 
      subType, 
      label, 
      description, 
      value,
      order = 0,
      fieldConfig,
      conditionConfig,
      formulaConfig,
      tableConfig,
      apiConfig,
      linkConfig,
    } = req.body;

    // Vérifier que l'arbre appartient à l'organisation
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: { id: treeId, organizationId },
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

    const node = await prisma.treeBranchLeafNode.create({
      data: {
        treeId,
        parentId,
        type,
        subType,
        label,
        description,
        value,
        order,
        fieldConfig: fieldConfig || {},
        conditionConfig: conditionConfig || {},
        formulaConfig: formulaConfig || {},
        tableConfig: tableConfig || {},
        apiConfig: apiConfig || {},
        linkConfig: linkConfig || {},
      },
      include: {
        MarkerLinks: {
          include: {
            Marker: true,
          },
        },
      },
    });

    console.log('[TreeAPI V2] Nœud créé:', node.id);
    res.status(201).json(node);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API_V2] Error creating node:', error);
    res.status(500).json({ error: 'Erreur lors de la création du nœud' });
  }
});

// Mettre à jour un nœud
router.put('/nodes/:nodeId', requireSuperAdmin, async (req, res) => {
  try {
    console.log('[TreeAPI V2] Requête PUT /nodes/:nodeId reçue:', req.params.nodeId, req.body);
    const { organizationId } = req.user!;
    const { nodeId } = req.params;
    const updateData = req.body;

    // Vérifier que le nœud appartient à un arbre de l'organisation
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: {
        id: nodeId,
        Tree: {
          organizationId,
        },
      },
    });

    if (!node) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

    const updatedNode = await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        MarkerLinks: {
          include: {
            Marker: true,
          },
        },
      },
    });

    console.log('[TreeAPI V2] Nœud mis à jour:', nodeId);
    res.json(updatedNode);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API_V2] Error updating node:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du nœud' });
  }
});

// Supprimer un nœud
router.delete('/nodes/:nodeId', requireSuperAdmin, async (req, res) => {
  try {
    console.log('[TreeAPI V2] Requête DELETE /nodes/:nodeId reçue:', req.params.nodeId);
    const { organizationId } = req.user!;
    const { nodeId } = req.params;

    // Vérifier que le nœud appartient à un arbre de l'organisation
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: {
        id: nodeId,
        Tree: {
          organizationId,
        },
      },
    });

    if (!node) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

    await prisma.treeBranchLeafNode.delete({
      where: { id: nodeId },
    });

    console.log('[TreeAPI V2] Nœud supprimé:', nodeId);
    res.json({ message: 'Nœud supprimé avec succès' });
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API_V2] Error deleting node:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du nœud' });
  }
});

// =======================================
// 🏷️ GESTION DES MARQUEURS
// =======================================

// Récupérer tous les marqueurs de l'organisation
router.get('/markers', requireSuperAdmin, async (req, res) => {
  try {
    const { organizationId } = req.user!;

    const markers = await prisma.treeBranchLeafMarker.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: {
            NodeLinks: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(markers);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API_V2] Error fetching markers:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des marqueurs' });
  }
});

// Créer un nouveau marqueur
router.post('/markers', requireSuperAdmin, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const { name, description, color, icon, category, isGlobal, treeId } = req.body;

    const marker = await prisma.treeBranchLeafMarker.create({
      data: {
        organizationId,
        treeId: isGlobal ? null : treeId,
        name,
        description,
        color: color || '#3b82f6',
        icon,
        category,
        isGlobal: isGlobal || false,
      },
    });

    res.status(201).json(marker);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API_V2] Error creating marker:', error);
    res.status(500).json({ error: 'Erreur lors de la création du marqueur' });
  }
});

// =======================================
// 📊 DONNÉES DE TABLEAUX
// =======================================

// Récupérer les données de tableaux d'un arbre
router.get('/trees/:treeId/tables', requireSuperAdmin, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const { treeId } = req.params;

    const tables = await prisma.treeBranchLeafTableData.findMany({
      where: {
        treeId,
        Tree: {
          organizationId,
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(tables);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API_V2] Error fetching table data:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des données de tableaux' });
  }
});

// Créer/importer des données de tableau
router.post('/trees/:treeId/tables', requireSuperAdmin, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const { treeId } = req.params;
    const { name, description, headers, rows, isImported, importSource } = req.body;

    // Vérifier que l'arbre appartient à l'organisation
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: { id: treeId, organizationId },
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

    const tableData = await prisma.treeBranchLeafTableData.create({
      data: {
        treeId,
        name,
        description,
        headers: headers || [],
        rows: rows || [],
        isImported: isImported || false,
        importSource,
      },
    });

    res.status(201).json(tableData);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API_V2] Error creating table data:', error);
    res.status(500).json({ error: 'Erreur lors de la création des données de tableau' });
  }
});

// =======================================
// 🔌 CONNEXIONS API
// =======================================

// Récupérer les connexions API d'un arbre
router.get('/trees/:treeId/api-connections', requireSuperAdmin, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const { treeId } = req.params;

    const connections = await prisma.treeBranchLeafAPIConnection.findMany({
      where: {
        treeId,
        Tree: {
          organizationId,
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(connections);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API_V2] Error fetching API connections:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des connexions API' });
  }
});

// Créer une nouvelle connexion API
router.post('/trees/:treeId/api-connections', requireSuperAdmin, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const { treeId } = req.params;
    const { 
      name, 
      url, 
      method, 
      headers, 
      params, 
      authType, 
      authConfig, 
      cacheEnabled, 
      cacheDuration 
    } = req.body;

    // Vérifier que l'arbre appartient à l'organisation
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: { id: treeId, organizationId },
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

    const connection = await prisma.treeBranchLeafAPIConnection.create({
      data: {
        treeId,
        name,
        url,
        method: method || 'GET',
        headers: headers || {},
        params: params || {},
        authType,
        authConfig: authConfig || {},
        cacheEnabled: cacheEnabled !== false,
        cacheDuration: cacheDuration || 3600,
      },
    });

    res.status(201).json(connection);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API_V2] Error creating API connection:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la connexion API' });
  }
});

// =======================================
// 📝 SOUMISSIONS UTILISATEURS
// =======================================

// Récupérer les soumissions d'un arbre (pour admin)
router.get('/trees/:treeId/submissions', requireSuperAdmin, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const { treeId } = req.params;

    const submissions = await prisma.treeBranchLeafSubmission.findMany({
      where: {
        treeId,
        Tree: {
          organizationId,
        },
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        Lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: true,
          },
        },
        Data: {
          include: {
            Node: {
              select: {
                id: true,
                label: true,
                type: true,
                subType: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(submissions);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API_V2] Error fetching submissions:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des soumissions' });
  }
});

// Créer une nouvelle soumission (utilisateurs avec module devis)
router.post('/trees/:treeId/submissions', async (req, res) => {
  try {
    const { organizationId, id: userId } = req.user!;
    const { treeId } = req.params;
    const { leadId, sessionId, data } = req.body;

    // Vérifier que l'arbre existe et est publié
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: { 
        id: treeId, 
        organizationId,
        status: 'published',
      },
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvé ou non publié' });
    }

    const submission = await prisma.treeBranchLeafSubmission.create({
      data: {
        treeId,
        userId,
        leadId,
        sessionId,
        status: 'draft',
      },
    });

    // Créer les données de soumission pour chaque nœud
    if (data && Array.isArray(data)) {
      await prisma.treeBranchLeafSubmissionData.createMany({
        data: data.map((item: SubmissionDataItem) => ({
          submissionId: submission.id,
          nodeId: item.nodeId,
          value: item.value,
          calculatedValue: item.calculatedValue,
          metadata: item.metadata || {},
        })),
      });
    }

    res.status(201).json(submission);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API_V2] Error creating submission:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la soumission' });
  }
});

// Mettre à jour une soumission
router.put('/submissions/:submissionId', async (req, res) => {
  try {
    const { organizationId, id: userId } = req.user!;
    const { submissionId } = req.params;
    const { status, data, summary, exportData } = req.body;

    // Vérifier que la soumission appartient à l'utilisateur ou à son organisation
    const submission = await prisma.treeBranchLeafSubmission.findFirst({
      where: {
        id: submissionId,
        OR: [
          { userId },
          { Tree: { organizationId } },
        ],
      },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Soumission non trouvée' });
    }

    const updatedSubmission = await prisma.treeBranchLeafSubmission.update({
      where: { id: submissionId },
      data: {
        status,
        summary: summary || submission.summary,
        exportData: exportData || submission.exportData,
        completedAt: status === 'completed' ? new Date() : submission.completedAt,
        updatedAt: new Date(),
      },
    });

    // Mettre à jour les données si fournies
    if (data && Array.isArray(data)) {
      // Supprimer les anciennes données
      await prisma.treeBranchLeafSubmissionData.deleteMany({
        where: { submissionId },
      });

      // Créer les nouvelles données
      await prisma.treeBranchLeafSubmissionData.createMany({
        data: data.map((item: SubmissionDataItem) => ({
          submissionId,
          nodeId: item.nodeId,
          value: item.value,
          calculatedValue: item.calculatedValue,
          metadata: item.metadata || {},
        })),
      });
    }

    res.json(updatedSubmission);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API_V2] Error updating submission:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la soumission' });
  }
});

export default router;
