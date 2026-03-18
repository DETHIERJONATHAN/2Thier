import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useAuthenticatedApi } from "../hooks/useAuthenticatedApi";
import { useAuth } from "../auth/useAuth";
import { useLeadStatuses } from "../hooks/useLeadStatuses";
import { Link, useLocation } from "react-router-dom";
import { Avatar, Spin, Tooltip as AntTooltip } from "antd";
import {
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  TrophyOutlined,
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
} from "@ant-design/icons";
import { useSharedSections } from "../hooks/useSharedSections";
import { organizeModulesInSections } from "../utils/modulesSections";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { NotificationManager } from "../components/Notifications";
import MessengerChat, { FriendsWidget } from "../components/MessengerChat";

/* ═══════════════════════════════════════════════════════════════
   FACEBOOK COLORS — exactement les mêmes tokens
   ═══════════════════════════════════════════════════════════════ */
const FB = {
  bg: "#f0f2f5",
  white: "#ffffff",
  text: "#050505",
  textSecondary: "#65676b",
  blue: "#1877f2",
  blueHover: "#166fe5",
  border: "#ced0d4",
  btnGray: "#e4e6eb",
  btnGrayHover: "#d8dadf",
  activeBlue: "#e7f3ff",
  green: "#42b72a",
  red: "#e4405f",
  orange: "#f7931a",
  shadow: "0 1px 2px rgba(0,0,0,0.1)",
  shadowHover: "0 2px 8px rgba(0,0,0,0.15)",
  radius: 8,
};

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
  createdAt: string;
  author: WallPostAuthor;
  targetLead?: { id: string; firstName?: string; lastName?: string; company?: string };
  reactions: { id: string; userId: string; type: string }[];
  comments: WallPostComment[];
  myReaction?: { id: string; userId: string; type: string } | null;
  totalComments: number;
  totalReactions: number;
  totalShares: number;
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

const activityVerb = (type: string) => {
  switch (type) {
    case "creation": return "a ajouté un nouveau lead";
    case "email": return "a envoyé un email";
    case "meeting": return "a planifié une réunion";
    case "task": return "a complété une tâche";
    default: return "a effectué une action";
  }
};

const timeAgo = (timestamp: string): string => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l\u0027instant";
  if (mins < 60) return "il y a " + mins + " min";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return "il y a " + hrs + "h";
  const days = Math.floor(hrs / 24);
  if (days < 7) return "il y a " + days + "j";
  return new Date(timestamp).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

const visibilityLabel: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  OUT: { icon: <LockOutlined />, label: "Privé", color: "#8c8c8c" },
  IN: { icon: <TeamOutlined />, label: "Organisation", color: "#1890ff" },
  ALL: { icon: <GlobalOutlined />, label: "Public", color: "#52c41a" },
  CLIENT: { icon: <UserOutlined />, label: "Client", color: "#722ed1" },
};

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
    padding: noPadding ? 0 : 16, marginBottom: 16, ...style,
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
}> = ({ icon, label, to, color }) => {
  const [hovered, setHovered] = useState(false);
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to + '/'));
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
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
          fontSize: 15, fontWeight: isActive ? 600 : 500, color: isActive ? '#1877f2' : FB.text,
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
  api: any;
  onUpdate: () => void;
}> = ({ post, isMobile, currentUserId: _uid, api, onUpdate: _onUpdate }) => {
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

  const authorName = [post.author.firstName, post.author.lastName].filter(Boolean).join(" ") || "Système";
  const vis = visibilityLabel[post.visibility] || visibilityLabel.IN;

  const reactionTypes = [
    { type: "LIKE", emoji: "👍", label: "J'aime", color: FB.blue },
    { type: "LOVE", emoji: "❤️", label: "J'adore", color: "#e74c3c" },
    { type: "BRAVO", emoji: "👏", label: "Bravo", color: "#f39c12" },
    { type: "UTILE", emoji: "💡", label: "Utile", color: "#27ae60" },
    { type: "WOW", emoji: "😮", label: "Wow", color: "#9b59b6" },
  ];

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
      const body: Record<string, string> = { content: text.trim() };
      if (parentCommentId) body.parentCommentId = parentCommentId;
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
    const text = post.content ? post.content.substring(0, 200) : `Post de ${authorName}`;
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
          NotificationManager.success("Lien copié !");
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
          const subject = encodeURIComponent(`Post de ${authorName}`);
          const body = encodeURIComponent(`${text}\n\n${url}`);
          window.open(`mailto:?subject=${subject}&body=${body}`);
          break;
        }
      }
      setShowShareMenu(false);
    } catch (e) { console.error("[WALL] Share error:", e); }
  };

  const handleToggleComments = () => {
    if (!showComments) loadComments();
    setShowComments(!showComments);
  };

  const isLiked = !!myReaction;

  return (
    <FBCard noPadding>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px 0", gap: 8 }}>
        <Avatar size={40} src={post.author.avatarUrl}
          icon={!post.author.avatarUrl ? <UserOutlined /> : undefined}
          style={{ backgroundColor: !post.author.avatarUrl ? FB.blue : undefined, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: 14, color: FB.text }}>{authorName}</span>
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
      <div style={{ padding: "12px 16px" }}>
        {post.content && (
          <div style={{ fontSize: 15, color: FB.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{post.content}</div>
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

      {/* Media */}
      {post.mediaUrls && Array.isArray(post.mediaUrls) && (post.mediaUrls as string[]).length > 0 && (
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{
            display: "flex", gap: 4, flexWrap: "wrap",
            justifyContent: (post.mediaUrls as string[]).length === 1 ? "center" : "flex-start",
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
                      borderRadius: 8,
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
                    borderRadius: 8,
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
            <>
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
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {commentsCount > 0 && (
            <span style={{ cursor: "pointer" }} onClick={handleToggleComments}>
              {commentsCount} commentaire{commentsCount > 1 ? "s" : ""}
            </span>
          )}
          {post.totalShares > 0 && <span>{post.totalShares} partage{post.totalShares > 1 ? "s" : ""}</span>}
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
              {reactionTypes.map(r => (
                <div key={r.type}
                  onClick={(e) => { e.stopPropagation(); handleReaction(r.type); setShowReactionPicker(false); }}
                  style={{
                    width: 38, height: 38, borderRadius: "50%", display: "flex",
                    alignItems: "center", justifyContent: "center", cursor: "pointer",
                    fontSize: 22, transition: "transform 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                  title={r.label}
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
              color: isLiked ? (reactionTypes.find(r => r.type === myReaction?.type)?.color || FB.blue) : FB.textSecondary,
              fontWeight: 600, fontSize: isMobile ? 13 : 14, transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = FB.btnGray)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {isLiked
              ? <span style={{ fontSize: 16 }}>{reactionTypes.find(r => r.type === myReaction?.type)?.emoji || "👍"}</span>
              : <LikeOutlined />}
            {!isMobile && <span>{isLiked ? (reactionTypes.find(r => r.type === myReaction?.type)?.label || "J'aime") : "J'aime"}</span>}
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
          {!isMobile && <span>Commenter</span>}
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
            {!isMobile && <span>Partager</span>}
          </div>
          {showShareMenu && (
            <div style={{
              position: "absolute", bottom: "100%", right: 0, marginBottom: 4,
              background: FB.white, borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              padding: 4, minWidth: 180, zIndex: 100,
            }}>
              {[
                { type: "LINK", icon: "🔗", label: "Copier le lien" },
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
          {allComments.map((comment) => (
            <div key={comment.id} style={{ marginBottom: 8, marginLeft: 0, paddingLeft: 0 }}>
              {/* Main comment — flush left */}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Avatar size={28} src={comment.author.avatarUrl}
                  icon={!comment.author.avatarUrl ? <UserOutlined /> : undefined}
                  style={{ backgroundColor: !comment.author.avatarUrl ? FB.blue : undefined, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    background: FB.btnGray, borderRadius: 12, padding: "8px 12px",
                    width: 'fit-content', maxWidth: '85%', textAlign: 'left',
                  }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: FB.text }}>
                      {[comment.author.firstName, comment.author.lastName].filter(Boolean).join(" ")}
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
                      {likedComments.has(comment.id) ? (commentReactions[comment.id] || '👍') : "J'aime"}
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
                        {reactionTypes.map(r => (
                          <span key={r.type}
                            onClick={(e) => { e.stopPropagation(); handleCommentLike(comment.id, r.emoji); }}
                            title={r.label}
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
                      Répondre
                    </span>
                    <span style={{ fontSize: 11, color: FB.textSecondary }}>{timeAgo(comment.createdAt)}</span>
                  </div>

                  {/* Replies — staircase indent */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      {comment.replies.map((reply, replyIdx) => (
                        <div key={reply.id} style={{ marginBottom: 6, marginLeft: 12 + replyIdx * 8 }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                            <Avatar size={24} src={reply.author.avatarUrl}
                              icon={!reply.author.avatarUrl ? <UserOutlined /> : undefined}
                              style={{ backgroundColor: !reply.author.avatarUrl ? "#bbb" : undefined, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                background: FB.btnGray, borderRadius: 10, padding: "6px 10px",
                                width: 'fit-content', maxWidth: '85%', textAlign: 'left',
                              }}>
                                <span style={{ fontWeight: 600, fontSize: 12, color: FB.text }}>
                                  {[reply.author.firstName, reply.author.lastName].filter(Boolean).join(" ")}
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
                                  {likedComments.has(reply.id) ? (commentReactions[reply.id] || '👍') : "J'aime"}
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
                                    {reactionTypes.map(r => (
                                      <span key={r.type}
                                        onClick={(e) => { e.stopPropagation(); handleCommentLike(reply.id, r.emoji); }}
                                        title={r.label}
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
                                  Répondre
                                </span>
                                <span style={{ fontSize: 10, color: FB.textSecondary }}>{timeAgo(reply.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply input (shown when replying to this comment) */}
                  {replyingTo === comment.id && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6, marginLeft: 12 }}>
                      <Avatar size={24} icon={<UserOutlined />} />
                      <div style={{
                        flex: 1, display: "flex", alignItems: "center",
                        background: FB.btnGray, borderRadius: 20, padding: "2px 4px 2px 10px",
                      }}>
                        <input
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(comment.id); } }}
                          placeholder={`Répondre à ${[comment.author.firstName].filter(Boolean).join(" ") || 'ce commentaire'}…`}
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
          ))}

          {/* New comment input */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
            <Avatar size={28} icon={<UserOutlined />} />
            <div style={{
              flex: 1, display: "flex", alignItems: "center",
              background: FB.btnGray, borderRadius: 20, padding: "2px 4px 2px 12px",
            }}>
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                placeholder="Écrire un commentaire…"
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
const CreateOrganizationPrompt = () => (
  <div style={{
    minHeight: "100vh", background: FB.bg, display: "flex",
    alignItems: "center", justifyContent: "center", padding: 24,
  }}>
    <FBCard style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
      <Avatar size={64} icon={<BankOutlined />} style={{ marginBottom: 16 }} />
      <h3 style={{ fontSize: 20, fontWeight: 700, color: FB.text, margin: "0 0 8px" }}>Bienvenue</h3>
      <p style={{ color: FB.textSecondary, marginBottom: 20 }}>
        Pour commencer, vous devez créer ou rejoindre une organisation.
      </p>
      <Link to="/organization/create">
        <button style={{
          width: "100%", padding: "10px 0", background: FB.blue, color: FB.white,
          border: "none", borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: "pointer", marginBottom: 10,
        }}>
          <PlusOutlined /> Créer une organisation
        </button>
      </Link>
      <Link to="/settings/profile">
        <button style={{
          width: "100%", padding: "10px 0", background: FB.btnGray, color: FB.text,
          border: "none", borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: "pointer",
        }}>
          <SettingOutlined /> Paramètres du profil
        </button>
      </Link>
    </FBCard>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT — FACEBOOK NEWS FEED / WALL
   ═══════════════════════════════════════════════════════════════ */
export default function DashboardPageUnified() {
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  const { currentOrganization, isSuperAdmin, user, hasFeature, modules } = useAuth();
  const { leadStatuses } = useLeadStatuses();
  const { isMobile, isTablet } = useScreenSize();

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
  const [newPostVisibility, setNewPostVisibility] = useState<WallVisibility>("IN");
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [feedFilter, setFeedFilter] = useState<string>(""); // category filter
  const [postMediaPreviews, setPostMediaPreviews] = useState<{ file: File; preview: string; type: string }[]>([]);
  const [postMood, setPostMood] = useState<string | null>(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const moods = [
    { emoji: "😊", label: "Heureux" }, { emoji: "💪", label: "Motivé" },
    { emoji: "🎉", label: "Fête" }, { emoji: "🤝", label: "Reconnaissant" },
    { emoji: "🔥", label: "En feu" }, { emoji: "☕", label: "Café" },
    { emoji: "🏗️", label: "Au chantier" }, { emoji: "📊", label: "Concentré" },
    { emoji: "🎯", label: "Objectif" }, { emoji: "❤️", label: "Passionné" },
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

      const avgDealSize = 5000;
      const totalRevenue = convertedLeads.length * avgDealSize;
      const lastMonthLeads = leads.filter((lead: any) => {
        const d = new Date(lead.createdAt);
        const lm = new Date(); lm.setMonth(lm.getMonth() - 1);
        return d >= lm;
      }).length;
      const monthlyGrowth = totalLeads > 0 ? (lastMonthLeads / totalLeads) * 100 : 0;

      setStats({
        totalLeads, newLeadsToday, totalClients: clients.length, totalUsers: users.length,
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
        status: l.LeadStatus?.name || "Inconnu",
        statusColor: l.LeadStatus?.color,
        score: l.data?.score || 50,
        createdAt: l.createdAt,
      })));

      // Activities
      const acts: RecentActivity[] = [];
      leads.forEach((lead: any) => {
        acts.push({
          id: "creation-" + lead.id, type: "creation", title: "Nouveau lead",
          description: ((lead.firstName || "") + " " + (lead.lastName || "") + " " + (lead.company ? "(" + lead.company + ")" : "")).trim(),
          timestamp: lead.createdAt, status: "success",
          user: lead.assignedTo ? ((lead.assignedTo.firstName || "") + " " + (lead.assignedTo.lastName || "")).trim() : "Système",
        });
        if (lead.TimelineEvent && Array.isArray(lead.TimelineEvent)) {
          lead.TimelineEvent.forEach((ev: any) => {
            acts.push({
              id: ev.id,
              type: ev.eventType === "email" ? "email" : ev.eventType === "meeting" ? "meeting" : "task",
              title: ev.eventType,
              description: ev.data?.description || "Événement " + ev.eventType,
              timestamp: ev.createdAt, status: "info", user: "Utilisateur",
            });
          });
        }
      });
      acts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivities(acts.slice(0, 30));
    } catch (error) {
      console.error("Erreur chargement données:", error);
      NotificationManager.error("Impossible de charger les données du dashboard");
    } finally {
      setLoading(false);
    }
  }, [api, leadStatuses, isSuperAdmin, user?.role]);

  /* ─── WALL FEED FETCHING ───────────────────────────────────── */
  const fetchWallFeed = useCallback(async (reset = false) => {
    try {
      setWallLoading(true);
      const params = new URLSearchParams();
      if (!reset && wallCursor) params.set("cursor", wallCursor);
      if (feedFilter) params.set("category", feedFilter);
      params.set("limit", "20");

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
  }, [api, wallCursor, feedFilter]);

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
        NotificationManager.error("Ajoutez du texte ou des médias valides");
        setPostSubmitting(false);
        return;
      }

      const newPost = await api.post("/api/wall/posts", {
        content: content || undefined,
        visibility: newPostVisibility,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        mediaType,
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
      postMediaPreviews.forEach(m => URL.revokeObjectURL(m.preview));
      setPostMediaPreviews([]);
      NotificationManager.success("Post publié !");
    } catch (error) {
      console.error("[WALL] Erreur création post:", error);
      NotificationManager.error("Erreur lors de la publication");
    }
    setPostSubmitting(false);
  }, [api, newPostContent, newPostVisibility, postSubmitting, postMediaPreviews, postMood]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardData(), fetchWallFeed(true)]);
    setRefreshing(false);
    NotificationManager.success("Données actualisées !");
  }, [fetchDashboardData, fetchWallFeed]);

  // Hooks must be called before any early return to respect Rules of Hooks
  const { sections: sharedSections } = useSharedSections();
  const sectionsWithModules = useMemo(() => {
    const activeSections = sharedSections.filter(s => s.active);
    return organizeModulesInSections(activeSections, modules as any || []);
  }, [sharedSections, modules]);

  useEffect(() => {
    if (!user) return;
    if (!currentOrganization && !isSuperAdmin) return;
    fetchDashboardData();
    fetchWallFeed(true);
  }, [user, currentOrganization, isSuperAdmin, fetchDashboardData, fetchWallFeed]);

  if (!currentOrganization && !isSuperAdmin) return <CreateOrganizationPrompt />;

  if (loading) {
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
    tbl: '/tbl', devis: '/devis', tableaux: '/gestion-tableaux',
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
    { icon: <FunnelPlotOutlined />, label: "Nouveau Lead", to: "/leads/kanban", color: "#ff7a45", features: ['leads_access'] },
    { icon: <UserOutlined />, label: "Nouveau Client", to: "/clients", color: FB.green, features: ['clients_access'] },
    { icon: <CalendarOutlined />, label: "Planifier RDV", to: "/agenda", color: FB.orange, features: ['Agenda'] },
    { icon: <MailOutlined />, label: "Envoyer Email", to: "/google-gmail", color: FB.red, features: ['google_gmail_access', 'google_gmail'] },
  ];
  const quickActions = allQuickActions.filter(a => a.features.length === 0 || a.features.some(f => hasFeature(f)));

  const userName = user ? ((user.firstName || "") + " " + (user.lastName || "")).trim() || "Utilisateur" : "Utilisateur";

  /* ═══════════════════════════════════════════════════════════
     LEFT SIDEBAR
     ═══════════════════════════════════════════════════════════ */
  const renderLeftSidebar = () => (
    <div style={{ position: "fixed", left: 0, top: 56, width: 280, height: "calc(100vh - 56px)", overflowY: "auto", paddingTop: 16, paddingLeft: 8, paddingRight: 8, paddingBottom: 16, scrollbarWidth: "none", background: FB.bg, zIndex: 10 }}>
      <ShortcutItem
        icon={
          <Avatar size={36} src={user?.avatarUrl}
            icon={!user?.avatarUrl ? <UserOutlined /> : undefined}
            style={{ background: !user?.avatarUrl ? FB.blue : undefined }} />
        }
        label={userName} to="/profile"
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
            />
          ))}
        </div>
      ))}

      {/* Fixed items: Paramètres */}
      <div style={{ height: 1, background: FB.border, margin: "12px 8px" }} />
      <ShortcutItem icon={<SettingOutlined />} label="Paramètres" to="/settings" color={FB.textSecondary} />

      <div style={{ height: 1, background: FB.border, margin: "12px 8px" }} />
      {currentOrganization && (
        <div style={{ padding: "8px 8px", fontSize: 13, color: FB.textSecondary }}>
          <span style={{ fontWeight: 600 }}>{currentOrganization.name}</span><br />
          <span style={{ fontSize: 12 }}>{stats.totalUsers} membres · {stats.totalLeads} leads</span>
        </div>
      )}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     RIGHT SIDEBAR
     ═══════════════════════════════════════════════════════════ */
  const renderRightSidebar = () => (
    <div style={{ position: "fixed", right: 0, top: 56, width: 280, height: "calc(100vh - 56px)", overflowY: "auto", paddingTop: 16, paddingRight: 8, paddingLeft: 8, paddingBottom: 16, scrollbarWidth: "none", background: FB.bg, zIndex: 10 }}>
      {/* À faire aujourd'hui — en premier */}
      <FBCard>
        <span style={{ fontSize: 16, fontWeight: 700, color: FB.text, display: "block", marginBottom: 10 }}>
          À faire aujourd'hui
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
          <ClockCircleOutlined style={{ color: "#fa8c16", fontSize: 16 }} />
          <span style={{ fontSize: 14, color: FB.text }}>
            <b>{stats.pendingTasks}</b> tâche{stats.pendingTasks > 1 ? "s" : ""} en attente
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
          <CalendarOutlined style={{ color: FB.blue, fontSize: 16 }} />
          <span style={{ fontSize: 14, color: FB.text }}>
            <b>{stats.upcomingMeetings}</b> RDV aujourd'hui
          </span>
        </div>
      </FBCard>

      {/* Performance */}
      <FBCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: FB.text }}>Performance</span>
          <AntTooltip title="Actualiser">
            <ReloadOutlined spin={refreshing}
              style={{ fontSize: 16, color: FB.textSecondary, cursor: "pointer" }}
              onClick={handleRefresh} />
          </AntTooltip>
        </div>
        <StatWidget icon={<FunnelPlotOutlined />} label="Total Leads" value={stats.totalLeads} color="#1890ff" sub={"+" + stats.newLeadsToday} />
        <StatWidget icon={<TeamOutlined />} label="Clients Actifs" value={stats.totalClients} color={FB.green} sub={"+" + Math.floor(stats.monthlyGrowth) + "%"} />
        <StatWidget icon={<TrophyOutlined />} label="Conversion" value={stats.conversionRate.toFixed(1) + "%"} color="#fa8c16" />
        <StatWidget icon={<RiseOutlined />} label="Chiffre d'Affaires" value={"€" + stats.totalRevenue.toLocaleString("fr-FR")} color="#722ed1" />
      </FBCard>

      {/* Mini pie chart */}
      {chartData.leadsByStatus.length > 0 && (
        <FBCard>
          <span style={{ fontSize: 16, fontWeight: 700, color: FB.text, display: "block", marginBottom: 8 }}>
            Leads par statut
          </span>
          <div style={{ height: 160, minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie data={chartData.leadsByStatus.filter(d => d.value > 0)}
                  cx="50%" cy="50%" outerRadius={60} innerRadius={35}
                  dataKey="value" paddingAngle={2}>
                  {chartData.leadsByStatus.filter(d => d.value > 0).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {chartData.leadsByStatus.filter(d => d.value > 0).map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: FB.textSecondary }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                <span>{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </FBCard>
      )}

      {/* Top Leads */}
      {topLeads.length > 0 && (
        <FBCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: FB.text }}>Top Leads</span>
            <Link to="/leads/list" style={{ fontSize: 13, color: FB.blue, textDecoration: "none" }}>Voir tous</Link>
          </div>
          {topLeads.map(lead => (
            <Link key={lead.id} to={"/leads/" + lead.id} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 4px",
                borderRadius: 6, cursor: "pointer", transition: "background 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = FB.btnGray)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <Avatar size={32} style={{ background: lead.statusColor || FB.blue }}>
                  {(lead.prenom[0] || lead.nom[0] || "?")}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: FB.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lead.prenom} {lead.nom}
                  </div>
                  <div style={{ fontSize: 11, color: FB.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lead.entreprise || lead.status}
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: lead.score > 80 ? FB.green : lead.score > 60 ? FB.orange : FB.textSecondary }}>
                  {lead.score}%
                </div>
              </div>
            </Link>
          ))}
        </FBCard>
      )}

      {/* Contacts / Amis */}
      <FBCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: FB.text }}>Contacts</span>
        </div>
        <FriendsWidget onStartChat={() => {}} />
      </FBCard>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     MOBILE STATS BAR
     ═══════════════════════════════════════════════════════════ */
  const renderMobileStats = () => (
    <div style={{
      display: "flex", gap: 8, overflowX: "auto", padding: "0 0 4px",
      marginBottom: 12, WebkitOverflowScrolling: "touch", scrollbarWidth: "none",
    }}>
      {[
        { label: "Leads", val: stats.totalLeads, col: "#1890ff" },
        { label: "Clients", val: stats.totalClients, col: FB.green },
        { label: "Conversion", val: stats.conversionRate.toFixed(0) + "%", col: "#fa8c16" },
        { label: "CA", val: "€" + (stats.totalRevenue / 1000).toFixed(0) + "k", col: "#722ed1" },
      ].map((s, i) => (
        <div key={i} style={{
          flex: "0 0 auto", background: FB.white, boxShadow: FB.shadow,
          borderRadius: FB.radius, padding: "10px 16px", textAlign: "center", minWidth: 90,
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: s.col }}>{s.val}</div>
          <div style={{ fontSize: 11, color: FB.textSecondary, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     CENTER FEED
     ═══════════════════════════════════════════════════════════ */
  const renderFeed = () => (
    <div style={{ flex: 1, minWidth: 0, maxWidth: isMobile ? "100%" : 680, margin: "0 auto", paddingTop: isMobile ? 0 : 16 }}>
      {isMobile && renderMobileStats()}

      {/* "Quoi de neuf" — REAL Create Post */}
      <FBCard>
        <input type="file" ref={fileInputRef} multiple style={{ display: 'none' }} onChange={handleFileChange} />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
          <Avatar size={40} src={user?.avatarUrl}
            icon={!user?.avatarUrl ? <UserOutlined /> : undefined}
            style={{ background: !user?.avatarUrl ? FB.blue : undefined, flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            {postMood && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{postMood}</span>
                <span style={{ fontSize: 12, color: FB.textSecondary }}>
                  {moods.find(m => m.emoji === postMood)?.label || 'Humeur'}
                </span>
                <span onClick={() => setPostMood(null)}
                  style={{ fontSize: 12, color: FB.textSecondary, cursor: 'pointer', marginLeft: 4 }}>✕</span>
              </div>
            )}
            <textarea
              value={newPostContent}
              onChange={e => setNewPostContent(e.target.value)}
              placeholder={"Quoi de neuf, " + (user?.firstName || "cher collègue") + " ?"}
              style={{
                width: '100%', background: FB.btnGray, borderRadius: 12, padding: "10px 14px",
                fontSize: 15, color: FB.text, border: "none", outline: "none",
                resize: "none", minHeight: (newPostContent || postMediaPreviews.length > 0) ? 80 : 40,
                transition: "min-height 0.2s", fontFamily: "inherit", boxSizing: 'border-box',
              }}
              onFocus={e => { e.currentTarget.style.minHeight = "80px"; }}
            />
          </div>
        </div>

        {/* Media previews */}
        {postMediaPreviews.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 0 12px', marginLeft: 50 }}>
            {postMediaPreviews.map((m, i) => (
              <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                {m.type === 'video' ? (
                  <video src={m.preview} style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8 }} />
                ) : (
                  <img src={m.preview} alt="" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8 }} />
                )}
                <div onClick={() => removeMediaPreview(i)} style={{
                  position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%',
                  background: '#e74c3c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, cursor: 'pointer', fontWeight: 700, boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }}>✕</div>
              </div>
            ))}
          </div>
        )}

        {/* Visibility selector + Post button */}
        {(newPostContent.trim() || postMediaPreviews.length > 0) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {(["IN", "ALL", "OUT"] as WallVisibility[]).map(v => {
                const vis = visibilityLabel[v];
                const active = newPostVisibility === v;
                return (
                  <div key={v} onClick={() => setNewPostVisibility(v)}
                    style={{
                      display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
                      borderRadius: 16, cursor: "pointer", fontSize: 12, fontWeight: 600,
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
                padding: "6px 20px", background: FB.blue, color: FB.white,
                border: "none", borderRadius: 6, fontWeight: 600, fontSize: 14,
                cursor: postSubmitting ? "not-allowed" : "pointer",
                opacity: postSubmitting ? 0.6 : 1,
              }}>
              {postSubmitting ? "Publication..." : "Publier"}
            </button>
          </div>
        )}

        <div style={{ height: 1, background: FB.border, margin: "0 0 8px" }} />

        {/* Post action bar — Photo/Vidéo/Humeur + Quick Actions */}
        <div style={{ display: "flex", justifyContent: "space-around", position: 'relative' }}>
          <div onClick={() => handleMediaSelect('image/*')}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: "8px 4px", borderRadius: FB.radius, cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = FB.btnGray)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ color: '#27ae60', fontSize: 18 }}>📷</span>
            {!isMobile && <span style={{ fontSize: 13, fontWeight: 600, color: FB.textSecondary }}>Photo</span>}
          </div>

          <div onClick={() => handleMediaSelect('video/*')}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: "8px 4px", borderRadius: FB.radius, cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = FB.btnGray)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ color: '#e74c3c', fontSize: 18 }}>🎥</span>
            {!isMobile && <span style={{ fontSize: 13, fontWeight: 600, color: FB.textSecondary }}>Vidéo</span>}
          </div>

          <div onClick={() => handleMediaSelect('*/*')}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: "8px 4px", borderRadius: FB.radius, cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = FB.btnGray)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ color: '#3498db', fontSize: 18 }}>📎</span>
            {!isMobile && <span style={{ fontSize: 13, fontWeight: 600, color: FB.textSecondary }}>Document</span>}
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            <div onClick={() => setShowMoodPicker(!showMoodPicker)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, padding: "8px 4px", borderRadius: FB.radius, cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = FB.btnGray)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ color: '#f39c12', fontSize: 18 }}>😊</span>
              {!isMobile && <span style={{ fontSize: 13, fontWeight: 600, color: FB.textSecondary }}>Humeur</span>}
            </div>
            {showMoodPicker && (
              <div style={{
                position: 'absolute', bottom: '100%', right: 0, marginBottom: 4,
                background: FB.white, borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                padding: 8, display: 'flex', flexWrap: 'wrap', gap: 4, width: 220, zIndex: 100,
              }}>
                {moods.map(m => (
                  <div key={m.emoji}
                    onClick={() => { setPostMood(m.emoji); setShowMoodPicker(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px',
                      borderRadius: 8, cursor: 'pointer', fontSize: 13,
                      background: postMood === m.emoji ? FB.blue + '15' : 'transparent',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = FB.btnGray; }}
                    onMouseLeave={e => { e.currentTarget.style.background = postMood === m.emoji ? FB.blue + '15' : 'transparent'; }}
                  >
                    <span style={{ fontSize: 18 }}>{m.emoji}</span>
                    <span style={{ color: FB.text }}>{m.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </FBCard>

      {/* Mobile: shortcuts */}
      {isMobile && (
        <div style={{
          display: "flex", gap: 8, overflowX: "auto", marginBottom: 12,
          WebkitOverflowScrolling: "touch", scrollbarWidth: "none",
        }}>
          {sectionsWithModules.flatMap(s => s.modules).map((mod, i) => (
            <Link key={mod.key || mod.id || i} to={getModuleRoute(mod)} style={{ textDecoration: "none" }}>
              <div style={{
                flex: "0 0 auto", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 4, padding: "8px 14px",
                borderRadius: FB.radius, background: FB.white, boxShadow: FB.shadow, minWidth: 70,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", background: getModuleColor(mod),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, color: FB.white,
                }}>
                  {getModuleIcon(mod)}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: FB.text, whiteSpace: "nowrap" }}>{mod.label || mod.name || mod.key}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Feed header with filters */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: FB.text }}>Fil d'actualité</span>
          {wallPosts.length > 0 && (
            <span style={{ fontSize: 12, color: FB.textSecondary, background: FB.btnGray, borderRadius: 12, padding: "2px 8px" }}>
              {wallPosts.length} post{wallPosts.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div onClick={handleRefresh}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
            borderRadius: 20, background: FB.btnGray, cursor: "pointer",
            fontSize: 13, fontWeight: 600, color: FB.textSecondary,
          }}>
          <ReloadOutlined spin={refreshing} />
          {!isMobile && <span>Actualiser</span>}
        </div>
      </div>

      {/* Category filter chips */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { key: "", label: "Tout", icon: "🏠" },
          { key: "projet", label: "Projets", icon: "📋" },
          { key: "chantier_realise", label: "Chantiers", icon: "🔨" },
          { key: "promotion", label: "Promos", icon: "📢" },
          { key: "conseil", label: "Conseils", icon: "💡" },
        ].map(cat => (
          <div key={cat.key} onClick={() => { setFeedFilter(cat.key); setWallPosts([]); setWallCursor(null); }}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "4px 12px",
              borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: feedFilter === cat.key ? FB.blue + "15" : FB.white,
              color: feedFilter === cat.key ? FB.blue : FB.textSecondary,
              border: feedFilter === cat.key ? `1px solid ${FB.blue}` : `1px solid ${FB.border}`,
              boxShadow: FB.shadow,
            }}>
            <span>{cat.icon}</span> <span>{cat.label}</span>
          </div>
        ))}
      </div>

      {/* Wall Posts (real API data) */}
      {wallPosts.length > 0 ? (
        <>
          {wallPosts.map(post => (
            <WallPostCard key={post.id} post={post} isMobile={isMobile}
              currentUserId={user?.id || ""} api={api} onUpdate={() => fetchWallFeed(true)} />
          ))}
          {wallCursor && (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <button onClick={() => fetchWallFeed(false)} disabled={wallLoading}
                style={{
                  padding: "8px 24px", background: FB.white, color: FB.blue,
                  border: `1px solid ${FB.blue}`, borderRadius: 20, fontWeight: 600,
                  fontSize: 14, cursor: wallLoading ? "not-allowed" : "pointer",
                }}>
                {wallLoading ? "Chargement..." : "Voir plus"}
              </button>
            </div>
          )}
        </>
      ) : wallLoading ? (
        <FBCard style={{ textAlign: "center", padding: "40px 16px" }}>
          <Spin size="default" />
          <div style={{ color: FB.textSecondary, fontSize: 14, marginTop: 12 }}>Chargement du fil…</div>
        </FBCard>
      ) : recentActivities.length > 0 ? (
        /* Fallback: legacy activity feed when no wall posts exist yet */
        <>
          <div style={{ fontSize: 12, color: FB.textSecondary, textAlign: "center", marginBottom: 8 }}>
            Activité récente (données CRM)
          </div>
          {recentActivities.slice(0, 10).map(activity => {
            // Convert legacy activity to minimal card display
            const authorName = activity.user || "Système";
            return (
              <FBCard key={activity.id} noPadding>
                <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", gap: 8 }}>
                  <Avatar size={36} style={{ backgroundColor: activityColor(activity.type), flexShrink: 0 }}
                    icon={activityIcon(activity.type)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14, color: FB.text }}>{authorName}</span>{" "}
                      <span style={{ color: FB.textSecondary, fontSize: 14 }}>{activityVerb(activity.type)}</span>
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
            Bienvenue sur le mur !
          </div>
          <div style={{ color: FB.textSecondary, fontSize: 14 }}>
            Publiez votre premier post ou commencez à utiliser le CRM pour voir l'activité ici.
          </div>
        </FBCard>
      )}

      {/* End of feed */}
      {wallPosts.length > 0 && !wallCursor && (
        <div style={{ textAlign: "center", padding: "20px 0 40px", color: FB.textSecondary, fontSize: 14 }}>
          <CheckCircleOutlined style={{ fontSize: 24, marginBottom: 8, display: "block" }} />
          Vous êtes à jour ! Aucune nouvelle activité.
        </div>
      )}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     MAIN RENDER — 3-COLUMN LAYOUT
     ═══════════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: "100vh", background: FB.bg }}>
      {!isMobile && !isTablet && renderLeftSidebar()}
      {!isMobile && !isTablet && renderRightSidebar()}
      <div style={{
        marginLeft: isMobile || isTablet ? 0 : 300,
        marginRight: isMobile || isTablet ? 0 : 300,
        padding: isMobile ? "12px 12px" : "16px 16px",
        display: "flex", justifyContent: "center",
      }}>
        {renderFeed()}
      </div>
      <MessengerChat />
    </div>
  );
}
