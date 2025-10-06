import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Hook pour router automatiquement selon le domaine
 * - 2thier.be → /site-vitrine-2thier (Site Vitrine)
 * - devis1min.be → /devis1minute (Marketplace)
 * - app.2thier.be → /connexion ou /dashboard (CRM)
 */
export const useDomainRouter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hostname = window.location.hostname;

  useEffect(() => {
    // Ne router que si on est à la racine "/"
    if (location.pathname !== '/') return;

    // Router selon le domaine
    if (hostname === '2thier.be' || hostname === 'www.2thier.be') {
      // Site Vitrine 2Thier
      navigate('/site-vitrine-2thier', { replace: true });
    } else if (hostname === 'devis1min.be' || hostname === 'www.devis1min.be') {
      // Marketplace Devis1Minute
      navigate('/devis1minute', { replace: true });
    }
    // app.2thier.be reste sur "/" pour le routing authentifié normal
  }, [hostname, location.pathname, navigate]);
};

/**
 * Composant wrapper qui gère le routing selon le domaine
 */
export const DomainRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useDomainRouter();
  return <>{children}</>;
};
