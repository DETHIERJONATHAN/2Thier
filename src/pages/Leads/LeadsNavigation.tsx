import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Card, Space, Typography, Badge, Button } from 'antd';
import {
  DashboardOutlined,
  UnorderedListOutlined,
  ProjectOutlined,
  TeamOutlined,
  ApiOutlined,
  SettingOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

/**
 * Composant de navigation latérale pour la section Leads
 * Affiche les différentes sous-sections disponibles avec un design moderne
 */
export default function LeadsNavigation() {
  const location = useLocation();
  
  // Vérifier les permissions
  const canViewDashboard = true;
  const canViewContacts = true;
  const canViewIntegrations = true;
  const canViewSettings = true;

  // Configuration des éléments du menu avec style moderne
  const navigationItems = [
    // Dashboard central supprimé - Utilisez /dashboard à la place
    {
      key: '/leads/list',
      icon: <UnorderedListOutlined />,
      title: 'Liste des leads',
      description: 'Gestion complète des leads',
      color: '#52c41a',
      badge: null,
      path: '/leads/list'
    },
    {
      key: '/leads/kanban',
      icon: <ProjectOutlined />,
      title: 'Vue Kanban',
      description: 'Pipeline visuel des ventes',
      color: '#722ed1',
      badge: null,
      path: '/leads/kanban'
    },
    canViewContacts && {
      key: '/leads/contacts',
      icon: <TeamOutlined />,
      title: 'Contacts',
      description: 'Base de contacts clients',
      color: '#fa8c16',
      badge: null,
      path: '/leads/contacts'
    },
    canViewIntegrations && {
      key: '/leads/integrations',
      icon: <ApiOutlined />,
      title: 'Intégrations',
      description: 'Connexions externes',
      color: '#13c2c2',
      badge: 'New',
      path: '/leads/integrations'
    },
    canViewSettings && {
      key: '/leads/settings',
      icon: <SettingOutlined />,
      title: 'Paramètres',
      description: 'Configuration du module',
      color: '#8c8c8c',
      badge: null,
      path: '/leads/settings'
    },
  ].filter(Boolean);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-80 bg-gradient-to-br from-slate-50 to-blue-50 border-r shrink-0 hidden md:block p-4">
      {/* En-tête avec style moderne */}
      <Card 
        className="mb-6 shadow-md border-0"
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <Title level={3} className="!text-white !mb-1">
          🚀 Gestion des Leads
        </Title>
        <Text className="text-blue-100">
          Hub central de votre CRM
        </Text>
      </Card>
      
      {/* Navigation avec cartes modernes */}
      <Space direction="vertical" size="middle" className="w-full">
        {navigationItems.map((item) => (
          <NavLink key={item.key} to={item.path} className="block">
            <Card
              hoverable
              className={`transition-all duration-300 border-2 ${
                isActive(item.path)
                  ? 'border-blue-500 shadow-lg transform scale-105'
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
              }`}
              style={{
                background: isActive(item.path)
                  ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
                  : 'white'
              }}
              styles={{ body: { padding: '16px' } }}
            >
              <div className="flex items-start space-x-3">
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-lg text-white text-xl shadow-lg"
                  style={{ backgroundColor: item.color }}
                >
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <Title level={5} className={`!mb-0 ${isActive(item.path) ? '!text-blue-700' : '!text-gray-800'}`}>
                      {item.title}
                    </Title>
                    {item.badge && (
                      <Badge 
                        count={item.badge} 
                        style={{ backgroundColor: '#f50' }}
                        className="ml-2"
                      />
                    )}
                  </div>
                  <Text 
                    type="secondary" 
                    className={`text-sm ${isActive(item.path) ? '!text-blue-600' : ''}`}
                  >
                    {item.description}
                  </Text>
                </div>
              </div>
              
              {/* Indicateur actif */}
              {isActive(item.path) && (
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
            </Card>
          </NavLink>
        ))}
      </Space>

      {/* Bouton d'action rapide */}
      <Card className="mt-6 bg-gradient-to-r from-green-400 to-blue-500 border-0 text-white">
        <Button 
          type="primary" 
          size="large" 
          block
          ghost
          className="border-white text-white hover:bg-white hover:text-green-500 font-semibold"
        >
          ➕ Nouveau Lead
        </Button>
      </Card>
    </div>
  );
}
