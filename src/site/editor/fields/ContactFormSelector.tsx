import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Typography, message, Tabs, Switch, Card, List, Divider, Tag, Popconfirm } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, CopyOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { useTranslation } from 'react-i18next';
import { logger } from '../../../lib/logger';

const { Option } = Select;

interface PublicFormField {
  id: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  order: number;
}

interface PublicFormSummary {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

interface ContactFormSelectorProps {
  value?: string | string[];
  onChange?: (value: string[] | undefined) => void;
  allowCreate?: boolean;
  placeholder?: string;
}

const defaultFields: PublicFormField[] = [
  { id: 'firstName', type: 'text', label: 'Prénom', placeholder: 'Votre prénom', required: true, order: 1 },
  { id: 'lastName', type: 'text', label: 'Nom', placeholder: 'Votre nom', required: true, order: 2 },
  { id: 'email', type: 'email', label: 'Email', placeholder: 'votre@email.com', required: true, order: 3 },
  { id: 'phone', type: 'tel', label: 'Téléphone', placeholder: '+32 XXX XX XX XX', required: false, order: 4 },
  { id: 'message', type: 'textarea', label: 'Votre demande', placeholder: 'Décrivez votre demande...', required: true, order: 5 }
];

const slugify = (input: string): string =>
  input
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();

const ContactFormSelector: React.FC<ContactFormSelectorProps> = ({
  value,
  onChange,
  allowCreate = true,
  placeholder = 'Sélectionnez un formulaire'
}) => {
  const { t } = useTranslation();
  const { api } = useAuthenticatedApi();
  const stableApi = useMemo(() => api, [api]);

  const [forms, setForms] = useState<PublicFormSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [useCustomAnchor, setUseCustomAnchor] = useState(false);
  const [customAnchor, setCustomAnchor] = useState('#contact');
  const [form] = Form.useForm();
  
  // États pour l'éditeur de champs
  const [editingFields, setEditingFields] = useState<PublicFormField[]>([...defaultFields]);
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [fieldForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('general');
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const normalizedValue = useMemo(() => {
    if (Array.isArray(value)) return value[0];
    return value;
  }, [value]);

  const anchorValue = useMemo(() => {
    if (!normalizedValue) return undefined;
    const trimmed = normalizedValue.trim();
    if (!trimmed || trimmed.startsWith('form:')) return undefined;
    const normalized = trimmed.replace(/^#+/, '');
    return `#${normalized}`;
  }, [normalizedValue]);

  useEffect(() => {
    if (!normalizedValue) {
      setUseCustomAnchor(false);
      setCustomAnchor('#contact');
      return;
    }

    if (anchorValue) {
      setCustomAnchor(anchorValue);
    }
  }, [anchorValue, normalizedValue]);

  const emitValue = useCallback(
    (next: string | undefined) => {
      if (!onChange) return;
      if (!next || next.length === 0) {
        onChange([]);
        return;
      }
      onChange([next]);
    },
    [onChange]
  );

  const loadForms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await stableApi.get<PublicFormSummary[] | { data?: PublicFormSummary[] }>(
        '/api/public-forms',
        { showErrors: false }
      );
      const list = Array.isArray(response)
        ? response
        : Array.isArray((response as unknown)?.data)
        ? (response as any).data
        : [];
      setForms([...list].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      logger.error('[ContactFormSelector] load error', error);
      message.error('Impossible de récupérer les formulaires.');
    } finally {
      setLoading(false);
    }
  }, [stableApi]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const handleSelect = useCallback(
    (newValue: string) => {
      emitValue(newValue);
      setUseCustomAnchor(false);
    },
    [emitValue]
  );

  const handleAnchorChange = useCallback(
    (next: string) => {
      const trimmed = next.trim();
      if (trimmed.length === 0) {
        setCustomAnchor('#');
        emitValue('#');
        return;
      }
      const normalized = trimmed.replace(/^#+/, '');
      const formatted = `#${normalized}`;
      setCustomAnchor(formatted);
      emitValue(formatted);
    },
    [emitValue]
  );

  const handleCreateForm = useCallback(
    async (values: { 
      name: string; 
      category?: string; 
      description?: string;
      thankYouMessage?: string;
      redirectUrl?: string;
      collectsRgpdConsent?: boolean;
      autoPublishLeads?: boolean;
      isActive?: boolean;
      isPublic?: boolean;
    }) => {
      try {
        setCreateLoading(true);
        const payload = {
          name: values.name,
          category: values.category || 'contact',
          description: values.description || '',
          slug: slugify(values.name),
          fields: editingFields.sort((a, b) => a.order - b.order),
          thankYouMessage: values.thankYouMessage || 'Merci pour votre message ! Nous vous répondrons rapidement.',
          redirectUrl: values.redirectUrl || '',
          collectsRgpdConsent: values.collectsRgpdConsent !== false,
          autoPublishLeads: values.autoPublishLeads || false,
          isActive: values.isActive !== false,
          isPublic: values.isPublic !== false
        };

        let result;
        if (isEditMode && editingFormId) {
          // Mode édition - PUT
          result = await stableApi.put(`/api/public-forms/${editingFormId}`, payload, { showErrors: true });
          message.success('Formulaire mis à jour avec succès.');
        } else {
          // Mode création - POST
          result = await stableApi.post('/api/public-forms', payload, { showErrors: true });
          message.success('Formulaire créé avec succès.');
        }

        const raw = (result as unknown)?.data ?? result;
        if (!raw?.id) {
          throw new Error('Réponse inattendue lors de l\'enregistrement du formulaire');
        }

        const saved: PublicFormSummary = {
          id: raw.id,
          name: raw.name || values.name,
          description: raw.description || values.description,
          category: raw.category || values.category
        };

        // Recharger la liste complète depuis le serveur pour avoir les IDs corrects
        await loadForms();
        
        // Sélectionner le formulaire créé/modifié
        emitValue(`form:${saved.id}`);
        setUseCustomAnchor(false);
        setCreateModalOpen(false);
        setEditingFields([...defaultFields]);
        setActiveTab('general');
        setIsEditMode(false);
        setEditingFormId(null);
        form.resetFields();
      } catch (error) {
        logger.error('[ContactFormSelector] save error', error);
        const fallback = error instanceof Error ? error.message : "Erreur lors de l'enregistrement du formulaire.";
        message.error(fallback);
      } finally {
        setCreateLoading(false);
      }
    },
    [emitValue, form, loadForms, stableApi, editingFields, isEditMode, editingFormId]
  );

  // Gestion des champs du formulaire
  const handleAddField = useCallback(() => {
    fieldForm.resetFields();
    setEditingFieldIndex(null);
    setFieldModalOpen(true);
  }, [fieldForm]);

  const handleEditField = useCallback((index: number) => {
    const field = editingFields[index];
    fieldForm.setFieldsValue(field);
    setEditingFieldIndex(index);
    setFieldModalOpen(true);
  }, [editingFields, fieldForm]);

  const handleSaveField = useCallback(async () => {
    try {
      const values = await fieldForm.validateFields();
      const newField: PublicFormField = {
        id: values.id || `field_${Date.now()}`,
        type: values.type,
        label: values.label,
        placeholder: values.placeholder || '',
        required: values.required || false,
        options: values.options || [],
        order: editingFieldIndex !== null ? editingFields[editingFieldIndex].order : editingFields.length + 1
      };

      if (editingFieldIndex !== null) {
        // Modification
        const updated = [...editingFields];
        updated[editingFieldIndex] = newField;
        setEditingFields(updated);
      } else {
        // Ajout
        setEditingFields([...editingFields, newField]);
      }

      setFieldModalOpen(false);
      fieldForm.resetFields();
      message.success(editingFieldIndex !== null ? 'Champ modifié' : 'Champ ajouté');
    } catch (error) {
      logger.error('Validation error:', error);
    }
  }, [fieldForm, editingFieldIndex, editingFields]);

  const handleDeleteField = useCallback((index: number) => {
    const updated = editingFields.filter((_, i) => i !== index);
    // Réorganiser les order
    updated.forEach((field, i) => {
      field.order = i + 1;
    });
    setEditingFields(updated);
    message.success('Champ supprimé');
  }, [editingFields]);

  const handleMoveField = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= editingFields.length) return;

    const updated = [...editingFields];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    // Mettre à jour les order
    updated.forEach((field, i) => {
      field.order = i + 1;
    });

    setEditingFields(updated);
  }, [editingFields]);

  // Charger un formulaire pour édition
  const handleEditForm = useCallback(async (formId: string) => {
    try {
      setLoading(true);
      const response = await stableApi.get(`/api/public-forms/${formId}`, { showErrors: true });
      const formData = (response as unknown)?.data ?? response;
      
      if (!formData) {
        throw new Error('Formulaire introuvable');
      }

      // Remplir le formulaire avec les données existantes
      form.setFieldsValue({
        name: formData.name,
        category: formData.category,
        description: formData.description,
        thankYouMessage: formData.thankYouMessage,
        redirectUrl: formData.redirectUrl,
        collectsRgpdConsent: formData.collectsRgpdConsent,
        autoPublishLeads: formData.autoPublishLeads,
        isActive: formData.isActive,
        isPublic: formData.isPublic,
      });

      // Charger les champs
      if (formData.fields && Array.isArray(formData.fields)) {
        setEditingFields(formData.fields);
      }

      setEditingFormId(formId);
      setIsEditMode(true);
      setCreateModalOpen(true);
      setActiveTab('general');
    } catch (error) {
      logger.error('[ContactFormSelector] edit error', error);
      message.error('Impossible de charger le formulaire');
    } finally {
      setLoading(false);
    }
  }, [form, stableApi]);

  // Supprimer un formulaire
  const handleDeleteForm = useCallback(async (formId: string) => {
    try {
      await stableApi.delete(`/api/public-forms/${formId}`, { showErrors: true });
      setForms((prev) => prev.filter((f) => f.id !== formId));
      message.success('Formulaire supprimé');
      
      // Si le formulaire supprimé était sélectionné, le désélectionner
      if (normalizedValue === `form:${formId}`) {
        emitValue(undefined);
      }
    } catch (error) {
      logger.error('[ContactFormSelector] delete error', error);
      message.error('Impossible de supprimer le formulaire');
    }
  }, [stableApi, normalizedValue, emitValue]);

  // 🔥 Dupliquer un formulaire
  const handleDuplicateForm = useCallback(async (formId: string) => {
    try {
      setLoading(true);
      const response = await stableApi.get(`/api/public-forms/${formId}`, { showErrors: true });
      const formData = (response as unknown)?.data ?? response;
      
      if (!formData) {
        throw new Error('Formulaire introuvable');
      }

      // 🔥 Générer un nom incrémenté
      const baseName = formData.name.replace(/\s+\d+$/, ''); // Retire le numéro existant
      const existingNumbers = forms
        .filter(f => f.name.startsWith(baseName))
        .map(f => {
          const match = f.name.match(/\s+(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        });
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 2;
      const newName = `${baseName} ${nextNumber}`;

      // Remplir le formulaire avec les données dupliquées
      form.setFieldsValue({
        name: newName,
        category: formData.category,
        description: formData.description,
        thankYouMessage: formData.thankYouMessage,
        redirectUrl: formData.redirectUrl,
        collectsRgpdConsent: formData.collectsRgpdConsent,
        autoPublishLeads: formData.autoPublishLeads,
        isActive: formData.isActive,
        isPublic: formData.isPublic,
      });

      // Charger les champs
      if (formData.fields && Array.isArray(formData.fields)) {
        setEditingFields(formData.fields);
      }

      // Ouvrir en mode création (pas édition)
      setEditingFormId(null);
      setIsEditMode(false);
      setCreateModalOpen(true);
      setActiveTab('general');
      
      message.success(`Formulaire dupliqué en "${newName}". Vous pouvez modifier le nom avant de créer.`);
    } catch (error) {
      logger.error('[ContactFormSelector] duplicate error', error);
      message.error('Impossible de dupliquer le formulaire');
    } finally {
      setLoading(false);
    }
  }, [form, stableApi, forms]);

  const selectedValue = useMemo(() => {
    if (!normalizedValue) return undefined;
    return normalizedValue.startsWith('form:') ? normalizedValue : undefined;
  }, [normalizedValue]);

  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      {!useCustomAnchor && (
        <Select
          value={selectedValue}
          onChange={handleSelect}
          placeholder={placeholder}
          loading={loading}
          allowClear
          onClear={() => {
            emitValue(undefined);
            setUseCustomAnchor(false);
          }}
          dropdownRender={(menu) => (
            <div>
              {menu}
              {allowCreate && (
                <>
                  <Divider style={{ margin: '8px 0' }} />
                  <Button
                    type="text"
                    icon={<PlusOutlined />}
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={() => {
                      setIsEditMode(false);
                      setEditingFormId(null);
                      setEditingFields([...defaultFields]);
                      form.resetFields();
                      setCreateModalOpen(true);
                    }}
                  >
                    Créer un formulaire
                  </Button>
                </>
              )}
              <Button
                type="text"
                icon={<ReloadOutlined />}
                style={{ width: '100%', textAlign: 'left' }}
                onClick={loadForms}
              >
                Actualiser la liste
              </Button>
            </div>
          )}
        >
          {forms.map((formSummary) => (
            <Option key={formSummary.id} value={`form:${formSummary.id}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Space direction="vertical" size={0} style={{ flex: 1 }}>
                  <Typography.Text strong>{formSummary.name}</Typography.Text>
                  {formSummary.description && (
                    <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                      {formSummary.description}
                    </Typography.Text>
                  )}
                </Space>
                <Space size="small" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="small"
                    type="text"
                    icon={<CopyOutlined />}
                    title={t('common.duplicate')}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateForm(formSummary.id);
                    }}
                  />
                  <Button
                    size="small"
                    type="text"
                    icon={<EditOutlined />}
                    title={t('common.edit')}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditForm(formSummary.id);
                    }}
                  />
                  <Popconfirm
                    title="Supprimer ce formulaire ?"
                    description="Cette action est irréversible."
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      handleDeleteForm(formSummary.id);
                    }}
                    onCancel={(e) => e?.stopPropagation()}
                    okText={t('common.delete')}
                    cancelText={t('common.cancel')}
                  >
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      title={t('common.delete')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popconfirm>
                </Space>
              </div>
            </Option>
          ))}
        </Select>
      )}

      {!useCustomAnchor && anchorValue && (
        <Typography.Text type="secondary">
          Ancre actuelle : {anchorValue}
        </Typography.Text>
      )}

      {useCustomAnchor && (
        <Input
          value={customAnchor}
          onChange={(event) => handleAnchorChange(event.target.value)}
          placeholder="#contact"
        />
      )}

      <Space size="small">
        <Button
          size="small"
          type="link"
          onClick={() => {
            setUseCustomAnchor((prev) => {
              const next = !prev;
              if (next) {
                emitValue(customAnchor);
              } else {
                emitValue(undefined);
              }
              return next;
            });
          }}
        >
          {useCustomAnchor ? 'Choisir un formulaire' : 'Utiliser une ancre personnalisée'}
        </Button>
      </Space>

      <Modal
        title={isEditMode ? "Modifier le formulaire" : "Créer un formulaire"}
        open={createModalOpen}
        okText={isEditMode ? "Mettre à jour" : "Créer"}
        cancelText={t('common.cancel')}
        onCancel={() => {
          setCreateModalOpen(false);
          setEditingFields([...defaultFields]);
          setActiveTab('general');
          setIsEditMode(false);
          setEditingFormId(null);
          form.resetFields();
        }}
        confirmLoading={createLoading}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateForm}>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            {/* Onglet 1: Informations générales */}
            <Tabs.TabPane tab="Informations générales" key="general">
              <Form.Item
                label="Nom du formulaire"
                name="name"
                rules={[{ required: true, message: 'Nom du formulaire requis' }]}
              >
                <Input placeholder="Formulaire contact" />
              </Form.Item>

              <Form.Item label={t('fields.category')} name="category">
                <Input placeholder="contact" />
              </Form.Item>

              <Form.Item label={t('fields.description')} name="description">
                <Input.TextArea rows={2} placeholder="Description rapide" />
              </Form.Item>
            </Tabs.TabPane>

          {/* Onglet 2: Champs du formulaire */}
          <Tabs.TabPane tab={`Champs (${editingFields.length})`} key="fields">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button 
                type="dashed" 
                icon={<PlusOutlined />} 
                onClick={handleAddField}
                block
              >
                Ajouter un champ
              </Button>

              <List
                dataSource={editingFields}
                renderItem={(field, index) => (
                  <Card 
                    size="small" 
                    style={{ marginBottom: 8 }}
                    extra={
                      <Space>
                        <Button 
                          size="small" 
                          icon={<ArrowUpOutlined />} 
                          disabled={index === 0}
                          onClick={() => handleMoveField(index, 'up')}
                        />
                        <Button 
                          size="small" 
                          icon={<ArrowDownOutlined />} 
                          disabled={index === editingFields.length - 1}
                          onClick={() => handleMoveField(index, 'down')}
                        />
                        <Button 
                          size="small" 
                          icon={<EditOutlined />} 
                          onClick={() => handleEditField(index)}
                        />
                        <Popconfirm
                          title="Supprimer ce champ ?"
                          onConfirm={() => handleDeleteField(index)}
                          okText={t('common.yes')}
                          cancelText={t('common.no')}
                        >
                          <Button 
                            size="small" 
                            danger 
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>
                      </Space>
                    }
                  >
                    <Space>
                      <Tag color="blue">{field.type}</Tag>
                      <Typography.Text strong>{field.label}</Typography.Text>
                      {field.required && <Tag color="red">Obligatoire</Tag>}
                      {field.placeholder && <Typography.Text type="secondary">({field.placeholder})</Typography.Text>}
                    </Space>
                  </Card>
                )}
              />
            </Space>
          </Tabs.TabPane>

          {/* Onglet 3: Configuration */}
          <Tabs.TabPane tab="Configuration" key="config">
            <Form.Item 
              label="Message de remerciement" 
              name="thankYouMessage"
              initialValue="Merci pour votre message ! Nous vous répondrons rapidement."
            >
              <Input.TextArea rows={3} />
            </Form.Item>

            <Form.Item 
              label="URL de redirection (optionnel)" 
              name="redirectUrl"
              tooltip="Si renseigné, l'utilisateur sera redirigé vers cette URL après soumission"
            >
              <Input placeholder="https://exemple.com/merci" />
            </Form.Item>

            <Divider />

            <Form.Item 
              label="Collecte du consentement RGPD" 
              name="collectsRgpdConsent"
              valuePropName="checked"
              initialValue={true}
            >
              <Switch />
            </Form.Item>

            <Form.Item 
              label="Publier automatiquement les leads" 
              name="autoPublishLeads"
              valuePropName="checked"
              initialValue={false}
              tooltip="Si activé, les soumissions créeront automatiquement des leads dans le CRM"
            >
              <Switch />
            </Form.Item>

            <Form.Item 
              label="Formulaire actif" 
              name="isActive"
              valuePropName="checked"
              initialValue={true}
            >
              <Switch />
            </Form.Item>

            <Form.Item 
              label="Formulaire public" 
              name="isPublic"
              valuePropName="checked"
              initialValue={true}
              tooltip="Si désactivé, le formulaire ne sera accessible qu'aux utilisateurs connectés"
            >
              <Switch />
            </Form.Item>
          </Tabs.TabPane>
        </Tabs>
        </Form>
      </Modal>

      {/* Modal pour éditer/ajouter un champ */}
      <Modal
        title={editingFieldIndex !== null ? "Modifier le champ" : "Ajouter un champ"}
        open={fieldModalOpen}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        onCancel={() => {
          setFieldModalOpen(false);
          fieldForm.resetFields();
        }}
        onOk={handleSaveField}
      >
        <Form form={fieldForm} layout="vertical">
          <Form.Item
            label="Type de champ"
            name="type"
            rules={[{ required: true, message: 'Type requis' }]}
          >
            <Select placeholder="Sélectionnez un type">
              <Option value="text">Texte</Option>
              <Option value="email">Email</Option>
              <Option value="tel">Téléphone</Option>
              <Option value="textarea">Zone de texte</Option>
              <Option value="select">Sélection</Option>
              <Option value="checkbox">Case à cocher</Option>
              <Option value="radio">Boutons radio</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Label"
            name="label"
            rules={[{ required: true, message: 'Label requis' }]}
          >
            <Input placeholder="Nom du champ" />
          </Form.Item>

          <Form.Item
            label="Placeholder"
            name="placeholder"
          >
            <Input placeholder="Texte d'aide..." />
          </Form.Item>

          <Form.Item
            label="Champ obligatoire"
            name="required"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="ID du champ"
            name="id"
            tooltip="Identifiant unique pour le champ (généré automatiquement si vide)"
          >
            <Input placeholder="mon_champ" />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
          >
            {({ getFieldValue }) => {
              const fieldType = getFieldValue('type');
              if (fieldType === 'select' || fieldType === 'radio') {
                return (
                  <Form.Item
                    label="Options (une par ligne)"
                    name="options"
                    tooltip="Entrez chaque option sur une nouvelle ligne"
                  >
                    <Input.TextArea 
                      rows={4} 
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                      onChange={(e) => {
                        const lines = e.target.value.split('\n').filter(line => line.trim());
                        fieldForm.setFieldsValue({ options: lines });
                      }}
                    />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default ContactFormSelector;
