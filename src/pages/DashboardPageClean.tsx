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

// Composant épuré pour les utilisateurs sans organisation
const CreateOrganizationPrompt = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaBuilding className="text-2xl text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Bienvenue dans 2THIER CRM
          </h2>
          <p className="text-gray-600">
            Pour commencer, vous devez créer ou rejoindre une organisation.
          </p>
        </div>
        
        <div className="space-y-3">
          <Link
            to="/organization/create"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <FaPlus className="mr-2" />
            Créer une organisation
          </Link>
          <Link
            to="/organization/join"
            className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Rejoindre une organisation
          </Link>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Besoin d'aide ? Contactez le support technique.
          </p>
        </div>
      </div>
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

    const fetchStats = async () => {
      try {
        // Simulation de données de statistiques
        const mockStats: DashboardStats = {
          totalLeads: 142,
          leadsThisMonth: 28,
          conversionRate: 73.5,
          totalUsers: 12,
          pendingTasks: 5,
          upcomingMeetings: 3,
          organizations: isSuperAdmin ? 3 : 1,
          modulesActive: 8,
        };
        setStats(mockStats);
      } catch (error) {
        console.error("Erreur lors du chargement des statistiques:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [api, currentOrganization, isSuperAdmin]);

  // Si pas d'organisation et pas super admin, afficher l'invite de création
  if (!currentOrganization && !isSuperAdmin) {
    return <CreateOrganizationPrompt />;
  }

  // État de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      
      {/* Header épuré */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Tableau de bord
              </h1>
              <p className="text-gray-600">
                Bienvenue {user?.prenom} {user?.nom} - {currentOrganization?.nom || "Super Admin"}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                <FaChartLine className="text-xl text-blue-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Total Leads */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mr-4">
              <FaUsers className="text-xl text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalLeads}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center text-sm">
              <span className="text-green-600 font-medium">+{stats.leadsThisMonth}</span>
              <span className="text-gray-500 ml-2">ce mois</span>
            </div>
          </div>
        </div>

        {/* Taux de conversion */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mr-4">
              <FaChartLine className="text-xl text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion</p>
              <p className="text-2xl font-bold text-gray-900">{stats.conversionRate}%</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.conversionRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Utilisateurs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mr-4">
              <FaUsersCog className="text-xl text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Utilisateurs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center text-sm text-gray-500">
              <span>Actifs dans l'organisation</span>
            </div>
          </div>
        </div>

        {/* Tâches */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mr-4">
              <FaClipboardList className="text-xl text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Tâches</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingTasks}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center text-sm text-orange-600">
              <span>En attente</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Actions principales */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mr-3">
              <FaPlus className="text-sm text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Actions Rapides</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Link 
              to="/leads/create" 
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 py-4 px-4 rounded-lg border border-blue-200 transition-colors text-center"
            >
              <FaUsers className="mx-auto mb-2 text-xl" />
              <div className="font-medium">Nouveau Lead</div>
            </Link>
            
            <Link 
              to="/clients/create" 
              className="bg-green-50 hover:bg-green-100 text-green-700 py-4 px-4 rounded-lg border border-green-200 transition-colors text-center"
            >
              <FaBuilding className="mx-auto mb-2 text-xl" />
              <div className="font-medium">Nouveau Client</div>
            </Link>
            
            <Link 
              to="/calendar" 
              className="bg-orange-50 hover:bg-orange-100 text-orange-700 py-4 px-4 rounded-lg border border-orange-200 transition-colors text-center"
            >
              <FaCalendarAlt className="mx-auto mb-2 text-xl" />
              <div className="font-medium">Planning</div>
            </Link>
            
            <Link 
              to="/reports" 
              className="bg-purple-50 hover:bg-purple-100 text-purple-700 py-4 px-4 rounded-lg border border-purple-200 transition-colors text-center"
            >
              <FaChartLine className="mx-auto mb-2 text-xl" />
              <div className="font-medium">Rapports</div>
            </Link>
          </div>
        </div>

        {/* Activités récentes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center mr-3">
              <FaComments className="text-sm text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Activités Récentes</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Nouveau lead créé</p>
                <p className="text-xs text-gray-500">Il y a 2 heures</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Rendez-vous confirmé</p>
                <p className="text-xs text-gray-500">Il y a 4 heures</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Email envoyé</p>
                <p className="text-xs text-gray-500">Hier</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section administration (Super Admin uniquement) */}
      {isSuperAdmin && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center mr-3">
              <FaCog className="text-sm text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Administration</h3>
            <span className="ml-3 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
              Super Admin
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link 
              to="/admin/organizations" 
              className="bg-red-50 hover:bg-red-100 text-red-700 py-4 px-4 rounded-lg border border-red-200 transition-colors text-center"
            >
              <FaBuilding className="mx-auto mb-2 text-xl" />
              <div className="font-medium">Organisations</div>
            </Link>
            
            <Link 
              to="/admin/users" 
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-4 px-4 rounded-lg border border-indigo-200 transition-colors text-center"
            >
              <FaUsersCog className="mx-auto mb-2 text-xl" />
              <div className="font-medium">Utilisateurs</div>
            </Link>
            
            <Link 
              to="/admin/modules" 
              className="bg-cyan-50 hover:bg-cyan-100 text-cyan-700 py-4 px-4 rounded-lg border border-cyan-200 transition-colors text-center"
            >
              <FaCog className="mx-auto mb-2 text-xl" />
              <div className="font-medium">Modules</div>
            </Link>
            
            <Link 
              to="/admin/settings" 
              className="bg-gray-50 hover:bg-gray-100 text-gray-700 py-4 px-4 rounded-lg border border-gray-200 transition-colors text-center"
            >
              <FaCog className="mx-auto mb-2 text-xl" />
              <div className="font-medium">Paramètres</div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
