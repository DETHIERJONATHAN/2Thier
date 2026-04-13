import { Router } from 'express';
import { db } from '../lib/database';
import { authMiddleware, requireSuperAdmin } from '../middlewares/auth';
import { randomUUID } from 'crypto';
import { logger } from '../lib/logger';

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
// 🌳 ROUTES SYSTÈME TREEBRANCHLEAF
// =======================================

// Appliquer l'authentification à toutes les routes
router.use(authMiddleware);

// =======================================
// 📋 GESTION DES ARBRES
// =======================================

// Récupérer tous les arbres de l'organisation (admin/superadmin seulement)
router.get('/trees', requireSuperAdmin, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    

    // Si pas d'organizationId dans le user, essayons de chercher tous les arbres pour debug
    const whereClause = organizationId ? { organizationId } : {};

    const trees = await prisma.treeBranchLeafTree.findMany({
      where: whereClause,
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

    
    if (trees.length > 0) {
      trees.forEach((tree, index) => {
      });
    } else {
      
      // Debug: essayons de récupérer TOUS les arbres sans filtre
      const allTrees = await prisma.treeBranchLeafTree.findMany({
        select: { id: true, name: true, organizationId: true }
      });
    }

    res.json(trees);
  } catch (error) {
    logger.error('[TREEBRANCHLEAF_API] Error fetching trees:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des arbres' });
  }
});

// Créer un nouvel arbre (superadmin seulement)
router.post('/trees', requireSuperAdmin, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const { name, description, icon, color } = req.body;

    const tree = await prisma.treeBranchLeafTree.create({
      data: {
        organizationId,
        name,
        description,
        icon,
        color: color || '#10b981',
        category: 'formulaire',
      },
    });

    res.json(tree);
  } catch (error) {
    logger.error('[TREEBRANCHLEAF_API] Error creating tree:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'arbre' });
  }
});

// Récupérer un arbre spécifique avec tous ses nœuds
router.get('/trees/:treeId', async (req, res) => {
  try {
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
            Children: {
              include: {
                Children: {
                  include: {
                    Children: true, // Jusqu'à 4 niveaux de profondeur
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
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

    // Si ce n'est pas le super admin, on ne renvoie que les arbres publiés
    if (role !== 'super-admin' && tree.status !== 'published') {
      return res.status(403).json({ error: 'Accès non autorisé à cet arbre' });
    }

    res.json(tree);
  } catch (error) {
    logger.error('[TREEBRANCHLEAF_API] Error fetching tree:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'arbre' });
  }
});

// Mettre à jour un arbre (superadmin seulement)
router.put('/trees/:treeId', requireSuperAdmin, async (req, res) => {
  try {
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

    res.json({ message: 'Arbre mis à jour avec succès' });
  } catch (error) {
    logger.error('[TREEBRANCHLEAF_API] Error updating tree:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'arbre' });
  }
});

// Supprimer un arbre (superadmin seulement)
router.delete('/trees/:treeId', requireSuperAdmin, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const { treeId } = req.params;

    await prisma.treeBranchLeafTree.deleteMany({
      where: {
        id: treeId,
        organizationId,
      },
    });

    res.json({ message: 'Arbre supprimé avec succès' });
  } catch (error) {
    logger.error('[TREEBRANCHLEAF_API] Error deleting tree:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'arbre' });
  }
});

// =======================================
// 🌿 GESTION DES NŒUDS (BRANCHES/FEUILLES)
// =======================================

// Créer un nouveau nœud
router.post('/trees/:treeId/nodes', requireSuperAdmin, async (req, res) => {
  try {
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

    res.json(node);
  } catch (error) {
    logger.error('[TREEBRANCHLEAF_API] Error creating node:', error);
    res.status(500).json({ error: 'Erreur lors de la création du nœud' });
  }
});

// Mettre à jour un nœud
router.put('/nodes/:nodeId', requireSuperAdmin, async (req, res) => {
  try {
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

    res.json(updatedNode);
  } catch (error) {
    logger.error('[TREEBRANCHLEAF_API] Error updating node:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du nœud' });
  }
});

// ✅ ALIAS: Route alternative avec treeId (pour compatibilité frontend)
router.put('/trees/:treeId/nodes/:nodeId', requireSuperAdmin, async (req, res) => {
  try {
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

    res.json(updatedNode);
  } catch (error) {
    logger.error('[TREEBRANCHLEAF_API] Error updating node:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du nœud' });
  }
});

// Supprimer un nœud
router.delete('/nodes/:nodeId', requireSuperAdmin, async (req, res) => {
  try {
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

    res.json({ message: 'Nœud supprimé avec succès' });
  } catch (error) {
    logger.error('[TREEBRANCHLEAF_API] Error deleting node:', error);
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
    logger.error('[TREEBRANCHLEAF_API] Error fetching markers:', error);
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

    res.json(marker);
  } catch (error) {
    logger.error('[TREEBRANCHLEAF_API] Error creating marker:', error);
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
    logger.error('[TREEBRANCHLEAF_API] Error fetching table data:', error);
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

    res.json(tableData);
  } catch (error) {
    logger.error('[TREEBRANCHLEAF_API] Error creating table data:', error);
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
    logger.error('[TREEBRANCHLEAF_API] Error fetching API connections:', error);
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

    res.json(connection);
  } catch (error) {
    logger.error('[TREEBRANCHLEAF_API] Error creating API connection:', error);
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
    logger.error('[TREEBRANCHLEAF_API] Error fetching submissions:', error);
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

      // Enrichir operationDetail/operationResult/lastResolved et labels
      try {
        const nodeIds = Array.from(new Set((data as SubmissionDataItem[]).map(d => d.nodeId)));
        const nodes = await prisma.treeBranchLeafNode.findMany({ where: { id: { in: nodeIds } }, select: { id: true, label: true, treeId: true } });
        const labelMap = new Map(nodes.map(n => [n.id, n.label as string | null]));
        const vars = await prisma.treeBranchLeafNodeVariable.findMany({ where: { nodeId: { in: nodeIds } }, include: { TreeBranchLeafNode: { select: { label: true } } } });
        const varByNode = new Map(vars.map(v => [v.nodeId, v] as const));
        const now = new Date();
        const inferSource = (src?: string | null): 'formula' | 'condition' | 'table' | 'neutral' => {
          const s = (src || '').toLowerCase();
          if (s.includes('formula') || s.includes('formule')) return 'formula';
          if (s.includes('condition')) return 'condition';
          if (s.includes('table')) return 'table';
          return 'neutral';
        };
        for (const it of data as SubmissionDataItem[]) {
          const label = labelMap.get(it.nodeId) || null;
          const v = varByNode.get(it.nodeId);
          const isVar = !!v;
          const valueStr = it.calculatedValue != null ? String(it.calculatedValue) : (it.value != null ? String(it.value) : null);
          const display = isVar ? (v?.displayName || label || it.nodeId) : (label || it.nodeId);
          const unit = isVar ? (v?.unit || null) : null;
          const operationSource = inferSource(v?.sourceRef || null);
          await prisma.treeBranchLeafSubmissionData.updateMany({
            where: { submissionId: submission.id, nodeId: it.nodeId },
            data: {
              fieldLabel: label,
              isVariable: isVar,
              variableDisplayName: isVar ? (v?.displayName || null) : undefined,
              variableKey: isVar ? (v?.exposedKey || null) : undefined,
              variableUnit: unit,
              sourceRef: isVar ? (v?.sourceRef || null) : undefined,
              operationSource,
              operationDetail: isVar ? (v?.sourceRef || null) : label,
              lastResolved: now,
            }
          });
        }
      } catch (e) {
        logger.warn('[TREEBRANCHLEAF_API] Enrichissement opérations (POST) ignoré:', (e as Error).message);
      }
    }

    res.json(submission);
  } catch (error) {
    logger.error('[TREEBRANCHLEAF_API] Error creating submission:', error);
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

      // Enrichir operationDetail/operationResult/lastResolved et labels
      try {
        // Récupérer le treeId depuis la soumission existante
        const fullSub = await prisma.treeBranchLeafSubmission.findUnique({ where: { id: submissionId } });
        const treeId = fullSub?.treeId;
        const nodeIds = Array.from(new Set((data as SubmissionDataItem[]).map(d => d.nodeId)));
        const nodes = await prisma.treeBranchLeafNode.findMany({ where: treeId ? { id: { in: nodeIds }, treeId } : { id: { in: nodeIds } }, select: { id: true, label: true } });
        const labelMap = new Map(nodes.map(n => [n.id, n.label as string | null]));
        const vars = await prisma.treeBranchLeafNodeVariable.findMany({ where: { nodeId: { in: nodeIds } }, include: { TreeBranchLeafNode: { select: { label: true } } } });
        const varByNode = new Map(vars.map(v => [v.nodeId, v] as const));
        const now = new Date();
        const inferSource = (src?: string | null): 'formula' | 'condition' | 'table' | 'neutral' => {
          const s = (src || '').toLowerCase();
          if (s.includes('formula') || s.includes('formule')) return 'formula';
          if (s.includes('condition')) return 'condition';
          if (s.includes('table')) return 'table';
          return 'neutral';
        };
        for (const it of data as SubmissionDataItem[]) {
          const label = labelMap.get(it.nodeId) || null;
          const v = varByNode.get(it.nodeId);
          const isVar = !!v;
          const valueStr = it.calculatedValue != null ? String(it.calculatedValue) : (it.value != null ? String(it.value) : null);
          const display = isVar ? (v?.displayName || label || it.nodeId) : (label || it.nodeId);
          const unit = isVar ? (v?.unit || null) : null;
          const operationSource = inferSource(v?.sourceRef || null);
          await prisma.treeBranchLeafSubmissionData.updateMany({
            where: { submissionId, nodeId: it.nodeId },
            data: {
              fieldLabel: label,
              isVariable: isVar,
              variableDisplayName: isVar ? (v?.displayName || null) : undefined,
              variableKey: isVar ? (v?.exposedKey || null) : undefined,
              variableUnit: unit,
              sourceRef: isVar ? (v?.sourceRef || null) : undefined,
              operationSource,
              operationDetail: isVar ? (v?.sourceRef || null) : label,
              lastResolved: now,
            }
          });
        }
      } catch (e) {
        logger.warn('[TREEBRANCHLEAF_API] Enrichissement opérations (PUT) ignoré:', (e as Error).message);
      }
    }

    res.json(updatedSubmission);
  } catch (error) {
    logger.error('[TREEBRANCHLEAF_API] Error updating submission:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la soumission' });
  }
});

export default router;

// =======================================
// 🔢 DONNÉE (VARIABLE) D'UN NŒUD
// =======================================

// Récupérer la configuration "donnée" d'un nœud (variable exposée)
router.get('/trees/:treeId/nodes/:nodeId/data', requireSuperAdmin, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const { treeId, nodeId } = req.params;

    // Vérifier l'appartenance de l'arbre à l'organisation (ou accès super admin)
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: organizationId ? { id: treeId, organizationId } : { id: treeId }
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

    // Vérifier que le nœud existe dans cet arbre
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: {
        id: nodeId,
        treeId,
      },
      select: { id: true },
    });

    if (!node) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

    const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { nodeId },
      select: {
        exposedKey: true,
        displayFormat: true,
        unit: true,
        precision: true,
        visibleToUser: true,
        isReadonly: true,
        defaultValue: true,
        metadata: true,
        // 🔄 Nouveaux champs nécessaires côté frontend
        sourceType: true,
        sourceRef: true,
        fixedValue: true,
        selectedNodeId: true,
      },
    });

    // Si aucune donnée n'existe encore, renvoyer un objet vide (évite les 404 bruités côté client)
    return res.json(variable || {});
  } catch (error) {
    logger.error('[TREEBRANCHLEAF_API] Error fetching node data:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la donnée du nœud' });
  }
});

// Mettre à jour/créer la configuration "donnée" d'un nœud (variable exposée)
router.put('/trees/:treeId/nodes/:nodeId/data', requireSuperAdmin, async (req, res) => {
  try {
  const { organizationId } = req.user!;
  const { treeId, nodeId } = req.params;
  const { exposedKey, displayFormat, unit, precision, visibleToUser, isReadonly, defaultValue, metadata, sourceType, sourceRef, fixedValue, selectedNodeId } = req.body || {};

    // Vérifier l'appartenance de l'arbre à l'organisation (ou accès super admin)
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: organizationId ? { id: treeId, organizationId } : { id: treeId }
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

    // Vérifier que le nœud existe dans cet arbre
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: {
        id: nodeId,
        treeId,
      },
      select: { id: true, label: true },
    });

    if (!node) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

    // Valeurs par défaut cohérentes
    const safeExposedKey: string | null = typeof exposedKey === 'string' && exposedKey.trim() ? exposedKey.trim() : null;
    const displayName = safeExposedKey || node.label || `var_${String(nodeId).slice(0, 4)}`;

    // Construire les métadonnées enrichies avec les nouveaux champs
    const enrichedMetadata = {
      ...(metadata && typeof metadata === 'object' ? metadata : {}),
      // On continue de stocker une trace dans metadata pour compat ascendante, mais la source officielle devient les colonnes dédiées
      ...(sourceType ? { sourceType } : {}),
      ...(fixedValue ? { fixedValue } : {}),
      ...(selectedNodeId ? { selectedNodeId } : {}),
      ...(sourceRef ? { sourceRef } : {}),
    };

    const cleanSourceType = typeof sourceType === 'string' && sourceType.trim() ? sourceType.trim() : undefined;
    const cleanSourceRef = typeof sourceRef === 'string' && sourceRef.trim() ? sourceRef.trim() : undefined;
    const cleanFixedValue = typeof fixedValue === 'string' && fixedValue.trim() ? fixedValue : undefined;
    const cleanSelectedNodeId = typeof selectedNodeId === 'string' && selectedNodeId.trim() ? selectedNodeId.trim() : undefined;

    const updated = await prisma.treeBranchLeafNodeVariable.upsert({
      where: { nodeId },
      update: {
        exposedKey: safeExposedKey || undefined, // ne pas écraser si null
        displayName,
        displayFormat: typeof displayFormat === 'string' ? displayFormat : undefined,
        unit: typeof unit === 'string' ? unit : undefined,
        precision: typeof precision === 'number' ? precision : undefined,
        visibleToUser: typeof visibleToUser === 'boolean' ? visibleToUser : undefined,
        isReadonly: typeof isReadonly === 'boolean' ? isReadonly : undefined,
        defaultValue: typeof defaultValue === 'string' ? defaultValue : undefined,
        metadata: enrichedMetadata,
        // ✅ Écriture des nouveaux champs colonnes
        sourceType: cleanSourceType,
        sourceRef: cleanSourceRef,
        fixedValue: cleanFixedValue,
        selectedNodeId: cleanSelectedNodeId,
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        nodeId,
        exposedKey: safeExposedKey || `var_${String(nodeId).slice(0, 4)}`,
        displayName,
        displayFormat: typeof displayFormat === 'string' ? displayFormat : 'number',
        unit: typeof unit === 'string' ? unit : null,
        precision: typeof precision === 'number' ? precision : 2,
        visibleToUser: typeof visibleToUser === 'boolean' ? visibleToUser : true,
        isReadonly: typeof isReadonly === 'boolean' ? isReadonly : false,
        defaultValue: typeof defaultValue === 'string' ? defaultValue : null,
        metadata: enrichedMetadata,
        sourceType: cleanSourceType || 'fixed',
        sourceRef: cleanSourceRef || null,
        fixedValue: cleanFixedValue || null,
        selectedNodeId: cleanSelectedNodeId || null,
        updatedAt: new Date(),
      },
      select: {
        exposedKey: true,
        displayFormat: true,
        unit: true,
        precision: true,
        visibleToUser: true,
        isReadonly: true,
        defaultValue: true,
        metadata: true,
        sourceType: true,
        sourceRef: true,
        fixedValue: true,
        selectedNodeId: true,
      },
    });

    // Mettre à jour le flag hasData du nœud
    await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: { hasData: true, updatedAt: new Date() }
    });

    return res.json(updated);
  } catch (error) {
    // Gestion d'une éventuelle contrainte d'unicité sur exposedKey
    const err = error as unknown as { code?: string };
    if (err && err.code === 'P2002') {
      return res.status(409).json({ error: 'La variable exposée (exposedKey) existe déjà' });
    }
    logger.error('[TREEBRANCHLEAF_API] Error updating node data:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la donnée du nœud' });
  }
});
