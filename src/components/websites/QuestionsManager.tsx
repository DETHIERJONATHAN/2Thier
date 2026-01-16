/**
 * 📋 QUESTIONS MANAGER - Gestion des Questions Style Simulateur
 * 
 * Interface 100% visuelle - AUCUN JSON à éditer !
 * Parfait pour les utilisateurs non-techniques.
 * 
 * @module QuestionsManager
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Tag,
  Form,
  Input,
  Select,
  Switch,
  message,
  Empty,
  Tooltip,
  Popconfirm,
  Typography,
  Row,
  Col,
  Divider,
  Badge,
  InputNumber,
  Alert,
  Card,
  Upload,
  Image
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  QuestionCircleOutlined,
  PictureOutlined,
  BranchesOutlined,
  EyeOutlined,
  MinusCircleOutlined,
  UploadOutlined,
  LinkOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import NodeTreeSelector, { NodeTreeSelectorValue } from '../TreeBranchLeaf/treebranchleaf-new/components/Parameters/shared/NodeTreeSelector';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

// ==================== TYPES ====================
interface FormQuestion {
  id: number;
  formId: number;
  questionKey: string;
  questionType: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  order: number;
  options?: QuestionOption[];
  navigation?: NavigationRule[];
  defaultNextQuestionKey?: string;
  isRequired: boolean;
  placeholder?: string;
  validationRules?: any;
  createdAt: string;
  updatedAt: string;
}

interface QuestionOption {
  value: string;
  label: string;
  icon?: string;
  imageUrl?: string;
  description?: string;
  tblNodeId?: string;    // ID du nœud TBL pour mapper cette réponse
  tblNodeLabel?: string; // Label du nœud TBL (pour affichage)
}

interface NavigationRule {
  answerValue: string;
  nextQuestionKey: string;
}

interface WebsiteForm {
  id: number;
  name: string;
  slug: string;
  startQuestionKey?: string;
  treeId?: string;  // ID de l'arbre TBL pour le mapping
  _count?: {
    questions: number;
    steps: number;
    submissions: number;
  };
}

interface QuestionsManagerModalProps {
  visible: boolean;
  onClose: () => void;
  form: WebsiteForm | null;
  api: any;
  onUpdate: () => void;
}

// Types de questions disponibles
const QUESTION_TYPES = [
  { value: 'single_choice', label: '📊 Choix unique (cartes)', description: 'Une seule option sélectionnable' },
  { value: 'multiple_choice', label: '☑️ Choix multiple', description: 'Plusieurs options sélectionnables' },
  { value: 'text', label: '📝 Texte court', description: 'Champ de texte simple' },
  { value: 'textarea', label: '📄 Texte long', description: 'Zone de texte multiligne' },
  { value: 'number', label: '🔢 Nombre', description: 'Valeur numérique' },
  { value: 'email', label: '📧 Email', description: 'Adresse email' },
  { value: 'phone', label: '📱 Téléphone', description: 'Numéro de téléphone' },
  { value: 'date', label: '📅 Date', description: 'Sélecteur de date' },
  { value: 'slider', label: '🎚️ Slider', description: 'Curseur pour valeurs' },
  { value: 'info', label: 'ℹ️ Information', description: 'Écran informatif' },
];

// Icônes suggérées
const SUGGESTED_ICONS = ['🏠', '🏢', '🔥', '⚡', '🛢️', '🌡️', '❄️', '☀️', '💨', '🌳', '💧', '🔧', '📍', '📧', '📱', '👤', '👥', '💰', '📊', '✅', '❌', '⭐', '🎯', '🏆'];

// ==================== COMPOSANT ÉDITEUR D'OPTIONS ====================
interface OptionsEditorProps {
  value?: QuestionOption[];
  onChange?: (options: QuestionOption[]) => void;
  formId?: number; // Pour l'upload d'images
  tblRootNodeId?: string; // Pour le NodeTreeSelector
}

const OptionsEditor: React.FC<OptionsEditorProps> = ({ value = [], onChange, formId: _formId, tblRootNodeId }) => {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [nodeTreeSelectorOpen, setNodeTreeSelectorOpen] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  
  const handleAdd = () => {
    const newOption: QuestionOption = {
      value: `option_${value.length + 1}`,
      label: '',
      icon: ''
    };
    onChange?.([...value, newOption]);
  };

  const handleRemove = (index: number) => {
    const newOptions = value.filter((_, i) => i !== index);
    onChange?.(newOptions);
  };

  const handleChange = (index: number, field: keyof QuestionOption, fieldValue: string | undefined) => {
    const newOptions = [...value];
    newOptions[index] = { ...newOptions[index], [field]: fieldValue };
    onChange?.(newOptions);
  };

  // Upload d'image pour une option
  const handleImageUpload = async (file: File, index: number) => {
    try {
      setUploadingIndex(index);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('category', 'general');
      
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload');
      }

      const data = await response.json();
      handleChange(index, 'imageUrl', data.file?.fileUrl || data.url);
      message.success('Image uploadée !');
    } catch (error) {
      console.error('Erreur upload:', error);
      message.error('Échec de l\'upload');
    } finally {
      setUploadingIndex(null);
    }
  };

  // Sélection d'un nœud TBL pour le mapping
  const handleTblNodeSelect = (selection: NodeTreeSelectorValue) => {
    if (selectedOptionIndex !== null) {
      const newOptions = [...value];
      newOptions[selectedOptionIndex] = {
        ...newOptions[selectedOptionIndex],
        tblNodeId: selection.ref,
        tblNodeLabel: selection.ref // Le label sera affiché depuis la ref
      };
      onChange?.(newOptions);
      setNodeTreeSelectorOpen(false);
      setSelectedOptionIndex(null);
      message.success('Mapping TBL configuré !');
    }
  };

  return (
    <div style={{ background: '#fafafa', padding: '12px', borderRadius: '8px' }}>
      <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>Options de réponse</Text>
        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAdd}>
          Ajouter une option
        </Button>
      </div>
      
      {value.length === 0 ? (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
          description="Aucune option. Cliquez sur 'Ajouter une option'" 
          style={{ margin: '8px 0' }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {value.map((option, index) => (
            <Card 
              key={index} 
              size="small" 
              style={{ background: 'white' }}
              bodyStyle={{ padding: '12px' }}
            >
              {/* Ligne 1: Icône, Label, Valeur */}
              <Row gutter={8} align="middle" style={{ marginBottom: '8px' }}>
                <Col span={3}>
                  <Select
                    value={option.icon}
                    onChange={(v) => handleChange(index, 'icon', v)}
                    placeholder="🎯"
                    style={{ width: '100%' }}
                    allowClear
                  >
                    {SUGGESTED_ICONS.map(icon => (
                      <Select.Option key={icon} value={icon}>{icon}</Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col span={10}>
                  <Input
                    value={option.label}
                    onChange={(e) => handleChange(index, 'label', e.target.value)}
                    placeholder="Texte affiché (ex: Chaudière gaz)"
                  />
                </Col>
                <Col span={7}>
                  <Input
                    value={option.value}
                    onChange={(e) => handleChange(index, 'value', e.target.value)}
                    placeholder="Valeur (ex: gaz)"
                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                  />
                </Col>
                <Col span={4} style={{ textAlign: 'right' }}>
                  <Button 
                    type="text" 
                    danger 
                    icon={<MinusCircleOutlined />}
                    onClick={() => handleRemove(index)}
                  />
                </Col>
              </Row>
              
              {/* Ligne 2: Image + Mapping TBL */}
              <Row gutter={8} align="middle">
                <Col span={12}>
                  <Space size="small">
                    {option.imageUrl ? (
                      <Space>
                        <Image
                          src={option.imageUrl}
                          alt={option.label}
                          width={32}
                          height={32}
                          style={{ objectFit: 'cover', borderRadius: '4px' }}
                        />
                        <Button 
                          size="small" 
                          danger 
                          type="text"
                          onClick={() => handleChange(index, 'imageUrl', undefined)}
                        >
                          ✕
                        </Button>
                      </Space>
                    ) : (
                      <Upload
                        accept="image/*"
                        showUploadList={false}
                        beforeUpload={(file) => {
                          handleImageUpload(file, index);
                          return false;
                        }}
                      >
                        <Button 
                          size="small" 
                          icon={<UploadOutlined />}
                          loading={uploadingIndex === index}
                        >
                          Image
                        </Button>
                      </Upload>
                    )}
                    <Input
                      size="small"
                      value={option.imageUrl || ''}
                      onChange={(e) => handleChange(index, 'imageUrl', e.target.value)}
                      placeholder="ou coller URL"
                      style={{ width: '150px' }}
                      prefix={<PictureOutlined style={{ color: '#999' }} />}
                    />
                  </Space>
                </Col>
                <Col span={12}>
                  {tblRootNodeId ? (
                    <Space size="small">
                      <Text type="secondary" style={{ fontSize: '12px' }}>Mapping TBL:</Text>
                      {option.tblNodeId ? (
                        <Tag 
                          color="blue" 
                          closable 
                          onClose={() => {
                            handleChange(index, 'tblNodeId', undefined);
                            handleChange(index, 'tblNodeLabel', undefined);
                          }}
                          style={{ fontSize: '11px' }}
                        >
                          <LinkOutlined /> {option.tblNodeId.substring(0, 20)}...
                        </Tag>
                      ) : (
                        <Button 
                          size="small" 
                          type="dashed"
                          icon={<LinkOutlined />}
                          onClick={() => {
                            setSelectedOptionIndex(index);
                            setNodeTreeSelectorOpen(true);
                          }}
                        >
                          Lier TBL
                        </Button>
                      )}
                    </Space>
                  ) : (
                    <Tooltip title="Configurez d'abord un arbre TBL dans les paramètres du formulaire">
                      <Text type="secondary" style={{ fontSize: '11px', color: '#999' }}>
                        <InfoCircleOutlined /> Pas de TBL
                      </Text>
                    </Tooltip>
                  )}
                </Col>
              </Row>
            </Card>
          ))}
        </div>
      )}
      
      {/* NodeTreeSelector Modal */}
      {tblRootNodeId && (
        <NodeTreeSelector
          nodeId={tblRootNodeId}
          open={nodeTreeSelectorOpen}
          onClose={() => {
            setNodeTreeSelectorOpen(false);
            setSelectedOptionIndex(null);
          }}
          onSelect={handleTblNodeSelect}
          selectionContext="token"
        />
      )}
    </div>
  );
};


// ==================== COMPOSANT ÉDITEUR DE NAVIGATION ====================
interface NavigationEditorProps {
  value?: NavigationRule[];
  onChange?: (rules: NavigationRule[]) => void;
  options?: QuestionOption[];
  allQuestions: FormQuestion[];
  currentQuestionId?: number;
}

const NavigationEditor: React.FC<NavigationEditorProps> = ({ 
  value = [], 
  onChange, 
  options = [],
  allQuestions,
  currentQuestionId 
}) => {
  const availableQuestions = allQuestions.filter(q => q.id !== currentQuestionId);

  const handleAdd = () => {
    const newRule: NavigationRule = {
      answerValue: '',
      nextQuestionKey: ''
    };
    onChange?.([...value, newRule]);
  };

  const handleRemove = (index: number) => {
    const newRules = value.filter((_, i) => i !== index);
    onChange?.(newRules);
  };

  const handleChange = (index: number, field: keyof NavigationRule, fieldValue: string) => {
    const newRules = [...value];
    newRules[index] = { ...newRules[index], [field]: fieldValue };
    onChange?.(newRules);
  };

  return (
    <div style={{ background: '#f0f5ff', padding: '12px', borderRadius: '8px' }}>
      <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <BranchesOutlined style={{ color: '#1890ff' }} />
          <Text strong>Navigation conditionnelle</Text>
        </Space>
        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAdd}>
          Ajouter une règle
        </Button>
      </div>

      <Alert
        type="info"
        showIcon={false}
        message={
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Si l'utilisateur choisit une réponse spécifique, il sera dirigé vers la question correspondante.
          </Text>
        }
        style={{ marginBottom: '8px', padding: '4px 8px' }}
      />
      
      {value.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '12px', color: '#999' }}>
          Pas de navigation conditionnelle. La question suivante par défaut sera utilisée.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {value.map((rule, index) => (
            <Card 
              key={index} 
              size="small" 
              style={{ background: 'white' }}
              bodyStyle={{ padding: '8px 12px' }}
            >
              <Row gutter={8} align="middle">
                <Col span={2}>
                  <Text type="secondary">Si</Text>
                </Col>
                <Col span={8}>
                  <Select
                    value={rule.answerValue}
                    onChange={(v) => handleChange(index, 'answerValue', v)}
                    placeholder="Réponse choisie..."
                    style={{ width: '100%' }}
                  >
                    {options.map(opt => (
                      <Select.Option key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label || opt.value}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col span={3} style={{ textAlign: 'center' }}>
                  <ArrowRightOutlined style={{ color: '#1890ff' }} />
                  <Text type="secondary" style={{ marginLeft: '4px' }}>alors</Text>
                </Col>
                <Col span={9}>
                  <Select
                    value={rule.nextQuestionKey}
                    onChange={(v) => handleChange(index, 'nextQuestionKey', v)}
                    placeholder="Aller vers la question..."
                    style={{ width: '100%' }}
                    showSearch
                    optionFilterProp="children"
                  >
                    {availableQuestions.map(q => (
                      <Select.Option key={q.questionKey} value={q.questionKey}>
                        {q.questionKey} - {q.title.substring(0, 30)}...
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col span={2} style={{ textAlign: 'right' }}>
                  <Button 
                    type="text" 
                    danger 
                    icon={<MinusCircleOutlined />}
                    onClick={() => handleRemove(index)}
                  />
                </Col>
              </Row>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== COMPOSANT PRINCIPAL ====================
const QuestionsManagerModal: React.FC<QuestionsManagerModalProps> = ({
  visible,
  onClose,
  form: websiteForm,
  api,
  onUpdate
}) => {
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<FormQuestion | null>(null);
  const [navigationModalVisible, setNavigationModalVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<FormQuestion | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  
  const [questionForm] = Form.useForm();

  // Upload d'image pour la question
  const handleQuestionImageUpload = async (file: File) => {
    try {
      setImageUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('category', 'general');
      
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload');
      }

      const data = await response.json();
      const imageUrl = data.file?.fileUrl || data.url;
      questionForm.setFieldValue('imageUrl', imageUrl);
      message.success('Image uploadée !');
    } catch (error) {
      console.error('Erreur upload:', error);
      message.error('Échec de l\'upload');
    } finally {
      setImageUploading(false);
    }
  };

  // Charger les questions
  const fetchQuestions = useCallback(async () => {
    if (!websiteForm) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/website-forms/${websiteForm.id}/questions`);
      setQuestions(response || []);
    } catch (error) {
      console.error('Erreur chargement questions:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [api, websiteForm]);

  useEffect(() => {
    if (visible && websiteForm) {
      fetchQuestions();
    }
  }, [visible, websiteForm, fetchQuestions]);

  // ==================== HANDLERS ====================
  const handleAddQuestion = () => {
    setEditingQuestion(null);
    questionForm.resetFields();
    questionForm.setFieldsValue({
      order: questions.length + 1,
      isRequired: true,
      questionType: 'single_choice',
      options: []
    });
    setQuestionModalVisible(true);
  };

  const handleEditQuestion = (question: FormQuestion) => {
    setEditingQuestion(question);
    questionForm.setFieldsValue({
      questionKey: question.questionKey,
      questionType: question.questionType,
      title: question.title,
      subtitle: question.subtitle,
      imageUrl: question.imageUrl,
      order: question.order,
      options: question.options || [],
      defaultNextQuestionKey: question.defaultNextQuestionKey,
      isRequired: question.isRequired,
      placeholder: question.placeholder
    });
    setQuestionModalVisible(true);
  };

  const handleSaveQuestion = async (values: any) => {
    if (!websiteForm) return;
    
    try {
      // Filtrer les options vides
      const cleanedOptions = (values.options || []).filter((opt: QuestionOption) => opt.label || opt.value);

      const payload = {
        ...values,
        options: cleanedOptions.length > 0 ? cleanedOptions : null
      };

      if (editingQuestion) {
        await api.put(`/api/website-forms/questions/${editingQuestion.id}`, payload);
        message.success('Question mise à jour');
      } else {
        await api.post(`/api/website-forms/${websiteForm.id}/questions`, payload);
        message.success('Question créée');
      }
      
      setQuestionModalVisible(false);
      fetchQuestions();
      onUpdate();
    } catch (err: any) {
      message.error(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    try {
      await api.delete(`/api/website-forms/questions/${questionId}`);
      message.success('Question supprimée');
      fetchQuestions();
      onUpdate();
    } catch {
      message.error('Erreur lors de la suppression');
    }
  };

  const handleManageNavigation = (question: FormQuestion) => {
    setSelectedQuestion(question);
    setNavigationModalVisible(true);
  };

  const handleSaveNavigation = async (values: any) => {
    if (!selectedQuestion) return;
    
    try {
      // Filtrer les règles incomplètes
      const cleanedNavigation = (values.navigation || []).filter(
        (rule: NavigationRule) => rule.answerValue && rule.nextQuestionKey
      );

      await api.put(`/api/website-forms/questions/${selectedQuestion.id}`, {
        navigation: cleanedNavigation.length > 0 ? cleanedNavigation : null,
        defaultNextQuestionKey: values.defaultNextQuestionKey
      });
      
      message.success('Navigation mise à jour');
      setNavigationModalVisible(false);
      fetchQuestions();
    } catch {
      message.error('Erreur lors de la sauvegarde');
    }
  };

  const handleSetStartQuestion = async (questionKey: string) => {
    if (!websiteForm) return;
    try {
      await api.put(`/api/website-forms/${websiteForm.id}`, {
        startQuestionKey: questionKey
      });
      message.success('Question de départ définie');
      onUpdate();
    } catch {
      message.error('Erreur');
    }
  };

  // ==================== COLONNES TABLE ====================
  const columns: ColumnsType<FormQuestion> = [
    {
      title: '#',
      dataIndex: 'order',
      key: 'order',
      width: 50,
      align: 'center',
      render: (order: number) => (
        <Badge count={order} style={{ backgroundColor: '#1890ff' }} />
      )
    },
    {
      title: 'Clé',
      dataIndex: 'questionKey',
      key: 'questionKey',
      width: 140,
      render: (key: string, _record: FormQuestion) => (
        <Space direction="vertical" size={0}>
          <Text code style={{ fontSize: '11px' }}>{key}</Text>
          {websiteForm?.startQuestionKey === key && (
            <Tag color="green" style={{ fontSize: '10px' }}>🚀 Départ</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Question',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: FormQuestion) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '13px' }}>{title}</Text>
          {record.subtitle && (
            <Text type="secondary" style={{ fontSize: '11px' }}>{record.subtitle}</Text>
          )}
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'questionType',
      key: 'questionType',
      width: 120,
      render: (type: string) => {
        const typeInfo = QUESTION_TYPES.find(t => t.value === type);
        return <Tag color="blue">{typeInfo?.label.split(' ')[0] || type}</Tag>;
      }
    },
    {
      title: 'Options',
      key: 'options',
      width: 70,
      align: 'center',
      render: (_, record: FormQuestion) => {
        const count = record.options?.length || 0;
        return count > 0 ? (
          <Badge count={count} style={{ backgroundColor: '#52c41a' }} />
        ) : (
          <Text type="secondary">-</Text>
        );
      }
    },
    {
      title: 'Navigation',
      key: 'navigation',
      width: 100,
      render: (_, record: FormQuestion) => {
        const navCount = record.navigation?.length || 0;
        return (
          <Space size={4}>
            {navCount > 0 && <Tag color="purple">{navCount}</Tag>}
            {record.defaultNextQuestionKey && (
              <Tooltip title={`→ ${record.defaultNextQuestionKey}`}>
                <ArrowRightOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
              </Tooltip>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_, record: FormQuestion) => (
        <Space size="small">
          <Tooltip title="Navigation">
            <Button
              size="small"
              icon={<BranchesOutlined />}
              onClick={() => handleManageNavigation(record)}
            />
          </Tooltip>
          <Tooltip title="Modifier">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditQuestion(record)}
            />
          </Tooltip>
          {websiteForm?.startQuestionKey !== record.questionKey && (
            <Tooltip title="Définir comme 1ère question">
              <Button
                size="small"
                type="dashed"
                onClick={() => handleSetStartQuestion(record.questionKey)}
              >
                🚀
              </Button>
            </Tooltip>
          )}
          <Popconfirm
            title="Supprimer cette question ?"
            onConfirm={() => handleDeleteQuestion(record.id)}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // ==================== RENDU ====================
  return (
    <>
      {/* Modal principal - Liste des questions */}
      <Modal
        title={
          <Space>
            <QuestionCircleOutlined style={{ color: '#722ed1' }} />
            <span>Questions : {websiteForm?.name}</span>
            <Tag color="purple">1 écran = 1 question</Tag>
          </Space>
        }
        open={visible}
        onCancel={onClose}
        width={1100}
        footer={
          <Space>
            <Button 
              icon={<EyeOutlined />}
              onClick={() => window.open(`/simulateur/${websiteForm?.slug}`, '_blank')}
            >
              Prévisualiser
            </Button>
            <Button onClick={onClose}>Fermer</Button>
          </Space>
        }
      >
        <div style={{ marginBottom: '16px' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddQuestion}
          >
            Ajouter une question
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={questions}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Aucune question"
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddQuestion}>
                  Créer la première question
                </Button>
              </Empty>
            )
          }}
        />
      </Modal>

      {/* Modal création/édition question */}
      <Modal
        title={editingQuestion ? '✏️ Modifier la question' : '➕ Nouvelle question'}
        open={questionModalVisible}
        onCancel={() => setQuestionModalVisible(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Form
          form={questionForm}
          layout="vertical"
          onFinish={handleSaveQuestion}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="questionKey"
                label="Clé unique"
                rules={[
                  { required: true, message: 'Clé requise' },
                  { pattern: /^[a-z0-9_]+$/, message: 'Minuscules, chiffres et _ uniquement' }
                ]}
                extra="Identifiant unique (ex: type_chauffage)"
              >
                <Input placeholder="ex: type_chauffage" disabled={!!editingQuestion} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="questionType"
                label="Type de question"
                rules={[{ required: true }]}
              >
                <Select
                  options={QUESTION_TYPES.map(t => ({
                    value: t.value,
                    label: t.label
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="title"
            label="Question (titre affiché)"
            rules={[{ required: true, message: 'Question requise' }]}
          >
            <Input placeholder="Ex: Quel est votre type de chauffage actuel ?" />
          </Form.Item>

          <Form.Item name="subtitle" label="Sous-titre (optionnel)">
            <Input placeholder="Ex: Sélectionnez une option" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="imageUrl" label="Image d'illustration">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Form.Item noStyle shouldUpdate={(prev, cur) => prev.imageUrl !== cur.imageUrl}>
                    {({ getFieldValue }) => {
                      const imageUrl = getFieldValue('imageUrl');
                      return imageUrl ? (
                        <Space>
                          <Image
                            src={imageUrl}
                            alt="Illustration"
                            width={60}
                            height={60}
                            style={{ objectFit: 'cover', borderRadius: '8px' }}
                          />
                          <Button 
                            size="small" 
                            danger 
                            onClick={() => questionForm.setFieldValue('imageUrl', '')}
                          >
                            Supprimer
                          </Button>
                        </Space>
                      ) : null;
                    }}
                  </Form.Item>
                  <Space>
                    <Upload
                      accept="image/*"
                      showUploadList={false}
                      beforeUpload={(file) => {
                        handleQuestionImageUpload(file);
                        return false;
                      }}
                    >
                      <Button icon={<UploadOutlined />} loading={imageUploading}>
                        Uploader
                      </Button>
                    </Upload>
                    <Input
                      placeholder="ou coller une URL"
                      prefix={<PictureOutlined />}
                      style={{ width: '200px' }}
                      onChange={(e) => questionForm.setFieldValue('imageUrl', e.target.value)}
                    />
                  </Space>
                </Space>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="order" label="Ordre" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="isRequired" label="Obligatoire" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Options de réponse (pour choix unique/multiple)</Divider>

          <Form.Item name="options">
            <OptionsEditor 
              formId={websiteForm?.id}
              tblRootNodeId={websiteForm?.treeId}
            />
          </Form.Item>

          <Form.Item name="placeholder" label="Placeholder (pour champs texte/nombre)">
            <Input placeholder="Ex: Entrez votre code postal" />
          </Form.Item>

          <Divider>Navigation par défaut</Divider>

          <Form.Item
            name="defaultNextQuestionKey"
            label="Question suivante par défaut"
            extra="Utilisée quand aucune règle conditionnelle ne s'applique. Vide = fin du formulaire."
          >
            <Select
              allowClear
              placeholder="Sélectionner..."
              showSearch
              optionFilterProp="children"
              options={questions
                .filter(q => q.id !== editingQuestion?.id)
                .map(q => ({ value: q.questionKey, label: `${q.questionKey} - ${q.title.substring(0, 40)}...` }))
              }
            />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: '16px' }}>
            <Space>
              <Button onClick={() => setQuestionModalVisible(false)}>Annuler</Button>
              <Button type="primary" htmlType="submit">
                {editingQuestion ? 'Mettre à jour' : 'Créer'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Modal gestion navigation conditionnelle */}
      <Modal
        title={
          <Space>
            <BranchesOutlined style={{ color: '#722ed1' }} />
            <span>Navigation : {selectedQuestion?.title}</span>
          </Space>
        }
        open={navigationModalVisible}
        onCancel={() => setNavigationModalVisible(false)}
        footer={null}
        width={750}
        destroyOnClose
      >
        <Form
          initialValues={{
            navigation: selectedQuestion?.navigation || [],
            defaultNextQuestionKey: selectedQuestion?.defaultNextQuestionKey
          }}
          onFinish={handleSaveNavigation}
          layout="vertical"
        >
          <Form.Item name="navigation">
            <NavigationEditor 
              options={selectedQuestion?.options || []}
              allQuestions={questions}
              currentQuestionId={selectedQuestion?.id}
            />
          </Form.Item>

          <Divider />

          <Form.Item
            name="defaultNextQuestionKey"
            label="Question suivante par défaut (si aucune règle ne correspond)"
          >
            <Select
              allowClear
              placeholder="Sélectionner..."
              showSearch
              optionFilterProp="children"
              options={questions
                .filter(q => q.id !== selectedQuestion?.id)
                .map(q => ({ value: q.questionKey, label: `${q.questionKey} - ${q.title.substring(0, 40)}...` }))
              }
            />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setNavigationModalVisible(false)}>Annuler</Button>
              <Button type="primary" htmlType="submit">Sauvegarder</Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default QuestionsManagerModal;
