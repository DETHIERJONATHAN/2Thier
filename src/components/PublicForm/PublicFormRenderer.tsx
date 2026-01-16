/**
 * 📋 PUBLIC FORM RENDERER v2.0 - Formulaires Multi-Step Style Effy
 * 
 * Rendu des formulaires publics pour les visiteurs du site.
 * Design inspiré de Effy.fr avec :
 * - Progression visuelle par étapes
 * - Cartes cliquables avec icônes
 * - Animation fluide entre les étapes
 * - 🎯 Logique conditionnelle (sous-questions dynamiques)
 * - Responsive mobile-first
 * 
 * @module PublicFormRenderer
 * @author IA Assistant - Module Formulaires Effy v2
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Steps,
  Form,
  Input,
  Select,
  Radio,
  Checkbox,
  InputNumber,
  Progress,
  message,
  Spin,
  Result,
  Space,
  Typography,
  Row,
  Col
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  HomeOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// ==================== TYPES ====================
interface ConditionRule {
  field: string;      // nom du champ à vérifier
  operator: 'equals' | 'notEquals' | 'in' | 'notIn' | 'greaterThan' | 'lessThan' | 'contains' | 'exists';
  value: any;         // valeur à comparer
}

interface FieldCondition {
  showIf?: ConditionRule | ConditionRule[];
  hideIf?: ConditionRule | ConditionRule[];
  logic?: 'and' | 'or';  // Pour combiner plusieurs règles
}

interface CardOption {
  value: string;
  label: string;
  icon?: string;
  description?: string;
  image?: string;
}

interface SelectOption {
  value: string;
  label: string;
}

interface FormField {
  id: number;
  stepId: number;
  parentFieldId?: number | null;
  order: number;
  name: string;
  label: string;
  fieldType: string;  // card_select, text, number, email, phone, textarea, select, radio, checkbox, address
  icon?: string;
  imageUrl?: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  value?: string;
  options?: CardOption[] | SelectOption[];
  validation?: any;
  tblNodeId?: string;
  tblNodeLabel?: string;
  isRequired: boolean;
  isDefault?: boolean;
  allowMultiple?: boolean;
  condition?: FieldCondition;
  childFields?: FormField[];
}

interface FormStep {
  id: number;
  formId: number;
  order: number;
  title: string;
  description?: string;
  icon?: string;
  fields: FormField[];
}

interface WebsiteForm {
  id: number;
  name: string;
  slug: string;
  description?: string;
  submitButtonText: string;
  successMessage: string;
  isActive: boolean;
  steps: FormStep[];
}

// ==================== ÉVALUATION DES CONDITIONS ====================
const evaluateCondition = (rule: ConditionRule, values: Record<string, any>): boolean => {
  const fieldValue = values[rule.field];
  
  switch (rule.operator) {
    case 'equals':
      return fieldValue === rule.value;
    case 'notEquals':
      return fieldValue !== rule.value;
    case 'in':
      return Array.isArray(rule.value) && rule.value.includes(fieldValue);
    case 'notIn':
      return Array.isArray(rule.value) && !rule.value.includes(fieldValue);
    case 'greaterThan':
      return Number(fieldValue) > Number(rule.value);
    case 'lessThan':
      return Number(fieldValue) < Number(rule.value);
    case 'contains':
      return String(fieldValue || '').includes(String(rule.value));
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
    default:
      return true;
  }
};

const shouldShowField = (field: FormField, values: Record<string, any>): boolean => {
  if (!field.condition) return true;
  
  const { showIf, hideIf, logic = 'and' } = field.condition;
  
  // Évaluer showIf
  if (showIf) {
    const rules = Array.isArray(showIf) ? showIf : [showIf];
    const results = rules.map(rule => evaluateCondition(rule, values));
    const showResult = logic === 'and' ? results.every(Boolean) : results.some(Boolean);
    if (!showResult) return false;
  }
  
  // Évaluer hideIf
  if (hideIf) {
    const rules = Array.isArray(hideIf) ? hideIf : [hideIf];
    const results = rules.map(rule => evaluateCondition(rule, values));
    const hideResult = logic === 'and' ? results.every(Boolean) : results.some(Boolean);
    if (hideResult) return false;
  }
  
  return true;
};

// ==================== STYLES ====================
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  } as React.CSSProperties,
  
  formCard: {
    maxWidth: '900px',
    width: '100%',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden'
  } as React.CSSProperties,
  
  header: {
    background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
    padding: '32px 24px',
    color: 'white',
    textAlign: 'center' as const
  },
  
  progressBar: {
    padding: '16px 24px',
    background: '#f5f5f5',
    borderBottom: '1px solid #e8e8e8'
  } as React.CSSProperties,
  
  content: {
    padding: '32px 24px',
    minHeight: '400px'
  } as React.CSSProperties,
  
  stepTitle: {
    textAlign: 'center' as const,
    marginBottom: '32px'
  },
  
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  } as React.CSSProperties,
  
  optionCard: (selected: boolean) => ({
    cursor: 'pointer',
    borderRadius: '12px',
    border: selected ? '3px solid #1890ff' : '2px solid #e8e8e8',
    background: selected ? '#e6f7ff' : 'white',
    transition: 'all 0.2s ease',
    textAlign: 'center' as const,
    padding: '20px 16px',
    position: 'relative' as const,
    minHeight: '120px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center'
  }),
  
  optionIcon: {
    fontSize: '40px',
    marginBottom: '8px',
    display: 'block'
  } as React.CSSProperties,
  
  footer: {
    padding: '16px 24px',
    background: '#fafafa',
    borderTop: '1px solid #e8e8e8',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  } as React.CSSProperties,
  
  subQuestion: {
    marginTop: '16px',
    padding: '20px',
    background: '#f9f9f9',
    borderRadius: '12px',
    borderLeft: '4px solid #1890ff',
    animation: 'slideIn 0.3s ease'
  } as React.CSSProperties
};

// ==================== COMPOSANT PRINCIPAL ====================
const PublicFormRenderer: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  
  // États
  const [formData, setFormData] = useState<WebsiteForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chargement du formulaire
  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await fetch(`/api/public/forms/${slug}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Formulaire introuvable');
          } else {
            setError('Erreur lors du chargement');
          }
          return;
        }
        const data = await response.json();
        setFormData(data);
        
        // Initialiser les valeurs par défaut
        const defaults: Record<string, any> = {};
        data.steps.forEach((step: FormStep) => {
          step.fields.forEach((field: FormField) => {
            if (field.defaultValue) {
              defaults[field.name] = field.defaultValue;
            }
            // Aussi inclure les valeurs isDefault
            if (field.isDefault && field.value) {
              defaults[field.name] = field.value;
            }
          });
        });
        setValues(defaults);
      } catch (err) {
        console.error('Erreur chargement formulaire:', err);
        setError('Impossible de charger le formulaire');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchForm();
    }
  }, [slug]);

  // Gestion des valeurs avec useCallback pour stabilité
  const handleValueChange = useCallback((name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  // Organiser les champs en hiérarchie (parents avec childFields)
  const organizeFieldsHierarchy = useCallback((fields: FormField[]): FormField[] => {
    const fieldMap = new Map<number, FormField>();
    const rootFields: FormField[] = [];
    
    // D'abord, créer un map de tous les champs
    fields.forEach(field => {
      fieldMap.set(field.id, { ...field, childFields: [] });
    });
    
    // Ensuite, organiser en hiérarchie
    fields.forEach(field => {
      const enrichedField = fieldMap.get(field.id)!;
      if (field.parentFieldId) {
        const parent = fieldMap.get(field.parentFieldId);
        if (parent) {
          parent.childFields = parent.childFields || [];
          parent.childFields.push(enrichedField);
        } else {
          // Si parent pas trouvé, traiter comme root
          rootFields.push(enrichedField);
        }
      } else {
        rootFields.push(enrichedField);
      }
    });
    
    return rootFields.sort((a, b) => a.order - b.order);
  }, []);

  // Champs visibles de l'étape actuelle (avec logique conditionnelle)
  const visibleFields = useMemo(() => {
    if (!formData) return [];
    const currentStepData = formData.steps[currentStep];
    if (!currentStepData) return [];
    
    const hierarchicalFields = organizeFieldsHierarchy(currentStepData.fields);
    
    return hierarchicalFields.filter(field => shouldShowField(field, values));
  }, [formData, currentStep, values, organizeFieldsHierarchy]);

  // Validation de l'étape actuelle
  const validateCurrentStep = useCallback((): boolean => {
    const validateField = (field: FormField): boolean => {
      // Ne valider que les champs visibles
      if (!shouldShowField(field, values)) return true;
      
      if (field.isRequired && !values[field.name] && values[field.name] !== 0) {
        message.warning(`Veuillez remplir "${field.label}"`);
        return false;
      }
      
      // Valider aussi les sous-champs visibles
      if (field.childFields) {
        for (const child of field.childFields) {
          if (!validateField(child)) return false;
        }
      }
      
      return true;
    };
    
    for (const field of visibleFields) {
      if (!validateField(field)) return false;
    }
    return true;
  }, [visibleFields, values]);

  // Navigation entre étapes
  const handleNext = async () => {
    if (!validateCurrentStep()) return;

    if (currentStep < (formData?.steps.length || 0) - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Soumission du formulaire
  const handleSubmit = async () => {
    if (!formData) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/public/forms/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: formData.id,
          data: values
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la soumission');
      }

      setSubmitted(true);
      message.success('Formulaire envoyé avec succès !');
    } catch (err) {
      console.error('Erreur soumission:', err);
      message.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== RENDU DES CHAMPS ====================
  const renderField = (field: FormField, isSubQuestion: boolean = false): React.ReactNode => {
    // Vérifier si le champ doit être affiché
    if (!shouldShowField(field, values)) {
      return null;
    }
    
    const value = values[field.name];
    const containerStyle = isSubQuestion ? styles.subQuestion : {};

    const renderFieldContent = () => {
      switch (field.fieldType) {
        case 'card_select':
        case 'option':
          return (
            <div>
              <Text strong style={{ display: 'block', marginBottom: '16px', fontSize: '16px' }}>
                {field.label} {field.isRequired && <span style={{ color: '#ff4d4f' }}>*</span>}
              </Text>
              {field.helpText && (
                <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                  {field.helpText}
                </Text>
              )}
              <div style={styles.cardGrid}>
                {(field.options as CardOption[] || []).map((option) => (
                  <div
                    key={option.value}
                    onClick={() => handleValueChange(field.name, option.value)}
                    style={styles.optionCard(value === option.value)}
                    onMouseEnter={(e) => {
                      if (value !== option.value) {
                        e.currentTarget.style.borderColor = '#1890ff';
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(24,144,255,0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (value !== option.value) {
                        e.currentTarget.style.borderColor = '#e8e8e8';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    {option.icon && (
                      <span style={styles.optionIcon}>{option.icon}</span>
                    )}
                    {option.image && (
                      <img 
                        src={option.image} 
                        alt={option.label}
                        style={{ width: '56px', height: '56px', marginBottom: '8px', objectFit: 'contain' }}
                      />
                    )}
                    <Text strong style={{ display: 'block', fontSize: '14px' }}>
                      {option.label}
                    </Text>
                    {option.description && (
                      <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px' }}>
                        {option.description}
                      </Text>
                    )}
                    {value === option.value && (
                      <CheckCircleOutlined 
                        style={{ 
                          position: 'absolute', 
                          top: '8px', 
                          right: '8px', 
                          color: '#1890ff',
                          fontSize: '18px'
                        }} 
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );

        case 'checkbox':
          return (
            <div style={{ marginBottom: '24px' }}>
              <Text strong style={{ display: 'block', marginBottom: '12px', fontSize: '16px' }}>
                {field.label} {field.isRequired && <span style={{ color: '#ff4d4f' }}>*</span>}
              </Text>
              {field.helpText && (
                <Text type="secondary" style={{ display: 'block', marginBottom: '12px' }}>
                  {field.helpText}
                </Text>
              )}
              <Checkbox.Group
                value={value || []}
                onChange={(checkedValues) => handleValueChange(field.name, checkedValues)}
                style={{ width: '100%' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {(field.options as SelectOption[] || []).map(opt => (
                    <Checkbox 
                      key={opt.value} 
                      value={opt.value}
                      style={{ 
                        padding: '12px 16px', 
                        border: '1px solid #d9d9d9', 
                        borderRadius: '8px',
                        margin: 0,
                        background: (value || []).includes(opt.value) ? '#e6f7ff' : 'white'
                      }}
                    >
                      {opt.label}
                    </Checkbox>
                  ))}
                </div>
              </Checkbox.Group>
            </div>
          );

        case 'text':
          return (
            <Form.Item
              label={<span style={{ fontSize: '16px', fontWeight: 500 }}>{field.label}</span>}
              required={field.isRequired}
              help={field.helpText}
              style={{ marginBottom: '24px' }}
            >
              <Input
                size="large"
                placeholder={field.placeholder}
                value={value || ''}
                onChange={(e) => handleValueChange(field.name, e.target.value)}
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
          );

        case 'email':
          return (
            <Form.Item
              label={<span style={{ fontSize: '16px', fontWeight: 500 }}>{field.label}</span>}
              required={field.isRequired}
              help={field.helpText}
              style={{ marginBottom: '24px' }}
            >
              <Input
                size="large"
                type="email"
                placeholder={field.placeholder || 'votre@email.com'}
                value={value || ''}
                onChange={(e) => handleValueChange(field.name, e.target.value)}
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
          );

        case 'phone':
          return (
            <Form.Item
              label={<span style={{ fontSize: '16px', fontWeight: 500 }}>{field.label}</span>}
              required={field.isRequired}
              help={field.helpText}
              style={{ marginBottom: '24px' }}
            >
              <Input
                size="large"
                type="tel"
                placeholder={field.placeholder || '06 12 34 56 78'}
                value={value || ''}
                onChange={(e) => handleValueChange(field.name, e.target.value)}
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
          );

        case 'number':
          return (
            <Form.Item
              label={<span style={{ fontSize: '16px', fontWeight: 500 }}>{field.label}</span>}
              required={field.isRequired}
              help={field.helpText}
              style={{ marginBottom: '24px' }}
            >
              <InputNumber
                size="large"
                style={{ width: '100%', borderRadius: '8px' }}
                placeholder={field.placeholder}
                value={value}
                onChange={(val) => handleValueChange(field.name, val)}
                min={field.validation?.min}
                max={field.validation?.max}
              />
            </Form.Item>
          );

        case 'textarea':
          return (
            <Form.Item
              label={<span style={{ fontSize: '16px', fontWeight: 500 }}>{field.label}</span>}
              required={field.isRequired}
              help={field.helpText}
              style={{ marginBottom: '24px' }}
            >
              <TextArea
                rows={4}
                placeholder={field.placeholder}
                value={value || ''}
                onChange={(e) => handleValueChange(field.name, e.target.value)}
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
          );

        case 'select':
          return (
            <Form.Item
              label={<span style={{ fontSize: '16px', fontWeight: 500 }}>{field.label}</span>}
              required={field.isRequired}
              help={field.helpText}
              style={{ marginBottom: '24px' }}
            >
              <Select
                size="large"
                placeholder={field.placeholder || 'Sélectionnez...'}
                value={value}
                onChange={(val) => handleValueChange(field.name, val)}
                options={(field.options as SelectOption[] || []).map(opt => ({
                  value: opt.value,
                  label: opt.label
                }))}
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
          );

        case 'radio':
          return (
            <div style={{ marginBottom: '24px' }}>
              <Text strong style={{ display: 'block', marginBottom: '12px', fontSize: '16px' }}>
                {field.label} {field.isRequired && <span style={{ color: '#ff4d4f' }}>*</span>}
              </Text>
              {field.helpText && (
                <Text type="secondary" style={{ display: 'block', marginBottom: '12px' }}>
                  {field.helpText}
                </Text>
              )}
              <Radio.Group
                value={value}
                onChange={(e) => handleValueChange(field.name, e.target.value)}
                style={{ width: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {(field.options as SelectOption[] || []).map(opt => (
                    <Radio 
                      key={opt.value} 
                      value={opt.value}
                      style={{ 
                        padding: '12px 16px', 
                        border: '1px solid #d9d9d9', 
                        borderRadius: '8px',
                        width: '100%',
                        margin: 0,
                        background: value === opt.value ? '#e6f7ff' : 'white'
                      }}
                    >
                      {opt.label}
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            </div>
          );

        case 'address':
          return (
            <Form.Item
              label={<span style={{ fontSize: '16px', fontWeight: 500 }}>{field.label}</span>}
              required={field.isRequired}
              help={field.helpText}
              style={{ marginBottom: '24px' }}
            >
              <Input
                size="large"
                placeholder={field.placeholder || 'Entrez votre adresse complète...'}
                value={value || ''}
                onChange={(e) => handleValueChange(field.name, e.target.value)}
                suffix={<span style={{ fontSize: '18px' }}>📍</span>}
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
          );

        default:
          return (
            <Form.Item
              label={<span style={{ fontSize: '16px', fontWeight: 500 }}>{field.label}</span>}
              required={field.isRequired}
              style={{ marginBottom: '24px' }}
            >
              <Input
                size="large"
                placeholder={field.placeholder}
                value={value || ''}
                onChange={(e) => handleValueChange(field.name, e.target.value)}
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
          );
      }
    };

    // Rendu du champ avec ses sous-questions conditionnelles
    return (
      <div key={field.id} style={containerStyle}>
        {renderFieldContent()}
        
        {/* Rendu des sous-questions conditionnelles */}
        {field.childFields && field.childFields.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            {field.childFields
              .filter(child => shouldShowField(child, values))
              .sort((a, b) => a.order - b.order)
              .map(child => renderField(child, true))}
          </div>
        )}
      </div>
    );
  };

  // ==================== ÉTATS DE RENDU ====================
  
  // Loading
  if (loading) {
    return (
      <div style={styles.container}>
        <Card style={{ ...styles.formCard, textAlign: 'center', padding: '60px' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
          <Title level={4} style={{ marginTop: '24px' }}>Chargement du simulateur...</Title>
        </Card>
      </div>
    );
  }

  // Erreur
  if (error || !formData) {
    return (
      <div style={styles.container}>
        <Card style={styles.formCard}>
          <Result
            status="404"
            title="Simulateur introuvable"
            subTitle={error || "Ce formulaire n'existe pas ou n'est plus disponible."}
            extra={
              <Button type="primary" icon={<HomeOutlined />} onClick={() => navigate('/')}>
                Retour à l'accueil
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  // Succès (après soumission)
  if (submitted) {
    return (
      <div style={styles.container}>
        <Card style={styles.formCard}>
          <Result
            status="success"
            title="🎉 Merci pour votre demande !"
            subTitle={formData.successMessage}
            extra={[
              <Button 
                type="primary" 
                key="home" 
                size="large"
                icon={<HomeOutlined />}
                onClick={() => navigate('/')}
              >
                Retour à l'accueil
              </Button>
            ]}
          />
        </Card>
      </div>
    );
  }

  // Formulaire actif
  const currentStepData = formData.steps[currentStep];
  const totalSteps = formData.steps.length;
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div style={styles.container}>
      {/* CSS pour animation */}
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
      
      <Card style={styles.formCard} styles={{ body: { padding: 0 } }}>
        {/* Header */}
        <div style={styles.header}>
          <Title level={2} style={{ color: 'white', margin: 0 }}>
            {formData.name}
          </Title>
          {formData.description && (
            <Paragraph style={{ color: 'rgba(255,255,255,0.85)', margin: '8px 0 0', fontSize: '16px' }}>
              {formData.description}
            </Paragraph>
          )}
        </div>

        {/* Progress */}
        <div style={styles.progressBar}>
          <Row align="middle" justify="space-between" style={{ marginBottom: '8px' }}>
            <Col>
              <Text type="secondary">
                Étape {currentStep + 1} sur {totalSteps}
              </Text>
            </Col>
            <Col>
              <Text strong style={{ color: '#1890ff' }}>
                {progressPercent}%
              </Text>
            </Col>
          </Row>
          <Progress 
            percent={progressPercent} 
            showInfo={false}
            strokeColor={{
              '0%': '#1890ff',
              '100%': '#52c41a',
            }}
            trailColor="#e8e8e8"
          />
        </div>

        {/* Contenu de l'étape */}
        <div style={styles.content}>
          <div style={styles.stepTitle}>
            {currentStepData.icon && (
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>
                {currentStepData.icon}
              </span>
            )}
            <Title level={3} style={{ margin: 0 }}>
              {currentStepData.title}
            </Title>
            {currentStepData.description && (
              <Text type="secondary" style={{ fontSize: '16px' }}>
                {currentStepData.description}
              </Text>
            )}
          </div>

          <Form form={form} layout="vertical" size="large">
            {visibleFields.map(field => renderField(field))}
          </Form>
        </div>

        {/* Footer avec navigation */}
        <div style={styles.footer}>
          <Button
            size="large"
            icon={<ArrowLeftOutlined />}
            onClick={handlePrev}
            disabled={currentStep === 0}
            style={{ borderRadius: '8px' }}
          >
            Précédent
          </Button>

          {totalSteps <= 6 && (
            <Steps
              current={currentStep}
              size="small"
              style={{ maxWidth: '300px', flex: 1, margin: '0 24px' }}
              items={formData.steps.map((step, index) => ({
                title: '',
                icon: index < currentStep ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : undefined
              }))}
            />
          )}

          <Button
            type="primary"
            size="large"
            loading={submitting}
            onClick={handleNext}
            style={{ borderRadius: '8px', minWidth: '140px' }}
          >
            {isLastStep ? (
              <>
                {formData.submitButtonText || 'Envoyer'}
                <CheckCircleOutlined style={{ marginLeft: '8px' }} />
              </>
            ) : (
              <>
                Suivant
                <ArrowRightOutlined style={{ marginLeft: '8px' }} />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PublicFormRenderer;
