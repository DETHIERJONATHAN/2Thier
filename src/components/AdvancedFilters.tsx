import React, { useState, useEffect } from 'react';
import { Lead } from '../types/leads';
import { LEAD_SOURCES, LEAD_STATUSES } from '../pages/Leads/LeadsConfig';

interface AdvancedFiltersProps {
  leads: Lead[];
  onFilteredDataChange: (filteredData: Lead[]) => void;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ leads, onFilteredDataChange }) => {
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Appliquer les filtres quand ils changent
  useEffect(() => {
    if (!leads) return;
    
    let filteredLeads = [...leads];
    
    // Filtrer par source
    if (selectedSource) {
      filteredLeads = filteredLeads.filter(lead => lead.source === selectedSource);
    }
    
    // Filtrer par plage de dates
    if (startDate) {
      const startDateTime = new Date(startDate).getTime();
      filteredLeads = filteredLeads.filter(lead => new Date(lead.createdAt).getTime() >= startDateTime);
    }
    
    if (endDate) {
      const endDateTime = new Date(endDate).getTime() + 86400000; // Ajouter un jour pour inclure la date de fin complète
      filteredLeads = filteredLeads.filter(lead => new Date(lead.createdAt).getTime() <= endDateTime);
    }
    
    // Trier les résultats
    filteredLeads = sortData(filteredLeads, sortColumn, sortDirection);
    
    onFilteredDataChange(filteredLeads);
  }, [leads, selectedSource, sortColumn, sortDirection, startDate, endDate]);

  // Fonction de tri
  const sortData = (data: Lead[], column: string, direction: 'asc' | 'desc') => {
    return [...data].sort((a, b) => {
      let aValue, bValue;
      
      // Déterminer les valeurs à comparer en fonction de la colonne
      switch(column) {
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
      
      // Comparaison en fonction de la direction
      if (direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  // Gérer le changement de colonne de tri
  const handleSortChange = (column: string) => {
    if (sortColumn === column) {
      // Inverser la direction si on clique sur la même colonne
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nouvelle colonne, commencer par desc
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <h3 className="text-lg font-medium mb-3">Filtres avancés</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Filtre par source */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
          <select 
            value={selectedSource} 
            onChange={(e) => setSelectedSource(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Toutes les sources</option>
            {LEAD_SOURCES.map(source => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Filtre par date de début */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Filtre par date de fin */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      {/* Options de tri */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Trier par</label>
        <div className="flex flex-wrap gap-2">
          {['name', 'company', 'status', 'createdAt', 'source'].map((column) => (
            <button
              key={column}
              onClick={() => handleSortChange(column)}
              className={`px-3 py-1 rounded-md text-sm ${
                sortColumn === column 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
              }`}
            >
              {column === 'name' ? 'Nom' : 
               column === 'company' ? 'Société' :
               column === 'status' ? 'Statut' :
               column === 'createdAt' ? 'Date de création' :
               'Source'}
              {sortColumn === column && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Bouton pour réinitialiser les filtres */}
      <div className="mt-4">
        <button 
          onClick={() => {
            setSelectedSource('');
            setSortColumn('createdAt');
            setSortDirection('desc');
            setStartDate('');
            setEndDate('');
          }}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          Réinitialiser les filtres
        </button>
      </div>
    </div>
  );
};

export default AdvancedFilters;
