import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { 
  Input, 
  InputNumber, 
  Select, 
  Switch, 
  DatePicker, 
  Upload, 
  Button, 
  Tooltip, 
  Tag,
  Space,
  Alert,
  Card
} from 'antd';
import { 
  InfoCircleOutlined, 
  UploadOutlined, 
  CalculatorOutlined,
  EyeOutlined,
  EditOutlined
} from '@ant-design/icons';
import type { Field } from './useDevisLogic';
import { TableauConfigEditor } from './TableauConfigEditor';

const { Option } = Select;
const { TextArea } = Input;

interface DevisFieldProps {
  field: Field;
  value?: unknown;
  onChange: (value: unknown) => void;
  error?: string | null;
  warning?: string | null;
  fieldState?: {
    updated?: boolean;
    calculating?: boolean;
    readOnly?: boolean;
  };
}

export const DevisField: React.FC<DevisFieldProps> = ({
  field,
  value,
  onChange,
  error,
  warning,
  fieldState = {}
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

  // Synchronisation avec la valeur externe
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Configuration avancée
  const config = field.advancedConfig || {};
  const uiConfig = config.ui || {};
  const validation = config.validation || {};

  // Gestion du changement de valeur
  const handleChange = useCallback((newValue: unknown) => {
    setInternalValue(newValue);
    onChange(newValue);
  }, [onChange]);

  // Calcul du style dynamique
  const dynamicStyle = useMemo(() => {
    let style: React.CSSProperties = {};
    
    if (config.color) {
      style.backgroundColor = config.color;
    }
    
    if (config.textColor) {
      style.color = config.textColor;
    }
    
    if (fieldState.updated && uiConfig.animateUpdate) {
      style.transition = 'all 0.3s ease';
      style.boxShadow = '0 0 5px rgba(24, 144, 255, 0.5)';
    }
    
    return style;
  }, [config.color, config.textColor, fieldState.updated, uiConfig.animateUpdate]);

  // Rendu des différents types de champs
  const renderField = () => {
    const isReadOnly = fieldState.readOnly || uiConfig.readOnly || false;
    const commonProps = {
      style: dynamicStyle,
      disabled: isReadOnly,
      placeholder: uiConfig.placeholder || `Saisir ${field.label.toLowerCase()}`,
    };

    switch (field.type) {
      case 'text':
        return (
          <Input
            {...commonProps}
            value={internalValue as string}
            onChange={(e) => handleChange(e.target.value)}
          />
        );

      case 'textarea':
        return (
          <TextArea
            {...commonProps}
            value={internalValue as string}
            onChange={(e) => handleChange(e.target.value)}
            rows={4}
          />
        );

      case 'number':
        return (
          <InputNumber
            {...commonProps}
            value={internalValue as number}
            onChange={handleChange}
            min={config.min}
            max={config.max}
            step={config.step}
            precision={config.decimalPlaces}
            addonAfter={uiConfig.unit}
            style={{ width: '100%', ...dynamicStyle }}
          />
        );

      case 'select':
        return (
          <Select
            {...commonProps}
            value={internalValue as string}
            onChange={handleChange}
            style={{ width: '100%', ...dynamicStyle }}
          >
            {field.FieldOption?.map((option) => (
              <Option key={option.id} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );

      case 'advanced_select':
        return (
          <Select
            {...commonProps}
            value={internalValue as string}
            onChange={handleChange}
            style={{ width: '100%', ...dynamicStyle }}
            mode="multiple"
            allowClear
            showSearch
          >
            {field.FieldOption?.map((option) => (
              <Option key={option.id} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );

      case 'switch':
        return (
          <Switch
            checked={internalValue as boolean}
            onChange={handleChange}
            disabled={isReadOnly}
          />
        );

      case 'date':
        return (
          <DatePicker
            {...commonProps}
            value={internalValue as any}
            onChange={handleChange}
            style={{ width: '100%', ...dynamicStyle }}
          />
        );

      case 'image_user':
        return (
          <Upload
            listType="picture-card"
            onChange={(info) => handleChange(info.fileList)}
            disabled={isReadOnly}
          >
            <div>
              <UploadOutlined />
              <div style={{ marginTop: 8 }}>Upload</div>
            </div>
          </Upload>
        );

      case 'donnee':
        const displayValue = useMemo(() => {
          if (config.displayFormat === 'currency') {
            return new Intl.NumberFormat('fr-FR', { 
              style: 'currency', 
              currency: 'EUR' 
            }).format(internalValue as number || 0);
          }
          if (config.displayFormat === 'percentage') {
            return `${(internalValue as number || 0)}%`;
          }
          if (config.decimalPlaces !== undefined) {
            return (internalValue as number || 0).toFixed(config.decimalPlaces);
          }
          return String(internalValue || '0');
        }, [internalValue, config.displayFormat, config.decimalPlaces]);

        return (
          <div className="donnee-field" style={dynamicStyle}>
            <div className="donnee-value">
              {displayValue}
              {uiConfig.unit && <span className="unit">{uiConfig.unit}</span>}
            </div>
            {fieldState.calculating && (
              <div className="calculating-indicator">
                <CalculatorOutlined spin /> Calcul...
              </div>
            )}
            {uiConfig.showCalculationSteps && config.dependencies && (
              <div className="calculation-steps">
                <small>
                  Calculé à partir de: {config.dependencies.join(', ')}
                </small>
              </div>
            )}
          </div>
        );

      case 'tableau':
        return (
          <Card>
            <div className="tableau-field">
              <div className="tableau-header">
                <Space>
                  <span>Configuration du tableau</span>
                  <Button
                    size="small"
                    icon={showAdvancedConfig ? <EyeOutlined /> : <EditOutlined />}
                    onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                  >
                    {showAdvancedConfig ? 'Aperçu' : 'Configurer'}
                  </Button>
                </Space>
              </div>
              
              {showAdvancedConfig ? (
                <TableauConfigEditor
                  value={internalValue as any}
                  onChange={handleChange}
                  config={config.tableau}
                />
              ) : (
                <div className="tableau-preview">
                  <p>Tableau configuré avec {config.tableau?.columns?.length || 0} colonnes</p>
                  <p>{config.tableau?.templates?.length || 0} templates disponibles</p>
                </div>
              )}
            </div>
          </Card>
        );

      default:
        return (
          <Input
            {...commonProps}
            value={internalValue as string}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
    }
  };

  // Calcul de la classe CSS pour la largeur
  const getWidthClass = () => {
    switch (field.width) {
      case '1/4': return 'w-1/4';
      case '1/3': return 'w-1/3';
      case '1/2': return 'w-1/2';
      case '2/3': return 'w-2/3';
      case '3/4': return 'w-3/4';
      case 'full': return 'w-full';
      default: return 'w-full';
    }
  };

  return (
    <div className={`devis-field ${getWidthClass()}`}>
      <div className="field-container">
        {/* Label avec indicateurs */}
        <div className="field-label">
          <Space>
            <span className={field.required ? 'required' : ''}>
              {field.label}
            </span>
            
            {uiConfig.icon && <span className="field-icon">{uiConfig.icon}</span>}
            
            {config.reactive && (
              <Tag color="blue" size="small">Réactif</Tag>
            )}
            
            {config.dependencies && config.dependencies.length > 0 && (
              <Tooltip title={`Dépend de: ${config.dependencies.join(', ')}`}>
                <CalculatorOutlined className="dependency-icon" />
              </Tooltip>
            )}
            
            {fieldState.updated && uiConfig.highlightChanges && (
              <Tag color="green" size="small">Mis à jour</Tag>
            )}
          </Space>
          
          {uiConfig.helpText && (
            <Tooltip title={uiConfig.helpText}>
              <InfoCircleOutlined className="help-icon" />
            </Tooltip>
          )}
        </div>

        {/* Champ de saisie */}
        <div className="field-input">
          {renderField()}
        </div>

        {/* Messages d'erreur et d'avertissement */}
        {error && (
          <Alert
            message={error}
            type="error"
            size="small"
            showIcon
            className="field-error"
          />
        )}
        
        {warning && (
          <Alert
            message={warning}
            type="warning"
            size="small"
            showIcon
            className="field-warning"
          />
        )}

        {/* Informations de validation */}
        {validation.businessRules && validation.businessRules.length > 0 && (
          <div className="validation-rules">
            <small className="text-gray-500">
              Règles: {validation.businessRules.join(', ')}
            </small>
          </div>
        )}
      </div>
    </div>
  );
};
