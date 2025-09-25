import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App, Card, Typography, Row, Col, Tag, List, Space, Button, Alert, Input, Tooltip } from 'antd';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { GoogleOutlined, ThunderboltOutlined, AndroidOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface GoogleStatus {
  enabled: boolean;
  gmail: boolean;
  calendar: boolean;
  drive: boolean;
  meet: boolean;
  sheets: boolean;
  voice: boolean;
  lastSync: string | null;
}

interface TelnyxConn {
  id: string;
  name: string | null;
  status: string | null;
  type: string | null;
}

interface TelnyxStatus {
  connections: TelnyxConn[];
  active: boolean;
}

interface AdPlatform {
  id: string;
  platform: string;
  name?: string;
  status: string;
  lastSync?: string | null;
}

interface IntegrationsPayload {
  google: GoogleStatus;
  telnyx: TelnyxStatus;
  adPlatforms: AdPlatform[];
}

// Types spécifiques Google Ads (retour de /advertising/:platform/accounts)
interface AdsCredentials {
  tokens?: unknown;
  userId?: string;
  authCode?: string;
  error?: string;
  userError?: string; // ex: "Client OAuth non autorisé pour Google Ads API"
}

interface AdsIntegration {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  credentials?: AdsCredentials | null;
  config?: { selectedAccount?: { id?: string; name?: string; currency?: string } } | null;
}

interface EnvValue {
  defined?: boolean;
  sanitized?: boolean;
  looksQuoted?: boolean;
  length?: number;
  masked?: string | null;
  fingerprint?: string | null;
}

interface EnvIdInfo {
  raw?: string | null;
  normalized?: string | null;
  formatted?: string | null;
}

interface EnvCheckDetails {
  backend?: {
    backendUrlDefined?: boolean;
  };
  google?: {
    clientId?: EnvValue;
    clientSecret?: EnvValue;
    developerToken?: EnvValue;
    managerCustomerId?: EnvIdInfo;
    loginCustomerId?: EnvIdInfo;
    apiVersion?: { value?: string; defaultApplied?: boolean };
    redirectUri?: { value?: string; sanitized?: boolean; warning?: string | null };
  };
  meta?: {
    appId?: EnvValue;
    appSecret?: EnvValue;
    redirectUri?: { value?: string; sanitized?: boolean; warning?: string | null };
  };
}

interface EnvCheckResponse {
  success: boolean;
  vars: Record<string, boolean>;
  missing: string[];
  ready: boolean;
  warnings: string[];
  details?: EnvCheckDetails;
}

function Devis1minuteAdminIntegrationsContent() {
  const { message } = App.useApp();
  // Stabiliser l'instance API pour éviter les boucles d'effets
  const apiHook = useAuthenticatedApi();
  // Stabilisation volontaire sans dépendances pour éviter les re-créations
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const api = useMemo(() => apiHook.api, []);
  
  const [data, setData] = useState<IntegrationsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [adsWarning, setAdsWarning] = useState<string | null>(null);
  const [adsDiag, setAdsDiag] = useState<
    | null
    | {
        humanHint?: string;
        devTokenFingerprint?: string | null;
        devTokenLength?: number;
        clientIdMasked?: string | null;
        apiVersion?: string;
        redirectUri?: string;
        loginCustomerIdSelected?: string;
        loginCustomerHeaderSent?: boolean;
      }
  >(null);
  const [googleAdsIntegration, setGoogleAdsIntegration] = useState<AdsIntegration | null>(null);
  const [adsConnectionState, setAdsConnectionState] = useState<'unknown' | 'connected' | 'disconnected' | 'error'>('unknown');
  const [oauthInProgress, setOauthInProgress] = useState<null | { platform: string }>(null);
  const [adsAccountId, setAdsAccountId] = useState<string>('');
  const [envCheck, setEnvCheck] = useState<EnvCheckResponse | null>(null);
  // Refs pour contrôler le polling et l'état en dehors des closures
  const pollIdRef = useRef<number | null>(null);
  const nextAllowedAtRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);
  const oauthInProgressRef = useRef<null | { platform: string }>(null);
  useEffect(() => { oauthInProgressRef.current = oauthInProgress; }, [oauthInProgress]);

  // Debounce simple pour éviter les rafales de requêtes rapprochées
  const lastFetchRef = useRef<number>(0);
  const fetchGoogleAdsIntegration = useCallback(async () => {
    if (inFlightRef.current) return;
    const now = Date.now();
    // Limiter à ~1.5s max, coalescer les demandes proches
    if (now < nextAllowedAtRef.current) return;
    nextAllowedAtRef.current = now + 1500;
    lastFetchRef.current = now;
    try {
      inFlightRef.current = true;
      const response = await api.get('/api/integrations/advertising/google_ads/accounts');
      type AccountsPayload = {
        integration?: AdsIntegration | null;
        warnings?: string[];
        disabledReason?: 'missing_developer_token' | 'missing_access_token' | 'ads_api_error';
        apiErrorSummary?: string;
        diagnostics?: {
          humanHint?: string;
          devTokenFingerprint?: string | null;
          devTokenLength?: number;
          clientIdMasked?: string | null;
          apiVersion?: string;
          redirectUri?: string;
          loginCustomerIdSelected?: string;
          loginCustomerHeaderSent?: boolean;
        }
        connectionState?: 'unknown' | 'connected' | 'disconnected' | 'error';
      };
      const payload = response?.data as AccountsPayload;
      if (payload?.integration) {
        setGoogleAdsIntegration(payload.integration as AdsIntegration);
        const cfg = (payload.integration as AdsIntegration).config;
        const prefill = cfg?.selectedAccount?.id;
        if (prefill && typeof prefill === 'string') {
          setAdsAccountId(prefill);
        }
      } else {
        setGoogleAdsIntegration(null);
        setAdsAccountId('');
      }
      const inferredState: 'unknown' | 'connected' | 'disconnected' | 'error' = payload?.connectionState
        ?? (payload?.integration ? 'connected' : 'disconnected');
      setAdsConnectionState(inferredState);
      // Stocker diagnostics utiles si fournis
      setAdsDiag(payload?.diagnostics || null);
      // Afficher des avertissements utiles (sans interrompre l'UI)
      if (payload?.disabledReason === 'missing_developer_token') {
        setAdsWarning('Google Ads: Developer Token manquant côté serveur.');
      } else if (payload?.disabledReason === 'missing_access_token') {
        setAdsWarning("Google Ads: access token indisponible — refaites l'authentification OAuth.");
      } else if (payload?.disabledReason === 'ads_api_error') {
        const s = payload?.apiErrorSummary || 'Erreur Google Ads API';
        setAdsWarning(`Google Ads API: ${s}`);
      } else if (Array.isArray(payload?.warnings) && payload.warnings.length) {
        setAdsWarning(String(payload.warnings[0]));
      } else {
        // pas d'avertissement
        setAdsWarning(null);
      }
    } catch {
      console.log('Pas d\'intégration Google Ads existante');
      setGoogleAdsIntegration(null);
      setAdsDiag(null);
      setAdsConnectionState('disconnected');
    } finally {
      inFlightRef.current = false;
    }
  }, [api]);

  // Charger les intégrations existantes via `load()` (évite le double chargement)

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statusPromise = api.get<{ success: boolean; data: IntegrationsPayload }>("/api/integrations/status");
      const envPromise = api.get<EnvCheckResponse>("/api/integrations/advertising/env-check");
      const fetchPromise = fetchGoogleAdsIntegration();
      const [statusPayload, envPayload] = await Promise.all([statusPromise, envPromise]);
      setData(statusPayload?.data || null);
      setEnvCheck(envPayload || null);
      await fetchPromise;
    } catch (e) {
      console.error(e);
      message.error("Impossible de charger l'état des intégrations");
      setEnvCheck(null);
    } finally {
      setLoading(false);
    }
  }, [api, message, fetchGoogleAdsIntegration]);

  useEffect(() => {
    load();
  }, [load]);

  const normalizedAdsState = adsConnectionState === 'unknown' && googleAdsIntegration
    ? 'connected'
    : adsConnectionState;
  const isAdsConnected = normalizedAdsState === 'connected';
  const isAdsError = normalizedAdsState === 'error';
  const hasAdsIntegration = !!googleAdsIntegration;
  const envReady = envCheck?.ready ?? false;
  const envMissing = envCheck?.missing ?? [];
  const envWarnings = envCheck?.warnings ?? [];
  const googleEnv = envCheck?.details?.google;
  const metaEnv = envCheck?.details?.meta;
  const combinedEnvWarnings = (() => {
    const list = [...envWarnings];
    const gWarn = googleEnv?.redirectUri?.warning;
    const mWarn = metaEnv?.redirectUri?.warning;
    if (gWarn && !list.includes(gWarn)) list.push(gWarn);
    if (mWarn && !list.includes(mWarn)) list.push(mWarn);
    return list;
  })();
  const envPalette = envReady
    ? { bg: '#f6ffed', border: '#b7eb8f', heading: '#389e0d', text: '#389e0d' }
    : { bg: '#fff1f0', border: '#ffa39e', heading: '#cf1322', text: '#cf1322' };

  const oauthConnect = useCallback(async (platform: string) => {
    try {
      const resp = await api.get<{
        success: boolean;
        platform: string;
        authUrl: string;
      }>(`/api/integrations/advertising/oauth/${platform}/url`);
      
      const r = resp as unknown as {
        authUrl?: string;
        data?: { authUrl?: string };
      };
      
      const authUrl = r?.authUrl ?? r?.data?.authUrl;
      
      if (!authUrl) {
        const msg = 'URL OAuth indisponible';
        setAdsWarning(msg);
        message.error(msg);
        return;
      }
      
      const w = window.open(authUrl, 'ads_oauth', 'width=560,height=720');
      setOauthInProgress({ platform });
      // Éviter des pollers multiples
      if (pollIdRef.current) {
        try { window.clearInterval(pollIdRef.current); } catch { /* noop */ }
        pollIdRef.current = null;
      }
      // Polling modéré pendant quelques secondes (singleton)
      let tries = 0;
      pollIdRef.current = window.setInterval(() => {
        tries += 1;
        fetchGoogleAdsIntegration();
        // Arrêt automatique après ~15s
        if (tries > 10 && pollIdRef.current) {
          window.clearInterval(pollIdRef.current);
          pollIdRef.current = null;
        }
      }, 1500);
      
      const onMsg = (ev: MessageEvent) => {
        const d = ev?.data as unknown;
        const payload = (d && typeof d === 'object') ? (d as {
          type?: string;
          platform?: string;
        }) : undefined;
        const isDone = !!payload && (
          payload.type === 'ads_oauth_done' ||
          payload.type === 'oauth_done' ||
          payload.type === 'google_ads_oauth_done'
        );
        if (isDone && (!payload?.platform || payload.platform === platform)) {
          window.removeEventListener('message', onMsg);
          try {
            if (w && typeof w.close === 'function') {
              w.close();
            }
          } catch {
            // ignore
          }
          // Arrêter le polling dès que le callback signale la fin
          if (pollIdRef.current) {
            try { window.clearInterval(pollIdRef.current); } catch { /* noop */ }
            pollIdRef.current = null;
          }
          setOauthInProgress(null);
          message.success(`OAuth ${platform} terminé`);
          // Rafraîchir immédiatement les deux sources de vérité
          load();
          fetchGoogleAdsIntegration();
        }
      };
      
      window.addEventListener('message', onMsg);

      // Fallback: quand l'utilisateur revient sur l'onglet principal, recharger
      const onFocus = () => {
        const inProg = oauthInProgressRef.current;
        if (inProg && inProg.platform === platform) {
          fetchGoogleAdsIntegration();
          load();
        }
      };
      window.addEventListener('focus', onFocus);
      // Nettoyage listeners au bout de 30s
      setTimeout(() => {
        window.removeEventListener('message', onMsg);
        window.removeEventListener('focus', onFocus);
        // Arrêt de sécurité du polling si toujours actif
        if (pollIdRef.current) {
          try { window.clearInterval(pollIdRef.current); } catch { /* noop */ }
          pollIdRef.current = null;
        }
        setOauthInProgress(null);
      }, 30000);
    } catch (e) {
      console.error(e);
      const detail = (e && typeof e === 'object') ?
        ((e as { message?: string; data?: { message?: string } }).data?.message ||
         (e as { message?: string }).message) : undefined;
      const msg = detail || "Échec de l'init OAuth";
      setAdsWarning(msg);
      message.error(msg);
    }
  }, [api, load, message, fetchGoogleAdsIntegration]);

  return (
    <div className="p-6">
      <Typography>
        <Title level={3}>Intégrations & Connecteurs</Title>
        <Paragraph type="secondary">
          État de connexion et dernières synchronisations.
        </Paragraph>
      </Typography>
      
      <div className="mb-3">
        <Button icon={<ReloadOutlined />} loading={loading} onClick={load}>
          Rafraîchir
        </Button>
      </div>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} lg={8}>
          <Card title={<Space><GoogleOutlined /> Google Workspace</Space>}>
            <Space direction="vertical">
              <div>
                Statut: <Tag color={data?.google?.enabled ? 'green' : 'default'}>
                  {data?.google?.enabled ? 'Connecté' : 'Déconnecté'}
                </Tag>
              </div>
              <div>
                Services: {['gmail','calendar','drive','meet','sheets','voice'].map(k => (
                  <Tag key={k} color={data?.google?.[k as keyof GoogleStatus] ? 'blue' : 'default'}>
                    {k}
                  </Tag>
                ))}
              </div>
              <div>
                Dernière sync: {data?.google?.lastSync ?
                  new Date(data.google.lastSync).toLocaleString() : ''}
              </div>
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} md={12} lg={8}>
          <Card title={<Space><ThunderboltOutlined /> Telnyx</Space>}>
            <div>
              Actif: <Tag color={data?.telnyx?.active ? 'green' : 'default'}>
                {data?.telnyx?.active ? 'Oui' : 'Non'}
              </Tag>
            </div>
            <List
              size="small"
              dataSource={data?.telnyx?.connections || []}
              renderItem={(c: TelnyxConn) => (
                <List.Item>
                  <Space>
                    <Tag>{c.type}</Tag>
                    <span>{c.name}</span>
                    <Tag color={c.status === 'active' ? 'green' : 'default'}>
                      {c.status}
                    </Tag>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        
        <Col xs={24} md={24} lg={8}>
          <Card title={<Space><AndroidOutlined /> Plateformes Ads</Space>}>
            <Alert
              type={isAdsConnected ? 'success' : 'warning'}
              showIcon
              message={isAdsConnected ? "✅ Intégration Google Ads configurée" : "⚠️ Configuration Google Ads requise"}
              description={
                <div>
                  {googleAdsIntegration?.name?.includes('OAuth error') && (
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: '#fff7e6', border: '1px solid #ffd591', borderRadius: '4px' }}>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#d48806' }}>
                        🔧 Action requise dans Google Cloud Console :
                      </p>
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#d48806' }}>
                        1. Allez sur <strong>console.cloud.google.com</strong><br/>
                        2. <strong>APIs & Services</strong> → <strong>Library</strong><br/>
                        3. Cherchez "<strong>Google Ads API</strong>" et <strong>activez-la</strong><br/>
                        4. Réessayez la connexion OAuth
                      </p>
                    </div>
            )}
            {envCheck ? (
              <div style={{ marginBottom: 12, padding: '12px', backgroundColor: envPalette.bg, border: `1px solid ${envPalette.border}`, borderRadius: '4px' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: envPalette.heading }}>
                  {envReady ? 'Configuration Google Ads détectée' : 'Variables Google Ads à compléter'}
                </p>
                <div style={{ margin: '4px 0 0 0', fontSize: '12px', color: envPalette.text }}>
                  <div>
                    OAuth Client: {googleEnv?.clientId?.defined ? `OK${googleEnv?.clientId?.masked ? ` (${googleEnv.clientId.masked})` : ''}` : 'Manquant'}
                  </div>
                  <div>
                    Developer token: {googleEnv?.developerToken?.defined ? `OK • empreinte ${googleEnv?.developerToken?.fingerprint ?? 'n/a'}` : 'Manquant'}
                  </div>
                  <div>
                    Redirect URI: {googleEnv?.redirectUri?.value || adsDiag?.redirectUri || 'non défini'}
                    {googleEnv?.redirectUri?.sanitized ? ' (nettoyé)' : ''}
                  </div>
                  <div>
                    Version API: {googleEnv?.apiVersion?.value || adsDiag?.apiVersion || 'v18'}
                    {googleEnv?.apiVersion?.defaultApplied ? ' (valeur par défaut)' : ''}
                  </div>
                  <div>
                    Login customer ID: {googleEnv?.loginCustomerId?.formatted || googleEnv?.loginCustomerId?.normalized || adsDiag?.loginCustomerIdSelected || 'non défini'}
                  </div>
                  {googleEnv?.managerCustomerId?.formatted && (
                    <div>Manager customer ID: {googleEnv.managerCustomerId.formatted}</div>
                  )}
                  {metaEnv && (
                    <div style={{ marginTop: 6 }}>
                      <strong>Meta Ads :</strong> App ID {metaEnv.appId?.defined ? metaEnv.appId?.masked || 'OK' : 'manquante'} • Secret {metaEnv.appSecret?.defined ? `empreinte ${metaEnv.appSecret?.fingerprint ?? 'n/a'}` : 'manquant'} • Redirect {metaEnv.redirectUri?.value || 'non défini'}
                    </div>
                  )}
                </div>
                {envMissing.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: '12px', color: envPalette.heading }}>
                    Variables manquantes: {envMissing.join(', ')}
                  </div>
                )}
                {combinedEnvWarnings.length > 0 && (
                  <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 18, fontSize: '12px', color: envPalette.text }}>
                    {combinedEnvWarnings.map((w, idx) => (
                      <li key={`${w}-${idx}`}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: 12, padding: '12px', backgroundColor: '#fafafa', border: '1px solid #d9d9d9', borderRadius: '4px', color: '#595959', fontSize: '12px' }}>
                Analyse des variables d'environnement…
              </div>
            )}

                  {/* Statut de la connexion OAuth */}
                  {isAdsConnected ? (
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px' }}>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#389e0d' }}>
                        ✅ CONNECTÉ via OAuth
                      </p>
                      {hasAdsIntegration ? (
                        <>
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#389e0d' }}>
                            Dernière connexion : {googleAdsIntegration?.updatedAt ? new Date(googleAdsIntegration.updatedAt).toLocaleString('fr-FR') : '—'}
                          </p>
                          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666' }}>
                            Statut : {googleAdsIntegration?.status ?? '—'}{googleAdsIntegration?.name ? ` • Nom : ${googleAdsIntegration.name}` : ''}
                          </p>
                        </>
                      ) : (
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#389e0d' }}>
                          Connexion validée — en attente de la première synchronisation.
                        </p>
                      )}
                    </div>
                  ) : isAdsError && hasAdsIntegration ? (
                      <div style={{ marginBottom: 12, padding: '12px', backgroundColor: '#fff7e6', border: '1px solid #ffd591', borderRadius: '4px' }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#d48806' }}>
                          🔶 Non connecté — {googleAdsIntegration.credentials?.userError || googleAdsIntegration.name}
                        </p>
                        <p style={{ margin: '4px 0', fontSize: '12px', color: '#d48806' }}>
                          Corrigez la configuration dans Google Cloud Console puis réessayez.
                        </p>
                      </div>
                  ) : null}
                  {/* Actions de gestion */}
                  <Space wrap style={{ marginTop: 12 }}>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => window.open('https://ads.google.com/', '_blank')}
                    >
                       Interface Google Ads
                    </Button>
                    <Button
                      size="small"
                      onClick={() => window.open('https://developers.google.com/google-ads/api/docs/first-call/overview', '_blank')}
                    >
                       Documentation API
                    </Button>
                    {googleAdsIntegration && (
                      <Button
                        size="small"
                        danger
                        onClick={async () => {
                          try {
                            await api.delete('/api/integrations/advertising/google_ads');
                            setGoogleAdsIntegration(null);
                            setAdsConnectionState('disconnected');
                            message.success('Connexion Google Ads supprimée');
                          } catch {
                            message.error('Erreur lors de la déconnexion');
                          }
                        }}
                      >
                        🔌 Déconnecter
                      </Button>
                    )}
                  </Space>
                </div>
              }
              style={{ marginBottom: 16 }}
            />
            
            <Space direction="vertical" style={{ width: '100%' }}>
              {adsWarning && (
                <Alert
                  type="warning"
                  showIcon
                  closable
                  onClose={() => setAdsWarning(null)}
                  message={adsWarning}
                />
              )}
              {adsDiag?.humanHint && (
                <Alert
                  type="info"
                  showIcon
                  message="Aide Google Ads"
                  description={
                    <div style={{ fontSize: 12 }}>
                      <div>{adsDiag.humanHint}</div>
                      <div style={{ opacity: 0.75, marginTop: 6 }}>
                        Dev token (empreinte): {adsDiag.devTokenFingerprint ?? 'n/a'} • longueur: {adsDiag.devTokenLength ?? 0}
                        {adsDiag.clientIdMasked ? <> • OAuth client: {adsDiag.clientIdMasked}</> : null}
                        {adsDiag.apiVersion ? <> • API: {adsDiag.apiVersion}</> : null}
                        {adsDiag.loginCustomerIdSelected ? <> • login-customer-id sélectionné: {adsDiag.loginCustomerIdSelected}</> : null}
                        {typeof adsDiag.loginCustomerHeaderSent === 'boolean' ? <> • header envoyé: {adsDiag.loginCustomerHeaderSent ? 'oui' : 'non'}</> : null}
                      </div>
                    </div>
                  }
                />
              )}
              
              <List
                size="small"
                dataSource={data?.adPlatforms || []}
                renderItem={(p: AdPlatform) => (
                  <List.Item>
                    <Space>
                      <Tag>{p.platform}</Tag>
                      {p.name && <strong>{p.name}</strong>}
                      <Tag color={p.status === 'connected' ? 'green' : 'default'}>
                        {p.status}
                      </Tag>
                      <span>
                        Dernière sync: {p.lastSync ?
                          new Date(p.lastSync).toLocaleString() : ''}
                      </span>
                    </Space>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => oauthConnect(p.platform)}
                      >
                        Se connecter via OAuth
                      </Button>
                      {p.platform === 'google_ads' && (
                        <Space size={6} wrap>
                          <Tooltip title="ID client Google Ads (10 chiffres, tirets acceptés)">
                            <Input
                              size="small"
                              placeholder="ID client (ex: 123-456-7890)"
                              value={adsAccountId}
                              onChange={(e) => setAdsAccountId(e.target.value)}
                              style={{ width: 200 }}
                            />
                          </Tooltip>
                          <Button
                            size="small"
                            onClick={async () => {
                              const normalized = (adsAccountId || '').replace(/[^0-9]/g, '');
                              if (!normalized || normalized.length !== 10) {
                                message.warning('ID client invalide: entrez 10 chiffres (les tirets sont facultatifs)');
                                return;
                              }
                              try {
                                await api.post('/api/integrations/advertising/google_ads/select-account', {
                                  account: { id: adsAccountId }
                                });
                                message.success('Compte Google Ads enregistré');
                                fetchGoogleAdsIntegration();
                              } catch (err) {
                                console.error(err);
                                message.error('Impossible d\'enregistrer le compte');
                              }
                            }}
                          >
                            Enregistrer le compte
                          </Button>
                        </Space>
                      )}
                    </div>
                  </List.Item>
                )}
              />
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default function Devis1minuteAdminIntegrations() {
  return (
    <App>
      <Devis1minuteAdminIntegrationsContent />
    </App>
  );
}
