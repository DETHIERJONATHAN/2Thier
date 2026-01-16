/**
 * 📋 SIMULATOR FORM SELECTOR
 * 
 * Composant pour sélectionner un formulaire de type simulateur (questions pleine page)
 * à ouvrir depuis un bouton du site vitrine.
 * 
 * @module SimulatorFormSelector
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Select, Space, Typography, message, Tag, Spin, Empty, Button } from 'antd';
import { FormOutlined, ReloadOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';

const { Text } = Typography;

interface SimulatorForm {
  id: number;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  _count?: {
    questions: number;
    submissions: number;
  };
}

interface SimulatorFormSelectorProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  websiteId?: number;
}

const SimulatorFormSelector: React.FC<SimulatorFormSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Sélectionnez un formulaire/simulateur',
  websiteId
}) => {
  const { api } = useAuthenticatedApi();
  const stableApi = useMemo(() => api, [api]);

  const [forms, setForms] = useState<SimulatorForm[]>([]);
  const [loading, setLoading] = useState(false);

  // Charger les formulaires
  const loadForms = useCallback(async () => {
    try {
      setLoading(true);
      
      // Récupérer tous les formulaires ou ceux du site spécifique
      const endpoint = websiteId 
        ? `/api/website-forms/by-website/${websiteId}`
        : '/api/website-forms';
      
      const response = await stableApi.get<SimulatorForm[]>(endpoint, { showErrors: false });
      
      const list = Array.isArray(response) ? response : [];
      
      // Filtrer pour ne garder que les formulaires actifs avec des questions
      const validForms = list.filter(f => f.isActive && (f._count?.questions || 0) > 0);
      
      setForms(validForms.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('[SimulatorFormSelector] Erreur chargement:', error);
      message.error('Impossible de charger les formulaires');
    } finally {
      setLoading(false);
    }
  }, [stableApi, websiteId]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const handleChange = useCallback((newValue: string | undefined) => {
    onChange?.(newValue);
  }, [onChange]);

  // Construire l'URL du simulateur à partir du slug
  const getSimulatorUrl = (slug: string) => `/simulateur/${slug}`;

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Select
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          loading={loading}
          allowClear
          style={{ flex: 1, minWidth: 300 }}
          notFoundContent={
            loading ? (
              <Spin size="small" />
            ) : (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description="Aucun formulaire disponible"
              >
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Créez un formulaire dans l'onglet "Formulaires de capture"
                </Text>
              </Empty>
            )
          }
          optionLabelProp="label"
        >
          {forms.map(form => (
            <Select.Option 
              key={form.slug} 
              value={form.slug}
              label={form.name}
            >
              <Space>
                <QuestionCircleOutlined style={{ color: '#722ed1' }} />
                <span style={{ fontWeight: 500 }}>{form.name}</span>
                {form._count?.questions && (
                  <Tag color="purple" style={{ fontSize: '10px' }}>
                    {form._count.questions} questions
                  </Tag>
                )}
                {form._count?.submissions && form._count.submissions > 0 && (
                  <Tag color="blue" style={{ fontSize: '10px' }}>
                    {form._count.submissions} soumissions
                  </Tag>
                )}
              </Space>
            </Select.Option>
          ))}
        </Select>
        
        <Button 
          icon={<ReloadOutlined />} 
          onClick={loadForms}
          loading={loading}
          title="Rafraîchir la liste"
        />
      </Space>

      {value && (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          <FormOutlined style={{ marginRight: 4 }} />
          URL: <Text code copyable style={{ fontSize: '11px' }}>{getSimulatorUrl(value)}</Text>
        </Text>
      )}
    </Space>
  );
};

export default SimulatorFormSelector;
