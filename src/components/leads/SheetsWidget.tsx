import React, { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { 
  Card, 
  Button, 
  Form, 
  Modal, 
  Space, 
  message,
  List,
  Input,
  Table,
  Tag,
  Select
} from 'antd';
import { 
  TableOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  EyeOutlined,
  EditOutlined
} from '@ant-design/icons';

interface SheetData {
  id: string;
  name: string;
  webViewLink: string;
  lastModified: string;
  shared: boolean;
  sheetCount: number;
  owner: string;
}

interface SheetRow {
  [key: string]: string | number;
}

interface SheetsWidgetProps {
  leadEmail: string;
  leadName: string;
  leadId: string;
  onSheetCreated?: (sheetData: SheetCreatedData) => void;
}

interface SheetCreatedData {
  type: 'sheets_document';
  leadId: string;
  sheetId: string;
  sheetName: string;
  timestamp: Date;
}

const SheetsWidget: React.FC<SheetsWidgetProps> = ({ 
  leadEmail, 
  leadName, 
  leadId,
  onSheetCreated 
}) => {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<SheetData | null>(null);
  const [sheetData, setSheetData] = useState<SheetRow[]>([]);
  const [form] = Form.useForm();
  const api = useAuthenticatedApi();

  const loadSheets = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await api.api.get(`/sheets/list?leadId=${leadId}`);
      setSheets(response.sheets || []);
    } catch (error) {
      console.error('Erreur lors du chargement des feuilles:', error);
      // Feuilles simulées pour la démo
      setSheets([
        {
          id: '1',
          name: `Suivi_${leadName.replace(/\s+/g, '_')}`,
          webViewLink: 'https://docs.google.com/spreadsheets/d/1/edit',
          lastModified: new Date(Date.now() - 3600000).toISOString(),
          shared: true,
          sheetCount: 3,
          owner: 'moi@monentreprise.be'
        },
        {
          id: '2',
          name: 'Historique_Communications',
          webViewLink: 'https://docs.google.com/spreadsheets/d/2/edit',
          lastModified: new Date(Date.now() - 86400000).toISOString(),
          shared: false,
          sheetCount: 1,
          owner: 'moi@monentreprise.be'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [leadId, leadName, api.api]);

  useEffect(() => {
    loadSheets();
  }, [loadSheets]);

  const handleCreateSheet = async (values: {
    name: string;
    template: string;
    shareImmediately: boolean;
  }) => {
    try {
      setCreating(true);

      const response = await api.api.post('/sheets/create', {
        name: values.name,
        template: values.template,
        leadId,
        leadName,
        leadEmail,
        shareWith: values.shareImmediately ? [leadEmail] : [],
        context: {
          leadId,
          source: 'crm_lead'
        }
      });

      message.success(`Feuille "${values.name}" créée avec succès`);
      setCreateModalVisible(false);
      form.resetFields();
      
      // Recharger les feuilles
      await loadSheets();
      
      // Notifier le parent
      if (onSheetCreated) {
        onSheetCreated({
          type: 'sheets_document',
          leadId,
          sheetId: response.sheetId,
          sheetName: values.name,
          timestamp: new Date()
        });
      }
      
    } catch (error) {
      console.error('Erreur lors de la création de la feuille:', error);
      message.error('Erreur lors de la création de la feuille');
    } finally {
      setCreating(false);
    }
  };

  const handleViewSheet = async (sheet: SheetData) => {
    try {
      setSelectedSheet(sheet);
      setViewModalVisible(true);
      
      // Charger les données de la feuille
      const response = await api.api.get(`/sheets/${sheet.id}/data`);
      setSheetData(response.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      // Données simulées
      setSheetData([
        { Date: '2024-01-15', Action: 'Appel téléphonique', Statut: 'Complété', Notes: 'Premier contact établi' },
        { Date: '2024-01-16', Action: 'Email envoyé', Statut: 'En attente', Notes: 'Proposition commerciale' },
        { Date: '2024-01-17', Action: 'RDV planifié', Statut: 'À venir', Notes: 'Présentation produits' }
      ]);
    }
  };

  const handleShareSheet = async (sheet: SheetData) => {
    try {
      await api.api.post('/sheets/share', {
        sheetId: sheet.id,
        email: leadEmail,
        permission: 'reader',
        context: {
          leadId,
          source: 'crm_lead'
        }
      });

      message.success(`Feuille partagée avec ${leadName}`);
      await loadSheets(); // Recharger pour mettre à jour le statut
      
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      message.error('Erreur lors du partage de la feuille');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Générer les colonnes du tableau dynamiquement
  const getTableColumns = (data: SheetRow[]) => {
    if (data.length === 0) return [];
    
    const keys = Object.keys(data[0]);
    return keys.map(key => ({
      title: key,
      dataIndex: key,
      key: key,
      ellipsis: true,
      render: (text: string | number) => {
        if (key === 'Statut' && typeof text === 'string') {
          const color = text === 'Complété' ? 'green' : 
                       text === 'En attente' ? 'orange' : 
                       text === 'À venir' ? 'blue' : 'default';
          return <Tag color={color}>{text}</Tag>;
        }
        return text;
      }
    }));
  };

  return (
    <Card 
      title={
        <Space>
          <TableOutlined />
          Sheets - {leadName}
        </Space>
      }
      extra={
        <Space>
          <Button 
            size="small" 
            icon={<ReloadOutlined />} 
            onClick={loadSheets}
            loading={loading}
          />
          <Button 
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            Créer
          </Button>
        </Space>
      }
      className="mb-4"
    >
      <div className="mb-3">
        <div className="text-sm text-gray-600">
          Feuilles de calcul liées à ce lead
        </div>
      </div>

      <List
        loading={loading}
        dataSource={sheets}
        locale={{ emptyText: 'Aucune feuille de calcul' }}
        renderItem={(sheet) => (
          <List.Item
            actions={[
              <Button 
                key="view"
                size="small" 
                icon={<EyeOutlined />}
                onClick={() => handleViewSheet(sheet)}
              >
                Voir
              </Button>,
              <Button 
                key="edit"
                size="small" 
                icon={<EditOutlined />}
                onClick={() => window.open(sheet.webViewLink, '_blank')}
              >
                Éditer
              </Button>,
              <Button 
                key="share"
                size="small" 
                icon={<ShareAltOutlined />}
                onClick={() => handleShareSheet(sheet)}
                type={sheet.shared ? "default" : "primary"}
              >
                {sheet.shared ? 'Partagé' : 'Partager'}
              </Button>
            ]}
          >
            <List.Item.Meta
              avatar={<TableOutlined className="text-green-500" />}
              title={<span className="font-medium">{sheet.name}</span>}
              description={
                <div>
                  <div className="text-sm text-gray-600 mb-1">
                    {sheet.sheetCount} feuille{sheet.sheetCount > 1 ? 's' : ''} • 
                    Modifié le {formatDate(sheet.lastModified)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Propriétaire: {sheet.owner}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />

      {/* Modal de création de feuille */}
      <Modal
        title={`Nouvelle feuille de calcul pour ${leadName}`}
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateSheet}
          initialValues={{
            name: `Suivi_${leadName.replace(/\s+/g, '_')}`,
            template: 'lead_tracking',
            shareImmediately: true
          }}
        >
          <Form.Item
            name="name"
            label="Nom de la feuille"
            rules={[{ required: true, message: 'Veuillez saisir un nom' }]}
          >
            <Input placeholder="ex: Suivi_Client_XYZ" />
          </Form.Item>

          <Form.Item
            name="template"
            label="Modèle"
            rules={[{ required: true, message: 'Veuillez sélectionner un modèle' }]}
          >
            <Select>
              <Select.Option value="lead_tracking">Suivi de lead</Select.Option>
              <Select.Option value="project_timeline">Timeline de projet</Select.Option>
              <Select.Option value="budget_calculation">Calcul de budget</Select.Option>
              <Select.Option value="meeting_notes">Notes de réunion</Select.Option>
              <Select.Option value="blank">Feuille vierge</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="shareImmediately"
            label="Partage"
          >
            <Select>
              <Select.Option value={true}>Partager immédiatement avec {leadName}</Select.Option>
              <Select.Option value={false}>Garder privé pour le moment</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => setCreateModalVisible(false)}>
                Annuler
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={creating}
                icon={<PlusOutlined />}
              >
                Créer la feuille
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de visualisation de feuille */}
      <Modal
        title={`Aperçu: ${selectedSheet?.name}`}
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setSelectedSheet(null);
          setSheetData([]);
        }}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Fermer
          </Button>,
          <Button 
            key="edit" 
            type="primary" 
            icon={<EditOutlined />}
            onClick={() => selectedSheet && window.open(selectedSheet.webViewLink, '_blank')}
          >
            Éditer dans Sheets
          </Button>
        ]}
        width={800}
      >
        <Table
          dataSource={sheetData}
          columns={getTableColumns(sheetData)}
          pagination={{ pageSize: 5 }}
          size="small"
          scroll={{ x: true }}
          locale={{ emptyText: 'Aucune donnée dans cette feuille' }}
        />
      </Modal>
    </Card>
  );
};

export default SheetsWidget;
