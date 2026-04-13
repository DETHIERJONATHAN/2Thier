/**
 * #11 — usePageTitle hook
 * Sets document title + meta description dynamically via react-helmet-async
 */
import { Helmet } from 'react-helmet-async';

interface PageMeta {
  title: string;
  description?: string;
  noIndex?: boolean;
}

const APP_NAME = 'Zhiive';

export function PageHelmet({ title, description, noIndex = false }: PageMeta) {
  const fullTitle = `${title} | ${APP_NAME}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
    </Helmet>
  );
}
