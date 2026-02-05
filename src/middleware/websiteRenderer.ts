/**
 * 🎨 SYSTÈME DE RENDU SSR POUR SITES VITRINES
 * 
 * Génère le HTML complet d'un site vitrine côté serveur
 * en utilisant les renderers React (Header, Hero, Services, etc.)
 * 
 * Compatible avec TOUS les sites créés dans le CRM.
 */

import { Response } from 'express';
import { WebsiteRequest } from '../middleware/websiteDetection';

/**
 * Génère le HTML d'une section en fonction de son type
 */
function renderSection(section: any): string {
  const content = section.content || {};
  // Note: Le champ s'appelle "type" dans la BD (pas "sectionType")
  const sectionType = section.type;

  switch (sectionType) {
    case 'header':
      return renderHeader(content);
    case 'hero':
      return renderHero(content);
    case 'services':
      return renderServices(content);
    case 'about':
      return renderAbout(content);
    case 'stats':
      return renderStats(content);
    case 'cta':
      return renderCTA(content);
    case 'testimonials':
      return renderTestimonials(content);
    case 'faq':
      return renderFAQ(content);
    case 'contact':
      return renderContact(content);
    case 'footer':
      return renderFooter(content);
    default:
      return `<!-- Section inconnue: ${sectionType} -->`;
  }
}

function renderHeader(content: any): string {
  const logo = content.logo || {};
  const menu = content.menu || {};
  const cta = content.cta || {};
  
  return `
    <header class="site-header" style="background-color: ${content.background?.color || '#ffffff'}; padding: ${content.spacing?.padding || '20px'} 0;">
      <div class="container" style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center;">
        <div class="logo">
          ${logo.image?.url ? `<img src="${logo.image.url}" alt="${logo.text || 'Logo'}" style="height: ${logo.size?.height || '40px'};">` : `<span style="font-size: ${logo.text?.fontSize || '24px'}; font-weight: bold; color: ${logo.text?.color || '#000000'};">${logo.text?.value || 'Logo'}</span>`}
        </div>
        <nav class="menu" style="display: flex; gap: ${menu.spacing?.gap || '30px'};">
          ${(menu.items || []).map((item: any) => `
            <a href="${item.link || '#'}" style="color: ${menu.text?.color || '#333333'}; text-decoration: none; font-size: ${menu.text?.fontSize || '16px'};">
              ${item.label || 'Menu'}
            </a>
          `).join('')}
        </nav>
        ${cta.text?.value ? `
          <a href="${cta.link || '#'}" class="cta-button" style="background-color: ${cta.background?.color || '#007bff'}; color: ${cta.text?.color || '#ffffff'}; padding: ${cta.spacing?.padding || '12px 24px'}; border-radius: ${cta.border?.radius || '4px'}; text-decoration: none; font-size: ${cta.text?.fontSize || '16px'};">
            ${cta.text.value}
          </a>
        ` : ''}
      </div>
    </header>
  `;
}

function renderHero(content: any): string {
  const title = content.title || {};
  const subtitle = content.subtitle || {};
  const cta = content.cta || {};
  
  return `
    <section class="hero-section" style="background: ${content.background?.type === 'image' && content.background?.image?.url ? `url('${content.background.image.url}') center/cover` : content.background?.color || '#f5f5f5'}; padding: ${content.spacing?.padding || '100px'} 0; text-align: ${content.layout?.alignment || 'center'};">
      <div class="container" style="max-width: 1200px; margin: 0 auto;">
        <h1 style="font-size: ${title.fontSize || '48px'}; color: ${title.color || '#000000'}; margin-bottom: ${content.spacing?.gap || '20px'};">
          ${title.value || 'Titre Principal'}
        </h1>
        ${subtitle.value ? `
          <p style="font-size: ${subtitle.fontSize || '20px'}; color: ${subtitle.color || '#666666'}; margin-bottom: ${content.spacing?.gap || '30px'};">
            ${subtitle.value}
          </p>
        ` : ''}
        ${cta.text?.value ? `
          <a href="${cta.link || '#'}" style="display: inline-block; background-color: ${cta.background?.color || '#007bff'}; color: ${cta.text?.color || '#ffffff'}; padding: ${cta.spacing?.padding || '16px 32px'}; border-radius: ${cta.border?.radius || '4px'}; text-decoration: none; font-size: ${cta.text?.fontSize || '18px'};">
            ${cta.text.value}
          </a>
        ` : ''}
      </div>
    </section>
  `;
}

function renderServices(content: any): string {
  const title = content.title || {};
  const services = content.services || [];
  
  return `
    <section class="services-section" style="background-color: ${content.background?.color || '#ffffff'}; padding: ${content.spacing?.padding || '80px'} 0;">
      <div class="container" style="max-width: 1200px; margin: 0 auto;">
        ${title.value ? `
          <h2 style="font-size: ${title.fontSize || '36px'}; color: ${title.color || '#000000'}; text-align: center; margin-bottom: ${content.spacing?.gap || '50px'};">
            ${title.value}
          </h2>
        ` : ''}
        <div class="services-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: ${content.grid?.gap || '30px'};">
          ${services.map((service: any) => `
            <div class="service-card" style="background-color: ${service.background?.color || '#f9f9f9'}; padding: ${service.spacing?.padding || '30px'}; border-radius: ${service.border?.radius || '8px'}; text-align: center;">
              ${service.icon ? `<div class="service-icon" style="font-size: ${service.icon?.size || '48px'}; color: ${service.icon?.color || '#007bff'}; margin-bottom: 20px;">${service.icon.value || '🔧'}</div>` : ''}
              <h3 style="font-size: ${service.title?.fontSize || '24px'}; color: ${service.title?.color || '#000000'}; margin-bottom: 15px;">
                ${service.title?.value || 'Service'}
              </h3>
              <p style="font-size: ${service.description?.fontSize || '16px'}; color: ${service.description?.color || '#666666'};">
                ${service.description?.value || 'Description du service'}
              </p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderAbout(_content: any): string {
  return `<section class="about-section"><!-- Section About --></section>`;
}

function renderStats(_content: any): string {
  return `<section class="stats-section"><!-- Section Stats --></section>`;
}

function renderCTA(_content: any): string {
  return `<section class="cta-section"><!-- Section CTA --></section>`;
}

function renderTestimonials(_content: any): string {
  return `<section class="testimonials-section"><!-- Section Testimonials --></section>`;
}

function renderFAQ(_content: any): string {
  return `<section class="faq-section"><!-- Section FAQ --></section>`;
}

function renderContact(_content: any): string {
  return `<section class="contact-section"><!-- Section Contact --></section>`;
}

function renderFooter(content: any): string {
  const text = content.text || {};
  const social = content.social || [];
  
  return `
    <footer class="site-footer" style="background-color: ${content.background?.color || '#333333'}; color: ${text.color || '#ffffff'}; padding: ${content.spacing?.padding || '40px'} 0; text-align: center;">
      <div class="container" style="max-width: 1200px; margin: 0 auto;">
        ${text.value ? `
          <p style="font-size: ${text.fontSize || '14px'}; margin-bottom: ${content.spacing?.gap || '20px'};">
            ${text.value}
          </p>
        ` : ''}
        ${social.length > 0 ? `
          <div class="social-links" style="display: flex; justify-content: center; gap: ${content.social?.spacing || '20px'};">
            ${social.map((link: any) => `
              <a href="${link.url || '#'}" target="${link.openInNewTab !== false ? '_blank' : '_self'}" rel="${link.openInNewTab !== false ? 'noopener noreferrer' : ''}" style="color: ${content.social?.color || '#ffffff'}; font-size: ${content.social?.size || '24px'};">
                ${link.icon || link.platform || '🔗'}
              </a>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </footer>
  `;
}

/**
 * Rend le site vitrine complet en HTML
 * 
 * 🚀 STRATÉGIE: Au lieu de générer du HTML SSR basique,
 * on redirige vers le frontend React qui a le beau site complet
 */
export async function renderWebsite(req: WebsiteRequest, res: Response) {
  try {
    const website = req.websiteData;

    console.log(`🎨 [WEBSITE-RENDERER] Site détecté:`, {
      hasWebsite: !!website,
      name: website?.name,
      slug: website?.slug,
      sectionsCount: website?.sections?.length
    });

    if (!website) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="fr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Site non trouvé</title>
          </head>
          <body>
            <h1>Site non trouvé</h1>
            <p>Aucun site n'est configuré pour ce domaine.</p>
          </body>
        </html>
      `);
    }

    // 🚀 REDIRECTION VERS LE FRONTEND REACT
    // Le frontend React a le beau site complet avec tous les renderers
    // On redirige vers la route /site-vitrine-2thier (ou selon le slug)
    const targetPath = `/${website.slug}`;
    
    console.log(`🔄 [WEBSITE-RENDERER] Redirection vers: ${targetPath}`);
    
    // Retourner le HTML du frontend React (SPA)
    // Le frontend va charger les données via l'API et afficher le site complet
    const frontendHtml = `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
          <meta name="mobile-web-app-capable" content="yes">
          <meta name="apple-mobile-web-app-capable" content="yes">
          <title>${website.name || '2Thier Energy'}</title>
          <meta name="description" content="${website.config?.metaDescription || website.config?.seo?.description || 'Votre partenaire en transition énergétique'}">
          <meta name="keywords" content="photovoltaïque, batteries, bornes de recharge, pompes à chaleur, énergie renouvelable, Belgique">
          <meta property="og:title" content="${website.name || '2Thier Energy'}">
          <meta property="og:description" content="${website.config?.metaDescription || 'Votre partenaire en transition énergétique'}">
          <meta property="og:type" content="website">
          <link rel="icon" type="image/png" href="/2thier-logo.png">
          <script>
            // Redirection côté client vers la route React
            window.location.replace('${targetPath}');
          </script>
          <style>
            body {
              margin: 0;
              padding: 0;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .loading {
              text-align: center;
              color: white;
            }
            .spinner {
              width: 50px;
              height: 50px;
              border: 4px solid rgba(255,255,255,0.3);
              border-top-color: white;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <noscript>
            <meta http-equiv="refresh" content="0;url=${targetPath}">
          </noscript>
          <div class="loading">
            <div class="spinner"></div>
            <p>Chargement de ${website.name || '2Thier Energy'}...</p>
          </div>
        </body>
      </html>
    `;

    res.send(frontendHtml);
  } catch (error) {
    console.error('❌ [WEBSITE-RENDERER] Erreur:', error);
    res.status(500).send('Erreur lors du chargement du site');
  }
}
