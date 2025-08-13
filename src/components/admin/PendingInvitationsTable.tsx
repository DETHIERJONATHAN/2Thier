import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, message, Space, Tag, Popconfirm } from 'antd';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { Invitation } from '../../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PendingInvitationsTableProps {
  shouldRefresh: boolean;
}

const PendingInvitationsTable: React.FC<PendingInvitationsTableProps> = ({ shouldRefresh }) => {
  const { api } = useAuthenticatedApi();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/invitations');
      if (response.success) {
        setInvitations(response.data);
      } else {
        message.error(response.message || "Erreur lors du chargement des invitations.");
      }
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations, shouldRefresh]);

  const handleResend = async (id: string) => {
    try {
      const response = await api.post(`/api/invitations/${id}/resend`, {});
      if (response.success) {
        message.success('Invitation renvoyée avec succès.');
        fetchInvitations();
      }
    } catch (error) {
      // Géré par le hook
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const response = await api.delete(`/api/invitations/${id}`);
      if (response.success) {
        message.success('Invitation annulée.');
        fetchInvitations();
      }
    } catch (error) {
      // Géré par le hook
    }
  };

  const columns = [
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { 
      title: 'Rôle assigné', 
      dataIndex: ['role', 'label'], 
      key: 'role',
      render: (label: string, record: Invitation) => label || record.role.name
    },
    { 
      title: 'Date d\'expiration', 
      dataIndex: 'expiresAt', 
      key: 'expiresAt',
      render: (date: string) => format(new Date(date), 'dd MMMM yyyy à HH:mm', { locale: fr })
    },
    { 
      title: 'Statut', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'PENDING' ? 'blue' : 'orange'}>
          {status === 'PENDING' ? 'En attente' : 'Désactivée'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Invitation) => (
        <Space>
          <Tooltip title="Renvoyer l'invitation">
            <Button icon={<RedoOutlined />} onClick={() => handleResend(record.id)} />
          </Tooltip>
          <Popconfirm
            title="Voulez-vous vraiment annuler cette invitation ?"
            onConfirm={() => handleCancel(record.id)}
            okText="Oui"
            cancelText="Non"
          >
            <Tooltip title="Annuler l'invitation">
              <Button danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={invitations}
      loading={loading}
      rowKey="id"
    />
  );
};

export default PendingInvitationsTable;
