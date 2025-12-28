import React, { useMemo } from 'react';
import { Modal, Form, Input, Button, Alert, message, Space, Spin } from 'antd';

type FieldType = 'text' | 'email' | 'phone' | 'textarea';

interface WebsiteFormField {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
}

export interface WebsiteFormConfig {
  id: string;
  title?: string;
  description?: string;
  submitLabel?: string;
  fields: WebsiteFormField[];
  successMessage?: string;
}

interface WebsiteFormModalProps {
  visible: boolean;
  loading?: boolean;
  formConfig?: WebsiteFormConfig | null;
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
}

const typeToInput: Record<FieldType, React.ComponentType<any>> = {
  text: Input,
  email: Input,
  phone: Input,
  textarea: Input.TextArea
};

export const WebsiteFormModal: React.FC<WebsiteFormModalProps> = ({
  visible,
  loading = false,
  formConfig,
  initialValues,
  onSubmit,
  onCancel
}) => {
  const [form] = Form.useForm();

  const normalizedFields = useMemo(() => formConfig?.fields ?? [], [formConfig]);

  const handleFinish = async (values: Record<string, any>) => {
    if (!formConfig) {
      message.error("Formulaire indisponible");
      return;
    }

    await onSubmit({
      formId: formConfig.id,
      ...values
    });
    form.resetFields();
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      title={formConfig?.title || 'Demande'}
    >
      {loading && !formConfig ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <Spin />
        </div>
      ) : formConfig ? (
        <Form
          layout="vertical"
          form={form}
          initialValues={initialValues}
          onFinish={handleFinish}
          disabled={loading}
        >
          {formConfig.description && (
            <Alert
              message={formConfig.description}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {normalizedFields.map((field) => {
            const Component = typeToInput[field.type] || Input;
            const inputProps: Record<string, any> = {};
            if (field.type === 'email') {
              inputProps.type = 'email';
            }
            if (field.type === 'phone') {
              inputProps.type = 'tel';
            }

            return (
              <Form.Item
                key={field.id}
                name={field.id}
                label={field.label}
                rules={[{ required: field.required, message: `${field.label} est requis` }]}
              >
                <Component placeholder={field.placeholder} {...inputProps} rows={field.type === 'textarea' ? 4 : undefined} />
              </Form.Item>
            );
          })}

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={onCancel} disabled={loading}>
                Annuler
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {formConfig.submitLabel || 'Envoyer'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      ) : (
        <Alert message="Formulaire introuvable" type="error" />
      )}
    </Modal>
  );
};

export default WebsiteFormModal;