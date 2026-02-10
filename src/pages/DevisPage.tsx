import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';
import { applyValidation } from '../utils/validationHelper';
import { evaluateDependency } from '../utils/dependencyValidator';
import type { FieldDependency as StoreFieldDependency } from '../store/slices/types';
import { DynamicFormulaEngine } from '../services/DynamicFormulaEngine';

type FieldOption = { id: string; label: string; value?: string };
type Field = {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  width?: string;
  options?: FieldOption[];
  config?: Record<string, unknown> | null;
  advancedConfig?: Record<string, unknown> | null; // Garde pour compatibilité
};

// Valeur typée pour un fichier uploadé côté utilisateur
type UploadedFileValue = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

function isUploadedFileValue(v: unknown): v is UploadedFileValue {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.name === 'string' && typeof obj.dataUrl === 'string';
}
type Section = { id: string; name: string; sectionType?: string | null; menuFieldId?: string | null; order?: number; active?: boolean; fields: Field[] };
type Block = { id: string; name?: string; sections: Section[] };
type LeadData = { devis?: Record<string, Record<string, unknown>> } & Record<string, unknown>;
type Lead = { id: string; data?: LeadData; name?: string; email?: string; company?: string };

type FieldUIState = { visible: boolean; disabled: boolean; required: boolean };
type RuleFormula = { id: string; sequence?: unknown; order?: number; name?: string; targetFieldId?: string };
type FieldRuleSets = {
  validations?: Array<{ id: string; type?: string; message?: string; params?: Record<string, unknown> }>;
  dependencies?: Array<StoreFieldDependency>;
  formulas?: Array<RuleFormula>;
};

type BlockListItem = { id: string; name?: string };
type LeadLite = { id: string; name: string; email?: string; company?: string };

function isWrapped<T>(x: unknown): x is { success: boolean; data: T } {
  if (!x || typeof x !== 'object') return false;
  const obj = x as Record<string, unknown>;
  return 'data' in obj;
}

export default function DevisPage() {
  const { get, put, post } = useAuthenticatedApi();
  const { user } = useAuth();
  
  // === Système de formules dynamiques ===
  const dynamicEngine = useMemo(() => new DynamicFormulaEngine(), []);
  
  // --- Debug helpers (prix) ---
  const debugEnabled = true; // mettre false pour couper les logs
  const dbg = useCallback((...args: unknown[]) => { if (debugEnabled) console.log('[DevisDebug]', ...args); }, [debugEnabled]);

  // Fonction pour extraire les styles d'un champ
  const getFieldStyles = useCallback((field: Field) => {
    const config = (field.config || field.advancedConfig || {}) as Record<string, unknown>;
    const styles: React.CSSProperties = {};
    const classNames: string[] = [];

    // Couleur de fond
    if (config.backgroundColor && typeof config.backgroundColor === 'string') {
      styles.backgroundColor = config.backgroundColor;
    }
    // Support pour 'color' comme alias de backgroundColor (compatibilité)
    if (!styles.backgroundColor && config.color && typeof config.color === 'string') {
      styles.backgroundColor = config.color;
    }

    // Couleur du texte
    if (config.textColor && typeof config.textColor === 'string') {
      styles.color = config.textColor;
    }

    // Couleur de bordure
    if (config.borderColor && typeof config.borderColor === 'string') {
      styles.borderColor = config.borderColor;
    }

    // Taille de police
    if (config.fontSize && typeof config.fontSize === 'string') {
      styles.fontSize = config.fontSize;
    }

    // Police
    if (config.fontFamily && typeof config.fontFamily === 'string') {
      styles.fontFamily = config.fontFamily;
    }

    // Gras/italique
    if (config.fontWeight && typeof config.fontWeight === 'string') {
      styles.fontWeight = config.fontWeight;
    }
    if (config.fontStyle && typeof config.fontStyle === 'string') {
      styles.fontStyle = config.fontStyle;
    }

    // Classes CSS personnalisées
    if (config.customClass && typeof config.customClass === 'string') {
      classNames.push(config.customClass);
    }

    return { styles, classNames };
  }, []);

  // États du composant
  const saveTimer = useRef<number | null>(null);
  const [ui, setUi] = useState<Record<string, FieldUIState>>({});
  const [rules, setRules] = useState<Record<string, FieldRuleSets>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  // Mapping explicite champ->node
  const fieldNodeMappingRef = useRef<null | { mappings?: Array<{ labelMatch?: string; nodeRole?: string; preferredNodeId?: string }> }>(null);
  const evaluatePriceDebounceRef = useRef<number | null>(null);
  const latestValuesRef = useRef<Record<string, unknown>>({});

  // Charger mapping (lazy)
  useEffect(() => {
    (async () => {
      try {
        if (fieldNodeMappingRef.current) return;
        const resp = await fetch('/scripts/field-node-mapping.json');
        if (resp.ok) {
          const json = await resp.json();
          fieldNodeMappingRef.current = json;
          if (debugEnabled) dbg('Mapping chargé', json);
        }
      } catch {/* noop */}
    })();
  }, [dbg, debugEnabled]);

  // Fonction pour appliquer les dépendances des champs
  const applyDependencies = useCallback((fieldId: string, allValues: Record<string, unknown>) => {
    const rset = rules[fieldId];
    if (!rset?.dependencies) return ui[fieldId] || { visible: true, disabled: false, required: false };

    const newState = { ...(ui[fieldId] || { visible: true, disabled: false, required: false }) };

    for (const dep of rset.dependencies) {
      const dependsOnValue = allValues[dep.dependsOnId];
      const condition = dep.condition;
      const expectedValue = dep.value;

      let conditionMet = false;
      if (condition === '=') {
        conditionMet = dependsOnValue === expectedValue;
      } else if (condition === '!=') {
        conditionMet = dependsOnValue !== expectedValue;
      } else if (condition === 'exists') {
        conditionMet = dependsOnValue !== null && dependsOnValue !== undefined && dependsOnValue !== '';
      } else if (condition === 'not_exists') {
        conditionMet = !dependsOnValue || dependsOnValue === '';
      }

      // Appliquer l'action selon la dépendance
      if (conditionMet) {
        // La condition est remplie - le champ peut être visible/actif
        newState.visible = true;
        newState.disabled = false;
      } else {
        // La condition n'est pas remplie - cacher ou désactiver le champ
        newState.visible = false;
        newState.disabled = true;
      }
    }

    return newState;
  }, [rules, ui]);
  const isPriceKey = useCallback((k: string) => /prix|price/i.test(k), []);
  // Parse flexible: accepte virgule décimale, espaces, pourcentage éventuel
  const parseFlexibleNumber = useCallback((v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v !== 'string') return null;
    const s = v.trim();
    if (!s) return null;
    // Remplacer virgule par point, retirer espaces insécables ou normales
    let cleaned = s.replace(/\s+/g, '').replace(/,/g, '.');
    // Retirer un éventuel symbole % en fin et convertir en proportion
    let isPercent = false;
    if (/^[-+]?\d*([.,]\d+)?%$/.test(cleaned)) { isPercent = true; cleaned = cleaned.replace(/%$/, ''); }
    // Autoriser uniquement chiffres, point, signe
    if (!/^[-+]?\d*(\.\d+)?$/.test(cleaned)) return null;
    const num = Number(cleaned);
    if (!Number.isFinite(num)) return null;
    return isPercent ? num / 100 : num;
  }, []);
  // Cache pour enfants d'advanced_select: key = `${fieldId}::${parentId||'root'}`
  const [advCache, setAdvCache] = useState<Record<string, Array<{ id: string; label: string; value?: string }>>>({});
  const [params, setParams] = useSearchParams();
  const leadId = params.get('leadId') || '';
  const blockId = params.get('blockId') || '';
  const devisId = params.get('devisId') || '';
  const storageKey = devisId ? `${blockId}::${devisId}` : blockId;

  const [block, setBlock] = useState<Block | null>(null);
  const [availableBlocks, setAvailableBlocks] = useState<BlockListItem[]>([]);
  const [lead, setLead] = useState<Lead | null>(null);
  const [allLeads, setAllLeads] = useState<LeadLite[]>([]);
  const [leadQuery, setLeadQuery] = useState('');
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const leadInputRef = useRef<HTMLInputElement | null>(null);
  // Champ modifié en dernier par l'utilisateur (pour ne pas l'écraser aussitôt par une formule retournant 0)
  const lastUserEditRef = useRef<string | null>(null);
  // Ensemble des champs considérés comme récemment modifiés (inclut propagation prix)
  const recentUserFieldsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    latestValuesRef.current = { ...values };
  }, [values]);
  // Ensemble des champs dont la valeur affichée provient d'une formule (badge "auto")
  const [autoFields, setAutoFields] = useState<Set<string>>(new Set());
  // Champs dont la valeur affichée provient d'un override manuel (mode auto désactivé)
  const [manualOverrideFields, setManualOverrideFields] = useState<Set<string>>(new Set());
  // Cache des meta override (manualNodeId/modeNodeId) si nécessaire pour actions futures
  const overrideMetaRef = useRef<Record<string, { manualNodeId?: string; modeNodeId?: string }>>({});
  // Ensemble des champs identifiés comme prix (par label ou id)
  const [priceFieldIds, setPriceFieldIds] = useState<Set<string>>(new Set());
  // Champ miroir interne pour garantir persistance d'une valeur numérique de prix
  const PRICE_MIRROR_ID = '__prix_mirror';
  // Couplage détecté: champ advanced_select prix -> champ numérique prix
  const priceLinkRef = useRef<{ advId: string | null; numId: string | null }>({ advId: null, numId: null });
  // Nom du devis (métadonnées)
  const [devisName, setDevisName] = useState('');
  // Afficher les devis archivés dans la liste
  const [showArchived, setShowArchived] = useState(false);
  // Affichage données brutes devis
  const [showRawDevis, setShowRawDevis] = useState(false);

  // Format court pour les dates dans les options
  const formatShortDateTime = useCallback((iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    try {
      return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' } as Intl.DateTimeFormatOptions);
    } catch {
      return d.toLocaleString();
    }
  }, []);

  // === Helpers: mapping/préremplissage depuis le lead ===
  const normalize = useCallback((s: unknown) => String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ''), []);
  const getByPath = useCallback((obj: unknown, path: string): unknown => {
    if (!obj || typeof obj !== 'object' || !path) return undefined;
    const parts = path.split('.').filter(Boolean);
    let cur: unknown = obj;
    for (const p of parts) {
      if (!cur || typeof cur !== 'object') return undefined;
      const rec = cur as Record<string, unknown>;
      if (!(p in rec)) return undefined;
      cur = rec[p];
    }
    return cur;
  }, []);
  const tryDbField = useCallback((lead: Lead, dbField?: unknown): unknown => {
    if (!dbField || typeof dbField !== 'string') return undefined;
    const path = dbField.trim();
    if (path.startsWith('lead.')) return getByPath(lead, path.slice(5));
    if (path.startsWith('data.')) return getByPath(lead.data, path.slice(5));
    // Essais généraux: d'abord sur lead, puis sur lead.data
    return getByPath(lead, path) ?? getByPath(lead.data, path);
  }, [getByPath]);
  const findByKeys = useCallback((source: unknown, keys: string[], depth = 2): unknown => {
    if (!source || typeof source !== 'object' || depth < 0) return undefined;
    const obj = source as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      const kn = normalize(k);
      if (keys.includes(kn)) return v;
      if (v && typeof v === 'object') {
        const found = findByKeys(v, keys, depth - 1);
        if (typeof found !== 'undefined') return found;
      }
    }
    return undefined;
  }, [normalize]);
  const buildKeyCandidates = useCallback((f: Field): string[] => {
    const idn = normalize(f.id);
    const ln = normalize(f.label);
    const keys = new Set<string>([idn, ln]);
    const add = (k: string) => keys.add(normalize(k));
    const hay = `${idn}|${ln}`;
    if (/prenom/.test(hay) || /firstname/.test(hay)) { add('prenom'); add('firstName'); add('first_name'); }
    if (/(^|[^a-z])nom([^a-z]|$)/.test(hay) || /lastname/.test(hay)) { add('nom'); add('lastName'); add('last_name'); }
    if (/societe|company|entreprise/.test(hay)) { add('company'); add('societe'); }
    if (/email|mail/.test(hay)) { add('email'); }
    if (/telephone|tel|phone/.test(hay)) { add('phone'); add('telephone'); add('tel'); }
    if (/adresse|address/.test(hay)) { add('adresse'); add('address'); add('adresse1'); add('address1'); add('ligne1'); }
    if (/codepostal|postal|zip/.test(hay)) { add('codepostal'); add('postalcode'); add('zip'); }
    if (/ville|city/.test(hay)) { add('ville'); add('city'); }
    if (/pays|country/.test(hay)) { add('pays'); add('country'); }
    return Array.from(keys).filter(Boolean);
  }, [normalize]);

  // Wrapper d'évaluation de dépendance avec typage sécurisé
  const evalDepSafe = useCallback(
    (dep: StoreFieldDependency, v: Record<string, unknown>) => evaluateDependency(dep, v),
    []
  );

  // ✅ FIX: Data Composer extrait en fonction réutilisable pour les champs "donnee"
  // Peut être appelé au chargement initial, après formules, et dans handleChange
  const applyDataComposer = useCallback((currentValues: Record<string, unknown>, blockData: Block | null): Record<string, unknown> => {
    if (!blockData) return currentValues;
    const computed = { ...currentValues };
    const str = (v: unknown) => {
      if (v === null || typeof v === 'undefined') return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    };
    const getAdv = (fid: string, part?: string) => {
      const base = computed[fid];
      if (base && typeof base === 'object') {
        const obj = base as Record<string, unknown>;
        if (!part || part === 'selection') return obj['selection'];
        if (part === 'extra') return obj['extra'];
        return undefined;
      }
      if (!part || part === 'selection') return base;
      return undefined;
    };
    const replaceTemplate = (tpl: string): string => {
      return tpl.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_m, expr) => {
        const parts = String(expr).split('.');
        const root = parts[0];
        const fid = parts[1];
        const rest = parts.slice(2);
        if (!fid) return '';
        if (root === 'values') {
          let v: unknown = computed[fid];
          for (const p of rest) {
            if (!v || typeof v !== 'object') { v = undefined; break; }
            v = (v as Record<string, unknown>)[p];
          }
          return str(v);
        }
        if (root === 'advancedSelect') {
          const part = rest[0] || 'selection';
          return str(getAdv(fid, part));
        }
        return '';
      });
    };
    const deepEq = (a: unknown, b: unknown) => {
      if (a === b) return true;
      try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
    };
    let hasChanges = false;
    (blockData.sections || []).forEach((s) => {
      (s.fields || []).forEach((f) => {
        if (f.type !== 'donnee') return;
        const ac = (f.advancedConfig || {}) as Record<string, unknown>;
        const composer = ac?.['composer'] as Record<string, unknown> | undefined;
        if (!composer) return;
        const mode = (composer['mode'] as string) || 'template';
        let outVal: unknown = computed[f.id];
        if (mode === 'picks') {
          const picks = Array.isArray(composer['picks']) ? composer['picks'] as Array<Record<string, unknown>> : [];
          const res: Record<string, unknown> = {};
          picks.forEach((p) => {
            const key = String(p['key'] ?? '');
            const from = String(p['from'] ?? 'values');
            const fid = String(p['fieldId'] ?? '');
            const path = p['path'] ? String(p['path']) : undefined;
            if (!key || !fid) return;
            if (from === 'values') {
              let v: unknown = computed[fid];
              if (path && v && typeof v === 'object') v = (v as Record<string, unknown>)[path];
              res[key] = v;
            } else if (from === 'advancedSelect') {
              const part = path || 'selection';
              res[key] = getAdv(fid, part);
            } else {
              res[key] = computed[fid];
            }
          });
          outVal = res;
        } else {
          const tpl = String(composer['template'] ?? '');
          outVal = replaceTemplate(tpl);
        }
        if (!deepEq(outVal, computed[f.id])) {
          if (!(typeof outVal === 'string' && outVal.trim() === '' && typeof computed[f.id] !== 'undefined')) {
            computed[f.id] = outVal;
            hasChanges = true;
          }
        }
      });
    });
    return hasChanges ? computed : currentValues;
  }, []);

  // Charger le bloc (lecture sûre) dès qu'un blockId est présent
  useEffect(() => {
    if (!blockId) return;
    let mounted = true;
    (async () => {
      try {
        const b = await get<{ success: boolean; data: Block }>(`/api/blocks/${blockId}/read`);
        if (!mounted) return;
        const theBlock: Block = isWrapped<Block>(b) ? b.data : (b as unknown as Block);
        setBlock(theBlock);
        setActiveSectionIndex(0);

        // Init UI state et charger règles (validations/dépendances/formules) par champ
        const nextUi: Record<string, FieldUIState> = {};
        const nextRules: Record<string, FieldRuleSets> = {};
        await Promise.all(
          (theBlock.sections || []).flatMap(s => (s.fields || []).map(async (f) => {
            nextUi[f.id] = { visible: true, disabled: false, required: Boolean(f.required) };
            try {
              const [depsResp, valsResp, fmResp] = await Promise.all([
                get<{ success?: boolean; data?: unknown }>(`/api/fields/${f.id}/dependencies/read`).catch(() => ({ success: true, data: [] })),
                get<{ success?: boolean; data?: unknown }>(`/api/fields/${f.id}/validations/read`).catch(() => ({ success: true, data: [] })),
                get<unknown>(`/api/formulas/field/${f.id}`).catch(() => []),
              ]);
              const deps = isWrapped<unknown[]>(depsResp) ? (depsResp.data as unknown[]) : (Array.isArray(depsResp) ? (depsResp as unknown[]) : []);
              const vals = isWrapped<unknown[]>(valsResp) ? (valsResp.data as unknown[]) : (Array.isArray(valsResp) ? (valsResp as unknown[]) : []);
              const fms = Array.isArray(fmResp) ? fmResp as unknown[] : [];
              nextRules[f.id] = { validations: vals as FieldRuleSets['validations'], dependencies: deps as FieldRuleSets['dependencies'], formulas: fms as FieldRuleSets['formulas'] };
            } catch {
              nextRules[f.id] = {};
            }
          }))
        );
        setUi(nextUi);
        setRules(nextRules);
        // Identifier champs prix par label ou id
        try {
          const ids = new Set<string>();
          (theBlock.sections||[]).forEach(s=> (s.fields||[]).forEach(f=> {
            const label = (f.label||'').toString();
            if (/prix|price/i.test(label) || /prix|price/i.test(f.id)) ids.add(f.id);
          }));
          // Ajouter le miroir si prix détectés
          if (ids.size) ids.add(PRICE_MIRROR_ID);
          setPriceFieldIds(ids);
          if (ids.size) dbg('Champs prix détectés (label)', Array.from(ids));
          // Déterminer couplage advanced_select -> number si deux champs prix
          try {
            let advId: string | null = null;
            let numId: string | null = null;
            (theBlock.sections||[]).forEach(sec => (sec.fields||[]).forEach(f => {
              if (!ids.has(f.id)) return;
              if (f.type === 'advanced_select') advId = f.id;
              // Accepter un champ number, sinon n'importe quel autre type prix comme fallback numérique
              if (f.type !== 'advanced_select' && !numId) numId = f.id;
            }));
            priceLinkRef.current = { advId, numId };
            if (advId && numId) dbg('Couplage prix détecté advanced_select -> cible', advId, '=>', numId);
            else if (advId && !numId) dbg('Couplage prix: advanced_select trouvé sans cible numérique claire');
          } catch {/* noop */}
        } catch {/* noop */}
      } catch {
        // noop
      }
    })();
    return () => { mounted = false; };
  }, [blockId, get, dbg, setRules, setUi]);
  // Fonctions mémorisées pour advanced_select (éviter recréations / boucles)
  const loadChildrenMemo = useCallback(async (fieldId: string, parentId: string | null) => {
    const key = `${fieldId}::${parentId || 'root'}`;
    if (advCache[key]) return advCache[key];
    try {
      const resp = await get<{ success?: boolean; data?: Array<{ id: string; label: string; value?: string }> } | Array<{ id: string; label: string; value?: string }>>(`/api/option-nodes/field/${fieldId}/children${parentId ? `?parentId=${encodeURIComponent(parentId)}` : ''}`);
      const list = Array.isArray(resp) ? resp as Array<{ id: string; label: string; value?: string }> : ((resp && typeof resp === 'object' && 'data' in resp) ? (resp as { data?: Array<{ id: string; label: string; value?: string }> }).data || [] : []);
      setAdvCache(prev => ({ ...prev, [key]: list }));
      return list;
    } catch {
      return [];
    }
  }, [advCache, get]);
  const fetchNodeDetailMemo = useCallback(async (id: string) => {
    try {
      const resp = await get<{ success?: boolean; data?: { id: string; data?: Record<string, unknown> } } | { id: string; data?: Record<string, unknown> }>(`/api/option-nodes/${id}`);
      const node = (resp && typeof resp === 'object' && 'data' in resp) ? (resp as { data?: { id: string; data?: Record<string, unknown> } }).data : (resp as { id: string; data?: Record<string, unknown> } | undefined);
      return node || null;
    } catch { return null; }
  }, [get]);

  // Charger le lead dès qu'un leadId est présent
  useEffect(() => {
    if (!leadId) return;
    let mounted = true;
    (async () => {
      try {
        const l = await get<Lead>(`/api/leads/${leadId}`);
        if (!mounted) return;
        setLead(l as unknown as Lead);
      } catch {/* noop */}
    })();
    return () => { mounted = false; };
  }, [leadId, get]);

  // Réinitialiser l'état UI quand le storageKey change et qu'il n'y a pas de données
  useEffect(() => {
    if (!lead || !storageKey) return;
    const existing = (lead.data?.devis as Record<string, unknown> | undefined)?.[storageKey];
    const hasData = existing && typeof existing === 'object' && Object.keys(existing).filter(k => k !== '_meta').length > 0;
    
    if (!hasData) {
      // Réinitialiser les états UI pour un devis vierge
      setUi({});
      setErrors({});
      setAutoFields(new Set());
      setManualOverrideFields(new Set());
      overrideMetaRef.current = {};
      recentUserFieldsRef.current = new Set();
      lastUserEditRef.current = null;
      // ✅ FIX: Réinitialiser aussi les valeurs calculées pour un nouveau devis
      setValues({});
    }
  }, [storageKey, lead]);

  // Renseigner l'input avec le nom du lead sélectionné
  useEffect(() => {
    if (lead && leadId) {
      const label = [lead.name, lead.company, lead.email].filter(Boolean).join(' — ');
      if (label) setLeadQuery(label);
    }
  }, [lead, leadId]);

  // Autosave debounced vers lead.data.devis[storageKey]
  const scheduleSave = useCallback((nextValues: Record<string, unknown>) => {
    if (!leadId || !blockId) return;
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(async () => {
      try {
        setSaving(true);
        // Log ciblé avant construction du payload
        try {
          const priceSnapshot: Record<string, unknown> = {};
          Object.entries(nextValues).forEach(([k,v]) => { if (isPriceKey(k) || priceFieldIds.has(k)) priceSnapshot[k] = v; });
          dbg('scheduleSave -> valeurs prix détectées', priceSnapshot);
          // Log des advanced_select (structure)
          const advDebug: Record<string, unknown> = {};
          Object.entries(nextValues).forEach(([k,v]) => {
            if (v && typeof v === 'object' && !Array.isArray(v)) {
              const o = v as Record<string, unknown>;
              if ('selection' in o && 'nodeId' in o) advDebug[k] = o;
            }
          });
          if (Object.keys(advDebug).length) dbg('scheduleSave -> advanced_select snapshot', advDebug);
        } catch {/* noop */}
        // Normalisation finale: si on a un couplage prix et une valeur extra numérique, s'assurer que la cible contient la version calculée/dérivée
        try {
          const pl = priceLinkRef.current;
          if (pl.advId && pl.numId) {
            const advVal = nextValues[pl.advId];
            if (advVal && typeof advVal === 'object' && !Array.isArray(advVal)) {
              const o = advVal as Record<string, unknown>;
              const raw = (typeof o.extra === 'string' || typeof o.extra === 'number') ? o.extra : (typeof o.selection === 'string' || typeof o.selection === 'number' ? o.selection : undefined);
              if (typeof raw === 'string' || typeof raw === 'number') {
                const parsed = parseFlexibleNumber(raw);
                if (parsed !== null) {
                  let finalVal = parsed;
                  const selStr = typeof o.selection === 'string' ? o.selection.toLowerCase() : '';
                  if (/calcul/.test(selStr)) {
                    // Rechercher consommation encore (même heuristique)
                    try {
                      const consumptionEntry = Object.entries(nextValues).find(([k,v]) => {
                        if (!v && v !== 0) return false;
                        const fMeta = (block?.sections || []).flatMap((s: Section)=> (s.fields||[])).find((f: Field)=> f.id===k);
                        const label = (fMeta?.label||'') + ' ' + k;
                        return /consommation/i.test(label) && /kwh/i.test(label);
                      });
                      if (consumptionEntry) {
                        const consNum = parseFlexibleNumber(consumptionEntry[1]);
                        if (consNum && consNum>0) {
                          finalVal = Number((parsed / consNum).toFixed(6));
                        }
                      }
                    } catch {/* noop */}
                  }
                  if (nextValues[pl.numId] !== finalVal) {
                    nextValues = { ...nextValues, [pl.numId]: finalVal }; // recréer pour immuabilité
                    dbg('Normalisation sauvegarde prix', pl.numId, '=>', finalVal);
                  }
                }
              }
            }
          }
        } catch {/* noop */}
        const newData: LeadData = { ...(lead?.data || {}) } as LeadData;
        newData.devis = newData.devis || {};
        // Conserver meta existant et mettre à jour le nom
        const prev = (newData.devis as Record<string, Record<string, unknown>>)[storageKey] || {};
        const prevMeta = (prev && typeof prev === 'object' ? (prev as Record<string, unknown>)['_meta'] : undefined) as Record<string, unknown> | undefined;
        const nowIso = new Date().toISOString();
        const meta: Record<string, unknown> = {
          ...prevMeta,
          name: (devisName || '').trim(),
          updatedAt: nowIso,
          createdAt: prevMeta?.createdAt || nowIso,
        };
        (newData.devis as Record<string, Record<string, unknown>>)[storageKey] = {
          ...nextValues,
          _meta: meta,
        } as Record<string, unknown> as Record<string, unknown>;
        // Log payload prix avant PUT
        try {
          const pricePayload: Record<string, unknown> = {};
          const stored = (newData.devis as Record<string, Record<string, unknown>>)[storageKey];
          Object.entries(stored).forEach(([k,v]) => { if (isPriceKey(k) || priceFieldIds.has(k)) pricePayload[k] = v; });
          dbg('PUT /api/leads prix dans payload', pricePayload);
          const advPayload: Record<string, unknown> = {};
          Object.entries(stored).forEach(([k,v]) => { if (v && typeof v === 'object' && !Array.isArray(v)) { const o=v as Record<string, unknown>; if ('selection' in o && 'nodeId' in o) advPayload[k]=o; }});
          if (Object.keys(advPayload).length) dbg('PUT /api/leads advanced_select payload', advPayload);
        } catch {/* noop */}
        await put(`/api/leads/${leadId}`, { data: newData });
        dbg('PUT terminé');
      } finally {
        setSaving(false);
      }
    }, 600);
  }, [leadId, blockId, storageKey, put, lead, devisName, dbg, isPriceKey, priceFieldIds, parseFlexibleNumber, block?.sections]);

  // Pré-remplir les valeurs quand lead et/ou block changent
  useEffect(() => {
    if (!block) return;
  const existing = (lead && lead.data && lead.data.devis && lead.data.devis[storageKey]) ? lead.data.devis[storageKey] : {};
    // Charger le nom du devis s'il existe
    try {
      const metaName = existing && typeof existing === 'object' ? (existing as Record<string, unknown>)?.['_meta'] && (existing as Record<string, unknown>)?.['_meta'] as Record<string, unknown> : undefined;
      const nm = metaName && typeof metaName === 'object' ? (metaName['name'] as string | undefined) : undefined;
      if (typeof nm === 'string') setDevisName(nm);
      else setDevisName('');
    } catch {
      setDevisName('');
    }

    // Si aucun devis n'existe (suppression complète), réinitialiser l'état
    const hasExistingData = existing && typeof existing === 'object' && Object.keys(existing).filter(k => k !== '_meta').length > 0;
    
    // Construire un préremplissage à partir du lead pour les champs vides
    const prefill: Record<string, unknown> = {};
    if (lead) {
      (block.sections || []).forEach((s) => {
        (s.fields || []).forEach((f) => {
          const already = existing && typeof existing === 'object' ? (existing as Record<string, unknown>)[f.id] : undefined;
          if (typeof already !== 'undefined' && already !== '') return;
          // 1) dbField explicite
          const dbField = (f.advancedConfig as Record<string, unknown> | undefined)?.dbField as string | undefined;
          const fromDbField = tryDbField(lead, dbField);
          if (typeof fromDbField !== 'undefined' && fromDbField !== null && fromDbField !== '') {
            prefill[f.id] = fromDbField;
            return;
          }
          // 2) Heuristique sur id/label dans lead puis lead.data
          const candidates = buildKeyCandidates(f);
          const vTop = findByKeys(lead, candidates, 1);
          if (typeof vTop !== 'undefined' && vTop !== null && vTop !== '') { prefill[f.id] = vTop; return; }
          const vData = findByKeys(lead.data, candidates, 2);
          if (typeof vData !== 'undefined' && vData !== null && vData !== '') { prefill[f.id] = vData; return; }
        });
      });
    }

    // Fusion: prefill (faible) < existing (fort)
    // Si pas de données existantes, utiliser uniquement le prefill pour un état vierge
    const combined = hasExistingData 
      ? { ...(prefill || {}), ...(existing || {}) } as Record<string, unknown>
      : { ...(prefill || {}) } as Record<string, unknown>;
    
    // Restauration automatique: si advanced_select prix présent mais champ numérique pas renseigné, repropager vers miroir
    try {
      if (priceFieldIds.size && !combined[PRICE_MIRROR_ID]) {
        const advId = Array.from(priceFieldIds).find(id => id !== PRICE_MIRROR_ID && typeof combined[id] === 'object');
        if (advId) {
          const advVal = combined[advId];
          if (advVal && typeof advVal === 'object') {
            const o = advVal as Record<string, unknown>;
            const raw = (typeof o.extra === 'string' || typeof o.extra === 'number') ? o.extra : (typeof o.selection === 'string' || typeof o.selection === 'number' ? o.selection : undefined);
            if (raw !== undefined) {
              const parsed = parseFlexibleNumber(raw as unknown);
              if (parsed !== null) combined[PRICE_MIRROR_ID] = parsed;
            }
          }
        }
      }
    } catch {/* noop */}
    setValues(combined);
    // Une fois que valeurs initiales & règles sont prêtes, tenter de charger les valeurs effectives (formule vs manuel)
    (async () => {
      try {
        // Déterminer les IDs plausibles candidats (prix) + tout champ potentiellement calculé
        const candidateIds: string[] = []; 
        (block.sections||[]).forEach(s=> (s.fields||[]).forEach(f=> {
          if (/prix kwh|prix k|kwh/i.test(f.label || '') || /prix_kwh/i.test(f.id)) candidateIds.push(f.id);
        }));
        // Inclure éventuels nœuds issus d'une config antérieure (ex: roles) si exposés dans values
        Object.keys(combined).forEach(k => { if (/prix|kwh/i.test(k) && !candidateIds.includes(k)) candidateIds.push(k); });
        if (!candidateIds.length) return;
        // Appel API effective-values (TreeBranchLeaf)
  type EffectiveValueInfo = { value: number | string | null; source: string; manualApplied: boolean; manualNodeId?: string; modeNodeId?: string };
  type EffectiveValuesResponse = { success?: boolean; data?: Record<string, EffectiveValueInfo> } | Record<string, EffectiveValueInfo>;
  const ev = await get<EffectiveValuesResponse>(`/api/treebranchleaf/effective-values?ids=${encodeURIComponent(candidateIds.join(','))}`);
  const payload: Record<string, EffectiveValueInfo> = (ev && typeof ev === 'object' && 'data' in ev) ? ((ev as { data?: Record<string, EffectiveValueInfo> }).data || {}) : (ev as Record<string, EffectiveValueInfo>) || {};
        if (payload && Object.keys(payload).length) {
          const nextValues = { ...combined } as Record<string, unknown>;
          const manualSet = new Set<string>();
          const autoSetAdd: string[] = [];
          Object.entries(payload).forEach(([nid, info]) => {
            overrideMetaRef.current[nid] = { manualNodeId: info.manualNodeId, modeNodeId: info.modeNodeId };
            if (info.manualApplied) {
              // Appliquer valeur manuelle si fournie
              if (typeof info.value !== 'undefined' && info.value !== null) {
                nextValues[nid] = info.value;
                manualSet.add(nid);
              }
            } else if (info.source === 'formula') {
              // Marquer comme auto si pas déjà override manuel
              autoSetAdd.push(nid);
            }
          });
          if (manualSet.size || autoSetAdd.length) {
            setValues(vPrev => ({ ...vPrev, ...nextValues }));
            if (manualSet.size) setManualOverrideFields(manualSet);
            if (autoSetAdd.length) setAutoFields(prev => { const n = new Set(prev); autoSetAdd.forEach(id => n.add(id)); return n; });
          }
        }
      } catch {/* noop */}
    })();
    // Sauvegarder automatiquement la première version pour “Nouveau” devis
    if (lead && blockId) {
      scheduleSave(combined);
    }
  }, [block, lead, storageKey, scheduleSave, blockId, tryDbField, findByKeys, buildKeyCandidates, parseFlexibleNumber, priceFieldIds, get]);

  // Charger la liste des formulaires disponibles (lecture sûre)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await get<{ success?: boolean; data?: BlockListItem[] } | BlockListItem[]>(`/api/blocks/read`);
        let list: BlockListItem[] = [];
        if (Array.isArray(resp)) {
          list = resp as BlockListItem[];
        } else if (resp && typeof resp === 'object' && 'data' in resp) {
          const wrapped = resp as { data?: BlockListItem[] };
          list = wrapped.data || [];
        }
        if (mounted) setAvailableBlocks(list.map((b) => ({ id: b.id, name: b.name })));
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [get]);

  // Charger la liste des leads (pour autocomplétion)
  useEffect(() => {
    let mounted = true;
  (async () => {
      try {
    type LeadResp = { id: string; name: string; email?: string; company?: string };
    const resp = await get<{ success?: boolean; data?: LeadResp[] } | LeadResp[]>(`/api/leads`);
    let list: LeadResp[] = [];
        if (Array.isArray(resp)) list = resp;
    else if (resp && typeof resp === 'object' && 'data' in resp) list = (resp as { data?: LeadResp[] }).data || [];
        if (mounted) setAllLeads(list.map(l => ({ id: l.id, name: l.name, email: l.email, company: l.company })));
      } catch {
        // silencieux
      }
    })();
    return () => { mounted = false; };
  }, [get]);

  const leadSuggestions = useMemo(() => {
    const q = leadQuery.trim().toLowerCase();
    if (q.length < 2) return [] as LeadLite[];
    return allLeads.filter(l =>
      l.name?.toLowerCase().includes(q) ||
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.company && l.company.toLowerCase().includes(q))
    ).slice(0, 12);
  }, [leadQuery, allLeads]);



  // Options de devis existants pour le lead+block sélectionnés
  const devisOptions = useMemo(() => {
    if (!lead || !blockId) return [] as Array<{ key: string; label: string; devisId: string }>;
    const d = (lead.data && lead.data.devis) ? lead.data.devis : {} as Record<string, unknown>;
    type Opt = { key: string; label: string; devisId: string; ts: number };
    const opts: Array<Opt> = [];
    Object.keys(d).forEach(k => {
      const entry = d[k] as Record<string, unknown> | undefined;
      const meta = entry && typeof entry === 'object' ? (entry['_meta'] as Record<string, unknown> | undefined) : undefined;
      const metaName = meta && typeof meta === 'object' ? (meta['name'] as string | undefined) : undefined;
      const archived = meta && typeof meta === 'object' ? Boolean(meta['archived']) : false;
      if (archived && !showArchived) return;
      const updatedAt = (meta?.['updatedAt'] as string | undefined) || undefined;
      const createdAt = (meta?.['createdAt'] as string | undefined) || undefined;
      const ts = (() => {
        const u = updatedAt ? Date.parse(updatedAt) : NaN;
        const c = createdAt ? Date.parse(createdAt) : NaN;
        if (!Number.isNaN(u)) return u;
        if (!Number.isNaN(c)) return c;
        return 0;
      })();
      const dateStr = formatShortDateTime(updatedAt || createdAt);
      if (k === blockId) {
        const base = metaName?.trim() ? metaName : 'Défaut';
        const label = dateStr ? `${base} · ${dateStr}` : base as string;
        opts.push({ key: k, label, devisId: '', ts });
      } else if (k.startsWith(`${blockId}::`)) {
        const did = k.substring(blockId.length + 2);
        const base = metaName?.trim() ? metaName : (did || 'Sans nom');
        const label = dateStr ? `${base} · ${dateStr}` : base as string;
        opts.push({ key: k, label, devisId: did, ts });
      }
    });
    // trier par date décroissante, puis par label
    return opts.sort((a, b) => (b.ts - a.ts) || a.label.localeCompare(b.label)).map(({ key, label, devisId }) => ({ key, label, devisId }));
  }, [lead, blockId, showArchived, formatShortDateTime]);

  // Générateur simple d'identifiant de devis (client-side)
  const generateDevisId = useCallback(() => {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 6);
    return `${ts}${rand}`;
  }, []);

  // Métadonnées du devis courant (pour l'archivage notamment)
  const currentMeta = useMemo(() => {
    const entry = lead?.data?.devis && (lead.data.devis as Record<string, unknown>)[storageKey];
    if (entry && typeof entry === 'object') {
      const meta = (entry as Record<string, unknown>)['_meta'];
      return (meta && typeof meta === 'object') ? meta as Record<string, unknown> : undefined;
    }
    return undefined;
  }, [lead, storageKey]);
  const isArchived = Boolean(currentMeta?.archived);

  // Entrée brute actuelle du devis
  const currentDevisEntry = useMemo(() => {
    const entry = lead?.data?.devis && (lead.data.devis as Record<string, unknown>)[storageKey];
    return (entry && typeof entry === 'object') ? entry as Record<string, unknown> : undefined;
  }, [lead, storageKey]);

  // Analyse proactive: comparer champs stockés vs champs définis dans le bloc
  useEffect(() => {
    if (!currentDevisEntry || !block) return;
    try {
      const fieldIds = new Set<string>();
      (block.sections||[]).forEach(s => (s.fields||[]).forEach(f => fieldIds.add(f.id)));
      const storedKeys = Object.keys(currentDevisEntry).filter(k => k !== '_meta');
      const missingInUi = storedKeys.filter(k => !fieldIds.has(k));
      const emptyInStorage = Array.from(fieldIds).filter(id => !(id in currentDevisEntry));
      dbg('Analyse devis -> clés stockées', storedKeys);
      if (missingInUi.length) dbg('Analyse devis -> clés orphelines (ID changés ?)', missingInUi);
      if (emptyInStorage.length) dbg('Analyse devis -> champs sans valeur stockée', emptyInStorage);
    } catch {/* noop */}
  }, [currentDevisEntry, block, dbg]);

  // Si aucun devis n'existe pour ce lead+bloc et aucun devisId sélectionné, créer automatiquement un nouveau devisId
  useEffect(() => {
    if (!lead || !blockId || !leadId) return;
    const hasAny = devisOptions.length > 0;
    if (!hasAny && !devisId) {
      const newId = generateDevisId();
      const next = new URLSearchParams(params);
      next.set('devisId', newId);
      setParams(next, { replace: true });
      // Les valeurs seront réinitialisées via l'effet de pré-remplissage basé sur storageKey
    }
  }, [lead, blockId, leadId, devisOptions.length, devisId, generateDevisId, params, setParams]);


  // Si on masque les archivés et que le devis courant est archivé, basculer vers un autre
  useEffect(() => {
    if (showArchived) return;
    if (!lead || !blockId) return;
    if (!isArchived) return;
    const d = (lead.data?.devis || {}) as Record<string, unknown>;
    const candidates = Object.keys(d).filter(k => (k === blockId || k.startsWith(`${blockId}::`))).filter(k => {
      const e = d[k] as Record<string, unknown>;
      const m = e && typeof e === 'object' ? (e['_meta'] as Record<string, unknown> | undefined) : undefined;
      return !(m?.archived);
    });
    const nextParams = new URLSearchParams(params);
    if (candidates.includes(blockId)) {
      nextParams.delete('devisId');
    } else if (candidates.length > 0) {
      const named = candidates.find(k => k.startsWith(`${blockId}::`));
      if (named) {
        const nextId = named.substring(blockId.length + 2);
        nextParams.set('devisId', nextId);
      } else {
        nextParams.delete('devisId');
      }
    } else {
      const newId = generateDevisId();
      nextParams.set('devisId', newId);
    }
    setParams(nextParams, { replace: true });
  }, [showArchived, isArchived, lead, blockId, params, setParams, generateDevisId]);

  // Sauvegarder le nom du devis lorsqu'il change (debounced via scheduleSave)
  useEffect(() => {
    if (!leadId || !blockId) return;
    // Déclencher une sauvegarde des métadonnées sans toucher aux valeurs
    scheduleSave({ ...latestValuesRef.current });
  }, [devisName, leadId, blockId, scheduleSave]);

  const onChange = useCallback((fieldId: string, value: unknown) => {
    lastUserEditRef.current = String(fieldId);
  // Marquer ce champ comme modification utilisateur
  try { recentUserFieldsRef.current.add(String(fieldId)); } catch {/* noop */}
    if (isPriceKey(fieldId) || priceFieldIds.has(fieldId)) dbg('onChange prix', fieldId, '=>', value);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const o = value as Record<string, unknown>;
      if ('selection' in o && 'nodeId' in o) dbg('onChange advanced_select', fieldId, o);
    }
    // Si l'utilisateur modifie un champ marqué auto, on le retire de l'ensemble (devient manuel)
    setAutoFields(prev => {
      if (!prev.has(String(fieldId))) return prev;
      const next = new Set(prev); next.delete(String(fieldId)); return next;
    });
    setValues(prev => {
      const next = { ...prev, [fieldId]: value };

      // Injection immédiate: si le champ modifié est l'advanced_select prix et qu'on a une valeur extra numérique, recopier dans le champ number associé
      try {
        const pl = priceLinkRef.current;
        if (fieldId === pl.advId && value && typeof value === 'object' && !Array.isArray(value)) {
          const o = value as Record<string, unknown>;
          const raw = (typeof o.extra === 'string' || typeof o.extra === 'number') ? o.extra : (typeof o.selection === 'string' || typeof o.selection === 'number' ? o.selection : undefined);
          if (typeof raw === 'string' || typeof raw === 'number') {
            const parsed = parseFlexibleNumber(raw);
            if (parsed !== null) {
              let targetApplied: string | null = null;
              if (pl.numId) {
                if (next[pl.numId] !== parsed) {
                  next[pl.numId] = parsed;
                  targetApplied = pl.numId;
                  dbg('Propagation prix extra -> cible', pl.advId, '=>', pl.numId, parsed);
                }
              } else {
                const fallbackId = Array.from(priceFieldIds).find(id => id !== pl.advId && typeof next[id] !== 'object');
                if (fallbackId && next[fallbackId] !== parsed) {
                  next[fallbackId] = parsed;
                  targetApplied = fallbackId;
                  dbg('Propagation prix extra (fallback) ->', pl.advId, '=>', fallbackId, parsed);
                }
                if (!fallbackId) dbg('Propagation prix: aucune cible numérique trouvée (fallback manqué)');
              }
              // Mettre à jour le miroir interne toujours
              if (next[PRICE_MIRROR_ID] !== parsed) {
                next[PRICE_MIRROR_ID] = parsed;
                dbg('Miroir prix mis à jour', PRICE_MIRROR_ID, parsed);
              }
              if (targetApplied) {
                try { recentUserFieldsRef.current.add(String(targetApplied)); } catch {/* noop */}
              }
            }
          }
        }
      } catch {/* noop */}

      // 1) Dépendances -> UI
      try {
        const perField = Object.entries(rules);
        const updatedUi: Record<string, FieldUIState> = { ...ui };
        perField.forEach(([fid, r]) => {
          if (!r?.dependencies) return;
          r.dependencies.forEach((dep: StoreFieldDependency) => {
            const targetId = dep.targetFieldId || dep.sequence?.targetFieldId || fid;
            if (!targetId) return;
            const evalValues = { ...next } as Record<string, unknown>;
            const depInput: StoreFieldDependency = {
              id: dep.id,
              name: dep.name,
              sequence: dep.sequence,
              targetFieldId: targetId,
              defaultValue: dep.defaultValue,
            };
            const result = evalDepSafe(depInput, evalValues as Record<string, unknown>);
            const cur = updatedUi[targetId] || { visible: true, disabled: false, required: Boolean((ui[targetId]?.required) || false) };
            if (result.result === 'show') updatedUi[targetId] = { ...cur, visible: true };
            if (result.result === 'hide') updatedUi[targetId] = { ...cur, visible: false };
            if (result.result === 'require') updatedUi[targetId] = { ...cur, required: true };
            if (result.result === 'unrequire') updatedUi[targetId] = { ...cur, required: false };
          });
        });
        setUi(updatedUi);
      } catch {
        // ignorer erreurs eval
      }

      // 2) Validation du champ changé (basique) -> construire une map d'erreurs locale
      const localErrors: Record<string, string | null> = { ...errors };
      const rset = rules[fieldId];
      if (rset?.validations && rset.validations.length > 0) {
        const first = rset.validations[0];
        const ok = first?.type ? applyValidation(first.type, value, first.params, next as Record<string, unknown>) : true;
        localErrors[fieldId] = ok ? null : (first?.message || 'Champ invalide');
      }

      // 3) Appliquer formules (batch topologique)
      const computed = { ...next } as Record<string, unknown>;
      // Assurer la propagation aussi avant formules (si setValues a été bypass plus haut)
      try {
        const pl = priceLinkRef.current;
        if (pl.advId && pl.numId) {
          const advVal = computed[pl.advId];
          if (advVal && typeof advVal === 'object' && !Array.isArray(advVal)) {
            const o = advVal as Record<string, unknown>;
            const raw = (typeof o.extra === 'string' || typeof o.extra === 'number') ? o.extra : (typeof o.selection === 'string' || typeof o.selection === 'number' ? o.selection : undefined);
            if (typeof raw === 'string' || typeof raw === 'number') {
              const parsed = parseFlexibleNumber(raw);
              if (parsed !== null && computed[pl.numId] !== parsed) {
                computed[pl.numId] = parsed;
                dbg('Propagation prix (pré-formules) adv->num', pl.advId, '=>', pl.numId, parsed);
              }
            }
          }
        }
      } catch {/* noop */}
      const changedFormulaTargets: string[] = []; // collecter les champs réellement ré-écrits
      
      // === SYSTÈME DE FORMULES DYNAMIQUES INTÉGRÉ ===
      // Appliqué de manière synchrone pour l'expérience utilisateur, puis async en arrière-plan
      (async () => {
        try {
          dbg('🚀 Début application formules dynamiques');
          const dynamicResults = await dynamicEngine.applyFormulas(computed, {
            changedFieldId: fieldId,
            debug: debugEnabled,
            preloadedRules: rules // ✅ PASSER LES RÈGLES PRÉCHARGÉES !
          });
          
          if (dynamicResults.success && Object.keys(dynamicResults.calculatedValues).length > 0) {
            // Appliquer les résultats des formules dynamiques via un nouveau setState
            setValues(prevValues => {
              const updatedValues = { ...prevValues };
              let hasChanges = false;
              const newlyAuto: string[] = [];
              
              Object.entries(dynamicResults.calculatedValues).forEach(([k, v]) => {
                if (updatedValues[k] !== v && typeof v !== 'undefined') {
                  const prevVal = updatedValues[k];
                  // Respecter la logique de protection des valeurs utilisateur
                  const userJustEdited = (lastUserEditRef.current === k) || recentUserFieldsRef.current.has(k);
                  const isZeroNumber = typeof v === 'number' && v === 0;
                  const prevNonZeroNumber = typeof prevVal === 'number' && prevVal !== 0;
                  const shouldSkip = userJustEdited && isZeroNumber && prevNonZeroNumber;
                  
                  if (!shouldSkip) {
                    updatedValues[k] = v;
                    hasChanges = true;
                    // Marquer comme champ auto calculé si ce n'est pas la dernière saisie utilisateur
                    if (!userJustEdited) newlyAuto.push(k);
                    if (isPriceKey(k) || priceFieldIds.has(k)) {
                      dbg('🧮 Formule dynamique appliquée (async)', k, '=>', v, '(prix détecté)');
                    } else {
                      dbg('🧮 Formule dynamique appliquée (async)', k, '=>', v);
                    }
                  } else if (debugEnabled) {
                    console.warn('[FormulesDynamiques] ⏭️ Skip overwrite (préserver saisie utilisateur >0) pour', k);
                  }
                }
              });
              
              // Logger les formules appliquées pour débogage
              if (dynamicResults.appliedFormulas.length > 0 && debugEnabled) {
                dbg('✅ Formules dynamiques appliquées (async):', dynamicResults.appliedFormulas.map(f => `${f.name} (${f.id})`));
              }
              
              if (hasChanges) {
                if (newlyAuto.length) {
                  setAutoFields(prev => {
                    const next = new Set(prev);
                    newlyAuto.forEach(id => next.add(id));
                    return next;
                  });
                }
                // Sauvegarder les nouvelles valeurs
                scheduleSave(updatedValues);
                return updatedValues;
              }
              return prevValues;
            });
          }
        } catch (dynamicError) {
          dbg('❌ Exception formules dynamiques:', dynamicError);
        }
      })();
      // === FIN SYSTÈME DE FORMULES DYNAMIQUES ===

      // 4) Calculer les champs "donnee" via Data Composer (template/picks)
      const str = (v: unknown) => {
        if (v === null || typeof v === 'undefined') return '';
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v);
      };
      const getAdv = (fid: string, part?: string) => {
        const base = computed[fid];
        if (base && typeof base === 'object') {
          const obj = base as Record<string, unknown>;
          if (!part || part === 'selection') return obj['selection'];
          if (part === 'extra') return obj['extra'];
          return undefined;
        }
        // si base est une string, la traiter comme selection
        if (!part || part === 'selection') return base;
        return undefined;
      };
      const replaceTemplate = (tpl: string): string => {
        return tpl.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_m, expr) => {
          const parts = String(expr).split('.');
          const root = parts[0];
          const fid = parts[1];
          const rest = parts.slice(2);
          if (!fid) return '';
          if (root === 'values') {
            let v: unknown = computed[fid];
            for (const p of rest) {
              if (!v || typeof v !== 'object') { v = undefined; break; }
              v = (v as Record<string, unknown>)[p];
            }
            return str(v);
          }
          if (root === 'advancedSelect') {
            const part = rest[0] || 'selection';
            return str(getAdv(fid, part));
          }
          if (root === 'errors') {
            return str(localErrors[fid] || '');
          }
          return '';
        });
      };
      const deepEq = (a: unknown, b: unknown) => {
        if (a === b) return true;
        try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
      };
      if (block) {
        (block.sections || []).forEach((s) => {
          (s.fields || []).forEach((f) => {
            if (f.type !== 'donnee') return;
            const ac = (f.advancedConfig || {}) as Record<string, unknown>;
            const composer = ac?.['composer'] as Record<string, unknown> | undefined;
            if (!composer) return;
            const mode = (composer['mode'] as string) || 'template';
            let outVal: unknown = computed[f.id];
            if (mode === 'picks') {
              const picks = Array.isArray(composer['picks']) ? composer['picks'] as Array<Record<string, unknown>> : [];
              const res: Record<string, unknown> = {};
              picks.forEach((p) => {
                const key = String(p['key'] ?? '');
                const from = String(p['from'] ?? 'values');
                const fid = String(p['fieldId'] ?? '');
                const path = p['path'] ? String(p['path']) : undefined;
                if (!key || !fid) return;
                if (from === 'values') {
                  let v: unknown = computed[fid];
                  if (path && v && typeof v === 'object') v = (v as Record<string, unknown>)[path];
                  res[key] = v;
                } else if (from === 'advancedSelect') {
                  const part = path || 'selection';
                  res[key] = getAdv(fid, part);
                } else if (from === 'errors') {
                  res[key] = localErrors[fid] || null;
                } else {
                  // fallback -> values
                  res[key] = computed[fid];
                }
              });
              outVal = res;
            } else {
              const tpl = String(composer['template'] ?? '');
              outVal = replaceTemplate(tpl);
            }
            if (!deepEq(outVal, computed[f.id])) {
              // Ne pas écraser un résultat de formule par une string vide
              if (!(typeof outVal === 'string' && outVal.trim() === '' && typeof computed[f.id] !== 'undefined')) {
                computed[f.id] = outVal;
              }
            }
          });
        });
      }

      // Commit erreurs mises à jour et sauvegarde
      setErrors(localErrors);
      if (changedFormulaTargets.length) {
        setAutoFields(new Set(changedFormulaTargets));
      }
      scheduleSave(computed);
      return computed;
    });
    // Déclencher recalcul prix kWh serveur (debounced)
    try {
      if (evaluatePriceDebounceRef.current) window.clearTimeout(evaluatePriceDebounceRef.current);
      evaluatePriceDebounceRef.current = window.setTimeout(async () => {
        try {
          // Identifier champs prix kWh cibles
          const priceIds: string[] = [];
          (block?.sections||[]).forEach(s => (s.fields||[]).forEach(f => { if (/prix kwh|prix k|kwh/i.test(f.label||'') || /prix_kwh/i.test(f.id)) priceIds.push(f.id); }));
          if (!priceIds.length) return;
          // Construire inputValues à partir du mapping si dispo
          const mapping = fieldNodeMappingRef.current?.mappings || [];
            const inputValues: Record<string, number | string> = {};
            if (mapping.length && block) {
              (block.sections||[]).forEach(s => (s.fields||[]).forEach(f => {
                const m = mapping.find(mp => mp.labelMatch && f.label && f.label.toLowerCase().includes(mp.labelMatch.toLowerCase()));
                if (!m) return;
                const raw = valuesRef.current ? (valuesRef.current as Record<string, unknown>)[f.id] : undefined;
                if (typeof raw === 'number') inputValues[f.id] = raw; else if (typeof raw === 'string') {
                  const n = parseFloat(raw.replace(',', '.')); if (Number.isFinite(n)) inputValues[f.id] = n;
                }
              }));
            }
            if (!Object.keys(inputValues).length) {
              // heuristique fallback
              const vAll = valuesRef.current as Record<string, unknown> | undefined;
              if (vAll) Object.entries(vAll).forEach(([k,v]) => {
                if (/facture.+(elec|élec|electricité)|consommation.+(elec|élec|electricité)/i.test(k) || /facture|consommation/i.test(k)) {
                  if (typeof v === 'number') inputValues[k] = v; else if (typeof v === 'string') { const n = parseFloat(v.replace(',', '.')); if (Number.isFinite(n)) inputValues[k] = n; }
                }
              });
            }
          if (!Object.keys(inputValues).length) return;
          const resp = await post<{ success?: boolean; data?: Record<string, { value: number | string | null; manualApplied: boolean; source: string }> }>(`/api/treebranchleaf/effective-values/evaluate`, { ids: priceIds, inputValues });
          const payload = resp?.data || {};
          if (payload && Object.keys(payload).length) {
            setValues(prevVals => {
              const updated = { ...prevVals } as Record<string, unknown>;
              const newlyAuto: string[] = [];
              Object.entries(payload).forEach(([pid, info]) => {
                if (info.source === 'formula' && info.value !== null && typeof info.value !== 'undefined' && updated[pid] !== info.value) {
                  updated[pid] = info.value;
                  newlyAuto.push(pid);
                  dbg('Recalcul serveur prix', pid, '=>', info.value);
                }
              });
              if (newlyAuto.length) {
                setAutoFields(prevA => { const s = new Set(prevA); newlyAuto.forEach(id=>s.add(id)); return s; });
              }
              return updated;
            });
          }
        } catch {/* noop */}
      }, 420);
    } catch {/* noop */}
  }, [scheduleSave, rules, ui, evalDepSafe, errors, block, parseFlexibleNumber, dbg, isPriceKey, priceFieldIds, debugEnabled, dynamicEngine, setErrors, setUi, post]);

  // ✅ NOUVEAU : Application automatique des formules quand les données sont chargées
  useEffect(() => {
    // Ne pas exécuter si le bloc ou les règles ne sont pas prêtes
    if (!block || !Object.keys(rules).length) return;
    
    dbg('🔄 Application automatique des formules au chargement/changement de données');
    
    (async () => {
      try {
        const dynamicResults = await dynamicEngine.applyFormulas(values, {
          debug: debugEnabled,
          preloadedRules: rules
        });
        
        if (dynamicResults.success && Object.keys(dynamicResults.calculatedValues).length > 0) {
          dbg('🎯 Formules appliquées automatiquement:', dynamicResults.calculatedValues);
          
          setValues(prevValues => {
            const updatedValues = { ...prevValues };
            let hasChanges = false;
            const newlyAuto: string[] = [];
            
            Object.entries(dynamicResults.calculatedValues).forEach(([k, v]) => {
              if (updatedValues[k] !== v && typeof v !== 'undefined') {
                updatedValues[k] = v;
                hasChanges = true;
                newlyAuto.push(k);
                dbg('🧮 Formule auto-appliquée:', k, '=', v);
              }
            });
            
            // ✅ FIX: Appliquer le Data Composer pour les champs "donnee" après les formules
            const afterComposer = applyDataComposer(updatedValues, block);
            if (afterComposer !== updatedValues) {
              Object.assign(updatedValues, afterComposer);
              hasChanges = true;
              dbg('📊 Data Composer appliqué après formules auto');
            }

            if (hasChanges) {
              if (newlyAuto.length) {
                setAutoFields(prev => {
                  const next = new Set(prev);
                  newlyAuto.forEach(id => next.add(id));
                  return next;
                });
              }
              scheduleSave(updatedValues);
              return updatedValues;
            }
            
            return prevValues;
          });
        } else {
          // ✅ FIX: Même sans formules, calculer les champs "donnee" via Data Composer
          setValues(prevValues => {
            const afterComposer = applyDataComposer(prevValues, block);
            if (afterComposer !== prevValues) {
              dbg('📊 Data Composer appliqué (sans formules)');
              scheduleSave(afterComposer);
              return afterComposer;
            }
            return prevValues;
          });
        }
      } catch (error) {
        dbg('❌ Erreur application automatique formules:', error);
      }
    })();
  }, [block, rules, values, dynamicEngine, debugEnabled, dbg, scheduleSave, applyDataComposer]);

  // ⛔ Fallback local prix kWh supprimé : désormais géré 100% par le moteur TreeBranchLeaf via une formule attachée au champ.
  // (Ancien useEffect retiré pour éviter toute divergence ou double écriture.)

  const sections = useMemo(() => {
    const list: Section[] = block?.sections || [];
    // Ne montrer que les sections actives (active true ou undefined par défaut)
    return list.filter((s) => s.active !== false);
  }, [block]);

  // S'assurer que l'index actif reste valide après filtrage
  useEffect(() => {
    if (activeSectionIndex >= sections.length) {
      setActiveSectionIndex(Math.max(0, sections.length - 1));
    }
  }, [sections.length, activeSectionIndex]);

  // Swipe simple (touch) pour mobile
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dy) < 40) {
        // swipe horizontal
        setActiveSectionIndex((idx) => {
          if (dx < 0) return Math.min(idx + 1, Math.max(0, sections.length - 1));
          return Math.max(idx - 1, 0);
        });
      }
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true } as AddEventListenerOptions);
    el.addEventListener('touchend', onTouchEnd, { passive: true } as AddEventListenerOptions);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [sections.length]);

  const isReady = Boolean(blockId && leadId && block);

  // Titre dynamique de la page
  const pageTitle = useMemo(() => {
    const parts: string[] = [];
    if (lead?.name) parts.push(lead.name);
    if (block?.name) {
      if (devisName?.trim()) {
        parts.push(devisName);
      } else {
        parts.push(`${block.name} (Nouveau devis)`);
      }
    } else if (lead?.name) {
      parts.push('Sélectionnez un formulaire');
    }
    return parts.length > 0 ? parts.join(' - ') : 'Devis';
  }, [lead, block, devisName]);

  return (
    <div className="w-full px-4 py-4" ref={containerRef}>
      <h1 className="text-2xl font-semibold mb-4">{pageTitle}</h1>

      {/* Sélection Lead + Formulaire + DevisId */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="text-sm text-gray-600">Lead</label>
        <div className="relative flex-1 min-w-[320px]">
          <input
            ref={leadInputRef}
            className="border rounded px-2 py-1 w-full"
            placeholder="Rechercher par nom, email ou société"
            value={leadQuery}
            onFocus={() => setShowLeadDropdown(true)}
            onBlur={() => {
              // délai pour permettre le clic dans la liste
              setTimeout(() => setShowLeadDropdown(false), 120);
            }}
            onChange={(e) => {
              setLeadQuery(e.target.value);
              setShowLeadDropdown(true);
            }}
          />
          {showLeadDropdown && leadSuggestions.length > 0 && (
            <div
              className="absolute left-0 right-0 mt-1 z-10 border rounded bg-white shadow max-h-64 overflow-auto"
              onMouseDown={(e) => e.preventDefault()}
            >
              {leadSuggestions.map((l) => {
                const label = [l.name, l.company, l.email].filter(Boolean).join(' — ');
                return (
                  <button
                    key={l.id}
                    className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                    onClick={() => {
                      const next = new URLSearchParams(params);
                      next.set('leadId', l.id);
                      setParams(next, { replace: true });
                      setLeadQuery(label);
                      setShowLeadDropdown(false);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <label className="text-sm text-gray-600">Formulaire</label>
        <select
          className="border rounded px-2 py-1 w-64"
          value={blockId}
          onChange={(e) => {
            const newBlockId = e.target.value;
            const next = new URLSearchParams(params);
            if (newBlockId) next.set('blockId', newBlockId); else next.delete('blockId');
            setParams(next, { replace: true });
          }}
        >
          <option value="">— Choisir un formulaire —</option>
          {availableBlocks.map(b => (
            <option key={b.id} value={b.id}>{b.name || b.id}</option>
          ))}
        </select>
  <label className="text-sm text-gray-600">Devis</label>
        <select
          className="border rounded px-2 py-1 w-56 hover:border-gray-400"
          value={devisId || (devisOptions.some(o => o.devisId === '') ? '' : '__new__')}
          onChange={(e) => {
            const v = e.target.value;
            const next = new URLSearchParams(params);
            if (v === '__new__') {
              const newId = generateDevisId();
              next.set('devisId', newId);
            } else if (v) {
              next.set('devisId', v);
            } else {
              next.delete('devisId');
            }
            setParams(next, { replace: true });
          }}
          disabled={!leadId || !blockId}
        >
          {/* Option de base: 'Défaut' si une entrée par défaut existe, sinon 'Nouveau' */}
          {devisOptions.some(o => o.devisId === '') ? (
            <option value="">Défaut</option>
          ) : (
            <option value="__new__">Nouveau</option>
          )}
          {devisOptions.map(opt => (
            opt.devisId ? <option key={opt.key} value={opt.devisId}>{opt.label}</option> : null
          ))}
        </select>
        {/* Afficher archivés */}
        <label className="text-sm text-gray-600 inline-flex items-center gap-1">
          <input type="checkbox" className="mr-1" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Afficher archivés
        </label>
        {/* Nom du devis */}
        <label className="text-sm text-gray-600">Nom</label>
        <input
          className="border rounded px-2 py-1 w-64 hover:border-gray-400"
          placeholder={devisId ? 'Nom lisible de ce devis' : 'Défaut'}
          value={devisName}
          onChange={(e) => setDevisName(e.target.value)}
          disabled={!leadId || !blockId}
        />
        {isArchived && (
          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">Archivé</span>
        )}
        {/* Enregistrer sous... */}
        <button
          type="button"
          className="border rounded px-2 py-1 text-sm hover:bg-gray-50"
          disabled={!leadId || !blockId}
          onClick={async () => {
            if (!leadId || !blockId) return;
            const input = window.prompt('Nom du nouveau devis :', devisName || '');
            if (input === null) return; // annulé
            const name = (input || '').trim();
            const newId = generateDevisId();
            const newKey = `${blockId}::${newId}`;
            try {
              const nowIso = new Date().toISOString();
              const baseValues = { ...(values || {}) } as Record<string, unknown>;
              const payload: Record<string, unknown> = {
                ...baseValues,
                _meta: {
                  name: name || `Devis ${newId}`,
                  createdAt: nowIso,
                  updatedAt: nowIso,
                },
              };
              const newData: LeadData = { ...(lead?.data || {}) } as LeadData;
              newData.devis = newData.devis || {};
              (newData.devis as Record<string, Record<string, unknown>>)[newKey] = payload as Record<string, unknown>;
              await put(`/api/leads/${leadId}`, { data: newData });
              // Recharger le lead
              const l = await get<Lead>(`/api/leads/${leadId}`);
              setLead(l as unknown as Lead);
              // Basculer sur le nouveau devis
              const next = new URLSearchParams(params);
              next.set('devisId', newId);
              setParams(next, { replace: true });
              setDevisName(name);
            } catch {
              // noop
            }
          }}
        >
          Enregistrer sous…
        </button>
        {/* Dupliquer en nouveau devis */}
        <button
          type="button"
          className="border rounded px-2 py-1 text-sm hover:bg-gray-50"
          disabled={!leadId || !blockId}
          onClick={async () => {
            if (!leadId || !blockId) return;
            const newId = generateDevisId();
            const newKey = `${blockId}::${newId}`;
            try {
              // Construire l'objet à dupliquer avec meta
              const nowIso = new Date().toISOString();
              const baseValues = { ...(values || {}) } as Record<string, unknown>;
              const name = devisName?.trim() ? `Copie de ${devisName}` : `Copie ${newId}`;
              const payload: Record<string, unknown> = {
                ...baseValues,
                _meta: {
                  name,
                  createdAt: nowIso,
                  updatedAt: nowIso,
                },
              };
              const newData: LeadData = { ...(lead?.data || {}) } as LeadData;
              newData.devis = newData.devis || {};
              (newData.devis as Record<string, Record<string, unknown>>)[newKey] = payload as Record<string, unknown>;
              await put(`/api/leads/${leadId}`, { data: newData });
              // Recharger le lead pour rafraîchir la liste
              const l = await get<Lead>(`/api/leads/${leadId}`);
              setLead(l as unknown as Lead);
              // Basculer sur le nouveau devis
              const next = new URLSearchParams(params);
              next.set('devisId', newId);
              setParams(next, { replace: true });
              setDevisName(name);
            } catch {
              // noop
            }
          }}
        >
          Dupliquer en nouveau devis
        </button>
        {/* Supprimer ce devis */}
        <button
          type="button"
          className="border rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
          disabled={!leadId || !blockId}
          onClick={async () => {
            if (!leadId || !blockId) return;
            const isDefault = !devisId;
            const label = devisName?.trim() || (isDefault ? 'Défaut' : devisId);
            const ok = window.confirm(`Supprimer le devis "${label}" ? Cette action est définitive.`);
            if (!ok) return;
            try {
              const newData: LeadData = { ...(lead?.data || {}) } as LeadData;
              newData.devis = newData.devis || {};
              // Supprimer la clé courante
              if ((newData.devis as Record<string, unknown>)[storageKey]) {
                delete (newData.devis as Record<string, unknown>)[storageKey];
              }
              await put(`/api/leads/${leadId}`, { data: newData });
              // Recharger le lead pour recalculer les options
              const l = await get<Lead>(`/api/leads/${leadId}`);
              setLead(l as unknown as Lead);
              const d = (l?.data?.devis || {}) as Record<string, unknown>;
              const candidates = Object.keys(d).filter(k => k === blockId || k.startsWith(`${blockId}::`));
              // Choisir la prochaine sélection
              const nextParams = new URLSearchParams(params);
              if (candidates.includes(blockId)) {
                // revenir au devis par défaut
                nextParams.delete('devisId');
              } else if (candidates.length > 0) {
                const named = candidates.find(k => k.startsWith(`${blockId}::`));
                if (named) {
                  const nextId = named.substring(blockId.length + 2);
                  nextParams.set('devisId', nextId);
                } else {
                  nextParams.delete('devisId');
                }
              } else {
                // Plus aucun devis pour ce formulaire: créer un nouvel ID vide et laisser l'autosave pré-créer
                const newId = generateDevisId();
                nextParams.set('devisId', newId);
              }
              setParams(nextParams, { replace: true });
            } catch {
              // noop
            }
          }}
        >
          Supprimer ce devis
        </button>
        {/* Renommer */}
        <button
          type="button"
          className="border rounded px-2 py-1 text-sm hover:bg-gray-50"
          disabled={!leadId || !blockId}
          onClick={async () => {
            if (!leadId || !blockId) return;
            const input = window.prompt('Nouveau nom du devis :', devisName || '');
            if (input === null) return;
            const newName = (input || '').trim();
            try {
              const nowIso = new Date().toISOString();
              const newData: LeadData = { ...(lead?.data || {}) } as LeadData;
              newData.devis = newData.devis || {};
              const prev = (newData.devis as Record<string, Record<string, unknown>>)[storageKey] || {};
              const prevMeta = (prev && typeof prev === 'object' ? (prev as Record<string, unknown>)['_meta'] : undefined) as Record<string, unknown> | undefined;
              const meta: Record<string, unknown> = { ...prevMeta, name: newName, updatedAt: nowIso, createdAt: prevMeta?.createdAt || nowIso };
              (newData.devis as Record<string, Record<string, unknown>>)[storageKey] = { ...(prev as Record<string, unknown>), _meta: meta } as Record<string, unknown>;
              await put(`/api/leads/${leadId}`, { data: newData });
              const l = await get<Lead>(`/api/leads/${leadId}`);
              setLead(l as unknown as Lead);
              setDevisName(newName);
            } catch {
              // noop
            }
          }}
        >
          Renommer
        </button>
        {/* Archiver / Restaurer */}
        <button
          type="button"
          className="border rounded px-2 py-1 text-sm hover:bg-gray-50"
          disabled={!leadId || !blockId}
          onClick={async () => {
            if (!leadId || !blockId) return;
            try {
              const nowIso = new Date().toISOString();
              const newData: LeadData = { ...(lead?.data || {}) } as LeadData;
              newData.devis = newData.devis || {};
              const prev = (newData.devis as Record<string, Record<string, unknown>>)[storageKey] || {};
              const prevMeta = (prev && typeof prev === 'object' ? (prev as Record<string, unknown>)['_meta'] : undefined) as Record<string, unknown> | undefined;
              const nextArchived = !(prevMeta?.archived);
              const meta: Record<string, unknown> = { ...prevMeta, archived: nextArchived, updatedAt: nowIso, createdAt: prevMeta?.createdAt || nowIso };
              (newData.devis as Record<string, Record<string, unknown>>)[storageKey] = { ...(prev as Record<string, unknown>), _meta: meta } as Record<string, unknown>;
              await put(`/api/leads/${leadId}`, { data: newData });
              const l = await get<Lead>(`/api/leads/${leadId}`);
              setLead(l as unknown as Lead);
              // Si on vient d'archiver et qu'on ne montre pas les archivés, basculer
              if (nextArchived && !showArchived) {
                const d = (l?.data?.devis || {}) as Record<string, unknown>;
                const candidates = Object.keys(d).filter(k => k === blockId || k.startsWith(`${blockId}::`)).filter(k => {
                  const e = d[k] as Record<string, unknown>;
                  const m = e && typeof e === 'object' ? (e['_meta'] as Record<string, unknown> | undefined) : undefined;
                  return !(m?.archived);
                });
                const nextParams = new URLSearchParams(params);
                if (candidates.includes(blockId)) {
                  nextParams.delete('devisId');
                } else if (candidates.length > 0) {
                  const named = candidates.find(k => k.startsWith(`${blockId}::`));
                  if (named) {
                    const nextId = named.substring(blockId.length + 2);
                    nextParams.set('devisId', nextId);
                  } else {
                    nextParams.delete('devisId');
                  }
                } else {
                  const newId = generateDevisId();
                  nextParams.set('devisId', newId);
                }
                setParams(nextParams, { replace: true });
              }
            } catch {
              // noop
            }
          }}
        >
          {isArchived ? 'Restaurer' : 'Archiver'}
        </button>
        {/* Données brutes devis */}
        <button
          type="button"
          className={`border rounded px-2 py-1 text-sm ${showRawDevis ? 'bg-gray-200' : 'hover:bg-gray-50'}`}
          disabled={!leadId || !blockId}
          onClick={() => setShowRawDevis(v => !v)}
        >
          {showRawDevis ? 'Masquer données' : 'Données brutes'}
        </button>
      </div>

      {!blockId && (
        <div className="p-4 text-gray-600">Choisissez un formulaire pour commencer.</div>
      )}
      {blockId && !leadId && (
        <div className="p-4 text-gray-600">Sélectionnez un lead pour charger/sauvegarder les valeurs.</div>
      )}

      {!isReady && blockId && (
        <div className="p-4">Chargement…</div>
      )}

      {isReady && block && (
      /* Onglets = sections */
      <>
      {showRawDevis && (
        <div className="mb-4 border rounded bg-white p-3 text-xs font-mono whitespace-pre-wrap max-h-72 overflow-auto">
          <div className="mb-2 font-semibold">Snapshot JSON stocké</div>
          {currentDevisEntry ? JSON.stringify(currentDevisEntry, null, 2) : '— Aucune donnée —'}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-4 border-b pb-2">
        {sections.map((s, i) => (
          <button
            key={s.id}
            className={`px-3 py-1 rounded-t ${i === activeSectionIndex ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            onClick={() => setActiveSectionIndex(i)}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Section active */}
      {sections[activeSectionIndex] && (
        <div className="bg-white border rounded p-4">
          <div className="grid grid-cols-4 gap-4">
            {/* Si section personnalisée et menuFieldId défini, on priorise ce champ en tête */}
            {(() => {
              const sec = sections[activeSectionIndex];
              const list = [...(sec.fields || [])];
              if ((sec.sectionType === 'custom' || sec.sectionType === 'personnalisé') && sec.menuFieldId) {
                const idx = list.findIndex(ff => String(ff.id) === String(sec.menuFieldId));
                if (idx > 0) {
                  const [chosen] = list.splice(idx, 1);
                  list.unshift(chosen);
                }
              }
              return list;
            })().map((f) => {
              let colSpan = 'col-span-4';
              if (f.width === '1/2') colSpan = 'col-span-2';
              else if (f.width === '1/4') colSpan = 'col-span-1';
              else if (f.width === '3/4') colSpan = 'col-span-3';
              else if (f.width === '1/1') colSpan = 'col-span-4';

              const val = values[f.id] ?? '';
              const opts = Array.isArray(f.options) ? f.options : [];
              
              // ✅ APPLIQUER TOUTES LES CARACTÉRISTIQUES DU CHAMP
              const dependencyState = applyDependencies(f.id, values);
              const state = { ...dependencyState, required: Boolean(f.required) };
              const { styles, classNames } = getFieldStyles(f);
              const fieldError = errors[f.id];
              
              // Masquer si caché par dépendances, UI ou config
              if (!state.visible || (f.advancedConfig && (f.advancedConfig as Record<string, unknown>).hidden)) return null;

              // Champ "donnee" = visible si non masqué: affichage lecture seule (texte ou JSON)
              if (f.type === 'donnee') {
                return (
                  <div key={f.id} className={`flex flex-col ${colSpan}`}>
                    <label className="font-medium mb-1">{f.label}</label>
                    {(() => {
                      const v = val as unknown;
                      if (v === null || typeof v === 'undefined') return <div className="text-sm text-gray-500">—</div>;
                      if (typeof v === 'object') {
                        return (
                          <pre 
                            className={`border rounded px-2 py-2 text-xs bg-gray-50 whitespace-pre-wrap break-words ${classNames.join(' ')}`}
                            style={styles}
                          >
                            {JSON.stringify(v, null, 2)}
                          </pre>
                        );
                      }
                      return (
                        <input 
                          className={`border rounded px-2 py-1 ${classNames.join(' ')}`}
                          style={{
                            ...styles,
                            backgroundColor: styles.backgroundColor || '#f9fafb', // fallback si pas défini
                            color: styles.color || '#374151'
                          }}
                          value={String(v)} 
                          readOnly 
                        />
                      );
                    })()}
                  </div>
                );
              }

              return (
                <div key={f.id} className={`flex flex-col ${colSpan}`}>
                  <label className="font-medium mb-1 flex items-center gap-2">
                    <span>{f.label}{(state.required || f.required) && <span className="text-red-500 ml-1">*</span>}</span>
                    {manualOverrideFields.has(f.id) ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200" title="Valeur manuelle (mode auto désactivé)">MANUEL</span>
                    ) : autoFields.has(f.id) ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200" title="Valeur calculée par formule – taper pour reprendre la main">AUTO</span>
                    ) : null}
                  </label>

                  {f.type === 'text' && (
                    <div>
                      <input 
                        disabled={state.disabled} 
                        className={`border rounded px-2 py-1 ${classNames.join(' ')}`}
                        style={styles}
                        value={val as string} 
                        onChange={(e) => onChange(f.id, e.target.value)} 
                      />
                      {fieldError && <div className="text-red-500 text-sm mt-1">{fieldError}</div>}
                    </div>
                  )}
                  {f.type === 'password' && (
                    <div>
                      <input 
                        disabled={state.disabled} 
                        type="password" 
                        className={`border rounded px-2 py-1 ${classNames.join(' ')}`}
                        style={styles}
                        value={val as string} 
                        onChange={(e) => onChange(f.id, e.target.value)} 
                      />
                      {fieldError && <div className="text-red-500 text-sm mt-1">{fieldError}</div>}
                    </div>
                  )}
                  {f.type === 'number' && (
                    <div>
                      <input
                        disabled={state.disabled}
                        type="text"
                        inputMode="decimal"
                        className={`border rounded px-2 py-1 ${classNames.join(' ')}`}
                        style={styles}
                        value={val as number | string}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') { onChange(f.id, ''); return; }
                          // Conserver la saisie telle quelle si elle se termine par une virgule/point (saisie en cours)
                          if (/^[+-]?\d*[.,]?$/.test(raw)) { onChange(f.id, raw); return; }
                          const parsed = parseFlexibleNumber(raw);
                          onChange(f.id, parsed === null ? raw : parsed);
                        }}
                        onBlur={(e) => {
                          const parsed = parseFlexibleNumber(e.target.value);
                          if (parsed !== null) onChange(f.id, parsed);
                        }}
                      />
                      {fieldError && <div className="text-red-500 text-sm mt-1">{fieldError}</div>}
                    </div>
                  )}
                  {f.type === 'textarea' && (
                    <textarea
                      disabled={state.disabled}
                      className={`border rounded px-2 py-1 min-h-[96px] ${classNames.join(' ')}`}
                      style={styles}
                      value={(val as string) || ''}
                      onChange={(e) => onChange(f.id, e.target.value)}
                    />
                  )}
                  {f.type === 'date' && (
                    <input 
                      disabled={state.disabled} 
                      type="date" 
                      className={`border rounded px-2 py-1 ${classNames.join(' ')}`}
                      style={styles}
                      value={val as string} 
                      onChange={(e) => onChange(f.id, e.target.value)} 
                    />
                  )}
                  {(f.type === 'select' || f.type === 'advanced_select') && (
                    f.type === 'select' ? (
                      <select 
                        disabled={state.disabled} 
                        className={`border rounded px-2 py-1 ${classNames.join(' ')}`}
                        style={styles}
                        value={val as string} 
                        onChange={(e) => onChange(f.id, e.target.value)}
                      >
                        <option value="">Sélectionner…</option>
                        {opts.map((o) => (
                          <option key={o.id} value={o.value || o.label}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      // advanced_select: affichage en cascade infini (lazy)
                      <AdvancedSelect
                        fieldId={f.id}
                        disabled={state.disabled}
                        loadChildren={loadChildrenMemo}
                        fetchNodeDetail={fetchNodeDetailMemo}
                        style={styles}
                        className={classNames.join(' ')}
                        onChange={(v) => {
                          // v peut être string (valeur finale) ou un objet { selection, nodeId, extra }
                          onChange(f.id, v);
                        }}
                        value={val}
                      />
                    )
                  )}
                  {f.type === 'radio' && (
                    <div className="flex flex-col gap-1">
                      {opts.map((o) => {
                        const checked = (val as string) === (o.value || o.label);
                        return (
                          <label key={o.id} className="inline-flex items-center gap-2">
                            <input
                              type="radio"
                              name={`radio-${sections[activeSectionIndex].id}-${f.id}`}
                              disabled={state.disabled}
                              checked={checked}
                              onChange={() => onChange(f.id, (o.value || o.label))}
                            />
                            {o.label}
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {f.type === 'checkboxes' && (
                    <div className="flex flex-col gap-1">
                      {opts.map((o) => {
            const arr: string[] = Array.isArray(val) ? (val as string[]) : [];
                        const checked = arr.includes(o.value || o.label);
                        return (
                          <label key={o.id} className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              disabled={state.disabled}
                              checked={checked}
                              onChange={(e) => {
                const base: string[] = Array.isArray(values[f.id]) ? [...(values[f.id] as string[])] : [];
                                const v = o.value || o.label;
                                if (e.target.checked) onChange(f.id, [...base, v]); else onChange(f.id, base.filter(x => x !== v));
                              }}
                            />
                            {o.label}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Image statique (admin) */}
                  {f.type === 'image_admin' && (f.advancedConfig && (f.advancedConfig as Record<string, unknown>).imageUrl) && (
                    <img
                      src={(f.advancedConfig as Record<string, unknown>).imageUrl as string}
                      alt={f.label}
                      className="mt-2 max-h-56 object-contain border rounded"
                    />
                  )}

                  {/* Upload image par l'utilisateur */}
                  {f.type === 'image_user' && (
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        accept={((f.advancedConfig as Record<string, unknown> | undefined)?.accept as string) || 'image/*'}
                        multiple={Boolean((f.advancedConfig as Record<string, unknown> | undefined)?.multiple)}
                        disabled={state.disabled}
                        className={`${classNames.join(' ')}`}
                        style={styles}
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length === 0) return;
                          const readAsDataURL = (file: File) => new Promise<UploadedFileValue>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: ev.target?.result as string });
                            reader.readAsDataURL(file);
                          });
                          const isMultiple = Boolean((f.advancedConfig as Record<string, unknown> | undefined)?.multiple);
                          if (isMultiple) {
                            const payload = await Promise.all(files.map(readAsDataURL));
                            onChange(f.id, payload);
                          } else {
                            const first = files[0];
                            if (first) {
                              const payload = await readAsDataURL(first);
                              onChange(f.id, payload);
                            }
                          }
                        }}
                      />
                      {/* Aperçu */}
                      {(() => {
                        const isMultiple = Boolean((f.advancedConfig as Record<string, unknown> | undefined)?.multiple);
                        if (isMultiple && Array.isArray(val)) {
                          const arr = val as UploadedFileValue[];
                          return (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                              {arr.map((it, idx) => (
                                <img key={idx} src={it.dataUrl} alt={it.name} className="max-h-40 object-contain border rounded" />
                              ))}
                            </div>
                          );
                        }
                        if (isUploadedFileValue(val) && val.dataUrl) {
                          return (
                            <img src={val.dataUrl} alt={val.name} className="mt-2 max-h-56 object-contain border rounded" />
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  {/* Upload fichier par l'utilisateur (images, PDF, docs, etc.) */}
                  {f.type === 'fichier_user' && (
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        accept={((f.advancedConfig as Record<string, unknown> | undefined)?.accept as string) || '*/*'}
                        multiple={Boolean((f.advancedConfig as Record<string, unknown> | undefined)?.multiple)}
                        disabled={state.disabled}
                        className={`${classNames.join(' ')}`}
                        style={styles}
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length === 0) return;
                          const readAsDataURL = (file: File) => new Promise<UploadedFileValue>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: ev.target?.result as string });
                            reader.readAsDataURL(file);
                          });
                          const isMultiple = Boolean((f.advancedConfig as Record<string, unknown> | undefined)?.multiple);
                          if (isMultiple) {
                            const payload = await Promise.all(files.map(readAsDataURL));
                            onChange(f.id, payload);
                          } else {
                            const first = files[0];
                            if (first) {
                              const payload = await readAsDataURL(first);
                              onChange(f.id, payload);
                            }
                          }
                        }}
                      />
                      {/* Liens */}
                      {(() => {
                        const isMultiple = Boolean((f.advancedConfig as Record<string, unknown> | undefined)?.multiple);
                        if (isMultiple && Array.isArray(val)) {
                          const arr = val as UploadedFileValue[];
                          return (
                            <ul className="list-disc pl-4 text-sm text-blue-700">
                              {arr.map((it, idx) => (
                                <li key={idx}>
                                  <a className="underline" href={it.dataUrl} target="_blank" rel="noreferrer">{it.name}</a>
                                </li>
                              ))}
                            </ul>
                          );
                        }
                        if (isUploadedFileValue(val) && val.name) {
                          return (
                            <a className="text-blue-600 underline text-sm" href={val.dataUrl} target="_blank" rel="noreferrer">{val.name}</a>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  {/* Tableau: système complet avec colonnes dynamiques, conditionnement et permissions */}
                  {f.type === 'tableau' && (
                    <div className="flex flex-col gap-2">
                      {(() => {
                        const ac = (f.config || {}) as Record<string, unknown>;
                        
                        // Configuration directe (nouveau format)
                        const columns = (ac.columns || []) as Array<{ key: string; label: string; type?: string }>;
                        const templates = (ac.templates || []) as Array<{ name: string; description?: string; data: Array<Record<string, unknown>> }>;
                        
                        if (columns.length === 0) {
                          return <div className="text-sm text-gray-500">Aucune colonne configurée. Définissez la structure du tableau dans le formulaire.</div>;
                        }

                        // Interface selon les permissions
                        const canEdit = user?.role === 'super_admin' || user?.role === 'admin';
                        
                        const displayData = Array.isArray(val) ? (val as Array<Record<string, unknown>>) : [];

                        const setCell = (rIdx: number, key: string, v: unknown) => {
                          const next = displayData.map((r, i) => (i === rIdx ? { ...r, [key]: v } : r));
                          onChange(f.id, next);
                        };
                        
                        const addRow = () => {
                          const empty: Record<string, unknown> = {};
                          columns.forEach(c => { 
                            empty[c.key] = c.type === 'number' ? 0 : '';
                          });
                          onChange(f.id, [...displayData, empty]);
                        };
                        
                        const removeRow = (idx: number) => {
                          const next = displayData.filter((_, i) => i !== idx);
                          onChange(f.id, next);
                        };

                        const addFromTemplate = (template: { data: Array<Record<string, unknown>> }) => {
                          onChange(f.id, [...displayData, ...template.data]);
                        };

                        return (
                          <>
                            {/* Section des templates (données pré-définies) */}
                            {templates.length > 0 && canEdit && (
                              <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                                <div className="text-sm font-medium text-blue-800 mb-2">Templates disponibles</div>
                                <div className="flex flex-wrap gap-2">
                                  {templates.map((template, tIdx) => (
                                    <button
                                      key={tIdx}
                                      type="button"
                                      onClick={() => addFromTemplate(template)}
                                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded border"
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

                            {/* Tableau des données actuelles */}
                            <div className="border border-gray-300 rounded-md">
                              <table className="min-w-full">
                                <thead className="bg-gray-50">
                                  <tr>
                                    {columns.map((col) => (
                                      <th key={col.key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {col.label}
                                      </th>
                                    ))}
                                    {canEdit && <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Actions</th>}
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {displayData.map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-gray-50">
                                      {columns.map((col) => (
                                        <td key={col.key} className="px-3 py-2 whitespace-nowrap">
                                          {canEdit ? (
                                            <input
                                              type={col.type === 'number' || col.type === 'currency' ? 'number' : 'text'}
                                              value={String(row[col.key] || '')}
                                              onChange={(e) => setCell(rIdx, col.key, col.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                              placeholder={col.label}
                                            />
                                          ) : (
                                            <span className="text-sm text-gray-900">
                                              {col.type === 'currency' ? `${row[col.key]}€` : String(row[col.key] || '')}
                                            </span>
                                          )}
                                        </td>
                                      ))}
                                      {canEdit && (
                                        <td className="px-3 py-2 text-right">
                                          <button
                                            type="button"
                                            onClick={() => removeRow(rIdx)}
                                            className="text-red-600 hover:text-red-800 text-sm"
                                          >
                                            🗑️
                                          </button>
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Boutons d'action pour les admins */}
                            {canEdit && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={addRow}
                                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                                >
                                  + Ajouter une ligne
                                </button>
                              </div>
                            )}

                            {/* Message de permissions pour les utilisateurs normaux */}
                            {!canEdit && (
                              <div className="text-xs text-gray-500 italic">
                                Seuls les administrateurs peuvent modifier ce tableau.
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}

          </div>
          {/* Affichage erreurs simples */}
          {Object.entries(errors).some(([, msg]) => msg) && (
            <div className="mt-2 text-sm text-red-600">
              {Object.entries(errors).map(([fid, msg]) => msg ? (
                <div key={fid}>• {msg}</div>
              ) : null)}
            </div>
          )}
          <div className="text-xs text-gray-500 mt-2">{saving ? 'Sauvegarde…' : 'Autosave activé'}</div>
        </div>
      )}
  </>
  )}
    </div>
  );
}

// Composant local pour gérer un select en cascade multi-niveaux basé sur option-nodes
function AdvancedSelect({ fieldId, disabled, loadChildren, fetchNodeDetail, onChange, value, style, className }: {
  fieldId: string;
  disabled?: boolean;
  loadChildren: (fieldId: string, parentId: string | null) => Promise<Array<{ id: string; label: string; value?: string }>>;
  fetchNodeDetail: (id: string) => Promise<{ id: string; data?: Record<string, unknown> } | null>;
  onChange: (value: unknown) => void;
  value?: unknown;
  style?: React.CSSProperties;
  className?: string;
}) {
  const [levels, setLevels] = React.useState<Array<{ parentId: string | null; options: Array<{ id: string; label: string; value?: string }>; selectedId: string }>>([]);
  const [extraField, setExtraField] = React.useState<{ type: string; placeholder?: string } | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string>('');
  const [extraValue, setExtraValue] = React.useState<string>('');
  const controlClass = `border rounded px-2 py-1 w-full text-sm h-10 ${className || ''}`;

  // Charger le niveau racine au montage
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const root = await loadChildren(fieldId, null);
      if (!mounted) return;
      // Si une valeur existe déjà (édition), tenter de reconstruire le chemin
      const existingSelection = (value && typeof value === 'object') ? (value as Record<string, unknown>)['nodeId'] as string | undefined : undefined;
      if (existingSelection) {
        // On pousse le niveau racine, puis on va descendre en lazy en suivant la sélection si possible
        setLevels([{ parentId: null, options: root, selectedId: '' }]);
        // Reconstruction différée pour laisser React appliquer root
        setTimeout(async () => {
          const chain: string[] = [];
          // Heuristique: si nodeId inconnu dans root, on tentera de le charger en descendant
          // On va parcourir en profondeur tant que des enfants uniques mènent vers le nodeId ciblé (simplification)
          const buildPath = async (currentParent: string | null, depth = 0): Promise<boolean> => {
            const opts = depth === 0 ? root : await loadChildren(fieldId, currentParent);
            if (!opts || opts.length === 0) return false;
            // Si l'un des opts est directement le node final
            if (opts.some(o => o.id === existingSelection)) {
              chain.push(existingSelection);
              return true;
            }
            // Sinon essayer récursivement chaque enfant (limiter profondeur)
            if (depth > 6) return false; // sécurité
            for (const o of opts) {
              const children = await loadChildren(fieldId, o.id);
              if (children.some(c => c.id === existingSelection)) {
                chain.push(o.id, existingSelection);
                return true;
              }
              // descente plus profonde si children non vides mais pas cible
              if (children.length > 0) {
                const ok = await buildPath(o.id, depth + 1);
                if (ok) { chain.unshift(o.id); return true; }
              }
            }
            return false;
          };
          try { await buildPath(null, 0); } catch { /* noop */ }
          // Appliquer la chaîne
          if (chain.length > 0) {
            // Construire niveaux séquentiels
            const accLevels: typeof levels = [{ parentId: null, options: root, selectedId: chain[0] || '' }];
            for (let i = 0; i < chain.length; i++) {
              const nid = chain[i];
              if (!nid) continue;
              const children = await loadChildren(fieldId, nid);
              if (children.length === 0) continue;
              const nextId = chain[i + 1] || '';
              accLevels.push({ parentId: nid, options: children, selectedId: nextId });
            }
            setLevels(accLevels);
            setSelectedNodeId(existingSelection);
            // Restaurer extra si présent
            const extraVal = (value && typeof value === 'object') ? (value as Record<string, unknown>)['extra'] : undefined;
            if (typeof extraVal !== 'undefined') setExtraValue(String(extraVal));
            // Vérifier si le node sélectionné possède un nextField (pour recréer extraField au rechargement)
            try {
              const detail = await fetchNodeDetail(existingSelection);
              const nf = detail?.data && typeof detail.data === 'object' ? (detail.data as Record<string, unknown>)['nextField'] as { type?: string; placeholder?: string } | undefined : undefined;
              if (nf && nf.type) {
                const labelNorm = (detail?.label || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9 ]/g,'');
                const isAutoPrix = labelNorm.includes('calcul') && labelNorm.includes('prix');
                if (!isAutoPrix) {
                  setExtraField({ type: nf.type, placeholder: nf.placeholder });
                } else {
                  // On ignore le nextField pour les options de calcul automatique
                  setExtraField(null);
                }
                // si pas d'extraVal, garder vide
              }
            } catch { /* noop */ }
          } else {
            setLevels([{ parentId: null, options: root, selectedId: '' }]);
          }
        }, 10);
      } else {
        setLevels([{ parentId: null, options: root, selectedId: '' }]);
      }
    })();
    return () => { mounted = false; };
  }, [fieldId, loadChildren, value, fetchNodeDetail]);

  const handleSelect = React.useCallback(async (levelIndex: number, selectedId: string) => {
  setLevels(prev => prev.slice(0, levelIndex + 1).map((lv, idx) => idx === levelIndex ? { ...lv, selectedId } : lv));
    // charger enfants du nœud sélectionné
    const children = await loadChildren(fieldId, selectedId || null);
    if (children.length > 0 && selectedId) {
      setLevels(prev => [...prev, { parentId: selectedId, options: children, selectedId: '' }]);
      // ne pas changer la valeur finale tant qu'on n'a pas choisi une feuille
      setExtraField(null);
      setSelectedNodeId('');
      setExtraValue('');
    } else {
      // feuille atteinte -> calculer la valeur
      // récupère la value du nœud sélectionné; si vide, utiliser label
      const lastLevel = levels[levelIndex];
      const opts = lastLevel?.options || [];
      const found = opts.find(o => o.id === selectedId);
      const finalValue = (found?.value || found?.label || '') as string;
      // vérifier s'il existe un champ suivant configuré
  setSelectedNodeId(selectedId || '');
      try {
        if (selectedId) {
          const detail = await fetchNodeDetail(selectedId);
          const nf = detail?.data && typeof detail.data === 'object' ? (detail.data as Record<string, unknown>)['nextField'] as { type?: string; placeholder?: string } | undefined : undefined;
          if (nf && nf.type) {
            const labelNorm = (detail?.label || finalValue || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9 ]/g,'');
            const isAutoPrix = labelNorm.includes('calcul') && labelNorm.includes('prix');
            if (!isAutoPrix) {
              setExtraField({ type: nf.type, placeholder: nf.placeholder });
              setExtraValue('');
              // ne pas émettre tout de suite; on attend la saisie extra
              onChange({ selection: finalValue, nodeId: selectedId, extra: '' });
              return;
            } else {
              setExtraField(null); // on force pas d'extra pour calcul auto
            }
          }
        }
      } catch {
        // ignorer erreurs; continuer avec finalValue
      }
  setExtraField(null);
  onChange({ selection: finalValue, nodeId: selectedId || '', extra: undefined });
      // supprimer d'éventuels niveaux plus profonds
      setLevels(prev => prev.slice(0, levelIndex + 1));
    }
  }, [fieldId, loadChildren, onChange, levels, fetchNodeDetail]);

  return (
    <div className="flex flex-col gap-2">
      {levels.map((lv, idx) => (
        <select
          key={`${lv.parentId || 'root'}-${idx}`}
          className={controlClass}
          style={style}
          disabled={disabled}
          value={lv.selectedId}
          onChange={(e) => handleSelect(idx, e.target.value)}
        >
          <option value="">Sélectionner…</option>
          {lv.options.map(o => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      ))}
      {extraField && (
        <div className="mt-1">
          {extraField.type === 'textarea' ? (
            <textarea
              className="border rounded px-2 py-1 w-full text-sm min-h-[2.5rem]"
              placeholder={extraField.placeholder || ''}
              disabled={disabled}
              value={extraValue}
              onChange={(e) => {
                const v = e.target.value;
                setExtraValue(v);
                const sel = (typeof value === 'object' && value) ? (value as Record<string, unknown>)['selection'] : (typeof value === 'string' ? value : undefined);
                onChange({ selection: sel, nodeId: selectedNodeId, extra: v });
              }}
            />
          ) : extraField.type === 'checkbox' ? (
            <div className="border rounded px-2 w-full h-10 flex items-center text-sm">
              <label className="inline-flex items-center gap-2 w-full">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={extraValue === 'true'}
                  onChange={(e) => {
                    const v = e.target.checked ? 'true' : 'false';
                    setExtraValue(v);
                    const sel = (typeof value === 'object' && value) ? (value as Record<string, unknown>)['selection'] : (typeof value === 'string' ? value : undefined);
                    onChange({ selection: sel, nodeId: selectedNodeId, extra: v === 'true' });
                  }}
                />
                <span className="truncate">{extraField.placeholder || 'Oui / Non'}</span>
              </label>
            </div>
          ) : (
            <input
              className={controlClass}
              style={style}
              type={extraField.type === 'number' ? 'number' : (extraField.type === 'date' ? 'date' : 'text')}
              placeholder={extraField.placeholder || ''}
              disabled={disabled}
              value={extraValue}
              onChange={(e) => {
                const v = e.target.value;
                setExtraValue(v);
                const sel = (typeof value === 'object' && value) ? (value as Record<string, unknown>)['selection'] : (typeof value === 'string' ? value : undefined);
                onChange({ selection: sel, nodeId: selectedNodeId, extra: v });
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
