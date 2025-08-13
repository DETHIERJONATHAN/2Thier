import React, { useState, useEffect, useMemo } from 'react';
import { Button, Table, Input, Modal, message, Typography, Card, Row, Col, Statistic, Tag, Tooltip, Spin, Empty } from 'antd';
import { FileTextOutlined, PlusOutlined, SearchOutlined, SyncOutlined, FileWordOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';

const { Title, Text } = Typography;
const { Search } = Input;

// Interface pour un document Google
interface GoogleDoc {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  owners: { displayName: string }[];
}

// Interface pour les statistiques
interface DocStats {
  totalDocs: number;
  textDocs: number;
  sharedDocs: number;
  lastModified: string | null;
}

export const GoogleDocsPage: React.FC = () => {
  const [docs, setDocs] = useState<GoogleDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DocStats>({ totalDocs: 0, textDocs: 0, sharedDocs: 0, lastModified: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newDocName, setNewDocName] = useState('');

  const { api } = useAuthenticatedApi();
  const { user } = useAuth();

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/google-drive/files?q=mimeType=\'application/vnd.google-apps.document\'');
      if (response.data && response.data.files) {
        setDocs(response.data.files);
        updateStats(response.data.files);
      }
    } catch (error) {
      message.error('Erreur lors de la récupération des documents Google Docs.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDocs();
    }
  }, [user]);

  const updateStats = (files: GoogleDoc[]) => {
    const textDocs = files.filter(f => f.mimeType === 'application/vnd.google-apps.document').length;
    const sharedDocs = files.filter(f => f.owners && f.owners.length > 1).length;
    const lastModified = files.length > 0 ? new Date(Math.max(...files.map(f => new Date(f.modifiedTime).getTime()))).toLocaleDateString() : null;
    
    setStats({
      totalDocs: files.length,
      textDocs,
      sharedDocs,
      lastModified
    });
  };

  const handleCreateDoc = async () => {
    if (!newDocName) {
      message.warning('Veuillez entrer un nom pour le document.');
      return;
    }
    try {
      await api.post('/api/google-drive/files/create', { name: newDocName, mimeType: 'application/vnd.google-apps.document' });
      message.success(`Document "${newDocName}" créé avec succès !`);
      fetchDocs();
      setIsModalVisible(false);
      setNewDocName('');
    } catch (error) {
      message.error('Erreur lors de la création du document.');
      console.error(error);
    }
  };

  const handleDeleteDoc = async (fileId: string, fileName: string) => {
    Modal.confirm({
      title: `Voulez-vous vraiment supprimer "${fileName}" ?`,
      content: 'Cette action est irréversible.',
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await api.delete(`/drive/files/${fileId}`);
          message.success(`Document "${fileName}" supprimé.`);
          fetchDocs();
        } catch (error) {
          message.error('Erreur lors de la suppression du document.');
        }
      },
    });
  };

  const filteredDocs = useMemo(() => {
    return docs.filter(doc =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [docs, searchTerm]);

  const columns = [
    {
      title: 'Nom du document',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: GoogleDoc, b: GoogleDoc) => a.name.localeCompare(b.name),
      render: (text: string, record: GoogleDoc) => (
        <a href={record.webViewLink} target="_blank" rel="noopener noreferrer">
          <FileWordOutlined style={{ marginRight: 8, color: '#4285F4' }} />
          {text}
        </a>
      ),
    },
    {
      title: 'Propriétaire',
      dataIndex: 'owners',
      key: 'owner',
      render: (owners: { displayName: string }[]) => owners?.[0]?.displayName || 'Inconnu',
    },
    {
      title: 'Dernière modification',
      dataIndex: 'modifiedTime',
      key: 'modifiedTime',
      sorter: (a: GoogleDoc, b: GoogleDoc) => new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime(),
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: GoogleDoc) => (
        <span>
          <Tooltip title="Ouvrir le document">
            <Button icon={<EyeOutlined />} href={record.webViewLink} target="_blank" style={{ marginRight: 8 }} />
          </Tooltip>
          <Tooltip title="Modifier (dans Google Docs)">
             <Button icon={<EditOutlined />} href={record.webViewLink.replace('/view', '/edit')} target="_blank" style={{ marginRight: 8 }} />
          </Tooltip>
          <Tooltip title="Supprimer">
            <Button icon={<DeleteOutlined />} danger onClick={() => handleDeleteDoc(record.id, record.name)} />
          </Tooltip>
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Google Docs"
        icon={<FileTextOutlined />}
        subtitle="Gérez tous vos documents texte de manière centralisée."
        actions={
          <>
            <Button icon={<PlusOutlined />} type="primary" onClick={() => setIsModalVisible(true)}>
              Nouveau Document
            </Button>
            <Button icon={<SyncOutlined />} onClick={fetchDocs} loading={loading}>
              Synchroniser
            </Button>
          </>
        }
      />

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <StatCard icon={<FileTextOutlined />} title="Documents au total" value={stats.totalDocs} loading={loading} />
        <StatCard icon={<FileWordOutlined />} title="Documents Texte" value={stats.textDocs} loading={loading} />
        <StatCard icon={<i className="fas fa-users"></i>} title="Documents Partagés" value={stats.sharedDocs} loading={loading} />
        <StatCard icon={<i className="fas fa-clock"></i>} title="Dernière Activité" value={stats.lastModified || 'N/A'} loading={loading} />
      </Row>

      <Card>
        <Title level={4}>Liste des documents</Title>
        <Search
          placeholder="Rechercher un document..."
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginBottom: 20, width: 300 }}
          enterButton={<SearchOutlined />}
        />
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredDocs}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="Aucun document trouvé." /> }}
          />
        </Spin>
      </Card>

      <Modal
        title="Créer un nouveau document Google Docs"
        visible={isModalVisible}
        onOk={handleCreateDoc}
        onCancel={() => setIsModalVisible(false)}
        okText="Créer"
        cancelText="Annuler"
      >
        <Input
          placeholder="Nom du nouveau document"
          value={newDocName}
          onChange={e => setNewDocName(e.target.value)}
          onPressEnter={handleCreateDoc}
        />
      </Modal>
    </div>
  );
};

export default GoogleDocsPage;
