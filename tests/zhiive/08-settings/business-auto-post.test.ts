/**
 * Tests unitaires pour le service business-auto-post.
 * Vérifie que les auto-posts sont créés uniquement quand le setting est activé.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
vi.mock('../../../src/lib/database', () => {
  return {
    db: {
      wallPost: { create: vi.fn() },
      user: { findMany: vi.fn().mockResolvedValue([]) },
      organization: { findUnique: vi.fn().mockResolvedValue({ name: 'Test Org' }) },
      socialSettings: { findUnique: vi.fn() },
    },
  };
});

// Mock feed-visibility
vi.mock('../../../src/lib/feed-visibility', () => ({
  getOrgSocialSettings: vi.fn(),
}));

// Mock push
vi.mock('../../../src/routes/push', () => ({
  sendPushToUser: vi.fn(),
}));

import { db } from '../../../src/lib/database';
import { getOrgSocialSettings } from '../../../src/lib/feed-visibility';
import { createBusinessAutoPost } from '../../../src/services/business-auto-post';

const mockCreate = vi.mocked(db.wallPost.create);
const mockGetSettings = vi.mocked(getOrgSocialSettings);

describe('createBusinessAutoPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ id: 'post-1' } as any);
  });

  it('does nothing when the relevant setting is disabled', async () => {
    mockGetSettings.mockResolvedValue({
      autoPostOnDevisSigned: false,
      autoPostDefaultVisibility: 'IN',
    } as any);

    const result = await createBusinessAutoPost({
      orgId: 'org-1',
      userId: 'user-1',
      eventType: 'devis_signed',
      entityLabel: 'Devis #001',
    });

    expect(result.created).toBe(0);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates 2 posts (IN + ALL) when enabled without targetLeadId', async () => {
    mockGetSettings.mockResolvedValue({
      autoPostOnDevisSigned: true,
      autoPostDefaultVisibility: 'IN',
    } as any);

    const result = await createBusinessAutoPost({
      orgId: 'org-1',
      userId: 'user-1',
      eventType: 'devis_signed',
      entityLabel: 'Devis #001',
      clientName: 'M. Dupont',
    });

    // 2 posts: IN + ALL (no CLIENT post without targetLeadId)
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.postIds).toHaveLength(2);
  });

  it('creates 3 posts when targetLeadId is provided', async () => {
    mockGetSettings.mockResolvedValue({
      autoPostOnDevisSigned: true,
      autoPostDefaultVisibility: 'ALL',
    } as any);

    const result = await createBusinessAutoPost({
      orgId: 'org-1',
      userId: 'user-1',
      eventType: 'devis_signed',
      entityLabel: 'Devis #001',
      targetLeadId: 'lead-1',
      clientName: 'M. Dupont',
    });

    expect(mockCreate).toHaveBeenCalledTimes(3); // CLIENT + IN + ALL
    expect(result.postIds).toHaveLength(3);
  });

  it('maps event types to correct settings (disabled = no posts)', async () => {
    const eventMap = [
      { eventType: 'invoice_paid', settingKey: 'autoPostOnInvoicePaid' },
      { eventType: 'chantier_created', settingKey: 'autoPostOnChantierCreated' },
      { eventType: 'chantier_completed', settingKey: 'autoPostOnChantierCompleted' },
      { eventType: 'new_client', settingKey: 'autoPostOnNewClient' },
      { eventType: 'calendar_event', settingKey: 'autoPostOnCalendarEvent' },
      { eventType: 'task_completed', settingKey: 'autoPostOnTaskCompleted' },
    ] as const;

    for (const { eventType, settingKey } of eventMap) {
      vi.clearAllMocks();
      
      mockGetSettings.mockResolvedValue({
        [settingKey]: false,
        autoPostDefaultVisibility: 'IN',
      } as any);
      
      const result = await createBusinessAutoPost({
        orgId: 'org-1',
        userId: 'user-1',
        eventType: eventType as any,
        entityLabel: 'Test',
      });
      
      expect(result.created).toBe(0);
      expect(mockCreate).not.toHaveBeenCalled();
    }
  });

  it('propagates errors (caller should .catch())', async () => {
    mockGetSettings.mockRejectedValue(new Error('DB down'));

    await expect(
      createBusinessAutoPost({
        orgId: 'org-1',
        userId: 'user-1',
        eventType: 'devis_signed',
        entityLabel: 'Test',
      })
    ).rejects.toThrow('DB down');
  });
});
