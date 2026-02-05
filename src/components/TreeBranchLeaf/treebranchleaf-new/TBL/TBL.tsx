import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';

// 🎯 CSS pour astérisques verts par défaut
import '../../../../styles/tbl-green-asterisk.css';

// 🚀 PERF: Debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 🔄 Déclaration TypeScript pour la fonction de refresh
declare global {
  interface Window {
    TBL_FORCE_REFRESH?: () => void;
    __TBL_LAST_TREE_ID?: string;
    // 🔒 FLAG: Empêcher le preload pendant le sync bidirectionnel
    __TBL_SKIP_PRELOAD_UNTIL?: number;
  }
}
import { 
  Layout, 
  Typography, 
  Card, 
  Space, 
  Button, 
  Modal, 
  message, 
  Tabs,
  Input,
  Progress,
  Row,
  Col,
  Spin,
  Alert,
  Form,
  Grid,
  Skeleton,
  Tooltip,
  Tag
} from 'antd';
import { FileTextOutlined, DownloadOutlined, ClockCircleOutlined, FolderOpenOutlined, PlusOutlined, UserOutlined, FileAddOutlined, SearchOutlined, MailOutlined, PhoneOutlined, HomeOutlined, SwapOutlined, LeftOutlined, RightOutlined, SaveOutlined } from '@ant-design/icons';
import { useAuth } from '../../../../auth/useAuth';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTreeBranchLeafConfig } from '../../hooks/useTreeBranchLeafConfig';
import { useAuthenticatedApi } from '../../../../hooks/useAuthenticatedApi';
import { blockGetRequestsTemporarily, unblockGetRequests } from '../../../../hooks/useNodeCalculatedValue';
import { ClientSidebar } from './components/ClientSidebar';
import TBLSectionRenderer from './components/TBLSectionRenderer';
import { useTBLDataPrismaComplete, type TBLField, type TBLSection } from './hooks/useTBLDataPrismaComplete';
import { useTBLDataHierarchicalFixed } from './hooks/useTBLData-hierarchical-fixed';
import { useTBLValidation } from './hooks/useTBLValidation';
import { TBLValidationProvider, useTBLValidationContext } from './contexts/TBLValidationContext';
import { TBLBatchProvider } from './contexts/TBLBatchContext'; // 🚀 BATCH LOADING
import { useTBLCapabilitiesPreload } from './hooks/useTBLCapabilitiesPreload';
import { dlog, isVerbose } from '../../../../utils/debug';
import { useTBLSave, type TBLFormData } from './hooks/useTBLSave';
import { buildMirrorKeys } from './utils/mirrorNormalization';
import type { TBLLead } from '../../lead-integration/types/lead-types';
import { useTBLSwipeNavigation } from './hooks/useTBLSwipeNavigation';

// 🚀 LAZY IMPORTS - Composants chargés uniquement quand nécessaires (modals, panels dev)
const DocumentsSection = lazy(() => import('../../../Documents/DocumentsSection'));
const TBLDevCapabilitiesPanel = lazy(() => import('./components/Dev/TBLDevCapabilitiesPanel'));
const LeadSelectorModal = lazy(() => import('../../lead-integration/LeadSelectorModal'));
const LeadCreatorModalAdvanced = lazy(() => import('../../lead-integration/LeadCreatorModalAdvanced'));

// Déclaration étendue pour éviter usage de any lors de l'injection diag
declare global { interface Window { TBL_DEP_GRAPH?: Map<string, Set<string>>; TBL_FORM_DATA?: Record<string, unknown>; } }
// import { useEvalBridge } from './bridge/evalBridge'; // (pont disponible si besoin de calculs asynchrones)

const { Content } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface TBLProps {
  clientData?: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  treeId?: string;
}

const TBL: React.FC<TBLProps> = ({ 
  treeId
}) => {
  const formatAddressValue = useCallback((value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      return value.map(entry => formatAddressValue(entry)).filter(Boolean).join(', ');
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const direct = obj.value ?? obj.label ?? obj.text ?? obj.display ?? obj.name;
      if (direct) return String(direct);
      const street = obj.street ?? obj.address ?? obj.line1 ?? obj.route;
      const city = obj.city ?? obj.locality;
      const zip = obj.zipCode ?? obj.postalCode ?? obj.zip;
      const country = obj.country ?? obj.pays;
      const parts = [street, zip, city, country]
        .map((part) => (part !== undefined && part !== null ? String(part).trim() : ''))
        .filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
      try {
        return JSON.stringify(obj);
      } catch {
        return String(obj);
      }
    }
    return String(value);
  }, []);
  
  // Récupérer leadId depuis l'URL
  const { leadId: urlLeadId } = useParams<{ leadId?: string }>();
  const [searchParams] = useSearchParams();
  const requestedDevisId = searchParams.get('devisId');
  const { api } = useAuthenticatedApi();
  const screens = useBreakpoint();
  const isMobile = !screens.lg;
  const isTablet = !screens.xl && screens.lg;
  const contentPaddingClass = useMemo(() => {
    if (isMobile) return 'p-3';
    if (isTablet) return 'p-4';
    return 'p-6';
  }, [isMobile, isTablet]);
  const mainRowGutter = useMemo<[number, number]>(() => [
    isMobile ? 16 : isTablet ? 20 : 24,
    isMobile ? 16 : 32
  ], [isMobile, isTablet]);
  const headerContainerClass = useMemo(
    () => `mb-6 pb-4 border-b border-gray-200 flex ${isMobile ? 'flex-col gap-4 items-start' : 'items-center justify-between'}`,
    [isMobile]
  );
  const headerActionsDirection = 'horizontal';
  const headerActionsAlign = isMobile ? 'start' : 'center';
  const headerActionsClassName = isMobile ? 'w-full' : undefined;
  const actionButtonBlock = false;

  const [clientData, setClientData] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [leadId, setLeadId] = useState<string | undefined>(urlLeadId);
  const [isLoadingLead, setIsLoadingLead] = useState<boolean>(!!urlLeadId);

  const [leadSelectorVisible, setLeadSelectorVisible] = useState(false);
  const [leadCreatorVisible, setLeadCreatorVisible] = useState(false);
  const [devisSelectorVisible, setDevisSelectorVisible] = useState(false);
  const [availableDevis, setAvailableDevis] = useState<Array<{id: string, firstName: string, lastName: string, email: string, company?: string, submissions: Array<{id: string, name: string, status: string, createdAt: string, treeName?: string}>}>>([]);
  const [devisSearchTerm, setDevisSearchTerm] = useState('');

  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<Array<{id: string, name: string, type: string, description?: string}>>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const [devisCreatorVisible, setDevisCreatorVisible] = useState(false);
  const [devisName, setDevisName] = useState('');
  const [selectedLeadForDevis, setSelectedLeadForDevis] = useState<TBLLead | null>(null);
  const [form] = Form.useForm();

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [autosaveLast, setAutosaveLast] = useState<Date | null>(null);
  const [devisCreatedAt, setDevisCreatedAt] = useState<Date | null>(null);
  const debounceRef = useRef<number | null>(null);
  const lastSavedSignatureRef = useRef<string | null>(null);
  const lastQueuedSignatureRef = useRef<string | null>(null);
  const previewDebounceRef = useRef<number | null>(null);
  const lastPreviewSignatureRef = useRef<string | null>(null);
  // 🔧 FIX RACE CONDITION: Track si un changement est en attente dans le debounce de 80ms
  // Ceci permet d'éviter le broadcast quand une nouvelle modification est en cours de debounce
  const debounceActiveRef = useRef<boolean>(false);

  const [isDefaultDraft, setIsDefaultDraft] = useState<boolean>(!urlLeadId);
  const [isLoadedDevis, setIsLoadedDevis] = useState<boolean>(false);
  const [originalDevisId, setOriginalDevisId] = useState<string | null>(null);
  const [originalDevisName, setOriginalDevisName] = useState<string | null>(null);
  const [hasCopiedDevis, setHasCopiedDevis] = useState<boolean>(false);
  const [isDevisSaved, setIsDevisSaved] = useState<boolean>(false);

  const [isCompletedDirty, setIsCompletedDirty] = useState<boolean>(false);
  const [revisionRootName, setRevisionRootName] = useState<string | null>(null);
  const [pendingRevisionName, setPendingRevisionName] = useState<string | null>(null);
  const pendingRevisionForSubmissionIdRef = useRef<string | null>(null);
  const revisionCreateInFlightRef = useRef(false);
  const revisionCreatedFromSubmissionIdRef = useRef<string | null>(null);
  // 🔥 FIX 30/01/2026: Track quand le submissionId vient de changer pour forcer mode='open'
  const submissionIdJustChangedUntilRef = useRef<number>(0);
  // 🔥 FIX 01/02/2026: Track le dernier clientId (leadId) pour forcer mode='open' quand il change
  const lastClientIdRef = useRef<string | null>(null);

  const [saveDevisModalVisible, setSaveDevisModalVisible] = useState<boolean>(false);
  const [saveDevisName, setSaveDevisName] = useState<string>('');
  const [isSavingDevis, setIsSavingDevis] = useState<boolean>(false);

  // 🆕 NOUVEAU DEVIS
  // Règle: en brouillon (global ou lead) => on vide seulement les données et on reste en mode brouillon.
  // Si on quitte un devis enregistré modifié => on crée d'abord une version -N.
  const handleNewDevis = async () => {
    try {
      try {
        await persistCompletedRevisionIfDirty('new-devis');
      } catch (e) {
        console.warn('⚠️ [TBL] Persist revision avant Nouveau devis échoué (on continue):', e);
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      try {
        const flushField = lastRealChangedFieldIdRef.current || 'NULL';
        await doAutosave(formData, flushField);
        await waitForAutosaveIdle(3000);
      } catch { /* noop */ }

      autosaveSuspendedRef.current = true;
      pendingAutosaveRef.current = null;

      const currentTreeId = effectiveTreeId;
      const currentUserId = user?.id;
      const isDraftModeNow = !isDevisSaved;
      const isLeadDraftNow = isDraftModeNow && !!leadId;
      const isGlobalDraftNow = isDraftModeNow && !leadId;

      let draftIdToClear: string | null = submissionId;

      if (!draftIdToClear && api && currentTreeId) {
        if (isLeadDraftNow && leadId) {
          const existing = await api.get(`/api/treebranchleaf/submissions?treeId=${currentTreeId}&leadId=${leadId}&status=draft`);
          const draftsArray = Array.isArray(existing) ? existing : (existing as any)?.data || [];
          draftIdToClear = (draftsArray as Array<{ id?: string }>)[0]?.id || null;
        } else if (isGlobalDraftNow && currentUserId) {
          const existing = await api.get(`/api/treebranchleaf/submissions?treeId=${currentTreeId}&userId=${currentUserId}&status=default-draft`);
          const draftsArray = Array.isArray(existing) ? existing : (existing as any)?.data || [];
          draftIdToClear = (draftsArray as Array<{ id?: string; status?: string }>).find((d) => d.status === 'default-draft')?.id || null;
        }
      }

      if (api && draftIdToClear) {
        try {
          await api.post(`/api/treebranchleaf/submissions/${draftIdToClear}/reset-data`, {});
        } catch (e) {
          console.warn('⚠️ [TBL] Impossible de vider le brouillon en DB:', e);
        }
      }

      setFormData((prev) => {
        const kept: TBLFormData = {};
        Object.keys(prev || {}).forEach((k) => {
          if (k.startsWith('__')) kept[k] = prev[k];
        });
        if (isLeadDraftNow && leadId) {
          kept.__leadId = leadId;
        }
        return kept;
      });

      setIsDevisSaved(false);
      setIsLoadedDevis(false);
      setOriginalDevisId(null);
      setOriginalDevisName(null);
      setHasCopiedDevis(false);
      setIsCompletedDirty(false);
      setRevisionRootName(null);
      setDevisName('Brouillon');

      if (isLeadDraftNow) {
        setIsDefaultDraft(false);
        setSubmissionId(draftIdToClear);
      } else {
        setLeadId(undefined);
        setClientData({ id: '', name: '', email: '', phone: '', address: '' });
        setIsDefaultDraft(true);
        setSubmissionId(draftIdToClear);
      }

      lastSavedSignatureRef.current = null;
      lastQueuedSignatureRef.current = null;
      message.success('Brouillon réinitialisé');
    } catch (error) {
      console.error('❌ [TBL] Erreur Nouveau devis:', error);
      message.error('Erreur lors de la réinitialisation');
    } finally {
      setTimeout(() => {
        autosaveSuspendedRef.current = false;
      }, 0);
    }
  };

  // Sélection d'un lead depuis le sélecteur
  // - Si on est dans le brouillon global avec des données: transférer -> brouillon du lead, puis vider le global
  // - Sinon: charger/créer le brouillon du lead sans l'écraser
  const handleSelectLead = async (selectedLead: TBLLead) => {
    if (devisCreatorVisible) return;
    if (!api || !effectiveTreeId) return;

    autosaveSuspendedRef.current = true;
    pendingAutosaveRef.current = null;

    try {
      await persistCompletedRevisionIfDirty('select-lead');

      const isDraftModeNow = !isDevisSaved;
      const isGlobalDraftNow = isDraftModeNow && !leadId;
      const shouldTransfer = isGlobalDraftNow && hasMeaningfulUserEntries(formData);
      const oldGlobalDraftId = isGlobalDraftNow ? submissionId : null;

      let leadDraftId: string | null = null;

      if (shouldTransfer) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        try {
          const flushField = lastRealChangedFieldIdRef.current || 'NULL';
          await doAutosave(formData, flushField);
          await waitForAutosaveIdle(3000);
        } catch { /* noop */ }

        const resp = await api.post('/api/tbl/submissions/create-and-evaluate', {
          treeId: effectiveTreeId,
          clientId: selectedLead.id,
          formData: normalizePayload(formData),
          status: 'draft',
          providedName: 'Brouillon',
          changedFieldId: 'NULL',
          evaluationMode: 'open'  // 🎯 Forcer recalcul complet des DISPLAY
        });
        leadDraftId = (resp as any)?.submission?.id || null;
      } else {
        const existing = await api.get(`/api/treebranchleaf/submissions?treeId=${effectiveTreeId}&leadId=${selectedLead.id}&status=draft`);
        const draftsArray = Array.isArray(existing) ? existing : (existing as any)?.data || [];
        leadDraftId = (draftsArray as Array<{ id?: string }>)[0]?.id || null;
        if (!leadDraftId) {
          // 🆕 Créer un nouveau brouillon pour ce lead
          const created = await api.post('/api/tbl/submissions/create-and-evaluate', {
            treeId: effectiveTreeId,
            clientId: selectedLead.id,
            formData: {},
            status: 'draft',
            providedName: 'Brouillon',
            changedFieldId: 'NULL',
            evaluationMode: 'open'  // 🎯 Forcer recalcul complet des DISPLAY
          });
          leadDraftId = (created as any)?.submission?.id || null;
        } else {
          // 🔥 FIX 01/02/2026: Forcer recalcul des DISPLAY fields pour le brouillon existant
          // Quand on sélectionne un lead avec un brouillon existant, les DISPLAY fields
          // (comme GRD qui dépend du code postal du lead) doivent être recalculés
          console.log(`🔄 [TBL] Brouillon existant ${leadDraftId} - forcer recalcul DISPLAY fields`);
          const refreshed = await api.post('/api/tbl/submissions/create-and-evaluate', {
            submissionId: leadDraftId,
            clientId: selectedLead.id,
            formData: {}, // Les données seront chargées depuis la DB
            status: 'draft',
            changedFieldId: 'NULL',
            evaluationMode: 'open'  // 🎯 Forcer recalcul complet des DISPLAY
          });
          // Broadcaster les valeurs calculées pour les DISPLAY fields
          broadcastCalculatedRefresh({
            reason: 'lead-selection-refresh',
            evaluatedSubmissionId: leadDraftId,
            recalcCount: (refreshed as any)?.submission?.TreeBranchLeafSubmissionData?.length,
            submissionData: (refreshed as any)?.submission?.TreeBranchLeafSubmissionData
          });
        }
      }

      setLeadId(selectedLead.id);
      setClientData({
        id: selectedLead.id,
        name: `${selectedLead.firstName || ''} ${selectedLead.lastName || ''}`.trim() || selectedLead.company || 'Lead sans nom',
        email: selectedLead.email || '',
        phone: selectedLead.phone || '',
        address: formatAddressValue((selectedLead as unknown as { address?: unknown; data?: { address?: unknown } })?.address ?? (selectedLead as unknown as { data?: { address?: unknown } })?.data?.address ?? '')
      });
      setIsDevisSaved(false);
      setIsLoadedDevis(false);
      setOriginalDevisId(null);
      setOriginalDevisName(null);
      setHasCopiedDevis(false);
      setIsDefaultDraft(false);
      setDevisName('Brouillon');
      setSubmissionId(leadDraftId);
      setIsCompletedDirty(false);
      setRevisionRootName(null);

      if (api && leadDraftId) {
        try {
          const submissionDataResponse = await api.get(`/api/treebranchleaf/submissions/${leadDraftId}/fields`);
          const fieldsMap = (submissionDataResponse as any)?.fields || {};
          const restoredData: Record<string, string> = {};

          Object.entries(fieldsMap).forEach(([nodeId, fieldData]: [string, any]) => {
            const src = typeof fieldData?.calculatedBy === 'string' ? fieldData.calculatedBy.toLowerCase() : null;
            const isUserInput = !src || src === 'neutral' || src === 'field' || src === 'fixed';
            if (isUserInput && fieldData?.rawValue !== undefined && fieldData?.rawValue !== null) {
              restoredData[nodeId] = String(fieldData.rawValue);
            }
          });

          setFormData((prev) => {
            const kept: TBLFormData = {};
            Object.keys(prev || {}).forEach((k) => {
              if (k.startsWith('__')) kept[k] = prev[k];
            });
            return { ...kept, ...restoredData, __leadId: selectedLead.id };
          });
        } catch (e) {
          console.warn('⚠️ [TBL] Impossible de charger le brouillon du lead:', e);
        }
      }

      if (api && oldGlobalDraftId && shouldTransfer) {
        try {
          await api.post(`/api/treebranchleaf/submissions/${oldGlobalDraftId}/reset-data`, {});
        } catch (e) {
          console.warn('⚠️ [TBL] Impossible de vider le brouillon global après transfert:', e);
        }
      }

      lastSavedSignatureRef.current = null;
      lastQueuedSignatureRef.current = null;

      setLeadSelectorVisible(false);
      message.success(`Brouillon chargé pour "${selectedLead.firstName} ${selectedLead.lastName}"`);
    } catch (e) {
      console.error('❌ [TBL] Erreur sélection lead:', e);
      message.error('Erreur lors de la sélection du lead');
    } finally {
      setTimeout(() => {
        autosaveSuspendedRef.current = false;
      }, 0);
    }
  };

  // Orchestrateur post-création (le modal crée déjà le lead via l'API)
  // Ici: pas de re-post API pour éviter les doublons; on peut éventuellement préparer une soumission TBL.
  const handleCreateLead = useCallback(async () => {
    // No-op côté TBL: la création du lead est gérée dans le composant modal avancé
    // Cet espace est réservé pour une éventuelle création de brouillon TBL après le lead
    return;
  }, []);

  // Diagnostic en développement - PREMIER hook pour éviter violation des règles
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const runDiagnostic = () => {
        const data = window.TBL_FORM_DATA || {};
        const mirrorKeys = Object.keys(data).filter(k => k.startsWith('__mirror_data_'));
        // console.log('🔧 [TBL] Diagnostic - FormData keys:', Object.keys(data).length);
        // console.log('🪞 [TBL] Diagnostic - Mirror keys:', mirrorKeys.length);
        return { data, mirrorKeys };
      };
      window.runTBLDiagnostic = runDiagnostic;
      
      if (localStorage.getItem('TBL_AUTO_DIAG') === '1') {
        setTimeout(runDiagnostic, 1000);
      }
    }
  }, []);

  // State pour les onglets et formulaire
  const [activeTab, setActiveTab] = useState<string>('client-info');
  const [formData, setFormData] = useState<TBLFormData>({});
  const [autoSaveEnabled] = useState(true);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  
  // 🔄 État centralisé pour les sous-onglets actifs (pour navigation swipe)
  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, string | undefined>>({});
  const tblSwipeContainerRef = useRef<HTMLDivElement>(null);
  
  // 🎯 RÉFÉRENCE STABLE: Ref pour handleFieldChange (utilisée par le wrapper stable)
  const handleFieldChangeRef = useRef<(fieldId: string, value: string | number | boolean | string[] | null | undefined) => void>();

  // LOGS AUTOMATIQUES pour analyser l'état des mirrors et cartes
  // 🔥 DÉSACTIVÉ: Effet de debug qui causait des re-renders excessifs
  // Le useEffect avec [formData] en dépendance créait un nouveau timer à chaque changement
  // Si besoin de debug, utilisez window.runTBLDiagnostic() manuellement
  /*
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const timer = setTimeout(() => {
        // console.log('🚀 [TBL AUTO] ANALYSE AUTOMATIQUE DES MIRRORS');
        // ... code de debug ...
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [formData]);
  */

  // Charger la configuration TBL
  const { 
    config: tblConfig, 
    loading: configLoading, 
    error: configError 
  } = useTreeBranchLeafConfig();
  // const [reload, setReload] = useState(0); // supprimé : non utilisé

  // 🔥 DEBUG: Global listener to trace tbl-node-updated events
  useEffect(() => {
    const globalDebugListener = (event: Event) => {
      try {
        const customEvent = event as CustomEvent<any>;
        const { node, treeId } = customEvent.detail || {};
        (window as any).__tblGlobalEvents = (window as any).__tblGlobalEvents || [];
        (window as any).__tblGlobalEvents.push({
          time: new Date().toISOString(),
          event: 'tbl-node-updated',
          nodeId: node?.id,
          treeId,
          metadata: node?.metadata
        });
      } catch {
        // ignore
      }
    };
    window.addEventListener('tbl-node-updated', globalDebugListener, true);
    return () => window.removeEventListener('tbl-node-updated', globalDebugListener, true);
  }, []);

  // Hooks personnalisés
  // Flag de bascule (localStorage.USE_FIXED_HIERARCHY = '1')
  const useFixed = useMemo(() => {
    try { return localStorage.getItem('USE_FIXED_HIERARCHY') === '1'; } catch { return false; }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      (window as any).__TBL_USING_FIXED_HIERARCHY = useFixed;
    } catch {
      // ignore write errors (private browsing, etc.)
    }
  }, [useFixed]);

  const requestedTreeId = treeId || 'cmf1mwoz10005gooked1j6orn';

  // Ancien hook (référence actuelle) - désactivé si on bascule vers nouveau
  const [retransformCounter, setRetransformCounter] = useState(0);
  const oldData = useTBLDataPrismaComplete({ 
    tree_id: requestedTreeId,
    disabled: useFixed, // éviter double fetch
    triggerRetransform: retransformCounter
  });

  // Nouveau hook hiérarchique propre - activé seulement si flag
  const newData = useTBLDataHierarchicalFixed({
    tree_id: requestedTreeId,
    disabled: !useFixed
  });

  // 🔥 SIGNAL RETRANSFORM: When displayAlways changes, increment counter to trigger hook retransform
  const refetchRef = useRef<(() => void) | undefined>();
  
  // 🎯 Track if we just created a new devis to trigger refresh after React propagates new submissionId
  const justCreatedDevisRef = useRef<boolean>(false);
  
  // Keep refetch reference stable
  useEffect(() => {
    refetchRef.current = useFixed ? newData.refetch : oldData.refetch;
  }, [useFixed, newData.refetch, oldData.refetch]);
  
  // Also try event listener as fallback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleForceRetransform = (event: Event) => {
          const detail = (event as CustomEvent<{ source?: string; skipFormReload?: boolean; forceRemote?: boolean }>).detail;
          const forceRemote = !!detail?.forceRemote;
          const debugId = (detail as any)?.eventDebugId || null;
          
          // 🔥 CRITICAL: If forceRemote is true, ALWAYS process - NO EXCEPTIONS
          if (forceRemote) {
            setRetransformCounter(prev => prev + 1);
            try {
              const refetchResult = refetchRef.current?.();
              if (refetchResult instanceof Promise) {
                refetchResult.catch(() => { /* silent */ });
              }
            } catch { /* silent */ }
            return;
          }
          
          // For non-forceRemote events, check if we should skip
          if (detail?.skipFormReload || detail?.source === 'autosave') {
            return;
          }
          
          setRetransformCounter(prev => prev + 1);
      };
    
    window.addEventListener('tbl-force-retransform', handleForceRetransform);
    
    return () => {
      window.removeEventListener('tbl-force-retransform', handleForceRetransform);
    };
  }, [setRetransformCounter]);

  // ✅ Plus besoin de refresh event après création de devis!
  // Les calculated values (display fields) ne sont PAS liés au submissionId.
  // Ils calculent toujours en temps réel basé sur les champs actuels du formulaire.
  // Le submissionId sert UNIQUEMENT à enregistrer les champs normaux (TreeBranchLeafNode),
  // PAS les display fields qui restent dynamiques et calculent à la volée.
  useEffect(() => {
    if (justCreatedDevisRef.current && submissionId) {
      justCreatedDevisRef.current = false;
    }
  }, [submissionId]);

  // 🔥 Store the handler for direct metadata updates (bypass event system)
  useEffect(() => {
    (window as any).__tblHandleNodeMetadataUpdate = oldData.handleNodeMetadataUpdate;
  }, [oldData.handleNodeMetadataUpdate]);

  // Préload direct (pour le dev panel) - même treeId. On pourrait réutiliser celui interne du hook mais ici on force pour debug global
  const devPreload = useTBLCapabilitiesPreload({
    treeId: requestedTreeId,
    enabled: useFixed && (() => { try { return localStorage.getItem('TBL_DIAG') === '1'; } catch { return false; } })(),
    extractDependencies: true,
    includeRaw: false
  });

  // Si non activé, on pourrait éviter le fetch du nouveau hook : re-render initial trop tôt (flag stable), solution rapide:
  // On ignore simplement ses données (optimisation fetch déjà couverte dans hook si disabled futur).

  // Dataset sélectionné pour le rendu
  const tree = useFixed ? newData.tree : oldData.tree;
  const tabs = useFixed ? newData.tabs as unknown as TBLSection[] : oldData.tabs; // cast transitoire
  const dataLoading = useFixed ? newData.loading : oldData.loading;
  const dataError = useFixed ? newData.error : oldData.error;
  const rawNodes = useMemo(() => (useFixed ? (newData.rawNodes || []) : (oldData.rawNodes || [])), [useFixed, newData.rawNodes, oldData.rawNodes]); // 🔥 NOUVEAU: Nœuds bruts pour Cascader
  const effectiveTreeId = tree?.id || requestedTreeId;

  // ⚡ OPTIMISATION: Index O(1) pour résolution des alias sharedRef (remplace boucle O(n²))
  const sharedRefAliasMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!tabs || !Array.isArray(tabs)) return map;
    for (const tab of tabs) {
      if (!tab?.sections || !Array.isArray(tab.sections)) continue;
      for (const section of tab.sections) {
        if (!section?.fields || !Array.isArray(section.fields)) continue;
        for (const field of section.fields) {
          if (field?.sharedReferenceId && field?.id) {
            map.set(field.sharedReferenceId, field.id);
          }
        }
      }
    }
    return map;
  }, [tabs]);

  const isDraftMode = !isDevisSaved;
  const isGlobalDraftMode = isDraftMode && !leadId;
  const isLeadDraftMode = isDraftMode && !!leadId;

  // Helpers: normaliser payload (exclure mirrors) et calculer signature stable
  // ⚠️ Doit être déclaré AVANT tout useCallback qui le référence (évite TDZ).
  const normalizePayload = useCallback((data: TBLFormData) => {
    const out: Record<string, string | null> = {};
    Object.keys(data || {}).forEach((nodeId) => {
      if (nodeId.startsWith('__mirror_')) return; // exclure tous les miroirs
      const raw = (data as Record<string, unknown>)[nodeId];
      out[nodeId] = raw == null ? null : String(raw);
    });
    return out;
  }, []);

  const computeSignature = useCallback((obj: Record<string, unknown>) => {
    // Stringify stable: tri des clés pour éviter les différences d'ordre
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const k of keys) {
      const v = (obj as Record<string, unknown>)[k];
      parts.push(`${k}:${v === null ? 'null' : String(v)}`);
    }
    return parts.join('|');
  }, []);

  const hasMeaningfulUserEntries = useCallback((data: TBLFormData) => {
    const entries = Object.entries(data || {});
    for (const [key, value] of entries) {
      // Ignorer les clés techniques
      if (!key || key.startsWith('__')) continue;
      // Ignorer les vides
      if (value === null || value === undefined) continue;
      if (typeof value === 'string' && value.trim() === '') continue;
      if (Array.isArray(value) && value.length === 0) continue;
      return true;
    }
    return false;
  }, []);

  const stripRevisionSuffix = useCallback((name: string) => {
    return String(name || '').replace(/\s*-\s*\d+\s*$/g, '').trim();
  }, []);

  const generateNextRevisionName = useCallback(async (rootName: string, currentLeadId: string) => {
    if (!api) return `${rootName} -1`;
    const normalizedRoot = stripRevisionSuffix(rootName) || 'Devis';

    const response = await api.get(`/api/treebranchleaf/submissions?leadId=${currentLeadId}&status=completed`);
    const existingSubmissions = (response as any)?.data || response || [];
    const existingNames = (Array.isArray(existingSubmissions) ? existingSubmissions : [])
      .map((s: any) => s?.summary?.name || s?.name || '')
      .filter((n: string) => typeof n === 'string' && n.trim());

    const escapedRoot = normalizedRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^${escapedRoot}\\s*-\\s*(\\d+)$`);
    let max = 0;
    for (const name of existingNames) {
      const m = String(name).match(re);
      if (m?.[1]) {
        const n = Number(m[1]);
        if (Number.isFinite(n) && n > max) max = n;
      }
    }
    return `${normalizedRoot} -${max + 1}`;
  }, [api, stripRevisionSuffix]);

  // Dès la 1ère modification d'un devis enregistré: préparer un nom -N (UI seulement, pas de persistance).
  const planPendingRevisionName = useCallback(async (root: string, currentLeadId: string, currentSubmissionId: string | null) => {
    if (!root || !currentLeadId) return;
    // Éviter de recalculer si déjà planifié pour ce devis
    if (pendingRevisionForSubmissionIdRef.current && pendingRevisionForSubmissionIdRef.current === currentSubmissionId && pendingRevisionName) {
      return;
    }
    try {
      const next = await generateNextRevisionName(root, currentLeadId);
      // Gardes: si on a changé de devis entre-temps, ne pas écraser.
      if (pendingRevisionForSubmissionIdRef.current && pendingRevisionForSubmissionIdRef.current !== currentSubmissionId) {
        return;
      }
      pendingRevisionForSubmissionIdRef.current = currentSubmissionId;
      setPendingRevisionName(next);
      setDevisName(next);
    } catch (e) {
      if (isVerbose()) console.warn('⚠️ [TBL] Impossible de préparer le nom de révision:', e);
    }
  }, [generateNextRevisionName, pendingRevisionName]);

  // Dès la 1ère modification d'un devis enregistré: créer la révision en base (status=completed)
  // puis continuer à écraser cette révision au fil de l'eau (autosave).
  const ensureCompletedRevisionExists = useCallback(async (nextData: TBLFormData) => {
    if (!api || !effectiveTreeId) return;
    if (!isDevisSaved) return;
    if (!leadId) return;
    if (!submissionId) return;
    // Ne créer une copie que si on édite un devis enregistré "original".
    if (hasCopiedDevis) return;

    if (revisionCreateInFlightRef.current) return;
    if (revisionCreatedFromSubmissionIdRef.current === submissionId) return;

    revisionCreateInFlightRef.current = true;
    try {
      const root = revisionRootName || stripRevisionSuffix(originalDevisName || devisName || 'Devis');
      const planned = pendingRevisionName || await generateNextRevisionName(root, leadId);

      const changedFieldId = lastRealChangedFieldIdRef.current || 'NULL';
      const resp = await api.post('/api/tbl/submissions/create-and-evaluate', {
        treeId: effectiveTreeId,
        clientId: leadId,
        formData: normalizePayload(nextData),
        status: 'completed',
        providedName: planned,
        forceNewSubmission: true,
        changedFieldId,
        evaluationMode: 'open'  // ✅ TOUJOURS recalculer TOUS les display fields (comme brouillon)
      });

      const newId = (resp as any)?.submission?.id;
      if (!newId) return;

      // 🔥 FIX 30/01/2026: Marquer que le submissionId vient de changer
      // Les prochains appels dans les 3 secondes utiliseront mode='open'
      submissionIdJustChangedUntilRef.current = Date.now() + 3000;
      console.log(`🔄 [TBL] Révision créée → forcer mode='open' pendant 3s`);

      // Basculer l'éditeur sur la révision (on n'écrase plus jamais l'original)
      revisionCreatedFromSubmissionIdRef.current = submissionId;
      setSubmissionId(newId);
      setHasCopiedDevis(true);
      setIsLoadedDevis(true);
      setIsDefaultDraft(false);
      setIsDevisSaved(true);
      setDevisName(planned);

      // Signature: cette révision est désormais la version "sauvegardée" courante
      try {
        const sig = computeSignature(normalizePayload(nextData));
        lastSavedSignatureRef.current = sig;
      } catch { /* noop */ }
    } catch (e) {
      console.warn('⚠️ [TBL] Échec création révision -1 en base:', e);
    } finally {
      revisionCreateInFlightRef.current = false;
    }
  }, [api, effectiveTreeId, isDevisSaved, leadId, submissionId, hasCopiedDevis, revisionRootName, originalDevisName, devisName, pendingRevisionName, stripRevisionSuffix, generateNextRevisionName, normalizePayload, computeSignature]);

  const persistCompletedRevisionIfDirty = useCallback(async (reason: string) => {
    if (!api || !effectiveTreeId) return;
    if (!isDevisSaved || !isCompletedDirty) return;
    if (!leadId) {
      console.warn('⚠️ [TBL] Revision impossible (leadId manquant)');
      return;
    }

    const root = revisionRootName || stripRevisionSuffix(originalDevisName || devisName || 'Devis');
    const nextName = pendingRevisionName || await generateNextRevisionName(root, leadId);

    console.log(`💾 [TBL] Versioning: création '${nextName}' (${reason})`);
    const resp = await api.post('/api/tbl/submissions/create-and-evaluate', {
      treeId: effectiveTreeId,
      clientId: leadId,
      formData: normalizePayload(formData),
      status: 'completed',
      providedName: nextName,
      forceNewSubmission: true,
      changedFieldId: 'NULL',
      evaluationMode: 'open'  // ✅ Recalcul complet des DISPLAY pour l'enregistrement
    });

    const newId = (resp as any)?.submission?.id;
    if (newId) {
      setSubmissionId(newId);
      setDevisName(nextName);
      setOriginalDevisId(newId);
      setOriginalDevisName(root);
      setRevisionRootName(root);
      setIsCompletedDirty(false);
      setPendingRevisionName(null);
      pendingRevisionForSubmissionIdRef.current = null;
      setIsLoadedDevis(true);
      setIsDevisSaved(true);
      setIsDefaultDraft(false);
      try {
        const sig = computeSignature(normalizePayload(formData));
        lastSavedSignatureRef.current = sig;
      } catch { /* noop */ }
    }
  }, [api, effectiveTreeId, isDevisSaved, isCompletedDirty, leadId, revisionRootName, stripRevisionSuffix, originalDevisName, devisName, generateNextRevisionName, pendingRevisionName, normalizePayload, formData, computeSignature]);

  useEffect(() => {
    if (!effectiveTreeId) return;
    try {
      window.__TBL_LAST_TREE_ID = effectiveTreeId;
    } catch {
      // ignore
    }
  }, [effectiveTreeId]);
  
  // 🔥 DEBUG TEMPORAIRE: Vérifier si rawNodes est peuplé
  console.log('[TBL] 🔥 DEBUG rawNodes:', {
    useFixed,
    rawNodesLength: rawNodes.length,
    oldDataRawNodesLength: oldData.rawNodes?.length || 0,
    newDataRawNodesLength: newData.rawNodes?.length || 0,
    oldDataLoading: oldData.loading,
    newDataLoading: newData.loading,
    rawNodesSample: rawNodes.slice(0, 3).map(n => ({ id: n.id, type: n.type, label: n.label, parentId: n.parentId }))
  });

  // 🎯 Hook de validation pour les onglets et champs obligatoires
  const { validationState, actions: validationActions } = useTBLValidation({
    tabs: tabs || [],
    fieldValues: formData
  });

  // 🎯 Contexte de validation simple
  const { isValidation, startValidation, stopValidation } = useTBLValidationContext();



  // Diff structurel (verbose uniquement)
  useEffect(() => {
    if (!isVerbose()) return;
    if (!oldData.tabs.length || !newData.tabs.length) return;
    try {
      const oldSummary = oldData.tabs.map(t => ({ id: t.id, sections: t.sections.length, fields: t.sections.reduce((a,s)=>a+s.fields.length,0) }));
      const newSummary = newData.tabs.map(t => ({ id: t.id, sections: t.sections.length, fields: t.sections.reduce((a,s)=>a+s.fields.length,0) }));
      dlog('[TBL MIGRATION] Diff tabs count old vs new', { old: oldSummary.length, new: newSummary.length });
      dlog('[TBL MIGRATION] Details old', oldSummary);
      dlog('[TBL MIGRATION] Details new', newSummary);
      const oldFieldIds = new Set<string>();
      oldData.tabs.forEach(t=>t.sections.forEach(s=>s.fields.forEach(f=>oldFieldIds.add(f.id))));
      const newFieldIds = new Set<string>();
      newData.tabs.forEach(t=>t.sections.forEach(s=>s.fields.forEach(f=>newFieldIds.add(f.id))));
      const missingInNew = [...oldFieldIds].filter(id=>!newFieldIds.has(id));
      const newOnly = [...newFieldIds].filter(id=>!oldFieldIds.has(id));
      if (missingInNew.length) dlog('[TBL MIGRATION] Champs manquants dans nouveau hook', missingInNew.slice(0,50));
      if (newOnly.length) dlog('[TBL MIGRATION] Nouveaux champs uniquement dans nouveau hook', newOnly.slice(0,50));
    } catch(e){
      dlog('[TBL MIGRATION] Diff error', e);
    }
  }, [oldData.tabs, newData.tabs]);
  const {
    saving,
    saveAsDevis
  } = useTBLSave();
  const { isSuperAdmin, userRole, user, organization } = useAuth();
  // const { enqueue } = useEvalBridge(); // (actuellement non utilisé dans cette version de l'écran)

  // 🆕 SYSTÈME DEVIS PAR DÉFAUT
  // ID fixe pour le devis par défaut de l'utilisateur (simulation sans lead)
  const defaultDraftId = useMemo(() => {
    if (!user?.id || !effectiveTreeId) return null;
    return `default-draft-${user.id}-${effectiveTreeId}`;
  }, [user?.id, effectiveTreeId]);

  // 🆕 Initialiser ou charger le devis par défaut au montage (si pas de lead)
  useEffect(() => {
    const initDefaultDraft = async () => {
      console.log('🔍 [TBL] initDefaultDraft check:', { leadId, api: !!api, effectiveTreeId, defaultDraftId, isGlobalDraftMode, userId: user?.id });
      
      // Ne pas initialiser si on a un lead ou si pas d'API
      if (!api || !effectiveTreeId || !defaultDraftId || !isGlobalDraftMode) {
        console.log('⏭️ [TBL] initDefaultDraft skip - conditions not met');
        return;
      }

      if (!isDefaultDraft) {
        setIsDefaultDraft(true);
      }
      
      console.log('📋 [TBL] Mode simulation - Recherche/création du devis par défaut');
      
      try {
        // Essayer de récupérer le draft par défaut existant
        const url = `/api/treebranchleaf/submissions?treeId=${effectiveTreeId}&status=default-draft&userId=${user?.id}`;
        console.log('🔎 [TBL] Fetching drafts:', url);
        const existingDrafts = await api.get(url);
        console.log('📦 [TBL] existingDrafts response:', existingDrafts);
        
        const draftsArray = Array.isArray(existingDrafts) ? existingDrafts : existingDrafts?.data || [];
        console.log('📦 [TBL] draftsArray:', draftsArray.length, 'items');
        
        const defaultDraft = draftsArray.find((d: { id?: string, status?: string }) => d.status === 'default-draft');
        console.log('🎯 [TBL] defaultDraft found:', defaultDraft?.id);
        
        if (defaultDraft && defaultDraft.id) {
          console.log('✅ [TBL] Devis par défaut trouvé:', defaultDraft.id);
          setSubmissionId(defaultDraft.id);
          setDevisName('Brouillon');
          
          // Charger les données du draft depuis TreeBranchLeafSubmissionData
          try {
            const submissionDataResponse = await api.get(`/api/treebranchleaf/submissions/${defaultDraft.id}/fields`);
            console.log('📥 [TBL] submissionDataResponse:', submissionDataResponse);
            const fieldsMap = submissionDataResponse?.fields || {};
            console.log('📥 [TBL] fieldsMap keys:', Object.keys(fieldsMap));

            // ⚠️ Sécurité: le brouillon GLOBAL (default-draft) ne doit jamais être associé à un lead.
            // Si on détecte un leadId, c'est un reliquat d'un ancien comportement -> on détache côté DB.
            if (submissionDataResponse?.leadId) {
              console.warn('⚠️ [TBL] default-draft était associé à un lead; détachement automatique', {
                draftId: defaultDraft.id,
                leadId: submissionDataResponse.leadId
              });
              try {
                await api.patch(`/api/treebranchleaf/submissions/${defaultDraft.id}`, { clientId: null });
              } catch (e) {
                console.warn('⚠️ [TBL] Impossible de détacher le default-draft du lead:', e);
              }
            }
            
            if (Object.keys(fieldsMap).length > 0) {
              const restoredData: Record<string, string> = {};
              
              Object.entries(fieldsMap).forEach(([nodeId, fieldData]: [string, unknown]) => {
                const field = fieldData as { value?: unknown; rawValue?: string; calculatedBy?: string };
                console.log(`📥 [TBL] Field ${nodeId}:`, { calculatedBy: field.calculatedBy, rawValue: field.rawValue, value: field.value });
                // Ne restaurer que les valeurs entrées par l'utilisateur.
                // Selon les versions, la saisie peut être taggée 'neutral' (legacy) ou 'field'/'fixed'.
                const src = typeof field.calculatedBy === 'string' ? field.calculatedBy.toLowerCase() : null;
                const isUserInput = !src || src === 'neutral' || src === 'field' || src === 'fixed';
                if (isUserInput && field.rawValue !== undefined && field.rawValue !== null) {
                  restoredData[nodeId] = String(field.rawValue);
                }
              });
              
              console.log('📥 [TBL] Données à restaurer:', restoredData);
              if (Object.keys(restoredData).length > 0) {
                console.log('📥 [TBL] Données restaurées:', Object.keys(restoredData).length, 'champs');
                setFormData(prev => ({ ...prev, ...restoredData }));
              } else {
                console.warn('⚠️ [TBL] Aucune donnée neutral trouvée dans les champs');
              }
            } else {
              console.warn('⚠️ [TBL] fieldsMap vide');
            }
          } catch (loadError) {
            console.warn('⚠️ [TBL] Impossible de charger les données du draft:', loadError);
          }
        } else {
          console.log('📝 [TBL] Création du devis par défaut...');
          // Créer un nouveau draft par défaut
          const response = await api.post('/api/tbl/submissions/create-and-evaluate', {
            treeId: effectiveTreeId,
            formData: {},
            status: 'default-draft',
            providedName: 'Simulation (devis par défaut)'
          });
          
          if (response?.submission?.id) {
            setSubmissionId(response.submission.id);
            setDevisName('Brouillon');
            console.log('✅ [TBL] Devis par défaut créé:', response.submission.id);
          }
        }
      } catch (error) {
        console.warn('⚠️ [TBL] Impossible d\'initialiser le devis par défaut:', error);
        // Mode fallback: on continue sans draft persistant
        setDevisName('Brouillon');
      }
    };
    
    initDefaultDraft();
  }, [leadId, api, effectiveTreeId, defaultDraftId, isGlobalDraftMode, user?.id]);

  // 🧷 Initialiser le brouillon du lead quand on ouvre /tbl/:leadId
  // Règle: chaque lead a son propre brouillon persistant (status=draft) même si on ne "enregistre" pas.
  useEffect(() => {
    const initLeadDraftFromUrl = async () => {
      if (!api || !effectiveTreeId) return;
      if (!urlLeadId) {
        if (isLoadingLead) setIsLoadingLead(false);
        return;
      }
      if (!isLoadingLead) return;

      const effectiveLeadId = urlLeadId;
      try {
        // 1) Charger les infos du lead (header)
        try {
          const response = await api.get(`/api/leads/${effectiveLeadId}`);
          const lead = (response as any)?.success ? (response as any)?.data : response;
          if (lead && (lead as any).id) {
            setClientData({
              id: (lead as any).id,
              name: `${(lead as any).firstName || ''} ${(lead as any).lastName || ''}`.trim() || (lead as any).company || 'Lead sans nom',
              email: (lead as any).email || '',
              phone: (lead as any).phone || (lead as any).phoneNumber || (lead as any).phoneHome || '',
              address: formatAddressValue((lead as any).fullAddress ?? (lead as any).address ?? (lead as any).data?.address ?? '')
            });
          }
        } catch (e) {
          console.warn('⚠️ [TBL] Impossible de charger le lead (header):', e);
        }

        // 2) Récupérer/créer le brouillon du lead
        let leadDraftId: string | null = null;
        try {
          const existing = await api.get(`/api/treebranchleaf/submissions?treeId=${effectiveTreeId}&leadId=${effectiveLeadId}&status=draft`);
          const draftsArray = Array.isArray(existing) ? existing : (existing as any)?.data || [];
          leadDraftId = (draftsArray as Array<{ id?: string }>)[0]?.id || null;
        } catch (e) {
          console.warn('⚠️ [TBL] Impossible de lister les brouillons du lead:', e);
        }

        if (!leadDraftId) {
          const created = await api.post('/api/tbl/submissions/create-and-evaluate', {
            treeId: effectiveTreeId,
            clientId: effectiveLeadId,
            formData: {},
            status: 'draft',
            providedName: 'Brouillon',
            changedFieldId: 'NULL',
            evaluationMode: 'open'  // 🎯 Forcer recalcul complet des DISPLAY
          });
          leadDraftId = (created as any)?.submission?.id || null;
        }

        // 3) Mettre TBL en mode brouillon lead + restaurer les champs
        setLeadId(effectiveLeadId);
        setIsDefaultDraft(false);
        setIsDevisSaved(false);
        setIsLoadedDevis(false);
        setOriginalDevisId(null);
        setOriginalDevisName(null);
        setHasCopiedDevis(false);
        setIsCompletedDirty(false);
        setRevisionRootName(null);
        setDevisName('Brouillon');
        setSubmissionId(leadDraftId);

        if (leadDraftId) {
          try {
            const submissionDataResponse = await api.get(`/api/treebranchleaf/submissions/${leadDraftId}/fields`);
            const fieldsMap = (submissionDataResponse as any)?.fields || {};
            const restoredData: Record<string, string> = {};
            Object.entries(fieldsMap).forEach(([nodeId, fieldData]: [string, any]) => {
              const src = typeof fieldData?.calculatedBy === 'string' ? fieldData.calculatedBy.toLowerCase() : null;
              const isUserInput = !src || src === 'neutral' || src === 'field' || src === 'fixed';
              if (isUserInput && fieldData?.rawValue !== undefined && fieldData?.rawValue !== null) {
                restoredData[nodeId] = String(fieldData.rawValue);
              }
            });

            setFormData((prev) => {
              const kept: TBLFormData = {};
              Object.keys(prev || {}).forEach((k) => {
                if (k.startsWith('__')) kept[k] = prev[k];
              });
              return { ...kept, ...restoredData, __leadId: effectiveLeadId };
            });
          } catch (e) {
            console.warn('⚠️ [TBL] Impossible de restaurer le brouillon du lead:', e);
          }
        }

        lastSavedSignatureRef.current = null;
        lastQueuedSignatureRef.current = null;
      } finally {
        setIsLoadingLead(false);
      }
    };

    initLeadDraftFromUrl();
  }, [api, effectiveTreeId, urlLeadId, isLoadingLead]);

  // SYNCHRONISATION: Initialiser formData avec les mirrors créés par useTBLDataPrismaComplete
  useEffect(() => {
    if (typeof window !== 'undefined' && window.TBL_FORM_DATA && Object.keys(window.TBL_FORM_DATA).length > 0) {
      const globalData = window.TBL_FORM_DATA;
      const mirrorKeys = Object.keys(globalData).filter(k => k.startsWith('__mirror_data_'));
      
      if (mirrorKeys.length > 0) {
        setFormData(prev => {
          const next = { ...prev };
          let syncCount = 0;
          
          // Copier tous les mirrors depuis window.TBL_FORM_DATA
          mirrorKeys.forEach(key => {
            if (!(key in next)) {
              next[key] = globalData[key];
              syncCount++;
            }
          });
          
          // Copier aussi les données non-mirror qui ne sont pas dans formData
          Object.keys(globalData).forEach(key => {
            if (!key.startsWith('__mirror_data_') && !(key in next)) {
              next[key] = globalData[key];
              syncCount++;
            }
          });
          
          if (syncCount > 0) {
            // console.log(`✅ [SYNC] ${syncCount} éléments synchronisés vers FormData`);
          }
          
          return next;
        });
      }
    }
  }, [oldData.tabs, newData.tabs]); // Se relance quand les données du hook changent

  // Définir l'onglet actif par défaut
  useEffect(() => {
    if (tabs.length > 0 && !activeTab) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  // Auto-sauvegarde toutes les 30 secondes (déplacée plus bas après scheduleAutosave)

  // Calculer les statistiques globales
  const globalStats = useMemo(() => {
    let totalFields = 0;
    let requiredFields = 0;
    let completedRequired = 0;

    const countFieldsInSections = (sections: TBLSection[]) => {
      sections.forEach(section => {
        totalFields += section.fields.length;
        requiredFields += section.fields.filter(f => f.required).length;
        completedRequired += section.fields.filter(f => {
          if (!f.required) return false;
          const value = formData[f.id];
          return value !== undefined && value !== null && value !== '';
        }).length;

        // Récursif pour les sous-sections
        if (section.subsections) {
          countFieldsInSections(section.subsections);
        }
      });
    };

    tabs.forEach(tab => {
      // Champs dans les sections de cet onglet
      countFieldsInSections(tab.sections);
    });

    return {
      totalTabs: tabs.length,
      totalFields,
      requiredFields,
      completedRequired,
      completion: requiredFields ? (completedRequired / requiredFields) * 100 : 100
    };
  }, [tabs, formData]);

  // 🔄 SWIPE NAVIGATION - État pour stocker les sous-onglets de chaque onglet
  const [tabSubTabsMap, setTabSubTabsMap] = useState<Record<string, { key: string; label: string }[]>>({});
  
  // Callback pour recevoir les sous-onglets calculés de chaque onglet
  const handleSubTabsComputed = useCallback((tabId: string, subTabs: { key: string; label: string }[]) => {
    setTabSubTabsMap(prev => {
      // Éviter les mises à jour inutiles
      const current = prev[tabId];
      if (current && JSON.stringify(current) === JSON.stringify(subTabs)) {
        return prev;
      }
      return { ...prev, [tabId]: subTabs };
    });
  }, []);

  // Construire la structure des onglets pour le swipe
  const swipeTabsStructure = useMemo(() => {
    return (tabs || []).map(tab => ({
      id: tab.id,
      label: tab.label || tab.name || tab.id,
      subTabs: tabSubTabsMap[tab.id] || []
    }));
  }, [tabs, tabSubTabsMap]);

  // Callback pour changer de sous-onglet depuis le swipe
  const handleSwipeSubTabChange = useCallback((tabId: string, subTabKey: string | undefined) => {
    setActiveSubTabs(prev => ({ ...prev, [tabId]: subTabKey }));
  }, []);

  // Sous-onglets de l'onglet actif (pour le hook de swipe)
  const currentTabSubTabs = useMemo(() => {
    return tabSubTabsMap[activeTab] || [];
  }, [tabSubTabsMap, activeTab]);

  // 🔄 Hook de navigation par swipe (mobile uniquement)
  const { getNavigationInfo, navigateToIndex } = useTBLSwipeNavigation({
    containerRef: tblSwipeContainerRef,
    tabs: swipeTabsStructure,
    activeTab,
    setActiveTab,
    activeSubTabs,
    setActiveSubTab: handleSwipeSubTabChange,
    currentTabSubTabs,
    isMobile
  });

  // Info de navigation pour l'indicateur visuel
  const swipeNavInfo = useMemo(() => getNavigationInfo(), [getNavigationInfo]);

  // Gestionnaire de changement de champ avec validation
  // Type minimal interne pour compléter dynamiquement la config
  interface DynamicFieldConfig {
    id: string;
    code: string;
    label: string;
    type: string;
    unit?: string;
    validation?: { min?: number; max?: number; minLength?: number; maxLength?: number; pattern?: string };
    options?: { label: string; value: string }[];
  }
  interface MinimalFieldConfig { id: string; code: string; label: string; type: string; }

  // (plus de création automatique de brouillon ici — la création est explicite via "Créer le devis")

  const buildPreviewPayload = useCallback((data: TBLFormData) => {
    const clean: Record<string, unknown> = {};
    Object.entries(data || {}).forEach(([key, value]) => {
      if (key.startsWith('__mirror_')) return;
      clean[key] = value;
    });
    return clean;
  }, []);

  const broadcastCalculatedRefresh = useCallback((detail?: Record<string, unknown>) => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      // 🎯 FIX RACE CONDITION: Extraire les valeurs calculées de la réponse
      // pour les passer directement dans l'événement au lieu de refetch
      const calculatedValuesMap: Record<string, unknown> = {};
      const submissionDataArray = detail?.submissionData as Array<{nodeId?: string; value?: unknown}> | undefined;
      if (submissionDataArray && Array.isArray(submissionDataArray)) {
        for (const item of submissionDataArray) {
          // 🔥 FIX 30/01/2026: Exclure les valeurs null pour éviter d'écraser les valeurs existantes
          // Quand un display field est skippé par le trigger filter, sa valeur en base peut être null
          // mais on ne veut PAS écraser la valeur affichée actuellement
          if (item?.nodeId && item?.value !== undefined && item?.value !== null) {
            calculatedValuesMap[item.nodeId] = item.value;
          }
        }
        console.log(`📤 [TBL] Broadcasting ${Object.keys(calculatedValuesMap).length} valeurs calculées inline (nulls exclus)`);
        // 🔍 DEBUG GRD: Vérifier si GRD est dans le broadcast
        const GRD_ID = '9f27d411-6511-487c-a983-9f9fc357c560';
        if (calculatedValuesMap[GRD_ID]) {
          console.log(`✅ [TBL] GRD dans broadcast: "${calculatedValuesMap[GRD_ID]}"`);
        } else {
          console.log(`❌ [TBL] GRD ABSENT du broadcast !`);
        }
        
        // 🔗🔗🔗 FIX CRITIQUE: Injecter les valeurs calculées (Link, DISPLAY, etc.) dans TBL_FORM_DATA
        // Sans cela, TBLFieldRendererAdvanced ne voit pas les valeurs Link dans formData
        if (typeof window !== 'undefined' && window.TBL_FORM_DATA) {
          for (const [nodeId, value] of Object.entries(calculatedValuesMap)) {
            window.TBL_FORM_DATA[nodeId] = value;
          }
          console.log(`🔗 [FIX] Injecté ${Object.keys(calculatedValuesMap).length} valeurs calculées dans TBL_FORM_DATA`);
        }
      }
      
      window.dispatchEvent(new CustomEvent('tbl-force-retransform', {
        detail: {
          source: 'autosave',
          submissionId,
          treeId: tree?.id,
          timestamp: Date.now(),
          skipFormReload: true,
          // 🎯 Passer les valeurs calculées directement pour éviter le refetch
          calculatedValues: calculatedValuesMap,
          ...(detail || {})
        }
      }));
      
      // 🎯 FIX DONNÉES FANTÔMES: Débloquer les GET maintenant que les valeurs inline ont été broadcastées
      // Note: La protection inline (protectInlineValue) dans useNodeCalculatedValue protège déjà
      // les champs qui ont reçu une valeur via broadcast contre les GET obsolètes
      unblockGetRequests();
    } catch (err) {
      console.warn('⚠️ [TBL][AUTOSAVE] Dispatch tbl-force-retransform échoué', err);
      // Débloquer aussi en cas d'erreur pour éviter un blocage permanent
      unblockGetRequests();
    }
  }, [submissionId, tree?.id]);

  // Prévisualisation sans écriture (aucune création/MAJ en base)
  // ❌ DÉSACTIVÉ : Cet appel se déclenchait à CHAQUE frappe et causait des re-rendus massifs !
  const previewNoSave = useCallback(async (_data: TBLFormData) => {
    try {
      if (!api || !tree) return;
      // const formData = normalizePayload(data);
      // await api.post('/api/tbl/submissions/preview-evaluate', {
      //   treeId: tree.id,
      //   formData
      // });
    } catch (e) {
      if (isVerbose()) console.warn('⚠️ [TBL][PREVIEW] Échec preview-evaluate', e);
    }
  }, [api, tree]);

  // Empêche les POST create-and-evaluate concurrents (ordre / charge).
  // On garde uniquement le dernier état à envoyer si une requête est déjà en vol.
  const autosaveInFlightRef = useRef(false);
  const pendingAutosaveRef = useRef<{ data: TBLFormData; changedField?: string } | null>(null);
  const autosaveSuspendedRef = useRef(false);
  const lastRealChangedFieldIdRef = useRef<string | undefined>(undefined);

  const waitForAutosaveIdle = useCallback(async (timeoutMs: number = 5000) => {
    const start = Date.now();
    while (autosaveInFlightRef.current) {
      if (Date.now() - start > timeoutMs) {
        break;
      }
      await new Promise((r) => setTimeout(r, 25));
    }
  }, []);

  // Helper: exécution de l'autosave (PUT)
  const doAutosave = useCallback(async (data: TBLFormData, changedField?: string) => {
    if (!api || !tree) return;

    // 🎯 FIX DONNÉES FANTÔMES: Bloquer les GET dès qu'un changement utilisateur est détecté
    // Les valeurs correctes arriveront via broadcastCalculatedRefresh avec les valeurs inline
    const isRealUserChange = Boolean(changedField && changedField !== 'NULL');
    if (isRealUserChange) {
      blockGetRequestsTemporarily(1500); // Bloquer pendant 1.5 secondes - équilibre entre réactivité et fiabilité
    }

    // ✅ Devis enregistrés: on n'écrit PAS au fil de l'eau, SAUF si on est en train d'éditer une révision (-N)
    // déjà créée (hasCopiedDevis=true). Dans ce cas, on écrase la révision au fil de l'eau.
    // 🔧 IMPORTANT: si l'utilisateur modifie un devis enregistré (changedField réel),
    // on DOIT laisser passer l'appel: le backend gère le versioning (clone vers une révision) et renvoie un nouveau submissionId.
    // On continue à bloquer les autosaves périodiques (changedField='NULL') pour éviter de créer une révision sans action utilisateur.
    if (isDevisSaved && !hasCopiedDevis) {
      if (!isRealUserChange) return;
    }

    // ✅ Garde-fou: certaines actions UI (ex: "Nouveau devis") réinitialisent le formData.
    // On suspend l'autosave pour éviter d'écraser un devis enregistré (submissionId précédent)
    // avec un payload vide avant que le state React ne bascule sur le brouillon.
    if (autosaveSuspendedRef.current) {
      return;
    }

    if (autosaveInFlightRef.current) {
      pendingAutosaveRef.current = { data, changedField };
      return;
    }

    try {
      autosaveInFlightRef.current = true;
      setIsAutosaving(true);
      // Normaliser et calculer signature
      const formData = normalizePayload(data);
      const sig = computeSignature(formData);
      // Anti-doublons: si déjà envoyé/sauvé, on ne renvoie pas
      if (lastSavedSignatureRef.current === sig || lastQueuedSignatureRef.current === sig) {
        if (isVerbose()) // console.log('[TBL][AUTOSAVE] No-op (signature identique)');
        return;
      }
      lastQueuedSignatureRef.current = sig;

      if (!submissionId) {
        // ✅ Brouillon global (default-draft): persistant sans lead.
        if (isDefaultDraft) {
          const evaluationResponse = await api.post('/api/tbl/submissions/create-and-evaluate', {
            treeId: effectiveTreeId || tree.id,
            formData,
            clientId: null,
            status: 'default-draft',
            providedName: 'Brouillon',
            changedFieldId: changedField
            // Mode par défaut ('change') = rapide, recalcule seulement les champs concernés
          });

          const createdOrReusedId = evaluationResponse?.submission?.id;
          if (createdOrReusedId) {
            setSubmissionId(createdOrReusedId);
            setDevisName('Brouillon');

            console.log(`🎯 [TBL] changedFieldId envoyé au backend: "${changedField || 'NULL'}"`);
            lastSavedSignatureRef.current = sig;
            setAutosaveLast(new Date());
            // 🚀 FIX: Ne pas broadcast si autosave périodique OU si une requête pendante existe OU si un debounce est actif
            // Une requête pendante = l'utilisateur a changé à nouveau pendant qu'on sauvegardait
            // Un debounce actif = un nouveau changement est en attente des 80ms avant d'être envoyé
            // La prochaine requête fera son propre broadcast avec les données à jour
            const isPeriodicAutosave = !changedField || changedField === 'NULL';
            const hasPendingRequest = !!pendingAutosaveRef.current;
            const hasDebounceActive = !!debounceActiveRef.current;
            if (!isPeriodicAutosave && !hasPendingRequest && !hasDebounceActive) {
              broadcastCalculatedRefresh({
                reason: 'create-and-evaluate',
                evaluatedSubmissionId: createdOrReusedId,
                recalcCount: evaluationResponse?.submission?.TreeBranchLeafSubmissionData?.length,
                // 🎯 FIX: Passer les valeurs calculées pour éviter le refetch race condition
                submissionData: evaluationResponse?.submission?.TreeBranchLeafSubmissionData
              });
            } else if (hasDebounceActive) {
              console.log(`🔒 [TBL] Broadcast SKIP: debounce actif (nouveau changement en attente)`);
            }
          } else {
            // Fallback: si on n'a pas d'ID, on ne peut pas persister.
            await previewNoSave(data);
            // 🚀 FIX: preview-no-save ne déclenche pas de broadcast non plus
            // broadcastCalculatedRefresh({ reason: 'preview-no-save' });
          }
        } else if (leadId) {
          // ✅ Brouillon de lead (draft): persistant et lié au lead.
          const evaluationResponse = await api.post('/api/tbl/submissions/create-and-evaluate', {
            treeId: effectiveTreeId || tree.id,
            formData,
            clientId: leadId,
            status: 'draft',
            providedName: 'Brouillon',
            changedFieldId: changedField
            // Mode par défaut ('change') = rapide, recalcule seulement les champs concernés
          });

          const createdOrReusedId = evaluationResponse?.submission?.id;
          if (createdOrReusedId) {
            setSubmissionId(createdOrReusedId);
            setDevisName('Brouillon');
            lastSavedSignatureRef.current = sig;
            setAutosaveLast(new Date());
            // 🚀 FIX: Ne pas broadcast si autosave périodique OU si une requête pendante existe OU si un debounce est actif
            const isPeriodicAutosave = !changedField || changedField === 'NULL';
            const hasPendingRequest = !!pendingAutosaveRef.current;
            const hasDebounceActive = !!debounceActiveRef.current;
            if (!isPeriodicAutosave && !hasPendingRequest && !hasDebounceActive) {
              broadcastCalculatedRefresh({
                reason: 'create-and-evaluate',
                evaluatedSubmissionId: createdOrReusedId,
                recalcCount: evaluationResponse?.submission?.TreeBranchLeafSubmissionData?.length,
                // 🎯 FIX: Passer les valeurs calculées pour éviter le refetch race condition
                submissionData: evaluationResponse?.submission?.TreeBranchLeafSubmissionData
              });
            } else if (hasDebounceActive) {
              console.log(`🔒 [TBL] Broadcast SKIP: debounce actif (nouveau changement en attente)`);
            }
          } else {
            await previewNoSave(data);
            // 🚀 FIX: preview-no-save ne déclenche pas de broadcast non plus
            // broadcastCalculatedRefresh({ reason: 'preview-no-save' });
          }
        } else {
          // Aucun devis existant: uniquement prévisualiser (zéro écriture)
          await previewNoSave(data);
          // 🚀 FIX: preview-no-save ne déclenche pas de broadcast
          // broadcastCalculatedRefresh({ reason: 'preview-no-save' });
        }
      } else {
        // Devis existant: mise à jour idempotente
        // Pour un default-draft (mode brouillon), on garde ce status.
        // Pour une révision d'un devis enregistré, on écrit en status=completed.
        const effectiveStatus = isDefaultDraft ? 'default-draft' : (isDevisSaved ? 'completed' : 'draft');
        const effectiveClientId = isDefaultDraft ? null : leadId;
        
        // 🎯 MODE CENTRALISÉ:
        // - 'change': changement utilisateur → recalcul ciblé par triggers (RAPIDE)
        // - 'autosave': sauvegarde périodique → skip DISPLAY fields
        // - 'open': chargement initial OU après changement de submissionId OU clientId
        const isUserChange = changedField && changedField !== 'NULL';
        // 🔥 FIX 30/01/2026: Forcer mode='open' si le submissionId vient de changer
        const submissionIdJustChanged = Date.now() < submissionIdJustChangedUntilRef.current;
        // 🔥 FIX 01/02/2026: Forcer mode='open' si le clientId (leadId) a changé
        const clientIdJustChanged = effectiveClientId !== lastClientIdRef.current && effectiveClientId !== null;
        if (clientIdJustChanged) {
          console.log(`🔄 [TBL] ClientId changé: ${lastClientIdRef.current} → ${effectiveClientId}`);
          lastClientIdRef.current = effectiveClientId;
        }
        
        let effectiveMode: 'open' | 'change' | 'autosave' = isUserChange ? 'change' : 'autosave';
        if (submissionIdJustChanged || clientIdJustChanged) {
          effectiveMode = 'open';
          console.log(`🔄 [TBL] Mode forcé à 'open' car ${submissionIdJustChanged ? 'submissionId' : 'clientId'} a changé`);
        }
        
        const evaluationResponse = await api.post('/api/tbl/submissions/create-and-evaluate', {
          submissionId,
          formData,
          clientId: effectiveClientId,
          status: effectiveStatus,
          changedFieldId: changedField, // 🎯 Utiliser le paramètre direct au lieu de l'état React
          evaluationMode: effectiveMode // ✅ FIX: 'change' pour triggers, 'autosave' pour périodique, 'open' après changement submissionId/clientId
        });

        // ✅ Si le backend a créé une nouvelle révision (édition d'un devis completed), basculer automatiquement
        const returnedSubmissionId = evaluationResponse?.submission?.id;
        const effectiveSubmissionId = returnedSubmissionId || submissionId;
        if (returnedSubmissionId && returnedSubmissionId !== submissionId) {
          // 🔥 FIX 30/01/2026: Marquer que le submissionId vient de changer
          submissionIdJustChangedUntilRef.current = Date.now() + 3000;
          console.log(`🔄 [TBL] Backend a créé révision → forcer mode='open' pendant 3s`);
          
          setSubmissionId(returnedSubmissionId);
          setIsLoadedDevis(false);
          setOriginalDevisId(null);
          setOriginalDevisName(null);
          setHasCopiedDevis(true);
        }
        
        console.log(`🎯 [TBL] changedFieldId envoyé au backend: "${changedField || 'NULL'}"`);
        
        lastSavedSignatureRef.current = sig;
        setAutosaveLast(new Date());
        
        // 🚀 FIX: Ne PAS broadcast si:
        // 1. C'est un autosave périodique (changedField NULL) ET pas mode 'open' - backend ne recalcule pas
        // 2. Une requête pendante existe - elle fera son propre broadcast avec données à jour
        // 3. Un debounce est actif - un nouveau changement est en attente des 80ms
        // 🔥 FIX 01/02/2026: TOUJOURS broadcaster en mode 'open' car le backend recalcule TOUS les display fields
        const isPeriodicAutosave = !changedField || changedField === 'NULL';
        const isOpenMode = effectiveMode === 'open';
        const hasPendingRequest = !!pendingAutosaveRef.current;
        const hasDebounceActive = !!debounceActiveRef.current;
        const shouldBroadcast = (!isPeriodicAutosave || isOpenMode) && !hasPendingRequest && !hasDebounceActive;
        if (shouldBroadcast) {
          console.log(`📤 [TBL] Broadcast des valeurs calculées (mode=${effectiveMode}, isOpenMode=${isOpenMode})`);
          broadcastCalculatedRefresh({
            reason: 'create-and-evaluate',
            evaluatedSubmissionId: effectiveSubmissionId,
            recalcCount: evaluationResponse?.submission?.TreeBranchLeafSubmissionData?.length,
            // 🎯 FIX: Passer les valeurs calculées pour éviter le refetch race condition
            submissionData: evaluationResponse?.submission?.TreeBranchLeafSubmissionData
          });
        } else if (hasDebounceActive) {
          console.log(`🔒 [TBL] Broadcast SKIP: debounce actif (nouveau changement en attente)`);
        }
      }
    } catch (e) {
      // Discret: pas de toast pour éviter le spam, logs console seulement
      console.warn('⚠️ [TBL][AUTOSAVE] Échec autosave', e);
      // 🎯 FIX: Débloquer les GET en cas d'erreur
      unblockGetRequests();
    } finally {
      lastQueuedSignatureRef.current = null;
      setIsAutosaving(false);
      autosaveInFlightRef.current = false;
      
      // 🎯 FIX: Toujours débloquer les GET à la fin de l'autosave
      // (même si le broadcast a été skippé)
      unblockGetRequests();

      const pending = pendingAutosaveRef.current;
      if (pending) {
        pendingAutosaveRef.current = null;
        // Micro-coalescing: exécuter juste après la fin de la requête courante.
        setTimeout(() => {
          void doAutosave(pending.data, pending.changedField);
        }, 0);
      }
    }
  }, [api, tree, effectiveTreeId, normalizePayload, computeSignature, submissionId, leadId, isDefaultDraft, isDevisSaved, hasCopiedDevis, previewNoSave, broadcastCalculatedRefresh]);

  // Déclencheur INSTANTANÉ - appel direct sans délai artificiel
  const scheduleAutosave = useCallback((data: TBLFormData, changedField?: string) => {
    void doAutosave(data, changedField);
  }, [doAutosave]);

  // 🎯 Évaluation IMMÉDIATE sans aucun debounce
  useEffect(() => {
    if (!immediateEvaluateRef.current) {
      immediateEvaluateRef.current = (nextData: TBLFormData, changedField?: string) => {
        try {
          scheduleAutosaveRef.current(nextData, changedField);
        } catch {/* noop */}
        try {
          scheduleCapabilityPreviewRef.current(nextData);
        } catch {/* noop */}
      };
      console.log('🎯 [TBL] immediateEvaluateRef créé (ZERO debounce)');
    }
  }, []); // ✅ Deps vides = créé UNE SEULE FOIS

  // ⚡ Plus besoin de flush car évaluation déjà immédiate (pas de debounce à flusher)

  // Auto-sauvegarde toutes les 30 secondes (après scheduleAutosave pour éviter la TDZ)
  // 🔧 FIX: Utiliser une ref pour formData afin d'éviter de recréer l'intervalle à chaque changement
  const formDataRef = useRef<TBLFormData>(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);
  
  useEffect(() => {
    if (!autoSaveEnabled || !tree) return;
    if (isDevisSaved && !hasCopiedDevis) return;

    const interval = setInterval(() => {
      // Vérifier que formData a des données avant de sauvegarder
      if (Object.keys(formDataRef.current).length === 0) return;
      // Réutiliser la même voie débouncée + garde-fous pour éviter les doublons
      scheduleAutosave(formDataRef.current, 'NULL');
    }, 30000);

    return () => clearInterval(interval);
  }, [autoSaveEnabled, tree, scheduleAutosave, isDevisSaved, hasCopiedDevis]);

  const previewEvaluateAndStore = useCallback(async (data: TBLFormData) => {
    if (!api || !tree?.id) return;

    // ✅ IMPORTANT: quand un devis existe déjà, l'autosave (create-and-evaluate)
    // fait déjà l'évaluation côté serveur. Le preview-evaluate en parallèle doublonne
    // les appels + les refresh et finit en 429.
    if (submissionId) {
      return;
    }
    try {
      const normalized = normalizePayload(data);
      const sig = computeSignature(normalized);
      if (lastPreviewSignatureRef.current === sig) {
        return;
      }
      lastPreviewSignatureRef.current = sig;
      const payload = buildPreviewPayload(data);
      await api.post('/api/tbl/submissions/preview-evaluate', {
        treeId: tree.id,
        formData: payload,
        baseSubmissionId: submissionId || undefined,
        leadId: leadId || undefined
      });
      
      // 🎯 NOUVEAU: Dispatcher un événement pour signaler la fin de l'évaluation
      window.dispatchEvent(new CustomEvent('tbl-evaluation-complete', { 
        detail: { reason: 'preview-evaluate', signature: sig } 
      }));
      
      broadcastCalculatedRefresh({ reason: 'preview-evaluate-live', signature: sig });
    } catch (err) {
      lastPreviewSignatureRef.current = null;
      
      // Dispatcher l'événement même en cas d'erreur pour décrémenter le compteur
      window.dispatchEvent(new CustomEvent('tbl-evaluation-complete', { 
        detail: { reason: 'preview-evaluate-error' } 
      }));
      
      if (isVerbose()) console.warn('⚠️ [TBL][PREVIEW] Échec preview-evaluate live', err);
    }
  }, [api, tree?.id, normalizePayload, computeSignature, buildPreviewPayload, submissionId, leadId, broadcastCalculatedRefresh]);

  const scheduleCapabilityPreview = useCallback((data: TBLFormData) => {
    if (!tree?.id) return;
    if (previewDebounceRef.current) {
      window.clearTimeout(previewDebounceRef.current);
    }
    previewDebounceRef.current = window.setTimeout(() => { void previewEvaluateAndStore(data); }, 600);
  }, [tree?.id, previewEvaluateAndStore]);

  // 🎯 FIX: Créer les refs APRÈS les déclarations (éviter TDZ - Temporal Dead Zone)
  const scheduleAutosaveRef = useRef(scheduleAutosave);
  const scheduleCapabilityPreviewRef = useRef(scheduleCapabilityPreview);

  // 🎯 FIX: Mettre à jour les refs quand les fonctions changent (toujours la dernière version)
  useEffect(() => {
    scheduleAutosaveRef.current = scheduleAutosave;
  }, [scheduleAutosave]);

  useEffect(() => {
    scheduleCapabilityPreviewRef.current = scheduleCapabilityPreview;
  }, [scheduleCapabilityPreview]);

  useEffect(() => {
    return () => {
      if (previewDebounceRef.current) {
        window.clearTimeout(previewDebounceRef.current);
      }
    };
  }, []);

  // 🔄 EXPOSITION DE LA FONCTION DE REFRESH POUR LES CHANGEMENTS D'APPARENCE
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.TBL_FORCE_REFRESH = () => {
        console.log('🔄 [TBL] Force refresh déclenché depuis Parameters');
        console.log('🔄 [TBL] useFixed:', useFixed);
        console.log('🔄 [TBL] newData.refetch:', typeof newData.refetch);
        console.log('🔄 [TBL] oldData.refetch:', typeof oldData.refetch);
        
        if (useFixed && newData.refetch) {
          console.log('🔄 [TBL] Appel de newData.refetch()');
          newData.refetch();
        } else if (!useFixed && oldData.refetch) {
          console.log('🔄 [TBL] Appel de oldData.refetch()');
          oldData.refetch();
        } else {
          console.warn('⚠️ [TBL] Aucune fonction refetch disponible !');
        }
      };
      // 🔎 Vérification rapide des champs conditionnels injectés par instance (original vs copies)
      (window as any).TBL_VERIFY_CONDITIONALS = () => {
        try {
          const nodes = Array.from(document.querySelectorAll('.conditional-field-injected')) as HTMLElement[];
          const items = nodes.map(n => ({
            parentFieldId: n.dataset.parentFieldId || 'unknown',
            parentOption: n.dataset.parentOptionValue || '',
            fieldId: n.dataset.fieldId || '',
            label: n.dataset.fieldLabel || ''
          }));
          const grouped: Record<string, { option: string; fields: { fieldId: string; label: string }[] }> = {};
          for (const it of items) {
            const key = `${it.parentFieldId}::${it.parentOption}`;
            if (!grouped[key]) grouped[key] = { option: it.parentOption, fields: [] } as any;
            grouped[key].fields.push({ fieldId: it.fieldId, label: it.label });
          }
          console.group('🧪 TBL VERIFY - Champs conditionnels injectés par parent');
          console.log('Total champs conditionnels visibles:', items.length);
          const parents = new Set(items.map(i => i.parentFieldId));
          console.log('Parents distincts (instances):', Array.from(parents));
          Object.entries(grouped).forEach(([key, group]) => {
            const [parentFieldId] = key.split('::');
            console.group(`Parent ${parentFieldId} (option="${group.option}")`);
            group.fields.forEach(f => console.log(`- ${f.label} [${f.fieldId}]`));
            console.groupEnd();
          });
          console.groupEnd();
          try { message.success(`Vérification: ${items.length} champs conditionnels, ${parents.size} parents distincts.`); } catch {/* noop */}
          return { count: items.length, parents: Array.from(parents), details: grouped };
        } catch (e) {
          console.error('❌ TBL VERIFY a échoué:', e);
          try { message.error('Vérification échouée (voir console)'); } catch {/* noop */}
          return null;
        }
      };
      
      // Debug helpers
      if (process.env.NODE_ENV === 'development') {
        (window as any).TBL_PRINT_NODE_METADATA = (nodeId?: string) => {
          try {
            const match = (rawNodes || []).find(n => n.id === nodeId);
            console.log('🔎 [TBL] node metadata for', nodeId, match?.metadata || match);
            return match?.metadata || match;
          } catch (e) { console.error('[TBL] TBL_PRINT_NODE_METADATA failed', e); }
          return null;
        };

        (window as any).TBL_PRINT_SECTION_METADATA = (tabId?: string, sectionId?: string) => {
          try {
            const sSet = (useFixed ? (newData.sectionsByTab || {}) : (oldData.sectionsByTab || {}));
            const sectionsList = Object.values(sSet).flat();
            const found = sectionsList.find((s: any) => s.id === sectionId);
            console.log('🔎 [TBL] section metadata for', sectionId, found?.metadata || found);
            return found?.metadata || found;
          } catch (e) { console.error('[TBL] TBL_PRINT_SECTION_METADATA failed', e); }
          return null;
        };
      }

      // Cleanup
      return () => {
        if (window.TBL_FORCE_REFRESH) {
          delete window.TBL_FORCE_REFRESH;
        }
        try { if ((window as any).TBL_VERIFY_CONDITIONALS) delete (window as any).TBL_VERIFY_CONDITIONALS; } catch {/* noop */}
        try { if ((window as any).TBL_PRINT_NODE_METADATA) delete (window as any).TBL_PRINT_NODE_METADATA; } catch {/* noop */}
        try { if ((window as any).TBL_PRINT_SECTION_METADATA) delete (window as any).TBL_PRINT_SECTION_METADATA; } catch {/* noop */}
      };
    }
  }, [useFixed, newData, oldData, rawNodes]);

  // 🆕 Générer un nom unique de devis en évitant les doublons (version useCallback)
  const generateUniqueDevisName = useCallback(async (baseName: string, currentLeadId: string): Promise<string> => {
    try {
      if (!api) return baseName;
      
      // Récupérer uniquement les devis enregistrés du lead (ne pas inclure le brouillon)
      const response = await api.get(`/api/treebranchleaf/submissions?leadId=${currentLeadId}&status=completed`);
      const existingSubmissions = response.data || response || [];
      
      // Extraire les noms existants
      const existingNames = (Array.isArray(existingSubmissions) ? existingSubmissions : []).map(
        (submission: { summary?: { name?: string }, name?: string }) => 
          submission.summary?.name || submission.name || ''
      ).filter((name: string) => name.trim() !== '');
      
      // Vérifier si le nom de base est unique
      if (!existingNames.includes(baseName)) {
        return baseName;
      }
      
      // Chercher le prochain numéro disponible
      let counter = 1;
      let uniqueName = `${baseName} (${counter})`;
      
      while (existingNames.includes(uniqueName) && counter < 1000) {
        counter++;
        uniqueName = `${baseName} (${counter})`;
      }
      
      return uniqueName;
    } catch (error) {
      console.error('❌ [TBL] Erreur lors de la génération du nom unique:', error);
      return baseName;
    }
  }, [api]);

  // 🆕 FONCTION ENREGISTRER - Ouvre le modal pour choisir le nom du devis
  const handleSaveDevis = useCallback(async () => {
    // ✅ Devis enregistré: on crée une nouvelle version uniquement si l'utilisateur a modifié quelque chose.
    if (isDevisSaved) {
      if (!isCompletedDirty) {
        message.info('Aucune modification à enregistrer');
        return;
      }
      try {
        await persistCompletedRevisionIfDirty('manual-save');
        message.success('Nouvelle version enregistrée');
      } catch (e) {
        console.warn('⚠️ [TBL] Échec enregistrement nouvelle version:', e);
        message.error('Erreur lors de l\'enregistrement de la nouvelle version');
      }
      return;
    }

    // Vérifier qu'on a un lead (OBLIGATOIRE)
    if (!leadId) {
      message.warning('Veuillez sélectionner un lead pour enregistrer le devis');
      return;
    }
    
    // Proposer un nom par défaut
    const clientName = clientData.name || 'Client';
    const defaultName = `Devis ${new Date().toLocaleDateString('fr-FR')} - ${clientName}`;
    setSaveDevisName(defaultName);
    setSaveDevisModalVisible(true);
  }, [isDevisSaved, isCompletedDirty, persistCompletedRevisionIfDirty, leadId, clientData.name]);

  // 🆕 CONFIRMER L'ENREGISTREMENT avec le nom choisi
  const handleConfirmSaveDevis = useCallback(async () => {
    // Vérifier qu'on a un lead (OBLIGATOIRE)
    if (!leadId) {
      message.warning('Veuillez sélectionner un lead pour enregistrer le devis');
      return;
    }
    
    if (!saveDevisName.trim()) {
      message.warning('Veuillez saisir un nom pour le devis');
      return;
    }
    
    try {
      setIsSavingDevis(true);
      console.log('💾 [TBL] Enregistrement du devis - Conversion default-draft → vrai devis');
      message.loading('Enregistrement en cours...', 1);
      
      // Générer le nom unique basé sur le nom choisi par l'utilisateur
      const finalName = await generateUniqueDevisName(saveDevisName.trim(), leadId);
      
      // Sauvegarder l'ID du brouillon courant pour le vider après (si distinct du devis créé)
      const oldDraftIdToClear = submissionId;
      
      // Créer le VRAI devis avec les données actuelles
      // 🔥 FIX 2026-02-04: evaluationMode: 'open' pour recalculer TOUS les display fields
      // Sans ça, les champs calculés (N° panneau max, Rampant, etc.) ne sont pas évalués
      const response = await api.post('/api/tbl/submissions/create-and-evaluate', {
        treeId: effectiveTreeId,
        clientId: leadId,
        formData: normalizePayload(formData),
        status: 'completed',
        providedName: finalName,
        evaluationMode: 'open'  // 🎯 Recalcul complet des DISPLAY fields
      });
      
      if (response?.submission?.id) {
        const newSubmissionId = response.submission.id;
        
        // 🔥 FIX 30/01/2026: Marquer que le submissionId vient de changer
        // Les prochains appels dans les 3 secondes utiliseront mode='open'
        submissionIdJustChangedUntilRef.current = Date.now() + 3000;
        console.log(`🔄 [TBL] submissionId changé → forcer mode='open' pendant 3s`);
        
        // Pointer vers le nouveau devis (les données restent à l'écran)
        setSubmissionId(newSubmissionId);
        setDevisName(finalName);
        setDevisCreatedAt(new Date());
        setIsDevisSaved(true);
        setIsDefaultDraft(false); // On n'est plus en mode simulation
        setIsLoadedDevis(true);
        setOriginalDevisId(newSubmissionId);
        const rootName = stripRevisionSuffix(finalName);
        setOriginalDevisName(rootName);
        setRevisionRootName(rootName);
        setIsCompletedDirty(false);
        setHasCopiedDevis(false);
        
        // Marquer signature comme sauvegardée
        try {
          const normalized = normalizePayload(formData);
          const sig = computeSignature(normalized);
          lastSavedSignatureRef.current = sig;
        } catch {/* noop */}
        
        // 🔄 VIDER le brouillon courant en DB (pas supprimer, juste vider)
        // ⚠️ Important: si le backend a créé le devis avec le même ID (cas rare), ne surtout pas le vider.
        if (oldDraftIdToClear && api && oldDraftIdToClear !== newSubmissionId) {
          try {
            console.log('🔄 [TBL] Vidage du brouillon courant:', oldDraftIdToClear);
            // Utiliser POST reset-data au lieu de PUT pour vider proprement
            await api.post(`/api/treebranchleaf/submissions/${oldDraftIdToClear}/reset-data`, {});
            console.log('✅ [TBL] Brouillon vidé (prêt pour le prochain devis)');
          } catch (error) {
            console.warn('⚠️ [TBL] Impossible de vider le brouillon:', error);
            // Ce n'est pas critique, on continue
          }
        }
        
        message.success(`Devis "${finalName}" enregistré avec succès !`);
        console.log('✅ [TBL] Devis enregistré:', newSubmissionId);
        setSaveDevisModalVisible(false);
      } else {
        message.error('Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('❌ [TBL] Erreur enregistrement:', error);
      message.error('Erreur lors de l\'enregistrement du devis');
    } finally {
      setIsSavingDevis(false);
    }
  }, [leadId, saveDevisName, effectiveTreeId, api, formData, normalizePayload, computeSignature, generateUniqueDevisName, stripRevisionSuffix, submissionId]);

  // 🆕 Créer une copie automatique du devis chargé
  const createDevisCopy = useCallback(async (): Promise<string | null> => {
    if (!originalDevisName || !leadId || !api || !effectiveTreeId) return null;
    
    try {
      console.log('📋 [TBL] Copie → Brouillon (default-draft):', originalDevisName);

      // 1) Récupérer/créer le default-draft
      const currentUserId = user?.id;
      if (!currentUserId) return null;

      const url = `/api/treebranchleaf/submissions?treeId=${effectiveTreeId}&status=default-draft&userId=${currentUserId}`;
      const existingDrafts = await api.get(url);
      const draftsArray = Array.isArray(existingDrafts) ? existingDrafts : (existingDrafts as any)?.data || [];
      let defaultDraft = (draftsArray as Array<{ id?: string; status?: string }>).find((d) => d.status === 'default-draft' && d.id);
      if (!defaultDraft?.id) {
        const created = await api.post('/api/tbl/submissions/create-and-evaluate', {
          treeId: effectiveTreeId,
          formData: {},
          status: 'default-draft',
          providedName: 'Brouillon'
        });
        const createdId = (created as any)?.submission?.id;
        if (!createdId) return null;
        defaultDraft = { id: createdId, status: 'default-draft' };
      }

      // 2) Associer le lead au brouillon
      try {
        await api.patch(`/api/treebranchleaf/submissions/${defaultDraft.id}`, { clientId: leadId });
      } catch (e) {
        console.warn('⚠️ [TBL] Impossible d\'associer le lead au brouillon:', e);
      }

      // 3) Persister le contenu dans le brouillon (pour reload)
      const normalized = normalizePayload(formData);
      await api.post('/api/tbl/submissions/create-and-evaluate', {
        submissionId: defaultDraft.id,
        treeId: effectiveTreeId,
        clientId: null,
        formData: normalized,
        status: 'default-draft',
        changedFieldId: 'NULL',
        evaluationMode: 'open'  // 🎯 Forcer recalcul complet lors de la copie
      });

      // 4) Mettre à jour les états
      setSubmissionId(defaultDraft.id);
      setDevisName('Brouillon');
      setIsDefaultDraft(true);
      setHasCopiedDevis(true);
      setIsLoadedDevis(false);
      setIsDevisSaved(false);

      try {
        const sig = computeSignature(normalized);
        lastSavedSignatureRef.current = sig;
      } catch {/* noop */}

      message.info('Copie chargée dans le brouillon');
      console.log('✅ [TBL] Copie appliquée au brouillon:', defaultDraft.id);
      return defaultDraft.id;
    } catch (error) {
      console.error('❌ [TBL] Erreur création copie:', error);
      message.error('Erreur lors de la création de la copie');
      return null;
    }
  }, [originalDevisName, leadId, api, effectiveTreeId, formData, normalizePayload, computeSignature, user?.id]);

  // ⚡ Debounce pour éviter les requêtes multiples (200ms)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const immediateEvaluateRef = useRef<(...args: any[]) => void>();

  // 🎯 Implémentation complète de handleFieldChange avec toutes les dépendances
  const handleFieldChangeImpl = useCallback((fieldId: string, value: string | number | boolean | string[] | null | undefined) => {
    console.log(`🔄🔄🔄 [TBL] handleFieldChangeImpl appelé: fieldId=${fieldId}, value=${value}, type=${typeof fieldId}`);
    
    // ⚡ IGNORER COMPLÈTEMENT les champs miroirs - ils sont gérés automatiquement par le système
    if (fieldId?.startsWith('__mirror_data_')) {
      console.log(`🚫 [TBL] Champ miroir ignoré: ${fieldId}`);
      return; // Ne pas traiter les miroirs, éviter d'appeler debounce avec undefined
    }

    // ✅ Devis enregistré: créer une révision -N dès la 1ère modification, puis autosave dans cette révision.
    if (isDevisSaved) {
      const root = revisionRootName || stripRevisionSuffix(originalDevisName || devisName || 'Devis');
      if (!isCompletedDirty) {
        setIsCompletedDirty(true);
        setRevisionRootName(root);
        // Préparer immédiatement un nom -N pour refléter la copie en cours (sans écrire en DB)
        if (leadId) {
          void planPendingRevisionName(root, leadId, submissionId);
        }
      } else if (!revisionRootName) {
        setRevisionRootName(root);
      }
    }
    
    // ⚠️ Versioning devis: on laisse le BACKEND être la source de vérité.
    // Si l'utilisateur modifie un devis "completed" sans être admin, le backend clone vers une nouvelle submission draft
    // et renvoie le nouveau submissionId; doAutosave bascule automatiquement.
    
    // Vérifier si le champ existe dans la configuration
    let fieldConfig = tblConfig?.fields.find(f => f.id === fieldId);
    if (!fieldConfig) {
      // Toujours accepter les clés miroir et internes
      if (fieldId.startsWith('__mirror_data_')) {
        const minimal: MinimalFieldConfig = {
          id: fieldId,
          code: fieldId,
          label: fieldId.replace('__mirror_data_', ''),
          type: 'text'
        };
        fieldConfig = minimal as unknown as typeof fieldConfig;
      } else {
        const dynamicField: DynamicFieldConfig | null = (() => {
          for (const tab of tabs) {
            for (const section of tab.sections) {
              const match = section.fields.find(sf => sf.id === fieldId);
              if (match) {
                return {
                  id: match.id,
                  code: match.id,
                  label: match.label || match.name || match.id,
                  type: (match.type || 'text').toLowerCase(),
                  unit: match.config?.unit,
                  options: match.options?.map(o => ({ label: o.label, value: o.value }))
                };
              }
            }
          }
          return null;
        })();
        if (dynamicField && tblConfig) {
          console.info(`[TBL DynamicConfig] Intégration dynamique du champ conditionnel '${fieldId}'.`);
          (tblConfig.fields as unknown as DynamicFieldConfig[]).push(dynamicField);
          fieldConfig = dynamicField as unknown as typeof fieldConfig;
        } else if (!dynamicField) {
          // Ne pas bloquer: créer une config minimale permissive
            const minimal: MinimalFieldConfig = {
              id: fieldId,
              code: fieldId,
              label: fieldId,
              type: 'text'
            };
            fieldConfig = minimal as unknown as typeof fieldConfig;
            if (localStorage.getItem('TBL_DIAG') === '1') {
              console.warn('[TBL][DynamicConfig][FALLBACK_MIN]', fieldId);
            }
        }
      }
    }

    // Valider la valeur selon le type et les règles de validation
    let isValid = true;
    let validationMessage = '';

    if (value !== null && value !== undefined) {
      switch (fieldConfig.type) {
        case 'number': {
          const numValue = Number(value);
          if (fieldConfig.validation) {
            if (typeof fieldConfig.validation.min === 'number' && numValue < fieldConfig.validation.min) {
              isValid = false;
              validationMessage = `La valeur doit être supérieure à ${fieldConfig.validation.min}`;
            }
            if (typeof fieldConfig.validation.max === 'number' && numValue > fieldConfig.validation.max) {
              isValid = false;
              validationMessage = `La valeur doit être inférieure à ${fieldConfig.validation.max}`;
            }
          }
          break;
        }

        case 'text': {
          const strValue = String(value);
          if (fieldConfig.validation) {
            if (fieldConfig.validation.minLength && strValue.length < fieldConfig.validation.minLength) {
              isValid = false;
              validationMessage = `Le texte doit faire au moins ${fieldConfig.validation.minLength} caractères`;
            }
            if (fieldConfig.validation.maxLength && strValue.length > fieldConfig.validation.maxLength) {
              isValid = false;
              validationMessage = `Le texte ne doit pas dépasser ${fieldConfig.validation.maxLength} caractères`;
            }
            if (fieldConfig.validation.pattern) {
              const regex = new RegExp(fieldConfig.validation.pattern);
              if (!regex.test(strValue)) {
                isValid = false;
                validationMessage = 'Le format est invalide';
              }
            }
          }
          break;
        }

        case 'select': {
          if (fieldConfig.options && !fieldConfig.options.find(opt => opt.value === value)) {
            isValid = false;
            validationMessage = 'Valeur non valide pour cette liste';
          }
          break;
        }
      }
    } else if (fieldConfig.required) {
      isValid = false;
      validationMessage = 'Ce champ est requis';
    }

    if (!isValid) {
      message.error(validationMessage);
      return;
    }

    // Si la validation passe, mettre à jour le state
    setFormData(prev => {
      const next: Record<string, unknown> = { ...prev, [fieldId]: value };
      console.log(`✅✅✅ [TBL] setFormData - Mise à jour: fieldId=${fieldId}, value=${value}, formData.keys=${Object.keys(next).length}`);
      console.log(`📦 [TBL] formData COMPLET après mise à jour:`, next);
      
      // 🔗 NOUVEAU : Si le champ est une référence partagée (alias), ajouter aussi la clé shared-ref-*
      let fieldDef: any = null;
      try {
        // Chercher le champ dans la configuration pour voir s'il a un sharedReferenceId
        for (const tab of tabs) {
          for (const section of tab.sections) {
            const match = section.fields.find((sf: any) => sf.id === fieldId);
            if (match) {
              fieldDef = match;
              break;
            }
          }
          if (fieldDef) break;
        }

        // Si le champ a un sharedReferenceId, ajouter la valeur avec cette clé aussi
        if (fieldDef?.sharedReferenceId) {
          const sharedRefKey = fieldDef.sharedReferenceId;
          console.log(`🔗 [TBL] Champ ${fieldId} est un alias de ${sharedRefKey}, ajout au formData`);
          next[sharedRefKey] = value;
        }

        // Si le fieldId est déjà un shared-ref-*, chercher les aliases pour les mettre à jour aussi
        if (fieldId.startsWith('shared-ref-')) {
          for (const tab of tabs) {
            for (const section of tab.sections) {
              const aliases = section.fields.filter((sf: any) => sf.sharedReferenceId === fieldId);
              aliases.forEach((alias: any) => {
                console.log(`🔗 [TBL] Mise à jour alias ${alias.id} depuis shared-ref ${fieldId}`);
                next[alias.id] = value;
              });
            }
          }
        }
      } catch (err) {
        console.warn('[TBL] Erreur lors de la gestion des shared-ref:', err);
      }
      
      try {
        // Exposer en debug (lecture) pour analyse miroir
        if (typeof window !== 'undefined') {
          const prevGlobal = window.TBL_FORM_DATA || {};
          window.TBL_FORM_DATA = next;

          // ⚠️ DISPATCH CONDITIONAL: Only emit event when the changed field affects shared refs or mirrors
          const isMirrorKey = fieldId && String(fieldId).startsWith('__mirror_data_');
          const isSharedRef = (fieldDef && !!fieldDef.sharedReferenceId) || (typeof fieldId === 'string' && fieldId.startsWith('shared-ref-'));
          const dynamicLabel = fieldConfig?.label || fieldId;
          const mirrorUpdated = (typeof dynamicLabel === 'string' && / - Champ$/i.test(dynamicLabel)) ? (`__mirror_data_${dynamicLabel.replace(/ - Champ$/i, '')}`) : null;

          const valueChanged = (prevGlobal[fieldId] !== value) || (isSharedRef && prevGlobal[fieldDef?.sharedReferenceId || ''] !== value) || (mirrorUpdated && prevGlobal[mirrorUpdated] !== value);

          if ((isMirrorKey || isSharedRef || mirrorUpdated) && valueChanged) {
            const event = new CustomEvent('TBL_FORM_DATA_CHANGED', { detail: { fieldId, value } });
            window.dispatchEvent(event);
            console.log('🚀 [TBL] Événement TBL_FORM_DATA_CHANGED dispatché:', { fieldId, value, isMirrorKey, isSharedRef, mirrorUpdated });
          } else {
            if (localStorage.getItem('TBL_DIAG') === '1') console.log('🔕 [TBL] Dispatch TBL_FORM_DATA_CHANGED SKIPPED:', { fieldId, value, isMirrorKey, isSharedRef, mirrorUpdated, valueChanged });
          }
        }
      } catch { /* noop */ }
      // Système de miroirs legacy SUPPRIMÉ - causait des problèmes avec le changedFieldId
      
      // ⚡ FILTRE: Ne JAMAIS envoyer les miroirs comme changedFieldId au backend
      let realFieldId = fieldId?.startsWith('__mirror_data_') ? undefined : fieldId;
      // ⚡ OPTIMISATION: Résolution O(1) des alias sharedRef via Map (au lieu de boucle O(n²))
      if (realFieldId && realFieldId.startsWith('shared-ref-')) {
        const aliasId = sharedRefAliasMap.get(realFieldId);
        if (aliasId) realFieldId = aliasId;
      }
      const fieldType = String((fieldConfig as any)?.type || '').toLowerCase();
      console.log(`🎯🎯🎯 [TBL] AVANT eval(DEBOUNCED 80ms): fieldId="${fieldId}", realFieldId="${realFieldId}", type="${fieldType || 'unknown'}"`);

      // Garder en mémoire le dernier champ réellement modifié (utile pour flush/versioning)
      if (realFieldId) {
        lastRealChangedFieldIdRef.current = realFieldId;
      }

      // ⚡ Évaluation avec debounce de 80ms - équilibre réactivité/groupage
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // 🔧 FIX RACE CONDITION: Marquer qu'un changement est en debounce
      debounceActiveRef.current = true;
      
      debounceTimerRef.current = setTimeout(() => {
        // 🔧 FIX RACE CONDITION: Debounce terminé, prêt à évaluer
        debounceActiveRef.current = false;
        if (immediateEvaluateRef.current) {
          immediateEvaluateRef.current(next as TBLFormData, realFieldId);
          console.log(`✅✅✅ [TBL] APRÈS eval DEBOUNCED appelé avec realFieldId="${realFieldId}"`);
        } else {
          console.warn('⚠️ [TBL] immediateEvaluateRef pas encore initialisé');
        }
      }, 80);

      // ✅ Si on édite un devis enregistré "original", créer tout de suite la révision en base
      // pour qu'elle existe même si l'utilisateur quitte l'écran.
      if (isDevisSaved && !hasCopiedDevis && leadId) {
        void ensureCompletedRevisionExists(next as TBLFormData);
      }
      
      // � DÉSACTIVÉ: L'événement tbl-field-changed créait une race condition
      // Il déclenchait des requêtes GET dans useNodeCalculatedValue AVANT que le backend
      // ait sauvegardé les nouvelles données via create-and-evaluate
      // Résultat: la première modification affichait toujours des valeurs obsolètes
      // Le refresh doit se faire uniquement via tbl-force-retransform APRÈS le save backend
      // try {
      //   if (typeof window !== 'undefined') {
      //     const event = new CustomEvent('tbl-field-changed', { 
      //       detail: { fieldId, value, formData: next, timestamp: Date.now() }
      //     });
      //     window.dispatchEvent(event);
      //   }
      // } catch { /* noop */ }
      
      // 🚀 PRELOAD REPEATER: Vérifier si ce champ est source d'un repeater pour pré-créer des copies
      // 🔒 PROTECTION: Ne pas déclencher le preload si le changement vient d'un sync bidirectionnel
      const skipPreloadUntil = typeof window !== 'undefined' ? window.__TBL_SKIP_PRELOAD_UNTIL || 0 : 0;
      const shouldSkipPreload = Date.now() < skipPreloadUntil;
      
      if (shouldSkipPreload) {
        console.log(`🔒 [PRELOAD] Sauté pour ${fieldId} car sync bidirectionnel en cours (skip jusqu'à ${new Date(skipPreloadUntil).toISOString()})`);
      }
      
      if (fieldId && value !== null && value !== undefined && !shouldSkipPreload) {
        let numericValue = typeof value === 'number' ? value : parseInt(String(value), 10);
        
        // 🔒 VALIDATION: Vérifier si ce champ est source d'un repeater
        // 🔍 DEBUG: Afficher tous les repeaters avec countSourceNodeId
        const allRepeaters = (rawNodes || []).filter((n: any) => n.type === 'leaf_repeater');
        console.log(`🔍 [PRELOAD DEBUG] Champ modifié: ${fieldId}, rawNodes: ${(rawNodes || []).length}, repeaters: ${allRepeaters.length}`);
        allRepeaters.forEach((r: any) => {
          console.log(`   📦 Repeater "${r.label}" (${r.id}) → countSourceNodeId: ${r.repeater_countSourceNodeId || 'NULL'}`);
        });
        
        const repeatersUsingThisField = (rawNodes || []).filter(
          (node: any) => node.repeater_countSourceNodeId === fieldId
        );
        
        // Si ce champ est lié à un repeater, forcer min=1 (l'original ne peut pas être supprimé)
        if (repeatersUsingThisField.length > 0 && !isNaN(numericValue) && numericValue < 1) {
          console.log(`🔒 [PRELOAD] Champ ${fieldId}: valeur ${numericValue} forcée à 1 (minimum obligatoire)`);
          numericValue = 1;
          // Mettre à jour la valeur dans le state pour afficher 1
          const currentFieldValue = next[fieldId];
          next[fieldId] = typeof currentFieldValue === 'object' && currentFieldValue !== null
            ? { ...currentFieldValue, value: '1' }
            : '1';
        }
        
        if (!isNaN(numericValue) && numericValue >= 1 && repeatersUsingThisField.length > 0) {
          console.log(`🚀 [PRELOAD] Champ ${fieldId} = ${numericValue} déclenche preload pour ${repeatersUsingThisField.length} repeater(s)`);
          
          // Récupérer le treeId depuis le contexte (tree ou rawNodes[0])
          const currentTreeId = tree?.id || rawNodes?.[0]?.treeId || '';
          
          // Déclencher le preload pour chaque repeater concerné (en arrière-plan)
          repeatersUsingThisField.forEach((repeater: any) => {
            console.log(`🚀 [PRELOAD] Appel /api/repeat/${repeater.id}/preload-copies avec targetCount=${numericValue}, treeId=${currentTreeId}`);
            api.post(`/api/repeat/${repeater.id}/preload-copies`, { targetCount: numericValue })
              .then((result: any) => {
                console.log(`✅ [PRELOAD] Repeater ${repeater.id}: ${result.createdCopies} copies créées (total: ${result.totalCopies})`, result.newNodeIds);
                // Déclencher un refresh de l'arbre - TOUJOURS pour synchroniser
                if (typeof window !== 'undefined' && currentTreeId) {
                  console.log(`🔄 [PRELOAD] Déclenchement refresh arbre via tbl-repeater-updated (treeId=${currentTreeId})`);
                  // Utiliser tbl-repeater-updated SANS suppressReload pour déclencher un fetchData() complet
                  window.dispatchEvent(new CustomEvent('tbl-repeater-updated', { 
                    detail: { 
                      treeId: currentTreeId,
                      nodeId: repeater.id,
                      source: 'preload-copies',
                      // PAS de suppressReload → déclenche fetchData() dans useTBLData-hierarchical-fixed
                      newNodeIds: result.newNodeIds || [],
                      createdCopies: result.createdCopies || 0,
                      timestamp: Date.now()
                    } 
                  }));
                }
              })
              .catch((err: any) => {
                console.error(`❌ [PRELOAD] Erreur pour repeater ${repeater.id}:`, err);
              });
          });
        }
      }
      
      return next as typeof prev;
    });
  }, [tblConfig, tabs, scheduleAutosave, scheduleCapabilityPreview, isLoadedDevis, hasCopiedDevis, originalDevisId, createDevisCopy, isDevisSaved, isCompletedDirty, revisionRootName, stripRevisionSuffix, originalDevisName, devisName, leadId, submissionId, planPendingRevisionName, ensureCompletedRevisionExists, rawNodes, api]);
  
  // 🔄 Assigner la ref IMMÉDIATEMENT dans le corps du composant
  handleFieldChangeRef.current = handleFieldChangeImpl;

  // 🎯 WRAPPER DIRECT: Utiliser directement handleFieldChangeImpl au lieu d'un wrapper useCallback
  // Problème identifié: useCallback avec deps vides crée la fonction au 1er render quand ref est undefined
  // Solution: Passer directement handleFieldChangeImpl qui se met à jour à chaque render
  const handleFieldChange = handleFieldChangeImpl;


  // Sauvegarder comme devis
  const handleSaveAsDevis = async (values: { projectName: string; notes?: string }) => {
    try {
      console.group('[TBL][SAVE_AS_DEVIS] Début');
      console.time('[TBL] SAVE_AS_DEVIS');
      // console.log('[TBL][SAVE_AS_DEVIS] Params', values);
  const _dataSize = (() => { try { return JSON.stringify(formData).length; } catch { return 'n/a'; } })();
      // console.log('[TBL][SAVE_AS_DEVIS] formData', { keys: Object.keys(formData).length, approxBytes: dataSize });
      const result = await saveAsDevis(formData, tree!.id, {
        clientId: leadId,
        projectName: values.projectName,
        notes: values.notes,
        isDraft: false
      });
      // console.log('[TBL][SAVE_AS_DEVIS] Résultat', result);
      if (result.success) {
        message.success('Devis sauvegardé avec succès !');
        setSaveModalVisible(false);
      } else {
        message.error(result.error || 'Erreur de sauvegarde');
      }
      console.timeEnd('[TBL] SAVE_AS_DEVIS');
      console.groupEnd();
    } catch {
      message.error('Erreur lors de la sauvegarde');
    }
  };

  // Générer le PDF - Ouvrir le modal de sélection de template
  const handleGeneratePDF = async () => {
    // Vérifier qu'on a un client sélectionné
    if (!clientData.id) {
      message.warning('Veuillez d\'abord sélectionner un client');
      return;
    }
    
    // Vérifier qu'on a une submission
    if (!submissionId) {
      message.warning('Veuillez d\'abord sauvegarder le devis');
      return;
    }
    
    // Charger les templates disponibles pour cet arbre
    try {
      setLoadingTemplates(true);
      setPdfModalVisible(true);
      
      const effectiveTreeId = treeId || 'cmf1mwoz10005gooked1j6orn';
      const response = await api.get(`/api/documents/templates?treeId=${effectiveTreeId}&isActive=true`);
      
      const templates = Array.isArray(response) ? response : (response?.data || []);
      setAvailableTemplates(templates);
      
      if (templates.length === 0) {
        message.info('Aucun template de document disponible pour cet arbre');
      }
    } catch (error) {
      console.error('❌ Erreur chargement templates:', error);
      message.error('Erreur lors du chargement des templates');
    } finally {
      setLoadingTemplates(false);
    }
  };
  
  // Générer le PDF avec un template spécifique
  const handleGeneratePDFWithTemplate = async (templateId: string) => {
    try {
      setGeneratingPdf(true);
      
      // Préparer les données du document
      const documentData = {
        templateId,
        submissionId,
        leadId: clientData.id,
        // Données du formulaire TBL
        tblData: formData,
        // Données du client
        lead: {
          firstName: clientData.name.split(' ')[0] || '',
          lastName: clientData.name.split(' ').slice(1).join(' ') || '',
          email: clientData.email,
          phone: clientData.phone,
          address: clientData.address,
          company: clientData.name,
        },
      };
      
      console.log('📄 [TBL] Génération PDF avec:', documentData);
      
      const response = await api.post('/api/documents/generated/generate', documentData);
      
      if (response?.id) {
        message.success('Document généré avec succès !');
        setPdfModalVisible(false);
        
        // Ouvrir le PDF directement dans un nouvel onglet
        const pdfUrl = `/api/documents/generated/${response.id}/download`;
        console.log('📄 [TBL] Ouverture du PDF:', pdfUrl);
        window.open(pdfUrl, '_blank');
        
        // Émettre un événement pour rafraîchir la liste des documents
        window.dispatchEvent(new CustomEvent('document-generated', { detail: { documentId: response.id } }));
      } else {
        message.success('Document créé ! La génération PDF est en cours...');
        setPdfModalVisible(false);
      }
    } catch (error: any) {
      console.error('❌ Erreur génération PDF:', error);
      message.error(error?.response?.data?.error || 'Erreur lors de la génération du document');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Charger un devis existant
  const handleLoadDevis = useCallback(async () => {
    const effectiveTreeId = treeId || 'cmf1mwoz10005gooked1j6orn';
    
    if (!effectiveTreeId) {
      message.error('ID de l\'arbre TreeBranchLeaf manquant');
      return;
    }
    
    // Récupérer l'ID du lead depuis l'URL si clientData.id n'est pas disponible
    const leadIdFromUrl = leadId;
    const effectiveLeadId = clientData.id || leadIdFromUrl;
    
    // console.log('🔍 [TBL] FILTRAGE STRICT - clientData.id:', clientData.id);
    // console.log('🔍 [TBL] FILTRAGE STRICT - leadIdFromUrl:', leadIdFromUrl);
    // console.log('🔍 [TBL] FILTRAGE STRICT - effectiveLeadId:', effectiveLeadId);
    // console.log('🔍 [TBL] FILTRAGE STRICT - clientData:', clientData);
    
    try {
      // console.log('🔍 [TBL] FILTRAGE STRICT - Chargement des devis pour:', effectiveLeadId, clientData.name);
      
      // Charger TOUS les devis d'abord, puis filtrer côté client
      const apiUrl = `/api/treebranchleaf/submissions/by-leads?treeId=${effectiveTreeId}`;
      
      const allLeadsWithSubmissions = await api.get(apiUrl);
      // console.log('🔍 [TBL] AVANT FILTRAGE - Tous les leads reçus:', allLeadsWithSubmissions);
      
      // FILTRAGE STRICT : Ne garder QUE le lead sélectionné
      let filteredLeads = allLeadsWithSubmissions;
      
      if (effectiveLeadId) {
        filteredLeads = allLeadsWithSubmissions.filter(lead => {
          const isMatch = lead.id === effectiveLeadId;
          // console.log(`🔍 [TBL] Vérification lead ${lead.id} (${lead.firstName} ${lead.lastName}) VS ${effectiveLeadId}: ${isMatch}`);
          return isMatch;
        });
        // console.log('🔍 [TBL] APRÈS FILTRAGE STRICT - Leads conservés:', filteredLeads);
      } else {
        // console.log('⚠️ [TBL] Aucun leadId trouvé, affichage de tous les devis');
      }
      
      if (!filteredLeads || filteredLeads.length === 0) {
        // console.log('❌ [TBL] AUCUN devis trouvé pour le lead:', effectiveLeadId, clientData.name);
        message.info(`Aucun devis trouvé pour ${clientData.name || 'ce lead'}`);
        setAvailableDevis([]);
      } else {
        // console.log('✅ [TBL] Devis trouvés pour le lead:', clientData.name, filteredLeads);
        setAvailableDevis(filteredLeads);
      }
      
      setDevisSelectorVisible(true);
      
    } catch (error) {
      console.error('❌ [TBL] Erreur lors du chargement des devis par leads:', error);
      message.error('Erreur lors du chargement des devis');
      
      // Montrer la modale même en cas d'erreur pour que l'utilisateur comprenne
      setAvailableDevis([]);
      setDevisSelectorVisible(true);
    }
  }, [treeId, api, clientData, leadId]);

  // Ajouter des numéros automatiquement aux noms de devis identiques pour l'affichage
  const addNumbersToDevisNames = (devisList: Array<{id: string, firstName: string, lastName: string, email: string, company?: string, submissions: Array<{id: string, name: string, status: string, createdAt: string, treeName?: string}>}>) => {
    // Grouper les devis par nom de base
    const groups: { [key: string]: Array<{submission: {id: string, name: string, status: string, createdAt: string, treeName?: string}, lead: {id: string, firstName: string, lastName: string, email: string, company?: string}}> } = {};
    
    devisList.forEach(devis => {
      const baseName = devis.name || 'Devis sans nom';
      if (!groups[baseName]) {
        groups[baseName] = [];
      }
      groups[baseName].push(devis);
    });
    
    // Ajouter des numéros aux groupes qui ont plus d'un élément
    const result = devisList.map(devis => {
      const baseName = devis.name || 'Devis sans nom';
      const group = groups[baseName];
      
      if (group.length > 1) {
        const index = group.findIndex(d => d.id === devis.id);
        return {
          ...devis,
          displayName: `${baseName} (${index + 1})`
        };
      }
      
      return {
        ...devis,
        displayName: baseName
      };
    });
    
    return result;
  };

  // Supprimer un devis existant
  const handleDeleteDevis = async (devisId: string, devisName: string) => {
    // Demander confirmation
    const confirmed = window.confirm(`Êtes-vous sûr de vouloir supprimer le devis "${devisName}" ?\n\nCette action est irréversible.`);
    
    if (!confirmed) return;
    
    try {
      console.log('🗑️ [TBL][DELETE] Suppression du devis:', devisId);
      
      // Appeler l'API de suppression
      await api.delete(`/api/treebranchleaf/submissions/${devisId}`);
      
      console.log('✅ [TBL][DELETE] Devis supprimé, rechargement...');
      
      // Recharger la liste des devis
      await handleLoadDevis();
      
      message.success(`Devis "${devisName}" supprimé avec succès`);
    } catch (error) {
      console.error('❌ [TBL][DELETE] Erreur lors de la suppression:', error);
      message.error('Erreur lors de la suppression du devis');
    }
  };

  // Confirmer la création du nouveau devis
  const handleCreateDevis = async () => {
    try {
      console.group('🚀 [TBL][CREATE_DEVIS] DÉBUT');
      console.time('[TBL] CREATE_DEVIS');

      const effectiveTreeId = treeId || 'cmf1mwoz10005gooked1j6orn';
  const _approxBytes = (() => { try { return JSON.stringify(formData).length; } catch { return 'n/a'; } })();
      // console.log('🔍 [TBL] État actuel:', { leadId, treeId, effectiveTreeId, devisName, formDataKeys: Object.keys(formData), approxBytes });

      const values = await form.validateFields();
      // console.log('✅ [TBL] Validation formulaire réussie:', values);

      const baseDevisName = values.devisName || devisName;
      // console.log('🔍 [TBL] Nom de base du devis:', baseDevisName);

      // Vérifier l'unicité du nom avant la sauvegarde finale
      const finalDevisName = await generateUniqueDevisName(baseDevisName, leadId || '');
      // console.log('🔍 [TBL] Nom final du devis (unique):', finalDevisName);

      if (!effectiveTreeId) {
        console.error('❌ [TBL] Tree ID manquant:', { effectiveTreeId });
        message.error('Arbre TreeBranchLeaf requis pour créer un devis');
        return;
      }

      // console.log('🔍 [TBL] Création devis avec paramètres:', { leadId: leadId || 'aucun', treeId: effectiveTreeId, name: finalDevisName, dataKeys: Object.keys(formData).length, approxBytes });

      // Créer le devis via API avec les données actuelles du formulaire
      // 🔥 VALIDATION: Le lead est OBLIGATOIRE
      const effectiveLeadId = selectedLeadForDevis?.id || leadId;
      
      if (!effectiveLeadId) {
        console.error('❌ [TBL] Aucun lead sélectionné, création impossible');
        message.error('Vous devez sélectionner un lead pour créer un devis');
        return;
      }
      
      const submissionData: { treeId: string; name: string; data: TBLFormData; leadId: string } = {
        treeId: effectiveTreeId,
        name: finalDevisName,
        data: formData,
        leadId: effectiveLeadId
      };

      // Tentative de création de la submission avec repli automatique si 404 (arbre introuvable ou non autorisé)
      let submission: unknown;
      try {
        // console.log('📡 [TBL] POST TBL Prisma create-and-evaluate - payload meta', { treeId: submissionData.treeId, name: submissionData.name, dataKeys: Object.keys(submissionData.data || {}).length });
        
        const formData = Array.isArray(submissionData.data) 
          ? submissionData.data.reduce((acc, item) => {
              if (item.nodeId && item.value != null) {
                acc[item.nodeId] = item.value;
              }
              return acc;
            }, {} as Record<string, unknown>)
          : submissionData.data || {};
        
        const response = await api.post('/api/tbl/submissions/create-and-evaluate', {
          treeId: submissionData.treeId,
          clientId: submissionData.leadId,
          formData,
          status: 'completed',
          providedName: submissionData.name,
          evaluationMode: 'open' // ✅ Recalculer TOUS les display fields
        });
        
        submission = response.submission;
      } catch (e) {
        const err = e as { response?: { status?: number; data?: unknown; statusText?: string }; status?: number; message?: string; url?: string };
        const status = err?.response?.status ?? err?.status;
        const statusText = err?.response?.statusText;
        const msg = err?.response?.data ?? err?.message;
  console.warn('⚠️ [TBL] Échec création devis, tentative de repli…', { status, statusText, msg });

        if (status === 404) {
          try {
            // console.log('🌲 [TBL] Chargement des arbres accessibles pour repli…');
            const trees = await api.get('/api/treebranchleaf/trees') as Array<{ id: string; name?: string }>;
            // console.log('🌲 [TBL] Arbres reçus (count):', Array.isArray(trees) ? trees.length : 'non-array');
            if (Array.isArray(trees) && trees.length > 0) {
              const fallbackTreeId = trees[0].id;
              console.info('🔁 [TBL] Repli: on essaie avec le premier arbre accessible', { fallbackTreeId, fallbackTreeName: trees[0]?.name });
              const fallbackFormData = Array.isArray(submissionData.data) 
                ? submissionData.data.reduce((acc, item) => {
                    if (item.nodeId && item.value != null) {
                      acc[item.nodeId] = item.value;
                    }
                    return acc;
                  }, {} as Record<string, unknown>)
                : submissionData.data || {};
              
              const fallbackResponse = await api.post('/api/tbl/submissions/create-and-evaluate', {
                treeId: fallbackTreeId,
                clientId: submissionData.leadId,
                formData: fallbackFormData,
                status: 'completed',
                providedName: submissionData.name,
                evaluationMode: 'open' // ✅ Recalculer TOUS les display fields
              });
              
              submission = fallbackResponse.submission;
              message.info(`Arbre par défaut indisponible, repli sur: ${trees[0].name || fallbackTreeId}`);
            } else {
              message.error("Aucun arbre accessible n'a été trouvé pour créer le devis.");
              return;
            }
          } catch (retryErr) {
            const r = retryErr as { response?: { status?: number; data?: unknown; statusText?: string }; status?: number; message?: string; url?: string };
            console.error('❌ [TBL] Échec du repli de création de devis:', {
              status: r?.response?.status ?? r?.status,
              statusText: r?.response?.statusText,
              msg: r?.response?.data ?? r?.message
            });
            throw retryErr;
          }
        } else {
          // Autre erreur: on relance pour gestion générique plus bas
          throw err;
        }
      }

      // console.log('✅ [TBL] Devis créé avec succès. Détails (clés):', submission && typeof submission === 'object' ? Object.keys(submission as Record<string, unknown>) : typeof submission);
      message.success(`Nouveau devis "${finalDevisName}" créé avec succès`);

      // Mettre à jour le nom du devis IMMÉDIATEMENT pour l'affichage dans le header
      setDevisName(finalDevisName);
      setDevisCreatedAt(new Date());

      // Récupérer et mémoriser l'ID de la submission créée (pour activer les mises à jour idempotentes)
      try {
        const created = submission as unknown as { id?: string } | null;
        if (created && typeof created === 'object' && created.id) {
          const newSubmissionId = created.id;
          
          // Mark that we just created a new devis so the useEffect can dispatch refresh
          // after React propagates the new submissionId to all child components
          justCreatedDevisRef.current = true;
          
          setSubmissionId(newSubmissionId);
          
          // Mettre à jour le leadId principal pour synchroniser le header
          if (effectiveLeadId && effectiveLeadId !== leadId) {
            setLeadId(effectiveLeadId);
            
            // Charger les données du lead pour le header
            try {
              const response = await api.get(`/api/leads/${effectiveLeadId}`);
              const lead = response.success ? response.data : response;
              
              if (lead && lead.id) {
                const newClientData = {
                  id: lead.id,
                  name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.company || 'Lead sans nom',
                  email: lead.email || '',
                  phone: lead.phone || lead.phoneNumber || lead.phoneHome || '',
                  address: formatAddressValue(lead.fullAddress ?? lead.address ?? lead.data?.address ?? '')
                };
                setClientData(newClientData);
              }
            } catch (error) {
              console.warn('⚠️ [TBL] Impossible de charger les données du lead pour le header:', error);
            }
          }
          
          console.log('🔄 [TBL] Set new submissionId:', newSubmissionId);
          console.log('🔄 [TBL] useEffect will dispatch refresh after React updates all components');
        }
      } catch { /* noop */ }

      // Marquer la signature courante comme sauvegardée pour éviter un autosave inutile immédiat
      try {
        const normalized = normalizePayload(formData);
        const sig = computeSignature(normalized);
        lastSavedSignatureRef.current = sig;
      } catch { /* noop */ }

      // Enregistrer le devis comme document lié + entrée d'historique si un lead est associé
      try {
        const subObj: unknown = submission;
        const createdId = (subObj && typeof subObj === 'object' && 'id' in subObj && typeof (subObj as { id?: unknown }).id === 'string')
          ? (subObj as { id: string }).id
          : undefined;
        if (leadId && createdId) {
          // Document attaché au lead
          await api.post(`/api/leads/${leadId}/documents`, {
            id: createdId,
            name: finalDevisName,
            type: 'devis',
            url: null,
            meta: { treeId: effectiveTreeId }
          });
          // Historique
          await api.post(`/api/leads/${leadId}/history`, {
            type: 'devis',
            content: `Devis créé: ${finalDevisName}`,
            author: undefined
          });
        }
      } catch (linkErr) {
        console.warn('⚠️ [TBL] Impossible d\'enregistrer le devis dans Documents/History du lead:', linkErr);
      }

      // Réinitialiser les modals (mais PAS le devisName car il est affiché dans le header)
      setDevisCreatorVisible(false);
      // ⚠️ NE PAS RÉINITIALISER LE FORMULAIRE - Le système de calcul doit rester actif
      // form.resetFields();

      // handleLoadDevis(); // Pour refresh la liste si nécessaire

      console.timeEnd('[TBL] CREATE_DEVIS');
      console.groupEnd();
    } catch (error) {
      console.error('❌ [TBL] Erreur lors de la création du devis:', error);
      try {
        const _err = error as { response?: { status?: number; data?: unknown; statusText?: string }; status?: number; message?: string; url?: string };
        console.group('[TBL][CREATE_DEVIS][ERROR]');
        // console.log('status:', err?.response?.status ?? err?.status);
        // console.log('statusText:', err?.response?.statusText);
        // console.log('message:', err?.message);
        // console.log('data:', err?.response?.data);
        console.groupEnd();
      } catch { /* noop */ }

      // Afficher des détails d'erreur plus précis
      if (error && typeof error === 'object') {
        const errObj = error as Record<string, unknown> & { response?: unknown };
        if ('errorFields' in errObj) {
          // On ne connaît pas le type exact ici, on logge la valeur brute
          console.error('❌ [TBL] Erreurs de validation:', (errObj as Record<string, unknown>).errorFields);
          message.error('Veuillez remplir tous les champs requis');
        } else if ('response' in errObj) {
          console.error('❌ [TBL] Erreur API:', errObj.response);
          message.error('Erreur lors de la création du devis. Vérifiez la console pour plus de détails.');
        } else {
          console.error('❌ [TBL] Erreur inconnue:', error);
          message.error('Erreur inattendue lors de la création du devis');
        }
      } else {
        message.error('Erreur lors de la création du devis. Vérifiez la console pour plus de détails.');
      }
      try { console.timeEnd('[TBL] CREATE_DEVIS'); console.groupEnd(); } catch { /* noop */ }
    }
  };

  // ====== OUTIL SUPER ADMIN : Auto-remplissage de tous les champs ======
  const flattenFields = (sections: TBLSection[]): TBLField[] => {
    const out: TBLField[] = [];
    const walk = (secs: TBLSection[]) => {
      secs.forEach(s => {
        if (Array.isArray(s.fields)) out.push(...s.fields);
        if (Array.isArray(s.subsections) && s.subsections.length) walk(s.subsections);
      });
    };
    walk(sections);
    return out;
  };

  const makeTestValueLegacy = (field: TBLField): unknown => {
    const t = (field.type || '').toString().toLowerCase();
    if (t === 'number') {
      const min = (field.config as { min?: number } | undefined)?.min ?? 0;
      const max = (field.config as { max?: number } | undefined)?.max ?? 100;
      const mid = Math.round((min + max) / 2);
      return Number.isFinite(mid) ? mid : 1;
    }
    if (t === 'boolean') return true;
    if (t === 'select' || (field as unknown as { isSelect?: boolean }).isSelect || Array.isArray(field.options)) {
      const first = field.options && field.options.length > 0 ? field.options[0].value : undefined;
      return first ?? '';
    }
    if (t === 'date') {
      return new Date().toISOString().slice(0, 10);
    }
    // textarea / text / autres
    return field.placeholder || 'Valeur de test';
  };

  const fillAllFields = async (alsoSave: boolean) => {
    try {
      if (!tabs || tabs.length === 0) {
        message.warning('Aucun onglet TBL à remplir');
        return;
      }
      // Accumulateur pour sauvegarde rapide
      const filledData: Record<string, string | number | boolean | null | undefined> = {};

      // Remplir onglet par onglet
      tabs.forEach(tab => {
        const fields = flattenFields(tab.sections || []);
        fields.forEach(field => {
          // Sélectionner une valeur de test
          const value = makeTestValueLegacy(field);
          // Appliquer via handler (met à jour formData + miroirs)
          handleFieldChange(field.id, value as string | number | boolean | string[] | null | undefined);
          filledData[field.id] = value as string | number | boolean | null | undefined;

          // Si select avec champs conditionnels, remplir aussi ces champs
          const isSelect = (field as unknown as { isSelect?: boolean }).isSelect || (field.type || '').toString().toLowerCase() === 'select' || Array.isArray(field.options);
          if (isSelect && Array.isArray(field.options) && field.options.length > 0) {
            const chosen = field.options[0];
            if (Array.isArray(chosen.conditionalFields)) {
              chosen.conditionalFields.forEach(cf => {
                const cfVal = makeTestValueLegacy(cf as unknown as TBLField);
                handleFieldChange(cf.id, cfVal as string | number | boolean | string[] | null | undefined);
                filledData[cf.id] = cfVal as string | number | boolean | null | undefined;
              });
            }
          }
        });
      });

      // Feedback
      const count = Object.keys(filledData).length;
      if (!alsoSave) {
        message.success(`Champs remplis (${count}). Vous pouvez maintenant créer/charger un devis.`);
        return;
      }

      // Sauvegarde rapide en tant que devis (auto)
      const effectiveTreeId = tree?.id || (treeId || '');
      if (!effectiveTreeId) {
        message.warning('Impossible d’enregistrer: ID arbre manquant');
        return;
      }
      const clientName = clientData.name || 'Client';
      const baseName = `Devis Auto - ${new Date().toLocaleDateString('fr-FR')} - ${clientName}`;
      const uniqueName = await generateUniqueDevisName(baseName, leadId || '');
      try {
        // 🔥 NOUVEAU: Utiliser TBL Prisma pour l'auto-sauvegarde
        // console.log('🚀 [TBL] Auto-sauvegarde via TBL Prisma...');
        
        await api.post('/api/tbl/submissions/create-and-evaluate', {
          treeId: effectiveTreeId,
          clientId: leadId,
          formData: filledData,
          status: 'completed',
          providedName: uniqueName,
          evaluationMode: 'open' // ✅ Recalculer TOUS les display fields
        });
        
        message.success(`Champs remplis (${count}) et devis enregistré via TBL Prisma: ${uniqueName}`);
      } catch (e) {
        console.error('❌ [TBL] Échec enregistrement auto:', e);
        message.error('Remplissage OK, mais échec de l’enregistrement automatique');
      }
    } catch (e) {
      console.error('❌ [TBL] Erreur auto-remplissage:', e);
      message.error('Erreur lors du remplissage automatique');
    }
  };

  // Sélectionner un devis spécifique
  const handleSelectDevis = useCallback(async (devisId: string, leadData?: {id: string, firstName: string, lastName: string, email: string}) => {
    try {
      // ✅ Si on quittait un devis enregistré modifié, on crée d'abord la version -N.
      try {
        await persistCompletedRevisionIfDirty('load-devis');
      } catch (e) {
        console.warn('⚠️ [TBL] Persist revision avant chargement devis échoué (on continue):', e);
      }

      // console.log('🔍 [TBL] === DÉBUT CHARGEMENT DEVIS ===');
      // console.log('🔍 [TBL] ID du devis:', devisId);
      // console.log('🔍 [TBL] Données du lead:', leadData);
      
      // Indicateur de chargement
      message.loading('Chargement du devis...', 0.5);

      let hydratedLeadId: string | undefined = leadData?.id;
      
      // Si un lead est fourni, charger ses données complètes depuis l'API
      if (leadData?.id) {
        try {
          const response = await api.get(`/api/leads/${leadData.id}`);
          const lead = response.success ? response.data : response;
          
          if (lead && lead.id) {
            const newClientData = {
              id: lead.id,
              name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.company || 'Lead sans nom',
              email: lead.email || '',
              phone: lead.phone || lead.phoneNumber || lead.phoneHome || '',
              address: formatAddressValue(lead.fullAddress ?? lead.address ?? lead.data?.address ?? '')
            };
            setClientData(newClientData);
            setLeadId(lead.id);
            // console.log('🔍 [TBL] Client mis à jour avec données complètes:', newClientData);
          }
        } catch (error) {
          console.warn('⚠️ [TBL] Impossible de charger les données complètes du lead:', error);
          // Fallback: utiliser les données partielles fournies
          const newClientData = {
            id: leadData.id,
            name: `${leadData.firstName || ''} ${leadData.lastName || ''}`.trim() || 'Lead sans nom',
            email: leadData.email || '',
            phone: '', 
            address: '' 
          };
          setClientData(newClientData);
          setLeadId(leadData.id);
        }
      }
      
      // Charger les données du devis sélectionné
      // console.log('🔍 [TBL] Appel API pour récupérer la submission...');
      const submissionResponse = await api.get(`/api/treebranchleaf/submissions/${devisId}`);
      const submission = (submissionResponse && typeof submissionResponse === 'object' && 'success' in submissionResponse)
        ? ((submissionResponse as unknown as { success?: boolean; data?: unknown }).data ?? submissionResponse)
        : submissionResponse;

      const submissionObj = (submission && typeof submission === 'object' && 'submission' in (submission as Record<string, unknown>))
        ? ((submission as Record<string, unknown>).submission as any)
        : submission;
      // console.log('🔍 [TBL] Réponse API complète:', submission);
      
      // console.log('🔍 [TBL] Réponse API complète:', submission);
      
      const submissionDataArray = (submissionObj && typeof submissionObj === 'object')
        ? ((submissionObj as any).TreeBranchLeafSubmissionData as Array<{ nodeId: string; value?: string; operationSource?: string | null }> | undefined)
        : undefined;

      let formattedData: TBLFormData = {};
      let skippedCalculated = 0;
      const sourceStats: Record<string, number> = {};

      if (Array.isArray(submissionDataArray)) {
        // console.log('🔍 [TBL] Données de submission trouvées:', submission.TreeBranchLeafSubmissionData.length, 'éléments');
        
        // ✅ Filtrer pour recharger les entrées utilisateur.
        // Selon la source, les saisies peuvent être taguées 'neutral' (legacy) OU 'field' (interpreter).
        submissionDataArray.forEach((item) => {
          const src = typeof item.operationSource === 'string' ? item.operationSource.toLowerCase() : null;
          const srcKey = src || '(null)';
          sourceStats[srcKey] = (sourceStats[srcKey] || 0) + 1;
          const isUserInput = !src || src === 'neutral' || src === 'field' || src === 'fixed';
          if (!isUserInput) {
            skippedCalculated++;
            return;
          }
          if (item.value !== undefined && item.value !== null && item.value !== '') {
            formattedData[item.nodeId] = item.value;
          }
        });
      } else {
        // 🔁 Fallback: certains endpoints ne renvoient pas TreeBranchLeafSubmissionData ici.
        // On utilise la route /fields (déjà utilisée pour default-draft) pour réhydrater les champs utilisateur.
        try {
          const fieldsResponse = await api.get(`/api/treebranchleaf/submissions/${devisId}/fields`);
          const payload = (fieldsResponse && typeof fieldsResponse === 'object' && 'success' in fieldsResponse)
            ? ((fieldsResponse as any).data ?? fieldsResponse)
            : fieldsResponse;
          const fieldsMap = (payload as any)?.fields || {};

          Object.entries(fieldsMap).forEach(([nodeId, fieldData]: [string, unknown]) => {
            const field = fieldData as { rawValue?: unknown; value?: unknown; calculatedBy?: unknown; operationSource?: unknown };
            const src = typeof field.operationSource === 'string'
              ? field.operationSource.toLowerCase()
              : (typeof field.calculatedBy === 'string' ? field.calculatedBy.toLowerCase() : null);
            const srcKey = src || '(null)';
            sourceStats[srcKey] = (sourceStats[srcKey] || 0) + 1;
            const isUserInput = !src || src === 'neutral' || src === 'field' || src === 'fixed';
            if (!isUserInput) {
              skippedCalculated++;
              return;
            }
            const candidate = field.rawValue ?? field.value;
            if (candidate !== undefined && candidate !== null && String(candidate) !== '') {
              formattedData[nodeId] = String(candidate);
            }
          });

          // Réhydrater aussi le lead si le payload /fields le contient
          const leadIdFromFields = (payload as any)?.leadId as string | undefined;
          const leadFromFields = (payload as any)?.lead as any;
          if (leadIdFromFields) {
            hydratedLeadId = leadIdFromFields;
            setLeadId(leadIdFromFields);
            const leadName = leadFromFields
              ? (`${leadFromFields.firstName || ''} ${leadFromFields.lastName || ''}`.trim() || leadFromFields.company || 'Lead sans nom')
              : 'Lead associé';
            setClientData({
              id: leadIdFromFields,
              name: leadName,
              email: leadFromFields?.email || '',
              phone: leadFromFields?.phone || leadFromFields?.phoneNumber || leadFromFields?.phoneHome || '',
              address: formatAddressValue(leadFromFields?.fullAddress ?? leadFromFields?.address ?? leadFromFields?.data?.address ?? '')
            });
          }
        } catch (fallbackErr) {
          console.warn('⚠️ [TBL LOAD] Fallback /fields impossible:', fallbackErr);
        }
      }

      if (skippedCalculated > 0) {
        console.log(`🚫 [TBL LOAD] ${skippedCalculated} champs non-neutral ignorés (calculés/capacités)`);
      }

      const loadedCount = Object.keys(formattedData).length;
      console.log(`✅ [TBL LOAD] ${loadedCount} champs utilisateur chargés`);

      if (loadedCount === 0) {
        console.warn('⚠️ [TBL LOAD] 0 champ restauré - operationSource stats:', sourceStats);
      }

      if (loadedCount > 0) {
        const loadedDevisName = (submissionObj as any)?.summary?.name || (submissionObj as any)?.name || `Devis ${devisId.slice(0, 8)}`;
        const loadedStatus = String((submissionObj as any)?.status || '').toLowerCase();
        // ✅ Nouveau workflow: un devis enregistré (completed) est chargé tel quel.
        // Les modifications sont locales, et une version -N est créée à l'enregistrement/sortie.

        // Mettre à jour le formulaire (préserver les clés système __*)
        setFormData((prev) => {
          const kept: TBLFormData = {};
          Object.keys(prev || {}).forEach((k) => {
            if (k.startsWith('__')) kept[k] = prev[k];
          });
          const next: TBLFormData = { ...kept, ...formattedData };
          const leadIdForSystem = hydratedLeadId || (submissionObj as any)?.leadId;
          if (leadIdForSystem) {
            next.__leadId = leadIdForSystem;
          }
          return next;
        });

        // Enregistrer l'ID de la submission sélectionnée
        setSubmissionId(devisId);

        // Marquer la signature comme "déjà sauvegardée" pour éviter un autosave immédiat inutile
        try {
          const normalized = normalizePayload(formattedData);
          const sig = computeSignature(normalized);
          lastSavedSignatureRef.current = sig;
        } catch { /* noop */ }

        // Statut UI selon le type
        if (loadedStatus === 'default-draft') {
          setIsDefaultDraft(true);
          setIsDevisSaved(false);
          setIsLoadedDevis(false);
          setOriginalDevisId(null);
          setOriginalDevisName(null);
          setHasCopiedDevis(false);
          setPendingRevisionName(null);
          pendingRevisionForSubmissionIdRef.current = null;
          setDevisName('Brouillon');
          setDevisCreatedAt(null);
        } else {
          // completed (ou autre) → affichage comme devis enregistré
          setIsLoadedDevis(true);
          setOriginalDevisId(devisId);
          const root = stripRevisionSuffix(loadedDevisName);
          setOriginalDevisName(root);
          setRevisionRootName(root);
          setIsCompletedDirty(false);
          setHasCopiedDevis(false);
          setIsDevisSaved(true);
          setIsDefaultDraft(false);
          setPendingRevisionName(null);
          pendingRevisionForSubmissionIdRef.current = null;
          setDevisName(loadedDevisName);
        }
        if ((submissionObj as any)?.createdAt) {
          setDevisCreatedAt(new Date((submissionObj as any).createdAt));
        }

        message.success(`${loadedStatus === 'default-draft' ? 'Brouillon' : `Devis "${loadedDevisName}"`} chargé avec succès (${loadedCount} champs)`);
      } else {
        console.warn('🔍 [TBL LOAD] Aucune donnée utilisateur restaurée pour ce devis');
        message.warning('Devis chargé, mais aucune donnée de formulaire à restaurer');
      }
      
      // Fermer la modal
      setDevisSelectorVisible(false);
      // console.log('🔍 [TBL] === FIN CHARGEMENT DEVIS ===');
      
    } catch (error) {
      console.error('❌ [TBL] Erreur lors du chargement du devis:', error);
      console.error('❌ [TBL] Détails de l\'erreur:', error);
      message.error('Erreur lors du chargement du devis. Vérifiez la console pour plus de détails.');
    }
  }, [api, normalizePayload, computeSignature, formatAddressValue, effectiveTreeId, user?.id, isSuperAdmin, userRole]);

  useEffect(() => {
    if (!requestedDevisId) return;
    if (requestedDevisId === submissionId) return;
    handleSelectDevis(requestedDevisId);
  }, [requestedDevisId, submissionId, handleSelectDevis]);

  // (Ancienne fonction calcul kWh supprimée: sera réintroduite si UI dédiée)

  // Gérer le chargement de la configuration et des données
  if (dataLoading || configLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spin size="large">
          <div className="p-4">Chargement des données TreeBranchLeaf...</div>
        </Spin>
      </div>
    );
  }

  if (configError) {
    return (
      <Alert
        message="Erreur de configuration"
        description={configError}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        }
      />
    );
  }

  if (dataError) {
    return (
      <Alert
        message="Erreur de chargement"
        description={dataError}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        }
      />
    );
  }

  if (!tblConfig) {
    return (
      <Alert
        message="Configuration manquante"
        description="La configuration TreeBranchLeaf n'a pas pu être chargée."
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        }
      />
    );
  }

  if (!tree || tabs.length === 0) {
    return (
      <Alert
        message="Aucune donnée disponible"
        description="Aucun arbre TreeBranchLeaf configuré ou aucun onglet disponible."
        type="warning"
        showIcon
      />
    );
  }

  // Afficher un skeleton pendant le chargement initial (Lead OU données de l'arbre)
  if (isLoadingLead || dataLoading) {
    return (
      <Layout className="h-full bg-gray-50">
        <Content className={contentPaddingClass}>
          <Row gutter={mainRowGutter} className="h-full">
            <Col xs={24}>
              <Card className="h-full shadow-sm" styles={{ body: { padding: isMobile ? 16 : isTablet ? 20 : 24 } }}>
                <Skeleton active paragraph={{ rows: 8 }} />
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
    );
  }

  return (
    <TBLValidationProvider>
    <TBLBatchProvider treeId={tree?.id || treeId} leadId={leadId}>
      <Layout className={`h-full bg-gray-50 ${isValidation ? 'tbl-validation-mode' : ''}`}>
        <Content className={contentPaddingClass}>
        <Row gutter={mainRowGutter} className="h-full">
          {/* Contenu principal pleine largeur */}
          <Col xs={24}>
            <Card className="h-full shadow-sm" styles={{ body: { padding: isMobile ? 16 : isTablet ? 20 : 24 } }}>
              {/* Dev panel capabilities (diagnostic) */}
              {useFixed && (() => { try { return localStorage.getItem('TBL_DIAG') === '1'; } catch { return false; } })() && (
                <div className="mb-4">
                  {/* Exposer le dependencyGraph globalement pour SmartCalculatedField (lecture seule) */}
                  {(() => { try { if (typeof window !== 'undefined') { window.TBL_DEP_GRAPH = devPreload.dependencyGraph; } } catch {/* noop */} })()}
                  <Suspense fallback={<Skeleton active />}>
                    <TBLDevCapabilitiesPanel preload={devPreload} />
                  </Suspense>
                </div>
              )}
              {/* En-tête compact avec Lead - Devis - Date */}
              <div className={headerContainerClass}>
                <div className="flex-1">
                  <Title level={4} className="mb-0 text-gray-800">
                    {/* 🆕 Affichage du mode + informations */}
                    {isDefaultDraft ? (
                      <>
                        {!leadId ? (
                          <span style={{ color: '#faad14' }}>📝 Mode Brouillon</span>
                        ) : (
                          <>
                            {clientData.name || 'Lead sans nom'}
                            {' - '}
                            Brouillon
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        {clientData.name || 'Aucun lead'}
                        {' - '}
                        {devisName || (tree.name ? `${tree.name} (Nouveau devis)` : 'Nouveau devis')}
                        {devisCreatedAt && ` - ${devisCreatedAt.toLocaleDateString('fr-FR')}`}
                        {isLoadedDevis && !hasCopiedDevis && (
                          <span style={{ color: '#1890ff', fontSize: '0.8em', marginLeft: 8 }}>
                            (original - modifications créeront une copie)
                          </span>
                        )}
                        {hasCopiedDevis && (
                          <span style={{ color: '#52c41a', fontSize: '0.8em', marginLeft: 8 }}>
                            (copie)
                          </span>
                        )}
                      </>
                    )}
                  </Title>
                  {/* Indicateur de sauvegarde automatique */}
                  {autosaveLast && (
                    <Text type="secondary" style={{ fontSize: '0.75em' }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      Dernière sauvegarde : {autosaveLast.toLocaleTimeString('fr-FR')}
                    </Text>
                  )}
                </div>
                
                <Space
                  direction={headerActionsDirection}
                  size={isMobile ? 'middle' : 'small'}
                  className={headerActionsClassName}
                  wrap={!isMobile}
                  align={headerActionsAlign}
                >
                  <Tooltip title="Nouveau Devis" placement="bottom">
                    <Button 
                      icon={<FileAddOutlined />}
                      onClick={handleNewDevis}
                      type="primary"
                      block={actionButtonBlock}
                    />
                  </Tooltip>
                  <Tooltip title="Sélectionner un lead" placement="bottom">
                    <Button 
                      icon={<UserOutlined />}
                      onClick={() => setLeadSelectorVisible(true)}
                      block={actionButtonBlock}
                    />
                  </Tooltip>
                  <Tooltip title="Créer un lead" placement="bottom">
                    <Button 
                      icon={<PlusOutlined />}
                      onClick={() => setLeadCreatorVisible(true)}
                      block={actionButtonBlock}
                    />
                  </Tooltip>
                  <Tooltip title={leadId ? "Enregistrer le devis" : "Sélectionnez un lead pour enregistrer"} placement="bottom">
                    <Button 
                      icon={<SaveOutlined />}
                      onClick={handleSaveDevis}
                      disabled={!leadId}
                      type={leadId && !isDevisSaved ? "primary" : "default"}
                      danger={!leadId}
                      block={actionButtonBlock}
                      style={leadId && !isDevisSaved ? { backgroundColor: '#52c41a', borderColor: '#52c41a' } : undefined}
                    >
                      {isMobile ? '' : (isDevisSaved ? 'Enregistré ✓' : 'Enregistrer')}
                    </Button>
                  </Tooltip>
                  <Tooltip title="Charger un devis" placement="bottom">
                    <Button 
                      icon={<FolderOpenOutlined />}
                      onClick={handleLoadDevis}
                      block={actionButtonBlock}
                    />
                  </Tooltip>
                  <Tooltip title="Générer PDF" placement="bottom">
                    <Button 
                      icon={<DownloadOutlined />}
                      onClick={handleGeneratePDF}
                      block={actionButtonBlock}
                    />
                  </Tooltip>
                </Space>
              </div>

              {/* Barre de progression globale */}
              <div className="mb-6">
                <Progress 
                  percent={Math.round(globalStats.completion)}
                  status={globalStats.completion === 100 ? 'success' : 'active'}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#52c41a',
                  }}
                />
              </div>

              {/* 🔄 Conteneur avec gestion du swipe (mobile uniquement) - navigation invisible */}
              <div ref={tblSwipeContainerRef}>
              {/* Onglets dynamiques */}
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                type="card"
                size={isMobile ? 'small' : 'large'}
                centered
                className={`tbl-tabs ${
                  // 🎯 LOGIQUE 100% DYNAMIQUE pour les onglets
                  tabs?.map(tab => {
                    const tabSections = tab.sections || [];
                    const requiredFields: Array<{id: string, label: string}> = [];
                    
                    // Extraire tous les champs obligatoires de cet onglet
                    tabSections.forEach(section => {
                      const sectionFields = section.fields || [];
                      sectionFields.forEach(field => {
                        if (field.required) {
                          requiredFields.push({ id: field.id, label: field.label || field.name });
                        }
                      });
                    });
                    
                    // 🎯 LOGIQUE DYNAMIQUE CORRECTE
                    if (requiredFields.length === 0) {
                      // Aucun champ obligatoire = automatiquement complet (vert)
                      return `tab-${tab.id}-complete`;
                    } else {
                      // Il y a des champs obligatoires, vérifier s'ils sont TOUS remplis
                      const allFieldsComplete = requiredFields.every(field => {
                        const value = formData[field.id];
                        return value !== null && value !== undefined && value !== '';
                      });
                      
                      return allFieldsComplete ? `tab-${tab.id}-complete` : `tab-${tab.id}-incomplete`;
                    }
                  }).join(' ') || ''
                }`}
                tabBarGutter={isMobile ? 12 : 24}
                items={[
                  // Onglet Client en premier
                  {
                    key: 'client-info',
                    label: (
                      <div className="flex items-center gap-2" style={{ padding: '8px 12px' }}>
                        <UserOutlined />
                        <span>Client</span>
                      </div>
                    ),
                    children: (
                      <div>
                        {/* Ligne 1 : Informations Client - horizontalement */}
                        <Card size="small" style={{ marginBottom: 16 }}>
                          <Title level={5} style={{ marginBottom: 12, textAlign: 'center' }}>Informations Client</Title>
                          <Row gutter={[24, 8]}>
                            <Col xs={24} sm={12} md={6}>
                              <div className="flex items-center gap-2">
                                <UserOutlined className="text-blue-500" />
                                <Text type="secondary">Nom :</Text>
                                <Text strong>{clientData.name || 'Non renseigné'}</Text>
                              </div>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                              <div className="flex items-center gap-2">
                                <MailOutlined className="text-blue-500" />
                                <Text type="secondary">Email :</Text>
                                <Text strong>{clientData.email || 'Non renseigné'}</Text>
                              </div>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                              <div className="flex items-center gap-2">
                                <PhoneOutlined className="text-blue-500" />
                                <Text type="secondary">Téléphone :</Text>
                                <Text strong>{clientData.phone || 'Non renseigné'}</Text>
                              </div>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                              <div className="flex items-center gap-2">
                                <HomeOutlined className="text-blue-500" />
                                <Text type="secondary">Adresse :</Text>
                                <Text strong>{clientData.address || 'Non renseigné'}</Text>
                              </div>
                            </Col>
                          </Row>
                        </Card>
                        
                        {/* Ligne 2 : Documents - horizontalement */}
                        <Suspense fallback={<Skeleton active />}>
                          <DocumentsSection 
                            submissionId={submissionId}
                            leadId={leadId}
                            treeId={treeId}
                            onLoadDevis={(devisId) => handleSelectDevis(devisId)}
                            onDeleteDevis={async (devisId, devisName) => {
                              try {
                                console.log('🗑️ [TBL][DELETE-DOC] Suppression du devis depuis Documents:', devisId);
                                await api.delete(`/api/treebranchleaf/submissions/${devisId}`);
                                console.log('✅ [TBL][DELETE-DOC] Devis supprimé avec succès');
                                message.success(`Devis "${devisName}" supprimé avec succès`);
                                // Recharger la liste des devis dans le modal "Charger"
                                await handleLoadDevis();
                              } catch (error) {
                                console.error('❌ [TBL][DELETE-DOC] Erreur lors de la suppression:', error);
                                message.error('Erreur lors de la suppression du devis');
                                // Ne pas throw - laisser le modal se fermer
                              }
                            }}
                          />
                        </Suspense>
                      </div>
                    )
                  },
                  // Puis les autres onglets
                  ...(tabs ? tabs.map(tab => {
                  // 🎯 Calculer l'état de cet onglet spécifique pour le badge seulement
                  // 🎯 NOUVELLE LOGIQUE : Utiliser les sections au lieu de tab.fields
                  const tabSections = tab.sections || [];
                  const requiredFields: Array<{id: string, label: string}> = [];
                  
                  // Extraire tous les champs requis de toutes les sections de cet onglet
                  tabSections.forEach(section => {
                    const sectionFields = section.fields || [];
                    sectionFields.forEach(field => {
                      if (field.required) {
                        requiredFields.push({ id: field.id, label: field.label || field.name });
                      }
                    });
                  });
                  
                  // 🔍 DEBUG COMPLET DE LA LOGIQUE DE VALIDATION
                  // 🎯 LOGIQUE FINALE - Couleurs des onglets
                  let isComplete = false;
                  let isValidatingIncomplete = false;
                  
                  if (requiredFields.length === 0) {
                    // Aucun champ requis = automatiquement complet (vert)
                    isComplete = true;
                  } else {
                    // Il y a des champs requis, vérifier s'ils sont tous remplis
                    const allFieldsComplete = requiredFields.every(field => {
                      const value = formData[field.id];
                      return value !== null && value !== undefined && value !== '';
                    });
                    
                    isComplete = allFieldsComplete;
                    // Rouge seulement si validation PDF + champs manquants
                    isValidatingIncomplete = validationState.isValidating && !allFieldsComplete;
                  }
                  

                  
                  // 🔍 Logs pour debug
                  if (isValidatingIncomplete) {
                    console.log(`🔴 [ONGLET ROUGE] ${tab.label} - incomplet pendant validation PDF`);
                  } else if (isComplete && requiredFields.length > 0) {
                    console.log(`🟢 [ONGLET VERT] ${tab.label} - complet (${requiredFields.length} champs requis)`);
                  } else {
                    console.log(`⚪ [ONGLET NORMAL] ${tab.label} - normal`);
                  }

                  // 🎯 STYLE DYNAMIQUE - API NATIVE ANT DESIGN
                  const tabStyle = (() => {
                    console.log(`🎯 [STYLE DEBUG] ${tab.label}: isComplete=${isComplete}, requiredFields.length=${requiredFields.length}, isValidatingIncomplete=${isValidatingIncomplete}`);
                    
                    // Si tentative PDF ET onglet incomplet → ROUGE
                    if (isValidatingIncomplete && !isComplete) {
                      console.log(`🔴 [STYLE] ${tab.label} → ROUGE (validation PDF échouée)`);
                      return {
                        backgroundColor: '#fee2e2',
                        borderColor: '#dc2626',
                        color: '#991b1b'
                      };
                    }
                    // Si onglet complet (même si 0/0) → VERT  
                    else if (isComplete) {
                      console.log(`🟢 [STYLE] ${tab.label} → VERT (${requiredFields.length} champs requis)`);
                      return {
                        backgroundColor: '#0f766e', // Même vert que le bouton "Nouveau Devis"
                        borderColor: '#0f766e',
                        color: '#ffffff' // Texte en blanc
                      };
                    }
                    // Sinon onglet normal (incomplet)
                    console.log(`⚪ [STYLE] ${tab.label} → NORMAL (incomplet)`);
                    return {};
                  })();

                  return {
                    key: tab.id,
                    // Pas de style sur l'item - seulement sur le label
                    label: (
                    <div 
                      className="flex items-center gap-2" 
                      style={{
                        ...tabStyle,  // Appliquer le style directement sur le label
                        padding: '8px 12px',
                        borderRadius: '6px',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <FileTextOutlined />
                      <span>{tab.label}</span>
                      {/* Badge de completion avec couleurs dynamiques */}
                      {(() => {
                        // 🎯 UTILISER LA MÊME LOGIQUE QUE POUR LES COULEURS DES ONGLETS
                        // Réutiliser les mêmes requiredFields calculés plus haut
                        // 🎯 UTILISER LA MÊME LOGIQUE COHÉRENTE POUR LE BADGE
                        const badgeIsIncomplete = validationState.isValidating && !isComplete && requiredFields.length > 0;
                        
                        let badgeClass = "text-xs px-2 py-1 rounded-full";
                        if (badgeIsIncomplete) {
                          badgeClass += " bg-red-100 text-red-600"; // Rouge si incomplet pendant validation
                        } else if (isComplete) {
                          badgeClass += " bg-green-100 text-green-700"; // VERT si tous les champs obligatoires sont remplis
                        } else {
                          badgeClass += " bg-gray-100 text-gray-600"; // GRIS par défaut
                        }

                        // 🎯 COMPTER BASÉ SUR LES SECTIONS (COHÉRENT)
                        const allTabFields: Array<{id: string}> = [];
                        tabSections.forEach(section => {
                          const sectionFields = section.fields || [];
                          sectionFields.forEach(field => {
                            allTabFields.push({ id: field.id });
                          });
                        });
                        
                        const completedFields = allTabFields.filter(field => {
                          const value = formData[field.id];
                          return value !== undefined && value !== null && value !== '';
                        });

                        return (
                          <span className={badgeClass}>
                            {completedFields.length}
                            /
                            {allTabFields.length}
                          </span>
                        );
                      })()}
                    </div>
                  ),
                  children: (
                    <div className={isMobile ? 'p-0' : 'p-4'}>
                      <TBLTabContentWithSections
                        sections={tab.sections || []}
                        fields={tab.fields || []}
                        formData={formData}
                        onChange={handleFieldChange}
                        treeId={effectiveTreeId}
                        tree={tree}
                        rawNodes={rawNodes}
                        disabled={saving}
                        validationState={validationState}
                        validationActions={validationActions}
                        // Passer explicitement la liste de subTabs définie au niveau de l'onglet
                        tabSubTabs={tab.subTabs}
                        tabId={tab.id}
                        submissionId={submissionId}
                        // 🔄 Props pour navigation swipe mobile
                        controlledActiveSubTab={isMobile ? activeSubTabs[tab.id] : undefined}
                        onSubTabChange={isMobile ? (subTabKey) => handleSwipeSubTabChange(tab.id, subTabKey) : undefined}
                        onSubTabsComputed={isMobile ? (subTabs) => handleSubTabsComputed(tab.id, subTabs) : undefined}
                      />
                    </div>
                  )
                };
                }) : [])
                ]}
              />
              </div> {/* Fin conteneur swipe */}

              {/* Indicateur d'auto-sauvegarde */}
              {autoSaveEnabled && autosaveLast && (
                <div className="mt-4 text-center">
                  <Text type="secondary" className="text-xs">
                    <ClockCircleOutlined className="mr-1" />
                    Dernière sauvegarde automatique: {autosaveLast.toLocaleTimeString()}{isAutosaving ? ' (en cours...)' : ''}
                  </Text>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Content>

      {/* Modal de sauvegarde */}
      <Modal
        title="Sauvegarder comme devis"
        open={saveModalVisible}
        onCancel={() => setSaveModalVisible(false)}
        footer={null}
      >
        <Form
          layout="vertical"
          onFinish={handleSaveAsDevis}
          initialValues={{
            projectName: `Projet ${tree.name} - ${new Date().toLocaleDateString()}`
          }}
        >
          <Form.Item
            label="Nom du projet"
            name="projectName"
            rules={[{ required: true, message: 'Nom du projet requis' }]}
          >
            <Input placeholder="Nom du projet..." />
          </Form.Item>

          <Form.Item
            label="Notes"
            name="notes"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Notes optionnelles..."
            />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => setSaveModalVisible(false)}>
                Annuler
              </Button>
              <Button 
                onClick={() => {
                  // 🧪 TEST: Déclencher la validation
                  validationActions.startValidation();
                  console.log('🎯 VALIDATION DÉCLENCHÉE !', {
                    isValidating: validationState.isValidating,
                    completedTabs: Array.from(validationState.completedTabs),
                    incompleteTabs: Array.from(validationState.incompleteTabs)
                  });
                }}
                style={{ background: '#f0f0f0' }}
              >
                🧪 Tester Validation
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={saving}
              >
                Sauvegarder
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de sélection de lead - Lazy loaded */}
      {leadSelectorVisible && (
        <Suspense fallback={<Spin />}>
          <LeadSelectorModal
            open={leadSelectorVisible}
            onClose={() => {
              // console.log('🔍 [TBL] Fermeture LeadSelectorModal');
              setLeadSelectorVisible(false);
            }}
            onSelectLead={handleSelectLead}
          />
        </Suspense>
      )}

      {/* Modal de création de lead - Lazy loaded */}
      {leadCreatorVisible && (
        <Suspense fallback={<Spin />}>
          <LeadCreatorModalAdvanced
            open={leadCreatorVisible}
            onClose={() => {
              // console.log('➕ [TBL] Fermeture LeadCreatorModal');
              setLeadCreatorVisible(false);
            }}
            onCreateLead={handleCreateLead}
            onLeadCreated={(lead) => {
              // console.log('✅ Lead créé:', lead);
              setLeadCreatorVisible(false);
              
              // Si le modal de création de devis est ouvert, on met à jour le lead sélectionné
              if (devisCreatorVisible) {
                setSelectedLeadForDevis(lead as TBLLead);
                message.success(`Lead créé et sélectionné : ${lead.firstName} ${lead.lastName}`);
              } else {
                // Sinon, comportement normal : naviguer vers le nouveau lead dans TBL
                window.location.href = `/tbl/${lead.id}`;
              }
            }}
          />
        </Suspense>
      )}

      {/* Modal de sélection de devis */}
      <Modal
        title="Charger un devis"
        open={devisSelectorVisible}
        onCancel={() => setDevisSelectorVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setDevisSelectorVisible(false)}>
            Annuler
          </Button>
        ]}
        width={isMobile ? 360 : isTablet ? 640 : 800}
      >
        <div className="space-y-4">
          {/* Barre de recherche identique à la modal lead */}
          <div className={isMobile ? 'flex flex-col gap-2' : 'flex items-center space-x-2'}>
            <Input
              placeholder="Rechercher dans les devis..."
              prefix={<SearchOutlined />}
              value={devisSearchTerm}
              onChange={(e) => setDevisSearchTerm(e.target.value)}
              className={isMobile ? 'w-full' : 'flex-1'}
            />
            <Button 
              type="primary" 
              icon={<SearchOutlined />}
              block={isMobile}
            >
              <span className="hidden sm:inline">Rechercher</span>
            </Button>
          </div>
          
          {availableDevis.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileTextOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
              <p>Aucun devis trouvé pour {clientData.name || 'ce lead'}</p>
              <Button 
                type="primary" 
                className="mt-4"
                icon={<FileTextOutlined />}
                onClick={() => {
                  setDevisSelectorVisible(false);
                  handleNewDevis();
                }}
              >
                Créer un nouveau devis
              </Button>
            </div>
          ) : (
            <div>
              {!isMobile && (
                <div className="bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-4 gap-4 px-4 py-3 text-sm font-medium text-gray-600" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                    <div>Nom</div>
                    <div>Contact</div>
                    <div>Entreprise</div>
                    <div>Actions</div>
                  </div>
                </div>
              )}
              
              {/* Corps du tableau avec style identique */}
              <div className={isMobile ? 'space-y-3' : 'max-h-80 overflow-y-auto'}>
                {(() => {
                  // Récupérer tous les devis avec infos lead
                  const allDevis = availableDevis.flatMap((lead) => 
                    (lead.submissions || [])
                      // ⚠️ Règle produit: on n'affiche pas les anciens status 'draft' (il n'y a qu'UN seul brouillon)
                      .filter((devis) => devis.status !== 'draft')
                      .map((devis) => ({
                        ...devis,
                        // Le brouillon s'appelle toujours "Brouillon" pour éviter toute confusion.
                        name: devis.status === 'completed' ? devis.name : 'Brouillon',
                        leadInfo: {
                          id: lead.id,
                          firstName: lead.firstName,
                          lastName: lead.lastName,
                          email: lead.email,
                          company: lead.company || 'Non renseigné'
                        }
                      }))
                  );
                  
                  // Ajouter la numérotation automatique
                  const devisWithNumbers = addNumbersToDevisNames(allDevis);
                  
                  // Filtrer selon le terme de recherche
                  return devisWithNumbers
                    .filter((devis) => {
                      if (!devisSearchTerm) return true;
                      const searchLower = devisSearchTerm.toLowerCase();
                      return (
                        devis.displayName?.toLowerCase().includes(searchLower) ||
                        devis.name?.toLowerCase().includes(searchLower) ||
                        devis.treeName?.toLowerCase().includes(searchLower)
                      );
                    })
                    .map((devis) => (
                      isMobile ? (
                        <Card
                          key={devis.id}
                          size="small"
                          className="shadow-sm border border-gray-100"
                        >
                          <Space direction="vertical" size={8} className="w-full">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-blue-500">📄</span>
                                <span className="font-medium text-gray-900">{devis.displayName}</span>
                                <Tag
                                  color={devis.status === 'completed' ? 'green' : 'gold'}
                                >
                                  {devis.status === 'completed' ? 'Enregistré' : 'Brouillon'}
                                </Tag>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="primary"
                                  size="small"
                                  onClick={() => handleSelectDevis(devis.id, devis.leadInfo)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  Ouvrir
                                </Button>
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDevis(devis.id, devis.displayName);
                                  }}
                                  className="hover:bg-red-50"
                                  title="Supprimer ce devis"
                                >
                                  🗑️
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <span>✉️</span>
                                <span>{devis.leadInfo.email}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span>📞</span>
                                <span>+32 477 12 34 56</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span>🏢</span>
                                <span>{devis.leadInfo.company}</span>
                              </div>
                            </div>
                          </Space>
                        </Card>
                      ) : (
                        <div
                          key={devis.id}
                          className="grid grid-cols-4 gap-4 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors items-center"
                          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto' }}
                        >
                          {/* Nom - UNE SEULE LIGNE avec icône et numérotation */}
                          <div className="flex items-center space-x-2">
                            <span className="text-blue-500">📄</span>
                            <span className="font-medium text-gray-900">{devis.displayName}</span>
                            <Tag
                              color={devis.status === 'completed' ? 'green' : 'gold'}
                            >
                              {devis.status === 'completed' ? 'Enregistré' : 'Brouillon'}
                            </Tag>
                          </div>
                        
                        {/* Contact - EXACTEMENT comme dans la modal lead */}
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <span>✉️</span>
                            <span>{devis.leadInfo.email}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <span>📞</span>
                            <span>+32 477 12 34 56</span>
                          </div>
                        </div>
                        
                        {/* Entreprise - UNE SEULE LIGNE */}
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <span>🏢</span>
                          <span>{devis.leadInfo.company}</span>
                        </div>
                        
                        {/* Actions - boutons Sélectionner et Supprimer */}
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => handleSelectDevis(devis.id, devis.leadInfo)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Sélectionner
                          </Button>
                          <Button
                            type="text"
                            size="small"
                            danger
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDevis(devis.id, devis.displayName);
                            }}
                            className="hover:bg-red-50"
                            title="Supprimer ce devis"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                      )
                    ));
                })()}
              </div>
              
              {/* Footer avec pagination identique à la modal lead */}
              {!isMobile && (
                <div className="flex justify-between items-center mt-4 px-4 py-2 text-sm text-gray-600">
                  <div>
                    {(() => {
                      const totalDevis = availableDevis.flatMap(lead => lead.submissions || []).length;
                      const filteredDevis = availableDevis.flatMap((lead) => 
                        lead.submissions?.map((devis) => ({
                          ...devis,
                          leadInfo: { firstName: lead.firstName, lastName: lead.lastName, email: lead.email, company: lead.company }
                        })) || []
                      ).filter((devis) => {
                        if (!devisSearchTerm) return true;
                        const searchLower = devisSearchTerm.toLowerCase();
                        return (
                          devis.name?.toLowerCase().includes(searchLower) ||
                          devis.treeName?.toLowerCase().includes(searchLower)
                        );
                      }).length;
                      return `${filteredDevis} sur ${totalDevis} devis`;
                    })()}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span>1-{Math.min(availableDevis.flatMap(lead => lead.submissions || []).length, 10)} sur {availableDevis.flatMap(lead => lead.submissions || []).length} devis</span>
                    <Button size="small" disabled>1</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Modal de création de devis */}
      <Modal
        title="Créer un nouveau devis"
        open={devisCreatorVisible}
        onCancel={() => {
          setDevisCreatorVisible(false);
          setDevisName('');
          setSelectedLeadForDevis(null);
          form.resetFields();
        }}
        footer={null}
        width={isMobile ? 360 : isTablet ? 440 : 500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateDevis}
        >
          <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">
              Lead sélectionné :
            </p>
            {selectedLeadForDevis ? (
              <div className="flex items-center justify-between">
                <strong className="text-base">
                  {selectedLeadForDevis.firstName} {selectedLeadForDevis.lastName}
                  {selectedLeadForDevis.email && <span className="text-sm text-gray-500 ml-2">({selectedLeadForDevis.email})</span>}
                </strong>
                <Button 
                  size="small" 
                  onClick={() => setSelectedLeadForDevis(null)}
                  danger
                >
                  Changer
                </Button>
              </div>
            ) : clientData.id && leadId ? (
              <div className="flex items-center justify-between">
                <strong className="text-base">{clientData.name}</strong>
                <Button 
                  size="small" 
                  onClick={() => setLeadSelectorVisible(true)}
                >
                  Changer
                </Button>
              </div>
            ) : (
              <Space direction="vertical" className="w-full">
                <Button 
                  icon={<SearchOutlined />}
                  onClick={() => setLeadSelectorVisible(true)}
                  block
                >
                  Sélectionner un lead existant
                </Button>
                <Button 
                  icon={<UserOutlined />}
                  onClick={() => setLeadCreatorVisible(true)}
                  type="dashed"
                  block
                >
                  Créer un nouveau lead
                </Button>
                <Alert
                  message="Lead obligatoire"
                  description="Vous devez sélectionner ou créer un lead pour créer un devis"
                  type="warning"
                  showIcon
                  className="mt-2"
                />
              </Space>
            )}
          </div>
          
          <Form.Item
            label="Nom du devis"
            name="devisName"
            rules={[{ required: true, message: 'Le nom du devis est requis' }]}
          >
            <Input 
              placeholder="Entrez le nom du devis..."
            />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => {
                setDevisCreatorVisible(false);
                setDevisName('');
                setSelectedLeadForDevis(null);
                form.resetFields();
              }}>
                Annuler
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                disabled={!selectedLeadForDevis && !leadId}
                onClick={() => {}}
              >
                Créer le devis
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de génération PDF */}
      <Modal
        title="📄 Générer un document"
        open={pdfModalVisible}
        onCancel={() => setPdfModalVisible(false)}
        footer={null}
        width={isMobile ? 360 : 600}
      >
        <div className="space-y-4">
          {/* Info client */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <UserOutlined className="text-blue-600" />
              <span className="font-medium text-blue-900">Client : {clientData.name}</span>
            </div>
            <div className="text-sm text-blue-700">
              {clientData.email && <div>✉️ {clientData.email}</div>}
              {clientData.phone && <div>📞 {clientData.phone}</div>}
            </div>
          </div>
          
          {/* Liste des templates */}
          {loadingTemplates ? (
            <div className="text-center py-8">
              <Spin tip="Chargement des templates..." />
            </div>
          ) : availableTemplates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileTextOutlined style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }} />
              <p>Aucun template disponible pour cet arbre</p>
              <p className="text-sm">Contactez l'administrateur pour en ajouter</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-3">
                Sélectionnez le type de document à générer :
              </p>
              {availableTemplates.map((template) => (
                <Card
                  key={template.id}
                  hoverable
                  className="cursor-pointer border-2 hover:border-blue-400 transition-colors"
                  onClick={() => !generatingPdf && handleGeneratePDFWithTemplate(template.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {template.type === 'QUOTE' && '📋'}
                        {template.type === 'INVOICE' && '🧾'}
                        {template.type === 'CONTRACT' && '📝'}
                        {template.type === 'ORDER' && '📦'}
                        {template.type === 'PRESENTATION' && '📊'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-gray-500">{template.description}</div>
                        )}
                      </div>
                    </div>
                    <Button 
                      type="primary" 
                      loading={generatingPdf}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGeneratePDFWithTemplate(template.id);
                      }}
                    >
                      Générer
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* 🆕 Modal d'enregistrement du devis - Permet de choisir le nom */}
      <Modal
        title="💾 Enregistrer le devis"
        open={saveDevisModalVisible}
        onCancel={() => {
          setSaveDevisModalVisible(false);
          setSaveDevisName('');
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setSaveDevisModalVisible(false);
              setSaveDevisName('');
            }}
          >
            Annuler
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            loading={isSavingDevis}
            onClick={handleConfirmSaveDevis}
            disabled={!saveDevisName.trim()}
          >
            Enregistrer
          </Button>
        ]}
        width={isMobile ? 360 : 500}
      >
        <div className="space-y-4">
          {/* Info client */}
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <UserOutlined className="text-green-600" />
              <span className="font-medium text-green-900">Client : {clientData.name || 'Non renseigné'}</span>
            </div>
            <div className="text-sm text-green-700">
              {clientData.email && <div>✉️ {clientData.email}</div>}
              {clientData.phone && <div>📞 {clientData.phone}</div>}
            </div>
          </div>
          
          {/* Champ nom du devis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom du devis <span className="text-red-500">*</span>
            </label>
            <Input
              size="large"
              placeholder="Entrez le nom du devis..."
              value={saveDevisName}
              onChange={(e) => setSaveDevisName(e.target.value)}
              onPressEnter={() => {
                if (saveDevisName.trim() && !isSavingDevis) {
                  handleConfirmSaveDevis();
                }
              }}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Si ce nom existe déjà, un numéro sera automatiquement ajouté (ex: "Mon Devis (2)")
            </p>
          </div>
          
          {/* Résumé des données */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Champs remplis :</span>
                <span className="font-medium">{Object.keys(formData).filter(k => !k.startsWith('__') && formData[k] !== null && formData[k] !== undefined && formData[k] !== '').length}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Mode actuel :</span>
                <span className="font-medium">{isDefaultDraft ? 'Brouillon (nouveau)' : isLoadedDevis ? 'Copie de devis' : 'Édition'}</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </Layout>
    </TBLBatchProvider>
    </TBLValidationProvider>
  );
};

export default TBL;

// 🆕 Composant pour le contenu d'un onglet TBL avec sections hiérarchiques (ré-implémenté corrigé)
interface TBLTabContentWithSectionsProps {
  sections: TBLSection[];
  fields: TBLField[]; // fallback à plat
  formData: TBLFormData;
  onChange: (fieldId: string, value: string | number | boolean | string[] | null | undefined) => void;
  treeId?: string; // ID de l'arbre pour les appels backend
  tree?: any; // Arbre structuré
  rawNodes?: Array<{ id: string; parentId: string | null; type: string; label: string; order: number }>; // 🔥 NOUVEAU: Nœuds bruts pour Cascader
  disabled?: boolean;
  validationState?: any;
  validationActions?: any;
  tabSubTabs?: { key: string; label: string }[] | undefined;
  tabId?: string;
  submissionId?: string | null;
  // 🔄 Props pour navigation swipe centralisée
  controlledActiveSubTab?: string;
  onSubTabChange?: (subTabKey: string | undefined) => void;
  onSubTabsComputed?: (subTabs: { key: string; label: string }[]) => void;
}

const TBLTabContentWithSections: React.FC<TBLTabContentWithSectionsProps> = React.memo(({
  sections,
  fields,
  formData,
  onChange,
  treeId,
  _tree,
  rawNodes = [],
  _validationState,
  _validationActions,
  disabled = false
  ,
  tabSubTabs,
  tabId,
  submissionId,
  controlledActiveSubTab,
  onSubTabChange,
  onSubTabsComputed
}) => {
  const stats = useMemo(() => {
    let total = 0;
    let required = 0;
    let completed = 0;
    const walk = (secs: TBLSection[]) => {
      secs.forEach(s => {
        s.fields.forEach(f => {
          total += 1;
          if (f.required) {
            required += 1;
            const v = formData[f.id];
            if (v !== undefined && v !== null && v !== '') completed += 1;
          }
        });
        if (s.subsections && s.subsections.length) walk(s.subsections);
      });
    };
    walk(sections);
    if (!sections.length && fields.length) {
      fields.forEach(f => {
        total += 1;
        if (f.required) {
          required += 1;
          const v = formData[f.id];
          if (v !== undefined && v !== null && v !== '') completed += 1;
        }
      });
    }
    return { total, required, completed };
  }, [sections, fields, formData]);

  // ✅ STABILISER onChange pour éviter les re-rendus en cascade !
  const stableOnChange = useCallback((fieldId: string, value: unknown) => {
    console.log(`🟨🟨🟨 [TBLTabContentWithSections] stableOnChange appelé: fieldId=${fieldId}, value=${value}`);
    console.log(`🟨🟨🟨 [TBLTabContentWithSections] onChange.name="${onChange.name}", typeof="${typeof onChange}"`);
    console.log(`🟨🟨🟨 [TBLTabContentWithSections] onChange toString:`, onChange.toString().substring(0, 200));
    try {
      onChange(fieldId, value);
      console.log(`🟨🟨🟨 [TBLTabContentWithSections] onChange APPELÉ - fin (succès)`);
    } catch (error) {
      console.error(`❌❌❌ [TBLTabContentWithSections] ERREUR dans onChange:`, error);
      throw error;
    }
  }, [onChange]);

  const getFieldSubTabs = (item: any): string[] => {
    if (!item) return [];
    const rawKeys = Array.isArray(item.subTabKeys) && item.subTabKeys.length
      ? item.subTabKeys
      : Array.isArray(item.subTabKey)
        ? item.subTabKey
        : item.subTabKey
          ? [item.subTabKey]
          : [];
    return rawKeys
      .map((entry: unknown) => typeof entry === 'string' ? entry.trim() : String(entry ?? ''))
      .filter(Boolean);
  };

  // Subtabs: RESPECTER L'ORDRE DU TREEBRANCH LEAF (metadata.subTabs en priorité)
  const allSubTabs = useMemo(() => {
    const orderedTabs: { key: string; label: string }[] = [];
    const addedKeys = new Set<string>();
    let hasDefault = false;
    
    // 🔧 FIX: Déterminer si on a des sous-onglets explicitement définis dans TreeBranchLeaf
    const hasExplicitSubTabs = Array.isArray(tabSubTabs) && tabSubTabs.length > 0;
    
    // 1️⃣ PRIORITÉ: Ajouter les sous-onglets depuis metadata.subTabs dans l'ordre TreeBranchLeaf
    try {
      if (hasExplicitSubTabs) {
        tabSubTabs.forEach((st) => {
          if (!st) return;
          const key = typeof st === 'string' ? st : (st.key || String(st));
          const label = typeof st === 'string' ? st : (st.label || key);
          if (!addedKeys.has(key)) {
            orderedTabs.push({ key, label });
            addedKeys.add(key);
          }
        });
      }
    } catch { /* ignore */ }
    
    // 2️⃣ SECONDAIRE: Ajouter les sous-onglets trouvés dans les champs
    // 🔧 FIX CRITIQUE: NE PAS ajouter de sous-onglets provenant des champs si une liste explicite
    // est définie dans TreeBranchLeaf - cela évite que des sous-onglets "parasites" comme "Générales"
    // apparaissent alors qu'ils ne sont pas dans la définition de la branche
    if (!hasExplicitSubTabs) {
      const addFieldKey = (k?: string | null) => {
        if (!k) return;
        const key = String(k);
        if (!addedKeys.has(key)) {
          orderedTabs.push({ key, label: key });
          addedKeys.add(key);
        }
      };
      sections.forEach(s => s.fields.forEach(f => getFieldSubTabs(f).forEach(addFieldKey)));
      fields.forEach(f => getFieldSubTabs(f).forEach(addFieldKey));
    }
    
    // 3️⃣ Détecter si des champs n'ont pas de sous-onglet assigné (ou ont un sous-onglet non reconnu)
    const recognizedKeys = new Set(orderedTabs.map(t => t.key));
    const detectDefault = (field: any) => {
      const fieldSubTabs = getFieldSubTabs(field);
      // Champ sans sous-onglet = besoin de "Général"
      if (fieldSubTabs.length === 0) {
        hasDefault = true;
        return;
      }
      // 🔧 FIX: Si le champ a un sous-onglet qui n'est PAS dans la liste explicite,
      // on ne crée PAS de sous-onglet "Général" pour ça - le champ sera simplement ignoré
      // car il a un sous-onglet invalide/non défini dans TreeBranchLeaf
      // (le champ reste visible si on ne filtre pas par sous-onglet)
    };
    // When checking for a default (unassigned fields), ignore sections/fields marked as displayOnly (displayAlways)
    sections.forEach(s => {
      const meta = (s as any).metadata || {};
      const sectionAlwaysVisible = !!meta.displayAlways || /affich|aperç|display/i.test(s.label || '');
      if (sectionAlwaysVisible) return; // don't count these fields as requiring default
      s.fields.forEach(f => detectDefault(f));
    });
    // For top-level fields (not in sections), always include in detection
    fields.forEach(f => detectDefault(f));
    
    // 4️⃣ Ajouter 'Général' seulement s'il y a des champs sans sous-onglet assigné
    if (hasDefault && !addedKeys.has('__default__')) {
      orderedTabs.push({ key: '__default__', label: 'Général' });
    }
    
    return orderedTabs;
  }, [sections, fields, tabSubTabs]);

  // 🔄 Notifier le parent des sous-onglets calculés (pour la navigation swipe)
  useEffect(() => {
    if (onSubTabsComputed && allSubTabs.length > 0) {
      onSubTabsComputed(allSubTabs);
    }
  }, [allSubTabs, onSubTabsComputed]);

  // 🔄 État local du sous-onglet (utilisé si pas de contrôle parent)
  const [localActiveSubTab, setLocalActiveSubTab] = useState<string | undefined>(allSubTabs.length > 0 ? allSubTabs[0].key : undefined);
  
  // 🔄 Utiliser soit l'état contrôlé (parent) soit l'état local
  const activeSubTab = controlledActiveSubTab !== undefined ? controlledActiveSubTab : localActiveSubTab;
  const setActiveSubTab = useCallback((value: string | undefined) => {
    if (onSubTabChange) {
      onSubTabChange(value);
    } else {
      setLocalActiveSubTab(value);
    }
  }, [onSubTabChange]);
  
  // 🔧 FIX: Retirer activeSubTab des dépendances pour éviter la boucle infinie (React Error #185)
  // On utilise une ref pour accéder à la valeur actuelle sans créer de dépendance
  useEffect(() => { 
    // Ne mettre à jour que si on n'est pas en mode contrôlé
    if (controlledActiveSubTab !== undefined) return;
    
    setLocalActiveSubTab(prev => {
      // Si allSubTabs est vide, garder la valeur actuelle
      if (allSubTabs.length === 0) return prev;
      // Si l'onglet actuel n'existe plus dans allSubTabs, sélectionner le premier
      if (!allSubTabs.find(st => st.key === prev)) return allSubTabs[0].key;
      // Sinon garder la valeur actuelle
      return prev;
    });
  }, [allSubTabs, controlledActiveSubTab]);

  // Log ActiveSubTab supprimé pour performance (utilisez window.enableTBLDebug() si besoin)

  const renderContent = () => {
    if (sections.length) {
      // Si on a plusieurs sous-onglets, ou si l'onglet a explicitement des subTabs définis
      const explicitTabSubTabs = Array.isArray(tabSubTabs) && tabSubTabs.length > 0;
      const showSubTabs = explicitTabSubTabs || allSubTabs.length > 1;
      
      // 🔧 FIX: Créer un Set des sous-onglets reconnus pour vérification rapide
      const recognizedSubTabKeys = new Set(allSubTabs.map(st => st.key));

      const filteredSections = sections.map(section => {
        const sectionMeta = (section as any).metadata || {};
        const sectionAlwaysVisible = (sectionMeta.displayAlways === true || String(sectionMeta.displayAlways) === 'true') || /affich|aperç|display/i.test(section.label || '');
        // Logs supprimés pour performance - utilisez window.enableTBLDebug() pour déboguer
        
        // CRITICAL: If sectionAlwaysVisible, keep ALL fields regardless of subTab
        const filteredFields = sectionAlwaysVisible 
          ? section.fields  // Keep ALL fields if section is marked displayAlways
          : section.fields.filter(f => {
              if (!activeSubTab) return true;
              const assignedTabs = getFieldSubTabs(f);
              const fMeta = (f as any).metadata || {};
              const fieldAlwaysVisible = (fMeta.displayAlways === true || String(fMeta.displayAlways) === 'true');
              if (fieldAlwaysVisible) return true;
              
              // Champ sans sous-onglet assigné → afficher dans "Général" (__default__)
              if (assignedTabs.length === 0) {
                return activeSubTab === '__default__';
              }
              
              // 🔧 FIX CRITIQUE: Si le champ a un sous-onglet qui n'est PAS reconnu dans la liste
              // (ex: "Générales" alors que la branche définit ["Photo", "Électricité", "Chauffage", "Revenu"]),
              // traiter ce champ comme s'il n'avait pas de sous-onglet = afficher dans "Général"
              const hasRecognizedSubTab = assignedTabs.some(tab => recognizedSubTabKeys.has(tab));
              if (!hasRecognizedSubTab) {
                return activeSubTab === '__default__';
              }
              
              return assignedTabs.includes(activeSubTab);
            });
        
        return {
          ...section,
          fields: filteredFields
        };
      });
      // Log filteredSections summary supprimé pour performance

      return (
        <div className="space-y-6">
          {showSubTabs && (
            <div style={{ 
              display: 'flex', 
              gap: 8, 
              marginBottom: 8,
              overflowX: 'auto',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              paddingBottom: 4
            }} className="hide-scrollbar">
              {(allSubTabs || []).map(st => (
                <Button
                  key={st.key}
                  size="small"
                  type={st.key === activeSubTab ? 'primary' : 'default'}
                  onClick={() => setActiveSubTab(st.key)}
                  style={{ flexShrink: 0 }}
                >
                  {st.label}
                </Button>
              ))}
            </div>
          )}
          {filteredSections.map(section => (
            <TBLSectionRenderer
              key={section.id}
              section={section}
              formData={formData}
              onChange={stableOnChange}
              treeId={treeId}
              allNodes={rawNodes}
              allSections={sections}
              disabled={disabled}
              submissionId={submissionId}
              activeSubTab={activeSubTab}
            />
          ))}
        </div>
      );
    }
    if (fields.length) {
      // When no explicit sections, build a synthetic one and respect subTabs
      const synthetic: TBLSection = {
        id: '__synthetic__',
        title: 'Champs',
        name: 'Champs',
        fields: fields,
        subsections: []
      } as unknown as TBLSection;
      const explicitTabSubTabs = Array.isArray(tabSubTabs) && tabSubTabs.length > 0;
      const showSubTabs = explicitTabSubTabs || allSubTabs.length > 1;
      
      // 🔧 FIX: Créer un Set des sous-onglets reconnus pour vérification rapide
      const recognizedSubTabKeys = new Set(allSubTabs.map(st => st.key));
      
      const filteredSyntheticFields = synthetic.fields.filter(f => {
        const meta = (f as any).metadata || {};
        const fieldAlwaysVisible = (meta.displayAlways === true || String(meta.displayAlways) === 'true');
        if (!activeSubTab) return true;
        if (fieldAlwaysVisible) return true;
        const assignedTabs = getFieldSubTabs(f);
        
        // Champ sans sous-onglet assigné → afficher dans "Général" (__default__)
        if (assignedTabs.length === 0) {
          return activeSubTab === '__default__';
        }
        
        // 🔧 FIX CRITIQUE: Si le champ a un sous-onglet qui n'est PAS reconnu,
        // traiter ce champ comme s'il n'avait pas de sous-onglet = afficher dans "Général"
        const hasRecognizedSubTab = assignedTabs.some(tab => recognizedSubTabKeys.has(tab));
        if (!hasRecognizedSubTab) {
          return activeSubTab === '__default__';
        }
        
        return assignedTabs.includes(activeSubTab);
      });
      const filteredSynthetic: TBLSection = { ...synthetic, fields: filteredSyntheticFields };
      return (
        <div>
          {showSubTabs && (
            <div style={{ 
              display: 'flex', 
              gap: 8, 
              marginBottom: 8,
              overflowX: 'auto',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              paddingBottom: 4
            }} className="hide-scrollbar">
              {(allSubTabs || []).map(st => (
                <Button
                  key={st.key}
                  size="small"
                  type={st.key === activeSubTab ? 'primary' : 'default'}
                  onClick={() => setActiveSubTab(st.key)}
                  style={{ flexShrink: 0 }}
                >
                  {st.label}
                </Button>
              ))}
            </div>
          )}
          <TBLSectionRenderer
            section={filteredSynthetic}
            formData={formData}
            onChange={stableOnChange}
            treeId={treeId}
            allNodes={rawNodes}
            allSections={sections}
            disabled={disabled}
            submissionId={submissionId}
            activeSubTab={activeSubTab}
          />
        </div>
      );
    }
    return <div className="text-sm text-gray-400">Aucun champ.</div>;
  };

  return (
    <div>
      {renderContent()}
      <div className="mt-6 text-xs text-gray-400 text-right">
        {stats.completed}/{stats.required} requis complétés
      </div>
    </div>
  );

});
