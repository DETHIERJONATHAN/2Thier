import React, { useState, useEffect, useCallback } from 'react';
import { Spin, message } from 'antd';
import {
  EditOutlined,
  MailOutlined,
  SyncOutlined,
  SettingOutlined,
  CloseOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  UserOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { FB, SF } from '../../components/zhiive/ZhiiveTheme';
import { logger } from '../../lib/logger';

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

/* ── FB Modal ──────────────────────────────────────────────── */
const FBModal: React.FC<{
  open: boolean; onClose: () => void; title: React.ReactNode;
  children: React.ReactNode; footer?: React.ReactNode;
}> = ({ open, onClose, title, children, footer }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: SF.overlayDarkMd,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }} role="button" tabIndex={0} onClick={onClose}>
      <div role="button" tabIndex={0} onClick={e => e.stopPropagation()} style={{
        background: FB.white, borderRadius: FB.radius, width: '100%',
        maxWidth: 480, boxShadow: '0 8px 32px ${SF.overlayDarkSubtle}',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid ' + FB.border, flexShrink: 0,
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: FB.text }}>{title}</div>
          <div role="button" tabIndex={0} onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', background: FB.btnGray,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <CloseOutlined style={{ fontSize: 14, color: FB.textSecondary }} />
          </div>
        </div>
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid ' + FB.border, flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

interface UserEmailData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  organization: { id: string; name: string };
  emailAccount?: { emailAddress: string; domain: string; isConfigured: boolean };
  generatedEmail: string;
}

interface YandexConfig {
  username: string;
  password: string;
  host?: string;
  port?: number;
}

const OrganizationEmailSettings: React.FC = () => {
  const [users, setUsers] = useState<UserEmailData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState('');
  const [isYandexModalVisible, setIsYandexModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserEmailData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [yandexConfig, setYandexConfig] = useState<YandexConfig>({
    username: '', password: '', host: 'imap.yandex.com', port: 993,
  });

  const { api } = useAuthenticatedApi();
  const { user, selectedOrganization } = useAuth();
  const { isMobile } = useScreenSize();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (isAdmin && selectedOrganization) loadOrganizationUsers();
  }, [isAdmin, selectedOrganization]);

  const loadOrganizationUsers = useCallback(async () => {
    if (!selectedOrganization) { message.warning('Aucune organisation sélectionnée'); return; }
    setLoading(true);
    try {
      const response = await api.get(`/api/admin-password/users-emails?organizationId=${selectedOrganization.id}`);
      if (response.success && Array.isArray(response.data)) {
        setUsers(response.data.filter((u: UserEmailData) => u.organization.id === selectedOrganization.id));
      } else { throw new Error(response.message || 'Erreur'); }
    } catch (error) {
      logger.error('Erreur chargement:', error);
      message.error('Erreur lors du chargement des utilisateurs');
      setUsers([]);
    } finally { setLoading(false); }
  }, [api, selectedOrganization]);

  const handleSave = async (record: UserEmailData) => {
    try {
      await api.post('/api/admin-password/update-email-config', { userId: record.id, generatedEmail: editingEmail });
      message.success('Configuration email mise à jour');
      setEditingId(null);
      loadOrganizationUsers();
    } catch { message.error('Erreur lors de la sauvegarde'); }
  };

  const handleYandexConfig = (u: UserEmailData) => {
    setSelectedUser(u);
    setYandexConfig({ username: u.generatedEmail || '', password: '', host: 'imap.yandex.com', port: 993 });
    setShowPassword(false);
    setIsYandexModalVisible(true);
  };

  const handleYandexSave = async () => {
    if (!selectedUser || !yandexConfig.username || !yandexConfig.password) {
      message.error('Veuillez remplir tous les champs obligatoires'); return;
    }
    try {
      await api.post('/api/yandex/setup', { userId: selectedUser.id, config: yandexConfig });
      message.success('Configuration Yandex sauvegardée');
      setIsYandexModalVisible(false);
      loadOrganizationUsers();
    } catch { message.error('Erreur lors de la configuration Yandex'); }
  };

  const handleTestConnection = async (u: UserEmailData) => {
    try {
      message.loading('Test de connexion en cours...', 2);
      const response = await api.get(`/api/yandex/test?userId=${u.id}`);
      response.success ? message.success('Connexion email réussie !') : message.error('Échec : ' + (response.message || 'Erreur'));
    } catch { message.error('Erreur lors du test de connexion'); }
  };

  const handleSync = async (u: UserEmailData) => {
    try {
      message.loading('Synchronisation en cours...', 3);
      await api.post('/api/yandex/sync', { userId: u.id });
      message.success('Synchronisation terminée');
    } catch { message.error('Erreur lors de la synchronisation'); }
  };

  if (!isAdmin) return (
    <FBCard style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 15, color: FB.textSecondary }}>
        Vous n'avez pas les permissions nécessaires pour accéder à cette section.
      </div>
    </FBCard>
  );

  if (!selectedOrganization) return (
    <FBCard style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 15, color: FB.textSecondary }}>
        Veuillez sélectionner une organisation pour gérer les emails.
      </div>
    </FBCard>
  );

  return (
    <div>
      {/* Header */}
      <FBCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', background: FB.red,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <MailOutlined style={{ fontSize: 22, color: FB.white }} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: FB.text }}>
                Gestion des Emails
              </div>
              <div style={{ fontSize: 14, color: FB.textSecondary }}>
                {selectedOrganization.name} — Adresses email professionnelles
              </div>
            </div>
          </div>
          <button onClick={loadOrganizationUsers} disabled={loading} style={{
            padding: '8px 16px', borderRadius: 6, border: 'none', background: FB.blue,
            color: FB.white, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.7 : 1,
          }}>
            {loading ? <LoadingOutlined /> : <ReloadOutlined />} Actualiser
          </button>
        </div>
      </FBCard>

      {/* Info box */}
      <FBCard style={{ background: FB.blue + '08', border: '1px solid ' + FB.blue + '25' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <InfoCircleOutlined style={{ color: FB.blue, fontSize: 18, flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: FB.blue, marginBottom: 4 }}>Information</div>
            <div style={{ fontSize: 13, color: FB.blue, opacity: 0.85 }}>
              En tant qu'administrateur, vous pouvez configurer les emails de vos utilisateurs.
              Les adresses suivent le format : prénom.nom@{selectedOrganization.name?.toLowerCase()}.be
            </div>
          </div>
        </div>
      </FBCard>

      {/* Users List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : (
        <FBCard style={{ padding: 0 }}>
          {users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: FB.textSecondary }}>
              Aucun utilisateur trouvé dans votre organisation
            </div>
          ) : (
            users.map((u, i) => (
              <div key={u.id} style={{
                padding: '14px 16px',
                borderBottom: i < users.length - 1 ? '1px solid ' + FB.border : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: editingId === u.id ? 12 : 0 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', background: FB.blue + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <UserOutlined style={{ fontSize: 18, color: FB.blue }} />
                  </div>

                  {/* User info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: FB.text }}>{u.firstName} {u.lastName}</div>
                    <div style={{ fontSize: 12, color: FB.textSecondary }}>{u.email}</div>
                  </div>

                  {/* Pro email */}
                  {editingId !== u.id && !isMobile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 13,
                        color: u.generatedEmail ? FB.green : FB.textSecondary,
                      }}>
                        {u.generatedEmail || 'Non configuré'}
                      </span>
                      {u.emailAccount?.isConfigured && (
                        <span style={{
                          padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                          background: FB.green + '15', color: FB.green,
                        }}>
                          <CheckCircleOutlined style={{ marginRight: 3 }} />Configuré
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  {editingId !== u.id && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {[
                        { icon: <EditOutlined />, title: 'Modifier', onClick: () => { setEditingId(u.id); setEditingEmail(u.generatedEmail || ''); }, disabled: false },
                        { icon: <SettingOutlined />, title: 'Configurer Yandex', onClick: () => handleYandexConfig(u), disabled: !u.generatedEmail },
                        { icon: <MailOutlined />, title: 'Tester connexion', onClick: () => handleTestConnection(u), disabled: !u.emailAccount?.isConfigured },
                        { icon: <SyncOutlined />, title: 'Synchroniser', onClick: () => handleSync(u), disabled: !u.emailAccount?.isConfigured },
                      ].map((btn, j) => (
                        <button key={j} onClick={btn.onClick} disabled={btn.disabled} title={btn.title} style={{
                          width: 32, height: 32, borderRadius: '50%', border: 'none',
                          background: 'transparent', cursor: btn.disabled ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: btn.disabled ? 0.35 : 1, color: FB.blue,
                        }}>{btn.icon}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Editing row */}
                {editingId === u.id && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 52 }}>
                    <input
                      value={editingEmail}
                      onChange={e => setEditingEmail(e.target.value)}
                      placeholder="email@organisation.be"
                      style={{
                        flex: 1, border: '1px solid ' + FB.blue, borderRadius: 6,
                        padding: '8px 12px', fontSize: 14, color: FB.text, outline: 'none',
                        fontFamily: 'inherit', boxSizing: 'border-box',
                      }}
                    />
                    <button onClick={() => handleSave(u)} style={{
                      padding: '8px 14px', borderRadius: 6, border: 'none', background: FB.blue,
                      color: FB.white, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>Sauvegarder</button>
                    <button onClick={() => setEditingId(null)} style={{
                      padding: '8px 14px', borderRadius: 6, border: 'none', background: FB.btnGray,
                      color: FB.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>Annuler</button>
                  </div>
                )}
              </div>
            ))
          )}
        </FBCard>
      )}

      {/* ── Yandex Modal ── */}
      <FBModal
        open={isYandexModalVisible}
        onClose={() => setIsYandexModalVisible(false)}
        title={<><SettingOutlined style={{ marginRight: 8 }} />Configuration Yandex</>}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setIsYandexModalVisible(false)} style={{
              padding: '8px 16px', borderRadius: 6, border: 'none', background: FB.btnGray,
              color: FB.text, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>Annuler</button>
            <button onClick={handleYandexSave} style={{
              padding: '8px 20px', borderRadius: 6, border: 'none', background: FB.blue,
              color: FB.white, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>Sauvegarder</button>
          </div>
        }
      >
        {[
          { label: "Nom d'utilisateur Yandex", value: yandexConfig.username, key: 'username', placeholder: 'votre-email@yandex.com', disabled: false, isPassword: false },
          { label: 'Mot de passe', value: yandexConfig.password, key: 'password', placeholder: 'Votre mot de passe Yandex', disabled: false, isPassword: true },
          { label: 'Serveur IMAP', value: yandexConfig.host || '', key: 'host', placeholder: '', disabled: true, isPassword: false },
          { label: 'Port', value: String(yandexConfig.port || ''), key: 'port', placeholder: '', disabled: true, isPassword: false },
        ].map((field) => (
          <div key={field.key} style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 6 }}>
              {field.label}
            </label>
            <div style={{
              display: 'flex', alignItems: 'center',
              border: '1px solid ' + FB.border, borderRadius: 6,
              background: field.disabled ? FB.btnGray : FB.white,
            }}>
              <input
                type={field.isPassword && !showPassword ? 'password' : field.key === 'port' ? 'number' : 'text'}
                value={field.value}
                onChange={e => {
                  const v = e.target.value;
                  if (field.key === 'username') setYandexConfig(c => ({ ...c, username: v }));
                  else if (field.key === 'password') setYandexConfig(c => ({ ...c, password: v }));
                  else if (field.key === 'host') setYandexConfig(c => ({ ...c, host: v }));
                  else if (field.key === 'port') setYandexConfig(c => ({ ...c, port: parseInt(v) || 0 }));
                }}
                placeholder={field.placeholder}
                disabled={field.disabled}
                style={{
                  flex: 1, border: 'none', outline: 'none', padding: '10px 12px',
                  fontSize: 15, color: FB.text, background: 'transparent',
                  fontFamily: 'inherit',
                }}
              />
              {field.isPassword && (
                <div role="button" tabIndex={0} onClick={() => setShowPassword(!showPassword)} style={{
                  padding: '0 12px', cursor: 'pointer', color: FB.textSecondary,
                }}>
                  {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                </div>
              )}
            </div>
          </div>
        ))}
      </FBModal>
    </div>
  );
};

export default OrganizationEmailSettings;
