/**
 * ============================================================
 *  COMPOSANT: DevisProductDocuments
 * ============================================================
 *
 *  Widget intégré dans le DevisPage qui affiche automatiquement
 *  les fiches techniques associées aux panneaux/onduleurs
 *  sélectionnés dans le devis.
 *
 *  - Détecte les nodeIds des sélections advanced_select
 *  - Charge les documents associés
 *  - Permet de les joindre au devis ou de les télécharger
 *
 *  Usage :
 *    <DevisProductDocuments
 *      selectedNodeIds={['node-id-1', 'node-id-2']}
 *      onAttach={(docs) => handleAttachToDevis(docs)}
 *    />
 * ============================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, List, Tag, Button, Space, Typography, Spin,
  Tooltip, Checkbox, Badge, Collapse, message
} from 'antd';
import {
  FileOutlined, FilePdfOutlined, FileImageOutlined,
  DownloadOutlined, PaperClipOutlined, CloudOutlined,
  HddOutlined, FolderOutlined, CheckOutlined,
  FileTextOutlined, SafetyCertificateOutlined,
  BookOutlined, ToolOutlined
} from '@ant-design/icons';
import { useProductDocuments, ProductDocument, DOCUMENT_CATEGORIES } from '../../hooks/useProductDocuments';

const { Text, Title } = Typography;
const { Panel } = Collapse;

interface DevisProductDocumentsProps {
  /** Liste des nodeIds sélectionnés dans le devis (panneaux, onduleurs, etc.) */
  selectedNodeIds: string[];
  /** Callback quand l'utilisateur veut joindre des documents au devis */
  onAttach?: (documents: ProductDocument[]) => void;
  /** Documents déjà joints au devis (pour les marquer visuellement) */
  attachedDocumentIds?: string[];
  /** Mode compact pour sidebar ou mode étendu pour section dédiée */
  compact?: boolean;
}

function getFileIcon(mimeType: string, size = 16) {
  if (mimeType?.includes('pdf')) return <FilePdfOutlined style={{ fontSize: size, color: '#ff4d4f' }} />;
  if (mimeType?.includes('image')) return <FileImageOutlined style={{ fontSize: size, color: '#1890ff' }} />;
  return <FileOutlined style={{ fontSize: size, color: '#8c8c8c' }} />;
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

function getCategoryLabel(category: string): string {
  const found = DOCUMENT_CATEGORIES.find(c => c.key === category);
  return found ? found.label : category;
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'fiche_technique': return 'blue';
    case 'certification': return 'green';
    case 'garantie': return 'gold';
    case 'notice': return 'purple';
    default: return 'default';
  }
}

const DevisProductDocuments: React.FC<DevisProductDocumentsProps> = ({
  selectedNodeIds,
  onAttach,
  attachedDocumentIds = [],
  compact = false
}) => {
  const productDocs = useProductDocuments();
  const [grouped, setGrouped] = useState<Record<string, ProductDocument[]>>({});
  const [allDocuments, setAllDocuments] = useState<ProductDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  // Charger les documents quand les nodeIds changent
  useEffect(() => {
    if (!selectedNodeIds || selectedNodeIds.length === 0) {
      setGrouped({});
      setAllDocuments([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const result = await productDocs.getDocumentsForDevis(selectedNodeIds);
        if (!cancelled) {
          setGrouped(result.grouped);
          setAllDocuments(result.documents);
        }
      } catch (err) {
        console.error('[DevisProductDocuments] Erreur:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => { cancelled = true; };
  }, [selectedNodeIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle sélection d'un document
  const toggleDoc = useCallback((docId: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }, []);

  // Sélectionner/désélectionner tous
  const toggleAll = useCallback(() => {
    if (selectedDocs.size === allDocuments.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(allDocuments.map(d => d.id)));
    }
  }, [selectedDocs.size, allDocuments]);

  // Joindre les documents sélectionnés
  const handleAttach = useCallback(() => {
    if (onAttach) {
      const docs = allDocuments.filter(d => selectedDocs.has(d.id));
      onAttach(docs);
      message.success(`${docs.length} document(s) joint(s) au devis`);
      setSelectedDocs(new Set());
    }
  }, [onAttach, allDocuments, selectedDocs]);

  // Télécharger un document
  const handleDownload = useCallback(async (doc: ProductDocument) => {
    const url = await productDocs.getDownloadUrl(doc.id);
    if (url) window.open(url, '_blank');
    else message.error('Impossible de télécharger');
  }, [productDocs]);

  // Pas de nodeIds sélectionnés
  if (!selectedNodeIds || selectedNodeIds.length === 0) {
    return null;
  }

  // Chargement
  if (loading) {
    return (
      <Card size="small" className="mt-3">
        <div className="flex items-center gap-2">
          <Spin size="small" />
          <Text type="secondary">Chargement des fiches techniques...</Text>
        </div>
      </Card>
    );
  }

  // Pas de documents
  if (allDocuments.length === 0) {
    return null; // Ne rien afficher si aucun document associé
  }

  const nodeIds = Object.keys(grouped);

  // ─── Mode compact (sidebar/widget) ────────────────────

  if (compact) {
    return (
      <Card
        size="small"
        className="mt-3"
        title={
          <Space>
            <PaperClipOutlined />
            <Text strong className="text-sm">
              Fiches techniques
              <Badge count={allDocuments.length} className="ml-2" style={{ backgroundColor: '#1890ff' }} />
            </Text>
          </Space>
        }
      >
        <List
          size="small"
          dataSource={allDocuments}
          renderItem={doc => {
            const isAttached = attachedDocumentIds.includes(doc.id);
            return (
              <List.Item
                className={`px-2 rounded ${isAttached ? 'bg-green-50' : ''}`}
                actions={[
                  <Tooltip key="dl" title="Télécharger">
                    <Button
                      type="text"
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(doc)}
                    />
                  </Tooltip>,
                  onAttach && !isAttached ? (
                    <Tooltip key="attach" title="Joindre au devis">
                      <Button
                        type="text"
                        size="small"
                        icon={<PaperClipOutlined />}
                        onClick={() => { onAttach([doc]); }}
                      />
                    </Tooltip>
                  ) : isAttached ? (
                    <Tooltip key="done" title="Déjà joint">
                      <CheckOutlined style={{ color: '#52c41a' }} />
                    </Tooltip>
                  ) : null
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={getFileIcon(doc.mimeType)}
                  title={<Text className="text-xs">{doc.name}</Text>}
                  description={
                    <Space size={4}>
                      <Tag color={getCategoryColor(doc.category)} className="text-xs m-0" style={{ lineHeight: '16px', padding: '0 4px' }}>
                        {getCategoryLabel(doc.category)}
                      </Tag>
                    </Space>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Card>
    );
  }

  // ─── Mode étendu (section dédiée) ─────────────────────

  return (
    <Card
      className="mt-4"
      title={
        <div className="flex items-center justify-between">
          <Space>
            <PaperClipOutlined style={{ fontSize: 18 }} />
            <Title level={5} className="!mb-0">
              Fiches techniques associées
            </Title>
            <Badge count={allDocuments.length} style={{ backgroundColor: '#1890ff' }} />
          </Space>
          {onAttach && selectedDocs.size > 0 && (
            <Button
              type="primary"
              size="small"
              icon={<PaperClipOutlined />}
              onClick={handleAttach}
            >
              Joindre {selectedDocs.size} document(s)
            </Button>
          )}
        </div>
      }
    >
      {onAttach && (
        <div className="mb-3">
          <Checkbox
            indeterminate={selectedDocs.size > 0 && selectedDocs.size < allDocuments.length}
            checked={selectedDocs.size === allDocuments.length && allDocuments.length > 0}
            onChange={toggleAll}
          >
            <Text type="secondary" className="text-xs">
              Tout sélectionner ({allDocuments.length} documents)
            </Text>
          </Checkbox>
        </div>
      )}

      <Collapse
        defaultActiveKey={nodeIds}
        ghost
        className="product-docs-collapse"
      >
        {nodeIds.map(nodeId => {
          const docs = grouped[nodeId] || [];
          const nodeLabel = docs[0]?.node?.label || nodeId;

          return (
            <Panel
              key={nodeId}
              header={
                <Space>
                  <FolderOutlined />
                  <Text strong>{nodeLabel}</Text>
                  <Badge count={docs.length} style={{ backgroundColor: '#1890ff' }} />
                </Space>
              }
            >
              <List
                size="small"
                dataSource={docs}
                renderItem={doc => {
                  const isAttached = attachedDocumentIds.includes(doc.id);
                  const isSelected = selectedDocs.has(doc.id);

                  return (
                    <List.Item
                      className={`px-3 rounded transition-colors ${
                        isAttached ? 'bg-green-50' : isSelected ? 'bg-blue-50' : ''
                      }`}
                      actions={[
                        <Tooltip key="dl" title="Télécharger">
                          <Button
                            type="text"
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownload(doc)}
                          />
                        </Tooltip>,
                        doc.driveUrl ? (
                          <Tooltip key="view" title="Ouvrir dans Drive">
                            <Button
                              type="text"
                              size="small"
                              icon={<CloudOutlined />}
                              onClick={() => window.open(doc.driveUrl!, '_blank')}
                            />
                          </Tooltip>
                        ) : null,
                        isAttached ? (
                          <Tooltip key="done" title="Déjà joint au devis">
                            <CheckOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                          </Tooltip>
                        ) : null
                      ].filter(Boolean)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {onAttach && !isAttached && (
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleDoc(doc.id)}
                          />
                        )}
                        {getFileIcon(doc.mimeType, 20)}
                        <div className="flex-1 min-w-0">
                          <Text strong className="block truncate">{doc.name}</Text>
                          <Space size={4} className="mt-1">
                            <Tag
                              icon={getCategoryIcon(doc.category)}
                              color={getCategoryColor(doc.category)}
                              className="text-xs"
                            >
                              {getCategoryLabel(doc.category)}
                            </Tag>
                            {doc.storageType === 'GOOGLE_DRIVE' ? (
                              <Tag icon={<CloudOutlined />} color="cyan" className="text-xs">Drive</Tag>
                            ) : (
                              <Tag icon={<HddOutlined />} className="text-xs">Local</Tag>
                            )}
                          </Space>
                        </div>
                      </div>
                    </List.Item>
                  );
                }}
              />
            </Panel>
          );
        })}
      </Collapse>
    </Card>
  );
};

export default DevisProductDocuments;
