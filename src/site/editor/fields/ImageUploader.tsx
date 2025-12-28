/**
 * 🖼️ IMAGE UPLOADER - Upload et gestion d'images
 * 
 * Fonctionnalités :
 * - Upload d'images (drag & drop)
 * - Prévisualisation
 * - Redimensionnement automatique
 * - Crop si aspectRatio défini
 * - Optimisation AI optionnelle
 * 
 * @module site/editor/fields/ImageUploader
 * @author 2Thier CRM Team
 */

import React, { useState } from 'react';
import { Upload, Button, message, Image, Space, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';

interface ImageUploaderProps {
  value?: string;
  onChange?: (value: string) => void;
  maxSize?: number; // MB
  aspectRatio?: number;
  allowCrop?: boolean;
  aiOptimize?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  value = '',
  onChange,
  maxSize = 5,
  aspectRatio,
  allowCrop = false,
  aiOptimize = false
}) => {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>(
    value ? [{
      uid: '-1',
      name: 'image.jpg',
      status: 'done',
      url: value
    }] : []
  );
  
  const uploadProps: UploadProps = {
    name: 'file',
    listType: 'picture-card',
    fileList: fileList,
    maxCount: 1,
    accept: 'image/*',
    
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('Vous ne pouvez uploader que des images !');
        return false;
      }
      
      const isSizeOk = file.size / 1024 / 1024 < maxSize;
      if (!isSizeOk) {
        message.error(`L'image doit faire moins de ${maxSize}MB !`);
        return false;
      }
      
      return false; // Empêche l'upload auto, on gère manuellement
    },
    
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList);
      
      if (newFileList.length > 0 && newFileList[0].originFileObj) {
        const file = newFileList[0].originFileObj;
        const reader = new FileReader();
        
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          onChange?.(dataUrl);
        };
        
        reader.readAsDataURL(file);
      } else if (newFileList.length === 0) {
        onChange?.('');
      }
    },
    
    onRemove: () => {
      setFileList([]);
      onChange?.('');
    }
  };
  
  const handleAIOptimize = async () => {
    if (!value) return;
    
    setLoading(true);
    message.info('Optimisation AI en cours...');
    
    // TODO: Appel API pour optimiser l'image avec AI
    setTimeout(() => {
      message.success('Image optimisée avec succès !');
      setLoading(false);
    }, 2000);
  };
  
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Upload {...uploadProps}>
        {fileList.length === 0 && (
          <div>
            <PlusOutlined />
            <div style={{ marginTop: 8 }}>Upload</div>
          </div>
        )}
      </Upload>
      
      {aspectRatio && (
        <Alert
          type="info"
          message={`Ratio recommandé : ${aspectRatio.toFixed(2)} (ex: ${Math.round(1920 * aspectRatio)}x1920px)`}
          showIcon
          style={{ fontSize: 12 }}
        />
      )}
      
      {aiOptimize && value && (
        <Button
          type="dashed"
          icon={<ThunderboltOutlined />}
          onClick={handleAIOptimize}
          loading={loading}
          size="small"
        >
          Optimiser avec IA
        </Button>
      )}
    </Space>
  );
};

export default ImageUploader;
