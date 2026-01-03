/**
 * ⚙️ ReferenceObjectsConfig - Modal de configuration des objets de référence
 * 
 * Permet à l'utilisateur de configurer :
 * - Les objets de référence (panneaux, onduleurs, etc.) avec leurs dimensions réelles
 * - Les paramètres de détection IA (nombre de photos, seuil de confiance)
 * - Activation/désactivation de la fonctionnalité IA Mesure
 * 
 * Utilisé depuis les champs image TBL via le bouton ⚙️
 */

import React, { useState, useEffect } from 'react';
import { 
  Modal, Form, Select, InputNumber, Button, List, Space, 
  message, Typography, Card, Switch, Tooltip, Divider,
  Alert
} from 'antd';
import { 
  PlusOutlined, DeleteOutlined, SettingOutlined, 
  CameraOutlined, ThunderboltOutlined, HomeOutlined,
  WindowsOutlined, DashOutlined
} from '@ant-design/icons';
import { useSmartCameraConfig, ReferenceObject } from '../../hooks/useSmartCameraConfig';

const { Text } = Typography;

interface Props {
  visible: boolean;
  onClose: () => void;
  nodeId: string;
}

const OBJECT_TYPE_ICONS: Record<string, React.ReactNode> = {
  panneau: <ThunderboltOutlined style={{ color: '#1890ff' }} />,
  onduleur: <ThunderboltOutlined style={{ color: '#52c41a' }} />,
  toiture: <HomeOutlined style={{ color: '#faad14' }} />,
  fenetre: <WindowsOutlined style={{ color: '#13c2c2' }} />,
  porte: <DashOutlined style={{ color: '#722ed1' }} />
};

export const ReferenceObjectsConfig: React.FC<Props> = ({ visible, onClose, nodeId }) => {
  const { config, saveConfig, loading } = useSmartCameraConfig(nodeId);
  const [form] = Form.useForm();
  const [objects, setObjects] = useState<ReferenceObject[]>([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (config) {
      setObjects(config.referenceObjects || []);
      setEnabled(config.enabled);
      form.setFieldsValue({
        minPhotos: config.detectionSettings.minPhotos,
        confidenceThreshold: config.detectionSettings.confidenceThreshold,
        useSharp: config.detectionSettings.useSharp,
        useFusion: config.detectionSettings.useFusion,
      });
    }
  }, [config, form]);

  const addObject = () => {
    setObjects([
      ...objects,
      { type: 'panneau', width: 1.7, height: 1.0, unit: 'm' }
    ]);
  };

  const removeObject = (index: number) => {
    setObjects(objects.filter((_, i) => i !== index));
  };

  const updateObject = (index: number, field: keyof ReferenceObject, value: any) => {
    const newObjects = [...objects];
    newObjects[index] = { ...newObjects[index], [field]: value };
    setObjects(newObjects);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      const newConfig = {
        enabled,
        referenceObjects: objects,
        detectionSettings: {
          minPhotos: values.minPhotos,
          confidenceThreshold: values.confidenceThreshold,
          useSharp: values.useSharp ?? true,
          useFusion: values.useFusion ?? true,
        }
      };

      await saveConfig(newConfig);
      message.success('✅ Configuration IA Mesure sauvegardée');
      onClose();
    } catch (error) {
      console.error('Error saving config:', error);
      message.error('❌ Erreur lors de la sauvegarde');
    }
  };

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>Configuration IA Mesure - Objets de Référence</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Annuler
        </Button>,
        <Button key="save" type="primary" onClick={handleSave} loading={loading}>
          💾 Enregistrer
        </Button>
      ]}
    >
      {/* Activation générale */}
      <Card className="mb-4" size="small">
        <Space className="w-full" style={{ justifyContent: 'space-between' }}>
          <Space>
            <CameraOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <div>
              <div style={{ fontWeight: 'bold' }}>Activer IA Mesure</div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Détection intelligente multi-photos avec Sharp + mesures précises
              </Text>
            </div>
          </Space>
          <Switch 
            checked={enabled}
            onChange={setEnabled}
            checkedChildren="ON"
            unCheckedChildren="OFF"
          />
        </Space>
      </Card>

      {enabled && (
        <>
          <Alert
            message="📸 Flux de capture"
            description={
              <div style={{ fontSize: 12 }}>
                <strong>3 photos minimum</strong> → <strong>Fusion multi-perspective</strong> → 
                <strong> Sharp (détection contours)</strong> → <strong>IA (détection objets)</strong> → 
                <strong> Mesures précises</strong>
              </div>
            }
            type="info"
            showIcon
            className="mb-4"
          />

          <Form form={form} layout="vertical">
            <Card title="📐 Objets de Référence (taille connue)" className="mb-4">
              <Text type="secondary" className="block mb-4">
                Ces objets servent de référence pour calculer les dimensions réelles à partir des photos.
                L'IA les détectera automatiquement sur les photos.
              </Text>

              <List
                dataSource={objects}
                locale={{ emptyText: '🔍 Aucun objet de référence configuré. Ajoutez-en un ci-dessous.' }}
                renderItem={(obj, idx) => (
                  <List.Item
                    actions={[
                      <Tooltip title="Supprimer" key="delete">
                        <Button 
                          icon={<DeleteOutlined />} 
                          danger 
                          size="small"
                          onClick={() => removeObject(idx)}
                        />
                      </Tooltip>
                    ]}
                  >
                    <Space className="w-full" style={{ width: '100%' }}>
                      {OBJECT_TYPE_ICONS[obj.type] || <CameraOutlined />}
                      
                      <Select 
                        value={obj.type} 
                        style={{ width: 150 }}
                        onChange={(value) => updateObject(idx, 'type', value)}
                      >
                        <Select.Option value="panneau">🔲 Panneau PV</Select.Option>
                        <Select.Option value="onduleur">⚡ Onduleur</Select.Option>
                        <Select.Option value="toiture">🏠 Toiture</Select.Option>
                        <Select.Option value="fenetre">🪟 Fenêtre</Select.Option>
                        <Select.Option value="porte">🚪 Porte</Select.Option>
                        <Select.Option value="custom">🔧 Personnalisé</Select.Option>
                      </Select>

                      <InputNumber 
                        value={obj.width}
                        onChange={(value) => updateObject(idx, 'width', value || 0)}
                        addonBefore="L"
                        addonAfter={obj.unit}
                        min={0.01}
                        step={0.1}
                        style={{ width: 140 }}
                      />

                      <span style={{ fontSize: 16, color: '#999' }}>×</span>

                      <InputNumber 
                        value={obj.height}
                        onChange={(value) => updateObject(idx, 'height', value || 0)}
                        addonBefore="H"
                        addonAfter={obj.unit}
                        min={0.01}
                        step={0.1}
                        style={{ width: 140 }}
                      />

                      <Select 
                        value={obj.unit}
                        style={{ width: 80 }}
                        onChange={(value) => updateObject(idx, 'unit', value as 'm' | 'cm')}
                      >
                        <Select.Option value="m">m</Select.Option>
                        <Select.Option value="cm">cm</Select.Option>
                      </Select>
                    </Space>
                  </List.Item>
                )}
              />

              <Button 
                icon={<PlusOutlined />} 
                type="dashed" 
                block 
                onClick={addObject}
                className="mt-4"
              >
                Ajouter un objet de référence
              </Button>
            </Card>

            <Card title="⚙️ Paramètres de Détection IA">
              <Form.Item 
                label="Nombre minimum de photos" 
                name="minPhotos"
                tooltip="Nombre de photos à capturer pour améliorer la précision via fusion multi-perspective (3-5 recommandé)"
                rules={[{ required: true, message: 'Requis' }]}
              >
                <InputNumber 
                  min={1} 
                  max={10} 
                  style={{ width: '100%' }}
                  addonAfter="photos"
                />
              </Form.Item>

              <Form.Item 
                label="Seuil de confiance IA" 
                name="confidenceThreshold"
                tooltip="Niveau minimum de confiance pour valider une détection (0.7 = 70%). Plus élevé = plus strict."
                rules={[{ required: true, message: 'Requis' }]}
              >
                <InputNumber 
                  min={0.5} 
                  max={1} 
                  step={0.05} 
                  style={{ width: '100%' }}
                  formatter={value => `${(parseFloat(value?.toString() || '0') * 100).toFixed(0)}%`}
                />
              </Form.Item>

              <Divider />

              <Form.Item 
                label="Fusion multi-photos"
                name="useFusion"
                valuePropName="checked"
                tooltip="Combine plusieurs photos prises de différents angles pour améliorer la détection des bords"
              >
                <Switch 
                  checkedChildren="✓"
                  unCheckedChildren="✗"
                />
              </Form.Item>

              <Form.Item 
                label="Détection contours Sharp"
                name="useSharp"
                valuePropName="checked"
                tooltip="Utilise Sharp pour détecter et améliorer les contours avant l'analyse IA"
              >
                <Switch 
                  checkedChildren="✓"
                  unCheckedChildren="✗"
                />
              </Form.Item>
            </Card>
          </Form>
        </>
      )}
    </Modal>
  );
};

export default ReferenceObjectsConfig;
