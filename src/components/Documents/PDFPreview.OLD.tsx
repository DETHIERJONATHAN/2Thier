import { Card, Empty } from 'antd';

interface PDFPreviewProps {
  sections: any[];
  theme?: any;
}

const PDFPreview = ({ sections, theme }: PDFPreviewProps) => {
  console.log('[PDFPreview] Rendering with sections:', sections);
  
  if (sections.length === 0) {
    return (
      <Empty 
        description="Aucune section à prévisualiser" 
        style={{ padding: '60px 20px' }}
      />
    );
  }

  const themeStyles = theme ? {
    primaryColor: theme.primaryColor || '#1890ff',
    secondaryColor: theme.secondaryColor || '#52c41a',
    textColor: theme.textColor || '#000000',
    backgroundColor: theme.backgroundColor || '#ffffff',
    fontFamily: theme.fontFamily || 'Arial, sans-serif',
    fontSize: theme.fontSize || 11
  } : {
    primaryColor: '#1890ff',
    secondaryColor: '#52c41a',
    textColor: '#000000',
    backgroundColor: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    fontSize: 11
  };

  const renderSection = (section: any, index: number) => {
    const config = section.config || {};
    console.log(`[PDFPreview] Rendering section ${index} (${section.type}):`, config);

    switch (section.type) {
      case 'COVER_PAGE':
        return (
          <div
            key={index}
            style={{
              padding: '60px 40px',
              backgroundColor: config.backgroundImage ? 'transparent' : themeStyles.backgroundColor,
              backgroundImage: config.backgroundImage ? `url(${config.backgroundImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              minHeight: '500px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative'
            }}
          >
            {/* Logo entreprise */}
            {config.companyImage && (
              <div style={{ 
                marginBottom: '30px',
                position: config.logoPosition?.includes('top') ? 'absolute' : 'relative',
                top: config.logoPosition?.includes('top') ? '20px' : 'auto',
                left: config.logoPosition === 'top-left' ? '20px' : 'auto',
                right: config.logoPosition === 'top-right' ? '20px' : 'auto',
                textAlign: 'center'
              }}>
                <img 
                  src={config.companyImage} 
                  alt="Logo" 
                  style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain' }}
                  onError={(e) => {
                    // Si l'image ne charge pas, afficher un placeholder
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).insertAdjacentHTML('afterend', '<div style="width:100px;height:80px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border-radius:4px">🏢 Logo</div>');
                  }}
                />
              </div>
            )}

            {/* Titre principal */}
            <h1 style={{ 
              fontSize: '48px', 
              fontWeight: 'bold',
              color: themeStyles.primaryColor,
              fontFamily: themeStyles.fontFamily,
              margin: '20px 0',
              textShadow: config.backgroundImage ? '2px 2px 4px rgba(0,0,0,0.3)' : 'none',
              wordBreak: 'break-word',
              maxWidth: '90%'
            }}>
              {config.title?.fr || config.title || 'Titre du document'}
            </h1>

            {/* Sous-titre */}
            {config.subtitle && (
              <p style={{ 
                fontSize: '22px', 
                color: config.backgroundImage ? '#ffffff' : themeStyles.textColor,
                fontFamily: themeStyles.fontFamily,
                textShadow: config.backgroundImage ? '1px 1px 3px rgba(0,0,0,0.5)' : 'none',
                margin: '10px 0',
                maxWidth: '80%'
              }}>
                {config.subtitle}
              </p>
            )}

            {/* Date */}
            {config.showDate && (
              <div style={{ 
                marginTop: '30px',
                fontSize: '14px',
                color: config.backgroundImage ? '#ffffff' : '#8c8c8c',
                fontFamily: themeStyles.fontFamily
              }}>
                {new Date().toLocaleDateString('fr-FR', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            )}
          </div>
        );

      case 'COMPANY_PRESENTATION':
        return (
          <div
            key={index}
            style={{
              padding: '40px',
              backgroundColor: themeStyles.backgroundColor,
              fontFamily: themeStyles.fontFamily
            }}
          >
            <h2 style={{ 
              color: themeStyles.primaryColor,
              fontSize: '24px',
              marginBottom: '20px',
              borderBottom: `2px solid ${themeStyles.secondaryColor}`,
              paddingBottom: '10px'
            }}>
              {config.sectionTitle || 'Présentation de l\'entreprise'}
            </h2>
            <div style={{ 
              display: config.layout === 'two-columns' ? 'grid' : 'block',
              gridTemplateColumns: config.layout === 'two-columns' ? '1fr 1fr' : '1fr',
              gap: '20px'
            }}>
              {config.companyImage && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    width: '100%', 
                    height: '200px', 
                    backgroundColor: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px'
                  }}>
                    📸 Image entreprise
                  </div>
                </div>
              )}
              <div>
                <p style={{ 
                  color: themeStyles.textColor,
                  fontSize: `${themeStyles.fontSize}pt`,
                  lineHeight: '1.6'
                }}>
                  {config.description?.fr || 'Description de l\'entreprise à ajouter...'}
                </p>
                {config.showStats && config.statsData && (
                  <div style={{ 
                    marginTop: '20px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                    gap: '15px'
                  }}>
                    {(() => {
                      try {
                        const stats = JSON.parse(config.statsData);
                        return stats.map((stat: any, i: number) => (
                          <div key={i} style={{ textAlign: 'center' }}>
                            <div style={{ 
                              fontSize: '24px', 
                              fontWeight: 'bold',
                              color: themeStyles.primaryColor 
                            }}>
                              {stat.value}
                            </div>
                            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                              {stat.label}
                            </div>
                          </div>
                        ));
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'PRICING_TABLE':
        return (
          <div
            key={index}
            style={{
              padding: '40px',
              backgroundColor: themeStyles.backgroundColor,
              fontFamily: themeStyles.fontFamily
            }}
          >
            <h2 style={{ 
              color: themeStyles.primaryColor,
              fontSize: '24px',
              marginBottom: '20px'
            }}>
              {config.tableTitle?.fr || 'Détail des prix'}
            </h2>
            <table style={{ 
              width: '100%',
              borderCollapse: 'collapse',
              border: config.tableStyle === 'bordered' ? '1px solid #e8e8e8' : 'none'
            }}>
              <thead>
                <tr style={{ backgroundColor: themeStyles.primaryColor, color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
                  {config.showQuantity && <th style={{ padding: '12px', textAlign: 'center' }}>Qté</th>}
                  {config.showUnitPrice && <th style={{ padding: '12px', textAlign: 'right' }}>P.U.</th>}
                  <th style={{ padding: '12px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ 
                  backgroundColor: config.tableStyle === 'striped' ? '#fafafa' : 'transparent',
                  borderBottom: '1px solid #e8e8e8'
                }}>
                  <td style={{ padding: '12px' }}>Exemple de ligne</td>
                  {config.showQuantity && <td style={{ padding: '12px', textAlign: 'center' }}>1</td>}
                  {config.showUnitPrice && <td style={{ padding: '12px', textAlign: 'right' }}>100 {config.currency || '€'}</td>}
                  <td style={{ padding: '12px', textAlign: 'right' }}>100 {config.currency || '€'}</td>
                </tr>
              </tbody>
              {config.showVAT && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid ' + themeStyles.primaryColor }}>
                    <td colSpan={3} style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                      TVA ({config.vatRate || 21}%):
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>21 {config.currency || '€'}</td>
                  </tr>
                  <tr style={{ 
                    backgroundColor: config.highlightTotal ? themeStyles.secondaryColor : 'transparent',
                    color: config.highlightTotal ? 'white' : themeStyles.textColor
                  }}>
                    <td colSpan={3} style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                      TOTAL TTC:
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                      121 {config.currency || '€'}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        );

      case 'SIGNATURE_BLOCK':
        return (
          <div
            key={index}
            style={{
              padding: '40px',
              backgroundColor: themeStyles.backgroundColor,
              fontFamily: themeStyles.fontFamily
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
              <div>
                <p style={{ fontSize: '14px', marginBottom: '60px' }}>
                  {config.signatureLabel || 'Signature du client'}
                </p>
                {config.showDate && (
                  <p style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    Date: _______________
                  </p>
                )}
                {config.showLocation && (
                  <p style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    Lieu: _______________
                  </p>
                )}
              </div>
              {config.showCompanySignature && (
                <div>
                  <p style={{ fontSize: '14px', marginBottom: '60px' }}>
                    Signature de l'entreprise
                  </p>
                  <p style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    Date: _______________
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div
            key={index}
            style={{
              padding: '40px',
              backgroundColor: themeStyles.backgroundColor,
              fontFamily: themeStyles.fontFamily
            }}
          >
            <h2 style={{ 
              color: themeStyles.primaryColor,
              fontSize: '20px',
              marginBottom: '16px'
            }}>
              {config.sectionTitle || `Section ${index + 1}`}
            </h2>
            <p style={{ color: themeStyles.textColor }}>
              {config.content || 'Contenu de la section à configurer...'}
            </p>
          </div>
        );
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#f0f0f0',
      padding: '20px',
      minHeight: '100%',
      backgroundColor: '#525659'
    }}>
      {sections.map((section, index) => (
        <div
          key={index}
          style={{
            width: '210mm',
            minHeight: '297mm',
            margin: '0 auto 20px auto',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            pageBreakAfter: 'always'
          }}
        >
          {renderSection(section, index)}
        </div>
      ))}
    </div>
  );
};

export default PDFPreview;
