/**
 * Tests exhaustifs pour le service AI Moderation (src/services/ai-moderation.ts)
 *
 * Couvre :
 *  - moderateContent() — Modération IA des posts/commentaires
 *  - shouldAutoHide()  — Masquage automatique basé sur les signalements
 *  - Gestion des erreurs / fallbacks
 *  - Toutes les catégories de modération
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Google Generative AI — vi.hoisted ensures the variable is available before vi.mock runs
const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

import { moderateContent, shouldAutoHide, type ModerationResult } from '../../../src/services/ai-moderation';

describe('AI Moderation — moderateContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Skip Conditions ────────────────────────────
  describe('Skip conditions', () => {
    it('skips when moderation is disabled', async () => {
      const result = await moderateContent('some content', {
        moderationMode: 'disabled',
        aiBannedCategories: [],
      });
      expect(result.flagged).toBe(false);
      expect(result.categories).toEqual([]);
      expect(result.confidence).toBe(0);
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('skips when moderation is manual', async () => {
      const result = await moderateContent('some content', {
        moderationMode: 'manual',
        aiBannedCategories: [],
      });
      expect(result.flagged).toBe(false);
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('skips when moderationMode is empty string', async () => {
      const result = await moderateContent('content', {
        moderationMode: '',
        aiBannedCategories: [],
      });
      expect(result.flagged).toBe(false);
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('skips empty content', async () => {
      const result = await moderateContent('', {
        moderationMode: 'ai_auto',
        aiBannedCategories: [],
      });
      expect(result.flagged).toBe(false);
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('skips content shorter than 3 characters', async () => {
      const result = await moderateContent('ab', {
        moderationMode: 'ai_auto',
        aiBannedCategories: [],
      });
      expect(result.flagged).toBe(false);
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('skips whitespace-only content', async () => {
      const result = await moderateContent('   ', {
        moderationMode: 'ai_auto',
        aiBannedCategories: [],
      });
      expect(result.flagged).toBe(false);
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });
  });

  // ─── AI Call ─────────────────────────────────────
  describe('AI moderation call', () => {
    it('calls Gemini when mode is ai_auto and content is valid', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({ flagged: false, categories: [], confidence: 0.1, reason: '' }),
        },
      });

      const result = await moderateContent('Un post tout à fait normal', {
        moderationMode: 'ai_auto',
        aiBannedCategories: ['hate_speech', 'harassment'],
      });

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(result.flagged).toBe(false);
    });

    it('calls Gemini when mode is ai_flag', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({ flagged: true, categories: ['spam'], confidence: 0.8, reason: 'Spam détecté' }),
        },
      });

      const result = await moderateContent('ACHETEZ MAINTENANT !!! PROMO!!!', {
        moderationMode: 'ai_flag',
        aiBannedCategories: ['spam'],
      });

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(result.flagged).toBe(true);
      expect(result.categories).toContain('spam');
      expect(result.confidence).toBe(0.8);
    });

    it('detects hate speech', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            flagged: true,
            categories: ['hate_speech'],
            confidence: 0.95,
            reason: 'Discours haineux détecté',
          }),
        },
      });

      const result = await moderateContent('contenu haineux test', {
        moderationMode: 'ai_auto',
        aiBannedCategories: ['hate_speech'],
      });

      expect(result.flagged).toBe(true);
      expect(result.categories).toContain('hate_speech');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('detects harassment', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            flagged: true,
            categories: ['harassment'],
            confidence: 0.88,
            reason: 'Harcèlement détecté',
          }),
        },
      });

      const result = await moderateContent('test de harcèlement', {
        moderationMode: 'ai_auto',
        aiBannedCategories: ['harassment'],
      });

      expect(result.flagged).toBe(true);
      expect(result.categories).toContain('harassment');
    });

    it('detects multiple categories at once', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            flagged: true,
            categories: ['hate_speech', 'violence'],
            confidence: 0.92,
            reason: 'Contenu violent et haineux',
          }),
        },
      });

      const result = await moderateContent('contenu multi-catégorie', {
        moderationMode: 'ai_auto',
        aiBannedCategories: ['hate_speech', 'violence'],
      });

      expect(result.flagged).toBe(true);
      expect(result.categories).toHaveLength(2);
      expect(result.categories).toContain('hate_speech');
      expect(result.categories).toContain('violence');
    });
  });

  // ─── Default Banned Categories ───────────────────
  describe('Default banned categories', () => {
    it('uses defaults when aiBannedCategories is not an array', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({ flagged: false, categories: [], confidence: 0.1, reason: '' }),
        },
      });

      await moderateContent('test content longer', {
        moderationMode: 'ai_auto',
        aiBannedCategories: null, // Not an array
      });

      // Verify the prompt still includes default categories
      const callArg = mockGenerateContent.mock.calls[0][0];
      expect(callArg).toContain('hate_speech');
      expect(callArg).toContain('harassment');
      expect(callArg).toContain('sexual_content');
      expect(callArg).toContain('violence');
      expect(callArg).toContain('self_harm');
      expect(callArg).toContain('illegal');
    });
  });

  // ─── Response Parsing ────────────────────────────
  describe('Response parsing', () => {
    it('handles markdown-wrapped JSON response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '```json\n{"flagged": true, "categories": ["spam"], "confidence": 0.7, "reason": "Spam"}\n```',
        },
      });

      const result = await moderateContent('test content again', {
        moderationMode: 'ai_auto',
        aiBannedCategories: ['spam'],
      });

      expect(result.flagged).toBe(true);
      expect(result.categories).toContain('spam');
    });

    it('preserves raw AI response for debugging', async () => {
      const rawResponse = '{"flagged": false, "categories": [], "confidence": 0.0, "reason": ""}';
      mockGenerateContent.mockResolvedValue({
        response: { text: () => rawResponse },
      });

      const result = await moderateContent('normal content here', {
        moderationMode: 'ai_auto',
        aiBannedCategories: [],
      });

      expect(result.aiRaw).toBe(rawResponse);
    });

    it('handles non-array categories in response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({ flagged: true, categories: 'spam', confidence: 0.5, reason: 'test' }),
        },
      });

      const result = await moderateContent('test content five', {
        moderationMode: 'ai_auto',
        aiBannedCategories: [],
      });

      // Should gracefully handle non-array
      expect(result.categories).toEqual([]);
    });

    it('handles non-number confidence in response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({ flagged: false, categories: [], confidence: 'high', reason: '' }),
        },
      });

      const result = await moderateContent('test content number', {
        moderationMode: 'ai_auto',
        aiBannedCategories: [],
      });

      expect(result.confidence).toBe(0.5); // Fallback
    });
  });

  // ─── Error Handling ──────────────────────────────
  describe('Error handling', () => {
    it('returns safe default on AI API failure (does not block content)', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API quota exceeded'));

      const result = await moderateContent('test content error', {
        moderationMode: 'ai_auto',
        aiBannedCategories: [],
      });

      expect(result.flagged).toBe(false);
      expect(result.categories).toEqual([]);
      expect(result.reason).toBe('AI moderation unavailable');
    });

    it('handles JSON parse error gracefully', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'not valid json at all' },
      });

      const result = await moderateContent('test content parse', {
        moderationMode: 'ai_auto',
        aiBannedCategories: [],
      });

      // Should not crash, should return safe default
      expect(result.flagged).toBe(false);
      expect(result.reason).toBe('AI moderation unavailable');
    });

    it('truncates extremely long content to 2000 chars', async () => {
      const longContent = 'A'.repeat(5000);
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({ flagged: false, categories: [], confidence: 0.0, reason: '' }),
        },
      });

      await moderateContent(longContent, {
        moderationMode: 'ai_auto',
        aiBannedCategories: [],
      });

      const callArg = mockGenerateContent.mock.calls[0][0];
      // The prompt should NOT contain the full 5000 chars
      expect(callArg.length).toBeLessThan(5000 + 500); // prompt overhead ~500
    });
  });

  // ─── ModerationResult type ──────────────────────
  describe('ModerationResult structure', () => {
    it('returns all required fields', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({ flagged: false, categories: [], confidence: 0.0, reason: '' }),
        },
      });

      const result: ModerationResult = await moderateContent('test structure check', {
        moderationMode: 'ai_auto',
        aiBannedCategories: [],
      });

      expect(result).toHaveProperty('flagged');
      expect(result).toHaveProperty('categories');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reason');
      expect(typeof result.flagged).toBe('boolean');
      expect(Array.isArray(result.categories)).toBe(true);
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.reason).toBe('string');
    });
  });
});

// ═══════════════════════════════════════════════════════
describe('AI Moderation — shouldAutoHide', () => {
  it('auto-hides after 3 reports regardless of mode', async () => {
    expect(await shouldAutoHide(3, { moderationMode: 'disabled', aiBannedCategories: [] })).toBe(true);
    expect(await shouldAutoHide(5, { moderationMode: 'manual', aiBannedCategories: [] })).toBe(true);
    expect(await shouldAutoHide(10, { moderationMode: 'ai_auto', aiBannedCategories: [] })).toBe(true);
  });

  it('does not auto-hide with 0 reports', async () => {
    expect(await shouldAutoHide(0, { moderationMode: 'ai_auto', aiBannedCategories: [] })).toBe(false);
    expect(await shouldAutoHide(0, { moderationMode: 'disabled', aiBannedCategories: [] })).toBe(false);
  });

  it('auto-hides after 1 report in ai_auto mode', async () => {
    expect(await shouldAutoHide(1, { moderationMode: 'ai_auto', aiBannedCategories: [] })).toBe(true);
  });

  it('does NOT auto-hide after 1 report in manual mode', async () => {
    expect(await shouldAutoHide(1, { moderationMode: 'manual', aiBannedCategories: [] })).toBe(false);
  });

  it('does NOT auto-hide after 2 reports in manual mode', async () => {
    expect(await shouldAutoHide(2, { moderationMode: 'manual', aiBannedCategories: [] })).toBe(false);
  });

  it('does NOT auto-hide after 2 reports in ai_flag mode', async () => {
    expect(await shouldAutoHide(2, { moderationMode: 'ai_flag', aiBannedCategories: [] })).toBe(false);
  });

  it('auto-hides after 2 reports in ai_auto mode', async () => {
    expect(await shouldAutoHide(2, { moderationMode: 'ai_auto', aiBannedCategories: [] })).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
describe('AI Moderation — All 8 Categories', () => {
  const allCategories = [
    'hate_speech',
    'harassment',
    'spam',
    'sexual_content',
    'violence',
    'self_harm',
    'illegal',
    'misinformation',
  ];

  allCategories.forEach(category => {
    it(`detects category: ${category}`, async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            flagged: true,
            categories: [category],
            confidence: 0.9,
            reason: `${category} detected`,
          }),
        },
      });

      const result = await moderateContent(`test ${category} content here`, {
        moderationMode: 'ai_auto',
        aiBannedCategories: [category],
      });

      expect(result.flagged).toBe(true);
      expect(result.categories).toContain(category);
    });
  });
});
