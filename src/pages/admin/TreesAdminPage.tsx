import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card, Table, Button, Modal, Form, Select, Tag, Space,
  Typography, Spin, Empty, Popconfirm, App, Collapse, Checkbox,
  Tooltip, Divider, Input, Badge, Row, Col,
} from 'antd';
import {
  DeleteOutlined, ShareAltOutlined,
  BranchesOutlined, ApartmentOutlined, EyeOutlined,
  SettingOutlined, CopyOutlined, TeamOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  OrderedListOutlined, AppstoreOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { useTranslation } from 'react-i18next';
import { FB, SF } from '../../components/zhiive/ZhiiveTheme';

const { Text } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

// ── Facebook Design Tokens ──
// ── FBToggle (identique à UsersAdminPageNew) ──
const FBToggle = ({ checked, onChange, disabled, size = 'small' }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; size?: 'small' | 'default';
}) => {
  const w = size === 'small' ? 36 : 44;
  const h = size === 'small' ? 20 : 24;
  const dot = size === 'small' ? 16 : 20;
  return (
    <div
      role="button" tabIndex={0} onClick={() => !disabled && onChange(!checked)}
      style={{
        width: w, height: h, borderRadius: h,
        background: disabled ? '#ccc' : checked ? FB.blue : '#ccc',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1, flexShrink: 0,
      }}
    >
      <div style={{
        width: dot, height: dot, borderRadius: '50%', background: FB.white,
        position: 'absolute', top: (h - dot) / 2,
        left: checked ? w - dot - (h - dot) / 2 : (h - dot) / 2,
        transition: 'left 0.2s', boxShadow: '0 1px 3px ${SF.overlayDark}',
      }} />
    </div>
  );
};

function useScreenSize() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return { isMobile: w < 768, width: w };
}

// ============================================================
// Types
// ============================================================
interface TabNode {
  id: string;
  label: string;
  type: string;
  subType?: string;
  order: number;
  isActive: boolean;
  subtabs?: unknown;
  metadata?: Record<string, unknown>;
  subTabsList?: string[]; // Les sous-onglets sont des noms (strings)
}

interface TreeAccess {
  id: string;
  treeId: string;
  organizationId: string;
  isOwner: boolean;
  active: boolean;
  tabAccessConfig: TabAccessConfig;
  organization: { id: string; name: string; status?: string };
}

interface TabAccessConfigEntry {
  visible: boolean;
  allowedRoles: string[];
  isSequential: boolean;
  sequentialOrder: number;
  subTabs?: Record<string, { visible: boolean; allowedRoles: string[] }>;
}

interface TabAccessConfig {
  tabs?: Record<string, TabAccessConfigEntry>;
  allowedProducts?: string[]; // Produits autorisés pour cette org (vide = tous)
}

interface ProductSource {
  id: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

interface TreeData {
  id: string;
  name: string;
  description?: string;
  category?: string;
  status?: string;
  organizationId: string;
  ownerOrganization?: { id: string; name: string };
  tabs: TabNode[];
  TreeOrganizationAccess: TreeAccess[];
  accessCount?: number;
  _count?: { TreeBranchLeafNode: number };
  productSource?: ProductSource | null;
}

interface Org {
  id: string;
  name: string;
}

interface RoleData {
  id: string;
  name: string;
  label?: string;
  organizationId?: string;
  isGlobal?: boolean;
}

// ============================================================
// Composant principal
// ============================================================
export default function TreesAdminPage() {
  const { t } = useTranslation();
  const { api } = useAuthenticatedApi();
  const { isSuperAdmin } = useAuth();
  const { message: messageApi } = App.useApp();

  const stableApi = useMemo(() => api, []);

  // State
  const [trees, setTrees] = useState<TreeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTree, setSelectedTree] = useState<TreeData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Org[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);

  // Modals
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState<TreeAccess | null>(null);

  // Forms
  const [shareForm] = Form.useForm();
  const [duplicateForm] = Form.useForm();

  // ============================================================
  // Chargement des données
  // ============================================================
  const fetchTrees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await stableApi.get('/api/admin-trees');
      if (res.success !== false) {
        setTrees(Array.isArray(res) ? res : res.data || []);
      }
    } catch (err) {
      console.error('[TreesAdmin] Erreur chargement arbres:', err);
      messageApi.error('Erreur lors du chargement des arbres');
    } finally {
      setLoading(false);
    }
  }, [stableApi, messageApi]);

  const fetchTreeDetail = useCallback(async (treeId: string) => {
    setDetailLoading(true);
    try {
      const res = await stableApi.get(`/api/admin-trees/${treeId}`);
      const data = res.success !== false ? (res.data || res) : null;
      if (data) {
        setSelectedTree(data);
        setOrganizations(data.organizations || []);
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.error('[TreesAdmin] Erreur chargement détail:', err);
      messageApi.error('Erreur lors du chargement du détail');
    } finally {
      setDetailLoading(false);
    }
  }, [stableApi, messageApi]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchTrees();
    }
  }, [isSuperAdmin, fetchTrees]);

  // ============================================================
  // Actions
  // ============================================================
  const handleShareTree = useCallback(async (values: { organizationId: string }) => {
    if (!selectedTree) return;
    try {
      await stableApi.post(`/api/admin-trees/${selectedTree.id}/access`, {
        organizationId: values.organizationId,
        isOwner: false,
        tabAccessConfig: { tabs: {} },
      });
      messageApi.success('Accès accordé avec succès');
      setShareModalOpen(false);
      shareForm.resetFields();
      fetchTreeDetail(selectedTree.id);
      fetchTrees();
    } catch (err) {
      console.error('[TreesAdmin] Erreur partage:', err);
      messageApi.error('Erreur lors du partage');
    }
  }, [selectedTree, stableApi, messageApi, shareForm, fetchTreeDetail, fetchTrees]);

  const handleRemoveAccess = useCallback(async (treeId: string, orgId: string) => {
    try {
      await stableApi.delete(`/api/admin-trees/${treeId}/access/${orgId}`);
      messageApi.success('Accès retiré');
      if (selectedTree) {
        fetchTreeDetail(selectedTree.id);
      }
      fetchTrees();
    } catch (err) {
      console.error('[TreesAdmin] Erreur suppression accès:', err);
      messageApi.error('Erreur lors de la suppression');
    }
  }, [stableApi, messageApi, selectedTree, fetchTreeDetail, fetchTrees]);

  const handleDuplicate = useCallback(async (values: { targetOrganizationId: string; newName: string }) => {
    if (!selectedTree) return;
    try {
      const res = await stableApi.post(`/api/admin-trees/${selectedTree.id}/duplicate`, values);
      const data = res.data || res;
      messageApi.success(`Arbre dupliqué avec succès (${data.nodesCount} nœuds copiés)`);
      setDuplicateModalOpen(false);
      duplicateForm.resetFields();
      fetchTrees();
    } catch (err) {
      console.error('[TreesAdmin] Erreur duplication:', err);
      messageApi.error('Erreur lors de la duplication');
    }
  }, [selectedTree, stableApi, messageApi, duplicateForm, fetchTrees]);

  const handleUpdateTabConfig = useCallback(async (
    treeId: string,
    orgId: string,
    tabAccessConfig: TabAccessConfig,
  ) => {
    try {
      await stableApi.put(`/api/admin-trees/${treeId}/access/${orgId}`, { tabAccessConfig });
      messageApi.success('Configuration des onglets mise à jour');
      if (selectedTree) {
        fetchTreeDetail(selectedTree.id);
      }
    } catch (err) {
      console.error('[TreesAdmin] Erreur update config:', err);
      messageApi.error('Erreur lors de la mise à jour');
    }
  }, [stableApi, messageApi, selectedTree, fetchTreeDetail]);

  // ============================================================
  // Colonnes Table principale
  // ============================================================
  const columns = useMemo(() => [
    {
      title: 'Arbre',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: TreeData) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            <BranchesOutlined style={{ marginRight: 6 }} />
            {name}
          </Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Propriétaire',
      key: 'owner',
      render: (_: unknown, record: TreeData) => (
        <Tag color="blue" icon={<TeamOutlined />}>
          {record.ownerOrganization?.name || 'N/A'}
        </Tag>
      ),
    },
    {
      title: 'Onglets',
      key: 'tabs',
      render: (_: unknown, record: TreeData) => (
        <Badge count={record.tabs?.length || 0} style={{ backgroundColor: '#1890ff' }}>
          <AppstoreOutlined style={{ fontSize: 18 }} />
        </Badge>
      ),
      width: 90,
      align: 'center' as const,
    },
    {
      title: 'Nœuds',
      key: 'nodes',
      render: (_: unknown, record: TreeData) => (
        <Text>{record._count?.TreeBranchLeafNode || 0}</Text>
      ),
      width: 80,
      align: 'center' as const,
    },
    {
      title: 'Accès',
      key: 'access',
      render: (_: unknown, record: TreeData) => {
        const count = record.TreeOrganizationAccess?.length || 0;
        return (
          <Badge count={count} style={{ backgroundColor: count > 0 ? '#52c41a' : '#d9d9d9' }}>
            <ShareAltOutlined style={{ fontSize: 18 }} />
          </Badge>
        );
      },
      width: 80,
      align: 'center' as const,
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'published' ? 'green' : status === 'draft' ? 'orange' : 'default'}>
          {status || 'N/A'}
        </Tag>
      ),
      width: 100,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: TreeData) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => fetchTreeDetail(record.id)}
            title="Gérer les accès"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', background: '#e7f3ff', color: FB.blue, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          ><span>👁️</span><span>Accès</span></button>
          <button
            onClick={() => {
              setSelectedTree(record);
              setDuplicateModalOpen(true);
              if (organizations.length === 0) {
                fetchTreeDetail(record.id);
              }
            }}
            title={t('common.duplicate')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', background: FB.btnGray, color: FB.text, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          ><span>📋</span><span>Dupliquer</span></button>
        </div>
      ),
    },
  ], [fetchTreeDetail, organizations.length]);

  // ============================================================
  // Stats
  // ============================================================
  const stats = useMemo(() => {
    const totalTrees = trees.length;
    const totalAccesses = trees.reduce((sum, t) => sum + (t.TreeOrganizationAccess?.length || 0), 0);
    const sharedTrees = trees.filter(t => (t.TreeOrganizationAccess?.length || 0) > 0).length;
    const uniqueOrgs = new Set(trees.flatMap(t => (t.TreeOrganizationAccess || []).map(a => a.organizationId))).size;
    return { totalTrees, totalAccesses, sharedTrees, uniqueOrgs };
  }, [trees]);

  // ============================================================
  // Guard
  // ============================================================
  const { isMobile } = useScreenSize();

  if (!isSuperAdmin) {
    return (
      <div style={{ background: FB.bg, minHeight: '100vh', padding: 40, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ background: FB.white, borderRadius: FB.radius, padding: 40, boxShadow: FB.shadow, textAlign: 'center' }}>
          <Empty description="Accès réservé au Super Admin" />
        </div>
      </div>
    );
  }

  const statCardStyle: React.CSSProperties = {
    background: FB.white, borderRadius: FB.radius, padding: isMobile ? 14 : 18,
    boxShadow: FB.shadow, flex: '1 1 180px', minWidth: isMobile ? '100%' : 180,
  };
  const statLabel: React.CSSProperties = { fontSize: 12, color: FB.textSecondary, marginBottom: 4 };
  const statValue: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: FB.text };

  // ============================================================
  // Rendu
  // ============================================================
  return (
    <div style={{ background: FB.bg, minHeight: '100vh', width: '100%', padding: isMobile ? '12px 8px' : '20px 24px' }}>
      {/* ── Header ── */}
      <div style={{
        background: FB.white, borderRadius: FB.radius, padding: isMobile ? '14px 16px' : '18px 24px',
        boxShadow: FB.shadow, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <BranchesOutlined style={{ fontSize: isMobile ? 22 : 26, color: FB.blue }} />
          <span style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: FB.text }}>
            Gestion des Arbres
          </span>
        </div>
        <div style={{ color: FB.textSecondary, fontSize: 13 }}>
          Gérez les arbres TBL, assignez-les à des organisations et configurez l'accès aux onglets par rôle.
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={statCardStyle}>
          <div style={statLabel}>Total Arbres</div>
          <div style={statValue}><BranchesOutlined style={{ marginRight: 6 }} />{stats.totalTrees}</div>
        </div>
        <div style={statCardStyle}>
          <div style={statLabel}>Arbres Partagés</div>
          <div style={{ ...statValue, color: FB.green }}><ShareAltOutlined style={{ marginRight: 6 }} />{stats.sharedTrees}</div>
        </div>
        <div style={statCardStyle}>
          <div style={statLabel}>Accès Configurés</div>
          <div style={statValue}><LockOutlined style={{ marginRight: 6 }} />{stats.totalAccesses}</div>
        </div>
        <div style={statCardStyle}>
          <div style={statLabel}>Organisations</div>
          <div style={{ ...statValue, color: FB.blue }}><TeamOutlined style={{ marginRight: 6 }} />{stats.uniqueOrgs}</div>
        </div>
      </div>

      {/* ── Table des arbres ── */}
      <div style={{ background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${FB.border}`, fontWeight: 600, fontSize: 15, color: FB.text }}>
          Arbres disponibles
        </div>
        <div style={{ padding: isMobile ? 8 : 0 }}>
          <Table
            dataSource={trees}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            size="middle"
            onRow={(record) => ({
              style: { cursor: 'pointer' },
              onClick: () => fetchTreeDetail(record.id),
            })}
          />
        </div>
      </div>

      {/* ── Panneau détail de l'arbre sélectionné ── */}
      {selectedTree && (
        <div style={{ background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{
            padding: isMobile ? '12px 14px' : '14px 20px', borderBottom: `1px solid ${FB.border}`,
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <ApartmentOutlined style={{ color: FB.blue }} />
              <span style={{ fontWeight: 600, fontSize: 15, color: FB.text }}>Configuration : {selectedTree.name}</span>
              <Tag color="blue">{selectedTree.ownerOrganization?.name}</Tag>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setShareModalOpen(true)}
                style={{
                  background: FB.blue, color: '#fff', border: 'none', borderRadius: 6,
                  padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <ShareAltOutlined /> Partager
              </button>
              <button
                onClick={() => setDuplicateModalOpen(true)}
                style={{
                  background: FB.btnGray, color: FB.text, border: 'none', borderRadius: 6,
                  padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <CopyOutlined /> Dupliquer
              </button>
            </div>
          </div>

          <Spin spinning={detailLoading}>
            <div style={{ padding: isMobile ? 14 : 20 }}>
              {/* Onglets de l'arbre */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: FB.text, marginBottom: 8 }}>
                  <AppstoreOutlined style={{ marginRight: 6 }} /> Onglets ({selectedTree.tabs?.length || 0})
                </div>
                <Space wrap>
                  {(selectedTree.tabs || []).map((tab, index) => (
                    <Tag
                      key={tab.id}
                      color={tab.isActive !== false ? 'processing' : 'default'}
                      style={{ fontSize: 13, padding: '4px 12px' }}
                    >
                      {index + 1}. {tab.label || 'Sans nom'}
                    </Tag>
                  ))}
                </Space>
              </div>

              {/* Produits disponibles */}
              {selectedTree.productSource && selectedTree.productSource.options.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: FB.text, marginBottom: 8 }}>
                    <AppstoreOutlined style={{ marginRight: 6, color: FB.purple }} /> Produits disponibles ({selectedTree.productSource.options.length})
                  </div>
                  <Space wrap style={{ marginBottom: 8 }}>
                    {selectedTree.productSource.options.map((opt) => (
                      <Tag key={opt.value} color="purple" style={{ fontSize: 13, padding: '4px 12px' }}>
                        {opt.label}
                      </Tag>
                    ))}
                  </Space>
                  <div style={{ fontSize: 12, color: FB.textSecondary }}>
                    Source : champ « {selectedTree.productSource.label} » — Les produits contrôlent la visibilité des champs dans l'arbre
                  </div>
                </div>
              )}

              {/* Accès par organisation */}
              <div style={{ fontWeight: 600, fontSize: 14, color: FB.text, marginBottom: 10 }}>
                <TeamOutlined style={{ marginRight: 6 }} /> Accès par Organisation
              </div>

              {(!selectedTree.TreeOrganizationAccess || selectedTree.TreeOrganizationAccess.length === 0) ? (
                <Empty
                  description="Aucun accès configuré. Cliquez sur 'Partager' pour donner accès à une organisation."
                  style={{ padding: 24 }}
                />
              ) : (
                <Collapse accordion>
                  {selectedTree.TreeOrganizationAccess.map((access) => (
                    <Panel
                      key={access.id}
                      header={
                        <Space>
                          <TeamOutlined />
                          <span style={{ fontWeight: 600 }}>{access.organization?.name || access.organizationId}</span>
                          {access.isOwner && <Tag color="gold">Propriétaire</Tag>}
                          {access.active ? (
                            <Tag color="green" icon={<CheckCircleOutlined />}>Actif</Tag>
                          ) : (
                            <Tag color="red" icon={<CloseCircleOutlined />}>Inactif</Tag>
                          )}
                        </Space>
                      }
                      extra={
                        <div role="button" tabIndex={0} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAccess(access);
                              setConfigModalOpen(true);
                            }}
                            title="Configurer les onglets"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', background: FB.btnGray, color: FB.text, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                          ><span>⚙️</span><span>Onglets</span></button>
                          {!access.isOwner && (
                            <Popconfirm
                              title="Retirer l'accès ?"
                              description={`${access.organization?.name} n'aura plus accès à cet arbre.`}
                              onConfirm={(e) => {
                                e?.stopPropagation();
                                handleRemoveAccess(selectedTree.id, access.organizationId);
                              }}
                              okText={t('common.yes')}
                              cancelText={t('common.no')}
                            >
                              <button
                                onClick={(e) => e.stopPropagation()}
                                title="Retirer l'accès"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', background: '#ffeef0', color: FB.red, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                              ><span>🗑️</span><span>Retirer</span></button>
                            </Popconfirm>
                          )}
                        </div>
                      }
                    >
                      <TabAccessConfigPanel
                        tabs={selectedTree.tabs || []}
                        access={access}
                        roles={roles}
                        productSource={selectedTree.productSource}
                        onSave={(config) =>
                          handleUpdateTabConfig(selectedTree.id, access.organizationId, config)
                        }
                      />
                    </Panel>
                  ))}
                </Collapse>
              )}
            </div>
          </Spin>
        </div>
      )}

      {/* Modal Partager un arbre */}
      <Modal
        title={
          <Space>
            <ShareAltOutlined />
            Partager l'arbre : {selectedTree?.name}
          </Space>
        }
        open={shareModalOpen}
        onCancel={() => {
          setShareModalOpen(false);
          shareForm.resetFields();
        }}
        onOk={() => shareForm.submit()}
        okText="Partager"
        cancelText={t('common.cancel')}
      >
        <Form
          form={shareForm}
          layout="vertical"
          onFinish={handleShareTree}
        >
          <Form.Item
            name="organizationId"
            label="Organisation"
            rules={[{ required: true, message: 'Sélectionnez une organisation' }]}
          >
            <Select
              showSearch
              placeholder="Choisir une organisation"
              optionFilterProp="children"
              loading={detailLoading}
            >
              {organizations
                .filter(org => {
                  // Filtrer les orgs qui ont déjà accès
                  const existingIds = (selectedTree?.TreeOrganizationAccess || []).map(a => a.organizationId);
                  return !existingIds.includes(org.id);
                })
                .map(org => (
                  <Option key={org.id} value={org.id}>{org.name}</Option>
                ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Dupliquer un arbre */}
      <Modal
        title={
          <Space>
            <CopyOutlined />
            Dupliquer l'arbre : {selectedTree?.name}
          </Space>
        }
        open={duplicateModalOpen}
        onCancel={() => {
          setDuplicateModalOpen(false);
          duplicateForm.resetFields();
        }}
        onOk={() => duplicateForm.submit()}
        okText="Dupliquer"
        cancelText={t('common.cancel')}
      >
        <Form
          form={duplicateForm}
          layout="vertical"
          onFinish={handleDuplicate}
          initialValues={{ newName: selectedTree ? `${selectedTree.name} (copie)` : '' }}
        >
          <Form.Item
            name="targetOrganizationId"
            label="Organisation cible"
            rules={[{ required: true, message: 'Sélectionnez une organisation' }]}
          >
            <Select
              showSearch
              placeholder="Organisation destinataire"
              optionFilterProp="children"
              loading={detailLoading}
            >
              {organizations.map(org => (
                <Option key={org.id} value={org.id}>{org.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="newName"
            label="Nom du nouvel arbre"
            rules={[{ required: true, message: 'Saisissez un nom' }]}
          >
            <Input placeholder="Nom de l'arbre dupliqué" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Configuration des onglets */}
      {selectedAccess && selectedTree && (
        <Modal
          title={
            <Space>
              <SettingOutlined />
              Configuration des onglets pour : {selectedAccess.organization?.name}
            </Space>
          }
          open={configModalOpen}
          onCancel={() => {
            setConfigModalOpen(false);
            setSelectedAccess(null);
          }}
          footer={null}
          width={800}
        >
          <TabAccessConfigPanel
            tabs={selectedTree.tabs || []}
            access={selectedAccess}
            roles={roles}
            productSource={selectedTree.productSource}
            onSave={(config) => {
              handleUpdateTabConfig(selectedTree.id, selectedAccess.organizationId, config);
              setConfigModalOpen(false);
              setSelectedAccess(null);
            }}
            isModal
          />
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// Sous-composant : Configuration des accès par onglet
// ============================================================
interface TabAccessConfigPanelProps {
  tabs: TabNode[];
  access: TreeAccess;
  roles: RoleData[];
  onSave: (config: TabAccessConfig) => void;
  isModal?: boolean;
  productSource?: ProductSource | null;
}

function TabAccessConfigPanel({ tabs, access, roles, onSave, isModal: _isModal, productSource }: TabAccessConfigPanelProps) {
  const existingConfig = (access.tabAccessConfig as TabAccessConfig) || {};
  const existingTabConfig = existingConfig.tabs || {};

  const [localConfig, setLocalConfig] = useState<Record<string, TabAccessConfigEntry>>(() => {
    const initial: Record<string, TabAccessConfigEntry> = {};
    tabs.forEach((tab, index) => {
      initial[tab.id] = existingTabConfig[tab.id] || {
        visible: true,
        allowedRoles: [],
        isSequential: index < 4, // Les 4 premiers onglets sont séquentiels par défaut
        sequentialOrder: index + 1,
        subTabs: {},
      };
    });
    return initial;
  });

  const [allowedProducts, setAllowedProducts] = useState<string[]>(
    existingConfig.allowedProducts || []
  );

  const handleToggleVisible = (tabId: string, visible: boolean) => {
    setLocalConfig(prev => ({
      ...prev,
      [tabId]: { ...prev[tabId], visible },
    }));
  };

  const handleToggleSequential = (tabId: string, isSequential: boolean) => {
    setLocalConfig(prev => ({
      ...prev,
      [tabId]: { ...prev[tabId], isSequential },
    }));
  };

  const handleRolesChange = (tabId: string, allowedRoles: string[]) => {
    setLocalConfig(prev => ({
      ...prev,
      [tabId]: { ...prev[tabId], allowedRoles },
    }));
  };

  const handleSequentialOrderChange = (tabId: string, order: number) => {
    setLocalConfig(prev => ({
      ...prev,
      [tabId]: { ...prev[tabId], sequentialOrder: order },
    }));
  };

  const handleSave = () => {
    onSave({
      tabs: localConfig,
      allowedProducts: allowedProducts.length > 0 ? allowedProducts : undefined,
    });
  };

  return (
    <div>
      {/* Section Produits autorisés */}
      {productSource && productSource.options.length > 0 && (
        <Card
          size="small"
          style={{ marginBottom: 16, borderLeft: '3px solid #722ed1' }}
        >
          <Row align="middle" gutter={16}>
            <Col flex="200px">
              <Text strong style={{ fontSize: 14 }}>
                <AppstoreOutlined style={{ color: '#722ed1', marginRight: 6 }} />
                Produits autorisés
              </Text>
            </Col>
            <Col flex="auto">
              <Select
                mode="multiple"
                size="small"
                placeholder="Tous les produits (pas de restriction)"
                value={allowedProducts}
                onChange={(v) => setAllowedProducts(v)}
                style={{ width: '100%' }}
                allowClear
                maxTagCount={4}
              >
                {productSource.options.map(opt => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Seuls les produits sélectionnés seront disponibles dans le champ "{productSource.label}" pour cette organisation.
              Vide = tous les produits.
            </Text>
          </div>
        </Card>
      )}

      <Divider orientation="left" style={{ marginTop: 0 }}>
        Configuration des onglets
      </Divider>

      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Configurez la visibilité et les rôles autorisés pour chaque onglet.
          Les onglets séquentiels doivent être complétés dans l'ordre.
        </Text>
      </div>

      {tabs.map((tab, index) => {
        const cfg = localConfig[tab.id];
        if (!cfg) return null;

        return (
          <Card
            key={tab.id}
            size="small"
            style={{
              marginBottom: 8,
              borderLeft: cfg.visible ? '3px solid #1890ff' : '3px solid #d9d9d9',
              opacity: cfg.visible ? 1 : 0.6,
            }}
          >
            <Row align="middle" gutter={16}>
              {/* Nom de l'onglet */}
              <Col flex="200px">
                <Space>
                  <Text strong style={{ fontSize: 14 }}>
                    {index + 1}. {tab.label || 'Sans nom'}
                  </Text>
                </Space>
              </Col>

              {/* Visible */}
              <Col flex="120px">
                <Space>
                  <FBToggle
                    checked={cfg.visible}
                    onChange={(v) => handleToggleVisible(tab.id, v)}
                  />
                  <span style={{ fontSize: 12, color: cfg.visible ? FB.text : FB.textSecondary }}>{cfg.visible ? 'Visible' : 'Masqué'}</span>
                </Space>
              </Col>

              {/* Séquentiel */}
              <Col flex="160px">
                <Space>
                  <Tooltip title="Si activé, l'onglet précédent doit être complété avant d'accéder à celui-ci">
                    <Checkbox
                      checked={cfg.isSequential}
                      onChange={(e) => handleToggleSequential(tab.id, e.target.checked)}
                      disabled={!cfg.visible}
                    >
                      <OrderedListOutlined /> Séquentiel
                    </Checkbox>
                  </Tooltip>
                </Space>
              </Col>

              {/* Ordre séquentiel */}
              {cfg.isSequential && (
                <Col flex="80px">
                  <Select
                    size="small"
                    value={cfg.sequentialOrder}
                    onChange={(v) => handleSequentialOrderChange(tab.id, v)}
                    style={{ width: '100%' }}
                    disabled={!cfg.visible}
                  >
                    {tabs.map((_, i) => (
                      <Option key={i + 1} value={i + 1}>#{i + 1}</Option>
                    ))}
                  </Select>
                </Col>
              )}

              {/* Rôles autorisés */}
              <Col flex="auto">
                <Select
                  mode="multiple"
                  size="small"
                  placeholder="Tous les rôles (pas de restriction)"
                  value={cfg.allowedRoles}
                  onChange={(v) => handleRolesChange(tab.id, v)}
                  style={{ width: '100%' }}
                  disabled={!cfg.visible}
                  allowClear
                  maxTagCount={2}
                >
                  {roles.map(role => (
                    <Option key={role.id} value={role.id}>
                      {role.label || role.name}
                    </Option>
                  ))}
                </Select>
              </Col>
            </Row>

            {/* Sous-onglets (depuis le champ subtabs du noeud branch) */}
            {tab.subTabsList && tab.subTabsList.length > 0 && cfg.visible && (
              <div style={{ marginTop: 8, paddingLeft: 24, borderLeft: '2px solid #f0f0f0' }}>
                <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
                  Sous-onglets :
                </Text>
                {tab.subTabsList.map((subTabName) => {
                  const subKey = subTabName; // On utilise le nom comme clé
                  const subCfg = cfg.subTabs?.[subKey] || { visible: true, allowedRoles: [] };
                  return (
                    <Row key={subKey} align="middle" gutter={8} style={{ marginBottom: 4 }}>
                      <Col flex="180px">
                        <Text style={{ fontSize: 12 }}>↳ {subTabName}</Text>
                      </Col>
                      <Col flex="100px">
                        <FBToggle
                          checked={subCfg.visible}
                          onChange={(v) => {
                            setLocalConfig(prev => ({
                              ...prev,
                              [tab.id]: {
                                ...prev[tab.id],
                                subTabs: {
                                  ...prev[tab.id].subTabs,
                                  [subKey]: { ...subCfg, visible: v },
                                },
                              },
                            }));
                          }}
                        />
                      </Col>
                      <Col flex="auto">
                        <Select
                          mode="multiple"
                          size="small"
                          placeholder="Tous les rôles"
                          value={subCfg.allowedRoles}
                          style={{ width: '100%' }}
                          maxTagCount={1}
                          onChange={(v) => {
                            setLocalConfig(prev => ({
                              ...prev,
                              [tab.id]: {
                                ...prev[tab.id],
                                subTabs: {
                                  ...prev[tab.id].subTabs,
                                  [subKey]: { ...subCfg, allowedRoles: v },
                                },
                              },
                            }));
                          }}
                        >
                          {roles.map(role => (
                            <Option key={role.id} value={role.id}>
                              {role.label || role.name}
                            </Option>
                          ))}
                        </Select>
                      </Col>
                    </Row>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <button onClick={handleSave} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 6, border: 'none', background: FB.blue, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          <span>✅</span><span>Enregistrer la configuration</span>
        </button>
      </div>
    </div>
  );
}
