/**
 * 📐 ReferenceConfigModal - Modal de configuration de l'objet de référence
 * 
 * Ce modal permet à l'admin de l'organisation de configurer l'objet de référence
 * utilisé pour calibrer les mesures IA dans toutes les photos
 * 
 * Accessible depuis le bouton "📐 Objet de référence" dans le header TBL
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  Form,
  Radio,
  Input,
  InputNumber,
  Select,
  Space,
  Button,
  Typography,
  Divider,
  Alert,
  message,
  Upload,
  Card,
  Spin,
  Tag
} from 'antd';
import {
  CameraOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  CreditCardOutlined,
  ToolOutlined,
  FileOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { 
  REFERENCE_PRESETS, 
  type ReferenceType, 
  type OrganizationMeasurementReferenceConfig 
} from '../../types/measurement';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface ReferenceConfigModalProps {
  visible: boolean;
  onClose: () => void;
  organizationId: string;
  onConfigSaved?: (config: OrganizationMeasurementReferenceConfig) => void;
}

export const ReferenceConfigModal: React.FC<ReferenceConfigModalProps> = ({
  visible,
  onClose,
  organizationId,
  onConfigSaved
}) => {
  const { api } = useAuthenticatedApi();
  const { user } = useAuth();
  
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingConfig, setExistingConfig] = useState<OrganizationMeasurementReferenceConfig | null>(null);
  const [selectedType, setSelectedType] = useState<ReferenceType>('card');
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // Charger la config existante
  const loadExistingConfig = useCallback(async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/api/measurement-reference/${organizationId}`);
      if (response?.config) {
        setExistingConfig(response.config);
        setSelectedType(response.config.referenceType);
        form.setFieldsValue({
          referenceType: response.config.referenceType,
          customName: response.config.customName,
          customSize: response.config.customSize,
          customUnit: response.config.customUnit || 'cm'
        });
        
        if (response.config.referenceImageUrl) {
          setFileList([{
            uid: '-1',
            name: 'reference-image',
            status: 'done',
            url: response.config.referenceImageUrl
          }]);
        }
      } else {
        // Pas de config existante, mettre les valeurs par défaut
        form.setFieldsValue({
          referenceType: 'card',
          customSize: REFERENCE_PRESETS.card.size,
          customUnit: 'cm'
        });
      }
    } catch (error) {
      console.error('Erreur chargement config référence:', error);
    } finally {
      setLoading(false);
    }
  }, [api, organizationId, form]);

  useEffect(() => {
    if (visible && organizationId) {
      loadExistingConfig();
    }
  }, [visible, organizationId, loadExistingConfig]);

  // Gérer le changement de type de référence
  const handleTypeChange = (type: ReferenceType) => {
    setSelectedType(type);
    const preset = REFERENCE_PRESETS[type];
    form.setFieldsValue({
      customSize: preset.size,
      customUnit: preset.unit
    });
  };

  // Sauvegarder la configuration
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // Upload de l'image si présente
      let referenceImageUrl = existingConfig?.referenceImageUrl;
      if (fileList.length > 0 && fileList[0].originFileObj) {
        // TODO: Implémenter l'upload de l'image
        // Pour l'instant on garde l'URL existante
      }

      const payload = {
        organizationId,
        referenceType: values.referenceType,
        customName: values.customName || null,
        customSize: values.customSize,
        customUnit: values.customUnit || 'cm',
        referenceImageUrl,
        detectionPrompt: null // Généré automatiquement selon le type
      };

      const response = existingConfig?.id
        ? await api.put(`/api/measurement-reference/${existingConfig.id}`, payload)
        : await api.post('/api/measurement-reference', payload);

      if (response?.success) {
        message.success('Configuration de référence enregistrée !');
        onConfigSaved?.(response.config);
        onClose();
      } else {
        throw new Error(response?.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Erreur sauvegarde config:', error);
      message.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Rendu des icônes selon le type
  const getTypeIcon = (type: ReferenceType) => {
    switch (type) {
      case 'meter': return <ToolOutlined style={{ fontSize: 24, color: '#1890FF' }} />;
      case 'card': return <CreditCardOutlined style={{ fontSize: 24, color: '#52C41A' }} />;
      case 'a4': return <FileOutlined style={{ fontSize: 24, color: '#722ED1' }} />;
      case 'custom': return <CameraOutlined style={{ fontSize: 24, color: '#FA8C16' }} />;
      default: return <InfoCircleOutlined />;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <CameraOutlined style={{ color: '#1890FF' }} />
          <span>📐 Configuration de l'objet de référence</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={600}
      footer={
        <Space>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            Enregistrer pour l'organisation
          </Button>
        </Space>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Chargement de la configuration...</div>
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            referenceType: 'card',
            customSize: REFERENCE_PRESETS.card.size,
            customUnit: 'cm'
          }}
        >
          {/* Info box */}
          <Alert
            message="Comment ça fonctionne ?"
            description={
              <Paragraph style={{ margin: 0 }}>
                Cet objet sera <strong>automatiquement détecté</strong> dans les photos prises par vos utilisateurs.
                Il servira de référence d'échelle pour calculer les mesures réelles avec une précision de ~95-99%.
                <br /><br />
                <Text type="secondary">
                  💡 Placez simplement cet objet à côté de ce que vous voulez mesurer lors de la prise de photo.
                </Text>
              </Paragraph>
            }
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginBottom: 24 }}
          />

          {/* Sélection du type de référence */}
          <Form.Item
            name="referenceType"
            label="Objet de référence à utiliser"
            rules={[{ required: true, message: 'Sélectionnez un type' }]}
          >
            <Radio.Group
              onChange={(e) => handleTypeChange(e.target.value)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {/* Carte bancaire */}
                <Card
                  size="small"
                  style={{
                    borderColor: selectedType === 'card' ? '#52C41A' : '#d9d9d9',
                    backgroundColor: selectedType === 'card' ? '#f6ffed' : undefined
                  }}
                  hoverable
                  onClick={() => handleTypeChange('card')}
                >
                  <Radio value="card">
                    <Space>
                      {getTypeIcon('card')}
                      <div>
                        <Text strong>Carte bancaire</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {REFERENCE_PRESETS.card.description} - {REFERENCE_PRESETS.card.size}cm
                        </Text>
                      </div>
                      {selectedType === 'card' && (
                        <Tag color="success">Recommandé</Tag>
                      )}
                    </Space>
                  </Radio>
                </Card>

                {/* Mètre ruban */}
                <Card
                  size="small"
                  style={{
                    borderColor: selectedType === 'meter' ? '#1890FF' : '#d9d9d9',
                    backgroundColor: selectedType === 'meter' ? '#e6f7ff' : undefined
                  }}
                  hoverable
                  onClick={() => handleTypeChange('meter')}
                >
                  <Radio value="meter">
                    <Space>
                      {getTypeIcon('meter')}
                      <div>
                        <Text strong>Mètre ruban</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {REFERENCE_PRESETS.meter.description}
                        </Text>
                      </div>
                    </Space>
                  </Radio>
                </Card>

                {/* Feuille A4 */}
                <Card
                  size="small"
                  style={{
                    borderColor: selectedType === 'a4' ? '#722ED1' : '#d9d9d9',
                    backgroundColor: selectedType === 'a4' ? '#f9f0ff' : undefined
                  }}
                  hoverable
                  onClick={() => handleTypeChange('a4')}
                >
                  <Radio value="a4">
                    <Space>
                      {getTypeIcon('a4')}
                      <div>
                        <Text strong>Feuille A4</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {REFERENCE_PRESETS.a4.description}
                        </Text>
                      </div>
                    </Space>
                  </Radio>
                </Card>

                {/* Personnalisé */}
                <Card
                  size="small"
                  style={{
                    borderColor: selectedType === 'custom' ? '#FA8C16' : '#d9d9d9',
                    backgroundColor: selectedType === 'custom' ? '#fff7e6' : undefined
                  }}
                  hoverable
                  onClick={() => handleTypeChange('custom')}
                >
                  <Radio value="custom">
                    <Space>
                      {getTypeIcon('custom')}
                      <div>
                        <Text strong>Personnalisé</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Définissez votre propre objet de référence
                        </Text>
                      </div>
                    </Space>
                  </Radio>
                </Card>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Divider />

          {/* Champs personnalisés pour type "custom" */}
          {selectedType === 'custom' && (
            <Form.Item
              name="customName"
              label="Nom de l'objet"
              rules={[{ required: selectedType === 'custom', message: 'Nom requis' }]}
            >
              <Input
                placeholder="Ex: Bouteille d'eau 50cl, Stylo Bic..."
                prefix={<CameraOutlined />}
              />
            </Form.Item>
          )}

          {/* Taille de référence */}
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item
              name="customSize"
              label="Dimension de référence"
              rules={[{ required: true, message: 'Taille requise' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0.1}
                max={1000}
                step={0.1}
                style={{ width: '100%' }}
                placeholder="8.56"
                disabled={selectedType !== 'custom'}
              />
            </Form.Item>

            <Form.Item
              name="customUnit"
              label="Unité"
              style={{ width: 100 }}
            >
              <Select disabled={selectedType !== 'custom'}>
                <Option value="cm">cm</Option>
                <Option value="m">m</Option>
                <Option value="mm">mm</Option>
                <Option value="inch">pouces</Option>
              </Select>
            </Form.Item>
          </Space>

          {/* Upload photo de référence (optionnel) */}
          <Form.Item
            label={
              <Space>
                <span>Photo de référence (optionnel)</span>
                <Tag color="blue">Améliore la détection</Tag>
              </Space>
            }
          >
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={() => false}
              maxCount={1}
              accept="image/*"
            >
              {fileList.length < 1 && (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>Ajouter</div>
                </div>
              )}
            </Upload>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Uploadez une photo claire de votre objet de référence pour améliorer la détection automatique
            </Text>
          </Form.Item>

          {/* Info config existante */}
          {existingConfig && (
            <Alert
              message="Configuration existante"
              description={
                <Space direction="vertical">
                  <Text>
                    Type actuel : <Tag>{REFERENCE_PRESETS[existingConfig.referenceType as ReferenceType]?.label || existingConfig.referenceType}</Tag>
                  </Text>
                  <Text>
                    Taille : <strong>{existingConfig.customSize} {existingConfig.customUnit}</strong>
                  </Text>
                </Space>
              }
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              style={{ marginTop: 16 }}
            />
          )}
        </Form>
      )}
    </Modal>
  );
};

export default ReferenceConfigModal;
