import { useState, useEffect, useMemo } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useLeadStatuses } from '../../hooks/useLeadStatuses';
import { useAuth } from '../../auth/useAuth';
import { LEAD_SOURCES, LEAD_PRIORITIES } from './LeadsConfig';
import { NotificationManager } from '../../components/Notifications';
import { getErrorMessage, getErrorResponseDetails } from '../../utils/errorHandling';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FaUsers, FaExclamationTriangle, FaCheckCircle, FaClock } from 'react-icons/fa';

interface LeadDashboardState {
  totalLeads: number;
  newLeads: number;
  leadsByStatus: { name: string; value: number; color: string }[];
  leadsBySource: { name: string; value: number }[];
  leadsByPriority: { name: string; value: number; color: string }[];
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    date: string;
    user?: string;
  }>;
  conversionRate: number;
  averageResponseTime: number;
  leadsEvolution: { name: string; value: number }[];
  loading: boolean;
}

export default function LeadsDashboard() {
  // Stabiliser l'API selon les instructions du projet
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  
  const { leadStatuses } = useLeadStatuses();
  const { currentOrganization, isSuperAdmin, user } = useAuth();
  const [dashboardData, setDashboardData] = useState<LeadDashboardState>({
    totalLeads: 0,
    newLeads: 0,
    leadsByStatus: [],
    leadsBySource: [],
    leadsByPriority: [],
    recentActivity: [],
    conversionRate: 0,
    averageResponseTime: 0,
    leadsEvolution: [],
    loading: true,
  });
  
  useEffect(() => {
    // ✅ PRODUCTION: Utiliser le hook useAuth au lieu de isAuthenticated()
    if (!user) {
      console.log('Utilisateur non authentifié, abandon de la récupération des leads');
      NotificationManager.warning("Authentification requise pour accéder aux données");
      return;
    }
    
    // Ne pas exécuter l'effet si l'organisation n'est pas définie et que l'utilisateur n'est pas super admin
    if (!currentOrganization && !isSuperAdmin) {
      console.log('Aucune organisation sélectionnée, abandon de la récupération des leads');
      return;
    }
    
    const fetchDashboardData = async () => {
      try {
        // 🔗 PRISMA INTEGRATION: Récupération des leads avec leurs relations
        const response = await api.get('/leads?include=LeadStatus,assignedTo,TimelineEvent');
        const leadsData = Array.isArray(response) ? response : (response?.data || []);
        
        console.log('📊 Leads récupérés avec relations Prisma:', leadsData.length, 'leads trouvés');
        
        // 📊 Calculs basés sur les vraies données Prisma
        const totalLeads = leadsData.length;
        
        // Nouveaux leads basés sur les statuts Prisma
        const newLeads = leadsData.filter(lead => {
          const statusName = lead.LeadStatus?.name?.toLowerCase();
          return statusName?.includes('nouveau') || statusName?.includes('new');
        }).length;
        
        // 🔄 Répartition par statuts Prisma
        const statusCounts: Record<string, number> = {};
        leadStatuses.forEach(status => {
          statusCounts[status.id] = 0;
        });
        
        leadsData.forEach(lead => {
          const statusId = lead.statusId;
          if (statusCounts[statusId] !== undefined) {
            statusCounts[statusId]++;
          }
        });
        
        const leadsByStatus = leadStatuses.map(status => ({
          name: status.name,
          value: statusCounts[status.id] || 0,
          color: status.color
        }));
        
        // 📊 Sources et priorités avec données réelles
        const sourceCounts: Record<string, number> = {};
        LEAD_SOURCES.forEach(source => {
          sourceCounts[source.value] = 0;
        });
        
        const priorityCounts: Record<string, number> = {};
        LEAD_PRIORITIES.forEach(priority => {
          priorityCounts[priority.value] = 0;
        });
        
        leadsData.forEach(lead => {
          // Sources
          const source = lead.source || lead.data?.source || 'direct';
          if (sourceCounts[source] !== undefined) {
            sourceCounts[source]++;
          } else {
            sourceCounts['other'] = (sourceCounts['other'] || 0) + 1;
          }
          
          // Priorités
          const priority = lead.priority || lead.data?.priority || 'medium';
          if (priorityCounts[priority] !== undefined) {
            priorityCounts[priority]++;
          } else {
            priorityCounts['medium']++;
          }
        });
        
        const leadsBySource = LEAD_SOURCES.map(source => ({
          name: source.label,
          value: sourceCounts[source.value] || 0
        }));
        
        const leadsByPriority = LEAD_PRIORITIES.map(priority => ({
          name: priority.label,
          value: priorityCounts[priority.value] || 0,
          color: priority.color
        }));
        
        // 📈 Calcul du taux de conversion basé sur les statuts Prisma
        const convertedLeads = leadsData.filter(lead => {
          const statusName = lead.LeadStatus?.name?.toLowerCase();
          return statusName?.includes('gagné') || statusName?.includes('converti') || statusName?.includes('client');
        });
        const conversionRate = totalLeads > 0 ? (convertedLeads.length / totalLeads) * 100 : 0;
        
        // 🕒 Activité récente basée sur les TimelineEvent de Prisma
        const recentActivity: Array<{
          id: string;
          type: string;
          description: string;
          date: string;
          user?: string;
        }> = [];
        
        leadsData.forEach(lead => {
          // Activité de création
          recentActivity.push({
            id: `creation-${lead.id}`,
            type: 'creation',
            description: `Nouveau lead : ${lead.firstName || ''} ${lead.lastName || ''} ${lead.company ? `(${lead.company})` : ''}`.trim(),
            date: lead.createdAt,
            user: lead.assignedTo ? `${lead.assignedTo.firstName || ''} ${lead.assignedTo.lastName || ''}`.trim() : 'Système'
          });
          
          // Activités des TimelineEvent si disponibles
          if (lead.TimelineEvent && Array.isArray(lead.TimelineEvent)) {
            lead.TimelineEvent.forEach(event => {
              recentActivity.push({
                id: event.id,
                type: event.eventType,
                description: event.data?.description || `Événement ${event.eventType}`,
                date: event.createdAt,
                user: 'Utilisateur'
              });
            });
          }
        });
        
        // Trier par date décroissante et limiter à 10
        recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // ⏱️ Temps de réponse moyen basé sur les vraies données
        let totalResponseTime = 0;
        let leadsWithResponse = 0;
        
        leadsData.forEach(lead => {
          if (lead.lastContactDate && lead.createdAt) {
            const responseTime = new Date(lead.lastContactDate).getTime() - new Date(lead.createdAt).getTime();
            totalResponseTime += responseTime / (1000 * 60 * 60); // Heures
            leadsWithResponse++;
          }
        });
        
        const averageResponseTime = leadsWithResponse > 0 ? totalResponseTime / leadsWithResponse : 0;
        
        // 📊 Évolution des leads sur les derniers mois
        const monthCounts: Record<string, number> = {};
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        
        leadsData.forEach(lead => {
          const createdDate = new Date(lead.createdAt);
          const monthKey = `${months[createdDate.getMonth()]} ${createdDate.getFullYear()}`;
          monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
        });
        
        const leadsEvolution = Object.entries(monthCounts)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6) // 6 derniers mois
          .map(([name, value]) => ({ name, value }));
        
        // 🎯 Mise à jour de l'état avec les données calculées depuis Prisma
        setDashboardData({
          totalLeads,
          newLeads,
          conversionRate,
          averageResponseTime,
          leadsByStatus,
          leadsBySource,
          leadsByPriority,
          recentActivity: recentActivity.slice(0, 10),
          leadsEvolution,
          loading: false
        });
        
        console.log('✅ Dashboard mis à jour avec les données Prisma');
        
      } catch (error) {
        const errorMessage = getErrorMessage(error, 'Impossible de charger les données du dashboard. Veuillez réessayer.');
        const errorDetails = getErrorResponseDetails(error);
        console.error('❌ Erreur lors du chargement des données du dashboard:', {
          error,
          status: errorDetails.status,
          data: errorDetails.data,
        });
        // Fallback avec des données vides en cas d'erreur
        setDashboardData(prev => ({
          ...prev,
          totalLeads: 0,
          newLeads: 0,
          conversionRate: 0,
          averageResponseTime: 0,
          leadsByStatus: [],
          leadsBySource: [],
          leadsByPriority: [],
          recentActivity: [],
          leadsEvolution: [],
          loading: false
        }));
        
        NotificationManager.error(errorMessage);
      }
    };
    
    fetchDashboardData();
  }, [api, user, currentOrganization, isSuperAdmin, leadStatuses]);

  const { loading } = dashboardData;

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement des données du dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* 🎯 En-tête avec Ant Design */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard des Leads</h1>
          <p className="text-gray-600">
            Vue d'ensemble des performances commerciales avec données en temps réel depuis Prisma
          </p>
        </div>

        {/* 📊 Statistiques principales avec cartes modernes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total des leads */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total des leads</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.totalLeads}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <FaUsers className="text-blue-600 text-xl" />
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Depuis la base Prisma
            </div>
          </div>

          {/* Nouveaux leads */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Nouveaux leads</p>
                <p className="text-2xl font-bold text-green-600">{dashboardData.newLeads}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <FaExclamationTriangle className="text-green-600 text-xl" />
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Basé sur les statuts Prisma
            </div>
          </div>

          {/* Taux de conversion */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Taux de conversion</p>
                <p className="text-2xl font-bold text-orange-600">{dashboardData.conversionRate.toFixed(1)}%</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <FaCheckCircle className="text-orange-600 text-xl" />
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Calculé depuis Prisma
            </div>
          </div>

          {/* Temps de réponse moyen */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Temps de réponse</p>
                <p className="text-2xl font-bold text-purple-600">{dashboardData.averageResponseTime.toFixed(1)}h</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <FaClock className="text-purple-600 text-xl" />
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Moyenne calculée
            </div>
          </div>
        </div>

        {/* 📈 Graphiques et tableaux */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Leads par statut */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par statut (Prisma)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.leadsByStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {dashboardData.leadsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Evolution des leads */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution sur 6 mois</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.leadsEvolution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 🕒 Activité récente */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activité récente (TimelineEvents)</h3>
          <div className="space-y-4">
            {dashboardData.recentActivity.slice(0, 5).map(activity => (
              <div key={activity.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                </div>
                <div className="flex-grow">
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.date).toLocaleDateString('fr-FR')} • {activity.user}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
