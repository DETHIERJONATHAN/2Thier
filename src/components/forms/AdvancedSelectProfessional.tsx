import React, { useState, useMemo, useCallback } from 'react';
import { Select, Input, InputNumber, Card, Alert, Tooltip, Badge, Steps, Space } from 'antd';
import { CalculatorOutlined, EuroOutlined, ZapOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Step } = Steps;

/**
 * 🚀 COMPOSANT ADVANCED_SELECT PROFESSIONNEL
 * 
 * Fonctionnalités:
 * ✅ Formulaires vivants et réactifs
 * ✅ Calculs automatiques en temps réel  
 * ✅ Validation intelligente
 * ✅ Interface intuitive avec icônes
 * ✅ Workflows visuels
 * ✅ Architecture scalable
 */
const AdvancedSelectProfessional = ({ 
    field, 
    value, 
    onChange, 
    relatedFields = {},
    onFieldUpdate,
    className = '',
    showWorkflow = true 
}) => {
    const [selectedOption, setSelectedOption] = useState(value?.option || null);
    const [dynamicFieldValues, setDynamicFieldValues] = useState(value?.dynamicFields || {});
    const [calculatedResult, setCalculatedResult] = useState(null);
    const [validationStatus, setValidationStatus] = useState({ type: 'info', message: null });
    const [currentStep, setCurrentStep] = useState(0);

    // 🔧 Fonction pour obtenir l'icône appropriée
    const getOptionIcon = useCallback((optionValue) => {
        const iconMap = {
            'calcul-du-prix-kwh': <CalculatorOutlined />,
            'prix-kwh': <EuroOutlined />,
            'auto_calculate': <CalculatorOutlined />,
            'direct_input': <EuroOutlined />
        };
        return iconMap[optionValue] || <InfoCircleOutlined />;
    }, []);

    // 🎯 Configuration des options enrichies
    const enrichedOptions = useMemo(() => {
        if (!field?.optionNodes) return [];
        
        return field.optionNodes.map(option => ({
            ...option,
            config: option.data || {},
            icon: getOptionIcon(option.value),
            description: option.data?.workflow?.description || option.label
        }));
    }, [field, getOptionIcon]);

    // ⚡ Gestion des changements d'option
    const handleOptionChange = useCallback((optionValue) => {
        setSelectedOption(optionValue);
        setDynamicFieldValues({});
        setCurrentStep(1);
        
        const selectedConfig = enrichedOptions.find(opt => opt.value === optionValue);
        
        onChange?.({
            option: optionValue,
            dynamicFields: {},
            metadata: {
                selectedConfig,
                timestamp: new Date().toISOString()
            }
        });
    }, [enrichedOptions, onChange]);

    // 🧮 Fonction de calcul automatique
    const performCalculation = useCallback((montant, consommation) => {
        if (!montant || !consommation || consommation <= 0) {
            setValidationStatus({
                type: 'error',
                message: 'La consommation doit être supérieure à 0 pour effectuer le calcul'
            });
            return;
        }

        const result = (parseFloat(montant) / parseFloat(consommation)).toFixed(3);
        const resultNum = parseFloat(result);
        
        // Validation intelligente du résultat
        if (resultNum < 0.05 || resultNum > 0.50) {
            setValidationStatus({
                type: 'warning',
                message: `Prix calculé: ${result} €/kWh (semble ${resultNum < 0.05 ? 'très bas' : 'très élevé'})`
            });
        } else {
            setValidationStatus({
                type: 'success',
                message: `Prix calculé: ${result} €/kWh (dans la fourchette normale)`
            });
        }
        
        setCalculatedResult(resultNum);
        setCurrentStep(2);
        
        // Mettre à jour le champ "Prix Kw/h - Défini"
        onFieldUpdate?.('52c7f63b-7e57-4ba8-86da-19a176f09220', resultNum);
        
    }, [onFieldUpdate]);

    // 🔢 Gestion des valeurs des champs dynamiques
    const handleDynamicFieldChange = useCallback((optionValue, fieldValue) => {
        const newDynamicFields = { ...dynamicFieldValues, [selectedOption]: fieldValue };
        setDynamicFieldValues(newDynamicFields);
        
        // Déclencher le calcul automatique si applicable
        if (selectedOption === 'calcul-du-prix-kwh' && fieldValue && relatedFields.consommation) {
            performCalculation(fieldValue, relatedFields.consommation);
        } else if (selectedOption === 'prix-kwh' && fieldValue) {
            setCalculatedResult(fieldValue);
            onFieldUpdate?.('52c7f63b-7e57-4ba8-86da-19a176f09220', fieldValue);
        }
        
        onChange?.({
            option: selectedOption,
            dynamicFields: newDynamicFields,
            calculatedResult: calculatedResult
        });
    }, [selectedOption, dynamicFieldValues, relatedFields, calculatedResult, onChange, onFieldUpdate, performCalculation]);

    // 🎨 Rendu du champ dynamique
    const renderDynamicField = useCallback((option) => {
        const config = option.config;
        const nextField = config.nextField;
        
        if (!nextField) return null;

        const fieldProps = {
            style: { width: '100%' },
            placeholder: nextField.placeholder,
            value: dynamicFieldValues[option.value],
            onChange: (e) => {
                const val = e?.target ? e.target.value : e;
                handleDynamicFieldChange(option.value, val);
            }
        };

        if (nextField.validation) {
            fieldProps.min = nextField.validation.min;
            fieldProps.max = nextField.validation.max;
            fieldProps.step = nextField.validation.step;
        }

        const fieldElement = nextField.type === 'number' ? 
            <InputNumber {...fieldProps} addonAfter={nextField.ui?.unit || '€'} /> :
            <Input {...fieldProps} />;

        return (
            <div className="dynamic-field-container" style={{ marginTop: 12 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div className="field-header">
                        {nextField.ui?.icon && <span className="field-icon">{getOptionIcon(option.value)}</span>}
                        <span className="field-label">{nextField.placeholder}</span>
                    </div>
                    {fieldElement}
                    {nextField.ui?.helpText && (
                        <div className="field-help" style={{ color: '#666', fontSize: '12px' }}>
                            <InfoCircleOutlined style={{ marginRight: 4 }} />
                            {nextField.ui.helpText}
                        </div>
                    )}
                </Space>
            </div>
        );
    }, [dynamicFieldValues, handleDynamicFieldChange, getOptionIcon]);

    // 📊 Rendu du workflow visuel
    const renderWorkflow = () => {
        if (!showWorkflow) return null;

        const steps = [
            {
                title: 'Choix du mode',
                description: 'Sélection du type de calcul',
                icon: <InfoCircleOutlined />
            },
            {
                title: 'Saisie',
                description: selectedOption ? 'Saisie des données' : 'En attente',
                icon: selectedOption ? <ZapOutlined /> : <InfoCircleOutlined />
            },
            {
                title: 'Résultat',
                description: calculatedResult ? `${calculatedResult} €/kWh` : 'Calcul en attente',
                icon: calculatedResult ? <CheckCircleOutlined /> : <InfoCircleOutlined />
            }
        ];

        return (
            <Card size="small" className="workflow-card" style={{ marginBottom: 16 }}>
                <Steps current={currentStep} size="small">
                    {steps.map((step, index) => (
                        <Step 
                            key={index}
                            title={step.title}
                            description={step.description}
                            icon={step.icon}
                        />
                    ))}
                </Steps>
            </Card>
        );
    };

    return (
        <div className={`advanced-select-professional ${className}`}>
            {renderWorkflow()}
            
            {/* Sélection principale */}
            <div className="main-select-container">
                <Select
                    value={selectedOption}
                    onChange={handleOptionChange}
                    placeholder="Choisissez le mode de calcul"
                    style={{ width: '100%' }}
                    size="large"
                >
                    {enrichedOptions.map(option => (
                        <Option key={option.value} value={option.value}>
                            <Space>
                                {option.icon}
                                <span>{option.label}</span>
                                <Badge 
                                    count={option.config.businessLogic?.category || 'config'} 
                                    style={{ backgroundColor: '#52c41a', fontSize: '10px' }}
                                />
                            </Space>
                        </Option>
                    ))}
                </Select>
            </div>

            {/* Champ dynamique */}
            {selectedOption && (
                <Card 
                    className="dynamic-field-card"
                    style={{ marginTop: 16 }}
                    styles={{ body: { padding: 16 } }}
                >
                    {enrichedOptions
                        .filter(opt => opt.value === selectedOption)
                        .map(option => (
                            <div key={option.value}>
                                <div className="option-description" style={{ marginBottom: 12 }}>
                                    <Tooltip title={option.config.workflow?.description}>
                                        <Badge.Ribbon text={option.config.businessLogic?.category || 'Configuration'}>
                                            <Card size="small">
                                                <Space>
                                                    {option.icon}
                                                    <strong>{option.description}</strong>
                                                </Space>
                                            </Card>
                                        </Badge.Ribbon>
                                    </Tooltip>
                                </div>
                                {renderDynamicField(option)}
                            </div>
                        ))
                    }
                </Card>
            )}

            {/* Statut et validation */}
            {validationStatus.message && (
                <Alert
                    message={validationStatus.message}
                    type={validationStatus.type}
                    showIcon
                    style={{ marginTop: 12 }}
                    closable
                    onClose={() => setValidationStatus({ type: 'info', message: null })}
                />
            )}

            {/* Résultat calculé */}
            {calculatedResult && (
                <Card 
                    className="result-card"
                    style={{ 
                        marginTop: 16, 
                        backgroundColor: '#f6ffed',
                        borderColor: '#b7eb8f'
                    }}
                >
                    <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                        <div>
                            <div style={{ fontWeight: 'bold', color: '#389e0d' }}>
                                Prix calculé : {calculatedResult} €/kWh
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                Calcul effectué automatiquement
                            </div>
                        </div>
                    </Space>
                </Card>
            )}

            <style jsx>{`
                .advanced-select-professional {
                    .workflow-card .ant-steps-item-icon {
                        background-color: #f0f0f0;
                    }
                    .workflow-card .ant-steps-item-process .ant-steps-item-icon {
                        background-color: #1890ff;
                    }
                    .workflow-card .ant-steps-item-finish .ant-steps-item-icon {
                        background-color: #52c41a;
                    }
                    
                    .dynamic-field-container {
                        padding: 8px;
                        border: 1px solid #e8e8e8;
                        border-radius: 6px;
                        background: #fafafa;
                    }
                    
                    .field-header {
                        display: flex;
                        align-items: center;
                        margin-bottom: 8px;
                        font-weight: 500;
                    }
                    
                    .field-icon {
                        margin-right: 8px;
                        color: #1890ff;
                    }
                    
                    .result-card {
                        animation: slideIn 0.3s ease-in-out;
                    }
                    
                    @keyframes slideIn {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                }
            `}</style>
        </div>
    );
};

export default AdvancedSelectProfessional;
