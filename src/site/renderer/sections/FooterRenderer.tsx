import React from 'react';
import { Row, Col, Space } from 'antd';
import { motion } from 'framer-motion';
import { RenderText } from '../components/RenderText';
import { renderIconNode } from '../utils/icon';

/**
 * 🎨 FOOTER RENDERER V2 - AVEC ANIMATIONS React from 'react';
import { Row, Col, Space } from 'antd';
import { motion } from 'framer-motion';

/**
 * 🎨 FOOTER RENDERER V2 - AVEC WAVE ANIMATIONS
 * 
 * Améliorations :
 * - Wave SVG animée en top
 * - Fade-in animations
 * - Hover effects sur les liens
 * - Social icons animés
 * - Layout responsive
 * 
 * @author IA Assistant - Phase D
 */

interface FooterRendererProps {
  content: any;
  mode: 'preview' | 'edit';
}

export const FooterRenderer: React.FC<FooterRendererProps> = ({ content }) => {
  const {
    brand = {},
    columns = [],
    contact = {},
    social = {},
    copyright = {},
    style = {},
    layout = {}
  } = content;
  
  // 🔥 DEFAULTS pour les réseaux sociaux si non définis
  const socialData = social && Object.keys(social).length > 0 ? social : {
    enabled: true,
    title: 'Suivez-nous',
    links: [
      { platform: 'facebook', url: 'https://facebook.com/2thier', icon: 'FacebookOutlined', openInNewTab: true },
      { platform: 'linkedin', url: 'https://linkedin.com/company/2thier', icon: 'LinkedinOutlined', openInNewTab: true },
      { platform: 'instagram', url: 'https://instagram.com/2thier', icon: 'InstagramOutlined', openInNewTab: true }
    ]
  };
  
  // 🔍 DEBUG
  console.log('🦶 [FooterRenderer] Social data:', {
    raw: social,
    computed: socialData,
    enabled: socialData?.enabled,
    linksCount: socialData?.links?.length
  });
  
  // Configuration responsive du grid
  const gridConfig = layout?.columns?.columns || { mobile: 1, tablet: 2, desktop: 4 };
  const gap = layout?.columns?.gap || '32px';
  
  // Calculer le nombre total de colonnes à afficher
  const totalColumns = columns.length + (contact?.enabled ? 1 : 0) + 1; // +1 pour branding
  
  // Adapter la configuration desktop au nombre réel de colonnes
  const adaptedDesktopColumns = Math.min(totalColumns, gridConfig.desktop || 4);
  const colSpan = Math.floor(24 / adaptedDesktopColumns);

  return (
    <footer
      style={{
        background: style.background || '#1a1a2e',
        color: style.color || '#ffffff',
        position: 'relative',
        paddingTop: '100px',
        ...style
      }}
    >
      {/* 🌊 WAVE SVG ANIMATION */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          overflow: 'hidden',
          lineHeight: 0
        }}
      >
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          style={{
            width: '100%',
            height: '100px',
            transform: 'rotate(180deg)'
          }}
        >
          <motion.path
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
            fill={style.background || '#1a1a2e'}
            animate={{
              d: [
                'M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z',
                'M321.39,40c58-10.79,114.16-20,172-30,82.39-16.72,168.19-20,250.45-10C823.78,20,906.67,50,985.66,70c70.05,18.48,146.53,20,214.34,0V0H0V27.35A600.21,600.21,0,0,0,321.39,40Z',
                'M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z'
              ]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        </svg>
      </motion.div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 48px 48px' }}>
        {/* 🎯 MAIN CONTENT */}
        <Row gutter={[parseInt(gap) || 48, parseInt(gap) || 48]}>
          {/* 📝 BRANDING SECTION */}
          <Col 
            xs={24} 
            sm={gridConfig.tablet >= 2 ? 12 : 24} 
            md={colSpan}
          >
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              {/* BRANDING */}
              {brand.name && (
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  marginBottom: '16px',
                  color: style.logoColor || '#ffffff'
                }}>
                  <RenderText value={brand.name} />
                </div>
              )}

              {/* TAGLINE */}
              {brand.tagline && (
                <p style={{
                  fontSize: '14px',
                  lineHeight: '1.7',
                  color: style.descColor || 'rgba(255,255,255,0.7)',
                  marginBottom: '24px'
                }}>
                  <RenderText value={brand.tagline} />
                </p>
              )}

              {/* SOCIAL ICONS */}
              {socialData?.enabled && socialData?.links && socialData.links.length > 0 && (
                <Space size="middle">
                  {socialData.links.map((item: any, index: number) => (
                    <motion.a
                      key={index}
                      href={item.url || '#'}
                      target={item.openInNewTab !== false ? '_blank' : '_self'}
                      rel={item.openInNewTab !== false ? 'noopener noreferrer' : undefined}
                      whileHover={{
                        scale: 1.2,
                        rotate: 10,
                        color: style.primaryColor || '#667eea'
                      }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        fontSize: '24px',
                        color: 'rgba(255,255,255,0.7)',
                        transition: 'color 0.3s ease',
                        display: 'inline-block'
                      }}
                    >
                      {renderIconNode(item.icon, {
                        size: style.socialIconSize || '24px',
                        color: style.socialIconColor || 'rgba(255,255,255,0.9)'
                      }) || item.icon}
                    </motion.a>
                  ))}
                </Space>
              )}
            </motion.div>
          </Col>

          {/* 📝 COLUMNS */}
          {columns.map((column: any, colIndex: number) => (
            <Col 
              key={colIndex} 
              xs={24} 
              sm={gridConfig.tablet >= 2 ? 12 : 24}
              md={colSpan}
            >
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: colIndex * 0.2 }}
              >
                {/* TITLE */}
                {column.title && (
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    color: style.columnTitleColor || '#ffffff',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    <RenderText value={column.title} />
                  </h3>
                )}

                {/* LINKS */}
                {column.links && column.links.length > 0 && (
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0
                  }}>
                    {column.links.map((link: any, linkIndex: number) => (
                      <motion.li
                        key={linkIndex}
                        whileHover={{ x: 5 }}
                        style={{ marginBottom: '12px' }}
                      >
                        <a
                          href={link.url || '#'}
                          style={{
                            fontSize: '14px',
                            color: 'rgba(255,255,255,0.7)',
                            textDecoration: 'none',
                            transition: 'color 0.3s ease',
                            display: 'inline-block'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = style.linkHoverColor || '#667eea';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                          }}
                        >
                          <RenderText value={link.label} />
                        </a>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </motion.div>
            </Col>
          ))}
          
          {/* 📞 CONTACT INFO (si activé) */}
          {contact?.enabled && (
            <Col 
              xs={24} 
              sm={gridConfig.tablet >= 2 ? 12 : 24}
              md={colSpan}
            >
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: columns.length * 0.2 }}
              >
                {/* TITLE */}
                {contact.title && (
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    color: style.columnTitleColor || '#ffffff',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    <RenderText value={contact.title} />
                  </h3>
                )}
                
                {/* CONTACT DETAILS */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                      style={{
                        fontSize: '14px',
                        color: 'rgba(255,255,255,0.7)',
                        textDecoration: 'none',
                        transition: 'color 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = style.linkHoverColor || '#667eea';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                      }}
                    >
                      <RenderText value={contact.phone} />
                    </a>
                  )}
                  
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      style={{
                        fontSize: '14px',
                        color: 'rgba(255,255,255,0.7)',
                        textDecoration: 'none',
                        transition: 'color 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = style.linkHoverColor || '#667eea';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                      }}
                    >
                      <RenderText value={contact.email} />
                    </a>
                  )}
                  
                  {contact.hours && (
                    <div style={{
                      fontSize: '14px',
                      color: 'rgba(255,255,255,0.7)'
                    }}>
                      <RenderText value={contact.hours} />
                    </div>
                  )}
                  
                  {contact.address && (
                    <div style={{
                      fontSize: '14px',
                      color: 'rgba(255,255,255,0.7)',
                      whiteSpace: 'pre-line'
                    }}>
                      <RenderText value={contact.address} />
                    </div>
                  )}
                </div>
              </motion.div>
            </Col>
          )}
        </Row>

        {/* 📝 COPYRIGHT */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5 }}
          style={{
            marginTop: '64px',
            paddingTop: '32px',
            borderTop: `1px solid ${style.dividerColor || 'rgba(255,255,255,0.1)'}`,
            textAlign: 'center',
            fontSize: style.copyrightFontSize || '14px',
            color: style.copyrightColor || 'rgba(255,255,255,0.5)'
          }}
        >
          <RenderText 
            value={copyright?.text || copyright} 
            defaultValue={`© ${new Date().getFullYear()} Tous droits réservés.`}
          />
          
          {/* LEGAL LINKS */}
          {copyright?.legalLinks && copyright.legalLinks.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {copyright.legalLinks.map((link: any, index: number) => (
                <React.Fragment key={index}>
                  {index > 0 && <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>}
                  <a
                    href={link.url || '#'}
                    style={{
                      color: 'rgba(255,255,255,0.5)',
                      textDecoration: 'none',
                      fontSize: '12px',
                      transition: 'color 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = style.linkHoverColor || '#667eea';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                    }}
                  >
                    <RenderText value={link.label} />
                  </a>
                </React.Fragment>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* 🎨 RESPONSIVE */}
      <style>{`
        @media (max-width: 768px) {
          footer {
            padding-top: 80px !important;
          }
          footer > div {
            padding: 0 24px 24px !important;
          }
        }
      `}</style>
    </footer>
  );
};
