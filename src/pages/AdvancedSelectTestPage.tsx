import React, { useState } from 'react';
import { Card, Space, Button, Typography, Divider } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import AdvancedSelectProfessional from '../components/AdvancedSelectProfessional';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { getFieldMapping } from '../config/fieldMapping';

const { Title, Text } = Typography;

interface TestResult {
    test: string;
    status: 'success' | 'error' | 'warning';
    data: unknown;
    expectedResult?: string;
    timestamp: string;
}

/**
 * 🧪 PAGE DE TEST POUR LE SYSTÈME ADVANCED_SELECT PROFESSIONNEL
 * 
 * Cette page permet de tester en conditions réelles :
 * - Le composant AdvancedSelectProfessional
 * - Le service AdvancedSelectService
 * - L'API endpoint /advanced-select
 * - Les calculs automatiques Prix Kw/h
 */
const AdvancedSelectTestPage: React.FC = () => {
    const { api } = useAuthenticatedApi();
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [loading, setLoading] = useState(false);

    // IDs des champs de test (selon notre configuration)
    const FIELD_IDS = getFieldMapping();

    const runComprehensiveTest = async () => {
        setLoading(true);
        setTestResults([]);
        
        try {
            console.log('🧪 Début des tests Advanced Select Professional...');

            // Test 1: Récupération du champ advanced_select
            console.log('📝 Test 1: Récupération du champ Prix Kw/h...');
            const fieldResponse = await api.get(`/advanced-select/${FIELD_IDS.prix_kwh}?organizationId=1`);
            
            setTestResults(prev => [...prev, {
                test: 'Récupération champ Prix Kw/h',
                status: fieldResponse.success ? 'success' : 'error',
                data: fieldResponse.data,
                timestamp: new Date().toLocaleTimeString()
            }]);

            // Test 2: Test de calcul automatique
            console.log('🧮 Test 2: Calcul automatique Prix Kw/h...');
            const calculationData = {
                optionValue: 'calcul-du-prix-kwh',
                inputData: 1200, // Montant total 1200€
                relatedFieldsData: {
                    [FIELD_IDS.consommation_kwh]: 8000 // 8000 kWh
                },
                organizationId: '1'
            };

            const calculationResponse = await api.post(
                `/advanced-select/${FIELD_IDS.prix_kwh}/calculate`, 
                calculationData
            );

            setTestResults(prev => [...prev, {
                test: 'Calcul automatique (1200€ / 8000 kWh)',
                status: calculationResponse.success ? 'success' : 'error',
                data: calculationResponse.data,
                expectedResult: '0.150 €/kWh',
                timestamp: new Date().toLocaleTimeString()
            }]);

            // Test 3: Validation des résultats
            console.log('✅ Test 3: Validation des résultats...');
            const validationResponse = await api.post('/advanced-select/validate', {
                value: calculationResponse.data?.result || 0.15,
                unit: 'EUR/kWh',
                rules: ['realistic_energy_price']
            });

            setTestResults(prev => [...prev, {
                test: 'Validation Prix Énergétique',
                status: validationResponse.data?.isValid ? 'success' : 'warning',
                data: validationResponse.data,
                timestamp: new Date().toLocaleTimeString()
            }]);

            // Test 4: Test template no-code
            console.log('🏗️ Test 4: Template no-code...');
            const templateResponse = await api.post('/advanced-select/templates', {
                templateType: 'energy_pricing',
                fieldConfig: {
                    consumptionFieldId: FIELD_IDS.consommation,
                    resultFieldId: FIELD_IDS.prix_mois
                },
                organizationId: '1'
            });

            setTestResults(prev => [...prev, {
                test: 'Template Energy Pricing',
                status: templateResponse.success ? 'success' : 'error',
                data: templateResponse.data,
                timestamp: new Date().toLocaleTimeString()
            }]);

            console.log('✅ Tests terminés avec succès!');

        } catch (error) {
            console.error('❌ Erreur lors des tests:', error);
            setTestResults(prev => [...prev, {
                test: 'Erreur générale',
                status: 'error',
                data: { error: error.message },
                timestamp: new Date().toLocaleTimeString()
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <Title level={2}>
                🧪 Tests Advanced Select Professional
            </Title>
            <Text type="secondary">
                Cette page teste l'intégralité du système Advanced Select avec calculs automatiques, 
                validation et templates no-code.
            </Text>

            <Divider />

            {/* Composant Advanced Select de Test */}
            <Card title="🎯 Composant de Test en Direct" style={{ marginBottom: '24px' }}>
                <AdvancedSelectProfessional
                    field={{
                        id: FIELD_IDS.prix_kwh,
                        name: 'Prix Kw/h Test',
                        type: 'advanced_select',
                        organization_id: 1,
                        is_required: false,
                        capabilities: ['dynamic_calculation', 'validation', 'workflow'],
                        options: [
                            {
                                label: 'Calcul automatique du prix',
                                value: 'calcul-du-prix-kwh',
                                data: {
                                    nextField: {
                                        type: 'number',
                                        placeholder: 'Montant total facturé (€)',
                                        validation: { required: true, min: 0 }
                                    },
                                    formula: {
                                        type: 'division',
                                        denominator: FIELD_IDS.consommation,
                                        result_field: FIELD_IDS.prix_mois,
                                        precision: 3
                                    },
                                    businessLogic: {
                                        category: 'energy_calculation',
                                        unit: 'EUR/kWh'
                                    }
                                }
                            },
                            {
                                label: 'Prix Kw/h connu',
                                value: 'prix-kwh',
                                data: {
                                    nextField: {
                                        type: 'number',
                                        placeholder: 'Prix par Kw/h (€)',
                                        validation: { required: true, min: 0, step: 0.001 }
                                    },
                                    workflow: {
                                        target_field: FIELD_IDS.prix_mois,
                                        action: 'copy_value'
                                    },
                                    businessLogic: {
                                        category: 'direct_input',
                                        unit: 'EUR/kWh'
                                    }
                                }
                            }
                        ]
                    }}
                    value={null}
                    onChange={(value) => console.log('Nouvelle valeur:', value)}
                    relatedFields={{
                        [FIELD_IDS.consommation]: 8000,
                        [FIELD_IDS.prix_mois]: null
                    }}
                />
            </Card>

            {/* Bouton de test */}
            <Card title="🚀 Tests Automatiques" style={{ marginBottom: '24px' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Button 
                        type="primary" 
                        icon={<PlayCircleOutlined />} 
                        onClick={runComprehensiveTest}
                        loading={loading}
                        size="large"
                    >
                        Lancer la Suite de Tests Complète
                    </Button>
                    <Text type="secondary">
                        Tests: Récupération field → Calcul automatique → Validation → Template no-code
                    </Text>
                </Space>
            </Card>

            {/* Résultats des tests */}
            {testResults.length > 0 && (
                <Card title="📊 Résultats des Tests">
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        {testResults.map((result, index) => (
                            <Card 
                                key={index}
                                size="small"
                                title={
                                    <Space>
                                        {result.status === 'success' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                                        {result.status === 'warning' && <CheckCircleOutlined style={{ color: '#faad14' }} />}
                                        {result.status === 'error' && <CheckCircleOutlined style={{ color: '#ff4d4f' }} />}
                                        <span>{result.test}</span>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            {result.timestamp}
                                        </Text>
                                    </Space>
                                }
                            >
                                {result.expectedResult && (
                                    <Text strong>Résultat attendu: {result.expectedResult}</Text>
                                )}
                                <pre style={{ 
                                    background: '#f5f5f5', 
                                    padding: '12px', 
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    maxHeight: '300px',
                                    overflow: 'auto'
                                }}>
                                    {JSON.stringify(result.data, null, 2)}
                                </pre>
                            </Card>
                        ))}
                    </Space>
                </Card>
            )}
        </div>
    );
};

export default AdvancedSelectTestPage;
