/**
 * SocialIdentityContext — Carte d'identité sociale (Frontend)
 * 
 * Cache le contexte social de l'utilisateur (amis, follows, blocks, settings)
 * pour que tous les composants puissent l'utiliser sans appels API redondants.
 * 
 * Usage:
 *   const { socialContext, followColony, unfollowColony, isFollowingColony } = useSocialIdentity();
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/useAuth';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface SocialContextData {
  userId: string;
  myOrgId: string | null;
  friendCount: number;
  followedColonyCount: number;
  blockedColonyCount: number;
  followedUserCount: number;
  isSuperAdmin: boolean;
  settings: SocialSettingsData | null;
}

export interface SocialSettingsData {
  wallEnabled: boolean;
  storiesEnabled: boolean;
  reelsEnabled: boolean;
  sparksEnabled: boolean;
  battlesEnabled: boolean;
  exploreEnabled: boolean;
  hiveLiveEnabled: boolean;
  messengerEnabled: boolean;
  callsEnabled: boolean;
  defaultPostVisibility: string;
  showPublicPostsInFeed: boolean;
  showFriendsPostsInFeed: boolean;
  showFollowedColoniesInFeed: boolean;
  reactionsEnabled: boolean;
  commentsEnabled: boolean;
  sharesEnabled: boolean;
  maxPostLength: number;
  maxCommentLength: number;
  maxMediaPerPost: number;
  maxVideoSizeMB: number;
  maxImageSizeMB: number;
  allowMembersPost: boolean;
  allowMembersStory: boolean;
  allowMembersReel: boolean;
  allowMembersSpark: boolean;
  requirePostApproval: boolean;
  waxEnabled: boolean;
  waxAlertsEnabled: boolean;
  waxDefaultRadiusKm: number;
  questsEnabled: boolean;
  eventsEnabled: boolean;
  capsulesEnabled: boolean;
  orbitEnabled: boolean;
  pulseEnabled: boolean;
  moderationMode: string;
  autoPostOnDevisSigned: boolean;
  autoPostOnChantierCompleted: boolean;
}

interface SocialIdentityContextType {
  socialContext: SocialContextData | null;
  loading: boolean;
  // Colony Follow actions
  followColony: (orgId: string) => Promise<void>;
  unfollowColony: (orgId: string) => Promise<void>;
  isFollowingColony: (orgId: string) => Promise<boolean>;
  // Settings helpers
  isAppEnabled: (app: string) => boolean;
  // Refresh
  refresh: () => void;
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════

const SocialIdentityContext = createContext<SocialIdentityContextType>({
  socialContext: null,
  loading: true,
  followColony: async () => {},
  unfollowColony: async () => {},
  isFollowingColony: async () => false,
  isAppEnabled: () => true,
  refresh: () => {},
});

export function useSocialIdentity() {
  return useContext(SocialIdentityContext);
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════

export function SocialIdentityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook, [apiHook]);
  
  const [socialContext, setSocialContext] = useState<SocialContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load social context
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.api.get('/social-settings/context/me');
        if (!cancelled) {
          setSocialContext(data);
        }
      } catch (error) {
        console.error('[SocialIdentity] Error loading context:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user?.id, api.api, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const followColony = useCallback(async (orgId: string) => {
    try {
      await api.api.post(`/social-settings/org-follow/${orgId}`);
      refresh();
    } catch (error) {
      console.error('[SocialIdentity] Error following colony:', error);
      throw error;
    }
  }, [api.api, refresh]);

  const unfollowColony = useCallback(async (orgId: string) => {
    try {
      await api.api.delete(`/social-settings/org-follow/${orgId}`);
      refresh();
    } catch (error) {
      console.error('[SocialIdentity] Error unfollowing colony:', error);
      throw error;
    }
  }, [api.api, refresh]);

  const isFollowingColony = useCallback(async (orgId: string): Promise<boolean> => {
    try {
      const data = await api.api.get(`/social-settings/org-follow/count/${orgId}`);
      return data.isFollowing;
    } catch {
      return false;
    }
  }, [api.api]);

  const isAppEnabled = useCallback((app: string): boolean => {
    if (!socialContext?.settings) return true; // Default to enabled if no settings
    const s = socialContext.settings;
    const appMap: Record<string, boolean> = {
      wall: s.wallEnabled,
      stories: s.storiesEnabled,
      reels: s.reelsEnabled,
      sparks: s.sparksEnabled,
      battles: s.battlesEnabled,
      explore: s.exploreEnabled,
      hiveLive: s.hiveLiveEnabled,
      messenger: s.messengerEnabled,
      calls: s.callsEnabled,
      reactions: s.reactionsEnabled,
      comments: s.commentsEnabled,
      shares: s.sharesEnabled,
      wax: s.waxEnabled ?? true,
      quests: s.questsEnabled ?? true,
      events: s.eventsEnabled ?? true,
      capsules: s.capsulesEnabled ?? true,
      orbit: s.orbitEnabled ?? true,
      pulse: s.pulseEnabled ?? true,
    };
    return appMap[app] ?? true;
  }, [socialContext?.settings]);

  const value = useMemo(() => ({
    socialContext,
    loading,
    followColony,
    unfollowColony,
    isFollowingColony,
    isAppEnabled,
    refresh,
  }), [socialContext, loading, followColony, unfollowColony, isFollowingColony, isAppEnabled, refresh]);

  return (
    <SocialIdentityContext.Provider value={value}>
      {children}
    </SocialIdentityContext.Provider>
  );
}
