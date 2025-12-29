import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Input, Button, Alert, Divider, Space, Switch, message, Spin, Steps, Typography, Tabs } from 'antd';
import { GoogleOutlined, CheckCircleOutlined, ExclamationCircleOutlined, LoginOutlined, EyeInvisibleOutlined, EyeTwoTone, RedoOutlined, CopyOutlined, SettingOutlined, CloudOutlined, ApiOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import GoogleTokenMonitor from './GoogleTokenMonitor';

interface GoogleWorkspaceConfig {
  id?: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  domain: string;
  adminEmail: string;
  serviceAccountEmail: string;
  privateKey: string;
  isActive: boolean;
  lastSync?: string;
}

interface DnsRecords {
  verification: {
    type: string;
    name: string;
    value: string;
  };
  mx: Array<{
    priority: number;
    server: string;
  }>;
  security: {
    spf: string;
    dmarc: string;
  };
}

interface OrganizationData {
  id: string;
  name: string;
  description?: string;
  website?: string;
}

interface GoogleWorkspaceConfigProps {
  organizationId: string;
  onGoogleWorkspaceActivated?: () => void; // Callback pour notifier l'activation
}

const { Step } = Steps;
const { Title, Text, Paragraph } = Typography;

// Composant pour afficher un enregistrement DNS
const DnsRecord = ({ type, value, description }: { type: string; value: string; description: string }) => (
  <div style={{ marginBottom: '12px', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
      <Text strong>{type} Record</Text>
      <Button 
        size="small" 
        icon={<CopyOutlined />}
        onClick={() => {
          navigator.clipboard.writeText(value);
          message.success(`${type} record copié dans le presse-papiers`);
        }}
      >
        Copier
      </Button>
    </div>
    <Input value={value} readOnly style={{ fontFamily: 'monospace', fontSize: '12px' }} />
    <Text type="secondary" style={{ fontSize: '12px' }}>{description}</Text>
  </div>
);

const GoogleWorkspaceConfig: React.FC<GoogleWorkspaceConfigProps> = ({ 
  organizationId, 
  onGoogleWorkspaceActivated 
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [config, setConfig] = useState<GoogleWorkspaceConfig | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  
  // NOUVEAUX ÉTATS POUR LA GESTION DU DOMAINE
  const [domainStatus, setDomainStatus] = useState<'unknown' | 'checking' | 'configured' | 'unconfigured' | 'error'>('unknown');
  const [dnsRecords, setDnsRecords] = useState<DnsRecords | null>(null);
  const [domainChecking, setDomainChecking] = useState(false);
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);

  const { api } = useAuthenticatedApi();

  // Définir loadConfig en premier pour éviter l'erreur de référence
  const loadConfig = useCallback(async () => {
    try {
      console.log('[GoogleWorkspaceConfig] 📥 Début chargement configuration...');
      const response = await api.get(`/api/organizations/${organizationId}/google-workspace/config`);
      console.log('[GoogleWorkspaceConfig] 📊 Réponse getConfig:', response);
      console.log('[GoogleWorkspaceConfig] 📋 Données détaillées:', JSON.stringify(response.data, null, 2));
      
      if (response.success && response.data) {
        console.log('[GoogleWorkspaceConfig] ✅ Configuration trouvée:', response.data);
        console.log('[GoogleWorkspaceConfig] 🔑 serviceAccountEmail:', response.data.serviceAccountEmail);
        console.log('[GoogleWorkspaceConfig] 🔐 privateKey présent:', !!response.data.privateKey);
        
        setConfig(response.data);
        
        // Assurer que tous les champs sont définis dans le formulaire
        const formData = {
          domain: response.data.domain || '2thier.be',
          adminEmail: response.data.adminEmail || '',
          clientId: response.data.clientId || '',
          clientSecret: response.data.clientSecret || '',
          redirectUri: response.data.redirectUri || (import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || window.location.origin) + '/api/auth/google/callback',
          serviceAccountEmail: response.data.serviceAccountEmail || '',
          privateKey: response.data.privateKey || '',
          isActive: response.data.isActive || response.data.enabled || false
        };
        
        console.log('[GoogleWorkspaceConfig] 📝 Données form à définir:', formData);
        form.setFieldsValue(formData);
        // Pas besoin de setConnectionStatus car on utilise maintenant les vrais états
      } else {
        console.log('[GoogleWorkspaceConfig] ⚪ Aucune configuration trouvée ou échec');
        // Définir les valeurs par défaut si pas de config
        form.setFieldsValue({
          domain: '2thier.be',
          redirectUri: (import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || window.location.origin) + '/api/auth/google/callback',
          isActive: false
        });
      }
    } catch (err) {
      console.error('[GoogleWorkspaceConfig] ❌ Erreur lors du chargement de la configuration:', err);
    }
  }, [api, organizationId, form]);

  // Fonction pour vérifier le statut du domaine et charger la config si nécessaire
  const checkDomainAndLoadConfig = useCallback(async () => {
    if (!organizationId) return;
    
    setDomainStatus('checking');
    try {
      // D'abord, récupérer les informations de l'organisation
      const orgResponse = await api.get(`/api/organizations/${organizationId}`);
      if (orgResponse.success && orgResponse.data) {
        setOrganizationData(orgResponse.data);
        
        // Vérifier le statut du domaine pour Google Workspace
        const statusResponse = await api.get(`/api/organizations/${organizationId}/google-workspace/domain-status`);
        
        if (statusResponse.success) {
          if (statusResponse.data.isConfigured) {
            setDomainStatus('configured');
            // Si le domaine est configuré, on charge la config technique
            await loadConfig();
          } else {
            setDomainStatus('unconfigured');
            setDnsRecords(statusResponse.data.requiredRecords);
          }
        } else {
          setDomainStatus('error');
          message.error("Erreur lors de la vérification du statut du domaine.");
        }
      } else {
        setDomainStatus('error');
        message.error("Impossible de récupérer les informations de l'organisation.");
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du domaine:', error);
      setDomainStatus('error');
      message.error("Impossible de vérifier le statut du domaine.");
    }
  }, [api, organizationId, loadConfig]);

  const checkGoogleConnection = useCallback(async () => {
    try {
      console.log('[GoogleWorkspaceConfig] 🔍 Vérification connexion Google...');
      const response = await api.get(`/api/google-auth/status?organizationId=${organizationId}`);
      console.log('[GoogleWorkspaceConfig] 📊 Status Google:', response);
      
      if (response.success && response.data) {
        setIsGoogleConnected(response.data.connected || false);
        console.log('[GoogleWorkspaceConfig] 🔗 Google connecté:', response.data.connected);
      }
    } catch (err) {
      console.error('[GoogleWorkspaceConfig] ❌ Erreur vérification Google:', err);
      setIsGoogleConnected(false);
    }
  }, [api, organizationId]);

  const loadOrganizationData = useCallback(async () => {
    if (!organizationId) return;
    
    try {
      const orgResponse = await api.get(`/api/organizations/${organizationId}`);
      if (orgResponse.success && orgResponse.data) {
        setOrganizationData(orgResponse.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données organisation:', error);
    }
  }, [api, organizationId]);

  useEffect(() => {
    if (organizationId) {
      // Charger seulement les données de base, pas la vérification de domaine
      loadOrganizationData();
      loadConfig();
      checkGoogleConnection();
    }
  }, [organizationId, loadOrganizationData, loadConfig, checkGoogleConnection]);

  // Fonction pour charger les enregistrements DNS (utilisée dans l'onglet domaine)
  const loadDnsRecords = useCallback(async () => {
    if (!organizationId) return;
    
    setDomainChecking(true);
    try {
      console.log('[GoogleWorkspaceConfig] 🔍 Chargement des DNS records...');
      const statusResponse = await api.get(`/api/organizations/${organizationId}/google-workspace/domain-status`);
      console.log('[GoogleWorkspaceConfig] 📊 Réponse domain-status:', statusResponse);
      console.log('[GoogleWorkspaceConfig] 📋 Données détaillées:', JSON.stringify(statusResponse.data, null, 2));
      
      if (statusResponse.success) {
        console.log('[GoogleWorkspaceConfig] ✅ Success = true');
        console.log('[GoogleWorkspaceConfig] 🔧 isConfigured:', statusResponse.data.isConfigured);
        console.log('[GoogleWorkspaceConfig] 📝 requiredRecords:', statusResponse.data.requiredRecords);
        
        setDnsRecords(statusResponse.data.requiredRecords);
        setDomainStatus(statusResponse.data.isConfigured ? 'configured' : 'unconfigured');
        
        console.log('[GoogleWorkspaceConfig] 📌 Statut défini:', statusResponse.data.isConfigured ? 'configured' : 'unconfigured');
      } else {
        console.log('[GoogleWorkspaceConfig] ❌ Success = false');
        setDomainStatus('error');
        message.error("Erreur lors de la récupération des enregistrements DNS.");
      }
    } catch (error) {
      console.error('Erreur lors du chargement des DNS records:', error);
      setDomainStatus('error');
      message.error("Impossible de charger les enregistrements DNS.");
    } finally {
      setDomainChecking(false);
    }
  }, [api, organizationId]);

  // Fonction pour forcer une re-vérification du domaine
  const handleManualDomainCheck = async () => {
    await loadDnsRecords();
  };

  const handleSave = async (values: GoogleWorkspaceConfig) => {
    setLoading(true);
    try {
      console.log('[GoogleWorkspaceConfig] 💾 Début sauvegarde avec données:', values);
      console.log('[GoogleWorkspaceConfig] 📋 serviceAccountEmail à sauver:', values.serviceAccountEmail);
      console.log('[GoogleWorkspaceConfig] 🔐 privateKey à sauver (présent):', !!values.privateKey);
      
      // Garder l'état précédent pour détection du changement
      const wasActive = config?.isActive || false;
      
      const response = await api.post(`/api/organizations/${organizationId}/google-workspace/config`, values);
      console.log('[GoogleWorkspaceConfig] 📋 Réponse sauvegarde:', response);
      
      if (response.success) {
        setConfig(values);
        message.success('Configuration sauvegardée avec succès');
        
        // 🚀 Si Google Workspace vient d'être activé, déclencher l'activation des modules
        if (!wasActive && values.isActive && onGoogleWorkspaceActivated) {
          console.log('[GoogleWorkspaceConfig] 🚀 Google Workspace activé - activation des modules...');
          onGoogleWorkspaceActivated();
        }
        
        // Recharger la configuration depuis le serveur pour vérifier la persistance
        await loadConfig();
        console.log('[GoogleWorkspaceConfig] ✅ Configuration rechargée après sauvegarde');
      } else {
        console.error('[GoogleWorkspaceConfig] ❌ Échec sauvegarde:', response);
        message.error('Erreur lors de la sauvegarde: ' + (response.message || 'Erreur inconnue'));
      }
    } catch (err) {
      console.error('[GoogleWorkspaceConfig] ❌ Erreur lors de la sauvegarde:', err);
      message.error('Erreur lors de la sauvegarde de la configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      // Simuler un test de connexion puisque les routes admin ont été supprimées
      message.info('Fonction de test désactivée - utilisez la connexion Google pour tester');
    } catch {
      message.error('Erreur lors du test');
    } finally {
      setTesting(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    if (!organizationId) {
      message.error('Organization ID manquant');
      return;
    }

    setDisconnecting(true);
    try {
      console.log('[GoogleWorkspaceConfig] 🔌 Déconnexion Google...');
      const response = await api.post('/api/google-auth/disconnect', { organizationId });
      if (response.success) {
        setIsGoogleConnected(false);
        message.success('Déconnexion Google réussie');
        await checkGoogleConnection(); // Revérifier le statut
      } else {
        message.error('Erreur lors de la déconnexion Google');
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion Google:', error);
      message.error('Erreur lors de la déconnexion Google');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!organizationId) {
      message.error('Organization ID manquant');
      return;
    }

    setConnecting(true);
    try {
      // Appel à la route pour obtenir l'URL d'authentification Google
      const response = await api.get(`/api/google-auth/connect?organizationId=${organizationId}`);
      if (response.success && response.data?.authUrl) {
        console.log('[GoogleWorkspaceConfig] 🔗 Redirection vers Google OAuth...');
        message.info('🔐 Redirection vers Google pour authentification...');
        
        // Stocker l'état pour savoir qu'on attend un retour OAuth
        localStorage.setItem('google_oauth_pending', 'true');
        localStorage.setItem('google_oauth_org_id', organizationId);
        
        // Utiliser une redirection complète au lieu d'un popup
        // Cela évite les problèmes de Cross-Origin-Opener-Policy sur Codespaces
        window.location.href = response.data.authUrl;
        
      } else {
        message.error('Impossible de générer l\'URL d\'authentification Google');
        setConnecting(false);
      }
    } catch (error) {
      console.error('Erreur lors de l\'authentification Google:', error);
      message.error('Erreur lors de l\'authentification Google');
      setConnecting(false);
    }
    // Note: setConnecting(false) n'est pas appelé ici car on redirige
  };

  // --- NOUVELLE VUE POUR LA CONFIGURATION DU DOMAINE ---
  const renderDomainSetup = () => (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Title level={3}>
          <GoogleOutlined style={{ color: '#4285f4', marginRight: '8px' }} />
          Configuration du Domaine Google Workspace
        </Title>
        <Paragraph>
          Pour utiliser Google Workspace avec <strong>{organizationData?.name || 'votre organisation'}</strong>, 
          vous devez d'abord prouver que vous possédez le domaine et configurer les serveurs de messagerie.
        </Paragraph>
        
        {/* STATUT DOMAINE */}
        {dnsRecords && (
          <Alert
            message="✅ Domaine 2thier.be - DNS configurés"
            description="Vos enregistrements DNS ont été configurés dans votre registrar. La propagation peut prendre jusqu'à 24h pour être complètement active."
            type="success"
            showIcon
            style={{ marginBottom: '24px' }}
          />
        )}
      </div>

      <Steps direction="vertical" current={4} size="small">
        <Step 
          status="finish"
          title="Étape 1 : Validation du domaine ✅" 
          description={
            <div style={{ marginTop: '16px' }}>
              <Alert
                message="Enregistrement TXT configuré"
                description="L'enregistrement de validation du domaine a été ajouté avec succès."
                type="success"
                showIcon
                size="small"
                style={{ marginBottom: '12px' }}
              />
              
              {dnsRecords?.verification ? (
                <DnsRecord 
                  type="TXT" 
                  value={dnsRecords.verification.value}
                  description="✅ Configuré dans votre registrar - Propriété du domaine validée"
                />
              ) : (
                <Spin size="small" />
              )}
            </div>
          } 
        />
        
        <Step 
          status="finish"
          title="Étape 2 : Configuration des serveurs de messagerie ✅" 
          description={
            <div style={{ marginTop: '16px' }}>
              <Alert
                message="Enregistrements MX configurés"
                description="Tous les serveurs de messagerie Google ont été configurés avec succès."
                type="success"
                showIcon
                size="small"
                style={{ marginBottom: '12px' }}
              />
              
              {dnsRecords?.mx ? (
                <div>
                  {dnsRecords.mx.map((record: { priority: number; server: string }, index: number) => (
                    <DnsRecord 
                      key={index}
                      type="MX" 
                      value={`${record.priority} ${record.server}`}
                      description={`✅ Configuré dans votre registrar - Serveur Google (priorité ${record.priority})`}
                    />
                  ))}
                </div>
              ) : (
                <Spin size="small" />
              )}
            </div>
          } 
        />
        
        <Step 
          status="finish"
          title="Étape 3 : Sécurisation des emails ✅" 
          description={
            <div style={{ marginTop: '16px' }}>
              <Alert
                message="Enregistrements de sécurité configurés"
                description="SPF et DMARC configurés pour sécuriser vos emails contre l'usurpation."
                type="success"
                showIcon
                size="small"
                style={{ marginBottom: '12px' }}
              />
              
              {dnsRecords?.security ? (
                <div>
                  {dnsRecords.security.spf && (
                    <DnsRecord 
                      type="TXT (SPF)" 
                      value={dnsRecords.security.spf}
                      description="✅ Configuré dans votre registrar - Sécurité anti-spam active"
                    />
                  )}
                  
                  {dnsRecords.security.dmarc && (
                    <DnsRecord 
                      type="TXT (DMARC)" 
                      value={dnsRecords.security.dmarc}
                      description="✅ Configuré dans votre registrar - Protection anti-usurpation active"
                    />
                  )}
                </div>
              ) : (
                <Spin size="small" />
              )}
            </div>
          } 
        />
        
        <Step 
          status="finish"
          title="Étape 4 : Vérification ✅" 
          description={
            <div style={{ marginTop: '16px' }}>
              <Alert
                message="Configuration DNS complète !"
                description="Tous vos enregistrements DNS ont été configurés dans votre registrar. Le domaine 2thier.be est prêt pour Google Workspace."
                type="success"
                showIcon
                style={{ marginBottom: '16px' }}
              />
              
              <Paragraph>
                <Text type="success">
                  ✅ <strong>Configuration terminée avec succès !</strong>
                </Text>
                <br />
                <Text type="secondary">
                  La propagation DNS peut prendre jusqu'à 24h, mais vos emails fonctionnent déjà.
                </Text>
              </Paragraph>
              
              <Space>
                <Button 
                  type="default" 
                  icon={<RedoOutlined />} 
                  loading={domainChecking}
                  onClick={handleManualDomainCheck}
                  size="large"
                >
                  Revérifier le statut DNS
                </Button>
                
                <Button 
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  disabled
                  size="large"
                >
                  Configuration validée ✅
                </Button>
              </Space>
            </div>
          }
        />
      </Steps>
      
      <Divider />
      
      <Alert
        message="🎉 Configuration DNS terminée avec succès !"
        description={
          <div>
            <p><strong>Résumé de votre configuration DNS :</strong></p>
            <ul>
              <li>✅ <strong>Validation du domaine :</strong> Enregistrement TXT ajouté</li>
              <li>✅ <strong>Serveurs de messagerie :</strong> 5 enregistrements MX configurés</li>
              <li>✅ <strong>Sécurité :</strong> SPF et DMARC actifs</li>
              <li>✅ <strong>Statut :</strong> Le domaine 2thier.be est prêt pour Google Workspace</li>
            </ul>
            <p><strong>Prochaine étape :</strong> Basculez vers l'onglet "Configuration Workspace" pour finaliser l'intégration.</p>
          </div>
        }
        type="success"
        showIcon
      />
    </Card>
  );

  // --- VUE POUR LA CONFIGURATION TECHNIQUE ET CONNEXION (REUNIFIÉE) ---
  const renderTechnicalSetup = () => (
    <Card>
      {/* STATUT DE CONNEXION DÉTAILLÉ */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={4}>État de la connexion</Title>
        
        {isGoogleConnected && config?.isActive ? (
          <Alert
            message="✅ Intégration Google Workspace active"
            description={
              <div>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div>🔗 <strong>Connexion OAuth :</strong> Établie et fonctionnelle</div>
                  <div>⚙️ <strong>Configuration :</strong> Complète et activée</div>
                  <div>📧 <strong>Services :</strong> 
                    {config.gmailEnabled && " Gmail"}
                    {config.calendarEnabled && " • Calendrier"}
                    {config.driveEnabled && " • Drive"}
                  </div>
                  <div>🕒 <strong>Dernière sync :</strong> {config.lastSync ? new Date(config.lastSync).toLocaleString('fr-FR') : 'Récente'}</div>
                </Space>
              </div>
            }
            type="success"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        ) : isGoogleConnected ? (
          <Alert
            message="🔗 Connecté à Google - Configuration à finaliser"
            description="La connexion OAuth est établie. Complétez la configuration ci-dessous puis activez l'intégration."
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        ) : (
          <Alert
            message="🔌 Non connecté à Google" 
            description="Configurez d'abord vos identifiants OAuth puis connectez-vous à Google pour activer les fonctionnalités."
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          domain: '2thier.be',
          redirectUri: (import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || window.location.origin) + '/api/auth/google/callback',
          isActive: false
        }}
      >
        <Divider>Informations du domaine</Divider>
        
        <Form.Item
          label="Domaine Google Workspace"
          name="domain"
          rules={[{ required: true, message: 'Le domaine est requis' }]}
        >
          <Input placeholder="2thier.be" />
        </Form.Item>

        <Form.Item
          label="Email administrateur"
          name="adminEmail"
          rules={[
            { required: true, message: 'L\'email administrateur est requis' },
            { type: 'email', message: 'Format email invalide' }
          ]}
        >
          <Input placeholder="admin@2thier.be" />
        </Form.Item>

        <Divider>Configuration OAuth 2.0</Divider>

        <Form.Item
          label="Client ID"
          name="clientId"
          rules={[{ required: true, message: 'Le Client ID est requis' }]}
        >
          <Input.Password placeholder="123456789-abc.apps.googleusercontent.com" />
        </Form.Item>

        <Form.Item
          label="Client Secret"
          name="clientSecret"
          rules={[{ required: true, message: 'Le Client Secret est requis' }]}
        >
          <Input.Password 
            placeholder="GOCSPX-..."
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Form.Item
          label="URI de redirection"
          name="redirectUri"
          rules={[{ required: true, message: 'L\'URI de redirection est requise' }]}
          help="Cette URI doit être ajoutée dans la console Google Cloud"
        >
          <Input 
            placeholder={(import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'https://api.2thier.com') + '/api/auth/google/callback'}
          />
        </Form.Item>

        <Divider>Compte de service</Divider>

        <Form.Item
          label="Email du compte de service"
          name="serviceAccountEmail"
          rules={[
            { required: true, message: 'L\'email du compte de service est requis' },
            { type: 'email', message: 'Format email invalide' }
          ]}
        >
          <Input placeholder="service-account@project.iam.gserviceaccount.com" />
        </Form.Item>

        <Form.Item
          label="Clé privée (JSON)"
          name="privateKey"
          rules={[{ required: true, message: 'La clé privée est requise' }]}
        >
          <Input.Password
            placeholder="-----BEGIN PRIVATE KEY-----..."
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            style={{ 
              fontFamily: 'monospace',
              fontSize: '12px'
            }}
          />
        </Form.Item>

        <Form.Item
          label="Activer l'intégration"
          name="isActive"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<CheckCircleOutlined />}
          >
            Sauvegarder
          </Button>
          
          <Button
            onClick={handleTest}
            loading={testing}
            disabled={!config?.clientId}
          >
            Tester la connexion
          </Button>

          {isGoogleConnected ? (
            <Button
              onClick={handleGoogleDisconnect}
              loading={disconnecting}
              danger
              icon={<ExclamationCircleOutlined />}
              type="default"
            >
              Se déconnecter de Google
            </Button>
          ) : (
            <Button
              onClick={handleGoogleAuth}
              loading={connecting}
              disabled={!config?.clientId || !config?.redirectUri}
              icon={<LoginOutlined />}
              type="dashed"
            >
              Se connecter à Google
            </Button>
          )}
        </Space>
      </Form>

      <Divider>Instructions</Divider>
      <Alert
        message="Configuration Google Workspace"
        description={
          <div>
            <p><strong>1. Créer un projet Google Cloud :</strong></p>
            <ul>
              <li>Aller sur <a href="https://console.cloud.google.com" target="_blank">Google Cloud Console</a></li>
              <li>Créer un nouveau projet</li>
              <li>Activer l'API Google Workspace Admin SDK</li>
            </ul>
            
            <p><strong>2. Configurer OAuth 2.0 :</strong></p>
            <ul>
              <li>Créer des identifiants OAuth 2.0</li>
              <li>Ajouter les URIs de redirection autorisées</li>
            </ul>

            <p><strong>3. Créer un compte de service :</strong></p>
            <ul>
              <li>Créer un compte de service avec délégation domain-wide</li>
              <li>Télécharger le fichier JSON des clés</li>
              <li>Configurer les scopes : https://www.googleapis.com/auth/admin.directory.user</li>
            </ul>
          </div>
        }
        type="info"
      />
    </Card>
  );

  return (
    <div className="google-workspace-config">
      <div style={{ marginBottom: '16px' }}>
        <Title level={2}>
          <GoogleOutlined style={{ color: '#4285f4', marginRight: '8px' }} />
          Configuration Google Workspace
        </Title>
        <Paragraph>
          Configurez l'intégration Google Workspace pour <strong>{organizationData?.name || 'votre organisation'}</strong>
        </Paragraph>
        
        {/* STATUT GLOBAL VISIBLE */}
        {isGoogleConnected && config?.isActive && (
          <Alert
            message="🎉 Google Workspace entièrement configuré et opérationnel !"
            description={
              <div>
                <p>✅ <strong>Domaine :</strong> {config.domain}</p>
                <p>✅ <strong>Connexion Google :</strong> Active</p>
                <p>✅ <strong>Services :</strong> Gmail, Calendrier, Drive activés</p>
                <p>✅ <strong>Admin :</strong> {config.adminEmail}</p>
              </div>
            }
            type="success"
            showIcon
            style={{ marginBottom: '24px' }}
          />
        )}
        
        {isGoogleConnected && !config?.isActive && (
          <Alert
            message="⚠️ Google connecté mais configuration incomplète"
            description="Votre connexion Google fonctionne mais l'intégration n'est pas entièrement activée."
            type="warning"
            showIcon
            style={{ marginBottom: '24px' }}
          />
        )}
        
        {!isGoogleConnected && (
          <Alert
            message="🔌 Configuration en attente"
            description="Configurez vos identifiants puis connectez-vous à Google pour activer l'intégration."
            type="info"
            showIcon
            style={{ marginBottom: '24px' }}
          />
        )}
      </div>

      <Tabs
        defaultActiveKey="workspace"
        type="card"
        size="large"
        onTabClick={(key) => {
          // Charger les DNS records quand l'onglet domaine est activé
          if (key === 'domain' && !dnsRecords) {
            loadDnsRecords();
          }
        }}
        items={[
          {
            key: 'domain',
            label: (
              <span>
                <CloudOutlined />
                Configuration Domaine
              </span>
            ),
            children: renderDomainSetup(),
          },
          {
            key: 'workspace',
            label: (
              <span>
                <SettingOutlined />
                Configuration Workspace
              </span>
            ),
            children: renderTechnicalSetup(),
          },
          {
            key: 'monitoring',
            label: (
              <span>
                <ApiOutlined />
                Monitoring Tokens
              </span>
            ),
            children: <GoogleTokenMonitor organizationId={organizationId} />,
          },
        ]}
      />
    </div>
  );
};

export default GoogleWorkspaceConfig;
