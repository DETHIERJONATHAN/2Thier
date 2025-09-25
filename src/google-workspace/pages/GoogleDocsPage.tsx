import React from 'react';
import { Card, Typography, Alert, Spin, Button, Space } from 'antd';
import { FileTextOutlined, PlusOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const GoogleDocsPage: React.FC = () => {
  const handleCreateDoc = () => {
    window.open('https://docs.google.com/document/create', '_blank');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <Title level={2} className="flex items-center gap-3 mb-2">
          <FileTextOutlined className="text-blue-500" />
          Google Docs - Documents Collaboratifs
        </Title>
        <Text className="text-gray-600">
          Créez et éditez des documents collaboratifs depuis le CRM
        </Text>
      </div>

      <Alert
        message="Google Docs Intégré"
        description="Accédez à vos documents Google Docs ou créez de nouveaux documents collaboratifs."
        type="info"
        showIcon
        className="mb-4"
        action={
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleCreateDoc}
            >
              Nouveau document
            </Button>
          </Space>
        }
      />

  <Card className="flex-1 p-0" styles={{ body: { padding: 0, height: 'calc(100vh - 250px)' } }}>
        <div className="relative w-full h-full">
          <Spin 
            size="large" 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
          />
          <iframe
            src="https://docs.google.com/document/"
            className="w-full h-full border-0"
            title="Google Docs"
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

export default GoogleDocsPage;
