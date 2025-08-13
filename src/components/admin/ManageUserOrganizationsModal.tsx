import React, { useState, useEffect } from 'react';
import { Modal, Select, Button, message, Tag, Space } from 'antd';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { User, Organization } from '../../types';

interface Props {
  visible: boolean;
  user: User | null;
  onCancel: () => void;
}

const ManageUserOrganizationsModal: React.FC<Props> = ({ visible, user, onCancel }) => {
  const { api } = useAuthenticatedApi();
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [userOrganizations, setUserOrganizations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && user) {
      const fetchOrgs = async () => {
        setLoading(true);
        try {
          // Récupérer seulement les organisations actives (on ne peut assigner un utilisateur qu'à une org active)
          const allOrgsRes = await api.get('/api/organizations/active');
          if (allOrgsRes.success && Array.isArray(allOrgsRes.data)) {
            setAllOrganizations(allOrgsRes.data);
          }

          // Récupérer les organisations de l'utilisateur
          const userOrgsRes = await api.get(`/users/${user.id}/organizations`);
          if (userOrgsRes.success && Array.isArray(userOrgsRes.data)) {
            setUserOrganizations(userOrgsRes.data.map((org: any) => org.organizationId));
          }
        } catch (error) {
          message.error("Erreur lors de la récupération des organisations.");
        } finally {
          setLoading(false);
        }
      };
      fetchOrgs();
    }
  }, [visible, user, api]);

  const handleUpdateOrganizations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await api.post(`/users/${user.id}/organizations`, {
        organizationIds: userOrganizations,
      });
      if (response.success) {
        message.success("Les organisations de l'utilisateur ont été mises à jour.");
        onCancel();
      }
    } catch (error) {
      // L'erreur est gérée par le hook useAuthenticatedApi
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Modal
      title={`Gérer les organisations de ${user.firstName} ${user.lastName}`}
      visible={visible}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>
          Annuler
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleUpdateOrganizations}>
          Mettre à jour
        </Button>,
      ]}
    >
      <p>Sélectionnez les organisations auxquelles cet utilisateur doit appartenir.</p>
      <Select
        mode="multiple"
        loading={loading}
        style={{ width: '100%' }}
        placeholder="Sélectionnez des organisations"
        value={userOrganizations}
        onChange={(values) => setUserOrganizations(values)}
        optionLabelProp="label"
      >
        {allOrganizations.map(org => (
          <Select.Option key={org.id} value={org.id} label={org.name}>
            <Space>
              <span>{org.name}</span>
              {org.id === user.primaryOrganizationId && (
                <Tag color="gold">Principale</Tag>
              )}
            </Space>
          </Select.Option>
        ))}
      </Select>
    </Modal>
  );
};

export default ManageUserOrganizationsModal;