/**
 * ============================================================
 *  ZhiiveMailAdminPage — Administration complète Zhiive Mail
 * ============================================================
 *
 *  Module admin connecté au serveur Postal (Hetzner) avec :
 *    - Dashboard : statut serveur, DNS, Docker, disque
 *    - Messages : liste temps-réel des messages Postal
 *    - Comptes : provisionnement, modification, suppression
 *    - Infrastructure : domaines, routes, credentials, IP pools
 *    - Statistiques : envoi/réception par jour/heure
 * ============================================================
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Button, Tag, Space, Typography, Statistic,
  Row, Col, Modal, message, Popconfirm, Alert, Input, Spin,
  Tooltip, Badge, Divider, Tabs, Progress, Descriptions,
} from 'antd';
import {
  MailOutlined, CheckCircleOutlined, CloseCircleOutlined,
  TeamOutlined, SendOutlined, ReloadOutlined,
  DeleteOutlined, EditOutlined, ThunderboltOutlined,
  SettingOutlined, CloudOutlined, SafetyCertificateOutlined,
  DashboardOutlined, DatabaseOutlined, GlobalOutlined,
  WarningOutlined, CloudServerOutlined, ApiOutlined,
  ClearOutlined, PoweroffOutlined, RocketOutlined,
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { SF } from '../../components/zhiive/ZhiiveTheme';

const { Title, Text, Paragraph } = Typography;

// ═══ Types ═══════════════════════════════════════════════════

interface SmtpStatus {
  configured: boolean;
  host: string;
  port: number;
  user: string;
  from: string;
}

interface SystemStatus {
  smtp: SmtpStatus;
  postal: { configured: boolean; url: string | null };
  stats: { totalAccounts: number; postalAccounts: number; gmailAccounts: number; totalEmails: number };
  mode: string;
}

interface EmailAccount {
  id: string;
  emailAddress: string;
  mailProvider: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; firstName: string | null; lastName: string | null; email: string; role: string };
}

interface ServerOverview {
  connected: boolean;
  server: {
    host: string;
    containers: { name: string; status: string }[];
    disk: { total: string; used: string; available: string; percentage: string } | null;
  };
  dns: Record<string, { value: string; ok: boolean; status?: string; fix?: string }>;
  ipAddresses: { ipv4: string; hostname: string; pool_name: string }[];
  suppressions: number;
}

interface PostalStats {
  messageStatuses: Record<string, number>;
  totalMessages: number;
  daily: { date: string; incoming: number; outgoing: number; spam: number; bounces: number; held: number }[];
  hourly: { time: string; incoming: number; outgoing: number; spam: number; bounces: number }[];
}

interface PostalMessage {
  id: number;
  to: string;
  from: string;
  subject: string;
  status: string;
  timestamp: string;
  spamScore: number;
}

// ═══ Composant principal ═════════════════════════════════════

const ZhiiveMailAdminPage: React.FC = () => {
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook, []);
  const { isSuperAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [serverOverview, setServerOverview] = useState<ServerOverview | null>(null);
  const [postalStats, setPostalStats] = useState<PostalStats | null>(null);
  const [postalMessages, setPostalMessages] = useState<PostalMessage[]>([]);
  const [postalDomains, setPostalDomains] = useState<any[]>([]);
  const [postalCredentials, setPostalCredentials] = useState<any[]>([]);
  const [postalRoutes, setPostalRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [editModal, setEditModal] = useState<{ visible: boolean; account: EmailAccount | null }>({ visible: false, account: null });
  const [editEmail, setEditEmail] = useState('');

  // ─── Chargement données ──────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const [statusData, accountsData] = await Promise.all([
        api.api.get('/api/zhiivemail/status'),
        api.api.get('/api/zhiivemail/accounts'),
      ]);
      setStatus(statusData);
      setAccounts(accountsData || []);
    } catch (e: any) {
      console.error('Fetch status error:', e);
    }
  }, [api]);

  const fetchServerOverview = useCallback(async () => {
    try {
      const data = await api.api.get('/api/zhiivemail/server-overview');
      setServerOverview(data);
    } catch (e: any) {
      console.error('Fetch server-overview error:', e);
    }
  }, [api]);

  const fetchPostalStats = useCallback(async () => {
    try {
      const data = await api.api.get('/api/zhiivemail/postal-stats');
      setPostalStats(data);
    } catch (e: any) {
      console.error('Fetch postal-stats error:', e);
    }
  }, [api]);

  const fetchPostalMessages = useCallback(async () => {
    try {
      const data = await api.api.get('/api/zhiivemail/postal-messages?limit=100');
      setPostalMessages(data || []);
    } catch (e: any) {
      console.error('Fetch postal-messages error:', e);
    }
  }, [api]);

  const fetchInfrastructure = useCallback(async () => {
    try {
      const [domains, credentials, routes] = await Promise.all([
        api.api.get('/api/zhiivemail/postal-domains'),
        api.api.get('/api/zhiivemail/postal-credentials'),
        api.api.get('/api/zhiivemail/postal-routes'),
      ]);
      setPostalDomains(domains || []);
      setPostalCredentials(credentials || []);
      setPostalRoutes(routes || []);
    } catch (e: any) {
      console.error('Fetch infrastructure error:', e);
    }
  }, [api]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStatus(), fetchServerOverview(), fetchPostalStats()]);
    setLoading(false);
  }, [fetchStatus, fetchServerOverview, fetchPostalStats]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (activeTab === 'messages') fetchPostalMessages();
    if (activeTab === 'infra') fetchInfrastructure();
  }, [activeTab, fetchPostalMessages, fetchInfrastructure]);

  // ─── Actions ─────────────────────────────────────────────
  const handleTestSmtp = async () => {
    setTestLoading(true);
    try {
      const result = await api.api.post('/api/zhiivemail/test-smtp', { to: testEmail || undefined });
      if (result.success) message.success(`Email test envoyé à ${result.recipient}`);
      else message.error('Échec du test SMTP');
    } catch (e: any) { message.error(e.message || 'Erreur SMTP'); }
    finally { setTestLoading(false); }
  };

  const handleProvisionAll = async () => {
    setProvisionLoading(true);
    try {
      const result = await api.api.post('/api/zhiivemail/provision-all', {});
      message.success(`${result.created} compte(s) créé(s) sur ${result.total} utilisateur(s)`);
      fetchStatus();
    } catch (e: any) { message.error(e.message || 'Erreur provisionnement'); }
    finally { setProvisionLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.api.delete(`/api/zhiivemail/accounts/${id}`);
      message.success('Compte supprimé');
      fetchStatus();
    } catch (e: any) { message.error(e.message || 'Erreur suppression'); }
  };

  const handleEdit = async () => {
    if (!editModal.account || !editEmail.trim()) return;
    try {
      await api.api.patch(`/api/zhiivemail/accounts/${editModal.account.id}`, { emailAddress: editEmail.trim() });
      message.success('Compte mis à jour');
      setEditModal({ visible: false, account: null });
      fetchStatus();
    } catch (e: any) { message.error(e.message || 'Erreur modification'); }
  };

  const handleClearSuppressions = async () => {
    try {
      const result = await api.api.post('/api/zhiivemail/clear-suppressions', {});
      message.success(`Suppressions vidées. Restantes: ${result.remaining}`);
      fetchServerOverview();
    } catch (e: any) { message.error(e.message || 'Erreur'); }
  };

  const handleRestartPostal = async () => {
    const hide = message.loading('Redémarrage de Postal...', 0);
    try {
      const result = await api.api.post('/api/zhiivemail/postal-restart', {});
      hide();
      if (result.success) {
        message.success(`Postal redémarré (${result.containers?.length} containers)`);
        setTimeout(fetchServerOverview, 3000);
      }
    } catch (e: any) { hide(); message.error(e.message || 'Erreur redémarrage'); }
  };

  // ─── Guard ───────────────────────────────────────────────
  if (!isSuperAdmin) return <Alert type="error" message="Accès réservé aux Super Admins" showIcon />;
  if (loading && !status) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

  // ═══ HELPERS ═══════════════════════════════════════════════
  const statusColor = (s: string) => {
    switch (s) {
      case 'Sent': return 'green';
      case 'SoftFail': return 'orange';
      case 'HardFail': return 'red';
      case 'Held': return 'gold';
      default: return 'default';
    }
  };

  const dnsTag = (check: { ok: boolean; value: string; status?: string; fix?: string }, label: string) => {
    const color = check.status === 'warning' ? 'orange' : check.ok ? 'green' : 'red';
    const icon = check.status === 'warning' ? <WarningOutlined /> : check.ok ? <CheckCircleOutlined /> : <CloseCircleOutlined />;
    return (
      <Tooltip title={check.fix || check.value}>
        <Tag color={color} icon={icon}>
          {check.status === 'warning' ? 'ATTENTION' : label}
        </Tag>
      </Tooltip>
    );
  };

  // ═══ TAB: DASHBOARD ════════════════════════════════════════
  const renderDashboard = () => (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${SF.primary}` }}>
            <Statistic title="Comptes @zhiive" value={status?.stats.postalAccounts || 0} prefix={<TeamOutlined />} suffix={`/ ${status?.stats.totalAccounts || 0}`} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${SF.success}` }}>
            <Statistic title="Emails en DB" value={status?.stats.totalEmails || 0} prefix={<MailOutlined />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${SF.info}` }}>
            <Statistic title="Messages Postal" value={postalStats?.totalMessages || 0} prefix={<RocketOutlined />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" style={{ borderTop: postalStats?.messageStatuses?.HardFail ? `3px solid ${SF.danger}` : `3px solid ${SF.success}` }}>
            <Statistic title="Bounces" value={postalStats?.messageStatuses?.HardFail || 0} prefix={<WarningOutlined />} valueStyle={{ color: postalStats?.messageStatuses?.HardFail ? SF.danger : SF.success }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} md={12}>
          <Card size="small" title={<><CloudServerOutlined /> Serveur Hetzner</>}
            extra={<Badge status={serverOverview?.connected ? 'success' : 'error'} text={serverOverview?.connected ? 'Connecté' : 'Déconnecté'} />}>
            {serverOverview?.connected ? (
              <>
                <Descriptions size="small" column={1} bordered>
                  <Descriptions.Item label="IP">{serverOverview.server.host}</Descriptions.Item>
                  <Descriptions.Item label="Disque">
                    {serverOverview.server.disk ? (
                      <Space>
                        <Progress type="circle" size={40} percent={parseInt(serverOverview.server.disk.percentage)} strokeColor={parseInt(serverOverview.server.disk.percentage) > 80 ? SF.danger : SF.primary} />
                        <Text>{serverOverview.server.disk.used} / {serverOverview.server.disk.total}</Text>
                      </Space>
                    ) : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="IP Pool">
                    {serverOverview.ipAddresses.map((ip, i) => (
                      <Tag key={i} color="blue">{ip.ipv4} ({ip.hostname}) — {ip.pool_name}</Tag>
                    ))}
                  </Descriptions.Item>
                  <Descriptions.Item label="Suppressions">
                    <Space>
                      <Tag color={serverOverview.suppressions > 0 ? 'red' : 'green'}>{serverOverview.suppressions}</Tag>
                      {serverOverview.suppressions > 0 && (
                        <Popconfirm title="Vider la liste de suppression ?" onConfirm={handleClearSuppressions} okText="Vider" cancelText="Annuler">
                          <Button size="small" icon={<ClearOutlined />} danger>Vider</Button>
                        </Popconfirm>
                      )}
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
                <Divider style={{ margin: '12px 0' }} />
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Docker Containers</Text>
                {serverOverview.server.containers.map((c, i) => (
                  <Tag key={i} color={c.status.startsWith('Up') ? 'green' : 'red'} style={{ marginBottom: 4 }}>
                    {c.name}: {c.status}
                  </Tag>
                ))}
              </>
            ) : (
              <Alert type="warning" message="SSH non configuré" description="Ajoutez POSTAL_SSH_PASS dans .env pour connecter le dashboard au serveur." showIcon />
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card size="small" title={<><GlobalOutlined /> DNS zhiive.com</>}
            extra={serverOverview?.dns && Object.values(serverOverview.dns).every(d => d.status === 'ok')
              ? <Tag color="green">Tout OK</Tag>
              : Object.values(serverOverview?.dns || {}).some(d => d.status === 'warning')
                ? <Tag color="orange">Améliorations requises</Tag>
                : <Tag color="red">Vérifier</Tag>}>
            {serverOverview?.dns ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {Object.entries(serverOverview.dns).map(([key, check]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <Text strong style={{ textTransform: 'uppercase', width: 100 }}>{key === 'returnPath' ? 'Return Path' : key}</Text>
                    {dnsTag(check, check.ok ? 'OK' : 'ERREUR')}
                    <Text type="secondary" style={{ fontSize: 11, flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {check.fix || check.value}
                    </Text>
                  </div>
                ))}
              </Space>
            ) : <Spin size="small" />}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card size="small" title={<><DatabaseOutlined /> Statut des messages</>}>
            {postalStats?.messageStatuses ? (
              <Space wrap>
                {Object.entries(postalStats.messageStatuses).map(([s, count]) => (
                  <Statistic key={s} title={s} value={count} valueStyle={{ color: statusColor(s) === 'green' ? SF.success : statusColor(s) === 'red' ? SF.danger : statusColor(s) === 'orange' ? SF.orange : SF.gold, fontSize: 20 }} />
                ))}
              </Space>
            ) : <Spin size="small" />}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size="small" title={<><CloudOutlined /> Configuration SMTP</>}
            extra={<Badge status={status?.smtp.configured ? 'success' : 'error'} text={status?.smtp.configured ? 'Configuré' : 'Non configuré'} />}>
            {status?.smtp.configured ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="Serveur">{status.smtp.host}:{status.smtp.port}</Descriptions.Item>
                  <Descriptions.Item label="Compte">{status.smtp.user}</Descriptions.Item>
                </Descriptions>
                <Space>
                  <Input placeholder="Email test" value={testEmail} onChange={e => setTestEmail(e.target.value)} style={{ width: 200 }} size="small" />
                  <Button type="primary" icon={<SendOutlined />} loading={testLoading} onClick={handleTestSmtp} size="small" style={{ background: SF.primary, borderColor: SF.primary }}>Tester</Button>
                </Space>
              </Space>
            ) : <Alert type="warning" message="SMTP non configuré" showIcon />}
          </Card>
        </Col>
      </Row>

      {postalStats?.daily && postalStats.daily.length > 0 && (
        <Card size="small" title="Activité récente (7 derniers jours)" style={{ marginTop: 16 }}>
          <Table dataSource={postalStats.daily.slice(0, 7)} rowKey="date" size="small" pagination={false}
            columns={[
              { title: 'Date', dataIndex: 'date', key: 'date' },
              { title: 'Entrants', dataIndex: 'incoming', key: 'incoming', render: (v: number) => <Tag color="blue">{v}</Tag> },
              { title: 'Sortants', dataIndex: 'outgoing', key: 'outgoing', render: (v: number) => <Tag color="green">{v}</Tag> },
              { title: 'Spam', dataIndex: 'spam', key: 'spam', render: (v: number) => v > 0 ? <Tag color="red">{v}</Tag> : <Tag>{v}</Tag> },
              { title: 'Bounces', dataIndex: 'bounces', key: 'bounces', render: (v: number) => v > 0 ? <Tag color="orange">{v}</Tag> : <Tag>{v}</Tag> },
              { title: 'Held', dataIndex: 'held', key: 'held', render: (v: number) => v > 0 ? <Tag color="gold">{v}</Tag> : <Tag>{v}</Tag> },
            ]}
          />
        </Card>
      )}
    </>
  );

  // ═══ TAB: MESSAGES ═════════════════════════════════════════
  const renderMessages = () => (
    <Card title={<><MailOutlined /> Messages Postal (serveur Hetzner)</>}
      extra={<Button icon={<ReloadOutlined />} onClick={fetchPostalMessages} size="small">Rafraîchir</Button>}>
      <Table dataSource={postalMessages} rowKey="id" size="small"
        pagination={{ pageSize: 25, showSizeChanger: true }}
        columns={[
          { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
          { title: 'De', dataIndex: 'from', key: 'from', ellipsis: true, width: 200 },
          { title: 'À', dataIndex: 'to', key: 'to', ellipsis: true, width: 200 },
          { title: 'Sujet', dataIndex: 'subject', key: 'subject', ellipsis: true },
          {
            title: 'Statut', dataIndex: 'status', key: 'status', width: 100,
            render: (s: string) => <Tag color={statusColor(s)}>{s}</Tag>,
            filters: [
              { text: 'Sent', value: 'Sent' },
              { text: 'SoftFail', value: 'SoftFail' },
              { text: 'HardFail', value: 'HardFail' },
              { text: 'Held', value: 'Held' },
            ],
            onFilter: (v: any, r: PostalMessage) => r.status === v,
          },
          {
            title: 'Date', dataIndex: 'timestamp', key: 'timestamp', width: 160,
            render: (t: string) => t ? new Date(t).toLocaleString('fr-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—',
            sorter: (a: PostalMessage, b: PostalMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
            defaultSortOrder: 'descend' as const,
          },
        ]}
      />
    </Card>
  );

  // ═══ TAB: COMPTES ══════════════════════════════════════════
  const renderAccounts = () => (
    <Card title={<><TeamOutlined /> Comptes email @zhiive.com</>}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchStatus} size="small">Rafraîchir</Button>
          <Popconfirm title="Provisionner @zhiive.com pour tous les utilisateurs sans compte ?" onConfirm={handleProvisionAll} okText="Provisionner" cancelText="Annuler">
            <Button type="primary" icon={<ThunderboltOutlined />} loading={provisionLoading} style={{ background: SF.primary, borderColor: SF.primary }} size="small">
              Provisionner tous
            </Button>
          </Popconfirm>
        </Space>
      }>
      <Table dataSource={accounts} rowKey="id" size="small"
        pagination={{ pageSize: 20, showSizeChanger: true }}
        columns={[
          {
            title: 'Utilisateur', key: 'user',
            render: (_: any, r: EmailAccount) => (
              <div>
                <Text strong>{`${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() || '—'}</Text>
                <br /><Text type="secondary" style={{ fontSize: 11 }}>{r.user?.email}</Text>
              </div>
            ),
          },
          { title: 'Adresse Zhiive', dataIndex: 'emailAddress', key: 'emailAddress', render: (email: string) => <Tag icon={<MailOutlined />} color="purple">{email}</Tag> },
          { title: 'Provider', dataIndex: 'mailProvider', key: 'mailProvider', render: (p: string) => <Tag color={p === 'postal' ? 'green' : p === 'gmail' ? 'blue' : 'default'}>{p}</Tag> },
          { title: 'Rôle', key: 'role', render: (_: any, r: EmailAccount) => <Tag>{r.user?.role || '—'}</Tag> },
          { title: 'Créé le', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => d ? new Date(d).toLocaleDateString('fr-BE') : '—' },
          {
            title: 'Actions', key: 'actions', width: 100,
            render: (_: any, r: EmailAccount) => (
              <Space>
                <Tooltip title="Modifier l'adresse"><Button size="small" icon={<EditOutlined />} onClick={() => { setEditEmail(r.emailAddress); setEditModal({ visible: true, account: r }); }} /></Tooltip>
                <Popconfirm title="Supprimer ce compte email ?" onConfirm={() => handleDelete(r.id)} okText="Supprimer" cancelText="Annuler">
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </Card>
  );

  // ═══ TAB: INFRASTRUCTURE ═══════════════════════════════════
  const renderInfrastructure = () => (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Card size="small" title={<><GlobalOutlined /> Domaines Postal</>}>
        <Table dataSource={postalDomains} rowKey="id" size="small" pagination={false}
          columns={[
            { title: 'Domaine', dataIndex: 'name', key: 'name', render: (n: string) => <Text strong>{n}</Text> },
            { title: 'Vérifié', dataIndex: 'verified', key: 'verified', render: (v: boolean) => v ? <Tag color="green">Oui</Tag> : <Tag color="red">Non</Tag> },
            { title: 'SPF', dataIndex: 'spf', key: 'spf', render: (s: string) => <Tag color={s === 'OK' ? 'green' : s === 'unchecked' ? 'default' : 'orange'}>{s}</Tag> },
            { title: 'DKIM', dataIndex: 'dkim', key: 'dkim', render: (s: string) => <Tag color={s === 'OK' ? 'green' : s === 'unchecked' ? 'default' : 'orange'}>{s}</Tag> },
            { title: 'MX', dataIndex: 'mx', key: 'mx', render: (s: string) => <Tag color={s === 'OK' ? 'green' : s === 'unchecked' ? 'default' : 'orange'}>{s}</Tag> },
            { title: 'Return Path', dataIndex: 'returnPath', key: 'returnPath', render: (s: string) => <Tag color={s === 'OK' ? 'green' : s === 'unchecked' ? 'default' : 'orange'}>{s}</Tag> },
            { title: 'Sortant', dataIndex: 'outgoing', key: 'outgoing', render: (v: boolean) => v ? <Tag color="green">Oui</Tag> : <Tag>Non</Tag> },
            { title: 'Entrant', dataIndex: 'incoming', key: 'incoming', render: (v: boolean) => v ? <Tag color="green">Oui</Tag> : <Tag>Non</Tag> },
          ]}
        />
      </Card>

      <Card size="small" title={<><ApiOutlined /> Credentials SMTP/API</>}>
        <Table dataSource={postalCredentials} rowKey="id" size="small" pagination={false}
          columns={[
            { title: 'Nom', dataIndex: 'name', key: 'name' },
            { title: 'Type', dataIndex: 'type', key: 'type', render: (t: string) => <Tag color={t === 'API' ? 'purple' : 'blue'}>{t}</Tag> },
            { title: 'Hold', dataIndex: 'hold', key: 'hold', render: (h: boolean) => h ? <Tag color="red">Oui</Tag> : <Tag color="green">Non</Tag> },
            { title: 'Dernière utilisation', dataIndex: 'lastUsed', key: 'lastUsed', render: (d: string) => d ? new Date(d).toLocaleString('fr-BE') : '—' },
          ]}
        />
      </Card>

      <Card size="small" title={<><SettingOutlined /> Routes email</>}>
        <Table dataSource={postalRoutes} rowKey="id" size="small" pagination={false}
          columns={[
            { title: 'ID', dataIndex: 'id', key: 'id', width: 50 },
            { title: 'Pattern', dataIndex: 'name', key: 'name', render: (n: string) => <Tag>{n}</Tag> },
            { title: 'Domaine', dataIndex: 'domain_name', key: 'domain_name' },
            { title: 'Mode', dataIndex: 'mode', key: 'mode' },
            { title: 'Endpoint', dataIndex: 'endpoint_name', key: 'endpoint_name' },
            { title: 'URL', dataIndex: 'endpoint_url', key: 'endpoint_url', ellipsis: true, render: (u: string) => <Text code style={{ fontSize: 11 }}>{u}</Text> },
          ]}
        />
      </Card>

      <Card size="small" title={<><PoweroffOutlined /> Actions serveur</>}>
        <Space>
          <Popconfirm title="Vider les suppressions ?" onConfirm={handleClearSuppressions} okText="Vider" cancelText="Annuler">
            <Button icon={<ClearOutlined />}>Vider suppressions ({serverOverview?.suppressions || 0})</Button>
          </Popconfirm>
          <Popconfirm title="Redémarrer les containers Postal ?" onConfirm={handleRestartPostal} okText="Redémarrer" cancelText="Annuler">
            <Button icon={<PoweroffOutlined />} danger>Redémarrer Postal</Button>
          </Popconfirm>
        </Space>
      </Card>
    </Space>
  );

  // ═══ RENDU PRINCIPAL ═══════════════════════════════════════
  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <MailOutlined style={{ marginRight: 8, color: SF.primary }} />
            ZhiiveMail — Administration
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
            Gestion centralisée du système email @zhiive.com — Serveur Postal sur Hetzner
          </Paragraph>
        </div>
        <Space>
          <Badge status={serverOverview?.connected ? 'success' : 'error'} text={serverOverview?.connected ? 'Hetzner connecté' : 'Hetzner déconnecté'} />
          <Button icon={<ReloadOutlined />} onClick={fetchAll} loading={loading} type="primary" style={{ background: SF.primary, borderColor: SF.primary }}>
            Rafraîchir
          </Button>
        </Space>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card"
        items={[
          { key: 'dashboard', label: <><DashboardOutlined /> Dashboard</>, children: renderDashboard() },
          { key: 'messages', label: <><MailOutlined /> Messages <Tag style={{ marginLeft: 4 }}>{postalStats?.totalMessages || '...'}</Tag></>, children: renderMessages() },
          { key: 'accounts', label: <><TeamOutlined /> Comptes <Tag color="purple" style={{ marginLeft: 4 }}>{accounts.length}</Tag></>, children: renderAccounts() },
          { key: 'infra', label: <><CloudServerOutlined /> Infrastructure</>, children: renderInfrastructure() },
        ]}
      />

      <Modal title="Modifier l'adresse email" open={editModal.visible} onOk={handleEdit} onCancel={() => setEditModal({ visible: false, account: null })} okText="Enregistrer" cancelText="Annuler">
        {editModal.account && (
          <div>
            <Text type="secondary">Utilisateur : {editModal.account.user?.firstName} {editModal.account.user?.lastName}</Text>
            <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="nouvelle.adresse@zhiive.com" style={{ marginTop: 12 }} addonBefore={<MailOutlined />} />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ZhiiveMailAdminPage;
