import React, { useEffect, useState, useMemo } from 'react';
import { Spin, Alert } from 'antd';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

interface Section {
  id: number;
  key: string;
  type: string;
  name: string;
  content: any;
  backgroundColor?: string;
  textColor?: string;
  isActive: boolean;
  displayOrder: number;
}

interface DynamicSiteRendererProps {
  websiteId: number;
}

/**
 * Composant qui charge et affiche dynamiquement toutes les sections actives d'un site
 * ⚡ POLLING toutes les 3 secondes pour détecter les changements en temps réel
 */
const DynamicSiteRenderer: React.FC<DynamicSiteRendererProps> = ({ websiteId }) => {
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]); // Stabiliser l'API
  
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction de chargement des sections (réutilisable)
  const fetchSections = async () => {
    try {
      console.log('🔄 DynamicSiteRenderer: Rechargement sections websiteId:', websiteId);
      const response = await api.get(`/api/website-sections/${websiteId}`);
      
      // Filtrer uniquement les sections actives et trier par displayOrder
      const activeSections = response
        .filter((s: Section) => s.isActive)
        .sort((a: Section, b: Section) => a.displayOrder - b.displayOrder);
      
      console.log('✅ Sections actives:', activeSections.length, 'sections');
      setSections(activeSections);
      setError(null);
    } catch (err) {
      console.error('❌ Erreur chargement sections:', err);
      setError('Impossible de charger les sections du site');
    } finally {
      setLoading(false);
    }
  };

  // 1️⃣ Chargement initial
  useEffect(() => {
    fetchSections();
  }, [websiteId]);

  // 2️⃣ POLLING toutes les 3 secondes pour détecter les changements
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSections();
    }, 3000); // Recharger toutes les 3 secondes

    return () => clearInterval(interval); // Nettoyer l'intervalle au démontage
  }, [websiteId]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '50px' }}>
        <Alert message="Erreur" description={error} type="error" showIcon />
      </div>
    );
  }

  return (
    <div className="dynamic-site-container">
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </div>
  );
};

/**
 * Composant qui rend une section selon son type
 */
const SectionRenderer: React.FC<{ section: Section }> = ({ section }) => {
  const { type, content, backgroundColor, textColor } = section;

  const sectionStyle: React.CSSProperties = {
    backgroundColor: backgroundColor || undefined,
    color: textColor || undefined,
  };

  console.log('🖼️ Rendering section:', section.key, 'type:', type);

  switch (type) {
    case 'header':
      return <HeaderSection content={content} style={sectionStyle} />;
    
    case 'hero':
      return <HeroSection content={content} style={sectionStyle} />;
    
    case 'stats':
      return <StatsSection content={content} style={sectionStyle} />;
    
    case 'content':
      return <ContentSection content={content} style={sectionStyle} />;
    
    case 'cta':
      return <CTASection content={content} style={sectionStyle} />;
    
    case 'footer':
      return <FooterSection content={content} style={sectionStyle} />;
    
    default:
      console.warn('⚠️ Type de section inconnu:', type);
      return null;
  }
};

// ============= COMPOSANTS DE RENDU PAR TYPE =============

interface SectionProps {
  content: any;
  style: React.CSSProperties;
}

const HeaderSection: React.FC<SectionProps> = ({ content, style }) => {
  return (
    <header style={{ ...style, padding: '20px 50px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Logo */}
        {content.logo && (
          <img src={content.logo} alt="Logo" style={{ height: '50px' }} />
        )}
        
        {/* Menu */}
        <nav style={{ display: 'flex', gap: '30px' }}>
          {content.menuItems?.map((item: any, index: number) => (
            <a 
              key={index} 
              href={item.url} 
              style={{ 
                color: style.color || '#333', 
                textDecoration: 'none',
                fontWeight: 500 
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTA Button */}
        {content.ctaButton && (
          <a 
            href={content.ctaButton.url}
            style={{
              backgroundColor: content.ctaButton.backgroundColor || '#10b981',
              color: content.ctaButton.textColor || 'white',
              padding: '10px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            {content.ctaButton.text}
          </a>
        )}
      </div>
    </header>
  );
};

const HeroSection: React.FC<SectionProps> = ({ content, style }) => {
  return (
    <section 
      style={{ 
        ...style,
        backgroundImage: content.backgroundImage ? `url(${content.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: content.alignment || 'center',
        padding: '100px 50px',
        position: 'relative'
      }}
    >
      {/* Overlay si image de fond */}
      {content.backgroundImage && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)'
        }} />
      )}

      <div style={{ position: 'relative', zIndex: 1, textAlign: content.alignment || 'center', maxWidth: '800px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '20px', color: style.color || 'white' }}>
          {content.title}
        </h1>
        <p style={{ fontSize: '1.25rem', marginBottom: '30px', color: style.color || 'white' }}>
          {content.subtitle}
        </p>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: '15px', justifyContent: content.alignment || 'center' }}>
          {content.buttons?.map((button: any, index: number) => (
            <a
              key={index}
              href={button.url}
              style={{
                backgroundColor: button.backgroundColor || '#10b981',
                color: button.textColor || 'white',
                padding: '12px 30px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '1.1rem'
              }}
            >
              {button.text}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

const StatsSection: React.FC<SectionProps> = ({ content, style }) => {
  return (
    <section style={{ ...style, padding: '80px 50px' }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${content.stats?.length || 4}, 1fr)`,
        gap: '40px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {content.stats?.map((stat: any, index: number) => (
          <div key={index} style={{ textAlign: 'center' }}>
            {stat.icon && (
              <div style={{ fontSize: '3rem', marginBottom: '15px' }}>{stat.icon}</div>
            )}
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: style.color || '#10b981' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '1rem', color: style.color || '#666', marginTop: '10px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const ContentSection: React.FC<SectionProps> = ({ content, style }) => {
  const columnCount = content.columns?.length || 1;

  return (
    <section style={{ ...style, padding: '80px 50px' }}>
      {content.title && (
        <h2 style={{ 
          textAlign: 'center', 
          fontSize: '2.5rem', 
          marginBottom: '50px',
          color: style.color 
        }}>
          {content.title}
        </h2>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${Math.min(columnCount, 4)}, 1fr)`,
        gap: '40px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {content.columns?.map((col: any, index: number) => (
          <div key={index} style={{ textAlign: 'center' }}>
            {col.image && (
              <img 
                src={col.image} 
                alt={col.title} 
                style={{ 
                  width: '100%', 
                  maxWidth: '200px',
                  height: 'auto',
                  marginBottom: '20px'
                }} 
              />
            )}
            {col.icon && (
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>{col.icon}</div>
            )}
            <h3 style={{ fontSize: '1.5rem', marginBottom: '15px', color: style.color }}>
              {col.title}
            </h3>
            <p style={{ color: style.color || '#666' }}>{col.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const CTASection: React.FC<SectionProps> = ({ content, style }) => {
  return (
    <section 
      style={{ 
        ...style,
        backgroundImage: content.backgroundImage ? `url(${content.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '80px 50px',
        textAlign: 'center',
        position: 'relative'
      }}
    >
      {content.backgroundImage && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)'
        }} />
      )}

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '20px', color: style.color || 'white' }}>
          {content.title}
        </h2>
        <p style={{ fontSize: '1.25rem', marginBottom: '30px', color: style.color || 'white' }}>
          {content.subtitle}
        </p>

        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          {content.buttons?.map((button: any, index: number) => (
            <a
              key={index}
              href={button.url}
              style={{
                backgroundColor: button.backgroundColor || 'white',
                color: button.textColor || '#333',
                padding: '12px 30px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '1.1rem'
              }}
            >
              {button.text}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

const FooterSection: React.FC<SectionProps> = ({ content, style }) => {
  return (
    <footer style={{ ...style, padding: '60px 50px 30px', borderTop: '1px solid #e5e5e5' }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '40px',
        maxWidth: '1200px',
        margin: '0 auto 40px'
      }}>
        {/* Logo et description */}
        {content.logo && (
          <div>
            <img src={content.logo} alt="Logo" style={{ height: '40px', marginBottom: '15px' }} />
            {content.description && (
              <p style={{ color: style.color || '#666', fontSize: '0.9rem' }}>
                {content.description}
              </p>
            )}
          </div>
        )}

        {/* Groupes de liens */}
        {content.linkGroups?.map((group: any, index: number) => (
          <div key={index}>
            <h4 style={{ marginBottom: '15px', color: style.color }}>{group.title}</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {group.links?.map((link: any, linkIndex: number) => (
                <li key={linkIndex} style={{ marginBottom: '8px' }}>
                  <a 
                    href={link.url}
                    style={{ 
                      color: style.color || '#666',
                      textDecoration: 'none'
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Réseaux sociaux */}
      {content.socialLinks && content.socialLinks.length > 0 && (
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          justifyContent: 'center',
          marginBottom: '30px'
        }}>
          {content.socialLinks.map((social: any, index: number) => (
            <a 
              key={index}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                fontSize: '1.5rem',
                color: style.color || '#666'
              }}
            >
              {social.icon}
            </a>
          ))}
        </div>
      )}

      {/* Copyright */}
      <div style={{ 
        textAlign: 'center', 
        paddingTop: '30px',
        borderTop: '1px solid #e5e5e5',
        color: style.color || '#999',
        fontSize: '0.9rem'
      }}>
        {content.copyright || `© ${new Date().getFullYear()} Tous droits réservés`}
      </div>
    </footer>
  );
};

export default DynamicSiteRenderer;
