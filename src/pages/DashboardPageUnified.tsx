import { SF, FB } from '../components/zhiive/ZhiiveTheme';
import { SIDEBAR_LEFT_WIDTH, SIDEBAR_RIGHT_WIDTH, TOP_NAV_HEIGHT } from '../lib/constants';
import React, { useEffect, useState, useMemo, useCallback, useRef, Suspense } from "react";
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from "../hooks/useAuthenticatedApi";
import { useAuth } from "../auth/useAuth";
import { useLeadStatuses } from "../hooks/useLeadStatuses";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { WallNavigationProvider } from "../contexts/WallNavigationContext";
import { useZhiiveNav } from "../contexts/ZhiiveNavContext";
import { useActiveIdentity } from "../contexts/ActiveIdentityContext";
import { useSocialIdentity } from "../contexts/SocialIdentityContext";

/* ═══════════════════════════════════════════════════════════════
   LAZY-LOADED MODULE COMPONENTS (embedded in dashboard)
   ═══════════════════════════════════════════════════════════════ */
const LazyLeadsKanbanWrapper = React.lazy(() => import('./Leads/LeadsKanbanWrapper'));
const LazyCRMPage = React.lazy(() => import('./CRMPage'));
const LazyGestionSAVPage = React.lazy(() => import('./GestionSAVPage'));
const LazyFacturePage = React.lazy(() => import('./FacturePage'));
const LazyTechniquePage = React.lazy(() => import('./TechniquePage'));
const LazyGestionTableauxPage = React.lazy(() => import('./GestionTableauxPage'));
const LazyFormulairePage = React.lazy(() => import('./FormulairePage'));
const LazyAgendaWrapper = React.lazy(() => import('./AgendaWrapper'));
const LazySearchPage = React.lazy(() => import('./SearchPage'));
const LazyDevisPage = React.lazy(() => import('./DevisPage'));
const LazyProductDocumentsPage = React.lazy(() => import('./ProductDocumentsPage'));
const LazyTreeBranchLeafWrapper = React.lazy(() => import('./Formulaire/TreeBranchLeafWrapper-Fixed'));
const LazyTBLPage = React.lazy(() => import('../components/TreeBranchLeaf/treebranchleaf-new/TBL/TBL'));
const LazyGoogleGmailPageV2 = React.lazy(() => import('./UnifiedMailPage'));
const LazyGoogleGeminiPage = React.lazy(() => import('./GoogleGeminiPage'));
const LazyTelnyxPage = React.lazy(() => import('./TelnyxPage'));
const LazyChantiersPage = React.lazy(() => import('./Chantiers/ChantiersPage'));
const LazyMarketplacePage = React.lazy(() => import('./devis1minute/MarketplacePage'));
const LazyLeadGenerationPage = React.lazy(() => import('./devis1minute/LeadGenerationPage'));
const LazyCampaignAnalyticsPage = React.lazy(() => import('./devis1minute/CampaignAnalyticsPage'));
const LazyPublicFormsPage = React.lazy(() => import('./devis1minute/PublicFormsPage'));
const LazyLandingPagesPage = React.lazy(() => import('./devis1minute/LandingPagesPage'));
const LazyAdvancedAnalyticsPage = React.lazy(() => import('./AdvancedAnalyticsPage'));
const LazyModulesAdminPage = React.lazy(() => import('./admin/ModulesAdminPage'));
const LazyRolesAdminPage = React.lazy(() => import('./admin/RolesAdminPage'));
const LazyUsersAdminPage = React.lazy(() => import('./admin/UsersAdminPageNew'));
const LazyOrganizationsAdminPage = React.lazy(() => import('./admin/OrganizationsAdminPageNew'));
const LazyPermissionsAdminPage = React.lazy(() => import('./admin/PermissionsAdminPageNew'));
const LazyIntegrationsAdminPage = React.lazy(() => import('./admin/IntegrationsAdminPage'));
const LazyTreesAdminPage = React.lazy(() => import('./admin/TreesAdminPage'));
const LazyWebsitesAdminPage = React.lazy(() => import('./admin/WebsitesAdminPage'));
const LazyProfilePage = React.lazy(() => import('./ProfilePage'));
const LazySettingsPageEmbedded = React.lazy(() => import('./SettingsPageEmbedded'));
const LazySocialSettingsAdminPage = React.lazy(() => import('./admin/SocialSettingsAdminPage'));
const LazyZhiiveMailAdminPage = React.lazy(() => import('./admin/ZhiiveMailAdminPage'));
const LazyWebBrowserPanel = React.lazy(() => import('../components/WebBrowserPanel'));

/* ═══════════════════════════════════════════════════════════════
   ZHIIVE — Lazy-loaded panel components
   ═══════════════════════════════════════════════════════════════ */
const LazyExplorePanel = React.lazy(() => import('../components/zhiive/ExplorePanel'));
const LazyNectarPanel = React.lazy(() => import('../components/zhiive/NectarPanel'));
const LazyStoriesBar = React.lazy(() => import('../components/zhiive/StoriesBar'));
const LazyReelsPanel = React.lazy(() => import('../components/zhiive/ReelsPanel'));
const LazyWaxPanel = React.lazy(() => import('../components/zhiive/WaxPanel'));

/** Maps route paths to their lazy-loaded component */
const MODULE_COMPONENTS: Record<string, React.LazyExoticComponent<any>> = {
  '/leads': LazyLeadsKanbanWrapper,
  '/my-leads': LazyLeadsKanbanWrapper,
  '/clients': LazyCRMPage,
  '/gestion_sav': LazyGestionSAVPage,
  '/gestion-sav': LazyGestionSAVPage,
  '/facture': LazyFacturePage,
  '/technique': LazyTechniquePage,
  '/gestion-tableaux': LazyGestionTableauxPage,
  '/tableaux': LazyGestionTableauxPage,
  '/formulaire': LazyFormulairePage,
  '/agenda': LazyAgendaWrapper,
  '/devis': LazyDevisPage,
  '/fiches-techniques': LazyProductDocumentsPage,
  '/tbl': LazyTBLPage,
  '/module-tbl': LazyTBLPage,
  '/formulaire/treebranchleaf': LazyTreeBranchLeafWrapper,
  '/chantiers': LazyChantiersPage,
  '/google-gmail': LazyGoogleGmailPageV2,
  '/mail': LazyGoogleGmailPageV2,
  '/forms': LazyPublicFormsPage,
  '/gemini': LazyGoogleGeminiPage,
  '/telnyx': LazyTelnyxPage,
  '/telnyx-communications': LazyTelnyxPage,
  '/marketplace': LazyMarketplacePage,
  '/lead-generation': LazyLeadGenerationPage,
  '/campaign-analytics': LazyCampaignAnalyticsPage,
  '/public-forms': LazyPublicFormsPage,
  '/landing-pages': LazyLandingPagesPage,
  '/analytics': LazyAdvancedAnalyticsPage,
  '/admin/modules': LazyModulesAdminPage,
  '/admin/roles': LazyRolesAdminPage,
  '/admin/users': LazyUsersAdminPage,
  '/admin/organizations': LazyOrganizationsAdminPage,
  '/admin/permissions': LazyPermissionsAdminPage,
  '/admin/social-settings': LazySocialSettingsAdminPage,
  '/admin/integrations': LazyIntegrationsAdminPage,
  '/admin/trees': LazyTreesAdminPage,
  '/admin/sites-web': LazyWebsitesAdminPage,
  '/admin/zhiivemail': LazyZhiiveMailAdminPage,
  '/profile': LazyProfilePage,
  '/settings': LazySettingsPageEmbedded,
};

/** Routes that should NOT be embedded (navigate normally) */
const FULL_PAGE_ROUTES = ['/premium-test', '/diagnostic-complet'];
import { Avatar, Spin, Tooltip as AntTooltip, Select, Modal, Input } from "antd";
import {
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  TrophyOutlined,
  ArrowLeftOutlined,
  ExportOutlined,
  CloseOutlined,
  LoadingOutlined,
  LinkOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  MailOutlined,
  BankOutlined,
  SettingOutlined,
  BarChartOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  FileTextOutlined,
  FunnelPlotOutlined,
  LikeOutlined,
  LikeFilled,
  MessageOutlined,
  ShareAltOutlined,
  MoreOutlined,
  GlobalOutlined,
  ToolOutlined,
  SendOutlined,
  LockOutlined,
  DashboardOutlined,
  ContactsOutlined,
  CustomerServiceOutlined,
  FormOutlined,
  TableOutlined,
  FileSearchOutlined,
  CloudOutlined,
  VideoCameraOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  RobotOutlined,
  ShopOutlined,
  UsergroupAddOutlined,
  AppstoreOutlined,
  KeyOutlined,
  SafetyOutlined,
  ApartmentOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { useSharedSections } from "../hooks/useSharedSections";
import { organizeModulesInSections } from "../utils/modulesSections";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
} from "recharts";
import { NotificationManager } from "../components/Notifications";
import { REACTION_TYPES, getReactionByType } from "../constants/reactions";
import { FriendsWidget } from "../components/MessengerChat";

/* ═══════════════════════════════════════════════════════════════
   FACEBOOK COLORS — exactement les mêmes tokens
   ═══════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   RESPONSIVE HOOK
   ═══════════════════════════════════════════════════════════════ */
const useScreenSize = () => {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return { isMobile: width < 768, isTablet: width >= 768 && width < 1100, width };
};

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */
interface DashboardStats {
  totalLeads: number;
  newLeadsToday: number;
  totalClients: number;
  totalUsers: number;
  conversionRate: number;
  pendingTasks: number;
  upcomingMeetings: number;
  totalRevenue: number;
  monthlyGrowth: number;
  averageResponseTime: number;
}

interface RecentActivity {
  id: string;
  type: "lead" | "client" | "email" | "meeting" | "task" | "creation";
  title: string;
  description: string;
  timestamp: string;
  status: "success" | "warning" | "error" | "info";
  user?: string;
}

interface TopLead {
  id: string;
  nom: string;
  prenom: string;
  entreprise: string;
  status: string;
  statusColor?: string;
  score: number;
  createdAt: string;
}

interface LeadChartData {
  leadsByStatus: { name: string; value: number; color: string }[];
}

/* ═══════════════════════════════════════════════════════════════
   WALL POST TYPES
   ═══════════════════════════════════════════════════════════════ */
export interface WallPostAuthor {
  id: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role?: string;
}
export interface WallPostComment {
  id: string;
  content: string;
  mediaUrl?: string;
  createdAt: string;
  author: WallPostAuthor;
  publishAsOrg?: boolean;
  organization?: { id: string; name: string; logoUrl?: string | null };
  replies?: WallPostComment[];
}
export interface WallPostData {
  id: string;
  content?: string;
  mediaUrls?: string[];
  mediaType?: string;
  visibility: string;
  crmEventType?: string;
  crmEntityType?: string;
  crmEntityId?: string;
  category?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isPinned: boolean;
  publishAsOrg?: boolean;
  organization?: { id: string; name: string; logoUrl?: string | null };
  createdAt: string;
  author: WallPostAuthor;
  targetLead?: { id: string; firstName?: string; lastName?: string; company?: string };
  reactions: { id: string; userId: string; type: string }[];
  comments: WallPostComment[];
  myReaction?: { id: string; userId: string; type: string } | null;
  totalComments: number;
  totalReactions: number;
  totalShares: number;
  parentPost?: {
    id: string;
    content?: string;
    mediaUrls?: string[];
    mediaType?: string;
    publishAsOrg?: boolean;
    createdAt: string;
    author: { id: string; firstName?: string; lastName?: string; avatarUrl?: string };
    organization?: { id: string; name: string; logoUrl?: string | null };
  };
}

type WallVisibility = 'OUT' | 'IN' | 'ALL' | 'CLIENT';

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */
const activityIcon = (type: string) => {
  switch (type) {
    case "creation": return <UserOutlined />;
    case "email": return <MailOutlined />;
    case "meeting": return <CalendarOutlined />;
    case "task": return <CheckCircleOutlined />;
    default: return <ThunderboltOutlined />;
  }
};

const activityColor = (type: string) => {
  switch (type) {
    case "creation": return FB.green;
    case "email": return FB.blue;
    case "meeting": return FB.orange;
    case "task": return "#722ed1";
    default: return FB.blue;
  }
};

const activityVerb = (type: string, t: (k: string) => string) => {
  switch (type) {
    case "creation": return t('dashboard.activity.createdLead');
    case "email": return t('dashboard.activity.sentEmail');
    case "meeting": return t('dashboard.activity.plannedMeeting');
    case "task": return t('dashboard.activity.completedTask');
    default: return t('dashboard.activity.performedAction');
  }
};

const timeAgo = (timestamp: string, t?: (k: string, o?: any) => string): string => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t ? t('common.justNow') : 'À l\'instant';
  if (mins < 60) return t ? t('common.timeAgo.minutes', { count: mins }) : `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t ? t('common.timeAgo.hours', { count: hrs }) : `il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return t ? t('common.timeAgo.days', { count: days }) : `il y a ${days}j`;
  return new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const getVisibilityLabel = (t: (k: string) => string): Record<string, { icon: React.ReactNode; label: string; color: string }> => ({
  OUT: { icon: <LockOutlined />, label: t('common.private'), color: "#8c8c8c" },
  IN: { icon: <TeamOutlined />, label: t('hive.colony'), color: "#1890ff" },
  ALL: { icon: <GlobalOutlined />, label: t('common.public'), color: "#52c41a" },
  CLIENT: { icon: <UserOutlined />, label: t('dashboard.client'), color: "#722ed1" },
});

const crmEventIcon = (type?: string) => {
  switch (type) {
    case "NOUVEAU_LEAD": return "🎯";
    case "DEVIS_SIGNE": return "🤝";
    case "COMMANDE": return "📦";
    case "RECEPTION_COMMANDE": return "📦✅";
    case "PLANIFICATION": return "📅";
    case "CHANTIER_EN_COURS": return "🔨";
    case "FIN_CHANTIER": return "✅";
    case "RECEPTION": return "📋";
    case "FACTURE": return "💰";
    case "TERMINE": return "🏠";
    case "SAV": return "🔧";
    case "EMAIL_ENVOYE": return "📧";
    case "RDV_PLANIFIE": return "📅";
    case "APPEL_EFFECTUE": return "📞";
    case "PROMOTION": return "📢";
    case "CONSEIL": return "💡";
    default: return "📝";
  }
};

/* ═══════════════════════════════════════════════════════════════
   FB CARD
   ═══════════════════════════════════════════════════════════════ */
const FBCard: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  noPadding?: boolean;
}> = ({ children, style, noPadding }) => (
  <div style={{
    background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
    padding: noPadding ? 0 : 8, marginBottom: 6, ...style,
  }}>
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   LEFT SIDEBAR SHORTCUT ITEM
   ═══════════════════════════════════════════════════════════════ */
const ShortcutItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  to: string;
  color?: string;
  onClick?: (route: string) => void;
}> = ({ icon, label, to, color, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const location = useLocation();
  const sp = new URLSearchParams(location.search);
  const activeModParam = sp.get('module');
  const isActive = activeModParam === to || location.pathname === to || (to !== '/' && location.pathname.startsWith(to + '/'));

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick(to);
    }
  };

  return (
    <Link to={to} style={{ textDecoration: "none" }} onClick={handleClick}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "8px 8px", borderRadius: FB.radius,
          background: isActive ? '#e7f3ff' : hovered ? FB.btnGray : "transparent",
          cursor: "pointer", transition: "background 0.15s",
        }}
      >
        {color ? (
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: color, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 18, color: FB.white, flexShrink: 0,
          }}>
            {icon}
          </div>
        ) : (
          <div style={{ flexShrink: 0 }}>{icon}</div>
        )}
        <span style={{
          fontSize: 15, fontWeight: isActive ? 600 : 500, color: isActive ? FB.blue : FB.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {label}
        </span>
      </div>
    </Link>
  );
};

/* ═══════════════════════════════════════════════════════════════
   WALL POST CARD (real API-backed)
   ═══════════════════════════════════════════════════════════════ */
export const WallPostCard: React.FC<{
  post: WallPostData;
  isMobile: boolean;
  currentUserId: string;
  currentUser?: { id: string; firstName?: string; lastName?: string; avatarUrl?: string };
  api: any;
  onUpdate: () => void;
  feedMode?: string;
  currentOrganization?: any;
}> = ({ post, isMobile, currentUserId: _uid, currentUser, api, onUpdate: _onUpdate, feedMode: _feedModeProp, currentOrganization: _orgProp }) => {
  // 🐝 Identité centralisée — on utilise le hook au lieu des props feedMode/currentOrganization
  const cardIdentity = useActiveIdentity();
  const { t } = useTranslation();
  const postNavigate = useNavigate();
  const feedMode = undefined; // ← BLOQUÉ : forcer l'utilisation de cardIdentity.publishAsOrg
  const currentOrganization = cardIdentity.organization;
  const [myReaction, setMyReaction] = useState(post.myReaction);
  const [likesCount, setLikesCount] = useState(post.totalReactions);
  const [commentsCount, setCommentsCount] = useState(post.totalComments);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [allComments, setAllComments] = useState<WallPostComment[]>(post.comments || []);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const reactionPickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // comment id being replied to
  const [replyText, setReplyText] = useState("");
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [commentReactions, setCommentReactions] = useState<Record<string, string>>({}); // commentId → emoji
  const [hoverReactionCommentId, setHoverReactionCommentId] = useState<string | null>(null);
  const hoverReactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareComment, setShareComment] = useState("");
  const [sharingPost, setSharingPost] = useState(false);
  const [shareVisibility, setShareVisibility] = useState<string>('IN');
  const [shareIncludeOriginal, setShareIncludeOriginal] = useState(true);
  const [shareAsOrg, setShareAsOrg] = useState(false);
  const [showHiveLiveModal, setShowHiveLiveModal] = useState(false);
  const [hiveLiveTitle, setHiveLiveTitle] = useState('');
  const [hiveLiveSaving, setHiveLiveSaving] = useState(false);

  // Modals "qui a réagi / qui a partagé"
  const [showReactorsModal, setShowReactorsModal] = useState(false);
  const [reactorsList, setReactorsList] = useState<{ id: string; userId: string; type: string; user: { id: string; firstName?: string; lastName?: string; avatarUrl?: string } }[]>([]);
  const [reactorsLoading, setReactorsLoading] = useState(false);
  const [showSharersModal, setShowSharersModal] = useState(false);
  const [sharersList, setSharersList] = useState<{ id: string; userId: string; targetType: string; user: { id: string; firstName?: string; lastName?: string; avatarUrl?: string } }[]>([]);
  const [sharersLoading, setSharersLoading] = useState(false);

  const handleShowReactors = useCallback(async () => {
    setShowReactorsModal(true);
    setReactorsLoading(true);
    try {
      const data = await api.get(`/api/wall/posts/${post.id}/reactions`);
      setReactorsList(data || []);
    } catch {
      setReactorsList([]);
    } finally {
      setReactorsLoading(false);
    }
  }, [api, post.id]);

  const handleShowSharers = useCallback(async () => {
    setShowSharersModal(true);
    setSharersLoading(true);
    try {
      const data = await api.get(`/api/wall/posts/${post.id}/shares`);
      setSharersList(data || []);
    } catch {
      setSharersList([]);
    } finally {
      setSharersLoading(false);
    }
  }, [api, post.id]);

  const authorName = post.publishAsOrg && post.organization?.name
    ? post.organization.name
    : [post.author.firstName, post.author.lastName].filter(Boolean).join(" ") || t('common.loading');
  const authorAvatar = post.publishAsOrg && post.organization?.logoUrl
    ? post.organization.logoUrl
    : post.author.avatarUrl;
  const authorInitial = post.publishAsOrg && post.organization?.name
    ? post.organization.name[0]?.toUpperCase()
    : (post.author.firstName?.[0] || '?').toUpperCase();
  const visibilityLabels = getVisibilityLabel(t);
  const vis = visibilityLabels[post.visibility] || visibilityLabels.IN;

  const handleReaction = async (type = "LIKE") => {
    try {
      const result = await api.post(`/api/wall/posts/${post.id}/reactions`, { type });
      if (result.action === "removed") {
        setMyReaction(null);
        setLikesCount(c => Math.max(0, c - 1));
      } else if (result.action === "added") {
        setMyReaction(result.reaction);
        setLikesCount(c => c + 1);
      } else {
        setMyReaction(result.reaction);
      }
    } catch (e) { console.error("[WALL] Reaction error:", e); }
  };

  const loadComments = async () => {
    try {
      const result = await api.get(`/api/wall/posts/${post.id}/comments`);
      setAllComments(Array.isArray(result) ? result : []);
    } catch (e) { console.error("[WALL] Comments load error:", e); }
  };

  const handleComment = async (parentCommentId?: string) => {
    const text = parentCommentId ? replyText : commentText;
    if (!text.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const body: Record<string, any> = { content: text.trim() };
      if (parentCommentId) body.parentCommentId = parentCommentId;
      // 🐝 publishAsOrg piloté par le système d'identité centralisé
      if (cardIdentity.publishAsOrg) body.publishAsOrg = true;
      const newComment = await api.post(`/api/wall/posts/${post.id}/comments`, body);
      if (parentCommentId) {
        // Add reply under its parent
        setAllComments(prev => prev.map(c =>
          c.id === parentCommentId
            ? { ...c, replies: [...(c.replies || []), newComment] }
            : c
        ));
        setReplyText("");
        setReplyingTo(null);
      } else {
        setAllComments(prev => [...prev, newComment]);
        setCommentText("");
      }
      setCommentsCount(c => c + 1);
    } catch (e) { console.error("[WALL] Comment error:", e); }
    setSubmittingComment(false);
  };

  const handleCommentLike = (commentId: string, emoji?: string) => {
    const reactionEmoji = emoji || '👍';
    setCommentReactions(prev => {
      const next = { ...prev };
      if (next[commentId] === reactionEmoji) {
        delete next[commentId];
      } else {
        next[commentId] = reactionEmoji;
      }
      return next;
    });
    setLikedComments(prev => {
      const next = new Set(prev);
      if (emoji) {
        next.add(commentId); // always add when picking specific emoji
      } else if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
    setHoverReactionCommentId(null);
  };

  const showCommentReactionPicker = (commentId: string) => {
    if (hoverReactionTimer.current) clearTimeout(hoverReactionTimer.current);
    setHoverReactionCommentId(commentId);
  };

  const hideCommentReactionPicker = () => {
    hoverReactionTimer.current = setTimeout(() => setHoverReactionCommentId(null), 300);
  };

  const handleShare = async (targetType = 'LINK') => {
    const url = `${window.location.origin}/wall/post/${post.id}`;
    const text = post.content ? post.content.substring(0, 200) : t('dashboard.postBy', { name: authorName });
    if (targetType === 'HIVELIVE') {
      setShowShareMenu(false);
      setHiveLiveTitle(post.content ? post.content.substring(0, 100) : '');
      setShowHiveLiveModal(true);
      return;
    }
    if (targetType === 'WALL') {
      setShowShareMenu(false);
      setShareComment("");
      setShareVisibility(currentOrganization ? 'IN' : 'ALL');
      setShareIncludeOriginal(true);
      // 🐝 Identité centralisée pour le partage
      setShareAsOrg(!!cardIdentity.publishAsOrg);
      setShowShareModal(true);
      return;
    }
    try {
      await api.post(`/api/wall/posts/${post.id}/share`, { targetType });
    } catch { /* ignore tracking error */ }
    try {
      switch (targetType) {
        case 'LINK': {
          try {
            await navigator.clipboard.writeText(url);
          } catch {
            const input = document.createElement('input');
            input.value = url;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
          }
          NotificationManager.success(t('common.linkCopied'));
          break;
        }
        case 'FACEBOOK':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
          break;
        case 'LINKEDIN':
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
          break;
        case 'WHATSAPP':
          window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank');
          break;
        case 'TWITTER':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
          break;
        case 'EMAIL': {
          const subject = encodeURIComponent(t('dashboard.postBy', { name: authorName }));
          const body = encodeURIComponent(`${text}\n\n${url}`);
          window.open(`mailto:?subject=${subject}&body=${body}`);
          break;
        }
      }
      setShowShareMenu(false);
    } catch (e) { console.error("[WALL] Share error:", e); }
  };

  const handleAddToHiveLive = async () => {
    if (!hiveLiveTitle.trim()) return;
    setHiveLiveSaving(true);
    try {
      await api.post(`/api/hive-live/from-post/${post.id}`, {
        title: hiveLiveTitle.trim(),
      });
      NotificationManager.success(t('hive.addedToHiveLive', 'Ajouté à votre Hive Live !'));
      setShowHiveLiveModal(false);
      setHiveLiveTitle('');
    } catch (e) { 
      console.error("[HIVE-LIVE] Add from post error:", e);
      NotificationManager.error(t('hive.errorAddingToHiveLive', 'Erreur'));
    } finally { setHiveLiveSaving(false); }
  };

  const handleConfirmShareToWall = async () => {
    setSharingPost(true);
    try {
      await api.post('/api/wall/posts', {
        content: shareComment.trim() || undefined,
        parentPostId: shareIncludeOriginal ? post.id : undefined,
        visibility: shareVisibility,
        publishAsOrg: shareAsOrg && !!currentOrganization,
      });
      NotificationManager.success(t('dashboard.sharedOnHive'));
      setShowShareModal(false);
      setShareComment("");
      _onUpdate();
    } catch (e) { console.error("[WALL] Repost error:", e); }
    setSharingPost(false);
  };

  const handleToggleComments = () => {
    if (!showComments) loadComments();
    setShowComments(!showComments);
  };

  // Navigation vers le profil de l'auteur (Colony ou utilisateur)
  const handleAuthorClick = () => {
    if (post.publishAsOrg && post.organization?.id) {
      postNavigate(`/colony/${post.organization.id}`);
    } else if (post.author?.id) {
      postNavigate(`/profile/${post.author.id}`);
    }
  };

  const isLiked = !!myReaction;

  return (
    <FBCard noPadding>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px 0", gap: 8 }}>
        <Avatar size={40} src={authorAvatar}
          onClick={handleAuthorClick}
          icon={!authorAvatar ? <UserOutlined /> : undefined}
          style={{ backgroundColor: !authorAvatar ? (post.publishAsOrg ? SF.primary : FB.blue) : undefined, flexShrink: 0, cursor: 'pointer' }}>
          {!authorAvatar && authorInitial}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div>
            <span onClick={handleAuthorClick} style={{ fontWeight: 600, fontSize: 14, color: FB.text, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
            >{authorName}</span>
            {post.parentPost && (
              <span style={{ color: FB.textSecondary, fontSize: 13, fontWeight: 400 }}> {t('dashboard.sharedBuzz')}</span>
            )}
            {post.crmEventType && (
              <span style={{ color: FB.textSecondary, fontSize: 14 }}>
                {" "}{crmEventIcon(post.crmEventType)}
              </span>
            )}
            {post.targetLead && (
              <span style={{ color: FB.textSecondary, fontSize: 13 }}>
                {" → "}{[post.targetLead.firstName, post.targetLead.lastName].filter(Boolean).join(" ")}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: FB.textSecondary }}>
            <span>{timeAgo(post.createdAt)}</span>
            <span>·</span>
            <AntTooltip title={vis.label}>
              <span style={{ color: vis.color, display: "flex", alignItems: "center", gap: 2, fontSize: 11 }}>
                {vis.icon} 
              </span>
            </AntTooltip>
            {post.isPinned && <span>· 📌</span>}
          </div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex",
          alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          <MoreOutlined style={{ fontSize: 20, color: FB.textSecondary }} />
        </div>
      </div>

      {/* Content */}
      {(post.content || post.crmEventType) && (
      <div style={{ padding: "12px 16px", textAlign: 'left' }}>
        {post.content && (
          <div style={{ fontSize: 15, color: FB.text, lineHeight: 1.5, whiteSpace: "pre-wrap", textAlign: 'left' }}>{post.content}</div>
        )}
        {post.crmEventType && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8,
            padding: "4px 10px", borderRadius: 16,
            background: FB.blue + "15", color: FB.blue, fontSize: 12, fontWeight: 600,
          }}>
            <span>{crmEventIcon(post.crmEventType)}</span>
            <span>{post.crmEventType.replace(/_/g, " ").toLowerCase()}</span>
          </div>
        )}
      </div>
      )}

      {/* Shared / Reposted post embed */}
      {post.parentPost && (() => {
        const pp = post.parentPost;
        const ppName = pp.publishAsOrg && pp.organization?.name
          ? pp.organization.name
          : [pp.author.firstName, pp.author.lastName].filter(Boolean).join(" ") || t('common.user');
        const ppAvatar = pp.publishAsOrg && pp.organization?.logoUrl
          ? pp.organization.logoUrl
          : pp.author.avatarUrl;
        const ppInitial = pp.publishAsOrg && pp.organization?.name
          ? pp.organization.name[0]?.toUpperCase()
          : (pp.author.firstName?.[0] || '?').toUpperCase();
        return (
          <div style={{
            margin: "0 16px 8px", border: `1px solid ${FB.border}`, borderRadius: 8,
            overflow: "hidden", background: FB.bg,
          }}>
            {/* Original post header */}
            <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", gap: 8 }}>
              <Avatar size={32} src={ppAvatar}
                style={!ppAvatar ? { background: pp.publishAsOrg ? SF.primary : FB.blue, fontSize: 14 } : undefined}>
                {!ppAvatar && ppInitial}
              </Avatar>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: FB.text }}>{ppName}</div>
                <div style={{ fontSize: 11, color: FB.textSecondary }}>
                  {new Date(pp.createdAt).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            {/* Original post content */}
            {pp.content && (
              <div style={{ padding: "0 12px 8px", fontSize: 14, color: FB.text, whiteSpace: "pre-wrap", textAlign: 'left' }}>
                {pp.content}
              </div>
            )}
            {/* Original post media */}
            {pp.mediaUrls && (pp.mediaUrls as string[]).length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {(pp.mediaUrls as string[]).slice(0, 4).map((url: string, i: number) => {
                  const isSingle = (pp.mediaUrls as string[]).length === 1;
                  const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(url);
                  if (isVideo) {
                    return <video key={i} src={url} controls style={{ width: isSingle ? "100%" : "calc(50% - 2px)", maxHeight: 300, objectFit: "contain", background: "#000" }} />;
                  }
                  return <img key={i} src={url} alt="" onClick={() => setLightboxUrl(url)} style={{ width: isSingle ? "100%" : "calc(50% - 2px)", maxHeight: 300, objectFit: isSingle ? "contain" : "cover", cursor: "pointer", background: isSingle ? "#f0f0f0" : "transparent" }} />;
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Media */}
      {post.mediaUrls && Array.isArray(post.mediaUrls) && (post.mediaUrls as string[]).length > 0 && (
        <div>
          <div style={{
            display: "flex", gap: (post.mediaUrls as string[]).length === 1 ? 0 : 4, flexWrap: "wrap",
            justifyContent: (post.mediaUrls as string[]).length === 1 ? "center" : "flex-start",
            padding: (post.mediaUrls as string[]).length === 1 ? 0 : "0 4px",
          }}>
            {(post.mediaUrls as string[]).slice(0, 4).map((url: string, i: number) => {
              const isSingle = (post.mediaUrls as string[]).length === 1;
              const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(url) || post.mediaType === 'video';
              if (isVideo) {
                return (
                  <video key={i} src={url} controls
                    onClick={e => e.stopPropagation()}
                    style={{
                      width: isSingle ? "100%" : "calc(50% - 2px)",
                      maxHeight: isSingle ? 500 : 300,
                      borderRadius: isSingle ? 0 : 8,
                      background: "#000",
                      objectFit: "contain",
                    }} />
                );
              }
              return (
                <img key={i} src={url} alt=""
                  onClick={() => setLightboxUrl(url)}
                  style={{
                    width: isSingle ? "100%" : "calc(50% - 2px)",
                    maxHeight: isSingle ? 500 : 300,
                    objectFit: isSingle ? "contain" : "cover",
                    borderRadius: isSingle ? 0 : 8,
                    cursor: "pointer",
                    background: isSingle ? "#f0f0f0" : "transparent",
                  }} />
              );
            })}
          </div>
        </div>
      )}

      {/* Lightbox overlay */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "zoom-out",
          }}>
          <div onClick={e => e.stopPropagation()}
            style={{ position: "absolute", top: 16, right: 16, color: "#fff", fontSize: 32,
              cursor: "pointer", fontWeight: 700, lineHeight: 1, zIndex: 10000 }}
            onMouseEnter={e => (e.currentTarget.style.color = "#ccc")}
            onMouseLeave={e => (e.currentTarget.style.color = "#fff")}
          >
            <span onClick={() => setLightboxUrl(null)}>✕</span>
          </div>
          {/\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(lightboxUrl) ? (
            <video src={lightboxUrl} controls autoPlay
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: "92vw", maxHeight: "92vh",
                borderRadius: 4,
                boxShadow: "0 4px 40px rgba(0,0,0,0.5)",
              }} />
          ) : (
            <img src={lightboxUrl} alt=""
              style={{
                maxWidth: "92vw", maxHeight: "92vh",
                objectFit: "contain", borderRadius: 4,
                boxShadow: "0 4px 40px rgba(0,0,0,0.5)",
              }} />
          )}
        </div>
      )}

      {/* Reaction counts */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 16px 8px", color: FB.textSecondary, fontSize: 13,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {likesCount > 0 && (
            <span
              style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
              onClick={handleShowReactors}
            >
              {/* Show unique reaction type emojis */}
              <span style={{ display: "inline-flex", gap: -2 }}>
                {(() => {
                  const uniqueTypes = [...new Set((post.reactions || []).map(r => r.type))].slice(0, 3);
                  const emojiMap: Record<string, string> = { LIKE: "👍", LOVE: "❤️", BRAVO: "👏", UTILE: "💡", WOW: "😮" };
                  return uniqueTypes.length > 0
                    ? uniqueTypes.map(t => <span key={t} style={{ fontSize: 14 }}>{emojiMap[t] || "👍"}</span>)
                    : <span style={{
                        width: 18, height: 18, borderRadius: "50%", background: FB.blue,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        border: "2px solid " + FB.white,
                      }}><LikeFilled style={{ fontSize: 10, color: FB.white }} /></span>;
                })()}
              </span>
              <span>{likesCount}</span>
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {commentsCount > 0 && (
            <span style={{ cursor: "pointer" }} onClick={handleToggleComments}>
              {commentsCount > 1 ? t('wall.buzzCountPlural', { count: commentsCount }) : t('wall.buzzCount', { count: commentsCount })}
            </span>
          )}
          {post.totalShares > 0 && (
            <span style={{ cursor: "pointer" }} onClick={handleShowSharers}>
              {post.totalShares > 1 ? t('wall.shareCountPlural', { count: post.totalShares }) : t('wall.shareCount', { count: post.totalShares })}
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: FB.border, margin: "0 16px" }} />

      {/* Action buttons */}
      <div style={{ display: "flex", padding: "4px 16px", position: "relative" }}>
        {/* Like button with reaction picker */}
        <div style={{ flex: 1, position: "relative" }}
          onMouseEnter={() => {
            if (reactionPickerTimer.current) clearTimeout(reactionPickerTimer.current);
            reactionPickerTimer.current = setTimeout(() => setShowReactionPicker(true), 400);
          }}
          onMouseLeave={() => {
            if (reactionPickerTimer.current) clearTimeout(reactionPickerTimer.current);
            reactionPickerTimer.current = setTimeout(() => setShowReactionPicker(false), 300);
          }}
        >
          {/* Reaction picker popup */}
          {showReactionPicker && (
            <div style={{
              position: "absolute", bottom: "100%", left: 0, marginBottom: 4,
              display: "flex", gap: 2, padding: "6px 8px",
              background: FB.white, borderRadius: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              zIndex: 100,
            }}>
              {REACTION_TYPES.map(r => (
                <div key={r.type}
                  onClick={(e) => { e.stopPropagation(); handleReaction(r.type); setShowReactionPicker(false); }}
                  style={{
                    width: 38, height: 38, borderRadius: "50%", display: "flex",
                    alignItems: "center", justifyContent: "center", cursor: "pointer",
                    fontSize: 22, transition: "transform 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                  title={t(r.i18nKey)}
                >
                  {r.emoji}
                </div>
              ))}
            </div>
          )}
          {/* Like button */}
          <div onClick={() => handleReaction(myReaction?.type || "LIKE")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: "8px 0", borderRadius: FB.radius, cursor: "pointer",
              color: isLiked ? (getReactionByType(myReaction?.type || 'LIKE').color) : FB.textSecondary,
              fontWeight: 600, fontSize: isMobile ? 13 : 14, transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = FB.btnGray)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {isLiked
              ? <span style={{ fontSize: 16 }}>{getReactionByType(myReaction?.type || 'LIKE').emoji}</span>
              : <LikeOutlined />}
            {!isMobile && <span>{isLiked ? t(getReactionByType(myReaction?.type || 'LIKE').i18nKey) : t('reactions.pollen')}</span>}
          </div>
        </div>

        {/* Comment button */}
        <div onClick={handleToggleComments}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, padding: "8px 0", borderRadius: FB.radius, cursor: "pointer",
            color: showComments ? FB.blue : FB.textSecondary,
            fontWeight: 600, fontSize: isMobile ? 13 : 14, transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = FB.btnGray)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <MessageOutlined />
          {!isMobile && <span>{t('wall.buzz')}</span>}
        </div>

        {/* Share button with menu */}
        <div style={{ flex: 1, position: "relative" }}>
          <div onClick={() => setShowShareMenu(!showShareMenu)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: "8px 0", borderRadius: FB.radius, cursor: "pointer",
              color: FB.textSecondary,
              fontWeight: 600, fontSize: isMobile ? 13 : 14, transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = FB.btnGray)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <ShareAltOutlined />
            {!isMobile && <span>{t('wall.share')}</span>}
          </div>
          {showShareMenu && (
            <div style={{
              position: "absolute", bottom: "100%", right: 0, marginBottom: 4,
              background: FB.white, borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              padding: 4, minWidth: 180, zIndex: 100,
            }}>
              {[
                { type: "WALL", icon: "📝", label: t('wall.shareOnMyHive') },
                { type: "HIVELIVE", icon: "🐝", label: "Hive Live" },
                { type: "LINK", icon: "🔗", label: t('wall.copyLink') },
                { type: "FACEBOOK", icon: "📘", label: "Facebook" },
                { type: "LINKEDIN", icon: "💼", label: "LinkedIn" },
                { type: "WHATSAPP", icon: "💬", label: "WhatsApp" },
                { type: "TWITTER", icon: "🐦", label: "X / Twitter" },
                { type: "EMAIL", icon: "📧", label: "Email" },
              ].map(s => (
                <div key={s.type}
                  onClick={() => handleShare(s.type)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                    borderRadius: 6, cursor: "pointer", fontSize: 14, color: FB.text,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = FB.btnGray)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comments section */}
      {showComments && (
        <div style={{ padding: "4px 16px 12px 8px", textAlign: 'left' }}>
          {/* Existing comments */}
          {allComments.map((comment) => {
            const cIsOrg = comment.publishAsOrg && comment.organization;
            const cAvatar = cIsOrg ? (comment.organization?.logoUrl || null) : comment.author.avatarUrl;
            const cName = cIsOrg ? comment.organization!.name : [comment.author.firstName, comment.author.lastName].filter(Boolean).join(" ");
            return (
            <div key={comment.id} style={{ marginBottom: 8, marginLeft: 0, paddingLeft: 0 }}>
              {/* Main comment — flush left */}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Avatar size={28} src={cAvatar}
                  icon={!cAvatar ? <UserOutlined /> : undefined}
                  style={{ backgroundColor: !cAvatar ? (cIsOrg ? SF.primary : FB.blue) : undefined, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    background: FB.btnGray, borderRadius: 12, padding: "8px 12px",
                    width: 'fit-content', maxWidth: '85%', textAlign: 'left',
                  }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: FB.text }}>
                      {cName}
                    </span>
                    <div style={{ fontSize: 14, color: FB.text, marginTop: 2 }}>{comment.content}</div>
                  </div>
                  {/* Comment actions with reaction picker */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 4, marginTop: 2, position: 'relative' }}>
                    <span
                      onMouseEnter={() => showCommentReactionPicker(comment.id)}
                      onMouseLeave={hideCommentReactionPicker}
                      onClick={() => handleCommentLike(comment.id)}
                      style={{
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        color: likedComments.has(comment.id)
                          ? (commentReactions[comment.id] === '❤️' ? '#e74c3c' : commentReactions[comment.id] === '😮' ? '#9b59b6' : FB.blue)
                          : FB.textSecondary,
                      }}>
                      {likedComments.has(comment.id) ? (commentReactions[comment.id] || '👍') : t('wall.pollen')}
                    </span>
                    {/* Mini reaction picker on hover */}
                    {hoverReactionCommentId === comment.id && (
                      <div
                        onMouseEnter={() => showCommentReactionPicker(comment.id)}
                        onMouseLeave={hideCommentReactionPicker}
                        style={{
                          position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
                          background: FB.white, borderRadius: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                          padding: '4px 6px', display: 'flex', gap: 2, zIndex: 100,
                        }}>
                        {REACTION_TYPES.map(r => (
                          <span key={r.type}
                            onClick={(e) => { e.stopPropagation(); handleCommentLike(comment.id, r.emoji); }}
                            title={t(r.i18nKey)}
                            style={{ fontSize: 18, cursor: 'pointer', padding: '2px 4px', borderRadius: 8,
                              transition: 'transform 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.3)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                          >{r.emoji}</span>
                        ))}
                      </div>
                    )}
                    <span
                      onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(''); }}
                      style={{ fontSize: 12, fontWeight: 700, cursor: 'pointer', color: FB.textSecondary }}>
                      {t('common.reply')}
                    </span>
                    <span style={{ fontSize: 11, color: FB.textSecondary }}>{timeAgo(comment.createdAt)}</span>
                  </div>

                  {/* Replies — staircase indent */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      {comment.replies.map((reply, replyIdx) => {
                        const rIsOrg = reply.publishAsOrg && reply.organization;
                        const rAvatar = rIsOrg ? (reply.organization?.logoUrl || null) : reply.author.avatarUrl;
                        const rName = rIsOrg ? reply.organization!.name : [reply.author.firstName, reply.author.lastName].filter(Boolean).join(" ");
                        return (
                        <div key={reply.id} style={{ marginBottom: 6, marginLeft: 12 + replyIdx * 8 }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                            <Avatar size={24} src={rAvatar}
                              icon={!rAvatar ? <UserOutlined /> : undefined}
                              style={{ backgroundColor: !rAvatar ? (rIsOrg ? SF.primary : "#bbb") : undefined, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                background: FB.btnGray, borderRadius: 10, padding: "6px 10px",
                                width: 'fit-content', maxWidth: '85%', textAlign: 'left',
                              }}>
                                <span style={{ fontWeight: 600, fontSize: 12, color: FB.text }}>
                                  {rName}
                                </span>
                                <div style={{ fontSize: 13, color: FB.text }}>{reply.content}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4, marginTop: 1, position: 'relative' }}>
                                <span
                                  onMouseEnter={() => showCommentReactionPicker(reply.id)}
                                  onMouseLeave={hideCommentReactionPicker}
                                  onClick={() => handleCommentLike(reply.id)}
                                  style={{
                                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                    color: likedComments.has(reply.id)
                                      ? (commentReactions[reply.id] === '❤️' ? '#e74c3c' : commentReactions[reply.id] === '😮' ? '#9b59b6' : FB.blue)
                                      : FB.textSecondary,
                                  }}>
                                  {likedComments.has(reply.id) ? (commentReactions[reply.id] || '👍') : t('wall.pollen')}
                                </span>
                                {hoverReactionCommentId === reply.id && (
                                  <div
                                    onMouseEnter={() => showCommentReactionPicker(reply.id)}
                                    onMouseLeave={hideCommentReactionPicker}
                                    style={{
                                      position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
                                      background: FB.white, borderRadius: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                                      padding: '4px 6px', display: 'flex', gap: 2, zIndex: 100,
                                    }}>
                                    {REACTION_TYPES.map(r => (
                                      <span key={r.type}
                                        onClick={(e) => { e.stopPropagation(); handleCommentLike(reply.id, r.emoji); }}
                                        title={t(r.i18nKey)}
                                        style={{ fontSize: 16, cursor: 'pointer', padding: '2px 3px', borderRadius: 8,
                                          transition: 'transform 0.15s' }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.3)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                      >{r.emoji}</span>
                                    ))}
                                  </div>
                                )}
                                <span
                                  onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(''); }}
                                  style={{ fontSize: 11, fontWeight: 700, cursor: 'pointer', color: FB.textSecondary }}>
                                  {t('common.reply')}
                                </span>
                                <span style={{ fontSize: 10, color: FB.textSecondary }}>{timeAgo(reply.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ); })}
                    </div>
                  )}

                  {/* Reply input (shown when replying to this comment) */}
                  {replyingTo === comment.id && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6, marginLeft: 12 }}>
                      {/* 🐝 Avatar réponse piloté par le système d'identité centralisé */}
                      <Avatar size={24} src={cardIdentity.avatarUrl}
                        icon={!cardIdentity.avatarUrl && !cardIdentity.isOrgMode ? <UserOutlined /> : undefined}
                        style={{ backgroundColor: !cardIdentity.avatarUrl ? cardIdentity.avatarBgColor : undefined }}>
                        {!cardIdentity.avatarUrl && cardIdentity.avatarFallback}
                      </Avatar>
                      <div style={{
                        flex: 1, display: "flex", alignItems: "center",
                        background: FB.btnGray, borderRadius: 20, padding: "2px 4px 2px 10px",
                      }}>
                        <input
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(comment.id); } }}
                          placeholder={t('dashboard.replyTo', { name: [comment.author.firstName].filter(Boolean).join(" ") || t('wall.thisComment') })}
                          autoFocus
                          style={{
                            flex: 1, border: "none", background: "transparent", outline: "none",
                            fontSize: 13, color: FB.text, padding: "5px 0",
                          }}
                        />
                        <div onClick={() => handleComment(comment.id)}
                          style={{
                            width: 24, height: 24, borderRadius: "50%", display: "flex",
                            alignItems: "center", justifyContent: "center",
                            cursor: replyText.trim() ? "pointer" : "default",
                            color: replyText.trim() ? FB.blue : FB.textSecondary,
                          }}>
                          <SendOutlined style={{ fontSize: 12 }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ); })}

          {/* New comment input */}
          {/* 🐝 Avatar commentaire principal piloté par le système d'identité centralisé */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
            <Avatar size={28} src={cardIdentity.avatarUrl}
              icon={!cardIdentity.avatarUrl && !cardIdentity.isOrgMode ? <UserOutlined /> : undefined}
              style={{ backgroundColor: !cardIdentity.avatarUrl ? cardIdentity.avatarBgColor : undefined }}>
              {!cardIdentity.avatarUrl && cardIdentity.avatarFallback}
            </Avatar>
            <div style={{
              flex: 1, display: "flex", alignItems: "center",
              background: FB.btnGray, borderRadius: 20, padding: "2px 4px 2px 12px",
            }}>
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                placeholder={t('dashboard.dropABuzz')}
                style={{
                  flex: 1, border: "none", background: "transparent", outline: "none",
                  fontSize: 14, color: FB.text, padding: "6px 0",
                }}
              />
              <div onClick={() => handleComment()}
                style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center", cursor: commentText.trim() ? "pointer" : "default",
                  color: commentText.trim() ? FB.blue : FB.textSecondary,
                }}>
                <SendOutlined style={{ fontSize: 14 }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share to wall modal — Facebook style */}
      <Modal
        open={showShareModal}
        onCancel={() => { setShowShareModal(false); setShareComment(""); }}
        footer={null}
        width={500}
        closable
        centered
        styles={{ body: { padding: 0 } }}
        title={
          <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, padding: '4px 0' }}>
            {t('wall.shareABuzz')}
          </div>
        }
      >
        {/* Current user profile + visibility */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${FB.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* 🐝 Avatar de partage piloté par le système d'identité centralisé */}
            <Avatar size={40}
              src={cardIdentity.avatarUrl}
              style={!cardIdentity.avatarUrl
                ? { background: cardIdentity.avatarBgColor, fontSize: 16 } : undefined}
            >
              {!cardIdentity.avatarUrl && cardIdentity.avatarFallback}
            </Avatar>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: FB.text }}>
                {cardIdentity.displayName}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {/* Visibility selector */}
                <select
                  value={shareVisibility}
                  onChange={e => setShareVisibility(e.target.value)}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                    border: `1px solid ${FB.border}`, background: FB.btnGray, color: FB.text,
                    cursor: 'pointer', outline: 'none',
                  }}
                >
                  <option value="ALL">{t('wall.visibilityPublic')}</option>
                  {currentOrganization && <option value="IN">{t('wall.visibilityColony')}</option>}
                  <option value="OUT">{t('wall.visibilityPrivate')}</option>
                </select>
                {/* Publish as org toggle */}
                {currentOrganization && (
                  <label style={{
                    fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 6, border: `1px solid ${FB.border}`,
                    background: shareAsOrg ? '${SF.primary}15' : FB.btnGray, color: shareAsOrg ? SF.primary : FB.text,
                    cursor: 'pointer',
                  }}>
                    <input type="checkbox" checked={shareAsOrg} onChange={e => setShareAsOrg(e.target.checked)}
                      style={{ width: 14, height: 14, accentColor: SF.primary }} />
                    {t('dashboard.asOrg', { name: currentOrganization.name })}
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Text area */}
        <div style={{ padding: '0 16px 12px' }}>
          <textarea
            value={shareComment}
            onChange={e => setShareComment(e.target.value)}
            placeholder={t('dashboard.whatsBuzzing', { name: shareAsOrg && currentOrganization?.name ? currentOrganization.name : currentUser?.firstName || '' })}
            maxLength={5000}
            style={{
              width: '100%', minHeight: 80, border: 'none', outline: 'none', resize: 'none',
              fontSize: 15, color: FB.text, fontFamily: 'inherit', lineHeight: 1.5,
              background: 'transparent',
            }}
          />
        </div>

        {/* Include original toggle */}
        <div style={{ padding: '0 16px 12px' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
            borderRadius: 8, border: `1px solid ${FB.border}`, cursor: 'pointer',
            background: shareIncludeOriginal ? FB.blue + '08' : 'transparent',
          }}>
            <input type="checkbox" checked={shareIncludeOriginal}
              onChange={e => setShareIncludeOriginal(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: FB.blue }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: FB.text }}>{t('wall.includeOriginal')}</span>
          </label>
        </div>

        {/* Original post preview */}
        {shareIncludeOriginal && (
          <div style={{
            margin: '0 16px 12px', border: `1px solid ${FB.border}`, borderRadius: 8,
            overflow: 'hidden', background: FB.bg,
          }}>
            {/* Original post media (full width at top like Facebook) */}
            {post.mediaUrls && (post.mediaUrls as string[]).length > 0 && (
              <div>
                {(post.mediaUrls as string[]).slice(0, 1).map((url: string, i: number) => {
                  const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(url);
                  if (isVideo) {
                    return <video key={i} src={url} controls style={{ width: '100%', maxHeight: 300, objectFit: 'contain', background: '#000' }} />;
                  }
                  return <img key={i} src={url} alt="" style={{ width: '100%', maxHeight: 300, objectFit: 'cover' }} />;
                })}
              </div>
            )}
            {/* Original post author + content */}
            <div style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Avatar size={28} src={authorAvatar}
                  style={!authorAvatar ? { background: post.publishAsOrg ? SF.primary : FB.blue, fontSize: 12 } : undefined}>
                  {!authorAvatar && authorInitial}
                </Avatar>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 13, color: FB.text }}>{authorName}</span>
                  <span style={{ fontSize: 11, color: FB.textSecondary, marginLeft: 6 }}>{timeAgo(post.createdAt)}</span>
                </div>
              </div>
              {post.content && (
                <div style={{ fontSize: 14, color: FB.text, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                  {post.content.length > 300 ? post.content.substring(0, 300) + '...' : post.content}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom bar — action button */}
        <div style={{ padding: '8px 16px 16px' }}>
          <button
            onClick={handleConfirmShareToWall}
            disabled={sharingPost || (!shareComment.trim() && !shareIncludeOriginal)}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
              background: (sharingPost || (!shareComment.trim() && !shareIncludeOriginal)) ? FB.btnGray : FB.blue,
              color: (sharingPost || (!shareComment.trim() && !shareIncludeOriginal)) ? FB.textSecondary : '#fff',
              fontSize: 16, fontWeight: 600, cursor: sharingPost ? 'wait' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {sharingPost ? t('wall.buzzing') : t('wall.buzzIt')}
          </button>
        </div>
      </Modal>

      {/* Hive Live — add moment from post */}
      <Modal
        open={showHiveLiveModal}
        onCancel={() => { setShowHiveLiveModal(false); setHiveLiveTitle(''); }}
        title={<span style={{ fontWeight: 700 }}>🐝 {t('hive.addToHiveLive', 'Ajouter à mon Hive Live')}</span>}
        okText={t('hive.addMoment', 'Ajouter')}
        cancelText={t('common.cancel', 'Annuler')}
        onOk={handleAddToHiveLive}
        confirmLoading={hiveLiveSaving}
        width={420}
        centered
      >
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 6, display: 'block' }}>
            {t('hive.momentTitle', 'Titre du moment')}
          </label>
          <Input
            value={hiveLiveTitle}
            onChange={e => setHiveLiveTitle(e.target.value)}
            placeholder={t('hive.momentTitlePlaceholder', 'Donnez un titre à ce moment')}
            maxLength={200}
            style={{ borderRadius: 8 }}
          />
          <p style={{ fontSize: 12, color: FB.textSecondary, marginTop: 8 }}>
            {t('hive.hiveLiveExplanation', 'Ce Buzz sera ajouté comme moment sur votre ligne de vie Hive Live.')}
          </p>
        </div>
      </Modal>

      {/* Modal — Qui a réagi */}
      <Modal
        open={showReactorsModal}
        onCancel={() => setShowReactorsModal(false)}
        title={<span style={{ fontWeight: 700 }}>👍 {t('wall.whoReacted', 'Qui a réagi')}</span>}
        footer={null}
        width={400}
        centered
      >
        {reactorsLoading
          ? <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
          : reactorsList.length === 0
            ? <p style={{ textAlign: 'center', color: FB.textSecondary, padding: 16 }}>{t('wall.noReactions', 'Aucune réaction')}</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto', padding: '8px 0' }}>
                {reactorsList.map(r => {
                  const emojiMap: Record<string, string> = { LIKE: "👍", LOVE: "❤️", BRAVO: "👏", UTILE: "💡", WOW: "😮" };
                  const name = [r.user.firstName, r.user.lastName].filter(Boolean).join(' ') || t('common.unknown', 'Inconnu');
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar src={r.user.avatarUrl || undefined} style={{ background: SF.primary, flexShrink: 0 }}>
                        {r.user.firstName?.[0]?.toUpperCase() || '?'}
                      </Avatar>
                      <span style={{ flex: 1, fontWeight: 500 }}>{name}</span>
                      <span style={{ fontSize: 18 }}>{emojiMap[r.type] || '👍'}</span>
                    </div>
                  );
                })}
              </div>
            )
        }
      </Modal>

      {/* Modal — Qui a partagé */}
      <Modal
        open={showSharersModal}
        onCancel={() => setShowSharersModal(false)}
        title={<span style={{ fontWeight: 700 }}>🔁 {t('wall.whoShared', 'Qui a partagé')}</span>}
        footer={null}
        width={400}
        centered
      >
        {sharersLoading
          ? <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
          : sharersList.length === 0
            ? <p style={{ textAlign: 'center', color: FB.textSecondary, padding: 16 }}>{t('wall.noShares', 'Aucun partage')}</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto', padding: '8px 0' }}>
                {sharersList.map(s => {
                  const typeLabels: Record<string, string> = { INTERNAL: '🐝 Ruche', FACEBOOK: 'Facebook', LINKEDIN: 'LinkedIn', WHATSAPP: 'WhatsApp', EMAIL: '📧 Email', LINK: '🔗 Copié' };
                  const name = [s.user.firstName, s.user.lastName].filter(Boolean).join(' ') || t('common.unknown', 'Inconnu');
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar src={s.user.avatarUrl || undefined} style={{ background: SF.primary, flexShrink: 0 }}>
                        {s.user.firstName?.[0]?.toUpperCase() || '?'}
                      </Avatar>
                      <span style={{ flex: 1, fontWeight: 500 }}>{name}</span>
                      <span style={{ fontSize: 12, color: FB.textSecondary }}>{typeLabels[s.targetType] || s.targetType}</span>
                    </div>
                  );
                })}
              </div>
            )
        }
      </Modal>
    </FBCard>
  );
};

/* ═══════════════════════════════════════════════════════════════
   STAT WIDGET (right sidebar)
   ═══════════════════════════════════════════════════════════════ */
const StatWidget: React.FC<{
  icon: React.ReactNode; label: string;
  value: string | number; color: string; sub?: string;
}> = ({ icon, label, value, color, sub }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
    <div style={{
      width: 40, height: 40, borderRadius: FB.radius,
      background: color + "15", display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: 18, color: color, flexShrink: 0,
    }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: FB.text }}>{value}</div>
      <div style={{ fontSize: 12, color: FB.textSecondary }}>{label}</div>
    </div>
    {sub && <span style={{ fontSize: 12, fontWeight: 600, color: color }}>{sub}</span>}
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   NO-ORG PROMPT
   ═══════════════════════════════════════════════════════════════ */
const CreateOrganizationPrompt = () => {
  const { t } = useTranslation();
  return (
  <div style={{
    minHeight: "100vh", background: FB.bg, display: "flex",
    alignItems: "center", justifyContent: "center", padding: 24,
  }}>
    <FBCard style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
      <Avatar size={64} icon={<BankOutlined />} style={{ marginBottom: 16 }} />
      <h3 style={{ fontSize: 20, fontWeight: 700, color: FB.text, margin: "0 0 8px" }}>{t('dashboard.welcome')}</h3>
      <p style={{ color: FB.textSecondary, marginBottom: 20 }}>
        {t('dashboard.createOrJoin')}
      </p>
      <Link to="/organization/create">
        <button style={{
          width: "100%", padding: "10px 0", background: FB.blue, color: FB.white,
          border: "none", borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: "pointer", marginBottom: 10,
        }}>
          <PlusOutlined /> {t('dashboard.createOrganization')}
        </button>
      </Link>
      <Link to="/settings/profile">
        <button style={{
          width: "100%", padding: "10px 0", background: FB.btnGray, color: FB.text,
          border: "none", borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: "pointer",
        }}>
          <SettingOutlined /> {t('dashboard.profileSettings')}
        </button>
      </Link>
    </FBCard>
  </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT — FACEBOOK NEWS FEED / WALL
   ═══════════════════════════════════════════════════════════════ */
export default function DashboardPageUnified() {
  const { t } = useTranslation();
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  const { currentOrganization, isSuperAdmin, user, hasFeature, modules } = useAuth();
  const isFreeUser = !currentOrganization && !isSuperAdmin;
  const { leadStatuses } = useLeadStatuses();
  const { isMobile } = useScreenSize();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0, newLeadsToday: 0, totalClients: 0, totalUsers: 0,
    conversionRate: 0, pendingTasks: 0, upcomingMeetings: 0,
    totalRevenue: 0, monthlyGrowth: 0, averageResponseTime: 0,
  });

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [topLeads, setTopLeads] = useState<TopLead[]>([]);
  const [chartData, setChartData] = useState<LeadChartData>({ leadsByStatus: [] });

  // Wall state
  const [wallPosts, setWallPosts] = useState<WallPostData[]>([]);
  const [wallLoading, setWallLoading] = useState(false);
  const [wallCursor, setWallCursor] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState("");
  // 🐝 La visibilité par défaut sera mise à jour via useEffect quand l'identité change
  const [newPostVisibility, setNewPostVisibility] = useState<WallVisibility>("ALL");
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [feedFilter, setFeedFilter] = useState<string>(""); // category filter
  // feedMode is now in ZhiiveNavContext (global across all social apps)
  const [postMediaPreviews, setPostMediaPreviews] = useState<{ file: File; preview: string; type: string }[]>([]);
  const [postMood, setPostMood] = useState<string | null>(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [postCategory, setPostCategory] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  // Wall search results (displayed below "Quoi de neuf" when wallSearchQuery is set)
  const [wallSearchResults, setWallSearchResults] = useState<Array<{ title: string; content: string; url: string; img_src?: string; favicon?: string }>>([]);
  const [wallSearchPage, setWallSearchPage] = useState(1);
  const [wallSearchLoading, setWallSearchLoading] = useState(false);
  const [wallSearchHasMore, setWallSearchHasMore] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  const [mobilePanel, setMobilePanel] = useState(() => {
    // Hive (mur) is always the initial panel — compute index from default order
    const defaultOrder = ['nectar', 'wax', 'explore', 'reels', 'mur', 'mail', 'agenda', 'search', 'stats'];
    const idx = defaultOrder.indexOf('mur');
    return idx >= 0 ? idx : 0;
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Zhiive navigation (shared with header tabs via context)
  const { centerApp, setCenterApp, leftSidebarApp, rightSidebarApp, leftApps, rightApps, registerMobileScroll, setMobilePanel: setContextMobilePanel, tabOrder, feedMode, browseUrl, setBrowseUrl, wallSearchQuery, setWallSearchQuery, wallViewUrl, setWallViewUrl } = useZhiiveNav();

  // 🐝 Identité centralisée — source unique de "qui poste" (org ou personnel)
  // NE JAMAIS recalculer `feedMode === 'org' && !!currentOrganization` localement !
  const identity = useActiveIdentity();
  const { isAppEnabled } = useSocialIdentity();

  // 🐝 Default visibility sync: si on est en mode org → "IN" (Organisation), sinon "ALL" (Public)
  useEffect(() => {
    setNewPostVisibility(identity.isOrgMode ? 'IN' : 'ALL');
  }, [identity.isOrgMode]);

  // Embedded module navigation
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeModule = searchParams.get('module'); // e.g. /leads, /tbl, /chantiers
  const ActiveModuleComponent = activeModule ? MODULE_COMPONENTS[activeModule] || null : null;

  const openModule = useCallback((route: string) => {
    if (FULL_PAGE_ROUTES.some(r => route.startsWith(r))) {
      navigate(route);
      return;
    }
    // Always embed — even if not in MODULE_COMPONENTS, set the param
    // so the dashboard stays visible with the module rendered inside
    setSearchParams({ module: route }, { replace: true });
  }, [navigate, setSearchParams]);

  const goHome = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // Scroll-snap handlers (must be before early returns to preserve hooks order)
  const handleMobileScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const page = Math.round(el.scrollLeft / el.offsetWidth);
    setMobilePanel(page);
    setContextMobilePanel(page);
  }, [setContextMobilePanel]);

  // Track user interaction — once the user touches the carousel, stop auto-scrolling to mur
  const userHasInteracted = useRef(false);

  // Detect swipe attempts beyond the first/last panel → navigate to Mur
  const boundarySwipeRef = useRef<{ startX: number; page: number } | null>(null);
  const handleBoundaryTouchStart = useCallback((e: React.TouchEvent) => {
    userHasInteracted.current = true; // User is in control now
    const el = scrollContainerRef.current;
    if (!el) return;
    const page = Math.round(el.scrollLeft / el.offsetWidth);
    boundarySwipeRef.current = { startX: e.touches[0].clientX, page };
  }, []);
  const handleBoundaryTouchEnd = useCallback((e: React.TouchEvent) => {
    const ref = boundarySwipeRef.current;
    if (!ref) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const totalPanels = el.children.length;
    const visibleTabs = tabOrder.filter(id => !(isFreeUser && id === 'stats'));
    const murIndex = visibleTabs.indexOf('mur');
    if (murIndex < 0) { boundarySwipeRef.current = null; return; }
    const dx = ref.startX - e.changedTouches[0].clientX;
    const MIN_SWIPE = 50;
    const scrollToMur = () => {
      const w = el.offsetWidth;
      if (w > 0) {
        el.scrollTo({ left: murIndex * w, behavior: "smooth" });
        setMobilePanel(murIndex);
        setContextMobilePanel(murIndex);
      }
    };
    // At last panel and swiped left (trying to go beyond) → go to Mur
    if (ref.page === totalPanels - 1 && dx > MIN_SWIPE) {
      requestAnimationFrame(scrollToMur);
    }
    // At first panel and swiped right (trying to go beyond) → go to Mur
    else if (ref.page === 0 && dx < -MIN_SWIPE) {
      requestAnimationFrame(scrollToMur);
    }
    boundarySwipeRef.current = null;
  }, [tabOrder, isFreeUser, setContextMobilePanel]);

  const scrollToPanel = useCallback((panel: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ left: panel * el.offsetWidth, behavior: "smooth" });
  }, []);

  // Register scrollToPanel so header tabs can control the mobile carousel
  useEffect(() => {
    if (isMobile) {
      registerMobileScroll(scrollToPanel);
      return () => registerMobileScroll(null);
    }
  }, [isMobile, registerMobileScroll, scrollToPanel]);

  // Zhiive: scroll to "mur" panel on mount
  const scrollToCenterNow = useCallback(() => {
    if (userHasInteracted.current) return;
    const el = scrollContainerRef.current;
    if (!el || !isMobile) return;
    const visibleTabs = tabOrder.filter(id => !(isFreeUser && id === 'stats'));
    const murIndex = visibleTabs.indexOf('mur');
    if (murIndex < 0) return;
    const w = el.offsetWidth;
    if (w > 0) {
      el.scrollTo({ left: murIndex * w, behavior: "instant" as ScrollBehavior });
      setMobilePanel(murIndex);
      setContextMobilePanel(murIndex);
    }
  }, [tabOrder, isMobile, isFreeUser, setContextMobilePanel]);

  // Callback ref for the scroll container — sets scrollLeft synchronously on mount
  const scrollContainerCallbackRef = useCallback((node: HTMLDivElement | null) => {
    (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    if (node) {
      const visibleTabs = tabOrder.filter(id => !(isFreeUser && id === 'stats'));
      const murIndex = visibleTabs.indexOf('mur');
      if (murIndex >= 0 && node.offsetWidth > 0) {
        node.scrollLeft = murIndex * node.offsetWidth;
      }
      requestAnimationFrame(() => scrollToCenterNow());
    }
  }, [scrollToCenterNow, tabOrder, isFreeUser]);

  // Analytics state (colonne droite)
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedCollaborator, setSelectedCollaborator] = useState<string | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const moods = [
    { emoji: "😊", label: t('mood.happy') }, { emoji: "💪", label: t('mood.motivated') },
    { emoji: "🎉", label: t('mood.party') }, { emoji: "🤝", label: t('mood.grateful') },
    { emoji: "🔥", label: t('mood.onFire') }, { emoji: "☕", label: t('mood.coffee') },
    { emoji: "🏗️", label: t('mood.atWork') }, { emoji: "📊", label: t('mood.focused') },
    { emoji: "🎯", label: t('mood.goal') }, { emoji: "❤️", label: t('mood.passionate') },
  ];

  /* ─── DATA FETCHING ────────────────────────────────────────── */
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const isAdmin = isSuperAdmin || user?.role === "admin" || user?.role === "super_admin";
      const [leadsResponse, usersResponse, clientsResponse] = await Promise.all([
        api.get("/api/leads").catch(() => ({ data: [] })),
        isAdmin ? api.get("/api/users").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        isAdmin ? api.get("/api/users?role=CLIENT").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);

      const leads = Array.isArray(leadsResponse) ? leadsResponse : ((leadsResponse as any)?.data || []);
      const users = Array.isArray(usersResponse) ? usersResponse : ((usersResponse as any)?.data || []);
      const clients = Array.isArray(clientsResponse) ? clientsResponse : ((clientsResponse as any)?.data || []);

      const totalLeads = leads.length;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newLeadsToday = leads.filter((lead: any) => {
        const d = new Date(lead.createdAt); d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      }).length;

      const convertedLeads = leads.filter((lead: any) => {
        const s = lead.LeadStatus?.name?.toLowerCase();
        return s?.includes("gagné") || s?.includes("converti") || s?.includes("client");
      });
      const conversionRate = totalLeads > 0 ? (convertedLeads.length / totalLeads) * 100 : 0;

      let totalResponseTime = 0;
      let leadsWithResponse = 0;
      leads.forEach((lead: any) => {
        if (lead.lastContactDate && lead.createdAt) {
          totalResponseTime += (new Date(lead.lastContactDate).getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60);
          leadsWithResponse++;
        }
      });
      const averageResponseTime = leadsWithResponse > 0 ? totalResponseTime / leadsWithResponse : 0;

      // Récupérer le vrai CA depuis les chantiers
      let totalRevenue = 0;
      try {
        const chantierStats = await api.get("/api/chantiers/stats/overview").catch(() => null);
        if (chantierStats?.data?.totalAmount) {
          totalRevenue = chantierStats.data.totalAmount;
        } else if ((chantierStats as any)?.totalAmount) {
          totalRevenue = (chantierStats as any).totalAmount;
        }
      } catch { /* fallback 0 */ }

      const lastMonthLeads = leads.filter((lead: any) => {
        const d = new Date(lead.createdAt);
        const lm = new Date(); lm.setMonth(lm.getMonth() - 1);
        return d >= lm;
      }).length;
      const monthlyGrowth = totalLeads > 0 ? (lastMonthLeads / totalLeads) * 100 : 0;

      setStats({
        totalLeads, newLeadsToday, totalClients: convertedLeads.length, totalUsers: users.length,
        conversionRate, pendingTasks: Math.floor(totalLeads * 0.15),
        upcomingMeetings: Math.floor(totalLeads * 0.1),
        totalRevenue, monthlyGrowth, averageResponseTime,
      });

      // Chart: leads by status
      const statusCounts: Record<string, number> = {};
      leadStatuses.forEach((s: any) => { statusCounts[s.id] = 0; });
      leads.forEach((lead: any) => {
        if (statusCounts[lead.statusId] !== undefined) statusCounts[lead.statusId]++;
      });
      setChartData({
        leadsByStatus: leadStatuses.map((s: any) => ({
          name: s.name, value: statusCounts[s.id] || 0, color: s.color,
        })),
      });

      // Top Leads
      const sorted = [...leads].sort((a: any, b: any) => (b.data?.score || 50) - (a.data?.score || 50)).slice(0, 5);
      setTopLeads(sorted.map((l: any) => ({
        id: l.id,
        nom: l.lastName || l.data?.lastName || "N/A",
        prenom: l.firstName || l.data?.firstName || "",
        entreprise: l.company || l.data?.company || "",
        status: l.LeadStatus?.name || t('wall.unknown'),
        statusColor: l.LeadStatus?.color,
        score: l.data?.score || 50,
        createdAt: l.createdAt,
      })));

      // Activities
      const acts: RecentActivity[] = [];
      leads.forEach((lead: any) => {
        acts.push({
          id: "creation-" + lead.id, type: "creation", title: t('dashboard.newLead'),
          description: ((lead.firstName || "") + " " + (lead.lastName || "") + " " + (lead.company ? "(" + lead.company + ")" : "")).trim(),
          timestamp: lead.createdAt, status: "success",
          user: lead.assignedTo ? ((lead.assignedTo.firstName || "") + " " + (lead.assignedTo.lastName || "")).trim() : t('common.system'),
        });
        if (lead.TimelineEvent && Array.isArray(lead.TimelineEvent)) {
          lead.TimelineEvent.forEach((ev: any) => {
            acts.push({
              id: ev.id,
              type: ev.eventType === "email" ? "email" : ev.eventType === "meeting" ? "meeting" : "task",
              title: ev.eventType,
              description: ev.data?.description || t('dashboard.event', { type: ev.eventType }),
              timestamp: ev.createdAt, status: "info", user: t('common.user'),
            });
          });
        }
      });
      acts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivities(acts.slice(0, 30));
    } catch (error) {
      console.error("Erreur chargement données:", error);
      NotificationManager.error(t('dashboard.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [api, leadStatuses, isSuperAdmin, user?.role]);

  /* ─── ANALYTICS FETCHING (colonne droite) ───────────────────── */
  const fetchAnalytics = useCallback(async (collaboratorId?: string | null) => {
    try {
      setAnalyticsLoading(true);
      const queryParam = collaboratorId ? `?userId=${collaboratorId}` : '';
      const resp = await api.get(`/api/dashboard/analytics${queryParam}`);
      const data = (resp as any)?.data || resp;
      setAnalytics(data);
    } catch (error) {
      console.error('Erreur analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (user && (currentOrganization || isSuperAdmin)) {
      fetchAnalytics(selectedCollaborator);
    }
  }, [user, currentOrganization, isSuperAdmin, fetchAnalytics, selectedCollaborator]);

  /* ─── WALL FEED FETCHING ───────────────────────────────────── */
  const fetchWallFeed = useCallback(async (reset = false) => {
    try {
      setWallLoading(true);
      const params = new URLSearchParams();
      if (!reset && wallCursor) params.set("cursor", wallCursor);
      if (feedFilter) params.set("category", feedFilter);
      params.set("limit", "20");
      params.set("mode", feedMode);

      const result = await api.get(`/api/wall/feed?${params.toString()}`) as { posts?: WallPostData[]; nextCursor?: string };
      const posts = result?.posts || [];

      if (reset) {
        setWallPosts(posts);
      } else {
        setWallPosts(prev => [...prev, ...posts]);
      }
      setWallCursor(result?.nextCursor || null);
    } catch (error) {
      console.error("[WALL] Erreur chargement feed:", error);
      // Ignorer silencieusement — le feed legacy s'affichera
    } finally {
      setWallLoading(false);
    }
  }, [api, wallCursor, feedFilter, feedMode]);

  // ── Wall Search: fetch web results to display in feed ──
  const fetchWallSearchResults = useCallback(async (query: string, page: number, reset: boolean) => {
    if (!query || query.length < 2) return;
    setWallSearchLoading(true);
    try {
      const data = await api.get(`/api/search/web?q=${encodeURIComponent(query)}&limit=20&pageno=${page}`) as { results?: Array<{ title: string; content: string; url: string; img_src?: string; favicon?: string }> };
      const results = data?.results || [];
      if (reset) {
        setWallSearchResults(results);
      } else {
        setWallSearchResults(prev => [...prev, ...results]);
      }
      setWallSearchHasMore(results.length >= 10);
    } catch {
      if (reset) setWallSearchResults([]);
      setWallSearchHasMore(false);
    } finally {
      setWallSearchLoading(false);
    }
  }, [api]);

  // When wallSearchQuery changes, reset and fetch page 1
  useEffect(() => {
    setWallViewUrl(null);
    setIframeError(false);
    setIframeError(false);
    if (wallSearchQuery && wallSearchQuery.length >= 2) {
      setWallSearchPage(1);
      setWallSearchHasMore(true);
      fetchWallSearchResults(wallSearchQuery, 1, true);
    } else {
      setWallSearchResults([]);
      setWallSearchPage(1);
      setWallSearchHasMore(true);
    }
  }, [wallSearchQuery, fetchWallSearchResults]);

  const loadMoreSearchResults = useCallback(() => {
    if (!wallSearchQuery || wallSearchLoading || !wallSearchHasMore) return;
    const nextPage = wallSearchPage + 1;
    setWallSearchPage(nextPage);
    fetchWallSearchResults(wallSearchQuery, nextPage, false);
  }, [wallSearchQuery, wallSearchLoading, wallSearchHasMore, wallSearchPage, fetchWallSearchResults]);

  /* ─── CREATE POST ──────────────────────────────────────────── */
  const handleMediaSelect = useCallback((accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPreviews = Array.from(files).slice(0, 10 - postMediaPreviews.length).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'video' : 'image',
    }));
    setPostMediaPreviews(prev => [...prev, ...newPreviews]);
    e.target.value = ''; // reset input
  }, [postMediaPreviews.length]);

  const removeMediaPreview = useCallback((index: number) => {
    setPostMediaPreviews(prev => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleCreatePost = useCallback(async () => {
    if ((!newPostContent.trim() && postMediaPreviews.length === 0) || postSubmitting) return;
    setPostSubmitting(true);
    try {
      // Upload media files first if any
      let mediaUrls: string[] = [];
      let mediaType: string | undefined;
      if (postMediaPreviews.length > 0) {
        const formData = new FormData();
        postMediaPreviews.forEach(m => formData.append('files', m.file));
        try {
          const uploadResult = await api.post('/api/wall/upload', formData) as { urls?: string[] };
          mediaUrls = uploadResult?.urls || [];
        } catch {
          // If upload fails, still post without media
          console.warn('[WALL] Upload failed, posting without media');
        }
        if (mediaUrls.length > 0) {
          const hasVideo = postMediaPreviews.some(m => m.type === 'video');
          mediaType = postMediaPreviews.length > 1 ? 'gallery' : hasVideo ? 'video' : 'image';
        }
      }

      const content = postMood
        ? `${postMood} — ${newPostContent.trim()}`
        : newPostContent.trim();

      // Don't post if upload failed and no text content
      if (!content && mediaUrls.length === 0) {
        NotificationManager.error(t('dashboard.addTextOrMedia'));
        setPostSubmitting(false);
        return;
      }

      const newPost = await api.post("/api/wall/posts", {
        content: content || undefined,
        visibility: newPostVisibility,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        mediaType,
        category: postCategory || undefined,
        // 🐝 publishAsOrg piloté par le système d'identité centralisé (ActiveIdentityContext)
        publishAsOrg: identity.publishAsOrg,
      });
      const enriched: WallPostData = {
        ...(newPost as WallPostData),
        reactions: [],
        comments: [],
        myReaction: null,
        totalComments: 0,
        totalReactions: 0,
        totalShares: 0,
      };
      setWallPosts(prev => [enriched, ...prev]);
      setNewPostContent("");
      setPostMood(null);
      setPostCategory(null);
      postMediaPreviews.forEach(m => URL.revokeObjectURL(m.preview));
      setPostMediaPreviews([]);
      NotificationManager.success(t('wall.buzzPublished'));
    } catch (error) {
      console.error("[WALL] Erreur création post:", error);
      NotificationManager.error(t('wall.publishFailed'));
    }
    setPostSubmitting(false);
  }, [api, newPostContent, newPostVisibility, postSubmitting, postMediaPreviews, postMood, postCategory, identity.publishAsOrg]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardData(), fetchWallFeed(true)]);
    setRefreshing(false);
    NotificationManager.success(t('dashboard.refreshed'));
  }, [fetchDashboardData, fetchWallFeed]);

  // Hooks must be called before any early return to respect Rules of Hooks
  const { sections: sharedSections } = useSharedSections();

  // Module favorites (long-press to toggle, persisted in DB)
  const [favModules, setFavModules] = useState<Set<string>>(new Set());
  const favModulesLoadedRef = useRef(false);
  useEffect(() => {
    if (favModulesLoadedRef.current) return;
    favModulesLoadedRef.current = true;
    (async () => {
      try {
        const resp = await api.get('/user/favorites');
        if (resp?.favorites) setFavModules(new Set(resp.favorites));
      } catch { /* first load, no favorites yet */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggleFavModule = useCallback((route: string) => {
    setFavModules(prev => {
      const next = new Set(prev);
      if (next.has(route)) {
        next.delete(route);
        api.delete(`/user/favorites/${encodeURIComponent(route)}`).catch(() => {});
      } else {
        next.add(route);
        api.post('/user/favorites', { moduleKey: route }).catch(() => {});
      }
      return next;
    });
  }, [api]);

  // Long-press detection for module favorites (replaces double-click/double-tap)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const startLongPress = useCallback((route: string) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!pillsDrag.current.moved) {
        longPressTriggered.current = true;
        toggleFavModule(route);
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }, 500);
  }, [toggleFavModule]);
  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Drag-to-scroll for module pills bar (desktop mouse + mobile touch)
  const pillsRef = useRef<HTMLDivElement>(null);
  const pillsDrag = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });

  // Use document-level listeners for reliable desktop drag-to-scroll
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const d = pillsDrag.current; if (!d.active) return;
      const el = pillsRef.current; if (!el) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = x - d.startX;
      if (Math.abs(walk) > 3) d.moved = true;
      el.scrollLeft = d.scrollLeft - walk;
    };
    const handleMouseUp = () => {
      if (!pillsDrag.current.active) return;
      const el = pillsRef.current; if (el) el.style.cursor = 'grab';
      pillsDrag.current.active = false;
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const onPillsMouseDown = useCallback((e: React.MouseEvent) => {
    const el = pillsRef.current; if (!el) return;
    e.preventDefault();
    pillsDrag.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft, moved: false };
    el.style.cursor = 'grabbing';
  }, []);
  const onPillsWheel = useCallback((e: React.WheelEvent) => {
    const el = pillsRef.current; if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  }, []);

  const sectionsWithModules = useMemo(() => {
    const activeSections = sharedSections.filter(s => s.active);
    return organizeModulesInSections(activeSections, modules as any || []);
  }, [sharedSections, modules]);

  useEffect(() => {
    if (!user) return;
    // Pour les utilisateurs réseau (libres) : charger uniquement le wall feed
    if (!currentOrganization && !isSuperAdmin) {
      fetchWallFeed(true);
      return;
    }
    fetchDashboardData();
    fetchWallFeed(true);
  }, [user, currentOrganization, isSuperAdmin, fetchDashboardData, fetchWallFeed]);

  // 🐝 Re-fetch wall when feedMode changes (Bee ↔ Colony)
  const prevFeedModeRef = useRef(feedMode);
  useEffect(() => {
    if (prevFeedModeRef.current !== feedMode) {
      prevFeedModeRef.current = feedMode;
      setWallPosts([]);
      setWallCursor(null);
      fetchWallFeed(true);
    }
  }, [feedMode, fetchWallFeed]);

  // Les utilisateurs réseau (libres) accèdent au réseau social — la bannière est dans AppLayout

  if (loading && !isFreeUser) {
    return (
      <div style={{ minHeight: "100vh", background: FB.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  /* ─── SIDEBAR DATA ─────────────────────────────────────────── */

  // Route mapping for modules
  const MODULE_ROUTES: Record<string, string> = {
    google_gmail: '/google-gmail', analytics: '/analytics', Facture: '/facture',
    leads: '/leads', chantiers: '/chantiers', google_groups: '/google-groups',
    google_maps: '/google-maps', google_meet: '/google-meet', gemini: '/gemini',
    dashboard: '/dashboard', Technique: '/technique',
    telnyx_communications: '/telnyx-communications', mail: '/mail',
    gestion_sav: '/gestion_sav', Agenda: '/agenda', google_contacts: '/google-contacts',
    clients: '/clients', google_forms: '/google-forms', formulaire: '/formulaire',
    google_agenda: '/google-agenda', google_drive: '/google-drive',
    fiches_techniques: '/fiches-techniques', admin_trees: '/admin/trees',
    tbl: '/tbl', treebranchleaf: '/tbl', devis: '/devis', tableaux: '/gestion-tableaux',
    marketplace: '/marketplace', lead_generation: '/lead-generation',
    campaign_analytics: '/campaign-analytics', public_forms: '/public-forms',
    landing_pages: '/landing-pages', telnyx: '/telnyx',
  };

  const getModuleRoute = (mod: any): string => {
    if (mod.route) return mod.route;
    if (mod.key && MODULE_ROUTES[mod.key]) return MODULE_ROUTES[mod.key];
    const moduleKey = mod.name || mod.label;
    if (moduleKey && MODULE_ROUTES[moduleKey]) return MODULE_ROUTES[moduleKey];
    return `/${mod.id || mod.key || 'unknown'}`;
  };

  // Icon mapping
  const ICON_MAP: Record<string, React.ReactNode> = {
    DashboardOutlined: <DashboardOutlined />, ContactsOutlined: <ContactsOutlined />,
    UserOutlined: <UserOutlined />, MailOutlined: <MailOutlined />,
    CalendarOutlined: <CalendarOutlined />, CustomerServiceOutlined: <CustomerServiceOutlined />,
    ToolOutlined: <ToolOutlined />, FormOutlined: <FormOutlined />,
    TableOutlined: <TableOutlined />, FileSearchOutlined: <FileSearchOutlined />,
    FileTextOutlined: <FileTextOutlined />, CloudOutlined: <CloudOutlined />,
    VideoCameraOutlined: <VideoCameraOutlined />, PhoneOutlined: <PhoneOutlined />,
    TeamOutlined: <TeamOutlined />, EnvironmentOutlined: <EnvironmentOutlined />,
    BarChartOutlined: <BarChartOutlined />, RobotOutlined: <RobotOutlined />,
    ShopOutlined: <ShopOutlined />, UsergroupAddOutlined: <UsergroupAddOutlined />,
    FunnelPlotOutlined: <FunnelPlotOutlined />, GlobalOutlined: <GlobalOutlined />,
    SettingOutlined: <SettingOutlined />, BankOutlined: <BankOutlined />,
    ApartmentOutlined: <ApartmentOutlined />, KeyOutlined: <KeyOutlined />,
    SafetyOutlined: <SafetyOutlined />,
    FaTools: <ToolOutlined />, FaKey: <KeyOutlined />, FaUsersCog: <TeamOutlined />,
    FaShieldAlt: <SafetyOutlined />, FaFileContract: <FileTextOutlined />,
    FaBuilding: <BankOutlined />, FaWpforms: <FormOutlined />,
    FaCodeBranch: <ApartmentOutlined />,
  };

  const getModuleIcon = (mod: any) => {
    const iconName = mod.icon;
    const color = mod.iconColor || mod.categoryColor || '#1a4951';
    if (iconName && ICON_MAP[iconName]) {
      return React.cloneElement(ICON_MAP[iconName] as React.ReactElement, { style: { color: '#fff', fontSize: 16 } });
    }
    return <AppstoreOutlined style={{ color: '#fff', fontSize: 16 }} />;
  };

  const getModuleColor = (mod: any): string => {
    return mod.iconColor || mod.categoryColor || '#1a4951';
  };

  const allQuickActions = [
    { icon: <FunnelPlotOutlined />, label: t('dashboard.quickAction.newLead'), to: "/leads/kanban", color: "#ff7a45", features: ['leads_access'] },
    { icon: <UserOutlined />, label: t('dashboard.quickAction.newClient'), to: "/clients", color: FB.green, features: ['clients_access'] },
    { icon: <CalendarOutlined />, label: t('dashboard.quickAction.planMeeting'), to: "/agenda", color: FB.orange, features: ['Agenda'] },
    { icon: <MailOutlined />, label: t('dashboard.quickAction.sendEmail'), to: "/google-gmail", color: FB.red, features: ['google_gmail_access', 'google_gmail'] },
  ];
  const _quickActions = allQuickActions.filter(a => a.features.length === 0 || a.features.some(f => hasFeature(f)));

  const userName = user ? ((user.firstName || "") + " " + (user.lastName || "")).trim() || t('common.user') : t('common.user');

  /* ═══════════════════════════════════════════════════════════
     LEFT SIDEBAR (kept for module navigation — used when a module is active)
     ═══════════════════════════════════════════════════════════ */
  const _renderLeftSidebar = () => (
    <div style={{ position: "fixed", left: 0, top: TOP_NAV_HEIGHT, width: SIDEBAR_LEFT_WIDTH, minWidth: SIDEBAR_LEFT_WIDTH, height: `calc(100vh - ${TOP_NAV_HEIGHT}px)`, overflowY: "auto", paddingTop: 8, paddingLeft: 8, paddingRight: 8, paddingBottom: 16, scrollbarWidth: "none", background: FB.bg, zIndex: 10 }}>
      <ShortcutItem
        icon={
          <Avatar size={36} src={user?.avatarUrl}
            icon={!user?.avatarUrl ? <UserOutlined /> : undefined}
            style={{ background: !user?.avatarUrl ? FB.blue : undefined }} />
        }
        label={userName} to="/profile"
        onClick={openModule}
      />

      {/* Dynamic modules grouped by section */}
      {sectionsWithModules.filter(s => s.modules.length > 0).map(section => (
        <div key={section.id} style={{ marginTop: 8 }}>
          <div style={{ padding: "6px 8px", fontSize: 12, fontWeight: 700, color: FB.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {section.title}
          </div>
          {section.modules.map((mod, i) => (
            <ShortcutItem
              key={mod.key || mod.id || i}
              icon={getModuleIcon(mod)}
              label={mod.label || mod.name || mod.key || ''}
              to={getModuleRoute(mod)}
              color={getModuleColor(mod)}
              onClick={openModule}
            />
          ))}
        </div>
      ))}

      {/* Fixed items: Paramètres */}
      <div style={{ height: 1, background: FB.border, margin: "12px 8px" }} />
      <ShortcutItem icon={<SettingOutlined />} label={t('common.settings')} to="/settings" color={FB.textSecondary} onClick={openModule} />

      <div style={{ height: 1, background: FB.border, margin: "12px 8px" }} />
      {currentOrganization && (
        <div style={{ padding: "8px 8px", fontSize: 13, color: FB.textSecondary }}>
          <span style={{ fontWeight: 600 }}>{currentOrganization.name}</span><br />
          <span style={{ fontSize: 12 }}>{t('dashboard.orgStats', { members: stats.totalUsers, leads: stats.totalLeads })}</span>
        </div>
      )}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     RIGHT SIDEBAR — Panneau Analytique
     ═══════════════════════════════════════════════════════════ */
  const formatRevenue = (val: number) => {
    if (val >= 1000000) return `€${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `€${(val / 1000).toFixed(1)}k`;
    return `€${val.toLocaleString("fr-FR")}`;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: t('roles.super_admin'), admin: t('roles.admin'), comptable: t('roles.admin'),
      commercial: t('roles.commercial'), technicien: t('roles.user'), chef_equipe: t('roles.manager'),
      contremaitre: t('roles.manager'), sous_traitant: t('roles.prestataire'), user: t('roles.user'),
    };
    return labels[role] || role;
  };

  const isAdminRole = isSuperAdmin || user?.role === "admin" || user?.role === "super_admin";
  const isTechRole = ["technicien", "chef_equipe", "contremaitre", "sous_traitant"].includes(user?.role || "");

  const _renderRightSidebar = () => (
    <div style={{ position: "fixed", right: 0, top: TOP_NAV_HEIGHT, width: SIDEBAR_RIGHT_WIDTH, height: `calc(100vh - ${TOP_NAV_HEIGHT}px)`, overflowY: "auto", paddingTop: 8, paddingRight: 8, paddingLeft: 8, paddingBottom: 16, scrollbarWidth: "none", background: FB.bg, zIndex: 10 }}>

      {/* === SÉLECTEUR DE COLLABORATEUR (admin) === */}
      {isAdminRole && analytics?.collaborators?.length > 0 && (
        <FBCard>
          <span style={{ fontSize: 14, fontWeight: 700, color: FB.text, display: "block", marginBottom: 8 }}>
            <BarChartOutlined style={{ marginRight: 6, color: FB.blue }} />
            {t('dashboard.analytics')}
          </span>
          <Select
            placeholder={t('dashboard.globalView')}
            allowClear
            showSearch
            style={{ width: "100%", fontSize: 13 }}
            value={selectedCollaborator}
            onChange={(val) => setSelectedCollaborator(val || null)}
            filterOption={(input, option) =>
              (option?.label as string || "").toLowerCase().includes(input.toLowerCase())
            }
            options={analytics.collaborators.map((c: any) => ({
              value: c.id,
              label: `${c.name} (${getRoleLabel(c.role)})`,
            }))}
          />
          {selectedCollaborator && (
            <div style={{ marginTop: 6, fontSize: 11, color: FB.textSecondary }}>
              {t('dashboard.statsViewOf', { name: analytics.collaborators.find((c: any) => c.id === selectedCollaborator)?.name })}
            </div>
          )}
        </FBCard>
      )}

      {/* === KPIs GLOBAUX === */}
      <FBCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: FB.text }}>
            {selectedCollaborator ? t('dashboard.personalPerf') : t('dashboard.globalPerf')}
          </span>
          <AntTooltip title={t('common.refresh')}>
            <ReloadOutlined spin={refreshing || analyticsLoading}
              style={{ fontSize: 14, color: FB.textSecondary, cursor: "pointer" }}
              onClick={() => { handleRefresh(); fetchAnalytics(selectedCollaborator); }} />
          </AntTooltip>
        </div>

        {analyticsLoading ? (
          <div style={{ textAlign: "center", padding: 20 }}><Spin size="small" /></div>
        ) : analytics ? (
          <>
            {/* KPIs pour Admin/Comptable */}
            {(isAdminRole || user?.role === "comptable") && !selectedCollaborator && (
              <>
                <StatWidget icon={<FunnelPlotOutlined />} label={t('dashboard.totalLeads')} value={analytics.totalLeads} color="#1890ff" sub={t('dashboard.thisMonth', { count: analytics.newLeadsThisMonth })} />
                <StatWidget icon={<TrophyOutlined />} label={t('dashboard.converted')} value={analytics.convertedLeads} color={FB.green} sub={`${analytics.conversionRate}%`} />
                <StatWidget icon={<ToolOutlined />} label={t('dashboard.chantiers')} value={analytics.totalChantiers} color="#fa8c16" />
                <StatWidget icon={<RiseOutlined />} label={t('dashboard.revenue')} value={formatRevenue(analytics.totalRevenue)} color="#722ed1" />
                {analytics.roleStats?.totalUsers != null && (
                  <StatWidget icon={<TeamOutlined />} label={t('dashboard.activeTeam')} value={analytics.roleStats.totalUsers} color={FB.blue} />
                )}
              </>
            )}

            {/* KPIs pour Commercial / User ou collaborateur sélectionné */}
            {((!isTechRole && !isAdminRole) || selectedCollaborator) && analytics.roleStats?.myLeads != null && (
              <>
                <StatWidget icon={<FunnelPlotOutlined />} label={t('dashboard.myLeads')} value={analytics.roleStats.myLeads} color="#1890ff" />
                <StatWidget icon={<TrophyOutlined />} label={t('dashboard.myConverted')} value={analytics.roleStats.myConvertedLeads} color={FB.green} sub={`${analytics.roleStats.myConversion}%`} />
                <StatWidget icon={<ToolOutlined />} label={t('dashboard.myChantiers')} value={analytics.roleStats.myChantiers} color="#fa8c16" />
                <StatWidget icon={<RiseOutlined />} label={t('dashboard.myRevenue')} value={formatRevenue(analytics.roleStats.myRevenue)} color="#722ed1" />
              </>
            )}

            {/* KPIs pour Technicien / Chef d'équipe / Contremaître / Sous-traitant */}
            {(isTechRole || (selectedCollaborator && analytics.roleStats?.assignedChantiers != null)) && (
              <>
                <StatWidget icon={<ToolOutlined />} label={t('dashboard.assignedChantiers')} value={analytics.roleStats.assignedChantiers || 0} color="#fa8c16" />
                <StatWidget icon={<ClockCircleOutlined />} label={t('dashboard.hoursThisMonth')} value={`${analytics.roleStats.hoursThisMonth || 0}h`} color={FB.blue} />
                <StatWidget icon={<CalendarOutlined />} label={t('dashboard.daysWorked')} value={analytics.roleStats.daysWorkedThisMonth || 0} color={FB.green} />
              </>
            )}
          </>
        ) : null}
      </FBCard>

      {/* === GRAPHIQUE ÉVOLUTION MENSUELLE (Bar) === */}
      {analytics?.monthlyData?.length > 0 && (
        <FBCard>
          <span style={{ fontSize: 14, fontWeight: 700, color: FB.text, display: "block", marginBottom: 8 }}>
            {t('dashboard.monthlyEvolution')}
          </span>
          <div style={{ height: 140, minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={analytics.monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: FB.textSecondary }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: FB.textSecondary }} axisLine={false} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: FB.shadow }}
                  formatter={(value: any, name: string) => [name === "revenue" ? formatRevenue(value) : value, name === "revenue" ? t('dashboard.revenueShort') : t('dashboard.chantiers')]}
                />
                <Bar dataKey="chantiers" fill={FB.blue} radius={[4, 4, 0, 0]} barSize={16} name={t('dashboard.chantiers')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FBCard>
      )}

      {/* === GRAPHIQUE CA MENSUEL (Area) === */}
      {analytics?.monthlyData?.length > 0 && analytics.monthlyData.some((d: any) => d.revenue > 0) && (
        <FBCard>
          <span style={{ fontSize: 14, fontWeight: 700, color: FB.text, display: "block", marginBottom: 8 }}>
            {t('dashboard.monthlyRevenue')}
          </span>
          <div style={{ height: 120, minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={analytics.monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#722ed1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#722ed1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: FB.textSecondary }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: FB.textSecondary }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v} />
                <RechartsTooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: FB.shadow }}
                  formatter={(value: any) => [formatRevenue(value), "CA"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#722ed1" strokeWidth={2} fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </FBCard>
      )}

      {/* === PIE CHART LEADS PAR STATUT === */}
      {chartData.leadsByStatus.length > 0 && (
        <FBCard>
          <span style={{ fontSize: 14, fontWeight: 700, color: FB.text, display: "block", marginBottom: 8 }}>
            {t('dashboard.leadsByStatus')}
          </span>
          <div style={{ height: 140, minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie data={chartData.leadsByStatus.filter(d => d.value > 0)}
                  cx="50%" cy="50%" outerRadius={55} innerRadius={30}
                  dataKey="value" paddingAngle={2}>
                  {chartData.leadsByStatus.filter(d => d.value > 0).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: FB.shadow }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {chartData.leadsByStatus.filter(d => d.value > 0).map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: FB.textSecondary }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: d.color }} />
                <span>{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </FBCard>
      )}

      {/* === CHANTIERS PAR STATUT (admin) === */}
      {isAdminRole && analytics?.roleStats?.chantiersByStatus?.length > 0 && !selectedCollaborator && (
        <FBCard>
          <span style={{ fontSize: 14, fontWeight: 700, color: FB.text, display: "block", marginBottom: 8 }}>
            {t('dashboard.chantiersByStatus')}
          </span>
          {analytics.roleStats.chantiersByStatus.map((s: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12, color: FB.text }}>{s.name}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: FB.text }}>{s.count}</div>
              {s.amount > 0 && <div style={{ fontSize: 10, color: FB.textSecondary }}>{formatRevenue(s.amount)}</div>}
            </div>
          ))}
        </FBCard>
      )}

      {/* === TOP COMMERCIAUX (admin) === */}
      {isAdminRole && analytics?.roleStats?.topCommercials?.length > 0 && !selectedCollaborator && (
        <FBCard>
          <span style={{ fontSize: 14, fontWeight: 700, color: FB.text, display: "block", marginBottom: 8 }}>
            {t('dashboard.topCommercials')}
          </span>
          {analytics.roleStats.topCommercials.map((c: any, i: number) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 2px",
              borderRadius: 6, cursor: "pointer", transition: "background 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = FB.btnGray)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              onClick={() => setSelectedCollaborator(c.userId)}
            >
              <Avatar size={28} style={{ background: ["#1890ff", "#52c41a", "#fa8c16", "#722ed1", "#eb2f96"][i % 5] }}>
                {c.name?.[0] || "?"}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: FB.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.name}
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: FB.blue }}>{c.leadCount} leads</div>
            </div>
          ))}
        </FBCard>
      )}

      {/* === TOP LEADS === */}
      {topLeads.length > 0 && (
        <FBCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: FB.text }}>{t('dashboard.topLeads')}</span>
            <span onClick={() => openModule('/leads')} style={{ fontSize: 12, color: FB.blue, textDecoration: "none", cursor: "pointer" }}>{t('common.viewAll')}</span>
          </div>
          {topLeads.slice(0, 4).map(lead => (
            <div key={lead.id} onClick={() => openModule('/leads')} style={{ textDecoration: "none", cursor: "pointer" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8, padding: "5px 2px",
                borderRadius: 6, cursor: "pointer", transition: "background 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = FB.btnGray)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <Avatar size={26} style={{ background: lead.statusColor || FB.blue, fontSize: 11 }}>
                  {(lead.prenom[0] || lead.nom[0] || "?")}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: FB.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lead.prenom} {lead.nom}
                  </div>
                  <div style={{ fontSize: 10, color: FB.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lead.entreprise || lead.status}
                  </div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: lead.score > 80 ? FB.green : lead.score > 60 ? FB.orange : FB.textSecondary }}>
                  {lead.score}%
                </div>
              </div>
            </div>
          ))}
        </FBCard>
      )}

      {/* === CONTACTS === */}
      <FBCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: FB.text }}>{t('dashboard.contacts')}</span>
        </div>
        <FriendsWidget onStartChat={() => {}} />
      </FBCard>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     MOBILE ANALYTICS PANEL (swipe page 2)
     ═══════════════════════════════════════════════════════════ */
  const renderMobileAnalytics = () => (
    <div style={{ padding: "0 4px", paddingTop: 4 }}>
      {/* Collaborator selector (admin) */}
      {isAdminRole && analytics?.collaborators?.length > 0 && (
        <FBCard>
          <span style={{ fontSize: 13, fontWeight: 700, color: FB.text, display: "block", marginBottom: 6 }}>
            <BarChartOutlined style={{ marginRight: 4, color: FB.blue }} /> {t('dashboard.analytics')}
          </span>
          <Select placeholder={t('dashboard.globalView')} allowClear showSearch
            style={{ width: "100%", fontSize: 12 }}
            value={selectedCollaborator}
            onChange={(val) => setSelectedCollaborator(val || null)}
            filterOption={(input, option) => (option?.label as string || "").toLowerCase().includes(input.toLowerCase())}
            options={analytics.collaborators.map((c: any) => ({ value: c.id, label: `${c.name} (${getRoleLabel(c.role)})` }))}
          />
        </FBCard>
      )}

      {/* KPIs */}
      <FBCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: FB.text }}>
            {selectedCollaborator ? t('dashboard.personalPerf') : t('dashboard.performance')}
          </span>
          <ReloadOutlined spin={refreshing || analyticsLoading}
            style={{ fontSize: 13, color: FB.textSecondary, cursor: "pointer" }}
            onClick={() => { handleRefresh(); fetchAnalytics(selectedCollaborator); }} />
        </div>
        {analyticsLoading ? (
          <div style={{ textAlign: "center", padding: 16 }}><Spin size="small" /></div>
        ) : analytics ? (
          <>
            {(isAdminRole || user?.role === "comptable") && !selectedCollaborator && (
              <>
                <StatWidget icon={<FunnelPlotOutlined />} label={t('dashboard.totalLeads')} value={analytics.totalLeads} color="#1890ff" sub={t('dashboard.thisMonth', { count: analytics.newLeadsThisMonth })} />
                <StatWidget icon={<TrophyOutlined />} label={t('dashboard.converted')} value={analytics.convertedLeads} color={FB.green} sub={`${analytics.conversionRate}%`} />
                <StatWidget icon={<ToolOutlined />} label={t('dashboard.chantiers')} value={analytics.totalChantiers} color="#fa8c16" />
                <StatWidget icon={<RiseOutlined />} label={t('dashboard.revenueShort')} value={formatRevenue(analytics.totalRevenue)} color="#722ed1" />
              </>
            )}
            {((!isTechRole && !isAdminRole) || selectedCollaborator) && analytics.roleStats?.myLeads != null && (
              <>
                <StatWidget icon={<FunnelPlotOutlined />} label={t('dashboard.myLeads')} value={analytics.roleStats.myLeads} color="#1890ff" />
                <StatWidget icon={<TrophyOutlined />} label={t('dashboard.myConverted')} value={analytics.roleStats.myConvertedLeads} color={FB.green} sub={`${analytics.roleStats.myConversion}%`} />
                <StatWidget icon={<ToolOutlined />} label={t('dashboard.myChantiers')} value={analytics.roleStats.myChantiers} color="#fa8c16" />
                <StatWidget icon={<RiseOutlined />} label={t('dashboard.myRevenue')} value={formatRevenue(analytics.roleStats.myRevenue)} color="#722ed1" />
              </>
            )}
            {(isTechRole || (selectedCollaborator && analytics.roleStats?.assignedChantiers != null)) && (
              <>
                <StatWidget icon={<ToolOutlined />} label={t('dashboard.assignedChantiers')} value={analytics.roleStats.assignedChantiers || 0} color="#fa8c16" />
                <StatWidget icon={<ClockCircleOutlined />} label={t('dashboard.hoursThisMonth')} value={`${analytics.roleStats.hoursThisMonth || 0}h`} color={FB.blue} />
                <StatWidget icon={<CalendarOutlined />} label={t('dashboard.daysWorked')} value={analytics.roleStats.daysWorkedThisMonth || 0} color={FB.green} />
              </>
            )}
          </>
        ) : null}
      </FBCard>

      {/* Monthly bar chart */}
      {analytics?.monthlyData?.length > 0 && (
        <FBCard>
          <span style={{ fontSize: 13, fontWeight: 700, color: FB.text, display: "block", marginBottom: 6 }}>{t('dashboard.monthlyEvolution')}</span>
          <div style={{ height: 130, minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={analytics.monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: FB.textSecondary }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: FB.textSecondary }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: FB.shadow }} />
                <Bar dataKey="chantiers" fill={FB.blue} radius={[4, 4, 0, 0]} barSize={16} name={t('dashboard.chantiers')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FBCard>
      )}

      {/* Revenue area chart */}
      {analytics?.monthlyData?.length > 0 && analytics.monthlyData.some((d: any) => d.revenue > 0) && (
        <FBCard>
          <span style={{ fontSize: 13, fontWeight: 700, color: FB.text, display: "block", marginBottom: 6 }}>{t('dashboard.monthlyRevenue')}</span>
          <div style={{ height: 110, minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={analytics.monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="mobileRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#722ed1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#722ed1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: FB.textSecondary }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: FB.textSecondary }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v} />
                <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: FB.shadow }} formatter={(value: any) => [formatRevenue(value), t('dashboard.revenueShort')]} />
                <Area type="monotone" dataKey="revenue" stroke="#722ed1" strokeWidth={2} fill="url(#mobileRevenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </FBCard>
      )}

      {/* Pie chart leads */}
      {chartData.leadsByStatus.length > 0 && (
        <FBCard>
          <span style={{ fontSize: 13, fontWeight: 700, color: FB.text, display: "block", marginBottom: 6 }}>{t('dashboard.leadsByStatus')}</span>
          <div style={{ height: 130, minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie data={chartData.leadsByStatus.filter(d => d.value > 0)}
                  cx="50%" cy="50%" outerRadius={50} innerRadius={25} dataKey="value" paddingAngle={2}>
                  {chartData.leadsByStatus.filter(d => d.value > 0).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: FB.shadow }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
            {chartData.leadsByStatus.filter(d => d.value > 0).map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: FB.textSecondary }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.color }} />
                <span>{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </FBCard>
      )}

      {/* Top Leads */}
      {topLeads.length > 0 && (
        <FBCard>
          <span style={{ fontSize: 13, fontWeight: 700, color: FB.text, display: "block", marginBottom: 6 }}>{t('dashboard.topLeads')}</span>
          {topLeads.slice(0, 5).map(lead => (
            <div key={lead.id} onClick={() => openModule('/leads')} style={{ textDecoration: "none", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                <Avatar size={24} style={{ background: lead.statusColor || FB.blue, fontSize: 10 }}>
                  {(lead.prenom[0] || lead.nom[0] || "?")}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: FB.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {lead.prenom} {lead.nom}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: lead.score > 80 ? FB.green : lead.score > 60 ? FB.orange : FB.textSecondary }}>{lead.score}%</span>
              </div>
            </div>
          ))}
        </FBCard>
      )}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     CENTER FEED
     ═══════════════════════════════════════════════════════════ */
  const renderFeed = () => (
    <div style={{ flex: activeModule ? '0 0 auto' : 1, minWidth: 0, maxWidth: '100%', margin: "0 auto", paddingTop: isMobile ? 0 : 8, overflow: 'hidden' }}>

      {/* "What's buzzing" — Twitter-style single line */}
      <FBCard>
        <input type="file" ref={fileInputRef} multiple style={{ display: 'none' }} onChange={handleFileChange} />
        {postMood && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, paddingLeft: 36 }}>
            <span style={{ fontSize: 14 }}>{postMood}</span>
            <span style={{ fontSize: 11, color: FB.textSecondary }}>{moods.find(m => m.emoji === postMood)?.label}</span>
            <span onClick={() => setPostMood(null)} style={{ fontSize: 11, color: FB.textSecondary, cursor: 'pointer' }}>✕</span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* 🐝 Avatar piloté par le système d'identité centralisé */}
          <Avatar size={30} src={identity.avatarUrl}
            icon={!identity.isOrgMode && !identity.avatarUrl ? <UserOutlined /> : undefined}
            style={{ background: !identity.avatarUrl ? identity.avatarBgColor : undefined, flexShrink: 0 }}>
            {!identity.avatarUrl && identity.avatarFallback}
          </Avatar>
          <textarea
            value={newPostContent}
            onChange={e => setNewPostContent(e.target.value)}
            placeholder={t('dashboard.whatsBuzzing', { name: identity.displayName })}
            rows={1}
            style={{
              flex: 1, background: FB.btnGray, borderRadius: 20, padding: "6px 12px",
              fontSize: 13, color: FB.text, border: "none", outline: "none",
              resize: "none", minHeight: (newPostContent || postMediaPreviews.length > 0) ? 60 : 32,
              transition: "min-height 0.2s", fontFamily: "inherit", boxSizing: 'border-box',
            }}
            onFocus={e => { e.currentTarget.style.minHeight = "60px"; }}
          />
          {/* Action icons inline à droite */}
          <div style={{ display: "flex", gap: 2, flexShrink: 0, alignItems: "center" }}>
            {[
              { emoji: "📷", action: () => handleMediaSelect('image/*'), tip: t('wall.mediaPhoto') },
              { emoji: "🎥", action: () => handleMediaSelect('video/*'), tip: t('wall.mediaVideo') },
              { emoji: "📎", action: () => handleMediaSelect('*/*'), tip: t('wall.mediaFile') },
            ].map((btn, i) => (
              <AntTooltip key={i} title={btn.tip}>
                <div onClick={btn.action}
                  style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = FB.btnGray)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  {btn.emoji}
                </div>
              </AntTooltip>
            ))}
            <div style={{ position: 'relative' }}>
              <AntTooltip title={t('wall.moodTooltip')}>
                <div onClick={() => setShowMoodPicker(!showMoodPicker)}
                  style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = FB.btnGray)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  😊
                </div>
              </AntTooltip>
              {showMoodPicker && (
                <div style={{
                  position: 'absolute', bottom: '100%', right: 0, marginBottom: 4,
                  background: FB.white, borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  padding: 6, display: 'flex', flexWrap: 'wrap', gap: 2, width: 200, zIndex: 100,
                }}>
                  {moods.map(m => (
                    <div key={m.emoji}
                      onClick={() => { setPostMood(m.emoji); setShowMoodPicker(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 6px', borderRadius: 6, cursor: 'pointer', fontSize: 12, background: postMood === m.emoji ? FB.blue + '15' : 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.background = FB.btnGray; }}
                      onMouseLeave={e => { e.currentTarget.style.background = postMood === m.emoji ? FB.blue + '15' : 'transparent'; }}>
                      <span style={{ fontSize: 16 }}>{m.emoji}</span>
                      <span style={{ color: FB.text, fontSize: 11 }}>{m.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Media previews */}
        {postMediaPreviews.length > 0 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 0 0', marginLeft: 36 }}>
            {postMediaPreviews.map((m, i) => (
              <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                {m.type === 'video' ? (
                  <video src={m.preview} style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                ) : (
                  <img src={m.preview} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                )}
                <div onClick={() => removeMediaPreview(i)} style={{
                  position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%',
                  background: '#e74c3c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, cursor: 'pointer', fontWeight: 700,
                }}>✕</div>
              </div>
            ))}
          </div>
        )}

        {/* Category selector — only when composing */}
        {(newPostContent.trim() || postMediaPreviews.length > 0) && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6, marginLeft: 36 }}>
            {[
              { value: 'projet', label: t('wall.category.project'), color: SF.blue },
              { value: 'chantier_realise', label: t('wall.category.chantier'), color: SF.amber },
              { value: 'promotion', label: t('wall.category.promo'), color: SF.red },
              { value: 'conseil', label: t('wall.category.conseil'), color: SF.emerald },
              { value: 'actualite', label: t('wall.category.news'), color: SF.violet },
              { value: 'emploi', label: t('wall.category.job'), color: '#0ea5e9' },
              { value: 'market', label: t('wall.category.market'), color: '#f97316' },
            ].map(cat => (
              <div key={cat.value}
                onClick={() => setPostCategory(postCategory === cat.value ? null : cat.value)}
                style={{
                  padding: '2px 8px', borderRadius: 12, fontSize: 11, cursor: 'pointer',
                  background: postCategory === cat.value ? cat.color + '20' : FB.btnGray,
                  color: postCategory === cat.value ? cat.color : FB.textSecondary,
                  border: postCategory === cat.value ? `1px solid ${cat.color}` : '1px solid transparent',
                  fontWeight: postCategory === cat.value ? 600 : 400,
                }}>
                {cat.label}
              </div>
            ))}
          </div>
        )}

        {/* Visibility selector + Post button — only when composing */}
        {(newPostContent.trim() || postMediaPreviews.length > 0) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {(currentOrganization ? ["IN", "ALL", "OUT"] as WallVisibility[] : ["ALL", "OUT"] as WallVisibility[]).map(v => {
                const vis = getVisibilityLabel(t)[v];
                const active = newPostVisibility === v;
                return (
                  <div key={v} onClick={() => setNewPostVisibility(v)}
                    style={{
                      display: "flex", alignItems: "center", gap: 3, padding: "2px 8px",
                      borderRadius: 12, cursor: "pointer", fontSize: 11, fontWeight: 600,
                      background: active ? vis.color + "20" : FB.btnGray,
                      color: active ? vis.color : FB.textSecondary,
                      border: active ? `1px solid ${vis.color}` : "1px solid transparent",
                    }}>
                    {vis.icon} <span>{vis.label}</span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleCreatePost}
              disabled={postSubmitting || (!newPostContent.trim() && postMediaPreviews.length === 0)}
              style={{
                padding: "4px 16px", background: FB.blue, color: FB.white,
                border: "none", borderRadius: 14, fontWeight: 600, fontSize: 13,
                cursor: postSubmitting ? "not-allowed" : "pointer",
                opacity: postSubmitting ? 0.6 : 1,
              }}>
              {postSubmitting ? "..." : t('wall.buzzIt')}
            </button>
          </div>
        )}
      </FBCard>

      {/* Module shortcuts — compact pill style (CRM modules only, org users) */}
      {currentOrganization && <div ref={pillsRef}
        onMouseDown={onPillsMouseDown}
        onWheel={onPillsWheel}
        onTouchStart={(e) => {
          const el = pillsRef.current; if (!el) return;
          const touch = e.touches[0];
          pillsDrag.current = { active: true, startX: touch.pageX - el.offsetLeft, scrollLeft: el.scrollLeft, moved: false };
        }}
        onTouchMove={(e) => {
          const d = pillsDrag.current; if (!d.active) return;
          const el = pillsRef.current; if (!el) return;
          const touch = e.touches[0];
          const x = touch.pageX - el.offsetLeft;
          const walk = x - d.startX;
          if (Math.abs(walk) > 3) d.moved = true;
          el.scrollLeft = d.scrollLeft - walk;
        }}
        onTouchEnd={() => { pillsDrag.current.active = false; }}
        style={{
        display: "flex", gap: 4, overflowX: "auto", marginBottom: 4,
        WebkitOverflowScrolling: "touch", scrollbarWidth: "none",
        cursor: "grab", touchAction: "pan-x",
        maxWidth: "100%", flexShrink: 0, flexWrap: "nowrap",
      }}>
          {sectionsWithModules.flatMap(s => s.modules)
            .filter(mod => {
              const p = (mod as any).placement || 'sidebar';
              return p === 'sidebar' || p === 'both';
            })
            .sort((a, b) => {
              const aFav = favModules.has(getModuleRoute(a)) ? 0 : 1;
              const bFav = favModules.has(getModuleRoute(b)) ? 0 : 1;
              return aFav - bFav;
            })
            .map((mod, i) => {
            const route = getModuleRoute(mod);
            const isActive = activeModule === route;
            const isFav = favModules.has(route);
            return (
              <div key={mod.key || mod.id || i}
                onClick={() => {
                  if (pillsDrag.current.moved) return;
                  if (longPressTriggered.current) return;
                  openModule(route);
                }}
                onTouchStart={() => startLongPress(route)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                onMouseDown={(e) => { if (e.button === 0) startLongPress(route); }}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onContextMenu={(e) => e.preventDefault()}
                style={{ cursor: 'pointer', userSelect: 'none' }}>
                <div style={{
                  flex: "0 0 auto", display: "flex", alignItems: "center",
                  gap: 4, padding: "4px 8px",
                  borderRadius: 14,
                  background: isActive ? '#e7f3ff' : isFav ? 'linear-gradient(135deg, #FFF8E1, #FFF3CD)' : FB.white,
                  boxShadow: isFav ? '0 1px 4px rgba(218,165,32,0.3)' : FB.shadow,
                  border: isActive ? `1.5px solid ${FB.blue}` : isFav ? '1.5px solid #DAA520' : '1.5px solid transparent',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: isFav ? 'linear-gradient(135deg, #DAA520, #F4C430)' : getModuleColor(mod),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: FB.white,
                  }}>
                    {isFav ? '⭐' : getModuleIcon(mod)}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? FB.blue : isFav ? '#B8860B' : FB.text, whiteSpace: "nowrap" }}>{mod.label || mod.name || mod.key}</span>
                </div>
              </div>
            );
          })}
        </div>}

      {/* Feed content — hidden when a module or center app is active */}
      {!activeModule && !centerApp && (<>

      {/* ── Wall Search Results (when user clicks "Plus de recherche") ── */}
      {wallSearchQuery && (
        <div style={{ background: FB.white, marginBottom: 8, overflow: "hidden" }}>

          {/* ── Search results as rich cards ── */}

              {/* Search header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 12px", borderBottom: `1px solid ${FB.border}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <GlobalOutlined style={{ fontSize: 15, color: FB.blue }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: FB.text }}>
                    {wallSearchQuery}
                  </span>
                  <span style={{ fontSize: 11, color: FB.textSecondary, fontWeight: 500 }}>
                    — {wallSearchResults.length > 1 ? t('search.resultCountPlural', { count: wallSearchResults.length }) : t('search.resultCount', { count: wallSearchResults.length })}
                  </span>
                </div>
                <div onClick={() => setWallSearchQuery(null)}
                  style={{ cursor: "pointer", fontSize: 18, color: FB.textSecondary, lineHeight: 1, padding: "0 4px" }}>
                  ×
                </div>
              </div>

              {/* Results list — rich cards with preview */}
              {wallSearchResults.map((result, idx) => (
                <div
                  key={`ws-${idx}`}
                  onClick={async () => {
                    if (!result.url) return;
                    // Native (Android/iOS) → Custom Tab / InAppBrowser
                    const { openInNativeBrowser } = await import('../utils/capacitor');
                    const opened = await openInNativeBrowser(result.url);
                    if (!opened) {
                      // Web → overlay in-app browser (stays on Zhiive)
                      setWallViewUrl(result.url);
                    }
                  }}
                  style={{
                    padding: "12px",
                    cursor: "pointer",
                    borderBottom: `1px solid ${FB.btnGray}`,
                    transition: "background 0.12s",
                    display: "flex",
                    gap: 12,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f8f9fa'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Preview image */}
                  {result.img_src ? (
                    <div style={{
                      width: 120, minWidth: 120, height: 80, borderRadius: 8,
                      overflow: "hidden", background: FB.btnGray, flexShrink: 0,
                    }}>
                      <img
                        src={result.img_src}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  ) : null}

                  {/* Text content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Favicon + domain */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      {result.favicon && (
                        <img src={result.favicon} alt="" style={{ width: 16, height: 16, borderRadius: 2 }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                      <span style={{ fontSize: 11, color: FB.green, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {result.url?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                      </span>
                    </div>
                    {/* Title */}
                    <div style={{ fontSize: 15, fontWeight: 600, color: FB.blue, marginBottom: 3, lineHeight: 1.3 }}>
                      {result.title}
                    </div>
                    {/* Description */}
                    {result.content && (
                      <div style={{
                        fontSize: 13, color: FB.textSecondary, lineHeight: 1.45,
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {result.content}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {wallSearchLoading && (
                <div style={{ textAlign: "center", padding: "24px 16px" }}>
                  <Spin size="default" />
                  <div style={{ color: FB.textSecondary, fontSize: 13, marginTop: 8 }}>Chargement...</div>
                </div>
              )}

              {!wallSearchLoading && wallSearchHasMore && wallSearchResults.length > 0 && (
                <div style={{ textAlign: "center", padding: "14px 0", borderTop: `1px solid ${FB.btnGray}` }}>
                  <button onClick={loadMoreSearchResults}
                    style={{
                      padding: "8px 28px", background: FB.blue, color: FB.white,
                      border: "none", borderRadius: 4, fontWeight: 600,
                      fontSize: 14, cursor: "pointer",
                    }}>
                    {t('search.moreResults')}
                  </button>
                </div>
              )}

              {!wallSearchLoading && wallSearchResults.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 16px" }}>
                  <GlobalOutlined style={{ fontSize: 36, color: FB.border, marginBottom: 12 }} />
                  <div style={{ fontSize: 15, fontWeight: 600, color: FB.text, marginBottom: 6 }}>{t('search.noResults')}</div>
                  <div style={{ color: FB.textSecondary, fontSize: 13 }}>{t('search.tryOtherKeywords')}</div>
                </div>
              )}

              {!wallSearchLoading && !wallSearchHasMore && wallSearchResults.length > 0 && (
                <div style={{ textAlign: "center", padding: "16px 0", color: FB.textSecondary, fontSize: 13, borderTop: `1px solid ${FB.btnGray}` }}>
                  {t('search.endOfResults')}
                </div>
              )}

        </div>
      )}

      {/* Feed header — single compact line with filter dropdown */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0 4px", marginBottom: 4, position: "relative" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: FB.text }}>{t('wall.feed')}</span>
        {wallPosts.length > 0 && (
          <span style={{ fontSize: 10, color: FB.textSecondary, background: FB.btnGray, borderRadius: 8, padding: "0 5px", fontWeight: 600 }}>
            {wallPosts.length}
          </span>
        )}
        {feedFilter && (
          <span style={{ fontSize: 10, background: FB.blue + "15", color: FB.blue, borderRadius: 8, padding: "1px 6px", fontWeight: 600 }}>
            {({ projet: t('wall.filterIcon.projects'), chantier_realise: t('wall.filterIcon.chantiers'), promotion: t('wall.filterIcon.promos'), conseil: t('wall.filterIcon.conseils') } as Record<string,string>)[feedFilter]}
            <span onClick={() => { setFeedFilter(""); setWallPosts([]); setWallCursor(null); }} style={{ cursor: "pointer", marginLeft: 3 }}>✕</span>
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center" }}>
          <div onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "50%", background: feedFilter ? FB.blue + "15" : FB.btnGray, cursor: "pointer", position: "relative" }}>
            <FilterOutlined style={{ fontSize: 12, color: feedFilter ? FB.blue : FB.textSecondary }} />
          </div>
          <div onClick={handleRefresh}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "50%", background: FB.btnGray, cursor: "pointer" }}>
            <ReloadOutlined spin={refreshing} style={{ fontSize: 12, color: FB.textSecondary }} />
          </div>
        </div>
        {/* Filter dropdown popover */}
        {showFilterDropdown && (
          <div style={{
            position: "absolute", top: "100%", right: 0, zIndex: 50,
            background: FB.white, borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            padding: 6, display: "flex", flexDirection: "column", gap: 2, minWidth: 150, marginTop: 2,
          }}>
            {[
              { key: "", label: t('wall.filter.all'), icon: "🏠" },
              { key: "projet", label: t('wall.filter.projects'), icon: "📋" },
              { key: "chantier_realise", label: t('wall.filter.chantiers'), icon: "🔨" },
              { key: "promotion", label: t('wall.filter.promos'), icon: "📢" },
              { key: "conseil", label: t('wall.filter.conseils'), icon: "💡" },
            ].map(cat => (
              <div key={cat.key} onClick={() => { setFeedFilter(cat.key); setWallPosts([]); setWallCursor(null); setShowFilterDropdown(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
                  borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
                  background: feedFilter === cat.key ? FB.blue + "15" : "transparent",
                  color: feedFilter === cat.key ? FB.blue : FB.text,
                }}
                onMouseEnter={e => { if (feedFilter !== cat.key) e.currentTarget.style.background = FB.btnGray; }}
                onMouseLeave={e => { if (feedFilter !== cat.key) e.currentTarget.style.background = "transparent"; }}>
                <span>{cat.icon}</span> <span>{cat.label}</span>
                {feedFilter === cat.key && <span style={{ marginLeft: "auto", fontSize: 11 }}>✓</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wall Posts (real API data) */}
      {wallPosts.length > 0 ? (
        <>
          {wallPosts.map(post => (
            <WallPostCard key={post.id} post={post} isMobile={isMobile}
              currentUserId={user?.id || ""} currentUser={user} api={api} onUpdate={() => fetchWallFeed(true)}
              feedMode={feedMode} currentOrganization={currentOrganization} />
          ))}
          {wallCursor && (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <button onClick={() => fetchWallFeed(false)} disabled={wallLoading}
                style={{
                  padding: "8px 24px", background: FB.white, color: FB.blue,
                  border: `1px solid ${FB.blue}`, borderRadius: 20, fontWeight: 600,
                  fontSize: 14, cursor: wallLoading ? "not-allowed" : "pointer",
                }}>
                {wallLoading ? t('common.loading') : t('common.viewMore')}
              </button>
            </div>
          )}
        </>
      ) : wallLoading ? (
        <FBCard style={{ textAlign: "center", padding: "40px 16px" }}>
          <Spin size="default" />
          <div style={{ color: FB.textSecondary, fontSize: 14, marginTop: 12 }}>{t('dashboard.loadingFeed')}</div>
        </FBCard>
      ) : recentActivities.length > 0 ? (
        /* Fallback: legacy activity feed when no wall posts exist yet */
        <>
          <div style={{ fontSize: 12, color: FB.textSecondary, textAlign: "center", marginBottom: 8 }}>
            {t('dashboard.recentActivity')}
          </div>
          {recentActivities.slice(0, 10).map(activity => {
            // Convert legacy activity to minimal card display
            const authorName = activity.user || t('common.system');
            return (
              <FBCard key={activity.id} noPadding>
                <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", gap: 8 }}>
                  <Avatar size={36} style={{ backgroundColor: activityColor(activity.type), flexShrink: 0 }}
                    icon={activityIcon(activity.type)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14, color: FB.text }}>{authorName}</span>{" "}
                      <span style={{ color: FB.textSecondary, fontSize: 14 }}>{activityVerb(activity.type, t)}</span>
                    </div>
                    <div style={{ fontSize: 14, color: FB.text, marginTop: 4 }}>{activity.description}</div>
                    <div style={{ fontSize: 12, color: FB.textSecondary, marginTop: 4 }}>{timeAgo(activity.timestamp)}</div>
                  </div>
                </div>
              </FBCard>
            );
          })}
        </>
      ) : (
        <FBCard style={{ textAlign: "center", padding: "40px 16px" }}>
          <BulbOutlined style={{ fontSize: 48, color: FB.border, marginBottom: 16 }} />
          <div style={{ fontSize: 17, fontWeight: 600, color: FB.text, marginBottom: 8 }}>
            {t('dashboard.welcomeToHive')}
          </div>
          <div style={{ color: FB.textSecondary, fontSize: 14 }}>
            {t('dashboard.emptyFeedMessage')}
          </div>
        </FBCard>
      )}

      {/* End of feed */}
      {wallPosts.length > 0 && !wallCursor && (
        <div style={{ textAlign: "center", padding: "20px 0 40px", color: FB.textSecondary, fontSize: 14 }}>
          <CheckCircleOutlined style={{ fontSize: 24, marginBottom: 8, display: "block" }} />
          {t('dashboard.upToDate')}
        </div>
      )}
      </>)}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     MAIN RENDER — 3-COLUMN LAYOUT / MOBILE SWIPE / EMBEDDED MODULE
     ═══════════════════════════════════════════════════════════ */

  /** Renders the embedded module component inside the dashboard shell */
  // Render any Zhiive app panel by its ID
  const renderPanel = (appId: string, sidebar?: boolean) => {
    // ═══ Enforcement SocialSettings: ne pas rendre les apps désactivées ═══
    const APP_TO_SETTING: Record<string, string> = {
      explore: 'explore', nectar: 'sparks', reels: 'reels',
    };
    const settingKey = APP_TO_SETTING[appId];
    if (settingKey && !isAppEnabled(settingKey)) return null;

    switch (appId) {
      case 'explore': return <LazyExplorePanel api={api} openModule={openModule} compact={sidebar} />;
      case 'nectar': return <LazyNectarPanel api={api} currentUser={user} />;
      case 'reels': return <LazyReelsPanel api={api} currentUser={user} />;
      case 'wax': return <LazyWaxPanel api={api} currentUser={user} />;
      case 'mail': return <LazyGoogleGmailPageV2 compact={sidebar} />;
      case 'agenda': return <LazyAgendaWrapper compact={sidebar} />;
      case 'search': return <LazySearchPage compact={sidebar} />;
      case 'stats': return !isFreeUser ? renderMobileAnalytics() : null;
      default: return null;
    }
  };

  const renderEmbeddedModule = () => {
    if (!activeModule) return null;
    if (!ActiveModuleComponent) {
      // Module route not mapped — show fallback message
      return (
        <div style={{ textAlign: 'center', padding: '60px 16px', color: FB.textSecondary }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, fontSize: 14 }}>Chargement du module...</div>
        </div>
      );
    }
    return (
      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
          <Spin size="large" />
        </div>
      }>
        <WallNavigationProvider value={{ isInWall: true, openModule, goHome }}>
          <div style={{
            marginTop: 4,
            minHeight: 'calc(100vh - 200px)',
          }}>
            <ActiveModuleComponent />
          </div>
        </WallNavigationProvider>
      </Suspense>
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: FB.bg, minHeight: 0 }}>
      <style>{`.mobile-swipe::-webkit-scrollbar { display: none; }
        .sf-sidebar::-webkit-scrollbar { display: none; }
        .sf-sidebar-panel::-webkit-scrollbar { display: none; }
        .sf-center-col::-webkit-scrollbar { display: none; }
      `}</style>

      {activeModule ? (
        /* ── MODULE ACTIVE on MOBILE: Single view ── */
        isMobile ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            padding: "4px 8px", height: `calc(100vh - ${TOP_NAV_HEIGHT}px)`,
          }}>
            <div style={{ flex: '0 0 auto' }}>
              {renderFeed()}
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>
              {renderEmbeddedModule()}
            </div>
          </div>
        ) : null /* Desktop handles activeModule in 3-column layout below */
      ) : null}

      {!activeModule && isMobile ? (
        /* ═══════════════════════════════════════════════════════
           MOBILE — CIRCULAR CAROUSEL (swipe)
           Order follows tabOrder. Wall is center.
           Wrap around: last right app → jumps back to first panel.
           ═══════════════════════════════════════════════════════ */
        <>
          <div
            ref={scrollContainerCallbackRef}
            onScroll={handleMobileScroll}
            onTouchStart={handleBoundaryTouchStart}
            onTouchEnd={handleBoundaryTouchEnd}
            className="mobile-swipe"
            style={{
              display: "flex", overflowX: "auto", overflowY: "hidden",
              scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none", msOverflowStyle: "none" as any,
              height: `calc(100vh - ${TOP_NAV_HEIGHT}px)`,
            }}
          >
            {tabOrder.map(tabId => {
              if (isFreeUser && tabId === 'stats') return null;
              const panelStyle: React.CSSProperties = {
                flex: "0 0 100%", width: "100%", scrollSnapAlign: "start",
                overflowY: tabId === 'reels' ? "hidden" : "auto",
                padding: tabId === 'mur' || tabId === 'stats' ? "4px 8px" : undefined,
              };
              if (tabId === 'mur') {
                return (
                  <div key="mur" style={panelStyle}>
                    <Suspense fallback={null}>
                      <LazyStoriesBar api={api} currentUser={user} />
                    </Suspense>
                    {renderFeed()}
                  </div>
                );
              }
              return (
                <div key={tabId} style={panelStyle}>
                  <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spin size="large" /></div>}>
                    {renderPanel(tabId)}
                  </Suspense>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {!isMobile && (
        /* ═══════════════════════════════════════════════════════
           DESKTOP — 3-Column Layout
           Left sidebar: selected left app (closest to Mur by default)
           Center: ALWAYS the Wall (Hive) — Mur is the heart
           Right sidebar: selected right app (closest to Mur by default)
           ═══════════════════════════════════════════════════════ */
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* Force ALL sidebar children to respect 300px boundary */}
          <style>{`
            .sf-sidebar { overflow: hidden; width: 300px; }
            .sf-sidebar > div { overflow: hidden; max-width: 300px; width: 300px; }
            .sf-sidebar div { box-sizing: border-box; }
            .sf-sidebar .ant-layout { min-width: 0 !important; width: 100% !important; max-width: 300px !important; }
            .sf-sidebar .ant-layout-content { min-width: 0 !important; width: 100% !important; }
            .sf-sidebar .ant-layout-sider { display: none !important; }
            .sf-sidebar .ant-card { max-width: 100% !important; }
            .sf-sidebar .ant-card-body { max-width: 100% !important; overflow: hidden !important; }
            .sf-sidebar .fc { max-width: 100% !important; }
            .sf-sidebar .fc-scrollgrid,
            .sf-sidebar .fc table { max-width: 100% !important; table-layout: fixed !important; }
            .sf-sidebar .fc-view-harness { overflow-x: auto !important; }
            .sf-sidebar .ant-input { max-width: 100% !important; }
            .sf-sidebar .ant-btn { max-width: 100% !important; overflow: hidden !important; text-overflow: ellipsis !important; }
            .sf-sidebar .ant-tabs-nav-list { max-width: 100% !important; }
            .sf-sidebar .wax-btn-label { display: none !important; }
            .sf-sidebar .group { max-width: 300px !important; overflow: hidden !important; }
            .sf-sidebar .flex-1 { min-width: 0 !important; }
            .sf-sidebar .truncate { max-width: 100% !important; display: block !important; }
            .sf-sidebar .maplibregl-map, .sf-sidebar .maplibregl-canvas-container, .sf-sidebar .maplibregl-canvas { max-width: none !important; width: 100% !important; }
          `}</style>

          {/* ── LEFT SIDEBAR (300px) — all left apps stacked ── */}
          <div style={{
            width: 300, minWidth: 300, maxWidth: 300, height: "100%",
            display: "flex", flexDirection: "column",
            borderRight: `1px solid ${FB.border}`, background: FB.bg,
            overflow: 'hidden',
          }}>
            <div className="sf-sidebar" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none", width: 300 }}>
              {[...leftApps].filter(a => a !== centerApp).reverse().map(appId => (
                <div key={appId} style={{
                  ...(appId === 'reels' ? { height: '100%', minHeight: '100%' } : { minHeight: '60vh' }),
                  borderBottom: `1px solid ${FB.border}`,
                  display: 'flex', flexDirection: 'column',
                  width: 300, maxWidth: 300,
                }}>
                  <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>}>
                    {renderPanel(appId, true)}
                  </Suspense>
                </div>
              ))}
            </div>
          </div>

          {/* ── CENTER (flex: 1) — Wall by default, or selected app / CRM module ── */}
          <div className="sf-center-col" style={{
            flex: 1, minWidth: 0, overflowY: activeModule ? "hidden" : "auto", padding: "8px 16px",
            display: 'flex', flexDirection: 'column',
            scrollbarWidth: 'none', msOverflowStyle: 'none' as any,
          }}>
            <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {activeModule ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                  <div style={{ flex: '0 0 auto' }}>
                    {renderFeed()}
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>
                    {renderEmbeddedModule()}
                  </div>
                </div>
              ) : centerApp ? (
                <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spin size="large" /></div>}>
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    {renderPanel(centerApp)}
                  </div>
                </Suspense>
              ) : (
                <div style={{ padding: '8px 12px' }}>
                  <Suspense fallback={null}>
                    <LazyStoriesBar api={api} currentUser={user} />
                  </Suspense>
                  {renderFeed()}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT SIDEBAR (300px) — all right apps stacked ── */}
          <div style={{
            width: 300, minWidth: 300, maxWidth: 300, height: "100%",
            display: "flex", flexDirection: "column",
            borderLeft: `1px solid ${FB.border}`, background: FB.bg,
            overflow: 'hidden',
          }}>
            <div className="sf-sidebar" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none", width: 300 }}>
              {rightApps.filter(a => a !== centerApp).map(appId => (
                <div key={appId} style={{
                  minHeight: '60vh',
                  borderBottom: `1px solid ${FB.border}`,
                  display: 'flex', flexDirection: 'column',
                  width: 300, maxWidth: 300,
                }}>
                  <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>}>
                    {renderPanel(appId, true)}
                  </Suspense>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
