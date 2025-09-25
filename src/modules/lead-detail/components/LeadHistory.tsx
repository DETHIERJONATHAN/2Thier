import React from 'react';
import { Card, Timeline, Tag } from 'antd';
import { PhoneOutlined, MailOutlined, CalendarOutlined, EditOutlined } from '@ant-design/icons';

interface LeadHistoryProps {
  leadId?: string;
}

export const LeadHistory: React.FC<LeadHistoryProps> = ({ leadId }) => {
  // Mock data - à remplacer par un appel API
  const history = [
    {
      id: 1,
      type: 'call',
      action: 'Appel téléphonique',
      description: 'Contact établi, client intéressé par nos services',
      date: '2024-01-15 10:30',
      user: 'Jonathan',
      status: 'completed'
    },
    {
      id: 2,
      type: 'email',
      action: 'Email envoyé',
      description: 'Devis transmis par email',
      date: '2024-01-14 16:45',
      user: 'Jonathan',
      status: 'sent'
    },
    {
      id: 3,
      type: 'meeting',
      action: 'RDV planifié',
      description: 'Rendez-vous commercial fixé pour le 20/01',
      date: '2024-01-14 14:20',
      user: 'Jonathan',
      status: 'scheduled'
    },
    {
      id: 4,
      type: 'edit',
      action: 'Lead modifié',
      description: 'Statut changé de "Nouveau" à "Contacté"',
      date: '2024-01-13 09:15',
      user: 'Système',
      status: 'updated'
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'call': return <PhoneOutlined />;
      case 'email': return <MailOutlined />;
      case 'meeting': return <CalendarOutlined />;
      case 'edit': return <EditOutlined />;
      default: return null;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'call': return 'blue';
      case 'email': return 'green';
      case 'meeting': return 'purple';
      case 'edit': return 'orange';
      default: return 'gray';
    }
  };

  return (
    <Card title="Historique complet">
      <Timeline>
        {history.map((item) => (
          <Timeline.Item 
            key={item.id}
            dot={getIcon(item.type)}
            color={getColor(item.type)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium">{item.action}</span>
                  <Tag size="small">{item.user}</Tag>
                </div>
                <p className="text-gray-600 text-sm mb-1">{item.description}</p>
                <p className="text-xs text-gray-400">{item.date}</p>
              </div>
            </div>
          </Timeline.Item>
        ))}
      </Timeline>
    </Card>
  );
};
