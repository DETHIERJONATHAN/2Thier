import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

type PublicLanding = {
  id: string;
  title: string;
  subtitle?: string | null;
  content: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  seo?: { title?: string; description?: string | null; keywords?: string[] };
  tracking?: { enable?: boolean; googleTagId?: string; metaPixelId?: string };
  styling?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const injectScript = (id: string, inner: string) => {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.innerHTML = inner;
  document.head.appendChild(s);
};

export default function LandingRenderer() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicLanding | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`/api/landing-pages/public/${slug}`);
        const json = await res.json();
        if (!json?.success) throw new Error(json?.message || 'Erreur');
        setData(json.data);

        // SEO
        const seo = json.data.seo || {};
        if (seo.title) document.title = seo.title;
        if (seo.description) {
          let md = document.querySelector('meta[name="description"]');
          if (!md) {
            md = document.createElement('meta');
            md.setAttribute('name', 'description');
            document.head.appendChild(md);
          }
          md.setAttribute('content', seo.description);
        }
        if (seo.keywords && seo.keywords.length) {
          let mk = document.querySelector('meta[name="keywords"]');
          if (!mk) {
            mk = document.createElement('meta');
            mk.setAttribute('name', 'keywords');
            document.head.appendChild(mk);
          }
          mk.setAttribute('content', seo.keywords.join(','));
        }

        // Pixels
        const tracking = json.data.tracking || {};
        if (tracking.enable) {
          if (tracking.googleTagId) {
            // gtag bootstrap
            const gid = tracking.googleTagId;
            if (!document.getElementById('gtag-lib')) {
              const s = document.createElement('script');
              s.id = 'gtag-lib'; s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${gid}`;
              document.head.appendChild(s);
            }
            injectScript('gtag-init', `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gid}');`);
          }
          if (tracking.metaPixelId) {
            const pid = tracking.metaPixelId;
            injectScript('fb-pixel', `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod? n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js'); fbq('init', '${pid}'); fbq('track', 'PageView');`);
          }
        }
      } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        setError(e?.message || 'Erreur de chargement');
      }
    };
    run();
  }, [slug]);

  if (error) return <div style={{ padding: 24, color: 'red' }}>{error}</div>;
  if (!data) return <div style={{ padding: 24 }}>Chargement…</div>;

  // Rendu ultra simple: on affiche titre, sous-titre, et un contenu brut JSON pour l’instant
  // Étape suivante: builder visuel pour interpréter data.content.blocks
  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ padding: '48px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 40, margin: 0 }}>{data.title}</h1>
        {data.subtitle && <p style={{ color: '#666' }}>{data.subtitle}</p>}
      </header>
      <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <pre style={{ background: '#f9f9f9', padding: 16, borderRadius: 8 }}>{JSON.stringify(data.content, null, 2)}</pre>
      </main>
    </div>
  );
}
