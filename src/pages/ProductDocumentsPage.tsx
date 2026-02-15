/**
 * ============================================================
 *  PAGE UNIFIÉE: Fiches Techniques Produits
 * ============================================================
 *
 *  Page de gestion des documents liés aux produits (panneaux,
 *  onduleurs, etc.). Fonctionne de manière transparente pour
 *  les utilisateurs Google (Drive) et Yandex (stockage CRM).
 *
 *  Pattern identique à UnifiedMailPage :
 *  - Détection automatique du provider
 *  - Même UI pour tous les utilisateurs
 *  - Upload → Google Drive ou stockage local selon le provider
 * ============================================================
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Card, Typography, Button, Table, Upload, Modal, Input, Select,
  Tag, Space, Tooltip, Empty, Spin, message, Popconfirm,
  Row, Col, Statistic,
  Segmented
} from 'antd';
import {
  UploadOutlined, DeleteOutlined, DownloadOutlined,
  FileOutlined, FilePdfOutlined, FileImageOutlined,
  FolderOutlined, PlusOutlined,
  CloudOutlined, HddOutlined, LinkOutlined,
  EyeOutlined, ReloadOutlined,
  AppstoreOutlined, UnorderedListOutlined,
  FileTextOutlined, SafetyCertificateOutlined,
  BookOutlined, ToolOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useStorageProvider } from '../hooks/useStorageProvider';
import {
  useProductDocuments,
  ProductDocument,
  DOCUMENT_CATEGORIES,
  DocumentCategory
} from '../hooks/useProductDocuments';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

// ─── Helpers ────────────────────────────────────────────────

function getFileIcon(mimeType: string) {
  if (mimeType?.includes('pdf')) return <FilePdfOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />;
  if (mimeType?.includes('image')) return <FileImageOutlined style={{ fontSize: 24, color: '#1890ff' }} />;
  if (mimeType?.includes('word') || mimeType?.includes('document')) return <FileTextOutlined style={{ fontSize: 24, color: '#2f54eb' }} />;
  return <FileOutlined style={{ fontSize: 24, color: '#8c8c8c' }} />;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'fiche_technique': return <FileTextOutlined />;
    case 'certification': return <SafetyCertificateOutlined />;
    case 'garantie': return <BookOutlined />;
    case 'notice': return <ToolOutlined />;
    default: return <FileOutlined />;
  }
}

function getCategoryColor(category: string) {
  switch (category) {
    case 'fiche_technique': return 'blue';
    case 'certification': return 'green';
    case 'garantie': return 'gold';
    case 'notice': return 'purple';
    default: return 'default';
  }
}

function getCategoryLabel(category: string): string {
  const found = DOCUMENT_CATEGORIES.find(c => c.key === category);
  return found ? found.label : category;
}

// ─── Composant Principal ────────────────────────────────────

const ProductDocumentsPage: React.FC = () => {
  const { provider, isLoading: providerLoading } = useStorageProvider();
  const productDocs = useProductDocuments();
  const productDocsRef = useRef(productDocs);
  productDocsRef.current = productDocs;

  // État principal
  const [documents, setDocuments] = useState<ProductDocument[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Modales
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [urlModalVisible, setUrlModalVisible] = useState(false);

  // Upload form
  const [uploadNodeIds, setUploadNodeIds] = useState<string[]>([]);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('fiche_technique');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // URL form
  const [urlNodeIds, setUrlNodeIds] = useState<string[]>([]);
  const [urlName, setUrlName] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [urlCategory, setUrlCategory] = useState<DocumentCategory>('fiche_technique');

  // Sélection Field → Options (partagé entre les deux modales)
  const [availableFields, setAvailableFields] = useState<{ id: string; label: string }[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>();
  const [fieldOptions, setFieldOptions] = useState<{ id: string; label: string }[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [fieldSource, setFieldSource] = useState<'children' | 'lookup' | 'none'>('none');
  const [parentNodeId, setParentNodeId] = useState<string | undefined>();

  const { api } = useAuthenticatedApi();
  const apiRef = useRef(api);
  apiRef.current = api;

  // ─── Chargement des documents ─────────────────────────

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (categoryFilter) params.set('category', categoryFilter);
      params.set('page', String(page));
      params.set('limit', '20');

      const response = await apiRef.current.get(`/api/product-documents/search?${params.toString()}`);
      const data = response?.data || response;
      setDocuments(data?.documents || []);
      setTotalDocs(data?.pagination?.total || 0);
    } catch (err) {
      console.error('Erreur chargement documents:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, page]);

  useEffect(() => {
    if (!providerLoading) {
      loadDocuments();
    }
  }, [loadDocuments, providerLoading]);

  // ─── Chargement des champs advanced_select ─────────────

  const loadFields = useCallback(async () => {
    setFieldsLoading(true);
    try {
      const response = await apiRef.current.get('/api/product-documents/fields');
      const data = response?.data || response;
      setAvailableFields(data?.fields || []);
    } catch {
      setAvailableFields([]);
    } finally {
      setFieldsLoading(false);
    }
  }, []);

  // Charger les champs au montage
  useEffect(() => {
    loadFields();
  }, [loadFields]);

  // ─── Charger les options d'un champ ─────────────────────

  const loadFieldOptions = useCallback(async (fieldId: string) => {
    setOptionsLoading(true);
    setFieldOptions([]);
    setFieldSource('none');
    setParentNodeId(undefined);
    try {
      const response = await apiRef.current.get(`/api/product-documents/fields/${fieldId}/options`);
      const data = response?.data || response;
      setFieldOptions(data?.options || []);
      setFieldSource(data?.source || 'none');
      setParentNodeId(data?.parentNodeId || undefined);
    } catch {
      setFieldOptions([]);
      setFieldSource('none');
      setParentNodeId(undefined);
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  // ─── Upload de fichier ────────────────────────────────

  const handleUpload = useCallback(async () => {
    if (!uploadFile || uploadNodeIds.length === 0) {
      message.warning('Veuillez sélectionner un fichier et au moins un produit');
      return;
    }

    setUploading(true);
    try {
      const result = await productDocsRef.current.uploadDocument(
        uploadFile,
        fieldSource === 'lookup' ? [] : uploadNodeIds,
        uploadName || undefined,
        uploadCategory,
        fieldSource === 'lookup' ? uploadNodeIds : undefined,
        fieldSource === 'lookup' ? parentNodeId : undefined
      );

      if (result) {
        message.success(`Document "${result.name}" uploadé avec succès pour ${uploadNodeIds.length} produit(s)`);
        setUploadModalVisible(false);
        resetUploadForm();
        loadDocuments();
      } else {
        message.error('Erreur lors de l\'upload');
      }
    } catch (err: any) {
      message.error(err.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  }, [uploadFile, uploadNodeIds, uploadName, uploadCategory, fieldSource, parentNodeId, loadDocuments]);

  // ─── Upload via URL ───────────────────────────────────

  const handleUrlUpload = useCallback(async () => {
    if (!urlValue || urlNodeIds.length === 0) {
      message.warning('Veuillez remplir l\'URL et sélectionner au moins un produit');
      return;
    }

    setUploading(true);
    try {
      const result = await productDocsRef.current.uploadDocumentUrl(
        fieldSource === 'lookup' ? [] : urlNodeIds,
        urlValue,
        urlName || undefined,
        urlCategory,
        fieldSource === 'lookup' ? urlNodeIds : undefined,
        fieldSource === 'lookup' ? parentNodeId : undefined
      );

      if (result) {
        message.success(`Document "${result.name}" lié avec succès à ${urlNodeIds.length} produit(s)`);
        setUrlModalVisible(false);
        resetUrlForm();
        loadDocuments();
      }
    } catch (err: any) {
      message.error(err.message || 'Erreur');
    } finally {
      setUploading(false);
    }
  }, [urlValue, urlNodeIds, urlName, urlCategory, fieldSource, parentNodeId, loadDocuments]);

  // ─── Suppression ──────────────────────────────────────

  const handleDelete = useCallback(async (doc: ProductDocument) => {
    const success = await productDocsRef.current.deleteDocument(doc.id);
    if (success) {
      message.success(`Document "${doc.name}" supprimé`);
      loadDocuments();
    } else {
      message.error('Erreur lors de la suppression');
    }
  }, [loadDocuments]);

  // ─── Téléchargement ───────────────────────────────────

  const handleDownload = useCallback(async (doc: ProductDocument) => {
    const url = await productDocsRef.current.getDownloadUrl(doc.id);
    if (url) {
      window.open(url, '_blank');
    } else {
      message.error('Impossible de récupérer le lien de téléchargement');
    }
  }, []);

  // ─── Reset des formulaires ────────────────────────────

  const resetUploadForm = () => {
    setUploadNodeIds([]);
    setUploadName('');
    setUploadCategory('fiche_technique');
    setUploadFile(null);
    setSelectedFieldId(undefined);
    setFieldOptions([]);
    setFieldSource('none');
    setParentNodeId(undefined);
  };

  const resetUrlForm = () => {
    setUrlNodeIds([]);
    setUrlName('');
    setUrlValue('');
    setUrlCategory('fiche_technique');
    setSelectedFieldId(undefined);
    setFieldOptions([]);
    setFieldSource('none');
    setParentNodeId(undefined);
  };

  // ─── Colonnes du tableau ──────────────────────────────

  const columns = useMemo(() => [
    {
      title: '',
      dataIndex: 'mimeType',
      key: 'icon',
      width: 50,
      render: (mimeType: string) => getFileIcon(mimeType)
    },
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (name: string, record: ProductDocument) => (
        <div>
          <Text strong className="block">{name}</Text>
          <Text type="secondary" className="text-xs">{record.fileName}</Text>
        </div>
      )
    },
    {
      title: 'Produit associé',
      key: 'node',
      width: 200,
      render: (_: any, record: ProductDocument) => (
        record.node ? (
          <Tag icon={<FolderOutlined />} color="blue">
            {record.node.label}
          </Tag>
        ) : <Text type="secondary">—</Text>
      )
    },
    {
      title: 'Catégorie',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (category: string) => (
        <Tag icon={getCategoryIcon(category)} color={getCategoryColor(category)}>
          {getCategoryLabel(category)}
        </Tag>
      )
    },
    {
      title: 'Stockage',
      dataIndex: 'storageType',
      key: 'storageType',
      width: 120,
      render: (type: string) => (
        type === 'GOOGLE_DRIVE' ? (
          <Tag icon={<CloudOutlined />} color="cyan">Drive</Tag>
        ) : (
          <Tag icon={<HddOutlined />} color="default">CRM Local</Tag>
        )
      )
    },
    {
      title: 'Taille',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 80,
      render: (size: number | null) => <Text type="secondary">{formatFileSize(size)}</Text>
    },
    {
      title: 'Ajouté par',
      key: 'uploadedBy',
      width: 140,
      render: (_: any, record: ProductDocument) => (
        record.uploadedBy ? (
          <Text type="secondary" className="text-xs">
            {record.uploadedBy.firstName} {record.uploadedBy.lastName}
          </Text>
        ) : null
      )
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => (
        <Text type="secondary" className="text-xs">
          {new Date(date).toLocaleDateString('fr-BE')}
        </Text>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      render: (_: any, record: ProductDocument) => (
        <Space>
          <Tooltip title="Voir / Télécharger">
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
            />
          </Tooltip>
          {record.driveUrl && (
            <Tooltip title="Ouvrir dans Drive">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => window.open(record.driveUrl!, '_blank')}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="Supprimer ce document ?"
            description="Cette action est irréversible."
            onConfirm={() => handleDelete(record)}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Supprimer">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ], [handleDownload, handleDelete]);

  // ─── Vue en grille ────────────────────────────────────

  const renderGridView = () => (
    <Row gutter={[16, 16]}>
      {documents.map(doc => (
        <Col key={doc.id} xs={24} sm={12} md={8} lg={6}>
          <Card
            hoverable
            size="small"
            className="h-full"
            actions={[
              <Tooltip key="download" title="Télécharger">
                <DownloadOutlined onClick={() => handleDownload(doc)} />
              </Tooltip>,
              doc.driveUrl ? (
                <Tooltip key="view" title="Ouvrir">
                  <EyeOutlined onClick={() => window.open(doc.driveUrl!, '_blank')} />
                </Tooltip>
              ) : <span key="spacer" />,
              <Popconfirm
                key="del"
                title="Supprimer ?"
                onConfirm={() => handleDelete(doc)}
                okText="Oui"
                cancelText="Non"
              >
                <DeleteOutlined style={{ color: '#ff4d4f' }} />
              </Popconfirm>
            ]}
          >
            <div className="text-center mb-3">
              {getFileIcon(doc.mimeType)}
            </div>
            <Text strong className="block text-center text-sm truncate" title={doc.name}>
              {doc.name}
            </Text>
            <div className="text-center mt-2">
              <Tag color={getCategoryColor(doc.category)} className="text-xs">
                {getCategoryLabel(doc.category)}
              </Tag>
            </div>
            {doc.node && (
              <div className="text-center mt-1">
                <Text type="secondary" className="text-xs">{doc.node.label}</Text>
              </div>
            )}
            <div className="text-center mt-1">
              {doc.storageType === 'GOOGLE_DRIVE' ? (
                <Tag icon={<CloudOutlined />} color="cyan" className="text-xs">Drive</Tag>
              ) : (
                <Tag icon={<HddOutlined />} className="text-xs">Local</Tag>
              )}
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );

  // ─── Sélecteur Champ → Options multiples (partagé) ─────

  const handleFieldChange = useCallback((fieldId: string) => {
    setSelectedFieldId(fieldId);
    setFieldOptions([]);
    setFieldSource('none');
    setParentNodeId(undefined);
    setUploadNodeIds([]);
    setUrlNodeIds([]);
    loadFieldOptions(fieldId);
  }, [loadFieldOptions]);

  const renderFieldAndNodeSelect = (
    nodeIds: string[],
    onNodeIdsChange: (ids: string[]) => void
  ) => (
    <div className="space-y-3">
      {/* Étape 1: Sélection du champ */}
      <div>
        <Text type="secondary" className="text-xs block mb-1">1. Sélectionner le champ</Text>
        <Select
          value={selectedFieldId}
          onChange={handleFieldChange}
          loading={fieldsLoading}
          placeholder="Choisir un champ..."
          style={{ width: '100%' }}
          allowClear
          showSearch
          optionFilterProp="children"
          onClear={() => {
            setSelectedFieldId(undefined);
            setFieldOptions([]);
            onNodeIdsChange([]);
          }}
        >
          {availableFields.map(field => (
            <Option key={field.id} value={field.id}>
              <Space>
                <FolderOutlined />
                {field.label}
              </Space>
            </Option>
          ))}
        </Select>
      </div>

      {/* Étape 2: Sélection des options (multiple) */}
      {selectedFieldId && (
        <div>
          <Text type="secondary" className="text-xs block mb-1">
            2. Sélectionner les options à associer
            {nodeIds.length > 0 && (
              <Tag color="blue" className="ml-2">{nodeIds.length} sélectionné(s)</Tag>
            )}
          </Text>
          {optionsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Spin size="small" />
              <Text type="secondary" className="ml-2">Chargement des options...</Text>
            </div>
          ) : fieldOptions.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Aucune option disponible pour ce champ"
            />
          ) : (
            <Select
              mode="multiple"
              value={nodeIds}
              onChange={onNodeIdsChange}
              placeholder="Sélectionner une ou plusieurs options..."
              style={{ width: '100%' }}
              maxTagCount={5}
              maxTagPlaceholder={(omitted) => `+${omitted.length} autres`}
              allowClear
              optionFilterProp="children"
            >
              {fieldOptions.map(opt => (
                <Option key={opt.id} value={opt.id}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          )}
        </div>
      )}
    </div>
  );

  // ─── Rendu ────────────────────────────────────────────

  if (providerLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" tip="Détection du stockage..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Title level={3} className="!mb-1">
              📋 Fiches Techniques Produits
            </Title>
            <Text type="secondary">
              Gérez les documents associés à vos panneaux, onduleurs et produits.
              {provider === 'google_drive' ? (
                <Tag icon={<CloudOutlined />} color="cyan" className="ml-2">Google Drive</Tag>
              ) : (
                <Tag icon={<HddOutlined />} color="default" className="ml-2">Stockage CRM</Tag>
              )}
            </Text>
          </div>
          <Space>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              Ajouter un document
            </Button>
            <Button
              icon={<LinkOutlined />}
              onClick={() => setUrlModalVisible(true)}
            >
              Lier une URL
            </Button>
          </Space>
        </div>
      </Card>

      {/* Statistiques rapides */}
      <Row gutter={16}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Total documents"
              value={totalDocs}
              prefix={<FileOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Fiches techniques"
              value={documents.filter(d => d.category === 'fiche_technique').length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Certifications"
              value={documents.filter(d => d.category === 'certification').length}
              prefix={<SafetyCertificateOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Stockage"
              value={provider === 'google_drive' ? 'Google Drive' : 'CRM Local'}
              prefix={provider === 'google_drive' ? <CloudOutlined /> : <HddOutlined />}
              valueStyle={{ fontSize: 16 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Barre de recherche et filtres */}
      <Card size="small">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Search
            placeholder="Rechercher un document..."
            allowClear
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onSearch={val => { setSearchQuery(val); setPage(1); }}
            style={{ maxWidth: 300 }}
          />
          <Select
            placeholder="Catégorie"
            allowClear
            value={categoryFilter}
            onChange={val => { setCategoryFilter(val); setPage(1); }}
            style={{ width: 180 }}
          >
            {DOCUMENT_CATEGORIES.map(cat => (
              <Option key={cat.key} value={cat.key}>
                {cat.icon} {cat.label}
              </Option>
            ))}
          </Select>
          <div className="flex-1" />
          <Space>
            <Segmented
              value={viewMode}
              onChange={(val) => setViewMode(val as 'list' | 'grid')}
              options={[
                { value: 'list', icon: <UnorderedListOutlined /> },
                { value: 'grid', icon: <AppstoreOutlined /> }
              ]}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={loadDocuments}
              loading={loading}
            >
              Actualiser
            </Button>
          </Space>
        </div>
      </Card>

      {/* Liste / Grille des documents */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <Spin size="large" tip="Chargement des documents..." />
          </div>
        ) : documents.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="text-center">
                <Text type="secondary" className="block mb-2">
                  Aucun document trouvé
                </Text>
                <Text type="secondary" className="text-xs">
                  Ajoutez des fiches techniques à vos panneaux et onduleurs pour
                  les joindre automatiquement aux devis.
                </Text>
              </div>
            }
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              Ajouter le premier document
            </Button>
          </Empty>
        ) : viewMode === 'list' ? (
          <Table
            dataSource={documents}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={{
              current: page,
              pageSize: 20,
              total: totalDocs,
              onChange: p => setPage(p),
              showSizeChanger: false,
              showTotal: (total) => `${total} document(s)`
            }}
          />
        ) : renderGridView()}
      </Card>

      {/* ─── Modal Upload Fichier ──────────────────────── */}
      <Modal
        title={
          <Space>
            <UploadOutlined />
            <span>Ajouter un document</span>
            {provider === 'google_drive' ? (
              <Tag icon={<CloudOutlined />} color="cyan" className="text-xs">→ Google Drive</Tag>
            ) : (
              <Tag icon={<HddOutlined />} className="text-xs">→ Stockage CRM</Tag>
            )}
          </Space>
        }
        open={uploadModalVisible}
        onCancel={() => { setUploadModalVisible(false); resetUploadForm(); }}
        onOk={handleUpload}
        okText="Uploader"
        cancelText="Annuler"
        confirmLoading={uploading}
        okButtonProps={{ disabled: !uploadFile || uploadNodeIds.length === 0 }}
        width={560}
      >
        <div className="space-y-4 mt-4">
          <div>
            <Text strong className="block mb-1">Produit(s) associé(s) *</Text>
            {renderFieldAndNodeSelect(uploadNodeIds, setUploadNodeIds)}
          </div>

          <div>
            <Text strong className="block mb-1">Fichier *</Text>
            <Upload.Dragger
              maxCount={1}
              beforeUpload={(file) => {
                setUploadFile(file);
                if (!uploadName) setUploadName(file.name.replace(/\.[^/.]+$/, ''));
                return false; // Empêcher l'upload automatique
              }}
              onRemove={() => setUploadFile(null)}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">Cliquez ou glissez un fichier ici</p>
              <p className="ant-upload-hint">PDF, Word, Excel, Image — Max 25 Mo</p>
            </Upload.Dragger>
          </div>

          <div>
            <Text strong className="block mb-1">Nom du document</Text>
            <Input
              value={uploadName}
              onChange={e => setUploadName(e.target.value)}
              placeholder="Ex: Fiche technique JA Solar 425W"
            />
          </div>

          <div>
            <Text strong className="block mb-1">Catégorie</Text>
            <Select
              value={uploadCategory}
              onChange={setUploadCategory}
              style={{ width: '100%' }}
            >
              {DOCUMENT_CATEGORIES.map(cat => (
                <Option key={cat.key} value={cat.key}>
                  {cat.icon} {cat.label}
                </Option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>

      {/* ─── Modal Lier URL ────────────────────────────── */}
      <Modal
        title={
          <Space>
            <LinkOutlined />
            <span>Lier un document via URL</span>
          </Space>
        }
        open={urlModalVisible}
        onCancel={() => { setUrlModalVisible(false); resetUrlForm(); }}
        onOk={handleUrlUpload}
        okText="Lier"
        cancelText="Annuler"
        confirmLoading={uploading}
        okButtonProps={{ disabled: !urlValue || urlNodeIds.length === 0 }}
        width={560}
      >
        <div className="space-y-4 mt-4">
          <div>
            <Text strong className="block mb-1">Produit(s) associé(s) *</Text>
            {renderFieldAndNodeSelect(urlNodeIds, setUrlNodeIds)}
          </div>

          <div>
            <Text strong className="block mb-1">URL du document *</Text>
            <Input
              value={urlValue}
              onChange={e => setUrlValue(e.target.value)}
              placeholder="https://example.com/fiche-technique.pdf"
              prefix={<LinkOutlined />}
            />
          </div>

          <div>
            <Text strong className="block mb-1">Nom du document</Text>
            <Input
              value={urlName}
              onChange={e => setUrlName(e.target.value)}
              placeholder="Ex: Fiche technique fabricant"
            />
          </div>

          <div>
            <Text strong className="block mb-1">Catégorie</Text>
            <Select
              value={urlCategory}
              onChange={setUrlCategory}
              style={{ width: '100%' }}
            >
              {DOCUMENT_CATEGORIES.map(cat => (
                <Option key={cat.key} value={cat.key}>
                  {cat.icon} {cat.label}
                </Option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductDocumentsPage;
