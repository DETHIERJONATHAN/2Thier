import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/useAuth';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useNavigate } from 'react-router-dom';
import { Avatar, Spin, message } from 'antd';
import {
  UserOutlined, CameraOutlined, MailOutlined, PhoneOutlined,
  HomeOutlined, BankOutlined, TeamOutlined, CrownOutlined,
  SettingOutlined, EditOutlined,
  LinkOutlined, SafetyCertificateOutlined, SwapOutlined,
  EllipsisOutlined,
} from '@ant-design/icons';

/* ═══════════════════════════════════════════════════════════════
   FACEBOOK COLORS — exactement les mêmes tokens
   ═══════════════════════════════════════════════════════════════ */
const FB = {
  bg: '#f0f2f5',
  white: '#ffffff',
  text: '#050505',
  textSecondary: '#65676b',
  blue: '#1877f2',
  blueHover: '#166fe5',
  border: '#ced0d4',
  btnGray: '#e4e6eb',
  btnGrayHover: '#d8dadf',
  activeBlue: '#e7f3ff',
  shadow: '0 1px 2px rgba(0,0,0,0.1)',
  shadowHover: '0 2px 8px rgba(0,0,0,0.1)',
  radius: 8,
};

/* ═══════════════════════════════════════════════════════════════
   RESPONSIVE HOOK
   ═══════════════════════════════════════════════════════════════ */
const useScreenSize = () => {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return { isMobile: width < 768, isTablet: width >= 768 && width < 1024, width };
};

/* ═══════════════════════════════════════════════════════════════ */
const ROLE_MAP: Record<string, { label: string; color: string; icon?: React.ReactNode }> = {
  super_admin: { label: 'Super Administrateur', color: '#d4a20a', icon: <CrownOutlined /> },
  admin: { label: 'Administrateur', color: FB.blue },
  manager: { label: 'Manager', color: '#0891b2' },
  commercial: { label: 'Commercial', color: '#16a34a' },
  user: { label: 'Utilisateur', color: FB.textSecondary },
  support: { label: 'Support', color: '#7c3aed' },
  client: { label: 'Client', color: '#ea580c' },
  prestataire: { label: 'Prestataire', color: '#db2777' },
};

/* ── Facebook-style section card ────────────────────────────── */
const FBCard: React.FC<{
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
}> = ({ title, onEdit, children }) => (
  <div style={{
    background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
    padding: 16, marginBottom: 16,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 17, fontWeight: 700, color: FB.text }}>{title}</span>
      {onEdit && (
        <span
          onClick={onEdit}
          style={{
            width: 36, height: 36, borderRadius: '50%', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            background: 'transparent', transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = FB.bg)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <EditOutlined style={{ color: FB.textSecondary, fontSize: 16 }} />
        </span>
      )}
    </div>
    {children}
  </div>
);

/* ── Info line (icon + text) ─────────────────────────────────── */
const InfoLine: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
    <span style={{ color: FB.textSecondary, fontSize: 20, flexShrink: 0 }}>{icon}</span>
    <span style={{ fontSize: 15, color: FB.text, wordBreak: 'break-word' }}>{children}</span>
  </div>
);

/* ── Facebook Button ─────────────────────────────────────────── */
const FBButton: React.FC<{
  primary?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  mobileIconOnly?: boolean;
  isMobile?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}> = ({ primary, icon, children, mobileIconOnly, isMobile, onClick, style }) => {
  const [hover, setHover] = useState(false);
  const showLabel = !(mobileIconOnly && isMobile);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        height: 36, padding: showLabel && children ? '0 16px' : '0 12px',
        borderRadius: 6, border: 'none', cursor: 'pointer',
        fontSize: 15, fontWeight: 600, transition: 'background 0.15s',
        background: primary ? (hover ? FB.blueHover : FB.blue) : (hover ? FB.btnGrayHover : FB.btnGray),
        color: primary ? '#fff' : FB.text,
        flexShrink: 0,
        ...style,
      }}
    >
      {icon}{showLabel && children}
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════════
   PROFILE PAGE
   ═══════════════════════════════════════════════════════════════ */
const ProfilePage = () => {
  const { user, loading: userLoading, refetchUser, isSuperAdmin, currentOrganization, organizations, selectOrganization } = useAuth();
  const { api } = useAuthenticatedApi();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isMobile, width } = useScreenSize();

  const [profile, setProfile] = useState({ firstName: '', lastName: '', avatarUrl: '', address: '', vatNumber: '', phoneNumber: '' });
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('about');
  const [changingOrg, setChangingOrg] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.get('/api/profile').then((r: any) => { setProfile(r); setLoading(false); })
      .catch(() => { message.error('Impossible de charger le profil.'); setLoading(false); });
  }, [user, api]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', e.target.files[0]);
      const r: any = await api.post('/api/profile/avatar', fd);
      setProfile(p => ({ ...p, avatarUrl: r.avatarUrl }));
      message.success('Photo mise à jour !');
      refetchUser?.();
    } catch { message.error("Erreur lors du téléversement."); }
    finally { setAvatarUploading(false); }
  };

  const handleOrgChange = async (orgId: string) => {
    setChangingOrg(true);
    try { await selectOrganization(orgId); message.success('Organisation changée'); }
    catch { message.error("Erreur"); }
    finally { setChangingOrg(false); }
  };

  if (userLoading || loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><Spin size="large" /></div>;
  }

  const rl = ROLE_MAP[user?.role || 'user'] || { label: user?.role || 'Utilisateur', color: FB.textSecondary };
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Utilisateur';

  const tabs = [
    { key: 'about', label: 'À propos' },
    { key: 'activity', label: 'Activité' },
    { key: 'photos', label: 'Photos' },
  ];

  /* ── Responsive dimensions ─────────────────────────────────── */
  const coverH = isMobile ? 200 : 350;
  const avatarSize = isMobile ? 120 : 168;
  const avatarOverlap = isMobile ? 60 : 40;
  const nameFontSize = isMobile ? 24 : 32;
  const cameraBtnSize = isMobile ? 32 : 36;

  return (
    <div style={{ background: FB.bg, minHeight: '100vh' }}>

      {/* ════════ TOP WHITE SECTION (cover + name + tabs) ════════ */}
      <div style={{ background: FB.white, boxShadow: FB.shadow }}>
        <div style={{ maxWidth: 940, margin: '0 auto' }}>

          {/* Cover photo */}
          <div style={{
            height: coverH, borderRadius: isMobile ? 0 : '0 0 8px 8px', overflow: 'hidden',
            background: 'linear-gradient(135deg, #1a4951 0%, #2C5967 30%, #3d7a8a 60%, #4a9aad 100%)',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', bottom: isMobile ? 8 : 16, right: isMobile ? 8 : 16,
              background: 'rgba(0,0,0,0.5)', color: '#fff',
              padding: isMobile ? '4px 10px' : '6px 16px',
              borderRadius: 6, fontSize: isMobile ? 12 : 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <CameraOutlined />{!isMobile && ' Modifier la couverture'}
            </div>
          </div>

          {/* ─── MOBILE: avatar centré au-dessus du nom ─── */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px' }}>
              {/* Avatar centré, chevauchant la cover */}
              <div style={{ marginTop: -avatarOverlap, position: 'relative', zIndex: 2 }}>
                <Avatar
                  size={avatarSize}
                  src={profile.avatarUrl || undefined}
                  icon={!profile.avatarUrl ? <UserOutlined style={{ fontSize: 48 }} /> : undefined}
                  style={{
                    border: '4px solid white', background: '#2C5967',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: 48,
                  }}
                />
                <span
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: 4, right: 4,
                    width: cameraBtnSize, height: cameraBtnSize, borderRadius: '50%',
                    background: FB.btnGray,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', border: 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                >
                  {avatarUploading ? <Spin size="small" /> : <CameraOutlined style={{ fontSize: 14, color: FB.text }} />}
                </span>
                <input type="file" accept="image/*" onChange={handleAvatarChange} ref={fileInputRef} style={{ display: 'none' }} />
              </div>

              {/* Nom + rôle centré */}
              <h1 style={{
                fontSize: nameFontSize, fontWeight: 700, color: FB.text,
                margin: '8px 0 0', textAlign: 'center', lineHeight: 1.2,
              }}>{fullName}</h1>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
                flexWrap: 'wrap', justifyContent: 'center',
                fontSize: 14, color: FB.textSecondary,
              }}>
                <span style={{ color: rl.color, fontWeight: 600 }}>{rl.icon} {rl.label}</span>
                {currentOrganization && (
                  <>
                    <span>·</span>
                    <span><TeamOutlined style={{ marginRight: 4 }} />{currentOrganization.name}</span>
                  </>
                )}
              </div>

              {/* Mobile action row */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 12, width: '100%', justifyContent: 'center' }}>
                <FBButton primary icon={<SettingOutlined />} onClick={() => navigate('/settings')} isMobile={isMobile} mobileIconOnly>
                  Paramètres
                </FBButton>
                <FBButton icon={<EditOutlined />} onClick={() => navigate('/settings/profile')} isMobile={isMobile} mobileIconOnly>
                  Modifier
                </FBButton>
                <FBButton icon={<EllipsisOutlined />} />
              </div>
            </div>
          ) : (
            /* ─── DESKTOP: avatar à gauche, nom à côté ─── */
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', padding: '0 16px', position: 'relative' }}>
              <div style={{ marginTop: -avatarOverlap, position: 'relative', zIndex: 2 }}>
                <Avatar
                  size={avatarSize}
                  src={profile.avatarUrl || undefined}
                  icon={!profile.avatarUrl ? <UserOutlined style={{ fontSize: 64 }} /> : undefined}
                  style={{
                    border: '4px solid white', background: '#2C5967',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: 64,
                  }}
                />
                <span
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: 12, right: 12,
                    width: cameraBtnSize, height: cameraBtnSize, borderRadius: '50%',
                    background: FB.btnGray,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', border: 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                >
                  {avatarUploading ? <Spin size="small" /> : <CameraOutlined style={{ fontSize: 16, color: FB.text }} />}
                </span>
                <input type="file" accept="image/*" onChange={handleAvatarChange} ref={fileInputRef} style={{ display: 'none' }} />
              </div>

              <div style={{ marginLeft: 16, paddingBottom: 16, flex: 1, minWidth: 200 }}>
                <h1 style={{ fontSize: nameFontSize, fontWeight: 700, color: FB.text, margin: 0, lineHeight: 1.2 }}>{fullName}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap', fontSize: 15, color: FB.textSecondary }}>
                  <span style={{ color: rl.color, fontWeight: 600 }}>{rl.icon} {rl.label}</span>
                  {currentOrganization && (
                    <>
                      <span>·</span>
                      <span><TeamOutlined style={{ marginRight: 4 }} />{currentOrganization.name}</span>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, paddingBottom: 16, alignItems: 'flex-end' }}>
                <FBButton primary icon={<SettingOutlined />} onClick={() => navigate('/settings')}>Paramètres</FBButton>
                <FBButton icon={<EditOutlined />} onClick={() => navigate('/settings/profile')}>Modifier</FBButton>
                <FBButton icon={<EllipsisOutlined />} />
              </div>
            </div>
          )}

          {/* Separator */}
          <div style={{ borderTop: `1px solid ${FB.border}`, margin: '0 16px' }} />

          {/* Tabs — scrollable on mobile */}
          <div style={{
            display: 'flex', alignItems: 'center',
            padding: isMobile ? '0 8px' : '0 16px',
            overflowX: 'auto', WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none', scrollbarWidth: 'none',
          }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: isMobile ? '12px 12px' : '16px 16px',
                  fontSize: isMobile ? 14 : 15, fontWeight: 600, cursor: 'pointer',
                  background: 'none', border: 'none', whiteSpace: 'nowrap',
                  borderBottom: activeTab === tab.key ? '3px solid #1877f2' : '3px solid transparent',
                  color: activeTab === tab.key ? FB.blue : FB.textSecondary,
                  borderRadius: activeTab === tab.key ? 0 : '6px 6px 0 0',
                  transition: 'all 0.15s', flexShrink: 0,
                }}
                onMouseEnter={e => { if (activeTab !== tab.key) e.currentTarget.style.background = FB.bg; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ════════ BODY (gray background, responsive layout) ════════ */}
      <div style={{
        maxWidth: 940, margin: '0 auto',
        padding: isMobile ? '12px 8px 32px' : '16px 16px 40px',
      }}>
        {activeTab === 'about' && (
          <div style={{
            display: isMobile ? 'flex' : 'grid',
            flexDirection: isMobile ? 'column' : undefined,
            gridTemplateColumns: isMobile ? undefined : '360px 1fr',
            gap: 16, alignItems: 'start',
          }}>

            {/* ── LEFT COLUMN ── */}
            <div style={{ position: isMobile ? 'static' : 'sticky', top: 64, width: '100%' }}>
              {/* Informations personnelles */}
              <FBCard title="Informations personnelles" onEdit={() => navigate('/settings/profile')}>
                {profile.firstName && <InfoLine icon={<UserOutlined />}>{profile.firstName}</InfoLine>}
                {profile.lastName && <InfoLine icon={<UserOutlined />}>{profile.lastName}</InfoLine>}
                {profile.address && <InfoLine icon={<HomeOutlined />}>{profile.address}</InfoLine>}
                {!profile.firstName && !profile.lastName && !profile.address && (
                  <div style={{ padding: '12px 0', color: FB.textSecondary, fontSize: 14 }}>
                    Aucune information renseignée.
                    <span
                      onClick={() => navigate('/settings/profile')}
                      style={{ color: FB.blue, cursor: 'pointer', marginLeft: 4, fontWeight: 500 }}
                    >
                      Ajouter
                    </span>
                  </div>
                )}
              </FBCard>

              {/* Liens */}
              <FBCard title="Liens" onEdit={() => navigate('/settings/profile')}>
                {currentOrganization?.name && (
                  <InfoLine icon={<LinkOutlined />}>
                    <span style={{ color: FB.blue }}>{currentOrganization.name.toLowerCase().replace(/\s+/g, '')}.be</span>
                  </InfoLine>
                )}
                {profile.vatNumber && (
                  <InfoLine icon={<BankOutlined />}>TVA : {profile.vatNumber}</InfoLine>
                )}
                {!profile.vatNumber && !currentOrganization && (
                  <div style={{ padding: '12px 0', color: FB.textSecondary, fontSize: 14 }}>Aucun lien.</div>
                )}
              </FBCard>

              {/* Coordonnées */}
              <FBCard title="Coordonnées" onEdit={() => navigate('/settings/profile')}>
                <InfoLine icon={<MailOutlined />}>
                  <span>E-mail : <span style={{ color: FB.blue }}>{user?.email}</span></span>
                </InfoLine>
                {profile.phoneNumber && (
                  <InfoLine icon={<PhoneOutlined />}>
                    Numéro de téléphone : {profile.phoneNumber}
                  </InfoLine>
                )}
              </FBCard>

              {/* Rôle & Organisation */}
              <FBCard title="Rôle & Organisation">
                <InfoLine icon={<SafetyCertificateOutlined />}>
                  <span style={{ color: rl.color, fontWeight: 600 }}>{rl.icon} {rl.label}</span>
                </InfoLine>
                {currentOrganization && (
                  <InfoLine icon={<TeamOutlined />}>{currentOrganization.name}</InfoLine>
                )}
                {isSuperAdmin && (
                  <div style={{ marginTop: 4, fontSize: 13, color: FB.textSecondary }}>
                    Accès complet à toutes les fonctionnalités.
                  </div>
                )}
              </FBCard>

              {/* Organisations (super admin) */}
              {isSuperAdmin && organizations && organizations.length > 1 && (
                <FBCard title="Mes Organisations">
                  {organizations.map(org => {
                    const isActive = currentOrganization?.id === org.id;
                    return (
                      <div
                        key={org.id}
                        onClick={() => !isActive && !changingOrg && handleOrgChange(org.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px', borderRadius: 8, cursor: isActive ? 'default' : 'pointer',
                          background: isActive ? FB.activeBlue : 'transparent',
                          transition: 'background 0.15s',
                          opacity: changingOrg ? 0.5 : 1,
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = FB.bg; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: isActive ? FB.blue : FB.btnGray,
                          color: isActive ? '#fff' : FB.textSecondary,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700,
                        }}>
                          {org.name?.[0]?.toUpperCase() || <SwapOutlined />}
                        </div>
                        <span style={{ fontSize: 15, fontWeight: isActive ? 600 : 400, color: isActive ? FB.blue : FB.text }}>
                          {org.name}
                        </span>
                        {isActive && <span style={{ marginLeft: 'auto', fontSize: 13, color: FB.blue }}>Actif</span>}
                      </div>
                    );
                  })}
                </FBCard>
              )}
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div style={{ width: '100%' }}>
              {/* À la une */}
              <FBCard title="À la une">
                <div style={{
                  background: FB.bg, borderRadius: 8,
                  padding: isMobile ? 20 : 32,
                  textAlign: 'center', color: FB.textSecondary, fontSize: 15,
                }}>
                  Ajoutez des éléments à la une pour mettre en avant vos réalisations.
                </div>
              </FBCard>

              {/* Résumé */}
              <FBCard title="Résumé">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: 12,
                }}>
                  <div style={{ background: FB.bg, borderRadius: 8, padding: isMobile ? 16 : 20, textAlign: 'center' }}>
                    <TeamOutlined style={{ fontSize: 28, color: FB.blue }} />
                    <div style={{ fontSize: 15, fontWeight: 600, color: FB.text, marginTop: 8 }}>
                      {currentOrganization?.name || '-'}
                    </div>
                    <div style={{ fontSize: 13, color: FB.textSecondary }}>Organisation</div>
                  </div>
                  <div style={{ background: FB.bg, borderRadius: 8, padding: isMobile ? 16 : 20, textAlign: 'center' }}>
                    <SafetyCertificateOutlined style={{ fontSize: 28, color: rl.color }} />
                    <div style={{ fontSize: 15, fontWeight: 600, color: FB.text, marginTop: 8 }}>{rl.label}</div>
                    <div style={{ fontSize: 13, color: FB.textSecondary }}>Rôle</div>
                  </div>
                </div>
              </FBCard>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div style={{
            background: FB.white, borderRadius: 8, boxShadow: FB.shadow,
            padding: isMobile ? 20 : 32, textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: FB.text }}>Historique d'activité</div>
            <div style={{ fontSize: 15, color: FB.textSecondary, marginTop: 8 }}>
              L'historique de vos actions sera bientôt disponible ici.
            </div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div style={{
            background: FB.white, borderRadius: 8, boxShadow: FB.shadow,
            padding: isMobile ? 20 : 32, textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: FB.text }}>Photos</div>
            <div style={{ fontSize: 15, color: FB.textSecondary, marginTop: 8 }}>
              Vos photos de chantiers et projets apparaîtront ici.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
