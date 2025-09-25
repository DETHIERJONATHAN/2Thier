import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useLeadStatuses } from '../../hooks/useLeadStatuses';
import { useAuth } from '../../auth/useAuth';
import { NotificationManager } from '../../components/Notifications';
import AddLeadModal from '../../components/AddLeadModal';
import DirectAddLeadModal from '../../components/DirectAddLeadModal';
import EditLeadModal from '../../components/EditLeadModal';
import ColumnFilter from '../../components/ColumnFilter';

// Types
import { Lead } from '../../types/leads';
import { LEAD_SOURCES } from './LeadsConfig';

/**
 * Liste principale des leads avec fonctionnalités de filtre et recherche
 */
export default function LeadsList() {
  // Navigation
  const navigate = useNavigate();

  // États
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  
  // États pour le tri et le filtrage par colonne
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  
  // API et contexte d'authentification
  const { api, isLoading: loading } = useAuthenticatedApi();
  const { leadStatuses } = useLeadStatuses();
  const { currentOrganization, isSuperAdmin, user } = useAuth();
  const organizationId = currentOrganization?.id;
  
  // Récupérer les leads
  const fetchLeads = useCallback(async () => {
    if (!organizationId && !isSuperAdmin) {
      console.log('[LeadsList] Aucune organisation ou super admin, pas de récupération de leads');
      setLeads([]);
      return;
    }

    try {
      const orgIdParam = isSuperAdmin && !organizationId ? 'all' : organizationId;
      console.log(`[LeadsList] Récupération des leads pour l'organisation: ${orgIdParam}, isSuperAdmin: ${isSuperAdmin}`);
      
      const data = await api.get(`/leads?organizationId=${orgIdParam}`);
      console.log('[LeadsList] Réponse API:', data);
      
      const leadsData = Array.isArray(data) ? data : [];
      console.log(`[LeadsList] ${leadsData.length} leads récupérés`);
      
      setLeads(leadsData);
      applyFilters(leadsData, activeFilters, searchTerm);
    } catch (e: any) {
      const errorMsg = e.message || 'Erreur lors du chargement des leads';
      console.error('[LeadsList] Erreur fetchLeads:', e);
      setError(errorMsg);
      NotificationManager.error(errorMsg);
    }
  }, [api, organizationId, isSuperAdmin, activeFilters, searchTerm]);

  // Appliquer les filtres
  const applyFilters = (leadsData: Lead[], filters: string[], term: string) => {
    let result = [...leadsData];
    
    // Filtrer par statut
    if (filters.length > 0) {
      result = result.filter(lead => filters.includes(lead.status));
    }
    
    // Filtrer par terme de recherche
    if (term) {
      const lowercaseTerm = term.toLowerCase();
      result = result.filter(lead => {
        const nameMatch = lead.data?.name?.toLowerCase().includes(lowercaseTerm);
        const emailMatch = lead.data?.email?.toLowerCase().includes(lowercaseTerm);
        const phoneMatch = lead.data?.phone?.toLowerCase().includes(lowercaseTerm);
        const companyMatch = lead.data?.company?.toLowerCase().includes(lowercaseTerm);
        return nameMatch || emailMatch || phoneMatch || companyMatch;
      });
    }
    
    setFilteredLeads(result);
  };

  // Charger les leads au chargement du composant
  useEffect(() => {
    if (user) {
      fetchLeads();
    } else {
      console.log('[LeadsList] Utilisateur non connecté, attente de connexion');
      setError('Authentification requise. Veuillez vous connecter.');
    }
  }, [fetchLeads, user]);

  // Mettre à jour les filtres quand ils changent
  useEffect(() => {
    applyFilters(leads, activeFilters, searchTerm);
    applyColumnFilters();
  }, [activeFilters, searchTerm, leads, sortColumn, sortDirection, sourceFilter, dateStart, dateEnd]);
  
  // Fonction pour appliquer les filtres de colonne et le tri
  const applyColumnFilters = () => {
    let result = [...leads];
    
    // Appliquer d'abord les filtres de statut
    if (activeFilters.length > 0) {
      result = result.filter(lead => activeFilters.includes(lead.status));
    }
    
    // Appliquer le filtre de recherche
    if (searchTerm) {
      const lowercaseTerm = searchTerm.toLowerCase();
      result = result.filter(lead => {
        const nameMatch = lead.data?.name?.toLowerCase().includes(lowercaseTerm);
        const emailMatch = lead.data?.email?.toLowerCase().includes(lowercaseTerm);
        const phoneMatch = lead.data?.phone?.toLowerCase().includes(lowercaseTerm);
        const companyMatch = lead.data?.company?.toLowerCase().includes(lowercaseTerm);
        return nameMatch || emailMatch || phoneMatch || companyMatch;
      });
    }
    
    // Filtrer par source
    if (sourceFilter) {
      result = result.filter(lead => lead.source === sourceFilter);
    }
    
    // Filtrer par date de début
    if (dateStart) {
      const startDate = new Date(dateStart);
      result = result.filter(lead => new Date(lead.createdAt) >= startDate);
    }
    
    // Filtrer par date de fin
    if (dateEnd) {
      const endDate = new Date(dateEnd);
      endDate.setDate(endDate.getDate() + 1);
      result = result.filter(lead => new Date(lead.createdAt) <= endDate);
    }
    
    // Appliquer le tri
    result.sort((a, b) => {
      let aValue, bValue;
      
      switch(sortColumn) {
        case 'name':
          aValue = a.data?.name || '';
          bValue = b.data?.name || '';
          break;
        case 'company':
          aValue = a.data?.company || '';
          bValue = b.data?.company || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'source':
          aValue = a.source || '';
          bValue = b.source || '';
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredLeads(result);
  };

  // Gérer le filtrage par statut
  const toggleFilter = (status: string) => {
    setActiveFilters(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Quand un lead est ajouté
  const handleLeadAdded = () => {
    fetchLeads();
    NotificationManager.success("Lead ajouté avec succès !");
    setIsModalOpen(false);
    setIsDirectModalOpen(false);
  };

  // Supprimer un lead
  const handleDeleteLead = async (leadId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce lead ?")) {
      try {
        await api.delete(`/leads/${leadId}`);
        fetchLeads();
        NotificationManager.success("Lead supprimé avec succès !");
      } catch (e: any) {
        const errorMsg = e.message || 'Erreur lors de la suppression du lead';
        setError(errorMsg);
        NotificationManager.error(errorMsg);
      }
    }
  };

  // Voir les détails d'un lead
  const handleViewLead = (leadId: string) => {
    navigate(`/leads/details/${leadId}`);
  };

  // Trouver le statut correspondant au lead
  const getStatusInfo = (lead: Lead) => {
    if (lead.leadStatus) {
      return {
        id: lead.leadStatus.id,
        name: lead.leadStatus.name,
        label: lead.leadStatus.name,
        value: lead.leadStatus.name.toLowerCase().replace(/\s+/g, '_'),
        color: lead.leadStatus.color,
        order: lead.leadStatus.order,
        isDefault: lead.leadStatus.isDefault,
        organizationId: lead.leadStatus.organizationId,
        createdAt: lead.leadStatus.createdAt,
        updatedAt: lead.leadStatus.updatedAt
      };
    }
    
    const statusCode = lead.status;
    return leadStatuses.find((status) => status.value === statusCode) || 
      { id: '', name: statusCode, label: statusCode, value: statusCode, color: '#6b7280', order: 999, isDefault: false, organizationId: '', createdAt: '', updatedAt: '' };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h1 className="text-xl md:text-2xl font-bold">Liste des Leads</h1>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm md:text-base"
            >
              + Nouveau Lead
            </button>
            <button 
              onClick={() => setIsDirectModalOpen(true)} 
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors text-sm md:text-base"
              title="Utiliser le mode direct pour contourner les problèmes d'authentification"
            >
              + Lead (Mode Direct)
            </button>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Recherche */}
            <div className="flex-grow max-w-full lg:max-w-md">
              <input
                type="text"
                placeholder="Rechercher par nom, email, téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
              />
            </div>
            
            {/* Filtres par statut */}
            <div className="flex flex-wrap gap-2">
              {leadStatuses.map((status) => (
                <button
                  key={status.value}
                  onClick={() => toggleFilter(status.value)}
                  style={{ 
                    backgroundColor: status.color,
                    opacity: activeFilters.includes(status.value) ? 1 : 0.7,
                    border: activeFilters.includes(status.value) ? '2px solid #000' : '2px solid transparent'
                  }}
                  className="px-2 md:px-3 py-1 rounded-full text-xs md:text-sm text-white font-medium hover:opacity-90 transition-all"
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <AddLeadModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onLeadAdded={handleLeadAdded} 
        />
        <DirectAddLeadModal 
          isOpen={isDirectModalOpen} 
          onClose={() => setIsDirectModalOpen(false)} 
          onLeadAdded={handleLeadAdded}
          organizationId={organizationId || ''} 
        />

        {loading ? (
          <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-lg shadow-sm">
            <p className="text-red-700 text-sm md:text-base">{error}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-3 md:px-6 py-3 text-left">
                      <ColumnFilter 
                        column="status" 
                        label="Statut" 
                        onSort={(col) => {
                          if (sortColumn === col) {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortColumn(col);
                            setSortDirection('asc');
                          }
                        }}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                      />
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left">
                      <ColumnFilter 
                        column="name" 
                        label="Client" 
                        onSort={(col) => {
                          if (sortColumn === col) {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortColumn(col);
                            setSortDirection('asc');
                          }
                        }}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                      />
                    </th>
                    <th className="hidden md:table-cell px-3 md:px-6 py-3 text-left">
                      <ColumnFilter 
                        column="email" 
                        label="Contact" 
                        onSort={(col) => {
                          if (sortColumn === col) {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortColumn(col);
                            setSortDirection('asc');
                          }
                        }}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                      />
                    </th>
                    <th className="hidden lg:table-cell px-3 md:px-6 py-3 text-left">
                      <ColumnFilter 
                        column="assignedTo" 
                        label="Assigné à" 
                        onSort={(col) => {
                          if (sortColumn === col) {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortColumn(col);
                            setSortDirection('asc');
                          }
                        }}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                      />
                    </th>
                    <th className="hidden lg:table-cell px-3 md:px-6 py-3 text-left">
                      <ColumnFilter 
                        column="source" 
                        label="Source" 
                        onSort={(col) => {
                          if (sortColumn === col) {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortColumn(col);
                            setSortDirection('asc');
                          }
                        }}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onFilter={setSourceFilter}
                        filterOptions={LEAD_SOURCES}
                        currentFilter={sourceFilter}
                      />
                    </th>
                    <th className="hidden xl:table-cell px-3 md:px-6 py-3 text-left">
                      <div className="flex flex-col">
                        <ColumnFilter 
                          column="createdAt" 
                          label="Créé le" 
                          onSort={(col) => {
                            if (sortColumn === col) {
                              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortColumn(col);
                              setSortDirection('asc');
                            }
                          }}
                          sortColumn={sortColumn}
                          sortDirection={sortDirection}
                        />
                        <div className="flex space-x-1 mt-1">
                          <input 
                            type="date" 
                            value={dateStart}
                            onChange={(e) => setDateStart(e.target.value)}
                            className="text-xs border border-gray-300 rounded px-1 py-0.5 w-20"
                            placeholder="De"
                          />
                          <input 
                            type="date" 
                            value={dateEnd}
                            onChange={(e) => setDateEnd(e.target.value)}
                            className="text-xs border border-gray-300 rounded px-1 py-0.5 w-20"
                            placeholder="À"
                          />
                        </div>
                      </div>
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span className="hidden md:inline">Actions</span>
                      <span className="md:hidden">Act.</span>
                      <div className="text-xs text-gray-400 font-normal normal-case mt-1 hidden lg:block">
                        Cliquez sur une ligne pour voir le détail
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map(lead => {
                      const statusInfo = getStatusInfo(lead);
                      return (
                        <tr 
                          key={lead.id} 
                          className="hover:bg-blue-50 transition-colors cursor-pointer"
                          onClick={() => handleViewLead(lead.id)}
                        >
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                            <span 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: statusInfo.color }}
                            >
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{lead.data?.name || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{lead.data?.company || ''}</div>
                            {/* Afficher les infos de contact sur mobile */}
                            <div className="md:hidden text-xs text-gray-500 mt-1">
                              {lead.data?.email && <div>{lead.data.email}</div>}
                              {lead.data?.phone && <div>{lead.data.phone}</div>}
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-3 md:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{lead.data?.email || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{lead.data?.phone || ''}</div>
                          </td>
                          <td className="hidden lg:table-cell px-3 md:px-6 py-4 whitespace-nowrap">
                            {lead.assignedTo ? (
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                                  {lead.assignedTo.firstName?.[0]}{lead.assignedTo.lastName?.[0]}
                                </div>
                                <div className="ml-2">
                                  <div className="text-sm font-medium text-gray-900">
                                    {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">Non assigné</span>
                            )}
                          </td>
                          <td className="hidden lg:table-cell px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {lead.source || 'Direct'}
                          </td>
                          <td className="hidden xl:table-cell px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLead(lead.id);
                              }}
                              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                              title="Supprimer ce lead"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p className="text-lg font-medium">
                            {searchTerm || activeFilters.length > 0 || sourceFilter || dateStart || dateEnd
                              ? 'Aucun lead ne correspond aux critères de recherche' 
                              : 'Aucun lead trouvé'}
                          </p>
                          <p className="text-gray-400 mt-1">
                            {!searchTerm && activeFilters.length === 0 && !sourceFilter && !dateStart && !dateEnd && 'Commencez par ajouter un nouveau lead'}
                          </p>
                          <button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            + Ajouter un lead
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}