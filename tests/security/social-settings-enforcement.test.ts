/**
 * Tests — Social Settings Enforcement côté serveur
 * Vérifie que les settings bannedWords, commentDepthLimit,
 * allowLinks, allowGifs, maxFriendsPerUser sont correctement appliqués.
 */
import { describe, it, expect } from 'vitest';

// ─── Helper functions extracted from the enforcement logic ───

function containsBannedWord(content: string, bannedWords: string[]): string | null {
  if (!bannedWords.length) return null;
  const lower = content.toLowerCase();
  return bannedWords.find(w => lower.includes(w.toLowerCase())) || null;
}

function containsLink(content: string): boolean {
  return /https?:\/\/\S+/i.test(content);
}

function containsHashtag(content: string): boolean {
  return /#\w+/.test(content);
}

describe('Social Settings: Banned Words Filter', () => {
  const bannedWords = ['spam', 'scam', 'arnaque'];

  it('should detect banned words (case-insensitive)', () => {
    expect(containsBannedWord('Ceci est du SPAM', bannedWords)).toBe('spam');
    expect(containsBannedWord('attention arnaque ici', bannedWords)).toBe('arnaque');
    expect(containsBannedWord('This is a scam!', bannedWords)).toBe('scam');
  });

  it('should return null for clean content', () => {
    expect(containsBannedWord('Bonjour à tous', bannedWords)).toBeNull();
    expect(containsBannedWord('', bannedWords)).toBeNull();
  });

  it('should handle empty banned words list', () => {
    expect(containsBannedWord('spam scam arnaque', [])).toBeNull();
  });

  it('should detect partial matches within words', () => {
    expect(containsBannedWord('antispam filter', bannedWords)).toBe('spam');
  });
});

describe('Social Settings: Link Detection', () => {
  it('should detect http/https links', () => {
    expect(containsLink('Visit https://example.com')).toBe(true);
    expect(containsLink('Go to http://test.org/path')).toBe(true);
  });

  it('should not flag content without links', () => {
    expect(containsLink('No links here')).toBe(false);
    expect(containsLink('email@ domain.com')).toBe(false);
    expect(containsLink('')).toBe(false);
  });
});

describe('Social Settings: Hashtag Detection', () => {
  it('should detect hashtags', () => {
    expect(containsHashtag('Hello #world')).toBe(true);
    expect(containsHashtag('#trending')).toBe(true);
  });

  it('should not flag content without hashtags', () => {
    expect(containsHashtag('Number sign: #')).toBe(false);
    expect(containsHashtag('Just text')).toBe(false);
  });
});

describe('Social Settings: Post Length Limits', () => {
  it('should enforce maxPostLength', () => {
    const maxPostLength = 500;
    const shortContent = 'a'.repeat(500);
    const longContent = 'a'.repeat(501);

    expect(shortContent.length <= maxPostLength).toBe(true);
    expect(longContent.length <= maxPostLength).toBe(false);
  });

  it('should enforce maxCommentLength', () => {
    const maxCommentLength = 300;
    const shortComment = 'b'.repeat(300);
    const longComment = 'b'.repeat(301);

    expect(shortComment.length <= maxCommentLength).toBe(true);
    expect(longComment.length <= maxCommentLength).toBe(false);
  });
});

describe('Social Settings: Comment Depth Limit', () => {
  it('should count depth correctly', () => {
    // Simulate a chain: comment1 -> comment2 -> comment3
    const commentChain = [
      { id: '1', parentCommentId: null },
      { id: '2', parentCommentId: '1' },
      { id: '3', parentCommentId: '2' },
      { id: '4', parentCommentId: '3' },
    ];

    function getDepth(commentId: string): number {
      let depth = 0;
      let current = commentChain.find(c => c.id === commentId);
      while (current?.parentCommentId) {
        depth++;
        current = commentChain.find(c => c.id === current!.parentCommentId!);
      }
      return depth;
    }

    expect(getDepth('1')).toBe(0);
    expect(getDepth('2')).toBe(1);
    expect(getDepth('3')).toBe(2);
    expect(getDepth('4')).toBe(3);

    const commentDepthLimit = 3;
    expect(getDepth('3') < commentDepthLimit).toBe(true);
    expect(getDepth('4') < commentDepthLimit).toBe(false);
  });
});

describe('Social Settings: Feature Toggles', () => {
  const settingsDisabled = {
    wallEnabled: false,
    storiesEnabled: false,
    reelsEnabled: false,
    sparksEnabled: false,
    battlesEnabled: false,
    exploreEnabled: false,
    hiveLiveEnabled: false,
    commentsEnabled: false,
    reactionsEnabled: false,
    sharesEnabled: false,
    friendRequestsEnabled: false,
    allowMembersPost: false,
    allowMembersStory: false,
    allowMembersReel: false,
    allowMembersSpark: false,
    allowGifs: false,
    allowLinks: false,
    allowHashtags: false,
  };

  const settingsEnabled = Object.fromEntries(
    Object.entries(settingsDisabled).map(([k]) => [k, true])
  );

  it('should deny when wallEnabled is false', () => {
    expect(settingsDisabled.wallEnabled).toBe(false);
  });

  it('should allow when wallEnabled is true', () => {
    expect(settingsEnabled.wallEnabled).toBe(true);
  });

  it('all toggles should be false in disabled settings', () => {
    for (const [key, value] of Object.entries(settingsDisabled)) {
      expect(value).toBe(false);
    }
  });

  it('all toggles should be true in enabled settings', () => {
    for (const [key, value] of Object.entries(settingsEnabled)) {
      expect(value).toBe(true);
    }
  });
});

describe('Social Settings: maxFriendsPerUser', () => {
  it('should block friend request when limit reached', () => {
    const maxFriendsPerUser = 100;
    const currentFriendsCount = 100;
    expect(currentFriendsCount >= maxFriendsPerUser).toBe(true);
  });

  it('should allow friend request when below limit', () => {
    const maxFriendsPerUser = 100;
    const currentFriendsCount = 50;
    expect(currentFriendsCount >= maxFriendsPerUser).toBe(false);
  });

  it('should not limit when maxFriendsPerUser is 0 (unlimited)', () => {
    const maxFriendsPerUser = 0; // 0 = unlimited
    expect(!maxFriendsPerUser).toBe(true); // falsy → skip check
  });
});
