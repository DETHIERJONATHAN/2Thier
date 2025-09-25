import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Tabs, 
  Button, 
  Tooltip, 
  Dropdown, 
  Space, 
  Tag, 
  Modal, 
  Input, 
  Select, 
  Card,
  Alert,
  message,
  Spin
} from 'antd';
import { 
  SaveOutlined, 
  SendOutlined, 
  ShareAltOutlined, 
  HistoryOutlined, 
  DownloadOutlined,
  MoreOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { 
  DevisLayout, 
  DevisSection, 
  DevisField, 
  useDevisLogic
} from '../components/devis';
import '../components/devis/devis.css';

const { TabPane } = Tabs;
const { Option } = Select;

const DevisPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const devisId = searchParams.get('id') || undefined;
  const leadId = searchParams.get('leadId') || undefined;
  const mode = (searchParams.get('mode') as 'create' | 'edit' | 'view' | 'template') || 'create';
  
  // États locaux pour l'interface
  const [showSendModal, setShowSendModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  
  // Hook principal avec toute la logique
  const {
    sections,
    formData,
    devisData,
    leadData,
    errors,
    warnings,
    fieldStates,
    loading,
    saving,
    hasUnsavedChanges,
    activeTabKey,
    handleFieldChange,
    validateField,
    saveFormData,
    resetForm,
    setActiveTabKey,
    getFieldError,
    getFieldWarning,
    getFieldState,
    setAutoSaveEnabled
  } = useDevisLogic({ devisId, leadId, mode });

  // Données calculées
  const totalAmount = useMemo(() => {
    // Logique de calcul du montant total basée sur les formules
    let total = 0;
    sections.forEach(section => {
      const fields = section.Field || section.fields || [];
      fields.forEach(field => {
        if (field.type === 'donnee' && field.advancedConfig?.autoCalculate) {
          const value = formData[field.id];
          if (typeof value === 'number') {
            total += value;
          }
        }
      });
    });
    return total;
  }, [sections, formData]);

  const errorCount = useMemo(() => {
    return Object.values(errors).filter(error => error !== null).length;
  }, [errors]);

  const warningCount = useMemo(() => {
    return Object.values(warnings).filter(warning => warning !== null).length;
  }, [warnings]);

  // Gestion des actions
  const handleSave = useCallback(async () => {
    try {
      await saveFormData();
      message.success('Devis sauvegardé avec succès');
    } catch (error) {
      message.error('Erreur lors de la sauvegarde');
    }
  }, [saveFormData]);

  const handleSend = useCallback(async () => {
    try {
      if (!sendEmail) {
        message.error('Veuillez saisir un email');
        return;
      }
      
      // Logique d'envoi par email
      // await api.post('/api/devis/send', { devisId, email: sendEmail, message: sendMessage });
      message.success('Devis envoyé avec succès');
      setShowSendModal(false);
      setSendEmail('');
      setSendMessage('');
    } catch (error) {
      message.error('Erreur lors de l\'envoi');
    }
  }, [sendEmail, sendMessage, devisId]);

  const handleExport = useCallback(() => {
    // Logique d'export PDF
    window.open(`/api/devis/${devisId}/export/pdf`, '_blank');
  }, [devisId]);

  // Actions du menu dropdown
  const menuItems = [
    {
      key: 'duplicate',
      label: 'Dupliquer',
      onClick: () => navigate(`/devis?mode=create&templateId=${devisId}`)
    },
    {
      key: 'template',
      label: 'Créer un template',
      onClick: () => setShowShareModal(true)
    },
    {
      key: 'history',
      label: 'Historique',
      onClick: () => setShowHistoryModal(true)
    },
    {
      key: 'archive',
      label: 'Archiver',
      onClick: () => Modal.confirm({
        title: 'Archiver ce devis ?',
        content: 'Le devis sera archivé et ne sera plus modifiable.',
        onOk: () => message.success('Devis archivé')
      })
    }
  ];

  // Interface de chargement
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
        <span className="ml-3">Chargement des données...</span>
      </div>
    );
  }

  return (
    <div className="devis-page">
      {/* En-tête du devis */}
      <div className="devis-header bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="devis-info">
            <h1 className="text-2xl font-bold text-gray-900">
              {devisData.title || 'Nouveau Devis'}
            </h1>
            <div className="flex items-center space-x-4 mt-2">
              <Tag color={devisData.status === 'draft' ? 'orange' : 'green'}>
                {devisData.status || 'Brouillon'}
              </Tag>
              {leadData && (
                <span className="text-sm text-gray-500">
                  Client: {leadData.firstName} {leadData.lastName}
                </span>
              )}
              <span className="text-sm text-gray-500">
                Montant: {totalAmount.toFixed(2)} €
              </span>
            </div>
          </div>

          <div className="devis-actions">
            <Space>
              {/* Indicateurs */}
              {errorCount > 0 && (
                <Tooltip title={`${errorCount} erreur(s)`}>
                  <ExclamationCircleOutlined className="text-red-500" />
                </Tooltip>
              )}
              {warningCount > 0 && (
                <Tooltip title={`${warningCount} avertissement(s)`}>
                  <InfoCircleOutlined className="text-yellow-500" />
                </Tooltip>
              )}
              {hasUnsavedChanges && (
                <Tag color="orange">Non sauvegardé</Tag>
              )}
              {saving && <Spin size="small" />}

              {/* Actions principales */}
              <Button 
                type="primary" 
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSave}
                disabled={mode === 'view'}
              >
                Sauvegarder
              </Button>
              
              <Button 
                icon={<SendOutlined />}
                onClick={() => setShowSendModal(true)}
                disabled={mode === 'view' || errorCount > 0}
              >
                Envoyer
              </Button>
              
              <Button 
                icon={<DownloadOutlined />}
                onClick={handleExport}
                disabled={!devisId}
              >
                Exporter
              </Button>
              
              <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                <Button icon={<MoreOutlined />} />
              </Dropdown>
            </Space>
          </div>
        </div>

        {/* Barre de statut */}
        {(errorCount > 0 || warningCount > 0) && (
          <Alert
            className="mt-3"
            type={errorCount > 0 ? 'error' : 'warning'}
            message={
              errorCount > 0 
                ? `${errorCount} erreur(s) à corriger` 
                : `${warningCount} avertissement(s)`
            }
            showIcon
            closable
          />
        )}
      </div>

      {/* Contenu principal avec onglets */}
      <DevisLayout saving={saving} errors={errors}>
        <Tabs 
          defaultActiveKey="0" 
          type="card" 
          className="devis-tabs"
          activeKey={activeTabKey}
          onChange={setActiveTabKey}
        >
          {Array.isArray(sections) && sections.map((section, index) => (
            <TabPane 
              tab={
                <span>
                  {section.name}
                  {/* Indicateur d'erreurs dans l'onglet */}
                  {section.Field?.some(field => getFieldError(field.id)) && (
                    <ExclamationCircleOutlined className="text-red-500 ml-2" />
                  )}
                </span>
              } 
              key={index.toString()}
            >
              <DevisSection 
                section={{
                  ...section,
                  label: section.name,
                  fields: section.Field || section.fields || []
                }} 
                formData={formData}
                onFieldChange={handleFieldChange}
              >
                {(section.Field || section.fields || []).map((field) => (
                  <DevisField
                    key={field.id}
                    field={field}
                    value={formData[field.id]}
                    onChange={(value) => handleFieldChange(field.id, value)}
                    error={getFieldError(field.id)}
                    warning={getFieldWarning(field.id)}
                    fieldState={getFieldState(field.id)}
                  />
                ))}
              </DevisSection>
            </TabPane>
          ))}
        </Tabs>
      </DevisLayout>

      {/* Modales */}
      
      {/* Modal d'envoi par email */}
      <Modal
        title="Envoyer le devis"
        open={showSendModal}
        onOk={handleSend}
        onCancel={() => setShowSendModal(false)}
        okText="Envoyer"
        cancelText="Annuler"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Adresse email du destinataire
            </label>
            <Input
              type="email"
              value={sendEmail}
              onChange={(e) => setSendEmail(e.target.value)}
              placeholder="client@exemple.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Message personnalisé (optionnel)
            </label>
            <Input.TextArea
              value={sendMessage}
              onChange={(e) => setSendMessage(e.target.value)}
              rows={4}
              placeholder="Message d'accompagnement..."
            />
          </div>
        </div>
      </Modal>

      {/* Modal de partage/template */}
      <Modal
        title="Créer un template"
        open={showShareModal}
        onCancel={() => setShowShareModal(false)}
        footer={null}
      >
        <div className="text-center py-4">
          <p>Fonctionnalité de création de template à venir...</p>
        </div>
      </Modal>

      {/* Modal d'historique */}
      <Modal
        title="Historique du devis"
        open={showHistoryModal}
        onCancel={() => setShowHistoryModal(false)}
        footer={null}
        width={700}
      >
        <div className="text-center py-4">
          <p>Historique des modifications à venir...</p>
        </div>
      </Modal>
    </div>
  );
};

export default DevisPage;
