import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, Select, Divider, message } from 'antd';
import {
  UserOutlined, MailOutlined, LockOutlined, ArrowLeftOutlined,
  BankOutlined, TeamOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  const [registrationType, setRegistrationType] = useState<'freelance' | 'createOrg' | 'joinOrg'>('freelance');
  const [organizations, setOrganizations] = useState<{ id: string; name: string; description?: string }[]>([]);

  useEffect(() => {
    const fetchOrganizations = async () => {
      if (registrationType !== 'joinOrg') return;
      try {
        const response = await api.get('/api/organizations/public');
        if (response.success) setOrganizations(response.data || []);
      } catch (error) {
        console.error('Erreur chargement organisations:', error);
      }
    };
    fetchOrganizations();
  }, [registrationType, api]);

  const handleSubmit = async (values: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword?: string;
    organizationName?: string;
    domain?: string;
    organizationId?: string;
    message?: string;
  }) => {
    const cleanEmail = values.email.trim().replace(/[\u200B-\u200D\uFEFF\u00A0\u2060]/g, '');
    const cleanPassword = values.password.trim().replace(/[\u200B-\u200D\uFEFF\u00A0\u2060]/g, '');

    setLoading(true);
    try {
      const { confirmPassword, ...rest } = values;
      const response = await api.post('/register', {
        ...rest,
        email: cleanEmail,
        password: cleanPassword,
        registrationType,
      });

      if (response.success !== false) {
        const messages: Record<string, string> = {
          createOrg: 'Organisation créée ! Connectez-vous maintenant.',
          joinOrg: "Demande envoyée ! En attente d'approbation.",
          freelance: 'Inscription réussie ! Vous pouvez vous connecter.',
        };
        message.success(messages[registrationType]);
        navigate('/login');
      } else {
        throw new Error(response.error || "Erreur lors de l'inscription");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'inscription";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const typeCards = [
    {
      value: 'freelance' as const,
      icon: <UserOutlined style={{ fontSize: 28, color: '#2563eb' }} />,
      title: 'Utilisateur libre',
      desc: "Créez votre compte et attendez une invitation",
    },
    {
      value: 'createOrg' as const,
      icon: <BankOutlined style={{ fontSize: 28, color: '#059669' }} />,
      title: 'Créer mon entreprise',
      desc: 'Devenez admin de votre propre espace',
    },
    {
      value: 'joinOrg' as const,
      icon: <TeamOutlined style={{ fontSize: 28, color: '#d97706' }} />,
      title: 'Rejoindre une équipe',
      desc: "Faites une demande d'adhésion",
    },
  ];

  return (
    <>
      <style>{`
        .zhivv-reg-root { display: flex; min-height: 100vh; font-family: 'Inter', 'Segoe UI', -apple-system, sans-serif; }
        .zhivv-reg-brand { display: none; }
        .zhivv-reg-form { display: flex; align-items: center; justify-content: center; width: 100%; padding: 24px; background: #f8fafc; overflow-y: auto; }
        .zhivv-reg-mobile-logo { text-align: center; margin-bottom: 24px; }
        .zhivv-reg-type-grid { display: flex; gap: 12px; margin-bottom: 24px; }
        .zhivv-reg-type-grid > div { flex: 1; }
        .zhivv-reg-name-row { display: flex; gap: 16px; }
        .zhivv-reg-name-row > * { flex: 1; }
        @media (min-width: 1024px) {
          .zhivv-reg-brand { display: flex; flex-direction: column; justify-content: space-between; width: 42%; padding: 48px; position: relative; overflow: hidden; }
          .zhivv-reg-form { width: 58%; padding: 48px; }
          .zhivv-reg-mobile-logo { display: none; }
        }
        @keyframes zhivvRegPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.6); }
        }
        .zhivv-reg-dot { position: absolute; border-radius: 50%; animation: zhivvRegPulse 3s ease-in-out infinite; }
      `}</style>

      <div className="zhivv-reg-root">
        {/* === PANNEAU GAUCHE — Branding === */}
        <div className="zhivv-reg-brand" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%)' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: 380, height: 380, borderRadius: '50%', opacity: 0.08, background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: 280, height: 280, borderRadius: '50%', opacity: 0.08, background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', transform: 'translate(-20%, 20%)' }} />
          <div className="zhivv-reg-dot" style={{ top: '25%', right: '25%', width: 6, height: 6, background: '#60a5fa' }} />
          <div className="zhivv-reg-dot" style={{ top: '60%', right: '35%', width: 8, height: 8, background: '#93c5fd', animationDelay: '1s', animationDuration: '4s' }} />
          <div className="zhivv-reg-dot" style={{ top: '45%', left: '20%', width: 5, height: 5, background: '#38bdf8', animationDelay: '0.5s', animationDuration: '3.5s' }} />

          {/* Logo + Nom */}
          <div style={{ position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <img src="/zhivv-logo.png" alt="Zhivv" style={{ width: 48, height: 48, borderRadius: 14, objectFit: 'contain' }} />
              <span style={{ fontSize: 30, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>Zhivv</span>
            </div>
            <p style={{ color: '#93c5fd', fontSize: 16, margin: 0 }}>Votre réseau business, vivant.</p>
          </div>

          {/* Features */}
          <div style={{ position: 'relative', zIndex: 10 }}>
            <Title level={3} style={{ color: '#fff', lineHeight: 1.4, marginBottom: 28 }}>
              Rejoignez des milliers d'entreprises qui font confiance à Zhivv.
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {['Gestion client intelligente', 'Devis & facturation en 1 clic', 'Collaboration en temps réel'].map((feature, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CheckCircleOutlined style={{ fontSize: 20, color: '#34d399' }} />
                  <span style={{ color: '#bfdbfe', fontSize: 15 }}>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 10 }}>
            <p style={{ color: 'rgba(147,197,253,0.6)', fontSize: 12, margin: 0 }}>© 2026 Zhivv — Vivant par nature.</p>
          </div>
        </div>

        {/* === PANNEAU DROIT — Formulaire === */}
        <div className="zhivv-reg-form">
          <div style={{ width: '100%', maxWidth: 480 }}>
            {/* Logo mobile */}
            <div className="zhivv-reg-mobile-logo">
              <img src="/zhivv-logo.png" alt="Zhivv" style={{ width: 56, height: 56, borderRadius: 16, objectFit: 'contain', marginBottom: 12, boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }} />
              <Title level={3} style={{ margin: 0 }}>Zhivv</Title>
            </div>

            <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: '0 0 8px 0', fontSize: 26, color: '#111827' }}>Créer un compte</Title>
                <Text style={{ color: '#9ca3af', fontSize: 14 }}>Commencez gratuitement en 2 minutes</Text>
              </div>

              {/* Sélection du type — cartes visuelles */}
              <div className="zhivv-reg-type-grid">
                {typeCards.map((card) => (
                  <div
                    key={card.value}
                    onClick={() => setRegistrationType(card.value)}
                    style={{
                      cursor: 'pointer',
                      textAlign: 'center',
                      borderRadius: 12,
                      padding: '14px 8px',
                      border: registrationType === card.value ? '2px solid #2563eb' : '2px solid #f1f5f9',
                      background: registrationType === card.value ? '#eff6ff' : '#f8fafc',
                      boxShadow: registrationType === card.value ? '0 2px 8px rgba(37,99,235,0.15)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>{card.icon}</div>
                    <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: registrationType === card.value ? '#1d4ed8' : '#374151' }}>
                      {card.title}
                    </p>
                    <p style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.3, margin: 0 }}>{card.desc}</p>
                  </div>
                ))}
              </div>

              <Form form={form} layout="vertical" onFinish={handleSubmit} size="large">
                {/* Prénom + Nom côte à côte */}
                <div className="zhivv-reg-name-row">
                  <Form.Item
                    name="firstName"
                    rules={[{ required: true, message: 'Requis' }]}
                  >
                    <Input
                      prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                      placeholder="Prénom"
                      style={{ borderRadius: 12 }}
                    />
                  </Form.Item>
                  <Form.Item
                    name="lastName"
                    rules={[{ required: true, message: 'Requis' }]}
                  >
                    <Input
                      prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                      placeholder="Nom"
                      style={{ borderRadius: 12 }}
                    />
                  </Form.Item>
                </div>

                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: "L'email est requis" },
                    { type: 'email', message: "Format d'email invalide" }
                  ]}
                >
                  <Input
                    prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
                    placeholder="votre@email.com"
                    style={{ borderRadius: 12 }}
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  rules={[
                    { required: true, message: 'Le mot de passe est requis' },
                    { min: 8, message: 'Minimum 8 caractères' },
                    {
                      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
                      message: '1 majuscule, 1 minuscule et 1 chiffre requis'
                    }
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                    placeholder="Mot de passe"
                    style={{ borderRadius: 12 }}
                  />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: 'Confirmez votre mot de passe' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) return Promise.resolve();
                        return Promise.reject(new Error('Les mots de passe ne correspondent pas'));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                    placeholder="Confirmez le mot de passe"
                    style={{ borderRadius: 12 }}
                  />
                </Form.Item>

                {/* Champs conditionnels — Créer organisation */}
                {registrationType === 'createOrg' && (
                  <div style={{ marginBottom: 16, padding: 16, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#166534' }}>
                      <BankOutlined /> Votre organisation
                    </p>
                    <Form.Item
                      name="organizationName"
                      rules={[{ required: true, message: 'Nom requis' }]}
                      style={{ marginBottom: 12 }}
                    >
                      <Input placeholder="Mon Entreprise SPRL" style={{ borderRadius: 12 }} />
                    </Form.Item>
                    <Form.Item name="domain" style={{ marginBottom: 0 }}>
                      <Input placeholder="mon-entreprise.be (optionnel)" style={{ borderRadius: 12 }} />
                    </Form.Item>
                  </div>
                )}

                {/* Champs conditionnels — Rejoindre organisation */}
                {registrationType === 'joinOrg' && (
                  <div style={{ marginBottom: 16, padding: 16, background: '#fffbeb', borderRadius: 12, border: '1px solid #fde68a' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#92400e' }}>
                      <TeamOutlined /> Rejoindre une organisation
                    </p>
                    <Form.Item
                      name="organizationId"
                      rules={[{ required: true, message: 'Sélectionnez une organisation' }]}
                      style={{ marginBottom: 12 }}
                    >
                      <Select
                        placeholder="Choisir une organisation"
                        showSearch
                        optionFilterProp="children"
                      >
                        {organizations.map(org => (
                          <Select.Option key={org.id} value={org.id}>
                            {org.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="message" style={{ marginBottom: 0 }}>
                      <TextArea
                        placeholder="Pourquoi souhaitez-vous rejoindre ? (optionnel)"
                        rows={2}
                        maxLength={500}
                        style={{ borderRadius: 12 }}
                      />
                    </Form.Item>
                  </div>
                )}

                <Form.Item style={{ marginBottom: 12 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    style={{
                      borderRadius: 12,
                      height: 48,
                      fontSize: 16,
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      border: 'none',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                    }}
                  >
                    {registrationType === 'createOrg'
                      ? 'Créer mon organisation'
                      : registrationType === 'joinOrg'
                        ? 'Envoyer ma demande'
                        : 'Créer mon compte'}
                  </Button>
                </Form.Item>
              </Form>

              <Divider plain style={{ margin: '16px 0' }}>
                <Text style={{ color: '#d1d5db', fontSize: 12 }}>Déjà un compte ?</Text>
              </Divider>

              <Button
                block
                size="large"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/login')}
                style={{
                  borderRadius: 12,
                  height: 48,
                  border: '2px solid #dbeafe',
                  color: '#2563eb',
                  fontWeight: 600,
                }}
              >
                Se connecter
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
