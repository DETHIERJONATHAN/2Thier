import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Typography, Spin, Table, Button, Input, Space, Breadcrumb, Modal, Form, message, Progress, Tooltip, Empty, Tabs, List, Grid } from 'antd';
import { 
  CloudOutlined, 
  FolderOutlined, 
  FileOutlined, 
  ReloadOutlined,
  FolderAddOutlined,
  DeleteOutlined,
  LinkOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
  TeamOutlined,
  UserOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileZipOutlined,
  VideoCameraOutlined,
  SoundOutlined,
  FileTextOutlined,
  CloudServerOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Title, Text } = Typography;
const { Search } = Input;
const { useBreakpoint } = Grid;

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  shared?: boolean;
}

interface SharedDrive {
  id: string;
  name: string;
}

interface StorageInfo {
  limit: string;
  usage: string;
  usageInDrive: string;
  usageInTrash: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
  driveId?: string; // Pour les Team Drives
}

type ViewMode = 'my-drive' | 'shared-with-me' | 'shared-drives';

const GoogleDrivePage: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const stableApi = useMemo(() => api, []);
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [sharedDrives, setSharedDrives] = useState<SharedDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [currentDriveId, setCurrentDriveId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: 'root', name: 'Mon Drive' }]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [createFolderVisible, setCreateFolderVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('my-drive');
  const [form] = Form.useForm();

  // Charger les fichiers de Mon Drive
  const loadFiles = useCallback(async (folderId: string = 'root') => {
    try {
      setLoading(true);
      const response = await stableApi.get(`/api/google-drive/files?folderId=${folderId}`);
      setFiles(response.files || []);
    } catch (error) {
      console.error('[GoogleDrive] Erreur chargement fichiers:', error);
      message.error('Erreur lors du chargement des fichiers');
    } finally {
      setLoading(false);
    }
  }, [stableApi]);

  // Charger les fichiers partagés avec moi
  const loadSharedFiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await stableApi.get('/api/google-drive/shared');
      setFiles(response.files || []);
    } catch (error) {
      console.error('[GoogleDrive] Erreur chargement fichiers partagés:', error);
      message.error('Erreur lors du chargement des fichiers partagés');
    } finally {
      setLoading(false);
    }
  }, [stableApi]);

  // Charger la liste des Drive partagés (Team Drives)
  const loadSharedDrives = useCallback(async () => {
    try {
      setLoading(true);
      const response = await stableApi.get('/api/google-drive/shared-drives');
      setSharedDrives(response.drives || []);
      setFiles([]); // Pas de fichiers, on affiche les drives
    } catch (error) {
      console.error('[GoogleDrive] Erreur chargement drives partagés:', error);
      message.error('Erreur lors du chargement des drives partagés');
    } finally {
      setLoading(false);
    }
  }, [stableApi]);

  // Charger les fichiers d'un Drive partagé
  const loadSharedDriveFiles = useCallback(async (driveId: string, folderId?: string) => {
    try {
      setLoading(true);
      const url = folderId 
        ? `/api/google-drive/shared-drives/${driveId}/files?folderId=${folderId}`
        : `/api/google-drive/shared-drives/${driveId}/files`;
      const response = await stableApi.get(url);
      setFiles(response.files || []);
    } catch (error) {
      console.error('[GoogleDrive] Erreur chargement fichiers drive partagé:', error);
      message.error('Erreur lors du chargement des fichiers');
    } finally {
      setLoading(false);
    }
  }, [stableApi]);

  // Charger les infos de stockage
  const loadStorageInfo = useCallback(async () => {
    try {
      const response = await stableApi.get('/api/google-drive/storage');
      setStorageInfo(response);
    } catch (error) {
      console.error('[GoogleDrive] Erreur chargement stockage:', error);
    }
  }, [stableApi]);

  // Rechercher des fichiers
  const handleSearch = async (value: string) => {
    if (!value.trim()) {
      handleRefresh();
      return;
    }
    
    try {
      setSearchLoading(true);
      const response = await stableApi.get(`/api/google-drive/search?q=${encodeURIComponent(value)}`);
      setFiles(response.files || []);
    } catch (error) {
      console.error('[GoogleDrive] Erreur recherche:', error);
      message.error('Erreur lors de la recherche');
    } finally {
      setSearchLoading(false);
    }
  };

  // Changer de mode de vue
  const handleViewModeChange = (mode: string) => {
    setViewMode(mode as ViewMode);
    setCurrentDriveId(null);
    
    if (mode === 'shared-with-me') {
      setBreadcrumb([{ id: 'shared', name: 'Partagés avec moi' }]);
      setCurrentFolderId('shared');
      loadSharedFiles();
    } else if (mode === 'shared-drives') {
      setBreadcrumb([{ id: 'drives', name: 'Drive partagés' }]);
      setCurrentFolderId('drives');
      loadSharedDrives();
    } else {
      setBreadcrumb([{ id: 'root', name: 'Mon Drive' }]);
      setCurrentFolderId('root');
      loadFiles('root');
    }
  };

  // Entrer dans un Drive partagé
  const enterSharedDrive = (drive: SharedDrive) => {
    setCurrentDriveId(drive.id);
    setCurrentFolderId(drive.id);
    setBreadcrumb([
      { id: 'drives', name: 'Drive partagés' },
      { id: drive.id, name: drive.name, driveId: drive.id }
    ]);
    loadSharedDriveFiles(drive.id);
  };

  // Naviguer dans un dossier
  const navigateToFolder = async (file: DriveFile) => {
    if (file.mimeType !== 'application/vnd.google-apps.folder') {
      // Ouvrir le fichier dans un nouvel onglet
      if (file.webViewLink) {
        window.open(file.webViewLink, '_blank');
      }
      return;
    }
    
    // Naviguer dans le dossier
    setCurrentFolderId(file.id);
    setBreadcrumb([...breadcrumb, { id: file.id, name: file.name, driveId: currentDriveId || undefined }]);
    
    if (currentDriveId) {
      // On est dans un Drive partagé
      loadSharedDriveFiles(currentDriveId, file.id);
    } else {
      loadFiles(file.id);
    }
  };

  // Naviguer via le breadcrumb
  const navigateToBreadcrumb = (item: BreadcrumbItem, index: number) => {
    if (item.id === 'shared') {
      setCurrentFolderId('shared');
      setCurrentDriveId(null);
      setBreadcrumb([{ id: 'shared', name: 'Partagés avec moi' }]);
      loadSharedFiles();
    } else if (item.id === 'drives') {
      setCurrentFolderId('drives');
      setCurrentDriveId(null);
      setBreadcrumb([{ id: 'drives', name: 'Drive partagés' }]);
      loadSharedDrives();
    } else if (item.driveId) {
      // Navigation dans un Drive partagé
      setCurrentFolderId(item.id);
      setCurrentDriveId(item.driveId);
      setBreadcrumb(breadcrumb.slice(0, index + 1));
      if (index === 1) {
        // C'est la racine du drive partagé
        loadSharedDriveFiles(item.driveId);
      } else {
        loadSharedDriveFiles(item.driveId, item.id);
      }
    } else {
      setCurrentFolderId(item.id);
      setBreadcrumb(breadcrumb.slice(0, index + 1));
      loadFiles(item.id);
    }
  };

  // Revenir en arrière
  const goBack = () => {
    if (breadcrumb.length > 1) {
      const newBreadcrumb = breadcrumb.slice(0, -1);
      const parentFolder = newBreadcrumb[newBreadcrumb.length - 1];
      
      if (parentFolder.id === 'shared') {
        setCurrentFolderId('shared');
        setCurrentDriveId(null);
        setBreadcrumb(newBreadcrumb);
        loadSharedFiles();
      } else if (parentFolder.id === 'drives') {
        setCurrentFolderId('drives');
        setCurrentDriveId(null);
        setBreadcrumb(newBreadcrumb);
        loadSharedDrives();
      } else if (parentFolder.driveId) {
        setCurrentFolderId(parentFolder.id);
        setCurrentDriveId(parentFolder.driveId);
        setBreadcrumb(newBreadcrumb);
        if (newBreadcrumb.length === 2) {
          // Retour à la racine du drive partagé
          loadSharedDriveFiles(parentFolder.driveId);
        } else {
          loadSharedDriveFiles(parentFolder.driveId, parentFolder.id);
        }
      } else {
        setCurrentFolderId(parentFolder.id);
        setBreadcrumb(newBreadcrumb);
        loadFiles(parentFolder.id);
      }
    }
  };

  // Créer un dossier
  const handleCreateFolder = async (values: { name: string }) => {
    try {
      await stableApi.post('/api/google-drive/folders', {
        name: values.name,
        parentId: currentFolderId === 'shared' || currentFolderId === 'drives' ? 'root' : currentFolderId,
      });
      message.success('Dossier créé avec succès');
      setCreateFolderVisible(false);
      form.resetFields();
      handleRefresh();
    } catch (error) {
      console.error('[GoogleDrive] Erreur création dossier:', error);
      message.error('Erreur lors de la création du dossier');
    }
  };

  // Supprimer un fichier
  const handleDelete = async (file: DriveFile) => {
    Modal.confirm({
      title: 'Supprimer ce fichier ?',
      content: `"${file.name}" sera déplacé vers la corbeille.`,
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await stableApi.delete(`/api/google-drive/files/${file.id}`);
          message.success('Fichier mis à la corbeille');
          handleRefresh();
        } catch (error) {
          console.error('[GoogleDrive] Erreur suppression:', error);
          message.error('Erreur lors de la suppression');
        }
      },
    });
  };

  // Actualiser
  const handleRefresh = useCallback(() => {
    if (viewMode === 'shared-drives') {
      if (currentDriveId) {
        if (breadcrumb.length === 2) {
          loadSharedDriveFiles(currentDriveId);
        } else {
          loadSharedDriveFiles(currentDriveId, currentFolderId);
        }
      } else {
        loadSharedDrives();
      }
    } else if (viewMode === 'shared-with-me') {
      if (breadcrumb.length === 1) {
        loadSharedFiles();
      } else {
        loadFiles(currentFolderId);
      }
    } else {
      loadFiles(currentFolderId);
    }
  }, [viewMode, currentDriveId, currentFolderId, breadcrumb.length, loadSharedDriveFiles, loadSharedDrives, loadSharedFiles, loadFiles]);

  // Formater la taille
  const formatSize = (bytes?: string) => {
    if (!bytes) return '-';
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Formater la date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isMobile) {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Obtenir l'icône du fichier selon le type MIME
  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <FolderOutlined className="text-yellow-500 text-xl" />;
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return <FileWordOutlined className="text-blue-600 text-xl" />;
    }
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return <FileExcelOutlined className="text-green-600 text-xl" />;
    }
    if (mimeType.includes('pdf')) {
      return <FilePdfOutlined className="text-red-500 text-xl" />;
    }
    if (mimeType.includes('image')) {
      return <FileImageOutlined className="text-purple-500 text-xl" />;
    }
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) {
      return <FileZipOutlined className="text-orange-500 text-xl" />;
    }
    if (mimeType.includes('video')) {
      return <VideoCameraOutlined className="text-pink-500 text-xl" />;
    }
    if (mimeType.includes('audio')) {
      return <SoundOutlined className="text-cyan-500 text-xl" />;
    }
    if (mimeType.includes('text') || mimeType.includes('presentation')) {
      return <FileTextOutlined className="text-gray-500 text-xl" />;
    }
    return <FileOutlined className="text-blue-500 text-xl" />;
  };

  // Calculer le pourcentage de stockage
  const getStoragePercentage = () => {
    if (!storageInfo?.limit || !storageInfo?.usage) return 0;
    const limit = parseInt(storageInfo.limit);
    const usage = parseInt(storageInfo.usage);
    if (limit === 0) return 0;
    return Math.round((usage / limit) * 100);
  };

  useEffect(() => {
    loadFiles('root');
    loadStorageInfo();
  }, [loadFiles, loadStorageInfo]);

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: DriveFile) => (
        <div 
          className="flex items-center gap-2 cursor-pointer hover:text-blue-500 py-1" 
          onClick={() => navigateToFolder(record)}
        >
          {getFileIcon(record.mimeType)}
          <span className="truncate max-w-xs md:max-w-md lg:max-w-lg">{name}</span>
          {record.shared && (
            <Tooltip title="Partagé">
              <TeamOutlined className="text-gray-400 text-sm" />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Modifié',
      dataIndex: 'modifiedTime',
      key: 'modifiedTime',
      width: 150,
      responsive: ['md'] as const,
      render: (date: string) => <span className="text-gray-500 text-sm">{formatDate(date)}</span>,
    },
    {
      title: 'Taille',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      responsive: ['lg'] as const,
      render: (size: string) => <span className="text-gray-500 text-sm">{formatSize(size)}</span>,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: DriveFile) => (
        <Space size="small">
          {record.webViewLink && (
            <Tooltip title="Ouvrir">
              <Button
                type="text"
                size="small"
                icon={<LinkOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(record.webViewLink, '_blank');
                }}
              />
            </Tooltip>
          )}
          <Tooltip title="Supprimer">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(record);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Rendu mobile avec List
  const renderMobileList = () => (
    <List
      dataSource={files}
      renderItem={(file) => (
        <List.Item
          className="cursor-pointer hover:bg-gray-50 px-2"
          onClick={() => navigateToFolder(file)}
          actions={[
            file.webViewLink && (
              <Button
                key="open"
                type="text"
                size="small"
                icon={<LinkOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(file.webViewLink, '_blank');
                }}
              />
            ),
            <Button
              key="delete"
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(file);
              }}
            />,
          ].filter(Boolean)}
        >
          <List.Item.Meta
            avatar={getFileIcon(file.mimeType)}
            title={
              <span className="flex items-center gap-1">
                <span className="truncate max-w-[200px]">{file.name}</span>
                {file.shared && <TeamOutlined className="text-gray-400 text-xs" />}
              </span>
            }
            description={
              <span className="text-xs text-gray-400">
                {formatDate(file.modifiedTime)}
                {file.size && ` • ${formatSize(file.size)}`}
              </span>
            }
          />
        </List.Item>
      )}
    />
  );

  return (
    <div className="h-full flex flex-col p-2 md:p-4">
      {/* Header */}
      <div className="mb-3 md:mb-4">
        <Title level={isMobile ? 4 : 2} className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
          <CloudOutlined className="text-green-500" />
          Google Drive
        </Title>
        {!isMobile && (
          <Text className="text-gray-600">
            Accédez à vos fichiers et dossiers Google Drive
          </Text>
        )}
      </div>

      {/* Onglets Mon Drive / Partagés avec moi / Drive partagés */}
      <Tabs
        activeKey={viewMode}
        onChange={handleViewModeChange}
        className="mb-2 md:mb-4"
        size={isMobile ? 'small' : 'middle'}
        items={[
          {
            key: 'my-drive',
            label: (
              <span className="flex items-center gap-1 md:gap-2">
                <UserOutlined />
                {isMobile ? 'Mon Drive' : 'Mon Drive'}
              </span>
            ),
          },
          {
            key: 'shared-with-me',
            label: (
              <span className="flex items-center gap-1 md:gap-2">
                <TeamOutlined />
                {isMobile ? 'Partagés' : 'Partagés avec moi'}
              </span>
            ),
          },
          {
            key: 'shared-drives',
            label: (
              <span className="flex items-center gap-1 md:gap-2">
                <CloudServerOutlined />
                {isMobile ? 'Drives' : 'Drive partagés'}
              </span>
            ),
          },
        ]}
      />

      {/* Barre de stockage */}
      {storageInfo && (
        <Card className="mb-2 md:mb-4" size="small" bodyStyle={{ padding: isMobile ? '8px 12px' : '12px 16px' }}>
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
            <Text strong className="text-xs md:text-sm">Stockage :</Text>
            <Progress 
              percent={getStoragePercentage()} 
              size="small" 
              className="flex-1 min-w-[100px] max-w-xs"
              status={getStoragePercentage() > 90 ? 'exception' : 'normal'}
              showInfo={!isMobile}
            />
            <Text className="text-gray-500 text-xs md:text-sm whitespace-nowrap">
              {formatSize(storageInfo.usage)} / {formatSize(storageInfo.limit)}
            </Text>
          </div>
        </Card>
      )}

      {/* Barre d'outils */}
      <Card className="mb-2 md:mb-4" size="small" bodyStyle={{ padding: isMobile ? '8px' : '12px 16px' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          {/* Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={goBack}
              disabled={breadcrumb.length <= 1}
              size={isMobile ? 'small' : 'middle'}
            >
              {!isMobile && 'Retour'}
            </Button>
            <Breadcrumb className="whitespace-nowrap">
              {breadcrumb.map((item, index) => (
                <Breadcrumb.Item key={item.id}>
                  <span
                    className={`text-xs md:text-sm ${index < breadcrumb.length - 1 ? 'cursor-pointer hover:text-blue-500' : ''}`}
                    onClick={() => index < breadcrumb.length - 1 && navigateToBreadcrumb(item, index)}
                  >
                    {index === 0 ? (item.id === 'shared' ? <TeamOutlined /> : <HomeOutlined />) : (
                      <span className="max-w-[80px] md:max-w-[150px] truncate inline-block align-bottom">
                        {item.name}
                      </span>
                    )}
                  </span>
                </Breadcrumb.Item>
              ))}
            </Breadcrumb>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Search
              placeholder="Rechercher..."
              onSearch={handleSearch}
              loading={searchLoading}
              allowClear
              size={isMobile ? 'small' : 'middle'}
              className="w-full md:w-[200px]"
            />
            <div className="flex gap-1">
              {viewMode === 'my-drive' && (
                <Button
                  icon={<FolderAddOutlined />}
                  onClick={() => setCreateFolderVisible(true)}
                  size={isMobile ? 'small' : 'middle'}
                >
                  {!isMobile && 'Nouveau'}
                </Button>
              )}
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                size={isMobile ? 'small' : 'middle'}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Liste des fichiers ou drives partagés */}
      <Card className="flex-1 overflow-hidden" bodyStyle={{ padding: isMobile ? '0' : '12px', height: '100%', overflow: 'auto' }}>
        {loading ? (
          <div className="flex items-center justify-center h-48 md:h-64">
            <Spin size={isMobile ? 'default' : 'large'} />
          </div>
        ) : viewMode === 'shared-drives' && !currentDriveId ? (
          // Afficher la liste des drives partagés
          sharedDrives.length === 0 ? (
            <Empty 
              description="Aucun drive partagé disponible" 
              className="py-8"
            />
          ) : (
            <List
              dataSource={sharedDrives}
              renderItem={(drive) => (
                <List.Item
                  className="cursor-pointer hover:bg-gray-50 px-4"
                  onClick={() => enterSharedDrive(drive)}
                >
                  <List.Item.Meta
                    avatar={<CloudServerOutlined className="text-blue-500 text-2xl" />}
                    title={<span className="font-medium">{drive.name}</span>}
                    description="Drive partagé"
                  />
                </List.Item>
              )}
            />
          )
        ) : files.length === 0 ? (
          <Empty 
            description={
              viewMode === 'shared-with-me' 
                ? "Aucun fichier partagé avec vous" 
                : viewMode === 'shared-drives'
                  ? "Aucun fichier dans ce drive partagé"
                  : "Aucun fichier dans ce dossier"
            } 
            className="py-8"
          />
        ) : isMobile ? (
          renderMobileList()
        ) : (
          <Table
            dataSource={files}
            columns={columns}
            rowKey="id"
            pagination={{ 
              pageSize: 20, 
              showSizeChanger: true,
              size: 'small',
              showTotal: (total) => `${total} fichiers`
            }}
            size="small"
            scroll={{ x: true }}
          />
        )}
      </Card>

      {/* Modal création dossier */}
      <Modal
        title="Créer un nouveau dossier"
        open={createFolderVisible}
        onCancel={() => {
          setCreateFolderVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={isMobile ? '90%' : 400}
      >
        <Form form={form} onFinish={handleCreateFolder} layout="vertical">
          <Form.Item
            name="name"
            label="Nom du dossier"
            rules={[{ required: true, message: 'Veuillez entrer un nom' }]}
          >
            <Input placeholder="Nouveau dossier" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default GoogleDrivePage;
