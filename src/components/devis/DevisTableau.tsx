import React, { useMemo } from 'react';
import { useAuth } from '../../auth/useAuth';
import type { Field } from './DevisSection';

interface DevisTableauProps {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export const DevisTableau: React.FC<DevisTableauProps> = ({ 
  field, 
  value, 
  onChange, 
  disabled = false 
}) => {
  const { user } = useAuth();
  
  const config = useMemo(() => {
    return (field.config || field.advancedConfig || {}) as Record<string, unknown>;
  }, [field.config, field.advancedConfig]);
  
  const columns = (config.columns || []) as Array<{ 
    key: string; 
    label: string; 
    type?: string; 
  }>;
  
  const templates = (config.templates || []) as Array<{ 
    name: string; 
    description?: string; 
    data: Array<Record<string, unknown>>; 
  }>;

  const canEdit = user?.role === 'super_admin' || user?.role === 'admin';
  const displayData = Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];

  const setCell = (rowIndex: number, key: string, cellValue: unknown) => {
    const newData = displayData.map((row, i) => 
      i === rowIndex ? { ...row, [key]: cellValue } : row
    );
    onChange(newData);
  };

  const addRow = () => {
    const emptyRow: Record<string, unknown> = {};
    columns.forEach(col => {
      emptyRow[col.key] = col.type === 'number' || col.type === 'currency' ? 0 : '';
    });
    onChange([...displayData, emptyRow]);
  };

  const removeRow = (index: number) => {
    const newData = displayData.filter((_, i) => i !== index);
    onChange(newData);
  };

  const addFromTemplate = (template: { data: Array<Record<string, unknown>> }) => {
    onChange([...displayData, ...template.data]);
  };

  if (columns.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded">
        Aucune colonne configurée. Définissez la structure du tableau dans le formulaire.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Templates (admin seulement) */}
      {templates.length > 0 && canEdit && !disabled && (
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <div className="text-sm font-medium text-blue-800 mb-2">
            📋 Templates disponibles
          </div>
          <div className="flex flex-wrap gap-2">
            {templates.map((template, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => addFromTemplate(template)}
                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded border transition-colors"
              >
                {template.name}
                {template.description && (
                  <span className="ml-1 text-blue-500">({template.description})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="border border-gray-300 rounded overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th 
                  key={col.key} 
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                >
                  {col.label}
                </th>
              ))}
              {canEdit && !disabled && (
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b w-16">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayData.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2 whitespace-nowrap">
                    {canEdit && !disabled ? (
                      <input
                        type={col.type === 'number' || col.type === 'currency' ? 'number' : 'text'}
                        step={col.type === 'currency' ? '0.01' : undefined}
                        value={String(row[col.key] || '')}
                        onChange={(e) => {
                          const newValue = col.type === 'number' || col.type === 'currency' 
                            ? (e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)
                            : e.target.value;
                          setCell(rowIdx, col.key, newValue);
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={col.label}
                      />
                    ) : (
                      <span className="text-sm text-gray-900">
                        {col.type === 'currency' 
                          ? `${row[col.key] || 0}€` 
                          : String(row[col.key] || '')
                        }
                      </span>
                    )}
                  </td>
                ))}
                {canEdit && !disabled && (
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(rowIdx)}
                      className="text-red-600 hover:text-red-800 text-sm transition-colors"
                      title="Supprimer cette ligne"
                    >
                      🗑️
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {displayData.length === 0 && (
              <tr>
                <td 
                  className="px-3 py-4 text-sm text-gray-500 text-center" 
                  colSpan={columns.length + (canEdit && !disabled ? 1 : 0)}
                >
                  {canEdit && !disabled 
                    ? 'Aucune ligne. Utilisez les boutons ci-dessous pour ajouter des données.'
                    : 'Aucune donnée disponible.'
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Actions (admin seulement) */}
      {canEdit && !disabled && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addRow}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            + Ajouter une ligne
          </button>
        </div>
      )}

      {/* Message permissions */}
      {!canEdit && (
        <div className="text-xs text-gray-500 italic">
          Seuls les administrateurs peuvent modifier ce tableau.
        </div>
      )}
    </div>
  );
};
