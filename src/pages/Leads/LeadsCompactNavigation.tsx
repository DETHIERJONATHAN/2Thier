import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Space, Button } from 'antd';
import { 
  HomeOutlined, 
  UnorderedListOutlined, 
  AppstoreOutlined, 
  ContactsOutlined, 
  SettingOutlined, 
  ApiOutlined
} from '@ant-design/icons';
import { useAuth } from '../../auth/useAuth';

const LeadsCompactNavigation = () => {
  const { can } = useAuth();
  const location = useLocation();

  // Vérification des permissions pour chaque lien
  const canViewDashboard = can('leads_dashboard:read');
  const canViewLeads = can('leads:read');

  // Configuration des éléments de navigation compacts
  const navigationItems = [
    // Dashboard supprimé - Utilisez /dashboard à la place
    {
      to: '/leads/list',
      icon: <UnorderedListOutlined />,
      label: 'Liste des leads',
      color: '#52c41a',
      condition: canViewLeads
    },
    {
      to: '/leads/kanban',
      icon: <SettingOutlined />,
      label: 'Paramètres',
      color: '#8c8c8c',
      condition: true
    }
  ];

  // Filtrer selon les permissions
  const filteredItems = navigationItems.filter(item => item.condition);

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm py-3">
      <div className="max-w-7xl mx-auto px-6">
        <Space size="middle" wrap>
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            
            return (
              <NavLink key={item.to} to={item.to}>
                <Button
                  type={isActive ? 'primary' : 'default'}
                  icon={item.icon}
                  size="large"
                  className={`
                    h-12 px-6 font-medium transition-all duration-200 border-2
                    ${isActive 
                      ? 'shadow-md' 
                      : 'hover:border-gray-400 hover:shadow-sm'
                    }
                  `}
                  style={{
                    backgroundColor: isActive ? item.color : 'white',
                    borderColor: isActive ? item.color : '#d9d9d9',
                    color: isActive ? 'white' : item.color
                  }}
                >
                  {item.label}
                </Button>
              </NavLink>
            );
          })}
        </Space>
      </div>
    </div>
  );
};

export default LeadsCompactNavigation;
