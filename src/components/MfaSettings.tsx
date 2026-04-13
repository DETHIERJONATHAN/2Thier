import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, Alert, Steps, Typography, Tag, Space, Divider, message } from 'antd';
import { SafetyOutlined, QrcodeOutlined, KeyOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Title, Text, Paragraph } = Typography;

interface MfaStatus {
  mfaEnabled: boolean;
  backupCodesRemaining: number;
}

interface SetupData {
  secret: string;
  qrDataUrl: string;
}

const MfaSettings: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [step, setStep] = useState(0);
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disableToken, setDisableToken] = useState('');
  const [showDisable, setShowDisable] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.get('/api/mfa/status');
      setStatus(data as MfaStatus);
    } catch {
      // ignore
    }
  }, [api]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/mfa/setup');
      setSetupData(data as SetupData);
      setStep(1);
    } catch {
      message.error('Erreur lors de la configuration 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    if (!token || token.length !== 6) {
      message.warning('Entrez le code à 6 chiffres de votre application');
      return;
    }
    setLoading(true);
    try {
      const data = await api.post('/api/mfa/enable', { token }) as { backupCodes: string[] };
      setBackupCodes(data.backupCodes);
      setStep(2);
      fetchStatus();
      message.success('2FA activé avec succès !');
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error(err.message ?? 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!disableToken) return;
    setLoading(true);
    try {
      await api.post('/api/mfa/disable', { token: disableToken });
      setShowDisable(false);
      setDisableToken('');
      setStep(0);
      setSetupData(null);
      fetchStatus();
      message.success('2FA désactivé');
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error(err.message ?? 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  if (!status) return null;

  if (status.mfaEnabled && step < 2) {
    return (
      <Card style={{ maxWidth: 500 }}>
        <Space align="center" style={{ marginBottom: 16 }}>
          <SafetyOutlined style={{ fontSize: 24, color: '#52c41a' }} />
          <div>
            <Title level={5} style={{ margin: 0 }}>Authentification à deux facteurs</Title>
            <Tag color="success" icon={<CheckCircleOutlined />}>Activé</Tag>
          </div>
        </Space>
        <Text type="secondary">
          Codes de secours restants : <strong>{status.backupCodesRemaining}</strong>/8
        </Text>
        {status.backupCodesRemaining < 3 && (
          <Alert
            type="warning"
            icon={<ExclamationCircleOutlined />}
            showIcon
            message="Il vous reste peu de codes de secours. Désactivez puis réactivez le 2FA pour en générer de nouveaux."
            style={{ marginTop: 12 }}
          />
        )}
        <Divider />
        {!showDisable ? (
          <Button danger onClick={() => setShowDisable(true)}>Désactiver le 2FA</Button>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>Entrez votre code TOTP (ou un code de secours) pour confirmer :</Text>
            <Input
              placeholder="Code TOTP ou code de secours"
              value={disableToken}
              onChange={e => setDisableToken(e.target.value)}
              maxLength={9}
            />
            <Space>
              <Button danger loading={loading} onClick={handleDisable}>Confirmer la désactivation</Button>
              <Button onClick={() => setShowDisable(false)}>Annuler</Button>
            </Space>
          </Space>
        )}
      </Card>
    );
  }

  return (
    <Card style={{ maxWidth: 500 }}>
      <Space align="center" style={{ marginBottom: 16 }}>
        <SafetyOutlined style={{ fontSize: 24, color: '#faad14' }} />
        <div>
          <Title level={5} style={{ margin: 0 }}>Authentification à deux facteurs</Title>
          <Tag color="warning">Non activé</Tag>
        </div>
      </Space>

      {step === 0 && (
        <>
          <Paragraph type="secondary">
            Protégez votre compte avec une application d'authentification (Google Authenticator, Authy, etc.).
            Un code unique sera demandé à chaque connexion.
          </Paragraph>
          <Button type="primary" icon={<SafetyOutlined />} loading={loading} onClick={handleSetup}>
            Configurer le 2FA
          </Button>
        </>
      )}

      {step === 1 && setupData && (
        <Steps
          direction="vertical"
          current={0}
          items={[
            {
              title: 'Scanner le QR code',
              description: (
                <Space direction="vertical" style={{ marginTop: 8 }}>
                  <Text type="secondary">Scannez ce code avec votre application d'authentification :</Text>
                  <img src={setupData.qrDataUrl} alt="QR code 2FA" style={{ width: 180, height: 180, display: 'block' }} />
                  <Text type="secondary" copyable={{ text: setupData.secret }}>
                    <KeyOutlined /> Code manuel : <code>{setupData.secret}</code>
                  </Text>
                </Space>
              ),
              icon: <QrcodeOutlined />,
            },
            {
              title: 'Confirmer avec le code',
              description: (
                <Space direction="vertical" style={{ marginTop: 8 }}>
                  <Input
                    placeholder="Code à 6 chiffres"
                    value={token}
                    onChange={e => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    style={{ width: 160 }}
                    onPressEnter={handleEnable}
                  />
                  <Button type="primary" loading={loading} onClick={handleEnable} disabled={token.length !== 6}>
                    Activer le 2FA
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      )}

      {step === 2 && backupCodes.length > 0 && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            type="success"
            showIcon
            message="2FA activé !"
            description="Sauvegardez ces codes de secours. Chaque code ne peut être utilisé qu'une seule fois si vous perdez accès à votre application."
          />
          <div style={{
            background: '#f6f8fa', border: '1px solid #e2e8f0', borderRadius: 8,
            padding: 16, fontFamily: 'monospace', lineHeight: 2
          }}>
            {backupCodes.map(code => (
              <div key={code}>{code}</div>
            ))}
          </div>
          <Button onClick={() => {
            navigator.clipboard?.writeText(backupCodes.join('\n'));
            message.success('Codes copiés !');
          }}>
            Copier les codes
          </Button>
          <Button type="primary" onClick={() => { setStep(0); setSetupData(null); setToken(''); }}>
            Terminé
          </Button>
        </Space>
      )}
    </Card>
  );
};

export default MfaSettings;
