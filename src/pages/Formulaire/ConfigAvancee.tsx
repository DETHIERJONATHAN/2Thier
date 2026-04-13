import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Tabs, Tooltip, Card, Collapse } from 'antd';
import { FunctionOutlined, SafetyCertificateOutlined, LinkOutlined, InfoCircleOutlined } from '@ant-design/icons';
import useCRMStore from '../../store';
import type { Field, FieldOption as StoreFieldOption } from '../../store/slices/types';
import { FieldFormulasEditorNew } from '../../components/formulas';
import { FieldValidationsEditor } from '../../components/validations'; 
import FieldDependenciesEditor from '../../components/dependencies/FieldDependenciesEditor';
import { TableauConfigEditor } from '../../components/TableauConfigEditor';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAdvancedSelectCache } from '../../hooks/useAdvancedSelectCache';
import { GenealogyExplorer } from '../../components/GenealogyExplorer/exports';
import { cleanColor } from '../../utils/colorUtils';
import { logger } from '../../lib/logger';

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
  { 
    key: 'parametres', 
    label: 'Paramètres', 
    icon: <InfoCircleOutlined />, 
    tooltip: 'Propriétés simples du champ' 
  },
  { 
    key: 'formules', 
    label: 'Formules', 
  icon: <FunctionOutlined />, 
    tooltip: 'Éditeur de formules dynamiques' 
  },
  { 
    key: 'validations', 
    label: 'Validations', 
    icon: <SafetyCertificateOutlined />, 
    tooltip: 'Règles de validation du champ' 
  },
  { 
    key: 'dependances', 
    label: 'Dépendances', 
    icon: <LinkOutlined />, 
    tooltip: 'Dépendances et conditions' 
  },
];

const AdvancedConfigPanel: React.FC<AdvancedConfigPanelProps> = ({ selectedField }) => {
  const [lastFieldId, setLastFieldId] = useState<string|number|undefined>(undefined);
  const [activeTab, setActiveTab] = useState('parametres');
  const { blocks, updateField, fieldMetaCounts } = useCRMStore();
  const { get } = useAuthenticatedApi();
  type ApiFieldType = { id: string; name: string; label: string; has_options?: boolean; config?: Record<string, unknown> };
  const [fieldTypes, setFieldTypes] = useState<ApiFieldType[]>([]);
  
  // Cache pour éviter les migrations en boucle
  const migratedFields = useRef<Set<string>>(new Set());

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
  
  
  // DEBUG: Affichage état fieldTypes
  useEffect(() => {
    logger.debug('[ConfigAvancee] FieldTypes état:', {
      length: fieldTypes.length,
      types: fieldTypes.map(ft => ({ name: ft.name, label: ft.label }))
    });
    
    if (fieldTypes.length === 0) {
      logger.warn('[ConfigAvancee] WARN: FieldTypes vide - Problème d\'authentification ?');
    }
  }, [fieldTypes]);

  // DEBUG: Affichage field actuel
  useEffect(() => {
    if (field) {
      logger.debug('[ConfigAvancee] Champ actuel:', {
        id: field.id,
        type: field.type,
        label: field.label,
        hasOptions: field.options?.length || 0
      });
    }
  }, [field]);

  const advancedConfig = field?.advancedConfig || {};

  const [saving, setSaving] = useState<{[k:string]:boolean}>({});
  const [saveError, setSaveError] = useState<{[k:string]:string|null}>({});
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (fieldId && fieldId !== lastFieldId) {
      setLocalValues({});
      // Nettoyer le cache de migration pour le nouveau champ
      migratedFields.current.clear();
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

    const handleAdvancedChange = (key: string, value: unknown) => {
    if (!fieldId) return;
    
    logger.debug('[ConfigAvancee] handleAdvancedChange:', { key, value, fieldId });
    logger.debug('[ConfigAvancee] advancedConfig actuel:', advancedConfig);
    
    setLocalValues(v => ({ ...v, [key]: value }));
    setSaving(s => ({ ...s, [key]: true }));
    setSaveError(e => ({ ...e, [key]: null }));
    
    const newAdvancedConfig = { ...advancedConfig, [key]: value };
    logger.debug('[ConfigAvancee] Nouveau advancedConfig à sauver:', newAdvancedConfig);
    
    saveFieldChange({ advancedConfig: newAdvancedConfig })
      .then(() => {
        logger.debug('[ConfigAvancee] Sauvegarde réussie pour:', key);
        setSaving(s => ({ ...s, [key]: false }));
      })
      .catch(err => {
        logger.error('[ConfigAvancee] Erreur sauvegarde pour:', key, err);
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
  const handleProtectedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!fieldId) return;
    const value = e.target.checked;
    setLocalValues(v => ({ ...v, isProtected: value }));
    setSaving(s => ({ ...s, isProtected: true }));
    setSaveError(e => ({ ...e, isProtected: null }));
    saveFieldChange({ isProtected: value })
      .then(() => setSaving(s => ({ ...s, isProtected: false })))
      .catch(err => {
        setSaving(s => ({ ...s, isProtected: false }));
        setSaveError(e => ({ ...e, isProtected: err?.message || 'Erreur de sauvegarde' }));
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

  // Charger dynamiquement les FieldTypes depuis l'API (une fois)
  useEffect(() => {
    let mounted = true;
  (async () => {
      try {
    const resp = await get<{ success?: boolean; data?: ApiFieldType[] } | ApiFieldType[]>(`/api/field-types`);
    let list: ApiFieldType[] = [];
        if (Array.isArray(resp)) list = resp;
    else if (resp && typeof resp === 'object' && 'data' in resp) list = (resp as { data?: ApiFieldType[] }).data || [];
        if (mounted) setFieldTypes(list);
      } catch (e) {
        logger.warn('Impossible de charger les types de champs', e);
      }
    })();
    return () => { mounted = false; };
  }, [get]);

  // RETRY: Rechargement forcé fieldTypes si vide
  const forceReloadFieldTypes = useCallback(async () => {
    logger.debug('[ConfigAvancee] Force reload fieldTypes...');
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const resp = await get('/api/field-types');
        let list = [];
        
        if (Array.isArray(resp)) {
          list = resp;
        } else if (resp && typeof resp === 'object' && 'data' in resp) {
          list = resp.data || [];
        }
        
        if (list.length > 0) {
          setFieldTypes(list);
          logger.debug('✅ [ConfigAvancee] FieldTypes rechargés:', list.length);
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          logger.debug(`🔄 [ConfigAvancee] Retry ${attempts}/${maxAttempts}...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (e) {
        logger.error('❌ [ConfigAvancee] Erreur reload fieldTypes:', e);
        attempts++;
      }
    }
    
    logger.error('❌ [ConfigAvancee] Échec après', maxAttempts, 'tentatives');
  }, [get]);

  // Déclencher le retry si fieldTypes vide après 2 secondes
  useEffect(() => {
    if (fieldTypes.length === 0) {
      const timer = setTimeout(() => {
        if (fieldTypes.length === 0) {
          logger.warn('⚠️ [ConfigAvancee] FieldTypes toujours vide, tentative de rechargement...');
          forceReloadFieldTypes();
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [fieldTypes, forceReloadFieldTypes]);

  

  if (!selectedField || !fieldId || !field) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        textAlign: 'center',
        color: '#bfbfbf'
      }}>
        <div>
          <InfoCircleOutlined style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }} />
          <span style={{ fontSize: '14px', fontStyle: 'italic' }}>Aucun champ sélectionné</span>
        </div>
      </div>
    );
  }

  // Créer les items des tabs avec badges + coloration par type
  const tabItems = TABS.map(tab => {
    let count = 0;
    if (fieldId) {
      if (tab.key === 'formules') count = fieldMetaCounts[fieldId]?.formulas || 0;
      if (tab.key === 'validations') count = fieldMetaCounts[fieldId]?.validations || 0;
      if (tab.key === 'dependances') count = fieldMetaCounts[fieldId]?.dependencies || 0;
    }

    const has = count > 0;

    const tabLabel = (
      <Tooltip title={tab.tooltip}>
        <span className="cfg-tab-label" data-kind={tab.key} data-has={has}>
          <span className="cfg-tab-icon">{tab.icon}</span>
          <span className="cfg-tab-text">{tab.label}</span>
          {has && <span className="cfg-tab-count" aria-label={`Nombre: ${count}`}>{count}</span>}
        </span>
      </Tooltip>
    );

    return {
      key: tab.key,
      label: tabLabel,
      children: <div className="cfg-tab-pane">{renderTabContent(tab.key)}</div>
    };
  });

  return (
    <div className="cfg-advanced-panel" style={{ height: '100%', padding: '8px' }}>
      <Card
        className="cfg-advanced-card"
        bordered
        size="small"
        style={{ boxShadow: 'none' }}
        styles={{ body: { padding: 12 } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="small"
          style={{ height: '100%' }}
          tabBarStyle={{ marginBottom: 8 }}
        />
      </Card>
    </div>
  );

  function renderTabContent(tabKey: string) {
    switch (tabKey) {
      case 'parametres':
        return (
          <div className="cfg-pane-card parametres-root" data-kind="parametres" style={{ padding: 12, margin: 0 }}>
            {/* Section principale - 2 colonnes pour les champs de base */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Nom du champ</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="text" 
                    style={{ 
                      width: '100%', 
                      height: '32px', 
                      padding: '4px 8px', 
                      border: '1px solid #d9d9d9', 
                      borderRadius: '4px',
                      fontSize: '14px'
                    }} 
                    value={localValues.label ?? (field.label || '')} 
                    onChange={handleLabelChange} 
                  />
                  {saving.label && <span style={{ color: '#1890ff' }}>⏳</span>}
                  {saveError.label && <span style={{ color: '#ff4d4f' }} title={saveError.label}>⚠️</span>}
                  {!saving.label && !saveError.label && localValues.label !== undefined && localValues.label !== field.label && <span style={{ color: '#52c41a' }}>✔️</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>Le label affiché à l'utilisateur.</div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Type de champ</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select 
                    style={{ 
                      width: '100%', 
                      height: '32px', 
                      padding: '4px 8px', 
                      border: '1px solid #d9d9d9', 
                      borderRadius: '4px',
                      fontSize: '14px'
                    }} 
                    value={localValues.type ?? (field.type || '')} 
                    onChange={handleTypeChange}
                  >
                    {fieldTypes.length === 0 && <option value="">Chargement des types...</option>}
                    {fieldTypes.map(ft => (
                      <option key={ft.name} value={ft.name}>{ft.label}</option>
                    ))}
                  </select>
                  {saving.type && <span className="animate-spin text-blue-500">⏳</span>}
                  {saveError.type && <span className="text-red-500" title={saveError.type}>⚠️</span>}
                  {!saving.type && !saveError.type && localValues.type !== undefined && localValues.type !== field.type && <span className="text-green-500">✔️</span>}
                </div>
                <div className="text-xs text-gray-500 mt-1">Format de saisie (texte, nombre, date, liste, etc.).</div>
              </div>
            </div>
            {/* Section compacte: Taille + Obligatoire (col 1), Valeur par défaut (col 2), Placeholder (col 3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              {/* Col 1: Taille + Obligatoire */}
              <div>
                <label className="block text-sm font-medium mb-1">Taille</label>
                <div className="flex items-center gap-2">
                  <select className="select select-bordered h-10 text-sm flex-1" value={localValues.width ?? (field.width || '1/1')} onChange={handleWidthChange}>
                    <option value="1/4">1/4 (petit)</option>
                    <option value="1/2">1/2 (moyen)</option>
                    <option value="3/4">3/4 (large)</option>
                    <option value="1/1">Pleine largeur</option>
                  </select>
                  {saving.width && <span className="animate-spin text-blue-500">⏳</span>}
                  {saveError.width && <span className="text-red-500" title={saveError.width}>⚠️</span>}
                  {!saving.width && !saveError.width && localValues.width !== undefined && localValues.width !== field.width && <span className="text-green-500">✔️</span>}
                  <label className="flex items-center gap-2 whitespace-nowrap ml-1">
                    <input type="checkbox" checked={localValues.required ?? (field.required || false)} onChange={handleRequiredChange} />
                    <span className="text-sm">Obligatoire</span>
                    {saving.required && <span className="animate-spin text-blue-500">⏳</span>}
                    {saveError.required && <span className="text-red-500" title={saveError.required}>⚠️</span>}
                    {!saving.required && !saveError.required && localValues.required !== undefined && localValues.required !== field.required && <span className="text-green-500">✔️</span>}
                  </label>
                </div>
              </div>

              {/* Col 2: Valeur par défaut */}
              <div>
                <label className="block text-sm font-medium mb-1">Valeur par défaut</label>
                <div className="flex items-center gap-2">
                  <input type="text" className="input input-bordered w-full h-10 text-sm" value={localValues.defaultValue ?? advancedConfig.defaultValue ?? ''} onChange={e => handleAdvancedChange('defaultValue', e.target.value)} placeholder="Exemple: Particulier, 1, true..." />
                  {saving.defaultValue && <span className="animate-spin text-blue-500">⏳</span>}
                  {saveError.defaultValue && <span className="text-red-500" title={saveError.defaultValue}>⚠️</span>}
                  {!saving.defaultValue && !saveError.defaultValue && localValues.defaultValue !== undefined && localValues.defaultValue !== advancedConfig.defaultValue && <span className="text-green-500">✔️</span>}
                </div>
                <div className="text-xs text-gray-500 mt-1">Préremplie automatiquement.</div>
              </div>

              {/* Col 3: Placeholder */}
              <div>
                <label className="block text-sm font-medium mb-1">Placeholder / Info-bulle</label>
                <div className="flex items-center gap-2">
                  <input type="text" className="input input-bordered w-full h-10 text-sm" value={localValues.placeholder ?? advancedConfig.placeholder ?? ''} onChange={e => handleAdvancedChange('placeholder', e.target.value)} placeholder="Exemple: Saisissez votre nom..." />
                  {saving.placeholder && <span className="animate-spin text-blue-500">⏳</span>}
                  {saveError.placeholder && <span className="text-red-500" title={saveError.placeholder}>⚠️</span>}
                  {!saving.placeholder && !saveError.placeholder && localValues.placeholder !== undefined && localValues.placeholder !== advancedConfig.placeholder && <span className="text-green-500">✔️</span>}
                </div>
                <div className="text-xs text-gray-500 mt-1">Texte d'aide grisé.</div>
              </div>
            </div>

            {/* Section Options pour les champs avec options */}
            {(() => {
              const currentType = fieldTypes.find(ft => ft.name === (localValues.type ?? field.type));
              if (!currentType?.has_options) return null;
              if ((localValues.type ?? field.type) === 'advanced_select') {
                return (
                  <Collapse size="small" bordered={false} defaultActiveKey={["options-advanced"]} items={[{
                    key: 'options-advanced',
                    label: 'Options (liste avancée en cascade)',
                    children: (
                      <div className="cfg-pane-card" data-kind="parametres">
                        <AdvancedOptionsEditor fieldId={String(fieldId)} />
                      </div>
                    )
                  }]} />
                );
              }
              return (
                <Collapse size="small" bordered={false} defaultActiveKey={["options-simple"]} items={[{
                  key: 'options-simple',
                  label: 'Options de la liste déroulante',
                  children: (
                    <div className="cfg-pane-card" data-kind="parametres">
                      <OptionsEditor
                        fieldId={String(fieldId)}
                        options={field.options ?? []}
                      />
                    </div>
                  )
                }]} />
              );
            })()}

            {/* Section couleurs - 2 colonnes */}
            <Collapse size="small" bordered={false} items={[{
              key: 'appearance',
              label: 'Apparence du champ',
              children: (
                <div className="cfg-pane-card" data-kind="parametres">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-indigo-700">Couleur de fond</label>
                      <div className="flex items-center gap-2">
                        <input type="color" className="w-10 h-10 p-0 border-none rounded" value={cleanColor(localValues.color ?? advancedConfig.color, '#f4f4f4')} onChange={e => handleAdvancedChange('color', e.target.value)} />
                        <input type="text" className="input input-bordered flex-1 h-10 text-xs font-mono" value={localValues.color ?? advancedConfig.color ?? '#f4f4f4'} onChange={e => handleAdvancedChange('color', e.target.value)} />
                        {saving.color && <span className="animate-spin text-blue-500">⏳</span>}
                        {saveError.color && <span className="text-red-500" title={saveError.color}>⚠️</span>}
                        {!saving.color && !saveError.color && localValues.color !== undefined && localValues.color !== advancedConfig.color && <span className="text-green-500">✔️</span>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-indigo-700">Couleur du texte</label>
                      <div className="flex items-center gap-2">
                        <input type="color" className="w-10 h-10 p-0 border-none rounded" value={cleanColor(localValues.textColor ?? advancedConfig.textColor, '#000000')} onChange={e => handleAdvancedChange('textColor', e.target.value)} />
                        <input type="text" className="input input-bordered flex-1 h-10 text-xs font-mono" value={localValues.textColor ?? advancedConfig.textColor ?? '#000000'} onChange={e => handleAdvancedChange('textColor', e.target.value)} />
                        {saving.textColor && <span className="animate-spin text-blue-500">⏳</span>}
                        {saveError.textColor && <span className="text-red-500" title={saveError.textColor}>⚠️</span>}
                        {!saving.textColor && !saveError.textColor && localValues.textColor !== undefined && localValues.textColor !== advancedConfig.textColor && <span className="text-green-500">✔️</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            }]} />

            {/* Section icône */}
            <div>
              <label className="block text-sm font-medium mb-1">Icône associée</label>
              <div className="flex items-center gap-2">
                <input type="text" className="input input-bordered w-full h-10 text-sm" value={localValues.icon ?? advancedConfig.icon ?? ''} onChange={e => handleAdvancedChange('icon', e.target.value)} placeholder="ex: 📅, 🔢, 📝" />
                {saving.icon && <span className="animate-spin text-blue-500">⏳</span>}
                {saveError.icon && <span className="text-red-500" title={saveError.icon}>⚠️</span>}
                {!saving.icon && !saveError.icon && localValues.icon !== undefined && localValues.icon !== advancedConfig.icon && <span className="text-green-500">✔️</span>}
              </div>
              <div className="text-xs text-gray-500 mt-1">Icône affichée à côté du champ (emoji ou texte court).</div>
            </div>

            {/* Section options avancées - checkboxes */}
            <Collapse size="small" bordered={false} items={[{
              key: 'advanced-options',
              label: 'Options avancées',
              children: (
                <div className="cfg-pane-card" data-kind="parametres">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={localValues.isProtected ?? (field.isProtected || false)} onChange={handleProtectedChange} />
                      <span className="text-sm font-semibold text-orange-600">🔒 Mode protégé</span>
                      {saving.isProtected && <span className="animate-spin text-blue-500">⏳</span>}
                      {saveError.isProtected && <span className="text-red-500" title={saveError.isProtected}>⚠️</span>}
                      {!saving.isProtected && !saveError.isProtected && localValues.isProtected !== undefined && localValues.isProtected !== field.isProtected && <span className="text-green-500">✔️</span>}
                      <span className="text-xs text-gray-500">Empêche la suppression du champ</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={localValues.readOnly ?? !!advancedConfig.readOnly} onChange={e => handleAdvancedChange('readOnly', e.target.checked)} />
                      <span className="text-sm">Lecture seule</span>
                      {saving.readOnly && <span className="animate-spin text-blue-500">⏳</span>}
                      {saveError.readOnly && <span className="text-red-500" title={saveError.readOnly}>⚠️</span>}
                      {!saving.readOnly && !saveError.readOnly && localValues.readOnly !== undefined && localValues.readOnly !== advancedConfig.readOnly && <span className="text-green-500">✔️</span>}
                      <span className="text-xs text-gray-500">Non modifiable par l'utilisateur</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={localValues.hidden ?? !!advancedConfig.hidden} onChange={e => handleAdvancedChange('hidden', e.target.checked)} />
                      <span className="text-sm">Masqué au rendu final</span>
                      {saving.hidden && <span className="animate-spin text-blue-500">⏳</span>}
                      {saveError.hidden && <span className="text-red-500" title={saveError.hidden}>⚠️</span>}
                      {!saving.hidden && !saveError.hidden && localValues.hidden !== undefined && localValues.hidden !== advancedConfig.hidden && <span className="text-green-500">✔️</span>}
                      <span className="text-xs text-gray-500">N'apparaît pas dans le formulaire</span>
                    </label>
                  </div>
                </div>
              )
            }]} />

            {/* Section spécifique aux fichiers/images */}
            {['image_user','fichier_user'].includes(localValues.type ?? field.type) && (
              <Collapse size="small" bordered={false} items={[{
                key: 'files-config',
                label: 'Configuration fichiers',
                children: (
                  <div className="cfg-pane-card" data-kind="parametres">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={localValues.multiple ?? !!advancedConfig.multiple} onChange={e => handleAdvancedChange('multiple', e.target.checked)} />
                        <span className="text-sm">Autoriser plusieurs fichiers</span>
                        {saving.multiple && <span className="animate-spin text-blue-500">⏳</span>}
                        {saveError.multiple && <span className="text-red-500" title={saveError.multiple}>⚠️</span>}
                        {!saving.multiple && !saveError.multiple && localValues.multiple !== undefined && localValues.multiple !== advancedConfig.multiple && <span className="text-green-500">✔️</span>}
                      </label>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-purple-700">Types acceptés (accept)</label>
                        <input
                          type="text"
                          className="input input-bordered w-full h-10 text-sm"
                          placeholder={((localValues.type ?? field.type) === 'image_user') ? 'image/*' : '*/*'}
                          value={localValues.accept ?? advancedConfig.accept ?? ''}
                          onChange={e => handleAdvancedChange('accept', e.target.value)}
                        />
                        <div className="text-xs text-gray-500 mt-1">Exemples: image/*, application/pdf,.doc,.docx</div>
                      </div>
                    </div>
                  </div>
                )
              }]} />
            )}

            {/* Section spécifique aux produits */}
            {(localValues.type ?? field.type) === 'produit' && (
              <Collapse size="small" bordered={false} items={[{
                key: 'product-config',
                label: 'Configuration produit',
                children: (
                  <div className="cfg-pane-card" data-kind="parametres">
                    <ProductColumnsEditor
                  columns={Array.isArray((field.advancedConfig as Record<string, unknown> | undefined)?.product?.columns)
                    ? (field.advancedConfig as Record<string, unknown> | undefined)!.product!.columns as ProductColumn[]
                    : []}
                  onChange={(cols) => {
                    const ac = (field.advancedConfig || {}) as Record<string, unknown> & { product?: ProductConfig };
                    const next: ProductConfig = { ...(ac.product || {}), columns: cols };
                    handleAdvancedChange('product', next);
                  }}
                />
                  </div>
                )
              }]} />
            )}

            {/* Section spécifique aux données */}
            {(localValues.type ?? field.type) === 'donnee' && (
              <Collapse size="small" bordered={false} items={[{
                key: 'data-config',
                label: 'Configuration données',
                children: (
                  <div className="cfg-pane-card" data-kind="parametres">
                    <DataComposerEditor
                  composer={(advancedConfig.composer as Record<string, unknown> | undefined) || undefined}
                  onChange={(composer) => handleAdvancedChange('composer', composer)}
                />
                  </div>
                )
              }]} />
            )}

            {/* Section spécifique aux tableaux */}
            {(localValues.type ?? field.type) === 'tableau' && (
              <Collapse size="small" bordered={false} items={[{
                key: 'table-config',
                label: 'Configuration du tableau',
                children: (
                  <div className="cfg-pane-card" data-kind="parametres">
                    <TableauConfigEditor
                  config={(() => {
                    // ✅ Configuration de base SANS crossingData vide
                    const baseConfig = {
                      columns: [],
                      rows: [],
                      templates: [],
                      data: [],
                      ...((field.advancedConfig as Record<string, unknown>)?.tableau || field.config)
                    } as Record<string, unknown>;
                    
                    // ✅ Migration intelligente des vraies données uniquement si nécessaire
                    if (baseConfig.data && Array.isArray(baseConfig.data) && baseConfig.data.length > 0) {
                      // ✅ Vérifier si crossingData est vide ou inexistant
                      const existingCrossingData = baseConfig.crossingData || {};
                      const hasCrossingData = Object.keys(existingCrossingData).length > 0;
                      
                      if (!hasCrossingData) {
                        logger.debug('[ConfigAvancee] Migration des vraies données data[] vers crossingData');
                        
                        const crossingData: Record<string, unknown> = {};
                        
                        // ✅ Migration avec les vrais IDs et clés des données existantes
                        baseConfig.data.forEach((item: Record<string, unknown>, rowIndex: number) => {
                          if (item && typeof item === 'object') {
                            Object.entries(item).forEach(([colKey, value]) => {
                              if (colKey !== 'id' && value !== undefined && value !== null && value !== '') {
                                // ✅ Utiliser l'ID réel de l'item ou un index de fallback
                                const rowId = item.id || `row_${Date.now()}_${rowIndex}`;
                                // ✅ Utiliser la vraie clé de colonne
                                const crossingKey = `${rowId}_${colKey}`;
                                crossingData[crossingKey] = value;
                              }
                            });
                          }
                        });

                        logger.debug(`[ConfigAvancee] Migration réussie: ${Object.keys(crossingData).length} vraies valeurs migrées`);
                        if (Object.keys(crossingData).length > 0) {
                          logger.debug('[ConfigAvancee] Exemples de vraies données migrées:', 
                            Object.entries(crossingData).slice(0, 2).map(([k, v]) => `${k}: ${v}`));
                          // ✅ Seulement assigner crossingData si on a des vraies données
                          baseConfig.crossingData = crossingData;
                        } else {
                          logger.debug('[ConfigAvancee] Aucune donnée valide à migrer, crossingData non initialisé');
                        }
                      } else {
                        logger.debug('[ConfigAvancee] CrossingData existe déjà, pas de migration nécessaire');
                      }
                    } else {
                      // ✅ Pas de données à migrer, ne pas créer crossingData vide
                      logger.debug('[ConfigAvancee] Aucune donnée à migrer, crossingData non initialisé');
                    }
                    
                    logger.debug('[ConfigAvancee] Config finale:', {
                      columns: baseConfig.columns?.length || 0,
                      rows: baseConfig.rows?.length || 0,
                      dataLength: Array.isArray(baseConfig.data) ? baseConfig.data.length : 0,
                      crossingDataKeys: Object.keys(baseConfig.crossingData || {}).length
                    });
                    
                    return baseConfig;
                  })()}
                  onChange={(tableauConfig) => {
                    logger.debug('[TableauConfigEditor] Configuration reçue:', {
                      columns: Array.isArray(tableauConfig.columns) ? tableauConfig.columns.length : 0,
                      rows: Array.isArray(tableauConfig.rows) ? tableauConfig.rows.length : 0,
                      templates: Array.isArray(tableauConfig.templates) ? tableauConfig.templates.length : 0,
                      data: Array.isArray(tableauConfig.data) ? tableauConfig.data.length : 0,
                      crossingDataKeys: Object.keys(tableauConfig.crossingData || {}).length
                    });
                    
                    // SOLUTION FINALE ANTI-BOUCLE - Protection absolue
                    const fieldKey = field.id.toString();
                    
                    // Ignorer si déjà migré RÉCEMMENT
                    if (migratedFields.current.has(fieldKey)) {
                      logger.debug('[TableauConfigEditor] Changement ignoré - champ déjà migré');
                      return;
                    }
                    const now = Date.now();
                    const lastSaveKey = `lastSave_${fieldKey}`;
                    const lastSaveTime = (window as Record<string, unknown>)[lastSaveKey] as number || 0;
                    
                    // DÉBOUNCE : Ignorer si sauvegarde récente (moins de 2 secondes)
                    if (now - lastSaveTime < 2000) {
                      logger.debug('[TableauConfigEditor] DÉBOUNCE - Sauvegarde trop récente, ignorée');
                      return;
                    }

                    // Protection contre oscillation : détecter les va-et-vient
                    const oscillationKey = `oscillation_${fieldKey}`;
                    const previousStates = (window as Record<string, unknown>)[oscillationKey] as string[] || [];
                    const currentSignature = JSON.stringify({
                      colCount: typeof tableauConfig.columns === 'number' ? tableauConfig.columns : (Array.isArray(tableauConfig.columns) ? tableauConfig.columns.length : 0),
                      rowCount: typeof tableauConfig.rows === 'number' ? tableauConfig.rows : (Array.isArray(tableauConfig.rows) ? tableauConfig.rows.length : 0),
                      crossingKeys: Object.keys((tableauConfig.crossingData as Record<string, unknown>) || {}).sort()
                    });
                    
                    // Détecter oscillation (même signature revient dans les 5 dernières)
                    if (previousStates.includes(currentSignature) && previousStates.length >= 2) {
                      logger.debug('[TableauConfigEditor] OSCILLATION DÉTECTÉE - Blocage définitif');
                      return;
                    }
                    
                    // Enregistrer signature pour détection oscillation
                    previousStates.push(currentSignature);
                    if (previousStates.length > 5) previousStates.shift(); // Garder seulement les 5 dernières
                    (window as Record<string, unknown>)[oscillationKey] = previousStates;

                    // Comparer avec configuration actuelle
                    const currentFieldConfig = (field?.advancedConfig as Record<string, unknown>)?.tableau;
                    const currentSignatureField = currentFieldConfig ? JSON.stringify({
                      colCount: typeof currentFieldConfig.columns === 'number' ? currentFieldConfig.columns : (Array.isArray(currentFieldConfig.columns) ? currentFieldConfig.columns.length : 0),
                      rowCount: typeof currentFieldConfig.rows === 'number' ? currentFieldConfig.rows : (Array.isArray(currentFieldConfig.rows) ? currentFieldConfig.rows.length : 0),
                      crossingKeys: Object.keys((currentFieldConfig.crossingData as Record<string, unknown>) || {}).sort()
                    }) : 'null';
                    
                    const hasRealChange = currentSignatureField !== currentSignature;
                    const isFirstLoad = !currentFieldConfig;
                    
                    logger.debug('[TableauConfigEditor] Analyse oscillation-safe:', {
                      currentSignatureField,
                      currentSignature,
                      hasRealChange,
                      isFirstLoad,
                      oscillationHistory: previousStates.length
                    });
                    
                    if (hasRealChange || isFirstLoad) {
                      logger.debug('[TableauConfigEditor] Sauvegarde - changement validé');
                      (window as Record<string, unknown>)[lastSaveKey] = now; // Marquer dernière sauvegarde
                      handleAdvancedChange('tableau', tableauConfig);
                    } else {
                      logger.debug('[TableauConfigEditor] Changement ignoré - identique ou oscillation bloquée');
                    }
                  }}
                />
                  </div>
                )
              }]} />
            )}
          </div>
        );
      case 'formules':
        return (
          <div className="cfg-pane-card" data-kind="formules">
            <FieldFormulasEditorNew fieldId={field.id} />
          </div>
        );
      case 'validations':
        return (
          <div className="cfg-pane-card" data-kind="validations">
            <FieldValidationsEditor fieldId={field.id} />
          </div>
        );
      case 'dependances':
        return (
          <div className="cfg-pane-card" data-kind="dependances">
            <FieldDependenciesEditor fieldId={field.id} />
          </div>
        );
      default:
        return null;
    }
  }
};

// === FONCTIONS UTILITAIRES SÉPARÉES ===

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
      logger.error("Failed to add option", error);
      // TODO: show error to user
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveOption = async (optionId: string | number) => {
    if (!optionId) return;
    setIsRemoving(prev => ({...prev, [optionId]: true}));
    try {
      // Passer correctement le fieldId ET l'optionId au store
      await removeOptionFromField(fieldId, String(optionId));
    } catch (error) {
      logger.error("Failed to remove option", error);
      // TODO: show error to user
      setIsRemoving(prev => ({...prev, [optionId]: false}));
    }
    // No finally block to reset state, because the item will disappear from the list on re-render
  };

  return (
    <div className="space-y-2 p-2 bg-gray-50 rounded">
      {options.map((opt) => (
        <div key={opt.id} className="flex gap-2 items-center bg-white p-2 rounded border">
          <span className="flex-1 text-sm font-medium h-10 flex items-center">{opt.label}</span>
          <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 rounded h-10 flex items-center">{opt.value}</span>
          <button
            type="button"
            className={`btn btn-error btn-ghost h-8 min-h-0 px-2 ${isRemoving[opt.id!] ? 'loading' : ''}`}
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
          className="input input-bordered flex-1 h-10 text-sm"
          value={newOptionLabel}
          onChange={e => setNewOptionLabel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAddOption(); }}
          disabled={isAdding}
        />
        <button
          type="button"
          className={`btn btn-primary h-10 min-h-0 ${isAdding ? 'loading' : ''}`}
          onClick={handleAddOption}
          disabled={isAdding || !newOptionLabel.trim()}
        >
          {isAdding ? '' : '+ Ajouter'}
        </button>
      </div>
    </div>
  );
}

// =======================
// ÉDITEUR COLONNES PRODUIT
// =======================
type ProductColumn = { key: string; label: string; type?: 'text'|'number'|'date'|'select'; options?: Array<{ label: string; value: string }> };
type ProductConfig = { columns?: ProductColumn[] };

function ProductColumnsEditor({ columns, onChange }: {
  columns: ProductColumn[];
  onChange: (next: ProductColumn[]) => void;
}) {
  const [localCols, setLocalCols] = useState(columns);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'text'|'number'|'date'|'select'>('text');

  useEffect(() => {
    setLocalCols(columns);
  }, [columns]);

  const commit = (next: typeof localCols) => {
    setLocalCols(next);
    onChange(next);
  };

  const addCol = () => {
    if (!newLabel.trim()) return;
    const key = slugify(newLabel);
  const col: ProductColumn = { key, label: newLabel.trim(), type: newType, options: newType === 'select' ? [] : undefined };
    commit([...(localCols || []), col]);
    setNewLabel('');
    setNewType('text');
  };

  const removeCol = (key: string) => {
    commit((localCols || []).filter(c => c.key !== key));
  };

  const updateCol = (key: string, patch: Partial<{ label: string; type: ProductColumn['type'] }>) => {
    commit((localCols || []).map(c => (c.key === key ? { ...c, ...patch, options: (patch.type ?? c.type) === 'select' ? (c.options || []) : undefined } as ProductColumn : c)));
  };

  const move = (idx: number, delta: number) => {
    const next = [...(localCols || [])];
    const j = idx + delta;
    if (j < 0 || j >= next.length) return;
    const [it] = next.splice(idx, 1);
    next.splice(j, 0, it);
    commit(next);
  };

  const addOption = (colKey: string, label: string) => {
    if (!label.trim()) return;
    commit((localCols || []).map(c => {
      if (c.key !== colKey) return c;
      const opts = Array.isArray(c.options) ? c.options : [];
      return { ...c, options: [...opts, { label: label.trim(), value: slugify(label) }] };
    }));
  };

  const removeOption = (colKey: string, value: string) => {
    commit((localCols || []).map(c => {
      if (c.key !== colKey) return c;
      const opts = Array.isArray(c.options) ? c.options : [];
      return { ...c, options: opts.filter(o => o.value !== value) };
    }));
  };

  return (
    <div className="p-2 bg-gray-50 rounded border">
      <div className="font-medium mb-2">Colonnes du produit</div>
      {(localCols || []).length === 0 && <div className="text-xs text-gray-500 mb-2">Aucune colonne. Ajoutez-en ci-dessous.</div>}
      <div className="space-y-2">
        {(localCols || []).map((c, idx) => (
          <div key={c.key} className="bg-white p-2 rounded border">
            <div className="flex items-center gap-2">
                <input
                  className="input input-bordered flex-1 h-10 text-sm"
                value={c.label}
                onChange={e => updateCol(c.key, { label: e.target.value })}
              />
              <select
                className="select select-bordered h-10 text-sm"
                value={c.type || 'text'}
                onChange={e => updateCol(c.key, { type: e.target.value })}
              >
                <option value="text">Texte</option>
                <option value="number">Nombre</option>
                <option value="date">Date</option>
                <option value="select">Sélection</option>
              </select>
              <button type="button" className="btn h-8 min-h-0 px-2" onClick={() => move(idx, -1)} disabled={idx === 0}>↑</button>
              <button type="button" className="btn h-8 min-h-0 px-2" onClick={() => move(idx, +1)} disabled={idx === (localCols?.length || 0) - 1}>↓</button>
              <button type="button" className="btn btn-error h-8 min-h-0 px-2" onClick={() => removeCol(c.key)}>Supprimer</button>
            </div>
            {(c.type === 'select') && (
              <div className="mt-2 p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-600 mb-1">Options</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(c.options || []).map(o => (
                    <span key={o.value} className="text-xs bg-white border rounded px-2 py-0.5 inline-flex items-center gap-2">
                      {o.label}
                      <button type="button" className="text-red-500" onClick={() => removeOption(c.key, o.value)}>✕</button>
                    </span>
                  ))}
                  {(c.options || []).length === 0 && (
                    <span className="text-xs text-gray-500">Aucune option</span>
                  )}
                </div>
                <AddOptionInline onAdd={(lbl) => addOption(c.key, lbl)} />
              </div>
            )}
            <div className="text-xxs text-gray-400 mt-1">clé: <code className="font-mono">{c.key}</code></div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
  <input
    className="input input-bordered flex-1 h-10 text-sm"
          placeholder="Nom de la colonne (ex: Marque)"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addCol(); }}
        />
  <select className="select select-bordered h-10 text-sm" value={newType} onChange={e => setNewType(e.target.value as 'text'|'number'|'date'|'select')}>
          <option value="text">Texte</option>
          <option value="number">Nombre</option>
          <option value="date">Date</option>
          <option value="select">Sélection</option>
        </select>
  <button type="button" className="btn btn-primary h-10 min-h-0" onClick={addCol}>+ Ajouter une colonne</button>
      </div>
      <div className="text-xs text-gray-500 mt-2">Définissez les colonnes (structure) du produit. Les lignes seront ajoutées par l’utilisateur dans l’onglet Devis.</div>
    </div>
  );
}

function AddOptionInline({ onAdd }: { onAdd: (label: string) => void }) {
  const [label, setLabel] = useState('');
  return (
    <div className="flex items-center gap-2">
      <input className="input input-bordered input-xs" placeholder="Nouvelle option" value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { onAdd(label); setLabel(''); } }} />
      <button className="btn btn-xs" type="button" onClick={() => { onAdd(label); setLabel(''); }}>+ Ajouter</button>
    </div>
  );
}

// =============================
// AdvancedOptionsEditor (arbre)
// =============================

function AdvancedOptionsEditor({ fieldId }: { fieldId: string }) {
  const { forceReload } = useAdvancedSelectCache();

  const handleTreeChange = useCallback(async () => {
    // Forcer le rechargement du cache quand l'arbre change
    await forceReload(fieldId);
  }, [fieldId, forceReload]);

  return (
    <div>
      <GenealogyExplorer fieldId={fieldId} onTreeChange={handleTreeChange} />
    </div>
  );
}

// =============================
// Data Composer Editor (pour champs 'donnee')
// =============================
type ComposerPick = { key: string; from: 'values' | 'advancedSelect' | 'errors'; fieldId: string; path?: string };
type DataComposer = { mode: 'template' | 'picks'; template?: string; picks?: ComposerPick[] };

function DataComposerEditor({ composer, onChange }: { composer?: Record<string, unknown>; onChange: (c: DataComposer) => void }) {
  // Initialisation à partir de la prop
  const initial: DataComposer = {
    mode: (composer?.mode as 'template' | 'picks') || 'template',
    template: typeof composer?.template === 'string' ? composer?.template : '',
    picks: Array.isArray(composer?.picks) ? composer?.picks as ComposerPick[] : [],
  };
  const [mode, setMode] = useState<DataComposer['mode']>(initial.mode);
  const [template, setTemplate] = useState<string>(initial.template || '');
  const [picks, setPicks] = useState<ComposerPick[]>(initial.picks || []);
  const [newPick, setNewPick] = useState<ComposerPick>({ key: '', from: 'values', fieldId: '', path: '' });
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<number | null>(null);

  // Si le composer externe change (ex: changement de champ), réinitialiser (mais pas si dirty local non sauvegardé)
  useEffect(() => {
    if (!dirty) {
      setMode(initial.mode);
      setTemplate(initial.template || '');
      setPicks(initial.picks || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composer]);

  const scheduleSave = () => {
    setDirty(true);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      onChange({ mode, template, picks });
      setDirty(false);
    }, 500);
  };

  const updateTemplate = (v: string) => {
    setTemplate(v);
    scheduleSave();
  };
  const updateMode = (m: DataComposer['mode']) => {
    setMode(m);
    scheduleSave();
  };
  const updatePicks = (next: ComposerPick[]) => {
    setPicks(next);
    scheduleSave();
  };
  const addPick = () => {
    if (!newPick.key.trim() || !newPick.fieldId.trim()) return;
    updatePicks([...picks, { ...newPick, key: newPick.key.trim(), fieldId: newPick.fieldId.trim(), path: newPick.path?.trim() || undefined }]);
    setNewPick({ key: '', from: 'values', fieldId: '', path: '' });
  };
  const removePick = (idx: number) => {
    updatePicks(picks.filter((_, i) => i !== idx));
  };

  return (
    <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-purple-700">Data Composer {dirty && <span className="text-xs text-orange-600 ml-2">(modifié…)</span>}</h3>
        <select className="select select-bordered select-sm h-8 text-xs" value={mode} onChange={e => updateMode(e.target.value as DataComposer['mode'])}>
          <option value="template">Template</option>
          <option value="picks">Picks (JSON)</option>
        </select>
      </div>
      {mode === 'template' && (
        <div className="space-y-2">
          <textarea
            className="textarea textarea-bordered w-full text-xs h-32 font-mono"
            value={template}
            onChange={e => updateTemplate(e.target.value)}
            placeholder="Ex: Client: {{values.client_nom}} / Choix: {{advancedSelect.categorie.selection}}"
          />
          <div className="text-xxs text-gray-600 leading-relaxed">
            Tokens: {'{{values.FIELD_ID}}'}, {'{{values.FIELD_ID.sous}}'}, {'{{advancedSelect.FIELD_ID.selection}}'}, {'{{advancedSelect.FIELD_ID.extra}}'}, {'{{errors.FIELD_ID}}'}.
          </div>
        </div>
      )}
      {mode === 'picks' && (
        <div className="space-y-3">
          <div className="text-xxs text-gray-600">Assemble un objet JSON depuis plusieurs champs.</div>
          <div className="space-y-2">
            {picks.map((p, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input className="input input-bordered input-xs col-span-2" placeholder="clé" value={p.key} onChange={e => updatePicks(picks.map((x,i)=> i===idx?{...x,key:e.target.value}:x))} />
                <select className="select select-bordered select-xs col-span-3" value={p.from} onChange={e => updatePicks(picks.map((x,i)=> i===idx?{...x,from:e.target.value as ComposerPick['from']}:x))}>
                  <option value="values">values</option>
                  <option value="advancedSelect">advancedSelect</option>
                  <option value="errors">errors</option>
                </select>
                <input className="input input-bordered input-xs col-span-3" placeholder="fieldId" value={p.fieldId} onChange={e => updatePicks(picks.map((x,i)=> i===idx?{...x,fieldId:e.target.value}:x))} />
                <input className="input input-bordered input-xs col-span-3" placeholder="path/part (option)" value={p.path || ''} onChange={e => updatePicks(picks.map((x,i)=> i===idx?{...x,path:e.target.value}:x))} />
                <button className="btn btn-xs btn-error col-span-1" type="button" onClick={() => removePick(idx)}>✕</button>
              </div>
            ))}
            {picks.length === 0 && <div className="text-xs text-gray-500 italic">Aucun pick.</div>}
          </div>
          <div className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded border">
            <input className="input input-bordered input-xs col-span-2" placeholder="clé" value={newPick.key} onChange={e => setNewPick(n => ({ ...n, key: e.target.value }))} />
            <select className="select select-bordered select-xs col-span-3" value={newPick.from} onChange={e => setNewPick(n => ({ ...n, from: e.target.value as ComposerPick['from'] }))}>
              <option value="values">values</option>
              <option value="advancedSelect">advancedSelect</option>
              <option value="errors">errors</option>
            </select>
            <input className="input input-bordered input-xs col-span-3" placeholder="fieldId" value={newPick.fieldId} onChange={e => setNewPick(n => ({ ...n, fieldId: e.target.value }))} />
            <input className="input input-bordered input-xs col-span-3" placeholder="path/part (option)" value={newPick.path} onChange={e => setNewPick(n => ({ ...n, path: e.target.value }))} />
            <button className="btn btn-xs btn-primary col-span-1" type="button" onClick={addPick}>＋</button>
          </div>
          <div className="text-xxs text-gray-600">from=advancedSelect: path=selection|extra. errors: message d'erreur.</div>
        </div>
      )}
    </div>
  );
}

export default AdvancedConfigPanel;