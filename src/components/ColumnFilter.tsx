import React from 'react';

interface ColumnFilterProps {
  column: string;
  label: string;
  onSort: (column: string) => void;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onFilter?: (value: string) => void;
  filterOptions?: Array<{ value: string, label: string }>;
  currentFilter?: string;
}

const ColumnFilter: React.FC<ColumnFilterProps> = ({
  column,
  label,
  onSort,
  sortColumn,
  sortDirection,
  onFilter,
  filterOptions,
  currentFilter
}) => {
  return (
    <div className="flex flex-col">
      <div className="flex items-center mb-1">
        <button 
          onClick={() => onSort(column)}
          className="flex items-center text-xs font-medium text-gray-700 hover:text-gray-900"
        >
          {label}
          {sortColumn === column && (
            <span className="ml-1">
              {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </button>
      </div>
      
      {onFilter && filterOptions && (
        <select
          className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white"
          value={currentFilter || ''}
          onChange={(e) => onFilter(e.target.value)}
        >
          <option value="">Tous</option>
          {filterOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default ColumnFilter;
