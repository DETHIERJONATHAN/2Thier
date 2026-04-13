/**
 * 🤖 AI ROUTES - API ENDPOINTS POUR L'INTELLIGENCE ARTIFICIELLE
 * 
 * Ces routes gèrent toutes les fonctionnalités IA du système :
 * - Génération de contenu par champ
 * - Génération de section complète
 * - Optimisation d'images
 * - Suggestions de styles
 * 
 * INTÉGRATION :
 * Dans api-server.ts, ajouter :
 * ```typescript
 * import { registerAIRoutes } from './site/api/ai-routes';
 * registerAIRoutes(app);
 * ```
 * 
 * @author IA Assistant - Phase C
 * @version 1.0.0
 */

import { Request, Response, Express } from 'express';
import OpenAI from 'openai';
import { logger } from '../../lib/logger';

// 🔑 Configuration OpenAI (ou autre provider)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

/**
 * 📝 TYPES
 */
interface GenerateFieldRequest {
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
}

interface GenerateSectionRequest {
  sectionType: string;
  businessType: string;
  tone: string;
  targetAudience: string;
  language: string;
  keywords?: string[];
  includeImages?: boolean;
}

interface OptimizeImageRequest {
  imageUrl: string;
  targetFormat?: 'webp' | 'jpeg' | 'png';
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

interface SuggestStylesRequest {
  sectionType: string;
  currentStyle?: unknown;
  brand?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  };
  preferences?: {
    modern?: boolean;
    minimalist?: boolean;
    colorful?: boolean;
  };
}

/**
 * 🎯 ROUTE 1 : GÉNÉRATION DE CONTENU PAR CHAMP
 * POST /api/ai/generate-field
 */
async function generateField(req: Request, res: Response) {
  try {
    logger.debug('✨ [AI] Génération de champ:', req.body);

    const {
      fieldId,
      fieldType,
      fieldLabel,
      currentValue,
      aiContext
    } = req.body as GenerateFieldRequest;

    // 🔍 Validation
    if (!fieldId || !fieldType || !aiContext?.sectionType) {
      return res.status(400).json({
        error: 'Paramètres manquants',
        required: ['fieldId', 'fieldType', 'aiContext.sectionType']
      });
    }

    // 🤖 Construction du prompt
    const prompt = buildFieldPrompt(fieldType, fieldLabel, aiContext, currentValue);

    logger.debug('🤖 [AI] Prompt:', prompt);

    // 🚀 Appel OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en copywriting et marketing digital. Tu génères du contenu ${aiContext.tone || 'professionnel'} en ${aiContext.language || 'français'} pour des sites web.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 500
    });

    const generatedContent = completion.choices[0]?.message?.content || '';

    logger.debug('✅ [AI] Contenu généré:', generatedContent);

    // 📊 Analyse de la qualité
    const analysis = {
      score: calculateQualityScore(generatedContent, fieldType),
      suggestions: generateImprovementSuggestions(generatedContent, fieldType),
      seo: analyzeSEO(generatedContent, aiContext.keywords || [])
    };

    return res.json({
      success: true,
      fieldId,
      content: generatedContent,
      analysis,
      usage: {
        tokens: completion.usage?.total_tokens || 0,
        model: 'gpt-4'
      }
    });

  } catch (error: unknown) {
    logger.error('❌ [AI] Erreur génération champ:', error);
    return res.status(500).json({
      error: 'Erreur lors de la génération',
      message: error.message
    });
  }
}

/**
 * 🎨 ROUTE 2 : GÉNÉRATION DE SECTION COMPLÈTE
 * POST /api/ai/generate-section
 */
async function generateSection(req: Request, res: Response) {
  try {
    logger.debug('✨ [AI] Génération de section:', req.body);

    const {
      sectionType,
      businessType,
      tone,
      targetAudience,
      language,
      keywords = [],
      includeImages = false
    } = req.body as GenerateSectionRequest;

    // 🔍 Validation
    if (!sectionType || !businessType) {
      return res.status(400).json({
        error: 'Paramètres manquants',
        required: ['sectionType', 'businessType']
      });
    }

    // 🤖 Construction du prompt pour section complète
    const prompt = buildSectionPrompt(
      sectionType,
      businessType,
      tone,
      targetAudience,
      language,
      keywords
    );

    logger.debug('🤖 [AI] Prompt section:', prompt);

    // 🚀 Appel OpenAI avec JSON structuré
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en création de sites web. Tu génères du contenu structuré au format JSON pour des sections de site web. Réponds UNIQUEMENT avec du JSON valide, sans markdown.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const sectionContent = JSON.parse(rawContent);

    logger.debug('✅ [AI] Section générée:', sectionContent);

    // 📸 Génération d'images si demandé
    if (includeImages) {
      sectionContent.generatedImages = await generateImagesForSection(
        sectionType,
        businessType
      );
    }

    return res.json({
      success: true,
      sectionType,
      content: sectionContent,
      usage: {
        tokens: completion.usage?.total_tokens || 0,
        model: 'gpt-4'
      }
    });

  } catch (error: unknown) {
    logger.error('❌ [AI] Erreur génération section:', error);
    return res.status(500).json({
      error: 'Erreur lors de la génération de section',
      message: error.message
    });
  }
}

/**
 * 🖼️ ROUTE 3 : OPTIMISATION D'IMAGE
 * POST /api/ai/optimize-image
 */
async function optimizeImage(req: Request, res: Response) {
  try {
    logger.debug('🖼️ [AI] Optimisation image:', req.body);

    const {
      imageUrl,
      targetFormat = 'webp',
      quality = 85,
      maxWidth = 1920,
      maxHeight = 1080
    } = req.body as OptimizeImageRequest;

    // 🔍 Validation
    if (!imageUrl) {
      return res.status(400).json({
        error: 'imageUrl requis'
      });
    }

    // 🎨 Analyse de l'image avec GPT-4 Vision
    const visionAnalysis = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyse cette image et suggère des améliorations pour un site web professionnel. Format JSON: {description, suggestions, accessibility, seoAlt}'
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      max_tokens: 500
    });

    const analysis = JSON.parse(
      visionAnalysis.choices[0]?.message?.content || '{}'
    );

    logger.debug('✅ [AI] Analyse image:', analysis);

    // Note: L'optimisation réelle (compression, resize) devrait être faite
    // avec Sharp ou un service comme Cloudinary
    // Ici on retourne juste l'analyse IA

    return res.json({
      success: true,
      originalUrl: imageUrl,
      analysis,
      recommendations: {
        format: targetFormat,
        quality,
        dimensions: { maxWidth, maxHeight }
      },
      usage: {
        tokens: visionAnalysis.usage?.total_tokens || 0,
        model: 'gpt-4-vision-preview'
      }
    });

  } catch (error: unknown) {
    logger.error('❌ [AI] Erreur optimisation image:', error);
    return res.status(500).json({
      error: 'Erreur lors de l\'optimisation',
      message: error.message
    });
  }
}

/**
 * 🎨 ROUTE 4 : SUGGESTIONS DE STYLES
 * POST /api/ai/suggest-styles
 */
async function suggestStyles(req: Request, res: Response) {
  try {
    logger.debug('🎨 [AI] Suggestions de styles:', req.body);

    const {
      sectionType,
      currentStyle = {},
      brand = {},
      preferences = {}
    } = req.body as SuggestStylesRequest;

    // 🔍 Validation
    if (!sectionType) {
      return res.status(400).json({
        error: 'sectionType requis'
      });
    }

    // 🤖 Construction du prompt
    const prompt = `
Génère des suggestions de styles CSS pour une section "${sectionType}" de site web.

Contexte :
- Style actuel : ${JSON.stringify(currentStyle)}
- Marque : ${JSON.stringify(brand)}
- Préférences : ${JSON.stringify(preferences)}

Génère 3 variations de styles (moderne, élégant, audacieux) au format JSON :
{
  "variations": [
    {
      "name": "Moderne",
      "description": "...",
      "styles": {
        "background": "...",
        "color": "...",
        "padding": "...",
        ...
      }
    }
  ]
}
    `.trim();

    // 🚀 Appel OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en design web et CSS. Tu génères des suggestions de styles au format JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const suggestions = JSON.parse(
      completion.choices[0]?.message?.content || '{"variations":[]}'
    );

    logger.debug('✅ [AI] Suggestions générées:', suggestions);

    return res.json({
      success: true,
      sectionType,
      suggestions: suggestions.variations || [],
      usage: {
        tokens: completion.usage?.total_tokens || 0,
        model: 'gpt-4'
      }
    });

  } catch (error: unknown) {
    logger.error('❌ [AI] Erreur suggestions styles:', error);
    return res.status(500).json({
      error: 'Erreur lors de la génération de suggestions',
      message: error.message
    });
  }
}

/**
 * 🛠️ HELPERS
 */

/**
 * Construction du prompt pour un champ
 */
function buildFieldPrompt(
  fieldType: string,
  fieldLabel: string,
  aiContext: unknown,
  currentValue?: unknown
): string {
  const { sectionType, businessType, tone, targetAudience, keywords } = aiContext;

  let prompt = `Génère un contenu ${tone || 'professionnel'} pour le champ "${fieldLabel}" (type: ${fieldType}) d'une section "${sectionType}".

Contexte :
- Type de business : ${businessType || 'entreprise générale'}
- Audience cible : ${targetAudience || 'grand public'}
- Mots-clés : ${keywords?.join(', ') || 'aucun'}
`;

  if (currentValue) {
    prompt += `\nContenu actuel : ${JSON.stringify(currentValue)}\n`;
  }

  // Ajustements selon le type de champ
  switch (fieldType) {
    case 'text':
    case 'textarea':
      prompt += '\nGénère un texte accrocheur et percutant.';
      break;
    case 'rich-text':
      prompt += '\nGénère du contenu au format HTML avec des balises <p>, <strong>, <em>.';
      break;
    case 'array':
      prompt += '\nGénère une liste de 3-5 éléments au format JSON array.';
      break;
    default:
      prompt += '\nGénère un contenu adapté au type de champ.';
  }

  return prompt;
}

/**
 * Construction du prompt pour une section complète
 */
function buildSectionPrompt(
  sectionType: string,
  businessType: string,
  tone: string,
  targetAudience: string,
  language: string,
  keywords: string[]
): string {
  return `
Génère le contenu complet pour une section "${sectionType}" de site web.

Contexte :
- Type de business : ${businessType}
- Ton : ${tone}
- Audience : ${targetAudience}
- Langue : ${language}
- Mots-clés : ${keywords.join(', ')}

Génère un JSON structuré avec tous les champs nécessaires pour cette section.
Exemple pour un hero : {"title": "...", "subtitle": "...", "ctaButtons": [...]}.

Sois créatif, professionnel et adapté au contexte.
  `.trim();
}

/**
 * Calcul du score de qualité
 */
function calculateQualityScore(content: string, fieldType: string): number {
  let score = 50; // Score de base

  // Longueur appropriée
  if (content.length > 10 && content.length < 500) score += 20;
  
  // Pas de répétitions
  const words = content.split(' ');
  const uniqueWords = new Set(words);
  if (uniqueWords.size / words.length > 0.7) score += 15;

  // Ponctuation correcte
  if (/[.!?]$/.test(content)) score += 10;

  // Capitalisation
  if (/^[A-Z]/.test(content)) score += 5;

  return Math.min(score, 100);
}

/**
 * Suggestions d'amélioration
 */
function generateImprovementSuggestions(
  content: string,
  fieldType: string
): string[] {
  const suggestions: string[] = [];

  if (content.length < 10) {
    suggestions.push('Contenu trop court, ajoutez plus de détails');
  }

  if (content.length > 500) {
    suggestions.push('Contenu trop long, condensez le message');
  }

  if (!/[.!?]$/.test(content)) {
    suggestions.push('Ajoutez une ponctuation finale');
  }

  if (!/^[A-Z]/.test(content)) {
    suggestions.push('Commencez par une majuscule');
  }

  return suggestions;
}

/**
 * Analyse SEO
 */
function analyzeSEO(content: string, keywords: string[]): any {
  const contentLower = content.toLowerCase();
  
  const keywordsFound = keywords.filter(kw =>
    contentLower.includes(kw.toLowerCase())
  );

  return {
    keywordsFound: keywordsFound.length,
    keywordsTotal: keywords.length,
    density: keywords.length > 0 
      ? (keywordsFound.length / keywords.length) * 100 
      : 0,
    recommendations: keywordsFound.length < keywords.length 
      ? ['Intégrez plus de mots-clés ciblés']
      : []
  };
}

/**
 * Génération d'images pour une section
 */
async function generateImagesForSection(
  sectionType: string,
  businessType: string
): Promise<string[]> {
  try {
    // Utilisation de DALL-E pour générer des images
    const prompt = `Professional ${businessType} website ${sectionType} section image, modern, clean, high quality`;

    const image = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1792x1024',
      quality: 'standard'
    });

    return [image.data[0]?.url || ''];
  } catch (error) {
    logger.error('❌ [AI] Erreur génération image:', error);
    return [];
  }
}

/**
 * 🚀 ENREGISTREMENT DES ROUTES
 */
export function registerAIRoutes(app: Express) {
  logger.debug('🤖 [AI] Enregistrement des routes IA...');

  app.post('/api/ai/generate-field', generateField);
  app.post('/api/ai/generate-section', generateSection);
  app.post('/api/ai/optimize-image', optimizeImage);
  app.post('/api/ai/suggest-styles', suggestStyles);

  logger.debug('✅ [AI] Routes IA enregistrées');
}
