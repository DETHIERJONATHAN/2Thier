import React, { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { 
  Card, 
  Button, 
  Upload, 
  Form, 
  Modal, 
  Space, 
  message,
  List,
  Input,
  Select,
  Progress
} from 'antd';
import { 
  FileOutlined,
  FolderOutlined, 
  UploadOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  EyeOutlined
} from '@ant-design/icons';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime: string;
  webViewLink: string;
  webContentLink?: string;
  thumbnailLink?: string;
  shared: boolean;
  owner: string;
}

interface DriveWidgetProps {
  leadEmail: string;
  leadName: string;
  leadId: string;
  onFileShared?: (fileData: FileSharedData) => void;
}

interface FileSharedData {
  type: 'drive_file';
  leadId: string;
  fileId: string;
  fileName: string;
  timestamp: Date;
}

const DriveWidget: React.FC<DriveWidgetProps> = ({ 
  leadEmail, 
  leadName, 
  leadId,
  onFileShared 
}) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [form] = Form.useForm();
  const api = useAuthenticatedApi();

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await api.api.get(`/drive/files?leadId=${leadId}`);
      setFiles(response.files || []);
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers:', error);
      // Fichiers simulés pour la démo
      setFiles([
        {
          id: '1',
          name: 'Proposition_commerciale.pdf',
          mimeType: 'application/pdf',
          size: 2048576,
          modifiedTime: new Date(Date.now() - 3600000).toISOString(),
          webViewLink: 'https://drive.google.com/file/d/1/view',
          webContentLink: 'https://drive.google.com/file/d/1/export',
          shared: true,
          owner: 'moi@monentreprise.be'
        },
        {
          id: '2',
          name: 'Contrat_type.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 1024000,
          modifiedTime: new Date(Date.now() - 86400000).toISOString(),
          webViewLink: 'https://drive.google.com/file/d/2/view',
          shared: false,
          owner: 'moi@monentreprise.be'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [leadId, api.api]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('leadId', leadId);
      formData.append('folderName', `Lead_${leadName.replace(/\s+/g, '_')}`);

      // Simulation du progrès d'upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      await api.api.post('/drive/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      message.success(`Fichier "${file.name}" uploadé avec succès`);
      
      // Recharger les fichiers
      setTimeout(() => {
        loadFiles();
        setUploading(false);
        setUploadProgress(0);
      }, 1000);
      
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      message.error('Erreur lors de l\'upload du fichier');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleShareFile = async (values: { permission: string; message?: string }) => {
    if (!selectedFile) return;

    try {
      await api.api.post('/drive/share', {
        fileId: selectedFile.id,
        email: leadEmail,
        permission: values.permission,
        message: values.message,
        context: {
          leadId,
          source: 'crm_lead'
        }
      });

      message.success(`Fichier partagé avec ${leadName}`);
      setShareModalVisible(false);
      setSelectedFile(null);
      form.resetFields();
      
      // Recharger les fichiers
      await loadFiles();
      
      // Notifier le parent
      if (onFileShared) {
        onFileShared({
          type: 'drive_file',
          leadId,
          fileId: selectedFile.id,
          fileName: selectedFile.name,
          timestamp: new Date()
        });
      }
      
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      message.error('Erreur lors du partage du fichier');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Taille inconnue';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('folder')) return <FolderOutlined className="text-blue-500" />;
    return <FileOutlined className="text-gray-500" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card 
      title={
        <Space>
          <FileOutlined />
          Drive - {leadName}
        </Space>
      }
      extra={
        <Space>
          <Button 
            size="small" 
            icon={<ReloadOutlined />} 
            onClick={loadFiles}
            loading={loading}
          />
          <Upload
            customRequest={({ file }) => handleUpload(file as File)}
            showUploadList={false}
            disabled={uploading}
          >
            <Button 
              type="primary"
              size="small"
              icon={<UploadOutlined />}
              loading={uploading}
            >
              Uploader
            </Button>
          </Upload>
        </Space>
      }
      className="mb-4"
    >
      <div className="mb-3">
        <div className="text-sm text-gray-600">
          Dossier du lead: <span className="font-medium">Lead_{leadName.replace(/\s+/g, '_')}</span>
        </div>
      </div>

      {uploading && (
        <div className="mb-4">
          <Progress 
            percent={uploadProgress}
            status="active"
            strokeColor="#1890ff"
          />
        </div>
      )}

      <List
        loading={loading}
        dataSource={files}
        locale={{ emptyText: 'Aucun fichier dans ce dossier' }}
        renderItem={(file) => (
          <List.Item
            actions={[
              <Button 
                key="view"
                size="small" 
                icon={<EyeOutlined />}
                onClick={() => window.open(file.webViewLink, '_blank')}
              >
                Voir
              </Button>,
              <Button 
                key="share"
                size="small" 
                icon={<ShareAltOutlined />}
                onClick={() => {
                  setSelectedFile(file);
                  setShareModalVisible(true);
                }}
                type={file.shared ? "default" : "primary"}
              >
                {file.shared ? 'Partagé' : 'Partager'}
              </Button>,
              file.webContentLink && (
                <Button 
                  key="download"
                  size="small" 
                  icon={<DownloadOutlined />}
                  onClick={() => window.open(file.webContentLink, '_blank')}
                />
              )
            ].filter(Boolean)}
          >
            <List.Item.Meta
              avatar={getFileIcon(file.mimeType)}
              title={<span className="font-medium">{file.name}</span>}
              description={
                <div>
                  <div className="text-sm text-gray-600 mb-1">
                    {formatFileSize(file.size)} • Modifié le {formatDate(file.modifiedTime)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Propriétaire: {file.owner}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />

      {/* Modal de partage de fichier */}
      <Modal
        title={`Partager "${selectedFile?.name}" avec ${leadName}`}
        open={shareModalVisible}
        onCancel={() => {
          setShareModalVisible(false);
          setSelectedFile(null);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleShareFile}
          initialValues={{
            permission: 'reader'
          }}
        >
          <Form.Item
            name="permission"
            label="Permission"
            rules={[{ required: true, message: 'Veuillez sélectionner une permission' }]}
          >
            <Select>
              <Select.Option value="reader">Lecture seule</Select.Option>
              <Select.Option value="commenter">Peut commenter</Select.Option>
              <Select.Option value="writer">Peut modifier</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="message"
            label="Message (optionnel)"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Message à inclure dans l'invitation..."
            />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => setShareModalVisible(false)}>
                Annuler
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<ShareAltOutlined />}
              >
                Partager
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default DriveWidget;
