import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Card, Row, Col, Typography, Space } from 'antd';
import { 
  HomeOutlined, 
  AppstoreOutlined, 
  ContactsOutlined, 
  SettingOutlined, 
  ApiOutlined
} from '@ant-design/icons';
import { useAuth } from '../../auth/useAuth';

const { Text } = Typography;

const LeadsHorizontalNavigation = () => {
  const { can } = useAuth();
  const location = useLocation();

  // Vérification des permissions pour chaque lien
  const canViewDashboard = can('leads_dashboard:read');
  const canViewLeads = can('leads:read');

  // Configuration des éléments de navigation avec couleurs et descriptions
  const navigationItems = [
    // Dashboard supprimé - Utilisez /dashboard à la place
    {
      to: '/leads/list',
      icon: <ContactsOutlined className="text-2xl" />,
      label: 'Liste',
      description: 'Tous les leads',
      color: '#52c41a',
      bgGradient: 'from-green-50 to-green-100',
      borderColor: 'border-green-200',
      condition: canViewLeads
    },
    {
      to: '/leads/kanban',
      icon: <SettingOutlined className="text-2xl" />,
      label: 'Paramètres',
      description: 'Configuration',
      color: '#8c8c8c',
      bgGradient: 'from-gray-50 to-gray-100',
      borderColor: 'border-gray-200',
      condition: true
    }
  ];

  // Filtrer selon les permissions
  const filteredItems = navigationItems.filter(item => item.condition);

  return (
    <div className="bg-gradient-to-r from-gray-50 to-white py-6 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6">
        <Row gutter={[16, 16]} justify="start">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            
            return (
              <Col key={item.to} xs={24} sm={12} md={8} lg={4} xl={4}>
                <NavLink to={item.to}>
                  <Card
                    hoverable
                    className={`
                      transition-all duration-300 transform hover:scale-105 hover:shadow-lg relative
                      ${isActive 
                        ? `border-2 shadow-md bg-gradient-to-br ${item.bgGradient} ${item.borderColor}` 
                        : 'border border-gray-200 hover:border-gray-300 bg-white'
                      }
                    `}
                    styles={{ 
                      body: { 
                        padding: '16px',
                        textAlign: 'center',
                        height: '120px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center'
                      } 
                    }}
                  >
                    <Space direction="vertical" size="small" className="w-full">
                      <div 
                        className={`
                          inline-flex items-center justify-center w-12 h-12 rounded-lg mx-auto
                          ${isActive ? 'bg-white shadow-sm' : 'bg-gray-50'}
                        `}
                        style={{ color: item.color }}
                      >
                        {item.icon}
                      </div>
                      
                      <div>
                        <Text 
                          strong 
                          className={`block text-sm ${isActive ? 'text-gray-800' : 'text-gray-700'}`}
                        >
                          {item.label}
                        </Text>
                        <Text 
                          type="secondary" 
                          className={`text-xs ${isActive ? 'text-gray-600' : 'text-gray-500'}`}
                        >
                          {item.description}
                        </Text>
                      </div>
                      
                      {isActive && (
                        <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-bl-lg font-medium">
                          Actif
                        </div>
                      )}
                    </Space>
                  </Card>
                </NavLink>
              </Col>
            );
          })}
        </Row>
      </div>
    </div>
  );
};

export default LeadsHorizontalNavigation;
