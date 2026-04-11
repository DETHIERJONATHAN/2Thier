/**
 * Tests unitaires pour l'enforcement des SocialSettings côté backend.
 * Couvre : getOrgSocialSettings(), DEFAULT_SETTINGS, et le mapping wax.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
vi.mock('../../../src/lib/database', () => ({
  db: {
    socialSettings: {
      findUnique: vi.fn(),
    },
  },
}));

import { db } from '../../../src/lib/database';
import { getOrgSocialSettings } from '../../../src/lib/feed-visibility';

const mockFindUnique = vi.mocked(db.socialSettings.findUnique);

describe('getOrgSocialSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns DEFAULT_SETTINGS when orgId is null', async () => {
    const settings = await getOrgSocialSettings(null);
    expect(settings.wallEnabled).toBe(true);
    expect(settings.maxPostLength).toBe(5000);
    expect(settings.waxEnabled).toBe(true);
    expect(settings.waxDefaultRadiusKm).toBe(10);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns DEFAULT_SETTINGS when no settings found in DB', async () => {
    mockFindUnique.mockResolvedValue(null);
    const settings = await getOrgSocialSettings('org-123');
    expect(settings.wallEnabled).toBe(true);
    expect(settings.waxAlertsEnabled).toBe(true);
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { organizationId: 'org-123' } });
  });

  it('merges DB settings with defaults (null-coalescing)', async () => {
    mockFindUnique.mockResolvedValue({
      wallEnabled: false,
      maxPostLength: 200,
      waxEnabled: false,
      // All other fields null → should fallback to defaults
    } as any);
    const settings = await getOrgSocialSettings('org-456');
    expect(settings.wallEnabled).toBe(false);
    expect(settings.maxPostLength).toBe(200);
    expect(settings.waxEnabled).toBe(false);
    // Fields not in DB result → defaults
    expect(settings.storiesEnabled).toBe(true);
    expect(settings.waxAlertsEnabled).toBe(true);
    expect(settings.waxDefaultRadiusKm).toBe(10);
  });

  it('respects custom wax radius from DB', async () => {
    mockFindUnique.mockResolvedValue({
      waxEnabled: true,
      waxAlertsEnabled: true,
      waxDefaultRadiusKm: 25,
    } as any);
    const settings = await getOrgSocialSettings('org-789');
    expect(settings.waxDefaultRadiusKm).toBe(25);
  });

  it('handles all boolean fields correctly', async () => {
    mockFindUnique.mockResolvedValue({
      reactionsEnabled: false,
      commentsEnabled: false,
      sharesEnabled: false,
      allowMembersPost: false,
      requirePostApproval: true,
    } as any);
    const settings = await getOrgSocialSettings('org-strict');
    expect(settings.reactionsEnabled).toBe(false);
    expect(settings.commentsEnabled).toBe(false);
    expect(settings.sharesEnabled).toBe(false);
    expect(settings.allowMembersPost).toBe(false);
    expect(settings.requirePostApproval).toBe(true);
  });
});
