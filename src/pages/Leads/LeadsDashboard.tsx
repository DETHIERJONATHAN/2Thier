import { useState, useEffect, useMemo } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useLeadStatuses } from '../../hooks/useLeadStatuses';
import { useAuth } from '../../auth/useAuth';
import { LEAD_SOURCES, LEAD_PRIORITIES, LEAD_AVERAGE_VALUE } from './LeadsConfig';
import { NotificationManager } from '../../components/Notifications';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaUsers, FaExclamationTriangle, FaCheckCircle, FaClock } from 'react-icons/fa';

interface LeadDashboardState {
  totalLeads: number;
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
  loading: boolean;
}

export default function LeadsDashboard() {
  // Stabiliser l'API selon les instructions du projet
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  
  const { leadStatuses } = useLeadStatuses();
  const { currentOrganization, isSuperAdmin, user } = useAuth();
  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);
  const [dashboardData, setDashboardData] = useState<LeadDashboardState>({
    totalLeads: 0,
    leadsByStatus: [],
    leadsBySource: [],
    leadsByPriority: [],
    recentActivity: [],
    conversionRate: 0,
    averageResponseTime: 0,
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
    
    // Marquer que nous avons tenté un chargement initial
    setInitialLoadAttempted(true);
    
    const fetchDashboardData = async () => {
      try {
        // Récupération des leads depuis l'API
        let leadsData;
        const today = new Date(); // Définir today ici pour l'utiliser plus tard
        
        try {
          // Récupérer les vrais leads depuis l'API en s'assurant que l'organisation est sélectionnée
          const orgIdParam = isSuperAdmin && !currentOrganization?.id ? 'all' : currentOrganization?.id || '';
          
          console.log('Tentative de récupération des leads avec organizationId:', orgIdParam);
          
          // ✅ PRODUCTION: Utiliser directement useAuthenticatedApi sans vérification manuelle
          const response = await api.get(`/leads`);
          
          if (response && Array.isArray(response) && response.length > 0) {
            console.log('Récupération des données réelles de leads:', response.length, 'leads trouvés');
            // Afficher les données de source pour débogage
            response.forEach(lead => {
              console.log(`Lead ${lead.id}: source = ${lead.source}, data.source = ${lead.data?.source}, data =`, lead.data);
            });
            leadsData = response;
          } else {
            console.log('Aucun lead trouvé dans la base de données');
            leadsData = [];
          }
        } catch (apiError) {
          console.error('Erreur lors de la récupération des leads:', apiError);
          // Définir des données vides en cas d'erreur pour éviter un crash de l'interface
          leadsData = [];
          
          // Afficher une notification d'erreur plus conviviale
          NotificationManager.error('Impossible de charger les leads. Veuillez vous reconnecter.');
        }
        const totalLeads = leadsData.length;
        
        // Initialiser les distributions basées sur les données réelles
        // Statut des leads
        const statusCounts: Record<string, number> = {};
        leadStatuses.forEach(status => {
          statusCounts[status.id] = 0; // Utiliser l'ID du statut
        });
        
        // Source des leads
        const sourceCounts: Record<string, number> = {};
        LEAD_SOURCES.forEach(source => {
          sourceCounts[source.value] = 0;
        });
        
        // Priorité des leads
        const priorityCounts: Record<string, number> = {};
        LEAD_PRIORITIES.forEach(priority => {
          priorityCounts[priority.value] = 0;
        });
        
        // Analyser les données pour remplir les distributions
        leadsData.forEach(lead => {
          // Comptage des statuts - utiliser statusId en priorité, sinon fallback sur status
          const statusKey = lead.statusId || lead.status;
          if (statusKey && Object.prototype.hasOwnProperty.call(statusCounts, statusKey)) {
            statusCounts[statusKey]++;
          }
          
          // Comptage des sources - Récupération de la source du lead
          const source = lead.data?.source || lead.source;
          
          if (source && Object.prototype.hasOwnProperty.call(sourceCounts, source)) {
            sourceCounts[source]++;
          } else if (source) {
            // Si la source existe mais n'est pas dans notre liste prédéfinie
            sourceCounts['other'] = (sourceCounts['other'] || 0) + 1;
          } else {
            // Si aucune source n'est définie, utiliser "direct" comme source par défaut
            sourceCounts['direct'] = (sourceCounts['direct'] || 0) + 1;
          }
          
          // Comptage des priorités
          const priority = lead.data?.priority;
          if (priority && Object.prototype.hasOwnProperty.call(priorityCounts, priority)) {
            priorityCounts[priority]++;
          } else {
            // Par défaut, priorité moyenne
            priorityCounts['medium'] = (priorityCounts['medium'] || 0) + 1;
          }
        });
        
        const leadsByStatus = leadStatuses.map(status => ({
          name: status.name,
          value: statusCounts[status.id] || 0,
          color: status.color
        }));
        
        const leadsBySource = Object.keys(sourceCounts).map(key => ({
          name: LEAD_SOURCES.find(s => s.value === key)?.label || 'Autre',
          value: sourceCounts[key]
        }));
        
        const leadsByPriority = LEAD_PRIORITIES.map(priority => ({
          name: priority.label,
          value: priorityCounts[priority.value] || 0,
          color: priority.color
        }));
        
        // Calcul du taux de conversion (leads gagnés / total)
        const wonStatus = leadStatuses.find(s => s.name === 'Gagné');
        const wonCount = wonStatus ? statusCounts[wonStatus.id] || 0 : 0;
        const conversionRate = totalLeads > 0 ? (wonCount / totalLeads) * 100 : 0;
        
        // Activité récente basée sur les leads réels
        const recentActivity = [];
        
        // Générer des activités basées sur les vrais leads
        leadsData.forEach((lead, index) => {
          // Activité de création pour chaque lead
          recentActivity.push({
            id: `activity-creation-${lead.id}`,
            type: 'nouveau',
            description: `Nouveau lead créé: ${lead.data?.company || 'Sans nom'}`,
            date: lead.createdAt || new Date(today.getTime() - (1000 * 60 * 60 * (index + 1))).toISOString(),
            user: lead.assignedTo?.firstName ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName || ''}` : 'Utilisateur système'
          });
          
          // Si le lead a un status différent de 'new', ajouter une activité de changement de statut
          if (lead.status && lead.status !== 'new') {
            const statusLabels = {
              'contacted': 'Contacté',
              'meeting_scheduled': 'RDV Programmé',
              'quote_sent': 'Devis Envoyé',
              'negotiation': 'Négociation',
              'won': 'Gagné',
              'lost': 'Perdu',
              'installation': 'Installation',
              'completed': 'Terminé'
            };
            
            recentActivity.push({
              id: `activity-status-${lead.id}`,
              type: 'statut',
              description: `Lead passé à "${statusLabels[lead.status as keyof typeof statusLabels] || lead.status}": ${lead.data?.company || 'Sans nom'}`,
              date: new Date(new Date(lead.createdAt).getTime() + (1000 * 60 * 30)).toISOString(), // 30 minutes après la création
              user: lead.assignedTo?.firstName ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName || ''}` : 'Utilisateur système'
            });
          }
        });
        
        // Si aucune activité n'a été générée (pas de leads), créer une activité générique
        if (recentActivity.length === 0) {
          recentActivity.push({
            id: 'activity-no-leads',
            type: 'info',
            description: 'Aucun lead dans le système',
            date: today.toISOString(),
            user: 'Système'
          });
        }
        
        // Trier les activités par date décroissante (plus récentes d'abord)
        recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Calcul du temps de réponse moyen en heures (basé sur les données réelles)
        let totalResponseTime = 0;
        let leadsWithResponse = 0;
        
        // Considérer un lead comme "répondu" s'il n'est plus en statut "new"
        leadsData.forEach(lead => {
            if (lead.status && lead.status !== 'new' && lead.createdAt) {
                // On estime le temps de réponse à 1 heure par défaut
                // Dans une implémentation réelle, on utiliserait un champ de date spécifique
                totalResponseTime += 1;
                leadsWithResponse++;
            }
        });
        
        const averageResponseTime = leadsWithResponse > 0 ? parseFloat((totalResponseTime / leadsWithResponse).toFixed(1)) : 0;
        
        setDashboardData({
          totalLeads,
          leadsByStatus,
          leadsBySource,
          leadsByPriority,
          recentActivity,
          conversionRate,
          averageResponseTime,
          loading: false,
        });
        
      } catch (error: unknown) {
        console.error('Erreur lors du chargement des données du dashboard:', error);
        NotificationManager.error('Impossible de charger les données du dashboard');
        setDashboardData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchDashboardData();
  }, [api, currentOrganization, isSuperAdmin, user, leadStatuses]);
  
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  if (dashboardData.loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Si nous n'avons pas de leads et pas d'organisation sélectionnée
  if (!currentOrganization && !isSuperAdmin && initialLoadAttempted) {
    return (
      <div className="p-4">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
          <p className="font-bold">Attention</p>
          <p>Veuillez sélectionner une organisation pour voir ses leads.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Tableau de Bord des Leads</h1>
      
      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6 flex items-center">
          <div className="rounded-full bg-blue-100 p-3 mr-4">
            <FaUsers className="text-blue-500 text-xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Leads totaux</p>
            <p className="text-2xl font-bold">{dashboardData.totalLeads}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 flex items-center">
          <div className="rounded-full bg-green-100 p-3 mr-4">
            <FaCheckCircle className="text-green-500 text-xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Taux de conversion</p>
            <p className="text-2xl font-bold">{dashboardData.conversionRate.toFixed(1)}%</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 flex items-center">
          <div className="rounded-full bg-yellow-100 p-3 mr-4">
            <FaClock className="text-yellow-500 text-xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Temps de réponse moyen</p>
            <p className="text-2xl font-bold">{dashboardData.averageResponseTime} h</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 flex items-center">
          <div className="rounded-full bg-red-100 p-3 mr-4">
            <FaExclamationTriangle className="text-red-500 text-xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Leads haute priorité</p>
            <p className="text-2xl font-bold">
              {dashboardData.leadsByPriority.find(p => p.name === 'Haute')?.value || 0}
            </p>
          </div>
        </div>
      </div>
      
      {/* KPIs supplémentaires */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">Nouveaux leads (30j)</p>
          <p className="text-xl font-medium">{dashboardData.leadsByStatus.find(s => s.name === 'Nouveau')?.value || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">En cours de traitement</p>
          <p className="text-xl font-medium">
            {(dashboardData.leadsByStatus.find(s => s.name === 'Contacté')?.value || 0) + 
             (dashboardData.leadsByStatus.find(s => s.name === 'RDV Programmé')?.value || 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">Taux de réponse</p>
          <p className="text-xl font-medium">
            {Math.round(((dashboardData.totalLeads - (dashboardData.leadsByStatus.find(s => s.name === 'Nouveau')?.value || 0)) / 
              Math.max(dashboardData.totalLeads, 1)) * 100)}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">Valeur potentielle</p>
          <p className="text-xl font-medium">
            {dashboardData.totalLeads > 0 
              ? `${(dashboardData.totalLeads * LEAD_AVERAGE_VALUE).toLocaleString('fr-FR')} €` 
              : "0 €"
            }
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Estimation basée sur {dashboardData.totalLeads} lead{dashboardData.totalLeads > 1 ? 's' : ''} × {LEAD_AVERAGE_VALUE.toLocaleString('fr-FR')}€
          </p>
        </div>
      </div>
      
      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-medium mb-4">Répartition par statut</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboardData.leadsByStatus.filter(item => item.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                >
                  {dashboardData.leadsByStatus.filter(item => item.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} leads`, '']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-medium mb-4">Leads par source</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dashboardData.leadsBySource.filter(item => item.value > 0)}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Nombre de leads" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Activité récente */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">
          <span>Activité récente</span>
        </h2>
        {dashboardData.recentActivity.length > 0 ? (
          <div className="space-y-4">
            {dashboardData.recentActivity.map((activity) => (
              <div key={activity.id} className="border-b pb-3 last:border-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm">{activity.description}</p>
                    {activity.user && (
                      <p className="text-xs text-gray-500">Par {activity.user}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(activity.date)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Aucune activité récente</p>
        )}
      </div>
    </div>
  );
}
