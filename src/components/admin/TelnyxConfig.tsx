import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Alert,
  Card,
  Table,
  Tag,
  Statistic,
  Row,
  Col,
  message,
  Typography,
  Select,
  Spin
} from 'antd';
import {
  PhoneOutlined,
  SettingOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  PlusOutlined,
  ExperimentOutlined,
  CloudUploadOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Text } = Typography;
const { Option } = Select;

interface TelnyxConfigProps {
  visible: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
}

interface TelnyxConnection {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  type: 'voice' | 'messaging' | 'mixed';
  webhook_url?: string;
  created_at: string;
  updated_at: string;
}

interface PhoneNumber {
  id: string;
  phone_number: string;
  status: 'active' | 'pending' | 'ported' | 'disabled';
  country_code: string;
  number_type: 'local' | 'toll-free' | 'national' | 'mobile';
  features: string[];
  monthly_cost: number;
  connection_id?: string;
  purchased_at: string;
}

interface TelnyxStats {
  totalCalls: number;
  totalSms: number;
  monthlyCost: number;
  activeNumbers: number;
}

interface SipEndpoint {
  id: string;
  name: string;
  sipUsername: string;
  sipDomain: string;
  status: 'active' | 'inactive' | 'error';
  priority: number;
  timeout: number;
  userId?: string | null;
  userName?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrgUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

type RecentTelnyxCallLeg = {
  id: string;
  legType: 'sip' | 'pstn' | string;
  destination: string;
  status: string;
  priority: number;
  dialedAt: string;
  answeredAt?: string | null;
  endedAt?: string | null;
  endpointId?: string | null;
  Endpoint?: {
    id: string;
    name: string;
    sipUsername: string;
    sipDomain: string;
    userId?: string | null;
  } | null;
};

type RecentTelnyxCall = {
  id: string;
  callId: string;
  direction: string;
  status: string;
  fromNumber: string;
  toNumber: string;
  answeredBy?: string | null;
  startedAt: string;
  endedAt?: string | null;
  createdAt: string;
  TelnyxCallLeg: RecentTelnyxCallLeg[];
};

const TelnyxConfig: React.FC<TelnyxConfigProps> = ({
  visible,
  onClose,
  organizationId,
  organizationName
}) => {
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connections, setConnections] = useState<TelnyxConnection[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [stats, setStats] = useState<TelnyxStats>({
    totalCalls: 0,
    totalSms: 0,
    monthlyCost: 0,
    activeNumbers: 0
  });

  const [configForm] = Form.useForm();
  const [numberForm] = Form.useForm();
  const [sipEndpointForm] = Form.useForm();
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [isNumberModalVisible, setIsNumberModalVisible] = useState(false);
  const [isSipEndpointModalVisible, setIsSipEndpointModalVisible] = useState(false);
  const [editingSipEndpoint, setEditingSipEndpoint] = useState<SipEndpoint | null>(null);
  const [sipEndpoints, setSipEndpoints] = useState<SipEndpoint[]>([]);
  const [telnyxWarning, setTelnyxWarning] = useState<string | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagVisible, setDiagVisible] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);
  const [configMeta, setConfigMeta] = useState<{ hasApiKey: boolean; webhookUrl: string | null; defaultConnectionId: string | null; computedWebhookUrl: string | null; fallbackPstnNumber: string | null; callControlAppId: string | null }>(
    { hasApiKey: false, webhookUrl: null, defaultConnectionId: null, computedWebhookUrl: null, fallbackPstnNumber: null, callControlAppId: null }
  );
  const [replaceApiKey, setReplaceApiKey] = useState(false);
  const [webhookMode, setWebhookMode] = useState<'auto' | 'custom'>('auto');
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [provisioning, setProvisioning] = useState(false);
  const [recentCalls, setRecentCalls] = useState<RecentTelnyxCall[]>([]);
  const [recentCallsLoading, setRecentCallsLoading] = useState(false);

  const loadRecentCalls = useCallback(async () => {
    if (!organizationId) return;
    setRecentCallsLoading(true);
    try {
      const data = await api.get<{ calls: RecentTelnyxCall[] }>('/api/telnyx/recent-calls', { params: { organizationId, limit: 10 } });
      setRecentCalls(Array.isArray(data?.calls) ? data.calls : []);
    } catch (e) {
      console.error('❌ Erreur chargement derniers appels Telnyx:', e);
      setRecentCalls([]);
      message.error('Impossible de charger les derniers appels (debug)');
    } finally {
      setRecentCallsLoading(false);
    }
  }, [api, organizationId]);

  // Charger les données Telnyx pour cette organisation
  const loadTelnyxData = useCallback(async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      const [connectionsData, numbersData, statsData, sipEndpointsData, diagnostic] = await Promise.all([
        api.get<TelnyxConnection[]>('/api/telnyx/connections'),
        api.get<PhoneNumber[]>('/api/telnyx/phone-numbers'),
        api.get<TelnyxStats>('/api/telnyx/stats'),
        api.get<SipEndpoint[]>('/api/telnyx/sip-endpoints', { params: { organizationId } }),
        api.get<any>('/api/telnyx/diagnostic')
      ]);

      setConfigMeta({
        hasApiKey: Boolean(diagnostic?.config?.hasEncryptedApiKey),
        webhookUrl: (
          typeof diagnostic?.config?.webhookUrl === 'string' && diagnostic.config.webhookUrl !== '__AUTO__'
            ? diagnostic.config.webhookUrl
            : null
        ),
        defaultConnectionId: (typeof diagnostic?.config?.defaultConnectionId === 'string' ? diagnostic.config.defaultConnectionId : null),
        computedWebhookUrl: (typeof diagnostic?.computedWebhookUrl === 'string' ? diagnostic.computedWebhookUrl : null),
        fallbackPstnNumber: (typeof diagnostic?.config?.fallbackPstnNumber === 'string' ? diagnostic.config.fallbackPstnNumber : null),
        callControlAppId: (typeof diagnostic?.config?.callControlAppId === 'string' ? diagnostic.config.callControlAppId : null),
      });

      // Déduire un warning depuis le diagnostic (pas via headers, car useAuthenticatedApi retourne directement les données)
      const checks: any[] = Array.isArray(diagnostic?.checks) ? diagnostic.checks : [];
      const firstKo = checks.find(c => c && c.ok === false && c.details && typeof c.details === 'object');
      const code = firstKo?.details?.code;
      setTelnyxWarning(typeof code === 'string' ? code : null);

      setConnections(Array.isArray(connectionsData) ? connectionsData : []);
      setPhoneNumbers(Array.isArray(numbersData) ? numbersData : []);
      setStats(statsData || { totalCalls: 0, totalSms: 0, monthlyCost: 0, activeNumbers: 0 });
      setSipEndpoints(Array.isArray(sipEndpointsData) ? sipEndpointsData : []);
    } catch (error) {
      console.error('❌ Erreur chargement données Telnyx:', error);
      message.error('Erreur lors du chargement des données Telnyx');
    } finally {
      setLoading(false);
    }
  }, [organizationId, api]);

  const loadOrgUsers = useCallback(async () => {
    if (!organizationId) return;
    try {
      const users = await api.get<OrgUser[]>('/api/telnyx/users', { params: { organizationId } });
      setOrgUsers(Array.isArray(users) ? users : []);
    } catch {
      setOrgUsers([]);
    }
  }, [api, organizationId]);

  const openConfigModal = useCallback(() => {
    setReplaceApiKey(!configMeta.hasApiKey);

    const initialWebhookMode: 'auto' | 'custom' = configMeta.webhookUrl ? 'custom' : 'auto';
    setWebhookMode(initialWebhookMode);

    configForm.setFieldsValue({
      api_key: '',
      webhook_mode: initialWebhookMode,
      webhook_url: initialWebhookMode === 'custom'
        ? (configMeta.webhookUrl || '')
        : '',
      default_connection: configMeta.defaultConnectionId || undefined,
      fallback_pstn_number: configMeta.fallbackPstnNumber || '',
      call_control_app_id: configMeta.callControlAppId || '',
    });
    setIsConfigModalVisible(true);
  }, [configForm, configMeta]);

  const closeConfigModal = useCallback(() => {
    setIsConfigModalVisible(false);
    setReplaceApiKey(false);
    setWebhookMode('auto');
  }, []);

  // Synchroniser avec Telnyx API
  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/api/telnyx/sync');
      message.success('Synchronisation Telnyx réussie');
      loadTelnyxData();
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      message.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const handleDiagnose = async () => {
    setDiagLoading(true);
    setDiagVisible(true);
    setDiagResult(null);
    try {
      const diag = await api.get<any>('/api/telnyx/diagnostic');
      setDiagResult(diag);
    } catch (error) {
      console.error('❌ Erreur diagnostic Telnyx:', error);
      setDiagResult({ ok: false, error: 'Erreur lors du diagnostic' });
    } finally {
      setDiagLoading(false);
    }
  };

  const handleProvision = async () => {
    setProvisioning(true);
    try {
      const result = await api.post<any>('/api/telnyx/provision', { organizationId });
      const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
      if (warnings.includes('WEBHOOK_LOCALHOST')) {
        message.warning('Webhook Telnyx sur localhost: utilise une URL publique (Codespaces/Prod/Tunnel).');
      }
      if (warnings.includes('CALL_CONTROL_APP_ID_MISSING')) {
        message.warning('Call Control App manquante: renseigne Call Control App ID dans la config Telnyx.');
      }
      if (warnings.includes('DEFAULT_CONNECTION_MISSING')) {
        message.warning('Connexion par défaut manquante: sélectionne-la dans la config Telnyx.');
      }
      if (warnings.includes('TELNYX_PHONE_NUMBERS_FETCH_FAILED')) {
        message.warning('Impossible de récupérer les numéros Telnyx (API).');
      }

      const assigned = result?.actions?.find?.((a: any) => a?.type === 'assign_numbers')?.connection_id;
      message.success(assigned ? `Provisioning Telnyx appliqué (connection_id: ${assigned})` : 'Provisioning Telnyx appliqué');
      loadTelnyxData();
    } catch (error) {
      console.error('❌ Erreur provisioning Telnyx:', error);
      const anyErr: any = error as any;
      const errMsg = anyErr?.response?.data?.error || anyErr?.response?.data?.message || anyErr?.message || 'Erreur provisioning Telnyx';
      message.error(errMsg);
    } finally {
      setProvisioning(false);
    }
  };

  const handleHangupActiveCalls = async () => {
    try {
      message.loading({ content: 'Raccrochage des appels actifs…', key: 'hangupActive' });
      const result = await api.post<any>('/api/telnyx/calls/hangup-active', { organizationId });
      const attempted = Number(result?.hangupAttempted || 0);
      const ok = Number(result?.hangupOk || 0);
      message.success({ content: `Appels actifs: ${attempted} tentés, ${ok} raccrochés`, key: 'hangupActive', duration: 6 });
      loadRecentCalls();
    } catch (error) {
      const anyErr: any = error as any;
      const errMsg = anyErr?.response?.data?.error || anyErr?.response?.data?.message || anyErr?.message || 'Erreur lors du raccrochage';
      message.error({ content: errMsg, key: 'hangupActive', duration: 6 });
    }
  };

  // Sauvegarder la configuration API
  const handleSaveConfig = async (values: { api_key?: string; webhook_url?: string; default_connection?: string; fallback_pstn_number?: string; call_control_app_id?: string }) => {
    try {
      const apiKey = (values.api_key || '').trim();
      const payload: any = {
        organizationId,
        webhook_url: webhookMode === 'auto' ? '__AUTO__' : values.webhook_url,
        default_connection: values.default_connection,
        fallback_pstn_number: values.fallback_pstn_number,
        call_control_app_id: values.call_control_app_id,
      };
      const shouldSendKey = !configMeta.hasApiKey || replaceApiKey;
      if (shouldSendKey && apiKey.length > 0) payload.api_key = apiKey;

      await api.post('/api/telnyx/config', payload);
      message.success('Configuration Telnyx sauvegardée');
      closeConfigModal();
      loadTelnyxData();
      loadOrgUsers();
    } catch (error) {
      console.error('❌ Erreur sauvegarde config:', error);
      message.error('Erreur lors de la sauvegarde');
    }
  };

  // Acheter un nouveau numéro
  const handlePurchaseNumber = async (values: { country: string; type: string; area_code?: string }) => {
    try {
      await api.post('/api/telnyx/phone-numbers/purchase', values);
      message.success('Numéro acheté avec succès');
      setIsNumberModalVisible(false);
      numberForm.resetFields();
      loadTelnyxData();
    } catch (error) {
      console.error('❌ Erreur achat numéro:', error);
      message.error('Erreur lors de l\'achat du numéro');
    }
  };

  // =========== GESTION SIP ENDPOINTS ===========
  
  const handleOpenSipEndpointModal = (endpoint?: SipEndpoint) => {
    setEditingSipEndpoint(endpoint || null);
    if (endpoint) {
      sipEndpointForm.setFieldsValue({
        name: endpoint.name,
        sipUsername: endpoint.sipUsername,
        sipPassword: '',
        sipDomain: endpoint.sipDomain,
        priority: endpoint.priority,
        timeout: endpoint.timeout,
        userId: endpoint.userId
      });
    } else {
      sipEndpointForm.resetFields();
    }
    setIsSipEndpointModalVisible(true);
  };

  const handleSaveSipEndpoint = async (values: any) => {
    try {
      if (editingSipEndpoint) {
        const updateValues = { ...values };
        if (!updateValues.sipPassword || String(updateValues.sipPassword).trim().length === 0) {
          delete updateValues.sipPassword;
        }
        // Modifier endpoint existant
        await api.put(`/api/telnyx/sip-endpoints/${editingSipEndpoint.id}`, {
          organizationId,
          ...updateValues
        });
        message.success('Endpoint SIP modifié avec succès');
      } else {
        // Créer nouvel endpoint
        await api.post('/api/telnyx/sip-endpoints', {
          organizationId,
          ...values
        });
        message.success('Endpoint SIP créé avec succès');
      }
      setIsSipEndpointModalVisible(false);
      sipEndpointForm.resetFields();
      setEditingSipEndpoint(null);
      loadTelnyxData();
    } catch (error) {
      console.error('❌ Erreur sauvegarde SIP endpoint:', error);
      message.error('Erreur lors de la sauvegarde de l\'endpoint SIP');
    }
  };

  const handleDeleteSipEndpoint = async (endpointId: string) => {
    try {
      await api.delete(`/api/telnyx/sip-endpoints/${endpointId}`);
      message.success('Endpoint SIP supprimé');
      loadTelnyxData();
    } catch (error) {
      console.error('❌ Erreur suppression SIP endpoint:', error);
      message.error('Erreur lors de la suppression');
    }
  };

  const handleTestSipEndpoint = async (endpointId: string) => {
    try {
      message.loading({ content: '📞 Lancement d’un appel test vers Linphone…', key: 'siptest' });
      const result = await api.post<{
        success?: boolean;
        error?: string;
        message?: string;
        callControlId?: string | null;
        webhookUrl?: string;
      }>(`/api/telnyx/sip-endpoints/${endpointId}/test`);

      if (result?.success) {
        const extra = result.callControlId ? ` (call_control_id: ${result.callControlId})` : '';
        message.success({ content: `${result.message || '✅ Appel test lancé'}${extra}`, key: 'siptest', duration: 6 });
        // Rafraîchir le diagnostic “derniers appels” pour voir le leg créé / mis à jour
        loadRecentCalls();
      } else {
        message.error({ content: `❌ ${result?.error || 'Test invalide'}`, key: 'siptest', duration: 6 });
      }
    } catch (error) {
      const msg = (error as any)?.message || 'Test échoué';
      message.error({ content: `❌ ${msg}`, key: 'siptest', duration: 6 });
    }
  };

  useEffect(() => {
    if (visible && organizationId) {
      loadTelnyxData();
      loadOrgUsers();
      loadRecentCalls();
    }
  }, [visible, organizationId, loadTelnyxData, loadOrgUsers]);

  const recentCallColumns = [
    { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', width: 170, render: (v: string) => new Date(v).toLocaleString() },
    { title: 'Direction', dataIndex: 'direction', key: 'direction', width: 90 },
    { title: 'De', dataIndex: 'fromNumber', key: 'fromNumber', width: 140 },
    { title: 'Vers', dataIndex: 'toNumber', key: 'toNumber', width: 140 },
    { title: 'Statut', dataIndex: 'status', key: 'status', width: 110, render: (s: string) => {
      const color = s === 'completed' ? 'green' : (s === 'in-progress' ? 'blue' : (s === 'ringing' ? 'gold' : 'default'));
      return <Tag color={color}>{String(s)}</Tag>;
    } },
    { title: 'Answered by', dataIndex: 'answeredBy', key: 'answeredBy', ellipsis: true, render: (v: string | null) => v || <Text type="secondary">—</Text> },
  ];

  const recentLegColumns = [
    { title: 'Prio', dataIndex: 'priority', key: 'priority', width: 70 },
    { title: 'Type', dataIndex: 'legType', key: 'legType', width: 80 },
    { title: 'Destination', dataIndex: 'destination', key: 'destination', ellipsis: true },
    { title: 'Statut', dataIndex: 'status', key: 'status', width: 110, render: (s: string) => {
      const low = String(s || '').toLowerCase();
      const color = low === 'answered' ? 'green' : (low === 'dialing' ? 'blue' : (low === 'pending' ? 'default' : 'red'));
      return <Tag color={color}>{String(s)}</Tag>;
    } },
    { title: 'Endpoint', dataIndex: 'Endpoint', key: 'Endpoint', width: 180, render: (ep: any) => ep?.name ? ep.name : <Text type="secondary">—</Text> },
  ];

  const sipEndpointColumns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>
    },
    {
      title: 'SIP Username',
      dataIndex: 'sipUsername',
      key: 'sipUsername',
      render: (username: string) => <Text code>{username}</Text>
    },
    {
      title: 'Priorité',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: number) => {
        const priorityMap = {
          1: { text: 'CRM (1)', color: 'red' },
          2: { text: 'Softphone (2)', color: 'blue' },
          3: { text: 'PSTN (3)', color: 'green' }
        };
        const config = priorityMap[priority as keyof typeof priorityMap] || { text: `Priority ${priority}`, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Timeout',
      dataIndex: 'timeout',
      key: 'timeout',
      render: (timeout: number) => `${timeout}s`
    },
    {
      title: 'Utilisateur',
      dataIndex: 'userName',
      key: 'userName',
      render: (userName?: string, record?: SipEndpoint) => {
        if (!record?.userId) {
          return <Tag color="purple">🏢 Organisation (CRM)</Tag>;
        }
        return <Text>{userName || 'Utilisateur'}</Text>;
      }
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap = {
          'active': { text: 'Actif', color: 'success', icon: <CheckCircleOutlined /> },
          'inactive': { text: 'Inactif', color: 'default', icon: <CloseCircleOutlined /> },
          'error': { text: 'Erreur', color: 'error', icon: <CloseCircleOutlined /> }
        };
        const config = statusMap[status as keyof typeof statusMap] || { text: status, color: 'default', icon: null };
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: SipEndpoint) => (
        <Space>
          <Button
            size="small"
            type="link"
            onClick={() => handleTestSipEndpoint(record.id)}
          >
            Tester
          </Button>
          <Button
            size="small"
            type="link"
            onClick={() => handleOpenSipEndpointModal(record)}
          >
            Modifier
          </Button>
          <Button
            size="small"
            type="link"
            danger
            onClick={() => handleDeleteSipEndpoint(record.id)}
          >
            Supprimer
          </Button>
        </Space>
      )
    }
  ];

  const phoneNumberColumns = [
    {
      title: 'Numéro',
      dataIndex: 'phone_number',
      key: 'phone_number',
      render: (number: string) => <Text strong>{number}</Text>
    },
    {
      title: 'Type',
      dataIndex: 'number_type',
      key: 'number_type',
      render: (type: string) => {
        const typeMap = {
          'local': { text: 'Local', color: 'blue' },
          'toll-free': { text: 'Gratuit', color: 'green' },
          'national': { text: 'National', color: 'orange' },
          'mobile': { text: 'Mobile', color: 'purple' }
        };
        const config = typeMap[type as keyof typeof typeMap] || { text: type, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap = {
          'active': { text: 'Actif', color: 'success', icon: <CheckCircleOutlined /> },
          'pending': { text: 'En attente', color: 'warning', icon: <SyncOutlined /> },
          'disabled': { text: 'Désactivé', color: 'error', icon: <CloseCircleOutlined /> }
        };
        const config = statusMap[status as keyof typeof statusMap] || { text: status, color: 'default', icon: null };
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      }
    },
    {
      title: 'Coût/mois',
      dataIndex: 'monthly_cost',
      key: 'monthly_cost',
      render: (cost: number) => `$${cost.toFixed(2)}`
    },
    {
      title: 'Fonctionnalités',
      dataIndex: 'features',
      key: 'features',
      render: (features: string[]) => (
        <Space>
          {features.map(feature => (
            <Tag key={feature} size="small">{feature}</Tag>
          ))}
        </Space>
      )
    }
  ];

  return (
    <>
      <Modal
        title={<><PhoneOutlined style={{ color: '#FF6B6B' }} /> Configuration Telnyx - {organizationName}</>}
        open={visible}
        onCancel={onClose}
        width={1200}
        footer={null}
        className="telnyx-config-modal"
      >
        <Modal
          title="🧪 Diagnostic Telnyx (API)"
          open={diagVisible}
          onCancel={() => setDiagVisible(false)}
          footer={null}
          width={800}
        >
          <Spin spinning={diagLoading}>
            {diagResult ? renderDiag(diagResult) : <Text type="secondary">Chargement…</Text>}
          </Spin>
        </Modal>

        <Spin spinning={loading}>
          {telnyxWarning && (
            <Alert
              type={telnyxWarning.includes('TELNYX_UNAUTHORIZED') ? 'error' : 'warning'}
              showIcon
              style={{ marginBottom: 16 }}
              message={
                telnyxWarning.includes('TELNYX_UNAUTHORIZED')
                  ? 'Telnyx refuse la clé API'
                  : 'Telnyx non configuré'
              }
              description={
                telnyxWarning.includes('TELNYX_UNAUTHORIZED')
                  ? "La clé API est invalide (souvent: Key ID collé au lieu du SECRET). Ouvre ‘Configuration API’, colle le secret Telnyx, sauvegarde, puis clique ‘Synchroniser’."
                  : "Configure la clé API Telnyx (secret), sauvegarde, puis clique ‘Synchroniser’. Si tu as déjà un numéro dans Telnyx, tu n'as PAS besoin d'en acheter un ici."
              }
            />
          )}

          {/* Actions */}
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Button 
                icon={<SyncOutlined spin={syncing} />}
                onClick={handleSync}
                loading={syncing}
              >
                Synchroniser
              </Button>
              <Button 
                icon={<SettingOutlined />}
                onClick={openConfigModal}
              >
                Configuration API
              </Button>
              <Button
                icon={<ExperimentOutlined />}
                onClick={handleDiagnose}
              >
                Tester API
              </Button>
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                onClick={handleProvision}
                loading={provisioning}
              >
                Appliquer à Telnyx
              </Button>
              <Button
                danger
                onClick={handleHangupActiveCalls}
              >
                Raccrocher appels actifs
              </Button>
              <Button 
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsNumberModalVisible(true)}
              >
                Acheter un numéro
              </Button>
            </Space>
          </div>

          {/* Statistiques */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Numéros actifs"
                  value={stats.activeNumbers}
                  prefix={<PhoneOutlined style={{ color: '#52c41a' }} />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Appels ce mois"
                  value={stats.totalCalls}
                  prefix={<PhoneOutlined style={{ color: '#1890ff' }} />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="SMS ce mois"
                  value={stats.totalSms}
                  prefix={<PhoneOutlined style={{ color: '#722ed1' }} />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Coût mensuel"
                  value={stats.monthlyCost}
                  prefix={<DollarOutlined style={{ color: '#fa8c16' }} />}
                  precision={2}
                />
              </Card>
            </Col>
          </Row>

          {/* Debug: derniers appels + legs */}
          <Card
            title="🧪 Diagnostic: derniers appels (cascade)"
            style={{ marginBottom: 16 }}
            extra={
              <Button size="small" onClick={loadRecentCalls} loading={recentCallsLoading}>
                Rafraîchir
              </Button>
            }
          >
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message="But"
              description="Ici on voit si le CRM tente bien un leg SIP vers Linphone (ex: sip:jonathandethier@sip.telnyx.com) et si Telnyx le marque timeout/busy/failed."
            />
            <Table
              dataSource={recentCalls}
              columns={recentCallColumns as any}
              rowKey="id"
              size="small"
              loading={recentCallsLoading}
              pagination={false}
              locale={{ emptyText: 'Aucun appel enregistré pour le moment' }}
              expandable={{
                expandedRowRender: (record: RecentTelnyxCall) => (
                  <Table
                    dataSource={Array.isArray(record.TelnyxCallLeg) ? record.TelnyxCallLeg : []}
                    columns={recentLegColumns as any}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    locale={{ emptyText: 'Aucun leg' }}
                  />
                ),
                rowExpandable: (record: RecentTelnyxCall) => Array.isArray(record.TelnyxCallLeg) && record.TelnyxCallLeg.length > 0,
              }}
            />
          </Card>

          {/* Configuration */}
          {connections.length === 0 && phoneNumbers.length === 0 && (
            <Alert
              message="Configuration Telnyx requise"
              description="Configurez votre clé API Telnyx et achetez votre premier numéro pour commencer."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              action={
                <Button 
                  size="small" 
                  type="primary"
                  onClick={openConfigModal}
                >
                  Configuration API
                </Button>
              }
            />
          )}

          {/* Numéros de téléphone */}
          <Card 
            title="📞 Numéros de téléphone" 
            style={{ marginBottom: 16 }}
            extra={
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsNumberModalVisible(true)}
              >
                Acheter un numéro
              </Button>
            }
          >
            <Table
              dataSource={phoneNumbers}
              columns={phoneNumberColumns}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: 'Aucun numéro configuré' }}
            />
          </Card>

          {/* SIP Endpoints (CASCADE CRM → Softphones → PSTN) */}
          <Card 
            title="🎯 Endpoints SIP (Cascade téléphonique)" 
            style={{ marginBottom: 16 }}
            extra={
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenSipEndpointModal()}
              >
                Ajouter endpoint
              </Button>
            }
          >
            <Alert
              message="Architecture Cascade"
              description="Les endpoints SIP permettent de définir la cascade d'appel : CRM (priorité 1) → Softphones (priorité 2) → PSTN (priorité 3). Chaque endpoint a un timeout (10s par défaut)."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Table
              dataSource={sipEndpoints}
              columns={sipEndpointColumns}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: 'Aucun endpoint SIP configuré' }}
            />
          </Card>

          {/* Connexions */}
          <Card title="🔗 Connexions Telnyx">
            <Table
              dataSource={connections}
              columns={[
                { title: 'Nom', dataIndex: 'name', key: 'name' },
                { 
                  title: 'Statut', 
                  dataIndex: 'status', 
                  key: 'status',
                  render: (status: string) => (
                    <Tag color={status === 'active' ? 'success' : 'error'}>
                      {status === 'active' ? 'Actif' : 'Inactif'}
                    </Tag>
                  )
                },
                { title: 'Type', dataIndex: 'type', key: 'type' },
                { 
                  title: 'Date création', 
                  dataIndex: 'created_at', 
                  key: 'created_at',
                  render: (date: string) => new Date(date).toLocaleDateString()
                }
              ]}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: 'Aucune connexion configurée' }}
            />
          </Card>
        </Spin>
      </Modal>

      {/* Modal Configuration API */}
      <Modal
        title="⚙️ Configuration API Telnyx"
        open={isConfigModalVisible}
        onCancel={closeConfigModal}
        footer={null}
        width={600}
      >
        <Form form={configForm} layout="vertical" onFinish={handleSaveConfig}>
          <Alert
            message="Configuration API Telnyx"
            description={
              configMeta.hasApiKey
                ? (replaceApiKey
                  ? "Tu vas remplacer la clé API enregistrée. Colle la nouvelle Secret API Key Telnyx."
                  : "Clé API enregistrée (masquée). Pour des raisons de sécurité, elle n’est jamais ré-affichée. Clique sur “Remplacer la clé” si tu veux en enregistrer une nouvelle.")
                : "Colle ta Secret API Key Telnyx pour activer l'intégration."
            }
            type={configMeta.hasApiKey ? (replaceApiKey ? 'warning' : 'success') : 'info'}
            showIcon
            style={{ marginBottom: 16 }}
            action={
              configMeta.hasApiKey && !replaceApiKey
                ? (
                  <Button type="link" onClick={() => setReplaceApiKey(true)}>
                    Remplacer la clé
                  </Button>
                )
                : undefined
            }
          />
          
          {(!configMeta.hasApiKey || replaceApiKey) && (
            <Form.Item
              name="api_key"
              label="Clé API Telnyx"
              rules={
                [
                  ...((!configMeta.hasApiKey || replaceApiKey) ? [{ required: true, message: 'Clé API requise' }] : []),
                  {
                    validator: async (_rule, value) => {
                      const v = String(value || '');
                      if (!v) return;
                      if (/\s/.test(v)) throw new Error('La clé ne doit pas contenir d’espaces ou de retours à la ligne');
                      if (/^Bearer\s+/i.test(v)) throw new Error("Ne colle pas 'Bearer …' — colle uniquement la Secret API Key");
                      if (v.includes('"') || v.includes("'")) throw new Error('Ne colle pas de guillemets');
                    },
                  },
                ]
              }
            >
              <Input.Password placeholder={'SECRET_API_KEY_...'} autoComplete="new-password" />
            </Form.Item>
          )}
          
          <Form.Item name="webhook_url" label="URL Webhook">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Select
                value={webhookMode}
                style={{ width: 220 }}
                onChange={(v: 'auto' | 'custom') => {
                  setWebhookMode(v);
                  configForm.setFieldsValue({ webhook_mode: v });
                  if (v === 'auto') {
                    configForm.setFieldsValue({ webhook_url: '' });
                  } else {
                    configForm.setFieldsValue({ webhook_url: configMeta.webhookUrl || configMeta.computedWebhookUrl || '' });
                  }
                }}
                options={[
                  { value: 'auto', label: 'Auto (recommandé)' },
                  { value: 'custom', label: 'Personnalisée' },
                ]}
              />
              {webhookMode === 'auto' ? (
                <Text type="secondary">
                  Utilise automatiquement: <Text code>{configMeta.computedWebhookUrl || ''}</Text>
                </Text>
              ) : null}
            </div>
          </Form.Item>

          <Form.Item
            name="webhook_url"
            label={webhookMode === 'custom' ? 'URL Webhook personnalisée' : undefined}
            hidden={webhookMode !== 'custom'}
            rules={
              webhookMode === 'custom'
                ? [
                    { required: true, message: 'URL Webhook requise' },
                    { type: 'url', message: 'URL invalide' },
                  ]
                : []
            }
          >
            <Input placeholder="https://app.2thier.be/api/telnyx/webhooks" />
          </Form.Item>

          <Form.Item
            name="call_control_app_id"
            label="Call Control App ID"
            help="ID de l’application Call Control Telnyx (nécessaire pour auto-configurer le webhook)"
          >
            <Input placeholder="1293384261075731499" />
          </Form.Item>
          
          <Form.Item name="default_connection" label="Connexion par défaut">
            <Select placeholder="Sélectionner une connexion">
              {connections.map(conn => (
                <Option key={conn.id} value={conn.id}>{conn.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="fallback_pstn_number"
            label="Redirection GSM (fallback)"
            help="Format E.164, ex: +32477123456 (laisser vide pour désactiver)"
          >
            <Input placeholder="+32477123456" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Sauvegarder
              </Button>
              <Button onClick={closeConfigModal}>
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Achat Numéro */}
      <Modal
        title="🔢 Acheter un Numéro"
        open={isNumberModalVisible}
        onCancel={() => setIsNumberModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={numberForm} layout="vertical" onFinish={handlePurchaseNumber}>
          <Form.Item name="country" label="Pays" rules={[{ required: true }]}>
            <Select placeholder="Sélectionner un pays">
              <Option value="BE">🇧🇪 Belgique</Option>
              <Option value="FR">🇫🇷 France</Option>
              <Option value="US">🇺🇸 États-Unis</Option>
              <Option value="CA">🇨🇦 Canada</Option>
              <Option value="GB">🇬🇧 Royaume-Uni</Option>
              <Option value="DE">🇩🇪 Allemagne</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="type" label="Type de numéro" rules={[{ required: true }]}>
            <Select placeholder="Sélectionner le type">
              <Option value="local">📍 Local</Option>
              <Option value="toll-free">🆓 Numéro vert</Option>
              <Option value="national">🌍 National</Option>
              <Option value="mobile">📱 Mobile</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="area_code" label="Indicatif régional (optionnel)">
            <Input placeholder="Ex: 01, 02, 03..." />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                Acheter
              </Button>
              <Button onClick={() => setIsNumberModalVisible(false)}>
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal SIP Endpoint */}
      <Modal
        title={editingSipEndpoint ? "🎯 Modifier Endpoint SIP" : "🎯 Créer Endpoint SIP"}
        open={isSipEndpointModalVisible}
        onCancel={() => {
          setIsSipEndpointModalVisible(false);
          setEditingSipEndpoint(null);
          sipEndpointForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={sipEndpointForm} layout="vertical" onFinish={handleSaveSipEndpoint}>
          <Alert
            message="Configuration Endpoint SIP"
            description={
              <div>
                <p>Les endpoints SIP permettent de router les appels selon la priorité :</p>
                <ul>
                  <li><strong>Priorité 1 (CRM)</strong> : Endpoint principal de l'organisation (aucun utilisateur assigné)</li>
                  <li><strong>Priorité 2 (Softphones)</strong> : Softphones des utilisateurs (ring simultané)</li>
                  <li><strong>Priorité 3 (PSTN)</strong> : Passerelle vers GSM</li>
                </ul>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Form.Item 
            name="name" 
            label="Nom de l'endpoint" 
            rules={[{ required: true, message: 'Nom requis' }]}
          >
            <Input placeholder="Ex: CRM Principal, Softphone Alice, Passerelle GSM..." />
          </Form.Item>
          
          <Form.Item 
            name="sipUsername" 
            label="SIP Username" 
            rules={[
              { required: true, message: 'Username requis' },
              { pattern: /^[^@\s]+$/, message: 'Mets uniquement le username (sans @domaine, sans espaces)' },
            ]}
          >
            <Input placeholder="Ex: crm-main, alice-softphone, gsm-gateway..." />
          </Form.Item>
          
          <Form.Item 
            name="sipPassword" 
            label="SIP Password" 
            rules={[{ required: !editingSipEndpoint, message: 'Password requis' }]}
          >
            <Input.Password placeholder={editingSipEndpoint ? '•••••••• (conservé si vide)' : 'Mot de passe SIP (sera chiffré)'} />
          </Form.Item>
          
          <Form.Item 
            name="sipDomain" 
            label="SIP Domain" 
            initialValue="votre-org.sip.telnyx.com"
            rules={[
              { required: true, message: 'Domain requis' },
              {
                validator: async (_, value) => {
                  const raw = String(value ?? '').trim();
                  if (!raw) return;
                  if (/^sip:/i.test(raw)) throw new Error('Ne mets pas "sip:" ici (juste le domaine)');
                  if (raw.includes('@')) throw new Error('Ne mets pas de username ici (juste le domaine)');
                  if (/\s/.test(raw)) throw new Error('Le domaine ne peut pas contenir d’espaces');
                },
              },
            ]}
          >
            <Input placeholder="Ex: votre-org.sip.telnyx.com" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="priority" 
                label="Priorité" 
                initialValue={1}
                rules={[{ required: true, message: 'Priorité requise' }]}
              >
                <Select>
                  <Option value={1}>🔴 Priorité 1 (CRM)</Option>
                  <Option value={2}>🔵 Priorité 2 (Softphones)</Option>
                  <Option value={3}>🟢 Priorité 3 (PSTN)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="timeout" 
                label="Timeout (secondes)" 
                initialValue={10}
                rules={[{ required: true, message: 'Timeout requis' }]}
              >
                <Input type="number" min={5} max={60} placeholder="10" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item 
            name="userId" 
            label="Utilisateur assigné (optionnel)"
            help="Laisser vide pour un endpoint d'organisation (CRM). Assigner à un utilisateur pour un softphone personnel."
          >
            <Select
              placeholder="Aucun (endpoint organisation)"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.children as string).toLowerCase().includes(input.toLowerCase())
              }
            >
              {orgUsers.map(u => {
                const fullName = `${(u.firstName || '').trim()} ${(u.lastName || '').trim()}`.trim();
                return (
                  <Option key={u.id} value={u.id}>
                    {fullName || u.email}
                  </Option>
                );
              })}
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingSipEndpoint ? 'Modifier' : 'Créer'}
              </Button>
              <Button onClick={() => {
                setIsSipEndpointModalVisible(false);
                setEditingSipEndpoint(null);
                sipEndpointForm.resetFields();
              }}>
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// Modal Diagnostic Telnyx
const renderDiag = (diag: any) => {
  if (!diag) return null;
  const checks: any[] = Array.isArray(diag.checks) ? diag.checks : [];
  const apiKeyMeta = diag.apiKeyMeta && typeof diag.apiKeyMeta === 'object' ? diag.apiKeyMeta : null;
  const cfg = diag.config && typeof diag.config === 'object' ? diag.config : null;

  return (
    <div>
      <Text strong>Organisation:</Text> <Text>{String(diag.organizationId || '')}</Text>
      <br />
      <Text strong>OK:</Text> <Text>{String(Boolean(diag.ok))}</Text>
      <br />
      <Text strong>Source clé API:</Text> <Text>{String(diag.apiKeySource || 'n/a')}</Text>
      <br />
      {apiKeyMeta && (
        <>
          <Text strong>Clé (meta):</Text>{' '}
          <Text>{`len=${String(apiKeyMeta.length ?? 'n/a')}, fp=${String(apiKeyMeta.fingerprint ?? 'n/a')}, prefix=${String(apiKeyMeta.prefix ?? 'n/a')}`}</Text>
          <br />
        </>
      )}
      <Text strong>Webhook (calculé):</Text> <Text>{String(diag.computedWebhookUrl || '')}</Text>
      <br />
      {cfg && (
        <>
          <Text strong>Config (DB):</Text>{' '}
          <Text>
            {`exists=${String(Boolean(cfg.exists))}, hasKey=${String(Boolean(cfg.hasEncryptedApiKey))}, webhookUrl=${String(cfg.webhookUrl ?? 'n/a')}, defaultConnectionId=${String(cfg.defaultConnectionId ?? 'n/a')}, fallbackPstnNumber=${String(cfg.fallbackPstnNumber ?? 'n/a')}`}
          </Text>
          <br />
        </>
      )}
      <br />

      <Text strong>Étapes:</Text>
      <div style={{ marginTop: 8 }}>
        {checks.length === 0 && <Text type="secondary">Aucune étape retournée.</Text>}
        {checks.map((c, idx) => (
          <div key={`${c.name}-${idx}`} style={{ marginBottom: 8 }}>
            <Tag color={c.ok ? 'green' : 'red'}>{c.ok ? 'OK' : 'KO'}</Tag>
            <Text style={{ marginRight: 8 }}>{c.name}</Text>
            {c.details && (
              <Text type="secondary">{typeof c.details === 'string' ? c.details : JSON.stringify(c.details)}</Text>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Patch: exporter le modal dans le composant
// (On le garde simple: modal de lecture)

export default TelnyxConfig;
