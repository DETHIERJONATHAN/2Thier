import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// 🎯 CSS pour astérisques verts par défaut
import '../../../../styles/tbl-green-asterisk.css';

// 🔄 Déclaration TypeScript pour la fonction de refresh
declare global {
  interface Window {
    TBL_FORCE_REFRESH?: () => void;
    __TBL_LAST_TREE_ID?: string;
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
  Tooltip
} from 'antd';
import { FileTextOutlined, DownloadOutlined, ClockCircleOutlined, FolderOpenOutlined, PlusOutlined, UserOutlined, FileAddOutlined, SearchOutlined, MailOutlined, PhoneOutlined, HomeOutlined } from '@ant-design/icons';
import { useAuth } from '../../../../auth/useAuth';
import { useParams } from 'react-router-dom';
import { useTreeBranchLeafConfig } from '../../hooks/useTreeBranchLeafConfig';
import { useAuthenticatedApi } from '../../../../hooks/useAuthenticatedApi';
import { ClientSidebar } from './components/ClientSidebar';
import DocumentsSection from '../../../Documents/DocumentsSection';
import TBLSectionRenderer from './components/TBLSectionRenderer';
import { useTBLDataPrismaComplete, type TBLField, type TBLSection } from './hooks/useTBLDataPrismaComplete';
import { useTBLDataHierarchicalFixed } from './hooks/useTBLData-hierarchical-fixed';
import { useTBLValidation } from './hooks/useTBLValidation';
import { TBLValidationProvider, useTBLValidationContext } from './contexts/TBLValidationContext';
import { useTBLCapabilitiesPreload } from './hooks/useTBLCapabilitiesPreload';
import TBLDevCapabilitiesPanel from './components/Dev/TBLDevCapabilitiesPanel';
import { dlog, isVerbose } from '../../../../utils/debug';
import { useTBLSave, type TBLFormData } from './hooks/useTBLSave';
import { buildMirrorKeys } from './utils/mirrorNormalization';
import LeadSelectorModal from '../../lead-integration/LeadSelectorModal';
import LeadCreatorModalAdvanced from '../../lead-integration/LeadCreatorModalAdvanced';
import type { TBLLead } from '../../lead-integration/types/lead-types';

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
  
  // Récupérer leadId depuis l'URL
  const { leadId: urlLeadId } = useParams<{ leadId?: string }>();
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
  const headerActionsDirection = 'horizontal'; // Toujours horizontal, même sur mobile
  const headerActionsAlign = isMobile ? 'start' : 'center';
  const headerActionsClassName = isMobile ? 'w-full' : undefined;
  const actionButtonBlock = false; // Désactivé pour garder les boutons compacts
  
  // État pour les données Lead dynamiques
  const [clientData, setClientData] = useState({
    id: '', 
    name: "", // Valeur vide par défaut
    email: "", 
    phone: "",
    address: ""
  });
  const [leadId, setLeadId] = useState<string | undefined>(urlLeadId); // État local pour leadId
  const [isLoadingLead, setIsLoadingLead] = useState<boolean>(!!urlLeadId); // Loading si on a un leadId
  
  // États pour les modals de lead
  const [leadSelectorVisible, setLeadSelectorVisible] = useState(false);
  const [leadCreatorVisible, setLeadCreatorVisible] = useState(false);
  const [devisSelectorVisible, setDevisSelectorVisible] = useState(false);
  const [availableDevis, setAvailableDevis] = useState<Array<{id: string, firstName: string, lastName: string, email: string, company?: string, submissions: Array<{id: string, name: string, status: string, createdAt: string, treeName?: string}>}>>([]);
  const [devisSearchTerm, setDevisSearchTerm] = useState('');
  
  // États pour le modal de génération PDF
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<Array<{id: string, name: string, type: string, description?: string}>>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  
  // États pour le modal de création de devis
  const [devisCreatorVisible, setDevisCreatorVisible] = useState(false);
  const [devisName, setDevisName] = useState('');
  const [selectedLeadForDevis, setSelectedLeadForDevis] = useState<TBLLead | null>(null);
  const [form] = Form.useForm();

  // Autosave (ancienne UI): état local
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [autosaveLast, setAutosaveLast] = useState<Date | null>(null);
  const [devisCreatedAt, setDevisCreatedAt] = useState<Date | null>(null);
  const debounceRef = useRef<number | null>(null);
  // Garde-fous autosave: éviter les envois identiques
  const lastSavedSignatureRef = useRef<string | null>(null);
  const lastQueuedSignatureRef = useRef<string | null>(null);
  const previewDebounceRef = useRef<number | null>(null);
  const lastPreviewSignatureRef = useRef<string | null>(null);

  // Charger les données Lead si leadId fourni
  useEffect(() => {
    if (!leadId || !api) {
      setIsLoadingLead(false);
      return;
    }

    setIsLoadingLead(true);
    const loadLead = async () => {
      try {
        const response = await api.get(`/api/leads/${leadId}`);
        const lead = response.success ? response.data : response;

        if (lead && lead.id) {
          const newClientData = {
            id: lead.id,
            name: lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.company || 'Lead sans nom',
            email: lead.email || '',
            phone: lead.phone || lead.phoneNumber || lead.phoneHome || '',
            address: lead.address || lead.data?.address || ''
          };
          setClientData(newClientData);
          setFormData(prev => ({
            ...prev,
            __leadId: lead.id
          }));
        }
      } catch (error) {
        console.error('❌ [TBL] Erreur chargement lead:', error);
        message.error('Erreur lors du chargement des données du lead');
      } finally {
        setIsLoadingLead(false);
      }
    };

    loadLead();
  }, [leadId, api]);

  // Fonctions pour gérer les leads
  const handleLoadLead = useCallback(() => {
    // console.log('🔍 [TBL] handleLoadLead appelé');
    setLeadSelectorVisible(true);
  }, []);

  const handleNewLead = useCallback(() => {
    // console.log('➕ [TBL] handleNewLead appelé');
    setLeadCreatorVisible(true);
  }, []);

  // Gestion de sélection d'un lead existant
  const handleSelectLead = useCallback((selectedLead: TBLLead) => {
    // Si le modal de création de devis est ouvert, on met à jour le lead sélectionné pour le devis
    if (devisCreatorVisible) {
      setSelectedLeadForDevis(selectedLead);
      setLeadSelectorVisible(false);
      message.success(`Lead sélectionné : ${selectedLead.firstName} ${selectedLead.lastName}`);
    } else {
      // Sinon, comportement normal : redirection vers TBL avec le lead sélectionné
      window.location.href = `/tbl/${selectedLead.id}`;
      setLeadSelectorVisible(false);
    }
  }, [devisCreatorVisible]);

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

  // LOGS AUTOMATIQUES pour analyser l'état des mirrors et cartes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const timer = setTimeout(() => {
        // console.log('🚀 [TBL AUTO] ANALYSE AUTOMATIQUE DES MIRRORS');
        // console.log('='.repeat(50));
        
        // 1. Analyse des données formData
        const allKeys = Object.keys(formData);
        const mirrorKeys = allKeys.filter(k => k.startsWith('__mirror_'));
  const _dataKeys = allKeys.filter(k => !k.startsWith('__mirror_'));
        
        // console.log(`📊 FormData - Total: ${allKeys.length}, Données: ${dataKeys.length}, Mirrors: ${mirrorKeys.length}`);
        
        if (mirrorKeys.length > 0) {
          // console.log('🪞 MIRRORS DÉTECTÉS:');
          
          // Séparer par type de mirror
          const dataMirrors = mirrorKeys.filter(k => k.startsWith('__mirror_data_'));
          const formulaMirrors = mirrorKeys.filter(k => k.startsWith('__mirror_formula_'));
          const conditionMirrors = mirrorKeys.filter(k => k.startsWith('__mirror_condition_'));
          
          // Afficher TOUS les miroirs avec valeurs non-null/non-undefined/non-0
          const _dataWithValues = dataMirrors.filter(k => formData[k] != null && formData[k] !== '' && formData[k] !== 0).map(k => `${k}=${formData[k]}`);
          const _formulaWithValues = formulaMirrors.filter(k => formData[k] != null && formData[k] !== '' && formData[k] !== 0).map(k => `${k}=${formData[k]}`);
          const _conditionWithValues = conditionMirrors.filter(k => formData[k] != null && formData[k] !== '' && formData[k] !== false).map(k => `${k}=${formData[k]}`);
          
          // console.log(`  📊 DONNÉES (${dataMirrors.length} total, ${dataWithValues.length} avec valeurs):`, dataWithValues.length > 0 ? dataWithValues : dataMirrors.slice(0, 3).map(k => `${k}=${formData[k]}`));
          // console.log(`  🧮 FORMULES (${formulaMirrors.length} total, ${formulaWithValues.length} avec valeurs):`, formulaWithValues.length > 0 ? formulaWithValues : formulaMirrors.slice(0, 3).map(k => `${k}=${formData[k]}`));
          // console.log(`  🔀 CONDITIONS (${conditionMirrors.length} total, ${conditionWithValues.length} avec valeurs):`, conditionWithValues.length > 0 ? conditionWithValues : conditionMirrors.slice(0, 3).map(k => `${k}=${formData[k]}`));
        }
        
        // 2. Analyse des cartes SmartCalculatedField
        const smartFields = document.querySelectorAll('[data-testid*="smart-calculated-field"]');
        // console.log(`🎴 SmartCalculatedField détectés: ${smartFields.length}`);
        
        if (smartFields.length > 0) {
          const stats = { calculating: 0, withMirror: 0, resolved: 0, empty: 0 };
          
          smartFields.forEach((field) => {
            const text = field.textContent || '';
            
            if (text.includes('Calcul...')) {
              stats.calculating++;
            } else if (text.includes('(mirror)')) {
              stats.withMirror++;
            } else if (text.trim() && text !== '---') {
              stats.resolved++;
            } else {
              stats.empty++;
            }
          });
          
          // console.log(`📈 ÉTAT DES CARTES:`);
          // console.log(`  🔄 En calcul: ${stats.calculating}`);
          // console.log(`  🪞 Avec mirror: ${stats.withMirror}`);
          // console.log(`  ✅ Résolues: ${stats.resolved}`);
          // console.log(`  ⚪ Vides: ${stats.empty}`);
          
          const total = smartFields.length;
          const working = stats.withMirror + stats.resolved;
          const _successRate = Math.round((working / total) * 100);
          
          // console.log(`🎯 TAUX DE SUCCÈS: ${successRate}% (${working}/${total})`);
          
          if (stats.withMirror > 0) {
            // console.log('🎉 EXCELLENT! Le système mirror automatique FONCTIONNE!');
          } else if (stats.calculating > 0) {
            // console.log('⚠️ Des cartes sont en calcul - Mirrors pas encore appliqués');
          } else {
            // console.log('❌ Aucun mirror automatique détecté');
          }
        }
        
        // console.log('='.repeat(50));
      }, 2000); // Attendre 2 secondes pour que tout soit chargé
      
      return () => clearTimeout(timer);
    }
  }, [formData]); // Se relance quand formData change

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
  const { isSuperAdmin, user, organization } = useAuth();
  // const { enqueue } = useEvalBridge(); // (actuellement non utilisé dans cette version de l'écran)

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

  // Helpers: normaliser payload (exclure mirrors) et calculer signature stable
  const normalizePayload = useCallback((data: TBLFormData) => {
    const out: Record<string, string | null> = {};
    Object.keys(data || {}).forEach((nodeId) => {
      if (nodeId.startsWith('__mirror_')) return; // exclure tous les miroirs
      const raw = (data as Record<string, unknown>)[nodeId];
      out[nodeId] = raw == null ? null : String(raw);
    });
    return out;
  }, []);

  const buildPreviewPayload = useCallback((data: TBLFormData) => {
    const clean: Record<string, unknown> = {};
    Object.entries(data || {}).forEach(([key, value]) => {
      if (key.startsWith('__mirror_')) return;
      clean[key] = value;
    });
    return clean;
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

  const broadcastCalculatedRefresh = useCallback((detail?: Record<string, unknown>) => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.dispatchEvent(new CustomEvent('tbl-force-retransform', {
        detail: {
          source: 'autosave',
          submissionId,
          treeId: tree?.id,
          timestamp: Date.now(),
          skipFormReload: true,
          ...(detail || {})
        }
      }));
    } catch (err) {
      console.warn('⚠️ [TBL][AUTOSAVE] Dispatch tbl-force-retransform échoué', err);
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

  // Helper: exécution de l'autosave (PUT)
  const doAutosave = useCallback(async (data: TBLFormData) => {
    if (!api || !tree) return;
    try {
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
        // Aucun devis existant: uniquement prévisualiser (zéro écriture)
        await previewNoSave(data);
        broadcastCalculatedRefresh({ reason: 'preview-no-save' });
      } else {
        // Devis existant: mise à jour idempotente
        const evaluationResponse = await api.post('/api/tbl/submissions/create-and-evaluate', {
          submissionId,
          formData,
          clientId: leadId,
          status: 'draft'
        });
        lastSavedSignatureRef.current = sig;
        setAutosaveLast(new Date());
        broadcastCalculatedRefresh({
          reason: 'create-and-evaluate',
          evaluatedSubmissionId: submissionId,
          recalcCount: evaluationResponse?.submission?.TreeBranchLeafSubmissionData?.length
        });
      }
    } catch (e) {
      // Discret: pas de toast pour éviter le spam, logs console seulement
      console.warn('⚠️ [TBL][AUTOSAVE] Échec autosave', e);
    } finally {
      lastQueuedSignatureRef.current = null;
      setIsAutosaving(false);
    }
  }, [api, tree, normalizePayload, computeSignature, submissionId, leadId, previewNoSave, broadcastCalculatedRefresh]);

  // Déclencheur débouncé
  const scheduleAutosave = useCallback((data: TBLFormData) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => { void doAutosave(data); }, 800);
  }, [doAutosave]);

  // Auto-sauvegarde toutes les 30 secondes (après scheduleAutosave pour éviter la TDZ)
  useEffect(() => {
    if (!autoSaveEnabled || !tree || Object.keys(formData).length === 0) return;

    const interval = setInterval(() => {
      // Réutiliser la même voie débouncée + garde-fous pour éviter les doublons
      scheduleAutosave(formData);
    }, 30000);

    return () => clearInterval(interval);
  }, [formData, autoSaveEnabled, tree, scheduleAutosave]);

  const previewEvaluateAndStore = useCallback(async (data: TBLFormData) => {
    if (!api || !tree?.id) return;
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
      broadcastCalculatedRefresh({ reason: 'preview-evaluate-live', signature: sig });
    } catch (err) {
      lastPreviewSignatureRef.current = null;
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

  const handleFieldChange = useCallback((fieldId: string, value: string | number | boolean | string[] | null | undefined) => {
    console.log(`🔄🔄🔄 [TBL] handleFieldChange appelé: fieldId=${fieldId}, value=${value}`);
    
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
      try {
        // Chercher le champ dans la configuration pour voir s'il a un sharedReferenceId
        let fieldDef: any = null;
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
      try {
        // Log ciblé pour debug champs Prix Kw/h
        const dynamicLabel = fieldConfig?.label || fieldId;
        // Log générique (diagnostic) au lieu de filtre métier
        if (localStorage.getItem('TBL_DIAG') === '1') {
          // console.log('[TBL][FIELD][CHANGE]', { fieldId, label: dynamicLabel, value });
        }
        // Miroir automatique: si le label se termine par ' - Champ' on alimente __mirror_data_<BaseLabel>
        if (typeof dynamicLabel === 'string' && / - Champ$/i.test(dynamicLabel)) {
          const baseLabel = dynamicLabel.replace(/ - Champ$/i, '');
          const mirrorKey = `__mirror_data_${baseLabel}`;
          if (!(mirrorKey in next)) {
            // console.log('[TBL][MIRROR][SET]', { mirrorKey, from: fieldId, value });
          }
          next[mirrorKey] = value;
          try {
            const variants = buildMirrorKeys(baseLabel).map(k => k.replace(/^__mirror_data_/, ''));
            variants.forEach(v => {
              const k = `__mirror_data_${v}`;
              if (!(k in next)) {
                next[k] = value;
                // console.log('[TBL][MIRROR][SET_VARIANT]', { variantKey: k, base: baseLabel, from: fieldId });
              }
            });
          } catch (e) {
            console.warn('[TBL][MIRROR][VARIANT][ERROR]', e);
          }
        } else if (fieldId.startsWith('__mirror_data_')) {
          try {
            const base = dynamicLabel;
            const variants = buildMirrorKeys(base).map(k => k.replace(/^__mirror_data_/, ''));
            variants.forEach(v => {
              const k = `__mirror_data_${v}`;
              if (!(k in next)) {
                next[k] = value;
                // console.log('[TBL][MIRROR][SET_VARIANT_FROM_MIRROR]', { variantKey: k, from: fieldId });
              }
            });
          } catch (e) {
            console.warn('[TBL][MIRROR][VARIANT_FROM_MIRROR][ERROR]', e);
          }
        }
      } catch {/* noop */}
      
      // Planifier une autosauvegarde débouncée avec l'état "next"
      try {
        scheduleAutosave(next as TBLFormData);
      } catch {/* noop */}
      try {
        scheduleCapabilityPreview(next as TBLFormData);
      } catch {/* noop */}
      return next as typeof prev;
    });
  }, [tblConfig, tabs, scheduleAutosave, scheduleCapabilityPreview]);


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

  // Générer un nom unique en évitant les doublons
  const generateUniqueDevisName = async (baseName: string, leadId: string): Promise<string> => {
    try {
      if (!api) return baseName;
      
      // Récupérer tous les devis du lead actuel
      const response = await api.get(`/api/treebranchleaf/submissions?leadId=${leadId}`);
      const existingSubmissions = response.data || [];
      
      // Extraire les noms existants
      const existingNames = existingSubmissions.map((submission: { summary?: { name?: string }, name?: string }) => 
        submission.summary?.name || submission.name || ''
      ).filter(name => name.trim() !== '');
      
      // console.log('🔍 [TBL] Noms de devis existants:', existingNames);
      
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
      
      // console.log('🔢 [TBL] Nom unique généré:', uniqueName);
      return uniqueName;
    } catch (error) {
      console.error('❌ [TBL] Erreur lors de la génération du nom unique:', error);
      return baseName; // Fallback sur le nom de base
    }
  };

  // Créer un nouveau devis pour le lead actuel
  const handleNewDevis = async () => {
    try {
      // Générer un nom par défaut basé sur les données actuelles
      const clientName = clientData.name || 'Client';
      const baseName = `Devis ${new Date().toLocaleDateString('fr-FR')} - ${clientName}`;
      
      // Générer un nom unique en évitant les doublons
      const uniqueName = await generateUniqueDevisName(baseName, leadId || '');
      
      setDevisName(uniqueName);
      form.setFieldsValue({ devisName: uniqueName });
      setDevisCreatorVisible(true);
    } catch (error) {
      console.error('❌ [TBL] Erreur lors de la création du nouveau devis:', error);
      // Fallback sur le nom simple
      const clientName = clientData.name || 'Client';
      const defaultName = `Devis ${new Date().toLocaleDateString('fr-FR')} - ${clientName}`;
      setDevisName(defaultName);
      form.setFieldsValue({ devisName: defaultName });
      setDevisCreatorVisible(true);
    }
  };

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
          providedName: submissionData.name
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
                providedName: submissionData.name
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
                  address: lead.address || lead.data?.address || ''
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
          providedName: uniqueName
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
      // console.log('🔍 [TBL] === DÉBUT CHARGEMENT DEVIS ===');
      // console.log('🔍 [TBL] ID du devis:', devisId);
      // console.log('🔍 [TBL] Données du lead:', leadData);
      
      // Indicateur de chargement
      message.loading('Chargement du devis...', 0.5);
      
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
              address: lead.address || lead.data?.address || ''
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
      const submission = await api.get(`/api/treebranchleaf/submissions/${devisId}`);
      // console.log('🔍 [TBL] Réponse API complète:', submission);
      
      // console.log('🔍 [TBL] Réponse API complète:', submission);
      
      if (submission && submission.TreeBranchLeafSubmissionData) {
        // console.log('🔍 [TBL] Données de submission trouvées:', submission.TreeBranchLeafSubmissionData);
        // console.log('🔍 [TBL] Nombre d\'éléments:', submission.TreeBranchLeafSubmissionData.length);
        
        // Reformater les données pour le formulaire
        const formattedData: TBLFormData = {};
  submission.TreeBranchLeafSubmissionData.forEach((item: {nodeId: string, value?: string}) => {
          // console.log(`🔍 [TBL] Item ${index}:`, item);
          if (item.value !== undefined && item.value !== null && item.value !== '') {
            formattedData[item.nodeId] = item.value;
            // console.log(`✅ [TBL] Ajouté: ${item.nodeId} = ${item.value}`);
          } else {
            // console.log(`⚠️ [TBL] Ignoré (valeur vide): ${item.nodeId} = ${item.value}`);
          }
        });
        
        // console.log('🔍 [TBL] Données formatées finales:', formattedData);
        // console.log('🔍 [TBL] Nombre de champs avec données:', Object.keys(formattedData).length);
        
        // Mettre à jour le formulaire
        setFormData(formattedData);
        // Enregistrer l'ID du devis sélectionné pour activer l'autosave idempotent
        setSubmissionId(devisId);
        // Marquer la signature comme "déjà sauvegardée" pour éviter un autosave immédiat inutile
        try {
          const normalized = normalizePayload(formattedData);
          const sig = computeSignature(normalized);
          lastSavedSignatureRef.current = sig;
        } catch { /* noop */ }
        // console.log('✅ [TBL] FormData mis à jour');
        
        const devisName = submission.summary?.name || submission.name || `Devis ${devisId.slice(0, 8)}`;
        // console.log('🔍 [TBL] Nom du devis:', devisName);
        
        // Mettre à jour le nom et la date du devis dans l'état
        setDevisName(devisName);
        if (submission.createdAt) {
          setDevisCreatedAt(new Date(submission.createdAt));
        }
        
        message.success(`Devis "${devisName}" chargé avec succès (${Object.keys(formattedData).length} champs)`);
      } else {
        console.warn('🔍 [TBL] Aucune donnée TreeBranchLeafSubmissionData trouvée');
        console.warn('🔍 [TBL] Structure de submission:', Object.keys(submission || {}));
        message.warning('Devis trouvé mais aucune donnée de formulaire');
      }
      
      // Fermer la modal
      setDevisSelectorVisible(false);
      // console.log('🔍 [TBL] === FIN CHARGEMENT DEVIS ===');
      
    } catch (error) {
      console.error('❌ [TBL] Erreur lors du chargement du devis:', error);
      console.error('❌ [TBL] Détails de l\'erreur:', error);
      message.error('Erreur lors du chargement du devis. Vérifiez la console pour plus de détails.');
    }
  }, [api, normalizePayload, computeSignature]);

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
                  <TBLDevCapabilitiesPanel preload={devPreload} />
                </div>
              )}
              {/* En-tête compact avec Lead - Devis - Date */}
              <div className={headerContainerClass}>
                <div className="flex-1">
                  <Title level={4} className="mb-0 text-gray-800">
                    {clientData.name || 'Aucun lead'}
                    {' - '}
                    {devisName || (tree.name ? `${tree.name} (Nouveau devis)` : 'Nouveau devis')}
                    {devisCreatedAt && ` - ${devisCreatedAt.toLocaleDateString('fr-FR')}`}
                  </Title>
                </div>
                
                <Space
                  direction={headerActionsDirection}
                  size={isMobile ? 'middle' : 'small'}
                  className={headerActionsClassName}
                  wrap={!isMobile}
                  align={headerActionsAlign}
                >
                  <Tooltip title="Charger Lead" placement="bottom">
                    <Button 
                      icon={<UserOutlined />}
                      onClick={handleLoadLead}
                      block={actionButtonBlock}
                    />
                  </Tooltip>
                  <Tooltip title="Nouveau Lead" placement="bottom">
                    <Button 
                      icon={<PlusOutlined />}
                      onClick={handleNewLead}
                      block={actionButtonBlock}
                    />
                  </Tooltip>
                  <Tooltip title="Charger Devis" placement="bottom">
                    <Button 
                      icon={<FolderOpenOutlined />}
                      onClick={handleLoadDevis}
                      block={actionButtonBlock}
                    />
                  </Tooltip>
                  <Tooltip title="Nouveau Devis" placement="bottom">
                    <Button 
                      icon={<FileAddOutlined />}
                      onClick={handleNewDevis}
                      type="primary"
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
                        <DocumentsSection 
                          submissionId={submissionId}
                          leadId={leadId}
                        />
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
                      />
                    </div>
                  )
                };
                }) : [])
                ]}
              />

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

      {/* Modal de sélection de lead */}
      <LeadSelectorModal
        open={leadSelectorVisible}
        onClose={() => {
          // console.log('🔍 [TBL] Fermeture LeadSelectorModal');
          setLeadSelectorVisible(false);
        }}
        onSelectLead={handleSelectLead}
      />

      {/* Modal de création de lead */}
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
                    lead.submissions?.map((devis) => ({
                      ...devis,
                      leadInfo: {
                        id: lead.id,
                        firstName: lead.firstName,
                        lastName: lead.lastName,
                        email: lead.email,
                        company: lead.company || 'Non renseigné'
                      }
                    })) || []
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
    </Layout>
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
  submissionId
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
  const stableOnChange = useCallback(onChange, [onChange]);

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

  const [activeSubTab, setActiveSubTab] = useState<string | undefined>(allSubTabs.length > 0 ? allSubTabs[0].key : undefined);
  
  // 🔧 FIX: Retirer activeSubTab des dépendances pour éviter la boucle infinie (React Error #185)
  // On utilise une ref pour accéder à la valeur actuelle sans créer de dépendance
  useEffect(() => { 
    setActiveSubTab(prev => {
      // Si allSubTabs est vide, garder la valeur actuelle
      if (allSubTabs.length === 0) return prev;
      // Si l'onglet actuel n'existe plus dans allSubTabs, sélectionner le premier
      if (!allSubTabs.find(st => st.key === prev)) return allSubTabs[0].key;
      // Sinon garder la valeur actuelle
      return prev;
    });
  }, [allSubTabs]);

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
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {(allSubTabs || []).map(st => (
                <Button
                  key={st.key}
                  size="small"
                  type={st.key === activeSubTab ? 'primary' : 'default'}
                  onClick={() => setActiveSubTab(st.key)}
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
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {(allSubTabs || []).map(st => (
                <Button
                  key={st.key}
                  size="small"
                  type={st.key === activeSubTab ? 'primary' : 'default'}
                  onClick={() => setActiveSubTab(st.key)}
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
