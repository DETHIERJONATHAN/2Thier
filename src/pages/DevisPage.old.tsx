import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Tabs, Select, Button, Input, Switch, Spin, Upload,
  message
} from 'antd';
import { 
  CopyOutlined, CheckCircleOutlined, UploadOutlined 
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';
import { applyValidation } from '../utils/validationHelper';
import { evaluateDependency } from '../utils/dependencyValidator';
import type { FieldDependency as StoreFieldDependency } from '../store/slices/types';
import { DynamicFormulaEngine } from '../services/DynamicFormulaEngine';

const { TabPane } = Tabs;
const { Option } = Select;

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
  const { get, put } = useAuthenticatedApi();
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
  // Ensemble des champs dont la valeur affichée provient d'une formule (badge "auto")
  const [autoFields, setAutoFields] = useState<Set<string>>(new Set());
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
    const combined = { ...(prefill || {}), ...(existing || {}) } as Record<string, unknown>;
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
    // Sauvegarder automatiquement la première version pour "Nouveau" devis
    if (lead && blockId) {
      scheduleSave(combined);
    }
  }, [block, lead, storageKey, scheduleSave, blockId, tryDbField, findByKeys, buildKeyCandidates, parseFlexibleNumber, priceFieldIds]);

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

  // === SYSTÈME DE PRÉ-REMPLISSAGE INTELLIGENT ===
  // Pré-remplir les champs lors du premier passage, en se basant sur les données du lead
  const [prefillDone, setPrefillDone] = useState(false);
  useEffect(() => {
    if (prefillDone || !block || !lead || valuesLoading) return;
    try {
      const newValues = { ...values };
      let changed = false;

      block.sections?.forEach(section => {
        section.fields?.forEach(field => {
          if (field.id in newValues && newValues[field.id] != null) return; // déjà rempli
          const cfg = field.advancedConfig as Record<string, unknown> | null;
          const dbField = cfg?.dbField as string | undefined;

          if (dbField && lead.data) {
            try {
              const parts = dbField.split('.');
              let val: unknown = lead.data;
              for (const part of parts) {
                val = val && typeof val === 'object' ? (val as Record<string, unknown>)[part] : undefined;
              }
              if (val != null) {
                newValues[field.id] = val;
                changed = true;
              }
            } catch {/* ignore */}
          }
        });
      });

      if (changed) {
        setValues(newValues);
      }
    } catch (err) {
      console.warn('Erreur pré-remplissage:', err);
    } finally {
      setPrefillDone(true);
    }
  }, [prefillDone, block, lead, values, valuesLoading]);

  // === MOTEUR DE FORMULES DYNAMIQUES ===
  const formulaEngineRef = useRef<DynamicFormulaEngine>();
  const [formulaEngine, setFormulaEngine] = useState<DynamicFormulaEngine>();

  useEffect(() => {
    if (!block || !Array.isArray(fieldRulesSets)) return;
    try {
      const engine = new DynamicFormulaEngine(block, fieldRulesSets);
      formulaEngineRef.current = engine;
      setFormulaEngine(engine);
    } catch (err) {
      console.warn('Erreur initialisation moteur de formules:', err);
    }
  }, [block, fieldRulesSets]);

  // Application automatique des formules quand les valeurs changent
  useEffect(() => {
    if (!formulaEngine || valuesLoading) return;
    try {
      const newValues = formulaEngine.evaluate(values);
      if (JSON.stringify(newValues) !== JSON.stringify(values)) {
        setValues(newValues);
      }
    } catch (err) {
      console.warn('Erreur évaluation formules:', err);
    }
  }, [formulaEngine, values, valuesLoading]);

  // === GESTION DES CHAMPS ===
  // Déterminer l'état UI d'un champ (visible, disabled, requis) selon dépendances
  const getFieldUIState = useCallback((field: Field): FieldUIState => {
    const ruleSet = fieldRulesSets?.find(rs => rs.fieldId === field.id);
    if (!ruleSet?.dependencies) return { visible: true, disabled: false, required: field.required || false };

    let visible = true, disabled = false, required = field.required || false;

    ruleSet.dependencies.forEach(dep => {
      try {
        const result = evaluateDependency(dep, values);
        if (dep.action === 'show') visible = visible && result;
        else if (dep.action === 'hide') visible = visible && !result;
        else if (dep.action === 'enable') disabled = disabled || !result;
        else if (dep.action === 'disable') disabled = disabled || result;
        else if (dep.action === 'require') required = required || result;
        else if (dep.action === 'optional') required = required && !result;
      } catch (err) {
        console.warn(`Erreur évaluation dépendance ${dep.id}:`, err);
      }
    });

    return { visible, disabled, required };
  }, [fieldRulesSets, values]);

  // === VALIDATION ===
  // Valider un champ selon ses règles
  const validateField = useCallback((field: Field, value: unknown): string | null => {
    const uiState = getFieldUIState(field);
    if (!uiState.visible) return null;

    const ruleSet = fieldRulesSets?.find(rs => rs.fieldId === field.id);
    if (!ruleSet?.validations) return null;

    for (const validation of ruleSet.validations) {
      try {
        const isValid = applyValidation(validation, value, values, field);
        if (!isValid) return validation.message || 'Valeur invalide';
      } catch (err) {
        console.warn(`Erreur validation ${validation.id}:`, err);
      }
    }
    return null;
  }, [fieldRulesSets, values, getFieldUIState]);

  // Erreurs de validation pour tous les champs
  const fieldErrors = useMemo(() => {
    const errors: Record<string, string | null> = {};
    if (!block) return errors;

    block.sections?.forEach(section => {
      section.fields?.forEach(field => {
        const error = validateField(field, values[field.id]);
        errors[field.id] = error;
      });
    });

    return errors;
  }, [block, values, validateField]);

  // === GESTION DES CHANGEMENTS ===
  const handleFieldChange = useCallback((fieldId: string, value: unknown) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
  }, []);

  // === SAUVEGARDE AUTOMATIQUE ===
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [saving, setSaving] = useState(false);

  const saveDevis = useCallback(async () => {
    if (!lead || !storageKey || valuesLoading) return;
    try {
      setSaving(true);
      const payload = {
        storageKey,
        values: {
          ...values,
          _meta: {
            ...(currentMeta || {}),
            updatedAt: new Date().toISOString(),
            name: devisName || 'Devis sans nom'
          }
        }
      };

      await api.post(`/api/leads/${leadId}/devis`, payload);
    } catch (err) {
      console.error('Erreur sauvegarde devis:', err);
    } finally {
      setSaving(false);
    }
  }, [lead, storageKey, values, valuesLoading, currentMeta, devisName, api, leadId]);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(saveDevis, 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [saveDevis]);

  // === ACTIONS DE GESTION DES DEVIS ===
  const archiveDevis = useCallback(async () => {
    if (!currentMeta) return;
    try {
      const payload = {
        storageKey,
        values: {
          ...values,
          _meta: { ...currentMeta, archived: true, archivedAt: new Date().toISOString() }
        }
      };
      await api.post(`/api/leads/${leadId}/devis`, payload);
      // Rediriger vers le devis principal
      const next = new URLSearchParams(params);
      next.delete('devisId');
      setParams(next, { replace: true });
    } catch (err) {
      console.error('Erreur archivage:', err);
    }
  }, [currentMeta, storageKey, values, api, leadId, params, setParams]);

  const unarchiveDevis = useCallback(async () => {
    if (!currentMeta) return;
    try {
      const newMeta = { ...currentMeta };
      delete newMeta.archived;
      delete newMeta.archivedAt;
      
      const payload = {
        storageKey,
        values: { ...values, _meta: newMeta }
      };
      await api.post(`/api/leads/${leadId}/devis`, payload);
    } catch (err) {
      console.error('Erreur désarchivage:', err);
    }
  }, [currentMeta, storageKey, values, api, leadId]);

  const duplicateDevis = useCallback(async () => {
    if (!values) return;
    try {
      const newDevisId = generateDevisId();
      const newStorageKey = `${blockId}::${newDevisId}`;
      const payload = {
        storageKey: newStorageKey,
        values: {
          ...values,
          _meta: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            name: `${devisName || 'Devis'} (copie)`
          }
        }
      };
      
      await api.post(`/api/leads/${leadId}/devis`, payload);
      
      // Rediriger vers le nouveau devis
      const next = new URLSearchParams(params);
      next.set('devisId', newDevisId);
      setParams(next, { replace: true });
    } catch (err) {
      console.error('Erreur duplication:', err);
    }
  }, [values, blockId, generateDevisId, devisName, api, leadId, params, setParams]);

  // === RENDU DES CHAMPS ===
  const renderField = useCallback((field: Field) => {
    const uiState = getFieldUIState(field);
    if (!uiState.visible) return null;

    const value = values[field.id];
    const error = fieldErrors[field.id];
    const hasError = !!error;

    // Déterminer les styles selon le type et la config
    const cfg = field.advancedConfig as Record<string, unknown> | null;
    const customStyles: React.CSSProperties = {};
    
    if (cfg?.color && typeof cfg.color === 'string') {
      customStyles.backgroundColor = cfg.color;
    }
    if (cfg?.textColor && typeof cfg.textColor === 'string') {
      customStyles.color = cfg.textColor;
    }

    const commonProps = {
      disabled: uiState.disabled,
      required: uiState.required,
      style: customStyles,
      className: hasError ? 'error-field' : ''
    };

    // Types de champs spéciaux avec logique avancée
    if (field.type === 'advanced_select') {
      return renderAdvancedSelect(field, value, commonProps, hasError, error);
    }

    if (field.type === 'tableau') {
      return renderTableauField(field, value, commonProps);
    }

    if (field.type === 'donnee') {
      return renderDonneeField(field, value, commonProps);
    }

    if (field.type === 'image_user') {
      return renderImageField(field, value, commonProps);
    }

    // Types standards
    return renderStandardField(field, value, commonProps, hasError, error);
  }, [getFieldUIState, values, fieldErrors]);

  // Rendu d'un champ advanced_select avec cascade infinie
  const renderAdvancedSelect = useCallback((
    field: Field,
    value: unknown,
    commonProps: any,
    hasError: boolean,
    error: string | null
  ) => {
    // Logique complexe de cascade basée sur la config avancée
    const cfg = field.advancedConfig as Record<string, unknown> | null;
    const cascade = cfg?.cascade as Record<string, unknown>[] | undefined;
    
    // Si cascade définie, utiliser la logique de sélection en cascade
    if (cascade && Array.isArray(cascade)) {
      return renderCascadeSelect(field, value, commonProps, cascade);
    }

    // Sinon, select simple avec options du field
    return (
      <div key={field.id} className={`field-container ${getFieldWidth(field)}`}>
        <label>{field.label} {commonProps.required && <span className="required">*</span>}</label>
        <Select
          {...commonProps}
          value={value as string}
          onChange={(val) => handleFieldChange(field.id, val)}
          status={hasError ? 'error' : undefined}
        >
          {field.options?.map(opt => (
            <Option key={opt.id} value={opt.value || opt.label}>
              {opt.label}
            </Option>
          ))}
        </Select>
        {hasError && <div className="error-message">{error}</div>}
      </div>
    );
  }, [handleFieldChange, getFieldWidth]);

  // Rendu d'un champ tableau configurable
  const renderTableauField = useCallback((
    field: Field,
    value: unknown,
    commonProps: any
  ) => {
    const cfg = field.advancedConfig as Record<string, unknown> | null;
    const tableauConfig = cfg?.tableau as Record<string, unknown> | undefined;
    
    return (
      <div key={field.id} className="field-container full-width">
        <label>{field.label}</label>
        <TableauConfigurable
          config={tableauConfig}
          value={value as any[]}
          onChange={(val) => handleFieldChange(field.id, val)}
          {...commonProps}
        />
      </div>
    );
  }, [handleFieldChange]);

  // Rendu d'un champ de données calculé
  const renderDonneeField = useCallback((
    field: Field,
    value: unknown,
    commonProps: any
  ) => {
    const cfg = field.advancedConfig as Record<string, unknown> | null;
    const isReactive = cfg?.reactive as boolean | undefined;
    const showSteps = cfg?.ui && typeof cfg.ui === 'object' 
      ? (cfg.ui as Record<string, unknown>).showCalculationSteps 
      : false;

    return (
      <div key={field.id} className={`field-container ${getFieldWidth(field)}`}>
        <label>{field.label}</label>
        <div 
          className={`donnee-display ${isReactive ? 'reactive' : 'static'}`}
          style={commonProps.style}
        >
          <div className="value">{formatDisplayValue(value, cfg)}</div>
          {showSteps && <div className="calculation-steps">
            {/* Afficher les étapes de calcul si disponibles */}
          </div>}
        </div>
      </div>
    );
  }, [getFieldWidth, formatDisplayValue]);

  // Rendu d'un champ image avec upload
  const renderImageField = useCallback((
    field: Field,
    value: unknown,
    commonProps: any
  ) => {
    const handleImageUpload = (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const uploadedFile: UploadedFileValue = {
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: reader.result as string
        };
        handleFieldChange(field.id, uploadedFile);
      };
      reader.readAsDataURL(file);
    };

    return (
      <div key={field.id} className={`field-container ${getFieldWidth(field)}`}>
        <label>{field.label} {commonProps.required && <span className="required">*</span>}</label>
        <Upload
          {...commonProps}
          accept="image/*"
          beforeUpload={(file) => {
            handleImageUpload(file);
            return false; // Empêcher l'upload automatique
          }}
          fileList={[]}
        >
          <Button icon={<UploadOutlined />}>Sélectionner une image</Button>
        </Upload>
        {isUploadedFileValue(value) && (
          <div className="image-preview">
            <img src={value.dataUrl} alt={value.name} style={{ maxWidth: '200px', maxHeight: '150px' }} />
            <div className="image-info">{value.name} ({Math.round(value.size / 1024)}KB)</div>
          </div>
        )}
      </div>
    );
  }, [getFieldWidth, handleFieldChange]);

  // Rendu des champs standards
  const renderStandardField = useCallback((
    field: Field,
    value: unknown,
    commonProps: any,
    hasError: boolean,
    error: string | null
  ) => {
    const Component = getFieldComponent(field.type);
    if (!Component) return null;

    return (
      <div key={field.id} className={`field-container ${getFieldWidth(field)}`}>
        <label>{field.label} {commonProps.required && <span className="required">*</span>}</label>
        <Component
          {...commonProps}
          value={value}
          onChange={(val: unknown) => handleFieldChange(field.id, val)}
          options={field.options}
          status={hasError ? 'error' : undefined}
        />
        {hasError && <div className="error-message">{error}</div>}
      </div>
    );
  }, [handleFieldChange, getFieldWidth, getFieldComponent]);

  // === INTERFACE DE GESTION ===
  if (loading || !block || !lead) {
    return (
      <div className="devis-page loading">
        <div className="loading-content">
          <Spin size="large" />
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="devis-page">
      {/* En-tête avec sélection de devis et actions */}
      <div className="devis-header">
        <div className="lead-info">
          <h1>Devis - {lead.name || lead.email}</h1>
          {lead.company && <p className="company">{lead.company}</p>}
        </div>

        <div className="devis-controls">
          <div className="devis-selector">
            <Select
              value={storageKey}
              onChange={(key) => {
                const option = devisOptions.find(opt => opt.key === key);
                const next = new URLSearchParams(params);
                if (option?.devisId) {
                  next.set('devisId', option.devisId);
                } else {
                  next.delete('devisId');
                }
                setParams(next, { replace: true });
              }}
              style={{ minWidth: 200 }}
            >
              {devisOptions.map(opt => (
                <Option key={opt.key} value={opt.key}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </div>

          <div className="devis-actions">
            <Input
              value={devisName}
              onChange={(e) => setDevisName(e.target.value)}
              placeholder="Nom du devis"
              style={{ width: 200 }}
            />
            
            <Button onClick={duplicateDevis} icon={<CopyOutlined />}>
              Dupliquer
            </Button>
            
            {isArchived ? (
              <Button onClick={unarchiveDevis} type="primary">
                Désarchiver
              </Button>
            ) : (
              <Button onClick={archiveDevis} danger>
                Archiver
              </Button>
            )}

            <Switch
              checked={showArchived}
              onChange={setShowArchived}
              checkedChildren="Archivés"
              unCheckedChildren="Actifs"
            />
          </div>
        </div>
      </div>

      {/* Interface en onglets pour les sections */}
      <div className="devis-content">
        <Tabs defaultActiveKey="0" type="card">
          {block.sections?.map((section, index) => (
            <TabPane tab={section.name} key={index.toString()}>
              <div className="section-content">
                <div className="fields-grid">
                  {section.fields?.map(renderField)}
                </div>
              </div>
            </TabPane>
          ))}
        </Tabs>
      </div>

      {/* Statut de sauvegarde */}
      <div className="devis-footer">
        <div className="save-status">
          {saving ? <Spin size="small" /> : <CheckCircleOutlined style={{ color: '#52c41a' }} />}
          <span>{saving ? 'Sauvegarde...' : 'Sauvegardé automatiquement'}</span>
        </div>
      </div>

      <style jsx>{`
        .devis-page {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .devis-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .lead-info h1 {
          margin: 0;
          font-size: 24px;
          color: #1890ff;
        }
        
        .lead-info .company {
          margin: 4px 0 0 0;
          color: #666;
        }
        
        .devis-controls {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        
        .devis-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .fields-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          padding: 20px 0;
        }
        
        .field-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .field-container.half-width {
          grid-column: span 1;
        }
        
        .field-container.full-width {
          grid-column: 1 / -1;
        }
        
        .field-container.quarter-width {
          grid-column: span 1;
          max-width: 200px;
        }
        
        .field-container label {
          font-weight: 500;
          color: #262626;
        }
        
        .field-container .required {
          color: #ff4d4f;
        }
        
        .error-field {
          border-color: #ff4d4f !important;
        }
        
        .error-message {
          color: #ff4d4f;
          font-size: 12px;
        }
        
        .donnee-display {
          padding: 8px 12px;
          border: 1px solid #d9d9d9;
          border-radius: 6px;
          background: #f5f5f5;
        }
        
        .donnee-display.reactive {
          background: #e6f7ff;
          border-color: #91d5ff;
        }
        
        .image-preview {
          margin-top: 8px;
          padding: 8px;
          border: 1px solid #d9d9d9;
          border-radius: 6px;
        }
        
        .image-preview img {
          display: block;
          margin-bottom: 4px;
        }
        
        .image-info {
          font-size: 12px;
          color: #666;
        }
        
        .devis-footer {
          display: flex;
          justify-content: flex-end;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #f0f0f0;
        }
        
        .save-status {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #666;
        }
        
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }
        
        .loading-content {
          text-align: center;
        }
        
        .loading-content p {
          margin-top: 16px;
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default DevisPage;
