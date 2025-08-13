/**
 * 🚀 COMPOSANT DE COMPOSITION D'EMAIL
 * 
 * Fonctionnalités :
 * - Auto-sauvegarde automatique pendant la frappe
 * - Sauvegarde à la fermeture
 * - Récupération des brouillons
 * - Interface sobre avec Ant Design
 * - SimpleHtmlEditor pour la composition
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, Button, message, Space, Tooltip, Upload, Collapse } from 'antd';
import { SaveOutlined, SendOutlined, LoadingOutlined, CloseOutlined, UploadOutlined } from '@ant-design/icons';
import { useDrafts, CreateDraftData, DraftData } from '../hooks/useDrafts';
import SimpleHtmlEditor from './SimpleHtmlEditor';

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
  const [sending, setSending] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>();
  const [autoSaving, setAutoSaving] = useState(false);

  const { saveDraft, deleteDraft, sendEmail } = useDrafts();

  // 🎯 Auto-sauvegarde intelligente
  const performAutoSave = useCallback(async () => {
    if (!hasUnsavedChanges || !visible) return;

    try {
      setAutoSaving(true);
      console.log('[EmailComposer] 🔄 Déclenchement auto-sauvegarde...');
      
      const values = form.getFieldsValue();
      
      // 🔥 SIMPLE : utiliser le contenu tel quel pour la sauvegarde
      let fullBody = values.body || '';
      let isHtmlContent = false;
      
      // Si c'est une réponse ou un transfert, ajouter l'ancien message TEL QUEL
      if (prefilledData?.body) {
        // Détecter le format de l'ancien message ET du nouveau
        const originalIsHtml = /<[^>]+>/.test(prefilledData.body);
        const newMessageIsHtml = /<[^>]+>/.test(fullBody);
        
        // 🎯 NOUVEAU : Nettoyer le HTML simple pour le rendre lisible
        let cleanOriginalMessage = prefilledData.body;
        if (originalIsHtml) {
          // Convertir HTML simple en texte propre
          cleanOriginalMessage = prefilledData.body
            .replace(/<div[^>]*>/gi, '\n')
            .replace(/<\/div>/gi, '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<span[^>]*>/gi, '')
            .replace(/<\/span>/gi, '')
            .replace(/<font[^>]*>/gi, '')
            .replace(/<\/font>/gi, '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/<[^>]*>/g, '') // Supprimer toutes les autres balises
            .replace(/\n\s*\n/g, '\n') // Supprimer les lignes vides multiples
            .trim();
        }
        
        if (!originalIsHtml && !newMessageIsHtml) {
          // Les deux sont TEXTE : garder TEXTE
          isHtmlContent = false;
          fullBody = fullBody + '\n\n--- Message original ---\n' + cleanOriginalMessage;
        } else if (newMessageIsHtml) {
          // Nouveau message en HTML : convertir tout en HTML propre
          isHtmlContent = true;
          const cleanOriginalAsHtml = cleanOriginalMessage.replace(/\n/g, '<br>');
          fullBody = fullBody + '<br><br>--- Message original ---<br>' + cleanOriginalAsHtml;
        } else {
          // Nouveau message en TEXTE : tout en texte
          isHtmlContent = false;
          fullBody = fullBody + '\n\n--- Message original ---\n' + cleanOriginalMessage;
        }
      } else {
        isHtmlContent = /<[^>]+>/.test(fullBody);
      }
      
      const draftData: CreateDraftData = {
        to: values.to || '',
        cc: values.cc || '',
        bcc: values.bcc || '',
        subject: values.subject || '',
        body: fullBody, // 🎯 Corps exact sans modification
        attachments: attachmentFiles,
        draftId: currentDraftId,
        isHtml: isHtmlContent
      };

      const result = await saveDraft(draftData);
      
      if (result) {
        if (!currentDraftId) {
          setCurrentDraftId(result.draftId);
        }
        setHasUnsavedChanges(false);
      }
      
    } catch (error) {
      console.error('[EmailComposer] Erreur auto-sauvegarde:', error);
    } finally {
      setAutoSaving(false);
    }
  }, [hasUnsavedChanges, visible, form, attachmentFiles, currentDraftId, saveDraft, prefilledData]);

  // 📤 Envoi d'email
  const handleSend = async () => {
    try {
      setSending(true);
      console.log('[EmailComposer] 📤 Envoi direct avec', attachmentFiles.length, 'pièces jointes');
      
      const values = await form.validateFields();
      
      // 🔥 SIMPLE : utiliser le contenu tel quel
      let fullBody = values.body || '';
      let isHtmlContent = false;
      
      // Si c'est une réponse ou un transfert, ajouter l'ancien message TEL QUEL
      if (prefilledData?.body) {
        console.log('[EmailComposer] 📧 Ajout de l\'ancien message TEL QUEL');
        
        // Détecter le format de l'ancien message ET du nouveau
        const originalIsHtml = /<[^>]+>/.test(prefilledData.body);
        const newMessageIsHtml = /<[^>]+>/.test(fullBody);
        
        console.log('[EmailComposer] 🔍 Message original HTML?', originalIsHtml);
        console.log('[EmailComposer] 🔍 Nouveau message HTML?', newMessageIsHtml);
        
        // 🎯 NOUVEAU : Nettoyer le HTML simple pour le rendre lisible
        let cleanOriginalMessage = prefilledData.body;
        if (originalIsHtml) {
          // Convertir HTML simple en texte propre
          cleanOriginalMessage = prefilledData.body
            .replace(/<div[^>]*>/gi, '\n')
            .replace(/<\/div>/gi, '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<span[^>]*>/gi, '')
            .replace(/<\/span>/gi, '')
            .replace(/<font[^>]*>/gi, '')
            .replace(/<\/font>/gi, '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/<[^>]*>/g, '') // Supprimer toutes les autres balises
            .replace(/\n\s*\n/g, '\n') // Supprimer les lignes vides multiples
            .trim();
        }
        
        if (!originalIsHtml && !newMessageIsHtml) {
          // Les deux sont TEXTE : garder TEXTE
          isHtmlContent = false;
          fullBody = fullBody + '\n\n--- Message original ---\n' + cleanOriginalMessage;
        } else if (newMessageIsHtml) {
          // Nouveau message en HTML : convertir tout en HTML propre
          isHtmlContent = true;
          const cleanOriginalAsHtml = cleanOriginalMessage.replace(/\n/g, '<br>');
          fullBody = fullBody + '<br><br>--- Message original ---<br>' + cleanOriginalAsHtml;
        } else {
          // Nouveau message en TEXTE : tout en texte
          isHtmlContent = false;
          fullBody = fullBody + '\n\n--- Message original ---\n' + cleanOriginalMessage;
        }
      } else {
        // Nouveau message : détecter s'il contient du HTML
        isHtmlContent = /<[^>]+>/.test(fullBody);
      }
      
      const emailData: CreateDraftData = {
        to: values.to || '',
        cc: values.cc || '',
        bcc: values.bcc || '',
        subject: values.subject || '',
        body: fullBody, // 🎯 Corps exact sans modification
        attachments: attachmentFiles,
        isHtml: isHtmlContent
      };
      
      console.log('[EmailComposer] 📄 Format détecté:', isHtmlContent ? 'HTML' : 'TEXTE');
      console.log('[EmailComposer] 📄 Corps final EXACT:', fullBody.substring(0, 200) + '...');
      
      const success = await sendEmail(emailData);
      
      if (success) {
        // Nettoyer le brouillon après envoi réussi
        if (currentDraftId) {
          await deleteDraft(currentDraftId);
        }
        
        onSent?.();
        onClose();
      }
    } catch (error) {
      console.error('[EmailComposer] Erreur envoi:', error);
      message.error('❌ Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  // 🔒 Fermeture avec sauvegarde
  const handleClose = async () => {
    if (hasUnsavedChanges) {
      console.log('[EmailComposer] 🚨 Sauvegarde avant fermeture...');
      await performAutoSave();
    }
    
    // Reset de l'état
    form.resetFields();
    setAttachmentFiles([]);
    setHasUnsavedChanges(false);
    setCurrentDraftId(undefined);
    
    onClose();
  };

  // 📝 Détection des changements pour auto-sauvegarde
  const handleFormChange = () => {
    setHasUnsavedChanges(true);
  };

  // 🔄 Auto-sauvegarde toutes les 10 secondes
  useEffect(() => {
    const interval = setInterval(performAutoSave, 10000);
    return () => clearInterval(interval);
  }, [performAutoSave]);

  // 🚀 Chargement initial des données
  useEffect(() => {
    if (editingDraft && visible) {
      // Brouillon existant
      console.log('[EmailComposer] 📝 Chargement du brouillon:', editingDraft);
      form.setFieldsValue({
        to: editingDraft.to,
        subject: editingDraft.subject,
        body: editingDraft.body,
        cc: editingDraft.cc || '',
        bcc: editingDraft.bcc || ''
      });
      setCurrentDraftId(editingDraft.id);
      setHasUnsavedChanges(false);
    } else if (prefilledData && visible) {
      // Données pré-remplies (réponse, transfert)
      console.log('[EmailComposer] 📧 Chargement données pré-remplies:', prefilledData);
      form.setFieldsValue({
        to: prefilledData.to || '',
        subject: prefilledData.subject || '',
        body: '', // ⚠️ VIDE ! Le message original s'affiche EN BAS, pas dans la zone d'écriture
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
          <span>
            {editingDraft ? 'Modifier le brouillon' : 'Nouveau message'}
          </span>
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
      width={900}
      style={{
        top: 20
      }}
      styles={{
        body: {
          maxHeight: '80vh',
          overflowY: 'auto',
          padding: '24px'
        }
      }}
      footer={
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderTop: '1px solid #f0f0f0'
        }}>
          <div style={{ color: '#666', fontSize: '13px' }}>
            💾 Auto-sauvegarde activée
          </div>
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
              {sending ? 'Envoi...' : 'Envoyer'}
            </Button>
          </Space>
        </div>
      }
      destroyOnHidden={false}
    >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleFormChange}
          size="large"
        >
          {/* 📧 Champs d'en-tête */}
          <div style={{
            display: 'grid',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <Form.Item
              label="Destinataire"
              name="to"
              rules={[{ required: true, message: 'Destinataire requis' }]}
            >
              <Input placeholder="destinataire@exemple.com" />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Form.Item
                label="Copie (Cc)"
                name="cc"
              >
                <Input placeholder="copie@exemple.com (optionnel)" />
              </Form.Item>

              <Form.Item
                label="Copie cachée (Cci)"
                name="bcc"
              >
                <Input placeholder="copie.cachee@exemple.com (optionnel)" />
              </Form.Item>
            </div>

            <Form.Item
              label="Sujet"
              name="subject"
              rules={[{ required: true, message: 'Sujet requis' }]}
            >
              <Input placeholder="Sujet de votre message" />
            </Form.Item>
          </div>

          {/* Zone de message */}
          <Form.Item
            label="Message"
            name="body"
            style={{ marginBottom: '24px' }}
          >
            <SimpleHtmlEditor
              placeholder="Tapez votre message ici..."
            />
          </Form.Item>

          {/* Message original (affiché EN BAS si c'est une réponse/transfert) */}
          {prefilledData?.body && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#fafafa',
              border: '1px solid #e8e8e8',
              borderRadius: '6px'
            }}>
              <div style={{
                marginBottom: '12px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#666',
                borderBottom: '1px solid #e8e8e8',
                paddingBottom: '8px'
              }}>
                Message original :
              </div>
              <div 
                style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}
                dangerouslySetInnerHTML={{ 
                  __html: prefilledData.body
                    // 🔒 NETTOYAGE SÉCURITAIRE MINIMAL SEULEMENT
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Scripts pour sécurité
                    .replace(/<link[^>]*rel=["']?stylesheet["']?[^>]*>/gi, '') // CSS externes
                    // ✨ TOUT LE RESTE RESTE PARFAIT TEL QUEL !
                }}
              />
            </div>
          )}

          {/* Section pièces jointes */}
          <Collapse 
            ghost 
            items={[
              {
                key: 'attachments',
                label: `Pièces jointes ${attachmentFiles.length > 0 ? `(${attachmentFiles.length})` : ''}`,
                children: (
                  <Form.Item>
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
                        handleFormChange();
                      }}
                    >
                      <Button icon={<UploadOutlined />}>
                        Joindre des fichiers
                      </Button>
                    </Upload>
                  </Form.Item>
                )
              }
            ]} 
          />
        </Form>
    </Modal>
  );
};
