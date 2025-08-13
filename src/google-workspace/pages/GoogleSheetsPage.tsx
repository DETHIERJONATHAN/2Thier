import React, { useState, useEffect } from 'react';
import { Card, Typography, Spin, Button, Space, Row, Col, List, Avatar, Tag, Modal, Form, Input, Select, message, Tabs, Table, Statistic, Timeline, Progress, Badge, Radio, Checkbox, Tooltip, Tree } from 'antd';
import { TableOutlined, PlusOutlined, EditOutlined, ShareAltOutlined, DownloadOutlined, CopyOutlined, StarOutlined, SearchOutlined, FilterOutlined, SettingOutlined, SyncOutlined, FolderOutlined, TeamOutlined, CalculatorOutlined, BarChartOutlined, LineChartOutlined, FunctionOutlined, CommentOutlined, HistoryOutlined, DatabaseOutlined, TrophyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { TreeNode } = Tree;

interface GoogleSheet {
  id: string;
  name: string;
  type: 'spreadsheet' | 'template' | 'form-responses';
  createdAt: Date;
  modifiedAt: Date;
  owner: string;
  shared: boolean;
  starred: boolean;
  permissions: ('view' | 'edit' | 'comment')[];
  collaborators: SheetCollaborator[];
  folderId?: string;
  sheetCount: number;
  rowCount: number;
  columnCount: number;
  cellCount: number;
  formulaCount: number;
  chartCount: number;
  comments: SheetComment[];
  version: number;
  tags: string[];
  status: 'draft' | 'active' | 'archived' | 'template';
  webViewUrl?: string;
  editUrl?: string;
  exportUrls: {
    xlsx: string;
    pdf: string;
    csv: string;
    ods: string;
  };
  lastBackup?: Date;
  dataSource?: 'manual' | 'form' | 'api' | 'database';
}

interface SheetCollaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer' | 'commenter';
  isOnline: boolean;
  lastActive: Date;
  currentCell?: string;
  permissions: string[];
}

interface SheetComment {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
  resolved: boolean;
  cell: string;
  replies: SheetReply[];
}

interface SheetReply {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
}

interface SheetsStats {
  totalSheets: number;
  sharedSheets: number;
  starredSheets: number;
  recentSheets: number;
  totalCells: number;
  totalFormulas: number;
  totalCharts: number;
  activeCollaborations: number;
  unreadComments: number;
  dataVolume: number;
}

const GoogleSheetsPage: React.FC = () => {
  const [spreadsheets, setSpreadsheets] = useState<GoogleSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<GoogleSheet | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'cards'>('list');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [sheetsStats, setSheetsStats] = useState<SheetsStats>({
    totalSheets: 0,
    sharedSheets: 0,
    starredSheets: 0,
    recentSheets: 0,
    totalCells: 0,
    totalFormulas: 0,
    totalCharts: 0,
    activeCollaborations: 0,
    unreadComments: 0,
    dataVolume: 0
  });

  // Mock data pour démonstration
  const mockSpreadsheets: GoogleSheet[] = [
    {
      id: '1',
      name: 'Suivi Projets CRM 2025',
      type: 'spreadsheet',
      createdAt: new Date('2025-01-20'),
      modifiedAt: new Date('2025-01-24'),
      owner: 'dethier.jls@gmail.com',
      shared: true,
      starred: true,
      permissions: ['edit'],
      collaborators: [
        {
          id: '1',
          name: 'Jonathan Dethier',
          email: 'dethier.jls@gmail.com',
          role: 'owner',
          isOnline: true,
          lastActive: new Date(),
          currentCell: 'A15',
          permissions: ['read', 'write', 'share']
        },
        {
          id: '2',
          name: 'Équipe Dev',
          email: 'dev@2thier.be',
          role: 'editor',
          isOnline: false,
          lastActive: new Date(Date.now() - 3600000),
          permissions: ['read', 'write']
        }
      ],
      sheetCount: 5,
      rowCount: 1000,
      columnCount: 26,
      cellCount: 26000,
      formulaCount: 145,
      chartCount: 8,
      comments: [
        {
          id: '1',
          author: 'dev@2thier.be',
          content: 'Faut-il ajouter une colonne pour le budget ?',
          createdAt: new Date('2025-01-23'),
          resolved: false,
          cell: 'F10',
          replies: []
        }
      ],
      version: 24,
      tags: ['projets', 'crm', 'suivi', '2025'],
      status: 'active',
      editUrl: 'https://docs.google.com/spreadsheets/d/abc123/edit',
      exportUrls: {
        xlsx: 'https://docs.google.com/spreadsheets/d/abc123/export?format=xlsx',
        pdf: 'https://docs.google.com/spreadsheets/d/abc123/export?format=pdf',
        csv: 'https://docs.google.com/spreadsheets/d/abc123/export?format=csv',
        ods: 'https://docs.google.com/spreadsheets/d/abc123/export?format=ods'
      },
      lastBackup: new Date('2025-01-24'),
      dataSource: 'manual'
    },
    {
      id: '2',
      name: 'Budget 2025 - Prévisionnel',
      type: 'spreadsheet',
      createdAt: new Date('2025-01-15'),
      modifiedAt: new Date('2025-01-23'),
      owner: 'admin@2thier.be',
      shared: true,
      starred: false,
      permissions: ['view'],
      collaborators: [
        {
          id: '3',
          name: 'Admin 2Thier',
          email: 'admin@2thier.be',
          role: 'owner',
          isOnline: false,
          lastActive: new Date(Date.now() - 7200000),
          permissions: ['read', 'write', 'share']
        }
      ],
      sheetCount: 12,
      rowCount: 500,
      columnCount: 15,
      cellCount: 7500,
      formulaCount: 89,
      chartCount: 12,
      comments: [],
      version: 18,
      tags: ['budget', 'prévisionnel', 'finances'],
      status: 'active',
      editUrl: 'https://docs.google.com/spreadsheets/d/def456/edit',
      exportUrls: {
        xlsx: 'https://docs.google.com/spreadsheets/d/def456/export?format=xlsx',
        pdf: 'https://docs.google.com/spreadsheets/d/def456/export?format=pdf',
        csv: 'https://docs.google.com/spreadsheets/d/def456/export?format=csv',
        ods: 'https://docs.google.com/spreadsheets/d/def456/export?format=ods'
      },
      lastBackup: new Date('2025-01-23'),
      dataSource: 'manual'
    },
    {
      id: '3',
      name: 'Réponses Formulaire Contact',
      type: 'form-responses',
      createdAt: new Date('2025-01-22'),
      modifiedAt: new Date('2025-01-24'),
      owner: 'contact@2thier.be',
      shared: false,
      starred: true,
      permissions: ['edit'],
      collaborators: [
        {
          id: '4',
          name: 'Contact 2Thier',
          email: 'contact@2thier.be',
          role: 'owner',
          isOnline: true,
          lastActive: new Date(),
          permissions: ['read', 'write']
        }
      ],
      sheetCount: 1,
      rowCount: 247,
      columnCount: 8,
      cellCount: 1976,
      formulaCount: 12,
      chartCount: 3,
      comments: [],
      version: 247,
      tags: ['formulaire', 'contact', 'leads'],
      status: 'active',
      editUrl: 'https://docs.google.com/spreadsheets/d/ghi789/edit',
      exportUrls: {
        xlsx: 'https://docs.google.com/spreadsheets/d/ghi789/export?format=xlsx',
        pdf: 'https://docs.google.com/spreadsheets/d/ghi789/export?format=pdf',
        csv: 'https://docs.google.com/spreadsheets/d/ghi789/export?format=csv',
        ods: 'https://docs.google.com/spreadsheets/d/ghi789/export?format=ods'
      },
      lastBackup: new Date('2025-01-24'),
      dataSource: 'form'
    }
  ];

  const sheetTemplates = [
    { id: 'template_1', name: '📊 Feuille vierge', description: 'Nouvelle feuille de calcul vide', icon: <TableOutlined /> },
    { id: 'template_2', name: '📈 Tableau de bord', description: 'Dashboard avec graphiques', icon: <BarChartOutlined /> },
    { id: 'template_3', name: '💰 Budget personnel', description: 'Suivi des finances', icon: <CalculatorOutlined /> },
    { id: 'template_4', name: '📋 Suivi de projet', description: 'Gestion de projets', icon: <FolderOutlined /> },
    { id: 'template_5', name: '📅 Planning', description: 'Calendrier et planning', icon: <TableOutlined /> },
    { id: 'template_6', name: '📊 Analyse des ventes', description: 'Suivi commercial', icon: <LineChartOutlined /> },
    { id: 'template_7', name: '👥 Gestion d\'équipe', description: 'RH et équipes', icon: <TeamOutlined /> },
    { id: 'template_8', name: '📋 Inventaire', description: 'Gestion de stock', icon: <DatabaseOutlined /> }
  ];

  useEffect(() => {
    setSpreadsheets(mockSpreadsheets);
    calculateStats(mockSpreadsheets);
  }, []);

  const calculateStats = (sheets: GoogleSheet[]) => {
    const sharedSheets = sheets.filter(s => s.shared).length;
    const starredSheets = sheets.filter(s => s.starred).length;
    const recentSheets = sheets.filter(s => dayjs(s.modifiedAt).isAfter(dayjs().subtract(7, 'days'))).length;
    const totalCells = sheets.reduce((acc, sheet) => acc + sheet.cellCount, 0);
    const totalFormulas = sheets.reduce((acc, sheet) => acc + sheet.formulaCount, 0);
    const totalCharts = sheets.reduce((acc, sheet) => acc + sheet.chartCount, 0);
    const activeCollaborations = sheets.filter(s => s.collaborators.some(c => c.isOnline)).length;
    const unreadComments = sheets.reduce((acc, sheet) => acc + sheet.comments.filter(c => !c.resolved).length, 0);

    setSheetsStats({
      totalSheets: sheets.length,
      sharedSheets,
      starredSheets,
      recentSheets,
      totalCells,
      totalFormulas,
      totalCharts,
      activeCollaborations,
      unreadComments,
      dataVolume: Math.round(totalCells / 1000)
    });
  };

  const getSheetIcon = (type: string) => {
    const icons = {
      spreadsheet: <TableOutlined className="text-green-500" />,
      template: <TableOutlined className="text-blue-500" />,
      'form-responses': <TableOutlined className="text-purple-500" />
    };
    return icons[type] || <TableOutlined />;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'default',
      active: 'green',
      archived: 'red',
      template: 'blue'
    };
    return colors[status] || 'default';
  };

  const handleSheetAction = (action: string, sheetIds: string[]) => {
    switch (action) {
      case 'delete':
        message.success(`${sheetIds.length} feuille(s) supprimée(s)`);
        break;
      case 'share':
        setShowShareModal(true);
        break;
      case 'star':
        message.success(`${sheetIds.length} feuille(s) marquée(s) comme favorites`);
        break;
      case 'export':
        message.success(`Export de ${sheetIds.length} feuille(s) démarré`);
        break;
    }
  };

  const handleCreateSheet = (values: { name: string; type: string; folderId?: string; template?: string; tags?: string[] }) => {
    console.log('Nouvelle feuille:', values);
    message.success('Feuille de calcul créée avec succès !');
    setShowCreateModal(false);
    // Ouvrir Google Sheets dans un nouvel onglet
    window.open('https://docs.google.com/spreadsheets/create', '_blank');
  };

  const filteredSpreadsheets = spreadsheets.filter(sheet =>
    sheet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sheet.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <Title level={2} className="flex items-center gap-3 mb-2">
          <TableOutlined className="text-green-500" />
          Google Sheets Pro - Tableurs et Analyses Avancées
        </Title>
        <Text className="text-gray-600">
          Interface complète de gestion de feuilles de calcul avec formules, graphiques et collaboration temps réel
        </Text>
      </div>

      {/* Statistiques rapides */}
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={12} sm={6}>
          <Statistic
            title="Feuilles"
            value={sheetsStats.totalSheets}
            prefix={<TableOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Formules"
            value={sheetsStats.totalFormulas}
            prefix={<FunctionOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Graphiques"
            value={sheetsStats.totalCharts}
            prefix={<BarChartOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Cellules"
            value={`${Math.round(sheetsStats.totalCells / 1000)}k`}
            prefix={<DatabaseOutlined />}
            valueStyle={{ color: '#fa8c16' }}
          />
        </Col>
      </Row>

      <Tabs defaultActiveKey="sheets" className="flex-1">
        <TabPane tab={<span><TableOutlined /> Mes Feuilles</span>} key="sheets">
          <Row gutter={[16, 16]} className="h-full">
            {/* Sidebar gauche */}
            <Col xs={24} lg={6}>
              <Space direction="vertical" className="w-full" size="middle">
                {/* Actions rapides */}
                <Card size="small" title="⚡ Actions Rapides">
                  <Space direction="vertical" className="w-full">
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setShowCreateModal(true)}
                      className="w-full"
                      size="large"
                    >
                      Nouvelle feuille
                    </Button>
                    <Button
                      icon={<TableOutlined />}
                      onClick={() => setShowTemplatesModal(true)}
                      className="w-full"
                    >
                      Templates
                    </Button>
                    <Button
                      icon={<BarChartOutlined />}
                      onClick={() => setShowAnalyticsModal(true)}
                      className="w-full"
                    >
                      Analytics
                    </Button>
                    <Button
                      icon={<SyncOutlined />}
                      className="w-full"
                      onClick={() => {
                        setLoading(true);
                        setTimeout(() => setLoading(false), 1000);
                        message.success('Feuilles synchronisées !');
                      }}
                    >
                      Synchroniser
                    </Button>
                  </Space>
                </Card>

                {/* Navigation */}
                <Card size="small" title="📁 Navigation">
                  <Tree
                    showIcon
                    defaultExpandedKeys={['recent']}
                    defaultSelectedKeys={['recent']}
                  >
                    <TreeNode icon={<TableOutlined />} title="Toutes les feuilles" key="all" />
                    <TreeNode icon={<HistoryOutlined />} title="Récentes" key="recent" />
                    <TreeNode icon={<StarOutlined />} title="Favorites" key="starred" />
                    <TreeNode icon={<ShareAltOutlined />} title="Partagées" key="shared" />
                    <TreeNode icon={<TeamOutlined />} title="Collaborations" key="collaborations" />
                    <TreeNode icon={<FolderOutlined />} title="Projets CRM" key="crm" />
                    <TreeNode icon={<DatabaseOutlined />} title="Données" key="data" />
                  </Tree>
                </Card>

                {/* Feuilles récentes */}
                <Card size="small" title="🕒 Récentes" className="max-h-64 overflow-y-auto">
                  <List
                    size="small"
                    dataSource={spreadsheets.filter(s => dayjs(s.modifiedAt).isAfter(dayjs().subtract(7, 'days'))).slice(0, 5)}
                    renderItem={(sheet) => (
                      <List.Item className="cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <Space>
                          {getSheetIcon(sheet.type)}
                          <div>
                            <Text strong className="text-sm block">{sheet.name.length > 15 ? sheet.name.substring(0, 15) + '...' : sheet.name}</Text>
                            <Text type="secondary" className="text-xs">
                              {dayjs(sheet.modifiedAt).fromNow()}
                            </Text>
                          </div>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>

                {/* Collaborateurs en ligne */}
                <Card size="small" title="👥 En ligne" className="max-h-64 overflow-y-auto">
                  <List
                    size="small"
                    dataSource={spreadsheets.flatMap(s => s.collaborators.filter(c => c.isOnline))}
                    renderItem={(collaborator) => (
                      <List.Item>
                        <Space>
                          <Badge status="processing" />
                          <Avatar size="small" style={{ backgroundColor: '#52c41a' }}>
                            {collaborator.name.charAt(0)}
                          </Avatar>
                          <div>
                            <Text className="text-sm block">{collaborator.name}</Text>
                            {collaborator.currentCell && (
                              <Text type="secondary" className="text-xs">
                                Cellule {collaborator.currentCell}
                              </Text>
                            )}
                          </div>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </Space>
            </Col>

            {/* Contenu principal */}
            <Col xs={24} lg={18}>
              <Card 
                className="h-full"
                title={
                  <div className="flex items-center justify-between">
                    <span>📊 Mes Feuilles Google Sheets</span>
                    <Space>
                      <Input.Search
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: 200 }}
                        enterButton={<SearchOutlined />}
                      />
                      <Radio.Group 
                        value={viewMode} 
                        onChange={(e) => setViewMode(e.target.value)}
                        size="small"
                      >
                        <Radio.Button value="list">Liste</Radio.Button>
                        <Radio.Button value="grid">Grille</Radio.Button>
                        <Radio.Button value="cards">Cartes</Radio.Button>
                      </Radio.Group>
                      <Button icon={<FilterOutlined />} size="small">Filtres</Button>
                      <Button icon={<SettingOutlined />} size="small" onClick={() => setShowSettingsDrawer(true)}>
                        Paramètres
                      </Button>
                    </Space>
                  </div>
                }
              >
                {/* Vue liste */}
                {viewMode === 'list' && (
                  <Table
                    dataSource={filteredSpreadsheets}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    columns={[
                      {
                        title: 'Feuille',
                        dataIndex: 'name',
                        key: 'name',
                        render: (text, record) => (
                          <Space direction="vertical" size="small">
                            <Space>
                              {getSheetIcon(record.type)}
                              <Text strong>{text}</Text>
                              {record.starred && <StarOutlined className="text-yellow-500" />}
                              {record.shared && <ShareAltOutlined className="text-blue-500" />}
                            </Space>
                            <Space>
                              <Tag color={getStatusColor(record.status)}>{record.status}</Tag>
                              <Text type="secondary" className="text-xs">
                                {record.sheetCount} feuilles • {record.formulaCount} formules
                              </Text>
                              {record.comments.length > 0 && (
                                <Badge count={record.comments.length} size="small">
                                  <CommentOutlined className="text-orange-500" />
                                </Badge>
                              )}
                            </Space>
                          </Space>
                        )
                      },
                      {
                        title: 'Données',
                        key: 'data',
                        render: (record) => (
                          <Space direction="vertical" size="small">
                            <Text className="text-sm">{record.rowCount.toLocaleString()} lignes</Text>
                            <Text type="secondary" className="text-xs">
                              {record.cellCount.toLocaleString()} cellules
                            </Text>
                          </Space>
                        )
                      },
                      {
                        title: 'Modifiée',
                        key: 'modified',
                        render: (record) => (
                          <Space direction="vertical" size="small">
                            <Text>{dayjs(record.modifiedAt).format('DD/MM/YYYY')}</Text>
                            <Text type="secondary" className="text-xs">
                              {dayjs(record.modifiedAt).fromNow()}
                            </Text>
                          </Space>
                        )
                      },
                      {
                        title: 'Collaborateurs',
                        key: 'collaborators',
                        render: (record) => (
                          <Avatar.Group maxCount={3} size="small">
                            {record.collaborators.map(c => (
                              <Tooltip key={c.id} title={`${c.name} (${c.role}) - ${c.isOnline ? 'En ligne' : 'Hors ligne'}`}>
                                <Avatar style={{ backgroundColor: c.isOnline ? '#52c41a' : '#d9d9d9' }}>
                                  {c.name.charAt(0)}
                                </Avatar>
                              </Tooltip>
                            ))}
                          </Avatar.Group>
                        )
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        render: (record) => (
                          <Space>
                            <Button
                              type="primary"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => window.open(record.editUrl || 'https://docs.google.com/spreadsheets/create', '_blank')}
                            >
                              Ouvrir
                            </Button>
                            <Button
                              type="link"
                              size="small"
                              icon={<ShareAltOutlined />}
                              onClick={() => {
                                setSelectedSheet(record);
                                setShowShareModal(true);
                              }}
                            />
                            <Button
                              type="link"
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() => window.open(record.exportUrls.xlsx, '_blank')}
                            />
                            <Button
                              type="link"
                              size="small"
                              icon={<CopyOutlined />}
                            />
                          </Space>
                        )
                      }
                    ]}
                  />
                )}

                {/* Vue grille */}
                {viewMode === 'grid' && (
                  <Row gutter={[16, 16]}>
                    {filteredSpreadsheets.map(sheet => (
                      <Col xs={12} sm={8} md={6} lg={4} key={sheet.id}>
                        <Card
                          size="small"
                          hoverable
                          className="text-center"
                          cover={
                            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100">
                              <div className="text-4xl mb-2">{getSheetIcon(sheet.type)}</div>
                              <div className="text-xs text-gray-600">
                                {sheet.rowCount} lignes • {sheet.formulaCount} formules
                              </div>
                            </div>
                          }
                          actions={[
                            <EditOutlined key="edit" onClick={() => window.open(sheet.editUrl || 'https://docs.google.com/spreadsheets/', '_blank')} />,
                            <ShareAltOutlined key="share" onClick={() => {
                              setSelectedSheet(sheet);
                              setShowShareModal(true);
                            }} />,
                            <DownloadOutlined key="download" onClick={() => window.open(sheet.exportUrls.xlsx, '_blank')} />
                          ]}
                        >
                          <Card.Meta
                            title={
                              <Tooltip title={sheet.name}>
                                <Text className="text-sm">
                                  {sheet.name.length > 12 ? sheet.name.substring(0, 12) + '...' : sheet.name}
                                </Text>
                              </Tooltip>
                            }
                            description={
                              <div>
                                <Tag color={getStatusColor(sheet.status)} size="small">{sheet.status}</Tag>
                                <div className="mt-1">
                                  {sheet.starred && <StarOutlined className="text-yellow-500 mr-1" />}
                                  {sheet.shared && <ShareAltOutlined className="text-blue-500" />}
                                </div>
                              </div>
                            }
                          />
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}

                {/* Vue cartes */}
                {viewMode === 'cards' && (
                  <List
                    grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }}
                    dataSource={filteredSpreadsheets}
                    renderItem={(sheet) => (
                      <List.Item>
                        <Card
                          hoverable
                          actions={[
                            <EditOutlined key="edit" onClick={() => window.open(sheet.editUrl || 'https://docs.google.com/spreadsheets/', '_blank')} />,
                            <ShareAltOutlined key="share" />,
                            <DownloadOutlined key="download" onClick={() => window.open(sheet.exportUrls.xlsx, '_blank')} />,
                            <StarOutlined key="star" className={sheet.starred ? 'text-yellow-500' : ''} />
                          ]}
                        >
                          <Card.Meta
                            avatar={getSheetIcon(sheet.type)}
                            title={sheet.name}
                            description={
                              <Space direction="vertical" size="small" className="w-full">
                                <div>
                                  <Tag color={getStatusColor(sheet.status)}>{sheet.status}</Tag>
                                  {sheet.shared && <Tag color="blue">Partagée</Tag>}
                                </div>
                                <Text type="secondary" className="text-xs">
                                  {sheet.rowCount.toLocaleString()} lignes • {sheet.formulaCount} formules • {sheet.chartCount} graphiques
                                </Text>
                                <Text type="secondary" className="text-xs">
                                  Modifiée {dayjs(sheet.modifiedAt).fromNow()}
                                </Text>
                                <Avatar.Group maxCount={3} size="small">
                                  {sheet.collaborators.map(c => (
                                    <Avatar key={c.id} style={{ backgroundColor: '#52c41a' }}>
                                      {c.name.charAt(0)}
                                    </Avatar>
                                  ))}
                                </Avatar.Group>
                              </Space>
                            }
                          />
                        </Card>
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab={<span><BarChartOutlined /> Analytics</span>} key="analytics">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="📊 Utilisation des Données">
                <Space direction="vertical" className="w-full" size="large">
                  <Statistic
                    title="Volume de données"
                    value={`${sheetsStats.dataVolume}k`}
                    suffix="cellules"
                    prefix={<DatabaseOutlined />}
                  />
                  <Progress
                    percent={Math.round((sheetsStats.totalFormulas / Math.max(sheetsStats.totalCells, 1)) * 100)}
                    status="active"
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    format={(percent) => `${percent}% formules`}
                  />
                  <Statistic
                    title="Formules actives"
                    value={sheetsStats.totalFormulas}
                    suffix={`/ ${sheetsStats.totalCells}`}
                  />
                </Space>
              </Card>
            </Col>
            
            <Col xs={24} lg={12}>
              <Card title="📈 Activité">
                <Timeline>
                  <Timeline.Item color="green">
                    <Text strong>Collaborations actives:</Text> {sheetsStats.activeCollaborations}
                  </Timeline.Item>
                  <Timeline.Item color="blue">
                    <Text strong>Feuilles partagées:</Text> {sheetsStats.sharedSheets}
                  </Timeline.Item>
                  <Timeline.Item color="orange">
                    <Text strong>Graphiques créés:</Text> {sheetsStats.totalCharts}
                  </Timeline.Item>
                  <Timeline.Item>
                    <Text strong>Feuilles récentes:</Text> {sheetsStats.recentSheets}
                  </Timeline.Item>
                </Timeline>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab={<span><TrophyOutlined /> Statistiques</span>} key="stats">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Card title="📊 Vue d'ensemble">
                <Statistic
                  title="Total feuilles"
                  value={sheetsStats.totalSheets}
                  prefix={<TableOutlined />}
                />
                <Progress
                  percent={Math.round((sheetsStats.sharedSheets / Math.max(sheetsStats.totalSheets, 1)) * 100)}
                  strokeColor="#52c41a"
                  format={(percent) => `${percent}% partagées`}
                />
              </Card>
            </Col>
            
            <Col xs={24} lg={8}>
              <Card title="⚡ Performance">
                <Space direction="vertical" className="w-full">
                  <Statistic
                    title="Formules"
                    value={sheetsStats.totalFormulas}
                    prefix={<FunctionOutlined />}
                  />
                  <Statistic
                    title="Graphiques"
                    value={sheetsStats.totalCharts}
                    prefix={<BarChartOutlined />}
                  />
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card title="👥 Collaboration">
                <Space direction="vertical" className="w-full">
                  <Statistic
                    title="Sessions actives"
                    value={sheetsStats.activeCollaborations}
                    prefix={<TeamOutlined />}
                  />
                  <Statistic
                    title="Commentaires"
                    value={sheetsStats.unreadComments}
                    prefix={<CommentOutlined />}
                  />
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>

      {/* Modal de création de feuille */}
      <Modal
        title="📊 Créer une Nouvelle Feuille"
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={null}
        width={600}
      >
        <Form layout="vertical" onFinish={handleCreateSheet}>
          <Form.Item label="Nom de la feuille" name="name" rules={[{ required: true }]}>
            <Input placeholder="Nom de la feuille..." />
          </Form.Item>

          <Form.Item label="Type de feuille" name="type" rules={[{ required: true }]}>
            <Select placeholder="Type">
              <Option value="spreadsheet">📊 Feuille de calcul</Option>
              <Option value="template">📋 Template</Option>
              <Option value="dashboard">📈 Tableau de bord</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Dossier" name="folderId">
            <Select placeholder="Choisir un dossier">
              <Option value="root">📁 Racine</Option>
              <Option value="crm">📁 Projets CRM</Option>
              <Option value="finance">📁 Finance</Option>
              <Option value="data">📁 Données</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Template de base" name="template">
            <Select placeholder="Choisir un template">
              <Option value="blank">📄 Feuille vierge</Option>
              <Option value="budget">💰 Budget</Option>
              <Option value="project">📋 Projet</Option>
              <Option value="dashboard">📊 Dashboard</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Tags" name="tags">
            <Select mode="tags" placeholder="Ajouter des tags...">
              <Option value="analyse">Analyse</Option>
              <Option value="budget">Budget</Option>
              <Option value="projet">Projet</Option>
              <Option value="data">Données</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Checkbox>🔗 Partager immédiatement</Checkbox>
              <Checkbox>⭐ Marquer comme favorite</Checkbox>
              <Checkbox>📊 Ajouter graphiques</Checkbox>
            </Space>
          </Form.Item>

          <Form.Item>
            <Space className="w-full justify-end">
              <Button onClick={() => setShowCreateModal(false)}>Annuler</Button>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                Créer la feuille
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal des templates */}
      <Modal
        title="📋 Choisir un Template"
        open={showTemplatesModal}
        onCancel={() => setShowTemplatesModal(false)}
        footer={null}
        width={800}
      >
        <Row gutter={[16, 16]}>
          {sheetTemplates.map(template => (
            <Col xs={12} sm={8} md={6} key={template.id}>
              <Card
                hoverable
                size="small"
                className="text-center"
                onClick={() => {
                  window.open('https://docs.google.com/spreadsheets/create', '_blank');
                  setShowTemplatesModal(false);
                }}
              >
                <div className="text-3xl mb-2">{template.icon}</div>
                <Text strong className="text-sm block">{template.name.substring(2)}</Text>
                <Text type="secondary" className="text-xs">{template.description}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Modal>

      {/* Google Sheets intégré en iframe */}
      <div className="mt-4 flex-1">
        <Card title="📊 Google Sheets Web Intégré" className="h-full">
          <div className="relative w-full h-96">
            <Spin 
              size="large" 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
            />
            <iframe
              src="https://docs.google.com/spreadsheets/"
              className="w-full h-full border-0 rounded"
              title="Google Sheets Interface"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
              onLoad={(e) => {
                const spinner = e.currentTarget.parentElement?.querySelector('.ant-spin');
                if (spinner) {
                  (spinner as HTMLElement).style.display = 'none';
                }
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GoogleSheetsPage;
