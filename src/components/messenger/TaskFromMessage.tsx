/**
 * 📋 TaskFromMessage — Create a task directly from a conversation message
 * Pops up a modal to assign, set deadline, and priority
 */
import React, { useEffect } from 'react';
import { Modal, Input, Select, DatePicker, Form } from 'antd';

interface TaskFromMessageProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    assigneeId: string;
    deadline?: string;
    priority: string;
    description?: string;
  }) => void;
  messageContent?: string;
  participants: { id: string; firstName: string; lastName: string }[];
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: '🟢 Basse', color: '#27ae60' },
  { value: 'medium', label: '🟡 Moyenne', color: '#f39c12' },
  { value: 'high', label: '🟠 Haute', color: '#e67e22' },
  { value: 'urgent', label: '🔴 Urgente', color: '#e74c3c' },
];

export const TaskFromMessage: React.FC<TaskFromMessageProps> = ({
  open,
  onClose,
  onSubmit,
  messageContent,
  participants,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && messageContent) {
      form.setFieldsValue({
        title: messageContent.slice(0, 200),
        priority: 'medium',
      });
    }
  }, [open, messageContent, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit({
        title: values.title,
        assigneeId: values.assigneeId,
        deadline: values.deadline?.toISOString(),
        priority: values.priority,
        description: values.description,
      });
      form.resetFields();
      onClose();
    } catch {
      // validation failed
    }
  };

  return (
    <Modal
      open={open}
      title="📋 Créer une tâche"
      onCancel={onClose}
      onOk={handleOk}
      okText="Créer"
      cancelText="Annuler"
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          name="title"
          label="Titre de la tâche"
          rules={[{ required: true, message: 'Le titre est requis' }]}
        >
          <Input placeholder="Titre de la tâche..." />
        </Form.Item>

        <Form.Item
          name="assigneeId"
          label="Assigné à"
          rules={[{ required: true, message: 'Sélectionnez un responsable' }]}
        >
          <Select
            placeholder="Choisir un responsable..."
            showSearch
            filterOption={(input, option) =>
              (option?.label as string || '').toLowerCase().includes(input.toLowerCase())
            }
            options={participants.map(p => ({
              value: p.id,
              label: `${p.firstName} ${p.lastName}`.trim(),
            }))}
          />
        </Form.Item>

        <div className="flex gap-3">
          <Form.Item name="priority" label="Priorité" className="flex-1">
            <Select options={PRIORITY_OPTIONS} />
          </Form.Item>

          <Form.Item name="deadline" label="Deadline" className="flex-1">
            <DatePicker className="w-full" format="DD/MM/YYYY" />
          </Form.Item>
        </div>

        <Form.Item name="description" label="Description (optionnel)">
          <Input.TextArea rows={3} placeholder="Détails supplémentaires..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TaskFromMessage;
