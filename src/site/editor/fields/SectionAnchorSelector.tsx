/**
 * 🔗 SECTION ANCHOR SELECTOR
 * 
 * Composant qui génère dynamiquement un dropdown des sections disponibles
 * sur une page pour créer des liens d'ancrage (#services, #hero, etc.).
 * 
 * FONCTIONNALITÉS :
 * - Charge les sections réelles de la page actuelle
 * - Génère automatiquement les ancres depuis section.key
 * - Permet de taper une ancre personnalisée (mode tags)
 * - Affiche des icônes par type de section
 * 
 * USAGE DANS UN SCHEMA :
 * ```typescript
 * {
 *   id: 'sectionAnchor',
 *   type: 'section-anchor-selector',
 *   label: 'Section à atteindre',
 *   options: {
 *     placeholder: 'Sélectionnez une section...',
 *     allowCustom: true
 *   }
 * }
 * ```
 * 
 * @module site/editor/fields/SectionAnchorSelector
 * @author 2Thier CRM Team
 */

import { SF } from '../../../components/zhiive/ZhiiveTheme';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Select, Typography, Spin, Space, Tag } from 'antd';
import { 
  ReloadOutlined, 
  LinkOutlined,
  RocketOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  CommentOutlined,
  PhoneOutlined,
  MenuOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';

const { Option } = Select;

interface Section {
  id: number;
  websiteId: number;
  key: string;
  type: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

interface SectionAnchorSelectorProps {
  value?: string | string[];
  onChange?: (value: string[] | undefined) => void;
  placeholder?: string;
  allowCustom?: boolean;
  websiteId?: number;
}

/**
 * 🎨 Icônes par type de section
 */
const getSectionIcon = (type: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    header: <MenuOutlined style={{ color: '#10b981' }} />,
    hero: <RocketOutlined style={{ color: SF.blue }} />,
    services: <AppstoreOutlined style={{ color: SF.amber }} />,
    stats: <BarChartOutlined style={{ color: SF.violet }} />,
    testimonials: <CommentOutlined style={{ color: '#ec4899' }} />,
    cta: <PhoneOutlined style={{ color: SF.red }} />,
    footer: <MenuOutlined style={{ color: '#6b7280' }} />,
    values: <AppstoreOutlined style={{ color: '#14b8a6' }} />,
    process: <BarChartOutlined style={{ color: '#06b6d4' }} />,
    projects: <AppstoreOutlined style={{ color: '#a855f7' }} />
  };
  
  return iconMap[type] || <LinkOutlined style={{ color: '#94a3b8' }} />;
};

/**
 * 🎯 Composant Principal
 */
const SectionAnchorSelector: React.FC<SectionAnchorSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Sélectionnez une section...',
  allowCustom = true,
  websiteId
}) => {
  const { api } = useAuthenticatedApi();
  const stableApi = useMemo(() => api, [api]);

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔍 DEBUG: Log complet à chaque rendu
  useEffect(() => {
    console.log('🔍 [SectionAnchorSelector] RENDU:');
    console.log('  - websiteId prop:', websiteId);
    console.log('  - typeof websiteId:', typeof websiteId);
    console.log('  - !!websiteId:', !!websiteId);
    console.log('  - value:', value);
    console.log('  - placeholder:', placeholder);
    
    // Sauvegarder dans window pour inspection
    (window as any).lastSectionAnchorSelectorProps = {
      websiteId,
      value,
      placeholder,
      allowCustom
    };
  }, [websiteId, value, placeholder, allowCustom]);

  // Normaliser la valeur (gérer string ou array)
  const normalizedValue = useMemo(() => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value[0];
    return value;
  }, [value]);

  /**
   * 📡 Charger les sections de la page
   */
  const fetchSections = useCallback(async () => {
    if (!websiteId) {
      console.warn('⚠️ [SectionAnchorSelector] Pas de websiteId fourni');
      return;
    }

    setLoading(true);
    try {
      console.log('📡 [SectionAnchorSelector] Chargement sections pour websiteId:', websiteId);
      const response = await stableApi.get(`/api/website-sections/${websiteId}`);
      
      // Filtrer seulement les sections actives et les trier
      const activeSections = response
        .filter((s: Section) => s.isActive)
        .sort((a: Section, b: Section) => a.displayOrder - b.displayOrder);
      
      console.log('✅ [SectionAnchorSelector] Sections chargées:', activeSections.length);
      setSections(activeSections);
    } catch (error) {
      console.error('❌ [SectionAnchorSelector] Erreur chargement sections:', error);
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [stableApi, websiteId]);

  /**
   * 🎬 Charger au montage
   */
  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  /**
   * 🔄 Callback onChange
   */
  const handleChange = useCallback(
    (newValue: string | string[] | null) => {
      if (!onChange) return;
      
      // Gérer les cas où newValue est null, undefined, ou vide
      if (!newValue || (Array.isArray(newValue) && newValue.length === 0)) {
        onChange(undefined);
        return;
      }
      
      // Extraire la valeur : si c'est un array, prendre le premier élément
      const rawValue = Array.isArray(newValue) ? newValue[0] : newValue;
      
      // Si la valeur est vide après extraction, retourner undefined
      if (!rawValue || rawValue.trim().length === 0) {
        onChange(undefined);
        return;
      }
      
      // Toujours s'assurer que l'ancre commence par #
      let anchor = rawValue.trim();
      if (!anchor.startsWith('#')) {
        anchor = `#${anchor}`;
      }
      
      onChange([anchor]);
    },
    [onChange]
  );

  /**
   * 🎨 Générer les options depuis les sections
   */
  const sectionOptions = useMemo(() => {
    return sections.map((section) => ({
      value: `#${section.key}`,
      label: section.name,
      type: section.type,
      order: section.displayOrder
    }));
  }, [sections]);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Select
        value={normalizedValue}
        onChange={handleChange}
        placeholder={placeholder}
        loading={loading}
        style={{ width: '100%' }}
        showSearch
        filterOption={(input, option) =>
          (option?.label?.toString().toLowerCase() || '').includes(input.toLowerCase()) ||
          (option?.value?.toString().toLowerCase() || '').includes(input.toLowerCase())
        }
        mode={allowCustom ? 'tags' : undefined}
        maxTagCount={1}
        allowClear
        suffixIcon={loading ? <Spin size="small" /> : <ReloadOutlined onClick={fetchSections} style={{ cursor: 'pointer' }} />}
      >
        {sectionOptions.map((option) => (
          <Option key={option.value} value={option.value} label={option.label}>
            <Space>
              {getSectionIcon(option.type)}
              <span>
                <strong>{option.label}</strong>
                <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                  {option.value}
                </Typography.Text>
              </span>
            </Space>
          </Option>
        ))}
      </Select>

      {normalizedValue && (
        <Typography.Text type="secondary">
          <LinkOutlined /> Lien d'ancrage : <Tag>{normalizedValue}</Tag>
        </Typography.Text>
      )}

      {sections.length === 0 && !loading && (
        <Typography.Text type="warning" style={{ fontSize: 12 }}>
          ⚠️ Aucune section trouvée sur cette page. Ajoutez des sections d'abord.
        </Typography.Text>
      )}
    </Space>
  );
};

export default SectionAnchorSelector;
