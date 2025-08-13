import React, { useEffect, useState } from "react";
import { useAuthenticatedApi } from "../hooks/useAuthenticatedApi";
import { useAuth } from "../auth/useAuth";
import { Link } from "react-router-dom";
import {
  FaUsers,
  FaChartLine,
  FaClipboardList,
  FaBuilding,
  FaCalendarAlt,
  FaComments,
  FaCog,
  FaUsersCog,
  FaPlus,
} from "react-icons/fa";

// ... (interface DashboardStats reste la même)

interface DashboardStats {
  totalLeads: number;
  leadsThisMonth: number;
  conversionRate: number;
  totalUsers: number;
  pendingTasks: number;
  upcomingMeetings: number;
  organizations: number;
  modulesActive: number;
}

// Nouveau composant pour les utilisateurs sans organisation
const CreateOrganizationPrompt = () => {
  const { post } = useAuthenticatedApi();
  const { refetchUser } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError("Le nom de l'organisation est requis.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await post('/organizations', { name });
      // Le refetch va mettre à jour le contexte et faire disparaître ce composant
      await refetchUser(); 
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
      setLoading(false);
    }
    // Pas de setLoading(false) en cas de succès car le composant va être démonté
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8 rounded-lg">
      <h2 className="text-2xl font-bold mb-2">Bienvenue dans votre nouvel espace !</h2>
      <p className="text-gray-600 mb-6 text-center">
        Pour commencer, créez votre propre organisation. <br/>
        Vous en deviendrez automatiquement l'administrateur.
      </p>
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de votre organisation"
          className="w-full px-4 py-2 border rounded-md mb-4"
          disabled={loading}
        />
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button 
          type="submit" 
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center"
          disabled={loading}
        >
          <FaPlus className="mr-2" />
          {loading ? "Création en cours..." : "Créer mon organisation"}
        </button>
      </form>
    </div>
  );
};


export default function DashboardPage() {
  const { api } = useAuthenticatedApi();
  const { user, currentOrganization, isSuperAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    leadsThisMonth: 0,
    conversionRate: 0,
    totalUsers: 0,
    pendingTasks: 0,
    upcomingMeetings: 0,
    organizations: 0,
    modulesActive: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrganization && !isSuperAdmin) {
      setLoading(false);
      return;
    }

    const loadDashboardStats = async () => {
      setLoading(true);
      try {
        // Simulation d'un appel API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setStats({
          totalLeads: 2,
          leadsThisMonth: 2,
          conversionRate: 0,
          totalUsers: 2,
          pendingTasks: 1,
          upcomingMeetings: 0,
          organizations: isSuperAdmin ? 1 : 1,
          modulesActive: 3,
        });
      } catch (error) {
        console.error("Erreur lors du chargement des statistiques:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardStats();
  }, [api, currentOrganization, isSuperAdmin]);
  
  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Affiche le prompteur de création si l'utilisateur n'a pas d'organisation
  if (!currentOrganization && !isSuperAdmin) {
    return <CreateOrganizationPrompt />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {getWelcomeMessage()}, {user?.firstName || "Utilisateur"}
        </h1>
        <p className="text-gray-600 mt-2">
          {isSuperAdmin 
            ? "Voici une vue d'ensemble de toutes les organisations." 
            : `Voici une vue d'ensemble pour ${currentOrganization?.name || "votre organisation"}.`}
        </p>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <FaChartLine className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Leads totaux</p>
              <p className="text-2xl font-bold">{stats.totalLeads}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Ce mois-ci</span>
              <span className="text-sm font-medium">+{stats.leadsThisMonth}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${(stats.leadsThisMonth / stats.totalLeads) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <FaUsers className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Utilisateurs</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Taux de conversion</span>
              <span className="text-sm font-medium">{stats.conversionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${stats.conversionRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 mr-4">
              <FaClipboardList className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tâches en attente</p>
              <p className="text-2xl font-bold">{stats.pendingTasks}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Réunions à venir</span>
              <span className="text-sm font-medium">{stats.upcomingMeetings}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-yellow-500 h-2 rounded-full"
                style={{ width: `${(stats.upcomingMeetings / 10) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 mr-4">
              <FaBuilding className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Organisations</p>
              <p className="text-2xl font-bold">{stats.organizations}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Modules actifs</span>
              <span className="text-sm font-medium">{stats.modulesActive}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: `${(stats.modulesActive / 10) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Accès rapides */}
      <h2 className="text-xl font-semibold mb-4">Accès rapides</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <Link to="/leads/dashboard" className="bg-white rounded-lg shadow p-4 flex items-center hover:bg-blue-50 transition-colors">
          <div className="p-3 rounded-full bg-blue-100 mr-4">
            <FaUsers className="text-blue-600" />
          </div>
          <span>Tableau de bord des leads</span>
        </Link>
        
        <Link to="/leads/list" className="bg-white rounded-lg shadow p-4 flex items-center hover:bg-blue-50 transition-colors">
          <div className="p-3 rounded-full bg-green-100 mr-4">
            <FaClipboardList className="text-green-600" />
          </div>
          <span>Liste des leads</span>
        </Link>
        
        <Link to="/calendar" className="bg-white rounded-lg shadow p-4 flex items-center hover:bg-blue-50 transition-colors">
          <div className="p-3 rounded-full bg-yellow-100 mr-4">
            <FaCalendarAlt className="text-yellow-600" />
          </div>
          <span>Calendrier</span>
        </Link>
        
        <Link to="/chat" className="bg-white rounded-lg shadow p-4 flex items-center hover:bg-blue-50 transition-colors">
          <div className="p-3 rounded-full bg-red-100 mr-4">
            <FaComments className="text-red-600" />
          </div>
          <span>Messages</span>
        </Link>
        
        <Link to="/settings" className="bg-white rounded-lg shadow p-4 flex items-center hover:bg-blue-50 transition-colors">
          <div className="p-3 rounded-full bg-purple-100 mr-4">
            <FaCog className="text-purple-600" />
          </div>
          <span>Paramètres</span>
        </Link>
        
        {isSuperAdmin && (
          <Link to="/admin" className="bg-white rounded-lg shadow p-4 flex items-center hover:bg-blue-50 transition-colors">
            <div className="p-3 rounded-full bg-indigo-100 mr-4">
              <FaUsersCog className="text-indigo-600" />
            </div>
            <span>Administration</span>
          </Link>
        )}
      </div>

      {/* Activité récente et tâches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Activité récente</h2>
          <div className="space-y-4">
            <div className="border-b pb-3">
              <p className="font-medium">Commentaire ajouté sur lead: ACME Inc.</p>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Thomas Dubois</span>
                <span>15/07 14:35</span>
              </div>
            </div>
            <div className="border-b pb-3">
              <p className="font-medium">Nouveau lead créé: ACME Inc.</p>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Thomas Dubois</span>
                <span>15/07 14:30</span>
              </div>
            </div>
            <div className="border-b pb-3">
              <p className="font-medium">Lead passé à "Contacté": TechnoSolutions</p>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Sophie Martin</span>
                <span>15/07 12:00</span>
              </div>
            </div>
            <div className="border-b pb-3">
              <p className="font-medium">Nouveau lead créé: TechnoSolutions</p>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Sophie Martin</span>
                <span>15/07 11:00</span>
              </div>
            </div>
          </div>
          <Link to="/activities" className="text-blue-500 hover:underline text-sm mt-4 inline-block">
            Voir toutes les activités
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Tâches à faire</h2>
          <div className="space-y-3">
            <div className="flex items-start">
              <input type="checkbox" className="mt-1 mr-3" />
              <div>
                <p className="font-medium">Contacter le lead ACME Inc.</p>
                <p className="text-sm text-gray-500">Échéance: 16/07</p>
              </div>
            </div>
            <div className="flex items-start">
              <input type="checkbox" className="mt-1 mr-3" />
              <div>
                <p className="font-medium">Programmer RDV avec TechnoSolutions</p>
                <p className="text-sm text-gray-500">Échéance: 17/07</p>
              </div>
            </div>
            <div className="flex items-start">
              <input type="checkbox" className="mt-1 mr-3" />
              <div>
                <p className="font-medium">Configuration initiale du CRM</p>
                <p className="text-sm text-gray-500">En cours</p>
              </div>
            </div>
            <div className="flex items-start opacity-50">
              <input type="checkbox" className="mt-1 mr-3" checked disabled />
              <div>
                <p className="font-medium">Créer les premiers leads de test</p>
                <p className="text-sm text-gray-500">Terminé</p>
              </div>
            </div>
            <div className="flex items-start opacity-50">
              <input type="checkbox" className="mt-1 mr-3" checked disabled />
              <div>
                <p className="font-medium">Configurer les profils utilisateurs</p>
                <p className="text-sm text-gray-500">Terminé</p>
              </div>
            </div>
          </div>
          <Link to="/tasks" className="text-blue-500 hover:underline text-sm mt-4 inline-block">
            Voir toutes les tâches
          </Link>
        </div>
      </div>
    </div>
  );
}
