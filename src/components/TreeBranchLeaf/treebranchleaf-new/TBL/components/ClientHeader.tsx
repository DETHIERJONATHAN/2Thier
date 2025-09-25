import React from 'react';
import { Card, Space, Typography, Tag } from 'antd';
import { UserOutlined, PhoneOutlined, MailOutlined, HomeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ClientHeaderProps {
  clientData: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
}

const ClientHeader: React.FC<ClientHeaderProps> = ({ clientData }) => {
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="mx-auto max-w-7xl p-4">
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Infos client */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <UserOutlined className="text-blue-500 text-lg" />
                <Title level={3} className="m-0 text-gray-800">
                  {clientData.name}
                </Title>
                <Tag color="blue">Lead</Tag>
              </div>
              
              <Space direction="vertical" size="small" className="text-gray-600">
                <div className="flex items-center gap-2">
                  <MailOutlined className="text-gray-400" />
                  <Text>{clientData.email}</Text>
                </div>
                <div className="flex items-center gap-2">
                  <PhoneOutlined className="text-gray-400" />
                  <Text>{clientData.phone}</Text>
                </div>
                <div className="flex items-center gap-2">
                  <HomeOutlined className="text-gray-400" />
                  <Text>{clientData.address}</Text>
                </div>
              </Space>
            </div>

            {/* Badge système multi-secteurs */}
            <div className="text-right">
              <Tag color="green" className="text-sm font-medium px-3 py-1">
                Système Multi-secteurs
              </Tag>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ClientHeader;
