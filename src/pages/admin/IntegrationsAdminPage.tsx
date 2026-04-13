import { FB } from '../../components/zhiive/ZhiiveTheme';
import { useEffect, useState, useCallback, useMemo, FC, FormEvent } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { message as antdMessage } from 'antd';

// ── Facebook Design Tokens ──
// ── Responsive Hook ──
function useScreenSize() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return { isMobile: w < 768, width: w };
}

// ── FBToggle ──
const FBToggle = ({ checked, onChange, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) => (
  <div onClick={() => !disabled && onChange(!checked)} style={{
    width: 44, height: 24, borderRadius: 24, cursor: disabled ? 'not-allowed' : 'pointer',
    background: checked ? FB.green : '#ccc', transition: 'background .2s', position: 'relative',
    opacity: disabled ? 0.5 : 1,
  }}>
    <div style={{
      width: 20, height: 20, borderRadius: '50%', background: '#fff',
      position: 'absolute', top: 2, left: checked ? 22 : 2,
      transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    }} />
  </div>
);

// ── Types ──
interface IntegrationSetting {
  type: string;
  enabled: boolean;
  config: unknown;
}

// ── Modal sub-component ──
const IntegrationSettingsModal: FC<{
  isOpen: boolean; onClose: () => void; onSave: (s: IntegrationSetting) => void;
  integrationType: 'mail' | 'telnyx' | null; initialConfig: unknown;
}> = ({ isOpen, onClose, onSave, integrationType, initialConfig }) => {
  const [mailConfig, setMailConfig] = useState({ host: '', port: 587, login: '', password: '' });
  const [telnyxConfig, setTelnyxConfig] = useState({ apiKey: '' });

  useEffect(() => {
    if (integrationType === 'mail') setMailConfig({ host: '', port: 587, login: '', password: '', ...initialConfig });
    if (integrationType === 'telnyx') setTelnyxConfig({ apiKey: '', ...initialConfig });
  }, [initialConfig, integrationType]);

  if (!isOpen || !integrationType) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (integrationType === 'mail') {
      const c = { ...mailConfig }; if (!(c as any).password) delete (c as any).password;
      onSave({ type: 'mail', config: c, enabled: true });
    } else {
      const c = { ...telnyxConfig }; if (!c.apiKey) delete (c as any).apiKey;
      onSave({ type: 'telnyx', config: c, enabled: true });
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', border: `1px solid ${FB.border}`, borderRadius: FB.radius,
    padding: '10px 12px', fontSize: 14, outline: 'none', background: FB.bg,
  };
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 4, display: 'block' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ background: FB.white, borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.2)', width: '90%', maxWidth: 500, padding: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: FB.text, marginBottom: 20 }}>
          {integrationType === 'mail' ? '📧 Configuration Email (SMTP)' : '📞 Configuration Telnyx'}
        </div>
        <form onSubmit={handleSubmit}>
          {integrationType === 'mail' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div><label style={labelStyle}>Hôte SMTP</label><input type="text" value={mailConfig.host} onChange={e => setMailConfig({ ...mailConfig, host: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>Port SMTP</label><input type="number" value={mailConfig.port} onChange={e => setMailConfig({ ...mailConfig, port: parseInt(e.target.value) || 587 })} style={inputStyle} /></div>
              <div><label style={labelStyle}>Login/Email</label><input type="text" value={mailConfig.login} onChange={e => setMailConfig({ ...mailConfig, login: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>Mot de passe</label><input type="password" placeholder="Laisser vide pour ne pas changer" onChange={e => setMailConfig({ ...mailConfig, password: e.target.value })} style={inputStyle} /></div>
            </div>
          )}
          {integrationType === 'telnyx' && (
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Clé API Telnyx</label>
              <input type="password" value={telnyxConfig.apiKey} placeholder="Laisser vide pour ne pas changer" onChange={e => setTelnyxConfig({ apiKey: e.target.value })} style={inputStyle} />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={{
              background: FB.btnGray, border: 'none', borderRadius: FB.radius, padding: '10px 20px',
              cursor: 'pointer', fontWeight: 600, fontSize: 14, color: FB.text,
            }}>Annuler</button>
            <button type="submit" style={{
              background: FB.blue, border: 'none', borderRadius: FB.radius, padding: '10px 20px',
              cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#fff',
            }}>Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ══════════════════════════════════════
// Main Component
// ══════════════════════════════════════
const IntegrationsAdminPage: FC = () => {
  const { user, can } = useAuth();
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook, []);
  const { isMobile } = useScreenSize();
  const [integrations, setIntegrations] = useState<IntegrationSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentIntegration, setCurrentIntegration] = useState<'mail' | 'telnyx' | null>(null);
  const [initialConfig, setInitialConfig] = useState<any>({});

  const organizationId = user?.currentOrganization?.id;

  const fetchIntegrations = useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const result = await api.get('/integrations') as unknown;
      if (result.success) {
        setIntegrations(result.data || []);
      } else {
        antdMessage.error(result.message || 'Erreur lors de la récupération des intégrations.');
      }
    } catch {
      antdMessage.error('Impossible de charger les intégrations.');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, api]);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  const handleOpenModal = (type: 'mail' | 'telnyx') => {
    const existing = integrations.find(i => i.type === type);
    setInitialConfig(existing?.config || {});
    setCurrentIntegration(type);
    setIsModalOpen(true);
  };

  const handleSave = async (settings: IntegrationSetting) => {
    if (!organizationId) return;
    try {
      const result = await api.post('/integrations', {
        type: settings.type,
        config: settings.config,
        enabled: true,
      }) as unknown;
      if (result.success) {
        antdMessage.success(`Intégration ${settings.type} mise à jour.`);
        fetchIntegrations();
      } else {
        antdMessage.error(result.message || 'Erreur lors de la sauvegarde.');
      }
    } catch {
      antdMessage.error('Une erreur est survenue.');
    }
    setIsModalOpen(false);
  };

  const handleToggle = async (type: string, enabled: boolean) => {
    if (!organizationId) return;
    try {
      const result = await api.post('/integrations', {
        type,
        enabled,
      }) as unknown;
      if (result.success) {
        antdMessage.success(`Intégration ${type} ${enabled ? 'activée' : 'désactivée'}.`);
        fetchIntegrations();
      } else {
        antdMessage.error(result.message || 'Erreur lors du changement de statut.');
      }
    } catch {
      antdMessage.error('Une erreur est survenue.');
    }
  };

  const canManageIntegrations = can && can('integration:manage');

  if (isLoading) {
    return (
      <div style={{ width: '100%', minHeight: '100vh', background: FB.bg, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ color: FB.textSecondary }}>Chargement des intégrations...</div>
        </div>
      </div>
    );
  }

  const integrationCards = [
    {
      type: 'mail' as const,
      icon: '📧',
      title: 'Intégration Email',
      description: 'Connectez une boîte mail pour envoyer des emails depuis le CRM.',
      color: '#EA4335',
    },
    {
      type: 'telnyx' as const,
      icon: '📞',
      title: 'Intégration Telnyx',
      description: 'Connectez Telnyx pour les fonctionnalités SMS et téléphonie.',
      color: '#722ed1',
    },
  ];

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: FB.bg, padding: isMobile ? '12px 8px' : '20px 24px' }}>
      {/* Header */}
      <div style={{
        background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
        padding: isMobile ? 16 : 24, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🔗</span>
          <div>
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: FB.text }}>
              Gestion des Intégrations
            </div>
            <div style={{ color: FB.textSecondary, fontSize: 14 }}>
              Configurez les services externes connectés à votre CRM
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16,
      }}>
        <div style={{
          background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow, padding: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e7f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📊</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: FB.text }}>{integrations.length}</div>
            <div style={{ fontSize: 12, color: FB.textSecondary }}>Intégrations configurées</div>
          </div>
        </div>
        <div style={{
          background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow, padding: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f0fff4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✅</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: FB.green }}>{integrations.filter(i => i.enabled).length}</div>
            <div style={{ fontSize: 12, color: FB.textSecondary }}>Intégrations actives</div>
          </div>
        </div>
      </div>

      {/* Integration Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {integrationCards.map(card => {
          const integration = integrations.find(i => i.type === card.type);
          const isEnabled = integration?.enabled || false;
          const isConfigured = !!integration;

          return (
            <div key={card.type} style={{
              background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
              padding: isMobile ? 16 : 20, border: `1px solid ${isEnabled ? FB.green : FB.border}`,
              transition: 'border-color .2s',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center',
                flexDirection: isMobile ? 'column' : 'row', gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 12, background: FB.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                  }}>{card.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: FB.text }}>{card.title}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                        background: isConfigured ? (isEnabled ? '#e6ffed' : '#fff8e1') : FB.bg,
                        color: isConfigured ? (isEnabled ? FB.green : FB.orange) : FB.textSecondary,
                      }}>{isConfigured ? (isEnabled ? 'Actif' : 'Désactivé') : 'Non configuré'}</span>
                    </div>
                    <div style={{ fontSize: 13, color: FB.textSecondary, marginTop: 4 }}>{card.description}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <button
                    onClick={() => handleOpenModal(card.type)}
                    disabled={!canManageIntegrations}
                    style={{
                      background: FB.blue, border: 'none', borderRadius: FB.radius, padding: '8px 18px',
                      cursor: !canManageIntegrations ? 'not-allowed' : 'pointer',
                      fontWeight: 600, fontSize: 14, color: '#fff',
                      opacity: !canManageIntegrations ? 0.5 : 1,
                    }}
                    onMouseEnter={e => { if (canManageIntegrations) e.currentTarget.style.background = FB.blueHover; }}
                    onMouseLeave={e => { e.currentTarget.style.background = FB.blue; }}
                  >
                    ⚙️ Configurer
                  </button>
                  <FBToggle
                    checked={isEnabled}
                    onChange={val => handleToggle(card.type, val)}
                    disabled={!canManageIntegrations}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <IntegrationSettingsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        integrationType={currentIntegration}
        initialConfig={initialConfig}
      />
    </div>
  );
};

export default IntegrationsAdminPage;
