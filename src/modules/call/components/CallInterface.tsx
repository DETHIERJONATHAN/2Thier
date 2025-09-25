import React, { useState, useEffect } from 'react';
import { Card, Button, Avatar, Spin, Typography } from 'antd';
import { PhoneOutlined, PhoneFilled } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';

const { Title, Text } = Typography;

interface CallInterfaceProps {
  leadId?: string;
}

export const CallInterface: React.FC<CallInterfaceProps> = ({ leadId }) => {
  const { api } = useAuthenticatedApi();
  const [lead, setLead] = useState<any>(null);
  const [calling, setCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callActive, setCallActive] = useState(false);

  useEffect(() => {
    if (leadId) {
      fetchLead();
    }
  }, [leadId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callActive]);

  const fetchLead = async () => {
    try {
      const response = await api.get(`/api/leads/${leadId}`);
      setLead(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement du lead:', error);
    }
  };

  const startCall = async () => {
    setCalling(true);
    try {
      // Intégration Telnyx
      await api.post('/api/telnyx/call', {
        to: lead.phone,
        leadId: leadId
      });
      setCallActive(true);
      setCallDuration(0);
    } catch (error) {
      console.error('Erreur lors de l\'appel:', error);
    } finally {
      setCalling(false);
    }
  };

  const endCall = async () => {
    try {
      await api.post('/api/telnyx/hangup', { leadId });
      setCallActive(false);
    } catch (error) {
      console.error('Erreur lors de la fin d\'appel:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!lead) {
    return <Card><Spin /></Card>;
  }

  return (
    <Card title="Interface d'appel">
      <div className="text-center space-y-6">
        {/* Info lead */}
        <div className="space-y-2">
          <Avatar size={64}>{lead.firstName?.[0]}{lead.lastName?.[0]}</Avatar>
          <Title level={3}>{lead.firstName} {lead.lastName}</Title>
          {lead.company && <Text type="secondary">{lead.company}</Text>}
          <div className="text-lg font-mono">{lead.phone}</div>
        </div>

        {/* Statut d'appel */}
        {callActive && (
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-green-600 font-medium">Appel en cours</div>
            <div className="text-2xl font-mono text-green-700">
              {formatDuration(callDuration)}
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="space-y-3">
          {!callActive ? (
            <Button
              type="primary"
              size="large"
              icon={<PhoneOutlined />}
              loading={calling}
              onClick={startCall}
              className="w-full h-12"
              disabled={!lead.phone}
            >
              {calling ? 'Connexion...' : 'Appeler'}
            </Button>
          ) : (
            <Button
              danger
              size="large"
              icon={<PhoneFilled />}
              onClick={endCall}
              className="w-full h-12"
            >
              Raccrocher
            </Button>
          )}
        </div>

        {/* Informations rapides */}
        <div className="bg-gray-50 p-4 rounded-lg text-left">
          <div className="text-sm space-y-1">
            <div><strong>Source:</strong> {lead.source}</div>
            <div><strong>Statut:</strong> {lead.status}</div>
            <div><strong>Dernière action:</strong> {lead.lastAction || 'Aucune'}</div>
          </div>
        </div>
      </div>
    </Card>
  );
};
