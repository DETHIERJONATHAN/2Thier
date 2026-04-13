import { FB } from '../../components/zhiive/ZhiiveTheme';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { Spin, Tag, Tooltip, Alert, Modal, App } from 'antd';
import {
  SaveOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  SendOutlined,
  InboxOutlined,
  SafetyCertificateOutlined,
  InfoCircleOutlined,
  CloudServerOutlined,
  SearchOutlined,
  WarningOutlined,
  SwapOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
  DeleteOutlined,
  MobileOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface PeppolConfigData {
  enabled: boolean;
  peppolEas: string;
  peppolEndpoint: string;
  registrationStatus: string;
  contactEmail: string;
  contactPhone: string;
  migrationKey?: string;
  autoSendEnabled: boolean;
  autoReceiveEnabled: boolean;
}

interface CompanyInfo {
  name: string;
  vatNumber: string;
  address?: string;
  zipCode?: string;
  city?: string;
  country?: string;
}

interface PeppolRegistrationInfo {
  isRegistered: boolean;
  accessPoint?: string;
  registrationDate?: string;
  isRegisteredElsewhere: boolean;
  isRegisteredWithUs: boolean;
}

interface VatLookupResult {
  valid: boolean;
  company?: CompanyInfo;
  peppol: PeppolRegistrationInfo;
  source: string;
}

const STATUS_MAP: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  NOT_REGISTERED: { color: 'default', label: 'Non enregistré', icon: <CloseCircleOutlined /> },
  VERIFICATION_NEEDED: { color: 'warning', label: 'Vérification SMS requise', icon: <MobileOutlined /> },
  PENDING: { color: 'processing', label: 'En cours d\'activation', icon: <SyncOutlined spin /> },
  ACTIVE: { color: 'success', label: 'Actif sur Peppol (chez nous)', icon: <CheckCircleOutlined /> },
  REJECTED: { color: 'error', label: 'Rejeté', icon: <CloseCircleOutlined /> },
  DEREGISTERED: { color: 'warning', label: 'Désinscrit', icon: <CloseCircleOutlined /> },
  MIGRATION_PENDING: { color: 'warning', label: 'Enregistré ailleurs — transfert nécessaire', icon: <SwapOutlined /> },
};

interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

const PeppolSettings: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const { api } = useAuthenticatedApi();

  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [serviceHealthy, setServiceHealthy] = useState<boolean | null>(null);
  const [config, setConfig] = useState<PeppolConfigData>({
    enabled: false,
    peppolEas: '0208',
    peppolEndpoint: '',
    registrationStatus: 'NOT_REGISTERED',
    contactEmail: '',
    contactPhone: '',
    autoSendEnabled: false,
    autoReceiveEnabled: true,
  });

  // ── VAT Lookup + Peppol Check state ──
  const [vatInput, setVatInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [vatResult, setVatResult] = useState<VatLookupResult | null>(null);
  const [migrationKeyInput, setMigrationKeyInput] = useState('');
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [deregistering, setDeregistering] = useState(false);
  const [showDeregisterModal, setShowDeregisterModal] = useState(false);
  const [registeredAt, setRegisteredAt] = useState<string | null>(null);
  const [smsCode, setSmsCode] = useState('');
  const [sendingSms, setSendingSms] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  // ── Responsive mobile detection ──
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowWidth < 640;
  const cardPad = isMobile ? 12 : 20;

  const handleVatLookup = useCallback(async (vat?: string) => {
    const vatToLookup = vat || vatInput;
    if (!vatToLookup || vatToLookup.replace(/\D/g, '').length < 8) {
      message.warning('Entrez un numéro de TVA valide (min 8 chiffres)');
      return;
    }
    try {
      setLookingUp(true);
      const result = await api.post<ApiResponse<VatLookupResult>>('/api/peppol/vat-lookup', { vatNumber: vatToLookup });
      if (result?.success && result.data) {
        setVatResult(result.data);
        // Auto-fill l'endpoint Peppol
        if (result.data.company) {
          const digits = result.data.company.vatNumber.replace(/[^0-9]/g, '');
          setConfig(prev => ({
            ...prev,
            peppolEndpoint: digits || prev.peppolEndpoint,
          }));
        }
        if (result.data.peppol.isRegistered && result.data.peppol.isRegisteredElsewhere) {
          message.warning('Ce numéro est déjà enregistré sur Peppol chez un autre fournisseur !');
        } else if (result.data.valid) {
          message.success(`Entreprise trouvée : ${result.data.company?.name}`);
        }
      }
    } catch {
      message.error('Erreur lors de la recherche');
    } finally {
      setLookingUp(false);
    }
  }, [vatInput, api]);

  const handleCompleteMigration = useCallback(async () => {
    if (!migrationKeyInput.trim()) {
      message.warning('Veuillez entrer la clé de migration');
      return;
    }
    try {
      setMigrating(true);
      const result = await api.post<ApiResponse<{ registrationStatus: string }>>('/api/peppol/complete-migration', {
        migrationKey: migrationKeyInput,
      });
      if (result?.success) {
        message.success('Migration lancée avec succès !');
        setShowMigrationModal(false);
        setConfig(prev => ({ ...prev, registrationStatus: result.data.registrationStatus }));
      } else {
        message.error(result?.message || 'Erreur de migration');
      }
    } catch (error) {
      message.error(`Erreur: ${(error as Error).message}`);
    } finally {
      setMigrating(false);
    }
  }, [migrationKeyInput, api]);

  const handleDeregister = useCallback(async () => {
    try {
      setDeregistering(true);
      const result = await api.post<ApiResponse<{ registrationStatus: string }>>('/api/peppol/deregister', {});
      if (result?.success) {
        message.success('Désinscription Peppol effectuée');
        setShowDeregisterModal(false);
        setConfig(prev => ({
          ...prev,
          enabled: false,
          registrationStatus: 'DEREGISTERED',
          autoSendEnabled: false,
          autoReceiveEnabled: false,
        }));
      } else {
        message.error(result?.message || 'Erreur lors de la désinscription');
      }
    } catch (error) {
      message.error(`Erreur: ${(error as Error).message}`);
    } finally {
      setDeregistering(false);
    }
  }, [api]);

  const handleSendSmsCode = useCallback(async () => {
    try {
      setSendingSms(true);
      const result = await api.post<ApiResponse<unknown>>('/api/peppol/send-verification-code', {});
      if (result?.success) {
        message.success('SMS de vérification envoyé à votre numéro de téléphone');
      } else {
        message.error(result?.message || 'Erreur lors de l\'envoi du SMS');
      }
    } catch (error) {
      message.error(`Erreur: ${(error as Error).message}`);
    } finally {
      setSendingSms(false);
    }
  }, [api]);

  const handleVerifyCode = useCallback(async () => {
    if (!smsCode || smsCode.length < 4) {
      message.warning('Entrez le code de vérification reçu par SMS');
      return;
    }
    try {
      setVerifyingCode(true);
      const result = await api.post<ApiResponse<{ registrationStatus: string }>>('/api/peppol/verify-code', { code: smsCode });
      if (result?.success) {
        message.success(result.message || 'Code vérifié !');
        setConfig(prev => ({ ...prev, registrationStatus: result.data.registrationStatus }));
        setSmsCode('');
      } else {
        message.error(result?.message || 'Code incorrect');
      }
    } catch (error) {
      message.error(`Erreur: ${(error as Error).message}`);
    } finally {
      setVerifyingCode(false);
    }
  }, [smsCode, api]);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.get<ApiResponse<PeppolConfigData>>('/api/peppol/config');
      if (result?.success && result.data) {
        setConfig(result.data);
      }
    } catch (error) {
      console.error('[PeppolSettings] Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const checkHealth = useCallback(async () => {
    try {
      setCheckingHealth(true);
      const result = await api.get<ApiResponse<{ ok: boolean }>>('/api/peppol/health');
      setServiceHealthy(result?.success && result.data?.ok);
    } catch {
      setServiceHealthy(false);
    } finally {
      setCheckingHealth(false);
    }
  }, [api]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        peppolEas: config.peppolEas,
        peppolEndpoint: config.peppolEndpoint,
        contactEmail: config.contactEmail,
        contactPhone: config.contactPhone,
        migrationKey: config.migrationKey,
        autoSendEnabled: config.autoSendEnabled,
        autoReceiveEnabled: config.autoReceiveEnabled,
      };
      console.log('[PeppolSettings] handleSave payload:', JSON.stringify(payload));
      const result = await api.put<ApiResponse<PeppolConfigData>>('/api/peppol/config', payload);
      if (result?.success) {
        message.success('Configuration Peppol sauvegardée');
        setConfig(result.data);
      } else {
        message.error(result?.message || 'Erreur lors de la sauvegarde');
      }
    } catch (err: unknown) {
      const apiErr = err as { data?: { debug?: unknown; message?: string; errors?: unknown[] } };
      console.error('[PeppolSettings] Save error details:', JSON.stringify(apiErr?.data));
      message.error(apiErr?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleRegister = async () => {
    if (!config.peppolEndpoint) {
      message.warning('Veuillez d\'abord renseigner votre numéro d\'entreprise BCE');
      return;
    }
    if (!config.contactEmail) {
      message.warning('Veuillez renseigner un email de contact');
      return;
    }
    if (!config.contactPhone) {
      message.warning('Veuillez renseigner un numéro de téléphone (avec code pays, ex: +32...)');
      return;
    }

    try {
      setRegistering(true);
      // Save config first
      await handleSave();
      // Then register
      const result = await api.post<ApiResponse<{ registrationStatus: string; registeredAt?: string }>>('/api/peppol/register', {});
      if (result?.success) {
        const newStatus = result.data.registrationStatus;
        setConfig(prev => ({
          ...prev,
          enabled: true,
          registrationStatus: newStatus,
        }));
        if (newStatus === 'VERIFICATION_NEEDED') {
          message.info('Enregistrement lancé ! Un SMS de vérification va être envoyé.');
        } else if (newStatus === 'ACTIVE') {
          message.success('Peppol activé avec succès !');
        } else {
          message.success('Demande d\'enregistrement Peppol envoyée !');
        }
      } else {
        // Cas 409 : enregistré ailleurs
        const data = (result as unknown)?.data;
        if (data?.registrationStatus === 'MIGRATION_PENDING') {
          setConfig(prev => ({ ...prev, registrationStatus: 'MIGRATION_PENDING' }));
          setRegisteredAt(data.registeredAt || null);
          message.warning(result?.message || 'Ce numéro est enregistré chez un autre fournisseur Peppol');
        } else {
          message.error(result?.message || 'Erreur lors de l\'enregistrement');
        }
      }
    } catch (error) {
      const err = error as unknown;
      // Intercepter les erreurs 409 du fetch
      if (err?.response?.status === 409 || err?.data?.data?.registrationStatus === 'MIGRATION_PENDING') {
        const data = err?.data?.data || err?.response?.data?.data;
        setConfig(prev => ({ ...prev, registrationStatus: 'MIGRATION_PENDING' }));
        setRegisteredAt(data?.registeredAt || null);
        message.warning(`Ce numéro est enregistré chez ${data?.registeredAt || 'un autre fournisseur'}`);
      } else {
        message.error(`Erreur: ${(error as Error).message}`);
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleRefreshStatus = useCallback(async (silent = false) => {
    try {
      const result = await api.get<ApiResponse<{ registrationStatus: string; registeredAt?: string; peppolDirectory?: { isRegistered: boolean; isRegisteredWithUs: boolean; isRegisteredElsewhere: boolean; accessPoint?: string; registrationDate?: string } }>>('/api/peppol/status');
      if (result?.success) {
        setConfig(prev => ({ ...prev, registrationStatus: result.data.registrationStatus }));
        setRegisteredAt(result.data.registeredAt || null);
        if (!silent) {
          const statusLabel = STATUS_MAP[result.data.registrationStatus]?.label || result.data.registrationStatus;
          if (result.data.registeredAt && result.data.registrationStatus === 'MIGRATION_PENDING') {
            message.warning(`Enregistré chez ${result.data.registeredAt} — migration nécessaire`);
          } else {
            message.info(`Statut: ${statusLabel}`);
          }
        }
      }
    } catch {
      if (!silent) {
        message.error('Erreur lors de la vérification du statut');
      }
    }
  }, [api]);

  // Effect principal : chargement config + health + statut au mount
  useEffect(() => {
    if (!currentOrganization?.id || currentOrganization.id === 'all') {
      setLoading(false);
      return;
    }
    fetchConfig();
    checkHealth();
    handleRefreshStatus(true);
  }, [fetchConfig, checkHealth, currentOrganization?.id, handleRefreshStatus]);

  // 🔄 Auto-polling pendant les états de transition (PENDING / MIGRATION_PENDING)
  useEffect(() => {
    const isTransitioning = config.registrationStatus === 'PENDING' || config.registrationStatus === 'MIGRATION_PENDING' || config.registrationStatus === 'VERIFICATION_NEEDED';
    if (!isTransitioning || !currentOrganization?.id || currentOrganization.id === 'all') return;

    const intervalId = setInterval(() => {
      handleRefreshStatus(true).then(() => {
        // Si le statut a changé vers ACTIVE, notification visible
        setConfig(prev => {
          if (prev.registrationStatus === 'ACTIVE' && (config.registrationStatus === 'PENDING' || config.registrationStatus === 'MIGRATION_PENDING')) {
            message.success('Transfert Peppol terminé — votre enregistrement est maintenant actif !');
          }
          return prev;
        });
      });
    }, 60_000); // Toutes les 60 secondes

    return () => clearInterval(intervalId);
  }, [config.registrationStatus, currentOrganization?.id, handleRefreshStatus, message]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
      </div>
    );
  }

  if (!currentOrganization?.id || currentOrganization.id === 'all') {
    return (
      <div style={{ maxWidth: 720 }}>
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message="Aucune organisation sélectionnée"
          description="Veuillez sélectionner une Colony spécifique (pas 'Toutes') pour configurer la e-Facturation Peppol."
          style={{ borderRadius: FB.radius }}
        />
      </div>
    );
  }

  const statusInfo = STATUS_MAP[config.registrationStatus] || STATUS_MAP.NOT_REGISTERED;
  const isRegistered = config.registrationStatus === 'ACTIVE';

  return (
    <div style={{ maxWidth: 720, width: '100%', padding: isMobile ? '0 4px' : undefined }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 17 : 20, fontWeight: 700, color: FB.text }}>
          <SendOutlined style={{ marginRight: 8 }} />
          e-Facturation Peppol
        </h2>
        <p style={{ margin: '4px 0 0', color: FB.textSecondary, fontSize: isMobile ? 13 : 14 }}>
          {isMobile
            ? 'Factures électroniques via Peppol (obligatoire B2B Belgique).'
            : 'Envoyez et recevez des factures électroniques via le réseau Peppol (obligatoire B2B en Belgique).'}
        </p>
      </div>

      {/* Statut du service */}
      <div style={{ background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow, padding: isMobile ? 12 : 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: isMobile ? 8 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
            <CloudServerOutlined style={{ fontSize: isMobile ? 18 : 20, color: serviceHealthy ? FB.green : FB.danger }} />
            <div>
              <div style={{ fontWeight: 600, color: FB.text, fontSize: isMobile ? 13 : 14 }}>Service Peppol</div>
              <div style={{ fontSize: 12, color: FB.textSecondary }}>
                {checkingHealth ? 'Vérification...' : serviceHealthy ? 'Connecté' : 'Non disponible'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag color={statusInfo.color} icon={statusInfo.icon}>
              {statusInfo.label}
            </Tag>
            <Tooltip title="Vérifier le statut réel sur le réseau Peppol">
              <button
                onClick={() => handleRefreshStatus(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: FB.blue, padding: 4,
                }}
              >
                <SyncOutlined />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Indication de localisation si enregistré */}
        {/* Statut d'enregistrement détaillé */}
        {config.registrationStatus === 'ACTIVE' && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 6,
            background: '#f6ffed', border: '1px solid #b7eb8f', fontSize: 13,
          }}>
            <span style={{ color: '#389e0d' }}>
              <CheckCircleOutlined style={{ marginRight: 6 }} />
              Actif sur le réseau Peppol — vos factures arrivent ici
            </span>
            {registeredAt && (
              <div style={{ marginTop: 6, fontSize: 12, color: '#52c41a' }}>
                Ancien fournisseur : <strong>{registeredAt}</strong> — transfert terminé avec succès
              </div>
            )}
          </div>
        )}

        {/* Ancien fournisseur Peppol détecté + transfert en cours */}
        {config.registrationStatus === 'MIGRATION_PENDING' && (
          <div style={{
            marginTop: 10, padding: '12px 16px', borderRadius: 6,
            background: FB.warningBg, border: `1px solid ${FB.warningBorder}`, fontSize: 13,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <SwapOutlined style={{ color: FB.orange, fontSize: 16 }} />
              <strong style={{ color: FB.warningText }}>Transfert en cours</strong>
            </div>
            <p style={{ margin: '4px 0', color: FB.warningText }}>
              Votre numéro Peppol est actuellement enregistré chez{' '}
              <strong>{registeredAt || vatResult?.peppol?.accessPoint || 'un autre fournisseur'}</strong>
              {(vatResult?.peppol?.registrationDate || '') && ` (depuis le ${vatResult?.peppol?.registrationDate})`}.
            </p>
            <p style={{ margin: '4px 0', color: FB.warningText, fontSize: 12 }}>
              Tant que le transfert n'est pas finalisé, vos factures Peppol continuent d'arriver chez votre ancien fournisseur.
              Contactez-les pour obtenir une clé de migration ou désactiver Peppol de leur côté.
            </p>
            <button
              onClick={() => setShowMigrationModal(true)}
              style={{
                marginTop: 8, padding: '8px 16px', borderRadius: 6, border: 'none',
                background: FB.orange, color: '#fff', fontWeight: 600,
                fontSize: 13, cursor: 'pointer',
              }}
            >
              <SwapOutlined style={{ marginRight: 6 }} />
              J'ai ma clé de migration
            </button>
            <div style={{ marginTop: 8, fontSize: 11, color: FB.textSecondary }}>
              <SyncOutlined spin style={{ marginRight: 4 }} />
              Vérification automatique toutes les 60 secondes — le statut se mettra à jour dès que le transfert sera effectif.
            </div>
          </div>
        )}

        {config.registrationStatus === 'VERIFICATION_NEEDED' && (
          <div style={{
            marginTop: 10, padding: '12px 16px', borderRadius: 6,
            background: FB.warningBg, border: `1px solid ${FB.warningBorder}`, fontSize: 13,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <MobileOutlined style={{ color: FB.orange, fontSize: 16 }} />
              <strong style={{ color: FB.warningText }}>Vérification SMS requise</strong>
            </div>
            <p style={{ margin: '4px 0 12px', color: FB.warningText }}>
              Un code de vérification a été envoyé par SMS au numéro renseigné.
              Entrez le code ci-dessous pour finaliser votre inscription Peppol.
            </p>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8, alignItems: isMobile ? 'stretch' : 'center', marginBottom: 8 }}>
              <input
                type="text"
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyCode(); }}
                placeholder="Code SMS (6 chiffres)"
                maxLength={10}
                style={{
                  width: isMobile ? '100%' : 180, padding: '10px 12px', borderRadius: 6,
                  border: `1px solid ${FB.border}`, fontSize: 18, letterSpacing: 4,
                  textAlign: 'center', fontWeight: 700, boxSizing: 'border-box',
                }}
              />
              <button
                onClick={handleVerifyCode}
                disabled={verifyingCode || smsCode.length < 4}
                style={{
                  padding: isMobile ? '12px 16px' : '8px 16px', borderRadius: 6, border: 'none',
                  background: FB.green, color: '#fff', fontWeight: 600,
                  fontSize: 14, cursor: verifyingCode ? 'wait' : 'pointer',
                  opacity: (verifyingCode || smsCode.length < 4) ? 0.7 : 1,
                }}
              >
                {verifyingCode ? <LoadingOutlined /> : <CheckCircleOutlined />}
                {' '}Vérifier
              </button>
            </div>
            <button
              onClick={handleSendSmsCode}
              disabled={sendingSms}
              style={{
                background: 'none', border: 'none', cursor: sendingSms ? 'wait' : 'pointer',
                color: FB.blue, fontSize: 12, padding: 0, textDecoration: 'underline',
              }}
            >
              {sendingSms ? <LoadingOutlined style={{ marginRight: 4 }} /> : null}
              Renvoyer le code SMS
            </button>
          </div>
        )}

        {config.registrationStatus === 'PENDING' && (
          <div style={{
            marginTop: 10, padding: '12px 16px', borderRadius: 6,
            background: FB.infoBg, border: `1px solid ${FB.infoBorder}`, fontSize: 13,
          }}>
            <div>
              <span style={{ color: FB.infoTitle }}>
                <SyncOutlined spin style={{ marginRight: 6 }} />
                Activation en cours — votre enregistrement est en train d'être validé sur le réseau Peppol
              </span>
              <div style={{ marginTop: 6, fontSize: 11, color: FB.textSecondary }}>
                <SyncOutlined spin style={{ marginRight: 4 }} />
                Vérification automatique toutes les 60 secondes — le statut changera dès la confirmation.
              </div>
            </div>
            {registeredAt && (
              <div style={{
                marginTop: 8, padding: '8px 12px', borderRadius: 4,
                background: FB.warningBg, border: `1px solid ${FB.warningBorder}`,
              }}>
                <WarningOutlined style={{ color: FB.orange, marginRight: 6 }} />
                <span style={{ color: FB.warningText, fontSize: 12 }}>
                  Ancien Access Point détecté : <strong>{registeredAt}</strong>.
                  Si le transfert n'est pas finalisé de leur côté, vos factures continuent d'arriver chez eux.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Configuration */}
      <div style={{ background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow, padding: cardPad, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: FB.text }}>
          <SafetyCertificateOutlined style={{ marginRight: 8 }} />
          Identification Peppol
        </h3>

        <div style={{ display: 'grid', gap: 16 }}>

          {/* ── Recherche par TVA (auto-fill) ── */}
          {!isRegistered && (
            <div style={{ padding: 16, background: FB.bg, borderRadius: FB.radius, border: `1px solid ${FB.border}` }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 8 }}>
                <SearchOutlined style={{ marginRight: 6 }} />
                Recherche par numéro de TVA
              </label>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8 }}>
                <input
                  type="text"
                  value={vatInput}
                  onChange={(e) => setVatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleVatLookup(); }}
                  placeholder="BE0123456789 ou 0123.456.789"
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 6,
                    border: `1px solid ${FB.border}`, fontSize: 14, boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={() => handleVatLookup()}
                  disabled={lookingUp}
                  style={{
                    padding: isMobile ? '12px 16px' : '8px 16px', borderRadius: 6, border: 'none',
                    background: FB.blue, color: '#fff', fontWeight: 600,
                    fontSize: 14, cursor: lookingUp ? 'wait' : 'pointer',
                    opacity: lookingUp ? 0.7 : 1, whiteSpace: 'nowrap',
                  }}
                >
                  {lookingUp ? <LoadingOutlined /> : <SearchOutlined />}
                  {' '}Rechercher
                </button>
              </div>
              <span style={{ fontSize: 11, color: FB.textSecondary }}>
                Entrez un numéro de TVA pour remplir automatiquement les informations et vérifier le statut Peppol
              </span>

              {/* Résultat de la recherche TVA */}
              {vatResult?.valid && vatResult.company && (
                <div style={{ marginTop: 12, padding: 12, background: FB.white, borderRadius: 6, border: `1px solid ${FB.border}` }}>
                  <div style={{ fontWeight: 600, color: FB.text, marginBottom: 4 }}>
                    <CheckCircleOutlined style={{ color: FB.green, marginRight: 6 }} />
                    {vatResult.company.name}
                  </div>
                  <div style={{ fontSize: 12, color: FB.textSecondary }}>
                    {vatResult.company.vatNumber}
                    {vatResult.company.address && ` — ${vatResult.company.address}`}
                    {vatResult.company.zipCode && vatResult.company.city && ` ${vatResult.company.zipCode} ${vatResult.company.city}`}
                  </div>
                  <div style={{ fontSize: 11, color: FB.textSecondary, marginTop: 2 }}>
                    Source : {vatResult.source === 'kbo' ? 'KBO/BCE (Belgique)' : vatResult.source === 'vies' ? 'VIES (Commission EU)' : 'Manuel'}
                  </div>
                </div>
              )}

              {vatResult && !vatResult.valid && (
                <div style={{ marginTop: 12, padding: 12, background: '#fff2f0', borderRadius: 6, border: '1px solid #ffccc7' }}>
                  <CloseCircleOutlined style={{ color: FB.danger, marginRight: 6 }} />
                  <span style={{ color: FB.danger, fontWeight: 500 }}>Numéro de TVA non trouvé ou invalide</span>
                </div>
              )}
            </div>
          )}

          {/* ── ALERTE : Peppol déjà enregistré ailleurs ── */}
          {vatResult?.peppol?.isRegistered && vatResult.peppol.isRegisteredElsewhere && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              style={{ borderRadius: FB.radius }}
              message={
                <span style={{ fontWeight: 600 }}>
                  <ExclamationCircleOutlined style={{ marginRight: 6 }} />
                  Ce numéro est déjà enregistré sur Peppol
                </span>
              }
              description={
                <div>
                  <p style={{ margin: '8px 0' }}>
                    Le numéro <strong>{vatResult.company?.vatNumber}</strong> est actuellement enregistré
                    chez <strong>{vatResult.peppol.accessPoint || 'un autre fournisseur'}</strong>
                    {vatResult.peppol.registrationDate && ` depuis le ${vatResult.peppol.registrationDate}`}.
                  </p>
                  <p style={{ margin: '8px 0', fontSize: 13 }}>
                    Pour recevoir vos factures Peppol dans Zhiive, vous devez :
                  </p>
                  <ol style={{ margin: '4px 0', paddingLeft: 20, fontSize: 13 }}>
                    <li>
                      Vous connecter à <strong>{vatResult.peppol.accessPoint || 'votre fournisseur actuel'}</strong> et
                      demander la <strong>désactivation de Peppol</strong> (ou une <strong>clé de migration</strong>)
                    </li>
                    <li>Revenir ici avec la clé de migration pour finaliser le transfert</li>
                  </ol>
                  <p style={{ margin: '8px 0', fontSize: 13, color: FB.textSecondary }}>
                    Besoin d'aide ? Contactez-nous, nous pouvons vous accompagner dans la migration.
                  </p>
                  {config.registrationStatus === 'MIGRATION_PENDING' && (
                    <button
                      onClick={() => setShowMigrationModal(true)}
                      style={{
                        marginTop: 8, padding: '8px 16px', borderRadius: 6, border: 'none',
                        background: FB.orange, color: '#fff', fontWeight: 600,
                        fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      <SwapOutlined style={{ marginRight: 6 }} />
                      J'ai ma clé de migration
                    </button>
                  )}
                </div>
              }
            />
          )}

          {/* Alerte migration supprimée ici car déplacée dans le bloc statut au-dessus */}

          {/* EAS Code */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 4 }}>
              Code EAS (Electronic Address Scheme)
            </label>
            <select
              value={config.peppolEas}
              onChange={(e) => setConfig(prev => ({ ...prev, peppolEas: e.target.value }))}
              disabled={isRegistered}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6,
                border: `1px solid ${FB.border}`, fontSize: 14, background: isRegistered ? FB.disabled : FB.white,
              }}
            >
              <option value="0208">0208 — Belgique (n° BCE)</option>
              <option value="0009">0009 — SIRET (France)</option>
              <option value="0190">0190 — Pays-Bas (KvK)</option>
              <option value="9925">9925 — Luxembourg</option>
              <option value="0088">0088 — EAN (International)</option>
            </select>
            <span style={{ fontSize: 11, color: FB.textSecondary }}>
              <InfoCircleOutlined style={{ marginRight: 4 }} />
              Pour la Belgique, utilisez 0208 avec votre numéro d'entreprise BCE
            </span>
          </div>

          {/* Endpoint (BCE number) */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 4 }}>
              Endpoint Peppol (Numéro d'entreprise)
            </label>
            <input
              type="text"
              value={config.peppolEndpoint}
              onChange={(e) => setConfig(prev => ({ ...prev, peppolEndpoint: e.target.value.replace(/\D/g, '') }))}
              placeholder="0123456789"
              disabled={isRegistered}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6,
                border: `1px solid ${FB.border}`, fontSize: 14, background: isRegistered ? FB.disabled : FB.white,
                boxSizing: 'border-box',
              }}
            />
            <span style={{ fontSize: 11, color: FB.textSecondary }}>
              Numéro BCE sans espaces ni points (10 chiffres)
            </span>
          </div>

          {/* Contact Email */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 4 }}>
              Email de contact
            </label>
            <input
              type="email"
              value={config.contactEmail}
              onChange={(e) => setConfig(prev => ({ ...prev, contactEmail: e.target.value }))}
              placeholder="facturation@votreentreprise.be"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6,
                border: `1px solid ${FB.border}`, fontSize: 14, boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Contact Phone */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 4 }}>
              Téléphone (avec code pays)
            </label>
            <input
              type="tel"
              value={config.contactPhone}
              onChange={(e) => setConfig(prev => ({ ...prev, contactPhone: e.target.value }))}
              placeholder="+32 470 123 456"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6,
                border: `1px solid ${FB.border}`, fontSize: 14, boxSizing: 'border-box',
              }}
            />
            <span style={{ fontSize: 11, color: FB.textSecondary }}>
              Un SMS de vérification sera envoyé à ce numéro
            </span>
          </div>

          {/* Migration Key (optional) */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 4 }}>
              Clé de migration <span style={{ fontWeight: 400, color: FB.textSecondary }}>(optionnel)</span>
            </label>
            <input
              type="text"
              value={config.migrationKey || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, migrationKey: e.target.value }))}
              placeholder="Clé fournie par votre ancien Access Point"
              disabled={isRegistered}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6,
                border: `1px solid ${FB.border}`, fontSize: 14, boxSizing: 'border-box',
                background: isRegistered ? FB.disabled : FB.white,
              }}
            />
          </div>
        </div>
      </div>

      {/* Options d'automatisation */}
      <div style={{ background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow, padding: cardPad, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: FB.text }}>
          Options d'automatisation
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.autoSendEnabled}
              onChange={(e) => setConfig(prev => ({ ...prev, autoSendEnabled: e.target.checked }))}
              style={{ width: 18, height: 18 }}
            />
            <div>
              <div style={{ fontWeight: 500, color: FB.text }}>
                <SendOutlined style={{ marginRight: 6 }} />
                Envoi automatique via Peppol
              </div>
              <div style={{ fontSize: 12, color: FB.textSecondary }}>
                Les factures passées en statut "Envoyée" seront automatiquement transmises via Peppol
              </div>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.autoReceiveEnabled}
              onChange={(e) => setConfig(prev => ({ ...prev, autoReceiveEnabled: e.target.checked }))}
              style={{ width: 18, height: 18 }}
            />
            <div>
              <div style={{ fontWeight: 500, color: FB.text }}>
                <InboxOutlined style={{ marginRight: 6 }} />
                Réception automatique
              </div>
              <div style={{ fontSize: 12, color: FB.textSecondary }}>
                Les factures fournisseurs reçues via Peppol apparaîtront automatiquement dans votre boîte de réception
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: isMobile ? '12px 20px' : '10px 20px', borderRadius: 6, border: 'none',
            background: FB.blue, color: '#fff', fontWeight: 600,
            fontSize: 14, cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <LoadingOutlined /> : <SaveOutlined />}
          Sauvegarder
        </button>

        {!isRegistered && config.registrationStatus !== 'PENDING' && config.registrationStatus !== 'VERIFICATION_NEEDED' && (
          <button
            onClick={handleRegister}
            disabled={registering || !serviceHealthy}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: isMobile ? '12px 20px' : '10px 20px', borderRadius: 6, border: 'none',
              background: FB.green, color: '#fff', fontWeight: 600,
              fontSize: 14, cursor: registering ? 'wait' : 'pointer',
              opacity: (registering || !serviceHealthy) ? 0.7 : 1,
            }}
          >
            {registering ? <LoadingOutlined /> : <SafetyCertificateOutlined />}
            S'enregistrer sur Peppol
          </button>
        )}

        {(isRegistered || config.registrationStatus === 'PENDING' || config.registrationStatus === 'VERIFICATION_NEEDED') && (
          <button
            onClick={() => setShowDeregisterModal(true)}
            disabled={deregistering}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: isMobile ? '12px 20px' : '10px 20px', borderRadius: 6,
              border: `1px solid ${FB.danger}`,
              background: FB.white, color: FB.danger, fontWeight: 600,
              fontSize: 14, cursor: deregistering ? 'wait' : 'pointer',
              opacity: deregistering ? 0.7 : 1,
            }}
          >
            {deregistering ? <LoadingOutlined /> : <StopOutlined />}
            Se désinscrire de Peppol
          </button>
        )}
      </div>

      {/* Info box */}
      <div style={{
        marginTop: isMobile ? 16 : 24, padding: isMobile ? 12 : 16, borderRadius: FB.radius,
        background: FB.infoBg, border: `1px solid ${FB.infoBorder}`,
      }}>
        <div style={{ fontSize: 13, color: FB.infoTitle }}>
          <InfoCircleOutlined style={{ marginRight: 8 }} />
          <strong>À propos de Peppol</strong>
        </div>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 12, color: FB.infoText, lineHeight: 1.8 }}>
          <li>La facturation électronique B2B via Peppol est <strong>obligatoire en Belgique</strong> depuis le 1er janvier 2026</li>
          <li>L'enregistrement est <strong>gratuit</strong> et utilise le format BIS Billing 3.0</li>
          <li>Votre numéro BCE sert d'identifiant unique sur le réseau Peppol</li>
          <li>Vous pouvez envoyer ET recevoir des factures électroniques au format UBL</li>
        </ul>
      </div>

      {/* Modal de migration Peppol */}
      <Modal
        title={
          <span>
            <SwapOutlined style={{ marginRight: 8 }} />
            Migration Peppol — Clé de transfert
          </span>
        }
        open={showMigrationModal}
        onCancel={() => setShowMigrationModal(false)}
        onOk={handleCompleteMigration}
        confirmLoading={migrating}
        okText="Lancer la migration"
        cancelText={t('common.cancel')}
      >
        <div style={{ marginBottom: 16 }}>
          <p>
            Entrez la <strong>clé de migration</strong> fournie par votre ancien fournisseur Peppol
            (ex: Accountable, Billit, Horus, etc.).
          </p>
          <p style={{ fontSize: 13, color: FB.textSecondary }}>
            Cette clé permet de transférer votre enregistrement Peppol sans interruption de service.
            Une fois le transfert effectué, toutes vos factures arriveront dans Zhiive.
          </p>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 4 }}>
            Clé de migration
          </label>
          <input
            type="text"
            value={migrationKeyInput}
            onChange={(e) => setMigrationKeyInput(e.target.value)}
            placeholder="Collez votre clé de migration ici"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 6,
              border: `1px solid ${FB.border}`, fontSize: 14, boxSizing: 'border-box',
            }}
          />
        </div>
      </Modal>

      {/* Modal de confirmation de désinscription */}
      <Modal
        title={
          <span style={{ color: FB.danger }}>
            <DeleteOutlined style={{ marginRight: 8 }} />
            Désinscription Peppol
          </span>
        }
        open={showDeregisterModal}
        onCancel={() => setShowDeregisterModal(false)}
        onOk={handleDeregister}
        confirmLoading={deregistering}
        okText="Confirmer la désinscription"
        okButtonProps={{ danger: true }}
        cancelText={t('common.cancel')}
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Attention : action irréversible"
          description="La désinscription supprime votre enregistrement du réseau Peppol. Vous ne pourrez plus envoyer ni recevoir de factures électroniques via Peppol."
        />
        <div>
          <p style={{ fontWeight: 500 }}>En vous désinscrivant :</p>
          <ul style={{ paddingLeft: 20, fontSize: 13 }}>
            <li>Vos fournisseurs ne pourront plus vous envoyer de factures Peppol</li>
            <li>Vos clients ne pourront plus recevoir vos factures via Peppol</li>
            <li>Votre identifiant <strong>{config.peppolEas}:{config.peppolEndpoint}</strong> sera libéré</li>
            <li>Vous pourrez vous réinscrire ultérieurement si nécessaire</li>
          </ul>
          <p style={{ fontSize: 13, color: FB.textSecondary, marginTop: 12 }}>
            Les factures déjà envoyées ou reçues ne seront pas affectées.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default PeppolSettings;
