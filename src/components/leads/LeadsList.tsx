import React from 'react';
import { Table, Button, Modal, Space, message, Popconfirm } from 'antd';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import CreateLeadForm from './CreateLeadForm';
import EditLeadForm from './EditLeadForm';
import { Lead } from '../../types/lead';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';

export const LeadsList: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = React.useState(false);
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = React.useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/leads');
      if (response.success) {
        setLeads(response.data);
      } else {
        throw new Error('Erreur lors du chargement des leads');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du chargement des leads';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchLeads();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const response = await api.delete(`/api/leads/${id}`);
      if (response.success) {
        message.success('Lead supprimé avec succès');
        fetchLeads();
      } else {
        throw new Error('Erreur lors de la suppression du lead');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression du lead';
      message.error(errorMessage);
    }
  };

  const columns = [
    {
      title: 'Nom',
      key: 'name',
      render: (record: Lead) => `${record.firstName} ${record.lastName}`.trim() || 'Non spécifié',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Entreprise',
      dataIndex: 'company',
      key: 'company',
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Lead) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedLead(record);
              setIsEditModalVisible(true);
            }}
          />
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer ce lead ?"
            onConfirm={() => handleDelete(record.id)}
            okText="Oui"
            cancelText="Non"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Liste des leads</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsCreateModalVisible(true)}
        >
          Nouveau lead
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={leads}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title="Créer un nouveau lead"
        open={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        footer={null}
        width={800}
      >
        <CreateLeadForm
          onSuccess={() => {
            setIsCreateModalVisible(false);
            fetchLeads();
          }}
          onCancel={() => setIsCreateModalVisible(false)}
        />
      </Modal>

      <Modal
        title="Modifier le lead"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          setSelectedLead(null);
        }}
        footer={null}
        width={800}
      >
        {selectedLead && (
          <EditLeadForm
            lead={selectedLead}
            onSuccess={() => {
              setIsEditModalVisible(false);
              setSelectedLead(null);
              fetchLeads();
            }}
            onCancel={() => {
              setIsEditModalVisible(false);
              setSelectedLead(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default LeadsList;
