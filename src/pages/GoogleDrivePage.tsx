import React from 'react';
import { Typography, Card } from 'antd';

const { Title } = Typography;

const GoogleDrivePage: React.FC = () => {
  return (
    <Card>
      <Title level={2}>Google Drive</Title>
      <p>Cette page affichera l'intégration avec Google Drive.</p>
    </Card>
  );
};

export default GoogleDrivePage;
