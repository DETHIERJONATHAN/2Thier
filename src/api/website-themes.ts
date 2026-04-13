import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/website-themes/:websiteId
 * Récupère le thème d'un site
 */
router.get('/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;

    const theme = await prisma.webSiteTheme.findUnique({
      where: { websiteId: parseInt(websiteId) }
    });

    if (!theme) {
      return res.status(404).json({ message: 'Thème non trouvé' });
    }

    res.json(theme);
  } catch (error) {
    logger.error('❌ [API] Erreur GET theme:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/website-themes
 * Crée un nouveau thème
 */
router.post('/', async (req, res) => {
  try {
    const themeData = req.body;

    const theme = await prisma.webSiteTheme.create({
      data: themeData
    });

    res.status(201).json(theme);
  } catch (error) {
    logger.error('❌ [API] Erreur POST theme:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/website-themes/:id
 * Met à jour un thème existant
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const themeData = req.body;

    const theme = await prisma.webSiteTheme.update({
      where: { id: parseInt(id) },
      data: themeData
    });

    res.json(theme);
  } catch (error) {
    logger.error('❌ [API] Erreur PUT theme:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/website-themes/:id
 * Supprime un thème
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.webSiteTheme.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Thème supprimé avec succès' });
  } catch (error) {
    logger.error('❌ [API] Erreur DELETE theme:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
