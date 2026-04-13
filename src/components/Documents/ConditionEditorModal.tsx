import { useState, useEffect, useRef } from 'react';
import { Modal, Form, Select, Input, Space, Button, message, Radio, Divider, Alert, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined, NodeIndexOutlined } from '@ant-design/icons';
import NodeTreeSelector, { NodeTreeSelectorValue } from '../TreeBranchLeaf/treebranchleaf-new/components/Parameters/shared/NodeTreeSelector';
import { useTranslation } from 'react-i18next';
import { logger } from '../../lib/logger';

const { Text } = Typography;

export type ConditionRule = {
  id: string;
  action: 'SHOW' | 'HIDE' | 'ADD_CONTENT';
  operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'NOT_CONTAINS' | 'GREATER_THAN' | 'LESS_THAN' | 'GREATER_OR_EQUAL' | 'LESS_OR_EQUAL' | 'IS_EMPTY' | 'IS_NOT_EMPTY';
  fieldRef: string; // Référence TBL (@value.xxx) ou variable client ({lead.xxx})
  compareValue: string | number;
  logicOperator?: 'AND' | 'OR'; // Pour chaîner plusieurs conditions
};

export type ConditionalConfig = {
  enabled: boolean;
  rules: ConditionRule[];
  addContent?: string; // Contenu à ajouter si action = ADD_CONTENT
  showContent?: string; // Contenu à afficher si action = SHOW et condition vraie
  hideContent?: string; // Contenu alternatif si condition fausse
};

interface ConditionEditorModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (config: ConditionalConfig) => void;
  initialConfig?: ConditionalConfig;
  nodeId?: string; // Pour NodeTreeSelector
}

const OPERATORS = [
  { value: 'EQUALS', label: '= Égal à', icon: '=' },
  { value: 'NOT_EQUALS', label: '≠ Différent de', icon: '≠' },
  { value: 'CONTAINS', label: '⊃ Contient', icon: '⊃' },
  { value: 'NOT_CONTAINS', label: '⊅ Ne contient pas', icon: '⊅' },
  { value: 'GREATER_THAN', label: '> Supérieur à', icon: '>' },
  { value: 'LESS_THAN', label: '< Inférieur à', icon: '<' },
  { value: 'GREATER_OR_EQUAL', label: '≥ Supérieur ou égal', icon: '≥' },
  { value: 'LESS_OR_EQUAL', label: '≤ Inférieur ou égal', icon: '≤' },
  { value: 'IS_EMPTY', label: '∅ Est vide', icon: '∅' },
  { value: 'IS_NOT_EMPTY', label: '∃ N\'est pas vide', icon: '∃' }
];

const ConditionEditorModal = ({ open, onClose, onSave, initialConfig, nodeId }: ConditionEditorModalProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [rules, setRules] = useState<ConditionRule[]>(initialConfig?.rules || []);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [currentRuleIndex, setCurrentRuleIndex] = useState<number | null>(null);
  const [action, setAction] = useState<'SHOW' | 'HIDE' | 'ADD_CONTENT'>(initialConfig?.rules[0]?.action || 'SHOW');
  // Pour insérer des variables dans les champs de contenu
  const [contentFieldTarget, setContentFieldTarget] = useState<'showContent' | 'addContent' | 'hideContent' | null>(null);
  const showContentRef = useRef<any>(null);
  const addContentRef = useRef<any>(null);
  const hideContentRef = useRef<any>(null);

  useEffect(() => {
    if (initialConfig) {
      setRules(initialConfig.rules);
      setAction(initialConfig.rules[0]?.action || 'SHOW');
      form.setFieldsValue({
        enabled: initialConfig.enabled,
        action: initialConfig.rules[0]?.action || 'SHOW',
        addContent: initialConfig.addContent,
        showContent: initialConfig.showContent,
        hideContent: initialConfig.hideContent,
      });
    }
  }, [initialConfig, form]);

  // Reset form quand le modal s'ouvre
  useEffect(() => {
    if (open && !initialConfig) {
      form.resetFields();
      setRules([]);
      setAction('SHOW');
    }
  }, [open, initialConfig, form]);

  const handleAddRule = () => {
    const newRule: ConditionRule = {
      id: `rule-${Date.now()}`,
      action,
      operator: 'EQUALS',
      fieldRef: '',
      compareValue: '',
      logicOperator: rules.length > 0 ? 'AND' : undefined
    };
    setRules([...rules, newRule]);
  };

  const handleRemoveRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
  };

  const handleRuleChange = (index: number, field: keyof ConditionRule, value: unknown) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
  };

  const openTreeSelectorForRule = (index: number) => {
    setCurrentRuleIndex(index);
    setContentFieldTarget(null);
    setSelectorOpen(true);
  };

  const openTreeSelectorForContent = (field: 'showContent' | 'addContent' | 'hideContent') => {
    setContentFieldTarget(field);
    setCurrentRuleIndex(null);
    setSelectorOpen(true);
  };

  const handleTreeSelect = (val: NodeTreeSelectorValue) => {
    // Si c'est pour un champ de règle (condition)
    if (currentRuleIndex !== null) {
      handleRuleChange(currentRuleIndex, 'fieldRef', val.ref);
      setSelectorOpen(false);
      setCurrentRuleIndex(null);
      message.success('Champ sélectionné');
    }
    // Si c'est pour un champ de contenu (showContent, addContent, hideContent)
    else if (contentFieldTarget) {
      const currentValue = form.getFieldValue(contentFieldTarget) || '';
      const newValue = currentValue + val.ref;
      form.setFieldValue(contentFieldTarget, newValue);
      setSelectorOpen(false);
      setContentFieldTarget(null);
      message.success('Variable insérée');
    }
  };

  const handleSave = () => {
    form.validateFields().then(() => {
      if (rules.length === 0) {
        message.warning('Ajoutez au moins une condition');
        return;
      }

      const hasEmptyFields = rules.some(r => !r.fieldRef || (r.operator !== 'IS_EMPTY' && r.operator !== 'IS_NOT_EMPTY' && r.compareValue === '' && r.compareValue !== 0));
      if (hasEmptyFields) {
        message.warning('Remplissez tous les champs des conditions');
        return;
      }

      const config: ConditionalConfig = {
        enabled: true,
        rules: rules.map(r => ({ ...r, action })),
        addContent: action === 'ADD_CONTENT' ? form.getFieldValue('addContent') : undefined,
        showContent: action === 'SHOW' ? form.getFieldValue('showContent') : undefined,
        hideContent: form.getFieldValue('hideContent'),
      };

      logger.debug('💾 [ConditionEditorModal] Sauvegarde config:', config);
      onSave(config);
      onClose();
    });
  };

  return (
    <>
      <Modal
        title="⚡ Configuration des Conditions"
        open={open}
        onCancel={onClose}
        onOk={handleSave}
        width={800}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="action"
            label="Action à effectuer"
            initialValue="SHOW"
          >
            <Radio.Group onChange={(e) => setAction(e.target.value)} value={action}>
              <Radio.Button value="SHOW">👁️ Afficher si condition vraie</Radio.Button>
              <Radio.Button value="HIDE">🚫 Masquer si condition vraie</Radio.Button>
              <Radio.Button value="ADD_CONTENT">➕ Ajouter du contenu si condition vraie</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {/* Explication de l'action sélectionnée */}
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginBottom: 16 }}
            message={
              action === 'SHOW' ? (
                <Text>Ce module sera <strong>affiché uniquement si</strong> les conditions ci-dessous sont remplies.</Text>
              ) : action === 'HIDE' ? (
                <Text>Ce module sera <strong>masqué si</strong> les conditions ci-dessous sont remplies.</Text>
              ) : (
                <Text>Du <strong>contenu supplémentaire</strong> sera ajouté si les conditions sont remplies.</Text>
              )
            }
          />

          {/* Champ pour SHOW - Contenu optionnel à afficher si condition vraie */}
          {action === 'SHOW' && (
            <Form.Item
              name="showContent"
              label={
                <Space>
                  📝 Texte à afficher (optionnel)
                  <Button
                    size="small"
                    icon={<NodeIndexOutlined />}
                    onClick={() => openTreeSelectorForContent('showContent')}
                  >
                    Insérer variable
                  </Button>
                </Space>
              }
              tooltip="Si renseigné, ce texte remplacera le contenu par défaut du module quand la condition est vraie"
              initialValue={initialConfig?.showContent}
            >
              <Input.TextArea 
                ref={showContentRef}
                rows={2} 
                placeholder="Laissez vide pour afficher le contenu normal du module, ou entrez un texte alternatif..." 
              />
            </Form.Item>
          )}

          {/* Champ pour ADD_CONTENT */}
          {action === 'ADD_CONTENT' && (
            <Form.Item
              name="addContent"
              label={
                <Space>
                  📝 Contenu à ajouter
                  <Button
                    size="small"
                    icon={<NodeIndexOutlined />}
                    onClick={() => openTreeSelectorForContent('addContent')}
                  >
                    Insérer variable
                  </Button>
                </Space>
              }
              tooltip="Ce texte sera inséré dans le document si les conditions sont remplies"
              rules={[{ required: true, message: 'Ce champ est requis pour cette action' }]}
              initialValue={initialConfig?.addContent}
            >
              <Input.TextArea ref={addContentRef} rows={3} placeholder="Ex: Section Premium, Réduction spéciale, TVA 21% applicable..." />
            </Form.Item>
          )}

          {/* Contenu alternatif si condition fausse (pour SHOW et ADD_CONTENT) */}
          {(action === 'SHOW' || action === 'ADD_CONTENT') && (
            <Form.Item
              name="hideContent"
              label={
                <Space>
                  📝 Texte alternatif si condition fausse (optionnel)
                  <Button
                    size="small"
                    icon={<NodeIndexOutlined />}
                    onClick={() => openTreeSelectorForContent('hideContent')}
                  >
                    Insérer variable
                  </Button>
                </Space>
              }
              tooltip="Ce texte sera affiché si la condition n'est PAS remplie"
              initialValue={initialConfig?.hideContent}
            >
              <Input.TextArea 
                ref={hideContentRef}
                rows={2} 
                placeholder="Ex: Texte par défaut, ou laissez vide pour ne rien afficher..." 
              />
            </Form.Item>
          )}

          <Divider>Conditions ({rules.length})</Divider>

          {rules.map((rule, index) => (
            <div
              key={rule.id}
              style={{
                padding: '16px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                marginBottom: '12px'
              }}
            >
              {index > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <Select
                    value={rule.logicOperator}
                    onChange={(val) => handleRuleChange(index, 'logicOperator', val)}
                    style={{ width: '100px' }}
                    size="small"
                  >
                    <Select.Option value="AND">ET</Select.Option>
                    <Select.Option value="OR">OU</Select.Option>
                  </Select>
                </div>
              )}

              <Space direction="vertical" style={{ width: '100%' }}>
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    value={rule.fieldRef}
                    placeholder="Champ TBL"
                    style={{ flex: 1 }}
                    readOnly
                  />
                  <Button
                    onClick={() => openTreeSelectorForRule(index)}
                    disabled={!nodeId}
                  >
                    🌳 TBL
                  </Button>
                </Space.Compact>

                <Select
                  value={rule.operator}
                  onChange={(val) => handleRuleChange(index, 'operator', val)}
                  style={{ width: '100%' }}
                  placeholder="Opérateur"
                >
                  {OPERATORS.map(op => (
                    <Select.Option key={op.value} value={op.value}>
                      {op.icon} {op.label}
                    </Select.Option>
                  ))}
                </Select>

                {!['IS_EMPTY', 'IS_NOT_EMPTY'].includes(rule.operator) && (
                  <Input
                    value={rule.compareValue}
                    onChange={(e) => handleRuleChange(index, 'compareValue', e.target.value)}
                    placeholder="Valeur de comparaison"
                  />
                )}

                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveRule(index)}
                  style={{ alignSelf: 'flex-end' }}
                >
                  Supprimer condition
                </Button>
              </Space>
            </div>
          ))}

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddRule}
            block
            style={{ marginTop: '12px' }}
          >
            Ajouter une condition
          </Button>

          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#e6f7ff', borderRadius: '4px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#0050b3' }}>
              💡 <strong>Exemples :</strong>
            </p>
            <ul style={{ fontSize: '12px', color: '#0050b3', marginBottom: 0 }}>
              <li>Si @value.clientType = "Premium" → Afficher section tarifs spéciaux</li>
              <li>Si @value.budget {'>'} 10000 ET @value.pays = "Belgique" → Ajouter TVA 21%</li>
              <li>Si @value.urgence = "Oui" → Ajouter mention "Traitement prioritaire"</li>
            </ul>
          </div>
        </Form>
      </Modal>

      {nodeId && (
        <NodeTreeSelector
          nodeId={nodeId}
          open={selectorOpen}
          onClose={() => {
            setSelectorOpen(false);
            setCurrentRuleIndex(null);
          }}
          onSelect={handleTreeSelect}
        />
      )}
    </>
  );
};

export default ConditionEditorModal;
