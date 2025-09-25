import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Table, Button, Select, message as antdMessage, Popconfirm, Space, Tag } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

interface UserOrganization {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  status: 'ACTIVE' | 'INACTIVE';
  Organization: {
    id: string;
    name: string;
  };
  Role: {
    id: string;
    name: string;
    label: string;
  };
}

interface Organization {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
  label: string;
  organizationId: string | null; // Permettre null pour les rôles globaux
}

interface UserOrganizationsModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const UserOrganizationsModal: React.FC<UserOrganizationsModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  user,
}) => {
  const { api } = useAuthenticatedApi();
  const [msgApi, msgCtx] = antdMessage.useMessage();
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  const handleCancel = useCallback(() => {
    setAddingNew(false);
    setSelectedOrgId('');
    setSelectedRoleId('');
    onCancel();
  }, [onCancel]);

  const fetchUserOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/users/${user.id}/organizations`);
      if (response.success) {
        setUserOrganizations(response.data);
      }
    } catch {
  msgApi.error('Erreur lors du chargement des organisations de l\'utilisateur');
    } finally {
      setLoading(false);
    }
  }, [api, user.id, msgApi]);

  const fetchAllOrganizations = useCallback(async () => {
    try {
      const response = await api.get('/api/organizations/active');
      if (response.success) {
        setAllOrganizations(response.data);
      }
    } catch {
  msgApi.error('Erreur lors du chargement des organisations');
    }
  }, [api, msgApi]);

  const fetchAllRoles = useCallback(async () => {
    try {
      const response = await api.get('/api/roles');
      if (response.success) {
        setAllRoles(response.data);
      }
    } catch {
      msgApi.error('Erreur lors du chargement des rôles');
    }
  }, [api, msgApi]);

  // Récupérer les données initiales (placé APRÈS les callbacks pour éviter la TDZ)
  useEffect(() => {
    if (visible && user.id) {
      fetchUserOrganizations();
      fetchAllOrganizations();
      fetchAllRoles();
    }
  }, [visible, user.id, fetchUserOrganizations, fetchAllOrganizations, fetchAllRoles]);

  const handleAddToOrganization = useCallback(async () => {
    if (!selectedOrgId || !selectedRoleId) {
      msgApi.warning('Veuillez sélectionner une organisation et un rôle');
      return;
    }

    try {
      const response = await api.post('/api/users/user-organizations', {
        userId: user.id,
        organizationId: selectedOrgId,
        roleId: selectedRoleId,
      });

      if (response.success) {
        msgApi.success('Utilisateur ajouté à l\'organisation avec succès');
        setSelectedOrgId('');
        setSelectedRoleId('');
        setAddingNew(false);
        fetchUserOrganizations();
        onSuccess();
      }
    } catch {
      msgApi.error('Erreur lors de l\'ajout à l\'organisation');
    }
  }, [api, fetchUserOrganizations, msgApi, onSuccess, selectedOrgId, selectedRoleId, user.id]);

  const handleRemoveFromOrganization = useCallback(async (userOrganizationId: string) => {
    try {
      const response = await api.delete(`/api/users/user-organizations/${userOrganizationId}`);
      if (response.success) {
        msgApi.success('Utilisateur retiré de l\'organisation avec succès');
        fetchUserOrganizations();
        onSuccess();
      }
    } catch {
      msgApi.error('Erreur lors du retrait de l\'organisation');
    }
  }, [api, fetchUserOrganizations, msgApi, onSuccess]);

  const handleRoleChange = useCallback(async (userOrganizationId: string, newRoleId: string) => {
    try {
      const response = await api.patch(`/api/users/user-organizations/${userOrganizationId}`, {
        roleId: newRoleId,
      });

      if (response.success) {
        msgApi.success('Rôle modifié avec succès');
        fetchUserOrganizations();
        onSuccess();
      }
    } catch {
      msgApi.error('Erreur lors de la modification du rôle');
    }
  }, [api, fetchUserOrganizations, msgApi, onSuccess]);

  // Filtrer les organisations disponibles (exclure celles où l'utilisateur est déjà)
  const availableOrganizations = allOrganizations.filter(
    org => !userOrganizations.some(uo => uo.organizationId === org.id)
  );

  // Filtrer les rôles pour l'organisation sélectionnée (inclure les rôles globaux + spécifiques à l'org)
  const availableRoles = allRoles.filter(role => 
    role.organizationId === selectedOrgId || role.organizationId === null
  );

  const columns = [
    {
      title: 'Organisation',
      dataIndex: ['Organization', 'name'],
      key: 'organizationName',
    },
    {
      title: 'Rôle',
      key: 'role',
      render: (_, record: UserOrganization) => (
        <Select
          value={record.roleId}
          style={{ width: 150 }}
          onChange={(newRoleId) => handleRoleChange(record.id, newRoleId)}
          options={allRoles
            .filter(role => role.organizationId === record.organizationId || role.organizationId === null)
            .map(role => ({
              value: role.id,
              label: role.label || role.name,
            }))}
        />
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>
          {status === 'ACTIVE' ? 'Actif' : 'Inactif'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: UserOrganization) => (
        <Popconfirm
          title="Êtes-vous sûr de vouloir retirer cet utilisateur de cette organisation ?"
          onConfirm={() => handleRemoveFromOrganization(record.id)}
          okText="Oui"
          cancelText="Annuler"
          disabled={userOrganizations.length <= 1}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            disabled={userOrganizations.length <= 1}
            title={userOrganizations.length <= 1 ? "Impossible de supprimer la dernière organisation" : "Retirer de l'organisation"}
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Modal
      title={`Gestion des organisations - ${user.firstName} ${user.lastName}`}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={800}
    >
      {msgCtx}
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddingNew(true)}
          disabled={availableOrganizations.length === 0}
        >
          Ajouter à une organisation
        </Button>
      </div>

      {addingNew && (
        <div style={{ marginBottom: 16, padding: 16, border: '1px solid #d9d9d9', borderRadius: 4 }}>
          <h4>Ajouter à une nouvelle organisation</h4>
          <Space>
            <Select
              placeholder="Sélectionner une organisation"
              style={{ width: 200 }}
              value={selectedOrgId}
              onChange={(value) => {
                setSelectedOrgId(value);
                setSelectedRoleId(''); // Reset role when org changes
              }}
              options={availableOrganizations.map(org => ({
                value: org.id,
                label: org.name,
              }))}
            />
            <Select
              placeholder="Sélectionner un rôle"
              style={{ width: 200 }}
              value={selectedRoleId}
              onChange={setSelectedRoleId}
              disabled={!selectedOrgId}
              options={availableRoles.map(role => ({
                value: role.id,
                label: role.label || role.name,
              }))}
            />
            <Button type="primary" onClick={handleAddToOrganization} disabled={!selectedOrgId || !selectedRoleId}>
              Ajouter
            </Button>
            <Button onClick={() => {
              setAddingNew(false);
              setSelectedOrgId('');
              setSelectedRoleId('');
            }}>
              Annuler
            </Button>
          </Space>
        </div>
      )}

      <Table
        columns={columns}
        dataSource={userOrganizations}
        loading={loading}
        rowKey="id"
        pagination={false}
      />
    </Modal>
  );
};

export default UserOrganizationsModal;
