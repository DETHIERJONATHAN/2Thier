import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Avatar, Button, Spin } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';

interface LeadInfoProps {
  leadId?: string;
}

export const LeadInfo: React.FC<LeadInfoProps> = ({ leadId }) => {
  const { api } = useAuthenticatedApi();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (leadId) {
      fetchLead();
    }
  }, [leadId]);

  const fetchLead = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/leads/${leadId}`);
      setLead(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement du lead:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Card><Spin /></Card>;
  }

  if (!lead) {
    return <Card>Lead non trouvé</Card>;
  }

  return (
    <Card 
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar size="large">
              {lead.firstName?.[0]}{lead.lastName?.[0]}
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">
                {lead.firstName} {lead.lastName}
              </h2>
              {lead.company && (
                <p className="text-gray-600">{lead.company}</p>
              )}
            </div>
          </div>
          <Button icon={<EditOutlined />}>Modifier</Button>
        </div>
      }
    >
      <Descriptions column={2} size="small">
        <Descriptions.Item label="Email">
          {lead.email}
        </Descriptions.Item>
        <Descriptions.Item label="Téléphone">
          {lead.phone || 'Non renseigné'}
        </Descriptions.Item>
        <Descriptions.Item label="Source">
          <Tag color="blue">{lead.source}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Statut">
          <Tag color="green">{lead.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Commercial assigné">
          {lead.assignedTo || 'Non assigné'}
        </Descriptions.Item>
        <Descriptions.Item label="Date de création">
          {new Date(lead.createdAt).toLocaleDateString()}
        </Descriptions.Item>
        <Descriptions.Item label="Adresse" span={2}>
          {lead.address || 'Non renseignée'}
        </Descriptions.Item>
        <Descriptions.Item label="Notes" span={2}>
          {lead.notes || 'Aucune note'}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
};
