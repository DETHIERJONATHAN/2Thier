import React from 'react';
import { NavLink } from 'react-router-dom';
import { Card, Typography, Badge, Button } from 'antd';
import { 
  HomeOutlined, 
  UnorderedListOutlined, 
  AppstoreOutlined, 
  ContactsOutlined, 
  SettingOutlined, 
  ApiOutlined,
  PlusOutlined,
  RocketOutlined 
} from '@ant-design/icons';
import { useAuth } from '../../auth/useAuth';

const { Title, Text } = Typography;

const LeadsSubSidebar = () => {
  const { can } = useAuth();

  // Vérification des permissions pour chaque lien
  const canViewDashboard = can('leads_dashboard:read');
  const canViewLeads = can('leads:read');

  // Configuration des liens avec un design moderne
  const navigationItems = [
    // Dashboard supprimé - Utilisez /dashboard à la place
    { 
      to: '/leads/list', 
      icon: <UnorderedListOutlined />, 
      label: 'Liste des leads',
      description: 'Gestion complète des leads', 
      condition: canViewLeads,
      color: '#52c41a',
      gradient: 'from-green-400 to-green-600'
    },
    { 
      to: '/leads/kanban', 
      icon: <AppstoreOutlined />, 
      label: 'Vue Kanban',
      description: 'Pipeline visuel des ventes', 
      condition: canViewLeads,
      color: '#722ed1',
      gradient: 'from-purple-400 to-purple-600'
    },
    { 
      to: '/leads/contacts', 
      icon: <ContactsOutlined />, 
      label: 'Contacts',
      description: 'Base de données contacts', 
      condition: true,
      color: '#fa8c16',
      gradient: 'from-orange-400 to-orange-600'
    },
    { 
      to: '/leads/integrations', 
      icon: <ApiOutlined />, 
      label: 'Intégrations',
      description: 'Connexions externes', 
      condition: true,
      color: '#13c2c2',
      gradient: 'from-cyan-400 to-cyan-600',
      badge: 'New'
    },
    { 
      to: '/leads/settings', 
      icon: <SettingOutlined />, 
      label: 'Paramètres',
      description: 'Configuration du module', 
      condition: true,
      color: '#8c8c8c',
      gradient: 'from-gray-400 to-gray-600'
    },
  ];

  const filteredLinks = navigationItems.filter(link => link.condition);

  return (
    <div className="w-80 p-4">
      {/* En-tête avec design moderne */}
      <Card 
        className="mb-6 shadow-lg border-0 overflow-hidden"
        styles={{ body: { padding: '20px' } }}
      >
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white p-4 -m-5 mb-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-full">
                <RocketOutlined className="text-xl" />
              </div>
              <div>
                <Title level={4} className="!text-white !mb-0">
                  🚀 Gestion des Leads
                </Title>
                <Text className="text-indigo-100 text-sm">
                  Hub CRM professionnel
                </Text>
              </div>
            </div>
          </div>
        </div>
        
        <Button 
          type="primary" 
          size="middle"
          block
          icon={<PlusOutlined />}
          className="bg-gradient-to-r from-green-400 to-blue-500 border-0 font-semibold shadow-lg"
        >
          Nouveau Lead
        </Button>
      </Card>

      {/* Navigation horizontale dans la largeur de la sidebar */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {filteredLinks.map((link) => {
          return (
            <NavLink key={link.to} to={link.to} className="block">
              {({ isActive }) => (
                <Card
                  hoverable
                  size="small"
                  className={`transition-all duration-300 border-0 shadow-md hover:shadow-lg h-24 ${
                    isActive 
                      ? 'ring-2 ring-blue-400 transform scale-105' 
                      : 'hover:transform hover:scale-102'
                  }`}
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(24, 144, 255, 0.1) 0%, rgba(69, 90, 255, 0.1) 100%)'
                      : 'white'
                  }}
                  styles={{ body: { padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } }}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-lg text-white text-sm shadow-md bg-gradient-to-br ${link.gradient} transform transition-transform hover:scale-110 relative`}
                    >
                      {link.icon}
                      {link.badge && (
                        <Badge 
                          count={link.badge} 
                          style={{ 
                            backgroundColor: '#f50',
                            fontSize: '8px',
                            height: '14px',
                            lineHeight: '14px',
                            borderRadius: '7px',
                            position: 'absolute',
                            top: '-3px',
                            right: '-3px'
                          }}
                        />
                      )}
                    </div>
                    
                    <div className="text-center">
                      <Title 
                        level={5} 
                        className={`!mb-0 !text-xs !leading-tight ${isActive ? '!text-blue-600 font-bold' : '!text-gray-800'}`}
                      >
                        {link.label}
                      </Title>
                    </div>
                    
                    {/* Indicateur actif en bas */}
                    {isActive && (
                      <div 
                        className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg"
                        style={{ background: `linear-gradient(90deg, ${link.color}, ${link.color}99)` }}
                      />
                    )}
                  </div>
                </Card>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Statistiques rapides compactes */}
      <Card 
        size="small" 
        className="bg-gradient-to-r from-gray-50 to-blue-50 border-0"
        styles={{ body: { padding: '12px' } }}
      >
        <div className="text-center">
          <Text strong className="text-gray-700 flex items-center justify-center mb-2">
            <span className="mr-1">📊</span>
            Stats rapides
          </Text>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <Text strong className="text-green-600 text-sm block">24</Text>
              <Text type="secondary" className="text-xs">Actifs</Text>
            </div>
            <div>
              <Text strong className="text-blue-600 text-sm block">12</Text>
              <Text type="secondary" className="text-xs">En cours</Text>
            </div>
            <div>
              <Text strong className="text-purple-600 text-sm block">+18%</Text>
              <Text type="secondary" className="text-xs">Ce mois</Text>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LeadsSubSidebar;
