/**
 * 🔍 LeadSelectorModal - Modal pour sélectionner un lead existant
 */

import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Table, 
  Input, 
  Space, 
  Typography, 
  Tag, 
  Button,
  message,
  Spin,
  Alert
} from 'antd';
import { 
  SearchOutlined, 
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  CheckCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import type { LeadSelectorModalProps, TBLLead, LeadsListResponse } from './types/lead-types';

const { Text } = Typography;
const { Search } = Input;

const LeadSelectorModal: React.FC<LeadSelectorModalProps> = ({
  open,
  onClose,
  onSelectLead,
  currentLeadId
}) => {
  const [leads, setLeads] = useState<TBLLead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<TBLLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const { api } = useAuthenticatedApi();

  // Charger les leads au montage du modal
  useEffect(() => {
    if (open) {
      loadLeads();
    }
  }, [open]);

  // Filtrer les leads selon la recherche
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredLeads(leads);
    } else {
      const filtered = leads.filter(lead => 
        lead.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (lead.email && lead.email.toLowerCase().includes(searchText.toLowerCase())) ||
        (lead.company && lead.company.toLowerCase().includes(searchText.toLowerCase())) ||
        (lead.phone && lead.phone.includes(searchText))
      );
      setFilteredLeads(filtered);
    }
  }, [leads, searchText]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Utiliser l'API leads existante avec transformation pour TBL
      const response = await api.get('/api/leads');
      
      if (response.success && Array.isArray(response.data)) {
        // Transformer les leads CRM en TBLLead
        const tblLeads: TBLLead[] = response.data.map((lead: any) => ({
          id: lead.id,
          name: lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Lead sans nom',
          firstName: lead.firstName || '',
          lastName: lead.lastName || '',
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          address: lead.address || lead.data?.address || '',
          hasSubmission: false, // TODO: Vérifier s'il y a une soumission TBL
          lastModified: lead.updatedAt ? new Date(lead.updatedAt) : undefined
        }));
        
        setLeads(tblLeads);
      } else {
        throw new Error(response.error || 'Erreur lors du chargement des leads');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du chargement des leads';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLead = (lead: TBLLead) => {
    onSelectLead(lead);
    message.success(`Lead "${lead.name}" sélectionné`);
  };

  // Colonnes du tableau
  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: TBLLead) => (
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <div>
            <Text strong>{text}</Text>
            {record.hasSubmission && (
              <Tag color="green" size="small" style={{ marginLeft: 8 }}>
                <FileTextOutlined /> Devis
              </Tag>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (record: TBLLead) => (
        <div>
          {record.email && (
            <div>
              <MailOutlined style={{ marginRight: 4, color: '#8c8c8c' }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
            </div>
          )}
          {record.phone && (
            <div>
              <PhoneOutlined style={{ marginRight: 4, color: '#8c8c8c' }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>{record.phone}</Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Entreprise',
      dataIndex: 'company',
      key: 'company',
      render: (text: string) => text ? (
        <Space>
          <BankOutlined style={{ color: '#8c8c8c' }} />
          <Text>{text}</Text>
        </Space>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (record: TBLLead) => (
        <Button
          type={record.id === currentLeadId ? 'default' : 'primary'}
          size="small"
          icon={record.id === currentLeadId ? <CheckCircleOutlined /> : undefined}
          onClick={() => handleSelectLead(record)}
          disabled={record.id === currentLeadId}
        >
          {record.id === currentLeadId ? 'Sélectionné' : 'Sélectionner'}
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title="Sélectionner un lead"
      open={open}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Annuler
        </Button>
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Barre de recherche */}
        <Search
          placeholder="Rechercher par nom, email, entreprise ou téléphone..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ marginBottom: 16 }}
          prefix={<SearchOutlined />}
        />

        {/* Message d'erreur */}
        {error && (
          <Alert
            message="Erreur de chargement"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* Tableau des leads */}
        <Spin spinning={loading}>
          <Table
            dataSource={filteredLeads}
            columns={columns}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} sur ${total} leads`,
            }}
            scroll={{ y: 400 }}
            size="small"
            locale={{
              emptyText: searchText ? 'Aucun lead trouvé pour cette recherche' : 'Aucun lead disponible'
            }}
          />
        </Spin>

        {/* Info */}
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {filteredLeads.length} lead(s) affiché(s) sur {leads.length} total
        </Text>
      </Space>
    </Modal>
  );
};

export default LeadSelectorModal;