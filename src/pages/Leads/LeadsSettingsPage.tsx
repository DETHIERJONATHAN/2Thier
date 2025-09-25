import React, { useState, useEffect, useCallback } from 'react';
import { 
  Tabs, 
  List, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Tag, 
  Card,
  Row,
  Col,
  InputNumber,
  Select,
  Switch,
  Typography,
  Space,
  Alert,
  notification,
  Tooltip,
  Popconfirm
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  SettingOutlined,
  ApiOutlined,
  UserOutlined,
  MailOutlined,
  LinkOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { NotificationManager } from '../../components/Notifications';
import { getErrorMessage, getErrorResponseDetails } from '../../utils/errorHandling';
import { LeadStatus } from '../../types/leads';
import SortableCallStatus from '../../components/SortableCallStatus';
import SortableLeadStatus from '../../components/SortableLeadStatus';

const { Title, Text } = Typography;
const { Option } = Select;

// 🎯 Interfaces TypeScript
interface CallStatus {
  id?: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  mappedToLeadStatus?: string;
}

interface Source {
  id?: string;
  name: string;
  description?: string;
  delayHours?: number;
  isActive: boolean;
}

interface EmailTemplate {
  id?: string;
  name: string;
  subject: string;
  content: string;
  type: string;
}

interface LeadMapping {
  id: string;
  callStatus: {
    name: string;
    description?: string;
    color: string;
  };
  leadStatus: {
    name: string;
    description?: string;
    color: string;
  };
  callStatusId: string;
  leadStatusId: string;
  condition: string;
  priority: number;
  description?: string;
  isAutomatic?: boolean;
}

/**
 * 📋 Page de paramètres selon le cahier des charges V1.5
 * - Mapping des statuts (Drag & Drop)
 * - Sources avec délais
 * - Intégrations API
 * - Gestion commerciaux
 * - Modèles d'emails
 */
const LeadsSettingsPage = () => {
  console.log('[LeadsSettingsPage] 🚀 Composant chargé');
  const { api } = useAuthenticatedApi();
  
  // États pour les statuts
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [callStatuses, setCallStatuses] = useState<CallStatus[]>([]);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [editingStatus, setEditingStatus] = useState<LeadStatus | null>(null);
  const [statusForm] = Form.useForm();

  // États pour les statuts d'appels
  const [isCallStatusModalVisible, setIsCallStatusModalVisible] = useState(false);
  const [editingCallStatus, setEditingCallStatus] = useState<CallStatus | null>(null);
  const [callStatusForm] = Form.useForm();

  // États pour les mappings
  const [mappings, setMappings] = useState<{
    id: string;
    callStatus: { name: string; description?: string; color: string };
    leadStatus: { name: string; description?: string; color: string };
    condition: string;
    priority: number;
  }[]>([]);

  // États pour les sources
  const [sources, setSources] = useState<Source[]>([]);
  const [isSourceModalVisible, setIsSourceModalVisible] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [sourceForm] = Form.useForm();

  // États pour les commerciaux - TODO: implémentation future
  // États pour les commerciaux seront implémentés plus tard

  // États pour les modèles d'emails
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [emailForm] = Form.useForm();

  // États pour les mappings
  const [isMappingModalVisible, setIsMappingModalVisible] = useState(false);
  const [editingMapping, setEditingMapping] = useState<LeadMapping | null>(null);
  const [mappingForm] = Form.useForm();

  // 📊 Récupération des données
  const fetchAllData = useCallback(async () => {
    try {
      // Récupérer tous les paramètres avec les mappings
      const [statusesRes, callStatusesRes, mappingsRes, sourcesRes, templatesRes] = await Promise.all([
        api.get('/api/settings/lead-statuses').catch(() => []),
        api.get('/api/settings/call-statuses').catch(() => []),
        api.get('/api/settings/call-lead-mappings').catch(() => []), // ✨ Ajout des mappings
        api.get('/api/settings/lead-sources').catch(() => []),
        api.get('/api/settings/email-templates').catch(() => [])
      ]);
      
      console.log('📊 Données chargées:', { 
        statuses: statusesRes?.length || 0, 
        callStatuses: callStatusesRes?.length || 0,
        mappings: mappingsRes?.length || 0 // ✨ Log des mappings
      });
      
      // Toujours initialiser avec un tableau vide, plus de valeurs par défaut
      // ✅ Trier les statuts par ordre pour conserver l'ordre personnalisé
      const sortedStatuses = (statusesRes || []).sort((a, b) => (a.order || 0) - (b.order || 0));
      setStatuses(sortedStatuses);
      
      setCallStatuses(callStatusesRes || []); 
      setMappings(mappingsRes || []); // ✨ Sauvegarder les mappings
      
      // Sources
      // Sources initialisées vides
      setSources(sourcesRes || []);
      
      // La gestion des commerciaux sera implémentée plus tard
      
      // Email templates initialisés vides
      setEmailTemplates(templatesRes || []);
      
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Erreur lors du chargement des paramètres');
      const errorDetails = getErrorResponseDetails(error);
      console.error('Erreur lors du chargement des paramètres:', {
        error,
        status: errorDetails.status,
        data: errorDetails.data,
      });
      NotificationManager.error(errorMessage);
    }
  }, [api]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // 🎯 Gestion des statuts de leads
  const handleStatusOk = async () => {
    try {
      const values = await statusForm.validateFields();
      const url = editingStatus ? `/settings/lead-statuses/${editingStatus.id}` : '/settings/lead-statuses';
      const method = editingStatus ? 'put' : 'post';
      
      await api[method](url, values);
      
      NotificationManager.success(`Statut ${editingStatus ? 'modifié' : 'ajouté'} avec succès`);
      setIsStatusModalVisible(false);
      setEditingStatus(null);
      fetchAllData();
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Erreur lors de la sauvegarde du statut');
      const errorDetails = getErrorResponseDetails(error);
      console.error('Erreur lors de la sauvegarde du statut:', {
        error,
        status: errorDetails.status,
        data: errorDetails.data,
      });
      NotificationManager.error(errorMessage);
    }
  };

  const handleDeleteStatus = async (id: string) => {
    try {
      await api.delete(`/settings/lead-statuses/${id}`);
      NotificationManager.success('Statut supprimé avec succès');
      fetchAllData();
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Erreur lors de la suppression du statut');
      const errorDetails = getErrorResponseDetails(error);
      console.error('Erreur lors de la suppression du statut:', {
        error,
        status: errorDetails.status,
        data: errorDetails.data,
      });
      NotificationManager.error(errorMessage);
    }
  };

  // 🎯 Gestion des statuts d'appels
  const handleCallStatusOk = async () => {
    try {
      const values = await callStatusForm.validateFields();
      
      let updatedStatuses;
      
      if (editingCallStatus) {
        // Modification
        updatedStatuses = callStatuses.map(cs => 
          cs.id === editingCallStatus.id ? { ...cs, ...values } : cs
        );
        NotificationManager.success('Statut d\'appel modifié avec succès');
      } else {
        // Création
        const newCallStatus = { 
          id: Date.now().toString(), 
          ...values 
        };
        updatedStatuses = [...callStatuses, newCallStatus];
        NotificationManager.success('Statut d\'appel créé avec succès');
      }
      
      // Sauvegarder en base de données
      await api.post('/api/settings/call-statuses', { statuses: updatedStatuses });
      setCallStatuses(updatedStatuses);
      
      setIsCallStatusModalVisible(false);
      setEditingCallStatus(null);
      callStatusForm.resetFields();
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Erreur lors de la sauvegarde du statut d\'appel');
      const errorDetails = getErrorResponseDetails(error);
      console.error('Erreur lors de la sauvegarde du statut d\'appel:', {
        error,
        status: errorDetails.status,
        data: errorDetails.data,
      });
      NotificationManager.error(errorMessage);
    }
  };

  const handleDeleteCallStatus = async (id: string) => {
    try {
      const updatedStatuses = callStatuses.filter(cs => cs.id !== id);
      
      // Sauvegarder en base de données
      await api.post('/api/settings/call-statuses', { statuses: updatedStatuses });
      setCallStatuses(updatedStatuses);
      
      NotificationManager.success('Statut d\'appel supprimé avec succès');
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Erreur lors de la suppression du statut d\'appel');
      const errorDetails = getErrorResponseDetails(error);
      console.error('Erreur lors de la suppression du statut d\'appel:', {
        error,
        status: errorDetails.status,
        data: errorDetails.data,
      });
      NotificationManager.error(errorMessage);
    }
  };

  const handleUpdateMapping = async (callStatusId: string, leadStatusId: string) => {
    try {
      console.log('🔗 Création du mapping:', { callStatusId, leadStatusId });
      
      // Créer ou mettre à jour le mapping via l'API
      const response = await api.post('/api/settings/call-lead-mappings', {
        callStatusId: callStatusId,
        leadStatusId: leadStatusId,
        priority: 1
      });
      
      console.log('✅ Mapping créé/mis à jour:', response);
      
      // Recharger les mappings pour mettre à jour l'affichage
      await fetchAllData();
      
      notification.success({
        message: 'Liaison créée !',
        description: 'Le mapping a été sauvegardé en base de données',
        duration: 3
      });
      
    } catch (error) {
      console.error('❌ Erreur lors de la création du mapping:', error);
      notification.error({
        message: 'Erreur',
        description: 'Impossible de créer la liaison',
        duration: 3
      });
    }
  };

  // 🎯 Gestion de la réorganisation des statuts de leads
  const moveLeadStatus = useCallback(async (dragIndex: number, hoverIndex: number) => {
    console.log('🚀 [MOVE] moveLeadStatus appelé:', { dragIndex, hoverIndex, statusesLength: statuses.length });
    
    // Mise à jour immédiate pour le feedback visuel (pas de sauvegarde)
    const draggedStatus = statuses[dragIndex];
    const newStatuses = [...statuses];
    newStatuses.splice(dragIndex, 1);
    newStatuses.splice(hoverIndex, 0, draggedStatus);
    
    console.log('📋 [MOVE] Nouvel ordre:', newStatuses.map(s => ({ id: s.id, name: s.name })));
    setStatuses(newStatuses);
  }, [statuses]);

  // 🎯 Sauvegarde de l'ordre des statuts de leads
  const saveLeadStatusOrder = useCallback(async () => {
    console.log('🎯 [SAVE] saveLeadStatusOrder appelé avec', statuses.length, 'statuts');
    
    try {
      // Recalculer les ordres
      const updatedStatuses = statuses.map((status, index) => ({
        ...status,
        order: index
      }));

      console.log('[REORDER] Sauvegarde statuts leads:', updatedStatuses.map(s => ({ id: s.id, name: s.name, order: s.order })));

      // Sauvegarder en base
      const dataToSend = {
        statuses: updatedStatuses.map(s => ({ id: s.id, order: s.order }))
      };
      console.log('[REORDER] 📤 ENVOI vers API:', JSON.stringify(dataToSend, null, 2));
      
      await api.put('/api/settings/lead-statuses/reorder', dataToSend);

      // ✅ NE PAS recharger les données - garder l'ordre visuel local
      // await fetchAllData(); // Cette ligne causait la réinitialisation de l'ordre !
      
      // Vérifier que l'ordre local est correct
      const sortedOrder = updatedStatuses.map(s => ({ id: s.id, name: s.name, order: s.order }));
      console.log('[REORDER] 📥 ORDRE LOCAL FINAL:', sortedOrder);
      
      notification.success({
        message: 'Ordre mis à jour',
        description: 'L\'ordre des statuts de leads a été sauvegardé',
        duration: 2
      });

    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde des statuts de leads:', error);
      // ❌ Seulement en cas d'erreur, on recharge les données
      fetchAllData();
      notification.error({
        message: 'Erreur',
        description: 'Impossible de sauvegarder l\'ordre des statuts',
        duration: 3
      });
    }
  }, [statuses, api, fetchAllData]);

  // 🎯 Sauvegarde de l'ordre des statuts d'appels
  const saveCallStatusOrder = useCallback(async () => {
    try {
      // Recalculer les ordres
      const updatedCallStatuses = callStatuses.map((status, index) => ({
        ...status,
        order: index
      }));

      console.log('[REORDER] Sauvegarde statuts appels:', updatedCallStatuses.map(s => ({ id: s.id, name: s.name, order: s.order })));

      // Sauvegarder en base
      await api.put('/api/settings/call-statuses/reorder', {
        statuses: updatedCallStatuses.map(s => ({ id: s.id, order: s.order }))
      });

      // ✨ Conserver l'état local au lieu de recharger (évite de réinitialiser l'ordre des leads)
      // await fetchAllData(); // Supprimé pour éviter la réinitialisation
      
      notification.success({
        message: 'Ordre mis à jour',
        description: 'L\'ordre des statuts d\'appel a été sauvegardé',
        duration: 2
      });

    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde des statuts d\'appel:', error);
      // Recharger les données en cas d'erreur
      fetchAllData();
      notification.error({
        message: 'Erreur',
        description: 'Impossible de sauvegarder l\'ordre des statuts d\'appel',
        duration: 3
      });
    }
  }, [callStatuses, api, fetchAllData]);

  // 🎯 Gestion de la réorganisation des statuts d'appels
  const moveCallStatus = useCallback(async (dragIndex: number, hoverIndex: number) => {
    try {
      const draggedStatus = callStatuses[dragIndex];
      const newStatuses = [...callStatuses];
      newStatuses.splice(dragIndex, 1);
      newStatuses.splice(hoverIndex, 0, draggedStatus);

      // Mettre à jour l'état local immédiatement pour le feedback visuel
      setCallStatuses(newStatuses);

      // Sauvegarder en base (supposons qu'il y ait un endpoint pour ça)
      await api.put('/api/settings/call-statuses/reorder', {
        statuses: newStatuses.map((status, index) => ({ 
          id: status.id, 
          order: index + 1 
        }))
      });
      
      notification.success({
        message: 'Ordre mis à jour',
        description: 'L\'ordre des statuts d\'appel a été sauvegardé',
        duration: 2
      });

    } catch (error) {
      console.error('❌ Erreur lors de la réorganisation des statuts d\'appels:', error);
      // Recharger les données en cas d'erreur
      await fetchAllData();
      notification.error({
        message: 'Erreur',
        description: 'Impossible de réorganiser les statuts d\'appel',
        duration: 3
      });
    }
  }, [callStatuses, api, fetchAllData]);

  // 🎯 Gestion des mappings avancés
  const handleCreateMapping = async () => {
    try {
      const values = await mappingForm.validateFields();
      
      if (editingMapping) {
        // Mode modification
        await api.put(`/api/settings/call-lead-mappings/${editingMapping.id}`, {
          callStatusId: values.callStatusId,
          leadStatusId: values.leadStatusId,
          priority: values.priority || 1,
          description: values.description || null
        });
        
        notification.success({
          message: 'Mapping modifié',
          description: 'La liaison a été modifiée avec succès'
        });
      } else {
        // Mode création
        await api.post('/api/settings/call-lead-mappings', {
          callStatusId: values.callStatusId,
          leadStatusId: values.leadStatusId,
          priority: values.priority || 1,
          description: values.description || null
        });
        
        notification.success({
          message: 'Mapping créé',
          description: 'La liaison entre les statuts a été créée avec succès'
        });
      }
      
      // Recharger les données pour mettre à jour l'affichage
      await fetchAllData();
      
      setIsMappingModalVisible(false);
      setEditingMapping(null);
      mappingForm.resetFields();
    } catch (error) {
      console.error('Erreur lors de la création du mapping:', error);
      notification.error({
        message: 'Erreur',
        description: 'Impossible de créer le mapping'
      });
    }
  };

  const handleEditMapping = (mapping: LeadMapping) => {
    setEditingMapping(mapping);
    mappingForm.setFieldsValue({
      callStatusId: mapping.callStatusId,
      leadStatusId: mapping.leadStatusId,
      isAutomatic: mapping.isAutomatic,
      priority: mapping.priority,
      condition: mapping.condition
    });
    setIsMappingModalVisible(true);
  };

  const handleDeleteMapping = async (mappingId: string) => {
    try {
      await api.delete(`/api/settings/call-lead-mappings/${mappingId}`);
      setMappings(prev => prev.filter(m => m.id !== mappingId));
      
      notification.success({
        message: 'Mapping supprimé',
        description: 'La liaison a été supprimée avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      notification.error({
        message: 'Erreur',
        description: 'Impossible de supprimer le mapping'
      });
    }
  };

  // 🎯 Gestion des sources
  const handleSourceOk = async () => {
    try {
      const values = await sourceForm.validateFields();
      
      if (editingSource) {
        setSources(prev => prev.map(s => s.id === editingSource.id ? { ...s, ...values } : s));
      } else {
        setSources(prev => [...prev, { id: Date.now().toString(), ...values }]);
      }
      
      NotificationManager.success(`Source ${editingSource ? 'modifiée' : 'ajoutée'} avec succès`);
      setIsSourceModalVisible(false);
      setEditingSource(null);
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Erreur lors de la sauvegarde de la source');
      const errorDetails = getErrorResponseDetails(error);
      console.error('Erreur lors de la sauvegarde de la source:', {
        error,
        status: errorDetails.status,
        data: errorDetails.data,
      });
      NotificationManager.error(errorMessage);
    }
  };

  // 🎯 Gestion des modèles d'emails
  const handleEmailOk = async () => {
    try {
      const values = await emailForm.validateFields();
      
      if (editingTemplate) {
        setEmailTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...values } : t));
      } else {
        setEmailTemplates(prev => [...prev, { id: Date.now().toString(), ...values }]);
      }
      
      NotificationManager.success(`Modèle ${editingTemplate ? 'modifié' : 'ajouté'} avec succès`);
      setIsEmailModalVisible(false);
      setEditingTemplate(null);
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Erreur lors de la sauvegarde du modèle');
      const errorDetails = getErrorResponseDetails(error);
      console.error('Erreur lors de la sauvegarde du modèle:', {
        error,
        status: errorDetails.status,
        data: errorDetails.data,
      });
      NotificationManager.error(errorMessage);
    }
  };

  // 📋 Configuration des onglets selon le cahier des charges
  const tabItems = [
    {
      key: 'statuses',
      label: (
        <Space>
          <SettingOutlined />
          Mapping Statuts
        </Space>
      ),
      children: (
        <DndProvider backend={HTML5Backend}>
          <Row gutter={24}>
            <Col span={12}>
              <Card title="Gestion des Statuts d'Appels" extra={
                <Space>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={() => {
                      setEditingCallStatus(null);
                      callStatusForm.resetFields();
                      setIsCallStatusModalVisible(true);
                    }}
                  >
                    Nouveau Statut
                  </Button>
                  <Button type="link" size="small" onClick={() => {
                    notification.info({
                      message: 'Gestion Avancée',
                      description: 'Créez vos propres statuts d\'appel et mappez-les avec les statuts de leads par drag & drop.',
                      duration: 4
                    });
                  }}>
                    ℹ️ Guide
                  </Button>
                </Space>
              }>
                <div className="space-y-4">
                  <Alert 
                    message="Statuts d'appels personnalisables" 
                    description="Créez, modifiez et organisez vos statuts d'appel. Glissez-déposez vers les statuts de leads (colonne de droite) pour créer les liaisons."
                    type="info" 
                    showIcon
                  />
                  
                  {/* Liste des statuts d'appels avec CRUD et réorganisation */}
                  <div className="space-y-2">
                    {callStatuses.map((callStatus, index) => (
                      <SortableCallStatus 
                        key={callStatus.id || index} 
                        callStatus={callStatus}
                        index={index}
                        leadStatuses={statuses}
                        onEdit={(status) => {
                          setEditingCallStatus(status);
                          callStatusForm.setFieldsValue(status);
                          setIsCallStatusModalVisible(true);
                        }}
                        onDelete={(id) => handleDeleteCallStatus(id)}
                        moveStatus={moveCallStatus}
                        onUpdateMapping={(callStatusId, leadStatusId) => 
                          handleUpdateMapping(callStatusId, leadStatusId)
                        }
                        onDragEnd={saveCallStatusOrder}
                      />
                    ))}
                  </div>
                  
                  {callStatuses.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">�</div>
                      <div>Aucun statut d'appel configuré</div>
                      <div className="text-sm">Cliquez sur "Nouveau Statut" pour commencer</div>
                    </div>
                  )}
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                    <Text className="text-blue-800 text-sm">
                      <strong>💡 Fonctionnalités drag & drop :</strong><br />
                      • <strong>Réorganiser :</strong> Glissez un statut sur un autre pour réorganiser l'ordre<br />
                      • <strong>Lier :</strong> Glissez un statut d'appel vers un statut de lead pour créer une liaison<br />
                      • Les modifications sont sauvegardées automatiquement
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card 
                title="Statuts de Leads" 
                extra={
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={() => {
                      setEditingStatus(null);
                      statusForm.resetFields();
                      setIsStatusModalVisible(true);
                    }}
                  >
                    Ajouter
                  </Button>
                }
              >
                <div className="space-y-4">
                  <Alert 
                    message="Zone drag & drop multi-fonctionnelle" 
                    description="Accepte les statuts d'appel pour créer des liaisons ET permet la réorganisation par glisser-déposer entre statuts de leads."
                    type="success" 
                    showIcon
                    className="mb-4" 
                  />
                  
                  <div className="space-y-2">
                    {statuses.map((status, index) => (
                      <SortableLeadStatus 
                        key={status.id} 
                        status={status}
                        index={index}
                        onEdit={(status) => {
                          setEditingStatus(status);
                          statusForm.setFieldsValue(status);
                          setIsStatusModalVisible(true);
                        }}
                        onDelete={handleDeleteStatus}
                        moveStatus={moveLeadStatus}
                        onDragEnd={saveLeadStatusOrder}
                        onAcceptCallStatus={(callStatusId, leadStatusId) => {
                          handleUpdateMapping(callStatusId, leadStatusId);
                          notification.success({
                            message: 'Liaison créée !',
                            description: `Statut d'appel lié avec "${status.name}"`,
                            duration: 2
                          });
                        }}
                      />
                    ))}
                  </div>
                  
                  {statuses.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">�</div>
                      <div>Aucun statut configuré</div>
                      <div className="text-sm">Cliquez sur "Ajouter" pour commencer</div>
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </DndProvider>
      )
    },
    {
      key: 'mappings',
      label: (
        <Space>
          <LinkOutlined />
          Règles de Mapping
        </Space>
      ),
      children: (
        <div className="space-y-6">
          {/* Section d'affichage des mappings existants */}
          <Card title="Règles de Mapping Configurées">
            <Alert 
              message="Mappings Intelligents Actifs" 
              description={`${mappings.length} règles automatiques configurées selon votre tableau métier. Ces règles déterminent comment les statuts d'appel changent automatiquement les statuts de leads.`}
              type="success" 
              className="mb-4" 
              showIcon
            />
            
            <div className="space-y-3">
              {mappings.map((mapping, index) => (
                <Card 
                  key={mapping.id || index} 
                  size="small" 
                  className="border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Statut d'appel */}
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: mapping.callStatus?.color || '#d1d5db' }}
                        />
                        <Tooltip title={mapping.callStatus?.description || ''}>
                          <span className="font-medium cursor-help">
                            {mapping.callStatus?.name || 'Statut non défini'}
                          </span>
                        </Tooltip>
                        <Tag size="small" color="blue">Appel</Tag>
                      </div>
                      
                      {/* Flèche */}
                      <div className="text-gray-400">→</div>
                      
                      {/* Statut de lead */}
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: mapping.leadStatus?.color || '#d1d5db' }}
                        />
                        <Tooltip title={mapping.leadStatus?.description || ''}>
                          <span className="font-medium cursor-help">
                            {mapping.leadStatus?.name || 'Statut non défini'}
                          </span>
                        </Tooltip>
                        <Tag size="small" color="green">Lead</Tag>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Tag color="purple" className="text-xs">
                        {mapping.condition === 'automatic' ? 'Automatique' : mapping.condition}
                      </Tag>
                      <Text type="secondary" className="text-xs">
                        Priorité: {mapping.priority}
                      </Text>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEditMapping(mapping)}
                        title="Modifier ce mapping"
                      />
                      <Popconfirm
                        title="Supprimer ce mapping ?"
                        description="Cette action est irréversible. Êtes-vous sûr ?"
                        onConfirm={() => handleDeleteMapping(mapping.id)}
                        okText="Supprimer"
                        cancelText="Annuler"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          title="Supprimer ce mapping"
                        />
                      </Popconfirm>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          {/* Section de création de nouveaux mappings */}
          <Card 
            title="Créer une Nouvelle Liaison" 
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingMapping(null);
                  mappingForm.resetFields();
                  setIsMappingModalVisible(true);
                }}
              >
                Nouveau Mapping
              </Button>
            }
          >
            <Alert 
              message="Liaison Statut d'Appel → Statut de Lead" 
              description="Définissez comment l'état d'un appel influence automatiquement l'avancement du lead selon votre tableau métier. Chaque règle peut être configurée pour être automatique ou manuelle."
              type="info" 
              className="mb-4" 
              showIcon
            />
            
            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <Typography.Title level={5} className="text-blue-800 mb-2">
                💡 Comment fonctionnent les mappings
              </Typography.Title>
              <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
                <li><strong>Automatique</strong> : Le changement se fait instantanément après l'appel</li>
                <li><strong>Manuel</strong> : L'utilisateur doit confirmer le changement</li>
                <li><strong>Priorité</strong> : En cas de conflit, la règle avec la priorité la plus faible gagne</li>
                <li><strong>Condition</strong> : Critères spéciaux pour déclencher la règle</li>
              </ul>
            </div>
          </Card>
          
          {mappings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🔗</div>
              <div>Aucun mapping configuré</div>
              <div className="text-sm">Les mappings se créent automatiquement via le drag & drop</div>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'sources',
      label: (
        <Space>
          <ApiOutlined />
          Sources & Délais
        </Space>
      ),
      children: (
        <div className="space-y-6">
          <Card 
            title="Configuration des Sources" 
            extra={
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingSource(null);
                sourceForm.resetFields();
                setIsSourceModalVisible(true);
              }}
            >
              Ajouter Source
            </Button>
          }
        >
          <Alert 
            message="Définissez les délais de traitement par source selon le cahier des charges" 
            type="info" 
            className="mb-4" 
          />
          <List
            dataSource={sources}
            renderItem={source => (
              <List.Item
                actions={[
                  <Button 
                    icon={<EditOutlined />} 
                    onClick={() => {
                      setEditingSource(source);
                      sourceForm.setFieldsValue(source);
                      setIsSourceModalVisible(true);
                    }}
                  >
                    Modifier
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={<Tag color="blue">{source.label}</Tag>}
                  description={
                    <Space direction="vertical" size="small">
                      <Text>Délai maximum: <strong>{source.maxDelay} {source.unit === 'hours' ? 'heures' : 'jours'}</strong></Text>
                      <Text type="secondary">
                        ❌ Non traité dans le délai → impact commercial négatif<br/>
                        ✅ Traité dans le délai → pas d'impact négatif
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
        </div>
      )
    },
    {
      key: 'integrations',
      label: (
        <Space>
          <ApiOutlined />
          API & Intégrations
        </Space>
      ),
      children: (
        <Row gutter={24}>
          <Col span={12}>
            <Card title="Intégrations CRM">
              <Space direction="vertical" className="w-full">
                <div className="flex justify-between items-center">
                  <Text>Bobex Integration</Text>
                  <Switch defaultChecked />
                </div>
                <div className="flex justify-between items-center">
                  <Text>Solvary Integration</Text>
                  <Switch defaultChecked />
                </div>
                <div className="flex justify-between items-center">
                  <Text>Telnyx Appels</Text>
                  <Switch defaultChecked />
                </div>
              </Space>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Google Workspace">
              <Space direction="vertical" className="w-full">
                <div className="flex justify-between items-center">
                  <Text>Google Calendar</Text>
                  <Switch defaultChecked />
                </div>
                <div className="flex justify-between items-center">
                  <Text>Gmail Integration</Text>
                  <Switch defaultChecked />
                </div>
                <div className="flex justify-between items-center">
                  <Text>Gemini IA</Text>
                  <Switch defaultChecked />
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      )
    },
    {
      key: 'sales',
      label: (
        <Space>
          <UserOutlined />
          Commerciaux
        </Space>
      ),
      children: (
        <Card 
          title="Équipe Commerciale" 
          extra={
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setIsSalesModalVisible(true)}
            >
              Ajouter Commercial
            </Button>
          }
        >
          <Alert 
            message="Gestion des comptes commerciaux, quotas et objectifs" 
            type="info" 
            className="mb-4" 
          />
          <Text type="secondary">
            Configuration des commerciaux en cours de développement selon le cahier des charges
          </Text>
        </Card>
      )
    },
    {
      key: 'emails',
      label: (
        <Space>
          <MailOutlined />
          Modèles Emails
        </Space>
      ),
      children: (
        <Card 
          title="Modèles d'Emails" 
          extra={
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingTemplate(null);
                emailForm.resetFields();
                setIsEmailModalVisible(true);
              }}
            >
              Nouveau Modèle
            </Button>
          }
        >
          <Alert 
            message="Modèles prédéfinis pour chaque action (RDV, devis, relance, refus)" 
            type="info" 
            className="mb-4" 
          />
          <List
            dataSource={emailTemplates}
            renderItem={template => (
              <List.Item
                actions={[
                  <Button 
                    icon={<EditOutlined />} 
                    onClick={() => {
                      setEditingTemplate(template);
                      emailForm.setFieldsValue(template);
                      setIsEmailModalVisible(true);
                    }}
                  >
                    Modifier
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={<Tag color="green">{template.name}</Tag>}
                  description={
                    <Space direction="vertical" size="small">
                      <Text><strong>Sujet:</strong> {template.subject}</Text>
                      <Text type="secondary" ellipsis>{template.content}</Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>⚙️ Paramètres Leads & Appels</Title>
        <Text type="secondary">
          Configuration complète selon le cahier des charges V1.5
        </Text>
      </div>

      <Tabs
        items={tabItems}
        size="large"
        tabBarStyle={{ marginBottom: 24 }}
      />

      {/* Modal Statuts */}
      <Modal
        title={editingStatus ? 'Modifier le statut' : 'Ajouter un statut'}
        open={isStatusModalVisible}
        onOk={handleStatusOk}
        onCancel={() => setIsStatusModalVisible(false)}
        okText="Sauvegarder"
        cancelText="Annuler"
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item name="name" label="Nom du statut" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="color" label="Couleur" rules={[{ required: true }]}>
            <Input type="color" />
          </Form.Item>
          <Form.Item name="order" label="Ordre" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Statuts d'Appels */}
      <Modal
        title={editingCallStatus ? 'Modifier le statut d\'appel' : 'Nouveau statut d\'appel'}
        open={isCallStatusModalVisible}
        onOk={handleCallStatusOk}
        onCancel={() => {
          setIsCallStatusModalVisible(false);
          setEditingCallStatus(null);
          callStatusForm.resetFields();
        }}
        okText="Sauvegarder"
        cancelText="Annuler"
        width={600}
      >
        <Form form={callStatusForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Nom du statut" rules={[{ required: true, message: 'Le nom est requis' }]}>
                <Input placeholder="ex: Répondu" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="icon" label="Icône (optionnel)">
                <Input placeholder="ex: ✅" maxLength={2} />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="description" label="Description">
            <Input.TextArea 
              placeholder="Description du statut d'appel..." 
              rows={2}
            />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="color" label="Couleur" rules={[{ required: true, message: 'La couleur est requise' }]}>
                <Input type="color" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mappedToLeadStatus" label="Lié au statut de lead">
                <Select placeholder="Choisir un statut de lead">
                  {statuses.map(status => (
                    <Option key={status.id} value={status.id}>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: status.color }}
                        />
                        <span>{status.name}</span>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Alert 
            message="Liaison automatique" 
            description="Quand un appel se termine avec ce statut, le lead sera automatiquement mis à jour avec le statut lié (si défini)."
            type="info" 
            showIcon
            className="mt-2"
          />
        </Form>
      </Modal>

      {/* Modal Sources */}
      <Modal
        title={editingSource ? 'Modifier la source' : 'Ajouter une source'}
        open={isSourceModalVisible}
        onOk={handleSourceOk}
        onCancel={() => setIsSourceModalVisible(false)}
        okText="Sauvegarder"
        cancelText="Annuler"
      >
        <Form form={sourceForm} layout="vertical">
          <Form.Item name="name" label="Nom de la source" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="label" label="Libellé affiché" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="maxDelay" label="Délai maximum" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="unit" label="Unité" rules={[{ required: true }]}>
            <Select>
              <Option value="hours">Heures</Option>
              <Option value="days">Jours</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Modèles Email */}
      <Modal
        title={editingTemplate ? 'Modifier le modèle' : 'Nouveau modèle'}
        open={isEmailModalVisible}
        onOk={handleEmailOk}
        onCancel={() => setIsEmailModalVisible(false)}
        okText="Sauvegarder"
        cancelText="Annuler"
        width={800}
      >
        <Form form={emailForm} layout="vertical">
          <Form.Item name="name" label="Nom du modèle" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="subject" label="Sujet de l'email" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label="Contenu" rules={[{ required: true }]}>
            <Input.TextArea rows={6} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Mapping */}
      <Modal
        title={editingMapping ? 'Modifier le mapping' : 'Nouveau mapping'}
        open={isMappingModalVisible}
        onOk={handleCreateMapping}
        onCancel={() => {
          setIsMappingModalVisible(false);
          setEditingMapping(null);
          mappingForm.resetFields();
        }}
        okText="Sauvegarder"
        cancelText="Annuler"
      >
        <Form form={mappingForm} layout="vertical">
          <Form.Item name="callStatusId" label="Statut d'appel" rules={[{ required: true }]}>
            <Select placeholder="Sélectionner un statut d'appel">
              {callStatuses.map(status => (
                <Select.Option key={status.id} value={status.id}>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: status.color }}
                    />
                    <span>{status.name}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="leadStatusId" label="Statut de lead" rules={[{ required: true }]}>
            <Select placeholder="Sélectionner un statut de lead">
              {statuses.map(status => (
                <Select.Option key={status.id} value={status.id}>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: status.color }}
                    />
                    <span>{status.name}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="priority" label="Priorité" rules={[{ required: true }]}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Description de cette règle de mapping..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LeadsSettingsPage;
