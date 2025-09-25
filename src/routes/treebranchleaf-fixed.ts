import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken as authMiddleware } from '../middleware/auth';

const router = Router();

// Appliquer l'authentification � toutes les routes
router.use(authMiddleware);

// =======================================
// ?? GESTION DES ARBRES
// =======================================

// GET /api/treebranchleaf/trees - Lister tous les arbres
router.get('/trees', async (req, res) => {
  try {
    const trees = await prisma.treeBranchLeafTree.findMany({
      include: {
        Nodes: {
          include: {
            MarkerLinks: true,
            Children: true,
            Parent: true,
          },
        },
        Submissions: {
          include: {
            Data: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(trees);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error fetching trees:', error);
    res.status(500).json({ error: 'Erreur lors de la r�cup�ration des arbres' });
  }
});

// GET /api/treebranchleaf/trees/:id - R�cup�rer un arbre sp�cifique
router.get('/trees/:id', async (req, res) => {
  try {
    const treeId = req.params.id; // String CUID, pas un entier

    const tree = await prisma.treeBranchLeafTree.findUnique({
      where: { id: treeId },
      include: {
        Nodes: {
          include: {
            MarkerLinks: true,
            Children: true,
            Parent: true,
          },
        },
        Submissions: {
          include: {
            Data: true,
          },
        },
      },
    });

    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouv�' });
    }

    res.json(tree);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error fetching tree:', error);
    res.status(500).json({ error: 'Erreur lors de la r�cup�ration de l\'arbre' });
  }
});

// POST /api/treebranchleaf/trees - Cr�er un nouvel arbre
router.post('/trees', async (req, res) => {
  try {
    const { name, description, config } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Le nom de l\'arbre est requis' });
    }

    const tree = await prisma.treeBranchLeafTree.create({
      Data: {
        name,
        description: description || '',
        config: config || {},
      },
      include: {
        Nodes: {
          include: {
            MarkerLinks: true,
            Options: true,
          },
        },
        Submissions: {
          include: {
            Data: true,
          },
        },
      },
    });

    res.status(201).json(tree);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error creating tree:', error);
    res.status(500).json({ error: 'Erreur lors de la cr�ation de l\'arbre' });
  }
});

// PUT /api/treebranchleaf/trees/:id - Mettre � jour un arbre
router.put('/trees/:id', async (req, res) => {
  try {
    const treeId = parseInt(req.params.id);
    if (isNaN(treeId)) {
      return res.status(400).json({ error: 'ID d\'arbre invalide' });
    }

    const { name, description, config } = req.body;

    const tree = await prisma.treeBranchLeafTree.update({
      where: { id: treeId },
      Data: {
        name,
        description,
        config,
        updatedAt: new Date(),
      },
      include: {
        Nodes: {
          include: {
            MarkerLinks: true,
            Options: true,
          },
        },
        Submissions: {
          include: {
            Data: true,
          },
        },
      },
    });

    res.json(tree);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Arbre non trouv�' });
    }
    console.error('[TREEBRANCHLEAF_API] Error updating tree:', error);
    res.status(500).json({ error: 'Erreur lors de la mise � jour de l\'arbre' });
  }
});

// DELETE /api/treebranchleaf/trees/:id - Supprimer un arbre
router.delete('/trees/:id', async (req, res) => {
  try {
    const treeId = parseInt(req.params.id);
    if (isNaN(treeId)) {
      return res.status(400).json({ error: 'ID d\'arbre invalide' });
    }

    await prisma.treeBranchLeafTree.delete({
      where: { id: treeId },
    });

    res.json({ success: true, message: 'Arbre supprim� avec succ�s' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Arbre non trouv�' });
    }
    console.error('[TREEBRANCHLEAF_API] Error deleting tree:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'arbre' });
  }
});

// =======================================
// ?? GESTION DES NOEUDS
// =======================================

// GET /api/treebranchleaf/nodes - Lister tous les n�uds d'un arbre
router.get('/nodes', async (req, res) => {
  try {
    const treeId = parseInt(req.query.treeId as string);
    
    const whereClause = treeId && !isNaN(treeId) ? { treeId } : {};

    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: whereClause,
      include: {
        MarkerLinks: true,
        Options: true,
        tree: true,
      },
      orderBy: { position: 'asc' },
    });

    res.json(nodes);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error fetching Nodes:', error);
    res.status(500).json({ error: 'Erreur lors de la r�cup�ration des n�uds' });
  }
});

// GET /api/treebranchleaf/nodes/:id - R�cup�rer un n�ud sp�cifique
router.get('/nodes/:id', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    if (isNaN(nodeId)) {
      return res.status(400).json({ error: 'ID de n�ud invalide' });
    }

    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      include: {
        MarkerLinks: true,
        Options: true,
        tree: true,
      },
    });

    if (!node) {
      return res.status(404).json({ error: 'N�ud non trouv�' });
    }

    res.json(node);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error fetching node:', error);
    res.status(500).json({ error: 'Erreur lors de la r�cup�ration du n�ud' });
  }
});

// POST /api/treebranchleaf/nodes - Cr�er un nouveau n�ud
router.post('/nodes', async (req, res) => {
  try {
    const { treeId, type, label, config, position, parentId } = req.body;

    if (!treeId || !type || !label) {
      return res.status(400).json({ error: 'treeId, type et label sont requis' });
    }

    const node = await prisma.treeBranchLeafNode.create({
      Data: {
        treeId: parseInt(treeId),
        type,
        label,
        config: config || {},
        position: position || 0,
        parentId: parentId ? parseInt(parentId) : null,
      },
      include: {
        MarkerLinks: true,
        Options: true,
        tree: true,
      },
    });

    res.status(201).json(node);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error creating node:', error);
    res.status(500).json({ error: 'Erreur lors de la cr�ation du n�ud' });
  }
});

// PUT /api/treebranchleaf/nodes/:id - Mettre � jour un n�ud
router.put('/nodes/:id', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    if (isNaN(nodeId)) {
      return res.status(400).json({ error: 'ID de n�ud invalide' });
    }

    const { type, label, config, position, parentId } = req.body;

    const node = await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      Data: {
        type,
        label,
        config,
        position,
        parentId: parentId ? parseInt(parentId) : null,
        updatedAt: new Date(),
      },
      include: {
        MarkerLinks: true,
        Options: true,
        tree: true,
      },
    });

    res.json(node);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'N�ud non trouv�' });
    }
    console.error('[TREEBRANCHLEAF_API] Error updating node:', error);
    res.status(500).json({ error: 'Erreur lors de la mise � jour du n�ud' });
  }
});

// DELETE /api/treebranchleaf/nodes/:id - Supprimer un n�ud
router.delete('/nodes/:id', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    if (isNaN(nodeId)) {
      return res.status(400).json({ error: 'ID de n�ud invalide' });
    }

    await prisma.treeBranchLeafNode.delete({
      where: { id: nodeId },
    });

    res.json({ success: true, message: 'N�ud supprim� avec succ�s' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'N�ud non trouv�' });
    }
    console.error('[TREEBRANCHLEAF_API] Error deleting node:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du n�ud' });
  }
});

// =======================================
// ?? GESTION DES MARQUEURS
// =======================================

// GET /api/treebranchleaf/markers - Lister tous les marqueurs d'un n�ud
router.get('/markers', async (req, res) => {
  try {
    const nodeId = parseInt(req.query.nodeId as string);
    
    const whereClause = nodeId && !isNaN(nodeId) ? { nodeId } : {};

    const markers = await prisma.treeBranchLeafMarker.findMany({
      where: whereClause,
      include: {
        node: true,
      },
      orderBy: { position: 'asc' },
    });

    res.json(markers);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error fetching MarkerLinks:', error);
    res.status(500).json({ error: 'Erreur lors de la r�cup�ration des marqueurs' });
  }
});

// GET /api/treebranchleaf/markers/:id - R�cup�rer un marqueur sp�cifique
router.get('/markers/:id', async (req, res) => {
  try {
    const markerId = parseInt(req.params.id);
    if (isNaN(markerId)) {
      return res.status(400).json({ error: 'ID de marqueur invalide' });
    }

    const marker = await prisma.treeBranchLeafMarker.findUnique({
      where: { id: markerId },
      include: {
        node: true,
      },
    });

    if (!marker) {
      return res.status(404).json({ error: 'Marqueur non trouv�' });
    }

    res.json(marker);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error fetching marker:', error);
    res.status(500).json({ error: 'Erreur lors de la r�cup�ration du marqueur' });
  }
});

// POST /api/treebranchleaf/markers - Cr�er un nouveau marqueur
router.post('/markers', async (req, res) => {
  try {
    const { nodeId, type, label, color, position, config } = req.body;

    if (!nodeId || !type || !label) {
      return res.status(400).json({ error: 'nodeId, type et label sont requis' });
    }

    const marker = await prisma.treeBranchLeafMarker.create({
      Data: {
        nodeId: parseInt(nodeId),
        type,
        label,
        color: color || '#3b82f6',
        position: position || 0,
        config: config || {},
      },
      include: {
        node: true,
      },
    });

    res.status(201).json(marker);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error creating marker:', error);
    res.status(500).json({ error: 'Erreur lors de la cr�ation du marqueur' });
  }
});

// PUT /api/treebranchleaf/markers/:id - Mettre � jour un marqueur
router.put('/markers/:id', async (req, res) => {
  try {
    const markerId = parseInt(req.params.id);
    if (isNaN(markerId)) {
      return res.status(400).json({ error: 'ID de marqueur invalide' });
    }

    const { type, label, color, position, config } = req.body;

    const marker = await prisma.treeBranchLeafMarker.update({
      where: { id: markerId },
      Data: {
        type,
        label,
        color,
        position,
        config,
        updatedAt: new Date(),
      },
      include: {
        node: true,
      },
    });

    res.json(marker);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Marqueur non trouv�' });
    }
    console.error('[TREEBRANCHLEAF_API] Error updating marker:', error);
    res.status(500).json({ error: 'Erreur lors de la mise � jour du marqueur' });
  }
});

// DELETE /api/treebranchleaf/markers/:id - Supprimer un marqueur
router.delete('/markers/:id', async (req, res) => {
  try {
    const markerId = parseInt(req.params.id);
    if (isNaN(markerId)) {
      return res.status(400).json({ error: 'ID de marqueur invalide' });
    }

    await prisma.treeBranchLeafMarker.delete({
      where: { id: markerId },
    });

    res.json({ success: true, message: 'Marqueur supprim� avec succ�s' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Marqueur non trouv�' });
    }
    console.error('[TREEBRANCHLEAF_API] Error deleting marker:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du marqueur' });
  }
});

// =======================================
// ?? GESTION DES OPTIONS
// =======================================

// GET /api/treebranchleaf/options - Lister toutes les options d'un n�ud
router.get('/options', async (req, res) => {
  try {
    const nodeId = parseInt(req.query.nodeId as string);
    
    const whereClause = nodeId && !isNaN(nodeId) ? { nodeId } : {};

    const options = await prisma.treeBranchLeafOption.findMany({
      where: whereClause,
      include: {
        node: true,
      },
      orderBy: { position: 'asc' },
    });

    res.json(options);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error fetching Options:', error);
    res.status(500).json({ error: 'Erreur lors de la r�cup�ration des options' });
  }
});

// GET /api/treebranchleaf/options/:id - R�cup�rer une option sp�cifique
router.get('/options/:id', async (req, res) => {
  try {
    const optionId = parseInt(req.params.id);
    if (isNaN(optionId)) {
      return res.status(400).json({ error: 'ID d\'option invalide' });
    }

    const option = await prisma.treeBranchLeafOption.findUnique({
      where: { id: optionId },
      include: {
        node: true,
      },
    });

    if (!option) {
      return res.status(404).json({ error: 'Option non trouv�e' });
    }

    res.json(option);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error fetching option:', error);
    res.status(500).json({ error: 'Erreur lors de la r�cup�ration de l\'option' });
  }
});

// POST /api/treebranchleaf/options - Cr�er une nouvelle option
router.post('/options', async (req, res) => {
  try {
    const { nodeId, label, value, position, config } = req.body;

    if (!nodeId || !label) {
      return res.status(400).json({ error: 'nodeId et label sont requis' });
    }

    const option = await prisma.treeBranchLeafOption.create({
      Data: {
        nodeId: parseInt(nodeId),
        label,
        value: value || label,
        position: position || 0,
        config: config || {},
      },
      include: {
        node: true,
      },
    });

    res.status(201).json(option);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error creating option:', error);
    res.status(500).json({ error: 'Erreur lors de la cr�ation de l\'option' });
  }
});

// PUT /api/treebranchleaf/options/:id - Mettre � jour une option
router.put('/options/:id', async (req, res) => {
  try {
    const optionId = parseInt(req.params.id);
    if (isNaN(optionId)) {
      return res.status(400).json({ error: 'ID d\'option invalide' });
    }

    const { label, value, position, config } = req.body;

    const option = await prisma.treeBranchLeafOption.update({
      where: { id: optionId },
      Data: {
        label,
        value,
        position,
        config,
        updatedAt: new Date(),
      },
      include: {
        node: true,
      },
    });

    res.json(option);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Option non trouv�e' });
    }
    console.error('[TREEBRANCHLEAF_API] Error updating option:', error);
    res.status(500).json({ error: 'Erreur lors de la mise � jour de l\'option' });
  }
});

// DELETE /api/treebranchleaf/options/:id - Supprimer une option
router.delete('/options/:id', async (req, res) => {
  try {
    const optionId = parseInt(req.params.id);
    if (isNaN(optionId)) {
      return res.status(400).json({ error: 'ID d\'option invalide' });
    }

    await prisma.treeBranchLeafOption.delete({
      where: { id: optionId },
    });

    res.json({ success: true, message: 'Option supprim�e avec succ�s' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Option non trouv�e' });
    }
    console.error('[TREEBRANCHLEAF_API] Error deleting option:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'option' });
  }
});

// =======================================
// ?? GESTION DES SOUMISSIONS
// =======================================

// Types pour les donn�es de soumission
interface SubmissionDataItem {
  nodeId: number;
  value: string;
  calculatedValue?: number;
  metadata?: Record<string, unknown>;
}

// GET /api/treebranchleaf/submissions - Lister toutes les soumissions
router.get('/submissions', async (req, res) => {
  try {
    const treeId = req.query.treeId as string;
    const userId = req.query.userId as string;
    const leadId = req.query.leadId as string;
    
    const whereClause: Record<string, string> = {};
    if (treeId) whereClause.treeId = treeId;
    if (userId) whereClause.userId = userId;
    if (leadId) whereClause.leadId = leadId;

    const submissions = await prisma.treeBranchLeafSubmission.findMany({
      where: whereClause,
      include: {
        TreeBranchLeafTree: true,
        TreeBranchLeafSubmissionData: true,
        Lead: true
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(submissions);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error fetching Submissions:', error);
    res.status(500).json({ error: 'Erreur lors de la r�cup�ration des soumissions' });
  }
});

// GET /api/treebranchleaf/submissions/:id - R�cup�rer une soumission sp�cifique
router.get('/submissions/:id', async (req, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    if (isNaN(submissionId)) {
      return res.status(400).json({ error: 'ID de soumission invalide' });
    }

    const submission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id: submissionId },
      include: {
        tree: true,
        Data: true,
      },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Soumission non trouv�e' });
    }

    res.json(submission);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error fetching submission:', error);
    res.status(500).json({ error: 'Erreur lors de la r�cup�ration de la soumission' });
  }
});

// POST /api/treebranchleaf/submissions - Cr�er une nouvelle soumission
router.post('/submissions', async (req, res) => {
  try {
    const { treeId, userId, status, data, calculatedScore, metadata } = req.body;

    if (!treeId || !userId) {
      return res.status(400).json({ error: 'treeId et userId sont requis' });
    }

    // Cr�er la soumission
    const submission = await prisma.treeBranchLeafSubmission.create({
      Data: {
        treeId: parseInt(treeId),
        userId: parseInt(userId),
        status: status || 'draft',
        calculatedScore: calculatedScore || 0,
        metaData: metadata || {},
      },
      include: {
        tree: true,
        Data: true,
      },
    });

    // Ajouter les donn�es si fournies
    if (data && Array.isArray(data)) {
      await prisma.treeBranchLeafSubmissionData.createMany({
        Data: data.map((item: SubmissionDataItem) => ({
          submissionId: submission.id,
          nodeId: item.nodeId,
          value: item.value,
          calculatedValue: item.calculatedValue,
          metaData: item.metadata || {},
        })),
      });

      // R�cup�rer la soumission avec les donn�es
      const submissionWithData = await prisma.treeBranchLeafSubmission.findUnique({
        where: { id: submission.id },
        include: {
          tree: true,
          Data: true,
        },
      });

      res.status(201).json(submissionWithData);
    } else {
      res.status(201).json(submission);
    }
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error creating submission:', error);
    res.status(500).json({ error: 'Erreur lors de la cr�ation de la soumission' });
  }
});

// PUT /api/treebranchleaf/submissions/:id - Mettre � jour une soumission
router.put('/submissions/:id', async (req, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    if (isNaN(submissionId)) {
      return res.status(400).json({ error: 'ID de soumission invalide' });
    }

    const { status, data, calculatedScore, metadata } = req.body;

    // Mettre � jour la soumission
    const updatedSubmission = await prisma.treeBranchLeafSubmission.update({
      where: { id: submissionId },
      Data: {
        status,
        calculatedScore,
        metadata,
        updatedAt: new Date(),
      },
      include: {
        tree: true,
        Data: true,
      },
    });

    // Mettre � jour les donn�es si fournies
    if (data && Array.isArray(data)) {
      // Supprimer les anciennes donn�es
      await prisma.treeBranchLeafSubmissionData.deleteMany({
        where: { submissionId },
      });

      // Cr�er les nouvelles donn�es
      await prisma.treeBranchLeafSubmissionData.createMany({
        Data: data.map((item: SubmissionDataItem) => ({
          submissionId,
          nodeId: item.nodeId,
          value: item.value,
          calculatedValue: item.calculatedValue,
          metaData: item.metadata || {},
        })),
      });
    }

    res.json(updatedSubmission);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error updating submission:', error);
    res.status(500).json({ error: 'Erreur lors de la mise � jour de la soumission' });
  }
});

// DELETE /api/treebranchleaf/submissions/:id - Supprimer une soumission
router.delete('/submissions/:id', async (req, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    if (isNaN(submissionId)) {
      return res.status(400).json({ error: 'ID de soumission invalide' });
    }

    await prisma.treeBranchLeafSubmission.delete({
      where: { id: submissionId },
    });

    res.json({ success: true, message: 'Soumission supprim�e avec succ�s' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Soumission non trouv�e' });
    }
    console.error('[TREEBRANCHLEAF_API] Error deleting submission:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la soumission' });
  }
});

// =======================================
// ?? GESTION DES DONN�ES DE SOUMISSION
// =======================================

// GET /api/treebranchleaf/submission-data - Lister les donn�es d'une soumission
router.get('/submission-data', async (req, res) => {
  try {
    const submissionId = parseInt(req.query.submissionId as string);
    
    if (!submissionId || isNaN(submissionId)) {
      return res.status(400).json({ error: 'submissionId est requis' });
    }

    const data = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId },
      include: {
        submission: true,
        node: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(data);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error fetching submission Data:', error);
    res.status(500).json({ error: 'Erreur lors de la r�cup�ration des donn�es de soumission' });
  }
});

// GET /api/treebranchleaf/submission-data/:id - R�cup�rer une donn�e sp�cifique
router.get('/submission-data/:id', async (req, res) => {
  try {
    const dataId = parseInt(req.params.id);
    if (isNaN(dataId)) {
      return res.status(400).json({ error: 'ID de donn�e invalide' });
    }

    const data = await prisma.treeBranchLeafSubmissionData.findUnique({
      where: { id: dataId },
      include: {
        submission: true,
        node: true,
      },
    });

    if (!data) {
      return res.status(404).json({ error: 'Donn�e non trouv�e' });
    }

    res.json(data);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error fetching submission Data:', error);
    res.status(500).json({ error: 'Erreur lors de la r�cup�ration de la donn�e' });
  }
});

// POST /api/treebranchleaf/submission-data - Cr�er une nouvelle donn�e
router.post('/submission-data', async (req, res) => {
  try {
    const { submissionId, nodeId, value, calculatedValue, metadata } = req.body;

    if (!submissionId || !nodeId || !value) {
      return res.status(400).json({ error: 'submissionId, nodeId et value sont requis' });
    }

    const data = await prisma.treeBranchLeafSubmissionData.create({
      Data: {
        submissionId: parseInt(submissionId),
        nodeId: parseInt(nodeId),
        value,
        calculatedValue: calculatedValue || null,
        metaData: metadata || {},
      },
      include: {
        submission: true,
        node: true,
      },
    });

    res.status(201).json(data);
  } catch (error) {
    console.error('[TREEBRANCHLEAF_API] Error creating submission Data:', error);
    res.status(500).json({ error: 'Erreur lors de la cr�ation de la donn�e' });
  }
});

// PUT /api/treebranchleaf/submission-data/:id - Mettre � jour une donn�e
router.put('/submission-data/:id', async (req, res) => {
  try {
    const dataId = parseInt(req.params.id);
    if (isNaN(dataId)) {
      return res.status(400).json({ error: 'ID de donn�e invalide' });
    }

    const { value, calculatedValue, metadata } = req.body;

    const data = await prisma.treeBranchLeafSubmissionData.update({
      where: { id: dataId },
      Data: {
        value,
        calculatedValue,
        metadata,
        updatedAt: new Date(),
      },
      include: {
        submission: true,
        node: true,
      },
    });

    res.json(data);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Donn�e non trouv�e' });
    }
    console.error('[TREEBRANCHLEAF_API] Error updating submission Data:', error);
    res.status(500).json({ error: 'Erreur lors de la mise � jour de la donn�e' });
  }
});

// DELETE /api/treebranchleaf/submission-data/:id - Supprimer une donn�e
router.delete('/submission-data/:id', async (req, res) => {
  try {
    const dataId = parseInt(req.params.id);
    if (isNaN(dataId)) {
      return res.status(400).json({ error: 'ID de donn�e invalide' });
    }

    await prisma.treeBranchLeafSubmissionData.delete({
      where: { id: dataId },
    });

    res.json({ success: true, message: 'Donn�e supprim�e avec succ�s' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Donn�e non trouv�e' });
    }
    console.error('[TREEBRANCHLEAF_API] Error deleting submission Data:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la donn�e' });
  }
});

export default router;
