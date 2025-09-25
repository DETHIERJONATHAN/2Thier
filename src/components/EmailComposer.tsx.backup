/**
 * COMPOSANT DE COMPOSITION D'EMAIL AVEC AUTO-SAUVEGARDE
 * 
 * Fonctionnalités :
 * - Auto-sauvegarde automat          <div style={{ 
            fontSize: '13px', 
            color: '#8c8c8c', 
            marginBottom: '16px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingBottom: '12px',
            borderBottom: '1px solid #f0f0f0'
          }}>
            � Message original
          </div>la frappe
 * - Sauvegarde à la fermeture
 * - Récupération des brouillons
 * - Interface moderne avec Ant Design
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, Button, message, Space, Tooltip, Typography, Upload, Collapse } from 'antd';
import { SaveOutlined, SendOutlined, LoadingOutlined, CloseOutlined, UploadOutlined } from '@ant-design/icons';
import { useDrafts, CreateDraftData, DraftData } from '../hooks/useDrafts';
import RevolutionaryHtmlEditor from './RevolutionaryHtmlEditor';

const { TextArea } = Input;
const { Text } = Typography;

// Composant d'édition avec zone libre + aperçu HTML PARFAIT - MESSAGE ORIGINAL PERMANENT
const HtmlEditor: React.FC<{
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}> = ({ value = '', onChange, placeholder }) => {
  const [userInput, setUserInput] = useState('');
  const [originalMessage, setOriginalMessage] = useState('');
  const [isOriginalMessageLocked, setIsOriginalMessageLocked] = useState(false);
  
  // CRUCIAL: Initialisation UNIQUE qui préserve le message original DÉFINITIVEMENT
  useEffect(() => {
    // Si le message original est déjà verrouillé, NE PLUS LE TOUCHER
    if (isOriginalMessageLocked) {
      console.log('[HtmlEditor] Message original verrouillé - pas de réinitialisation');
      return;
    }
    
    if (!value || value.trim() === '') {
      // Nouveau message vide
      setUserInput('');
      setOriginalMessage('');
      return;
    }
    
    console.log('[HtmlEditor] Initialisation avec value:', value?.substring(0, 100));
    
    // Détection HTML STRICTE - Si c'est un email complet, c'est du HTML
    const isComplexHtml = value.includes('DOCTYPE') || 
                         value.includes('<html') || 
                         value.includes('<body') ||
                         value.includes('<table') ||
                         value.length > 1000;
    
    if (isComplexHtml) {
      // Email reçu = TOUT dans message original, input vide pour réponse
      setOriginalMessage(value);
      setUserInput('');
      setIsOriginalMessageLocked(true); // VERROUILLER le message original POUR TOUJOURS
      console.log('[HtmlEditor] Email HTML détecté - message original VERROUILLÉ DÉFINITIVEMENT');
    } else {
      // Texte simple = input utilisateur uniquement
      setUserInput(value);
      console.log('[HtmlEditor] Texte simple - input utilisateur rempli');
    }
  }, [value, isOriginalMessageLocked]); // Seulement si pas verrouillé

  const handleUserInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newUserText = e.target.value;
    
    // PROTECTION ABSOLUE: Seulement l'input utilisateur change
    setUserInput(newUserText);
    
    // IMPORTANT: onChange ne renvoie QUE le texte de l'utilisateur
    // Le message original reste COMPLÈTEMENT séparé
    onChange?.(newUserText);
  };

  return (
    <div style={{ 
      backgroundColor: 'white',
      borderRadius: '16px',
      overflow: 'hidden',
      border: '1px solid #e8f4f8',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
      background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
      position: 'relative'
    }}>
      {/* 🎨 ZONE D'ÉCRITURE ULTRA-MODERNE ET SEXY */}
      <div style={{ 
        padding: '24px',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* 🌟 Effet de brillance subtile */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.5) 50%, transparent 100%)'
        }} />
        
        <div style={{ 
          fontSize: '16px', 
          color: '#1e293b', 
          marginBottom: '16px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}>
          <span style={{
            display: 'inline-block',
            padding: '8px 12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: '12px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
            animation: 'pulse 2s infinite'
          }}>
            ✍️
          </span>
          <span style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Composez votre message
          </span>
        </div>
        <TextArea
          value={userInput}
          onChange={handleUserInputChange}
          placeholder={placeholder || "Tapez votre message... ✨"}
          rows={8}
          style={{ 
            border: '2px solid transparent',
            borderRadius: '16px',
            padding: '20px',
            fontSize: '16px',
            lineHeight: '1.7',
            resize: 'vertical',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: '#1e293b',
            minHeight: '200px'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.boxShadow = '0 8px 32px rgba(59, 130, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 0 0 4px rgba(59, 130, 246, 0.1)';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'transparent';
            e.target.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5)';
            e.target.style.transform = 'translateY(0)';
            e.target.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)';
          }}
          showCount={{
            style: {
              color: '#64748b',
              fontSize: '12px',
              fontWeight: '500'
            }
          }}
        />
      </div>

      {/* Message original (RENDU HTML PARFAIT - Ne disparaît JAMAIS) */}
      {originalMessage && (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fafbfc',
          maxHeight: '600px',
          overflow: 'auto',
          borderTop: '1px solid #f0f0f0',
          margin: '20px 0 0 0'
        }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            marginBottom: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid #ddd',
            paddingBottom: '8px'
          }}>
            � MESSAGE ORIGINAL (affiché en HTML complet)
          </div>
          
          {/* RENDU HTML COMPLET ET PROPRE */}
          <div 
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              fontFamily: 'Arial, Helvetica, sans-serif, "Segoe UI", Roboto',
              lineHeight: '1.8',
              color: '#212529',
              fontSize: '15px'
            }}
            dangerouslySetInnerHTML={{ 
              __html: originalMessage
                // Nettoyage HTML MINIMAL et intelligent pour garder la beauté
                .replace(/<!DOCTYPE[^>]*>/gi, '')
                .replace(/<html[^>]*>/gi, '')
                .replace(/<\/html>/gi, '')
                .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
                .replace(/<\/body>/gi, '')
                .replace(/<body[^>]*>/gi, '')
                // Supprimer les scripts dangereux mais garder les styles
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<link[^>]*>/gi, '')
                // Améliorer les styles pour une meilleure lisibilité
                .replace(/color:\s*#000000?/gi, 'color: #212529')
                .replace(/color:\s*black/gi, 'color: #212529')
                .replace(/font-size:\s*[0-9]+px/gi, 'font-size: 15px')
                // Nettoyer les retours à la ligne excessifs
                .replace(/\r\n/g, '')
                .replace(/\n\s*\n/g, '\n')
                .trim()
            }}
          />
          
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            backgroundColor: '#f6f8fa',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#8c8c8c',
            textAlign: 'center',
            border: '1px solid #f0f0f0'
          }}>
            Ce message reste affiché pour référence
          </div>
        </div>
      )}
    </div>
  );
};

interface EmailComposerProps {
  visible: boolean;
  onClose: () => void;
  onSent?: () => void;
  // Pour éditer un brouillon existant
  editingDraft?: DraftData | null;
  // Pour pré-remplir le compositeur (réponse, transfert)
  prefilledData?: {
    to?: string;
    cc?: string;
    bcc?: string;
    subject?: string;
    body?: string;
  };
}

export const EmailComposer: React.FC<EmailComposerProps> = ({
  visible,
  onClose,
  onSent,
  editingDraft,
  prefilledData
}) => {
  const [form] = Form.useForm();
  const { autoSaveDraft, saveDraftImmediately, sendEmail, autoSaving } = useDrafts();
  
  const [sending, setSending] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(editingDraft?.draftId);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  /**
   * Auto-sauvegarde déclenchée par les changements de formulaire
   */
  const handleFormChange = useCallback(() => {
    setHasUnsavedChanges(true);
    
    const formData = form.getFieldsValue();
    const { to, subject, body, cc, bcc } = formData;

    // Auto-sauvegarde seulement si on a au minimum un destinataire et un sujet
    if (to && subject) {
      const draftData: CreateDraftData = {
        to: to.trim(),
        subject: subject.trim(),
        body: body || '',
        cc: cc?.trim(),
        bcc: bcc?.trim(),
        draftId: currentDraftId, // Pour mise à jour
        isHtml: false,
        attachments: attachmentFiles.length > 0 ? attachmentFiles : undefined
      };

      console.log('[EmailComposer] 🔄 Déclenchement auto-sauvegarde...');
      autoSaveDraft(draftData);
    }
  }, [form, autoSaveDraft, currentDraftId, attachmentFiles]);

  /**
   * Envoie l'email directement (avec pièces jointes)
   */
  const handleSend = async () => {
    try {
      setSending(true);
      
      const formData = form.getFieldsValue();
      const { to, subject, body, cc, bcc } = formData;

      // Validation
      if (!to || !subject) {
        message.error('Destinataire et sujet requis');
        return;
      }

      // Préparer les données d'envoi
      const emailData: CreateDraftData = {
        to: to.trim(),
        subject: subject.trim(),
        body: body || '',
        cc: cc?.trim(),
        bcc: bcc?.trim(),
        isHtml: false,
        attachments: attachmentFiles.length > 0 ? attachmentFiles : undefined
      };

      console.log('[EmailComposer] 📤 Envoi direct avec', attachmentFiles.length, 'pièces jointes');

      // Envoi direct (bypass du système de brouillons pour éviter les problèmes)
      const success = await sendEmail(emailData);
      if (success) {
        setHasUnsavedChanges(false);
        form.resetFields();
        setAttachmentFiles([]); // Réinitialiser les pièces jointes
        setCurrentDraftId(undefined);
        onSent?.();
        onClose();
      }
    } catch (error) {
      console.error('[EmailComposer] Erreur envoi:', error);
      message.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  /**
   * Fermeture avec sauvegarde automatique
   */
  const handleClose = async () => {
    const formData = form.getFieldsValue();
    const { to, subject, body, cc, bcc } = formData;

    // Sauvegarder si il y a du contenu et des changements non sauvés
    if ((to || subject || body) && hasUnsavedChanges) {
      console.log('[EmailComposer] 🚨 Sauvegarde avant fermeture...');
      
      const draftData: CreateDraftData = {
        to: to?.trim() || '',
        subject: subject?.trim() || 'Brouillon sans sujet',
        body: body || '',
        cc: cc?.trim(),
        bcc: bcc?.trim(),
        draftId: currentDraftId,
        isHtml: false
      };

      await saveDraftImmediately(draftData);
      message.info('Brouillon sauvegardé automatiquement');
    }

    setHasUnsavedChanges(false);
    form.resetFields();
    setCurrentDraftId(undefined);
    setAttachmentFiles([]); // Réinitialiser les pièces jointes
    onClose();
  };

  /**
   * Initialise le formulaire avec un brouillon existant ou des données pré-remplies
   */
  useEffect(() => {
    if (editingDraft && visible) {
      console.log('[EmailComposer] 📝 Chargement du brouillon:', editingDraft);
      form.setFieldsValue({
        to: editingDraft.to,
        subject: editingDraft.subject,
        body: editingDraft.body,
        cc: editingDraft.cc,
        bcc: editingDraft.bcc
      });
      setCurrentDraftId(editingDraft.draftId);
      setHasUnsavedChanges(false);
    } else if (prefilledData && visible) {
      // Données pré-remplies (réponse, transfert)
      console.log('[EmailComposer] 📧 Chargement données pré-remplies:', prefilledData);
      form.setFieldsValue({
        to: prefilledData.to || '',
        subject: prefilledData.subject || '',
        body: prefilledData.body || '',
        cc: prefilledData.cc || '',
        bcc: prefilledData.bcc || ''
      });
      setCurrentDraftId(undefined);
      setHasUnsavedChanges(false);
    } else if (!editingDraft && !prefilledData && visible) {
      // Nouveau message vide
      form.resetFields();
      setCurrentDraftId(undefined);
      setHasUnsavedChanges(false);
    }
  }, [editingDraft, prefilledData, visible, form]);

  return (
    <Modal
      title={
        <Space>
          <span>{editingDraft ? 'Modifier le brouillon' : 'Nouveau message'}</span>
          {autoSaving && (
            <Tooltip title="Auto-sauvegarde en cours...">
              <LoadingOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          )}
          {hasUnsavedChanges && !autoSaving && (
            <Tooltip title="Modifications non sauvegardées">
              <SaveOutlined style={{ color: '#faad14' }} />
            </Tooltip>
          )}
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width={800}
      footer={
        <Space>
          <Button 
            icon={<CloseOutlined />} 
            onClick={handleClose}
          >
            Fermer
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={sending}
            onClick={handleSend}
          >
            Envoyer
          </Button>
        </Space>
      }
      destroyOnClose={false} // Garder le contenu pour éviter les pertes
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleFormChange}
      >
        <Form.Item
          label="À"
          name="to"
          rules={[{ required: true, message: 'Destinataire requis' }]}
        >
          <Input placeholder="destinataire@exemple.com" />
        </Form.Item>

        <Form.Item
          label="Cc"
          name="cc"
        >
          <Input placeholder="copie@exemple.com (optionnel)" />
        </Form.Item>

        <Form.Item
          label="Cci"
          name="bcc"
        >
          <Input placeholder="copie.cachee@exemple.com (optionnel)" />
        </Form.Item>

        <Form.Item
          label="Sujet"
          name="subject"
          rules={[{ required: true, message: 'Sujet requis' }]}
        >
          <Input placeholder="Sujet de votre message" />
        </Form.Item>

        <Form.Item
          label="Message"
          name="body"
        >
          <RevolutionaryHtmlEditor
            placeholder="Tapez votre message ici..."
          />
        </Form.Item>

        {/* Section pièces jointes */}
        <Collapse 
          ghost 
          items={[
            {
              key: 'attachments',
              label: `Pièces jointes ${attachmentFiles.length > 0 ? `(${attachmentFiles.length})` : ''}`,
              children: (
                <Form.Item
                  label="Joindre des fichiers"
                >
                  <Upload
                    multiple
                    beforeUpload={() => false}
                    fileList={attachmentFiles.map((file, index) => ({
                      uid: `${index}`,
                      name: file.name,
                      status: 'done' as const,
                      originFileObj: file
                    }))}
                    onChange={({ fileList }) => {
                      const files = fileList
                        .map(f => f.originFileObj)
                        .filter((f): f is File => f instanceof File);
                      setAttachmentFiles(files);
                      handleFormChange(); // Déclencher l'auto-sauvegarde
                    }}
                  >
                    <Button icon={<UploadOutlined />}>Joindre des fichiers</Button>
                  </Upload>
                </Form.Item>
              )
            }
          ]} 
        />
      </Form>

      <div style={{ marginTop: '16px', fontSize: '12px', color: '#8c8c8c' }}>
        <Text type="secondary">
          💾 Auto-sauvegarde activée - Vos modifications sont automatiquement sauvegardées
        </Text>
      </div>
    </Modal>
  );
};
