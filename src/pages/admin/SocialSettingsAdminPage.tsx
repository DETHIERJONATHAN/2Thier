import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card, Switch, InputNumber, Select, Tag, Alert, Tabs,
  Spin, Empty, Button, Popconfirm, Tooltip,
} from 'antd';
import {
  SettingOutlined, EyeOutlined, TeamOutlined, BellOutlined,
  SafetyOutlined, BarChartOutlined, ThunderboltOutlined,
  GlobalOutlined, MessageOutlined, HeartOutlined,
  PictureOutlined, FileTextOutlined, FireOutlined, CompassOutlined,
  LockOutlined, UserOutlined, BlockOutlined, SoundOutlined,
  CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined,
  EnvironmentOutlined, RobotOutlined, ShopOutlined,
  AuditOutlined, UndoOutlined, DeleteOutlined,
  RadarChartOutlined, ExperimentOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

import { SF } from '../../components/zhiive/ZhiiveTheme';

// ── Responsive Hook ──
function useScreenSize() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return { width: w, isMobile: w < 768, isTablet: w < 1024 };
}

// ── Design Tokens ──
const FB = {
  bg: '#f0f2f5', white: '#ffffff', text: '#050505', textSecondary: '#65676b',
  blue: '#1877f2', blueHover: '#166fe5', border: '#ced0d4',
  green: '#42b72a', red: '#e4405f', orange: '#f7931a', purple: SF.primary,
  shadow: '0 1px 2px rgba(0,0,0,0.1)', radius: 8,
};

// ── Section Component ──
interface SettingSectionProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SettingSection({ icon, title, description, children }: SettingSectionProps) {
  return (
    <Card
      style={{ marginBottom: 16, borderRadius: FB.radius, border: `1px solid ${FB.border}` }}
      bodyStyle={{ padding: '12px 12px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: description ? 4 : 12 }}>
        <span style={{ fontSize: 18, color: FB.purple }}>{icon}</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: FB.text }}>{title}</span>
      </div>
      {description && (
        <p style={{ color: FB.textSecondary, fontSize: 13, margin: '0 0 12px 0' }}>{description}</p>
      )}
      <div>{children}</div>
    </Card>
  );
}

// ── Setting Row ──
interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  indent?: boolean;
}

function SettingRow({ label, description, children, indent }: SettingRowProps) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: `1px solid ${FB.border}22`,
      marginLeft: indent ? 16 : 0, gap: 8,
    }}>
      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
        <div style={{ fontSize: 14, color: FB.text, fontWeight: 500 }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: FB.textSecondary, marginTop: 2 }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ── Types ──
interface SocialSettingsData {
  id: string;
  organizationId: string;
  // Apps
  wallEnabled: boolean;
  storiesEnabled: boolean;
  reelsEnabled: boolean;
  sparksEnabled: boolean;
  battlesEnabled: boolean;
  exploreEnabled: boolean;
  hiveLiveEnabled: boolean;
  messengerEnabled: boolean;
  callsEnabled: boolean;
  // Feed
  defaultPostVisibility: string;
  allowMembersPost: boolean;
  allowMembersStory: boolean;
  allowMembersReel: boolean;
  allowMembersSpark: boolean;
  requirePostApproval: boolean;
  showPublicPostsInFeed: boolean;
  showFriendsPostsInFeed: boolean;
  showFollowedColoniesInFeed: boolean;
  // Content
  maxPostLength: number;
  maxCommentLength: number;
  maxMediaPerPost: number;
  maxVideoSizeMB: number;
  maxImageSizeMB: number;
  allowGifs: boolean;
  allowLinks: boolean;
  allowHashtags: boolean;
  profanityFilterEnabled: boolean;
  // Interactions
  reactionsEnabled: boolean;
  commentsEnabled: boolean;
  sharesEnabled: boolean;
  commentDepthLimit: number;
  // Follow
  allowFollowColony: boolean;
  autoFollowOnJoin: boolean;
  friendRequestsEnabled: boolean;
  maxFriendsPerUser: number;
  allowBlockColony: boolean;
  // Privacy
  showMemberList: boolean;
  showMemberCount: boolean;
  profileVisibility: string;
  // Notifications
  notifyOnNewPost: boolean;
  notifyOnComment: boolean;
  notifyOnReaction: boolean;
  notifyOnNewFollower: boolean;
  notifyOnFriendRequest: boolean;
  notifyOnMention: boolean;
  // Analytics
  showPostAnalytics: boolean;
  showProfileViews: boolean;
  // Wax
  waxEnabled: boolean;
  waxAlertsEnabled: boolean;
  waxDefaultRadiusKm: number;
  waxGhostModeAllowed: boolean;
  // Nectar sub-apps
  questsEnabled: boolean;
  eventsEnabled: boolean;
  capsulesEnabled: boolean;
  orbitEnabled: boolean;
  pulseEnabled: boolean;
  // Moderation IA
  moderationMode: string;
  aiBannedCategories: string[];
  // Business → Social
  autoPostOnDevisSigned: boolean;
  autoPostOnInvoicePaid: boolean;
  autoPostOnChantierCreated: boolean;
  autoPostOnChantierCompleted: boolean;
  autoPostOnNewClient: boolean;
  autoPostOnCalendarEvent: boolean;
  autoPostOnTaskCompleted: boolean;
  autoPostDefaultVisibility: string;
  // RGPD
  gdprDataExportEnabled: boolean;
  gdprRetentionDays: number;
  // Advanced
  customReactions: any;
  bannedWords: string[];
  pinnedPostsLimit: number;
  autoArchiveDays: number;
}

interface OrgOption {
  id: string;
  name: string;
  logoUrl?: string;
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function SocialSettingsAdminPage() {
  const { isSuperAdmin, currentOrganization } = useAuth();
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook, [apiHook]);
  const { isMobile, isTablet } = useScreenSize();

  const [settings, setSettings] = useState<SocialSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [allOrgs, setAllOrgs] = useState<OrgOption[]>([]);
  const [_orgStats, setOrgStats] = useState<Record<string, any>>({});
  const [_dirty, setDirty] = useState(false);

  // Determine which org to load settings for
  const targetOrgId = useMemo(() => {
    if (isSuperAdmin && selectedOrgId) return selectedOrgId;
    return currentOrganization?.id || null;
  }, [isSuperAdmin, selectedOrgId, currentOrganization]);

  // Load all organizations for super admin selector
  const loadOrgs = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const data = await api.api.get('/social-settings/all');
      const orgs: OrgOption[] = [
        ...data.settings.map((s: any) => s.organization),
        ...data.orgsWithoutSettings,
      ].sort((a: OrgOption, b: OrgOption) => a.name.localeCompare(b.name));
      setAllOrgs(orgs);
      
      // Build stats map
      const stats: Record<string, any> = {};
      data.settings.forEach((s: any) => {
        stats[s.organizationId] = {
          wallEnabled: s.wallEnabled,
          storiesEnabled: s.storiesEnabled,
          reelsEnabled: s.reelsEnabled,
        };
      });
      setOrgStats(stats);

      // Auto-select first org if none selected
      if (!selectedOrgId && orgs.length > 0) {
        setSelectedOrgId(orgs[0].id);
      }
    } catch (error) {
      console.error('Error loading orgs:', error);
    }
  }, [api.api, isSuperAdmin, selectedOrgId]);

  // Load settings for the target org
  const loadSettings = useCallback(async () => {
    if (!targetOrgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.api.get(`/social-settings/${targetOrgId}`);
      setSettings(data);
      setDirty(false);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, [api.api, targetOrgId]);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);
  useEffect(() => { loadSettings(); }, [loadSettings]);

  // Update a single setting
  const updateSetting = useCallback(async (key: string, value: any) => {
    if (!settings || !targetOrgId) return;
    
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setDirty(true);
    setSaving(true);

    try {
      await api.api.put(`/social-settings/${targetOrgId}`, { [key]: value });
    } catch (error) {
      console.error('Error saving:', error);
      // Revert on error
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  }, [api.api, settings, targetOrgId]);

  // Reset a section to its defaults
  const SECTION_DEFAULTS: Record<string, Record<string, any>> = {
    apps: { wallEnabled: true, storiesEnabled: true, reelsEnabled: true, sparksEnabled: true, battlesEnabled: true, exploreEnabled: true, hiveLiveEnabled: true, messengerEnabled: true, callsEnabled: true },
    nectar: { questsEnabled: true, eventsEnabled: true, capsulesEnabled: true, orbitEnabled: true, pulseEnabled: true },
    wax: { waxEnabled: true, waxAlertsEnabled: true, waxDefaultRadiusKm: 10, waxGhostModeAllowed: true },
    whisper: { messengerEnabled: true, callsEnabled: true },
    feed: { defaultPostVisibility: 'IN', allowMembersPost: true, allowMembersStory: true, allowMembersReel: true, allowMembersSpark: false, requirePostApproval: false, showPublicPostsInFeed: true, showFriendsPostsInFeed: true, showFollowedColoniesInFeed: true },
    content: { maxPostLength: 5000, maxCommentLength: 2000, maxMediaPerPost: 10, maxVideoSizeMB: 100, maxImageSizeMB: 10, allowGifs: true, allowLinks: true, allowHashtags: true, pinnedPostsLimit: 3, autoArchiveDays: 0 },
    moderation: { profanityFilterEnabled: false, moderationMode: 'ai_auto', aiBannedCategories: [], bannedWords: [] },
    interactions: { reactionsEnabled: true, commentsEnabled: true, sharesEnabled: true, commentDepthLimit: 3 },
    follow: { allowFollowColony: true, autoFollowOnJoin: true, friendRequestsEnabled: true, maxFriendsPerUser: 5000, allowBlockColony: true },
    privacy: { showMemberList: true, showMemberCount: true, profileVisibility: 'public' },
    notifications: { notifyOnNewPost: true, notifyOnComment: true, notifyOnReaction: false, notifyOnNewFollower: true, notifyOnFriendRequest: true, notifyOnMention: true },
    business: { autoPostOnDevisSigned: true, autoPostOnInvoicePaid: false, autoPostOnChantierCreated: true, autoPostOnChantierCompleted: true, autoPostOnNewClient: false, autoPostOnCalendarEvent: false, autoPostOnTaskCompleted: false, autoPostDefaultVisibility: 'IN' },
    rgpd: { gdprDataExportEnabled: true, gdprRetentionDays: 0 },
    analytics: { showPostAnalytics: false, showProfileViews: false },
  };

  const resetSection = useCallback(async (section: string) => {
    if (!settings || !targetOrgId) return;
    const defaults = SECTION_DEFAULTS[section];
    if (!defaults) return;
    const newSettings = { ...settings, ...defaults };
    setSettings(newSettings);
    setSaving(true);
    try {
      await api.api.put(`/social-settings/${targetOrgId}`, defaults);
    } catch (error) {
      console.error('Error resetting:', error);
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  }, [api.api, settings, targetOrgId]);

  const resetAll = useCallback(async () => {
    if (!settings || !targetOrgId) return;
    const allDefaults = Object.values(SECTION_DEFAULTS).reduce((acc, d) => ({ ...acc, ...d }), {});
    const newSettings = { ...settings, ...allDefaults };
    setSettings(newSettings);
    setSaving(true);
    try {
      await api.api.put(`/social-settings/${targetOrgId}`, allDefaults);
    } catch (error) {
      console.error('Error resetting all:', error);
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  }, [api.api, settings, targetOrgId]);

  // ─── RENDER ───
  if (!isSuperAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <LockOutlined style={{ fontSize: 48, color: FB.textSecondary }} />
        <h2 style={{ color: FB.text, marginTop: 16 }}>Accès réservé</h2>
        <p style={{ color: FB.textSecondary }}>Cette page est réservée aux administrateurs.</p>
      </div>
    );
  }

  if (loading && !settings) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  const selectedOrg = allOrgs.find(o => o.id === targetOrgId);

  // ═══ LIVE PREVIEW COMPONENT ═══
  const LivePreview = () => {
    if (!settings) return null;
    const enabledApps = [
      settings.wallEnabled && 'Wall',
      settings.storiesEnabled && 'Stories',
      settings.reelsEnabled && 'Reels',
      settings.sparksEnabled && 'Sparks',
      settings.battlesEnabled && 'Battles',
      settings.exploreEnabled && 'Friends',
      settings.hiveLiveEnabled && 'HiveLive',
      (settings as any).waxEnabled && 'Wax',
    ].filter(Boolean);

    const disabledApps = [
      !settings.wallEnabled && 'Wall',
      !settings.storiesEnabled && 'Stories',
      !settings.reelsEnabled && 'Reels',
      !settings.sparksEnabled && 'Sparks',
      !settings.battlesEnabled && 'Battles',
      !settings.exploreEnabled && 'Friends',
      !settings.hiveLiveEnabled && 'HiveLive',
      !(settings as any).waxEnabled && 'Wax',
    ].filter(Boolean);

    return (
      <div style={{
        position: 'sticky', top: 24,
        background: FB.white,
        borderRadius: FB.radius,
        border: `1px solid ${FB.border}`,
        padding: 16,
        boxShadow: FB.shadow,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <EyeOutlined style={{ color: SF.primary, fontSize: 16 }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: FB.text }}>Aperçu en direct</span>
        </div>

        {/* Mock Phone Frame */}
        <div style={{
          width: '100%', maxWidth: isTablet ? 200 : 240, margin: '0 auto',
          border: `2px solid ${FB.border}`,
          borderRadius: 20, padding: 8,
          background: '#1a1a2e',
          minHeight: isTablet ? 300 : 380,
        }}>
          {/* Status Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', color: '#fff', fontSize: 10 }}>
            <span>9:41</span>
            <span>●●●</span>
          </div>

          {/* Nav Tabs Preview */}
          <div style={{
            display: 'flex', gap: 2, padding: '4px 4px', overflowX: 'auto',
            borderBottom: `1px solid ${SF.primary}33`,
          }}>
            {enabledApps.map((app, i) => (
              <div key={i} style={{
                fontSize: 8, padding: '3px 6px', borderRadius: 10,
                background: i === 0 ? SF.primary : 'transparent',
                color: i === 0 ? '#fff' : '#999',
                whiteSpace: 'nowrap',
              }}>
                {app as string}
              </div>
            ))}
          </div>

          {/* Feed Preview */}
          <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Stories Bar */}
            {settings.storiesEnabled && (
              <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    width: 32, height: 32, borderRadius: 16,
                    border: `2px solid ${SF.primary}`,
                    background: '#2a2a4a',
                  }} />
                ))}
              </div>
            )}

            {/* Post Preview */}
            {settings.wallEnabled && (
              <div style={{
                background: '#2a2a4a', borderRadius: 8, padding: 8,
              }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 10, background: SF.primary }} />
                  <div>
                    <div style={{ fontSize: 8, color: '#fff', fontWeight: 600 }}>{selectedOrg?.name || 'Colony'}</div>
                    <div style={{ fontSize: 7, color: '#999' }}>Maintenant</div>
                  </div>
                </div>
                <div style={{ fontSize: 8, color: '#ccc', marginBottom: 6 }}>
                  Exemple de Buzz avec max {settings.maxPostLength} caractères...
                </div>
                <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #3a3a5a', paddingTop: 4 }}>
                  {settings.reactionsEnabled && <span style={{ fontSize: 7, color: '#999' }}>🌼 Pollen</span>}
                  {settings.commentsEnabled && <span style={{ fontSize: 7, color: '#999' }}>💬 Buzz</span>}
                  {settings.sharesEnabled && <span style={{ fontSize: 7, color: '#999' }}>↗ Share</span>}
                </div>
              </div>
            )}

            {/* Spark Preview */}
            {settings.sparksEnabled && (
              <div style={{
                background: 'linear-gradient(135deg, #6C5CE730, #a29bfe30)',
                borderRadius: 8, padding: 8,
              }}>
                <div style={{ fontSize: 8, color: '#ccc' }}>✨ Spark anonyme</div>
                <div style={{ fontSize: 7, color: '#999', marginTop: 2 }}>12/100 votes pour reveal</div>
              </div>
            )}
          </div>

          {/* Disabled indicator */}
          {disabledApps.length > 0 && (
            <div style={{ padding: '6px 8px', borderTop: '1px solid #3a3a5a' }}>
              <div style={{ fontSize: 7, color: '#ff6b6b' }}>
                Désactivés : {(disabledApps as string[]).join(', ')}
              </div>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div style={{ fontSize: 11, color: FB.textSecondary }}>
            Apps actives : <strong style={{ color: FB.green }}>{enabledApps.length}</strong>
          </div>
          <div style={{ fontSize: 11, color: FB.textSecondary }}>
            Max post : <strong>{settings.maxPostLength}</strong>
          </div>
          <div style={{ fontSize: 11, color: FB.textSecondary }}>
            Visibilité : <strong>{settings.defaultPostVisibility}</strong>
          </div>
          <div style={{ fontSize: 11, color: FB.textSecondary }}>
            Modération : <strong>{(settings as any).moderationMode || 'off'}</strong>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '12px 8px' : '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: 10,
            background: SF.gradientPrimary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 20,
          }}>
            <SettingOutlined />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: FB.text }}>
              Hive Social Settings
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: FB.textSecondary, display: isMobile ? 'none' : 'block' }}>
              Configuration complète du réseau social Zhiive
            </p>
          </div>
          {saving && (
            <Tag icon={<Spin size="small" />} color="processing" style={{ marginLeft: 'auto' }}>
              Enregistrement...
            </Tag>
          )}
          {settings && (
            <Popconfirm
              title="Reset global"
              description="Réinitialiser TOUS les paramètres aux valeurs par défaut ?"
              onConfirm={resetAll}
              okText="Reset tout"
              cancelText="Annuler"
            >
              <Button
                icon={<DeleteOutlined />}
                danger
                size="small"
                style={{ marginLeft: saving ? 8 : 'auto' }}
              >
                Reset global
              </Button>
            </Popconfirm>
          )}
        </div>
      </div>

      {/* Organization Selector (Super Admin) */}
      {isSuperAdmin && (
        <Card style={{ marginBottom: 16, borderRadius: FB.radius, border: `2px solid ${SF.primary}33` }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <GlobalOutlined style={{ fontSize: 18, color: SF.primary }} />
            <span style={{ fontWeight: 600, color: FB.text }}>Colony :</span>
            <Select
              style={{ flex: '1 1 200px', minWidth: 0 }}
              value={selectedOrgId}
              onChange={setSelectedOrgId}
              placeholder="Sélectionner une Colony"
              showSearch
              optionFilterProp="label"
              options={allOrgs.map(o => ({
                value: o.id,
                label: o.name,
              }))}
            />
            {selectedOrg && !isMobile && (
              <Tag color="blue">{selectedOrg.name}</Tag>
            )}
          </div>
        </Card>
      )}

      {!settings ? (
        <Empty description="Sélectionnez une Colony pour configurer ses paramètres sociaux" />
      ) : (
        <div style={{ display: 'flex', flexDirection: isTablet ? 'column' : 'row', gap: isMobile ? 12 : 20, alignItems: 'flex-start' }}>
          {/* Left: Settings Tabs */}
          <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
        <Tabs
          defaultActiveKey="apps"
          type="card"
          tabBarStyle={isMobile ? { fontSize: 12 } : undefined}
          style={{ marginTop: 8 }}
          items={[
            // ═══════ TAB 1: APPLICATIONS ═══════
            {
              key: 'apps',
              label: (
                <span><ThunderboltOutlined /> Applications</span>
              ),
              children: (
                <div>
                  <Alert
                    type="info"
                    showIcon
                    icon={<InfoCircleOutlined />}
                    message="Activez ou désactivez les différentes applications du réseau social pour cette Colony."
                    style={{ marginBottom: 16, borderRadius: FB.radius }}
                  />

                  <SettingSection icon={<FireOutlined />} title="Applications Principales">
                    <SettingRow label="Mur (Wall)" description="Fil d'actualité principal avec publications">
                      <Switch checked={settings.wallEnabled} onChange={v => updateSetting('wallEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Stories" description="Contenus éphémères en haut du mur">
                      <Switch checked={settings.storiesEnabled} onChange={v => updateSetting('storiesEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Reels" description="Vidéos courtes format vertical">
                      <Switch checked={settings.reelsEnabled} onChange={v => updateSetting('reelsEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Sparks" description="Ideas et discussions (SpaceFlow)">
                      <Switch checked={settings.sparksEnabled} onChange={v => updateSetting('sparksEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Battles" description="Sondages et comparaisons">
                      <Switch checked={settings.battlesEnabled} onChange={v => updateSetting('battlesEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Friends" description="Galerie de découverte de contenu et amis">
                      <Switch checked={settings.exploreEnabled} onChange={v => updateSetting('exploreEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Hive Live" description="Ligne de vie interactive">
                      <Switch checked={settings.hiveLiveEnabled} onChange={v => updateSetting('hiveLiveEnabled', v)} />
                    </SettingRow>
                  </SettingSection>

                  <SettingSection icon={<MessageOutlined />} title="Communication">
                    <SettingRow label="Whispers (Messenger)" description="Messagerie privée entre les Bees">
                      <Switch checked={settings.messengerEnabled} onChange={v => updateSetting('messengerEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Appels Vidéo/Audio" description="Appels en temps réel">
                      <Switch checked={settings.callsEnabled} onChange={v => updateSetting('callsEnabled', v)} />
                    </SettingRow>
                  </SettingSection>
                </div>
              ),
            },

            // ═══════ TAB 2: FEED & VISIBILITÉ ═══════
            {
              key: 'feed',
              label: (
                <span><EyeOutlined /> Feed & Visibilité</span>
              ),
              children: (
                <div>
                  <SettingSection
                    icon={<EyeOutlined />}
                    title="Visibilité par défaut"
                    description="Contrôle la visibilité par défaut des nouveaux Buzz (posts)"
                  >
                    <SettingRow label="Visibilité par défaut des nouvelles publications">
                      <Select
                        style={{ width: isMobile ? '100%' : 200 }}
                        value={settings.defaultPostVisibility}
                        onChange={v => updateSetting('defaultPostVisibility', v)}
                        options={[
                          { value: 'OUT', label: '🔒 Privé (auteur seul)' },
                          { value: 'IN', label: '🏠 Colony (interne)' },
                          { value: 'ALL', label: '🌐 Public (tout le réseau)' },
                        ]}
                      />
                    </SettingRow>
                  </SettingSection>

                  <SettingSection
                    icon={<GlobalOutlined />}
                    title="Inter-Colony & Discovery"
                    description="Comment le contenu des autres Colonies apparaît dans les feeds"
                  >
                    <SettingRow
                      label="Afficher les posts publics d'autres Colonies"
                      description="Les Buzz publics d'autres Colonies apparaissent dans le feed"
                    >
                      <Switch checked={settings.showPublicPostsInFeed} onChange={v => updateSetting('showPublicPostsInFeed', v)} />
                    </SettingRow>
                    <SettingRow
                      label="Afficher les posts des amis dans le feed personnel"
                      description="Les publications des amis (Bees connectés) apparaissent dans le mode Bee"
                    >
                      <Switch checked={settings.showFriendsPostsInFeed} onChange={v => updateSetting('showFriendsPostsInFeed', v)} />
                    </SettingRow>
                    <SettingRow
                      label="Afficher les publications des Colonies suivies"
                      description="Les Buzz publics des Colonies qu'un Bee suit apparaissent dans son feed"
                    >
                      <Switch checked={settings.showFollowedColoniesInFeed} onChange={v => updateSetting('showFollowedColoniesInFeed', v)} />
                    </SettingRow>
                  </SettingSection>

                  <SettingSection
                    icon={<TeamOutlined />}
                    title="Permissions de publication Colony"
                    description="Ce que les membres de la Colony peuvent faire"
                  >
                    <SettingRow label="Membres peuvent publier sur le mur Colony">
                      <Switch checked={settings.allowMembersPost} onChange={v => updateSetting('allowMembersPost', v)} />
                    </SettingRow>
                    <SettingRow label="Membres peuvent créer des Stories Colony">
                      <Switch checked={settings.allowMembersStory} onChange={v => updateSetting('allowMembersStory', v)} />
                    </SettingRow>
                    <SettingRow label="Membres peuvent créer des Reels Colony">
                      <Switch checked={settings.allowMembersReel} onChange={v => updateSetting('allowMembersReel', v)} />
                    </SettingRow>
                    <SettingRow label="Membres peuvent créer des Sparks Colony">
                      <Switch checked={settings.allowMembersSpark} onChange={v => updateSetting('allowMembersSpark', v)} />
                    </SettingRow>
                    <SettingRow
                      label="Approbation requise (Keeper)"
                      description="Les publications des membres nécessitent l'approbation d'un Keeper avant d'être visibles"
                    >
                      <Switch checked={settings.requirePostApproval} onChange={v => updateSetting('requirePostApproval', v)} />
                    </SettingRow>
                  </SettingSection>
                </div>
              ),
            },

            // ═══════ TAB 3: CONTENU & MODÉRATION ═══════
            {
              key: 'moderation',
              label: (
                <span><SafetyOutlined /> Modération</span>
              ),
              children: (
                <div>
                  <SettingSection icon={<FileTextOutlined />} title="Limites de contenu">
                    <SettingRow label="Longueur max d'un Buzz (caractères)">
                      <InputNumber
                        min={100} max={50000} step={100}
                        value={settings.maxPostLength}
                        onChange={v => v && updateSetting('maxPostLength', v)}
                        style={{ width: isMobile ? '100%' : 120 }}
                      />
                    </SettingRow>
                    <SettingRow label="Longueur max d'un commentaire (caractères)">
                      <InputNumber
                        min={50} max={10000} step={50}
                        value={settings.maxCommentLength}
                        onChange={v => v && updateSetting('maxCommentLength', v)}
                        style={{ width: isMobile ? '100%' : 120 }}
                      />
                    </SettingRow>
                    <SettingRow label="Nombre max de médias par Buzz">
                      <InputNumber
                        min={1} max={50}
                        value={settings.maxMediaPerPost}
                        onChange={v => v && updateSetting('maxMediaPerPost', v)}
                        style={{ width: isMobile ? '100%' : 120 }}
                      />
                    </SettingRow>
                    <SettingRow label="Taille max d'une vidéo (MB)">
                      <InputNumber
                        min={1} max={500}
                        value={settings.maxVideoSizeMB}
                        onChange={v => v && updateSetting('maxVideoSizeMB', v)}
                        style={{ width: isMobile ? '100%' : 120 }}
                      />
                    </SettingRow>
                    <SettingRow label="Taille max d'une image (MB)">
                      <InputNumber
                        min={1} max={50}
                        value={settings.maxImageSizeMB}
                        onChange={v => v && updateSetting('maxImageSizeMB', v)}
                        style={{ width: isMobile ? '100%' : 120 }}
                      />
                    </SettingRow>
                    <SettingRow label="Posts épinglés max">
                      <InputNumber
                        min={0} max={20}
                        value={settings.pinnedPostsLimit}
                        onChange={v => v !== null && updateSetting('pinnedPostsLimit', v)}
                        style={{ width: isMobile ? '100%' : 120 }}
                      />
                    </SettingRow>
                    <SettingRow label="Auto-archivage après (jours)" description="0 = jamais">
                      <InputNumber
                        min={0} max={3650}
                        value={settings.autoArchiveDays}
                        onChange={v => v !== null && updateSetting('autoArchiveDays', v)}
                        style={{ width: isMobile ? '100%' : 120 }}
                      />
                    </SettingRow>
                  </SettingSection>

                  <SettingSection icon={<PictureOutlined />} title="Types de contenu autorisés">
                    <SettingRow label="GIFs">
                      <Switch checked={settings.allowGifs} onChange={v => updateSetting('allowGifs', v)} />
                    </SettingRow>
                    <SettingRow label="Liens URL">
                      <Switch checked={settings.allowLinks} onChange={v => updateSetting('allowLinks', v)} />
                    </SettingRow>
                    <SettingRow label="Hashtags">
                      <Switch checked={settings.allowHashtags} onChange={v => updateSetting('allowHashtags', v)} />
                    </SettingRow>
                  </SettingSection>

                  <SettingSection icon={<SoundOutlined />} title="Filtre anti-profanité">
                    <SettingRow
                      label="Activer le filtre de mots interdits"
                      description="Filtre automatiquement les publications contenant des mots de la liste noire"
                    >
                      <Switch checked={settings.profanityFilterEnabled} onChange={v => updateSetting('profanityFilterEnabled', v)} />
                    </SettingRow>
                    {settings.profanityFilterEnabled && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                          Mots interdits ({settings.bannedWords?.length || 0}) :
                        </div>
                        <Select
                          mode="tags"
                          style={{ width: '100%' }}
                          placeholder="Tapez un mot et appuyez sur Entrée"
                          value={settings.bannedWords || []}
                          onChange={v => updateSetting('bannedWords', v)}
                          tokenSeparators={[',']}
                        />
                      </div>
                    )}
                  </SettingSection>
                </div>
              ),
            },

            // ═══════ TAB 4: INTERACTIONS ═══════
            {
              key: 'interactions',
              label: (
                <span><HeartOutlined /> Interactions</span>
              ),
              children: (
                <div>
                  <SettingSection icon={<HeartOutlined />} title="Pollen (Réactions)">
                    <SettingRow label="Réactions activées" description="Les Bees peuvent réagir aux Buzz (Pollen)">
                      <Switch checked={settings.reactionsEnabled} onChange={v => updateSetting('reactionsEnabled', v)} />
                    </SettingRow>
                  </SettingSection>

                  <SettingSection icon={<MessageOutlined />} title="Buzz Replies (Commentaires)">
                    <SettingRow label="Commentaires activés">
                      <Switch checked={settings.commentsEnabled} onChange={v => updateSetting('commentsEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Profondeur max des réponses imbriquées">
                      <InputNumber
                        min={1} max={10}
                        value={settings.commentDepthLimit}
                        onChange={v => v && updateSetting('commentDepthLimit', v)}
                        style={{ width: isMobile ? '100%' : 120 }}
                      />
                    </SettingRow>
                  </SettingSection>

                  <SettingSection icon={<GlobalOutlined />} title="Partages">
                    <SettingRow label="Partages activés" description="Les Bees peuvent partager les Buzz">
                      <Switch checked={settings.sharesEnabled} onChange={v => updateSetting('sharesEnabled', v)} />
                    </SettingRow>
                  </SettingSection>
                </div>
              ),
            },

            // ═══════ TAB 5: FOLLOW & AMIS ═══════
            {
              key: 'follow',
              label: (
                <span><TeamOutlined /> Follow & Amis</span>
              ),
              children: (
                <div>
                  <SettingSection icon={<UserOutlined />} title="Colony Follow">
                    <SettingRow
                      label="Autoriser le follow de cette Colony"
                      description="Les Bees extérieurs peuvent suivre cette Colony pour voir ses publications publiques"
                    >
                      <Switch checked={settings.allowFollowColony} onChange={v => updateSetting('allowFollowColony', v)} />
                    </SettingRow>
                    <SettingRow
                      label="Auto-follow à l'adhésion"
                      description="Quand un Bee rejoint cette Colony, il la suit automatiquement"
                    >
                      <Switch checked={settings.autoFollowOnJoin} onChange={v => updateSetting('autoFollowOnJoin', v)} />
                    </SettingRow>
                  </SettingSection>

                  <SettingSection icon={<TeamOutlined />} title="Système d'amis">
                    <SettingRow label="Demandes d'amis activées">
                      <Switch checked={settings.friendRequestsEnabled} onChange={v => updateSetting('friendRequestsEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Nombre max d'amis par Bee">
                      <InputNumber
                        min={50} max={50000} step={100}
                        value={settings.maxFriendsPerUser}
                        onChange={v => v && updateSetting('maxFriendsPerUser', v)}
                        style={{ width: isMobile ? '100%' : 140 }}
                      />
                    </SettingRow>
                  </SettingSection>

                  <SettingSection icon={<BlockOutlined />} title="Blocage">
                    <SettingRow
                      label="Autoriser le blocage de Colonies"
                      description="Les Bees peuvent bloquer des Colonies pour ne plus voir leur contenu"
                    >
                      <Switch checked={settings.allowBlockColony} onChange={v => updateSetting('allowBlockColony', v)} />
                    </SettingRow>
                  </SettingSection>
                </div>
              ),
            },

            // ═══════ TAB 6: CONFIDENTIALITÉ ═══════
            {
              key: 'privacy',
              label: (
                <span><LockOutlined /> Confidentialité</span>
              ),
              children: (
                <div>
                  <SettingSection icon={<LockOutlined />} title="Profil Colony">
                    <SettingRow label="Visibilité du profil Colony">
                      <Select
                        style={{ width: isMobile ? '100%' : 200 }}
                        value={settings.profileVisibility}
                        onChange={v => updateSetting('profileVisibility', v)}
                        options={[
                          { value: 'public', label: '🌐 Public' },
                          { value: 'members_only', label: '🏠 Membres uniquement' },
                          { value: 'private', label: '🔒 Privé' },
                        ]}
                      />
                    </SettingRow>
                    <SettingRow label="Afficher la liste des membres" description="La liste des Bees de la Colony est visible publiquement">
                      <Switch checked={settings.showMemberList} onChange={v => updateSetting('showMemberList', v)} />
                    </SettingRow>
                    <SettingRow label="Afficher le nombre de membres">
                      <Switch checked={settings.showMemberCount} onChange={v => updateSetting('showMemberCount', v)} />
                    </SettingRow>
                  </SettingSection>
                </div>
              ),
            },

            // ═══════ TAB 7: NOTIFICATIONS ═══════
            {
              key: 'notifications',
              label: (
                <span><BellOutlined /> Notifications</span>
              ),
              children: (
                <div>
                  <SettingSection icon={<BellOutlined />} title="Notifications automatiques">
                    <SettingRow label="Nouveau Buzz" description="Notification quand un nouveau post est publié dans la Colony">
                      <Switch checked={settings.notifyOnNewPost} onChange={v => updateSetting('notifyOnNewPost', v)} />
                    </SettingRow>
                    <SettingRow label="Nouveau commentaire">
                      <Switch checked={settings.notifyOnComment} onChange={v => updateSetting('notifyOnComment', v)} />
                    </SettingRow>
                    <SettingRow label="Nouvelle réaction (Pollen)">
                      <Switch checked={settings.notifyOnReaction} onChange={v => updateSetting('notifyOnReaction', v)} />
                    </SettingRow>
                    <SettingRow label="Nouveau follower">
                      <Switch checked={settings.notifyOnNewFollower} onChange={v => updateSetting('notifyOnNewFollower', v)} />
                    </SettingRow>
                    <SettingRow label="Demande d'ami">
                      <Switch checked={settings.notifyOnFriendRequest} onChange={v => updateSetting('notifyOnFriendRequest', v)} />
                    </SettingRow>
                    <SettingRow label="Mention (@)">
                      <Switch checked={settings.notifyOnMention} onChange={v => updateSetting('notifyOnMention', v)} />
                    </SettingRow>
                  </SettingSection>
                </div>
              ),
            },

            // ═══════ TAB 8: WAX & CARTE ═══════
            {
              key: 'wax',
              label: (
                <span><EnvironmentOutlined /> Wax & Carte</span>
              ),
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <Popconfirm title="Reset cette section ?" onConfirm={() => resetSection('wax')} okText="Reset" cancelText="Annuler">
                      <Button size="small" icon={<UndoOutlined />}>Reset section</Button>
                    </Popconfirm>
                  </div>
                  <SettingSection icon={<EnvironmentOutlined />} title="Carte Wax" description="Carte interactive 3D avec pins éphémères et navigation">
                    <SettingRow label="Wax activé" description="Active la carte interactive pour cette Colony">
                      <Switch checked={settings.waxEnabled} onChange={v => updateSetting('waxEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Alertes de proximité" description="Push notification quand un WaxPin est créé à proximité">
                      <Switch checked={settings.waxAlertsEnabled} onChange={v => updateSetting('waxAlertsEnabled', v)} disabled={!settings.waxEnabled} />
                    </SettingRow>
                    <SettingRow label="Rayon de surveillance par défaut (km)" description="L'utilisateur peut personnaliser son rayon">
                      <InputNumber
                        min={1} max={200}
                        value={settings.waxDefaultRadiusKm}
                        onChange={v => v && updateSetting('waxDefaultRadiusKm', v)}
                        style={{ width: isMobile ? '100%' : 120 }}
                        disabled={!settings.waxEnabled || !settings.waxAlertsEnabled}
                      />
                    </SettingRow>
                    <SettingRow label="Mode Fantôme autorisé" description="Les Bees peuvent masquer leur position sur la carte">
                      <Switch checked={settings.waxGhostModeAllowed} onChange={v => updateSetting('waxGhostModeAllowed', v)} disabled={!settings.waxEnabled} />
                    </SettingRow>
                  </SettingSection>
                </div>
              ),
            },

            // ═══════ TAB 9: NECTAR SUB-APPS ═══════
            {
              key: 'nectar',
              label: (
                <span><AppstoreOutlined /> Nectar</span>
              ),
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <Popconfirm title="Reset cette section ?" onConfirm={() => resetSection('nectar')} okText="Reset" cancelText="Annuler">
                      <Button size="small" icon={<UndoOutlined />}>Reset section</Button>
                    </Popconfirm>
                  </div>
                  <Alert
                    type="info" showIcon icon={<InfoCircleOutlined />}
                    message="Nectar est le hub central contenant les mini-applications de la Colony."
                    style={{ marginBottom: 16, borderRadius: FB.radius }}
                  />
                  <SettingSection icon={<AppstoreOutlined />} title="Mini-applications Nectar">
                    <SettingRow label="Sparks" description="Ideas et discussions rapides (déjà dans Applications)">
                      <Switch checked={settings.sparksEnabled} onChange={v => updateSetting('sparksEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Battles" description="Sondages et comparaisons (déjà dans Applications)">
                      <Switch checked={settings.battlesEnabled} onChange={v => updateSetting('battlesEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Quests" description="Défis et missions gamifiées">
                      <Switch checked={settings.questsEnabled} onChange={v => updateSetting('questsEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Events" description="Événements et rencontres Colony">
                      <Switch checked={settings.eventsEnabled} onChange={v => updateSetting('eventsEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Capsules" description="Contenus capsule temporels (time capsule)">
                      <Switch checked={settings.capsulesEnabled} onChange={v => updateSetting('capsulesEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Orbit" description="Réseau de recommandations et cercles sociaux">
                      <Switch checked={settings.orbitEnabled} onChange={v => updateSetting('orbitEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Pulse" description="Sondages et feedback rapides en temps réel">
                      <Switch checked={settings.pulseEnabled} onChange={v => updateSetting('pulseEnabled', v)} />
                    </SettingRow>
                  </SettingSection>
                </div>
              ),
            },

            // ═══════ TAB 10: WHISPER (MESSENGER) ═══════
            {
              key: 'whisper',
              label: (
                <span><MessageOutlined /> Whisper</span>
              ),
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <Popconfirm title="Reset cette section ?" onConfirm={() => resetSection('whisper')} okText="Reset" cancelText="Annuler">
                      <Button size="small" icon={<UndoOutlined />}>Reset section</Button>
                    </Popconfirm>
                  </div>
                  <SettingSection icon={<MessageOutlined />} title="Whisper (Messagerie)" description="Messagerie privée en temps réel entre les Bees">
                    <SettingRow label="Whisper activé" description="Messagerie privée entre les Bees">
                      <Switch checked={settings.messengerEnabled} onChange={v => updateSetting('messengerEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Appels Vidéo/Audio" description="Appels en temps réel via WebRTC">
                      <Switch checked={settings.callsEnabled} onChange={v => updateSetting('callsEnabled', v)} disabled={!settings.messengerEnabled} />
                    </SettingRow>
                  </SettingSection>
                </div>
              ),
            },

            // ═══════ TAB 11: MODÉRATION IA ═══════
            {
              key: 'moderation_ia',
              label: (
                <span><RobotOutlined /> Modération IA</span>
              ),
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <Popconfirm title="Reset cette section ?" onConfirm={() => resetSection('moderation')} okText="Reset" cancelText="Annuler">
                      <Button size="small" icon={<UndoOutlined />}>Reset section</Button>
                    </Popconfirm>
                  </div>
                  <Alert
                    type="warning" showIcon
                    message="La modération IA utilise Google Gemini pour analyser automatiquement le contenu avant publication."
                    style={{ marginBottom: 16, borderRadius: FB.radius }}
                  />
                  <SettingSection icon={<RobotOutlined />} title="Mode de modération">
                    <SettingRow label="Mode de modération" description="Comment le contenu est vérifié avant d'être visible">
                      <Select
                        style={{ width: isMobile ? '100%' : 250 }}
                        value={settings.moderationMode}
                        onChange={v => updateSetting('moderationMode', v)}
                        options={[
                          { value: 'manual', label: '👤 Manuelle (admin uniquement)' },
                          { value: 'ai_review', label: '🤖 IA + validation admin' },
                          { value: 'ai_auto', label: '⚡ IA automatique + signalement' },
                        ]}
                      />
                    </SettingRow>
                  </SettingSection>
                  <SettingSection icon={<SafetyOutlined />} title="Catégories bloquées par l'IA">
                    <Select
                      mode="tags"
                      style={{ width: '100%' }}
                      placeholder="Ex: violence, nsfw, spam, hate_speech..."
                      value={settings.aiBannedCategories || []}
                      onChange={v => updateSetting('aiBannedCategories', v)}
                      tokenSeparators={[',']}
                      options={[
                        { value: 'violence', label: 'Violence' },
                        { value: 'nsfw', label: 'NSFW / Contenu adulte' },
                        { value: 'spam', label: 'Spam' },
                        { value: 'hate_speech', label: 'Discours haineux' },
                        { value: 'harassment', label: 'Harcèlement' },
                        { value: 'misinformation', label: 'Désinformation' },
                        { value: 'self_harm', label: 'Auto-mutilation' },
                      ]}
                    />
                  </SettingSection>
                  <SettingSection icon={<SoundOutlined />} title="Filtre anti-profanité">
                    <SettingRow label="Filtre de mots interdits activé">
                      <Switch checked={settings.profanityFilterEnabled} onChange={v => updateSetting('profanityFilterEnabled', v)} />
                    </SettingRow>
                    {settings.profanityFilterEnabled && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                          Mots interdits ({settings.bannedWords?.length || 0}) :
                        </div>
                        <Select
                          mode="tags" style={{ width: '100%' }}
                          placeholder="Tapez un mot et appuyez sur Entrée"
                          value={settings.bannedWords || []}
                          onChange={v => updateSetting('bannedWords', v)}
                          tokenSeparators={[',']}
                        />
                      </div>
                    )}
                  </SettingSection>
                </div>
              ),
            },

            // ═══════ TAB 12: BUSINESS → SOCIAL ═══════
            {
              key: 'business',
              label: (
                <span><ShopOutlined /> Business → Social</span>
              ),
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <Popconfirm title="Reset cette section ?" onConfirm={() => resetSection('business')} okText="Reset" cancelText="Annuler">
                      <Button size="small" icon={<UndoOutlined />}>Reset section</Button>
                    </Popconfirm>
                  </div>
                  <Alert
                    type="info" showIcon icon={<InfoCircleOutlined />}
                    message="Quand un événement business se produit, 3 auto-posts sont créés : (1) Post privé CLIENT pour le client, (2) Annonce interne Colony, (3) Publication publique."
                    style={{ marginBottom: 16, borderRadius: FB.radius }}
                  />
                  <SettingSection icon={<ShopOutlined />} title="Événements déclencheurs" description="Quels événements business créent des auto-posts">
                    <SettingRow label="Devis signé" description="Quand un devis est signé par le client">
                      <Switch checked={settings.autoPostOnDevisSigned} onChange={v => updateSetting('autoPostOnDevisSigned', v)} />
                    </SettingRow>
                    <SettingRow label="Facture payée" description="Quand une facture est marquée comme payée">
                      <Switch checked={settings.autoPostOnInvoicePaid} onChange={v => updateSetting('autoPostOnInvoicePaid', v)} />
                    </SettingRow>
                    <SettingRow label="Nouveau chantier créé" description="Quand un nouveau chantier est lancé">
                      <Switch checked={settings.autoPostOnChantierCreated} onChange={v => updateSetting('autoPostOnChantierCreated', v)} />
                    </SettingRow>
                    <SettingRow label="Chantier terminé" description="Quand un chantier est marqué comme terminé">
                      <Switch checked={settings.autoPostOnChantierCompleted} onChange={v => updateSetting('autoPostOnChantierCompleted', v)} />
                    </SettingRow>
                    <SettingRow label="Nouveau client ajouté" description="Quand un nouveau lead devient client">
                      <Switch checked={settings.autoPostOnNewClient} onChange={v => updateSetting('autoPostOnNewClient', v)} />
                    </SettingRow>
                    <SettingRow label="Événement calendrier" description="Quand un événement d'agenda est créé">
                      <Switch checked={settings.autoPostOnCalendarEvent} onChange={v => updateSetting('autoPostOnCalendarEvent', v)} />
                    </SettingRow>
                    <SettingRow label="Tâche terminée" description="Quand une tâche est marquée comme complète">
                      <Switch checked={settings.autoPostOnTaskCompleted} onChange={v => updateSetting('autoPostOnTaskCompleted', v)} />
                    </SettingRow>
                  </SettingSection>
                  <SettingSection icon={<EyeOutlined />} title="Visibilité des auto-posts">
                    <SettingRow label="Visibilité par défaut des auto-posts">
                      <Select
                        style={{ width: isMobile ? '100%' : 200 }}
                        value={settings.autoPostDefaultVisibility}
                        onChange={v => updateSetting('autoPostDefaultVisibility', v)}
                        options={[
                          { value: 'OUT', label: '🔒 Privé' },
                          { value: 'IN', label: '🏠 Colony (interne)' },
                          { value: 'ALL', label: '🌐 Public' },
                        ]}
                      />
                    </SettingRow>
                  </SettingSection>
                </div>
              ),
            },

            // ═══════ TAB 13: RGPD & DONNÉES ═══════
            {
              key: 'rgpd',
              label: (
                <span><AuditOutlined /> RGPD</span>
              ),
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <Popconfirm title="Reset cette section ?" onConfirm={() => resetSection('rgpd')} okText="Reset" cancelText="Annuler">
                      <Button size="small" icon={<UndoOutlined />}>Reset section</Button>
                    </Popconfirm>
                  </div>
                  <Alert
                    type="warning" showIcon
                    message="Le RGPD est obligatoire dans l'UE. Les utilisateurs doivent pouvoir exporter et supprimer leurs données."
                    style={{ marginBottom: 16, borderRadius: FB.radius }}
                  />
                  <SettingSection icon={<AuditOutlined />} title="Export des données" description="Permettre aux Bees d'exporter leurs données personnelles">
                    <SettingRow label="Export de données activé" description="Bouton 'Exporter mes données' dans le profil">
                      <Switch checked={settings.gdprDataExportEnabled} onChange={v => updateSetting('gdprDataExportEnabled', v)} />
                    </SettingRow>
                  </SettingSection>
                  <SettingSection icon={<LockOutlined />} title="Rétention des données" description="Durée de conservation des données inactives">
                    <SettingRow label="Jours de rétention (0 = illimité)" description="Après ce délai, les données inactives sont supprimées">
                      <InputNumber
                        min={0} max={3650}
                        value={settings.gdprRetentionDays}
                        onChange={v => v !== null && updateSetting('gdprRetentionDays', v)}
                        style={{ width: isMobile ? '100%' : 120 }}
                        addonAfter="jours"
                      />
                    </SettingRow>
                  </SettingSection>
                </div>
              ),
            },

            // ═══════ TAB 14: ANALYTICS ═══════
            {
              key: 'analytics',
              label: (
                <span><BarChartOutlined /> Analytics</span>
              ),
              children: (
                <div>
                  <SettingSection icon={<BarChartOutlined />} title="Statistiques & Visibilité">
                    <SettingRow
                      label="Afficher les analytics sur les Buzz"
                      description="Nombre de vues, taux d'engagement sur chaque publication"
                    >
                      <Switch checked={settings.showPostAnalytics} onChange={v => updateSetting('showPostAnalytics', v)} />
                    </SettingRow>
                    <SettingRow
                      label="Afficher les vues de profil"
                      description="Les Bees voient combien de fois leur profil a été consulté"
                    >
                      <Switch checked={settings.showProfileViews} onChange={v => updateSetting('showProfileViews', v)} />
                    </SettingRow>
                  </SettingSection>

                  <SettingSection icon={<CompassOutlined />} title="Résumé de la configuration">
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 8 }}>
                      {[
                        { label: 'Mur', enabled: settings.wallEnabled },
                        { label: 'Stories', enabled: settings.storiesEnabled },
                        { label: 'Reels', enabled: settings.reelsEnabled },
                        { label: 'Sparks', enabled: settings.sparksEnabled },
                        { label: 'Battles', enabled: settings.battlesEnabled },
                        { label: 'Explore', enabled: settings.exploreEnabled },
                        { label: 'Hive Live', enabled: settings.hiveLiveEnabled },
                        { label: 'Whisper', enabled: settings.messengerEnabled },
                        { label: 'Appels', enabled: settings.callsEnabled },
                        { label: 'Wax', enabled: settings.waxEnabled },
                        { label: 'Quests', enabled: settings.questsEnabled },
                        { label: 'Events', enabled: settings.eventsEnabled },
                        { label: 'Capsules', enabled: settings.capsulesEnabled },
                        { label: 'Orbit', enabled: settings.orbitEnabled },
                        { label: 'Pulse', enabled: settings.pulseEnabled },
                        { label: 'Réactions', enabled: settings.reactionsEnabled },
                        { label: 'Commentaires', enabled: settings.commentsEnabled },
                        { label: 'Partages', enabled: settings.sharesEnabled },
                        { label: 'Follow Colony', enabled: settings.allowFollowColony },
                        { label: 'Amis', enabled: settings.friendRequestsEnabled },
                        { label: 'Block Colony', enabled: settings.allowBlockColony },
                        { label: 'Modération IA', enabled: settings.moderationMode !== 'manual' },
                        { label: 'Auto-post Devis', enabled: settings.autoPostOnDevisSigned },
                        { label: 'Auto-post Chantier', enabled: settings.autoPostOnChantierCompleted },
                        { label: 'RGPD Export', enabled: settings.gdprDataExportEnabled },
                        { label: 'Post Analytics', enabled: settings.showPostAnalytics },
                      ].map(item => (
                        <div
                          key={item.label}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 12px', borderRadius: 8,
                            background: item.enabled ? '#f0fdf4' : '#fef2f2',
                            border: `1px solid ${item.enabled ? '#bbf7d070' : '#fecaca70'}`,
                          }}
                        >
                          {item.enabled
                            ? <CheckCircleOutlined style={{ color: FB.green }} />
                            : <CloseCircleOutlined style={{ color: FB.red }} />
                          }
                          <span style={{ fontSize: 13, color: FB.text }}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </SettingSection>
                </div>
              ),
            },
          ]}
        />
          </div>
          {/* Right: Live Preview */}
          <div style={{ width: isTablet ? '100%' : 280, flexShrink: 0 }}>
            <LivePreview />
          </div>
        </div>
      )}
    </div>
  );
}
