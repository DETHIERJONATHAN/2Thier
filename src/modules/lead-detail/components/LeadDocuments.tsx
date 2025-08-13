import React from 'react';
import { Card, List, Button, Upload } from 'antd';
import { DownloadOutlined, UploadOutlined, FileOutlined } from '@ant-design/icons';

interface LeadDocumentsProps {
  leadId?: string;
}

export const LeadDocuments: React.FC<LeadDocumentsProps> = ({ leadId }) => {
  const documents = [
    {
      id: 1,
      name: 'Devis_2024_001.pdf',
      type: 'Devis',
      size: '245 KB',
      uploadDate: '2024-01-14',
      uploadedBy: 'Jonathan'
    },
    {
      id: 2,
      name: 'Presentation_services.pptx',
      type: 'Présentation',
      size: '1.2 MB',
      uploadDate: '2024-01-13',
      uploadedBy: 'Jonathan'
    }
  ];

  const handleUpload = (file: File) => {
    console.log('Upload file:', file);
    return false; // Empêche l'upload automatique
  };

  return (
    <Card 
      title="Documents liés"
      extra={
        <Upload 
          beforeUpload={handleUpload}
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />} size="small">
            Ajouter
          </Button>
        </Upload>
      }
    >
      <List
        itemLayout="horizontal"
        dataSource={documents}
        renderItem={(doc) => (
          <List.Item
            actions={[
              <Button 
                type="text" 
                icon={<DownloadOutlined />}
                size="small"
              >
                Télécharger
              </Button>
            ]}
          >
            <List.Item.Meta
              avatar={<FileOutlined className="text-blue-500" />}
              title={doc.name}
              description={
                <div className="text-sm text-gray-500">
                  <span>{doc.type} • {doc.size}</span>
                  <br />
                  <span>Ajouté le {doc.uploadDate} par {doc.uploadedBy}</span>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};
