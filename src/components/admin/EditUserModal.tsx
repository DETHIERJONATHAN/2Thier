import React, { useEffect } from 'react';
import { Modal, Form, Select, Button, message, Input } from 'antd';
import { z } from 'zod';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

// Types locaux pour éviter les conflits d'import
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  vatNumber?: string;
  avatarUrl?: string;
  organizationRole?: {
    id: string;
    name: string;
    label?: string;
  };
  userOrganizationId?: string;
  status?: string;
}

interface Role {
  id: string;
  name: string;
  label?: string;
}

// 🛡️ SCHÉMA ZOD ULTRA-STRICT POUR VALIDATION
const editUserSchema = z.object({
  firstName: z.string()
    .min(1, "Prénom requis")
    .max(50, "Prénom trop long"),
  lastName: z.string()
    .min(1, "Nom requis")
    .max(50, "Nom trop long"),
  email: z.string()
    .email("Email invalide")
    .min(1, "Email requis"),
  phoneNumber: z.string()
    .optional()
    .nullable()
    .transform(val => val === "" ? null : val),
  address: z.string()
    .optional()
    .nullable()
    .transform(val => val === "" ? null : val),
  vatNumber: z.string()
    .optional()
    .nullable()
    .transform(val => val === "" ? null : val),
  avatarUrl: z.string()
    .url("URL d'avatar invalide")
    .optional()
    .nullable()
    .transform(val => val === "" ? null : val),
  roleId: z.string()
    .uuid("ID de rôle invalide")
    .min(1, "Rôle requis")
});

interface EditUserModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  user: User | null;
  roles: Role[];
}

const EditUserModal: React.FC<EditUserModalProps> = ({ open, onCancel, onSuccess, user, roles }) => {
  const [form] = Form.useForm();
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        vatNumber: user.vatNumber,
        avatarUrl: user.avatarUrl,
        roleId: user.organizationRole?.id,
      });
    }
  }, [user, form]);

  const handleUpdate = async (values: { 
    firstName: string; 
    lastName: string; 
    email: string; 
    phoneNumber?: string; 
    address?: string; 
    vatNumber?: string; 
    avatarUrl?: string; 
    roleId: string 
  }) => {
    if (!user || !user.userOrganizationId) {
      message.error("Impossible de trouver l'identifiant de l'utilisateur.");
      return;
    }

    // 🛡️ VALIDATION ZOD STRICTE
    const validationResult = editUserSchema.safeParse(values);
    if (!validationResult.success) {
      message.error("Données invalides: " + validationResult.error.errors.map(e => e.message).join(", "));
      return;
    }

    setLoading(true);
    try {
      // Mise à jour des informations utilisateur (nom, prénom, email, etc.)
      const userUpdateData = {
        firstName: validationResult.data.firstName,
        lastName: validationResult.data.lastName,
        email: validationResult.data.email,
        phoneNumber: validationResult.data.phoneNumber,
        address: validationResult.data.address,
        vatNumber: validationResult.data.vatNumber,
        avatarUrl: validationResult.data.avatarUrl
      };
      
      const userResponse = await api.patch(`/users/${user.id}`, userUpdateData);
      
      // Mise à jour du rôle dans l'organisation
      const roleUpdateData = {
        roleId: validationResult.data.roleId
      };
      
      const roleResponse = await api.patch(`/users/user-organizations/${user.userOrganizationId}`, roleUpdateData);
      
      // Vérification que les deux mises à jour ont réussi
      if (userResponse?.success && roleResponse?.success) {
        message.success('Utilisateur mis à jour avec succès !');
        onSuccess();
      } else {
        message.error('Erreur lors de la mise à jour de l\'utilisateur');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      message.error('Erreur lors de la mise à jour de l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Modifier l'utilisateur ${user?.firstName} ${user?.lastName}`}
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>
          Annuler
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
          Mettre à jour
        </Button>,
      ]}
      width={800}
    >
      <Form form={form} onFinish={handleUpdate} layout="vertical">
        <Form.Item
          name="firstName"
          label="Prénom"
          rules={[
            { required: true, message: 'Veuillez saisir le prénom.' },
            { max: 50, message: 'Le prénom ne peut pas dépasser 50 caractères.' }
          ]}
        >
          <Input placeholder="Prénom de l'utilisateur" />
        </Form.Item>

        <Form.Item
          name="lastName"
          label="Nom de famille"
          rules={[
            { required: true, message: 'Veuillez saisir le nom de famille.' },
            { max: 50, message: 'Le nom ne peut pas dépasser 50 caractères.' }
          ]}
        >
          <Input placeholder="Nom de famille de l'utilisateur" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Adresse email"
          rules={[
            { required: true, message: 'Veuillez saisir l\'email.' },
            { type: 'email', message: 'Veuillez saisir un email valide.' }
          ]}
        >
          <Input placeholder="email@example.com" />
        </Form.Item>

        <Form.Item
          name="phoneNumber"
          label="Numéro de téléphone"
        >
          <Input placeholder="+32 123 456 789" />
        </Form.Item>

        <Form.Item
          name="address"
          label="Adresse complète"
        >
          <Input.TextArea 
            placeholder="Rue, ville, code postal, pays" 
            rows={3}
          />
        </Form.Item>

        <Form.Item
          name="vatNumber"
          label="Numéro de TVA"
        >
          <Input placeholder="BE0123456789" />
        </Form.Item>

        <Form.Item
          name="avatarUrl"
          label="URL de l'avatar"
          rules={[
            { type: 'url', message: 'Veuillez saisir une URL valide.' }
          ]}
        >
          <Input placeholder="https://example.com/avatar.jpg" />
        </Form.Item>

        <Form.Item
          name="roleId"
          label="Rôle dans l'organisation"
          rules={[{ required: true, message: 'Veuillez sélectionner un rôle.' }]}
        >
          <Select placeholder="Sélectionner un rôle">
            {roles.map(role => (
              <Select.Option key={role.id} value={role.id}>{role.label || role.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditUserModal;
