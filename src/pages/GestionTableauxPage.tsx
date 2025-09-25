import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Input, Tag, Modal, Form, Select, InputNumber, message, Tooltip, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, UploadOutlined, SearchOutlined, TableOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface TableauData {
  id: string;
  name: string;
  description?: string;
  rows: number;
  columns: number;
  category: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

const GestionTableauxPage: React.FC = () => {
  const [tableaux, setTableaux] = useState<TableauData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTableau, setEditingTableau] = useState<TableauData | null>(null);
  const [form] = Form.useForm();

  // Données de démonstration
  const mockData: TableauData[] = [
    {
      id: '1',
      name: 'Tableau Orientation Solaire',
      description: 'Coefficients de rendement selon l\'orientation et l\'inclinaison des panneaux solaires',
      rows: 17,
      columns: 7,
      category: 'energie',
      createdAt: '2025-08-15T10:00:00Z',
      updatedAt: '2025-08-20T14:30:00Z',
      isActive: true
    },
    {
      id: '2',
      name: 'Tarifs Électricité',
      description: 'Grille tarifaire par fournisseur et type de contrat',
      rows: 25,
      columns: 6,
      category: 'tarification',
      createdAt: '2025-08-10T09:15:00Z',
      updatedAt: '2025-08-18T16:45:00Z',
      isActive: true
    },
    {
      id: '3',
      name: 'Coefficients Thermiques',
      description: 'Valeurs d\'isolation par matériau et épaisseur',
      rows: 12,
      columns: 4,
      category: 'thermique',
      createdAt: '2025-07-28T13:20:00Z',
      updatedAt: '2025-08-12T11:10:00Z',
      isActive: false
    }
  ];

  useEffect(() => {
    setTableaux(mockData);
  }, []);

  const categories = [
    { value: 'all', label: 'Toutes les catégories' },
    { value: 'energie', label: 'Énergie' },
    { value: 'tarification', label: 'Tarification' },
    { value: 'thermique', label: 'Thermique' },
    { value: 'photovoltaique', label: 'Photovoltaïque' },
    { value: 'pompe_chaleur', label: 'Pompe à chaleur' }
  ];

  const filteredTableaux = tableaux.filter(tableau => {
    const matchesSearch = tableau.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         tableau.description?.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tableau.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const columns: ColumnsType<TableauData> = [
    {
      title: 'Nom du tableau',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div className="font-medium">{text}</div>
          {record.description && (
            <div className="text-gray-500 text-sm">{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Dimensions',
      key: 'dimensions',
      render: (_, record) => (
        <Space>
          <Tag icon={<TableOutlined />}>
            {record.rows} × {record.columns}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Catégorie',
      dataIndex: 'category',
      key: 'category',
      render: (category) => {
        const categoryConfig = {
          energie: { color: 'green', label: 'Énergie' },
          tarification: { color: 'blue', label: 'Tarification' },
          thermique: { color: 'orange', label: 'Thermique' },
          photovoltaique: { color: 'gold', label: 'Photovoltaïque' },
          pompe_chaleur: { color: 'cyan', label: 'Pompe à chaleur' }
        };
        const config = categoryConfig[category as keyof typeof categoryConfig] || { color: 'default', label: category };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Statut',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Actif' : 'Inactif'}
        </Tag>
      ),
    },
    {
      title: 'Dernière MAJ',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date) => new Date(date).toLocaleDateString('fr-FR'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Voir le contenu">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewTableau(record)}
            />
          </Tooltip>
          <Tooltip title="Modifier">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditTableau(record)}
            />
          </Tooltip>
          <Tooltip title="Exporter">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => handleExportTableau(record)}
            />
          </Tooltip>
          <Tooltip title="Supprimer">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteTableau(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handleCreateTableau = () => {
    setEditingTableau(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditTableau = (tableau: TableauData) => {
    setEditingTableau(tableau);
    form.setFieldsValue(tableau);
    setIsModalVisible(true);
  };

  const handleViewTableau = (tableau: TableauData) => {
    message.info(`Affichage du tableau "${tableau.name}" - Fonctionnalité à implémenter`);
  };

  const handleExportTableau = (tableau: TableauData) => {
    message.success(`Export du tableau "${tableau.name}" en cours...`);
  };

  const handleDeleteTableau = (tableau: TableauData) => {
    Modal.confirm({
      title: 'Supprimer le tableau',
      content: `Êtes-vous sûr de vouloir supprimer le tableau "${tableau.name}" ?`,
      okText: 'Supprimer',
      cancelText: 'Annuler',
      okType: 'danger',
      onOk: () => {
        setTableaux(prev => prev.filter(t => t.id !== tableau.id));
        message.success('Tableau supprimé avec succès');
      }
    });
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
      if (editingTableau) {
        // Modifier
        setTableaux(prev => prev.map(t => 
          t.id === editingTableau.id 
            ? { ...t, ...values, updatedAt: new Date().toISOString() }
            : t
        ));
        message.success('Tableau modifié avec succès');
      } else {
        // Créer
        const newTableau: TableauData = {
          id: Date.now().toString(),
          ...values,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setTableaux(prev => [...prev, newTableau]);
        message.success('Tableau créé avec succès');
      }
      setIsModalVisible(false);
      form.resetFields();
    });
  };

  const handleImport = () => {
    message.info('Fonctionnalité d\'import à implémenter');
  };

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Tableaux</h1>
          <p className="text-gray-600 mt-1">
            Gérez vos tableaux de données et coefficients techniques
          </p>
        </div>
        <Space>
          <Button icon={<UploadOutlined />} onClick={handleImport}>
            Importer
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateTableau}>
            Nouveau tableau
          </Button>
        </Space>
      </div>

      {/* Filtres */}
      <Card>
        <div className="flex gap-4 items-center">
          <Input
            placeholder="Rechercher un tableau..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Select
            value={selectedCategory}
            onChange={setSelectedCategory}
            style={{ width: 200 }}
            options={categories}
          />
          <div className="text-gray-500">
            {filteredTableaux.length} tableau{filteredTableaux.length !== 1 ? 'x' : ''}
          </div>
        </div>
      </Card>

      {/* Liste des tableaux */}
      <Card>
        {filteredTableaux.length > 0 ? (
          <Table
            columns={columns}
            dataSource={filteredTableaux}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} sur ${total} tableaux`,
            }}
          />
        ) : (
          <Empty
            description={
              searchText || selectedCategory !== 'all' 
                ? "Aucun tableau ne correspond aux critères de recherche"
                : "Aucun tableau configuré"
            }
          />
        )}
      </Card>

      {/* Modal de création/édition */}
      <Modal
        title={editingTableau ? 'Modifier le tableau' : 'Nouveau tableau'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        okText="Enregistrer"
        cancelText="Annuler"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            isActive: true,
            rows: 10,
            columns: 5
          }}
        >
          <Form.Item
            name="name"
            label="Nom du tableau"
            rules={[{ required: true, message: 'Le nom est requis' }]}
          >
            <Input placeholder="Ex: Coefficients d'orientation solaire" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea 
              rows={3}
              placeholder="Description optionnelle du tableau"
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="rows"
              label="Nombre de lignes"
              rules={[{ required: true, message: 'Requis' }]}
            >
              <InputNumber min={1} max={100} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="columns"
              label="Nombre de colonnes"
              rules={[{ required: true, message: 'Requis' }]}
            >
              <InputNumber min={1} max={20} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item
            name="category"
            label="Catégorie"
            rules={[{ required: true, message: 'La catégorie est requise' }]}
          >
            <Select
              placeholder="Sélectionner une catégorie"
              options={categories.filter(cat => cat.value !== 'all')}
            />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Statut"
            valuePropName="checked"
          >
            <input type="checkbox" className="mr-2" />
            <span>Tableau actif</span>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default GestionTableauxPage;
