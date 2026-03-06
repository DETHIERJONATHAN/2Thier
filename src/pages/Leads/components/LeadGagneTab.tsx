import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, Typography, Upload, Space, Tag, message, Input, Spin, Badge, Tooltip, Select, Divider, Popconfirm } from 'antd';
import { InboxOutlined, CheckCircleFilled, FilePdfOutlined, FileImageOutlined, FileOutlined, LinkOutlined, FileTextOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { useAuth } from '../../../auth/useAuth';
import { useChantiersByLead } from '../../../hooks/useChantiers';
import { renderProductIcon } from '../../../components/TreeBranchLeaf/treebranchleaf-new/components/Parameters/capabilities/ProductFilterPanel';
import type { Chantier, ProductOption } from '../../../types/chantier';

const { Text } = Typography;
const { Dragger } = Upload;

interface GeneratedDoc {
  id: string;
  title?: string;
  documentNumber?: string;
  type: string;
  status: string;
  pdfUrl?: string;
  createdAt: string;
  submissionId?: string;
  templateId?: string;
  dataSnapshot?: any;
  // API renvoie "template" (mappé) ou "DocumentTemplate" (non mappé)
  DocumentTemplate?: { id: string; name: string };
  template?: { id: string; name: string };
  TreeBranchLeafSubmission?: {
    id: string;
    treeId: string;
  };
}

interface LeadGagneTabProps {
  leadId: string;
  organizationId: string;
  leadData?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    assignedToId?: string;
  };
}

/**
 * Onglet "🏆 Gagné" dans la fiche Lead
 * 
 * Flux complet :
 * 1. Affiche les PDFs générés (GeneratedDocument) du lead → le commercial sélectionne le bon devis
 * 2. Upload le document signé → crée un chantier LIÉ au GeneratedDocument + Submission TBL
 * 3. Le GeneratedDocument est marqué comme SIGNED
 * 
 * Chaîne de données : Chantier → GeneratedDocument → TreeBranchLeafSubmission → données TBL complètes
 */
const LeadGagneTab: React.FC<LeadGagneTabProps> = ({ leadId, organizationId: _organizationId, leadData: _leadData }) => {
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  const { userRole, isSuperAdmin } = useAuth();
  const canDelete = isSuperAdmin || userRole === 'admin';

  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [uploadingProduct, setUploadingProduct] = useState<string | null>(null);

  // Nouveaux états pour les GeneratedDocuments
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  // Sélection du devis PDF par produit (clé = productValue ou '__generic__')
  const [selectedDocPerProduct, setSelectedDocPerProduct] = useState<Record<string, string | null>>({});

  const { chantiers, isLoading: _loadingChantiers, refetch: refetchChantiers } = useChantiersByLead(leadId);

  // Charger les GeneratedDocuments du lead
  const loadGeneratedDocs = useCallback(async () => {
    try {
      setLoadingDocs(true);
      const response = await api.get(`/api/documents/generated?leadId=${leadId}`) as any;
      const docs = Array.isArray(response) ? response : (response?.data || response?.documents || []);
      setGeneratedDocs(docs);
    } catch (err) {
      console.error('[LeadGagneTab] Erreur chargement GeneratedDocuments:', err);
      setGeneratedDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [api, leadId]);

  // Charger les options produit depuis les arbres TBL de l'organisation
  const loadProductOptions = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const trees = await api.get('/api/treebranchleaf/trees') as any[];
      
      const allOptions: ProductOption[] = [];
      const seenValues = new Set<string>();

      for (const tree of (trees || [])) {
        try {
          const nodes = await api.get(`/api/treebranchleaf/trees/${tree.id}/nodes`) as any[];
          const sourceNodes = (nodes || []).filter((n: any) =>
            n.hasProduct &&
            n.product_sourceNodeId === n.id &&
            n.product_options &&
            Array.isArray(n.product_options) &&
            n.product_options.length > 0
          );

          for (const node of sourceNodes) {
            for (const opt of node.product_options) {
              if (!seenValues.has(opt.value)) {
                seenValues.add(opt.value);
                allOptions.push({
                  value: opt.value,
                  label: opt.label,
                  icon: opt.icon || undefined,
                  color: opt.color || undefined,
                });
              }
            }
          }
        } catch {
          // Skip trees that can't be loaded
        }
      }

      setProductOptions(allOptions);
    } catch (err) {
      console.error('[LeadGagneTab] Erreur chargement produits:', err);
      setProductOptions([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [api]);

  useEffect(() => {
    loadProductOptions();
    loadGeneratedDocs();
  }, [loadProductOptions, loadGeneratedDocs]);

  // IDs des GeneratedDocuments déjà liés à un chantier
  const linkedDocIds = useMemo(() => {
    return new Set(chantiers.map(c => (c as any).generatedDocumentId).filter(Boolean));
  }, [chantiers]);

  // Documents disponibles (non encore liés)
  const availableDocs = useMemo(() => {
    return generatedDocs.filter(d => !linkedDocIds.has(d.id));
  }, [generatedDocs, linkedDocIds]);

  // Upload de document signé → crée un chantier lié au GeneratedDocument
  const handleUpload = useCallback(async (product: ProductOption, file: File) => {
    setUploadingProduct(product.value);

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('leadId', leadId);
      formData.append('productValue', product.value);
      formData.append('productLabel', product.label);
      if (product.icon) formData.append('productIcon', product.icon);
      if (product.color) formData.append('productColor', product.color);

      // Lier au GeneratedDocument sélectionné pour ce produit
      const selDocId = selectedDocPerProduct[product.value];
      const selDoc = selDocId ? generatedDocs.find(d => d.id === selDocId) : null;
      if (selDocId) {
        formData.append('generatedDocumentId', selDocId);
        if (selDoc?.submissionId) {
          formData.append('submissionId', selDoc.submissionId);
        }
      }

      const response = await api.post('/api/chantiers/from-lead-document', formData) as any;

      if (response?.success) {
        message.success(`🏗️ Chantier "${product.label}" créé${selDocId ? ' et lié au devis' : ''} !`);
        setSelectedDocPerProduct(prev => ({ ...prev, [product.value]: null }));
        refetchChantiers();
        loadGeneratedDocs();
      } else {
        throw new Error(response?.message || 'Erreur inconnue');
      }
    } catch (err) {
      console.error('[LeadGagneTab] Erreur upload:', err);
      message.error('Erreur lors de la création du chantier');
    } finally {
      setUploadingProduct(null);
    }
  }, [api, leadId, selectedDocPerProduct, generatedDocs, refetchChantiers, loadGeneratedDocs]);

  // Vérifier si un produit a déjà un chantier pour ce lead
  const getChantierForProduct = useCallback((productValue: string): Chantier | undefined => {
    return chantiers.find(c => c.productValue === productValue);
  }, [chantiers]);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <FileImageOutlined style={{ color: '#1677ff' }} />;
    return <FileOutlined />;
  };

  // Upload générique (sans produit spécifique)
  const handleGenericUpload = useCallback(async (file: File, customLabel?: string) => {
    setUploadingProduct('__generic__');
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('leadId', leadId);
      formData.append('productValue', 'generic');
      formData.append('productLabel', customLabel || 'Document signé');

      // Lier au GeneratedDocument sélectionné pour cette zone
      const selDocId = selectedDocPerProduct['__generic__'];
      const selDoc = selDocId ? generatedDocs.find(d => d.id === selDocId) : null;
      if (selDocId) {
        formData.append('generatedDocumentId', selDocId);
        if (selDoc?.submissionId) {
          formData.append('submissionId', selDoc.submissionId);
        }
      }

      const response = await api.post('/api/chantiers/from-lead-document', formData) as any;
      if (response?.success) {
        message.success(`🏗️ Chantier créé${selDocId ? ' et lié au devis' : ''} !`);
        setSelectedDocPerProduct(prev => ({ ...prev, '__generic__': null }));
        refetchChantiers();
        loadGeneratedDocs();
      } else {
        throw new Error(response?.message || 'Erreur inconnue');
      }
    } catch (err) {
      console.error('[LeadGagneTab] Erreur upload générique:', err);
      message.error('Erreur lors de la création du chantier');
    } finally {
      setUploadingProduct(null);
    }
  }, [api, leadId, selectedDocPerProduct, generatedDocs, refetchChantiers, loadGeneratedDocs]);

  const [genericLabel, setGenericLabel] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Supprimer un chantier (admin / super_admin uniquement)
  const handleDeleteChantier = useCallback(async (chantierId: string) => {
    setDeletingId(chantierId);
    try {
      const response = await api.delete(`/api/chantiers/${chantierId}`) as any;
      if (response?.success) {
        message.success('Chantier supprimé');
        refetchChantiers();
        loadGeneratedDocs();
      } else {
        throw new Error(response?.message || 'Erreur');
      }
    } catch (err) {
      console.error('[LeadGagneTab] Erreur suppression:', err);
      message.error('Erreur lors de la suppression du chantier');
    } finally {
      setDeletingId(null);
    }
  }, [api, refetchChantiers, loadGeneratedDocs]);

  const formatDocType = (type: string) => {
    const map: Record<string, string> = {
      QUOTE: 'Devis',
      INVOICE: 'Facture',
      ORDER: 'Bon de commande',
      CONTRACT: 'Contrat',
      PRESENTATION: 'Présentation',
    };
    return map[type] || type;
  };

  const formatDocStatus = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      DRAFT: { label: 'Brouillon', color: 'default' },
      SENT: { label: 'Envoyé', color: 'blue' },
      VIEWED: { label: 'Vu', color: 'cyan' },
      SIGNED: { label: 'Signé', color: 'green' },
      PAID: { label: 'Payé', color: 'gold' },
      CANCELLED: { label: 'Annulé', color: 'red' },
    };
    return map[status] || { label: status, color: 'default' };
  };

  // Helper : rendu du Select de liaison devis PDF (réutilisé dans chaque carte produit)
  const renderDocSelect = (productKey: string) => {
    if (loadingDocs) return <Spin size="small"><div /></Spin>;
    if (generatedDocs.length === 0) return null;

    const currentDocId = selectedDocPerProduct[productKey];
    const currentDoc = currentDocId ? generatedDocs.find(d => d.id === currentDocId) : null;

    return (
      <div style={{ marginBottom: 4 }}>
        <Select
          placeholder="🔗 Lier à un devis PDF généré..."
          style={{ width: '100%' }}
          size="small"
          allowClear
          value={currentDocId || undefined}
          onChange={(value: string | undefined) => setSelectedDocPerProduct(prev => ({ ...prev, [productKey]: value || null }))}
          optionLabelProp="label"
        >
          {availableDocs.map(doc => {
            const statusInfo = formatDocStatus(doc.status);
            return (
              <Select.Option
                key={doc.id}
                value={doc.id}
                label={`${doc.documentNumber || ''} ${doc.title || doc.template?.name || doc.DocumentTemplate?.name || formatDocType(doc.type)}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileTextOutlined style={{ color: '#722ed1' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 12 }}>
                      {doc.documentNumber && <span style={{ color: '#722ed1', marginRight: 4 }}>{doc.documentNumber}</span>}
                      {doc.title || doc.template?.name || doc.DocumentTemplate?.name || formatDocType(doc.type)}
                    </div>
                    <div style={{ fontSize: 10, color: '#8c8c8c' }}>
                      {new Date(doc.createdAt).toLocaleDateString('fr-BE')}
                      {doc.submissionId && <span style={{ marginLeft: 6 }}>🔗 TBL</span>}
                    </div>
                  </div>
                  <Tag color={statusInfo.color} style={{ margin: 0, fontSize: 10 }}>{statusInfo.label}</Tag>
                </div>
              </Select.Option>
            );
          })}
        </Select>
        {currentDoc && (
          <div style={{ marginTop: 4, fontSize: 11, color: '#52c41a' }}>
            <LinkOutlined style={{ marginRight: 4 }} />
            Lié à : <strong>{currentDoc.documentNumber || currentDoc.title || formatDocType(currentDoc.type)}</strong>
            {currentDoc.submissionId && <Tag color="purple" style={{ marginLeft: 4, fontSize: 10 }}>TBL</Tag>}
          </div>
        )}
      </div>
    );
  };

  if (loadingProducts && loadingDocs) {
    return (
      <Card>
        <div className="flex justify-center items-center py-12">
          <Spin tip="Chargement..."><div /></Spin>
        </div>
      </Card>
    );
  }

  return (
    <Card title={<Space><span>🏆</span><span>Documents signés — Chantiers</span></Space>}>
      
      {/* ═══ Upload générique (sans produit spécifique) ═══ */}
      <Card
        size="small"
        style={{ borderColor: '#1677ff', borderStyle: 'dashed', marginBottom: 16, background: '#f0f5ff' }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <Text strong style={{ fontSize: 14 }}>
            📄 Charger un document signé
          </Text>
          {renderDocSelect('__generic__')}
          <Input
            placeholder="Libellé du document (ex: Contrat PAC)"
            size="small"
            value={genericLabel}
            onChange={e => setGenericLabel(e.target.value)}
            style={{ maxWidth: 400 }}
          />
          <Dragger
            showUploadList={false}
            beforeUpload={(file) => {
              handleGenericUpload(file as unknown as File, genericLabel || undefined);
              return false;
            }}
            disabled={uploadingProduct === '__generic__'}
            style={{ padding: '12px 0' }}
          >
            {uploadingProduct === '__generic__' ? (
              <Spin tip="Création du chantier..."><div /></Spin>
            ) : (
              <>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ color: selectedDocPerProduct['__generic__'] ? '#52c41a' : '#1677ff' }} />
                </p>
                <p className="ant-upload-text" style={{ fontSize: 13 }}>
                  {selectedDocPerProduct['__generic__']
                    ? '🔗 Déposez le document signé — il sera lié au devis sélectionné'
                    : 'Déposez le document signé ici ou cliquez pour parcourir'
                  }
                </p>
                <p className="ant-upload-hint" style={{ fontSize: 11 }}>
                  PDF, image ou document — max 50 MB
                </p>
              </>
            )}
          </Dragger>
        </Space>
      </Card>

      <Divider style={{ margin: '12px 0' }} />

      {/* ═══ Chantiers déjà créés ═══ */}
      {chantiers.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            🏗️ Chantiers liés ({chantiers.length})
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {chantiers.map(c => {
              const ch = c as any;
              // Priorité : le GeneratedDocument inclus dans la réponse (contient pdfUrl), sinon fallback sur generatedDocs
              const linkedDoc = ch.GeneratedDocument 
                || (ch.generatedDocumentId ? generatedDocs.find(d => d.id === ch.generatedDocumentId) : null);
              
              return (
                <div 
                  key={c.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    padding: '6px 10px',
                    borderRadius: 6,
                    background: linkedDoc ? '#f6ffed' : '#fafafa',
                    border: `1px solid ${linkedDoc ? '#b7eb8f' : '#f0f0f0'}`,
                  }}
                >
                  {c.productIcon && <span>{renderProductIcon(c.productIcon, 16)}</span>}
                  <Text strong style={{ fontSize: 13 }}>{c.productLabel}</Text>
                  
                  {c.ChantierStatus && (
                    <Tag color={c.ChantierStatus.color} style={{ margin: 0, fontSize: 11 }}>
                      {c.ChantierStatus.name}
                    </Tag>
                  )}

                  {linkedDoc && (
                    <Tooltip title={`Ouvrir le devis ${linkedDoc.documentNumber || linkedDoc.title || ''}`}>
                      <Tag 
                        color="purple" 
                        style={{ margin: 0, fontSize: 11, cursor: linkedDoc.pdfUrl ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (linkedDoc.pdfUrl) {
                            window.open(linkedDoc.pdfUrl, '_blank');
                          } else {
                            message.info('Aucun fichier PDF disponible pour ce devis');
                          }
                        }}
                      >
                        <LinkOutlined style={{ marginRight: 2 }} />
                        {linkedDoc.documentNumber || 'Devis TBL'}
                      </Tag>
                    </Tooltip>
                  )}

                  {c.documentName && (
                    <Tooltip title={`Ouvrir ${c.documentName}`}>
                      <span 
                        style={{ fontSize: 11, color: c.documentUrl ? '#1677ff' : '#8c8c8c', cursor: c.documentUrl ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (c.documentUrl) {
                            window.open(c.documentUrl, '_blank');
                          }
                        }}
                      >
                        {getFileIcon(c.documentName)} {c.documentName.length > 25 ? c.documentName.slice(0, 25) + '...' : c.documentName}
                      </span>
                    </Tooltip>
                  )}

                  {c.amount && (
                    <Text style={{ fontSize: 12, marginLeft: 'auto' }}>
                      {c.amount.toLocaleString('fr-BE')} €
                    </Text>
                  )}

                  {canDelete && (
                    <Popconfirm
                      title="Supprimer ce chantier ?"
                      description="Cette action est irréversible."
                      onConfirm={() => handleDeleteChantier(c.id)}
                      okText="Supprimer"
                      cancelText="Annuler"
                      okButtonProps={{ danger: true }}
                    >
                      <Tooltip title="Supprimer">
                        <DeleteOutlined 
                          style={{ 
                            color: '#ff4d4f', 
                            cursor: 'pointer', 
                            fontSize: 13,
                            marginLeft: c.amount ? 8 : 'auto',
                            opacity: deletingId === c.id ? 0.3 : 1,
                          }} 
                        />
                      </Tooltip>
                    </Popconfirm>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Produits configurés ═══ */}
      {productOptions.length > 0 && (
        <>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            Par produit :
          </Text>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {productOptions.map(product => {
          const existingChantier = getChantierForProduct(product.value);
          const isUploading = uploadingProduct === product.value;
          const hasChantier = !!existingChantier;

          return (
            <Card
              key={product.value}
              size="small"
              style={{
                borderColor: hasChantier ? '#52c41a' : (product.color || '#d9d9d9'),
                borderWidth: hasChantier ? 2 : 1,
                backgroundColor: hasChantier ? '#f6ffed' : undefined,
              }}
              title={
                <Space>
                  {product.icon && <span style={{ fontSize: 18 }}>{renderProductIcon(product.icon, 18)}</span>}
                  <Text strong style={{ color: product.color || undefined }}>
                    {product.label}
                  </Text>
                  {hasChantier && (
                    <Badge
                      count={<CheckCircleFilled style={{ color: '#52c41a' }} />}
                    />
                  )}
                </Space>
              }
              extra={
                hasChantier && existingChantier?.ChantierStatus ? (
                  <Tag color={existingChantier.ChantierStatus.color}>
                    {existingChantier.ChantierStatus.name}
                  </Tag>
                ) : null
              }
            >
              {hasChantier ? (
                <div>
                  <Space direction="vertical" style={{ width: '100%' }} size={4}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ✅ Document signé le {existingChantier?.signedAt
                        ? new Date(existingChantier.signedAt).toLocaleDateString('fr-BE')
                        : 'N/A'}
                    </Text>
                    {existingChantier?.documentName && (
                      <Space size={4}>
                        {getFileIcon(existingChantier.documentName)}
                        <Text style={{ fontSize: 12 }}>{existingChantier.documentName}</Text>
                      </Space>
                    )}
                    {existingChantier?.amount && (
                      <Text style={{ fontSize: 12 }}>
                        💰 Montant : {existingChantier.amount.toLocaleString('fr-BE')} €
                      </Text>
                    )}
                    {(existingChantier as any)?.generatedDocumentId && (
                      <Tag color="purple" style={{ fontSize: 11 }}>
                        <LinkOutlined style={{ marginRight: 2 }} />
                        Lié au devis TBL
                      </Tag>
                    )}
                    {renderDocSelect(product.value)}
                    <Tooltip title="Vous pouvez uploader un autre document pour créer un chantier additionnel">
                      <Dragger
                        showUploadList={false}
                        beforeUpload={(file) => {
                          handleUpload(product, file as unknown as File);
                          return false;
                        }}
                        disabled={isUploading}
                        style={{ marginTop: 8, padding: '4px 0' }}
                      >
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          + Ajouter un autre document signé
                        </Text>
                      </Dragger>
                    </Tooltip>
                  </Space>
                </div>
              ) : (
                <div>
                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    {renderDocSelect(product.value)}
                    <Dragger
                      showUploadList={false}
                      beforeUpload={(file) => {
                        handleUpload(product, file as unknown as File);
                        return false;
                      }}
                      disabled={isUploading}
                      style={{ padding: '12px 0' }}
                    >
                      {isUploading ? (
                        <Spin tip="Création du chantier..."><div /></Spin>
                      ) : (
                        <>
                          <p className="ant-upload-drag-icon">
                            <InboxOutlined style={{ color: selectedDocPerProduct[product.value] ? '#52c41a' : (product.color || '#1677ff') }} />
                          </p>
                          <p className="ant-upload-text" style={{ fontSize: 13 }}>
                            {selectedDocPerProduct[product.value]
                              ? '🔗 Déposez le document signé — lié au devis sélectionné'
                              : 'Déposez le document signé ici'
                            }
                          </p>
                          <p className="ant-upload-hint" style={{ fontSize: 11 }}>
                            PDF, image ou document — max 50 MB
                          </p>
                        </>
                      )}
                    </Dragger>
                  </Space>
                </div>
              )}
            </Card>
          );
        })}
      </div>

        </>
      )}
    </Card>
  );
};

export default LeadGagneTab;
