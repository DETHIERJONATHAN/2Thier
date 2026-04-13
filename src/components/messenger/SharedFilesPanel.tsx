/**
 * 📁 SharedFilesPanel — Onglet fichiers partagés dans une conversation
 * Affiche tous les médias/fichiers partagés, filtrable par type
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, Spin, Empty } from 'antd';
import { FileOutlined, PictureOutlined, VideoCameraOutlined, SoundOutlined } from '@ant-design/icons';
import { FilePreview } from './FilePreview';

interface SharedFilesPanelProps {
  conversationId: string;
  api: unknown;
}

export const SharedFilesPanel: React.FC<SharedFilesPanelProps> = ({ conversationId, api }) => {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const fetchFiles = useCallback(async (type?: string) => {
    setLoading(true);
    try {
      const params = type && type !== 'all' ? `?type=${type}` : '';
      const data = await api.get(`/messenger/conversations/${conversationId}/files${params}`);
      setFiles(data);
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  }, [api, conversationId]);

  useEffect(() => {
    fetchFiles(activeTab === 'all' ? undefined : activeTab);
  }, [activeTab, fetchFiles]);

  const tabItems = [
    { key: 'all', label: 'Tout', icon: <FileOutlined /> },
    { key: 'image', label: 'Images', icon: <PictureOutlined /> },
    { key: 'video', label: 'Vidéos', icon: <VideoCameraOutlined /> },
    { key: 'file', label: 'Fichiers', icon: <FileOutlined /> },
    { key: 'voice', label: 'Vocaux', icon: <SoundOutlined /> },
  ];

  return (
    <div className="flex flex-col h-full">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        items={tabItems}
        className="px-2"
      />

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : files.length === 0 ? (
          <Empty description="Aucun fichier partagé" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className="space-y-2">
            {files.map((file: Record<string, unknown>) => (
              <div key={file.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-800/30">
                <FilePreview
                  urls={(file.mediaUrls as string[]) || []}
                  mediaType={file.mediaType}
                  voiceDuration={file.voiceDuration}
                  compact
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">
                    {file.sender?.firstName} {file.sender?.lastName} — {new Date(file.createdAt).toLocaleDateString('fr-BE')}
                  </p>
                  {file.content && (
                    <p className="text-xs text-gray-500 truncate">{file.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedFilesPanel;
