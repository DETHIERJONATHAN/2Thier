/**
 * 🌟 COMPOSANT REACT SYSTÈME DYNAMIQUE UNIVERSEL
 * 
 * Ce composant s'adapte automatiquement aux configurations des formulaires
 * et respecte toutes les conditions encodées pour TOUS les devis et formules.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Select, 
  Button, 
  Alert, 
  Spin, 
  Statistic, 
  Row, 
  Col, 
  Divider,
  Tag,
  Collapse,
  Typography,
  Space,
  notification
} from 'antd';
import { 
  CalculatorOutlined, 
  SettingOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  ReloadOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { logger } from '../lib/logger';

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

interface FieldConfiguration {
  id: string;
  label: string;
  type: string;
  advancedConfig?: Record<string, unknown> | null;
  options?: OptionNode[];
  formulas?: FieldFormula[];
  dependencies?: FieldDependency[];
  validations?: FieldValidation[];
}

interface OptionNode {
  id: string;
  label: string;
  value: string;
  fieldId: string;
}

interface FieldFormula {
  id: string;
  formula?: string;
  sequence: Record<string, unknown> | unknown[];
  fieldId: string;
}

interface FieldDependency {
  id: string;
  fieldId: string;
  dependsOnId: string;
  condition: string;
  value?: string;
}

interface FieldValidation {
  id: string;
  fieldId: string;
  rule: string;
  message?: string;
}

interface AnalyticsData {
  totalFields: number;
  advancedSelectFields: number;
  fieldsWithFormulas: number;
  fieldsWithDependencies: number;
  fieldsWithValidations: number;
  totalOptions: number;
  totalFormulas: number;
  totalDependencies: number;
  organizationId: string;
  timestamp: string;
}

interface PrixKwhResults {
  prixKwhDefini: number;
  selectedOption: string;
  calculation: {
    method: string;
    baseValue: number;
    divisor: number | null;
    result: number;
  };
  allResults: Record<string, string | number | boolean>;
  timestamp: string;
}

interface CalculationResults {
  results: Record<string, string | number | boolean>;
  calculatedFields: string[];
  inputFieldsCount: number;
  outputFieldsCount: number;
}

const DynamicFormulaSystemComponent: React.FC = () => {
  const { api } = useAuthenticatedApi();
  
  // États principaux
  const [configurations, setConfigurations] = useState<Record<string, FieldConfiguration>>({});
  const [fieldValues, setFieldValues] = useState<Record<string, string | number>>({});
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  
  // États pour Prix Kw/h spécifique
  const [prixKwhOption, setPrixKwhOption] = useState<string>('');
  const [prixKwhResults, setPrixKwhResults] = useState<PrixKwhResults | null>(null);
  
  // Mémorisation des APIs stables
  const stableApi = useMemo(() => api, [api]);

  /**
   * 🔄 Charge les configurations au montage
   */
  const loadConfigurations = useCallback(async () => {
    try {
      setLoadingConfigs(true);
      logger.debug('🔄 [DynamicFormula] Chargement des configurations...');
      
      const response = await stableApi.get('/dynamic-formulas/configurations');
      
      if (response.data?.success) {
        setConfigurations(response.data.data.configurations);
        logger.debug('✅ [DynamicFormula] Configurations chargées:', response.data.data.totalFields);
        
        notification.success({
          message: 'Configurations chargées',
          description: `${response.data.data.totalFields} champs configurés, dont ${response.data.data.conditionalFields} champs conditionnels`
        });
      }
      
    } catch (error) {
      logger.error('❌ [DynamicFormula] Erreur configurations:', error);
      notification.error({
        message: 'Erreur de chargement',
        description: 'Impossible de charger les configurations des champs'
      });
    } finally {
      setLoadingConfigs(false);
    }
  }, [stableApi]);

  /**
   * 📊 Charge les analytics du système
   */
  const loadAnalytics = useCallback(async () => {
    try {
      const response = await stableApi.get('/dynamic-formulas/analytics');
      
      if (response.data?.success) {
        setAnalytics(response.data.data);
      }
      
    } catch (error) {
      logger.error('❌ [DynamicFormula] Erreur analytics:', error);
    }
  }, [stableApi]);

  /**
   * 🧮 Exécute les calculs dynamiques
   */
  const executeCalculations = async () => {
    if (Object.keys(fieldValues).length === 0) {
      notification.warning({
        message: 'Aucune valeur',
        description: 'Veuillez saisir au moins une valeur avant de calculer'
      });
      return;
    }

    try {
      setLoading(true);
      logger.debug('🧮 [DynamicFormula] Exécution des calculs...');
      logger.debug('📝 Valeurs:', fieldValues);
      
      const response = await stableApi.post('/dynamic-formulas/calculate', {
        fieldValues
      });
      
      if (response.data?.success) {
        setResults(response.data.data);
        logger.debug('✅ [DynamicFormula] Calculs terminés:', response.data.data);
        
        notification.success({
          message: 'Calculs réussis',
          description: `${response.data.data.outputFieldsCount} champs calculés`
        });
      }
      
    } catch (error) {
      logger.error('❌ [DynamicFormula] Erreur calculs:', error);
      notification.error({
        message: 'Erreur de calcul',
        description: 'Une erreur est survenue lors des calculs'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * ⚡ Calcul spécifique Prix Kw/h
   */
  const calculatePrixKwh = async () => {
    if (!prixKwhOption) {
      notification.warning({
        message: 'Option manquante',
        description: 'Veuillez sélectionner une option Prix Kw/h'
      });
      return;
    }

    try {
      setLoading(true);
      logger.debug('⚡ [DynamicFormula] Calcul Prix Kw/h...');
      
      const response = await stableApi.post('/dynamic-formulas/calculate-prix-kwh', {
        selectedOption: prixKwhOption,
        prixDefini: fieldValues['52c7f63b-7e57-4ba8-86da-19a176f09220'] || 0,
        consommation: fieldValues['aa448cfa-3d97-4c23-8995-8e013577e27d'] || 1,
        directValue: fieldValues['direct_prix_kwh_input'] || 0,
        calculBase: fieldValues['calcul_du_prix_base'] || 0
      });
      
      if (response.data?.success) {
        setPrixKwhResults(response.data.data);
        logger.debug('✅ [Prix Kw/h] Résultat:', response.data.data);
        
        // Mettre à jour les valeurs avec le résultat
        const newFieldValues = { ...fieldValues };
        newFieldValues['52c7f63b-7e57-4ba8-86da-19a176f09220'] = response.data.data.prixKwhDefini;
        setFieldValues(newFieldValues);
        
        notification.success({
          message: 'Prix Kw/h calculé',
          description: `Résultat: ${response.data.data.prixKwhDefini} €/kWh`
        });
      }
      
    } catch (error) {
      logger.error('❌ [Prix Kw/h] Erreur:', error);
      notification.error({
        message: 'Erreur Prix Kw/h',
        description: 'Erreur lors du calcul du prix Kw/h'
      });
    } finally {
      setLoading(false);
    }
  };

  // Chargement initial
  useEffect(() => {
    loadConfigurations();
    loadAnalytics();
  }, [loadConfigurations, loadAnalytics]);

  // Rendu du composant
  if (loadingConfigs) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spin size="large" />
        <div className="ml-4">
          <Text>Chargement du système dynamique...</Text>
        </div>
      </div>
    );
  }

  const advancedSelectFields = Object.values(configurations).filter(
    config => config.type === 'advanced_select'
  );
  
  const calculationFields = Object.values(configurations).filter(
    config => config.label.toLowerCase().includes('prix') ||
             config.label.toLowerCase().includes('consommation') ||
             config.label.toLowerCase().includes('calcul')
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-6">
        <Title level={2}>
          <ThunderboltOutlined className="mr-2" />
          Système Dynamique Universel
        </Title>
        <Paragraph>
          Ce système s'adapte automatiquement aux configurations des formulaires et respecte 
          toutes les conditions encodées pour <strong>tous les devis et formules</strong>.
        </Paragraph>
      </div>

      {/* Analytics */}
      {analytics && (
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic title="Champs Total" value={analytics.totalFields} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic 
                title="Champs Conditionnels" 
                value={analytics.advancedSelectFields} 
                valueStyle={{ color: '#1890ff' }} 
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic 
                title="Avec Formules" 
                value={analytics.fieldsWithFormulas}
                valueStyle={{ color: '#52c41a' }} 
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic 
                title="Avec Dépendances" 
                value={analytics.fieldsWithDependencies}
                valueStyle={{ color: '#faad14' }} 
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={24}>
        {/* Colonne gauche : Configuration */}
        <Col span={12}>
          <Card 
            title={
              <span>
                <SettingOutlined className="mr-2" />
                Configuration Dynamique
              </span>
            }
            extra={
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => {
                  loadConfigurations();
                  loadAnalytics();
                }}
              >
                Actualiser
              </Button>
            }
          >
            <Form layout="vertical">
              {/* Section Prix Kw/h Spécifique */}
              <Divider orientation="left">Prix Kw/h (Logique Spécifique)</Divider>
              
              {advancedSelectFields
                .filter(field => field.label.includes('Prix Kw/h'))
                .map(field => (
                  <div key={field.id} className="mb-4">
                    <Form.Item label={field.label}>
                      <Select 
                        placeholder="Sélectionner une option"
                        value={prixKwhOption}
                        onChange={(value) => {
                          setPrixKwhOption(value);
                          setFieldValues(prev => ({
                            ...prev,
                            [field.id]: value
                          }));
                        }}
                      >
                        {field.options?.map(option => (
                          <Option key={option.id} value={option.value}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>
                ))}

              {/* Champs de calcul énergétique */}
              <Divider orientation="left">Champs de Calcul Énergétique</Divider>
              
              {calculationFields.map(field => (
                <div key={field.id} className="mb-4">
                  <Form.Item label={field.label}>
                    {field.type === 'number' ? (
                      <Input
                        type="number"
                        placeholder={`Saisir ${field.label}`}
                        value={fieldValues[field.id] || ''}
                        onChange={(e) => {
                          setFieldValues(prev => ({
                            ...prev,
                            [field.id]: parseFloat(e.target.value) || 0
                          }));
                        }}
                      />
                    ) : (
                      <Input
                        placeholder={`Saisir ${field.label}`}
                        value={fieldValues[field.id] || ''}
                        onChange={(e) => {
                          setFieldValues(prev => ({
                            ...prev,
                            [field.id]: e.target.value
                          }));
                        }}
                      />
                    )}
                    {field.type === 'donnee' && (
                      <Text type="secondary" className="text-xs">
                        Ce champ est calculé automatiquement
                      </Text>
                    )}
                  </Form.Item>
                </div>
              ))}

              {/* Champs additionnels pour tests */}
              <Divider orientation="left">Tests Supplémentaires</Divider>
              
              <Form.Item label="Valeur Prix Directe (si option 'Prix Kw/h')">
                <Input
                  type="number"
                  placeholder="Valeur directe du prix"
                  value={fieldValues['direct_prix_kwh_input'] || ''}
                  onChange={(e) => {
                    setFieldValues(prev => ({
                      ...prev,
                      'direct_prix_kwh_input': parseFloat(e.target.value) || 0
                    }));
                  }}
                />
              </Form.Item>

              <Form.Item label="Base de Calcul (si option 'Calcul du prix')">
                <Input
                  type="number"
                  placeholder="Base pour le calcul"
                  value={fieldValues['calcul_du_prix_base'] || ''}
                  onChange={(e) => {
                    setFieldValues(prev => ({
                      ...prev,
                      'calcul_du_prix_base': parseFloat(e.target.value) || 0
                    }));
                  }}
                />
              </Form.Item>
            </Form>

            <div className="mt-6">
              <Space>
                <Button
                  type="primary"
                  icon={<CalculatorOutlined />}
                  loading={loading}
                  onClick={executeCalculations}
                  size="large"
                >
                  Calculer (Général)
                </Button>
                
                <Button
                  icon={<ThunderboltOutlined />}
                  loading={loading}
                  onClick={calculatePrixKwh}
                  size="large"
                  style={{ backgroundColor: '#722ed1', borderColor: '#722ed1', color: 'white' }}
                >
                  Calculer Prix Kw/h
                </Button>
              </Space>
            </div>
          </Card>
        </Col>

        {/* Colonne droite : Résultats */}
        <Col span={12}>
          <Card 
            title={
              <span>
                <CheckCircleOutlined className="mr-2" />
                Résultats Dynamiques
              </span>
            }
          >
            {/* Résultats Prix Kw/h */}
            {prixKwhResults && (
              <Alert
                message="Prix Kw/h Calculé"
                description={
                  <div>
                    <div><strong>Résultat:</strong> {prixKwhResults.prixKwhDefini} €/kWh</div>
                    <div><strong>Méthode:</strong> {prixKwhResults.calculation.method}</div>
                    {prixKwhResults.calculation.divisor && (
                      <div><strong>Calcul:</strong> {prixKwhResults.calculation.baseValue} ÷ {prixKwhResults.calculation.divisor}</div>
                    )}
                  </div>
                }
                type="success"
                showIcon
                className="mb-4"
              />
            )}

            {/* Résultats généraux */}
            {results && (
              <div>
                <div className="mb-4">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic 
                        title="Champs Calculés" 
                        value={results.outputFieldsCount}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic 
                        title="Champs Saisis" 
                        value={results.inputFieldsCount}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                  </Row>
                </div>

                <Divider />

                <div>
                  <Title level={4}>Détails des Résultats</Title>
                  {Object.entries(results.results).map(([fieldId, value]) => {
                    const fieldConfig = configurations[fieldId];
                    return (
                      <div key={fieldId} className="mb-3 p-3 bg-gray-50 rounded">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            {fieldConfig?.label || fieldId}
                          </span>
                          <Tag color="green">{String(value)}</Tag>
                        </div>
                        <Text type="secondary" className="text-xs">
                          ID: {fieldId}
                        </Text>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!results && !prixKwhResults && (
              <div className="text-center py-8">
                <ExclamationCircleOutlined className="text-4xl text-gray-400 mb-4" />
                <Text type="secondary">
                  Aucun calcul effectué. Configurez les valeurs et lancez un calcul.
                </Text>
              </div>
            )}
          </Card>

          {/* Debug Info */}
          <Card title="Debug - Configurations" className="mt-4" size="small">
            <Collapse
              size="small"
              items={[
                {
                  key: 'configurations',
                  label: `Configurations (${Object.keys(configurations).length})`,
                  children: (
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(configurations, null, 2)}
                    </pre>
                  )
                },
                {
                  key: 'values',
                  label: `Valeurs Actuelles (${Object.keys(fieldValues).length})`,
                  children: (
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(fieldValues, null, 2)}
                    </pre>
                  )
                }
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DynamicFormulaSystemComponent;
