import React, { useState, useMemo } from 'react';
import { Input, Popover, Space, Typography, Tag, Button, Row, Col, Empty } from 'antd';
import {
  SearchOutlined,
  CloseCircleOutlined,
  // Business & Commerce
  ShopOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  WalletOutlined,
  CreditCardOutlined,
  DollarOutlined,
  EuroOutlined,
  MoneyCollectOutlined,
  
  // Communication
  PhoneOutlined,
  MailOutlined,
  MessageOutlined,
  CommentOutlined,
  CustomerServiceOutlined,
  WhatsAppOutlined,
  WechatOutlined,
  
  // Social
  FacebookOutlined,
  TwitterOutlined,
  InstagramOutlined,
  LinkedinOutlined,
  YoutubeOutlined,
  GithubOutlined,
  
  // Technology
  RocketOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  CodeOutlined,
  BugOutlined,
  CloudOutlined,
  DatabaseOutlined,
  LaptopOutlined,
  MobileOutlined,
  TabletOutlined,
  DesktopOutlined,
  
  // Energy & Environment
  FireOutlined,
  BulbOutlined,
  ThunderboltFilled,
  SunOutlined,
  CloudSyncOutlined,
  ExperimentOutlined,
  
  // Navigation & Direction
  HomeOutlined,
  EnvironmentOutlined,
  CompassOutlined,
  AimOutlined,
  GlobalOutlined,
  
  // Actions
  CheckCircleOutlined,
  CloseOutlined,
  PlusOutlined,
  MinusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  DownloadOutlined,
  UploadOutlined,
  ShareAltOutlined,
  
  // Status & Indicators
  StarOutlined,
  StarFilled,
  HeartOutlined,
  HeartFilled,
  LikeOutlined,
  DislikeOutlined,
  TrophyOutlined,
  CrownOutlined,
  SafetyCertificateOutlined,
  
  // Files & Documents
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FolderOutlined,
  
  // Media
  PictureOutlined,
  VideoCameraOutlined,
  CameraOutlined,
  PlayCircleOutlined,
  SoundOutlined,
  
  // User & Team
  UserOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  IdcardOutlined,
  ContactsOutlined,
  
  // Time & Calendar
  ClockCircleOutlined,
  CalendarOutlined,
  HistoryOutlined,
  FieldTimeOutlined,
  
  // Tools & Settings
  SettingOutlined,
  ToolOutlined,
  BuildOutlined,
  ControlOutlined,
  AppstoreOutlined,
  
  // Security
  LockOutlined,
  UnlockOutlined,
  SafetyOutlined,
  KeyOutlined,
  
  // Charts & Data
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  DotChartOutlined,
  AreaChartOutlined,
  FundOutlined,
  StockOutlined,
  RiseOutlined,
  FallOutlined,
  
  // Alerts & Notifications
  BellOutlined,
  NotificationOutlined,
  AlertOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  ExclamationCircleOutlined,
  
  // Transport
  CarOutlined,
  RocketFilled,
  SendOutlined,
  
  // Misc
  GiftOutlined,
  SmileOutlined,
  FrownOutlined,
  MehOutlined,
  TagOutlined,
  TagsOutlined,
  BookOutlined,
  ReadOutlined,
  DashboardOutlined,
  BlockOutlined,
  LayoutOutlined,
  MenuOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  FontSizeOutlined,
  BoldOutlined,
  ItalicOutlined,
  PaperClipOutlined,
  ScissorOutlined,
  CopyOutlined,
  SnippetsOutlined,
  DiffOutlined,
  HighlightOutlined,
  FormatPainterOutlined,
  InsertRowBelowOutlined,
  TableOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  CompressOutlined,
  FullscreenOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SkinOutlined,
  BgColorsOutlined,
  PrinterOutlined,
  QrcodeOutlined,
  ScanOutlined,
  FlagOutlined,
  FunnelPlotOutlined,
  RadarChartOutlined,
  HeatMapOutlined,
  DeploymentUnitOutlined,
  ApartmentOutlined,
  NodeIndexOutlined,
  BranchesOutlined,
  PullRequestOutlined,
  MergeCellsOutlined,
  SplitCellsOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

// 🎨 Catégories d'icônes avec couleurs
const iconCategories = [
  {
    name: 'Énergie & Environnement',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    icons: [
      { name: 'ThunderboltFilled', component: ThunderboltFilled, keywords: ['éclair', 'électricité', 'énergie', 'rapide', 'power'] },
      { name: 'ThunderboltOutlined', component: ThunderboltOutlined, keywords: ['éclair', 'électricité', 'énergie'] },
      { name: 'SunOutlined', component: SunOutlined, keywords: ['soleil', 'solaire', 'photovoltaïque', 'pv'] },
      { name: 'BulbOutlined', component: BulbOutlined, keywords: ['ampoule', 'lumière', 'idée', 'économie'] },
      { name: 'FireOutlined', component: FireOutlined, keywords: ['feu', 'chauffage', 'chaud'] },
      { name: 'CloudSyncOutlined', component: CloudSyncOutlined, keywords: ['nuage', 'sync', 'environnement'] },
      { name: 'ExperimentOutlined', component: ExperimentOutlined, keywords: ['expérience', 'science', 'labo'] },
    ]
  },
  {
    name: 'Business & Commerce',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    icons: [
      { name: 'ShopOutlined', component: ShopOutlined, keywords: ['magasin', 'boutique', 'commerce'] },
      { name: 'ShoppingCartOutlined', component: ShoppingCartOutlined, keywords: ['panier', 'achat', 'shop'] },
      { name: 'ShoppingOutlined', component: ShoppingOutlined, keywords: ['shopping', 'sac', 'achat'] },
      { name: 'WalletOutlined', component: WalletOutlined, keywords: ['portefeuille', 'argent', 'money'] },
      { name: 'CreditCardOutlined', component: CreditCardOutlined, keywords: ['carte', 'paiement', 'payment'] },
      { name: 'DollarOutlined', component: DollarOutlined, keywords: ['dollar', 'argent', 'prix'] },
      { name: 'EuroOutlined', component: EuroOutlined, keywords: ['euro', 'argent', 'prix'] },
      { name: 'MoneyCollectOutlined', component: MoneyCollectOutlined, keywords: ['argent', 'collecte', 'money'] },
    ]
  },
  {
    name: 'Communication',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    icons: [
      { name: 'PhoneOutlined', component: PhoneOutlined, keywords: ['téléphone', 'appel', 'contact'] },
      { name: 'MailOutlined', component: MailOutlined, keywords: ['email', 'mail', 'message', 'contact'] },
      { name: 'MessageOutlined', component: MessageOutlined, keywords: ['message', 'chat', 'conversation'] },
      { name: 'CommentOutlined', component: CommentOutlined, keywords: ['commentaire', 'discussion', 'chat'] },
      { name: 'CustomerServiceOutlined', component: CustomerServiceOutlined, keywords: ['service client', 'support', 'aide'] },
      { name: 'WhatsAppOutlined', component: WhatsAppOutlined, keywords: ['whatsapp', 'messenger'] },
      { name: 'WechatOutlined', component: WechatOutlined, keywords: ['wechat', 'chat'] },
    ]
  },
  {
    name: 'Réseaux Sociaux',
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    icons: [
      { name: 'FacebookOutlined', component: FacebookOutlined, keywords: ['facebook', 'fb', 'social'] },
      { name: 'TwitterOutlined', component: TwitterOutlined, keywords: ['twitter', 'x', 'social'] },
      { name: 'InstagramOutlined', component: InstagramOutlined, keywords: ['instagram', 'insta', 'social'] },
      { name: 'LinkedinOutlined', component: LinkedinOutlined, keywords: ['linkedin', 'professionnel', 'social'] },
      { name: 'YoutubeOutlined', component: YoutubeOutlined, keywords: ['youtube', 'vidéo', 'social'] },
      { name: 'GithubOutlined', component: GithubOutlined, keywords: ['github', 'code', 'dev'] },
    ]
  },
  {
    name: 'Technologie',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    icons: [
      { name: 'RocketOutlined', component: RocketOutlined, keywords: ['fusée', 'rapide', 'démarrage', 'startup'] },
      { name: 'RocketFilled', component: RocketFilled, keywords: ['fusée', 'rapide', 'démarrage'] },
      { name: 'ApiOutlined', component: ApiOutlined, keywords: ['api', 'intégration', 'code'] },
      { name: 'CodeOutlined', component: CodeOutlined, keywords: ['code', 'développement', 'dev'] },
      { name: 'CloudOutlined', component: CloudOutlined, keywords: ['cloud', 'nuage', 'stockage'] },
      { name: 'DatabaseOutlined', component: DatabaseOutlined, keywords: ['database', 'données', 'bdd'] },
      { name: 'LaptopOutlined', component: LaptopOutlined, keywords: ['ordinateur', 'laptop', 'pc'] },
      { name: 'MobileOutlined', component: MobileOutlined, keywords: ['mobile', 'téléphone', 'app'] },
      { name: 'TabletOutlined', component: TabletOutlined, keywords: ['tablette', 'ipad', 'device'] },
      { name: 'DesktopOutlined', component: DesktopOutlined, keywords: ['ordinateur', 'desktop', 'écran'] },
    ]
  },
  {
    name: 'Navigation',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    icons: [
      { name: 'HomeOutlined', component: HomeOutlined, keywords: ['maison', 'accueil', 'home'] },
      { name: 'EnvironmentOutlined', component: EnvironmentOutlined, keywords: ['localisation', 'adresse', 'map'] },
      { name: 'CompassOutlined', component: CompassOutlined, keywords: ['boussole', 'direction', 'navigation'] },
      { name: 'AimOutlined', component: AimOutlined, keywords: ['cible', 'objectif', 'target'] },
      { name: 'GlobalOutlined', component: GlobalOutlined, keywords: ['globe', 'monde', 'international'] },
    ]
  },
  {
    name: 'Actions',
    color: '#14b8a6',
    gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    icons: [
      { name: 'CheckCircleOutlined', component: CheckCircleOutlined, keywords: ['valider', 'ok', 'succès'] },
      { name: 'PlusOutlined', component: PlusOutlined, keywords: ['ajouter', 'plus', 'nouveau'] },
      { name: 'EditOutlined', component: EditOutlined, keywords: ['éditer', 'modifier', 'edit'] },
      { name: 'DeleteOutlined', component: DeleteOutlined, keywords: ['supprimer', 'effacer', 'delete'] },
      { name: 'SaveOutlined', component: SaveOutlined, keywords: ['sauvegarder', 'enregistrer', 'save'] },
      { name: 'DownloadOutlined', component: DownloadOutlined, keywords: ['télécharger', 'download'] },
      { name: 'UploadOutlined', component: UploadOutlined, keywords: ['uploader', 'téléverser', 'upload'] },
      { name: 'ShareAltOutlined', component: ShareAltOutlined, keywords: ['partager', 'share'] },
      { name: 'SendOutlined', component: SendOutlined, keywords: ['envoyer', 'send'] },
    ]
  },
  {
    name: 'Statut & Indicateurs',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    icons: [
      { name: 'StarOutlined', component: StarOutlined, keywords: ['étoile', 'favori', 'star'] },
      { name: 'StarFilled', component: StarFilled, keywords: ['étoile', 'favori', 'plein'] },
      { name: 'HeartOutlined', component: HeartOutlined, keywords: ['coeur', 'aimer', 'like'] },
      { name: 'HeartFilled', component: HeartFilled, keywords: ['coeur', 'aimer', 'plein'] },
      { name: 'LikeOutlined', component: LikeOutlined, keywords: ['like', 'pouce', 'j\'aime'] },
      { name: 'TrophyOutlined', component: TrophyOutlined, keywords: ['trophée', 'victoire', 'award'] },
      { name: 'CrownOutlined', component: CrownOutlined, keywords: ['couronne', 'premium', 'roi'] },
    ]
  },
  {
    name: 'Utilisateurs',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    icons: [
      { name: 'UserOutlined', component: UserOutlined, keywords: ['utilisateur', 'personne', 'profil'] },
      { name: 'TeamOutlined', component: TeamOutlined, keywords: ['équipe', 'groupe', 'team'] },
      { name: 'UsergroupAddOutlined', component: UsergroupAddOutlined, keywords: ['ajouter', 'groupe', 'team'] },
      { name: 'IdcardOutlined', component: IdcardOutlined, keywords: ['carte', 'identité', 'id'] },
      { name: 'ContactsOutlined', component: ContactsOutlined, keywords: ['contacts', 'carnet', 'annuaire'] },
    ]
  },
  {
    name: 'Temps & Calendrier',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    icons: [
      { name: 'ClockCircleOutlined', component: ClockCircleOutlined, keywords: ['horloge', 'temps', 'heure'] },
      { name: 'CalendarOutlined', component: CalendarOutlined, keywords: ['calendrier', 'date', 'agenda'] },
      { name: 'HistoryOutlined', component: HistoryOutlined, keywords: ['historique', 'history', 'passé'] },
      { name: 'FieldTimeOutlined', component: FieldTimeOutlined, keywords: ['temps', 'durée', 'time'] },
    ]
  },
  {
    name: 'Graphiques & Données',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    icons: [
      { name: 'BarChartOutlined', component: BarChartOutlined, keywords: ['graphique', 'barre', 'chart'] },
      { name: 'LineChartOutlined', component: LineChartOutlined, keywords: ['graphique', 'ligne', 'courbe'] },
      { name: 'PieChartOutlined', component: PieChartOutlined, keywords: ['graphique', 'camembert', 'pie'] },
      { name: 'AreaChartOutlined', component: AreaChartOutlined, keywords: ['graphique', 'area', 'zone'] },
      { name: 'FundOutlined', component: FundOutlined, keywords: ['finance', 'fond', 'investissement'] },
      { name: 'StockOutlined', component: StockOutlined, keywords: ['stock', 'actions', 'bourse'] },
      { name: 'RiseOutlined', component: RiseOutlined, keywords: ['hausse', 'montée', 'augmentation'] },
      { name: 'FallOutlined', component: FallOutlined, keywords: ['baisse', 'chute', 'diminution'] },
    ]
  },
  {
    name: 'Alertes & Notifications',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #ef4444 100%)',
    icons: [
      { name: 'BellOutlined', component: BellOutlined, keywords: ['cloche', 'notification', 'alerte'] },
      { name: 'NotificationOutlined', component: NotificationOutlined, keywords: ['notification', 'message', 'alert'] },
      { name: 'AlertOutlined', component: AlertOutlined, keywords: ['alerte', 'attention', 'warning'] },
      { name: 'WarningOutlined', component: WarningOutlined, keywords: ['attention', 'warning', 'danger'] },
      { name: 'InfoCircleOutlined', component: InfoCircleOutlined, keywords: ['info', 'information', 'aide'] },
      { name: 'QuestionCircleOutlined', component: QuestionCircleOutlined, keywords: ['question', 'aide', 'help'] },
      { name: 'ExclamationCircleOutlined', component: ExclamationCircleOutlined, keywords: ['exclamation', 'important'] },
    ]
  },
  {
    name: 'Sécurité',
    color: '#64748b',
    gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
    icons: [
      { name: 'LockOutlined', component: LockOutlined, keywords: ['cadenas', 'verrouillé', 'sécurité'] },
      { name: 'UnlockOutlined', component: UnlockOutlined, keywords: ['déverrouillé', 'ouvert', 'unlock'] },
      { name: 'SafetyOutlined', component: SafetyOutlined, keywords: ['sécurité', 'protection', 'safe'] },
      { name: 'KeyOutlined', component: KeyOutlined, keywords: ['clé', 'key', 'password'] },
    ]
  },
  {
    name: 'Divers',
    color: '#64748b',
    gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
    icons: [
      { name: 'GiftOutlined', component: GiftOutlined, keywords: ['cadeau', 'gift', 'présent'] },
      { name: 'TagOutlined', component: TagOutlined, keywords: ['tag', 'étiquette', 'label'] },
      { name: 'BookOutlined', component: BookOutlined, keywords: ['livre', 'book', 'documentation'] },
      { name: 'ToolOutlined', component: ToolOutlined, keywords: ['outil', 'tool', 'réparation'] },
      { name: 'SettingOutlined', component: SettingOutlined, keywords: ['paramètres', 'settings', 'config'] },
      { name: 'CarOutlined', component: CarOutlined, keywords: ['voiture', 'car', 'véhicule'] },
      { name: 'EyeOutlined', component: EyeOutlined, keywords: ['oeil', 'voir', 'visibilité'] },
      { name: 'PrinterOutlined', component: PrinterOutlined, keywords: ['imprimante', 'print', 'imprimer'] },
      { name: 'QrcodeOutlined', component: QrcodeOutlined, keywords: ['qrcode', 'code', 'scan'] },
    ]
  }
];

interface IconPickerProps {
  value?: string;
  onChange?: (iconName: string) => void;
  placeholder?: string;
}

export const IconPicker: React.FC<IconPickerProps> = ({ 
  value, 
  onChange,
  placeholder = 'Choisir une icône'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);

  // Trouver l'icône sélectionnée
  const selectedIcon = useMemo(() => {
    if (!value) return null;
    for (const category of iconCategories) {
      const found = category.icons.find(icon => icon.name === value);
      if (found) return { ...found, categoryColor: category.color };
    }
    return null;
  }, [value]);

  // Filtrer les icônes
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return iconCategories;

    const term = searchTerm.toLowerCase();
    return iconCategories
      .map(category => ({
        ...category,
        icons: category.icons.filter(icon => 
          icon.name.toLowerCase().includes(term) ||
          icon.keywords.some(keyword => keyword.toLowerCase().includes(term))
        )
      }))
      .filter(category => category.icons.length > 0);
  }, [searchTerm]);

  const handleSelect = (iconName: string) => {
    onChange?.(iconName);
    setOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.('');
    setOpen(false);
  };

  const content = (
    <div style={{ width: '600px', maxHeight: '500px', overflow: 'auto' }}>
      {/* Barre de recherche */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 10, 
        background: 'white', 
        padding: '16px',
        borderBottom: '2px solid #f0f0f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <Input
          size="large"
          placeholder="Rechercher une icône (énergie, téléphone, email...)"
          prefix={<SearchOutlined style={{ color: '#10b981', fontSize: '18px' }} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          autoFocus
          style={{
            borderRadius: '8px',
            border: '2px solid #10b981'
          }}
        />
        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '8px' }}>
          💡 {filteredCategories.reduce((sum, cat) => sum + cat.icons.length, 0)} icônes disponibles
        </Text>
      </div>

      {/* Liste des catégories et icônes */}
      <div style={{ padding: '16px' }}>
        {filteredCategories.length === 0 ? (
          <Empty 
            description="Aucune icône trouvée" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {filteredCategories.map((category) => (
              <div key={category.name}>
                {/* En-tête de catégorie */}
                <div style={{ 
                  background: category.gradient,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '12px'
                }}>
                  <Text strong style={{ color: 'white', fontSize: '14px' }}>
                    {category.name}
                  </Text>
                  <Tag 
                    color="rgba(255,255,255,0.3)" 
                    style={{ 
                      marginLeft: '8px', 
                      color: 'white',
                      border: 'none'
                    }}
                  >
                    {category.icons.length}
                  </Tag>
                </div>

                {/* Grille d'icônes */}
                <Row gutter={[8, 8]}>
                  {category.icons.map((icon) => {
                    const Icon = icon.component;
                    const isSelected = value === icon.name;
                    
                    return (
                      <Col span={4} key={icon.name}>
                        <div
                          onClick={() => handleSelect(icon.name)}
                          style={{
                            padding: '16px 8px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            border: isSelected ? `2px solid ${category.color}` : '2px solid transparent',
                            background: isSelected ? `${category.color}15` : '#fafafa',
                            transition: 'all 0.2s ease',
                            position: 'relative'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = `${category.color}25`;
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = isSelected ? `${category.color}15` : '#fafafa';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <Icon style={{ 
                            fontSize: '28px', 
                            color: category.color,
                            display: 'block',
                            margin: '0 auto 8px'
                          }} />
                          <Text 
                            style={{ 
                              fontSize: '10px', 
                              color: '#64748b',
                              display: 'block',
                              lineHeight: 1.2,
                              wordBreak: 'break-word'
                            }}
                          >
                            {icon.name.replace('Outlined', '').replace('Filled', '')}
                          </Text>
                          {isSelected && (
                            <div style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: category.color
                            }} />
                          )}
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </div>
            ))}
          </Space>
        )}
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      overlayStyle={{ maxWidth: '650px' }}
    >
      <div
        style={{
          border: '1px solid #d9d9d9',
          borderRadius: '6px',
          padding: '8px 12px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '40px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#10b981';
          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#d9d9d9';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {selectedIcon ? (
          <Space>
            <selectedIcon.component style={{ 
              fontSize: '20px', 
              color: selectedIcon.categoryColor 
            }} />
            <Text>{selectedIcon.name}</Text>
            <CloseCircleOutlined 
              onClick={handleClear}
              style={{ 
                color: '#ff4d4f',
                fontSize: '16px'
              }}
            />
          </Space>
        ) : (
          <Text type="secondary">{placeholder}</Text>
        )}
      </div>
    </Popover>
  );
};

export default IconPicker;
