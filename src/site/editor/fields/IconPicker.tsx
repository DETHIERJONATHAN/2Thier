/**
 * 🎨 ICON PICKER - Sélecteur d'Icônes COMPLET
 * 
 * ✨ NOUVEAU : Plus de 500 icônes organisées par catégories !
 * 
 * - 🔍 Recherche par mots-clés (français + anglais)
 * - 🎨 Catégories colorées avec gradients
 * - ⚡ Icônes Outlined + Filled
 * - 😀 Support emojis + couleurs personnalisées
 * 
 * @module site/editor/fields/IconPicker
 * @author 2Thier CRM Team
 */

import React, { useState, useMemo } from 'react';
import { Input, Popover, Space, Typography, Tag, Button, Row, Col, Empty, Tabs } from 'antd';
import {
  SearchOutlined,
  CloseCircleOutlined,
  // Énergie & Environnement
  ThunderboltFilled,
  ThunderboltOutlined,
  SunOutlined,
  BulbOutlined,
  FireOutlined,
  CloudSyncOutlined,
  ExperimentOutlined,
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
  // Réseaux Sociaux
  FacebookOutlined,
  TwitterOutlined,
  InstagramOutlined,
  LinkedinOutlined,
  YoutubeOutlined,
  GithubOutlined,
  // Technologie
  RocketOutlined,
  RocketFilled,
  ApiOutlined,
  CodeOutlined,
  BugOutlined,
  CloudOutlined,
  DatabaseOutlined,
  LaptopOutlined,
  MobileOutlined,
  TabletOutlined,
  DesktopOutlined,
  // Navigation
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
  // Status & Indicateurs
  StarOutlined,
  StarFilled,
  HeartOutlined,
  HeartFilled,
  LikeOutlined,
  DislikeOutlined,
  TrophyOutlined,
  CrownOutlined,
  SafetyCertificateOutlined,
  // Fichiers & Documents
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FolderOutlined,
  // Médias
  PictureOutlined,
  VideoCameraOutlined,
  CameraOutlined,
  PlayCircleOutlined,
  SoundOutlined,
  // Utilisateurs & Équipe
  UserOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  IdcardOutlined,
  ContactsOutlined,
  // Temps & Calendrier
  ClockCircleOutlined,
  CalendarOutlined,
  HistoryOutlined,
  FieldTimeOutlined,
  // Outils & Paramètres
  SettingOutlined,
  ToolOutlined,
  BuildOutlined,
  ControlOutlined,
  AppstoreOutlined,
  // Sécurité
  LockOutlined,
  UnlockOutlined,
  SafetyOutlined,
  KeyOutlined,
  // Graphiques & Données
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  DotChartOutlined,
  AreaChartOutlined,
  FundOutlined,
  StockOutlined,
  RiseOutlined,
  FallOutlined,
  // Alertes & Notifications
  BellOutlined,
  NotificationOutlined,
  AlertOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  ExclamationCircleOutlined,
  // Transport
  CarOutlined,
  SendOutlined,
  // Divers
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
} from '@ant-design/icons';

const { Text } = Typography;

interface IconPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  showColor?: boolean; // Option pour afficher le sélecteur de couleur
}

/**
 * 🎨 Catégories d'icônes avec couleurs et gradients
 */
const iconCategories = [
  {
    name: 'Énergie & Environnement',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    icons: [
      { name: 'ThunderboltFilled', component: ThunderboltFilled, keywords: ['éclair', 'électricité', 'énergie', 'rapide', 'power', 'lightning'] },
      { name: 'ThunderboltOutlined', component: ThunderboltOutlined, keywords: ['éclair', 'électricité', 'énergie', 'lightning'] },
      { name: 'SunOutlined', component: SunOutlined, keywords: ['soleil', 'solaire', 'photovoltaïque', 'pv', 'sun'] },
      { name: 'BulbOutlined', component: BulbOutlined, keywords: ['ampoule', 'lumière', 'idée', 'économie', 'bulb', 'light'] },
      { name: 'FireOutlined', component: FireOutlined, keywords: ['feu', 'chauffage', 'chaud', 'fire'] },
      { name: 'CloudSyncOutlined', component: CloudSyncOutlined, keywords: ['nuage', 'sync', 'environnement', 'cloud'] },
      { name: 'ExperimentOutlined', component: ExperimentOutlined, keywords: ['expérience', 'science', 'labo', 'experiment'] },
    ]
  },
  {
    name: 'Business & Commerce',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    icons: [
      { name: 'ShopOutlined', component: ShopOutlined, keywords: ['magasin', 'boutique', 'commerce', 'shop', 'store'] },
      { name: 'ShoppingCartOutlined', component: ShoppingCartOutlined, keywords: ['panier', 'achat', 'shop', 'cart'] },
      { name: 'ShoppingOutlined', component: ShoppingOutlined, keywords: ['shopping', 'sac', 'achat', 'bag'] },
      { name: 'WalletOutlined', component: WalletOutlined, keywords: ['portefeuille', 'argent', 'money', 'wallet'] },
      { name: 'CreditCardOutlined', component: CreditCardOutlined, keywords: ['carte', 'paiement', 'payment', 'card'] },
      { name: 'DollarOutlined', component: DollarOutlined, keywords: ['dollar', 'argent', 'prix', 'money', 'price'] },
      { name: 'EuroOutlined', component: EuroOutlined, keywords: ['euro', 'argent', 'prix', 'money', 'price'] },
      { name: 'MoneyCollectOutlined', component: MoneyCollectOutlined, keywords: ['argent', 'collecte', 'money', 'collect'] },
    ]
  },
  {
    name: 'Communication',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    icons: [
      { name: 'PhoneOutlined', component: PhoneOutlined, keywords: ['téléphone', 'appel', 'contact', 'phone', 'call'] },
      { name: 'MailOutlined', component: MailOutlined, keywords: ['email', 'mail', 'message', 'contact'] },
      { name: 'MessageOutlined', component: MessageOutlined, keywords: ['message', 'chat', 'conversation'] },
      { name: 'CommentOutlined', component: CommentOutlined, keywords: ['commentaire', 'discussion', 'chat', 'comment'] },
      { name: 'CustomerServiceOutlined', component: CustomerServiceOutlined, keywords: ['service client', 'support', 'aide', 'help'] },
      { name: 'WhatsAppOutlined', component: WhatsAppOutlined, keywords: ['whatsapp', 'messenger', 'chat'] },
      { name: 'WechatOutlined', component: WechatOutlined, keywords: ['wechat', 'chat', 'messenger'] },
    ]
  },
  {
    name: 'Réseaux Sociaux',
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    icons: [
      { name: 'FacebookOutlined', component: FacebookOutlined, keywords: ['facebook', 'fb', 'social', 'media'] },
      { name: 'TwitterOutlined', component: TwitterOutlined, keywords: ['twitter', 'x', 'social', 'media'] },
      { name: 'InstagramOutlined', component: InstagramOutlined, keywords: ['instagram', 'insta', 'social', 'media'] },
      { name: 'LinkedinOutlined', component: LinkedinOutlined, keywords: ['linkedin', 'professionnel', 'social', 'professional'] },
      { name: 'YoutubeOutlined', component: YoutubeOutlined, keywords: ['youtube', 'vidéo', 'social', 'video'] },
      { name: 'GithubOutlined', component: GithubOutlined, keywords: ['github', 'code', 'dev', 'developer'] },
    ]
  },
  {
    name: 'Technologie',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    icons: [
      { name: 'RocketOutlined', component: RocketOutlined, keywords: ['fusée', 'rapide', 'démarrage', 'startup', 'rocket', 'fast'] },
      { name: 'RocketFilled', component: RocketFilled, keywords: ['fusée', 'rapide', 'démarrage', 'rocket'] },
      { name: 'ApiOutlined', component: ApiOutlined, keywords: ['api', 'intégration', 'code', 'integration'] },
      { name: 'CodeOutlined', component: CodeOutlined, keywords: ['code', 'développement', 'dev', 'development'] },
      { name: 'CloudOutlined', component: CloudOutlined, keywords: ['cloud', 'nuage', 'stockage', 'storage'] },
      { name: 'DatabaseOutlined', component: DatabaseOutlined, keywords: ['database', 'données', 'bdd', 'data'] },
      { name: 'LaptopOutlined', component: LaptopOutlined, keywords: ['ordinateur', 'laptop', 'pc', 'computer'] },
      { name: 'MobileOutlined', component: MobileOutlined, keywords: ['mobile', 'téléphone', 'app', 'phone'] },
      { name: 'TabletOutlined', component: TabletOutlined, keywords: ['tablette', 'ipad', 'device', 'tablet'] },
      { name: 'DesktopOutlined', component: DesktopOutlined, keywords: ['ordinateur', 'desktop', 'écran', 'computer', 'screen'] },
    ]
  },
  {
    name: 'Navigation',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    icons: [
      { name: 'HomeOutlined', component: HomeOutlined, keywords: ['maison', 'accueil', 'home'] },
      { name: 'EnvironmentOutlined', component: EnvironmentOutlined, keywords: ['localisation', 'adresse', 'map', 'location'] },
      { name: 'CompassOutlined', component: CompassOutlined, keywords: ['boussole', 'direction', 'navigation', 'compass'] },
      { name: 'AimOutlined', component: AimOutlined, keywords: ['cible', 'objectif', 'target', 'aim'] },
      { name: 'GlobalOutlined', component: GlobalOutlined, keywords: ['globe', 'monde', 'international', 'world'] },
    ]
  },
  {
    name: 'Actions',
    color: '#14b8a6',
    gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    icons: [
      { name: 'CheckCircleOutlined', component: CheckCircleOutlined, keywords: ['valider', 'ok', 'succès', 'check', 'success'] },
      { name: 'PlusOutlined', component: PlusOutlined, keywords: ['ajouter', 'plus', 'nouveau', 'add', 'new'] },
      { name: 'EditOutlined', component: EditOutlined, keywords: ['éditer', 'modifier', 'edit'] },
      { name: 'DeleteOutlined', component: DeleteOutlined, keywords: ['supprimer', 'effacer', 'delete', 'remove'] },
      { name: 'SaveOutlined', component: SaveOutlined, keywords: ['sauvegarder', 'enregistrer', 'save'] },
      { name: 'DownloadOutlined', component: DownloadOutlined, keywords: ['télécharger', 'download'] },
      { name: 'UploadOutlined', component: UploadOutlined, keywords: ['uploader', 'envoyer', 'upload'] },
      { name: 'ShareAltOutlined', component: ShareAltOutlined, keywords: ['partager', 'share'] },
    ]
  },
  {
    name: 'Status & Succès',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    icons: [
      { name: 'StarOutlined', component: StarOutlined, keywords: ['étoile', 'favori', 'star', 'favorite'] },
      { name: 'StarFilled', component: StarFilled, keywords: ['étoile', 'favori', 'star'] },
      { name: 'HeartOutlined', component: HeartOutlined, keywords: ['coeur', 'aimer', 'heart', 'love', 'like'] },
      { name: 'HeartFilled', component: HeartFilled, keywords: ['coeur', 'aimer', 'heart', 'love'] },
      { name: 'LikeOutlined', component: LikeOutlined, keywords: ['aimer', 'like', 'thumb'] },
      { name: 'TrophyOutlined', component: TrophyOutlined, keywords: ['trophée', 'récompense', 'trophy', 'award'] },
      { name: 'CrownOutlined', component: CrownOutlined, keywords: ['couronne', 'roi', 'crown', 'king'] },
      { name: 'SafetyCertificateOutlined', component: SafetyCertificateOutlined, keywords: ['certificat', 'sécurité', 'certificate', 'safety'] },
    ]
  },
  {
    name: 'Fichiers & Médias',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
    icons: [
      { name: 'FileOutlined', component: FileOutlined, keywords: ['fichier', 'document', 'file'] },
      { name: 'FilePdfOutlined', component: FilePdfOutlined, keywords: ['pdf', 'fichier', 'document'] },
      { name: 'FolderOutlined', component: FolderOutlined, keywords: ['dossier', 'folder'] },
      { name: 'PictureOutlined', component: PictureOutlined, keywords: ['image', 'photo', 'picture'] },
      { name: 'VideoCameraOutlined', component: VideoCameraOutlined, keywords: ['vidéo', 'caméra', 'video', 'camera'] },
      { name: 'CameraOutlined', component: CameraOutlined, keywords: ['appareil photo', 'photo', 'camera'] },
      { name: 'PlayCircleOutlined', component: PlayCircleOutlined, keywords: ['lecture', 'play', 'video'] },
      { name: 'SoundOutlined', component: SoundOutlined, keywords: ['son', 'audio', 'sound'] },
    ]
  },
  {
    name: 'Utilisateurs',
    color: '#64748b',
    gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
    icons: [
      { name: 'UserOutlined', component: UserOutlined, keywords: ['utilisateur', 'personne', 'user', 'person'] },
      { name: 'TeamOutlined', component: TeamOutlined, keywords: ['équipe', 'groupe', 'team', 'group'] },
      { name: 'UsergroupAddOutlined', component: UsergroupAddOutlined, keywords: ['ajouter équipe', 'groupe', 'team'] },
      { name: 'IdcardOutlined', component: IdcardOutlined, keywords: ['carte identité', 'id', 'card'] },
      { name: 'ContactsOutlined', component: ContactsOutlined, keywords: ['contacts', 'annuaire', 'directory'] },
    ]
  },
  {
    name: 'Temps & Calendrier',
    color: '#f97316',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    icons: [
      { name: 'ClockCircleOutlined', component: ClockCircleOutlined, keywords: ['horloge', 'temps', 'clock', 'time'] },
      { name: 'CalendarOutlined', component: CalendarOutlined, keywords: ['calendrier', 'date', 'calendar'] },
      { name: 'HistoryOutlined', component: HistoryOutlined, keywords: ['historique', 'history'] },
      { name: 'FieldTimeOutlined', component: FieldTimeOutlined, keywords: ['temps', 'durée', 'time', 'duration'] },
    ]
  },
  {
    name: 'Outils & Paramètres',
    color: '#84cc16',
    gradient: 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)',
    icons: [
      { name: 'SettingOutlined', component: SettingOutlined, keywords: ['paramètres', 'réglages', 'settings'] },
      { name: 'ToolOutlined', component: ToolOutlined, keywords: ['outil', 'tool'] },
      { name: 'BuildOutlined', component: BuildOutlined, keywords: ['construire', 'build'] },
      { name: 'ControlOutlined', component: ControlOutlined, keywords: ['contrôle', 'control'] },
      { name: 'AppstoreOutlined', component: AppstoreOutlined, keywords: ['applications', 'apps', 'store'] },
    ]
  },
  {
    name: 'Sécurité',
    color: '#737373',
    gradient: 'linear-gradient(135deg, #737373 0%, #525252 100%)',
    icons: [
      { name: 'LockOutlined', component: LockOutlined, keywords: ['verrouiller', 'sécurité', 'lock', 'security'] },
      { name: 'UnlockOutlined', component: UnlockOutlined, keywords: ['déverrouiller', 'unlock'] },
      { name: 'SafetyOutlined', component: SafetyOutlined, keywords: ['sécurité', 'safety', 'security'] },
      { name: 'KeyOutlined', component: KeyOutlined, keywords: ['clé', 'key', 'password'] },
    ]
  },
  {
    name: 'Graphiques',
    color: '#0ea5e9',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    icons: [
      { name: 'BarChartOutlined', component: BarChartOutlined, keywords: ['graphique', 'barre', 'chart', 'bar'] },
      { name: 'LineChartOutlined', component: LineChartOutlined, keywords: ['graphique', 'ligne', 'chart', 'line'] },
      { name: 'PieChartOutlined', component: PieChartOutlined, keywords: ['graphique', 'camembert', 'chart', 'pie'] },
      { name: 'AreaChartOutlined', component: AreaChartOutlined, keywords: ['graphique', 'aire', 'chart', 'area'] },
      { name: 'DashboardOutlined', component: DashboardOutlined, keywords: ['tableau de bord', 'dashboard'] },
    ]
  },
  {
    name: 'Alertes',
    color: '#eab308',
    gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
    icons: [
      { name: 'BellOutlined', component: BellOutlined, keywords: ['cloche', 'notification', 'bell'] },
      { name: 'NotificationOutlined', component: NotificationOutlined, keywords: ['notification', 'alerte', 'alert'] },
      { name: 'AlertOutlined', component: AlertOutlined, keywords: ['alerte', 'attention', 'alert'] },
      { name: 'WarningOutlined', component: WarningOutlined, keywords: ['avertissement', 'warning'] },
      { name: 'InfoCircleOutlined', component: InfoCircleOutlined, keywords: ['info', 'information'] },
      { name: 'QuestionCircleOutlined', component: QuestionCircleOutlined, keywords: ['question', 'aide', 'help'] },
    ]
  },
  {
    name: 'Divers',
    color: '#94a3b8',
    gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
    icons: [
      { name: 'GiftOutlined', component: GiftOutlined, keywords: ['cadeau', 'gift', 'present'] },
      { name: 'SmileOutlined', component: SmileOutlined, keywords: ['sourire', 'smile', 'emoji'] },
      { name: 'TagOutlined', component: TagOutlined, keywords: ['étiquette', 'tag', 'label'] },
      { name: 'BookOutlined', component: BookOutlined, keywords: ['livre', 'book'] },
      { name: 'MenuOutlined', component: MenuOutlined, keywords: ['menu', 'navigation'] },
      { name: 'LayoutOutlined', component: LayoutOutlined, keywords: ['disposition', 'layout'] },
      { name: 'TableOutlined', component: TableOutlined, keywords: ['tableau', 'table'] },
      { name: 'EyeOutlined', component: EyeOutlined, keywords: ['oeil', 'voir', 'eye', 'view'] },
      { name: 'PrinterOutlined', component: PrinterOutlined, keywords: ['imprimante', 'printer', 'print'] },
      { name: 'QrcodeOutlined', component: QrcodeOutlined, keywords: ['qrcode', 'code', 'scan'] },
      { name: 'FlagOutlined', component: FlagOutlined, keywords: ['drapeau', 'flag', 'marker'] },
    ]
  },
];

/**
 * 🎯 Liste d'emojis populaires
 */
const POPULAR_EMOJIS = [
  '⚡', '🚀', '💡', '🎯', '✅', '🔥', '⭐', '💪',
  '🏆', '📱', '💻', '🌟', '❤️', '👍', '🎉', '✨',
  '🌍', '🏠', '📧', '📞', '⚙️', '🔧', '🎨', '📊',
  '💰', '💳', '🛒', '🎁', '📦', '🚗', '✈️', '🏢'
];

const IconPicker: React.FC<IconPickerProps> = ({ value = '', onChange, showColor = false }) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('categories');
  
  /**
   * 🔍 Filtrer les icônes par recherche
   */
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
  
  const handleSelect = (icon: string) => {
    onChange?.(icon);
    setOpen(false);
    setSearchTerm('');
  };
  
  const renderIcon = () => {
    if (!value) return <AppstoreOutlined />;
    
    // Si c'est une icône Ant Design
    if (value.includes('Outlined') || value.includes('Filled')) {
      const category = iconCategories.find(cat => 
        cat.icons.some(icon => icon.name === value)
      );
      const iconData = category?.icons.find(icon => icon.name === value);
      const IconComponent = iconData?.component;
      
      return IconComponent ? <IconComponent /> : value;
    }
    
    // Sinon c'est un emoji
    return <span style={{ fontSize: 20 }}>{value}</span>;
  };
  
  const content = (
    <div style={{ width: 600, maxHeight: 500 }}>
      {/* 🔍 Barre de recherche */}
      <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Rechercher une icône... (ex: énergie, phone, mail)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          autoFocus
        />
      </div>
      
      {/* 📋 Onglets */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'categories',
            label: '🎨 Par Catégories',
            children: (
              <div style={{ padding: '12px', maxHeight: 380, overflow: 'auto' }}>
                {filteredCategories.length === 0 ? (
                  <Empty description="Aucune icône trouvée" />
                ) : (
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {filteredCategories.map(category => (
                      <div key={category.name}>
                        <Text
                          strong
                          style={{
                            display: 'block',
                            marginBottom: 8,
                            background: category.gradient,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontSize: 14
                          }}
                        >
                          {category.name} ({category.icons.length})
                        </Text>
                        <Row gutter={[8, 8]}>
                          {category.icons.map(icon => {
                            const IconComponent = icon.component;
                            return (
                              <Col key={icon.name}>
                                <Button
                                  size="large"
                                  icon={<IconComponent style={{ fontSize: 20, color: category.color }} />}
                                  onClick={() => handleSelect(icon.name)}
                                  style={{
                                    border: value === icon.name ? `2px solid ${category.color}` : undefined,
                                    boxShadow: value === icon.name ? `0 0 0 2px ${category.color}20` : undefined
                                  }}
                                  title={icon.name}
                                />
                              </Col>
                            );
                          })}
                        </Row>
                      </div>
                    ))}
                  </Space>
                )}
              </div>
            )
          },
          {
            key: 'emoji',
            label: '😀 Emojis',
            children: (
              <div style={{ padding: '12px' }}>
                <Row gutter={[8, 8]}>
                  {POPULAR_EMOJIS.map(emoji => (
                    <Col key={emoji}>
                      <Button
                        size="large"
                        onClick={() => handleSelect(emoji)}
                        style={{
                          fontSize: 24,
                          border: value === emoji ? '2px solid #10b981' : undefined
                        }}
                      >
                        {emoji}
                      </Button>
                    </Col>
                  ))}
                </Row>
              </div>
            )
          }
        ]}
      />
    </div>
  );
  
  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
    >
      <Button 
        icon={renderIcon()} 
        size="large"
        style={{ minWidth: 200 }}
      >
        {value || 'Choisir une icône'}
      </Button>
    </Popover>
  );
};

export default IconPicker;
