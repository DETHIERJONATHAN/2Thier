import React from 'react';
import { LeadsHeader } from './components/LeadsHeader';
import { LeadsFilters } from './components/LeadsFilters';
import { LeadsTable } from './components/LeadsTable';
import { LeadsNotifications } from './components/LeadsNotifications';
import { useLeads } from './hooks/useLeads';

const LeadsPage: React.FC = () => {
  const {
    leads,
    loading,
    filters,
    setFilters,
    searchTerm,
    setSearchTerm,
    selectedLeads,
    setSelectedLeads
  } = useLeads();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header avec notifications */}
      <LeadsHeader />
      
      {/* Centre de notifications IA */}
      <LeadsNotifications />
      
      {/* Filtres et recherche */}
      <LeadsFilters 
        filters={filters}
        setFilters={setFilters}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />
      
      {/* Tableau principal des leads */}
      <LeadsTable
        leads={leads}
        loading={loading}
        selectedLeads={selectedLeads}
        setSelectedLeads={setSelectedLeads}
      />
    </div>
  );
};

export default LeadsPage;
