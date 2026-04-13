import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Drawer,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  ColorPicker,
  Divider,
  Typography,
  Row,
  Col,
  Collapse,
  Alert,
  Popconfirm,
  message,
  Badge,
  Tooltip,
  Modal,
  Tabs,
  Tree,
  Breadcrumb,
  Segmented,
  Spin,
  Empty,
  Dropdown,
  Menu
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  DragOutlined,
  MoreOutlined,
  FolderOutlined,
  FileOutlined,
  CrownOutlined,
  SearchOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  TeamOutlined,
  LockOutlined,
  UnlockOutlined,
  CopyOutlined,
  ExportOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  UserOutlined,
  SafetyOutlined,
  DashboardOutlined,
  CalendarOutlined,
  MailOutlined,
  PhoneOutlined,
  CloudOutlined,
  FormOutlined,
  ContactsOutlined,
  VideoCameraOutlined,
  EnvironmentOutlined,
  CustomerServiceOutlined,
  ProjectOutlined,
  InboxOutlined,
  BarChartOutlined,
  BankOutlined,
  BellOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  KeyOutlined,
  ControlOutlined,
  ToolOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { useTranslation } from 'react-i18next';
import { SF } from '../../components/zhiive/ZhiiveTheme';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Option } = Select;

// 🎨 MAPPING DES ICÔNES ANTD
const iconMap = {
  // Icônes de base
  'AppstoreOutlined': <AppstoreOutlined />,
  'FolderOutlined': <FolderOutlined />,
  'FileOutlined': <FileOutlined />,
  'SettingOutlined': <SettingOutlined />,
  'TeamOutlined': <TeamOutlined />,
  'UserOutlined': <UserOutlined />,
  'SafetyOutlined': <SafetyOutlined />,
  'DashboardOutlined': <DashboardOutlined />,
  'CalendarOutlined': <CalendarOutlined />,
  'MailOutlined': <MailOutlined />,
  'PhoneOutlined': <PhoneOutlined />,
  'CloudOutlined': <CloudOutlined />,
  'FormOutlined': <FormOutlined />,
  'ContactsOutlined': <ContactsOutlined />,
  'VideoCameraOutlined': <VideoCameraOutlined />,
  'EnvironmentOutlined': <EnvironmentOutlined />,
  'CustomerServiceOutlined': <CustomerServiceOutlined />,
  'ProjectOutlined': <ProjectOutlined />,
  'InboxOutlined': <InboxOutlined />,
  'BarChartOutlined': <BarChartOutlined />,
  'BankOutlined': <BankOutlined />,
  'BellOutlined': <BellOutlined />,
  'RobotOutlined': <RobotOutlined />,
  'SafetyCertificateOutlined': <SafetyCertificateOutlined />,
  'KeyOutlined': <KeyOutlined />,
  'ControlOutlined': <ControlOutlined />,
  'ToolOutlined': <ToolOutlined />,
  'FileTextOutlined': <FileTextOutlined />,
  'CrownOutlined': <CrownOutlined />
};

// 🎨 FONCTION POUR AFFICHER UNE ICÔNE
const getIconComponent = (iconName?: string) => {
  if (!iconName) return <FileOutlined />;
  return iconMap[iconName] || <FileOutlined />;
};

// 🏗️ INTERFACES V2 - SYSTÈME CATEGORY COMPLET
interface CategoryData {
  id: string;
  name: string;
  description?: string;
  icon: string;
  iconColor: string;
  order: number;
  active: boolean;
  organizationId?: string;
  superAdminOnly: boolean;
  allowedRoles?: string[];
  requiredPermissions?: string[];
  isActiveInOrg: boolean;
  hasOrgSpecificConfig: boolean;
  orgCustomPermissions?: Record<string, unknown>;
  orgCustomAllowedRoles?: string[];
  modules: ModuleDataV2[];
  createdAt: string;
  updatedAt: string;
  organizationName?: string;
}

interface ModuleDataV2 {
  id: string;
  name: string;
  description?: string;
  path: string;
  icon: string;
  categoryId: string;
  organizationId?: string;
  order: number;
  superAdminOnly: boolean;
  active: boolean;
  isActiveInOrg: boolean;
  hasOrgSpecificConfig: boolean;
  permissions: Array<{
    id: string;
    roleId: string;
    action: string;
    resource: string;
    roleName?: string;
    roleLabel?: string;
  }>;
  categoryName?: string;
  organizationName?: string;
  // Champs de compatibilité
  key?: string;
  label?: string;
  feature?: string;
  route?: string;
  section?: string;
  sectionIcon?: string;
  sectionColor?: string;
}

interface AdminModulesV2Response {
  success: boolean;
  data: {
    sections: CategoryData[];
    categories: CategoryData[];
    totalModules: number;
    totalCategories: number;
    activeModules: number;
    metadata: {
      organizationId?: string;
      isSuperAdmin: boolean;
      userRole?: string;
    };
  };
}

// 🎯 COMPOSANT DRAG & DROP POUR CATÉGORIES
const DraggableCategory: React.FC<{
  category: CategoryData;
  onEdit: (category: CategoryData) => void;
  onDelete: (categoryId: string) => void;
  onStatusToggle: (categoryId: string, active: boolean) => void;
  isDragging: boolean;
  children: React.ReactNode;
}> = ({ category, onEdit, onDelete, onStatusToggle, children }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'CATEGORY',
    item: { id: category.id, type: 'category', data: category },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ['CATEGORY', 'MODULE'],
    drop: (item: { id: string; type: string; data: CategoryData | ModuleDataV2 }) => {
      // Logique de drop pour réorganisation
      console.log('📦 Drop sur catégorie:', category.name, 'Item:', item);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div 
      ref={(node) => drag(drop(node))} 
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        border: isOver ? '2px dashed #1890ff' : 'none',
        borderRadius: '8px',
        padding: isOver ? '2px' : '0'
      }}
    >
      {children}
    </div>
  );
};

// 🎯 COMPOSANT DRAG & DROP POUR MODULES
const DraggableModule: React.FC<{
  module: ModuleDataV2;
  onEdit: (module: ModuleDataV2) => void;
  onDelete: (moduleId: string) => void;
  onStatusToggle: (moduleId: string, active: boolean) => void;
  children: React.ReactNode;
}> = ({ module, onEdit, onDelete, onStatusToggle, children }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'MODULE',
    item: { id: module.id, type: 'module', data: module },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div 
      ref={drag} 
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move'
      }}
    >
      {children}
    </div>
  );
};

// 🎯 COMPOSANT PRINCIPAL V2
const AdminModulesV2: React.FC = () => {
  const { t } = useTranslation();
  // 📊 ÉTATS PRINCIPAUX
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'tree'>('grid');
  const [activeTab, setActiveTab] = useState('overview');

  // 🎨 MODALES & DRAWERS
  const [categoryDrawerVisible, setCategoryDrawerVisible] = useState(false);
  const [moduleDrawerVisible, setModuleDrawerVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);
  const [editingModule, setEditingModule] = useState<ModuleDataV2 | null>(null);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);

  // 🔧 HOOKS
  const { api } = useAuthenticatedApi();
  const { user, selectedOrganization } = useAuth();
  const [categoryForm] = Form.useForm();
  const [moduleForm] = Form.useForm();

  // Vérifications d'accès - permettre aux admins ET super admins
  const hasAccess = user?.role === 'super_admin' || user?.role === 'admin' || 
    (user?.role && ['organization_admin', 'manager'].includes(user.role));

  // 🔄 CHARGEMENT DES DONNÉES V2
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[ADMIN-V2] 🔄 Chargement système Category...');

      const params = new URLSearchParams();
      if (selectedOrganization?.id) {
        params.append('organizationId', selectedOrganization.id);
      }

      const response = await api.get(`/api/admin-modules-v2?${params.toString()}`);
      console.log('[ADMIN-V2] 📨 Réponse API complète:', response);
      console.log('[ADMIN-V2] 📨 response.success:', response.success);
      console.log('[ADMIN-V2] 📨 response.data:', response.data);
      console.log('[ADMIN-V2] 📨 response.data?.categories:', response.data?.categories);

      if (response.success && response.data?.categories) {
        setCategories(response.data.categories);
        console.log('[ADMIN-V2] ✅ Categories chargées:', response.data.categories.length);
      } else {
        console.error('[ADMIN-V2] ❌ Réponse API invalide');
        message.error('Erreur lors du chargement des catégories');
      }
    } catch (error) {
      console.error('[ADMIN-V2] ❌ Erreur chargement:', error);
      message.error('Erreur de communication avec le serveur');
    } finally {
      setLoading(false);
    }
  }, [api, selectedOrganization?.id]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 🆕 CRÉATION DE CATÉGORIE
  const handleCreateCategory = async (values: Partial<CategoryData>) => {
    try {
      console.log('[ADMIN-V2] 🆕 Création catégorie:', values);
      
      const response = await api.post('/api/admin-modules-v2/categories', {
        ...values,
        organizationId: selectedOrganization?.id
      });

      if (response.success) {
        message.success(`Catégorie "${values.name}" créée avec succès`);
        setCategoryDrawerVisible(false);
        categoryForm.resetFields();
        loadCategories();
      } else {
        message.error(response.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('[ADMIN-V2] ❌ Erreur création catégorie:', error);
      message.error('Erreur lors de la création de la catégorie');
    }
  };

  // ✏️ MODIFICATION DE CATÉGORIE
  const handleUpdateCategory = async (values: Partial<CategoryData>) => {
    if (!editingCategory) return;

    try {
      console.log('[ADMIN-V2] ✏️ Modification catégorie:', editingCategory.id, values);
      
      const response = await api.put(`/api/admin-modules-v2/categories/${editingCategory.id}`, values);

      if (response.success) {
        message.success(`Catégorie "${values.name}" modifiée avec succès`);
        setCategoryDrawerVisible(false);
        setEditingCategory(null);
        categoryForm.resetFields();
        loadCategories();
      } else {
        message.error(response.error || 'Erreur lors de la modification');
      }
    } catch (error) {
      console.error('[ADMIN-V2] ❌ Erreur modification catégorie:', error);
      message.error('Erreur lors de la modification de la catégorie');
    }
  };

  // 🗑️ SUPPRESSION DE CATÉGORIE
  const handleDeleteCategory = async (categoryId: string) => {
    try {
      console.log('[ADMIN-V2] 🗑️ Suppression catégorie:', categoryId);
      
      const response = await api.delete(`/api/admin-modules-v2/categories/${categoryId}`);

      if (response.success) {
        message.success('Catégorie supprimée avec succès');
        loadCategories();
      } else {
        message.error(response.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('[ADMIN-V2] ❌ Erreur suppression catégorie:', error);
      message.error('Erreur lors de la suppression de la catégorie');
    }
  };

  // 🆕 CRÉATION DE MODULE
  const handleCreateModule = async (values: Partial<ModuleDataV2>) => {
    try {
      console.log('[ADMIN-V2] 🆕 Création module:', values);
      
      const response = await api.post('/api/admin-modules-v2/modules', {
        ...values,
        organizationId: selectedOrganization?.id
      });

      if (response.success) {
        message.success(`Module "${values.name}" créé avec succès`);
        setModuleDrawerVisible(false);
        moduleForm.resetFields();
        loadCategories();
      } else {
        message.error(response.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('[ADMIN-V2] ❌ Erreur création module:', error);
      message.error('Erreur lors de la création du module');
    }
  };

  // ✏️ MODIFICATION DE MODULE
  const handleUpdateModule = async (values: Partial<ModuleDataV2>) => {
    if (!editingModule) return;

    try {
      console.log('[ADMIN-V2] ✏️ Modification module:', editingModule.id, values);
      
      const response = await api.put(`/api/admin-modules-v2/modules/${editingModule.id}`, values);

      if (response.success) {
        message.success(`Module "${values.name}" modifié avec succès`);
        setModuleDrawerVisible(false);
        setEditingModule(null);
        moduleForm.resetFields();
        loadCategories();
      } else {
        message.error(response.error || 'Erreur lors de la modification');
      }
    } catch (error) {
      console.error('[ADMIN-V2] ❌ Erreur modification module:', error);
      message.error('Erreur lors de la modification du module');
    }
  };

  // 🗑️ SUPPRESSION DE MODULE
  const handleDeleteModule = async (moduleId: string) => {
    try {
      console.log('[ADMIN-V2] 🗑️ Suppression module:', moduleId);
      
      const response = await api.delete(`/api/admin-modules-v2/modules/${moduleId}`);

      if (response.success) {
        message.success('Module supprimé avec succès');
        loadCategories();
      } else {
        message.error(response.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('[ADMIN-V2] ❌ Erreur suppression module:', error);
      message.error('Erreur lors de la suppression du module');
    }
  };

  // 🔄 ACTIVATION/DÉSACTIVATION DES MODULES
  const toggleModuleStatus = async (moduleId: string, currentStatus: boolean) => {
    if (!selectedOrganization?.id) {
      message.error('Aucune organisation sélectionnée');
      return;
    }

    try {
      console.log('[ADMIN-V2] 🔄 Toggle module status:', { moduleId, organizationId: selectedOrganization.id, active: !currentStatus });
      
      const response = await api.post(`/api/admin-modules-v2/modules/${moduleId}/organization/${selectedOrganization.id}/status`, {
        active: !currentStatus
      });

      if (response.success) {
        // Mettre à jour l'état local
        setCategories(prev => prev.map(category => ({
          ...category,
          modules: category.modules.map(module =>
            module.id === moduleId
              ? { ...module, isActiveInOrg: !currentStatus }
              : module
          )
        })));
        
        message.success(`Module ${!currentStatus ? 'activé' : 'désactivé'} avec succès`);
      } else {
        message.error(response.error || 'Erreur lors du changement de statut');
      }
    } catch (error) {
      console.error('[ADMIN-V2] ❌ Erreur toggle module status:', error);
      message.error('Erreur lors du changement de statut du module');
    }
  };

  // 🔄 ACTIVATION/DÉSACTIVATION DES CATÉGORIES
  const toggleCategoryStatus = async (categoryId: string, currentStatus: boolean) => {
    if (!selectedOrganization?.id) {
      message.error('Aucune organisation sélectionnée');
      return;
    }

    try {
      console.log('[ADMIN-V2] 🔄 Toggle category status:', { categoryId, organizationId: selectedOrganization.id, active: !currentStatus });
      
      const response = await api.post(`/api/admin-modules-v2/categories/${categoryId}/organization/${selectedOrganization.id}/status`, {
        active: !currentStatus
      });

      if (response.success) {
        // Mettre à jour l'état local
        setCategories(prev => prev.map(category =>
          category.id === categoryId
            ? { ...category, isActiveInOrg: !currentStatus }
            : category
        ));
        
        message.success(`Catégorie ${!currentStatus ? 'activée' : 'désactivée'} avec succès`);
      } else {
        message.error(response.error || 'Erreur lors du changement de statut');
      }
    } catch (error) {
      console.error('[ADMIN-V2] ❌ Erreur toggle category status:', error);
      message.error('Erreur lors du changement de statut de la catégorie');
    }
  };

  // 🔄 RÉORGANISATION DRAG & DROP
  const handleReorder = async (type: 'categories' | 'modules', items: CategoryData[] | ModuleDataV2[]) => {
    try {
      console.log('[ADMIN-V2] 🔄 Réorganisation:', type, items.length);
      
      const response = await api.post('/api/admin-modules-v2/reorder', {
        type,
        items: items.map((item, index) => ({
          id: item.id,
          order: index + 1,
          ...(type === 'modules' && 'categoryId' in item && { categoryId: item.categoryId })
        }))
      });

      if (response.success) {
        message.success(`${type === 'categories' ? 'Catégories' : 'Modules'} réorganisés avec succès`);
        loadCategories();
      } else {
        message.error(response.error || 'Erreur lors de la réorganisation');
      }
    } catch (error) {
      console.error('[ADMIN-V2] ❌ Erreur réorganisation:', error);
      message.error('Erreur lors de la réorganisation');
    }
  };

  // 🎨 OUVERTURE DES MODALES
  const openCategoryDrawer = (category?: CategoryData) => {
    setEditingCategory(category || null);
    if (category) {
      categoryForm.setFieldsValue(category);
    } else {
      categoryForm.resetFields();
    }
    setCategoryDrawerVisible(true);
  };

  const openModuleDrawer = (module?: ModuleDataV2) => {
    setEditingModule(module || null);
    if (module) {
      moduleForm.setFieldsValue(module);
    } else {
      moduleForm.resetFields();
    }
    setModuleDrawerVisible(true);
  };

  // 📊 DONNÉES FILTRÉES
  const filteredCategories = useMemo(() => {
    return categories.filter(category => {
      const matchesSearch = !searchTerm || 
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.modules.some(m => 
          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesCategory = selectedCategoryId === 'all' || category.id === selectedCategoryId;

      return matchesSearch && matchesCategory;
    });
  }, [categories, searchTerm, selectedCategoryId]);

  // 📊 STATISTIQUES
  const stats = useMemo(() => {
    const totalModules = categories.reduce((acc, cat) => acc + cat.modules.length, 0);
    const activeModules = categories.reduce((acc, cat) => 
      acc + cat.modules.filter(m => m.active && m.isActiveInOrg).length, 0);
    const activeCategories = categories.filter(cat => cat.active && cat.isActiveInOrg).length;

    return {
      totalCategories: categories.length,
      activeCategories,
      totalModules,
      activeModules,
      globalCategories: categories.filter(cat => !cat.organizationId).length,
      orgCategories: categories.filter(cat => cat.organizationId).length
    };
  }, [categories]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 16px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>Chargement du système de gestion des modules...</Text>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 16px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
        <Title level={3}>Accès restreint</Title>
        <Text type="secondary">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          <br />
          Contactez un administrateur si vous pensez que c'est une erreur.
        </Text>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="admin-modules-v2" style={{ padding: '24px' }}>
        
        {/* 📊 EN-TÊTE AVEC STATISTIQUES */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 2px 12px ${SF.overlayDarkFaint}',
                border: '1px solid #f0f0f0'
              }}
            >
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Title level={2} style={{ margin: 0 }}>
                        <AppstoreOutlined /> Administration des Modules V2
                      </Title>
                      <Text type="secondary">
                        Système de gestion complet avec catégories, modules et permissions multi-tenant
                      </Text>
                    </div>
                    <Space>
                      <Button 
                        type="primary" 
                        icon={<PlusOutlined />}
                        onClick={() => openCategoryDrawer()}
                      >
                        Nouvelle Catégorie
                      </Button>
                      <Button 
                        type="default" 
                        icon={<PlusOutlined />}
                        onClick={() => openModuleDrawer()}
                      >
                        Nouveau Module
                      </Button>
                      <Button 
                        icon={<ReloadOutlined />}
                        onClick={loadCategories}
                      >
                        Actualiser
                      </Button>
                    </Space>
                  </div>
                </Col>
              </Row>

              {/* STATISTIQUES */}
              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} sm={12} md={6}>
                  <Card 
                    size="small" 
                    style={{ 
                      textAlign: 'center',
                      backgroundColor: '#ffffff',
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Badge count={stats.totalCategories} showZero color="#52c41a">
                      <FolderOutlined style={{ fontSize: 24 }} />
                    </Badge>
                    <div style={{ marginTop: 8 }}>
                      <Text strong>Catégories</Text>
                      <br />
                      <Text type="secondary">{stats.activeCategories} actives</Text>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card 
                    size="small" 
                    style={{ 
                      textAlign: 'center',
                      backgroundColor: '#ffffff',
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Badge count={stats.totalModules} showZero color="#1890ff">
                      <FileOutlined style={{ fontSize: 24 }} />
                    </Badge>
                    <div style={{ marginTop: 8 }}>
                      <Text strong>Modules</Text>
                      <br />
                      <Text type="secondary">{stats.activeModules} actifs</Text>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card 
                    size="small" 
                    style={{ 
                      textAlign: 'center',
                      backgroundColor: '#ffffff',
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Badge count={stats.globalCategories} showZero color="#faad14">
                      <CrownOutlined style={{ fontSize: 24 }} />
                    </Badge>
                    <div style={{ marginTop: 8 }}>
                      <Text strong>Globales</Text>
                      <br />
                      <Text type="secondary">Super Admin</Text>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <Badge count={stats.orgCategories} showZero color="#722ed1">
                      <TeamOutlined style={{ fontSize: 24 }} />
                    </Badge>
                    <div style={{ marginTop: 8 }}>
                      <Text strong>Organisation</Text>
                      <br />
                      <Text type="secondary">Spécifiques</Text>
                    </div>
                  </Card>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* 🔍 BARRE DE RECHERCHE ET FILTRES */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 2px 8px ${SF.overlayDarkFaint}',
                border: '1px solid #f0f0f0'
              }}
              styles={{ body: { padding: '16px' } }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <Input
                    placeholder="Rechercher catégories et modules..."
                    prefix={<SearchOutlined />}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    allowClear
                    style={{ borderRadius: '6px' }}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Select
                    placeholder="Filtrer par catégorie"
                    style={{ width: '100%' }}
                    value={selectedCategoryId}
                    onChange={setSelectedCategoryId}
                  >
                    <Option value="all">Toutes les catégories</Option>
                    {categories.map(cat => (
                      <Option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.modules.length} modules)
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} md={8}>
                  <Segmented
                    value={viewMode}
                    onChange={setViewMode}
                    options={[
                      { label: 'Grille', value: 'grid', icon: <AppstoreOutlined /> },
                      { label: 'Liste', value: 'list', icon: <SortAscendingOutlined /> },
                      { label: 'Arbre', value: 'tree', icon: <FolderOutlined /> }
                    ]}
                    style={{ width: '100%' }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* 🎯 AFFICHAGE PRINCIPAL */}
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Vue d'ensemble" key="overview">
            {viewMode === 'grid' && (
              <Row gutter={[16, 16]}>
                {filteredCategories.map(category => (
                  <Col key={category.id} xs={24} lg={12}>
                    <DraggableCategory
                      category={category}
                      onEdit={openCategoryDrawer}
                      onDelete={handleDeleteCategory}
                      onStatusToggle={toggleCategoryStatus}
                      isDragging={false}
                    >
                      <Card
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: category.iconColor, fontSize: '18px' }}>
                              {getIconComponent(category.icon)}
                            </span>
                            <span>{category.name}</span>
                            {category.superAdminOnly && <CrownOutlined style={{ color: '#faad14' }} />}
                            <Badge count={category.modules.length} color="#1890ff" />
                          </div>
                        }
                        extra={
                          <Dropdown
                            overlay={
                              <Menu>
                                <Menu.Item 
                                  key="edit" 
                                  icon={<EditOutlined />}
                                  onClick={() => openCategoryDrawer(category)}
                                >
                                  Modifier
                                </Menu.Item>
                                <Menu.Item 
                                  key="addModule" 
                                  icon={<PlusOutlined />}
                                  onClick={() => {
                                    moduleForm.setFieldValue('categoryId', category.id);
                                    openModuleDrawer();
                                  }}
                                >
                                  Ajouter un module
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item 
                                  key="delete" 
                                  icon={<DeleteOutlined />}
                                  danger
                                  onClick={() => {
                                    Modal.confirm({
                                      title: 'Supprimer la catégorie',
                                      content: `Êtes-vous sûr de vouloir supprimer "${category.name}" ?`,
                                      onOk: () => handleDeleteCategory(category.id)
                                    });
                                  }}
                                >
                                  Supprimer
                                </Menu.Item>
                              </Menu>
                            }
                          >
                            <Button icon={<MoreOutlined />} type="text" />
                          </Dropdown>
                        }
                        size="small"
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          boxShadow: '0 2px 12px ${SF.overlayDarkFaint}'
                        }}
                        styles={{ header: { borderBottom: '1px solid #f0f0f0' } }}
                      >
                        <div style={{ marginBottom: 12 }}>
                          <Text type="secondary">{category.description}</Text>
                        </div>
                        
                        <div style={{ marginBottom: 12 }}>
                          <Space size="small">
                            <Tag color={category.active ? 'success' : 'error'}>
                              {category.active ? 'Active' : 'Inactive'}
                            </Tag>
                            {category.organizationId ? (
                              <Tag color="purple">Organisation</Tag>
                            ) : (
                              <Tag color="gold">Globale</Tag>
                            )}
                            {!category.isActiveInOrg && (
                              <Tag color="orange">Désactivée pour l'org</Tag>
                            )}
                          </Space>
                        </div>

                        {/* MODULES DE LA CATÉGORIE */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text strong>
                              Modules ({category.modules.length})
                            </Text>
                            <Space>
                              <Button 
                                size="small" 
                                type="primary" 
                                icon={<PlusOutlined />}
                                onClick={() => {
                                  moduleForm.setFieldValue('categoryId', category.id);
                                  openModuleDrawer();
                                }}
                              >
                                Ajouter module
                              </Button>
                              <Switch
                                size="small"
                                checked={category.isActiveInOrg}
                                onChange={() => toggleCategoryStatus(category.id, category.isActiveInOrg)}
                                checkedChildren={<EyeOutlined />}
                                unCheckedChildren={<EyeInvisibleOutlined />}
                              />
                            </Space>
                          </div>
                          
                          {category.modules.length === 0 ? (
                            <Empty 
                              description="Aucun module" 
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              style={{ margin: '16px 0' }}
                            />
                          ) : (
                            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                              {category.modules.map(module => (
                                <DraggableModule
                                  key={module.id}
                                  module={module}
                                  onEdit={openModuleDrawer}
                                  onDelete={handleDeleteModule}
                                  onStatusToggle={toggleModuleStatus}
                                >
                                  <Card
                                    size="small"
                                    style={{ 
                                      marginBottom: 12,
                                      borderColor: '#f0f0f0',
                                      backgroundColor: '#ffffff',
                                      boxShadow: '0 2px 8px ${SF.overlayDarkFaint}',
                                      border: '1px solid #e8e8e8',
                                      borderLeft: `4px solid ${module.isActiveInOrg ? '#52c41a' : '#d9d9d9'}`
                                    }}
                                    styles={{ body: { padding: '12px 16px' } }}
                                    hoverable
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                        <DragOutlined style={{ color: '#d9d9d9', cursor: 'move' }} />
                                        <div style={{ flex: 1 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 4 }}>
                                            {getIconComponent(module.icon)}
                                            <Text strong style={{ color: module.isActiveInOrg ? '#52c41a' : '#8c8c8c' }}>
                                              {module.name || module.label}
                                            </Text>
                                            {module.superAdminOnly && (
                                              <CrownOutlined style={{ color: '#faad14', fontSize: 12 }} />
                                            )}
                                          </div>
                                          {module.description && (
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                              {module.description}
                                            </Text>
                                          )}
                                          {module.path && (
                                            <div style={{ fontSize: '11px', color: '#1890ff', marginTop: 2 }}>
                                              {module.path}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <Space size="small">
                                        <Switch
                                          size="small"
                                          checked={module.isActiveInOrg}
                                          onChange={() => toggleModuleStatus(module.id, module.isActiveInOrg)}
                                          checkedChildren={<CheckOutlined />}
                                          unCheckedChildren={<CloseOutlined />}
                                        />
                                        <Button 
                                          size="small" 
                                          type="text" 
                                          icon={<EditOutlined />}
                                          onClick={() => openModuleDrawer(module)}
                                        />
                                        <Popconfirm
                                          title="Supprimer ce module ?"
                                          description="Cette action est irréversible"
                                          onConfirm={() => handleDeleteModule(module.id)}
                                        >
                                          <Button 
                                            size="small" 
                                            type="text" 
                                            icon={<DeleteOutlined />}
                                            danger
                                          />
                                        </Popconfirm>
                                      </Space>
                                    </div>
                                  </Card>
                                </DraggableModule>
                              ))}
                            </div>
                          )}
                        </div>
                      </Card>
                    </DraggableCategory>
                  </Col>
                ))}
              </Row>
            )}

            {viewMode === 'list' && (
              <Card
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: '0 2px 12px ${SF.overlayDarkFaint}',
                  border: '1px solid #f0f0f0'
                }}
              >
                <Table scroll={{ x: "max-content" }}                   dataSource={filteredCategories.flatMap(cat => [
                    { 
                      ...cat, 
                      type: 'category', 
                      key: `cat-${cat.id}`,
                      displayName: cat.name,
                      modulePath: null
                    },
                    ...cat.modules.map(mod => ({ 
                      ...mod, 
                      type: 'module', 
                      categoryName: cat.name,
                      key: `mod-${mod.id}`,
                      displayName: mod.name || mod.label,
                      modulePath: mod.path
                    }))
                  ])}
                  columns={[
                    {
                      title: 'Type',
                      dataIndex: 'type',
                      width: 100,
                      render: (type) => (
                        <Tag color={type === 'category' ? 'blue' : 'green'}>
                          {type === 'category' ? <FolderOutlined /> : <FileOutlined />}
                          {type === 'category' ? 'Catégorie' : 'Module'}
                        </Tag>
                      )
                    },
                    {
                      title: 'Nom',
                      dataIndex: 'displayName',
                      render: (name, record) => (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {record.type === 'module' && <div style={{ width: 16 }} />}
                          <span>{name}</span>
                          {record.superAdminOnly && <CrownOutlined style={{ color: '#faad14' }} />}
                          {record.modulePath && (
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              ({record.modulePath})
                            </Text>
                          )}
                        </div>
                      )
                    },
                    {
                      title: 'Description',
                      dataIndex: 'description',
                      ellipsis: true
                    },
                    {
                      title: 'Statut',
                      width: 120,
                      render: (_, record) => (
                        <Space direction="vertical" size="small">
                          <Tag color={record.active ? 'success' : 'error'}>
                            {record.active ? 'Actif' : 'Inactif'}
                          </Tag>
                          {!record.isActiveInOrg && (
                            <Tag color="orange" size="small">Désactivé pour l'org</Tag>
                          )}
                        </Space>
                      )
                    },
                    {
                      title: 'Actions',
                      width: 200,
                      render: (_, record) => (
                        <Space>
                          <Switch
                            size="small"
                            checked={record.isActiveInOrg}
                            onChange={() => record.type === 'category' 
                              ? toggleCategoryStatus(record.id, record.isActiveInOrg)
                              : toggleModuleStatus(record.id, record.isActiveInOrg)
                            }
                            checkedChildren="ON"
                            unCheckedChildren="OFF"
                          />
                          <Button 
                            size="small" 
                            type="text" 
                            icon={<EditOutlined />}
                            onClick={() => record.type === 'category' 
                              ? openCategoryDrawer(record) 
                              : openModuleDrawer(record)
                            }
                          />
                          <Popconfirm
                            title={`Supprimer ${record.type === 'category' ? 'cette catégorie' : 'ce module'} ?`}
                            onConfirm={() => record.type === 'category'
                              ? handleDeleteCategory(record.id)
                              : handleDeleteModule(record.id)
                            }
                          >
                            <Button 
                              size="small" 
                              type="text" 
                              icon={<DeleteOutlined />}
                              danger
                            />
                          </Popconfirm>
                        </Space>
                      )
                    }
                  ]}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `${total} éléments au total`
                  }}
                />
              </Card>
            )}
          </TabPane>

          <TabPane tab="Statistiques" key="stats">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card 
                  title="Analyse détaillée du système"
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    boxShadow: '0 2px 12px ${SF.overlayDarkFaint}',
                    border: '1px solid #f0f0f0'
                  }}
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Card 
                        size="small" 
                        title="Répartition par catégorie"
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #f0f0f0',
                          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                          {categories.map(cat => (
                            <div key={cat.id} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              padding: '4px 0',
                              borderBottom: '1px solid #f0f0f0'
                            }}>
                              <Text>{cat.name}</Text>
                              <Badge count={cat.modules.length} color="#1890ff" />
                            </div>
                          ))}
                        </div>
                      </Card>
                    </Col>
                    <Col xs={24} md={12}>
                      <Card 
                        size="small" 
                        title="Résumé global"
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #f0f0f0',
                          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
                          borderRadius: '8px'
                        }}
                      >
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <div>
                            <Text>Catégories globales: </Text>
                            <Text strong>{stats.globalCategories}</Text>
                          </div>
                          <div>
                            <Text>Catégories d'organisation: </Text>
                            <Text strong>{stats.orgCategories}</Text>
                          </div>
                          <div>
                            <Text>Modules actifs: </Text>
                            <Text strong>{stats.activeModules}/{stats.totalModules}</Text>
                          </div>
                          <div>
                            <Text>Taux d'activation: </Text>
                            <Text strong>
                              {stats.totalModules > 0 ? 
                                Math.round((stats.activeModules / stats.totalModules) * 100) : 0}%
                            </Text>
                          </div>
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>

        {/* 🎨 DRAWER CATÉGORIE */}
        <Drawer
          title={editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
          width={600}
          onClose={() => {
            setCategoryDrawerVisible(false);
            setEditingCategory(null);
            categoryForm.resetFields();
          }}
          open={categoryDrawerVisible}
          extra={
            <Space>
              <Button onClick={() => setCategoryDrawerVisible(false)}>
                Annuler
              </Button>
              <Button 
                type="primary"
                onClick={() => {
                  categoryForm.validateFields().then(values => {
                    if (editingCategory) {
                      handleUpdateCategory(values);
                    } else {
                      handleCreateCategory(values);
                    }
                  });
                }}
              >
                {editingCategory ? 'Modifier' : 'Créer'}
              </Button>
            </Space>
          }
        >
          <Form form={categoryForm} layout="vertical">
            <Form.Item
              name="name"
              label="Nom de la catégorie"
              rules={[{ required: true, message: 'Le nom est requis' }]}
            >
              <Input placeholder="Ex: Google Workspace" />
            </Form.Item>

            <Form.Item
              name="description"
              label={t('fields.description')}
            >
              <TextArea rows={3} placeholder="Description de la catégorie..." />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="icon"
                  label="Icône"
                  initialValue="AppstoreOutlined"
                >
                  <Select>
                    <Option value="AppstoreOutlined">
                      <AppstoreOutlined style={{ marginRight: 8 }} />AppstoreOutlined
                    </Option>
                    <Option value="FolderOutlined">
                      <FolderOutlined style={{ marginRight: 8 }} />FolderOutlined
                    </Option>
                    <Option value="SettingOutlined">
                      <SettingOutlined style={{ marginRight: 8 }} />SettingOutlined
                    </Option>
                    <Option value="TeamOutlined">
                      <TeamOutlined style={{ marginRight: 8 }} />TeamOutlined
                    </Option>
                    <Option value="UserOutlined">
                      <UserOutlined style={{ marginRight: 8 }} />UserOutlined
                    </Option>
                    <Option value="SafetyOutlined">
                      <SafetyOutlined style={{ marginRight: 8 }} />SafetyOutlined
                    </Option>
                    <Option value="CalendarOutlined">
                      <CalendarOutlined style={{ marginRight: 8 }} />CalendarOutlined
                    </Option>
                    <Option value="MailOutlined">
                      <MailOutlined style={{ marginRight: 8 }} />MailOutlined
                    </Option>
                    <Option value="PhoneOutlined">
                      <PhoneOutlined style={{ marginRight: 8 }} />PhoneOutlined
                    </Option>
                    <Option value="CloudOutlined">
                      <CloudOutlined style={{ marginRight: 8 }} />CloudOutlined
                    </Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="iconColor"
                  label={t('fields.color')}
                  initialValue="#1890ff"
                >
                  <ColorPicker showText />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="order"
                  label="Ordre d'affichage"
                  initialValue={1}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="active"
                  label={t('fields.status')}
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="superAdminOnly"
              label="Réservé aux Super Administrateurs"
              valuePropName="checked"
              initialValue={false}
            >
              <Switch 
                checkedChildren={<CrownOutlined />} 
                unCheckedChildren="Normal"
              />
            </Form.Item>
          </Form>
        </Drawer>

        {/* 🎨 DRAWER MODULE */}
        <Drawer
          title={editingModule ? 'Modifier le module' : 'Nouveau module'}
          width={600}
          onClose={() => {
            setModuleDrawerVisible(false);
            setEditingModule(null);
            moduleForm.resetFields();
          }}
          open={moduleDrawerVisible}
          extra={
            <Space>
              <Button onClick={() => setModuleDrawerVisible(false)}>
                Annuler
              </Button>
              <Button 
                type="primary"
                onClick={() => {
                  moduleForm.validateFields().then(values => {
                    if (editingModule) {
                      handleUpdateModule(values);
                    } else {
                      handleCreateModule(values);
                    }
                  });
                }}
              >
                {editingModule ? 'Modifier' : 'Créer'}
              </Button>
            </Space>
          }
        >
          <Form form={moduleForm} layout="vertical">
            <Form.Item
              name="name"
              label="Nom du module"
              rules={[{ required: true, message: 'Le nom est requis' }]}
            >
              <Input placeholder="Ex: Gestion des contacts" />
            </Form.Item>

            <Form.Item
              name="description"
              label={t('fields.description')}
            >
              <TextArea rows={3} placeholder="Description du module..." />
            </Form.Item>

            <Form.Item
              name="path"
              label="Chemin d'accès"
              rules={[{ required: true, message: 'Le chemin est requis' }]}
            >
              <Input placeholder="Ex: /contacts" />
            </Form.Item>

            <Form.Item
              name="categoryId"
              label={t('fields.category')}
              rules={[{ required: true, message: 'La catégorie est requise' }]}
            >
              <Select placeholder="Sélectionner une catégorie">
                {categories.map(cat => (
                  <Option key={cat.id} value={cat.id}>
                    {cat.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="icon"
                  label="Icône"
                  initialValue="AppstoreOutlined"
                >
                  <Select>
                    <Option value="AppstoreOutlined">
                      <AppstoreOutlined style={{ marginRight: 8 }} />AppstoreOutlined
                    </Option>
                    <Option value="FileOutlined">
                      <FileOutlined style={{ marginRight: 8 }} />FileOutlined
                    </Option>
                    <Option value="SettingOutlined">
                      <SettingOutlined style={{ marginRight: 8 }} />SettingOutlined
                    </Option>
                    <Option value="TeamOutlined">
                      <TeamOutlined style={{ marginRight: 8 }} />TeamOutlined
                    </Option>
                    <Option value="UserOutlined">
                      <UserOutlined style={{ marginRight: 8 }} />UserOutlined
                    </Option>
                    <Option value="CalendarOutlined">
                      <CalendarOutlined style={{ marginRight: 8 }} />CalendarOutlined
                    </Option>
                    <Option value="MailOutlined">
                      <MailOutlined style={{ marginRight: 8 }} />MailOutlined
                    </Option>
                    <Option value="PhoneOutlined">
                      <PhoneOutlined style={{ marginRight: 8 }} />PhoneOutlined
                    </Option>
                    <Option value="FormOutlined">
                      <FormOutlined style={{ marginRight: 8 }} />FormOutlined
                    </Option>
                    <Option value="DashboardOutlined">
                      <DashboardOutlined style={{ marginRight: 8 }} />DashboardOutlined
                    </Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="order"
                  label="Ordre d'affichage"
                  initialValue={1}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="active"
                  label={t('fields.status')}
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Switch checkedChildren="Actif" unCheckedChildren="Inactif" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="superAdminOnly"
                  label="Super Admin uniquement"
                  valuePropName="checked"
                  initialValue={false}
                >
                  <Switch 
                    checkedChildren={<CrownOutlined />} 
                    unCheckedChildren="Normal"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Drawer>

      </div>
    </DndProvider>
  );
};

export default AdminModulesV2;
