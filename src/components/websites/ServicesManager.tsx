/**
 * Composant de gestion des services d'un site web
 * - Liste avec drag & drop
 * - CRUD complet
 * - Génération IA
 */

import React, { useState, useEffect } from 'react';
import {
  List,
  Card,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Switch,
  message,
  Empty,
  Tooltip,
  Popconfirm
} from 'antd';
import {
  DragOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import AIContentAssistant from '../AIContentAssistant';

const { TextArea } = Input;

interface Service {
  id: number;
  key: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaUrl: string;
  isActive: boolean;
  displayOrder: number;
}

interface ServicesManagerProps {
  websiteId: number;
  siteName: string;
  industry: string;
}

// Composant item draggable
const SortableItem: React.FC<{ service: Service; onEdit: () => void; onDelete: () => void; onToggle: () => void }> = ({ 
  service, 
  onEdit, 
  onDelete,
  onToggle 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: service.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        size="small"
        style={{ marginBottom: 8, opacity: service.isActive ? 1 : 0.5 }}
        styles={{ body: { padding: '12px' } }}
      >
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <div {...attributes} {...listeners} style={{ cursor: 'grab', padding: '4px' }}>
              <DragOutlined />
            </div>
            <div>
              <Space>
                <strong>{service.title}</strong>
                {!service.isActive && <Tag color="default">Inactif</Tag>}
              </Space>
              <div style={{ fontSize: '12px', color: '#666' }}>{service.description}</div>
            </div>
          </Space>
          <Space>
            <Tooltip title={service.isActive ? 'Désactiver' : 'Activer'}>
              <Button
                type="text"
                size="small"
                icon={service.isActive ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                onClick={onToggle}
              />
            </Tooltip>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={onEdit}
            />
            <Popconfirm
              title="Supprimer ce service ?"
              description="Cette action est irréversible."
              onConfirm={onDelete}
              okText="Supprimer"
              cancelText="Annuler"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Space>
        </Space>
      </Card>
    </div>
  );
};

export const ServicesManager: React.FC<ServicesManagerProps> = ({ websiteId, siteName, industry }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form] = Form.useForm();
  const { api } = useAuthenticatedApi();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchServices();
  }, [websiteId]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/website-services/${websiteId}`);
      setServices(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Erreur chargement services:', error);
      message.error('Erreur lors du chargement des services');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = services.findIndex((s) => s.id === active.id);
      const newIndex = services.findIndex((s) => s.id === over.id);

      const newServices = arrayMove(services, oldIndex, newIndex);
      setServices(newServices);

      // Mettre à jour l'ordre dans la base de données
      try {
        await api.post('/api/website-services/reorder', {
          services: newServices.map((s, index) => ({ id: s.id, displayOrder: index + 1 }))
        });
        message.success('Ordre mis à jour');
      } catch (error) {
        console.error('Erreur réorganisation:', error);
        message.error('Erreur lors de la réorganisation');
        fetchServices(); // Recharger en cas d'erreur
      }
    }
  };

  const handleAdd = () => {
    setEditingService(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    form.setFieldsValue(service);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/website-services/${id}`);
      message.success('Service supprimé');
      fetchServices();
    } catch (error) {
      console.error('Erreur suppression:', error);
      message.error('Erreur lors de la suppression');
    }
  };

  const handleToggle = async (service: Service) => {
    try {
      await api.put(`/api/website-services/${service.id}`, {
        isActive: !service.isActive
      });
      message.success(service.isActive ? 'Service désactivé' : 'Service activé');
      fetchServices();
    } catch (error) {
      console.error('Erreur toggle:', error);
      message.error('Erreur lors de la modification');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingService) {
        await api.put(`/api/website-services/${editingService.id}`, values);
        message.success('Service modifié');
      } else {
        await api.post('/api/website-services', {
          websiteId,
          ...values
        });
        message.success('Service créé');
      }
      setModalVisible(false);
      fetchServices();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
    }
  };

  const handleAIGenerated = (content: any) => {
    form.setFieldsValue({
      key: content.key,
      icon: content.icon,
      title: content.title,
      description: content.description,
      features: content.features,
      ctaText: content.ctaText
    });
    message.success('✨ Contenu IA appliqué au formulaire !');
  };

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <strong>{services.length} service(s)</strong>
          </div>
          <Space>
            <AIContentAssistant
              type="service"
              siteName={siteName}
              industry={industry}
              onContentGenerated={handleAIGenerated}
              buttonText="✨ Générer avec l'IA"
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Ajouter un service
            </Button>
          </Space>
        </div>

        {services.length === 0 ? (
          <Empty description="Aucun service. Créez-en un ou utilisez l'IA !" />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={services.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {services.map((service) => (
                <SortableItem
                  key={service.id}
                  service={service}
                  onEdit={() => handleEdit(service)}
                  onDelete={() => handleDelete(service.id)}
                  onToggle={() => handleToggle(service)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </Space>

      <Modal
        title={editingService ? 'Modifier le service' : 'Nouveau service'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="Clé (slug)" name="key" rules={[{ required: true }]}>
            <Input placeholder="service-photovoltaique" />
          </Form.Item>

          <Form.Item label="Icône" name="icon" rules={[{ required: true }]}>
            <Input placeholder="ThunderboltOutlined" />
          </Form.Item>

          <Form.Item label="Titre" name="title" rules={[{ required: true }]}>
            <Input placeholder="Panneaux Photovoltaïques" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <TextArea rows={2} placeholder="Description courte et accrocheuse" />
          </Form.Item>

          <Form.Item label="Caractéristiques" name="features">
            <Input.TextArea
              rows={4}
              placeholder="Une caractéristique par ligne"
              onChange={(e) => {
                const lines = e.target.value.split('\n').filter(l => l.trim());
                form.setFieldValue('features', lines);
              }}
            />
          </Form.Item>

          <Form.Item label="Call-to-action" name="ctaText">
            <Input placeholder="Demander un devis" />
          </Form.Item>

          <Form.Item label="URL CTA" name="ctaUrl">
            <Input placeholder="/contact" />
          </Form.Item>

          <Form.Item label="Actif" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Sauvegarder
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ServicesManager;
