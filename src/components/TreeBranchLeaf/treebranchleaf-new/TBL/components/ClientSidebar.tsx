import React from 'react';
import { Card, Space, Typography, Progress, Statistic, Divider } from 'antd';
import { 
  DollarOutlined, 
  ThunderboltOutlined, 
  BuildOutlined,
  CheckCircleOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined
} from '@ant-design/icons';

const { Text } = Typography;

interface ClientSidebarProps {
  clientData?: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
}

const ClientSidebar: React.FC<ClientSidebarProps> = ({ 
  clientData = {
    name: "Dupont Alice",
    email: "alice.dupont@example.com", 
    phone: "+32 477 12 34 56",
    address: "Rue des Fleurs 12, 1000 Bruxelles"
  }
}) => {
  // Données mockées (viendront des calculs TreeBranchLeaf)
  const stats = {
    budget: 25000,
    surface: 45,
    puissance: 8.5,
    economies: 1250,
    progression: 65
  };

  return (
    <Space direction="vertical" size="large" className="w-full">
      {/* Informations Client */}
      <Card title="Informations Client" className="shadow-sm">
        <Space direction="vertical" size="small" className="w-full">
          <div className="flex items-center space-x-2">
            <UserOutlined className="text-blue-500" />
            <Text strong className="text-sm">{clientData.name}</Text>
          </div>
          
          <div className="flex items-center space-x-2">
            <MailOutlined className="text-green-500" />
            <Text className="text-xs text-gray-600">{clientData.email}</Text>
          </div>
          
          <div className="flex items-center space-x-2">
            <PhoneOutlined className="text-orange-500" />
            <Text className="text-xs text-gray-600">{clientData.phone}</Text>
          </div>
          
          <div className="flex items-start space-x-2">
            <HomeOutlined className="text-purple-500 mt-0.5" />
            <Text className="text-xs text-gray-600">{clientData.address}</Text>
          </div>
        </Space>
      </Card>

      {/* Résumé projet */}
      <Card title="Résumé du projet" className="shadow-sm">
        <Space direction="vertical" size="middle" className="w-full">
          <Statistic
            title="Budget disponible"
            value={stats.budget}
            prefix={<DollarOutlined />}
            suffix="€"
            valueStyle={{ color: '#3f8600', fontSize: '16px' }}
          />
          
          <Statistic
            title="Surface utile"
            value={stats.surface}
            suffix="m²"
            prefix={<BuildOutlined />}
            valueStyle={{ fontSize: '16px' }}
          />
          
          <Statistic
            title="Puissance estimée"
            value={stats.puissance}
            suffix="kWc"
            prefix={<ThunderboltOutlined />}
            valueStyle={{ color: '#1890ff', fontSize: '16px' }}
          />
          
          <Statistic
            title="Économies/an"
            value={stats.economies}
            suffix="€"
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a', fontSize: '16px' }}
          />
        </Space>
      </Card>

      {/* Progression */}
      <Card title="Avancement" className="shadow-sm">
        <Space direction="vertical" size="middle" className="w-full">
          <div>
            <div className="flex justify-between mb-2">
              <Text>Formulaire complété</Text>
              <Text strong>{stats.progression}%</Text>
            </div>
            <Progress 
              percent={stats.progression} 
              strokeColor="#52c41a"
              size="small"
            />
          </div>
          
          <Divider />
          
          <div className="text-sm text-gray-500">
            <div className="flex justify-between mb-1">
              <span>Mesures générales</span>
              <CheckCircleOutlined className="text-green-500" />
            </div>
            <div className="flex justify-between mb-1">
              <span>Photovoltaïque</span>
              <CheckCircleOutlined className="text-green-500" />
            </div>
            <div className="flex justify-between mb-1">
              <span>Toiture</span>
              <span className="text-orange-500">En cours</span>
            </div>
            <div className="flex justify-between">
              <span>PAC Air-Air</span>
              <span className="text-gray-400">À faire</span>
            </div>
          </div>
        </Space>
      </Card>

      {/* Actions rapides */}
      <Card title="Actions" className="shadow-sm">
        <Space direction="vertical" size="small" className="w-full">
          <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors text-sm">
            Générer devis PDF
          </button>
          <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded transition-colors text-sm">
            Valider & Envoyer
          </button>
          <button className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors text-sm">
            Sauvegarder brouillon
          </button>
        </Space>
      </Card>
    </Space>
  );
};

export { ClientSidebar };

export default ClientSidebar;
