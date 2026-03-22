import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { Spin, message } from 'antd';
import {
  BankOutlined,
  SaveOutlined,
  LoadingOutlined,
  GoogleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  MailOutlined,
  CalendarOutlined,
  CloudOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  TableOutlined,
  RightOutlined,
  CameraOutlined,
} from '@ant-design/icons';

const FB = {
  bg: '#f0f2f5', white: '#ffffff', text: '#050505', textSecondary: '#65676b',
  blue: '#1877f2', blueHover: '#166fe5', border: '#ced0d4',
  btnGray: '#e4e6eb', btnGrayHover: '#d8dadf', green: '#42b72a',
  shadow: '0 1px 2px rgba(0,0,0,0.1)', radius: 8,
};

const useScreenSize = () => {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  return { isMobile: w < 768 };
};

const FBCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow, padding: 20, marginBottom: 16, ...style }}>
    {children}
  </div>
);

/* ── Facebook Toggle ───────────────────────────────────────── */
const FBToggle: React.FC<{
  checked: boolean; onChange: (v: boolean) => void; size?: 'default' | 'small';
}> = ({ checked, onChange, size = 'default' }) => {
  const s = size === 'small';
  const w = s ? 36 : 44; const h = s ? 20 : 24; const d = s ? 16 : 20; const p = 2;
  return (
    <div onClick={() => onChange(!checked)} style={{
      width: w, height: h, borderRadius: h, background: checked ? FB.blue : '#bec3c9',
      cursor: 'pointer', position: 'relative', transition: 'background 0.25s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: p, left: checked ? w - d - p : p,
        width: d, height: d, borderRadius: '50%', background: FB.white,
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.25s',
      }} />
    </div>
  );
};

const MODULE_ICONS: Record<string, React.ReactNode> = {
  gmail: <MailOutlined />, calendar: <CalendarOutlined />, drive: <CloudOutlined />,
  meet: <VideoCameraOutlined />, docs: <FileTextOutlined />, sheets: <TableOutlined />,
};

const MODULE_COLORS: Record<string, string> = {
  gmail: '#ea4335', calendar: '#4285f4', drive: '#34a853',
  meet: '#00897b', docs: '#4285f4', sheets: '#0f9d58',
};

/* ── Google Workspace Section ──────────────────────────────── */
const GoogleWorkspaceSection: React.FC<{ organizationId: string }> = ({ organizationId }) => {
  const { api } = useAuthenticatedApi();
  const { isMobile } = useScreenSize();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [expandConfig, setExpandConfig] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/api/organizations/${organizationId}/google-workspace/config`);
        if (r.success) setConfig(r.data);
      } catch (e) { console.error('Erreur config GW:', e); }
      finally { setLoading(false); }
    })();
  }, [organizationId, api]);

  const handleTest = async () => {
    setTesting(true);
    try {
      const r = await api.post(`/api/organizations/${organizationId}/google-workspace/test`);
      r.success ? message.success('Connexion réussie !') : message.error(r.message || 'Échec');
    } catch { message.error('Erreur lors du test'); }
    finally { setTesting(false); }
  };

  const handleToggle = async (mod: string, on: boolean) => {
    try {
      const r = await api.post(`/api/organizations/${organizationId}/google-workspace/config`, {
        ...config, [`${mod}Enabled`]: on,
      });
      if (r.success) { setConfig(r.data); message.success(`${mod} ${on ? 'activé' : 'désactivé'}`); }
    } catch { message.error('Erreur lors de la mise à jour'); }
  };

  if (loading) return (
    <FBCard style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></FBCard>
  );

  return (
    <>
      <FBCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: config ? 0 : 0 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: '#4285f4',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <GoogleOutlined style={{ fontSize: 24, color: FB.white }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: FB.text }}>Google Workspace</div>
            <div style={{ fontSize: 13, color: FB.textSecondary }}>Intégration Google Workspace</div>
          </div>
          <div style={{
            padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600,
            background: config?.enabled ? '#e6f4ea' : FB.btnGray,
            color: config?.enabled ? '#1e8e3e' : FB.textSecondary,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {config?.enabled ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            {config?.enabled ? 'Activé' : 'Non configuré'}
          </div>
        </div>
      </FBCard>

      {config && (
        <>
          <FBCard>
            <div onClick={() => setExpandConfig(!expandConfig)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <SettingOutlined style={{ color: FB.textSecondary }} />
                <span style={{ fontSize: 15, fontWeight: 600, color: FB.text }}>Configuration Service Account</span>
              </div>
              <RightOutlined style={{
                fontSize: 11, color: FB.textSecondary,
                transform: expandConfig ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s',
              }} />
            </div>
            {expandConfig && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid ' + FB.border }}>
                {[
                  { label: 'Domaine', value: config.domain },
                  { label: 'Email admin', value: config.adminEmail },
                  { label: 'Service Account', value: config.serviceAccountEmail },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: i < 2 ? '1px solid ' + FB.border : 'none',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: FB.text }}>{item.label}</span>
                    <span style={{ fontSize: 12, color: item.value ? FB.text : FB.textSecondary, maxWidth: '55%', textAlign: 'right', wordBreak: 'break-all' }}>
                      {item.value || 'Non configuré'}
                    </span>
                  </div>
                ))}
                <button onClick={handleTest} disabled={testing} style={{
                  marginTop: 12, padding: '7px 16px', borderRadius: 6, border: '1px solid ' + FB.blue,
                  background: 'transparent', color: FB.blue, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  opacity: testing ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <ReloadOutlined spin={testing} /> Tester la connexion
                </button>
              </div>
            )}
          </FBCard>

          {config.enabled && (
            <FBCard>
              <div style={{ fontSize: 15, fontWeight: 700, color: FB.text, marginBottom: 12 }}>Modules actifs</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10 }}>
                {['gmail', 'calendar', 'drive', 'meet', 'docs', 'sheets'].map(mod => {
                  const enabled = config[`${mod}Enabled`];
                  const col = MODULE_COLORS[mod];
                  return (
                    <div key={mod} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px', borderRadius: FB.radius,
                      background: enabled ? col + '10' : FB.btnGray,
                      border: '1px solid ' + (enabled ? col + '30' : 'transparent'),
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16, color: enabled ? col : FB.textSecondary }}>{MODULE_ICONS[mod]}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize', color: enabled ? FB.text : FB.textSecondary }}>{mod}</span>
                      </div>
                      <FBToggle checked={!!enabled} onChange={v => handleToggle(mod, v)} size="small" />
                    </div>
                  );
                })}
              </div>
            </FBCard>
          )}
        </>
      )}

      {!config && (
        <FBCard style={{ textAlign: 'center', padding: 32 }}>
          <GoogleOutlined style={{ fontSize: 40, color: FB.border, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: FB.text }}>Google Workspace non configuré</div>
          <div style={{ fontSize: 13, color: FB.textSecondary }}>Contactez votre administrateur système.</div>
        </FBCard>
      )}
    </>
  );
};

/* ── Main Component ────────────────────────────────────────── */
const OrganizationSettings: React.FC = () => {
  const { currentOrganization, user, refetchUser } = useAuth();
  const { api } = useAuthenticatedApi();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const userRole = user?.role;
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const orgLogo = (currentOrganization as any)?.logoUrl || null;

  useEffect(() => {
    if (currentOrganization) setName(currentOrganization.name);
  }, [currentOrganization]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrganization) return;
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const resp: any = await api.post(`/api/organizations/${currentOrganization.id}/logo`, formData);
      if (resp.success) {
        message.success('Logo mis à jour !');
        if (refetchUser) await refetchUser();
      }
    } catch {
      message.error("Erreur lors de l'upload du logo.");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (!currentOrganization) {
      message.error("Impossible de trouver les informations de l'organisation.");
      setIsLoading(false);
      return;
    }
    try {
      const response = await api.patch(`/api/organizations/${currentOrganization.id}`, { name });
      if (response.success) {
        message.success("Le nom de l'organisation a été mis à jour.");
        if (refetchUser) await refetchUser();
      } else {
        throw new Error(response.message || "Une erreur est survenue.");
      }
    } catch (error: any) {
      message.error(error.message || "Erreur lors de la mise à jour.");
    } finally { setIsLoading(false); }
  };

  if (!currentOrganization) return (
    <FBCard style={{ textAlign: 'center', padding: 40 }}>
      <BankOutlined style={{ fontSize: 40, color: FB.border, marginBottom: 12 }} />
      <div style={{ fontSize: 16, fontWeight: 600, color: FB.text }}>Paramètres de l'organisation</div>
      <div style={{ fontSize: 14, color: FB.textSecondary }}>Chargement ou aucune organisation associée.</div>
    </FBCard>
  );

  return (
    <div>
      {/* Header */}
      <FBCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 64, height: 64, borderRadius: '50%', position: 'relative',
              background: orgLogo ? 'transparent' : FB.blue,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              overflow: 'hidden', cursor: isAdmin ? 'pointer' : 'default',
            }}
            onClick={() => isAdmin && logoInputRef.current?.click()}
            title={isAdmin ? 'Cliquer pour changer le logo' : undefined}
          >
            {orgLogo ? (
              <img src={orgLogo} alt={currentOrganization.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              <BankOutlined style={{ fontSize: 28, color: FB.white }} />
            )}
            {isAdmin && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0'; }}
              >
                {logoUploading ? <LoadingOutlined style={{ color: '#fff', fontSize: 20 }} /> : <CameraOutlined style={{ color: '#fff', fontSize: 20 }} />}
              </div>
            )}
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            style={{ display: 'none' }}
            onChange={handleLogoUpload}
          />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: FB.text }}>Paramètres de l'organisation</div>
            <div style={{ fontSize: 14, color: FB.textSecondary }}>Configurez les informations de {currentOrganization.name}</div>
          </div>
        </div>
      </FBCard>

      {/* Organization Name */}
      <FBCard>
        <div style={{ fontSize: 16, fontWeight: 700, color: FB.text, marginBottom: 14 }}>Nom de l'organisation</div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 6 }}>
              Nom de l'organisation
            </label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)} required disabled={!isAdmin}
              style={{
                width: '100%', maxWidth: 480, border: '1px solid ' + FB.border, borderRadius: 6,
                padding: '10px 12px', fontSize: 15, color: FB.text, outline: 'none', fontFamily: 'inherit',
                background: isAdmin ? FB.white : FB.btnGray, boxSizing: 'border-box',
              }}
            />
          </div>
          <button type="submit"
            disabled={isLoading || name === currentOrganization.name || !isAdmin}
            style={{
              padding: '9px 20px', borderRadius: 6, border: 'none',
              background: (isLoading || name === currentOrganization.name || !isAdmin) ? FB.btnGray : FB.blue,
              color: (isLoading || name === currentOrganization.name || !isAdmin) ? FB.textSecondary : FB.white,
              fontSize: 14, fontWeight: 600, cursor: (isLoading || name === currentOrganization.name || !isAdmin) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {isLoading ? <LoadingOutlined /> : <SaveOutlined />}
            {isLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </form>
      </FBCard>

      {/* Google Workspace */}
      {isAdmin && (
        <GoogleWorkspaceSection organizationId={currentOrganization.id} />
      )}
    </div>
  );
};

export default OrganizationSettings;
