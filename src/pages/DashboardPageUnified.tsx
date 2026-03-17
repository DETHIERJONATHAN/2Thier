import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuthenticatedApi } from "../hooks/useAuthenticatedApi";
import { useAuth } from "../auth/useAuth";
import { useLeadStatuses } from "../hooks/useLeadStatuses";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, Spin, Tooltip as AntTooltip } from "antd";
import {
  UserOutlined,
  TeamOutlined,
  PhoneOutlined,
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
  SmileOutlined,
  MoreOutlined,
  GlobalOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { LEAD_SOURCES, LEAD_PRIORITIES } from "./Leads/LeadsConfig";
import { NotificationManager } from "../components/Notifications";

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
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "8px 8px", borderRadius: FB.radius,
          background: hovered ? FB.btnGray : "transparent",
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
          fontSize: 15, fontWeight: 500, color: FB.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {label}
        </span>
      </div>
    </Link>
  );
};

/* ═══════════════════════════════════════════════════════════════
   ACTIVITY POST (Facebook-style post card)
   ═══════════════════════════════════════════════════════════════ */
const ActivityPost: React.FC<{ activity: RecentActivity; isMobile: boolean }> = ({ activity, isMobile }) => {
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);

  return (
    <FBCard noPadding>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px 0", gap: 8 }}>
        <Avatar size={40} style={{ backgroundColor: activityColor(activity.type), flexShrink: 0 }}
          icon={activityIcon(activity.type)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: 14, color: FB.text }}>{activity.user || "Système"}</span>{" "}
            <span style={{ color: FB.textSecondary, fontSize: 14 }}>{activityVerb(activity.type)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: FB.textSecondary }}>
            <span>{timeAgo(activity.timestamp)}</span>
            <span>·</span>
            <GlobalOutlined style={{ fontSize: 11 }} />
          </div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex",
          alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          <MoreOutlined style={{ fontSize: 20, color: FB.textSecondary }} />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{ fontSize: 15, color: FB.text, lineHeight: 1.5 }}>{activity.description}</div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8,
          padding: "4px 10px", borderRadius: 16,
          background: activityColor(activity.type) + "15",
          color: activityColor(activity.type), fontSize: 12, fontWeight: 600,
        }}>
          {activityIcon(activity.type)}
          <span style={{ textTransform: "capitalize" }}>{activity.title}</span>
        </div>
      </div>

      {/* Reaction counts */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 16px 8px", color: FB.textSecondary, fontSize: 13,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{
            width: 18, height: 18, borderRadius: "50%", background: FB.blue,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid " + FB.white,
          }}>
            <LikeFilled style={{ fontSize: 10, color: FB.white }} />
          </span>
          <span>{liked ? 1 : 0}</span>
        </div>
        <span>0 commentaire</span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: FB.border, margin: "0 16px" }} />

      {/* Action buttons */}
      <div style={{ display: "flex", padding: "4px 16px" }}>
        {[
          { icon: liked ? <LikeFilled style={{ color: FB.blue }} /> : <LikeOutlined />,
            label: "J\u0027aime", active: liked, onClick: () => setLiked(!liked) },
          { icon: <MessageOutlined />, label: "Commenter", active: false,
            onClick: () => setShowComments(!showComments) },
          { icon: <ShareAltOutlined />, label: "Partager", active: false, onClick: () => {} },
        ].map((btn, i) => (
          <div key={i} onClick={btn.onClick}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: "8px 0", borderRadius: FB.radius, cursor: "pointer",
              color: btn.active ? FB.blue : FB.textSecondary,
              fontWeight: 600, fontSize: isMobile ? 13 : 14, transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = FB.btnGray)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {btn.icon}
            {!isMobile && <span>{btn.label}</span>}
          </div>
        ))}
      </div>

      {/* Comment box */}
      {showComments && (
        <div style={{ padding: "8px 16px 12px", display: "flex", gap: 8, alignItems: "center" }}>
          <Avatar size={32} icon={<UserOutlined />} />
          <div style={{
            flex: 1, display: "flex", alignItems: "center",
            background: FB.btnGray, borderRadius: 20, padding: "6px 12px",
          }}>
            <span style={{ flex: 1, color: FB.textSecondary, fontSize: 14 }}>
              Écrire un commentaire…
            </span>
            <SmileOutlined style={{ color: FB.textSecondary, fontSize: 16, cursor: "pointer" }} />
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
  const { currentOrganization, isSuperAdmin, user } = useAuth();
  const { leadStatuses } = useLeadStatuses();
  const navigate = useNavigate();
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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    NotificationManager.success("Données actualisées !");
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!user) return;
    if (!currentOrganization && !isSuperAdmin) return;
    fetchDashboardData();
  }, [user, currentOrganization, isSuperAdmin, fetchDashboardData]);

  if (!currentOrganization && !isSuperAdmin) return <CreateOrganizationPrompt />;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: FB.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  /* ─── SIDEBAR DATA ─────────────────────────────────────────── */
  const shortcuts = [
    { icon: <FunnelPlotOutlined />, label: "Leads", to: "/leads", color: "#ff7a45" },
    { icon: <TeamOutlined />, label: "Clients", to: "/clients", color: "#52c41a" },
    { icon: <CalendarOutlined />, label: "Agenda", to: "/agenda", color: "#1890ff" },
    { icon: <MailOutlined />, label: "Emails", to: "/google-gmail", color: "#f5222d" },
    { icon: <FileTextOutlined />, label: "Factures", to: "/facture", color: "#722ed1" },
    { icon: <ToolOutlined />, label: "Chantiers", to: "/chantiers", color: "#fa8c16" },
    { icon: <BarChartOutlined />, label: "Analytics", to: "/analytics", color: "#13c2c2" },
    { icon: <SettingOutlined />, label: "Paramètres", to: "/settings", color: FB.textSecondary },
  ];

  const quickActions = [
    { icon: <FunnelPlotOutlined />, label: "Nouveau Lead", to: "/leads/kanban", color: "#ff7a45" },
    { icon: <UserOutlined />, label: "Nouveau Client", to: "/clients", color: FB.green },
    { icon: <CalendarOutlined />, label: "Planifier RDV", to: "/agenda", color: FB.orange },
    { icon: <MailOutlined />, label: "Envoyer Email", to: "/google-gmail", color: FB.red },
  ];

  const userName = user ? ((user.firstName || "") + " " + (user.lastName || "")).trim() || "Utilisateur" : "Utilisateur";

  /* ═══════════════════════════════════════════════════════════
     LEFT SIDEBAR
     ═══════════════════════════════════════════════════════════ */
  const renderLeftSidebar = () => (
    <div style={{ width: 280, flexShrink: 0, position: "sticky", top: 16, alignSelf: "flex-start", paddingRight: 8 }}>
      <ShortcutItem
        icon={
          <Avatar size={36} src={user?.avatarUrl}
            icon={!user?.avatarUrl ? <UserOutlined /> : undefined}
            style={{ background: !user?.avatarUrl ? FB.blue : undefined }} />
        }
        label={userName} to="/profile"
      />
      <div style={{ marginTop: 4 }}>
        {shortcuts.map((s, i) => <ShortcutItem key={i} {...s} />)}
      </div>
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
    <div style={{ width: 280, flexShrink: 0, position: "sticky", top: 16, alignSelf: "flex-start", paddingLeft: 8 }}>
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
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
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

      {/* Tasks */}
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
    <div style={{ flex: 1, minWidth: 0, maxWidth: isMobile ? "100%" : 680 }}>
      {isMobile && renderMobileStats()}

      {/* "Create Post" — Quick Actions */}
      <FBCard>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Avatar size={40} src={user?.avatarUrl}
            icon={!user?.avatarUrl ? <UserOutlined /> : undefined}
            style={{ background: !user?.avatarUrl ? FB.blue : undefined, flexShrink: 0, cursor: "pointer" }}
            onClick={() => navigate("/profile")} />
          <div onClick={() => navigate("/leads/kanban")}
            style={{
              flex: 1, background: FB.btnGray, borderRadius: 20, padding: "10px 16px",
              fontSize: 15, color: FB.textSecondary, cursor: "pointer", transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = FB.btnGrayHover)}
            onMouseLeave={e => (e.currentTarget.style.background = FB.btnGray)}
          >
            {"Quoi de neuf, " + (user?.firstName || "cher collègue") + " ?"}
          </div>
        </div>
        <div style={{ height: 1, background: FB.border, margin: "0 0 8px" }} />
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          {quickActions.map((qa, i) => (
            <Link key={i} to={qa.to} style={{ textDecoration: "none", flex: 1 }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, padding: "8px 4px", borderRadius: FB.radius,
                cursor: "pointer", transition: "background 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = FB.btnGray)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ color: qa.color, fontSize: 18 }}>{qa.icon}</span>
                {!isMobile && <span style={{ fontSize: 13, fontWeight: 600, color: FB.textSecondary }}>{qa.label}</span>}
              </div>
            </Link>
          ))}
        </div>
      </FBCard>

      {/* Mobile: shortcuts */}
      {isMobile && (
        <div style={{
          display: "flex", gap: 8, overflowX: "auto", marginBottom: 12,
          WebkitOverflowScrolling: "touch", scrollbarWidth: "none",
        }}>
          {shortcuts.slice(0, 6).map((s, i) => (
            <Link key={i} to={s.to} style={{ textDecoration: "none" }}>
              <div style={{
                flex: "0 0 auto", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 4, padding: "8px 14px",
                borderRadius: FB.radius, background: FB.white, boxShadow: FB.shadow, minWidth: 70,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", background: s.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, color: FB.white,
                }}>
                  {s.icon}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: FB.text, whiteSpace: "nowrap" }}>{s.label}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Feed header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0 12px" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: FB.text }}>Fil d'actualité</span>
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

      {/* Activity Posts */}
      {recentActivities.length === 0 ? (
        <FBCard style={{ textAlign: "center", padding: "40px 16px" }}>
          <BulbOutlined style={{ fontSize: 48, color: FB.border, marginBottom: 16 }} />
          <div style={{ fontSize: 17, fontWeight: 600, color: FB.text, marginBottom: 8 }}>
            Aucune activité récente
          </div>
          <div style={{ color: FB.textSecondary, fontSize: 14 }}>
            Commencez par ajouter des leads pour voir l'activité ici.
          </div>
          <Link to="/leads/kanban">
            <button style={{
              marginTop: 16, padding: "8px 20px", background: FB.blue, color: FB.white,
              border: "none", borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}>
              <PlusOutlined /> Ajouter un Lead
            </button>
          </Link>
        </FBCard>
      ) : (
        recentActivities.map(activity => (
          <ActivityPost key={activity.id} activity={activity} isMobile={isMobile} />
        ))
      )}

      {/* End of feed */}
      {recentActivities.length > 0 && (
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
      <div style={{
        maxWidth: isMobile ? '100%' : '96%', margin: "0 auto",
        padding: isMobile ? "12px 12px" : "20px 24px",
        display: "flex", gap: 16, justifyContent: "center",
      }}>
        {!isMobile && !isTablet && renderLeftSidebar()}
        {renderFeed()}
        {!isMobile && !isTablet && renderRightSidebar()}
      </div>
    </div>
  );
}
