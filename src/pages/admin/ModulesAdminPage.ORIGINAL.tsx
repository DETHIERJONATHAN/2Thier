import React, { useState, useEffect, useMemo } from 'react';
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
  Modal
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  ExportOutlined,
  ImportOutlined,
  DragOutlined,
  MoreOutlined,
  FormOutlined,
  CustomerServiceOutlined,
  GoogleOutlined,
  CrownOutlined,
  MessageOutlined,
  BulbOutlined,
  ShopOutlined,
  UserOutlined,
  FileTextOutlined,
  ToolOutlined,
  SafetyOutlined,
  TeamOutlined,
  BankOutlined,
  CalendarOutlined,
  MailOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { useModuleCategories } from '../../hooks/useModuleCategories'; // âœ… Nouveau hook categories

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

// Liste des icÃ´nes disponibles pour les modules
const AVAILABLE_ICONS = [
  'AppstoreOutlined',
  'UserOutlined',
  'TeamOutlined',
  'CalendarOutlined',
  'MailOutlined',
  'PhoneOutlined',
  'FileTextOutlined',
  'FormOutlined',
  'CustomerServiceOutlined',
  'GoogleOutlined',
  'ToolOutlined',
  'SafetyOutlined',
  'BankOutlined',
  'ShopOutlined',
  'BulbOutlined',
  'MessageOutlined',
  'CrownOutlined',
  'SettingOutlined',
  'PlusOutlined',
  'EditOutlined',
  'DeleteOutlined',
  'ReloadOutlined',
  'ExportOutlined',
  'ImportOutlined',
  'DragOutlined',
  'MoreOutlined'
];

// Interface pour les donnÃ©es de module complÃ¨tes
interface ModuleData {
  id: string;
  key: string;
  label: string;
  feature: string;
  icon?: string;
  route?: string;
  description?: string;
  page?: string;
  category?: string;
  categoryIcon?: string;
  categoryColor?: string;
  order?: number;
  orderInCategory?: number;
  active: boolean;
  superAdminOnly?: boolean; // ðŸ‘‘ Module rÃ©servÃ© aux super administrateurs
  parameters?: any;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
  Organization?: any;
  OrganizationModuleStatus?: any[];
  Permission?: any[];
  isActiveInOrg?: boolean;
  hasOrgSpecificConfig?: boolean;
}

interface CategoryData {
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  categoryOrder: number;
  superAdminOnly?: boolean; // ðŸ‘‘ Category rÃ©servÃ©e aux super administrateurs
  modules: ModuleData[];
}

interface AdminModulesResponse {
  success: boolean;
  data: {
    categories: CategoryData[];
    totalModules: number;
    totalCategories: number;
  };
}

interface MetadataResponse {
  success: boolean;
  data: {
    availableIcons: string[];
    availableColors: string[];
    existingCategories: Array<{
      category: string;
      categoryIcon: string;
      categoryColor: string;
    }>;
  };
}

// Composant pour rendre une icÃ´ne Ã  partir de son nom
const IconRenderer: React.FC<{ iconName: string; style?: React.CSSProperties }> = ({ iconName, style }) => {
  const iconMap: Record<string, React.ComponentType> = {
    AppstoreOutlined,
    FormOutlined,
    CustomerServiceOutlined,
    GoogleOutlined,
    MessageOutlined,
    BulbOutlined,
    ShopOutlined,
    UserOutlined,
    FileTextOutlined,
    ToolOutlined,
    SafetyOutlined,
    TeamOutlined,
    BankOutlined,
    CalendarOutlined,
    MailOutlined,
    PhoneOutlined,
    SettingOutlined,
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
    DragOutlined
  };

  const IconComponent = iconMap[iconName] || AppstoreOutlined;
  return <IconComponent style={style} />;
};

const AdminModulesPageDynamic: React.FC = () => {
  // ✅ États restants (pas gérés par le hook)
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // âœ… Nouveau hook pour Categories (remplace l'ancien systÃ¨me de sections)
  const {
    categories: allCategories,
    modules,
    availableIcons,
    availableColors,
    loading,
    error,
    loadCategories,
    loadModules,
    toggleCategoryActive,
    deleteCategory,
    addCategory,
    setModules
  } = useModuleCategories();
  
  // Hooks d'authentification
  const { api } = useAuthenticatedApi();
  const { user, selectedOrganization } = useAuth();
  const [form] = Form.useForm();

  // Ã‰tats pour les fonctionnalitÃ©s avancÃ©es
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['all']);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  
  // Ã‰tats pour le glisser-dÃ©poser
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [draggedModule, setDraggedModule] = useState<ModuleData | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  
  // Ã‰tats pour les actions sur les catÃ©gories
  const [editingCategoryModal, setEditingCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);

  useEffect(() => {
    loadModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrganization?.id]);

  // Debug effect pour tracer les changements d'Ã©tat
  useEffect(() => {
    console.log('[ADMIN-MODULES-UI] ðŸ” Ã‰tat categories changÃ©:', {
      length: allCategories.length,
      categories: allCategories.map(c => ({ name: c.name, active: c.active }))
    });
  }, [allCategories]);

  useEffect(() => {
    console.log('[ADMIN-MODULES-UI] ðŸ” Ã‰tat loading changÃ©:', loading);
  }, [loading]);

  // Fonctions CRUD
  const handleSaveModule = async (values: any) => {
    try {
      const isEditing = !!editingModule;
      const endpoint = isEditing 
        ? `/api/admin-modules/${editingModule.id}`
        : '/api/admin-modules';
      
      const method = isEditing ? 'put' : 'post';
      
      await api[method](endpoint, {
        ...values,
        organizationId: values.organizationId || null
      });
      
      message.success(`Module ${isEditing ? 'mis Ã  jour' : 'crÃ©Ã©'} avec succÃ¨s`);
      setDrawerVisible(false);
      setEditingModule(null);
      form.resetFields();
      loadModules();
    } catch (error: any) {
      console.error('[ADMIN-MODULES-UI] Erreur sauvegarde:', error);
      message.error(error.response?.data?.error || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteModule = async (module: ModuleData) => {
    try {
      await api.delete(`/api/admin-modules/${module.id}`);
      message.success('Module supprimÃ© avec succÃ¨s');
      loadModules();
    } catch (error: any) {
      console.error('[ADMIN-MODULES-UI] Erreur suppression:', error);
      message.error(error.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  // Fonctions d'interface
  const openCreateDrawer = () => {
    setEditingModule(null);
    form.resetFields();
    setDrawerVisible(true);
  };

  const openEditDrawer = (module: ModuleData) => {
    setEditingModule(module);
    form.setFieldsValue({
      ...module,
      parameters: module.parameters ? JSON.stringify(module.parameters, null, 2) : ''
    });
    setDrawerVisible(true);
  };

  // Gestion des catÃ©gories
  const [categoryForm] = Form.useForm();
  
  const openCategoryModal = () => {
    categoryForm.resetFields();
    setCategoryModalVisible(true);
  };

  // Fonctions de glisser-dÃ©poser CATÃ‰GORIES
  const handleCategoryDragStart = (e: React.DragEvent, categoryName: string) => {
    setDraggedCategory(categoryName);
    e.dataTransfer.setData('text/plain', `category:${categoryName}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleModuleDragStart = (e: React.DragEvent, module: ModuleData) => {
    setDraggedModule(module);
    e.dataTransfer.setData('text/plain', `module:${module.id}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCategoryDragOver = (e: React.DragEvent, targetCategoryName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCategory(targetCategoryName);
  };

  const handleCategoryDrop = async (e: React.DragEvent, targetCategoryName: string) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    
    if (data.startsWith('category:')) {
      const sourceCategoryName = data.replace('category:', '');
      await reorderCategories(sourceCategoryName, targetCategoryName);
    } else if (data.startsWith('module:')) {
      const moduleId = data.replace('module:', '');
      
      // VÃ©rifier si le module est dÃ©placÃ© vers une autre catÃ©gorie ou rÃ©ordonnÃ© dans la mÃªme catÃ©gorie
      const draggedModule = allCategories.flatMap(c => c.modules).find(m => m.id === moduleId);
      const currentCategory = allCategories.find(c => c.modules.some(m => m.id === moduleId));
      
      if (!draggedModule || !currentCategory) {
        console.error('[DRAG-DROP] Module ou catÃ©gorie non trouvÃ©e');
        return;
      }
      
      if (currentCategory.name !== targetCategoryName) {
        // DÃ©placement vers une autre catÃ©gorie
        await moveModuleToCategory(moduleId, targetCategoryName);
      } else {
        // RÃ©ordonnancement dans la mÃªme catÃ©gorie - sera gÃ©rÃ© par handleModuleDrop
        console.log('[DRAG-DROP] RÃ©ordonnancement dans la mÃªme catÃ©gorie - pas d\'action');
      }
    }
    
    setDraggedCategory(null);
    setDraggedModule(null);
    setDragOverCategory(null);
  };

  // Nouvelle fonction pour gÃ©rer le drop des modules sur d'autres modules (rÃ©ordonnancement)
  const handleModuleDrop = async (e: React.DragEvent, targetModule: ModuleData) => {
    e.preventDefault();
    e.stopPropagation(); // EmpÃªcher la propagation vers handleCategoryDrop
    
    const data = e.dataTransfer.getData('text/plain');
    
    if (data.startsWith('module:')) {
      const sourceModuleId = data.replace('module:', '');
      
      // Trouver les modules source et target
      const targetCategory = allCategories.find(s => s.modules.some(m => m.id === targetModule.id));
      const sourceModule = allCategories.flatMap(s => s.modules).find(m => m.id === sourceModuleId);
      
      if (!targetCategory || !sourceModule) {
        console.error('[DRAG-DROP] Module source ou target non trouvÃ©');
        return;
      }
      
      const sourceCategory = allCategories.find(s => s.modules.some(m => m.id === sourceModuleId));
      
      if (sourceCategory?.name === targetCategory.name) {
        // RÃ©ordonnancement dans la mÃªme catÃ©gorie
        await reorderModulesInCategory(sourceCategory.name, sourceModuleId, targetModule.id);
      } else {
        // DÃ©placement vers une autre catÃ©gorie (dÃ©jÃ  gÃ©rÃ© par handleCategoryDrop)
        await moveModuleToCategory(sourceModuleId, targetCategory.name);
      }
    }
    
    setDraggedModule(null);
  };

  const reorderModulesInCategory = async (categoryName: string, sourceModuleId: string, targetModuleId: string) => {
    try {
      console.log('[DRAG-DROP] RÃ©ordonnancement modules:', sourceModuleId, '->', targetModuleId, 'dans', categoryName);
      
      const category = allCategories.find(c => c.name === categoryName);
      if (!category) return;
      
      const modules = [...category.modules];
      const sourceIndex = modules.findIndex(m => m.id === sourceModuleId);
      const targetIndex = modules.findIndex(m => m.id === targetModuleId);
      
      if (sourceIndex === -1 || targetIndex === -1) return;
      
      // RÃ©organiser localement
      const [removed] = modules.splice(sourceIndex, 1);
      modules.splice(targetIndex, 0, removed);
      
      // Sauvegarder en base
      const moduleIds = modules.map(m => m.id);
      const response = await api.put('/api/admin-modules/modules/reorder', {
        categoryName,
        moduleIds
      });
      
      if (response.success) {
        message.success('Ordre des modules sauvegardÃ© !');
        await loadCategories(); // Recharger pour avoir les nouveaux ordres
      } else {
        throw new Error('Erreur API lors de la sauvegarde');
      }
      
    } catch (error: any) {
      console.error('[DRAG-DROP] Erreur rÃ©ordonnancement modules:', error);
      message.error('Erreur lors du rÃ©ordonnancement des modules');
      await loadModules(); // Recharger en cas d'erreur
    }
  };

  // Nouvelles fonctions pour CATÃ‰GORIES utilisant le hook useModuleCategories
  const reorderCategories = async (sourceCategoryName: string, targetCategoryName: string) => {
    try {
      console.log('[DRAG-DROP] RÃ©organisation catÃ©gories:', sourceCategoryName, '->', targetCategoryName);
      // Cette logique sera implementÃ©e via le hook useModuleCategories
      message.info('RÃ©organisation des catÃ©gories Ã  implÃ©menter');
    } catch (error: any) {
      console.error('[DRAG-DROP] Erreur rÃ©organisation catÃ©gories:', error);
      message.error('Erreur lors de la rÃ©organisation des catÃ©gories');
    }
  };

  const moveModuleToCategory = async (moduleId: string, targetCategoryName: string) => {
    try {
      console.log('[DRAG-DROP] DÃ©placement module:', moduleId, '->', targetCategoryName);
      
      const response = await api.put(`/api/admin-modules/${moduleId}`, {
        category: targetCategoryName,
        organizationId: selectedOrganization?.id
      });
      
      if (response.success) {
        await loadCategories(); // Recharger les donnÃ©es
        message.success('Module dÃ©placÃ© avec succÃ¨s !');
      }
    } catch (error: any) {
      console.error('[DRAG-DROP] Erreur dÃ©placement module:', error);
      message.error('Erreur lors du dÃ©placement du module');
    }
  };

  // Actions sur les catÃ©gories
  const toggleCategoryVisibility = async (categoryName: string, isVisible: boolean) => {
    try {
      // Trouver tous les modules de cette catÃ©gorie
      const category = allCategories.find(c => c.name === categoryName);
      if (!category) {
        message.error('CatÃ©gorie introuvable');
        return;
      }

      // Mettre Ã  jour le statut de tous les modules de la catÃ©gorie
      const promises = category.modules.map(module => {
        if (!selectedOrganization?.id) return Promise.resolve();
        
        return api.post(`/api/admin-modules/${module.id}/organization/${selectedOrganization.id}/status`, {
          active: isVisible
        });
      });

      await Promise.all(promises);
      
      message.success(`Tous les modules de la catÃ©gorie "${categoryName}" ont Ã©tÃ© ${isVisible ? 'activÃ©s' : 'dÃ©sactivÃ©s'}`);
      
      // Recharger pour synchroniser avec la base
      await loadCategories();
    } catch (error: any) {
      console.error('[CATEGORY-ACTION] Erreur toggle visibilitÃ©:', error);
      message.error('Erreur lors du changement de visibilitÃ© de la catÃ©gorie');
    }
  };

  // Actions Super Admin
  const toggleModuleSuperAdminOnly = async (moduleId: string, superAdminOnly: boolean) => {
    try {
      // Appel API pour mettre Ã  jour en base
      await api.put(`/api/admin-modules/${moduleId}`, {
        superAdminOnly
      });

      message.success(`Module ${superAdminOnly ? 'rÃ©servÃ© aux' : 'accessible Ã  tous les'} super administrateurs`);
      
      // Recharger pour synchroniser
      await loadCategories();
    } catch (error: any) {
      console.error('[MODULE-SUPERADMIN] Erreur toggle:', error);
      message.error('Erreur lors du changement de statut Super Admin');
      
      // Recharger pour restaurer l'Ã©tat correct en cas d'erreur
      await loadCategories();
    }
  };

  const toggleCategorySuperAdminOnly = async (categoryName: string, superAdminOnly: boolean) => {
    try {
      // TODO: Mettre Ã  jour via le hook useModuleCategories
      console.log('[CATEGORY-SUPERADMIN] Toggle category:', categoryName, superAdminOnly);
      
      message.success(`CatÃ©gorie ${superAdminOnly ? 'rÃ©servÃ©e aux' : 'accessible Ã  tous les'} super administrateurs`);
    } catch (error: any) {
      console.error('[CATEGORY-SUPERADMIN] Erreur toggle:', error);
      message.error('Erreur lors du changement de statut Super Admin de la catÃ©gorie');
    }
  };

  const openEditCategoryModal = (category: CategoryData) => {
    setEditingCategory(category);
    categoryForm.setFieldsValue({
      categoryName: category.name,
      categoryIcon: category.icon,
      categoryColor: category.iconColor,
      categoryOrder: category.order
    });
    setCategoryModalVisible(true);
  };

  const handleCreateCategory = async (values: Record<string, unknown>) => {
    try {
      setLoading(true);
      const { name, description, icon, iconColor } = values;
      
      // Utiliser le hook addCategory pour créer une nouvelle catégorie
      await addCategory(name as string);
      
      message.success('Catégorie créée avec succès !');
      setCategoryModalVisible(false);
      categoryForm.resetFields();
    } catch (error: unknown) {
      console.error('[CATEGORY-CREATE] Erreur création:', error);
      message.error('Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async (values: Record<string, unknown>) => {
    try {
      setLoading(true);
      
      // TODO: ImplÃ©menter la modification de catÃ©gorie via useModuleCategories
      console.log('[CATEGORY-EDIT] Modification catÃ©gorie:', editingCategory?.name, values);
      
      message.success('CatÃ©gorie modifiÃ©e avec succÃ¨s !');
      setEditingCategoryModal(false);
      await loadModules();
    } catch (error: unknown) {
      console.error('[CATEGORY-EDIT] Erreur modification:', error);
      message.error('Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  // DonnÃ©es filtrÃ©es et calculs
  const filteredCategories = useMemo(() => {
    if (selectedCategory === 'all') return allCategories;
    return allCategories.filter(category => category.name === selectedCategory);
  }, [allCategories, selectedCategory]);

  const totalModules = allCategories.reduce((acc, category) => acc + (category.modules?.length || 0), 0);
  const activeModules = allCategories.reduce((acc, category) => 
    acc + (category.modules?.filter(m => m.active).length || 0), 0);

  // Rendu des colonnes pour la table
  const tableColumns = [
    {
      title: 'Module',
      key: 'module',
      render: (module: ModuleData) => (
        <Space>
          <Tag color={module.categoryColor}>{module.category}</Tag>
          <Text strong>{module.label}</Text>
          <Text type="secondary">({module.key})</Text>
        </Space>
      )
    },
    {
      title: 'Statut',
      key: 'status',
      render: (module: ModuleData) => (
        <Space>
          <Badge 
            status={module.active ? 'success' : 'error'} 
            text={module.active ? 'Actif' : 'Inactif'} 
          />
          {module.hasOrgSpecificConfig && (
            <Tag color="blue">Config Org</Tag>
          )}
          {module.superAdminOnly && (
            <Tag color="gold" icon={<CrownOutlined />}>Super Admin</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Ordre',
      dataIndex: 'order',
      key: 'order',
      width: 80,
      render: (order: number) => <Text>{order || '-'}</Text>
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (module: ModuleData) => (
        <Space>
          <Tooltip title={module.superAdminOnly ? "Accessible Ã  tous" : "RÃ©server aux Super Admin"}>
            <Button
              icon={<CrownOutlined />}
              size="small"
              type={module.superAdminOnly ? "primary" : "default"}
              onClick={() => toggleModuleSuperAdminOnly(module.id, !module.superAdminOnly)}
              style={{ 
                backgroundColor: module.superAdminOnly ? '#faad14' : undefined,
                borderColor: module.superAdminOnly ? '#faad14' : undefined 
              }}
            />
          </Tooltip>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => openEditDrawer(module)}
          />
          <Popconfirm
            title="Supprimer ce module ?"
            description="Cette action est irrÃ©versible."
            onConfirm={() => handleDeleteModule(module)}
            okText="Supprimer"
            cancelText="Annuler"
            okType="danger"
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Debug Box - Ã€ SUPPRIMER aprÃ¨s test */}
      <Alert
        message="ðŸ” DEBUG - Ã‰tat du chargement"
        description={
          <div>
            <div>Loading: {String(loading)}</div>
            <div>Categories count: {allCategories.length}</div>
            <div>Selected Organization: {selectedOrganization?.id || 'Non dÃ©finie'}</div>
            <div>Filtered Categories: {filteredCategories.length}</div>
          </div>
        }
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* En-tÃªte avec statistiques */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card>
            <Row gutter={16} align="middle">
              <Col flex={1}>
                <Title level={2} style={{ margin: 0 }}>
                  <AppstoreOutlined /> Administration des Modules - DYNAMIQUE
                </Title>
                <Text type="secondary">
                  Gestion complÃ¨te et scalable de tous les modules systÃ¨me
                </Text>
              </Col>
              <Col>
                <Space>
                  <Badge count={totalModules} showZero color="blue">
                    <Button>Total Modules</Button>
                  </Badge>
                  <Badge count={activeModules} showZero color="green">
                    <Button>Modules Actifs</Button>
                  </Badge>
                  <Badge count={allCategories.length} showZero color="purple">
                    <Button>CatÃ©gories</Button>
                  </Badge>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Barre d'actions */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openCreateDrawer}
                >
                  Nouveau Module
                </Button>
                <Button
                  type="dashed"
                  icon={<AppstoreOutlined />}
                  onClick={() => setCategoryModalVisible(true)}
                >
                  Nouvelle Section
                </Button>
                <Select
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  style={{ width: 200 }}
                  placeholder="Filtrer par catÃ©gorie"
                >
                  <Select.Option value="all">Toutes les catÃ©gories</Select.Option>
                  {allCategories.map(category => (
                    <Select.Option key={category.name} value={category.name}>
                      {category.name} ({category.modules?.length || 0})
                    </Select.Option>
                  ))}
                </Select>
                <Select
                  value={viewMode}
                  onChange={setViewMode}
                  style={{ width: 120 }}
                >
                  <Select.Option value="cards">Cartes</Select.Option>
                  <Select.Option value="table">Tableau</Select.Option>
                </Select>
              </Space>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={loadModules}>
                  Actualiser
                </Button>
                <Button icon={<ExportOutlined />}>
                  Exporter
                </Button>
                <Button icon={<ImportOutlined />}>
                  Importer
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Contenu principal - Vue Cards */}
      {viewMode === 'cards' && (
        <Collapse
          activeKey={expandedCategories}
          onChange={setExpandedCategories}
          size="large"
        >
          {filteredCategories.map(category => (
            <Panel
              key={category.name}
              header={
                <div 
                  draggable
                  onDragStart={(e) => handleCategoryDragStart(e, category.name)}
                  onDragOver={(e) => handleCategoryDragOver(e, category.name)}
                  onDrop={(e) => handleCategoryDrop(e, category.name)}
                  style={{
                    cursor: 'grab',
                    border: dragOverCategory === category.name ? `2px dashed ${category.color}` : 'none',
                    borderRadius: '4px',
                    padding: dragOverCategory === category.name ? '4px' : '0'
                  }}
                >
                  <Row justify="space-between" align="middle" style={{ width: '100%' }}>
                    <Col>
                      <Space>
                        <DragOutlined style={{ color: '#999', cursor: 'grab' }} />
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            backgroundColor: category.color,
                            borderRadius: '50%'
                          }}
                        />
                        <IconRenderer iconName={category.icon} />
                        <Text strong>{category.name}</Text>
                        {category.superAdminOnly && (
                          <Tag color="gold" icon={<CrownOutlined />} size="small">Super Admin</Tag>
                        )}
                        <Badge count={category.modules.length} />
                        <Text type="secondary">
                          Ordre: {category.order}
                        </Text>
                      </Space>
                    </Col>
                    <Col>
                      <Space onClick={(e) => e.stopPropagation()}>
                        <Switch
                          size="small"
                          checked={category.modules.some(m => m.isActiveInOrg ?? true)}
                          onChange={(checked) => {
                            toggleCategoryActive(category.id, checked);
                          }}
                          checkedChildren="ON"
                          unCheckedChildren="OFF"
                        />
                        <Tooltip title={category.superAdminOnly ? "Accessible Ã  tous" : "RÃ©server aux Super Admin"}>
                          <Button
                            type="text"
                            size="small"
                            icon={<CrownOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategorySuperAdminOnly(category.name, !category.superAdminOnly);
                            }}
                            style={{ 
                              color: category.superAdminOnly ? '#faad14' : '#8c8c8c' 
                            }}
                          />
                        </Tooltip>
                        <Tooltip title="Modifier la catÃ©gorie">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditSectionModal(section);
                            }}
                          />
                        </Tooltip>
                        <Tooltip title="Supprimer la section">
                          <Popconfirm
                            title={`ÃŠtes-vous sÃ»r de vouloir supprimer la section "${section.sectionName}" ?`}
                            description="Cette action ne peut pas Ãªtre annulÃ©e. Les modules seront dÃ©placÃ©s vers 'Non classÃ©'."
                            onConfirm={(e) => {
                              e?.stopPropagation();
                              deleteSection(section.sectionName);
                            }}
                            okText="Oui, supprimer"
                            cancelText="Annuler"
                          >
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Popconfirm>
                        </Tooltip>
                      </Space>
                    </Col>
                  </Row>
                </div>
              }
            >
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDragOverCategory(category.name);
                }}
                onDragLeave={(e) => {
                  // Ne rÃ©initialiser que si on sort vraiment de la zone
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverCategory(null);
                  }
                }}
                onDrop={(e) => handleCategoryDrop(e, category.name)}
                style={{
                  minHeight: '100px',
                  padding: '16px',
                  borderRadius: '8px',
                  border: dragOverCategory === category.name ? 
                    `2px dashed ${category.iconColor}` : 
                    `1px solid transparent`,
                  backgroundColor: dragOverCategory === category.name ? 
                    `${category.iconColor}10` : 
                    'transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <Row gutter={[16, 16]}>
                {section.modules.map(module => (
                  <Col xs={24} sm={12} md={8} lg={6} key={module.id}>
                    <Card
                      size="small"
                      draggable
                      onDragStart={(e) => handleModuleDragStart(e, module)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => handleModuleDrop(e, module)}
                      style={{
                        cursor: 'grab',
                        borderLeft: `4px solid ${category.iconColor}`,
                        height: '100%',
                        transition: 'all 0.2s ease',
                        ':hover': {
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }
                      }}
                      title={
                        <Space>
                          <DragOutlined style={{ color: '#999', cursor: 'grab' }} />
                          {module.icon && <IconRenderer iconName={module.icon} />}
                          <Text strong>{module.label}</Text>
                          {module.superAdminOnly && (
                            <Tag color="gold" icon={<CrownOutlined />} size="small">Super Admin</Tag>
                          )}
                        </Space>
                      }
                      extra={
                        <Space>
                          <Switch
                            size="small"
                            checked={module.isActiveInOrg ?? true}
                            onChange={(checked) => 
                              handleToggleModuleStatus(module, selectedOrganization?.id, checked)
                            }
                            checkedChildren="ON"
                            unCheckedChildren="OFF"
                          />
                          <Tooltip title={module.superAdminOnly ? "Accessible Ã  tous" : "RÃ©server aux Super Admin"}>
                            <Button
                              icon={<CrownOutlined />}
                              size="small"
                              type={module.superAdminOnly ? "primary" : "text"}
                              onClick={() => toggleModuleSuperAdminOnly(module.id, !module.superAdminOnly)}
                              style={{ 
                                backgroundColor: module.superAdminOnly ? '#faad14' : undefined,
                                borderColor: module.superAdminOnly ? '#faad14' : undefined 
                              }}
                            />
                          </Tooltip>
                          <Button
                            icon={<EditOutlined />}
                            size="small"
                            type="text"
                            onClick={() => openEditDrawer(module)}
                          />
                        </Space>
                      }
                    >
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text type="secondary">Key: {module.key}</Text>
                        <Text type="secondary">Feature: {module.feature}</Text>
                        {module.description && (
                          <Text type="secondary" ellipsis={{ tooltip: module.description }}>
                            {module.description}
                          </Text>
                        )}
                        <Space>
                          <Tag size="small">Ordre: {module.order || '-'}</Tag>
                          {module.route && <Tag size="small" color="blue">Route</Tag>}
                          {module.parameters && <Tag size="small" color="green">Config</Tag>}
                        </Space>
                        {selectedOrganization && (
                          <Switch
                            size="small"
                            checked={module.isActiveInOrg ?? true}
                            onChange={(checked) => 
                              handleToggleModuleStatus(module, selectedOrganization.id, checked)
                            }
                            checkedChildren="Actif"
                            unCheckedChildren="Inactif"
                          />
                        )}
                      </Space>
                    </Card>
                  </Col>
                ))}
                </Row>
              </div>
            </Panel>
          ))}
        </Collapse>
      )}

      {/* Contenu principal - Vue Table */}
      {viewMode === 'table' && (
        <Card>
          <Table
            columns={tableColumns}
            dataSource={filteredCategories.flatMap(section => section.modules)}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} sur ${total} modules`
            }}
          />
        </Card>
      )}

      {/* Drawer d'Ã©dition/crÃ©ation */}
      <Drawer
        title={editingModule ? `Modifier: ${editingModule.label}` : 'Nouveau Module'}
        width={720}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setEditingModule(null);
          form.resetFields();
        }}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>Annuler</Button>
            <Button type="primary" onClick={() => form.submit()}>
              {editingModule ? 'Modifier' : 'CrÃ©er'}
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveModule}
          scrollToFirstError
        >
          <Alert
            message="Configuration Dynamique"
            description="Tous les champs sont modifiables et scalables. Le systÃ¨me s'adapte automatiquement aux changements."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Divider>Informations de Base</Divider>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="ClÃ© Unique"
                name="key"
                rules={[{ required: true, message: 'ClÃ© obligatoire' }]}
                tooltip="Identifiant unique du module"
              >
                <Input placeholder="ex: mon-module" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Feature Unique"
                name="feature"
                rules={[{ required: true, message: 'Feature obligatoire' }]}
                tooltip="Nom de la fonctionnalitÃ© (doit Ãªtre unique)"
              >
                <Input placeholder="ex: my-feature" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Nom d'Affichage"
            name="label"
            rules={[{ required: true, message: 'Nom obligatoire' }]}
          >
            <Input placeholder="ex: Mon Super Module" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <TextArea rows={2} placeholder="Description du module..." />
          </Form.Item>

          <Divider>Section & Apparence</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Section" name="section">
                <Select
                  placeholder="Choisir ou crÃ©er"
                  allowClear
                  showSearch
                  mode="tags"
                  maxCount={1}
                >
                  {/* Options de sections seront chargÃ©es dynamiquement */}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="IcÃ´ne Section" name="sectionIcon">
                <Select placeholder="Choisir icÃ´ne" allowClear showSearch>
                  {availableIcons.map(iconData => (
                    <Select.Option key={iconData.name} value={iconData.name}>
                      <Space>
                        <IconRenderer iconName={iconData.name} />
                        {iconData.name}
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Couleur Section" name="sectionColor">
                <ColorPicker showText />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="IcÃ´ne Module" name="icon">
                <Select placeholder="Choisir icÃ´ne" allowClear showSearch>
                  {availableIcons.map(iconData => (
                    <Select.Option key={iconData.name} value={iconData.name}>
                      <Space>
                        <IconRenderer iconName={iconData.name} />
                        {iconData.name}
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Route" name="route">
                <Input placeholder="/ma-route" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Ordre & Configuration</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Ordre Global" name="order" tooltip="DÃ©termine l'ordre d'affichage">
                <InputNumber min={1} max={9999} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Ordre Section" name="orderInSection">
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Actif" name="active" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Page Composant" name="page">
            <Input placeholder="ex: MonModulePage" />
          </Form.Item>

          <Form.Item 
            label="ParamÃ¨tres JSON" 
            name="parameters"
            tooltip="Configuration personnalisÃ©e en JSON"
          >
            <TextArea
              rows={4}
              placeholder='{"param1": "value1", "param2": "value2"}'
            />
          </Form.Item>

          <Divider>Organisation</Divider>

          <Form.Item 
            label="Organisation SpÃ©cifique" 
            name="organizationId"
            tooltip="Laisser vide pour un module global"
          >
            <Input placeholder="UUID de l'organisation (optionnel)" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Modal de CrÃ©ation de Section */}
      <Modal
        title="ðŸŽ¨ CrÃ©er une Nouvelle Section"
        open={categoryModalVisible}
        onCancel={() => setCategoryModalVisible(false)}
        onOk={() => categoryForm.submit()}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={handleCreateCategory}
        >
          <Form.Item
            label="Nom de la Section"
            name="sectionName"
            rules={[
              { required: true, message: 'Le nom de la section est requis' },
              { min: 3, message: 'Le nom doit contenir au moins 3 caractÃ¨res' },
              { max: 50, message: 'Le nom ne peut pas dÃ©passer 50 caractÃ¨res' }
            ]}
          >
            <Input 
              placeholder="ex: Communications, Outils, Marketing..." 
              maxLength={50}
              showCount
            />
          </Form.Item>

          <Form.Item
            label="IcÃ´ne de Section"
            name="sectionIcon"
            rules={[{ required: true, message: 'Une icÃ´ne est requise' }]}
          >
            <Select 
              placeholder="Choisir une icÃ´ne"
              showSearch
              filterOption={(input, option) =>
                option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ||
                option?.value?.toString().toLowerCase().includes(input.toLowerCase())
              }
            >
              {availableIcons.map(iconData => (
                <Select.Option key={iconData.name} value={iconData.name}>
                  <Space>
                    <IconRenderer iconName={iconData.name} />
                    {icon}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Couleur de Section"
            name="sectionColor"
            initialValue="#1890ff"
          >
            <ColorPicker 
              showText 
              format="hex"
              presets={[
                {
                  label: 'RecommandÃ©es',
                  colors: availableColors
                }
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Ordre d'Affichage"
            name="sectionOrder"
            initialValue={1}
            tooltip="Position de la section dans le menu (plus petit = plus haut)"
          >
            <InputNumber 
              min={1} 
              max={100} 
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Alert
            message="Conseil"
            description="Une fois crÃ©Ã©e, vous pourrez assigner des modules existants Ã  cette section ou crÃ©er de nouveaux modules directement dans cette section."
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Form>
      </Modal>

      {/* Modal d'Ã‰dition de Section */}
      <Modal
        title={` Modifier la Catégorie "${editingCategory?.name}"`}
        open={editingCategoryModal}
        onCancel={() => setEditingCategoryModal(false)}
        onOk={() => categoryForm.submit()}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={handleEditCategory}
        >
          <Form.Item
            label="Nom de la Section"
            name="sectionName"
            rules={[
              { required: true, message: 'Le nom de la section est requis' },
              { min: 3, message: 'Le nom doit contenir au moins 3 caractÃ¨res' },
              { max: 50, message: 'Le nom ne peut pas dÃ©passer 50 caractÃ¨res' }
            ]}
          >
            <Input 
              placeholder="ex: Communications, Outils, Marketing..." 
              maxLength={50}
              showCount
            />
          </Form.Item>

          <Form.Item
            label="IcÃ´ne de Section"
            name="sectionIcon"
            rules={[{ required: true, message: 'Une icÃ´ne est requise' }]}
          >
            <Select 
              placeholder="Choisir une icÃ´ne"
              showSearch
              filterOption={(input, option) =>
                option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ||
                option?.value?.toString().toLowerCase().includes(input.toLowerCase())
              }
            >
              {availableIcons.map(iconData => (
                <Select.Option key={iconData.name} value={iconData.name}>
                  <Space>
                    <IconRenderer iconName={iconData.name} />
                    {icon}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Couleur de Section"
            name="sectionColor"
          >
            <ColorPicker 
              showText 
              format="hex"
              presets={[
                {
                  label: 'RecommandÃ©es',
                  colors: availableColors
                }
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Ordre d'Affichage"
            name="sectionOrder"
            tooltip="Position de la section dans le menu (plus petit = plus haut)"
          >
            <InputNumber 
              min={1} 
              max={100} 
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Alert
            message="Modification de Catégorie"
            description={`Vous modifiez la catégorie "${editingCategory?.name}" qui contient ${editingCategory?.modules?.length || 0} modules. Les modules resteront dans cette catégorie après modification.`}
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Form>
      </Modal>
    </div>
  );
};

export default AdminModulesPageDynamic;
