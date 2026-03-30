import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { Spin, message } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  UserOutlined,
  CameraOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  BankOutlined,
  CrownOutlined,
  TeamOutlined,
  SaveOutlined,
  LoadingOutlined,
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

const roleLabel = (role?: string) => {
  const map: Record<string, { label: string; color: string }> = {
    super_admin: { label: 'Super Keeper', color: '#f5a623' },
    admin: { label: 'Keeper', color: FB.blue },
    manager: { label: 'Manager', color: '#13c2c2' },
    commercial: { label: 'Commercial', color: FB.green },
    user: { label: 'Utilisateur', color: FB.textSecondary },
    support: { label: 'Support', color: '#722ed1' },
    client: { label: 'Client', color: '#fa8c16' },
    prestataire: { label: 'Prestataire', color: '#eb2f96' },
  };
  return map[role || 'user'] || { label: role || 'Utilisateur', color: FB.textSecondary };
};

/* ── FB Input ──────────────────────────────────────────────── */
const FBInput: React.FC<{
  icon?: React.ReactNode; label: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  disabled?: boolean; type?: string;
}> = ({ icon, label, value, onChange, placeholder, disabled, type }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 6 }}>{label}</label>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      border: '1px solid ' + FB.border, borderRadius: 6, padding: '10px 12px',
      background: disabled ? FB.btnGray : FB.white,
      transition: 'border-color 0.2s',
    }}>
      {icon && <span style={{ color: FB.textSecondary, fontSize: 16, flexShrink: 0 }}>{icon}</span>}
      <input
        type={type || 'text'}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          flex: 1, border: 'none', outline: 'none', fontSize: 15, color: FB.text,
          background: 'transparent', fontFamily: 'inherit',
        }}
      />
    </div>
  </div>
);

const ProfileSettings: React.FC = () => {
  const { user, refetchUser, currentOrganization } = useAuth();
  const { api } = useAuthenticatedApi();
  const { isMobile } = useScreenSize();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [language, setLanguageState] = useState('fr');
  const { i18n } = useTranslation();

  useEffect(() => {
    if (user) {
      api.get('/api/profile').then((response: any) => {
        setFirstName(response.firstName || '');
        setLastName(response.lastName || '');
        setAddress(response.address || '');
        setVatNumber(response.vatNumber || '');
        setPhoneNumber(response.phoneNumber || '');
        setAvatarUrl(response.avatarUrl || '');
        const lang = response.language || 'fr';
        setLanguageState(lang);
        // Sync i18n with user's saved preference
        if (i18n.language !== lang) i18n.changeLanguage(lang);
        setLoading(false);
      }).catch(() => {
        message.error('Impossible de charger le profil.');
        setLoading(false);
      });
    }
  }, [user, api]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', e.target.files[0]);
      const response: any = await api.post('/api/profile/avatar', formData);
      setAvatarUrl(response.avatarUrl);
      message.success('Photo mise à jour !');
      if (refetchUser) refetchUser();
    } catch {
      message.error("Erreur lors du téléversement.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      message.error('Le prénom et le nom sont requis.');
      return;
    }
    setSaving(true);
    try {
      const result: any = await api.put('/api/profile', { firstName, lastName, address, vatNumber, phoneNumber, language });
      setFirstName(result.firstName || firstName);
      setLastName(result.lastName || lastName);
      setAddress(result.address || address);
      setVatNumber(result.vatNumber || vatNumber);
      setPhoneNumber(result.phoneNumber || phoneNumber);
      setAvatarUrl(result.avatarUrl || avatarUrl);
      message.success('Profil mis à jour avec succès !');
      if (refetchUser) refetchUser();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>
  );

  const rl = roleLabel(user?.role);
  const initials = [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'U';

  return (
    <div>
      {/* Header */}
      <FBCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: FB.text }}>Mon Profil</div>
            <div style={{ fontSize: 14, color: FB.textSecondary }}>Gérez vos informations personnelles</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '4px 12px', borderRadius: 16, fontSize: 13, fontWeight: 600,
              background: rl.color + '18', color: rl.color,
            }}>
              <CrownOutlined style={{ marginRight: 4 }} />{rl.label}
            </span>
            {currentOrganization && (
              <span style={{
                padding: '4px 12px', borderRadius: 16, fontSize: 13, fontWeight: 600,
                background: FB.blue + '15', color: FB.blue,
              }}>
                <TeamOutlined style={{ marginRight: 4 }} />{currentOrganization.name}
              </span>
            )}
          </div>
        </div>
      </FBCard>

      {/* Avatar section */}
      <FBCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 16 : 24 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
              background: FB.blue, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '4px solid ' + FB.white, boxShadow: FB.shadow,
            }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 28, fontWeight: 700, color: FB.white }}>{initials}</span>
              )}
            </div>
            <div
              onClick={() => !avatarUploading && fileInputRef.current?.click()}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: '50%',
                background: FB.white, border: '2px solid ' + FB.border,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: FB.shadow,
              }}
            >
              {avatarUploading
                ? <LoadingOutlined style={{ fontSize: 12, color: FB.blue }} />
                : <CameraOutlined style={{ fontSize: 12, color: FB.textSecondary }} />}
            </div>
            <input type="file" accept="image/*" onChange={handleAvatarChange} ref={fileInputRef} style={{ display: 'none' }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: FB.text }}>Photo de profil</div>
            <div style={{ fontSize: 13, color: FB.textSecondary, marginBottom: 8 }}>JPG, PNG ou GIF. Maximum 5 Mo.</div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              style={{
                padding: '6px 16px', borderRadius: 6, border: 'none',
                background: FB.btnGray, color: FB.text, fontSize: 14,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Changer la photo
            </button>
          </div>
        </div>
      </FBCard>

      {/* Form */}
      <FBCard>
        <div style={{ fontSize: 16, fontWeight: 700, color: FB.text, marginBottom: 16 }}>Informations personnelles</div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0 20px' }}>
          <FBInput icon={<UserOutlined />} label="Prénom" value={firstName} onChange={setFirstName} placeholder="Prénom" />
          <FBInput icon={<UserOutlined />} label="Nom" value={lastName} onChange={setLastName} placeholder="Nom" />
        </div>

        <FBInput icon={<HomeOutlined />} label="Adresse" value={address} onChange={setAddress} placeholder="Adresse complète" />

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0 20px' }}>
          <FBInput icon={<BankOutlined />} label="Numéro de TVA" value={vatNumber} onChange={setVatNumber} placeholder="BE0000.000.000" />
          <FBInput icon={<PhoneOutlined />} label="Téléphone" value={phoneNumber} onChange={setPhoneNumber} placeholder="+32 470 00 00 00" />
        </div>

        {/* Language selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 6 }}>Langue / Language</label>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            border: '1px solid ' + FB.border, borderRadius: 6, padding: '10px 12px',
            background: FB.white,
          }}>
            <span style={{ fontSize: 16 }}>🌐</span>
            <select
              value={language}
              onChange={e => {
                const lang = e.target.value;
                setLanguageState(lang);
                i18n.changeLanguage(lang);
                // Language is saved to DB via handleSubmit → api.put('/api/profile', { language })
              }}
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: 15, color: FB.text,
                background: 'transparent', fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="nl">Nederlands</option>
            </select>
          </div>
        </div>

        {/* Email (read-only) */}
        <div style={{
          padding: 16, background: FB.btnGray, borderRadius: FB.radius, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MailOutlined style={{ fontSize: 16, color: FB.textSecondary }} />
            <div>
              <div style={{ fontSize: 12, color: FB.textSecondary }}>Adresse email</div>
              <div style={{ fontSize: 15, color: FB.text, fontWeight: 500 }}>{user?.email}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: FB.textSecondary, marginTop: 4, marginLeft: 26 }}>
            L'email ne peut pas être modifié ici. Contactez un Keeper.
          </div>
        </div>

        <div style={{ height: 1, background: FB.border, margin: '8px 0 20px' }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: '10px 24px', borderRadius: 6, border: 'none',
              background: FB.blue, color: FB.white, fontSize: 15,
              fontWeight: 600, cursor: 'pointer', display: 'flex',
              alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {saving ? <LoadingOutlined /> : <SaveOutlined />}
            Enregistrer les modifications
          </button>
        </div>
      </FBCard>
    </div>
  );
};

export default ProfileSettings;
