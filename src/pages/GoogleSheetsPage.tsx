import React, { useState, useEffect, useMemo } from 'react';
import { Button, Table, Input, Modal, message, Typography, Card, Row, Spin, Empty, Tooltip } from 'antd';
import { GoogleOutlined, PlusOutlined, SearchOutlined, SyncOutlined, FileExcelOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';

const { Title } = Typography;
const { Search } = Input;

// Interface pour une feuille de calcul Google
interface GoogleSheet {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  owners: { displayName: string }[];
}

// Interface pour les statistiques
interface SheetStats {
  totalSheets: number;
  lastModified: string | null;
}

export const GoogleSheetsPage: React.FC = () => {
  const [sheets, setSheets] = useState<GoogleSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SheetStats>({ totalSheets: 0, lastModified: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');

  const { api } = useAuthenticatedApi();
  const { user } = useAuth();

  const fetchSheets = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/google-drive/files?q=mimeType=\'application/vnd.google-apps.spreadsheet\'');
      if (response.data && response.data.files) {
        setSheets(response.data.files);
        updateStats(response.data.files);
      }
    } catch (error) {
      message.error('Erreur lors de la récupération des feuilles de calcul.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSheets();
    }
  }, [user]);

  const updateStats = (files: GoogleSheet[]) => {
    const lastModified = files.length > 0 ? new Date(Math.max(...files.map(f => new Date(f.modifiedTime).getTime()))).toLocaleDateString() : null;
    
    setStats({
      totalSheets: files.length,
      lastModified
    });
  };

  const handleCreateSheet = async () => {
    if (!newSheetName) {
      message.warning('Veuillez entrer un nom pour la feuille de calcul.');
      return;
    }
    try {
      await api.post('/api/google-drive/files/create', { name: newSheetName, mimeType: 'application/vnd.google-apps.spreadsheet' });
      message.success(`Feuille de calcul "${newSheetName}" créée avec succès !`);
      fetchSheets();
      setIsModalVisible(false);
      setNewSheetName('');
    } catch (error) {
      message.error('Erreur lors de la création de la feuille de calcul.');
      console.error(error);
    }
  };

  const handleDeleteSheet = async (fileId: string, fileName: string) => {
    Modal.confirm({
      title: `Voulez-vous vraiment supprimer "${fileName}" ?`,
      content: 'Cette action est irréversible.',
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await api.delete(`/drive/files/${fileId}`);
          message.success(`Feuille de calcul "${fileName}" supprimée.`);
          fetchSheets();
        } catch (error) {
          message.error('Erreur lors de la suppression.');
        }
      },
    });
  };

  const filteredSheets = useMemo(() => {
    return sheets.filter(sheet =>
      sheet.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sheets, searchTerm]);

  const columns = [
    {
      title: 'Nom de la feuille de calcul',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: GoogleSheet, b: GoogleSheet) => a.name.localeCompare(b.name),
      render: (text: string, record: GoogleSheet) => (
        <a href={record.webViewLink} target="_blank" rel="noopener noreferrer">
          <FileExcelOutlined style={{ marginRight: 8, color: '#0F9D58' }} />
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
      sorter: (a: GoogleSheet, b: GoogleSheet) => new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime(),
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: GoogleSheet) => (
        <span>
          <Tooltip title="Ouvrir">
            <Button icon={<EyeOutlined />} href={record.webViewLink} target="_blank" style={{ marginRight: 8 }} />
          </Tooltip>
          <Tooltip title="Modifier">
             <Button icon={<EditOutlined />} href={record.webViewLink.replace('/view', '/edit')} target="_blank" style={{ marginRight: 8 }} />
          </Tooltip>
          <Tooltip title="Supprimer">
            <Button icon={<DeleteOutlined />} danger onClick={() => handleDeleteSheet(record.id, record.name)} />
          </Tooltip>
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Google Sheets"
        icon={<GoogleOutlined />}
        subtitle="Gérez toutes vos feuilles de calcul de manière centralisée."
        actions={
          <>
            <Button icon={<PlusOutlined />} type="primary" onClick={() => setIsModalVisible(true)}>
              Nouvelle Feuille
            </Button>
            <Button icon={<SyncOutlined />} onClick={fetchSheets} loading={loading}>
              Synchroniser
            </Button>
          </>
        }
      />

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <StatCard icon={<FileExcelOutlined />} title="Feuilles de calcul" value={stats.totalSheets} loading={loading} />
        <StatCard icon={<i className="fas fa-clock"></i>} title="Dernière Activité" value={stats.lastModified || 'N/A'} loading={loading} />
      </Row>

      <Card>
        <Title level={4}>Liste des feuilles de calcul</Title>
        <Search
          placeholder="Rechercher une feuille..."
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginBottom: 20, width: 300 }}
          enterButton={<SearchOutlined />}
        />
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredSheets}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="Aucune feuille de calcul trouvée." /> }}
          />
        </Spin>
      </Card>

      <Modal
        title="Créer une nouvelle feuille de calcul"
        visible={isModalVisible}
        onOk={handleCreateSheet}
        onCancel={() => setIsModalVisible(false)}
        okText="Créer"
        cancelText="Annuler"
      >
        <Input
          placeholder="Nom de la nouvelle feuille"
          value={newSheetName}
          onChange={e => setNewSheetName(e.target.value)}
          onPressEnter={handleCreateSheet}
        />
      </Modal>
    </div>
  );
};

export default GoogleSheetsPage;
