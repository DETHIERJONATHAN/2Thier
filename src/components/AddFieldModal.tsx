import React, { useState, useEffect, useCallback } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { FIELD_TYPES, FIELD_TYPES_WITH_OPTIONS } from '../fieldTypes';

// Utilitaire partagé (duplicata local – pourrait être extrait dans un util) pour générer des slugs stables
const slugify = (text: string) =>
  text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');

const TABS: { key: string; label: string }[] = [
  { key: 'base', label: 'Paramètres de base' },
  { key: 'dependencies', label: 'Dépendances' },
  { key: 'modules', label: 'Modules' },
  { key: 'conditions', label: 'Conditions' },
];

// Icônes supprimées (non utilisées ici)

const FIELD_WIDTHS = [
  { value: '1/1', label: '100%' },
  { value: '3/4', label: '3/4' },
  { value: '1/2', label: '1/2' },
  { value: '1/4', label: '1/4' },
];

// Correction du typage de AddFieldModal : ajout d'un type explicite pour les props
interface ExistingField { id: string; label: string; type: string; options?: unknown[]; placeholder?: unknown; required?: boolean; width?: string; advancedOptions?: AdvancedOption[] }
interface FieldDependency { parentField: string; parentValue: string }
interface FieldCondition { sourceField: string; value: string; action: string }
interface NewFieldDraft { type: string; label: string; required: boolean; width: string; options?: FieldOption[]; advancedOptions?: AdvancedOption[]; placeholder?: string; dependencies?: FieldDependency[]; modules?: string[]; conditions?: FieldCondition[] }
interface AddFieldModalProps { onClose: () => void; onAdd: (field: NewFieldDraft) => void; existingFields?: ExistingField[]; editingField: ExistingField | null }

// Typage explicite pour advancedOptions et placeholder
export interface AdvancedSubFieldOption {
  id: string;
  label: string;
}
export interface AdvancedSubField {
  id: string;
  label: string;
  type: string;
  options?: AdvancedSubFieldOption[] | string[];
}
export interface AdvancedOption {
  id: string;
  label: string;
  subFields: AdvancedSubField[];
}

interface FieldOption {
  id: string;
  label: string;
  value: string;
}

// Centralisation des types à options pour tout le CRM
export default function AddFieldModal({ onClose, onAdd, existingFields = [], editingField }: AddFieldModalProps) {
  const [tab, setTab] = useState('base');
  const [type, setType] = useState('text');
  const [label, setLabel] = useState('');
  // placeholder peut être string ou {id, label, value}[] selon le type de champ
  const [placeholder, setPlaceholder] = useState<string | FieldOption[]>([]);
  const [required, setRequired] = useState(false);
  // showTypeDropdown retiré
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOption[]>([]);
  const [width, setWidth] = useState('1/2');

  // Pour la dépendance
  const [parentField, setParentField] = useState('');
  const [parentValue, setParentValue] = useState('');
  // --- Gestion des dépendances (FieldDependency) ---
  const [dependencies, setDependencies] = useState<{ parentField: string; parentValue: string }[]>([]);

  function addDependency() {
    if (!parentField || !parentValue) return;
    setDependencies([...dependencies, { parentField, parentValue }]);
    setParentField('');
    setParentValue('');
  }
  function removeDependency(idx: number) {
    setDependencies(dependencies.filter((_, i) => i !== idx));
  }

  // --- Gestion des modules (FieldModule) ---
  const MODULES_LIST = ['commercial', 'technique', 'admin', 'finance', 'autre'];
  const [modules, setModules] = useState<string[]>([]);
  function toggleModule(module: string) {
    setModules(modules => modules.includes(module) ? modules.filter(m => m !== module) : [...modules, module]);
  }
  function removeModule(module: string) {
    setModules(modules => modules.filter(m => m !== module));
  }

  // --- Gestion des conditions (FieldCondition) ---
  const [conditions, setConditions] = useState<{ sourceField: string; value: string; action: string }[]>([]);
  const [condField, setCondField] = useState('');
  const [condValue, setCondValue] = useState('');
  const [condAction, setCondAction] = useState('show');
  function addCondition() {
    if (!condField || !condValue) return;
    setConditions([...conditions, { sourceField: condField, value: condValue, action: condAction }]);
    setCondField('');
    setCondValue('');
  }
  function removeCondition(idx: number) {
    setConditions(conditions.filter((_, i) => i !== idx));
  }

  useEffect(() => {
    if (editingField) {
      setType(editingField.type || 'text');
      setLabel(editingField.label || '');
      if (["select", "checkboxes", "radio"].includes(editingField.type) && Array.isArray(editingField.options)) {
        setPlaceholder(editingField.options.map((o: unknown) => {
          if (typeof o === 'string') return { id: uniqueId(), label: o, value: slugify(o) };
          const obj = o as { id?: string; label: string; value?: string };
          return { id: obj.id || uniqueId(), label: obj.label, value: obj.value || slugify(obj.label) };
        }));
      } else {
        setPlaceholder(editingField.placeholder || (["select", "checkboxes", "radio"].includes(editingField.type) ? [] : ''));
      }
      setRequired(!!editingField.required);
      setWidth(editingField.width || '1/2');
      // Correction : reconstruction complète et fidèle de advancedOptions
      if (editingField.type === 'advanced_select' && Array.isArray(editingField.options)) {
        const advOpts = editingField.options.map((opt: unknown) => {
          const o = opt as { label: string; subFields?: unknown[] };
          return { label: o.label, subFields: Array.isArray(o.subFields) ? o.subFields.map(sf => normalizeSubField(sf as { id?: string; label?: string; type?: string; options?: unknown })) .filter(Boolean) as NonNullable<ReturnType<typeof normalizeSubField>>[] : [] };
        });
        setAdvancedOptions(advOpts);
      } else {
        setAdvancedOptions(editingField.advancedOptions || []);
      }
      // TODO: pré-remplir les dépendances, modules, conditions si besoin
    }
  }, [editingField, normalizeSubField]);

  // Utilitaire pour générer un id unique
  function uniqueId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substr(2, 9) + Date.now();
  }

  // Gestion récursive pour les sous-champs de type select
  const normalizeSubField = useCallback((sf: { id?: string; label?: string; type?: string; options?: unknown }): { id: string; label: string; type: string; options?: { id: string; label: string }[] } | null => {
    if (!sf.label || !sf.label.trim() || !sf.type) return null;
    if (sf.type === 'select') {
      const options = Array.isArray(sf.options)
        ? (sf.options as unknown[])
            .filter(o => (typeof o === 'string' && o.trim() !== '') || (typeof o === 'object' && o !== null && 'label' in o && typeof (o as { label?: string }).label === 'string' && (o as { label: string }).label.trim() !== ''))
            .map(o => typeof o === 'string' ? { id: uniqueId(), label: o } : { id: (o as { id?: string }).id || uniqueId(), label: (o as { label: string }).label })
        : [];
      return { id: sf.id || uniqueId(), label: sf.label, type: 'select', options };
    }
    return { id: sf.id || uniqueId(), label: sf.label, type: sf.type };
  }, []);

  function normalizeOptions(type: string, placeholder: unknown, advancedOptions: AdvancedOption[]): (FieldOption | AdvancedOption)[] {
    if (type === 'advanced_select') {
      // On filtre les options sans label et on structure chaque sous-champ
      return (advancedOptions || [])
        .filter(opt => opt.label && opt.label.trim() !== '')
        .map(opt => {
          if (!opt.id) {
            console.warn('[AddFieldModal][normalizeOptions] Option advanced_select sans id détectée !', opt);
          }
          return {
            id: opt.id || uniqueId(),
            label: opt.label,
            subFields: Array.isArray(opt.subFields)
              ? opt.subFields.map(sf => { if (!sf.id) console.warn('[AddFieldModal][normalizeOptions] Sous-champ advanced_select sans id détecté !', sf); return normalizeSubField(sf); }).filter(Boolean) as NonNullable<ReturnType<typeof normalizeSubField>>[]
              : []
          };
        });
    }
    if (["select", "checkboxes", "radio"].includes(type) && Array.isArray(placeholder)) {
      return (placeholder as FieldOption[])
        .filter(opt => typeof opt.label === 'string' && opt.label.trim() !== '')
        .map(opt => {
          return { 
            id: opt.id || uniqueId(), 
            label: opt.label,
            value: opt.value && opt.value.trim() !== '' ? opt.value.trim() : slugify(opt.label)
          };
        });
    }
    return [];
  }

  // Ajout d'une option advanced_select
  function addAdvancedOption() {
    setAdvancedOptions([...advancedOptions, { id: uniqueId(), label: '', subFields: [] }]);
  }

  // Ajout d'un sous-champ à une option
  function addSubField(optIdx: number) {
    const copy = [...advancedOptions];
    copy[optIdx].subFields = copy[optIdx].subFields || [];
    copy[optIdx].subFields.push({ id: uniqueId(), label: '', type: 'text' });
    setAdvancedOptions(copy);
  }

  // Ajout d'une option à un sous-champ de type select
  function addSubFieldOption(optIdx: number, sfIdx: number) {
    const copy = [...advancedOptions];
    const sf = copy[optIdx].subFields[sfIdx];
    if (!sf.options) sf.options = [];
    if (Array.isArray(sf.options)) {
      (sf.options as AdvancedSubFieldOption[]).push({ id: uniqueId(), label: '' });
    }
    setAdvancedOptions(copy);
  }

  // Fonctions utilitaires pour les options simples
  function addSimpleOption() {
    setPlaceholder(prev => {
      const newId = `new-${uniqueId()}`;
      if (Array.isArray(prev)) {
        return [...prev, {id: newId, label: '', value: ''}];
      } else {
        return [{id: newId, label: '', value: ''}];
      }
    });
  }
  function updateSimpleOption(idx: number, part: { label?: string; value?: string }) {
    setPlaceholder(prev => {
      if (!Array.isArray(prev)) return prev;
      const copy = [...(prev as FieldOption[])];
      const option = { ...copy[idx] };

      if (part.label !== undefined) {
        option.label = part.label;
        // Si la valeur était vide ou correspondait à l'ancien slug, on la met à jour.
        // Cela préserve une valeur personnalisée.
        const oldLabel = copy[idx].label;
        if (option.value === '' || option.value === slugify(oldLabel)) {
            option.value = slugify(part.label);
        }
      }

      if (part.value !== undefined) {
        option.value = part.value;
      }
      
      copy[idx] = option;
      return copy;
    });
  }
  function removeSimpleOption(idx: number) {
    setPlaceholder(prev => {
      if (Array.isArray(prev)) {
        return prev.filter((_, i) => i !== idx);
      } else {
        return prev;
      }
    });
  }

  // Quand le type de champ change, on réinitialise placeholder si besoin
  useEffect(() => {
    const isOptionType = ["select", "checkboxes", "radio"].includes(type);

    if (isOptionType) {
      if (!Array.isArray(placeholder)) {
        setPlaceholder([]);
        return;
      }

      const cleanedOptions = placeholder.filter(opt => opt && typeof opt.label === 'string');
      if (cleanedOptions.length !== placeholder.length) {
        setPlaceholder(cleanedOptions);
      }
    } else if (Array.isArray(placeholder)) {
      setPlaceholder("");
    }
  }, [placeholder, type]);

  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    setError(null);
    // Vérification options obligatoires pour les types à options
    if (FIELD_TYPES_WITH_OPTIONS.includes(type)) {
      const opts = normalizeOptions(type, placeholder, advancedOptions);
      if (!opts || opts.length === 0) {
        setError('Veuillez renseigner au moins une option.');
        return;
      }
    }
    if (type === 'advanced_select') {
      const advOpts = normalizeOptions(type, placeholder, advancedOptions);
      if (!advOpts || advOpts.length === 0) {
        setError('Veuillez renseigner au moins une option avancée.');
        return;
      }
    }
    // Construction de l'objet field à transmettre
    const field: { type: string; label: string; required: boolean; width: string; advancedOptions?: AdvancedOption[]; options?: FieldOption[]; placeholder?: string; dependencies: { parentField: string; parentValue: string }[]; modules: string[]; conditions: { sourceField: string; value: string; action: string }[] } = {
      type,
      label: label.trim(),
      required,
      width,
      ...(type === 'advanced_select'
        ? { advancedOptions: normalizeOptions(type, placeholder, advancedOptions) as AdvancedOption[] }
        : FIELD_TYPES_WITH_OPTIONS.includes(type)
          ? { options: normalizeOptions(type, placeholder, advancedOptions) as FieldOption[] }
          : { placeholder: typeof placeholder === 'string' ? placeholder : '' }),
      dependencies,
      modules,
      conditions,
    };
    if (onAdd) {
      onAdd(field);
    }
    // ...fermeture modale...
  };

  // Effet de diagnostic retiré (bruit console). Conserver si besoin futur debug.
  // React.useEffect(() => { return () => {}; }, []);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-2">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-full sm:max-w-lg p-2 sm:p-6 md:p-8 relative border border-blue-100 max-h-screen overflow-y-auto">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
          onClick={onClose}
        >
          <XMarkIcon className="w-7 h-7" />
        </button>
        <h2 className="text-2xl font-bold mb-1">Ajouter un champ</h2>
        <p className="text-gray-500 mb-6">Configurez les propriétés du champ à ajouter à votre formulaire.</p>
        <div className="flex border-b mb-6">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`px-4 py-2 font-medium transition ${
                tab === t.key
                  ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div>
          {tab === 'base' && (
            <div className="space-y-6">
              {/* Sélecteur de type de champ natif pour diagnostic bug DOM */}
              <div>
                <label className="block font-semibold mb-1">Type de champ</label>
                <select
                  className="border rounded-lg p-3 w-full text-lg bg-white"
                  value={type}
                  onChange={e => setType(e.target.value)}
                  data-testid="native-type-select"
                >
                  {FIELD_TYPES.map(ft => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Nom du champ</label>
                <input
                  className="border p-2 rounded-lg w-full text-sm sm:text-base"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="Nom du champ"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Texte d'exemple</label>
                <input
                  className="border p-2 rounded-lg w-full text-sm sm:text-base"
                  value={typeof placeholder === 'string' ? placeholder : ''}
                  onChange={e => setPlaceholder(e.target.value)}
                  placeholder="Ex: Entrez votre réponse ici"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={e => setRequired(e.target.checked)}
                  id="required"
                  className="accent-blue-600 scale-125"
                />
                <label htmlFor="required" className="text-sm">Ce champ est obligatoire</label>
              </div>
              <div>
                <label className="block font-semibold mb-1">Taille du champ (admin)</label>
                <select
                  className="border rounded-lg p-2 w-full text-lg"
                  value={width}
                  onChange={e => setWidth(e.target.value)}
                >
                  {FIELD_WIDTHS.map(w => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
              </div>
              {FIELD_TYPES_WITH_OPTIONS.includes(type) && !['advanced_select'].includes(type) && (
                <div className="space-y-2 border rounded-lg p-4 bg-blue-50 mt-4">
                  <div className="font-semibold mb-2">Options de la liste</div>
                  {Array.isArray(placeholder) && placeholder.map((opt, idx) => (
                    <div key={opt.id || idx} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
                      <input
                        className="border rounded p-2 w-full"
                        placeholder={`Libellé Option ${idx + 1}`}
                        value={opt.label}
                        onChange={e => updateSimpleOption(idx, { label: e.target.value })}
                      />
                      <div className="flex items-center gap-2">
                        <input
                            className="border rounded p-2 w-full"
                            placeholder={`Valeur (auto)`}
                            value={opt.value}
                            onChange={e => updateSimpleOption(idx, { value: e.target.value })}
                        />
                        <button
                            className="text-red-500 font-bold"
                            onClick={() => removeSimpleOption(idx)}
                            title="Supprimer l'option"
                            type="button"
                        >✕</button>
                      </div>
                    </div>
                  ))}
                  <button
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm"
                    onClick={addSimpleOption}
                    type="button"
                  >
                    Ajouter une option
                  </button>
                </div>
              )}
              {type === 'advanced_select' && (
                <div key="advanced-select-block" className="space-y-4 border rounded-lg p-4 bg-blue-50 mt-4">
                  <div className="font-semibold mb-2">Options de la liste déroulante avancée</div>
                  {advancedOptions.map((opt, idx) => (
                    <div key={opt.id} className="mb-4 border-b pb-2">
                      <div className="flex gap-2 items-center mb-2">
                        <input
                          className="border rounded p-2 flex-1"
                          placeholder={`Option ${idx + 1} (ex: Gauche, Droite)`}
                          value={opt.label}
                          onChange={e => {
                            const copy = [...advancedOptions];
                            copy[idx].label = e.target.value;
                            setAdvancedOptions(copy);
                          }}
                        />
                        <button
                          className="text-red-500 font-bold"
                          onClick={() => setAdvancedOptions(advancedOptions.filter((_, i) => i !== idx))}
                          title="Supprimer l'option"
                          type="button"
                        >✕</button>
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-sm mb-1">Sous-champs pour cette option :</div>
                        {opt.subFields?.map((sf, sfIdx) => (
                          <div key={sf.id} className="flex flex-col gap-1 mb-2">
                            <div className="flex gap-2 items-center">
                              <input
                                className="border rounded p-1 flex-1"
                                placeholder="Nom du sous-champ"
                                value={sf.label}
                                onChange={e => {
                                  const copy = [...advancedOptions];
                                  copy[idx].subFields[sfIdx].label = e.target.value;
                                  setAdvancedOptions(copy);
                                }}
                              />
                              <select
                                className="border rounded p-1"
                                value={sf.type}
                                onChange={e => {
                                  const copy = [...advancedOptions];
                                  copy[idx].subFields[sfIdx].type = e.target.value;
                                  // Initialise les options si on passe sur 'select'
                                  if (e.target.value === 'select' && !copy[idx].subFields[sfIdx].options) {
                                    copy[idx].subFields[sfIdx].options = [{ id: uniqueId(), label: '' }];
                                  }
                                  setAdvancedOptions(copy);
                                }}
                              >
                                <option value="text">Texte</option>
                                <option value="number">Nombre</option>
                                <option value="date">Date</option>
                                <option value="select">Liste déroulante</option>
                              </select>
                              <button
                                className="text-red-400"
                                onClick={() => {
                                  const copy = [...advancedOptions];
                                  copy[idx].subFields.splice(sfIdx, 1);
                                  setAdvancedOptions(copy);
                                }}
                                type="button"
                                title="Supprimer le sous-champ"
                              >✕</button>
                            </div>
                            {/* Si le sous-champ est une liste déroulante, affiche la gestion des options */}
                            {sf.type === 'select' && (
                              <div className="ml-4 mt-1">
                                <div className="text-xs font-medium mb-1">Options de la liste déroulante</div>
                                {(Array.isArray(sf.options) ? sf.options : []).map((optVal: unknown, optValIdx: number) => (
                                  <div key={typeof optVal === 'object' && 'id' in optVal ? optVal.id : optValIdx} className="flex gap-2 mb-1 items-center">
                                    <input
                                      className="border rounded p-1 flex-1"
                                      placeholder={`Option ${optValIdx + 1}`}
                                      value={typeof optVal === 'object' && 'label' in optVal ? optVal.label : optVal}
                                      onChange={e => {
                                        const copy = [...advancedOptions];
                                        if (Array.isArray(copy[idx].subFields[sfIdx].options)) {
                                          if (typeof optVal === 'object' && 'id' in optVal) {
                                            (copy[idx].subFields[sfIdx].options as AdvancedSubFieldOption[])[optValIdx].label = e.target.value;
                                          } else {
                                            (copy[idx].subFields[sfIdx].options as string[])[optValIdx] = e.target.value;
                                          }
                                          setAdvancedOptions(copy);
                                        }
                                      }}
                                    />
                                    <button
                                      className="text-red-400"
                                      onClick={() => {
                                        const copy = [...advancedOptions];
                                        if (Array.isArray(copy[idx].subFields[sfIdx].options)) {
                                          (copy[idx].subFields[sfIdx].options as unknown[]).splice(optValIdx, 1);
                                          setAdvancedOptions(copy);
                                        }
                                      }}
                                      type="button"
                                      title="Supprimer l'option"
                                    >✕</button>
                                  </div>
                                ))}
                                <button
                                  className="text-blue-600 text-xs"
                                  type="button"
                                  onClick={() => addSubFieldOption(idx, sfIdx)}
                                >+ Ajouter une option</button>
                              </div>
                            )}
                          </div>
                        ))}
                        <button
                          className="text-blue-600 text-sm mt-1"
                          type="button"
                          onClick={() => addSubField(idx)}
                        >+ Ajouter un sous-champ</button>
                      </div>
                    </div>
                  ))}
                  <button
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm"
                    type="button"
                    onClick={addAdvancedOption}
                  >+ Ajouter une option</button>
                </div>
              )}
              {type === 'checkboxes' && (
                <div key="checkboxes-block" className="space-y-2 border rounded-lg p-4 bg-green-50 mt-4">
                  <div className="font-semibold mb-2">Options des cases à cocher</div>
                  {Array.isArray(placeholder) && placeholder.length === 0 && (
                    <div className="text-gray-400 text-sm">Ajoute tes premières options !</div>
                  )}
                  {Array.isArray(placeholder) &&
                    placeholder.map((opt, idx) => (
                      <div key={opt.id} className="flex gap-2 mb-1 items-center">
                        <input
                          className="border rounded p-2 flex-1"
                          placeholder={`Option ${idx + 1}`}
                          value={opt.label}
                          onChange={e => updateSimpleOption(idx, e.target.value)}
                        />
                        <button
                          className="text-red-500 font-bold"
                          onClick={() => removeSimpleOption(idx)}
                          type="button"
                          title="Supprimer l'option"
                        >✕</button>
                      </div>
                    ))}
                  <button
                    className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm"
                    type="button"
                    onClick={addSimpleOption}
                  >+ Ajouter une option</button>
                </div>
              )}
              {type === 'radio' && (
                <div key="radio-block" className="space-y-2 border rounded-lg p-4 bg-purple-50 mt-4">
                  <div className="font-semibold mb-2">Options des boutons radio</div>
                  {Array.isArray(placeholder) && placeholder.length === 0 && (
                    <div className="text-gray-400 text-sm">Ajoute tes premières options !</div>
                  )}
                  {Array.isArray(placeholder) &&
                    placeholder.map((opt, idx) => (
                      <div key={opt.id} className="flex gap-2 mb-1 items-center">
                        <input
                          className="border rounded p-2 flex-1"
                          placeholder={`Option ${idx + 1}`}
                          value={opt.label}
                          onChange={e => updateSimpleOption(idx, e.target.value)}
                        />
                        <button
                          className="text-red-500 font-bold"
                          onClick={() => removeSimpleOption(idx)}
                          type="button"
                          title="Supprimer l'option"
                        >✕</button>
                      </div>
                    ))}
                  <button
                    className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-sm"
                    type="button"
                    onClick={addSimpleOption}
                  >+ Ajouter une option</button>
                </div>
              )}
              {(type === 'file' || type === 'files') && (
                <div key="file-block" className="space-y-2 border rounded-lg p-4 bg-gray-50 mt-4">
                  <div className="font-semibold mb-2">Extensions autorisées</div>
                  <input
                    className="border rounded p-2 w-full"
                    placeholder="Exemple : jpg, png, pdf (séparés par des virgules)"
                    value={typeof placeholder === 'string' ? placeholder : ''}
                    onChange={e => setPlaceholder(e.target.value)}
                  />
                </div>
              )}
              {type === 'select' && (
                <div key="select-block" className="space-y-2 border rounded-lg p-4 bg-blue-50 mt-4">
                  <div className="font-semibold mb-2">Options de la liste déroulante</div>
                  {Array.isArray(placeholder) && placeholder.length === 0 && (
                    <div className="text-gray-400 text-sm">Ajoute tes premières options !</div>
                  )}
                  {Array.isArray(placeholder) &&
                    placeholder.map((opt, idx) => (
                      <div key={opt.id} className="flex gap-2 mb-1 items-center">
                        <input
                          className="border rounded p-2 flex-1"
                          placeholder={`Option ${idx + 1}`}
                          value={opt.label}
                          onChange={e => updateSimpleOption(idx, e.target.value)}
                        />
                        <button
                          className="text-red-500 font-bold"
                          onClick={() => removeSimpleOption(idx)}
                          type="button"
                          title="Supprimer l'option"
                        >✕</button>
                      </div>
                    ))}
                  <button
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm"
                    type="button"
                    onClick={addSimpleOption}
                  >+ Ajouter une option</button>
                </div>
              )}
              {/* Bouton de test supprimé pour réduire le bruit */}
            </div>
          )}
          {tab === 'dependencies' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-4">
                <div className="font-semibold text-yellow-700 mb-1">Dépendances</div>
                <div className="text-yellow-700 text-sm">
                  Configurez les liens entre ce champ et d'autres champs du formulaire.
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Champ parent</label>
                <select
                  className="border rounded-lg p-2 w-full text-lg"
                  value={parentField}
                  onChange={e => setParentField(e.target.value)}
                >
                  <option value="">Sélectionnez un champ</option>
                  {existingFields.map(f => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Valeur attendue</label>
                <input
                  className="border p-2 rounded-lg w-full text-sm sm:text-base"
                  placeholder="Valeur…"
                  value={parentValue}
                  onChange={e => setParentValue(e.target.value)}
                  disabled={!parentField}
                />
              </div>
              <button
                className="bg-yellow-400 text-white px-3 py-1 rounded text-sm mt-2"
                type="button"
                onClick={addDependency}
                disabled={!parentField || !parentValue}
              >+ Ajouter la dépendance</button>
              {dependencies.length > 0 && (
                <div className="mt-4">
                  <div className="font-semibold mb-1 text-sm">Dépendances ajoutées :</div>
                  <ul className="space-y-1">
                    {dependencies.map((dep, idx) => (
                      <li key={dep.parentField + '-' + dep.parentValue} className="flex items-center gap-2 text-sm bg-yellow-100 rounded px-2 py-1">
                        <span>Si <b>{existingFields.find(f => f.id === dep.parentField)?.label || dep.parentField}</b> = <b>{dep.parentValue}</b></span>
                        <button className="text-red-500 ml-2" onClick={() => removeDependency(idx)} title="Supprimer">✕</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {tab === 'modules' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mb-4">
                <div className="font-semibold text-blue-700 mb-1">Modules</div>
                <div className="text-blue-700 text-sm">Associez ce champ à un ou plusieurs modules métiers.</div>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {MODULES_LIST.map(module => (
                  <button
                    key={module}
                    className={`px-3 py-1 rounded border ${modules.includes(module) ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border-blue-300'}`}
                    type="button"
                    onClick={() => toggleModule(module)}
                  >{module}</button>
                ))}
              </div>
              {modules.length > 0 && (
                <div className="mt-2">
                  <div className="font-semibold mb-1 text-sm">Modules sélectionnés :</div>
                  <ul className="flex flex-wrap gap-2">
                    {modules.map(module => (
                      <li key={module} className="bg-blue-100 text-blue-700 rounded px-2 py-1 flex items-center gap-1 text-xs">
                        {module}
                        <button className="text-red-500 ml-1" onClick={() => removeModule(module)} title="Retirer">✕</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {tab === 'conditions' && (
            <div className="space-y-4">
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded mb-4">
                <div className="font-semibold text-orange-700 mb-1">Conditions d'affichage</div>
                <div className="text-orange-700 text-sm">
                  Configurez quand ce champ doit apparaître ou disparaître selon les valeurs d'autres champs.
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Champ source</label>
                  <select
                    className="border rounded-lg p-2 w-full text-lg"
                    value={condField}
                    onChange={e => setCondField(e.target.value)}
                  >
                    <option value="">Sélectionnez un champ</option>
                    {existingFields.map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Valeur source</label>
                  <input
                    className="border p-2 rounded-lg w-full text-sm sm:text-base"
                    placeholder="Valeur…"
                    value={condValue}
                    onChange={e => setCondValue(e.target.value)}
                    disabled={!condField}
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Action</label>
                <select className="border rounded-lg p-2 w-full text-lg" value={condAction} onChange={e => setCondAction(e.target.value)}>
                  <option value="show">Afficher ce champ si la condition est vraie</option>
                  <option value="hide">Masquer ce champ si la condition est vraie</option>
                </select>
              </div>
              <button
                className="bg-orange-400 text-white px-3 py-1 rounded text-sm mt-2"
                type="button"
                onClick={addCondition}
                disabled={!condField || !condValue}
              >+ Ajouter la condition</button>
              {conditions.length > 0 && (
                <div className="mt-4">
                  <div className="font-semibold mb-1 text-sm">Conditions ajoutées :</div>
                  <ul className="space-y-1">
                    {conditions.map((cond, idx) => (
                      <li key={cond.sourceField + '-' + cond.value + '-' + cond.action + '-' + idx} className="flex items-center gap-2 text-sm bg-orange-100 rounded px-2 py-1">
                        <span>
                          {cond.action === 'show' ? 'Afficher' : 'Masquer'} si <b>{existingFields.find(f => f.id === cond.sourceField)?.label || cond.sourceField}</b> = <b>{cond.value}</b>
                        </span>
                        <button className="text-red-500 ml-2" onClick={() => removeCondition(idx)} title="Supprimer">✕</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-8">
          <button className="px-4 py-2 rounded border" onClick={onClose}>Annuler</button>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white font-bold shadow"
            onClick={handleAdd}
            disabled={!label.trim()}
          >
            Ajouter
          </button>
        </div>
        <div>
          {error && <div className="text-red-500 font-semibold mb-2">{error}</div>}
        </div>
      </div>
    </div>
  );
}