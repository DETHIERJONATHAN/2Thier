import React, { useState, useEffect } from 'react';
import { Modal, Steps, Alert, Typography, Card, Space, Button, Divider, Tag, Spin } from 'antd';
import { CopyOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { EmailAccountCreationService, EmailCreationInstructions } from '../../services/EmailAccountCreationService';

const { Title, Text } = Typography;

interface EmailSetupWizardProps {
  visible: boolean;
  onClose: () => void;
  firstName: string;
  lastName: string;
  domain?: string;
  onEmailConfigured?: (emailAddress: string, password: string) => void;
}

export const EmailSetupWizard: React.FC<EmailSetupWizardProps> = ({
  visible,
  onClose,
  firstName,
  lastName,
  domain = '2thier.be',
  onEmailConfigured
}) => {
  const [instructions, setInstructions] = useState<EmailCreationInstructions | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    if (visible && firstName && lastName) {
      const emailInstructions = EmailAccountCreationService.generateCreationInstructions(
        firstName,
        lastName,
        domain
      );
      setInstructions(emailInstructions);
      setCurrentStep(0);
      setCompletedSteps([]);
    }
  }, [visible, firstName, lastName, domain]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Vous pouvez ajouter une notification toast ici
  };

  const markStepComplete = (stepIndex: number) => {
    if (!completedSteps.includes(stepIndex)) {
      setCompletedSteps([...completedSteps, stepIndex]);
    }
  };

  const handleFinish = () => {
    if (instructions && onEmailConfigured) {
      onEmailConfigured(instructions.emailAddress, instructions.suggestedPassword);
    }
    onClose();
  };

  if (!instructions) {
    return (
      <Modal
        title="Configuration Email"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={600}
      >
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>Génération des instructions...</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>
            🚀 Assistant de Configuration Email
          </Title>
          <Text type="secondary">
            Création du compte : {instructions.emailAddress}
          </Text>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Tag color={instructions.provider === 'yandex' ? 'red' : instructions.provider === 'google' ? 'blue' : 'green'}>
              {instructions.provider.toUpperCase()}
            </Tag>
            <Text type="secondary">
              Coût estimé : {EmailAccountCreationService.getMonthlyCost(instructions.provider)}
            </Text>
          </div>
          <Space>
            <Button onClick={onClose}>Annuler</Button>
            <Button 
              type="primary" 
              onClick={handleFinish}
              disabled={completedSteps.length < instructions.setupSteps.length}
            >
              ✅ Email Configuré
            </Button>
          </Space>
        </div>
      }
      width={800}
      style={{ top: 20 }}
    >
      <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
        {/* Alert d'information */}
        <Alert
          message="Information Importante"
          description={
            <div>
              <p>
                <strong>Création automatique non disponible :</strong> Les providers email (Yandex, Google, Zoho) 
                ne permettent pas la création automatique gratuite de comptes via API.
              </p>
              <p>
                <strong>Solution :</strong> Suivez ces étapes pour créer manuellement le compte, 
                puis configurez-le dans le CRM.
              </p>
            </div>
          }
          type="info"
          style={{ marginBottom: 20 }}
        />

        {/* Informations du compte */}
        <Card title="📧 Informations du Compte" style={{ marginBottom: 20 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>Adresse Email :</Text>
              <div>
                <Text code style={{ marginRight: 8 }}>{instructions.emailAddress}</Text>
                <Button 
                  icon={<CopyOutlined />} 
                  size="small" 
                  onClick={() => copyToClipboard(instructions.emailAddress)}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>Mot de passe suggéré :</Text>
              <div>
                <Text code style={{ marginRight: 8 }}>{instructions.suggestedPassword}</Text>
                <Button 
                  icon={<CopyOutlined />} 
                  size="small" 
                  onClick={() => copyToClipboard(instructions.suggestedPassword)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>Provider :</Text>
              <Tag color={instructions.provider === 'yandex' ? 'red' : instructions.provider === 'google' ? 'blue' : 'green'}>
                {instructions.provider.toUpperCase()}
              </Tag>
            </div>
          </Space>
        </Card>

        {/* Configuration serveur */}
        <Card title="⚙️ Configuration Serveur" style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <Text strong>SMTP :</Text>
              <div>
                <Text code>{instructions.configurationData.smtpServer}:{instructions.configurationData.smtpPort}</Text>
                <Button 
                  icon={<CopyOutlined />} 
                  size="small" 
                  style={{ marginLeft: 8 }}
                  onClick={() => copyToClipboard(`${instructions.configurationData.smtpServer}:${instructions.configurationData.smtpPort}`)}
                />
              </div>
            </div>
            
            <div>
              <Text strong>IMAP :</Text>
              <div>
                <Text code>{instructions.configurationData.imapServer}:{instructions.configurationData.imapPort}</Text>
                <Button 
                  icon={<CopyOutlined />} 
                  size="small" 
                  style={{ marginLeft: 8 }}
                  onClick={() => copyToClipboard(`${instructions.configurationData.imapServer}:${instructions.configurationData.imapPort}`)}
                />
              </div>
            </div>
          </div>
          
          <Divider />
          
          <div>
            <Text strong>Sécurité : </Text>
            <Tag color="green">{instructions.configurationData.security}</Tag>
          </div>
        </Card>

        {/* Étapes de configuration */}
        <Card title="📋 Étapes de Configuration">
          <Steps
            direction="vertical"
            current={currentStep}
            style={{ marginTop: 16 }}
          >
            {instructions.setupSteps.map((step, index) => (
              <Steps.Step
                key={`item-${index}`}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{step}</span>
                    {!completedSteps.includes(index) && (
                      <Button 
                        size="small" 
                        type="dashed"
                        icon={<CheckCircleOutlined />}
                        onClick={() => markStepComplete(index)}
                      >
                        Terminé
                      </Button>
                    )}
                    {completedSteps.includes(index) && (
                      <Tag color="green" icon={<CheckCircleOutlined />}>
                        ✅ Fait
                      </Tag>
                    )}
                  </div>
                }
                status={
                  completedSteps.includes(index) 
                    ? 'finish' 
                    : index === currentStep 
                    ? 'process' 
                    : 'wait'
                }
              />
            ))}
          </Steps>
        </Card>

        {/* Note importante */}
        <Alert
          message="⚠️ Important"
          description={
            <div>
              <p>
                Une fois le compte créé chez le provider, revenez dans le CRM et utilisez 
                le bouton "✅ Email Configuré" pour enregistrer les informations.
              </p>
              <p>
                <strong>Test de connexion :</strong> Le système testera automatiquement 
                la connexion avec les identifiants fournis.
              </p>
            </div>
          }
          type="warning"
          style={{ marginTop: 20 }}
        />
      </div>
    </Modal>
  );
};

export default EmailSetupWizard;
