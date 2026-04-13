import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Result, Button, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { SF } from '../components/zhiive/ZhiiveTheme';

type VerifyState = 'loading' | 'success' | 'already' | 'expired' | 'error';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<VerifyState>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('error');
      setMessage('Lien d\'activation invalide — aucun token trouvé.');
      return;
    }

    const apiBase = import.meta.env.VITE_API_URL || '';
    fetch(`${apiBase}/api/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      credentials: 'include',
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setState(data.alreadyVerified ? 'already' : 'success');
          setMessage(data.message);
        } else {
          if (data.expired) {
            setState('expired');
          } else {
            setState('error');
          }
          setMessage(data.error || 'Erreur de vérification');
        }
      })
      .catch(() => {
        setState('error');
        setMessage('Impossible de contacter le serveur. Réessayez plus tard.');
      });
  }, [searchParams]);

  const gradientBg = 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%)';

  if (state === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: gradientBg }}>
        <Spin size="large" tip={<span style={{ color: '#93c5fd' }}>Activation de votre compte...</span>} />
      </div>
    );
  }

  const configs: Record<Exclude<VerifyState, 'loading'>, { status: 'success' | 'warning' | 'error'; icon: React.ReactNode; title: string }> = {
    success: { status: 'success', icon: <CheckCircleOutlined />, title: 'Compte activé !' },
    already: { status: 'success', icon: <CheckCircleOutlined />, title: 'Déjà activé' },
    expired: { status: 'warning', icon: <ClockCircleOutlined />, title: 'Lien expiré' },
    error: { status: 'error', icon: <CloseCircleOutlined />, title: 'Erreur d\'activation' },
  };

  const cfg = configs[state];

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', minHeight: '100vh', background: gradientBg, padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center', marginBottom: 8 }}>
          <img src="/zhiive-logo.png" alt="Zhiive" style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'contain' }} />
          <img src="/zhiive-ecrit.png" alt="Zhiive" style={{ height: 44, objectFit: 'contain' }} />
        </div>
        <p style={{ color: '#93c5fd', fontSize: 15, margin: 0 }}>Votre ruche vivante.</p>
      </div>
      <div style={{ background: '#fff', borderRadius: 20, padding: 48, maxWidth: 480, width: '100%', boxShadow: '0 4px 24px ${SF.overlayDarkLight}', border: '1px solid #f1f5f9' }}>
        <Result
          status={cfg.status}
          icon={cfg.icon}
          title={cfg.title}
          subTitle={message}
          extra={[
            <Button
              key="login"
              type="primary"
              size="large"
              onClick={() => navigate('/login')}
              style={{ borderRadius: 12, fontWeight: 600 }}
            >
              Se connecter
            </Button>,
            state === 'expired' && (
              <Button
                key="resend"
                size="large"
                onClick={() => navigate('/login')}
                style={{ borderRadius: 12, marginTop: 8 }}
              >
                Demander un nouveau lien
              </Button>
            ),
          ].filter(Boolean)}
        />
      </div>
    </div>
  );
}
