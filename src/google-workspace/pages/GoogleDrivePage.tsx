import React from 'react';
import { Card, Typography, Alert, Spin } from 'antd';
import { CloudOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const GoogleDrivePage: React.FC = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <Title level={2} className="flex items-center gap-3 mb-2">
          <CloudOutlined className="text-green-500" />
          Google Drive - Stockage Cloud
        </Title>
        <Text className="text-gray-600">
          Accédez à vos fichiers et dossiers Google Drive depuis le CRM
        </Text>
      </div>

      <Alert
        message="Google Drive Intégré"
        description="Votre espace de stockage Google Drive est affiché ci-dessous. Vous pouvez consulter, télécharger et gérer vos fichiers."
        type="info"
        showIcon
        className="mb-4"
      />

  <Card className="flex-1 p-0" styles={{ body: { padding: 0, height: 'calc(100vh - 200px)' } }}>
        <div className="relative w-full h-full">
          <Spin 
            size="large" 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
          />
          <iframe
            src="https://drive.google.com/drive/my-drive"
            className="w-full h-full border-0"
            title="Google Drive"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            onLoad={(e) => {
              const spinner = e.currentTarget.parentElement?.querySelector('.ant-spin');
              if (spinner) {
                (spinner as HTMLElement).style.display = 'none';
              }
            }}
          />
        </div>
      </Card>
    </div>
  );
};

export default GoogleDrivePage;
