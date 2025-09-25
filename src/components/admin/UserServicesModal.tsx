import React, { useState, useEffect, useCallback } from 'react';
// CORRECTION : Ajout de 'Space' à la liste des imports depuis antd
import { Modal, Switch, Spin, message, Row, Col, Typography, Alert, Space } from 'antd';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { User } from '../../types';

const { Text } = Typography;

interface UserServicesModalProps {
  user: User | null;
  visible: boolean;
  onClose: () => void;
}

const UserServicesModal: React.FC<UserServicesModalProps> = ({ user, visible, onClose }) => {
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [telnyxEnabled, setTelnyxEnabled] = useState(false);

  // CORRECTION : La dépendance [user?.id, visible] stabilise le hook.
  // Il ne se redéclenchera que si l'ID de l'utilisateur change ou si le modal s'ouvre.
  useEffect(() => {
    const fetchStatus = async () => {
      if (!user || !visible) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const emailRes = await api.get(`/api/services/email/status/${user.id}`);
        if (emailRes.success) {
          setEmailEnabled(emailRes.data.isEnabled);
        }
        const telnyxRes = await api.get(`/api/services/telnyx/status/${user.id}`);
        if (telnyxRes.success) {
          setTelnyxEnabled(telnyxRes.data.isEnabled);
        }
      } catch (err) {
        setError("Erreur lors de la récupération du statut des services.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [user?.id, visible, api]); // Utilisation de user.id au lieu de l'objet user entier

  const handleToggleService = useCallback(async (service: 'email' | 'telnyx', checked: boolean) => {
    if (!user) return;
    
    const action = checked ? 'enable' : 'disable';
    message.loading({ content: `Modification en cours...`, key: service });

    try {
      const response = await api.post(`/api/services/${service}/${action}/${user.id}`);
      if (response.success) {
        message.success({ content: `Service ${service} mis à jour.`, key: service, duration: 2 });
        if (service === 'email') setEmailEnabled(checked);
        if (service === 'telnyx') setTelnyxEnabled(checked);
      } else {
        throw new Error(response.message || 'Erreur inconnue');
      }
    } catch (err: any) {
      message.error({ content: `Échec de la mise à jour: ${err.message}`, key: service, duration: 4 });
      // On remet le switch à son état précédent en cas d'erreur
      if (service === 'email') setEmailEnabled(!checked);
      if (service === 'telnyx') setTelnyxEnabled(!checked);
    }
  }, [api, user]);

  return (
    <Modal
      title={`Gestion des services pour ${user?.firstName} ${user?.lastName}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>
      ) : error ? (
        <Alert message={error} type="error" showIcon />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Text strong>Adresse email professionnelle</Text>
            </Col>
            <Col>
              <Switch
                checked={emailEnabled}
                onChange={(checked) => handleToggleService('email', checked)}
                loading={loading}
              />
            </Col>
          </Row>
          <Row align="middle" justify="space-between">
            <Col>
              <Text strong>Service Telnyx</Text>
            </Col>
            <Col>
              <Switch
                checked={telnyxEnabled}
                onChange={(checked) => handleToggleService('telnyx', checked)}
                loading={loading}
              />
            </Col>
          </Row>
        </Space>
      )}
    </Modal>
  );
};

export default UserServicesModal;
