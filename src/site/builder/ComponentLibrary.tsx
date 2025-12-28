import React, { useState } from 'react';
import { Card, Typography, Input, Tag, Space, Divider, Badge, Empty } from 'antd';
import { 
  SearchOutlined, 
  AppstoreOutlined,
  LayoutOutlined,
  FormOutlined,
  PictureOutlined,
  StarOutlined,
  TrophyOutlined,
  PhoneOutlined,
  TeamOutlined,
  DollarOutlined,
  QuestionCircleOutlined,
  GlobalOutlined,
  BlockOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { getAllSchemas, getSchemasByCategory } from '../schemas';
import type { SectionSchema } from '../schemas/types';

const { Title, Text } = Typography;
const { Search } = Input;

/**
 * 📚 BIBLIOTHÈQUE DE COMPOSANTS - LIT AUTOMATIQUEMENT LES SCHEMAS
 * 
 * Cette bibliothèque lit le registry des schemas et affiche tous les types
 * de sections disponibles. Pas de hardcoding : tout est dynamique !
 * 
 * Fonctionnalités :
 * - 🔍 Recherche par nom/description
 * - 🏷️ Filtrage par catégorie
 * - ✨ Badge "AI" pour les sections avec AI enabled
 * - 📊 Organisation par catégories
 * 
 * @author IA Assistant - Système auto-découverte des schemas
 */

interface ComponentLibraryProps {
  onSelectComponent: (sectionType: string, defaultContent: any) => void;
}

// 🎨 Mapping icônes par type de section
const ICON_MAP: Record<string, React.ReactNode> = {
  header: <LayoutOutlined />,
  hero: <StarOutlined />,
  services: <AppstoreOutlined />,
  stats: <TrophyOutlined />,
  testimonials: <TeamOutlined />,
  cta: <ThunderboltOutlined />,
  footer: <GlobalOutlined />,
  contact: <PhoneOutlined />,
  projects: <PictureOutlined />,
  pricing: <DollarOutlined />,
  team: <TeamOutlined />,
  faq: <QuestionCircleOutlined />,
  form: <FormOutlined />
};

// 🎨 Mapping couleurs par catégorie
const CATEGORY_COLORS: Record<string, string> = {
  layout: '#1890ff',
  content: '#52c41a',
  marketing: '#fa8c16',
  engagement: '#eb2f96',
  utility: '#722ed1'
};

export const ComponentLibrary: React.FC<ComponentLibraryProps> = ({ onSelectComponent }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 📦 Récupération de tous les schemas
  const allSchemas = getAllSchemas();

  // 🏷️ Extraction des catégories uniques
  const categories = Array.from(new Set(allSchemas.map(s => s.category)));

  // 🔍 Filtrage par recherche et catégorie
  const filteredSchemas = allSchemas.filter(schema => {
    const matchesSearch = searchQuery === '' || 
      schema.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schema.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === null || schema.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  /**
   * 🎯 SÉLECTION D'UN COMPOSANT
   */
  const handleSelect = (schema: SectionSchema) => {
    console.log('📚 [ComponentLibrary] Sélection:', schema.type);
    
    // Passer le type et le contenu par défaut
    onSelectComponent(schema.type, schema.defaults);
  };

  return (
    <div style={{ 
      padding: '20px',
      height: '100%',
      overflow: 'auto'
    }}>
      {/* 🔍 HEADER */}
      <div style={{ marginBottom: '20px' }}>
        <Title level={4} style={{ marginBottom: '8px' }}>
          <BlockOutlined /> Composants
        </Title>
        <Text type="secondary" style={{ fontSize: '13px' }}>
          {allSchemas.length} composants disponibles
        </Text>
      </div>

      {/* 🔍 BARRE DE RECHERCHE */}
      <Search
        placeholder="Rechercher un composant..."
        prefix={<SearchOutlined />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        allowClear
        style={{ marginBottom: '16px' }}
      />

      {/* 🏷️ FILTRES PAR CATÉGORIE */}
      <div style={{ marginBottom: '20px' }}>
        <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>
          CATÉGORIES
        </Text>
        <Space wrap>
          <Tag
            color={selectedCategory === null ? 'blue' : 'default'}
            onClick={() => setSelectedCategory(null)}
            style={{ cursor: 'pointer' }}
          >
            Toutes ({allSchemas.length})
          </Tag>
          {categories.map(cat => {
            const count = getSchemasByCategory(cat).length;
            return (
              <Tag
                key={cat}
                color={selectedCategory === cat ? CATEGORY_COLORS[cat] || 'blue' : 'default'}
                onClick={() => setSelectedCategory(cat)}
                style={{ cursor: 'pointer' }}
              >
                {cat} ({count})
              </Tag>
            );
          })}
        </Space>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* 📋 LISTE DES COMPOSANTS */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px' 
      }}>
        {filteredSchemas.length === 0 ? (
          <Empty
            description="Aucun composant trouvé"
            style={{ marginTop: '40px' }}
          />
        ) : (
          filteredSchemas.map(schema => (
            <Card
              key={schema.type}
              hoverable
              onClick={() => handleSelect(schema)}
              style={{
                borderRadius: '8px',
                border: '2px solid #f0f0f0',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              bodyStyle={{ padding: '16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {/* Icône */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: CATEGORY_COLORS[schema.category] || '#1890ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '20px',
                  flexShrink: 0
                }}>
                  {ICON_MAP[schema.type] || <BlockOutlined />}
                </div>

                {/* Contenu */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    marginBottom: '4px'
                  }}>
                    <Text strong style={{ fontSize: '14px' }}>
                      {schema.name}
                    </Text>
                    {schema.aiEnabled && (
                      <Badge
                        count="✨ AI"
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          fontSize: '10px',
                          height: '18px',
                          lineHeight: '18px'
                        }}
                      />
                    )}
                  </div>
                  
                  <Text 
                    type="secondary" 
                    style={{ 
                      fontSize: '12px',
                      display: 'block',
                      marginBottom: '8px',
                      lineHeight: '1.4'
                    }}
                  >
                    {schema.description}
                  </Text>

                  <Tag 
                    color={CATEGORY_COLORS[schema.category] || 'default'}
                    style={{ fontSize: '11px' }}
                  >
                    {schema.category}
                  </Tag>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 📊 STATISTIQUES EN BAS */}
      {filteredSchemas.length > 0 && (
        <>
          <Divider style={{ margin: '20px 0' }} />
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              💡 Cliquez sur un composant pour l'ajouter à votre site
            </Text>
          </div>
        </>
      )}
    </div>
  );
};
