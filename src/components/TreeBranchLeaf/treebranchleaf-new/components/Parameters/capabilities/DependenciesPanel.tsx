/**
 * 🔗 DependenciesPanel - Gestion des dépendances entre champs SELECT et autres champs
 * 
 * Permet de définir quels champs doivent s'afficher/masquer selon la valeur sélectionnée
 * dans un champ SELECT.
 * 
 * Exemple : 
 * - Si "Type de bâtiment" = "Maison" → Afficher "Nombre d'étages"
 * - Si "Type de bâtiment" = "Appartement" → Afficher "Étage de l'appartement"
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Select, 
  message, 
  Space, 
  Divider,
  Tag,
  Empty,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  LinkOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';

const { Text } = Typography;
const { Option } = Select;

interface DependenciesPanelProps {
  treeId?: string;
  nodeId: string;
  nodeType?: string; // Pour vérifier si c'est un SELECT
  selectOptions?: Array<{ label: string; value: string }>; // Options du SELECT si disponibles
  availableFields?: Array<{ id: string; label: string; type: string }>; // Champs disponibles dans l'arbre
  value?: DependencyConfig;
  onChange?: (val: DependencyConfig) => void;
  onNodeUpdate?: (nodeData: { id: string; hasDependencies: boolean }) => Promise<void>;
  readOnly?: boolean;
}

// Structure de configuration des dépendances
export interface DependencyConfig {
  enabled: boolean;
  rules: DependencyRule[];
}

export interface DependencyRule {
  id: string;
  optionValue: string; // Valeur de l'option SELECT qui déclenche
  optionLabel?: string; // Label pour affichage
  action: 'show' | 'hide'; // Action à effectuer
  targetFieldIds: string[]; // IDs des champs cibles
}

const DependenciesPanel: React.FC<DependenciesPanelProps> = ({
  treeId,
  nodeId,
  nodeType,
  selectOptions = [],
  availableFields = [],
  value,
  onChange,
  onNodeUpdate,
  readOnly = false
}) => {
  const { api } = useAuthenticatedApi();
  
  const [config, setConfig] = useState<DependencyConfig>(
    value || { enabled: false, rules: [] }
  );
  const [loading, setLoading] = useState(false);
  const [availableNodes, setAvailableNodes] = useState<Array<{ id: string; label: string; type: string }>>(
    availableFields
  );

  // Charger les nœuds disponibles depuis l'arbre
  useEffect(() => {
    if (treeId && availableFields.length === 0) {
      loadAvailableNodes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeId, availableFields.length]);

  const loadAvailableNodes = async () => {
    if (!treeId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/api/treebranchleaf/trees/${treeId}/nodes`);
      
      // Filtrer pour exclure le nœud courant et ne garder que les champs
      const nodes = (response as Array<{ id: string; label: string; type: string; fieldType?: string }>)
        .filter(node => 
          node.id !== nodeId && 
          (node.type === 'leaf' || node.type === 'branch')
        )
        .map(node => ({
          id: node.id,
          label: node.label || 'Sans nom',
          type: node.fieldType || node.type
        }));
      
      setAvailableNodes(nodes);
    } catch (error) {
      console.error('Erreur lors du chargement des nœuds:', error);
      message.error('Impossible de charger les champs disponibles');
    } finally {
      setLoading(false);
    }
  };

  // Activer/désactiver les dépendances
  const handleToggle = useCallback(async () => {
    const newConfig = { ...config, enabled: !config.enabled };
    setConfig(newConfig);
    onChange?.(newConfig);
    
    // Notifier le parent
    if (onNodeUpdate) {
      await onNodeUpdate({ 
        id: nodeId, 
        hasDependencies: newConfig.enabled && newConfig.rules.length > 0 
      });
    }
    
    message.success(newConfig.enabled ? 'Dépendances activées' : 'Dépendances désactivées');
  }, [config, nodeId, onChange, onNodeUpdate]);

  // Ajouter une nouvelle règle
  const handleAddRule = useCallback(() => {
    if (selectOptions.length === 0) {
      message.warning('Aucune option SELECT disponible. Ajoutez d\'abord des options au champ.');
      return;
    }
    
    const newRule: DependencyRule = {
      id: `rule_${Date.now()}`,
      optionValue: selectOptions[0].value,
      optionLabel: selectOptions[0].label,
      action: 'show',
      targetFieldIds: []
    };
    
    const newConfig = {
      ...config,
      rules: [...config.rules, newRule]
    };
    
    setConfig(newConfig);
    onChange?.(newConfig);
  }, [config, selectOptions, onChange]);

  // Supprimer une règle
  const handleDeleteRule = useCallback((ruleId: string) => {
    const newConfig = {
      ...config,
      rules: config.rules.filter(r => r.id !== ruleId)
    };
    
    setConfig(newConfig);
    onChange?.(newConfig);
    message.success('Règle supprimée');
  }, [config, onChange]);

  // Modifier une règle
  const handleUpdateRule = useCallback((ruleId: string, updates: Partial<DependencyRule>) => {
    const newConfig = {
      ...config,
      rules: config.rules.map(r => 
        r.id === ruleId ? { ...r, ...updates } : r
      )
    };
    
    setConfig(newConfig);
    onChange?.(newConfig);
  }, [config, onChange]);

  // Vérifier si c'est bien un SELECT
  if (nodeType && nodeType !== 'SELECT' && nodeType !== 'branch') {
    return (
      <Card>
        <Alert
          message="Type de champ incompatible"
          description="Les dépendances ne sont disponibles que pour les champs de type SELECT."
          type="warning"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <LinkOutlined />
          <span>Dépendances conditionnelles</span>
        </Space>
      }
      extra={
        <Button
          type={config.enabled ? 'primary' : 'default'}
          onClick={handleToggle}
          disabled={readOnly}
        >
          {config.enabled ? 'Activé' : 'Désactivé'}
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert
          message="Configuration des dépendances"
          description="Définissez quels champs doivent apparaître ou disparaître selon la valeur sélectionnée dans ce SELECT."
          type="info"
          showIcon
        />

        {config.enabled && (
          <>
            <Divider orientation="left">
              <Space>
                <Text strong>Règles de dépendance</Text>
                <Tag color="blue">{config.rules.length}</Tag>
              </Space>
            </Divider>

            {config.rules.length === 0 ? (
              <Empty
                description="Aucune règle définie"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddRule}
                  disabled={readOnly || selectOptions.length === 0}
                >
                  Ajouter une règle
                </Button>
              </Empty>
            ) : (
              <>
                {config.rules.map((rule, index) => (
                  <Card
                    key={rule.id}
                    size="small"
                    title={`Règle ${index + 1}`}
                    extra={
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteRule(rule.id)}
                        disabled={readOnly}
                      />
                    }
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {/* Sélection de l'option qui déclenche */}
                      <div>
                        <Text type="secondary">Quand l'option sélectionnée est :</Text>
                        <Select
                          style={{ width: '100%', marginTop: 8 }}
                          value={rule.optionValue}
                          onChange={(val) => {
                            const option = selectOptions.find(o => o.value === val);
                            handleUpdateRule(rule.id, {
                              optionValue: val,
                              optionLabel: option?.label
                            });
                          }}
                          disabled={readOnly}
                        >
                          {selectOptions.map(opt => (
                            <Option key={opt.value} value={opt.value}>
                              {opt.label}
                            </Option>
                          ))}
                        </Select>
                      </div>

                      {/* Action (afficher/masquer) */}
                      <div>
                        <Text type="secondary">Action :</Text>
                        <Select
                          style={{ width: '100%', marginTop: 8 }}
                          value={rule.action}
                          onChange={(val) => handleUpdateRule(rule.id, { action: val })}
                          disabled={readOnly}
                        >
                          <Option value="show">
                            <Space>
                              <EyeOutlined />
                              <span>Afficher les champs</span>
                            </Space>
                          </Option>
                          <Option value="hide">
                            <Space>
                              <EyeInvisibleOutlined />
                              <span>Masquer les champs</span>
                            </Space>
                          </Option>
                        </Select>
                      </div>

                      {/* Sélection des champs cibles */}
                      <div>
                        <Text type="secondary">Champs concernés :</Text>
                        <Select
                          mode="multiple"
                          style={{ width: '100%', marginTop: 8 }}
                          placeholder="Sélectionnez les champs..."
                          value={rule.targetFieldIds}
                          onChange={(vals) => handleUpdateRule(rule.id, { targetFieldIds: vals })}
                          disabled={readOnly}
                          loading={loading}
                          filterOption={(input, option) =>
                            (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                          }
                        >
                          {availableNodes.map(node => (
                            <Option key={node.id} value={node.id}>
                              {node.label} <Text type="secondary">({node.type})</Text>
                            </Option>
                          ))}
                        </Select>
                        
                        {rule.targetFieldIds.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <Space wrap>
                              {rule.targetFieldIds.map(fieldId => {
                                const field = availableNodes.find(n => n.id === fieldId);
                                return field ? (
                                  <Tag key={fieldId} color="blue">
                                    {field.label}
                                  </Tag>
                                ) : null;
                              })}
                            </Space>
                          </div>
                        )}
                      </div>
                    </Space>
                  </Card>
                ))}

                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={handleAddRule}
                  disabled={readOnly || selectOptions.length === 0}
                >
                  Ajouter une règle
                </Button>
              </>
            )}
          </>
        )}

        {!config.enabled && (
          <Alert
            message="Dépendances désactivées"
            description="Activez les dépendances pour commencer à définir des règles."
            type="default"
          />
        )}
      </Space>
    </Card>
  );
};

export default DependenciesPanel;
