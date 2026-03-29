import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card, Switch, InputNumber, Select, Tag, Alert, Tabs,
  Spin, Empty,
} from 'antd';
import {
  SettingOutlined, EyeOutlined, TeamOutlined, BellOutlined,
  SafetyOutlined, BarChartOutlined, ThunderboltOutlined,
  GlobalOutlined, MessageOutlined, HeartOutlined,
  PictureOutlined, FileTextOutlined, FireOutlined, CompassOutlined,
  LockOutlined, UserOutlined, BlockOutlined, SoundOutlined,
  CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

import { SF } from '../../components/zhiive/ZhiiveTheme';

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
      bodyStyle={{ padding: '16px 20px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: description ? 4 : 12 }}>
        <span style={{ fontSize: 18, color: FB.purple }}>{icon}</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: FB.text }}>{title}</span>
      </div>
      {description && (
        <p style={{ color: FB.textSecondary, fontSize: 13, margin: '0 0 12px 28px' }}>{description}</p>
      )}
      <div style={{ marginLeft: 0 }}>{children}</div>
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
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: `1px solid ${FB.border}22`,
      marginLeft: indent ? 28 : 0,
    }}>
      <div style={{ flex: 1, marginRight: 16 }}>
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
  allowMembersPost: boolean;
  allowMembersStory: boolean;
  allowMembersReel: boolean;
  allowMembersSpark: boolean;
  requirePostApproval: boolean;
  showPublicPostsInFeed: boolean;
  showFriendsPostsInFeed: boolean;
  showFollowedColoniesInFeed: boolean;
  maxPostLength: number;
  maxCommentLength: number;
  maxMediaPerPost: number;
  maxVideoSizeMB: number;
  maxImageSizeMB: number;
  allowGifs: boolean;
  allowLinks: boolean;
  allowHashtags: boolean;
  profanityFilterEnabled: boolean;
  reactionsEnabled: boolean;
  commentsEnabled: boolean;
  sharesEnabled: boolean;
  commentDepthLimit: number;
  allowFollowColony: boolean;
  autoFollowOnJoin: boolean;
  friendRequestsEnabled: boolean;
  maxFriendsPerUser: number;
  allowBlockColony: boolean;
  showMemberList: boolean;
  showMemberCount: boolean;
  profileVisibility: string;
  notifyOnNewPost: boolean;
  notifyOnComment: boolean;
  notifyOnReaction: boolean;
  notifyOnNewFollower: boolean;
  notifyOnFriendRequest: boolean;
  notifyOnMention: boolean;
  showPostAnalytics: boolean;
  showProfileViews: boolean;
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

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: SF.gradientPrimary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 20,
          }}>
            <SettingOutlined />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: FB.text }}>
              Hive Social Settings
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: FB.textSecondary }}>
              Configuration complète du réseau social Zhiive
            </p>
          </div>
          {saving && (
            <Tag icon={<Spin size="small" />} color="processing" style={{ marginLeft: 'auto' }}>
              Enregistrement...
            </Tag>
          )}
        </div>
      </div>

      {/* Organization Selector (Super Admin) */}
      {isSuperAdmin && (
        <Card style={{ marginBottom: 16, borderRadius: FB.radius, border: `2px solid ${SF.primary}33` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <GlobalOutlined style={{ fontSize: 18, color: SF.primary }} />
            <span style={{ fontWeight: 600, color: FB.text }}>Colony :</span>
            <Select
              style={{ flex: 1, maxWidth: 400 }}
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
            {selectedOrg && (
              <Tag color="blue">{selectedOrg.name}</Tag>
            )}
          </div>
        </Card>
      )}

      {!settings ? (
        <Empty description="Sélectionnez une Colony pour configurer ses paramètres sociaux" />
      ) : (
        <Tabs
          defaultActiveKey="apps"
          type="card"
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
                    <SettingRow label="Explore (Scout)" description="Galerie de découverte de contenu">
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
                        style={{ width: 200 }}
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
                        style={{ width: 120 }}
                      />
                    </SettingRow>
                    <SettingRow label="Longueur max d'un commentaire (caractères)">
                      <InputNumber
                        min={50} max={10000} step={50}
                        value={settings.maxCommentLength}
                        onChange={v => v && updateSetting('maxCommentLength', v)}
                        style={{ width: 120 }}
                      />
                    </SettingRow>
                    <SettingRow label="Nombre max de médias par Buzz">
                      <InputNumber
                        min={1} max={50}
                        value={settings.maxMediaPerPost}
                        onChange={v => v && updateSetting('maxMediaPerPost', v)}
                        style={{ width: 120 }}
                      />
                    </SettingRow>
                    <SettingRow label="Taille max d'une vidéo (MB)">
                      <InputNumber
                        min={1} max={500}
                        value={settings.maxVideoSizeMB}
                        onChange={v => v && updateSetting('maxVideoSizeMB', v)}
                        style={{ width: 120 }}
                      />
                    </SettingRow>
                    <SettingRow label="Taille max d'une image (MB)">
                      <InputNumber
                        min={1} max={50}
                        value={settings.maxImageSizeMB}
                        onChange={v => v && updateSetting('maxImageSizeMB', v)}
                        style={{ width: 120 }}
                      />
                    </SettingRow>
                    <SettingRow label="Posts épinglés max">
                      <InputNumber
                        min={0} max={20}
                        value={settings.pinnedPostsLimit}
                        onChange={v => v !== null && updateSetting('pinnedPostsLimit', v)}
                        style={{ width: 120 }}
                      />
                    </SettingRow>
                    <SettingRow label="Auto-archivage après (jours)" description="0 = jamais">
                      <InputNumber
                        min={0} max={3650}
                        value={settings.autoArchiveDays}
                        onChange={v => v !== null && updateSetting('autoArchiveDays', v)}
                        style={{ width: 120 }}
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
                        style={{ width: 120 }}
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
                        style={{ width: 140 }}
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
                        style={{ width: 200 }}
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

            // ═══════ TAB 8: ANALYTICS ═══════
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 8 }}>
                      {[
                        { label: 'Mur', enabled: settings.wallEnabled },
                        { label: 'Stories', enabled: settings.storiesEnabled },
                        { label: 'Reels', enabled: settings.reelsEnabled },
                        { label: 'Sparks', enabled: settings.sparksEnabled },
                        { label: 'Battles', enabled: settings.battlesEnabled },
                        { label: 'Explore', enabled: settings.exploreEnabled },
                        { label: 'Hive Live', enabled: settings.hiveLiveEnabled },
                        { label: 'Whispers', enabled: settings.messengerEnabled },
                        { label: 'Appels', enabled: settings.callsEnabled },
                        { label: 'Réactions', enabled: settings.reactionsEnabled },
                        { label: 'Commentaires', enabled: settings.commentsEnabled },
                        { label: 'Partages', enabled: settings.sharesEnabled },
                        { label: 'Follow Colony', enabled: settings.allowFollowColony },
                        { label: 'Amis', enabled: settings.friendRequestsEnabled },
                        { label: 'Block Colony', enabled: settings.allowBlockColony },
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
      )}
    </div>
  );
}
