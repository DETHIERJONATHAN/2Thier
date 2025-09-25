import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Select, Input, Card, Space, Typography, Alert, Spin, InputNumber, Steps, Divider } from 'antd';
import { CheckCircleOutlined, LoadingOutlined, CalculatorOutlined, AlertOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

const { Option } = Select;
const { Text, Title } = Typography;

/**
 * 🚀 COMPOSANT ADVANCED_SELECT PROFESSIONNEL
 * 
 * Fonctionnalités :
 * ✅ Interface intuitive "formulaires vivants"
 * ✅ Calculs automatiques en temps réel
 * ✅ Validation intelligente avec feedback
 * ✅ Workflows visuels étape par étape
 * ✅ Support arborescence complexe
 * ✅ Templates no-code intégrés
 * 
 * Usage: <AdvancedSelectProfessional field={field} value={value} onChange={onChange} />
 */

interface FieldData {
    nextField?: {
        type: string;
        placeholder: string;
        validation: Record<string, unknown>;
    };
    formula?: {
        type: string;
        denominator?: string;
        result_field?: string;
        precision?: number;
    };
    workflow?: {
        target_field: string;
        action: string;
    };
    businessLogic?: {
        category: string;
        unit: string;
    };
}

interface FieldOption {
    label: string;
    value: string;
    data: FieldData;
}

interface Field {
    id: string;
    name: string;
    type: string;
    organization_id: number;
    is_required: boolean;
    capabilities?: string[];
    options?: FieldOption[];
}

interface ValidationResult {
    isValid: boolean;
    validations: Array<{
        rule: string;
        passed: boolean;
        message: string;
        severity: 'error' | 'warning' | 'info';
    }>;
    summary: {
        passed: number;
        failed: number;
        warnings: number;
    };
}

interface CalculationResult {
    success: boolean;
    result?: number;
    unit?: string;
    formatted?: string;
    metadata?: {
        operation?: string;
        operands?: number[];
        precision?: number;
        formula?: Record<string, unknown>;
        businessLogic?: Record<string, unknown>;
        validation?: {
            isValid: boolean;
            rules: string[];
        };
        calculationTime?: number;
    };
    error?: string;
}

interface Props {
    field: Field;
    value: { option: string; input: unknown } | null;
    onChange: (value: { option: string; input: unknown } | null) => void;
    relatedFields?: Record<string, unknown>;
    disabled?: boolean;
    size?: 'small' | 'middle' | 'large';
}

const AdvancedSelectProfessional: React.FC<Props> = ({
    field,
    value,
    onChange,
    relatedFields = {},
    disabled = false,
    size = 'middle'
}) => {
    // États pour gérer l'interface
    const [selectedOption, setSelectedOption] = useState<string | null>(value?.option || null);
    const [inputValue, setInputValue] = useState<unknown>(value?.input || null);
    const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    // API pour les calculs
    const { api } = useAuthenticatedApi();

    // Récupérer l'option sélectionnée
    const selectedOptionData = useMemo(() => {
        if (!selectedOption || !field.options) return null;
        return field.options.find(opt => opt.value === selectedOption);
    }, [selectedOption, field.options]);

    // Déterminer le type d'input à afficher
    const inputType = useMemo(() => {
        if (!selectedOptionData?.data?.nextField) return null;
        return selectedOptionData.data.nextField.type;
    }, [selectedOptionData]);

    // Fonction pour effectuer un calcul automatique
    const performCalculation = useCallback(async (option: string, input: unknown) => {
        if (!selectedOptionData?.data?.formula || !input) return;

        setIsCalculating(true);
        try {
            const response = await api.post(`/advanced-select/${field.id}/calculate`, {
                optionValue: option,
                inputData: input,
                relatedFieldsData: relatedFields,
                organizationId: field.organization_id.toString()
            });

            if (response.success) {
                setCalculationResult(response.data);
                
                // Valider automatiquement le résultat
                if (response.data.result !== undefined) {
                    const validationResponse = await api.post('/advanced-select/validate', {
                        value: response.data.result,
                        unit: response.data.unit
                    });
                    
                    if (validationResponse.success) {
                        setValidationResult(validationResponse.data);
                    }
                }
                
                setCurrentStep(2); // Passer à l'étape résultat
            }
        } catch (error) {
            console.error('Erreur lors du calcul:', error);
            setCalculationResult({
                success: false,
                error: 'Erreur lors du calcul automatique'
            });
        } finally {
            setIsCalculating(false);
        }
    }, [selectedOptionData, field.id, relatedFields, field.organization_id, api]);

    // Gérer le changement d'option
    const handleOptionChange = useCallback((option: string) => {
        setSelectedOption(option);
        setInputValue(null);
        setCalculationResult(null);
        setValidationResult(null);
        setCurrentStep(1);
        
        onChange({
            option,
            input: null
        });
    }, [onChange]);

    // Gérer le changement de valeur d'input
    const handleInputChange = useCallback((input: unknown) => {
        setInputValue(input);
        
        onChange({
            option: selectedOption!,
            input
        });

        // Si on a une formule, déclencher le calcul automatiquement
        if (selectedOptionData?.data?.formula && input !== null && input !== undefined) {
            performCalculation(selectedOption!, input);
        }
    }, [selectedOption, selectedOptionData, onChange, performCalculation]);

    // Effet pour mettre à jour les étapes
    useEffect(() => {
        if (!selectedOption) {
            setCurrentStep(0);
        } else if (!inputValue && inputType) {
            setCurrentStep(1);
        } else if (calculationResult) {
            setCurrentStep(2);
        }
    }, [selectedOption, inputValue, inputType, calculationResult]);

    // Rendu des étapes du workflow
    const renderWorkflowSteps = () => {
        if (!field.capabilities?.includes('workflow')) return null;

        const steps = [
            {
                title: 'Sélection',
                description: 'Choisir une option',
                icon: currentStep >= 0 ? <CheckCircleOutlined /> : undefined
            },
            {
                title: 'Saisie',
                description: selectedOptionData?.data?.nextField?.placeholder || 'Entrer une valeur',
                icon: currentStep >= 1 ? (currentStep === 1 ? <LoadingOutlined /> : <CheckCircleOutlined />) : undefined
            }
        ];

        if (selectedOptionData?.data?.formula) {
            steps.push({
                title: 'Calcul',
                description: 'Résultat automatique',
                icon: currentStep >= 2 ? (isCalculating ? <LoadingOutlined /> : <CalculatorOutlined />) : undefined
            });
        }

        return (
            <Card size="small" style={{ marginBottom: 16 }}>
                <Steps current={currentStep} size="small" items={steps} />
            </Card>
        );
    };

    // Rendu du champ d'input selon le type
    const renderInputField = () => {
        if (!selectedOptionData?.data?.nextField || !selectedOption) return null;

        const { type, placeholder, validation } = selectedOptionData.data.nextField;
        const isRequired = validation?.required as boolean;

        switch (type) {
            case 'number':
                return (
                    <InputNumber
                        size={size}
                        placeholder={placeholder}
                        value={inputValue as number}
                        onChange={handleInputChange}
                        disabled={disabled}
                        style={{ width: '100%' }}
                        min={validation?.min as number}
                        max={validation?.max as number}
                        step={validation?.step as number || 1}
                        precision={validation?.precision as number}
                        addonAfter={selectedOptionData.data.businessLogic?.unit}
                        status={isRequired && !inputValue ? 'error' : undefined}
                    />
                );

            case 'text':
                return (
                    <Input
                        size={size}
                        placeholder={placeholder}
                        value={inputValue as string}
                        onChange={e => handleInputChange(e.target.value)}
                        disabled={disabled}
                        status={isRequired && !inputValue ? 'error' : undefined}
                    />
                );

            default:
                return (
                    <Input
                        size={size}
                        placeholder={placeholder}
                        value={inputValue as string}
                        onChange={e => handleInputChange(e.target.value)}
                        disabled={disabled}
                    />
                );
        }
    };

    // Rendu du résultat de calcul
    const renderCalculationResult = () => {
        if (!calculationResult) return null;

        return (
            <Card size="small" style={{ marginTop: 16 }}>
                <Title level={5}>
                    <CalculatorOutlined /> Résultat du calcul
                </Title>
                
                {calculationResult.success ? (
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                            {calculationResult.formatted || `${calculationResult.result} ${calculationResult.unit}`}
                        </Text>
                        
                        {calculationResult.metadata && (
                            <Text type="secondary">
                                {calculationResult.metadata.operation} • {calculationResult.metadata.calculationTime}ms
                            </Text>
                        )}
                        
                        {validationResult && (
                            <div style={{ marginTop: 12 }}>
                                <Divider style={{ margin: '12px 0' }} />
                                <Text strong>Validation :</Text>
                                <div style={{ marginTop: 8 }}>
                                    {validationResult.validations.map((validation, index) => (
                                        <Alert
                                            key={index}
                                            type={validation.severity === 'error' ? 'error' : 
                                                  validation.severity === 'warning' ? 'warning' : 'success'}
                                            message={validation.message}
                                            size="small"
                                            style={{ marginBottom: 4 }}
                                            showIcon
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </Space>
                ) : (
                    <Alert
                        type="error"
                        message="Erreur de calcul"
                        description={calculationResult.error}
                        showIcon
                        icon={<AlertOutlined />}
                    />
                )}
            </Card>
        );
    };

    return (
        <div style={{ width: '100%' }}>
            {/* Titre du champ */}
            <Title level={5} style={{ marginBottom: 12 }}>
                {field.name}
                {field.is_required && <span style={{ color: '#ff4d4f' }}> *</span>}
            </Title>

            {/* Workflows visuels */}
            {renderWorkflowSteps()}

            {/* Sélecteur d'option principal */}
            <Select
                size={size}
                placeholder="Sélectionnez une option..."
                value={selectedOption}
                onChange={handleOptionChange}
                disabled={disabled}
                style={{ width: '100%', marginBottom: 16 }}
                loading={isCalculating}
            >
                {field.options?.map(option => (
                    <Option key={option.value} value={option.value}>
                        {option.label}
                    </Option>
                ))}
            </Select>

            {/* Champ d'input conditionnel */}
            {renderInputField()}

            {/* Résultat du calcul */}
            {renderCalculationResult()}

            {/* Indicateur de capacités */}
            {field.capabilities && field.capabilities.length > 0 && (
                <div style={{ marginTop: 16 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        Capacités : {field.capabilities.join(', ')}
                    </Text>
                </div>
            )}

            {/* Spinner global pendant les calculs */}
            {isCalculating && (
                <div style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0,
                    background: 'rgba(255, 255, 255, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <Spin size="large" />
                </div>
            )}
        </div>
    );
};

export default AdvancedSelectProfessional;
