import React from 'react';
import { useAuth } from '../auth/useAuth';
import { Card, Typography, Tag } from 'antd';

const { Text, Title } = Typography;

// 🔍 Composant de debug pour vérifier les modules chargés
export const DebugModules: React.FC = () => {
  const { modules, currentOrganization } = useAuth();

  if (!modules || modules.length === 0) {
    return (
      <Card size="small" style={{ margin: '8px' }}>
        <Text type="danger">⚠️ Aucun module chargé</Text>
      </Card>
    );
  }

  return (
    <Card size="small" style={{ margin: '8px' }}>
      <Title level={5}>🔍 Debug Modules ({currentOrganization?.name})</Title>
      {modules.map((module, index) => (
        <div key={index} style={{ marginBottom: '4px' }}>
          <Tag color={module.isActiveInOrg ? 'green' : 'red'}>
            {module.name || module.key || 'No name'}
          </Tag>
          <Text code style={{ fontSize: '10px' }}>
            feature: {module.feature || 'null'}
          </Text>
        </div>
      ))}
    </Card>
  );
};

export default DebugModules;
