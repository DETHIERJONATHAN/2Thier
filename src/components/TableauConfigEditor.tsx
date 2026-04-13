import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { logger } from '../lib/logger';

interface Column {
  key: string;
  label: string;
  type: string;
}

interface Row {
  key: string;
  label: string;
}

interface Template {
  name: string;
  description?: string;
  data: Array<Record<string, unknown>>;
}

interface TableauConfig {
  columns: Column[];
  rows: Row[];
  templates: Template[];
  data: Array<Record<string, unknown>>;
  crossingData?: Record<string, unknown>; // Données de croisement : "rowKey_colKey" -> value
}

interface TableauConfigEditorProps {
  config?: Record<string, unknown>;
  onChange: (config: TableauConfig) => void;
}

const COLUMN_TYPES = [
  { value: 'text', label: 'Texte' },
  { value: 'number', label: 'Nombre' },
  { value: 'currency', label: 'Devise (€)' },
  { value: 'percentage', label: 'Pourcentage (%)' },
  { value: 'date', label: 'Date' }
];

export const TableauConfigEditor: React.FC<TableauConfigEditorProps> = ({
  config = {},
  onChange
}) => {
  const [columns, setColumns] = useState<Column[]>(() => {
    return Array.isArray(config.columns) ? config.columns as Column[] : [];
  });
  
  const [rows, setRows] = useState<Row[]>(() => {
    return Array.isArray(config.rows) ? config.rows as Row[] : [];
  });
  
  const [templates, setTemplates] = useState<Template[]>(() => {
    return Array.isArray(config.templates) ? config.templates as Template[] : [];
  });

  const [data, setData] = useState<Array<Record<string, unknown>>>(() => {
    return Array.isArray(config.data) ? config.data as Array<Record<string, unknown>> : [];
  });

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const crossingData = useMemo(() => config.crossingData || {}, [config.crossingData]);

  // 🔥 FIX: Flag pour éviter la boucle infinie de synchronisation
  // Quand on reçoit des données du parent, on ne doit pas rappeler onChange
  const isExternalUpdateRef = useRef(false);
  // Stocker la dernière config envoyée pour éviter les mises à jour inutiles
  const lastSentConfigRef = useRef<string>('');

  // Synchroniser les états quand la config change (depuis le parent)
  useEffect(() => {
    isExternalUpdateRef.current = true; // Marquer comme mise à jour externe
    
    if (Array.isArray(config.columns)) {
      setColumns(config.columns as Column[]);
    }
    if (Array.isArray(config.rows)) {
      setRows(config.rows as Row[]);
    }
    if (Array.isArray(config.templates)) {
      setTemplates(config.templates as Template[]);
    }
    if (Array.isArray(config.data)) {
      setData(config.data as Array<Record<string, unknown>>);
    }
    
    // Reset le flag après un tick pour permettre les changements utilisateur
    requestAnimationFrame(() => {
      isExternalUpdateRef.current = false;
    });
  }, [config.columns, config.rows, config.templates, config.data]);

  // Synchronisation avec le parent - SEULEMENT pour les changements internes (utilisateur)
  useEffect(() => {
    // 🔥 FIX: Ne pas synchroniser si c'est une mise à jour externe
    if (isExternalUpdateRef.current) {
      return;
    }
    
    // 🔥 FIX: Éviter les mises à jour redondantes avec JSON comparison
    const newConfig = { columns, rows, templates, data, crossingData };
    const newConfigStr = JSON.stringify(newConfig);
    
    if (newConfigStr === lastSentConfigRef.current) {
      return; // Pas de changement réel, éviter l'appel onChange
    }
    
    lastSentConfigRef.current = newConfigStr;
    onChangeRef.current(newConfig);
  }, [columns, rows, templates, data, crossingData]);

  // Migration des anciennes données vers crossingData si nécessaire
  // 🔥 FIX: Utiliser un ref pour éviter les migrations multiples
  const hasMigratedRef = useRef(false);
  
  useEffect(() => {
    // Ne migrer qu'une seule fois
    if (hasMigratedRef.current) return;
    
    if (!config.crossingData && config.data && Array.isArray(config.data) && config.data.length > 0) {
      hasMigratedRef.current = true; // Marquer comme migré AVANT d'appeler onChange
      
      logger.debug('[TableauConfigEditor] Migration des anciennes données...');
      const newCrossingData: Record<string, unknown> = {};
      
      config.data.forEach((rowData: Record<string, unknown>, rowIndex: number) => {
        // Utiliser les clés de lignes existantes ou créer des clés par défaut
        const rowKey = rows[rowIndex]?.key || `row_migrated_${rowIndex}`;
        
        Object.entries(rowData).forEach(([colKey, value]) => {
          if (colKey !== '_rowKey' && colKey !== '_colKey' && colKey !== '_value') {
            const crossingKey = `${rowKey}_${colKey}`;
            newCrossingData[crossingKey] = value;
          }
        });
      });
      
      logger.debug('[TableauConfigEditor] Données migrées:', Object.keys(newCrossingData).length);
      
      // Mettre à jour la configuration avec les données migrées via le ref stable
      onChangeRef.current({
        columns: Array.isArray(config.columns) ? config.columns as Column[] : [],
        rows: Array.isArray(config.rows) ? config.rows as Row[] : [],
        templates: Array.isArray(config.templates) ? config.templates as Template[] : [],
        data: config.data as Array<Record<string, unknown>>,
        crossingData: newCrossingData
      });
    }
  }, [config.data, config.crossingData, config.columns, config.rows, config.templates, rows]);

  // Gestion des colonnes
  const addColumn = () => {
    const newColumn: Column = {
      key: `col_${Date.now()}`,
      label: `Colonne ${columns.length + 1}`,
      type: 'text'
    };
    setColumns([...columns, newColumn]);
  };

  // Gestion des lignes
  const addRowDefinition = () => {
    const newRow: Row = {
      key: `row_${Date.now()}`,
      label: `Ligne ${rows.length + 1}`
    };
    setRows([...rows, newRow]);
  };

  const updateRowDefinition = (index: number, updates: Partial<Row>) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], ...updates };
    setRows(newRows);
  };

  const removeRowDefinition = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  // Gestion des colonnes
  const updateColumn = (index: number, updates: Partial<Column>) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], ...updates };
    setColumns(newColumns);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  // Gestion des templates
  const addTemplate = () => {
    const newTemplate: Template = {
      name: `Template ${templates.length + 1}`,
      description: 'Nouveau template',
      data: []
    };
    setTemplates([...templates, newTemplate]);
  };

  const updateTemplate = (index: number, updates: Partial<Template>) => {
    const newTemplates = [...templates];
    newTemplates[index] = { ...newTemplates[index], ...updates };
    setTemplates(newTemplates);
  };

  const removeTemplate = (index: number) => {
    setTemplates(templates.filter((_, i) => i !== index));
  };

  // Fonctions pour gérer les données de croisement
  const updateCrossingData = (rowKey: string, colKey: string, value: unknown) => {
    const crossingKey = `${rowKey}_${colKey}`;
    const newCrossingData = { 
      ...config.crossingData, 
      [crossingKey]: value 
    };
    onChange({ ...config, crossingData: newCrossingData });
  };

  const getCrossingData = (rowKey: string, colKey: string): unknown => {
    const crossingKey = `${rowKey}_${colKey}`;
    return config.crossingData?.[crossingKey] || '';
  };

  // Fonction pour nettoyer/convertir les valeurs selon le type
  const cleanValue = (value: string | number, type: string): unknown => {
    if (value === null || value === undefined || value === '') return '';
    
    const stringValue = String(value);
    
    switch (type) {
      case 'number': {
        const numValue = parseFloat(stringValue.replace(/[^\d.-]/g, ''));
        return isNaN(numValue) ? 0 : numValue;
      }
      
      case 'currency': {
        const currencyValue = parseFloat(stringValue.replace(/[^\d.-]/g, ''));
        return isNaN(currencyValue) ? 0 : currencyValue;
      }
      
      case 'percentage': {
        const percentValue = parseFloat(stringValue.replace(/[^\d.-]/g, ''));
        return isNaN(percentValue) ? 0 : percentValue;
      }
      
      case 'date': {
        const dateValue = new Date(stringValue);
        return isNaN(dateValue.getTime()) ? stringValue : dateValue.toISOString().split('T')[0];
      }
      
      default:
        return stringValue;
    }
  };

  // Fonction pour détecter le type de données
  const detectColumnType = (values: (string | number)[]): string => {
    if (values.length === 0) return 'text';
    
    let numberCount = 0;
    let dateCount = 0;
    let currencyCount = 0;
    
    for (const value of values) {
      if (value === null || value === undefined || value === '') continue;
      
      const stringValue = String(value);
      
      // Test pour currency (contient €, $, etc.)
      if (/[€$£¥]/.test(stringValue)) {
        currencyCount++;
      }
      // Test pour pourcentage
      else if (stringValue.includes('%')) {
        return 'percentage';
      }
      // Test pour date
      else if (!isNaN(Date.parse(stringValue)) && stringValue.length > 8) {
        dateCount++;
      }
      // Test pour nombre
      else if (!isNaN(Number(stringValue))) {
        numberCount++;
      }
    }
    
    const total = values.filter(v => v !== null && v !== undefined && v !== '').length;
    
    if (currencyCount / total > 0.5) return 'currency';
    if (dateCount / total > 0.5) return 'date';
    if (numberCount / total > 0.7) return 'number';
    
    return 'text';
  };

  // Fonction d'import Excel
  const handleExcelImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir en JSON avec la première ligne comme en-têtes
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          alert('Le fichier Excel doit contenir au moins 2 lignes (en-têtes + données)');
          return;
        }

        // Première ligne = en-têtes des colonnes (sauf la première cellule)
        const headers = jsonData[0] as string[];
        const newColumns: Column[] = [];
        
        // Collecter les données pour chaque colonne pour détecter le type
        const columnData: Record<number, (string | number)[]> = {};
        
        // Ignorer la première cellule (intersection vide)
        for (let i = 1; i < headers.length; i++) {
          if (headers[i]) {
            columnData[i] = [];
            // Collecter toutes les valeurs de cette colonne
            for (let rowIndex = 1; rowIndex < jsonData.length; rowIndex++) {
              const rowData = jsonData[rowIndex] as (string | number)[];
              if (rowData[i] !== undefined && rowData[i] !== null) {
                columnData[i].push(rowData[i]);
              }
            }
            
            // Créer la colonne avec type détecté
            newColumns.push({
              key: `col_${Date.now()}_${i}`,
              label: String(headers[i]),
              type: detectColumnType(columnData[i])
            });
          }
        }

        // Créer les lignes à partir de la première colonne (en ignorant l'en-tête)
        const newRows: Row[] = [];
        const newCrossingData: Record<string, unknown> = {};

        for (let rowIndex = 1; rowIndex < jsonData.length; rowIndex++) {
          const rowData = jsonData[rowIndex] as (string | number)[];
          if (rowData.length > 0 && rowData[0]) {
            const rowKey = `row_${Date.now()}_${rowIndex}`;
            newRows.push({
              key: rowKey,
              label: String(rowData[0])
            });

            // Remplir les données de croisement
            for (let colIndex = 1; colIndex < rowData.length && colIndex - 1 < newColumns.length; colIndex++) {
              const column = newColumns[colIndex - 1];
              const colKey = column.key;
              const rawValue = rowData[colIndex];
              if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
                const crossingKey = `${rowKey}_${colKey}`;
                const cleanedValue = cleanValue(rawValue, column.type);
                newCrossingData[crossingKey] = cleanedValue;
              }
            }
          }
        }

        // Mettre à jour la configuration
        const newConfig = {
          ...config,
          columns: newColumns,
          rows: newRows,
          crossingData: newCrossingData
        };
        
        onChange(newConfig);
        
        // Réinitialiser l'input file
        event.target.value = '';
        
        // Compter les cellules avec données
        const dataCount = Object.keys(newCrossingData).length;
        const typesSummary = newColumns.reduce((acc, col) => {
          acc[col.type] = (acc[col.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const typesText = Object.entries(typesSummary)
          .map(([type, count]) => `${count} ${type}`)
          .join(', ');
        
        alert(`Import réussi ! 
${newColumns.length} colonnes (${typesText}) 
${newRows.length} lignes 
${dataCount} cellules avec données importées.`);
        
      } catch (error) {
        logger.error('Erreur lors de l\'import Excel:', error);
        alert('Erreur lors de l\'import Excel. Vérifiez le format du fichier.');
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  // Fonction pour télécharger un exemple Excel
  const downloadExampleExcel = () => {
    // Créer un exemple de données
    const exampleData = [
      ['', 'Janvier', 'Février', 'Mars', 'Avril'], // En-têtes des colonnes
      ['Ventes', 1500, 1800, 2100, 1950],
      ['Coûts', 800, 900, 1000, 850],
      ['Bénéfices', 700, 900, 1100, 1100],
      ['Taux (%)', '15%', '20%', '25%', '22%']
    ];

    // Créer un nouveau workbook
    const ws = XLSX.utils.aoa_to_sheet(exampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Exemple');

    // Télécharger le fichier
    XLSX.writeFile(wb, 'exemple-tableau-croisement.xlsx');
  };

  // Fonction pour exporter les données actuelles vers Excel
  const exportToExcel = () => {
    if (columns.length === 0 || rows.length === 0) {
      alert('Aucune donnée à exporter. Créez d\'abord des colonnes et des lignes.');
      return;
    }

    // Créer les données pour l'export
    const exportData: (string | number)[][] = [];
    
    // Première ligne : en-têtes
    const headers = ['', ...columns.map(col => col.label)];
    exportData.push(headers);
    
    // Lignes de données
    rows.forEach(row => {
      const rowData: (string | number)[] = [row.label];
      columns.forEach(col => {
        const value = getCrossingData(row.key, col.key);
        rowData.push(value as string | number || '');
      });
      exportData.push(rowData);
    });

    // Créer et télécharger le fichier Excel
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tableau');

    XLSX.writeFile(wb, 'tableau-croisement-export.xlsx');
  };

  // Gestion des lignes dans les templates
  const addRowToTemplate = (templateIndex: number) => {
    const emptyRow: Record<string, unknown> = {};
    columns.forEach(col => {
      emptyRow[col.key] = col.type === 'number' || col.type === 'currency' || col.type === 'percentage' ? 0 : '';
    });
    
    const newTemplates = [...templates];
    newTemplates[templateIndex] = {
      ...newTemplates[templateIndex],
      data: [...newTemplates[templateIndex].data, emptyRow]
    };
    setTemplates(newTemplates);
  };

  const updateRowInTemplate = (templateIndex: number, rowIndex: number, key: string, value: unknown) => {
    const newTemplates = [...templates];
    const newData = [...newTemplates[templateIndex].data];
    newData[rowIndex] = { ...newData[rowIndex], [key]: value };
    newTemplates[templateIndex] = {
      ...newTemplates[templateIndex],
      data: newData
    };
    setTemplates(newTemplates);
  };

  const removeRowFromTemplate = (templateIndex: number, rowIndex: number) => {
    const newTemplates = [...templates];
    newTemplates[templateIndex] = {
      ...newTemplates[templateIndex],
      data: newTemplates[templateIndex].data.filter((_, i) => i !== rowIndex)
    };
    setTemplates(newTemplates);
  };

  return (
    <div className="space-y-6">
      {/* Section Import Excel */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-blue-800">Import Excel</h4>
          <div className="text-xs text-blue-600">
            Importez un fichier Excel pour créer automatiquement colonnes, lignes et données
          </div>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelImport}
            className="hidden"
            id="excel-import-input"
          />
          <label
            htmlFor="excel-import-input"
            className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            📊 Importer Excel
          </label>
          <button
            type="button"
            onClick={downloadExampleExcel}
            className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
          >
            📥 Télécharger exemple
          </button>
          {(columns.length > 0 && rows.length > 0) && (
            <button
              type="button"
              onClick={exportToExcel}
              className="inline-flex items-center px-3 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-md hover:bg-green-200 transition-colors"
            >
              📤 Exporter Excel
            </button>
          )}
          <div className="text-xs text-gray-600">
            Format attendu : Première ligne = en-têtes des colonnes, Première colonne = libellés des lignes
          </div>
        </div>
      </div>

      {/* Configuration des colonnes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Colonnes du tableau</h4>
          <button
            type="button"
            onClick={addColumn}
            className="btn btn-sm btn-primary"
          >
            + Ajouter une colonne
          </button>
        </div>
        
        {columns.length === 0 ? (
          <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded border-2 border-dashed">
            Aucune colonne définie. Ajoutez au moins une colonne pour créer votre tableau.
          </div>
        ) : (
          <div className="space-y-3">
            {columns.map((column, index) => (
              <div key={column.key} className="border border-gray-200 rounded p-3 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Nom de la colonne
                    </label>
                    <input
                      type="text"
                      value={column.label}
                      onChange={(e) => updateColumn(index, { label: e.target.value })}
                      className="input input-bordered input-sm w-full"
                      placeholder="Ex: Nom du produit"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Clé technique
                    </label>
                    <input
                      type="text"
                      value={column.key}
                      onChange={(e) => updateColumn(index, { key: e.target.value })}
                      className="input input-bordered input-sm w-full"
                      placeholder="Ex: nom_produit"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Type de données
                    </label>
                    <div className="flex gap-1">
                      <select
                        value={column.type}
                        onChange={(e) => updateColumn(index, { type: e.target.value })}
                        className="select select-bordered select-sm flex-1"
                      >
                        {COLUMN_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeColumn(index)}
                        className="btn btn-sm btn-error btn-outline"
                        title="Supprimer cette colonne"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configuration des lignes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Lignes du tableau</h4>
          <button
            type="button"
            onClick={addRowDefinition}
            className="btn btn-sm btn-secondary"
          >
            + Ajouter une ligne
          </button>
        </div>
        
        {rows.length === 0 ? (
          <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded border-2 border-dashed">
            Aucune ligne définie. Ajoutez des lignes pour structurer votre tableau de croisement.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={row.key} className="border border-gray-200 rounded p-3 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Nom de la ligne
                    </label>
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => updateRowDefinition(index, { label: e.target.value })}
                      className="input input-bordered input-sm w-full"
                      placeholder="Ex: Produit A"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Clé technique
                    </label>
                    <input
                      type="text"
                      value={row.key}
                      onChange={(e) => updateRowDefinition(index, { key: e.target.value })}
                      className="input input-bordered input-sm w-full"
                      placeholder="Ex: produit_a"
                    />
                  </div>
                </div>
                
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeRowDefinition(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                    title="Supprimer cette ligne"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section Données du tableau de croisement */}
      {columns.length > 0 && rows.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">Données de croisement</h4>
            <div className="text-xs text-gray-500">
              Remplissez les cellules aux intersections lignes × colonnes
            </div>
          </div>

          <div className="border border-gray-300 rounded overflow-hidden bg-white">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-center font-medium text-gray-700 border border-gray-300 bg-gray-200">
                    {/* Cellule vide en haut à gauche */}
                  </th>
                  {columns.map((col) => (
                    <th key={col.key} className="px-3 py-2 text-center font-medium text-gray-700 border border-gray-300">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td className="px-3 py-2 text-center font-medium text-gray-700 bg-gray-100 border border-gray-300">
                      {row.label}
                    </td>
                    {columns.map((col) => (
                      <td key={col.key} className="border border-gray-300 p-1">
                        <input
                          type={col.type === 'number' || col.type === 'currency' || col.type === 'percentage' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                          step={col.type === 'currency' || col.type === 'percentage' ? '0.01' : undefined}
                          value={String(getCrossingData(row.key, col.key))}
                          onChange={(e) => {
                            let value: unknown = e.target.value;
                            if (col.type === 'number' || col.type === 'currency' || col.type === 'percentage') {
                              value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                            }
                            updateCrossingData(row.key, col.key, value);
                          }}
                          className="w-full px-2 py-1 text-sm border-0 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                          placeholder={col.type === 'currency' ? '0.00' : col.type === 'percentage' ? '0%' : '...'}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-2 text-xs text-gray-600">
            📊 Tableau de {rows.length} × {columns.length} = {rows.length * columns.length} cellules de croisement
          </div>
        </div>
      )}

      {/* Message si structure incomplète */}
      {(columns.length === 0 || rows.length === 0) && (
        <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
          <div className="text-sm text-yellow-800">
            ⚠️ Définissez d'abord les colonnes et les lignes pour pouvoir saisir les données de croisement
          </div>
        </div>
      )}

      {/* Message si structure incomplète */}
      {columns.length > 0 && rows.length === 0 && (
        <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
          <div className="text-sm text-yellow-800">
            ⚠️ Ajoutez des lignes pour voir l'aperçu du tableau de croisement
          </div>
        </div>
      )}

      {/* Configuration des templates */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Templates de données</h4>
          <button
            type="button"
            onClick={addTemplate}
            disabled={columns.length === 0}
            className="btn btn-sm btn-secondary"
            title={columns.length === 0 ? "Définissez d'abord les colonnes" : ""}
          >
            + Ajouter un template
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded border-2 border-dashed">
            Aucun template défini. Les templates permettent d'ajouter rapidement des données pré-configurées.
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template, index) => (
              <div key={`item-${index}`} className="border border-gray-200 rounded p-3 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Nom du template
                    </label>
                    <input
                      type="text"
                      value={template.name}
                      onChange={(e) => updateTemplate(index, { name: e.target.value })}
                      className="input input-bordered input-sm w-full"
                      placeholder="Ex: Panneaux solaires"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Description
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={template.description || ''}
                        onChange={(e) => updateTemplate(index, { description: e.target.value })}
                        className="input input-bordered input-sm flex-1"
                        placeholder="Ex: Gamme standard"
                      />
                      <button
                        type="button"
                        onClick={() => removeTemplate(index)}
                        className="btn btn-sm btn-error btn-outline"
                        title="Supprimer ce template"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Interface d'édition des données du template */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-medium text-gray-700">Données pré-remplies</h5>
                    <button
                      type="button"
                      onClick={() => addRowToTemplate(index)}
                      disabled={columns.length === 0}
                      className="btn btn-xs btn-success"
                      title="Ajouter une ligne de données"
                    >
                      + Ligne
                    </button>
                  </div>
                  
                  {template.data.length === 0 ? (
                    <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded border border-dashed">
                      Aucune donnée. Cliquez sur "+ Ligne" pour ajouter des données pré-remplies.
                    </div>
                  ) : (
                    <div className="border border-gray-300 rounded overflow-hidden">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-100">
                          <tr>
                            {columns.map((col) => (
                              <th key={col.key} className="px-2 py-1 text-left font-medium text-gray-700">
                                {col.label}
                              </th>
                            ))}
                            <th className="px-2 py-1 text-center w-16">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {template.data.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-gray-50">
                              {columns.map((col) => (
                                <td key={col.key} className="px-2 py-1">
                                  <input
                                    type={col.type === 'number' || col.type === 'currency' || col.type === 'percentage' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                                    step={col.type === 'currency' || col.type === 'percentage' ? '0.01' : undefined}
                                    value={String(row[col.key] || '')}
                                    onChange={(e) => {
                                      let value: unknown = e.target.value;
                                      if (col.type === 'number' || col.type === 'currency' || col.type === 'percentage') {
                                        value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                      }
                                      updateRowInTemplate(index, rowIndex, col.key, value);
                                    }}
                                    className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder={col.label}
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeRowFromTemplate(index, rowIndex)}
                                  className="text-red-600 hover:text-red-800 text-xs"
                                  title="Supprimer cette ligne"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {template.data.length > 0 && (
                    <div className="text-xs text-gray-600">
                      📊 {template.data.length} ligne(s) de données - Ces données seront disponibles lors de la création de devis
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aperçu de la configuration */}
      {columns.length > 0 && (
        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <h4 className="text-sm font-medium text-blue-800 mb-2">📊 Aperçu du tableau</h4>
          <div className="text-xs text-blue-700">
            <div><strong>Colonnes :</strong> {columns.map(c => `${c.label} (${c.type})`).join(', ')}</div>
            <div><strong>Données :</strong> {data.length} ligne(s) de données principales</div>
            <div><strong>Templates :</strong> {templates.length} template(s) défini(s)</div>
            <div><strong>Usage :</strong> Ce tableau sera disponible dans les devis avec les données pré-remplies</div>
          </div>
        </div>
      )}
    </div>
  );
};
