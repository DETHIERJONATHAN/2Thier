/**
 * 🤖 AI FIELD GENERATOR - ROUTE INTELLIGENTE
 * 
 * Génère du contenu intelligent pour n'importe quel champ du Website Builder
 * avec analyse de contexte, propositions multiples, et scoring de qualité.
 * 
 * Endpoint: POST /api/ai/generate-field
 * 
 * @author IA Assistant - Système de génération intelligent
 */

import express from 'express';
import { authMiddleware } from '../middlewares/auth';
import type { AuthenticatedRequest } from '../middlewares/auth';
import { getGeminiService } from '../services/GoogleGeminiService';
import { logger } from '../lib/logger';

const router = express.Router();
const geminiService = getGeminiService();

// Protection par authentification
router.use(authMiddleware);

/**
 * 🎯 SYSTÈME DE PROMPTS INTELLIGENTS
 * Adapte le prompt selon le type de champ pour des résultats optimaux
 */
class SmartPromptBuilder {
  /**
   * Construit un prompt optimisé selon le type de champ
   */
  static buildPrompt(params: {
    fieldId: string;
    fieldType: string;
    fieldLabel: string;
    currentValue?: unknown;
    aiContext: {
      sectionType: string;
      businessType?: string;
      tone?: string;
      targetAudience?: string;
      language?: string;
      keywords?: string[];
    };
  }): string {
    const { fieldId, fieldType, fieldLabel, currentValue, aiContext } = params;
    const language = aiContext.language || 'français';
    const tone = aiContext.tone || 'professionnel et convaincant';
    const audience = aiContext.targetAudience || 'clients potentiels';
    const business = aiContext.businessType || 'services énergétiques';
    const keywords = aiContext.keywords?.join(', ') || '';

    // Contexte enrichi pour tous les types
    const baseContext = `
Tu es un expert en rédaction web, marketing digital et SEO pour le secteur ${business}.

CONTEXTE:
- Type de section: ${aiContext.sectionType}
- Champ à générer: ${fieldLabel} (${fieldId})
- Public cible: ${audience}
- Ton: ${tone}
- Langue: ${language}
${keywords ? `- Mots-clés suggérés: ${keywords}` : ''}
${currentValue ? `- Valeur actuelle: "${currentValue}"` : ''}
`;

    // Prompts spécialisés selon le type de champ
    switch (fieldType) {
      case 'text':
        return this.buildTextPrompt(baseContext, fieldId, fieldLabel, currentValue);
      
      case 'textarea':
        return this.buildTextareaPrompt(baseContext, fieldId, fieldLabel, currentValue);
      
      case 'select':
      case 'multiselect':
        return this.buildSelectPrompt(baseContext, fieldId, fieldLabel, currentValue);
      
      case 'richtext':
        return this.buildRichtextPrompt(baseContext, fieldId, fieldLabel, currentValue);
      
      default:
        return this.buildGenericPrompt(baseContext, fieldLabel, currentValue);
    }
  }

  /**
   * Prompt pour champs texte courts (titres, labels, CTA)
   */
  private static buildTextPrompt(context: string, fieldId: string, label: string, current?: unknown): string {
    // Détection du type de contenu par l'ID du champ
    const isTitle = fieldId.toLowerCase().includes('title') || label.toLowerCase().includes('titre');
    const isCTA = fieldId.toLowerCase().includes('cta') || label.toLowerCase().includes('bouton');
    const isLabel = fieldId.toLowerCase().includes('label');

    let specificGuidelines = '';
    let maxLength = 60;

    if (isTitle) {
      specificGuidelines = `
GUIDELINES SPÉCIFIQUES TITRE:
- Accrocheur et mémorable
- Orienté bénéfice client
- Inclure un chiffre ou statistique si pertinent
- Évoquer la transformation ou le résultat
- Créer de la curiosité ou urgence
`;
      maxLength = 60;
    } else if (isCTA) {
      specificGuidelines = `
GUIDELINES SPÉCIFIQUES CTA:
- Verbe d'action à l'impératif
- Court et percutant (3-5 mots maximum)
- Créer l'urgence ou la valeur
- Exemples: "Demander un devis gratuit", "Découvrir nos solutions", "Calculer mes économies"
`;
      maxLength = 40;
    } else if (isLabel) {
      specificGuidelines = `
GUIDELINES SPÉCIFIQUES LABEL:
- Clair et descriptif
- Terme professionnel mais accessible
- Cohérent avec le secteur
`;
      maxLength = 40;
    }

    return `${context}

${specificGuidelines}

TÂCHE: Génère 3 PROPOSITIONS VARIÉES pour ce champ texte court.

CONTRAINTES:
- Maximum ${maxLength} caractères par proposition
- Ton professionnel et convaincant
- Optimisé SEO naturellement
- Éviter les clichés et phrases creuses
- Variété dans les approches (angle différent pour chaque proposition)

Retourne UNIQUEMENT un objet JSON valide avec cette structure:
{
  "suggestions": [
    {
      "content": "Proposition 1",
      "reasoning": "Pourquoi cette proposition (1 phrase)",
      "score": 85
    },
    {
      "content": "Proposition 2", 
      "reasoning": "Pourquoi cette proposition (1 phrase)",
      "score": 90
    },
    {
      "content": "Proposition 3",
      "reasoning": "Pourquoi cette proposition (1 phrase)", 
      "score": 80
    }
  ],
  "analysis": {
    "fieldType": "${fieldId}",
    "bestApproach": "Approche recommandée (1 phrase)",
    "keywords": ["mot-clé 1", "mot-clé 2", "mot-clé 3"],
    "avgScore": 85
  }
}

⚠️ IMPORTANT: Retourne UNIQUEMENT le JSON, aucun texte avant ou après.`;
  }

  /**
   * Prompt pour champs textarea (descriptions, paragraphes)
   */
  private static buildTextareaPrompt(context: string, fieldId: string, label: string, current?: unknown): string {
    const isDescription = fieldId.toLowerCase().includes('description') || label.toLowerCase().includes('description');
    const isAbout = fieldId.toLowerCase().includes('about') || label.toLowerCase().includes('présentation');

    let specificGuidelines = '';
    let maxLength = 200;

    if (isDescription) {
      specificGuidelines = `
GUIDELINES SPÉCIFIQUES DESCRIPTION:
- 2-3 phrases persuasives
- Structure: Problème → Solution → Bénéfice
- Inclure des chiffres/données si pertinent
- Call-to-action implicite
- Optimisé pour la conversion
`;
      maxLength = 200;
    } else if (isAbout) {
      specificGuidelines = `
GUIDELINES SPÉCIFIQUES À PROPOS:
- 3-4 phrases engageantes
- Histoire/mission de l'entreprise
- Valeurs et différenciateurs
- Preuve sociale ou chiffres clés
- Créer la confiance
`;
      maxLength = 300;
    }

    return `${context}

${specificGuidelines}

TÂCHE: Génère 3 PROPOSITIONS VARIÉES pour ce champ texte long.

CONTRAINTES:
- Maximum ${maxLength} caractères par proposition
- Style fluide et naturel
- Ponctuation et structure professionnelle
- Intégration naturelle des mots-clés
- Éviter le jargon excessif
- Variété dans les angles (rationnel, émotionnel, social proof)

Retourne UNIQUEMENT un objet JSON valide avec cette structure:
{
  "suggestions": [
    {
      "content": "Proposition 1 (2-3 phrases)",
      "reasoning": "Pourquoi cette proposition (1 phrase)",
      "score": 88,
      "angle": "angle rationnel / émotionnel / social proof"
    },
    {
      "content": "Proposition 2 (2-3 phrases)",
      "reasoning": "Pourquoi cette proposition (1 phrase)",
      "score": 92,
      "angle": "angle rationnel / émotionnel / social proof"
    },
    {
      "content": "Proposition 3 (2-3 phrases)",
      "reasoning": "Pourquoi cette proposition (1 phrase)",
      "score": 85,
      "angle": "angle rationnel / émotionnel / social proof"
    }
  ],
  "analysis": {
    "fieldType": "${fieldId}",
    "bestApproach": "Approche recommandée (1 phrase)",
    "keywords": ["mot-clé 1", "mot-clé 2", "mot-clé 3", "mot-clé 4"],
    "avgScore": 88,
    "readabilityTips": ["Conseil 1", "Conseil 2"]
  }
}

⚠️ IMPORTANT: Retourne UNIQUEMENT le JSON, aucun texte avant ou après.`;
  }

  /**
   * Prompt pour champs select/multiselect (features, tags, options)
   */
  private static buildSelectPrompt(context: string, fieldId: string, label: string, current?: unknown): string {
    const isFeatures = fieldId.toLowerCase().includes('feature') || label.toLowerCase().includes('caractéristique');
    const isTags = fieldId.toLowerCase().includes('tag') || label.toLowerCase().includes('étiquette');
    const isBenefits = fieldId.toLowerCase().includes('benefit') || label.toLowerCase().includes('avantage');

    let specificGuidelines = '';
    let itemCount = 4;

    if (isFeatures) {
      specificGuidelines = `
GUIDELINES SPÉCIFIQUES FEATURES:
- Caractéristiques techniques ET bénéfices
- Format: "Bénéfice concret + détail technique"
- Exemples: "Garantie 25 ans sur les panneaux", "Installation en 2 jours chrono"
- Mélanger aspects techniques, pratiques, et commerciaux
`;
      itemCount = 4;
    } else if (isTags) {
      specificGuidelines = `
GUIDELINES SPÉCIFIQUES TAGS:
- Mots-clés courts (1-3 mots)
- Descriptifs et recherchables
- Mix: technique + catégorie + bénéfice
- Exemples: "Énergie verte", "Résidentiel", "Haute performance"
`;
      itemCount = 5;
    } else if (isBenefits) {
      specificGuidelines = `
GUIDELINES SPÉCIFIQUES AVANTAGES:
- Orienté résultat client
- Quantifiable si possible
- Émotionnel + rationnel
- Exemples: "Réduisez vos factures de 60%", "Installation garantie décennale"
`;
      itemCount = 4;
    }

    return `${context}

${specificGuidelines}

TÂCHE: Génère ${itemCount} ITEMS PERTINENTS ET VARIÉS pour ce champ liste.

CONTRAINTES:
- ${itemCount} items par proposition
- Chaque item: 5-12 mots maximum
- Cohérence et complémentarité entre les items
- Éviter les répétitions
- Mix de types: technique, pratique, émotionnel, chiffré

Retourne UNIQUEMENT un objet JSON valide avec cette structure:
{
  "suggestions": [
    {
      "content": ["Item 1", "Item 2", "Item 3", "Item 4"],
      "reasoning": "Logique de sélection (1 phrase)",
      "score": 87
    },
    {
      "content": ["Item 1", "Item 2", "Item 3", "Item 4"],
      "reasoning": "Logique de sélection (1 phrase)",
      "score": 91
    },
    {
      "content": ["Item 1", "Item 2", "Item 3", "Item 4"],
      "reasoning": "Logique de sélection (1 phrase)",
      "score": 84
    }
  ],
  "analysis": {
    "fieldType": "${fieldId}",
    "bestApproach": "Approche recommandée (1 phrase)",
    "keywords": ["mot-clé 1", "mot-clé 2", "mot-clé 3"],
    "avgScore": 87
  }
}

⚠️ IMPORTANT: Retourne UNIQUEMENT le JSON, aucun texte avant ou après.`;
  }

  /**
   * Prompt pour richtext (contenu HTML/Markdown enrichi)
   */
  private static buildRichtextPrompt(context: string, fieldId: string, label: string, current?: unknown): string {
    return `${context}

TÂCHE: Génère 2 PROPOSITIONS VARIÉES de contenu enrichi (paragraphes structurés).

CONTRAINTES:
- 2-4 paragraphes par proposition
- Structure: Intro → Développement → Conclusion/CTA
- Ton professionnel et engageant
- Intégration naturelle des mots-clés
- Lisibilité optimale (phrases courtes, transitions)

Retourne UNIQUEMENT un objet JSON valide avec cette structure:
{
  "suggestions": [
    {
      "content": "Paragraphe 1\n\nParagraphe 2\n\nParagraphe 3",
      "reasoning": "Pourquoi cette proposition (1 phrase)",
      "score": 89,
      "structure": "intro + bénéfices + preuve sociale"
    },
    {
      "content": "Paragraphe 1\n\nParagraphe 2\n\nParagraphe 3",
      "reasoning": "Pourquoi cette proposition (1 phrase)",
      "score": 92,
      "structure": "problème + solution + résultats"
    }
  ],
  "analysis": {
    "fieldType": "${fieldId}",
    "bestApproach": "Approche recommandée (1 phrase)",
    "keywords": ["mot-clé 1", "mot-clé 2", "mot-clé 3", "mot-clé 4"],
    "avgScore": 90,
    "readabilityScore": 85
  }
}

⚠️ IMPORTANT: Retourne UNIQUEMENT le JSON, aucun texte avant ou après.`;
  }

  /**
   * Prompt générique pour types inconnus
   */
  private static buildGenericPrompt(context: string, label: string, current?: unknown): string {
    return `${context}

TÂCHE: Génère 3 PROPOSITIONS PERTINENTES pour le champ "${label}".

Retourne UNIQUEMENT un objet JSON valide avec cette structure:
{
  "suggestions": [
    {
      "content": "Proposition 1",
      "reasoning": "Pourquoi cette proposition (1 phrase)",
      "score": 85
    },
    {
      "content": "Proposition 2",
      "reasoning": "Pourquoi cette proposition (1 phrase)",
      "score": 88
    },
    {
      "content": "Proposition 3",
      "reasoning": "Pourquoi cette proposition (1 phrase)",
      "score": 82
    }
  ],
  "analysis": {
    "fieldType": "${label}",
    "bestApproach": "Approche recommandée (1 phrase)",
    "keywords": ["mot-clé 1", "mot-clé 2", "mot-clé 3"],
    "avgScore": 85
  }
}

⚠️ IMPORTANT: Retourne UNIQUEMENT le JSON, aucun texte avant ou après.`;
  }
}

/**
 * 📊 ANALYSEUR DE QUALITÉ
 * Évalue la qualité des suggestions générées
 */
class QualityAnalyzer {
  /**
   * Analyse et enrichit les suggestions avec des métriques
   */
  static analyzeSuggestions(response: unknown, fieldType: string): any {
    try {
      // Calcul du score moyen
      const scores = response.suggestions.map((s: Record<string, unknown>) => s.score || 0);
      const avgScore = scores.length > 0 
        ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
        : 0;

      // Tri des suggestions par score
      response.suggestions.sort((a: unknown, b: unknown) => (b.score || 0) - (a.score || 0));

      // Enrichissement de l'analyse
      response.analysis = {
        ...response.analysis,
        avgScore,
        generatedAt: new Date().toISOString(),
        fieldType,
        qualityLevel: avgScore >= 90 ? 'excellent' : avgScore >= 80 ? 'good' : avgScore >= 70 ? 'acceptable' : 'needs-improvement'
      };

      return response;
    } catch (error) {
      logger.error('❌ [QualityAnalyzer] Erreur analyse:', error);
      return response;
    }
  }
}

/**
 * 🎯 ENDPOINT PRINCIPAL: POST /api/ai/generate-field
 */
router.post('/generate-field', async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const { fieldId, fieldType, fieldLabel, currentValue, aiContext } = req.body;

    // ✅ Validation des paramètres
    if (!fieldId || !fieldType || !fieldLabel) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres manquants',
        details: 'fieldId, fieldType et fieldLabel sont requis'
      });
    }

    if (!aiContext || !aiContext.sectionType) {
      return res.status(400).json({
        success: false,
        error: 'Contexte IA manquant',
        details: 'aiContext.sectionType est requis'
      });
    }

    logger.info('🤖 [AI] Génération pour:', {
      fieldId,
      fieldType,
      fieldLabel,
      sectionType: aiContext.sectionType
    });

    // 🧠 Construction du prompt intelligent
    const prompt = SmartPromptBuilder.buildPrompt({
      fieldId,
      fieldType,
      fieldLabel,
      currentValue,
      aiContext
    });

    logger.info('📝 [AI] Prompt construit, appel à Gemini...');

    // 🚀 Génération avec Gemini
    const geminiResult = await geminiService.chat({ prompt, raw: true });
    
    if (!geminiResult.success || !geminiResult.content) {
      throw new Error(geminiResult.error || 'Erreur lors de l\'appel à Gemini');
    }

    logger.info('✅ [AI] Réponse brute reçue:', geminiResult.content.substring(0, 200));

    // 📊 Extraction et parsing du JSON
    const jsonMatch = geminiResult.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Format de réponse invalide: JSON non trouvé dans la réponse IA');
    }

    let parsedResponse = JSON.parse(jsonMatch[0]);

    // 📈 Analyse de qualité
    parsedResponse = QualityAnalyzer.analyzeSuggestions(parsedResponse, fieldType);

  const duration = Date.now() - startTime;
  const modelUsed = geminiResult.model || geminiService.getStatus().model;

    logger.info(`✅ [AI] Génération réussie en ${duration}ms, score moyen: ${parsedResponse.analysis.avgScore}/100`);

    // 🎉 Réponse structurée
    return res.json({
      success: true,
      content: parsedResponse.suggestions[0]?.content, // Meilleure suggestion par défaut
      suggestions: parsedResponse.suggestions,
      analysis: parsedResponse.analysis,
      metadata: {
        generatedAt: new Date().toISOString(),
        duration,
        model: modelUsed,
        fieldType,
        fieldId
      }
    });

  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    
    logger.error('❌ [AI] Erreur génération:', error);

    // Gestion des erreurs spécifiques
    if (error.message?.includes('API key')) {
      return res.status(500).json({
        success: false,
        error: 'Configuration IA manquante',
        details: 'La clé API Google Gemini n\'est pas configurée',
        duration
      });
    }

    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      return res.status(429).json({
        success: false,
        error: 'Limite de quota atteinte',
        details: 'Trop de requêtes IA. Attendez quelques instants.',
        duration
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération',
      details: error.message || 'Erreur inconnue',
      duration
    });
  }
});

/**
 * 🔍 ENDPOINT STATUS: GET /api/ai/status
 * Vérifie si le service IA est disponible
 */
router.get('/status', async (_req: AuthenticatedRequest, res) => {
  try {
    // Test simple de disponibilité
    const isAvailable = !!process.env.GOOGLE_API_KEY || !!process.env.GEMINI_API_KEY;
    
    res.json({
      success: true,
      available: isAvailable,
      service: 'Google Gemini',
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      available: false,
      error: error.message
    });
  }
});

export default router;
