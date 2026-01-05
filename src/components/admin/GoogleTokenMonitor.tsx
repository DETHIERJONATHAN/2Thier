import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Statistic, 
  Row, 
  Col, 
  Alert, 
  Button, 
  Space, 
  Progress, 
  Typography, 
  Badge, 
  Table,
  message,
  Spin,
  Switch,
  Tooltip
} from 'antd';
import { 
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  ApiOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Title, Text, Paragraph } = Typography;

interface TokenInfo {
  id: string;
  organizationId: string;
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  expiresIn: number;
  scope: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  isExpired: boolean;
  timeUntilExpiry: string;
}

interface SchedulerStatus {
  isRunning: boolean;
  nextRefresh: string | null;
  lastRefresh: string | null;
  refreshCount: number;
  totalUsers: number;
  activeTokens: number;
  errors: Array<{
    timestamp: string;
    message: string;
    organizationId: string;
  }>;
}

interface RefreshHistoryEntry {
  id: string;
  timestamp: string;
  success: boolean;
  message: string;
  organizationId: string;
}

const GoogleTokenMonitor: React.FC<GoogleTokenMonitorProps> = ({ organizationId }) => {
  const [loading, setLoading] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [refreshHistory, setRefreshHistory] = useState<RefreshHistoryEntry[]>([]);
  const { api } = useAuthenticatedApi();

  const startGoogleOAuth = useCallback(async (forceConsent: boolean) => {
    try {
      const response = await api.get(
        `/api/google-auth/connect?organizationId=${encodeURIComponent(organizationId)}&force_consent=${forceConsent ? 'true' : 'false'}`
      );

      const authUrl: string | undefined = response?.data?.authUrl;
      if (!authUrl) {
        message.error('Impossible de démarrer la connexion Google (authUrl manquant)');
        return;
      }

      window.location.href = authUrl;
    } catch (error) {
      console.error('[GoogleTokenMonitor] Erreur démarrage OAuth:', error);
      message.error('Erreur lors du démarrage de la connexion Google');
    }
  }, [api, organizationId]);

  // Charger les informations du scheduler et des tokens
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [schedulerResponse, tokenResponse] = await Promise.all([
        api.get('/api/google-tokens/scheduler/status'),
        api.get(`/api/google-tokens/organization/${organizationId}`)
      ]);

      if (schedulerResponse.success) {
        setSchedulerStatus(schedulerResponse.data);
      }

      if (tokenResponse.success) {
        setTokenInfo(tokenResponse.data);
      }
    } catch (error) {
      console.error('Erreur chargement données monitoring:', error);
      message.error('Erreur lors du chargement des données');
    }
    setLoading(false);
  }, [api, organizationId]);

  // Charger l'historique des refreshs
  const loadRefreshHistory = useCallback(async () => {
    try {
      const response = await api.get(`/api/google-tokens/refresh-history/${organizationId}`);
      if (response.success) {
        setRefreshHistory(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  }, [api, organizationId]);

  // Démarrer/arrêter le scheduler
  const toggleScheduler = async () => {
    try {
      const endpoint = schedulerStatus?.isRunning ? 'stop' : 'start';
      const response = await api.post(`/api/google-tokens/scheduler/${endpoint}`);
      
      if (response.success) {
        message.success(`Scheduler ${schedulerStatus?.isRunning ? 'arrêté' : 'démarré'} avec succès`);
        loadData();
      } else {
        message.error(response.message || 'Erreur lors du changement de statut');
      }
    } catch (error) {
      console.error('Erreur toggle scheduler:', error);
      message.error('Erreur lors du changement de statut du scheduler');
    }
  };

  // Forcer un refresh immédiat
  const forceRefresh = async () => {
    try {
      const response = await api.post('/api/google-tokens/scheduler/refresh-now');
      if (response.success) {
        message.success('Refresh des tokens lancé avec succès');
        loadData();
        loadRefreshHistory();
      } else {
        message.error(response.message || 'Erreur lors du refresh');
      }
    } catch (error) {
      console.error('Erreur refresh forcé:', error);
      message.error('Erreur lors du refresh forcé');
    }
  };

  useEffect(() => {
    loadData();
    loadRefreshHistory();
    
    // Actualiser les données toutes les 30 secondes
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadData, loadRefreshHistory]);

  // Calculer le pourcentage de temps restant avant expiration
  const getTokenExpiryProgress = () => {
    if (!tokenInfo || !tokenInfo.expiresAt) return 100;
    
    const now = new Date().getTime();
    const expiresAt = new Date(tokenInfo.expiresAt).getTime();

    // Un access token Google dure ~1h. `createdAt` reste fixe en DB (création du record),
    // donc on ne peut pas l'utiliser pour une barre de progression fiable après refresh.
    const totalDuration = 60 * 60 * 1000;
    const remainingDuration = expiresAt - now;

    const percentage = (remainingDuration / totalDuration) * 100;
    return Math.max(0, Math.min(100, percentage));
  };

  const getProgressColor = (percentage: number) => {
    if (percentage > 50) return '#52c41a'; // Vert
    if (percentage > 25) return '#faad14'; // Orange
    return '#ff4d4f'; // Rouge
  };

  const historyColumns = [
    {
      title: 'Date',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: string) => new Date(timestamp).toLocaleString('fr-FR')
    },
    {
      title: 'Statut',
      dataIndex: 'success',
      key: 'status',
      render: (success: boolean) => (
        <Badge 
          status={success ? 'success' : 'error'} 
          text={success ? 'Succès' : 'Échec'} 
        />
      )
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message'
    }
  ];

  if (loading && !schedulerStatus) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    );
  }

  const tokenProgress = getTokenExpiryProgress();
  const progressColor = getProgressColor(tokenProgress);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Title level={4}>
          <ApiOutlined className="mr-2" />
          Monitoring des Tokens Google
        </Title>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={loadData}
          loading={loading}
        >
          Actualiser
        </Button>
      </div>

      {/* Statut du Scheduler */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Statut Scheduler"
              value={schedulerStatus?.isRunning ? 'Actif' : 'Arrêté'}
              prefix={schedulerStatus?.isRunning ? 
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
                <ExclamationCircleOutlined style={{ color: '#faad14' }} />
              }
            />
            <div className="mt-4">
              <Switch
                checked={schedulerStatus?.isRunning}
                onChange={toggleScheduler}
                checkedChildren="ON"
                unCheckedChildren="OFF"
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Utilisateurs avec Tokens"
              value={schedulerStatus?.activeTokens || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Refreshs Effectués"
              value={schedulerStatus?.refreshCount || 0}
              prefix={<HistoryOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Prochain Refresh"
              value={schedulerStatus?.nextRefresh ? 
                new Date(schedulerStatus.nextRefresh).toLocaleTimeString('fr-FR') : 
                'N/A'
              }
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Informations sur le Token de cette Organisation */}
      {tokenInfo && (
        <>
          {/* Alerte si pas de refresh token OU si refresh token révoqué */}
          {(() => {
            const now = Date.now();
            const expiresAtMs = tokenInfo.expiresAt ? new Date(tokenInfo.expiresAt).getTime() : 0;
            const isNearExpiry = tokenInfo.isExpired || (expiresAtMs > 0 && expiresAtMs <= now + 10 * 60 * 1000);

            const hasRecentRefreshFailures = refreshHistory.length > 0 &&
              refreshHistory.slice(0, 3).every(h => !h.success && (
                (h.message || '').includes('401') ||
                (h.message || '').toLowerCase().includes('révoqué') ||
                (h.message || '').toLowerCase().includes('invalid_grant')
              ));

            return !tokenInfo.refreshToken || (isNearExpiry && hasRecentRefreshFailures);
          })() && (
            <Alert
              message="⚠️ Token invalide - Réauthentification requise"
              description={
                <div>
                  <Paragraph>
                    {!tokenInfo.refreshToken ? (
                      <>Le token Google de cette organisation <strong>n'a pas de refresh token</strong>.</>
                    ) : (
                      <>Le refresh token de cette organisation est <strong>révoqué ou invalide</strong> (échecs de refresh récents).</>
                    )}
                    {' '}Cela signifie qu'il ne peut pas être renouvelé automatiquement et vous devrez
                    vous réauthentifier manuellement à chaque expiration (toutes les heures).
                  </Paragraph>
                  <Paragraph>
                    <strong>Solution:</strong> Reconnectez-vous à Google en cliquant sur le bouton
                    "Forcer la réauthentification" ci-dessous. Cela demandera à nouveau le consentement
                    et Google fournira un nouveau token avec refresh token valide inclus.
                  </Paragraph>
                  <Space>
                    <Button
                      type="primary"
                      danger
                      icon={<ExclamationCircleOutlined />}
                      onClick={() => startGoogleOAuth(true)}
                    >
                      Forcer la réauthentification
                    </Button>
                    <Button
                      onClick={toggleScheduler}
                      disabled={!schedulerStatus?.isRunning}
                    >
                      {schedulerStatus?.isRunning ? 'Arrêter le scheduler (stopper les erreurs)' : 'Scheduler déjà arrêté'}
                    </Button>
                  </Space>
                </div>
              }
              type="error"
              showIcon
              className="mb-6"
            />
          )}

          <Card title="Token de cette Organisation" className="mb-6">
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <div className="space-y-4">
                  <div>
                    <Text strong>Statut: </Text>
                    <Badge 
                      status={tokenInfo.isExpired ? 'error' : 'success'} 
                      text={tokenInfo.isExpired ? 'Expiré' : 'Valide'} 
                    />
                  </div>
                  
                  <div>
                    <Text strong>Refresh Token: </Text>
                    <Badge 
                      status={tokenInfo.refreshToken ? 'success' : 'error'} 
                      text={tokenInfo.refreshToken ? 'Présent' : 'Manquant'} 
                    />
                  </div>
                  
                  <div>
                    <Text strong>Expire dans: </Text>
                    <Text type={tokenInfo.isExpired ? 'danger' : 'default'}>
                      {tokenInfo.timeUntilExpiry}
                    </Text>
                  </div>
                  
                  <div>
                    <Text strong>Dernière mise à jour: </Text>
                    <Text>{new Date(tokenInfo.updatedAt).toLocaleString('fr-FR')}</Text>
                  </div>
                  
                  <div>
                    <Text strong>Scopes: </Text>
                    <Paragraph ellipsis={{ rows: 2, expandable: true }}>
                      {tokenInfo.scope}
                    </Paragraph>
                  </div>
                </div>
              </Col>
              
              <Col xs={24} lg={12}>
                <div className="space-y-4">
                  <Text strong>Temps restant avant expiration:</Text>
                  <Progress 
                    percent={tokenProgress} 
                    strokeColor={progressColor}
                    status={tokenInfo.isExpired ? 'exception' : 'active'}
                    format={(percent) => `${Math.round(percent || 0)}%`}
                  />
                  
                  <Tooltip title="Temps avant expiration basé sur la durée de vie standard d'1 heure">
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {tokenInfo.refreshToken 
                        ? 'Les tokens Google expirent après 1h mais sont automatiquement renouvelés'
                        : '⚠️ Sans refresh token, vous devrez vous réauthentifier manuellement'
                      }
                    </Text>
                  </Tooltip>
                </div>
              </Col>
            </Row>
          </Card>
        </>
      )}

      {/* Actions */}
      <Card title="Actions">
        <Space>
          <Button
            type="primary"
            icon={schedulerStatus?.isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={toggleScheduler}
          >
            {schedulerStatus?.isRunning ? 'Arrêter' : 'Démarrer'} le Scheduler
          </Button>
          
          <Button
            icon={<ReloadOutlined />}
            onClick={forceRefresh}
            disabled={!schedulerStatus?.isRunning}
          >
            Refresh Immédiat
          </Button>
        </Space>
      </Card>

      {/* Historique des Refreshs */}
      {refreshHistory.length > 0 && (
        <Card title="Historique des Refreshs">
          <Table
            dataSource={refreshHistory}
            columns={historyColumns}
            rowKey="id"
            pagination={{
              pageSize: 5,
              showSizeChanger: false
            }}
            size="small"
          />
        </Card>
      )}

      {/* Alertes et Erreurs */}
      {schedulerStatus?.errors && schedulerStatus.errors.length > 0 && (
        <Alert
          message="Erreurs récentes du Scheduler"
          description={
            <div className="space-y-2">
              {schedulerStatus.errors.slice(0, 3).map((error, index) => (
                <div key={index} className="text-sm">
                  <Text type="secondary">{new Date(error.timestamp).toLocaleString('fr-FR')}:</Text>
                  <Text className="ml-2">{error.message}</Text>
                </div>
              ))}
            </div>
          }
          type="warning"
          showIcon
        />
      )}

      {/* Informations sur le fonctionnement */}
      <Alert
        message="Comment fonctionne le Scheduler automatique ?"
        description={
          <div className="space-y-2 text-sm">
            <div>• Le scheduler refresh automatiquement les tokens <strong>toutes les 50 minutes</strong></div>
            <div>• Les tokens Google expirent toutes les heures (3600 secondes)</div>
            <div>• Le refresh préventif évite les déconnexions automatiques</div>
            <div>• Si le scheduler est arrêté, les utilisateurs devront se reconnecter manuellement</div>
            <div>• Le système vérifie tous les tokens de toutes les organisations</div>
          </div>
        }
        type="info"
        showIcon
      />
    </div>
  );
};

export default GoogleTokenMonitor;
