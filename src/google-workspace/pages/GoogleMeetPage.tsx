import React from 'react';
import { Card, Typography, Alert, Spin, Button, Space } from 'antd';
import { VideoCameraOutlined, PlusOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const GoogleMeetPage: React.FC = () => {
  const handleCreateMeeting = () => {
    window.open('https://meet.google.com/new', '_blank');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <Title level={2} className="flex items-center gap-3 mb-2">
          <VideoCameraOutlined className="text-blue-600" />
          Google Meet - Visioconférences
        </Title>
        <Text className="text-gray-600">
          Créez et participez à des réunions virtuelles directement depuis le CRM
        </Text>
      </div>

      <Alert
        message="Google Meet Intégré"
        description="Démarrez une nouvelle réunion ou rejoignez une réunion existante via Google Meet."
        type="info"
        showIcon
        className="mb-4"
        action={
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleCreateMeeting}
            >
              Nouvelle réunion
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
            src="https://meet.google.com/"
            className="w-full h-full border-0"
            title="Google Meet"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-camera allow-microphone"
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

export default GoogleMeetPage;
