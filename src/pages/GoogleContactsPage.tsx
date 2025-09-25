import React from 'react';
import { Typography, Card } from 'antd';

const { Title, Paragraph } = Typography;

const GoogleContactsPage: React.FC = () => {
  return (
    <div className="p-6">
      <Card>
        <Title level={2}>📇 Google Contacts</Title>
        <Paragraph>
          Cette page permet de gérer vos contacts Google.
        </Paragraph>
        <Paragraph type="secondary">
          Fonctionnalité en cours de développement...
        </Paragraph>
      </Card>
    </div>
  );
};

export default GoogleContactsPage;