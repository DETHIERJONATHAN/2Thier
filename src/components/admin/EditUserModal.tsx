import React, { useEffect } from 'react';
import { Modal, Form, Select, Button, message, Input } from 'antd';
import { z } from 'zod';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useTranslation } from 'react-i18next';

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

// 🛡️ SCHÉMA ZOD POUR VALIDATION
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
    .optional()
    .nullable()
    .transform(val => val === "" ? null : val)
    .refine(val => !val || val.startsWith('http'), "URL d'avatar invalide"),
  roleId: z.string()
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
  const { t } = useTranslation();
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
    console.log('[EditUserModal] handleUpdate appelé avec:', values);
    console.log('[EditUserModal] user:', user);
    console.log('[EditUserModal] userOrganizationId:', user?.userOrganizationId);
    
    if (!user || !user.userOrganizationId) {
      console.error('[EditUserModal] userOrganizationId manquant!');
      message.error("Impossible de trouver l'identifiant de l'utilisateur.");
      return;
    }

    // 🛡️ VALIDATION ZOD STRICTE
    const validationResult = editUserSchema.safeParse(values);
    console.log('[EditUserModal] Validation Zod:', validationResult);
    if (!validationResult.success) {
      console.error('[EditUserModal] Erreurs Zod:', validationResult.error.errors);
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
      
      console.log('[EditUserModal] Mise à jour utilisateur:', { userId: user.id, data: userUpdateData });
      const userResponse = await api.patch(`/api/users/${user.id}`, userUpdateData);
      console.log('[EditUserModal] Réponse user update:', userResponse);
      
      // Mise à jour du rôle dans l'organisation
      const roleUpdateData = {
        roleId: validationResult.data.roleId
      };
      
      console.log('[EditUserModal] Mise à jour rôle:', { userOrgId: user.userOrganizationId, data: roleUpdateData });
      const roleResponse = await api.patch(`/api/users/user-organizations/${user.userOrganizationId}`, roleUpdateData);
      console.log('[EditUserModal] Réponse role update:', roleResponse);
      
      // Vérification que les deux mises à jour ont réussi
      if (userResponse?.success && roleResponse?.success) {
        message.success('Utilisateur mis à jour avec succès !');
        onSuccess();
      } else {
        console.error('[EditUserModal] Échec:', { userResponse, roleResponse });
        message.error('Erreur lors de la mise à jour de l\'utilisateur');
      }
    } catch (error) {
      console.error('[EditUserModal] Erreur lors de la mise à jour:', error);
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
          label={t('fields.firstName')}
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
          label={t('fields.phoneNumber')}
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
          label={t('fields.vatNumber')}
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
