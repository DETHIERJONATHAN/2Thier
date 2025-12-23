import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Card, Typography, Spin, Table, Button, Input, Breadcrumb, Modal, Form, 
  message, Progress, Tooltip, Empty, Tabs, List, Grid, Dropdown, 
  Image, Segmented, Row, Col
} from 'antd';
import type { MenuProps } from 'antd';
import { 
  CloudOutlined, FolderOutlined, FileOutlined, ReloadOutlined, FolderAddOutlined,
  DeleteOutlined, LinkOutlined, HomeOutlined, ArrowLeftOutlined, TeamOutlined,
  UserOutlined, FileWordOutlined, FileExcelOutlined, FilePdfOutlined, FileImageOutlined,
  FileZipOutlined, VideoCameraOutlined, SoundOutlined, CloudServerOutlined,
  UploadOutlined, DownloadOutlined, EditOutlined, CopyOutlined, ScissorOutlined,
  ShareAltOutlined, StarOutlined, StarFilled, EyeOutlined, ClockCircleOutlined,
  AppstoreOutlined, BarsOutlined, PlusOutlined, MoreOutlined,
  UndoOutlined, ExclamationCircleOutlined, FilePptOutlined, ExportOutlined
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
  thumbnailLink?: string;
  shared?: boolean;
  starred?: boolean;
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
  driveId?: string;
}

type ViewMode = 'my-drive' | 'shared-with-me' | 'shared-drives' | 'recent' | 'starred' | 'trash';
type DisplayMode = 'list' | 'grid';

const GoogleDrivePageV2: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const stableApi = useMemo(() => api, [api]);
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // États principaux
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [sharedDrives, setSharedDrives] = useState<SharedDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [currentDriveId, setCurrentDriveId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: 'root', name: 'Mon Drive' }]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('my-drive');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('list');
  const [form] = Form.useForm();
  
  // États pour les modals
  const [createFolderVisible, setCreateFolderVisible] = useState(false);
  const [createDocVisible, setCreateDocVisible] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [moveVisible, setMoveVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [shareLink, setShareLink] = useState<string>('');
  const [selectedDestination, setSelectedDestination] = useState<string>('root');
  
  // États pour le drag & drop
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // État pour le modal de suppression
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<DriveFile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ============ FONCTIONS DE CHARGEMENT ============
  
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

  const loadSharedDrives = useCallback(async () => {
    try {
      setLoading(true);
      const response = await stableApi.get('/api/google-drive/shared-drives');
      setSharedDrives(response.drives || []);
      setFiles([]);
    } catch (error) {
      console.error('[GoogleDrive] Erreur chargement drives partagés:', error);
      message.error('Erreur lors du chargement des drives partagés');
    } finally {
      setLoading(false);
    }
  }, [stableApi]);

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

  const loadRecentFiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await stableApi.get('/api/google-drive/recent');
      setFiles(response.files || []);
    } catch (error) {
      console.error('[GoogleDrive] Erreur chargement fichiers récents:', error);
      message.error('Erreur lors du chargement des fichiers récents');
    } finally {
      setLoading(false);
    }
  }, [stableApi]);

  const loadStarredFiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await stableApi.get('/api/google-drive/starred');
      setFiles(response.files || []);
    } catch (error) {
      console.error('[GoogleDrive] Erreur chargement fichiers favoris:', error);
      message.error('Erreur lors du chargement des favoris');
    } finally {
      setLoading(false);
    }
  }, [stableApi]);

  const loadTrash = useCallback(async () => {
    try {
      setLoading(true);
      const response = await stableApi.get('/api/google-drive/trash');
      setFiles(response.files || []);
    } catch (error) {
      console.error('[GoogleDrive] Erreur chargement corbeille:', error);
      message.error('Erreur lors du chargement de la corbeille');
    } finally {
      setLoading(false);
    }
  }, [stableApi]);

  const loadStorageInfo = useCallback(async () => {
    try {
      const response = await stableApi.get('/api/google-drive/storage');
      setStorageInfo(response);
    } catch (error) {
      console.error('[GoogleDrive] Erreur chargement stockage:', error);
    }
  }, [stableApi]);

  // ============ HANDLERS ============
  
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

  const handleViewModeChange = (mode: string) => {
    setViewMode(mode as ViewMode);
    setCurrentDriveId(null);
    
    switch (mode) {
      case 'shared-with-me':
        setBreadcrumb([{ id: 'shared', name: 'Partagés avec moi' }]);
        setCurrentFolderId('shared');
        loadSharedFiles();
        break;
      case 'shared-drives':
        setBreadcrumb([{ id: 'drives', name: 'Drive partagés' }]);
        setCurrentFolderId('drives');
        loadSharedDrives();
        break;
      case 'recent':
        setBreadcrumb([{ id: 'recent', name: 'Récents' }]);
        setCurrentFolderId('recent');
        loadRecentFiles();
        break;
      case 'starred':
        setBreadcrumb([{ id: 'starred', name: 'Favoris' }]);
        setCurrentFolderId('starred');
        loadStarredFiles();
        break;
      case 'trash':
        setBreadcrumb([{ id: 'trash', name: 'Corbeille' }]);
        setCurrentFolderId('trash');
        loadTrash();
        break;
      default:
        setBreadcrumb([{ id: 'root', name: 'Mon Drive' }]);
        setCurrentFolderId('root');
        loadFiles('root');
    }
  };

  const enterSharedDrive = (drive: SharedDrive) => {
    setCurrentDriveId(drive.id);
    setCurrentFolderId(drive.id);
    setBreadcrumb([
      { id: 'drives', name: 'Drive partagés' },
      { id: drive.id, name: drive.name, driveId: drive.id }
    ]);
    loadSharedDriveFiles(drive.id);
  };

  const navigateToFolder = async (file: DriveFile) => {
    if (file.mimeType !== 'application/vnd.google-apps.folder') {
      if (file.webViewLink) {
        window.open(file.webViewLink, '_blank');
      }
      return;
    }
    
    setCurrentFolderId(file.id);
    setBreadcrumb([...breadcrumb, { id: file.id, name: file.name, driveId: currentDriveId || undefined }]);
    
    if (currentDriveId) {
      loadSharedDriveFiles(currentDriveId, file.id);
    } else {
      loadFiles(file.id);
    }
  };

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
      setCurrentFolderId(item.id);
      setCurrentDriveId(item.driveId);
      setBreadcrumb(breadcrumb.slice(0, index + 1));
      if (index === 1) {
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

  const goBack = () => {
    if (breadcrumb.length > 1) {
      navigateToBreadcrumb(breadcrumb[breadcrumb.length - 2], breadcrumb.length - 2);
    }
  };

  const handleRefresh = useCallback(() => {
    switch (viewMode) {
      case 'shared-drives':
        if (currentDriveId) {
          if (breadcrumb.length === 2) {
            loadSharedDriveFiles(currentDriveId);
          } else {
            loadSharedDriveFiles(currentDriveId, currentFolderId);
          }
        } else {
          loadSharedDrives();
        }
        break;
      case 'shared-with-me':
        if (breadcrumb.length === 1) {
          loadSharedFiles();
        } else {
          loadFiles(currentFolderId);
        }
        break;
      case 'recent':
        loadRecentFiles();
        break;
      case 'starred':
        loadStarredFiles();
        break;
      case 'trash':
        loadTrash();
        break;
      default:
        loadFiles(currentFolderId);
    }
  }, [viewMode, currentDriveId, currentFolderId, breadcrumb.length, loadSharedDriveFiles, loadSharedDrives, loadSharedFiles, loadFiles, loadRecentFiles, loadStarredFiles, loadTrash]);

  // ============ ACTIONS SUR FICHIERS ============

  const handleCreateFolder = async (values: { name: string }) => {
    try {
      await stableApi.post('/api/google-drive/folders', {
        name: values.name,
        parentId: ['shared', 'drives', 'recent', 'starred', 'trash'].includes(currentFolderId) ? 'root' : currentFolderId,
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

  const handleCreateDoc = async (values: { name: string; type: 'document' | 'spreadsheet' | 'presentation' }) => {
    try {
      const response = await stableApi.post('/api/google-drive/create-doc', {
        name: values.name,
        type: values.type,
        parentId: ['shared', 'drives', 'recent', 'starred', 'trash'].includes(currentFolderId) ? 'root' : currentFolderId,
      });
      message.success('Document créé avec succès');
      setCreateDocVisible(false);
      form.resetFields();
      handleRefresh();
      // Ouvrir le document
      if (response.webViewLink) {
        window.open(response.webViewLink, '_blank');
      }
    } catch (error) {
      console.error('[GoogleDrive] Erreur création document:', error);
      message.error('Erreur lors de la création du document');
    }
  };

  const handleDelete = async (file: DriveFile) => {
    console.log('[GoogleDrive] 🗑️ handleDelete appelé pour:', file.name);
    setFileToDelete(file);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    
    setDeleteLoading(true);
    try {
      if (viewMode === 'trash') {
        // Suppression définitive
        console.log('[GoogleDrive] 🗑️ Suppression définitive:', fileToDelete.id);
        await stableApi.delete(`/api/google-drive/files/${fileToDelete.id}/permanent`);
        message.success('Fichier supprimé définitivement');
      } else {
        // Mise à la corbeille
        console.log('[GoogleDrive] 🗑️ Mettre à la corbeille:', fileToDelete.id);
        await stableApi.delete(`/api/google-drive/files/${fileToDelete.id}`);
        message.success('Fichier mis à la corbeille');
      }
      handleRefresh();
    } catch (err) {
      console.error('[GoogleDrive] ❌ Erreur suppression:', err);
      message.error(viewMode === 'trash' ? 'Erreur lors de la suppression définitive' : 'Erreur lors de la mise à la corbeille');
    } finally {
      setDeleteLoading(false);
      setDeleteModalVisible(false);
      setFileToDelete(null);
    }
  };

  const handleRename = async (values: { name: string }) => {
    if (!selectedFile) return;
    try {
      console.log('[GoogleDrive] ✏️ Renommer:', selectedFile.id, '->', values.name);
      await stableApi.patch(`/api/google-drive/files/${selectedFile.id}/rename`, { name: values.name });
      message.success('Fichier renommé');
      setRenameVisible(false);
      form.resetFields();
      handleRefresh();
    } catch (err) {
      console.error('[GoogleDrive] ❌ Erreur renommage:', err);
      message.error('Erreur lors du renommage');
    }
  };

  const handleMove = async () => {
    if (!selectedFile) return;
    try {
      console.log('[GoogleDrive] 📦 Déplacer:', selectedFile.id, '->', selectedDestination);
      await stableApi.patch(`/api/google-drive/files/${selectedFile.id}/move`, { newParentId: selectedDestination });
      message.success('Fichier déplacé');
      setMoveVisible(false);
      handleRefresh();
    } catch (err) {
      console.error('[GoogleDrive] ❌ Erreur déplacement:', err);
      message.error('Erreur lors du déplacement');
    }
  };

  const handleCopy = async (file: DriveFile) => {
    try {
      console.log('[GoogleDrive] 📋 Copier:', file.id);
      await stableApi.post(`/api/google-drive/files/${file.id}/copy`);
      message.success('Fichier copié');
      handleRefresh();
    } catch (err) {
      console.error('[GoogleDrive] ❌ Erreur copie:', err);
      message.error('Erreur lors de la copie');
    }
  };

  const handleShare = async (file: DriveFile) => {
    setSelectedFile(file);
    try {
      console.log('[GoogleDrive] 🔗 Obtenir lien:', file.id);
      const response = await stableApi.get(`/api/google-drive/files/${file.id}/share`);
      setShareLink(response.webViewLink || '');
      setShareVisible(true);
    } catch (err) {
      console.error('[GoogleDrive] ❌ Erreur obtention lien:', err);
      message.error('Erreur lors de la récupération du lien');
    }
  };

  const handleMakePublic = async () => {
    if (!selectedFile) return;
    try {
      console.log('[GoogleDrive] 🌐 Rendre public:', selectedFile.id);
      const response = await stableApi.post(`/api/google-drive/files/${selectedFile.id}/make-public`);
      setShareLink(response.webViewLink);
      message.success('Lien de partage créé');
    } catch (err) {
      console.error('[GoogleDrive] ❌ Erreur partage public:', err);
      message.error('Erreur lors du partage');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    message.success('Lien copié !');
  };

  const handleToggleStar = async (file: DriveFile) => {
    try {
      console.log('[GoogleDrive] ⭐ Toggle favori:', file.id, !file.starred);
      await stableApi.patch(`/api/google-drive/files/${file.id}/star`, { starred: !file.starred });
      message.success(file.starred ? 'Retiré des favoris' : 'Ajouté aux favoris');
      handleRefresh();
    } catch (err) {
      console.error('[GoogleDrive] ❌ Erreur toggle favori:', err);
      message.error('Erreur lors de la mise à jour des favoris');
    }
  };

  const handleRestore = async (file: DriveFile) => {
    try {
      console.log('[GoogleDrive] ♻️ Restaurer:', file.id);
      await stableApi.post(`/api/google-drive/files/${file.id}/restore`);
      message.success('Fichier restauré');
      handleRefresh();
    } catch (err) {
      console.error('[GoogleDrive] ❌ Erreur restauration:', err);
      message.error('Erreur lors de la restauration');
    }
  };

  const handleEmptyTrash = () => {
    Modal.confirm({
      title: 'Vider la corbeille ?',
      icon: <ExclamationCircleOutlined />,
      content: 'Tous les fichiers seront supprimés définitivement.',
      okText: 'Vider la corbeille',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          console.log('[GoogleDrive] 🗑️ Vider la corbeille');
          await stableApi.delete('/api/google-drive/trash');
          message.success('Corbeille vidée');
          handleRefresh();
        } catch (err) {
          console.error('[GoogleDrive] ❌ Erreur vidage corbeille:', err);
          message.error('Erreur lors du vidage de la corbeille');
        }
      },
    });
  };

  const handleDownload = async (file: DriveFile) => {
    try {
      console.log('[GoogleDrive] ⬇️ Télécharger:', file.id);
      const response = await stableApi.get(`/api/google-drive/files/${file.id}/download`);
      window.open(response.downloadUrl, '_blank');
    } catch (err) {
      console.error('[GoogleDrive] ❌ Erreur téléchargement:', err);
      message.error('Erreur lors du téléchargement');
    }
  };

  const handlePreview = (file: DriveFile) => {
    setSelectedFile(file);
    setPreviewVisible(true);
  };

  // ============ UPLOAD ============

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    
    try {
      const response = await fetch('/api/google-drive/upload', {
        method: 'POST',
        headers: {
          'x-file-name': encodeURIComponent(file.name),
          'x-mime-type': file.type || 'application/octet-stream',
          'x-parent-id': ['shared', 'drives', 'recent', 'starred', 'trash'].includes(currentFolderId) ? 'root' : currentFolderId,
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: file,
      });

      if (!response.ok) throw new Error('Upload failed');
      
      message.success(`${file.name} uploadé avec succès`);
      handleRefresh();
    } catch (err) {
      console.error('[GoogleDrive] Erreur upload:', err);
      message.error(`Erreur lors de l'upload de ${file.name}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    for (const file of droppedFiles) {
      await handleUpload(file);
    }
  };

  // ============ UTILITAIRES ============

  const formatSize = (bytes?: string) => {
    if (!bytes) return '-';
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isMobile) {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const getFileIcon = (mimeType: string, size: number = 24) => {
    const className = `text-${size === 24 ? 'xl' : '4xl'}`;
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <FolderOutlined className={`text-yellow-500 ${className}`} />;
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return <FileWordOutlined className={`text-blue-600 ${className}`} />;
    }
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return <FileExcelOutlined className={`text-green-600 ${className}`} />;
    }
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return <FilePptOutlined className={`text-orange-500 ${className}`} />;
    }
    if (mimeType.includes('pdf')) {
      return <FilePdfOutlined className={`text-red-500 ${className}`} />;
    }
    if (mimeType.includes('image')) {
      return <FileImageOutlined className={`text-purple-500 ${className}`} />;
    }
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) {
      return <FileZipOutlined className={`text-orange-500 ${className}`} />;
    }
    if (mimeType.includes('video')) {
      return <VideoCameraOutlined className={`text-pink-500 ${className}`} />;
    }
    if (mimeType.includes('audio')) {
      return <SoundOutlined className={`text-cyan-500 ${className}`} />;
    }
    return <FileOutlined className={`text-blue-500 ${className}`} />;
  };

  const getStoragePercentage = () => {
    if (!storageInfo?.limit || !storageInfo?.usage) return 0;
    const limit = parseInt(storageInfo.limit);
    const usage = parseInt(storageInfo.usage);
    if (limit === 0) return 0;
    return Math.round((usage / limit) * 100);
  };

  // ============ MENU CONTEXTUEL ============

  const getContextMenu = (file: DriveFile): MenuProps['items'] => {
    if (viewMode === 'trash') {
      return [
        { key: 'restore', label: 'Restaurer', icon: <UndoOutlined />, onClick: () => handleRestore(file) },
        { key: 'delete', label: 'Supprimer définitivement', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(file) },
      ];
    }

    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
    
    const items: MenuProps['items'] = [
      // Ouvrir = aperçu dans le CRM (si prévisualisable) ou navigation pour les dossiers
      { 
        key: 'open', 
        label: isFolder ? 'Ouvrir le dossier' : 'Ouvrir', 
        icon: <EyeOutlined />, 
        onClick: () => {
          if (isFolder) {
            navigateToFolder(file);
          } else {
            handlePreview(file);
          }
        }
      },
      // Option pour ouvrir dans Google Drive (nouvelle fenêtre)
      { 
        key: 'open-external', 
        label: 'Ouvrir dans Google Drive', 
        icon: <ExportOutlined />, 
        onClick: () => file.webViewLink && window.open(file.webViewLink, '_blank') 
      },
      { type: 'divider' },
      { key: 'download', label: 'Télécharger', icon: <DownloadOutlined />, onClick: () => handleDownload(file) },
      { key: 'share', label: 'Obtenir le lien', icon: <ShareAltOutlined />, onClick: () => handleShare(file) },
      { type: 'divider' },
      { key: 'rename', label: 'Renommer', icon: <EditOutlined />, onClick: () => { setSelectedFile(file); setRenameVisible(true); form.setFieldsValue({ name: file.name }); } },
      ...(!isFolder ? [{ key: 'copy', label: 'Copier', icon: <CopyOutlined />, onClick: () => handleCopy(file) }] : []),
      { key: 'move', label: 'Déplacer', icon: <ScissorOutlined />, onClick: () => { setSelectedFile(file); setMoveVisible(true); } },
      { type: 'divider' },
      { key: 'star', label: file.starred ? 'Retirer des favoris' : 'Ajouter aux favoris', icon: file.starred ? <StarFilled className="text-yellow-500" /> : <StarOutlined />, onClick: () => handleToggleStar(file) },
      { type: 'divider' },
      { key: 'delete', label: 'Mettre à la corbeille', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(file) },
    ];

    return items;
  };

  // ============ EFFETS ============

  useEffect(() => {
    loadFiles('root');
    loadStorageInfo();
  }, [loadFiles, loadStorageInfo]);

  // ============ COLONNES TABLE ============

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: DriveFile) => (
        <Dropdown menu={{ items: getContextMenu(record) }} trigger={['contextMenu']}>
          <div 
            className="flex items-center gap-2 cursor-pointer hover:text-blue-500 py-1" 
            onClick={() => navigateToFolder(record)}
          >
            {getFileIcon(record.mimeType)}
            <span className="truncate max-w-xs md:max-w-md lg:max-w-lg">{name}</span>
            {record.starred && <StarFilled className="text-yellow-500 text-sm" />}
            {record.shared && <TeamOutlined className="text-gray-400 text-sm" />}
          </div>
        </Dropdown>
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
      width: 50,
      render: (_: unknown, record: DriveFile) => (
        <Dropdown menu={{ items: getContextMenu(record) }} trigger={['click']}>
          <Button 
            type="text" 
            size="small" 
            icon={<MoreOutlined />} 
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      ),
    },
  ];

  // ============ RENDU GRILLE ============

  const renderGridView = () => (
    <Row gutter={[16, 16]} className="p-2">
      {files.map((file) => (
        <Col key={file.id} xs={12} sm={8} md={6} lg={4} xl={3}>
          <Dropdown menu={{ items: getContextMenu(file) }} trigger={['contextMenu']}>
            <Card
              hoverable
              className="text-center"
              onClick={() => navigateToFolder(file)}
              cover={
                file.thumbnailLink && file.mimeType.includes('image') ? (
                  <div className="h-24 flex items-center justify-center bg-gray-100">
                    <img src={file.thumbnailLink} alt={file.name} className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center bg-gray-50">
                    {getFileIcon(file.mimeType, 48)}
                  </div>
                )
              }
              styles={{ body: { padding: '8px' } }}
            >
              <Tooltip title={file.name}>
                <Text className="block truncate text-xs">{file.name}</Text>
              </Tooltip>
              <div className="flex justify-center gap-1 mt-1">
                {file.starred && <StarFilled className="text-yellow-500 text-xs" />}
                {file.shared && <TeamOutlined className="text-gray-400 text-xs" />}
              </div>
            </Card>
          </Dropdown>
        </Col>
      ))}
    </Row>
  );

  // ============ RENDU MOBILE ============

  const renderMobileList = () => (
    <List
      dataSource={files}
      renderItem={(file) => (
        <Dropdown menu={{ items: getContextMenu(file) }} trigger={['contextMenu']}>
          <List.Item
            className="cursor-pointer hover:bg-gray-50 px-2"
            onClick={() => navigateToFolder(file)}
            actions={[
              <Dropdown key="more" menu={{ items: getContextMenu(file) }} trigger={['click']}>
                <Button 
                  type="text" 
                  size="small" 
                  icon={<MoreOutlined />} 
                  onClick={(e) => e.stopPropagation()}
                />
              </Dropdown>,
            ]}
          >
            <List.Item.Meta
              avatar={getFileIcon(file.mimeType)}
              title={
                <span className="flex items-center gap-1">
                  <span className="truncate max-w-[180px]">{file.name}</span>
                  {file.starred && <StarFilled className="text-yellow-500 text-xs" />}
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
        </Dropdown>
      )}
    />
  );

  // ============ RENDU PRINCIPAL ============

  return (
    <div 
      className="h-full flex flex-col p-2 md:p-4"
      ref={dropZoneRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Overlay drag & drop */}
      {isDragging && (
        <div className="fixed inset-0 bg-blue-500 bg-opacity-20 z-50 flex items-center justify-center border-4 border-dashed border-blue-500">
          <div className="text-center text-blue-600">
            <UploadOutlined className="text-6xl mb-4" />
            <Title level={3}>Déposez vos fichiers ici</Title>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-3 md:mb-4">
        <Title level={isMobile ? 4 : 2} className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
          <CloudOutlined className="text-green-500" />
          Google Drive
        </Title>
        {!isMobile && (
          <Text className="text-gray-600">
            Gérez tous vos fichiers Google Drive directement depuis le CRM
          </Text>
        )}
      </div>

      {/* Onglets */}
      <Tabs
        activeKey={viewMode}
        onChange={handleViewModeChange}
        className="mb-2 md:mb-4"
        size={isMobile ? 'small' : 'middle'}
        items={[
          { key: 'my-drive', label: <span className="flex items-center gap-1"><UserOutlined />{isMobile ? 'Mon Drive' : 'Mon Drive'}</span> },
          { key: 'shared-with-me', label: <span className="flex items-center gap-1"><TeamOutlined />{isMobile ? 'Partagés' : 'Partagés avec moi'}</span> },
          { key: 'shared-drives', label: <span className="flex items-center gap-1"><CloudServerOutlined />{isMobile ? 'Drives' : 'Drive partagés'}</span> },
          { key: 'recent', label: <span className="flex items-center gap-1"><ClockCircleOutlined />{isMobile ? 'Récents' : 'Récents'}</span> },
          { key: 'starred', label: <span className="flex items-center gap-1"><StarOutlined />{isMobile ? 'Favoris' : 'Favoris'}</span> },
          { key: 'trash', label: <span className="flex items-center gap-1"><DeleteOutlined />{isMobile ? 'Corbeille' : 'Corbeille'}</span> },
        ]}
      />

      {/* Barre de stockage */}
      {storageInfo && viewMode === 'my-drive' && (
        <Card className="mb-2 md:mb-4" size="small" styles={{ body: { padding: isMobile ? '8px 12px' : '12px 16px' } }}>
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
      <Card className="mb-2 md:mb-4" size="small" styles={{ body: { padding: isMobile ? '8px' : '12px 16px' } }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          {/* Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={goBack}
              disabled={breadcrumb.length <= 1}
              size={isMobile ? 'small' : 'middle'}
            />
            <Breadcrumb
              className="whitespace-nowrap"
              items={breadcrumb.map((item, index) => ({
                key: item.id,
                title: (
                  <span
                    className={`text-xs md:text-sm ${index < breadcrumb.length - 1 ? 'cursor-pointer hover:text-blue-500' : ''}`}
                    onClick={() => index < breadcrumb.length - 1 && navigateToBreadcrumb(item, index)}
                  >
                    {index === 0 ? <HomeOutlined /> : (
                      <span className="max-w-[80px] md:max-w-[150px] truncate inline-block align-bottom">{item.name}</span>
                    )}
                  </span>
                ),
              }))}
            />
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
            
            {/* Toggle vue liste/grille */}
            {!isMobile && (
              <Segmented
                size="small"
                options={[
                  { value: 'list', icon: <BarsOutlined /> },
                  { value: 'grid', icon: <AppstoreOutlined /> },
                ]}
                value={displayMode}
                onChange={(v) => setDisplayMode(v as DisplayMode)}
              />
            )}
            
            <div className="flex gap-1">
              {/* Bouton Nouveau */}
              {viewMode !== 'trash' && (
                <Dropdown
                  menu={{
                    items: [
                      { key: 'folder', label: 'Nouveau dossier', icon: <FolderAddOutlined />, onClick: () => setCreateFolderVisible(true) },
                      { type: 'divider' },
                      { key: 'upload', label: 'Upload fichier', icon: <UploadOutlined />, onClick: () => document.getElementById('file-upload')?.click() },
                      { type: 'divider' },
                      { key: 'doc', label: 'Google Docs', icon: <FileWordOutlined className="text-blue-600" />, onClick: () => { form.setFieldsValue({ type: 'document' }); setCreateDocVisible(true); } },
                      { key: 'sheet', label: 'Google Sheets', icon: <FileExcelOutlined className="text-green-600" />, onClick: () => { form.setFieldsValue({ type: 'spreadsheet' }); setCreateDocVisible(true); } },
                      { key: 'slide', label: 'Google Slides', icon: <FilePptOutlined className="text-orange-500" />, onClick: () => { form.setFieldsValue({ type: 'presentation' }); setCreateDocVisible(true); } },
                    ],
                  }}
                  trigger={['click']}
                >
                  <Button icon={<PlusOutlined />} type="primary" size={isMobile ? 'small' : 'middle'}>
                    {!isMobile && 'Nouveau'}
                  </Button>
                </Dropdown>
              )}
              
              {/* Bouton Vider la corbeille */}
              {viewMode === 'trash' && files.length > 0 && (
                <Button 
                  icon={<DeleteOutlined />} 
                  danger 
                  size={isMobile ? 'small' : 'middle'}
                  onClick={handleEmptyTrash}
                >
                  {!isMobile && 'Vider'}
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

      {/* Input upload caché */}
      <input
        id="file-upload"
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          files.forEach(handleUpload);
          e.target.value = '';
        }}
      />

      {/* Liste des fichiers */}
      <Card className="flex-1 overflow-hidden" styles={{ body: { padding: isMobile ? '0' : '12px', height: '100%', overflow: 'auto' } }}>
        {loading ? (
          <div className="flex items-center justify-center h-48 md:h-64">
            <Spin size={isMobile ? 'default' : 'large'} />
          </div>
        ) : viewMode === 'shared-drives' && !currentDriveId ? (
          sharedDrives.length === 0 ? (
            <Empty description="Aucun drive partagé disponible" className="py-8" />
          ) : (
            <List
              dataSource={sharedDrives}
              renderItem={(drive) => (
                <List.Item className="cursor-pointer hover:bg-gray-50 px-4" onClick={() => enterSharedDrive(drive)}>
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
              viewMode === 'trash' ? "La corbeille est vide" :
              viewMode === 'starred' ? "Aucun fichier favori" :
              viewMode === 'recent' ? "Aucun fichier récent" :
              "Aucun fichier dans ce dossier"
            } 
            className="py-8"
          />
        ) : displayMode === 'grid' && !isMobile ? (
          renderGridView()
        ) : isMobile ? (
          renderMobileList()
        ) : (
          <Table
            dataSource={files}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 20, showSizeChanger: true, size: 'small', showTotal: (total) => `${total} éléments` }}
            size="small"
            scroll={{ x: true }}
          />
        )}
      </Card>

      {/* ============ MODALS ============ */}
      
      {/* Modal de suppression */}
      <Modal
        title={viewMode === 'trash' ? 'Supprimer définitivement ?' : 'Supprimer ce fichier ?'}
        open={deleteModalVisible}
        onCancel={() => { setDeleteModalVisible(false); setFileToDelete(null); }}
        onOk={confirmDelete}
        okText={viewMode === 'trash' ? 'Supprimer définitivement' : 'Supprimer'}
        okType="danger"
        cancelText="Annuler"
        confirmLoading={deleteLoading}
        width={isMobile ? '90%' : 400}
      >
        {fileToDelete && (
          <p>
            {viewMode === 'trash' 
              ? `"${fileToDelete.name}" sera supprimé définitivement et ne pourra plus être récupéré.`
              : `"${fileToDelete.name}" sera déplacé vers la corbeille.`
            }
          </p>
        )}
      </Modal>
      
      {/* Modal création dossier */}
      <Modal
        title="Créer un nouveau dossier"
        open={createFolderVisible}
        onCancel={() => { setCreateFolderVisible(false); form.resetFields(); }}
        onOk={() => form.submit()}
        width={isMobile ? '90%' : 400}
      >
        <Form form={form} onFinish={handleCreateFolder} layout="vertical">
          <Form.Item name="name" label="Nom du dossier" rules={[{ required: true, message: 'Veuillez entrer un nom' }]}>
            <Input placeholder="Nouveau dossier" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal création document Google */}
      <Modal
        title="Créer un document Google"
        open={createDocVisible}
        onCancel={() => { setCreateDocVisible(false); form.resetFields(); }}
        onOk={() => form.submit()}
        width={isMobile ? '90%' : 400}
      >
        <Form form={form} onFinish={handleCreateDoc} layout="vertical">
          <Form.Item name="name" label="Nom du document" rules={[{ required: true, message: 'Veuillez entrer un nom' }]}>
            <Input placeholder="Sans titre" />
          </Form.Item>
          <Form.Item name="type" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal renommer */}
      <Modal
        title="Renommer"
        open={renameVisible}
        onCancel={() => { setRenameVisible(false); form.resetFields(); }}
        onOk={() => form.submit()}
        width={isMobile ? '90%' : 400}
      >
        <Form form={form} onFinish={handleRename} layout="vertical">
          <Form.Item name="name" label="Nouveau nom" rules={[{ required: true, message: 'Veuillez entrer un nom' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal déplacer */}
      <Modal
        title="Déplacer vers"
        open={moveVisible}
        onCancel={() => setMoveVisible(false)}
        onOk={handleMove}
        width={isMobile ? '90%' : 500}
      >
        <div className="py-4">
          <p className="mb-4">Sélectionnez le dossier de destination :</p>
          <div className="border rounded p-2 max-h-64 overflow-auto">
            <div 
              className={`p-2 cursor-pointer rounded ${selectedDestination === 'root' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
              onClick={() => setSelectedDestination('root')}
            >
              <HomeOutlined className="mr-2" /> Mon Drive (racine)
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal partage */}
      <Modal
        title="Partager"
        open={shareVisible}
        onCancel={() => setShareVisible(false)}
        footer={[
          <Button key="public" onClick={handleMakePublic} icon={<LinkOutlined />}>
            Créer un lien public
          </Button>,
          <Button key="copy" type="primary" onClick={handleCopyLink} disabled={!shareLink}>
            Copier le lien
          </Button>,
        ]}
        width={isMobile ? '90%' : 500}
      >
        <div className="py-4">
          <p className="mb-2 font-medium">{selectedFile?.name}</p>
          {shareLink ? (
            <Input value={shareLink} readOnly addonAfter={<CopyOutlined onClick={handleCopyLink} className="cursor-pointer" />} />
          ) : (
            <p className="text-gray-500">Cliquez sur "Créer un lien public" pour partager ce fichier.</p>
          )}
        </div>
      </Modal>

      {/* Modal aperçu */}
      <Modal
        title={selectedFile?.name}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={isMobile ? '95%' : '80%'}
        style={{ top: 20 }}
      >
        {selectedFile && (
          <div className="flex items-center justify-center min-h-[400px]">
            {selectedFile.mimeType.includes('image') && selectedFile.thumbnailLink ? (
              <Image src={selectedFile.thumbnailLink.replace('=s220', '=s800')} alt={selectedFile.name} />
            ) : selectedFile.webViewLink ? (
              <iframe 
                src={selectedFile.webViewLink.replace('/view', '/preview')} 
                className="w-full h-[600px] border-0"
                title={selectedFile.name}
              />
            ) : (
              <Empty description="Aperçu non disponible" />
            )}
          </div>
        )}
      </Modal>

      {/* Progress upload */}
      {isUploading && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50">
          <div className="flex items-center gap-3">
            <Spin size="small" />
            <span>Upload en cours...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleDrivePageV2;
