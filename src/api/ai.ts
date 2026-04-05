/**
 * 🤖 API IA - Routes pour la génération de contenu avec Google Gemini
 */

import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// Initialiser Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Modèle à utiliser
const MODEL_NAME = 'gemini-pro';

/**
 * POST /api/ai/generate
 * Génère des suggestions avec Gemini
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, context, sectionType, currentValue } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Le prompt est requis'
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'GEMINI_API_KEY non configurée'
      });
    }


    // Obtenir le modèle
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Configuration de génération
    const generationConfig = {
      temperature: 0.8,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    };

    // Générer le contenu
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });

    const response = await result.response;
    const text = response.text();


    // Parser la réponse JSON
    let suggestions;
    try {
      // Essayer de parser comme JSON
      const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Pas de JSON trouvé');
      }
    } catch (parseError) {
      console.warn('[AI] Réponse non-JSON, conversion en array');
      // Si ce n'est pas du JSON, traiter comme du texte brut
      suggestions = parseNonJSONResponse(text, context);
    }

    // Formater les suggestions selon le contexte
    const formattedSuggestions = formatSuggestions(suggestions, context);

    res.json({
      success: true,
      suggestions: formattedSuggestions,
      raw: text // Pour debug
    });

  } catch (error: any) {
    console.error('[AI] Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la génération IA',
      details: error.toString()
    });
  }
});

/**
 * Parser une réponse non-JSON
 */
function parseNonJSONResponse(text: string, context: string): any {
  // Séparer par lignes vides ou numéros
  const lines = text.split(/\n\n+|\n\d+\.\s+/).filter(l => l.trim());

  switch (context) {
    case 'title':
    case 'subtitle':
    case 'description':
      // Retourner chaque ligne comme une suggestion
      return lines.slice(0, 5).map(line => line.trim());

    case 'fullSection':
      // Essayer d'extraire titre, sous-titre, description
      return {
        title: lines[0] || 'Titre généré',
        subtitle: lines[1] || 'Sous-titre généré',
        description: lines[2] || 'Description générée',
        items: lines.slice(3, 9).map((line, idx) => ({
          title: `Élément ${idx + 1}`,
          description: line
        }))
      };

    default:
      return lines;
  }
}

/**
 * Formater les suggestions selon le contexte
 */
function formatSuggestions(data: any, context: string): any[] {
  switch (context) {
    case 'title':
    case 'subtitle':
    case 'description':
      // Array de strings -> Array d'objets avec value
      if (Array.isArray(data)) {
        return data.map(item => ({
          value: typeof item === 'string' ? item : item.value || item.text || String(item),
          reason: typeof item === 'object' ? item.reason : undefined
        }));
      }
      return [{ value: String(data) }];

    case 'fullSection':
      // Un seul objet complet
      if (Array.isArray(data)) {
        return data.map(item => ({
          value: {
            title: item.title || 'Titre',
            subtitle: item.subtitle || 'Sous-titre',
            description: item.description || 'Description',
            items: item.items || []
          },
          reason: item.reason
        }));
      }
      return [{
        value: {
          title: data.title || 'Titre',
          subtitle: data.subtitle || 'Sous-titre',
          description: data.description || 'Description',
          items: data.items || []
        }
      }];

    case 'layout':
      // Array de configurations de layout
      if (Array.isArray(data)) {
        return data.map(item => ({
          value: {
            columns: item.columns || 3,
            rows: item.rows,
            gap: item.gap || 24,
            responsive: item.responsive || { mobile: 1, tablet: 2, desktop: 3 }
          },
          reason: item.reason
        }));
      }
      return [{
        value: {
          columns: data.columns || 3,
          rows: data.rows,
          gap: data.gap || 24,
          responsive: data.responsive || { mobile: 1, tablet: 2, desktop: 3 }
        }
      }];

    case 'colors':
      // Array de palettes
      if (Array.isArray(data)) {
        return data.map(item => ({
          value: {
            primary: item.primary || '#1890ff',
            secondary: item.secondary || '#52c41a',
            accent: item.accent || '#faad14',
            background: item.background || '#ffffff',
            text: item.text || '#000000'
          },
          reason: item.reason
        }));
      }
      return [{
        value: {
          primary: data.primary || '#1890ff',
          secondary: data.secondary || '#52c41a',
          accent: data.accent || '#faad14',
          background: data.background || '#ffffff',
          text: data.text || '#000000'
        }
      }];

    default:
      // Format générique
      if (Array.isArray(data)) {
        return data.map(item => ({
          value: item,
          reason: typeof item === 'object' ? item.reason : undefined
        }));
      }
      return [{ value: data }];
  }
}

/**
 * POST /api/ai/analyze-section
 * Analyse complète d'une section et propose des optimisations
 */
router.post('/analyze-section', async (req, res) => {
  try {
    const { sectionType, content, prompt } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'GEMINI_API_KEY non configurée'
      });
    }


    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Configuration pour analyse détaillée
    const generationConfig = {
      temperature: 0.7, // Moins créatif, plus factuel
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096, // Plus long pour analyse détaillée
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });

    const response = await result.response;
    const text = response.text();


    // Parser la réponse JSON
    let analysis;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Pas de JSON trouvé');
      }
    } catch (parseError) {
      console.warn('[AI Analyze] Parsing échoué, génération d\'analyse par défaut');
      analysis = generateFallbackAnalysis(sectionType, content);
    }

    // Valider et compléter l'analyse
    const validatedAnalysis = validateAnalysis(analysis);

    res.json(validatedAnalysis);

  } catch (error: any) {
    console.error('[AI Analyze] Erreur:', error);
    
    // Retourner analyse par défaut en cas d'erreur
    res.json(generateFallbackAnalysis(req.body.sectionType, req.body.content));
  }
});

/**
 * Valide et complète une analyse
 */
function validateAnalysis(analysis: any): any {
  return {
    score: analysis.score || 70,
    suggestions: Array.isArray(analysis.suggestions) 
      ? analysis.suggestions.map((s: any) => ({
          id: s.id || `suggestion-${Date.now()}-${Math.random()}`,
          category: s.category || 'design',
          type: s.type || 'improvement',
          title: s.title || 'Amélioration suggérée',
          description: s.description || 'Détails non disponibles',
          impact: s.impact || 'medium',
          changes: s.changes || {},
          preview: s.preview
        }))
      : [],
    summary: {
      strengths: Array.isArray(analysis.summary?.strengths) 
        ? analysis.summary.strengths 
        : ['Contenu présent'],
      weaknesses: Array.isArray(analysis.summary?.weaknesses)
        ? analysis.summary.weaknesses
        : ['Optimisation possible'],
      opportunities: Array.isArray(analysis.summary?.opportunities)
        ? analysis.summary.opportunities
        : ['Amélioration continue']
    }
  };
}

/**
 * Génère une analyse par défaut
 */
function generateFallbackAnalysis(sectionType: string, content: any): any {
  const itemCount = content?.values?.length || 
                    content?.stats?.length || 
                    content?.items?.length || 6;

  return {
    score: 65,
    suggestions: [
      {
        id: 'layout-optimize',
        category: 'layout',
        type: 'improvement',
        title: 'Optimiser le layout de la grille',
        description: `Avec ${itemCount} éléments, une disposition différente pourrait améliorer l'équilibre visuel.`,
        impact: 'medium',
        changes: {
          'gridLayout': {
            columns: itemCount <= 4 ? itemCount : 3,
            gap: 32,
            responsive: { mobile: 1, tablet: 2, desktop: itemCount <= 4 ? itemCount : 3 }
          }
        },
        preview: {
          before: `Layout actuel`,
          after: `Layout optimisé pour ${itemCount} éléments`
        }
      },
      {
        id: 'spacing-increase',
        category: 'design',
        type: 'improvement',
        title: 'Augmenter l\'espacement',
        description: 'Un espacement de 32px améliorerait la respiration visuelle.',
        impact: 'low',
        changes: {
          'gridLayout.gap': 32
        },
        preview: {
          before: 'Espacement standard',
          after: 'Espacement amélioré (32px)'
        }
      },
      {
        id: 'header-improve',
        category: 'content',
        type: 'improvement',
        title: 'Renforcer l\'en-tête',
        description: 'Ajouter un sous-titre explicatif renforcerait le message.',
        impact: 'medium',
        changes: {
          'sectionHeader.subtitle': `Découvrez nos ${sectionType} adaptés à vos besoins`
        }
      }
    ],
    summary: {
      strengths: [
        'Structure claire',
        'Contenu présent',
        'Design cohérent'
      ],
      weaknesses: [
        'Layout pourrait être optimisé',
        'Espacement à améliorer',
        'En-tête à renforcer'
      ],
      opportunities: [
        'Meilleure utilisation de l\'espace',
        'Plus d\'impact visuel',
        'Message plus clair'
      ]
    }
  };
}

/**
 * POST /api/ai/optimize-seo
 * Optimise le SEO d'une section
 */
router.post('/optimize-seo', async (req, res) => {
  try {
    const { content, sectionType } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'GEMINI_API_KEY non configurée'
      });
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `Tu es un expert SEO. Optimise ce contenu pour le référencement :

Section : ${sectionType}
Contenu actuel : ${JSON.stringify(content)}

Génère :
1. Meta title (max 60 caractères, optimisé SEO)
2. Meta description (max 160 caractères, incite au clic)
3. 5 mots-clés pertinents
4. Slug URL optimisé
5. Balises alt pour images (3 suggestions)

Format de réponse : JSON avec { metaTitle, metaDescription, keywords: [], slug, altTexts: [] }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parser JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const seoData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    res.json({
      success: true,
      seo: seoData
    });

  } catch (error: any) {
    console.error('[AI SEO] Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'optimisation SEO'
    });
  }
});

/**
 * POST /api/ai/improve-content
 * Améliore un contenu existant
 */
router.post('/improve-content', async (req, res) => {
  try {
    const { content, instructions } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'GEMINI_API_KEY non configurée'
      });
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `Améliore ce contenu selon les instructions suivantes :

Contenu actuel :
${JSON.stringify(content, null, 2)}

Instructions :
${instructions || 'Rendre plus engageant, professionnel et optimisé pour la conversion'}

Retourne le contenu amélioré au format JSON identique à l'original.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parser JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const improvedContent = jsonMatch ? JSON.parse(jsonMatch[0]) : content;

    res.json({
      success: true,
      improved: improvedContent,
      original: content
    });

  } catch (error: any) {
    console.error('[AI Improve] Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'amélioration du contenu'
    });
  }
});

/**
 * POST /api/ai/optimize-layout
 * Optimise le layout d'une section selon le nombre d'éléments
 */
router.post('/optimize-layout', async (req, res) => {
  try {
    const { itemCount, sectionType, currentLayout } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'GEMINI_API_KEY non configurée'
      });
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `Tu es un expert en UI/UX et design responsive.

Type de section : ${sectionType}
Nombre d'éléments : ${itemCount}
Layout actuel : ${JSON.stringify(currentLayout || {})}

Suggère 3 configurations de grille CSS optimales pour cette section.
Pour chaque configuration, explique pourquoi elle est adaptée.

Format de réponse : JSON array avec :
[
  {
    "preset": "3x2" (ou "custom"),
    "columns": 3,
    "rows": 2,
    "gap": 24,
    "responsive": {
      "mobile": 1,
      "tablet": 2,
      "desktop": 3
    },
    "reason": "Explication de pourquoi ce layout est optimal"
  }
]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parser JSON
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    let layouts = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Fallback si parsing échoue
    if (!Array.isArray(layouts) || layouts.length === 0) {
      layouts = generateFallbackLayouts(itemCount);
    }

    res.json({
      success: true,
      layouts: layouts.slice(0, 3) // Max 3 suggestions
    });

  } catch (error: any) {
    console.error('[AI Layout] Erreur:', error);
    // Fallback en cas d'erreur
    res.json({
      success: true,
      layouts: generateFallbackLayouts(req.body.itemCount || 6)
    });
  }
});

/**
 * POST /api/ai/generate-palette
 * Génère une palette de couleurs harmonieuse
 */
router.post('/generate-palette', async (req, res) => {
  try {
    const { baseColor, mood, industry } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'GEMINI_API_KEY non configurée'
      });
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `Tu es un expert en théorie des couleurs et design.

Couleur de base : ${baseColor || '#1890ff'}
Ambiance souhaitée : ${mood || 'professionnelle, moderne'}
Secteur d'activité : ${industry || 'technologie'}

Génère 3 palettes de couleurs harmonieuses avec :
- primary : couleur principale
- secondary : couleur secondaire
- accent : couleur d'accentuation
- background : couleur de fond
- text : couleur de texte
- success, warning, error : couleurs de statut

Format : JSON array avec :
[
  {
    "name": "Nom de la palette",
    "primary": "#RRGGBB",
    "secondary": "#RRGGBB",
    "accent": "#RRGGBB",
    "background": "#RRGGBB",
    "text": "#RRGGBB",
    "success": "#RRGGBB",
    "warning": "#RRGGBB",
    "error": "#RRGGBB",
    "reason": "Pourquoi cette palette est adaptée"
  }
]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parser JSON
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    let palettes = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Fallback
    if (!Array.isArray(palettes) || palettes.length === 0) {
      palettes = generateFallbackPalettes(baseColor);
    }

    res.json({
      success: true,
      palettes: palettes.slice(0, 3)
    });

  } catch (error: any) {
    console.error('[AI Palette] Erreur:', error);
    res.json({
      success: true,
      palettes: generateFallbackPalettes(req.body.baseColor || '#1890ff')
    });
  }
});

/**
 * Génère des layouts de fallback
 */
function generateFallbackLayouts(itemCount: number): any[] {
  const layouts = [];

  if (itemCount <= 3) {
    layouts.push({
      preset: '1x1',
      columns: itemCount,
      gap: 24,
      responsive: { mobile: 1, tablet: 2, desktop: itemCount },
      reason: 'Layout horizontal adapté pour peu d\'éléments'
    });
  } else if (itemCount <= 6) {
    layouts.push({
      preset: '3x2',
      columns: 3,
      rows: 2,
      gap: 24,
      responsive: { mobile: 1, tablet: 2, desktop: 3 },
      reason: 'Grille 3 colonnes équilibrée'
    });
  } else if (itemCount <= 9) {
    layouts.push({
      preset: '3x3',
      columns: 3,
      rows: 3,
      gap: 20,
      responsive: { mobile: 1, tablet: 2, desktop: 3 },
      reason: 'Grille 3x3 pour 7-9 éléments'
    });
  } else {
    layouts.push({
      preset: '4x3',
      columns: 4,
      rows: Math.ceil(itemCount / 4),
      gap: 16,
      responsive: { mobile: 1, tablet: 2, desktop: 4 },
      reason: 'Grille dense pour nombreux éléments'
    });
  }

  return layouts;
}

/**
 * Génère des palettes de fallback
 */
function generateFallbackPalettes(baseColor: string): any[] {
  return [
    {
      name: 'Palette Professionnelle',
      primary: baseColor || '#1890ff',
      secondary: '#52c41a',
      accent: '#faad14',
      background: '#ffffff',
      text: '#000000',
      success: '#52c41a',
      warning: '#faad14',
      error: '#ff4d4f',
      reason: 'Couleurs équilibrées et professionnelles'
    },
    {
      name: 'Palette Moderne',
      primary: '#722ed1',
      secondary: '#13c2c2',
      accent: '#fadb14',
      background: '#f0f2f5',
      text: '#262626',
      success: '#52c41a',
      warning: '#fa8c16',
      error: '#f5222d',
      reason: 'Design moderne avec contraste élevé'
    },
    {
      name: 'Palette Élégante',
      primary: '#2f54eb',
      secondary: '#eb2f96',
      accent: '#faad14',
      background: '#fafafa',
      text: '#141414',
      success: '#73d13d',
      warning: '#ffc53d',
      error: '#ff7875',
      reason: 'Élégance et sophistication'
    }
  ];
}

// =============================================================================
// 📐 ANALYSE D'IMAGE AVEC IA - MESURES ET EXTRACTION
// =============================================================================

import { getGeminiService } from '../services/GoogleGeminiService';

const geminiMeasureService = getGeminiService();

/**
 * POST /api/ai/measure-image
 * Analyse une image et extrait des mesures selon la configuration
 */
router.post('/measure-image', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      imageBase64,      // Image en base64 (sans le préfixe data:image/...)
      mimeType,         // Type MIME (image/jpeg, image/png, etc.)
      prompt,           // Prompt personnalisé pour l'analyse
      measureKeys,      // Clés à extraire (ex: ["largeur", "hauteur", "type"])
      nodeId,           // ID du nœud source (pour logging)
      treeId            // ID de l'arbre (pour logging)
    } = req.body;

    // Validation des paramètres requis
    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'Image base64 requise'
      });
    }

    if (!mimeType) {
      return res.status(400).json({
        success: false,
        error: 'Type MIME requis'
      });
    }

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt requis'
      });
    }

    if (!measureKeys || !Array.isArray(measureKeys) || measureKeys.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Liste des clés à extraire requise'
      });
    }


    // Appel au service Gemini Vision
    const result = await geminiMeasureService.analyzeImageForMeasures(
      imageBase64,
      mimeType,
      prompt,
      measureKeys
    );

    const duration = Date.now() - startTime;

    if (!result.success) {
      console.error(`❌ [AI Measure] Échec après ${duration}ms:`, result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Erreur lors de l\'analyse de l\'image',
        duration
      });
    }


    return res.json({
      success: true,
      measurements: result.measurements,
      rawResponse: result.rawResponse,
      metadata: {
        model: result.model,
        duration,
        nodeId,
        treeId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [AI Measure] Erreur:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur interne',
      duration
    });
  }
});

/**
 * POST /api/ai/measure-image/apply
 * Applique les mesures extraites aux champs cibles
 */
router.post('/measure-image/apply', async (req, res) => {
  try {
    const {
      measurements,     // Mesures extraites { key: value }
      mappings,         // Mappings { key, targetRef, type }[]
      treeId,
      organizationId
    } = req.body;

    if (!measurements || typeof measurements !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Mesures requises'
      });
    }

    if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Mappings requis'
      });
    }


    // Construire les mises à jour à appliquer
    const updates: Array<{ targetRef: string; value: string | number; key: string }> = [];

    for (const mapping of mappings) {
      const { key, targetRef, type } = mapping;
      const value = measurements[key];

      if (value !== undefined && value !== 'non_visible') {
        // Convertir selon le type
        let finalValue: string | number = value;
        if (type === 'number' && typeof value === 'string') {
          const parsed = parseFloat(value);
          if (!isNaN(parsed)) {
            finalValue = parsed;
          }
        }

        updates.push({
          targetRef,
          value: finalValue,
          key
        });
      }
    }


    // Retourner les mises à jour à appliquer côté client
    // (Le client utilisera l'API de mise à jour des nœuds pour chaque champ)
    return res.json({
      success: true,
      updates,
      skipped: mappings.length - updates.length,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ [AI Measure Apply] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur interne'
    });
  }
});

/**
 * GET /api/ai/measure-image/status
 * Vérifie si le service de mesure IA est disponible
 */
router.get('/measure-image/status', async (_req, res) => {
  try {
    const status = geminiMeasureService.getStatus();
    
    res.json({
      success: true,
      available: status.mode === 'live',
      service: 'Google Gemini Vision',
      model: status.model,
      mode: status.mode,
      degraded: status.degraded,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      available: false,
      error: error.message
    });
  }
});

export default router;
