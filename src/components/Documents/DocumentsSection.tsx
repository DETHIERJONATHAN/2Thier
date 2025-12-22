import { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Tag, 
  Dropdown, 
  message, 
  Modal, 
  Input,
  Empty,
  Spin,
  Descriptions,
  Typography
} from 'antd';
import { 
  DownloadOutlined, 
  SendOutlined, 
  EyeOutlined,
  DeleteOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Text } = Typography;

interface GeneratedDocument {
  id: string;
  type: 'QUOTE' | 'INVOICE' | 'ORDER' | 'CONTRACT' | 'PRESENTATION';
  language: string;
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'SIGNED' | 'PAID' | 'CANCELLED';
  documentNumber?: string;
  pdfUrl?: string;
  createdAt: string;
  sentAt?: string;
  signedAt?: string;
  paidAt?: string;
  template: {
    name: string;
    type: string;
  };
}

interface DocumentsSectionProps {
  submissionId?: string;
  leadId?: string;
}

const DocumentsSection = ({ submissionId, leadId }: DocumentsSectionProps) => {
  const { api } = useAuthenticatedApi();
  
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<GeneratedDocument | null>(null);
  const [emailTo, setEmailTo] = useState('');

  // Charger les documents
  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (submissionId) params.append('submissionId', submissionId);
      if (leadId) params.append('leadId', leadId);
      
      const response = await api.get(`/api/documents/generated?${params.toString()}`);
      setDocuments(response);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (submissionId || leadId) {
      loadDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, leadId]);

  // Écouter l'événement de génération de document pour rafraîchir la liste
  useEffect(() => {
    const handleDocumentGenerated = () => {
      console.log('📄 [DocumentsSection] Document généré, rafraîchissement de la liste...');
      loadDocuments();
    };

    window.addEventListener('document-generated', handleDocumentGenerated);
    return () => {
      window.removeEventListener('document-generated', handleDocumentGenerated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, leadId]);

  // Télécharger le PDF
  const handleDownload = async (doc: GeneratedDocument) => {
    try {
      // Utiliser l'API pour récupérer le PDF
      const response = await api.get(`/api/documents/generated/${doc.id}/download`);
      
      // Pour l'instant la route retourne du JSON, on affiche un message
      if (response?.message === 'PDF generation not yet implemented') {
        message.info('La génération PDF n\'est pas encore implémentée. Aperçu des données disponible.');
        // Ouvrir l'aperçu à la place
        handlePreview(doc);
      } else if (doc.pdfUrl) {
        window.open(doc.pdfUrl, '_blank');
      }
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      message.error('Erreur lors du téléchargement');
    }
  };

  // Aperçu du document
  const handlePreview = async (doc: GeneratedDocument) => {
    try {
      setPreviewLoading(true);
      setSelectedDoc(doc);
      const response = await api.get(`/api/documents/generated/${doc.id}/preview`);
      setPreviewData(response);
      setPreviewModalVisible(true);
    } catch (error) {
      console.error('Erreur aperçu:', error);
      message.error('Erreur lors du chargement de l\'aperçu');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Ouvrir modal envoi
  const openSendModal = (doc: GeneratedDocument) => {
    setSelectedDoc(doc);
    setSendModalVisible(true);
  };

  // Envoyer par email
  const handleSend = async () => {
    if (!selectedDoc || !emailTo) return;
    
    try {
      await api.post(`/api/documents/generated/${selectedDoc.id}/send`, {
        email: emailTo
      });
      
      message.success('Document envoyé !');
      setSendModalVisible(false);
      setEmailTo('');
      loadDocuments();
    } catch {
      message.error('Erreur lors de l\'envoi');
    }
  };

  // Supprimer document
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/documents/generated/${id}`);
      message.success('Document supprimé');
      loadDocuments();
    } catch {
      message.error('Erreur lors de la suppression');
    }
  };

  // Couleurs des statuts
  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      DRAFT: { label: 'Brouillon', color: 'default' },
      SENT: { label: 'Envoyé', color: 'blue' },
      VIEWED: { label: 'Vu', color: 'cyan' },
      SIGNED: { label: 'Signé', color: 'green' },
      PAID: { label: 'Payé', color: 'success' },
      CANCELLED: { label: 'Annulé', color: 'red' }
    };
    const config = statusConfig[status] || { label: status, color: 'default' };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  // Icône selon le type
  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      QUOTE: '📋',
      INVOICE: '🧾',
      ORDER: '📦',
      CONTRACT: '📜',
      PRESENTATION: '📊'
    };
    return icons[type] || '📄';
  };

  // Drapeau langue
  const getLanguageFlag = (lang: string) => {
    const flags: Record<string, string> = {
      fr: '🇫🇷',
      nl: '🇳🇱',
      de: '🇩🇪',
      en: '🇬🇧'
    };
    return flags[lang] || lang.toUpperCase();
  };

  return (
    <Card
      title="📄 Documents"
    >
      <Spin spinning={loading}>
        {documents.length === 0 ? (
          <Empty 
            description="Aucun document généré"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Space direction="vertical" className="w-full" size="middle">
            {documents.map(doc => (
              <Card
                key={doc.id}
                size="small"
                className="shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTypeIcon(doc.type)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{doc.template.name}</span>
                        {getStatusTag(doc.status)}
                        <span className="text-sm text-gray-500">
                          {getLanguageFlag(doc.language)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {doc.documentNumber && (
                          <span className="mr-3">N° {doc.documentNumber}</span>
                        )}
                        <span>{new Date(doc.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                      {doc.sentAt && (
                        <div className="text-xs text-gray-400">
                          Envoyé le {new Date(doc.sentAt).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                      {doc.signedAt && (
                        <div className="text-xs text-green-600">
                          ✓ Signé le {new Date(doc.signedAt).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                      {doc.paidAt && (
                        <div className="text-xs text-green-600">
                          ✓ Payé le {new Date(doc.paidAt).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Space>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(doc)}
                      disabled={!doc.pdfUrl}
                    >
                      Télécharger
                    </Button>
                    <Button
                      icon={<SendOutlined />}
                      onClick={() => openSendModal(doc)}
                    >
                      Envoyer
                    </Button>
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'view',
                            label: 'Aperçu',
                            icon: <EyeOutlined />,
                            onClick: () => handlePreview(doc)
                          },
                          {
                            key: 'delete',
                            label: 'Supprimer',
                            icon: <DeleteOutlined />,
                            danger: true,
                            onClick: () => handleDelete(doc.id)
                          }
                        ]
                      }}
                    >
                      <Button icon={<MoreOutlined />} />
                    </Dropdown>
                  </Space>
                </div>
              </Card>
            ))}
          </Space>
        )}
      </Spin>

      {/* Modal Envoi */}
      <Modal
        title="Envoyer le document"
        open={sendModalVisible}
        onCancel={() => {
          setSendModalVisible(false);
          setEmailTo('');
        }}
        onOk={handleSend}
        okText="Envoyer"
      >
        <Space direction="vertical" className="w-full">
          <p>Document : <strong>{selectedDoc?.template.name}</strong></p>
          <Input
            placeholder="Adresse email du destinataire"
            value={emailTo}
            onChange={e => setEmailTo(e.target.value)}
            type="email"
          />
        </Space>
      </Modal>

      {/* Modal Aperçu */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            <span>Aperçu du document</span>
            {selectedDoc && <Tag color="blue">{selectedDoc.documentNumber}</Tag>}
          </Space>
        }
        open={previewModalVisible}
        onCancel={() => {
          setPreviewModalVisible(false);
          setPreviewData(null);
        }}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            Fermer
          </Button>,
          <Button 
            key="download" 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={() => selectedDoc && handleDownload(selectedDoc)}
          >
            Télécharger
          </Button>
        ]}
        width={800}
      >
        <Spin spinning={previewLoading}>
          {previewData ? (
            <div className="space-y-4">
              {/* Informations générales */}
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Type">
                  {getTypeIcon(previewData.type)} {previewData.type}
                </Descriptions.Item>
                <Descriptions.Item label="Statut">
                  {getStatusTag(previewData.status)}
                </Descriptions.Item>
                <Descriptions.Item label="Numéro">
                  {previewData.documentNumber || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Langue">
                  {getLanguageFlag(previewData.language)}
                </Descriptions.Item>
                <Descriptions.Item label="Créé le" span={2}>
                  {new Date(previewData.createdAt).toLocaleString('fr-FR')}
                </Descriptions.Item>
              </Descriptions>

              {/* Template */}
              {previewData.template && (
                <Card size="small" title="Template utilisé">
                  <Text strong>{previewData.template.name}</Text>
                  {previewData.template.sections?.length > 0 && (
                    <div className="mt-2">
                      <Text type="secondary">{previewData.template.sections.length} section(s)</Text>
                    </div>
                  )}
                </Card>
              )}

              {/* Lead */}
              {previewData.lead && (
                <Card size="small" title="Client">
                  <Space direction="vertical" size="small">
                    <Text strong>
                      {previewData.lead.firstName} {previewData.lead.lastName}
                    </Text>
                    <Text type="secondary">{previewData.lead.email}</Text>
                  </Space>
                </Card>
              )}

              {/* Données du formulaire (aperçu) */}
              {previewData.dataSnapshot && (
                <Card size="small" title="Données du document">
                  <div className="max-h-60 overflow-auto">
                    <pre className="text-xs bg-gray-50 p-2 rounded">
                      {JSON.stringify(previewData.dataSnapshot, null, 2)}
                    </pre>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <Empty description="Aucune donnée disponible" />
          )}
        </Spin>
      </Modal>
    </Card>
  );
};

export default DocumentsSection;
