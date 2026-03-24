import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, Divider } from 'antd';
import { MailOutlined, LockOutlined, RocketOutlined, TeamOutlined, SafetyOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function Connexion() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError('');
    try {
      const cleanEmail = values.email.trim().replace(/[\u200B-\u200D\uFEFF\u00A0\u2060]/g, '');
      const cleanPassword = values.password.trim().replace(/[\u200B-\u200D\uFEFF\u00A0\u2060]/g, '');
      await login(cleanEmail, cleanPassword);
      navigate('/dashboard');
    } catch (err) {
      console.error('[Connexion] Erreur lors du login:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: <TeamOutlined style={{ fontSize: 22, color: '#93c5fd' }} />, title: 'Votre Crew, connectée', desc: 'Collaborez en temps réel au sein de votre Colony.' },
    { icon: <RocketOutlined style={{ fontSize: 22, color: '#93c5fd' }} />, title: 'Du Nectar au Gold', desc: 'Devis, suivi, facturation — tout dans le Hive.' },
    { icon: <SafetyOutlined style={{ fontSize: 22, color: '#93c5fd' }} />, title: 'Sécurisé & fiable', desc: 'Données protégées, hébergées en Europe.' },
  ];

  return (
    <>
      <style>{`
        .zhiive-login-root { display: flex; min-height: 100vh; font-family: 'Inter', 'Segoe UI', -apple-system, sans-serif; }
        .zhiive-brand-panel { display: none; }
        .zhiive-form-panel { display: flex; align-items: center; justify-content: center; width: 100%; padding: 24px; background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%); flex-direction: column; }
        .zhiive-mobile-logo { text-align: center; margin-bottom: 32px; }
        @media (min-width: 1024px) {
          .zhiive-brand-panel { display: flex; flex-direction: column; justify-content: space-between; width: 50%; padding: 48px; position: relative; overflow: hidden; }
          .zhiive-form-panel { width: 50%; padding: 48px; background: #f8fafc; flex-direction: column; }
          .zhiive-mobile-logo { display: none; }
        }
        @keyframes zhiivePulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.6); }
        }
        .zhiive-dot { position: absolute; border-radius: 50%; animation: zhiivePulse 3s ease-in-out infinite; }
      `}</style>

      <div className="zhiive-login-root">
        {/* === PANNEAU GAUCHE — Branding === */}
        <div className="zhiive-brand-panel" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%)' }}>
          {/* Cercles décoratifs */}
          <div style={{ position: 'absolute', top: 0, right: 0, width: 380, height: 380, borderRadius: '50%', opacity: 0.08, background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: 280, height: 280, borderRadius: '50%', opacity: 0.08, background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', transform: 'translate(-20%, 20%)' }} />
          {/* Points lumineux animés */}
          <div className="zhiive-dot" style={{ top: '25%', right: '25%', width: 6, height: 6, background: '#60a5fa' }} />
          <div className="zhiive-dot" style={{ top: '60%', right: '35%', width: 8, height: 8, background: '#93c5fd', animationDelay: '1s', animationDuration: '4s' }} />
          <div className="zhiive-dot" style={{ top: '45%', left: '20%', width: 5, height: 5, background: '#38bdf8', animationDelay: '0.5s', animationDuration: '3.5s' }} />

          {/* Logo + Nom */}
          <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8, justifyContent: 'center' }}>
              <img src="/zhiive-logo.png" alt="Zhiive" style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'contain' }} />
              <img src="/zhiive-ecrit.png" alt="Zhiive" style={{ height: 44, objectFit: 'contain' }} />
            </div>
            <p style={{ color: '#93c5fd', fontSize: 16, margin: 0, textAlign: 'center' }}>Votre ruche vivante.</p>
          </div>

          {/* Features */}
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 28, textAlign: 'left' }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <p style={{ color: '#fff', fontWeight: 600, fontSize: 15, margin: '0 0 4px 0' }}>{f.title}</p>
                  <p style={{ color: '#93c5fd', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ position: 'relative', zIndex: 10, textAlign: 'left' }}>
            <p style={{ color: 'rgba(147,197,253,0.6)', fontSize: 12, margin: 0 }}>© 2026 <a href="https://www.zhiive.com" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(147,197,253,0.8)' }}>Zhiive</a> — Vivant par nature.</p>
          </div>
        </div>

        {/* === PANNEAU DROIT — Formulaire === */}
        <div className="zhiive-form-panel">
          <div style={{ width: '100%', maxWidth: 420 }}>
            {/* Logo mobile */}
            <div className="zhiive-mobile-logo">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center', marginBottom: 8 }}>
                <img src="/zhiive-logo.png" alt="Zhiive" style={{ width: 56, height: 56, borderRadius: 16, objectFit: 'contain', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }} />
                <img src="/zhiive-ecrit.png" alt="Zhiive" style={{ height: 40, objectFit: 'contain' }} />
              </div>
              <p style={{ color: '#93c5fd', fontSize: 15, margin: 0 }}>Votre ruche vivante.</p>
            </div>

            <div style={{ background: '#fff', borderRadius: 20, padding: '40px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <Title level={2} style={{ margin: '0 0 8px 0', fontSize: 26, color: '#111827' }}>Welcome back 👋</Title>
                <Text style={{ color: '#9ca3af', fontSize: 14 }}>Retrouvez votre Hive</Text>
              </div>

              {error && (
                <Alert
                  message={error}
                  type="error"
                  showIcon
                  closable
                  style={{ borderRadius: 12, marginBottom: 24 }}
                  onClose={() => setError('')}
                />
              )}

              <Form layout="vertical" onFinish={handleSubmit} size="large">
                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: 'Veuillez entrer votre email' },
                    { type: 'email', message: "Format d'email invalide" },
                  ]}
                >
                  <Input
                    prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
                    placeholder="votre@email.com"
                    autoComplete="email"
                    style={{ borderRadius: 12, height: 48 }}
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  rules={[{ required: true, message: 'Veuillez entrer votre mot de passe' }]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                    placeholder="Mot de passe"
                    autoComplete="current-password"
                    style={{ borderRadius: 12, height: 48 }}
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    style={{
                      borderRadius: 12,
                      height: 50,
                      fontSize: 16,
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      border: 'none',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                    }}
                  >
                    Se connecter
                  </Button>
                </Form.Item>
              </Form>

              <Divider plain style={{ margin: '20px 0' }}>
                <Text style={{ color: '#d1d5db', fontSize: 12 }}>Pas encore de compte ?</Text>
              </Divider>

              <Button
                block
                size="large"
                onClick={() => navigate('/register')}
                style={{
                  borderRadius: 12,
                  height: 50,
                  border: '2px solid #dbeafe',
                  color: '#2563eb',
                  fontWeight: 600,
                  fontSize: 15,
                }}
              >
                Rejoindre le Hive
              </Button>
            </div>

            <p style={{ textAlign: 'center', marginTop: 24, color: '#d1d5db', fontSize: 11 }}>
              En vous connectant, vous acceptez nos conditions d'utilisation.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
