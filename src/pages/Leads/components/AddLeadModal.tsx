import React from 'react';
import { Modal, Form, Input, Select, Button, DatePicker, message } from 'antd';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { useAuth } from '../../../auth/useAuth';

interface AddLeadModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
}

const AddLeadModal: React.FC<AddLeadModalProps> = ({
  visible,
  onCancel,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const { api } = useAuthenticatedApi();
  const { currentOrganization } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (values: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    source: string;
    status?: string;
    website?: string;
    notes?: string;
    nextFollowUpDate?: string;
  }) => {
    if (!currentOrganization?.id) {
      message.error("Organisation non sélectionnée");
      return;
    }

    setLoading(true);
    try {
      const leadData = {
        ...values,
        organizationId: currentOrganization.id,
        name: `${values.firstName} ${values.lastName}`.trim(),
        status: values.status || 'new',
        data: {
          website: values.website,
          notes: values.notes,
          nextFollowUpDate: values.nextFollowUpDate
        }
      };

      const response = await api.post('/api/leads', leadData);

      if (response.success) {
        message.success('Lead créé avec succès');
        form.resetFields();
        onSuccess?.();
        onCancel();
      } else {
        throw new Error('Erreur lors de la création du lead');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création du lead';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Ajouter un nouveau lead"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          status: 'new',
          source: 'manual'
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            label="Prénom"
            name="firstName"
            rules={[{ required: true, message: 'Le prénom est requis' }]}
          >
            <Input placeholder="Prénom du contact" />
          </Form.Item>

          <Form.Item
            label="Nom"
            name="lastName"
            rules={[{ required: true, message: 'Le nom est requis' }]}
          >
            <Input placeholder="Nom du contact" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { type: 'email', message: 'Email invalide' },
              { required: true, message: 'L\'email est requis' }
            ]}
          >
            <Input placeholder="Email professionnel" />
          </Form.Item>

          <Form.Item
            label="Téléphone"
            name="phone"
            rules={[{ required: true, message: 'Le téléphone est requis' }]}
          >
            <Input placeholder="Numéro de téléphone" />
          </Form.Item>
        </div>

        <Form.Item
          label="Entreprise"
          name="company"
          rules={[{ required: true, message: 'L\'entreprise est requise' }]}
        >
          <Input placeholder="Nom de l'entreprise" />
        </Form.Item>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            label="Source"
            name="source"
          >
            <Select>
              <Select.Option value="manual">Ajout manuel</Select.Option>
              <Select.Option value="website">Site web</Select.Option>
              <Select.Option value="referral">Recommandation</Select.Option>
              <Select.Option value="linkedin">LinkedIn</Select.Option>
              <Select.Option value="email">Email</Select.Option>
              <Select.Option value="phone">Téléphone</Select.Option>
              <Select.Option value="other">Autre</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Site web"
            name="website"
          >
            <Input placeholder="Site web de l'entreprise" />
          </Form.Item>
        </div>

        <Form.Item
          label="Notes"
          name="notes"
        >
          <Input.TextArea rows={4} placeholder="Notes importantes sur ce lead..." />
        </Form.Item>

        <Form.Item
          label="Prochain suivi"
          name="nextFollowUpDate"
        >
          <DatePicker 
            className="w-full" 
            format="DD/MM/YYYY"
            placeholder="Date du prochain contact"
          />
        </Form.Item>

        <Form.Item className="mb-0 flex justify-end space-x-2">
          <Button onClick={onCancel}>
            Annuler
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Créer le lead
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddLeadModal;
