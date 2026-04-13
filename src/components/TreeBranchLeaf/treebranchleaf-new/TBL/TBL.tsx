import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';

// 🎯 CSS pour astérisques verts par défaut
import '../../../../styles/tbl-green-asterisk.css';

// 🚀 PERF: Debounce utility
function debounce<T extends (...args: unknown[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
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
  Tag,
  Switch,
  Result,
  Checkbox
} from 'antd';
import { FileTextOutlined, DownloadOutlined, ClockCircleOutlined, FolderOpenOutlined, PlusOutlined, UserOutlined, FileAddOutlined, SearchOutlined, MailOutlined, PhoneOutlined, HomeOutlined, SwapOutlined, LeftOutlined, RightOutlined, SaveOutlined, SendOutlined, PaperClipOutlined, ToolOutlined, CheckCircleOutlined, ExclamationCircleOutlined, EditOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useAuth } from '../../../../auth/useAuth';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTreeBranchLeafConfig } from '../../hooks/useTreeBranchLeafConfig';
import { useAuthenticatedApi } from '../../../../hooks/useAuthenticatedApi';
import { blockGetRequestsTemporarily, unblockGetRequests, clearAllNodeValueCaches } from '../../../../hooks/useNodeCalculatedValue';
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
import { useTranslation } from 'react-i18next';
import { logger } from '../../../../lib/logger';

// 🚀 LAZY IMPORTS - Composants chargés uniquement quand nécessaires (modals, panels dev)
const DocumentsSection = lazy(() => import('../../../Documents/DocumentsSection'));
const TBLDevCapabilitiesPanel = lazy(() => import('./components/Dev/TBLDevCapabilitiesPanel'));
const LeadSelectorModal = lazy(() => import('../../lead-integration/LeadSelectorModal'));
const LeadCreatorModalAdvanced = lazy(() => import('../../lead-integration/LeadCreatorModalAdvanced'));
const GestionnairePanel = lazy(() => import('./GestionnairePanel'));
const SignatureModal = lazy(() => import('../../../../components/signature/SignatureModal'));
const SignedPdfPreviewModal = lazy(() => import('../../../../components/signature/SignedPdfPreviewModal'));

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
  const { t } = useTranslation();
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
  const reviewMode = searchParams.get('mode') === 'review';
  const rectificationMode = searchParams.get('mode') === 'rectification';
  const reviewEventId = searchParams.get('eventId');
  const { api } = useAuthenticatedApi();

  // 🔍 REVIEW MODE: État centralisé des erreurs signalées + commentaires
  const [reviewChecked, setReviewChecked] = useState<Record<string, boolean>>({});
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [submittingReview, setSubmittingReview] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ status: 'validated' | 'to_rectify'; modifiedCount: number; message: string } | null>(null);
  const [reviewSubcontractAmount, setReviewSubcontractAmount] = useState<string>('');
  const [reviewHasSubcontractors, setReviewHasSubcontractors] = useState(false);
  const [reviewSubcontractorNames, setReviewSubcontractorNames] = useState<string[]>([]);
  // 🔍 REVIEW MODE: Snapshot des valeurs originales du devis (capturé au premier chargement)
  const originalFormDataRef = useRef<Record<string, unknown> | null>(null);
  const [originalFormData, setOriginalFormData] = useState<Record<string, unknown>>({});
  const onReviewCheck = useCallback((fieldId: string, checked: boolean) => {
    setReviewChecked(prev => ({ ...prev, [fieldId]: checked }));
    if (!checked) setReviewComments(prev => { const n = { ...prev }; delete n[fieldId]; return n; });
  }, []);
  const onReviewComment = useCallback((fieldId: string, comment: string) => {
    setReviewComments(prev => ({ ...prev, [fieldId]: comment }));
  }, []);

  // 🔶 RECTIFICATION MODE: Données des modifications technicien pour le commercial
  type RectificationFieldData = {
    nodeId: string;
    fieldLabel: string;
    originalValue: string | null;  // Valeur initiale du devis
    technicianValue: string | null; // Valeur corrigée par le technicien
    modificationNote: string | null; // Note du technicien
    technicianName: string | null;
  };
  const [rectificationFields, setRectificationFields] = useState<RectificationFieldData[]>([]);
  const [rectificationFieldMap, setRectificationFieldMap] = useState<Record<string, RectificationFieldData>>({});
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [correctionSubmitted, setCorrectionSubmitted] = useState(false);
  // Track quels champs le commercial a modifié par rapport à la valeur technicien
  const rectificationInitialValues = useRef<Record<string, unknown>>({});

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
  // 🚀 FIX R17: Loading state pour initDefaultDraft (mode brouillon global)
  const [isInitializingDraft, setIsInitializingDraft] = useState<boolean>(!urlLeadId);

  const [leadSelectorVisible, setLeadSelectorVisible] = useState(false);
  const [leadCreatorVisible, setLeadCreatorVisible] = useState(false);
  const [devisSelectorVisible, setDevisSelectorVisible] = useState(false);
  const [availableDevis, setAvailableDevis] = useState<Array<{id: string, firstName: string, lastName: string, email: string, company?: string, submissions: Array<{id: string, name: string, status: string, createdAt: string, treeName?: string}>}>>([]);
  const [devisSearchTerm, setDevisSearchTerm] = useState('');

  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<Array<{id: string, name: string, type: string, description?: string, productValue?: string | null, isDefault?: boolean}>>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]); // 🏗️ Templates sélectionnés

  // ✍️ Signature électronique
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [signatureStatus, setSignatureStatus] = useState<{ totalSigned: number; totalPending: number; signatures: unknown[] } | null>(null);
  const [signedPdfPreviewOpen, setSignedPdfPreviewOpen] = useState(false);
  const [signedPdfPreviewId, setSignedPdfPreviewId] = useState<string | null>(null);

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
  // 🔥 FIX DISPLAY-ZERO: Forcer mode='open' après handleNewDevis
  // La première évaluation après un nouveau devis doit recalculer TOUS les display fields
  // car le mode='change' ne recalcule que le sous-ensemble affecté par le champ modifié.
  const forceOpenAfterNewDevisRef = useRef<boolean>(false);

  const [saveDevisModalVisible, setSaveDevisModalVisible] = useState<boolean>(false);
  const [saveDevisName, setSaveDevisName] = useState<string>('');
  const [isSavingDevis, setIsSavingDevis] = useState<boolean>(false);

  // 📧 États pour l'envoi d'email avec PDF
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [lastGeneratedDocId, setLastGeneratedDocId] = useState<string | null>(null);
  const [emailTemplatesList, setEmailTemplatesList] = useState<Array<{id: string, name: string, subject: string, content: string, type: string}>>([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailForm] = Form.useForm();
  const [includeProductDocs, setIncludeProductDocs] = useState(true); // 📎 Joindre les fiches techniques par défaut
  const [includeSignatureLink, setIncludeSignatureLink] = useState(true); // ✍️ Inclure un lien de signature par défaut
  const [selectedPdfProducts, setSelectedPdfProducts] = useState<string[]>([]); // 🏗️ Produits sélectionnés pour la génération PDF

  // 📧 États pour l'envoi depuis la liste des devis
  const [devisPdfSelectorVisible, setDevisPdfSelectorVisible] = useState(false);
  const [devisPdfList, setDevisPdfList] = useState<Array<{id: string, documentNumber: string, createdAt: string, template?: {name: string}}>>([]);
  const [loadingDevisPdfs, setLoadingDevisPdfs] = useState(false);
  const [devisEmailRecipient, setDevisEmailRecipient] = useState<string>('');

  // 📋 Gestionnaire panel
  const [gestionnaireVisible, setGestionnaireVisible] = useState(false);

  // 🆕 NOUVEAU DEVIS
  // Règle: en brouillon (global ou lead) => on vide seulement les données et on reste en mode brouillon.
  // Si on quitte un devis enregistré modifié => on crée d'abord une version -N.
  const handleNewDevis = async () => {
    try {
      try {
        await persistCompletedRevisionIfDirty('new-devis');
      } catch (e) {
        logger.warn('⚠️ [TBL] Persist revision avant Nouveau devis échoué (on continue):', e);
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
          const draftsArray = Array.isArray(existing) ? existing : (existing as unknown)?.data || [];
          draftIdToClear = (draftsArray as Array<{ id?: string }>)[0]?.id || null;
        } else if (isGlobalDraftNow && currentUserId) {
          const existing = await api.get(`/api/treebranchleaf/submissions?treeId=${currentTreeId}&userId=${currentUserId}&status=default-draft`);
          const draftsArray = Array.isArray(existing) ? existing : (existing as unknown)?.data || [];
          draftIdToClear = (draftsArray as Array<{ id?: string; status?: string }>).find((d) => d.status === 'default-draft')?.id || null;
        }
      }

      if (api && draftIdToClear) {
        try {
          await api.post(`/api/treebranchleaf/submissions/${draftIdToClear}/reset-data`, {});
        } catch (e) {
          logger.warn('⚠️ [TBL] Impossible de vider le brouillon en DB:', e);
        }
      }

      // Collecter les IDs des nœuds protégés AVANT setFormData (pour réutiliser après)
      const protectedNodeIds = new Set<string>();
      (rawNodes as Array<{ id: string; metadata?: Record<string, unknown> }>).forEach((n) => {
        if ((n.metadata as Record<string, unknown>)?.isProtected) protectedNodeIds.add(n.id);
      });
      logger.debug('🔒 [handleNewDevis] Nœuds protégés détectés:', Array.from(protectedNodeIds));

      setFormData((prev) => {
        const kept: TBLFormData = {};
        Object.keys(prev || {}).forEach((k) => {
          // Garder les clés internes (__) et les valeurs des champs protégés
          if (k.startsWith('__')) kept[k] = prev[k];
          else if (protectedNodeIds.has(k)) {
            kept[k] = prev[k];
            logger.debug(`🔒 [handleNewDevis] Valeur protégée préservée: ${k} = ${prev[k]}`);
          }
        });
        if (isLeadDraftNow && leadId) {
          kept.__leadId = leadId;
        }
        return kept;
      });

      // 🔥 FIX STALE DATA: Vider complètement window.TBL_FORM_DATA pour empêcher
      // la réinjection de données stales via le sync useEffect
      if (typeof window !== 'undefined') {
        (window as any).TBL_FORM_DATA = {};
        // 🔥 Marqueur temporel pour que les hooks (useTBLTableLookup, etc.)
        // sachent qu'un nouveau devis vient d'être créé et ne réinjectent pas
        // les vieilles valeurs calculées du batch cache
        (window as any).__TBL_NEW_DEVIS_TS = Date.now();
      }

      // 🧹 FIX STALE-DEVIS: Vider les caches de useNodeCalculatedValue AVANT le broadcast
      // pour éviter que lastKnownValueByKey, inlineValueProtectedUntil, etc.
      // ne restaurent les anciennes valeurs après le clearDisplayFields
      clearAllNodeValueCaches();

      // 🔥 NOUVEAU: Vider aussi les champs DISPLAY calculés côté frontend
      // Mais exclure les nœuds protégés du clear
      broadcastCalculatedRefresh({
        clearDisplayFields: true,
        reason: 'nouveau-devis',
        protectedNodeIds: Array.from(protectedNodeIds)
      });

      // 🔥 FIX DISPLAY-ZERO: Forcer le prochain cycle d'évaluation en mode 'open' (complet)
      // Après un nouveau devis, le mode 'change' ne recalculerait qu'un sous-ensemble
      // de display fields → les autres resteraient à 0/vide.
      forceOpenAfterNewDevisRef.current = true;
      // Vider aussi les valeurs accumulées (stale)
      accumulatedDisplayValuesRef.current = {};

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
      logger.error('❌ [TBL] Erreur Nouveau devis:', error);
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
        leadDraftId = (resp as unknown)?.submission?.id || null;
        // 🔥 FIX GRD: Broadcaster les valeurs calculées (DISPLAY fields) pour ce nouveau brouillon
        // Sans ce broadcast, les DISPLAY fields (GRD, etc.) restent null car le hook
        // useNodeCalculatedValue bloque le GET quand submissionId change (submissionIdChanged guard)
        broadcastCalculatedRefresh({
          reason: 'lead-selection-transfer',
          evaluatedSubmissionId: leadDraftId,
          submissionData: (resp as unknown)?.submission?.TreeBranchLeafSubmissionData,
          freshlyComputedNodeIds: (resp as unknown)?.freshlyComputedNodeIds
        });
      } else {
        const existing = await api.get(`/api/treebranchleaf/submissions?treeId=${effectiveTreeId}&leadId=${selectedLead.id}&status=draft`);
        const draftsArray = Array.isArray(existing) ? existing : (existing as unknown)?.data || [];
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
          leadDraftId = (created as unknown)?.submission?.id || null;
          // 🔥 FIX GRD: Broadcaster les valeurs calculées pour le nouveau brouillon
          broadcastCalculatedRefresh({
            reason: 'lead-selection-new-draft',
            evaluatedSubmissionId: leadDraftId,
            submissionData: (created as unknown)?.submission?.TreeBranchLeafSubmissionData,
            freshlyComputedNodeIds: (created as unknown)?.freshlyComputedNodeIds
          });
        } else {
          // 🔥 FIX 01/02/2026: Forcer recalcul des DISPLAY fields pour le brouillon existant
          // Quand on sélectionne un lead avec un brouillon existant, les DISPLAY fields
          // (comme GRD qui dépend du code postal du lead) doivent être recalculés
          logger.debug(`🔄 [TBL] Brouillon existant ${leadDraftId} - forcer recalcul DISPLAY fields`);
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
            recalcCount: (refreshed as unknown)?.submission?.TreeBranchLeafSubmissionData?.length,
            submissionData: (refreshed as unknown)?.submission?.TreeBranchLeafSubmissionData,
            freshlyComputedNodeIds: (refreshed as unknown)?.freshlyComputedNodeIds
          });
        }
      }

      setLeadId(selectedLead.id);
      setClientData({
        id: selectedLead.id,
        name: selectedLead.name || `${selectedLead.firstName || ''} ${selectedLead.lastName || ''}`.trim() || selectedLead.company || 'Lead sans nom',
        email: selectedLead.email || '',
        phone: selectedLead.phone || '',
        address: formatAddressValue(selectedLead.address || (selectedLead as unknown as { data?: { address?: unknown } })?.data?.address || '')
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
          const fieldsMap = (submissionDataResponse as unknown)?.fields || {};
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
          logger.warn('⚠️ [TBL] Impossible de charger le brouillon du lead:', e);
        }
      }

      if (api && oldGlobalDraftId && shouldTransfer) {
        try {
          await api.post(`/api/treebranchleaf/submissions/${oldGlobalDraftId}/reset-data`, {});
        } catch (e) {
          logger.warn('⚠️ [TBL] Impossible de vider le brouillon global après transfert:', e);
        }
      }

      lastSavedSignatureRef.current = null;
      lastQueuedSignatureRef.current = null;

      setLeadSelectorVisible(false);
      message.success(`Brouillon chargé pour "${selectedLead.firstName} ${selectedLead.lastName}"`);
    } catch (e) {
      logger.error('❌ [TBL] Erreur sélection lead:', e);
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
  // ✍️ Vérifier le statut de signature du devis courant
  useEffect(() => {
    if (!submissionId || !api) return;
    (async () => {
      try {
        const res = await api.get(`/api/e-signature/submission/${submissionId}/status`);
        if (res?.success) {
          setSignatureStatus({ totalSigned: res.totalSigned, totalPending: res.totalPending, signatures: res.signatures });
        }
      } catch {
        // Pas de signature pour ce devis — normal
      }
    })();
  }, [submissionId, api]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const runDiagnostic = () => {
        const data = window.TBL_FORM_DATA || {};
        const mirrorKeys = Object.keys(data).filter(k => k.startsWith('__mirror_data_'));
        // logger.debug('🔧 [TBL] Diagnostic - FormData keys:', Object.keys(data).length);
        // logger.debug('🪞 [TBL] Diagnostic - Mirror keys:', mirrorKeys.length);
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
        // logger.debug('🚀 [TBL AUTO] ANALYSE AUTOMATIQUE DES MIRRORS');
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
          const detail = (event as CustomEvent<{ source?: string; skipFormReload?: boolean; forceRemote?: boolean; reason?: string }>).detail;
          const forceRemote = !!detail?.forceRemote;
          
          // 🔧 FIX: Ne PAS refetch pour les événements de suppression.
          // La suppression locale est gérée par le handler tbl-repeater-updated.
          // Un refetch ici provoquait 2-3 GET /nodes redondants via :
          //   1) refetchRef.current() (ce handler)
          //   2) le listener dans useTBLDataPrismaComplete
          //   3) potentiellement le hook hierarchical-fixed
          if ((detail as unknown)?.reason === 'delete-copy-group') {
            return;
          }
          
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

  // 🎯 FIX: Synchroniser submissionId dans formData pour que useBackendValue puisse l'utiliser
  // dans ses appels GET (GET /api/tree-nodes/:nodeId/calculated-value?submissionId=xxx)
  // Sans cela, les DISPLAY fields en mode brouillon global (sans leadId) ne trouvent pas
  // leurs valeurs SubmissionData côté contrôleur.
  useEffect(() => {
    if (submissionId) {
      setFormData(prev => {
        if (prev.submissionId === submissionId) return prev; // Pas de changement
        return { ...prev, submissionId };
      });
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

  // 🏗️ Options produit extraites des nœuds TBL (pour le modal génération PDF)
  const pdfProductOptions = useMemo(() => {
    const opts: Array<{value: string, label: string, icon?: string, color?: string}> = [];
    const seenValues = new Set<string>();
    for (const node of (rawNodes as unknown[])) {
      if (node.hasProduct && node.product_sourceNodeId === node.id && Array.isArray(node.product_options) && node.product_options.length > 0) {
        for (const opt of node.product_options) {
          if (opt.value !== 'all' && !seenValues.has(opt.value)) {
            seenValues.add(opt.value);
            opts.push({ value: opt.value, label: opt.label, icon: opt.icon, color: opt.color });
          }
        }
      }
    }
    return opts;
  }, [rawNodes]);

  // 🔍 REVIEW MODE: Callback "Analyse" (après rawNodes + formData)
  const onSubmitReview = useCallback(async () => {
    const checkedFields = Object.entries(reviewChecked).filter(([, v]) => v);
    const missingComments = checkedFields.filter(([id]) => !reviewComments[id]?.trim());
    if (missingComments.length > 0) {
      message.warning('Ajoutez un commentaire pour chaque problème signalé');
      return;
    }
    if (reviewHasSubcontractors && (!reviewSubcontractAmount || Number(reviewSubcontractAmount) <= 0)) {
      message.error('⚠️ Sous-traitant assigné — Vous devez obligatoirement indiquer le coût sous-traitant. Ce montant vous engage juridiquement et sera verrouillé après validation.');
      return;
    }
    if (!reviewEventId) {
      message.error('Pas d\'événement lié — Impossible de lancer l\'analyse');
      return;
    }
    setSubmittingReview(true);
    try {
      const allTechNodes = (rawNodes || []).filter((n: Record<string, unknown>) => n.technicianVisible === true);
      const snapshot = originalFormDataRef.current || {};
      const reviews = allTechNodes.map((node: Record<string, unknown>) => ({
        nodeId: node.id,
        originalValue: snapshot[node.id] != null ? String(snapshot[node.id]) : null,
        reviewedValue: formData[node.id] != null ? String(formData[node.id]) : null,
        isModified: reviewChecked[node.id] === true,
        modificationNote: reviewChecked[node.id] ? (reviewComments[node.id] || null) : null,
      }));
      const response = await api.post(`/api/chantier-workflow/events/${reviewEventId}/submit-review`, {
        reviews,
        reviewType: 'TECHNICAL',
        ...(reviewSubcontractAmount ? { subcontractAmount: Number(reviewSubcontractAmount) } : {}),
      });
      const data = response?.data || response;
      const hasProblems = checkedFields.length > 0;
      setAnalysisResult({
        status: hasProblems ? 'to_rectify' : 'validated',
        modifiedCount: checkedFields.length,
        message: hasProblems
          ? `${checkedFields.length} problème${checkedFields.length > 1 ? 's' : ''} signalé${checkedFields.length > 1 ? 's' : ''} — Le lead est renvoyé au commercial pour correction.`
          : 'Tous les champs ont été vérifiés et validés. Le chantier peut continuer.',
      });
    } catch (err: unknown) {
      logger.error('[TBL Review] Erreur analyse:', err);
      message.error(err?.message || 'Erreur lors de l\'analyse');
    } finally {
      setSubmittingReview(false);
    }
  }, [reviewChecked, reviewComments, reviewEventId, rawNodes, formData, api, reviewSubcontractAmount, reviewHasSubcontractors]);

  // 🔍 REVIEW MODE: Capturer un snapshot des valeurs originales du devis
  // Ce snapshot est pris UNE SEULE FOIS quand formData est chargé en mode review
  useEffect(() => {
    if (!reviewMode) return;
    if (originalFormDataRef.current) return; // Déjà capturé
    // Attendre qu'il y ait des données significatives (au moins 5 champs remplis)
    const meaningfulKeys = Object.keys(formData).filter(k => !k.startsWith('__') && formData[k] != null && formData[k] !== '');
    if (meaningfulKeys.length < 5) return;
    // Prendre le snapshot
    const snapshot = { ...formData };
    originalFormDataRef.current = snapshot;
    setOriginalFormData(snapshot);
    logger.debug(`📸 [TBL Review] Snapshot valeurs originales capturé: ${meaningfulKeys.length} champs`);
  }, [reviewMode, formData]);

  // 🔍 REVIEW MODE: Charger si le chantier a des sous-traitants
  useEffect(() => {
    if (!reviewMode || !reviewEventId) return;
    (async () => {
      try {
        const res = await api.get(`/api/chantier-workflow/events/${reviewEventId}/has-subcontractors`) as unknown;
        const data = res?.data || res;
        if (data?.hasSubcontractors) {
          setReviewHasSubcontractors(true);
          setReviewSubcontractorNames((data.subcontractors || []).map((s: Record<string, unknown>) => s.company || s.name));
        }
      } catch (err) {
        logger.warn('[TBL Review] Impossible de vérifier sous-traitants:', err);
      }
    })();
  }, [reviewMode, reviewEventId, api]);

  // 🔶 RECTIFICATION MODE: Charger les modifications technicien pour affichage
  useEffect(() => {
    if (!rectificationMode || !reviewEventId) return;
    (async () => {
      try {
        logger.debug('🔶 [TBL Rectification] Chargement modifications technicien pour event:', reviewEventId);
        const res = await api.get(`/api/chantier-workflow/events/${reviewEventId}/review-fields`) as unknown;
        const data = res?.data || res;
        const reviews: unknown[] = data?.reviews || [];
        
        // Ne garder que les champs modifiés par le technicien
        const modifiedReviews = reviews.filter((r: Record<string, unknown>) => r.isModified && r.reviewType === 'TECHNICAL');
        
        const fields: RectificationFieldData[] = modifiedReviews.map((r: Record<string, unknown>) => ({
          nodeId: r.nodeId,
          fieldLabel: r.fieldLabel,
          originalValue: r.originalValue || null,
          technicianValue: r.reviewedValue || null,
          modificationNote: r.modificationNote || null,
          technicianName: r.ReviewedBy
            ? `${r.ReviewedBy.firstName || ''} ${r.ReviewedBy.lastName || ''}`.trim()
            : null,
        }));

        setRectificationFields(fields);
        const fieldMap: Record<string, RectificationFieldData> = {};
        for (const f of fields) {
          fieldMap[f.nodeId] = f;
        }
        setRectificationFieldMap(fieldMap);

        logger.debug(`🔶 [TBL Rectification] ${fields.length} champs modifiés par technicien chargés`);
      } catch (err) {
        logger.error('[TBL Rectification] Erreur chargement review-fields:', err);
      }
    })();
  }, [rectificationMode, reviewEventId, api]);

  // 🔶 RECTIFICATION MODE: Capturer les valeurs initiales ET injecter les valeurs technicien
  const rectificationInjectedRef = useRef(false);
  useEffect(() => {
    if (!rectificationMode || Object.keys(rectificationFieldMap).length === 0) return;
    if (rectificationInjectedRef.current) return; // Déjà injecté
    
    // Attendre que formData soit suffisamment chargé
    const meaningfulKeys = Object.keys(formData).filter(k => formData[k] != null && formData[k] !== '');
    if (meaningfulKeys.length < 5) return;
    
    // 1. Capturer les valeurs initiales (AVANT injection technicien)
    const snapshot: Record<string, unknown> = {};
    for (const nodeId of Object.keys(rectificationFieldMap)) {
      snapshot[nodeId] = formData[nodeId] ?? null;
    }
    rectificationInitialValues.current = snapshot;
    
    // 2. Injecter les valeurs du technicien dans formData
    //    → Le champ affichera la valeur technicien 
    //    → Les formules recalculeront dessus
    const techUpdates: Record<string, unknown> = {};
    for (const field of rectificationFields) {
      if (field.technicianValue != null && field.technicianValue !== '') {
        techUpdates[field.nodeId] = field.technicianValue;
      }
    }
    
    if (Object.keys(techUpdates).length > 0) {
      setFormData(prev => ({ ...prev, ...techUpdates }));
      logger.debug(`🔶 [TBL Rectification] ${Object.keys(techUpdates).length} valeurs technicien injectées dans formData`);
      
      // Mettre à jour TBL_FORM_DATA global aussi
      if ((window as any).TBL_FORM_DATA) {
        Object.assign((window as any).TBL_FORM_DATA, techUpdates);
      }
      
      // 3. Déclencher un recalcul des formules avec les nouvelles valeurs technicien
      //    Petit délai pour laisser le setFormData se propager dans le cycle React
      setTimeout(() => {
        if (immediateEvaluateRef.current) {
          const updatedFormData = { ...formData, ...techUpdates };
          const changedIds = Object.keys(techUpdates).join(',');
          immediateEvaluateRef.current(updatedFormData, changedIds);
          logger.debug(`🔶 [TBL Rectification] Recalcul formules déclenché pour ${Object.keys(techUpdates).length} champs`);
        }
      }, 500);
    }
    
    rectificationInjectedRef.current = true;
    logger.debug(`📸 [TBL Rectification] Snapshot valeurs originales capturé + technicien injecté pour ${Object.keys(snapshot).length} champs`);
  }, [rectificationMode, rectificationFieldMap, rectificationFields, formData]);

  // 🔶 RECTIFICATION MODE: Soumettre les corrections commerciales
  const onSubmitCommercialCorrection = useCallback(async () => {
    if (!reviewEventId || !rectificationMode) return;
    
    // Identifier les champs que le commercial a modifiés vs la valeur technicien
    const corrections: Array<{ nodeId: string; correctedValue: string | null; correctionNote: string }> = [];
    
    for (const field of rectificationFields) {
      const currentValue = formData[field.nodeId];
      const techValue = field.technicianValue;
      const originalValue = rectificationInitialValues.current[field.nodeId];
      
      // Comparer la valeur actuelle vs la valeur technicien injectée
      const currentStr = currentValue != null ? String(currentValue) : '';
      const techStr = techValue != null ? String(techValue) : '';
      const originalStr = originalValue != null ? String(originalValue) : '';
      
      if (currentStr !== techStr) {
        // Le commercial a modifié la valeur par rapport à ce que le technicien a recommandé
        corrections.push({
          nodeId: field.nodeId,
          correctedValue: currentStr || null,
          correctionNote: `Traçabilité 3 couches — Original: ${originalStr || '(vide)'} → Technicien: ${techStr || '(vide)'} → Commercial: ${currentStr || '(vide)'}`,
        });
      }
    }

    if (corrections.length === 0) {
      // Même si pas de corrections, on le signal
      Modal.info({
        title: 'Aucune modification détectée',
        content: 'Vous n\'avez modifié aucun des champs signalés par le technicien. Si les valeurs sont correctes, vous pouvez re-soumettre le lead au chantier depuis la fiche lead.',
      });
      return;
    }

    try {
      setSubmittingCorrection(true);
      const res = await api.post(`/api/chantier-workflow/events/${reviewEventId}/submit-commercial-correction`, {
        corrections,
      }) as unknown;

      if (res?.success) {
        setCorrectionSubmitted(true);
        Modal.success({
          title: '✅ Corrections enregistrées',
          content: (
            <div>
              <p><strong>{corrections.length} correction(s)</strong> ont été sauvegardées avec traçabilité complète.</p>
              <p>Vous pouvez maintenant retourner à la fiche lead pour re-soumettre au chantier.</p>
            </div>
          ),
        });
      }
    } catch (err) {
      logger.error('[TBL Rectification] Erreur soumission corrections:', err);
      Modal.error({
        title: 'Erreur',
        content: 'Impossible d\'enregistrer les corrections. Veuillez réessayer.',
      });
    } finally {
      setSubmittingCorrection(false);
    }
  }, [reviewEventId, rectificationMode, rectificationFields, formData, api]);

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
    const existingSubmissions = (response as unknown)?.data || response || [];
    const existingNames = (Array.isArray(existingSubmissions) ? existingSubmissions : [])
      .map((s: Record<string, unknown>) => s?.summary?.name || s?.name || '')
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
      if (isVerbose()) logger.warn('⚠️ [TBL] Impossible de préparer le nom de révision:', e);
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
        evaluationMode: 'change'  // 🚀 FIX R16: Même moteur que brouillon - recalcul ciblé par triggers
      });

      const newId = (resp as unknown)?.submission?.id;
      if (!newId) return;

      // � FIX R16: Plus besoin de fenêtre 3s en mode 'open' - le trigger index gère tout
      // Le clone a copié toutes les données, seul le champ modifié déclenche un recalcul ciblé

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
      logger.warn('⚠️ [TBL] Échec création révision -1 en base:', e);
    } finally {
      revisionCreateInFlightRef.current = false;
    }
  }, [api, effectiveTreeId, isDevisSaved, leadId, submissionId, hasCopiedDevis, revisionRootName, originalDevisName, devisName, pendingRevisionName, stripRevisionSuffix, generateNextRevisionName, normalizePayload, computeSignature]);

  const persistCompletedRevisionIfDirty = useCallback(async (reason: string) => {
    if (!api || !effectiveTreeId) return;
    if (!isDevisSaved || !isCompletedDirty) return;
    if (!leadId) {
      logger.warn('⚠️ [TBL] Revision impossible (leadId manquant)');
      return;
    }

    const root = revisionRootName || stripRevisionSuffix(originalDevisName || devisName || 'Devis');
    const nextName = pendingRevisionName || await generateNextRevisionName(root, leadId);

    logger.debug(`💾 [TBL] Versioning: création '${nextName}' (${reason})`);
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

    const newId = (resp as unknown)?.submission?.id;
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
  
  // � FIX R17: Log déplacé derrière un guard pour éviter le spam à chaque render

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
      logger.debug('🔍 [TBL] initDefaultDraft check:', { leadId, api: !!api, effectiveTreeId, defaultDraftId, isGlobalDraftMode, userId: user?.id });
      
      // Ne pas initialiser si on a un lead ou si pas d'API
      if (!api || !effectiveTreeId || !defaultDraftId || !isGlobalDraftMode) {
        logger.debug('⏭️ [TBL] initDefaultDraft skip - conditions not met');
        setIsInitializingDraft(false);
        return;
      }

      if (!isDefaultDraft) {
        setIsDefaultDraft(true);
      }
      
      logger.debug('📋 [TBL] Mode simulation - Recherche/création du devis par défaut');
      
      try {
        // Essayer de récupérer le draft par défaut existant
        const url = `/api/treebranchleaf/submissions?treeId=${effectiveTreeId}&status=default-draft&userId=${user?.id}`;
        logger.debug('🔎 [TBL] Fetching drafts:', url);
        const existingDrafts = await api.get(url);
        logger.debug('📦 [TBL] existingDrafts response:', existingDrafts);
        
        const draftsArray = Array.isArray(existingDrafts) ? existingDrafts : existingDrafts?.data || [];
        logger.debug('📦 [TBL] draftsArray:', draftsArray.length, 'items');
        
        const defaultDraft = draftsArray.find((d: { id?: string, status?: string }) => d.status === 'default-draft');
        logger.debug('🎯 [TBL] defaultDraft found:', defaultDraft?.id);
        
        if (defaultDraft && defaultDraft.id) {
          logger.debug('✅ [TBL] Devis par défaut trouvé:', defaultDraft.id);
          setSubmissionId(defaultDraft.id);
          setDevisName('Brouillon');
          
          // Charger les données du draft depuis TreeBranchLeafSubmissionData
          try {
            const submissionDataResponse = await api.get(`/api/treebranchleaf/submissions/${defaultDraft.id}/fields`);
            logger.debug('📥 [TBL] submissionDataResponse:', submissionDataResponse);
            const fieldsMap = submissionDataResponse?.fields || {};
            logger.debug('📥 [TBL] fieldsMap keys:', Object.keys(fieldsMap));

            // ⚠️ Sécurité: le brouillon GLOBAL (default-draft) ne doit jamais être associé à un lead.
            // Si on détecte un leadId, c'est un reliquat d'un ancien comportement -> on détache côté DB.
            if (submissionDataResponse?.leadId) {
              logger.warn('⚠️ [TBL] default-draft était associé à un lead; détachement automatique', {
                draftId: defaultDraft.id,
                leadId: submissionDataResponse.leadId
              });
              try {
                await api.patch(`/api/treebranchleaf/submissions/${defaultDraft.id}`, { clientId: null });
              } catch (e) {
                logger.warn('⚠️ [TBL] Impossible de détacher le default-draft du lead:', e);
              }
            }
            
            if (Object.keys(fieldsMap).length > 0) {
              const restoredData: Record<string, string> = {};
              
              Object.entries(fieldsMap).forEach(([nodeId, fieldData]: [string, unknown]) => {
                const field = fieldData as { value?: unknown; rawValue?: string; calculatedBy?: string };
                logger.debug(`📥 [TBL] Field ${nodeId}:`, { calculatedBy: field.calculatedBy, rawValue: field.rawValue, value: field.value });
                // Ne restaurer que les valeurs entrées par l'utilisateur.
                // Selon les versions, la saisie peut être taggée 'neutral' (legacy) ou 'field'/'fixed'.
                const src = typeof field.calculatedBy === 'string' ? field.calculatedBy.toLowerCase() : null;
                const isUserInput = !src || src === 'neutral' || src === 'field' || src === 'fixed';
                if (isUserInput && field.rawValue !== undefined && field.rawValue !== null) {
                  restoredData[nodeId] = String(field.rawValue);
                }
              });
              
              logger.debug('📥 [TBL] Données à restaurer:', restoredData);
              if (Object.keys(restoredData).length > 0) {
                logger.debug('📥 [TBL] Données restaurées:', Object.keys(restoredData).length, 'champs');
                setFormData(prev => ({ ...prev, ...restoredData }));
              } else {
                logger.warn('⚠️ [TBL] Aucune donnée neutral trouvée dans les champs');
              }
            } else {
              logger.warn('⚠️ [TBL] fieldsMap vide');
            }
          } catch (loadError) {
            logger.warn('⚠️ [TBL] Impossible de charger les données du draft:', loadError);
          }
        } else {
          logger.debug('📝 [TBL] Création du devis par défaut...');
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
            logger.debug('✅ [TBL] Devis par défaut créé:', response.submission.id);
          }
        }
      } catch (error) {
        logger.warn('⚠️ [TBL] Impossible d\'initialiser le devis par défaut:', error);
        // Mode fallback: on continue sans draft persistant
        setDevisName('Brouillon');
      } finally {
        setIsInitializingDraft(false);
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
          const lead = (response as unknown)?.success ? (response as unknown)?.data : response;
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
          logger.warn('⚠️ [TBL] Impossible de charger le lead (header):', e);
        }

        // 🚀 FIX PERF-CHANTIER: Si un devisId est demandé via l'URL (?devisId=xxx),
        // ne PAS créer/chercher de brouillon ici — handleSelectDevis s'en charge.
        // Cela évite un appel create-and-evaluate INUTILE (~6s gaspillées).
        if (requestedDevisId) {
          logger.debug('🚀 [TBL] requestedDevisId détecté → skip draft creation, handleSelectDevis prendra le relais');
          setLeadId(effectiveLeadId);
          setIsDefaultDraft(false);
          // 🚀 FIX PERF-CHANTIER: Pré-initialiser lastClientIdRef pour éviter
          // qu'un handleFieldChange post-load ne détecte un faux "clientId changé"
          // et ne force un create-and-evaluate supplémentaire en mode 'open'
          lastClientIdRef.current = effectiveLeadId;
          return; // finally { setIsLoadingLead(false) } s'exécutera quand même
        }

        // 2) Récupérer/créer le brouillon du lead
        let leadDraftId: string | null = null;
        try {
          const existing = await api.get(`/api/treebranchleaf/submissions?treeId=${effectiveTreeId}&leadId=${effectiveLeadId}&status=draft`);
          const draftsArray = Array.isArray(existing) ? existing : (existing as unknown)?.data || [];
          leadDraftId = (draftsArray as Array<{ id?: string }>)[0]?.id || null;
        } catch (e) {
          logger.warn('⚠️ [TBL] Impossible de lister les brouillons du lead:', e);
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
          leadDraftId = (created as unknown)?.submission?.id || null;
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
            const fieldsMap = (submissionDataResponse as unknown)?.fields || {};
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
            logger.warn('⚠️ [TBL] Impossible de restaurer le brouillon du lead:', e);
          }
        }

        lastSavedSignatureRef.current = null;
        lastQueuedSignatureRef.current = null;
      } finally {
        setIsLoadingLead(false);
      }
    };

    initLeadDraftFromUrl();
  }, [api, effectiveTreeId, urlLeadId, isLoadingLead, requestedDevisId]);

  // SYNCHRONISATION: Initialiser formData avec les mirrors créés par useTBLDataPrismaComplete
  useEffect(() => {
    // 🔐 FIX STALE-DEVIS: Ne PAS synchroniser pendant les 15s après un nouveau devis
    // car TBL_FORM_DATA peut contenir des résidus de l'ancien devis réinjectés par un broadcast
    const newDevisTs = typeof window !== 'undefined' ? (window as any).__TBL_NEW_DEVIS_TS : 0;
    if (newDevisTs && (Date.now() - newDevisTs < 15000)) {
      return; // Skip: nouveau devis en cours, ne pas réinjecter d'anciennes données
    }

    if (typeof window !== 'undefined' && window.TBL_FORM_DATA && Object.keys(window.TBL_FORM_DATA).length > 0) {
      const globalData = window.TBL_FORM_DATA;
      const mirrorKeys = Object.keys(globalData).filter(k => k.startsWith('__mirror_data_'));
      
      if (mirrorKeys.length > 0) {
        setFormData(prev => {
          const next = { ...prev };
          let syncCount = 0;
          
          // Copier UNIQUEMENT les mirrors depuis window.TBL_FORM_DATA
          // 🔐 FIX STALE-DEVIS: Ne plus copier les données non-mirror car elles
          // provoquent l'auto-complétion des champs avec les valeurs de l'ancien devis
          mirrorKeys.forEach(key => {
            if (!(key in next)) {
              next[key] = globalData[key];
              syncCount++;
            }
          });
          
          if (syncCount > 0) {
            // logger.debug(`✅ [SYNC] ${syncCount} mirrors synchronisés vers FormData`);
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
      let calculatedValuesMap: Record<string, unknown> = {};

      // 🔥 NOUVEAU: Gestion spéciale pour le clear des display fields
      if (detail?.clearDisplayFields === true) {
        // 🔒 Collecter les IDs protégés pour les exclure du clear
        const protectedIds = new Set<string>(Array.isArray(detail?.protectedNodeIds) ? detail.protectedNodeIds as string[] : []);
        // Vider les valeurs calculées dans window.TBL_FORM_DATA
        if (window.TBL_FORM_DATA) {
          const displayFieldsToRemove: string[] = [];
          for (const [key] of Object.entries(window.TBL_FORM_DATA)) {
            // 🔒 Ne pas toucher aux champs protégés
            if (protectedIds.has(key)) continue;
            // Identifier les champs calculés/display (ceux qui ne sont pas des input utilisateur)
            if (!key.startsWith('__') && !key.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i)) {
              // Conserver les UUIDs simples qui sont des inputs utilisateur
              continue;
            }
            // Supprimer les champs calculés (sum-total, linkés, etc.)
            if (key.includes('-sum-total') || key.includes('-') && !key.startsWith('__')) {
              displayFieldsToRemove.push(key);
            }
          }
          for (const key of displayFieldsToRemove) {
            delete window.TBL_FORM_DATA[key];
          }
        }
      } else {
        // Mode normal: extraire les valeurs calculées de la réponse
        // pour les passer directement dans l'événement au lieu de refetch
        const submissionDataArray = detail?.submissionData as Array<{nodeId?: string; value?: unknown; operationResult?: unknown}> | undefined;
        // 🔥 FIX BROADCAST-NULL 2026: Set des nodeIds freshement calculés ce cycle
        // Ces nodeIds peuvent avoir value=null (ex: table lookup ∅) mais on veut leur donner une valeur inline
        // via operationResult pour éviter le 🧯 safety GET +650ms à chaque changement de champ
        const freshlyComputedSet = new Set<string>(
          Array.isArray(detail?.freshlyComputedNodeIds) ? detail.freshlyComputedNodeIds as string[] : []
        );
        if (submissionDataArray && Array.isArray(submissionDataArray)) {
          for (const item of submissionDataArray) {
            if (!item?.nodeId) continue;
            if (item?.value !== undefined && item?.value !== null) {
              // Cas normal: valeur calculée valide → utiliser directement
              calculatedValuesMap[item.nodeId] = item.value;
            } else if (freshlyComputedSet.has(item.nodeId) && item?.operationResult != null) {
              // 🔥 FIX BROADCAST-NULL: Field freshement calculé mais value=null (ex: table lookup ∅)
              // Utiliser operationResult comme valeur d'affichage inline → 📥 immédiat au lieu de 🧯 +650ms
              const opRes = item.operationResult;
              const displayVal = typeof opRes === 'string' ? opRes
                : (typeof opRes === 'object' && opRes !== null)
                  ? ((opRes as Record<string, unknown>).humanText
                    ?? (opRes as Record<string, unknown>).value
                    ?? (opRes as Record<string, unknown>).result
                    ?? (opRes as Record<string, unknown>).text) as string ?? null
                  : null;
              if (displayVal != null) {
                calculatedValuesMap[item.nodeId] = displayVal;
                logger.debug(`💡 [broadcastCalculatedRefresh] FIX BROADCAST-NULL: ${item.nodeId} → opResult inline: ${displayVal}`);
              } else {
                // 🚀 FIX BROADCAST-COMPLET: Même sans displayVal, marquer le nodeId comme présent
                // pour empêcher le safety GET différé (la valeur est confirmée null/∅)
                calculatedValuesMap[item.nodeId] = null;
              }
            } else {
              // 🚀 FIX BROADCAST-COMPLET: Inclure les nodeIds avec value=null dans calculatedValues
              // pour empêcher le safety GET différé sur les fields non-affectés par le changement.
              // Le hook useNodeCalculatedValue vérifie `nodeId in calculatedValues` → true → pas de GET.
              calculatedValuesMap[item.nodeId] = null;
            }
          }
          
          // � FIX DISPLAY-ZERO: Fusionner les valeurs accumulées des broadcasts précédents sautés
          // Les valeurs du broadcast courant ont priorité sur les valeurs accumulées (plus récentes)
          const accumulated = accumulatedDisplayValuesRef.current;
          if (Object.keys(accumulated).length > 0) {
            for (const [nodeId, value] of Object.entries(accumulated)) {
              // Ne pas écraser une valeur fraîche par une accumulée
              if (!(nodeId in calculatedValuesMap)) {
                calculatedValuesMap[nodeId] = value;
              }
            }
            if (isVerbose()) logger.debug(`🔗 [broadcastCalculatedRefresh] Fusionné ${Object.keys(accumulated).length} valeurs accumulées (broadcasts précédents sautés)`);
            accumulatedDisplayValuesRef.current = {}; // Vider les accumulés
          }
          
          // �🔗🔗🔗 FIX CRITIQUE: Injecter les valeurs calculées (Link, DISPLAY, etc.) dans TBL_FORM_DATA
          // Sans cela, TBLFieldRendererAdvanced ne voit pas les valeurs Link dans formData
          if (typeof window !== 'undefined' && window.TBL_FORM_DATA) {
            for (const [nodeId, value] of Object.entries(calculatedValuesMap)) {
              window.TBL_FORM_DATA[nodeId] = value;
            }
          }
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
      logger.warn('⚠️ [TBL][AUTOSAVE] Dispatch tbl-force-retransform échoué', err);
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
      if (isVerbose()) logger.warn('⚠️ [TBL][PREVIEW] Échec preview-evaluate', e);
    }
  }, [api, tree]);

  // Empêche les POST create-and-evaluate concurrents (ordre / charge).
  // On garde uniquement le dernier état à envoyer si une requête est déjà en vol.
  const autosaveInFlightRef = useRef(false);
  const pendingAutosaveRef = useRef<{ data: TBLFormData; changedField?: string } | null>(null);
  const autosaveSuspendedRef = useRef(false);
  const lastRealChangedFieldIdRef = useRef<string | undefined>(undefined);

  // 🔥 FIX DISPLAY-ZERO: Accumuler les valeurs display non-broadcastées
  // Quand un broadcast est sauté (hasPendingRequest/hasDebounceActive),
  // les valeurs calculées sont perdues → le bouclier garde les valeurs vides.
  // On les accumule ici et on les fusionne dans le prochain broadcast réel.
  const accumulatedDisplayValuesRef = useRef<Record<string, unknown>>({});

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

    const isRealUserChange = Boolean(changedField && changedField !== 'NULL');

    // 🔥 FIX PRIX COMPTABILITÉ: AUCUN garde-fou sur isDevisSaved.
    // Tous les modes (brouillon, lead-draft, devis enregistré) passent par le même chemin.
    // Les autosaves périodiques recalculent TOUS les prix (main d'oeuvre, onduleur, etc.)
    // Bloquer les autosaves = risque de prix à 0.00 dans les offres → INTERDIT.

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
        if (isVerbose()) // logger.debug('[TBL][AUTOSAVE] No-op (signature identique)');
        return;
      }
      lastQueuedSignatureRef.current = sig;

      // � FIX R11: SUPPRIMÉ blockGetRequestsTemporarily(800) ici
      // Ce blockGET(800) ÉCRASAIT la protection 5000ms de handleFieldChangeImpl
      // car blockGetRequestsTemporarily remplaçait changeInProgressUntil par now+800
      // au lieu de garder le max(existant, new). La protection 5000ms dans
      // handleFieldChangeImpl suffit et couvre tout le cycle.

      if (!submissionId) {
        // 🔥 FIX DISPLAY-ZERO: Déterminer si on force mode='open' après un nouveau devis
        const isUserChangeDraft = changedField && changedField !== 'NULL';
        let draftEvaluationMode: 'open' | 'change' | undefined = undefined;
        if (forceOpenAfterNewDevisRef.current && isUserChangeDraft) {
          draftEvaluationMode = 'open';
          forceOpenAfterNewDevisRef.current = false;
          logger.debug(`🔄 [TBL] Mode forcé à 'open' pour draft car nouveau devis (première évaluation complète)`);
        }

        // ✅ Brouillon global (default-draft): persistant sans lead.
        if (isDefaultDraft) {
          const evaluationResponse = await api.post('/api/tbl/submissions/create-and-evaluate', {
            treeId: effectiveTreeId || tree.id,
            formData,
            clientId: null,
            status: 'default-draft',
            providedName: 'Brouillon',
            changedFieldId: changedField,
            ...(draftEvaluationMode ? { evaluationMode: draftEvaluationMode } : {})
          });

          const createdOrReusedId = evaluationResponse?.submission?.id;
          if (createdOrReusedId) {
            setSubmissionId(createdOrReusedId);
            setDevisName('Brouillon');

            lastSavedSignatureRef.current = sig;
            setAutosaveLast(new Date());
            // 🚀 PERF FIX 22/02/2026: RETIRÉ !hasDebounceActive — permet d'afficher
            // les résultats intermédiaires pendant que l'utilisateur tape
            const isPeriodicAutosave = !changedField || changedField === 'NULL';
            const hasPendingRequest = !!pendingAutosaveRef.current;
            if (!isPeriodicAutosave && !hasPendingRequest) {
              broadcastCalculatedRefresh({
                reason: 'create-and-evaluate',
                evaluatedSubmissionId: createdOrReusedId,
                // 🔥 FIX REVISION-BROADCAST 09/03/2026: Override le submissionId de la closure
                // pour que useNodeCalculatedValue ne filtre pas le broadcast (submissionId mismatch)
                submissionId: createdOrReusedId,
                recalcCount: evaluationResponse?.submission?.TreeBranchLeafSubmissionData?.length,
                // 🎯 FIX: Passer les valeurs calculées pour éviter le refetch race condition
                submissionData: evaluationResponse?.submission?.TreeBranchLeafSubmissionData,
                // 🔥 FIX BROADCAST-NULL: nodeIds freshement calculés (incluant ceux avec value=null/∅)
                freshlyComputedNodeIds: evaluationResponse?.freshlyComputedNodeIds
              });
            } else {
              // 🔥 FIX DISPLAY-ZERO: Accumuler les valeurs pour le prochain broadcast
              const sdArray = evaluationResponse?.submission?.TreeBranchLeafSubmissionData as Array<{nodeId?: string; value?: unknown; operationResult?: unknown}> | undefined;
              const freshSet = new Set<string>(Array.isArray(evaluationResponse?.freshlyComputedNodeIds) ? evaluationResponse.freshlyComputedNodeIds as string[] : []);
              if (sdArray && Array.isArray(sdArray)) {
                for (const entry of sdArray) {
                  if (entry?.nodeId && entry?.value !== undefined && entry?.value !== null) {
                    accumulatedDisplayValuesRef.current[entry.nodeId] = entry.value;
                  } else if (entry?.nodeId && freshSet.has(entry.nodeId) && entry?.operationResult != null) {
                    // 🔥 FIX BROADCAST-NULL: Accumuler la valeur d'affichage même pour les fields avec value=null
                    const opRes = entry.operationResult;
                    const displayVal = typeof opRes === 'string' ? opRes : (opRes as Record<string, unknown>)?.humanText as string ?? null;
                    if (displayVal) accumulatedDisplayValuesRef.current[entry.nodeId] = displayVal;
                  }
                }
                // 🔥 FIX CORRECTION-PRIORITY 09/03/2026: Injecter dans TBL_FORM_DATA MÊME quand le broadcast est sauté
                // AVANT: Quand hasPendingRequest=true, les valeurs n'étaient accumulées que dans
                // accumulatedDisplayValuesRef (en mémoire) SANS mise à jour de window.TBL_FORM_DATA.
                // CONSÉQUENCE: Les lookups et displays lisaient les ANCIENNES valeurs dans TBL_FORM_DATA
                // car le broadcast (qui injecte dans TBL_FORM_DATA) était sauté.
                // Quand l'utilisateur corrigeait un champ (ex: Orientation Est→Nord), le backend recalculait
                // correctement mais le frontend ne VOYAIT PAS le résultat (affichait encore "Est").
                // FIX: Injecter les valeurs calculées dans TBL_FORM_DATA immédiatement, même sans broadcast.
                // Cela ne déclenche PAS de re-render React (pas de dispatchEvent), mais les prochains
                // lookups/displays qui lisent TBL_FORM_DATA verront les données corrigées.
                if (typeof window !== 'undefined' && window.TBL_FORM_DATA) {
                  for (const entry of sdArray) {
                    if (entry?.nodeId && entry?.value !== undefined && entry?.value !== null) {
                      window.TBL_FORM_DATA[entry.nodeId] = entry.value;
                    }
                  }
                }
              }
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
            changedFieldId: changedField,
            ...(draftEvaluationMode ? { evaluationMode: draftEvaluationMode } : {})
          });

          const createdOrReusedId = evaluationResponse?.submission?.id;
          if (createdOrReusedId) {
            setSubmissionId(createdOrReusedId);
            setDevisName('Brouillon');
            lastSavedSignatureRef.current = sig;
            setAutosaveLast(new Date());
            // 🚀 PERF FIX 22/02/2026: RETIRÉ !hasDebounceActive — permet d'afficher
            // les résultats intermédiaires pendant que l'utilisateur tape
            const isPeriodicAutosave = !changedField || changedField === 'NULL';
            const hasPendingRequest = !!pendingAutosaveRef.current;
            if (!isPeriodicAutosave && !hasPendingRequest) {
              broadcastCalculatedRefresh({
                reason: 'create-and-evaluate',
                evaluatedSubmissionId: createdOrReusedId,
                // 🔥 FIX REVISION-BROADCAST 09/03/2026: Override le submissionId de la closure
                submissionId: createdOrReusedId,
                recalcCount: evaluationResponse?.submission?.TreeBranchLeafSubmissionData?.length,
                submissionData: evaluationResponse?.submission?.TreeBranchLeafSubmissionData,
                // 🔥 FIX BROADCAST-NULL: nodeIds freshement calculés (incluant ceux avec value=null/∅)
                freshlyComputedNodeIds: evaluationResponse?.freshlyComputedNodeIds
              });
            } else {
              // 🔥 FIX DISPLAY-ZERO: Accumuler les valeurs pour le prochain broadcast
              const sdArray = evaluationResponse?.submission?.TreeBranchLeafSubmissionData as Array<{nodeId?: string; value?: unknown; operationResult?: unknown}> | undefined;
              const freshSet = new Set<string>(Array.isArray(evaluationResponse?.freshlyComputedNodeIds) ? evaluationResponse.freshlyComputedNodeIds as string[] : []);
              if (sdArray && Array.isArray(sdArray)) {
                for (const entry of sdArray) {
                  if (entry?.nodeId && entry?.value !== undefined && entry?.value !== null) {
                    accumulatedDisplayValuesRef.current[entry.nodeId] = entry.value;
                  } else if (entry?.nodeId && freshSet.has(entry.nodeId) && entry?.operationResult != null) {
                    const opRes = entry.operationResult;
                    const displayVal = typeof opRes === 'string' ? opRes : (opRes as Record<string, unknown>)?.humanText as string ?? null;
                    if (displayVal) accumulatedDisplayValuesRef.current[entry.nodeId] = displayVal;
                  }
                }
                // 🔥 FIX CORRECTION-PRIORITY 09/03/2026: Injecter dans TBL_FORM_DATA même quand le broadcast est sauté
                if (typeof window !== 'undefined' && window.TBL_FORM_DATA) {
                  for (const entry of sdArray) {
                    if (entry?.nodeId && entry?.value !== undefined && entry?.value !== null) {
                      window.TBL_FORM_DATA[entry.nodeId] = entry.value;
                    }
                  }
                }
              }
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
        // 🔥 FIX 01/02/2026: Forcer mode='open' si le clientId (leadId) a changé
        const clientIdJustChanged = effectiveClientId !== lastClientIdRef.current && effectiveClientId !== null;
        if (clientIdJustChanged) {
          logger.debug(`🔄 [TBL] ClientId changé: ${lastClientIdRef.current} → ${effectiveClientId}`);
          lastClientIdRef.current = effectiveClientId;
        }
        
        // 🚀 FIX R16: Le moteur est IDENTIQUE pour tous les modes (brouillon, lead, enregistré)
        // Seul un changement de clientId force 'open' (nouvelles données client)
        let effectiveMode: 'open' | 'change' | 'autosave' = isUserChange ? 'change' : 'autosave';
        if (clientIdJustChanged) {
          effectiveMode = 'open';
          logger.debug(`🔄 [TBL] Mode forcé à 'open' car clientId a changé`);
        }
        // 🔥 FIX DISPLAY-ZERO: Après handleNewDevis, la première évaluation doit être 'open'
        // pour recalculer TOUS les display fields (pas seulement ceux affectés par un seul champ)
        if (forceOpenAfterNewDevisRef.current && isUserChange) {
          effectiveMode = 'open';
          forceOpenAfterNewDevisRef.current = false;
          logger.debug(`🔄 [TBL] Mode forcé à 'open' car nouveau devis (première évaluation complète)`);
        }
        
        const evaluationResponse = await api.post('/api/tbl/submissions/create-and-evaluate', {
          treeId: effectiveTreeId || tree.id, // 🚀 FIX R9: Toujours envoyer treeId pour éviter une requête DB inutile côté backend
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
          // � FIX R16: Plus besoin de fenêtre 3s - le trigger index gère le recalcul ciblé
          
          setSubmissionId(returnedSubmissionId);
          setIsLoadedDevis(false);
          setOriginalDevisId(null);
          setOriginalDevisName(null);
          setHasCopiedDevis(true);
        }
        
        
        lastSavedSignatureRef.current = sig;
        setAutosaveLast(new Date());
        
        // 🚀 FIX: Ne pas broadcast si autosave périodique OU si une requête pendante existe OU si un debounce est actif
        // Une requête pendante = l'utilisateur a changé à nouveau pendant qu'on sauvegardait → données périmées
        // Un debounce actif = un nouveau changement est en attente avant d'être envoyé
        // Broadcaster avec pending cause des cascades Auto-Select en boucle (selects qui changent tout seuls)
        const isPeriodicAutosave = !changedField || changedField === 'NULL';
        const isOpenMode = effectiveMode === 'open';
        const hasPendingRequest = !!pendingAutosaveRef.current;
        // 🚀 PERF FIX 22/02/2026: RETIRÉ !hasDebounceActive de la condition de broadcast.
        // AVANT: Si l'utilisateur tapait rapidement (debounce actif), AUCUN résultat n'apparaissait
        // car TOUS les broadcasts étaient skippés. L'utilisateur devait attendre la fin complète de la chaîne.
        // APRÈS: On broadcast tant qu'il n'y a pas de requête pending (données non-obsolètes).
        // Le debounce actif signifie juste que l'utilisateur tape encore — les résultats du cycle PRÉCÉDENT
        // sont toujours valides et méritent d'être affichés comme résultats intermédiaires.
        // Le risque de cascade Auto-Select est mitigé par le debounce de 400ms sur useTBLTableLookup.
        const shouldBroadcast = (!isPeriodicAutosave || isOpenMode) && !hasPendingRequest;
        if (shouldBroadcast) {
          broadcastCalculatedRefresh({
            reason: 'create-and-evaluate',
            evaluatedSubmissionId: effectiveSubmissionId,
            // 🔥 FIX REVISION-BROADCAST 09/03/2026: Override le submissionId de la closure
            // Quand le backend crée une révision (nouveau submissionId), la closure de
            // broadcastCalculatedRefresh contient encore l'ancien ID. Les hooks filtrent
            // par submissionId et rejettent le broadcast → display fields non mis à jour.
            // En passant le submissionId effectif dans le detail, le spread ...(detail||{})
            // écrase la valeur de closure dans l'event CustomEvent.
            submissionId: effectiveSubmissionId,
            recalcCount: evaluationResponse?.submission?.TreeBranchLeafSubmissionData?.length,
            // 🎯 FIX: Passer les valeurs calculées pour éviter le refetch race condition
            submissionData: evaluationResponse?.submission?.TreeBranchLeafSubmissionData,
            // 🔥 FIX BROADCAST-NULL: nodeIds freshement calculés (incluant ceux avec value=null/∅)
            freshlyComputedNodeIds: evaluationResponse?.freshlyComputedNodeIds
          });
        } else {
          // 🔥 FIX DISPLAY-ZERO: Accumuler les valeurs pour le prochain broadcast
          const sdArray = evaluationResponse?.submission?.TreeBranchLeafSubmissionData as Array<{nodeId?: string; value?: unknown; operationResult?: unknown}> | undefined;
          const freshSet = new Set<string>(Array.isArray(evaluationResponse?.freshlyComputedNodeIds) ? evaluationResponse.freshlyComputedNodeIds as string[] : []);
          if (sdArray && Array.isArray(sdArray)) {
            for (const entry of sdArray) {
              if (entry?.nodeId && entry?.value !== undefined && entry?.value !== null) {
                accumulatedDisplayValuesRef.current[entry.nodeId] = entry.value;
              } else if (entry?.nodeId && freshSet.has(entry.nodeId) && entry?.operationResult != null) {
                const opRes = entry.operationResult;
                const displayVal = typeof opRes === 'string' ? opRes : (opRes as Record<string, unknown>)?.humanText as string ?? null;
                if (displayVal) accumulatedDisplayValuesRef.current[entry.nodeId] = displayVal;
              }
            }
            // 🔥 FIX CORRECTION-PRIORITY 09/03/2026: Injecter dans TBL_FORM_DATA même quand le broadcast est sauté
            if (typeof window !== 'undefined' && window.TBL_FORM_DATA) {
              for (const entry of sdArray) {
                if (entry?.nodeId && entry?.value !== undefined && entry?.value !== null) {
                  window.TBL_FORM_DATA[entry.nodeId] = entry.value;
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // Discret: pas de toast pour éviter le spam, logs console seulement
      logger.warn('⚠️ [TBL][AUTOSAVE] Échec autosave', e);
      // 🎯 FIX: Débloquer les GET en cas d'erreur
      unblockGetRequests();
    } finally {
      lastQueuedSignatureRef.current = null;
      setIsAutosaving(false);
      autosaveInFlightRef.current = false;
      
      const pending = pendingAutosaveRef.current;
      if (pending) {
        // 🔥 FIX R11: NE PAS débloquer les GET si une requête pending existe
        // La requête pending va être traitée immédiatement, et les GETs
        // retourneraient des valeurs stale (anciennes) pendant cette fenêtre
        pendingAutosaveRef.current = null;
        // Micro-coalescing: exécuter juste après la fin de la requête courante.
        setTimeout(() => {
          void doAutosave(pending.data, pending.changedField);
        }, 0);
      } else if (!debounceActiveRef.current) {
        // 🔥 FIX R11: Ne débloquer que s'il n'y a NI pending NI debounce actif
        // Si debounce actif = l'utilisateur tape encore → le prochain doAutosave gèrera le unblock
        unblockGetRequests();
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
      
      if (isVerbose()) logger.warn('⚠️ [TBL][PREVIEW] Échec preview-evaluate live', err);
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

  // 📋 Gestionnaire: forcer un recalcul TBL après sauvegarde d'un override
  const handleGestionnaireOverrideSaved = useCallback(() => {
    // Réinitialiser les signatures pour forcer le re-evaluate
    // (les données de formulaire n'ont pas changé, mais les overrides oui)
    lastSavedSignatureRef.current = null;
    lastQueuedSignatureRef.current = null;
    // Déclencher un recalcul avec les données courantes
    if (Object.keys(formDataRef.current).length > 0) {
      scheduleAutosaveRef.current(formDataRef.current, 'gestionnaire-override');
    }
  }, []);

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
        logger.debug('🔄 [TBL] Force refresh déclenché depuis Parameters');
        logger.debug('🔄 [TBL] useFixed:', useFixed);
        logger.debug('🔄 [TBL] newData.refetch:', typeof newData.refetch);
        logger.debug('🔄 [TBL] oldData.refetch:', typeof oldData.refetch);
        
        if (useFixed && newData.refetch) {
          logger.debug('🔄 [TBL] Appel de newData.refetch()');
          newData.refetch();
        } else if (!useFixed && oldData.refetch) {
          logger.debug('🔄 [TBL] Appel de oldData.refetch()');
          oldData.refetch();
        } else {
          logger.warn('⚠️ [TBL] Aucune fonction refetch disponible !');
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
            if (!grouped[key]) grouped[key] = { option: it.parentOption, fields: [] } as unknown;
            grouped[key].fields.push({ fieldId: it.fieldId, label: it.label });
          }
          console.group('🧪 TBL VERIFY - Champs conditionnels injectés par parent');
          logger.debug('Total champs conditionnels visibles:', items.length);
          const parents = new Set(items.map(i => i.parentFieldId));
          logger.debug('Parents distincts (instances):', Array.from(parents));
          Object.entries(grouped).forEach(([key, group]) => {
            const [parentFieldId] = key.split('::');
            console.group(`Parent ${parentFieldId} (option="${group.option}")`);
            group.fields.forEach(f => logger.debug(`- ${f.label} [${f.fieldId}]`));
            console.groupEnd();
          });
          console.groupEnd();
          try { message.success(`Vérification: ${items.length} champs conditionnels, ${parents.size} parents distincts.`); } catch {/* noop */}
          return { count: items.length, parents: Array.from(parents), details: grouped };
        } catch (e) {
          logger.error('❌ TBL VERIFY a échoué:', e);
          try { message.error('Vérification échouée (voir console)'); } catch {/* noop */}
          return null;
        }
      };
      
      // Debug helpers
      if (process.env.NODE_ENV === 'development') {
        (window as any).TBL_PRINT_NODE_METADATA = (nodeId?: string) => {
          try {
            const match = (rawNodes || []).find(n => n.id === nodeId);
            logger.debug('🔎 [TBL] node metadata for', nodeId, match?.metadata || match);
            return match?.metadata || match;
          } catch (e) { logger.error('[TBL] TBL_PRINT_NODE_METADATA failed', e); }
          return null;
        };

        (window as any).TBL_PRINT_SECTION_METADATA = (tabId?: string, sectionId?: string) => {
          try {
            const sSet = (useFixed ? (newData.sectionsByTab || {}) : (oldData.sectionsByTab || {}));
            const sectionsList = Object.values(sSet).flat();
            const found = sectionsList.find((s: Record<string, unknown>) => s.id === sectionId);
            logger.debug('🔎 [TBL] section metadata for', sectionId, found?.metadata || found);
            return found?.metadata || found;
          } catch (e) { logger.error('[TBL] TBL_PRINT_SECTION_METADATA failed', e); }
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
      logger.error('❌ [TBL] Erreur lors de la génération du nom unique:', error);
      return baseName;
    }
  }, [api]);

  // 🆕 FONCTION ENREGISTRER - Ouvre le modal pour choisir le nom du devis
  const handleSaveDevis = useCallback(async () => {
    // 🔥 FIX: Devis déjà enregistré → les modifications sont sauvegardées automatiquement (autosave)
    // Plus besoin de créer une révision -N. On confirme simplement que tout est bien enregistré.
    if (isDevisSaved) {
      message.success('Devis enregistré ✓');
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
  }, [isDevisSaved, leadId, clientData.name]);

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
      logger.debug('💾 [TBL] Enregistrement du devis - Conversion default-draft → vrai devis');
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
        logger.debug(`🔄 [TBL] submissionId changé → forcer mode='open' pendant 3s`);
        
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
            logger.debug('🔄 [TBL] Vidage du brouillon courant:', oldDraftIdToClear);
            // Utiliser POST reset-data au lieu de PUT pour vider proprement
            await api.post(`/api/treebranchleaf/submissions/${oldDraftIdToClear}/reset-data`, {});
            logger.debug('✅ [TBL] Brouillon vidé (prêt pour le prochain devis)');
          } catch (error) {
            logger.warn('⚠️ [TBL] Impossible de vider le brouillon:', error);
            // Ce n'est pas critique, on continue
          }
        }
        
        message.success(`Devis "${finalName}" enregistré avec succès !`);
        logger.debug('✅ [TBL] Devis enregistré:', newSubmissionId);
        setSaveDevisModalVisible(false);
      } else {
        message.error('Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      logger.error('❌ [TBL] Erreur enregistrement:', error);
      message.error('Erreur lors de l\'enregistrement du devis');
    } finally {
      setIsSavingDevis(false);
    }
  }, [leadId, saveDevisName, effectiveTreeId, api, formData, normalizePayload, computeSignature, generateUniqueDevisName, stripRevisionSuffix, submissionId]);

  // 🆕 Créer une copie automatique du devis chargé
  const createDevisCopy = useCallback(async (): Promise<string | null> => {
    if (!originalDevisName || !leadId || !api || !effectiveTreeId) return null;
    
    try {
      logger.debug('📋 [TBL] Copie → Brouillon (default-draft):', originalDevisName);

      // 1) Récupérer/créer le default-draft
      const currentUserId = user?.id;
      if (!currentUserId) return null;

      const url = `/api/treebranchleaf/submissions?treeId=${effectiveTreeId}&status=default-draft&userId=${currentUserId}`;
      const existingDrafts = await api.get(url);
      const draftsArray = Array.isArray(existingDrafts) ? existingDrafts : (existingDrafts as unknown)?.data || [];
      let defaultDraft = (draftsArray as Array<{ id?: string; status?: string }>).find((d) => d.status === 'default-draft' && d.id);
      if (!defaultDraft?.id) {
        const created = await api.post('/api/tbl/submissions/create-and-evaluate', {
          treeId: effectiveTreeId,
          formData: {},
          status: 'default-draft',
          providedName: 'Brouillon'
        });
        const createdId = (created as unknown)?.submission?.id;
        if (!createdId) return null;
        defaultDraft = { id: createdId, status: 'default-draft' };
      }

      // 2) Associer le lead au brouillon
      try {
        await api.patch(`/api/treebranchleaf/submissions/${defaultDraft.id}`, { clientId: leadId });
      } catch (e) {
        logger.warn('⚠️ [TBL] Impossible d\'associer le lead au brouillon:', e);
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
      logger.debug('✅ [TBL] Copie appliquée au brouillon:', defaultDraft.id);
      return defaultDraft.id;
    } catch (error) {
      logger.error('❌ [TBL] Erreur création copie:', error);
      message.error('Erreur lors de la création de la copie');
      return null;
    }
  }, [originalDevisName, leadId, api, effectiveTreeId, formData, normalizePayload, computeSignature, user?.id]);

  // ⚡ Debounce pour éviter les requêtes multiples (200ms)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const immediateEvaluateRef = useRef<(...args: unknown[]) => void>();
  // 🔥 FIX A: Accumuler TOUS les changedFieldIds pendant la fenêtre de debounce
  // AVANT: seul le dernier capturedFieldId était envoyé → les champs modifiés avant étaient perdus
  const accumulatedChangedFieldIdsRef = useRef<Set<string>>(new Set());

  // 🎯 Implémentation complète de handleFieldChange avec toutes les dépendances
  const handleFieldChangeImpl = useCallback((fieldId: string, value: string | number | boolean | string[] | null | undefined) => {
    // 🚀 FIX R18: Normaliser undefined → null pour garantir la sérialisation JSON
    // JSON.stringify({ key: undefined }) supprime la clé = le backend ne voit pas le clear
    const normalizedValue = value === undefined ? null : value;
    
    // ⚡ IGNORER COMPLÈTEMENT les champs miroirs - ils sont gérés automatiquement par le système
    if (fieldId?.startsWith('__mirror_data_')) {
      logger.debug(`🚫 [TBL] Champ miroir ignoré: ${fieldId}`);
      return; // Ne pas traiter les miroirs, éviter d'appeler debounce avec undefined
    }

    // 🔥 FIX: Devis enregistré = édition in-place (comme un brouillon)
    // Plus de révision -N, plus de copie. L'autosave met à jour directement la même submission.
    
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
          logger.info(`[TBL DynamicConfig] Intégration dynamique du champ conditionnel '${fieldId}'.`);
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
              logger.warn('[TBL][DynamicConfig][FALLBACK_MIN]', fieldId);
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
          if (fieldConfig.options) {
            // 🔧 FIX: Supporter les valeurs multiselect (CSV ou array)
            // Pour un multiselect, la valeur peut être "pc,iso" ou ["pc","iso"] ou "" (déselection)
            const strValue = String(value ?? '');
            if (strValue === '') {
              // Valeur vide = déselection → toujours valide
              break;
            }
            // Séparer les valeurs CSV et vérifier chacune individuellement
            const selectedValues = strValue.includes(',') 
              ? strValue.split(',').map(v => v.trim()).filter(Boolean) 
              : [strValue];
            const invalidValues = selectedValues.filter(
              sv => !fieldConfig.options!.find(opt => opt.value === sv)
            );
            if (invalidValues.length > 0) {
              isValid = false;
              validationMessage = `Valeur(s) non valide(s) pour cette liste: ${invalidValues.join(', ')}`;
            }
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

    // 🚀 FIX STALE VALUES: Bloquer les GET IMMÉDIATEMENT lors du changement utilisateur
    // Avant, les GET n'étaient bloqués qu'après 300ms de debounce (dans doAutosave)
    // Pendant ces 300ms, un GET pouvait retourner des valeurs stale et écraser l'affichage
    if (!fieldId?.startsWith('__mirror_data_')) {
      blockGetRequestsTemporarily(2000); // 🔥 FIX R10: Protection 2s (couvre debounce 300ms + latence réseau), sera reset par unblockGetRequests dans doAutosave
    }

    // Si la validation passe, mettre à jour le state
    setFormData(prev => {
      const next: Record<string, unknown> = { ...prev, [fieldId]: normalizedValue };
      // logger.debug removed for performance
      
      // 🔗 NOUVEAU : Si le champ est une référence partagée (alias), ajouter aussi la clé shared-ref-*
      let fieldDef: unknown = null;
      try {
        // Chercher le champ dans la configuration pour voir s'il a un sharedReferenceId
        for (const tab of tabs) {
          for (const section of tab.sections) {
            const match = section.fields.find((sf: Record<string, unknown>) => sf.id === fieldId);
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
          logger.debug(`🔗 [TBL] Champ ${fieldId} est un alias de ${sharedRefKey}, ajout au formData`);
          next[sharedRefKey] = normalizedValue;
        }

        // Si le fieldId est déjà un shared-ref-*, chercher les aliases pour les mettre à jour aussi
        if (fieldId.startsWith('shared-ref-')) {
          for (const tab of tabs) {
            for (const section of tab.sections) {
              const aliases = section.fields.filter((sf: Record<string, unknown>) => sf.sharedReferenceId === fieldId);
              aliases.forEach((alias: Record<string, unknown>) => {
                logger.debug(`🔗 [TBL] Mise à jour alias ${alias.id} depuis shared-ref ${fieldId}`);
                next[alias.id] = normalizedValue;
              });
            }
          }
        }
      } catch (err) {
        logger.warn('[TBL] Erreur lors de la gestion des shared-ref:', err);
      }
      
      try {
        // Exposer en debug (lecture) pour analyse miroir
        if (typeof window !== 'undefined') {
          const prevGlobal = window.TBL_FORM_DATA || {};
          // 🔥 FIX 23/02/2026: MERGE au lieu de REPLACE pour préserver les valeurs broadcast
          // AVANT: window.TBL_FORM_DATA = next → écrasait les valeurs calculées (KVA sum-total, etc.)
          // injectées par broadcastCalculatedRefresh() → alertes lookupAlerts ne fonctionnaient JAMAIS
          // APRÈS: merge prevGlobal (contient les valeurs broadcast) avec next (contient les inputs user)
          // → les clés calculées (sum-total, etc.) survivent entre les changements de champs
          window.TBL_FORM_DATA = { ...prevGlobal, ...next };

          // ⚠️ DISPATCH CONDITIONAL: Only emit event when the changed field affects shared refs or mirrors
          const isMirrorKey = fieldId && String(fieldId).startsWith('__mirror_data_');
          const isSharedRef = (fieldDef && !!fieldDef.sharedReferenceId) || (typeof fieldId === 'string' && fieldId.startsWith('shared-ref-'));
          const dynamicLabel = fieldConfig?.label || fieldId;
          const mirrorUpdated = (typeof dynamicLabel === 'string' && / - Champ$/i.test(dynamicLabel)) ? (`__mirror_data_${dynamicLabel.replace(/ - Champ$/i, '')}`) : null;

          const valueChanged = (prevGlobal[fieldId] !== value) || (isSharedRef && prevGlobal[fieldDef?.sharedReferenceId || ''] !== value) || (mirrorUpdated && prevGlobal[mirrorUpdated] !== value);

          if ((isMirrorKey || isSharedRef || mirrorUpdated) && valueChanged) {
            const event = new CustomEvent('TBL_FORM_DATA_CHANGED', { detail: { fieldId, value } });
            window.dispatchEvent(event);
          } else {
            if (localStorage.getItem('TBL_DIAG') === '1') logger.debug('🔕 [TBL] Dispatch TBL_FORM_DATA_CHANGED SKIPPED:', { fieldId, value, isMirrorKey, isSharedRef, mirrorUpdated, valueChanged });
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
      const fieldType = String((fieldConfig as unknown)?.type || '').toLowerCase();
      // Log supprimé pour performance

      // Garder en mémoire le dernier champ réellement modifié (utile pour flush/versioning)
      if (realFieldId) {
        lastRealChangedFieldIdRef.current = realFieldId;
      }

      // ⚡ Évaluation avec debounce de 300ms - évite les requêtes doublons lors de la saisie rapide
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // 🔧 FIX RACE CONDITION: Marquer qu'un changement est en debounce
      debounceActiveRef.current = true;
      
      // 🚀 FIX STALE VALUES: Capturer `next` dans une variable locale
      const capturedNext = { ...next } as TBLFormData;
      
      // 🔥 FIX A: Accumuler le changedFieldId dans le Set au lieu de ne garder que le dernier
      // Si l'utilisateur modifie champ A puis champ B en <300ms, les DEUX sont envoyés au backend
      if (realFieldId) {
        accumulatedChangedFieldIdsRef.current.add(realFieldId);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        // 🔧 FIX RACE CONDITION: Debounce terminé, prêt à évaluer
        debounceActiveRef.current = false;
        
        // 🔥 FIX A: Envoyer TOUS les changedFieldIds accumulés (comma-separated)
        const allChangedIds = Array.from(accumulatedChangedFieldIdsRef.current);
        const combinedFieldId = allChangedIds.length > 0 ? allChangedIds.join(',') : undefined;
        accumulatedChangedFieldIdsRef.current.clear(); // Reset pour le prochain cycle
        
        if (immediateEvaluateRef.current) {
          immediateEvaluateRef.current(capturedNext, combinedFieldId);
        } else {
          logger.warn('⚠️ [TBL] immediateEvaluateRef pas encore initialisé');
        }
      }, 300); // 🚀 PERF FIX R15: Revenir à 300ms - 100ms cause trop de requêtes = lenteur !

      // 🚀 FIX R17: Suppression de l'appel ensureCompletedRevisionExists ici.
      // Le backend gère déjà le versioning automatiquement dans doAutosave:
      // si status='completed' et que ce n'est pas déjà une révision, il clone.
      // Un seul POST suffit (comme en mode brouillon).
      
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
        logger.debug(`🔒 [PRELOAD] Sauté pour ${fieldId} car sync bidirectionnel en cours (skip jusqu'à ${new Date(skipPreloadUntil).toISOString()})`);
      }
      
      if (fieldId && value !== null && value !== undefined && !shouldSkipPreload) {
        let numericValue = typeof value === 'number' ? value : parseInt(String(value), 10);
        
        // 🔒 VALIDATION: Vérifier si ce champ est source d'un repeater
        // 🔍 DEBUG: Afficher tous les repeaters avec countSourceNodeId
        const allRepeaters = (rawNodes || []).filter((n: Record<string, unknown>) => n.type === 'leaf_repeater');
        
        const repeatersUsingThisField = (rawNodes || []).filter(
          (node: unknown) => node.repeater_countSourceNodeId === fieldId
        );
        
        // Si ce champ est lié à un repeater, forcer min=1 (l'original ne peut pas être supprimé)
        if (repeatersUsingThisField.length > 0 && !isNaN(numericValue) && numericValue < 1) {
          logger.debug(`🔒 [PRELOAD] Champ ${fieldId}: valeur ${numericValue} forcée à 1 (minimum obligatoire)`);
          numericValue = 1;
          // Mettre à jour la valeur dans le state pour afficher 1
          const currentFieldValue = next[fieldId];
          next[fieldId] = typeof currentFieldValue === 'object' && currentFieldValue !== null
            ? { ...currentFieldValue, value: '1' }
            : '1';
        }
        
        if (!isNaN(numericValue) && numericValue >= 1 && repeatersUsingThisField.length > 0) {
          logger.debug(`🚀 [PRELOAD] Champ ${fieldId} = ${numericValue} déclenche preload pour ${repeatersUsingThisField.length} repeater(s)`);
          
          // Récupérer le treeId depuis le contexte (tree ou rawNodes[0])
          const currentTreeId = tree?.id || rawNodes?.[0]?.treeId || '';
          
          // Déclencher le preload pour chaque repeater concerné (en arrière-plan)
          repeatersUsingThisField.forEach((repeater: Record<string, unknown>) => {
            logger.debug(`🚀 [PRELOAD] Appel /api/repeat/${repeater.id}/preload-copies avec targetCount=${numericValue}, treeId=${currentTreeId}`);
            api.post(`/api/repeat/${repeater.id}/preload-copies`, { targetCount: numericValue })
              .then((result: unknown) => {
                logger.debug(`✅ [PRELOAD] Repeater ${repeater.id}: ${result.createdCopies} copies créées (total: ${result.totalCopies})`, result.newNodeIds);
                // Déclencher un refresh de l'arbre - TOUJOURS pour synchroniser
                if (typeof window !== 'undefined' && currentTreeId) {
                  logger.debug(`🔄 [PRELOAD] Déclenchement refresh arbre via tbl-repeater-updated (treeId=${currentTreeId})`);
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
              .catch((err: unknown) => {
                logger.error(`❌ [PRELOAD] Erreur pour repeater ${repeater.id}:`, err);
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
      // logger.debug('[TBL][SAVE_AS_DEVIS] Params', values);
  const _dataSize = (() => { try { return JSON.stringify(formData).length; } catch { return 'n/a'; } })();
      // logger.debug('[TBL][SAVE_AS_DEVIS] formData', { keys: Object.keys(formData).length, approxBytes: dataSize });
      const result = await saveAsDevis(formData, tree!.id, {
        clientId: leadId,
        projectName: values.projectName,
        notes: values.notes,
        isDraft: false
      });
      // logger.debug('[TBL][SAVE_AS_DEVIS] Résultat', result);
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

      // 🏗️ Pré-sélectionner les produits depuis le formulaire TBL
      if (pdfProductOptions.length > 0) {
        const productSourceNode = (rawNodes as unknown[]).find((n: Record<string, unknown>) => n.hasProduct && n.product_sourceNodeId === n.id);
        if (productSourceNode) {
          const mergedData = (typeof window !== 'undefined' && window.TBL_FORM_DATA) ? { ...formData, ...window.TBL_FORM_DATA } : formData;
          const sourceValue = mergedData[productSourceNode.id];
          let vals: string[];
          if (Array.isArray(sourceValue)) vals = sourceValue.map(String);
          else if (typeof sourceValue === 'string' && sourceValue.includes(',')) vals = sourceValue.split(',').map((v: string) => v.trim()).filter(Boolean);
          else if (sourceValue) vals = [String(sourceValue)];
          else vals = [];
          // "all" = tout cocher
          if (vals.includes('all')) {
            setSelectedPdfProducts(pdfProductOptions.map(o => o.value));
          } else {
            const matching = pdfProductOptions.filter(o => vals.includes(o.value));
            setSelectedPdfProducts(matching.length > 0 ? matching.map(o => o.value) : []);
          }
        } else {
          setSelectedPdfProducts([]);
        }
      }
      
      const effectiveTreeId = treeId || 'cmf1mwoz10005gooked1j6orn';
      const response = await api.get(`/api/documents/templates?treeId=${effectiveTreeId}&isActive=true`);
      
      const templates = Array.isArray(response) ? response : (response?.data || []);
      setAvailableTemplates(templates);
      // Pré-sélectionner : documents par défaut + documents liés aux produits sélectionnés
      const autoSelected = templates
        .filter((t: Record<string, unknown>) => t.isDefault || (t.productValue && selectedPdfProducts.includes(t.productValue)))
        .map((t: Record<string, unknown>) => t.id);
      // Si aucun critère, sélectionner tous
      setSelectedTemplateIds(autoSelected.length > 0 ? autoSelected : templates.map((t: Record<string, unknown>) => t.id));
      
      if (templates.length === 0) {
        message.info('Aucun template de document disponible pour cet arbre');
      }
    } catch (error) {
      logger.error('❌ Erreur chargement templates:', error);
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
      // 🔥 FIX TOTALS-PDF: Fusionner formData (React state) avec window.TBL_FORM_DATA
      // window.TBL_FORM_DATA contient TOUTES les valeurs y compris les valeurs calculées
      // (formules, opérations, links, sum-totals) qui sont injectées par broadcastCalculatedRefresh
      // mais ne sont PAS toujours dans le state React formData.
      const mergedTblData = (typeof window !== 'undefined' && window.TBL_FORM_DATA)
        ? { ...formData, ...window.TBL_FORM_DATA }
        : formData;

      // 🏗️ Produits choisis par le commercial dans le modal de génération
      const productsForDoc = selectedPdfProducts
        .map(val => pdfProductOptions.find(o => o.value === val))
        .filter(Boolean) as Array<{value: string, label: string, icon?: string, color?: string}>;
      
      const documentData = {
        templateId,
        submissionId,
        leadId: clientData.id,
        // Données du formulaire TBL (avec valeurs calculées incluses)
        tblData: mergedTblData,
        // Données du client
        lead: {
          firstName: clientData.name.split(' ')[0] || '',
          lastName: clientData.name.split(' ').slice(1).join(' ') || '',
          email: clientData.email,
          phone: clientData.phone,
          address: clientData.address,
          company: clientData.name,
        },
        // 🏗️ Produits sélectionnés par le commercial (pour auto-création chantiers après signature)
        selectedProducts: productsForDoc.length > 0 ? productsForDoc : undefined,
      };
      
      logger.debug('📄 [TBL] Génération PDF avec:', documentData);
      
      const response = await api.post('/api/documents/generated/generate', documentData);
      
      if (response?.id) {
        message.success('Document généré avec succès !');
        setPdfModalVisible(false);
        
        // 📧 Stocker l'ID du document généré pour l'envoi par email
        setLastGeneratedDocId(response.id);
        
        // Ouvrir le PDF directement dans un nouvel onglet
        const pdfUrl = `/api/documents/generated/${response.id}/download`;
        logger.debug('📄 [TBL] Ouverture du PDF:', pdfUrl);
        window.open(pdfUrl, '_blank');
        
        // Émettre un événement pour rafraîchir la liste des documents
        window.dispatchEvent(new CustomEvent('document-generated', { detail: { documentId: response.id } }));
      } else {
        message.success('Document créé ! La génération PDF est en cours...');
        setPdfModalVisible(false);
      }
    } catch (error: unknown) {
      logger.error('❌ Erreur génération PDF:', error);
      message.error(error?.response?.data?.error || 'Erreur lors de la génération du document');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // 📧 Résoudre les variables dans un template email
  const resolveTemplateVariables = useCallback((text: string): string => {
    if (!text) return '';
    let resolved = text;
    // Variables lead/client
    const leadMap: Record<string, string> = {
      'lead.firstName': clientData.name?.split(' ')[0] || '',
      'lead.lastName': clientData.name?.split(' ').slice(1).join(' ') || '',
      'lead.fullName': clientData.name || '',
      'lead.email': clientData.email || '',
      'lead.phone': clientData.phone || '',
      'lead.address': clientData.address || '',
      'lead.company': clientData.name || '',
    };
    for (const [key, val] of Object.entries(leadMap)) {
      resolved = resolved.replace(new RegExp(`\\{${key.replace('.', '\\.')}\\}`, 'g'), val);
    }
    // Variables organisation (on utilise user.organization si disponible)
    const orgMap: Record<string, string> = {
      'org.name': '',
      'org.email': '',
      'org.phone': '',
    };
    resolved = resolved.replace(/\{org\.(\w+)\}/g, (_match, field) => orgMap[`org.${field}`] || '');
    // Variables devis
    resolved = resolved.replace(/\{quote\.(\w+)\}/g, '');
    // Variables TBL (formData)
    resolved = resolved.replace(/@value\.\{([^}]+)\}/g, (_match, nodeId) => {
      const val = formData[nodeId];
      if (val === null || val === undefined) return '';
      return String(val);
    });
    return resolved;
  }, [clientData, formData]);

  // 📧 Ouvrir le sélecteur de PDF pour un devis depuis la liste
  const handleSendEmailFromDevisList = useCallback(async (devisSubmissionId: string, leadEmail: string) => {
    try {
      setLoadingDevisPdfs(true);
      setDevisEmailRecipient(leadEmail);
      const docs = await api.get(`/api/documents/generated?submissionId=${devisSubmissionId}`);
      const docList = Array.isArray(docs) ? docs : [];
      if (docList.length === 0) {
        message.info('Aucun PDF généré pour ce devis. Générez d\'abord un PDF.');
        return;
      }
      if (docList.length === 1) {
        // Un seul PDF → ouvrir directement le modal d'envoi
        setLastGeneratedDocId(docList[0].id);
        // Charger les templates email
        try {
          const templates = await api.get('/api/settings/email-templates');
          setEmailTemplatesList(Array.isArray(templates) ? templates : []);
        } catch { setEmailTemplatesList([]); }
        emailForm.setFieldsValue({ to: leadEmail, subject: '', body: '' });
        setEmailModalVisible(true);
      } else {
        // Plusieurs PDFs → laisser choisir
        setDevisPdfList(docList);
        setDevisPdfSelectorVisible(true);
      }
    } catch (error) {
      logger.error('❌ Erreur chargement PDFs du devis:', error);
      message.error('Erreur lors du chargement des documents');
    } finally {
      setLoadingDevisPdfs(false);
    }
  }, [api, emailForm]);

  // 📧 Sélectionner un PDF depuis la liste et ouvrir le modal d'envoi
  const handleSelectPdfForEmail = useCallback(async (docId: string) => {
    setLastGeneratedDocId(docId);
    setDevisPdfSelectorVisible(false);
    try {
      const templates = await api.get('/api/settings/email-templates');
      setEmailTemplatesList(Array.isArray(templates) ? templates : []);
    } catch { setEmailTemplatesList([]); }
    emailForm.setFieldsValue({ to: devisEmailRecipient, subject: '', body: '' });
    setEmailModalVisible(true);
  }, [api, emailForm, devisEmailRecipient]);

  // 📧 Ouvrir le modal d'envoi email
  const handleOpenEmailModal = useCallback(async () => {
    if (!lastGeneratedDocId) {
      message.warning('Veuillez d\'abord générer un PDF');
      return;
    }
    // Charger les templates email
    try {
      const templates = await api.get('/api/settings/email-templates');
      setEmailTemplatesList(Array.isArray(templates) ? templates : []);
    } catch {
      setEmailTemplatesList([]);
    }
    // Pré-remplir le formulaire
    emailForm.setFieldsValue({
      to: clientData.email || '',
      subject: '',
      body: '',
    });
    setEmailModalVisible(true);
  }, [lastGeneratedDocId, api, emailForm, clientData.email]);

  // 📧 Appliquer un template email sélectionné
  const handleSelectEmailTemplate = useCallback((templateId: string) => {
    const tmpl = emailTemplatesList.find(t => t.id === templateId);
    if (!tmpl) return;
    emailForm.setFieldsValue({
      subject: resolveTemplateVariables(tmpl.subject),
      body: resolveTemplateVariables(tmpl.content),
    });
  }, [emailTemplatesList, emailForm, resolveTemplateVariables]);

  // 📧 Envoyer l'email avec le PDF
  const handleSendEmailWithPdf = useCallback(async () => {
    try {
      const values = await emailForm.validateFields();
      if (!lastGeneratedDocId) {
        message.error('Aucun document PDF à envoyer');
        return;
      }
      setSendingEmail(true);
      const result = await api.post(`/api/documents/generated/${lastGeneratedDocId}/send-email`, {
        to: values.to,
        subject: values.subject,
        body: values.body,
        cc: values.cc || undefined,
        bcc: values.bcc || undefined,
        includeProductDocs,
        includeSignatureLink,
        tblData: includeProductDocs ? formData : undefined,
      });
      const fichesMsg = result?.productDocsAttached > 0
        ? ` (+ ${result.productDocsAttached} fiche(s) technique(s))`
        : '';
      const signMsg = result?.signatureLinkIncluded ? ' ✍️ Lien de signature inclus.' : '';
      message.success(`Email envoyé avec succès !${fichesMsg}${signMsg}`);
      setEmailModalVisible(false);
      emailForm.resetFields();
      // Rafraîchir le statut de signature si un lien a été inclus
      if (result?.signatureLinkIncluded && submissionId) {
        try {
          const sigRes = await api.get(`/api/e-signature/submission/${submissionId}/status`);
          if (sigRes?.success) setSignatureStatus({ totalSigned: sigRes.totalSigned, totalPending: sigRes.totalPending, signatures: sigRes.signatures });
        } catch { /* noop */ }
      }
    } catch (error: unknown) {
      logger.error('❌ Erreur envoi email:', error);
      message.error(error?.response?.data?.error || error?.message || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setSendingEmail(false);
    }
  }, [emailForm, lastGeneratedDocId, api, includeProductDocs, includeSignatureLink, formData, submissionId]);

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
    
    // logger.debug('🔍 [TBL] FILTRAGE STRICT - clientData.id:', clientData.id);
    // logger.debug('🔍 [TBL] FILTRAGE STRICT - leadIdFromUrl:', leadIdFromUrl);
    // logger.debug('🔍 [TBL] FILTRAGE STRICT - effectiveLeadId:', effectiveLeadId);
    // logger.debug('🔍 [TBL] FILTRAGE STRICT - clientData:', clientData);
    
    try {
      // logger.debug('🔍 [TBL] FILTRAGE STRICT - Chargement des devis pour:', effectiveLeadId, clientData.name);
      
      // Charger TOUS les devis d'abord, puis filtrer côté client
      const apiUrl = `/api/treebranchleaf/submissions/by-leads?treeId=${effectiveTreeId}`;
      
      const allLeadsWithSubmissions = await api.get(apiUrl);
      // logger.debug('🔍 [TBL] AVANT FILTRAGE - Tous les leads reçus:', allLeadsWithSubmissions);
      
      // FILTRAGE STRICT : Ne garder QUE le lead sélectionné
      let filteredLeads = allLeadsWithSubmissions;
      
      if (effectiveLeadId) {
        filteredLeads = allLeadsWithSubmissions.filter(lead => {
          const isMatch = lead.id === effectiveLeadId;
          // logger.debug(`🔍 [TBL] Vérification lead ${lead.id} (${lead.firstName} ${lead.lastName}) VS ${effectiveLeadId}: ${isMatch}`);
          return isMatch;
        });
        // logger.debug('🔍 [TBL] APRÈS FILTRAGE STRICT - Leads conservés:', filteredLeads);
      } else {
        // logger.debug('⚠️ [TBL] Aucun leadId trouvé, affichage de tous les devis');
      }
      
      if (!filteredLeads || filteredLeads.length === 0) {
        // logger.debug('❌ [TBL] AUCUN devis trouvé pour le lead:', effectiveLeadId, clientData.name);
        message.info(`Aucun devis trouvé pour ${clientData.name || 'ce lead'}`);
        setAvailableDevis([]);
      } else {
        // logger.debug('✅ [TBL] Devis trouvés pour le lead:', clientData.name, filteredLeads);
        setAvailableDevis(filteredLeads);
      }
      
      setDevisSelectorVisible(true);
      
    } catch (error) {
      logger.error('❌ [TBL] Erreur lors du chargement des devis par leads:', error);
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
      logger.debug('🗑️ [TBL][DELETE] Suppression du devis:', devisId);
      
      // Appeler l'API de suppression
      await api.delete(`/api/treebranchleaf/submissions/${devisId}`);
      
      logger.debug('✅ [TBL][DELETE] Devis supprimé, rechargement...');
      
      // Recharger la liste des devis
      await handleLoadDevis();
      
      message.success(`Devis "${devisName}" supprimé avec succès`);
    } catch (error) {
      logger.error('❌ [TBL][DELETE] Erreur lors de la suppression:', error);
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
      // logger.debug('🔍 [TBL] État actuel:', { leadId, treeId, effectiveTreeId, devisName, formDataKeys: Object.keys(formData), approxBytes });

      const values = await form.validateFields();
      // logger.debug('✅ [TBL] Validation formulaire réussie:', values);

      const baseDevisName = values.devisName || devisName;
      // logger.debug('🔍 [TBL] Nom de base du devis:', baseDevisName);

      // Vérifier l'unicité du nom avant la sauvegarde finale
      const finalDevisName = await generateUniqueDevisName(baseDevisName, leadId || '');
      // logger.debug('🔍 [TBL] Nom final du devis (unique):', finalDevisName);

      if (!effectiveTreeId) {
        logger.error('❌ [TBL] Tree ID manquant:', { effectiveTreeId });
        message.error('Arbre TreeBranchLeaf requis pour créer un devis');
        return;
      }

      // logger.debug('🔍 [TBL] Création devis avec paramètres:', { leadId: leadId || 'aucun', treeId: effectiveTreeId, name: finalDevisName, dataKeys: Object.keys(formData).length, approxBytes });

      // Créer le devis via API avec les données actuelles du formulaire
      // 🔥 VALIDATION: Le lead est OBLIGATOIRE
      const effectiveLeadId = selectedLeadForDevis?.id || leadId;
      
      if (!effectiveLeadId) {
        logger.error('❌ [TBL] Aucun lead sélectionné, création impossible');
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
        // logger.debug('📡 [TBL] POST TBL Prisma create-and-evaluate - payload meta', { treeId: submissionData.treeId, name: submissionData.name, dataKeys: Object.keys(submissionData.data || {}).length });
        
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
  logger.warn('⚠️ [TBL] Échec création devis, tentative de repli…', { status, statusText, msg });

        if (status === 404) {
          try {
            // logger.debug('🌲 [TBL] Chargement des arbres accessibles pour repli…');
            const trees = await api.get('/api/treebranchleaf/trees') as Array<{ id: string; name?: string }>;
            // logger.debug('🌲 [TBL] Arbres reçus (count):', Array.isArray(trees) ? trees.length : 'non-array');
            if (Array.isArray(trees) && trees.length > 0) {
              const fallbackTreeId = trees[0].id;
              logger.info('🔁 [TBL] Repli: on essaie avec le premier arbre accessible', { fallbackTreeId, fallbackTreeName: trees[0]?.name });
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
            logger.error('❌ [TBL] Échec du repli de création de devis:', {
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

      // logger.debug('✅ [TBL] Devis créé avec succès. Détails (clés):', submission && typeof submission === 'object' ? Object.keys(submission as Record<string, unknown>) : typeof submission);
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
              logger.warn('⚠️ [TBL] Impossible de charger les données du lead pour le header:', error);
            }
          }
          
          logger.debug('🔄 [TBL] Set new submissionId:', newSubmissionId);
          logger.debug('🔄 [TBL] useEffect will dispatch refresh after React updates all components');
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
        logger.warn('⚠️ [TBL] Impossible d\'enregistrer le devis dans Documents/History du lead:', linkErr);
      }

      // Réinitialiser les modals (mais PAS le devisName car il est affiché dans le header)
      setDevisCreatorVisible(false);
      // ⚠️ NE PAS RÉINITIALISER LE FORMULAIRE - Le système de calcul doit rester actif
      // form.resetFields();

      // handleLoadDevis(); // Pour refresh la liste si nécessaire

      console.timeEnd('[TBL] CREATE_DEVIS');
      console.groupEnd();
    } catch (error) {
      logger.error('❌ [TBL] Erreur lors de la création du devis:', error);
      try {
        const _err = error as { response?: { status?: number; data?: unknown; statusText?: string }; status?: number; message?: string; url?: string };
        console.group('[TBL][CREATE_DEVIS][ERROR]');
        // logger.debug('status:', err?.response?.status ?? err?.status);
        // logger.debug('statusText:', err?.response?.statusText);
        // logger.debug('message:', err?.message);
        // logger.debug('data:', err?.response?.data);
        console.groupEnd();
      } catch { /* noop */ }

      // Afficher des détails d'erreur plus précis
      if (error && typeof error === 'object') {
        const errObj = error as Record<string, unknown> & { response?: unknown };
        if ('errorFields' in errObj) {
          // On ne connaît pas le type exact ici, on logge la valeur brute
          logger.error('❌ [TBL] Erreurs de validation:', (errObj as Record<string, unknown>).errorFields);
          message.error('Veuillez remplir tous les champs requis');
        } else if ('response' in errObj) {
          logger.error('❌ [TBL] Erreur API:', errObj.response);
          message.error('Erreur lors de la création du devis. Vérifiez la console pour plus de détails.');
        } else {
          logger.error('❌ [TBL] Erreur inconnue:', error);
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
        // logger.debug('🚀 [TBL] Auto-sauvegarde via TBL Prisma...');
        
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
        logger.error('❌ [TBL] Échec enregistrement auto:', e);
        message.error('Remplissage OK, mais échec de l’enregistrement automatique');
      }
    } catch (e) {
      logger.error('❌ [TBL] Erreur auto-remplissage:', e);
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
        logger.warn('⚠️ [TBL] Persist revision avant chargement devis échoué (on continue):', e);
      }

      // logger.debug('🔍 [TBL] === DÉBUT CHARGEMENT DEVIS ===');
      // logger.debug('🔍 [TBL] ID du devis:', devisId);
      // logger.debug('🔍 [TBL] Données du lead:', leadData);
      
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
            // logger.debug('🔍 [TBL] Client mis à jour avec données complètes:', newClientData);
          }
        } catch (error) {
          logger.warn('⚠️ [TBL] Impossible de charger les données complètes du lead:', error);
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
      // logger.debug('🔍 [TBL] Appel API pour récupérer la submission...');
      const submissionResponse = await api.get(`/api/treebranchleaf/submissions/${devisId}`);
      const submission = (submissionResponse && typeof submissionResponse === 'object' && 'success' in submissionResponse)
        ? ((submissionResponse as unknown as { success?: boolean; data?: unknown }).data ?? submissionResponse)
        : submissionResponse;

      const submissionObj = (submission && typeof submission === 'object' && 'submission' in (submission as Record<string, unknown>))
        ? ((submission as Record<string, unknown>).submission as unknown)
        : submission;
      // logger.debug('🔍 [TBL] Réponse API complète:', submission);
      
      // logger.debug('🔍 [TBL] Réponse API complète:', submission);
      
      const submissionDataArray = (submissionObj && typeof submissionObj === 'object')
        ? ((submissionObj as any).TreeBranchLeafSubmissionData as Array<{ nodeId: string; value?: string; operationSource?: string | null }> | undefined)
        : undefined;

      let formattedData: TBLFormData = {};
      let skippedCalculated = 0;
      const sourceStats: Record<string, number> = {};
      // 🚀 FIX PERF-CHANTIER-DEFINITIF: Collecter les valeurs calculées/DISPLAY
      // stockées en DB pour les broadcaster SANS appeler create-and-evaluate (~6s)
      const storedComputedData: Array<{nodeId: string; value: unknown; operationResult?: unknown}> = [];
      let hasSubmissionDataArray = false;

      if (Array.isArray(submissionDataArray)) {
        hasSubmissionDataArray = true;
        // logger.debug('🔍 [TBL] Données de submission trouvées:', submission.TreeBranchLeafSubmissionData.length, 'éléments');
        
        // ✅ Filtrer pour recharger les entrées utilisateur.
        // Selon la source, les saisies peuvent être taguées 'neutral' (legacy) OU 'field' (interpreter).
        submissionDataArray.forEach((item) => {
          const src = typeof item.operationSource === 'string' ? item.operationSource.toLowerCase() : null;
          const srcKey = src || '(null)';
          sourceStats[srcKey] = (sourceStats[srcKey] || 0) + 1;
          const isUserInput = !src || src === 'neutral' || src === 'field' || src === 'fixed';
          if (!isUserInput) {
            skippedCalculated++;
            // 🚀 FIX PERF-CHANTIER-DEFINITIF: Collecter les valeurs calculées pour broadcast direct
            if (item.value !== undefined && item.value !== null) {
              storedComputedData.push({
                nodeId: item.nodeId,
                value: item.value,
                operationResult: item.value
              });
            }
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
          const fieldsMap = (payload as unknown)?.fields || {};

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
          const leadIdFromFields = (payload as unknown)?.leadId as string | undefined;
          const leadFromFields = (payload as unknown)?.lead as unknown;
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
          logger.warn('⚠️ [TBL LOAD] Fallback /fields impossible:', fallbackErr);
        }
      }

      if (skippedCalculated > 0) {
        logger.debug(`🚫 [TBL LOAD] ${skippedCalculated} champs non-neutral ignorés (calculés/capacités)`);
      }

      // 🧹 FIX STALE-DEVIS: Vider les caches de useNodeCalculatedValue AVANT de
      // charger le nouveau devis pour éviter que les protections anti-race-condition
      // ne bloquent la mise à jour des DISPLAY fields avec les valeurs du nouveau devis
      clearAllNodeValueCaches();

      const loadedCount = Object.keys(formattedData).length;
      logger.debug(`✅ [TBL LOAD] ${loadedCount} champs utilisateur chargés`);

      if (loadedCount === 0) {
        logger.warn('⚠️ [TBL LOAD] 0 champ restauré - operationSource stats:', sourceStats);
      }

      if (loadedCount > 0) {
        const loadedDevisName = (submissionObj as unknown)?.summary?.name || (submissionObj as unknown)?.name || `Devis ${devisId.slice(0, 8)}`;
        const loadedStatus = String((submissionObj as unknown)?.status || '').toLowerCase();
        // ✅ Nouveau workflow: un devis enregistré (completed) est chargé tel quel.
        // Les modifications sont locales, et une version -N est créée à l'enregistrement/sortie.

        // Mettre à jour le formulaire (préserver les clés système __*)
        setFormData((prev) => {
          const kept: TBLFormData = {};
          Object.keys(prev || {}).forEach((k) => {
            if (k.startsWith('__')) kept[k] = prev[k];
          });
          const next: TBLFormData = { ...kept, ...formattedData };
          const leadIdForSystem = hydratedLeadId || (submissionObj as unknown)?.leadId;
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
        if ((submissionObj as unknown)?.createdAt) {
          setDevisCreatedAt(new Date((submissionObj as any).createdAt));
        }

        // � FIX PERF-CHANTIER-DEFINITIF: Au lieu de recalculer les DISPLAY via create-and-evaluate (~6s),
        // utiliser les valeurs calculées DÉJÀ STOCKÉES dans TreeBranchLeafSubmissionData.
        // Cela rend le chargement instantané comme en mode TBL normal.
        autosaveSuspendedRef.current = true;
        try {
          const effectiveClientId = hydratedLeadId || (submissionObj as unknown)?.leadId || null;
          if (effectiveClientId) {
            lastClientIdRef.current = effectiveClientId;
          }

          if (hasSubmissionDataArray && storedComputedData.length > 0) {
            // ======== CHEMIN RAPIDE: Valeurs DISPLAY stockées en DB ========
            // Pas besoin de create-and-evaluate ! Les valeurs sont déjà là.
            logger.debug(`⚡ [TBL LOAD] ${storedComputedData.length} valeurs DISPLAY chargées depuis DB (SANS create-and-evaluate)`);

            // Broadcaster les valeurs calculées stockées avec replaceAll=true
            broadcastCalculatedRefresh({
              reason: 'load-devis-stored',
              replaceAll: true,
              submissionId: devisId,
              evaluatedSubmissionId: devisId,
              recalcCount: storedComputedData.length,
              submissionData: storedComputedData
            });

            // Injecter les valeurs calculées dans formData pour les LINK fields
            setFormData(prev => {
              const next = { ...prev };
              for (const item of storedComputedData) {
                if (item?.nodeId && item?.value !== undefined && item?.value !== null) {
                  next[item.nodeId] = item.value as string;
                }
              }
              return next;
            });

            // Signature avec toutes les valeurs (user + computed) pour éviter un autosave parasite
            try {
              const allData: Record<string, unknown> = { ...formattedData };
              for (const item of storedComputedData) {
                if (item?.nodeId && item?.value !== undefined && item?.value !== null) {
                  allData[item.nodeId] = item.value;
                }
              }
              lastSavedSignatureRef.current = computeSignature(normalizePayload(allData));
            } catch { /* noop */ }

          } else {
            // ======== CHEMIN FALLBACK: Pas de données stockées → recalculer ========
            logger.debug(`🔄 [TBL LOAD] Fallback: recalcul DISPLAY via create-and-evaluate pour devis ${devisId}...`);
            const evaluationResponse = await api.post('/api/tbl/submissions/create-and-evaluate', {
              treeId: effectiveTreeId || (submissionObj as unknown)?.treeId,
              submissionId: devisId,
              formData: normalizePayload(formattedData),
              clientId: effectiveClientId,
              status: loadedStatus === 'default-draft' ? 'default-draft' : 'completed',
              changedFieldId: 'NULL',
              evaluationMode: 'open'
            });

            try {
              const normalized = normalizePayload(formattedData);
              lastSavedSignatureRef.current = computeSignature(normalized);
            } catch { /* noop */ }

            broadcastCalculatedRefresh({
              reason: 'load-devis-recalcul',
              replaceAll: true,
              submissionId: devisId,
              evaluatedSubmissionId: devisId,
              recalcCount: evaluationResponse?.submission?.TreeBranchLeafSubmissionData?.length,
              submissionData: evaluationResponse?.submission?.TreeBranchLeafSubmissionData
            });

            const submDataForFormData = evaluationResponse?.submission?.TreeBranchLeafSubmissionData;
            if (Array.isArray(submDataForFormData) && submDataForFormData.length > 0) {
              setFormData(prev => {
                const next = { ...prev };
                for (const item of submDataForFormData) {
                  if (item?.nodeId && item?.value !== undefined && item?.value !== null) {
                    next[item.nodeId] = item.value;
                  }
                }
                return next;
              });
              try {
                const allData: Record<string, unknown> = { ...formattedData };
                for (const item of submDataForFormData) {
                  if (item?.nodeId && item?.value !== undefined && item?.value !== null) {
                    allData[item.nodeId] = item.value;
                  }
                }
                lastSavedSignatureRef.current = computeSignature(normalizePayload(allData));
              } catch { /* noop */ }
            }
            logger.debug(`✅ [TBL LOAD] Fallback recalcul DISPLAY terminé pour devis ${devisId}`);
          }
        } catch (recalcErr) {
          logger.warn('⚠️ [TBL LOAD] Chargement DISPLAY échoué (les champs calculés peuvent être vides):', recalcErr);
        } finally {
          // Réactiver l'autosave après un délai pour absorber les changements post-chargement
          // (table lookups, auto-select, etc.)
          setTimeout(() => {
            try {
              const currentFormData = formDataRef.current;
              if (currentFormData && Object.keys(currentFormData).length > 0) {
                const sig = computeSignature(normalizePayload(currentFormData));
                lastSavedSignatureRef.current = sig;
              }
            } catch { /* noop */ }
            autosaveSuspendedRef.current = false;
          }, 2000);
        }

        message.success(`${loadedStatus === 'default-draft' ? 'Brouillon' : `Devis "${loadedDevisName}"`} chargé avec succès (${loadedCount} champs)`);
      } else {
        logger.warn('🔍 [TBL LOAD] Aucune donnée utilisateur restaurée pour ce devis');
        message.warning('Devis chargé, mais aucune donnée de formulaire à restaurer');
      }
      
      // Fermer la modal
      setDevisSelectorVisible(false);
      // logger.debug('🔍 [TBL] === FIN CHARGEMENT DEVIS ===');
      
    } catch (error) {
      logger.error('❌ [TBL] Erreur lors du chargement du devis:', error);
      logger.error('❌ [TBL] Détails de l\'erreur:', error);
      message.error('Erreur lors du chargement du devis. Vérifiez la console pour plus de détails.');
    }
  }, [api, normalizePayload, computeSignature, formatAddressValue, effectiveTreeId, user?.id, isSuperAdmin, userRole, broadcastCalculatedRefresh]);

  useEffect(() => {
    if (!requestedDevisId) return;
    if (requestedDevisId === submissionId) return;
    handleSelectDevis(requestedDevisId);
  }, [requestedDevisId, submissionId, handleSelectDevis]);

  // (Ancienne fonction calcul kWh supprimée: sera réintroduite si UI dédiée)

  // Gérer le chargement de la configuration et des données
  // 🚀 FIX R17: Inclure isInitializingDraft pour empêcher l'utilisateur d'encoder
  // pendant que les données ne sont pas encore restaurées
  if (dataLoading || configLoading || isInitializingDraft) {
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
    <TBLBatchProvider treeId={tree?.id || treeId} leadId={leadId} submissionId={submissionId}>
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
                  <Tooltip title={lastGeneratedDocId ? "Envoyer l'offre" : "Générez d'abord un PDF"} placement="bottom">
                    <Button 
                      icon={<MailOutlined />}
                      onClick={handleOpenEmailModal}
                      disabled={!lastGeneratedDocId}
                      block={actionButtonBlock}
                      style={lastGeneratedDocId ? { backgroundColor: '#1890ff', borderColor: '#1890ff', color: '#fff' } : undefined}
                    />
                  </Tooltip>
                  {signatureStatus?.totalSigned ? (
                    <Tooltip title="Offre signée" placement="bottom">
                      <Button
                        icon={<DownloadOutlined />}
                        block={actionButtonBlock}
                        style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
                        onClick={() => {
                          const signedSig = signatureStatus.signatures.find((s: Record<string, unknown>) => s.status === 'SIGNED');
                          if (signedSig) {
                            setSignedPdfPreviewId(signedSig.id);
                            setSignedPdfPreviewOpen(true);
                          }
                        }}
                      />
                    </Tooltip>
                  ) : null}
                  <Tooltip title="Gestionnaire" placement="bottom">
                    <Button 
                      icon={<ToolOutlined />}
                      onClick={() => setGestionnaireVisible(true)}
                      block={actionButtonBlock}
                      style={{ backgroundColor: '#1a1a1a', borderColor: '#1a1a1a', color: '#fff' }}
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
                        <span>{t('entity.client')}</span>
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
                                logger.debug('🗑️ [TBL][DELETE-DOC] Suppression du devis depuis Documents:', devisId);
                                await api.delete(`/api/treebranchleaf/submissions/${devisId}`);
                                logger.debug('✅ [TBL][DELETE-DOC] Devis supprimé avec succès');
                                message.success(`Devis "${devisName}" supprimé avec succès`);
                                // Recharger la liste des devis dans le modal "Charger"
                                await handleLoadDevis();
                              } catch (error) {
                                logger.error('❌ [TBL][DELETE-DOC] Erreur lors de la suppression:', error);
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
                    logger.debug(`🔴 [ONGLET ROUGE] ${tab.label} - incomplet pendant validation PDF`);
                  } else if (isComplete && requiredFields.length > 0) {
                    logger.debug(`🟢 [ONGLET VERT] ${tab.label} - complet (${requiredFields.length} champs requis)`);
                  } else {
                    logger.debug(`⚪ [ONGLET NORMAL] ${tab.label} - normal`);
                  }

                  // 🎯 STYLE DYNAMIQUE - API NATIVE ANT DESIGN
                  const tabStyle = (() => {
                    logger.debug(`🎯 [STYLE DEBUG] ${tab.label}: isComplete=${isComplete}, requiredFields.length=${requiredFields.length}, isValidatingIncomplete=${isValidatingIncomplete}`);
                    
                    // Si tentative PDF ET onglet incomplet → ROUGE
                    if (isValidatingIncomplete && !isComplete) {
                      logger.debug(`🔴 [STYLE] ${tab.label} → ROUGE (validation PDF échouée)`);
                      return {
                        backgroundColor: '#fee2e2',
                        borderColor: '#dc2626',
                        color: '#991b1b'
                      };
                    }
                    // Si onglet complet (même si 0/0) → VERT  
                    else if (isComplete) {
                      logger.debug(`🟢 [STYLE] ${tab.label} → VERT (${requiredFields.length} champs requis)`);
                      return {
                        backgroundColor: '#0f766e', // Même vert que le bouton "Nouveau Devis"
                        borderColor: '#0f766e',
                        color: '#ffffff' // Texte en blanc
                      };
                    }
                    // Sinon onglet normal (incomplet)
                    logger.debug(`⚪ [STYLE] ${tab.label} → NORMAL (incomplet)`);
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
                        // � PRODUIT: Visibilité sous-onglets
                        productSubTabsVisibility={tab.product_subTabsVisibility}
                        productSourceNodeId={tab.product_sourceNodeId}
                        // �🔄 Props pour navigation swipe mobile
                        controlledActiveSubTab={isMobile ? activeSubTabs[tab.id] : undefined}
                        onSubTabChange={isMobile ? (subTabKey) => handleSwipeSubTabChange(tab.id, subTabKey) : undefined}
                        onSubTabsComputed={isMobile ? (subTabs) => handleSubTabsComputed(tab.id, subTabs) : undefined}
                        reviewMode={reviewMode}
                        reviewChecked={reviewChecked}
                        reviewComments={reviewComments}
                        onReviewCheck={onReviewCheck}
                        onReviewComment={onReviewComment}
                        submittingReview={submittingReview}
                        onSubmitReview={onSubmitReview}
                        originalFormData={originalFormData}
                        reviewSubcontractAmount={reviewSubcontractAmount}
                        onReviewSubcontractAmountChange={setReviewSubcontractAmount}
                        reviewHasSubcontractors={reviewHasSubcontractors}
                        reviewSubcontractorNames={reviewSubcontractorNames}
                        rectificationMode={rectificationMode}
                        rectificationFieldMap={rectificationFieldMap}
                        rectificationFields={rectificationFields}
                        submittingCorrection={submittingCorrection}
                        correctionSubmitted={correctionSubmitted}
                        onSubmitCommercialCorrection={onSubmitCommercialCorrection}
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
            label={t('fields.notes')}
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
                  logger.debug('🎯 VALIDATION DÉCLENCHÉE !', {
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
              // logger.debug('🔍 [TBL] Fermeture LeadSelectorModal');
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
              // logger.debug('➕ [TBL] Fermeture LeadCreatorModal');
              setLeadCreatorVisible(false);
            }}
            onCreateLead={handleCreateLead}
            onLeadCreated={(lead) => {
              // logger.debug('✅ Lead créé:', lead);
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
              <span className="hidden sm:inline">{t('common.search')}</span>
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
                    <div>{t('common.name')}</div>
                    <div>{t('entity.contact')}</div>
                    <div>Entreprise</div>
                    <div>{t('common.actions')}</div>
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
                                  type="default"
                                  size="small"
                                  icon={<SendOutlined />}
                                  loading={loadingDevisPdfs}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendEmailFromDevisList(devis.id, devis.leadInfo.email);
                                  }}
                                  title="Envoyer le PDF par email"
                                />
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
                        
                        {/* Actions - boutons Sélectionner, Envoyer et Supprimer */}
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => handleSelectDevis(devis.id, devis.leadInfo)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Sélectionner
                          </Button>
                          <Tooltip title="Envoyer le PDF par email">
                            <Button
                              type="default"
                              size="small"
                              icon={<SendOutlined />}
                              loading={loadingDevisPdfs}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendEmailFromDevisList(devis.id, devis.leadInfo.email);
                              }}
                            />
                          </Tooltip>
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
        width={isMobile ? 360 : 640}
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
          
          {/* 🏗️ Sélection des produits */}
          {pdfProductOptions.length > 0 && (
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingOutlined style={{ color: '#722ed1' }} />
                <span className="font-medium text-purple-900">Produits inclus dans ce devis :</span>
              </div>
              <Checkbox.Group
                value={selectedPdfProducts}
                onChange={(checkedValues) => {
                  const newProducts = checkedValues as string[];
                  setSelectedPdfProducts(newProducts);
                  // Auto-sélectionner/désélectionner les templates liés aux produits
                  const productTemplateIds = availableTemplates
                    .filter(t => t.productValue && newProducts.includes(t.productValue))
                    .map(t => t.id);
                  const defaultTemplateIds = availableTemplates
                    .filter(t => t.isDefault)
                    .map(t => t.id);
                  const nonProductSelected = selectedTemplateIds.filter(
                    id => !availableTemplates.find(t => t.id === id && t.productValue)
                  );
                  setSelectedTemplateIds([...new Set([...defaultTemplateIds, ...productTemplateIds, ...nonProductSelected])]);
                }}
              >
                <div className="flex flex-wrap gap-2">
                  {pdfProductOptions.map(opt => (
                    <Checkbox key={opt.value} value={opt.value}>
                      <Tag color={opt.color || '#722ed1'}>{opt.label}</Tag>
                    </Checkbox>
                  ))}
                </div>
              </Checkbox.Group>
              {selectedPdfProducts.length === 0 && (
                <div className="text-xs text-orange-600 mt-1">⚠️ Sélectionnez au moins un produit</div>
              )}
            </div>
          )}
          
          {/* 📄 Documents à inclure */}
          {loadingTemplates ? (
            <div className="text-center py-4">
              <Spin tip="Chargement..." />
            </div>
          ) : availableTemplates.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <FileTextOutlined style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }} />
              <p className="text-sm">Aucun template disponible</p>
            </div>
          ) : (() => {
            const defaultTemplates = availableTemplates.filter(t => t.isDefault);
            const productTemplates = availableTemplates.filter(t => !t.isDefault && t.productValue);
            const freeTemplates = availableTemplates.filter(t => !t.isDefault && !t.productValue);
            return (
              <div className="space-y-3">
                {/* Documents par défaut */}
                {defaultTemplates.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FileTextOutlined style={{ color: '#1890ff' }} />
                      <span className="font-medium text-blue-900">📌 Documents par défaut :</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {defaultTemplates.map(tmpl => (
                        <Checkbox
                          key={tmpl.id}
                          checked={selectedTemplateIds.includes(tmpl.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTemplateIds(prev => [...prev, tmpl.id]);
                            } else {
                              setSelectedTemplateIds(prev => prev.filter(id => id !== tmpl.id));
                            }
                          }}
                        >
                          <span className="text-sm">📄 {tmpl.name}</span>
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents liés aux produits */}
                {productTemplates.length > 0 && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingOutlined style={{ color: '#52c41a' }} />
                      <span className="font-medium text-green-900">🏷️ Documents produit :</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {productTemplates.map(tmpl => {
                        const productOpt = pdfProductOptions.find(p => p.value === tmpl.productValue);
                        const isProductSelected = selectedPdfProducts.includes(tmpl.productValue || '');
                        return (
                          <Checkbox
                            key={tmpl.id}
                            checked={selectedTemplateIds.includes(tmpl.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTemplateIds(prev => [...prev, tmpl.id]);
                              } else {
                                setSelectedTemplateIds(prev => prev.filter(id => id !== tmpl.id));
                              }
                            }}
                          >
                            <span className={`text-sm ${!isProductSelected ? 'opacity-50' : ''}`}>
                              <Tag color={productOpt?.color || '#52c41a'} style={{ marginRight: 4 }}>
                                {productOpt?.label || tmpl.productValue}
                              </Tag>
                              {tmpl.name}
                            </span>
                          </Checkbox>
                        );
                      })}
                    </div>
                    {selectedPdfProducts.length === 0 && (
                      <div className="text-xs text-gray-500 mt-1">Sélectionnez des produits ci-dessus pour activer ces documents</div>
                    )}
                  </div>
                )}

                {/* Documents complémentaires (libres) */}
                {freeTemplates.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FileTextOutlined style={{ color: '#8c8c8c' }} />
                      <span className="font-medium text-gray-700">📎 Documents complémentaires :</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {freeTemplates.map(tmpl => (
                        <Checkbox
                          key={tmpl.id}
                          checked={selectedTemplateIds.includes(tmpl.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTemplateIds(prev => [...prev, tmpl.id]);
                            } else {
                              setSelectedTemplateIds(prev => prev.filter(id => id !== tmpl.id));
                            }
                          }}
                        >
                          <span className="text-sm">📄 {tmpl.name}</span>
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Bouton Générer unique */}
          <Button
            type="primary"
            size="large"
            block
            loading={generatingPdf}
            disabled={selectedTemplateIds.length === 0}
            onClick={() => {
              const templateId = selectedTemplateIds[0] || availableTemplates[0]?.id;
              if (templateId) handleGeneratePDFWithTemplate(templateId);
              else message.warning('Aucun template disponible');
            }}
            icon={<FileTextOutlined />}
          >
            Générer le PDF ({selectedTemplateIds.length} document{selectedTemplateIds.length > 1 ? 's' : ''}{selectedPdfProducts.length > 0 ? `, ${selectedPdfProducts.length} produit${selectedPdfProducts.length > 1 ? 's' : ''}` : ''})
          </Button>
        </div>
      </Modal>

      {/* 📧 Modal d'envoi d'email avec PDF */}
      <Modal
        title="📧 Envoyer le PDF par email"
        open={emailModalVisible}
        onCancel={() => {
          setEmailModalVisible(false);
          emailForm.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => { setEmailModalVisible(false); emailForm.resetFields(); }}>
            Annuler
          </Button>,
          <Button key="send" type="primary" icon={<MailOutlined />} loading={sendingEmail} onClick={handleSendEmailWithPdf}>
            Envoyer
          </Button>
        ]}
        width={700}
      >
        {/* Sélecteur de template pré-rempli */}
        {emailTemplatesList.length > 0 && (
          <div className="mb-4">
            <Text strong>Modèle pré-rempli :</Text>
            <div className="mt-2 flex flex-wrap gap-2">
              {emailTemplatesList.map(tmpl => (
                <Button
                  key={tmpl.id}
                  size="small"
                  onClick={() => handleSelectEmailTemplate(tmpl.id)}
                >
                  {tmpl.name}
                </Button>
              ))}
            </div>
          </div>
        )}
        <Form form={emailForm} layout="vertical">
          <Form.Item name="to" label="Destinataire" rules={[{ required: true, message: 'Email requis' }, { type: 'email', message: 'Email invalide' }]}>
            <Input placeholder="email@exemple.com" />
          </Form.Item>
          <Form.Item name="cc" label="CC">
            <Input placeholder="cc@exemple.com (optionnel)" />
          </Form.Item>
          <Form.Item name="subject" label="Sujet" rules={[{ required: true, message: 'Sujet requis' }]}>
            <Input placeholder="Sujet de l'email" />
          </Form.Item>
          <Form.Item name="body" label={t('fields.message')} rules={[{ required: true, message: 'Message requis' }]}>
            <Input.TextArea rows={8} placeholder="Contenu de l'email..." />
          </Form.Item>
        </Form>
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PaperClipOutlined style={{ color: '#1890ff', fontSize: 16 }} />
              <div>
                <div className="font-medium text-sm text-gray-800">Joindre les fiches techniques</div>
                <div className="text-xs text-gray-500">Panneaux, onduleurs et autres documents associés au devis</div>
              </div>
            </div>
            <Switch
              checked={includeProductDocs}
              onChange={setIncludeProductDocs}
              checkedChildren="Oui"
              unCheckedChildren="Non"
            />
          </div>
        </div>
        <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 16 }}>✍️</span>
              <div>
                <div className="font-medium text-sm text-gray-800">Inclure un lien de signature</div>
                <div className="text-xs text-gray-500">Le client pourra signer le devis directement depuis l'email</div>
              </div>
            </div>
            <Switch
              checked={includeSignatureLink}
              onChange={setIncludeSignatureLink}
              checkedChildren="Oui"
              unCheckedChildren="Non"
            />
          </div>
        </div>
        <Alert
          message={includeProductDocs
            ? "Le PDF du devis + les fiches techniques des produits seront joints à cet email."
            : "Seul le PDF du devis sera joint à cet email."
          }
          type="info"
          showIcon
          className="mt-2"
        />
      </Modal>

      {/* 📧 Modal sélection de PDF pour envoi (quand plusieurs PDFs disponibles) */}
      <Modal
        title="📄 Choisir le PDF à envoyer"
        open={devisPdfSelectorVisible}
        onCancel={() => setDevisPdfSelectorVisible(false)}
        footer={<Button onClick={() => setDevisPdfSelectorVisible(false)}>{t('common.cancel')}</Button>}
        width={500}
      >
        <div className="space-y-2">
          {devisPdfList.map(doc => (
            <Card
              key={doc.id}
              size="small"
              hoverable
              className="cursor-pointer"
              onClick={() => handleSelectPdfForEmail(doc.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{doc.documentNumber || doc.id}</div>
                  <div className="text-sm text-gray-500">
                    {doc.template?.name || 'Document'} — {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <Button type="primary" size="small" icon={<SendOutlined />}>
                  Envoyer
                </Button>
              </div>
            </Card>
          ))}
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

      {/* 📋 Panneau Gestionnaire */}
      <Suspense fallback={null}>
        <GestionnairePanel
          open={gestionnaireVisible}
          onClose={() => setGestionnaireVisible(false)}
          treeId={effectiveTreeId}
          onOverrideSaved={handleGestionnaireOverrideSaved}
        />
      </Suspense>

      {/* ✍️ Modal Signature Électronique */}
      {submissionId && (
        <Suspense fallback={null}>
          <SignatureModal
            open={signatureModalVisible}
            onClose={() => setSignatureModalVisible(false)}
            submissionId={submissionId}
            leadId={leadId || undefined}
            signatureType={rectificationMode ? 'RECTIFICATION' : 'DEVIS'}
            signerRole="CLIENT"
            signerName={clientData.name || ''}
            signerEmail={clientData.email || ''}
            signerPhone={clientData.phone || ''}
            onSigned={(result) => {
              logger.debug('[TBL] ✅ Document signé:', result);
              message.success('Signature enregistrée avec traçabilité complète');
            }}
          />
        </Suspense>
      )}

      {/* 📄 Modal Preview PDF signé */}
      {signedPdfPreviewId && (
        <Suspense fallback={null}>
          <SignedPdfPreviewModal
            open={signedPdfPreviewOpen}
            onClose={() => setSignedPdfPreviewOpen(false)}
            signatureId={signedPdfPreviewId}
          />
        </Suspense>
      )}

      {/* 🔍 MODAL RÉSULTAT ANALYSE (dans TBL principal pour accès au state) */}
      <Modal
        open={!!analysisResult}
        footer={null}
        closable={false}
        centered
        width={480}
      >
        {analysisResult && (
          <Result
            status={analysisResult.status === 'validated' ? 'success' : 'warning'}
            icon={analysisResult.status === 'validated'
              ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
              : <ExclamationCircleOutlined style={{ color: '#fa8c16' }} />
            }
            title={analysisResult.status === 'validated' ? 'Validé ✅' : 'À rectifier ⚠️'}
            subTitle={analysisResult.message}
            extra={
              <Button
                type="primary"
                size="large"
                onClick={() => {
                  setAnalysisResult(null);
                  window.history.back();
                }}
                style={{
                  height: 44,
                  fontWeight: 600,
                  borderRadius: 8,
                  background: analysisResult.status === 'validated' ? '#52c41a' : '#fa8c16',
                  borderColor: analysisResult.status === 'validated' ? '#52c41a' : '#fa8c16',
                }}
              >
                Retour au chantier
              </Button>
            }
          />
        )}
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
  tree?: unknown; // Arbre structuré
  rawNodes?: Array<{ id: string; parentId: string | null; type: string; label: string; order: number }>; // 🔥 NOUVEAU: Nœuds bruts pour Cascader
  disabled?: boolean;
  validationState?: unknown;
  validationActions?: unknown;
  tabSubTabs?: { key: string; label: string }[] | undefined;
  tabId?: string;
  submissionId?: string | null;
  // � PRODUIT: Visibilité des sous-onglets par produit
  productSubTabsVisibility?: Record<string, string[] | null> | null;
  productSourceNodeId?: string | null;
  // �🔄 Props pour navigation swipe centralisée
  controlledActiveSubTab?: string;
  onSubTabChange?: (subTabKey: string | undefined) => void;
  onSubTabsComputed?: (subTabs: { key: string; label: string }[]) => void;
  reviewMode?: boolean;
  reviewChecked?: Record<string, boolean>;
  reviewComments?: Record<string, string>;
  onReviewCheck?: (fieldId: string, checked: boolean) => void;
  onReviewComment?: (fieldId: string, comment: string) => void;
  submittingReview?: boolean;
  onSubmitReview?: () => void;
  originalFormData?: Record<string, unknown>;
  reviewSubcontractAmount?: string;
  onReviewSubcontractAmountChange?: (value: string) => void;
  reviewHasSubcontractors?: boolean;
  reviewSubcontractorNames?: string[];
  // 🔶 RECTIFICATION MODE
  rectificationMode?: boolean;
  rectificationFieldMap?: Record<string, { nodeId: string; fieldLabel: string; originalValue: string | null; technicianValue: string | null; modificationNote: string | null; technicianName: string | null }>;
  rectificationFields?: Array<{ nodeId: string; fieldLabel: string; originalValue: string | null; technicianValue: string | null; modificationNote: string | null; technicianName: string | null }>;
  submittingCorrection?: boolean;
  correctionSubmitted?: boolean;
  onSubmitCommercialCorrection?: () => void;
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
  productSubTabsVisibility,
  productSourceNodeId,
  controlledActiveSubTab,
  onSubTabChange,
  onSubTabsComputed,
  reviewMode = false,
  reviewChecked,
  reviewComments,
  onReviewCheck,
  onReviewComment,
  submittingReview = false,
  onSubmitReview,
  originalFormData: originalFormDataProp,
  reviewSubcontractAmount = '',
  onReviewSubcontractAmountChange,
  reviewHasSubcontractors = false,
  reviewSubcontractorNames = [],
  rectificationMode = false,
  rectificationFieldMap = {},
  rectificationFields = [],
  submittingCorrection = false,
  correctionSubmitted = false,
  onSubmitCommercialCorrection,
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
    try {
      onChange(fieldId, value);
    } catch (error) {
      logger.error(`❌ [TBLTabContentWithSections] ERREUR dans onChange:`, error);
      throw error;
    }
  }, [onChange]);

  const getFieldSubTabs = (item: unknown): string[] => {
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
    const detectDefault = (field: unknown) => {
      const fieldSubTabs = getFieldSubTabs(field);
      // Champ sans sous-onglet = besoin de "Général"
      if (fieldSubTabs.length === 0) {
        hasDefault = true;
        return;
      }
      // 🔧 FIX: Si le champ a un sous-onglet qui n'est PAS dans la liste explicite,
      // on DOIT créer le sous-onglet "Général" pour l'afficher là-dedans.
      // Sans cela, ces champs disparaissent car ils n'ont aucun onglet correspondant.
      const hasRecognizedSubTab = fieldSubTabs.some(tab => recognizedKeys.has(tab));
      if (!hasRecognizedSubTab) {
        hasDefault = true;
      }
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

  // 🛒 PRODUIT: Filtrer les sous-onglets par visibilité produit
  // Utilise product_subTabsVisibility du nœud GROUP (configuré dans ProductFilterPanel)
  const visibleSubTabs = useMemo(() => {
    if (allSubTabs.length === 0) return allSubTabs;
    
    // 🛒 STRATÉGIE 1: Utiliser product_subTabsVisibility (configuré sur le nœud GROUP/onglet)
    if (productSubTabsVisibility && productSourceNodeId) {
      const sourceValue = formData[productSourceNodeId];
      
      // Si pas de sélection produit → tout visible
      if (sourceValue === undefined || sourceValue === null || sourceValue === '') {
        return allSubTabs;
      }
      
      // Normaliser les valeurs sélectionnées
      let selectedValues: string[];
      if (Array.isArray(sourceValue)) {
        selectedValues = sourceValue.map(String);
      } else if (typeof sourceValue === 'string' && sourceValue.includes(',')) {
        selectedValues = sourceValue.split(',').map(v => v.trim()).filter(Boolean);
      } else {
        selectedValues = [String(sourceValue)];
      }
      
      if (selectedValues.length === 0) {
        return allSubTabs;
      }
      
      const filtered = allSubTabs.filter(subTab => {
        // Chercher la config de visibilité pour ce sous-onglet (par key ou label)
        const visConfig = productSubTabsVisibility[subTab.key] ?? productSubTabsVisibility[subTab.label];
        
        // Si pas configuré (undefined) → toujours visible
        if (visConfig === undefined || visConfig === null) {
          return true;
        }
        
        // Si tableau vide → jamais visible
        if (Array.isArray(visConfig) && visConfig.length === 0) {
          return false;
        }
        
        // Vérifier si au moins une valeur sélectionnée est dans la config
        const isVisible = visConfig.some((v: string) => selectedValues.includes(v));
        return isVisible;
      });
      
      return filtered;
    }
    
    // Pas de config product_subTabsVisibility → tous visibles
    return allSubTabs;
  }, [allSubTabs, productSubTabsVisibility, productSourceNodeId, formData]);

  // �🔄 Notifier le parent des sous-onglets calculés (pour la navigation swipe)
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

  // 🛒 FIX: Si l'onglet actif n'est plus dans visibleSubTabs (tous ses champs cachés par produit),
  // basculer automatiquement sur le premier onglet visible
  useEffect(() => {
    if (controlledActiveSubTab !== undefined) return;
    if (visibleSubTabs.length === 0) return;
    
    setLocalActiveSubTab(prev => {
      if (!prev) return visibleSubTabs[0].key;
      // Si l'onglet actif n'est plus visible, basculer
      if (!visibleSubTabs.find(st => st.key === prev)) return visibleSubTabs[0].key;
      return prev;
    });
  }, [visibleSubTabs, controlledActiveSubTab]);

  // Log ActiveSubTab supprimé pour performance (utilisez window.enableTBLDebug() si besoin)

  const renderContent = () => {
    if (sections.length) {
      // Si on a plusieurs sous-onglets, ou si l'onglet a explicitement des subTabs définis
      const explicitTabSubTabs = Array.isArray(tabSubTabs) && tabSubTabs.length > 0;
      const showSubTabs = explicitTabSubTabs || visibleSubTabs.length > 1;
      
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
              {(visibleSubTabs || []).map(st => (
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
              allSubTabs={allSubTabs}
              reviewMode={reviewMode}
              reviewChecked={reviewChecked}
              reviewComments={reviewComments}
              onReviewCheck={onReviewCheck}
              onReviewComment={onReviewComment}
              originalFormData={originalFormDataProp}
              rectificationMode={rectificationMode}
              rectificationFieldMap={rectificationFieldMap}
            />
          ))}
        </div>
      );
    }
    // When no explicit sections, build a synthetic one and respect subTabs
    const synthetic: TBLSection = {
      id: '__synthetic__',
      title: 'Champs',
      name: 'Champs',
      fields: fields,
      subsections: []
    } as unknown as TBLSection;
    const explicitTabSubTabs = Array.isArray(tabSubTabs) && tabSubTabs.length > 0;
    const showSubTabs = explicitTabSubTabs || visibleSubTabs.length > 1;
    
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
            {(visibleSubTabs || []).map(st => (
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
          allSubTabs={allSubTabs}
          reviewMode={reviewMode}
          reviewChecked={reviewChecked}
          reviewComments={reviewComments}
          onReviewCheck={onReviewCheck}
          onReviewComment={onReviewComment}
          originalFormData={originalFormDataProp}
          rectificationMode={rectificationMode}
          rectificationFieldMap={rectificationFieldMap}
        />
      </div>
    );
  };

  return (
    <div>
      {reviewMode && (
        <div style={{
          padding: '10px 12px',
          marginBottom: 12,
          background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%)',
          border: '1px solid #91d5ff',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}>
          <span style={{ fontSize: 20, lineHeight: '24px', flexShrink: 0 }}>🔧</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: '#1890ff', fontSize: 13 }}>Mode Technicien — Vérification terrain</div>
            <div style={{ fontSize: 11, color: '#595959', lineHeight: 1.4 }}>
              Vérifiez chaque champ. <strong>Cochez les problèmes</strong> puis cliquez <strong>Analyse</strong>.
            </div>
          </div>
        </div>
      )}
      {/* 🔶 RECTIFICATION MODE: Bannière commercial */}
      {rectificationMode && rectificationFields.length > 0 && (
        <div style={{
          padding: '10px 12px',
          marginBottom: 12,
          background: 'linear-gradient(135deg, #fff7e6 0%, #fff1d4 100%)',
          border: '2px solid #fa8c16',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}>
          <span style={{ fontSize: 20, lineHeight: '24px', flexShrink: 0 }}>🔶</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: '#d46b08', fontSize: 13 }}>Mode Rectification — Corrections commerciales</div>
            <div style={{ fontSize: 11, color: '#595959', lineHeight: 1.4 }}>
              Le technicien a modifié <strong>{rectificationFields.length} champ(s)</strong>.
              Les champs concernés sont marqués en <span style={{ color: '#fa8c16', fontWeight: 600 }}>orange</span>.
              {' '}Corrigez les valeurs nécessaires puis cliquez <strong>Valider les corrections</strong>.
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: '#8c8c8c' }}>
              ⚠️ Toutes les modifications sont tracées (valeur initiale → technicien → votre correction).
            </div>
          </div>
        </div>
      )}
      {renderContent()}
      {/* 🔶 RECTIFICATION MODE: Footer avec bouton validation corrections */}
      {rectificationMode && rectificationFields.length > 0 && (
        <div style={{
          marginTop: 16,
          padding: '12px',
          background: '#fffbe6',
          borderRadius: 8,
          border: '1px solid #ffe58f',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div>
            <Text style={{ fontWeight: 600, fontSize: 13, color: '#d46b08' }}>
              🔶 {rectificationFields.length} champ(s) signalé(s) par le technicien
            </Text>
          </div>
          {correctionSubmitted ? (
            <div style={{
              padding: '10px',
              background: '#f6ffed',
              borderRadius: 6,
              border: '1px solid #b7eb8f',
              textAlign: 'center',
            }}>
              <Text style={{ color: '#52c41a', fontWeight: 600, fontSize: 14 }}>
                ✅ Corrections enregistrées — Retournez à la fiche lead pour re-soumettre au chantier.
              </Text>
            </div>
          ) : (
            <Button
              type="primary"
              size="large"
              loading={submittingCorrection}
              onClick={onSubmitCommercialCorrection}
              style={{
                width: '100%',
                height: 48,
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 8,
                background: '#fa8c16',
                borderColor: '#fa8c16',
              }}
            >
              Valider les corrections
            </Button>
          )}
        </div>
      )}
      {reviewMode && (
        <div style={{
          marginTop: 16,
          padding: '12px',
          background: '#fafafa',
          borderRadius: 8,
          border: '1px solid #d9d9d9',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {/* Status line */}
          <div>
            {(() => {
              const errorCount = Object.values(reviewChecked).filter(Boolean).length;
              return errorCount > 0 ? (
                <Text style={{ color: '#ff4d4f', fontWeight: 600, fontSize: 13 }}>
                  ⚠️ {errorCount} problème{errorCount > 1 ? 's' : ''} signalé{errorCount > 1 ? 's' : ''}
                </Text>
              ) : (
                <Text style={{ color: '#52c41a', fontWeight: 600, fontSize: 13 }}>
                  ✅ Aucun problème — Tout est conforme
                </Text>
              );
            })()}
          </div>

          {/* Subcontract cost block */}
          {reviewHasSubcontractors && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '10px',
              background: (!reviewSubcontractAmount || Number(reviewSubcontractAmount) <= 0) ? '#fff2f0' : '#f6ffed',
              borderRadius: 6,
              border: (!reviewSubcontractAmount || Number(reviewSubcontractAmount) <= 0) ? '1px solid #ffccc7' : '1px solid #b7eb8f',
            }}>
              <Text style={{ fontWeight: 600, color: '#ff4d4f', fontSize: 12 }}>
                💰 Coût sous-traitant (€) *
              </Text>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={reviewSubcontractAmount}
                onChange={e => onReviewSubcontractAmountChange?.(e.target.value)}
                placeholder="Montant obligatoire"
                style={{
                  width: '100%',
                  height: 44,
                  padding: '6px 12px',
                  border: (!reviewSubcontractAmount || Number(reviewSubcontractAmount) <= 0)
                    ? '2px solid #ff4d4f'
                    : '2px solid #52c41a',
                  borderRadius: 6,
                  fontSize: 16,
                  fontWeight: 600,
                  outline: 'none',
                  background: '#fff',
                  boxSizing: 'border-box' as const,
                }}
              />
              <Text style={{ fontSize: 11, color: '#8c8c8c', lineHeight: 1.3 }}>
                ⚠️ Sous-traitant{reviewSubcontractorNames.length > 1 ? 's' : ''} : <strong style={{ color: '#fa541c' }}>{reviewSubcontractorNames.join(', ') || 'assigné(s)'}</strong><br/>
                🔒 Ce montant vous engage — il sera verrouillé après validation.
              </Text>
            </div>
          )}

          {/* Analyse button — full width on mobile */}
          <Button
            type="primary"
            size="large"
            icon={<SearchOutlined />}
            loading={submittingReview}
            onClick={onSubmitReview}
            style={{
              width: '100%',
              height: 48,
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 8,
              background: '#1890ff',
            }}
          >
            Analyse
          </Button>
        </div>
      )}
      <div className="mt-6 text-xs text-gray-400 text-right">
        {stats.completed}/{stats.required} requis complétés
      </div>
    </div>
  );

});
