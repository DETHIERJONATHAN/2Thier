import React, { useState, useEffect } from 'react';
import { Upload, message, Modal, Image, Card, Button, Select, Space, Typography, Empty, Spin } from 'antd';
import { InboxOutlined, DeleteOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import type { UploadProps, UploadFile } from 'antd';

const { Dragger } = Upload;
const { Title, Text } = Typography;

interface ImageFile {
  id: number;
  fileName: string;
  fileUrl: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  category: 'logo' | 'project' | 'service' | 'general';
  uploadedAt: string;
  uploadedBy?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface ImageUploaderProps {
  websiteId: number;
  category?: 'logo' | 'project' | 'service' | 'general';
  onImageSelect?: (imageUrl: string) => void;
  maxCount?: number;
  showGrid?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  websiteId,
  category = 'general',
  onImageSelect,
  maxCount = 1,
  showGrid = true,
}) => {
  const { api } = useAuthenticatedApi();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(category);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  // Charger les images existantes
  const fetchImages = async () => {
    try {
      setLoading(true);
      const url = `/images/${websiteId}${selectedCategory !== 'all' ? `?category=${selectedCategory}` : ''}`;
      const data = await api.get(url);
      setImages(data.images || []);
    } catch (error) {
      console.error('Erreur lors du chargement des images:', error);
      message.error('Impossible de charger les images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (websiteId) {
      fetchImages();
    }
  }, [websiteId, selectedCategory]);

  // Configuration de l'upload
  const uploadProps: UploadProps = {
    name: 'image',
    multiple: maxCount > 1,
    maxCount,
    accept: 'image/*',
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        setUploading(true);
        const formData = new FormData();
        formData.append('image', file as File);
        formData.append('websiteId', websiteId.toString());
        formData.append('category', selectedCategory);

        const apiBase = (typeof window !== 'undefined' && (window as any).__API_BASE_URL) || '';
        const response = await fetch(`${apiBase}/api/upload-image`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de l\'upload');
        }

        const data = await response.json();
        message.success(`${(file as File).name} uploadé avec succès`);
        
        // Rafraîchir la liste
        await fetchImages();
        
        // Notifier le parent si callback fourni
        if (onImageSelect && data.file) {
          onImageSelect(data.file.fileUrl);
        }

        onSuccess?.(data);
      } catch (error: any) {
        console.error('Erreur upload:', error);
        message.error(error.message || 'Échec de l\'upload');
        onError?.(error);
      } finally {
        setUploading(false);
      }
    },
    showUploadList: false,
  };

  // Supprimer une image
  const handleDelete = async (imageId: number) => {
    Modal.confirm({
      title: 'Supprimer cette image ?',
      content: 'Cette action est irréversible.',
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await api.delete(`/image/${imageId}`);
          message.success('Image supprimée');
          await fetchImages();
        } catch (error) {
          console.error('Erreur lors de la suppression:', error);
          message.error('Impossible de supprimer l\'image');
        }
      },
    });
  };

  // Prévisualiser une image
  const handlePreview = (image: ImageFile) => {
    setPreviewImage(`http://localhost:5173${image.fileUrl}`);
    setPreviewTitle(image.fileName);
    setPreviewVisible(true);
  };

  // Sélectionner une image
  const handleSelect = (imageUrl: string) => {
    if (onImageSelect) {
      onImageSelect(imageUrl);
      message.success('Image sélectionnée');
    }
  };

  return (
    <div className="image-uploader">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* En-tête avec filtre de catégorie */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4}>
            📸 Bibliothèque d'images
          </Title>
          <Select
            value={selectedCategory}
            onChange={setSelectedCategory}
            style={{ width: 200 }}
          >
            <Select.Option value="all">Toutes les catégories</Select.Option>
            <Select.Option value="logo">🏷️ Logos</Select.Option>
            <Select.Option value="project">🏗️ Projets</Select.Option>
            <Select.Option value="service">⚡ Services</Select.Option>
            <Select.Option value="general">📁 Général</Select.Option>
          </Select>
        </div>

        {/* Zone d'upload */}
        <Dragger {...uploadProps} disabled={uploading}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            Cliquez ou glissez une image ici
          </p>
          <p className="ant-upload-hint">
            Formats acceptés : JPEG, PNG, GIF, WebP, SVG (max 5 MB)
          </p>
          {uploading && <Spin style={{ marginTop: 16 }} />}
        </Dragger>

        {/* Grille d'images */}
        {showGrid && (
          <div>
            <Title level={5}>
              Images disponibles ({images.length})
            </Title>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
              </div>
            ) : images.length === 0 ? (
              <Empty
                description="Aucune image dans cette catégorie"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 16,
                }}
              >
                {images.map((image) => (
                  <Card
                    key={image.id}
                    hoverable
                    cover={
                      <div
                        style={{
                          height: 150,
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f5f5f5',
                        }}
                      >
                        <img
                          alt={image.fileName}
                          src={`http://localhost:5173${image.fileUrl}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </div>
                    }
                    actions={[
                      <Button
                        key="preview"
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => handlePreview(image)}
                      >
                        Voir
                      </Button>,
                      onImageSelect && (
                        <Button
                          key="select"
                          type="text"
                          icon={<PlusOutlined />}
                          onClick={() => handleSelect(image.fileUrl)}
                        >
                          Choisir
                        </Button>
                      ),
                      <Button
                        key="delete"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(image.id)}
                      >
                        Suppr.
                      </Button>,
                    ].filter(Boolean)}
                  >
                    <Card.Meta
                      title={
                        <Text ellipsis title={image.fileName}>
                          {image.fileName}
                        </Text>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {(image.fileSize / 1024).toFixed(1)} KB
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {new Date(image.uploadedAt).toLocaleDateString('fr-FR')}
                          </Text>
                        </Space>
                      }
                    />
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Space>

      {/* Modal de prévisualisation */}
      <Modal
        open={previewVisible}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
      >
        <Image
          src={previewImage}
          alt={previewTitle}
          style={{ width: '100%' }}
          preview={false}
        />
      </Modal>
    </div>
  );
};
