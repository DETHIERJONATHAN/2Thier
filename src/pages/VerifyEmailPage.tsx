import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Result, Button, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';

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

  if (state === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
        <Spin size="large" tip="Activation de votre compte..." />
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 48, maxWidth: 480, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/zhiive-logo.png" alt="Zhiive" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'contain' }} />
        </div>
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
