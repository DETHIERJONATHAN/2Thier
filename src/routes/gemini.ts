/**
 * 🤖 ROUTES API GOOGLE GEMINI
 * Routes pour l'intelligence artificielle dans le CRM
 */

import express from 'express';
import { getGeminiService } from '../services/GoogleGeminiService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const geminiService = getGeminiService();

// Middleware d'authentification pour toutes les routes Gemini
router.use(authenticateToken);

/**
 * 📧 POST /api/gemini/generate-email
 * Génère un email personnalisé pour un prospect
 */
router.post('/generate-email', async (req, res) => {
  try {
    const { leadData, emailType = 'initial' } = req.body;
    
    if (!leadData || (!leadData.name && !leadData.context)) {
      return res.status(400).json({
        success: false,
        message: 'Données du lead requises (nom ou contexte)'
      });
    }
    
    console.log(`🤖 [Gemini] Génération email ${emailType} pour ${leadData.name || 'prospect'}`);
    
    const result = await geminiService.generatePersonalizedEmail(leadData, emailType);
    
    if (result.success) {
      res.json({
        success: true,
        email: result.email,
        metadata: {
          generatedAt: new Date().toISOString(),
          type: emailType,
          leadName: leadData.name || 'prospect'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération de l\'email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Erreur route generate-email:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la génération d\'email'
    });
  }
});

/**
 * 📋 POST /api/gemini/analyze-lead
 * Analyse les données d'un lead et génère des insights
 */
router.post('/analyze-lead', async (req, res) => {
  try {
    const { leadData } = req.body;
    
    if (!leadData) {
      return res.status(400).json({
        success: false,
        message: 'Données du lead requises'
      });
    }
    
    console.log(`🤖 [Gemini] Analyse lead ${leadData.name || 'Anonyme'}`);
    
    const result = await geminiService.analyzeLeadData(leadData);
    
    if (result.success) {
      res.json({
        success: true,
        analysis: result.analysis,
        metadata: {
          analyzedAt: new Date().toISOString(),
          leadId: leadData.id
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'analyse du lead',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Erreur route analyze-lead:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'analyse du lead'
    });
  }
});

/**
 * 📝 POST /api/gemini/generate-proposal
 * Génère une proposition commerciale
 */
router.post('/generate-proposal', async (req, res) => {
  try {
    const { leadData, productData } = req.body;
    
    if (!leadData || !productData) {
      return res.status(400).json({
        success: false,
        message: 'Données du lead et du produit requises'
      });
    }
    
    console.log(`🤖 [Gemini] Génération proposition pour ${leadData.name}`);
    
    const result = await geminiService.generateCommercialProposal(leadData, productData);
    
    if (result.success) {
      res.json({
        success: true,
        proposal: result.proposal,
        metadata: {
          generatedAt: new Date().toISOString(),
          leadName: leadData.name,
          productName: productData.name
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération de la proposition',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Erreur route generate-proposal:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la génération de proposition'
    });
  }
});

/**
 * 🔍 POST /api/gemini/analyze-sentiment
 * Analyse le sentiment d'un email
 */
router.post('/analyze-sentiment', async (req, res) => {
  try {
    const { emailContent } = req.body;
    
    if (!emailContent) {
      return res.status(400).json({
        success: false,
        message: 'Contenu de l\'email requis'
      });
    }
    
    console.log('🤖 [Gemini] Analyse sentiment email');
    
    const result = await geminiService.analyzeSentiment(emailContent);
    
    if (result.success) {
      res.json({
        success: true,
        sentiment: result.sentiment,
        metadata: {
          analyzedAt: new Date().toISOString(),
          emailLength: emailContent.length
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'analyse de sentiment',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Erreur route analyze-sentiment:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'analyse de sentiment'
    });
  }
});

/**
 * 💬 POST /api/gemini/suggest-response
 * Suggère une réponse à un email
 */
router.post('/suggest-response', async (req, res) => {
  try {
    const { emailContent, context = {} } = req.body;
    
    if (!emailContent) {
      return res.status(400).json({
        success: false,
        message: 'Contenu de l\'email requis'
      });
    }
    
    console.log('🤖 [Gemini] Suggestion réponse email');
    
    const result = await geminiService.suggestEmailResponse(emailContent, context);
    
    if (result.success) {
      res.json({
        success: true,
        suggestions: result.suggestions,
        metadata: {
          generatedAt: new Date().toISOString(),
          context: context
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suggestion de réponse',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Erreur route suggest-response:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suggestion de réponse'
    });
  }
});

/**
 * 🧪 GET /api/gemini/test
 * Route de test pour vérifier la connexion Gemini
 */
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 [Gemini] Test de connexion');
    
    // Test simple avec données factices
    const testLead = {
      name: 'Test Prospect',
      company: 'Test Company',
      email: 'test@example.com'
    };
    
    const result = await geminiService.generatePersonalizedEmail(testLead, 'initial');
    
    res.json({
      success: true,
      message: 'Service Gemini opérationnel',
      test: result.success,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erreur test Gemini:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du test Gemini',
      error: error.message
    });
  }
});

/**
 * 📊 GET /api/gemini/stats
 * Statistiques d'utilisation Gemini
 */
router.get('/stats', async (req, res) => {
  try {
    // TODO: Implémenter le tracking des statistiques
    res.json({
      success: true,
      stats: {
        emailsGenerated: 0,
        leadsAnalyzed: 0,
        proposalsCreated: 0,
        sentimentAnalyses: 0,
        responseSuggestions: 0,
        lastUsed: new Date().toISOString()
      },
      message: 'Statistiques Gemini (à implémenter)'
    });
  } catch (error) {
    console.error('❌ Erreur stats Gemini:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
});

export default router;
