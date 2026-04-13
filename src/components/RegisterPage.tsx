import { SF, COLORS, FB } from './zhiive/ZhiiveTheme';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, Divider, message } from 'antd';
import {
  UserOutlined, MailOutlined, LockOutlined, ArrowLeftOutlined,
  BankOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

const { Title, Text } = Typography;

export default function RegisterPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  const [registrationType, setRegistrationType] = useState<'freelance' | 'createOrg'>('freelance');

  const handleSubmit = async (values: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword?: string;
    organizationName?: string;
    domain?: string;
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
        setRegisteredEmail(cleanEmail);
        setRegistrationComplete(true);
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
      icon: <UserOutlined style={{ fontSize: 28, color: COLORS.authLink }} />,
      title: t('auth.joinTheHive'),
      desc: t('auth.joinFree'),
    },
    {
      value: 'createOrg' as const,
      icon: <BankOutlined style={{ fontSize: 28, color: SF.emeraldDark }} />,
      title: t('auth.foundColony'),
      desc: t('auth.foundColonyDesc'),
    },
  ];

  return (
    <>
      <style>{`
        .zhiive-reg-root { display: flex; min-height: 100vh; font-family: 'Inter', 'Segoe UI', -apple-system, sans-serif; }
        .zhiive-reg-brand { display: none; }
        .zhiive-reg-form { display: flex; align-items: center; justify-content: center; width: 100%; padding: 24px; background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%); overflow-y: auto; flex-direction: column; }
        .zhiive-reg-mobile-logo { text-align: center; margin-bottom: 24px; }
        .zhiive-reg-type-grid { display: flex; gap: 12px; margin-bottom: 24px; }
        .zhiive-reg-type-grid > div { flex: 1; }
        .zhiive-reg-name-row { display: flex; gap: 16px; }
        .zhiive-reg-name-row > * { flex: 1; }
        @media (min-width: 1024px) {
          .zhiive-reg-brand { display: flex; flex-direction: column; justify-content: space-between; width: 42%; padding: 48px; position: relative; overflow: hidden; }
          .zhiive-reg-form { width: 58%; padding: 48px; }
          .zhiive-reg-mobile-logo { display: none; }
        }
        @keyframes zhiiveRegPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.6); }
        }
        .zhiive-reg-dot { position: absolute; border-radius: 50%; animation: zhiiveRegPulse 3s ease-in-out infinite; }
      `}</style>

      <div className="zhiive-reg-root">
        {/* === PANNEAU GAUCHE — Branding === */}
        <div className="zhiive-reg-brand" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%)' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: 380, height: 380, borderRadius: '50%', opacity: 0.08, background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: 280, height: 280, borderRadius: '50%', opacity: 0.08, background: `radial-gradient(circle, ${SF.blue} 0%, transparent 70%)`, transform: 'translate(-20%, 20%)' }} />
          <div className="zhiive-reg-dot" style={{ top: '25%', right: '25%', width: 6, height: 6, background: COLORS.authAccentStrong }} />
          <div className="zhiive-reg-dot" style={{ top: '60%', right: '35%', width: 8, height: 8, background: COLORS.authAccent, animationDelay: '1s', animationDuration: '4s' }} />
          <div className="zhiive-reg-dot" style={{ top: '45%', left: '20%', width: 5, height: 5, background: COLORS.authAccentAlt, animationDelay: '0.5s', animationDuration: '3.5s' }} />

          {/* Logo + Nom */}
          <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8, justifyContent: 'center' }}>
              <img src="/zhiive-logo.png" alt="Zhiive" style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'contain' }} />
              <img src="/zhiive-ecrit.png" alt="Zhiive" style={{ height: 44, objectFit: 'contain' }} />
            </div>
            <p style={{ color: COLORS.authAccent, fontSize: 16, margin: 0, textAlign: 'center' }}>Votre ruche vivante.</p>
          </div>

          {/* Features */}
          <div style={{ position: 'relative', zIndex: 10, textAlign: 'left' }}>
            <Title level={3} style={{ color: COLORS.white, lineHeight: 1.4, marginBottom: 28, textAlign: 'left' }}>
              Des milliers de Colonies font déjà vivre leur Hive.
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[t('auth.featureTransform'), t('auth.featureInvoice'), t('auth.featureCrewRealtime')].map((feature, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CheckCircleOutlined style={{ fontSize: 20, color: '#34d399' }} />
                  <span style={{ color: '#bfdbfe', fontSize: 15 }}>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 10, textAlign: 'left' }}>
            <p style={{ color: 'rgba(147,197,253,0.6)', fontSize: 12, margin: 0 }}>© 2026 <a href="https://www.zhiive.com" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(147,197,253,0.8)' }}>Zhiive</a> — Vivant par nature.</p>
          </div>
        </div>

        {/* === PANNEAU DROIT — Formulaire === */}
        <div className="zhiive-reg-form">
          <div style={{ width: '100%', maxWidth: 480 }}>
            {/* Logo mobile */}
            <div className="zhiive-reg-mobile-logo">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center', marginBottom: 8 }}>
                <img src="/zhiive-logo.png" alt="Zhiive" style={{ width: 56, height: 56, borderRadius: 16, objectFit: 'contain', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }} />
                <img src="/zhiive-ecrit.png" alt="Zhiive" style={{ height: 40, objectFit: 'contain' }} />
              </div>
              <p style={{ color: COLORS.authAccent, fontSize: 15, margin: 0 }}>Votre ruche vivante.</p>
            </div>

            {registrationComplete ? (
              /* === ÉCRAN DE CONFIRMATION POST-INSCRIPTION === */
              <div style={{ background: COLORS.white, borderRadius: 20, padding: '48px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.05)', border: `1px solid ${COLORS.authBorder}`, textAlign: 'center' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 24px',
                }}>
                  <MailOutlined style={{ fontSize: 36, color: SF.emeraldDark }} />
                </div>

                <Title level={3} style={{ color: COLORS.authTitle, margin: '0 0 12px' }}>
                  {t('auth.checkEmail')}
                </Title>

                <Text style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.6, display: 'block', marginBottom: 8 }}>
                  Un email d'activation a été envoyé à :
                </Text>
                <Text strong style={{ color: COLORS.authLink, fontSize: 16, display: 'block', marginBottom: 24 }}>
                  {registeredEmail}
                </Text>

                <div style={{
                  background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12,
                  padding: '16px 20px', marginBottom: 24, textAlign: 'left',
                }}>
                  <Text strong style={{ color: '#92400e', fontSize: 14, display: 'block', marginBottom: 8 }}>
                    ⚠️ Étape obligatoire avant de vous connecter
                  </Text>
                  <Text style={{ color: COLORS.authWarning, fontSize: 13, lineHeight: 1.6 }}>
                    Ouvrez votre boîte mail et cliquez sur le lien d'activation.
                    Sans cette étape, vous ne pourrez pas vous connecter.
                  </Text>
                </div>

                <div style={{
                  background: '#f8fafc', borderRadius: 12,
                  padding: '16px 20px', marginBottom: 28, textAlign: 'left',
                }}>
                  <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 1.8 }}>
                    📨 Vous ne trouvez pas l'email ?<br />
                    • Vérifiez votre dossier <strong>Spam / Courrier indésirable</strong><br />
                    • L'email vient de <strong>Zhiive</strong><br />
                    • Il peut prendre 1-2 minutes pour arriver
                  </Text>
                </div>

                <Button
                  type="primary"
                  size="large"
                  block
                  onClick={() => navigate('/login')}
                  style={{
                    borderRadius: 12, height: 50, fontSize: 16, fontWeight: 600,
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    border: 'none', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                  }}
                >
                  J'ai activé mon compte — Me connecter
                </Button>
              </div>
            ) : (
            <div style={{ background: COLORS.white, borderRadius: 20, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.05)', border: `1px solid ${COLORS.authBorder}` }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: '0 0 8px 0', fontSize: 26, color: COLORS.authTitle }}>{t('auth.joinHiveTitle')}</Title>
                <Text style={{ color: COLORS.authMuted, fontSize: 14 }}>{t('auth.enterHive')}</Text>
              </div>

              {/* Sélection du type — cartes visuelles */}
              <div className="zhiive-reg-type-grid">
                {typeCards.map((card) => (
                  <div
                    key={card.value}
                    role="button" tabIndex={0} onClick={() => setRegistrationType(card.value)}
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
                    <p style={{ fontSize: 10, color: COLORS.authMuted, lineHeight: 1.3, margin: 0 }}>{card.desc}</p>
                  </div>
                ))}
              </div>

              <Form form={form} layout="vertical" onFinish={handleSubmit} size="large">
                {/* Prénom + Nom côte à côte */}
                <div className="zhiive-reg-name-row">
                  <Form.Item
                    name="firstName"
                    rules={[{ required: true, message: t('auth.required') }]}
                  >
                    <Input
                      prefix={<UserOutlined style={{ color: COLORS.authMuted }} />}
                      placeholder={t('auth.firstName')}
                      style={{ borderRadius: 12 }}
                    />
                  </Form.Item>
                  <Form.Item
                    name="lastName"
                    rules={[{ required: true, message: t('auth.required') }]}
                  >
                    <Input
                      prefix={<UserOutlined style={{ color: COLORS.authMuted }} />}
                      placeholder={t('auth.lastName')}
                      style={{ borderRadius: 12 }}
                    />
                  </Form.Item>
                </div>

                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: t('auth.emailRequired') },
                    { type: 'email', message: t('auth.invalidEmail') }
                  ]}
                >
                  <Input
                    prefix={<MailOutlined style={{ color: COLORS.authMuted }} />}
                    placeholder={t('auth.emailPlaceholder')}
                    style={{ borderRadius: 12 }}
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  rules={[
                    { required: true, message: t('auth.requiredPassword') },
                    { min: 8, message: t('auth.minChars') },
                    {
                      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
                      message: t('auth.passwordRequirements')
                    }
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: COLORS.authMuted }} />}
                    placeholder={t('auth.password')}
                    style={{ borderRadius: 12 }}
                  />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: t('auth.confirmPassword') },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) return Promise.resolve();
                        return Promise.reject(new Error(t('auth.passwordMismatch')));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: COLORS.authMuted }} />}
                    placeholder={t('auth.confirmPassword')}
                    style={{ borderRadius: 12 }}
                  />
                </Form.Item>

                {/* Champs conditionnels — Créer organisation */}
                {registrationType === 'createOrg' && (
                  <div style={{ marginBottom: 16, padding: 16, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#166534' }}>
                      <BankOutlined /> {t('auth.yourColony')}
                    </p>
                    <Form.Item
                      name="organizationName"
                      rules={[{ required: true, message: t('auth.required') }]}
                      style={{ marginBottom: 12 }}
                    >
                      <Input placeholder={t('auth.orgNamePlaceholder')} style={{ borderRadius: 12 }} />
                    </Form.Item>
                    <Form.Item name="domain" style={{ marginBottom: 0 }}>
                      <Input placeholder={t('auth.domainPlaceholder')} style={{ borderRadius: 12 }} />
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
                      ? t('auth.foundMyColony')
                      : t('auth.joinTheHive')}
                  </Button>
                </Form.Item>
              </Form>

              <Divider plain style={{ margin: '16px 0' }}>
                <Text style={{ color: COLORS.authDivider, fontSize: 12 }}>{t('auth.alreadyAccount')}</Text>
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
                  color: COLORS.authLink,
                  fontWeight: 600,
                }}
              >
                Se connecter
              </Button>
            </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
