/**
 * ai-moderation.ts — Service de modération IA pour le contenu social
 *
 * Utilise Google Gemini pour analyser le contenu des posts/commentaires
 * et détecter les contenus inappropriés (haine, spam, harcèlement, etc.)
 *
 * Usage :
 *   import { moderateContent } from '../services/ai-moderation';
 *   const result = await moderateContent(content, orgSettings);
 *   if (result.flagged) { // hold for review }
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '');

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export type ModerationCategory =
  | 'hate_speech'
  | 'harassment'
  | 'spam'
  | 'sexual_content'
  | 'violence'
  | 'self_harm'
  | 'illegal'
  | 'misinformation';

export interface ModerationResult {
  flagged: boolean;
  categories: ModerationCategory[];
  confidence: number;       // 0-1
  reason: string;           // Human-readable reason in FR
  aiRaw?: string;           // Raw AI response for debugging
}

interface ModerationSettings {
  moderationMode: string;   // 'disabled' | 'ai_auto' | 'ai_flag' | 'manual'
  aiBannedCategories: unknown;  // JSON array of banned categories
}

// ═══════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════

const DEFAULT_BANNED: ModerationCategory[] = [
  'hate_speech', 'harassment', 'sexual_content', 'violence', 'self_harm', 'illegal',
];

export async function moderateContent(
  content: string,
  settings: ModerationSettings,
): Promise<ModerationResult> {
  // Skip if moderation disabled
  if (!settings.moderationMode || settings.moderationMode === 'disabled' || settings.moderationMode === 'manual') {
    return { flagged: false, categories: [], confidence: 0, reason: '' };
  }

  // Skip empty content
  if (!content || content.trim().length < 3) {
    return { flagged: false, categories: [], confidence: 0, reason: '' };
  }

  // Determine banned categories
  const bannedCategories: ModerationCategory[] = Array.isArray(settings.aiBannedCategories)
    ? settings.aiBannedCategories as ModerationCategory[]
    : DEFAULT_BANNED;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Tu es un modérateur de contenu pour une plateforme professionnelle (réseau d'entreprise). Analyse le texte suivant et détermine s'il contient du contenu inapproprié.

Catégories à détecter : ${bannedCategories.join(', ')}

Texte à analyser :
"""
${content.substring(0, 2000)}
"""

Réponds UNIQUEMENT en JSON valide (pas de markdown, pas de backticks) :
{"flagged": boolean, "categories": ["category1"], "confidence": 0.0-1.0, "reason": "explication courte en français"}

Si le contenu est acceptable, retourne : {"flagged": false, "categories": [], "confidence": 0.0, "reason": ""}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    // Parse JSON response (handle markdown wrapping)
    const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      flagged: !!parsed.flagged,
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reason: parsed.reason || '',
      aiRaw: text,
    };
  } catch (error) {
    console.error('[AI-Moderation] Error:', error);
    // On failure, don't block content — flag for manual review instead
    return {
      flagged: false,
      categories: [],
      confidence: 0,
      reason: 'AI moderation unavailable',
    };
  }
}

// ═══════════════════════════════════════════════════════
// REPORT-BASED MODERATION (user signalement)
// ═══════════════════════════════════════════════════════

export async function shouldAutoHide(reportCount: number, settings: ModerationSettings): Promise<boolean> {
  // Auto-hide after 3 reports regardless of AI mode
  if (reportCount >= 3) return true;
  // In ai_auto mode, auto-hide after 1 report + AI flag
  if (settings.moderationMode === 'ai_auto' && reportCount >= 1) return true;
  return false;
}
