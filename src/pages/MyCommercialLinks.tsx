import React, { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import {
  LinkOutlined,
  CopyOutlined,
  FormOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ShareAltOutlined,
  BulbOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';
import { FB, SF } from '../components/zhiive/ZhiiveTheme';

const useScreenSize = () => {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  return { isMobile: w < 768 };
};

const FBCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow, padding: 20, marginBottom: 16, ...style }}>
    {children}
  </div>
);

interface NominativeForm {
  id: string;
  name: string;
  description?: string;
  slug: string;
  isActive: boolean;
  submissionCount: number;
  websiteUrl: string | null;
  websiteName?: string;
  urlPath?: string;
}

export default function MyCommercialLinks() {
  const { api } = useAuthenticatedApi();
  const { user } = useAuth();
  const { isMobile } = useScreenSize();

  const [forms, setForms] = useState<NominativeForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSlug, setUserSlug] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ forms: NominativeForm[]; userSlug: string }>('/api/website-forms/my-commercial-links');
      setForms(response.forms);
      setUserSlug(response.userSlug);
    } catch (error) {
      console.error('Erreur:', error);
      message.error('Impossible de charger vos liens commerciaux');
    } finally { setLoading(false); }
  };

  const generateLink = (form: NominativeForm) => {
    if (!form.websiteUrl) return null;
    const urlPath = form.urlPath || '/simulateur';
    return `${form.websiteUrl}${urlPath}/${form.slug}?ref=${userSlug}`;
  };

  const handleCopyLink = (form: NominativeForm) => {
    const link = generateLink(form);
    if (!link) { message.error("Ce formulaire n'est pas lié à un site web."); return; }
    navigator.clipboard.writeText(link);
    message.success(`Lien "${form.name}" copié !`);
    setCopiedId(form.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Spin size="large" />
    </div>
  );

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <FBCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: FB.blue,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <ShareAltOutlined style={{ fontSize: 22, color: FB.white }} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: FB.text }}>Mes Liens Commerciaux</div>
            <div style={{ fontSize: 14, color: FB.textSecondary }}>
              Vos liens personnalisés pour tracker vos leads
            </div>
          </div>
        </div>
      </FBCard>

      {/* User Info Card */}
      <FBCard style={{
        background: 'linear-gradient(135deg, ' + FB.blue + ' 0%, ' + FB.purple + ' 100%)',
        color: FB.white,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: SF.overlayLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <UserOutlined style={{ fontSize: 26, color: FB.white }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div style={{ fontSize: 14, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              Identifiant de tracking :
              <span style={{
                padding: '3px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.25)',
                fontSize: 13, fontWeight: 600,
              }}>
                {userSlug}
              </span>
            </div>
          </div>
        </div>
      </FBCard>

      {/* How it works */}
      <FBCard style={{ background: FB.blue + '08', border: '1px solid ' + FB.blue + '20' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <BulbOutlined style={{ fontSize: 18, color: FB.blue, flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: FB.blue, marginBottom: 8 }}>Comment ça fonctionne ?</div>
            {[
              'Copiez votre lien personnalisé ci-dessous',
              'Partagez-le avec vos prospects (email, WhatsApp, réseaux sociaux...)',
              'Chaque personne qui remplit le formulaire via votre lien devient automatiquement VOTRE lead',
              'Suivez vos performances en temps réel dans le Hive',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13, color: FB.blue, opacity: 0.85 }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', background: FB.blue,
                  color: FB.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>{i + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </FBCard>

      {/* Forms list */}
      {forms.length === 0 ? (
        <FBCard style={{ textAlign: 'center', padding: 40 }}>
          <FormOutlined style={{ fontSize: 40, color: FB.border, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: FB.text, marginBottom: 4 }}>
            Aucun formulaire nominatif disponible
          </div>
          <div style={{ fontSize: 13, color: FB.textSecondary }}>
            Contactez votre administrateur pour activer des formulaires en mode tracking commercial
          </div>
        </FBCard>
      ) : (
        forms.map(form => {
          const link = generateLink(form);
          return (
            <FBCard key={form.id}>
              {/* Form header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <FormOutlined style={{ fontSize: 20, color: FB.blue }} />
                <span style={{ fontSize: 17, fontWeight: 700, color: FB.text, flex: 1 }}>
                  {form.name}
                </span>
                <span style={{
                  padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                  background: form.isActive ? FB.green + '15' : FB.btnGray,
                  color: form.isActive ? FB.green : FB.textSecondary,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {form.isActive ? <CheckCircleOutlined /> : null}
                  {form.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>

              {form.description && (
                <div style={{ fontSize: 14, color: FB.textSecondary, marginBottom: 12 }}>
                  {form.description}
                </div>
              )}

              {/* Link section */}
              <div style={{
                padding: 14, background: FB.btnGray, borderRadius: FB.radius, marginBottom: 12,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 8 }}>
                  Votre lien personnalisé :
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    flex: 1, padding: '9px 12px', borderRadius: 6,
                    border: '1px solid ' + (link ? FB.border : FB.orange + '50'),
                    background: FB.white, fontSize: 13, color: link ? FB.text : FB.textSecondary,
                    fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {link || 'Site non configuré'}
                  </div>
                  <button
                    onClick={() => handleCopyLink(form)}
                    disabled={!link}
                    style={{
                      padding: '9px 16px', borderRadius: 6, border: 'none',
                      background: copiedId === form.id ? FB.green : FB.blue,
                      color: FB.white, fontSize: 14, fontWeight: 600, cursor: link ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                      opacity: link ? 1 : 0.5, transition: 'background 0.2s',
                    }}
                  >
                    {copiedId === form.id ? <CheckCircleOutlined /> : <CopyOutlined />}
                    {!isMobile && (copiedId === form.id ? 'Copié !' : 'Copier')}
                  </button>
                </div>
                {form.websiteName && (
                  <div style={{ fontSize: 12, color: FB.textSecondary, marginTop: 6 }}>
                    📍 Site: {form.websiteName}
                  </div>
                )}
              </div>

              {/* Submission count */}
              <div style={{ fontSize: 13, color: FB.textSecondary, display: 'flex', alignItems: 'center', gap: 6 }}>
                📊 {form.submissionCount} soumission{form.submissionCount > 1 ? 's' : ''} totale{form.submissionCount > 1 ? 's' : ''}
              </div>
            </FBCard>
          );
        })
      )}

      {/* Tips Card */}
      <FBCard style={{ background: FB.green + '08', border: '1px solid ' + FB.green + '20' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: FB.green, marginBottom: 10 }}>
          💼 Conseils pour maximiser vos conversions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            ['Utilisez un', 'raccourcisseur de liens', '(bit.ly, tinyurl.com) pour faciliter le partage'],
            ['Ajoutez votre lien dans la', 'signature de vos emails', ''],
            ['Partagez-le sur vos', 'réseaux sociaux professionnels', '(LinkedIn, Facebook...)'],
            ['Intégrez-le dans vos', 'campagnes WhatsApp Business', ''],
            ['Suivez vos', 'statistiques de conversion', 'dans le module Nectar du Hive'],
          ].map((tip, i) => (
            <div key={i} style={{ fontSize: 13, color: FB.text, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <CheckCircleOutlined style={{ color: FB.green, marginTop: 2, flexShrink: 0 }} />
              <span>{tip[0]} <strong>{tip[1]}</strong> {tip[2]}</span>
            </div>
          ))}
        </div>
      </FBCard>
    </div>
  );
}
