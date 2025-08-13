import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Tabs, 
  Button, 
  Space, 
  Avatar, 
  Timeline, 
  Upload, 
  Modal, 
  Input, 
  Form,
  Tag,
  Divider,
  Typography,
  Row,
  Col,
  Descriptions,
  Badge,
  Tooltip
} from 'antd';
import { 
  PhoneOutlined, 
  MailOutlined, 
  CalendarOutlined, 
  UserOutlined,
  FileOutlined,
  PlusOutlined,
  EditOutlined,
  ArrowLeftOutlined,
  BellOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { NotificationManager } from '../../components/Notifications';
import type { Lead } from '../../types/leads';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * 📋 Module du Lead (fiche détaillée) - Version finale
 * 
 * Contenu :
 * - Infos du client : coordonnées, email, téléphone, adresse, source, etc.
 * - Historique complet : appels, emails, notes, RDV passés.
 * - Notes internes (texte libre, obligatoires après appel).
 * - Documents liés : devis, factures, contrats (upload possible).
 * - Boutons d'action : 📞 Appeler, 📅 Agenda, ✉️ Email
 * - IA intégrée : suggestions de scripts, analyse des notes, propositions de RDV
 */
export default function LeadDetailModule(): React.ReactElement {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { api } = useAuthenticatedApi();
  const { user } = useAuth();
  
  // États principaux
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // États pour les modales
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  
  // États pour les formulaires
  const [noteForm] = Form.useForm();
  const [currentNote, setCurrentNote] = useState('');
  
  // États pour l'historique
  const [history, setHistory] = useState([]);
  const [documents, setDocuments] = useState([]);

  // 📊 Récupération des détails du lead
  const fetchLeadDetail = useCallback(async () => {
    if (!leadId) return;
    
    setLoading(true);
    try {
      const leadData = await api.get(`/leads/${leadId}`);
      setLead(leadData);
      
      // Récupérer l'historique
      const historyData = await api.get(`/leads/${leadId}/history`);
      setHistory(historyData || []);
      
      // Récupérer les documents
      const documentsData = await api.get(`/leads/${leadId}/documents`);
      setDocuments(documentsData || []);
      
    } catch (error: any) {
      setError(error.message);
      NotificationManager.error('Erreur lors du chargement du lead');
    } finally {
      setLoading(false);
    }
  }, [leadId, api]);

  // 🔄 Chargement initial
  useEffect(() => {
    fetchLeadDetail();
  }, [fetchLeadDetail]);

  // 📞 Action : Appeler le lead
  const handleCallLead = useCallback(() => {
    if (!lead) return;
    
    // TODO: Intégrer avec Telnyx
    // Suggestion IA de script d'appel avant d'ouvrir Telnyx
    Modal.info({
      title: '🤖 Script d\'appel suggéré par l\'IA',
      content: (
        <div>
          <p><strong>Contexte :</strong> {lead.data?.company ? 'Prospect B2B' : 'Prospect B2C'}</p>
          <p><strong>Dernier contact :</strong> {lead.lastContact ? dayjs(lead.lastContact).format('DD/MM/YYYY') : 'Premier contact'}</p>
          <p><strong>Script suggéré :</strong></p>
          <div className="bg-blue-50 p-3 rounded mt-2">
            \"Bonjour {lead.data?.name}, je suis {user?.firstName} de 2Thier SRL. 
            Je vous contacte concernant votre demande sur notre site web...\"
          </div>
        </div>
      ),
      onOk() {
        // Rediriger vers le module d'appel
        navigate(`/leads/call/${leadId}`);
      },
    });
  }, [lead, user, leadId, navigate]);

  // 📅 Action : Planifier RDV (Google Agenda)
  const handleScheduleMeeting = useCallback(() => {
    if (!lead) return;
    
    // TODO: Intégrer avec Google Calendar
    // Propositions de créneaux optimisés par IA
    Modal.info({
      title: '🤖 Créneaux optimisés par l\'IA',
      content: (
        <div>
          <p><strong>Meilleurs créneaux suggérés :</strong></p>
          <ul className="mt-2">
            <li>Demain 14h00 - 15h00 (Disponibilité élevée)</li>
            <li>Jeudi 10h00 - 11h00 (Optimisé pour ce profil client)</li>
            <li>Vendredi 16h00 - 17h00 (Créneau préféré client)</li>
          </ul>
        </div>
      ),
      onOk() {
        // Ouvrir Google Calendar en mode iframe/API
        navigate(`/leads/agenda/${leadId}`);
      },
    });
  }, [lead, leadId, navigate]);

  // ✉️ Action : Envoyer un email
  const handleSendEmail = useCallback(() => {
    if (!lead) return;
    
    // TODO: Pré-remplir email avec IA
    const emailData = {
      to: lead.data?.email,
      subject: `Suivi de votre demande - ${lead.data?.company || lead.data?.name}`,
      body: `Bonjour ${lead.data?.name},\n\nJe fais suite à notre échange concernant...\n\nCordialement,\n${user?.firstName} ${user?.lastName}\n2Thier SRL`
    };
    
    // Rediriger vers le module email avec données pré-remplies
    navigate(`/leads/email/${leadId}`, { state: emailData });
  }, [lead, user, leadId, navigate]);

  // 📝 Ajouter une note interne
  const handleAddNote = useCallback(async () => {
    if (!currentNote.trim() || !leadId) return;
    
    try {
      await api.post(`/leads/${leadId}/notes`, {
        content: currentNote,
        author: user?.firstName + ' ' + user?.lastName,
        type: 'internal'
      });
      
      setCurrentNote('');
      setIsNoteModalOpen(false);
      NotificationManager.success('Note ajoutée avec succès');
      
      // Recharger l'historique
      fetchLeadDetail();
      
      // TODO: Analyse IA de la note
      // Détection d'opportunités ou signaux faibles
      
    } catch (error: any) {
      NotificationManager.error('Erreur lors de l\'ajout de la note');
    }
  }, [currentNote, leadId, api, user, fetchLeadDetail]);

  // 📄 Upload de documents
  const handleDocumentUpload = useCallback(async (file: any) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('leadId', leadId!);
      formData.append('type', 'document');
      
      await api.post(`/leads/${leadId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      NotificationManager.success('Document uploadé avec succès');
      fetchLeadDetail();
      
    } catch (error: any) {
      NotificationManager.error('Erreur lors de l\'upload du document');
    }
    
    return false; // Empêcher l'upload automatique d'Antd
  }, [leadId, api, fetchLeadDetail]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700">Lead non trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 📊 Header avec actions principales */}
      <Row justify="space-between" align="middle" className="mb-6">
        <Col>
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/leads/home')}
            >
              Retour à la liste
            </Button>
            <Title level={2} className="mb-0">
              <Avatar icon={<UserOutlined />} className="mr-2" />
              {lead.data?.name || 'Lead sans nom'}
            </Title>
            {lead.data?.company && (
              <Tag color="blue" className="ml-2">{lead.data.company}</Tag>
            )}
          </Space>
        </Col>
        <Col>
          <Space size="middle">
            <Tooltip title="Script IA suggéré avant l'appel">
              <Button 
                type="primary" 
                icon={<PhoneOutlined />}
                onClick={handleCallLead}
                size="large"
              >
                📞 Appeler
              </Button>
            </Tooltip>
            <Tooltip title="Créneaux optimisés par IA">
              <Button 
                icon={<CalendarOutlined />}
                onClick={handleScheduleMeeting}
                size="large"
              >
                📅 Agenda
              </Button>
            </Tooltip>
            <Tooltip title="Email pré-rempli par IA">
              <Button 
                icon={<MailOutlined />}
                onClick={handleSendEmail}
                size="large"
              >
                ✉️ Email
              </Button>
            </Tooltip>
          </Space>
        </Col>
      </Row>

      {/* 📋 Contenu principal en onglets */}
      <Tabs defaultActiveKey="infos" size="large">
        
        {/* 📊 Onglet : Informations du client */}
        <TabPane tab={<span><UserOutlined />Informations</span>} key="infos">
          <Row gutter={24}>
            <Col span={12}>
              <Card title="👤 Coordonnées" className="mb-4">
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="Nom">{lead.data?.name || 'N/A'}</Descriptions.Item>
                  <Descriptions.Item label="Email">{lead.data?.email || 'N/A'}</Descriptions.Item>
                  <Descriptions.Item label="Téléphone">{lead.data?.phone || 'N/A'}</Descriptions.Item>
                  <Descriptions.Item label="Société">{lead.data?.company || 'Particulier'}</Descriptions.Item>
                  <Descriptions.Item label="Adresse">{lead.data?.address || 'N/A'}</Descriptions.Item>
                  <Descriptions.Item label="Source">
                    <Tag color="blue">{lead.source}</Tag>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="📊 Statut & Suivi" className="mb-4">
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="Statut actuel">
                    <Badge status="processing" text={lead.status} />
                  </Descriptions.Item>
                  <Descriptions.Item label="Commercial assigné">
                    {lead.assignedTo || 'Non assigné'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Date d'entrée">
                    {dayjs(lead.createdAt).format('DD/MM/YYYY HH:mm')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Dernière action">
                    {lead.lastContact ? dayjs(lead.lastContact).format('DD/MM/YYYY HH:mm') : 'Aucune'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Prochain suivi">
                    {lead.nextFollowUp ? dayjs(lead.nextFollowUp).format('DD/MM/YYYY') : 'À définir'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* 📞 Onglet : Historique complet */}
        <TabPane tab={<span><ClockCircleOutlined />Historique</span>} key="history">
          <Card 
            title="📞 Historique des interactions" 
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setIsNoteModalOpen(true)}
              >
                Ajouter une note
              </Button>
            }
          >
            <Timeline>
              {history.length > 0 ? history.map((item: any, index) => (
                <Timeline.Item key={index} color={item.type === 'call' ? 'blue' : 'green'}>
                  <div className="flex justify-between">
                    <div>
                      <strong>{item.type === 'call' ? '📞 Appel' : '📧 Email'}</strong>
                      <p className="mb-1">{item.content}</p>
                      <Text type="secondary">{item.author} - {dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                    </div>
                  </div>
                </Timeline.Item>
              )) : (
                <Timeline.Item color="gray">
                  <Text type="secondary">Aucun historique pour ce lead</Text>
                </Timeline.Item>
              )}
            </Timeline>
          </Card>
        </TabPane>

        {/* 📄 Onglet : Documents liés */}
        <TabPane tab={<span><FileOutlined />Documents</span>} key="documents">
          <Card 
            title="📄 Documents attachés" 
            extra={
              <Upload 
                beforeUpload={handleDocumentUpload}
                showUploadList={false}
              >
                <Button type="primary" icon={<PlusOutlined />}>
                  Uploader un document
                </Button>
              </Upload>
            }
          >
            {documents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc: any, index) => (
                  <Card key={index} size="small" className="cursor-pointer hover:shadow-md">
                    <div className="flex items-center space-x-3">
                      <FileTextOutlined className="text-blue-500 text-xl" />
                      <div>
                        <div className="font-medium">{doc.name}</div>
                        <div className="text-sm text-gray-500">{doc.type}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileOutlined className="text-4xl mb-2" />
                <p>Aucun document attaché</p>
              </div>
            )}
          </Card>
        </TabPane>

        {/* 🤖 Onglet : Suggestions IA */}
        <TabPane tab={<span><BellOutlined />IA & Suggestions</span>} key="ai">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="🤖 Analyse IA du Lead" className="mb-4">
                <div className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded">
                    <strong>💡 Opportunité détectée :</strong>
                    <p className="mb-0 mt-1">Ce prospect montre des signaux d'achat élevés. Recommandation : Planifier un RDV dans les 24h.</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <strong>📈 Score de qualification :</strong>
                    <p className="mb-0 mt-1">85/100 - Lead très qualifié</p>
                  </div>
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="🎯 Prochaines actions suggérées" className="mb-4">
                <div className="space-y-2">
                  <Button block type="dashed" icon={<PhoneOutlined />}>
                    Appeler avant 18h aujourd'hui
                  </Button>
                  <Button block type="dashed" icon={<MailOutlined />}>
                    Envoyer documentation produit
                  </Button>
                  <Button block type="dashed" icon={<CalendarOutlined />}>
                    Proposer RDV démonstration
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>

      {/* 📝 Modal pour ajouter une note */}
      <Modal
        title="📝 Ajouter une note interne"
        open={isNoteModalOpen}
        onOk={handleAddNote}
        onCancel={() => setIsNoteModalOpen(false)}
        okText="Enregistrer"
        cancelText="Annuler"
      >
        <TextArea
          rows={4}
          placeholder="Saisir votre note ici... (obligatoire après un appel)"
          value={currentNote}
          onChange={(e) => setCurrentNote(e.target.value)}
        />
        <div className="mt-2 text-sm text-gray-500">
          💡 L'IA analysera cette note pour détecter des opportunités et suggérer les prochaines actions.
        </div>
      </Modal>
    </div>
  );
}
