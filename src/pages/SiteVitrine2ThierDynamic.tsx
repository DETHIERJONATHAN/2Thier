/**
 * 🌐 SITE VITRINE 2THIER - VERSION DYNAMIQUE
 * 
 * Ce composant affiche le site vitrine en utilisant les RENDERERS
 * qui lisent les données depuis Prisma via l'API.
 * 
 * Architecture :
 * Prisma → API → useWebSite → SiteRenderer → Renderers individuels
 * 
 * @author IA Assistant - 9 octobre 2025
 */

import React from 'react';
import { Layout, Spin, Alert, Space } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useWebSite } from '../hooks/useWebSite';
import { SectionRenderer } from '../site/renderer/SectionRenderer';

const { Content } = Layout;

const SiteVitrine2ThierDynamic: React.FC = () => {
  const { data: website, loading, error } = useWebSite('site-vitrine-2thier');

  // 🔄 LOADING
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      }}>
        <Space direction="vertical" align="center">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: 'white' }} spin />} />
          <span style={{ color: 'white', fontSize: '18px' }}>Chargement du site...</span>
        </Space>
      </div>
    );
  }

  // ❌ ERROR
  if (error || !website) {
    return (
      <div style={{ padding: '50px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert
          message="Erreur de chargement"
          description={error || "Le site web n'a pas pu être chargé. Vérifiez que le seed a bien été exécuté."}
          type="error"
          showIcon
          style={{ maxWidth: '600px' }}
        />
      </div>
    );
  }

  // ✅ AFFICHAGE DES SECTIONS
  const sections = website.sections || [];

  if (sections.length === 0) {
    return (
      <div style={{ padding: '50px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert
          message="Site sans contenu"
          description="Aucune section n'a été trouvée pour ce site. Exécutez le seed pour créer le contenu."
          type="warning"
          showIcon
          style={{ maxWidth: '600px' }}
        />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content>
        {sections.map((section: any) => (
          <SectionRenderer
            key={section.id}
            section={section}
            mode="preview"
          />
        ))}
      </Content>
    </Layout>
  );
};

export default SiteVitrine2ThierDynamic;
