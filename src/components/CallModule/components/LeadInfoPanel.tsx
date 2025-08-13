/**
 * 👤 LeadInfoPanel - Panneau d'informations du prospect
 * 
 * Fonctionnalités :
 * - 📋 Affichage détaillé du profil prospect
 * - 🏢 Informations entreprise et contact
 * - 📊 Historique des interactions
 * - 🎯 Statut et source du lead
 */

import React, { useMemo } from 'react';
import { Card, Typography, Space, Tag, Avatar, Descriptions } from 'antd';
import { 
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  BankOutlined,
  IdcardOutlined
} from '@ant-design/icons';
import type { Lead } from '../types/CallTypes';

const { Title, Text } = Typography;

interface LeadInfoPanelProps {
  lead: Lead | null;
  callInProgress: boolean;
  className?: string;
}

export const LeadInfoPanel: React.FC<LeadInfoPanelProps> = ({
  lead,
  callInProgress,
  className
}) => {
  
  // 🎨 Couleur du statut
  const statusColor = useMemo(() => {
    if (!lead?.status) return 'default';
    
    switch (lead.status) {
      case 'new': return 'blue';
      case 'contacted': return 'orange';
      case 'qualified': return 'green';
      case 'converted': return 'success';
      case 'rejected': return 'red';
      default: return 'default';
    }
  }, [lead?.status]);

  // 📊 Formatage des données
  const leadInfo = useMemo(() => {
    if (!lead?.data) return null;

    // 🧪 Formatage robuste de l'adresse (gère string | objet | array)
    type AddressObject = {
      street?: string;
      city?: string;
      zipCode?: string;
      postalCode?: string;
      state?: string;
      country?: string;
      [key: string]: unknown;
    };

    const formatAddress = (value: unknown): string => {
      if (!value) return 'Adresse non renseignée';
      if (typeof value === 'string') return value.trim() || 'Adresse non renseignée';
      if (Array.isArray(value)) {
        const joined = value.filter(Boolean).join(', ').trim();
        return joined || 'Adresse non renseignée';
      }
      if (typeof value === 'object') {
        const { street, city, zipCode, postalCode, state, country } = value as AddressObject;
        const parts = [street, city, zipCode || postalCode, state, country].filter(Boolean);
        const joined = parts.join(', ').trim();
        return joined || 'Adresse non renseignée';
      }
      // fallback
      try {
        return String(value);
      } catch {
        return 'Adresse non renseignée';
      }
    };

    const address = formatAddress(lead.data.address ?? lead.data.city);

    return {
      name: lead.data.name || 'Nom non renseigné',
      email: lead.data.email || 'Email non renseigné',
      phone: lead.data.phone || 'Téléphone non renseigné',
      company: lead.data.company || 'Entreprise non renseignée',
      title: lead.data.title || 'Poste non renseigné',
      address,
      source: lead.source || 'Source inconnue',
      industry: lead.data.industry || 'Secteur non précisé'
    };
  }, [lead]);

  if (!lead || !leadInfo) {
    return (
      <Card 
        title="👤 Informations du Lead"
        className={className}
      >
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Text type="secondary">Aucune information disponible</Text>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <span>Informations du Lead</span>
          {callInProgress && (
            <Tag color="processing">En appel</Tag>
          )}
        </Space>
      }
      className={className}
    >
      
      {/* 👤 En-tête avec avatar */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Avatar 
          size={64} 
          icon={<UserOutlined />}
          style={{ backgroundColor: '#1890ff' }}
        />
        <div style={{ marginTop: 12 }}>
          <Title level={4} style={{ margin: 0 }}>
            {leadInfo.name}
          </Title>
          <Text type="secondary">
            {leadInfo.title}
          </Text>
        </div>
        
        <div style={{ marginTop: 12 }}>
          <Tag color={statusColor} size="small">
            {lead.status?.toUpperCase() || 'NOUVEAU'}
          </Tag>
          <Tag color="blue" size="small">
            {leadInfo.source.toUpperCase()}
          </Tag>
        </div>
      </div>

      {/* 📋 Informations détaillées */}
      <Descriptions column={1} size="small" bordered>
        
        <Descriptions.Item 
          label={
            <Space>
              <PhoneOutlined style={{ color: '#52c41a' }} />
              <span>Téléphone</span>
            </Space>
          }
        >
          <Text copyable={!!leadInfo.phone && leadInfo.phone !== 'Téléphone non renseigné'}>
            {leadInfo.phone}
          </Text>
        </Descriptions.Item>

        <Descriptions.Item 
          label={
            <Space>
              <MailOutlined style={{ color: '#fa8c16' }} />
              <span>Email</span>
            </Space>
          }
        >
          <Text copyable={!!leadInfo.email && leadInfo.email !== 'Email non renseigné'}>
            {leadInfo.email}
          </Text>
        </Descriptions.Item>

        <Descriptions.Item 
          label={
            <Space>
              <BankOutlined style={{ color: '#722ed1' }} />
              <span>Entreprise</span>
            </Space>
          }
        >
          {leadInfo.company}
        </Descriptions.Item>

        <Descriptions.Item 
          label={
            <Space>
              <IdcardOutlined style={{ color: '#13c2c2' }} />
              <span>Secteur</span>
            </Space>
          }
        >
          {leadInfo.industry}
        </Descriptions.Item>

        <Descriptions.Item 
          label={
            <Space>
              <EnvironmentOutlined style={{ color: '#eb2f96' }} />
              <span>Localisation</span>
            </Space>
          }
        >
          {leadInfo.address}
        </Descriptions.Item>

      </Descriptions>

      {/* 📊 Métadonnées */}
      <div style={{ 
        marginTop: 16, 
        padding: 12, 
        backgroundColor: '#fafafa', 
        borderRadius: 6,
        fontSize: 12
      }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">ID Lead:</Text>
            <Text code>{lead.id}</Text>
          </div>
          
          {lead.createdAt && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">Créé le:</Text>
              <Text type="secondary">
                {new Date(lead.createdAt).toLocaleDateString('fr-FR')}
              </Text>
            </div>
          )}
          
          {lead.updatedAt && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">Mis à jour:</Text>
              <Text type="secondary">
                {new Date(lead.updatedAt).toLocaleDateString('fr-FR')}
              </Text>
            </div>
          )}
        </Space>
      </div>

    </Card>
  );
};

export default LeadInfoPanel;
