import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { Spin, message } from 'antd';
import { FB, SF } from '../../components/zhiive/ZhiiveTheme';
import {
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
} from '@ant-design/icons';

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
  checked: boolean;
  onChange: (val: boolean) => void;
  size?: 'default' | 'small';
}> = ({ checked, onChange, size = 'default' }) => {
  const isSmall = size === 'small';
  const w = isSmall ? 36 : 44;
  const h = isSmall ? 20 : 24;
  const dot = isSmall ? 16 : 20;
  const pad = 2;
  return (
    <div
      role="button" tabIndex={0} onClick={() => onChange(!checked)}
      style={{
        width: w, height: h, borderRadius: h,
        background: checked ? FB.blue : '#bec3c9',
        cursor: 'pointer', position: 'relative',
        transition: 'background 0.25s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: pad, left: checked ? w - dot - pad : pad,
        width: dot, height: dot, borderRadius: '50%',
        background: FB.white,
        boxShadow: '0 1px 3px ${SF.overlayDark}',
        transition: 'left 0.25s',
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

const GoogleSettings: React.FC = () => {
  const { currentOrganization, isSuperAdmin } = useAuth();
  const { api } = useAuthenticatedApi();
  const { isMobile } = useScreenSize();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [expandConfig, setExpandConfig] = useState(false);

  const orgId = currentOrganization?.id;

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const r = await api.get(`/api/organizations/${orgId}/google-workspace/config`);
        if (r.success) setConfig(r.data);
      } catch (e) { console.error('Erreur config GW:', e); }
      finally { setLoading(false); }
    })();
  }, [orgId, api]);

  const handleTest = async () => {
    setTesting(true);
    try {
      const r = await api.post(`/api/organizations/${orgId}/google-workspace/test`);
      r.success ? message.success('Connexion Google Workspace réussie !') : message.error(r.message || 'Échec');
    } catch { message.error('Erreur lors du test'); }
    finally { setTesting(false); }
  };

  const handleToggle = async (mod: string, on: boolean) => {
    try {
      const r = await api.post(`/api/organizations/${orgId}/google-workspace/config`, {
        ...config, [`${mod}Enabled`]: on,
      });
      if (r.success) { setConfig(r.data); message.success(`${mod} ${on ? 'activé' : 'désactivé'}`); }
    } catch { message.error('Erreur lors de la mise à jour'); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spin size="large" /></div>
  );

  return (
    <div>
      {/* Header */}
      <FBCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: '#4285f4',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <GoogleOutlined style={{ fontSize: 28, color: FB.white }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: FB.text }}>Google Workspace</div>
            <div style={{ fontSize: 14, color: FB.textSecondary }}>Configuration de l'intégration Google Workspace</div>
          </div>
          <div style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
            background: config?.enabled ? '#e6f4ea' : FB.btnGray,
            color: config?.enabled ? '#1e8e3e' : FB.textSecondary,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {config?.enabled ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            {config?.enabled ? 'Activé' : 'Non configuré'}
          </div>
        </div>
      </FBCard>

      {config && (
        <>
          {/* Service Account Config */}
          <FBCard>
            <div
              role="button" tabIndex={0} onClick={() => setExpandConfig(!expandConfig)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', padding: '4px 0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <SettingOutlined style={{ fontSize: 18, color: FB.textSecondary }} />
                <span style={{ fontSize: 16, fontWeight: 600, color: FB.text }}>Configuration Service Account</span>
              </div>
              <RightOutlined style={{
                fontSize: 12, color: FB.textSecondary,
                transform: expandConfig ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }} />
            </div>

            {expandConfig && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid ' + FB.border }}>
                {[
                  { label: 'Domaine', value: config.domain },
                  { label: 'Email admin', value: config.adminEmail },
                  { label: 'Service Account', value: config.serviceAccountEmail },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? '1px solid ' + FB.border : 'none' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: FB.text }}>{item.label}</span>
                    <span style={{ fontSize: 13, color: item.value ? FB.text : FB.textSecondary, maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>
                      {item.value || 'Non configuré'}
                    </span>
                  </div>
                ))}
                <button
                  onClick={handleTest}
                  disabled={testing}
                  style={{
                    marginTop: 16, padding: '8px 20px', borderRadius: 6,
                    border: '1px solid ' + FB.blue, background: 'transparent',
                    color: FB.blue, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                    opacity: testing ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <ReloadOutlined spin={testing} /> Tester la connexion
                </button>
              </div>
            )}
          </FBCard>

          {/* Modules Grid */}
          {config.enabled && (
            <FBCard>
              <div style={{ fontSize: 16, fontWeight: 700, color: FB.text, marginBottom: 16 }}>Modules actifs</div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr',
                gap: 12,
              }}>
                {['gmail', 'calendar', 'drive', 'meet', 'docs', 'sheets'].map(mod => {
                  const enabled = config[`${mod}Enabled`];
                  const col = MODULE_COLORS[mod];
                  return (
                    <div key={mod} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', borderRadius: FB.radius,
                      background: enabled ? col + '10' : FB.btnGray,
                      border: '1px solid ' + (enabled ? col + '30' : 'transparent'),
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18, color: enabled ? col : FB.textSecondary }}>
                          {MODULE_ICONS[mod]}
                        </span>
                        <span style={{
                          fontSize: 14, fontWeight: 600, textTransform: 'capitalize',
                          color: enabled ? FB.text : FB.textSecondary,
                        }}>
                          {mod}
                        </span>
                      </div>
                      <FBToggle
                        checked={!!enabled}
                        onChange={checked => handleToggle(mod, checked)}
                        size="small"
                      />
                    </div>
                  );
                })}
              </div>
            </FBCard>
          )}

          {/* Advanced link */}
          {isSuperAdmin && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <a href="/admin/google-workspace" style={{
                fontSize: 14, color: FB.blue, textDecoration: 'none', fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <SettingOutlined /> Configuration avancée
              </a>
            </div>
          )}
        </>
      )}

      {!config && (
        <FBCard style={{ textAlign: 'center', padding: 40 }}>
          <GoogleOutlined style={{ fontSize: 48, color: FB.border, marginBottom: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: FB.text, marginBottom: 8 }}>
            Google Workspace non configuré
          </div>
          <div style={{ fontSize: 14, color: FB.textSecondary }}>
            Contactez votre Keeper pour configurer l'intégration.
          </div>
        </FBCard>
      )}
    </div>
  );
};

export default GoogleSettings;
