import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Select, 
  Tag,
  Typography,
  Space,
  Input,
  Modal,
  message,
  Row,
  Col,
  Statistic,
  Drawer,
  Form,
  DatePicker,
  Tooltip,
  Popconfirm,
  Badge,
  Dropdown,
  MenuProps
} from 'antd';
import {
  PhoneOutlined,
  MailOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  CalendarOutlined,
  UserOutlined,
  TagOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

dayjs.extend(relativeTime);
dayjs.locale('fr');

const { Title, Text } = Typography;
const { TextArea } = Input;

interface PurchasedLead {
  id: string;
  originalLeadId: string;
  title: string;
  description: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  clientPhone: string;
  postalCode: string;
  address?: string;
  category: string;
  urgency: 'low' | 'medium' | 'high';
  estimatedValue: number;
  purchasedAt: string;
  status: 'new' | 'contacted' | 'meeting_scheduled' | 'proposal_sent' | 'won' | 'lost' | 'cancelled';
  notes: string;
  lastContactDate?: string;
  nextActionDate?: string;
  tags: string[];
  score?: number; // Score IA de qualité du lead
}

interface PartnerStats {
  totalPurchased: number;
  activeLeads: number;
  convertedLeads: number;
  conversionRate: number;
  avgResponseTime: number; // en heures
  totalSpent: number; // en crédits
}

interface StatusChangeModalProps {
  lead: PurchasedLead | null;
  open: boolean;
  onCancel: () => void;
  onUpdate: (leadId: string, updates: Partial<PurchasedLead>) => void;
}

const StatusChangeModal: React.FC<StatusChangeModalProps> = ({ 
  lead, 
  open, 
  onCancel, 
  onUpdate 
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (lead && open) {
      form.setFieldsValue({
        status: lead.status,
        notes: lead.notes,
        nextActionDate: lead.nextActionDate ? dayjs(lead.nextActionDate) : null,
        tags: lead.tags
      });
    }
  }, [lead, open, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (lead) {
        onUpdate(lead.id, {
          ...values,
          nextActionDate: values.nextActionDate ? values.nextActionDate.toISOString() : null,
          lastContactDate: new Date().toISOString() // Mise à jour automatique
        });
      }
      onCancel();
    } catch (error) {
      console.error('Erreur de validation:', error);
    }
  };

  if (!lead) return null;

  return (
    <Modal
      title={
        <Space>
          <EditOutlined />
          Modifier le lead: {lead.title}
        </Space>
      }
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText="Mettre à jour"
      cancelText="Annuler"
      width={800}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              name="status" 
              label="Statut" 
              rules={[{ required: true, message: 'Veuillez sélectionner un statut' }]}
            >
              <Select placeholder="Sélectionner un statut">
                <Select.Option value="new">Nouveau</Select.Option>
                <Select.Option value="contacted">Contacté</Select.Option>
                <Select.Option value="meeting_scheduled">RDV planifié</Select.Option>
                <Select.Option value="proposal_sent">Devis envoyé</Select.Option>
                <Select.Option value="won">Gagné</Select.Option>
                <Select.Option value="lost">Perdu</Select.Option>
                <Select.Option value="cancelled">Annulé</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="nextActionDate" label="Prochaine action">
              <DatePicker 
                showTime 
                placeholder="Date de la prochaine action"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="tags" label="Tags">
          <Select
            mode="tags"
            placeholder="Ajouter des tags"
            style={{ width: '100%' }}
          >
            <Select.Option value="urgent">Urgent</Select.Option>
            <Select.Option value="qualifie">Qualifié</Select.Option>
            <Select.Option value="chaud">Chaud</Select.Option>
            <Select.Option value="froid">Froid</Select.Option>
            <Select.Option value="rappeler">À rappeler</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="notes" label="Notes internes">
          <TextArea 
            rows={4}
            placeholder="Ajouter des notes sur ce lead..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default function PartnerLeadsPage() {
  const { api } = useAuthenticatedApi();
  
  const [leads, setLeads] = useState<PurchasedLead[]>([]);
  const [stats, setStats] = useState<PartnerStats>({
    totalPurchased: 0,
    activeLeads: 0,
    convertedLeads: 0,
    conversionRate: 0,
    avgResponseTime: 0,
    totalSpent: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<PurchasedLead | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [detailsDrawerVisible, setDetailsDrawerVisible] = useState(false);

  const [filters, setFilters] = useState({
    status: undefined as string | undefined,
    category: undefined as string | undefined,
    urgency: undefined as string | undefined,
    dateRange: undefined as [string, string] | undefined
  });

  // Chargement des données
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [leadsData, statsData] = await Promise.all([
        api.get<PurchasedLead[]>('/api/partner/leads'),
        api.get<PartnerStats>('/api/partner/stats')
      ]);
      setLeads(leadsData);
      setStats(statsData);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      message.error('Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusUpdate = async (leadId: string, updates: Partial<PurchasedLead>) => {
    try {
      await api.put(`/api/partner/leads/${leadId}`, updates);
      message.success('Lead mis à jour avec succès !');
      loadData(); // Recharger les données
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      message.error('Erreur lors de la mise à jour du lead');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/api/partner/leads/export', { 
        responseType: 'blob' as any // Pour le téléchargement de fichier
      });
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads-${dayjs().format('YYYY-MM-DD')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('Export terminé !');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      message.error('Erreur lors de l\'export');
    }
  };

  const handleQuickAction = async (lead: PurchasedLead, action: string) => {
    switch (action) {
      case 'call':
        window.open(`tel:${lead.clientPhone}`, '_self');
        // Marquer automatiquement comme contacté si c'était nouveau
        if (lead.status === 'new') {
          handleStatusUpdate(lead.id, { 
            status: 'contacted', 
            lastContactDate: new Date().toISOString() 
          });
        }
        break;
      case 'email':
        window.open(`mailto:${lead.clientEmail}?subject=Concernant votre demande: ${lead.title}`, '_self');
        if (lead.status === 'new') {
          handleStatusUpdate(lead.id, { 
            status: 'contacted', 
            lastContactDate: new Date().toISOString() 
          });
        }
        break;
      case 'edit':
        setSelectedLead(lead);
        setStatusModalVisible(true);
        break;
      case 'details':
        setSelectedLead(lead);
        setDetailsDrawerVisible(true);
        break;
      default:
        break;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'blue';
      case 'contacted': return 'orange';
      case 'meeting_scheduled': return 'purple';
      case 'proposal_sent': return 'cyan';
      case 'won': return 'green';
      case 'lost': return 'red';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new': return 'Nouveau';
      case 'contacted': return 'Contacté';
      case 'meeting_scheduled': return 'RDV planifié';
      case 'proposal_sent': return 'Devis envoyé';
      case 'won': return 'Gagné';
      case 'lost': return 'Perdu';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <ExclamationCircleOutlined />;
      case 'contacted': return <PhoneOutlined />;
      case 'meeting_scheduled': return <CalendarOutlined />;
      case 'proposal_sent': return <MailOutlined />;
      case 'won': return <CheckCircleOutlined />;
      case 'lost': return <CloseCircleOutlined />;
      case 'cancelled': return <ClockCircleOutlined />;
      default: return <SyncOutlined />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      default: return 'green';
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return '#999';
    if (score >= 80) return '#52c41a'; // Vert
    if (score >= 60) return '#faad14'; // Orange
    return '#f5222d'; // Rouge
  };

  const getScoreText = (score?: number) => {
    if (!score) return 'Non évalué';
    if (score >= 80) return 'Chaud';
    if (score >= 60) return 'Tiède';
    return 'Froid';
  };

  const actionMenuItems = (lead: PurchasedLead): MenuProps['items'] => [
    {
      key: 'call',
      icon: <PhoneOutlined />,
      label: 'Appeler',
      onClick: () => handleQuickAction(lead, 'call')
    },
    {
      key: 'email',
      icon: <MailOutlined />,
      label: 'Envoyer un email',
      onClick: () => handleQuickAction(lead, 'email')
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Modifier',
      onClick: () => handleQuickAction(lead, 'edit')
    },
    {
      key: 'details',
      icon: <EyeOutlined />,
      label: 'Voir détails',
      onClick: () => handleQuickAction(lead, 'details')
    }
  ];

  const columns = [
    {
      title: 'Lead',
      key: 'lead',
      width: 300,
      render: (_: unknown, record: PurchasedLead) => (
        <div>
          <div className="font-semibold flex items-center gap-2">
            {record.title}
            {record.score && (
              <Badge 
                count={`${record.score}%`}
                style={{ backgroundColor: getScoreColor(record.score) }}
                title={`Score IA: ${getScoreText(record.score)}`}
              />
            )}
          </div>
          <Text type="secondary" className="text-xs block">
            {record.clientFirstName} {record.clientLastName} • {record.postalCode}
          </Text>
          <Text type="secondary" className="text-xs">
            Acheté {dayjs(record.purchasedAt).fromNow()}
          </Text>
          {record.tags.length > 0 && (
            <div className="mt-1">
              {record.tags.map(tag => (
                <Tag key={tag} size="small" color="blue">
                  {tag}
                </Tag>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 200,
      render: (_: unknown, record: PurchasedLead) => (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PhoneOutlined />
            <a href={`tel:${record.clientPhone}`} className="text-blue-600">
              {record.clientPhone}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <MailOutlined />
            <a href={`mailto:${record.clientEmail}`} className="text-blue-600 truncate">
              {record.clientEmail}
            </a>
          </div>
        </div>
      )
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      filters: [
        { text: 'Nouveau', value: 'new' },
        { text: 'Contacté', value: 'contacted' },
        { text: 'RDV planifié', value: 'meeting_scheduled' },
        { text: 'Devis envoyé', value: 'proposal_sent' },
        { text: 'Gagné', value: 'won' },
        { text: 'Perdu', value: 'lost' },
        { text: 'Annulé', value: 'cancelled' }
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: 'Urgence',
      dataIndex: 'urgency',
      key: 'urgency',
      width: 100,
      filters: [
        { text: 'Urgent', value: 'high' },
        { text: 'Modéré', value: 'medium' },
        { text: 'Normal', value: 'low' }
      ],
      onFilter: (value, record) => record.urgency === value,
      render: (urgency: string) => (
        <Tag color={getUrgencyColor(urgency)}>
          {urgency === 'high' ? 'Urgent' : urgency === 'medium' ? 'Modéré' : 'Normal'}
        </Tag>
      )
    },
    {
      title: 'Valeur',
      dataIndex: 'estimatedValue',
      key: 'estimatedValue',
      width: 120,
      sorter: (a: PurchasedLead, b: PurchasedLead) => a.estimatedValue - b.estimatedValue,
      render: (value: number) => (
        <Statistic
          value={value}
          suffix="€"
          valueStyle={{ fontSize: '14px', color: '#3f8600' }}
        />
      )
    },
    {
      title: 'Dernière action',
      key: 'lastAction',
      width: 150,
      render: (_: unknown, record: PurchasedLead) => (
        <div className="text-xs">
          {record.lastContactDate ? (
            <div>
              <div>Contact: {dayjs(record.lastContactDate).format('DD/MM')}</div>
              {record.nextActionDate && (
                <div className="text-orange-600">
                  Prochain: {dayjs(record.nextActionDate).format('DD/MM HH:mm')}
                </div>
              )}
            </div>
          ) : (
            <Text type="secondary">Aucun contact</Text>
          )}
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: PurchasedLead) => (
        <Space>
          <Tooltip title="Actions rapides">
            <Dropdown menu={{ items: actionMenuItems(record) }} trigger={['click']}>
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête avec statistiques */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <Title level={2} className="mb-0">
              <UserOutlined className="mr-2" />
              Mes leads achetés
            </Title>
            <Text type="secondary">
              Gérez et suivez vos leads acquis sur la marketplace
            </Text>
          </div>
          <Space>
            <Button 
              icon={<DownloadOutlined />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
          </Space>
        </div>

        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic
                title="Total acheté"
                value={stats.totalPurchased}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Leads actifs"
                value={stats.activeLeads}
                prefix={<SyncOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Taux de conversion"
                value={stats.conversionRate}
                suffix="%"
                precision={1}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: stats.conversionRate > 20 ? '#52c41a' : '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Temps de réponse moyen"
                value={stats.avgResponseTime}
                suffix="h"
                precision={1}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: stats.avgResponseTime < 24 ? '#52c41a' : '#faad14' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Tableau des leads */}
      <Card>
        <Table
          columns={columns}
          dataSource={leads}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `${total} leads au total`
          }}
          scroll={{ x: 1400 }}
          size="middle"
          rowClassName={(record) => {
            // Mettre en évidence les nouveaux leads
            if (record.status === 'new') return 'bg-blue-50';
            // Mettre en évidence les actions en retard
            if (record.nextActionDate && dayjs(record.nextActionDate).isBefore(dayjs())) {
              return 'bg-red-50';
            }
            return '';
          }}
        />
      </Card>

      {/* Modal de modification du statut */}
      <StatusChangeModal
        lead={selectedLead}
        open={statusModalVisible}
        onCancel={() => {
          setStatusModalVisible(false);
          setSelectedLead(null);
        }}
        onUpdate={handleStatusUpdate}
      />

      {/* Drawer de détails */}
      <Drawer
        title={
          <Space>
            <EyeOutlined />
            Détails du lead
          </Space>
        }
        width={600}
        open={detailsDrawerVisible}
        onClose={() => {
          setDetailsDrawerVisible(false);
          setSelectedLead(null);
        }}
      >
        {selectedLead && (
          <div className="space-y-4">
            <Card title="Informations du lead" size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <p><strong>Titre:</strong> {selectedLead.title}</p>
                  <p><strong>Catégorie:</strong> {selectedLead.category}</p>
                  <p><strong>Valeur estimée:</strong> {selectedLead.estimatedValue}€</p>
                </Col>
                <Col span={12}>
                  <p><strong>Urgence:</strong> 
                    <Tag color={getUrgencyColor(selectedLead.urgency)} className="ml-2">
                      {selectedLead.urgency === 'high' ? 'Urgent' : selectedLead.urgency === 'medium' ? 'Modéré' : 'Normal'}
                    </Tag>
                  </p>
                  <p><strong>Score IA:</strong> {selectedLead.score ? `${selectedLead.score}%` : 'Non évalué'}</p>
                </Col>
              </Row>
              <p><strong>Description:</strong></p>
              <p className="text-gray-600">{selectedLead.description}</p>
            </Card>

            <Card title="Contact client" size="small">
              <p><strong>Nom:</strong> {selectedLead.clientFirstName} {selectedLead.clientLastName}</p>
              <p><strong>Téléphone:</strong> 
                <a href={`tel:${selectedLead.clientPhone}`} className="ml-2 text-blue-600">
                  {selectedLead.clientPhone}
                </a>
              </p>
              <p><strong>Email:</strong> 
                <a href={`mailto:${selectedLead.clientEmail}`} className="ml-2 text-blue-600">
                  {selectedLead.clientEmail}
                </a>
              </p>
              <p><strong>Adresse:</strong> {selectedLead.address || selectedLead.postalCode}</p>
            </Card>

            <Card title="Suivi" size="small">
              <p><strong>Statut:</strong> 
                <Tag color={getStatusColor(selectedLead.status)} icon={getStatusIcon(selectedLead.status)} className="ml-2">
                  {getStatusText(selectedLead.status)}
                </Tag>
              </p>
              <p><strong>Acheté le:</strong> {dayjs(selectedLead.purchasedAt).format('DD/MM/YYYY HH:mm')}</p>
              {selectedLead.lastContactDate && (
                <p><strong>Dernier contact:</strong> {dayjs(selectedLead.lastContactDate).format('DD/MM/YYYY HH:mm')}</p>
              )}
              {selectedLead.nextActionDate && (
                <p><strong>Prochaine action:</strong> {dayjs(selectedLead.nextActionDate).format('DD/MM/YYYY HH:mm')}</p>
              )}
            </Card>

            {selectedLead.notes && (
              <Card title="Notes internes" size="small">
                <p className="text-gray-600 whitespace-pre-wrap">{selectedLead.notes}</p>
              </Card>
            )}

            {selectedLead.tags.length > 0 && (
              <Card title="Tags" size="small">
                <Space wrap>
                  {selectedLead.tags.map(tag => (
                    <Tag key={tag} icon={<TagOutlined />} color="blue">
                      {tag}
                    </Tag>
                  ))}
                </Space>
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
