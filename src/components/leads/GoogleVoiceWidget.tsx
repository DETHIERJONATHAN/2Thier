import React, { useState } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { 
  Card, 
  Button, 
  Input, 
  Form, 
  Modal, 
  Space, 
  message,
  Tooltip,
  Badge
} from 'antd';
import { 
  PhoneOutlined, 
  MessageOutlined,
  HistoryOutlined,
  UserOutlined
} from '@ant-design/icons';

interface GoogleVoiceWidgetProps {
  leadPhone: string;
  leadName: string;
  leadId: string;
  onCallComplete?: (callData: any) => void;
}

interface CallFormData {
  phoneNumber: string;
  message?: string;
}

const GoogleVoiceWidget: React.FC<GoogleVoiceWidgetProps> = ({ 
  leadPhone, 
  leadName, 
  leadId,
  onCallComplete 
}) => {
  const [calling, setCalling] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [smsModalVisible, setSmsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const api = useAuthenticatedApi();

  // Initier un appel vers le lead
  const handleCall = async () => {
    try {
      setCalling(true);
      
      const response = await api.api.post('/google-voice/make-call', {
        fromNumber: 'auto', // Le système utilisera le numéro de l'utilisateur connecté
        toNumber: leadPhone
      });

      message.success(`Appel initié vers ${leadName}`);
      
      // Sauvegarder l'activité dans l'historique du lead
      if (onCallComplete) {
        onCallComplete({
          type: 'call',
          leadId,
          phoneNumber: leadPhone,
          timestamp: new Date(),
          callId: response.callRecord?.id
        });
      }
      
    } catch (error: any) {
      console.error('Erreur lors de l\'appel:', error);
      message.error('Erreur lors de l\'initiation de l\'appel');
    } finally {
      setCalling(false);
    }
  };

  // Envoyer un SMS au lead
  const handleSendSMS = async (values: CallFormData) => {
    try {
      setSendingSMS(true);
      
      await api.api.post('/google-voice/send-sms', {
        fromNumber: 'auto', // Le système utilisera le numéro de l'utilisateur connecté
        toNumber: leadPhone,
        message: values.message
      });

      message.success(`SMS envoyé à ${leadName}`);
      setSmsModalVisible(false);
      form.resetFields();
      
      // Sauvegarder l'activité dans l'historique du lead
      if (onCallComplete) {
        onCallComplete({
          type: 'sms',
          leadId,
          phoneNumber: leadPhone,
          message: values.message,
          timestamp: new Date()
        });
      }
      
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi SMS:', error);
      message.error('Erreur lors de l\'envoi du SMS');
    } finally {
      setSendingSMS(false);
    }
  };

  return (
    <Card 
      size="small" 
      title={
        <Space>
          <PhoneOutlined />
          Communication
        </Space>
      }
      className="mb-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <UserOutlined className="text-gray-500" />
          <span className="font-medium">{leadName}</span>
        </div>
        <Badge status="processing" text={leadPhone} />
      </div>

      <Space size="small" className="w-full">
        <Tooltip title="Appeler ce lead">
          <Button 
            type="primary"
            icon={<PhoneOutlined />}
            loading={calling}
            onClick={handleCall}
            size="small"
          >
            Appeler
          </Button>
        </Tooltip>

        <Tooltip title="Envoyer un SMS">
          <Button 
            icon={<MessageOutlined />}
            onClick={() => setSmsModalVisible(true)}
            size="small"
          >
            SMS
          </Button>
        </Tooltip>

        <Tooltip title="Historique des appels">
          <Button 
            icon={<HistoryOutlined />}
            size="small"
            onClick={() => message.info('Historique des appels - En développement')}
          >
            Historique
          </Button>
        </Tooltip>
      </Space>

      {/* Modal d'envoi de SMS */}
      <Modal
        title={`Envoyer un SMS à ${leadName}`}
        open={smsModalVisible}
        onCancel={() => {
          setSmsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSendSMS}
          initialValues={{ phoneNumber: leadPhone }}
        >
          <Form.Item
            name="phoneNumber"
            label="Numéro de téléphone"
          >
            <Input disabled value={leadPhone} />
          </Form.Item>

          <Form.Item
            name="message"
            label="Message"
            rules={[
              { required: true, message: 'Veuillez saisir un message' },
              { max: 160, message: 'Maximum 160 caractères' }
            ]}
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Bonjour, je vous contacte concernant..."
              showCount
              maxLength={160}
            />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => setSmsModalVisible(false)}>
                Annuler
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={sendingSMS}
                icon={<MessageOutlined />}
              >
                Envoyer SMS
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default GoogleVoiceWidget;
