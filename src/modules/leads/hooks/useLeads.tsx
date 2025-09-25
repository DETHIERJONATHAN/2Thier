import { useState, useEffect, useMemo } from 'react';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';

interface LeadFilters {
  status?: string;
  assignedTo?: string;
  source?: string;
  dateRange?: any;
}

export const useLeads = () => {
  const { api } = useAuthenticatedApi();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<LeadFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  // Fetch leads with filters
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/leads', {
        params: {
          ...filters,
          search: searchTerm,
        }
      });
      setLeads(response.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtres et recherche memoizés
  const filteredLeads = useMemo(() => {
    let result = leads;

    // Recherche intelligente
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((lead: any) => 
        lead.firstName?.toLowerCase().includes(term) ||
        lead.lastName?.toLowerCase().includes(term) ||
        lead.company?.toLowerCase().includes(term) ||
        lead.email?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [leads, searchTerm]);

  // Effect pour charger les leads
  useEffect(() => {
    fetchLeads();
  }, [filters]);

  // Effect pour la recherche avec debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchTerm !== '') {
        fetchLeads();
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  return {
    leads: filteredLeads,
    loading,
    filters,
    setFilters,
    searchTerm,
    setSearchTerm,
    selectedLeads,
    setSelectedLeads,
    refetchLeads: fetchLeads
  };
};
