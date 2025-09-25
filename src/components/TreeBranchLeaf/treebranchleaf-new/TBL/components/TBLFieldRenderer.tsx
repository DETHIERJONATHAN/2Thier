import React, { useState, useEffect, useMemo } from 'react';
import { 
  Input, 
  InputNumber, 
  Select, 
  Checkbox, 
  DatePicker, 
  Form, 
  Row, 
  Col,
  Typography,
  Tooltip,
  Card
} from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import type { TBLField } from '../hooks/useTBLData';
import type { TBLFormData } from '../hooks/useTBLSave';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Text } = Typography;

interface TBLFieldRendererProps {
  field: TBLField;
  value?: string | number | boolean | string[];
  onChange: (fieldId: string, value: string | number | boolean | string[] | null | undefined) => void;
  formData: TBLFormData;
  disabled?: boolean;
}

export const TBLFieldRenderer: React.FC<TBLFieldRendererProps> = ({
  field,
  value,
  onChange,
  disabled = false
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Mettre à jour la valeur locale quand la prop change
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Gérer le changement de valeur
  const handleChange = (newValue: string | number | boolean | string[] | null | undefined) => {
    setLocalValue(newValue);
    onChange(field.id, newValue);
    
    console.log('📝 [FIELD][CHANGE]', { 
      fieldId: field.id, 
      fieldLabel: field.label, 
      newValue
    });
    
    // Mettre à jour automatiquement les miroirs pour ce champ
    
    // 1. Miroir par ID
    const mirrorKeyById = `__mirror_data_${field.id}`;
    onChange(mirrorKeyById, newValue);
    
    // 2. Miroir par label et ses variantes
    if (field.label) {
      const mirrorKeyByLabel = `__mirror_data_${field.label}`;
      onChange(mirrorKeyByLabel, newValue);
      
      console.log('🔄 [MIRROR][SYNC]', { 
        mirrorKeyByLabel, 
        value: newValue,
        fieldLabel: field.label 
      });
      
      // 3. Mettre à jour toutes les variantes du label dans window.TBL_FORM_DATA
      if (typeof window !== 'undefined' && window.TBL_FORM_DATA) {
        // Chercher toutes les clés qui correspondent à des variantes de ce champ
        Object.keys(window.TBL_FORM_DATA).forEach(key => {
          if (key.startsWith('__mirror_data_') && 
              (key.includes(field.label.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()) ||
               key.includes(field.label) ||
               key === mirrorKeyByLabel)) {
            window.TBL_FORM_DATA[key] = newValue;
            console.log('🔄 [MIRROR][SYNC]', { key, value: newValue, fieldLabel: field.label });
          }
        });
      }
    }
  };

  // Vérifier les conditions d'affichage
  const isVisible = useMemo(() => {
    if (!field.conditions || field.conditions.length === 0) {
      return true;
    }
    // Pour l'instant, on affiche tous les champs
    return true;
  }, [field.conditions]);

  // Calculer la valeur si des formules sont définies
  const calculatedValue = useMemo(() => {
    if (!field.formulas || field.formulas.length === 0) {
      return localValue;
    }
    // Pour l'instant, on retourne la valeur locale
    return localValue;
  }, [field.formulas, localValue]);

  // Ne pas afficher le champ si les conditions ne sont pas remplies
  if (!isVisible) {
    return null;
  }

  // Label avec tooltip optionnel
  const renderLabel = () => (
    <div className="flex items-center gap-1 mb-2">
      <Text strong className={field.required ? 'text-red-500' : ''}>
        {field.label}
        {field.required && ' *'}
      </Text>
      {field.description && (
        <Tooltip title={field.description}>
          <QuestionCircleOutlined className="text-gray-400" />
        </Tooltip>
      )}
    </div>
  );

  // Rendu selon le type de champ
  const renderField = () => {
    const commonProps = {
      disabled,
      placeholder: field.config.placeholder,
      value: calculatedValue
,
    };

    switch (field.type) {
      case 'text':
        return (
          <Input
            {...commonProps}
            onChange={(e) => handleChange(e.target.value)}
            maxLength={field.config.max}
          />
        );

      case 'textarea':
        return (
          <TextArea
            {...commonProps}
            onChange={(e) => handleChange(e.target.value)}
            rows={4}
            maxLength={field.config.max}
            showCount
          />
        );

      case 'number':
        return (
          <InputNumber
            {...commonProps}
            onChange={handleChange}
            min={field.config.min}
            max={field.config.max}
            step={field.config.step || 1}
            style={{ width: '100%' }}
            formatter={(val) => val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
            parser={(val) => val ? val.replace(/\$\s?|,+/g, '') : ''}
          />
        );

      case 'select':
        return (
          <Select
            {...commonProps}
            onChange={handleChange}
            options={field.config.options}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        );

      case 'checkbox':
        return (
          <Checkbox
            disabled={disabled}
            checked={Boolean(calculatedValue)}
            onChange={(e) => handleChange(e.target.checked)}
          >
            {field.config.placeholder || 'Activer'}
          </Checkbox>
        );

      case 'date':
        return (
          <DatePicker
            disabled={disabled}
            value={calculatedValue ? dayjs(calculatedValue as string) : null}
            onChange={(date) => handleChange(date ? date.toISOString() : null)}
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
          />
        );

      default:
        return (
          <Input
            {...commonProps}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
    }
  };

  return (
    <Form.Item
      className="mb-4"
      validateStatus={field.required && !calculatedValue ? 'error' : ''}
      help={field.required && !calculatedValue ? `${field.label} est requis` : ''}
    >
      {renderLabel()}
      {renderField()}
    </Form.Item>
  );
};

interface TBLTabContentProps {
  fields: TBLField[];
  formData: TBLFormData;
  onChange: (fieldId: string, value: string | number | boolean | string[] | null | undefined) => void;
  disabled?: boolean;
}

export const TBLTabContent: React.FC<TBLTabContentProps> = ({
  fields,
  formData,
  onChange,
  disabled = false
}) => {
  // Organiser les champs par groupes (sous-branches si nécessaire)
  const fieldGroups = useMemo(() => {
    // Pour l'instant, on met tous les champs dans un seul groupe
    return [{ title: '', fields }];
  }, [fields]);

  // Calculer les statistiques de completion
  const completionStats = useMemo(() => {
    const requiredFields = fields.filter(f => f.required);
    const completedRequired = requiredFields.filter(f => {
      const value = formData[f.id];
      return value !== undefined && value !== null && value !== '';
    });
    const totalFields = fields.length;
    const completedFields = fields.filter(f => {
      const value = formData[f.id];
      return value !== undefined && value !== null && value !== '';
    });
    return {
      requiredCompletion: requiredFields.length ? (completedRequired.length / requiredFields.length) * 100 : 100,
      totalCompletion: totalFields ? (completedFields.length / totalFields) * 100 : 0,
      requiredCount: requiredFields.length,
      completedRequiredCount: completedRequired.length,
      totalCount: totalFields,
      completedTotalCount: completedFields.length
    };
  }, [fields, formData]);

  if (fields.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Typography.Text>Aucun champ configuré pour cet onglet</Typography.Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques de completion */}
      <Card size="small" className="bg-blue-50">
        <Row gutter={16}>
          <Col span={12}>
            <Text type="secondary">Champs requis :</Text>
            <Text strong className="ml-2">
              {completionStats.completedRequiredCount} / {completionStats.requiredCount}
            </Text>
            <Text type="secondary" className="ml-2">
              ({Math.round(completionStats.requiredCompletion)}%)
            </Text>
          </Col>
          <Col span={12}>
            <Text type="secondary">Total :</Text>
            <Text strong className="ml-2">
              {completionStats.completedTotalCount} / {completionStats.totalCount}
            </Text>
            <Text type="secondary" className="ml-2">
              ({Math.round(completionStats.totalCompletion)}%)
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Rendu des groupes de champs */}
      {fieldGroups.map((group, groupIndex) => (
        <div key={groupIndex}>
          {group.title && (
            <Typography.Title level={4} className="mb-4">
              {group.title}
            </Typography.Title>
          )}
          
          <Row gutter={[16, 0]}>
            {group.fields.map((field) => (
              <Col 
                key={field.id} 
                span={field.type === 'textarea' ? 24 : 12}
                className="mb-4"
              >
                <TBLFieldRenderer
                  field={field}
                  value={formData[field.id]}
                  onChange={onChange}
                  formData={formData}
                  disabled={disabled}
                />
              </Col>
            ))}
          </Row>
        </div>
      ))}
    </div>
  );
};
