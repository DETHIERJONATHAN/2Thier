// Mapping centralisé route → page (src/...) et module logique
// Étendable facilement; utiliser des regex pour matcher les chemins.

export interface RoutePageMapEntry {
  pattern: RegExp;
  page: string; // chemin relatif depuis src/
  module?: string;
}

export const ROUTE_PAGE_MAP: RoutePageMapEntry[] = [
  // Gmail / Mail
  { pattern: /^\/google-gmail(\/|$)/i, page: 'pages/GoogleMailPageFixed_New.tsx', module: 'mail' },
  { pattern: /^\/(mail|gmail)(\/|$)/i, page: 'pages/GoogleMailPageFixed_New.tsx', module: 'mail' },
  // Leads
  { pattern: /^\/leads(\/|$)/i, page: 'pages/Leads/LeadsPage.tsx', module: 'leads' },
  // Agenda / Calendrier
  { pattern: /^\/(agenda|calendar|google-agenda)(\/|$)/i, page: 'pages/CalendarPage.tsx', module: 'agenda' },
  // Admin
  { pattern: /^\/(admin|settings|config)(\/|$)/i, page: 'pages/admin/UsersAdminPage.tsx', module: 'admin' },
];

export function resolveRouteToPage(pathname: string): { page?: string; module?: string } {
  for (const entry of ROUTE_PAGE_MAP) {
    if (entry.pattern.test(pathname)) return { page: entry.page, module: entry.module };
  }
  // fallback: variables globales définies côté app
  type GlobalLike = { __APP_DEFAULT_PAGE?: string; __APP_DEFAULT_MODULE?: string };
  const g: GlobalLike = (typeof window !== 'undefined' ? (window as unknown as GlobalLike) : {} as GlobalLike);
  return { page: g.__APP_DEFAULT_PAGE, module: g.__APP_DEFAULT_MODULE };
}
