/**
 * 🚀 COMPOSANT DE COMPOSITION D'EMAIL RÉVOLUTIONNAIRE
 * 
 * Fonctionnalités :
 * - Auto-sauvegarde automatique pendant la frappe
 * - Sauvegarde à la fermeture
 * - Récupération des brouillons
 * - Interface moderne avec Ant Design
 * - 🎨 DESIGN SPECTACULAIRE avec RevolutionaryHtmlEditor
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, Button, message, Space, Tooltip, Typography, Upload, Collapse } from 'antd';
import { SaveOutlined, SendOutlined, LoadingOutlined, CloseOutlined, UploadOutlined } from '@ant-design/icons';
import { useDrafts, CreateDraftData, DraftData } from '../hooks/useDrafts';
import RevolutionaryHtmlEditor from './RevolutionaryHtmlEditor';

const { Text } = Typography;

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

  const { createDraft, updateDraft, deleteDraft } = useDrafts();

  // 🎯 Auto-sauvegarde intelligente
  const performAutoSave = useCallback(async () => {
    if (!hasUnsavedChanges || !visible) return;

    try {
      setAutoSaving(true);
      console.log('[EmailComposer] 🔄 Déclenchement auto-sauvegarde...');
      
      const values = form.getFieldsValue();
      
      const draftData: CreateDraftData = {
        to: values.to || '',
        cc: values.cc || '',
        bcc: values.bcc || '',
        subject: values.subject || '',
        body: values.body || '',
        attachments: attachmentFiles.map(f => f.name)
      };

      if (currentDraftId) {
        await updateDraft(currentDraftId, draftData);
      } else {
        const newDraft = await createDraft(draftData);
        setCurrentDraftId(newDraft.id);
      }
      
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('[EmailComposer] Erreur auto-sauvegarde:', error);
    } finally {
      setAutoSaving(false);
    }
  }, [hasUnsavedChanges, visible, form, attachmentFiles, currentDraftId, createDraft, updateDraft]);

  // 📤 Envoi d'email
  const handleSend = async () => {
    try {
      setSending(true);
      console.log('[EmailComposer] 📤 Envoi direct avec', attachmentFiles.length, 'pièces jointes');
      
      const values = await form.validateFields();
      
      // TODO: Appel API d'envoi d'email ici
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulation
      
      message.success('🎉 Email envoyé avec succès !');
      
      // Nettoyer le brouillon après envoi
      if (currentDraftId) {
        await deleteDraft(currentDraftId);
      }
      
      onSent?.();
      onClose();
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
          <span style={{ fontSize: '18px', fontWeight: '700' }}>
            {editingDraft ? '📝 Modifier le brouillon' : '✨ Nouveau message'}
          </span>
          {autoSaving && (
            <Tooltip title="Auto-sauvegarde en cours...">
              <LoadingOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
            </Tooltip>
          )}
          {hasUnsavedChanges && !autoSaving && (
            <Tooltip title="Modifications non sauvegardées">
              <SaveOutlined style={{ color: '#faad14', fontSize: '16px' }} />
            </Tooltip>
          )}
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width={900}
      className="revolutionary-email-modal"
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
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          borderTop: '1px solid #e2e8f0'
        }}>
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
            💾 Auto-sauvegarde activée
          </div>
          <Space size="large">
            <Button 
              icon={<CloseOutlined />} 
              onClick={handleClose}
              size="large"
              style={{
                borderRadius: '12px',
                fontWeight: '600'
              }}
            >
              Fermer
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={sending}
              onClick={handleSend}
              size="large"
              style={{
                borderRadius: '12px',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
              }}
            >
              {sending ? 'Envoi...' : 'Envoyer'}
            </Button>
          </Space>
        </div>
      }
      destroyOnClose={false}
    >
      <div style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid rgba(148, 163, 184, 0.1)'
      }}>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleFormChange}
          size="large"
        >
          {/* 📧 Champs d'en-tête stylés */}
          <div style={{
            display: 'grid',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <Form.Item
              label={<span style={{ fontWeight: '600', color: '#1e293b' }}>📧 Destinataire</span>}
              name="to"
              rules={[{ required: true, message: 'Destinataire requis' }]}
            >
              <Input 
                placeholder="destinataire@exemple.com" 
                style={{
                  borderRadius: '12px',
                  border: '2px solid #e2e8f0',
                  fontSize: '16px',
                  padding: '12px 16px'
                }}
              />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Form.Item
                label={<span style={{ fontWeight: '600', color: '#1e293b' }}>📄 Copie (Cc)</span>}
                name="cc"
              >
                <Input 
                  placeholder="copie@exemple.com (optionnel)" 
                  style={{
                    borderRadius: '12px',
                    border: '2px solid #e2e8f0',
                    fontSize: '16px',
                    padding: '12px 16px'
                  }}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: '600', color: '#1e293b' }}>🔒 Copie cachée (Cci)</span>}
                name="bcc"
              >
                <Input 
                  placeholder="copie.cachee@exemple.com (optionnel)" 
                  style={{
                    borderRadius: '12px',
                    border: '2px solid #e2e8f0',
                    fontSize: '16px',
                    padding: '12px 16px'
                  }}
                />
              </Form.Item>
            </div>

            <Form.Item
              label={<span style={{ fontWeight: '600', color: '#1e293b' }}>🏷️ Sujet</span>}
              name="subject"
              rules={[{ required: true, message: 'Sujet requis' }]}
            >
              <Input 
                placeholder="Sujet de votre message" 
                style={{
                  borderRadius: '12px',
                  border: '2px solid #e2e8f0',
                  fontSize: '16px',
                  padding: '12px 16px',
                  fontWeight: '500'
                }}
              />
            </Form.Item>
          </div>

          {/* 🎨 ZONE DE MESSAGE RÉVOLUTIONNAIRE */}
          <Form.Item
            label={<span style={{ fontWeight: '700', color: '#1e293b', fontSize: '16px' }}>✍️ Message</span>}
            name="body"
            style={{ marginBottom: '32px' }}
          >
            <RevolutionaryHtmlEditor
              placeholder="Tapez votre message révolutionnaire ici... ✨"
            />
          </Form.Item>

          {/* 📎 Section pièces jointes stylée */}
          <Collapse 
            ghost 
            style={{
              background: 'rgba(59, 130, 246, 0.05)',
              borderRadius: '16px',
              border: '1px solid rgba(59, 130, 246, 0.1)'
            }}
            items={[
              {
                key: 'attachments',
                label: (
                  <span style={{ fontWeight: '600', color: '#3b82f6', fontSize: '15px' }}>
                    📎 Pièces jointes {attachmentFiles.length > 0 ? `(${attachmentFiles.length})` : ''}
                  </span>
                ),
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
                      style={{
                        width: '100%'
                      }}
                    >
                      <Button 
                        icon={<UploadOutlined />}
                        size="large"
                        style={{
                          borderRadius: '12px',
                          border: '2px dashed #3b82f6',
                          color: '#3b82f6',
                          fontWeight: '600',
                          height: 'auto',
                          padding: '16px 24px'
                        }}
                      >
                        Joindre des fichiers
                      </Button>
                    </Upload>
                  </Form.Item>
                )
              }
            ]} 
          />
        </Form>
      </div>
    </Modal>
  );
};
