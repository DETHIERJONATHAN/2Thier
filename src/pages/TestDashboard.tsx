import React from 'react';
import { Card, Row, Col, Typography, Progress } from 'antd';
import { DollarOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const { Title } = Typography;

const TestDashboard: React.FC = () => {
  return (
    <div className="p-6">
      <Title level={2} className="mb-6">Dashboard Test</Title>
      
      <Row gutter={[16, 16]}>
        {/* Première rangée de cartes */}
        <Col xs={24} sm={12} lg={6}>
          <Card className="h-full">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-500 mb-1">Revenue</p>
                <Title level={3} className="!mb-0">$5.77k</Title>
                <div className="flex items-center mt-2">
                  <ArrowUpOutlined className="text-green-500 mr-1" />
                  <span className="text-green-500">+2.45%</span>
                </div>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <DollarOutlined className="text-blue-500 text-xl" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="h-full">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-500 mb-1">Dépenses</p>
                <Title level={3} className="!mb-0">$4.14k</Title>
                <div className="flex items-center mt-2">
                  <ArrowDownOutlined className="text-red-500 mr-1" />
                  <span className="text-red-500">-1.28%</span>
                </div>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <DollarOutlined className="text-red-500 text-xl" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="h-full">
            <div>
              <p className="text-gray-500 mb-1">Taux de conversion</p>
              <Title level={3} className="!mb-0">28.14%</Title>
              <div className="mt-4">
                <Progress percent={28.14} showInfo={false} strokeColor="#1890ff" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="h-full">
            <div>
              <p className="text-gray-500 mb-1">Clients actifs</p>
              <Title level={3} className="!mb-0">392</Title>
              <div className="flex items-center mt-2">
                <ArrowUpOutlined className="text-green-500 mr-1" />
                <span className="text-green-500">+8.2%</span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Deuxième rangée avec graphiques */}
      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} lg={16}>
          <Card title="Statistiques mensuelles" className="h-full">
            {/* Ici nous ajouterons un graphique plus tard */}
            <div className="h-64 flex items-center justify-center bg-gray-50">
              Graphique des statistiques mensuelles
            </div>
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card title="Répartition des revenus" className="h-full">
            {/* Ici nous ajouterons un graphique circulaire plus tard */}
            <div className="h-64 flex items-center justify-center bg-gray-50">
              Graphique circulaire
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TestDashboard;
