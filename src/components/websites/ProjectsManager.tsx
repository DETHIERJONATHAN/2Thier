/**
 * Composant de gestion des projets/réalisations
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

interface Project {
  id: number;
  key: string;
  title: string;
  location: string;
  details: string;
  images: string[];
  tags: string[];
  completedAt?: Date;
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
}

interface ProjectsManagerProps {
  websiteId: number;
  siteName: string;
  industry: string;
}

const SortableItem: React.FC<{ project: Project; onEdit: () => void; onDelete: () => void; onToggle: () => void }> = ({ 
  project, 
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
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        size="small"
        style={{ marginBottom: 8, opacity: project.isActive ? 1 : 0.5 }}
        styles={{ body: { padding: '12px' } }}
      >
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <div {...attributes} {...listeners} style={{ cursor: 'grab', padding: '4px' }}>
              <DragOutlined />
            </div>
            <div>
              <Space>
                <strong>{project.title}</strong>
                {project.isFeatured && <StarFilled style={{ color: '#faad14' }} />}
                {!project.isActive && <Tag color="default">Inactif</Tag>}
              </Space>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {project.location} • {project.completedAt ? dayjs(project.completedAt).format('MMMM YYYY') : 'Date inconnue'}
              </div>
              {project.tags.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {project.tags.map(tag => <Tag key={tag} color="blue">{tag}</Tag>)}
                </div>
              )}
            </div>
          </Space>
          <Space>
            <Tooltip title={project.isFeatured ? 'Retirer des favoris' : 'Mettre en avant'}>
              <Button
                type="text"
                size="small"
                icon={project.isFeatured ? <StarFilled /> : <StarOutlined />}
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
              title="Supprimer ce projet ?"
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

export const ProjectsManager: React.FC<ProjectsManagerProps> = ({ websiteId, siteName, industry }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();
  const { api } = useAuthenticatedApi();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchProjects();
  }, [websiteId]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/website-projects/${websiteId}`);
      setProjects(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Erreur chargement projets:', error);
      message.error('Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = projects.findIndex((p) => p.id === active.id);
      const newIndex = projects.findIndex((p) => p.id === over.id);

      const newProjects = arrayMove(projects, oldIndex, newIndex);
      setProjects(newProjects);

      try {
        await api.post('/api/website-projects/reorder', {
          projects: newProjects.map((p, index) => ({ id: p.id, displayOrder: index + 1 }))
        });
        message.success('Ordre mis à jour');
      } catch (error) {
        console.error('Erreur réorganisation:', error);
        message.error('Erreur lors de la réorganisation');
        fetchProjects();
      }
    }
  };

  const handleAdd = () => {
    setEditingProject(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    form.setFieldsValue({
      ...project,
      completedAt: project.completedAt ? dayjs(project.completedAt) : null,
      images: project.images.join('\n'),
      tags: project.tags.join(', ')
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/website-projects/${id}`);
      message.success('Projet supprimé');
      fetchProjects();
    } catch (error) {
      console.error('Erreur suppression:', error);
      message.error('Erreur lors de la suppression');
    }
  };

  const handleToggle = async (project: Project) => {
    try {
      await api.put(`/api/website-projects/${project.id}`, {
        isFeatured: !project.isFeatured
      });
      message.success(project.isFeatured ? 'Retiré des favoris' : 'Mis en avant');
      fetchProjects();
    } catch (error) {
      console.error('Erreur toggle:', error);
      message.error('Erreur lors de la modification');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        ...values,
        completedAt: values.completedAt ? values.completedAt.toDate() : null,
        images: typeof values.images === 'string' 
          ? values.images.split('\n').filter((l: string) => l.trim()) 
          : values.images,
        tags: typeof values.tags === 'string'
          ? values.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t)
          : values.tags
      };

      if (editingProject) {
        await api.put(`/api/website-projects/${editingProject.id}`, payload);
        message.success('Projet modifié');
      } else {
        await api.post('/api/website-projects', {
          websiteId,
          ...payload
        });
        message.success('Projet créé');
      }
      setModalVisible(false);
      fetchProjects();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
    }
  };

  const handleAIGenerated = (content: any) => {
    form.setFieldsValue({
      key: content.key,
      title: content.title,
      location: content.location,
      details: content.details,
      images: content.images?.join('\n') || '',
      tags: content.tags?.join(', ') || ''
    });
    message.success('✨ Contenu IA appliqué au formulaire !');
  };

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <strong>{projects.length} projet(s)</strong>
          </div>
          <Space>
            <AIContentAssistant
              type="project"
              siteName={siteName}
              industry={industry}
              onContentGenerated={handleAIGenerated}
              buttonText="✨ Générer avec l'IA"
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Ajouter un projet
            </Button>
          </Space>
        </div>

        {projects.length === 0 ? (
          <Empty description="Aucun projet. Créez-en un ou utilisez l'IA !" />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {projects.map((project) => (
                <SortableItem
                  key={project.id}
                  project={project}
                  onEdit={() => handleEdit(project)}
                  onDelete={() => handleDelete(project.id)}
                  onToggle={() => handleToggle(project)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </Space>

      <Modal
        title={editingProject ? 'Modifier le projet' : 'Nouveau projet'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="Clé (slug)" name="key" rules={[{ required: true }]}>
            <Input placeholder="projet-bruxelles-2024" />
          </Form.Item>

          <Form.Item label="Titre" name="title" rules={[{ required: true }]}>
            <Input placeholder="Installation 10kWc à Bruxelles" />
          </Form.Item>

          <Form.Item label="Localisation" name="location">
            <Input placeholder="Bruxelles" />
          </Form.Item>

          <Form.Item label="Date de réalisation" name="completedAt">
            <DatePicker style={{ width: '100%' }} placeholder="Sélectionner une date" />
          </Form.Item>

          <Form.Item label="Détails" name="details">
            <TextArea rows={4} placeholder="Description complète du projet" />
          </Form.Item>

          <Form.Item label="Images (URLs)" name="images">
            <TextArea rows={3} placeholder="Une URL par ligne" />
          </Form.Item>

          <Form.Item label="Tags (séparés par virgule)" name="tags">
            <Input placeholder="photovoltaïque, résidentiel, 10kWc" />
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

export default ProjectsManager;
