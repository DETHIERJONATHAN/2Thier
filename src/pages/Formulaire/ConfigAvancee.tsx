import React, { useState, useMemo, useEffect } from 'react'; // <-- AJOUTER useMemo et useEffect ICI
import { useParams } from 'react-router-dom';
import useCRMStore from '../../store';
import { FieldFormulasEditorNew } from '../../components/formulas'; // <-- AJOUTER LES ACCOLADES ICI
import { FieldValidationsEditor } from '../../components/validations'; 
import FieldDependenciesEditor from '../../components/dependencies/FieldDependenciesEditor';
import FormulaireRemplissage from '../Formulaire/FormulaireRemplissage';
import { InformationCircleIcon, BeakerIcon, ShieldCheckIcon, LinkIcon, EyeIcon, CodeBracketIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { FIELD_TYPES, FIELD_TYPES_WITH_OPTIONS } from '../../fieldTypes';

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

export type FieldOption = StoreFieldOption;

interface AdvancedConfigPanelProps {
  selectedField: { sectionId: string | number; fieldId: string | number } | null;
  onClose: () => void;
}

const TABS = [
  { key: 'parametres', label: 'Paramètres', icon: <InformationCircleIcon className="w-5 h-5 mr-1" />, tooltip: 'Propriétés simples du champ' },
  { key: 'formules', label: 'Formules', icon: <BeakerIcon className="w-5 h-5 mr-1" />, tooltip: 'Éditeur de formules dynamiques' },
  { key: 'validations', label: 'Validations', icon: <ShieldCheckIcon className="w-5 h-5 mr-1" />, tooltip: 'Règles de validation du champ' },
  { key: 'dependances', label: 'Dépendances', icon: <LinkIcon className="w-5 h-5 mr-1" />, tooltip: 'Dépendances et conditions' },
  { key: 'champ', label: 'Champ', icon: <DocumentTextIcon className="w-5 h-5 mr-1" />, tooltip: 'Éditeur JSON du champ' },
  { key: 'preview', label: 'Preview', icon: <EyeIcon className="w-5 h-5 mr-1" />, tooltip: 'Prévisualiser le formulaire comme un utilisateur' },
  { key: 'technique', label: 'Technique', icon: <CodeBracketIcon className="w-5 h-5 mr-1" />, tooltip: 'Données brutes du champ (lecture seule)' },
];

const AdvancedConfigPanel: React.FC<AdvancedConfigPanelProps> = ({ selectedField }) => {
  const [lastFieldId, setLastFieldId] = useState<string|number|undefined>(undefined);
  const [activeTab, setActiveTab] = useState('parametres');
  const { blocks, updateField, fieldMetaCounts } = useCRMStore();

  const fieldId = selectedField?.fieldId;

  // Retrouver le champ à partir de son ID avec useMemo pour éviter les re-renders
  const field = useMemo(() => {
    if (!fieldId) return null;
    
    for (const block of blocks) {
      for (const s of block.sections ?? []) {
        const foundField = s.fields.find(f => String(f.id) === String(fieldId));
        if (foundField) {
          return foundField;
        }
      }
    }
    return null;
  }, [fieldId, blocks]);
  
  const advancedConfig = field?.advancedConfig || {};

  const [saving, setSaving] = useState<{[k:string]:boolean}>({});
  const [saveError, setSaveError] = useState<{[k:string]:string|null}>({});
  const [localValues, setLocalValues] = useState<{[k:string]:any}>({});
  const [jsonEditorValue, setJsonEditorValue] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (field) {
      setJsonEditorValue(JSON.stringify(field, null, 2));
      setJsonError(null);
    }
  }, [field]);

  useEffect(() => {
    if (fieldId && fieldId !== lastFieldId) {
      setLocalValues({});
      // Ne pas forcer le retour à l'onglet 'parametres' pour éviter les fermetures intempestives
      // setActiveTab('parametres');
      setLastFieldId(fieldId);
    }
  }, [fieldId, lastFieldId]);
  
  // Effet pour assurer que les formules sont visibles quand on clique sur l'onglet formules
  useEffect(() => {
    if (activeTab === 'formules' && fieldId) {
      // Si on active l'onglet formules, assurons-nous de charger les métadonnées pour afficher les formules
      const { fetchFieldMetaCounts } = useCRMStore.getState();
      fetchFieldMetaCounts([fieldId]);
    }
  }, [activeTab, fieldId]);

  const saveFieldChange = (payload: Partial<Field>) => {
    if (!fieldId) return Promise.reject(new Error("No field selected"));
    return updateField(String(fieldId), payload);
  };

  const handleJsonEditorSave = () => {
    if (!fieldId) return;
    try {
      const newFieldData = JSON.parse(jsonEditorValue);
      setJsonError(null);
      setSaving(s => ({ ...s, jsonEditor: true }));
      updateField(String(fieldId), newFieldData)
        .then(() => {
          setSaving(s => ({ ...s, jsonEditor: false }));
        })
        .catch(err => {
          setSaving(s => ({ ...s, jsonEditor: false }));
          setJsonError(err?.message || 'Erreur de sauvegarde');
        });
    } catch (err: any) {
      setJsonError('JSON invalide : ' + err.message);
    }
  };

  const handleAdvancedChange = (key: string, value: any) => {
    if (!fieldId) return;
    setLocalValues(v => ({ ...v, [key]: value }));
    setSaving(s => ({ ...s, [key]: true }));
    setSaveError(e => ({ ...e, [key]: null }));
    saveFieldChange({ advancedConfig: { ...advancedConfig, [key]: value } })
      .then(() => {
        setSaving(s => ({ ...s, [key]: false }));
      })
      .catch(err => {
        setSaving(s => ({ ...s, [key]: false }));
        setSaveError(e => ({ ...e, [key]: err?.message || 'Erreur de sauvegarde' }));
      });
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!fieldId) return;
    const value = e.target.value;
    setLocalValues(v => ({ ...v, label: value }));
    setSaving(s => ({ ...s, label: true }));
    setSaveError(e => ({ ...e, label: null }));
    saveFieldChange({ label: value })
      .then(() => setSaving(s => ({ ...s, label: false })))
      .catch(err => {
        setSaving(s => ({ ...s, label: false }));
        setSaveError(e => ({ ...e, label: err?.message || 'Erreur de sauvegarde' }));
      });
  };
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!fieldId) return;
    const value = e.target.value;
    setLocalValues(v => ({ ...v, type: value }));
    setSaving(s => ({ ...s, type: true }));
    setSaveError(e => ({ ...e, type: null }));
    saveFieldChange({ type: value })
      .then(() => setSaving(s => ({ ...s, type: false })))
      .catch(err => {
        setSaving(s => ({ ...s, type: false }));
        setSaveError(e => ({ ...e, type: err?.message || 'Erreur de sauvegarde' }));
      });
  };
  const handleRequiredChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!fieldId) return;
    const value = e.target.checked;
    setLocalValues(v => ({ ...v, required: value }));
    setSaving(s => ({ ...s, required: true }));
    setSaveError(e => ({ ...e, required: null }));
    saveFieldChange({ required: value })
      .then(() => setSaving(s => ({ ...s, required: false })))
      .catch(err => {
        setSaving(s => ({ ...s, required: false }));
        setSaveError(e => ({ ...e, required: err?.message || 'Erreur de sauvegarde' }));
      });
  };
  const handleWidthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!fieldId) return;
    const value = e.target.value;
    setLocalValues(v => ({ ...v, width: value }));
    setSaving(s => ({ ...s, width: true }));
    setSaveError(e => ({ ...e, width: null }));
    saveFieldChange({ width: value })
      .then(() => setSaving(s => ({ ...s, width: false })))
      .catch(err => {
        setSaving(s => ({ ...s, width: false }));
        setSaveError(e => ({ ...e, width: err?.message || 'Erreur de sauvegarde' }));
      });
  };

  if (!selectedField || !fieldId || !field) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 italic">
        <InformationCircleIcon className="w-8 h-8 mb-2 text-blue-200" />
        Aucun champ sélectionné
      </div>
    );
  }

  return (
    <aside className="h-full flex flex-col bg-white rounded-lg shadow p-4 border border-gray-100">
      <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
        <BeakerIcon className="w-6 h-6 text-blue-500" />
        Configuration avancée du champ
      </h2>
      <nav
        className="flex flex-wrap w-full max-w-full border-b mb-4 gap-2 justify-center items-center"
        aria-label="Onglets de configuration avancée"
        style={{
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
        }}
      >
        {TABS.map(tab => {
          let badge = null;
          let highlight = false;
          if (fieldId) {
            if (tab.key === 'formules' && fieldMetaCounts[fieldId]?.formulas > 0) {
              badge = <span className="ml-1 inline-block w-2 h-2 rounded-full bg-blue-500" title="Formules présentes"></span>;
              highlight = true;
            }
            if (tab.key === 'validations' && fieldMetaCounts[fieldId]?.validations > 0) {
              badge = <span className="ml-1 inline-block w-2 h-2 rounded-full bg-blue-500" title="Validations présentes"></span>;
              highlight = true;
            }
            if (tab.key === 'dependances' && fieldMetaCounts[fieldId]?.dependencies > 0) {
              badge = <span className="ml-1 inline-block w-2 h-2 rounded-full bg-blue-500" title="Dépendances présentes"></span>;
              highlight = true;
            }
          }
          const isActive = activeTab === tab.key;
          const baseClass = 'flex-1 min-w-0 px-1 py-1 border-b-2 flex flex-col items-center gap-1 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-t text-xs sm:text-sm';
          let tabClass = baseClass;
          if (isActive) {
            tabClass += ' border-blue-600 text-blue-700 font-bold bg-blue-50';
          } else if (highlight) {
            tabClass += ' border-blue-300 text-blue-700 bg-blue-100 font-semibold';
          } else {
            tabClass += ' border-transparent text-gray-500 hover:bg-gray-50';
          }
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={tabClass}
              title={tab.tooltip}
            >
              <div className="flex items-center justify-center">
                {tab.icon}
                <span className="truncate">{tab.label}</span>
                {badge}
              </div>
            </button>
          );
        })}
      </nav>
      <div className="block xs:hidden font-semibold text-base mb-2 text-blue-700">
        {TABS.find(t => t.key === activeTab)?.label}
      </div>
      <section className="flex-1 overflow-y-auto" tabIndex={0} aria-live="polite">
        {activeTab === 'parametres' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Nom du champ</label>
              <div className="flex items-center gap-2">
                <input type="text" className="input input-bordered w-full" value={localValues.label ?? (field.label || '')} onChange={handleLabelChange} />
                {saving.label && <span className="animate-spin text-blue-500">⏳</span>}
                {saveError.label && <span className="text-red-500" title={saveError.label}>⚠️</span>}
                {!saving.label && !saveError.label && localValues.label !== undefined && localValues.label !== field.label && <span className="text-green-500">✔️</span>}
              </div>
              <div className="text-xs text-gray-500 mt-1">Le label affiché à l’utilisateur.</div>
            </div>
            <div>
              <label className="block text-sm font-medium">Type de champ</label>
              <div className="flex items-center gap-2">
                <select className="input input-bordered w-full" value={localValues.type ?? (field.type || '')} onChange={handleTypeChange}>
                  {FIELD_TYPES.map(ft => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
                </select>
                {saving.type && <span className="animate-spin text-blue-500">⏳</span>}
                {saveError.type && <span className="text-red-500" title={saveError.type}>⚠️</span>}
                {!saving.type && !saveError.type && localValues.type !== undefined && localValues.type !== field.type && <span className="text-green-500">✔️</span>}
              </div>
              <div className="text-xs text-gray-500 mt-1">Détermine le format de saisie (texte, nombre, date, etc.).</div>
            </div>
            {FIELD_TYPES_WITH_OPTIONS.includes(localValues.type ?? field.type) && (
              <div>
                <label className="block text-sm font-medium">Options</label>
                <OptionsEditor
                  fieldId={String(fieldId)}
                  options={field.options ?? []}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={localValues.required ?? (field.required || false)} onChange={handleRequiredChange} />
              <span>Obligatoire</span>
              {saving.required && <span className="animate-spin text-blue-500">⏳</span>}
              {saveError.required && <span className="text-red-500" title={saveError.required}>⚠️</span>}
              {!saving.required && !saveError.required && localValues.required !== undefined && localValues.required !== field.required && <span className="text-green-500">✔️</span>}
              <span className="text-xs text-gray-500 ml-2">L’utilisateur doit remplir ce champ pour valider le formulaire.</span>
            </div>
            <div>
              <label className="block text-sm font-medium">Taille</label>
              <div className="flex items-center gap-2">
                <select className="input input-bordered w-full" value={localValues.width ?? (field.width || '1/1')} onChange={handleWidthChange}>
                  <option value="1/4">1/4</option>
                  <option value="1/2">1/2</option>
                  <option value="3/4">3/4</option>
                  <option value="1/1">Plein</option>
                </select>
                {saving.width && <span className="animate-spin text-blue-500">⏳</span>}
                {saveError.width && <span className="text-red-500" title={saveError.width}>⚠️</span>}
                {!saving.width && !saveError.width && localValues.width !== undefined && localValues.width !== field.width && <span className="text-green-500">✔️</span>}
              </div>
              <div className="text-xs text-gray-500 mt-1">Largeur du champ dans le formulaire.</div>
            </div>
            <div>
              <label className="block text-sm font-medium">Valeur par défaut</label>
              <div className="flex items-center gap-2">
                <input type="text" className="input input-bordered w-full" value={localValues.defaultValue ?? advancedConfig.defaultValue ?? ''} onChange={e => handleAdvancedChange('defaultValue', e.target.value)} />
                {saving.defaultValue && <span className="animate-spin text-blue-500">⏳</span>}
                {saveError.defaultValue && <span className="text-red-500" title={saveError.defaultValue}>⚠️</span>}
                {!saving.defaultValue && !saveError.defaultValue && localValues.defaultValue !== undefined && localValues.defaultValue !== advancedConfig.defaultValue && <span className="text-green-500">✔️</span>}
              </div>
              <div className="text-xs text-gray-500 mt-1">Pré-remplit le champ avec cette valeur.</div>
            </div>
            <div>
              <label className="block text-sm font-medium">Placeholder / Info-bulle</label>
              <div className="flex items-center gap-2">
                <input type="text" className="input input-bordered w-full" value={localValues.placeholder ?? advancedConfig.placeholder ?? ''} onChange={e => handleAdvancedChange('placeholder', e.target.value)} />
                {saving.placeholder && <span className="animate-spin text-blue-500">⏳</span>}
                {saveError.placeholder && <span className="text-red-500" title={saveError.placeholder}>⚠️</span>}
                {!saving.placeholder && !saveError.placeholder && localValues.placeholder !== undefined && localValues.placeholder !== advancedConfig.placeholder && <span className="text-green-500">✔️</span>}
              </div>
              <div className="text-xs text-gray-500 mt-1">Texte d’aide affiché dans le champ avant saisie.</div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={localValues.readOnly ?? !!advancedConfig.readOnly} onChange={e => handleAdvancedChange('readOnly', e.target.checked)} />
              <span>Lecture seule</span>
              {saving.readOnly && <span className="animate-spin text-blue-500">⏳</span>}
              {saveError.readOnly && <span className="text-red-500" title={saveError.readOnly}>⚠️</span>}
              {!saving.readOnly && !saveError.readOnly && localValues.readOnly !== undefined && localValues.readOnly !== advancedConfig.readOnly && <span className="text-green-500">✔️</span>}
              <span className="text-xs text-gray-500 ml-2">Le champ ne peut pas être modifié par l’utilisateur.</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={localValues.hidden ?? !!advancedConfig.hidden} onChange={e => handleAdvancedChange('hidden', e.target.checked)} />
              <span>Masqué au rendu final</span>
              {saving.hidden && <span className="animate-spin text-blue-500">⏳</span>}
              {saveError.hidden && <span className="text-red-500" title={saveError.hidden}>⚠️</span>}
              {!saving.hidden && !saveError.hidden && localValues.hidden !== undefined && localValues.hidden !== advancedConfig.hidden && <span className="text-green-500">✔️</span>}
              <span className="text-xs text-gray-500 ml-2">Le champ n’apparaît pas dans le formulaire final.</span>
            </div>
            <div>
              <label className="block text-sm font-medium">Icône associée</label>
              <div className="flex items-center gap-2">
                <input type="text" className="input input-bordered w-full" value={localValues.icon ?? advancedConfig.icon ?? ''} onChange={e => handleAdvancedChange('icon', e.target.value)} placeholder="ex: 📅, 🔢, 📝" />
                {saving.icon && <span className="animate-spin text-blue-500">⏳</span>}
                {saveError.icon && <span className="text-red-500" title={saveError.icon}>⚠️</span>}
                {!saving.icon && !saveError.icon && localValues.icon !== undefined && localValues.icon !== advancedConfig.icon && <span className="text-green-500">✔️</span>}
              </div>
              <div className="text-xs text-gray-500 mt-1">Icône affichée à côté du champ.</div>
            </div>
            <div>
              <label className="block text-sm font-medium">Couleur (fond/bordure)</label>
              <div className="flex items-center gap-2">
                <input type="color" className="w-10 h-10 p-0 border-none" value={localValues.color ?? advancedConfig.color ?? '#f4f4f4'} onChange={e => handleAdvancedChange('color', e.target.value)} />
                {saving.color && <span className="animate-spin text-blue-500">⏳</span>}
                {saveError.color && <span className="text-red-500" title={saveError.color}>⚠️</span>}
                {!saving.color && !saveError.color && localValues.color !== undefined && localValues.color !== advancedConfig.color && <span className="text-green-500">✔️</span>}
              </div>
              <div className="text-xs text-gray-500 mt-1">Personnalise la couleur de fond ou bordure du champ.</div>
            </div>
            <div>
              <label className="block text-sm font-medium">Lien vers champ BDD</label>
              <div className="flex items-center gap-2">
                <input type="text" className="input input-bordered w-full" value={localValues.dbField ?? advancedConfig.dbField ?? ''} onChange={e => handleAdvancedChange('dbField', e.target.value)} placeholder="ex: product.name" />
                {saving.dbField && <span className="animate-spin text-blue-500">⏳</span>}
                {saveError.dbField && <span className="text-red-500" title={saveError.dbField}>⚠️</span>}
                {!saving.dbField && !saveError.dbField && localValues.dbField !== undefined && localValues.dbField !== advancedConfig.dbField && <span className="text-green-500">✔️</span>}
              </div>
              <div className="text-xs text-gray-500 mt-1">Champ technique pour lier à une colonne de la base de données.</div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={localValues.technicalTag ?? !!advancedConfig.technicalTag} onChange={e => handleAdvancedChange('technicalTag', e.target.checked)} />
              <span>Tag technique</span>
              {saving.technicalTag && <span className="animate-spin text-blue-500">⏳</span>}
              {saveError.technicalTag && <span className="text-red-500" title={saveError.technicalTag}>⚠️</span>}
              {!saving.technicalTag && !saveError.technicalTag && localValues.technicalTag !== undefined && localValues.technicalTag !== advancedConfig.technicalTag && <span className="text-green-500">✔️</span>}
              <span className="text-xs text-gray-500 ml-2">Champ réservé à un usage technique, non visible pour l’utilisateur.</span>
            </div>
            {['image_admin','image_user'].includes(localValues.type ?? field.type) && (
              <div>
                <label className="block text-sm font-medium">Image à afficher</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => {
                      const url = ev.target?.result;
                      setLocalValues(v => ({ ...v, imageUrl: url }));
                      setSaving(s => ({ ...s, imageUrl: true }));
                      setSaveError(e => ({ ...e, imageUrl: null }));
                      saveFieldChange({ advancedConfig: { ...advancedConfig, imageUrl: url } })
                        .then(() => {
                          setSaving(s => ({ ...s, imageUrl: false }));
                          setSaveError(e => ({ ...e, imageUrl: null }));
                        })
                        .catch(err => {
                          setSaving(s => ({ ...s, imageUrl: false }));
                          const errorMessage = err?.message?.includes('PayloadTooLargeError')
                            ? 'Fichier trop volumineux (max 10Mo).'
                            : (err?.message || 'Erreur de sauvegarde');
                          setSaveError(e => ({ ...e, imageUrl: errorMessage }));
                        });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                {(localValues.imageUrl || advancedConfig.imageUrl) ? (
                  <div className="mt-2 flex flex-col items-start gap-2">
                    <img
                      src={localValues.imageUrl ?? advancedConfig.imageUrl}
                      alt="Aperçu"
                      className="max-h-32 border rounded shadow"
                    />
                    <button
                      type="button"
                      className="btn btn-xs btn-error"
                      onClick={() => {
                        setLocalValues(v => ({ ...v, imageUrl: null }));
                        setSaving(s => ({ ...s, imageUrl: true }));
                        setSaveError(e => ({ ...e, imageUrl: null }));
                        saveFieldChange({ advancedConfig: { ...advancedConfig, imageUrl: null } })
                          .then(() => {
                            setSaving(s => ({ ...s, imageUrl: false }));
                            setSaveError(e => ({ ...e, imageUrl: null }));
                          })
                          .catch(err => {
                            setSaving(s => ({ ...s, imageUrl: false }));
                            setSaveError(e => ({ ...e, imageUrl: err?.message || 'Erreur de sauvegarde' }));
                          });
                      }}
                    >
                      Supprimer l'image
                    </button>
                  </div>
                ) : null}
                {saving.imageUrl && <span className="text-blue-500 ml-2">⏳ Sauvegarde…</span>}
                {saveError.imageUrl && <span className="text-red-500 ml-2">{saveError.imageUrl}</span>}
              </div>
            )}
          </div>
        )}
        {activeTab === 'formules' && (
          <FieldFormulasEditorNew fieldId={field.id} />
        )}
        {activeTab === 'validations' && (
          <FieldValidationsEditor fieldId={field.id} />
        )}
        {activeTab === 'dependances' && (
          <FieldDependenciesEditor fieldId={field.id} />
        )}
        {activeTab === 'champ' && (
          <div className="h-full flex flex-col">
            <p className="text-sm text-gray-600 mb-2">
              Modifiez directement la structure JSON du champ.
            </p>
            <textarea
              className={`font-mono text-xs w-full flex-1 p-2 border rounded ${jsonError ? 'border-red-500' : 'border-gray-300'}`}
              value={jsonEditorValue}
              onChange={(e) => setJsonEditorValue(e.target.value)}
              spellCheck="false"
            />
            <div className="mt-2 flex items-center justify-between">
              <button
                className="btn btn-sm btn-primary"
                onClick={handleJsonEditorSave}
                disabled={saving.jsonEditor}
              >
                {saving.jsonEditor ? 'Sauvegarde...' : 'Enregistrer les modifications JSON'}
              </button>
              {saving.jsonEditor && <span className="animate-spin text-blue-500">⏳</span>}
            </div>
            {jsonError && <div className="text-red-600 text-sm mt-2 bg-red-50 p-2 rounded">{jsonError}</div>}
          </div>
        )}
        {activeTab === 'preview' && (
          <div className="bg-gray-50 p-2 rounded">
            {/* Les IDs sont maintenant laissés en string, ce qui est valide pour les clés React */}
            <FormulaireRemplissage formDefinition={{
              blocks: blocks.map(block => ({
                ...block,
                id: String(block.id), // Conversion explicite en string
                sections: (block.sections ?? []).map(section => ({
                  ...section,
                  id: String(section.id), // Conversion explicite en string
                  title: section.name, // Assurer la compatibilité avec le composant de preview
                  fields: section.fields.map(field => ({
                    ...field,
                    id: String(field.id) // Conversion explicite en string
                  }))
                }))
              }))
            }} />
          </div>
        )}
        {activeTab === 'technique' && (
          <div className="bg-gray-100 p-2 rounded text-xs">
            <b>Informations techniques du champ</b>
            <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(field, null, 2)}</pre>
          </div>
        )}
      </section>
    </aside>
  );
};

function OptionsEditor({ fieldId, options }: {
  fieldId: string;
  options: FieldOption[];
}) {
  const { addOptionToField, removeOptionFromField } = useCRMStore();
  const [newOptionLabel, setNewOptionLabel] = React.useState('');
  const [isAdding, setIsAdding] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState<{[key: string | number]: boolean}>({});

  const handleAddOption = async () => {
    if (!newOptionLabel.trim() || !fieldId) return;
    setIsAdding(true);
    const newOption = {
      label: newOptionLabel,
      value: slugify(newOptionLabel),
      order: options.length,
    };
    try {
      await addOptionToField(fieldId, newOption);
      setNewOptionLabel('');
    } catch (error) {
      console.error("Failed to add option", error);
      // TODO: show error to user
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveOption = async (optionId: string | number) => {
    if (!optionId) return;
    setIsRemoving(prev => ({...prev, [optionId]: true}));
    try {
      await removeOptionFromField(String(optionId));
    } catch (error) {
      console.error("Failed to remove option", error);
      // TODO: show error to user
      setIsRemoving(prev => ({...prev, [optionId]: false}));
    }
    // No finally block to reset state, because the item will disappear from the list on re-render
  };

  return (
    <div className="space-y-2 p-2 bg-gray-50 rounded">
      {options.map((opt) => (
        <div key={opt.id} className="flex gap-2 items-center bg-white p-1 rounded border">
          <span className="flex-1 text-sm font-medium">{opt.label}</span>
          <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1 rounded">{opt.value}</span>
          <button
            type="button"
            className={`btn btn-xs btn-error btn-ghost ${isRemoving[opt.id!] ? 'loading' : ''}`}
            title="Supprimer l'option"
            onClick={() => opt.id && handleRemoveOption(opt.id)}
            disabled={!opt.id || !!isRemoving[opt.id!]}
          >
            {isRemoving[opt.id!] ? '' : '🗑️'}
          </button>
        </div>
      ))}
      {options.length === 0 && <div className="text-xs text-gray-500 italic text-center p-2">Aucune option définie.</div>}
      <div className="flex gap-2 items-center mt-2 pt-2 border-t">
        <input
          placeholder="Label de la nouvelle option"
          className="input input-bordered input-sm flex-1"
          value={newOptionLabel}
          onChange={e => setNewOptionLabel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAddOption(); }}
          disabled={isAdding}
        />
        <button
          type="button"
          className={`btn btn-sm btn-primary ${isAdding ? 'loading' : ''}`}
          onClick={handleAddOption}
          disabled={isAdding || !newOptionLabel.trim()}
        >
          {isAdding ? '' : '+ Ajouter'}
        </button>
      </div>
    </div>
  );
}

export default AdvancedConfigPanel;