import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  Button,
  Radio,
  Input,
  InputNumber,
  Space,
  Typography,
  Row,
  Col,
  message,
  Progress,
  Tag,
  Divider,
  Alert,
} from 'antd';
import {
  CheckCircleOutlined,
  InfoCircleOutlined,
  CalculatorOutlined,
  SaveOutlined,
  PlusOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { logger } from '../../lib/logger';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface TreeBranchLeafNode {
  id: string;
  type: 'branch' | 'leaf' | 'condition' | 'formula' | 'api' | 'link' | 'leaf_repeater';
  subType?: 'option' | 'field' | 'data' | 'table' | 'calculation';
  label: string;
  description?: string;
  value?: string;
  isRequired: boolean;
  isVisible: boolean;
  isActive: boolean;
  parentId?: string;
  children?: TreeBranchLeafNode[];
  fieldConfig?: {
    fieldType?: string;
    placeholder?: string;
    min?: number;
    max?: number;
    options?: string[];
  };
  conditionConfig?: {
    conditions: Array<{
      field: string;
      operator: string;
      value: string;
    }>;
  };
  formulaConfig?: {
    formula: string;
    variables: string[];
  };
  metadata?: {
    repeater?: {
      templateNodeIds: string[];
      minItems?: number;
      maxItems?: number;
      addButtonLabel?: string;
    };
  };
}

interface TreeBranchLeafTree {
  id: string;
  name: string;
  description?: string;
  status: string;
  color: string;
  Nodes: TreeBranchLeafNode[];
}

interface FormData {
  [nodeId: string]: string | number | boolean;
}

interface CalculatedData {
  [nodeId: string]: number | string;
}

const TreeBranchLeafPreviewPage: React.FC = () => {
  const { id: treeId } = useParams<{ id: string }>();
  const { api } = useAuthenticatedApi();
  
  const [tree, setTree] = useState<TreeBranchLeafTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({});
  const [calculatedData, setCalculatedData] = useState<CalculatedData>({});
  const [visibleNodes, setVisibleNodes] = useState<TreeBranchLeafNode[]>([]);
  const [progress, setProgress] = useState(0);

  // Charger l'arbre
  const fetchTree = useCallback(async () => {
    if (!treeId) return;

    try {
      setLoading(true);
      const response = await api.get(`/api/treebranchleaf-v2/trees/${treeId}`);
      
      // Transformer les nœuds plats en arborescence hiérarchique
      const nodes = response.data.Nodes;
      const buildHierarchy = (parentId: string | null = null): TreeBranchLeafNode[] => {
        return nodes
          .filter((node: TreeBranchLeafNode) => node.parentId === parentId)
          .sort((a: TreeBranchLeafNode, b: TreeBranchLeafNode) => a.order - b.order)
          .map((node: TreeBranchLeafNode) => ({
            ...node,
            children: buildHierarchy(node.id),
          }));
      };

      const treeData = {
        ...response.data,
        Nodes: buildHierarchy(),
      };

      setTree(treeData);
      
      // Initialiser les nœuds visibles au premier niveau
      const rootNodes = treeData.Nodes.filter((node: TreeBranchLeafNode) => 
        node.isActive && node.isVisible
      );
      setVisibleNodes(rootNodes);
      
    } catch (error) {
      logger.error('Erreur lors du chargement de l\'arbre:', error);
      message.error('Erreur lors du chargement du formulaire');
    } finally {
      setLoading(false);
    }
  }, [api, treeId]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Calculer les valeurs dynamiques
  const calculateValues = useCallback(() => {
    if (!tree) return;

    const newCalculatedData: CalculatedData = {};

    // Parcourir tous les nœuds pour calculer les formules
    const processNode = (node: TreeBranchLeafNode) => {
      if (node.type === 'formula' && node.formulaConfig) {
        try {
          let formula = node.formulaConfig.formula;
          
          // Remplacer les variables par leurs valeurs
          if (node.formulaConfig.variables) {
            node.formulaConfig.variables.forEach((variable) => {
              const value = formData[variable] || 0;
              formula = formula.replace(new RegExp(`\\b${variable}\\b`, 'g'), String(value));
            });
          }

          // Évaluer la formule de manière sécurisée (pas d'eval!)
          const cleanFormula = formula.replace(/[^0-9+\-*/().\s]/g, '');
          if (cleanFormula) {
            const result = Function(`"use strict"; return (${cleanFormula})`)();
            newCalculatedData[node.id] = typeof result === 'number' && !isNaN(result) ? result : 'Erreur';
          } else {
            newCalculatedData[node.id] = 'Erreur';
          }
        } catch (error) {
          logger.error('Erreur de calcul pour le nœud', node.id, error);
          newCalculatedData[node.id] = 'Erreur';
        }
      }

      // Traiter les enfants récursivement
      if (node.children) {
        node.children.forEach(processNode);
      }
    };

    tree.Nodes.forEach(processNode);
    setCalculatedData(newCalculatedData);
  }, [tree, formData]);

  useEffect(() => {
    calculateValues();
  }, [calculateValues]);

  // Gérer les changements de valeur
  const handleValueChange = (nodeId: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [nodeId]: value,
    }));

    // Vérifier les conditions pour afficher/masquer des nœuds
    updateVisibleNodes(nodeId, value);
  };

  // Mettre à jour les nœuds visibles selon les conditions
  const updateVisibleNodes = (_changedNodeId: string, _value: string | number | boolean) => {
    if (!tree) return;

    // Logique de condition simple
    // En production, implémenter un moteur de règles plus robuste
    const newVisibleNodes = [...visibleNodes];

    // Parcourir tous les nœuds pour vérifier les conditions
    const checkConditions = (node: TreeBranchLeafNode) => {
      if (node.type === 'condition' && node.conditionConfig) {
        const conditions = node.conditionConfig.conditions;
        let conditionMet = true;

        conditions.forEach(condition => {
          const fieldValue = formData[condition.field];
          
          switch (condition.operator) {
            case 'equals':
              if (fieldValue !== condition.value) conditionMet = false;
              break;
            case 'greater':
              if (Number(fieldValue) <= Number(condition.value)) conditionMet = false;
              break;
            case 'less':
              if (Number(fieldValue) >= Number(condition.value)) conditionMet = false;
              break;
          }
        });

        // Ajouter ou retirer les enfants selon la condition
        if (conditionMet && node.children) {
          node.children.forEach(child => {
            if (!newVisibleNodes.find(n => n.id === child.id)) {
              newVisibleNodes.push(child);
            }
          });
        } else if (!conditionMet && node.children) {
          node.children.forEach(child => {
            const index = newVisibleNodes.findIndex(n => n.id === child.id);
            if (index > -1) {
              newVisibleNodes.splice(index, 1);
            }
          });
        }
      }

      if (node.children) {
        node.children.forEach(checkConditions);
      }
    };

    tree.Nodes.forEach(checkConditions);
    setVisibleNodes(newVisibleNodes);
  };

  // Calculer le progress
  useEffect(() => {
    const totalRequiredFields = visibleNodes.filter(node => 
      node.type === 'leaf' && node.subType === 'field' && node.isRequired
    ).length;

    const completedRequiredFields = visibleNodes.filter(node => 
      node.type === 'leaf' && 
      node.subType === 'field' && 
      node.isRequired && 
      formData[node.id] !== undefined && 
      formData[node.id] !== ''
    ).length;

    const progressPercentage = totalRequiredFields > 0 
      ? Math.round((completedRequiredFields / totalRequiredFields) * 100)
      : 100;

    setProgress(progressPercentage);
  }, [formData, visibleNodes]);

  // Sauvegarder la soumission
  const handleSaveSubmission = async () => {
    if (!tree) return;

    try {
      const submissionData = visibleNodes.map(node => ({
        nodeId: node.id,
        value: String(formData[node.id] || ''),
        calculatedValue: calculatedData[node.id] ? String(calculatedData[node.id]) : undefined,
        metadata: {
          nodeType: node.type,
          nodeSubType: node.subType,
        },
      }));

      await api.post(`/api/treebranchleaf-v2/trees/${tree.id}/submissions`, {
        data: submissionData,
        status: progress === 100 ? 'completed' : 'draft',
      });

      message.success('Réponses sauvegardées avec succès');
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
    }
  };

  // Rendu d'un nœud selon son type
  const renderNode = (node: TreeBranchLeafNode) => {
    if (!node.isVisible || !node.isActive) return null;

    switch (node.type) {
      case 'branch':
        return (
          <Card key={node.id} style={{ marginBottom: '16px' }}>
            <Title level={4}>{node.label}</Title>
            {node.description && <Text type="secondary">{node.description}</Text>}
            {node.children && node.children.map(child => renderNode(child))}
          </Card>
        );

      case 'leaf':
        switch (node.subType) {
          case 'option':
            return (
              <div key={node.id} style={{ marginBottom: '16px' }}>
                <Text strong>
                  {node.label}
                  {node.isRequired && <span style={{ color: 'red' }}> *</span>}
                </Text>
                {node.description && (
                  <div style={{ marginBottom: '8px' }}>
                    <Text type="secondary">{node.description}</Text>
                  </div>
                )}
                <Radio.Group
                  value={formData[node.id]}
                  onChange={(e) => handleValueChange(node.id, e.target.value)}
                >
                  {node.fieldConfig?.options?.map((option, index) => (
                    <Radio key={`item-${index}`} value={option}>
                      {option}
                    </Radio>
                  ))}
                </Radio.Group>
              </div>
            );

          case 'field': {
            const fieldType = node.fieldConfig?.fieldType || 'text';
            return (
              <div key={node.id} style={{ marginBottom: '16px' }}>
                <Text strong>
                  {node.label}
                  {node.isRequired && <span style={{ color: 'red' }}> *</span>}
                </Text>
                {node.description && (
                  <div style={{ marginBottom: '8px' }}>
                    <Text type="secondary">{node.description}</Text>
                  </div>
                )}
                {fieldType === 'text' && (
                  <Input
                    placeholder={node.fieldConfig?.placeholder || 'Saisissez votre réponse'}
                    value={formData[node.id] as string}
                    onChange={(e) => handleValueChange(node.id, e.target.value)}
                  />
                )}
                {fieldType === 'textarea' && (
                  <TextArea
                    rows={4}
                    placeholder={node.fieldConfig?.placeholder || 'Saisissez votre réponse'}
                    value={formData[node.id] as string}
                    onChange={(e) => handleValueChange(node.id, e.target.value)}
                  />
                )}
                {fieldType === 'number' && (
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder={node.fieldConfig?.placeholder || 'Saisissez un nombre'}
                    min={node.fieldConfig?.min}
                    max={node.fieldConfig?.max}
                    value={formData[node.id] as number}
                    onChange={(value) => handleValueChange(node.id, value || 0)}
                  />
                )}
              </div>
            );
          }

          case 'data': {
            const calculatedValue = calculatedData[node.id];
            return (
              <Alert
                key={node.id}
                style={{ marginBottom: '16px' }}
                message={node.label}
                description={
                  <div>
                    {node.description && <div style={{ marginBottom: '8px' }}>{node.description}</div>}
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                      <CalculatorOutlined style={{ marginRight: '8px' }} />
                      {calculatedValue !== undefined ? calculatedValue : 'En attente de calcul...'}
                    </div>
                  </div>
                }
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
              />
            );
          }

          default:
            return (
              <Card key={node.id} style={{ marginBottom: '16px' }}>
                <Text>{node.label}</Text>
                {node.description && <div><Text type="secondary">{node.description}</Text></div>}
              </Card>
            );
        }
        break;

      case 'formula': {
        const formulaResult = calculatedData[node.id];
        return (
          <Card key={node.id} style={{ marginBottom: '16px', borderColor: '#13c2c2' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text strong>{node.label}</Text>
                {node.description && (
                  <div><Text type="secondary">{node.description}</Text></div>
                )}
              </div>
              <Tag color="cyan" style={{ fontSize: '16px', padding: '8px 12px' }}>
                <CalculatorOutlined style={{ marginRight: '4px' }} />
                {formulaResult !== undefined ? formulaResult : 'Calcul...'}
              </Tag>
            </div>
          </Card>
        );
      }

      case 'leaf_repeater': {
        // Récupérer la configuration du repeater depuis metadata
        const repeaterMeta = node.metadata?.repeater || {};
        const templateNodeIds = repeaterMeta.templateNodeIds || [];
        const minItems = repeaterMeta.minItems ?? 1;
        const maxItems = repeaterMeta.maxItems ?? 10;
        const addButtonLabel = repeaterMeta.addButtonLabel || 'Ajouter une entrée';
        // 🎨 Apparence du bouton d'ajout (respecte les réglages du répétiteur)
        const buttonSize: 'tiny' | 'small' | 'middle' | 'large' = (repeaterMeta.buttonSize as unknown) || 'middle';
        const buttonWidth: 'auto' | 'half' | 'full' = (repeaterMeta.buttonWidth as unknown) || 'auto';
        const iconOnly: boolean = !!repeaterMeta.iconOnly;

        // Helpers de style (alignés avec TBLFieldRendererAdvanced)
        const getAntSize = (): 'small' | 'middle' | 'large' => (buttonSize === 'tiny' ? 'small' : (buttonSize as 'small' | 'middle' | 'large'));
        const getAddButtonHeight = () => {
          switch (buttonSize) {
            case 'tiny': return iconOnly ? '28px' : '30px';
            case 'small': return '32px';
            case 'large': return '48px';
            case 'middle':
            default: return '40px';
          }
        };
        const getAddButtonWidth = () => {
          if (iconOnly) {
            switch (buttonSize) {
              case 'tiny': return '28px';
              case 'small': return '32px';
              case 'large': return '48px';
              case 'middle':
              default: return '40px';
            }
          }
          // Gestion simple pour half/full si besoin d'élargir
          if (buttonWidth === 'full') return '100%';
          if (buttonWidth === 'half') return '50%';
          return undefined; // auto -> largeur par défaut
        };
        const getAddButtonFontSize = () => {
          if (iconOnly) {
            switch (buttonSize) {
              case 'tiny': return '14px';
              case 'small': return '16px';
              case 'large': return '20px';
              case 'middle':
              default: return '18px';
            }
          }
          switch (buttonSize) {
            case 'tiny': return '12px';
            case 'small': return '13px';
            case 'large': return '16px';
            case 'middle':
            default: return '14px';
          }
        };

        // État local du repeater (nombre d'instances actuelles)
        const currentInstances = (formData[`${node.id}_instances`] as number) || minItems;

        const handleAddInstance = () => {
          if (currentInstances < maxItems) {
            handleValueChange(`${node.id}_instances`, currentInstances + 1);
          }
        };

        const handleRemoveInstance = (instanceIndex: number) => {
          if (currentInstances > minItems) {
            handleValueChange(`${node.id}_instances`, currentInstances - 1);
            // Supprimer les valeurs de cette instance
            templateNodeIds.forEach((templateId: string) => {
              handleValueChange(`${node.id}_${instanceIndex}_${templateId}`, undefined);
            });
          }
        };

        // Trouver les nœuds templates dans l'arbre
        const findNodeById = (id: string, nodes: TreeBranchLeafNode[]): TreeBranchLeafNode | null => {
          for (const n of nodes) {
            if (n.id === id) return n;
            if (n.children) {
              const found = findNodeById(id, n.children);
              if (found) return found;
            }
          }
          return null;
        };

        const templateNodes = templateNodeIds
          .map((id: string) => findNodeById(id, nodesData || []))
          .filter(Boolean) as TreeBranchLeafNode[];

        return (
          <Card 
            key={node.id} 
            style={{ marginBottom: '16px', borderColor: '#722ed1', borderWidth: 2 }}
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 8 }}>➕</span>
                <Text strong>{node.label}</Text>
              </div>
            }
          >
            {node.description && (
              <div style={{ marginBottom: '16px' }}>
                <Text type="secondary">{node.description}</Text>
              </div>
            )}

            {/* Rendu de chaque instance */}
            {Array.from({ length: currentInstances }).map((_, instanceIndex) => (
              <Card
                key={`instance-${instanceIndex}`}
                type="inner"
                style={{ marginBottom: '12px', backgroundColor: '#fafafa' }}
                title={`Entrée ${instanceIndex + 1}`}
                extra={
                  currentInstances > minItems && (
                    <Button 
                      size="small" 
                      danger 
                      type="text"
                      icon={<MinusCircleOutlined />}
                      onClick={() => handleRemoveInstance(instanceIndex)}
                    >
                      Supprimer
                    </Button>
                  )
                }
              >
                {templateNodes.map((templateNode) => {
                  const instanceFieldId = `${node.id}_${instanceIndex}_${templateNode.id}`;
                  const fieldValue = formData[instanceFieldId];

                  return (
                    <div key={templateNode.id} style={{ marginBottom: '12px' }}>
                      <Text strong>
                        {templateNode.label}
                        {templateNode.isRequired && <span style={{ color: 'red' }}> *</span>}
                      </Text>
                      {templateNode.description && (
                        <div style={{ marginBottom: '8px' }}>
                          <Text type="secondary">{templateNode.description}</Text>
                        </div>
                      )}
                      {/* Rendu selon le type de champ template */}
                      {templateNode.fieldConfig?.fieldType === 'text' && (
                        <Input
                          placeholder={templateNode.fieldConfig?.placeholder || 'Saisissez votre réponse'}
                          value={fieldValue as string}
                          onChange={(e) => handleValueChange(instanceFieldId, e.target.value)}
                        />
                      )}
                      {templateNode.fieldConfig?.fieldType === 'number' && (
                        <InputNumber
                          style={{ width: '100%' }}
                          placeholder={templateNode.fieldConfig?.placeholder || 'Saisissez un nombre'}
                          min={templateNode.fieldConfig?.min}
                          max={templateNode.fieldConfig?.max}
                          value={fieldValue as number}
                          onChange={(value) => handleValueChange(instanceFieldId, value || 0)}
                        />
                      )}
                      {(!templateNode.fieldConfig?.fieldType || templateNode.fieldConfig?.fieldType === 'text') && (
                        <Input
                          placeholder={templateNode.fieldConfig?.placeholder || 'Saisissez votre réponse'}
                          value={fieldValue as string}
                          onChange={(e) => handleValueChange(instanceFieldId, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </Card>
            ))}

            {/* Bouton d'ajout */}
            {currentInstances < maxItems && (
              <Button
                type="dashed"
                block={!iconOnly}
                size={getAntSize()}
                icon={<PlusOutlined />}
                onClick={handleAddInstance}
                style={{
                  marginTop: '12px',
                  height: getAddButtonHeight(),
                  width: getAddButtonWidth(),
                  fontSize: getAddButtonFontSize(),
                  minWidth: iconOnly ? getAddButtonWidth() : undefined,
                  padding: iconOnly ? '0' : undefined,
                  display: iconOnly ? 'inline-flex' : undefined,
                  alignItems: iconOnly ? 'center' : undefined,
                  justifyContent: iconOnly ? 'center' : undefined
                }}
              >
                {!iconOnly && addButtonLabel}
              </Button>
            )}

            {/* Info min/max */}
            <div style={{ marginTop: '8px', textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {minItems === maxItems 
                  ? `Exactement ${minItems} ${minItems === 1 ? 'entrée' : 'entrées'} requise${minItems === 1 ? '' : 's'}`
                  : `Entre ${minItems} et ${maxItems} entrées`
                }
              </Text>
            </div>
          </Card>
        );
      }

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div>Chargement du formulaire...</div>
      </div>
    );
  }

  if (!tree) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div>Formulaire non trouvé</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '24px' }}>
      <Row justify="center">
        <Col xs={24} sm={20} md={16} lg={12} xl={10}>
          {/* En-tête */}
          <Card style={{ marginBottom: '24px', textAlign: 'center' }}>
            <div
              style={{
                width: 40,
                height: 40,
                backgroundColor: tree.color,
                borderRadius: '50%',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '20px',
              }}
            >
              🌳
            </div>
            <Title level={2} style={{ margin: '0 0 8px 0' }}>
              {tree.name}
            </Title>
            {tree.description && (
              <Text type="secondary">{tree.description}</Text>
            )}
            
            <Divider />
            
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Progression: </Text>
              <Progress 
                percent={progress} 
                status={progress === 100 ? 'success' : 'active'}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#52c41a',
                }}
              />
            </div>
          </Card>

          {/* Formulaire */}
          <Card>
            <div style={{ marginBottom: '24px' }}>
              {visibleNodes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#8c8c8c' }}>
                  <InfoCircleOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                  <div>Aucune question à afficher</div>
                  <div>Le formulaire semble vide ou les conditions ne sont pas remplies</div>
                </div>
              ) : (
                visibleNodes.map(node => renderNode(node))
              )}
            </div>

            {/* Actions */}
            <Divider />
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  <Text type="secondary">
                    {Object.keys(formData).length} réponse{Object.keys(formData).length !== 1 ? 's' : ''} saisie{Object.keys(formData).length !== 1 ? 's' : ''}
                  </Text>
                  {progress === 100 && (
                    <Tag color="green">
                      <CheckCircleOutlined />
                      Complet
                    </Tag>
                  )}
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button 
                    type="default" 
                    icon={<SaveOutlined />}
                    onClick={handleSaveSubmission}
                  >
                    Sauvegarder
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<CheckCircleOutlined />}
                    disabled={progress < 100}
                    onClick={handleSaveSubmission}
                  >
                    Terminer
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Debug (à retirer en production) */}
          {process.env.NODE_ENV === 'development' && (
            <Card style={{ marginTop: '24px' }} title="Debug - Données">
              <div style={{ marginBottom: '16px' }}>
                <Text strong>Données du formulaire:</Text>
                <pre style={{ fontSize: '12px', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                  {JSON.stringify(formData, null, 2)}
                </pre>
              </div>
              <div>
                <Text strong>Données calculées:</Text>
                <pre style={{ fontSize: '12px', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                  {JSON.stringify(calculatedData, null, 2)}
                </pre>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default TreeBranchLeafPreviewPage;
