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
  Typography,
  Row,
  Col,
  List,
  Divider,
  Checkbox
} from 'antd';
import { 
  DownloadOutlined, 
  SendOutlined, 
  EyeOutlined,
  DeleteOutlined,
  MoreOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useTranslation } from 'react-i18next';

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

interface TBLSubmission {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  treeName?: string;
}

interface DocumentsSectionProps {
  submissionId?: string;
  leadId?: string;
  treeId?: string;
  onLoadDevis?: (devisId: string) => void;
  onDeleteDevis?: (devisId: string, devisName: string) => void;
}

const DocumentsSection = ({ submissionId, leadId, treeId, onLoadDevis, onDeleteDevis }: DocumentsSectionProps) => {
  const { t } = useTranslation();
  const { api } = useAuthenticatedApi();
  
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [tblSubmissions, setTblSubmissions] = useState<TBLSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<GeneratedDocument | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [selectedDevisIds, setSelectedDevisIds] = useState<Set<string>>(new Set());
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  // Charger les documents
  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (submissionId) params.append('submissionId', submissionId);
      if (leadId) params.append('leadId', leadId);
      
      console.log('📄 [DocumentsSection] Chargement documents:', { submissionId, leadId, params: params.toString() });
      const response = await api.get(`/api/documents/generated?${params.toString()}`);
      console.log('📄 [DocumentsSection] Documents reçus:', response);
      setDocuments(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('❌ [DocumentsSection] Erreur chargement documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  // Charger les devis TBL (submissions)
  const loadTblSubmissions = async () => {
    if (!leadId) return;
    
    try {
      setLoadingSubmissions(true);
      const effectiveTreeId = treeId || 'cmf1mwoz10005gooked1j6orn';
      
      console.log('📄 [DocumentsSection] Chargement devis TBL pour lead:', leadId);
      const allLeadsWithSubmissions = await api.get(`/api/treebranchleaf/submissions/by-leads?treeId=${effectiveTreeId}`);
      
      // Filtrer pour ce lead
      const thisLeadData = allLeadsWithSubmissions?.find((lead: Record<string, unknown>) => lead.id === leadId);
      const submissions = thisLeadData?.submissions || [];
      
      console.log('📄 [DocumentsSection] Devis TBL trouvés:', submissions.length);
      setTblSubmissions(submissions);
    } catch (error) {
      console.error('❌ [DocumentsSection] Erreur chargement devis TBL:', error);
      setTblSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (submissionId || leadId) {
      loadDocuments();
    } else {
      setDocuments([]);
    }
    if (leadId) {
      loadTblSubmissions();
    } else {
      // Pas de lead = pas de devis à afficher
      setTblSubmissions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, leadId, treeId]);

  // Écouter l'événement de génération de document pour rafraîchir la liste
  useEffect(() => {
    const handleDocumentGenerated = () => {
      console.log('📄 [DocumentsSection] Document généré, rafraîchissement de la liste...');
      loadDocuments();
      loadTblSubmissions();
    };

    window.addEventListener('document-generated', handleDocumentGenerated);
    return () => {
      window.removeEventListener('document-generated', handleDocumentGenerated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, leadId, treeId]);

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

  // Aperçu du document - ouvre le PDF dans le navigateur
  const handlePreview = async (doc: GeneratedDocument) => {
    try {
      // Si le document a une URL PDF, l'ouvrir directement dans un nouvel onglet
      if (doc.pdfUrl) {
        window.open(doc.pdfUrl, '_blank');
        return;
      }
      
      // Sinon, essayer de récupérer le PDF via l'API
      setPreviewLoading(true);
      setSelectedDoc(doc);
      
      // Récupérer le PDF en blob et l'ouvrir dans le navigateur
      const response = await api.get(`/api/documents/generated/${doc.id}/pdf`, { responseType: 'blob' });
      
      if (response instanceof Blob) {
        // Créer une URL temporaire pour le blob et l'ouvrir
        const blobUrl = URL.createObjectURL(response);
        window.open(blobUrl, '_blank');
        // Nettoyer l'URL après un délai
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } else {
        // Fallback: ouvrir la modal avec les données
        const previewResponse = await api.get(`/api/documents/generated/${doc.id}/preview`);
        setPreviewData(previewResponse);
        setPreviewModalVisible(true);
      }
    } catch (error) {
      console.error('Erreur aperçu:', error);
      // Fallback: essayer d'ouvrir la modal avec les données JSON
      try {
        const previewResponse = await api.get(`/api/documents/generated/${doc.id}/preview`);
        setPreviewData(previewResponse);
        setPreviewModalVisible(true);
      } catch {
        message.error('Erreur lors du chargement de l\'aperçu');
      }
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
      setSelectedDocIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      loadDocuments();
    } catch {
      message.error('Erreur lors de la suppression');
    }
  };

  // Supprimer plusieurs documents
  const handleBulkDeleteDocs = async () => {
    const count = selectedDocIds.size;
    const confirmed = window.confirm(
      `Supprimer ${count} document${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''} ?\n\nCette action est irréversible.`
    );
    if (!confirmed) return;

    let deleted = 0;
    for (const id of selectedDocIds) {
      try {
        await api.delete(`/api/documents/generated/${id}`);
        deleted++;
      } catch (err) {
        console.error('❌ Erreur suppression document:', id, err);
      }
    }
    setSelectedDocIds(new Set());
    message.success(`${deleted} document${deleted > 1 ? 's' : ''} supprimé${deleted > 1 ? 's' : ''}`);
    loadDocuments();
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

  // Statut TBL submission
  const getTblStatusTag = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      draft: { label: 'Brouillon', color: 'default' },
      'default-draft': { label: 'En cours', color: 'processing' },
      submitted: { label: 'Soumis', color: 'blue' },
      accepted: { label: 'Accepté', color: 'green' },
      rejected: { label: 'Refusé', color: 'red' },
      completed: { label: 'Complété', color: 'success' }
    };
    const config = statusConfig[status] || { label: status, color: 'default' };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  return (
    <Card
      title="📄 Documents"
    >
      {/* Devis enregistrés (TBL Submissions) */}
      <Spin spinning={loadingSubmissions}>
        {tblSubmissions.length > 0 && (
          <>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <Space size={12}>
                <Text strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FolderOpenOutlined />
                  Devis enregistrés ({tblSubmissions.length})
                </Text>
                <Checkbox
                  checked={selectedDevisIds.size === tblSubmissions.length && tblSubmissions.length > 0}
                  indeterminate={selectedDevisIds.size > 0 && selectedDevisIds.size < tblSubmissions.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDevisIds(new Set(tblSubmissions.map(d => d.id)));
                    } else {
                      setSelectedDevisIds(new Set());
                    }
                  }}
                >
                  <span style={{ fontSize: 12 }}>Tout</span>
                </Checkbox>
              </Space>
              {selectedDevisIds.size > 0 && onDeleteDevis && (
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={async () => {
                    const count = selectedDevisIds.size;
                    const confirmed = window.confirm(
                      `Supprimer ${count} devis sélectionné${count > 1 ? 's' : ''} ?\n\nCette action est irréversible.`
                    );
                    if (!confirmed) return;
                    
                    const ids = [...selectedDevisIds];
                    let deleted = 0;
                    for (const id of ids) {
                      try {
                        const devis = tblSubmissions.find(d => d.id === id);
                        await onDeleteDevis(id, devis?.name || 'Devis');
                        deleted++;
                      } catch (err) {
                        console.error('❌ Erreur suppression devis:', id, err);
                      }
                    }
                    setSelectedDevisIds(new Set());
                    message.success(`${deleted} devis supprimé${deleted > 1 ? 's' : ''}`);
                    loadTblSubmissions();
                  }}
                >
                  Supprimer ({selectedDevisIds.size})
                </Button>
              )}
            </div>
            <List
              size="small"
              dataSource={tblSubmissions}
              renderItem={(devis) => (
                <List.Item
                  key={devis.id}
                  actions={[
                    onLoadDevis && (
                      <Button
                        key="load"
                        type="primary"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => onLoadDevis(devis.id)}
                      >
                        Charger
                      </Button>
                    ),
                    onDeleteDevis && (
                      <Button
                        key="delete"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={async () => {
                          const confirmed = window.confirm(
                            `Supprimer le devis "${devis.name || 'Devis'}" ?\n\nCette action est irréversible.`
                          );
                          if (!confirmed) return;
                          try {
                            await onDeleteDevis(devis.id, devis.name || 'Devis');
                            loadTblSubmissions();
                          } catch (err) {
                            console.error('❌ [DocumentsSection] Erreur suppression:', err);
                          }
                        }}
                      />
                    )
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={
                      <Space size={8}>
                        <Checkbox
                          checked={selectedDevisIds.has(devis.id)}
                          onChange={(e) => {
                            setSelectedDevisIds(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(devis.id);
                              else next.delete(devis.id);
                              return next;
                            });
                          }}
                        />
                        <FileTextOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                      </Space>
                    }
                    title={
                      <Space>
                        <span>{devis.name || `Devis ${new Date(devis.createdAt).toLocaleDateString('fr-FR')}`}</span>
                        {getTblStatusTag(devis.status)}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={0}>
                        <span>Créé le {new Date(devis.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                        {devis.treeName && <span style={{ color: '#888' }}>{devis.treeName}</span>}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
            {documents.length > 0 && <Divider />}
          </>
        )}
      </Spin>

      {/* Documents générés (PDFs) */}
      <Spin spinning={loading}>
        {documents.length === 0 && tblSubmissions.length === 0 ? (
          <Empty 
            description="Aucun document"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : documents.length > 0 ? (
          /* Affichage horizontal des documents - Row/Col responsive */
          <>
            <div style={{ marginBottom: 16, marginTop: tblSubmissions.length > 0 ? 8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <Space size={12}>
                <Text strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <DownloadOutlined />
                  Documents générés ({documents.length})
                </Text>
                <Checkbox
                  checked={selectedDocIds.size === documents.length && documents.length > 0}
                  indeterminate={selectedDocIds.size > 0 && selectedDocIds.size < documents.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDocIds(new Set(documents.map(d => d.id)));
                    } else {
                      setSelectedDocIds(new Set());
                    }
                  }}
                >
                  <span style={{ fontSize: 12 }}>Tout</span>
                </Checkbox>
              </Space>
              {selectedDocIds.size > 0 && (
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={handleBulkDeleteDocs}
                >
                  Supprimer ({selectedDocIds.size})
                </Button>
              )}
            </div>
            <Row gutter={[12, 12]}>
            {documents.map(doc => (
              <Col key={doc.id} xs={24} sm={12} md={8} lg={6} xl={4}>
                <Card
                  size="small"
                  className="shadow-sm hover:shadow-md transition-shadow"
                  style={{ height: '100%', position: 'relative', border: selectedDocIds.has(doc.id) ? '2px solid #1890ff' : undefined }}
                >
                  {/* Checkbox */}
                  <div style={{ position: 'absolute', top: 4, left: 4, zIndex: 1 }}>
                    <Checkbox
                      checked={selectedDocIds.has(doc.id)}
                      onChange={(e) => {
                        setSelectedDocIds(prev => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(doc.id);
                          else next.delete(doc.id);
                          return next;
                        });
                      }}
                    />
                  </div>
                  {/* Header compact */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <span style={{ fontSize: 24, marginBottom: 4 }}>{getTypeIcon(doc.type)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <span style={{ fontWeight: 500, fontSize: 12 }}>{doc.template.name.length > 10 ? 'PV' : doc.template.name}</span>
                      {getStatusTag(doc.status)}
                      <span style={{ fontSize: 11, color: '#888' }}>
                        {getLanguageFlag(doc.language)}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                      {doc.documentNumber && (
                        <div>N° {doc.documentNumber}</div>
                      )}
                      <div>{new Date(doc.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</div>
                    </div>
                    {doc.sentAt && (
                      <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
                        Envoyé le {new Date(doc.sentAt).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                    {doc.signedAt && (
                      <div style={{ fontSize: 10, color: '#52c41a' }}>
                        ✓ Signé le {new Date(doc.signedAt).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                    {doc.paidAt && (
                      <div style={{ fontSize: 10, color: '#52c41a' }}>
                        ✓ Payé le {new Date(doc.paidAt).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions compactes */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(doc)}
                    >
                      Télécharger
                    </Button>
                    <Button
                      size="small"
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
                    <Button size="small" icon={<MoreOutlined />} />
                  </Dropdown>
                </div>
              </Card>
              </Col>
            ))}
          </Row>
          </>
        ) : null}
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
                <Descriptions.Item label={t('fields.type')}>
                  {getTypeIcon(previewData.type)} {previewData.type}
                </Descriptions.Item>
                <Descriptions.Item label={t('fields.status')}>
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
                <Card size="small" title={t('fields.client')}>
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
