/**
 * ============================================================
 *  ZhiiveMailAdminPage — Administration du système email Zhiive
 * ============================================================
 *
 *  Accessible depuis Settings > Administration > ZhiiveMail
 *  
 *  Fonctionnalités :
 *    - Statut du système email (SMTP / Postal)
 *    - Liste des comptes @zhiive.com provisionnés
 *    - Provisionnement individuel ou en masse
 *    - Test d'envoi SMTP
 *    - Modification / suppression de comptes
 * ============================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Tag, Space, Typography, Statistic,
  Row, Col, Modal, message, Popconfirm, Alert, Input, Spin,
  Tooltip, Badge, Divider,
} from 'antd';
import {
  MailOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UserAddOutlined, TeamOutlined, SendOutlined, ReloadOutlined,
  DeleteOutlined, EditOutlined, ThunderboltOutlined,
  SettingOutlined, CloudOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';

const { Title, Text, Paragraph } = Typography;

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
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
  };
}

const ZhiiveMailAdminPage: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const { isSuperAdmin } = useAuth();

  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [editModal, setEditModal] = useState<{ visible: boolean; account: EmailAccount | null }>({ visible: false, account: null });
  const [editEmail, setEditEmail] = useState('');

  // ─── Chargement données ──────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusData, accountsData] = await Promise.all([
        api.get('/api/zhiivemail/status'),
        api.get('/api/zhiivemail/accounts'),
      ]);
      setStatus(statusData);
      setAccounts(accountsData || []);
    } catch (e: any) {
      message.error(e.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Test SMTP ───────────────────────────────────────────
  const handleTestSmtp = async () => {
    setTestLoading(true);
    try {
      const result = await api.post('/api/zhiivemail/test-smtp', {
        to: testEmail || undefined,
      });
      if (result.success) {
        message.success(`Email test envoyé à ${result.recipient}`);
      } else {
        message.error('Échec du test SMTP');
      }
    } catch (e: any) {
      message.error(e.message || 'Erreur SMTP');
    } finally {
      setTestLoading(false);
    }
  };

  // ─── Provisionnement en masse ────────────────────────────
  const handleProvisionAll = async () => {
    setProvisionLoading(true);
    try {
      const result = await api.post('/api/zhiivemail/provision-all', {});
      message.success(`${result.created} compte(s) créé(s) sur ${result.total} utilisateur(s)`);
      fetchData();
    } catch (e: any) {
      message.error(e.message || 'Erreur provisionnement');
    } finally {
      setProvisionLoading(false);
    }
  };

  // ─── Suppression compte ──────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/zhiivemail/accounts/${id}`);
      message.success('Compte supprimé');
      fetchData();
    } catch (e: any) {
      message.error(e.message || 'Erreur suppression');
    }
  };

  // ─── Modification compte ─────────────────────────────────
  const handleEdit = async () => {
    if (!editModal.account || !editEmail.trim()) return;
    try {
      await api.patch(`/api/zhiivemail/accounts/${editModal.account.id}`, {
        emailAddress: editEmail.trim(),
      });
      message.success('Compte mis à jour');
      setEditModal({ visible: false, account: null });
      fetchData();
    } catch (e: any) {
      message.error(e.message || 'Erreur modification');
    }
  };

  if (!isSuperAdmin) {
    return <Alert type="error" message="Accès réservé aux Super Admins" showIcon />;
  }

  if (loading && !status) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  }

  const columns = [
    {
      title: 'Utilisateur',
      key: 'user',
      render: (_: any, record: EmailAccount) => (
        <div>
          <Text strong>{`${record.user?.firstName || ''} ${record.user?.lastName || ''}`.trim() || '—'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.user?.email}</Text>
        </div>
      ),
    },
    {
      title: 'Adresse Zhiive',
      dataIndex: 'emailAddress',
      key: 'emailAddress',
      render: (email: string) => (
        <Tag icon={<MailOutlined />} color="purple">{email}</Tag>
      ),
    },
    {
      title: 'Provider',
      dataIndex: 'mailProvider',
      key: 'mailProvider',
      render: (provider: string) => (
        <Tag color={provider === 'postal' ? 'green' : provider === 'gmail' ? 'blue' : 'default'}>
          {provider}
        </Tag>
      ),
    },
    {
      title: 'Rôle',
      key: 'role',
      render: (_: any, record: EmailAccount) => (
        <Tag>{record.user?.role || '—'}</Tag>
      ),
    },
    {
      title: 'Créé le',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => d ? new Date(d).toLocaleDateString('fr-BE') : '—',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: EmailAccount) => (
        <Space>
          <Tooltip title="Modifier l'adresse">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditEmail(record.emailAddress);
                setEditModal({ visible: true, account: record });
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Supprimer ce compte email ?"
            onConfirm={() => handleDelete(record.id)}
            okText="Supprimer"
            cancelText="Annuler"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <MailOutlined style={{ marginRight: 8, color: '#6C5CE7' }} />
          ZhiiveMail — Administration
        </Title>
        <Paragraph type="secondary" style={{ marginTop: 4 }}>
          Gestion centralisée du système email @zhiive.com
        </Paragraph>
      </div>

      {/* ─── Statut système ──────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Mode actif"
              value={status?.mode || '—'}
              prefix={status?.mode === 'smtp' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <SettingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Comptes @zhiive"
              value={status?.stats.postalAccounts || 0}
              prefix={<TeamOutlined />}
              suffix={`/ ${status?.stats.totalAccounts || 0}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Emails en DB"
              value={status?.stats.totalEmails || 0}
              prefix={<MailOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Anciens Gmail"
              value={status?.stats.gmailAccounts || 0}
              prefix={<CloseCircleOutlined style={{ color: status?.stats.gmailAccounts ? '#ff4d4f' : '#52c41a' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* ─── Config SMTP ─────────────────────────────────── */}
      <Card
        size="small"
        title={<><CloudOutlined /> Configuration SMTP</>}
        style={{ marginBottom: 16 }}
        extra={
          <Badge
            status={status?.smtp.configured ? 'success' : 'error'}
            text={status?.smtp.configured ? 'Configuré' : 'Non configuré'}
          />
        }
      >
        {status?.smtp.configured ? (
          <Row gutter={16}>
            <Col span={6}>
              <Text type="secondary">Serveur</Text>
              <br />
              <Text strong>{status.smtp.host}:{status.smtp.port}</Text>
            </Col>
            <Col span={6}>
              <Text type="secondary">Compte</Text>
              <br />
              <Text strong>{status.smtp.user}</Text>
            </Col>
            <Col span={6}>
              <Text type="secondary">Expéditeur</Text>
              <br />
              <Text strong>{status.smtp.from}</Text>
            </Col>
            <Col span={6}>
              <Space>
                <Input
                  placeholder="Email test (optionnel)"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  style={{ width: 200 }}
                  size="small"
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={testLoading}
                  onClick={handleTestSmtp}
                  size="small"
                >
                  Tester
                </Button>
              </Space>
            </Col>
          </Row>
        ) : (
          <Alert
            type="warning"
            message="SMTP non configuré"
            description="Ajoutez SMTP_HOST, SMTP_USER, SMTP_PASS dans le fichier .env pour activer l'envoi d'emails."
            showIcon
          />
        )}
      </Card>

      {/* ─── Config Postal ────────────────────────────────── */}
      <Card
        size="small"
        title={<><SafetyCertificateOutlined /> Serveur Postal (postal.zhiive.com)</>}
        style={{ marginBottom: 16 }}
        extra={
          <Badge
            status={status?.postal.configured ? 'success' : 'warning'}
            text={status?.postal.configured ? 'API connectée' : 'Non connecté (SMTP actif)'}
          />
        }
      >
        {status?.postal.configured ? (
          <Text>API Postal connectée : <Text code>{status.postal.url}</Text></Text>
        ) : (
          <Alert
            type="info"
            message="Serveur Postal en attente de configuration"
            description="Le serveur postal.zhiive.com est installé sur Hetzner. En attendant la clé API, les emails sont envoyés via SMTP (One.com). Ajoutez POSTAL_API_URL et POSTAL_API_KEY dans .env pour basculer."
            showIcon
          />
        )}
      </Card>

      <Divider />

      {/* ─── Comptes email ───────────────────────────────── */}
      <Card
        title={<><TeamOutlined /> Comptes email Zhiive</>}
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchData}
              loading={loading}
            >
              Rafraîchir
            </Button>
            <Popconfirm
              title="Provisionner les comptes @zhiive.com pour tous les utilisateurs sans compte email ?"
              onConfirm={handleProvisionAll}
              okText="Provisionner"
              cancelText="Annuler"
            >
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={provisionLoading}
                style={{ background: '#6C5CE7', borderColor: '#6C5CE7' }}
              >
                Provisionner tous
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={accounts}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          size="small"
          locale={{ emptyText: 'Aucun compte email. Cliquez "Provisionner tous" pour créer les comptes @zhiive.com.' }}
        />
      </Card>

      {/* ─── Modal édition ───────────────────────────────── */}
      <Modal
        title="Modifier l'adresse email"
        open={editModal.visible}
        onOk={handleEdit}
        onCancel={() => setEditModal({ visible: false, account: null })}
        okText="Enregistrer"
        cancelText="Annuler"
      >
        {editModal.account && (
          <div>
            <Text type="secondary">
              Utilisateur : {editModal.account.user?.firstName} {editModal.account.user?.lastName}
            </Text>
            <Input
              value={editEmail}
              onChange={e => setEditEmail(e.target.value)}
              placeholder="nouvelle.adresse@zhiive.com"
              style={{ marginTop: 12 }}
              addonBefore={<MailOutlined />}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ZhiiveMailAdminPage;
