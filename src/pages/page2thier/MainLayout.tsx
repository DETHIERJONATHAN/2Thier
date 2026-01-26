import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Layout, Menu, Dropdown, Button, Input } from 'antd';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  MenuOutlined, 
  SearchOutlined,
  StarOutlined,
  FlagOutlined,
  BellOutlined,
  QuestionCircleOutlined,
  HomeOutlined,
  DownOutlined,
  LogoutOutlined,
  UserOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useAuth } from '../../auth/useAuth';
import useCRMStore from '../../store';
import type { CRMState } from '../../store/slices/types';

// Import des bibliothèques d'icônes pour les modules
import * as FaIcons from 'react-icons/fa';
import * as AiIcons from 'react-icons/ai';
import * as BsIcons from 'react-icons/bs';
import * as BiIcons from 'react-icons/bi';
import * as MdIcons from 'react-icons/md';
import * as IoIcons from 'react-icons/io5';
import * as RiIcons from 'react-icons/ri';
import type { IconType } from 'react-icons';

const { Header, Content } = Layout;

// Types pour les sections modulaires
type SectionWithModules = {
  id: string;
  title: string;
  description?: string;
  iconName?: string;
  iconColor?: string;
  order?: number;
  active?: boolean;
  modules: Array<{
    key?: string;
    id?: string;
    route?: string;
    icon?: string;
    label?: string;
    name?: string;
    feature?: string;
    active?: boolean;
    isActiveForOrg?: boolean;
    order?: number;
  }>;
};

interface MainLayoutProps {
  children: React.ReactNode;
  sectionsWithModules?: SectionWithModules[];
  hasFeature?: (feature: string) => boolean;
  isSuperAdmin?: boolean;
}

// Helpers pour les icônes des modules
const renderIcon = (iconName: string | undefined, fallback: string = '') => {
  if (!iconName) return fallback;
  const iconLibraries = { fa: FaIcons, ai: AiIcons, bs: BsIcons, bi: BiIcons, md: MdIcons, io: IoIcons, ri: RiIcons } as const;
  for (const libKey in iconLibraries) {
    const lib = iconLibraries[libKey as keyof typeof iconLibraries];
    const IconComponent = lib[iconName as keyof typeof lib] as IconType | undefined;
    if (IconComponent) return <IconComponent className="text-lg mr-2" />;
  }
  return iconName || fallback;
};

// Mapping des routes modules
const MODULE_ROUTES: Record<string, string> = {
  google_gmail: '/google-gmail',
  analytics: '/analytics',
  Facture: '/facture',
  leads: '/leads',
  google_groups: '/google-groups',
  google_maps: '/google-maps',
  google_meet: '/google-meet',
  gemini: '/gemini',
  dashboard: '/dashboard',
  Technique: '/technique',
  telnyx_communications: '/telnyx-communications',
  mail: '/mail',
  gestion_sav: '/gestion_sav',
  Agenda: '/agenda',
  google_contacts: '/google-contacts',
  clients: '/clients',
  google_forms: '/google-forms',
  formulaire: '/formulaire',
  google_agenda: '/google-agenda',
  google_drive: '/google-drive',
};

const getModuleRoute = (mod: { key?: string; id?: string; route?: string; name?: string; label?: string }) => {
  if (mod.route) return mod.route;
  if (mod.key && MODULE_ROUTES[mod.key]) return MODULE_ROUTES[mod.key];
  const moduleKey = mod.name || mod.label;
  if (moduleKey && MODULE_ROUTES[moduleKey]) return MODULE_ROUTES[moduleKey];
  return `/${mod.id || mod.key || 'unknown'}`;
};

// Menu pour le hamburger
const hamburgerMenu = (
  <Menu>
    <Menu.Item key="dashboard">Tableau de bord</Menu.Item>
    <Menu.Item key="clients">Clients</Menu.Item>
    <Menu.Item key="leads">Prospects</Menu.Item>
    <Menu.Item key="devis">Devis</Menu.Item>
    <Menu.Item key="factures">Factures</Menu.Item>
  </Menu>
);

// Menu pour le profil utilisateur
const userProfileMenu = (
  <Menu>
    <Menu.Item key="profile">Mon Profil</Menu.Item>
    <Menu.Item key="settings">Paramètres</Menu.Item>
    <Menu.Divider />
    <Menu.Item key="logout" danger>Déconnexion</Menu.Item>
  </Menu>
);

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Layout className="min-h-screen">
      <Header 
        style={{ 
          backgroundColor: '#1a4951', 
          height: '48px',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          width: '100%'
        }}
      >
        {/* Menu Hamburger */}
        <Dropdown overlay={hamburgerMenu} trigger={['click']}>
          <Button 
            type="text" 
            icon={<MenuOutlined style={{ color: 'white', fontSize: '18px' }} />}
            style={{ 
              border: 'none', 
              padding: '8px',
              height: '40px',
              minWidth: '40px',
              marginRight: '16px'
            }}
          />
        </Dropdown>
        
        {/* Logo 2THIER CRM */}
        <div style={{ 
          color: 'white', 
          fontSize: '20px', 
          fontWeight: 'bold',
          letterSpacing: '0.5px',
          marginRight: '40px'
        }}>
          2THIER CRM
        </div>
        
        {/* Icône Maison */}
        <Button 
          type="text" 
          icon={<HomeOutlined style={{ color: 'white', fontSize: '18px' }} />}
          style={{ 
            border: 'none',
            padding: '8px',
            height: '40px',
            minWidth: '40px',
            marginRight: '12px'
          }}
        />
        
        {/* Barre de recherche */}
        <Input
          placeholder="Search"
          prefix={<SearchOutlined style={{ color: '#999', fontSize: '14px' }} />}
          style={{ 
            width: '280px',
            height: '32px',
            borderRadius: '4px',
            border: '1px solid #d9d9d9',
            fontSize: '14px',
            marginRight: 'auto'
          }}
        />
        
        {/* Groupe d'icônes à droite */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '20px' }}>
          {/* Favoris */}
          <Button 
            type="text" 
            icon={<StarOutlined style={{ color: 'white', fontSize: '16px' }} />}
            style={{ 
              border: 'none',
              padding: '8px',
              height: '40px',
              minWidth: '40px'
            }}
          />
          
          {/* Drapeau */}
          <Button 
            type="text" 
            icon={<FlagOutlined style={{ color: 'white', fontSize: '16px' }} />}
            style={{ 
              border: 'none',
              padding: '8px',
              height: '40px',
              minWidth: '40px'
            }}
          />
          
          {/* Notifications avec Badge */}
          <div style={{ position: 'relative' }}>
            <Button 
              type="text" 
              icon={<BellOutlined style={{ color: 'white', fontSize: '16px' }} />}
              style={{ 
                border: 'none',
                padding: '8px',
                height: '40px',
                minWidth: '40px'
              }}
            />
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              backgroundColor: '#ff4d4f',
              color: 'white',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: 'bold'
            }}>
              3
            </div>
          </div>
          
          {/* Aide */}
          <Button 
            type="text" 
            icon={<QuestionCircleOutlined style={{ color: 'white', fontSize: '16px' }} />}
            style={{ 
              border: 'none',
              padding: '8px',
              height: '40px',
              minWidth: '40px'
            }}
          />
          
          {/* Profil Utilisateur */}
          <Dropdown overlay={userProfileMenu} trigger={['click']}>
            <Button 
              type="text" 
              style={{ 
                border: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                height: '40px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                marginLeft: '8px'
              }}
            >
              <span>VP FINANCE (Casey Bro...)</span>
              <DownOutlined style={{ fontSize: '10px' }} />
            </Button>
          </Dropdown>
        </div>
      </Header>
      
      <Content style={{ 
        backgroundColor: '#004445',
        minHeight: 'calc(100vh - 48px)',
        padding: '20px'
      }}>
        {children}
      </Content>
    </Layout>
  );
};

export default MainLayout;
