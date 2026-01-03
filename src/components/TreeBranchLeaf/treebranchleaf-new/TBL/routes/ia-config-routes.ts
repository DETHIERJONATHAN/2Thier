/**
 * 🎯 Routes API - Configuration IA Mesure
 * 
 * Gestion de la configuration des objets de référence et paramètres de détection IA
 * pour les nodes TreeBranchLeaf avec capacité "IA Mesure" activée.
 */

import express from 'express';
import { db } from '../../../../../lib/database';

const router = express.Router();

/**
 * GET /api/treebranchleaf/nodes/:nodeId/ia-config
 * Récupère la configuration IA d'un node
 */
router.get('/nodes/:nodeId/ia-config', async (req, res) => {
  try {
    const { nodeId } = req.params;
    
    console.log(`📊 [IA-CONFIG] Récupération config pour node ${nodeId}`);
    
    const node = await db.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { iaMesureConfig: true }
    });

    if (!node) {
      console.warn(`⚠️ [IA-CONFIG] Node ${nodeId} non trouvé`);
      return res.status(404).json({ error: 'Node not found' });
    }

    // Config par défaut si pas de config existante
    const defaultConfig = {
      enabled: false,
      referenceObjects: [],
      detectionSettings: {
        minPhotos: 3,
        confidenceThreshold: 0.7,
        useSharp: true,
        useFusion: true
      }
    };

    const config = node.iaMesureConfig || defaultConfig;
    console.log(`✅ [IA-CONFIG] Config récupérée:`, JSON.stringify(config).substring(0, 100));
    
    res.json(config);
  } catch (error) {
    console.error('❌ [IA-CONFIG] Erreur récupération config:', error);
    res.status(500).json({ error: 'Failed to fetch IA config' });
  }
});

/**
 * PUT /api/treebranchleaf/nodes/:nodeId/ia-config
 * Met à jour la configuration IA d'un node
 */
router.put('/nodes/:nodeId/ia-config', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const config = req.body;

    console.log(`💾 [IA-CONFIG] Mise à jour config pour node ${nodeId}`);

    // Validation basique
    if (!config || typeof config !== 'object') {
      console.warn(`⚠️ [IA-CONFIG] Format de config invalide`);
      return res.status(400).json({ error: 'Invalid config format' });
    }

    // Validation structure
    if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    if (config.referenceObjects && !Array.isArray(config.referenceObjects)) {
      return res.status(400).json({ error: 'referenceObjects must be an array' });
    }

    await db.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: { 
        iaMesureConfig: config,
        updatedAt: new Date()
      }
    });

    console.log(`✅ [IA-CONFIG] Config sauvegardée avec succès`);
    res.json({ success: true, config });
  } catch (error) {
    console.error('❌ [IA-CONFIG] Erreur sauvegarde config:', error);
    res.status(500).json({ error: 'Failed to update IA config' });
  }
});

/**
 * DELETE /api/treebranchleaf/nodes/:nodeId/ia-config
 * Supprime la configuration IA d'un node (reset à null)
 */
router.delete('/nodes/:nodeId/ia-config', async (req, res) => {
  try {
    const { nodeId } = req.params;
    
    console.log(`🗑️ [IA-CONFIG] Suppression config pour node ${nodeId}`);

    await db.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: { 
        iaMesureConfig: null,
        updatedAt: new Date()
      }
    });

    console.log(`✅ [IA-CONFIG] Config supprimée`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [IA-CONFIG] Erreur suppression config:', error);
    res.status(500).json({ error: 'Failed to delete IA config' });
  }
});

export default router;
