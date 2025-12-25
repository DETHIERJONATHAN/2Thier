/**
 * API CRUD pour les sections de sites web
 * Gestion du Page Builder (header, hero, stats, CTA, footer, etc.)
 */

import express from 'express';
import { db } from '../lib/database';

const router = express.Router();
const prisma = db;

// GET /api/website-sections/:websiteId - Liste des sections d'un site
router.get('/website-sections/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;

    const sections = await prisma.webSiteSection.findMany({
      where: {
        websiteId: parseInt(websiteId)
      },
      orderBy: {
        displayOrder: 'asc'
      }
    });

    res.json(sections);
  } catch (error) {
    console.error('❌ Erreur récupération sections:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/website-sections - Créer une section
router.post('/website-sections', async (req, res) => {
  try {
    const { websiteId, key, type, name, content, backgroundColor, textColor, customCss } = req.body;

    // Obtenir le displayOrder max actuel
    const maxOrder = await prisma.webSiteSection.aggregate({
      where: { websiteId: parseInt(websiteId) },
      _max: { displayOrder: true }
    });

    const section = await prisma.webSiteSection.create({
      data: {
        websiteId: parseInt(websiteId),
        key,
        type,
        name,
        content: content || {},
        backgroundColor,
        textColor,
        customCss,
        displayOrder: (maxOrder._max.displayOrder || 0) + 1,
        isActive: true,
        isLocked: false
      }
    });

    res.json(section);
  } catch (error) {
    console.error('❌ Erreur création section:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/website-sections/:id - Modifier une section
router.put('/website-sections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, backgroundColor, textColor, customCss, isActive } = req.body;

    console.log('🔧 PUT /api/website-sections/:id');
    console.log('  ID:', id);
    console.log('  Body keys:', Object.keys(req.body));
    console.log('  Content keys:', content ? Object.keys(content) : 'undefined');

    // 🔥 FIX: Charger le content existant pour fusionner
    const existing = await prisma.webSiteSection.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Section introuvable' });
    }

    // 🔥 FIX: Deep merge du content pour préserver les propriétés imbriquées
    const deepMerge = (target: any, source: any): any => {
      if (!source || typeof source !== 'object' || Array.isArray(source)) {
        return source;
      }
      
      const result = { ...(target || {}) };
      
      for (const key in source) {
        if (source[key] !== undefined) {
          if (
            result[key] &&
            typeof result[key] === 'object' &&
            !Array.isArray(result[key]) &&
            typeof source[key] === 'object' &&
            !Array.isArray(source[key])
          ) {
            result[key] = deepMerge(result[key], source[key]);
          } else {
            result[key] = source[key];
          }
        }
      }
      
      return result;
    };

    const mergedContent = content !== undefined 
      ? deepMerge(existing.content as object, content)
      : existing.content;

    console.log('  🔍 Existing content keys:', existing.content ? Object.keys(existing.content as object) : 'none');
    console.log('  🔍 Merged content keys:', mergedContent ? Object.keys(mergedContent as object) : 'none');

    const section = await prisma.webSiteSection.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(content !== undefined && { content: mergedContent }),
        ...(backgroundColor !== undefined && { backgroundColor }),
        ...(textColor !== undefined && { textColor }),
        ...(customCss !== undefined && { customCss }),
        ...(isActive !== undefined && { isActive })
      }
    });

    console.log('✅ Section mise à jour ID:', section.id);
    res.json(section);
  } catch (error) {
    console.error('❌ Erreur modification section:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PATCH /api/website-sections/:id - Modifier partiellement une section (alias de PUT)
router.patch('/website-sections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, backgroundColor, textColor, customCss, isActive } = req.body;

    console.log('🔧 PATCH /api/website-sections/:id');
    console.log('  ID:', id);
    console.log('  Body keys:', Object.keys(req.body));

    // 🔥 FIX: Charger le content existant pour fusionner
    const existing = await prisma.webSiteSection.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Section introuvable' });
    }

    // 🔥 FIX: Deep merge du content pour préserver les propriétés imbriquées
    const deepMerge = (target: any, source: any): any => {
      if (!source || typeof source !== 'object' || Array.isArray(source)) {
        return source;
      }
      
      const result = { ...(target || {}) };
      
      for (const key in source) {
        if (source[key] !== undefined) {
          if (
            result[key] &&
            typeof result[key] === 'object' &&
            !Array.isArray(result[key]) &&
            typeof source[key] === 'object' &&
            !Array.isArray(source[key])
          ) {
            result[key] = deepMerge(result[key], source[key]);
          } else {
            result[key] = source[key];
          }
        }
      }
      
      return result;
    };

    const mergedContent = content !== undefined 
      ? deepMerge(existing.content as object, content)
      : existing.content;

    const section = await prisma.webSiteSection.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(content !== undefined && { content: mergedContent }),
        ...(backgroundColor !== undefined && { backgroundColor }),
        ...(textColor !== undefined && { textColor }),
        ...(customCss !== undefined && { customCss }),
        ...(isActive !== undefined && { isActive })
      }
    });

    console.log('✅ Section mise à jour:', section);
    res.json(section);
  } catch (error) {
    console.error('❌ Erreur modification section:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/website-sections/:id - Supprimer une section
router.delete('/website-sections/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si la section est verrouillée
    const section = await prisma.webSiteSection.findUnique({
      where: { id: parseInt(id) }
    });

    if (section?.isLocked) {
      return res.status(403).json({ error: 'Cette section est verrouillée et ne peut pas être supprimée' });
    }

    await prisma.webSiteSection.delete({
      where: { id: parseInt(id) }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur suppression section:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/website-sections/reorder - Réorganiser les sections
router.post('/website-sections/reorder', async (req, res) => {
  try {
    const { sections } = req.body; // [{ id, displayOrder }, ...]

    await prisma.$transaction(
      sections.map((section: { id: number; displayOrder: number }) =>
        prisma.webSiteSection.update({
          where: { id: section.id },
          data: { displayOrder: section.displayOrder }
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur réorganisation sections:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/website-sections/duplicate/:id - Dupliquer une section
router.post('/website-sections/duplicate/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const original = await prisma.webSiteSection.findUnique({
      where: { id: parseInt(id) }
    });

    if (!original) {
      return res.status(404).json({ error: 'Section introuvable' });
    }

    // Générer une nouvelle clé unique
    const newKey = `${original.key}-copy-${Date.now()}`;

    const duplicate = await prisma.webSiteSection.create({
      data: {
        websiteId: original.websiteId,
        key: newKey,
        type: original.type,
        name: `${original.name} (Copie)`,
        content: original.content,
        backgroundColor: original.backgroundColor,
        textColor: original.textColor,
        customCss: original.customCss,
        displayOrder: original.displayOrder + 1,
        isActive: original.isActive,
        isLocked: false
      }
    });

    res.json(duplicate);
  } catch (error) {
    console.error('❌ Erreur duplication section:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
