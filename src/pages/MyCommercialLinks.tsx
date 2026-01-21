import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Button, 
  Input, 
  message, 
  Alert,
  Empty,
  Tag,
  Divider,
  Spin
} from 'antd';
import {
  LinkOutlined,
  CopyOutlined,
  FormOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';

const { Title, Text, Paragraph } = Typography;

interface NominativeForm {
  id: string;
  name: string;
  description?: string;
  slug: string;
  isActive: boolean;
  submissionCount: number;
  websiteUrl: string | null; // URL du site associé (ex: https://2thier.be)
  websiteName?: string; // Nom du site
  urlPath?: string; // Chemin URL (ex: /simulateur)
}

/**
 * Page "Mes Liens Commerciaux"
 * Accessible à tous les utilisateurs du CRM
 * Génère automatiquement les liens personnalisés pour le tracking des leads
 */
export default function MyCommercialLinks() {
  const { api } = useAuthenticatedApi();
  const { user } = useAuth();
  
  const [forms, setForms] = useState<NominativeForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSlug, setUserSlug] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ forms: NominativeForm[]; userSlug: string }>('/api/website-forms/my-commercial-links');
      setForms(response.forms);
      setUserSlug(response.userSlug);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      message.error('Impossible de charger vos liens commerciaux');
    } finally {
      setLoading(false);
    }
  };

  const generateLink = (form: NominativeForm) => {
    // Utiliser l'URL du site associé au formulaire
    if (!form.websiteUrl) {
      console.warn(`Formulaire ${form.name} n'a pas de site associé`);
      return null;
    }
    const urlPath = form.urlPath || '/simulateur';
    return `${form.websiteUrl}${urlPath}/${form.slug}?ref=${userSlug}`;
  };

  const handleCopyLink = (form: NominativeForm) => {
    const link = generateLink(form);
    if (!link) {
      message.error(`Ce formulaire n'est pas lié à un site web.`);
      return;
    }
    navigator.clipboard.writeText(link);
    message.success(`Lien "${form.name}" copié ! Vous pouvez maintenant le partager avec vos prospects.`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* En-tête */}
      <div className="mb-6">
        <Title level={2} className="mb-2">
          <ShareAltOutlined className="mr-2" />
          Mes Liens Commerciaux
        </Title>
        <Text type="secondary">
          Vos liens personnalisés pour tracker vos leads et mesurer vos performances
        </Text>
      </div>

      {/* Info utilisateur */}
      <Card className="mb-6" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
            <UserOutlined className="text-3xl text-purple-600" />
          </div>
          <div className="flex-1">
            <Text strong className="text-white text-lg block">
              {user?.firstName} {user?.lastName}
            </Text>
            <Text className="text-white opacity-90">
              Votre identifiant de tracking : <Tag color="white" className="ml-2">{userSlug}</Tag>
            </Text>
          </div>
        </div>
      </Card>

      {/* Guide d'utilisation */}
      <Alert
        message="💡 Comment ça fonctionne ?"
        description={
          <div className="space-y-2">
            <p><strong>1.</strong> Copiez votre lien personnalisé ci-dessous</p>
            <p><strong>2.</strong> Partagez-le avec vos prospects (email, WhatsApp, réseaux sociaux...)</p>
            <p><strong>3.</strong> Chaque personne qui remplit le formulaire via votre lien devient automatiquement VOTRE lead</p>
            <p><strong>4.</strong> Suivez vos performances en temps réel dans le CRM</p>
          </div>
        }
        type="info"
        showIcon
        className="mb-6"
      />

      {/* Liste des formulaires nominatifs */}
      {forms.length === 0 ? (
        <Card>
          <Empty
            description={
              <div className="text-center">
                <Text type="secondary">
                  Aucun formulaire nominatif disponible pour le moment
                </Text>
                <br />
                <Text type="secondary" className="text-sm">
                  Contactez votre administrateur pour activer des formulaires en mode tracking commercial
                </Text>
              </div>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {forms.map((form) => (
            <Card 
              key={form.id}
              className="hover:shadow-lg transition-shadow"
              bodyStyle={{ padding: '24px' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FormOutlined className="text-xl text-blue-500" />
                    <Title level={4} className="mb-0">
                      {form.name}
                    </Title>
                    {form.isActive ? (
                      <Tag color="success" icon={<CheckCircleOutlined />}>Actif</Tag>
                    ) : (
                      <Tag color="default">Inactif</Tag>
                    )}
                  </div>
                  
                  {form.description && (
                    <Paragraph type="secondary" className="mb-3">
                      {form.description}
                    </Paragraph>
                  )}

                  <div className="bg-gray-50 p-3 rounded mb-3">
                    <Text strong className="block mb-2 text-sm">Votre lien personnalisé :</Text>
                    <div className="flex items-center gap-2">
                      <Input
                        value={generateLink(form) || 'Site non configuré'}
                        readOnly
                        className="font-mono text-sm"
                        status={!form.websiteUrl ? 'warning' : undefined}
                      />
                      <Button
                        type="primary"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopyLink(form)}
                        disabled={!form.websiteUrl}
                      >
                        Copier
                      </Button>
                    </div>
                    {form.websiteName && (
                      <Text type="secondary" className="text-xs mt-1 block">
                        📍 Site: {form.websiteName}
                      </Text>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <Text type="secondary">
                      📊 {form.submissionCount} soumission{form.submissionCount > 1 ? 's' : ''} totale{form.submissionCount > 1 ? 's' : ''}
                    </Text>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Divider />

      {/* Conseils */}
      <Card className="bg-blue-50 border-blue-200">
        <Title level={5} className="text-blue-800 mb-3">
          💼 Conseils pour maximiser vos conversions
        </Title>
        <ul className="space-y-2 text-sm">
          <li>✅ Utilisez un <strong>raccourcisseur de liens</strong> (bit.ly, tinyurl.com) pour faciliter le partage</li>
          <li>✅ Ajoutez votre lien dans la <strong>signature de vos emails</strong></li>
          <li>✅ Partagez-le sur vos <strong>réseaux sociaux professionnels</strong> (LinkedIn, Facebook...)</li>
          <li>✅ Intégrez-le dans vos <strong>campagnes WhatsApp Business</strong></li>
          <li>✅ Suivez vos <strong>statistiques de conversion</strong> dans le module Leads du CRM</li>
        </ul>
      </Card>
    </div>
  );
}
