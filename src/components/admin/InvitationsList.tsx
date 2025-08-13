import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, message, Tag, Popconfirm, Space } from 'antd';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { Role } from '../../types'; // Assumant que Role est dans vos types

// Définition du type pour une invitation
interface Invitation {
  id: string;
  email: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  role: Role;
  createdAt: string;
  expiresAt: string;
}

interface InvitationsListProps {
  refreshKey: boolean;
}

const InvitationsList: React.FC<InvitationsListProps> = ({ refreshKey }) => {
  const { api } = useAuthenticatedApi();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/users/invitations');
      if (response.success && Array.isArray(response.data)) {
        setInvitations(response.data);
      } else {
        // Si la réponse n'est pas ce qu'on attend, on vide la liste pour éviter les erreurs
        setInvitations([]);
      }
    } catch (error) {
      message.error("Erreur lors de la récupération des invitations.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations, refreshKey]);

  const handleRevokeInvitation = async (id: string) => {
    try {
      const response = await api.delete(`/users/invitations/${id}`);
      if (response.success) {
        message.success("L'invitation a été révoquée.");
        fetchInvitations(); // Recharger la liste
      }
    } catch (error) {
      // L'erreur est gérée par le hook
    }
  };

  const getStatusTag = (status: Invitation['status']) => {
    switch (status) {
      case 'PENDING':
        return <Tag color="blue">En attente</Tag>;
      case 'ACCEPTED':
        return <Tag color="green">Acceptée</Tag>;
      case 'EXPIRED':
        return <Tag color="orange">Expirée</Tag>;
      case 'REVOKED':
        return <Tag color="red">Révoquée</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Rôle assigné',
      dataIndex: ['role', 'name'],
      key: 'role',
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag,
    },
    {
        title: 'Date d\'expiration',
        dataIndex: 'expiresAt',
        key: 'expiresAt',
        render: (date: string) => new Date(date).toLocaleDateString('fr-FR'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Invitation) => (
        <Space>
          {record.status === 'PENDING' && (
            <Popconfirm
              title="Êtes-vous sûr de vouloir révoquer cette invitation ?"
              onConfirm={() => handleRevokeInvitation(record.id)}
              okText="Oui, révoquer"
              cancelText="Non"
            >
              <Button size="small" danger>Révoquer</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ marginTop: 32 }}>
      <h2>Invitations envoyées</h2>
      <Table
        columns={columns}
        dataSource={invitations.map(inv => ({ ...inv, key: inv.id }))}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 5 }}
      />
    </div>
  );
};

export default InvitationsList;