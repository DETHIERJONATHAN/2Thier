import { SF, FB } from '../components/zhiive/ZhiiveTheme';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, Spin, message } from 'antd';
import {
  MailOutlined, PhoneOutlined, HomeOutlined, BankOutlined,
  TeamOutlined, LinkOutlined, GlobalOutlined, CalendarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { WallPostCard, WallPostData } from './DashboardPageUnified';
import { useTranslation } from 'react-i18next';

/* ═══ FB Colors ═══ */
const ORG_COLOR = SF.primary;

/* ═══ Responsive ═══ */
const useScreenSize = () => {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return { isMobile: width < 768, width };
};

/* ═══ Helpers ═══ */
const FBCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow, padding: 16, marginBottom: 16 }}>
    <span style={{ fontSize: 17, fontWeight: 700, color: FB.text, display: 'block', marginBottom: 8 }}>{title}</span>
    {children}
  </div>
);

const InfoLine: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
    <span style={{ color: FB.textSecondary, fontSize: 20, flexShrink: 0 }}>{icon}</span>
    <span style={{ fontSize: 15, color: FB.text, wordBreak: 'break-word' }}>{children}</span>
  </div>
);

/* ═══ Types ═══ */
interface ColonyProfile {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  vatNumber: string | null;
  createdAt: string;
  memberCount: number;
  postCount: number;
  members: { id: string; firstName: string; lastName: string; avatarUrl: string | null; role: string }[];
}

/* ═══════════════════════════════════════════════════════════════
   COLONY PROFILE PAGE
   ═══════════════════════════════════════════════════════════════ */
const ColonyProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { orgId } = useParams<{ orgId: string }>();
  const { user, currentOrganization } = useAuth();
  const { api } = useAuthenticatedApi();
  const navigate = useNavigate();
  const { isMobile } = useScreenSize();

  const [colony, setColony] = useState<ColonyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');

  // Wall posts
  const [posts, setPosts] = useState<WallPostData[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const _isMyColony = currentOrganization?.id === orgId;

  // ═══ Load Colony profile ═══
  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    api.get(`/api/organizations/public/${orgId}`)
      .then((r: unknown) => {
        setColony(r?.data || r);
        setLoading(false);
      })
      .catch(() => {
        message.error('Colony introuvable');
        setLoading(false);
      });
  }, [api, orgId]);

  // ═══ Load Colony wall posts ═══
  const loadPosts = useCallback(async () => {
    if (!orgId) return;
    setPostsLoading(true);
    try {
      const result: unknown = await api.get(`/api/wall/feed?mode=org&visibility=ALL`);
      const allPosts: WallPostData[] = result?.posts || [];
      // Filter posts published by this org
      const orgPosts = allPosts.filter((p: Record<string, unknown>) => p.publishAsOrg && p.organization?.id === orgId);
      setPosts(orgPosts);
    } catch {
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [api, orgId]);

  useEffect(() => {
    if (activeTab === 'publications') loadPosts();
  }, [activeTab, loadPosts]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><Spin size="large" /></div>;
  }

  if (!colony) {
    return <div style={{ textAlign: 'center', padding: 24, color: FB.textSecondary }}>Colony introuvable</div>;
  }

  const coverH = isMobile ? 200 : 300;
  const logoSize = isMobile ? 120 : 168;
  const logoOverlap = isMobile ? 60 : 40;

  const tabs = [
    { key: 'about', label: 'À propos' },
    { key: 'publications', label: 'Publications' },
    { key: 'members', label: `Membres (${colony.memberCount})` },
  ];

  return (
    <div style={{ minHeight: '100vh', background: FB.bg }}>
      {/* ═══ Cover ═══ */}
      <div style={{ position: 'relative', maxWidth: 940, margin: '0 auto' }}>
        <div
          style={{
            height: coverH, borderRadius: isMobile ? 0 : '0 0 8px 8px',
            background: `linear-gradient(135deg, ${ORG_COLOR} 0%, #a29bfe 100%)`,
            overflow: 'hidden',
          }}
        />

        {/* ═══ Logo + Name (mobile: centered) ═══ */}
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -logoOverlap, position: 'relative', zIndex: 2 }}>
            <Avatar
              size={logoSize}
              src={colony.logoUrl}
              style={{
                border: '4px solid #fff',
                backgroundColor: !colony.logoUrl ? ORG_COLOR : undefined,
                fontSize: logoSize * 0.4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              {!colony.logoUrl && (colony.name[0]?.toUpperCase() || 'C')}
            </Avatar>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: FB.text, margin: '8px 0 0', textAlign: 'center' }}>{colony.name}</h1>
            <div style={{ fontSize: 14, color: FB.textSecondary, marginTop: 4, textAlign: 'center' }}>
              <TeamOutlined style={{ marginRight: 4 }} />{colony.memberCount} membre{colony.memberCount > 1 ? 's' : ''}
              <span style={{ margin: '0 8px' }}>·</span>
              {colony.postCount} publication{colony.postCount > 1 ? 's' : ''}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', padding: '0 32px', marginTop: -logoOverlap, position: 'relative', zIndex: 2 }}>
            <Avatar
              size={logoSize}
              src={colony.logoUrl}
              style={{
                border: '4px solid #fff',
                backgroundColor: !colony.logoUrl ? ORG_COLOR : undefined,
                fontSize: logoSize * 0.4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                flexShrink: 0,
              }}
            >
              {!colony.logoUrl && (colony.name[0]?.toUpperCase() || 'C')}
            </Avatar>
            <div style={{ marginLeft: 16, paddingBottom: 16, flex: 1 }}>
              <h1 style={{ fontSize: 32, fontWeight: 700, color: FB.text, margin: 0 }}>{colony.name}</h1>
              <div style={{ fontSize: 15, color: FB.textSecondary, marginTop: 4 }}>
                <TeamOutlined style={{ marginRight: 4 }} />{colony.memberCount} membre{colony.memberCount > 1 ? 's' : ''}
                <span style={{ margin: '0 8px' }}>·</span>
                {colony.postCount} publication{colony.postCount > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}

        {/* ═══ Tabs ═══ */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: `1px solid ${FB.border}`,
          background: FB.white, borderRadius: `0 0 ${FB.radius}px ${FB.radius}px`,
          marginTop: 16, padding: '0 16px',
          boxShadow: FB.shadow,
        }}>
          {tabs.map(tab => (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '16px 16px',
                fontSize: 15, fontWeight: activeTab === tab.key ? 700 : 600,
                color: activeTab === tab.key ? FB.blue : FB.textSecondary,
                borderBottom: activeTab === tab.key ? `3px solid ${FB.blue}` : '3px solid transparent',
                cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none',
                borderRadius: '4px 4px 0 0',
              }}
              onMouseEnter={e => { if (activeTab !== tab.key) e.currentTarget.style.background = FB.bg; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {tab.label}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Tab content ═══ */}
      <div style={{ maxWidth: 940, margin: '16px auto', padding: isMobile ? '0 8px' : '0 16px' }}>
        {activeTab === 'about' && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            <div>
              {/* Description */}
              {colony.description && (
                <FBCard title={t('fields.description')}>
                  <p style={{ fontSize: 15, color: FB.text, lineHeight: 1.5, margin: 0 }}>{colony.description}</p>
                </FBCard>
              )}

              {/* Informations */}
              <FBCard title="Informations">
                {colony.address && <InfoLine icon={<HomeOutlined />}>{colony.address}</InfoLine>}
                {colony.email && (
                  <InfoLine icon={<MailOutlined />}>
                    <span style={{ color: FB.blue }}>{colony.email}</span>
                  </InfoLine>
                )}
                {colony.phone && <InfoLine icon={<PhoneOutlined />}>{colony.phone}</InfoLine>}
                {colony.website && (
                  <InfoLine icon={<GlobalOutlined />}>
                    <a href={colony.website.startsWith('http') ? colony.website : `https://${colony.website}`}
                      target="_blank" rel="noopener noreferrer" style={{ color: FB.blue }}>
                      {colony.website}
                    </a>
                  </InfoLine>
                )}
                {colony.vatNumber && <InfoLine icon={<BankOutlined />}>TVA : {colony.vatNumber}</InfoLine>}
                <InfoLine icon={<CalendarOutlined />}>
                  Fondée le {new Date(colony.createdAt).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
                </InfoLine>
              </FBCard>
            </div>

            <div>
              {/* Résumé */}
              <FBCard title={t('common.summary')}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: FB.bg, borderRadius: 8, padding: 20, textAlign: 'center' }}>
                    <TeamOutlined style={{ fontSize: 28, color: ORG_COLOR }} />
                    <div style={{ fontSize: 22, fontWeight: 700, color: FB.text, marginTop: 8 }}>{colony.memberCount}</div>
                    <div style={{ fontSize: 13, color: FB.textSecondary }}>Membre{colony.memberCount > 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ background: FB.bg, borderRadius: 8, padding: 20, textAlign: 'center' }}>
                    <LinkOutlined style={{ fontSize: 28, color: FB.blue }} />
                    <div style={{ fontSize: 22, fontWeight: 700, color: FB.text, marginTop: 8 }}>{colony.postCount}</div>
                    <div style={{ fontSize: 13, color: FB.textSecondary }}>Publication{colony.postCount > 1 ? 's' : ''}</div>
                  </div>
                </div>
              </FBCard>

              {/* Quick members preview */}
              <FBCard title={`Membres (${colony.memberCount})`}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {colony.members.slice(0, 6).map(m => (
                    <div
                      key={m.id}
                      onClick={() => navigate(`/profile/${m.id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                        borderRadius: 8, background: FB.bg, cursor: 'pointer', flex: '1 1 calc(50% - 6px)', minWidth: 160,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = FB.btnGray; }}
                      onMouseLeave={e => { e.currentTarget.style.background = FB.bg; }}
                    >
                      <Avatar size={36} src={m.avatarUrl} icon={!m.avatarUrl ? <UserOutlined /> : undefined}
                        style={{ backgroundColor: !m.avatarUrl ? FB.blue : undefined, flexShrink: 0 }}>
                        {!m.avatarUrl && (m.firstName?.[0] || '?')}
                      </Avatar>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: FB.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {[m.firstName, m.lastName].filter(Boolean).join(' ')}
                        </div>
                        <div style={{ fontSize: 12, color: FB.textSecondary }}>{m.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {colony.memberCount > 6 && (
                  <div
                    onClick={() => setActiveTab('members')}
                    style={{
                      textAlign: 'center', paddingTop: 12, fontSize: 14,
                      fontWeight: 600, color: FB.blue, cursor: 'pointer',
                    }}
                  >
                    Voir tous les membres
                  </div>
                )}
              </FBCard>
            </div>
          </div>
        )}

        {activeTab === 'publications' && (
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            {postsLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : posts.length === 0 ? (
              <div style={{
                background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
                padding: 40, textAlign: 'center', color: FB.textSecondary,
              }}>
                Aucune publication pour cette Colony.
              </div>
            ) : (
              posts.map(post => (
                <WallPostCard
                  key={post.id}
                  post={post}
                  isMobile={isMobile}
                  currentUserId={user?.id || ''}
                  currentUser={user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl } : undefined}
                  api={api}
                  onUpdate={loadPosts}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <FBCard title={`Tous les membres (${colony.memberCount})`}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
              {colony.members.map(m => (
                <div
                  key={m.id}
                  onClick={() => navigate(`/profile/${m.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                    borderRadius: 8, background: FB.bg, cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = FB.btnGray; }}
                  onMouseLeave={e => { e.currentTarget.style.background = FB.bg; }}
                >
                  <Avatar size={48} src={m.avatarUrl} icon={!m.avatarUrl ? <UserOutlined /> : undefined}
                    style={{ backgroundColor: !m.avatarUrl ? FB.blue : undefined, flexShrink: 0 }}>
                    {!m.avatarUrl && (m.firstName?.[0] || '?')}
                  </Avatar>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: FB.text }}>
                      {[m.firstName, m.lastName].filter(Boolean).join(' ')}
                    </div>
                    <div style={{ fontSize: 13, color: FB.textSecondary }}>{m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </FBCard>
        )}
      </div>
    </div>
  );
};

export default ColonyProfilePage;
