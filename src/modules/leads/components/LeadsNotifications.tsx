import React from 'react';
import { Alert, Badge, Space } from 'antd';
import { ClockCircleOutlined, ExclamationCircleOutlined, FireOutlined } from '@ant-design/icons';

export const LeadsNotifications: React.FC = () => {
  const notifications = [
    {
      type: 'error' as const,
      message: '3 leads dépassent le délai de traitement',
      icon: <ExclamationCircleOutlined />,
      urgent: true
    },
    {
      type: 'warning' as const,
      message: '5 appels terminés sans statut - à compléter',
      icon: <ClockCircleOutlined />,
      urgent: false
    },
    {
      type: 'info' as const,
      message: 'Lead "Dupont SRL" a ouvert votre email 3 fois - Lead chaud!',
      icon: <FireOutlined />,
      urgent: true
    }
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          ⚡ Alertes IA
          <Badge count={notifications.filter(n => n.urgent).length} className="ml-2" />
        </h2>
      </div>
      
      <Space direction="vertical" size="small" className="w-full">
        {notifications.map((notification, index) => (
          <Alert
            key={index}
            message={notification.message}
            type={notification.type}
            icon={notification.icon}
            showIcon
            className={notification.urgent ? 'border-l-4 border-l-red-500' : ''}
            action={
              notification.urgent && (
                <Badge status="processing" text="Action requise" />
              )
            }
          />
        ))}
      </Space>
    </div>
  );
};
