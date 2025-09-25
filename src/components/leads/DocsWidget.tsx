import React, { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { 
  Card, 
  Button, 
  Form, 
  Modal, 
  Space, 
  message,
  List,
  Input,
  Select,
  Badge
} from 'antd';
import { 
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  EyeOutlined,
  EditOutlined,
  CopyOutlined
} from '@ant-design/icons';

interface Document {
  id: string;
  name: string;
  webViewLink: string;
  lastModified: string;
  shared: boolean;
  wordCount?: number;
  owner: string;
  collaborators: string[];
}

interface DocsWidgetProps {
  leadEmail: string;
  leadName: string;
  leadId: string;
  onDocumentCreated?: (docData: DocumentCreatedData) => void;
}

interface DocumentCreatedData {
  type: 'docs_document';
  leadId: string;
  documentId: string;
  documentName: string;
  timestamp: Date;
}

const DocsWidget: React.FC<DocsWidgetProps> = ({ 
  leadEmail, 
  leadName, 
  leadId,
  onDocumentCreated 
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const api = useAuthenticatedApi();

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await api.api.get(`/docs/list?leadId=${leadId}`);
      setDocuments(response.documents || []);
    } catch (error) {
      console.error('Erreur lors du chargement des documents:', error);
      // Documents simulés pour la démo
      setDocuments([
        {
          id: '1',
          name: `Proposition_${leadName.replace(/\s+/g, '_')}`,
          webViewLink: 'https://docs.google.com/document/d/1/edit',
          lastModified: new Date(Date.now() - 3600000).toISOString(),
          shared: true,
          wordCount: 1250,
          owner: 'moi@monentreprise.be',
          collaborators: [leadEmail]
        },
        {
          id: '2',
          name: 'Notes_Reunion_Commerciale',
          webViewLink: 'https://docs.google.com/document/d/2/edit',
          lastModified: new Date(Date.now() - 86400000).toISOString(),
          shared: false,
          wordCount: 850,
          owner: 'moi@monentreprise.be',
          collaborators: []
        },
        {
          id: '3',
          name: 'Contrat_Prestations',
          webViewLink: 'https://docs.google.com/document/d/3/edit',
          lastModified: new Date(Date.now() - 172800000).toISOString(),
          shared: true,
          wordCount: 2100,
          owner: 'moi@monentreprise.be',
          collaborators: [leadEmail, 'legal@monentreprise.be']
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [leadId, leadName, leadEmail, api.api]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleCreateDocument = async (values: {
    name: string;
    template: string;
    shareImmediately: boolean;
    permission: string;
  }) => {
    try {
      setCreating(true);

      const response = await api.api.post('/docs/create', {
        name: values.name,
        template: values.template,
        leadId,
        leadName,
        leadEmail,
        shareWith: values.shareImmediately ? [{
          email: leadEmail,
          permission: values.permission
        }] : [],
        context: {
          leadId,
          source: 'crm_lead'
        }
      });

      message.success(`Document "${values.name}" créé avec succès`);
      setCreateModalVisible(false);
      form.resetFields();
      
      // Recharger les documents
      await loadDocuments();
      
      // Notifier le parent
      if (onDocumentCreated) {
        onDocumentCreated({
          type: 'docs_document',
          leadId,
          documentId: response.documentId,
          documentName: values.name,
          timestamp: new Date()
        });
      }
      
    } catch (error) {
      console.error('Erreur lors de la création du document:', error);
      message.error('Erreur lors de la création du document');
    } finally {
      setCreating(false);
    }
  };

  const handleShareDocument = async (doc: Document) => {
    try {
      await api.api.post('/docs/share', {
        documentId: doc.id,
        email: leadEmail,
        permission: 'reader',
        context: {
          leadId,
          source: 'crm_lead'
        }
      });

      message.success(`Document partagé avec ${leadName}`);
      await loadDocuments(); // Recharger pour mettre à jour le statut
      
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      message.error('Erreur lors du partage du document');
    }
  };

  const handleDuplicateDocument = async (doc: Document) => {
    try {
      await api.api.post('/docs/duplicate', {
        originalDocumentId: doc.id,
        newName: `Copie_${doc.name}`,
        leadId,
        context: {
          leadId,
          source: 'crm_lead'
        }
      });

      message.success('Document dupliqué avec succès');
      await loadDocuments();
      
    } catch (error) {
      console.error('Erreur lors de la duplication:', error);
      message.error('Erreur lors de la duplication du document');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatWordCount = (count?: number) => {
    if (!count) return '';
    return `${count.toLocaleString()} mots`;
  };

  return (
    <Card 
      title={
        <Space>
          <FileTextOutlined />
          Docs - {leadName}
        </Space>
      }
      extra={
        <Space>
          <Button 
            size="small" 
            icon={<ReloadOutlined />} 
            onClick={loadDocuments}
            loading={loading}
          />
          <Button 
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            Créer
          </Button>
        </Space>
      }
      className="mb-4"
    >
      <div className="mb-3">
        <div className="text-sm text-gray-600">
          Documents liés à ce lead
        </div>
      </div>

      <List
        loading={loading}
        dataSource={documents}
        locale={{ emptyText: 'Aucun document' }}
        renderItem={(doc) => (
          <List.Item
            actions={[
              <Button 
                key="view"
                size="small" 
                icon={<EyeOutlined />}
                onClick={() => window.open(doc.webViewLink, '_blank')}
              >
                Voir
              </Button>,
              <Button 
                key="edit"
                size="small" 
                icon={<EditOutlined />}
                onClick={() => window.open(doc.webViewLink.replace('/view', '/edit'), '_blank')}
              >
                Éditer
              </Button>,
              <Button 
                key="duplicate"
                size="small" 
                icon={<CopyOutlined />}
                onClick={() => handleDuplicateDocument(doc)}
              >
                Dupliquer
              </Button>,
              <Button 
                key="share"
                size="small" 
                icon={<ShareAltOutlined />}
                onClick={() => handleShareDocument(doc)}
                type={doc.shared ? "default" : "primary"}
              >
                {doc.shared ? 'Partagé' : 'Partager'}
              </Button>
            ]}
          >
            <List.Item.Meta
              avatar={<FileTextOutlined className="text-blue-500" />}
              title={
                <Space>
                  <span className="font-medium">{doc.name}</span>
                  {doc.collaborators.length > 0 && (
                    <Badge 
                      count={doc.collaborators.length} 
                      size="small" 
                      style={{ backgroundColor: '#52c41a' }}
                      title={`${doc.collaborators.length} collaborateur(s)`}
                    />
                  )}
                </Space>
              }
              description={
                <div>
                  <div className="text-sm text-gray-600 mb-1">
                    {formatWordCount(doc.wordCount)} • 
                    Modifié le {formatDate(doc.lastModified)}
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    Propriétaire: {doc.owner}
                  </div>
                  {doc.collaborators.length > 0 && (
                    <div className="text-xs text-gray-500">
                      Collaborateurs: {doc.collaborators.join(', ')}
                    </div>
                  )}
                </div>
              }
            />
          </List.Item>
        )}
      />

      {/* Modal de création de document */}
      <Modal
        title={`Nouveau document pour ${leadName}`}
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateDocument}
          initialValues={{
            name: `Document_${leadName.replace(/\s+/g, '_')}`,
            template: 'proposal',
            shareImmediately: true,
            permission: 'reader'
          }}
        >
          <Form.Item
            name="name"
            label="Nom du document"
            rules={[{ required: true, message: 'Veuillez saisir un nom' }]}
          >
            <Input placeholder="ex: Proposition_Commerciale_Client_XYZ" />
          </Form.Item>

          <Form.Item
            name="template"
            label="Modèle"
            rules={[{ required: true, message: 'Veuillez sélectionner un modèle' }]}
          >
            <Select>
              <Select.Option value="proposal">Proposition commerciale</Select.Option>
              <Select.Option value="contract">Contrat de prestation</Select.Option>
              <Select.Option value="meeting_notes">Notes de réunion</Select.Option>
              <Select.Option value="project_brief">Brief de projet</Select.Option>
              <Select.Option value="quotation">Devis détaillé</Select.Option>
              <Select.Option value="follow_up">Suivi commercial</Select.Option>
              <Select.Option value="blank">Document vierge</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="shareImmediately"
            label="Partage immédiat"
          >
            <Select>
              <Select.Option value={true}>Partager avec {leadName}</Select.Option>
              <Select.Option value={false}>Garder privé pour le moment</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="permission"
            label="Permission de partage"
            dependencies={['shareImmediately']}
          >
            <Select disabled={!Form.useWatch('shareImmediately', form)}>
              <Select.Option value="reader">Lecture seule</Select.Option>
              <Select.Option value="commenter">Peut commenter</Select.Option>
              <Select.Option value="writer">Peut modifier</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => setCreateModalVisible(false)}>
                Annuler
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={creating}
                icon={<PlusOutlined />}
              >
                Créer le document
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default DocsWidget;
