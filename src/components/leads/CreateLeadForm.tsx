import React from 'react';
import { Form, Input, Select, Button, DatePicker, message } from 'antd';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';

interface CreateLeadFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const CreateLeadForm: React.FC<CreateLeadFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const [form] = Form.useForm();
  const { api } = useAuthenticatedApi();
  const { currentOrganization } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: any) => {
    if (!currentOrganization?.id) {
      message.error("Organisation non sélectionnée");
      return;
    }

    setLoading(true);
    try {
      // Formatter les données selon le modèle Prisma
      const leadData = {
        organizationId: currentOrganization.id,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        company: values.company,
        source: values.source,
        status: values.status || 'new',
        website: values.website,
        notes: values.notes,
        data: {
          name: `${values.firstName} ${values.lastName}`.trim(),
          ...values.data
        }
      };

      const response = await api.post('/api/leads', leadData);

      if (response.success) {
        message.success('Lead créé avec succès');
        form.resetFields();
        onSuccess?.();
      } else {
        throw new Error('Erreur lors de la création du lead');
      }
    } catch (error: any) {
      message.error(error.message || 'Erreur lors de la création du lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
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

      <Form.Item className="mb-0 flex justify-end space-x-2">
        <Button onClick={onCancel}>
          Annuler
        </Button>
        <Button type="primary" htmlType="submit" loading={loading}>
          Créer le lead
        </Button>
      </Form.Item>
    </Form>
  );
};

export default CreateLeadForm;
