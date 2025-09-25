import { useState } from 'react';
import DependencyRules from '../dependencies/DependencyRules';
import type { DependencyResult } from '../../utils/dependencyFunctions';

interface FormFieldProps {
  id: string;
  label: string;
  description?: string;
  type: string;
  placeholder?: string;
  defaultValue?: any;
  options?: Array<{ label: string; value: string | number }>;
  required?: boolean;
}

/**
 * Composant de champ de formulaire avec support des dépendances
 * Ce composant peut être contrôlé dynamiquement par les règles de dépendance
 */
const DynamicFormField = ({ 
  id, 
  label, 
  description, 
  type, 
  placeholder, 
  defaultValue, 
  options = [], 
  required = false 
}: FormFieldProps) => {
  // État local du champ
  const [value, setValue] = useState<any>(defaultValue || '');
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const [isRequired, setIsRequired] = useState<boolean>(required);
  const [rules, setRules] = useState<string[]>([]);

  // Gestionnaire de changement de valeur
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setValue(e.target.value);
  };

  // Gestionnaire d'application des résultats de dépendance
  const handleDependencyResults = (results: DependencyResult[]) => {
    // Traiter chaque résultat de dépendance
    results.forEach(result => {
      // Vérifier si ce résultat concerne ce champ
      const targets = Array.isArray(result.targetField) ? result.targetField : [result.targetField];
      
      if (targets.includes(id) && result.applied) {
        switch (result.action) {
          case 'SHOW':
            setIsVisible(true);
            break;
          case 'HIDE':
            setIsVisible(false);
            break;
          case 'ENABLE':
            setIsDisabled(false);
            break;
          case 'DISABLE':
            setIsDisabled(true);
            break;
          case 'SET_REQUIRED':
            setIsRequired(true);
            break;
          case 'SET_OPTIONAL':
            setIsRequired(false);
            break;
          case 'SET_VALUE':
            if (result.value !== undefined) {
              setValue(result.value);
            }
            break;
        }
      }
    });
  };

  // Si le champ est masqué, ne pas le rendre
  if (!isVisible) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="mb-2">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {description && (
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        )}
      </div>

      {/* Rendu du champ en fonction de son type */}
      {type === 'text' && (
        <input
          type="text"
          id={id}
          name={id}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={isDisabled}
          required={isRequired}
        />
      )}

      {type === 'textarea' && (
        <textarea
          id={id}
          name={id}
          rows={4}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={isDisabled}
          required={isRequired}
        />
      )}

      {type === 'select' && (
        <select
          id={id}
          name={id}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          value={value}
          onChange={handleChange}
          disabled={isDisabled}
          required={isRequired}
        >
          <option value="">Sélectionner...</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {/* Éditeur de règles de dépendance */}
      <DependencyRules
        fieldId={id}
        initialRules={rules}
        onChange={setRules}
        onApply={handleDependencyResults}
      />
    </div>
  );
};

export default DynamicFormField;
