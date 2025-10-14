/**
 * Routes API pour la génération de contenu IA
 */

import { Router } from 'express';
import { aiContentService } from '../services/aiContentService';

const router = Router();

/**
 * POST /api/ai-content/generate-service
 * Génère le contenu d'un service
 */
router.post('/generate-service', async (req, res) => {
  try {
    const { siteName, industry, serviceType, keywords } = req.body;

    if (!siteName || !industry || !serviceType) {
      return res.status(400).json({
        error: 'Paramètres manquants : siteName, industry, serviceType requis'
      });
    }

    const content = await aiContentService.generateService({
      siteName,
      industry,
      serviceType,
      keywords
    });

    res.json({
      success: true,
      content
    });
  } catch (error: any) {
    console.error('Erreur génération service:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération du service',
      details: error.message
    });
  }
});

/**
 * POST /api/ai-content/generate-project
 * Génère le contenu d'un projet
 */
router.post('/generate-project', async (req, res) => {
  try {
    const { siteName, industry, projectType, location } = req.body;

    if (!siteName || !industry || !projectType) {
      return res.status(400).json({
        error: 'Paramètres manquants : siteName, industry, projectType requis'
      });
    }

    const content = await aiContentService.generateProject({
      siteName,
      industry,
      projectType,
      location
    });

    res.json({
      success: true,
      content
    });
  } catch (error: any) {
    console.error('Erreur génération projet:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération du projet',
      details: error.message
    });
  }
});

/**
 * POST /api/ai-content/generate-testimonial
 * Génère le contenu d'un témoignage
 */
router.post('/generate-testimonial', async (req, res) => {
  try {
    const { siteName, industry, serviceType, customerType } = req.body;

    if (!siteName || !industry || !serviceType) {
      return res.status(400).json({
        error: 'Paramètres manquants : siteName, industry, serviceType requis'
      });
    }

    const content = await aiContentService.generateTestimonial({
      siteName,
      industry,
      serviceType,
      customerType
    });

    res.json({
      success: true,
      content
    });
  } catch (error: any) {
    console.error('Erreur génération témoignage:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération du témoignage',
      details: error.message
    });
  }
});

/**
 * POST /api/ai-content/generate-page
 * Génère le contenu complet d'une page
 */
router.post('/generate-page', async (req, res) => {
  try {
    const { siteName, siteType, industry, mainServices, targetAudience } = req.body;

    if (!siteName || !siteType || !industry || !mainServices) {
      return res.status(400).json({
        error: 'Paramètres manquants : siteName, siteType, industry, mainServices requis'
      });
    }

    const content = await aiContentService.generatePageContent({
      siteName,
      siteType,
      industry,
      mainServices,
      targetAudience
    });

    res.json({
      success: true,
      content
    });
  } catch (error: any) {
    console.error('Erreur génération page:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération de la page',
      details: error.message
    });
  }
});

/**
 * POST /api/ai-content/optimize-seo
 * Optimise le SEO d'un contenu existant
 */
router.post('/optimize-seo', async (req, res) => {
  try {
    const { currentTitle, currentDescription, pageContent, targetKeywords, siteName, industry } = req.body;

    if (!pageContent || !siteName || !industry) {
      return res.status(400).json({
        error: 'Paramètres manquants : pageContent, siteName, industry requis'
      });
    }

    const suggestions = await aiContentService.optimizeSEO({
      currentTitle,
      currentDescription,
      pageContent,
      targetKeywords,
      siteName,
      industry
    });

    res.json({
      success: true,
      suggestions
    });
  } catch (error: any) {
    console.error('Erreur optimisation SEO:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'optimisation SEO',
      details: error.message
    });
  }
});

/**
 * POST /api/ai-content/generate-multiple-services
 * Génère plusieurs services d'un coup
 */
router.post('/generate-multiple-services', async (req, res) => {
  try {
    const { siteName, industry, serviceTypes } = req.body;

    if (!siteName || !industry || !serviceTypes || !Array.isArray(serviceTypes)) {
      return res.status(400).json({
        error: 'Paramètres manquants : siteName, industry, serviceTypes (array) requis'
      });
    }

    const services = await aiContentService.generateMultipleServices({
      siteName,
      industry,
      serviceTypes
    });

    res.json({
      success: true,
      services,
      count: services.length
    });
  } catch (error: any) {
    console.error('Erreur génération multiple services:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération des services',
      details: error.message
    });
  }
});

export default router;
