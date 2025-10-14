/**
 * Composant de gestion des témoignages clients
 * - Liste avec drag & drop
 * - CRUD complet
 * - Génération IA
 */

import React, { useState, useEffect } from 'react';
import {
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
  Popconfirm,
  Rate,
  DatePicker
} from 'antd';
import {
  DragOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  StarOutlined,
  StarFilled
} from '@ant-design/icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import AIContentAssistant from '../AIContentAssistant';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface Testimonial {
  id: number;
  key: string;
  customerName: string;
  rating: number;
  text: string;
  location?: string;
  service?: string;
  publishedAt?: Date;
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
}

interface TestimonialsManagerProps {
  websiteId: number;
  siteName: string;
  industry: string;
}

const SortableItem: React.FC<{ testimonial: Testimonial; onEdit: () => void; onDelete: () => void; onToggle: () => void }> = ({ 
  testimonial, 
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
  } = useSortable({ id: testimonial.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        size="small"
        style={{ marginBottom: 8, opacity: testimonial.isActive ? 1 : 0.5 }}
        styles={{ body: { padding: '12px' } }}
      >
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <div {...attributes} {...listeners} style={{ cursor: 'grab', padding: '4px' }}>
              <DragOutlined />
            </div>
            <div style={{ flex: 1 }}>
              <Space>
                <strong>{testimonial.customerName}</strong>
                <Rate disabled value={testimonial.rating} style={{ fontSize: 14 }} />
                {testimonial.isFeatured && <StarFilled style={{ color: '#faad14' }} />}
                {!testimonial.isActive && <Tag color="default">Inactif</Tag>}
              </Space>
              <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                "{testimonial.text.substring(0, 100)}{testimonial.text.length > 100 ? '...' : ''}"
              </div>
              {testimonial.location && (
                <div style={{ fontSize: '11px', color: '#999', marginTop: 2 }}>
                  {testimonial.location} {testimonial.service && `• ${testimonial.service}`}
                </div>
              )}
            </div>
          </Space>
          <Space>
            <Tooltip title={testimonial.isFeatured ? 'Retirer des favoris' : 'Mettre en avant'}>
              <Button
                type="text"
                size="small"
                icon={testimonial.isFeatured ? <StarFilled /> : <StarOutlined />}
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
              title="Supprimer ce témoignage ?"
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

export const TestimonialsManager: React.FC<TestimonialsManagerProps> = ({ websiteId, siteName, industry }) => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [form] = Form.useForm();
  const { api } = useAuthenticatedApi();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchTestimonials();
  }, [websiteId]);

  const fetchTestimonials = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/website-testimonials/${websiteId}`);
      setTestimonials(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Erreur chargement témoignages:', error);
      message.error('Erreur lors du chargement des témoignages');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = testimonials.findIndex((t) => t.id === active.id);
      const newIndex = testimonials.findIndex((t) => t.id === over.id);

      const newTestimonials = arrayMove(testimonials, oldIndex, newIndex);
      setTestimonials(newTestimonials);

      try {
        await api.post('/api/website-testimonials/reorder', {
          testimonials: newTestimonials.map((t, index) => ({ id: t.id, displayOrder: index + 1 }))
        });
        message.success('Ordre mis à jour');
      } catch (error) {
        console.error('Erreur réorganisation:', error);
        message.error('Erreur lors de la réorganisation');
        fetchTestimonials();
      }
    }
  };

  const handleAdd = () => {
    setEditingTestimonial(null);
    form.resetFields();
    form.setFieldValue('rating', 5); // Par défaut 5 étoiles
    setModalVisible(true);
  };

  const handleEdit = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    form.setFieldsValue({
      ...testimonial,
      publishedAt: testimonial.publishedAt ? dayjs(testimonial.publishedAt) : null
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/website-testimonials/${id}`);
      message.success('Témoignage supprimé');
      fetchTestimonials();
    } catch (error) {
      console.error('Erreur suppression:', error);
      message.error('Erreur lors de la suppression');
    }
  };

  const handleToggle = async (testimonial: Testimonial) => {
    try {
      await api.put(`/api/website-testimonials/${testimonial.id}`, {
        isFeatured: !testimonial.isFeatured
      });
      message.success(testimonial.isFeatured ? 'Retiré des favoris' : 'Mis en avant');
      fetchTestimonials();
    } catch (error) {
      console.error('Erreur toggle:', error);
      message.error('Erreur lors de la modification');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        ...values,
        publishedAt: values.publishedAt ? values.publishedAt.toDate() : null
      };

      if (editingTestimonial) {
        await api.put(`/api/website-testimonials/${editingTestimonial.id}`, payload);
        message.success('Témoignage modifié');
      } else {
        await api.post('/api/website-testimonials', {
          websiteId,
          ...payload
        });
        message.success('Témoignage créé');
      }
      setModalVisible(false);
      fetchTestimonials();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
    }
  };

  const handleAIGenerated = (content: any) => {
    form.setFieldsValue({
      key: content.key,
      customerName: content.customerName,
      rating: content.rating || 5,
      text: content.text,
      location: content.location,
      service: content.service
    });
    message.success('✨ Contenu IA appliqué au formulaire !');
  };

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <strong>{testimonials.length} témoignage(s)</strong>
          </div>
          <Space>
            <AIContentAssistant
              type="testimonial"
              siteName={siteName}
              industry={industry}
              onContentGenerated={handleAIGenerated}
              buttonText="✨ Générer avec l'IA"
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Ajouter un témoignage
            </Button>
          </Space>
        </div>

        {testimonials.length === 0 ? (
          <Empty description="Aucun témoignage. Créez-en un ou utilisez l'IA !" />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={testimonials.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {testimonials.map((testimonial) => (
                <SortableItem
                  key={testimonial.id}
                  testimonial={testimonial}
                  onEdit={() => handleEdit(testimonial)}
                  onDelete={() => handleDelete(testimonial.id)}
                  onToggle={() => handleToggle(testimonial)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </Space>

      <Modal
        title={editingTestimonial ? 'Modifier le témoignage' : 'Nouveau témoignage'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ rating: 5 }}>
          <Form.Item label="Clé (slug)" name="key" rules={[{ required: true }]}>
            <Input placeholder="client-bruxelles-2024" />
          </Form.Item>

          <Form.Item label="Nom du client" name="customerName" rules={[{ required: true }]}>
            <Input placeholder="Jean D." />
          </Form.Item>

          <Form.Item label="Note" name="rating" rules={[{ required: true }]}>
            <Rate />
          </Form.Item>

          <Form.Item label="Témoignage" name="text" rules={[{ required: true }]}>
            <TextArea rows={5} placeholder="Témoignage complet du client..." />
          </Form.Item>

          <Form.Item label="Localisation" name="location">
            <Input placeholder="Bruxelles" />
          </Form.Item>

          <Form.Item label="Service concerné" name="service">
            <Input placeholder="Installation photovoltaïque" />
          </Form.Item>

          <Form.Item label="Date de publication" name="publishedAt">
            <DatePicker style={{ width: '100%' }} placeholder="Sélectionner une date" />
          </Form.Item>

          <Form.Item label="Mettre en avant" name="isFeatured" valuePropName="checked">
            <Switch />
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

export default TestimonialsManager;
